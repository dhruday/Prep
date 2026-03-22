# 63. Speculation Rules API ★

## 1. High-Level Explanation (Frontend Interview Level)

The **Speculation Rules API** is a modern browser API (Chrome 108+, Chromium-based) that enables **document-level prerendering and prefetching** of pages — not just resources — before the user navigates to them. Unlike `<link rel="prefetch">` which downloads and caches resources in a dormant state, the Speculation Rules API can **fully prerender an entire page** (parse HTML, run JavaScript, paint everything) in a hidden background tab, so when the user clicks a link, the navigation is nearly instantaneous (0–100ms vs 500–3000ms). It is the underlying technology behind Google's instant page loads from Search results. At senior level, Speculation Rules is understood as a high-risk/high-reward optimisation: prerendering is very fast for the user but computationally expensive for the browser and server, and must be applied with surgical precision using eager/moderate/conservative rules to avoid unnecessary server load and analytics inflation.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Speculation Rules vs Legacy Resource Hints

```
Evolution of navigation preloading:

1. <link rel="prefetch"> (2014)
   → Downloads page HTML as a resource into cache
   → Does NOT execute JavaScript, does NOT paint
   → On navigation: parses HTML, runs JS, paints from cache → saves network time only
   → Typical benefit: 200-500ms saved (network only)

2. <link rel="prerender"> (deprecated, Chrome 2012-2023)
   → Prerenderered the destination page in a hidden tab
   → Unreliable, could crash, had security concerns about side effects
   → Removed from Chrome in 2013-2018

3. Speculation Rules API (Chrome 108+, 2023+)
   → Specifies prefetch AND prerender rules as JSON in <script>
   → Prerender: runs a full page lifecycle — HTML parse + JS execute + CSS + paint — in a hidden BrowsingContext
   → On navigation: swap the hidden context to the main tab → near-instant navigation
   → Typical benefit: 500–3000ms saved (entire navigation round-trip)
```

### API Syntax

```html
<!-- Inline script tag in <head> or <body> -->
<script type="speculationrules">
{
  "prerender": [
    {
      "source": "list",
      "urls": ["/checkout", "/product/bestseller"],
      "eagerness": "moderate"
    }
  ],
  "prefetch": [
    {
      "source": "document",
      "where": {
        "and": [
          { "href_matches": "/*" },             
          { "not": { "href_matches": "/admin/*" } },
          { "not": { "selector_matches": "[data-no-prefetch]" } }
        ]
      },
      "eagerness": "conservative"
    }
  ]
}
</script>
```

### Eagerness Levels — The Core Configuration

`eagerness` controls when the browser speculates based on user intent signals:

| Eagerness | Trigger | Use Case |
|---|---|---|
| `"immediate"` | As soon as the rule is parsed — no user signal needed | Near-certain navigations: user is already on checkout step 1 → prerender checkout step 2 |
| `"eager"` | On any pointer interaction with a link | High-confidence next pages: primary CTA, main nav items |
| `"moderate"` | On hover with ≥200ms dwell (desktop), touch start (mobile) | Likely-next pages: related products, popular articles |
| `"conservative"` (default) | On mousedown or pointerdown for desktop, touchstart for mobile | Speculative but not confident — cast a wide net with low risk |

### prefetch vs prerender — When to Use Each

```
prefetch (cheaper):
  Cost: ~1 network request + parse HTML + minimal JS
  Benefit: Network round-trip eliminated → saves 200–800ms
  Risk: Low — just a cached document
  Use for: Pages where network latency is the bottleneck (slow connections); 
           many candidate pages; lower-confidence predictions

prerender (expensive):
  Cost: Full page lifecycle (HTML + JS + CSS + paint) in hidden BrowsingContext
  Benefit: Entire page load time eliminated → saves 500ms–3s+
  Risk: High — runs all JavaScript (analytics, side effects); higher memory/CPU on device
  Use for: High-confidence single next page; conversion-critical paths (checkout flow);
           pages known to be slow to load (heavy JS)
```

### Key Constraints and Gotchas

**1. Analytics double-counting prevention:**
Prerendered pages run Google Analytics and similar trackers. This inflates pageview counts. Mitigation:
- Use `document.prerendering` to detect prerender context
- Use the `prerenderingchange` event to fire analytics only on activation (actual navigation)

```javascript
// analytics.js — correct deferred analytics for prerendered pages
function trackPageview() {
  if (document.prerendering) {
    // Currently being prerendered — don't fire analytics yet
    document.addEventListener('prerenderingchange', () => {
      // Fires when prerendered page activates (user navigates to it)
      sendAnalytics({ event: 'pageview', page: location.pathname });
    }, { once: true });
  } else {
    // Normal navigation or already activated
    sendAnalytics({ event: 'pageview', page: location.pathname });
  }
}
```

