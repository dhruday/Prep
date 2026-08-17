# All React Hooks — Complete Reference
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **useState**: local component state; `[value, setter]`; setter triggers re-render; functional update form `setState(prev => prev + 1)` for state that depends on previous value
- **useReducer**: complex state logic (multiple sub-values, transitions dependent on previous state); same as Redux reducer — `(state, action) => newState`; prefer over `useState` when next state depends on complex logic, not just a value swap
- **useEffect**: side effects (data fetching, subscriptions, DOM manipulation); runs AFTER paint (asynchronous); ALWAYS return a cleanup function for subscriptions/timers; `[]` dep array = run once on mount; `[dep]` = run when dep changes; NO dep array = run after every render (usually wrong)
- **useLayoutEffect**: same as `useEffect` but runs SYNCHRONOUSLY after DOM mutations, BEFORE paint; use ONLY for DOM measurements or mutations that would cause visible flash if done after paint
- **useRef**: mutable container that persists across renders WITHOUT triggering re-render; `ref.current` is the mutable value; use for: DOM element references, storing previous values, storing timers/subscriptions
- **useMemo**: memoises an expensive COMPUTED VALUE; `useMemo(() => expensiveCalc(a, b), [a, b])`; only recomputes when deps change; use for: expensive derivations, stabilising object/array references passed to memo'd children
- **useCallback**: memoises a FUNCTION REFERENCE; `useCallback(fn, [deps])`; the stabilised function reference prevents re-renders of children that receive the function as a prop (works with React.memo)
- **useContext**: consumes a React Context; triggers re-render when context value changes; separate context objects for frequently vs infrequently changing values
- **useId**: generate unique IDs that are stable across server and client (critical for SSR/hydration); for form `htmlFor`/`id` pairing, ARIA label anchoring
- **useTransition** (React 18): mark non-urgent state updates; React will interrupt those renders for urgent interactions; returns `[isPending, startTransition]`

---

## 1. One-Line Definition
React hooks are functions that let function components opt into React features (state, side effects, context, refs, memoization) — they replace class component lifecycle methods with composable, testable functions that declare dependencies explicitly and co-locate related logic.

---

## 2. The Problem It Solves

Before hooks: stateful logic lived in class components. Side effects lived in `componentDidMount`, `componentDidUpdate`, and `componentWillUnmount` — split across three lifecycle methods. Code that logically belonged together (subscribe to a WebSocket on mount, unsubscribe on unmount) was physically separated. Testing required mounting the component. Sharing stateful logic required render props or higher-order components (wrappers that grew into deep "wrapper hell").

After hooks: the same subscription logic is in one `useEffect` with a cleanup function. Related code is co-located. Logic is extracted into custom hooks and shared across components without any component hierarchy changes. Tests can import and call the hook directly (with `renderHook`). The component tree is flat.

---

## 3. How Each Hook Works — Internal Model + When to Use

### useState

```typescript
// Internal model: useState stores state in the Fiber's memoizedState linked list
// Each useState call occupies one slot in the list (order is identity)
// This is WHY hooks can't be called in loops/conditionals — the list order must match

const [count, setCount] = useState(0);
const [user, setUser] = useState<User | null>(null);
// Fiber.memoizedState: { state: 0, next: { state: null, next: null } }

// ✅ Functional update: use when next state depends on previous
// Avoids stale closure capturing an old 'count' value
setCount(prev => prev + 1);

// ❌ Direct setter with stale closure:
const handleBurst = () => {
  // Both setTimeout callbacks close over the SAME 'count' value (0 at call time)
  setTimeout(() => setCount(count + 1), 100); // sets to 1
  setTimeout(() => setCount(count + 1), 200); // also sets to 1 (NOT 2!)
};

// ✅ Functional update form avoids stale closure:
const handleBurstFixed = () => {
  setTimeout(() => setCount(prev => prev + 1), 100); // 0 → 1
  setTimeout(() => setCount(prev => prev + 1), 200); // 1 → 2 ✓
};

// ✅ Lazy initial state: function form avoids re-running expensive init
const [processedData, setProcessedData] = useState(
  () => processCsvData(rawData) // runs once at mount, not every render
);
```

### useReducer

