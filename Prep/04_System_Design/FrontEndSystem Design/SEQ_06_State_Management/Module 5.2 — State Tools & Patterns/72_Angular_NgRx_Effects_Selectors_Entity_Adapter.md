# 72. Angular NgRx — Effects, Selectors, Entity Adapter ★

## 1. High-Level Explanation (Frontend Interview Level)

**NgRx** is the Redux pattern implemented for Angular, built on RxJS streams. At its core: components dispatch Actions → Reducers compute new State → Selectors derive data for components → Effects handle side effects (API calls, navigation). NgRx enforces a strict unidirectional data flow that becomes essential in large Angular teams where multiple developers work on the same feature areas simultaneously. Three sub-topics define the senior NgRx conversation: **Effects** (the async side-effect layer using `createEffect`), **Selectors** (memoised derived state using `createSelector`), and **Entity Adapter** (`@ngrx/entity`'s normalised CRUD state machine). NgRx is heavy for small apps — but at enterprise scale (SAP, Salesforce, Adobe), the predictability, DevTools, and testability justify every kilobyte.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### NgRx Architecture Overview

```
Component (UI)
    │
    │ dispatch(loadProducts())       dispatch(addToCart(product))
    ▼
Store (State Container)
    │
    ├── Reducers: State → Action → New State (pure, synchronous)
    │
    ├── Effects: Action → Observable → new Actions (async, side-effects)
    │       └── HTTP calls, WebSocket messages, localStorage, analytics
    │
    └── Selectors: State → Derived Data (memoised, composable)
            └── Components subscribe via store.select(selector)
```

### Actions — Typed Event Descriptions

```typescript
import { createAction, props } from '@ngrx/store';

export const loadProducts = createAction('[Products Page] Load Products');
export const loadProductsSuccess = createAction(
  '[Products API] Load Products Success',
  props<{ products: Product[] }>()
);
export const loadProductsFailure = createAction(
  '[Products API] Load Products Failure',
  props<{ error: HttpErrorResponse }>()
);

// [Source] Event Name convention:
// Source = where the action was dispatched from (page, API, effect)
// Event = what happened (past tense for results, imperative for commands)
```

### Reducers — Pure State Transitions

```typescript
import { createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';

export interface ProductsState extends EntityState<Product> {
  loadingStatus: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
  selectedProductId: string | null;
}

export const adapter: EntityAdapter<Product> = createEntityAdapter<Product>({
  selectId: (product) => product.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name),  // optional: keep sorted
});

export const initialState: ProductsState = adapter.getInitialState({
  loadingStatus: 'idle',
  error: null,
  selectedProductId: null,
});

export const productsReducer = createReducer(
  initialState,
  
  on(loadProducts, (state): ProductsState => ({
    ...state, loadingStatus: 'loading', error: null,
  })),
  
  on(loadProductsSuccess, (state, { products }): ProductsState =>
    // EntityAdapter handles the normalisation — ids[] + entities{}
    adapter.setAll(products, { ...state, loadingStatus: 'loaded' })
  ),
  
  on(loadProductsFailure, (state, { error }): ProductsState => ({
    ...state,
    loadingStatus: 'error',
    error: error.message ?? 'Unknown error',
  })),
  
  // EntityAdapter CRUD operations — each returns normalized state
  on(addProduct, (state, { product }) => adapter.addOne(product, state)),
  on(updateProduct, (state, { update }) => adapter.updateOne(update, state)),
  on(removeProduct, (state, { id }) => adapter.removeOne(id, state)),
  on(upsertProducts, (state, { products }) => adapter.upsertMany(products, state)),
);
```

### Entity Adapter — Normalised CRUD State

`@ngrx/entity` solves the normalisation problem: instead of `products: Product[]` (O(n) lookups, complex updates), the adapter maintains:

```typescript
// EntityState shape:
{
  ids: ['prod-1', 'prod-2', 'prod-3'],       // ordered array of IDs
  entities: {
    'prod-1': { id: 'prod-1', name: 'Widget', price: 99 },
    'prod-2': { id: 'prod-2', name: 'Gadget', price: 149 },
    'prod-3': { id: 'prod-3', name: 'Doohicky', price: 49 },
  },
}

// Adapter operations — ALL return new state (immutable):
adapter.addOne(product, state)           // add single entity
adapter.addMany(products, state)         // add array of entities
adapter.setOne(product, state)           // set (overwrite) single entity
adapter.setAll(products, state)          // replace all entities
adapter.upsertOne(product, state)        // add or update single
adapter.upsertMany(products, state)      // add or update array
adapter.updateOne({ id, changes }, state)// partial update
adapter.updateMany(updates, state)       // partial update array
adapter.removeOne(id, state)             // delete by id
adapter.removeMany(ids, state)           // delete by ids array
adapter.removeAll(state)                 // clear all entities

// Adapter selects (generated):
const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
```

### Selectors — Memoised Derived State

```typescript
import { createSelector, createFeatureSelector } from '@ngrx/store';

// Feature selector: gets the products slice from global state
export const selectProductsFeature =
  createFeatureSelector<ProductsState>('products');

// Entity adapter selectors composed with feature selector
const { selectAll, selectEntities, selectTotal } =
  adapter.getSelectors(selectProductsFeature);

export const selectAllProducts = selectAll;           // Product[]
export const selectProductEntities = selectEntities;  // Record<string, Product>
export const selectProductCount = selectTotal;        // number

// createSelector: memoised — recomputes only when inputs change
export const selectLoadingStatus = createSelector(
  selectProductsFeature,
  (state) => state.loadingStatus
);

// Derived selector: filtering
export const selectProductsBelowPrice = (maxPrice: number) => createSelector(
  selectAllProducts,
  (products) => products.filter(p => p.price <= maxPrice)
);
// ⚠️ Factory-style selectors create new selector instances per call.
// Use this in service-level injection or memoize the factory output.

// Joined selector: combine multiple selectors
export const selectProductsWithStats = createSelector(
  selectAllProducts,
  selectLoadingStatus,
  selectProductCount,
  (products, status, count) => ({ products, status, count })
);
// Re-runs ONLY when any of the 3 input selectors emit a new value
// Comparisons are reference equality (===) — Immer/immutable reduces produces new ref
```

### Effects — Async Side Effects

```typescript
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';

@Injectable()
export class ProductsEffects {
  constructor(
    private actions$: Actions,
    private productsService: ProductsService
  ) {}
  
  // Effect: listen for loadProducts → call API → dispatch success/failure
  loadProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadProducts),           // filter to only loadProducts actions
      exhaustMap(() =>                 // cancel prior requests on new dispatch
        this.productsService.list().pipe(
          map((products) => loadProductsSuccess({ products })),
          catchError((error) => of(loadProductsFailure({ error }))),
        )
      )
    )
  );
  
  // Effect: log product load to analytics (dispatch: false = no action dispatched)
  logProductLoad$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loadProductsSuccess),
        tap(({ products }) => analytics.track('products_loaded', { count: products.length }))
      ),
    { dispatch: false }
  );
}

// RxJS operators in Effects — choosing the right one:
// switchMap:   cancel previous, use latest → SEARCH (user types, only last query matters)
// concatMap:   queue, process in order → CART MUTATIONS (preserve order)
// mergeMap:    process all concurrently → DOWNLOAD MULTIPLE FILES
// exhaustMap:  ignore new until current completes → FORM SUBMIT (prevent double submit)
```

### NgRx Component Store — Lightweight Local State

For component-scoped state that is too complex for component properties but too small for global store:

```typescript
@Injectable()
export class ProductDetailStore extends ComponentStore<ProductDetailState> {
  constructor(private productsService: ProductsService) {
    super({ product: null, isLoading: false, variants: [] });
  }
  
  // Updater: synchronous state mutation
  readonly setProduct = this.updater((state, product: Product) => ({
    ...state, product,
  }));
  
  // Selector: derived from local state
  readonly product$ = this.select((state) => state.product);
  
  // Effect: local effect without global store contamination
  readonly loadProduct = this.effect((productId$: Observable<string>) =>
    productId$.pipe(
      tap(() => this.patchState({ isLoading: true })),
      switchMap((id) =>
        this.productsService.get(id).pipe(
          tapResponse(
            (product) => { this.setProduct(product); this.patchState({ isLoading: false }); },
            (error) => { /* handle error */ this.patchState({ isLoading: false }); }
          )
        )
      )
    )
  );
}
```

---

## 3. Real-World Examples

**Salesforce Einstein Analytics (Angular):** NgRx manages the complex dashboard state — multiple queries, active filters, chart configurations, permission states. The EntityAdapter stores ~500 datasets in normalised form, and selectors derive the current user's accessible datasets via `createSelector`. Effects handle the OData-like query execution.

**Adobe Experience Manager (Angular):** The AEM content tree is a perfect NgRx entity — each content node is normalised by path, `createEntityAdapter` manages it, and effects handle the async tree expansion (load children on node expand). Selectors derive the breadcrumb trail from the current node path.

**At Hruday's SAP context:** SAP BI (Business Intelligence) report management is a prime NgRx use case — reports have complex metadata, filters, and sharing permissions. The `EntityAdapter` manages the report catalogue (~1000s of reports) normalised by report ID. `createSelector` derives "my reports," "shared reports," "recently accessed" views from the same entity collection — without N additional API calls.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "NgRx implements the Redux pattern for Angular using RxJS. Actions describe events, reducers compute state transitions, effects handle async side effects using RxJS streams with operators like `exhaustMap` for de-bounced form submissions or `switchMap` for search — cancelling stale requests. Selectors are memoised with `createSelector` — they recompute only when input selector outputs change via reference equality, which pairs well with OnPush change detection. The Entity Adapter from `@ngrx/entity` normalises arrays into `{ ids, entities }` shape, eliminating O(n) find/update operations and providing typed CRUD reducers for free. For component-scoped state, `ComponentStore` provides a lightweight boundary that avoids polluting the global store."

**Likely Follow-up Questions:**
1. How does NgRx selector memoisation work? → `createSelector` stores the last input values and last result. When the store emits, selectors re-run projector functions only if any input value changed (reference equality). Combined with OnPush + async pipe, components skip change detection unless their selected data actually changed.
2. How do you test NgRx Effects? → Use `provideMockActions` from `@ngrx/effects/testing` to provide a controllable `Actions` stream. Inject mock services. Dispatch test actions into the mock stream, subscribe to the effect's output observable, and assert emitted actions with marble testing (`TestScheduler`) from RxJS.
3. When would you NOT use global NgRx store? → Page-specific state that no other feature cares about, wizard/multi-step form state, component-level undo-redo. These belong in `ComponentStore` or Angular service-as-store patterns — NgRx global store should contain only truly shared, global application state.

---

## 5. Code Example

```typescript
// Full example: products module with effects + selector + entity adapter

// selectors.ts
export const selectFeaturedProducts = createSelector(
  selectAllProducts,
  selectProductsByCategoryFilter,   // assume this is another selector
  (products, categoryFilter) =>
    products.filter(p => p.featured && (categoryFilter ? p.category === categoryFilter : true))
);

// In component (with OnPush):
@Component({
  template: `
    <app-product-card
      *ngFor="let p of featuredProducts$ | async; trackBy: trackById"
      [product]="p">
    </app-product-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,  // works perfectly with NgRx + async pipe
})
export class FeaturedProductsComponent {
  featuredProducts$ = this.store.select(selectFeaturedProducts);
  
