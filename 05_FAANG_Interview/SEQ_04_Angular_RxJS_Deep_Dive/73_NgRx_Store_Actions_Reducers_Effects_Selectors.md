# 73. NgRx — Store, Actions, Reducers, Effects, Selectors
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

NgRx is Angular's Redux implementation — a global, immutable state container driven by Actions, Reducers, Effects, and Selectors. An Action describes what happened, a Reducer produces the next state from the current state + action, a Selector reads a slice of state efficiently with memoization, and an Effect handles side effects like HTTP calls and dispatches new actions on success or failure. At SAP, I introduced NgRx for our BI dashboard's tile configuration state — previously spread across 12 services with conflicting setters; after NgRx, state was single-source-of-truth, time-travel debuggable, and feature state could be loaded lazily alongside lazy-loaded routing modules.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The problem NgRx solves: shared mutable state at scale**

When multiple components need to read and modify the same state, ad-hoc services with `BehaviorSubject`s lead to:
- State scattered across 10+ services
- Circular service dependencies
- No audit trail ("who set this value and when?")
- Race conditions from multiple concurrent updates
- State re-sync bugs after navigation

**NgRx's solution:** Unidirectional data flow — the **Action → Reducer → State → Selector → Component** cycle. Components can **read** state (via selectors) and **describe events** (via actions), but can never directly mutate state.

### How NgRx Works Internally

**The Redux cycle:**

```
User clicks "Load Tiles"
         ↓ dispatch
    [loadTiles action]
         ↓
   NgRx Store (dispatches to Effects too)
         ↓ Effects intercept
   [HTTP GET /api/tiles]
         ↓ success
   dispatch [loadTilesSuccess({tiles})]
         ↓
   Reducer: state = {...state, tiles, loading: false}
         ↓
   Store updates state
         ↓
   Selectors re-compute (memoized)
         ↓
   Components observing selectors receive new state
         ↓
   Change Detection (OnPush + async pipe) updates DOM
```

**Core Building Blocks:**

**1. Actions — describe events, not commands:**
```typescript
// Action names are domain events: "[Feature] EventDescription"
export const loadTiles = createAction('[Dashboard] Load Tiles');
export const loadTilesSuccess = createAction(
  '[Dashboard] Load Tiles Success',
  props<{ tiles: Tile[] }>()   // typed props
);
export const loadTilesFailure = createAction(
  '[Dashboard] Load Tiles Failure',
  props<{ error: string }>()
);

// Actions are plain objects: { type: '[Dashboard] Load Tiles Success', tiles: [...] }
```

**2. Reducers — pure functions, no side effects:**
```typescript
export interface DashboardState {
  tiles: Tile[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  tiles: [],
  loading: false,
  error: null,
};

export const dashboardReducer = createReducer(
  initialState,
  on(loadTiles, state => ({ ...state, loading: true, error: null })),
  on(loadTilesSuccess, (state, { tiles }) => ({
    ...state,
    tiles,         // new array — immutability
    loading: false
  })),
  on(loadTilesFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  }))
);
// Reduce rule: NEVER mutate, always return new object references
```

**3. Effects — side effects handled outside reducer:**
```typescript
@Injectable()
export class DashboardEffects {
  constructor(
    private actions$: Actions,
    private tilesService: TilesService
  ) {}

  loadTiles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTiles),          // only react to this action type
      exhaustMap(() =>            // ignore new requests while one is pending
        this.tilesService.getTiles().pipe(
          map(tiles => loadTilesSuccess({ tiles })),
          catchError(error => of(loadTilesFailure({ error: error.message })))
        )
      )
    )
  );
}
```

