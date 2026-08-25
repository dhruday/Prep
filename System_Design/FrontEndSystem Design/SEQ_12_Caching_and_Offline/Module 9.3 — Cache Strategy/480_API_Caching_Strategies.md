# 480 — API Caching Strategies: SWR, React Query, HTTP Cache Layers

────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

API caching is a multi-layered strategy that prevents redundant network requests, reduces server load, and delivers near-instant UI responsiveness. In modern frontend systems, caching operates across **three distinct layers**: the browser's built-in HTTP cache controlled by response headers, CDN/edge caches that serve content geographically closer to users, and application-level caches managed by libraries like TanStack Query, SWR, or RTK Query that keep server state synchronized in memory.

For a senior frontend engineer, understanding each layer's guarantees, invalidation semantics, and failure modes is non-negotiable. A misconfigured `Cache-Control` header can serve stale user data across sessions. An application cache without proper `staleTime` can hammer your API with thousands of redundant requests. A CDN caching user-specific responses can leak PII across users — a security incident, not just a performance bug.

The art is composing these layers so they complement rather than conflict: HTTP cache for static/immutable assets, CDN edge for geo-distributed public data, and application-level cache for dynamic server state with precise invalidation.

────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior / Staff Level)

### A. The Three Layers of API Caching

```
┌─────────────────────────────────────────────────────────┐
│  Browser Tab (Application-Level Cache)                  │
│  TanStack Query / SWR / RTK Query / NgRx               │
│  ┌───────────────────────────────────────────────────┐  │
│  │ In-memory cache map: queryKey → { data, status }  │  │
│  │ staleTime, gcTime, refetch policies               │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Service Worker Cache (SW Cache API)                    │
│  Intercepts fetch, applies strategies (cache-first,     │
│  network-first, stale-while-revalidate)                │
├─────────────────────────────────────────────────────────┤
│  Browser HTTP Cache (Disk / Memory)                     │
│  Governed by Cache-Control, ETag, Last-Modified         │
│  Shared across tabs for same origin                     │
├─────────────────────────────────────────────────────────┤
│  CDN Edge Cache (Cloudflare, Vercel, CloudFront)        │
│  Geographically distributed, governed by origin         │
│  response headers + CDN-specific rules                  │
├─────────────────────────────────────────────────────────┤
│  Origin Server (API / Database)                         │
│  Source of truth, sets cache headers on responses       │
└─────────────────────────────────────────────────────────┘
```

**Request flow:** Application cache → Service Worker → HTTP cache → CDN → Origin.  
Each layer can short-circuit the chain by returning a cached response.

### B. HTTP Cache Headers Deep Dive

**Cache-Control** — The primary directive header.

| Directive                  | Meaning                                                             |
|---------------------------|---------------------------------------------------------------------|
| `max-age=300`             | Fresh for 300 seconds from response time                           |
| `s-maxage=600`            | Shared (CDN) cache max age; overrides `max-age` for CDN            |
| `no-cache`                | Must revalidate with origin before using (NOT "don't cache")        |
| `no-store`                | Never cache — not in disk, memory, CDN, anywhere                    |
| `private`                 | Only browser cache; CDN must not store                              |
| `public`                  | Any cache (CDN, proxy) may store                                    |
| `immutable`               | Content will never change; skip revalidation even on reload         |
| `stale-while-revalidate=60` | Serve stale content while revalidating in background for 60s     |
| `stale-if-error=300`      | Serve stale content if origin returns 5xx for 300s                  |
| `must-revalidate`         | Once stale, must revalidate; don't serve stale even if offline      |

**ETag / If-None-Match** — Conditional revalidation.

```
GET /api/products
→ 200 OK
   ETag: "a1b2c3d4"
   Cache-Control: no-cache

GET /api/products
   If-None-Match: "a1b2c3d4"
→ 304 Not Modified (zero-byte body, use cached version)
```

The server computes a hash (ETag). On subsequent requests the browser sends `If-None-Match` with the stored ETag. If content hasn't changed, the server returns 304, saving bandwidth.

**Vary** — Cache partitioning by request header.

```
Vary: Accept-Encoding, Authorization
```

