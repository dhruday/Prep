# 130. Memoization — React.memo, useMemo, useCallback Deep Dive
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

React's three memoization primitives serve distinct purposes. `React.memo` memoizes a **component** — it skips re-rendering if props haven't changed (shallow equality check). `useMemo` memoizes a **computed value** — re-runs the calculation only when dependencies change. `useCallback` memoizes a **function reference** — returns the same function instance between renders unless dependencies change. The critical insight most developers miss: `useMemo` and `useCallback` are only valuable when (1) the result is used as a prop for a `React.memo` component, (2) the computation is genuinely expensive, or (3) the value is a dependency in another hook. Adding them everywhere is not "safe" — they have their own overhead (memory + comparison work) and make code harder to read. Profile first, then memoize the identified bottleneck.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### React.memo — Component-Level Memoization

```typescript
import { memo, useState } from 'react';

// ====== Basic React.memo ======
// ProductCard ONLY re-renders if its props change (shallow equality)
const ProductCard = memo(function ProductCard({ product, onSelect }: {
  product: Product;
  onSelect: (id: string) => void;
}) {
  console.log('ProductCard rendered:', product.id);
  return (
    <div onClick={() => onSelect(product.id)}>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  );
});

// PROBLEM: this breaks React.memo for ProductCard!
function ProductList({ products }: { products: Product[] }) {
  // ❌ New function reference EVERY render → memo comparison fails
  const handleSelect = (id: string) => console.log('selected', id);

  return (
    <ul>
      {products.map(p => (
        // handleSelect is a new function each render → ProductCard ALWAYS re-renders
        <ProductCard key={p.id} product={p} onSelect={handleSelect} />
      ))}
    </ul>
  );
}

// FIX: stable function reference with useCallback
function ProductListFixed({ products }: { products: Product[] }) {
  // ✅ Same function reference between renders (deps: empty array)
  const handleSelect = useCallback((id: string) => {
    console.log('selected', id);
  }, []);  // no deps → function never changes

  return (
    <ul>
      {products.map(p => (
        // Now memo comparison succeeds when product hasn't changed
        <ProductCard key={p.id} product={p} onSelect={handleSelect} />
      ))}
    </ul>
  );
}

// ====== Custom comparator ======
// Shallow equality checks each prop with ===
// Custom comparator: use when:
// - Default shallow equality is too aggressive (deep structure)
// - Default shallow equality is too lenient (specific field matters)
const ProductCardCustom = memo(
  function ProductCard({ product, onSelect }) { /* ... */ },
  (prevProps, nextProps) => {
    // Return TRUE to SKIP re-render (props are "equal")
    // Return FALSE to re-render
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.product.price === nextProps.product.price &&
      // Only check fields that actually affect render — ignore irrelevant fields
      prevProps.onSelect === nextProps.onSelect
    );
  }
);
```

### useMemo — Value Memoization

```typescript
import { useMemo, useState } from 'react';

// ====== When useMemo is justified ======

// ✅ CASE 1: Expensive computation (not every render should pay for it)
function ProductCatalog({ products, searchQuery, sortField }: Props) {
  // Filtering + sorting 10,000 products: ~15ms without memoization
  const filteredAndSorted = useMemo(() => {
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.sort((a, b) => {
      if (sortField === 'price') return a.price - b.price;
      return a.name.localeCompare(b.name);
    });
  }, [products, searchQuery, sortField]);
  // Only re-computed when products, search, or sort changes
  // Skipped when unrelated state changes (e.g., sidebar open/closed)

  return <ProductList products={filteredAndSorted} />;
}

// ✅ CASE 2: Stable reference for React.memo child
function ParentComponent({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);

  // ❌ Without useMemo: new object on every render → breaks UserCard memo
  // const user = { id: userId, displayName: `User ${userId}` };

  // ✅ With useMemo: same object reference when userId hasn't changed
  const user = useMemo(() => ({
    id: userId,
    displayName: `User ${userId}`,
  }), [userId]);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <UserCard user={user} />  {/* Won't re-render when count changes */}
    </>
  );
}

// ✅ CASE 3: useSelectorHook-style derived state used as dependency
function Dashboard({ orders }: { orders: Order[] }) {
  const revenueByMonth = useMemo(() =>
    orders.reduce((acc, order) => {
      const month = order.date.slice(0, 7);
      acc[month] = (acc[month] ?? 0) + order.amount;
      return acc;
    }, {} as Record<string, number>),
    [orders]
  );

  // Use revenueByMonth as dep in another hook — stable reference matters
  useEffect(() => {
    updateChart(revenueByMonth);
  }, [revenueByMonth]);  // only re-runs when orders actually changes

  return <RevenueChart data={revenueByMonth} />;
}

// ❌ When useMemo is NOT justified (premature optimization):
function SimpleComponent({ value }: { value: string }) {
  // This is fast — don't memoize
  const uppercased = useMemo(() => value.toUpperCase(), [value]);
  // String manipulation is microseconds — useMemo overhead is comparable
  // Just write: const uppercased = value.toUpperCase();
  return <span>{uppercased}</span>;
}
```

