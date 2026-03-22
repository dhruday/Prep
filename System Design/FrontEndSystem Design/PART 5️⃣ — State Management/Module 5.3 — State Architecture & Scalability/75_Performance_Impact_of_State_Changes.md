# 75. Performance Impact of State Changes

## 1. High-Level Explanation (Frontend Interview Level)

Every state change in a frontend application triggers a potential render cycle — a cascade from the state container all the way to the DOM. Understanding the performance impact of state changes means understanding: (1) what triggers a re-render, (2) which components get included in that render cycle, (3) what work happens during rendering, and (4) what hits the DOM as a result. The common trap: developers assume "React (or Angular) is fast" and put no thought into the render cascade, then wonder why a typing in a search box causes 200ms UI lag. The core topics: React reconciliation overhead, selector granularity in Redux, Context consumer over-subscription, Angular OnPush + NgRx, and structural optimisations like memoisation and virtualisation.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### React Re-Render Mechanics

A React component re-renders when:
1. Its parent re-renders (unless wrapped in `React.memo`)
2. Its own `useState` / `useReducer` state changes
3. A `useContext` it consumes changes its value
4. A `useSelector` (RTK/Zustand) it uses returns a new (non-referentially-equal) value

```
Parent state changes
    │
    ▼
Parent renders
    │
    ├── Child1 renders (no memo)
    │       └── Grandchild1 renders
    │       └── Grandchild2 renders  ← Renders even if Child1 returns same JSX look
    │
    ├── Child2 renders (no memo)     ← Renders even if its props didn't change
    │
    └── Child3 = memo(Child3)        ← SKIPS render if props reference-equal
```

### The Cost of Re-Rendering

```typescript
// Render phase (CPU): re-running the function, computing JSX tree
// Commit phase (DOM): diffing JSX trees, writing to actual DOM

// Re-render cost breakdown:
// 1. Function execution time: trivial for simple components, high for heavy computations
// 2. React reconciliation: traversing old + new vDOM trees, finding differences
// 3. DOM mutations: only changed nodes are updated (fast usually)
// 4. Layout/paint: browsers can batch DOM writes, but forced layouts are expensive

// The REAL cost is usually step 1 + 2 (CPU in JS thread)
// Not step 3+4 (DOM is often not the bottleneck people assume)
```

### React.memo — Preventing Cascading Re-Renders

```typescript
// Without memo: every parent render re-renders UserCard
function UserCard({ userId }: { userId: string }) {
  const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: ... });
  return <Card>{user?.name}</Card>;
}

// With memo: re-renders only when userId prop changes
const UserCard = React.memo(function UserCard({ userId }: { userId: string }) {
  const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: ... });
  return <Card>{user?.name}</Card>;
});

// Critical caveat: memo uses shallow comparison
// Objects/functions passed as props must be stable references:

// ❌ Creates new object on every parent render — breaks memo
<UserCard userId={userId} style={{ color: 'red' }} />

// ✅ Stable reference — memo works
const cardStyle = { color: 'red' };   // outside component
<UserCard userId={userId} style={cardStyle} />
// OR
const cardStyle = useMemo(() => ({ color: 'red' }), []);
```

### useMemo and useCallback — Stable References

```typescript
// useMemo: memoize expensive computations AND stable object references
const sortedProducts = useMemo(
  () => [...products].sort((a, b) => a.price - b.price),
  [products]             // recompute only when products array reference changes
);

// useCallback: memoize function references for stable callback props
const handleAddToCart = useCallback(
  (product: Product) => { dispatch(addItem(product)); },
  [dispatch]             // dispatch is stable (from Redux), so this is always the same function
);

// When useMemo/useCallback are NOT worth it:
// - Cheap computations (less overhead than hook tracking itself)
// - Component is not wrapped in memo (no one checks the reference)
// - Dependencies change on every render anyway (nullifying the memo)

// Profile with React DevTools before adding memoisation — premature optimisation harms readability
```

### Redux Selector Granularity

