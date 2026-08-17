# 66. Derived State vs Computed State ★

## 1. High-Level Explanation (Frontend Interview Level)

**Derived state** (also called **computed state**) is data that can be **calculated from existing state** rather than being stored independently. If data A can be deterministically calculated from data B, then A is derived from B — and storing both A and B as separate state is a mistake that creates a synchronisation problem. The single most common state management bug in React and Angular applications is **storing derived values as separate state**: a flag `hasItems` stored alongside `items[]` that gets out of sync when items update; a `totalPrice` stored separately from `cart.items` that doesn't update when an item is removed. Derived state should be calculated inline, with a useMemo hook (React), a computed signal (Angular/Vue signals), or a memoised selector (Redux `createSelector`) — never stored as duplicate state.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### The Core Rule: Single Source of Truth

```typescript
// ❌ WRONG: derived values stored as separate state — creates sync bugs

function CartComponent() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [count, setCount] = useState(0);           // derived from items
  const [total, setTotal] = useState(0);           // derived from items
  const [isEmpty, setIsEmpty] = useState(true);    // derived from items

  const addItem = (item: CartItem) => {
    const newItems = [...items, item];
    setItems(newItems);
    setCount(newItems.length);                    // ← manually syncing derived state!
    setTotal(newItems.reduce((sum, i) => sum + i.price, 0));  // ← bug-prone duplication
    setIsEmpty(newItems.length === 0);
  };
  // What if removeItem forgets to update `count`? State becomes inconsistent.
}

// ✅ CORRECT: store only the primitive source; derive everything else
function CartComponent() {
  const [items, setItems] = useState<CartItem[]>([]);
  
  // Derived values — calculated on each render (cheap computation: no memo needed)
  const count = items.length;
  const isEmpty = items.length === 0;
  
  // Expensive derivation — memoised to avoid recomputation on unrelated re-renders
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  
  const addItem = (item: CartItem) => {
    setItems((prev) => [...prev, item]);  // single state update; all derived values auto-update
  };
}
```

### When to Use useMemo for Derived State

**Not all derived state needs `useMemo`** — over-using useMemo is a common mistake. The memoisation overhead (storing the previous inputs + result, comparing on each render) can exceed the computation cost for simple derivations.

```typescript
// ❌ useMemo overkill — memoising computations cheaper than the memo overhead
const count = useMemo(() => items.length, [items]);           // trivial: just items.length
const isEmpty = useMemo(() => items.length === 0, [items]);   // trivial: single comparison
const firstItem = useMemo(() => items[0], [items]);           // trivial: single array access

// ✅ Use direct calculation for trivial derivations
const count = items.length;
const isEmpty = items.length === 0;
const firstItem = items[0];

// ✅ Use useMemo for genuinely expensive derivations
const sortedAndFilteredItems = useMemo(
  () => items
    .filter((item) => item.inStock && item.price >= filters.minPrice)
    .sort((a, b) => sortFn(a, b, sortConfig)),
  [items, filters.minPrice, sortConfig]
);

const expensiveAggregation = useMemo(
  () => computeAnalyticsSummary(largeDataset),  // O(n²) computation
  [largeDataset]
);
```

### Derived State Anti-Patterns

**Anti-pattern 1: Syncing derived state in useEffect**

```typescript
// ❌ Classic anti-pattern: syncing derived state in useEffect
function OrderSummary({ items }: { items: OrderItem[] }) {
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const sub = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    setSubtotal(sub);
    setTax(sub * 0.1);
    setTotal(sub * 1.1);
  }, [items]);  // ← Anti-pattern: useEffect to sync derived state causes extra render cycle
  
  // Problem: renders once with stale values, useEffect fires, renders again with correct values
  // → Flickering / stale UI in the first render
}

// ✅ Calculate during render — single render, always correct
function OrderSummary({ items }: { items: OrderItem[] }) {
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );
  const tax = subtotal * 0.1;
  const total = subtotal * 1.1;
  // Always consistent — calculated in the same render cycle
}
```

**Anti-pattern 2: getDerivedStateFromProps trap** (class components + legacy code)

```typescript
// ❌ getDerivedStateFromProps for fully derivable data — creates sync bugs
class FilteredList extends Component {
  state = { filteredItems: [] };
  
  static getDerivedStateFromProps(props, state) {
    return { filteredItems: props.items.filter((i) => i.active) };
    // Storing derived state in component state — unnecessary and bug-prone
  }
}

// ✅ Functional component — just derive inline
function FilteredList({ items }) {
  const filteredItems = useMemo(
    () => items.filter((i) => i.active),
    [items]
  );
  return <List items={filteredItems} />;
}
```

### Derived State in Redux — createSelector

```typescript
// Redux store has raw state (items[])
// Selectors derive computed values; createSelector memoises them

import { createSelector } from '@reduxjs/toolkit';

const selectCartItems = (state: RootState) => state.cart.items;
const selectDiscount = (state: RootState) => state.cart.discountPercent;

// Memoised selector — only recomputes when cartItems or discountPercent changes
const selectCartTotal = createSelector(
  [selectCartItems, selectDiscount],
  (items, discountPercent) => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = subtotal * (discountPercent / 100);
    return subtotal - discount;
  }
);

// In component
const total = useSelector(selectCartTotal);  // re-renders only when total changes
```

### Angular: Computed Signals (Angular v17+)

```typescript
// Angular Signals — reactive equivalent of derived/computed state
import { signal, computed } from '@angular/core';

class CartStore {
  items = signal<CartItem[]>([]);
  discountCode = signal<string | null>(null);

  // computed() = derived state that auto-updates when inputs change
  count = computed(() => this.items().length);
  
  subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  
  discount = computed(() =>
    this.discountCode() ? this.subtotal() * 0.1 : 0
  );
  
  total = computed(() => this.subtotal() - this.discount());
  // total auto-updates when items change, without any manual subscription or sync
}
```