```typescript
// Use when: state has multiple sub-fields, transitions follow defined rules,
//           or next state depends on complex logic

type CartState = { items: CartItem[]; total: number; discount: number; };
type CartAction = 
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'APPLY_DISCOUNT'; code: string };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      const newItems = [...state.items, action.item];
      return {
        ...state,
        items: newItems,
        total: newItems.reduce((sum, item) => sum + item.price, 0)
      };
    case 'REMOVE_ITEM':
      const remaining = state.items.filter(i => i.id !== action.id);
      return { ...state, items: remaining, total: remaining.reduce(...) };
    case 'APPLY_DISCOUNT':
      // Discount logic: complex state transition, clear in reducer, messy in useState
      return { ...state, discount: lookupDiscount(action.code) };
  }
}

function CartComponent() {
  const [cartState, dispatch] = useReducer(cartReducer, { items: [], total: 0, discount: 0 });
  
  return (
    <div>
      <ProductList onAdd={(item) => dispatch({ type: 'ADD_ITEM', item })} />
      {/* Actions are descriptive (ADD_ITEM) vs imperative setters */}
    </div>
  );
}
```

### useEffect — Complete Pattern

```typescript
// CLEANUP is critical. Every subscription, timer, or external listener MUST be cleaned up.

function UserStatusTracker({ userId }: { userId: string }) {
  const [status, setStatus] = useState<string>('loading');
  
  useEffect(() => {
    // SETUP: subscribe when userId changes
    const subscription = userStatusSocket.subscribe(userId, (newStatus) => {
      setStatus(newStatus);
    });
    
    // CLEANUP: function returned from useEffect runs:
    //   1. Before the effect runs again (when userId changes)
    //   2. When the component unmounts
    return () => {
      subscription.unsubscribe(); // ← CRITICAL: memory leak if missing
    };
  }, [userId]); // Re-subscribe when userId changes
  
  return <StatusBadge status={status} />;
}

// ✅ Data fetching in useEffect — with AbortController for cleanup
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const controller = new AbortController();
    
    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setUser(data); // Only updates state if component still mounted
      })
      .catch(err => {
        if (err.name !== 'AbortError') throw err; // Ignore abort errors
      });
    
    return () => controller.abort(); // Cancels in-flight request on unmount/userId change
    // Without this: if userId changes quickly, two requests are in flight
    // The slower first request could set stale data AFTER the second completes
  }, [userId]);
  
  return user ? <Profile user={user} /> : <Spinner />;
}
```

### useRef — Three Distinct Use Cases

```typescript
// Use Case 1: DOM Element Reference
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    inputRef.current?.focus(); // Direct DOM API access
  }, []);
  
  return <input ref={inputRef} />;
}

// Use Case 2: Previous Value (without re-rendering)
function TrackPreviousValue<T>(value: T) {
  const prevRef = useRef<T>(value);
  
  useEffect(() => {
    prevRef.current = value; // Update AFTER render, so prevRef holds previous render's value
  });
  
  return prevRef.current; // Returns value from LAST render
}

// Use Case 3: Timer/Subscription ID (mutable, no re-render needed)
function DebounceSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const timerRef = useRef<number | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timerRef.current) clearTimeout(timerRef.current); // Cancel previous timer
    timerRef.current = setTimeout(() => {
      onSearch(e.target.value);
    }, 300);
    // ✅ Storing timer ID in ref avoids re-renders on every keystroke
    // ✅ Cleanup on unmount:
  };
  
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  
  return <input onChange={handleChange} />;
}
```

### useMemo and useCallback

