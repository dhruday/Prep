# 92. useReducer — When to Prefer Over useState
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`useReducer` manages state through a pure `(state, action) => newState` reducer function — the same pattern as Redux, but scoped to a single component. Prefer `useReducer` over `useState` when: state transitions involve multiple related values that must update atomically; the next state depends on multiple parts of the previous state; or the transition logic is complex enough that it deserves to be named, centralized, and tested in isolation. The practical signals: if you need `useState` multiple times for closely related state, if you find yourself computing new state from multiple existing state values in the same handler, or if you're writing the same setter pattern in multiple event handlers — that logic belongs in a reducer. Additionally, `dispatch` is referentially stable, making it safe to pass to deeply nested components without `useCallback`.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### `useState` vs `useReducer` Under the Hood

`useState` IS `useReducer`:

```typescript
// useState is implemented as:
function useState<T>(initial: T | (() => T)) {
  return useReducer<T, T>(
    (state, action) => action,  // identity reducer: new state IS the action
    initial,
    (init) => typeof init === 'function' ? (init as () => T)() : init
  );
}
// The "setter" from useState is dispatch — calling setX(newVal) is dispatch(newVal)
// The reducer "processes" the action by just returning it as the new state
```

The difference is in contract: `useReducer` enforces explicit action types and centralized logic; `useState` allows direct value updates.

### When `useReducer` Wins Over `useState`

**Scenario 1: Atomic multi-field state updates**

```typescript
// ❌ useState: multiple setters that must be coordinated
function MultiStepForm() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function handleNext(newData: FormData) {
    // Must update all three together atomically
    setData(prev => ({ ...prev, ...newData }));
    setErrors({});  // clear on proceed
    setStep(prev => prev + 1);
    // Problem: these are 3 separate setState calls
    // React 18 batches them, but the logic is scattered
    // What if validation fails? Have to call 3 setters in the error path too
  }
}

// ✅ useReducer: named actions, coordinated transitions, shared logic
type FormAction =
  | { type: 'NEXT_STEP'; data: FormData }
  | { type: 'PREV_STEP' }
  | { type: 'SET_ERRORS'; errors: FormErrors }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string };

interface FormState {
  step: number;
  data: FormData;
  errors: FormErrors;
  loading: boolean;
  submitError: string | null;
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1, data: { ...state.data, ...action.data }, errors: {} };
    case 'PREV_STEP':
      return { ...state, step: Math.max(1, state.step - 1), errors: {} };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'SUBMIT_START':
      return { ...state, loading: true, submitError: null };
    case 'SUBMIT_SUCCESS':
      return { ...state, loading: false };
    case 'SUBMIT_ERROR':
      return { ...state, loading: false, submitError: action.error };
    default:
      return state;
  }
}

function MultiStepFormFixed() {
  const [state, dispatch] = useReducer(formReducer, {
    step: 1, data: {}, errors: {}, loading: false, submitError: null
  });

  async function handleNext(newData: FormData) {
    const validationErrors = validate(newData);
    if (Object.keys(validationErrors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors: validationErrors });
      return;
    }
    dispatch({ type: 'NEXT_STEP', data: newData });
  }

  async function handleSubmit() {
    dispatch({ type: 'SUBMIT_START' });
    try {
      await submitForm(state.data);
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (error) {
      dispatch({ type: 'SUBMIT_ERROR', error: (error as Error).message });
    }
  }
  // Clean state transitions, clear action names, easy to test formReducer in isolation
}
```

**Scenario 2: Finite state machine behavior**

