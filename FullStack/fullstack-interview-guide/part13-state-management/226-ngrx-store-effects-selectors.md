# NgRx — Store, Actions, Reducers, Effects, Selectors
> Part 13 — State Management
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **NgRx is Redux for Angular**, built on RxJS; the same unidirectional data flow — Component dispatches Action → Reducer updates Store → Selector selects derived data → Component re-renders — but every part is RxJS-native; the Store is a `BehaviorSubject`, Selectors return `Observable`s, Effects use `Actions$` observable stream
- **Actions**: `createAction('feature/eventName', props<{ payload }>())` — actions are EVENTS ("order placed"), not commands ("place the order"); action type strings are namespaced by feature to prevent collisions; `createActionGroup` (NgRx 14+) groups related actions together
- **Reducers**: `createReducer(initialState, on(action, (state, props) => newState))` — pure functions; NO side effects, NO API calls, NO async; Immer enabled by default so you can write "mutating" syntax inside `on()` handlers; must return new state reference for change detection to work
- **Effects**: the side-effect handler; `createEffect(() => actions$.pipe(ofType(action), switchMap(a => service.call(a.payload).pipe(map(result => successAction()), catchError(err => of(failureAction()))))))` — Effects are the ONLY place an API call should live in NgRx; they listen to `actions$` and dispatch new actions based on async results
- **Selectors**: `createSelector(inputSelectors, projector)` — memoised with Reselect; `createFeatureSelector<T>('featureName')` to access a slice root; compose selectors — pass one selector as input to another; each selector recomputes only when its specific inputs change, even if other parts of the store change
- **NgRx Signals** (NgRx 17+): `signalStore`, `withState`, `withComputed`, `withMethods` — signals-based store that eliminates the RxJS ceremony for simpler use cases; `patchState(store, { loading: true })` to update state; no actions, no reducers, no Effects for simple local-to-feature state
- ✅ **Hruday's anchor**: Bosch — NgRx for production machine monitoring state machine; machine status, operator actions, alert queue; RxJS Effects for WebSocket data → store dispatch pipeline; Oracle — NgRx feature stores for financial transaction views

---

## 1. One-Line Definition
NgRx is Angular's Redux — a store library built on RxJS that manages application state through a strict unidirectional flow: Components dispatch Actions, Reducers produce new State, Effects handle async side effects, and Selectors expose reactive slices back to Components as Observable streams.

---

## 2. The Problem It Solves

