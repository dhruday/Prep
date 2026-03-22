# 195. Resource Hints — Priority Hints API
**Phase:** Performance & Architecture | **Sequence:** SEQ 09 | **Company:** Adobe, Microsoft, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Resource hints are HTML declarations and JavaScript APIs that allow developers to inform the browser's speculative loading behavior — telling it what to fetch, connect to, or preparse before it would naturally discover those resources during normal parsing. The family includes: `dns-prefetch` (resolve DNS for an origin early), `preconnect` (DNS + TCP + TLS for an origin), `prefetch` (low-priority fetch of a resource needed for navigation), `preload` (high-priority fetch of a resource needed imminently for current page), `modulepreload` (preload + parse an ES module graph), and the **Priority Hints API** (`fetchpriority` attribute — adjust browser-assigned fetch priority for individual resources). Beyond those, the **Speculation Rules API** (Chrome 108+) enables rule-based prefetch and prerender of entire pages for near-instant navigation. At SAP, adding `fetchpriority="high"` to the LCP hero image and `rel="modulepreload"` to the primary application bundle reduced LCP by 320ms by ensuring those resources were fetched first rather than competing with lower-priority resources in the browser's queue.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

The browser's preload scanner processes HTML ahead of parsing to discover and start fetching critical resources in parallel. But it can only find resources declared declaratively in HTML — dynamically injected resources, or resources the browser doesn't know are critical, miss this optimization. Resource hints extend the browser's awareness: `preload` promotes a resource to high-priority immediately; `prefetch` pre-fetches for future navigation; `preconnect` establishes connections to known external origins before their resources are discovered. The Priority Hints API fills the remaining gap: even when the browser has discovered resources, it may assign incorrect priorities based on heuristics — `fetchpriority` corrects these assignments explicitly.

### How It Works Internally

**Resource hint reference — complete taxonomy:**
```html
<!-- dns-prefetch: resolve DNS for an origin early (~50ms savings) -->
<!-- Use for: non-critical third-party origins, analytics domains -->
<link rel="dns-prefetch" href="https://analytics.example.com" />

<!-- preconnect: DNS + TCP + TLS (~150ms savings) -->
<!-- Use for: critical third-party origins where resources will load shortly -->
<!-- ⚠️ Hold open TCP slot — limit to 3-5 origins max -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- preload: high-priority download of resource needed for THIS page -->
<!-- Does NOT execute the resource — just fetches + caches it -->
<!-- Use for: LCP image, above-fold fonts, critical scripts -->
<link rel="preload" href="/fonts/inter-600.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/hero.avif" as="image" />
<link rel="preload" href="/app.abc123.css" as="style" />

<!-- prefetch: low-priority download for NEXT page navigation -->
<!-- Use for: next route's JS/CSS bundles, next page's hero image -->
<link rel="prefetch" href="/analytics-chunk.js" as="script" />

<!-- modulepreload: preload + parse + compile an ES Module (and its imports) -->
<!-- Significantly better than preload for ES modules — graph is resolved at preload time -->
<link rel="modulepreload" href="/app.abc123.js" />
<link rel="modulepreload" href="/vendor-react.abc.js" />
```

**Preload vs Prefetch — the critical distinction:**
```
preload:
  → High priority, current page
  → Browser MUST fetch it — blocking if not used within a few seconds (warning in DevTools)
  → fetchpriority defaults to 'high'
  → Resource goes into the high-priority fetch queue immediately

prefetch:
  → Low priority, future navigation
  → Browser SHOULD fetch it when idle — can be delayed or skipped under memory/network pressure
  → Uses browser idle time so it doesn't compete with current page resources
  → Cached for subsequent navigation → instant page load when user navigates
```

