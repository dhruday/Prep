# 172. Memoization Techniques
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"Memoization is caching the result of a computation against its inputs — on repeated calls with the same inputs, return the cached result without re-executing. In React, it has three forms: `useMemo` for caching expensive computed values, `useCallback` for caching function references (referential stability), and `React.memo` for skipping re-renders of child components when props haven't changed. The critical distinction I make when consulting: memoization has a cost — the cache check itself. `useMemo(() => a + b, [a, b])` is slower than `a + b` because of the overhead. Profiling first, then memoize. At SAP, we had a Redux selector computing derived state from 1,200 rows without memoization — it ran on every render, including un-related state changes. Adding `createSelector` from Reselect made it recompute only when the underlying data changed. That single change reduced the most-frequently-fired re-render computation by 220ms. But we also removed 40 incorrect `useMemo` calls on primitive values that added overhead with zero benefit."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Memoization trades memory for computation time: store the result of an expensive function call keyed by its arguments. On subsequent calls with identical arguments, return the stored result.

```
Without memoization:
filterExpensiveRows(data, filter) → runs every time → 50ms × N renders
With memoization:
filter(data, filter)  →  same inputs?  →  return cached result (< 1ms)
                     →  new inputs?   →  compute + cache new result (50ms)
```

### The Three React Memoization Primitives

#### `useMemo` — Cache Computed Values

```typescript
import { useMemo } from 'react';

// ✅ CORRECT use: expensive computation that doesn't need to re-run on every render
function ProductList({ products, filter, sortKey }: Props) {
  // Only recomputes when products, filter, or sortKey changes
  const filteredAndSorted = useMemo(() => {
    return products
      .filter(p => p.category === filter)
      .sort((a, b) => a[sortKey] > b[sortKey] ? 1 : -1);
  }, [products, filter, sortKey]);

  return filteredAndSorted.map(p => <ProductCard key={p.id} product={p} />);
}

// ❌ WRONG: memoizing cheap computations — adds overhead without benefit
function BadExample({ price, quantity }: Props) {
  const total = useMemo(() => price * quantity, [price, quantity]);
  // price * quantity takes 0.001ms; useMemo overhead is 0.050ms
  // This is SLOWER than: const total = price * quantity;
}

// ❌ WRONG: memoizing with missing dependencies
function BugExample({ user }: { user: User }) {
  const greeting = useMemo(
    () => `Hello, ${user.name}`,
    [] // ← missing [user.name] — greeting never updates
  );
  return <h1>{greeting}</h1>;
}
```

**When `useMemo` is worth it:**
- Computation takes > 1ms (filter/sort of large arrays, heavy transformations)
- The result is used by a `React.memo`-wrapped child (referential stability matters)
- Computing a derived value from expensive selector patterns

#### `useCallback` — Cache Function References

```typescript
import { useCallback } from 'react';

// ✅ CORRECT: stabilize function reference passed to memoized child
const MemoizedList = React.memo(function List({
  items,
  onDelete,
}: {
  items: Item[];
  onDelete: (id: string) => void;
}) {
  return items.map(item => (
    <Item key={item.id} item={item} onDelete={onDelete} />
  ));
});

function Parent({ items }: { items: Item[] }) {
  // Without useCallback: new function reference on every render
  // → MemoizedList always re-renders (memo comparison fails)
  // With useCallback: same reference when dispatch doesn't change
  const handleDelete = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ITEM', payload: id });
  }, [dispatch]); // dispatch from useReducer is stable

  return <MemoizedList items={items} onDelete={handleDelete} />;
}

// ❌ WRONG: useCallback without a memoized recipient
function BadParent({ items }: { items: Item[] }) {
  // HandlerFn is memoized, but NonMemoizedList doesn't care
  // about referential stability — it re-renders with parent regardless
  const handleDelete = useCallback((id: string) => { /* ... */ }, []);
  return <NonMemoizedList items={items} onDelete={handleDelete} />;
  // The useCallback is pure overhead here
}
```

#### `React.memo` — Skip Component Re-renders

