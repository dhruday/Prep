# 136. Local Component State
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Local component state is the simplest unit of state in React — data that lives inside a component and affects only that component's rendering. It's managed with `useState` for simple values and `useReducer` for related state transitions. The key decision is scope: if state is only consumed inside one component or its direct children, it belongs locally. Lifting state higher when it doesn't need to be higher is the most common cause of unnecessary re-renders in React apps. I follow the rule: keep state as close to where it's used as possible, only lift when two or more sibling components genuinely need the same piece of state.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Local state is React's fundamental unit of reactivity — a piece of memory that React manages for a component instance. When state changes, React schedules a re-render of that component and its subtree. State is local to one component instance: two instances of the same component each have independent state.

```typescript
// useState — the foundation
function Counter() {
  const [count, setCount] = useState(0);  // count is local to this Counter instance
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// Two independent instances — each has its own count
<Counter />  // count = 0
<Counter />  // count = 0 — separate memory, separate state
```

### How It Works Internally

React stores state in the **Fiber node** of the component — a linked list of "hooks" in the order they were called. `useState` is a hook slot: on first render it stores the initial value, on subsequent renders it returns the current value from that same slot. This is why hooks must be called in the same order every render — the hook identity is position-based, not name-based.

```typescript
// What React is doing under the hood (conceptual):
fiber.memoizedState = {
  queue: { pending: null },
  memoizedState: 0,  // the current count
  next: { /* next hook */ }
};

// useState is really: hook #1 → hook #2 → hook #3...
// If you conditionally call a hook, the order shifts → wrong state assigned to wrong hook
```

### When to Use `useState` vs `useReducer`

```typescript
// useState: simple, independent values
const [isOpen, setIsOpen] = useState(false);
const [inputValue, setInputValue] = useState('');
const [page, setPage] = useState(1);

// useReducer: related state that transitions together
// If you find yourself writing multiple setters that must change atomically, use useReducer

// ❌ Fragile with useState — all 3 must change at once for consistency
const [isLoading, setIsLoading] = useState(false);
const [data, setData] = useState<User[] | null>(null);
const [error, setError] = useState<Error | null>(null);

// When fetch completes, need 3 synchronized updates:
setIsLoading(false);
setData(users);
setError(null);
// React 18 auto-batches this, but intent is still unclear — can set partial state

// ✅ useReducer: transitions are explicit and atomic
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

type FetchAction<T> =
  | { type: 'fetch' }
  | { type: 'success'; data: T }
  | { type: 'error'; error: Error };

function fetchReducer<T>(state: FetchState<T>, action: FetchAction<T>): FetchState<T> {
  switch (action.type) {
    case 'fetch':   return { status: 'loading' };
    case 'success': return { status: 'success', data: action.data };
    case 'error':   return { status: 'error', error: action.error };
    default:        return state;
  }
}

function useUsers() {
  const [state, dispatch] = useReducer(fetchReducer<User[]>, { status: 'idle' });

  const fetchUsers = useCallback(async () => {
    dispatch({ type: 'fetch' });
    try {
      const users = await api.getUsers();
      dispatch({ type: 'success', data: users });
    } catch (e) {
      dispatch({ type: 'error', error: e as Error });
    }
  }, []);

  return { state, fetchUsers };
}
```

### State Co-location — The Core Principle

```typescript
// ❌ ANTI-PATTERN: Modal state living at app root level
// Every child re-renders when modal opens/closes
function App() {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  return (
    <>
      <Header />        {/* re-renders on modal open */}
      <Sidebar />       {/* re-renders on modal open */}
      <ProductList onEdit={() => setIsProductModalOpen(true)} />
      <NavigationBar /> {/* re-renders on modal open */}
      {isProductModalOpen && <ProductModal onClose={() => setIsProductModalOpen(false)} />}
    </>
  );
}

// ✅ Co-locate: modal state lives where it's used
function ProductList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <>
      {products.map(p => (
        <ProductCard key={p.id} product={p} onEdit={() => setIsModalOpen(true)} />
      ))}
      {isModalOpen && <ProductModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
// Now Header, Sidebar, NavigationBar never re-render when modal opens
```

### Derived State — Don't Duplicate It in State

```typescript
// ❌ Storing derived values in state causes sync bugs
function ProductFilter({ products }: { products: Product[] }) {
  const [search, setSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products); // ANTI-PATTERN

  // The synchronization problem: these two must always stay in sync
  const handleSearch = (value: string) => {
    setSearch(value);
    setFilteredProducts(products.filter(p => p.name.includes(value)));
  };
  // What if products prop changes? filteredProducts is now stale.

  return <input value={search} onChange={e => handleSearch(e.target.value)} />;
}

// ✅ Derive during render — single source of truth
function ProductFilter({ products }: { products: Product[] }) {
  const [search, setSearch] = useState('');
  // Derived — computes fresh every render from the two sources of truth
  const filteredProducts = useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  return (
    <>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <ProductGrid products={filteredProducts} />
    </>
  );
}
```

### Lazy Initializer — Expensive Initial Values