**`fetchpriority` — Priority Hints API (Chrome 101+, Firefox 132+):**
```html
<!-- fetchpriority="high" — promote to highest fetch priority -->
<!-- Critical use case: LCP image that was discovered late or has competing resources -->
<img
  src="/hero.avif"
  alt="Hero image"
  fetchpriority="high"
  width="1200"
  height="600"
/>
<!-- Without fetchpriority: browsers may assign LCP image "low" priority if discovered
     after other high-priority resources are already in the queue -->

<!-- fetchpriority="low" — demote non-critical images to low priority -->
<!-- Below-fold images should not compete with above-fold LCP image -->
<img src="/below-fold-thumbnail.jpg" fetchpriority="low" loading="lazy" />

<!-- fetchpriority="high" on preload for async loaded critical CSS -->
<link rel="preload" href="/critical-font.woff2" as="font" fetchpriority="high" crossorigin />

<!-- fetchpriority="low" on prefetch scripts — explicitly non-urgent -->
<link rel="prefetch" href="/low-priority-module.js" fetchpriority="low" />
```

**The LCP image / early-discovered scripts problem:**
```html
<!-- ❌ Problem: browser preload scanner sees 3 scripts before the LCP image -->
<head>
  <script src="/analytics.js" async></script>   <!-- gets medium priority, starts fetching -->
  <script src="/vendor.js" defer></script>       <!-- gets high priority, starts fetching -->
  <script src="/app.js" defer></script>          <!-- gets high priority, starts fetching -->
</head>
<body>
  <img src="/hero.avif" />  <!-- LCP image: browser discovers late, gets medium priority -->
  <!-- LCP image queued behind scripts → later LCP than necessary -->
</body>

<!-- ✅ Fix: fetchpriority="high" on LCP image + fetchpriority="low" on deferrable scripts -->
<head>
  <script src="/analytics.js" async fetchpriority="low"></script>  <!-- deprioritized -->
  <link rel="preload" href="/hero.avif" as="image" fetchpriority="high" />  <!-- early, high priority -->
  <script src="/vendor.js" defer></script>
  <script src="/app.js" defer></script>
</head>
<body>
  <img src="/hero.avif" fetchpriority="high" />  <!-- confirmed high priority at element level -->
</body>
```

**Speculation Rules API — rule-based prefetch/prerender (Chrome 108+):**
```html
<!-- Page-level prefetch rules — browser speculatively fetches next pages -->
<script type="speculationrules">
{
  "prefetch": [
    {
      "where": { "href_matches": "/dashboard/*" },
      "eagerness": "moderate"  // "conservative" | "moderate" | "eager"
    }
  ],
  "prerender": [
    {
      "where": { "href_matches": "/products/featured" },
      "eagerness": "moderate"
      // prerender: full page rendering in hidden browsing context
      // When user navigates: instant page display (< 100ms)
      // Cost: ~factor-of-5 more resources than prefetch
    }
  ]
}
</script>
```

```javascript
// Dynamic speculation rules — add rules based on user behavior
function speculateOnHover(link: HTMLAnchorElement): void {
  if (!('speculationrules' in HTMLScriptElement.prototype)) return;  // feature detect
  
  const existingScript = document.querySelector('script[type="speculationrules"]');
  const rules = existingScript ? JSON.parse(existingScript.textContent ?? '{}') : {};
  
  rules.prefetch = rules.prefetch || [];
  rules.prefetch.push({
    urls: [link.href],
    eagerness: 'eager',  // start immediately
  });
  
  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify(rules);
  document.head.appendChild(script);
}

// Add hover-based speculation for navigation links
document.querySelectorAll<HTMLAnchorElement>('nav a[href^="/"]').forEach((link) => {
  link.addEventListener('mouseenter', () => speculateOnHover(link), { once: true });
});
```

### Architecture & Component Boundaries

```
[Resource hint strategy by page lifecycle phase]

<head> — immediate high priority:
  preconnect to critical third-party origins (3-5 max)
  preload LCP image (as="image", fetchpriority="high")
  preload above-fold fonts (as="font", crossorigin)
  modulepreload critical JS modules

<body> during HTML parse:
  fetchpriority="high" on LCP <img>
  fetchpriority="low" on below-fold images
  loading="lazy" + fetchpriority="low" on non-critical images

Post-DOMContentLoaded (dynamic):
  prefetch next route chunks (based on current route → likely next routes)
  prefetch next page's LCP image

Post-LCP (fully loaded):
  Speculation Rules: prerender high-confidence next navigation targets
  prefetch assets for other high-traffic routes
```

