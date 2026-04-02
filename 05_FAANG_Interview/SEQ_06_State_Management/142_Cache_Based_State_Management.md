# 142. Cache-Based State Management
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Cache-based state management treats fetched server data as a cache entry — not application state that you own, but a local copy of server truth that may go stale. The cache has a lifetime, can be invalidated, and is shared transparently across all components that request the same key. TanStack Query is the canonical React implementation: every query has a `queryKey`, data is stored by that key, and all components requesting the same key share one cache entry and one in-flight network request. The critical configuration axis is `staleTime` (how long before data is considered stale — trigger for background refetch) and `gcTime` (how long unused data stays in cache before being garbage collected). Getting these values right per data type is the difference between a snappy, efficient app and one that either never refreshes or hammers the server.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Cache Lifecycle

```typescript
// TanStack Query cache entry lifecycle:
//
//  ① FRESH        → data just fetched, within staleTime → served from cache, no refetch
//  ② STALE        → past staleTime → served from cache (instantly), background refetch triggered
//  ③ FETCHING     → in-flight request → shows loading indicator (if no cached data yet)
//  ④ INACTIVE     → component unmounted, no subscribers → starts gcTime countdown
//  ⑤ DELETED      → gcTime elapsed with no subscribers → removed from memory
//
// Default timings:
//  staleTime = 0     (data is stale immediately on receipt — always background-refetches)
//  gcTime    = 5min  (unused cache entries live 5 minutes before being garbage collected)

// Per-query configuration:
const { data } = useQuery({
  queryKey: ['products', categoryId],
  queryFn: () => api.products.list(categoryId),
  staleTime: 5 * 60 * 1000,   // 5 minutes: product catalog changes infrequently
  gcTime:   30 * 60 * 1000,   // 30 minutes: keep in cache after unmount (fast navigation back)
});
```

### Query Key Design — The Architecture of Your Cache

```typescript
// Query keys are the foundation of the cache. 
// They must uniquely identify a data request — think of them as a cache key in Redis.

// Pattern: hierarchical arrays from general → specific
//   ['resource']                  → list of all resources
//   ['resource', id]              → single resource
//   ['resource', id, 'related']   → sub-resource
//   ['resource', { filters }]     → filtered list

// Examples:
['users']                         // all users
['users', user.id]                // single user  
['users', user.id, 'posts']       // this user's posts (sub-resource)
['products', { category, brand, priceRange }]  // filtered product list
['orders', { status: 'pending', page: 2 }]     // paginated filtered orders

// CRITICAL: Invalidation uses prefix matching
// queryClient.invalidateQueries({ queryKey: ['users'] })
// → invalidates ['users'], ['users', '123'], ['users', '123', 'posts']
// → ALL user-related queries updated after a user mutation

// The organization principle: would it make sense to invalidate these together?
// If YES → put them under the same prefix

// ---- Query Key Factory (eliminates magic strings) ----
// query-keys/users.ts
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Usage — no magic strings anywhere
const { data: users } = useQuery({ queryKey: userKeys.list(filters), queryFn: ... });
const { data: user }  = useQuery({ queryKey: userKeys.detail(id), queryFn: ... });

// Invalidate all user queries after mutation:
queryClient.invalidateQueries({ queryKey: userKeys.all });
// Invalidate only single user:
queryClient.invalidateQueries({ queryKey: userKeys.detail(updatedId) });
```

### Stale Time Strategy — Per Data Type

```typescript
// staleTime = 0 (default) is safe but inefficient — always re-fetches in background
// Set staleTime based on how frequently the data changes on the server

const queryConfig = {
  // User identity — changes infrequently, good to cache
  currentUser: {
    staleTime: 10 * 60 * 1000,  // 10 minutes: re-fetch after navigating away for 10+ min
    gcTime: 60 * 60 * 1000,     // 1 hour: keep when logged-out page revisit
  },

  // Product catalog — changes daily, not per-minute
  products: {
    staleTime: 5 * 60 * 1000,   // 5 minutes
    gcTime: 30 * 60 * 1000,     // 30 minutes
  },

  // Shopping cart — changes on every add/remove; keep fresh
  cart: {
    staleTime: 30 * 1000,       // 30 seconds: changes frequently
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true, // sync cart when tab regains focus (another tab modified it)
  },

  // Real-time dashboard metrics — near real-time freshness needed
  dashboardMetrics: {
    staleTime: 0,               // always stale → every mount triggers fetch
    gcTime: 0,                  // don't cache — always fresh
    refetchInterval: 30 * 1000, // poll every 30 seconds
    refetchIntervalInBackground: false, // pause polling when tab hidden
  },

  // Reference data — almost never changes
  countryCodes: {
    staleTime: 24 * 60 * 60 * 1000,  // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

// Apply globally via QueryClient defaults or per-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // default 5 minutes for all queries
      gcTime: 10 * 60 * 1000,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),  // exponential backoff
    },
  },
});
```

