# 74. Avoiding Over-Global State

## 1. High-Level Explanation (Frontend Interview Level)

**Over-global state** is the anti-pattern of putting everything — including ephemeral UI state, component-local form values, hover effects, and scroll positions — into a global store like Redux. The result: a bloated store, unnecessary re-renders across unrelated parts of the tree, harder debugging, and cascading complexity where a simple toggle requires an action, reducer case, and selector. The principle is **co-location**: state should live as close to where it is used as possible. The decision tree: Can this state live in a single component? → `useState`. Does it need to be shared between two siblings? → Lift to their nearest common ancestor. Is it used across a subtree? → Context. Is it truly application-wide and cross-cutting? → Global store. Is it server data? → Cache-based state (TanStack Query / RTK Query).

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### State Co-location Spectrum

```
                  Nearest → Most Specific
                  
  Component State     Lifted State     Context     Global Store (Redux/Zustand)
  ─────────────────────────────────────────────────────────────────────────────
  Best for:           Best for:        Best for:   Best for:
  - Toggle open/close - Shared form    - Theme      - Auth user
  - Form input value  - Selected item  - i18n       - Shopping cart
  - Hover state       - Modal state    - Feature    - WebSocket connection
  - Scroll position   - Tab selection    flags      - Multi-screen workflow
  - Loading state     - Two sibling    - Current    - Cross-app shared data
  - Error messages      components       user (if
                        sharing state    low-update)
                        
  Anti-patterns (wrong level):
  ❌ Accordion open state in Redux
  ❌ Search input value in global store
  ❌ Table column sort state in Redux (unless URL-syncable)
  ❌ Tooltip visibility in NgRx store
```

### Over-Global State Symptoms

```typescript
// Symptom 1: Dozens of trivial actions
// actions.ts:
export const setSearchInputValue = createAction('[SearchBar] Set Input Value');
export const setDropdownOpen = createAction('[Dropdown] Set Open');
export const setTooltipVisible = createAction('[Tooltip] Set Visible');
// → All three should be useState inside their components

// Symptom 2: Reducer with trivial toggle logic
on(setDropdownOpen, (state, { open }) => ({ ...state, isDropdownOpen: open })),
// → This is a useState<boolean> in a component

// Symptom 3: Selectors for leaf-level UI state
export const selectIsSearchOpen = createSelector(state, s => s.ui.searchBar.isOpen);
// → If only SearchBar reads this, it should be component-local
```

### The Decision Framework — State Placement Rules

```
Ask: WHO needs this state?

1. Only one component uses it?
   → useState (or useReducer if complex internal logic)
   
2. Parent + child need it?
   → Prop-passing (not lifting to global store)
   
3. Siblings need shared state?
   → Lift to their nearest common ancestor (useState in parent)
   
4. A subtree / section of the app needs it?
   → React Context (or Angular service + BehaviorSubject)
   → Keep Context update frequency low — all consumers re-render on every Context value change
   
5. Multiple unrelated parts of the app need it AND it changes frequently?
   → Zustand atom, Jotai atom, or Redux slice
   
6. It's server-derived data?
   → TanStack Query / RTK Query (NOT in global store)
```

### React Context Pitfall — Every Consumer Re-Renders

```typescript
// ❌ Bad: Combining high-frequency state with low-frequency state in one context
const AppContext = createContext<{
  user: User;              // changes rarely
  theme: Theme;            // changes rarely
  searchValue: string;     // changes on every keystroke!
  isNavOpen: boolean;      // changes on click
}>({ ... });

// Every component consuming AppContext re-renders on every keystroke in SearchBar

// ✅ Fix: Split by update frequency
const UserContext = createContext<User | null>(null);    // rarely changes
const ThemeContext = createContext<Theme>('light');       // rarely changes
const SearchContext = createContext<{ value: string; onChange: ... }>(null);

// Only SearchBar and SearchResults consume SearchContext
// UserContext consumers don't re-render on search
```

### Zustand — Atomic Global State Without Redux Ceremony

```typescript
import { create } from 'zustand';

// Zustand: no actions, no reducers, no action types
interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  totalPrice: () => number;
}

const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter(i => i.id !== id),
    })),
  // Computed/derived value as method
  totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));

// Component subscribes to specific slice — partial subscription
// Only re-renders when items.length changes (not on ANY cart update)
function CartCount() {
  const count = useCartStore((state) => state.items.length);  // selector
  return <Badge>{count}</Badge>;
}

// vs Global Redux: CartCount now needs mapStateToProps/useSelector + action + reducer
```

### Jotai — Atomic Granular State (React-Specific)

```typescript
import { atom, useAtom, useAtomValue } from 'jotai';

// Atoms: the smallest unit of state
const userAtom = atom<User | null>(null);
const themeAtom = atom<'light' | 'dark'>('light');

// Derived atoms: recompute only when dependencies change
const isDarkAtom = atom((get) => get(themeAtom) === 'dark');

// Read-only derived atom
const userNameAtom = atom((get) => get(userAtom)?.name ?? 'Guest');

// Write-only action atom
const updateThemeAtom = atom(null, (get, set, newTheme: 'light' | 'dark') => {
  set(themeAtom, newTheme);
  localStorage.setItem('theme', newTheme);              // side effect inside atom
});

// Family atoms: per-entity state (replaces Entity Adapter for simple cases)
const itemAtomFamily = atomFamily((id: string) =>
  atom<CartItem | null>(null)
);

// Component: only subscribes to atoms it reads
function Navbar() {
  const isDark = useAtomValue(isDarkAtom);    // only re-renders when isDark changes
  return <nav className={isDark ? 'dark' : 'light'}>...</nav>;
}
```