### useCallback — Function Reference Stability

```typescript
import { useCallback, useState, useEffect } from 'react';

// ====== When useCallback is justified ======

// ✅ CASE 1: Passed to React.memo component (as shown above)

// ✅ CASE 2: In dependency array of another hook
function DataFetcher({ endpoint }: { endpoint: string }) {
  const [data, setData] = useState<any>(null);

  // ❌ Without useCallback: new function on every render → useEffect runs infinitely
  // const fetchData = async () => {
  //   const result = await fetch(endpoint).then(r => r.json());
  //   setData(result);
  // };

  // ✅ With useCallback: stable function reference
  const fetchData = useCallback(async () => {
    const result = await fetch(endpoint).then(r => r.json());
    setData(result);
  }, [endpoint]);  // re-create only if endpoint changes

  useEffect(() => {
    fetchData();
  }, [fetchData]);  // now only re-runs when endpoint changes

  return <div>{JSON.stringify(data)}</div>;
}

// ✅ CASE 3: Event handlers in lists (combined with React.memo)
function TodoList({ todos }: { todos: Todo[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleTodo = useCallback((id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);  // setChecked from useState is stable — no deps needed

  return (
    <ul>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={toggleTodo}   // stable ref → memo works
          isChecked={checked.has(todo.id)}
        />
      ))}
    </ul>
  );
}
const TodoItem = memo(function TodoItem({ todo, onToggle, isChecked }) {
  return (
    <li>
      <input type="checkbox" checked={isChecked} onChange={() => onToggle(todo.id)} />
      {todo.title}
    </li>
  );
});
```

### The Stale Closure Trap

```typescript
// CLASSIC BUG: stale closure in useCallback
function Counter() {
  const [count, setCount] = useState(0);

  // ❌ Stale closure: count is always 0 (captured at creation time)
  const logCount = useCallback(() => {
    console.log(count);  // always logs 0!
  }, []);  // missing dependency: count

  // ✅ Option A: add count to deps (breaks memoization if count changes often)
  const logCountFixed = useCallback(() => {
    console.log(count);
  }, [count]);  // re-creates when count changes

  // ✅ Option B: use functional update (doesn't need count in closure)
  const incrementAndLog = useCallback(() => {
    setCount(c => {
      console.log(c + 1);  // reads current value via functional update
      return c + 1;
    });
  }, []);  // stable! receives current state via callback

  // ✅ Option C: useRef for latest value (advanced pattern)
  const countRef = useRef(count);
  useLayoutEffect(() => { countRef.current = count; });
  const logLatestCount = useCallback(() => {
    console.log(countRef.current);  // always has latest value
  }, []);  // stable, always reads latest via ref

  return <button onClick={incrementAndLog}>Increment</button>;
}
```

### Rules of Thumb (When to Memoize)

```
MEMOIZE                                    | DON'T MEMOIZE
------------------------------------------|------------------------------------------
Expensive computation (> ~1ms per render) | Simple string/number transforms
Stable ref for React.memo child           | Components that always re-render anyway
Function in useEffect dep array           | Top-level components (App, Layout, Page)
Object/array in useEffect dep array       | Components always receiving new props
Selector returning object from array       | Fast pure functions (toUpperCase, etc.)
                                          | Functions with no deps (just extract them)

React.memo worthwhile when:               | React.memo NOT worthwhile when:
- Parent re-renders frequently             | - Component renders expensive JSX
- Component is expensive to render         | - Props always change (every render)
- Props are stable (primitive values)      | - Tree depth is shallow (no benefit)
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, `whyDidYouRender` identified that `ProductCard` (rendered 1,200 times in the list) was re-rendering on every parent state change because `onAddToCart` was inline in the parent. Three changes: (1) wrapped `ProductCard` with `React.memo`, (2) moved `onAddToCart` to `useCallback` in parent, (3) memoized the `filters` object (derived from URL params) with `useMemo` since it was a new object every render even when params hadn't changed. Result: a filter change re-rendered only the filtered products (changed data) — the rest stayed skipped. React DevTools Profiler showed commit time down from 45ms to 7ms.

**At FAANG scale:**
- **Microsoft:** Fluent UI components — every interactive component in the design system is wrapped with `React.memo` with carefully tuned custom comparators; the team maintains a react-memo "contract" — each component documents which props must be stable for memo to work
- **Adobe:** Creative Cloud asset grid — `useMemo` on filtered/sorted asset list (up to 50,000 items), `useCallback` on all item interaction handlers; custom comparator on `AssetThumbnail` checks `asset.version` only (not deep-equal)
- **Salesforce:** CRM list view — `useMemo` for selector result (`createSelector` from Reselect), `React.memo` on row components; stale closure bugs caught by eslint-plugin-react-hooks exhaustive-deps rule (enforced in CI)
- **Cisco:** Real-time network dashboard — `useMemo` for topology layout computation (force-directed graph algorithm, ~50ms), `useCallback` on drag/zoom handlers passed to canvas component; without memo the layout recomputes on every WebSocket message

---

## 💬 4. Interview Execution

### Sample Answer

> "The three memoization primitives have distinct purposes. `React.memo` is the wrapper around a component — it compares props with shallow equality and skips the re-render if props haven't changed. `useMemo` stabilizes a calculated value. `useCallback` stabilizes a function reference.
>
> The key relationship between them: `React.memo` only works if the props passed TO it are stable references. Passing an inline function or inline object as a prop to a `React.memo` component defeats the memoization — the component sees a new reference every render and re-renders anyway. So `useCallback` and `useMemo` are the prerequisites for making `React.memo` effective.
>
> The stale closure trap: if you omit a value from a `useCallback` dependency array to keep the function stable, you'll read a stale value from the closure. The fix without breaking stability is usually functional state updates (`setCount(c => c + 1)`) or a ref pattern where you store the latest value in a ref.
>
> My rule: don't add memoization speculatively. Profile first — if DevTools shows 30ms render times and WDYR shows unnecessary re-renders, add the targeted memo. If `useMemo` is around a string transform, it's noise."

---

## 💻 5. Code Example

```typescript
// Complete memoization chain: parent useCallback + child React.memo
import { memo, useCallback, useMemo, useState } from 'react';

