# 119. Next.js Data Fetching — Server Components, fetch(), Caching
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Next.js App Router extends the native `fetch()` API with built-in caching and revalidation. In Server Components, `fetch()` can be called directly with three strategies: `cache: 'force-cache'` (static — cache indefinitely, default for the Data Cache), `{ next: { revalidate: 60 } }` (ISR — revalidate after N seconds, stale-while-revalidate), or `cache: 'no-store'` (dynamic — never cache, always fresh from server). Next.js has a four-layer cache: the Request Memoization (deduplicates the same fetch URL within a single render pass), the Data Cache (persists across requests, CDN-cache level), the Full Route Cache (pre-rendered HTML/RSC payload), and the Router Cache (client-side RSC payload cache for navigations). Understanding which cache operates at which layer and how to opt out of each is the core of Next.js performance tuning.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Four Caches

```
┌──────────────────────────────────────────────────────────┐
│ Layer 1: REQUEST MEMOIZATION (Per-request, in-memory)    │
│ Deduplicates identical fetch() calls within ONE render   │
│ Automatic — no config                                    │
│ Cleared after each request                               │
└─────────────────────────┬────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────┐
│ Layer 2: DATA CACHE (Persistent, server-side)            │
│ Stores fetch() results across MULTIPLE requests          │
│ Configured by fetch() options                            │
│ 'force-cache' (default), revalidate: N, 'no-store'      │
│ Persists until: revalidation time, revalidateTag(),      │
│ revalidatePath(), or next build                          │
└─────────────────────────┬────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────┐
│ Layer 3: FULL ROUTE CACHE (Build + ISR)                  │
│ Pre-rendered HTML + RSC payload for static routes        │
│ Built at: next build (for static) + ISR revalidation     │
│ Opt out: dynamic functions (cookies(), headers(),        │
│ searchParams), or 'no-store' fetch                       │
└─────────────────────────┬────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────┐
│ Layer 4: ROUTER CACHE (Client-side, per session)         │
│ Browser's in-memory RSC payload for navigated routes     │
│ Automatic prefetching of <Link> targets                  │
│ Duration: dynamic routes ~30s, static routes ~5min       │
│ Clear: router.refresh(), Server Action + revalidatePath  │
└──────────────────────────────────────────────────────────┘
```

### fetch() Caching Strategies

```typescript
// ========================
// Strategy 1: Static (force-cache) — default
// ========================
async function getStaticConfig() {
  const res = await fetch('https://api.example.com/config', {
    cache: 'force-cache',  // or omit — force-cache is the default if no dynamic functions
  });
  return res.json();
  // Cached indefinitely (until next build or manual invalidation)
  // Fastest: served from Data Cache or CDN cache
}

// ========================
// Strategy 2: ISR (Time-based revalidation)
// ========================
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 60 },  // Revalidate every 60 seconds
  });
  return res.json();
  // Stale-while-revalidate: serve stale cache while refreshing in background
  // After 60s: next request triggers background refresh → new cache entry
}

// ========================
// Strategy 3: Dynamic (no-store) — always fresh
// ========================
async function getLivePrice(productId: string) {
  const res = await fetch(`https://api.example.com/prices/${productId}`, {
    cache: 'no-store',  // never cache — always fetch from origin
  });
  return res.json();
  // Opt out of Data Cache + Full Route Cache
  // Route becomes dynamic (server-rendered per request)
}

// ========================
// Route-level cache override
// ========================
// Force ALL fetches in a page to be dynamic:
export const dynamic = 'force-dynamic';

// Force all fetches to revalidate at segment level:
export const revalidate = 60;  // 1 minute for ALL data in this segment

// page.tsx
export const dynamic = 'force-dynamic';
// Makes the entire route dynamic regardless of individual fetch options
```

### Request Memoization — Same URL, One Request

```typescript
// Multiple Server Components in the same render pass can fetch the same URL
// Next.js deduplicates: only ONE HTTP request is made