---

## 3. Real-World Examples

**Airbnb's refactor (2018):** Airbnb had accumulated ~200 Redux reducers, including trivial state like which tooltip was open and what the current date picker hovered date was. The refactor removed 60% of Redux state by moving hover/picker/tooltip state to component-level `useState`. Result: 30% reduction in unrelated re-renders, faster page transition.

**Linear (project management):** Linear uses a layered approach: `useState` for modal visibility, React Context for the current workspace, Zustand for the navigation panel state, TanStack Query for all issue data. No server data in Zustand — the separation is strict.

**At Hruday's SAP Labs context:** In SAP Analytics Cloud's story editor, the "currently hovered widget" and "drag preview position" state lived in a global Flux store, causing every widget to re-render on hover. Moving these to a single component-level `useRef` (for drag position) and `useState` (for hover) eliminated the cascade — a 5x render performance improvement during drag operations.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "Over-global state is one of the most common performance and maintainability problems in large SPA codebases. My decision framework: component state first (`useState`) → lift when siblings need it → Context for low-frequency subtree state (user, theme) → global store only for truly cross-cutting, high-frequency state (cart, auth). The critical mistake is putting server data in Redux when TanStack Query / RTK Query would manage it better. Context pitfall: mixing high-frequency state (search input) with low-frequency state (theme) in one context causes every consumer to re-render on keystroke — split contexts by update frequency. Zustand over Redux for smaller state needs — no actions/reducers ceremony while still having subscription-level reactivity."

**Likely Follow-up Questions:**
1. How do you refactor over-global state in an existing codebase? → Start by auditing which global state has fewer than 2 consumers — move to component state first. Then look for server data in the store — extract to TanStack Query. Finally, split high/low frequency Context. Don't big-bang refactor; feature-by-feature isolation.
2. Can React Context replace Redux? → For low-update-frequency state yes — auth user, theme, i18n. For high-update-frequency state no — Context re-renders all consumers on every change, no subscription selectivity. Redux/Zustand allow subscribing to a specific slice (selector), so unrelated components skip re-renders.
3. What is prop drilling vs context? → Prop drilling: passing state/callbacks through intermediate components that don't use the data themselves — creates coupling and verbosity. Context: implicit global broadcast to any consumer in the subtree — avoids drilling but all consumers re-render on change. Neither is always better; use props for shallow trees (2-3 levels), Context for deeper sharing.

---

## 5. Code Example

```typescript
// Refactoring over-global state: before and after

// ❌ Before: modal state in Redux
// Store:
const uiReducer = createReducer(initialState, {
  [openDeleteModal.type]: (state, { payload }) => {
    state.deleteModal.isOpen = true;
    state.deleteModal.targetId = payload.id;
  },
  [closeDeleteModal.type]: (state) => {
    state.deleteModal.isOpen = false;
  },
});
// Component:
const isOpen = useSelector(state => state.ui.deleteModal.isOpen);
const dispatch = useDispatch();
// ...
<Button onClick={() => dispatch(openDeleteModal({ id: product.id }))}>Delete</Button>

// ✅ After: modal state in component
function ProductRow({ product }: { product: Product }) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const deleteProduct = useMutation({ mutationFn: api.products.delete, ... });
  
  return (
    <>
      <Button onClick={() => setDeleteModalOpen(true)}>Delete</Button>
      {deleteModalOpen && (
        <DeleteConfirmModal
          onConfirm={() => { deleteProduct.mutate(product.id); setDeleteModalOpen(false); }}
          onCancel={() => setDeleteModalOpen(false)}
        />
      )}
    </>
  );
}
// → Zero Redux involvement, zero re-renders in other components
```

---

## 6. Memory Aid

**The state placement ladder:** Component → Lift → Context → Global Store → Query Cache

**One rule to remember:** If only ONE component reads and writes a piece of state, it belongs inside that component — always, no exceptions.

---

## 7. Why & How Summary

**Why it matters:** Over-global state creates performance problems (unnecessary re-renders on unrelated state changes), maintenance problems (state changes in part A have unexpected effects in part B), and onboarding problems (new developers don't know where to put new state, so everything goes to the global store). Proper state colocation makes the codebase more modular and easier to reason about.

**How it works:** Each state level has a different scope of impact: `useState` affects only the owning component; lifted state affects the lifted component and its subtree; Context affects all consumers (re-rendering all on change); global store allows selective subscription with selector functions (only re-renders when the selected slice changes); query cache propagates updates to all observers of the same query key.

**Company relevance:**
- Microsoft: Teams' React components follow strict state colocation guidelines — UI state local, shared state in hooks, server state in TanStack Query
- Adobe: Creative Cloud component library enforces state colocation in its design system — component encapsulate their own open/close state
- Salesforce: Lightning Web Components enforce component-level encapsulation — state in private properties, only exposed via events; a natural guard against over-global state
- Cisco: Meraki React dashboards reduced Redux bundle by 40% by extracting ephemeral filter/sort UI state from the global store
