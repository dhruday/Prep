# Zustand and Signals — Lightweight State Alternatives
> Part 13 — State Management
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Zustand** (German for "state") is a minimal React state library: `create((set, get) => ({ count: 0, increment: () => set(state => ({ count: state.count + 1 })) }))`; no Provider wrapping, no reducers, no action types; components subscribe with `useStore(state => state.specificSlice)` — only re-renders when the selected slice changes; ~1KB bundle; middleware for persistence, devtools, immer; ideal for small-to-medium apps that don't need Redux's scale
- **Selector-based subscriptions**: `const count = useCountStore(state => state.count)` — this component only re-renders when `count` changes; `const { count, name } = useCountStore()` — re-renders when ANYTHING in the store changes; ALWAYS use selectors, never destructure the whole store
- **Angular Signals** (Angular 17+): `count = signal(0)`, `doubled = computed(() => count() * 2)`, `effect(() => console.log(count()))`; signals are reactive primitives — Angular's alternative to RxJS for synchronous reactive state; change detection is fine-grained (only the specific DOM nodes that read a changed signal update, not the whole component tree)
- **Signal-based services** (Angular 17+): an `@Injectable` service with `signal()` state is a lightweight NgRx alternative; `inject(CartService).items()` in any component; no `BehaviorSubject`, no `subscribe()`, no `async` pipe for synchronous state
- **Jotai**: atom-based state; `const countAtom = atom(0)`, `const [count, setCount] = useAtom(countAtom)`; each atom is independent; component subscribes only to atoms it uses; fine-grained updates across the component tree; good for large apps with many independent state fragments
- **When Zustand over Redux**: fewer than 5-10 global state slices, no time-travel debugging requirement, no need for complex middleware, team unfamiliar with Redux concepts, fast prototyping; when Redux is overkill for the scale
- 🆕 **Gap topic**: Hruday has used RxJS BehaviorSubject services and NgRx in production; Zustand and Angular Signals are lightweight alternatives worth knowing for interviews at companies that prefer lighter state solutions

---

## 1. One-Line Definition
Zustand is a minimal React state library that replaces Redux for small-to-medium apps with a simpler API — a single `create()` call defines state and actions together; Angular Signals are reactive primitives built into Angular 17+ that provide fine-grained reactivity without RxJS ceremony for synchronous state.

---

## 2. The Problem It Solves

Redux is powerful but has overhead that many applications don't need. For a team building a 10-page e-commerce app, setting up Redux means: installing multiple packages (`@reduxjs/toolkit`, `react-redux`), wrapping the app in `<Provider>`, creating a store with `configureStore`, writing `createSlice` for each feature, using typed hooks (`useAppSelector`, `useAppDispatch`), and adding `StoreDevtoolsModule`. This setup makes sense at SAP with 14 slices and 20 engineers. It's architecture overhead for a 3-person startup.

Zustand removes the ceremony. One `create()` call defines the store. No Provider. No build-up. Components use the store directly. The bundle size is 1KB vs Redux Toolkit's ~40KB.

In Angular, RxJS services with `BehaviorSubject` are the traditional lightweight alternative to NgRx. The developer must manage subscriptions manually (`subscribe()`, `takeUntilDestroyed()`), use the `async` pipe in templates, and think in stream operators. For synchronous state that isn't event-driven, this is more ceremony than the problem deserves. Angular Signals (v17+) solve this: reactive primitives that work like computed properties — read them like a function call, update them with `.set()` or `.update()`, derive from them with `computed()`.

---

## 3. How It Works Internally

### Zustand's Subscription Model

```
Zustand store internal:
  state = { count: 0, user: { name: 'Hruday' } }
  listeners = Set<() => void>   ← all active component subscriptions

  When set() is called:
    1. New state object produced (via Immer if immer middleware used, or via manual spread)
    2. For each listener (component subscription):
       a. Run the selector function: selector(newState)
       b. Compare result to previous result (Object.is equality)
       c. If changed → trigger re-render for that component
       d. If unchanged → skip re-render

  Result: const count = useStore(s => s.count)
         → only the component reading .count re-renders when .count changes
         → component reading .user is NOT re-rendered when .count changes
         → selector is the re-render boundary (same idea as Redux useSelector)

  No subscriptions for the selector (s => s.count), only for (s => s):
         → ALWAYS re-renders when anything changes
         → ❌ This is the most common Zustand performance mistake
```