This tells caches to store separate entries for each unique combination of the listed headers. **Critical for security:** without `Vary: Authorization` (or `Cache-Control: private`), a CDN could serve one user's authenticated response to another.

### C. CDN Caching

| CDN             | Cache Key Default       | Purge Mechanism         | Edge Compute         |
|-----------------|------------------------|-------------------------|----------------------|
| Cloudflare      | URL + query string     | API purge, Cache Tags   | Workers              |
| Vercel Edge     | URL + headers          | Revalidation on deploy  | Edge Functions       |
| AWS CloudFront  | URL + configured headers| Invalidation API        | Lambda@Edge          |

**Vercel ISR (Incremental Static Regeneration):**
```
// Next.js: stale-while-revalidate at CDN level
export const revalidate = 60; // seconds
```
Pages are served from edge cache and revalidated in the background after `revalidate` seconds.

**Surrogate keys / Cache tags** allow granular purging:
```
Surrogate-Key: product-123 category-electronics
# Purge all pages containing product-123
```

### D. Application-Level Caching: TanStack Query (React Query)

TanStack Query models every piece of server state as a **query** identified by a unique key. Its cache is an in-memory `Map<QueryKey, QueryCacheEntry>`.

**Core timing concepts:**

```
                 staleTime                gcTime (after last observer unmounts)
              ├──────────────┤     ├────────────────────────────┤
  fetch ─────► fresh ────────► stale ─────► inactive ──────────► garbage collected
              (no refetch)     (refetch      (no component       (entry removed
               on triggers)    using it)      from cache)
```

- **staleTime** (default: 0) — How long data is considered fresh. While fresh, no background refetches occur.
- **gcTime** (default: 5 min) — How long inactive cache entries survive after the last observer unmounts. After this, the entry is garbage collected.

**Refetch triggers** (when data is stale):
- `refetchOnWindowFocus` — user returns to tab
- `refetchOnReconnect` — network comes back online
- `refetchOnMount` — component mounts with stale data
- `refetchInterval` — polling at fixed interval

**Cache invalidation:**
```typescript
// Hard invalidation — marks query as stale, triggers refetch if observed
queryClient.invalidateQueries({ queryKey: ['products'] });

// Soft invalidation — remove from cache entirely
queryClient.removeQueries({ queryKey: ['products', id] });

// Targeted invalidation with predicate
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'products' &&
    (query.queryKey[1] as any)?.category === 'electronics',
});
```

**Optimistic updates:**
```typescript
useMutation({
  mutationFn: updateProduct,
  onMutate: async (newProduct) => {
    await queryClient.cancelQueries({ queryKey: ['products', newProduct.id] });
    const previous = queryClient.getQueryData(['products', newProduct.id]);
    queryClient.setQueryData(['products', newProduct.id], newProduct);
    return { previous };
  },
  onError: (_err, _newProduct, context) => {
    queryClient.setQueryData(['products', context!.previous.id], context!.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  },
});
```

**Cache dehydration for SSR (Next.js):**
```typescript
// Server: prefetch and dehydrate
const queryClient = new QueryClient();
await queryClient.prefetchQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
});
const dehydratedState = dehydrate(queryClient);

// Client: hydrate from server-side cache
<HydrationBoundary state={dehydratedState}>
  <ProductList />
</HydrationBoundary>
```
This eliminates the loading flash — client boots with pre-populated cache.

### E. SWR (Stale-While-Revalidate by Vercel)

SWR takes a simpler, hook-first approach compared to TanStack Query.

```typescript
const { data, error, isLoading, mutate } = useSWR('/api/products', fetcher, {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,     // deduplicate requests within 2s
  refreshInterval: 30000,     // poll every 30s
  errorRetryCount: 3,
});
```

**Key differences from TanStack Query:**
- SWR uses the fetcher key (usually URL string) as the cache key directly
- No built-in mutation/invalidation framework — uses `mutate()` bound to key
- Simpler mental model but less granular control
- No native devtools (community solutions exist)
- No built-in support for infinite queries, parallel queries, or dependent queries (added via plugins)

### F. RTK Query Caching