```typescript
import { memo } from 'react';

// Default: shallow compare all props
const ProductCard = memo(function ProductCard({ product, onSelect }: Props) {
  return (
    <div onClick={() => onSelect(product.id)}>
      <h3>{product.name}</h3>
      <p>{product.price}</p>
    </div>
  );
});

// Custom comparator: optimize for specific cases
const ExpensiveRow = memo(
  function ExpensiveRow({ row, isSelected }: Props) {
    return <tr className={isSelected ? 'selected' : ''}>{/* cells */}</tr>;
  },
  (prev, next) => {
    // Only re-render if row ID or selection status changed
    // Ignore other prop changes (e.g., parent's unrelated state)
    return prev.row.id === next.row.id && prev.isSelected === next.isSelected;
  }
);
```

### Reselect — Memoized Redux Selectors

```typescript
import { createSelector } from '@reduxjs/toolkit'; // wraps reselect

// Input selectors (cheap identity extractions)
const selectProducts = (state: RootState) => state.products.items;
const selectFilter   = (state: RootState) => state.ui.filter;
const selectSortKey  = (state: RootState) => state.ui.sortKey;

// Memoized derived selector
// Only recomputes when products, filter, or sortKey change
const selectFilteredProducts = createSelector(
  [selectProducts, selectFilter, selectSortKey],
  (products, filter, sortKey) => {
    // This runs only when inputs change
    return products
      .filter(p => p.category === filter)
      .sort((a, b) => a[sortKey] > b[sortKey] ? 1 : -1);
  }
);

// Usage in component
function ProductList() {
  // filteredProducts is the same reference if inputs haven't changed
  // → prevents unnecessary re-renders in React.memo children
  const filteredProducts = useSelector(selectFilteredProducts);
  return /* ... */;
}
```

**Performance impact of Reselect at SAP:**
Before: `selectFilteredProducts` ran inside component on every state change (including unrelated UI state mutations) → 1,200 row sort/filter ran 80× per minute.
After: Reselect runs only when `products`, `filter`, or `sortKey` change → 1,200 row sort/filter ran 3× per minute. Main-thread time for this computation: 220ms → 8ms per minute.

### LRU Cache for General Memoization

For pure functions outside React (API data transformation, formatters, parsers):

```typescript
// LRU (Least Recently Used) cache — bounded memory
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private readonly maxSize: number) {}

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.maxSize) {
      // Delete oldest entry (first in Map)
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, value);
  }
}

// Memoize with LRU cache (bounded memory, prevents memory leaks)
function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  options: { maxSize?: number; keyFn?: (...args: Args) => string } = {}
): (...args: Args) => R {
  const { maxSize = 100, keyFn = (...args) => JSON.stringify(args) } = options;
  const cache = new LRUCache<string, R>(maxSize);

  return (...args: Args): R => {
    const key = keyFn(...args);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Usage: memoize expensive data transformation
const memoizedFormatCurrency = memoize(
  (value: number, locale: string, currency: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value),
  { maxSize: 1000 }  // bounded — won't grow unbounded for unique values
);
```

### Angular Memoization Patterns

Angular's memoization is handled differently — through pure pipes and signal-based computed values:

```typescript
// Pure Pipe — Angular's built-in memoization
@Pipe({ name: 'filterProducts', pure: true }) // pure: true = memoized by default
export class FilterProductsPipe implements PipeTransform {
  // Only re-runs if products or filter reference changes
  transform(products: Product[], filter: string): Product[] {
    return products.filter(p => p.category === filter);
  }
}

// Signal computed values (Angular 17+) — automatic memoization
import { signal, computed } from '@angular/core';

const products = signal<Product[]>([]);
const filter   = signal<string>('all');

// Automatically memoized — only recomputes when products() or filter() changes
const filteredProducts = computed(() =>
  products().filter(p => filter() === 'all' || p.category === filter())
);
```

### Memoization Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| `useMemo` on every value | Cache overhead > computation cost | Only memoize > 1ms computations |
| `useMemo` with empty deps | Computes once but `eslint-plugin-react-hooks` warns; intent unclear | Use `useRef` for true one-time initialization |
| `useCallback` without memoized recipient | Function reference stable but recipient re-renders anyway | Only `useCallback` when passed to `React.memo` child |
| Unbounded memoize cache | Memory leak for functions called with many unique args | Always LRU-bounded cache with `maxSize` |
| Shallow memo on deeply nested props | Shallow compare passes even when nested object changed | Custom comparator or flatten props structure |
| Memoizing unstable dependencies | Object/array literal in dependency array | Move dependency outside component or useMemo it first |