### Manual Cache Manipulation

```typescript
const queryClient = useQueryClient();

// ---- setQueryData: write to cache directly (for optimistic updates) ----
queryClient.setQueryData<User>(userKeys.detail(id), (old) => ({
  ...old!,
  name: newName,
}));

// ---- invalidateQueries: mark stale + trigger background refetch ----
queryClient.invalidateQueries({ queryKey: userKeys.all });

// ---- getQueryData: read cache without subscribing ----
const cachedUser = queryClient.getQueryData<User>(userKeys.detail(id));

// ---- prefetchQuery: fetch into cache without any component subscribing ----
// Use case: hover over a link → prefetch destination page data
async function prefetchProductDetail(productId: string) {
  await queryClient.prefetchQuery({
    queryKey: ['products', productId],
    queryFn: () => api.products.get(productId),
    staleTime: 5 * 60 * 1000,  // only prefetch if cache is stale
  });
}

// onHover handler — prefetch on hover
<ProductCard
  onMouseEnter={() => prefetchProductDetail(product.id)}
  onClick={() => navigate(`/products/${product.id}`)}
/>

// ---- removeQueries: force-remove from cache (e.g., on logout) ----
function handleLogout() {
  // Remove all user-specific cached data
  queryClient.removeQueries({ queryKey: userKeys.all });
  queryClient.removeQueries({ queryKey: ['cart'] });
  queryClient.removeQueries({ queryKey: ['orders'] });
  // Keep product catalog cache (not user-specific)
  authStore.logout();
}
```

### Hydration — Next.js SSR + TanStack Query Cache

```typescript
// Problem: Server renders with data, client hydrates — without sharing cache,
// the client re-fetches immediately on mount (flicker + double request)

// Next.js App Router solution: prefetch on server, dehydrate to client

// app/products/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

export default async function ProductsPage() {
  const queryClient = new QueryClient();

  // Prefetch on server — populates the server-side QueryClient cache
  await queryClient.prefetchQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list(),
  });

  return (
    // HydrationBoundary serializes cache state and hydrates client-side QueryClient
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductList />  {/* Client Component — can use useQuery, cache is pre-populated */}
    </HydrationBoundary>
  );
}

// ProductList.tsx (Client Component)
'use client';
function ProductList() {
  // On first render, data is immediately available (from hydrated cache)
  // No loading spinner — data was prefetched on server
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list(),  // Only called if cache is stale
  });
  return <ul>{products?.map(p => <ProductCard key={p.id} product={p} />)}</ul>;
}
```

### Normalized vs Non-Normalized Cache

```typescript
// TanStack Query: non-normalized cache
// Each queryKey maps to its response — no entity-level deduplication

// Problem:
// ['users']           → [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]
// ['users', '1']      → { id: '1', name: 'Alice', email: 'alice@example.com' }
//
// When Alice's name changes: must invalidate BOTH ['users'] AND ['users', '1']
// Otherwise list shows old name, detail shows new name → inconsistency

// Solutions:
// 1. Invalidate broad key: queryClient.invalidateQueries({ queryKey: ['users'] })
//    → covers both list + detail (list key is a prefix match)

// 2. setQueryData on list + detail (surgical, no re-fetch)
const updateUserName = (id: string, name: string) => {
  // Update detail
  queryClient.setQueryData<User>(userKeys.detail(id), old => ({ ...old!, name }));
  // Update within list
  queryClient.setQueryData<User[]>(userKeys.lists(), old =>
    old?.map(u => u.id === id ? { ...u, name } : u) ?? []
  );
};

// 3. Apollo (GraphQL) — normalized cache by __typename + id
// Apollo maintains a single entity store; updating Alice once updates ALL places she appears
// Tradeoff: GraphQL-only, more complex setup, larger bundle
```

### Architecture & Component Boundaries

```typescript
// How TanStack Query fits in the full architecture:

// ┌─────────────────────────────────────────────────────────┐
// │                    React Components                      │
// │                                                          │
// │   useQuery (reads)         useMutation (writes)          │
// │         ↕                        ↕                       │
// │          ──── TanStack Query Cache ────                   │
// │                  (in-memory, keyed)                      │
// │                        ↕                                 │
// │               Network / API Layer                        │
// │                    fetch / axios                         │
// └─────────────────────────────────────────────────────────┘
//
// Zustand (client state) is PARALLEL to this — no overlap

// Shared query functions — define once, use from useQuery
// api/users.ts
export const usersApi = {
  list: () => fetch('/api/users').then(r => r.json()),
  get: (id: string) => fetch(`/api/users/${id}`).then(r => r.json()),
  update: (id: string, data: Partial<User>) => fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json()),
};

// hooks/users.ts — co-locate keys + query functions
export function useUserList() {
  return useQuery({ queryKey: userKeys.lists(), queryFn: usersApi.list });
}
export function useUser(id: string) {
  return useQuery({ queryKey: userKeys.detail(id), queryFn: () => usersApi.get(id), enabled: !!id });
}
```