**4. Selectors — memoized state projections:**
```typescript
// State slice accessor (feature selector)
export const selectDashboardState = createFeatureSelector<DashboardState>('dashboard');

// Derived data (memoized — only recomputes when inputs change)
export const selectAllTiles = createSelector(
  selectDashboardState,
  state => state.tiles
);

export const selectLoadingState = createSelector(
  selectDashboardState,
  state => state.loading
);

// Composed selectors — memoized combination
export const selectActiveTiles = createSelector(
  selectAllTiles,
  tiles => tiles.filter(t => t.active)  // only re-runs when selectAllTiles result changes
);

// Selector with props (Angular 15+ recommends factory selectors)
export const selectTileById = (id: string) => createSelector(
  selectAllTiles,
  tiles => tiles.find(t => t.id === id)
);
```

**5. Store registration — root and feature:**
```typescript
// Root (app-level)
@NgModule({
  imports: [
    StoreModule.forRoot({ router: routerReducer }),
    EffectsModule.forRoot([]),  // root effects (usually empty)
    StoreDevtoolsModule.instrument({ maxAge: 25 }),  // Redux DevTools
  ]
})
export class AppModule {}

// Feature (lazy-loaded module) — state loaded lazily with the module
@NgModule({
  imports: [
    StoreModule.forFeature('dashboard', dashboardReducer),
    EffectsModule.forFeature([DashboardEffects]),
  ]
})
export class DashboardModule {}
```

### Memoized Selectors — Performance Key

Selectors use referential equality (`===`) to check inputs. If a selector's input hasn't changed (same object reference), the projection function is not re-called — the cached result is returned. This means:

- **OnPush components** subscribing to selectors only trigger CD when the selector actually returns a new value
- **Derived computations** (sorting, filtering, aggregating tiles) only re-run when the relevant state slice changes
- **Selector chains** propagate memoization — if a parent selector result didn't change, no child selector recomputes

```
State update: { tiles: [...same ref...], loading: true }
→ selectAllTiles: same input (tiles ref unchanged) → cached result returned
→ selectActiveTiles: same input → cached result returned
→ Component observing selectActiveTiles: no emission → no CD triggered
→ DOM: no update needed
```

### Architecture: Feature Store Pattern

```
store/
  dashboard/
    dashboard.actions.ts
    dashboard.reducer.ts
    dashboard.effects.ts
    dashboard.selectors.ts
    dashboard.state.ts    ← interface only
  index.ts               ← barrel export
```

Feature state is only loaded into the store when the lazy-loaded module loads. This means the dashboard's state slice doesn't exist in the store until the user navigates to the dashboard route — zero memory overhead for unused features.

### Performance Implications

- **Selector memoization:** Critical at SAP with 200+ tile state — selectors prevented re-derivation of computed tile lists on every unrelated state update
- **OnPush + `store.select()`:** The async pipe subscribes to the selector Observable; OnPush only triggers CD when the selector emits a new value. This combination means Angular only renders when data actually changes.
- **Action replay (time travel):** Redux DevTools can replay actions to reproduce bugs exactly. At SAP: reproduced a race condition between `loadTilesSuccess` and `setFilter` actions by replaying action sequence.
- **Effects isolation:** Side effects are NOT in components — components are pure view logic. Effects are testable in isolation from both components and HTTP services.

### ⚠️ Anti-Patterns & Pitfalls

- **Dispatching from selectors** — Selectors observe state; they should never trigger actions. This creates circular flows.
- **Calling `store.select()` without `async` pipe (forgetting teardown)** — Store selectors return Observables; they need unsubscription just like any other Observable. Always use `async` pipe or `takeUntilDestroyed`.
- **Mutation in reducers** — `state.tiles.push(newTile)` instead of `[...state.tiles, newTile]` — NgRx trusts `===` comparisons; mutating breaks change detection and selector memoization.
- **Business logic in reducers** — Reducers calculate next state; they should not call services, perform HTTP, or contain branching business logic. That goes in Effects.
- **Overusing NgRx for local component state** — If state is only used in one component, a signal or local `BehaviorSubject` is simpler. NgRx for shared, global-ish application state.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP BI Dashboard, tile layout configuration, active filters, user preferences, and data refresh state were in 8 separate services. Race conditions caused tiles to show stale data after filter changes. I migrated to NgRx feature state — one state slice for the dashboard, Actions for all state transitions, Effects for API calls. Race conditions disappeared because Effects used `switchMap` for filter-driven data loads (new filter cancels old request), and state updates were serialized through the reducer. The Redux DevTools let us replay the exact action sequence that produced a bug in a customer demo — fixed in 30 minutes instead of a 3-day war room.

