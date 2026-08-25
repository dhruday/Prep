# TanStack Query / React Query — Server State Management
> Part 13 — State Management
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **TanStack Query** (formerly React Query) manages server state — it is a cache with a declarative API; "server state" means data that lives on a remote server and needs to be fetched, cached, refreshed, and synchronized; TanStack Query does all four automatically
- **`useQuery`**: `const { data, isLoading, error } = useQuery({ queryKey: ['products', category], queryFn: () => api.getProducts(category) })` — the `queryKey` is the cache key (unique identifier for this specific request); the `queryFn` is any function that returns a Promise; loading/error/success states are automatic
- **`staleTime` vs `gcTime`**: `staleTime` = how long data is considered fresh (no background refetch during this window); `gcTime` = how long UNUSED data stays in cache before garbage collection; default: `staleTime=0` (always stale, always background-refetch on mount) and `gcTime=5min`; set `staleTime: Infinity` for truly static data (country list)
- **`useMutation`**: for POST/PUT/DELETE; `mutationFn` is the async call; `onSuccess` callbacks trigger cache invalidation — `queryClient.invalidateQueries({ queryKey: ['products'] })` marks matching cached queries as stale and triggers refetch if any component is subscribed
- **Optimistic updates**: `onMutate` → update the cache immediately before API responds → `onError` → rollback to previous value if API fails; instant UI feedback with eventual consistency, rollback on failure
- **`useInfiniteQuery`**: for cursor-based infinite scroll; `getNextPageParam` extracts the next cursor from the last page; `fetchNextPage()` fetches the next batch and appends to cached pages
- **Comparison to RTK Query**: both solve server state caching; RTK Query integrates with Redux (useful if you already have Redux); TanStack Query is framework-agnostic (React, Vue, Solid, Svelte, Vanilla JS), has a larger API surface (more hooks, more options), and is the better choice for projects NOT already using Redux

---

## 1. One-Line Definition
TanStack Query is a server-state management library that handles fetching, caching, background refresh, and synchronization of remote data — eliminating the need to write loading/error state, cache invalidation logic, or deduplication manually.

---

## 2. The Problem It Solves

The moment an application fetches data from a server, three categories of problems appear:

**Category 1 — Fetch lifecycle boilerplate.** Every `useEffect`-based fetch needs the same structure: a `loading` state, an `error` state, a `data` state, a cleanup function, and a `useEffect` with the right dependency array. Five components fetching different data means five copies of this boilerplate. Forgetting the cleanup leads to memory leaks via state updates on unmounted components.

**Category 2 — Cache staleness.** After a user modifies data (adds a product, submits an order), every component showing related data becomes stale. Without a cache mechanism, either: (a) the UI shows stale data until full page reload, or (b) every component refetches independently, causing N separate HTTP calls. Neither is correct behavior.

**Category 3 — Request deduplication.** If three components mount simultaneously and each independently calls `useEffect(() => { fetch('/api/products') }, [])`, you get three identical HTTP requests. Without a shared cache and deduplication mechanism, each component acts independently.

TanStack Query solves all three: the lifecycle states (`isLoading`, `isFetching`, `isError`, `data`) are generated automatically; the query key system means the same key maps to one cache entry shared by all subscribers; mutations trigger `invalidateQueries` which marks the relevant cache entries stale and triggers a controlled refetch.

---

## 3. How It Works Internally

### The Cache Model

