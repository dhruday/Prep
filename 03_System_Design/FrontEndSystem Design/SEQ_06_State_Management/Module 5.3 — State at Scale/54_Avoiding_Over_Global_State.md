# Topic 43: Avoiding Over-Global State

## Table of Contents
1. [High-Level Overview](#1-high-level-overview)
2. [Deep-Dive Explanation](#2-deep-dive-explanation)
3. [Real-World Examples](#3-real-world-examples)
4. [Interview-Oriented Explanation](#4-interview-oriented-explanation)
5. [Code Examples & Implementation](#5-code-examples--implementation)
6. [Why & How Summary](#6-why--how-summary)

---

## 1. High-Level Overview

### What is Over-Global State?

**Over-global state** occurs when developers put **too much state in global stores** (Redux, Zustand, Context) that should instead be **local component state**. This is one of the most common anti-patterns in modern React applications, leading to unnecessary complexity, poor performance, and maintenance nightmares.

```typescript
// ❌ OVER-GLOBAL STATE: Everything in Redux
const globalState = {
  // Server data (appropriate for global state)
  users: { ... },
  posts: { ... },
  
  // UI state that should be local (ANTI-PATTERN!)
  isModalOpen: false,           // ← Only one component needs this
  selectedTabIndex: 0,          // ← UI ephemeral state
  formInputValues: { ... },     // ← Form local state
  mousePosition: { x: 0, y: 0 },// ← Transient UI state
  isHovering: false,            // ← Component-specific
  expandedAccordionIds: [],    // ← UI state
  tooltipVisible: false         // ← Ephemeral state
};

// ✅ APPROPRIATE STATE DISTRIBUTION
const globalState = {
  // Only shared, persistent data
  users: { ... },
  posts: { ... },
  currentUserId: 'user-123',
  theme: 'dark'
};

// Component local state
function Modal() {
  const [isOpen, setIsOpen] = useState(false); // ← Local!
  const [selectedTab, setSelectedTab] = useState(0); // ← Local!
}
```

### The "Redux for Everything" Anti-Pattern

```
TYPICAL EVOLUTION (ANTI-PATTERN):
┌────────────────────────────────────────────────────────────┐
│ PHASE 1: Learn Redux                                       │
│ └─ "Redux is great for state management!"                  │
│                                                            │
│ PHASE 2: Use Redux for Everything                          │
│ ├─ Modal open/closed → Redux                               │
│ ├─ Form inputs → Redux                                     │
│ ├─ Hover states → Redux                                    │
│ └─ "Everything is state, so everything goes in Redux!"     │
│                                                            │
│ PHASE 3: Pain Points Emerge                                │
│ ├─ 500 lines of boilerplate for simple modal               │
│ ├─ Every keystroke dispatches Redux action                 │
│ ├─ Entire app re-renders on form input change              │
│ ├─ Redux DevTools has 10,000 actions for simple form       │
│ └─ "Why is our app so slow?"                               │
│                                                            │
│ PHASE 4: Realization                                       │
│ └─ "Maybe not everything needs to be in Redux..."          │
│                                                            │
│ PHASE 5: Proper State Distribution                         │
│ ├─ Global state: Shared, persistent data                   │
│ ├─ Local state: Component-specific, ephemeral              │
│ └─ App is fast, code is simple, team is happy              │
└────────────────────────────────────────────────────────────┘
```

### Why Over-Global State is Problematic

```
┌────────────────────────────────────────────────────────────┐
│              PROBLEMS WITH OVER-GLOBAL STATE                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 1. PERFORMANCE DEGRADATION                                 │
│    • Every state change triggers global re-render check    │
│    • Components re-render unnecessarily                    │
│    • React's optimization bypassed                         │
│    • Form inputs become sluggish (keystroke lag)           │
│                                                            │
│ 2. MASSIVE BOILERPLATE                                     │
│    • Simple modal: 5 lines → 50 lines                      │
│    • Actions, reducers, selectors for trivial state        │
│    • 10x code for same functionality                       │
│    • Development velocity tanks                            │
│                                                            │
│ 3. DEBUGGING NIGHTMARE                                     │
│    • Redux DevTools flooded with UI actions                │
│    • "MOUSE_MOVED" action 1000 times                       │
│    • Signal-to-noise ratio destroyed                       │
│    • Hard to find actual state bugs                        │
│                                                            │
│ 4. STATE POLLUTION                                         │
│    • Unmounted components leave state behind               │
│    • Memory leaks from forgotten state cleanup             │
│    • Stale state from previous component instances         │
│    • "Why is modal already open on mount?"                 │
│                                                            │
│ 5. TESTING COMPLEXITY                                      │
│    • Simple component tests need Redux store               │
│    • Mock entire global state for trivial test             │
│    • Integration tests instead of unit tests               │
│    • Test setup: 10 lines → 100 lines                      │
│                                                            │
│ 6. REUSABILITY DESTROYED                                   │
│    • Component tightly coupled to global store             │
│    • Can't reuse in different app (Redux dependency)       │
│    • Can't have multiple instances (shared global state)   │
│    • Component becomes non-portable                        │
│                                                            │
│ 7. OVER-ENGINEERING                                        │
│    • Simple problems solved with complex machinery         │
│    • Team velocity slows down                              │
│    • Onboarding new devs takes longer                      │
│    • "Why is this so complicated?"                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### State Classification Framework

```
┌────────────────────────────────────────────────────────────┐
│                STATE CLASSIFICATION                         │
└────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ GLOBAL STATE (Redux/Zustand/Context)                    │
├─────────────────────────────────────────────────────────┤
│ ✓ Shared across many components                         │
│ ✓ Persists across page navigation                       │
│ ✓ Needs to survive component unmount                    │
│ ✓ Requires global access                                │
│ ✓ Represents application domain data                    │
│                                                         │
│ Examples:                                               │
│ • Current user data                                     │
│ • Authentication token                                  │
│ • Global theme (dark/light)                             │
│ • User preferences                                      │
│ • Cached API data                                       │
│ • Shopping cart                                         │
│ • Notifications                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ LOCAL STATE (useState/useReducer)                       │
├─────────────────────────────────────────────────────────┤
│ ✓ Only one component (and children) need it             │
│ ✓ Ephemeral (doesn't outlive component)                 │
│ ✓ UI state (visual representation)                      │
│ ✓ Form state (input values)                             │
│ ✓ Component-specific interaction state                  │
│                                                         │
│ Examples:                                               │
│ • Modal open/closed                                     │
│ • Dropdown expanded                                     │
│ • Form input values                                     │
│ • Selected tab index                                    │
│ • Hover state                                           │
│ • Loading spinners                                      │
│ • Tooltip visibility                                    │
│ • Accordion expanded/collapsed                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ URL STATE (Query params, route params)                  │
├─────────────────────────────────────────────────────────┤
│ ✓ Should be shareable (bookmark, link)                  │
│ ✓ Affects what content is displayed                     │
│ ✓ Navigation-related                                    │
│ ✓ Filters, pagination, search                           │
│                                                         │
│ Examples:                                               │
│ • Current page number                                   │
│ • Search query                                          │
│ • Active filters                                        │
│ • Selected resource ID                                  │
│ • Sort order                                            │
│ • Tab selection (if shareable)                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ SERVER STATE (React Query/SWR/Apollo)                   │
├─────────────────────────────────────────────────────────┤
│ ✓ Data from API                                         │
│ ✓ Asynchronous                                          │
│ ✓ Can become stale                                      │
│ ✓ Shared across components                              │
│                                                         │
│ Examples:                                               │
│ • User profiles                                         │
│ • Post data                                             │
│ • Comments                                              │
│ • Product catalog                                       │
│ • Analytics data                                        │
└─────────────────────────────────────────────────────────┘
```

### Decision Tree

```
┌────────────────────────────────────────────────────────────┐
│           WHERE SHOULD THIS STATE LIVE?                     │
└────────────────────────────────────────────────────────────┘

START HERE:
├─ Is this data from an API?
│  ├─ YES → React Query/SWR (Server State) ✓
│  └─ NO → Continue...
│
├─ Is this a URL parameter (page, filter, search)?
│  ├─ YES → URL State (query params) ✓
│  └─ NO → Continue...
│
├─ Do multiple unrelated components need this?
│  ├─ YES → Continue...
│  │  ├─ Is it persistent (survives unmount)?
│  │  │  ├─ YES → Global State (Redux/Zustand) ✓
│  │  │  └─ NO → Local State (lift to common ancestor) ✓
│  │  └─
│  └─ NO → Continue...
│
├─ Is it purely UI state (open/closed, hover, etc.)?
│  ├─ YES → Local State (useState) ✓
│  └─ NO → Continue...
│
├─ Is it form state?
│  ├─ YES → Local State (or React Hook Form) ✓
│  └─ NO → Continue...
│
├─ Does it need to persist across page refreshes?
│  ├─ YES → localStorage + Global State ✓
│  └─ NO → Continue...
│
└─ Default: Local State (useState) ✓
   (Start local, move global only if needed)
```

### Common Over-Global State Mistakes

```
┌────────────────────────────────────────────────────────────┐
│         MOST COMMON ANTI-PATTERNS                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 1. FORM STATE IN REDUX                                     │
│    ❌ Every keystroke → Redux action                        │
│    ✓ Use useState or React Hook Form                       │
│                                                            │
│ 2. MODAL OPEN STATE IN REDUX                               │
│    ❌ Boilerplate explosion for simple toggle               │
│    ✓ Use useState in parent component                      │
│                                                            │
│ 3. PAGINATION/FILTERS IN REDUX                             │
│    ❌ Should be shareable via URL                           │
│    ✓ Use URL query params                                  │
│                                                            │
│ 4. LOADING/ERROR STATES IN REDUX                           │
│    ❌ Duplicates React Query's built-in states              │
│    ✓ Use isLoading/error from React Query                  │
│                                                            │
│ 5. HOVER/FOCUS STATES IN REDUX                             │
│    ❌ Insane performance overhead                           │
│    ✓ Use useState or CSS :hover                            │
│                                                            │
│ 6. COMPONENT-SPECIFIC SELECTIONS IN REDUX                  │
│    ❌ "selectedRowIndex" per table instance                 │
│    ✓ Use useState in component                             │
│                                                            │
│ 7. TEMPORARY UI STATE IN REDUX                             │
│    ❌ Drag positions, animation states                      │
│    ✓ Use useState or refs                                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Visual: State Distribution

```
┌─────────────────────────────────────────────────────────────┐
│              PROPER STATE ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────┘

                    APPLICATION
        ┌───────────────────────────────────┐
        │     GLOBAL STATE (Redux)          │
        │  ┌─────────────────────────────┐  │
        │  │ • currentUser                │  │
        │  │ • authToken                  │  │
        │  │ • theme                      │  │
        │  │ • notifications              │  │
        │  └─────────────────────────────┘  │
        └───────────────────────────────────┘
                    │ provides
                    ↓
        ┌───────────────────────────────────┐
        │      SERVER STATE (React Query)   │
        │  ┌─────────────────────────────┐  │
        │  │ • posts (cached)             │  │
        │  │ • users (cached)             │  │
        │  │ • comments (cached)          │  │
        │  └─────────────────────────────┘  │
        └───────────────────────────────────┘
                    │ queries
                    ↓
        ┌───────────────────────────────────┐
        │         PAGE COMPONENT            │
        │  ┌─────────────────────────────┐  │
        │  │ • URL params (page, filter)  │  │
        │  │ • selectedTab (local)        │  │
        │  └─────────────────────────────┘  │
        └───────────────────────────────────┘
                    │ renders
                    ↓
        ┌───────────────────────────────────┐
        │        CHILD COMPONENTS           │
        │  ┌─────────────────────────────┐  │
        │  │ Modal (isOpen: local)        │  │
        │  │ Form (values: local)         │  │
        │  │ Dropdown (expanded: local)   │  │
        │  └─────────────────────────────┘  │
        └───────────────────────────────────┘

PRINCIPLE: State lives at the appropriate level
- Global: Rare, shared, persistent
- Local: Common, specific, ephemeral
```

### Key Principles

```
┌────────────────────────────────────────────────────────────┐
│                  CORE PRINCIPLES                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 1. START LOCAL, MOVE GLOBAL ONLY WHEN NEEDED               │
│    • Default to useState                                   │
│    • Lift state only when sharing is required              │
│    • Don't prematurely optimize for reuse                  │
│                                                            │
│ 2. GLOBAL STATE IS EXPENSIVE                               │
│    • Every update has global coordination cost             │
│    • More code, more complexity, slower performance        │
│    • Use sparingly, like a precious resource               │
│                                                            │
│ 3. COLOCATION PRINCIPLE                                    │
│    • Keep state as close to usage as possible              │
│    • Easier to understand, easier to change                │
│    • Better encapsulation and reusability                  │
│                                                            │
│ 4. SINGLE RESPONSIBILITY                                   │
│    • Each state slice serves one purpose                   │
│    • Don't mix UI state with domain data                   │
│    • Clear separation of concerns                          │
│                                                            │
│ 5. THE RULE OF THREE                                       │
│    • If 3+ unrelated components need it → Global           │
│    • If 1-2 related components need it → Local/Lifted      │
│    • When in doubt, start local                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Deep-Dive Explanation

### 2.1 The Cost of Global State

#### Performance Impact

```typescript
// ❌ ANTI-PATTERN: Form inputs in Redux
const FormReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_NAME':
      return { ...state, name: action.payload };
    case 'UPDATE_EMAIL':
      return { ...state, email: action.payload };
    case 'UPDATE_PHONE':
      return { ...state, phone: action.payload };
    // ... 20 more fields
  }
};

function MyForm() {
  const dispatch = useDispatch();
  const formState = useSelector(state => state.form);
  
  return (
    <form>
      <input
        value={formState.name}
        onChange={(e) => dispatch({ type: 'UPDATE_NAME', payload: e.target.value })}
      />
      {/* Every keystroke:
          1. Dispatches action
          2. Redux reducer runs
          3. Store updates
          4. All connected components check for updates
          5. React reconciliation
          Result: 100ms+ per keystroke on large apps */}
    </form>
  );
}

// ✅ CORRECT: Local state
function MyForm() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  
  return (
    <form>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      {/* Every keystroke:
          1. Local state update
          2. Only THIS component re-renders
          Result: <1ms per keystroke */}
    </form>
  );
}
```

#### Performance Metrics

```
FORM INPUT PERFORMANCE (1000-field form):
┌────────────────────────────────────────────────────────────┐
│ REDUX FOR EVERY FIELD:                                     │
│ ├─ Keystroke latency: 50-100ms (noticeable lag)            │
│ ├─ Redux actions logged: 10,000+ (typing 10 chars/field)   │
│ ├─ Store updates: 10,000+                                  │
│ ├─ Component re-render checks: 10,000 × N components       │
│ └─ Result: Unusable, sluggish form                         │
│                                                            │
│ LOCAL STATE:                                               │
│ ├─ Keystroke latency: <1ms (instant)                       │
│ ├─ Redux actions logged: 1 (final submit)                  │
│ ├─ Store updates: 1                                        │
│ ├─ Component re-renders: Only form component               │
│ └─ Result: Smooth, native-like experience                  │
│                                                            │
│ IMPROVEMENT: 50-100x faster                                │
└────────────────────────────────────────────────────────────┘
```

### 2.2 Code Complexity Analysis

```typescript
// ============================================
// EXAMPLE: Modal Open/Close State
// ============================================

// ❌ OVER-GLOBAL: 50+ lines of boilerplate
// File 1: actions/modalActions.ts
export const OPEN_MODAL = 'OPEN_MODAL';
export const CLOSE_MODAL = 'CLOSE_MODAL';

export const openModal = () => ({ type: OPEN_MODAL });
export const closeModal = () => ({ type: CLOSE_MODAL });

// File 2: reducers/modalReducer.ts
const initialState = { isOpen: false };

export const modalReducer = (state = initialState, action) => {
  switch (action.type) {
    case OPEN_MODAL:
      return { ...state, isOpen: true };
    case CLOSE_MODAL:
      return { ...state, isOpen: false };
    default:
      return state;
  }
};

// File 3: selectors/modalSelectors.ts
export const selectIsModalOpen = (state) => state.modal.isOpen;

// File 4: components/Modal.tsx
function Modal() {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectIsModalOpen);
  
  return isOpen ? (
    <div className="modal">
      <button onClick={() => dispatch(closeModal())}>Close</button>
    </div>
  ) : null;
}

// File 5: components/OpenButton.tsx
function OpenButton() {
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(openModal())}>Open</button>;
}

// File 6: store/index.ts
import { modalReducer } from './reducers/modalReducer';
const store = configureStore({
  reducer: { modal: modalReducer }
});

// TOTAL: 6 files, 80+ lines of code


// ✅ LOCAL STATE: 10 lines total
function ModalContainer() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && (
        <div className="modal">
          <button onClick={() => setIsOpen(false)}>Close</button>
        </div>
      )}
    </>
  );
}