Angular applications grow into a tangle of service-to-service state sharing. Component A holds a user list. Component B modifies a user inside a dialog. Component C shows a count derived from the same list. The only Angular-native tools are: `@Input`/`@Output` (doesn't work across non-parent-child relationships), shared services with `BehaviorSubject`s (works but becomes an unstructured mess as scale grows), or event buses (even messier).

The core issues with ad-hoc service state:

One — no single source of truth. User data might live in `UserService`, `AuthService`, AND a component's local property. When one changes, the others don't automatically update.

Two — side effects mixed into services. The service calls the API, updates its `BehaviorSubject`, transforms the response, AND caches it — all in one method. Impossible to test each concern in isolation.

Three — no change traceability. "Which action caused this state to be wrong?" There's no audit trail when any method in any service can update state freely.

NgRx solves all three: one store holds all state, Effects are the only place async logic runs, and every state change is produced by an explicitly typed Action that DevTools can record and replay.

---

## 3. How It Works Internally

### The NgRx Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          NgRx Data Flow                         │
│                                                                 │
│  Component                                                      │
│  store.dispatch(loadProducts())   ← "something happened"       │
│         ↓                                                       │
│  Actions$ stream  ──→  Reducer                                  │
│                          on(loadProducts, state => ({          │
│                            ...state, status: 'loading'         │
│                          }))                                    │
│                          ↓                                      │
│                        State (new immutable object)             │
│                          ↓                                      │
│                        Selectors (memoised Observable)          │
│                          ↓                                      │
│                        Component re-renders with new data       │
│                                                                 │
│  Actions$ stream  ──→  Effects                                  │
│                          ofType(loadProducts)                   │
│                          switchMap → HttpClient.get()           │
│                          map(data => loadProductsSuccess(data)) │
│                          ↓                                      │
│                        store.dispatch(loadProductsSuccess)      │
│                          ↓                                      │
│                        Reducer handles success action           │
└─────────────────────────────────────────────────────────────────┘
```

### Selector Memoization

```
selectProductsVm = createSelector(
  selectAllProducts,       ← Input 1: products array reference
  selectCategoryFilter,    ← Input 2: filter string
  selectSortOrder,         ← Input 3: 'asc' | 'desc'
  (products, filter, sort) => {   ← Projector: only runs when any input changes
    return products
      .filter(p => p.category === filter)
      .sort((a, b) => sort === 'asc' ? a.price - b.price : b.price - a.price);
  }
)

// Renders:   A       B       C
// on store update that changes only auth state:
//   selectAllProducts has same reference → no recompute
//   selectCategoryFilter has same reference → no recompute
//   selectSortOrder has same reference → no recompute
// ✅ Selector DOES NOT recompute → no component re-render
// Only recomputes when products OR filter OR sort actually changes
```

---

## 4. The Code

### Wrong Way — Service-Based Shared State

```typescript
// ❌ WRONG — Ad-hoc BehaviorSubject service: unstructured, no audit trail

@Injectable({ providedIn: 'root' })
export class ProductService {
  // ❌ Multiple Sources of truth — different components might trigger different loads
  private products$ = new BehaviorSubject<Product[]>([]);
  private loading$ = new BehaviorSubject<boolean>(false);
  private error$ = new BehaviorSubject<string | null>(null);
  
  // ❌ Side effects, loading state, caching, and transformation all in one method
  loadProducts(category: string): void {
    this.loading$.next(true);
    this.http.get<Product[]>(`/api/products?category=${category}`).subscribe({
      next: data => {
        // ❌ Mixed logic: filter here, but sorting is done in each component separately
        this.products$.next(data.filter(p => p.active));
        this.loading$.next(false);
      },
      error: (err) => {
        this.error$.next(err.message);
        this.loading$.next(false);
        // ❌ No retry, no Error effect, no action to replay in DevTools
      }
    });
  }
  
  // ❌ Expose raw BehaviorSubjects — any component can .next() to change state
  get products() { return this.products$.asObservable(); }
}

// ❌ In component:
@Component({})
export class ProductListComponent {
  constructor(private productService: ProductService) {
    this.productService.loadProducts('electronics');
    // ❌ Two separate components calling this will make two API calls with no deduplication
    // ❌ No change history, no DevTools visibility into why state changed
  }
}
```

> **Why this fails at scale:** state is fragmented across services; any service method can modify any BehaviorSubject; there is no record of what triggered a state change; async logic is untestable in isolation.

### Right Way — NgRx with Actions, Reducers, Effects, Selectors

```typescript
// ✅ RIGHT — NgRx Store with all four concepts

// === Step 1: ACTIONS — events that describe what happened ===
// products.actions.ts
import { createAction, createActionGroup, emptyProps, props } from '@ngrx/store';

export const ProductsActions = createActionGroup({
  source: 'Products',   // Generates action types like '[Products] Load Products'
  events: {
    'Load Products':         props<{ category: string }>(),
    'Load Products Success': props<{ products: Product[] }>(),
    'Load Products Failure': props<{ error: string }>(),
    'Select Product':        props<{ productId: string }>(),
    'Clear Selection':       emptyProps(),
  }
});

// Destructure for cleaner usage:
export const {
  loadProducts,
  loadProductsSuccess,
  loadProductsFailure,
  selectProduct,
  clearSelection
} = ProductsActions;


// === Step 2: REDUCER — pure function, no side effects ===
// products.reducer.ts
import { createReducer, on } from '@ngrx/store';

interface ProductsState {
  products: Product[];
  selectedProductId: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

const initialState: ProductsState = {
  products: [],
  selectedProductId: null,
  status: 'idle',
  error: null,
};

export const productsReducer = createReducer(
  initialState,
  
  on(loadProducts, (state) => ({
    ...state,
    status: 'loading' as const,
    error: null,
  })),
  
  on(loadProductsSuccess, (state, { products }) => ({
    ...state,
    products,
    status: 'success' as const,
  })),
  
  on(loadProductsFailure, (state, { error }) => ({
    ...state,
    error,
    status: 'error' as const,
  })),
  
  on(selectProduct, (state, { productId }) => ({
    ...state,
    selectedProductId: productId,
  })),
  
  on(clearSelection, (state) => ({
    ...state,
    selectedProductId: null,
  })),
);
// ✅ Pure function — nothing but state + action → new state
// ✅ No API calls, no subscriptions, no console.log, no async


// === Step 3: SELECTORS — memoised derived data ===
// products.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';

// Feature selector: access the 'products' slice of the root store
const selectProductsState = createFeatureSelector<ProductsState>('products');

// Basic selectors (no memoisation needed — just property access)
export const selectAllProducts = createSelector(
  selectProductsState,
  state => state.products
);

export const selectProductsStatus = createSelector(
  selectProductsState,
  state => state.status
);

export const selectSelectedProductId = createSelector(
  selectProductsState,
  state => state.selectedProductId
);

// ✅ Composed selectors — memoised; only recompute when inputs change
export const selectElectronicsProducts = createSelector(
  selectAllProducts,
  products => products.filter(p => p.category === 'electronics')
  // Only recomputes when the products array reference changes
);

export const selectSelectedProduct = createSelector(
  selectAllProducts,
  selectSelectedProductId,
  (products, selectedId) =>
    selectedId ? products.find(p => p.id === selectedId) ?? null : null
  // Memoised on both products AND selectedId — recomputes only when either changes
);

// ✅ ViewModel selector — combine multiple slices for a component's exact needs
export const selectProductsVm = createSelector(
  selectAllProducts,
  selectProductsStatus,
  (products, status) => ({ products, isLoading: status === 'loading', hasError: status === 'error' })
);


// === Step 4: EFFECTS — side effects (API calls) ===
// products.effects.ts
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

@Injectable()
export class ProductsEffects {
  
  loadProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadProducts),         // ← Listen for the loadProducts action
      switchMap(({ category }) =>   // ← switchMap cancels previous request on new dispatch
        this.productService.getProducts(category).pipe(
          map(products => loadProductsSuccess({ products })),   // ← Success: dispatch success action
          catchError(error => of(loadProductsFailure({ error: error.message })))  // ← Error: dispatch failure action (never throw)
        )
      )
    )
  );
  
  // ✅ Fire-and-forget effect (analytics, notifications) — { dispatch: false }
  trackProductView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(selectProduct),
      tap(({ productId }) => {
        this.analyticsService.trackView('product', productId);
      })
    ),
    { dispatch: false }  // ← This effect does NOT dispatch another action
  );
  
  constructor(
    private actions$: Actions,
    private productService: ProductService,
    private analyticsService: AnalyticsService
  ) {}
}


