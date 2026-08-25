# SPA vs SSR vs SSG — Trade-offs
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **SPA (Single Page Application)**: the browser downloads a mostly-empty HTML file + a JavaScript bundle; React/Angular runs in the browser, fetches data from APIs, and builds the DOM client-side; first page load is slow until JavaScript runs, but subsequent navigation is instant (no full page reload)
- **SSR (Server-Side Rendering)**: the server renders the HTML for each request and sends a full, content-filled page; the browser shows content immediately (fast First Contentful Paint); then React "hydrates" the HTML — attaches event handlers without re-rendering; ideal for SEO-critical, public-facing pages where first load speed matters
- **SSG (Static Site Generation)**: HTML is built at deploy time, not request time; the pre-built files are served from a CDN with no server computation per request; instant loads globally, zero backend needed; ideal for content that doesn't change per-user and doesn't change often (blog, docs, marketing pages)
- **ISR (Incremental Static Regeneration)**: Next.js feature that regenerates specific static pages in the background at a configured interval (e.g., every 60 seconds); you get SSG performance with SSR freshness — the hit that triggers regeneration sees a slightly stale page, the next hit sees the fresh one
- **The decision rule**: internal tools and dashboards → SPA; public marketing / content pages → SSG; product pages with live inventory/price → SSR or ISR; user-personalized authenticated pages → SSR or SPA after hydration
- ✅ **Hruday's anchor**: built React SPAs at SAP (micro-frontend architecture); SSR/SSG knowledge from React performance and Next.js context awareness

---

## 1. One-Line Definition
SPA renders UI entirely in the browser using JavaScript; SSR renders HTML on the server for each HTTP request and ships ready-to-display content; SSG pre-renders HTML at build time and serves static files from a CDN — and the right choice depends on who visits, what they see, and how often the content changes.

---

## 2. The Problem It Solves

In 2015, SPAs were the answer to everything. Server-rendered pages with full page reloads felt slow after a user had spent time in Gmail or Google Maps. SPAs gave web apps app-like instant navigation. The trade-off was invisible: the first page load was slow (download 500KB of JavaScript, parse it, execute it, THEN render) and search engine crawlers saw an empty HTML shell, killing SEO. For internal dashboards used by logged-in employees, neither of those mattered. For a Swiggy public restaurant listing page, SEO and first-load speed were critical — SPAs failed both.

SSR brought back server-rendered HTML — but now React still ran in the browser to make the page interactive. You got fast first paint (browser shows content from the HTML immediately) AND rich interactivity (React takes over after hydration). The trade-off: every page request hits your server, compute costs scale with traffic, infrastructure is more complex.

SSG is the best performance story: HTML built once at deploy time, served from CDN edges globally, sub-100ms loads anywhere in the world. The trade-off: only works for content that is the same for every user and doesn't change frequently. A blog post — perfect for SSG. A personalised user dashboard — not possible with SSG.

Modern frameworks (Next.js, Nuxt, SvelteKit) let you mix all three within one application: static marketing pages as SSG, product detail pages as ISR, user account pages as SSR or CSR after login.

---

## 3. How It Works Internally

### SPA Rendering Flow

```
User visits https://app.mycompany.com/dashboard

Browser:
  1. GET / → Server returns: <html><body><div id="root"></div>
                              <script src="app.bundle.js"></script></body></html>
  2. Downloads app.bundle.js (500KB-2MB) ← this is the slow part
  3. Parses and executes JavaScript
  4. React mounts, calls API: GET /api/dashboard-data
  5. Receives JSON, renders the dashboard HTML
  6. User sees content  ← ~2-5 seconds after initial request
  
Navigation within SPA:
  User clicks "Orders" link
  → React Router intercepts, pushes to history
  → Route component renders (data may already be cached)
  → No page reload, instant  ← this is the SPA advantage
  
Search engine bot visits:
  1. GET / → receives empty HTML with no content
  2. Some bots execute JavaScript (Googlebot does), some don't
  3. Dynamic rendering may be needed for non-JS crawlers
  → SEO requires extra effort (sitemap, prerendering service, or SSR)
```

### SSR Rendering Flow (Next.js `getServerSideProps`)

