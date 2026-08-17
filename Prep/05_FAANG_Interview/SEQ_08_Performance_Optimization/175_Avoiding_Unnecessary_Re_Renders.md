# 175. Avoiding Unnecessary Re-Renders
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"Unnecessary re-renders are the most common React performance problem in production apps. A re-render doesn't always mean a DOM update — React can re-render a component (run its function body) and find that the output is identical, producing zero DOM mutations. But even a no-op re-render has a cost: it runs JavaScript, creates new virtual DOM nodes, and diffs them. At SAP, our product detail page re-rendered 147 times per second during a filter interaction because a single context provider held both filter state and UI config. Every filter key press triggered every consuming component to re-render, including a 1,200-row data table. The fix: split context, memoize selectors, apply React.memo to pure display components. Re-renders dropped from 147/sec to 4/sec, and the filter felt instant. The diagnostic tools are React DevTools Profiler (flame graphs — red = slow re-renders) and the `why-did-you-render` library (console logs with the exact reason for each re-render)."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Re-Render Trigger Taxonomy

Every React component re-renders because of exactly one of these:

```
Re-render sources
├── 1. Own state change (useState, useReducer)
├── 2. Parent re-render (default behavior — child always follows parent)
├── 3. Context value change (any consumer re-renders when provider value changes)
├── 4. Hooks: useSyncExternalStore subscription fires
└── 5. forceUpdate() / key change (always full remount)
```

**The cascade problem:**
```
App re-renders due to state change
  ├── Header (re-renders — wasted, output identical)
  ├── Sidebar (re-renders — wasted)
  └── ProductTable (re-renders)
       ├── TableHeader (re-renders — wasted)
       ├── TableRow x1200 (re-renders — 1200 wasted renders!)
       └── Pagination (re-renders — wasted)
```

Only `ProductTable` needed to re-render. All descendants re-rendered due to default propagation.

### Diagnostic: React DevTools Profiler

**How to read a flame graph:**
```
Record → interact → stop → Profiler tab

Commit #5 (12.3ms):
  App [3.2ms]              ← grey = did not re-render
    ├── Header [0.1ms]     ← grey = skipped (React.memo)
    ├── ProductTable [8.9ms] ← yellow/red = rendered
    │    ├── TableHeader [0.2ms]
    │    └── TableRow x40 [0.18ms avg, red = slow]   ← investigate these
    └── Footer [0.0ms]     ← grey = skipped
```

**"Why did this render?" panel:**
1. Click any component in flame graph
2. Right panel shows: "This component rendered because: props.items changed"

### Diagnostic: why-did-you-render Library

```typescript
// src/wdyr.ts — import BEFORE React
import React from 'react';
import whyDidYouRender from '@welldone-software/why-did-you-render';

if (process.env.NODE_ENV === 'development') {
  whyDidYouRender(React, {
    trackAllPureComponents: false, // opt-in per component
    logOnDifferentValues: true,    // log even when value types differ
  });
}

// In any component you want to track:
ProductTable.whyDidYouRender = true;
TableRow.whyDidYouRender = true;
```

```
// Console output:
[WDYR] ProductTable re-rendered because of props changes:
  prev: { filters: {status: 'active'}, data: Array(200) }
  next: { filters: {status: 'active'}, data: Array(200) }
  SAME VALUE but DIFFERENT REFERENCE for: filters
  Hint: use useMemo or useCallback to stabilize this reference
```

### Fix 1 — React.memo for Pure Display Components

```typescript
interface TableRowProps {
  product: Product;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

// Without memo: re-renders every time parent renders, even if props unchanged
// With memo: React shallow-compares props before deciding to re-render
const TableRow = React.memo(function TableRow({
  product,
  onSelect,
  isSelected,
}: TableRowProps) {
  return (
    <tr className={isSelected ? 'selected' : ''}>
      <td>{product.name}</td>
      <td>${product.price.toFixed(2)}</td>
      <td>
        <button onClick={() => onSelect(product.id)}>Select</button>
      </td>
    </tr>
  );
});

// Custom comparator — only re-render if specific props changed
const TableRowOptimized = React.memo(
  function TableRow({ product, onSelect, isSelected }: TableRowProps) {
    return (/* same as above */);
  },
  (prev, next) =>
    prev.product.id === next.product.id &&
    prev.product.price === next.product.price &&
    prev.isSelected === next.isSelected
    // Note: do NOT compare onSelect by reference if it changes — use useCallback instead
);
```

