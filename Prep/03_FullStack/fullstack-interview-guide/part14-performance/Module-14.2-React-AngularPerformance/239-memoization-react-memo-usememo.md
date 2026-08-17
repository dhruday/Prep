# Memoization — React.memo, useMemo, useCallback
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Three memoization tools in React**: `React.memo(Component)` — prevents re-render when parent re-renders but props haven't changed; `useMemo(() => expensiveVal, [deps])` — caches a computed value, recalculates only when deps change; `useCallback(fn, [deps])` — caches a function reference so it doesn't change on every render
- **When to use `React.memo`**: pure components that render often but receive stable props — large list items, chart rows, expensive static layouts; useless if the wrapped component receives new object/array props on every parent render (object equality check will always fail for `{}` === `{}`)
- **When to use `useMemo`**: genuinely expensive computations (filtering/sorting 1000+ items, complex math); when a computed value is used as a dependency of `useEffect` or passed as a prop to a memoized child — stabilizing the reference; NOT for "just in case" — `useMemo` itself has overhead (memory allocation, dependency comparison on every render)
- **When to use `useCallback`**: when passing a callback to a `React.memo`-wrapped child (without `useCallback`, the function is recreated each render = the memo is bypassed); when a function is a `useEffect` dependency (without `useCallback`, the effect re-runs on every render); same rule applies: overhead is real, only use where it prevents actual unnecessary work
- **The trap**: all three are WRONG when the wrapped computation/render is cheap and the memoization overhead exceeds the savings; over-memoization makes code harder to read with no performance benefit
- ✅ **Hruday's anchor**: SAP product catalog — 200+ product card grid was re-rendering every card on each filter change (Redux state update); wrapped `ProductCard` in `React.memo` + stabilized the `onAddToCart` callback with `useCallback` + memoized the filtered product list with `useMemo`; React DevTools Profiler showed 0 wasted renders per filter change (previously 200 wasted renders)

---

## 1. One-Line Definition
React's three memoization hooks let you escape React's default "re-render everything on any state change" behavior by caching component renders (`React.memo`), computed values (`useMemo`), and function references (`useCallback`) — so React skips work when inputs haven't changed.

---

## 2. The Problem It Solves

React's default behavior: when state changes in a component, React re-renders that component AND all its children, all the way down the tree. This is the simplest possible behavior, and for most small components it's fine because React's virtual DOM diffing is fast.

The problem appears at scale:

**Scenario 1 — Large list**: a product grid with 200 `ProductCard` components. The user changes a global filter stored in Redux. Redux triggers a re-render of the parent `ProductGrid`. By default, all 200 `ProductCard` components re-render — even if none of their props changed. If each card takes 2ms to render: 200 cards × 2ms = 400ms. The filter interaction feels sluggish. INP suffers.

**Scenario 2 — Expensive computation**: a dashboard that displays filtered, sorted, and grouped sales data. The data transformation (`products.filter(...).sort(...).reduce(...)`) runs on 10,000 items. It takes 300ms. It runs on every render — including renders triggered by unrelated state changes (like a tooltip opening). The user experiences a freeze whenever anything in the parent tree re-renders.

**Scenario 3 — Reference instability**: a `useEffect` that re-runs on every render because a callback dependency is recreated each time. Memory and network resources consumed for no reason.

`React.memo`, `useMemo`, and `useCallback` solve all three scenarios by making React say "I've seen these exact inputs before — skip the work."

At SAP, all three tools were needed together. The grid rendered 200+ product cards on filter changes. `React.memo` on the card prevented the 199 unchanged cards from re-rendering. `useMemo` on the filter computation prevented recalculating on unrelated state changes. `useCallback` on `onAddToCart` prevented the memo from being bypassed by an unstable function reference.

---

## 3. How It Works Internally

### React's Default Re-render Behavior