**2. Side effects during prerender:**
Any JavaScript side effects that run during prerender (writes to localStorage, fires network requests with mutations, shows modals) must be guarded:

```javascript
// Guard all mutation side effects
if (!document.prerendering) {
  localStorage.setItem('last_visited', location.pathname);
  fetch('/api/track-visit', { method: 'POST' });  // mutation — only fire on real visit
}
```

**3. Prerender is limited to same-origin pages (without COOP/COEP headers):**
Cross-origin prerender requires the destination page to opt in via response headers:
```
Supports-Loading-Mode: credentialed-prerender
```

**4. Memory limits:**
Browsers limit concurrent prerenders (typically 2–5 concurrent prerender BrowsingContexts). Excess speculation rules are ignored or evicted.

**5. Not all pages can be prerendered:**
Pages that use `<iframe>` with non-trivial permissions, pages with Web Locks, or pages initiating camera/mic/geolocation access are automatically excluded from prerender.

### Programmatic Speculation Rules

```javascript
// Inject speculation rules dynamically based on user behaviour prediction
// (e.g., ML-based next-page prediction from your analytics)

function addSpeculationRules(urls, type = 'prefetch', eagerness = 'moderate') {
  // Check API support
  if (!HTMLScriptElement.supports?.('speculationrules')) return;
  
  const existingRules = document.querySelector('script[type="speculationrules"]');
  const rules = {
    [type]: [{
      source: 'list',
      urls,
      eagerness,
    }]
  };
  
  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify(rules);
  document.head.appendChild(script);
}

// Example: on product page, prerender checkout for high-intent users
// (user has added to cart — very high probability of navigating to checkout)
function onAddToCart(productId) {
  addSpeculationRules(['/checkout'], 'prerender', 'immediate');
}

// Example: prefetch popular next pages based on analytics data
const topNextPages = await fetchTopNextPages(currentPage);  // your analytics API
addSpeculationRules(topNextPages, 'prefetch', 'moderate');
```

### Performance Impact Data

Based on Chrome UX data reported in Google I/O 2023:
- Pages with prerender applied see **median LCP improvement of 1.2 seconds** compared to non-prerendered navigations
- Google Search instant results (powered by Speculation Rules) navigate in **<100ms** vs typical 1–3s cold navigation
- E-commerce checkout flow prerender reduces cart abandonment due to "loading" wait by **measurable percentage** (varies by site; Google reports 5–12% checkout completion improvement in test cohorts)

---

## 3. Real-World Examples

**Google Search:** The "Top Stories" carousel on mobile uses Speculation Rules to prerender the first result. When a user taps a search result, the page appears to load instantly because it has already been fully rendered in the background.

**Next.js integration:** Next.js 13.5+ automatically adds Speculation Rules for prefetching using the `<Link>` component's prefetch mechanism. The `experimental_ppr` feature may eventually integrate `prerender` rules for highest-priority routes.

**WordPress (plugin: Speculation Rules):** WordPress.org has an official Speculation Rules plugin that adds default prerender rules for all internal links with conservative eagerness.

**At Hruday's level (SAP Analytics):**
The SAP Analytics Cloud tab navigation (Explore → Story → Data Analyzer → Models) is a prime candidate for Speculation Rules. After a user lands on the Explore tab, prerendering the Story tab (the most common next navigation) would eliminate the 800ms–2s navigation delay caused by loading the Story JavaScript bundle plus data API calls. Implementing `prerender` with `"immediate"` eagerness on the primary CTA buttons aligns directly with the type of Core Web Vitals improvement Hruday's Lighthouse team was tasked with.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "The Speculation Rules API is Chrome's modern replacement for the old `<link rel="prerender">` — it lets you specify prefetch and prerender rules as JSON, where prerender means the browser fully executes an entire page — HTML, JavaScript, CSS, painting — in a hidden background browsing context. When the user actually clicks that link, the browser just swaps the prerendered context to the main tab, making the navigation feel instantaneous — under 100ms. It's how Google Search instant results work. The main differentiator from `<link rel="prefetch">` is that prefetch only downloads and caches the HTML, while prerender runs the complete page lifecycle. The trade-off is resource cost: prerendering is expensive in memory and CPU and runs all the page's JavaScript, including analytics — you need to guard analytics with `document.prerendering` checks and fire them on the `prerenderingchange` event instead of on load. The eagerness configuration controls when speculation triggers: 'immediate' for near-certain navigations (user just added to cart → prerender checkout), 'moderate' for hover-based intent, 'conservative' for broad speculative prefetch. In my SAP Lighthouse work, this pattern would have been applicable to the primary navigation between main Analytics Cloud modules."

