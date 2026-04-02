# 61. Preload vs Prefetch vs Preconnect ★

## 1. High-Level Explanation (Frontend Interview Level)

**Resource hints** are HTML `<link>` attributes and HTTP headers that instruct the browser to perform preparatory network work — before the resource is explicitly needed — to reduce resource discovery latency and improve perceived performance. The three main hints form a spectrum from **high-certainty near-future use** (`preload`) to **speculative future use** (`prefetch`) to **early connection cost reduction** (`preconnect`). Understanding when to use each is a Core Web Vitals optimisation requirement: misusing `preload` (for resources that aren't used immediately) wastes bandwidth and triggers browser console warnings; misusing `prefetch` (for resources needed immediately) delays them; skipping `preconnect` for third-party origins costs 300–500ms of connection overhead on every first request.

**One-line decision rule:** `preload` = this page needs it soon; `prefetch` = the next page will need it; `preconnect` = I'll fetch from this origin soon but don't know the exact resource yet.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### The Three Core Resource Hints

```
<link rel="preload">       → Fetch resource now, high priority, for THIS page
<link rel="prefetch">      → Fetch resource at low priority for FUTURE navigation
<link rel="preconnect">    → Open connection to an origin now for ANY future resource from it
<link rel="dns-prefetch">  → Resolve DNS for an origin (cheaper than preconnect, less benefit)
```

### preload — High-Priority Resource Fetching

`preload` forces the browser to fetch a resource immediately, before the parser would normally discover it. It does NOT execute the resource — it only downloads it to the cache; the actual use remains in the original `<link>`, `<script>`, or `<style>` tag.

```html
<!-- Critical font — without preload: browser discovers font after CSS parsing,
     causing FOUT (Flash of Unstyled Text) 200-500ms later -->
<link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>

<!-- Critical above-fold image — preload tells browser to start fetching
     before document parsing finds the <img> tag -->
<link rel="preload" href="/hero-image.webp" as="image" fetchpriority="high">

<!-- Critical CSS (if not inlined) -->
<link rel="preload" href="/critical.css" as="style">

<!-- Preload a script needed for interactivity (don't execute, just cache) -->
<link rel="preload" href="/app.js" as="script">
```

**The `as` attribute is mandatory** — it tells the browser the resource type so it can apply the correct Content Security Policy, set the correct Accept headers, and prioritise correctly. Missing `as` converts `preload` into a low-priority fetch and triggers a warning.

**Preload for dynamic imports (code splitting):**
```html
<!-- React.lazy() + Suspense — browser won't discover the lazy chunk 
     until React tries to render it. Preloading closes this gap. -->
<link rel="preload" href="/checkout-bundle.js" as="script">
```

```javascript
// In a Next.js page or React app — preload on hover to reduce apparent navigate latency
function ProductCard({ href }) {
  const handleMouseEnter = () => {
    // Programmatic preload when user shows intent (hover = likely click)
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = `/api/product/${productId}`;
    document.head.appendChild(link);
  };

  return <article onMouseEnter={handleMouseEnter}><a href={href}>...</a></article>;
}
```

**Critical mistake: preloading without using the resource**
```
⚠️ Console warning: "The resource /hero.webp was preloaded using link preload 
   but not used within a few seconds from the window's load event"
   
Cause: preloaded resource was never referenced by a <img>, <script>, <link>, or <style>
Effect: Bandwidth wasted; resource fetched twice (preload + actual discovery)
Fix: Ensure every preload has a corresponding consumer in the document
```

### prefetch — Low-Priority Speculative Fetch

`prefetch` downloads a resource at **idle time** for use in a future navigation. The browser deprioritises it — only fetches when bandwidth is available, not on metered connections by default.

```html
<!-- Next page the user will likely visit (e.g., from analytics: 70% of users 
     who view the product listing click into a product detail page) -->
<link rel="prefetch" href="/product-detail-bundle.js" as="script">

<!-- Prefetch JSON data for the next expected navigation -->
<link rel="prefetch" href="/api/user/dashboard-data" as="fetch" crossorigin>
```

**Framework-level prefetch:**
```typescript
// Next.js App Router — <Link> prefetches by default on hover/visibility
<Link href="/checkout" prefetch={true}>           // prefetch on page load
<Link href="/checkout" prefetch={false}>          // disable prefetch

// Next.js Pages Router — router.prefetch()
import { useRouter } from 'next/router';
const router = useRouter();
router.prefetch('/checkout');  // signal next likely navigation
```

**prefetch vs preload — the key distinction:**
```
preload:  "I need this in ~100ms" — fetch at high priority now
prefetch: "I might need this in the next navigation" — fetch at idle time
          
Using preload when you should use prefetch = aggressive network use, potential bandwidth waste
Using prefetch when you should use preload = resource arrives late, performance bug
```

### preconnect — Early Connection Setup

A full HTTPS connection requires: DNS lookup (~30ms) + TCP handshake (~30ms) + TLS handshake (~60ms) = ~120ms overhead **per origin** per cold connection. `preconnect` performs all three steps while the HTML is still parsing — for a third-party resource that would otherwise start connecting only when the browser encounters the actual `<script>` or `<img>` tag.

```html
<!-- Google Fonts: the font CSS is on fonts.googleapis.com, 
     the actual font files are on fonts.gstatic.com (different origin) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Analytics CDN — preconnect before the analytics script tag -->
<link rel="preconnect" href="https://www.google-analytics.com">

<!-- CDN for your own assets when asset domain differs from page domain -->
<link rel="preconnect" href="https://cdn.company.com">

<!-- API origin — preconnect before first API call on SPA startup -->
<link rel="preconnect" href="https://api.company.com">
```

**preconnect vs dns-prefetch:**
```
dns-prefetch: DNS resolution only (~30ms saved per cold request)
              Supported in all browsers including IE11
              Use for non-critical third-party domains

preconnect:   DNS + TCP + TLS (~120ms saved per cold request)
              More aggressive — maintains open socket connection
              Use for important third-party domains (fonts, analytics, CDN, API)
              Chrome closes unused preconnect < 10s — don't preconnect to many origins
```

### `fetchpriority` Attribute — Fine-Grained Priority Control

The `fetchpriority` attribute on `<img>`, `<script>`, and `<link>` complements resource hints by adjusting browser priority within the same resource type:

```html
<!-- Hero image: above the fold, most important for LCP — boost priority -->
<img src="/hero.webp" fetchpriority="high" loading="eager" alt="...">

<!-- Below-fold images — lower priority, browser can defer -->
<img src="/product-secondary.webp" fetchpriority="low" loading="lazy" alt="...">

<!-- Preloading hero image with high priority hint -->
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high">
```

### Real Decision Matrix

| Situation | Correct Hint |
|---|---|
| Critical above-fold image (LCP candidate) | `<link rel="preload" as="image" fetchpriority="high">` |
| Google Fonts or other third-party font CDN | `<link rel="preconnect">` to font CDN origin |
| Lazy-loaded route the user is about to navigate to | `<link rel="prefetch" as="script">` |
| API endpoint called in `componentDidMount` / `useEffect` | `<link rel="preconnect">` to API origin |
| Critical CSS file not inline | `<link rel="preload" as="style">` |
| JS bundle for next page on `<Link>` hover | Framework handles with prefetch; manual: `<link rel="prefetch" as="script">` |
| WebSocket server origin | `<link rel="preconnect">` |
| Build tool CDN (Unpkg, jsDelivr) for third-party script | `<link rel="preconnect">` |

---

## 3. Real-World Examples

**LCP Optimisation — Real impact:**
A typical e-commerce hero image (above fold, SSR page):
- Without preload: Browser discovers `<img>` tag mid-document parse → starts fetch → image arrives 600ms after HTML response → LCP = 2.4s
- With `preload fetchpriority="high"` in `<head>`: Browser fetches image immediately → image arrives 320ms after HTML → LCP = 1.1s (54% improvement)
- Result: Direct impact on Core Web Vitals score, potential SEO ranking benefit

**Google Fonts performance pattern:**
```html
<!-- ✅ Correct pattern — preconnect to BOTH Google Fonts origins -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">

<!-- Without preconnect: connection setup added ~100ms delay PER font file -->
```

**At Hruday's level (SAP Lighthouse Core Web Vitals project):**
In the SAP Lighthouse project targeting Core Web Vitals improvements, resource hints are a direct optimisation tool: preloading the SAP UI5 icon font (woff2) eliminates icon flash on initial render; preconnecting to SAP's BTP API gateway before the application bootstraps eliminates 120–150ms of connection overhead from the first API call. Prefetching the second screen's chunk on the landing page (80% of users navigate to it within the first click) reduces navigation latency by the full chunk download time.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "These three resource hints serve distinct purposes. `preload` is a high-priority instruction: 'fetch this resource now because this page needs it imminently' — it's for critical above-fold images (LCP candidates), self-hosted fonts (to prevent FOUT), and critical CSS. You must always specify the `as` attribute and must actually use the preloaded resource, or the browser warns you and you've wasted bandwidth. `prefetch` is the opposite priority: 'fetch this when idle because the user might navigate somewhere that needs it' — Next.js `<Link>` does this automatically on hover; you'd use it manually to pre-stage a lazy-loaded chunk the user will almost certainly need next. `preconnect` doesn't fetch a specific resource — it opens the DNS+TCP+TLS connection to an origin so when the first actual resource from that origin is requested, the connection cost is already paid. The typical candidates are your API origin, any font CDN, analytics scripts, and your asset CDN. In my Lighthouse project at SAP, preloading the icon font woff2 directly eliminated the icon FOUT, and preconnecting to the BTP API gateway cut 130ms off our first API call — both contributed measurable LCP improvements."

**Likely Follow-up Questions:**
1. What happens if you preload a resource but never use it? → Browser issues a console warning; the resource was fetched at high priority, wasting bandwidth; in Lighthouse audits it shows as an unused preload — remove it or fix the consumer reference
2. How does `fetchpriority` differ from `preload`? → `preload` changes WHEN the browser fetches (earlier in the waterfall); `fetchpriority` changes the PRIORITY of the fetch (high/low/auto within the existing timing); they are complementary — combine both for LCP image: `<link rel="preload" as="image" fetchpriority="high">`
3. Does `preconnect` work for HTTP/2 connections? → Yes — DNS + TCP + TLS cost applies equally to HTTP/2; the connection is multiplexed after setup
4. How does Next.js handle these under the hood? → `<Link>` components automatically add prefetch hints for linked pages during idle time; `next/image` with `priority` prop adds `<link rel="preload">` for LCP candidates; you can add manual hints via `next/head`

---

## 5. Code Example

```typescript
// Next.js App Router — comprehensive resource hints in layout
// app/layout.tsx

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* PRECONNECT — third-party origins — pay connection cost early */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.company.com" />
        
        {/* DNS-PREFETCH — lower-priority third parties */}
        <link rel="dns-prefetch" href="https://analytics.company.com" />
        
        {/* PRELOAD — critical above-fold resources */}
        <link
          rel="preload"
          href="/fonts/inter-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Google Fonts stylesheet */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

// app/page.tsx — Hero image with preload + fetchpriority
export default function HomePage() {
  return (
    <>
      {/* Next.js will hoist this preload to <head> */}
      <link rel="preload" as="image" href="/hero.webp" fetchPriority="high" />
      
      <main>
        <img
          src="/hero.webp"
          alt="Platform hero"
          fetchPriority="high"    // marks this as LCP candidate
          loading="eager"
          width={1200}
          height={600}
          decoding="async"
        />
        
        {/* Below-fold content — lazy load */}
        <img
          src="/feature-preview.webp"
          alt="Feature preview"
          loading="lazy"          // only fetch when entering viewport
          fetchPriority="low"
          width={800}
          height={400}
        />
      </main>
    </>
  );
}
```

---

## 6. Memory Aid

**Mental Model:** Think of ordering at a restaurant.
- `preconnect` = getting a table and being seated before you look at the menu (the connection is ready)
- `preload` = ordering your starter AS SOON as you sit down, before the waiter comes back (fetching early, you definitely want it)
- `prefetch` = asking them to have dessert menus ready in case you want them (speculative, low priority, maybe)

**Key sentence if you go blank:** "preload = this page needs it now; prefetch = next page might need it; preconnect = I'll talk to this server soon, open the line."

**Anti-pattern mnemonic:** **WARN** = preload Without A Resource Name (missing `as` attribute) or without a consumer = console warning + wasted bandwidth.

---

## 7. Why & How Summary

**Why it matters:**
→ UX: Resource hints directly improve LCP (preload hero image), eliminate FOUT (preload fonts), and reduce navigation latency (prefetch next page chunks)
→ Performance: preconnect saves 100–150ms per cold third-party connection; at scale (page loads × third-party connections × users) this is significant
→ Core Web Vitals: Proper use of preload + fetchpriority is one of the most reliable ways to improve LCP scores without changing page content or architecture

**How it works (3 sentences):**
Resource hints are `<link>` elements or HTTP header hints that communicate resource-loading intentions to the browser before it would normally discover those resources through HTML parsing, enabling the browser to start network work in parallel with page parsing. `preload` fetches a specific resource at high priority for use in the current page (requires `as` attribute specifying resource type); `prefetch` downloads a resource at idle-time priority for likely use in a future navigation; `preconnect` performs the three-way DNS + TCP + TLS handshake with an origin early so subsequent requests to that origin skip the connection setup cost entirely. These hints are complemented by `fetchpriority` (fine-tunes fetch priority within a resource category) and `dns-prefetch` (DNS-only, lighter alternative to `preconnect` for non-critical third parties).

**Company relevance:**
- Microsoft: Bing, Azure Portal, and MSN are highly optimised for Core Web Vitals; resource hint expertise is expected for front-end performance teams
- Adobe: Creative Cloud web apps ship large WOFF2 fonts and audio/video assets; preloading above-fold assets is standard practice on Adobe.com
- Salesforce: Trailhead and Help portal use aggressive prefetching for next-page resources (documented in their performance case studies)
- Cisco: Webex web app uses preconnect for WebSocket/media servers and API origins; reducing connection latency directly improves call setup time perception
