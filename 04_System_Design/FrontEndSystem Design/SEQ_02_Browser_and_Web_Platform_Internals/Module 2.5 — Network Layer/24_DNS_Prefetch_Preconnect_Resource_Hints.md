# Topic 31: DNS Prefetch, Preconnect & Resource Hints

---

## 1. High-Level Explanation

**Resource hints** are HTML link tags that instruct the browser to take preparatory actions for resources it will need soon — before they're requested normally. They reduce latency by amortising expensive operations (DNS resolution, TCP handshake, TLS negotiation, resource download) over the idle time before the browser naturally discovers a resource.

The four key hints: `dns-prefetch`, `preconnect`, `preload`, and `prefetch`.

---

## 2. Deep-Dive

### The Connection Establishment Cost

Before any resource can be fetched, the browser must:
1. **DNS lookup**: 20–120ms (resolve hostname → IP address)
2. **TCP handshake**: 1 RTT (~50–150ms on broadband)
3. **TLS negotiation**: 1–2 RTTs (~50–200ms for TLS 1.3)

Total cold connection cost: **120–470ms** before a single byte is downloaded. Resource hints eliminate this cost by doing the work early.

### `dns-prefetch` — The Cheapest Option

```html
<link rel="dns-prefetch" href="https://fonts.gstatic.com">
<link rel="dns-prefetch" href="https://analytics.third-party.com">
```

- **Does**: DNS lookup only — resolves hostname to IP
- **Cost**: Very low (DNS query, ~1ms callback stack, small cache entry)
- **Use case**: Third-party origins you'll eventually need but don't need immediately
- **Do NOT use** for your primary origin (browser already resolves it)

### `preconnect` — The Full Warm-Up

```html
<link rel="preconnect" href="https://api.yourapp.com">
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
```

- **Does**: DNS + TCP + TLS in one step — full connection ready to use
- **Cost**: Higher — consumes real TCP connections (limit: ~4 preconnects)
- **Use case**: Origins you'll definitely fetch from very soon (within ~10 seconds)
- **`crossorigin` attribute**: Required for font hosts — fonts use CORS anonymous mode

### `preload` — Fetch This Resource ASAP

```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/hero-image.jpg" as="image">
```

- **Does**: Fetches the resource at high priority into the browser cache
- **Critical**: Must specify `as` attribute — browser needs it to set correct request headers and priority
- **Use case**: Resources discovered late in the HTML but critical for render (fonts, above-fold images, late-loaded CSS)
- **Warning**: Unused preloads generate a browser console warning after 3 seconds — only preload what you use

### `prefetch` — Fetch for Future Navigation

```html
<link rel="prefetch" href="/next-page.js" as="script">
<link rel="prefetch" href="/about.html">
```

- **Does**: Fetches and caches at **low priority** for a future navigation
- **Timing**: Only fetches during browser idle time
- **Use case**: Next page resources in a multi-page flow (checkout step 2, onboarding step 3)
- **Scope**: Resource persists in prefetch cache between navigations (unlike regular cache)

### `modulepreload` — ES Module Preloading

```html
<link rel="modulepreload" href="/modules/app.js">
<link rel="modulepreload" href="/modules/utils.js">
```

- **Does**: Preloads AND parses a JavaScript module (including its dependencies)
- **Advantage over `preload` for modules**: Also resolves/parses the module graph
- **Use case**: Critical app modules in a module-based architecture

---

## 3. Real-World Examples

### Hruday's SAP Performance Win

At SAP Labs, the analytics dashboard loaded fonts from `fonts.gstatic.com` and API data from `api.sap-analytics.cloud`. Adding preconnect hints eliminated ~380ms of cold connection cost per page load:

```html
<!-- Added to <head> of index.html -->
<link rel="preconnect" href="https://api.sap-analytics.cloud">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="dns-prefetch" href="https://telemetry.sap-ux.cloud">
```

LCP improved by ~340ms for first-time visitors (warm connections on return visits already cached).

### Next.js / Angular SSR Implementation

In Next.js, `<Head>` accepts link tags. In Angular Universal, add preconnect hints to `index.html`. In both cases, ensure hints are in the `<head>` before the first `<link rel="stylesheet">` for maximum effect.

---

## 4. Interview-Oriented Answer

**Q: "What's the difference between preconnect and preload? When would you use each?"**

