# 147. Avoiding Over-Global State
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Over-global state is when application state that should live locally in a component or a narrow subtree gets elevated to a global store — causing unnecessary re-renders across unrelated parts of the app, harder-to-reason-about data flows, bloated DevTools, and team confusion about ownership. I diagnose it by asking: does any component outside this feature's component tree actually need this state? If the answer is no, it belongs lower. The principle is state co-location: state should live as close as possible to where it's used. Global state is appropriate only for cross-cutting concerns that genuinely span the entire app — auth, theme, notifications, real-time WebSocket data. Everything else should stay local.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Over-Global State Problem

```typescript
// ❌ Problem: every piece of UI state in global Redux store
interface GlobalState {
  auth: AuthState;
  products: ProductsState;
  // ↓ These should NOT be global:
  productListSortOrder: 'name:asc' | 'name:desc' | 'price:asc';  // only ProductList needs this
  productListSearchQuery: string;                                  // only ProductList input needs this
  isProductDetailModalOpen: boolean;                              // only ProductList renders the modal
  selectedProductId: string | null;                              // ditto
  productDetailActiveTab: 'overview' | 'specs' | 'reviews';     // only ProductDetail needs this
  isProductDetailLoading: boolean;                               // duplicate of TQ's isFetching
  checkoutStep: number;                                          // only CheckoutFlow uses this
  checkoutFormDraft: Partial<CheckoutForm>;                      // only CheckoutForm uses this
  isAddressFormVisible: boolean;                                 // only CheckoutAddress uses this
  tooltipContent: string;                                        // only Tooltip uses this
  tooltipPosition: { x: number; y: number };                    // only Tooltip uses this
}

// Every dispatch to any of these keys re-evaluates all subscribers.
// A tooltip repositioning re-renders the auth-dependent nav component.
// This is the over-global anti-pattern.
```

### The State Decision Tree

```typescript
// Ask these questions in order to find the right home for state:

// Q1: Does only ONE component use this state?
//   → useState inside that component

// Q2: Do only components in a TIGHT SUBTREE use this state?
//   → useState in their nearest common parent, pass as props
//   → Or Context if prop drilling depth > 3

// Q3: Is this state needed by DISTANT, UNRELATED components?
//   → Global store (Redux, Zustand)

// Q4: Is this state actually SERVER data (remote, async, cached)?
//   → TanStack Query (not global store)

// Q5: Does this state need to SURVIVE navigation (page transitions)?
//   → Global store or URL state

// Q6: Should this state be SHAREABLE (URL-copyable)?
//   → URL search params
```

### Recognizing Over-Global State (Code Smells)

```typescript
// Smell 1: Global state used by a single component
// (detectible by grepping the store key name — only one subscriber)
const checkoutStep = useSelector(state => state.checkout.step);  // used in CheckoutWizard only

// Smell 2: Global state that immediately becomes stale when component unmounts
// If cleaning up on unmount, it probably shouldn't be global
useEffect(() => {
  return () => { dispatch(clearProductModal()); }; // ← leak signal: global state for local concern
}, []);

// Smell 3: store.ts with 30+ reducers
// Every feature owns some global state it could have kept local

// Smell 4: DevTools filled with local UI events
// "PRODUCT_DETAIL_TAB_CHANGED" "TOOLTIP_POSITION_UPDATED" flooding DevTools
// These should be local state transitions, not dispatched actions
```

### Refactoring Global → Local — Pattern Playbook

```typescript
// ① Modal open state: often global, should be local
// ❌ Before
// store/products.ts: isDetailModalOpen: false
// ProductList: dispatch(openModal(id)); dispatch(closeModal())

// ✅ After — modal state co-located with trigger
function ProductList() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      {products.map(p => (
        <ProductCard key={p.id} onClick={() => setSelectedId(p.id)} />
      ))}
      {selectedId && (
        <ProductDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
// ProductDetailModal fetches its own data via useQuery(selectedId) — no global loading state

// ② Wizard step: global, should be local to Wizard component
// ❌ Before: checkoutStep in Redux, every step dispatches SET_CHECKOUT_STEP

// ✅ After: useReducer inside CheckoutWizard
type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'review' | 'confirmation';
interface WizardState { step: CheckoutStep; formData: Partial<CheckoutForm>; }

function CheckoutWizard() {
  const [state, dispatch] = useReducer(checkoutReducer, { step: 'cart', formData: {} });

  // If you need back-button integration: put the step in URL (query param)
  // If you need global access: only elevate when actually needed

  return <CheckoutStepRenderer state={state} dispatch={dispatch} />;
}

// ③ Filter/sort state: global, should be URL state or local
// ❌ Before: searchQuery + sortOrder in Redux
// Every keypress dispatches to a global store, causing app-wide re-render evaluation

// ✅ After: useSearchParams (if shareable) or useState (if not)
function ProductDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const sort = searchParams.get('sort') ?? 'name';

  // URL state: zero global store involvement
}
```