### Data Flow & State Flow

**`modulepreload` for ES module graphs:**
```html
<!-- preload only fetches the file — browser must still discover its ESM imports -->
<link rel="preload" href="/app.js" as="script" />
<!-- Browser fetches app.js, parses it, discovers import '/vendor-react.js'
     → second fetch starts only after first completes → serial waterfall -->

<!-- modulepreload fetches, parses, and proactively walks the import graph -->
<link rel="modulepreload" href="/app.js" />
<!-- Browser fetches + parses app.js → discovers /vendor-react.js → preloads that too -->
<!-- Both modules are fetch-and-parse-ready simultaneously → parallel, not serial -->
```

### Performance Implications

| Resource Hint | Metric Impact | Risk |
|---|---|---|
| `preconnect` to critical origin | LCP: -150 to -300ms (eliminates connection overhead) | Over-preconnecting: wasted TCP slots |
| `preload` LCP image | LCP: -100 to -500ms (priority elevation for late-discovered images) | Unused preload = wasted bandwidth + DevTools warning |
| `fetchpriority="high"` on `<img>` | LCP: -50 to -300ms (correct browser priority assignment) | None — hints only; browser may override |
| `fetchpriority="low"` on analytics | LCP: -20 to -100ms (removes priority competition) | None |
| `modulepreload` for entry chunk | TTI: -100 to -400ms (parallel fetch + parse of module graph) | Incorrect graph → missed sub-modules |
| `prefetch` next route chunk | Navigation: -400 to -1500ms (instant-feel navigation) | Wasted bandwidth if user doesn't navigate |
| Speculation Rules prerender | Navigation: -800 to -2000ms (near-instant navigation) | High resource cost; only for high-confidence next pages |

### Scalability Considerations

- **Small site:** `preload` LCP image; `preconnect` for Google Fonts (if not self-hosted); `fetchpriority="high"` on above-fold images
- **100K users / SPA:** Route-based `prefetch` for likely-next chunks (based on current route); `modulepreload` for critical entry module; `fetchpriority` tuning for above-fold image grid
- **10M+ users / FAANG:** Speculation Rules with ML-based eagerness (prefetch URLs that have a > 50% probability of user navigating to, based on click-through data); dynamic speculation rules injected per user session; A/B testing resource hint strategies measured against LCP/navigation timing in RUM data

### Trade-offs

| `preload` | `prefetch` | Speculation Rules |
|---|---|---|
| High priority, current page | Low priority, future page | Rule-based current + future |
| Mandatory browser action | Advisory (can skip under pressure) | Advisory (can abort under memory pressure) |
| Fast for critical resources | No impact on current page | Most powerful for navigation |
| Wasted bandwidth risk | Low waste risk (low priority) | High resource cost for prerender |

### ⚠️ Anti-Patterns & Pitfalls

