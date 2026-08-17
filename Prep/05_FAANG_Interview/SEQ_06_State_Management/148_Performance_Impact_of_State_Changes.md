# 148. Performance Impact of State Changes
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Every state change in React triggers a re-render of the component that owns the state, plus all of its children — unless those children are wrapped in `React.memo` with stable props. The performance cost is proportional to the number of components in the re-render cascade, how expensive their render functions are, and how frequently the state changes. I measure state change impact with React Profiler and the "why did this component render?" DevTools. The optimization hierarchy: first, prevent unnecessary renders with `useMemo` and `useCallback` for referential stability; second, split Context to reduce subscriber scope; third, move high-frequency state to local scope to minimize subscriber count; fourth, use `useSyncExternalStore` for external stores with granular subscriptions. The goal is not zero re-renders — it's re-renderers only when the DOM actually needs to change.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Re-render Cascade

```typescript
// React re-render rules:
// 1. A component re-renders when its own state changes
// 2. A component re-renders when its parent re-renders (default)
//    — UNLESS it is wrapped in React.memo AND all its props pass Object.is
// 3. A component re-renders when its Context value changes
//    — React.memo does NOT prevent Context re-renders
// 4. A component re-renders when a store selector's value changes
//    — useSelector / Zustand store hooks use Object.is comparison

// Cascade example:
// App (state: userData changes) 
//   ├── Navbar (re-renders — parent re-rendered, no memo)
//   │     ├── Logo (re-renders — parent re-rendered, no memo)
//   │     └── UserAvatar (re-renders — yet Logo and this don't use userData)
//   ├── Sidebar (re-renders — same)
//   └── ProductList (re-renders — same)
//         └── ... 50 ProductCard components each re-render

// Fix: React.memo + co-location
// Navbar = React.memo(Navbar) with stable props → skips re-rendering
// Move userData to a UserContext → only UserAvatar subscribes
```

### Measuring State Performance — React Profiler

```typescript
// React DevTools Profiler — enable in browser extension:
// 1. Open DevTools → Profiler tab
// 2. Click record, perform the interaction (e.g., type in search field)
// 3. Stop recording
// 4. Flame chart shows each component's render time
// 5. Look for: unnecessary renders (greyed if committed, highlighted if they ran)
// 6. Click any bar → "Why did this render?" → shows which prop/state/context changed

// Programmatic profiling for CI:
import { Profiler } from 'react';

function onRender(
  id: string,                // Component name
  phase: 'mount' | 'update',
  actualDuration: number,    // Time spent rendering
  baseDuration: number,      // Estimated time if no memoization
  startTime: number,
  commitTime: number
) {
  if (phase === 'update' && actualDuration > 16) {
    // 16ms = one frame budget at 60fps
    console.warn(`${id} took ${actualDuration.toFixed(1)}ms to render`);
  }
}

function InstrumentedProductList() {
  return (
    <Profiler id="ProductList" onRender={onRender}>
      <ProductList />
    </Profiler>
  );
}
```

### High-Frequency State — The Input Problem

```typescript
// ❌ High-frequency state in parent causes children cascade
function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {/* ↑ Every keystroke re-renders SearchPage AND all children below */}
      <ExpensiveFilters />         {/* Re-renders on every keystroke — wasteful */}
      <ExpensiveProductGrid />     {/* Re-renders on every keystroke — wasteful */}
    </div>
  );
}

// ✅ Fix 1: React.memo to opt out of cascade
const ExpensiveFilters = React.memo(({ onApply }: { onApply: (f: Filters) => void }) => {
  // Only re-renders when onApply reference changes — use useCallback in parent
  return <FilterPanel onApply={onApply} />;
});

// ✅ Fix 2: Co-locate input state to a small subtree
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');                    // local state
  const debouncedSearch = useDebounce(query, 300);           // debounce

  useEffect(() => { onSearch(debouncedSearch); }, [debouncedSearch]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
// Now only SearchInput re-renders on each keystroke; parent updates only after 300ms debounce
```

### `useCallback` and `useMemo` for Referential Stability