### Fix 2 — useCallback for Stable Function References

```typescript
// PROBLEM: inline function creates new reference on every render
function ProductTable({ products }: { products: Product[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ❌ New function every render → React.memo on TableRow is useless
  return (
    <>
      {products.map(p => (
        <TableRow
          key={p.id}
          product={p}
          onSelect={(id) => setSelectedId(id)} // ← new function each render
          isSelected={selectedId === p.id}
        />
      ))}
    </>
  );
}

// FIX: stable reference with useCallback
function ProductTableFixed({ products }: { products: Product[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ✅ Stable reference — only changes if setSelectedId changes (never)
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []); // empty deps because setSelectedId is stable

  return (
    <>
      {products.map(p => (
        <TableRow
          key={p.id}
          product={p}
          onSelect={handleSelect}  // same reference every render
          isSelected={selectedId === p.id}
        />
      ))}
    </>
  );
}
```

### Fix 3 — useMemo for Stable Object/Array References

```typescript
// PROBLEM: derived values create new arrays on every parent render
function FilteredList({ products, filters }: Props) {
  // ❌ New array reference every render — children always re-render
  const filtered = products.filter(p =>
    filters.status === 'all' || p.status === filters.status
  );

  // ❌ New object reference every render — context consumers always re-render
  const tableConfig = {
    sortable: true,
    pageSize: 50,
    columns: ['name', 'price', 'status'],
  };

  return <ProductTable data={filtered} config={tableConfig} />;
}

// FIX: memoize derived values
function FilteredListFixed({ products, filters }: Props) {
  // ✅ Recomputes only when products or filters.status changes
  const filtered = useMemo(() =>
    products.filter(p =>
      filters.status === 'all' || p.status === filters.status
    ),
    [products, filters.status] // NOT filters (would fire on any filter property change)
  );

  // ✅ Stable reference — only changes if the values actually change
  const tableConfig = useMemo(() => ({
    sortable: true,
    pageSize: 50,
    columns: ['name', 'price', 'status'],
  }), []);

  return <ProductTable data={filtered} config={tableConfig} />;
}
```

### Fix 4 — Context Splitting

Context is the most common source of excessive re-renders at scale:

```typescript
// ❌ BAD: single context holds unrelated state
// Every component consuming this context re-renders on ANY update
const AppContext = createContext<{
  user: User;
  theme: Theme;
  filters: FilterState;
  uiFlags: UIFlags;
  notifications: Notification[];
}>({});

// ✅ GOOD: split by update frequency + consumer overlap
const UserContext = createContext<User>(null!);           // changes rarely
const ThemeContext = createContext<Theme>(null!);          // changes rarely
const FilterContext = createContext<FilterState>(null!);   // changes on filter interaction
const UIFlagsContext = createContext<UIFlags>(null!);      // changes on interactions
const NotificationContext = createContext<Notification[]>([]); // changes on events

// Components only subscribe to what they need
function FilterPanel() {
  const filters = useContext(FilterContext); // only re-renders when filter changes
  // Does NOT re-render when user, theme, or notifications change
}
```

**Context with stable dispatch:**
```typescript
// Split the context into VALUE and DISPATCH to prevent re-renders on dispatch
const FilterStateContext = createContext<FilterState>(null!);
const FilterDispatchContext = createContext<React.Dispatch<FilterAction>>(null!);

function FilterProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(filterReducer, initialFilterState);

  return (
    // dispatch reference is STABLE — memoizing it is unnecessary
    // state reference changes on every dispatch
    <FilterDispatchContext.Provider value={dispatch}>
      <FilterStateContext.Provider value={state}>
        {children}
      </FilterStateContext.Provider>
    </FilterDispatchContext.Provider>
  );
}

// Components that only dispatch (e.g. FilterButton) subscribe to dispatch context
// → they NEVER re-render due to filter state changes
function FilterButton({ status }: { status: string }) {
  const dispatch = useContext(FilterDispatchContext); // stable — never re-renders
  return (
    <button onClick={() => dispatch({ type: 'SET_STATUS', status })}>
      {status}
    </button>
  );
}
```