```typescript
// ❌ The unstable dependency trap
function BadComponent({ config }: { config: Config }) {
  // 'options' is a new object on every render of BadComponent
  // Even though values are the same → derivedValue recomputes every time
  const options = { threshold: 100, limit: 50 }; // ← new reference each render
  const derivedValue = useMemo(() => compute(config, options), [config, options]);

  // This useMemo is useless — options breaks its cache

  // ✅ Fix: move options outside component or memo it separately
  const stableOptions = useMemo(() => ({ threshold: 100, limit: 50 }), []);
  const stableDerived = useMemo(() => compute(config, stableOptions), [config, stableOptions]);
}
```

### React Compiler (React 19) — Auto Memoization

React 19's Compiler (formerly React Forget) analyzes components and automatically inserts `useMemo`, `useCallback`, and `memo` where needed:

```typescript
// Before compiler: manual memoization required
function Products({ items, onSelect }: Props) {
  const filtered = useMemo(() =>
    items.filter(i => i.active), [items]);
  const handleSelect = useCallback((id: string) => {
    onSelect(id);
  }, [onSelect]);
  return <List items={filtered} onSelect={handleSelect} />;
}

// After compiler: write natural code, compiler adds memoization
// React Compiler output is equivalent to the above but auto-generated
function Products({ items, onSelect }: Props) {
  const filtered = items.filter(i => i.active);  // compiler memoizes this
  const handleSelect = (id: string) => onSelect(id); // compiler stabilizes this
  return <List items={filtered} onSelect={handleSelect} />;
}
```

Senior note: React Compiler is production-ready as of React 19 (June 2025). Teams should adopt it progressively. It handles 80–90% of memoization needs automatically, making manual `useMemo`/`useCallback` largely unnecessary going forward — but understanding the principles remains critical for edge cases and debugging.

---

## 🌍 3. Real-World Examples

### SAP Labs — Reselect on 1,200 Row Table
Redux state had a products list (1,200 items). `mapStateToProps` ran `products.filter().sort()` directly. Any Redux state change — including unrelated UI state (sidebar open/closed) — triggered 1,200-row filter + sort. Profiling showed this ran 4–5 times per second during normal navigation. After replacing with a Reselect `createSelector`, computation ran only when `products`, `filter`, or `sortKey` actually changed — typically 2–3 times per session. CPU time for this calculation dropped from 220ms/min to < 5ms/min.

### Microsoft — Excel Web Heavy Formula Memoization
Excel for the web uses aggressive memoization for formula results. When a cell formula like `=VLOOKUP(A1, $B$1:$C$1000, 2, FALSE)` is evaluated, the result is cached keyed by the cell's dependency fingerprint. Only when cells in the lookup range change does the formula recompute. Without this, editing any cell in a large spreadsheet would require recomputing all 50,000 formulas — instead, only the dirty cells' dependent formulas recompute.

### Adobe — Photoshop Filter Preview Memoization
Photoshop web's filter preview computes pixel transformations using WebAssembly. The same filter with the same parameters on the same layer data produces the same output. `useMemo` isn't sufficient here (React lifecycle), so Adobe uses a session-scoped `Map<string, ImageData>` keyed by `${filterId}:${params}:${layerHash}`. Users adjusting the same filter slider repeatedly get instant preview by reusing the cached `ImageData`. Memory is bounded by limiting cache to the 10 most recent computations.

### Salesforce — Record Page Selector Memoization
Salesforce Lightning record pages fetch data via @wire decorators and compute derived display values (formatted currency, combined names, urgency indicators). All derived computations are memoized using LWC's `@track` and reactive getters. A record with 30 fields only recomputes formatting for changed fields, not all 30 on every wire update. For list views with 200 records, this prevents 5,800 unnecessary Intl.NumberFormat calls per data refresh.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Memoization caches computation results against their inputs. In React there are three tools: `useMemo` caches a derived value and recomputes only when dependencies change, `useCallback` caches a function reference for referential stability, and `React.memo` skips child component re-renders when props haven't changed shallowly. The critical mistake I see constantly: memoizing everything. `useMemo(() => price * quantity, [price, quantity])` is actually slower than `price * quantity` because of the cache check overhead. Profile first, memoize when computation exceeds 1ms. At SAP, a Reselect `createSelector` replaced a direct 1,200-row filter in Redux — it ran 80 times per minute before and ran 3 times after. That was a real win. Most `useMemo` I audit are on primitive arithmetic or string concatenation — pure overhead. For selectors that feed into `React.memo`-wrapped children, memoization is critical because referential stability is what allows the child to skip re-renders. React 19's Compiler automates most of this going forward."

