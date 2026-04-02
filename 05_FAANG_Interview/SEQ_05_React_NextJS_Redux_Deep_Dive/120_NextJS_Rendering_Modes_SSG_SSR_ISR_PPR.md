# 120. Next.js Rendering Modes — SSG, SSR, ISR, PPR
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Next.js supports four rendering modes. **SSG (Static Site Generation)**: HTML generated at build time, served from CDN — fastest (no server runtime), but data is stale until next build. **SSR (Server-Side Rendering)**: HTML generated per request on the server — always fresh, but every request hits a server (higher cost, higher latency). **ISR (Incremental Static Regeneration)**: HTML generated at build time, then regenerated in the background after a specified time interval — combines CDN speed with data freshness. **PPR (Partial Prerendering)**, introduced in Next.js 14 experimental: combines static shell (rendered at build) with dynamic holes (filled at request time) within a single page — the static shell is served instantly from CDN while dynamic content streams in. The App Router determines rendering mode primarily from fetch cache options and dynamic function usage (`cookies()`, `headers()`, `searchParams`).

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Rendering Decision Tree

```
Does the page use cookies(), headers(), or searchParams?
  YES → Dynamic (SSR per request)
  NO → Continue...

Does any fetch() in the page use cache: 'no-store'?
  YES → Dynamic (SSR per request)
  NO → Continue...

Does any fetch() use revalidate: N?
  YES → ISR (served static, revalidated in background after N seconds)
  NO → Static (SSG — pre-rendered at build, cached indefinitely)

Special: export const dynamic = 'force-dynamic'  → forces SSR
         export const revalidate = N              → sets ISR at segment level
```

### SSG — Static Site Generation

```typescript
// app/products/[id]/page.tsx
// Static: pre-rendered at build time for all known IDs

// Required for dynamic routes: tell Next.js which IDs to pre-render
export async function generateStaticParams() {
  // Called at BUILD TIME
  const products = await prisma.product.findMany({
    select: { id: true },
    where: { published: true },
  });
  return products.map(({ id }) => ({ id: String(id) }));
}

// Page fetches with force-cache → statically generated
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await fetch(`${API}/products/${params.id}`, {
    cache: 'force-cache',
  }).then(r => r.json());

  return <ProductDetail product={product} />;
}

// Build output: /products/p1.html, /products/p2.html, ... → all served from CDN
// ✅ 0ms server latency, globally distributed
// ❌ Stale until next build or on-demand revalidation

// For pages NOT in generateStaticParams:
export const dynamicParams = true;   // (default) generate on first request + cache
// export const dynamicParams = false;  // 404 for unknown IDs
```

### SSR — Server-Side Rendering

```typescript
// app/orders/page.tsx — uses cookies → automatically SSR
import { cookies } from 'next/headers';

export default async function OrdersPage() {
  const session = cookies().get('session')?.value;
  if (!session) redirect('/login');

  const orders = await fetch(`${API}/orders`, {
    cache: 'no-store',  // explicit: always fresh
    headers: { Authorization: `Bearer ${session}` },
  }).then(r => r.json());

  return <OrderList orders={orders} />;
}
// Every request: server execution → always fresh
// ✅ Always up-to-date, personalized
// ❌ 100-200ms+ TTFB (server compute + DB query per request)

// Force SSR explicitly for the entire segment:
export const dynamic = 'force-dynamic';
export default async function LiveDashboard() {
  // All fetches treated as no-store, even if they say force-cache
}
```

### ISR — Incremental Static Regeneration

