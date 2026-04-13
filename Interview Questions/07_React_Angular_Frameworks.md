# ⚛️ File 07 — React, Angular & Framework Deep Dives

> **~106 topics** | Angular Architecture & RxJS, React Internals & Hooks, Next.js, Redux, State Management, Data Fetching
> **Hruday D — Senior/Staff Frontend Engineer**

---

## Table of Contents

### Angular & RxJS (FE 59–80)
- **Part A: Angular Architecture (59–62)** — NgModules vs Standalone, DI, Lifecycle Hooks, Router
- **Part B: Angular Change Detection (63–66)** — Default vs OnPush, zone.js, Zoneless Angular, Manual CD
- **Part C: RxJS Mastery (67–72)** — Cold/Hot Observables, Subjects, Flattening Operators, Patterns
- **Part D: Angular State Management (73–76)** — NgRx, Entity Adapter, Signals, Trade-offs
- **Part E: Angular Performance (77–80)** — OnPush+trackBy, Pipes, Lazy Loading, @defer

### React Deep Dive (FE 81–135)
- **Part F: React Internals (81–86)** — Fiber, Reconciliation, Scheduler, Concurrent Mode, Commit vs Render, StrictMode
- **Part G: React Hooks Deep Dive (87–96)** — useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, Concurrent Hooks, Custom Hooks
- **Part H: React 18 & 19 Features (97–103)** — Batching, Suspense, RSC, use(), Server Actions, Compiler, Activity API
- **Part I: React Patterns (104–110)** — Compound, Render Props, HOC, Container/Presentational, Controlled/Uncontrolled, Error Boundaries, Portals
- **Part J: Redux & Redux Toolkit (111–117)** — Core, RTK, RTK Query, Middleware, Normalised State, DevTools, When Not to Use
- **Part K: Next.js App Router (118–127)** — App vs Pages, Server/Client Components, Layouts, Data Fetching, Route Handlers, Middleware, Optimisation, Streaming, Parallel Routes, Caching
- **Part L: React Performance Patterns (128–135)** — Re-render Rules, React.memo, Key Prop, Windowing, Code Splitting, Profiling

### State Management (FE 136–148)
- **Part M: State Fundamentals (136–139)** — Local, Global, Prop Drilling, Derived State
- **Part N: State Tools & Patterns (140–145)** — Redux/Zustand/Signals, Server vs Client State, TanStack Query, XState, URL as State
- **Part O: State at Scale (146–148)** — Normalization, Over-Global State, Performance Impact

### Data Fetching & API Design (FE 149–164)
- **Part P: API Consumption (149–151)** — REST, GraphQL, tRPC
- **Part Q: Lists & Pagination (152–155)** — Pagination, Infinite Scroll, Cursor vs Offset, Debounce/Throttle
- **Part R: Advanced Data Patterns (156–164)** — Parallel/Sequential, Optimistic UI, Error/Retry, Contracts, Dedup, Rate Limiting, Circuit Breaker, Degradation, Skeleton Loaders

---

# Part A — Angular Architecture (Topics 59–62)

---

## 59. NgModules vs Standalone Components (Angular 14+)

### Q: What are Standalone Components and why are they replacing NgModules?

**Answer (Interview-Ready):**

| Aspect | NgModules | Standalone Components |
|--------|-----------|----------------------|
| **Boilerplate** | High — every component needs a module declaration | Low — component declares its own imports |
| **Tree-shaking** | Module-level (entire module included if one component used) | Component-level (only imported components bundled) |
| **Learning curve** | Complex (declarations, imports, exports, providers) | Simple (just a component with imports) |
| **Lazy loading** | Route loads entire NgModule | Route loads single component |

**NgModule approach (legacy):**
```ts
@NgModule({
  declarations: [UserComponent, UserListComponent],
  imports: [CommonModule, FormsModule],
  exports: [UserComponent]
})
export class UserModule {}
```

**Standalone approach (modern):**
```ts
@Component({
  standalone: true,
  selector: 'app-user',
  imports: [CommonModule, FormsModule, UserListComponent],
  template: `<app-user-list [users]="users" />`
})
export class UserComponent {
  users = signal<User[]>([]);
}
```

**Migration strategy:** Angular provides `ng generate @angular/core:standalone` schematic for automated migration.

**Follow-ups:**
- Can you mix standalone and module-based components? → Yes, standalone can be imported into NgModules and vice versa
- How does lazy loading differ? → `loadComponent` instead of `loadChildren` with module

🔥 **Most Asked**: Why standalone? Tree-shaking benefits, migration strategy
🧠 **Strategy**: "Standalone reduces boilerplate and improves tree-shaking. Import dependencies at component level instead of module level"

---

## 60. Dependency Injection — Hierarchical Injectors, Tokens

### Q: How does Angular's Dependency Injection system work?

**Answer (Interview-Ready):**

**Injector hierarchy:**
```
NullInjector (throws error if not found)
  └── PlatformInjector (platform-level services)
      └── RootInjector (providedIn: 'root' — singleton for entire app)
          └── ModuleInjector (per lazy-loaded module)
              └── ElementInjector (per component/directive)
```

**Resolution order:** Angular walks UP the element injector tree first, then UP the module injector tree.

**Providing services:**
```ts
// 1. Root-level singleton (most common)
@Injectable({ providedIn: 'root' })
export class AuthService {}

// 2. Component-level (new instance per component)
@Component({
  providers: [LoggerService]  // Each component gets its own instance
})

// 3. InjectionToken for non-class values
const API_URL = new InjectionToken<string>('API_URL');
// Provide:
{ provide: API_URL, useValue: 'https://api.example.com' }
// Inject:
constructor(@Inject(API_URL) private apiUrl: string) {}

// 4. useFactory for dynamic creation
{ provide: HttpClient, useFactory: (config: Config) => createClient(config), deps: [Config] }
```

**Key concepts:**
- `@Optional()` — don't throw if not found
- `@Self()` — only look in current component's injector
- `@SkipSelf()` — skip current, start from parent
- `@Host()` — stop search at host component boundary

🔥 **Most Asked**: Injector hierarchy, providedIn root vs component, InjectionToken
🧠 **Strategy**: "Hierarchical injectors walk up from element → module → root. providedIn root = singleton. Component providers = per-instance"

---

## 61. Component Lifecycle Hooks — All 8 Hooks & When to Use

### Q: Explain all Angular lifecycle hooks and their order.

**Answer (Interview-Ready):**

**Execution order:**
```
constructor()              → DI happens here (no DOM yet)
ngOnChanges()              → Input property changes (first call before ngOnInit)
ngOnInit()                 → Component initialized (inputs available, DOM not yet)
ngDoCheck()                → Every change detection cycle
ngAfterContentInit()       → After <ng-content> projected content initialized
ngAfterContentChecked()    → After every check of projected content
ngAfterViewInit()          → After component's view + child views initialized (DOM ready)
ngAfterViewChecked()       → After every check of view + child views
ngOnDestroy()              → Cleanup: unsubscribe, detach listeners
```

**When to use each:**
| Hook | Use Case |
|------|----------|
| `ngOnInit` | Fetch data, initialize logic (most common) |
| `ngOnChanges` | React to @Input changes (has `SimpleChanges` parameter) |
| `ngAfterViewInit` | Access `@ViewChild`, interact with DOM |
| `ngAfterContentInit` | Access `@ContentChild` (projected content) |
| `ngOnDestroy` | Unsubscribe observables, clear timers, detach event listeners |
| `ngDoCheck` | Custom change detection (rarely used — performance risk) |

```ts
export class UserComponent implements OnInit, OnChanges, OnDestroy {
  @Input() userId!: string;
  private destroy$ = new Subject<void>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && !changes['userId'].firstChange) {
      this.loadUser(changes['userId'].currentValue);
    }
  }
  ngOnInit() { this.loadUser(this.userId); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
```

🔥 **Most Asked**: Order of hooks, ngOnInit vs constructor, ngOnChanges with SimpleChanges
🧠 **Strategy**: "Constructor for DI only. ngOnInit for initialization. ngOnDestroy for cleanup. ngOnChanges for reacting to input changes"

---

## 62. Angular Router — Lazy Loading, Guards, Resolvers

### Q: How does Angular routing work with lazy loading, guards, and resolvers?

**Answer (Interview-Ready):**

**Lazy loading:**
```ts
const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
    // Or lazy load a module:
    // loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  }
];
```

**Route Guards:**
| Guard | Purpose |
|-------|---------|
| `canActivate` | Can the user navigate to this route? (auth check) |
| `canDeactivate` | Can the user leave? (unsaved changes warning) |
| `canMatch` | Should this route even be considered? (feature flags) |
| `resolve` | Pre-fetch data before route activates |

**Functional guards (modern Angular):**
```ts
// Auth guard
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

// Usage
{ path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] }
```

**Resolvers (pre-fetch data):**
```ts
export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  return userService.getUser(route.paramMap.get('id')!);
};
// Usage: { path: 'user/:id', component: UserComponent, resolve: { user: userResolver } }
// Access: this.route.data.subscribe(data => data['user'])
```

🔥 **Most Asked**: Lazy loading (loadComponent vs loadChildren), functional guards, canActivate vs canMatch
🧠 **Strategy**: "Lazy load with loadComponent (standalone) or loadChildren (modules). Functional guards with inject(). canMatch for feature-flag routing"

---

# Part B — Angular Change Detection (Topics 63–66)

---

## 63. Default vs OnPush Change Detection

### Q: What is the difference between Default and OnPush change detection strategies?

**Answer (Interview-Ready):**

| Aspect | Default | OnPush |
|--------|---------|--------|
| **Checks** | Every component in tree on every CD cycle | Only when @Input reference changes, event fires, or async pipe emits |
| **Performance** | O(n) — checks all components | O(1) — skips subtree if no trigger |
| **Immutability** | Not required | Required for @Input objects (must create new reference) |
| **Use case** | Small apps, rapid prototyping | Production apps, performance-critical |

**How OnPush works:**
```
Component marked dirty? → Check it
  ├── @Input reference changed (===) → dirty
  ├── DOM event fired inside component → dirty
  ├── async pipe received new value → dirty
  ├── markForCheck() called manually → dirty
  └── None of the above → SKIP entire subtree
```

```ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ user().name }}`
})
export class UserComponent {
  @Input() user!: User;
}

// Parent MUST create new object reference for OnPush to detect:
// ❌ this.user.name = 'New';  → OnPush won't detect
// ✅ this.user = { ...this.user, name: 'New' };  → Detected
```

🔥 **Most Asked**: When to use OnPush, what triggers re-check, immutability requirement
🧠 **Strategy**: "Always use OnPush in prod. Ensure immutable @Input references. Use async pipe for observables"

---

## 64. zone.js — How It Intercepts Async Operations

### Q: What is zone.js and how does Angular use it for change detection?

**Answer (Interview-Ready):**

**zone.js = library that monkey-patches all async browser APIs to notify Angular when async work completes**

**What gets patched:**
- `setTimeout`, `setInterval`, `requestAnimationFrame`
- `Promise.then`, `async/await`
- DOM events (`addEventListener`)
- `XMLHttpRequest`, `fetch`
- `WebSocket` events

**Flow:**
```
User clicks button → zone.js intercepts addEventListener
  → Event handler runs → changes component state
  → zone.js notifies Angular: "async task completed"
  → Angular runs change detection from root
  → DOM updates
```

**NgZone service:**
```ts
constructor(private ngZone: NgZone) {}

// Run OUTSIDE Angular's zone (no CD triggered)
ngZone.runOutsideAngular(() => {
  // Useful for: requestAnimationFrame, mouse tracking, third-party libraries
  setInterval(() => this.updateFps(), 16); // 60fps counter — don't trigger CD
});

// Run INSIDE Angular's zone (manually trigger CD)
ngZone.run(() => {
  this.data = externalLibraryResult;  // Triggers change detection
});
```

🔥 **Most Asked**: What zone.js patches, runOutsideAngular use case, performance impact
🧠 **Strategy**: "zone.js patches async APIs → triggers CD after each. Use runOutsideAngular for high-frequency non-UI operations"

---

## 65. Zoneless Angular — Signal-Based Reactivity

### Q: What is Zoneless Angular and how do Signals enable it?

**Answer (Interview-Ready):**

**Problem with zone.js:**
- Patches every async operation → overhead even for non-UI changes
- Triggers global CD from root → wasteful
- Third-party libraries can trigger unnecessary CD
- Bundle size (~15KB)

**Zoneless approach (Angular 18+):**
```ts
// Bootstrap without zone.js
bootstrapApplication(AppComponent, {
  providers: [provideExperimentalZonelessChangeDetection()]
});
```

**Signals are the replacement:**
```ts
@Component({
  template: `<span>{{ count() }}</span> <button (click)="increment()">+</button>`
})
export class CounterComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2);
  
  increment() {
    this.count.update(v => v + 1);
    // Angular knows EXACTLY which components depend on this signal
    // → Only those components re-render (fine-grained reactivity)
  }
}
```

**zone.js vs Signals CD comparison:**
| Aspect | zone.js | Signals |
|--------|---------|---------|
| Granularity | Entire component tree from root | Only components reading changed signal |
| Trigger | Any async operation | Only when signal value changes |
| Bundle | +15KB (zone.js) | Built into Angular |
| Third-party | Can trigger unwanted CD | No interference |

🔥 **Most Asked**: Why remove zone.js? How signals replace it? Migration path?
🧠 **Strategy**: "Signals provide fine-grained reactivity. Only components reading a changed signal re-render. No global CD sweep"

---

## 66. Manual Change Detection — markForCheck vs detectChanges

### Q: When do you need manual change detection and what are markForCheck vs detectChanges?

**Answer (Interview-Ready):**

| Method | What it does | When to use |
|--------|-------------|-------------|
| `markForCheck()` | Marks component + ancestors dirty. CD runs on next cycle | OnPush component updated outside Angular's awareness (e.g., WebSocket callback) |
| `detectChanges()` | Runs CD immediately on this component + children | Need synchronous DOM update right now |
| `detach()` | Completely removes component from CD tree | Component that rarely changes (real-time charts, rendered once) |
| `reattach()` | Re-adds component to CD tree | When detached component needs updates again |

```ts
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class LiveComponent implements OnInit {
  data: FeedItem[] = [];
  
  constructor(
    private cdr: ChangeDetectorRef,
    private ws: WebSocketService
  ) {}
  
  ngOnInit() {
    // WebSocket callback runs outside Angular's zone
    this.ws.messages$.subscribe(msg => {
      this.data.push(msg);
      this.cdr.markForCheck();  // Tell Angular to re-check this component
    });
  }
}
```

**markForCheck vs detectChanges:**
- `markForCheck()` → async, batched, traverses upward (marks ancestors). Preferred in most cases
- `detectChanges()` → synchronous, runs immediately, checks downward. Use rarely (can cause perf issues)

🔥 **Most Asked**: markForCheck vs detectChanges, when each is needed, detach pattern
🧠 **Strategy**: "Default to markForCheck. Use detectChanges only when you need synchronous DOM update. Detach for rarely-changing components"

---

# Part C — RxJS Mastery (Topics 67–72)

---

## 67. Cold vs Hot Observables

### Q: What is the difference between cold and hot observables?

**Answer (Interview-Ready):**

| | Cold Observable | Hot Observable |
|-|-----------------|----------------|
| **Producer** | Created on subscribe (each subscriber gets its own) | Exists before subscription (shared) |
| **Values** | Each subscriber gets ALL values from start | Late subscribers miss past values |
| **Example** | `of(1,2,3)`, HTTP request, `from()` | WebSocket, mouse events, Subjects |
| **Analogy** | Watching a Netflix movie (starts from beginning) | Live TV broadcast (join where it is) |

```ts
// COLD — each subscriber triggers a new HTTP request
const cold$ = this.http.get('/api/data');
cold$.subscribe(a => ...);  // Request #1
cold$.subscribe(b => ...);  // Request #2 (different!)

// HOT — using share() to multicast
const hot$ = this.http.get('/api/data').pipe(
  shareReplay(1)  // Cache last value, share among subscribers
);
hot$.subscribe(a => ...);  // Request #1
hot$.subscribe(b => ...);  // Gets cached value (no new request)
```

**Converting cold → hot:**
- `share()` — multicast, no replay
- `shareReplay(n)` — multicast + replay last n values to late subscribers
- `publish()` + `connect()` — manual control

🔥 **Most Asked**: Cold vs hot with examples, shareReplay use case, multicasting
🧠 **Strategy**: "Cold = per-subscriber. Hot = shared. Use shareReplay(1) to avoid duplicate HTTP requests"

---

## 68. Subject, BehaviorSubject, ReplaySubject, AsyncSubject

### Q: What are the different Subject types in RxJS and when do you use each?

**Answer (Interview-Ready):**

| Type | Initial Value | Late Subscriber Gets | Use Case |
|------|--------------|---------------------|----------|
| `Subject` | None | Nothing (only future values) | Event bus, multicasting |
| `BehaviorSubject` | Required | Last emitted value immediately | Current state (auth status, theme) |
| `ReplaySubject(n)` | None | Last n values | Chat messages, audit log |
| `AsyncSubject` | None | Only the last value on complete | One-time async result |

```ts
// BehaviorSubject — always has a current value
const auth$ = new BehaviorSubject<User | null>(null);
auth$.next(loggedInUser);  // Update
auth$.value;  // Synchronous access to current value
auth$.subscribe(user => ...);  // Immediately gets current value

// ReplaySubject — replay last N
const messages$ = new ReplaySubject<Message>(50);  // Buffer last 50
messages$.next(msg1); messages$.next(msg2);
// Late subscriber immediately gets msg1, msg2

// Subject — no replay
const click$ = new Subject<MouseEvent>();
click$.subscribe(e => ...);  // Only gets future clicks
```

🔥 **Most Asked**: BehaviorSubject vs Subject, when to use ReplaySubject, sync access with .value
🧠 **Strategy**: "BehaviorSubject for state (has initial value + .value). Subject for events. ReplaySubject for buffered history"

---

## 69. switchMap vs mergeMap vs concatMap vs exhaustMap

### Q: Explain the four RxJS flattening operators with real examples.

**Answer (Interview-Ready):**

| Operator | Behavior | Use Case |
|----------|----------|----------|
| `switchMap` | Cancels previous inner observable when new outer emits | **Search autocomplete** (cancel old request) |
| `mergeMap` | Runs all inner observables concurrently | **Parallel file uploads** |
| `concatMap` | Queues inner observables, runs sequentially | **Sequential form saves** |
| `exhaustMap` | Ignores new outer emissions until current inner completes | **Login button** (prevent double-submit) |

```ts
// switchMap — CANCEL previous (autocomplete)
searchInput$.pipe(
  debounceTime(300),
  switchMap(query => this.http.get(`/search?q=${query}`))
  // User types "ang" → request fires
  // User types "angular" → previous request CANCELLED, new one fires
);