### Follow-Up Q&A

**Q: When does `useMemo` NOT skip recalculation?**
A: `useMemo` always runs in strict mode (double invocation for impurity detection), during initial render (always computes first time), and after React discards the cache. React may discard the `useMemo` cache at its discretion — if memory pressure is high or during concurrent mode rerenders. This is intentional by design: `useMemo` is a **performance optimization hint**, not a semantic guarantee. Never use `useMemo` for values that must persist across renders — use `useRef` for that.

**Q: What is the difference between `useMemo` and `useRef` for caching?**
A: `useMemo` participates in React's rendering — its dependency array ties it to the render cycle, React may reset it, and it re-runs when deps change. `useRef` is a stable container that never causes re-renders — once set, it persists for the component lifetime. Use `useMemo` for computed values that should update reactively. Use `useRef` for: DOM refs, mutable values that don't affect render output, and values that should survive renders without recalculation (e.g., expensive initialization that runs once).

**Q: How do you handle memoization when the comparison function is expensive itself?**
A: If the equality check is expensive (e.g., deep comparing large objects), the memoization overhead may exceed the saved computation. Solutions: (1) Normalize data upstream so comparisons are simple reference equality. (2) Use structural key-based comparison (compare a hash or version counter, not the data itself). (3) Consider immutable data structures (Immer/Immutable.js) that guarantee next reference ≠ previous reference only if data changed — makes shallow comparison safe for deep objects.

### Memoization Tool Selection Guide

| Scenario | Tool |
|----------|------|
| Expensive derived value from props/state | `useMemo` |
| Function reference passed to memo child | `useCallback` |
| Skip child re-render on unchanged props | `React.memo` |
| Redux derived state | `createSelector` (Reselect) |
| Angular derived state | Pure Pipe or `computed()` signal |
| General pure function memoization | Custom `memoize` with LRU cache |
| One-time expensive initialization | `useRef` with lazy initial value |

---

## 💻 5. Code Example (TypeScript)

```typescript
// Complete memoization patterns for a data grid with filtering and sorting

import { useMemo, useCallback, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';

// ─── 1. Memoized Reselect selectors ──────────────────────────────
const selectItems     = (state: RootState) => state.data.items;
const selectFilter    = (state: RootState) => state.ui.filter;
const selectSortField = (state: RootState) => state.ui.sortField;
const selectSortDir   = (state: RootState) => state.ui.sortDirection;

const selectFilteredSortedItems = createSelector(
  [selectItems, selectFilter, selectSortField, selectSortDir],
  (items, filter, sortField, direction) => {
    let result = filter
      ? items.filter(item => item.category === filter)
      : items;

    if (sortField) {
      const dir = direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) =>
        a[sortField] > b[sortField] ? dir : a[sortField] < b[sortField] ? -dir : 0
      );
    }

    return result;
  }
);

// ─── 2. Memoized React component ─────────────────────────────────
interface RowProps {
  item: DataItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

// Custom comparator — only re-render when relevant data changes
const DataRow = memo(
  function DataRow({ item, isSelected, onSelect, onDelete }: RowProps) {
    return (
      <tr
        className={isSelected ? 'selected' : ''}
        onClick={() => onSelect(item.id)}
      >
        <td>{item.name}</td>
        <td>{item.value}</td>
        <td>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
            Delete
          </button>
        </td>
      </tr>
    );
  },
  (prev, next) =>
    prev.item === next.item &&        // reference equality (Immer ensures this)
    prev.isSelected === next.isSelected &&
    prev.onSelect === next.onSelect && // ← needs useCallback to be stable
    prev.onDelete === next.onDelete    // ← needs useCallback to be stable
);

// ─── 3. Parent component with proper memoization ─────────────────
function DataGrid() {
  const dispatch = useDispatch();
  const items = useSelector(selectFilteredSortedItems);
  const selectedIds = useSelector((s: RootState) => s.ui.selectedIds);

  // useCallback: stable references for memoized DataRow children
  const handleSelect = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_SELECTION', payload: id });
  }, [dispatch]); // dispatch is stable from useDispatch

  const handleDelete = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ITEM', payload: id });
  }, [dispatch]);

  // useMemo: selectedIds is a Set for O(1) lookup inside each row
  // Rebuilding a Set from array is O(n) — only do it when selection changes
  const selectedSet = useMemo(
    () => new Set(selectedIds),
    [selectedIds]
  );

  return (
    <table>
      <tbody>
        {items.map(item => (
          <DataRow
            key={item.id}
            item={item}
            isSelected={selectedSet.has(item.id)}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        ))}
      </tbody>
    </table>
  );
}
```