---

## 3. Real-World Examples

**React Query / TanStack Query:** The library enforces this principle architecturally — server data (the source) lives in the query cache; components derive their view from `data`, `isLoading`, `error` — all derived from the query result. You never store `data` in separate `useState` and try to sync it.

**At Hruday's level (SAP Analytics):** In SAP Analytics Cloud's dashboard editor, calculations like "total cells selected," "can apply formatting" (derived from selection state), and "chart preview data" (derived from dataset + chart config) should be computed values, not stored state. Storing them as state in early implementations caused numerous bugs where the formatting toolbar remained enabled after de-selecting cells — a classic derived-state sync failure. Migrating to computed values eliminated the entire class of "stale derived state" bugs.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "Derived state is any value that can be computed deterministically from existing state — it should never be stored separately because that creates a synchronisation requirement that always eventually breaks. The rule is: store the minimum state needed, and compute everything else. For cheap computations like array length or boolean flags, I calculate inline during render. For expensive computations — filtering 10K items, sorting with complex comparators, aggregating financial data — I use `useMemo` with a stable dependency array. The most dangerous anti-pattern is syncing derived state via `useEffect`: effect-driven syncing always introduces one extra render cycle and is prone to missed dependencies. In Redux, derived state belongs in memoised selectors built with `createSelector`. In Angular, the signals `computed()` function is the idiomatic solution — it's lazy, memoised, and auto-tracks its reactive dependencies."

**Likely Follow-up Questions:**
1. What is the cost of not memoising derived state? → For cheap computations: trivially small — inline calculation is fine. For expensive computations on large datasets: recalculation on every render that isn't caused by the relevant data change → wasted CPU, potentially visible jank
2. When would you put derived state in Redux? → When the derivation is consumed by many different components and the source state is already in Redux — use createSelector to memoise centrally rather than each component deriving independently (potentially inconsistently)
3. How is this different in Angular vs React? → Angular Signals' `computed()` is more ergonomic — it auto-tracks reactive dependencies without a manual array. React's `useMemo` requires explicit dependency declaration. Both memoize; both invalidate when inputs change; Angular's approach is more reactive.

---

## 5. Code Example

```typescript
// Production example: Data table with filtered, sorted, paginated rows
// All of these are derived from the raw data + current filter/sort/page state

interface TableState {
  data: Product[];
  searchQuery: string;
  sortField: keyof Product | null;
  sortDirection: 'asc' | 'desc';
  pageSize: number;
  currentPage: number;
}

function useTableDerivedState(state: TableState) {
  // Layer 1: filter (depends on data + searchQuery)
  const filteredData = useMemo(
    () => state.searchQuery
      ? state.data.filter((item) =>
          item.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          item.sku.includes(state.searchQuery)
        )
      : state.data,
    [state.data, state.searchQuery]
  );

  // Layer 2: sort (depends on filteredData + sort config)
  const sortedData = useMemo(() => {
    if (!state.sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[state.sortField!];
      const bVal = b[state.sortField!];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return state.sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, state.sortField, state.sortDirection]);

  // Layer 3: pagination (depends on sortedData + page config)
  const paginatedData = useMemo(
    () => sortedData.slice(
      state.currentPage * state.pageSize,
      (state.currentPage + 1) * state.pageSize
    ),
    [sortedData, state.currentPage, state.pageSize]
  );

  // Cheap derivations — no useMemo needed
  const totalCount = filteredData.length;
  const pageCount = Math.ceil(filteredData.length / state.pageSize);
  const hasResults = filteredData.length > 0;

  return { filteredData, sortedData, paginatedData, totalCount, pageCount, hasResults };
}
```

---

## 6. Memory Aid

**Mental Model:** Raw state is the **original data**. Derived state is a **shadow** — it always matches what casts it. If you manually maintain a copy of a shadow (derived state in useState), you'll inevitably find moments when the shadow is stale because you forgot to update it when the caster changed.

**Decision:** Can I calculate this from existing state? Yes → don't store it, derive it. Is the calculation expensive (>1000 items, O(n log n) or worse)? Yes → `useMemo`. No → calculate inline.

**Anti-pattern to remember:** `useEffect` + `setState` to sync derived state → always has one stale render, always more code than needed, always a bug waiting to happen.

---

## 7. Why & How Summary

**Why it matters:**
→ Correctness: Storing derived state as separate state creates synchronisation bugs — derived values becoming out of sync with their source is one of the most common bug categories in stateful frontends
→ Performance: `useMemo` and `createSelector` use memoisation — recomputation only when inputs change → expensive derivations don't run on unrelated renders
→ Simplicity: Less state = fewer `useEffect` dependencies = less unexpected coupling = easier reasoning

**How it works:** Derived values are computed during render using `useMemo(fn, deps)` — React stores the previous dep values and result; on re-render, if deps are shallowly equal to previous, the previous result is returned without recomputing. If deps changed, the function runs and the new result is stored. This makes expensive computed values performant while ensuring correctness.

**Company relevance:**
- Microsoft: Excel-on-web cell computation model is entirely derived state — cell values derived from formula ASTs and referenced cell values; understanding derived vs stored state is fundamental
- Adobe: Photoshop on Web's smart object — thumbnail, dimensions, blend result are all derived from source pixel data; derived state architecture directly applies
- Salesforce: Formula fields in Salesforce CRM are derived from record fields — understanding this pattern as a developer building custom components on platform is important
- Cisco: network analytics aggregations (total bandwidth from link data, active users from session data) are derived computations — React + selectors pattern applies directly