// mergeMap — RUN ALL in parallel (likes on multiple posts)
likeClicks$.pipe(
  mergeMap(postId => this.http.post(`/like/${postId}`, {}))
  // All likes fire simultaneously
);

// concatMap — QUEUE sequentially (ordered writes)
saveActions$.pipe(
  concatMap(data => this.http.put('/save', data))
  // Save #1 completes → then Save #2 → then Save #3
);

// exhaustMap — IGNORE until done (login button)
loginClicks$.pipe(
  exhaustMap(() => this.authService.login(credentials))
  // First click → login request fires
  // Rapid second click → IGNORED (first still in progress)
);
```

🔥 **Most Asked**: This is one of the TOP Angular interview questions. Know all 4 with real examples.
🧠 **Strategy**: "switchMap=cancel, mergeMap=parallel, concatMap=queue, exhaustMap=ignore. Search=switch, Upload=merge, Save=concat, Submit=exhaust"

---

## 70. combineLatest, forkJoin, zip, withLatestFrom

### Q: What are the RxJS combination operators and when do you use each?

**Answer (Interview-Ready):**

| Operator | Emits when | Completes when | Use Case |
|----------|-----------|---------------|----------|
| `combineLatest` | Any source emits (after all emit at least once) | All complete | Dashboard with multiple live streams |
| `forkJoin` | All sources complete | All complete | Parallel API calls (wait for all) |
| `zip` | All sources emit corresponding value | Any completes | Pairing request-response |
| `withLatestFrom` | Primary emits, grabs latest from secondary | Primary completes | Button click + current form value |

```ts
// combineLatest — latest from each (reactive dashboard)
combineLatest([users$, filters$, sort$]).pipe(
  map(([users, filters, sort]) => applyFiltersAndSort(users, filters, sort))
);

// forkJoin — wait for ALL to complete (page load)
forkJoin({
  user: this.http.get('/user'),
  settings: this.http.get('/settings'),
  notifications: this.http.get('/notifications')
}).subscribe(({ user, settings, notifications }) => {
  // All three responses available here
});

// withLatestFrom — click + grab current state
saveButton$.pipe(
  withLatestFrom(formData$),
  map(([click, formData]) => formData)
).subscribe(data => this.save(data));
```

🔥 **Most Asked**: combineLatest vs forkJoin, when to use withLatestFrom
🧠 **Strategy**: "forkJoin=Promise.all (one-time). combineLatest=continuous (any change). withLatestFrom=click + grab latest"

---

## 71. takeUntil Pattern for Memory Leak Prevention

### Q: How do you prevent memory leaks from Observable subscriptions in Angular?

**Answer (Interview-Ready):**

**The problem:** Manual subscriptions that aren't unsubscribed → memory leaks.

**Solution 1: takeUntil (classic pattern):**
```ts
export class MyComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.dataService.getData().pipe(
      takeUntil(this.destroy$)  // Auto-unsubscribe on destroy
    ).subscribe(data => this.data = data);

    this.ws.messages$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(msg => this.messages.push(msg));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Solution 2: async pipe (preferred — no manual subscription):**
```html
<div *ngFor="let item of items$ | async">{{ item.name }}</div>
<!-- async pipe subscribes AND unsubscribes automatically -->
```

**Solution 3: DestroyRef (Angular 16+):**
```ts
export class MyComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.dataService.getData().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => this.data = data);
  }
}
```

**What doesn't need unsubscription:**
- HTTP calls (`HttpClient` — auto-completes)
- `ActivatedRoute.params` (Angular manages lifecycle)
- `async` pipe (auto-unsubscribes)

🔥 **Most Asked**: takeUntil pattern, async pipe, what needs unsubscription
🧠 **Strategy**: "Prefer async pipe. Otherwise takeUntilDestroyed (v16+) or takeUntil with destroy$. HTTP calls auto-complete"

---

## 72. Custom RxJS Operators

### Q: How do you create custom RxJS operators?

**Answer (Interview-Ready):**

**Custom operator = function that takes an Observable and returns an Observable**

```ts
// Custom operator: log values with a tag
function debug<T>(tag: string): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) =>
    source.pipe(
      tap({
        next: val => console.log(`[${tag}] next:`, val),
        error: err => console.error(`[${tag}] error:`, err),
        complete: () => console.log(`[${tag}] complete`)
      })
    );
}

// Usage
data$.pipe(debug('UserData'), filter(x => !!x)).subscribe();
```

**Practical example — retry with exponential backoff:**
```ts
function retryWithBackoff<T>(maxRetries: number): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) =>
    source.pipe(
      retry({
        count: maxRetries,
        delay: (error, retryCount) => timer(Math.pow(2, retryCount) * 1000)
      })
    );
}

// Usage
this.http.get('/api/data').pipe(retryWithBackoff(3)).subscribe();
```

**Practical example — polling:**
```ts
function poll<T>(interval: number): (source: Observable<T>) => Observable<T> {
  return (source) => timer(0, interval).pipe(switchMap(() => source));
}

// Usage
this.http.get('/api/status').pipe(poll(5000)).subscribe();
```

🔥 **Most Asked**: How to write a custom operator, retryWithBackoff, reusable patterns
🧠 **Strategy**: "Custom operator = function returning (source) => source.pipe(...). Compose existing operators"

---

# Part D — Angular State Management (Topics 73–76)

---

## 73. NgRx — Store, Actions, Reducers, Effects, Selectors

### Q: Explain the NgRx architecture and when to use it.

**Answer (Interview-Ready):**

**NgRx = Redux pattern for Angular (unidirectional data flow)**

```
Component → dispatches Action
  → Reducer (pure function) → produces new State
  → Store holds state
  → Selector queries state → Component renders
  
Side effects (API calls):
  Action → Effect (listens for actions, calls APIs)
    → dispatches success/failure Action → Reducer updates state
```

```ts
// Actions
export const loadUsers = createAction('[Users] Load');
export const loadUsersSuccess = createAction('[Users] Load Success', props<{ users: User[] }>());
export const loadUsersFailure = createAction('[Users] Load Failure', props<{ error: string }>());

// Reducer
export const usersReducer = createReducer(
  initialState,
  on(loadUsers, state => ({ ...state, loading: true })),
  on(loadUsersSuccess, (state, { users }) => ({ ...state, loading: false, users })),
  on(loadUsersFailure, (state, { error }) => ({ ...state, loading: false, error }))
);

// Selector
export const selectUsers = createSelector(selectUsersState, state => state.users);
export const selectActiveUsers = createSelector(selectUsers, users => users.filter(u => u.active));

// Effect
loadUsers$ = createEffect(() => this.actions$.pipe(
  ofType(loadUsers),
  exhaustMap(() => this.userService.getAll().pipe(
    map(users => loadUsersSuccess({ users })),
    catchError(error => of(loadUsersFailure({ error: error.message })))
  ))
));

// Component
store.dispatch(loadUsers());
users$ = store.select(selectActiveUsers);
```

🔥 **Most Asked**: Full NgRx flow, when to use effects, selector memoization
🧠 **Strategy**: "NgRx for complex shared state. Actions describe events. Reducers are pure. Effects for side effects. Selectors for derived data"

---

## 74. NgRx Entity Adapter

### Q: What is NgRx Entity and how does it simplify CRUD state?

**Answer (Interview-Ready):**

**Entity Adapter = utility for managing normalized collections (like a mini database)**

```ts
export interface UsersState extends EntityState<User> {
  loading: boolean;
  selectedId: string | null;
}

const adapter = createEntityAdapter<User>({
  selectId: user => user.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});

const initialState: UsersState = adapter.getInitialState({
  loading: false, selectedId: null
});

// Reducer with adapter methods
export const usersReducer = createReducer(
  initialState,
  on(loadUsersSuccess, (state, { users }) => adapter.setAll(users, state)),
  on(addUser, (state, { user }) => adapter.addOne(user, state)),
  on(updateUser, (state, { update }) => adapter.updateOne(update, state)),
  on(deleteUser, (state, { id }) => adapter.removeOne(id, state))
);

// Built-in selectors
const { selectAll, selectEntities, selectIds, selectTotal } = adapter.getSelectors(selectUsersState);
```

**State shape (normalized):**
```json
{
  "ids": ["1", "2", "3"],
  "entities": { "1": { "id": "1", "name": "Alice" }, "2": { ... } },
  "loading": false
}
```

🔥 **Most Asked**: Why normalize? Adapter CRUD methods, built-in selectors
🧠 **Strategy**: "Entity adapter normalizes collections into ids[] + entities{}. Provides addOne, updateOne, removeOne, setAll + built-in selectors"

---

## 75. Angular Signals (v17+) — signal(), computed(), effect()

### Q: How do Angular Signals work and when should you use them vs RxJS?

**Answer (Interview-Ready):**

```ts
// signal — writable reactive value
const count = signal(0);
count();        // Read: 0
count.set(5);   // Write
count.update(v => v + 1);  // Update based on previous

// computed — derived value (auto-tracked, memoized)
const doubled = computed(() => count() * 2);
doubled();  // Always up-to-date, recalculates only when count changes

// effect — side effect when signals change
effect(() => {
  console.log(`Count is ${count()}`);  // Runs when count changes
});
```

**Signals vs RxJS:**
| Aspect | Signals | RxJS |
|--------|---------|------|
| **Sync/Async** | Synchronous (always has a value) | Async streams |
| **Pull/Push** | Pull (read when needed) | Push (values arrive over time) |
| **Operators** | `computed()` for derivation | Rich operator library (map, filter, switchMap...) |
| **Best for** | UI state, simple derivations | HTTP, events, complex async flows |
| **Memory** | Auto-tracked (no manual cleanup) | Need unsubscribe/takeUntil |

**Use both together:**
```ts
// Convert Observable → Signal
const users = toSignal(this.http.get<User[]>('/users'), { initialValue: [] });

// Convert Signal → Observable  
const count$ = toObservable(this.count);
```

🔥 **Most Asked**: signal vs BehaviorSubject, computed vs pipe, when to use which
🧠 **Strategy**: "Signals for synchronous UI state. RxJS for async streams. Use toSignal/toObservable to bridge"

---

## 76. Akita vs NgRx vs Signal Store Trade-offs

### Q: Compare Angular state management solutions.

**Answer (Interview-Ready):**

| Feature | NgRx | Akita | Signal Store | Zustand-like |
|---------|------|-------|-------------|--------------|
| **Boilerplate** | High (actions, reducers, effects) | Low (OOP-based) | Low (signal-based) | Minimal |
| **Learning curve** | Steep | Moderate | Easy (if you know signals) | Easy |
| **DevTools** | Excellent (time-travel) | Good | Basic | Varies |
| **Pattern** | Redux (functional) | Active Record (OOP) | Signal-based | Hook-based |
| **Best for** | Enterprise, complex flows | Medium apps, CRUD | Modern Angular (v17+) | Small to medium |
| **Maintained** | NgRx team | Declining | Angular team (experimental) | Community |

**NgRx Signal Store (modern NgRx):**
```ts
export const UsersStore = signalStore(
  withState({ users: [] as User[], loading: false }),
  withComputed(({ users }) => ({
    activeUsers: computed(() => users().filter(u => u.active)),
    userCount: computed(() => users().length)
  })),
  withMethods((store, usersService = inject(UsersService)) => ({
    async loadUsers() {
      patchState(store, { loading: true });
      const users = await usersService.getAll();
      patchState(store, { users, loading: false });
    }
  }))
);
```

🔥 **Most Asked**: NgRx vs simpler alternatives, when to adopt NgRx, Signal Store as future
🧠 **Strategy**: "NgRx for enterprise-scale with strict patterns. Signal Store for modern Angular. Choose based on team size and complexity"

---

# Part E — Angular Performance (Topics 77–80)

---

## 77. OnPush + trackBy — Avoiding Unnecessary Checks

### Q: How do OnPush and trackBy work together for list performance?

**Answer (Interview-Ready):**

```ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngFor="let item of items; trackBy: trackById">
      {{ item.name }}
    </div>
  `
})
export class ListComponent {
  @Input() items: Item[] = [];
  
  trackById(index: number, item: Item): string {
    return item.id;  // Angular reuses DOM elements for same ID
  }
}
```

**Without trackBy:** Angular destroys and recreates ALL DOM elements on every change.
**With trackBy:** Angular reuses existing DOM elements, only updating changed ones.

**Impact with 1000 items:**
| Scenario | DOM Operations |
|----------|---------------|
| No trackBy, 1 item added | Destroy 1000 + create 1001 |
| With trackBy, 1 item added | Create 1 new element |
| No trackBy, 1 item updated | Destroy 1000 + create 1000 |
| With trackBy, 1 item updated | Update 1 element |

🔥 **Most Asked**: trackBy function signature, why it matters for performance
🧠 **Strategy**: "Always use trackBy with *ngFor. Return a unique stable ID. Combine with OnPush for maximum performance"

---

## 78. Pure Pipes vs Impure Pipes

### Q: What is the difference between pure and impure pipes?

**Answer (Interview-Ready):**

| | Pure Pipe (default) | Impure Pipe |
|-|--------------------|----|
| **Execution** | Only when input value reference changes | On every CD cycle |
| **Memoized** | Yes (same input → cached output) | No |
| **Performance** | Excellent | Can be costly |
| **Use case** | Formatting, filtering (with immutable data) | Filtering mutable arrays, async operations |

```ts
// Pure pipe (default) — only runs when 'value' reference changes
@Pipe({ name: 'capitalize', pure: true })  // pure: true is default
export class CapitalizePipe implements PipeTransform {
  transform(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

// Impure pipe — runs every CD cycle (use sparingly!)
@Pipe({ name: 'filterActive', pure: false })
export class FilterActivePipe implements PipeTransform {
  transform(items: User[]): User[] {
    return items.filter(u => u.active);
  }
}
// Better: use a computed signal or make the array immutable + pure pipe
```

🔥 **Most Asked**: Pure vs impure, performance implications, when impure is justified
🧠 **Strategy**: "Always prefer pure pipes. If filtering is needed, use computed signals or immutable arrays instead of impure pipes"

---

## 79. Lazy Loaded Modules + Route-Level Code Splitting

### Q: How do you implement route-level code splitting in Angular?

**Answer (Interview-Ready):**

```ts
// Standalone component lazy loading (modern)
const routes: Routes = [
  { path: '', loadComponent: () => import('./home.component').then(m => m.HomeComponent) },
  { path: 'admin', loadComponent: () => import('./admin.component').then(m => m.AdminComponent) },
  { path: 'settings', loadChildren: () => import('./settings/settings.routes').then(m => m.SETTINGS_ROUTES) }
];

// Preloading strategies
RouterModule.forRoot(routes, {
  preloadingStrategy: PreloadAllModules  // Load ALL lazy routes after initial render
  // Or: custom strategy based on user role, network speed
})
```

**What happens at build time:**
```
main.js          → 150KB (core app)
admin.chunk.js   → 45KB (loaded on /admin navigation)
settings.chunk.js → 30KB (loaded on /settings navigation)
```

**Custom preloading:**
```ts
export class RoleBasedPreloading implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return route.data?.['preload'] ? load() : of(null);
  }
}
// { path: 'admin', data: { preload: true }, loadComponent: ... }
```

🔥 **Most Asked**: loadComponent vs loadChildren, preloading strategies, bundle size impact
🧠 **Strategy**: "loadComponent for standalone, loadChildren for route modules. PreloadAllModules for better UX after initial load"

---

## 80. Deferrable Views — @defer Block (Angular 17+)

### Q: What are deferrable views and how do they improve performance?

**Answer (Interview-Ready):**

**@defer = native lazy loading for template sections (not just routes)**

```html
<!-- Lazy load when component enters viewport -->
@defer (on viewport) {
  <app-heavy-chart [data]="chartData" />
} @placeholder {
  <div class="skeleton-chart"></div>
} @loading (minimum 500ms) {
  <app-spinner />
} @error {
  <p>Failed to load chart</p>
}
```

**Trigger types:**
| Trigger | Loads when |
|---------|-----------|
| `on viewport` | Element scrolls into view (IntersectionObserver) |
| `on interaction` | User clicks/hovers/focuses on placeholder |
| `on idle` | Browser is idle (requestIdleCallback) |
| `on timer(5s)` | After specified delay |
| `on immediate` | After initial render completes |
| `when condition` | Boolean expression becomes true |
| `prefetch on idle` | Prefetch code when idle, render on trigger |

```html
<!-- Prefetch JS on idle, render on viewport -->
@defer (on viewport; prefetch on idle) {
  <app-comments [postId]="post.id" />
}

<!-- Load heavy editor only when user clicks "Edit" -->
@defer (on interaction) {
  <app-rich-editor [content]="content" />
} @placeholder {
  <button>Click to Edit</button>
}
```

**Why it matters:** Reduces initial bundle size without route-level splitting. Works at component/template level.

🔥 **Most Asked**: @defer triggers, placeholder/loading/error states, vs lazy routes
🧠 **Strategy**: "@defer for below-fold content. Use 'on viewport' for scroll-triggered. Prefetch on idle for instant feel. Placeholder for CLS"

---

# Part F — React Internals (Topics 81–86)

---

## 81. React Fiber Architecture — What It Is and Why It Was Built

### Q: What is React Fiber and why was it introduced?

**Answer (Interview-Ready):**

**Pre-Fiber (React 15):** Reconciliation was synchronous, recursive. A large tree update blocked the main thread until complete → janky UI.

**Fiber (React 16+):** Reimplemented the reconciler as a linked list of "fiber nodes" that can be **paused, resumed, and prioritized**.

**Fiber node structure:**
```
Each fiber node ≈ {
  type,         // Component function/class or DOM tag
  key,
  stateNode,    // Actual DOM node or class instance
  child,        // → first child fiber
  sibling,      // → next sibling fiber
  return,       // → parent fiber
  pendingProps,
  memoizedState,
  effectTag,    // Placement | Update | Deletion
  lanes,        // Priority (React 18)
}
```

**How it enables interruptible rendering:**
```
Old (Stack Reconciler):
  render(A) → render(B) → render(C) → render(D) → commit ALL   [blocking]

New (Fiber):
  render(A) → render(B) → [pause, handle user input] → render(C) → render(D) → commit ALL