### Trade-offs

| TanStack Query | Apollo Client | SWR | Manual fetch+Redux |
|---|---|---|---|
| Works with any API | GraphQL only | REST, simple API | Full control |
| Large feature set | Normalized entity cache | Minimal API | Maximum boilerplate |
| Non-normalized | Normalized (entity-level) | Non-normalized | N/A |
| Best for: REST/tRPC | Best for: GraphQL | Best for: simple Next.js | Almost never |

### ⚠️ Anti-Patterns & Pitfalls

- **Using timestamp/random in queryKey** — `queryKey: ['users', Date.now()]` creates a new unique cache entry every render → infinite requests; query keys must be stable
- **Forgetting `enabled: false` for conditional queries** — `useQuery({ queryKey: ['user', id] })` where `id` might be undefined will fetch with undefined → 400/404 on server; always `enabled: !!id`
- **`staleTime: Infinity` for mutable data** — never set infinity unless data truly never changes (e.g., country list) — logs users out holding stale permissions data for entire session
- **Mutating cache directly (reference mutation)** — `data.push(newItem)` on TanStack Query data breaks immutability; always replace via `setQueryData` with a new reference

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the analytics dashboard had 12 different components fetching from 3 different endpoints, using separate `useState + useEffect` patterns. On a route revisit, all 12 components showed loading spinners simultaneously, making 12 duplicate requests (3 endpoints × 4 components each). After migrating to TanStack Query with a shared QueryClient and prefetch-on-hover for the common "back to dashboard" flow: 3 requests total (one per endpoint), stale-while-revalidate served the dashboard instantly on revisit, and the 12 loading spinners collapsed to zero for the common path.

**At FAANG scale:**
- **Microsoft:** Azure Resource Graph queries are cached per subscription — an ARM query result is expensive (runs on 10K+ resources); 5-minute staleTime prevents re-running on every sidebar click while keeping data reasonably fresh
- **Adobe:** Asset Manager — thumbnail cache uses `staleTime: Infinity` for immutable assets (content-addressed by hash); mutable metadata uses 1-minute staleTime
- **Salesforce:** Experience Cloud uses a wire caching layer equivalent to TanStack Query's cache — @wire adapters return cached data synchronously on second invocation, then refresh in background (exact stale-while-revalidate pattern)
- **Cisco:** Topology data for 10K-node fabric — cache is pre-populated at login via `prefetchQuery`; navigation between views is instant because topology is already in cache; topology mutation (adding a device) invalidates `['topology']` prefix and triggers background refresh

---

## 💬 4. Interview Execution

### Sample Answer

> "Cache-based state management flips the mental model from 'I own this data' to 'I have a local cache of server data that may be stale.' The cache has a lifecycle — fresh, stale, inactive, deleted — controlled by `staleTime` and `gcTime`.
>
> The three things that get this right in practice: query key design, staleTime tuning, and mutation invalidation strategy. Query keys must be hierarchical so you can invalidate at the right granularity — `['users']` is the prefix for `['users', id]`, so invalidating `['users']` after any user mutation refreshes both the list and any open detail views.
>
> StaleTime is per data type: product catalog is 5 minutes, user profile is 10 minutes, real-time metrics poll every 30 seconds with `refetchInterval`. Getting these numbers right reduces server requests dramatically while keeping data fresh.
>
> For mutations: optimistic update → server confirmation → `invalidateQueries` on settle. This gives instant feedback, rolls back on error, and keeps the cache consistent. At SAP, combining this with prefetch-on-hover eliminated both loading states and duplicate requests — a 65% reduction in network requests with zero user-visible degradation."

### Likely Follow-up Questions
1. "What's the difference between `staleTime` and `gcTime`?" → staleTime: while within this window, no refetch (even on mount); gcTime: how long the cache entry survives with no subscribers
2. "How do you invalidate related queries after a mutation?" → `invalidateQueries({ queryKey: prefix })` after mutation's `onSettled`; prefix matching cascades
3. "How do you prefetch for navigation?" → `queryClient.prefetchQuery` in `onMouseEnter` on a Link
4. "How do you share TanStack Query cache with SSR?" → `HydrationBoundary` + `dehydrate` in Server Component → hydrates client QueryClient with server-prefetched data
5. "Can you normalize the cache in TanStack Query?" → Not natively — it's response-addressed, not entity-addressed; surgical `setQueryData` on all affected keys after mutation, or use Apollo for GraphQL if normalization is critical