```typescript
// State machine: video player states
type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
type PlayerAction =
  | { type: 'LOAD'; src: string }
  | { type: 'LOADED' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'ERROR'; message: string }
  | { type: 'END' };

interface VideoState {
  status: PlayerState;
  src: string | null;
  currentTime: number;
  error: string | null;
}

function videoReducer(state: VideoState, action: PlayerAction): VideoState {
  switch (action.type) {
    case 'LOAD':
      if (state.status === 'idle' || state.status === 'error') {
        return { ...state, status: 'loading', src: action.src, error: null };
      }
      return state;  // invalid transition — ignore action

    case 'LOADED':
      if (state.status === 'loading') {
        return { ...state, status: 'playing' };
      }
      return state;

    case 'PLAY':
      if (state.status === 'paused') {
        return { ...state, status: 'playing' };
      }
      return state;  // can't PLAY from idle or error

    case 'PAUSE':
      if (state.status === 'playing') {
        return { ...state, status: 'paused' };
      }
      return state;

    case 'ERROR':
      return { ...state, status: 'error', error: action.message };

    case 'END':
      return { ...state, status: 'idle', currentTime: 0 };

    default:
      return state;
  }
}
// Invalid state transitions are explicitly handled (ignored or corrected)
// This is impossible to express cleanly with multiple useState calls
```

**Scenario 3: State derived from complex combinations**

```typescript
// Shopping cart with derived totals
interface CartItem { id: string; price: number; quantity: number; }
type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'UPDATE_QUANTITY'; id: string; quantity: number }
  | { type: 'APPLY_COUPON'; code: string; discount: number }
  | { type: 'CLEAR_CART' };

interface CartState {
  items: CartItem[];
  coupon: { code: string; discount: number } | null;
  // Derived values — computed in reducer, avoid recomputing in render
  subtotal: number;
  total: number;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.item.id);
      const items = existing
        ? state.items.map(i => i.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...state.items, action.item];
      return computeTotals({ ...state, items });
    }
    case 'REMOVE_ITEM': {
      const items = state.items.filter(i => i.id !== action.id);
      return computeTotals({ ...state, items });
    }
    case 'UPDATE_QUANTITY': {
      const items = state.items.map(i =>
        i.id === action.id ? { ...i, quantity: Math.max(0, action.quantity) } : i
      ).filter(i => i.quantity > 0);
      return computeTotals({ ...state, items });
    }
    case 'APPLY_COUPON':
      return computeTotals({ ...state, coupon: { code: action.code, discount: action.discount } });
    case 'CLEAR_CART':
      return { items: [], coupon: null, subtotal: 0, total: 0 };
    default:
      return state;
  }
}

function computeTotals(state: Omit<CartState, 'subtotal' | 'total'>): CartState {
  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = state.coupon ? state.coupon.discount : 0;
  const total = subtotal * (1 - discount / 100);
  return { ...state, subtotal, total };
}
```

### `dispatch` Stability vs `setState` Stability

Both `setState` and `dispatch` are referentially stable — same function reference across renders:

```typescript
function Parent() {
  const [, dispatch] = useReducer(reducer, initialState);

  // dispatch is STABLE → safe to pass to children without useCallback
  return <DeepChild dispatch={dispatch} />;
}

// For deeply nested state updates, dispatch is ideal:
// Pass dispatch down (or via Context)
// Child dispatches actions → parent state updates
// No prop drilling of state setters
// No useCallback needed on the dispatch reference
```

### `useReducer` with Context — Mini-Redux Pattern

```typescript
// Pattern: useReducer + Context = component-scoped "redux"
const CartContext = React.createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [], coupon: null, subtotal: 0, total: 0
  });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

function useCart() {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be inside CartProvider');
  return context;
}

// Usage — any descendant can dispatch without prop drilling
function RemoveButton({ itemId }: { itemId: string }) {
  const { dispatch } = useCart();
  return (
    <button onClick={() => dispatch({ type: 'REMOVE_ITEM', id: itemId })}>
      Remove
    </button>
  );
}
```

### Testing `useReducer` Logic in Isolation

A major benefit of `useReducer`: the reducer is a pure function — testable without React:

