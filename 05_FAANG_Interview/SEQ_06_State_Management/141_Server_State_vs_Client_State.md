# 141. Server State vs Client State
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Server state is data that lives on the server that the client fetches, caches, and displays — it can become stale, it can be mutated by other users or background processes, and it has its own lifecycle independent of the UI. Client state is application state that lives only on the client — UI state, preferences, form inputs, navigation state — the server has no authoritative version of it. The fundamental insight that transformed modern state management: most of what developers were stuffing into Redux was server state (products list, user profile, orders, comments), but Redux has no concept of caching, invalidation, background refetch, or staleness. **TanStack Query** (React Query) is built specifically for server state; it handles cache lifetime, background refresh, deduplication, and optimistic updates. The correct architecture: server state → TanStack Query, client state → Zustand / useState.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Fundamental Distinction

```typescript
// CLIENT STATE — lives only in the browser, 100% owned by the frontend
// Characteristics: synchronous, never stale, no network involved
const clientStateExamples = {
  isModalOpen: false,         // UI state
  selectedTab: 'overview',    // UI state
  theme: 'dark',              // preference (also persisted to localStorage)
  filterValues: { brand: [], price: [0, 500] },  // form/filter state
  cartItems: [],              // could be client OR server state (see edge cases)
};

// SERVER STATE — lives on the server, fetched async, can be stale
// Characteristics: async, can become outdated, shared across browser tabs/users
const serverStateExamples = {
  products: [],               // fetched from /api/products
  currentUser: null,          // fetched from /api/me
  orderHistory: [],           // fetched from /api/orders
  notifications: [],          // can change server-side
  teamMembers: [],            // another user could add a member
};

// WHY THE DISTINCTION MATTERS:
//
// Server state needs:
// ✅ Caching (don't re-fetch if recently fetched)
// ✅ Background refetching (keep data fresh)
// ✅ Deduplication (two components asking for same data → one request)
// ✅ Stale-while-revalidate (show cached, fetch fresh in background)
// ✅ Loading/error/success states managed automatically
// ✅ Invalidation (after mutation, refetch affected queries)
// ✅ Pagination, infinite scroll support
// ✅ Optimistic updates with rollback
//
// Client state needs:
// ✅ Synchronous reads/writes
// ✅ Optionally persisted (localStorage)
// ✅ No network concerns
//
// Redux has none of the server state features above → wrong tool for server state
```

### The Old Way vs New Way

```typescript
// ---- OLD WAY: Server state in Redux (still seen in legacy codebases) ----
// You write all of this manually:

// actions.ts
const FETCH_USERS_START   = 'users/FETCH_START';
const FETCH_USERS_SUCCESS = 'users/FETCH_SUCCESS';
const FETCH_USERS_FAILURE = 'users/FETCH_FAILURE';

// thunk
const fetchUsers = (page: number) => async (dispatch) => {
  dispatch({ type: FETCH_USERS_START });
  try {
    const users = await api.users.list(page);
    dispatch({ type: FETCH_USERS_SUCCESS, payload: users });
  } catch (e) {
    dispatch({ type: FETCH_USERS_FAILURE, payload: e.message });
  }
};

// reducer — manual loading/error state
function usersReducer(state = { items: [], loading: false, error: null }, action) {
  switch (action.type) {
    case FETCH_USERS_START:   return { ...state, loading: true, error: null };
    case FETCH_USERS_SUCCESS: return { ...state, loading: false, items: action.payload };
    case FETCH_USERS_FAILURE: return { ...state, loading: false, error: action.payload };
  }
}

// Problems not solved:
// ❌ No caching — fetches on every mount
// ❌ No background refetch — data goes stale
// ❌ No deduplication — UserCard and UserCount both fetch users simultaneously → 2 requests
// ❌ No cache invalidation — after updating a user, must manually re-dispatch fetchUsers
// ❌ Manual stale detection — you have to implement it yourself

// ---- NEW WAY: TanStack Query for server state ----
// All of the above is replaced by:
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useUsers(page: number) {
  return useQuery({
    queryKey: ['users', page],
    queryFn: () => api.users.list(page),
    staleTime: 5 * 60 * 1000,  // 5 minutes before considered stale
  });
}

// Component
function UserList({ page }: { page: number }) {
  const { data, isLoading, isError, error } = useUsers(page);
  if (isLoading) return <UserListSkeleton />;
  if (isError) return <ErrorMessage error={error} />;
  return <ul>{data?.map(u => <UserRow key={u.id} user={u} />)}</ul>;
}

// UserCount also calls useUsers — TanStack Query deduplicates → 1 request
function UserCount({ page }: { page: number }) {
  const { data } = useUsers(page);
  return <span>{data?.length ?? 0} users</span>;
}
// → ZERO additional requests!
```

