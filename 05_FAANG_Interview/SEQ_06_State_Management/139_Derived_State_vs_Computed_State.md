# 139. Derived State vs Computed State
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Derived state is a value computed from other state or props — it isn't stored independently because it can always be recalculated from its sources. Storing it creates two sources of truth that must stay synchronized, which is the root cause of bugs like "filter results out of sync after data update." The fundamental rule: if a value can be computed from existing state or props, don't store it — derive it during render. In React, `useMemo` optimizes expensive derivations by memoizing the result. In Redux Toolkit, `createSelector` does the same thing for store derivations. The distinction from "computed state" is mostly semantic — in React we say "derived state," in Vue/Angular signals/Mobx/Zustand we say "computed." Both mean: value automatically recalculated when its inputs change.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Two-Sources-of-Truth Bug

```typescript
// ❌ CLASSIC BUG: filtering stored as separate state
function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);  // 🚩 derived state

  useEffect(() => {
    fetchProducts().then(data => {
      setProducts(data);
      setFilteredProducts(data);  // must sync manually
    });
  }, []);

  const handleSearch = (query: string) => {
    setSearch(query);
    setFilteredProducts(products.filter(p => p.name.includes(query)));  // must sync manually
  };

  // BUG 1: products refreshes (background polling) but filteredProducts isn't updated
  // BUG 2: sorting applied to filteredProducts is lost when search changes
  // BUG 3: test must set BOTH products AND filteredProducts to put component in correct state
}

// ✅ CORRECT: filteredProducts is derived every render
function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  // Single derivation — always consistent with both sources
  const filteredProducts = useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]  // recomputes any time products OR search changes
  );
  // filteredProducts is NEVER stale — it's recomputed fresh from the two sources of truth

  useEffect(() => { fetchProducts().then(setProducts); }, []);

  return (
    <>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <ProductGrid products={filteredProducts} />
    </>
  );
}
```

### Layers of Derivation

```typescript
// Complex real-world derivation: multiple transformations, layered
function OrderDashboard() {
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'customer'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Layer 1: filter
  const filtered = useMemo(
    () => statusFilter === 'all' ? rawOrders : rawOrders.filter(o => o.status === statusFilter),
    [rawOrders, statusFilter]
  );

  // Layer 2: sort (depends on filtered, not rawOrders)
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'date')     return mult * (new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sortBy === 'total')    return mult * (a.total - b.total);
      if (sortBy === 'customer') return mult * a.customer.localeCompare(b.customer);
      return 0;
    }),
    [filtered, sortBy, sortDir]  // only re-sorts when these 3 change
  );

  // Layer 3: pagination (depends on sorted)
  const paged = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page]
  );

  // Layer 4: summary stats (depends on filtered, not paged)
  const stats = useMemo(
    () => ({
      total: filtered.length,
      totalRevenue: filtered.reduce((sum, o) => sum + o.total, 0),
      avgOrderValue: filtered.length > 0 ? filtered.reduce((sum, o) => sum + o.total, 0) / filtered.length : 0,
    }),
    [filtered]
  );

  // The chain: rawOrders → filtered → sorted → paged
  //             rawOrders → filtered → stats
  //
  // React recomputes each memoized derivation only when its direct inputs change.
  // Change page → only 'paged' recomputes (cheap slice).
  // Change statusFilter → filtered recomputes → sorted recomputes → paged recomputes → stats recomputes.
  // Change sortBy → sorted recomputes → paged recomputes (filtered + stats stay cached).
}
```

### createSelector — Derived State in Redux

```typescript
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Basic selector (no computation, no memoization needed)
const selectAllOrders = (state: RootState) => state.orders.items;
const selectStatusFilter = (state: RootState) => state.orders.statusFilter;
const selectSortConfig = (state: RootState) => state.orders.sort;

// Derived selector — memoized by input selectors
export const selectFilteredOrders = createSelector(
  selectAllOrders,
  selectStatusFilter,
  (orders, filter) => filter === 'all' ? orders : orders.filter(o => o.status === filter)
  // Only recomputes when orders OR statusFilter changes
);

// Derived from derived
export const selectSortedOrders = createSelector(
  selectFilteredOrders,
  selectSortConfig,
  (filtered, { by, dir }) => {
    const mult = dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => mult * String(a[by]).localeCompare(String(b[by])));
  }
);

// Scalar derived selector — stable primitive reference
export const selectOrderCount = createSelector(
  selectFilteredOrders,
  (orders) => orders.length  // returns a number — primitive equality, very cheap
);

export const selectTotalRevenue = createSelector(
  selectFilteredOrders,
  (orders) => orders.reduce((sum, o) => sum + o.total, 0)
);

// CRITICAL: createSelector with array/object output and multiple instances
// When the same selector is used in multiple component instances, use a factory:
export const makeSelectOrderById = (id: string) => createSelector(
  selectAllOrders,
  (orders) => orders.find(o => o.id === id)
  // Each component instance gets its own memoized selector
);

// Usage:
function OrderRow({ id }: { id: string }) {
  // Creates one selector instance per OrderRow — independent caches
  const selectOrder = useMemo(() => makeSelectOrderById(id), [id]);
  const order = useAppSelector(selectOrder);
}
```