- **Preloading without using:** A preloaded resource not used within 3 seconds triggers a browser console warning and wastes bandwidth. Always verify the preloaded resource is actually fetched via its intended mechanism (CSS reference, script src, img src) and not already discovered naturally
- **`crossorigin` mismatch on font preload:** Font `<link rel="preload">` must include `crossorigin` (even for same-origin fonts) because fonts are always fetched in CORS mode — without `crossorigin` on the preload, the preloaded resource is discarded and a new fetch initiated, doubling the fetch cost (classic gotcha)
- **Preloading resources that are already discovered:** Preloading images referenced in `<img src="...">` early in the HTML is already seen by the preload scanner — the `<link rel="preload">` adds no benefit and wastes a `<head>` request slot. Only preload resources the scanner can't discover (CSS-loaded backgrounds, JS-loaded resources)
- **Using `prefetch` for current-page resources:** `prefetch` uses low priority and may be deprioritized under network pressure — using `prefetch` when you mean `preload` for a critical current-page resource may cause it to load late. Always use `preload` for same-page critical resources.
- **Speculation Rules prerender for all pages:** `prerender` spins up a full browsing context (full page rendering, JS execution, API calls) for each speculated page — prerending every link wastes massive resources. Only prerender pages where user navigation probability is genuinely high (> 50% confidence in contextual data)

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
In the SAP BI Launchpad, the LCP element was a hero dashboard image loaded from an S3 bucket. Lighthouse showed the browser was assigning it a low-medium priority because several above-the-fold AJAX calls and two async scripts were already in the high-priority queue when the image was discovered. Adding `fetchpriority="high"` to the `<img>` tag and combining with `<link rel="preload" href="..." as="image" fetchpriority="high">` in `<head>` moved the image to the top of the fetch queue. Combined with `<link rel="modulepreload">` for the primary React bundle, LCP improved by 320ms (from 2.8s to 2.48s). A further optimization: adding `prefetch` links for the 5 most common next-navigation routes during idle time reduced average navigation latency from 800ms to 120ms for users navigating within the app.

**At FAANG scale:**
Google Search has implemented Speculation Rules to prerender likely search result clicking destinations, making navigations to top results near-instant for Chrome users. Amazon prewarms common checkout flow pages. Vercel's Next.js automatically adds `<link rel="prefetch">` for routes linked in the current page's `<Link>` components. Chrome's built-in pre-loading (`NoStatePrefetch`, evolved to Speculation Rules) achieves near-instant navigation for popular next-page predictions in the browser's history-based model.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Resource hints are a family of browser directives that adjust fetch behavior beyond what the default preload scanner provides. `preload` elevates a specific resource to high-priority for the current page — critically useful for LCP images discovered late in HTML or loaded via CSS, and fonts which otherwise start loading after the CSS is parsed. `prefetch` downloads a resource at low priority for future navigation during idle time — great for next-route code chunks. `preconnect` pre-establishes DNS, TCP, and TLS to an origin before its resources are needed — saving 150–300ms on first use of that origin. The Priority Hints API — `fetchpriority` attribute — fills the remaining gap: the browser assigns priorities based on heuristics, and those heuristics are sometimes wrong. The most common example: an LCP hero image is discovered after several scripts are already in the high-priority queue and gets assigned medium priority. `fetchpriority='high'` moves it to the top. At SAP, combining a `preload` with `fetchpriority='high'` for the LCP image and `modulepreload` for the entry JS module reduced LCP by 320ms. The newest tool is Speculation Rules — rule-based page prefetch and prerender for near-instant navigation — though prerender is expensive and should only be applied to high-confidence next-page targets."

### Likely Follow-up Questions
1. What's the difference between `preload` and `prefetch`? → `preload`: mandatory high-priority fetch for current page; used within seconds; browser MUST fetch it. `prefetch`: advisory low-priority fetch for next page; optional; browser may defer or skip.
2. Why does `<link rel="preload">` for a font need `crossorigin`? → Fonts are always fetched in CORS mode; without `crossorigin` on the preload, the preloaded request uses non-CORS mode and the browser can't reuse it when the `@font-face` CSS triggers the actual (CORS) fetch — resulting in double download
3. What is `modulepreload`? → Fetches, parses, and compiles an ES module AND proactively walks its static import graph to preload sub-dependencies — prevents the module waterfall where each import is only discovered after its parent is parsed
4. What is the Speculation Rules API? → A JSON-based browser API (Chrome 108+) for declaring conditional page prefetch/prerender rules; prerender spins up a full browsing context for the target page, enabling sub-100ms apparent navigation when the user clicks the link

### How to Signal Senior Thinking
> "The frontier here is dynamic speculation rules based on real user navigation data. If RUM shows that 65% of users on the Dashboard page navigate to the Analytics page, I'd inject a Speculation Rules prerender for the Analytics route dynamically for Dashboard visitors — but only after LCP so the prerender doesn't compete with main page resources. And I'd close the loop with A/B testing: measure whether the speculation rule for that route actually reduces navigation latency in real user data (comparing Time-to-Navigation in RUM) versus the resource cost (extra bandwidth per session). This kind of data-driven resource hint optimization is what separates senior-level performance engineering from basic preloading."