  constructor(private store: Store<AppState>) {
    this.store.dispatch(loadProducts());
  }
  
  trackById = (index: number, product: Product) => product.id;
}
```

---

## 6. Memory Aid

**NgRx data flow:** Actions → Reducers → State → Selectors → Components → (dispatch) → Actions

**Three key files per NgRx feature:**
1. `*.actions.ts` — what happened (past-tense)
2. `*.reducer.ts` — how state changes (pure function)
3. `*.effects.ts` — async reactions (RxJS stream)

**Entity adapter operations:** `addOne`, `addMany`, `setAll`, `upsertOne`, `updateOne`, `removeOne` — all produce a new normalised state.

**RxJS operator for effects:** switchMap=search, exhaustMap=form submit, concatMap=ordered queue, mergeMap=parallel.

---

## 7. Why & How Summary

**Why it matters:** In large teams and enterprise Angular applications, NgRx enforces predictable data flow, makes debugging tractable via Redux DevTools time-travel, and enables feature-level ownership with clear boundaries between actions dispatched by one team and effects/reducers owned by another.

**How it works:** The `Store` wraps an RxJS `BehaviorSubject`. When an action is dispatched, the store runs all registered reducers and emits new state. Selectors are derived RxJS observables (using `pipe(map(...), distinctUntilChanged(...))`) — they emit only when their derived value changes. Effects use `Actions` — an observable of all dispatched actions — filtered with `ofType` and transformed with RxJS operators that ultimately produce new actions to dispatch.

**Company relevance:**
- Microsoft: Azure Portal's Angular components use an NgRx-like pattern for resource state — understanding selectors and normalised entity state is essential for contribution
- Adobe: Experience Manager and Analytics use Angular + NgRx — the EntityAdapter pattern for content node trees is a direct interview topic
- Salesforce: LWC uses a wire-adapter pattern that mirrors NgRx selectors — understanding state normalisation helps bridge the conceptual gap
- Cisco: Webex Device Management is Angular-based — NgRx effects manage device command acknowledgement flows (dispatch command → effect → poll device state → dispatch success/timeout)
