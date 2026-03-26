# Cache-Based State Management Patterns
> Part 13 — State Management
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Most "global state" is a cache**: when you look at a Redux store and see `products: Product[]`, `orders: Order[]`, `user: User` — this is fetched server data that was stored in Redux as a substitute for a proper cache; TanStack Query and RTK Query reframe this as "we ARE building a cache, let's do it right," with staleness TTLs, background refresh, and invalidation
- **Stale-While-Revalidate (SWR)**: return stale/cached data immediately (fast response), fetch fresh data in the background, update UI when fresh data arrives; this is what TanStack Query does by default when `staleTime > 0` — immediate data display, background refresh, no loading spinner for data already in cache
- **Cache invalidation strategies**: (1) Tag-based (RTK Query `invalidatesTags`) — mark related cache entries stale after mutations; (2) Time-based (`staleTime`, `gcTime`) — data expires after a TTL; (3) Manual (`queryClient.invalidateQueries`) — explicitly mark stale from anywhere; (4) Optimistic — update cache immediately, rollback on error; (5) Polling (`refetchInterval`) — re-fetch on a schedule
- **`localStorage` as persistence layer**: Redux Persist, Zustand `persist` middleware, `@tanstack/query-persist-client-core` — persist the in-memory cache to `localStorage` so it survives page refreshes; use for data that doesn't change frequently (user preferences, cart contents between sessions); NEVER persist sensitive data (tokens, PII) to `localStorage` — use `sessionStorage` or server-side sessions instead
- **Optimistic updates**: update the cache immediately when the user acts (before API response); show the change instantly; if API fails, roll back; makes CRUD-heavy apps feel instant; best for predictable mutations (adding a like, moving a card, checking a checkbox)
- **HTTP cache headers** (server-side cache): `Cache-Control: max-age=3600` tells the browser to serve the resource from its own cache for 1 hour without a network request; `ETags` for conditional GET; `Cache-Control: no-cache` means always validate with server (using ETag) but use cached version if unchanged; these are complementary to client-side caches like TanStack Query
- ✅ **Hruday's anchor**: SAP Commerce Cloud — product catalog with HTTP cache headers (CDN-served, `max-age=300`) + RTK Query client cache (staleTime=60s) + Redis server-side cache (30 min) — three-layer cache reduced API server load by 80% during peak catalog browsing traffic

---

## 1. One-Line Definition
Cache-based state management recognizes that most frontend global state is server data that needs a cache contract (staleness, invalidation, refresh), and applies structured caching strategies — stale-while-revalidate, tag-based invalidation, optimistic updates, and persistence — to manage server data correctly rather than treating it as arbitrary mutable Redux state.

---

## 2. The Problem It Solves

The "store everything in Redux" antipattern exists because Redux was the first popular answer to "how do I share server data between components?" It works — but it conflates two different things: client-owned state (cart contents, auth token, UI preferences) and server-synchronized data (product catalogue, order history, user profile).

Server data has properties that client state doesn't:
- It can change on the server without the client knowing
- Multiple clients might be modifying the same data simultaneously
- It needs to be refreshed periodically to stay accurate
- After a mutation, related queries must be re-fetched

Managing server data in Redux means manually implementing all of these cache behaviors: loading/error flags, manual invalidation after mutations, `lastFetched` timestamps for TTL checking, request deduplication by checking `if (loading) return`. This is building a cache, but poorly.

Cache-based state management — through TanStack Query, RTK Query, or purpose-built strategies — accepts that "this is a cache" and designs the state management accordingly: cache keys identify queries, TTLs control staleness, tag systems provide structured invalidation, and optimistic updates give instant feedback with rollback safety.

The conceptual shift: "I have a products array in Redux" becomes "I have a cache entry keyed by `['products', filters]` that is valid for 60 seconds and is invalidated when a product mutation occurs."

---

## 3. How It Works Internally

### Three-Layer Cache Model