```
User visits https://swiggy.com/restaurants/biryani-palace

Next.js Server (runs on your infrastructure):
  1. Receives GET request
  2. Executes getServerSideProps:
     → Queries restaurant DB for biryani-palace data
     → Fetches live menu availability
     → Fetches current average delivery time
  3. Renders React component tree to HTML string (server-side)
  4. Returns: fully formed HTML with restaurant name, images, menu
     Content is visible in the HTML source instantly
  
Browser:
  1. Receives HTML — paints content immediately (fast LCP)
  2. Downloads the React JavaScript bundle (same size as SPA)
  3. React "hydrates" — connects event handlers to the server-rendered HTML
     WITHOUT re-rendering (no flash of invisible content)
  4. Page is now interactive
  
Time-to-content: ~300ms (server render) vs 2-3s (SPA)
SEO: crawler sees complete content in HTML ← Googlebot indexes correctly

Cost: EVERY request triggers server render, DB queries, API calls
     At 1M page views/day → server infrastructure cost vs CDN cost of SSG
```

### SSG Rendering Flow (Next.js with no data fetching / `getStaticProps`)

```
Build time (in CI pipeline, once per deploy):
  Next.js runs `next build`
  For each static page:
    → Executes getStaticProps (if any)
    → Renders React component to HTML
    → Saves as .html file in output directory
  Output: 200.html, about.html, blog/post-1.html, ...

Deploy:
  Upload all .html files to CDN (CloudFront, Vercel, Netlify)
  
User visits https://myapp.com/blog/react-tutorial:
  CDN edge node (nearest to user) serves blog/react-tutorial.html
  Zero server needed, zero compute → sub-100ms globally
  Browser receives full HTML → instant paint
  React hydrates for interactivity

Trade-off:
  Content changes require a full rebuild and redeploy
  A 10,000-page blog → 10,000 HTML files → build takes 30 minutes
  Solved by ISR: regenerate individual pages without a full rebuild

ISR (Incremental Static Regeneration):
  export async function getStaticProps() {
    return {
      props: { menu: await fetchMenu() },
      revalidate: 60,   // Rebuild this specific page every 60 seconds
    };
  }
  
  First user in that 60s window: served stale static HTML (CDN)
  Revalidation triggered in background: Next.js reruns getStaticProps
  Next user: served fresh HTML (still from CDN, no server compute at render time)
```

---

## 4. The Code

### Wrong Way — SPA for a Public Product Page
```tsx
// ❌ WRONG — product page as a pure client-rendered SPA component
// This is fine for internal apps, terrible for public landing pages

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ❌ Data fetched after JavaScript runs — user sees blank page during fetch
  // ❌ Search engine crawlers see <div id="root"></div> before React hydrates
  // ❌ Share on WhatsApp/Twitter: no og:title or og:image in HTML — poor preview
  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(data => {
        setProduct(data);
        setIsLoading(false);
      });
  }, [id]);
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.price}</p>
    </div>
  );
}
// Problem: LCP (Largest Contentful Paint) is delayed by JavaScript + API round trip
// Google's Core Web Vitals scores suffer → lower search ranking
```

> **Why this fails:** A public product page served as a pure SPA means search engine bots see an empty HTML body until JavaScript executes. Google's Lighthouse score will flag poor LCP because the product heading (the largest content element) doesn't paint until the JavaScript bundle downloads and the API responds. Social media link previews get no Open Graph metadata. Users on slow connections wait 3-5 seconds for any content.

### Right Way — Next.js SSR/SSG for the Right Pages
```tsx
// ✅ RIGHT — Next.js App Router with appropriate rendering per page type

// app/products/[id]/page.tsx — SERVER COMPONENT (runs on server, zero JS to client)
// This file exists only on the server: no useEffect, no useState, no hooks

interface PageProps {
  params: { id: string };
}

// generateMetadata runs on server — Open Graph, SEO tags in HTML head
export async function generateMetadata({ params }: PageProps) {
  const product = await getProduct(params.id);
  
  return {
    title: `${product.name} — Buy Online | MyShop`,
    description: product.shortDescription,
    openGraph: {
      title: product.name,
      images: [{ url: product.imageUrl, width: 800, height: 600 }],
    },
  };
}

// This is the page component — runs on server, returns HTML
export default async function ProductPage({ params }: PageProps) {
  // Direct DB/API call on the server — no loading state, no useEffect
  // Data is ready before the page HTML is sent to the browser
  const product = await getProduct(params.id);   // server-side DB query
  const reviews  = await getReviews(params.id);  // parallel fetch (use Promise.all in real code)
  
  // ProductPageContent is a Server Component — no JS shipped for this part
  // ProductAddToCart is a Client Component (marked with 'use client') — it handles onClick
  return (
    <main>
      <ProductDetails product={product} />           {/* Server Component */}
      <ProductReviews reviews={reviews} />           {/* Server Component */}
      <ProductAddToCart productId={params.id} />     {/* Client Component: needs click handler */}
    </main>
  );
}

// Note: no 'use client' directive = Server Component
// All data fetching happens on server
// HTML arrives at browser with full product content
// Google sees: <h1>iPhone 15 Pro</h1> with price, description, images in HTML
```