```

**Key benefits:**
- Concurrent rendering (React 18) — pause low-priority work for high-priority (user input)
- Suspense — "pause" rendering to wait for data
- Transitions — mark updates as non-urgent

🔥 **Most Asked**: Why Fiber? Linked list structure. How pausing works.
🧠 **Strategy**: "Fiber = linked-list-based reconciler enabling interruptible rendering. Each fiber node has child/sibling/return pointers"

---

## 82. Reconciliation Algorithm — How React Diffs the Virtual DOM

### Q: How does React's reconciliation/diffing algorithm work?

**Answer (Interview-Ready):**

**React's O(n) heuristic (instead of O(n³) generic tree diff):**

1. **Different element types → tear down and rebuild**
   ```jsx
   // Before: <div><Counter /></div>
   // After:  <span><Counter /></span>
   // React destroys entire <div> subtree, creates <span> from scratch
   ```

2. **Same element type → update attributes only**
   ```jsx
   // Before: <div className="old" />
   // After:  <div className="new" />
   // React updates only the className attribute
   ```

3. **Lists → key-based reconciliation**
   ```jsx
   // Before: [<li key="a">A</li>, <li key="b">B</li>]
   // After:  [<li key="b">B</li>, <li key="a">A</li>, <li key="c">C</li>]
   // React: move "b" to front, keep "a", insert "c"  (not recreate all)
   ```

**The key prop rules:**
- Keys must be stable, unique, and predictable
- ❌ Never use array index as key for reorderable lists (causes bugs)
- ✅ Use unique IDs from data

🔥 **Most Asked**: O(n) heuristic, key prop importance, when full remount happens
🧠 **Strategy**: "Two heuristics: different types = full remount. Same type = update props. Keys enable efficient list reordering"

---

## 83. React Scheduler — Priority Lanes, Task Scheduling

### Q: How does React's scheduler prioritize and schedule work?

**Answer (Interview-Ready):**

**React 18 uses a lane-based priority system:**

| Lane | Priority | Example |
|------|----------|---------|
| SyncLane | Highest (blocking) | Text input, click handlers |
| InputContinuousLane | High | Drag, scroll |
| DefaultLane | Normal | Data fetching completion |
| TransitionLane | Low | `useTransition` updates |
| IdleLane | Lowest | Off-screen pre-rendering |

**How scheduling works:**
```
1. setState() called → update assigned a lane (priority)
2. Scheduler checks: is there higher-priority work?
   → Yes: pause current, process higher priority first
   → No: continue current work
3. Work units processed one fiber at a time
4. Between units: yield to browser (checks for events, paints)
5. When all work for a lane is done → commit (synchronous)
```

**Key API — `useTransition`:**
```tsx
function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    setQuery(e.target.value);              // SyncLane — instant update
    startTransition(() => {
      setResults(filterData(e.target.value)); // TransitionLane — can be interrupted
    });
  }
  return <>
    <input value={query} onChange={handleChange} />
    {isPending ? <Spinner /> : <Results data={results} />}
  </>;
}
```

🔥 **Most Asked**: Lane priorities, how useTransition works, yielding to browser
🧠 **Strategy**: "Lanes = priority levels. User input = SyncLane (never delayed). startTransition = lower priority, interruptible"

---

## 84. Concurrent Mode — What Changes Under the Hood

### Q: What is Concurrent Mode and what does it change?

**Answer (Interview-Ready):**

**Concurrent Mode = React can work on multiple state updates simultaneously and interrupt low-priority work**

| Aspect | Synchronous (pre-18) | Concurrent (React 18+) |
|--------|----------------------|----------------------|
| Rendering | Blocking (start → finish) | Interruptible (can pause/resume) |
| Priority | All updates equal | Lane-based priorities |
| User input | Blocked during render | Always responsive |
| Multiple updates | Processed sequentially | Can overlap |

**Concurrent features enabled:**
- `useTransition()` — mark updates as non-urgent
- `useDeferredValue()` — defer re-rendering of expensive derived values
- `<Suspense>` — pause rendering while loading
- Streaming SSR — send HTML in chunks
- Selective hydration — hydrate interactive parts first

**Important:** Concurrent Mode is NOT a mode you "turn on." It's the default in React 18 when using `createRoot()`. Concurrent features are opt-in via hooks.

```ts
// React 17 (synchronous)
ReactDOM.render(<App />, root);

// React 18 (concurrent-capable)
ReactDOM.createRoot(root).render(<App />);
```

🔥 **Most Asked**: What changes with concurrent rendering, is it automatic, opt-in features
🧠 **Strategy**: "createRoot enables concurrent features. Rendering is interruptible. useTransition + useDeferredValue are the key APIs"

---

## 85. Commit Phase vs Render Phase — Side Effects Timing

### Q: What is the difference between the render phase and commit phase?

**Answer (Interview-Ready):**

| | Render Phase | Commit Phase |
|-|-------------|-------------|
| **What** | Build fiber tree, compute diffs | Apply changes to real DOM |
| **Pure?** | Yes (no side effects!) | Side effects happen here |
| **Interruptible?** | Yes (can be paused/restarted) | No (synchronous, fast) |
| **Runs** | Component function body, render methods | useLayoutEffect, componentDidMount/Update, DOM mutations |

**Timeline:**
```
setState() called
  ↓
RENDER PHASE (interruptible):
  Call component functions
  Build new fiber tree (work-in-progress)
  Diff against current tree
  Collect list of changes (effects)
  ↓
COMMIT PHASE (synchronous, not interruptible):
  1. Before mutation: read DOM (getSnapshotBeforeUpdate)
  2. Mutation: apply DOM changes (insertions, updates, deletions)
  3. Layout: run useLayoutEffect (DOM is updated, not painted yet)
  ↓
BROWSER PAINT
  ↓
  4. Passive effects: run useEffect (after paint)
```

**Why it matters:**
- Render phase can run multiple times (Concurrent Mode) → never put side effects here
- `useLayoutEffect` runs before paint → use for DOM measurements
- `useEffect` runs after paint → use for data fetching, subscriptions

🔥 **Most Asked**: Why render phase must be pure, useLayoutEffect vs useEffect timing
🧠 **Strategy**: "Render = pure computation (can be repeated). Commit = DOM mutations (synchronous). useEffect runs AFTER paint"

---

## 86. StrictMode — Why Double Invocation Happens

### Q: Why does React StrictMode run components twice?

**Answer (Interview-Ready):**

```tsx
// In development only:
<React.StrictMode>
  <App />   {/* Components render twice, effects run → cleanup → run again */}
</React.StrictMode>
```

**What StrictMode does (dev only, removed in prod):**

| Behavior | Purpose |
|----------|---------|
| Double-invokes render | Detect impure render functions (side effects in render) |
| Double-invokes effects (mount → unmount → mount) | Detect missing cleanup functions |
| Warns about deprecated APIs | Legacy lifecycle methods, findDOMNode |
| Warns about legacy context | Old context API usage |

**Why double-invoking effects matters:**
```tsx
// ❌ Bug without cleanup (StrictMode exposes this)
useEffect(() => {
  const ws = new WebSocket('wss://...');
  ws.onmessage = handler;
  // Missing cleanup! Second mount creates duplicate connection
}, []);

// ✅ Fixed
useEffect(() => {
  const ws = new WebSocket('wss://...');
  ws.onmessage = handler;
  return () => ws.close();  // Cleanup on unmount
}, []);
```

**Real-world implications:**
- API calls in useEffect may fire twice in dev (not a bug, not in prod)
- Use cleanup functions for all subscriptions/timers/connections
- State initializers run twice → don't put side effects in `useState(() => ...)` 

🔥 **Most Asked**: Why double render in dev, does it affect prod, how to handle API calls
🧠 **Strategy**: "StrictMode is dev-only. Double invocation catches missing cleanups and impure renders. Always write cleanup functions"

---

# Part G — React Hooks Deep Dive (Topics 87–96)

---

## 87. useState — Batching, Functional Updates, Lazy Initialisation

### Q: Explain useState internals: batching, functional updates, and lazy initialization.

**Answer (Interview-Ready):**

**Batching (React 18 — automatic in ALL contexts):**
```tsx
function handleClick() {
  setCount(c => c + 1);   // Queued
  setFlag(f => !f);        // Queued
  setName('Alice');        // Queued
  // → Single re-render with all three updates batched
}

// React 18: batching also works in setTimeout, promises, event listeners
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // → Still batched into single re-render (React 18+)
  // → React 17: two separate renders
});

// Opt out of batching (rare):
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1));  // Renders immediately
flushSync(() => setFlag(f => !f));       // Renders again
```

**Functional updates (use when new state depends on previous):**
```tsx
// ❌ Stale closure problem
setCount(count + 1);  // Uses stale `count` from closure
setCount(count + 1);  // Same stale `count`, result: only +1

// ✅ Functional update — always uses latest state
setCount(c => c + 1);  // c = latest value
setCount(c => c + 1);  // c = already-incremented value, result: +2
```

**Lazy initialization (expensive initial state):**
```tsx
// ❌ Runs on every render (computeInitialState called each time, result ignored after first)
const [data, setData] = useState(computeExpensiveData());

// ✅ Lazy — only runs once on mount
const [data, setData] = useState(() => computeExpensiveData());
```

🔥 **Most Asked**: Auto-batching in React 18, functional updates vs direct, lazy init
🧠 **Strategy**: "React 18 batches everywhere. Use functional updates when depending on previous state. Pass a function to useState for expensive init"

---

## 88. useEffect — Dependency Array Rules, Cleanup, Common Mistakes

### Q: Explain useEffect deeply: dependency array, cleanup, and common pitfalls.

**Answer (Interview-Ready):**

**Dependency array semantics:**
```tsx
useEffect(() => { ... });           // Runs after EVERY render
useEffect(() => { ... }, []);       // Runs ONCE on mount (+ cleanup on unmount)
useEffect(() => { ... }, [a, b]);   // Runs when a or b changes (Object.is comparison)
```

**Cleanup pattern:**
```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(setData);
  
  return () => controller.abort();  // Cancel fetch on unmount or re-run
}, [id]);
```

**Common mistakes:**
```tsx
// ❌ Object/array in deps → infinite loop (new reference each render)
useEffect(() => { ... }, [{ id: 1 }]);  // New object every render!
// ✅ Use primitive values or useMemo
useEffect(() => { ... }, [user.id]);    // Primitive — stable

// ❌ Missing dependency (stale closure)
useEffect(() => {
  const interval = setInterval(() => console.log(count), 1000);
  return () => clearInterval(interval);
}, []);  // count is stale forever!
// ✅ Add count to deps, or use functional update

// ❌ Setting state that triggers re-render → another effect → loop
useEffect(() => { setDerived(compute(data)); }, [data]);
// ✅ Use useMemo for derived state instead
const derived = useMemo(() => compute(data), [data]);
```

🔥 **Most Asked**: Dependency array gotchas, cleanup, infinite loop prevention
🧠 **Strategy**: "Cleanup for subscriptions/fetches. Primitives in deps. Derived state → useMemo, not useEffect+setState"

---

## 89. useRef — DOM Refs vs Mutable Values, forwardRef

### Q: What are the different use cases for useRef?

**Answer (Interview-Ready):**

**1. DOM reference:**
```tsx
function TextInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  return <>
    <input ref={inputRef} />
    <button onClick={() => inputRef.current?.focus()}>Focus</button>
  </>;
}
```

**2. Mutable value that doesn't trigger re-render:**
```tsx
function Timer() {
  const intervalRef = useRef<number | null>(null);
  const renderCount = useRef(0);
  renderCount.current++;  // Track renders without causing re-render
  
  useEffect(() => {
    intervalRef.current = setInterval(() => tick(), 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);
}
```

**3. forwardRef (passing refs to child components):**
```tsx
const FancyInput = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} className="fancy" {...props} />
));

// Parent
const ref = useRef<HTMLInputElement>(null);
<FancyInput ref={ref} />  // Parent can ref.current.focus()
```

**React 19 — ref as a prop (no forwardRef needed):**
```tsx
function FancyInput({ ref, ...props }: { ref: Ref<HTMLInputElement> }) {
  return <input ref={ref} className="fancy" {...props} />;
}
```

🔥 **Most Asked**: DOM ref vs mutable value, forwardRef, why useRef doesn't trigger re-render
🧠 **Strategy**: "useRef = mutable box. .current changes don't re-render. Use for DOM access + values that persist across renders"

---

## 90. useMemo — When It Helps vs When It Hurts

### Q: When should you use useMemo and when should you avoid it?

**Answer (Interview-Ready):**

```tsx
// Memoize expensive computation
const sortedItems = useMemo(
  () => items.slice().sort((a, b) => a.name.localeCompare(b.name)),
  [items]  // Only recompute when items array changes
);

// Memoize object/array to preserve referential equality
const filterConfig = useMemo(() => ({ type: 'active', sort: 'name' }), []);
// Without useMemo: new object every render → child re-renders
```

**When to use:**
| Use useMemo | Don't use useMemo |
|-------------|-------------------|
| Expensive computations (sort, filter large lists) | Simple calculations (a + b) |
| Reference stability for child props | Primitives (strings, numbers) |
| Reference stability for useEffect deps | Values that change every render anyway |

**When it hurts:**
```tsx
// ❌ Overhead > benefit (simple computation)
const doubled = useMemo(() => count * 2, [count]);
// ✅ Just compute directly
const doubled = count * 2;

// ❌ Premature optimization
const name = useMemo(() => `${first} ${last}`, [first, last]);
// ✅ Just compute it
const name = `${first} ${last}`;
```

**React Compiler (React 19):** Auto-memoizes — you won't need manual useMemo in the future.

🔥 **Most Asked**: When to useMemo, referential equality, React Compiler making it obsolete
🧠 **Strategy**: "useMemo for expensive computations and referential stability. Don't memoize cheap operations. React Compiler will auto-memoize"

---

## 91. useCallback — Referential Stability, Common Misuse

### Q: When do you need useCallback and what are common misuses?

**Answer (Interview-Ready):**

```tsx
// useCallback = useMemo for functions
const handleClick = useCallback((id: string) => {
  setSelected(id);
}, []);  // Stable reference across renders

// Equivalent to:
const handleClick = useMemo(() => (id: string) => setSelected(id), []);
```

**When useCallback matters:**
```tsx
// Matters: child is memoized with React.memo
const MemoChild = React.memo(({ onClick }) => <button onClick={onClick}>Click</button>);

function Parent() {
  // Without useCallback: onClick is new function each render → MemoChild re-renders
  const onClick = useCallback(() => doSomething(), []);
  return <MemoChild onClick={onClick} />;  // Now stable — MemoChild skips re-render
}
```

**When it doesn't matter:**
```tsx
// ❌ Wrapping for no reason (no memoized child)
const handleChange = useCallback((e) => setValue(e.target.value), []);
// ✅ Just use a regular function
const handleChange = (e) => setValue(e.target.value);
```

**Rule of thumb:** useCallback only helps when:
1. Passed to `React.memo`'d child, OR
2. Used in a dependency array of useEffect/useMemo

🔥 **Most Asked**: useCallback vs useMemo, when it matters, React.memo connection
🧠 **Strategy**: "useCallback = stable function reference. Only useful with React.memo children or as dependency. Don't wrap everything"

---

## 92. useReducer — When to Prefer Over useState

### Q: When should you use useReducer instead of useState?

**Answer (Interview-Ready):**

```tsx
type State = { count: number; step: number };
type Action = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'setStep'; payload: number }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + state.step };
    case 'decrement': return { ...state, count: state.count - state.step };
    case 'setStep':   return { ...state, step: action.payload };
    case 'reset':     return { count: 0, step: 1 };
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });
  return <button onClick={() => dispatch({ type: 'increment' })}>{state.count}</button>;
}
```

**When to prefer useReducer:**
| Scenario | useState | useReducer |
|----------|----------|------------|
| Simple independent values | ✅ | Overkill |
| Multiple related values | Messy | ✅ (single state object) |
| Next state depends on previous | Works with functional updates | ✅ (cleaner) |
| Complex state transitions | Multiple setters, error-prone | ✅ (all logic in reducer) |
| Testable state logic | Scattered | ✅ (reducer is pure, testable) |

**Bonus: dispatch is stable** (never changes reference) → great for passing to children without useCallback.

🔥 **Most Asked**: useState vs useReducer, when to switch, dispatch stability
🧠 **Strategy**: "useReducer when state is complex or related. Reducer is pure + testable. Dispatch is referentially stable"

---

## 93. useContext — Performance Pitfalls, Context Splitting

### Q: What are the performance pitfalls of useContext and how do you fix them?

**Answer (Interview-Ready):**

**The problem — all consumers re-render when ANY value in context changes:**
```tsx
// ❌ Single context with everything → ALL consumers re-render on any change
const AppContext = createContext({ user: null, theme: 'light', notifications: [] });

function ThemeButton() {
  const { theme } = useContext(AppContext);  // Re-renders when user or notifications change!
  return <button className={theme}>Click</button>;
}
```

**Solution 1: Split contexts by update frequency:**
```tsx
const UserContext = createContext(null);
const ThemeContext = createContext('light');
const NotificationContext = createContext([]);