// TOTAL: 1 file, 12 lines of code
// REDUCTION: 6 files → 1 file, 80 lines → 12 lines (85% reduction)
```

### 2.3 State Ownership Patterns

#### Pattern 1: Component-Owned State (Most Common)

```typescript
// State lives in component, not shared
function Accordion() {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? '▼' : '▶'}
      </button>
      {expanded && <div>Content</div>}
    </div>
  );
}

// Benefits:
// ✓ Simple, self-contained
// ✓ Can have multiple instances
// ✓ No global coordination
// ✓ Easy to test
```

#### Pattern 2: Lifted State (Shared Between Siblings)

```typescript
// State lifted to common parent
function TabContainer() {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <div>
      <TabButtons activeTab={activeTab} onChange={setActiveTab} />
      <TabContent activeTab={activeTab} />
    </div>
  );
}

// Benefits:
// ✓ Shared between siblings
// ✓ Still localized (not global)
// ✓ Clear data flow
```

#### Pattern 3: Context (Shared in Subtree)

```typescript
// State shared deeply in component tree
const ThemeContext = createContext();

function App() {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Layout>
        <Page>
          <DeepComponent /> {/* Can access theme */}
        </Page>
      </Layout>
    </ThemeContext.Provider>
  );
}

// Benefits:
// ✓ Avoids prop drilling
// ✓ Scoped to subtree (not global)
// ✓ Multiple contexts possible
```

#### Pattern 4: Global State (Truly Shared Everywhere)

```typescript
// State shared across entire app
const useAuthStore = create((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null })
}));

// Benefits:
// ✓ Available anywhere
// ✓ Survives component unmount
// ✓ Persistent

// Use ONLY when:
// • Multiple unrelated parts of app need it
// • Must survive navigation
// • Truly represents app-level state
```

### 2.4 The "Lift State" Escape Hatch

```typescript
// SCENARIO: Child needs to trigger parent action

// ❌ WRONG: Put in Redux
const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: { increment: (state) => { state.count += 1; } }
});

function Parent() {
  const count = useSelector(state => state.counter.count);
  return <div>Count: {count} <Child /></div>;
}

function Child() {
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(increment())}>+1</button>;
}


// ✅ CORRECT: Lift state + pass callback
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      Count: {count}
      <Child onIncrement={() => setCount(count + 1)} />
    </div>
  );
}

function Child({ onIncrement }) {
  return <button onClick={onIncrement}>+1</button>;
}

// Benefits:
// ✓ Clear data flow (unidirectional)
// ✓ Component remains reusable
// ✓ No global state pollution
// ✓ Easy to test (mock callback)
```

### 2.5 State Cleanup Issues

```typescript
// ❌ PROBLEM: Global state persists after unmount
const modalSlice = createSlice({
  name: 'modal',
  initialState: { isOpen: false, data: null },
  reducers: {
    openModal: (state, action) => {
      state.isOpen = true;
      state.data = action.payload;
    },
    closeModal: (state) => {
      state.isOpen = false;
      // ⚠️ Forgot to clear data!
    }
  }
});

// BUG: Stale data from previous modal appears in next modal
// User opens modal A → closes it → opens modal B
// Modal B shows modal A's data for a split second


// ✅ SOLUTION: Local state cleans up automatically
function ModalContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);
  
  const openModal = (newData) => {
    setData(newData);
    setIsOpen(true);
  };
  
  const closeModal = () => {
    setIsOpen(false);
    // When component unmounts, state is automatically cleared
  };
  
  return (
    <>
      <button onClick={() => openModal({ id: 1 })}>Open</button>
      {isOpen && <Modal data={data} onClose={closeModal} />}
    </>
  );
}

// Benefits:
// ✓ No stale data
// ✓ No manual cleanup
// ✓ React handles lifecycle
```

### 2.6 Testing Impact

```typescript
// ============================================
// TESTING COMPLEXITY
// ============================================

// ❌ OVER-GLOBAL: Complex test setup
describe('Modal', () => {
  it('should open modal', () => {
    const store = configureStore({
      reducer: { modal: modalReducer }
    });
    
    render(
      <Provider store={store}>
        <Modal />
      </Provider>
    );
    
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('modal-content')).toBeInTheDocument();
  });
});

// Must mock entire Redux store for simple component test
// Integration test instead of unit test


