# 68. Server State vs Client State

## 1. High-Level Explanation (Frontend Interview Level)

**Server state** is data that originates from a server, is asynchronously fetched, cached, has a known source of truth on the backend, and must be synchronised between the client and server. **Client state** is data that is purely a product of client-side interaction — UI toggles, form values, modal open/close state, selected theme — and has no server equivalent. The most important architectural insight at senior level is that **these two types of state have fundamentally different properties and should be managed by different tools**. Traditionally, Redux was used for both, resulting in stores filled with loading flags, cache timestamps, and refetch logic — concerns that belong to a dedicated server state library like TanStack Query. Separating server state (TanStack Query, SWR, Apollo) from client state (Zustand, Redux, local `useState`) dramatically simplifies the codebase.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Properties of Each State Type

```
SERVER STATE                           CLIENT STATE
─────────────────────────────────────────────────────────────────
Source: backend database/API           Source: user interaction / device
Asynchronous: yes (network fetch)      Synchronous: yes (instant update)
Stale risk: yes (changes on server)    Stale risk: no (you control it)
Shared: yes (multiple users see it)    Shared: local, at most per-session
Persistent: yes (survives reload)      Ephemeral: mostly lost on reload
Examples:                              Examples:
  user profile data                      modal isOpen
  product catalogue                      active tab index
  order history                          search input value
  real-time prices                       theme: 'dark' | 'light'
  notifications                          form field state
  comments                               sidebar collapsed state
```

### The Wrong Way — Merging Both in Redux

```typescript
// ❌ Anti-pattern: using Redux for both server and client state
const store = {
  // Server state — manually managed lifecycle
  products: {
    data: Product[] | null,
    loading: boolean,
    error: string | null,
    lastFetched: number | null,    // ← manual cache timestamp
    isStale: boolean,              // ← manual staleness logic
  },
  // Client state — fine here
  ui: {
    sidebarOpen: boolean,
    activeTab: string,
  },
};

// To manage server state in Redux:
// 1. Write loading action
// 2. Write success action with caching middleware
// 3. Write error action
// 4. Write refetch action
// 5. Write invalidation action
// 6. Manage staleness logic
// 7. Handle background refetching
// ... 200 lines of boilerplate per endpoint
```

### The Right Way — Separate Tools for Separate Concerns

```typescript
// ✅ Server state → TanStack Query
// ✅ Client state → Zustand (small) or local useState

// Server state
function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],   // cache key
    queryFn: () => api.getProducts(filters),
    staleTime: 5 * 60 * 1000,          // consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000,            // keep in cache for 10 minutes
  });
}

// Client state
const useUIStore = create((set) => ({
  sidebarOpen: false,
  activeTab: 'overview',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

// Component: compose both
function ProductDashboard() {
  // Server state
  const [filters, setFilters] = useState({ category: 'all' });
  const { data: products, isLoading, error } = useProducts(filters);
  
  // Client state
  const { sidebarOpen, toggleSidebar } = useUIStore();
  
  // ← clean, no Redux boilerplate for either concern
}
```

### TanStack Query — Server State Management Deep Dive

```typescript
// Key concepts: queryKey, queryFn, caching, background refetch, invalidation

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,     // default: 1 min before data is considered stale
      retry: 2,                 // retry failed queries twice
      refetchOnWindowFocus: true, // refetch when user returns to tab
    },
  },
});

// Query: fetching
function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user', userId],       // array queryKey enables dependency tracking
    queryFn: () => api.getUser(userId),
    enabled: !!userId,               // conditional fetch — only when userId is truthy
    select: (data) => ({             // transform/derive before storage
      displayName: `${data.firstName} ${data.lastName}`,
      initials: `${data.firstName[0]}${data.lastName[0]}`,
      ...data,
    }),
  });
}

// Mutation: updating + automatic cache invalidation
function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: UpdateProfilePayload) => api.updateProfile(updates),
    
    // Optimistic update: instantly show the change, revert on failure
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['user', updates.userId] });
      const previous = queryClient.getQueryData(['user', updates.userId]);
      queryClient.setQueryData(['user', updates.userId], (old) => ({ ...old, ...updates }));
      return { previous };  // return for rollback
    },
    
    onError: (err, updates, context) => {
      // Revert optimistic update on error
      queryClient.setQueryData(['user', updates.userId], context?.previous);
    },
    
    onSettled: (data, err, updates) => {
      // Invalidate and refetch to get confirmed server state
      queryClient.invalidateQueries({ queryKey: ['user', updates.userId] });
    },
  });
}
```

### Cache Strategy for Server State