> **`preconnect`** does the DNS + TCP + TLS handshake early for a given origin. It doesn't fetch any resource — it just warms up the connection. Use it for origins you'll definitely talk to within the next few seconds (your API server, a font CDN). Limit to ~4 preconnects — each consumes a real TCP connection.
>
> **`preload`** actually fetches a specific resource at high priority. Use it for resources the browser would otherwise discover late — fonts embedded in CSS (brain teasers only discovered after CSS is parsed), above-fold images in a responsive image, or a JavaScript module that's dynamically imported but is always loaded.
>
> At SAP, we added `preconnect` for our API origin and font CDN, measured a ~340ms LCP improvement, and tracked it in our performance budget CI check. The caution: unused `preload` tags cause browser warnings — only preload what's on the critical path.

---

## 5. Code Example

```typescript
// Performance-aware resource hint injection utility
// Used in SSR (Next.js / Angular Universal) to inject hints dynamically

interface ResourceHint {
  type: 'preconnect' | 'dns-prefetch' | 'preload' | 'prefetch' | 'modulepreload';
  href: string;
  as?: string;
  crossOrigin?: boolean;
  type_attr?: string;  // for font mime type
}

function injectResourceHints(hints: ResourceHint[]): void {
  const head = document.head;
  
  hints.forEach(hint => {
    // Avoid duplicates
    const existing = head.querySelector(`link[rel="${hint.type}"][href="${hint.href}"]`);
    if (existing) return;
    
    const link = document.createElement('link');
    link.rel = hint.type;
    link.href = hint.href;
    if (hint.as) link.setAttribute('as', hint.as);
    if (hint.crossOrigin) link.crossOrigin = 'anonymous';
    if (hint.type_attr) link.setAttribute('type', hint.type_attr);
    
    // Preconnect/dns-prefetch: insert before first stylesheet for max benefit
    if (hint.type === 'preconnect' || hint.type === 'dns-prefetch') {
      const firstStyle = head.querySelector('link[rel="stylesheet"]');
      head.insertBefore(link, firstStyle || null);
    } else {
      head.appendChild(link);
    }
  });
}

// Usage
injectResourceHints([
  // Critical: API origin — full warm-up
  { type: 'preconnect', href: 'https://api.yourapp.com' },
  
  // Critical: Font CDN — needs crossorigin for CORS font requests
  { type: 'preconnect', href: 'https://fonts.googleapis.com', crossOrigin: true },
  
  // Non-critical: Analytics — dns only (we'll connect eventually)
  { type: 'dns-prefetch', href: 'https://analytics.third-party.com' },
  
  // Preload the hero image for above-the-fold LCP
  { type: 'preload', href: '/images/hero.webp', as: 'image' },
  
  // Preload the inter font (avoid FOUT)
  { type: 'preload', href: '/fonts/inter-v13-latin-700.woff2', 
    as: 'font', crossOrigin: true, type_attr: 'font/woff2' },
]);

// Route-based prefetch — prefetch next page's JS on hover
function prefetchRoute(routePath: string): void {
  const href = `/_next/static/chunks/${routePath}.js`; // Next.js pattern
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = 'script';
  document.head.appendChild(link);
}

// Trigger on nav link hover
['#about-link', '#contact-link'].forEach(id => {
  const el = document.querySelector(id);
  el?.addEventListener('mouseenter', () => prefetchRoute(id.replace('#','')), { once: true });
});
```

---

## 6. Memory Aid

**"DNS-Pre-Pre-Pre" ladder (cheapest → most powerful):**

1. `dns-prefetch` → Only DNS (hostname → IP) — cheapest, use for all third parties
2. `preconnect` → DNS + TCP + TLS — medium cost, use for critical origins (~4 max)
3. `preload` → Actually fetches the resource — use for critical path resources
4. `prefetch` → Fetches at low priority for future navigations — next page resources

**The key rule**: `preload` = **this page**, `prefetch` = **next page**

---

## 7. Why & How Summary

**Why resource hints matter:**
- Cold connection: ~120–470ms before first byte arrives
- Font FOUT (Flash of Unstyled Text) caused by late font discovery
- LCP images discovered only after JS parses and injects `<img>` tags
- Resource hints eliminate this by parallelising preparation

**How they work:**
- Browser reads `<head>` on parse
- Resource hint tags trigger async background work
- By the time JS requests the resource, connection/data is already available

**Production checklist:**
- Preconnect your API origin and font CDN
- DNS-prefetch analytics and third-party origins
- Preload hero images and critical fonts
- Prefetch assets for likely-next-visited routes
- Verify with Chrome DevTools Network tab — check for unused preloads (console warning)