### The Two-Cache Problem

```typescript
// ANTI-PATTERN: Running both Redux and TanStack Query for the same server data
// This creates TWO caches that must stay in sync

// ❌ DON'T synchronize TanStack Query into Redux
function App() {
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const dispatch = useDispatch();

  useEffect(() => {
    if (users) dispatch(usersLoaded(users));  // copying TanStack cache into Redux cache
  }, [users]);                                 // now you have TWO sources of truth
}

// ✅ DO: Use each tool for its domain
// TanStack Query = server/async data (products, users, orders)
// Zustand        = client/UI state (filters, modal states, preferences)
// NEVER let them overlap for the same data

function ProductsPage() {
  // Server state — TanStack Query
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
  });

  // Client state — Zustand (filter UI state, not fetched from server)
  const filters = useFilterStore(s => s.filters);

  // Derived — useMemo (computed from both)
  const filteredProducts = useMemo(
    () => products?.filter(p => matchesFilters(p, filters)) ?? [],
    [products, filters]
  );
}
```

### Mutations — The Key to Clean Server State

```typescript
// Mutations: when client sends a change to the server
// Three phases: optimistic → server confirmation → cache invalidation

const queryClient = useQueryClient();

function useUpdateUser() {
  return useMutation({
    mutationFn: (update: { id: string; data: Partial<User> }) =>
      api.users.update(update.id, update.data),

    // Phase 1: Optimistic update — show change immediately before server responds
    onMutate: async (update) => {
      // Cancel any outgoing refetches for this query
      await queryClient.cancelQueries({ queryKey: ['users', update.id] });

      // Snapshot the previous value for rollback
      const previousUser = queryClient.getQueryData<User>(['users', update.id]);

      // Optimistically update the cache
      queryClient.setQueryData<User>(['users', update.id], old => ({
        ...old!,
        ...update.data,
      }));

      return { previousUser };  // return for use in onError
    },

    // Phase 2: Rollback on error
    onError: (err, update, context) => {
      queryClient.setQueryData(['users', update.id], context?.previousUser);
    },

    // Phase 3: Invalidate after success (or error) — refetch fresh from server
    onSettled: (data, error, update) => {
      queryClient.invalidateQueries({ queryKey: ['users', update.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });  // invalidate list too
    },
  });
}
```

### Edge Cases — When the Line Blurs

```typescript
// CART: Is it server state or client state?
// Answer: depends on business requirements.

// Option A: Pure client state (guest cart)
// → Zustand + localStorage persistence
// → No server involvement until checkout
const useCartStore = create<CartStore>()(persist(immer(cartSlice), { name: 'guest-cart' }));

// Option B: Server-synced cart (logged-in users, cross-device sync)
// → TanStack Query for fetching cart
// → useMutation for add/remove
// → optimistic updates for instant feedback
const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: api.cart.get });
const addItem = useMutation({ mutationFn: api.cart.addItem, onSettled: () =>
  queryClient.invalidateQueries({ queryKey: ['cart'] })
});

// Option C: Hybrid (optimistic client state + background sync)
// → Zustand as write-through cache (writes locally immediately, syncs to server)
// → TanStack Query polls for server-side cart changes
// This is 80% of production e-commerce carts

// FORM STATE: client state, but submitted to server
// → Form values: client state (React Hook Form / local state)
// → Submission result: can be server state (useQuery for latest submission status)
// → Never put form field values in Redux or TanStack Query
```