RTK Query uses a **tag-based invalidation** system integrated with Redux.

```typescript
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Product', 'Category'],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => 'products',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),
    updateProduct: builder.mutation<Product, Partial<Product>>({
      query: (body) => ({ url: `products/${body.id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Product', id }],
    }),
  }),
});
```

When `updateProduct` succeeds, RTK Query automatically refetches any query providing the invalidated tag. This declarative model avoids manual `invalidateQueries` calls.

**RTK Query cache lifetime:**
- `keepUnusedDataFor` (default: 60s) — equivalent to TanStack Query's `gcTime`
- No equivalent of `staleTime` — refetches on every mount by default
- `refetchOnMountOrArgChange` — can set to `true` or a number (seconds)

### G. Angular HttpClient Caching with Interceptors

```typescript
@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, { response: HttpResponse<any>; expiry: number }>();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.method !== 'GET') {
      // Invalidate related cache entries on mutations
      this.cache.forEach((_, key) => {
        if (key.startsWith(req.url.split('?')[0])) this.cache.delete(key);
      });
      return next.handle(req);
    }

    const cached = this.cache.get(req.urlWithParams);
    if (cached && cached.expiry > Date.now()) {
      return of(cached.response.clone());
    }

    return next.handle(req).pipe(
      filter((event) => event instanceof HttpResponse),
      tap((response) => {
        if (response instanceof HttpResponse) {
          this.cache.set(req.urlWithParams, {
            response: response.clone(),
            expiry: Date.now() + 5 * 60 * 1000, // 5 min TTL
          });
        }
      })
    );
  }
}
```

Angular's approach is manual but gives full control. For NgRx-based apps, API responses can be cached in store with effects handling invalidation.

### H. Comparison Table (10+ Dimensions)

| Dimension                  | HTTP Cache        | SW Cache API       | TanStack Query      | SWR                | RTK Query           |
|---------------------------|-------------------|--------------------|---------------------|--------------------|---------------------|
| **Storage location**       | Browser disk/mem  | CacheStorage API   | JS heap (in-memory) | JS heap            | Redux store (mem)   |
| **Persistence**            | Across sessions   | Across sessions    | Tab lifetime only   | Tab lifetime       | Tab lifetime        |
| **Cache key**              | URL + Vary headers| Custom (URL-based) | Serialized array    | String/array key   | Endpoint + args     |
| **Staleness model**        | max-age / ETag    | Manual strategies  | staleTime config    | SWR protocol       | keepUnusedDataFor   |
| **Invalidation**           | Response headers  | Manual cache.delete| invalidateQueries   | mutate(key)        | Tag-based auto      |
| **Granularity**            | Per-URL           | Per-request        | Per-query key       | Per-key            | Per-endpoint+args   |
| **Optimistic updates**     | Not applicable    | Not applicable     | Built-in onMutate   | Optimistic mutate  | onQueryStarted      |
| **SSR support**            | Via response hdrs | N/A                | Dehydrate/Hydrate   | SWRConfig fallback | extractRehydration  |
| **Devtools**               | Network panel     | Application panel  | React Query Devtools| Community          | RTK Query in Redux  |
| **Offline support**        | Cached responses  | Full offline via SW| Partial (gcTime)    | Partial            | Partial             |
| **Dedup concurrent reqs**  | Conditional (304) | Manual             | Built-in            | dedupingInterval   | Built-in            |
| **Automatic refetch**      | No                | No                 | Focus/reconnect/int | Focus/reconnect    | Mount/focus/poll    |
| **Bundle size impact**     | 0 KB              | SW registration    | ~13 KB gzipped      | ~4 KB gzipped      | ~12 KB (with RTK)   |
| **Framework coupling**     | None              | None               | React (adapters)    | React (core)       | React + Redux       |
| **Pagination / Infinite**  | N/A               | N/A                | useInfiniteQuery    | useSWRInfinite     | Cursor-based manual |

────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

### Example 1: E-Commerce Product Catalog

**Problem:** Product listing page loads 200 products. Users navigate between list and detail views frequently. Each navigation triggers a fresh API call.

**Solution — layered caching:**

```
CDN (s-maxage=60, stale-while-revalidate=300)
  → Product list API is public, safe to cache at edge
  → Purge via surrogate key on product update webhook