// app/dashboard/page.tsx (Server Component)
async function DashboardPage() {
  const user = await getUser();  // fetch('/api/user')
  return <DashboardLayout user={user}><StatsPanel /></DashboardLayout>;
}

// components/DashboardLayout.tsx
async function DashboardLayout({ user, children }) {
  return <div><Header user={user} />{children}</div>;
}

// components/StatsPanel.tsx (Server Component)
async function StatsPanel() {
  const user = await getUser();  // fetch('/api/user') — SAME URL
  const stats = await getStats(user.id);
  return <div>...</div>;
}

// ✅ Both calls to getUser() use fetch('/api/user')
// Next.js deduplicates: ONE actual HTTP request, result memoized for render duration
// No need to pass user prop through every component just to avoid duplicate requests

async function getUser() {
  const res = await fetch('/api/user', { cache: 'force-cache' });
  return res.json();
}
```

### On-Demand Revalidation — Cache Invalidation

```typescript
// Revalidate on demand (e.g., after a mutation in a Server Action)
import { revalidatePath, revalidateTag } from 'next/cache';

// Tag-based invalidation (more granular than path)
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600, tags: ['products'] },  // tag this cache entry
  });
  return res.json();
}

async function getProductById(id: string) {
  const res = await fetch(`https://api.example.com/products/${id}`, {
    next: { tags: ['products', `product-${id}`] },
  });
  return res.json();
}

// Server Action: invalidate after mutation
'use server';
export async function updateProduct(id: string, data: Partial<Product>) {
  await db.products.update({ where: { id }, data });

  // Invalidate all cache entries tagged 'products' → triggers revalidation
  revalidateTag('products');
  // OR: invalidate specific product
  revalidateTag(`product-${id}`);

  // OR: invalidate all pages under a path
  revalidatePath('/products');
  revalidatePath(`/products/${id}`);
}
```

### Dynamic Functions — Auto-Opt-Out of Caching

```typescript
// These functions opt the route out of Full Route Cache → dynamic server rendering:
// cookies(), headers(), searchParams

import { cookies, headers } from 'next/headers';

// ❌ Using cookies() forces dynamic rendering for this segment
async function UserGreeting() {
  const cookieStore = cookies();
  const session = cookieStore.get('session');  // this makes the route dynamic
  // ...
}

// ✅ Design pattern: minimize dynamic scope
// Keep dynamic data in leaf components; keep parent layouts cacheable

// app/(auth)/dashboard/layout.tsx — CACHEABLE layout
export default async function DashboardLayout({ children }) {
  // No cookies() or headers() here → layout can be statically rendered
  return <DashboardShell>{children}</DashboardShell>;
}

// app/(auth)/dashboard/page.tsx — DYNAMIC page only
import { cookies } from 'next/headers';
export default async function DashboardPage() {
  const session = cookies().get('session');  // dynamic scoped to page only
  // Layout stays cached; only page re-renders dynamically
}
```

### Non-fetch Data Sources — react/cache

```typescript
// fetch() gets automatic memoization from Next.js
// For non-fetch data (database calls, file system), use React's cache() for memoization

import { cache } from 'react';

// Memoized DB query — same request deduplication as fetch() memoization
export const getUser = cache(async (userId: string) => {
  return await prisma.user.findUnique({ where: { id: userId } });
});

// Multiple components can call getUser(userId) in same render
// → only ONE DB query executed
// → same pattern as fetch() deduplication

// app/dashboard/page.tsx
async function DashboardPage({ params }: { params: { userId: string } }) {
  const user = await getUser(params.userId);  // DB query
  return <UserProfile userId={params.userId} />;  // component also calls getUser
}

// components/UserProfile.tsx
async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId);  // SAME call — memoized, no second DB query
  return <div>{user?.name}</div>;
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the product catalog was static except for prices and inventory levels. Using tiered caching: product descriptions with `revalidate: 86400` (24h — rarely changes), prices with `revalidate: 300` (5 min — changes with market), inventory with `cache: 'no-store'` (changes in real time). This reduced origin server requests by ~95% for product page loads — only price and inventory fetch on each request; product details served from CDN cache. TTI (Time to Interactive) dropped from 3.2s to 1.4s via Lighthouse.