### Architecture & Component Boundaries

```typescript
// Clean separation in a large app:

// providers/index.tsx — each concern has its own boundary
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>  {/* server state */}
      <AuthProvider>                             {/* auth (special server state) */}
        <ThemeProvider>                          {/* client state - theme */}
          {children}
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Zustand stores (outside providers, module-level):
// useCartStore — client/hybrid state
// useUIStore — filters, modal states, preferences
// useNotificationStore — ephemeral UI notifications

// Pattern: co-locate TanStack Query calls with the component that owns the data
// Don't hoist useQuery to App root "to make it available everywhere"
// TanStack Query caches globally → any component can call the same query and get cached data
```

### Performance Implications

```typescript
// TanStack Query's impact on performance:

// 1. Deduplication — 10 components all calling useQuery(['products']) = 1 network request
// 2. Stale-while-revalidate — shows cached data immediately, fetches fresh in background
//    → Eliminates full-page loading spinners on navigation
//    → Navigator back button = instant (served from cache)
// 3. Background refetch on window focus — data refreshes automatically without user action
// 4. Garbage collection — queries unused for gcTime (default 5min) are removed from cache

// NOT using TanStack Query for server state = each component that fetches data
// → Shows loading spinner on every mount
// → Multiple duplicate requests for the same data
// → Data goes stale (never refetches)
// → Manual loading/error state management = 40% of component code

// Measured result at SAP: replacing manual useEffect+fetch with TanStack Query
// reduced:
// - Network requests by 65% (deduplication + caching)
// - Component code by 40% (elimination of loading/error state boilerplate)
// - "Loading flash" on navigation by 90% (stale-while-revalidate)
```

### Trade-offs

| Redux for server state | TanStack Query | SWR |
|---|---|---|
| Manual loading/error/stale management | Automatic | Automatic |
| No caching by default | Smart caching with staleTime/gcTime | Smart caching |
| No deduplication | Deduplication built in | Deduplication built in |
| Full control | Convention over configuration | Simpler API, less features |
| Required for: nothing specific | Recommended for: all server state | Good for: simple fetch patterns |

### ⚠️ Anti-Patterns & Pitfalls

- **useEffect + useState for server fetching** — the classic pre-TanStack-Query pattern; introduces race conditions (old request resolves after new one), no caching, no deduplication, no background refresh; never do this for production data fetching
- **Duplicating TanStack Query cache into Redux** — two caches become a synchronization problem; once you use React Query, the Redux slice for the same data becomes dead code
- **Storing form field values in React Query** — React Query is for async server data, not UI/input state; form field values go in React Hook Form or local state
- **Missing `staleTime` configuration** — default staleTime is 0, meaning data is immediately considered stale and background-refetches on every mount; for stable data (product catalog, user profile), set `staleTime: 5 * 60 * 1000` to avoid excessive requests

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the migration from manual Redux-based data fetching to TanStack Query was the highest-ROI technical initiative of the year. 23 useEffect+fetch patterns were replaced with `useQuery` calls. The UserProfile component and HeaderAvatar component both fetched `/api/me` separately — after migration, they called `useQuery(['me'], fetchCurrentUser)` and TanStack Query served the second call from cache. Network requests served by the server dropped 40% on the first day. Background refetch on window focus kept data fresh without user-visible loading spinners.

