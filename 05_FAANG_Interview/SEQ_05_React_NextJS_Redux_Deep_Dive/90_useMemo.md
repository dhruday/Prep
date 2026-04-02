# 90. useMemo — When It Helps vs When It Hurts
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`useMemo` memoizes the result of a computation — it runs the factory function only when its dependencies change, returning the cached result on other renders. It serves two distinct purposes: avoiding expensive recomputation (performance), and maintaining referential stability of objects/arrays (correctness — preventing unnecessary effect re-runs and child re-renders when React.memo is in use). The anti-pattern: wrapping trivial computations that take microseconds — `useMemo` has its own overhead (closure allocation, dependency comparison) that may exceed the cost of the computation it's protecting. The rule: only memo when there's a measurable performance problem or when referential stability is required by a memoized child or effect dependency.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What `useMemo` Does Internally

```typescript
// Simplified pseudocode
function useMemo<T>(factory: () => T, deps: readonly unknown[]): T {
  const prevHook = currentFiber.memoizedState;
  
  if (prevHook !== null && depsEqual(prevHook.deps, deps)) {
    return prevHook.memoizedState;  // return cached value
  }
  
  const result = factory();  // compute new value
  currentFiber.memoizedState = { memoizedState: result, deps };
  return result;
}

function depsEqual(prev: readonly unknown[], next: readonly unknown[]) {
  if (prev.length !== next.length) return false;
  return prev.every((val, i) => Object.is(val, next[i]));
}
```

React stores the previous deps and result on the fiber. On each render, it compares new deps against previous deps with `Object.is`. If all deps are identical → return cached value. If any changed → re-run factory.

### Purpose 1: Expensive Computation

```typescript
// ✅ Legitimate use: O(n log n) sort over large dataset
function FilteredSortedTable({ data, filter, sortKey }: {
  data: Product[];
  filter: string;
  sortKey: keyof Product;
}) {
  // Without useMemo: re-filters and re-sorts on EVERY render
  // (including renders for unrelated state changes like hover states, checkbox toggles)
  // With 10,000 items: could be 50-100ms per render — jank city
  const processedData = useMemo(() => {
    const filtered = data.filter(item =>
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
    return filtered.sort((a, b) =>
      String(a[sortKey]).localeCompare(String(b[sortKey]))
    );
  }, [data, filter, sortKey]);
  // Only re-runs when data, filter, or sortKey actually changes

  return <Table data={processedData} />;
}

// ❌ Not worth memoizing: trivial computation
function PriceDisplay({ price, discount }: { price: number; discount: number }) {
  // This takes ~0.001ms — useMemo overhead (allocation, deps comparison) is MORE expensive
  const finalPrice = useMemo(() => price * (1 - discount / 100), [price, discount]);
  // ✅ Just compute inline:
  const finalPriceInline = price * (1 - discount / 100);
  return <span>${finalPriceInline.toFixed(2)}</span>;
}
```

**When is computation "expensive enough"?**
Profile first. If a React render takes <1ms total, almost nothing inside it needs memoization. If a computation consistently takes >1ms in React Profiler, it's a memoization candidate. Common O(n) operations on small datasets (<1000 items) typically don't need memoization.

### Purpose 2: Referential Stability

This is the **most important but least understood** use case:

```typescript
// ❌ Object created in render — new reference every render
function UserDashboard({ userId }: { userId: string }) {
  const [filter, setFilter] = useState('active');
  const [page, setPage] = useState(1);

  // New object every render (even hover state change creates new reference)
  const queryParams = { userId, filter, page };

  // Child is memoized — but receives new queryParams reference every render
  // React.memo's shallow comparison: queryParams !== queryParams (different object)
  // → Child re-renders despite memoization
  return <ExpensiveList queryParams={queryParams} />;
}

// ✅ useMemo for referential stability
function UserDashboard({ userId }: { userId: string }) {
  const [filter, setFilter] = useState('active');
  const [page, setPage] = useState(1);
  const [hovered, setHovered] = useState(false);  // unrelated state

  // Same reference unless userId, filter, or page changes
  // hovered changes don't cause new queryParams reference
  const queryParams = useMemo(() => ({ userId, filter, page }), [userId, filter, page]);

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <ExpensiveList queryParams={queryParams} />
      {/* ExpensiveList's React.memo now correctly bails out on hover changes */}
    </div>
  );
}

const ExpensiveList = React.memo(function ExpensiveList({ queryParams }: { queryParams: QueryParams }) {
  // Expensive render — only re-renders when queryParams reference changes
  return <div>...</div>;
});
```