TanStack Query (staleTime: 5 * 60 * 1000)
  → Products stay fresh for 5 minutes in app memory
  → Navigating list → detail → list is instant (cache hit)
  → On mutation (admin update), invalidateQueries(['products'])
```

**Result:** First visit served from CDN edge (~30ms). Subsequent navigations within the SPA are instant (0ms, memory cache). Product updates propagate within 60s via CDN revalidation + immediate app-level invalidation for the admin.

### Example 2: Lighthouse Score at SAP (Hruday's Context)

At SAP Labs, our micro-frontend dashboard loaded user-specific analytics data on every route change. Lighthouse performance dropped to 60 due to blocking API calls during navigation.

**Fix applied:**
1. **HTTP cache headers**: Added `Cache-Control: private, max-age=0, must-revalidate` + `ETag` for user-specific endpoints. Browser revalidates (304) instead of full re-download.
2. **TanStack Query with staleTime: 30s**: Dashboard data stays fresh for 30s. Tab-switching between micro-frontends is instant.
3. **Prefetching**: On hover over navigation links, `queryClient.prefetchQuery` fetches next route's data.
4. **SSR dehydration**: Initial dashboard load hydrates from server-side prefetch — no loading spinner.

**Result:** Lighthouse 60 → 95. Time-to-interactive dropped by 2.1s.

### Example 3: Real-Time Chat with Caching

For a chat application, messages must be fresh but historical messages rarely change.

```typescript
// Recent messages: short staleTime, frequent refetch
useQuery({
  queryKey: ['messages', channelId, 'recent'],
  queryFn: () => fetchMessages(channelId, { limit: 50 }),
  staleTime: 5_000,         // 5 seconds
  refetchInterval: 10_000,  // poll every 10s as fallback to WebSocket
});

// Historical messages: long staleTime, rarely changes
useQuery({
  queryKey: ['messages', channelId, 'history', page],
  queryFn: () => fetchMessages(channelId, { page, limit: 100 }),
  staleTime: Infinity,      // never refetch unless invalidated
});
```

WebSocket events trigger targeted invalidation:
```typescript
socket.on('new_message', (msg) => {
  queryClient.setQueryData(['messages', msg.channelId, 'recent'], (old) => ({
    ...old,
    messages: [...old.messages, msg],
  }));
});
```

────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

> **"Walk me through how you'd design the caching strategy for a data-heavy dashboard."**
>
> "I approach API caching as a three-layer problem. At the outermost layer, I configure HTTP cache headers — for public, read-heavy endpoints like a product catalog, I'd set `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` so the CDN serves cached responses and revalidates in the background. For user-specific data, I use `private` with ETags so the browser can do conditional requests and get 304s instead of full payloads.
>
> At the CDN layer, I leverage surrogate keys or cache tags for granular purging. When a product updates, a webhook purges only that product's cached pages rather than the entire cache.
>
> At the application layer, I use TanStack Query with a carefully tuned `staleTime`. For our dashboard at SAP, I set staleTime to 30 seconds — frequent enough to stay fresh, but users navigating between views within that window get instant cache hits. I pair this with prefetching on link hover and SSR dehydration so the initial load has no loading spinner.
>
> For mutations, I use optimistic updates — the UI reflects the change immediately, and if the server rejects it, `onError` rolls back to the snapshot taken in `onMutate`. After settlement, I invalidate related queries to ensure consistency.
>
> The key mistake I've seen teams make is setting staleTime to 0 (the default) and wondering why their API is getting hammered. Another is caching authenticated responses at the CDN without `Vary: Authorization` or `Cache-Control: private` — that's a security incident. I always audit cache headers with the Network panel and verify CDN behavior with `cf-cache-status` or `x-vercel-cache` headers."

────────────────────────────────────────────────────────────────

## 5. Code Examples

### 5.1 — TanStack Query: Full Setup with Cache Configuration

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s — data considered fresh
      gcTime: 10 * 60 * 1000,     // 10 min — keep inactive entries
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
    mutations: {
      retry: 1,
    },
  },
});
```

