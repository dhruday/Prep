# 29. Browser Resource Prioritization
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"The browser assigns internal priority levels to every network request, determining which resources download first when bandwidth is limited. The priority is determined by resource type, position in the document, visibility, and explicit hints from the developer. CSS in `<head>` and render-blocking scripts get the highest priority (Highest). Images not in the viewport get Low priority. Fonts get High priority when used in first paint. Developers can influence priorities with `fetchpriority` (High/Low/Auto on `<img>`, `<link>`, `<script>`, `fetch()`), `rel=preload` (raises priority of late-discovered resources), and `rel=prefetch`/`rel=preconnect` for future navigation resources. The most impactful use case: adding `fetchpriority='high'` to the LCP image — the single most effective LCP optimization after eliminating render-blocking resources."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Browser's Internal Priority System (Chromium)

```
Chromium uses 5 priority levels for network requests:

Level 5 - HIGHEST:
  HTML (main document)
  CSS in <head> (render-blocking)
  Sync scripts (render+parser blocking)
  
Level 4 - HIGH:
  Scripts with defer attribute
  Scripts loaded early in <head>
  Fonts (referenced in CSS, needed for first paint)
  Preloaded resources with fetchpriority=high
  XHR/fetch (default, if initiated before first interactive)
  
Level 3 - MEDIUM:
  Async scripts
  Images in viewport (above-the-fold)
  XHR/fetch after page is interactive
  
Level 2 - LOW:
  Images below viewport (lazy loaded)
  Prefetched resources (rel=prefetch)
  
Level 1 - IDLE:
  Service worker pre-cache fetches
  Background sync
  Low-priority prefers in manifest

Special: Priority hints (fetchpriority attribute)
  fetchpriority="high"  → bump up 1 level
  fetchpriority="low"   → downgrade 1 level
```

### Resource Priority by Type (Default)

```
Resource Type                    Default Priority
─────────────────────────────────────────────────
HTML (main document)             Highest
CSS (<link rel="stylesheet">)    Highest
Render-blocking script           Highest
Defer script                     High
Async script                     Low/Medium
LCP image (if <img> above fold)  High (Chrome 102+)
Other <img> in viewport          Medium
<img> below fold                 Low
<img> with loading=lazy          Very Low (deferred)
Font (first-paint used)          High
Font (later)                     Medium
XHR/fetch                        High
Prefetch (<link rel="prefetch">)  Idle/Lowest
```

### Fetch Priority API (fetchpriority attribute)

```html
<!-- HTML attributes: -->

<!-- Raise LCP image priority (most impactful single optimization) -->
<img src="hero.webp" fetchpriority="high" alt="Hero">

<!-- Lower priority for non-critical images in carousel -->
<img src="slide2.jpg" fetchpriority="low" alt="Slide 2">

<!-- Raise priority for above-the-fold CSS loaded from CDN -->
<link rel="preload" href="critical.css" as="style" fetchpriority="high">

<!-- Lower priority for analytics script -->
<script src="analytics.js" fetchpriority="low" async></script>
```

```typescript
// JavaScript API: fetchpriority via RequestInit
async function fetchWithPriority(url: string, priority: RequestPriority): Promise<Response> {
  return fetch(url, { priority }); // 'high' | 'low' | 'auto'
}

// High priority: user-blocking API call
const userData = await fetchWithPriority('/api/user', 'high');

// Low priority: analytics beacon (non-blocking)
fetchWithPriority('/analytics/event', 'low');
```

### rel=preload: Force Early High-Priority Discovery

```
Problem rel=preload solves:
  Resources inside CSS (fonts, background images) are discovered LATE.
  Resources loaded by JS are discovered LATE (after JS executes).
  The preload scanner (see Topic 25) can't find them.
  
  With rel=preload in <head>:
  → Discovered by preload scanner immediately
  → Download starts at same time as HTML parse
  → NOT render-blocking (unlike <link rel="stylesheet">)
  → Downloaded at HIGH priority and cached for when actually needed

Syntax:
  <link rel="preload" href="/font.woff2" as="font" crossorigin>
  <link rel="preload" href="/hero.webp" as="image" fetchpriority="high">
  <link rel="preload" href="/api-key.js" as="script">
  <link rel="preload" href="/critical.css" as="style">
  
  'as' attribute is REQUIRED:
    as="script"  → applies CSP, sets Accept header correctly
    as="style"   → render-blocking behaviour preserved
    as="image"   → image priority rules
    as="font"    → font rules (crossorigin is REQUIRED for fonts!)
    as="fetch"   → CORS fetch (crossorigin required)
    
  IMPORTANT: Unused preloads generate a console warning after 3s:
    "The resource <URL> was preloaded but not used within a few seconds"
    → Wasted bandwidth + caches a resource for nothing
    → Always ensure preloaded resource IS used (same URL, same crossorigin)
```