**Critical insight:** `useMemo` for referential stability only helps when the receiving component is wrapped in `React.memo` (or the value is in `useEffect` deps). Without `React.memo`, every render of the parent re-renders the child regardless of prop identity.

### When `useMemo` Hurts

**Overhead cost:**
Every `useMemo` call on every render:
1. Allocates a closure (the factory function)
2. Allocates a deps array
3. Runs `Object.is` comparison for each dep
4. Reads/writes fiber memory

For trivial computations, this cost is measurably higher than just re-running the computation.

**Optimistic memoization — wasted effort:**

```typescript
// ❌ useMemo on a component with no memoized children
function SimpleCounter() {
  const [count, setCount] = useState(0);

  // This component re-renders entirely anyway on count change
  // count * 2 takes 0.001ms; useMemo costs more
  const doubled = useMemo(() => count * 2, [count]);
  // No child uses doubled as a dep — no referential stability benefit either
  const doubledSimple = count * 2;  // ← just do this

  return <span>{doubled}</span>;
}
```

**Misused for "effect prevention":**

```typescript
// ❌ Common mistake: fighting against React's data flow with useMemo
function Component({ apiResponse }) {
  // The developer wants to "only process when apiResponse changes"
  // but this is what useMemo is for — they're writing it correctly:
  const processedData = useMemo(() => transformData(apiResponse), [apiResponse]);
  // ✅ This IS correct if transformData is expensive

  // ❌ Incorrect pattern: using useMemo to "block" re-renders
  // useMemo does NOT prevent re-renders — it prevents recomputation
  // The component still re-renders, just using cached value
}
```

**Breaking memoization with unstable deps:**

```typescript
// ❌ New function reference every render → useMemo runs every render anyway
function Component({ items }: { items: Item[] }) {
  const sortFn = (a: Item, b: Item) => a.value - b.value;  // new fn every render
  const sorted = useMemo(() => [...items].sort(sortFn), [items, sortFn]);
  // [items, sortFn] → sortFn changes every render → useMemo runs every render
  // Worse than no useMemo: has overhead AND runs every render

  // ✅ Define sort function outside component (stable reference)
  const sortedCorrect = useMemo(() => [...items].sort(compareByValue), [items]);
}

const compareByValue = (a: Item, b: Item) => a.value - b.value;
// Defined outside: stable module-level reference — not included in deps
```

### `useMemo` vs `useCallback`

`useCallback(fn, deps)` is exactly `useMemo(() => fn, deps)` — just syntactic sugar for the common case of memoizing a function:

```typescript
// These are identical:
const memoizedFn = useCallback(() => doSomething(a, b), [a, b]);
const memoizedFnLong = useMemo(() => () => doSomething(a, b), [a, b]);
// useCallback is cleaner for function memoization
```

### Decision Framework

