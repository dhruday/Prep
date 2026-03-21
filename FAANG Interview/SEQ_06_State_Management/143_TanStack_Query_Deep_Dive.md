# 143. React Query / TanStack Query Deep Dive
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

TanStack Query (formerly React Query) is a server state management library — it handles the fetching, caching, deduplication, background refresh, and mutation lifecycle of remote data. Its core primitive is `useQuery`: subscribe to data at a cache key, get loading/error/data state back, and receive automatic updates when the data refreshes. The mutation primitive (`useMutation`) handles write operations: optimistic updates, retry on error, and cache invalidation after success. For paginated data: `useInfiniteQuery` provides cursor-based infinite scroll with `fetchNextPage`. The transformative insight is that TanStack Query replaces every `useEffect + useState + loading/error + manual invalidation` pattern that developers were writing in Redux — with a fraction of the code and far superior caching semantics.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### useQuery — Full API

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';

const result = useQuery({
  // ① queryKey: array uniquely identifying this data — cache key
  queryKey: ['products', { category, page, sortBy }],

  // ② queryFn: async function returning data
  queryFn: async ({ queryKey, signal }) => {
    const [, params] = queryKey;
    // signal: AbortController — TanStack Query cancels in-flight requests
    // when key changes or component unmounts
    const response = await fetch(
      `/api/products?category=${params.category}&page=${params.page}`,
      { signal }  // ← pass signal to fetch for cancellation
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<ProductsResponse>;
  },

  // ③ staleness + cache lifetime
  staleTime: 5 * 60 * 1000,   // 5 minutes fresh
  gcTime: 30 * 60 * 1000,     // 30 minutes in cache after unmount

  // ④ conditional fetching
  enabled: !!category,         // only fetch when category is set

  // ⑤ placeholder while new key loads
  placeholderData: keepPreviousData,  // show prior page while next page loads

  // ⑥ transform data before returning to component
  select: (data) => data.items,  // only re-renders when items change, not full response

  // ⑦ retry behavior
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),  // exponential backoff

  // ⑧ refresh triggers
  refetchOnWindowFocus: true,  // refresh when tab regains focus
  refetchOnMount: true,        // refresh on component mount (if stale)
  refetchInterval: false,      // polling interval (false = no polling)

  // ⑨ initial data (from another query, avoids loading state)
  initialData: () => queryClient.getQueryData<Product[]>(['products']),
  initialDataUpdatedAt: () => queryClient.getQueryState(['products'])?.dataUpdatedAt,
});

// Destructured return values:
const {
  data,           // undefined while loading (first fetch); previous data with keepPreviousData
  dataUpdatedAt,  // timestamp of last successful fetch
  error,          // Error object if queryFn threw
  isLoading,      // true: no cached data + currently fetching
  isFetching,     // true: any fetch in progress (includes background refetch)
  isError,
  isSuccess,
  isPlaceholderData,  // true: showing keepPreviousData
  refetch,        // manually trigger a refetch
  status,         // 'pending' | 'error' | 'success'
  fetchStatus,    // 'fetching' | 'paused' | 'idle'
} = result;

// Key distinction: isLoading vs isFetching
// isLoading = true: no data in cache AND currently fetching (show full skeleton)
// isFetching = true: fetching (may be background; data may still be visible)
// → Use isLoading for the full loading skeleton, isFetching for a subtle spinner overlay
```

### useMutation — Full API

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: async (data: CreateProductRequest) => {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json() as Promise<Product>;
  },

  // Optimistic update
  onMutate: async (newProduct) => {
    await queryClient.cancelQueries({ queryKey: ['products'] });
    const prevData = queryClient.getQueryData<Product[]>(['products']);
    queryClient.setQueryData<Product[]>(['products'], old => [
      ...(old ?? []),
      { ...newProduct, id: 'temp-' + Date.now(), status: 'pending' },
    ]);
    return { prevData };  // snapshot for rollback
  },

  onError: (error, variables, context) => {
    queryClient.setQueryData(['products'], context?.prevData);
    toast.error(`Failed to create product: ${error.message}`);
  },

  onSuccess: (createdProduct, variables, context) => {
    toast.success(`${createdProduct.name} created`);
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  },
});

// Usage:
mutation.mutate({ name: 'New Widget', price: 29.99 });
// or async/await:
await mutation.mutateAsync({ name: 'New Widget', price: 29.99 });

// State:
mutation.isPending   // currently submitting
mutation.isError
mutation.isSuccess
mutation.error
mutation.data        // returned by mutationFn on success
mutation.reset()     // reset to idle state
```

### useInfiniteQuery — Infinite Scroll

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

interface ProductPage { items: Product[]; nextCursor: string | null; totalCount: number; }

