# 127. Resource Hints — Priority Hints API ★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Resource hints** are HTML attributes and HTTP headers that instruct the browser about future resource needs *before* it discovers them during parsing. They include `preload` (fetch this resource now, I'll use it immediately), `prefetch` (fetch this resource in idle time, I'll use it on the next page), `preconnect` (open a connection to this origin now), and `dns-prefetch` (resolve this DNS now). The **Priority Hints API** (`fetchpriority` attribute) is a newer, more precise tool that tells the browser how to prioritize a resource *relative to other resources of the same type* — most critically, marking your LCP image as `fetchpriority="high"` tells the browser to deprioritize other images and fetch the LCP element first. Together, these hints are the primary mechanism to take control of the browser's default resource loading order, which otherwise optimizes based on DOM position — not your application's actual rendering priorities.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### The Browser's Default Priority Model

```
Browser default priorities (simplified):
────────────────────────────────────────────────────────
Highest:  CSS in <head>, font preloads, scripts blocking HTML parse
High:     In-viewport images, async/defer scripts
Medium:   Out-of-viewport images
Low:      Prefetched resources, lazy-loaded images
────────────────────────────────────────────────────────

Problem: Browser doesn't know your app's rendering priorities.
It doesn't know that image #4 in the HTML is your LCP element.
It doesn't know that font on line 8 of your CSS is critical.
Resource hints + Priority Hints tell the browser what you know.
```

### `<link rel="preload">` — Fetch Now

```html
<!-- Preload: highest priority fetch, immediately. Browser must use the resource. -->

<!-- Critical font — fetch before CSS is parsed and discovers it -->
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin="anonymous"   <!-- REQUIRED for fonts even on same origin -->
/>

<!-- LCP image — alternatives to fetchpriority="high" on <img> -->
<link
  rel="preload"
  href="/images/hero.avif"
  as="image"
  type="image/avif"
  imagesrcset="/images/hero-400.avif 400w, /images/hero-800.avif 800w"
  imagesizes="(max-width: 600px) 400px, 800px"
/>

<!-- Critical CSS (above the fold) -->
<link
  rel="preload"
  href="/styles/above-fold.css"
  as="style"
  onload="this.rel='stylesheet'"   <!-- Convert to actual stylesheet on load -->
/>

<!-- ⚠️ ANTI-PATTERN: Preloading without using the resource -->
<!-- If preloaded resource isn't used within 3s: browser warns in console -->
<!-- "The resource was preloaded using link preload but not used within a few seconds" -->
```

### `fetchpriority` — Priority Hints API

```html
<!-- LCP image: tell browser to prioritize this over other images -->
<!-- Without fetchpriority: browser loads images in DOM order or viewport proximity -->
<!-- With fetchpriority="high": browser immediately shifts to high priority fetch -->
<img
  src="/images/hero.jpg"
  fetchpriority="high"   <!-- ← Most impactful LCP optimization you can do -->
  loading="eager"        <!-- Don't lazy-load the LCP image! -->
  decoding="async"       <!-- Decode off main thread -->
  alt="Hero image"
  width="1200"
  height="675"
/>

<!-- Below-fold images: explicitly low priority to free bandwidth for critical resources -->
<img
  src="/images/feature-1.jpg"
  fetchpriority="low"    <!-- Below-fold: browser can defer this -->
  loading="lazy"         <!-- Lazy-load until near viewport -->
  alt="Feature image"
  width="600"
  height="400"
/>

<!-- JS script: deprioritize non-critical async script -->
<script
  src="/js/analytics.js"
  async
  fetchpriority="low"   <!-- Can wait until critical resources are loaded -->
></script>

<!-- preload + fetchpriority together for guaranteed maximum priority -->
<link
  rel="preload"
  href="/api/initial-data.json"
  as="fetch"
  fetchpriority="high"
  crossorigin="anonymous"
/>
```

### `<link rel="prefetch">` — Speculative Navigation