```typescript
// useMemo: expensive computed value
function AnalyticsDashboard({ orders, dateRange }: Props) {
  // ❌ Without useMemo: recomputes on EVERY render (even if orders/dateRange unchanged)
  // const stats = computeOrderStats(orders, dateRange); // expensive: 50ms+ on large datasets
  
  // ✅ With useMemo: only recomputes when orders or dateRange changes
  const stats = useMemo(
    () => computeOrderStats(orders, dateRange),
    [orders, dateRange] // deps: recompute only when these change
  );
  
  // ✅ Also use useMemo to stabilise object/array references for memo'd children:
  const filterConfig = useMemo(
    () => ({ categories: ['electronics', 'clothing'], minPrice: 100 }),
    [] // Empty deps: same object reference on every render
    // Without this: new object literal every render → FilterPanel always re-renders
    // even with React.memo (shallow compare sees different object reference)
  );
  
  return <FilterPanel config={filterConfig} stats={stats} />;
}

// useCallback: stable function reference
function ParentComponent({ userId }: { userId: string }) {
  // ❌ Without useCallback: new function instance on every render
  // Breaks React.memo on child (new function reference = "prop changed = re-render")
  // const handleClick = (id: string) => deleteItem(userId, id);
  
  // ✅ useCallback: same function reference as long as userId doesn't change
  const handleDelete = useCallback(
    (itemId: string) => deleteItem(userId, itemId),
    [userId] // Recreate only when userId changes
  );
  
  return <ItemList onDelete={handleDelete} />;
}

// ⚠️ Common mistake: over-memoizing
// NOT everything needs useMemo/useCallback:
// ✅ Use when: expensive computation, preventing expensive child re-renders
// ❌ Skip when: simple values/functions, no memo'd children, premature optimization
```

### useContext

```typescript
// Pattern: Separate contexts by update frequency to avoid unnecessary re-renders

// Slow-changing context: theme, locale (won't cause frequent re-renders)
const ThemeContext = createContext<Theme>({ mode: 'light', primary: '#0070f3' });

// Fast-changing context (user interaction): KEEP SEPARATE from slow context
const CartContext = createContext<CartContextType>({ items: [], dispatch: () => {} });

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>({ mode: 'light', primary: '#0070f3' });
  
  // ✅ Memoize the context value to prevent re-renders when ThemeProvider re-renders
  // for reasons unrelated to theme (e.g., its own state change)
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Usage: useContext is elegant but has a performance footprint
function Button({ children }: { children: ReactNode }) {
  const { theme } = useContext(ThemeContext); // re-renders when ANY ThemeContext value changes
  return <button style={{ background: theme.primary }}>{children}</button>;
}

// For high-frequency updates, prefer direct props or dedicated state management
```

### useId

```typescript
// Critical for SSR: server and client must generate the same IDs for hydration to work
// ❌ Math.random() or Date.now() as IDs = hydration mismatch

// ✅ useId: deterministic, stable IDs based on component position in the tree
function FormField({ label, type = 'text' }: { label: string; type?: string }) {
  const id = useId(); // Returns something like ":r0:", ":r1:" — stable between server/client
  
  return (
    <div>
      {/* htmlFor must match id exactly — useId guarantees this */}
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} aria-label={label} />
    </div>
  );
}

// Multiple related IDs from one base:
function RadioGroup({ options }: { options: string[] }) {
  const baseId = useId();
  return options.map((opt) => (
    <label key={opt} htmlFor={`${baseId}-${opt}`}>
      <input id={`${baseId}-${opt}`} type="radio" value={opt} />
      {opt}
    </label>
  ));
}
```

### useTransition (React 18)

```typescript
// Mark non-urgent state updates so React can interrupt them for urgent input
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isPending, startTransition] = useTransition();
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Urgent: update input immediately (blocking — not wrapped in transition)
    setQuery(value); // Renders instantly — user sees their typed character
    
    // Non-urgent: update results (can be interrupted by new keystrokes)
    startTransition(() => {
      // React may interrupt this render if the user types another character
      // before this render completes — starts fresh with the latest value
      // This prevents the input field from feeling laggy during heavy re-renders
      const filtered = filterProducts(allProducts, value); // expensive
      setResults(filtered);
    });
  };
  
  return (
    <>
      <input value={query} onChange={handleSearch} />
      {isPending && <Spinner />}  {/* Show loading state during transition */}
      <ProductGrid products={results} />
    </>
  );
}
```

---

## 4. The Code — Common Bugs and Their Fixes

### Wrong Way — Classic Hook Mistakes