```typescript
// Rule: Memoize callbacks and objects passed as props to React.memo children,
//       or as dependencies of useEffect / useMemo

function ProductPage({ categoryId }: { categoryId: string }) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // ❌ New function reference every render → React.memo children re-render
  const handleSortChange = (order: 'asc' | 'desc') => setSortOrder(order);

  // ✅ Stable reference — only changes if sortOrder changes (which it shouldn't — it's a setter)
  const handleSortChange = useCallback(
    (order: 'asc' | 'desc') => setSortOrder(order),
    []  // ← empty array: setSortOrder is stable across renders
  );

  // ❌ New object reference every render
  const filterConfig = { categoryId, sortOrder, includeDrafts: false };

  // ✅ Stable reference — only changes when inputs change
  const filterConfig = useMemo(
    () => ({ categoryId, sortOrder, includeDrafts: false }),
    [categoryId, sortOrder]
  );

  return (
    <ProductGrid
      filters={filterConfig}    // ← stable reference
      onSortChange={handleSortChange}  // ← stable reference
    />
  );
}

// useMemo vs useCallback:
// useMemo(fn, deps)     → memoizes the return VALUE of fn
// useCallback(fn, deps) → memoizes the FUNCTION ITSELF === useMemo(() => fn, deps)
```

### Context — Granular Subscription via Split Providers

```typescript
// ❌ Monolithic Context — all consumers re-render when any part changes
const AppContext = createContext<{
  user: User;
  theme: Theme;
  notifications: Notification[];
  setTheme: (t: Theme) => void;
  addNotification: (n: Notification) => void;
}>(null!);

// Every consumer of AppContext re-renders when user changes, theme changes,
// or a notification is added — even if they only care about theme

// ✅ Split Contexts — each consumer subscribes only to what it needs
const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>(null!);
const NotificationsContext = createContext<{
  notifications: Notification[];
  addNotification: (n: Notification) => void;
}>(null!);

// UserAvatar re-renders only on user changes
// ThemeToggle re-renders only on theme changes
// NotificationBell re-renders only on notification changes
// Cross-context pollution eliminated
```

### Zustand — Selector Granularity

```typescript
// ❌ Subscribing to entire store object
const store = useAppStore();
// Re-renders on any store change, regardless of which slice

// ✅ Atomic selector — re-renders only when user.name changes
const userName = useAppStore(state => state.auth.user?.name);

// ✅ Shallow comparison for object selectors
import { useShallow } from 'zustand/react/shallow';
const { x, y } = useAppStore(
  useShallow(state => ({ x: state.cursor.x, y: state.cursor.y }))
);
// Without useShallow: { x: 100, y: 200 } !== { x: 100, y: 200 } (new object reference)
// With useShallow: compares field-by-field — only re-renders if x or y actually changed

// The implication: cursor tracking without useShallow would cause global re-render on mousemove
```

### `useSyncExternalStore` — React's Official API for External Stores

```typescript
import { useSyncExternalStore } from 'react';

// Subscribe to any external store with React's concurrent-mode safe API
// (Zustand and RTK use this internally)

// Custom: subscribe to window dimensions
function useWindowSize() {
  return useSyncExternalStore(
    // subscribe: called with callback; return unsubscribe
    (callback) => {
      window.addEventListener('resize', callback);
      return () => window.removeEventListener('resize', callback);
    },
    // getSnapshot: return current value (must be same value if unchanged — Object.is)
    () => ({ width: window.innerWidth, height: window.innerHeight }),
    // getServerSnapshot: for SSR
    () => ({ width: 1920, height: 1080 })
  );
}

// Why useSyncExternalStore over useEffect + useState?
// Prevents "tearing" in React 18 concurrent mode:
// During concurrent rendering, React may read the same external store at different
// times and see different values (a store update happened mid-render).
// useSyncExternalStore forces a synchronous snapshot, preventing torn reads.
```

### State Batching (React 18)

```typescript
// React 18 automatic batching: multiple state updates in the same event handler
// are batched into one re-render

// ✅ In React 18+, all of these are automatically batched:
function handleSubmit() {
  setLoading(true);
  setError(null);
  setData(response);
  // → One single re-render, not three
}

// Even async context (React 18+):
async function fetchData() {
  const data = await api.fetch();
  // React 18: these are batched
  setData(data);
  setLoading(false);
  // → One re-render
}

// React 17 and below: only synchronous event handlers were batched
// async updates each caused a separate re-render
// → This is why upgrading to React 18+ often improves performance without code changes

// When you need to opt OUT of batching (rare):
import { flushSync } from 'react-dom';
flushSync(() => setLoading(true));  // forces synchronous render
flushSync(() => setData(data));     // forces second synchronous render
// → Use only when you need the DOM to update between state changes
```