```
Frontend Cache Layers (SAP Commerce example):

═══════════════════════════════════════════════════
LAYER 1 — HTTP / CDN Cache (browser + CDN)
═══════════════════════════════════════════════════
Response headers: Cache-Control: max-age=300, s-maxage=3600
  → Browser caches the response for 5 minutes
  → CDN caches for 1 hour (serves from edge, no origin hit)
  → Perfect for: static product images, category structure, SEO pages
  → Controlled by: server (send the right headers)

Even TanStack Query bypasses this layer — the browser's HTTP cache
serves the response before TanStack Query's fetch even completes.

═══════════════════════════════════════════════════
LAYER 2 — JavaScript Client Cache (TanStack Query / RTK Query)
═══════════════════════════════════════════════════
In-memory, key-value store:
  Key:    ['products', { category: 'laptops', page: 1 }]
  Value:  { data: [...], dataUpdatedAt: timestamp, status: 'success' }

staleTime: 60_000       → Fresh for 60s; no background refetch during this window
gcTime: 5 * 60_000      → Unused data survives 5 min in cache after last subscriber unmounts

  → Handles: loading/error/success states, deduplication, background refresh
  → Invalidated by: tag system, queryClient.invalidateQueries(), time expiry

═══════════════════════════════════════════════════
LAYER 3 — Server-Side Cache (Redis / CDN / DB query cache)
═══════════════════════════════════════════════════
Spring Boot application:
  @Cacheable("products")
  public List<Product> getProducts(ProductFilters filters) { ... }

  → Redis stores the result for 30 minutes
  → DB query not executed if Redis hit
  → Invalidated by admin actions or scheduled refresh

Full request flow on cache hit at each layer:
  Request → Browser HTTP cache hit → Return in ~1ms (no network)
  Request → HTTP cache miss → TanStack Query cache hit → Return in ~0ms (in-memory)
  Request → Both client caches miss → API call → Redis hit → Return in ~5ms (no DB)
  Request → All caches miss → Full DB query → ~50-200ms
```

### Stale-While-Revalidate Pattern

```
User visits product listing page (second visit, products were cached):

Time 0ms:   Component mounts, TanStack Query checks cache
Time 0ms:   Cache HIT — staleTime expired 30s ago → data is STALE
Time 0ms:   Return stale data immediately to component (isLoading: false! Data shows!)
Time 0ms:   Background fetch triggered (isFetching: true)
Time 150ms: API responds with fresh data
Time 150ms: Cache updated with fresh data
Time 150ms: Component re-renders with fresh data (user may not notice unless data changed)

Result:
  User experience: Page shows in 0ms with previous data, then silently updates
  vs traditional: Page shows spinner for 150ms, then data appears → worse UX

Controls:
  staleTime: 60_000  → No SWR during first 60s (data is fresh)
  staleTime: 0       → Always revalidate in background on mount (default in TanStack Query)
  staleTime: Infinity → Never revalidate (static data)
```

---

## 4. The Code

### Wrong Way — Ad-hoc Cache in Redux

```typescript
// ❌ WRONG — Manually implementing cache in Redux (reinventing TanStack Query poorly):

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [] as Product[],
    loading: false,
    error: null as string | null,
    // ❌ Manual cache TTL tracking
    lastFetched: null as number | null,
    // ❌ Manual per-request deduplication
    currentRequest: null as AbortController | null,
  },
  reducers: {
    setLoading: (state) => { state.loading = true; state.error = null; },
    setData: (state, action) => {
      state.loading = false;
      state.items = action.payload;
      state.lastFetched = Date.now();   // ❌ TTL tracking by hand
    },
    setError: (state, action) => { state.loading = false; state.error = action.payload; },
  }
});

// ❌ Thunk with manual cache check:
const fetchProductsIfNeeded = (filters: ProductFilters) => async (dispatch: AppDispatch, getState: () => RootState) => {
  const state = getState().products;
  
  // ❌ Manual staleness check — none of the nuance of staleTime/gcTime
  const FIVE_MINUTES = 5 * 60 * 1000;
  if (state.lastFetched && (Date.now() - state.lastFetched) < FIVE_MINUTES) {
    return;  // ❌ Not stale yet — but is this per-filter? No! Same TTL for all filter combinations!
  }
  
  // ❌ No deduplication — two components calling this simultaneously make two requests
  dispatch(setLoading());
  try {
    const data = await api.getProducts(filters);
    dispatch(setData(data));
  } catch (err) {
    dispatch(setError(err.message));
  }
};

// ❌ After creating a product:
const handleCreate = async (product: CreateProductRequest) => {
  await api.createProduct(product);
  // ❌ Must manually trigger refetch — no automatic invalidation
  dispatch(fetchProducts(currentFilters));
  // ❌ What if there are 5 other filter combinations cached? None of them are invalidated.
};
// This code reimplements ~20% of what TanStack Query does, but broken:
// no per-key staleness, no deduplication, no background refetch, incomplete invalidation
```

