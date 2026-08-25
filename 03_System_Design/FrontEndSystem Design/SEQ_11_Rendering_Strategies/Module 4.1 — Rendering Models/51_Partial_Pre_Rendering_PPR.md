# 51. Partial Pre-Rendering (PPR) ★

## 1. High-Level Explanation (Frontend Interview Level)

**Partial Pre-Rendering (PPR)** is a Next.js 14+ rendering model that allows a single route to combine **static pre-rendering** (for the shell and content that never changes per request) with **dynamic streaming** (for personalised or data-dependent content) — within the same HTML response. The outer shell (header, sidebar, static hero) is pre-rendered at build time as a static HTML with `<Suspense>` fallback placeholders; at request time, the dynamic sections (user greeting, personalised recommendations, cart count) stream in behind those placeholders via **React Server Components and Suspense streaming**. PPR eliminates the historic all-or-nothing choice between SSG (full page cached at build) and SSR (full page server-rendered per request): you now get the best of both — instant static shell delivery from CDN edge + dynamic content via streaming.

**Key Principle:** PPR is not a new rendering model conceptually — it is what you get when you compositionally combine React Suspense, React Server Components, and Next.js's static/dynamic segment detection in a way that the framework can split a single page's content at build time into a static "outer" and a dynamic "inner."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### How PPR Works — Under the Hood

```
Traditional rendering choices (pre-PPR):
  SSG:  entire page cached at build → instant TTFB, no personalisation
  SSR:  entire page rendered per request → personalisation, but slow TTFB (~200–500ms)
  ISR:  page cached, periodically revalidated → good for most cases, still all-or-nothing

PPR (Next.js 14+):
  ┌──────────────────────────────────────────────────────┐
  │ STATIC SHELL (pre-generated at build, served from CDN) │
  │  <header>  [static]                                    │
  │  <nav>     [static]                                    │
  │  <main>                                                │
  │    ----[Suspense fallback]----                         │  ← dynamic section placeholder
  │                                                        │
  │  <footer>  [static]                                    │
  └──────────────────────────────────────────────────────┘
                         ↓ request hits server
  ┌──────────────────────────────────────────────────────┐
  │ DYNAMIC CONTENT streams into placeholder             │
  │  User: "Welcome back, Hruday" [from DB/session]      │
  │  Cart: 3 items [from Redis]                          │
  │  Recommendations: [ML service result]                │
  └──────────────────────────────────────────────────────┘
```

### Next.js PPR Implementation

```typescript
// next.config.js — enable PPR (experimental in Next.js 14)
const nextConfig = {
  experimental: {
    ppr: true,      // enables Partial Pre-Rendering
  },
};

// app/dashboard/page.tsx — PPR route
// The outer component is fully static (no cookies, no request headers, no DB calls)
// Dynamic parts are wrapped in Suspense with fallbacks

import { Suspense } from 'react';
import { WelcomeBanner } from './WelcomeBanner';    // dynamic — reads cookies
import { CartCount } from './CartCount';             // dynamic — reads session
import { Recommendations } from './Recommendations'; // dynamic — DB query
import { StaticHero } from './StaticHero';           // static — no data deps

// Static components import inline  —  no async, no dynamic APIs
function StaticHeader() {
  return (
    <header>
      <Logo />
      <PrimaryNavigation />
      {/* Cart count is dynamic — wrap in Suspense */}
      <Suspense fallback={<CartPlaceholder />}>
        <CartCount />   {/* async RSC — reads session */}
      </Suspense>
    </header>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <StaticHeader />  {/* partially static — header itself is static, CartCount streams */}
      
      {/* Fully static hero */}
      <StaticHero />
      
      {/* Dynamic content — streams after static shell is sent */}
      <Suspense fallback={<WelcomeSkeletonLoader />}>
        <WelcomeBanner />              {/* reads cookies → personalised greeting */}
      </Suspense>
      
      <Suspense fallback={<RecommendationSkeleton />}>
        <Recommendations />             {/* ML service call → personalised items */}
      </Suspense>
    </div>
  );
}
```

### How Next.js Differentiates Static vs Dynamic at Build Time

Next.js statically analyses the component tree during build. A component becomes **dynamic** when it uses:
- `cookies()` — reads HTTP cookies
- `headers()` — reads HTTP request headers
- `searchParams` — reads URL query parameters (in page.tsx, not layout.tsx)
- `unstable_noStore()` — explicitly opt out of caching
- Any uncached `fetch()` call (unless `force-cache` is used)

