# 111. Redux Core — Store, Actions, Reducers, Middleware
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Redux is a predictable state container built on three principles: single source of truth (one store), state is read-only (changed only by dispatching actions), and changes are made by pure functions (reducers). An **action** is a plain object `{ type, payload }` describing what happened. A **reducer** is a pure function `(state, action) => newState` that produces the next state without mutations. The **store** holds state, provides `getState()`, `dispatch()`, and `subscribe()`. **Middleware** intercepts `dispatch()` to add logic like logging, async operations, or crash reporting. Today, you write Redux with Redux Toolkit (RTK), which eliminates most boilerplate — but understanding the core model is essential for debugging, migration, and architectural decisions.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Three Principles Diagrammed

```
     UI dispatches action
            │
            ▼
     dispatch({ type: 'ADD_TO_CART', payload: item })
            │
     ┌──────┴──────────────────────────────────────┐
     │          Middleware Chain                    │
     │  logger → thunk → analytics → next(action)  │
     └──────────────────────────────────────────────┘
            │
            ▼
     Reducer: pure function (currentState, action) → newState
     [cartReducer, userReducer, uiReducer] via combineReducers
            │
            ▼
     Store.setState(newState)
            │
            ▼
     All subscribers notified → UI re-renders with useSelector
```

### Redux Data Flow — Pure Implementation

```typescript
// ========================
// 1. Actions: plain objects with type + optional payload
// ========================
const ADD_TO_CART = 'cart/addItem' as const;
const REMOVE_FROM_CART = 'cart/removeItem' as const;
const CLEAR_CART = 'cart/clear' as const;

// Action creators: functions that return action objects
const addToCart = (item: CartItem) => ({ type: ADD_TO_CART, payload: item });
const removeFromCart = (id: string) => ({ type: REMOVE_FROM_CART, payload: id });
const clearCart = () => ({ type: CLEAR_CART });

// ========================
// 2. Reducers: pure (state, action) => newState
// ========================
interface CartState { items: CartItem[]; total: number }
const initialCartState: CartState = { items: [], total: 0 };

function cartReducer(state = initialCartState, action: CartAction): CartState {
  switch (action.type) {
    case ADD_TO_CART: {
      // ✅ Never mutate state — return new object
      const newItems = [...state.items, action.payload];
      return {
        items: newItems,
        total: newItems.reduce((sum, item) => sum + item.price, 0),
      };
    }
    case REMOVE_FROM_CART: {
      const newItems = state.items.filter(item => item.id !== action.payload);
      return {
        items: newItems,
        total: newItems.reduce((sum, item) => sum + item.price, 0),
      };
    }
    case CLEAR_CART:
      return initialCartState;
    default:
      return state;  // ← always return current state for unknown actions
  }
}

// ========================
// 3. Store: single source of truth
// ========================
import { createStore, combineReducers, applyMiddleware } from 'redux';

const rootReducer = combineReducers({
  cart: cartReducer,
  user: userReducer,
});
export type RootState = ReturnType<typeof rootReducer>;

const store = createStore(
  rootReducer,
  applyMiddleware(thunkMiddleware, loggerMiddleware)
);

// Store API:
store.getState();                // { cart: {...}, user: {...} }
store.dispatch(addToCart(item)); // action goes through middleware → reducers → state update
store.subscribe(() => {          // called after every dispatch
  console.log('State updated:', store.getState());
});
```

### Middleware — The Intercept Layer

```typescript
// Middleware signature: store => next => action => result
// Each middleware wraps the next one (curried HOF)

// ① Logger middleware — for debugging
const loggerMiddleware = (store: MiddlewareAPI) =>
  (next: Dispatch) =>
  (action: AnyAction) => {
    console.group(action.type);
    console.log('Before:', store.getState());
    const result = next(action);  // ← call next middleware or reducer
    console.log('After:', store.getState());
    console.groupEnd();
    return result;
  };

// ② Redux Thunk middleware — enables async action creators
//    A "thunk" = a function dispatched instead of an action object
const thunkMiddleware = (store: MiddlewareAPI) =>
  (next: Dispatch) =>
  (action: AnyAction | ThunkAction) => {
    if (typeof action === 'function') {
      // If action is a function, call it with dispatch and getState
      return action(store.dispatch, store.getState);
    }
    return next(action);  // pass plain objects through normally
  };

// ② Thunk usage (plain Redux, pre-RTK)
function fetchCartItems(userId: string) {
  // Returns a function (thunk) instead of an action object
  return async (dispatch: Dispatch, getState: () => RootState) => {
    dispatch({ type: 'cart/fetchPending' });
    try {
      const data = await api.getCart(userId);
      dispatch({ type: 'cart/fetchFulfilled', payload: data });
    } catch (error) {
      dispatch({ type: 'cart/fetchRejected', payload: error.message });
    }
  };
}

// dispatch the thunk
store.dispatch(fetchCartItems('user-123') as any);

// ③ Custom analytics middleware
const analyticsMiddleware = (store: MiddlewareAPI) =>
  (next: Dispatch) =>
  (action: AnyAction) => {
    // Track specific actions to analytics platform
    if (action.type.includes('add') || action.type.includes('purchase')) {
      analytics.track(action.type, action.payload);
    }
    return next(action);
  };

// Middleware ORDER matters: left to right in applyMiddleware
// applyMiddleware(analytics, logger, thunk)
// dispatch() → analytics → logger → thunk → reducer
```