```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product } from '../types';

const PRODUCTS_KEY = ['products'] as const;

export function useProducts(category?: string) {
  return useQuery({
    queryKey: category ? [...PRODUCTS_KEY, { category }] : PRODUCTS_KEY,
    queryFn: async () => {
      const params = category ? `?category=${category}` : '';
      const res = await fetch(`/api/products${params}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json() as Promise<Product[]>;
    },
    staleTime: 5 * 60_000, // override default: 5 min for products
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Partial<Product> & { id: string }) => {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      return res.json() as Promise<Product>;
    },

    // Optimistic update
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: PRODUCTS_KEY });

      const previousProducts = queryClient.getQueryData<Product[]>(PRODUCTS_KEY);

      queryClient.setQueryData<Product[]>(PRODUCTS_KEY, (old = []) =>
        old.map((p) => (p.id === newProduct.id ? { ...p, ...newProduct } : p))
      );

      return { previousProducts };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(PRODUCTS_KEY, context.previousProducts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

// Prefetching on hover
export function prefetchProduct(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.prefetchQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: () => fetch(`/api/products/${id}`).then((r) => r.json()),
    staleTime: 60_000,
  });
}
```

### 5.2 — SWR Comparison

```typescript
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useProducts(category?: string) {
  const key = category ? `/api/products?category=${category}` : '/api/products';

  const { data, error, isLoading } = useSWR<Product[]>(key, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
    refreshInterval: 0,           // no polling
    errorRetryCount: 2,
  });

  return { products: data, error, isLoading };
}