```
Without memoization:

  App state changes (e.g., tooltip opens)
       │
       ▼
  App re-renders
  │
  ├── Header re-renders (no dependencies on App state → pointless)
  │
  └── ProductGrid re-renders (subscribes to Redux products state — needed)
      ├── ProductCard[0] re-renders (props unchanged → WASTED)
      ├── ProductCard[1] re-renders (props unchanged → WASTED)
      ├── ...
      └── ProductCard[199] re-renders (props unchanged → WASTED)

React's virtual DOM diffing prevents ACTUAL DOM updates for unchanged cards,
but the JavaScript function execution (React.createElement calls, hooks)
still runs for all 200 components. At 200 components × 2ms each = 400ms main thread blocked.
```

### How React.memo Works

```
React.memo shallow-compares props between renders:

  Previous render: ProductCard({ id: 1, name: "Shoes", price: 299 })
  Current render:  ProductCard({ id: 1, name: "Shoes", price: 299 })
  
  Comparison: every prop is shallow-equal (===)
  → Result: SKIP the re-render. Return the cached render output.

What breaks React.memo (reference inequality):

  Parent renders:
    const handler = () => addToCart(product);  // ← new function every render
    return <ProductCard onClick={handler} ... />
  
  Previous render: ProductCard({ onClick: [Function A], name: "Shoes" })
  Current render:  ProductCard({ onClick: [Function B], name: "Shoes" })
  ← onClick is a different function reference even though it does the same thing!
  
  Comparison: onClick fails === check (different object reference)
  → Result: RE-RENDER (memo is bypassed — useCallback needed to fix this)
```

### How useMemo Works

```
useMemo(() => compute(), [deps]):

  First render:
    - calls compute()
    - stores result in React's internal memo table
    - returns result
  
  Subsequent renders:
    - compares current deps with previous deps (shallow comparison)
    - if deps equal: returns stored result (NO re-computation)
    - if deps changed: calls compute() again, stores new result

  overhead:
    - memory: stores previous deps + previous result
    - CPU: shallow comparison of deps array on every render
    
  Worth it when:
    compute() costs > comparison cost (typically compute > 1-2ms)
  
  NOT worth it when:
    compute() is fast (< 0.1ms) — the overhead exceeds the savings
    deps change on every render anyway — memo is never hit
```

---

## 4. The Code

### Wrong Way — Memoization Pitfalls

```tsx
// ❌ WRONG — React.memo bypassed by new object reference on every render

const ProductCard = React.memo(({ product, onAddToCart }: {
  product: Product;
  onAddToCart: (id: string) => void;
}) => {
  console.log('Rendering:', product.id);
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
    </div>
  );
});

const ProductGrid = () => {
  const products = useSelector(selectProducts);
  const dispatch = useDispatch();

  // ❌ New function created on every ProductGrid render
  // Every ProductCard receives a different onAddToCart reference each time
  // React.memo's shallow comparison: [Function A] !== [Function B] → RE-RENDER
  // The memo on ProductCard is completely useless
  const handleAddToCart = (id: string) => {
    dispatch(addToCartAction(id));  // ← same behavior, different reference
  };

  // ❌ New array reference on every render (even if products haven't changed)
  // If passed to a memoized child as a prop, the child re-renders every time
  const premiumProducts = products.filter(p => p.isPremium);  // new [] each render

  return (
    <div>
      {premiumProducts.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          onAddToCart={handleAddToCart}  // ← unstable reference kills memo
        />
      ))}
    </div>
  );
};
```

```tsx
// ❌ WRONG — useMemo with deps that change every render (memoization never hits)

const DataComponent = ({ user }: { user: User }) => {
  // ❌ user is a new object on every parent re-render (reference changes)
  // deps: [user] changes every render → useMemo NEVER serves cached value
  // This adds useMemo overhead (comparison) with zero benefit
  const userName = useMemo(() => user.name.toUpperCase(), [user]);
  
  // ❌ useMemo on a trivial calculation (toUpperCase): no benefit
  // The comparison cost of useMemo is HIGHER than calling .toUpperCase()
  // This is pure overhead with no performance gain
  
  return <h1>{userName}</h1>;
};

// ❌ WRONG — useCallback where no child memoization benefits from it
const SimpleCounter = () => {
  const [count, setCount] = useState(0);

  // ❌ useCallback here adds overhead but saves nothing:
  // no memoized child receives this function,
  // no useEffect uses this as a dependency
  const increment = useCallback(() => setCount(c => c + 1), []);
  
  return <button onClick={increment}>{count}</button>;
};
```