```typescript
// Memoize with profiling wrapper — find where memoization actually helps
function memoizeWithProfiling<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  name: string,
  maxSize = 100
): (...args: Args) => R {
  const cache = new Map<string, R>();
  let hits = 0, misses = 0;

  return (...args: Args): R => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      hits++;
      if (process.env.NODE_ENV === 'development' && (hits + misses) % 100 === 0) {
        console.debug(`[Memo:${name}] Hit rate: ${(hits / (hits + misses) * 100).toFixed(1)}%`);
      }
      return cache.get(key)!;
    }

    misses++;
    const start = performance.now();
    const result = fn(...args);
    const elapsed = performance.now() - start;

    if (process.env.NODE_ENV === 'development' && elapsed < 1) {
      console.warn(
        `[Memo:${name}] Computation took ${elapsed.toFixed(3)}ms — ` +
        `memoization overhead likely exceeds savings. Consider removing.`
      );
    }

    if (cache.size >= maxSize) {
      // Simple FIFO eviction (use LRU for production)
      cache.delete(cache.keys().next().value);
    }
    cache.set(key, result);
    return result;
  };
}
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"VRC — Val / Ref / Component"**
- **V** — `useMemo` = memoize a **Value** (expensive computation)
- **R** — `useCallback` = memoize a **Reference** (function, for stable prop)
- **C** — `React.memo` = memoize a **Component** (skip re-render on unchanged props)

All three only work together:
```
Parent uses useCallback → child sees stable reference → React.memo works
Parent uses useMemo → passes stable array/object → React.memo works
Without useCallback/useMemo → React.memo's comparison always fails
```

### When To Memoize Decision Tree
```
Is the computation > 1ms? (time it with console.time)
  └── No  → DON'T memoize (overhead > savings)
  └── Yes → Does it run more than once with the same inputs?
              └── No  → DON'T memoize
              └── Yes → IS the result passed to a React.memo child?
                          └── No  → memoize if > 1ms
                          └── Yes → memoize for referential stability (even if fast)
```

### Analogy
Memoization is like **photocopying a form you fill out repeatedly** — the first time you fill it (compute), then photocopy it (cache). Next time the same person needs the same form: give them the photocopy, don't fill again. But if you photocopy every form even those used once — you waste paper and time photocopying. Profile first, photocopy (memoize) only the forms that are actually requested repeatedly.

---

## ✅ 7. Why & How Summary

- **Why it matters:** Without memoization, derived state computations (filtering, sorting, selectors) re-run on every render regardless of whether their inputs changed — at SAP a 1,200-row table computation ran 80× per minute instead of 3× after adding a Reselect selector, reducing main-thread time 98%
- **How it works:** `useMemo` stores `[deps, result]` and returns cached result if deps haven't changed (shallow equality); `useCallback` stores `[deps, fn]` similarly; `React.memo` stores previous props and skips re-render if all props are shallowly equal; Reselect's `createSelector` uses reference equality checks on input selectors' output
- **How Hruday uses it:** Applied Reselect across SAP Redux store for all list views; added custom comparators to `React.memo` on high-frequency DataRow components; removed 40 incorrect `useMemo` calls on primitive values during code review; tracks memoization effectiveness with hit-rate logging in development

---

✅ Topic 172/486 complete → Continuing to Topic 173: Bundle Analysis — webpack-bundle-analyzer, Rollup Visualiser