```typescript
// ❌ Over-broad selector — component re-renders on ANY store change
const everything = useSelector((state) => state);
const { products, cart, user } = everything;

// ❌ Object selector — creates new reference on every call (always re-renders)
const data = useSelector((state) => ({
  products: state.products.items,
  loading: state.products.loading,
}));
// ↑ { products, loading } is a new object every render → useSelector re-renders every time

// ✅ Granular selectors — only re-render when specific slice changes
const products = useSelector((state) => state.products.items);  // array ref stability
const loading = useSelector((state) => state.products.loading); // primitive stability

// ✅ Memoised selector with createSelector — for derived data
const selectSortedProducts = createSelector(
  (state: RootState) => state.products.items,
  (state: RootState) => state.products.sortBy,
  (items, sortBy) => [...items].sort(/* sort by sortBy */)
  // Recomputes only when items or sortBy changes
);
```

### Angular Change Detection — Zone.js vs OnPush

```typescript
// Default change detection: Angular runs CD for the WHOLE tree on every async event
// (setTimeout, setInterval, HTTP responses, DOM events, Promises)
// → O(n) components checked even if nothing changed in most of them

// OnPush: component tree subset checked only when:
// 1. An @Input reference changes (not just its properties)
// 2. An Observable/async pipe the component subscribes to emits
// 3. An event handler inside the component fires
// 4. CD is manually triggered via ChangeDetectorRef.markForCheck()

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ products$ | async }}`,
})
export class ProductListComponent {
  // products$ is an Observable from NgRx store.select() — emits only when products change
  products$ = this.store.select(selectAllProducts);
  constructor(private store: Store) {}
}
// Result: ProductListComponent only re-renders when the selectAllProducts selector emits
// All sibling components are completely unaffected by unrelated store changes
```

### Context Performance — The Consumer Broadcast Problem

```typescript
// ❌ Every SearchBarContext consumer re-renders on every keystroke
const SearchBarContext = createContext({ query: '', setQuery: () => {} });

// ✅ Fix 1: Use Zustand instead of Context for high-frequency state
// ✅ Fix 2: Split context — separate value context from action context
const SearchQueryContext = createContext<string>('');
const SearchActionsContext = createContext<{ setQuery: (q: string) => void }>({
  setQuery: () => {},
});

// Actions context value is stable (functions don't change reference)
// Components that only dispatch (SearchBar) consume SearchActionsContext → never re-render
// Components that display (SearchResults) consume SearchQueryContext → re-render on query
```

### Batched State Updates

React 18 introduced **automatic batching** — multiple state updates within any async context (Promises, setTimeout, fetch callbacks) are batched into a single re-render:

```typescript
// React 17: each setState triggers a separate render (3 renders total from Promise)
// React 18: all three are batched → 1 render
async function handleLoadData() {
  const data = await fetchData();
  setProducts(data.products);     // ─┐
  setLoading(false);               //  │ React 18: batched into one render
  setError(null);                  // ─┘
}