---

## 💻 5. Code Example

```typescript
// Comprehensive resource hint manager — TypeScript implementation

// Type definitions for the `fetchpriority` attribute (not yet in standard DOM types)
interface HTMLImageElementExtended extends HTMLImageElement {
  fetchPriority?: 'high' | 'low' | 'auto';
}

// Programmatic preload — for resources not known at HTML generation time
function preloadResource(options: {
  href: string;
  as: 'image' | 'font' | 'script' | 'style' | 'fetch';
  type?: string;
  crossOrigin?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
}): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = options.href;
  link.setAttribute('as', options.as);
  if (options.type) link.type = options.type;
  if (options.crossOrigin) link.crossOrigin = 'anonymous';
  if (options.fetchPriority) link.setAttribute('fetchpriority', options.fetchPriority);
  document.head.appendChild(link);
  return link;
}

// Route-based prefetch — prefetch chunks for likely next navigation
const ROUTE_PREFETCH_MAP: Record<string, string[]> = {
  '/dashboard': ['/analytics-chunk.js', '/reports-chunk.js'],
  '/analytics': ['/reports-chunk.js', '/export-chunk.js'],
  '/settings': ['/billing-chunk.js'],
};

function prefetchRouteChunks(currentPath: string): void {
  const chunks = ROUTE_PREFETCH_MAP[currentPath] ?? [];
  
  // Defer prefetch to after LCP + idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      chunks.forEach((src) => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = src;
        link.setAttribute('as', 'script');
        link.setAttribute('fetchpriority', 'low');
        document.head.appendChild(link);
      });
    }, { timeout: 5000 });
  }
}

// Speculation rules — dynamic injection based on user context
interface SpeculationRules {
  prefetch?: Array<{ urls?: string[]; where?: object; eagerness?: string }>;
  prerender?: Array<{ urls?: string[]; where?: object; eagerness?: string }>;
}

function injectSpeculationRules(rules: SpeculationRules): void {
  if (!('speculationrules' in HTMLScriptElement.prototype)) {
    // Fallback: use rel=prefetch for each URL
    const allPrefetchUrls = [
      ...(rules.prefetch?.flatMap(r => r.urls ?? []) ?? []),
      ...(rules.prerender?.flatMap(r => r.urls ?? []) ?? []),
    ];
    allPrefetchUrls.forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
    return;
  }

  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify(rules);
  document.head.appendChild(script);
}

// Usage: inject speculation rules after LCP for high-traffic navigation paths
function setupSpeculativeNavigation(currentPage: string): void {
  // Only prerender pages in the most common navigation flow
  const prerenderId = {
    '/': '/dashboard',
    '/dashboard': '/analytics',
    '/landing': '/signup',
  }[currentPage];

  if (!prerenderId) return;

  // After LCP — don't compete with initial page load
  const po = new PerformanceObserver((list) => {
    if (list.getEntries().length > 0) {
      po.disconnect();
      injectSpeculationRules({
        prerender: [{ urls: [prerenderId], eagerness: 'moderate' }],
      });
    }
  });
  po.observe({ type: 'largest-contentful-paint', buffered: true });
}
```

**Interview vs Production difference:**
In an interview, cover the complete taxonomy (`dns-prefetch`, `preconnect`, `preload`, `prefetch`, `modulepreload`), the `fetchpriority` attribute for LCP optimization, and the `crossorigin` gotcha for font preloads. In production, add: dynamic route-based prefetch, Speculation Rules for high-confidence next-page targets, RUM monitoring to verify preload/prefetch accuracy, and A/B testing speculation rules to measure actual navigation latency improvement vs bandwidth cost.

---

## 🧠 6. Memory Aid