```typescript
// Pure function tests — no React test utilities needed
describe('formReducer', () => {
  const initial: FormState = { step: 1, data: {}, errors: {}, loading: false, submitError: null };

  test('NEXT_STEP advances step and merges data', () => {
    const newData = { name: 'Hruday' };
    const result = formReducer(initial, { type: 'NEXT_STEP', data: newData });
    expect(result.step).toBe(2);
    expect(result.data).toEqual(newData);
    expect(result.errors).toEqual({});
  });

  test('PREV_STEP does not go below step 1', () => {
    const result = formReducer(initial, { type: 'PREV_STEP' });
    expect(result.step).toBe(1);  // min(1, 1-1) = 1
  });

  test('SUBMIT_ERROR sets error message and stops loading', () => {
    const loadingState = { ...initial, loading: true };
    const result = formReducer(loadingState, { type: 'SUBMIT_ERROR', error: 'Network failure' });
    expect(result.loading).toBe(false);
    expect(result.submitError).toBe('Network failure');
  });
});
// These tests run in milliseconds with no rendering overhead
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, a complex filter panel had 8 different filter types (date range, multi-select, text search, numeric range, boolean toggles). Initially implemented with 8 `useState` calls, the "Apply All" and "Clear All" and "Preset Load" operations required coordinating all 8 setters. One `useReducer` replaced all 8 — `{ type: 'APPLY_ALL', filters: allFilters }` and `{ type: 'CLEAR_ALL' }` make the transitions atomic and trivially testable. The reducer tests caught an edge case where clearing filters preserved a date range that was set via URL params (a controlled interaction that needed special handling).

At Oracle, the data grid's row selection state became a `useReducer` — supporting single-select, multi-select (ctrl+click), range-select (shift+click), and select-all. Each of these was a complex state transition involving the previous selection set. The reducer made invalid states (like range-select without an anchor) explicit through state machine rules.

**At FAANG scale:**
- **Microsoft (Word Online):** Document editor toolbar state — bold, italic, underline, color, alignment are all selection-dependent and must update atomically when selection changes; `useReducer` with `SELECTION_CHANGED` action updates all toolbar state in one transition
- **Adobe (Premiere Web):** Timeline trimming — in/out point manipulation involves coordinated state changes; reducer handles `TRIM_START`, `TRIM_END`, `RIPPLE_TRIM` actions with constraint enforcement (in < out, in >= 0, etc.)
- **Salesforce (Process Builder):** Rule configuration — complex rule editor with add/remove/reorder/duplicate operations on condition trees; reducer manages the tree manipulation logic in isolation from the React tree
- **Cisco (Smart Account):** License entitlement flow — multi-step flow with business rule enforcement; `useReducer` encodes valid state transitions; attempting invalid actions (like activating without a valid subscription) returns the same state (no-op) rather than needing error handling in UI code

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "useReducer is useState with explicit action types and centralized update logic. The low-level relationship: useState is literally implemented as useReducer with an identity reducer.
>
> I reach for useReducer when I notice any of these signals: multiple related state values that must update together atomically, complex transition logic that would scatter across multiple event handlers if expressed as individual setters, or state that behaves like a finite state machine where certain actions should be no-ops from certain states.
>
> The testing argument is compelling: a reducer is a pure function — state-in, action-in, new-state-out — and I can test every transition in plain Jest without any React test utilities. This is especially valuable for complex business logic like form validation flows, shopping carts, or multi-step wizards.
>
> The performance argument: dispatch is stable (same reference across renders), so it can be passed deep via Context without useCallback wrapping. This makes the useReducer + Context pattern a solid mini-Redux for component subtrees with complex shared state."

### Likely Follow-up Questions

1. **What does `useReducer` do that Context doesn't?** → Different concerns: `useReducer` manages how state transitions happen (the logic). Context manages where state is accessible (the distribution). They compose: `useReducer` + Context is the typical pattern — `useReducer` holds the state logic, Context distributes state and dispatch to the component tree.
2. **What's the difference between Redux and `useReducer`?** → `useReducer` is local to a component (and possibly its Context subtree). Redux is global app state with middleware, DevTools, time-travel debugging, and selectors. `useReducer` doesn't have middleware (no async action support without custom logic), no DevTools integration, and no cross-component subscription granularity. Redux is the tool when state must be shared across many components and has complex async flows; `useReducer` is for component-level complex state.
3. **Can you use `useReducer` for async operations?** → Not directly — the reducer must be a pure synchronous function. For async, you dispatch a start action, run the async in the component/effect, then dispatch success/error actions. Or use the `useReducer` + `useEffect` pattern where effects read the `status` field from state and trigger async operations when it changes.
4. **What is the `init` (third) argument to `useReducer`?** → The third argument is a lazy initializer function: `useReducer(reducer, initialArg, initFn)` → initial state is `initFn(initialArg)`. This mirrors `useState`'s lazy initializer — runs once, enables computing complex initial state from a simple seed value. Useful for initializing a large state object from URL params, localStorage, or props.

### Senior Signal

> "My mental model: single state value with simple transitions → useState. Multiple related values or complex transitions → useReducer. The tipping point is usually when I find myself writing the same spread update pattern in multiple event handlers: `setPerson(prev => ({...prev, name: newName}))` in three different handlers is a signal that these handlers belong in a reducer. The added benefit — the isolation of the reducer as a pure function — means I can do property-based testing on it, throwing random sequences of actions and verifying invariants always hold. This kind of reducer testing found a cart total bug at Oracle that would have taken hours to reproduce through the UI."

---

## 💻 5. Code Example

```typescript
import React, { useReducer, useContext, createContext } from 'react';