```tsx
// app/products/[id]/add-to-cart.tsx — CLIENT COMPONENT (explicit)
'use client';  // This directive makes it a Client Component — runs in the browser

import { useState } from 'react';
import { addToCart } from '@/actions/cart';  // Server Action — runs on server on submit

interface ProductAddToCartProps {
  productId: string;
}

export function ProductAddToCart({ productId }: ProductAddToCartProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  const handleAddToCart = async () => {
    setIsAdding(true);
    await addToCart(productId);   // Calls server action — no API route needed
    setIsAdding(false);
  };
  
  return (
    <button onClick={handleAddToCart} disabled={isAdding}>
      {isAdding ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

```tsx
// When to use SSG (static generation) — blog/docs/marketing
// app/blog/[slug]/page.tsx

// generateStaticParams tells Next.js which slugs to pre-render at build time
export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
  // Next.js generates /blog/react-tutorial.html, /blog/typescript-tips.html, etc.
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug);  // Runs ONCE at build time
  return <BlogPostContent post={post} />;
}
// No server needed at runtime — pure CDN HTML serving
```

```tsx
// Dashboard page — SPA style (client-side only, after login)
// For pages behind auth that are personalized per user — SSR isn't needed
// (server can't pre-render user-specific content efficiently for SSG;
//  SSR works but a hybrid approach is often used)

// app/dashboard/page.tsx
'use client';