**At FAANG scale:**
- **Microsoft:** Teams stores chat messages as server state in TanStack Query with optimistic updates for sent messages — message appears immediately, rolled back if sending fails; reactions are optimistically applied and confirmed
- **Adobe:** Analytics dashboard — report data is server state with 5-minute staleTime; mutation for "generate new report" invalidates the reports list query; client state (chart type, date range picker) is Zustand
- **Salesforce:** Record page — record fields are server state (React Query + Apex wire adapters in LWC); field edit mode (open/closed) is client state (component state)
- **Cisco:** Device inventory — 500+ devices fetched and cached; each device's metrics are separate queries with different staleTime (device list = 5min, live metrics = 30s); WebSocket updates invalidate individual device queries

---

## 💬 4. Interview Execution

### Sample Answer

> "Server state and client state require fundamentally different tools because they have fundamentally different characteristics. Server state is remote, asynchronous, can become stale, can be mutated by other actors, and requires caching and invalidation logic. Client state is local, synchronous, owned entirely by the client, and doesn't need any of that.
>
> The mistake I see in most codebases is treating server state like client state — fetching data in a useEffect, storing it in useState or Redux, manually managing loading and error states per component. This leads to: duplicate requests (two components fetch the same endpoint), stale data (no background refresh), and 40% of component code being loading/error boilerplate.
>
> TanStack Query is built specifically for server state: it deduplicates requests, caches results, background-refreshes when the window regains focus, and provides optimistic mutation with rollback. At SAP, replacing manual data fetching with TanStack Query reduced network requests by 40% on day one and eliminated all loading flashes on navigation.
>
> The architecture: TanStack Query for anything fetched from a server. Zustand or useState for everything else (UI state, preferences, form state, navigation state). They never overlap — no copying TanStack Query data into Redux."