// === Step 5: MODULE SETUP ===
// products.module.ts
@NgModule({
  imports: [
    StoreModule.forFeature('products', productsReducer),
    EffectsModule.forFeature([ProductsEffects]),
  ],
})
export class ProductsModule {}

// Root module:
@NgModule({
  imports: [
    StoreModule.forRoot({}),
    EffectsModule.forRoot([]),
    StoreDevtoolsModule.instrument({ maxAge: 25, logOnly: !isDevMode() }),
  ],
})
export class AppModule {}


// === Step 6: COMPONENT USAGE ===
// products-list.component.ts
@Component({
  template: `
    <ng-container *ngIf="vm$ | async as vm">
      <app-skeleton *ngIf="vm.isLoading" />
      <app-error-banner *ngIf="vm.hasError" />
      <app-product-card
        *ngFor="let product of vm.products"
        [product]="product"
        (selected)="onSelect(product.id)"
      />
    </ng-container>
  `
})
export class ProductListComponent implements OnInit {
  // ✅ Single ViewModel observable — one async pipe, one subscription
  vm$ = this.store.select(selectProductsVm);
  
  constructor(private store: Store) {}
  
  ngOnInit() {
    this.store.dispatch(loadProducts({ category: 'electronics' }));
  }
  
  onSelect(productId: string) {
    this.store.dispatch(selectProduct({ productId }));
  }
}
```

```typescript
// ✅ NgRx Signals Store (NgRx 17+ — no actions, no reducers for simple feature state)
// In simple feature stores where RxJS ceremony isn't needed:

import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';

interface FilterState {
  searchQuery: string;
  category: string;
  sortOrder: 'asc' | 'desc';
}

export const FilterStore = signalStore(
  withState<FilterState>({
    searchQuery: '',
    category: 'all',
    sortOrder: 'asc',
  }),
  
  withComputed(({ searchQuery, category }) => ({
    // ✅ Computed signals — automatically recompute when inputs change
    hasActiveFilters: computed(() => searchQuery() !== '' || category() !== 'all'),
    filterLabel: computed(() => `${category()} · "${searchQuery()}"`)
  })),
  
  withMethods((store) => ({
    setSearch(query: string) {
      patchState(store, { searchQuery: query });  // ✅ Immer-like: only patch what changed
    },
    setCategory(category: string) {
      patchState(store, { category });
    },
    clearFilters() {
      patchState(store, { searchQuery: '', category: 'all' });
    }
  }))
);