// ========================
// 1. Complex multi-step form reducer
// ========================
type WizardStep = 'personalInfo' | 'accountSetup' | 'preferences' | 'review' | 'done';

interface WizardState {
  currentStep: WizardStep;
  personalInfo: { name: string; email: string; phone: string };
  accountSetup: { username: string; password: string };
  preferences: { theme: string; notifications: boolean };
  stepValidity: Record<WizardStep, boolean>;
  isSubmitting: boolean;
  submitError: string | null;
}

type WizardAction =
  | { type: 'COMPLETE_PERSONAL_INFO'; data: WizardState['personalInfo'] }
  | { type: 'COMPLETE_ACCOUNT_SETUP'; data: WizardState['accountSetup'] }
  | { type: 'COMPLETE_PREFERENCES'; data: WizardState['preferences'] }
  | { type: 'GO_BACK' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string };

const STEP_ORDER: WizardStep[] = ['personalInfo', 'accountSetup', 'preferences', 'review', 'done'];

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'COMPLETE_PERSONAL_INFO':
      return {
        ...state,
        personalInfo: action.data,
        currentStep: 'accountSetup',
        stepValidity: { ...state.stepValidity, personalInfo: true },
      };
    case 'COMPLETE_ACCOUNT_SETUP':
      return {
        ...state,
        accountSetup: action.data,
        currentStep: 'preferences',
        stepValidity: { ...state.stepValidity, accountSetup: true },
      };
    case 'COMPLETE_PREFERENCES':
      return {
        ...state,
        preferences: action.data,
        currentStep: 'review',
        stepValidity: { ...state.stepValidity, preferences: true },
      };
    case 'GO_BACK': {
      const currentIndex = STEP_ORDER.indexOf(state.currentStep);
      const prevStep = currentIndex > 0 ? STEP_ORDER[currentIndex - 1] : state.currentStep;
      return { ...state, currentStep: prevStep };
    }
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, submitError: null };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, currentStep: 'done' };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, submitError: action.error };
    default:
      return state;
  }
}

const initialWizardState: WizardState = {
  currentStep: 'personalInfo',
  personalInfo: { name: '', email: '', phone: '' },
  accountSetup: { username: '', password: '' },
  preferences: { theme: 'light', notifications: true },
  stepValidity: {
    personalInfo: false, accountSetup: false, preferences: false, review: false, done: false
  },
  isSubmitting: false,
  submitError: null,
};

// ========================
// 2. useReducer + Context pattern
// ========================
const WizardContext = createContext<{
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
} | null>(null);

function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}

function useWizard() {
  const context = useContext(WizardContext);
  if (!context) throw new Error('useWizard must be used within WizardProvider');
  return context;
}