### Angular Signal Change Detection

```
Traditional Angular change detection (Default strategy):
  Component update → run change detection for ENTIRE component tree
  → Check every binding in every component
  → Re-render everything that has changed
  → Inefficient at scale

Angular Signals change detection:
  signal.set(newValue) → Angular marks SPECIFIC template node as stale
  → Only that node re-evaluates
  → Rest of component tree untouched
  → Fine-grained updates like Vue 3 / Solid / Svelte

computed(() => signal() * 2):
  → Lazy: only recomputes when read AND signal has changed
  → Memoized: cached until upstream signal changes
  → Synchronous: no async, no subscriptions, no piping

effect(() => console.log(signal())):
  → Runs once immediately (to track dependencies)
  → Automatically re-runs when any signal read inside has changed
  → Auto-cleanup: tied to component lifecycle (or explicit destroy)
```

---

## 4. The Code

### Wrong Way — Redux for Everything (Even Simple State)

```typescript
// ❌ WRONG — Redux for a UI-only state that doesn't need it

// This is a theme toggle. Light/dark mode. In the WHOLE Redux setup:

// themeSlice.ts
const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: 'light' as 'light' | 'dark' },
  reducers: {
    toggleTheme: (state) => { state.mode = state.mode === 'light' ? 'dark' : 'light'; }
  }
});

// store.ts — add theme to configureStore reducer
// Provider wrapping — already in place
// Component:
const mode = useAppSelector(state => state.theme.mode);
const dispatch = useAppDispatch();
// <button onClick={() => dispatch(toggleTheme())}>

// ❌ This is fine — it works — but it's 4 files and 30 lines for what is essentially:
// const [mode, setMode] = useState<'light' | 'dark'>('light')
// The Redux ceremony adds complexity with zero benefit for this use case.
// Theme mode doesn't need time-travel debugging, complex middleware, or DevTools tracing.
```

> **Why this is wrong:** using Redux for state that is simple, doesn't require audit trails, and isn't shared across complex async boundaries creates unnecessary ceremony, slows down development, and makes the codebase harder for new developers to navigate.

### Right Way — Zustand for Small/Medium, Redux for Complex