```typescript
// ❌ Runs on every render (function called, result discarded)
const [filters, setFilters] = useState(parseURLParams(window.location.search));

// ✅ Lazy initializer: function is called only once on mount
const [filters, setFilters] = useState(() => parseURLParams(window.location.search));
// The () => wrapper is the lazy form — React calls the function only on first render
```

### Architecture & Component Boundaries

```typescript
// The state decision tree:
// 1. Used ONLY in this component → useState / useReducer locally
// 2. Used in THIS + direct child → pass as prop
// 3. Used in distant descendants → Context (if read-heavy, low-change-frequency)
// 4. Used across multiple disconnected branches + mutates often → global store (Zustand/Redux)
// 5. Fetched from server → TanStack Query (not useState + useEffect)

// Red flags that state should be lifted or externalized:
// - Passing props through 3+ levels to reach consumer (prop drilling)
// - Multiple components "copying" the same value into their own useState
// - Sibling components needing to read each other's state
// - State that persists across unmount/remount (e.g., back-navigation preservation)
```

### Performance Implications

```typescript
// Re-render boundary: state update re-renders the component that holds it + its subtree
// EVERY child in the subtree re-renders by default (React.memo opt-out)

// SAP context: Dashboard with 40+ widgets — if dashboard holds all widget state,
// one widget's expand/collapse causes all 40 to re-render.
// Fix: each widget owns its own open/close state → only that widget re-renders.

// Measure: useState dispatch in React DevTools Profiler shows exactly which
// state update caused which render. Look for "parent re-rendered" as cause.
```

### Trade-offs

| Local State | Lifted State | Context / Global |
|---|---|---|
| Zero overhead, minimal re-renders | Required for sibling sharing | For deep cross-component sharing |
| Not accessible from outside | May cause unnecessary re-renders in middle layers | Re-renders all consumers on change |
| Correct default choice | Explicit data flow | Use when local + lifted don't work |

### ⚠️ Anti-Patterns & Pitfalls

- **Storing derived values in state** — creates sync bugs; instead, compute during render
- **Initializing state from props without `key`** — `useState(props.value)` only runs once; future prop changes are ignored. Either derive from props or reset with `key` prop
- **Deep object mutations** — `state.count++; setState(state)` doesn't trigger re-render because reference is same; always create new references: `setState({ ...state, count: state.count + 1 })`
- **Too high co-location** — storing UI state (modal open/closed, tab selected) in Redux/global store adds unnecessary boilerplate; UI-only state belongs locally

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the analytics dashboard had a performance problem traced to a single `isFilterPanelOpen` boolean living at the root App component. This caused 40+ widgets to re-render on every panel open/close — measured at 380ms render time. Moving `isFilterPanelOpen` into the `FilterPanel` component's own state (since nothing outside it needed to know) reduced that action to 12ms re-render. No user-facing change, purely co-location discipline.

**At FAANG scale:**
- **Microsoft:** Azure Portal uses local state for panel open/close, scroll position, hover states — each blade is a co-located unit; global state only for cross-blade concerns like user identity and subscription context
- **Adobe:** Lightroom Web — per-image edit state (crop handles, slider positions) lives locally in each `ImageEditPanel`; lifting it to an album-level store would cause every thumbnail to re-render on each slider drag
- **Salesforce:** Record detail page — inline field edit mode (show/hide edit input) is local to each `Field` component; only the committed value goes to global state when saved
- **Cisco:** Network topology — each `NodeWidget` owns its own `isExpanded` state; the 300-node canvas doesn't re-render all nodes when one expands

**How it evolves with scale:**
- Small scale (< 10 components): useState freely, co-location not yet a concern
- Medium scale (50+ components): start auditing — is each piece of state at the lowest possible level?
- Large scale (200+ components): co-location becomes a primary performance tool; every time you reach for a global store, ask if it's truly needed

---

## 💬 4. Interview Execution

### Sample Answer

> "Local state is React's most atomic unit of reactivity — state scoped to a single component instance, managed with `useState` for simple values and `useReducer` for state with related transitions. The key engineering discipline is co-location: always place state at the lowest component level that needs it.
>
> At SAP I debugged a dashboard where a modal open/close boolean was stored at the App root, causing 40+ widgets to re-render on every modal toggle — 380ms render cost. Moving it into the component that actually rendered the modal collapsed that to 12ms. No API change, no refactor — just correct state placement.
>
> The rule I follow: state goes local first. It lifts only when two or more siblings need the same value. It goes to Context when lifting causes prop-drilling through three or more layers. It goes to a global store only when it truly crosses independent component trees, needs to persist across navigation, or changes frequently while being read in many places. Most UI state — tab selection, panel open/close, hover states, form field values — should never leave the component."

### Likely Follow-up Questions
1. "When would you lift state?" → When two siblings need to read/write the same piece of data
2. "Difference between useState and useReducer?" → useReducer for multiple related state transitions that must stay consistent
3. "How does React know which useState belongs to which hook call?" → Position-based linked list in Fiber — hooks must run in same order every render
4. "How do you initialize state from an async source?" → Don't — use `useEffect` to set state after mount, or TanStack Query for server data
5. "What's the danger of initializing state from props?" → Only runs once; future prop changes ignored — either derive or use `key` to reset