```typescript
// ❌ WRONG 1: Missing cleanup in useEffect (memory leak + stale callbacks)
function LiveMetrics({ metricId }: { metricId: string }) {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetric(metricId).then(setValue); // ← Still runs after unmount!
      // Error: "Can't perform a React state update on an unmounted component"
    }, 1000);
    
    // ❌ No return value — interval NEVER cleared
  }, [metricId]);
  
  return <MetricDisplay value={value} />;
}

// ❌ WRONG 2: Stale closure in useEffect
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count); // ← count is ALWAYS 0 (captured at effect creation time)
      setCount(count + 1); // ← Always sets to 1, not increments
    }, 1000);
    return () => clearInterval(timer);
  }, []); // ← Empty deps: effect captures count=0 forever
  
  return <div>{count}</div>;
}

// ❌ WRONG 3: Creating new objects in render, passing to useEffect deps
function DataFetcher({ filters }: { filters: FilterObject }) {
  useEffect(() => {
    fetchData(filters);
  }, [filters]); // ← filters is a new object on every parent render!
  // Parent re-renders for ANY reason → new filters object → effect re-runs
  // Even if filter values are IDENTICAL
}

// ❌ WRONG 4: Calling hooks conditionally
function UserPanel({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (!isLoggedIn) return null; // ← ✅ Early return is fine
  
  // ❌ ILLEGAL: calling hooks after a conditional return
  // NEVER conditional — but this is after return, outside if block, still OK actually.
  // The real mistake:
  
  if (isLoggedIn) {
    const [pref, setPref] = useState('dark'); // ❌ INSIDE a conditional — breaks hook ordering
  }
}
```

> **Why this fails:** missing cleanup causes setInterval/setTimeout to fire after unmount, leading to state updates on unmounted components (memory leak + React warning). Stale closures in useEffect with empty deps capture initial values and never update. Object identity in deps causes infinite re-run loops. Conditional hooks break the call order invariant (Fiber uses position to identify hooks).

### Right Way — Correct Hook Patterns