```typescript
// app/blog/[slug]/page.tsx
// ISR: serve cached static page, revalidate in background after N seconds

export async function generateStaticParams() {
  const posts = await getTopBlogPosts(100);  // pre-build top 100 posts
  return posts.map(p => ({ slug: p.slug }));
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await fetch(`${API}/posts/${params.slug}`, {
    next: { revalidate: 3600 },  // revalidate every hour
  }).then(r => r.json());

  return <Article post={post} />;
}

// ISR behavior:
// T=0: Build generates HTML for top 100 posts
// T=1h: Cache entry for a post expires (stale)
// T=1h+1req: Stale HTML served immediately (fast) + background regeneration triggered
// T=1h+2req: Now serving freshly regenerated HTML

// On-demand ISR: trigger revalidation programmatically
// app/api/revalidate/route.ts
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag');
  const secret = request.headers.get('x-revalidate-secret');

  // ① Verify webhook secret — prevent unauthorized cache clearing
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (tag) {
    revalidateTag(tag);
    return Response.json({ revalidated: true, tag });
  }

  return Response.json({ error: 'Missing tag' }, { status: 400 });
}
// CMS webhook → POST /api/revalidate?tag=blog → immediate page regeneration
```

### PPR — Partial Prerendering (Next.js 14, experimental)

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: true,  // Enable PPR
  },
};

// PPR concept: same page has BOTH static shell AND dynamic holes
// The static parts are rendered at build time (CDN-fast)
// Dynamic parts (wrapped in Suspense) are streamed at request time

// app/products/[id]/page.tsx — PPR example
import { Suspense } from 'react';

// Static shell: product description, images, static content (CDN)
// Dynamic holes: personalized price, user's owned items check (per-request stream)

export default async function ProductPage({ params }: { params: { id: string } }) {
  // Static: product data from ISR cache
  const product = await getProduct(params.id);  // cached 24h

  return (
    <div>
      {/* Static shell — served from CDN instantly */}
      <ProductImages images={product.images} />
      <ProductDescription content={product.description} />

      {/* Dynamic hole — streams in after request-time auth check */}
      <Suspense fallback={<PriceSkeleton />}>
        <PersonalizedPrice          {/* dynamic: reads session cookie */}
          productId={params.id}
          userId={getCurrentUserId()}
        />
      </Suspense>

      {/* Dynamic hole — streams in with user's purchase history */}
      <Suspense fallback={<PurchaseButtonSkeleton />}>
        <PurchaseButton            {/* dynamic: checks if user already owns it */}
          productId={params.id}
        />
      </Suspense>
    </div>
  );
}

// PPR behavior:
// Request comes in → static shell served from CDN INSTANTLY (no server compute)
// Simultaneously: server starts computing dynamic holes
// Dynamic content streams into the HTML response as it's ready
// User sees product content immediately, then personalization fills in
// ✅ Best of both worlds: CDN speed + per-request freshness for dynamic parts
```

### Streaming and Suspense in SSR

```typescript
// Without PPR, streaming works in SSR too:
// Server streams HTML as each Suspense boundary resolves

// app/dashboard/page.tsx — SSR with streaming
import { Suspense } from 'react';

export default async function Dashboard() {
  // Parallel data fetching — both start simultaneously
  const userPromise = getUser();        // don't await here
  const metricsPromise = getMetrics();  // don't await here

  // The user data resolves first (faster query)
  const user = await userPromise;  // await before rendering user-dependent UI

  return (
    <div>
      <WelcomeHeader user={user} />   {/* renders as soon as user resolves */}

      {/* Metrics stream in when they're ready — non-blocking */}
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsPanel metricsPromise={metricsPromise} />
      </Suspense>
    </div>
  );
}

// MetricsPanel: use() the promise (React 19) or await inside RSC
async function MetricsPanel({ metricsPromise }: { metricsPromise: Promise<Metrics> }) {
  const metrics = await metricsPromise;  // awaiting inside component = streaming
  return <div>{metrics.revenue}</div>;
}
```

### Comparison Table

```
Mode    | When rendered    | Data freshness | Server cost | CDN-cacheable
---------|------------------|----------------|-------------|---------------
SSG     | Build time       | Build-stale    | Zero        | ✅ Forever
ISR     | Build + periodic | Stale by N sec | Low (BG)    | ✅ Until revalidation
SSR     | Per request      | Always fresh   | High        | ❌ (must no-cache)
PPR     | Build (shell)    | Instant shell, | Low         | ✅ Shell only
        | Request (dynamic)| fresh dynamic  |             |
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the product catalog (static content) used SSG with `generateStaticParams` for top 5,000 SKUs — served from Vercel's CDN, TTFB < 50ms. Prices used ISR with `revalidate: 300` — stale-while-revalidate acceptable for 5-minute price lag. User-specific pages (order history, wishlist) used SSR — always authenticated, always fresh. After implementing PPR for product detail pages in a pilot: FCP (First Contentful Paint) improved from 1.8s to 0.6s — the static shell (product images, description) appeared instantly from CDN while the personalized "You've purchased this" badge streamed in.