// ✅ In component (standalone):
@Component({
  providers: [FilterStore],   // Scoped to this component tree — NOT global
  template: `
    <input [value]="filterStore.searchQuery()" (input)="onSearch($event)" />
    <span *ngIf="filterStore.hasActiveFilters()">Filters active</span>
  `
})
export class ProductFiltersComponent {
  filterStore = inject(FilterStore);
  
  onSearch(event: Event) {
    this.filterStore.setSearch((event.target as HTMLInputElement).value);
  }
}
// ✅ No actions, no reducers, no Effects, no subscription management
// Ideal for feature-scoped state that doesn't need cross-app access
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why do NgRx Effects exist? Why not just call the HTTP service in the reducer?"

**Hruday's answer:**
> Reducers must be pure functions. A pure function has no side effects — it takes the current state and an action and deterministically produces a new state. That's the fundamental rule of Redux and NgRx.
>
> If a reducer called an HTTP service, it would introduce asynchrony (the HTTP call is a Promise or Observable), external dependency (the service itself), and non-determinism (the network response varies). The reducer would no longer be a pure function. Redux DevTools time-travel debugging works because reducers are pure — you can replay a sequence of actions and always get the same state. An HTTP call in the reducer breaks that completely.
>
> Effects are the designated place for side effects in NgRx. An Effect is an injectable service that listens to the actions stream, picks out actions it cares about with `ofType()`, performs async work (HTTP call, WebSocket write, localStorage read), and dispatches a new action with the result. The Effect itself is impure, but it keeps the impurity contained and testable.
>
> At Bosch, our production monitoring dashboard used an Effect that listened to a `startMonitoring` action, triggered a WebSocket subscription via a `webSocketService.connect()` call, and dispatched `machineStatusUpdated` actions every time the WebSocket emitted. The Effect translated a real-time stream into a sequence of discrete dispatched actions — exactly the kind of side effect management it was designed for.

---

### Q2 — SAP Experience
**Interviewer asks:** "When would you use NgRx Signals Store vs the classic NgRx Store?"

**Hruday's answer:**
> The decision comes down to scope and complexity.
>
> Classic NgRx — actions, reducers, effects, selectors — is the right choice when state needs to be shared across feature boundaries, needs full audit trail (DevTools time-travel), involves complex async flows (multiple effects chained), or needs the precise control of `switchMap`/`concatMap`/`exhaustMap` for request handling.
>
> NgRx Signals Store is the right choice for feature-scoped state where you don't need cross-feature access. Filters for a product list, the UI state of a complex form, the session state of an onboarding wizard — this kind of state is local to a feature and doesn't need to be in the global store. With NgRx Signals, you write `withState`, `withComputed`, `withMethods`, and `patchState`. No action type strings, no reducer `on()` handlers, no Effects for synchronous state — half the ceremony.
>
> The practical split I use: if the state is shared across routes or needs DevTools tracing → classic NgRx. If the state is scoped to one feature's component tree and the mutations are synchronous → NgRx Signals Store. For async work inside a Signals Store, I still call the service directly in a `withMethods` function and handle loading/error state manually — it's acceptable complexity for feature-local async.
>
> At Oracle, I used classic NgRx for the transaction list and financial summary state (cross-module, audited, complex async). I introduced NgRx Signals for the advanced filter panel state (feature-local, no Effects needed, five lines of `patchState` replaced 40 lines of slice + actions + effects).

---

### Q3 — Deep Dive
**Interviewer asks:** "How does selector memoization work in NgRx, and when can it break down?"

**Hruday's answer:**
> NgRx selectors use Reselect under the hood. When you call `createSelector(inputA, inputB, projector)`, the resulting selector checks whether the return values of `inputA` and `inputB` have changed by reference since the last call. If neither input changed, the projector function is NOT called — the previous result is returned directly.
>
> This means components that use a memoized selector don't re-run their view logic just because an unrelated part of the store changed. A component showing product data doesn't re-render when the auth slice is updated, as long as `selectAllProducts` returns the same array reference.
>
> The breakdown cases:
>
> First — always-new-object reducers. If your reducer always produces a new object even when nothing changed — `on(someAction, state => ({ ...state }))` without any actual change — the selector sees a new reference and recomputes. Reducers should only spread when values actually change.
>
> Second — inline object projection. `createSelector(selectState, state => ({ products: state.products, count: state.total }))` — this projector always creates a new `{}` object, even if `products` and `total` haven't changed. The memoization check on the result fails because the selector's output is a new object reference every call. Solution: either split into separate selectors or accept the re-render if the computation is cheap.
>
> Third — the `memoize` default is 1. NgRx selectors memoize one previous call. If you call the same selector with different router params (like `selectProductById('product-1')` vs `selectProductById('product-2')`), each call clears the previous memoization. For parameterised selectors, use a factory function that creates a new memoized selector instance per parameter value.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design the NgRx state structure for a real-time machine monitoring dashboard."