### Server State vs Global State Anti-Pattern

```typescript
// ❌ Duplicating TanStack Query cache in Redux
// The most common over-global state in codebases that adopted TQ incrementally

// Old Redux pattern (pre-TanStack Query):
const productsSlice = createSlice({
  initialState: { loading: false, error: null, data: [] as Product[] },
  reducers: { setLoading, setError, setProducts },
});

// useEffect to populate it:
useEffect(() => {
  dispatch(setLoading(true));
  api.products.list().then(data => dispatch(setProducts(data)));
}, []);

// ❌ With TanStack Query added later — but old Redux still running:
const { data: queryData } = useQuery({ queryKey: ['products'], queryFn: api.products.list });
useEffect(() => {
  if (queryData) dispatch(setProducts(queryData));  // copying TQ cache → Redux
}, [queryData]);

// TWO caches: TQ's fresh, invalidatable cache + Redux's stale copy
// On mutation: invalidates TQ, but Redux copy stays stale until next effect

// ✅ Fix: remove the Redux slice entirely; use TQ directly
function ProductList() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
  });
  // products is here directly — no global store pollution
}
```

### What Legitimately Belongs in Global Store

```typescript
// Criteria for true global state — must pass the "app-wide" test
//
// ✅ Auth state: user identity needed by navbar, sidebar, routes, every API call
// ✅ Theme: affects every component
// ✅ Notification/toast queue: any code path can push a notification
// ✅ Shopping cart: persists across navigation, accessed from multiple pages
// ✅ Real-time subscription state: WebSocket data updating multiple unrelated components
// ✅ Feature flags: read by many components across the app

// Zustand store — only the above:
interface AppStore {
  auth: {
    user: User | null;
    token: string | null;
    logout: () => void;
  };
  theme: {
    mode: 'light' | 'dark';
    toggle: () => void;
  };
  notifications: {
    items: Notification[];
    add: (n: Notification) => void;
    dismiss: (id: string) => void;
  };
  // ← Stop here. Nothing feature-specific.
}
```

### Context Without Global Store Over-usage

```typescript
// Feature-scoped Context as middle ground:
// State needed within a feature tree, not globally

// ProductFeatureContext — scoped to /products/* routes only
const ProductFeatureContext = createContext<{
  compareList: string[];
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
} | null>(null);

function ProductFeatureProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<string[]>([]);

  const value = useMemo(() => ({
    compareList,
    addToCompare: (id: string) => setCompareList(prev =>
      prev.length < 4 ? [...prev, id] : prev  // max 4 items to compare
    ),
    removeFromCompare: (id: string) => setCompareList(prev => prev.filter(i => i !== id)),
  }), [compareList]);

  return (
    <ProductFeatureContext.Provider value={value}>
      {children}
    </ProductFeatureContext.Provider>
  );
}

// Only wraps the products route — not the entire app
// <Route path="/products/*" element={<ProductFeatureProvider><Outlet /></ProductFeatureProvider>} />
```

### ⚠️ Anti-Patterns

