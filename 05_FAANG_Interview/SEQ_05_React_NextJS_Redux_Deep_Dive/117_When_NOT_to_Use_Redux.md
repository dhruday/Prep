# 117. When NOT to Use Redux — Choosing the Right Tool
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Redux solves a specific problem: complex client-side state that's shared across many components far apart in the tree, with complex state transitions that benefit from explicit modeling and DevTools visibility. It's NOT the right tool for: server state (asynchronously fetched data that needs caching, invalidation, revalidation — use React Query or RTK Query instead); local UI state (a modal's open/closed state — keep it in the component); temporary form state (react-hook-form is better); simple apps with 1-3 levels of prop drilling (React Context is enough). The signal to add Redux: you have genuinely complex CLIENT state that multiple unrelated parts of the UI need to read and write simultaneously, with logic that's too complex to manage in individual components.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The State Category Framework

```
State type          |  Best tool           |  Why NOT Redux
─────────────────────────────────────────────────────────────────
Server state        |  RTK Query / React   |  Redux can't cache, revalidate,
(API data, cache)   |  Query               |  or deduplicate requests natively
─────────────────────────────────────────────────────────────────
URL state           |  URL / router        |  URL is the source of truth for
(filters, page,     |  (useSearchParams)   |  shareability; Redux would be
current ID)         |                      |  a secondary, out-of-sync copy
─────────────────────────────────────────────────────────────────
Form state          |  react-hook-form /   |  Re-render per keystroke in Redux;
(inputs, validation)|  local state         |  form state lifecycle != app state
─────────────────────────────────────────────────────────────────
UI state            |  useState / context  |  Modal open, tab selected, hover
(component-local)   |  (if shared nearby)  |  state doesn't belong globally
─────────────────────────────────────────────────────────────────
Complex client      |  Redux (RTK)         |  ✅ THE right use case
state (cart, user   |                      |
session, complex    |                      |
multi-feature state)|                      |
```

### Server State — Where Most Redux Misuse Happens

```typescript
// ❌ Classic (mis)use of Redux for server state
// Problem: you're building a poor clone of a caching library
const productsSlice = createSlice({
  name: 'products',
  initialState: {
    data: [] as Product[],
    loading: false,
    error: null as string | null,
    lastFetched: null as number | null,  // are we caching? manually!
  },
  // ...reducers for loading/fulfilled/rejected...
});

// The questions Redux can't answer without custom code:
// When is this data stale and should be refetched?
// Should 2 components mounting simultaneously deduplicate the request?
// If the window refocuses after 10 minutes, should data refresh?
// What if multiple pages need the same product list?
// All this logic = hundreds of lines of custom middleware/thunks

// ✅ RTK Query: answers all of these automatically
const { useGetProductsQuery } = productApi;
function ProductList() {
  const { data, isLoading, isFetching } = useGetProductsQuery(undefined, {
    refetchOnFocus: true,           // refetch when window regains focus
    pollingInterval: 60 * 1000,    // background refresh every minute
    refetchOnMountOrArgChange: 30, // refetch if cache is >30s old
  });
  // No reducer, no thunk, no loading state management
}
```

### URL State — Often Redux Duplicated

```typescript
// ❌ Storing current route/filter state in Redux
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    currentPage: 1,
    selectedCategory: 'all',
    searchQuery: '',
    sortBy: 'price-asc',
  },
  // ...
});

// Problems:
// 1. URL doesn't reflect state → not shareable, not bookmarkable
// 2. Browser back button doesn't work (URL didn't change)
// 3. Two sources of truth: URL bar vs Redux store → can drift

// ✅ URL is the source of truth for shareable, navigable state
import { useSearchParams } from 'react-router-dom';

function ProductFilterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);
  const category = searchParams.get('category') ?? 'all';
  const sort = searchParams.get('sort') ?? 'price-asc';

  // URL = single source of truth
  // Share URL → share exact filter state
  // Browser back → restore previous filter state
  // Bookmark → save current filter state
}
```

### When Context Is Enough

```typescript
// ❌ Using Redux for simple shared state (2-3 components, simple updates)
// Setting up store, slice, selector, dispatch for a modal's display state
const modalSlice = createSlice({
  name: 'modal',
  initialState: { isOpen: false, type: null as string | null },
  reducers: {
    openModal: (state, action) => { state.isOpen = true; state.type = action.payload },
    closeModal: (state) => { state.isOpen = false; state.type = null },
  },
});
// 10-15 lines of boilerplate for a toggle

// ✅ Local state handles this fine
function App() {
  const [modalType, setModalType] = useState<string | null>(null);
  return (
    <>
      <Button onClick={() => setModalType('confirm')}>Open</Button>
      {modalType && <Modal type={modalType} onClose={() => setModalType(null)} />}
    </>
  );
}

// ✅ Context handles it when needed across distant components
const ModalContext = React.createContext<ModalContextValue>({ isOpen: false, openModal: () => {}, closeModal: () => {} });
// No Redux needed for this

// The "Context instead of Redux" guideline:
// - State shapes: theme, locale, auth status, feature flags → Context
// - Update frequency: low → Context fine; high-frequency: Context can cause re-renders
// - Who updates: one place → Context; any component anywhere → Redux benefits
// - Complexity: simple → Context; complex transitions, audit trail → Redux
```

### The Jotai/Zustand Alternative

```typescript
// When Redux's boilerplate is the concern but shared state is needed
// Lighter alternatives:
// - Zustand: minimal API, no boilerplate, stores as modules
// - Jotai: atom-based, fine-grained reactivity (Recoil pattern)

// Zustand example:
import { create } from 'zustand';

const useCartStore = create<{
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
}>((set) => ({
  items: [],
  addItem: (item) => set(state => ({ items: [...state.items, item] })),
  removeItem: (id) => set(state => ({ items: state.items.filter(i => i.id !== id) })),
}));

// Use directly in any component — no Provider, no dispatch, no selectors
function CartBadge() {
  const count = useCartStore(state => state.items.length);
  return <span>{count}</span>;
}

// Zustand is appropriate when:
// ✅ You need shared state but Redux's ceremony is disproportionate
// ✅ Greenfield small-medium app without large team
// ✅ Don't need DevTools time travel as strictly
// ✅ No complex async orchestration (no middleware needed)

// Redux remains appropriate when:
// ✅ Large team: explicit, structured, standardized Redux code scales better than "creative" Zustand
// ✅ DevTools time travel debugging is a real workflow requirement
// ✅ Complex async (sagas)
// ✅ Enterprise: audit trail, deterministic state reproduction
```

### Decision Flowchart

```
Is this data fetched from an API?
  YES → Use RTK Query or React Query — not Redux slices
  NO → Continue...

Does only ONE component (or a small nearby subtree) need this state?
  YES → useState / useReducer in the component
  NO → Continue...

Is this state navigable (represented as URL params)?
  YES → useSearchParams / router state
  NO → Continue...

Is this truly global client state needed by many unrelated components?
  YES → Redux (RTK) for complex state; Context for simple
  
Within global state, is it complex enough for Redux?
  - Multiple features write + read it? → Redux
  - Complex transitions / business rules? → Redux
  - Need time-travel debugging? → Redux
  - Simple toggle / preference? → Context
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP Labs, after auditing the Redux store: 60% of stored state was server data (product catalog, orders, inventory) — all migrated to RTK Query. 25% was URL state (current page, filters, selected items) — migrated to URL params with React Router. The remaining 15% was genuine client state (cart contents, draft order before submission, UI panel visibility) — stayed in Redux. Result: Redux store went from 15 slices to 4. Selector complexity dropped dramatically. DevTools logs became readable (fewer high-frequency fetched-data updates).

**At FAANG scale:**
- **Microsoft:** Teams "State Audit" initiative identified that ~40% of Redux usage was server state caching that could be replaced with their internal query library; migration reduced Redux action frequency by ~70%
- **Salesforce:** Trailhead's "State Hygiene" audit found URL state being duplicated in Redux (current module, current unit) — removing it from Redux and reading from URL ensured bookmarks and direct links worked correctly
- **Cisco:** DevNet API catalog — hundreds of endpoints in Redux for filtering state; migrated to URL params, which made filter combinations linkable (major UX improvement for sharing API collections)

---

## 💬 4. Interview Execution

### Sample Answer

> "I think about state in four buckets: server state, URL state, form state, and client state. Redux is only the right tool for the last one — and only when it's genuinely complex.
>
> The biggest misuse I've seen is using Redux as a cache for server data. You dispatch a thunk, manage loading/error/data in a reducer manually — and you've built a worse version of RTK Query or React Query. Those libraries handle caching, deduplication, background refresh, stale-while-revalidate automatically. RTK Query stores in the Redux store, so DevTools still work.
>
> URL state — filters, pagination, selected IDs — belongs in the URL. If it's in Redux, browser back doesn't work, bookmarks don't capture state, and you have two sources of truth. `useSearchParams` from React Router is the right tool.
>
> Form state belongs in the form library (react-hook-form). Redux re-renders on every keystroke; react-hook-form doesn't.
>
> For simple shared state like theme or auth status — Context is enough. No need for Redux's ceremony.
>
> Redux's actual niche: complex, shared client state that multiple unrelated parts of the UI read and write, with complex business-logic transitions, where DevTools time travel and an explicit action log provide real debugging value. Cart state, draft workflow state, complex wizard state, real-time collaboration state — those are the right Redux use cases."

---

## 💻 5. Code Example

```typescript
// ========================
// Architecture: RIGHT tool for each state type
// ========================

// — SERVER STATE: RTK Query —
const { useGetProductsQuery, useUpdateProductMutation } = productApi;

// — URL STATE: React Router —
import { useSearchParams } from 'react-router-dom';
function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  return {
    category: searchParams.get('category') ?? 'all',
    page: Number(searchParams.get('page') ?? 1),
    setCategory: (cat: string) =>
      setSearchParams(p => { p.set('category', cat); p.set('page', '1'); return p; }),
    setPage: (page: number) =>
      setSearchParams(p => { p.set('page', String(page)); return p; }),
  };
}