**Hruday's answer:**
> I built this at Bosch, so I'll describe the actual structure.
>
> Three feature slices:
>
> `machinesSlice` — the list of machines, their current status (online/offline/warning/critical), and normalized by machine ID. Used `createEntityAdapter` because we had 50+ machines and needed O(1) lookup by ID when WebSocket updates arrived for individual machines.
>
> `alertsSlice` — the alert queue, alert acknowledgement state, alert severity levels. Alerts come in through WebSocket and accumulate in the store until acknowledged. The Effects handled WebSocket `message` events → `alertReceived` actions → reducer inserts into entity adapter.
>
> `dashboardSlice` — UI state only: selected machine ID, time range filter, display mode (grid/list). This slice has NO async Effects. Everything is synchronous user actions → `on()` reducer handlers.
>
> The Effects had two sources: HTTP (initial data load on `initializeDashboard` action) and WebSocket (real-time machine status updates). The WebSocket Effect was a `callNoDispatch` of `connect()` that returned an Observable stream — every emission dispatched `machineStatusUpdated({machineId, status, timestamp})`. The reducer handled this with `machinesAdapter.upsertOne()` to update the specific machine's status without touching others.
>
> Selectors composed the view: `selectMachinesDashboardVm` combined machine entities + alert counts + the selected machine detail into one Observable that the dashboard component subscribed to with a single `async` pipe.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Actions as commands" | "I dispatch `getProducts()` and the reducer fetches the data" | Actions are EVENTS ("ProductsPageLoaded"), not commands ("FetchProducts"); a command is imperative — "go do this"; an event is declarative — "this happened, any interested party may respond"; naming actions as events makes them reusable: the same `UserLoggedIn` action can trigger the auth reducer, a welcome Effect, AND an analytics Effect simultaneously; naming as commands implies one handler, limits reuse |
| "One action per Effect" | "Each Effect handles one action and that's it" | Effects can handle multiple actions with `ofType(actionA, actionB)` when they need the same async logic; but more importantly, one action can be handled by multiple Effects — the `UserLoggedIn` event triggers BOTH the `loadUserPreferences$` Effect AND the `trackAnalyticsLogin$` Effect; NgRx fans out one dispatched action to all interested Effects and all interested `on()` handlers; this fan-out is the whole power of the event model |
| "switchMap is always right for Effects" | "I use switchMap in all my Effects" | RxJS operator choice in Effects is critical: `switchMap` cancels the previous inner observable when a new action arrives — correct for navigation (cancel the previous page's data load if user navigates again) but WRONG for mutations (cancelling an in-flight POST creates ghost operations on the server); for mutations use `concatMap` (queue, never cancel) or `exhaustMap` (ignore new dispatches while one is in flight); at Bosch, a `switchMap` on a machine command Effect caused dropped commands when operators clicked quickly — fixed by changing to `concatMap` |
| "Selectors are optional" | "I just select with `store.select(state => state.feature.items)` inline" | Inline selection works but has no memoization — every store change triggers the projector; `createSelector` gives memoization AND testability (selectors are pure functions — you can unit test them directly with plain objects, no Store injection needed); for a components team, exported selectors are the API contract between the state layer and the view layer; they should be named, exported, and tested independently |

---

## 7. Hruday's Real Experience Hook
> "At Bosch, the production machine monitoring dashboard was my introduction to NgRx at real scale. We were monitoring 50+ industrial machines in real time via WebSocket, displaying status, alert queues, and historical trends simultaneously.
>
> The first version used shared services with BehaviorSubjects — it worked but was impossible to debug when a machine status update caused ripple effects elsewhere. The WebSocket subscription, the HTTP polling for historical data, and the UI state for the selected machine were all tangled in the same service.
>
> Migrating to NgRx changed the debugging experience fundamentally. When an alert was missed or a status update failed to reflect on screen, we'd open Redux DevTools and see the exact action sequence: `WebSocketConnected`, then `MachineStatusUpdated` events every 2 seconds, then a gap where the WebSocket had silently disconnected. The Effect had a reconnection handler, but DevTools showed it hadn't dispatched the reconnect action — which revealed a bug in the `catchError` operator that was swallowing the disconnect event.
>
> We found and fixed that bug in 20 minutes because the action stream was visible. Before NgRx, it took two days of console.log additions across three services to find a similar issue.
>
> The selector memoization was equally valuable: our dashboard component had 12 async pipes. After extracting to a single `selectDashboardVm` selector, the component had one pipe, and unnecessary re-renders dropped by 70% by our measurement team's metrics."

---

## 8. Scale Evolution

**Small Angular app →** NgRx is likely overkill; use a single `SharedStateService` with typed BehaviorSubjects; only add NgRx if the app has three or more routes that share state AND that state has meaningful async complexity.

**Medium team app →** NgRx with `createActionGroup` for clean action organization; one feature module per domain (products, orders, auth); Effects for all HTTP; Selectors as the team's API contract; component tests using selector mocks rather than Store injection; NgRx Signals for feature-local UI state.

**Large enterprise app (Bosch/SAP scale) →** entity adapters for all list data; WebSocket Effects with `fromEvent` or custom Observable factories; granular selector composition to minimize component re-renders; `StoreDevtoolsModule` restricted to dev builds; lazy-loaded feature states with `StoreModule.forFeature`; NgRx Signals Store for lightweight component-tree-scoped state (filter panels, form wizards); `createActionGroup` for consistent action naming discipline across teams.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | NgRx for payment method management and checkout flow state in Angular payment portals; Effects for payment gateway API calls with `concatMap` to prevent duplicate submissions; Selectors for payment status VM; real-time transaction status updates via WebSocket Effect | concatMap vs exhaustMap for mutations; real-time Effects; selector composition for payment status VM |
| Swiggy / Meesho | NgRx for order tracking state in Angular seller portals; real-time order status via polling Effect (`timer(0, 10000)` in Effect); Effects for notification permission + FCM token registration; NgRx Signals for filter panel state in product listing | Polling Effects with interval; NgRx Signals vs NgRx tradeoff; feature state lazy loading |
| Adobe / Microsoft | Large Angular apps with complex document state (Creative Cloud, Teams); multiple interacting feature stores; Effects chaining (save draft → sync to server → update version history); extensive use of `createEntityAdapter` for document/asset lists; selector composition for complex document views | createEntityAdapter depth; selector memoization edge cases; Effects chaining with actions |
| SAP Labs | Direct experience: NgRx in enterprise Angular apps; Oracle — NgRx for financial transaction views; Bosch — production machine monitoring in NgRx; real WebSocket Effect implementation for real-time status; SAP codebase uses NgRx for approval workflow states | Real production debugging story; WebSocket Effect implementation; NgRx Signals introduction in v17+ |

---

## 10. Related Topics — What to Study Next

- **Topic 224 — Local vs Global State** — NgRx is the "global" end of the spectrum; this topic provides the decision framework for when to put state in NgRx vs a local component signal vs a service; NgRx is justified only when state is genuinely shared across feature boundaries or needs audit traceability
- **Topic 225 — Redux Toolkit** — the React equivalent; same conceptual model (actions, reducers, selectors, effects); if you can explain both RTK and NgRx, you demonstrate framework-agnostic architectural thinking; key difference: NgRx is RxJS-native (Effects are Observable pipes, Selectors return Observables), RTK is React Hooks-native (RTK Query returns hook results, Selectors are called in `useSelector`)
- **Topic 228 — Zustand and Signals** — NgRx Signals Store (NgRx 17+) and Angular's built-in `signal()` / `computed()` are the lightweight alternative to classic NgRx; understanding when to use the full NgRx machinery vs the signals-based approach is a current interview topic for Angular-heavy roles
- **Topic 229 — State Normalization** — `createEntityAdapter` is available in both RTK (for React) and NgRx (for Angular); normalizing list state — flat keyed objects instead of nested arrays — is a pattern that applies whenever list entities need O(1) update via ID; Bosch dashboard used this for 50+ machine entities updated by ID on each WebSocket event

---

*Part 13 · NgRx — Store, Actions, Reducers, Effects, Selectors · Full Stack Interview Guide · Hruday D · 2026*
