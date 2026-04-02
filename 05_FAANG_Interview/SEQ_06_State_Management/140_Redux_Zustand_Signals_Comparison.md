# 140. Redux / Zustand / Signals — Comparison
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Redux, Zustand, and Signals represent three generations of frontend state management philosophy. **Redux** (2015) is explicit, predictable, and centralized — every mutation is a named action that flows through a pure reducer; ideal where you need auditability, time-travel debugging, and large-team conventions. **Zustand** (2019) is pragmatic and minimal — closes the boilerplate gap with direct state mutation via Immer, selector-based subscriptions, no Provider required; ideal for most medium-scale React apps. **Signals** (2022–, Angular/Preact/upcoming React) are a reactive primitive — a signal is a value container that tracks its dependents and notifies them on change at the value level, not the component level; ideal for fine-grained reactivity without the component re-render overhead. The trend is toward signals: Angular 17+ is signal-first, SolidJS and Preact are signal-native, and React's compiler moves toward signal-like auto-memoization.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Redux Toolkit — The Explicit Standard

```typescript
// Redux philosophy: state = f(actions)
// Every change is a named action → immutable reducer → new state
// The value: full audit trail, time-travel, predictable, great DevTools

// 1. Slice — encapsulates state shape, reducers, actions
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface ProductsState {
  items: Product[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  selectedId: string | null;
}

// Async thunk — handles the async action lifecycle
export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (categoryId: string, { rejectWithValue }) => {
    try {
      return await api.products.list(categoryId);
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: { items: [], status: 'idle', error: null, selectedId: null } as ProductsState,
  reducers: {
    productSelected(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;  // Immer: write mutably, gets immutable update
    },
    productUpdated(state, action: PayloadAction<Partial<Product> & { id: string }>) {
      const idx = state.items.findIndex(p => p.id === action.payload.id);
      if (idx !== -1) Object.assign(state.items[idx], action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

// 2. Typed selectors with memoization
import { createSelector } from '@reduxjs/toolkit';
const selectProducts = (state: RootState) => state.products.items;
const selectStatus   = (state: RootState) => state.products.status;

export const selectActiveProducts = createSelector(
  selectProducts,
  (products) => products.filter(p => p.active)
);

// 3. Component — subscribes to minimum slice
function ProductCount() {
  const count = useAppSelector(state => state.products.items.length);
  return <span>{count}</span>;
}
```

### Zustand — Pragmatic & Minimal

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

// Zustand philosophy: just a JavaScript object with reactive subscriptions
// No actions, no reducers (unless you want them) — just functions that mutate state