```html
<!-- Prefetch: fetch in idle time, will be used on NEXT navigation -->
<!-- Stored in the HTTP cache (not the preload cache) -->

<!-- User is on /products — they'll likely navigate to /checkout -->
<link rel="prefetch" href="/checkout" as="document" />

<!-- Prefetch next page's critical JS chunk -->
<link rel="prefetch" href="/js/checkout.chunk.js" as="script" />

<!-- ⚠️ DIFFERENCE from preload:
     preload: fetch now, use on CURRENT page
     prefetch: fetch in idle, use on FUTURE navigation
-->
```

### `<link rel="preconnect">` and `dns-prefetch`

```html
<!-- preconnect: perform DNS + TCP + TLS handshake for an origin you'll need -->
<!-- Typically reduces time-to-first-byte from third-party by 100-300ms -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preconnect" href="https://api.example.com" />
<link rel="preconnect" href="https://cdn.example.com" />

<!-- dns-prefetch: just DNS resolution (lighter, for less-critical third-parties) -->
<!-- Fallback for browsers that don't support preconnect -->
<link rel="dns-prefetch" href="https://analytics.example.com" />

<!-- Best practice: combine for critical + dns-only for secondary -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="dns-prefetch" href="https://fonts.gstatic.com" />

<!-- ⚠️ Don't overuse preconnect — each open connection uses memory
     Limit to 3-4 critical third-party origins maximum -->
```

### Speculation Rules API (Modern Alternative to Prefetch)

```html
<!-- Speculation Rules API: more granular control than <link rel="prefetch"> -->
<!-- Chrome 109+: prefetch or prerender based on URL patterns or links on page -->
<script type="speculationrules">
{
  "prefetch": [
    {
      "source": "document",
      "where": { 
        "selector_matches": "a[href^='/product']"  
      },
      "eagerness": "moderate"   // hover → prefetch intent signal
    }
  ],
  "prerender": [
    {
      "source": "list",
      "urls": ["/checkout"],    // Pre-render hidden tab for checkout page
      "eagerness": "immediate"  // Prerender when page loads
    }
  ]
}
</script>
<!-- prerender: full page renders in background tab — navigation is INSTANT
     Risk: stateful operations (form submissions) could fire in background tab
     Use for: read-only destination pages with high navigation probability -->
```

### Next.js Integration

```typescript
// next/head for manual resource hints
import Head from 'next/head';

export function DocumentHead() {
  return (
    <Head>
      {/* Critical font: preload + crossorigin */}
      <link
        rel="preload"
        href="/fonts/inter-var.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      
      {/* Critical third-party: preconnect */}
      <link rel="preconnect" href="https://api.example.com" />
      
      {/* Prefetch likely next page */}
      <link rel="prefetch" href="/app/dashboard" />
    </Head>
  );
}

// OR: App Router with Next.js metadata API
import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Link preloads via <link> in layout.tsx <head>
};
```

### React: Programmatic Resource Hints

```typescript
// React 19 introduces built-in APIs for resource hints
// These are preferable as they avoid duplicate preloads when components remount

import { preload, prefetchDNS, preconnect } from 'react-dom';

// In a Server Component or early-rendering client component:
function ProductPage({ product }: { product: Product }) {
  // React 19: preload API automatically deduplicates and hoists to <head>
  preload(product.heroImage, { as: 'image', fetchPriority: 'high' });
  preconnect('https://cdn.example.com');
  
  return <ProductLayout product={product} />;
}

// React 18 equivalent: useEffect + DOM manipulation
function usePreload(href: string, as: string): void {
  useEffect(() => {
    const existing = document.querySelector(`link[rel="preload"][href="${href}"]`);
    if (existing) return;  // Deduplicate
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (as === 'font') link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    
    return () => { link.remove(); };
  }, [href, as]);
}
```

### Priority Hints Impact on LCP

```
Real-world LCP improvement from fetchpriority="high":
──────────────────────────────────────────────────────────
Before: Hero image loaded in priority queue with all other images
        Browser loads carousel thumbnail (position 1 in HTML) first
        Hero (position 3) waits for thumbnail to complete
        LCP: 3.2s

After: fetchpriority="high" on hero image
        Browser immediately promotes hero to high-priority fetch queue
        Carousel thumbnails defer until hero completes
        LCP: 1.8s  (-1.4s improvement from one attribute change!)
──────────────────────────────────────────────────────────
This is why fetchpriority="high" on LCP image is in Google's
"easiest wins" category for CWV improvements.
```