// ThemeButton only re-renders when ThemeContext changes
function ThemeButton() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}
```

**Solution 2: Memoize the context value:**
```tsx
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const value = useMemo(() => ({ user, setUser }), [user]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
```

**Solution 3: Use `React.memo` + select pattern (with Zustand/Jotai):**
```tsx
// Zustand — components only re-render when selected slice changes
const theme = useStore(state => state.theme);  // Only re-renders on theme change
```

🔥 **Most Asked**: Context re-render problem, context splitting, when to use Zustand instead
🧠 **Strategy**: "Split contexts by update frequency. Memoize provider values. For fine-grained subscriptions, use Zustand/Jotai"

---

## 94. useTransition & useDeferredValue — Concurrent Features

### Q: Explain useTransition and useDeferredValue with real examples.

**Answer (Interview-Ready):**

**useTransition — mark updates as non-urgent:**
```tsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e) {
    setQuery(e.target.value);           // Urgent: update input immediately
    startTransition(() => {
      setResults(search(e.target.value)); // Non-urgent: can be interrupted
    });
  }

  return <>
    <input value={query} onChange={handleSearch} />
    {isPending && <Spinner />}
    <ResultsList results={results} />
  </>;
}
```

**useDeferredValue — defer re-rendering of a value:**
```tsx
function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  // query updates immediately, deferredQuery lags behind
  // Expensive list uses deferred value → doesn't block input
  
  const isStale = query !== deferredQuery;
  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      <ExpensiveList filter={deferredQuery} />
    </div>
  );
}
```

**Key difference:**
| | useTransition | useDeferredValue |
|-|---------------|-----------------|
| Wraps | The setState call | The value itself |
| Use when | You control the state update | You receive a prop/value you don't control |
| Returns | `[isPending, startTransition]` | Deferred value |

🔥 **Most Asked**: useTransition vs useDeferredValue, when to use which, isPending
🧠 **Strategy**: "useTransition wraps the setter. useDeferredValue wraps the value. Both defer non-urgent work"

---

## 95. useId, useSyncExternalStore, useInsertionEffect

### Q: Explain the lesser-known React hooks: useId, useSyncExternalStore, useInsertionEffect.

**Answer (Interview-Ready):**

**useId — SSR-safe unique IDs:**
```tsx
function FormField({ label }) {
  const id = useId();  // Stable across server + client rendering
  return <>
    <label htmlFor={id}>{label}</label>
    <input id={id} />
  </>;
}
// Generates: ":r1:", ":r2:" — consistent between SSR and hydration
```

**useSyncExternalStore — subscribe to external stores:**
```tsx
// Subscribe to browser online/offline status
function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,        // Client snapshot
    () => true                     // Server snapshot (assume online)
  );
}
```
- Used internally by Redux, Zustand, and other state libraries
- Guarantees no tearing in concurrent rendering

**useInsertionEffect — for CSS-in-JS libraries:**
```tsx
// Runs BEFORE DOM mutations (before useLayoutEffect)
// Only use case: injecting <style> tags (styled-components, Emotion)
useInsertionEffect(() => {
  const style = document.createElement('style');
  style.textContent = `.my-class { color: red; }`;
  document.head.appendChild(style);
  return () => style.remove();
}, []);
```

🔥 **Most Asked**: useId for SSR, useSyncExternalStore for external state, execution order
🧠 **Strategy**: "useId for accessible SSR forms. useSyncExternalStore for non-React state. useInsertionEffect for CSS-in-JS only"

---

## 96. Custom Hooks — Patterns, Composition, Testing

### Q: How do you design and test custom hooks effectively?

**Answer (Interview-Ready):**

**Design patterns:**
```tsx
// 1. Encapsulate state + logic
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue] as const;
}

// 2. Compose hooks
function useAuth() {
  const [user, setUser] = useLocalStorage<User | null>('user', null);
  const isAuthenticated = useMemo(() => !!user, [user]);
  
  const login = useCallback(async (credentials) => {
    const user = await api.login(credentials);
    setUser(user);
  }, [setUser]);
  
  return { user, isAuthenticated, login, logout: () => setUser(null) };
}
```

**Testing with @testing-library/react-hooks:**
```tsx
import { renderHook, act } from '@testing-library/react';

test('useCounter increments', () => {
  const { result } = renderHook(() => useCounter(0));
  
  expect(result.current.count).toBe(0);
  
  act(() => { result.current.increment(); });
  
  expect(result.current.count).toBe(1);
});
```

**Rules of hooks:**
- Only call at top level (not in conditions, loops, nested functions)
- Only call in React functions (components or other hooks)
- Name must start with "use"

🔥 **Most Asked**: Custom hook patterns, testing approach, rules of hooks
🧠 **Strategy**: "Extract reusable stateful logic into hooks. Compose simple hooks into complex ones. Test with renderHook + act"

---

# Part H — React 18 & 19 Features (Topics 97–103)

---

## 97. Automatic Batching in React 18

### Q: What changed with automatic batching in React 18?

**Answer (Interview-Ready):**

**React 17:** Only batched inside React event handlers.
**React 18:** Batches ALL state updates — event handlers, timeouts, promises, native events.

```tsx
// React 17 — TWO re-renders (Not batched in setTimeout)
setTimeout(() => {
  setCount(c => c + 1);  // Render 1
  setFlag(f => !f);       // Render 2
}, 1000);

// React 18 — ONE re-render (automatically batched)
setTimeout(() => {
  setCount(c => c + 1);  // Queued
  setFlag(f => !f);       // Queued → single re-render
}, 1000);

// Also batched in: fetch .then(), addEventListener, async functions
```

**Opt out with flushSync:**
```tsx
import { flushSync } from 'react-dom';

flushSync(() => setCount(c => c + 1));  // Synchronous render #1
flushSync(() => setFlag(f => !f));       // Synchronous render #2
```

🔥 **Most Asked**: React 17 vs 18 batching, flushSync use case
🧠 **Strategy**: "React 18 batches everywhere automatically. Use flushSync only when you need synchronous DOM after a state update"

---

## 98. Suspense for Data Fetching — How It Works Internally

### Q: How does Suspense work internally for data fetching?

**Answer (Interview-Ready):**

**Mechanism:** When a component "suspends," it throws a Promise. React catches it, shows the fallback, and re-renders when the Promise resolves.

```tsx
// Conceptual flow:
function UserProfile({ userId }) {
  const user = fetchUser(userId);  // Throws a Promise if not ready
  return <h1>{user.name}</h1>;     // Only reached when data is available
}

<Suspense fallback={<Skeleton />}>
  <UserProfile userId="123" />
</Suspense>
```

**How data libraries integrate:**
```tsx
// React Query / TanStack Query
function UserProfile({ userId }) {
  const { data: user } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId),
  });
  return <h1>{user.name}</h1>;
}

// Or: use() hook (React 19)
function UserProfile({ userPromise }) {
  const user = use(userPromise);  // Suspends until resolved
  return <h1>{user.name}</h1>;
}
```

**Nested Suspense boundaries:**
```tsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<SidebarSkeleton />}>
    <Sidebar />  {/* Can suspend independently */}
  </Suspense>
  <Suspense fallback={<ContentSkeleton />}>
    <MainContent />  {/* Can suspend independently */}
  </Suspense>
</Suspense>
```

🔥 **Most Asked**: How Suspense catches thrown Promises, nested boundaries, TanStack Query integration
🧠 **Strategy**: "Component throws a Promise → Suspense catches → shows fallback → re-renders on resolve. Nest boundaries for granular loading"

---

## 99. React Server Components (RSC) — Server vs Client Boundary

### Q: What are React Server Components and how do they differ from Client Components?

**Answer (Interview-Ready):**

| | Server Components | Client Components |
|-|-------------------|-------------------|
| **Runs on** | Server only | Client (+ server for SSR) |
| **Bundle** | NOT in client JS bundle | Included in client JS |
| **Access** | DB, filesystem, env vars directly | Browser APIs, hooks, events |
| **Hooks** | ❌ No useState, useEffect | ✅ All hooks available |
| **Interactivity** | ❌ No event handlers | ✅ onClick, onChange, etc. |
| **Default in** | Next.js App Router | Opt-in with `'use client'` |

```tsx
// Server Component (default in App Router) — no 'use client' directive
async function ProductPage({ id }) {
  const product = await db.products.findById(id);  // Direct DB access
  return (
    <div>
      <h1>{product.name}</h1>
      <AddToCartButton productId={id} />  {/* Client Component */}
    </div>
  );
}

// Client Component — needs interactivity
'use client';
function AddToCartButton({ productId }) {
  const [added, setAdded] = useState(false);
  return <button onClick={() => { addToCart(productId); setAdded(true); }}>
    {added ? 'Added!' : 'Add to Cart'}
  </button>;
}
```

**Boundary rules:**
- Server → Client: Props must be serializable (no functions, no classes)
- Client → Server: Cannot import Server Components inside Client Components
- Pattern: Server Components as parents, Client Components as leaves

🔥 **Most Asked**: Server vs Client decision, boundary rules, bundle size impact
🧠 **Strategy**: "Default to Server Components. Add 'use client' only for interactivity/hooks. Server = zero JS shipped. Interactivity at leaf level"

---

## 100. use() Hook — Reading Promises and Context

### Q: What is the use() hook in React 19?

**Answer (Interview-Ready):**

**`use()` can read Promises and Context values — and can be called conditionally!**

```tsx
// Reading a Promise (suspends until resolved)
function UserProfile({ userPromise }) {
  const user = use(userPromise);  // Suspends component automatically
  return <h1>{user.name}</h1>;
}

// Reading Context (replaces useContext)
function ThemeButton() {
  const theme = use(ThemeContext);  // Same as useContext(ThemeContext)
  return <button className={theme}>Click</button>;
}
```

**Key difference from other hooks — can be called conditionally:**
```tsx
function Component({ shouldLoad, dataPromise }) {
  if (shouldLoad) {
    const data = use(dataPromise);  // ✅ Allowed! (other hooks can't be conditional)
    return <Data data={data} />;
  }
  return <Placeholder />;
}
```

**Pattern with Server Components:**
```tsx
// Server Component passes Promise as prop
async function Page() {
  const userPromise = fetchUser();  // Don't await — pass Promise
  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}

// Client Component reads it with use()
'use client';
function UserProfile({ userPromise }) {
  const user = use(userPromise);
  return <h1>{user.name}</h1>;
}
```

🔥 **Most Asked**: use() vs useContext, conditional calling, Promise integration
🧠 **Strategy**: "use() reads Promises (with Suspense) and Context. Unique: can be called conditionally. Server Components pass Promises as props"

---

## 101. Server Actions — Forms, Mutations, Progressive Enhancement

### Q: What are Server Actions and how do they work with forms?

**Answer (Interview-Ready):**

**Server Actions = functions that run on the server, callable from client components**

```tsx
// Server Action (in a separate file or with 'use server')
'use server';

async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  
  await db.posts.create({ title, content });
  revalidatePath('/posts');  // Refresh the page data
}

// Client Component using the action
'use client';
function CreatePostForm() {
  return (
    <form action={createPost}>  {/* Works without JS! (progressive enhancement) */}
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

**With useActionState (React 19):**
```tsx
'use client';
function CreatePostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null);
  
  return (
    <form action={formAction}>
      <input name="title" required />
      {state?.error && <p className="error">{state.error}</p>}
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

**Benefits:**
- Works without JavaScript (progressive enhancement)
- No API route needed (direct server function call)
- Automatic form data serialization
- Integrated with React's transition system (isPending)

🔥 **Most Asked**: Server Actions vs API routes, progressive enhancement, useActionState
🧠 **Strategy**: "Server Actions = RPC-style server calls from forms. Work without JS. useActionState for pending/error states"

---

## 102. React Compiler (React 19) — Auto-Memoisation

### Q: What does the React Compiler do and how does it change development?

**Answer (Interview-Ready):**

**The React Compiler automatically adds useMemo, useCallback, and React.memo equivalents at compile time.**

```tsx
// What you write (no manual memoization):
function ProductList({ products, onSelect }) {
  const sorted = products.sort((a, b) => a.price - b.price);
  const handleClick = (id) => onSelect(id);
  
  return sorted.map(p => (
    <ProductCard key={p.id} product={p} onClick={() => handleClick(p.id)} />
  ));
}

// What the compiler outputs (conceptually):
function ProductList({ products, onSelect }) {
  const sorted = useMemo(() => products.sort(...), [products]);  // Auto-memoized
  const handleClick = useCallback((id) => onSelect(id), [onSelect]);  // Auto-memoized
  
  return sorted.map(p => (
    <ProductCard key={p.id} product={p} onClick={/* memoized */} />
  ));
}
```

**What it means for developers:**
- ✅ Remove manual useMemo/useCallback — compiler handles it
- ✅ Write simpler, more readable code
- ✅ Fewer bugs from incorrect dependency arrays
- ❌ Still need to follow Rules of React (pure renders, idempotent)
- ❌ Won't fix fundamental architecture issues (prop drilling, over-rendering)

**Requirements:** Components must follow Rules of React (no side effects in render, idempotent)

🔥 **Most Asked**: What compiler auto-memoizes, does it replace useMemo/useCallback, requirements
🧠 **Strategy**: "React Compiler auto-memoizes values, callbacks, and components. Write clean code, no manual memos. Must follow Rules of React"

---

## 103. Activity API & View Transitions

### Q: What are the Activity API and View Transitions in React?

**Answer (Interview-Ready):**

**Activity API (experimental) — hide/show components without unmounting:**
```tsx
// Component stays mounted when hidden (preserves state)
<Activity mode={isVisible ? 'visible' : 'hidden'}>
  <ExpensiveComponent />
  {/* State, scroll position, DOM preserved when hidden */}
</Activity>
```
- **Use case:** Tab panels, off-screen content, keep-alive
- **vs CSS display:none:** Activity can offscreen-render (lower priority via concurrent features)
- **vs unmount/remount:** No state loss, no re-initialization

**View Transitions (React + browser View Transitions API):**
```tsx
// Animate between page states
function TabPanel() {
  const [tab, setTab] = useState('home');
  
  return <>
    <button onClick={() => {
      // Wrap state update in a transition
      document.startViewTransition(() => {
        flushSync(() => setTab('settings'));
      });
    }}>Settings</button>
    
    {tab === 'home' && <Home />}
    {tab === 'settings' && <Settings />}
  </>;
}
```

**CSS for View Transitions:**
```css
::view-transition-old(root) { animation: fade-out 0.2s ease; }
::view-transition-new(root) { animation: fade-in 0.2s ease; }
```

🔥 **Most Asked**: Activity vs unmount, View Transitions API, keep-alive pattern
🧠 **Strategy**: "Activity = keep-alive (preserve state when hidden). View Transitions = animate between UI states using browser API"

---

# Part I — React Patterns (Topics 104–110)

---

## 104. Compound Component Pattern

### Q: What is the Compound Component pattern and when should you use it?

**Answer (Interview-Ready):**

**Compound Components = a set of components that work together to form a complete UI, sharing implicit state.**

```tsx
// Usage — clean, declarative API
<Select onChange={handleChange}>
  <Select.Trigger>Choose a fruit</Select.Trigger>
  <Select.Menu>
    <Select.Option value="apple">Apple</Select.Option>
    <Select.Option value="banana">Banana</Select.Option>
  </Select.Menu>
</Select>
```

**Implementation using Context:**
```tsx
const SelectContext = createContext(null);

function Select({ children, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  
  const select = (value) => { setSelected(value); setIsOpen(false); onChange?.(value); };
  
  return (
    <SelectContext.Provider value={{ isOpen, setIsOpen, selected, select }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  );
}

Select.Trigger = function Trigger({ children }) {
  const { isOpen, setIsOpen, selected } = useContext(SelectContext);
  return <button onClick={() => setIsOpen(!isOpen)}>{selected || children}</button>;
};

Select.Menu = function Menu({ children }) {
  const { isOpen } = useContext(SelectContext);
  return isOpen ? <ul className="menu">{children}</ul> : null;
};

Select.Option = function Option({ value, children }) {
  const { select, selected } = useContext(SelectContext);
  return <li onClick={() => select(value)} className={selected === value ? 'active' : ''}>
    {children}
  </li>;
};
```

**When to use:** Tabs, Accordions, Select/Dropdown, Form groups — any component with implicit shared state between parts.

🔥 **Most Asked**: Context-based pattern, API design, real-world examples (Radix, Headless UI)
🧠 **Strategy**: "Compound components share state via Context. Consumer composes sub-components declaratively. Great for design systems"

---

## 105. Render Props Pattern — When Still Useful

### Q: What is the Render Props pattern and when is it still useful?

**Answer (Interview-Ready):**

```tsx
// Render Props = component takes a function as children/prop and calls it with data
function MouseTracker({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  
  return children(pos);  // Call the render prop with data
}

// Usage
<MouseTracker>
  {({ x, y }) => <p>Mouse at {x}, {y}</p>}
</MouseTracker>
```

**Hooks replaced most render prop use cases:**
```tsx
// Before hooks: render props for reusable logic
<DataFetcher url="/api/users">{({ data, loading }) => ...}</DataFetcher>

// After hooks: just a hook
const { data, loading } = useFetch('/api/users');
```

**Still useful for:**
- Libraries needing maximum flexibility (react-three-fiber, Downshift)
- When you need to pass JSX rendering control to parent
- Animation/transition libraries (Framer Motion layout animations)
- Slot-based composition

🔥 **Most Asked**: Render props vs hooks, when still relevant, code example
🧠 **Strategy**: "Hooks replaced 90% of render prop use cases. Still useful for JSX rendering delegation and library APIs"

---

## 106. Higher Order Components (HOC) — Use Cases & Pitfalls

### Q: What are HOCs, when to use them, and common pitfalls?

**Answer (Interview-Ready):**

**HOC = function that takes a component and returns an enhanced component**

```tsx
function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" />;
    return <WrappedComponent {...props} user={user} />;
  };
}

const ProtectedDashboard = withAuth(Dashboard);
```

**Pitfalls:**
| Pitfall | Problem | Fix |
|---------|---------|-----|
| Ref forwarding | Ref attaches to wrapper, not inner | Use `forwardRef` |
| Static methods | Lost on wrapped component | Copy with `hoist-non-react-statics` |
| Props collision | HOC props override component props | Namespace or rename |
| Wrapper hell | `withAuth(withTheme(withRouter(Comp)))` | Use hooks instead |
| DevTools | All show "Anonymous" | Set `displayName` |

**Modern alternative — hooks are preferred:**
```tsx
// Instead of: const Enhanced = withAuth(withTheme(Component))
function Component() {
  const { user } = useAuth();        // Hook
  const { theme } = useTheme();       // Hook
  // Clean, composable, no wrapper hell
}
```

🔥 **Most Asked**: HOC vs hooks, when HOCs still useful (e.g., wrapping routes), pitfalls
🧠 **Strategy**: "Hooks replaced most HOC use cases. HOCs still useful for route-level concerns (auth guards) and library wrappers"

---

## 107. Container vs Presentational Components

### Q: What is the Container/Presentational pattern and is it still relevant?

**Answer (Interview-Ready):**

| | Container (Smart) | Presentational (Dumb) |
|-|-------------------|----------------------|
| **Purpose** | Logic, data fetching, state | UI rendering |
| **State** | Has state, side effects | Stateless (or minimal local state) |
| **Data** | Fetches from APIs, stores | Receives via props |
| **Reusability** | Low (app-specific) | High (reusable) |

```tsx
// Container — handles data + logic
function UserListContainer() {
  const { data: users, isLoading } = useQuery(['users'], fetchUsers);
  const [filter, setFilter] = useState('');
  const filtered = users?.filter(u => u.name.includes(filter));
  
  return <UserList users={filtered} loading={isLoading} onFilter={setFilter} />;
}

// Presentational — pure UI
function UserList({ users, loading, onFilter }) {
  if (loading) return <Skeleton />;
  return (
    <div>
      <input onChange={e => onFilter(e.target.value)} placeholder="Filter..." />
      {users.map(u => <UserCard key={u.id} user={u} />)}
    </div>
  );
}
```

**Is it still relevant?** Partially. Hooks blurred the line. Modern approach:
- Don't enforce rigid container/presentational split
- But still separate data logic from rendering when building reusable components
- Design system components should be presentational (data-agnostic)

🔥 **Most Asked**: Pattern explanation, is it still useful, hooks impact
🧠 **Strategy**: "Useful principle for reusable UI components. Don't enforce rigidly — hooks allow co-location of logic and UI"

---

## 108. Controlled vs Uncontrolled Components

### Q: What are controlled vs uncontrolled components and when to use each?

**Answer (Interview-Ready):**

| | Controlled | Uncontrolled |
|-|-----------|-------------|
| **Source of truth** | React state | DOM |
| **Value** | `value={state}` + `onChange` | `defaultValue` + `ref` |
| **Validation** | On every keystroke | On submit |
| **When** | Most cases, complex forms | Simple forms, file inputs |

```tsx
// Controlled — React owns the value
function ControlledInput() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={e => setValue(e.target.value)} />;
  // Can validate, transform, restrict on every change
}

// Uncontrolled — DOM owns the value
function UncontrolledInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSubmit = () => console.log(inputRef.current?.value);
  return <input defaultValue="" ref={inputRef} />;
  // Read value only when needed (on submit)
}

// File input — always uncontrolled (security: can't set value programmatically)
<input type="file" ref={fileRef} onChange={handleFileChange} />
```

**React Hook Form — best of both:**
```tsx
// Uncontrolled internally (performance) + controlled API
const { register, handleSubmit } = useForm();
<input {...register('email', { required: true, pattern: /\S+@\S+/ })} />
```

🔥 **Most Asked**: When to use which, React Hook Form approach, file inputs
🧠 **Strategy**: "Controlled for validation/transformation. Uncontrolled for simple forms. React Hook Form = uncontrolled perf + controlled API"

---

## 109. Error Boundaries — Class Components, react-error-boundary

### Q: How do Error Boundaries work and how do you implement them?

**Answer (Interview-Ready):**

**Error Boundaries catch JS errors in the component tree (render, lifecycle, constructors). Do NOT catch: event handlers, async code, SSR, errors in the boundary itself.**

```tsx
// Class-based (still required — no hook alternative)
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, info) {
    logErrorToService(error, info.componentStack);
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. <button onClick={() => this.setState({ hasError: false })}>Retry</button></div>;
    }
    return this.props.children;
  }
}
```

**react-error-boundary (preferred):**
```tsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={resetErrorBoundary}>Try Again</button>
    </div>
  )}
  onError={(error, info) => logError(error, info)}
  onReset={() => queryClient.clear()}