### Selectors — Derived State

```typescript
// Selectors: functions that derive data from state
// Flat selectors — simple field access
const selectCartItems = (state: RootState) => state.cart.items;
const selectCartTotal = (state: RootState) => state.cart.total;
const selectUser = (state: RootState) => state.user;

// Memoized selector with reselect — expensive computation
import { createSelector } from 'reselect';

const selectDiscountedItems = createSelector(
  [selectCartItems, (state: RootState) => state.user.membershipLevel],
  (items, level) => {
    // Only recomputes when items or membershipLevel changes
    const discount = level === 'premium' ? 0.9 : 1;
    return items.map(item => ({ ...item, finalPrice: item.price * discount }));
  }
);

// Without createSelector: recomputes on every dispatch (even unrelated state changes)
// With createSelector: memoized — same inputs → same output cached
```

### Redux vs Context — When to Use Which

```typescript
// Context: simpler, built-in, no extra library
// Use for: auth, theme, locale, feature flags, user preferences
// Issues at scale: no middleware, no DevTools time travel, no performance optimizations

// Redux: structured, predictable, DevTools, middleware
// Use for: complex shared business state (cart, orders, inventory)
//          server cache with complex invalidation
//          state shared across many components far apart in the tree
//          need audit trail / time-travel debugging

// Decision matrix:
// - 2-3 components sharing state → useState + prop drilling or Context
// - Medium complexity form, wizard → useReducer
// - Large app with many independent features → Redux Toolkit
// - Server state (fetched data, caching) → React Query or RTK Query
//   NOT Redux: server state has different requirements (caching, stale-while-revalidate, refetching)
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP Labs, the shopping cart, session state, and navigation breadcrumbs were in Redux. The critical architectural decision: keeping SERVER data (product catalog, inventory, orders) in Redux vs. migrating to React Query. After the migration, React Query handled all read-side server data (with stale-while-revalidate, automatic refetching), while Redux retained only CLIENT state (cart contents not yet submitted, UI state like selected filters, active panel). This reduced the Redux store size by ~70% and eliminated dozens of `loadingStates` and `errorStates` that Redux-Thunk required.

**At FAANG scale:**
- **Microsoft:** Teams web client uses Redux for presence state, notification badges, active conversation IDs — data that multiple components across the layout need simultaneously
- **Adobe:** Experience Platform uses Redux for complex multi-step data pipeline wizard state — each step's selections affect available options in subsequent steps
- **Salesforce:** Opportunity pipeline board uses Redux for drag-drop state across stages — requires atomic updates across multiple list positions
- **Cisco:** WebEx meeting state (participants, audio/video status, screen share) in Redux — real-time updates via WebSocket middleware dispatching actions

---

## 💬 4. Interview Execution

### Sample Answer

> "Redux's model is three concepts: actions (plain objects describing events), reducers (pure functions computing next state from current state and an action), and a single store holding the entire application state tree. Middleware sits between dispatch and the reducer — it's how you handle async operations (thunk), logging, analytics, or crash reporting.
>
> The power is predictability: given any sequence of actions dispatched, Redux produces a deterministic state — you can replay every action in DevTools and see exactly what state you had at any point in time. That's impossible if state mutations are scattered across components.
>
> In practice, I use Redux Toolkit (RTK), which eliminates the boilerplate — `createSlice` handles the action types, action creators, and reducer in one declaration; Immer handles immutable updates with mutable syntax. But the underlying model is identical.
>
> The architectural mistake I've seen most often: using Redux for server data. When people store API responses in Redux as "cache" and wire up loading/error states manually per-reducer, they're building a worse version of React Query. Modern pattern: Redux for client/UI state, React Query or RTK Query for server state."

---

## 💻 5. Code Example

```typescript
// ========================
// Vanilla Redux — understanding the fundamentals
// ========================
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import type { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux';

// — State Types —
interface CartItem { id: string; name: string; price: number; quantity: number }
interface CartState { items: CartItem[]; status: 'idle' | 'loading' | 'error' }
interface RootState { cart: CartState }

// — Action Types (discriminated union) —
type CartAction =
  | { type: 'cart/add'; payload: CartItem }
  | { type: 'cart/remove'; payload: string }
  | { type: 'cart/updateQty'; payload: { id: string; qty: number } }
  | { type: 'cart/clear' }
  | { type: 'cart/fetch/pending' }
  | { type: 'cart/fetch/fulfilled'; payload: CartItem[] }
  | { type: 'cart/fetch/rejected' };

// — Reducer —
const initialState: CartState = { items: [], status: 'idle' };

function cartReducer(state = initialState, action: CartAction): CartState {
  switch (action.type) {
    case 'cart/fetch/pending':
      return { ...state, status: 'loading' };

    case 'cart/fetch/fulfilled':
      return { items: action.payload, status: 'idle' };

    case 'cart/fetch/rejected':
      return { ...state, status: 'error' };

    case 'cart/add':
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };

    case 'cart/remove':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };

    case 'cart/updateQty':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.payload.id ? { ...i, quantity: action.payload.qty } : i
        ),
      };

    case 'cart/clear':
      return initialState;

    default:
      return state;
  }
}

