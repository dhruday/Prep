# 67. Redux / Zustand / Signals

## 1. High-Level Explanation (Frontend Interview Level)

**Redux**, **Zustand**, and **Signals** represent three distinct generations and philosophies of global state management in modern frontend development. **Redux** (2015) introduced strict unidirectional data flow — every state change is an explicit action dispatched through a reducer — providing predictable state mutations and excellent debugging (time-travel via Redux DevTools). **Zustand** (2019) stripped away Redux ceremony: no boilerplate, no action types, no reducers — just a hook with state and setters in a single closure. **Signals** (2022–present) represent the reactive programming model — a signal is a reactive variable; any computation that reads a signal automatically re-subscribes and re-executes when the signal changes — a fundamentally different model from React's top-down render tree. Knowing when to choose each, and the philosophical differences between them, is expected at senior/staff level.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Redux — The Unidirectional Flux Architecture

```
Redux data flow (strict one-way):
  
  Component → dispatch(action) → Middleware (Thunk/Saga) → Reducer → New State → Component re-renders

  Store: { state, dispatch }
  Action: { type: 'cart/addItem', payload: { productId, quantity } }
  Reducer: pure function (prevState, action) → newState
  Selector: (state) → subset of state the component needs
  Middleware: intercepts dispatch — handles async, logging, analytics
```

**Redux Toolkit (RTK) — Modern Redux:**
```typescript
import { createSlice, configureStore, createSelector } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as CartItem[] },
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      // Immer allows "mutations" that are converted to immutable updates
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) existing.quantity += action.payload.quantity;
      else state.items.push(action.payload);
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
  },
});

const store = configureStore({ reducer: { cart: cartSlice.reducer } });
type RootState = ReturnType<typeof store.getState>;

// Memoised selector
const selectCartCount = createSelector(
  (s: RootState) => s.cart.items,
  (items) => items.reduce((n, i) => n + i.quantity, 0)
);
```

**Why choose Redux:**
- Large teams where strict data flow discipline prevents bugs
- Need time-travel debugging (Redux DevTools record every action + state diff)
- Complex async flows requiring middleware (Sagas for complex orchestration)
- Already using RTK Query for server state in the same ecosystem

**Why avoid Redux:**
- Small teams or small apps where the boilerplate-to-value ratio is poor
- When you just need a shared variable, not a full flux architecture
- Bundle size constraint: RTK adds ~11KB gzipped

---

### Zustand — Minimal, Pragmatic State

```typescript
import { create } from 'zustand';

// State and actions in one flat object — no action types, no reducers
interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: () => number;  // inline derived getter
}

const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  
  addItem: (item) => set((state) => {
    const exists = state.items.find(i => i.id === item.id);
    if (exists) {
      return { items: state.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i) };
    }
    return { items: [...state.items, item] };
  }),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id),
  })),
  
  clearCart: () => set({ items: [] }),
  
  // Derived getter — read-only computed value
  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));

// Component: subscribe to only the exact slice needed
function CartBadge() {
  // CRITICAL: selector function prevents re-renders on unrelated state changes
  const count = useCartStore((state) => state.items.reduce((n, i) => n + i.quantity, 0));
  return <span>{count}</span>;
}

function AddToCartButton({ item }) {
  // Actions have stable references — components receiving only actions won't re-render
  const addItem = useCartStore((state) => state.addItem);
  return <button onClick={() => addItem(item)}>Add to Cart</button>;
}
```

**Why choose Zustand:**
- Small-to-medium apps that need shared state without Redux complexity
- Quick iteration — minimal boilerplate
- When you want Redux-like patterns without the ceremony
- Works great in Vite/Next.js apps without complex setup

**Why avoid Zustand:**
- Very large teams where the absence of strict action types reduces code discoverability
- When you need middleware ecosystem (Sagas, Observables)
- When time-travel debugging is a must

---

### Signals — Fine-Grained Reactivity

Signals represent a different model: instead of "component re-renders when subscribed state changes," signals provide **cell-level reactivity** where only the DOM nodes or computations that actually read a signal update when it changes — not the entire component.