- **Single global store for all state** — one Zustand/Redux store with 40 slices = every subscriber evaluated on every dispatch; split by domain + co-locate non-shared state
- **Storing loading/error state globally for TanStack Query data** — TQ provides `isLoading`/`isError` per-query; putting them in Redux duplicates the source of truth
- **Global store as module communication mechanism** — component A dispatches to trigger behavior in component B that listens; use callback props, context, or event emitters for direct component communication
- **Premature elevation** — "we might need this elsewhere someday" is the most common justification for over-global state; YAGNI (You Aren't Gonna Need It): elevate when the need is real

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the Redux store initially had 34 slices — including product list sort order, active dashboard tab, collapsed sidebar panels, tooltip positions, and loading flags that duplicated TanStack Query's `isFetching`. Redux DevTools showed 200+ action types. Performance profiling revealed that changing a filter on the product page was dispatching 3 actions and causing re-renders in the navigation, sidebar, and footer — components with zero relationship to product filters. Audit removed 21 slices: local UI state moved to `useState`, server state replaced by TanStack Query, URL state moved to search params. Redux retained 13 slices: auth, settings, notifications, real-time device telemetry. Re-render frequency dropped 65%.

**FAANG scale:**
- **Microsoft:** Office 365 — each feature area owns its local Context; only identity, tenant settings, and notification system are truly global; the "recent documents" state is scoped to the sidebar's Context, invisible to the video chat component
- **Adobe:** Creative Cloud — each tool (Photoshop for Web, Illustrator for Web) has its own state boundary; only subscription/auth state crosses tool boundaries via a shared global store
- **Salesforce:** Sales Cloud — view configuration (column widths, sort preferences) stored per-view in URL/localStorage; only pipeline ownership and permission state is global; never in a single mega-store
- **Cisco:** DNA Center — network topology rendering state (zoom, pan, selected node) lives in the Topology component's local state, not the global network inventory store; the two only share the selected device ID as a URL param

---

## 💬 4. Interview Execution

### Sample Answer

> "Over-global state is one of the most common architecture mistakes I've seen in production React apps. The symptom is a Redux store with 30+ slices where half the slices are feature-local UI state — modal open/closed, wizard step, filter query. The cost is unnecessary subscriber evaluation on every dispatch, bloated DevTools with 200+ action types, and ownership confusion during code review.
>
> My rule is state co-location: state lives as close as possible to where it's used. The checklist is: single component → `useState`. Small subtree → props or feature-scoped Context. Survives navigation or needed across unrelated trees → global store. Server data → TanStack Query.
>
> The most impactful refactor I've done was at SAP — removed 21 of 34 Redux slices by routing local UI state to `useState`, server state to TanStack Query, and shareable filter state to URL params. Re-render frequency on the product page dropped 65% because changing a filter no longer evaluated subscribers in the navigation or footer.
>
> The legitimate global store at that point contained auth, theme, notifications, and real-time WebSocket data — 13 slices that genuinely cross-tree concerns. Everything else was noise."

### Likely Follow-up Questions
1. "How do you identify over-global state in an existing codebase?" → Search for global state used by only one `useSelector` subscriber; grep for cleanup dispatches in `useEffect` return functions; look for loading flags that mirror TanStack Query's `isFetching`
2. "What's the risk of refactoring global → local?" → If other parts of the app DO consume the state you thought was local, you'll break them; always grep for all usages before removing a global slice
3. "Isn't Context also global state?" → Context is tree-scoped, not app-global; a Context Provider inside a `/products` route subtree affects only that subtree — it's not global. Distinguish: React Context = tree-scoped; global store = app-global
4. "When do you keep modal state global?" → When the modal can be triggered from totally unrelated parts of the app (e.g., an "upgrade plan" CTA in the nav triggers a modal that's rendered at app root) — then the trigger and the modal render site are in different subtrees and need shared state
5. "How do you prevent a team from adding over-global state?" → Architectural Decision Record (ADR) defining what qualifies for global state; PR template checklist asking "is this state genuinely cross-tree?"; Zustand's module-per-concern pattern (separate files = clear ownership) discourages lumping

---

## 💻 5. Code Example

```typescript
// Before/After: ProductDirectory refactor — eliminate 4 global slices

// ---- BEFORE ---- 
// Redux: 4 slices for product directory
// products.slice.ts (legitimate)
// productFilters.slice.ts (over-global → move to URL)
// productUI.slice.ts: { selectedId, isModalOpen, activeTab } (over-global → move to local)
// productLoading.slice.ts: { loading, error } (over-global → delete, use TanStack Query)

// ---- AFTER ----

// 1. Filter state → URL
function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  return {
    filters: {
      q: searchParams.get('q') ?? '',
      category: searchParams.get('category') ?? 'all',
      sort: searchParams.get('sort') ?? 'name:asc',
    },
    setFilters: (updates: Record<string, string>) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([k, v]) => v ? next.set(k, v) : next.delete(k));
        return next;
      }, { replace: true });
    },
  };
}

// 2. UI state → local component state
function ProductDirectory() {
  const { filters, setFilters } = useProductFilters();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 3. Server state → TanStack Query (no loading/error in global store)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.products.list(filters),
    placeholderData: keepPreviousData,
  });

  if (isError) return <ErrorBanner />;

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />

      {isLoading ? (
        <ProductGridSkeleton />
      ) : (
        <ProductGrid
          products={data?.items ?? []}
          onSelect={setSelectedId}
          selectedId={selectedId}
        />
      )}

      {selectedId && (
        <ProductDetailModal
          productId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

// ProductDetailModal — completely self-contained, fetches own data
function ProductDetailModal({ productId, onClose }: { productId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'reviews'>('overview');
  const { data: product, isLoading } = useQuery({
    queryKey: ['products', productId],
    queryFn: () => api.products.getById(productId),
  });

  return (
    <Modal onClose={onClose}>
      <TabBar tabs={['overview', 'specs', 'reviews']} active={activeTab} onChange={setActiveTab} />
      {isLoading ? <ModalSkeleton /> : <ProductDetail product={product!} tab={activeTab} />}
    </Modal>
  );
}

// What remains in global Zustand store — only cross-cutting concerns
interface AppStore {
  auth: { user: User | null; token: string | null };
  cart: { items: CartItem[]; addItem: (p: Product) => void; removeItem: (id: string) => void };
  notifications: { items: Notification[]; add: (n: Notification) => void };
}
// That's it. 3 concerns. Nothing feature-specific.
```

---

## 🧠 6. Memory Aid

**LUST — State placement pyramid (bottom = default, top = last resort):**
- **L**ocal (`useState`) — default; start here
- **U**p-lifted (`props` + parent state) — when siblings need to share
- **S**coped Context (feature Provider) — when subtree needs without prop drilling
- **T**op-level global store — only when truly cross-cutting

**Signs you've gone too far up (DUMP):**
- **D**upplication — same state in store AND TanStack Query cache
- **U**nnecessary (only one subscriber)
- **M**ounting cleanup (`useEffect(() => () => dispatch(clear()))`) for global state
- **P**roliferation — 30+ slices

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Over-global state is a performance anti-pattern as much as an architecture problem — a Zustand selector on a changed store slice triggers `Object.is` comparison in every component that subscribes to the store, even if they select unrelated fields (without proper selector memoization); at scale, a tooltip mouse-move event re-evaluating all subscribers is measurably slower than the same event updating a local `useState`
→ The "only one subscriber" test is the fastest diagnostic tool — if you grep for a Redux selector and find exactly one `useSelector` call anywhere in the codebase, that slice candidate for co-location; if you find zero, the state has already been orphaned (a common source of memory leaks in long-lived SPAs)
→ Demonstrating you can do the reverse — remove state from a global store — impresses more than showing you can add to one; senior interviews ask "walk me through a time you simplified state management" because removing complexity is harder and rarer than adding it

**How it works (2 sentences):**
Global stores like Zustand use `useSyncExternalStore` under the hood — every component that calls a store hook subscribes to the store's external change signal, and when any part of the store updates, React compares the previous and new selected values using `Object.is`; even though the comparison is cheap per-component, with 50 global subscribers and a high-frequency update (tooltip position, input keystrokes), React is evaluating 50 comparisons per frame, which is avoided entirely when the state lives locally in the component that owns it.
Co-location makes tests and maintenance simpler because the state's lifecycle is bound to the component's lifecycle — when `ProductDirectory` unmounts, all its `useState` hooks are garbage collected automatically, whereas global state requires explicit cleanup actions (`dispatch(clearProductState())`) that are frequently forgot, causing stale global state that surfaces as "data from the previous user" bugs in apps with user switching.

---
✅ Topic 147/486 complete → Continuing to Topic 148: Performance Impact of State Changes