```typescript
// ✅ RIGHT — Zustand: minimal ceremony for shared state without Redux overhead

// store/cartStore.ts
import { create } from 'zustand';
import { persist, devtools, immer } from 'zustand/middleware';
import { StateCreator } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  // Actions defined alongside state — no separate action creators
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  // Computed-style getter via get()
  totalItems: () => number;
  totalPrice: () => number;
}

// ✅ Middleware: devtools (Redux DevTools integration) + persist + immer
export const useCartStore = create<CartStore>()(
  devtools(         // ← Enables Redux DevTools for Zustand
    persist(        // ← Persist to localStorage automatically
      immer(        // ← Write "mutating" code like createSlice
        (set, get) => ({
          items: [],
          
          addItem: (newItem) => set(state => {   // ← Immer: safe "mutation" syntax
            const existing = state.items.find(i => i.id === newItem.id);
            if (existing) {
              existing.quantity += newItem.quantity;
            } else {
              state.items.push(newItem);
            }
          }),
          
          removeItem: (id) => set(state => {
            state.items = state.items.filter(i => i.id !== id);
          }),
          
          updateQuantity: (id, quantity) => set(state => {
            const item = state.items.find(i => i.id === id);
            if (item) item.quantity = quantity;
          }),
          
          clearCart: () => set({ items: [] }),
          
          // ✅ get() accesses current state for computed values
          totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
          totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        })
      ),
      {
        name: 'cart-storage',  // localStorage key
        // ✅ Partial persistence: only persist items, not computed values
        partialize: (state) => ({ items: state.items })
      }
    ),
    { name: 'CartStore' }  // DevTools display name
  )
);


// ✅ Component usage — selector-based subscriptions (CRITICAL for performance):

// ✅ CORRECT — only re-renders when items.length changes:
const CartBadge = () => {
  const count = useCartStore(state => state.totalItems());
  return <span className="badge">{count}</span>;
  // CartBadge ONLY re-renders when totalItems() result changes
};

// ✅ CORRECT — subscribe to one field:
const CartSummary = () => {
  const total = useCartStore(state => state.totalPrice());
  return <span>Total: ${total.toFixed(2)}</span>;
};

// ❌ WRONG — re-renders on ANY store change:
const WrongComponent = () => {
  const { items, addItem } = useCartStore();  // Full store subscription
  // This re-renders when addItem is called, when clearCart is called, on EVERYTHING
  // Fix: const items = useCartStore(state => state.items);
  //      const addItem = useCartStore(state => state.addItem);
};

// ✅ CORRECT — extract multiple values with shallow equality:
import { shallow } from 'zustand/shallow';

const CartPage = () => {
  const { items, clearCart } = useCartStore(
    state => ({ items: state.items, clearCart: state.clearCart }),
    shallow   // ← Compare object properties with Object.is, not the object reference
    // Without shallow: re-renders because {} !== {} even if items and clearCart are same
    // With shallow: only re-renders if items reference OR clearCart reference changes
  );
  return <CartItemList items={items} onClear={clearCart} />;
};


// ✅ RIGHT — Angular Signals: reactive state without RxJS ceremony

// Angular 17+ signal-based service:
// services/cart.service.ts
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartService {
  // ✅ Private writable signal — state is internal to the service
  private _items = signal<CartItem[]>([]);
  
  // ✅ Public readonly computed signals — exposed as derived state
  readonly items = this._items.asReadonly();   // Read-only view of items signal
  
  readonly totalItems = computed(() =>
    this._items().reduce((sum, i) => sum + i.quantity, 0)
  );
  
  readonly totalPrice = computed(() =>
    this._items().reduce((sum, i) => sum + i.price * i.quantity, 0)
  );
  
  readonly isEmpty = computed(() => this._items().length === 0);
  
  // ✅ Methods update the signal:
  addItem(newItem: CartItem): void {
    this._items.update(items => {
      const existing = items.find(i => i.id === newItem.id);
      if (existing) {
        return items.map(i =>
          i.id === newItem.id
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        );
      }
      return [...items, newItem];
    });
  }
  
  removeItem(id: string): void {
    this._items.update(items => items.filter(i => i.id !== id));
  }
  
  clearCart(): void {
    this._items.set([]);
  }
}

// ✅ Component using signal service — no subscriptions, no async pipe for sync state:
@Component({
  template: `
    <span class="badge">{{ cartService.totalItems() }}</span>
    
    <div *ngFor="let item of cartService.items()">
      {{ item.name }} — {{ item.quantity }}
      <button (click)="cartService.removeItem(item.id)">Remove</button>
    </div>
    
    <p>Total: {{ cartService.totalPrice() | currency }}</p>
    <button (click)="cartService.clearCart()">Clear Cart</button>
    
    <!-- ✅ @if with signal: no async pipe needed -->
    @if (cartService.isEmpty()) {
      <p>Your cart is empty</p>
    }
  `
})
export class CartComponent {
  cartService = inject(CartService);
  // ✅ No constructor injection needed with inject(), no ngOnInit, no subscribe()
  // Signals are read synchronously in template expressions — just call them
}


// ✅ effect() for side effects tied to signal changes:
@Component({})
export class CartPersistenceComponent implements OnInit {
  cartService = inject(CartService);
  
  ngOnInit() {
    // ✅ effect() runs when cartService.items() changes:
    effect(() => {
      // Track: reads cartService.items() — sets up dependency
      const items = this.cartService.items();
      // Side effect: write to localStorage whenever items change
      localStorage.setItem('cart', JSON.stringify(items));
    });
    // ✅ effect auto-cleans up when the component is destroyed (no manual unsubscribe)
  }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you choose Zustand over Redux?"

**Hruday's answer:**
> My decision factors are scale, team context, and features needed.
>
> I choose Zustand when the application has fewer complex shared state scenarios — roughly fewer than 10 global state slices, async logic is handled by TanStack Query or RTK Query (so the "effects" problem is already solved), and the team doesn't have deep Redux experience that would be lost.
>
> Specifically: a startup building a product catalog and checkout flow. The cart, auth state, and UI preferences need to be global. That's three Zustand stores, 40 lines total, no Provider wrapping, devtools available via middleware, localStorage persistence via `persist` middleware. Nothing more is needed. The same thing in Redux would be 150 lines and five files.
>
> I choose Redux (specifically Redux Toolkit) when: the application has complex async flows that benefit from Redux DevTools time-travel replay; the team is large and needs the strict conventions that Redux enforces (everyone knows where state lives, how to update it, how to test it); or the codebase already has a significant Redux investment and introducing a second library creates confusion.
>
> At SAP, we used RTK. For a personal project I'd use Zustand with TanStack Query — that combination handles probably 90% of typical React app state needs with much less overhead.

---

### Q2 — Angular Specific
**Interviewer asks:** "How do Angular Signals change the way you build Angular applications compared to RxJS services?"

**Hruday's answer:**
> Signals work well for synchronous, value-based state — things like "what items are in the cart," "is the side panel open," "which filter is selected." The API is simpler: `signal(0)` creates it, `.set(1)` updates it, `()` reads it, `computed()` derives from it. No subscription, no `subscribe()`, no `takeUntilDestroyed()`, no `async` pipe for simple state.
>
> RxJS still wins for event-driven, time-based, or stream-based operations. WebSocket messages arriving over time, user input debounced and mapped to HTTP calls, HTTP responses combined with `forkJoin` or `combineLatest` — these are stream operations where RxJS operators (`switchMap`, `debounceTime`, `distinctUntilChanged`, `combineLatest`) express intent precisely. `signal()` has no equivalent for these.
>
> The practical split: signals for state (values that can be read synchronously at any point in time); RxJS for events (sequences of values over time that need transformation). In a service layer, I'd use `signal()` for cart items but keep an `HttpClient.get()` call returning an Observable — let the component use `toSignal(observable$)` to bridge from Observable to Signal when the component wants to read it synchronously.
>
> The change detection benefit is real: signals are fine-grained. Only the specific template expression that reads a changed signal re-evaluates, rather than the whole component tree running change detection. For large component trees, this can noticeably improve rendering performance in Angular 18+ applications.

---

### Q3 — Deep Dive
**Interviewer asks:** "What is the difference between Zustand and Jotai?"

**Hruday's answer:**
> Both are minimal React state libraries that aim to replace Redux for simpler apps. The mental model differs in how state is structured.
>
> Zustand is store-centric. You define a single store with `create()`, and components subscribe to slices of that store. The store holds all related state and its update logic together. A cart store has the items array, the add/remove/update methods, and derived computed values all in one place. It's similar in structure to a Redux slice — centralized, but without the Redux ceremony.
>
> Jotai is atom-centric. State is composed of independent atoms — `const countAtom = atom(0)`, `const nameAtom = atom('')`. Each atom is completely independent. `const cartItemsAtom = atom<CartItem[]>([])` is a separate atom from `const filterAtom = atom('all')`. Components subscribe only to the atoms they read — `const [count, setCount] = useAtom(countAtom)`. If a component reads `countAtom` but not `filterAtom`, it only re-renders when count changes. Jotai also supports derived atoms: `const cartCountAtom = atom(get => get(cartItemsAtom).length)`.
>
> The practical difference: Zustand is better when related state pieces are naturally grouped (a cart has items AND methods that update items). Jotai is better when you have many independent state fragments that components partially overlap with (a dashboard where each widget subscribes to a different subset of atoms). Jotai is also slightly faster to set up because `atom()` doesn't need a store wrapping — atoms are global by default.
>
> In practice, most teams use one and not the other based on which they encountered first. Both are excellent. I'd choose Zustand as the default because the store model is more familiar to engineers who have seen Redux, making onboarding easier.

---

### Q4 — SAP Scenario
**Interviewer asks:** "You're building a new Angular 18 monorepo at SAP. Would you use NgRx or Signals-based state?"

**Hruday's answer:**
> I'd use a hybrid approach, same as the one encouraged by the NgRx team after NgRx 17.
>
> For global application state that crosses feature boundaries, requires an audit trail, or involves complex async flows — auth token, permissions, feature flags, approval workflow states — NgRx with classic actions/reducers/effects/selectors. At SAP scale, the DevTools traceability and strict conventions matter. When a bug appears in production ("why was this approval state wrong?"), the NgRx action log in production monitoring gives us the answer. That's worth the ceremony.
>
> For feature-scoped state — filter state for a product list, wizard step state for an onboarding flow, local UI state for a data table — NgRx Signals Store. This is Angular's answer to component-local state that's shared within a feature but not globally. It uses the same `patchState`, `withState`, `withComputed`, `withMethods` API without the full actions/reducers ceremony. Each feature module provides its own signal store, scoped by DI providers.
>
> For truly local component state — whether a dropdown is open, a tab index, a text input's current value — Angular's built-in `signal()` and `computed()` directly in component class. No store, no injection, no sharing — pure component-local reactive state.
>
> For server data — `@ngrx/data` or more likely RTK Query patterns with Angular's HttpClient via a signal-based cache service. We'd evaluate `@ngrx/data` for entity collections with standard CRUD.
>
> The answer signals to the interviewer that you know the full spectrum: global NgRx for cross-cutting concerns, NgRx Signals for feature scope, raw signals for component scope, query library for server data.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Zustand stores are global by default" | "Zustand is better than Redux because it doesn't need a Provider" | No Provider is a double-edged sword; the store module-level singleton means it's shared across ALL React roots and persists across test cases unless explicitly cleared; in testing, each test must call `useStore.setState(initialState)` to reset the store; the Redux Provider actually makes store scope explicit and controllable; for component tree-scoped state (like NgRx Signals Store), Zustand has a `createStore()` hook factory pattern where the store is provided via React context — but at that point you've added the Provider back |
| "computed() in Angular eagerly runs" | "computed() runs immediately when the dependency signals change" | `computed()` in Angular is LAZY — it marks itself dirty when its dependencies change, but does NOT recompute until it is actually read; if no component reads the `computed()` signal, it never runs; this is important for performance: a `computed()` deriving a filtered+sorted+paginated list from 1000 items won't run until a component actually reads it; only then does the computation happen; immediately after, the result is cached until a dependency changes again |
| "Zustand replaces TanStack Query" | "I use Zustand for all my state including API data" | Zustand is a client state manager; storing API responses in Zustand manually means manually managing loading/error states, cache invalidation, deduplication, and background refresh — all the problems TanStack Query was built to solve; the correct split is: Zustand for client state (UI state, user preferences, cart), TanStack Query (or RTK Query) for server state (API responses that need caching); Zustand + TanStack Query together cover both categories with minimal overhead |
| "Signals replace RxJS in Angular" | "Angular Signals make RxJS obsolete in Angular apps" | Signals and RxJS solve different problems; signals are for VALUES over time (synchronous state); RxJS is for EVENTS over time (async streams, HTTP, WebSocket, user input sequences); in Angular 18+, you bridge them with `toSignal(observable$)` and `toObservable(signal)`; HttpClient returns Observables and this will NOT change; NgRx Effects use RxJS operators because they ARE event processing pipelines; the correct mental model is "signals for state, RxJS for events" — they coexist, each handling what it's designed for |

---

## 7. Hruday's Real Experience Hook
> "At Bosch, we inherited an Angular codebase with about 15 shared services, each with 3-4 BehaviorSubjects managing related state. The production monitoring dashboard had a `MachineStateService`, `AlertService`, `DashboardUIService`, and `UserPreferencesService` — all with manual subscriptions in components.
>
> When we added NgRx for the machine monitoring state (the complex async WebSocket + HTTP part), I advocated for keeping the simpler UI state in Angular signals rather than migrating everything to NgRx. The `dashboardUIState` — which panels are expanded, which machine is selected, the current time range filter — was synchronous, simple, and not shared outside the dashboard module. Converting it to NgRx signals (rather than classic NgRx) cut the implementation from 6 files + effects to a single 40-line `DashboardUIStore` using `signalStore`.
>
> The hybrid result was clearer: engineers learned to ask 'is this state shared globally with async effects?' If yes → classic NgRx. If feature-scoped and synchronous → NgRx Signals. If component-only → inline signal(). The classification made code review conversations about state placement much more structured."

---

## 8. Scale Evolution

**Small app (1-3 developers) →** Zustand for React or signal services for Angular; one store per domain (cart, auth); `persist` middleware for local storage; `devtools` middleware so Redux DevTools still work; zero Redux overhead; TanStack Query or RTK Query for server data alongside Zustand.

**Medium app (3-8 developers) →** Zustand stores per domain, typed with TypeScript interfaces; store files co-located with feature folders; unit tests for store logic using `act()` + `create()` factory; Angular signal services scoped at appropriate provider level (root vs feature module); `toSignal` / `toObservable` bridges where HTTP and signals meet.

**Large app (SAP/Bosch scale) →** Zustand doesn't scale well to 20+ engineers on shared global state — prefer RTK for React at that point; Angular: classic NgRx for global cross-feature state + NgRx Signals for feature-local state + raw signals for component state; signal-based stores scoped via DI to specific lazy-loaded modules; performance audit tools to verify fine-grained update benefit in large component trees.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Zustand for payment portal React apps (lighter than RTK for smaller payment widgets); Angular Signal services for merchant dashboard feature-scoped state; `persist` middleware for payment preferences; `computed()` for derived financial summaries without RxJS | Zustand middleware familiarity; signal vs RxJS tradeoff; when to go light vs full Redux |
| Swiggy / Meesho | Zustand for cart state in sellers/consumer React apps; signal services in Angular ops dashboards; `shallow` comparison selector pattern for cart rendering performance; Jotai for fine-grained subscription in product listing with many independent atoms | selector optimization with shallow; Zustand vs Jotai comparison; signal service for sync state |
| Adobe / Microsoft | Signal-based state for Angular document editors (fine-grained updates critical for 60fps editing); Zustand for React-based creative tools; Jotai for fine-grained property panel state in design tools (each property is an independent atom); `toSignal` bridge for HttpClient in Angular | fine-grained update performance (signals vs zone.js); Jotai atoms for independent state; toSignal bridge |
| SAP Labs | Angular at SAP: aware of NgRx Signals as modern pattern; can articulate NgRx classic vs NgRx Signals decision; signal services for feature-scoped UI state to reduce NgRx overhead; Bosch experience with hybrid approach (classic NgRx + signal stores); can teach the classification framework (global async → NgRx, feature sync → Signals) | NgRx Signals vs classic NgRx decision framework; hybrid architecture explanation; real production experience at Bosch |

---

## 10. Related Topics — What to Study Next

- **Topic 224 — Local vs Global State** — Zustand and Angular Signals fill the middle ground in the state spectrum: they're simpler than Redux/NgRx but deliberately global (unlike `useState`); understanding when "shared but not complex" calls for Zustand vs the full Redux machinery is the core decision this topic maps out
- **Topic 225 — Redux Toolkit** — Zustand's natural comparison point for React; RTK adds 40KB, a Redux store, Provider, and strict conventions — the tradeoffs against Zustand's 1KB and zero ceremony are exactly what interviewers ask about; knowing both well is required for senior frontend roles
- **Topic 226 — NgRx** — Angular Signals' natural comparison point; NgRx Signals Store (NgRx 17+) is built on Angular Signals primitives but adds structure (withMethods, withComputed) and integrates with classic NgRx DevTools; the relationship between Angular Signals, NgRx Signals Store, and classic NgRx is the current Angular state management topic
- **Topic 230 — Avoiding Over-Global State** — Zustand is easy to over-use because there's no setup friction; it's tempting to put everything in a Zustand store instead of deciding what should stay local; this topic provides the co-location rules and design principles that prevent Zustand (or any global store) from becoming a dumping ground for all state

---

*Part 13 · Zustand and Signals — Lightweight State Alternatives · Full Stack Interview Guide · Hruday D · 2026*