// — FORM STATE: react-hook-form —
import { useForm } from 'react-hook-form';
function ProductEditForm({ product }: { product: Product }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: product.name, price: product.price },
  });
  // ...
}

// — LOCAL UI STATE: useState —
function ProductCard({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);  // local toggle
  const [hover, setHover] = useState(false);         // local UI state
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <h3>{product.name}</h3>
      <button onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Less' : 'More'}
      </button>
    </div>
  );
}

// — CONTEXT: shared simple state across nearby components —
const ThemeContext = React.createContext<'light' | 'dark'>('light');
// Auth, theme, locale → Context

// — REDUX (RTK): genuine complex client state —
import { useAppSelector, useAppDispatch } from '../store';
import { addItem, removeItem } from '../features/cart/cartSlice';

// ✅ Cart: complex client state (persisted, multi-feature, business rules)
//    - Checkout page reads total
//    - Product page reads item count
//    - Header badge reads item count
//    - Order summary reads all items
//    - Discount rules run on item list
//    → Genuinely needs Redux: multiple unrelated components, complex transitions
function CartActions({ productId }: { productId: string }) {
  const dispatch = useAppDispatch();
  const cartItem = useAppSelector(state => state.cart.entities[productId]);

  return cartItem
    ? <button onClick={() => dispatch(removeItem(productId))}>Remove</button>
    : <button onClick={() => dispatch(addItem({ id: productId, quantity: 1 }))}>Add to Cart</button>;
}