### Zustand Derived State

```typescript
import { create } from 'zustand';

// In Zustand, derived state is computed via selectors at the call site
// OR via derived atoms/computed stores

interface OrderStore {
  orders: Order[];
  statusFilter: 'all' | Order['status'];
  // NOT storing derived values — compute them via selectors
}

const useOrderStore = create<OrderStore>(() => ({
  orders: [],
  statusFilter: 'all',
}));

// Inline selector — fires only when orders OR statusFilter changes
// (Zustand uses shallow equality on selector result by default for primitives)
function OrderCount() {
  const count = useOrderStore(state => {
    const { orders, statusFilter } = state;
    const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);
    return filtered.length;
  });
  return <span>{count} orders</span>;
}

// For expensive derivations, memoize the selector itself:
function ExpensiveOrderSummary() {
  const orders = useOrderStore(s => s.orders);
  const filter = useOrderStore(s => s.statusFilter);

  const summary = useMemo(
    () => {
      const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
      return {
        count: filtered.length,
        revenue: filtered.reduce((s, o) => s + o.total, 0),
        avg: filtered.length ? filtered.reduce((s, o) => s + o.total, 0) / filtered.length : 0,
      };
    },
    [orders, filter]
  );

  return <div>Orders: {summary.count} | Revenue: ${summary.revenue.toFixed(2)}</div>;
}
```

### When to Use `useMemo` for Derivations

```typescript
// useMemo is NOT free — it has cost: memory allocation + comparison on every render
// The question: is the derivation expensive enough to justify the overhead?

// ❌ Don't memoize trivially cheap derivations
const fullName = useMemo(() => `${first} ${last}`, [first, last]);  // NOT worth it
const fullName = `${first} ${last}`;  // always just compute it

// ❌ Don't memoize for correctness (only for performance) — unless needed for stable ref
const obj = useMemo(() => ({ id, name }), [id, name]);  // only if passed to React.memo child

// ✅ Memoize when:
// 1. Expensive computation (filtering/sorting large arrays, complex math)
const filtered = useMemo(() => largeList.filter(item => expensiveCheck(item)), [largeList]);

// 2. Stable reference for React.memo child or useEffect dep
const config = useMemo(() => ({ url, method }), [url, method]);  // stable ref for useEffect

// 3. Chain of derivations where upstream memoization prevents cascade
const sorted = useMemo(() => [...filtered].sort(compareFn), [filtered]);  // filtered must be stable

// Rule of thumb: memoize derivations on arrays > 100 items,
// complex transformations > ~1ms, or outputs passed to memoized children.
```

### Architecture & Component Boundaries

```typescript
// Where does derivation logic live?

// Pattern A: Inline in component (simplest, fine for component-local derivations)
function ProductList({ products, search }: Props) {
  const filtered = useMemo(
    () => products.filter(p => p.name.includes(search)),
    [products, search]
  );
}

// Pattern B: Custom hook (reusable, testable derivation logic)
function useFilteredProducts(products: Product[], search: string) {
  return useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );
}

// Pattern C: Selector alongside the store (Redux/createSelector, Zustand selectors file)
// selectors/orders.selectors.ts — centralized, testable, reusable across components

// Pattern D: Computed atoms (Jotai, Zustand with computed slices)
const filteredProductsAtom = atom((get) => {
  const products = get(productsAtom);
  const search = get(searchAtom);
  return products.filter(p => p.name.includes(search));
});
// Jotai handles dependency tracking automatically — reactive like Vue computed()
```

### Trade-offs