>
  <App />
</ErrorBoundary>
```

**Strategy — multiple boundaries:**
```tsx
<ErrorBoundary fallback={<PageError />}>     {/* Page-level */}
  <Header />
  <ErrorBoundary fallback={<WidgetError />}> {/* Widget-level */}
    <RecommendationsWidget />
  </ErrorBoundary>
  <MainContent />
</ErrorBoundary>
```

🔥 **Most Asked**: What errors are/aren't caught, react-error-boundary, granular boundaries
🧠 **Strategy**: "ErrorBoundary for render errors. react-error-boundary for modern DX. Multiple boundaries for granular recovery"

---

## 110. Portal Pattern — Modals, Tooltips, Dropdowns

### Q: What are React Portals and when should you use them?

**Answer (Interview-Ready):**

**Portal = render children into a DOM node outside the parent component's DOM hierarchy, while keeping React's event bubbling and context.**

```tsx
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.getElementById('modal-root')!  // Renders here in DOM
  );
}

// HTML:
// <body>
//   <div id="root">...</div>      <!-- App renders here -->
//   <div id="modal-root"></div>    <!-- Portals render here -->
// </body>
```

**Why portals?**
- **z-index/overflow issues:** Parent has `overflow: hidden` → modal would be clipped. Portal renders outside
- **Stacking context:** Tooltips/dropdowns need to escape parent stacking
- **Accessibility:** Focus trap and screen reader order

**Key behavior:** Events still bubble through React's virtual tree (not DOM tree). Context still works across portals.

```tsx
// Event bubbling works through portal
<div onClick={() => console.log('Parent clicked')}>
  <Modal isOpen={true}>
    <button onClick={() => console.log('Button clicked')}>Click</button>
    {/* Both handlers fire! Portal still bubbles to React parent */}
  </Modal>
</div>
```

🔥 **Most Asked**: Why portals exist, event bubbling behavior, overflow/z-index solving
🧠 **Strategy**: "Portals render outside DOM parent but maintain React event bubbling + context. Use for modals, tooltips, dropdowns"

---

# Part J — Redux & Redux Toolkit (Topics 111–117)

---

## 111. Redux Core — Store, Actions, Reducers, Middleware

### Q: Explain the Redux architecture and data flow.

**Answer (Interview-Ready):**

**Unidirectional data flow:**
```
UI → dispatch(action) → Middleware → Reducer → Store (new state) → UI re-renders
```

**Core concepts:**
```ts
// Action — describes WHAT happened
const increment = { type: 'counter/increment', payload: 1 };

// Reducer — pure function, describes HOW state changes
function counterReducer(state = { value: 0 }, action) {
  switch (action.type) {
    case 'counter/increment': return { value: state.value + action.payload };
    case 'counter/decrement': return { value: state.value - action.payload };
    default: return state;
  }
}

// Store — holds the state tree
const store = createStore(
  combineReducers({ counter: counterReducer }),
  applyMiddleware(thunkMiddleware, loggerMiddleware)
);

// Middleware — intercepts actions (logging, async, analytics)
const logger = store => next => action => {
  console.log('Dispatching:', action);
  const result = next(action);
  console.log('Next state:', store.getState());
  return result;
};
```

**Three principles:**
1. Single source of truth (one store)
2. State is read-only (only changed through actions)
3. Reducers are pure functions (no side effects)

🔥 **Most Asked**: Unidirectional flow, middleware pattern, pure reducers
🧠 **Strategy**: "UI dispatches action → middleware intercepts → reducer produces new state → store notifies subscribers"

---

## 112. Redux Toolkit — createSlice, createAsyncThunk, createEntityAdapter

### Q: How does Redux Toolkit simplify Redux development?

**Answer (Interview-Ready):**

**createSlice — generates actions + reducer:**
```ts
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0, status: 'idle' },
  reducers: {
    increment: (state) => { state.value += 1; },  // Immer allows "mutation"
    decrement: (state) => { state.value -= 1; },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCount.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchCount.fulfilled, (state, action) => {
        state.status = 'idle';
        state.value = action.payload;
      });
  }
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
```

**createAsyncThunk — async side effects:**
```ts
const fetchUsers = createAsyncThunk('users/fetch', async (_, { rejectWithValue }) => {
  try {
    const response = await api.getUsers();
    return response.data;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});
// Automatically creates: fetchUsers.pending, fetchUsers.fulfilled, fetchUsers.rejected
```

**RTK advantages over vanilla Redux:**
- Immer for "mutative" immutable updates
- Auto-generated action creators + types
- Built-in Thunk middleware
- `configureStore` replaces `createStore` + `combineReducers` + `applyMiddleware`

🔥 **Most Asked**: createSlice pattern, Immer, createAsyncThunk lifecycle
🧠 **Strategy**: "createSlice generates actions + reducer. Immer allows safe mutation syntax. createAsyncThunk handles async → pending/fulfilled/rejected"

---

## 113. RTK Query — defineApi, endpoints, caching, invalidation

### Q: How does RTK Query handle data fetching and caching?

**Answer (Interview-Ready):**

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['User', 'Post'],
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],  // Cache tag
    }),
    getUser: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation<User, Partial<User>>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],  // Refetch all user queries
    }),
  }),
});

export const { useGetUsersQuery, useGetUserQuery, useCreateUserMutation } = api;
```

**Usage in component:**
```tsx
function UserList() {
  const { data: users, isLoading, error } = useGetUsersQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  
  if (isLoading) return <Skeleton />;
  return <>{users?.map(u => <UserCard key={u.id} user={u} />)}</>;
}
```

**Cache invalidation:** `providesTags` / `invalidatesTags` — mutation invalidates cached queries by tag → automatic refetch.

**Polling + prefetching:**
```tsx
const { data } = useGetUsersQuery(undefined, { pollingInterval: 30000 });
// Prefetch on hover:
const prefetch = usePrefetch('getUser');
<div onMouseEnter={() => prefetch(userId)}>...</div>
```

🔥 **Most Asked**: Tag-based invalidation, auto-generated hooks, cache lifecycle
🧠 **Strategy**: "RTK Query = data fetching + caching built into Redux. Tags for cache invalidation. Auto-generated hooks from endpoints"

---

## 114. Redux Middleware — Thunk vs Saga vs Observable

### Q: Compare Redux middleware approaches: Thunk, Saga, and Observable.

**Answer (Interview-Ready):**

| | Thunk | Saga | Observable (redux-observable) |
|-|-------|------|------------------------------|
| **Approach** | Functions returning functions | Generator functions | RxJS Observables |
| **Complexity** | Simple | High | High |
| **Testing** | Standard async tests | Generator step-by-step | Marble testing |
| **Cancellation** | Manual (AbortController) | Built-in (take, race) | Built-in (switchMap) |
| **Concurrency** | Manual | takeLatest, takeEvery | switchMap, mergeMap |
| **Bundle size** | Tiny (built into RTK) | ~25KB | ~20KB + RxJS |
| **Best for** | Most apps | Complex flows (sagas) | RxJS-heavy teams |

```ts
// Thunk (most common)
const fetchUser = createAsyncThunk('user/fetch', async (id) => {
  const res = await api.getUser(id);
  return res.data;
});

// Saga
function* fetchUserSaga(action) {
  try {
    const user = yield call(api.getUser, action.payload);
    yield put(fetchUserSuccess(user));
  } catch (e) {
    yield put(fetchUserFailure(e.message));
  }
}
function* watchFetchUser() { yield takeLatest('FETCH_USER', fetchUserSaga); }

// Observable
const fetchUserEpic = action$ =>
  action$.pipe(
    ofType('FETCH_USER'),
    switchMap(action => api.getUser(action.payload).pipe(
      map(user => fetchUserSuccess(user)),
      catchError(err => of(fetchUserFailure(err.message)))
    ))
  );
```

🔥 **Most Asked**: Thunk vs Saga (most common comparison), when to use each
🧠 **Strategy**: "Thunk for 95% of cases (simple async). Saga when you need complex flows (race conditions, retries, channels). Observable for RxJS teams"

---

## 115. Normalised State Shape — Why and How

### Q: Why should you normalize state and how do you implement it?

**Answer (Interview-Ready):**

**Problem — nested/denormalized state:**
```json
{
  "posts": [
    { "id": 1, "title": "Hello", "author": { "id": 10, "name": "Alice" },
      "comments": [{ "id": 100, "text": "Nice", "author": { "id": 10, "name": "Alice" } }]
    }
  ]
}
// If Alice changes her name → update in every nested occurrence. Duplication!
```

**Normalized state (like a relational DB):**
```json
{
  "entities": {
    "users": { "10": { "id": 10, "name": "Alice" } },
    "posts": { "1": { "id": 1, "title": "Hello", "authorId": 10, "commentIds": [100] } },
    "comments": { "100": { "id": 100, "text": "Nice", "authorId": 10 } }
  },
  "result": [1]  // IDs of top-level posts
}
```

**Benefits:**
- No data duplication → single update point
- O(1) lookup by ID (entities[id])
- Easy cache invalidation
- Consistent with API response patterns

**Tools:** `createEntityAdapter` (RTK), `normalizr` library

🔥 **Most Asked**: Why normalize, entity adapter, denormalized vs normalized trade-offs
🧠 **Strategy**: "Normalize to avoid duplication. Entity format: { ids: [], entities: {} }. Use RTK's createEntityAdapter"

---

## 116. Redux DevTools — Time Travel Debugging

### Q: How do Redux DevTools enable time-travel debugging?

**Answer (Interview-Ready):**

Since every state change is recorded as an action, DevTools can:
1. **Record** every action + resulting state
2. **Replay** actions from any point
3. **Skip** specific actions to "undo" them
4. **Jump** to any state in history
5. **Export/Import** state for bug reproduction

```ts
// configureStore automatically enables DevTools in development
const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
});
```

**What DevTools show:**
- Action log with payload
- State diff (what changed)
- Full state tree
- Action timing/performance

**Debugging workflow:**
1. User reports bug → export Redux state
2. Developer imports state → sees exact application state
3. Step through actions to find which action caused the issue

🔥 **Most Asked**: Time-travel mechanism (based on pure reducers), practical debugging workflow
🧠 **Strategy**: "Pure reducers make time-travel possible. Each action is replayable. Export state for remote debugging"

---

## 117. When NOT to Use Redux — Choosing the Right Tool

### Q: When should you NOT use Redux?

**Answer (Interview-Ready):**

**Don't use Redux when:**
| Scenario | Better Alternative |
|----------|-------------------|
| Small app with little shared state | useState + useContext |
| Only server/async state | TanStack Query / SWR |
| Simple global state | Zustand, Jotai |
| Form state | React Hook Form |
| URL state | useSearchParams |
| Component-local state | useState / useReducer |

**Decision framework:**
```
Do you have complex client-side state with many interactions?  → Redux
Do you mainly fetch + cache server data?                       → TanStack Query
Do you need simple global state (theme, auth)?                → Zustand / Context
Is your state mostly forms?                                    → React Hook Form
Is your state derivable from URL?                              → Router params
```

**Signs Redux is overkill:**
- Most of your "state" is API cache
- No complex state transitions
- Small team / simple app
- You're adding Redux "just in case"

🔥 **Most Asked**: Redux alternatives, decision criteria, server state vs client state
🧠 **Strategy**: "Redux for complex client-side state logic. TanStack Query for server state. Zustand for simple global state. Don't use Redux as API cache"

---

# Part K — Next.js App Router (Topics 118–127)

---

## 118. App Router vs Pages Router — Key Differences

### Q: What are the key differences between Next.js App Router and Pages Router?

**Answer (Interview-Ready):**

| Feature | Pages Router (`/pages`) | App Router (`/app`) |
|---------|------------------------|-------------------|
| **Components** | Client by default | **Server by default** |
| **Data fetching** | `getServerSideProps`, `getStaticProps` | `async` server components, `fetch()` |
| **Layouts** | `_app.js`, `_document.js` (limited) | **Nested layouts** (file convention) |
| **Loading UI** | Manual | `loading.js` (automatic Suspense) |
| **Error UI** | `_error.js` (global) | `error.js` (per-route) |
| **Streaming** | Limited | **Built-in** (React 18 Suspense) |
| **Route groups** | Flat | `(group)` folders for organization |
| **Caching** | Manual | **Aggressive automatic caching** |

**File conventions (App Router):**
```
app/
  layout.tsx     → Root layout (persistent across navigation)
  page.tsx       → Route UI (/ route)
  loading.tsx    → Loading UI (wraps page in Suspense)
  error.tsx      → Error boundary
  not-found.tsx  → 404 page
  dashboard/
    layout.tsx   → Nested layout (preserved during navigation)
    page.tsx     → /dashboard route
    [id]/
      page.tsx   → /dashboard/:id route
```

🔥 **Most Asked**: Migration reasons, layout system, server components as default
🧠 **Strategy**: "App Router = Server Components by default + nested layouts + streaming + file-based loading/error UI"

---

## 119. Server Components vs Client Components — Decision Rules

### Q: When do you choose Server vs Client Components in Next.js?

**Answer (Interview-Ready):**

**Decision matrix:**

| Need | Server Component | Client Component |
|------|-----------------|-----------------|
| Fetch data | ✅ `async/await` directly | Use hooks (TanStack Query) |
| Access backend (DB, fs) | ✅ Directly | ❌ API route needed |
| Sensitive data (tokens, keys) | ✅ Never sent to client | ❌ Exposed in bundle |
| useState / useEffect | ❌ | ✅ |
| Event handlers (onClick) | ❌ | ✅ |
| Browser APIs | ❌ | ✅ |
| Large dependencies (syntax highlighting) | ✅ (not in client bundle) | Adds to bundle |

**Pattern: Server parent, Client leaves**
```tsx
// Server Component (default)
async function ProductPage({ params }) {
  const product = await db.products.find(params.id);
  return (
    <main>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} />  {/* Client */}
      <ReviewList reviews={product.reviews} />      {/* Server */}
    </main>
  );
}
```

**Common mistake: Adding 'use client' too high in the tree → loses server component benefits for the entire subtree.**

🔥 **Most Asked**: Decision framework, where to place 'use client' boundary
🧠 **Strategy**: "Default to Server. Add 'use client' only at the smallest component that needs interactivity. Push the boundary down"

---

## 120. Layouts, Templates, Loading UI, Error UI — File Conventions

### Q: How do Next.js file conventions work for layouts, loading, and error states?

**Answer (Interview-Ready):**

**layout.tsx — persistent, doesn't re-render on navigation:**
```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard">
      <Sidebar />  {/* Stays mounted when navigating between dashboard pages */}
      <main>{children}</main>
    </div>
  );
}
```

**template.tsx — re-renders on every navigation (new instance):**
```tsx
// Use for: animations on route change, per-page analytics, resetting state
export default function Template({ children }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{children}</motion.div>;
}
```

**loading.tsx — automatic Suspense boundary:**
```tsx
// app/dashboard/loading.tsx → wraps page.tsx in <Suspense fallback={<Loading />}>
export default function Loading() {
  return <DashboardSkeleton />;
}
```

**error.tsx — automatic error boundary:**
```tsx
'use client';  // Error boundaries must be client components
export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

**Nesting order:**
```
layout.tsx
  └── template.tsx
       └── error.tsx (ErrorBoundary)
            └── loading.tsx (Suspense)
                 └── page.tsx
```

🔥 **Most Asked**: Layout vs template, loading.tsx automatic Suspense, error.tsx reset
🧠 **Strategy**: "layout = persistent. template = re-creates. loading.tsx = automatic Suspense. error.tsx = automatic ErrorBoundary"

---

## 121. Data Fetching in App Router — fetch(), cache(), revalidate

### Q: How does data fetching work in Next.js App Router?

**Answer (Interview-Ready):**

**Server Components — direct async/await:**
```tsx
// fetch is extended with caching + revalidation
async function ProductPage({ params }) {
  // Cached by default (static)
  const product = await fetch(`https://api.example.com/products/${params.id}`, {
    next: { revalidate: 60 }  // ISR: revalidate every 60 seconds
  });
  
  // Or: no cache (SSR every request)
  const livePrice = await fetch(`https://api.example.com/price/${params.id}`, {
    cache: 'no-store'
  });
}
```

**Caching options:**
| Option | Behavior | Use Case |
|--------|----------|----------|
| Default | Cached indefinitely (build-time) | Static content |
| `{ next: { revalidate: N } }` | ISR: cached for N seconds | Products, blog posts |
| `{ cache: 'no-store' }` | Never cached (SSR) | User-specific, real-time data |

**Request memoization:**
```tsx
// Multiple components fetch same URL → only ONE request
async function Layout() {
  const user = await fetch('/api/user');  // Request #1
  return <><Header user={user} /><Content /></>;
}
async function Header({ user }) {
  const user = await fetch('/api/user');  // Deduplicated! Same request
}
```

**Revalidation strategies:**
- `revalidatePath('/products')` — on-demand (from Server Action or Route Handler)
- `revalidateTag('products')` — tag-based invalidation

🔥 **Most Asked**: Caching behavior, ISR, request memoization, revalidation
🧠 **Strategy**: "Fetch in Server Components directly. Default = cached. Use revalidate for ISR. no-store for dynamic data. Requests auto-deduplicated"

---

## 122. Route Handlers — API Routes in App Router

### Q: How do Route Handlers work in Next.js App Router?

**Answer (Interview-Ready):**

```ts
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const users = await db.users.findMany({ skip: (Number(page) - 1) * 10, take: 10 });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await db.users.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}
```

**Dynamic routes:**
```ts
// app/api/users/[id]/route.ts
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await db.users.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}
```

**When to use Route Handlers vs Server Actions:**
- Route Handlers: external API consumption (webhooks, third-party), streaming responses
- Server Actions: form submissions, mutations from client components

🔥 **Most Asked**: Route handler vs Server Actions, when to use each, Edge runtime
🧠 **Strategy**: "Route Handlers for API endpoints (webhooks, external). Server Actions for mutations from forms/components"

---

## 123. Middleware — Matchers, Redirects, Auth Patterns

### Q: How does Next.js Middleware work and what are common patterns?

**Answer (Interview-Ready):**

```ts
// middleware.ts (root level — runs on EVERY matching request at the edge)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Auth check
  const token = request.cookies.get('session')?.value;
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('x-request-id', crypto.randomUUID());
  
  // Geo-based redirect
  const country = request.geo?.country;
  if (country === 'DE' && !request.nextUrl.pathname.startsWith('/de')) {
    return NextResponse.redirect(new URL('/de' + request.nextUrl.pathname, request.url));
  }
  
  return response;
}