> **Why this fails:** manual TTL is global, not per query key; no request deduplication; mutations don't invalidate all related cache entries; no background refresh; no stale-while-revalidate; reinventing the wheel poorly.

### Right Way — Structured Cache with TanStack Query + HTTP Headers

```typescript
// ✅ RIGHT — Layered cache strategy:

// === Layer 1: HTTP cache headers on the API (Spring Boot Example) ===
// ProductController.java
@GetMapping("/api/products")
public ResponseEntity<Page<ProductDto>> getProducts(
    @RequestParam Map<String, String> filters) {
    
  Page<ProductDto> products = productService.getProducts(filters);
  
  // ✅ Public routes (CDN-cacheable): aggressive HTTP caching
  return ResponseEntity.ok()
    .cacheControl(CacheControl
      .maxAge(Duration.ofSeconds(60))           // Browser: fresh for 60s
      .sMaxAge(Duration.ofMinutes(10))          // CDN/shared cache: fresh for 10 min
      .staleWhileRevalidate(Duration.ofMinutes(5)))  // SWR at HTTP level too
    .eTag(String.valueOf(products.hashCode()))  // Conditional GET support
    .body(products);
}

// ✅ User-specific routes: no public caching, short private cache
@GetMapping("/api/users/me/orders")
public ResponseEntity<List<OrderDto>> getMyOrders() {
  // ✅ Cache-Control: private = only browser caches, not CDN
  return ResponseEntity.ok()
    .cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).cachePrivate())
    .body(orderService.getMyOrders());
}


// === Layer 2: Client-side cache with TanStack Query ===

// ✅ Query key factory — all cache keys in one place:
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (filters: ProductFilters) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  orders: {
    mine: ['orders', 'me'] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
};

// ✅ Global QueryClient defaults per data category:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,    // 30s default (aligns with server Cache-Control max-age=30)
      gcTime: 1000 * 60 * 5,   // 5 min unused data retention
      retry: 2,
    },
  },
});

// ✅ Products query — align staleTime with HTTP Cache-Control max-age:
const useProducts = (filters: ProductFilters) =>
  useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => api.getProducts(filters),
    staleTime: 1000 * 60,     // 60s — matches HTTP Cache-Control: max-age=60
    // ✅ When HTTP cache returns 304 Not Modified, TanStack Query gets no new data
    // and the cache entry stays fresh — HTTP and JS cache work together
  });

// ✅ Tag-based cache invalidation after mutations (RTK Query example):
// products.api.ts
export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Product', 'ProductList'],
  endpoints: (builder) => ({
    getProducts: builder.query<PaginatedResponse<Product>, ProductFilters>({
      query: (filters) => ({ url: '/products', params: filters }),
      providesTags: (result, error, arg) => [
        'ProductList',                                           // List-level tag
        ...(result?.items ?? []).map(p => ({ type: 'Product' as const, id: p.id }))
        // Individual entity tags — editing one product invalidates only its queries
      ],
    }),
    
    createProduct: builder.mutation<Product, CreateProductRequest>({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: ['ProductList'],
      // ← A new product was added → invalidate all product LIST queries
      // (don't invalidate individual product queries — they're still valid)
    }),
    
    updateProduct: builder.mutation<Product, { id: string; patch: Partial<Product> }>({
      query: ({ id, patch }) => ({ url: `/products/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Product', id }],
      // ← Only invalidate queries that provided tags for this specific product ID
    }),
  }),
});