function useInfiniteProducts(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', filters],
    queryFn: ({ pageParam }) =>
      api.products.list({ ...filters, cursor: pageParam, limit: 20 }),

    // Where to start (first page has no cursor)
    initialPageParam: undefined as string | undefined,

    // Extract next page param from last page's response
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    // Optional: getPreviousPageParam for bidirectional (e.g., prepending)
    staleTime: 5 * 60 * 1000,
  });
}

function InfiniteProductList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteProducts({ category: 'electronics' });

  // Flatten pages into single array
  const products = data?.pages.flatMap(page => page.items) ?? [];

  // IntersectionObserver for automatic load-more
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinel.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <ProductGridSkeleton />;

  return (
    <>
      <div className="product-grid">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
      {/* Sentinel — triggers next page fetch when visible */}
      <div ref={sentinel} aria-hidden="true" />
      {isFetchingNextPage && <SpinnerRow />}
      {!hasNextPage && products.length > 0 && <p>All {products.length} products loaded</p>}
    </>
  );
}
```

### Dependent Queries — Waterfall Pattern

```typescript
// Fetch user, then fetch their posts
function UserPosts({ userId }: { userId: string }) {
  const { data: user, isSuccess: userLoaded } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => api.users.get(userId),
  });

  const { data: posts } = useQuery({
    queryKey: ['users', userId, 'posts'],
    queryFn: () => api.posts.listByUser(userId),
    enabled: userLoaded,  // only runs after user is loaded
  });

  // Parallel queries — use Promise.all or separate useQuery hooks
  const teamsQuery = useQuery({ queryKey: ['users', userId, 'teams'], queryFn: ... });
  const postsQuery = useQuery({ queryKey: ['users', userId, 'posts'], queryFn: ... });
  // Both fire simultaneously — not waterfall

  // useQueries — dynamic number of parallel queries
  const productQueries = useQueries({
    queries: productIds.map(id => ({
      queryKey: ['products', id],
      queryFn: () => api.products.get(id),
    })),
  });
  // Returns array of query results — productQueries[0].data, productQueries[1].data, etc.
}
```

### Error Handling & Retry

```typescript
// Error boundaries + TanStack Query
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function ProductsWithErrorHandling() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}  // reset TanStack Query error state when user retries
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div role="alert">
              <p>Failed to load products: {error.message}</p>
              <button onClick={resetErrorBoundary}>Retry</button>
            </div>
          )}
        >
          <Suspense fallback={<ProductsSkeleton />}>
            <ProductList />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

// throwOnError: throw in render instead of returning isError
// (works with Suspense + ErrorBoundary)
function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
    throwOnError: true,  // ← integrates with ErrorBoundary
  });
}
```

### Global Error + Loading (QueryClient defaults)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        if ((error as any).status === 401) return false;  // don't retry auth failures
        if ((error as any).status === 404) return false;  // don't retry not found
        return failureCount < 3;
      },
    },
    mutations: {
      onError: (error) => {
        // Global toast for all mutation errors
        toast.error(`Error: ${(error as Error).message}`);
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Global error handler (e.g., for 401: redirect to login)
      if ((error as any).status === 401) { authStore.logout(); }
      if ((error as any).status >= 500) {
        toast.error(`Server error. Please try again.`);
      }
    },
  }),
});
```

### Architecture & Component Boundaries

```typescript
// Folder structure for scalable TanStack Query usage:

// api/
//   products.api.ts     — raw fetch functions (no TanStack Query knowledge)
//   users.api.ts
//
// hooks/
//   useProducts.ts      — useQuery wrappers + query keys
//   useUsers.ts
//   useMutations.ts     — useMutation wrappers
//
// query-keys/
//   products.keys.ts    — query key factory
//   users.keys.ts
//
// providers/
//   QueryProvider.tsx   — QueryClient + ReactQueryDevtools

// QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({ /* global config */ });

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
```

### Trade-offs

| Feature | TanStack Query | SWR | Apollo GraphQL | RTK Query |
|---|---|---|---|---|
| Mutations | Full lifecycle | Basic | Full lifecycle | Full lifecycle |
| Infinite scroll | `useInfiniteQuery` | Needs extra hook | Pagination handlers | Built-in |
| Optimistic updates | `onMutate` + rollback | Manual | Optimistic response | `optimisticResult` |
| DevTools | Official devtools | None | Apollo DevTools | Built-in |
| Bundle size | 13KB | 4KB | 30KB+ | Part of RTK |

### ⚠️ Anti-Patterns & Pitfalls