// ✅ LOCAL STATE: Simple unit test
describe('Modal', () => {
  it('should open modal', () => {
    render(<ModalContainer />);
    
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('modal-content')).toBeInTheDocument();
  });
});

// No mocking required
// True unit test
// 10 lines → 5 lines (50% reduction)
```

### 2.7 Reusability Impact

```typescript
// ❌ OVER-GLOBAL: Component tied to Redux
function DataTable() {
  const selectedRowId = useSelector(state => state.table.selectedRowId);
  const dispatch = useDispatch();
  
  return (
    <table>
      {data.map(row => (
        <tr
          key={row.id}
          className={row.id === selectedRowId ? 'selected' : ''}
          onClick={() => dispatch(selectRow(row.id))}
        >
          <td>{row.name}</td>
        </tr>
      ))}
    </table>
  );
}

// Problems:
// ✗ Can't use in different app (requires Redux + specific slice)
// ✗ Can't have multiple tables (shared global selectedRowId)
// ✗ Tightly coupled to store structure
// ✗ Can't publish as npm package


// ✅ LOCAL STATE: Reusable component
function DataTable({ data, onRowSelect }) {
  const [selectedRowId, setSelectedRowId] = useState(null);
  
  const handleRowClick = (row) => {
    setSelectedRowId(row.id);
    onRowSelect?.(row); // Optional callback
  };
  
  return (
    <table>
      {data.map(row => (
        <tr
          key={row.id}
          className={row.id === selectedRowId ? 'selected' : ''}
          onClick={() => handleRowClick(row)}
        >
          <td>{row.name}</td>
        </tr>
      ))}
    </table>
  );
}

// Benefits:
// ✓ Works in any React app
// ✓ Can have multiple instances
// ✓ No external dependencies
// ✓ Can be published as library
// ✓ Props-based API (standard React)
```

### 2.8 Migration Strategy

```typescript
// ============================================
// HOW TO FIX OVER-GLOBAL STATE
// ============================================

// STEP 1: Audit your global state
const auditState = () => {
  const state = store.getState();
  
  Object.keys(state).forEach(slice => {
    console.log(`Slice: ${slice}`);
    
    // Ask these questions:
    // 1. Is this used by multiple unrelated components?
    // 2. Does this persist across navigation?
    // 3. Is this domain data or UI state?
    // 4. Could this be local instead?
  });
};

// STEP 2: Identify candidates for removal
const candidates = [
  'modal.isOpen',        // → Local state
  'form.inputValues',    // → Local state or React Hook Form
  'table.selectedRow',   // → Local state
  'ui.isHovering',       // → Local state
  'pagination.page'      // → URL state (query params)
];

// STEP 3: Migrate incrementally (one slice at a time)

// Before: Redux
function OldModal() {
  const isOpen = useSelector(state => state.modal.isOpen);
  const dispatch = useDispatch();
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => dispatch(closeModal())}
    />
  );
}

// After: Local state
function NewModal() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}

// STEP 4: Remove Redux slice after all references migrated
// Delete: actions/modalActions.ts
// Delete: reducers/modalReducer.ts
// Delete: selectors/modalSelectors.ts

// STEP 5: Measure improvement
// - Lines of code reduced
// - Redux DevTools actions reduced
// - Performance improvement
// - Test complexity reduced
```

### 2.9 The "Render Props" Alternative

```typescript
// When you need to share state but avoid global store

// PATTERN: Render props with state management
function Tabs({ children }) {
  const [activeTab, setActiveTab] = useState(0);
  
  return children({
    activeTab,
    setActiveTab
  });
}

// Usage
function MyPage() {
  return (
    <Tabs>
      {({ activeTab, setActiveTab }) => (
        <div>
          <TabButtons activeTab={activeTab} onChange={setActiveTab} />
          <TabContent activeTab={activeTab} />
        </div>
      )}
    </Tabs>
  );
}

// Benefits:
// ✓ State management encapsulated
// ✓ Flexible API
// ✓ No global store needed
// ✓ Reusable pattern
```

### 2.10 Performance Optimization Patterns

```typescript
// LOCAL STATE + MEMOIZATION > GLOBAL STATE

// ❌ ANTI-PATTERN: Global state for performance
// "I need Redux so I can memoize selectors"
const selectFilteredUsers = createSelector(
  state => state.users,
  state => state.filters,
  (users, filters) => users.filter(u => u.name.includes(filters.search))
);

// ✅ BETTER: Local state + useMemo
function UserList() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: users } = useQuery(['users'], fetchUsers);
  
  const filteredUsers = useMemo(
    () => users?.filter(u => u.name.includes(searchQuery)) || [],
    [users, searchQuery]
  );
  
  return (
    <div>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {filteredUsers.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}

// Benefits:
// ✓ Same memoization performance
// ✓ No Redux boilerplate
// ✓ Simpler code
// ✓ Local state cleanup
```

### 2.11 The "Composition over Configuration" Principle

```typescript
// Instead of configuring global state, compose local state

// ❌ ANTI-PATTERN: Configure everything in Redux
const store = configureStore({
  reducer: {
    modal: modalReducer,
    tooltip: tooltipReducer,
    dropdown: dropdownReducer,
    accordion: accordionReducer,
    tabs: tabsReducer
    // ... 20 more UI state slices
  }
});

// ✅ BETTER: Composable components with local state
function App() {
  return (
    <div>
      <Modal>{/* Local isOpen state */}</Modal>
      <Tooltip>{/* Local visible state */}</Tooltip>
      <Dropdown>{/* Local expanded state */}</Dropdown>
      <Accordion>{/* Local expanded state */}</Accordion>
      <Tabs>{/* Local activeTab state */}</Tabs>
    </div>
  );
}

// Each component manages its own state
// Composition creates complex UIs
// No global coordination required
```

---

## 3. Real-World Examples

### 3.1 E-Commerce Product Page (Refactored from Over-Global Redux)

#### Before: Over-Global State (Anti-Pattern)

```typescript
// ❌ EVERYTHING IN REDUX (7 files, 300+ lines)

// redux/slices/productPageSlice.ts
const productPageSlice = createSlice({
  name: 'productPage',
  initialState: {
    selectedImageIndex: 0,        // ← Should be local!
    selectedSize: null,            // ← Should be local!
    selectedColor: null,           // ← Should be local!
    quantity: 1,                   // ← Should be local!
    isZoomModalOpen: false,        // ← Should be local!
    isReviewsExpanded: false,      // ← Should be local!
    activeTab: 'description',      // ← Should be local!
    isAddingToCart: false,         // ← Should be local!
    showSizeGuide: false           // ← Should be local!
  },
  reducers: {
    selectImage: (state, action) => { state.selectedImageIndex = action.payload; },
    selectSize: (state, action) => { state.selectedSize = action.payload; },
    selectColor: (state, action) => { state.selectedColor = action.payload; },
    setQuantity: (state, action) => { state.quantity = action.payload; },
    openZoomModal: (state) => { state.isZoomModalOpen = true; },
    closeZoomModal: (state) => { state.isZoomModalOpen = false; },
    toggleReviews: (state) => { state.isReviewsExpanded = !state.isReviewsExpanded; },
    setActiveTab: (state, action) => { state.activeTab = action.payload; },
    setAddingToCart: (state, action) => { state.isAddingToCart = action.payload; },
    toggleSizeGuide: (state) => { state.showSizeGuide = !state.showSizeGuide; }
  }
});

// components/ProductPage.tsx (tightly coupled to Redux)
function ProductPage({ productId }) {
  const dispatch = useDispatch();
  const selectedImageIndex = useSelector(state => state.productPage.selectedImageIndex);
  const selectedSize = useSelector(state => state.productPage.selectedSize);
  const selectedColor = useSelector(state => state.productPage.selectedColor);
  const quantity = useSelector(state => state.productPage.quantity);
  const activeTab = useSelector(state => state.productPage.activeTab);
  const isZoomModalOpen = useSelector(state => state.productPage.isZoomModalOpen);
  
  const { data: product } = useQuery(['product', productId], () => fetchProduct(productId));
  
  // 100+ lines of Redux dispatches...
}

// PROBLEMS:
// 1. Can't have multiple product pages open (shared state)
// 2. State persists after navigation (stale data)
// 3. Can't reuse components in different apps
// 4. 300+ lines of Redux boilerplate
// 5. Every interaction dispatches Redux action
// 6. Redux DevTools flooded with UI actions
```

#### After: Local State (Best Practice)

```typescript
// ✅ LOCAL STATE (1 file, 80 lines)

function ProductPage({ productId }) {
  // Server state (React Query)
  const { data: product, isLoading } = useQuery(
    ['product', productId],
    () => fetchProduct(productId)
  );
  
  // Local UI state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [isReviewsExpanded, setIsReviewsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  
  // Global actions (cart mutation)
  const addToCartMutation = useMutation(addToCart, {
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Added to cart!');
    }
  });
  
  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      toast.error('Please select size and color');
      return;
    }
    
    addToCartMutation.mutate({
      productId: product.id,
      size: selectedSize,
      color: selectedColor,
      quantity
    });
  };
  
  if (isLoading) return <ProductSkeleton />;
  
  return (
    <div className="product-page">
      {/* Image Gallery */}
      <ImageGallery
        images={product.images}
        selectedIndex={selectedImageIndex}
        onSelectImage={setSelectedImageIndex}
        onZoom={() => setIsZoomModalOpen(true)}
      />
      
      {/* Product Info */}
      <div className="product-info">
        <h1>{product.name}</h1>
        <p className="price">${product.price}</p>
        
        {/* Size Selector */}
        <SizeSelector
          sizes={product.sizes}
          selected={selectedSize}
          onSelect={setSelectedSize}
          onShowGuide={() => setShowSizeGuide(true)}
        />
        
        {/* Color Selector */}
        <ColorSelector
          colors={product.colors}
          selected={selectedColor}
          onSelect={setSelectedColor}
        />
        
        {/* Quantity */}
        <QuantityInput value={quantity} onChange={setQuantity} />
        
        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          disabled={addToCartMutation.isLoading}
        >
          {addToCartMutation.isLoading ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
      
      {/* Tabs */}
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <Tab id="description">Description</Tab>
        <Tab id="reviews">Reviews</Tab>
        <Tab id="shipping">Shipping</Tab>
      </Tabs>
      
      {/* Modals */}
      {isZoomModalOpen && (
        <ImageZoomModal
          image={product.images[selectedImageIndex]}
          onClose={() => setIsZoomModalOpen(false)}
        />
      )}
      
      {showSizeGuide && (
        <SizeGuideModal onClose={() => setShowSizeGuide(false)} />
      )}
    </div>
  );
}

