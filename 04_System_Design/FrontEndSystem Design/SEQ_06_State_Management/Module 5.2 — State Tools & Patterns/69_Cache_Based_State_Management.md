# 69. Cache-Based State Management

## 1. High-Level Explanation (Frontend Interview Level)

**Cache-based state management** is a pattern where the application treats the local data cache as the primary state container for server-derived data, rather than using a separate state store. The cache maps query keys to fetched data; components subscribe to the cache and receive updates whenever the cache entry changes. This is the foundational model of TanStack Query, SWR, Apollo Client, and Relay — all are cache-first libraries that eliminate the need for a separate Redux or Zustand store for server data. The key principle: instead of "fetch data into Redux store → component subscribes to store," the pattern is "component declares what data it needs → library manages the fetch, cache, and re-subscription automatically." Cache-based state is the right answer to "how do I manage server data without an explosion of loading/error/data Redux boilerplate."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Cache Architecture — How TanStack Query's Cache Works

```
QueryCache (global singleton):
  ┌─────────────────────────────────────────────────────────────┐
  │  Key: ['user', '42']          │  Key: ['products', 'shoes'] │
  │  Data: { id: 42, name: '...' }│  Data: Product[]            │
  │  DataUpdatedAt: 1703000000000 │  DataUpdatedAt: 1703000050000│
  │  Status: 'success'            │  Status: 'success'          │
  │  Observers: [ProfilePage,     │  Observers: [ProductsList]  │
  │              UserAvatar]      │                             │
  ├───────────────────────────────┴─────────────────────────────┤
  │  Key: ['orders', { userId: '42', page: 1 }]                 │
  │  Data: OrderPage                                            │
  │  DataUpdatedAt: 1703000000000                               │
  │  Status: 'loading'  ← currently fetching                   │
  └─────────────────────────────────────────────────────────────┘
```

**Cache lifecycle:**
```
1. Component mounts → useQuery(['user', id])
2. Cache miss → start fetch, set status: 'loading'
3. Fetch completes → store data, set status: 'success', record timestamp
4. All observers re-render with new data
5. Component unmounts → query has no observers
6. After gcTime (garbage collection time), entry is removed from cache
7. If another component mounts and queries same key before gcTime → instant cache hit
```

### Stale-While-Revalidate (SWR) — The Core Caching Strategy

The `stale-while-revalidate` HTTP extension (RFC 5861) is the inspiration for these libraries. The browser equivalent: serve cached (possibly stale) data immediately, then revalidate in the background and update when fresh data arrives.

```typescript
useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  
  // staleTime: how long before data is considered stale (needs background refetch)
  // gcTime (cacheTime): how long to keep unused data in cache before garbage collection
  
  staleTime: 5 * 60 * 1000,   // data is fresh for 5 minutes — no background refetch
  gcTime: 30 * 60 * 1000,     // keep in cache for 30 minutes even if no observers
  
  refetchOnWindowFocus: true,   // refetch when user returns to tab (stale data only)
  refetchOnReconnect: true,     // refetch when network reconnects
  refetchInterval: 30 * 1000,  // poll every 30 seconds (real-time dashboards)
});
```

**staleTime vs gcTime:**
```
staleTime = 5min:
  [0-5min]: data is FRESH — useQuery returns cached data, NO background refetch
  [5min+]: data is STALE — next mount/refocus triggers background refetch,
            but stale data is still returned immediately while refetch is in-progress
            
gcTime = 30min:
  While there are observers (mounted components): data is kept regardless of gcTime
  When last observer unmounts: start gcTime countdown
  After 30min with no observers: remove from cache → next mount triggers fresh fetch
```

### Cache Invalidation — The Hard Part

The two hardest problems in computer science: naming things, cache invalidation, and off-by-one errors.