```
Is the computation expensive? (> ~1ms in profiler)
  YES → useMemo for performance
  NO →  Is it needed for referential stability?
          YES → Is the consumer memoized with React.memo / in useEffect deps?
                  YES → useMemo for correctness
                  NO  → useMemo helps nothing — skip it
          NO →  Skip useMemo — just compute inline
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, a procurement table had a `useMemo` wrapping every column formatter, even simple date-to-string conversions. A performance audit showed `useMemo` overhead was 20% of the component's render time — the memoized computations averaged 0.01ms, but the 15 `useMemo` calls cost 0.15ms total just in hook overhead. The team removed all `useMemo` from trivial computations, improving component render time by ~18%.

At Bosch, the sensor data chart had a problem where changing the view width (resizing the browser) caused the chart component to fully re-render because the `chartConfig` object (a prop) was being recreated in the parent on every render — including ResizeObserver-triggered renders. Adding `useMemo` for `chartConfig` with `[data, colorScheme, unit]` deps eliminated the chart re-render on resize. The chart re-rendered only when actual data changed.

**At FAANG scale:**
- **Microsoft (Excel Online):** Formula evaluation tree — `useMemo` on parsed formula trees keyed by the formula string; re-parsing a complex `VLOOKUP` formula on every cell selection change would be 10-50ms; memoized parsing means it only re-parses when the formula changes
- **Adobe (XD):** Layer ordering computation — `useMemo` on z-index sorted layer list with `[layers, selectedIds]` deps; layer selection changes trigger lots of renders but shouldn't resort thousands of layers
- **Salesforce (Report Builder):** Report column configuration — `useMemo` for the processed column metadata (type checking, format string parsing) with `[columnSchema]` deps; column schema rarely changes, render changes often
- **Cisco (Network Config Diff):** Config diff computation — `useMemo` on the diff result with `[runningConfig, candidateConfig]` deps; diffing 10,000 config lines takes ~200ms; without memoization, every UI interaction re-ran the diff

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "useMemo caches a computed value and returns the cached result when dependencies haven't changed. It serves two important but different purposes.
>
> The first is avoiding expensive recomputation. If you have an O(n log n) sort or a complex data transformation that takes measurable time — say 5-50ms — memoizing it with the actual data as deps means it only runs when the data changes, not on every render. But this matters only if the component renders frequently for other reasons.
>
> The second purpose, which is often more impactful, is referential stability. Objects and arrays created in render are new references every render. If you pass them to a React.memo-wrapped child or include them in a useEffect deps array, they'll trigger bailout failures or effect re-runs on every parent render. useMemo gives the same logical value a stable object identity, enabling the bailout to actually work.
>
> The anti-pattern to know: wrapping trivial computations. useMemo has real overhead — closure allocation, deps array allocation, Object.is comparison per dep. For computations that take less than a microsecond, this overhead exceeds the savings. I've seen codebases where gratuitous useMemo calls were measurably slowing renders down. The rule is profile first, memoize second."

### Likely Follow-up Questions

1. **Does `useMemo` guarantee the cached value is always used?** → No. React may discard cached values in certain situations — during concurrent mode renders that get discarded, or in the future with automatic memoization features. The contract is: "the factory won't run unless deps change" but not "the factory will always produce a new value when deps change." Don't put side effects in `useMemo` factory.
2. **What's the relationship between `useMemo` and the React Compiler?** → The React Compiler (React 19) can automatically insert memo, useMemo, and useCallback optimizations. If the compiler is enabled, manual `useMemo` may be unnecessary — the compiler figures out what to memoize. The compiler works by analyzing component purity and stable references.
3. **Can `useMemo` be used for expensive one-time initialization?** → For initialization that happens once, `useState(() => init())` (lazy initializer) is cleaner. `useMemo` with `[]` deps works but is semantically wrong — it implies a computation that could change when deps change, but `[]` means "never depends on anything." `useRef` with a null check is also an option for non-state initialization.
4. **When should you use `useMemo` on the deps array itself?** → You shouldn't memo the deps array — that's circular. If you want to stabilize a derived deps array, stabilize its source values first via `useMemo` at that level. Working down the dependency chain is the correct approach.

### Senior Signal

> "I frame useMemo to my team as two distinct tools with different justifications. Performance memoization: measure first, memo second — never speculatively memo. Referential stability memoization: this is often necessary for correctness when working with React.memo children or effect deps, and should flow naturally from the data modeling. If I find myself adding useMemo to make a memoized child work, that's a signal to check whether the parent is creating too many unstable references — which might indicate a design problem that useMemo is papering over rather than solving. The best outcome is often fewer useMemo calls by redesigning data flow to pass primitives rather than objects as props."

---

## 💻 5. Code Example

```typescript
import React, { useState, useMemo, useEffect } from 'react';