### Transitions — Deferring Non-Urgent State Updates

```typescript
import { useTransition, useDeferredValue, Suspense } from 'react';

// useTransition: mark state updates as non-urgent
// React will keep the current UI interactive until the new state is ready
function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // Transition: filter/sort re-computation is deferred; input stays responsive
    startTransition(() => {
      setDebouncedQuery(e.target.value);
    });
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner size="sm" aria-label="Filtering…" />}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductResults query={debouncedQuery} />
      </Suspense>
    </>
  );
}

// useDeferredValue: defer rendering of a value without controlling the state setter
function ProductResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);  // may be stale during transition
  const isStale = query !== deferredQuery;

  const { data } = useQuery({
    queryKey: ['products', deferredQuery],
    queryFn: () => api.products.search(deferredQuery),
  });

  return (
    <div style={{ opacity: isStale ? 0.7 : 1, transition: 'opacity 0.2s' }}>
      {/* Shows slightly faded during transition — indicates stale state */}
      <ProductGrid products={data?.items ?? []} />
    </div>
  );
}
```

### React Profiler Analysis Workflow

```typescript
// Systematic performance investigation workflow:

// 1. Profile the interaction that feels slow (React DevTools Profiler)
// 2. Find components with unusual actualDuration (> 16ms suggests a frame drop)
// 3. Click the bar → check "Why did this render?"
//    - "Props changed": which prop? Is it a new reference each time?
//    - "State changed": which state? Is this state too high in the tree?
//    - "Context changed": which context? Can it be split?
//    - "Hooks changed": which hook? Check useMemo deps

// 4. Fix in order:
//    - New reference props → useCallback / useMemo in parent
//    - Monolithic context → split contexts
//    - High-frequency state in wrong level → co-locate lower
//    - Expensive render function → React.memo or virtualize (react-window)

// 5. Re-profile to verify improvement
```

### ⚠️ Anti-Patterns

- **Premature memoization** — wrapping every component in `React.memo` and every value in `useMemo` adds overhead (memory for cached values, comparison work) without benefit when the component renders infrequently anyway; profile first, optimize second
- **`useMemo` dependencies that change every render** — `useMemo(() => compute(obj), [obj])` where `obj` is created in render — `obj` gets a new reference each render, so the memo is never hit; memoize at the source or include primitives in deps
- **Object/array state causing infinite effect loops** — `useEffect(() => {}, [someObject])` where `someObject` is created in render → infinite loop; stabilize with useMemo before using as a dep
- **React.memo without stable callback props** — `React.memo(Child)` is useless if `<Child onClick={handleClick} />` where `handleClick` is defined in-render without `useCallback` — the memo never saves a render because the prop reference always changes

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the procurement analytics dashboard rendered a 500-row data grid that re-rendered on every WebSocket update — even rows with unchanged data. The global Zustand store update for a new socket event caused every `useAppStore` subscriber to re-evaluate. Fix in three steps: (1) split `useSocketDataStore` into a separate store so only the grid subscribed; (2) wrapped each `GridRow` in `React.memo` with a stable `rowData` prop; (3) virtualized the grid with `react-window` to render only the 15 visible rows. Time to update the visible data on a socket event: 420ms → 22ms. INP metric: 400ms → 120ms (below "Needs Improvement" threshold).

**FAANG scale:**
- **Microsoft:** Teams message list — each message uses `React.memo`; messages re-render only when their content, reactions, or read state changes, not when the next message arrives; processing 1000+ messages in an active channel without cascade renders
- **Adobe:** Premiere timeline — frame-level scrubbing involves high-frequency state updates; playhead position uses `useSyncExternalStore` against an external WebAssembly state, bypassing React's scheduler for sub-frame latency
- **Salesforce:** Report builder column drag-reorder — `useTransition` marks column order state as a deferred update so the drag handle position stays immediate while the column reorder computation (sorting 50 columns + recalculating widths) runs without blocking input
- **Cisco:** Real-time network map — node position state local to each `NetworkNode` component, not global; with 200 nodes, co-location ensures a single node's position update only re-renders that node, not the entire map

