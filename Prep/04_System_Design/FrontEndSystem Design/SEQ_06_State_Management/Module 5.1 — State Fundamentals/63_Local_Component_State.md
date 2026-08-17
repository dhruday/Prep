# 63. Local Component State

## 1. High-Level Explanation (Frontend Interview Level)

**Local component state** is data that is owned, managed, and rendered exclusively by a single component — it is not shared with siblings, ancestors, or the global application state. It exists only for the lifetime of that component instance and is destroyed when the component unmounts. In React, this is `useState` / `useReducer`; in Angular, it is class properties with `ChangeDetectorRef`; in Vue, it is `ref()` / `reactive()`. Local state is the **first choice for any piece of state** — the principle of "keep state as local as possible" reduces unnecessary re-renders, simplifies component logic, and avoids the coupling that comes with shared or global state. State should only be lifted or promoted to global state when two or more unrelated components genuinely need to share it.

**Key Principle:** Start with local state. Lift only when necessary. Promote to global only when unavoidable.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### What Belongs in Local State

```
Good candidates for local state:
  ✅ UI toggle state: isOpen, isExpanded, isSelected
  ✅ Form field values (uncontrolled composition) in a self-contained form
  ✅ Hover/focus state (ephemeral, per-element)
  ✅ Animation/transition state (entering, exiting)
  ✅ Pagination cursor for a single table/list
  ✅ Active tab index within a TabGroup
  ✅ Loading / error state for a single component's data fetch

Bad candidates (should be lifted or globalised):
  ❌ Authentication status — needed everywhere
  ❌ Selected items that appear in a sidebar AND a details panel (different subtrees)
  ❌ Shopping cart count shown in the header AND the product page
  ❌ Theme preference (dark/light) — affects the entire UI
```

### State Batching and Synchronous Updates

React 18 batches ALL state updates by default — even inside async functions, setTimeout, and native event handlers:

```typescript
// React 18: both setters trigger ONE re-render (batched)
async function handleFetch() {
  const data = await fetchData();
  setData(data);       // batched
  setLoading(false);   // batched → single re-render
}

// React 17 and earlier: setState in async callback was NOT batched
// → two separate re-renders (now fixed in React 18 with automatic batching)
```

### Functional Updates — Avoiding Stale Closure

```typescript
// ❌ Stale closure — count inside the event listener captures old value
const [count, setCount] = useState(0);

useEffect(() => {
  const handler = () => setCount(count + 1); // ← stale: always "0 + 1 = 1"
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, []); // empty deps — never re-subscribes

// ✅ Functional update — uses latest state value, no stale closure
useEffect(() => {
  const handler = () => setCount((prev) => prev + 1); // ← always latest value
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, []);
```

### Lazy Initialisation — Expensive Initial State

```typescript
// ❌ Expensive computation runs on EVERY render (argument to useState evaluated each time)
const [data, setData] = useState(parseExpensiveData(rawData));  // runs every render!

// ✅ Lazy initialiser — runs ONLY on mount (once)
const [data, setData] = useState(() => parseExpensiveData(rawData));
```

### useReducer vs useState — The Decision Rule

```typescript
// Use useState for: independent, simple values
const [isOpen, setIsOpen] = useState(false);
const [search, setSearch] = useState('');

// Use useReducer for:
// - Multiple related state values that update together
// - Complex transition logic (state machine-like)
// - When next state depends on previous state in complex ways

type FilterState = {
  search: string;
  sortBy: 'price' | 'rating' | 'newest';
  page: number;
  category: string | null;
};

type FilterAction =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_SORT'; payload: FilterState['sortBy'] }
  | { type: 'SET_CATEGORY'; payload: string | null }
  | { type: 'NEXT_PAGE' }
  | { type: 'RESET' };

const initialState: FilterState = { search: '', sortBy: 'newest', page: 1, category: null };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, search: action.payload, page: 1 }; // reset page on new search
    case 'SET_SORT':
      return { ...state, sortBy: action.payload, page: 1 };
    case 'SET_CATEGORY':
      return { ...state, category: action.payload, page: 1 };
    case 'NEXT_PAGE':
      return { ...state, page: state.page + 1 };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

function ProductFilters() {
  const [filters, dispatch] = useReducer(filterReducer, initialState);

  return (
    <div>
      <input value={filters.search} onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })} />
      <button onClick={() => dispatch({ type: 'RESET' })}>Reset</button>
    </div>
  );
}
```

### Performance Implications

**Local state is the fastest state** — updates trigger re-renders only in the owning component subtree. Contrast with global state (Redux) which re-renders all subscribed components.