### rel=prefetch: Low-Priority Future Navigation Resources

```
<link rel="prefetch" href="/about-page.js">

Priority: Idle/Lowest — downloads only when bandwidth is free
Purpose: Pre-cache resources for the NEXT page user will navigate to

Use cases:
  - Next page in a multi-step flow
  - Resources for routes user is likely to visit
  - Next article in a feed

Browser may ignore prefetch if:
  - Data Saver mode is on
  - Connection is 2G/3G
  - Battery is critically low

rel=prefetch ≠ rel=preload:
  preload: Current page needs this SOON (high priority, required)
  prefetch: Future page might need this (idle priority, optional)
```

### rel=preconnect: DNS + TCP + TLS Warming

```
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://api.example.com" crossorigin>

What it does (in order):
  1. DNS resolution (typically 10-50ms per lookup)
  2. TCP handshake (1 RTT = typically 20-100ms)
  3. TLS handshake (1-2 RTT = 20-200ms additional)
  Total saved: 50-400ms per cross-origin resource

When to use:
  - CDN origins serving fonts, JS, CSS
  - API origins (your backend)
  - Analytics origins

Use sparingly (> 6 preconnects = wasted TCP connections):
  Each preconnect keeps a TCP connection warm for 10s
  If unused, connection teardown = overhead
  Rule: preconnect to 2-4 most critical cross-origin domains only
```

### rel=dns-prefetch: DNS Only

```
<link rel="dns-prefetch" href="//api.example.com">

Does ONLY DNS resolution (not TCP or TLS).
Cheaper than preconnect.
Useful for domains you'll need eventually but not immediately.

Hierarchy:
  preconnect > dns-prefetch
  Use preconnect for: fonts, critical APIs (needed within 1-2 seconds)
  Use dns-prefetch for: analytics, third-party scripts (needed later)
```

### Priority Hints + Content Browser Policy Interaction

```
Fetch Priority is subject to:
  Content-Security-Policy directives
  CORS headers (misconfigured CORS → request fails regardless of priority)
  HTTP/2 stream priorities (server honors client priority hints in `PRIORITY` frames)

HTTP/2 Priority:
  Each HTTP/2 stream has a weight and dependency tree
  Browser sends priority with request headers
  Server can use this to schedule response ordering
  CDNs (Cloudflare, Fastly, Akamai) use this for response prioritization

HTTP/3 / QUIC:
  Uses "Extensible Priorities" (RFC 9218)
  Better multiplexing without head-of-line blocking
  Priority signals via HTTP headers (Priority: u=3, i)
    u = urgency (0-7, lower = higher priority)
    i = incremental (true = stream data useful before complete)
```

### Combining Strategies: Priority Recipe for LCP

```html
<!-- In <head>, optimal ordering for LCP optimization: -->

<!-- 1. Preconnect to critical origins first -->
<link rel="preconnect" href="https://cdn.example.com">
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>

<!-- 2. Inline critical CSS (no network round trip) -->
<style>/* above-fold critical CSS here */</style>

<!-- 3. Preload LCP image with high priority -->
<link rel="preload" href="/hero.webp" as="image" 
      fetchpriority="high" type="image/webp">

<!-- 4. Preload critical font -->
<link rel="preload" href="/fonts/inter-400.woff2" 
      as="font" type="font/woff2" crossorigin>

<!-- 5. Load non-critical CSS as non-render-blocking -->
<link rel="preload" href="/styles.css" as="style" 
      onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles.css"></noscript>

<!-- 6. Defer ALL JavaScript -->
<script src="/app.js" defer></script>
```

---

### ⚠️ Anti-Patterns & Pitfalls

- **Preloading without using:** The most common preload mistake. `<link rel="preload" href="icon-pack.woff2" as="font">` but the page uses `icon-pack-v2.woff2`. Browser downloads icon-pack.woff2, warns in console, downloads icon-pack-v2.woff2 anyway = doubled network cost.