// ========================
// 3. Step component using dispatch — no prop drilling
// ========================
function PersonalInfoStep() {
  const { state, dispatch } = useWizard();
  const [formData, setFormData] = React.useState(state.personalInfo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'COMPLETE_PERSONAL_INFO', data: formData });
    // dispatch is stable — no useCallback needed
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} />
      <input value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} />
      <button type="submit">Next</button>
    </form>
  );
}

// ========================
// 4. Pure reducer tests (no React needed)
// ========================
// These run in regular Node.js/Jest without jsdom or render:

function testWizardReducer() {
  // Test COMPLETE_PERSONAL_INFO advances step
  const after = wizardReducer(initialWizardState, {
    type: 'COMPLETE_PERSONAL_INFO',
    data: { name: 'Hruday', email: 'h@example.com', phone: '1234567890' }
  });
  console.assert(after.currentStep === 'accountSetup', 'Should advance to accountSetup');
  console.assert(after.stepValidity.personalInfo === true, 'personalInfo should be valid');

  // Test GO_BACK from accountSetup returns to personalInfo
  const goBack = wizardReducer(after, { type: 'GO_BACK' });
  console.assert(goBack.currentStep === 'personalInfo', 'Should go back to personalInfo');
}
```

---

## 🧠 6. Memory Aid

**Mental Model:** `useReducer` is like a switch control panel with labeled buttons (actions). Each button triggers a well-defined state change. `useState` is a direct dial — turn it to any value at any time. When you have many dials that must always be turned together in specific combinations, a labeled button panel is cleaner and safer.

**If you go blank:** "useReducer = useState with explicit named transitions. Use when: multiple related state values change together, complex transition logic, FSM behavior, testable pure logic. dispatch is stable — safe to pass deep via Context."

**Mnemonic:** **CATS** — **C**omplex transitions, **A**tomic updates, **T**estable pure logic, **S**table dispatch.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Correctness: Complex state transitions with multiple related values are a source of subtle bugs when expressed as multiple `useState` calls — invalid intermediate states become possible; `useReducer` makes invalid states impossible to express (the reducer either produces valid state or falls through to `return state`)
→ Testability: Pure reducers are the most testable unit in a React application — zero mocking, zero rendering overhead, deterministic given the same inputs; high-coverage reducer tests give safety for complex business logic
→ Maintainability: Named action types are self-documenting communication about what operations the component supports; reading `dispatch({ type: 'SUBMIT_ERROR', error: '...' })` is clearer than `setLoading(false); setSubmitError('...')` spread across the component

**How it works (3 sentences):**
`useReducer` stores the current state and the reducer function on the fiber's hook linked list; when `dispatch(action)` is called, React enqueues an update with the action object and schedules a re-render, and during that render React runs `newState = reducer(currentState, action)` to produce the next state for display. The `dispatch` function reference is stable across renders — like `useState`'s setter function, it's created once per fiber and doesn't change, making it safe to pass through Context and deep component trees without requiring `useCallback` wrapping. Unlike `useState`, which stores the state value directly as the "identity-reducer" action is just the new value, `useReducer` stores the reducer separately and applies it during state computation — enabling complex multi-field updates, FSM-style transition rules, and derived value computation all within a single predictable pure function.

**Company relevance:**
- Microsoft: OneNote Web page editor — `useReducer` for rich text formatting toolbar state; a `SELECTION_CHANGED` action atomically updates bold/italic/underline/style/alignment/color/indent state from one selection read operation
- Adobe: Illustrator Web artboard management — `useReducer` for artboard CRUD operations (add, delete, duplicate, resize, reorder); all operations expressed as named actions with constraint enforcement in the reducer (minimum one artboard, max dimensions, etc.)
- Salesforce: Opportunity stage management — `useReducer` encodes the Opportunity lifecycle FSM; transitions that are invalid in the Salesforce data model return the same state (no-op from wrong stage), preventing stage pollution bugs
- Cisco: Network policy rule builder — `useReducer` for rule condition tree (AND/OR groups of conditions); add/remove/reorder/negate operations on complex nested trees are cleanly testable as pure reducer transitions

---
✅ Topic 92/486 complete → Continuing to Topic 93: useContext — Performance Pitfalls, Context Splitting