### Common Mistakes

```html
<!-- ❌ Preloading lazily-loaded images (contradictory) -->
<link rel="preload" href="/below-fold-image.jpg" as="image" />
<img src="/below-fold-image.jpg" loading="lazy" />
<!-- preload overrides lazy loading — loads immediately, defeats purpose -->

<!-- ❌ Preloading too many resources -->
<!-- Every preload competes for bandwidth with the actual LCP path -->
<!-- Limit preloads to: 1-2 fonts, 1 LCP image, critical CSS/JS only -->

<!-- ❌ Missing crossorigin on font preload -->
<link rel="preload" href="/fonts/inter.woff2" as="font" />
<!-- Without crossorigin: browser downloads font twice (once for preload, once for @font-face) -->

<!-- ❌ Using preload for everything instead of prefetch for next-page resources -->
<link rel="preload" href="/js/checkout.chunk.js" as="script" />
<!-- This fetches checkout JS at highest priority NOW, stealing bandwidth from current page -->
<!-- Use: <link rel="prefetch" href="/js/checkout.chunk.js" as="script" /> -->

<!-- ❌ fetchpriority="high" on non-LCP images -->
<img src="/logo.svg" fetchpriority="high" />  <!-- Logo is never your LCP -->
<!-- Unnecessary priority competition with actual LCP element -->
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Airbnb:**
Added `fetchpriority="high"` to hero images across all listing and search pages. LCP improvement: 22% (average 2.8s → 2.2s across mobile users). Single HTML attribute change, largest single CWV win in their 2023 optimization sprint.

**Shopify:**
Uses resource hints extensively for the Storefront API: `preconnect` to Shopify CDN from merchant-hosted storefronts, `prefetch` for checkout page resources on cart pages. Checkout page LCP for stores using their recommended hints config: 1.4s vs 2.9s for unannotated stores.

**Google Search:**
Speculative Rules API prerender is used for the first organic result hover — when you hover a result for 200ms+, that page starts rendering in a hidden background context. Navigation to that result appears near-instant. This is the most aggressive form of resource hinting.

**SAP (Hruday's context):**
SAP Fiori shell uses `preconnect` to the SAP OData service endpoint before any UI renders. With a typical 150ms DNS + TLS overhead for enterprise API endpoints, preconnect saves this time from the first API call, directly improving perceived load time.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Resource hints are how I give the browser advance knowledge of what I know but it doesn't — which resources are critical, which origins I'll need, and what the user will do next. My standard page setup is: `<link rel="preload">` for the critical font (with `crossorigin`), `fetchpriority='high'` on the LCP image, and `<link rel="preconnect">` for the 2-3 third-party origins the page needs. The LCP image `fetchpriority` is the highest-ROI single-attribute change in frontend performance right now — Airbnb saw 22% LCP improvement from it alone. The key discipline is not overusing any of these: every preload steals bandwidth from the LCP path if it's not actually critical, and every preconnect maintains an open connection that consumes memory. I limit preconnects to critical third-party origins and `fetchpriority='high'` to exactly one element — the LCP candidate. For next-navigation resources, I use `prefetch`, not `preload` — the difference is critical: preload fetches at highest priority now; prefetch fetches in idle time for future use."

**Likely Follow-up Questions:**
1. *What's the difference between preload and prefetch?* → `preload`: current page, high priority, now; `prefetch`: next page, low priority, idle time
2. *Why does crossorigin matter on font preloads?* → Fonts are fetched with CORS; `@font-face` requests include `Origin` header; preload without crossorigin uses no-cors mode → browser treats them as different requests → downloads twice
3. *What is `fetchpriority` and when would you use it?* → Attribute on `<img>`, `<link>`, or `<script>` that boosts/lowers priority within the resource type; use `high` on LCP image, `low` on below-fold or non-critical resources
4. *How is the Speculation Rules API better than `<link rel="prefetch">`?* → Speculation Rules can prerender (full tab render, not just fetch); can trigger on hover/viewport intersection ('eagerness'); can match URL patterns via CSS selectors on links
5. *What happens if you preload too many resources?* → They compete for bandwidth with the actual critical path; if the browser can't fetch the LCP image because it's busy fetching 5 preloaded fonts, LCP gets worse

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Complete Head Resource Hints)
────────────────────────────────────────────────────────────

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- 1. Preconnect to critical third-party origins (before any resource requests) -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://api.example.com">
  <link rel="dns-prefetch" href="https://cdn.analytics.com">
  
  <!-- 2. Preload critical fonts (before CSS discovers them) -->
  <link
    rel="preload"
    href="/fonts/inter-var.woff2"
    as="font"
    type="font/woff2"
    crossorigin="anonymous"
  >
  
  <!-- 3. Preload critical CSS -->
  <link rel="preload" href="/css/critical.css" as="style">
  
  <!-- 4. CSS that applies fonts (must come after preload to avoid FOUC) -->
  <link rel="stylesheet" href="/css/critical.css">
  <link rel="stylesheet" href="/css/main.css">
  
  <!-- 5. Prefetch next-page resources (idle time) -->
  <link rel="prefetch" href="/js/dashboard.chunk.js" as="script">
  
  <!-- 6. Speculation Rules for high-confidence navigation prediction -->
  <script type="speculationrules">
  {
    "prefetch": [{
      "source": "document",
      "where": { "selector_matches": "a[data-prefetch]" },
      "eagerness": "moderate"
    }]
  }
  </script>
</head>
<body>
  <!-- 7. fetchpriority on LCP image -->
  <img
    src="/images/hero.avif"
    fetchpriority="high"
    loading="eager"
    decoding="async"
    alt="Hero"
    width="1200"
    height="600"
  >
  
  <!-- 8. Below-fold images: low priority + lazy load -->
  <img
    src="/images/feature.jpg"
    fetchpriority="low"
    loading="lazy"
    alt="Feature"
    width="600"
    height="400"
  >
</body>
</html>
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**The four hints in one sentence each:**
- `preload` = "I will use this on THIS page, fetch NOW at high priority"
- `prefetch` = "I might use this on the NEXT page, fetch when idle"
- `preconnect` = "I will need this origin, open connection NOW"
- `fetchpriority` = "Among same-type resources, THIS one is most important"

**The #1 practical win:**
```html
<img src="hero.jpg" fetchpriority="high" loading="eager" />
```
→ This alone typically improves LCP by 200-800ms on image-heavy pages.

**If you go blank:** "Resource hints give the browser advance knowledge. `preload` for current-page critical resources, `prefetch` for next-page, `preconnect` for third-party origins, `fetchpriority='high'` on LCP image."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **LCP**: Browser's default priority doesn't know your LCP element — `fetchpriority="high"` fixes this
→ **First paint**: Preloading fonts prevents FOIT; preconnecting to APIs speeds first data fetch
→ **Navigation speed**: Prefetch + Speculation Rules make page transitions feel instant

**How it works:**
→ Resource hints are processed by the browser's Preload Scanner — a lookahead parser that runs ahead of the main HTML parser to discover resources without waiting for DOM construction. `preload` instructs this scanner to initiate high-priority fetches immediately. `fetchpriority` modifies the browser's priority queue for the resource's type, causing higher-priority items to consume more bandwidth allocation from the network scheduler.

**Company relevance:**
→ **Microsoft**: Bing Search uses `fetchpriority="high"` on search result thumbnail images that are likely to be the LCP; `preconnect` to CDN on every page
→ **Adobe**: Creative Cloud home page uses `preconnect` to Adobe's CDN + `preload` for above-fold creative assets
→ **Salesforce**: CRM console uses `prefetch` for the next likely action page (e.g., contact detail page when viewing a list)
→ **Cisco**: WebEx meeting page uses `preconnect` to WebEx media servers during load — reduces meeting join latency by pre-establishing WebRTC connection infrastructure