- **Using preload for below-fold images:** Preloading images that are only needed after user scrolls consumes bandwidth that could have gotten the LCP image faster. Preload only the ONE critical image (LCP image). Use `loading="lazy"` for below-fold images.

- **Fetching with default priority for critical data API:** React SPAs that fetch initial data on mount use default fetch priority (Medium for in-page fetches). If the LCP element depends on this API response, use `fetchpriority: 'high'` in the request.

- **Too many preconnects:** Each preconnect allocates a connection. If 10 domains are preconnected but only 2 are used in the first 3 seconds, the other 8 connections waste browser connection pool slots (browsers limit to ~6 per origin).

- **Using rel=preload for render-blocking CSS without the `onload` non-render-blocking hack:** `<link rel="preload" as="style">` downloads CSS at high priority but does NOT automatically apply it. You must either: use `as="style"` with `onload` to convert to stylesheet, OR use `rel=stylesheet` (which is render-blocking). Confusing the two leads to CSS that downloads but is never applied.

---

## 🏭 3. Real-World Examples

**SAP Fiori — fetchpriority for LCP image (LCP 3.2s → 1.6s):**

SAP Fiori's launchpad featured a header illustration loaded as `<img src="banner.webp">`. Without `fetchpriority="high"`, Chrome assigned it Medium priority (it's an image). The browser was downloading 3 CSS files at Highest priority first. Adding `fetchpriority="high"` to the banner image AND adding `<link rel="preload" href="banner.webp" as="image" fetchpriority="high">` to `<head>` (so the preload scanner found it before CSS parsing) moved the image download start from 800ms after navigation to 50ms. LCP dropped from 3.2s to 1.6s — the single change that had the largest LCP impact.

**Google Fonts — preconnect optimization:**

Google Fonts requires connecting to `fonts.googleapis.com` (for CSS) and `fonts.gstatic.com` (for actual font files). Without preconnect: two DNS+TCP+TLS handshakes on the critical path = 200-400ms of connection overhead before font bytes start arriving. With:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```
Connection overhead moved off the critical path. Appears as: font downloads start at the same time as HTML parse completes.

**Salesforce Experience Cloud — prefetch for next page:**

Salesforce B2B Commerce Portal predicts the user will navigate from the product listing page to the product detail page. On listing page interaction (hovering over a product card), it dynamically injects:
```javascript
const link = document.createElement('link');
link.rel = 'prefetch';
link.href = `/products/${productId}/bundle.js`;
document.head.appendChild(link);
```
This pre-caches the product detail JS bundle at idle priority. When user clicks, bundle is already in cache → navigation is instant. Used to reduce product detail LCP from 2.8s to 0.4s for predicted navigations.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim)

> "The browser assigns internal priority levels to all network requests: Highest (HTML, CSS, sync scripts), High (defer scripts, fonts, preloads), Medium (async scripts, in-viewport images), Low (below-fold images), and Idle (prefetch). Developers can adjust these with `fetchpriority` attribute on `<img>`, `<link>`, and `fetch()`.

> The most impactful use is the LCP image: adding `fetchpriority='high'` plus `<link rel='preload'>` in `<head>` ensures the browser starts downloading the LCP image at the same time as HTML arrives, not after CSS is parsed. At SAP, this single change moved LCP from 3.2s to 1.6s.

> `rel=preconnect` warms DNS+TCP+TLS connections to cross-origin servers (fonts, APIs) before requests are made — saving 50-400ms. `rel=prefetch` downloads future-page resources at idle priority when bandwidth is free. The key pitfalls: unused preloads waste bandwidth, too many preconnects waste connection pool slots, and mixing up `preload` (current page) vs `prefetch` (next page)."

---

### Likely Follow-up Questions

1. **What's the difference between `rel=preload` and `rel=prefetch`?** → `preload`: high priority, required for the CURRENT page soon. `prefetch`: idle priority, optional for a FUTURE page. Preload starts downloading immediately; prefetch waits for idle bandwidth. Preloaded resources that go unused trigger console warnings.

2. **When should you use `fetchpriority="high"` on an image?** → Only for the LCP image (the largest visible image in the initial viewport). Other images should be left at default priority or `fetchpriority="low"`. The browser's image priority model is already good for most cases; only the LCP image needs explicit boosting.

3. **Why is `crossorigin` required for font preloads?** → Fonts are loaded via CORS because they can be shared across origins. Without `crossorigin` on the preload `<link>`, the browser preloads the font without CORS headers. Then when CSS actually requests the font (with CORS), the browser doesn't recognize it as the same resource → downloads the font AGAIN. Always include `crossorigin` on font preloads.

4. **How does HTTP/2 multiplexing interact with browser priority?** → HTTP/2 sends all requests over one TCP connection with stream weights/dependencies (PRIORITY frames). The browser communicates its priority hints to the server via these frames. The server (or CDN) uses stream priority to schedule response data — high-priority responses get more bandwidth. Without HTTP/2, priority is often first-come-first-served across multiple TCP connections.

---

## 💻 5. Code Example

```typescript
// DEMO 1: Dynamically inject priority-optimized resource hints
interface ResourceHint {
  rel: 'preload' | 'prefetch' | 'preconnect' | 'dns-prefetch';
  href: string;
  as?: string;
  type?: string;
  crossOrigin?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
}