```typescript
// Query key hierarchy enables partial cache invalidation

queryKey: ['products']                    // invalidates ALL product queries
queryKey: ['products', { category }]      // invalidates queries for this category
queryKey: ['products', productId]         // invalidates this specific product
queryKey: ['products', productId, 'reviews'] // invalidates reviews for this product

// Use in invalidation
queryClient.invalidateQueries({ queryKey: ['products'] });         // invalidate all
queryClient.invalidateQueries({ queryKey: ['products', 'shoes'] }); // just shoes

// Prefetching for anticipated navigation
queryClient.prefetchQuery({
  queryKey: ['products', nextProductId],
  queryFn: () => api.getProduct(nextProductId),
});
```

---

## 3. Real-World Examples

**At Hruday's level (SAP Analytics):** SAP Analytics Cloud's data fetching (fetching story data, widget data, datasource metadata) is server state — asynchronous, stale, shared. UI state (whether a panel is expanded, active filter chip, current zoom level) is client state. Before TanStack Query was mainstream, SAP apps used Redux for both — maintaining custom loading/error/cache state for every API endpoint. The migration to dedicated server state management eliminates entire slices of the Redux store.

**Vercel:** Vercel's dashboard uses TanStack Query for all deployment data, domain records, and team information (server state) and Zustand for sidebar state and filter panel state (client state). These are cleanly separated —no overlap.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "Server state and client state have completely different characteristics. Server state lives on the backend — it's asynchronous, can go stale when other users make changes, needs caching, background refetching, and invalidation. Client state is synchronous, ephemeral, and you control it entirely. The biggest architectural mistake is using Redux for both. For server state, TanStack Query or SWR is dramatically better — they handle the entire lifecycle out of the box: caching, background refetch, stale-while-revalidate, deduplication, and mutation with optimistic updates. For client state, Zustand or local `useState` is sufficient. Separating these concerns typically eliminates 60-70% of a Redux store in apps that were using Redux for server data."

**Likely Follow-up Questions:**
1. When is server state not stale? → When `staleTime` is set high (treat it as fresh for N minutes); useful for data that changes infrequently (product categories, user preferences) — reduces unnecessary background refetches
2. How does TanStack Query handle deduplication? → Multiple components calling `useQuery` with the same queryKey share a single in-flight request — the library deduplicates at the query level; the second component subscribes to the in-progress query instead of firing a new one
3. What is SWR and how does it differ from TanStack Query? → SWR is Vercel's server state library — simpler API, smaller bundle; TanStack Query is more feature-rich (background fetch indicators, query cancellation, offline mode, better TypeScript, devtools). Both implement stale-while-revalidate caching.

---

## 5. Code Example

```typescript
// Practical: modal that shows a user profile loaded from server
// Server state: user data (TanStack Query)
// Client state: modal open/close (local useState)

function UserModalTrigger({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);  // client state — local is fine
  
  // Prefetch on hover — server state will be cached when modal opens
  const queryClient = useQueryClient();
  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => api.getUser(userId),
      staleTime: 5 * 60 * 1000,
    });
  };
  
  return (
    <>
      <button onMouseEnter={handleMouseEnter} onClick={() => setIsOpen(true)}>
        View Profile
      </button>
      {isOpen && (
        <UserModal userId={userId} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}

function UserModal({ userId, onClose }: UserModalProps) {
  const { data: user, isLoading } = useQuery({  // server state
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId),
    // Data already in cache from prefetch — instant render
  });
  
  return (
    <Modal onClose={onClose}>
      {isLoading ? <Skeleton /> : <UserProfile user={user!} />}
    </Modal>
  );
}
```

---

## 6. Memory Aid

**Mental model:** Server state is a **public library book** — it exists outside your home, others can modify it, it might have a newer edition by the time you check it again, and you need to return it (cache expiry). Client state is your **personal notebook** — only you write in it, it never goes stale without your action, and you can tear out pages freely.

**"Server state = someone else's data you're borrowing."** Use TanStack Query to manage the borrowing lifecycle. Client state = your own data. Use useState or Zustand.

---

## 7. Why & How Summary

**Why it matters:** Mixing server and client state in the same Redux store forces developers to manually manage caching, staleness, loading states, and background refetch — concerns that dedicated server state libraries handle automatically and better.

**How it works:** TanStack Query maintains an in-memory cache keyed by queryKey arrays. On `useQuery` mount, it checks the cache for a matching key: if present and within `staleTime`, it returns cached data immediately. If stale or absent, it calls the queryFn, caches the result, and updates all subscribers. On window focus or network reconnection, stale queries background-refetch automatically.

**Company relevance:**
- Microsoft: Azure Portal uses TanStack Query for resource data fetching; separation of server and client state reduces boilerplate and centralises cache management
- Adobe: Experience Manager web UI uses server state patterns for asset library data
- Salesforce: Salesforce's REST API data in custom components is server state — TanStack Query patterns directly apply to custom LWC development using REST
- Cisco: Webex REST API data (meetings, contacts, messages) is server state; applying server-state library patterns improves real-time data management