### Fix 5 — State Colocation

Moving state down the tree dramatically reduces cascade re-renders:

```typescript
// ❌ State too high: every counter change re-renders everything
function Page() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <ExpensiveHeader />     {/* re-renders on every count change */}
      <ExpensiveContent />    {/* re-renders on every count change */}
      <Counter count={count} onChange={setCount} />
    </div>
  );
}

// ✅ Colocate state to the subtree that needs it
function Page() {
  return (
    <div>
      <ExpensiveHeader />   {/* never re-renders */}
      <ExpensiveContent />  {/* never re-renders */}
      <Counter />           {/* manages its own state */}
    </div>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Fix 6 — Lifting Children as Props (`children` as escape hatch)

```typescript
// ❌ Expensive child re-renders when parent state changes
function AnimatedContainer() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ height: isOpen ? 'auto' : '0' }}>
      <ExpensiveReport />  {/* re-renders every time isOpen changes */}
    </div>
  );
}

// ✅ Pass expensive content as children prop — React.memo skips it
function AnimatedContainer({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // children is a prop reference — doesn't change when isOpen changes
  return (
    <div style={{ height: isOpen ? 'auto' : '0' }}>
      {children}
    </div>
  );
}

// Usage — ExpensiveReport is defined at THIS render context, not animated
<AnimatedContainer>
  <ExpensiveReport />
</AnimatedContainer>
```

### Anti-Patterns Catalogue

| Anti-Pattern | Re-Render Cost | Fix |
|---|---|---|
| Inline object `config={{ a:1 }}` as prop | Every parent render | `useMemo` |
| Inline function `onClick={() => fn()}` as prop | Every parent render | `useCallback` |
| Inline array `items={[a, b, c]}` as prop | Every parent render | `useMemo` |
| Single large context | Any state change → all consumers | Split context by domain |
| State in parent for child-only concern | Every parent | Colocate state down |
| `React.memo` without `useCallback` | No benefit — callback still new | Both together |
| `useCallback` deps include inline object | Defeats useCallback | Memoize that dep too |
| Key = array index on dynamic lists | Wrong nodes reuse = stale render | Stable unique ID |

---

## 🌍 3. Real-World Examples

### SAP — Context Split: 147 re-renders/sec → 4/sec
SAP product catalog had a `<ConfigContext>` that held UI config, user permissions, feature flags, and active filter state all in one object. A single filter panel keystroke updated the context object, triggering re-renders in the product table (1,200 rows), sidebar navigation (8 panels), header (user menu), and three independent widget panels. Profile showed 147 component renders per keypress, with 12ms per frame — causing visible lag. After splitting into four separate contexts and memoizing filter selectors with Reselect, only 4 components re-rendered per keypress (3ms). Hruday's PR description: "Context splitting: 147 renders → 4 renders per filter action."

### Microsoft Teams — Stable Message List
Teams chat renders message lists that update frequently (new messages, typing indicators, status changes). Without optimization, every new message re-renders the entire chat history. Teams uses: (1) `React.memo` on `MessageBubble` comparing `message.id + message.status + message.reactions` only, (2) `useCallback` for all event handlers, (3) `useMemo` for reaction aggregation per message, (4) separate context for typing indicators (so "User is typing..." doesn't re-render the whole thread).

### Adobe — PDF Page Rendering
Adobe Acrobat web renders document pages. Each page is an expensive Canvas render. Without memoization, switching tabs caused all 50 pages to re-render. Adobe wraps each page in `React.memo` with a custom comparator checking only `page.revision` — a monotonically increasing integer that only increments when the page content actually changes. Annotation changes (which happen often) don't increment `page.revision`, so memo prevents page canvas re-render while allowing annotation overlay re-render separately.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "The three most impactful techniques to avoid unnecessary re-renders are: context splitting, React.memo with stable references, and state colocation. They address different root causes. Context splitting solves the 'one update triggers everything' problem — splitting a monolithic context by change frequency means a filter change only re-renders filter consumers, not the navbar. React.memo with useCallback solves the parent propagation problem — a memoized child checks if its props changed, but if you pass a new function reference every render, the check always returns 'changed' and memo has no effect, so useCallback is the required partner. State colocation solves the 'state lifted too high' problem — if only a counter widget needs count state, keeping it in the page root means a click on the counter re-renders the entire page. I debug re-renders with React DevTools Profiler for flame graph analysis, and the `why-did-you-render` library in development, which logs the exact prop or state that changed and whether it was a referential equality issue. "

### Follow-Up Q&A

**Q: Can React.memo and useMemo ever make things worse?**
A: Yes — three ways. First, the comparison itself has cost: React.memo runs a shallow comparison on every render, and if the comparator is a deep recursive function, it may cost more than the re-render it prevents. Second, useMemo retains the previous value in memory — for large data structures memoized extensively, memory usage can spike. Third, excessive memoization obscures data flow: when `useCallback` wraps every function regardless of necessity, the code becomes harder to reason about. The rule: measure first. Only memoize when React DevTools Profiler shows the component's render time is significant AND it renders frequently.

**Q: What is the relationship between referential equality and re-renders?**
A: React's default and React.memo's shallow comparison both use Object.is for comparison — the same as `===` for objects (reference equality). Two arrays `[1, 2, 3] === [1, 2, 3]` is false — different references, same values. So any prop that is an object, array, or function will always trigger a re-render unless its reference is stabilized with `useMemo` or `useCallback`. Primitive values (string, number, boolean) are compared by value — React.memo correctly skips re-renders when they're unchanged.

**Q: React 19 Compiler supposedly eliminates all this — should I still learn it?**
A: React Compiler auto-memoizes components and hooks, but (1) it's opt-in and requires your code to follow React's rules of hooks strictly — existing codebases need audit, (2) context splitting remains necessary regardless because Compiler can't know which context consumers are independent, (3) debugging Compiler-generated code requires understanding what the Compiler would have added manually — if you can't reason about memo, you can't debug why Compiler didn't apply it.

---

## 💻 5. Code Example (TypeScript)

```typescript
// Comprehensive re-render optimization — context split + memo + callback + colocation

import React, {
  createContext, useContext, useReducer, useCallback, useMemo, memo
} from 'react';

// ── 1. Context Split by Update Frequency ─────────────────────────────────────

interface FilterState { status: 'all' | 'active' | 'inactive'; query: string }
type FilterAction =
  | { type: 'SET_STATUS'; status: FilterState['status'] }
  | { type: 'SET_QUERY'; query: string };

const FilterStateCtx = createContext<FilterState>(null!);
const FilterDispatchCtx = createContext<React.Dispatch<FilterAction>>(null!);

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_STATUS': return { ...state, status: action.status };
    case 'SET_QUERY':  return { ...state, query: action.query };
  }
}

function FilterProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(filterReducer, { status: 'all', query: '' });
  return (
    <FilterDispatchCtx.Provider value={dispatch}>
      <FilterStateCtx.Provider value={state}>
        {children}
      </FilterStateCtx.Provider>
    </FilterDispatchCtx.Provider>
  );
}

// ── 2. Custom Hooks for Selective Subscriptions ───────────────────────────────

function useFilterStatus() {
  return useContext(FilterStateCtx).status; // re-renders when status changes
}

function useFilterQuery() {
  return useContext(FilterStateCtx).query;  // re-renders when query changes
}

function useFilterDispatch() {
  return useContext(FilterDispatchCtx);     // NEVER re-renders (dispatch is stable)
}

// ── 3. Memoized Row — won't re-render unless product changes ──────────────────

interface Product { id: string; name: string; status: 'active' | 'inactive'; price: number }

const ProductRow = memo(function ProductRow({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (id: string) => void;
}) {
  // 'why-did-you-render' hook for dev profiling
  return (
    <tr>
      <td>{product.name}</td>
      <td>{product.status}</td>
      <td>${product.price.toFixed(2)}</td>
      <td><button onClick={() => onSelect(product.id)}>View</button></td>
    </tr>
  );
}, (prev, next) =>
  // Custom comparator: only re-render if product data changes
  prev.product.id === next.product.id &&
  prev.product.name === next.product.name &&
  prev.product.status === next.product.status &&
  prev.product.price === next.product.price
  // NOTE: prev.onSelect intentionally excluded — we stabilize it with useCallback
);