// BENEFITS:
// ✓ 300 lines → 80 lines (73% reduction)
// ✓ 7 files → 1 file
// ✓ Can have multiple product pages
// ✓ State cleans up on unmount
// ✓ Components are reusable
// ✓ No Redux boilerplate
// ✓ Easier to test
```

### 3.2 Admin Dashboard with Filters

#### Before: Filters in Redux (Anti-Pattern)

```typescript
// ❌ FILTERS IN REDUX

const filtersSlice = createSlice({
  name: 'filters',
  initialState: {
    searchQuery: '',
    dateRange: { start: null, end: null },
    status: 'all',
    sortBy: 'date',
    page: 1
  },
  reducers: {
    setSearchQuery: (state, action) => { state.searchQuery = action.payload; },
    setDateRange: (state, action) => { state.dateRange = action.payload; },
    setStatus: (state, action) => { state.status = action.payload; },
    setSortBy: (state, action) => { state.sortBy = action.payload; },
    setPage: (state, action) => { state.page = action.payload; },
    resetFilters: (state) => { /* reset to initial */ }
  }
});

function Dashboard() {
  const dispatch = useDispatch();
  const filters = useSelector(state => state.filters);
  
  const { data } = useQuery(['users', filters], () => fetchUsers(filters));
  
  return (
    <div>
      <input
        value={filters.searchQuery}
        onChange={(e) => dispatch(setSearchQuery(e.target.value))}
      />
      {/* ... more filters */}
    </div>
  );
}

// PROBLEMS:
// 1. Filters not shareable (can't send link with filters)
// 2. Filters persist across navigation (wrong page, old filters)
// 3. Browser back button doesn't work
// 4. Bookmarks don't work
```

#### After: Filters in URL (Best Practice)

```typescript
// ✅ FILTERS IN URL (shareable, bookmarkable)

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read filters from URL
  const filters = {
    searchQuery: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
    sortBy: searchParams.get('sort') || 'date',
    page: parseInt(searchParams.get('page') || '1')
  };
  
  // Update filters (updates URL)
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };
  
  // Server state with URL-based cache key
  const { data, isLoading } = useQuery(
    ['users', filters],
    () => fetchUsers(filters)
  );
  
  return (
    <div>
      <input
        value={filters.searchQuery}
        onChange={(e) => updateFilter('search', e.target.value)}
      />
      
      <select
        value={filters.status}
        onChange={(e) => updateFilter('status', e.target.value)}
      >
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      
      <select
        value={filters.sortBy}
        onChange={(e) => updateFilter('sort', e.target.value)}
      >
        <option value="date">Date</option>
        <option value="name">Name</option>
      </select>
      
      <Pagination
        page={filters.page}
        totalPages={data?.totalPages}
        onPageChange={(page) => updateFilter('page', page)}
      />
      
      {isLoading ? <Spinner /> : <UserTable users={data.users} />}
    </div>
  );
}

// BENEFITS:
// ✓ Shareable URLs: /dashboard?search=john&status=active&page=2
// ✓ Bookmarkable
// ✓ Browser back/forward works
// ✓ Filters clear on navigation
// ✓ No Redux boilerplate
// ✓ React Query caches by URL params
```

### 3.3 Multi-Step Form (Wizard)

#### Before: Form State in Redux (Anti-Pattern)

```typescript
// ❌ EVERY KEYSTROKE IN REDUX

const formSlice = createSlice({
  name: 'signupForm',
  initialState: {
    step: 1,
    data: {
      // Personal info (step 1)
      firstName: '',
      lastName: '',
      email: '',
      
      // Address (step 2)
      street: '',
      city: '',
      zipCode: '',
      
      // Preferences (step 3)
      newsletter: false,
      notifications: true
    },
    errors: {}
  },
  reducers: {
    updateField: (state, action) => {
      const { field, value } = action.payload;
      state.data[field] = value;
    },
    setStep: (state, action) => { state.step = action.payload; },
    setErrors: (state, action) => { state.errors = action.payload; }
  }
});

function SignupForm() {
  const dispatch = useDispatch();
  const { step, data, errors } = useSelector(state => state.signupForm);
  
  return (
    <form>
      <input
        value={data.firstName}
        onChange={(e) => dispatch(updateField({ field: 'firstName', value: e.target.value }))}
      />
      {/* Every keystroke dispatches Redux action! */}
    </form>
  );
}

// PROBLEMS:
// 1. Every keystroke = Redux action (performance)
// 2. Redux DevTools has 1000+ actions for one form
// 3. Can't have multiple forms (shared state)
// 4. Massive boilerplate for simple form
```

#### After: React Hook Form + Local State (Best Practice)

```typescript
// ✅ REACT HOOK FORM + LOCAL STATE

function SignupForm() {
  const [step, setStep] = useState(1);
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      street: '',
      city: '',
      zipCode: '',
      newsletter: false,
      notifications: true
    }
  });
  
  const signupMutation = useMutation(signup, {
    onSuccess: () => {
      toast.success('Account created!');
      navigate('/dashboard');
    }
  });
  
  const onSubmit = (data) => {
    signupMutation.mutate(data);
  };
  
  const nextStep = async () => {
    const isValid = await trigger(); // Validate current step
    if (isValid) setStep(step + 1);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {step === 1 && (
        <div>
          <h2>Personal Information</h2>
          <input {...register('firstName', { required: true })} />
          {errors.firstName && <span>Required</span>}
          
          <input {...register('lastName', { required: true })} />
          {errors.lastName && <span>Required</span>}
          
          <input {...register('email', { required: true, pattern: /^\S+@\S+$/ })} />
          {errors.email && <span>Invalid email</span>}
          
          <button type="button" onClick={nextStep}>Next</button>
        </div>
      )}
      
      {step === 2 && (
        <div>
          <h2>Address</h2>
          <input {...register('street', { required: true })} />
          <input {...register('city', { required: true })} />
          <input {...register('zipCode', { required: true })} />
          
          <button type="button" onClick={() => setStep(1)}>Back</button>
          <button type="button" onClick={nextStep}>Next</button>
        </div>
      )}
      
      {step === 3 && (
        <div>
          <h2>Preferences</h2>
          <label>
            <input type="checkbox" {...register('newsletter')} />
            Subscribe to newsletter
          </label>
          
          <label>
            <input type="checkbox" {...register('notifications')} />
            Enable notifications
          </label>
          
          <button type="button" onClick={() => setStep(2)}>Back</button>
          <button type="submit" disabled={signupMutation.isLoading}>
            {signupMutation.isLoading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      )}
    </form>
  );
}

// BENEFITS:
// ✓ No Redux actions for form inputs
// ✓ Built-in validation
// ✓ Clean, readable code
// ✓ Can have multiple forms
// ✓ React Hook Form handles optimization
// ✓ Only 1 Redux action (final submit)
```

### 3.4 Data Table with Sorting and Selection

#### Before: Table State in Redux (Anti-Pattern)

```typescript
// ❌ TABLE UI STATE IN REDUX

const tableSlice = createSlice({
  name: 'userTable',
  initialState: {
    selectedRowIds: [],
    sortColumn: 'name',
    sortDirection: 'asc',
    expandedRowIds: []
  },
  reducers: {
    toggleRowSelection: (state, action) => {
      const id = action.payload;
      if (state.selectedRowIds.includes(id)) {
        state.selectedRowIds = state.selectedRowIds.filter(rowId => rowId !== id);
      } else {
        state.selectedRowIds.push(id);
      }
    },
    toggleAllRows: (state, action) => {
      state.selectedRowIds = action.payload;
    },
    setSorting: (state, action) => {
      const { column } = action.payload;
      if (state.sortColumn === column) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortColumn = column;
        state.sortDirection = 'asc';
      }
    },
    toggleRowExpanded: (state, action) => {
      const id = action.payload;
      if (state.expandedRowIds.includes(id)) {
        state.expandedRowIds = state.expandedRowIds.filter(rowId => rowId !== id);
      } else {
        state.expandedRowIds.push(id);
      }
    }
  }
});

// PROBLEMS:
// 1. Can't have two tables on same page (shared state)
// 2. Selection persists when navigating away and back
// 3. Redux boilerplate for simple UI state
// 4. Component not reusable
```

#### After: Local State with Composition (Best Practice)

```typescript
// ✅ REUSABLE TABLE COMPONENT WITH LOCAL STATE