```typescript
// ✅ RIGHT: Cleanup for every side effect
function LiveMetrics({ metricId }: { metricId: string }) {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    let isActive = true; // Guard against stale setState on unmount
    const interval = setInterval(async () => {
      const metric = await fetchMetric(metricId);
      if (isActive) setValue(metric); // Only update if still mounted
    }, 1000);
    
    return () => {
      isActive = false;   // Signal that component is unmounted
      clearInterval(interval); // Clear the timer
    };
  }, [metricId]); // Re-setup when metricId changes
  
  return <MetricDisplay value={value} />;
}

// ✅ RIGHT: Functional update avoids stale closure
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => prev + 1); // ← Functional update: no closure over count
    }, 1000);
    return () => clearInterval(timer);
  }, []); // Empty deps is now correct — no captured variables
  
  return <div>{count}</div>;
}

// ✅ RIGHT: Stabilise object references to prevent stale effect triggers
function DataFetcher({ filters }: { filters: FilterObject }) {
  // Option 1: Destructure to primitives in deps
  const { category, minPrice, maxPrice } = filters;
  
  useEffect(() => {
    fetchData({ category, minPrice, maxPrice });
  }, [category, minPrice, maxPrice]); // Primitives: stable reference by value
  
  // Option 2: If props can't be destructured, require parent to memoize:
  // Parent: const filters = useMemo(() => ({ category, minPrice }), [category, minPrice])
}

// ✅ RIGHT: React DevTools Profiler hook for measuring component performance
// (bonus hook — useDebugValue for custom hooks)
function useDataWithDebug(url: string) {
  const [data, setData] = useState(null);
  
  useDebugValue(data, d => d ? `Loaded: ${d.length} items` : 'Loading...'); 
  // Shows in React DevTools inspector for the custom hook
  
  useEffect(() => {
    fetch(url).then(r => r.json()).then(setData);
  }, [url]);
  
  return data;
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between useMemo and useCallback?"

**Hruday's answer:**
> `useMemo` memoises a VALUE — the result of calling a function. `useCallback` memoises a FUNCTION REFERENCE itself.
>
> `useMemo(() => expensiveCalc(a, b), [a, b])` runs the function and caches the return value. Only recomputes when `a` or `b` changes.
>
> `useCallback(fn, [deps])` is equivalent to `useMemo(() => fn, [deps])` — it returns the same function reference across renders as long as deps don't change.
>
> When to use each: `useMemo` for expensive computed values (filtering 50K items, computing chart data from raw numbers); `useCallback` for functions passed as props to children wrapped in `React.memo` — if the function reference is new every render, the child re-renders even though nothing semantically changed.
>
> The key nuance: both are optimisations — they have a cost (memory + dep comparison). Don't add them preemptively. Add `useMemo` when a profiler shows the computation is expensive; add `useCallback` when a profiler shows a memo'd child is re-rendering due to function prop changes.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain why the rules of hooks exist — specifically, why can't hooks be called in conditionals?"

**Hruday's answer:**
> Hooks are stored as a linked list on the Fiber node — each hook call occupies one slot in that list, identified by its CALL ORDER within the component function. The first `useState` call is slot 0, the second is slot 1, `useEffect` is slot 2, and so on.
>
> React doesn't name hooks by variable name. It identifies them purely by their order of invocation. When a component re-renders, React expects the SAME NUMBER of hooks called in the SAME ORDER as the previous render — so it can correctly associate slot 0 with the first `useState`, slot 1 with the second, etc.
>
> If a hook is behind a conditional:
> ```javascript
> if (user.isAdmin) {
>   const [adminData, setAdminData] = useState(null); // ONLY for admins
> }
> ```
> When `user.isAdmin` is `true`, slot 0 holds the adminData state. When `isAdmin` becomes `false`, the hook is skipped — the linked list has one fewer entry. Now slot 0, 1, 2... map to DIFFERENT hooks than before. React is reading the wrong state from the wrong slot — corruption.
>
> The rules of hooks are not arbitrary API design — they're a direct consequence of the hook storage implementation. ESLint's `rules-of-hooks` plugin enforces this statically.

---

### Q3 — Practical
**Interviewer asks:** "When would you use useRef instead of useState for tracking a timer ID?"

**Hruday's answer:**
> Timer IDs and subscription handles are implementation details — they're not UI state. The component doesn't need to re-render when a timer ID changes. If I use `useState` to store a timer ID, changing it triggers a re-render for no visual benefit.
>
> `useRef` gives me a mutable container that persists across renders WITHOUT triggering re-renders. `ref.current` can be mutated directly. For a debounced search input, I store the `setTimeout` return value in `useRef`, clear it on the next keystroke, and clean it up in `useEffect`'s cleanup. The component has zero extra renders from timer management — only real state changes (the search query, loading state, results) cause renders.
>
> The rule: `useRef` for values that are part of the component's LOGIC but not its DISPLAY. Timer handles, WebSocket connections, animation frame IDs, the previous value of a prop for comparison purposes — all useRef. If the value changing should update the UI, use useState.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "useEffect with empty deps runs only once" | "`useEffect(fn, [])` is componentDidMount — runs once on mount" | Technically correct but the mental model misses the cleanup: `useEffect` with empty deps runs once MOUNT AND ALSO RUNS ITS CLEANUP ON UNMOUNT; the cleanup function is critical — subscriptions, timers, event listeners without cleanup in useEffect cause memory leaks even with `[]` deps; always think in pairs: setup + cleanup |
| "useMemo/useCallback are always good" | "I add `useCallback` to all event handlers for performance" | Both hooks have real costs: they consume memory (memoisation storage), they incur dependency comparison on every render, and they add cognitive overhead to reading the code; only use them when there's a measured performance problem; premature memoisation often makes performance WORSE by increasing garbage collection pressure from the dep arrays |
| "useEffect is for fetching data" | "You should always fetch data in `useEffect`" | React 18 and the modern ecosystem moves away from `useEffect` for data fetching in favour of React Query, SWR, or React Server Components; `useEffect` data fetching has well-known problems: double invocation in Strict Mode, no built-in loading/error state, race conditions on rapid prop changes; it's still workable but `useEffect` for fetching is a 2019 pattern, not 2026 best practice |
| "useState setter is synchronous" | "`setState` immediately updates the state" | `setState` in React is ASYNCHRONOUS — it schedules a re-render; reading the variable immediately after `setState(newValue)` will give you the OLD value in the same synchronous execution block; state is updated in the next render; to read the latest value after setState, use the functional update form or read it inside the effect that has the value in its deps |

---

## 7. Hruday's Real Experience Hook
> "The stale closure bug in `useEffect` is the hook mistake I've seen the most in code reviews at SAP. The pattern: a developer writes a real-time price updater using a `setInterval` in `useEffect` with `[]` deps. The interval callback reads a state variable to compute the next value. The variable is the initial state at mount time — because the closure captures the value at the time the effect created the interval. Every 1,000ms, the interval fires with the initial value. The counter that should count up: outputs 1, 1, 1, 1...
>
> The fix is the functional update form of `setState` — instead of `setCount(count + 1)` (reads stale count), write `setCount(prev => prev + 1)` (React provides the current value). This bypasses the closure entirely — the function receives the current state directly from React's scheduler, not from the closure.
>
> The second pattern I improved: `useMemo` was being added everywhere as a performance reflex, even for simple string formatting. The `useMemo(() => \`Hello, ${name}\`, [name])` added more overhead than the string concatenation it 'optimised'. I introduced a team rule: only reach for `useMemo` and `useCallback` after the profiler shows a concrete problem — render time >1ms for the computation, or a memo'd child provably re-rendering due to reference instability."

---

## 8. Scale Evolution

**Learning React / personal projects →** useState, useEffect (with cleanup), useRef for DOM. These cover 80% of use cases. Resist useContext for everything — it's a tool for genuine cross-cutting concerns (theme, auth), not general data sharing.

**Product team / enterprise React →** useReducer for complex form state and multi-step wizard state. useMemo/useCallback surgically based on profiler data. Custom hooks to encapsulate every `useEffect` pattern (subscription, fetch, polling) — make the business logic testable without rendering the component. useId for all form field IDs (required for SSR).

**Large-scale React 18+ stack →** useTransition for search/filter/sort in large data sets — prevents input lag; `useDeferredValue` for deferring expensive child renders. React 19's new hooks: `use()` for Promise unwrapping in render (Suspense-compatible), `useActionState` for server action form handling, `useOptimistic` for optimistic UI. The hooks ecosystem evolves every React version — the fundamentals above are evergreen.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flows use complex multi-step state (useReducer for step transitions), real-time form validation (useEffect for async validators), payment method selection (context or useReducer); every checkout interaction is traced for bugs — incorrect hook usage causing stale state in payment forms is a critical P0 | Demonstrate useReducer for checkout state machine; correct cleanup pattern for payment status polling |
| Swiggy / Meesho | Product search with type-as-you-go filtering (useTransition for non-blocking search results); menu/product data fetching (useEffect with AbortController); infinite scroll (useIntersectionObserver custom hook + useState for cursor); cart operations (useReducer) | Live search with useTransition; custom hook patterns; dependency array precision |
| Adobe / Microsoft | Deeply technical hook questions in interviews; Adobe Document Cloud uses hooks for complex document state; Microsoft Fluent UI library code-reviews hooks usage on PRs; staff-level interviews include "explain how hooks work internally" | Internal model of hooks (linked list on Fiber), rules of hooks derivation, custom hook composition at scale |
| SAP Labs | Real production examples: stale closure in setInterval fixed with functional update; over-memoization review finding; SAP Fiori components built with hooks; real-time metric dashboards with useEffect cleanup and useRef for subscription handles | Concrete debugging stories; code review patterns; cleanup discipline (no memory leaks) |

---

## 10. Related Topics — What to Study Next

- **Topic 209 — React Fiber and Reconciliation** — hooks are stored on Fiber nodes; the rules of hooks derive directly from Fiber's linked-list hook storage; understanding Fiber explains WHY `useMemo` prevents reconciliation work (by returning the same reference) and WHY `useLayoutEffect` runs in the commit phase synchronously
- **Topic 213 — Custom Hooks Patterns and Composition** — the ultimate application of all built-in hooks; every complex hook pattern (useDebounce, usePrevious, useIntersectionObserver, useLocalStorage, useEventListener) is a composition of the primitives covered in Topic 210; this topic puts the hooks together into reusable, testable units
- **Topic 211 — React 18 Concurrent Mode and Suspense** — `useTransition` and `useDeferredValue` are React 18's hooks for concurrent rendering; they build directly on `useState` and the Fiber architecture; understanding hooks fully is the prerequisite for using concurrent features correctly
- **Topic 212 — React Server Components and Server Actions** — React 19 introduces `use()`, `useActionState`, and `useOptimistic` — hooks designed for the RSC model; these are extensions of the hook system into server-side rendering contexts; the mental model is the same, but the execution environment (server vs client) adds new constraints

---

*Part 12 · All React Hooks — Complete Reference · Full Stack Interview Guide · Hruday D · 2026*