// If you need to opt out of batching (rare):
import { flushSync } from 'react-dom';
flushSync(() => setProducts(data.products));   // immediate render
flushSync(() => setLoading(false));            // second immediate render
```

---

## 3. Real-World Examples

**Google Sheets (Web):** Every cell value change is a state mutation. The rendering architecture uses highly selective subscriptions — a cell component subscribes only to its own `(row, col)` value in the state. Changing A1 does not re-render B1 through Z100. This is the extreme end of selector granularity.

**Slack Web:** Message list performance: each message is individually memoised. The scroll container uses virtualisation (only 50 messages rendered at any time). State changes to channel unread counts do not re-render the message list at all. Separate Zustand-like slices for sidebar state vs message thread state prevent cross-contamination.

**At Hruday's Bosch context:** WebSocket telemetry data arriving at 10Hz for 100+ device sensors. Each sensor card must re-render its own values without triggering re-renders in others. The solution: per-sensor atom (Jotai) or per-sensor selector in Redux — granular subscription so only the affected sensor card re-renders when its value updates. Moving from "one big sensors object in state" to per-key atoms reduced render work by 95% during live data ingest.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "State changes cascade through the component tree via re-renders. The performance impact depends on three things: the breadth of the re-render (how many components are included), the depth (how expensive each one's render function is), and whether the re-render actually produces DOM changes. To control breadth: memo components that don't need re-renders, use granular selectors in Redux so only components consuming changed slices re-render, split Contexts by update frequency. To control depth: `useMemo` for expensive computations, `useCallback` for stable callback references. Angular's OnPush change detection combined with `async pipe` on NgRx selectors achieves the same granularity — components only re-check when their specific observable emits. React 18's automatic batching reduces render frequency by grouping multiple state updates from async handlers into one render."

**Likely Follow-up Questions:**
1. When does React skip the commit phase even after rendering? → When reconciliation finds that the new vDOM tree is identical to the previous — all generated DOM operations are no-ops, so the commit phase is trivially fast. `React.memo` prevents the render phase; `PureComponent`/`shouldComponentUpdate` (class) do the same. But the render phase itself has already been executed even if the commit is skipped.
2. How do you profile which component causes slow renders? → React DevTools Profiler tab: record an interaction, view the flame graph, identify components with high render durations or high render counts. Look for components rendering "why" = context change when they don't need it.
3. What is useTransition and how does it help? → `useTransition` marks state updates as non-urgent, allowing React to interrupt the render if a more urgent update arrives. Useful for filter/sort operations: mark the filtering state update as a transition, so typing in the search box stays responsive while the filter computation runs in background.

---

## 5. Code Example

```typescript
// High-frequency state: real-time stock ticker with granular subscriptions

// Atom per ticker (Jotai) — surgical re-renders
const priceAtomFamily = atomFamily((ticker: string) => atom(0));

// Each StockCard only subscribes to its own ticker — completely isolated
function StockCard({ ticker }: { ticker: string }) {
  const price = useAtomValue(priceAtomFamily(ticker));
  return <div className="stock-card">{ticker}: ${price.toFixed(2)}</div>;
}

// WebSocket handler: updates ONLY the affected atom
ws.onmessage = (event) => {
  const { ticker, price } = JSON.parse(event.data);
  jotaiStore.set(priceAtomFamily(ticker), price);
  // Only StockCard for this ticker re-renders
};

// 100 tickers updating at 10Hz → only 1 re-render per message, not 100
```

---

## 6. Memory Aid

**Three levers for state change performance:**
1. **Breadth** — how many components re-render: memo + granular selectors + Context splitting
2. **Depth** — render function cost: useMemo + useCallback + virtualisation
3. **Frequency** — how often state changes: useTransition + debounce + batching

---

## 7. Why & How Summary

**Why it matters:** Poor state management causes the most common category of frontend performance issues: janky UIs during typing, lagging interactions on data-heavy screens, and 100ms+ rerenders on state changes that should be imperceptible. These issues directly fail Web Vitals (INP — Interaction to Next Paint) and are caught in Lighthouse CI audits.

**How it works:** React's concurrency model (Fiber) schedules work in increments. Each state change enqueues a render work unit for the affected component and its descendants. `React.memo` inserts a bailout check before executing the descendant render. Redux `useSelector` subscribes to the store and runs the selector on every store change, comparing result to previous — if equal (same reference), no re-render is triggered. Angular's zone.js triggers CD on every async operation by default; OnPush short-circuits CD for subtrees whose inputs haven't changed.

**Company relevance:**
- Microsoft: Teams' message rendering: each message is individually memoised, preventing the whole list from re-rendering on a typing indicator update
- Adobe: Photoshop web's layer panel uses virtualised rendering + fine-grained state subscriptions — only the modified layer re-renders, not the entire stack
- Salesforce: Lightning Experience pages use LWC's reactive property tracking (equivalent to fine-grained reactivity) — property-level change detection, not component-level
- Cisco: Webex network dashboard renders 500+ device status tiles with per-device WebSocket subscriptions — per-entity Zustand slices ensure only changed device tiles re-render