// For authenticated dashboards, client-side data fetching with TanStack Query is fine:
// The page itself can be a lightweight shell (fast server-render of skeleton/layout)
// with data populated client-side after auth validation
export default function DashboardPage() {
  const { data: user } = useCurrentUser();   // TanStack Query, checks auth
  const { data: metrics } = useDashboardMetrics();
  
  return (
    <DashboardLayout user={user}>
      <MetricsGrid metrics={metrics} isLoading={!metrics} />
    </DashboardLayout>
  );
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you choose SSR over SSG for a page?"

**Hruday's answer:**
> I use SSG when the page content is the same for every visitor and doesn't change more frequently than my deploy cycle. A blog post, a documentation page, a marketing landing page — these are perfect for SSG. The HTML is built once, served from a CDN edge globally, and loads in under 100 milliseconds anywhere in the world. No server needed at runtime.
>
> I use SSR when the content is dynamic on each request. A restaurant page on Swiggy showing live delivery time, current stock, and today's offers — that data changes every few minutes. I can't pre-build it. I use ISR with a 60-second revalidation if slight staleness is acceptable: the page rebuilds in the background every minute and users get CDN-speed loads with near-real-time data.
>
> I use SSR without caching for content that is personalised per user: the user's order history page, their account settings, their specific cart state. SSG can't pre-build per-user content, and ISR doesn't help when every user has a different page. Here I render on the server per request, using the authentication cookie to fetch the right user's data and render their personalised HTML before sending it.
>
> The meta-rule: content changes → SSR or ISR. Content is personalised → SSR. Content is static → SSG.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is hydration and what can go wrong with it?"

**Hruday's answer:**
> Hydration is the process where React in the browser takes the HTML the server rendered and connects event handlers and React's component state to it, WITHOUT re-rendering the DOM from scratch. The browser already has the visual content from the server-rendered HTML — hydration makes it interactive.
>
> React walks the server-rendered DOM and the React component tree simultaneously, matching them up. For every interactive component — a button with an `onClick`, an input with `onChange`, a component with `useState` — React attaches the matching event handlers to the existing DOM nodes. No DOM nodes are destroyed or recreated; only event listeners are attached.
>
> What can go wrong: hydration mismatch. If the HTML React renders on the server doesn't exactly match what React would render in the browser, you get a hydration error. Common causes:
>
> First: `Math.random()` or `Date.now()` in a component — these produce different values on server and client, so the rendered HTML differs. Solution: pass values as props rather than computing them inside the component.
>
> Second: code that reads browser-only globals (`window`, `localStorage`, `navigator`) during render — these don't exist on the server. Solution: read them in `useEffect` (which only runs in the browser) or use `typeof window !== 'undefined'` guards.
>
> Third: certain React patterns in SSR frameworks — using a library that assumes browser globals during SSR. Solution: dynamic import with `ssr: false` in Next.js to skip that component during server rendering.
>
> The symptom is a console warning: "Hydration failed because the initial UI does not match what was rendered on the server." It degrades performance because React has to do extra work reconciling the mismatch.

---

### Q3 — Trade-Off
**Interviewer asks:** "What are the infrastructure trade-offs between a pure SPA deployment and a Next.js SSR deployment?"

**Hruday's answer:**
> A pure SPA is the simplest infrastructure story: build the JavaScript bundle, upload the static files to S3 (or any CDN), serve with CloudFront. Zero backend servers needed for serving the app itself. Scaling is automatic — CDN handles billions of requests without any infrastructure management. The monthly cost for serving even the most popular SPA is single-digit dollars.
>
> Next.js with SSR requires a Node.js server running for every deployment environment. On Vercel or AWS Lambda, this is abstracted — you don't provision servers, but each page request triggers server-side execution. At scale, this means compute costs and latency considerations that a static SPA doesn't have. If your product page gets 10 million views per day, that's 10 million Node.js executions (or Lambda invocations) vs 10 million CDN cache hits.
>
> The mitigation: caching at every level. For SSR pages where content changes infrequently, a `Cache-Control: s-maxage=60` header tells CDN to cache the server-rendered HTML for 60 seconds — only 1 server execution per 60 seconds per CDN node, not one per user. For truly static SSG pages, there's nothing to mitigate — no server involved.
>
> My recommendation: use Next.js because the ability to choose per-page rendering strategy is more valuable than the infrastructure simplicity of a pure SPA. But be deliberate — SSG everything that can be SSG, add ISR revalidation to reduce SSR frequency, and use full SSR only for content that genuinely requires it.

---

### Q4 — Scenario
**Interviewer asks:** "Design the rendering strategy for a Meesho-style product marketplace — product listings, product detail pages, user cart, order history."

**Hruday's answer:**
> I'd apply different strategies by page type.
>
> Product listing pages (`/sarees`, `/kurtis`) with filters: ISR with 5-minute revalidation. These are SEO-critical — Google must see the product list in HTML. The content changes (inventory, prices) but not on every request. ISR gives CDN-speed loads, good SEO, near-real-time data. If a flash sale starts, trigger an on-demand ISR revalidation via `revalidatePath('/sarees')` from the sale management backend.
>
> Product detail pages: ISR with 2-minute revalidation (live stock and price updates matter here). Plus dynamic Open Graph metadata generated at SSR time for the sharing preview on WhatsApp — critical for Meesho's social commerce model.
>
> Search results page: SSR. Results depend on the user's search query (URL parameter) and sometimes their location. Can't pre-build these. Cache at CDN for popular search queries (top 1,000 queries) with `Cache-Control: s-maxage=30`.
>
> User cart: Client-side only. Cart state is unique per user, changes frequently with every add/remove, and users expect immediate optimistic updates. TanStack Query with optimistic mutations, no SSR involvement.
>
> Order history: SSR on first load for SEO and fast paint (though this page doesn't need SEO — it's behind auth). After first load, client-side updates with TanStack Query.
>
> This gives Meesho: fast public pages for Google indexing, instant product detail social shares, and a smooth authenticated experience — without over-engineering every page into SSR.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "SSR is always better for SEO" | "Use Next.js for SEO — server renders everything" | Google can execute JavaScript and index SPAs — most major SPAs rank well; SSR is not required for SEO; SSR matters most for social sharing previews (WhatsApp, Twitter use crawlers that often DON'T execute JavaScript, needing og:tag in raw HTML) and LCP performance (content visible faster → better Core Web Vitals → ranking signal) |
| "SSG is not suitable for dynamic content" | "SSG only works for blogs, not real apps" | ISR makes SSG dynamic: regenerate individual pages at configurable intervals; `revalidatePath()` triggers on-demand regeneration when data changes via webhook; a product page can be SSG-fast while staying data-current within seconds of a price change |
| "Next.js SSR means no caching" | "SSR means every request hits the server" | Next.js `fetch()` with `next.revalidate` caches the fetch result for the specified duration on the server; CDN caching with `Cache-Control: s-maxage` caches the rendered HTML at the CDN edge; a well-cached SSR page has CDN hit rates >95%, meaning the server executes for <5% of requests |
| "Hydration doubles the rendering work" | "SSR renders on server then React re-renders on browser — that's double work" | Hydration does NOT re-render — React matches the existing DOM nodes to its component tree and only attaches event handlers without creating new DOM nodes; the only extra work is the reconciliation pass, which is fast; if you see re-rendering on hydration, that's a hydration mismatch bug to fix |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our product ran as a pure SPA behind authentication — all pages required login, so SEO was irrelevant and there was no 'cold first load' problem for external users. That was the right trade-off for a B2B product used by enterprise customers during work hours. We focused our performance work on JavaScript bundle splitting and in-app navigation speed, not SSR.
>
> My understanding of SSR and SSG comes from working on performance optimisations that benchmarked our SPA against what SSR would deliver (using Lighthouse in CI) and from studying the Next.js App Router model while evaluating whether to migrate parts of the SAP BTP frontend. The decision stayed SPA because we didn't need public indexing, but understanding SSR deeply helped me argue the case with data — not preference.
>
> The scenario where I would immediately reach for SSR in a new project: any public-facing product page where social sharing (WhatsApp deep links to products) is a growth channel. Meesho, Swiggy, Zomato — that social share click on a slow SPA is a lost conversion. SSR is directly a revenue decision there."

---

## 8. Scale Evolution

**Start-up, B2B product, users always logged in →** SPA is perfect: Vite + React, deploy to S3 + CloudFront, zero server infrastructure, iterate fast. SSR adds complexity you don't need.

**Consumer product, 100K users, SEO matters →** Next.js with hybrid strategy: SSG for marketing/landing pages (zero ops), ISR for catalog pages (product freshness), SPA behaviour for authenticated dashboards (in the same Next.js app). One infra, three strategies.

**10M users, SEO critical, social sharing is growth →** Next.js on Vercel or AWS Lambda@Edge; CDN caching with fine-grained revalidation; React Server Components for minimal JavaScript to client; streaming HTML (React Suspense + `.stream()`) for progressive enhancement — the server streams the shell HTML instantly, then streams in product-specific content as it resolves; Open Graph images generated at build time.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment gateway SDK documentation and developer portal are SSG; merchant-facing dashboards are SPA; public product pages might use SSR for SEO; the ability to choose per-page renders is expected knowledge | Show you know WHEN to use each strategy, not just HOW; connect to Core Web Vitals impact on SEO |
| Swiggy / Meesho | Social commerce (Meesho) — WhatsApp sharing is a core growth channel; restaurant/product pages need Open Graph in raw HTML; real-time availability data needs ISR or SSR; this is a direct revenue impact topic | ISR for product freshness; on-demand revalidation on price/inventory changes; streaming SSR for large listing pages |
| Adobe / Microsoft | Adobe Experience Cloud (CMS) has strong opinions on rendering strategy — static for marketing, SSR for personalized content; Microsoft Teams web client is a complex SPA; knowing trade-offs deeply signals architectural maturity | Know React Server Components deeply (Adobe is involved in RSC standardization); streaming SSR; edge rendering |
| SAP Labs | SAP BTP frontends are complex SPAs behind auth; but SAP public developer documentation (developers.sap.com) is SSG; understanding why each choice was made at SAP | Anchor the SAP SPA story; explain why SSR wasn't needed there; contrast with consumer-facing scenarios |

---

## 10. Related Topics — What to Study Next

- **Topic 203 — React Server Components + Server Actions** — RSC is the React native answer to SSR, deeper than Next.js wrapping; Server Components run only on the server with zero JavaScript shipped to the client; Server Actions are typed POST handlers called from any Client Component without writing API route code; understanding RSC at the React level (not just Next.js API level) is the senior signal
- **Topic 205 — Critical Rendering Path** — SSR and SSG decisions directly impact the critical rendering path; SSR sends fully-formed HTML → browser paints immediately → critical path is shorter; SPA must download, parse, and execute JavaScript before any meaningful paint → longer critical path; understanding what the browser does with each byte received explains WHY these strategies impact LCP/FCP
- **Topic 211 — React 18 Concurrent Mode + Suspense** — React 18's Suspense + streaming SSR allows the server to stream HTML progressively — the shell renders and sends immediately, individual suspended sections stream in as their data resolves; this changes the SSR latency model from "wait for all data → send full HTML" to "send partial HTML immediately → stream rest"
- **Topic 235 — Code Splitting and Lazy Loading** — SPA performance is dominated by JavaScript bundle size; the relationship between SSG/SSR (reduces perceived latency) and code splitting (reduces SPA JavaScript cost) is the full performance story; for any page that is a SPA section, code splitting is the primary tool

---

*Part 12 · SPA vs SSR vs SSG — Trade-offs · Full Stack Interview Guide · Hruday D · 2026*