// Only run on specific paths:
export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*', '/((?!_next|static|favicon).*)']
};
```

**Common patterns:**
| Pattern | Implementation |
|---------|---------------|
| Auth guard | Check cookie/token → redirect to /login |
| A/B testing | Hash userId → set cookie → rewrite to variant |
| Geo redirect | Check `request.geo` → redirect to regional site |
| Bot protection | Check User-Agent → block or challenge |
| Rate limiting | Check IP → track requests → return 429 |

🔥 **Most Asked**: Auth middleware pattern, matcher config, edge runtime limitations
🧠 **Strategy**: "Middleware runs at edge before every matched request. Auth, geo, A/B testing. Use matcher to scope"

---

## 124. Image, Font, Script Optimisation — next/image, next/font

### Q: How does Next.js optimize images, fonts, and scripts?

**Answer (Interview-Ready):**

**next/image:**
```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  width={1200} height={600}
  alt="Hero"
  priority          // Preload (above-the-fold)
  placeholder="blur" // Show blurred placeholder while loading
  sizes="(max-width: 768px) 100vw, 50vw"  // Responsive
/>
```
- Auto WebP/AVIF conversion
- Lazy loading by default (below fold)
- Responsive `srcset` generation
- Prevents CLS (width/height required)

**next/font (zero-CLS fonts):**
```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], display: 'swap' });
// Font file downloaded at build time, self-hosted, zero CLS
// No external requests to Google Fonts at runtime
```

**next/script:**
```tsx
import Script from 'next/script';
<Script src="https://analytics.com/script.js" strategy="lazyOnload" />
// Strategies: beforeInteractive | afterInteractive | lazyOnload | worker
```

🔥 **Most Asked**: Image optimization pipeline, font CLS prevention, script loading strategies
🧠 **Strategy**: "next/image for auto-optimization + CLS prevention. next/font for self-hosted zero-CLS fonts. next/script for third-party loading control"

---

## 125. Streaming with Suspense in Next.js

### Q: How does streaming SSR work with Suspense in Next.js?

**Answer (Interview-Ready):**

**Traditional SSR:** Server generates ENTIRE HTML → sends to client. Slow for data-heavy pages.

**Streaming SSR (React 18 + Next.js):** Server sends HTML in chunks as each part becomes ready.

```tsx
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>                     {/* Sent immediately */}
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />                             {/* Streamed when data ready */}
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />                      {/* Streamed independently */}
      </Suspense>
    </div>
  );
}

async function Stats() {
  const stats = await fetchStats();  // Takes 500ms
  return <StatsGrid data={stats} />;
}

async function RevenueChart() {
  const revenue = await fetchRevenue();  // Takes 2s
  return <Chart data={revenue} />;
}
```

**What the browser receives:**
```
Time 0ms:   <h1>Dashboard</h1> + <StatsSkeleton /> + <ChartSkeleton />
Time 500ms: Stats data replaces skeleton (streamed via chunked transfer)
Time 2000ms: Chart data replaces skeleton (streamed)
```

**Benefits:**
- TTFB: Instant (shell sent immediately)
- FCP: Fast (skeleton appears immediately)
- LCP: Faster (progressive content appearance)

🔥 **Most Asked**: Streaming vs traditional SSR, Suspense boundary placement, TTFB improvement
🧠 **Strategy**: "Wrap async components in Suspense. HTML streams in chunks. Skeletons show immediately. Data replaces as it arrives"

---

## 126. Parallel Routes & Intercepting Routes

### Q: What are Parallel Routes and Intercepting Routes in Next.js?

**Answer (Interview-Ready):**

**Parallel Routes — render multiple pages simultaneously in the same layout:**
```
app/
  layout.tsx         → uses @team and @analytics slots
  @team/
    page.tsx         → renders team section
  @analytics/
    page.tsx         → renders analytics section
```
```tsx
// app/layout.tsx
export default function Layout({ children, team, analytics }) {
  return (
    <div>
      {children}     {/* Main content */}
      {team}         {/* @team slot */}
      {analytics}    {/* @analytics slot */}
    </div>
  );
}
```
**Use cases:** Dashboard with independent sections, modals as routes, conditional layouts.

**Intercepting Routes — show route in a modal while preserving background:**
```
app/
  feed/
    @modal/
      (..)photo/[id]/page.tsx  → Shows photo in modal overlay
    page.tsx                    → Feed page
  photo/[id]/
    page.tsx                    → Full photo page (direct URL access)
```

**Behavior:**
- Click photo in feed → modal opens (intercepted route, feed still visible behind)
- Direct URL `/photo/123` → full page view
- Share link → recipient sees full page (not modal)

**Intercept conventions:** `(.)` same level, `(..)` one level up, `(..)(..)` two levels up, `(...)` from root.

🔥 **Most Asked**: Parallel routes for dashboards, modal intercept pattern (Instagram-style)
🧠 **Strategy**: "Parallel routes for multi-slot layouts. Intercepting routes for modal-on-background pattern (social media photo view)"

---

## 127. Next.js Caching — Request Memoization, Data Cache, Full Route Cache, Router Cache

### Q: Explain the four caching layers in Next.js App Router.

**Answer (Interview-Ready):**

| Cache Layer | Where | What | Duration |
|-------------|-------|------|----------|
| **Request Memoization** | Server (per-request) | Dedup same fetch() calls in one render | Single request |
| **Data Cache** | Server (persistent) | Cache fetch() responses | Until revalidation |
| **Full Route Cache** | Server (build-time) | Pre-rendered HTML + RSC payload | Until revalidation |
| **Router Cache** | Client (browser) | Prefetched + visited route RSC payloads | Session (30s dynamic, 5min static) |

**How they interact:**
```
Client navigates to /products
  → Router Cache: have it? → Return (no server request)
  → Miss → Server: Full Route Cache: have it? → Return
  → Miss → Render page
    → Data Cache: have fetch() cached? → Return
    → Miss → fetch() external API
    → Request Memoization: same URL fetched twice? → Deduplicate
```

**Opting out:**
```tsx
// No data cache
fetch(url, { cache: 'no-store' });

// Force dynamic (no full route cache)
export const dynamic = 'force-dynamic';

// Revalidate data cache
fetch(url, { next: { revalidate: 60 } });
// Or on-demand:
revalidatePath('/products');
revalidateTag('products');
```

🔥 **Most Asked**: Four cache layers, how they interact, opting out, revalidation
🧠 **Strategy**: "Four layers: Request Memoization → Data Cache → Full Route → Router Cache. Each can be opted out independently"

---

# Part L — React Performance Patterns (Topics 128–135)

---

## 128. When Does a Component Re-render — The Complete Rules

### Q: What triggers a React component to re-render?

**Answer (Interview-Ready):**

**A component re-renders when:**
1. **Its state changes** (`setState`, `dispatch`, `useReducer`)
2. **Its parent re-renders** (unless wrapped in `React.memo`)
3. **Context value changes** (any consumer re-renders)
4. **Force update** (`forceUpdate` in class components)

**A component does NOT re-render when:**
- Props haven't changed AND it's wrapped in `React.memo`
- Its own ref changes (`useRef` — no re-render)
- Something in a sibling component changes
- State is set to the same value (React bails out)

```tsx
// Parent re-renders → ALL children re-render (even if props unchanged)
function Parent() {
  const [count, setCount] = useState(0);
  return <>
    <Child />          {/* Re-renders every time Parent renders */}
    <MemoChild />      {/* Only re-renders if its props change */}
  </>;
}

const MemoChild = React.memo(function Child() { return <div>I'm memoized</div>; });
```

**Bailout optimization:** React skips re-render if `setState` receives exactly the same value (Object.is comparison).

🔥 **Most Asked**: Complete re-render rules, parent-child relationship, bailout
🧠 **Strategy**: "State change → re-render. Parent re-render → children re-render. React.memo prevents unnecessary child re-renders"

---

## 129. React.memo — Props Comparison, Custom Comparator

### Q: How does React.memo work and when should you use a custom comparator?

**Answer (Interview-Ready):**

```tsx
// Default: shallow comparison of all props (Object.is for each prop)
const UserCard = React.memo(function UserCard({ user, onClick }) {
  return <div onClick={onClick}>{user.name}</div>;
});

// Custom comparator (rare — when default shallow compare isn't enough)
const UserCard = React.memo(
  function UserCard({ user }) { return <div>{user.name}</div>; },
  (prevProps, nextProps) => prevProps.user.id === nextProps.user.id
  // Return true = skip re-render, false = re-render
);
```

**When React.memo is useful:**
- Component renders the same given same props (pure)
- Component is expensive to render
- Component receives stable props (primitives or memoized objects)

**When React.memo is NOT useful:**
```tsx
// ❌ Props change every render anyway
<MemoChild style={{ color: 'red' }} />  // New object every render → memo useless
<MemoChild onClick={() => handleClick()} />  // New function every render

// ✅ Fix with useMemo/useCallback
const style = useMemo(() => ({ color: 'red' }), []);
const onClick = useCallback(() => handleClick(), []);
<MemoChild style={style} onClick={onClick} />
```

🔥 **Most Asked**: When memo helps, custom comparator, paired with useCallback
🧠 **Strategy**: "React.memo for expensive pure components. Must pair with useCallback/useMemo for non-primitive props"

---

## 130. Key Prop — Why It Matters, Common Mistakes

### Q: Why does the key prop matter and what are common mistakes?

**Answer (Interview-Ready):**

**Key = React's identity for an element. Used to determine whether to reuse or recreate.**

```tsx
// ❌ Using index as key for reorderable/filterable lists
{items.map((item, index) => <ListItem key={index} item={item} />)}
// Problem: if items reorder, React keeps index mapping → wrong state attached to wrong item

// ✅ Use stable unique ID
{items.map(item => <ListItem key={item.id} item={item} />)}
```

**Key as a reset mechanism:**
```tsx
// Changes key → React unmounts + remounts component (fresh state)
<UserProfile key={userId} userId={userId} />
// When userId changes: destroy old UserProfile, create new one with fresh state

// vs without key: React updates existing component (old state persists)
```

**When index-as-key is OK:**
- Static list (never reordered, filtered, or modified)
- No component state or refs in list items

🔥 **Most Asked**: Index-as-key bugs, key as reset mechanism, reconciliation
🧠 **Strategy**: "Unique stable keys for dynamic lists. Key change = component reset. Index-as-key only for static lists"

---

## 131. Avoid Anonymous Functions in JSX — Why & When

### Q: Why should you avoid anonymous functions in JSX and when does it matter?

**Answer (Interview-Ready):**

```tsx
// Anonymous function → new reference every render
<Button onClick={() => handleClick(id)} />    // New function each render
<MemoChild render={() => <span>{text}</span>} />  // New function each render

// Named/memoized function → stable reference
const handleClick = useCallback(() => onClick(id), [id]);
<Button onClick={handleClick} />
```

**When it matters:**
| Scenario | Impact |
|----------|--------|
| Child is `React.memo` wrapped | Anonymous fn breaks memoization |
| Function is in useEffect deps | Triggers effect every render |
| Rendering 1000+ list items | Each creates new closure (GC pressure) |

**When it does NOT matter:**
| Scenario | Why |
|----------|-----|
| Child is NOT memoized | Re-renders anyway — new fn doesn't add cost |
| Event handlers on native elements | `<button onClick={() => ...}>` — negligible overhead |
| Few renders / small app | Optimization not worth the readability cost |

**React Compiler (React 19):** Auto-memoizes closures. This concern becomes irrelevant.

🔥 **Most Asked**: When anonymous functions matter, useCallback justification
🧠 **Strategy**: "Only matters when child is React.memo or function is in deps array. For simple handlers on native elements, it's fine"

---

## 132. Windowing Large Lists — react-window vs react-virtual

### Q: How do you virtualize large lists for performance?

**Answer (Interview-Ready):**

**Virtualization = only render visible items (+buffer). 10,000 items → only ~30 DOM nodes.**

```tsx
// react-window (mature, lightweight)
import { FixedSizeList } from 'react-window';

<FixedSizeList height={600} width="100%" itemCount={10000} itemSize={50}>
  {({ index, style }) => (
    <div style={style}>{items[index].name}</div>
  )}
</FixedSizeList>

// TanStack Virtual (modern, headless)
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,  // Estimated row height
    overscan: 5,             // Buffer rows outside viewport
  });
  
  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.key} style={{
            position: 'absolute', top: 0,
            transform: `translateY(${virtualRow.start}px)`,
            height: virtualRow.size
          }}>
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

| Library | Size | Features |
|---------|------|----------|
| react-window | ~6KB | Fixed/Variable size lists, grids |
| TanStack Virtual | ~5KB | Headless, any framework, dynamic sizing |
| react-virtuoso | ~15KB | Grouped lists, reverse scroll (chat), SSR |

🔥 **Most Asked**: When to virtualize, react-window vs TanStack Virtual, overscan
🧠 **Strategy**: "Virtualize when list > 100-200 items. TanStack Virtual for headless flexibility. react-window for quick setup"

---

## 133. Code Splitting with React.lazy + Suspense

### Q: How does code splitting work with React.lazy and Suspense?

**Answer (Interview-Ready):**

```tsx
// Dynamic import → separate bundle chunk
const AdminPanel = lazy(() => import('./AdminPanel'));
const Settings = lazy(() => import('./Settings'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**Advanced: Named exports with lazy:**
```tsx
// Component uses named export
const UserChart = lazy(() =>
  import('./Charts').then(module => ({ default: module.UserChart }))
);
```

**Preload on hover/intent:**
```tsx
const AdminPanel = lazy(() => import('./AdminPanel'));

function NavLink() {
  const preload = () => import('./AdminPanel');  // Trigger preload
  return <Link to="/admin" onMouseEnter={preload}>Admin</Link>;
}
```

**Bundle analysis:**
- Use `@next/bundle-analyzer` or `webpack-bundle-analyzer`
- Target: < 200KB initial JS (compressed)
- Split by route + heavy libraries (chart libs, editors)

🔥 **Most Asked**: lazy + Suspense, preloading on hover, when to split
🧠 **Strategy**: "Split by route with lazy(). Preload on hover for instant navigation. Analyze bundle to find split opportunities"

---

## 134. Profiling with React DevTools — Reading Flame Graphs

### Q: How do you profile React performance with DevTools?

**Answer (Interview-Ready):**

**Profiler workflow:**
1. Open React DevTools → Profiler tab
2. Click Record → interact with app → Stop recording
3. Analyze flame graph + ranked chart

**Reading the flame graph:**
| Color | Meaning |
|-------|---------|
| **Gray** | Did not render (skipped) |
| **Blue/green** | Rendered (faster) |
| **Yellow/orange** | Rendered (slower — investigate) |
| **Bar width** | Relative render time |

**What to look for:**
- Components rendering when they shouldn't (no props changed)
- Expensive components (wide bars in flame graph)
- Cascading re-renders from context or parent

**Programmatic profiling:**
```tsx
<Profiler id="sidebar" onRender={(id, phase, duration) => {
  if (duration > 16) { // > 1 frame (60fps)
    console.warn(`${id} slow render: ${duration}ms`);
    sendToAnalytics({ component: id, duration });
  }
}}>
  <Sidebar />
</Profiler>
```

🔥 **Most Asked**: How to use DevTools Profiler, reading flame graph, identifying slow renders
🧠 **Strategy**: "Profile → record → flame graph. Look for yellow/orange bars. Gray = good (skipped). Use Profiler component for prod monitoring"

---

## 135. Why Did You Render — Detecting Unnecessary Re-renders

### Q: How do you detect and fix unnecessary re-renders?

**Answer (Interview-Ready):**

**@welldone-software/why-did-you-render:**
```tsx
// Setup (development only)
import React from 'react';
import whyDidYouRender from '@welldone-software/why-did-you-render';
whyDidYouRender(React, { trackAllPureComponents: true });