```
QueryClient maintains in-memory cache:

Key: ['products', { category: 'electronics' }]
Value: {
  data: [...],                     // Last successful fetch result
  dataUpdatedAt: timestamp,        // When data was last fetched
  status: 'success' | 'loading' | 'error',
  fetchStatus: 'fetching' | 'paused' | 'idle',
  observers: [ComponentA, ComponentB],  // Active subscribers
}

When useQuery({ queryKey: ['products', filter] }) mounts:
  1. Check cache for key ['products', filter]
     MISS → start fetch, set status: 'loading'
     HIT + fresh (within staleTime) → return data immediately, no fetch
     HIT + stale → return data immediately (isLoading=false, isFetching=true),
                   AND start background fetch to refresh
  
  2. If another component mounts with same key while fetch is in-flight:
     → Deduplication: no second fetch; both components wait for same Promise
     → When fetch resolves, BOTH components update simultaneously
  
  3. When last subscriber (component) unmounts:
     → gcTime timer starts
     → If a new subscriber arrives before timer expires: cache is reused
     → If timer expires with no subscribers: cache entry is garbage collected
```

### invalidateQueries Flow

```
1. useMutation addProduct mutationFn runs (POST /api/products)
2. onSuccess callback fires: queryClient.invalidateQueries({ queryKey: ['products'] })
3. QueryClient marks ALL cache entries whose key starts with ['products'] as stale
4. For each stale entry:
   - If it has active observers (components mounted): refetch immediately in background
   - If it has no active observers: mark as stale (will refetch on next mount)
5. Components showing product data see isFetching=true, then data updates
```

---

## 4. The Code

### Wrong Way — Manual useEffect Fetch

```typescript
// ❌ WRONG — useEffect-based data fetching: boilerplate city, no cache, no deduplication

function ProductList({ category }: { category: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let cancelled = false;  // ❌ Every developer must remember to add this manually
    setLoading(true);
    setError(null);
    
    fetchProducts(category)
      .then(data => {
        if (!cancelled) {  // ❌ Manual guard against stale state updates (easily forgotten)
          setProducts(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    
    return () => { cancelled = true; };  // ❌ Cleanup required in every useEffect
  }, [category]);  // ❌ Must remember to include category; missing it = stale data on filter change
  
  // ❌ After adding a product, this component has NO idea.
  // It never refetches unless category changes or page reloads.
  // "Add product" in another component → this list is stale forever.
  
  if (loading) return <Spinner />;
  if (error) return <p>Error: {error}</p>;
  return <>{products.map(p => <ProductCard key={p.id} product={p} />)}</>;
}

// ❌ Same component mounted in three places?
// Three separate HTTP requests. No deduplication.
// Each component has its own copy of products. They can drift.
```

> **Why this fails in production:** boilerplate duplicated across every data-fetching component; stale data after mutations; no shared cache; memory leak risk when component unmounts during fetch.

### Right Way — TanStack Query