### Right Way — All Three Tools Used Correctly

```tsx
// ✅ RIGHT — React.memo + useCallback + useMemo working together

// ✅ ProductCard wrapped in React.memo: only re-renders when props change
const ProductCard = React.memo(({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (id: string) => void;
}) => {
  // This only runs when product or onAddToCart REFERENCE changes
  return (
    <article className="product-card">
      <img src={product.imageUrl} alt={product.name} width={200} height={200} loading="lazy" />
      <h3>{product.name}</h3>
      <p>₹{product.price.toLocaleString('en-IN')}</p>
      <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
    </article>
  );
});

// ✅ Custom comparison function: React.memo uses shallow comparison by default
// Use a custom comparator when default shallow comparison is too aggressive or not enough
const ProductCardWithCustomMemo = React.memo(
  ({ product, isHighlighted }: { product: Product; isHighlighted: boolean }) => {
    return <div className={isHighlighted ? 'highlighted' : ''}>{product.name}</div>;
  },
  // ✅ Custom equality: only re-render if id, name, price, or isHighlighted changes
  // Ignores changes to other product fields (imageUrl, description, etc.)
  (prevProps, nextProps) =>
    prevProps.product.id          === nextProps.product.id &&
    prevProps.product.name        === nextProps.product.name &&
    prevProps.product.price       === nextProps.product.price &&
    prevProps.isHighlighted       === nextProps.isHighlighted
);

const ProductGrid: React.FC = () => {
  const dispatch = useDispatch();
  
  // ✅ useSelector with fine-grained selectors: only re-render when products change
  // NOT when other parts of the store change
  const products    = useSelector(selectAllProducts);
  const activeFilter = useSelector(selectActiveFilter);

  // ✅ useMemo: memoize the filtered product list
  // Only recalculates when products or activeFilter changes
  // With 1000 products, .filter() might take 5-10ms — worth memoizing
  const filteredProducts = useMemo(
    () => products.filter(p => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'premium') return p.isPremium;
      if (activeFilter === 'sale') return p.discountPercent > 0;
      return p.category === activeFilter;
    }),
    [products, activeFilter]  // ← only recalculate when these change
  );

  // ✅ useCallback: stable reference for the callback passed to React.memo children
  // Without this, every ProductGrid render creates a new handleAddToCart function
  // → React.memo on ProductCard sees new prop → re-renders all 200 cards anyway
  const handleAddToCart = useCallback(
    (productId: string) => {
      dispatch(addToCartAction(productId));
    },
    [dispatch]  // ← dispatch from useDispatch is stable (same reference forever)
  );

  return (
    <div className="product-grid">
      {filteredProducts.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}  // ← stable reference: React.memo works correctly
        />
      ))}
    </div>
  );
};
```

```tsx
// ✅ RIGHT — useMemo for expensive derived data with selectors

import { useMemo } from 'react';

interface SalesDashboardProps {
  orders: Order[];
  dateRange: [Date, Date];
  groupBy: 'day' | 'week' | 'month';
}

const SalesDashboard: React.FC<SalesDashboardProps> = ({
  orders,
  dateRange,
  groupBy,
}) => {
  // ✅ useMemo for genuinely expensive computation:
  // - Filter 10,000 orders by date range
  // - Group by time period
  // - Calculate aggregates per group
  // ~50-100ms computation on large datasets — definitely worth memoizing
  const chartData = useMemo(() => {
    const [startDate, endDate] = dateRange;
    
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    // Group and aggregate
    const groups = new Map<string, { revenue: number; count: number }>();
    for (const order of filteredOrders) {
      const key = formatGroupKey(order.createdAt, groupBy);
      const existing = groups.get(key) ?? { revenue: 0, count: 0 };
      groups.set(key, {
        revenue: existing.revenue + order.totalAmount,
        count: existing.count + 1,
      });
    }
    
    return Array.from(groups.entries()).map(([period, stats]) => ({
      period,
      ...stats,
    }));
  }, [orders, dateRange, groupBy]);
  // ↑ Deps: recalculate only when orders, dateRange, or groupBy change
  //   If only a tooltip opens elsewhere in the parent tree → NO recalculation

  return <BarChart data={chartData} />;
};
```