```typescript
// Preact Signals (also available: @angular/core signal(), Solid.js, Vue 3 ref())
import { signal, computed, effect } from '@preact/signals-react';

// Signals are reactive primitives — accessed via .value
const cartItems = signal<CartItem[]>([]);

// Computed signals — reactive derived state (auto-tracks dependencies)
const cartCount = computed(() => 
  cartItems.value.reduce((n, i) => n + i.quantity, 0)
);
const cartTotal = computed(() =>
  cartItems.value.reduce((sum, i) => sum + i.price * i.quantity, 0)
);

// Effect — reactive side effect (auto-runs when read signals change)
effect(() => {
  localStorage.setItem('cart', JSON.stringify(cartItems.value));
});

// React component — surgical updates: only the specific JSX that reads the signal re-renders
function CartBadge() {
  // No useState, no useSelector, no render subscription overhead
  // Only the <span> containing cartCount.value updates when cartCount changes
  return <span aria-label={`${cartCount} items in cart`}>{cartCount}</span>;
}

function AddToCartButton({ item }: { item: CartItem }) {
  const handleAdd = () => {
    cartItems.value = [...cartItems.value, item];
    // This update only re-renders components directly reading cartItems or its computed signals
  };
  return <button onClick={handleAdd}>Add to Cart</button>;
}
```

**Angular Signals (v17+):**

```typescript
import { signal, computed, effect, Component } from '@angular/core';

@Component({ template: `<span>{{ count() }}</span>` })
class CartBadgeComponent {
  private cartService = inject(CartService);
  
  // signal() in Angular is the same concept
  count = computed(() => this.cartService.items().length);
  // Angular automatically tracks dependencies and updates only affected template expressions
}
```

**Why choose Signals:**
- Ultra-fine-grained reactivity: only the specific DOM nodes that read a signal re-render — no component-level re-renders
- Better performance for frequently-updating state (live dashboards, games, collaborative editors)
- Angular 17+: signals are the recommended reactive primitive replacing Zone.js
- Solid.js, Qwik: signals are the native state model

**Why not Signals (with React):**
- React's rendering model is component-based; signals require an adapter layer (`@preact/signals-react`) that somewhat undermines React's ownership model
- Less community tooling compared to Redux/Zustand in the React ecosystem currently

---

### Side-by-Side Comparison

| Dimension | Redux | Zustand | Signals |
|---|---|---|---|
| Mental model | Flux (action → reducer → state) | Direct state mutation API | Reactive cell — reads = subscription |
| Boilerplate | High (RTK reduces it significantly) | Minimal | Minimal |
| Bundle size | ~11KB (RTK) | ~1KB | ~1-3KB |
| Re-render granularity | Per selector subscription | Per selector subscription | Per signal read (sub-component level) |
| DevTools | Excellent (time-travel, action log) | Good (Zustand devtools) | Good (Signals devtools) |
| Async | createAsyncThunk / Saga / Observable | Async in store functions | effect() for side effects |
| TypeScript | Excellent (RTK infers types) | Excellent (inferred from store) | Good |
| Best for | Enterprise, large teams, complex async | Small-medium apps, quick iteration | Fine-grained reactive UIs, Angular apps |

---

## 3. Real-World Examples

**Redux at scale:** Linear (project management tool) uses Redux for their entire application state — tasks, cycles, projects, UI panels. The strict action log makes it possible to replay exact user sessions for debugging production issues.

**Zustand in production:** Vercel's internal tooling and several open-source web apps (Excalidraw whiteboard uses Zustand for its drawing state) demonstrate that Zustand's simplicity doesn't sacrifice power.

