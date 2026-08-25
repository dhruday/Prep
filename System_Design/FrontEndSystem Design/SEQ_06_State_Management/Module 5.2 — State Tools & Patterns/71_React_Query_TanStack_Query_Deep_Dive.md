# 71. React Query / TanStack Query Deep Dive ★

## 1. High-Level Explanation (Frontend Interview Level)

**TanStack Query** (formerly React Query) is the industry-standard library for server state management in React applications. It provides a declarative, component-centric API for fetching, caching, synchronising, and updating asynchronous server data. The library distinguishes between **server state** (data that lives on the server, is shared between users, may change without the user's knowledge) and **client state** (UI toggle states, form inputs, modal visibility). TanStack Query handles server state exclusively and excels at it: zero manual loading/error Redux boilerplate, automatic background refresh, request deduplication, focus-on-refetch, offline queue support, and a powerful devtools. At staff level, the conversation shifts to query key design, cache topology planning, and integration with SSR hydration (Next.js App Router).

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Query Keys — The Foundation of the Cache

Query keys are the cache address. They must uniquely identify the data being fetched. The key is serialised (JSON-stringified) to a string internally; the object structure allows partial matching for bulk invalidation:

```typescript
// Simple key — no parameters
useQuery({ queryKey: ['currentUser'], queryFn: fetchCurrentUser });

// Array key — parameters encoded in the key
useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });

// Nested key — complex filters
useQuery({
  queryKey: ['products', { category, priceRange, sortBy, page }],
  queryFn: () => fetchProducts({ category, priceRange, sortBy, page }),
});

// Key hierarchy for bulk operations
queryClient.invalidateQueries({ queryKey: ['products'] });
// ↑ Invalidates ALL: ['products'], ['products', { category }], ['products', { ... }]

queryClient.invalidateQueries({ queryKey: ['products', { category: 'shoes' }] });
// ↑ Invalidates only queries with { category: 'shoes' } in the key
```

**Key design principle:** Keys should contain all variables the queryFn uses. If `userId` changes and the key stays the same, TanStack Query won't know to refetch. The automatic re-run on key change is what makes component data reactive:

```typescript
// ✅ Key includes userId — fetches new user when userId changes
useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });

// ❌ Key doesn't reflect userId — stale data served when userId changes
useQuery({ queryKey: ['user'], queryFn: () => fetchUser(userId) });
```

### Query Lifecycle — States and Transitions

```
                    ┌─────────────────────────────────────────────┐
                    │              Query State Machine             │
                    └─────────────────────────────────────────────┘
                    
                    loading → fetching
                         ↓
              ┌──────────┴──────────┐
              │                     │
           success               error
              │                     │
           fetching              fetching
         (background)          (retry/refetch)
              │                     │
           success               success | error
```

**In component terms:**
```typescript
const {
  data,              // the cached response (undefined while loading)
  error,             // Error object if the query failed
  isLoading,         // true only on first mount with no cached data (initial loading)
  isFetching,        // true whenever any fetch is in-progress (including background refetch)
  isStale,           // true when data is past staleTime threshold
  isSuccess,         // data is available
  isError,           // query ended in error
  status,            // 'pending' | 'success' | 'error'
  fetchStatus,       // 'fetching' | 'paused' | 'idle'
  refetch,           // manually trigger a refetch
  dataUpdatedAt,     // timestamp of last successful fetch
} = useQuery({ queryKey, queryFn });

// Key distinction:
// isLoading = pending + no data at all (first fetch)
// isFetching = any fetch in-progress (first, background, manual refetch)
// Show spinner for isLoading; show subtle indicator for isFetching
```

### Infinite Queries — Pagination with Cursors

```typescript
// useInfiniteQuery: manages paginated/cursor-based queries
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['products', filters],
  queryFn: ({ pageParam = null }) => fetchProducts({ ...filters, cursor: pageParam }),
  
  // Extract the cursor for the next page from the current page's response
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor ?? undefined,
  
  initialPageParam: null,
  
  // Automatically fetch more pages as user scrolls (via Intersection Observer)
  maxPages: 10,   // optional: cap pages in memory to prevent memory growth
});

// data structure for infinite query:
// data.pages: array of page results  → data.pages[0], data.pages[1], ...
// data.pageParams: array of cursors  → data.pageParams[0], data.pageParams[1], ...

const allItems = data?.pages.flatMap(page => page.items) ?? [];
```

### Mutations — Writes with Optimistic Updates

```typescript
const queryClient = useQueryClient();

const addToCart = useMutation({
  mutationFn: (product: Product) => api.cart.addItem(product.id),
  
  onMutate: async (product) => {
    // 1. Cancel any in-flight GET /cart requests (avoid race condition)
    await queryClient.cancelQueries({ queryKey: ['cart'] });
    
    // 2. Snapshot current cart for rollback
    const previousCart = queryClient.getQueryData<Cart>(['cart']);
    
    // 3. Optimistically add item to cart cache
    queryClient.setQueryData<Cart>(['cart'], (old) => ({
      ...old!,
      items: [...(old?.items ?? []), { ...product, quantity: 1 }],
    }));
    
    // Return context for rollback access in onError
    return { previousCart };
  },
  
  onError: (error, variables, context) => {
    // Rollback to snapshot
    if (context?.previousCart) {
      queryClient.setQueryData(['cart'], context.previousCart);
    }
  },
  
  onSettled: () => {
    // Always reconcile with server truth after mutation (success or error)
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  },
});
```

### SSR and Next.js App Router Hydration

```typescript
// app/page.tsx (Next.js App Router — RSC)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import ProductList from '@/components/ProductList';

export default async function ProductsPage() {
  const queryClient = new QueryClient();
  
  // Pre-fetch on the server — populates QueryClient cache
  await queryClient.prefetchQuery({
    queryKey: ['products', {}],
    queryFn: () => serverFetchProducts({}),    // server-side fetch (direct DB or internal API)
    staleTime: 60 * 1000,
  });
  
  // Dehydrate: serialize cache to JSON for transport to client
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* Client components inside can useQuery(['products', {}]) — instant cache hit */}
      <ProductList />
    </HydrationBoundary>
  );
}

// components/ProductList.tsx ('use client')
'use client';
function ProductList() {
  // This hits the dehydrated cache on first render — no loading state!
  const { data } = useQuery({ queryKey: ['products', {}], queryFn: fetchProducts });
  return <>{data?.items.map(p => <ProductCard key={p.id} product={p} />)}</>;
}
```

### Advanced: Query Selectors and Query Observer

```typescript
// select: transform or subscribe to a subset of the cached data
// Component only re-renders when the selected value changes — critical for performance

const { data: productCount } = useQuery({
  queryKey: ['products', filters],
  queryFn: () => fetchProducts(filters),
  select: (data) => data.totalCount,   // re-renders only when totalCount changes
});

// If multiple components useQuery with the same key but different select functions,
// only one network request is made. Each component re-renders only when its selected
// value changes — even if the full data object changed in other ways.
```

---

## 3. Real-World Examples

**Linear (project management):** Uses TanStack Query for all issue data with aggressive staleTime tuning — issues lists staleTime~30s, individual issues staleTime~60s. This allows instant navigation between issues while background refresh keeps data current. The `select` API means the issue list only re-renders when the list of issue IDs changes, not when any single issue changes.

**Vercel Dashboard:** Deployment and domain data uses TanStack Query with a sophisticated query key hierarchy: `['deployments', teamId, projectId, { status, branch }]`. Operations like triggering a new deployment call the mutation which invalidates `['deployments', teamId, projectId]` — all filtering variants refresh simultaneously.

**At Hruday's SAP Labs work:** SAP Analytics Cloud's story metadata and filter state could benefit from TanStack Query's `useInfiniteQuery` for large story lists and `useQuery` with `select` for derived metadata views. The cache dehydration/rehydration pattern is directly applicable to Next.js-based SAP Fiori applications for hybrid rendering.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "TanStack Query manages server state through a global `QueryCache` keyed by query key arrays. The key insight is the `staleTime`/`gcTime` duality: `staleTime` controls when background refetch triggers (default 0 — always refetch in background on mount); `gcTime` controls when unused cache entries are garbage collected (default 5 min). Query deduplication means multiple components with the same key share one in-flight request. The `select` option lets components subscribe to derived values from the cache, so re-renders only occur when the selected value changes. For mutations, the `onMutate`/`onError`/`onSettled` lifecycle enables optimistic updates with automatic rollback. In Next.js App Router, `prefetchQuery` + `dehydrate` serialise the server-populated cache for hydration on the client — no loading state on first render."

**Likely Follow-up Questions:**
1. How does TanStack Query deduplicate requests? → When a query is in `fetching` state and another component mounts with the same key, TanStack Query returns the in-flight promise to the second subscriber — no second network request. Both components resolve simultaneously when the promise settles.
2. What's the difference between `enabled` and `suspense`? → `enabled: false` skips the fetch entirely — useful for dependent queries. `suspense: true` (or `useSuspenseQuery`) uses React's Suspense mechanism: the component suspends while loading, the nearest Suspense boundary shows a fallback; no `isLoading` conditional needed.
3. How do you handle authentication-dependent queries? → `enabled: !!authToken` — query only runs when authToken is truthy. Changing from null to a token re-enables and auto-fetches. This replaces effect-based "fetch after login" patterns.

---

## 5. Code Example

```typescript
// Real pattern: hierarchical query dependencies

function useCurrentUser() {
  return useQuery({ queryKey: ['currentUser'], queryFn: api.auth.me, staleTime: 10_000 });
}

function useUserWorkspaces(userId: string | undefined) {
  return useQuery({
    queryKey: ['workspaces', userId],
    queryFn: () => api.workspaces.list(userId!),
    enabled: !!userId,          // dependent on userId being defined
    staleTime: 5 * 60_000,
  });
}

function useWorkspaceIssues(workspaceId: string | undefined, filters: IssueFilters) {
  return useQuery({
    queryKey: ['issues', workspaceId, filters],
    queryFn: () => api.issues.list(workspaceId!, filters),
    enabled: !!workspaceId,
    staleTime: 30_000,
    select: (data) => ({
      issues: data.items,
      totalCount: data.meta.total,
      groupedByStatus: groupBy(data.items, 'status'),
    }),
  });
}

// useEffect-free dependent query chain:
// 1. currentUser fetches → returns userId
// 2. workspaces query auto-enables → fetches with userId
// 3. issues query auto-enables → fetches with workspaceId
// No useEffect, no manual fetch orchestration
```

---

## 6. Memory Aid

**The three TanStack Query rules:**
1. **Key = identity** — if variables change, key must change
2. **staleTime = freshness window** — zero means always refresh in background
3. **Mutation = onMutate → onError → onSettled** (the optimistic update sandwich)

**The two cache numbers:** 0ms staleTime default (everything is immediately stale); 300,000ms (5 min) gcTime default (data survives 5 minutes after unmount).

---

## 7. Why & How Summary

**Why it matters:** TanStack Query eliminates the most common source of frontend bugs: manual async state management. Race conditions, stale reads after mutations, double-fetching on mount, missing re-fetch on reconnect — all solved by default. Studies on large React codebases show TanStack Query adoption reduces data-fetching-related code by 60-80% compared to useEffect + useState patterns.

**How it works:** `QueryClient` contains a `QueryCache` (map of key → QueryObserver). Each `useQuery` call creates or subscribes to an existing QueryObserver. The observer manages the fetch lifecycle: on subscribe, checks if data is stale (compares `dataUpdatedAt` + `staleTime` to `Date.now()`), starts a fetch if stale or missing, and notifies all subscribers on resolved data. The middleware layer handles deduplication (one in-flight fetch per key), retry with exponential backoff (default: 3 retries, exponential), and background/tab focus triggers.

**Company relevance:**
- Microsoft: Outlook Web App and Teams web use TanStack Query for message and thread data — the background refresh pattern is perfect for collaborative tools where server state changes without user action
- Adobe: Lightroom web and Creative Cloud asset library use TanStack Query for asset metadata with aggressive staleTime tuning
- Salesforce: SFDX CLI web tooling and Einstein Analytics use TanStack Query for report and dataset queries
- Cisco: Meraki Dashboard's device status feeds use polling via `refetchInterval` — classic TanStack Query real-time use case