interface ProductStore {
  items: Product[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  selectedId: string | null;
  // Actions as methods — co-located with state
  fetchProducts: (categoryId: string) => Promise<void>;
  selectProduct: (id: string) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
}

const useProductStore = create<ProductStore>()(
  devtools(
    immer((set, get) => ({
      items: [],
      status: 'idle',
      selectedId: null,

      fetchProducts: async (categoryId) => {
        set(s => { s.status = 'loading'; });
        try {
          const products = await api.products.list(categoryId);
          set(s => { s.status = 'succeeded'; s.items = products; });
        } catch {
          set(s => { s.status = 'failed'; });
        }
      },

      selectProduct: (id) => set(s => { s.selectedId = id; }),

      updateProduct: (id, updates) => set(s => {
        const item = s.items.find(p => p.id === id);
        if (item) Object.assign(item, updates);
      }),
    })),
    { name: 'Products' }
  )
);

// Selectors — inline or extracted
const useProducts      = () => useProductStore(s => s.items);
const useProductStatus = () => useProductStore(s => s.status);
const useSelectedId    = () => useProductStore(s => s.selectedId);

// Component — re-renders only when items.length changes
function ProductCount() {
  const count = useProductStore(s => s.items.length);  // selector returns primitive
  return <span>{count}</span>;
}

// No Provider needed — store is a module-level singleton
```

### Angular Signals — Fine-Grained Reactivity

```typescript
// Angular 17+ — signals as the recommended state primitive
// Signals are reactive values: reading a signal inside computed() or effect()
// creates an automatic dependency subscription

import { signal, computed, effect } from '@angular/core';

// ---- Primitive signal ----
const count = signal(0);
count();         // read: returns 0
count.set(1);    // write: sets to 1
count.update(c => c + 1);  // update: read + write in one

// ---- Computed signal (derived state) ----
const doubled = computed(() => count() * 2);
// doubled is lazy and cached — recomputes only when count changes
// No useMemo needed — tracking is automatic

// ---- Effect (side effects on signal change) ----
const logEffect = effect(() => {
  console.log(`Count changed: ${count()}`);
  // Runs whenever count (or any signal read inside) changes
});

// ---- Component with signals ----
@Component({
  selector: 'app-counter',
  template: `
    <p>Count: {{ count() }}</p>
    <p>Doubled: {{ doubled() }}</p>
    <button (click)="increment()">+</button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2);
  increment = () => this.count.update(c => c + 1);
  // With signals + OnPush, Angular only re-checks this component when a signal it reads changes
  // No zone.js needed for change detection of signal-based components
}

// ---- Signal store (Angular 18+ NgRx Signal Store) ----
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';

const ProductsStore = signalStore(
  withState({ items: [] as Product[], status: 'idle' as const }),
  withComputed(({ items }) => ({
    activeProducts: computed(() => items().filter(p => p.active)),
    productCount:   computed(() => items().length),
  })),
  withMethods((store) => ({
    async fetchProducts(categoryId: string) {
      patchState(store, { status: 'loading' });
      const products = await api.products.list(categoryId);
      patchState(store, { items: products, status: 'succeeded' });
    },
  }))
);
// inject(ProductsStore) in component — type-safe, auto-reactive
```

### React Signals — Preact/@preact/signals-react

```typescript
// @preact/signals-react brings signals to React
// Key difference from useState: signal updates don't re-render the whole component
// — only the parts of the JSX that read the signal re-render

import { signal, computed, effect } from '@preact/signals-react';

// Module-level signals (global) — no Provider
const count = signal(0);
const doubled = computed(() => count.value * 2);

function Counter() {
  // Accessing signal.value in JSX creates a fine-grained subscription
  // Only the <span> re-renders when count changes — not the whole Counter component
  return (
    <div>
      <span>{count}</span>  {/* directly pass signal for auto-subscription */}
      <span>{doubled}</span>
      <button onClick={() => count.value++}>+</button>
    </div>
  );
}

// React's next step: React Compiler (React 19) approaches this via auto-memoization
// — wraps all components and values automatically into memo/useMemo
// — same result (fewer re-renders) without requiring a different primitive
```

### Side-by-Side Comparison

```typescript
// THE SAME FEATURE — counter with history — in each paradigm:

// ---- Redux Toolkit ----
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0, history: [] as number[] },
  reducers: {
    incremented(state) { state.history.push(state.value); state.value++; }
  }
});
// Component: dispatch(incremented()); useAppSelector(s => s.counter.value);

// ---- Zustand ----
const useCounterStore = create<{ value: number; history: number[]; increment: () => void }>()(
  immer(set => ({
    value: 0, history: [],
    increment: () => set(s => { s.history.push(s.value); s.value++; })
  }))
);
// Component: const { value, increment } = useCounterStore(s => ({ value: s.value, increment: s.increment }), shallow);

// ---- Angular Signal ----
// In a service:
// value = signal(0);  history = signal<number[]>([]);
// increment() { this.history.update(h => [...h, this.value()]); this.value.update(v => v + 1); }

// ---- Jotai (atomic signals for React) ----
const valueAtom = atom(0);
const historyAtom = atom<number[]>([]);
const incrementAtom = atom(null, (get, set) => {
  set(historyAtom, h => [...h, get(valueAtom)]);
  set(valueAtom, v => v + 1);
});
// Component: const [value] = useAtom(valueAtom);  const [, increment] = useAtom(incrementAtom);
```

### Architecture & Component Boundaries

```typescript
// When to choose each:
//
// REDUX TOOLKIT
// ✅ Large team (10+ frontend devs) — conventions matter
// ✅ Complex async sagas/effects that need isolated testing
// ✅ Need Redux DevTools time-travel for support reproducibility
// ✅ Existing Redux codebase migration path
// ✅ State shape must be documented and audited
// ❌ Small team — boilerplate overhead slows down
// ❌ Mostly UI state — overkill
//
// ZUSTAND
// ✅ Small-medium team (1-8 devs)
// ✅ Need outside-React access (intervals, WebSocket handlers)
// ✅ Want Redux-like devtools without Redux boilerplate
// ✅ Multiple independent domain stores
// ❌ Need full action replay/time-travel
// ❌ Complex cross-store interactions (growing complexity)
//
// SIGNALS (Angular) / JOTAI (React)
// ✅ Fine-grained reactivity — many independent, frequently-changing values
// ✅ Angular apps (signals are the future of Angular)
// ✅ Avoid Fiber scheduling overhead for high-frequency updates
// ✅ Co-located reactive state in components
// ❌ Browser support (signals are newer APIs)
// ❌ React — signals aren't native (React Compiler fills this via auto-memo)
```

### Performance Implications

| | Redux | Zustand | Signals (Angular) |
|---|---|---|---|
| Re-render scope | All `useSelector` subscribers where selector output changed | All `useStore(selector)` subscribers where selector output changed | Only the specific DOM binding that read the signal |
| Comparison | Strict equality on selector output | Strict equality (or `shallow`) on selector output | Fine-grained: signal tracks exact reads |
| Overhead | Reducer + selector per update | Minimal — direct mutation + selector | Near-zero — value-level tracking |
| Best for | Many components, complex derivations | Balanced control + simplicity | High-frequency updates, animations |

### ⚠️ Anti-Patterns & Pitfalls

- **Redux: storing server data** — using Redux as a server cache (loading API data into Redux, managing loading/error states manually) is the original sin; TanStack Query replaces this pattern entirely
- **Zustand: no selector** — `useStore()` without selector re-renders on every store change; always pass a selector
- **Signals: reading signal outside reactive context** — reading `signal.value` outside a `computed`/`effect`/template loses reactivity; you get the value once, not reactively
- **Mixing Redux and Zustand in same app for same domain** — creates two sources of truth; choose one per domain

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP Labs, the decision between Redux and Zustand for new React micro-frontends was made on team size and feature complexity. The main shell (5+ teams contributing) used Redux Toolkit for auditability. New feature-team MFEs (2-3 devs) used Zustand. Angular modules used NgRx (before signals) for the same reasons — large team, explicit data flow. After Angular 17, new components were written signal-first; the transition reduced template change detection from zone.js tracking to targeted signal notifications, eliminating 60% of unnecessary change detection cycles on the analytics page.

**At FAANG scale:**
- **Microsoft:** Azure Portal — Redux for cross-blade state (subscription, resource groups), Zustand for per-blade UI state; Fluent UI components use internal signal-like hooks
- **Adobe:** Frame.io — Zustand for collaborative UI state (who's online, current selection, annotation mode); server state via TanStack Query; signals explored for timeline scrubbing (high-frequency position updates)
- **Salesforce:** LWC uses wire adapters (signals-like subscriptions to Salesforce data) — the reactive wiring is architecturally equivalent to signals: wire reads react to bound parameter changes
- **Cisco:** IOS XE Network Dashboard — the high-frequency metrics panel (updates every 100ms) moved from React state to a signals-inspired approach using `useSyncExternalStore` + a shared observable; reduced main thread re-renders by 80%

---

## 💬 4. Interview Execution

### Sample Answer

> "Redux, Zustand, and Signals represent three generations of thinking about state reactivity. Redux is explicit and auditable — every mutation is a named action through a pure reducer; you can replay history, time-travel debug, and guarantee that any given state was produced by a traceable sequence of actions. That's invaluable for large teams and complex applications but comes with significant boilerplate.
>
> Zustand dramatically reduces that boilerplate while keeping selector-based subscriptions — components re-render only when their selected slice changes. No Provider, no actions file, no reducer file. For most apps, this is the right balance. I'd choose Zustand by default for a new React project and reach for Redux Toolkit when the team is 10+ developers or when I need the full action audit trail for debugging or compliance.
>
> Signals are the third generation — they push reactivity below the component level to the value level. In Angular 17+, a signal update triggers only the specific template binding that read it, not a full component render cycle. Architecturally, they eliminate zone.js and make change detection completely explicit and precise. React will get there via the React Compiler (auto-memoization), but Angular is already signals-first. Given I built the Angular analytics module at SAP, migrating it to signals reduced change detection overhead by 60% — a real measured win."

### Likely Follow-up Questions
1. "Why would you ever choose Redux over Zustand?" → Large team conventions, time-travel debugging, full action audit trail, complex async effects that need isolated testing
2. "What are the limitations of signals in React?" → Not native to React — need @preact/signals-react or wait for React Compiler; mental model shift for React developers
3. "How does Angular's signal change detection differ from zone.js?" → Zone.js patches async APIs globally and triggers full change detection on every async event; signals track precise dependencies and trigger only the signal's consumers
4. "Can you mix Zustand and Redux?" → Yes, by domain — but avoid splitting the same domain's state across both; pick one per concern
5. "What's the future of Redux?" → RTK Query and Redux Toolkit are the maintained evolution; raw Redux is legacy; Zustand/Signals are the direction for new projects

### vs Alternatives

| Redux Toolkit | Zustand | Signals |
|---|---|---|
| Explicit actions, reducer, full audit | Direct mutation, minimal setup | Value-level reactivity, no re-render overhead |
| Best: large teams, compliance, debugging | Best: most React apps | Best: Angular, high-frequency updates |
| Provider required | No Provider | Framework-native (Angular) or library (@preact) |

---

## 💻 5. Code Example

```typescript
// Equivalent notification system in all three paradigms

// ---- REDUX TOOLKIT ----
interface NotificationsState { items: Notification[]; }
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [] } as NotificationsState,
  reducers: {
    added(state, { payload }: PayloadAction<Omit<Notification, 'id'>>) {
      state.items.push({ ...payload, id: crypto.randomUUID() });
    },
    dismissed(state, { payload: id }: PayloadAction<string>) {
      state.items = state.items.filter(n => n.id !== id);
    },
  },
});

// ---- ZUSTAND ----
const useNotifications = create<{
  items: Notification[];
  add: (n: Omit<Notification, 'id'>) => void;
  dismiss: (id: string) => void;
}>()(immer(set => ({
  items: [],
  add: (n) => set(s => { s.items.push({ ...n, id: crypto.randomUUID() }); }),
  dismiss: (id) => set(s => { s.items = s.items.filter(n => n.id !== id); }),
})));

// ---- ANGULAR SIGNALS ----
// notifications.store.ts
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly _items = signal<Notification[]>([]);
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);  // auto-derived

  add(n: Omit<Notification, 'id'>) {
    this._items.update(items => [...items, { ...n, id: crypto.randomUUID() }]);
  }
  dismiss(id: string) {
    this._items.update(items => items.filter(n => n.id !== id));
  }
}

// Component:
@Component({
  template: `
    <span>{{ store.count() }}</span>
    @for (n of store.items(); track n.id) {
      <div>{{ n.message }} <button (click)="store.dismiss(n.id)">×</button></div>
    }
  `,
})
export class NotificationBell {
  store = inject(NotificationsStore);
}
```

---

## 🧠 6. Memory Aid

**Three generations — EPS:**
- **E**xplicit actions + audit trail → **Redux Toolkit** (Enterprise, large teams)
- **P**ragmatic + minimal boilerplate → **Zustand** (Practical, default choice)
- **S**ignal-level reactivity → **Signals** (Surgical, high-frequency)

**Decision matrix:**
| Team size | Complexity | First choice |
|---|---|---|
| 1–5 devs | Low–Medium | Zustand |
| 5–15 devs | Medium–High | Zustand or RTK |
| 15+ devs | High | Redux Toolkit |
| Angular app | Any | Signals (Angular 17+) |
| High-frequency values | Any | Signals / Jotai |

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ This comparison is the most asked state management question at senior interviews — the correct answer is NOT "always use Redux" or "Redux is dead"; it's a nuanced decision matrix based on team size, complexity, and debugging requirements; demonstrating you've evaluated and deployed multiple tools shows architectural maturity
→ Mentioning Angular Signals proactively (not just as an afterthought) is a differentiator for Hruday specifically — it directly connects to his Angular/SAP work, shows he stays current, and bridges the frameworks (signals are coming to React via the Compiler); this is a rare angle that candidates with only React experience can't give
→ The "Redux as a server cache" anti-pattern (loading API data into Redux manually) is worth calling out explicitly — RTK Query superseded this pattern; knowing to use TanStack Query / RTK Query for server state and Redux/Zustand only for client state shows you understand the more nuanced two-category split that modern state management requires

**How it works (2 sentences):**
Redux's single-store publish-subscribe model works by running every action through the root reducer synchronously, producing a new state object, then calling all `useSelector` subscribers to compare their output against the previous output — components re-render only if the selector returns a different value (by strict equality), which is why `createSelector` with memoized output is essential for derived objects and arrays.
Angular's Signal system replaces zone.js by building an execution context that tracks which signals are read during a `computed` or template evaluation — when a signal's value changes, Angular maintains a directed acyclic graph of dependents and marks only the affected computed signals and component views as dirty, then during the next microtask flushes only those dirty views rather than checking the entire component tree as zone-based change detection would.

---
✅ Topic 140/486 complete → Continuing to Topic 141: Server State vs Client State