```
Local state update:
  Component A (owner) re-renders → only Component A's subtree affected

Global state update (Redux/Context):
  All subscribers of that slice re-render → potentially many components
```

**Common mistake: lifting state too eagerly**
```typescript
// ❌ Lifted to parent unnecessarily — every sibling re-renders on tooltip hover
function ProductCard() {
  const [tooltipOpen, setTooltipOpen] = useProductState(); // in parent

// ✅ Keep tooltip state local — only tooltip and its children re-render
function Tooltip({ content, children }) {
  const [isVisible, setIsVisible] = useState(false); // local — no siblings affected
```

---

## 3. Real-World Examples

**At Hruday's level (SAP UI5):**
In SAPUI5, local component state is managed through model binding scoped to the component's view: `var oModel = new sap.ui.model.json.JSONModel(data); this.getView().setModel(oModel, 'viewModel')`. The pattern is identical to local React state — the model exists for the view's lifetime, is not shared, and is destroyed on view destroy. Migrating from UI5 to React at SAP, local `useState` maps directly to view-scoped JSONModel.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "Local state is data owned entirely by one component — UI toggles, form field values, animation state, hover state. The first principle is 'keep state as local as possible': local state has no coupling, causes minimal re-renders (only the owning component and its subtree), and is self-contained. I use `useState` for simple independent values and `useReducer` when state transitions are complex or multiple pieces of state always change together — a filter panel with search, sort, category, and page is a single reducer, not four separate `useState` calls. The most common local state mistake is lifting state too eagerly: if a tooltip's open/close is local to that tooltip, lifting it to a parent just to make it 'accessible' forces the parent and all its children to re-render on every tooltip toggle."

**Likely Follow-up Questions:**
1. When should you lift state? → When two sibling components (or non-parent-child components) need to share and synchronise the same value — lift to their lowest common ancestor
2. What is the difference between controlled and uncontrolled components? → Controlled: parent owns the value via `value` + `onChange` (controlled by React state); Uncontrolled: DOM owns the value, accessed via `ref.current.value` — use uncontrolled for one-off form submissions where you don't need to sync the input value on every keystroke
3. Does React.StrictMode affect local state? → In Strict Mode (development only), React intentionally double-invokes state initialisers and render functions to expose side effects; this doesn't affect production but can cause confusing double renders during development

---

## 5. Code Example

```typescript
// Complete local state example: collapsible card with lazy-initialised content
function CollapsibleCard({ title, loadContent }: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Lazy initialiser for potentially expensive initial ID generation
  const [id] = useState(() => `card-${Math.random().toString(36).slice(2)}`);

  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={`panel-${id}`}
      >
        {title}
        <ChevronIcon direction={isOpen ? 'up' : 'down'} />
      </button>
      
      <div id={`panel-${id}`} hidden={!isOpen} role="region">
        {/* Only renders content when open — lazy loading */}
        {isOpen && <CardContent loader={loadContent} />}
      </div>
    </div>
  );
}
```

---

## 6. Memory Aid

**Mental Model:** Local state is a **sticky note on your own desk**. You can read it, change it, and tear it up whenever you want. No one else needs to know about it. If two people need to see the same note, you put it on a whiteboard (lifted/shared state).

**Keep state as local as possible.** Lift when two component subtrees genuinely need it. Promote to global when lifting creates unreasonable prop-drilling depth (3+ levels is the usual threshold).

---

## 7. Why & How Summary

**Why it matters:**
→ Performance: Local state updates cause the smallest possible re-render scope
→ Architecture: Local state = zero coupling; if a component uses only local state, it can be moved anywhere in the tree without consequences
→ Simplicity: Debugging is trivially easy — the state is right there in the component

**How it works:**
React `useState` returns a state value and a setter; the setter enqueues a re-render of that component's subtree. React 18 batches all state updates (including async) into a single re-render per event cycle. `useReducer` is the same mechanism with a reducer function replacing the direct value setter, enabling complex state transitions with a single dispatch call.

**Company relevance:**
- Microsoft: React-based components in Azure DevOps and Teams use local state extensively for UI interactions; understanding functional updates and lazy initialisation is expected
- Adobe: Photoshop-on-web tool state (active tool, zoom level, selection state) is local to the canvas component — local state architecture is critical
- Salesforce: LWC reactive properties (`@track`) are the Salesforce equivalent of local component state — same mental model
- Cisco: Angular components in Webex use `ChangeDetectionStrategy.OnPush` with local reactive state via Signals/BehaviorSubject — directly analogous