type Item = { id: string; name: string; price: number; category: string };

// ---- Child: memo with custom comparator ----
const ItemRow = memo(
  function ItemRow({ item, onSelect }: { item: Item; onSelect: (id: string) => void }) {
    return (
      <tr onClick={() => onSelect(item.id)}>
        <td>{item.name}</td>
        <td>${item.price.toFixed(2)}</td>
      </tr>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.price === next.item.price &&
    prev.onSelect === next.onSelect
);

// ---- Parent: stable references with useCallback + useMemo ----
export function ItemTable({ items, category }: { items: Item[]; category: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ✅ Stable function: setSelectedId from useState is stable, so no deps needed
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // ✅ Memoize expensive filter — only re-run when items or category changes
  const filtered = useMemo(
    () => items.filter(item => item.category === category),
    [items, category]
  );

  return (
    <table>
      <tbody>
        {filtered.map(item => (
          <ItemRow key={item.id} item={item} onSelect={handleSelect} />
        ))}
      </tbody>
    </table>
  );
}
```

---

## 🧠 6. Memory Aid

**MCF — three primitives, three targets:**
- **M**emo: memoize a Component (skip re-render if props unchanged)
- **C**allback: memoize a Callback (stable function reference)
- **F**rozen value: useMemo memoizes a computed value (expensive calc or stable ref)

**When the chain is complete:**
`useMemo`/`useCallback` in parent → stable props → `React.memo` child skips → performance win

**Stale closure red flags:**
- Empty deps `[]` + accessing state/props inside → stale
- Fix: functional update pattern or exhaustive deps

**Don't memoize:**
- Simple string/number transforms (overhead > benefit)
- Functions that have no deps (extract as constant outside component)
- Components that always receive new props (memo comparison is wasted)

**Mnemonic:** **MCF** — Memo=Component, Callback=function, Frozen=value. All three guard reference identity.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ "Explain the relationship between React.memo, useCallback, and useMemo" is a top-3 senior React interview question — the complete answer (memo wraps component, but it only works when the props are stable, which requires useCallback for functions and useMemo for objects/arrays) demonstrates systems-level React understanding, not just reciting API docs
→ The stale closure problem is a production bug trap — candidates who've never encountered it in production typically give the incomplete answer "just put everything in the deps array"; articulating the functional update pattern and ref pattern as alternatives shows you've debugged this in real code
→ "When NOT to memoize" is the differentiator: most candidates add memoization everywhere; a senior engineer knows useMemo and useCallback are memory allocations with comparison overhead, and applies them only where profiling shows a benefit — this is the "right amount of complexity" principle in action

**How it works (2 sentences):**
`React.memo` wraps a component in a higher-order component that checks whether any prop reference changed (by iterating all props with `Object.is` equality, which is strict equality for primitives and reference equality for objects/functions) before rendering — if all props return `Object.is(prev, next) === true`, React skips re-rendering the component and reuses the last rendered output; if any prop fails this check, the component re-renders fully regardless of memoization.
`useCallback(fn, deps)` and `useMemo(() => value, deps)` both store the previous result on the component's fiber and compare the current dependency array against the previous using `Object.is` per element — if all deps are identical, the stored value/function is returned without re-execution; the memory cost is one stored reference plus one dependency array per call site, which is why over-applying these hooks uniformly increases memory pressure and comparison work without a rendering benefit.

---
✅ Topic 130/486 complete → Continuing to Topic 131: Virtual Scrolling — react-window, react-virtual