// — Thunk (async action creator) —
function fetchCart(userId: string) {
  return async (dispatch: Dispatch) => {
    dispatch({ type: 'cart/fetch/pending' } as const);
    try {
      const response = await fetch(`/api/cart/${userId}`);
      const items: CartItem[] = await response.json();
      dispatch({ type: 'cart/fetch/fulfilled', payload: items } as const);
    } catch {
      dispatch({ type: 'cart/fetch/rejected' } as const);
    }
  };
}

// — Store —
const rootReducer = combineReducers({ cart: cartReducer });

// Redux DevTools integration (production-safe)
const composeEnhancers =
  (typeof window !== 'undefined' &&
    (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
  compose;

const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk))
);

// — Selectors —
import { createSelector } from 'reselect';
const selectItems = (s: RootState) => s.cart.items;
const selectCartTotal = createSelector(
  selectItems,
  items => items.reduce((sum, i) => sum + i.price * i.quantity, 0)
);
const selectItemCount = createSelector(
  selectItems,
  items => items.reduce((sum, i) => sum + i.quantity, 0)
);

// Type stubs
declare const thunk: Middleware;
```

---

## 🧠 6. Memory Aid

**Redux in one sentence:** Unidirectional data flow — one place to change state, one way to read it.

**Three roles:**
- **Action** = "What happened" (event description as plain object)
- **Reducer** = "What changes" (pure state transformation)
- **Store** = "Current truth" (holds state, exposes dispatch + subscribe)

**Middleware chain visualization:**
`dispatch(action)` → `[logger → thunk → analytics]` → `reducer` → new state → subscribers

**The three must-know constraints:**
1. Reducers must be pure (no side effects, no API calls)
2. State must be immutable (return new objects, never mutate)
3. Async logic lives in middleware (thunk), not reducers

**Mnemonic:** **ARS-M** — **A**ctions describe events, **R**educers transform state, **S**tore holds truth, **M**iddleware handles async/side-effects.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Debugging: time-travel debugging in Redux DevTools — ability to replay any action sequence and inspect state at each step — is a superpower for complex bugs that would take hours to reproduce manually
→ Architectural clarity: Redux forces explicit modeling of all state transitions — every change to global state is a named, typed action, which makes the codebase auditable ("what could have caused this state?")
→ Migration context: most large enterprise React codebases (Hruday's SAP background) have Redux; understanding the core model is required to work with, maintain, and migrate legacy code even when greenfield work uses RTK

**How it works (2 sentences):**
Redux implements a publish-subscribe pattern with an enforced unidirectional flow: when `dispatch(action)` is called, the action passes through the middleware chain sequentially (each middleware can intercept, transform, or skip the action), eventually reaching the root reducer which calls each slice reducer via `combineReducers` to produce the next state tree, then notifies all subscribers (React components using `useSelector`) whose selected state slices changed.
The immutability requirement works because Redux uses strict reference equality (`===`) to detect state changes — if a reducer mistakenly mutates the existing state object and returns it, Redux sees the same reference, assumes no change occurred, and subscribers are NOT notified, causing silent UI bugs — which is why RTK's Immer integration is valuable: it lets you write `state.items.push(item)` in reducers while Immer produces an immutable copy behind the scenes.

---
✅ Topic 111/486 complete → Continuing to Topic 112: Redux Toolkit — createSlice, createAsyncThunk, createEntityAdapter