| Stored derived state | On-render derivation | Memoized derivation |
|---|---|---|
| Fast to read, but stale risk | Always fresh, may recompute every render | Fresh + only recomputes when deps change |
| Two sources of truth | Single source of truth | Single source of truth |
| Sync bugs guaranteed over time | No sync bugs | No sync bugs |
| Use case: almost never | Use case: cheap derivations | Use case: expensive derivations |

### ⚠️ Anti-Patterns & Pitfalls

- **useEffect to sync derived state** — `useEffect(() => { setFiltered(filter(products)); }, [products])` is the worst pattern: runs after render, causes an extra render, introduces a frame of stale state. Always derive synchronously in render.
- **Missing dependency in `useMemo`** — if `useMemo(() => compute(x), [])` and `x` is a prop/state, the derivation is stale. React's exhaustive-deps ESLint rule catches this.
- **createSelector used without factory for multiple instances** — a single `createSelector` instance has one memoization cache; two components using the same selector with different args will invalidate each other's cache. Use `useMemo(() => makeSelectXxx(id), [id])`.
- **Storing sort/filter state AND the filtered list** — the filtered list is always derivable from the sort/filter state + raw data; storing both duplicates data and creates sync requirements.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the procurement analytics page stored `filteredPOs`, `sortedPOs`, and `pagedPOs` all as separate state, each updated in separate `useEffect`s. When the raw PO list updated (background polling every 30s), only `filteredPOs` was refreshed — `sortedPOs` and `pagedPOs` silently went stale. The fix was converting all three to `useMemo` derivations with a clear dependency chain: `rawPOs → filtered → sorted → paged`. The polling update now automatically propagates through all three levels — zero manual synchronization.

**At FAANG scale:**
- **Microsoft:** Azure Cost Management uses `createSelector` chains to derive billing summaries from raw transaction events — aggregate by resource type, by region, by time period are all layered selectors that share the same raw data slice; only the final selector used by a component triggers re-renders
- **Adobe:** Lightroom Web — the histogram display is a derived computation from the raw pixel data; this runs in a Web Worker (offloaded) and the result is stored in state; input pixel data is the source of truth, histogram is derived
- **Salesforce:** Report builder derives column aggregates (sum, avg, count by group) client-side from a raw dataset; all aggregates are `useMemo`-derived, reset when the underlying data or grouping config changes
- **Cisco:** Network topology derives "paths between two nodes" from the raw edge list using BFS memoized with `createSelector`; the path computation is expensive (O(V+E)) and only reruns when topology changes, not on unrelated UI state changes

---

## 💬 4. Interview Execution

### Sample Answer

> "Derived state is any value that can be computed from existing state or props — it shouldn't be stored separately because that creates two sources of truth that must be manually synchronized. Every sync bug I've seen follows the same pattern: someone computes a new piece of data and stores it in state, then forgets to keep it in sync when its sources update.
>
> The rule I follow: if it can be computed from state or props, compute it during render. For cheap derivations, that's just a variable assignment. For expensive ones — filtering large arrays, sorting, complex aggregations — I use `useMemo` to memoize the result and only recompute when the declared dependencies change.
>
> In Redux, `createSelector` does the same for store derivations. The gotcha there is multiple component instances: if two `OrderRow` components both use the same selector with different IDs, they share a single memoization cache and invalidate each other. The solution is a selector factory — `makeSelectOrderById(id)` — that creates an independent memoized selector per component instance via `useMemo`.
>
> The worst pattern I saw was using `useEffect` to sync derived state — that runs after render, causes a double-render, and introduces a frame of stale data. Derivation must always happen synchronously, inline during render."

### Likely Follow-up Questions
1. "When should you use `useMemo` vs just computing inline?" → Expensive computation (>1ms) or output is a reference passed to a memoized child
2. "What's wrong with `useEffect` for derived state?" → Double render, stale frame, sync bugs — always derive synchronously
3. "How do you avoid the multi-instance `createSelector` bug?" → Selector factory + `useMemo(() => makeSelector(id), [id])`
4. "What's the difference between derived state in React vs Angular/Vue?" → Same concept: React uses `useMemo`, Vue uses `computed()`, Angular signals use `computed()` — all lazy, cached until dependencies change
5. "Should all expensive computations be in `useMemo`?" → No — only if: computation > ~1ms, runs too frequently, or output is a reference that breaks memoization downstream

### vs Alternatives

| `useMemo` derivation | useEffect sync | createSelector (Redux) |
|---|---|---|
| Synchronous, inline, always fresh | Async, extra render, stale frame | Memoized, shareable, testable |
| Component-local | Component-local | Store-global, composable |
| Works anywhere | Avoid entirely for derivation | For store-based derivations only |