**Mental Model:** Resource hints are like phone calls you make before you need someone: `dns-prefetch` = looking up their number, `preconnect` = dialing and waiting for them to pick up, `preload` = calling and asking them to drive over immediately, `prefetch` = asking them to be on standby in case you need them later. `fetchpriority` = telling the switchboard which calls get priority.

**If you go blank:** "Resource hints tell the browser what to fetch before it naturally would. preload = high priority now. prefetch = low priority for next page. preconnect = establish connection to third-party origin early. fetchpriority='high' on LCP image = most common and highest-impact single-attribute performance fix. Font preloads need crossorigin. modulepreload fetches entire ES Module import graph."

**Mnemonic:** **P-P-C-F** — **P**reload (current high priority), **P**refetch (next page low priority), **C**onnect (preconnect for origins), **F**etchpriority (correct browser priority heuristics).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: `fetchpriority="high"` on LCP images is a one-attribute change that commonly improves LCP by 100–500ms — the highest ROI single-attribute performance improvement available
→ Performance: `preconnect` eliminates 150–300ms of connection overhead for critical third-party origins; `prefetch` makes SPA navigation feel instant by pre-downloading next-route chunks during idle time
→ Business: Google reports LCP as a key ranking signal; resource hints directly improve LCP and navigation timing which feeds into Core Web Vitals scores and SEO rankings

**How it works (3 sentences):**
Resource hints inform the browser's speculative loader about resources it should fetch, connect to, or preparse before they would be naturally discovered during HTML parsing — `preload` forces high-priority immediate fetch of a current-page resource (LCP image, critical font, entry module) while `prefetch` uses idle bandwidth to download next-page resources; both are set as `<link>` declarations in `<head>` or dynamically injected via JavaScript. The Priority Hints API (`fetchpriority` attribute) allows developers to correct the browser's heuristic-based priority assignments — the most impactful use case is `fetchpriority="high"` on LCP `<img>` elements that are discovered late in the HTML document or compete with script fetches for the high-priority queue, directly reducing LCP by elevating the image above competing resources. The Speculation Rules API (Chrome 108+) extends prefetching to full page prerenders via JSON rules — the browser silently renders the target page in a hidden context so navigation appears instant when the user clicks the link, representing the evolution from resource-level hint to page-level speculation for near-zero-latency navigation experiences.

**Company relevance:**
- Microsoft: Microsoft Edge browser team has been actively involved in Priority Hints standardization; Azure Static Web Apps + Azure CDN configurations should include proper resource hints for Microsoft web properties
- Adobe: adobe.com and Creative Cloud web apps use `fetchpriority` tuning on core marketing page LCP images; Priority Hints is an area Adobe web performance teams are actively implementing
- Salesforce: Salesforce Lightning Experience uses SPAs extensively — route-based prefetching and modulepreload for Lightning Web Components bundles are directly applicable to Salesforce frontend performance
- Cisco: Cisco Webex web client and Meraki dashboard use complex SPA architectures where route prefetching and resource hint tuning can significantly improve perceived performance for global users

---
**✅ Topic 195/486 complete.**

---

## 🎉 SEQ 9 Complete!

All 14 topics (182–195) of SEQ 9: Assets & Resource Optimization have been generated.

| # | Topic | Status |
|---|---|---|
| 182 | Image Optimization | ✅ |
| 183 | Responsive Images | ✅ |
| 184 | Font Optimization | ✅ |
| 185 | AVIF vs WebP vs JPEG XL | ✅ |
| 186 | Variable Fonts | ✅ |
| 187 | CSS Optimization | ✅ |
| 188 | JavaScript Bundle Optimization | ✅ |
| 189 | Compression (Gzip, Brotli) | ✅ |
| 190 | CSS-in-JS Performance Trade-offs | ✅ |
| 191 | CDN Usage | ✅ |
| 192 | Third-Party Script Management | ✅ |
| 193 | Tag Managers & Risks | ✅ |
| 194 | Self-Hosting vs Third-Party Assets | ✅ |
| 195 | Resource Hints — Priority Hints API | ✅ |

**Say GO to start SEQ 10: Frontend Architecture Patterns**