```typescript
// ✅ RIGHT — TanStack Query: setup, fetch, mutate, optimistic update

// App setup — QueryClientProvider wraps the app (once):
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,       // 1 minute: data considered fresh for 60 seconds
      gcTime: 1000 * 60 * 5,      // 5 minutes: unused cache stays 5 minutes
      retry: 2,                   // Retry failed queries twice before setting error
      refetchOnWindowFocus: true, // Background refetch when user tabs back to app
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
      {/* ✅ DevTools — visible in dev, automatically excluded in production builds */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}


// ✅ Basic useQuery — fetching products with automatic cache

// Separate query key factory (prevents typos, centralizes cache key logic):
export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters) => ['products', 'list', filters] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
};

function ProductList({ category }: { category: string }) {
  const {
    data: products,
    isLoading,        // True ONLY on first fetch (no cached data yet)
    isFetching,       // True during ANY fetch (including background refresh)
    isError,
    error,
    refetch,          // Manual trigger if needed
  } = useQuery({
    queryKey: productKeys.list({ category }),  // ← Cache key: changes when category changes → new fetch
    queryFn: () => api.getProducts({ category }),
    staleTime: 1000 * 30,   // Products fresh for 30 sec (override default)
    enabled: !!category,    // ← Skip query if category is empty/undefined
    select: (data) => data.filter(p => p.active),  // ← Transform data before storing in cache
  });
  
  if (isLoading) return <ProductSkeleton />;  // ✅ Only shows skeleton on initial load
  if (isError) return <ErrorBanner message={error.message} retry={refetch} />;
  
  return (
    // ✅ isFetching shows subtle refresh indicator during background refetch
    // without blocking the UI (products are already visible from cache)
    <div className={`product-grid ${isFetching ? 'opacity-70' : ''}`}>
      {products?.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
// ✅ Mount ProductList in 5 different places:
// → Only ONE API call; all five components receive the same cached data
// → When one refetches, all five update simultaneously


// ✅ useMutation — POST/PUT/DELETE with cache invalidation

const useAddProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newProduct: CreateProductRequest) =>
      api.createProduct(newProduct),
    
    onSuccess: (createdProduct, variables, context) => {
      // ✅ Invalidate product lists — any active list query refetches automatically
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      
      // ✅ Alternatively: directly update cache without refetch (faster, avoids extra HTTP call)
      // queryClient.setQueryData(productKeys.detail(createdProduct.id), createdProduct);
    },
    
    onError: (error) => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });
};

function AddProductButton() {
  const { mutate: addProduct, isPending } = useAddProduct();
  
  const handleSubmit = (formData: CreateProductRequest) => {
    addProduct(formData);
    // ✅ No manual state management; isPending, isError are automatic
  };
  
  return (
    <button onClick={() => handleSubmit({ name: 'Widget', price: 29 })} disabled={isPending}>
      {isPending ? 'Adding...' : 'Add Product'}
    </button>
  );
}


// ✅ Optimistic Update — immediate UI feedback with rollback on failure:

const useUpdateProductPrice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) =>
      api.updateProduct(id, { price }),
    
    // ✅ onMutate: runs BEFORE the API call → update cache immediately
    onMutate: async ({ id, price }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      
      // Snapshot the current cache value for rollback
      const previousProducts = queryClient.getQueryData(productKeys.list({}));
      
      // Optimistically update the cache
      queryClient.setQueryData(productKeys.list({}), (old: Product[] | undefined) =>
        old?.map(p => p.id === id ? { ...p, price } : p) ?? []
      );
      
      // Return context for rollback
      return { previousProducts };
    },
    
    // ✅ onError: rollback the optimistic update if API call fails
    onError: (error, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(productKeys.list({}), context.previousProducts);
      }
      toast.error('Price update failed — change reverted');
    },
    
    // ✅ onSettled: refetch regardless of success/failure for definitive server state
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};


// ✅ useInfiniteQuery — infinite scroll with cursor-based pagination:

function InfiniteProductList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['products', 'infinite'],
    queryFn: ({ pageParam }) =>
      api.getProducts({ cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    // ← Extract the nextCursor from each page's response
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  
  // Flatten all pages into one list:
  const allProducts = data?.pages.flatMap(page => page.items) ?? [];
  
  // Load more on scroll (Intersection Observer):
  const { ref: loadMoreRef } = useInView({
    onChange: (inView) => { if (inView && hasNextPage) fetchNextPage(); }
  });
  
  if (isLoading) return <ProductSkeleton />;
  
  return (
    <>
      {allProducts.map(p => <ProductCard key={p.id} product={p} />)}
      {/* Invisible element at end of list triggers next page fetch */}
      <div ref={loadMoreRef}>
        {isFetchingNextPage && <Spinner />}
      </div>
    </>
  );
}


// ✅ Dependent query — second query runs only when first succeeds:

function OrderDetails({ orderId }: { orderId: string }) {
  // Step 1: Fetch the order
  const { data: order } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => api.getOrder(orderId),
  });
  
  // Step 2: Fetch the customer — ONLY after order is loaded and customerId is available
  const { data: customer } = useQuery({
    queryKey: ['customers', order?.customerId],
    queryFn: () => api.getCustomer(order!.customerId),
    enabled: !!order?.customerId,   // ← Query is skipped until customerId exists
  });
  
  return <div>{order?.name} — {customer?.email}</div>;
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between `isLoading` and `isFetching` in TanStack Query?"

**Hruday's answer:**
> Both indicate that a query is in progress, but they differ in what they indicate about the cache state.
>
> `isLoading` is true only when the query is fetching for the first time AND there is no cached data. The component has nothing to show yet — this is when you render a skeleton or spinner that blocks the whole content area.
>
> `isFetching` is true whenever the query is fetching — initial fetch AND background refetches. A background refetch happens when: the component mounts and data is cached but stale; the user focuses the window; a `refetchInterval` fires; or `invalidateQueries` marks the cache stale while the component is mounted. During a background refetch, `isLoading` is false (cached data is already available), but `isFetching` is true.
>
> The practical UI pattern: use `isLoading` to show a full blocking skeleton. Use `isFetching` to show a subtle "refreshing" indicator — a spinner in the corner, reduced opacity, or a thin progress bar — without replacing the existing content. This is the difference between a loading screen and a "soft refresh."
>
> If you conditionally render based on `isFetching` instead of `isLoading`, your component will flash a blank state every time data refreshes in the background, which is a bad user experience.

---

### Q2 — Technical Deep Dive
**Interviewer asks:** "How should you choose `staleTime` for a given query?"

**Hruday's answer:**
> `staleTime` should match how often the server-side data legitimately changes AND how important it is for the user to see the latest version.
>
> Static or rarely-changing data — country list, currency codes, product categories: `staleTime: Infinity`. This data doesn't change during a user session. Once fetched, serve it from cache forever. No background refetches, no unnecessary network calls.
>
> Frequently-changing data where slight staleness is acceptable — product listings, search results: `staleTime: 30_000` to `staleTime: 60_000` (30-60 seconds). The user won't notice if results are 30 seconds old. Background refresh on focus means the data updates naturally as they navigate.
>
> Real-time-adjacent data — shopping cart, notification count, active order status: `staleTime: 0` (the default) or a short window like `staleTime: 5_000`. These need to be as current as possible. Combine with `refetchOnWindowFocus: true` and potentially `refetchInterval: 10_000` for polling.
>
> Financial or security-sensitive data — balance amounts, transaction status: `staleTime: 0` and manual refetch on key user actions. Don't show a user their balance from cached data if they just made a payment — `invalidateQueries` after the payment mutation is critical.
>
> The question in every case: "If the user sees data that is N minutes old, does it matter?" The answer drives the `staleTime` value.

---

### Q3 — SAP Experience
**Interviewer asks:** "Would you choose TanStack Query or RTK Query for a new React project?"

**Hruday's answer:**
> My decision starts with one question: does this project already use Redux, or does it need Redux for client state?
>
> If yes to Redux — RTK Query. The integration is seamless. The API cache lives in the Redux store. DevTools show server state alongside client state. Cache invalidation uses the same tag system. There's no second state management library to configure. At SAP, we already had Redux for cart, auth, and feature flags, so RTK Query was the natural choice for the server data layer.
>
> If no Redux — TanStack Query. It has no Redux dependency, a smaller conceptual surface area for teams unfamiliar with Redux, and framework-agnostic design (works with React, Vue, Angular via adapters, or even vanilla JS). The hooks API is slightly more ergonomic than RTK Query for complex use cases like infinite scroll and optimistic updates. If the project also has a Vue or Angular part, TanStack Query gives consistency across frameworks.
>
> The capabilities overlap about 90%: both have query caching, stale-while-revalidate, background refetch, mutation with cache invalidation, and `isLoading`/`isFetching`/`isError` states. The 10% difference is where you'd go deeper in an interview: TanStack Query has a more mature `useInfiniteQuery` API, has a query persistence plugin (`@tanstack/query-persist-client-core`), and is easier to use outside of React. RTK Query has native Redux DevTools integration and coexists with `createSlice` state in the same store.

---

### Q4 — Scenario
**Interviewer asks:** "A user adds a product to the cart and the product list doesn't update. How would you debug this with TanStack Query?"

**Hruday's answer:**
> The symptom has one likely cause: the mutation's `onSuccess` callback either doesn't call `invalidateQueries` at all, or it calls it with a query key that doesn't match the product list query.
>
> First — open the React Query DevTools. They show all active cache entries and their state. Check whether the `['products', ...]` cache entry is marked as "stale" or "fresh" after the add-to-cart mutation fires. If it stays "fresh" after the mutation, `invalidateQueries` is not being called.
>
> Second — check the query key used in `useQuery` for the product list against the key used in `invalidateQueries` inside the mutation. TanStack Query invalidation uses prefix matching: `invalidateQueries({ queryKey: ['products'] })` invalidates ALL cache entries whose keys start with `'products'`. But if the product list uses `queryKey: ['productList']` and the invalidation uses `queryKey: ['products']`, there's no match — nothing is invalidated.
>
> Third — check whether the mutation is even succeeding. `useMutation`'s `onError` might be firing instead. In DevTools, the mutation section shows success/failure for each mutation call.
>
> The fix is almost always one of: (1) the `onSuccess` callback is missing `queryClient.invalidateQueries`, (2) the query keys don't match, or (3) the query key is correct but the mutation is failing silently. Using a query key factory object (like `productKeys.all`, `productKeys.list(filters)`) prevents key mismatch bugs by keeping all key strings in one place.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Calling queryClient in component render" | "I call queryClient.getQueryData() to read cache synchronously in the component body" | `queryClient.getQueryData` does NOT subscribe to updates — calling it in render reads the cache once and doesn't rerender when the cache changes; always use `useQuery` to subscribe to a cache entry; use `queryClient.getQueryData` only inside mutation callbacks or event handlers where you need a one-time snapshot (like in `onMutate` for optimistic update rollback context) |
| "queryKey as string" | "I use a string queryKey like queryKey: 'products'" | TanStack Query accepts strings but arrays are strongly preferred; array keys are hierarchical — `['products']` is the parent of `['products', 'list', filters]`; `invalidateQueries({ queryKey: ['products'] })` invalidates ALL child keys; using a string loses this hierarchical matching; centralizing keys in a factory object (`productKeys.all`, `productKeys.list(f)`) prevents typos and makes invalidation intent explicit |
| "staleTime = 0 means always loading" | "Setting staleTime: 0 means useQuery always shows isLoading: true" | `staleTime: 0` means data is immediately stale after fetching; it does NOT mean data is always re-fetched synchronously; if cached data exists, the component shows it immediately (`isLoading: false`) and `isFetching: true` while a background refetch runs; `isLoading` is true only when there is NO cached data at all; the difference is crucial for UX — `staleTime: 0` gives fresh data without loading flickers on revisit |
| "Mutations update the cache automatically" | "After useMutation succeeds, the related queries automatically show new data" | Mutations do NOT automatically update other query caches; you must explicitly call `queryClient.invalidateQueries` or `queryClient.setQueryData` in the mutation's `onSuccess`; the mutation only changes what the API returned — it has no way to know which cached queries are now stale unless you tell it; this is the most common TanStack Query bug in production |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we evaluated TanStack Query against RTK Query during a major frontend refactor. Both libraries were mature, both solved the same core problem. The decision came down to one thing: we already had a 14-slice Redux store for cart, auth, and feature flags, and the team was already comfortable with RTK. Adding TanStack Query as a second library would mean two cache systems, two sets of devtools, and two mental models.
>
> RTK Query won for our context. But the evaluation process gave me deep familiarity with TanStack Query's patterns — specifically the infinite query support and the prefetching API, which RTK Query's version of is less ergonomic.
>
> The one area where I'd strongly advocate TanStack Query over RTK Query is teams that are building a new project with no existing Redux dependency. The DX is slightly smoother, the community is larger, and the framework-agnostic design means the pattern knowledge is transferable. For my own side projects outside SAP, I use TanStack Query by default."

---

## 8. Scale Evolution

**Small app →** `useQuery` with default settings; one `QueryClientProvider` at the root; `useMutation` with `invalidateQueries` in `onSuccess`; no custom `staleTime` needed except for static data; the defaults (staleTime=0, gcTime=5min, retry=3) work well.

**Medium team app →** query key factory pattern (`userKeys`, `productKeys`, `orderKeys`) to centralize all cache keys; custom `staleTime` per query category; `defaultOptions` on `QueryClient` for team-wide defaults; TypeScript generic on `useQuery<Product[]>` for type safety; prefetching on route hover with `queryClient.prefetchQuery`.

**Large enterprise app (SAP scale) →** query persistence plugin for offline-first PWA support; `experimental_createPersister` with IndexedDB for cache persistence across page refreshes; hydration for SSR (Next.js `HydrationBoundary` or Remix `defer`); server components fetching directly (Next.js 14+: `queryClient.prefetchQuery` in server component, `dehydrate` for client hydration); scope-based query invalidation strategy with clearly defined tag equivalents via key hierarchies.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | TanStack Query for payment instrument lists, transaction history, merchant analytics; `staleTime: 0` for financial data (always fresh); optimistic updates on payment status with rollback on gateway error; `useInfiniteQuery` for scrollable transaction history | staleTime choices for financial data; optimistic update rollback; mutation + invalidation after payment submission |
| Swiggy / Meesho | `useInfiniteQuery` for infinite scroll restaurant/product feeds; `refetchInterval` polling for live order status (30s interval during active order); optimistic add-to-cart with rollback; `prefetchQuery` on hover for menu item detail | infinite query implementation; polling vs WebSocket tradeoff; prefetching on hover patterns |
| Adobe / Microsoft | Large asset library with cursor-based pagination (`useInfiniteQuery`); stale-while-revalidate for creative asset lists; prefetching on hover for quick preview; offline support via query persistence plugin; Teams: polling for chat message updates | useInfiniteQuery depth; prefetching strategy; offline caching plugin; comparison to RTK Query |
| SAP Labs | Direct experience: RTK Query vs TanStack Query evaluation at SAP; chose RTK Query for Redux-integrated context; TanStack Query used in personal projects; familiar with both APIs; can articulate tradeoffs clearly; SSR patterns for Next.js | evaluation story and decision rationale; both APIs; developer-first architecture thinking |

---

## 10. Related Topics — What to Study Next

- **Topic 225 — Redux Toolkit & RTK Query** — the head-to-head comparison; RTK Query solves the same server state problem with Redux integration; understanding both lets you answer "when would you use one over the other?" — the most common TanStack Query interview question; key difference: RTK Query requires Redux, TanStack Query does not
- **Topic 224 — Local vs Global State** — TanStack Query is the "server state" category in the local-vs-global framework; server state (remote data) should almost NEVER be in Redux or local `useState`; TanStack Query gives it its own category with the right semantics (cache, staleness, refetch) rather than treating it like client state
- **Topic 233 — Cache-Based State Management** — TanStack Query IS a cache-first approach to state; understanding stale-while-revalidate as a cache strategy, and how cache invalidation after mutations fits into a broader cache contract, deepens the answer to interview questions about TanStack Query's design philosophy
- **Topic 231 — URL as State** — for searchable, filterable pages: the query params in the URL become the `queryKey` inputs; when the URL changes via `useSearchParams`, the `queryKey` changes, and TanStack Query fetches the new data for the new filter combination; URL + TanStack Query together give shareable filtered views with automatic data fetching

---

*Part 13 · TanStack Query / React Query — Server State Management · Full Stack Interview Guide · Hruday D · 2026*