### vs Alternatives

| TanStack Query | Apollo (GraphQL) | Manual fetch+useState |
|---|---|---|
| REST + any async | GraphQL normalized cache | Full control |
| Response-levelcaching | Entity-level caching | No caching |
| 13KB | 30KB+ | 0KB (but 40% more component code) |

---

## 💻 5. Code Example

```typescript
// Complete cache management setup for a product management app

// ---- Query key factory ----
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), { filters }] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// ---- Hooks ----
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => api.products.list(filters),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,  // keep old data while new filters load
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => api.products.get(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.products.create,
    onSuccess: (newProduct) => {
      // Add to detail cache immediately
      qc.setQueryData(productKeys.detail(newProduct.id), newProduct);
      // Invalidate all lists (any filter set might include this new product)
      qc.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      api.products.update(id, data),

    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: productKeys.detail(id) });
      const prev = qc.getQueryData<Product>(productKeys.detail(id));
      qc.setQueryData<Product>(productKeys.detail(id), old => old ? { ...old, ...data } : old);
      return { prev, id };
    },
    onError: (_, __, ctx) => {
      if (ctx) qc.setQueryData(productKeys.detail(ctx.id), ctx.prev);
    },
    onSettled: (_, __, { id }) => {
      qc.invalidateQueries({ queryKey: productKeys.detail(id) });
      qc.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

// ---- Component using prefetch ----
function ProductCard({ product }: { product: Product }) {
  const qc = useQueryClient();

  const prefetchDetail = useCallback(() => {
    qc.prefetchQuery({
      queryKey: productKeys.detail(product.id),
      queryFn: () => api.products.get(product.id),
      staleTime: 2 * 60 * 1000,
    });
  }, [qc, product.id]);

  return (
    <Link
      to={`/products/${product.id}`}
      onMouseEnter={prefetchDetail}  // prefetch on hover — ~200ms head start
    >
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </Link>
  );
}
```

---

## 🧠 6. Memory Aid

**Cache lifecycle — FSID:**
- **F**resh: within staleTime — served from cache, no request
- **S**tale: past staleTime — served from cache instantly + background refetch
- **I**nactive: no subscribers — gcTime countdown starts
- **D**eleted: gcTime elapsed — removed from memory

**StaleTime guidelines:**
- Reference data (country codes): 24h–Infinity
- User profile: 10 minutes
- Product catalog: 5 minutes
- Cart: 30 seconds
- Real-time metrics: 0 (poll with `refetchInterval`)

**Query key mantra:** "Keys are hierarchical — invalidate at the right level, not too broad, not too narrow."

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The query key factory pattern (`productKeys.all`, `productKeys.list(filters)`, `productKeys.detail(id)`) is a production-essential practice that almost no tutorials show — without it, magic string arrays scattered across files lead to invalidation mismatches where a mutation fails to refresh the data it should; presenting this pattern in an interview signals you have real production experience with TanStack Query, not just tutorial experience
→ `placeholderData: (previousData) => previousData` is the correct solution for filter/pagination loading UX — instead of blanking the list on each filter change (loading flash), the previous results stay visible while new results load; this is the standard for professional list/filter UIs and shows you know TanStack Query beyond the basics
→ The SSR hydration pattern (`HydrationBoundary` + `dehydrate`) is the key to eliminating the "SSR data waterfall" where data is fetched on server, HTML is rendered, then client refetches the same data because the cache is empty on hydration — knowing this prevents the double-fetch and eliminates loading spinners on initial page load

**How it works (2 sentences):**
TanStack Query's cache is a JavaScript `Map` keyed by the serialized query key array — on `useQuery` invocation, React Query hashes the key array, looks up the cache entry, checks if it exists and is within `staleTime`, and returns the cached data synchronously if so; if absent or stale, it returns any existing (stale) data immediately for optimistic display and schedules a network request, which on resolution calls `setQueryData` on the cache entry and triggers a render in all active subscribers via React's `useSyncExternalStore`.
Mutation invalidation works by calling `invalidateQueries` with a key prefix, which iterates the cache Map and marks all matching entries as stale — entries that currently have active subscribers get an immediate background refetch triggered; entries without subscribers are marked stale but not refetched until next access, which provides the right behavior (don't refetch invisible data, but serve fresh data when it becomes visible).

---
✅ Topic 142/486 complete → Continuing to Topic 143: React Query / TanStack Query Deep Dive