At Oracle, we used NgRx for a record management SPA — `loadRecord`, `loadRecordSuccess`, `saveRecord`, `saveRecordSuccess`, `saveRecordFailure` actions. Effects handled optimistic updates: `saveRecord` immediately updated state with the new value while the HTTP call was pending; on failure, `saveRecordFailure` rolled back to the previous value.

**At FAANG scale:**
- **Microsoft (Azure Portal):** NgRx powers blade state management — each blade type has a feature state slice, lazy-loaded with the blade module. DevTools integration lets Portal team debug customer-reported state issues by sharing action sequences (serializable).
- **Adobe (Frame.io):** NgRx with Entity Adapter for asset collections — thousands of assets in normalized state, entity CRUD operations via standard adapter methods, selectors for filtered/sorted views
- **Salesforce (Tableau):** NgRx for dashboard filter state — global filters affect multiple embedded visualizations; dispatching a filter action propagates to all chart components subscribed to the filter selector
- **Cisco (WebEx):** Meeting participant state in NgRx — participant join/leave/mute/promote actions, participant list selector feeds participant panel component with OnPush; 100-participant meetings render smoothly because selector memoization prevents re-renders for unrelated state changes

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "NgRx is Redux for Angular. The core insight is that global mutable state managed ad-hoc across services at scale leads to race conditions and unpredictable state — NgRx solves this with unidirectional data flow: Actions describe events, Reducers produce next state as a pure function, Selectors read state with memoization, and Effects handle side effects like HTTP calls and then dispatch result actions.
>
> The pieces I care most about in interviews are: reducer immutability — you must always return a new object, never mutate, because NgRx relies on reference equality; selector memoization — a selector only recomputes if its input reference changed, which pairs perfectly with OnPush components to prevent unnecessary re-renders; and Effects using `exhaustMap` vs `switchMap` depending on whether you need to cancel or queue — `switchMap` for searches/filters, `exhaustMap` for mutations like saves.
>
> Feature state is loaded lazily with lazy-loaded routing modules — the dashboard state slice doesn't exist until the user navigates to the dashboard. At SAP, we had 200+ tiles; NgRx feature state + memoized selectors + OnPush dropped our change detection cycle time from the baseline."

### Likely Follow-up Questions

1. **When would you NOT use NgRx?** → Single-component state (use signals/local BehaviorSubject), small applications (boilerplate cost exceeds benefit), or when state is entirely server-side (NgRx Signal Store or simpler service + observable). NgRx shines for cross-feature shared state and when time-travel debugging has clear value.
2. **How does NgRx handle optimistic updates?** → Dispatch an action updating state immediately before the HTTP call completes in the Effect. The Effect dispatches a rollback action (`catchError`) that restores previous state if the request fails.
3. **What's the difference between `createEffect` and `@Effect`?** → `@Effect` was the pre-NgRx v8 decorator; `createEffect` is the current function-based API. `createEffect` provides type safety and is easier to test; `@Effect` is deprecated.
4. **How do you test Effects?** → Use `provideMockActions(actions$)` and pass Action sequences directly. Assert on dispatched Actions using a spy on `store.dispatch` or by subscribing to the Effect's resulting Observable.

### vs Alternatives

| NgRx | Akita | Signal Store (NgRx v17+) | Service + BehaviorSubject |
|---|---|---|---|
| Full Redux — boilerplate heavy | Less boilerplate, not Redux | Lightweight, composable | Minimal — good for simple cases |
| Best for large teams/apps | Good for mid-size apps | Best for new Angular 17+ apps | Best for small/simple state |
| Excellent DevTools | ok DevTools | Signal-native | No DevTools |
| Topic 76 covers this trade-off in depth | | | |