// ========================
// 1. Performance memoization — large dataset processing  
// ========================
interface Product { id: string; name: string; price: number; category: string; inStock: boolean; }

function ProductCatalog({ products }: { products: Product[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<keyof Product>('name');
  const [showInStock, setShowInStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // ✅ Memoized: expensive filter + sort, only re-runs when relevant state changes
  const processedProducts = useMemo(() => {
    // O(n) filter + O(n log n) sort on potentially thousands of products
    return products
      .filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (!showInStock || p.inStock)
      )
      .sort((a, b) => String(a[sortBy]).localeCompare(String(b[sortBy])));
  }, [products, searchQuery, sortBy, showInStock]);
  // selectedProduct changing does NOT re-run this computation — correct

  return (
    <div>
      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      <label>
        <input type="checkbox" checked={showInStock} onChange={e => setShowInStock(e.target.checked)} />
        In stock only
      </label>
      {processedProducts.map(p => (
        <ProductCard key={p.id} product={p} selected={p.id === selectedProduct} onSelect={setSelectedProduct} />
      ))}
    </div>
  );
}

// ========================
// 2. Referential stability for React.memo child
// ========================
const ExpensiveChart = React.memo(function ExpensiveChart({
  config,
}: {
  config: ChartConfig;
}) {
  // Expensive initialization — only re-runs when config reference changes
  return <canvas id="chart" />;
});

function Dashboard({ data, theme }: { data: DataPoint[]; theme: 'light' | 'dark' }) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  // ✅ config gets a stable reference — only changes when data or theme changes
  const config = useMemo<ChartConfig>(() => ({
    data,
    colors: theme === 'dark' ? ['#fff', '#aaa'] : ['#333', '#666'],
    responsive: true,
    animation: { duration: 300 },
  }), [data, theme]);

  return (
    <div>
      <ExpensiveChart config={config} />
      {/* tooltip state changes don't create new config → ExpensiveChart bails out */}
      {tooltip && <div className="tooltip">{tooltip}</div>}
    </div>
  );
}

// ========================
// 3. Referential stability for useEffect deps
// ========================
function useAPI(params: APIParams) {
  const [data, setData] = useState<APIResponse | null>(null);

  // ✅ Stable params reference — effect only re-runs when params values change
  // Without this useMemo: params is new object every render → effect re-runs every render
  const stableParams = useMemo(() => params, [params.endpoint, params.filters, params.page]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAPI(stableParams, controller.signal).then(setData);
    return () => controller.abort();
  }, [stableParams]);  // stable reference → only re-fetches when values change

  return data;
}

// ========================
// 4. Contrast: when useMemo is wasteful
// ========================
function SimpleListItem({ name, price, discount }: {
  name: string;
  price: number;
  discount: number;
}) {
  // ❌ Overkill — these are immediate arithmetic on primitives
  const finalPrice = useMemo(() => price * (1 - discount / 100), [price, discount]);
  const displayName = useMemo(() => name.trim().toUpperCase(), [name]);

  // ✅ Just compute inline — takes <0.001ms, no stability concerns
  const finalPriceSimple = price * (1 - discount / 100);
  const displayNameSimple = name.trim().toUpperCase();

  return (
    <div>
      <span>{displayNameSimple}</span>
      <span>${finalPriceSimple.toFixed(2)}</span>
    </div>
  );
}

// ========================
// 5. Breaking memoization: unstable deps trap
// ========================
function SortedMemoDemo({ items }: { items: Item[] }) {
  // ❌ comparator is new every render → useMemo runs every render
  // const comparator = (a: Item, b: Item) => a.value - b.value;  // inline
  // const sorted = useMemo(() => [...items].sort(comparator), [items, comparator]);

  // ✅ comparator is defined outside component — stable module reference
  const sorted = useMemo(() => [...items].sort(compareItemsByValue), [items]);
  // Only re-sorts when items reference changes — correct

  return <ul>{sorted.map(i => <li key={i.id}>{i.value}</li>)}</ul>;
}