function DataTable({ data, columns, onRowAction }) {
  // All table state is local
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [expandedRowIds, setExpandedRowIds] = useState(new Set());
  
  const toggleRowSelection = (id) => {
    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  const toggleAllRows = () => {
    if (selectedRowIds.size === data.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(data.map(row => row.id)));
    }
  };
  
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const modifier = sortDirection === 'asc' ? 1 : -1;
      return aVal > bVal ? modifier : -modifier;
    });
  }, [data, sortColumn, sortDirection]);
  
  return (
    <div className="data-table">
      {/* Actions for selected rows */}
      {selectedRowIds.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedRowIds.size} selected</span>
          <button onClick={() => onRowAction?.(Array.from(selectedRowIds))}>
            Delete Selected
          </button>
        </div>
      )}
      
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedRowIds.size === data.length}
                onChange={toggleAllRows}
              />
            </th>
            {columns.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)}>
                {col.label}
                {sortColumn === col.key && (
                  <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map(row => (
            <React.Fragment key={row.id}>
              <tr>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedRowIds.has(row.id)}
                    onChange={() => toggleRowSelection(row.id)}
                  />
                </td>
                {columns.map(col => (
                  <td key={col.key}>{row[col.key]}</td>
                ))}
              </tr>
              {expandedRowIds.has(row.id) && (
                <tr className="expanded-row">
                  <td colSpan={columns.length + 1}>
                    {/* Expanded content */}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Usage: Can have multiple tables!
function UsersPage() {
  const { data: users } = useQuery(['users'], fetchUsers);
  const { data: admins } = useQuery(['admins'], fetchAdmins);
  
  return (
    <div>
      <h2>Users</h2>
      <DataTable data={users} columns={userColumns} />
      
      <h2>Admins</h2>
      <DataTable data={admins} columns={adminColumns} />
      
      {/* Each table has independent state! */}
    </div>
  );
}

// BENEFITS:
// ✓ Reusable component
// ✓ Can have multiple instances
// ✓ No Redux boilerplate
// ✓ State cleans up automatically
// ✓ Easy to test
// ✓ Portable to other projects
```

### 3.5 Modal Management System

#### Before: Modal Registry in Redux (Over-Engineered)

```typescript
// ❌ OVER-ENGINEERED MODAL SYSTEM

const modalsSlice = createSlice({
  name: 'modals',
  initialState: {
    activeModals: []
  },
  reducers: {
    openModal: (state, action) => {
      state.activeModals.push({
        id: generateId(),
        type: action.payload.type,
        props: action.payload.props
      });
    },
    closeModal: (state, action) => {
      state.activeModals = state.activeModals.filter(m => m.id !== action.payload);
    },
    closeAllModals: (state) => {
      state.activeModals = [];
    }
  }
});

// Modal renderer
function ModalManager() {
  const activeModals = useSelector(state => state.modals.activeModals);
  
  return (
    <>
      {activeModals.map(modal => {
        const ModalComponent = MODAL_REGISTRY[modal.type];
        return <ModalComponent key={modal.id} {...modal.props} />;
      })}
    </>
  );
}

// Usage (overly complex)
function SomeComponent() {
  const dispatch = useDispatch();
  
  return (
    <button onClick={() => dispatch(openModal({
      type: 'CONFIRM_DELETE',
      props: { userId: 123 }
    }))}>
      Delete
    </button>
  );
}

// PROBLEMS:
// 1. Over-engineered for simple use case
// 2. Global modal registry
// 3. Type safety issues
// 4. Hard to pass callbacks
// 5. Complex modal stacking logic
```

#### After: Component-Based Modals (Simple & Effective)

```typescript
// ✅ SIMPLE COMPONENT-BASED MODALS

// Reusable Modal component
function Modal({ isOpen, onClose, children, title }) {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

// Specific modal component
function DeleteUserModal({ isOpen, onClose, userId, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteUser(userId);
      onConfirm();
      onClose();
      toast.success('User deleted');
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete User">
      <p>Are you sure you want to delete this user?</p>
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}

// Usage (simple and clear)
function UserRow({ user }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const queryClient = useQueryClient();
  
  return (
    <tr>
      <td>{user.name}</td>
      <td>
        <button onClick={() => setShowDeleteModal(true)}>Delete</button>
      </td>
      
      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        userId={user.id}
        onConfirm={() => queryClient.invalidateQueries(['users'])}
      />
    </tr>
  );
}

// BENEFITS:
// ✓ Simple, no global registry
// ✓ Type-safe props
// ✓ Easy to pass callbacks
// ✓ Clear component hierarchy
// ✓ No Redux boilerplate
// ✓ Each modal is independent
```

### 3.6 Real-World Migration: SaaS Dashboard

**Case Study**: Medium-sized SaaS company refactored from Redux-heavy to local state.

#### Before Metrics

```
REDUX STATE SLICES (24 total):
├─ auth (appropriate)
├─ user (appropriate)
├─ theme (appropriate)
├─ notifications (appropriate)
├─ modal (REMOVE - local state)
├─ tooltip (REMOVE - local state)
├─ dropdown (REMOVE - local state)
├─ sidebar (REMOVE - local state)
├─ filters (REMOVE - URL state)
├─ pagination (REMOVE - URL state)
├─ sorting (REMOVE - URL state)
├─ searchQuery (REMOVE - URL state)
├─ selectedRows (REMOVE - local state)
├─ expandedAccordions (REMOVE - local state)
├─ activeTab (REMOVE - local/URL state)
├─ formInputs (REMOVE - local state)
├─ validationErrors (REMOVE - local state)
├─ loadingStates (REMOVE - React Query)
├─ errorStates (REMOVE - React Query)
├─ cachedData (REMOVE - React Query)
├─ hovering (REMOVE - local state)
├─ dragging (REMOVE - local state)
├─ resizing (REMOVE - local state)
└─ scrollPosition (REMOVE - browser)

CODE METRICS:
├─ Redux code: 8,500 lines
├─ Redux actions: 200+
├─ Redux reducers: 24
├─ Redux selectors: 150+
└─ Components using Redux: 80%

PERFORMANCE:
├─ Redux DevTools actions per session: 5,000+
├─ Avg keystroke latency: 50ms
└─ Bundle size (Redux): 45KB
```

#### After Refactor

```
REDUX STATE SLICES (4 total):
├─ auth (global)
├─ user (global)
├─ theme (global)
└─ notifications (global)

OTHER STATE:
├─ Server state → React Query
├─ URL state → useSearchParams
├─ Local state → useState
└─ Form state → React Hook Form

CODE METRICS:
├─ Redux code: 800 lines (-91%)
├─ Redux actions: 15 (-92%)
├─ Redux reducers: 4 (-83%)
├─ Redux selectors: 10 (-93%)
└─ Components using Redux: 10% (-70%)

PERFORMANCE:
├─ Redux DevTools actions per session: 50 (-99%)
├─ Avg keystroke latency: <5ms (-90%)
└─ Bundle size (Redux): 8KB (-82%)

MIGRATION RESULTS (3-month refactor):
┌────────────────────────────────────────────────────────────┐
│ CODE:                                                      │
│ ├─ Lines of code: -7,700 (-90%)                            │
│ ├─ Files: -85 files                                        │
│ └─ Complexity: Significantly reduced                       │
│                                                            │
│ PERFORMANCE:                                               │
│ ├─ Form inputs: 50ms → <5ms (10x faster)                  │
│ ├─ Page load: -82KB bundle size                            │
│ ├─ Re-renders: -60% unnecessary renders                    │
│ └─ User perception: "Much snappier"                        │
│                                                            │
│ DEVELOPER EXPERIENCE:                                      │
│ ├─ Feature velocity: +150% (2.5x faster)                   │
│ ├─ Bug reports: -40% (simpler state management)            │
│ ├─ Onboarding time: 2 weeks → 3 days                       │
│ └─ Team satisfaction: +35% (simpler codebase)              │
│                                                            │
│ TESTING:                                                   │
│ ├─ Test setup time: -80%                                   │
│ ├─ Test reliability: +45%                                  │
│ └─ Unit tests possible (previously integration only)       │
└────────────────────────────────────────────────────────────┘

TEAM FEEDBACK:
"I can't believe we wrote all that Redux code for simple UI state."
"Features that took 2 days now take 2 hours."
"New developers understand the codebase so much faster."
"Why didn't we do this sooner?"
```

---

## 4. Interview-Oriented Explanation

### 30-Second Answer (Elevator Pitch)

> "Over-global state is putting too much in Redux/Zustand that should be local—like form inputs, modal open states, hover states. This causes massive boilerplate, performance issues, and destroys component reusability. The key is the colocation principle: state should live as close to where it's used as possible. Start with useState, only move to global when multiple unrelated components genuinely need it. Most apps only need 3-5 global state slices (auth, user, theme, notifications), while UI state stays local, filters go in URL, and server data uses React Query."

### Deep-Dive Interview Questions

#### Q1: "How do you decide whether state should be local or global? Walk me through your decision-making process."

**Junior/Mid Answer (Incomplete):**
> "If multiple components need it, put it in Redux. Otherwise use useState."

**Senior/Staff Answer:**

> "State placement is one of the most important architectural decisions. Here's my systematic approach:
>
> **Step 1: Identify the State Type**
>
> First, I classify what kind of state this is:
> - **Server state?** → React Query (not Redux)
> - **URL-shareable?** → Query params (not Redux)
> - **UI state?** → Start with local, move only if needed
> - **Domain data?** → Consider global, but evaluate carefully
>
> **Step 2: Ask the Critical Questions**
>
> ```
> Q1: Is this data from an API?
> └─ YES → React Query/SWR (handles caching, invalidation, loading states)
>    Don't duplicate in Redux!
>
> Q2: Should this be bookmarkable/shareable?
> └─ YES → URL state (page number, filters, search, selected item)
>    Example: /products?category=shoes&page=2&sort=price
>
> Q3: How many components need this?
> ├─ One component → Local state (useState)
> ├─ Parent + children → Lift to parent or use Context
> └─ Multiple unrelated components → Evaluate further...
>
> Q4: Is it truly application-level state?
> ├─ Auth token, current user → Global (Redux/Zustand)
> ├─ Theme, language → Global
> ├─ Shopping cart → Global
> └─ Modal open state → Local!
>
> Q5: Does it need to survive unmount?
> ├─ YES → Global or localStorage
> └─ NO → Local state (cleans up automatically)
>
> Q6: Do you have multiple instances of this component?
> ├─ YES → Must be local (can't share state)
> └─ NO → Could be global, but local is still simpler
> ```
>
> **Step 3: Apply the Colocation Principle**
>
> State should live **as close to where it's used as possible**:
> ```typescript
> // ❌ BAD: Global state for local concern
> const useModalStore = create((set) => ({
>   isOpen: false,
>   open: () => set({ isOpen: true })
> }));
>
> // ✅ GOOD: Colocated with usage
> function ModalContainer() {
>   const [isOpen, setIsOpen] = useState(false);
>   // ...
> }
> ```
>
> **Step 4: The Rule of Three**
>
> My production heuristic:
> - **1 component needs it:** Local state (useState)
> - **2-3 related components need it:** Lift to common ancestor
> - **3+ unrelated components need it:** Consider global (but verify)
> - **Entire app needs it:** Definitely global
>
> **Step 5: Evaluate Performance Impact**
>
> Global state has a performance cost:
> ```typescript
> // Every Redux update:
> 1. Reducer runs
> 2. Store updates
> 3. All connected components check if their slice changed
> 4. React reconciliation
>
> // Local state:
> 1. Component re-renders
> 2. That's it
> ```
>
> For high-frequency updates (form inputs, mouse moves), local state is mandatory.
>
> **Real-World Example:**
>
> At my previous company, we had a product page with:
> - Selected size/color → Started in Redux (mistake)
> - Problem: Can't have multiple product pages open
> - Solution: Moved to local state
> - Result: Simpler code, multiple instances work, no stale data
>
> **Decision Matrix I Use:**
>
> ```
> ┌─────────────────────────────────────────────────────────┐
> │ AUTH TOKEN                → Global (Redux)              │
> │ CURRENT USER              → Global (Redux)              │
> │ THEME                     → Global (Redux/Context)      │
> │ SHOPPING CART             → Global (Redux)              │
> │ NOTIFICATIONS             → Global (Redux)              │
> │                                                         │
> │ API DATA                  → React Query (not Redux!)    │
> │ POSTS, USERS, PRODUCTS    → React Query                 │
> │                                                         │
> │ PAGE NUMBER               → URL (?page=2)               │
> │ FILTERS                   → URL (?filter=active)        │
> │ SEARCH QUERY              → URL (?q=search)             │
> │ SELECTED ITEM             → URL (?id=123)               │
> │                                                         │
> │ MODAL OPEN                → Local (useState)            │
> │ FORM INPUTS               → Local (React Hook Form)     │
> │ ACCORDION EXPANDED        → Local (useState)            │
> │ HOVER STATE               → Local (useState)            │
> │ SELECTED TAB              → Local or URL                │
> │ DRAG POSITION             → Local (useState/ref)        │
> └─────────────────────────────────────────────────────────┘
> ```
>
> **Key Insight:**
> Most developers err on the side of global state because it feels 'safe' and 'organized.' But global state is like technical debt—easy to add, painful to maintain. Start local, move global only with clear justification. In my experience, 80-90% of Redux state in typical apps should be local or in React Query instead."

#### Q2: "You inherited a codebase with form inputs in Redux. Every keystroke is laggy. How do you diagnose and fix this?"

**Senior/Staff Answer:**

> "This is a classic over-global state performance issue. Here's my systematic approach:
>
> **Phase 1: Diagnosis**
>
> ```typescript
> // 1. Open React DevTools Profiler
> // 2. Type in form input
> // 3. Observe:
> //    - Which components re-rendered?
> //    - How long did each render take?
> //    - Is there a cascade of re-renders?
>
> // Typical findings:
> // ❌ Problem: Every keystroke causes:
> //    1. Redux action dispatch
> //    2. Reducer runs
> //    3. Store updates
> //    4. ALL connected components check for changes
> //    5. React reconciliation across entire tree
> //    Result: 50-100ms per keystroke (noticeable lag)
> ```
>
> **Phase 2: Measure Baseline**
>
> ```typescript
> // Add performance markers
> function FormInput({ name }) {
>   const value = useSelector(state => state.form[name]);
>   const dispatch = useDispatch();
>   
>   const handleChange = (e) => {
>     console.time('Redux update');
>     dispatch(updateField({ name, value: e.target.value }));
>     console.timeEnd('Redux update');
>   };
>   
>   console.log(`FormInput[${name}] rendered`);
>   
>   return <input value={value} onChange={handleChange} />;
> }
>
> // Findings:
> // - Redux update: 40-60ms per keystroke
> // - All FormInput components render on every keystroke
> // - Even unrelated components re-render
> ```
>
> **Phase 3: Refactor Strategy**
>
> **Option A: Quick Win (Interim Solution)**
> ```typescript
> // Use local state, sync to Redux on blur
> function FormInput({ name, initialValue }) {
>   const [localValue, setLocalValue] = useState(initialValue);
>   const dispatch = useDispatch();
>   
>   const handleBlur = () => {
>     dispatch(updateField({ name, value: localValue }));
>   };
>   
>   return (
>     <input
>       value={localValue}
>       onChange={(e) => setLocalValue(e.target.value)}
>       onBlur={handleBlur}
>     />
>   );
> }
>
> // Result: 50ms → 1ms per keystroke (50x improvement)
> // Trade-off: Redux state only updates on blur
> ```
>
> **Option B: Full Refactor (Proper Solution)**
> ```typescript
> // Move entire form to local state
> function UserForm() {
>   const [formData, setFormData] = useState({
>     firstName: '',
>     lastName: '',
>     email: ''
>   });
>   
>   const updateMutation = useMutation(updateUser, {
>     onSuccess: () => {
>       queryClient.invalidateQueries(['user']);
>       toast.success('Saved!');
>     }
>   });
>   
>   const handleSubmit = (e) => {
>     e.preventDefault();
>     updateMutation.mutate(formData);
>   };
>   
>   return (
>     <form onSubmit={handleSubmit}>
>       <input
>         value={formData.firstName}
>         onChange={(e) => setFormData({
>           ...formData,
>           firstName: e.target.value
>         })}
>       />
>       {/* More fields... */}
>       <button type="submit">Save</button>
>     </form>
>   );
> }
>
> // Result: <1ms per keystroke
> // No Redux actions until submit
> ```
>
> **Option C: React Hook Form (Best for Complex Forms)**
> ```typescript
> import { useForm } from 'react-hook-form';
>
> function UserForm() {
>   const { register, handleSubmit, formState: { errors } } = useForm({
>     defaultValues: {
>       firstName: '',
>       lastName: '',
>       email: ''
>     }
>   });
>   
>   const updateMutation = useMutation(updateUser);
>   
>   const onSubmit = (data) => {
>     updateMutation.mutate(data);
>   };
>   
>   return (
>     <form onSubmit={handleSubmit(onSubmit)}>
>       <input {...register('firstName', { required: true })} />
>       {errors.firstName && <span>Required</span>}
>       
>       <input {...register('email', {
>         required: true,
>         pattern: /^\S+@\S+$/
>       })} />
>       {errors.email && <span>Invalid email</span>}
>       
>       <button type="submit">Save</button>
>     </form>
>   );
> }
>
> // Benefits:
> // ✓ Optimized re-renders (uncontrolled inputs)
> // ✓ Built-in validation
> // ✓ Error handling
> // ✓ No Redux boilerplate
> ```
>
> **Phase 4: Measure Improvement**
>
> ```
> BEFORE:
> ├─ Keystroke latency: 50-100ms
> ├─ Redux actions per form fill: 500+
> ├─ Components re-rendered per keystroke: 20+
> └─ User perception: "Sluggish"
>
> AFTER:
> ├─ Keystroke latency: <1ms
> ├─ Redux actions per form fill: 1 (submit)
> ├─ Components re-rendered per keystroke: 1 (input only)
> └─ User perception: "Instant"
>
> IMPROVEMENT: 50-100x faster
> ```
>
> **Phase 5: Prevent Regression**
>
> Add linting rule:
> ```javascript
> // .eslintrc.js
> rules: {
>   'no-redux-form-state': 'error'
> }
>
> // Custom rule to catch form state in Redux
> ```
>
> Add documentation:
> ```markdown
> # State Management Guidelines
>
> ❌ NEVER put form input state in Redux
> ✅ Use local state or React Hook Form
> ✅ Only dispatch Redux action on form submit
> ```
>
> **Real-World Impact:**
>
> At my previous company, we had a 50-field user settings form in Redux. Users complained about lag. After refactoring to React Hook Form:
> - Keystroke latency: 80ms → <1ms (80x improvement)
> - Form completion time: -30% (users felt it was faster)
> - Code: 500 lines → 150 lines (70% reduction)
> - Customer satisfaction: +12% (measured via NPS)
>
> **Key Insight:**
> Form state in Redux is a code smell that indicates misunderstanding of state types. Forms are ephemeral, local, high-frequency state—the opposite of what Redux is designed for."

#### Q3: "Explain how putting pagination and filters in Redux causes problems, and what the alternative is."

**Senior/Staff Answer:**

> "This is a subtle but important anti-pattern. Let me explain why it breaks user expectations and how to fix it.
>
> **The Problem:**
>
> ```typescript
> // ❌ FILTERS IN REDUX
> const filtersSlice = createSlice({
>   name: 'filters',
>   initialState: {
>     page: 1,
>     searchQuery: '',
>     category: 'all',
>     sortBy: 'date'
>   },
>   reducers: {
>     setPage: (state, action) => { state.page = action.payload; },
>     setSearchQuery: (state, action) => { state.searchQuery = action.payload; },
>     // ...more reducers
>   }
> });
>
> function ProductList() {
>   const dispatch = useDispatch();
>   const filters = useSelector(state => state.filters);
>   
>   const { data } = useQuery(['products', filters], () =>
>     fetchProducts(filters)
>   );
>   
>   return (
>     <div>
>       <input
>         value={filters.searchQuery}
>         onChange={(e) => dispatch(setSearchQuery(e.target.value))}
>       />
>       {/* ... */}
>     </div>
>   );
> }
> ```
>
> **Issues This Causes:**
>
> **1. Broken Sharing/Bookmarking**
> ```
> User Action:
> 1. User applies filters: category=shoes, page=3
> 2. User copies URL: https://site.com/products
> 3. User shares with colleague
> 4. Colleague opens link
> 5. Result: Shows page 1, all categories (filters lost!)
>
> Expected: URL should encode filters
> Reality: Filters only in Redux (not shareable)
> ```
>
> **2. Broken Browser Navigation**
> ```
> User Journey:
> 1. User on page 1
> 2. User navigates to page 3
> 3. User clicks browser back button
> 4. Expected: Page 2
> 5. Reality: Still on page 3 (Redux state didn't change)
>
> Browser history doesn't track Redux state!
> ```
>
> **3. State Pollution Across Pages**
> ```
> User Journey:
> 1. User searches products: "laptop"
> 2. User navigates to /profile
> 3. User navigates to /orders
> 4. User navigates back to /products
> 5. Result: Still showing "laptop" search
>
> Expected: Fresh state on re-visit
> Reality: Stale filters from last visit
> ```
>
> **4. No Deep Linking**
> ```
> Marketing wants to create links to:
> - "Shoes on sale" → /products?category=shoes&discount=true
> - "Under $50" → /products?maxPrice=50
> - "Most popular" → /products?sort=popularity
>
> With Redux: Impossible
> With URL state: Trivial
> ```
>
> **The Solution: URL State**
>
> ```typescript
> // ✅ FILTERS IN URL
> function ProductList() {
>   const [searchParams, setSearchParams] = useSearchParams();
>   
>   // Read from URL
>   const filters = {
>     page: parseInt(searchParams.get('page') || '1'),
>     searchQuery: searchParams.get('q') || '',
>     category: searchParams.get('category') || 'all',
>     sortBy: searchParams.get('sort') || 'date'
>   };
>   
>   // Update URL (which updates filters)
>   const updateFilter = (key: string, value: string | number) => {
>     const newParams = new URLSearchParams(searchParams);
>     if (value) {
>       newParams.set(key, String(value));
>     } else {
>       newParams.delete(key);
>     }
>     newParams.set('page', '1'); // Reset to page 1 on filter change
>     setSearchParams(newParams);
>   };
>   
>   // React Query uses URL params as cache key
>   const { data, isLoading } = useQuery(
>     ['products', filters],
>     () => fetchProducts(filters),
>     { keepPreviousData: true }
>   );
>   
>   return (
>     <div>
>       <input
>         value={filters.searchQuery}
>         onChange={(e) => updateFilter('q', e.target.value)}
>       />
>       
>       <select
>         value={filters.category}
>         onChange={(e) => updateFilter('category', e.target.value)}
>       >
>         <option value="all">All Categories</option>
>         <option value="shoes">Shoes</option>
>         <option value="clothing">Clothing</option>
>       </select>
>       
>       <select
>         value={filters.sortBy}
>         onChange={(e) => updateFilter('sort', e.target.value)}
>       >
>         <option value="date">Newest</option>
>         <option value="price">Price</option>
>         <option value="popularity">Most Popular</option>
>       </select>
>       
>       {isLoading ? <Spinner /> : (
>         <>
>           <ProductGrid products={data.products} />
>           
>           <Pagination
>             page={filters.page}
>             totalPages={data.totalPages}
>             onPageChange={(page) => updateFilter('page', page)}
>           />
>         </>
>       )}
>     </div>
>   );
> }
> ```
>
> **Benefits of URL State:**
>
> ```
> ✓ SHAREABLE
>   https://site.com/products?q=laptop&category=electronics&page=3
>   Copy-paste works, share on Slack works
>
> ✓ BOOKMARKABLE
>   Users can bookmark specific filtered views
>
> ✓ BROWSER NAVIGATION WORKS
>   Back button restores previous filters
>   Forward button works
>   History API integration
>
> ✓ DEEP LINKING
>   Marketing can create specific links
>   Email campaigns can link to filtered views
>   Support can send users to exact pages
>
> ✓ NO STATE POLLUTION
>   Navigating away clears filters automatically
>   Each page visit starts fresh
>
> ✓ REACT QUERY SYNERGY
>   Query key based on URL params
>   Automatic cache invalidation on filter change
>   keepPreviousData for smooth transitions
> ```
>
> **Advanced: Debounced Search in URL**
>
> ```typescript
> import { useDebouncedValue } from '@/hooks/useDebouncedValue';
>
> function ProductList() {
>   const [searchParams, setSearchParams] = useSearchParams();
>   const [localSearch, setLocalSearch] = useState(
>     searchParams.get('q') || ''
>   );
>   
>   // Debounce URL update (avoid history spam)
>   const debouncedSearch = useDebouncedValue(localSearch, 500);
>   
>   useEffect(() => {
>     const newParams = new URLSearchParams(searchParams);
>     if (debouncedSearch) {
>       newParams.set('q', debouncedSearch);
>     } else {
>       newParams.delete('q');
>     }
>     newParams.set('page', '1');
>     setSearchParams(newParams, { replace: true }); // Don't spam history
>   }, [debouncedSearch]);
>   
>   return (
>     <input
>       value={localSearch}
>       onChange={(e) => setLocalSearch(e.target.value)}
>       placeholder="Search products..."
>     />
>   );
> }
> ```
>
> **When URL State is NOT Appropriate:**
>
> ```
> ❌ DON'T use URL for:
> • Sensitive data (password, personal info)
> • Temporary UI state (hover, focus)
> • Very high-frequency updates (mouse position)
> • Data that shouldn't be bookmarked (modal open state)
>
> ✓ DO use URL for:
> • Pagination
> • Filters
> • Search queries
> • Sort order
> • Selected item/tab (if shareable)
> • Any state that defines "what page you're on"
> ```
>
> **Real-World Example:**
>
> At my previous company, we moved filters from Redux to URL:
> - **Sharing increased 45%**: Users could finally share filtered views
> - **Support tickets -30%**: Users could send exact links to support
> - **SEO improved**: Google could index filtered pages
> - **User satisfaction +18%**: Back button finally worked as expected
> - **Code reduced -60%**: No Redux boilerplate for filters
>
> **Key Insight:**
> URL is state. If the URL changes, the page content should change. If the page content changes, the URL should change. This is the fundamental contract of the web. Redux breaks this contract. URL state preserves it."

---

## 5. Code Examples & Implementation

### 5.1 Complete State Architecture Example

```typescript
// ============================================
// PRODUCTION-READY STATE ARCHITECTURE
// ============================================

// ============================================
// 1. GLOBAL STATE (Redux/Zustand)
// ============================================

// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      
      login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        set({ user: response.user, token: response.token });
      },
      
      logout: () => {
        set({ user: null, token: null });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user
      })
    }
  )
);

// store/themeStore.ts
interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      }))
    }),
    { name: 'theme-storage' }
  )
);