// ✅ Optimistic updates for instant UX:
const useLikePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId: string) => api.likePost(postId),
    
    onMutate: async (postId) => {
      // Cancel any in-flight refetches for this query
      await queryClient.cancelQueries({ queryKey: ['posts', postId] });
      // Snapshot current cache
      const previous = queryClient.getQueryData<Post>(['posts', postId]);
      // Optimistically update: increment likes immediately
      queryClient.setQueryData<Post>(['posts', postId], old =>
        old ? { ...old, likes: old.likes + 1 } : old
      );
      return { previous };  // For rollback
    },
    
    onError: (error, postId, context) => {
      // API failed — roll back to previous state
      if (context?.previous) {
        queryClient.setQueryData(['posts', postId], context.previous);
      }
      toast.error('Failed to like post');
    },
    
    onSettled: (data, error, postId) => {
      // Always refetch after mutation to ensure server truth is reflected
      queryClient.invalidateQueries({ queryKey: ['posts', postId] });
    },
  });
};


// ✅ Persistence: cache survives page refresh (for non-sensitive data)
// Using @tanstack/query-persist-client-core:
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  // ✅ Only persist the product catalog — not order history (too dynamic)
  // ✅ NEVER persist: authentication data, PII, payment information
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // gcTime must be >= maxAge in persistOptions for persisted queries
      gcTime: 1000 * 60 * 60 * 24,  // 24 hours in memory before GC
    }
  }
});

<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    maxAge: 1000 * 60 * 60,  // 1 hour — persisted cache is considered fresh for 1 hour
    // After 1 hour, persisted cache is ignored and fresh data is fetched
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // ✅ Only persist product catalog queries, not user-specific data
        return query.queryKey[0] === 'products';
      }
    }
  }}
>
  <App />
</PersistQueryClientProvider>
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is stale-while-revalidate and why does it matter for UX?"

**Hruday's answer:**
> Stale-while-revalidate is a cache strategy that says: "Return the cached data immediately, even if it might be outdated, and fetch fresh data in the background to update the cache." It separates data delivery from data freshness.
>
> Why it matters for UX: the main alternative is "don't show anything until fresh data is confirmed." With that approach, every navigation to a cached page shows a loading spinner — even on the second visit. SWR eliminates loading spinners for repeat visits. The user sees data instantly.
>
> The practical flow: user visits the product listing for the first time — loading spinner, data arrives, spinner disappears. User goes to product detail, comes back to the listing. With SWR: the previous product listing data appears immediately (0ms). TanStack Query checks if the data is stale (past `staleTime`). If stale, a background fetch runs. When it completes, the UI silently updates with any changed prices or availability. The user never saw a loading state — and they have reasonably fresh data.
>
> There's a UX case for being careful here: if data can change in a way that would confuse the user (an order that was already shipped but shows as "processing" for 30 more seconds), SWR with an appropriate staleTime is fine. If the data change is important to show immediately (payment status), use `staleTime: 0` with `refetchOnWindowFocus: true` to ensure fresh data on return.

---

### Q2 — Technical Deep Dive
**Interviewer asks:** "How do you decide which data to persist to localStorage?"

**Hruday's answer:**
> I apply a three-question test before persisting anything to localStorage.
>
> First — "Is this sensitive data?" User PII, authentication tokens, payment card information, order details that contain personal data — none of this goes to localStorage. It's accessible to any JavaScript on the page including third-party scripts, it appears in browser DevTools, and it persists across sessions on shared devices. Sensitive data goes to `sessionStorage` at most, or stays in-memory only. At SAP, we explicitly banned JWT tokens from localStorage in the security review — they go to httpOnly cookies only.
>
> Second — "Is this static or slowly-changing enough to be useful across sessions?" A user's preferred theme (dark/light), their shopping cart contents between sessions, a product catalog that changes maybe once a day — these benefit from persistence. Persisting a cart means the user doesn't lose their items on accidental refresh. Persisting static product catalog data means the app feels instant on first load after the first visit. But persisting live order status is counterproductive — the persisted data will be stale and misleading the next visit.
>
> Third — "What happens if the persisted data is stale or corrupted?" For product catalog data, a 1-hour-old version showing slightly wrong prices is a minor inconvenience. For financial data, stale information could cause user harm. The `maxAge` in the persist config controls this: `maxAge: 1000 * 60 * 60` means persisted cache older than 1 hour is discarded and fresh data is fetched. Setting this appropriately per data type is critical.
>
> Summary: persist non-sensitive, slowly-changing data that benefits from offline availability or instant-load behavior. Always set a `maxAge`. Never persist authentication credentials, PII, or financial data.