---

## 💬 4. Interview Execution

### Sample Answer

> "State changes have a performance cost that's proportional to the re-render cascade they trigger. Understanding the cascade is the first step — when state in a parent component changes, every child re-renders by default unless it's wrapped in `React.memo` with stable props. Context changes bypass `React.memo` entirely.
>
> My optimization hierarchy starts with measurement, not guessing. React Profiler's 'Why did this render?' saves hours. Then I address in order: referential stability for `React.memo` children via `useCallback`/`useMemo`; splitting monolithic Contexts to narrow subscription scope; co-locating high-frequency state (like search inputs) to minimize subscribers; and for external stores, Zustand's granular selectors with `useShallow` for object subscriptions.
>
> React 18 added two tools for state performance I find underused: `useTransition` marks an update as non-urgent so the UI stays responsive while the update processes; `useDeferredValue` lets a component show stale data during an update, preventing a skeleton flash. At SAP I used `useTransition` for filter changes in the analytics dashboard — the filter input stayed immediately responsive while the 500-row grid recomputed in the background.
>
> The result at SAP was INP dropping from 400ms to 120ms my migrating to co-located state, granular Zustand selectors, React.memo on grid rows, and react-window virtualization."

### Likely Follow-up Questions
1. "What's the difference between `useTransition` and `useDeferredValue`?" → `useTransition` wraps the state setter — you control which update is deferred; `useDeferredValue` wraps a prop or value — useful when you don't control the state setter (e.g., it's in a parent or a library)
2. "When does `React.memo` NOT help?" → When any prop is a new object/array/function reference each render; when Context changes (React.memo doesn't prevent context re-renders); when the component is so cheap to render that memo overhead exceeds savings
3. "What is state tearing and when does it happen?" → In React 18 concurrent mode, React may interrupt and resume rendering; if an external store changes mid-render, different parts of the tree may read different values from the same store (torn state); `useSyncExternalStore` prevents this by taking a synchronous snapshot
4. "How do you debounce state updates?" → Two patterns: (1) debounce the setter — `const debouncedSet = useMemo(() => debounce(setQuery, 300), [])` and call `debouncedSet(value)` from the input handler; (2) use a separate `useState` for the input value and a `useEffect` + timeout to update the "committed" query after the delay
5. "What's automatic batching in React 18?" → Multiple `setState` calls in the same event handler (or async context in React 18+) are grouped into one re-render instead of triggering one re-render per call; React 17 only batched in synchronous event handlers

---

## 💻 5. Code Example

```typescript
// Comprehensive state performance optimization — real-time data grid

interface MetricRow { id: string; name: string; value: number; change: number; status: 'ok' | 'warn' | 'critical'; }

// Custom hook: granular Zustand subscription
function useMetricsList() {
  return useMetricsStore(
    // Selector: O(n) initial, but stable reference when data unchanged
    useShallow(state => state.metrics.ids.map(id => state.metrics.entities[id]!))
  );
}

// Memoized row component — only re-renders when its own metric changes
const MetricRow = React.memo(
  ({ metric, onAcknowledge }: { metric: MetricRow; onAcknowledge: (id: string) => void }) => {
    return (
      <tr>
        <td>{metric.name}</td>
        <td>{metric.value.toFixed(2)}</td>
        <td style={{ color: metric.change > 0 ? 'green' : 'red' }}>
          {metric.change > 0 ? '+' : ''}{metric.change.toFixed(2)}
        </td>
        <td>
          <StatusBadge status={metric.status} />
        </td>
        {metric.status !== 'ok' && (
          <td>
            <button onClick={() => onAcknowledge(metric.id)}>Acknowledge</button>
          </td>
        )}
      </tr>
    );
  },
  (prev, next) =>
    // Custom comparator: only re-render if the meaningful fields changed
    prev.metric.value === next.metric.value &&
    prev.metric.status === next.metric.status &&
    prev.metric.change === next.metric.change
);
MetricRow.displayName = 'MetricRow';

function MetricsDashboard() {
  const [filterQuery, setFilterQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [committedQuery, setCommittedQuery] = useState('');

  const metrics = useMetricsList();

  // Stable callback — won't cause MetricRow re-renders
  const handleAcknowledge = useCallback((id: string) => {
    useMetricsStore.getState().acknowledgeMetric(id);
  }, []);

  // Derived: filter + sort — memoized
  const filteredMetrics = useMemo(
    () => metrics
      .filter(m => m.name.toLowerCase().includes(committedQuery.toLowerCase()))
      .sort((a, b) => {
        // Criticals first, then warns, then ok
        const priority = { critical: 0, warn: 1, ok: 2 };
        return priority[a.status] - priority[b.status];
      }),
    [metrics, committedQuery]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterQuery(e.target.value);
    startTransition(() => {
      setCommittedQuery(e.target.value);  // deferred: grid refilters in background
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          value={filterQuery}
          onChange={handleSearch}
          placeholder="Filter metrics…"
        />
        {isPending && <span aria-label="Filtering">⟳</span>}
      </div>

      {/* Virtualized for 1000+ metrics */}
      <FixedSizeList
        height={600}
        itemCount={filteredMetrics.length}
        itemSize={48}
        itemData={{ metrics: filteredMetrics, onAcknowledge: handleAcknowledge }}
      >
        {({ index, style, data }) => (
          <div style={style}>
            <MetricRow
              metric={data.metrics[index]}
              onAcknowledge={data.onAcknowledge}
            />
          </div>
        )}
      </FixedSizeList>

      <p>{filteredMetrics.filter(m => m.status !== 'ok').length} alerts active</p>
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**RSMB — Re-render prevention arsenal:**
- **R**eact.memo — opt a component out of parent re-renders (for stable props)
- **S**electors — granular store subscriptions (Zustand + useShallow, createSelector)
- **M**emoize — useMemo (values) + useCallback (functions) for referential stability
- **B**atch → Transition → Defer — React 18 concurrency tools for non-urgent updates

**Performance investigation order — SWAP:**
- **S**elect which interaction is slow (profile the user action)
- **W**hy did this component render? (React DevTools → "Why rendered?")
- **A**ddress the root cause (reference, context, level)
- **P**rofile again to confirm the improvement

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ INP (Interaction to Next Paint) replaces FID as a Core Web Vital — it measures the delay between user interaction and the next frame; state change cascades during interactions (click, type, scroll) are the primary cause of INP > 200ms; demonstrating you know this metric and can fix it with `useTransition`, `React.memo`, and co-location positions you as a Core Web Vitals-aware senior engineer, not just a hooks user
→ `useSyncExternalStore` is the hidden expertise signal — most developers don't know it exists because Zustand and RTK use it internally; explaining that it was introduced to prevent state tearing in React 18's concurrent mode shows deep knowledge of React's internals, not just its API surface
→ The measurement-first discipline separates senior from mid-level optimization stories — "I added useMemo everywhere" is a red flag; "I profiled, found MetricRow was re-rendering 150 times per second due to a non-memoized callback prop, added useCallback, and INP dropped from 400ms to 120ms" demonstrates systematic engineering

**How it works (2 sentences):**
React's reconciler uses a work loop that processes updates in priority order — state changes from `startTransition` are tagged as "transition" priority, which React can interrupt and abandon if higher-priority updates (like a keypress) arrive, then restart the transition work; this is why the input stays responsive during a `startTransition` re-render — React literally abandons and restarts the low-priority render loop when new user input arrives, which is safe only because React re-renders are pure functions that don't commit until the work is complete.
`React.memo` works by storing the last rendered output and its associated props, then at render time comparing new props to old props using `Object.is` (shallow equality for each prop individually); if all props pass `Object.is`, React reuses the stored output — but `Object.is({a:1}, {a:1})` is `false` (different references), which is why passing inline objects or arrow functions as props defeats memoization and why `useCallback` and `useMemo` exist — to return the same reference when the underlying value hasn't changed.

---
✅ SEQ 6 complete — 13 topics done (Topics 136–148). Say **GO** to start SEQ 7: Data Fetching & API Design
