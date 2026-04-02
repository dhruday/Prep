# 76. Akita vs NgRx vs Signal Store — Trade-offs
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

The three main Angular state management options differ primarily in boilerplate, learning curve, and reactivity model. NgRx is full Redux — maximum structure, boilerplate, and DevTools power, best for large cross-functional teams. Akita is OOP-based with stores and queries, far less boilerplate than NgRx, good for mid-size apps. NgRx Signal Store (v17+) is the modern choice — composable features, signal-native, minimal boilerplate, integrates with Angular's new reactivity model. My selection criteria: team size, need for time-travel debugging, and whether the app is new (favour Signal Store) or maintaining existing NgRx (stay with NgRx unless doing full refactor).

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Decision Landscape

**Why this question matters in interviews:** It's a proxy for architectural judgment — can you evaluate trade-offs beyond "NgRx is the Angular state management library" and make a defensible recommendation for a specific context?

### NgRx (Redux for Angular) — v18

**Architecture:** Actions → Reducers → State → Selectors → Effects (complete Redux cycle)

**Boilerplate footprint per feature:**
```
dashboard/
  dashboard.actions.ts      ← createAction() for each event
  dashboard.reducer.ts      ← createReducer() with on() handlers
  dashboard.effects.ts      ← createEffect() for each side effect
  dashboard.selectors.ts    ← createSelector() chains
  dashboard.state.ts        ← state interface
```
**Minimum per-feature:** ~5 files, 100-200 LOC for a CRUD feature

**Strengths:**
- Redux DevTools (time travel, action replay, import/export state snapshots)
- Predictable, serializable state — every state transition is an action in a log
- Pattern enforcement — reducers must be pure, effects must be isolated
- Ecosystem: `@ngrx/entity`, `@ngrx/data`, `@ngrx/router-store`, `@ngrx/component-store`
- Best DevTools of any option — critical for complex bugs

**Weaknesses:**
- Boilerplate: 5 files and 150 LOC for a CRUD feature is overhead for small features
- Steep learning curve (Actions, Reducers, Effects, Selectors, Effects, ofType, createFeatureSelector...)
- Over-engineered for local component state
- Not signal-native — requires `store.select()` + `async` pipe

**When to choose NgRx:**
- Large team (10+ frontend developers)
- Complex cross-feature shared state (cart + inventory + user + orders all interact)
- Time-travel debugging has clear product value (financial transactions, audit trails)
- Existing NgRx codebase
- Redux DevTools required by QA or prod debugging workflow

### Akita — v8+

**Architecture:** Store (entity or simple) + Query (selector) + Service (effects)

```typescript
// Akita reduces boilerplate significantly
@Injectable({ providedIn: 'root' })
export class TilesStore extends EntityStore<TilesState, Tile> {
  constructor() { super({ loading: false }); }
}

@Injectable({ providedIn: 'root' })
export class TilesQuery extends QueryEntity<TilesState, Tile> {
  loading$ = this.select(s => s.loading);
  activeTiles$ = this.selectAll({ filterBy: t => t.active });
}

@Injectable({ providedIn: 'root' })
export class TilesService {
  constructor(private store: TilesStore, private http: HttpClient) {}

  loadTiles(): void {
    this.store.setLoading(true);
    this.http.get<Tile[]>('/api/tiles').subscribe(tiles => {
      this.store.set(tiles);          // EntityStore has built-in CRUD
      this.store.setLoading(false);
    });
  }
}
```