---

### Q3 — SAP Experience
**Interviewer asks:** "Describe a real caching strategy you implemented in production."

**Hruday's answer:**
> At SAP Labs, I worked on the SAP Commerce Cloud product catalog front end. The catalog served up to 50,000 products across multiple categories with complex filtering. During peak traffic — a promotional sale event — the API servers were handling thousands of requests per minute just for product listing pages.
>
> We implemented a three-layer cache. Layer one was HTTP cache headers on the Spring Boot API. Product listing endpoints used `Cache-Control: max-age=60, s-maxage=600` — fresh for 60 seconds in the browser, 10 minutes in the CDN. Category pages were more aggressive: `max-age=300, s-maxage=3600`. A product image CDN was configured separately with much longer TTLs.
>
> Layer two was RTK Query's client cache with `staleTime: 60_000` aligned with the HTTP max-age. The browser wouldn't make a request for 60 seconds after the first fetch, and if it did, the CDN would serve it. RTK Query used tag-based invalidation: products provided `['Product', 'ProductList']` tags, and mutations (stock level updates from a backend trigger) sent `invalidatesTags: ['ProductList']` to bust the visible product list.
>
> Layer three was Redis at the API layer: `@Cacheable("products")` in Spring Boot caching the product list for 30 minutes. Only the very first request after cache expiry hit the database.
>
> During the sale event, we measured these results: database query rate dropped 80% compared to the previous un-cached version; API response time for product listing went from 180ms average to 8ms average (Redis hits); CDN cache hit rate was 92% for category pages. The backend team was very happy: API servers handled 4x the normal traffic with no additional infrastructure.

---

### Q4 — Architecture Design
**Interviewer asks:** "Design the caching architecture for a high-traffic e-commerce product catalogue."