### vs Alternatives

| Local `useState` | Global Store (Zustand/Redux) | Context |
|---|---|---|
| Zero re-renders outside component | Re-renders all store subscribers | Re-renders all context consumers |
| Great for UI state | Great for cross-component app state | Good for low-frequency, read-heavy state |
| No setup overhead | Setup + action/selector overhead | Simple setup, no action boilerplate |

---

## 💻 5. Code Example

```typescript
// Complete example: form with local state, useReducer for related state,
// lazy initializer, and proper derived state pattern

type FormData = { name: string; email: string; role: 'admin' | 'viewer' };
type FormState =
  | { status: 'idle'; data: FormData }
  | { status: 'submitting'; data: FormData }
  | { status: 'success' }
  | { status: 'error'; message: string; data: FormData };

type FormAction =
  | { type: 'update'; field: keyof FormData; value: string }
  | { type: 'submit' }
  | { type: 'success' }
  | { type: 'error'; message: string };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'update':
      if (state.status === 'success') return state;
      return { ...state, data: { ...(state as any).data, [action.field]: action.value } };
    case 'submit':
      return { status: 'submitting', data: (state as any).data };
    case 'success':
      return { status: 'success' };
    case 'error':
      return { status: 'error', message: action.message, data: (state as any).data };
    default:
      return state;
  }
}

// Lazy initializer: parse URL params only on mount
function getInitialForm(): FormState {
  const params = new URLSearchParams(window.location.search);
  return {
    status: 'idle',
    data: {
      name: params.get('name') ?? '',
      email: params.get('email') ?? '',
      role: (params.get('role') as FormData['role']) ?? 'viewer',
    }
  };
}

export function UserForm({ onSave }: { onSave: (data: FormData) => Promise<void> }) {
  // useReducer: all form state transitions in one place
  const [state, dispatch] = useReducer(formReducer, undefined, getInitialForm);

  // Derived state: no separate useState for isValid — computed from state
  const isValid = state.status !== 'success' &&
    (state as any).data?.name?.length > 0 &&
    (state as any).data?.email?.includes('@');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.status !== 'idle' && state.status !== 'error') return;
    dispatch({ type: 'submit' });
    try {
      await onSave((state as any).data);
      dispatch({ type: 'success' });
    } catch (err) {
      dispatch({ type: 'error', message: (err as Error).message });
    }
  };

  if (state.status === 'success') {
    return <p role="status">User saved successfully.</p>;
  }

  const data: FormData = (state as any).data;

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={data.name}
        onChange={e => dispatch({ type: 'update', field: 'name', value: e.target.value })}
        disabled={state.status === 'submitting'}
        aria-label="Full name"
      />
      <input
        type="email"
        value={data.email}
        onChange={e => dispatch({ type: 'update', field: 'email', value: e.target.value })}
        disabled={state.status === 'submitting'}
        aria-label="Email address"
      />
      {state.status === 'error' && (
        <p role="alert">{state.message}</p>
      )}
      <button type="submit" disabled={!isValid || state.status === 'submitting'}>
        {state.status === 'submitting' ? 'Saving…' : 'Save user'}
      </button>
    </form>
  );
}
```

---

## 🧠 6. Memory Aid

**Co-location Rule — LULG:**
- **L**ocal first (default)
- **U**p only when siblings share it
- **L**ift to context when 3+ layers deep
- **G**lobal store only when truly cross-tree

**useState vs useReducer decision:**
- One value that's independent → `useState`
- Multiple values that transition together → `useReducer`
- State machine with explicit transitions → `useReducer`

**Derived state mantra:** "If it can be computed from existing state + props, don't store it — derive it."

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Co-location is the most impactful and cheapest performance technique in React — requires zero new dependencies, no refactoring, just moving state to the right level; framing this with the SAP dashboard 380ms→12ms improvement shows you recognize state placement as an architectural concern, not just a code style preference
→ `useReducer` with discriminated union state types eliminates entire categories of bugs: you can never have `{ status: 'loading', error: someError }` or `{ status: 'success', data: null }` because the type system prevents those impossible states — this is the "make impossible states impossible" principle that staff engineers discuss
→ The lazy initializer pattern (`useState(() => expensiveFn())`) is a frequently missed optimization — `useState(expensiveFn())` (without the arrow function) calls `expensiveFn` on every render and discards the result; showing you know the difference signals deep hooks knowledge

**How it works (2 sentences):**
React stores component state in a linked list of hook slots inside the component's Fiber node — each `useState`/`useReducer` call corresponds to a numbered slot, and React matches them to the correct hook across re-renders by position, which is why hooks must always execute in the same order (no conditionals, no early returns before hooks).
When `setState` or `dispatch` is called, React schedules a re-render by marking the component's Fiber as dirty in the work loop, then during the next render pass computes the new state via the update queue, runs the component function with the new state, diffs the resulting React element tree against the previous (reconciliation), and commits only the actual DOM changes that differ.

---
✅ Topic 136/486 complete → Continuing to Topic 137: Global State Management