Components that don't use any of these are **statically renderable** and get pre-rendered at build time. `Suspense` boundaries act as split points — everything outside a Suspense boundary that is statically renderable becomes part of the static shell.

### PPR vs Other Rendering Strategies — Precise Comparison

```
                  TTFB    Personalised   CDN Cacheable   Complexity
SSG (getStaticProps / no deps)
                  ~5ms    No             Yes             Low
ISR               ~5ms    No             Yes             Low
CSR               ~5ms    Yes            Yes             Medium (client-only)
SSR               ~300ms  Yes            No              Medium
Streaming SSR     ~50ms   Yes            No              Medium
PPR               ~5ms    Yes            Yes (shell)     Medium-High
```

PPR gives TTFB of SSG (static shell from CDN) + personalisation of SSR (dynamic content streams) — it is strictly better than SSR for most use cases, but requires restructuring your component tree to separate static and dynamic boundaries.

### Performance Implications

**PPR performance model:**
1. **Initial HTML** (static shell): Served from CDN edge in ~5–10ms → matches SSG speed for TTFB and LCP (if static hero is above the fold)
2. **Suspense fallback**: Skeleton loaders for dynamic regions shown immediately — user sees content structure instantly
3. **Dynamic content streaming**: Streams from the origin server as each Suspense boundary resolves — typically 50–200ms later
4. **No full-page server wait**: Unlike SSR, user doesn't wait 300ms for the entire page; they get the progressive rendering experience

**Key PPR win: LCP on pages with personalisation.** Previously, SSR pages had high LCP because the static hero couldn't serve from edge cache. With PPR, the hero and above-fold content pre-render statically → served from CDN → LCP is now consistently <1s even on personalised pages.

### Limitations & When NOT to Use PPR

1. **Highly dynamic pages (real-time data):** A live stock ticker or live chat window — the entire page content changes per request → PPR provides no benefit over Streaming SSR, adds complexity
2. **Pages requiring request-level context for the entire layout:** If the sidebar must show different nav items based on user role and the sidebar is used in 100% of the page area — no stable static outer shell exists
3. **Requires Next.js 14+ and App Router:** Not available in Pages Router; migrating older Next.js apps requires App Router migration first
4. **Over-fetching in dynamic components:** Dynamic components in Suspense boundaries should fetch only the data they need; avoid waterfall fetches inside dynamic components

---

## 3. Real-World Examples

**Vercel (Next.js creators):** Vercel's own dashboard uses PPR on their project overview pages — the static shell (project list structure) serves from Vercel's edge network while deployment status badges stream in from the API

**E-commerce (industry pattern):** Product listing pages → static grid skeleton + static header served from CDN; personalised "Recently Viewed," "Recommended for You" sections stream in from personalisation services. This pattern converts PPR into direct business value: lower bounce rates from faster perceived load, maintained personalisation

**At Hruday's level (SAP Lighthouse):** SAP BTP Cockpit or similar enterprise dashboards would benefit from PPR — the shell navigation and page structure are stable and can be statically pre-rendered; user-specific system status, notifications, and personalised quick actions can stream in from the API layer afterward. This pattern directly targets the Core Web Vitals improvements Hruday worked on in the Lighthouse project.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "Partial Pre-Rendering is Next.js 14's answer to the long-standing tension between SSG — fast but no personalisation — and SSR — personalised but slow. With PPR, you pre-render the static shell of the page at build time as cacheable HTML with Suspense fallback placeholders, serve it from the CDN edge instantly, then stream the dynamic personalised content into those placeholders from the origin server. The key mechanism is React Suspense boundaries as split points — components outside Suspense that don't use cookies, headers, or uncached fetches will be statically rendered; components inside Suspense that do use those APIs will stream. For performance, this is a significant win: TTFB matches SSG because the shell comes from CDN, but the user still gets personalised content. The biggest constraint is that it requires restructuring your component tree to make the outer shell genuinely static — which isn't always possible; if your header renders 100% dynamic content, there's no static shell to cache."

**Likely Follow-up Questions:**
1. How does PPR differ from Streaming SSR? → Streaming SSR streams the entire page from the origin on every request (no CDN caching); PPR pre-renders the static parts at build time so they serve from CDN (no origin hit for the shell), only the dynamic Suspense boundaries stream from origin
2. What makes a component "static" vs "dynamic" in Next.js PPR? → Static = no cookies(), headers(), searchParams, or uncached fetch(); dynamic = any use of request-time data
3. Are Suspense fallbacks part of the static pre-render? → Yes — the static shell includes the skeleton/fallback HTML for Suspense boundaries; the browser shows skeletons immediately while waiting for dynamic content to stream
4. Is PPR production-ready as of 2024? → Still experimental in Next.js 14; stable in Next.js 15; evaluate for production use based on your Next.js version and appetite for experimental APIs