// Module-level comparator — stable across renders
const compareItemsByValue = (a: Item, b: Item) => a.value - b.value;

// Type helpers
interface ChartConfig { data: DataPoint[]; colors: string[]; responsive: boolean; animation: { duration: number }; }
interface DataPoint { x: number; y: number; }
interface APIParams { endpoint: string; filters: string; page: number; }
interface APIResponse { results: unknown[]; total: number; }
interface Item { id: string; value: number; }
declare function ProductCard(props: { product: Product; selected: boolean; onSelect: (id: string) => void }): JSX.Element;
declare function fetchAPI(params: APIParams, signal: AbortSignal): Promise<APIResponse>;
```

---

## 🧠 6. Memory Aid

**Mental Model:** `useMemo` is a smart calculator that saves its last answer and the inputs it used. If you ask the same question with the same inputs, it gives the saved answer instantly. If any input changed, it recalculates. The overhead: every time you ask, it checks all the inputs against the saved ones — even if the answer would have been trivially fast to compute.

**If you go blank:** "Caches computed value. Two use cases: expensive computation (profile first), referential stability (needed for React.memo / effect deps). Anti-pattern: wrapping trivial ops — useMemo overhead exceeds savings."

**Mnemonic:** **EPR** — **E**xpensive computation (profile first), **P**rop referential stability (for React.memo children), **R**ule: never memo trivial ops.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance: The right `useMemo` on an expensive computation that runs frequently eliminates perceptible jank; the wrong `useMemo` on trivial computations adds overhead with no benefit — negative optimization
→ Correctness: Referential stability via `useMemo` is the difference between a `React.memo` bailout working or being useless; this is often a more impactful use case than computation cost
→ Code quality: Reflexive `useMemo` everywhere is a code smell indicating the developer doesn't understand what actually causes re-renders; selective, justified `useMemo` indicates deep understanding of React's rendering model

**How it works (3 sentences):**
`useMemo` stores both the factory function's result and the deps array on the fiber's hook linked list; on each render, it shallow-compares new deps against stored deps via `Object.is` for each element — if all match, the stored result is returned without calling the factory; if any changed, the factory is re-called and the new result (and new deps) are stored. The computation savings come from avoiding expensive re-execution; the referential stability benefits come from the fact that if deps haven't changed, the returned value is literally the same object reference as the previous render — enabling `React.memo`'s shallow comparison and `useEffect`'s dep comparison to correctly identify "nothing changed here." The cost of `useMemo` is always nonzero — closure allocation, array allocation, and `Object.is` comparisons per dep per render — making it a trade-off that only pays off when the factory is computationally more expensive than the memoization overhead or when referential stability provides downstream bailout benefits.

**Company relevance:**
- Microsoft: Excel Online formula parsing — `useMemo` on formula parse tree with `[formulaString]` deps; formula parsing is complex (~10ms for VLOOKUP); memoization ensures the formula tree is only recomputed when the formula actually changes, not on cell selection or cursor movement
- Adobe: XD design spec panel — `useMemo` on design token extraction from selected element; extracting tokens from complex component trees takes ~20ms; memoized with `[selectedElementId, designSystem]` deps — unrelated panel re-renders (hover states, scroll) skip the extraction
- Salesforce: Flow Builder connector routing — `useMemo` on edge path computation (SVG bezier curves) with `[nodes, connections]` deps; computing 200+ edge paths takes 50ms; node hover/selection changes trigger renders but shouldn't recompute all paths
- Cisco: Config compliance report — `useMemo` on compliance rule evaluation against 5,000 config entries with `[config, rules]` deps; evaluation takes 200ms; only re-runs when the config or rules change, not when the user scrolls or searches within the report

---
✅ Topic 90/486 complete → Continuing to Topic 91: useCallback — Referential Stability, Common Misuse