// Manual mutation + revalidation (SWR's optimistic update pattern)
export async function updateProduct(product: Partial<Product> & { id: string }) {
  // Optimistic local mutation
  mutate(
    '/api/products',
    (current: Product[] | undefined) =>
      current?.map((p) => (p.id === product.id ? { ...p, ...product } : p)),
    false // don't revalidate yet
  );

  await fetch(`/api/products/${product.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });

  // Revalidate after server confirms
  mutate('/api/products');
}
```

### 5.3 — Express Middleware: HTTP Cache Headers

```typescript
import { Request, Response, NextFunction } from 'express';

interface CacheConfig {
  public?: boolean;
  maxAge?: number;        // browser cache seconds
  sMaxAge?: number;       // CDN cache seconds
  swr?: number;           // stale-while-revalidate seconds
  immutable?: boolean;
  private?: boolean;
}

export function cacheControl(config: CacheConfig) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const directives: string[] = [];

    if (config.private) directives.push('private');
    else if (config.public) directives.push('public');

    if (config.maxAge !== undefined) directives.push(`max-age=${config.maxAge}`);
    if (config.sMaxAge !== undefined) directives.push(`s-maxage=${config.sMaxAge}`);
    if (config.swr !== undefined) directives.push(`stale-while-revalidate=${config.swr}`);
    if (config.immutable) directives.push('immutable');

    res.setHeader('Cache-Control', directives.join(', '));
    next();
  };
}

// Usage
app.get('/api/products',
  cacheControl({ public: true, sMaxAge: 60, swr: 300 }),
  productsHandler
);

app.get('/api/user/profile',
  cacheControl({ private: true, maxAge: 0 }),
  etagMiddleware(),  // adds ETag + handles If-None-Match → 304
  profileHandler
);

app.get('/static/bundle.:hash.js',
  cacheControl({ public: true, maxAge: 31536000, immutable: true }),
  staticHandler
);
```

### 5.4 — RTK Query: Tag-Based Cache Invalidation

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Product'],

  endpoints: (builder) => ({
    getProducts: builder.query<Product[], { category?: string }>({
      query: ({ category } = {}) =>
        category ? `products?category=${category}` : 'products',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
      keepUnusedDataFor: 300, // 5 minutes
    }),

    getProduct: builder.query<Product, string>({
      query: (id) => `products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),

    updateProduct: builder.mutation<Product, Partial<Product> & { id: string }>({
      query: ({ id, ...body }) => ({
        url: `products/${id}`,
        method: 'PUT',
        body,
      }),
      // Automatically refetches any query providing matching tags
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({ url: `products/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;
```

### 5.5 — SSR Cache Dehydration (Next.js App Router)

```typescript
// app/products/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { ProductList } from './ProductList';

export default async function ProductsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(`${process.env.API_URL}/products`, {
        next: { revalidate: 60 }, // Next.js ISR
      });
      return res.json();
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductList />
    </HydrationBoundary>
  );
}
```

────────────────────────────────────────────────────────────────

## 6. Anti-Patterns

| Anti-Pattern                                  | Why It's Harmful                                                       | Fix                                                    |
|-----------------------------------------------|------------------------------------------------------------------------|---------------------------------------------------------|
| `staleTime: 0` (default) for stable data     | Every mount triggers a refetch; API gets hammered                      | Set `staleTime` proportional to data change frequency   |
| Caching user-specific data in CDN             | PII leak: one user's data served to another                            | `Cache-Control: private` or `Vary: Authorization`       |
| Over-aggressive cache-busting (`?t=Date.now()`)| Defeats all cache layers; every request is unique                     | Use content-hash in filename or proper ETag             |
| Not invalidating on mutation                  | Stale data persists after user action; broken UX                       | `invalidateQueries` after mutation settles              |
| Using `no-cache` thinking it means "no caching"| `no-cache` means "revalidate before use" — still caches              | Use `no-store` if you truly want zero caching           |
| Single global `staleTime` for all queries     | Chat messages and product catalog have very different freshness needs  | Per-query `staleTime` based on data volatility          |
| Caching error responses                       | Users stuck seeing errors even after fix deployed                      | Never cache 4xx/5xx; set `retry` and error boundaries   |
| Ignoring `gcTime` with large datasets         | Memory leak in long-lived SPAs                                        | Reduce `gcTime` for large payloads; monitor memory      |
| CDN caching without purge strategy            | Stale content served for hours after update                            | Implement webhook-based purge with surrogate keys       |
| Mixing SW cache + React Query without coord.  | Double-caching: SW returns stale, RQ treats it as fresh               | Choose primary cache layer; SW for offline, RQ for UX   |

────────────────────────────────────────────────────────────────

## 7. Why & How Summary

| Question                                        | Answer                                                                |
|-------------------------------------------------|-----------------------------------------------------------------------|
| **Why multi-layer caching?**                    | Each layer has different persistence, scope, and invalidation models. Composing them covers all scenarios from zero-latency in-app navigation to geo-distributed CDN delivery. |
| **Why TanStack Query over manual fetch+state?** | It normalizes server state management: deduplication, background refetching, cache invalidation, optimistic updates, retry logic — all declaratively configured. Manual approaches reinvent this poorly. |
| **Why `staleTime` matters?**                    | It's the single most impactful config in React Query. Default 0 means every mount refetches. Setting it to 30s can reduce API calls by 90% for navigation-heavy SPAs. |
| **How to choose between SWR and TanStack Query?** | SWR for simple apps with minimal mutation logic (~4KB). TanStack Query for complex apps needing devtools, optimistic updates, infinite queries, SSR dehydration (~13KB). |
| **How to prevent CDN security incidents?**      | Always set `Cache-Control: private` for authenticated endpoints. Use `Vary: Cookie` or `Vary: Authorization` if CDN caching is needed. Audit with CDN cache-status headers. |
| **How does RTK Query differ from React Query?** | RTK Query uses declarative tag-based invalidation (no manual `invalidateQueries`). It's ideal if already using Redux. React Query is framework-agnostic with richer cache controls. |
| **When to use HTTP stale-while-revalidate?**    | For CDN/browser-level SWR — serve stale while revalidating in background. Pair with application-level SWR patterns for double-layered background revalidation. |
| **How to debug caching issues?**                | Network panel: check `Cache-Control`, `ETag`, `cf-cache-status`. React Query Devtools: inspect stale/fresh status. Disable cache layers one at a time to isolate. |

────────────────────────────────────────────────────────────────

*Prepared for Hruday — SAP Labs | Senior Frontend Engineer Interview Prep (Microsoft / Adobe / Salesforce / Cisco)*