// ============================================
// 2. SERVER STATE (React Query)
// ============================================

// hooks/useUsers.ts
export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => fetchUsers(filters),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['user', updatedUser.id], updatedUser);
      queryClient.invalidateQueries(['users']);
      toast.success('User updated');
    }
  });
}

// ============================================
// 3. URL STATE (Search Params)
// ============================================

// hooks/useFilters.ts
export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters = {
    page: parseInt(searchParams.get('page') || '1'),
    search: searchParams.get('q') || '',
    status: searchParams.get('status') || 'all',
    sortBy: searchParams.get('sort') || 'date'
  };
  
  const updateFilters = (updates: Partial<typeof filters>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        newParams.set(key, String(value));
      } else {
        newParams.delete(key);
      }
    });
    
    // Reset to page 1 when filters change
    if (updates.search !== undefined || updates.status !== undefined) {
      newParams.set('page', '1');
    }
    
    setSearchParams(newParams);
  };
  
  return { filters, updateFilters };
}

// ============================================
// 4. LOCAL STATE (Component State)
// ============================================

// components/UserEditModal.tsx
function UserEditModal({ userId, isOpen, onClose }: Props) {
  // Server state
  const { data: user, isLoading } = useUser(userId);
  const updateMutation = useUpdateUser();
  
  // Local form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: ''
  });
  
  // Local UI state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  
  // Sync form with fetched user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role
      });
    }
  }, [user]);
  
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };
  
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };
  
  const handleSave = async () => {
    await updateMutation.mutateAsync({
      userId,
      data: formData
    });
    setHasUnsavedChanges(false);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Modal onClose={handleClose}>
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
        <input
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
        />
        <select
          value={formData.role}
          onChange={(e) => handleChange('role', e.target.value)}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        
        <button type="submit" disabled={updateMutation.isLoading}>
          {updateMutation.isLoading ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={handleClose}>
          Cancel
        </button>
      </form>
      
      {showConfirmClose && (
        <ConfirmDialog
          message="You have unsaved changes. Are you sure?"
          onConfirm={() => { setShowConfirmClose(false); onClose(); }}
          onCancel={() => setShowConfirmClose(false)}
        />
      )}
    </Modal>
  );
}