- **Fetching in Server Component then passing as prop AND also calling `useQuery`** — double initialization; use `HydrationBoundary` to share the server-fetched cache with the client query
- **`useQuery` inside a render loop or conditional** — hooks cannot be conditional; always call `useQuery` at the top level, control execution with `enabled`
- **Not aborting on key change** — forgetting to pass `signal` to fetch means old requests complete after key changes → stale data overwrites fresh; always pass `{ signal }` to `fetch`
- **Overusing `select` for presentation transforms** — `select` re-runs on every returned reference; if the transform is expensive, memoize outside TanStack Query

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the procurement dashboard used `useInfiniteQuery` for the purchase order list (10K+ POs per year), eliminating a client-side paginated table that loaded all POs at once. The `keepPreviousData` option (now `placeholderData: keepPreviousData`) kept the current page visible while the next filtered set loaded — no blank flash on filter change. Mutation for "approve PO" used optimistic update to immediately mark the PO as approved in the list, rolled back on server error, and invalidated `['purchase-orders']` on settle. User-perceived response time dropped from 1.2 seconds (full page reload) to instant (optimistic + cache).

**At FAANG scale:**
- **Microsoft:** `useInfiniteQuery` for Teams message history — older messages fetch on scroll-up; `refetchOnWindowFocus: false` for messages (to avoid re-fetching stable history) but `refetchOnWindowFocus: true` for presence/membership (changes when others join/leave)
- **Adobe:** `select` transform on the asset query — raw API returns asset with 30 metadata fields; `select` extracts only the 8 needed by the gallery component, preventing re-renders when irrelevant fields update
- **Salesforce:** Real-time report queries use `refetchInterval: 60_000` for auto-refresh dashboards; individual report queries use `staleTime: Infinity` when the user has explicitly "locked" a report view
- **Cisco:** Device health queries use `useQueries` — 50 selected devices each get an independent query; `queryClient.resetQueries` clears errored device queries on manual "retry all" button click

---

## 💬 4. Interview Execution

### Sample Answer

> "TanStack Query replaces the entire async data fetching stack — every useEffect, useState, loading flag, error state, manual invalidation, and retry logic that we used to write by hand. Three hooks do 90% of the work.
>
> `useQuery` for reads: give it a key and a fetch function, get data/isLoading/isError back with automatic caching, background refresh, and deduplication. The `select` option is a hidden power feature — it transforms the data before returning it to the component AND uses that transformed value as the re-render trigger, so if you select `data.items` from a paginated response, the component only re-renders when items actually change, not when metadata like totalCount changes.
>
> `useMutation` for writes: the `onMutate`/`onError`/`onSettled` lifecycle gives you optimistic updates with automatic rollback. I always invalidate in `onSettled` rather than `onSuccess` — settled fires even on error, ensuring the cache returns to a consistent state.
>
> `useInfiniteQuery` for pagination: cursor-based, accumulates pages across fetches, and integrates cleanly with IntersectionObserver for automatic load-more. At SAP I replaced a 10K-row paginated table with infinite scroll — initial load dropped from 3 seconds to 200ms because we only fetched the first 20 rows."

### Likely Follow-up Questions
1. "Difference between `isLoading` and `isFetching`?" → isLoading: no data + first fetch; isFetching: any fetch in progress; use isLoading for skeleton, isFetching for subtle overlay spinner
2. "Why `onSettled` instead of `onSuccess` for invalidation?" → settled fires on both success AND error; ensures cache consistency even when mutation fails
3. "How do you handle request cancellation in TanStack Query?" → Pass `signal` from `queryFn`'s argument to `fetch` — TanStack Query aborts the request when the key changes or component unmounts
4. "How do you combine SSR data with TanStack Query?" → Server prefetches into a QueryClient, dehydrates state, HydrationBoundary transmits it to client, client's QueryClient is pre-populated — no duplicate request
5. "How does `select` improve performance?" → `select` runs on every query result but React only re-renders the component if the selected value changed — fine-grained subscription without a separate selector mechanism

### vs Alternatives

| TanStack Query | SWR | Raw useEffect |
|---|---|---|
| Full mutation lifecycle | Basic revalidation | Full control |
| Infinite query built-in | Requires manual pagination | Manual pagination |
| devtools | None | Browser devtools only |
| Complexity: medium | Complexity: low | Complexity: high (you build it all) |

---

## 💻 5. Code Example