### How to Signal Senior Thinking

> "The architectural signal for NgRx mastery is treating Actions as events — not commands. An Action like `[Dashboard] Load Tiles` names what happened; the component doesn't need to know what the Effect will do with it. This event-driven thinking means you can add a new Effect (e.g., analytics tracking) reacting to the same action without touching the component that dispatched it. It's the Open/Closed Principle applied to state management."

---

## 💻 5. Code Example

```typescript
// ========================
// State Interface
// ========================
// dashboard.state.ts
export interface DashboardState {
  tiles: Tile[];
  selectedTileId: string | null;
  loading: boolean;
  error: string | null;
}

// ========================
// Actions
// ========================
// dashboard.actions.ts
import { createAction, props } from '@ngrx/store';

export const DashboardActions = {
  loadTiles: createAction('[Dashboard] Load Tiles'),
  loadTilesSuccess: createAction('[Dashboard] Load Tiles Success', props<{ tiles: Tile[] }>()),
  loadTilesFailure: createAction('[Dashboard] Load Tiles Failure', props<{ error: string }>()),
  selectTile: createAction('[Dashboard] Select Tile', props<{ tileId: string }>()),
  clearSelection: createAction('[Dashboard] Clear Selection'),
};

// ========================
// Reducer
// ========================
// dashboard.reducer.ts
import { createReducer, on } from '@ngrx/store';

export const dashboardReducer = createReducer(
  { tiles: [], selectedTileId: null, loading: false, error: null } as DashboardState,

  on(DashboardActions.loadTiles, state => ({
    ...state, loading: true, error: null
  })),

  on(DashboardActions.loadTilesSuccess, (state, { tiles }) => ({
    ...state, tiles, loading: false  // new reference for tiles array
  })),

  on(DashboardActions.loadTilesFailure, (state, { error }) => ({
    ...state, error, loading: false
  })),

  on(DashboardActions.selectTile, (state, { tileId }) => ({
    ...state, selectedTileId: tileId
  })),

  on(DashboardActions.clearSelection, state => ({
    ...state, selectedTileId: null
  }))
);

// ========================
// Selectors
// ========================
// dashboard.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';

const selectDashboard = createFeatureSelector<DashboardState>('dashboard');

export const DashboardSelectors = {
  tiles: createSelector(selectDashboard, s => s.tiles),
  loading: createSelector(selectDashboard, s => s.loading),
  error: createSelector(selectDashboard, s => s.error),

  // Memoized derived selector — only recomputes when tiles reference changes
  activeTiles: createSelector(
    createSelector(selectDashboard, s => s.tiles),
    tiles => tiles.filter(t => t.active)
  ),

  // Parameterized selector factory
  tileById: (id: string) => createSelector(
    createSelector(selectDashboard, s => s.tiles),
    tiles => tiles.find(t => t.id === id) ?? null
  ),

  selectedTile: createSelector(
    selectDashboard,
    (s): Tile | null => s.tiles.find(t => t.id === s.selectedTileId) ?? null
  ),
};

// ========================
// Effects
// ========================
// dashboard.effects.ts
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable()
export class DashboardEffects {
  constructor(
    private actions$: Actions,
    private tilesService: TilesService,
    private analyticsService: AnalyticsService
  ) {}

  // HTTP side effect
  loadTiles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadTiles),
      exhaustMap(() =>                         // drop new requests while pending
        this.tilesService.getTiles().pipe(
          map(tiles => DashboardActions.loadTilesSuccess({ tiles })),
          catchError(error =>
            of(DashboardActions.loadTilesFailure({ error: error.message }))
          )
        )
      )
    )
  );

  // Non-dispatching effect: analytics tracking
  trackTileSelection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.selectTile),
      tap(({ tileId }) => this.analyticsService.track('tile_selected', { tileId }))
    ),
    { dispatch: false }  // ← doesn't dispatch a result action
  );
}

// ========================
// Component usage
// ========================
// dashboard.component.ts
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="loading$ | async">
      <app-spinner />
    </ng-container>

    <app-tile
      *ngFor="let tile of tiles$ | async; trackBy: trackByTileId"
      [tile]="tile"
      (click)="selectTile(tile.id)"
    />
  `,
})
export class DashboardComponent implements OnInit {
  tiles$ = this.store.select(DashboardSelectors.tiles);
  loading$ = this.store.select(DashboardSelectors.loading);

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(DashboardActions.loadTiles());
  }

  selectTile(tileId: string): void {
    this.store.dispatch(DashboardActions.selectTile({ tileId }));
  }

  trackByTileId = (_: number, tile: Tile) => tile.id;
}