**Likely Follow-up Questions:**
1. Does Speculation Rules work on Firefox/Safari? → Currently Chrome/Chromium only (Chrome 108+). Firefox and Safari have partial prefetch support but not Speculation Rules prerender. Always feature-detect before using.
2. How do you prevent analytics double-counting? → Check `document.prerendering === true` on page load; defer all analytics tracking to the `prerenderingchange` event, which fires only when the prerendered page becomes the active page
3. Can you prerender cross-origin pages? → Only with the destination's opt-in header: `Supports-Loading-Mode: credentialed-prerender`; same-origin prerenders work without special headers
4. How does this relate to Service Workers? → They're complementary: Service Worker intercepts the actual navigation request and can serve from cache; Speculation Rules starts the page render before the navigation. Used together → Service Worker serves cached assets, Speculation Rules eliminates the navigation latency

---

## 5. Code Example

```html
<!-- Complete Speculation Rules implementation for an e-commerce site -->
<!DOCTYPE html>
<html>
<head>
  <!-- Speculation rules — declared early to give browser maximum time -->
  <script type="speculationrules">
  {
    "prerender": [
      {
        "source": "list",
        "urls": ["/cart"],
        "eagerness": "moderate"
      }
    ],
    "prefetch": [
      {
        "source": "document",
        "where": {
          "and": [
            { "href_matches": "/products/*" },
            { "not": { "selector_matches": "[data-no-prefetch]" } },
            { "not": { "href_matches": "/products/*/admin" } }
          ]
        },
        "eagerness": "conservative"
      }
    ]
  }
  </script>

  <!-- Feature detection: dynamically add prerender for high-intent users -->
  <script>
    // After add-to-cart action: user is now very likely to navigate to /checkout
    document.addEventListener('cart:item-added', () => {
      if (!HTMLScriptElement.supports?.('speculationrules')) return;
      
      const checkoutPrerender = document.createElement('script');
      checkoutPrerender.type = 'speculationrules';
      checkoutPrerender.textContent = JSON.stringify({
        prerender: [{ source: 'list', urls: ['/checkout'], eagerness: 'immediate' }]
      });
      document.head.appendChild(checkoutPrerender);
    });
    
    // Analytics: handle prerendered page activation correctly
    function initAnalytics() {
      if (document.prerendering) {
        document.addEventListener('prerenderingchange', sendPageview, { once: true });
      } else {
        sendPageview();
      }
    }
    
    function sendPageview() {
      gtag('config', 'GA_ID', { page_path: location.pathname });
    }
    
    initAnalytics();
  </script>
</head>
<body>
  <a href="/cart">View Cart</a>
  <a href="/products/123" data-no-prefetch>Out of Stock Product</a>
</body>
</html>
```

---

## 6. Memory Aid

**Mental Model:** Speculation Rules is the browser equivalent of a **theatre with a false stage**. While the audience watches the current act, stagehands silently set up the next act behind a curtain. When the act ends, the curtain parts — the next scene is already fully assembled. The audience experience: instant scene transitions with no pause.

**Key sentence if you go blank:** "Speculation Rules prerender = full background page render (HTML + JS + paint) before navigation → near-instant perceived navigation when user clicks → guard analytics with `document.prerendering` check."

**Eagerness memory:** **IEMC** = Immediate (certain), Eager (likely), Moderate (hover intent), Conservative (any link — cast wide net).

---

## 7. Why & How Summary

**Why it matters:**
→ UX: Navigation latency is eliminated for pre-speculated pages — 0–100ms navigation vs 500–3000ms cold navigation; removes the most common "app feels slow" complaint from multi-page apps
→ Business: Google Search uses it for Top Results; e-commerce checkout prerender has documented conversion rate improvements; reducing perceived navigation latency increases session depth
→ Architecture: Complements SSG/ISR — even fast SSG pages have navigation latency; Speculation Rules eliminates that latency for high-confidence next pages

**How it works (3 sentences):**
The Speculation Rules API is declared as a JSON `<script type="speculationrules">` block specifying prefetch and/or prerender rules with eagerness levels that control when the browser triggers speculation based on user intent signals (hover, pointer-down, or immediate). For prerender rules, the browser creates a hidden BrowsingContext and executes the full page lifecycle — HTML parsing, JavaScript execution, CSS application, and layout/paint — so the prerendered page is pixel-ready; on actual navigation, the browser activates this hidden context as the main page, achieving near-zero navigation latency. Side effects (analytics, localStorage writes, mutation API calls) must be gated on `document.prerendering === false` or deferred to the `prerenderingchange` event to prevent analytics inflation and unintended mutations during the background prerender phase.

**Company relevance:**
- Microsoft: Bing search results use instant page loading; MSN and Microsoft News use speculative prerendering for article navigation — career opportunity for engineers who master this API
- Adobe: Adobe.com marketing pages and Behance project navigation — prefetching related projects on hover is an exact Speculation Rules use case
- Salesforce: Help documentation and Trailhead module navigation — high predictability of next-page navigation makes Speculation Rules high ROI
- Cisco: Webex developer portal and Cisco.com product navigation — multi-page marketing flows benefit from conservative prefetch rules across all internal links