```typescript
// Scenario: user updates their profile → invalidate user cache + any queries that include user data

const mutation = useMutation({
  mutationFn: updateUserProfile,
  onSuccess: (updatedUser) => {
    // Option 1: Invalidate (mark stale + refetch if observed)
    queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] });
    
    // Option 2: Set the cache directly (avoid round-trip when response has updated data)
    queryClient.setQueryData(['user', updatedUser.id], updatedUser);
    
    // Option 3: Invalidate all queries containing 'user' in the key (partial match)
    queryClient.invalidateQueries({
      queryKey: ['user'],
      predicate: (query) => query.queryKey[0] === 'user',
    });
    
    // Option 4: Invalidate a dependent query
    // User profile change may affect 'user-feeds', 'user-stats', etc.
    queryClient.invalidateQueries({ queryKey: ['user-stats', updatedUser.id] });
  },
});
```

### Cache Tags — Apollo Client / RTK Query Pattern

RTK Query's `providesTags` / `invalidatesTags` gives a declarative cache invalidation model:

```typescript
// Define the API
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getUser: builder.query<User, string>({
      query: (id) => `users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
      // This query result is tagged with { type: 'User', id: '42' }
    }),
    
    updateUser: builder.mutation<User, UpdateUserArgs>({
      query: ({ id, ...body }) => ({ url: `users/${id}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
      // On success, invalidate all queries tagged { type: 'User', id: '42' }
      // → getUser('42') will automatically refetch
    }),
    
    listUsers: builder.query<User[], void>({
      query: () => 'users',
      providesTags: (results) => [
        { type: 'User', id: 'LIST' },
        ...(results?.map(({ id }) => ({ type: 'User' as const, id })) ?? []),
      ],
    }),
  }),
});
```

### Apollo Client — GraphQL Cache

Apollo Client uses a **normalised cache** — each entity is stored once by its unique ID, regardless of which query fetched it. When a mutation updates a user object, ALL queries that reference that user automatically reflect the change:

```typescript
// Apollo normalised cache
const client = new ApolloClient({
  cache: new InMemoryCache({
    // Type policies define how entities are identified and merged
    typePolicies: {
      User: { keyFields: ['id'] },          // cache by id
      Product: { keyFields: ['sku'] },       // cache by sku (not id)
    },
  }),
});

// Query 1: user in profile page
// Query 2: user in comment section
// Both reference the same User:42 in the cache
// One mutation updating User:42 → BOTH rendering locations update
```

---

## 3. Real-World Examples

**Vercel Dashboard:** Every resource (deployments, domains, environment variables) is cache-based — TanStack Query manages the lifecycle. Navigation between pages is instant for recently-fetched data; background refetch keeps data fresh. The key insight: no Redux store for any server data.

**GitHub web:** GitHub's PR and issue pages use Relay (Meta's GraphQL cache library) — the most sophisticated normalised cache in the ecosystem. Component data requirements are co-located with the component (Relay fragments), and the cache normalises all referenced objects so updates propagate automatically.

**At Hruday's level:** SAP Analytics Cloud's story and widget metadata is perfect cache-based state — load the story JSON once, cache it, invalidate when the user saves changes. The reload cycle (save → invalidate → refetch) is what cache invalidation is designed for. Implementing this with TanStack Query replaces hundreds of lines of Redux saga + action + reducer per endpoint.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "Cache-based state management treats the data cache as the primary store for server data rather than duplicating it in a Redux store. Libraries like TanStack Query maintain a global QueryCache keyed by query key arrays; components subscribe to entries using those keys; the library handles fetching, background refresh, deduplication, and garbage collection automatically. The two key cache parameters are `staleTime` (how long before a background refetch triggers — zero means always refetch in background on mount) and `gcTime` (how long unused entries are kept in cache before removal — defaults to 5 minutes). Cache invalidation — the hard part — is handled either by explicitly calling `queryClient.invalidateQueries()` after mutations, or declaratively with RTK Query's `providesTags` / `invalidatesTags` system. Apollo uses a normalised cache where each entity is stored once by ID, making mutation updates propagate automatically to all referencing queries."

**Likely Follow-up Questions:**
1. What is normalised vs non-normalised caching? → Non-normalised (TanStack Query): each query result stored as-is; updating a user requires invalidating every query that included that user. Normalised (Apollo/Relay): each entity stored once by ID; mutations update the cache entry, all referencing queries reflect the change automatically — more powerful but more complex.
2. How do you handle pagination in cache-based state? → `useInfiniteQuery` in TanStack Query: pages are appended to the cache entry; each page is a separate fetch but all pages live under the same queryKey; `getNextPageParam` extracts cursor/offset from each page response for the next fetch.
3. What is `staleTime: Infinity` for? → Use case: data that never changes or is always fetched fresh from the server on page load (static config, feature flags). With `Infinity` staleTime, cached data is never considered stale and no background refetch ever triggers — you only get the data once per query mount.

---

## 5. Code Example

```typescript
// Implementation: product list with cache-based state + optimistic mutation

const PRODUCTS_CACHE_KEY = ['products'] as const;

function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: [...PRODUCTS_CACHE_KEY, filters],
    queryFn: () => api.products.list(filters),
    staleTime: 2 * 60 * 1000,   // fresh for 2 minutes
    gcTime: 10 * 60 * 1000,     // cached for 10 minutes after unmount
    select: (data) => ({
      items: data.products,
      total: data.totalCount,
      hasMore: data.hasNextPage,
    }),
  });
}

function useToggleFeatured() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      api.products.update(id, { featured }),
      
    onMutate: async ({ id, featured }) => {
      // Optimistically update the cache before response arrives
      await queryClient.cancelQueries({ queryKey: PRODUCTS_CACHE_KEY });
      
      const snapshot = queryClient.getQueriesData({ queryKey: PRODUCTS_CACHE_KEY });
      
      queryClient.setQueriesData({ queryKey: PRODUCTS_CACHE_KEY }, (old: any) => ({
        ...old,
        products: old?.products.map((p: Product) =>
          p.id === id ? { ...p, featured } : p
        ),
      }));
      
      return { snapshot };
    },
    
    onError: (err, vars, context) => {
      // Rollback optimistic update
      context?.snapshot.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    
    onSettled: () => {
      // Confirm with server data
      queryClient.invalidateQueries({ queryKey: PRODUCTS_CACHE_KEY });
    },
  });
}
```

---

## 6. Memory Aid

**Mental model:** Cache-based state is a **browser cache but for your components**. HTTP caches store web pages and assets; the query cache stores API data. Both have: cache keys, TTL (staleTime), max-age (gcTime), and a versioning/invalidation mechanism. Interviewers love it when you make this HTTP caching analogy — it shows you understand why the same concepts apply.

**Key numbers to remember:** Default staleTime = 0 (everything immediately stale). Default gcTime = 5 minutes. Change staleTime to 60s–5min for most app data; increase gcTime to 30min+ for data the user is unlikely to change.

---

## 7. Why & How Summary

**Why it matters:** Cache-based state management eliminates entire categories of Redux boilerplate (loading actions, error actions, thunks/sagas for fetching, manual cache TTL logic) and provides correct-by-default behaviour: deduplication, background refresh, optimistic updates, and automatic garbage collection.

**How it works:** A global QueryCache maps string-serialised queryKey arrays to query instances. Each query instance holds current data, status, timestamps, and a set of observer callbacks. When `useQuery` mounts, it registers as an observer; when it unmounts, it deregisters. The cache layer orchestrates fetching (deduplicating concurrent requests for the same key), caching (storing results with timestamps), staleness checking (comparing current time to `dataUpdatedAt + staleTime`), and background refetching (launching a fetch when a stale query is observed).

**Company relevance:**
- Microsoft: Azure Portal uses TanStack Query for resource data; understanding cache invalidation patterns is essential for Azure Portal contribution
- Adobe: AEM Assets uses cache-based patterns for asset metadata — invalidation on upload is a solved problem with TanStack Query's mutation + invalidation model
- Salesforce: Connected Component data (@wire adapters) in LWC uses a similar cache model — query-based subscriptions with automatic invalidation
- Cisco: Webex contact and meeting data is server state; migrating to TanStack Query-based state management reduces WebSocket complexity for contact sync