**At FAANG scale:**
- **Microsoft:** Azure documentation uses `revalidate: 3600` for page content, `revalidate: 60` for sidebar navigation to pick up new docs sections; full static site generation for top 1000 pages via `generateStaticParams`
- **Adobe:** Stock image search pages: image metadata cached with `revalidate: 86400`, search result counts with `cache: 'no-store'` for accuracy
- **Salesforce:** Trailhead module pages: `generateStaticParams` for all published modules (12,000+ pages pre-rendered), `revalidatePath` triggered from CMS webhook when module content updates
- **Cisco:** DevNet API reference docs: fully static generation, `revalidateTag('api-endpoints')` triggered by the API server when spec changes are published

---

## 💬 4. Interview Execution

### Sample Answer

> "Next.js has four caching layers. The two I work with most: Data Cache and Full Route Cache.
>
> Data Cache is controlled by fetch() options. Three strategies: omit the option (or use `force-cache`) for static data — cached indefinitely; `{ next: { revalidate: 60 } }` for ISR — stale-while-revalidate, background refresh after 60 seconds; `cache: 'no-store'` for dynamic data — always fetch fresh, opts the route out of Full Route Cache.
>
> Request Memoization is automatic: if two Server Components in the same render pass call `fetch()` with the same URL, only one HTTP request fires. For DB calls (not fetch), I use React's `cache()` function to get the same deduplication.
>
> For cache invalidation after mutations, I use Server Actions with `revalidatePath()` for path-based invalidation or `revalidateTag()` for granular tag-based invalidation — I tag my fetch calls with `next: { tags: ['products'] }` and then `revalidateTag('products')` after any product mutation.
>
> The key design principle: minimize dynamic scope. `cookies()` and `headers()` force the entire segment to render dynamically on every request. I push those calls as deep into the component tree as possible — ideally into leaf components or page-level components — so parent layouts remain statically cached.
>
> On the client side, the Router Cache stores pre-fetched RSC payloads for pages linked via `<Link>` — navigations feel instant. This cache is per-session and auto-expires; `router.refresh()` or server actions with `revalidatePath` clear the relevant entry."

---

## 💻 5. Code Example