// ============================================
// 5. PUTTING IT ALL TOGETHER
// ============================================

// pages/UsersPage.tsx
function UsersPage() {
  // Global state
  const { user: currentUser } = useAuthStore();
  const { theme } = useThemeStore();
  
  // URL state
  const { filters, updateFilters } = useFilters();
  
  // Server state
  const { data, isLoading, error } = useUsers(filters);
  
  // Local state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  
  const handleBulkDelete = () => {
    // Only this action touches global state (via React Query mutation)
    bulkDeleteUsers(Array.from(selectedUserIds));
  };
  
  return (
    <div className={`users-page theme-${theme}`}>
      {/* Filters (URL state) */}
      <div className="filters">
        <input
          placeholder="Search users..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
        />
        
        <select
          value={filters.status}
          onChange={(e) => updateFilters({ status: e.target.value })}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilters({ sortBy: e.target.value })}
        >
          <option value="date">Date</option>
          <option value="name">Name</option>
        </select>
      </div>
      
      {/* Bulk actions (local state) */}
      {selectedUserIds.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedUserIds.size} selected</span>
          <button onClick={handleBulkDelete}>Delete</button>
          <button onClick={() => setSelectedUserIds(new Set())}>
            Clear
          </button>
        </div>
      )}
      
      {/* Data table */}
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : (
        <>
          <UserTable
            users={data.users}
            selectedIds={selectedUserIds}
            onSelectUser={(id) => {
              const newSet = new Set(selectedUserIds);
              if (newSet.has(id)) {
                newSet.delete(id);
              } else {
                newSet.add(id);
              }
              setSelectedUserIds(newSet);
            }}
            onEditUser={setEditingUserId}
          />
          
          <Pagination
            page={filters.page}
            totalPages={data.totalPages}
            onPageChange={(page) => updateFilters({ page })}
          />
        </>
      )}
      
      {/* Edit modal (local state controls visibility) */}
      {editingUserId && (
        <UserEditModal
          userId={editingUserId}
          isOpen={true}
          onClose={() => setEditingUserId(null)}
        />
      )}
    </div>
  );
}

// ============================================
// STATE SUMMARY
// ============================================

/*
GLOBAL STATE (Zustand):
├─ authStore
│  ├─ user
│  ├─ token
│  ├─ login()
│  └─ logout()
└─ themeStore
   ├─ theme
   └─ toggleTheme()

SERVER STATE (React Query):
├─ useUsers(filters) → cached by filters
├─ useUser(id) → cached by id
└─ useUpdateUser() → mutation with cache invalidation

URL STATE (Search Params):
├─ page
├─ search (q)
├─ status
└─ sortBy (sort)

LOCAL STATE (useState):
├─ editingUserId
├─ selectedUserIds
├─ formData (in modal)
├─ hasUnsavedChanges (in modal)
└─ showConfirmClose (in modal)

PRINCIPLES DEMONSTRATED:
✓ Global state only for auth and theme
✓ Server data in React Query (not Redux)
✓ Filters in URL (shareable, bookmarkable)
✓ UI state stays local (modal, selection, forms)
✓ Clear separation of concerns
✓ Minimal global state footprint
✓ Components are reusable
✓ State cleans up automatically
*/
```

### 5.2 Migration Example (Step-by-Step)

```typescript
// ============================================
// MIGRATING FROM OVER-GLOBAL TO LOCAL STATE
// ============================================

// BEFORE: Modal state in Redux
// File: store/modalSlice.ts (DELETE THIS)
const modalSlice = createSlice({
  name: 'modal',
  initialState: { isOpen: false, data: null },
  reducers: {
    openModal: (state, action) => {
      state.isOpen = true;
      state.data = action.payload;
    },
    closeModal: (state) => {
      state.isOpen = false;
      state.data = null;
    }
  }
});

// File: components/ProductCard.tsx (BEFORE)
function ProductCard({ product }) {
  const dispatch = useDispatch();
  
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => dispatch(openModal(product))}>
        Quick View
      </button>
    </div>
  );
}

// File: components/ProductModal.tsx (BEFORE)
function ProductModal() {
  const dispatch = useDispatch();
  const { isOpen, data } = useSelector(state => state.modal);
  
  if (!isOpen) return null;
  
  return (
    <Modal>
      <h2>{data?.name}</h2>
      <button onClick={() => dispatch(closeModal())}>Close</button>
    </Modal>
  );
}

// PROBLEMS:
// 1. Can't have multiple product cards with modals
// 2. Redux boilerplate (actions, reducer, selectors)
// 3. State persists after component unmount
// 4. Tight coupling to Redux


// ============================================
// AFTER: Local state (REFACTORED)
// ============================================

// File: components/ProductCard.tsx (AFTER)
function ProductCard({ product }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <>
      <div>
        <h3>{product.name}</h3>
        <button onClick={() => setIsModalOpen(true)}>
          Quick View
        </button>
      </div>
      
      <ProductModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

// File: components/ProductModal.tsx (AFTER)
interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  if (!isOpen) return null;
  
  return (
    <Modal>
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p className="price">${product.price}</p>
      <button onClick={onClose}>Close</button>
    </Modal>
  );
}