---

## 5. Code Example

```typescript
// next.config.ts — enable PPR
export default {
  experimental: { ppr: 'incremental' }, // 'incremental' = opt-in per route
};

// app/shop/page.tsx — E-commerce product page with PPR
import { Suspense } from 'react';
import { ProductGrid } from './_components/ProductGrid';        // static — pre-rendered
import { PersonalisedBanner } from './_components/Banner';     // dynamic — reads cookies
import { RecentlyViewed } from './_components/RecentlyViewed'; // dynamic — DB query
import { CartIcon } from './_components/CartIcon';             // dynamic — reads session

// Opt this route into PPR
export const experimental_ppr = true;

export default async function ShopPage() {
  return (
    <div>
      <header>
        <ShopLogo />                            {/* static */}
        <SearchBar />                           {/* static */}
        <Suspense fallback={<CartSkeleton />}>
          <CartIcon />                          {/* dynamic — streams in */}
        </Suspense>
      </header>

      {/* Static promotional banner — pre-rendered at build time */}
      <StaticPromoBanner campaignId="summer-2024" />

      {/* Personalised banner — streams from origin */}
      <Suspense fallback={<BannerSkeleton />}>
        <PersonalisedBanner />
      </Suspense>

      {/* Product grid is static — rendered at build with all products */}
      <ProductGrid />

      {/* Recently viewed — personalised, streams in */}
      <Suspense fallback={<RecentlyViewedSkeleton />}>
        <RecentlyViewed />
      </Suspense>
    </div>
  );
}

// PersonalisedBanner.tsx — async RSC with dynamic data
async function PersonalisedBanner() {
  const cookieStore = cookies(); // marks this component as dynamic
  const userId = cookieStore.get('userId')?.value;
  
  if (!userId) return <DefaultBanner />;
  
  const offer = await fetchPersonalisedOffer(userId); // server-side fetch
  return <OfferBanner offer={offer} />;
}
```

---

## 6. Memory Aid

**Mental Model:** PPR is like a **newspaper front page**. The newspaper structure (columns, headers, section dividers) is printed once (static shell). The personalised "Welcome, Hruday — here are your local stories" section arrives in a separate insert (streams in from server). The reader gets the paper structure immediately; the personalised content fills in moments later.

**Key sentence if you go blank:** "PPR = static CDN-cached shell with Suspense placeholders + dynamic personalised content streams into those placeholders from origin — best of SSG speed and SSR personalisation."

**Mnemonic:** **S-S-D** — Static shell from CDN, Suspense boundary is the split point, Dynamic content streams.

---

## 7. Why & How Summary

**Why it matters:**
→ UX: Combines SSG's fast TTFB/LCP (static shell from CDN) with SSR's personalisation capability in one page — eliminates the historic trade-off
→ Performance: Pushes LCP scores for personalised pages from SSR range (>1s) to SSG range (<1s) by serving above-fold static content from CDN edge
→ Business: Faster LCP for e-commerce pages directly correlates with higher conversion rates; for enterprise dashboards it improves perceived performance for complex personalised views

**How it works (3 sentences):**
At build time, Next.js statically analyses the component tree for each PPR route and pre-renders all components that don't use request-time APIs (cookies, headers, uncached fetches) into a static HTML shell with Suspense boundary placeholders embedded in the HTML. At request time, this static shell is served instantly from CDN edge while a concurrent server request streams the dynamic Suspense boundary content (personalised data, user-specific state) as it resolves. The browser progressively paints the page — the static shell appears at CDN speed, Suspense fallback skeletons fill the dynamic placeholders immediately, then the real dynamic content replaces the skeletons as the streaming response completes.

**Company relevance:**
- Microsoft: Azure Portal and Microsoft 365 apps have personalised dashboards with stable structural shells — PPR is the ideal rendering model when they migrate to Next.js App Router
- Adobe: Creative Cloud and Experience Cloud dashboards — static product listing shells + personalised tool recommendations — direct PPR use case
- Salesforce: Trailhead and Analytics dashboards with personalised content — PPR reduces server load while maintaining personalised UX
- Cisco: Webex analytics dashboards — meeting history and analytics are dynamic; navigation shell is stable — ideal PPR topology