```typescript
// ========================
// Multi-tier caching strategy for product catalog
// ========================

// lib/data.ts — data access layer with explicit cache strategies
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// ① Product details: cached 24h, tagged for on-demand invalidation
export async function getProduct(id: string) {
  const res = await fetch(`${process.env.API_URL}/products/${id}`, {
    next: {
      revalidate: 86400,        // 24 hours
      tags: ['products', `product-${id}`],
    },
  });
  if (!res.ok) return null;
  return res.json() as Promise<Product>;
}

// ② Live price: never cached
export async function getProductPrice(id: string) {
  const res = await fetch(`${process.env.PRICING_URL}/prices/${id}`, {
    cache: 'no-store',
  });
  return res.json() as Promise<{ price: number; currency: string }>;
}

// ③ Product categories: cached indefinitely (rarely changes)
export async function getCategories() {
  const res = await fetch(`${process.env.API_URL}/categories`, {
    cache: 'force-cache',  // explicit: cache forever
  });
  return res.json() as Promise<Category[]>;
}

// ④ DB query with React cache() for deduplication within a render
export const getUserPurchaseHistory = cache(async (userId: string) => {
  return await prisma.orders.findMany({
    where: { userId },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
});

// ⑤ unstable_cache for non-fetch data with TTL
export const getProductsFromDB = unstable_cache(
  async (category: string) => {
    return await prisma.product.findMany({ where: { category } });
  },
  ['products-by-category'],  // cache key prefix
  { revalidate: 300, tags: ['products'] }  // 5 min + tag
);

// ========================
// Server Action with cache invalidation
// ========================
'use server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function updateProductAction(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const price = Number(formData.get('price'));

  // Server-side validation
  if (!id || !name || isNaN(price)) throw new Error('Invalid input');

  await prisma.product.update({ where: { id }, data: { name, price } });

  // Invalidate caches
  revalidateTag(`product-${id}`);  // product detail page
  revalidateTag('products');        // product list pages
  // revalidatePath('/products');   // alternative: path-based

  redirect(`/products/${id}`);
}

// ========================
// Page component using all strategies simultaneously
// ========================
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

interface Props { params: { id: string } }

export default async function ProductPage({ params }: Props) {
  // ① Static product data (24h cache)
  const product = await getProduct(params.id);
  if (!product) notFound();

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>

      {/* ② Suspense boundary: dynamic price fetches separately */}
      <Suspense fallback={<PriceSkeleton />}>
        <LivePrice productId={params.id} />  {/* Dynamic — no-store */}
      </Suspense>
    </div>
  );
}

// LivePrice is a Server Component — fetches live price at render time
async function LivePrice({ productId }: { productId: string }) {
  const { price, currency } = await getProductPrice(productId);
  return <span>{currency} {price.toFixed(2)}</span>;
}

// Static params for build-time pre-rendering
export async function generateStaticParams() {
  const ids = await prisma.product.findMany({ select: { id: true }, take: 1000 });
  return ids.map(({ id }) => ({ id }));
}

// Type stubs
interface Product { id: string; name: string; description: string }
interface Category { id: string; name: string }
declare const prisma: any;
declare const redirect: (path: string) => never;
declare function PriceSkeleton(): JSX.Element;
```

---

## 🧠 6. Memory Aid

**Three fetch() cache strategies — SDN:**
- **S**tatic: `force-cache` (or default) → CDN, build
- **D**ynamic: `no-store` → per-request always fresh
- **N**ot-forever: `{ next: { revalidate: N } }` → ISR, stale-while-revalidate

**On-demand invalidation:**
- `revalidateTag('tag')` → granular entity invalidation
- `revalidatePath('/path')` → all data for a path

**react/cache vs Next.js memoization:**
- `fetch()` → automatic request memoization
- DB queries → wrap with `cache()` from react for same behavior

**Dynamic function rule:** `cookies()` or `headers()` anywhere in the route → entire route becomes dynamic (per-request).

**Mnemonic:** **SDRI** — **S**tatic/Dynamic/ISR strategies, **D**eduplication via memoization, **R**evalidateTag for invalidation, **I**solate dynamic calls to leaf components.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance tuning: correctly choosing between static, ISR, and dynamic fetch strategies is the primary lever for Next.js page performance — wrong choices result in either stale data (too much caching) or slow uncached server-renders (too little)
→ Cost optimization: at Vercel hosting scale, dynamic routes cost significantly more than static — each dynamic request is a Lambda invocation; ISR amortizes this cost while maintaining freshness
→ Cache invalidation is the hard part: understanding `revalidateTag` for granular, tag-based invalidation (vs blunt `revalidatePath`) and when to use each is a senior-level architectural decision that interviewers probe

**How it works (2 sentences):**
Next.js extends `fetch()` by wrapping it in a custom implementation that intercepts calls during server rendering — if the request URL and options match a Data Cache entry that isn't stale, the cached response is returned immediately without an actual HTTP request; if the entry is stale or missing, the real HTTP request fires, the response is stored in the Data Cache for future requests, and (for `revalidate` entries) a background ISR revalidation is triggered on the next stale request.
Request Memoization is implemented by storing a `Map<serialized_request, Promise<response>>` per render pass — if the same `fetch()` call is made a second time within the same server-rendering pass, the existing Promise from the Map is returned instead of creating a new HTTP request, ensuring that component tree colocation of data fetching remains performant without requiring prop drilling to share fetched values.

---
✅ Topic 119/486 complete → Continuing to Topic 120: Next.js Rendering Modes — SSG, SSR, ISR, PPR