// ── 4. Product Table — uses stable callbacks + memoized filtered data ─────────

function ProductTable({ products }: { products: Product[] }) {
  const status = useFilterStatus();   // only re-renders when status changes
  const query = useFilterQuery();     // only re-renders when query changes

  // Memoized: only recomputes when products, status, or query change
  const filtered = useMemo(() =>
    products.filter(p => {
      const statusMatch = status === 'all' || p.status === status;
      const queryMatch = p.name.toLowerCase().includes(query.toLowerCase());
      return statusMatch && queryMatch;
    }),
    [products, status, query]
  );

  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Stable reference: empty deps because setSelectedId is stable
  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  return (
    <table>
      <tbody>
        {filtered.map(p => (
          <ProductRow key={p.id} product={p} onSelect={handleSelect} />
        ))}
      </tbody>
    </table>
  );
}

// ── 5. Filter Controls — subscribe only to dispatch (never re-render on state) ─

function FilterControls() {
  const dispatch = useFilterDispatch(); // Never re-renders!

  // These handlers are stable (dispatch is stable)
  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch({ type: 'SET_STATUS', status: e.target.value as FilterState['status'] }),
    [dispatch]
  );

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({ type: 'SET_QUERY', query: e.target.value }),
    [dispatch]
  );

  return (
    <div>
      <select onChange={handleStatusChange}>
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <input onChange={handleQueryChange} placeholder="Search..." />
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"COMMA"**
- **C** — Context (split by change frequency — separate state from dispatch)
- **O** — Object/Array/Function (all create new references each render — must be memoized)
- **M** — Memo (React.memo for components — works only with stable props)
- **M** — Move state down (colocation reduces blast radius of state changes)
- **A** — Analyzer (React DevTools Profiler + why-did-you-render for diagnosis)

### The Golden Rule
```
React.memo alone is not enough.
useCallback alone is not enough.
They must be used TOGETHER:

React.memo(Child) + useCallback(handler) = no re-render
React.memo(Child) + inline function = re-render every time
```

### Analogy
Unnecessary re-renders are like a **PA system announcement** in an office. Without optimization, every announcement plays in every room (all components re-render). With context splitting and memo: critical announcements go to all rooms (state changes), but routine ones (typing indicators) only play in the kitchen (specific consumers). Muting rooms that don't need the announcement (React.memo) prevents disruption — but only if the announcement is correctly routed (stable references) in the first place.

---

## ✅ 7. Why & How Summary

- **Why it matters:** Unnecessary re-renders burn CPU on JavaScript execution + virtual DOM diffing even when the DOM output is identical; at scale (1,200-row tables, complex dashboards) this causes visible lag during user interactions — 147 re-renders/sec at SAP raised filter latency from 3ms to 12ms per frame
- **How it works:** React re-renders a component's function body when its own state changes, its parent re-renders, or its context value changes; `React.memo` short-circuits this if props are shallowly equal; `useCallback`/`useMemo` stabilize references so equality checks actually pass; context splitting limits which components subscribe to which state
- **How Hruday uses it:** Diagnosed with React DevTools Profiler + why-did-you-render; split SAP's monolithic context into four contexts; wrapped 1,200-row `ProductRow` in `React.memo` with custom price+status comparator; stabilized all event handlers with `useCallback` — filter interaction improved from 12ms to 3ms per frame

---

✅ Topic 175/486 complete → Continuing to Topic 176: Performance Budgets