**Strengths:**
- ~70% less boilerplate than NgRx for the same feature
- OOP style — familiar to Java/Spring developers (Hruday's background)
- Entity store built-in (like NgRx Entity but out of the box)
- Good DevTools (Akita DevTools plugin)
- Observable-based (`selectAll()` returns Observable)

**Weaknesses:**
- Mixes service concerns with state (service directly calls `store.set()` — less strict separation)
- Less ecosystem support than NgRx
- Not signal-native
- OOP style mixes with functional Angular patterns inconsistently
- Less community adoption, less momentum since NgRx Signal Store arrival

**When to choose Akita:**
- Mid-size team (3–8 developers)
- Coming from OOP background, Redux pattern feels foreign
- Need less boilerplate but still want QueryEntity selectors
- New Angular 14–16 project where Signal Store wasn't available yet
- Rarely chosen for new projects in 2024+ (Signal Store has replaced most use cases)

### NgRx Signal Store (v17+) — The Modern Choice

**Architecture:** Composable `signalStore()` with `withState()`, `withComputed()`, `withMethods()`, `withHooks()`, `withEntities()`

```typescript
export const TilesStore = signalStore(
  { providedIn: 'root' },

  withState<TilesState>({
    tiles: [],
    loading: false,
    selectedTileId: null,
  }),

  withComputed(({ tiles }) => ({
    activeTiles: computed(() => tiles().filter(t => t.active)),
    tileCount: computed(() => tiles().length),
  })),

  withMethods((store, tilesService = inject(TilesService)) => ({
    loadTiles(): void {
      patchState(store, { loading: true });
      tilesService.getTiles().subscribe(tiles =>
        patchState(store, { tiles, loading: false })
      );
    },
    selectTile(id: string): void {
      patchState(store, { selectedTileId: id });
    },
  })),

  withHooks({
    onInit(store) { store.loadTiles(); },   // lifecycle hooks
    onDestroy(store) { /* cleanup */ },
  })
);
```

**In a component:**
```typescript
@Component({ standalone: true })
export class TilesComponent {
  tiles = inject(TilesStore);
  // tiles.activeTiles() — direct signal access
  // tiles.loadTiles() — direct method call
  // No store.dispatch(), no ofType(), no createEffect()
}
```

**Strengths:**
- Signal-native — computed(), state values are signals, works with zoneless CD
- Minimal boilerplate — one file per store, composable features
- `withEntities()` for entity management (like NgRx Entity)
- `patchState()` is type-safe partial state updates
- Extensible via feature composition (withLogging, withDevtools, etc.)
- Excellent TypeScript inference — all state properties are typed signals automatically

**Weaknesses:**
- No time-travel debugging (no actions log by default — can add via `withDevtools`)
- Newer — less community patterns established
- `withDevtools()` (NgRx DevTools integration) is a plugin, not built-in
- Not a drop-in replacement for NgRx — significant migration effort

**When to choose Signal Store:**
- New Angular 17+ project
- Team comfortable with signals
- Want minimal boilerplate with signal-native reactivity
- Don't require Redux DevTools time-travel (or can add `withDevtools` plugin)
- Replacing Akita in mid-size projects

### Component Store (`@ngrx/component-store`)

Worth mentioning as a fourth option — local state per component instance, not global:

```typescript
@Component({...})
export class TileDetailComponent extends ComponentStore<TileDetailState> {
  readonly tile$ = this.select(s => s.tile);
  readonly loadTile = this.effect<string>(tileId$ =>
    tileId$.pipe(switchMap(id => this.api.getTile(id)))
  );
}
```

**Use when:** State is specific to one component instance, doesn't need to be shared globally, and you want effect patterns within the component without a global store entry.

### Decision Matrix

| Criterion | NgRx | Akita | Signal Store | ComponentStore |
|---|---|---|---|---|
| **Boilerplate** | High | Medium | Low | Low |
| **Learning curve** | Steep | Moderate | Gentle | Moderate |
| **Team size** | 10+ | 3–8 | Any | 1–3 |
| **DevTools** | Excellent | Good | Plugin | None |
| **Signal-native** | No (adapters) | No | Yes | No |
| **Zoneless compat** | Partial | No | Yes | Partial |
| **Ecosystem** | Large | Medium | Growing | NgRx ecosystem |
| **Entity support** | @ngrx/entity | Built-in | withEntities() | No |
| **Time travel** | Yes | Partial | Plugin | No |
| **New project 2024+** | If team knows NgRx | Rarely | Recommended | For local state |

### ⚠️ Anti-Patterns

- **Over-engineering with NgRx for simple features** — A todo list app doesn't need 5 files per feature. Right-size your state management choice to the problem.
- **Migrating NgRx → Akita or vice versa without a clear benefit** — State management migrations are expensive. Only migrate if there's measurable developer productivity or runtime performance gain.
- **Not adding DevTools to Signal Store** — If debugging complex state bugs, add `withDevtools()` from `@ngrx/signals`. Missing action history makes debugging harder.
- **Using global store for form state** — Form state (draft values, validation errors) is transient, component-local state. Don't pollute the global store with form state — use reactive forms or `model()` signal.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, we chose NgRx for the BI dashboard because of time-travel debugging — the team needed to reproduce complex multi-step dashboard configuration bugs that only appeared after a specific sequence of actions. The Redux DevTools action replay was the deciding factor, not developer productivity. I documented the trade-off explicitly: NgRx added ~2 days of per-feature boilerplate, but the debugging capability paid for itself in the first sprint when we replayed a customer's exact action sequence to reproduce a production bug.

At Bosch, the team initially used Akita for the real-time monitoring widgets. When we upgraded to Angular 17, the recommendation was to migrate new features to Signal Store — less boilerplate, signal-native for the OnPush + zoneless path. We maintained Akita in legacy widgets and used Signal Store in new ones, with `toObservable()` bridging the two where needed.

**At FAANG scale:**
- **Microsoft:** Azure Portal uses NgRx per blade type — established before Signal Store existed; migration cost wouldn't be justified; continues with NgRx + Entity Adapter
- **Adobe:** Creative Cloud browser apps use NgRx for cross-app state (shared assets, user profile, permissions) and Signal Store for per-panel local state (tool options, canvas state)
- **Salesforce:** Internal tool teams adopting Signal Store for new Angular 17+ projects; existing platforms (Tableau, Marketing Cloud) maintain NgRx
- **Cisco:** WebEx new UI features (Angular 18) use Signal Store; legacy meeting management (Angular 14) maintains NgRx; shared participant state exposed via `toObservable()` bridge

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "My decision framework starts with three questions: What's the team size? Do you need time-travel debugging? Is this a new project or maintenance on an existing codebase?
>
> If the team is large with complex cross-feature state and you need Redux DevTools time-travel — NgRx. If it's a new Angular 17+ project where the team is comfortable with signals — Signal Store: lower boilerplate, signal-native, no zone dependency, composable via feature functions. If you're on Angular 14–16 with a team coming from OOP backgrounds — Akita is a gentler introduction to reactive state than NgRx's Redux ceremony.
>
> There's also `@ngrx/component-store` for component-local state — when state is specific to one component instance and doesn't need to be shared globally.
>
> At SAP, I chose NgRx specifically because of time-travel debugging — for a dashboard with complex multi-step state sequences, action replay was worth the boilerplate cost. At Bosch, new Angular 17 features went to Signal Store."

### Likely Follow-up Questions

1. **How would you migrate NgRx to Signal Store?** → Incremental: new features in Signal Store, existing features stay in NgRx. Bridge with `toObservable()` where needed. Schedule full migration per feature in calm sprints, not during feature development. Migration isn't required — NgRx and Signal Store coexist fine.
2. **What's wrong with just using services + BehaviorSubject?** → Nothing, for small apps. At scale: no DevTools, no action log, no enforced immutability, no standardized pattern → leads to ad-hoc state with competing setters, race conditions, and no debug history. The value of any state management library is pattern enforcement, not just functionality.
3. **What is `patchState` in Signal Store?** → A type-safe partial state update function: `patchState(store, { loading: true })` — shallow-merges the provided partial state into the current store state; doesn't require a full replacer function like a reducer.
4. **Can NgRx and Signal Store coexist in the same app?** → Yes. Many Angular teams run NgRx for established features and Signal Store for new features. They're separate state containers — no interference, bridged via `toObservable()`/`toSignal()` where data sharing is needed.

### How to Signal Senior Thinking

> "State management is an architectural decision, not a framework popularity contest. I always document the trade-off: NgRx's boilerplate is a tax on developer velocity that you pay in exchange for DevTools currency you can spend on debugging difficult bugs. Signal Store trades DevTools sophistication for developer velocity and signal-native performance. Akita is the middle ground that's losing relevance as Signal Store matures. The right choice depends on where your team's biggest cost is — debugging or development speed."

---

## 💻 5. Code Example

```typescript
// ========================
// OPTION 1: NgRx (Redux style — full boilerplate)
// ========================
// actions
export const loadTiles = createAction('[Tiles] Load');
export const loadTilesSuccess = createAction('[Tiles] Load Success', props<{ tiles: Tile[] }>());
// reducer, effects, selectors — see Topic 73

// ========================
// OPTION 2: Akita (OOP style)
// ========================
interface TilesState extends EntityState<Tile> {
  loading: boolean;
}

@Injectable({ providedIn: 'root' })
export class TilesStore extends EntityStore<TilesState, Tile> {
  constructor() { super({ loading: false }); }
}

@Injectable({ providedIn: 'root' })
export class TilesQuery extends QueryEntity<TilesState, Tile> {
  constructor(protected store: TilesStore) { super(store); }
  loading$ = this.select(s => s.loading);
  activeTiles$ = this.selectAll({ filterBy: t => t.active });
}

@Injectable({ providedIn: 'root' })
export class TilesService {
  constructor(
    private store: TilesStore,
    private http: HttpClient
  ) {}

  loadTiles(): void {
    this.store.setLoading(true);
    this.http.get<Tile[]>('/api/tiles').pipe(
      catchError(err => { this.store.setError(err); return of([]); })
    ).subscribe(tiles => {
      this.store.set(tiles);
      this.store.setLoading(false);
    });
  }
}

// ========================
// OPTION 3: NgRx Signal Store (modern — recommended for new projects)
// ========================
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { withEntities, setAllEntities, addEntity, updateEntity, removeEntity } from '@ngrx/signals/entities';

export interface TilesState {
  loading: boolean;
  selectedTileId: string | null;
  error: string | null;
}

export const TilesSignalStore = signalStore(
  { providedIn: 'root' },

  // Entity management — equivalent to @ngrx/entity EntityAdapter
  withEntities<Tile>(),

  // Additional non-entity state
  withState<TilesState>({
    loading: false,
    selectedTileId: null,
    error: null,
  }),

  // Computed signals — lazily memoized
  withComputed(({ entities, selectedTileId }) => ({
    activeTiles: computed(() => entities().filter(t => t.active)),

    selectedTile: computed(() => {
      const id = selectedTileId();
      return id ? (entities().find(t => t.id === id) ?? null) : null;
    }),

    tileCount: computed(() => entities().length),
  })),

  // Methods — state mutations and async operations
  withMethods((store, tilesService = inject(TilesService)) => ({
    loadTiles(): void {
      patchState(store, { loading: true, error: null });

      tilesService.getTiles().pipe(
        takeUntilDestroyed()  // store lives at root — but methods can use destroyRef too
      ).subscribe({
        next: tiles => patchState(store, setAllEntities(tiles), { loading: false }),
        error: err => patchState(store, { error: err.message, loading: false })
      });
    },

    selectTile(id: string): void {
      patchState(store, { selectedTileId: id });
    },

    updateTileTitle(id: string, title: string): void {
      patchState(store, updateEntity({ id, changes: { title } }));
    },

    removeTile(id: string): void {
      patchState(store, removeEntity(id));
    },
  })),

  withHooks({
    onInit(store) { store.loadTiles(); }
  })
);

// Component — no dispatch, no ofType, no async pipe needed
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
export class TilesComponent {
  private tilesStore = inject(TilesSignalStore);

  // Direct signal access — no subscribe, works with zoneless CD
  tiles = this.tilesStore.activeTiles;     // Signal<Tile[]>
  loading = this.tilesStore.loading;       // Signal<boolean>
  selected = this.tilesStore.selectedTile; // Signal<Tile | null>

  selectTile(id: string): void {
    this.tilesStore.selectTile(id);        // direct method call
  }
}

// ========================
// OPTION 4: ComponentStore (local component state)
// ========================
interface TileDetailState {
  tile: Tile | null;
  saving: boolean;
}

@Injectable()
export class TileDetailStore extends ComponentStore<TileDetailState> {
  constructor() { super({ tile: null, saving: false }); }

  // Selector
  readonly tile$ = this.select(s => s.tile);
  readonly saving$ = this.select(s => s.saving);

  // Effect with side effect
  readonly loadTile = this.effect<string>(tileId$ =>
    tileId$.pipe(
      switchMap(id =>
        inject(TilesService).getTile(id).pipe(
          tapResponse(
            tile => this.patchState({ tile }),
            err => console.error(err)
          )
        )
      )
    )
  );
}

@Component({
  standalone: true,
  providers: [TileDetailStore],  // instance scoped to component
})
export class TileDetailComponent implements OnInit {
  @Input() tileId!: string;
  readonly tile$ = inject(TileDetailStore).tile$;
  ngOnInit() { inject(TileDetailStore).loadTile(this.tileId); }
}
```

---

## 🧠 6. Memory Aid

**Mental Model:** NgRx is a bank vault — maximum security, full audit log, time-travel capable, but requires a security guard (lots of boilerplate) to access anything. Signal Store is a smart wallet — quick access, good security, lightweight. Akita is a conventional wallet — easier than the vault, but showing its age beside the smart wallet.

**Decision rule:**
- "Do we need time-travel debugging?" → **NgRx**
- "New Angular 17+ project?" → **Signal Store**
- "Angular 14–16, team prefers OOP?" → **Akita**  
- "Component-local state only?" → **ComponentStore or signal()**

**Mnemonic:** **NACS** — **N**gRx (full Redux), **A**kita (OOP mid-range), **C**omponentStore (local), **S**ignal Store (modern default).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Architecture: State management choice affects developer velocity for the lifetime of the project — a wrong choice costs months of migration or technical debt
→ Performance: NgRx + observable selectors vs Signal Store + signal-native: Signal Store is the path to zoneless Angular which unlocks 10–15x CD performance headroom at scale
→ Interview signal: A senior/staff candidate who can articulate the trade-offs with specific criteria — team size, DevTools need, project age, signal adoption — demonstrates architectural maturity

**How they compare (3 sentences):**
NgRx implements strict Redux with five building blocks (Actions, Reducers, Effects, Selectors, Store) providing strong pattern enforcement, excellent DevTools with time-travel debugging, and maximum boilerplate overhead — ideal for large teams managing complex cross-feature state where debugging costs justify the ceremony. Akita reduces boilerplate ~70% via OOP-style `EntityStore` and `Query` classes, familiar to developers from Spring/Java backgrounds, but lacks signal-native reactivity and has less momentum as Angular's ecosystem moves toward signals. NgRx Signal Store is the recommended modern choice for Angular 17+ projects — composable feature functions (`withState`, `withComputed`, `withMethods`, `withEntities`), signal-native reactive properties, minimal boilerplate, and full Angular zoneless compatibility, with optional DevTools integration via `withDevtools()`.

**Company relevance:**
- Microsoft: Azure Portal maintains NgRx per blade type (established pre-Signal Store); DevTools action history is critical for the Portal team's customer debugging workflows — support engineers can request action exports from customer sessions
- Adobe: Mixed — Creative Cloud cross-app state in NgRx for its established patterns; new panel state in Signal Store for signal-native performance; Frame.io new features entirely on Signal Store
- Salesforce: New Angular 17+ internal tool projects default to Signal Store; Tableau and Marketing Cloud mature on NgRx; no planned NgRx migration until cost-benefit is clear
- Cisco: WebEx new UI (Angular 18) on Signal Store — meeting control state, participant state, chat; legacy meeting management (Angular 14) stays on NgRx; shared state bridged via `toObservable()` at the boundary between the two systems

---
✅ Topic 76/486 complete → Continuing to Topic 77: OnPush + trackBy