### React DevTools Profiler Usage

```
// ✅ RIGHT — How to find wasted renders with React DevTools Profiler

Steps to profile:
1. Open Chrome DevTools → React DevTools tab → Profiler
2. Click "Record" (circle button)
3. Perform the interaction (apply filter, click button)
4. Click "Record" again to stop
5. In the flame chart, look for components highlighted in yellow/red
   - Yellow: component re-rendered (may or may not be wasted)
   - Gray: component did NOT re-render (memoization worked ✅)

Look for:
- Components that re-rendered when their props DID NOT change → wasted render
  (hovering shows "Why did this render?" in React DevTools 4+)
- In the "Ranked" view: sorted by self render time — find the most expensive components first

"Why did this render?" messages to watch for:
  - "Props changed: onClick" → useCallback missing on parent
  - "Props changed: style" → inline style object created each render → useMemo
  - "Parent re-render" → React.memo not applied or deps are unstable

// ✅ Add displayName for better profiler output (otherwise components show as "React.memo(Component)")
ProductCard.displayName = 'ProductCard';
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between useMemo and useCallback?"

**Hruday's answer:**
> Both `useMemo` and `useCallback` memoize values to prevent unnecessary recalculation on re-renders, but they memoize different things.
>
> `useMemo(() => compute(), [deps])` memoizes the RESULT of a function call — a value. Use it for expensive computations: filtering 10,000 items, building a sorted list, computing derived chart data. It returns the cached result on subsequent renders unless the deps change.
>
> `useCallback(fn, [deps])` memoizes the FUNCTION ITSELF — the function reference. It returns the same function object between renders as long as deps don't change. Use it when you pass a callback to a `React.memo`-wrapped child (if the function reference changes every render, the memo is bypassed), or when a function is a `useEffect` dependency (if it changes every render, the effect re-runs every render).
>
> The relationship: `useCallback(fn, deps)` is exactly equivalent to `useMemo(() => fn, deps)`. They're both memoization — `useCallback` just has cleaner syntax for the specific case of memoizing a function.
>
> The critical point about both: they have overhead. Don't use them defensively "just in case." Use them when you can identify a specific wasted render or re-computation that they will prevent. React DevTools Profiler is the right tool to find those cases — don't guess.

---

### Q2 — SAP Experience Deep Dive
**Interviewer asks:** "Tell me about a case where memoization made a measurable performance difference."

**Hruday's answer:**
> The clearest example was the SAP product catalog grid with 200+ product cards. The problem showed up when we added a filter feature. Users would click a filter (e.g., "Show only premium products") and the UI would freeze for about 600ms before updating.
>
> I used React DevTools Profiler to identify the cause. The profiler showed that all 200 ProductCard components were re-rendering on every filter change — even the cards that would remain in the filtered result and whose props hadn't changed at all. 200 card re-renders × 3ms each = 600ms of React work per filter click.
>
> The fix had three parts. First: `React.memo` on `ProductCard` to prevent re-renders when props haven't changed. Second: `useCallback` on the `handleAddToCart` function in the parent `ProductGrid` — without this, every grid render created a new function reference, and React.memo's prop comparison would see `onclick !== onclick` and re-render every card anyway. Third: `useMemo` on the filtered products list — the filter computation ran in a loop over 1,200 products and was running even when the user interacted with completely unrelated Redux state (like opening a notification).
>
> After the changes: React DevTools Profiler showed 0 wasted renders per filter interaction. The 200 unchanged ProductCard components all showed gray (skipped) in the profiler flame chart. The filter interaction dropped from 600ms to under 30ms.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you NOT use React.memo even for a heavy component?"

**Hruday's answer:**
> There are three cases where React.memo shouldn't be applied.
>
> First: when the component props change on every parent render anyway. If the parent creates a new object or array prop each render — `<Card style={{ color: 'red' }} />` — the memo's shallow comparison will ALWAYS fail because `{ color: 'red' } !== { color: 'red' }` (object reference inequality). The memo prevents zero re-renders but adds comparison overhead on every render. The fix isn't React.memo — it's stabilizing the prop with `useMemo` or `useCallback` in the parent.
>
> Second: when the component is genuinely cheap to re-render (< 1ms). React.memo has its own overhead — the shallow prop comparison. For tiny components like a single `<span>` formatter, that overhead can exceed the render cost. Wrapping cheap components in React.memo makes the profiler look clean (less yellow) but can actually slow things down at scale.
>
> Third: when the component always receives new props because its contents are dynamic. A real-time chart component that receives a new data point every 100ms should NOT be memoized — it should always update. Memoizing it just adds the overhead of prop comparison that always fails.
>
> The rule: profile first, then add React.memo, then verify with the profiler that it prevented actual wasted renders. Don't apply it pre-emptively — it can hide prop instability bugs that you should fix instead.

---

### Q4 — System Design Angle
**Interviewer asks:** "You have a large data-heavy dashboard with 50+ re-rendering components. How do you systematically find and fix the performance issues?"

**Hruday's answer:**
> I'd follow a four-step process: measure, identify, fix, verify — never guess.
>
> Step 1 — Measure: open React DevTools Profiler, record the slowest user interaction (the one users complain about). Note the total interaction time. Take a screenshot of the flame chart.
>
> Step 2 — Identify: in the Profiler's "Ranked" view, sort components by self render time. The top 5 components are my targets. For each, check "Why did this render?" — the Profiler's tooltip shows whether it was due to own state change, parent re-render, or context value change. Wasted renders are those caused by parent re-renders where the component's relevant props didn't actually change.
>
> Step 3 — Fix, in order: first stabilize unstable prop references (this is usually the cause — inline objects/functions passed as props). Use `useMemo` for object/array props, `useCallback` for function props. Then wrap the target components in `React.memo`. For expensive computations, add `useMemo` at the source.
>
> Step 4 — Verify: re-run the Profiler after each change. Confirm that wasted renders (yellow components whose props didn't change) have been eliminated. If a component still re-renders in gray but the interaction is still slow, the issue is genuine render work, not wasted renders — different problem (virtualization or async rendering via `useTransition` may be more appropriate).
>
> The anti-pattern to avoid: adding `React.memo` to every component in the tree without profiling. This creates dead weight (memory + comparison overhead) in components that weren't wasting work, and it introduces subtle bugs when prop comparison is too shallow (deep nested object changes not detected).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "React.memo prevents all re-renders" | "`React.memo` guarantees the component won't re-render unless it has to" | React.memo uses SHALLOW comparison — it compares each prop with `===`; for primitive props (strings, numbers, booleans), === works perfectly; for objects, arrays, and functions, === compares REFERENCES not contents: `{} !== {}` even if the shape is identical; a parent that creates new object/array/function props each render will ALWAYS fail the shallow comparison → React.memo is bypassed completely; the fix is to stabilize those props with `useMemo`/`useCallback` in the parent before wrapping the child with `React.memo` |
| "useMemo for every derived value" | "I always use useMemo to compute derived state" | useMemo has real overhead: memory (stores previous deps + result), CPU (shallow comparison runs every render), and cognitive overhead (more complex code); for simple derivations like `user.name.toUpperCase()` or `items.length > 0`, the useMemo comparison cost EXCEEDS the computation cost; the React team explicitly warns against over-using useMemo (the upcoming React Compiler will handle memoization automatically in many cases); use useMemo only when: computation takes > 1-2ms, result is used as a dep of useEffect, OR result is a reference type passed to a memoized child component |
| "useCallback on all event handlers" | "I wrap every event handler in useCallback for safety" | useCallback adds memory overhead and makes code more complex; wrapping event handlers in useCallback is only valuable when the handler is passed to a memoized child OR used as a useEffect dep; button click handlers in the same component that owns the state (`const increment = useCallback(() => setCount(c => c + 1), [])`) gain nothing from useCallback unless that handler is also passed to a `React.memo` child; adding useCallback everywhere is premature optimization that costs code clarity for zero performance benefit |

---

## 7. Hruday's Real Experience Hook
> "The most important lesson from the SAP memoization work was that React.memo alone is not enough — it's a system. All three tools have to work together, or the performance gain doesn't materialize.
>
> We added `React.memo` to `ProductCard` first. The profiler still showed 200 card re-renders. I was confused — the memo should have prevented them. Then I hovered over a re-rendering card in the profiler and saw 'Why did this render? Props changed: onAddToCart.' The `onAddToCart` function was being created inside the render body of `ProductGrid` on every render — a new function reference each time. React.memo saw a different function reference and re-rendered the card.
>
> Adding `useCallback` to `handleAddToCart` fixed it. Now the profiler showed all 200 cards as gray (skipped) for the filter interaction. The interaction time dropped from 600ms to 26ms.
>
> The three-part recipe: React.memo on the expensive child, useCallback for function props, useMemo for object/array props. Remove any one of them and the others might not work. That's why I always profile after adding memoization — to verify the memo is actually being hit."

---

## 8. Scale Evolution

**Small app (< 50 components) →** Don't memoize preemptively; only add `React.memo` when Profiler shows a specific wasted render; React's default reconciliation is fast enough for 50 components.

**Medium app (50-200 components) →** Apply `React.memo` to list items that render many times; use `useMemo` for expensive filters/sorts in list parents; use `useCallback` for event handlers passed to memoized children; profile before and after each optimization.

**Large app (SAP scale, 200+ components in view) →** Consider React Query / TanStack Query for fine-grained server state (avoids triggering global re-renders on cache updates); Redux Toolkit with `createSelector` (Reselect) for memoized selectors — prevents re-renders on unrelated store changes; `useTransition` / `useDeferredValue` for deprioritizing heavy renders; React DevTools Profiler as a standard part of PR review for performance-critical features.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction list with real-time updates — rows updating as transactions complete; memoizing individual rows prevents entire list from re-rendering when one transaction updates; complex filter/sort on merchant dashboard with large datasets | List item memoization for real-time data; useMemo for financial aggregation computations; React DevTools profiling workflow |
| Swiggy / Meesho | Product grid with 100+ items; filter and sort operations frequent in catalog browsing; seller dashboard with multiple data grids; cart with many items having independent state | Large grid memoization; filter operation memoization; cart item memo patterns |
| Adobe / Microsoft | Creative Cloud tool panels with expensive rendering (canvas-based, SVG manipulation); Teams meeting participant list with real-time status updates; Microsoft 365 collaborative doc editors with concurrent updates | Complex component tree optimization; custom React.memo equality functions; memoization in real-time collaborative contexts |
| SAP Labs | Direct experience: 200+ card grid; 0 wasted renders after React.memo + useCallback + useMemo; React DevTools Profiler workflow; useMemo for filter computation; `createSelector` with Redux Toolkit for store selectors; taught pattern to team | Specific wasted render story; all three tools working together; profiler-driven workflow |

---

## 10. Related Topics — What to Study Next

- **Topic 242 — Avoiding Unnecessary Re-renders** — the broader topic that covers React.memo, but also covers Context placement, state collocation, and Angular OnPush; this topic gives the full picture of re-render prevention strategies across both frameworks
- **Topic 240 — Angular OnPush + trackBy** — the Angular equivalent of React.memo; `ChangeDetectionStrategy.OnPush` prevents the Angular change detection cycle from processing components when their inputs haven't changed; the same principle applies, different mechanics
- **Topic 241 — Virtual Scrolling** — the complementary optimization for large lists; React.memo reduces the COST of each item re-render; virtual scrolling reduces the NUMBER of items rendered; both are needed for a truly smooth large list experience
- **Topic 243 — Main Thread Scheduling and INP** — after eliminating wasted renders with memoization, the next layer is the main thread scheduling optimizations (`useTransition`, `useDeferredValue`, `scheduler.yield()`) that keep the UI responsive during the renders that DO need to happen

---

*Part 14 · Memoization — React.memo, useMemo, useCallback · Full Stack Interview Guide · Hruday D · 2026*
