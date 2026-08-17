# 137. Global State Management
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Global state is application state that needs to be accessed or mutated by multiple components that aren't in a direct parent-child relationship. The three modern options are: **Redux Toolkit** (explicit, predictable, excellent DevTools — ideal when you need time-travel debugging, complex interactions, or a large team sharing state conventions), **Zustand** (minimal boilerplate, selector-based subscriptions, no Provider needed — ideal for small-medium apps or domain-specific stores), and **Jotai/Recoil** (atomic state — each piece can be subscribed independently with no re-renders in unsubscribed components — ideal for granular state with many independent pieces). The important discipline is not which library but when to use global state at all: most UI state (modal open, hover, form input) should never go global.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

When two or more component trees need to share state and lifting state would either be impractical (they're in separate subtrees) or cause too many intermediate re-renders, global state provides a shared external store. The component subscribes to the store; the store notifies subscribers on change.

```typescript
// The problem global state solves:
//
//       App
//      /    \
//  Header   MainContent
//            /     \
//       Sidebar   ProductList
//                    \
//                  ProductCard
//                      \
//                   AddToCartBtn
//
// CartCount lives in Header. AddToCartBtn lives deep in ProductCard.
// Passing cart state down AND up through this tree = prop drilling + many re-renders.
// Global store: both Header and AddToCartBtn connect directly to the cart store.
```

### Zustand — Modern Minimal Store

```typescript
// ---- SETUP ----
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface CartItem { id: string; name: string; price: number; qty: number; }

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  // Derived — selectors, not stored state
}

const useCartStore = create<CartStore>()(
  devtools(         // Redux DevTools integration
    persist(        // localStorage persistence
      immer(        // Immer — write mutating-style, produces immutable updates
        (set, get) => ({
          items: [],

          addItem: (item) => set((state) => {
            const existing = state.items.find(i => i.id === item.id);
            if (existing) {
              existing.qty += 1;  // Immer makes this safe
            } else {
              state.items.push({ ...item, qty: 1 });
            }
          }),

          removeItem: (id) => set((state) => {
            state.items = state.items.filter(i => i.id !== id);
          }),

          updateQty: (id, qty) => set((state) => {
            if (qty <= 0) {
              state.items = state.items.filter(i => i.id !== id);
            } else {
              const item = state.items.find(i => i.id === id);
              if (item) item.qty = qty;
            }
          }),

          clearCart: () => set({ items: [] }),
        })
      ),
      { name: 'cart-storage' }  // localStorage key
    ),
    { name: 'CartStore' }  // DevTools label
  )
);

// ---- SELECTORS — critical for performance ----
// Components subscribe to the smallest slice of state they need

// ✅ Selector: subscribes only to item count — only re-renders when count changes
function CartIcon() {
  const count = useCartStore(state => state.items.reduce((sum, i) => sum + i.qty, 0));
  return <span aria-label={`${count} items in cart`}>{count}</span>;
}

// ✅ Selector: only re-renders when THIS item changes
function CartItemRow({ id }: { id: string }) {
  const item = useCartStore(state => state.items.find(i => i.id === id));
  const removeItem = useCartStore(state => state.removeItem);
  if (!item) return null;
  return (
    <div>
      <span>{item.name} × {item.qty}</span>
      <button onClick={() => removeItem(id)}>Remove</button>
    </div>
  );
}

// ❌ Anti-pattern: subscribes to ENTIRE store — re-renders on ANY state change
function CartIconBad() {
  const store = useCartStore();  // no selector → watches everything
  return <span>{store.items.length}</span>;
}
```

### Redux Toolkit — When You Need Explicit Data Flow at Scale

```typescript
// Redux Toolkit shines when:
// - Large team with multiple developers writing state mutations
// - Need time-travel debugging and exact action replay (live support, bug reproduction)
// - Complex async flows with side effects that need testing in isolation
// - State shape needs to be explicit and well-documented via action types

// cartSlice.ts
import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';

interface CartState { items: CartItem[]; }
const initialState: CartState = { items: [] };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    itemAdded(state, action: PayloadAction<Omit<CartItem, 'qty'>>) {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) { existing.qty++; }
      else { state.items.push({ ...action.payload, qty: 1 }); }
    },
    itemRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    cartCleared(state) { state.items = []; },
  },
});

export const { itemAdded, itemRemoved, cartCleared } = cartSlice.actions;
export default cartSlice.reducer;

// Memoized selector — recomputes only when items array changes
export const selectCartTotal = createSelector(
  (state: RootState) => state.cart.items,
  (items) => items.reduce((sum, i) => sum + i.price * i.qty, 0)
);

// Usage in component:
function CartTotal() {
  const total = useAppSelector(selectCartTotal);  // re-renders only when total changes
  return <span>${total.toFixed(2)}</span>;
}
```

### Jotai — Atomic State for Granular Subscriptions

```typescript
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Primitive atoms
const cartItemsAtom = atomWithStorage<CartItem[]>('cart', []);

// Derived atoms (like selectors but composable)
const cartCountAtom = atom((get) => {
  const items = get(cartItemsAtom);
  return items.reduce((sum, i) => sum + i.qty, 0);
});

const cartTotalAtom = atom((get) => {
  const items = get(cartItemsAtom);
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
});

// Write-only atom (action)
const addItemAtom = atom(
  null,
  (get, set, item: Omit<CartItem, 'qty'>) => {
    set(cartItemsAtom, (prev) => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  }
);

// Components subscribe to only what they need
function CartIcon() {
  const count = useAtomValue(cartCountAtom);  // reads cartCount only
  return <span>{count}</span>;
}

function CartTotal() {
  const total = useAtomValue(cartTotalAtom);  // reads cartTotal only
  return <span>${total.toFixed(2)}</span>;
}

// No Provider needed (unlike Context) — atoms are module-level singletons
// Perfect for: granular atoms that many unrelated components subscribe to independently
```

### Architecture & Component Boundaries

```typescript
// Boundary model: what belongs in global state?
//
// ✅ Global State:
//   - Authentication (user, roles, token) — needed everywhere
//   - Shopping cart — cross-tree, needs to persist
//   - Application theme (dark/light) — affects all components
//   - Notifications queue — managed centrally, rendered anywhere
//   - Feature flags — read by many unrelated components
//
// ❌ Should NOT be global:
//   - Modal open/closed — put in the component that renders the modal
//   - Form field values — local to the form
//   - Hover states — local CSS or local useState
//   - Scroll position — local or URL hash
//   - Currently selected list item — local, lifted at most to list parent
```

### Performance Implications

```typescript
// The key insight: global stores cause re-renders in ALL subscribing components
// when the subscribed slice changes.

// Zustand: selector granularity controls blast radius
const name = useStore(s => s.user.name);     // re-renders only when name changes
const user = useStore(s => s.user);          // re-renders when anything in user changes
const store = useStore();                    // re-renders on any store change ← worst

// Redux: createSelector prevents re-render if result is same
const selectExpensiveData = createSelector(
  (state) => state.data.list,
  (list) => list.filter(item => item.active).map(item => item.id)
  // Only recomputes when list changes; component only re-renders when output array changes
);

// Zustand shallow comparison for object/array selectors:
import { shallow } from 'zustand/shallow';

const { name, email } = useUserStore(
  state => ({ name: state.name, email: state.email }),
  shallow  // prevents re-render if name+email values are same even if new object
);
```

### Trade-offs

| Zustand | Redux Toolkit | Jotai |
|---|---|---|
| Minimal boilerplate | Verbose but explicit | Most granular subscriptions |
| No Provider | Requires Provider | No Provider |
| Great DevTools via middleware | Best DevTools | Basic DevTools |
| Best for: small-medium apps, domain stores | Best for: large teams, complex flows | Best for: many independent atoms |
| Bundle: ~2KB | Bundle: ~16KB | Bundle: ~3KB |

### ⚠️ Anti-Patterns & Pitfalls

- **No selector / watching entire store** — `useStore()` without a selector re-renders on every state change; always select the minimum slice needed
- **Storing server state in global store** — fetched API data is server state; use TanStack Query instead of manually loading into Redux; avoid parallel caching systems
- **Too many stores or atom namespaces** — splitting state arbitrarily across 15 Zustand stores adds mental overhead; one store per domain (cart, auth, UI) is a good balance
- **Synchronous global store for async operations without error/loading state** — if you store `items: Product[]` globally but not loading/error states, consumers can't distinguish "empty cart" from "cart not loaded yet"

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the application shell used NgRx (the Angular equivalent of Redux) for user session, permissions, and cross-module notifications. When migrating UI modules to React, Zustand was chosen for the React micro-frontends over Redux because: smaller bundle (2KB vs 16KB), no Provider wrapping needed in the shell's React islands, and the team was small enough that explicit action typing wasn't a bottleneck. Auth state was kept in Zustand with an `authAtom`-style pattern; UI-only state was strictly local.

**At FAANG scale:**
- **Microsoft:** Teams Web App uses Redux for chat state (message threads, presence, meeting state) — time-travel debugging is critical for reproducing user-reported chat ordering bugs; the action log tells support which events occurred in what order
- **Adobe:** Express uses Zustand for the design canvas state (selected layers, clipboard, zoom level) — the selector-based model prevents re-renders in non-selected layer components when other layers change
- **Salesforce:** LWC uses a pub/sub model via Lightning Message Service as its "global state" — components subscribe to channels; analogous to Zustand stores but framework-native
- **Cisco:** Network dashboard uses Redux with normalized state (by device ID) and `createEntityAdapter` for device lists; 500+ devices updated via WebSocket without full list re-renders

---

## 💬 4. Interview Execution

### Sample Answer

> "Global state management is about choosing the right tool for state that genuinely needs to cross component tree boundaries. My framework for this decision: Zustand for most React apps — it's 2KB, no Provider needed, selector-based subscriptions keep re-renders minimal. Redux Toolkit when the team is large, the interactions are complex (actions triggering multiple reducers, effects), or you need the full action history for debugging. Jotai for highly granular, independently-changing atoms where you want each component to subscribe to exactly the data it needs.
>
> The more important discipline is restraint: only server-fetched data, authentication state, cross-tree UI state (notifications, theme, cart), and feature flags belong globally. I've seen codebases where developers put every useState into Redux because 'it might be needed elsewhere' — every component then re-renders on any change and the DevTools becomes noise. I treat global state like a database: you add a record when multiple independent readers genuinely need it, not as a habit."

### Likely Follow-up Questions
1. "Zustand vs Redux — when would you choose Redux?" → Large team, complex async effects, time-travel debugging requirement, strong convention enforcement
2. "How do Zustand selectors prevent re-renders?" → Component re-renders only when the selected slice changes, not when unrelated state changes
3. "How do you avoid the 'whole store' subscription mistake?" → Always pass a selector function; use `shallow` for object/array returns
4. "What about Context for global state?" → Context re-renders all consumers on any change — fine for low-frequency state (theme, locale), wrong for frequently updating state (cart qty, notifications)
5. "How do you handle async in Zustand?" → `async` functions directly inside `set`/`get` actions; no middleware needed unlike Redux

### vs Alternatives

| Zustand | Context API | Redux Toolkit |
|---|---|---|
| Selector-based: only subscribed slice triggers re-render | All consumers re-render | Memoized selectors prevent unnecessary re-renders |
| No Provider | Provider wrapping required | Provider required |
| Built-in devtools middleware | No DevTools | Best DevTools (time travel) |

---

## 💻 5. Code Example

```typescript
// Multi-store architecture — domain-separated Zustand stores

// ---- auth.store.ts ----
interface AuthState {
  user: { id: string; name: string; role: 'admin' | 'viewer' } | null;
  token: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    immer((set) => ({
      user: null,
      token: null,
      login: async (credentials) => {
        const { user, token } = await api.auth.login(credentials);
        set((state) => { state.user = user; state.token = token; });
      },
      logout: () => set((state) => { state.user = null; state.token = null; }),
    })),
    { name: 'Auth' }
  )
);

// Typed selectors — defined alongside the store to encourage reuse
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'admin';
export const selectUserId = (s: AuthState) => s.user?.id;

// ---- notifications.store.ts ----
interface Notification { id: string; message: string; type: 'success' | 'error' | 'info'; }

interface NotificationStore {
  queue: Notification[];
  add: (n: Omit<Notification, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  immer((set) => ({
    queue: [],
    add: (n) => set((state) => {
      state.queue.push({ ...n, id: crypto.randomUUID() });
    }),
    dismiss: (id) => set((state) => {
      state.queue = state.queue.filter(n => n.id !== id);
    }),
  }))
);

// ---- Usage ----
function AdminBadge() {
  // Subscribes only to isAdmin — re-renders only when role changes
  const isAdmin = useAuthStore(selectIsAdmin);
  if (!isAdmin) return null;
  return <span className="badge">Admin</span>;
}

function NotificationToast() {
  const { queue, dismiss } = useNotificationStore();
  return (
    <div role="region" aria-live="polite" aria-label="Notifications">
      {queue.map(n => (
        <div key={n.id} role="alert">
          <span>{n.message}</span>
          <button onClick={() => dismiss(n.id)} aria-label="Dismiss notification">×</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**Global State Decision — ACTS:**
- **A**uth — always global (user identity is needed everywhere)
- **C**ross-tree — needed by two or more unrelated subtrees
- **T**ranscends navigation — must survive route changes or page reloads
- **S**hared mutations — multiple sources write to the same state

**Library selection — team size + complexity:**
- Solo / small team → Zustand
- Large team / complex flows → Redux Toolkit
- Many independent atoms → Jotai
- Low-frequency + no mutation → Context

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The most senior signal in a state management answer is knowing when NOT to use a global store — if you immediately reach for Redux for everything, it shows you don't know the cost; if you articulate "local first, global only when the data genuinely crosses trees or needs to survive navigation," it shows architectural judgment
→ Zustand's `shallow` comparator for object selectors is a subtle but critical performance detail — `useStore(s => ({ a: s.a, b: s.b }))` will re-render every time because a new object reference is returned each call; without `shallow`, it defeats the purpose of the selector; showing you know this demonstrates you've debugged real Zustand re-render issues
→ Redux's `createSelector` uses memoization (same inputs → cached output reference) which prevents React from re-rendering when the derived data hasn't changed — connecting this to React's re-render rules (same reference = no re-render for `React.memo` components) demonstrates you understand the full chain

**How it works (2 sentences):**
Zustand's store is a plain JavaScript module-level object (a closure) containing state and setters; `useStore(selector)` is a React hook that subscribes the component to the store via an event listener, calling `setState` (React's internal mechanism) only when the selector's return value changes (by reference or `shallow` equality) — this is why components with granular selectors re-render far less than those watching the whole store.
Redux uses a single external store with a publish-subscribe mechanism: `dispatch(action)` synchronously runs the root reducer (combining all slice reducers), produces a new state object, and then calls every subscriber; `useSelector` in each component runs its selector against the new state, compares the result to the previous result using strict equality, and triggers a React re-render only if they differ — which is why `createSelector` (memoized, stable reference if inputs unchanged) is essential for derived objects and arrays.

---
✅ Topic 137/486 complete → Continuing to Topic 138: Prop Drilling vs Context