// ========================
// Type stubs
// ========================
interface Product { id: string; name: string; price: number }
interface CartItem { id: string; quantity: number }
declare const productApi: any;
```

---

## 🧠 6. Memory Aid

**Four questions to choose the right tool:**
1. Is it from a server? → RTK Query / React Query
2. Is it in the URL? → useSearchParams / router
3. Is it local to one component or form? → useState / react-hook-form
4. Is it complex shared client state? → Redux (RTK)

**Context vs Redux decision:**
- Context when: few writers, simple shape, low frequency
- Redux when: many writers, complex transitions, need DevTools

**The anti-patterns to call out in interviews:**
- Server data in Redux slices (instead of RTK Query)
- URL filters in Redux (not bookmarkable/shareable)
- Form inputs dispatching on every keystroke

**Mnemonic:** **SUFC** — **S**erver state → Query library, **U**RL state → Router, **F**orm state → RHF, **C**lient state → Redux.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Avoiding over-engineering is a senior-level signal: recommending Redux for a simple theme toggle, or a 3-page app, signals poor judgment; knowing when NOT to use it is as important as knowing how to use it
→ Architecture interviews: "how would you manage state in this design?" is a common system design question — the ability to categorize state and select the appropriate tool for each category is the expected senior/staff answer
→ Migration experience: Hruday's SAP background included Redux-heavy codebases where the majority of Redux was actually server state caching — recognizing this anti-pattern and pointing to RTK Query as the solution is directly applicable

**How it works (2 sentences):**
The core insight is that different state categories have fundamentally different lifecycle requirements: server state needs cache invalidation, deduplication, and background revalidation (a dedicated query library's job); URL state needs to survive page refresh and be shareable (the URL's job); form state needs low-latency updates without global re-renders (a ref-based form library's job); and only genuine client state — the subset that is shared across many components, modified by complex business rules, and requires explicit transition modeling — benefits from Redux's predictable state container model.
Each wrong tool choice carries a specific cost: Redux for server state means manually building a caching layer that will always be worse than a dedicated library; Redux for URL state creates shareability bugs; Redux for forms creates performance problems; and using any global store for local state creates unnecessary coupling where component isolation would serve better.

---
✅ Topic 117/486 complete → Continuing to Topic 118: Next.js App Router — Layouts, Pages, and Routing