// ========================
// Feature module registration
// ========================
// dashboard.module.ts (feature module, lazy-loaded)
@NgModule({
  imports: [
    StoreModule.forFeature('dashboard', dashboardReducer),
    EffectsModule.forFeature([DashboardEffects]),
  ]
})
export class DashboardModule {}
```

---

## 🧠 6. Memory Aid

**Mental Model:** NgRx is a post office for state. Components **mail** Actions (events). Effects **route and process** packages with side effects. Reducers **sort mail** into the correct state slots. Selectors are **PO box windows** where components pick up exactly the state they subscribed to — no need to open the whole mailroom.

**If you go blank:** "Actions describe events → Reducers produce next state (pure, immutable) → Selectors read state (memoized) → Effects handle side effects and dispatch new actions. One-way flow: dispatch → reducer → state → selector → component."

**Mnemonic:** **ARSE** — **A**ctions, **R**educers, **S**electors (read), **E**ffects (side effects). The store routes everything.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Correctness: Unidirectional data flow with serializable, pure-function state transitions eliminates entire categories of race conditions and debugging nightmares that emerge from ad-hoc mutable service state
→ Developer experience: Redux DevTools time travel and action replay allow precise reproduction of state bugs from production — at SAP, a race condition reproducible only in demos was pinpointed in 30 minutes using action replay
→ Scalability: Feature state loads lazily, selector memoization bounds re-computation cost, Effects decouple side effects from components — all patterns that only become valuable at scale (10+ developers, 50+ features)

**How it works (3 sentences):**
NgRx implements the Redux pattern for Angular — Actions are plain serializable event objects dispatched from components, Reducers are pure functions `(state, action) => newState` that produce the next immutable state, and Selectors use memoization (input reference equality) to efficiently derive and cache computed state projections for component consumption. Effects are `createEffect`-registered streams that listen to the Actions Observable via `ofType`, perform HTTP calls or other side effects, and dispatch result Actions back into the store — cleanly separating side effects from both components and reducers. The entire system integrates with Angular's OnPush change detection via `async` pipe on `store.select()` — components only re-render when the selected state slice actually changes, achieved through selector memoization and reference equality.

**Company relevance:**
- Microsoft: Azure Portal feature blades use NgRx feature state — lazy-loaded with blade routing module, DevTools integration allows Portal support team to share serializable action sequences for remote debugging of customer-reported issues
- Adobe: Frame.io uses NgRx Entity Adapter (Topic 74) for asset state at thousands-of-asset scale — normalized state eliminates array find/filter in selectors; connector between Effects and asset upload service handles optimistic updates with rollback on failure
- Salesforce: Tableau dashboard filter state in NgRx — single filter action propagates through memoized selectors to all chart components; adding a new filter consumer requires no changes to filter dispatch logic (Open/Closed principle via reactive selectors)
- Cisco: Meeting participant state management in NgRx — join/leave/mute/promote are all Actions; participant list selector feeds OnPush participant panel; 100-participant meetings render at 60fps because selector memoization prevents re-renders for non-participant-list state changes (audio level, chat, etc.)

---
✅ Topic 73/486 complete → Continuing to Topic 74: NgRx Entity Adapter