// Mark specific components
UserList.whyDidYouRender = true;
```

**Common causes + fixes:**

| Cause | Fix |
|-------|-----|
| Object/array prop created in render | `useMemo` |
| Callback prop created in render | `useCallback` |
| Context value changes on every render | Memoize context value |
| Parent re-renders frequently | `React.memo` on child |
| State update with same value | React bails out (free) |
| Computing derived data in useEffect | Use `useMemo` instead |

**Systematic debugging:**
```
1. Profile → find re-rendering component
2. Check: did props actually change? (why-did-you-render)
3. If props same → wrap in React.memo
4. If props changed but shouldn't → useMemo/useCallback in parent
5. If context → split context or use selector (Zustand)
```

🔥 **Most Asked**: Detecting unnecessary renders, systematic approach to fixing
🧠 **Strategy**: "Profile first (don't optimize blindly). why-did-you-render for detection. React.memo + useMemo + useCallback for fixes"

---

# Part M — State Fundamentals (Topics 136–139)

---

## 136. Local Component State

### Q: When should state remain local to a component?

**Answer (Interview-Ready):**

**Keep state local when:**
- Only one component uses it (form input, toggle, accordion open/closed)
- Lifting it up provides no benefit
- It's UI state, not shared data (hover state, animation state, scroll position)

```tsx
function SearchBar() {
  const [query, setQuery] = useState('');       // Local — only this component
  const [isFocused, setIsFocused] = useState(false); // UI state
  
  return <input
    value={query}
    onChange={e => setQuery(e.target.value)}
    onFocus={() => setIsFocused(true)}
    onBlur={() => setIsFocused(false)}
  />;
}
```

**Principle of colocation:** State should live as close as possible to where it's used. Only lift up when multiple components need it.

🔥 **Most Asked**: When to keep local vs lift up, colocation principle
🧠 **Strategy**: "Colocate state with its consumer. Lift up only when needed by siblings/parents. UI state is almost always local"

---

## 137. Global State Management

### Q: When do you need global state and what are the options?

**Answer (Interview-Ready):**

**You need global state when:** multiple distant components need the same data (auth, theme, language, notifications).

| Tool | Complexity | Best For |
|------|-----------|----------|
| React Context | Low | Low-frequency updates (theme, auth) |
| Zustand | Low | Simple global state, many consumers |
| Jotai | Low | Atomic state, bottom-up |
| Redux Toolkit | Medium | Complex state with many interactions |
| MobX | Medium | OOP-style, auto-tracking |
| Valtio | Low | Proxy-based, mutable API |

**Decision: Do you actually need global state?**
```
Server data (users, products)?  → TanStack Query (not global state)
URL-derived (filters, page)?    → useSearchParams (not global state)
Form values?                    → React Hook Form (not global state)
Theme/auth/locale?              → Context or Zustand
Complex client logic?           → Redux or Zustand
```

🔥 **Most Asked**: When to use global state, choosing a library, over-globalizing
🧠 **Strategy**: "Most 'global state' is actually server state (use TanStack Query). True global: auth, theme, locale. Use Zustand for simplicity, Redux for complexity"

---

## 138. Prop Drilling vs Context

### Q: When should you use Context instead of prop drilling?

**Answer (Interview-Ready):**

**Prop drilling = passing props through intermediate components that don't use them.**

```tsx
// ❌ Prop drilling (App → Layout → Sidebar → UserMenu → Avatar uses user)
<App user={user}>              {/* App has user */}
  <Layout user={user}>         {/* Layout doesn't use it, just passes */}
    <Sidebar user={user}>      {/* Sidebar doesn't use it */}
      <UserMenu user={user} /> {/* Finally used here */}
    </Sidebar>
  </Layout>
</App>

// ✅ Context — skip intermediate components
const UserContext = createContext(null);
<UserContext.Provider value={user}>
  <Layout>
    <Sidebar>
      <UserMenu />  {/* useContext(UserContext) directly */}
    </Sidebar>
  </Layout>
</UserContext.Provider>
```

**But prop drilling isn't always bad:**
- 1-2 levels deep → prop drilling is simpler and more explicit
- Makes data flow visible and traceable
- Easier to test components in isolation

**Alternatives to both:**
- **Component composition:** Pass `<UserMenu user={user} />` as children prop
- **Zustand/Jotai:** When context re-render cost is too high

🔥 **Most Asked**: When prop drilling is OK, when to switch to Context, composition pattern
🧠 **Strategy**: "1-2 levels: prop drill. 3+ levels: Context or composition. Many consumers + frequent updates: Zustand"

---

## 139. Derived State vs Computed State

### Q: What is derived state and why should you avoid storing it?

**Answer (Interview-Ready):**

**Derived state = state that can be computed from other state. Don't store it!**

```tsx
// ❌ Storing derived state (syncing nightmare)
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);
const [filtered, setFiltered] = useState([]);

useEffect(() => {
  setTotal(items.reduce((sum, i) => sum + i.price, 0));
  setFiltered(items.filter(i => i.active));
}, [items]);  // Keep in sync manually — error-prone!

// ✅ Compute during render
const [items, setItems] = useState([]);
const total = items.reduce((sum, i) => sum + i.price, 0);        // Computed
const filtered = items.filter(i => i.active);                    // Computed

// ✅ useMemo for expensive derivations
const filtered = useMemo(() => items.filter(i => i.active), [items]);
```

**Rule:** If you can compute a value from existing state/props, compute it. Don't `useState` + `useEffect` to "sync" it.

🔥 **Most Asked**: Why derived state is an anti-pattern, useMemo for expensive derivations
🧠 **Strategy**: "If computable from existing state → compute it, don't store it. Use useMemo only if computation is expensive"

---

# Part N — State Tools & Patterns (Topics 140–145)

---

## 140. Redux / Zustand / Signals — Comparison

### Q: Compare Redux, Zustand, and Signals for state management.

**Answer (Interview-Ready):**

| Feature | Redux (RTK) | Zustand | Signals (Preact/Angular) |
|---------|------------|---------|--------------------------|
| **Bundle** | ~11KB | ~1KB | Framework-built-in |
| **Boilerplate** | Medium (slices) | Minimal | Minimal |
| **DevTools** | Excellent | Good (Redux DevTools compatible) | Basic |
| **Re-render** | Selector-based | Selector-based | Auto-tracked (fine-grained) |
| **Pattern** | Flux (actions/reducers) | Hooks-first | Reactive primitives |
| **Learning** | Medium | Easy | Easy |

```ts
// Zustand — minimal API
const useStore = create((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
}));
// Component: const count = useStore(state => state.count);

// Redux Toolkit
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: { increment: (state) => { state.value += 1; } }
});
// Component: const count = useSelector(state => state.counter.value);

// Angular Signal
const count = signal(0);
count.update(v => v + 1);
// Template: {{ count() }}
```

**Choose based on:** Team experience + complexity needs. Zustand for most React apps. Redux for enterprise with complex flows.

🔥 **Most Asked**: Zustand vs Redux, when to choose each, bundle size
🧠 **Strategy**: "Zustand for 90% of apps (simple, tiny). Redux for enterprise (DevTools, middleware, team conventions). Signals for Angular"

---

## 141. Server State vs Client State

### Q: What is the difference between server state and client state?

**Answer (Interview-Ready):**

| | Server State | Client State |
|-|-------------|-------------|
| **Source of truth** | Remote server | Browser |
| **Examples** | User data, products, orders | Theme, sidebar open, form draft |
| **Characteristics** | Async, shared across users, can be stale | Synchronous, local to user |
| **Tools** | TanStack Query, SWR, RTK Query | useState, Zustand, Redux |
| **Challenges** | Caching, dedup, revalidation, optimistic updates | Re-render optimization |

**Key insight:** Most apps have 80% server state, 20% client state. Using Redux for server state is over-engineering.

```tsx
// ❌ Managing server data in Redux (lots of boilerplate)
dispatch(fetchUsersStart());
api.getUsers().then(users => dispatch(fetchUsersSuccess(users)));

// ✅ TanStack Query (purpose-built for server state)
const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers });
// Handles: caching, dedup, refetching, stale-while-revalidate, retry, pagination
```

🔥 **Most Asked**: Server vs client state distinction, why not Redux for everything
🧠 **Strategy**: "Server state → TanStack Query/SWR. Client state → Zustand/useState. Don't use Redux as an API cache"

---

## 142. Cache-Based State Management

### Q: How does a cache-first approach replace traditional state management?

**Answer (Interview-Ready):**

**Idea:** Instead of "fetching data and putting it in state," treat the cache as the state.

```tsx
// TanStack Query — cache IS the state
function UserProfile({ userId }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId),
    staleTime: 5 * 60 * 1000,  // Fresh for 5 min
  });
  // No useState, no useEffect, no loading state management
  // Cache provides: data, loading, error, refetch, invalidation
}
```

**This eliminates:**
- Loading/error state boilerplate
- Stale data problems (auto-revalidation)
- Duplicate requests (automatic dedup)
- Global store for server data

**When cache-based isn't enough:** Complex client-only state (form wizards, drawing tools, game state) → still need client state tools.

🔥 **Most Asked**: Cache as state, staleTime vs gcTime, when cache-first breaks down
🧠 **Strategy**: "TanStack Query = server state manager. Cache replaces useState for API data. Add Zustand only for remaining client state"

---

## 143. React Query / TanStack Query Deep Dive

### Q: Explain TanStack Query's core concepts and caching model.

**Answer (Interview-Ready):**

**Core concepts:**
```tsx
const { data, isLoading, error, refetch, isFetching } = useQuery({
  queryKey: ['users', { page, filter }],  // Cache key (determines identity)
  queryFn: () => api.getUsers({ page, filter }),
  staleTime: 60_000,     // Data considered fresh for 60s (no refetch)
  gcTime: 5 * 60_000,    // Garbage collect unused cache after 5min
  retry: 3,              // Retry failed requests
  refetchOnWindowFocus: true,  // Refetch when tab gains focus
});
```

**Cache lifecycle:**
```
Query mounted → fetch → FRESH (staleTime)
  → staleTime expires → STALE
  → Component re-mounts or window focus → refetch in background
  → All instances unmount → INACTIVE
  → gcTime expires → GARBAGE COLLECTED
```

**Mutations + invalidation:**
```tsx
const mutation = useMutation({
  mutationFn: (newUser) => api.createUser(newUser),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    // ALL queries starting with ['users'] are refetched
  }
});
```

**Prefetching:**
```tsx
// Prefetch on hover
queryClient.prefetchQuery({ queryKey: ['user', id], queryFn: () => getUser(id) });
```

🔥 **Most Asked**: Cache lifecycle, staleTime vs gcTime, invalidation strategies
🧠 **Strategy**: "queryKey = cache identity. staleTime = freshness. gcTime = memory. Invalidate on mutations. Prefetch on hover"

---

## 144. State Machines (XState) for Complex Flows

### Q: When should you use state machines (XState) for frontend state?

**Answer (Interview-Ready):**

**Use state machines when:**
- State has well-defined transitions (wizard, checkout, auth flow)
- Certain transitions should be impossible (can't submit if not validated)
- You need to reason about all possible states

```ts
import { createMachine, assign } from 'xstate';

const authMachine = createMachine({
  id: 'auth',
  initial: 'idle',
  context: { user: null, error: null },
  states: {
    idle: { on: { LOGIN: 'authenticating' } },
    authenticating: {
      invoke: {
        src: 'loginService',
        onDone: { target: 'authenticated', actions: assign({ user: (_, event) => event.data }) },
        onError: { target: 'error', actions: assign({ error: (_, event) => event.data }) }
      }
    },
    authenticated: { on: { LOGOUT: 'idle' } },
    error: { on: { RETRY: 'authenticating' } }
  }
});
```

**Benefits:**
- **Impossible states are impossible** (can't be "loading" AND "error" simultaneously)
- **Visual documentation** (XState Visualizer generates state diagrams)
- **Predictable** (every transition is explicit)

**When NOT to use:** Simple toggle, counter, forms — overkill.

🔥 **Most Asked**: When state machines > useState, impossible states, XState visualizer
🧠 **Strategy**: "State machines for complex flows with explicit transitions. Prevents impossible states. Use for auth, checkout, wizards"

---

## 145. URL as State — When and Why

### Q: When should you use the URL as state?

**Answer (Interview-Ready):**

**Use URL state when:** State should survive page refresh, be shareable, bookmarkable.

```tsx
// Search filters → URL params
function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'popular';
  const page = Number(searchParams.get('page')) || 1;
  
  const { data } = useQuery({
    queryKey: ['products', { category, sort, page }],
    queryFn: () => api.getProducts({ category, sort, page })
  });
  
  return <>
    <FilterBar
      category={category}
      onChange={(cat) => setSearchParams(prev => { prev.set('category', cat); return prev; })}
    />
    <ProductGrid products={data} />
    <Pagination page={page} />
  </>;
}
```

**URL state candidates:**
- ✅ Search query, filters, sort, pagination
- ✅ Active tab, selected item ID
- ✅ Modal open state (shareable deep links)
- ❌ Form draft data (too large, ephemeral)
- ❌ UI animations, hover states

**Tools:** `useSearchParams` (React Router), `nuqs` library, Next.js `searchParams`.

🔥 **Most Asked**: What belongs in URL, useSearchParams, shareable deep links
🧠 **Strategy**: "If user should be able to share/bookmark the state → URL. Filters, pagination, tabs. Not for ephemeral UI state"

---

# Part O — State at Scale (Topics 146–148)

---

## 146. State Normalization

### Q: How do you normalize state in a large frontend application?

**Answer (Interview-Ready):**
(Covered in depth in Topic 115 — Redux Normalized State. Quick recap:)

```json
// Normalized: { entities: { [type]: { [id]: entity } }, result: [ids] }
{
  "users": { "1": { "id": "1", "name": "Alice" }, "2": { "id": "2", "name": "Bob" } },
  "posts": { "10": { "id": "10", "authorId": "1", "title": "Hello" } }
}
```

**Benefits:** No duplication, O(1) lookup, single update point, consistent cache.

**Libraries:** RTK `createEntityAdapter`, `normalizr`, or manual normalization.

🔥 **Most Asked**: Why normalize, entity format, tools
🧠 **Strategy**: "Normalize to avoid data duplication. entities + ids pattern. createEntityAdapter for Redux"

---

## 147. Avoiding Over-Global State

### Q: What are the dangers of putting too much state in global stores?

**Answer (Interview-Ready):**

**Signs of over-global state:**
- Every component reads from global store
- Simple form inputs connected to Redux
- Server cache duplicated in global state
- State that only one component uses is global

**Problems:**
| Issue | Impact |
|-------|--------|
| Performance | Every global state change triggers subscriber checks |
| Complexity | Hard to trace which component modifies what |
| Testing | Components can't be tested in isolation |
| Coupling | Components tightly coupled to store structure |

**Fix — right state for the right scope:**
```
Local → useState (component-specific)
Shared siblings → lift state up
Subtree → Context (few consumers)
Distant components → Zustand/Redux (many consumers)
Server data → TanStack Query (not global state!)
URL → useSearchParams
```

🔥 **Most Asked**: Signs of over-globalizing, right scope for state
🧠 **Strategy**: "Most state should be local. Server state → TanStack Query. Only truly shared client state → global store"

---

## 148. Performance Impact of State Changes

### Q: How do state changes impact rendering performance and how do you optimize?

**Answer (Interview-Ready):**

**State write → re-render → reconciliation → DOM update**

| State Tool | Re-render Scope |
|-----------|----------------|
| useState | Current component + all children |
| useContext | ALL consumers (even if they only read unchanged slice) |
| Redux useSelector | Only if selector result changes (===) |
| Zustand selector | Only if selector result changes |
| Signals | Only components reading that specific signal |

**Optimization strategies:**
1. **Selectors** — subscribe to smallest possible slice
2. **React.memo** — prevent child re-renders when parent updates
3. **Atomic state** (Jotai) — each atom independently subscribes
4. **Signals** — finest granularity (Angular/Preact/Solid)
5. **useDeferredValue** — defer expensive re-renders

```tsx
// ❌ Subscribing to entire store
const { user, theme, cart } = useStore();  // Re-renders on ANY change

// ✅ Selecting specific slice
const user = useStore(state => state.user);  // Re-renders only on user change
```

🔥 **Most Asked**: Re-render scope per tool, selector pattern, signals advantage
🧠 **Strategy**: "Use selectors to narrow subscription scope. React.memo for children. Signals give finest granularity. Profile before optimizing"

---

# Part P — API Consumption (Topics 149–151)

---

## 149. REST API Consumption Patterns

### Q: What are best practices for consuming REST APIs in a frontend application?

**Answer (Interview-Ready):**

**API client abstraction:**
```ts
// Centralized API client with interceptors
class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) { this.baseUrl = baseUrl; }
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAuthToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });
    
    if (response.status === 401) { refreshToken(); throw new AuthError(); }
    if (!response.ok) throw new ApiError(response.status, await response.json());
    return response.json();
  }
  
  get<T>(endpoint: string) { return this.request<T>(endpoint); }
  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }
}

const api = new ApiClient('https://api.example.com');
```

**Best practices:**
| Practice | Why |
|----------|-----|
| Centralized client | Single place for auth, headers, error handling |
| Type-safe responses | TypeScript generics for API types |
| Request cancellation | AbortController + cleanup |
| Error classification | Network vs 4xx vs 5xx → different UI responses |
| Request/response interceptors | Auth refresh, logging, retry |

🔥 **Most Asked**: API client architecture, error handling, auth interceptors
🧠 **Strategy**: "Centralized API client with interceptors. Type-safe responses. AbortController for cancellation"

---

## 150. GraphQL in Frontend Systems

### Q: How does GraphQL consumption differ from REST in frontends?

**Answer (Interview-Ready):**

| Aspect | REST | GraphQL |
|--------|------|---------|
| Data shape | Server decides | Client decides (query exactly what you need) |
| Over/under-fetching | Common | Eliminated |
| Multiple resources | Multiple requests | Single request |
| Caching | HTTP cache (simple) | Normalized cache (complex) |
| Type safety | Requires codegen | Schema-first (built-in) |

```tsx
// Apollo Client
const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
      posts(first: 5) { title createdAt }
    }
  }
`;

function UserProfile({ userId }) {
  const { data, loading, error } = useQuery(GET_USER, { variables: { id: userId } });
  if (loading) return <Skeleton />;
  return <div>{data.user.name} — {data.user.posts.length} posts</div>;
}
```