**At FAANG scale:**
- **Microsoft:** Azure Portal documentation: SSG for all docs pages (thousands of pre-rendered pages), ISR for release notes (daily `revalidate`), SSR for pricing calculator (user's subscription info required)
- **Adobe:** Stock image browse pages: ISR with 1-hour revalidation; search results: SSR (query-dependent)
- **Salesforce:** Help articles: SSG with on-demand revalidation via CMS webhook; support ticket view: SSR (user-specific SLA data)
- **Cisco:** API reference docs: 100% SSG, `dynamicParams = false` — 404 for any path not in `generateStaticParams` (prevents malicious paths from triggering server compute)

---

## 💬 4. Interview Execution

### Sample Answer

> "Next.js has four rendering modes, and in App Router you opt in or out of them via fetch options and route segment exports rather than explicit API calls like the Pages Router.
>
> SSG is the default for pages where all fetch calls use `force-cache` and no dynamic functions like `cookies()` or `headers()` are called. The HTML is generated at build time and served from CDN — fastest possible TTFB, but data is only as fresh as the last build. Use it for documentation, blog posts, product descriptions.
>
> ISR is SSG with a background refresh timer. Add `{ next: { revalidate: 60 } }` to your fetch calls. The first request after the TTL gets the stale page immediately (stale-while-revalidate), triggering a background regeneration. Or use on-demand revalidation with `revalidateTag` from a Server Action or webhook — that's how Vercel and most CMS integrations work.
>
> SSR happens automatically when you call `cookies()`, `headers()`, or use `cache: 'no-store'`. Every request hits the server. Use it for personalized, authenticated, or real-time content.
>
> PPR is the exciting new one — experimental in Next.js 14. Within a single page, the static parts (product description, images) are pre-rendered at build and served from CDN instantly. Dynamic parts wrapped in Suspense boundaries (personalized price, purchase button) stream in as the server renders them per-request. One HTML response, two rendering timelines. FCP is CDN-speed, dynamic freshness is maintained."

---

## 💻 5. Code Example

```typescript
// ========================
// One app showing all four rendering modes
// ========================

// next.config.js
const nextConfig = { experimental: { ppr: true } };

// ========== SSG: Blog posts ==========
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs();
  return slugs.map(slug => ({ slug }));
}
export const dynamicParams = false;  // 404 for unknown slugs

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await fetch(`${API}/posts/${params.slug}`, {
    cache: 'force-cache',  // never re-fetch during runtime
  }).then(r => r.json());
  return <Article post={post} />;
}

// ========== ISR: Product pages ==========
// app/products/[id]/page.tsx
export async function generateStaticParams() {
  const ids = await getTop1000ProductIds();
  return ids.map(id => ({ id }));
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await fetch(`${API}/products/${params.id}`, {
    next: { revalidate: 3600, tags: [`product-${params.id}`, 'products'] },
  }).then(r => r.json());
  return <ProductDetail product={product} />;
}
// ISR: regenerated hourly OR on-demand via revalidateTag

// ========== SSR: User orders ==========
// app/orders/page.tsx
import { cookies, headers } from 'next/headers';
export const dynamic = 'force-dynamic';  // explicit SSR

export default async function OrdersPage() {
  const session = cookies().get('session')?.value;
  if (!session) return redirect('/login');

  const orders = await fetch(`${API}/orders`, {
    cache: 'no-store',
    headers: { Cookie: `session=${session}` },
  }).then(r => r.json());

  return <OrderList orders={orders} />;
}

// ========== PPR: Product detail with personalization ==========
// app/store/[id]/page.tsx
// Static shell (product data) + dynamic holes (user-specific data)
import { Suspense } from 'react';

async function getProductStatic(id: string) {
  return fetch(`${API}/products/${id}`, {
    next: { revalidate: 86400 },
  }).then(r => r.json());
}

export default async function StoreProductPage({ params }: { params: { id: string } }) {
  const product = await getProductStatic(params.id);  // static: from cache

  return (
    <div>
      {/* Static shell — CDN, near-instant */}
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <img src={product.image} alt={product.name} />

      {/* Dynamic hole — streams from server (reads session for personalization) */}
      <Suspense fallback={<div aria-busy="true">Loading your price...</div>}>
        <PersonalizedPrice productId={params.id} />
      </Suspense>

      {/* Dynamic hole — streams from server */}
      <Suspense fallback={<div aria-busy="true">Checking availability...</div>}>
        <StockChecker productId={params.id} />
      </Suspense>
    </div>
  );
}

// PersonalizedPrice is dynamic (reads cookies for user session)
async function PersonalizedPrice({ productId }: { productId: string }) {
  const session = cookies().get('session')?.value;
  const priceData = await fetch(`${API}/prices/${productId}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${session ?? ''}` },
  }).then(r => r.json());
  return <span>Your price: ${priceData.price}</span>;
}

// Type stubs
const API = process.env.API_URL ?? '';
declare function getAllBlogSlugs(): Promise<string[]>;
declare function getTop1000ProductIds(): Promise<string[]>;
declare function redirect(path: string): never;
declare const revalidateTag: (tag: string) => void;
```

---

## 🧠 6. Memory Aid

**SISP — four modes, four trade-offs:**
- **S**SG: Speed (CDN, zero server), stale data, build cost
- **I**SR: Speed + freshness balance, background regeneration
- **S**SR: Always fresh, always server cost, can't CDN-cache
- **P**PR: Shell from CDN instantly + dynamic streams in (best for conversion)

**Triggering each mode:**
- SSG: no dynamic functions + `force-cache`
- ISR: `{ next: { revalidate: N } }`
- SSR: `cookies()` / `headers()` / `cache: 'no-store'`
- PPR: enable in config + Suspense boundaries in the page

**On-demand invalidation:** `revalidateTag('tag')` or `revalidatePath('/path')`

**Mnemonic:** **BRISC** — **B**uild=SSG, **R**evalidate=ISR, **I**mmediate=SSR, **S**hell+Stream=PPR, **C**hoose by data freshness need.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance vs. cost trade-off: choosing SSR for content that could be ISR wastes server compute (Lambda invocations at scale are expensive); choosing ISR for user-personalized content serves wrong data — picking the right mode is a systems design decision, not just a code decision
→ PPR is a differentiated topic: most candidates know SSG/SSR/ISR; demonstrating knowledge of PPR (particularly the Suspense boundary mechanism) signals someone actively following Next.js's direction and capable of driving architectural decisions
→ Real measurement: LCP/FCP differences between SSG (< 50ms TTFB) and SSR (100-300ms TTFB) are measurable in Lighthouse and Core Web Vitals — connecting rendering mode choice to specific metric improvements is a senior signal

**How it works (2 sentences):**
ISR works through a "stale-while-revalidate" implementation: Next.js stores the generated HTML and RSC payload in a persistent cache, marks entries with an expiry time, serves the stale entry to any request while the entry is within its window, and on the first request after expiry, serves the stale content WHILE triggering a background server-side regeneration that replaces the cache entry — ensuring the client always gets a fast response while data is refreshed asynchronously.
PPR works by splitting the React component tree at Suspense boundaries: during the build phase, Next.js renders the component tree and statically captures all content that doesn't cross a Suspense boundary (no async data reads, no dynamic functions), generating a "static shell" as pre-rendered HTML/RSC payload; at request time, the static shell is sent from CDN immediately while the server begins rendering the Suspense-boundary subtrees and streams their HTML output into the already-delivered response as chunked transfer encoding.

---
✅ Topic 120/486 complete → Continuing to Topic 121: Next.js Server Actions — Forms and Mutations