**Hruday's answer:**
> Three tiers, each with a different purpose and TTL.
>
> Tier 1 — CDN + HTTP browser cache. Product listing pages, category pages, and static product images are served through a CDN. HTTP headers: `Cache-Control: max-age=60, s-maxage=600, stale-while-revalidate=120`. The CDN serves these without hitting origin. The `stale-while-revalidate` header tells CDN: serve stale content up to 2 minutes longer while fetching fresh. Cache invalidation: an admin product update triggers a CDN purge via API.
>
> Tier 2 — Client-side cache (RTK Query or TanStack Query). `staleTime: 60_000` per filter combination — each unique filter query is independently cached. Tag-based invalidation: product mutations invalidate related list tags. For the product catalogue specifically: `providesTags: ['ProductList', ...productIds.map(id => ({ type: 'Product', id }))]`. Stock level changes (high-frequency updates) invalidate only specific product entity tags, not the entire list. This prevents a stock update for laptop A from refetching the entire 1000-item category list.
>
> Tier 3 — Server-side cache (Redis, 30-minute TTL). Spring Boot `@Cacheable` on the product query method. When CDN cache misses and the request reaches the API, Redis serves it without a DB query. Invalidated via programmatic `cacheEvict` on product update events.
>
> Data integrity considerations: price and stock level accuracy are critical. Prices are updated infrequently — 60-minute caches acceptable. Stock levels change in real-time for popular products. Stock-level-specific endpoints should NOT be cached aggressively — use `Cache-Control: no-store` for stock checks. The "add to cart / confirm availability" flow should always hit the origin, not cache.
>
> Monitoring: cache hit rate dashboards per tier; alert if cache hit rate drops below 80% (indicates cache thrashing or misconfigured TTLs); RTK Query DevTools and Redux DevTools for client-tier cache inspection.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "localStorage is secure for caching" | "I use localStorage to cache API responses for offline use" | localStorage is accessible by ANY JavaScript running on the page — including third-party analytic scripts, ad scripts, and any XSS payload; it persists indefinitely until explicitly cleared; it appears in browser DevTools' Application tab; treat all data in localStorage as PUBLIC; never store authentication tokens (use httpOnly cookies), never store user PII (email, name, ID), never store financial data (card details, account numbers, order totals with PII); cache product catalogs and public content in localStorage, but consider them exposed; the security principle: if you'd be uncomfortable if the user's browser extension read this data, don't put it in localStorage |
| "staleTime and cacheTime/gcTime are the same thing" | "staleTime controls how long data stays cached" | They control completely different behaviors; `staleTime` controls how long data is considered FRESH — during this window, no background refetch happens even if the component remounts; after staleTime expires, data is STALE (still in cache, still shown immediately, but a background refetch is triggered on mount); `gcTime` (formerly `cacheTime`) controls how long UNUSED (no active subscribers) data stays in the in-memory cache before garbage collection; a query with `staleTime: 60s, gcTime: 5min` will: stay fresh for 60s (no background refetch), then become stale (background refetch on next mount), and if the component unmounts, the data stays in memory for up to 5 minutes before being cleaned up; the data can be stale and still in the cache — these are orthogonal axes |
| "Optimistic updates are always safe" | "I use optimistic updates everywhere for instant UX" | Optimistic updates are safe for low-risk, highly-predictable mutations: liking a post (worst case: the like fails, rollback happens, user tries again), reordering a list (locally reversible), marking a task done; optimistic updates are risky for: financial transactions (never show "Payment successful" before the API confirms — false confirmation causes user trust issues if it fails and rolls back), destructive operations (don't optimistically delete, show pending state), operations where conflicts are common (collaborative editing where the server might reject due to concurrent edit); the rollback UX must be considered: if you show "Order placed! Order #12345" optimistically and then API fails and rolls back, the user experience is terrible; for these cases, show a pending/loading state and confirm only on API success |
| "Cache invalidation is always sufficient after mutations" | "I call invalidateQueries after every mutation" | Cache invalidation is correct but not always optimal; `invalidateQueries` triggers a refetch, which means even after an instant-response mutation (like toggling a flag), the component shows `isFetching: true` while the refetch completes; for simple updates where the new data is already known (you just set a name via PATCH), use `queryClient.setQueryData` to update the cache directly with the known new value — instant, zero network request; use `invalidateQueries` when: the mutation's effect on the data is not fully predictable (server-side computed fields like "last modified by", "generated ID"), or the mutation affects MULTIPLE unrelated queries that would be hard to enumerate for `setQueryData` |

---

## 7. Hruday's Real Experience Hook
> "The SAP Commerce Cloud three-layer cache story is the clearest data-driven success I can cite for cache architecture. The promotional sale event was a real stress test: 10x normal traffic in a 2-hour window for a flash sale.
>
> Before implementing the caching strategy, the previous year's event required emergency infrastructure scaling — additional API servers were spun up the night before, costing significant cloud compute spend. The API team was on-call during the event watching dashboards.
>
> After the three-layer cache: the same event ran with no infrastructure changes. CDN absorbed 92% of catalog requests. Redis absorbed another 7% that got past CDN. The origin DB handled less than 1% of catalog traffic. API server CPU peak was 23% — compared to 87% the prior year.
>
> The product team's trust in the frontend architecture increased measurably. The cache architecture became the template for other SAP Commerce implementations in the region. What I found most valuable was the tag-based invalidation strategy for stock levels: by using product-level entity tags (not list-level invalidation), stock updates during the sale only refetched the specific product entries, not the entire category list — which would have caused visible loading states during shopping.
>
> The lesson: cache architecture is not a backend concern or a DevOps concern. Frontend engineers who understand caching at all three layers (HTTP, JS client, server) can design solutions that reduce infrastructure cost AND improve user experience simultaneously."

---

## 8. Scale Evolution

**Small app →** `staleTime: 30_000` on TanStack Query as the default; `invalidateQueries` after mutations; no persistence needed; HTTP cache headers on the API if possible; these defaults give most of the benefit with minimal configuration.

**Medium app →** query key factory for organized cache key management; per-endpoint `staleTime` alignment with HTTP `Cache-Control` max-age; tag-based invalidation with `providesTags`/`invalidatesTags` in RTK Query; TanStack Query `persist` middleware for product catalog and public data only; optimistic updates for high-frequency UI actions (likes, reorders).

**Large app / high-traffic (SAP scale) →** three-layer cache with CDN + client JS cache + Redis at API; CDN invalidation on product update events; separate TTL policies per data category (product catalog 60min, prices 10min, stock 0/real-time); cache efficiency monitoring with dashboards; cache warming scripts for anticipated traffic spikes; partial cache invalidation via entity tags to prevent list-level refetch cascades; never persist user-specific or sensitive data client-side.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment method cache (card list, bank account list) — `staleTime: 300s`, invalidated after adding/removing; transaction history — `staleTime: 0` with short `gcTime` (always fresh for financial data); stock/inventory cache for payment links (product-level entity tags); NO localStorage persistence for ANY financial data | Security-aware caching decisions; staleTime for financial vs catalog data; never cache payment data client-side |
| Swiggy / Meesho | Restaurant menu cache (aggressive, rarely changes mid-session); order status — `refetchInterval: 10_000` during active orders (polling-based real-time); product catalog CDN cache for seller storefronts; optimistic add-to-cart; stock level polling for limited-inventory flash sales | Polling vs WebSocket cache refresh tradeoff; optimistic cart updates; flash sale inventory caching |
| Adobe / Microsoft | Large asset library cache (thumbnails, metadata) with HTTP ETags for conditional GET; creative document versioning cache; Microsoft Teams message cache (`refetchOnWindowFocus`, unread count invalidation); SharePoint document library cache with per-user permission-aware cache keys | ETag-based conditional GET; permission-aware cache key design; large-library pagination cache |
| SAP Labs | Direct experience: SAP Commerce Cloud three-layer cache architecture (CDN + RTK Query + Redis); 80% DB query reduction measured; flash sale traffic handled without infrastructure scaling; tag-based invalidation for stock levels; security policy prohibiting sensitive data in localStorage; cache monitoring dashboards | Production story with metrics; three-layer architecture; security policy for caching; business impact of cache design |

---

## 10. Related Topics — What to Study Next

- **Topic 227 — TanStack Query** — the primary implementation of cache-based state management for React; all the `staleTime`, `gcTime`, optimistic update, and `invalidateQueries` patterns in this topic are implemented through TanStack Query's API; this topic (233) is the strategic layer, topic 227 is the tactical implementation
- **Topic 225 — Redux Toolkit & RTK Query** — the alternative to TanStack Query when Redux is already in use; RTK Query's `providesTags`/`invalidatesTags` system is the most structured cache invalidation pattern available in the ecosystem; the three-layer cache architecture at SAP used RTK Query at the client tier
- **Topic 231 — URL as State** — URL params as cache keys is the pattern that combines URL state with TanStack Query cache; when URL changes (new filter applied), the query key changes, the cache is checked for that key combination, and if missing a fetch is triggered; the URL-to-queryKey relationship is the bridge between navigation state and cache state
- **Topic 230 — Avoiding Over-Global State** — cache-based thinking reframes the question "should this be in Redux?" by identifying that most Redux global state IS server data cache; accepting that framing and using TanStack Query or RTK Query for server data eliminates the largest category of over-global Redux state; together 230 and 233 represent the complete argument for "most things don't need Redux"

---

*Part 13 · Cache-Based State Management Patterns · Full Stack Interview Guide · Hruday D · 2026*