**Key concepts:**
- **Fragments** — reusable field selections across queries
- **Normalized cache** — Apollo/urql cache by `__typename:id` → automatic UI updates
- **Optimistic updates** — update cache before server confirms
- **Codegen** — generate TypeScript types from schema (`graphql-codegen`)

🔥 **Most Asked**: REST vs GraphQL trade-offs, normalized caching, when to use GraphQL
🧠 **Strategy**: "GraphQL for complex data needs (nested, many relations). REST for simple CRUD. Codegen for type safety"

---

## 151. tRPC & Type-Safe APIs

### Q: What is tRPC and how does it provide end-to-end type safety?

**Answer (Interview-Ready):**

**tRPC = TypeScript-first RPC framework. API types flow from server to client without codegen.**

```ts
// Server (router definition)
const appRouter = router({
  user: {
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return db.users.findUnique({ where: { id: input.id } });
      }),
    create: publicProcedure
      .input(z.object({ name: z.string(), email: z.string().email() }))
      .mutation(async ({ input }) => {
        return db.users.create({ data: input });
      }),
  }
});
export type AppRouter = typeof appRouter;

// Client — full type inference, no codegen!
const { data: user } = trpc.user.getById.useQuery({ id: '123' });
// user is fully typed: { id: string, name: string, email: string }
// input is validated: TypeScript error if wrong shape
```

**tRPC vs REST vs GraphQL:**
| | REST | GraphQL | tRPC |
|-|------|---------|------|
| Type safety | Codegen needed | Codegen needed | **Built-in** (shared types) |
| Schema | OpenAPI (optional) | SDL | TypeScript (Zod) |
| Tooling | Postman, Swagger | Apollo Studio | TypeScript compiler |
| Constraint | Any client | Any client | **TypeScript monorepo only** |

🔥 **Most Asked**: tRPC vs GraphQL, when to use tRPC, TypeScript monorepo requirement
🧠 **Strategy**: "tRPC for TypeScript monorepos — zero codegen, full type safety. GraphQL for multi-client (mobile + web). REST for external APIs"

---

# Part Q — Lists & Pagination (Topics 152–155)

---

## 152. Pagination Strategies

### Q: What are the different pagination strategies for frontend applications?

**Answer (Interview-Ready):**

| Strategy | UX | When |
|----------|------|------|
| **Offset-based** | Page numbers (1, 2, 3...) | Simple, SEO-friendly (e-commerce, search results) |
| **Cursor-based** | "Load more" / infinite scroll | Real-time feeds, large datasets (social media) |
| **Keyset** | Similar to cursor, uses DB index | Optimal DB performance |

```tsx
// Offset-based
const { data } = useQuery({
  queryKey: ['products', page],
  queryFn: () => api.get(`/products?page=${page}&limit=20`)
});

// Cursor-based
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam }) => api.get(`/feed?cursor=${pageParam}&limit=20`),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  initialPageParam: undefined,
});
```

🔥 **Most Asked**: Offset vs cursor, useInfiniteQuery, SEO considerations
🧠 **Strategy**: "Offset for paginated pages (SEO). Cursor for feeds/infinite scroll. Use useInfiniteQuery from TanStack Query"

---

## 153. Infinite Scrolling Design

### Q: How do you implement performant infinite scrolling?

**Answer (Interview-Ready):**

```tsx
function InfiniteFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => api.getFeed({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
  
  // IntersectionObserver to trigger next page
  const observerRef = useRef<IntersectionObserver>();
  const lastItemRef = useCallback((node: HTMLElement | null) => {
    if (isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
    });
    if (node) observerRef.current.observe(node);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);
  
  const allItems = data?.pages.flatMap(page => page.items) ?? [];
  
  return (
    <VirtualList items={allItems}>  {/* Virtualize for performance */}
      {allItems.map((item, i) => (
        <FeedItem key={item.id} item={item}
          ref={i === allItems.length - 1 ? lastItemRef : undefined}
        />
      ))}
    </VirtualList>
  );
}
```

**Key concerns:**
- Combine infinite scroll + virtualization (don't render all fetched items)
- IntersectionObserver for scroll trigger (not scroll events)
- Back navigation: restore scroll position + cached data
- Memory: limit total cached pages (TanStack Query `maxPages` option)

🔥 **Most Asked**: IntersectionObserver trigger, virtualization combo, scroll restoration
🧠 **Strategy**: "IntersectionObserver on last item. Virtualize the list. Cache pages. Limit memory with maxPages"

---

## 154. Cursor-Based vs Offset Pagination Trade-offs

### Q: What are the trade-offs between cursor-based and offset-based pagination?

**Answer (Interview-Ready):**

| | Offset | Cursor |
|-|--------|--------|
| **API** | `?page=3&limit=20` | `?cursor=abc123&limit=20` |
| **Jump to page** | ✅ Easy | ❌ Must traverse sequentially |
| **Real-time data** | ❌ Items shift (page 2 becomes stale) | ✅ Stable (cursor is fixed position) |
| **DB performance** | ❌ `OFFSET 10000` scans 10K rows | ✅ `WHERE id > cursor LIMIT 20` (index) |
| **Total count** | ✅ `COUNT(*)` available | ❌ Expensive or estimated |
| **SEO** | ✅ `?page=3` is indexable | ❌ Not crawlable |

**Problem with offset in real-time feeds:**
```
Page 1: [A, B, C, D, E]  (5 items, offset=0)
  → New item X inserted at top
Page 2: [E, F, G, H, I]  (offset=5, but E was already on page 1!)
  → E is duplicated!
```

**Cursor solves this:** "Give me items after D" → always gets F, G, H, I (no duplicate).

🔥 **Most Asked**: Why cursor for feeds, offset performance at scale, when offset is fine
🧠 **Strategy**: "Cursor for feeds (no duplicates, efficient at scale). Offset for search/e-commerce (jump to page, SEO)"

---

## 155. Debouncing & Throttling (Applied to API Calls)

### Q: How do you apply debouncing and throttling to API calls?

**Answer (Interview-Ready):**

```tsx
// Debounce — wait until user STOPS typing
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDeferredValue(query);  // React way
  
  // Or traditional debounce:
  const debouncedSearch = useMemo(
    () => debounce((q: string) => setDebouncedQuery(q), 300),
    []
  );
  
  const { data } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.search(debouncedQuery),
    enabled: debouncedQuery.length > 2,  // Don't search short queries
  });
}

// Throttle — max 1 call per interval (scroll, resize)
const throttledSave = useMemo(
  () => throttle((data) => api.saveDraft(data), 2000),
  []
);
```

| | Debounce | Throttle |
|--|---------|----------|
| **When** | After inactivity period | At most once per interval |
| **Use case** | Search input, form validation | Scroll events, auto-save, resize |
| **Behavior** | Resets timer on each trigger | First (or last) call in window |

🔥 **Most Asked**: Debounce vs throttle, search input pattern, cancel on unmount
🧠 **Strategy**: "Debounce for search (wait for pause). Throttle for continuous events. Cancel on unmount to prevent memory leaks"

---

# Part R — Advanced Data Patterns (Topics 156–164)

---

## 156. Parallel vs Sequential API Calls

### Q: When should you make API calls in parallel vs sequentially?

**Answer (Interview-Ready):**

```tsx
// Parallel — independent data (preferred for speed)
const [users, products, notifications] = await Promise.all([
  api.getUsers(),
  api.getProducts(),
  api.getNotifications()
]);
// Total time = max(users, products, notifications)

// Sequential — dependent data (B needs A's result)
const user = await api.getUser(userId);
const orders = await api.getOrders(user.accountId);  // Needs user.accountId
// Total time = users + orders

// Parallel with error isolation
const results = await Promise.allSettled([
  api.getUsers(),
  api.getProducts(),
  api.getNotifications()
]);
// Each result: { status: 'fulfilled', value } or { status: 'rejected', reason }
```

**With TanStack Query:**
```tsx
// Parallel — multiple useQuery hooks (React suspends in parallel with Suspense)
const users = useQuery({ queryKey: ['users'], queryFn: getUsers });
const products = useQuery({ queryKey: ['products'], queryFn: getProducts });
// Both fire simultaneously

// Sequential — enabled flag
const user = useQuery({ queryKey: ['user', id], queryFn: () => getUser(id) });
const orders = useQuery({
  queryKey: ['orders', user.data?.accountId],
  queryFn: () => getOrders(user.data!.accountId),
  enabled: !!user.data?.accountId  // Only fetch when user data is available
});
```

🔥 **Most Asked**: Promise.all vs Promise.allSettled, TanStack Query parallel/sequential
🧠 **Strategy**: "Parallel for independent data (Promise.all). Sequential with enabled flag for dependent. Promise.allSettled for error isolation"

---

## 157. Optimistic UI Updates

### Q: How do you implement optimistic updates in a data-fetching architecture?

**Answer (Interview-Ready):**
(Expanded from Topic 282 — now with TanStack Query pattern)

```tsx
const likeMutation = useMutation({
  mutationFn: (postId) => api.likePost(postId),
  
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ['posts'] });
    const previousPosts = queryClient.getQueryData(['posts']);
    
    queryClient.setQueryData(['posts'], (old) =>
      old.map(post => post.id === postId 
        ? { ...post, likes: post.likes + 1, isLiked: true }
        : post)
    );
    return { previousPosts };
  },
  
  onError: (err, postId, context) => {
    queryClient.setQueryData(['posts'], context.previousPosts);  // Rollback
    toast.error('Failed to like');
  },
  
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['posts'] })
});
```

**When to optimistically update:** Low-risk, easily reversible actions (like, toggle, chat message).
**When NOT to:** Payments, destructive actions, complex state changes.

🔥 **Most Asked**: TanStack Query optimistic update pattern, rollback, when to use
🧠 **Strategy**: "onMutate for optimistic update. Save previous for rollback. onSettled to revalidate. Only for low-risk actions"

---

## 158. Error Handling & Retry Strategies

### Q: How do you implement comprehensive error handling and retry for API calls?

**Answer (Interview-Ready):**

```tsx
// TanStack Query — built-in retry with exponential backoff
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: getUsers,
  retry: 3,                              // Retry 3 times
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),  // Exponential backoff
});

// Error classification
function handleApiError(error: ApiError) {
  switch (error.status) {
    case 400: return showValidationErrors(error.body);    // User fix needed
    case 401: return redirectToLogin();                   // Re-auth needed
    case 403: return showForbidden();                     // No retry
    case 404: return show404();                           // No retry
    case 429: return retryAfter(error.headers['Retry-After']); // Rate limited
    case 500: return showServerError();                   // Retry with backoff
    default: return showGenericError();
  }
}
```

**Error boundary + query error:**
```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<Skeleton />}>
    <UserProfile />  {/* useQuery with throwOnError: true */}
  </Suspense>
</ErrorBoundary>
```

🔥 **Most Asked**: Retry strategy, error classification, error boundary integration
🧠 **Strategy**: "Classify errors (4xx = don't retry, 5xx = retry with backoff). Error boundaries for render errors. TanStack Query for fetch retries"

---

## 159. API Contracts & Versioning

### Q: How do you manage API contracts and versioning in frontend applications?

**Answer (Interview-Ready):**

**API contract approaches:**
| Approach | Tool | Benefit |
|----------|------|---------|
| OpenAPI (Swagger) | `openapi-typescript` | Generate types from spec |
| GraphQL Schema | `graphql-codegen` | Generate types + hooks |
| tRPC | TypeScript inference | Zero-codegen type sharing |
| JSON Schema | `json-schema-to-typescript` | Validate at runtime |

**Versioning strategies:**
```
URL-based:     /api/v1/users, /api/v2/users
Header-based:  Accept: application/vnd.myapp.v2+json
Query param:   /api/users?version=2
```

**Frontend handling:**
```ts
const API_VERSION = 'v2';
const apiClient = new ApiClient(`/api/${API_VERSION}`);

// Or: adapter pattern for backward compatibility
function adaptUserResponse(response: UserV1 | UserV2): User {
  if ('fullName' in response) return response;  // v2
  return { ...response, fullName: `${response.firstName} ${response.lastName}` };  // v1
}
```

🔥 **Most Asked**: Versioning strategies, codegen for type safety, handling breaking changes
🧠 **Strategy**: "OpenAPI + codegen for REST. GraphQL codegen for GraphQL. tRPC for monorepos. URL versioning is simplest"

---

## 160. Request Deduplication

### Q: How do you prevent duplicate API requests in a frontend?

**Answer (Interview-Ready):**

```tsx
// TanStack Query — automatic dedup
// 10 components call useQuery(['users']) → 1 request
const { data } = useQuery({ queryKey: ['users'], queryFn: getUsers });

// Manual dedup with in-flight map
const inFlight = new Map<string, Promise<any>>();

async function deduplicatedFetch(url: string): Promise<any> {
  if (inFlight.has(url)) return inFlight.get(url)!;  // Return existing promise
  
  const promise = fetch(url).then(r => r.json()).finally(() => inFlight.delete(url));
  inFlight.set(url, promise);
  return promise;
}

// Next.js App Router — fetch memoization
// Same fetch(url) in multiple Server Components → one request per render
```

🔥 **Most Asked**: TanStack Query dedup, manual implementation, Next.js fetch memo
🧠 **Strategy**: "TanStack Query deduplicates by queryKey automatically. For custom: use in-flight Map pattern"

---

## 161. Client-Side Rate Limiting

### Q: How do you rate-limit API calls from the frontend?

**Answer (Interview-Ready):**
(Detailed implementation in Topic 291. Quick summary:)

- **Debounce** for input-triggered calls (search, validation)
- **Throttle** for continuous events (scroll, resize)
- **Request queue** with concurrency limit for batched operations
- **Token bucket** for precise rate control

```tsx
// Request queue (limit concurrent requests)
const queue = new RequestQueue(3);  // Max 3 concurrent
await queue.add(() => fetch('/api/resource'));
```

🔥 **Most Asked**: Debounce vs throttle vs queue, when to use each
🧠 **Strategy**: "Debounce for input, throttle for events, queue for concurrency control"

---

## 162. Circuit Breaker Pattern (Frontend)

### Q: How do you implement a circuit breaker for frontend API calls?

**Answer (Interview-Ready):**

```ts
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,    // Failures before opening
    private timeout: number = 30000   // Time before half-open
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'half-open';  // Try one request
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() { this.failures = 0; this.state = 'closed'; }
  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) this.state = 'open';
  }
}

// Usage
const breaker = new CircuitBreaker(5, 30000);
const data = await breaker.execute(() => api.getUsers());
```

🔥 **Most Asked**: Circuit breaker states, frontend implementation, when to use
🧠 **Strategy**: "Closed → Open (after N failures) → Half-Open (test one request). Prevents hammering a failing API"

---

## 163. Graceful API Degradation

### Q: How does a frontend gracefully degrade when APIs fail?

**Answer (Interview-Ready):**

| Strategy | Implementation |
|----------|---------------|
| **Stale data** | Show cached data with "Last updated: 5 min ago" banner |
| **Fallback UI** | Show static/default content instead of empty state |
| **Feature disabling** | Hide features dependent on failed API |
| **Queue actions** | Store user actions, replay when API recovers |
| **Offline mode** | Service Worker serves from cache |

```tsx
function Dashboard() {
  const { data, error, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    placeholderData: keepPreviousData,  // Show stale data during refetch
  });
  
  return <>
    {error && <Banner>Dashboard may be outdated (last updated {formatTime(dataUpdatedAt)})</Banner>}
    {data ? <DashboardGrid data={data} /> : <DashboardFallback />}
  </>;
}
```

🔥 **Most Asked**: Stale data strategy, offline mode, user communication
🧠 **Strategy**: "Show stale > show nothing. Communicate degradation to user. Disable non-critical features. Queue writes for replay"

---

## 164. Skeleton Loaders & Loading State Strategy

### Q: How do you design an effective loading state strategy?

**Answer (Interview-Ready):**

| Technique | When |
|-----------|------|
| **Skeleton** | Known layout (cards, lists) — shows shape of content |
| **Spinner** | Unknown layout or short wait (< 300ms don't show anything) |
| **Progress bar** | Long operations with measurable progress (upload, install) |
| **Optimistic** | Instant feedback (like, toggle) — show result immediately |
| **Streaming** | SSR — show parts of page as they become ready |

```tsx
// Skeleton that matches final layout
function UserCardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton skeleton-avatar" />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
      <div className="skeleton skeleton-text" style={{ width: '80%' }} />
    </div>
  );
}

// Delay showing spinner (avoid flash for fast loads)
function SmartSpinner({ delay = 300 }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return show ? <Spinner /> : null;
}
```

**CLS prevention:** Skeletons should match final content dimensions exactly.

🔥 **Most Asked**: Skeleton vs spinner, avoiding flash, CLS from loading states
🧠 **Strategy**: "Skeleton for known layouts. Delay spinner 300ms (avoid flash). Match skeleton to final dimensions (no CLS)"

---

# Coverage Summary — File 07

| Section | Topics | Count |
|---------|--------|-------|
| Part A: Angular Architecture | 59–62 | 4 |
| Part B: Angular Change Detection | 63–66 | 4 |
| Part C: RxJS Mastery | 67–72 | 6 |
| Part D: Angular State Management | 73–76 | 4 |
| Part E: Angular Performance | 77–80 | 4 |
| Part F: React Internals | 81–86 | 6 |
| Part G: React Hooks Deep Dive | 87–96 | 10 |
| Part H: React 18 & 19 Features | 97–103 | 7 |
| Part I: React Patterns | 104–110 | 7 |
| Part J: Redux & Redux Toolkit | 111–117 | 7 |
| Part K: Next.js App Router | 118–127 | 10 |
| Part L: React Performance Patterns | 128–135 | 8 |
| Part M: State Fundamentals | 136–139 | 4 |
| Part N: State Tools & Patterns | 140–145 | 6 |
| Part O: State at Scale | 146–148 | 3 |
| Part P: API Consumption | 149–151 | 3 |
| Part Q: Lists & Pagination | 152–155 | 4 |
| Part R: Advanced Data Patterns | 156–164 | 9 |
| **Total** | | **106** |

---

| ← Previous | [00_MASTER_INDEX.md](00_MASTER_INDEX.md) | Next → |
|:---|:---:|---:|
| [06_JS_Browser_TypeScript.md](06_JS_Browser_TypeScript.md) | **File 07 of 10** | [08_Performance_Quality.md](08_Performance_Quality.md) |