```typescript
// Complete feature: searchable/sortable product list with infinite scroll + mutations

// ---- types ----
interface Product { id: string; name: string; price: number; stock: number; active: boolean; }
interface ProductPage { items: Product[]; nextCursor: string | null; }

// ---- query keys ----
export const productKeys = {
  all: ['products'] as const,
  infinite: (search: string, sort: string) => ['products', 'infinite', { search, sort }] as const,
  detail: (id: string) => ['products', id] as const,
};

// ---- hooks ----
export function useInfiniteProducts(search: string, sort: string) {
  return useInfiniteQuery({
    queryKey: productKeys.infinite(search, sort),
    queryFn: ({ pageParam, signal }) =>
      fetch(`/api/products?search=${search}&sort=${sort}&cursor=${pageParam ?? ''}`, { signal })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((r): ProductPage => r),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    staleTime: 3 * 60 * 1000,
    placeholderData: keepPreviousData,  // keep last search results while new ones load
  });
}

export function useToggleProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      fetch(`/api/products/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      }).then(r => r.json()),

    onMutate: async ({ id, active }) => {
      // Cancel in-flight queries
      await qc.cancelQueries({ queryKey: productKeys.all });

      // Optimistically update the product in all infinite query pages
      qc.setQueriesData<{ pages: ProductPage[] }>(
        { queryKey: ['products', 'infinite'] },
        (cache) => cache ? {
          ...cache,
          pages: cache.pages.map(page => ({
            ...page,
            items: page.items.map(p => p.id === id ? { ...p, active } : p),
          })),
        } : cache
      );
      return { id, prevActive: !active };
    },
    onError: (_, { id }, ctx) => {
      if (!ctx) return;
      // Roll back the optimistic update
      qc.setQueriesData<{ pages: ProductPage[] }>(
        { queryKey: ['products', 'infinite'] },
        cache => cache ? {
          ...cache,
          pages: cache.pages.map(p => ({
            ...p,
            items: p.items.map(i => i.id === id ? { ...i, active: ctx.prevActive } : i),
          })),
        } : cache
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

// ---- Component ----
function ProductsPanel() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name:asc');
  const debouncedSearch = useDebounce(search, 300);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteProducts(debouncedSearch, sort);

  const toggle = useToggleProduct();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinel.current || !hasNextPage) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage(); }
    );
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allProducts = data?.pages.flatMap(p => p.items) ?? [];

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" />
      <select value={sort} onChange={e => setSort(e.target.value)}>
        <option value="name:asc">Name A→Z</option>
        <option value="price:asc">Price Low→High</option>
        <option value="stock:desc">Stock High→Low</option>
      </select>

      {isLoading ? <ProductSkeleton /> : allProducts.map(p => (
        <div key={p.id}>
          <span>{p.name} — ${p.price}</span>
          <button
            onClick={() => toggle.mutate({ id: p.id, active: !p.active })}
            disabled={toggle.isPending}
          >
            {p.active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ))}

      <div ref={sentinel} aria-hidden="true" />
      {isFetchingNextPage && <p>Loading more…</p>}
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**Three core hooks — QMI:**
- **Q**uery (`useQuery`) — read, cache, background refresh
- **M**utation (`useMutation`) — write, optimistic, rollback, invalidate
- **I**nfinite (`useInfiniteQuery`) — accumulating pages, cursor pagination

**Mutation lifecycle — MESI:**
- **M**utate: `onMutate` — snapshot + optimistic update
- **E**rror: `onError` — rollback from snapshot
- **S**uccess: `onSuccess` — toast, supplementary updates
- **I**nvalidate: `onSettled` — always invalidate (even on error)

**isLoading vs isFetching:**
- `isLoading` → no data yet → show skeleton
- `isFetching` → any fetch (including background) → show subtle spinner

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ `select` is the most underused and highest-impact TanStack Query feature — without it, entire query responses (sometimes 50+ fields) trigger component re-renders; with `select: (data) => data.summary`, a component re-renders only when the summary changes, not when any field in the full response changes; this directly connects to the rule that components should re-render as infrequently as possible
→ The `onSettled` vs `onSuccess` invalidation distinction prevents a class of subtle bugs — if you invalidate in `onSuccess`, a mutation that throws leaves the cache in an inconsistent state (optimistic update applied but not rolled back by invalidation); `onSettled` acts as the guaranteed cleanup callback regardless of outcome
→ Passing `signal` from `queryFn`'s context argument to `fetch` is TanStack Query's equivalent of the AbortController pattern — without it, when a user types in a search field rapidly, 10 in-flight requests complete in arbitrary order and the last resolved (not the last initiated) wins; with signal, key changes abort the current request; showing this knowledge demonstrates you understand concurrent update hazards in async data fetching

**How it works (2 sentences):**
TanStack Query's `useQuery` hook subscribes to a cache entry by its key using `useSyncExternalStore` under the hood — the QueryObserver class watches the cache for changes to the subscribed key and compares the new result to the previous one (using the `select` function's output for comparison if provided), calling the React scheduler to update the component only when the data actually changed, decoupled from how frequently the underlying cache emits updates.
`useInfiniteQuery` extends this model by storing an array of `pages` as the cache value rather than a single datum — `fetchNextPage` appends a new page to this array (using the previous page's `getNextPageParam` result as the cursor), and the component accesses the flattened list via `data.pages.flatMap(page => page.items)`, with React rendering only the newly added items rather than re-rendering the entire list.

---
✅ Topic 143/486 complete → Continuing to Topic 144: State Machines (XState) for Complex Flows