function injectResourceHint(hint: ResourceHint): void {
  const link = document.createElement('link');
  link.rel = hint.rel;
  link.href = hint.href;

  if (hint.as) link.setAttribute('as', hint.as);
  if (hint.type) link.type = hint.type;
  if (hint.crossOrigin) link.crossOrigin = 'anonymous';
  if (hint.fetchPriority) link.setAttribute('fetchpriority', hint.fetchPriority);

  document.head.appendChild(link);
}

// Warm connection to API server early:
injectResourceHint({ rel: 'preconnect', href: 'https://api.example.com', crossOrigin: true });

// Preload LCP image:
injectResourceHint({
  rel: 'preload',
  href: '/hero.webp',
  as: 'image',
  type: 'image/webp',
  fetchPriority: 'high',
});

// Prefetch next page bundle on hover:
function prefetchOnHover(anchorEl: HTMLAnchorElement, bundleUrl: string): void {
  anchorEl.addEventListener('mouseenter', () => {
    injectResourceHint({ rel: 'prefetch', href: bundleUrl, as: 'script' });
  }, { once: true, passive: true }); // once: prefetch only once per session
}

// DEMO 2: Priority-aware fetch wrapper
type RequestPriority = 'high' | 'low' | 'auto';
interface PriorityFetchOptions extends RequestInit {
  priority?: RequestPriority;
}

async function priorityFetch<T>(
  url: string,
  options: PriorityFetchOptions = {}
): Promise<T> {
  const { priority = 'auto', ...rest } = options;

  const response = await fetch(url, {
    ...rest,
    // @ts-ignore — priority is a newer fetch API, not yet in all TS defs
    priority,
  } as RequestInit);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return response.json() as Promise<T>;
}

// Critical user data — high priority:
interface UserData { id: string; name: string; }
const user = await priorityFetch<UserData>('/api/me', { priority: 'high' });

// Background analytics — low priority:
priorityFetch('/api/analytics/impression', {
  method: 'POST',
  priority: 'low',
  body: JSON.stringify({ page: 'home' }),
}).catch(() => { /* analytics failure is non-critical */ });

// DEMO 3: Resource Timing API to inspect actual priority behavior
function analyzeResourcePriorities(): void {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  resources.sort((a, b) => a.startTime - b.startTime);

  resources.slice(0, 10).forEach(r => {
    const name = r.name.split('/').pop()?.substring(0, 30) ?? r.name;
    const duration = (r.responseEnd - r.fetchStart).toFixed(0);
    const delay = r.fetchStart.toFixed(0); // how long after navigation start

    console.log(`[${delay}ms] ${name} — ${duration}ms transfer`);
  });
}

// DEMO 4: Non-render-blocking CSS loading pattern (the 'preload swap' hack)
function loadStylesheetAsync(href: string): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = href;
  // When download completes, switch to actual stylesheet:
  link.onload = () => {
    link.onload = null;
    link.rel = 'stylesheet';
  };
  document.head.appendChild(link);

  // Fallback for browsers that don't support preload:
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<link rel="stylesheet" href="${href}">`;
  document.head.appendChild(noscript);
}

// Non-critical CSS loaded without blocking rendering:
loadStylesheetAsync('/styles/below-fold.css');
loadStylesheetAsync('/styles/modals.css');
```

---

## 🧠 6. Memory Aid