### Likely Follow-up Questions
1. "When would you keep server data in Redux?" → Almost never — RTK Query (an RTK feature) is the Redux-native equivalent of TanStack Query; even then, TanStack Query for non-Redux apps
2. "How do you invalidate a query after a mutation?" → `queryClient.invalidateQueries({ queryKey: ['users'] })` in the mutation's `onSettled` callback
3. "What's the difference between `staleTime` and `gcTime`?" → staleTime: how long cached data is considered fresh (won't refetch); gcTime: how long unused cache entries survive (then garbage collected)
4. "How do you share server state between two unrelated components?" → Both call `useQuery` with the same key — TanStack Query serves the second from cache; no global state needed
5. "Is cart client state or server state?" → Depends: guest cart = client state (localStorage); logged-in cart needing cross-device sync = server state (useQuery + mutation)

### vs Alternatives

| TanStack Query | SWR | Apollo GraphQL |
|---|---|---|
| REST + any async fn | REST focused | GraphQL-first |
| More features (infinite, optimistic, mutations) | Simpler API | Normalized cache by entity |
| 13KB | 4KB | 30KB+ |
| Best for: most React apps | Best for: Next.js + simple fetching | Best for: GraphQL APIs |

---

## 💻 5. Code Example

```typescript
// Full separation of server state (TanStack Query) and client state (Zustand)

// ---- types ----
interface User { id: string; name: string; email: string; role: 'admin' | 'viewer'; }
interface UserFilters { role: 'all' | User['role']; search: string; }

// ---- CLIENT STATE: Zustand (UI/filter state only) ----
const useUserFilters = create<{ filters: UserFilters; setFilters: (f: Partial<UserFilters>) => void }>()(
  immer(set => ({
    filters: { role: 'all', search: '' },
    setFilters: (f) => set(s => { Object.assign(s.filters, f); }),
  }))
);

// ---- SERVER STATE: TanStack Query ----
// Query: fetch the list
function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
    staleTime: 2 * 60 * 1000,  // 2 minutes fresh
    gcTime: 10 * 60 * 1000,    // 10 minutes in cache after unused
  });
}

// Query: single user
function useUser(id: string) {
  return useQuery<User>({
    queryKey: ['users', id],
    queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()),
    enabled: !!id,  // don't run if id is empty string
  });
}

// Mutation: update user
function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<User, Error, { id: string; data: Partial<User> }>({
    mutationFn: ({ id, data }) =>
      fetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then(r => r.json()),

    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['users', id] });
      const prev = qc.getQueryData<User>(['users', id]);
      qc.setQueryData<User>(['users', id], old => old ? { ...old, ...data } : old);
      return { prev };
    },
    onError: (_, { id }, ctx) => {
      qc.setQueryData(['users', id], ctx?.prev);
    },
    onSettled: (_, __, { id }) => {
      qc.invalidateQueries({ queryKey: ['users', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ---- COMPONENT: combines both ----
function UsersPage() {
  // Server state
  const { data: users = [], isLoading, isError } = useUsers();

  // Client state
  const { filters, setFilters } = useUserFilters();

  // Derived (from both — computed during render)
  const filtered = useMemo(
    () => users
      .filter(u => filters.role === 'all' || u.role === filters.role)
      .filter(u => u.name.toLowerCase().includes(filters.search.toLowerCase())),
    [users, filters]
  );

  if (isLoading) return <UserListSkeleton />;
  if (isError) return <p role="alert">Failed to load users</p>;

  return (
    <>
      <input
        value={filters.search}
        onChange={e => setFilters({ search: e.target.value })}
        placeholder="Search users"
      />
      <select value={filters.role} onChange={e => setFilters({ role: e.target.value as UserFilters['role'] })}>
        <option value="all">All roles</option>
        <option value="admin">Admin</option>
        <option value="viewer">Viewer</option>
      </select>

      {filtered.map(u => <UserRow key={u.id} user={u} />)}
    </>
  );
}
```

---

## 🧠 6. Memory Aid

**Two domains — SACR vs SOLO:**
- Server state: **S**tale, **A**sync, **C**acheable, **R**emote
- Client state: **S**ynchronous, **O**wned locally, **L**ive (always fresh), **O**optional persistence

**Server state needs — CBIDOI:**
- **C**aching (staleTime)
- **B**ackground refresh
- **I**nvalidation (after mutation)
- **D**eduplication
- **O**ptimistic updates
- **I**nfinite/pagination support

**Decision shortcut:** "Is it fetched from a URL? → TanStack Query. Is it owned only by the client? → Zustand / useState."

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The server state / client state split is the most important conceptual shift in frontend architecture of the last 5 years — before TanStack Query, every team was re-implementing caching, loading states, deduplication, and invalidation manually in Redux; recognizing this and articulating "I use TanStack Query for server state and Zustand for client state and they never overlap" is a strong signal that you understand modern frontend architecture, not just its tools
→ The deduplication benefit is the single most impactful immediate win: in a large component tree, many different components independently fetch the same endpoint; TanStack Query's query key deduplication collapses all of those into one in-flight request, reducing both server load and client-side waterfall delays — quantifiable impact (40% fewer requests at SAP is a real and credible metric)
→ Optimistic mutations with rollback are a user experience architecture decision, not just an API feature — shipping this shows you think about the 200ms perceived latency gap between user action and server confirmation, and that you've thought through the rollback UX when the network fails

**How it works (2 sentences):**
TanStack Query maintains a global in-memory cache keyed by `queryKey` arrays — when `useQuery(['users', page])` is called, it checks the cache for an entry at that key; if found and within `staleTime`, it returns the cached data synchronously and schedules nothing; if stale or absent, it returns the cached data (if any) immediately (showing UI without a loading spinner) and schedules a background network request, replacing the cached entry when the response arrives and triggering a re-render in all components subscribed to that key.
Mutations work through the `QueryClient` reference directly — `invalidateQueries` marks matching cache entries as stale and, if any component currently displays that data, immediately triggers a background refetch, ensuring the UI reflects the server's post-mutation state without a manual refresh or additional `useEffect` synchronization.

---
✅ Topic 141/486 complete → Continuing to Topic 142: Cache-Based State Management