---

## 💻 5. Code Example

```typescript
// Full example: cart with multiple derivations, no stored computed state

interface CartItem { id: string; name: string; price: number; qty: number; }
type SortKey = 'name' | 'price' | 'qty' | 'subtotal';

function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [coupon, setCoupon] = useState<number>(0);  // discount percentage

  // ---- All derived — zero duplicate state ----

  // Layer 1: filter
  const filtered = useMemo(
    () => items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  // Layer 2: sort
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => {
      const mult = sort.dir === 'asc' ? 1 : -1;
      if (sort.key === 'name')     return mult * a.name.localeCompare(b.name);
      if (sort.key === 'price')    return mult * (a.price - b.price);
      if (sort.key === 'qty')      return mult * (a.qty - b.qty);
      if (sort.key === 'subtotal') return mult * ((a.price * a.qty) - (b.price * b.qty));
      return 0;
    }),
    [filtered, sort]
  );

  // Layer 3: totals (from full items list, not filtered — accurate totals)
  const totals = useMemo(
    () => {
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const discount = subtotal * (coupon / 100);
      const tax = (subtotal - discount) * 0.18;  // 18% GST
      return { subtotal, discount, tax, total: subtotal - discount + tax };
    },
    [items, coupon]
  );

  // Layer 4: item count badge (scalar — ultra-cheap, no useMemo needed)
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  return (
    <div>
      <h1>Cart ({totalQty} items)</h1>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter items..." />

      <table>
        <thead>
          <tr>
            {(['name', 'price', 'qty', 'subtotal'] as SortKey[]).map(key => (
              <th key={key} onClick={() => setSort(s => ({
                key,
                dir: s.key === key ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc',
              }))}>
                {key} {sort.key === key ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>{item.qty}</td>
              <td>${(item.price * item.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals derived from useMemo — never stale */}
      <div>
        <p>Subtotal: ${totals.subtotal.toFixed(2)}</p>
        {coupon > 0 && <p>Discount ({coupon}%): −${totals.discount.toFixed(2)}</p>}
        <p>Tax (18%): ${totals.tax.toFixed(2)}</p>
        <p><strong>Total: ${totals.total.toFixed(2)}</strong></p>
      </div>
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**The golden rule of derived state:** "If you can compute it, don't store it."

**Three signals you have a derived state bug:**
1. You have a `useEffect` that reads one state and sets another state
2. You have `setX` calls in multiple places to keep X in sync
3. X goes stale after a background data refresh

**useMemo decision checklist:**
- Is the computation expensive? (>1ms, or large array) → YES → `useMemo`
- Is the output a reference passed to a `React.memo` child or `useEffect` dep? → YES → `useMemo`
- Is it cheap and primitive? → NO → just compute inline

**Mnemonic:** **SSSD** — Single Source, Synchronous Derivation

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The `useEffect` for derived state anti-pattern is extremely common in production codebases (every React developer has written it at least once) — knowing to never do it and why (extra render, stale frame, sync risk) is a clear senior signal; most junior developers don't understand why this is wrong
→ The `createSelector` multi-instance bug is a real production gotcha — two `OrderRow` components using the same selector with different IDs share one memoization cache (the second selector call always invalidates the first); the factory pattern solution demonstrates you've actually run into this in a large codebase
→ Explaining derivation as "lazy computation with dependency tracking" connects it to reactive programming concepts (Vue's `computed`, Angular signals' `computed()`, RxJS `combineLatest`) — showing this cross-framework awareness positions you as a technologist, not just a React programmer

**How it works (2 sentences):**
`useMemo(fn, deps)` stores the previous dependency array and previous result in the component's Fiber node; on each render, it compares the current deps array to the stored one using `Object.is` for each element — if all match, it returns the cached result (same object reference, no recomputation); if any differ, it calls `fn()`, stores the new deps and new result, and returns the new result.
`createSelector` (from Reselect, on which RTK is built) wraps one or more input selectors and a result function; it caches the last computed result along with the last arguments to the input selectors — when called with new store state, it runs the input selectors first and compares their outputs to the cached outputs using strict equality; only if any input output has changed does it call the result function and recache, otherwise it returns the identical cached reference, preventing React from seeing a new object reference and re-rendering.

---
✅ Topic 139/486 complete → Continuing to Topic 140: Redux / Zustand / Signals — Comparison