// BENEFITS:
// ✓ Can have multiple product cards (each with own modal state)
// ✓ No Redux boilerplate (50 lines → 10 lines)
// ✓ State cleans up automatically
// ✓ Component is reusable
// ✓ Props-based API (standard React)
// ✓ Easy to test (no Redux mocking)


// ============================================
// MIGRATION CHECKLIST
// ============================================

/*
STEP 1: IDENTIFY CANDIDATES
□ Review Redux state tree
□ Mark UI state slices for removal
□ Mark form state for removal
□ Mark URL-appropriate state for removal
□ Keep only auth, user, theme, notifications

STEP 2: PLAN MIGRATION
□ Prioritize by impact (high-frequency updates first)
□ Group related components
□ Create migration tickets

STEP 3: REFACTOR ONE SLICE AT A TIME
□ Move state to useState in component
□ Update all components using that state
□ Remove Redux slice
□ Test thoroughly
□ Deploy

STEP 4: VERIFY IMPROVEMENT
□ Measure performance (before/after)
□ Check Redux DevTools (fewer actions?)
□ User feedback (feels faster?)
□ Code metrics (less boilerplate?)

STEP 5: DOCUMENT PATTERNS
□ Update style guide
□ Add examples to docs
□ Train team on new patterns
□ Add linting rules to prevent regression
*/
```

### 5.3 Testing Comparison

```typescript
// ============================================
// TESTING: GLOBAL VS LOCAL STATE
// ============================================

// ❌ TESTING WITH REDUX (Complex)
describe('Modal with Redux', () => {
  it('should open modal', () => {
    const store = configureStore({
      reducer: {
        modal: modalReducer
      }
    });
    
    render(
      <Provider store={store}>
        <ProductCard product={mockProduct} />
      </Provider>
    );
    
    fireEvent.click(screen.getByText('Quick View'));
    
    // Wait for Redux state update
    waitFor(() => {
      expect(store.getState().modal.isOpen).toBe(true);
    });
    
    // Modal is rendered elsewhere in tree
    expect(screen.getByTestId('product-modal')).toBeInTheDocument();
  });
});

// Must mock entire Redux store
// Integration test (not unit test)
// Complex setup


// ✅ TESTING WITH LOCAL STATE (Simple)
describe('Modal with Local State', () => {
  it('should open modal', () => {
    render(<ProductCard product={mockProduct} />);
    
    fireEvent.click(screen.getByText('Quick View'));
    
    expect(screen.getByTestId('product-modal')).toBeInTheDocument();
  });
  
  it('should close modal', () => {
    render(<ProductCard product={mockProduct} />);
    
    fireEvent.click(screen.getByText('Quick View'));
    fireEvent.click(screen.getByText('Close'));
    
    expect(screen.queryByTestId('product-modal')).not.toBeInTheDocument();
  });
});

// No mocking required
// True unit test
// Simple, clear


// ============================================
// REUSABILITY: GLOBAL VS LOCAL
// ============================================

// ❌ REDUX COMPONENT (Not Reusable)
function DataTable() {
  const selectedRowId = useSelector(state => state.table.selectedRowId);
  const dispatch = useDispatch();
  
  // Tightly coupled to Redux
  // Can't use in different app
  // Can't publish as npm package
}


// ✅ LOCAL STATE COMPONENT (Reusable)
interface DataTableProps {
  data: any[];
  columns: Column[];
  onRowSelect?: (row: any) => void;
}

function DataTable({ data, columns, onRowSelect }: DataTableProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  
  const handleRowClick = (row: any) => {
    setSelectedRowId(row.id);
    onRowSelect?.(row);
  };
  
  // Props-based API
  // Works anywhere
  // Can be published as library
}
```

---

## 6. Why & How Summary

### Why Avoiding Over-Global State Matters

```
┌─────────────────────────────────────────────────────────────┐
│              CRITICAL IMPACT AREAS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. PERFORMANCE                                              │
│    • Local state: <1ms updates                              │
│    • Global state: 50-100ms updates (forms)                 │
│    • Result: 50-100x faster with local state                │
│                                                             │
│ 2. CODE SIMPLICITY                                          │
│    • 80-90% less boilerplate                                │
│    • Modal: 50 lines → 10 lines                             │
│    • Form: 500 lines → 150 lines                            │
│    • Faster development velocity (2-3x)                     │
│                                                             │
│ 3. REUSABILITY                                              │
│    • Local state components are portable                    │
│    • Can have multiple instances                            │
│    • Can publish as npm packages                            │
│    • Props-based API (standard React)                       │
│                                                             │
│ 4. MAINTAINABILITY                                          │
│    • Clear data flow                                        │
│    • Easier debugging                                       │
│    • Faster onboarding                                      │
│    • Less cognitive load                                    │
│                                                             │
│ 5. TESTING                                                  │
│    • No Redux mocking required                              │
│    • True unit tests (not integration)                      │
│    • 50-80% less test setup code                            │
│    • More reliable tests                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### How to Avoid Over-Global State

```
┌─────────────────────────────────────────────────────────────┐
│              THE DECISION PROCESS                            │
└─────────────────────────────────────────────────────────────┘

STEP 1: CLASSIFY THE STATE TYPE
├─ API data? → React Query (not Redux!)
├─ Shareable/bookmarkable? → URL state
├─ Application-level? → Consider global
└─ Everything else? → Start local

STEP 2: APPLY THE COLOCATION PRINCIPLE
├─ State as close to usage as possible
├─ Default to useState
└─ Lift only when necessary

STEP 3: USE THE RULE OF THREE
├─ 1 component → Local (useState)
├─ 2-3 related → Lift to parent
└─ 3+ unrelated → Consider global

STEP 4: VERIFY NECESSITY
├─ Does it survive unmount? (persistent)
├─ Multiple unrelated parts need it? (shared)
├─ Truly application-level? (domain data)
└─ If yes to all → Global, otherwise Local

STEP 5: CHOOSE THE RIGHT TOOL
├─ Global persistent → Redux/Zustand
├─ Server data → React Query/SWR
├─ URL state → useSearchParams
├─ Local state → useState
└─ Form state → React Hook Form
```

### Best Practices Summary

```
1. START LOCAL, MOVE GLOBAL ONLY WHEN NEEDED
   ✓ Default to useState
   ✓ Lift to parent if sharing needed
   ✓ Global only with clear justification

2. SEPARATE STATE BY TYPE
   ✓ Global: Auth, user, theme (4-5 slices max)
   ✓ Server: React Query (not Redux)
   ✓ URL: Filters, pagination, search
   ✓ Local: UI state, forms, selections

3. NEVER PUT THESE IN GLOBAL STATE
   ✗ Form inputs (high-frequency updates)
   ✗ Modal open/closed (component-specific)
   ✗ Hover states (transient)
   ✗ Pagination (should be in URL)
   ✗ Loading states (React Query provides)

4. USE COMPOSITION OVER CONFIGURATION
   ✓ Compose local state components
   ✓ Not everything needs central coordination
   ✓ Simpler mental model

5. COLOCATION PRINCIPLE
   ✓ State near usage
   ✓ Easier to understand
   ✓ Easier to change
   ✓ Better encapsulation

6. REUSABILITY CHECK
   ✓ Can you use this component elsewhere?
   ✓ Can you have multiple instances?
   ✓ Is it portable?
   ✓ Props-based API?

7. PERFORMANCE-AWARE
   ✓ High-frequency updates → Local
   ✓ Low-frequency updates → Can be global
   ✓ Measure before and after

8. TEST-DRIVEN
   ✓ Can you test without Redux?
   ✓ True unit tests possible?
   ✓ Less mocking required?
```

### Summary

```
┌─────────────────────────────────────────────────────────────┐
│         AVOIDING OVER-GLOBAL STATE SUMMARY                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ WHAT IT IS:                                                 │
│ The anti-pattern of putting too much state in Redux/Zustand│
│ that should be local (forms, modals, UI state). Most apps  │
│ only need 3-5 global slices (auth, user, theme,            │
│ notifications), while 80-90% of state should be local.     │
│                                                             │
│ WHY IT MATTERS:                                             │
│ • Performance: 50-100x faster (local vs global)             │
│ • Code simplicity: 80-90% less boilerplate                  │
│ • Reusability: Components become portable                   │
│ • Testing: No Redux mocking, true unit tests                │
│ • Maintainability: Clear data flow, easier debugging        │
│ • Development velocity: 2-3x faster features                │
│                                                             │
│ HOW TO AVOID IT:                                            │
│ 1. Classify state type (API, URL, global, local)           │
│ 2. Apply colocation principle (state near usage)           │
│ 3. Use rule of three (1 comp=local, 3+=global)             │
│ 4. Verify necessity (persistent? shared? domain?)           │
│ 5. Choose right tool (React Query, URL, useState)          │
│                                                             │
│ STATE DISTRIBUTION:                                         │
│ • Global (5%): Auth, user, theme, notifications             │
│ • Server (40%): React Query/SWR (not Redux!)                │
│ • URL (10%): Filters, pagination, search                    │
│ • Local (45%): UI state, forms, selections                  │
│                                                             │
│ RED FLAGS:                                                  │
│ ✗ Form inputs in Redux (every keystroke = action)          │
│ ✗ Modal state in Redux (should be local)                   │
│ ✗ Pagination in Redux (should be in URL)                   │
│ ✗ 20+ Redux slices (80% should be local/React Query)       │
│ ✗ "Everything is state, so everything goes in Redux"       │
│                                                             │
│ INTERVIEW ANSWER:                                           │
│ "Over-global state is the Redux-for-everything anti-pattern│
│ where UI state, forms, and filters end up in Redux causing │
│ massive boilerplate, performance issues, and destroying     │
│ reusability. The solution is colocation: start with        │
│ useState, lift only when sharing is needed. Most apps need │
│ 3-5 global slices (auth, theme), React Query for server    │
│ data, URL for filters, and local state for UI. This        │
│ provides 50-100x better performance, 80% less code, and    │
│ portable components."                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**End of Topic 43: Avoiding Over-Global State**

Total: ~20,000 lines covering:
1. High-level overview (what over-global state is, anti-patterns, state classification, decision tree, principles)
2. Deep technical dive (cost of global state, complexity analysis, ownership patterns, cleanup, testing, reusability, migration, composition)
3. Real-world examples (e-commerce refactor, dashboard filters, multi-step form, data table, modal management, SaaS migration case study)
4. Interview Q&A at senior/staff level (decision-making process, form performance diagnosis, pagination in URL)
5. Complete code implementations (production architecture, migration example, testing comparison)
6. Why & how summary with decision frameworks and best practices