**Angular Signals (Cisco context):** Cisco's Webex team is migrating from `zone.js`-based Angular to Signals-based Angular for better rendering performance. Real-time call state updates (participant list, video tiles) are signals that update individual DOM nodes without triggering full component-tree change detection cycles.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "Redux, Zustand, and Signals represent three different philosophies. Redux enforces strict unidirectional data flow — every state mutation is traceable through action logs, excellent for large teams and complex async workflows. RTK has removed most of the old boilerplate. Zustand is pragmatic minimalism — just a hook, no action types, no reducers, tiny bundle; I use it when I want shared state without Redux ceremony. Signals are fundamentally different: they're reactive primitives where reading a signal creates a live subscription, and only the exact computation or DOM node that read the signal updates when it changes — no component-tree re-render required. This makes them ideal for high-frequency updates like real-time dashboards or collaborative editors. In Angular 17+, Signals replace zone.js as the reactivity mechanism, which is directly relevant to Cisco Angular codebases. For most new React projects, my default is Zustand for client state + TanStack Query for server state. I reach for Redux when the team is large enough that the discipline of explicit actions adds more value than the boilerplate."

**Likely Follow-up Questions:**
1. How do Signals compare to Redux's useSelector? → Both are selective subscriptions. `useSelector` is at component level (component re-renders). Signals are at expression level (individual JSX nodes update) — more granular. Signals don't need memoised selectors because the reactive tracking is automatic.
2. Is Redux still worth learning in 2024? → Yes — many large enterprise codebases at Microsoft, Salesforce, Cisco still use Redux; RTK Query is an excellent server-state solution; Redux DevTools are still industry-best for debugging complex state flows
3. How does Angular's NgRx compare to Redux? → NgRx IS Redux for Angular — same concepts (store, actions, reducers, effects, selectors) implemented with RxJS; distinctly Angular-flavoured; Effects use RxJS operators instead of Redux Saga; Signals in Angular 17+ provide an alternative for simpler state needs

---

## 5. Code Example

```typescript
// Zustand with middleware (devtools + persist) — production-ready pattern
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface AppStore {
  user: User | null;
  setUser: (user: User | null) => void;
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  dismissNotification: (id: string) => void;
}

export const useAppStore = create<AppStore>()(
  devtools(              // Redux DevTools integration
    persist(             // localStorage persistence
      immer((set) => ({  // Immer for mutable-style updates
        user: null,
        setUser: (user) => set((state) => { state.user = user; }),
        notifications: [],
        addNotification: (n) => set((state) => { state.notifications.push(n); }),
        dismissNotification: (id) => set((state) => {
          state.notifications = state.notifications.filter((n) => n.id !== id);
        }),
      })),
      { name: 'app-store', partialize: (state) => ({ user: state.user }) }
      //                    ^ only persist `user`, not notifications
    ),
    { name: 'AppStore' }
  )
);
```

---

## 6. Memory Aid

**Redux = post office:** Every letter (state change) must be addressed with a specific action type, routed through the post office (reducer), logged, and delivered predictably. Anyone can trace any letter. Slow but auditable.

**Zustand = shared whiteboard:** Pick up the marker (store hook), write or erase directly. No postmaster, no routing. Fast, minimal overhead, slightly less formal.

**Signals = motion sensors:** Instead of checking everything every time the lights might change, each light has a sensor directly wired to the switch. Only the specific lights near the trigger respond — everything else stays on or off independently.

---

## 7. Why & How Summary

**Why it matters:** The choice of state management library has lasting architectural implications — Redux migrations are expensive, and choosing a heavyweight library for a small app creates unnecessary complexity. Conversely, Zustand in a large enterprise app with 20 teams may lack the structural guardrails needed.

**How it works:** Redux: all state in one immutable object, mutations go through reducer pure functions triggered by dispatched actions. Zustand: state in a closure, components subscribe via selector functions, state is directly mutated via setter functions. Signals: each signal is an observable cell; accessing `.value` registers the current computation as a subscriber; writing `.value = x` notifies all subscribers.

**Company relevance:**
- Microsoft: Teams web uses Redux-based state for chat messages, call state, presence; Azure DevOps uses Redux for work item state
- Adobe: Creative Cloud web uses a mix; Firefly app uses Signals for canvas reactivity
- Salesforce: LWC platform has its own reactive property system; understanding Signals helps reason about @wire and @track decorators
- Cisco: Webex Angular apps are migrating to Angular Signals from zone.js; direct interview topic for Cisco Angular roles