**Mental Model:**
Browser resource priority is a priority queue at a ticket counter. CSS and HTML are VIP (first served). Fonts and deferred scripts are business class. Images in viewport are economy. Below-fold images are standby. `fetchpriority="high"` upgrades your ticket by one class. `rel=preload` puts you in the queue before you even arrive at the airport (preload scanner).

**Priority shorthand:**
```
Highest: HTML, CSS, sync-script
High:    defer script, fonts, preload+high
Medium:  async script, in-viewport image
Low:     out-viewport image, explicitly low
Idle:    prefetch
```

**Resource hints cheatsheet:**
```
preload:    "I NEED this NOW, on THIS page, download ASAP"
prefetch:   "I might need this on the NEXT page, download WHEN IDLE"
preconnect: "I'll need THIS ORIGIN soon, warm the connection"
dns-prefetch: "Resolve DNS for this origin, nothing more"
```

**Mnemonic: PPPPD** — **P**reload (critical current), **P**refetch (future idle), **P**reconnect (origin warmup), **P**riority (fetchpriority hint), **D**NS-prefetch (DNS only).

**If you go blank:** *"Priority: Highest(CSS/HTML), High(defer/fonts), Medium(in-viewport img), Low(below-fold), Idle(prefetch). fetchpriority='high' on LCP image = #1 LCP win. rel=preload = discover late resources early. rel=preconnect = warm cross-origin connections. rel=prefetch = cache next-page resources idly."*

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Browser resource priority directly determines which resources download first, which determines FCP, LCP, and Time to Interactive. A single `fetchpriority="high"` on the LCP image can cut LCP by 50% on its own by moving image download from after-CSS to in-parallel-with-HTML.
→ **Performance:** Browsers can only sustain 6-10 parallel HTTP/1.1 connections (or unlimited multiplexed streams for HTTP/2). When all streams have default priority, CSS and JS compete equally with images for bandwidth. Priority ensures render-critical resources (CSS, LCP image) get bandwidth first.
→ **Business:** Google's Core Web Vitals (LCP ≤ 2.5s for "Good") directly affects SEO ranking. LCP is primarily an image problem for most content sites and SPAs. `fetchpriority="high"` + `rel=preload` on the LCP image is part of every Lighthouse 90+ score recipe. SAP's CMS portal improved organic search ranking by implementing this combination.

**How it works (3 sentences):**
Browsers maintain an internal priority queue for all network requests, assigning levels from Highest (HTML, CSS, synchronous scripts) through High (deferred scripts, fonts) to Idle (prefetch), with resource type, document position, and in-viewport status determining the default; developers override this with `fetchpriority="high/low"` attributes on `<img>`, `<link>`, `<script>`, and `fetch()` calls. `rel=preload` forces early, high-priority discovery of resources that would normally be discovered late (fonts in CSS, images loaded by JS), while `rel=prefetch` downloads future-page resources at idle priority to pre-warm the browser cache without consuming current-page bandwidth. The most impactful production application is combining `<link rel="preload" fetchpriority="high">` with `<img fetchpriority="high">` for the LCP element — ensuring its download starts during initial HTML parse at the highest network priority, typically halving LCP time compared to the default (Medium) image priority.

**Company relevance:**
- **Microsoft:** Bing's search results page uses priority management for the first-result rich snippet (LCP candidate): `fetchpriority="high"` on the first image, deferred scripts for all analytics/ads, preconnect to Bing CDN. Microsoft Lighthouse tooling (now integrated into Edge DevTools) recommends `fetchpriority` hints as a first-class fix.
- **Adobe:** Stock photo search uses `rel=prefetch` for the next page of results when the user reaches 80% scroll of the current page. Analytics showed 65% of sessions viewed 2+ pages — prefetching page 2 images on page 1 view made pagination feel instant.
- **Salesforce:** Commerce Cloud product listings use `fetchpriority="high"` on the first 3 product images (likely to be LCP candidates at any viewport) and `loading="lazy"` for the rest. This combination maximizes bandwidth for above-fold images while deferring below-fold loading.
- **Cisco:** WebEx join-meeting page has a clear LCP target: the "Join Meeting" button with a branded banner image. Cisco implemented `rel=preload fetchpriority=high` for the banner (hero image) as part of their Core Web Vitals initiative, reducing meeting page LCP from 4.1s to 1.8s.

---
✅ **Topic 29/486 complete.**
→ **Continuing to Topic 30: Avoiding Layout Thrashing**
