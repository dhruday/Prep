# RxJS — Subject, BehaviorSubject, ReplaySubject, AsyncSubject
> Part 12 — Frontend Architecture — Module 12.5: RxJS Mastery
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Subject**: both Observable AND Observer; push values to multiple subscribers simultaneously (multicast); NO buffer — late subscribers miss all past values; use for fire-and-forget events (button triggers, form reset signals, notification hubs)
- **BehaviorSubject(initialValue)**: Subject with MEMORY of ONE value — replays the latest value to any new subscriber; has synchronous `getValue()` method; requires an initial value; the canonical pattern for any shared state (auth status, cart count, user preferences, selected filters); use `.asObservable()` to expose read-only stream from a service
- **ReplaySubject(bufferSize, windowTime?)**: buffers last `n` values and replays ALL of them to any new subscriber; `ReplaySubject(1)` behaves like BehaviorSubject but without requiring an initial value; `ReplaySubject(5)` = rolling 5-value history; use for message history, audit logs, undo stacks
- **AsyncSubject**: emits ONLY the last value, and ONLY when `complete()` is called; subscribers who joined before completion receive the single last value; rarely used directly — behaves like a Promise (resolve once, done); use for "run once and cache the final result" scenarios
- **Key interview differentiator**: BehaviorSubject vs Subject is the most common RxJS interview question — the answer is always about whether new subscribers need the current state (BehaviorSubject) or just future events (Subject)
- **`.asObservable()` rule**: services should NEVER expose Subject/BehaviorSubject directly; expose only `.asObservable()` so consumers can subscribe but cannot call `next()` from outside (encapsulation)
- ✅ **Hruday's anchor**: SAP approvals — BehaviorSubject for workflow state machine; Bosch dashboard — ReplaySubject(10) for alarme history visible to late-mounted widgets

---

## 1. One-Line Definition
Subject types are hot multicasting Observable sources that differ in how many past values they replay to new subscribers: Subject (none), BehaviorSubject (one — the current value), ReplaySubject(n) (last n values), and AsyncSubject (one — only on completion) — making them the primary tool for sharing state and events across Angular components without prop drilling.

---

## 2. The Problem It Solves

Without Subjects, Angular components in separate branches of the component tree have no mechanism to share state or communicate. Parent-to-child data flow uses `@Input()`/`input()`. Child-to-parent uses `@Output()`/`EventEmitter`. But sibling-to-sibling and distant component communication (navbar badge ↔ cart service ↔ checkout page) has no direct decorator-based solution.

Subjects, wrapped in Angular services, provide the shared reactive state bus. A `CartService` with a `BehaviorSubject<CartItem[]>` becomes the single source of truth for cart state. Any component — NavBar, CartPage, CheckoutSummary — subscribes to the same Observable. Any component that calls `cartService.addItem()` updates the Subject, and ALL subscribers are notified simultaneously. This is the foundation of services-as-state-managers in Angular (before NgRx/Signals were widely adopted).

---

## 3. How It Works Internally

### Subject Types Comparison

```
SUBJECT TYPE     | BUFFER SIZE | REQUIRES INITIAL | WHEN NEW SUBSCRIBER GETS
-----------------|-------------|------------------|----------------------------------
Subject          | 0           | No               | Only future values
BehaviorSubject  | 1           | Yes              | Current value IMMEDIATELY + future
ReplaySubject(n) | n           | No               | Last n values + future
AsyncSubject     | 1           | No               | Last value ONLY when complete() called

Timeline illustration:

Stream:  A emitted [1, 2, 3], then NEW SUBSCRIBER B joins, then [4, 5] emitted

Subject:
  A sees: 1, 2, 3, 4, 5
  B sees:          4, 5   ← missed 1, 2, 3

BehaviorSubject (current = 3):
  A sees: 1, 2, 3, 4, 5
  B sees:       3, 4, 5   ← gets current value (3) immediately, then future

ReplaySubject(2):
  A sees: 1, 2, 3, 4, 5
  B sees:    2, 3, 4, 5   ← replays last 2 (2, 3), then future

ReplaySubject(9999):
  B sees: 1, 2, 3, 4, 5   ← replays all history (effectively infinite buffer)

AsyncSubject:
  Stream emits 1, 2, 3 → complete() called
  A sees: 3              ← only the LAST value on completion
  B sees: 3              ← also gets the last value (it completed before B subscribed)
  (If complete() hasn't been called yet: B gets nothing until/if complete() fires)
```

---

## 4. The Code

### Wrong Way — Exposed Subject and Wrong Subject Type

```typescript
// ❌ WRONG — Subject exposed directly (callers can call .next() from outside)
@Injectable({ providedIn: 'root' })
export class OrderStatusService {
  // ❌ Public Subject — any component can push arbitrary values:
  public readonly orderStatus$ = new Subject<OrderStatus>();
  // Any consuming component can do: orderStatusService.orderStatus$.next(anyValue)
  // This breaks encapsulation — the service loses control over what values are valid
  // and when state transitions are allowed.
}

// ❌ WRONG — Subject used for state that requires current value on subscription

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // ❌ Subject: no replay → late subscribers miss current theme
  private readonly _theme$ = new Subject<'light' | 'dark'>();
  readonly theme$ = this._theme$.asObservable();
  
  setTheme(theme: 'light' | 'dark') {
    this._theme$.next(theme);
    localStorage.setItem('theme', theme);
  }
}

// ❌ Problem: AppComponent initializes ThemeService and calls setTheme('dark').
// ChildComponent renders later and subscribes to theme$ → gets NOTHING.
// It starts with the wrong theme until the next setTheme() call.
// BehaviorSubject is required here because theme is STATE, not an EVENT.

// ❌ WRONG — getValue() misuse outside injection/subscription context
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user$ = new BehaviorSubject<User | null>(null);
  
  // ❌ Exposing getValue() as a synchronous property — encourages imperative style
  // and bypasses the reactive contract
  get currentUser(): User | null {
    return this._user$.getValue();
  }
  
  checkPermission(feature: string): boolean {
    const user = this._user$.getValue(); // ← Synchronous read of reactive state
    // This is fine for a single synchronous check.
    // But if called repeatedly, it won't recompute when user changes.
    // Components using this.authService.checkPermission() won't react to user changes.
    return user?.permissions?.includes(feature) ?? false;
  }
}
// Engineers who see getValue() start writing imperative code that doesn't react to
// state changes. Prefer exposing Observable<boolean> from a pipe on the BehaviorSubject.
```

> **Why this fails:** exposed Subject allows external callers to push invalid state. Subject for state means late-joining components miss the current value. Overusing `getValue()` leads to non-reactive imperative patterns that don't update on state change.

### Right Way — Encapsulated BehaviorSubject State Machine

```typescript
// ✅ RIGHT — Proper BehaviorSubject service pattern

// auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Private Subject — only this service can push values
  private readonly _currentUser$ = new BehaviorSubject<User | null>(null);
  private readonly _authLoading$ = new BehaviorSubject<boolean>(true);
  
  // Public Observables (read-only)
  readonly currentUser$ = this._currentUser$.asObservable();
  readonly authLoading$ = this._authLoading$.asObservable();
  
  // Derived Observables (computed from state)
  readonly isLoggedIn$ = this._currentUser$.pipe(map(user => user !== null));
  readonly isAdmin$ = this._currentUser$.pipe(map(user => user?.role === 'ADMIN'));
  readonly userPermissions$ = this._currentUser$.pipe(
    map(user => user?.permissions ?? [])
  );
  
  constructor(private http: HttpClient) {
    // Load auth state on service initialization
    this.restoreSession();
  }
  
  private async restoreSession() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      this._authLoading$.next(false);
      return;
    }
    
    try {
      const user = await firstValueFrom(
        this.http.get<User>('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      this._currentUser$.next(user);
    } catch {
      localStorage.removeItem('authToken');
    } finally {
      this._authLoading$.next(false);
    }
  }
  
  login(credentials: LoginRequest): Observable<void> {
    return this.http.post<AuthResponse>('/api/auth/login', credentials).pipe(
      tap(response => {
        localStorage.setItem('authToken', response.token);
        this._currentUser$.next(response.user);
        // All subscribers (NavBar, guards, profile page) are notified simultaneously
      }),
      map(() => void 0)
    );
  }
  
  logout() {
    localStorage.removeItem('authToken');
    this._currentUser$.next(null); // All subscribers immediately lose current user
    // Authentication guards re-evaluate, NavBar updates, profile page redirects — all reactive
  }
  
  // Expose hasPermission as Observable for reactive checking
  hasPermission$(permission: string): Observable<boolean> {
    return this.userPermissions$.pipe(
      map(permissions => permissions.includes(permission)),
      distinctUntilChanged()  // Only emit when value changes (true→false or false→true)
    );
  }
}

// Component subscribing — always gets current state immediately:
@Component({
  standalone: true,
  imports: [AsyncPipe, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="auth.currentUser$ | async as user; else loginBtn">
      <span>Welcome, {{ user.name }}</span>
    </ng-container>
    <ng-template #loginBtn><button (click)="login()">Log in</button></ng-template>
  `
})
export class NavBarComponent {
  constructor(public auth: AuthService) {}
  // BehaviorSubject: shows current user on first render
  // No timing dependency — works whether user logged in before or after NavBar mounted
}


// ✅ RIGHT — ReplaySubject for notification/event history

@Injectable({ providedIn: 'root' })
export class NotificationService {
  // Last 5 notifications — replay to any widget that mounts later
  private readonly _notifications$ = new ReplaySubject<Notification>(5);
  
  readonly notifications$ = this._notifications$.asObservable();
  
  // ReplaySubject for "recent critical alerts" with time window:
  // Only replay notifications from the last 60 seconds to new subscribers:
  private readonly _criticalAlerts$ = new ReplaySubject<Alert>(
    100,        // Buffer up to 100 items
    60_000      // ... but only for the last 60,000ms (60 seconds)
  );
  readonly criticalAlerts$ = this._criticalAlerts$.asObservable();
  
  notify(message: string, type: 'info' | 'warning' | 'error') {
    const notification: Notification = {
      id: crypto.randomUUID(),
      message,
      type,
      timestamp: Date.now()
    };
    this._notifications$.next(notification);
    
    if (type === 'error') {
      this._criticalAlerts$.next({ ...notification, critical: true });
    }
  }
}

// A toast container that mounts after app start:
// New subscriber gets the last 5 notifications immediately (in case they're still relevant)
// Then receives all future notifications


// ✅ RIGHT — Subject for events (not state)

@Injectable({ providedIn: 'root' })
export class FormResetService {
  // Subject is CORRECT here — resetting a form is an EVENT, not a STATE
  // Components respond to the reset event; late subscribers don't need the "last reset"
  private readonly _reset$ = new Subject<string>(); // payload: form ID
  
  readonly reset$ = this._reset$.asObservable();
  
  resetForm(formId: string) {
    this._reset$.next(formId);
  }
}

// ✅ RIGHT — Subject-based workflow event bus

@Injectable({ providedIn: 'root' })
export class WorkflowEventBus {
  // Subject: events don't need replay — fire and subscribers respond
  private readonly _approvalEvents$ = new Subject<ApprovalEvent>();
  
  readonly approvalEvents$ = this._approvalEvents$.asObservable();
  
  // Type-specific streams via filter:
  readonly approvalSubmitted$ = this._approvalEvents$.pipe(
    filter(e => e.type === 'SUBMITTED')
  );
  readonly approvalRejected$ = this._approvalEvents$.pipe(
    filter(e => e.type === 'REJECTED')
  );
  
  publish(event: ApprovalEvent) {
    this._approvalEvents$.next(event);
  }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you use BehaviorSubject over Subject in a service?"

**Hruday's answer:**
> The distinction is between STATE and EVENTS.
>
> Use BehaviorSubject when the service manages STATE — a value that has a meaningful "current" at any point in time, and that new subscribers need to know as soon as they subscribe. Examples: current logged-in user, cart item count, selected theme, active tab index, page loading status. The key question: "If a new component subscribes right now, does it need to see the current value to function correctly?" If yes, BehaviorSubject.
>
> Use Subject when the service publishes EVENTS — one-time occurrences where late subscribers shouldn't react. Examples: form reset triggered, button debounce event, modal dismissed, file upload started. The key question: "Should a component that starts listening AFTER this event was fired respond to it?" If no, Subject.
>
> The practical rule I follow: if I can describe the stored value as "the current X" (current user, current cart, current filter state), it's BehaviorSubject. If I can describe it as "X happened" (button clicked, reset triggered, file uploaded), it's Subject. Getting this wrong produces the "shows nothing until next update" bug — which I once had to fix for a Capgemini team where their cart count showed 0 on refresh because a Subject was mixing up state and events.

---

### Q2 — SAP Experience
**Interviewer asks:** "Describe how you've used Subjects in a production Angular application."

**Hruday's answer:**
> At SAP, the invoice approval workflow had a multi-step state machine: Draft → Submitted → Under Review → Approved/Rejected → Archived. The current approval step and status were shared across three Angular components: the step indicator in the header, the form body with contextual fields, and the action button bar.
>
> I used a BehaviorSubject for the workflow state because all three components needed to know the current state the moment they mounted. The `WorkflowService` held `private readonly _state$ = new BehaviorSubject<WorkflowState>(initialState)`. Each component subscribed with the `async` pipe and got the current state immediately — no "flash of wrong state" where a component would briefly show the wrong step before the first update arrived.
>
> For cross-component events — like "user submitted form" or "approver rejected" — I used a plain Subject. These were fire-and-forget events. When a rejection happened, the Subject emitted, the relevant components reacted, and the workflow state BehaviorSubject was updated in response. The rejection event itself didn't need to be replayed to any component that mounted later; the resulting STATE CHANGE (BehaviorSubject update) served that purpose.
>
> The combination: BehaviorSubject for state (what is the current workflow status?), Subject for events (what just happened?) — gave us a clean, reactive cross-component coordination model without NgRx.

---

### Q3 — Deep Dive
**Interviewer asks:** "ReplaySubject(1) vs BehaviorSubject — when would you choose one over the other?"

**Hruday's answer:**
> Both replay one value to new subscribers, so they behave identically for normal subscription patterns. The difference is in two areas: initial value and timing of first emission.
>
> BehaviorSubject requires an initial value at construction time. If you don't have a meaningful default, you're forced to use null or undefined as the initial value, and consumers must handle that null case. For example, `new BehaviorSubject<User | null>(null)` — every subscriber must handle the null case before the real user is loaded.
>
> ReplaySubject(1) has no initial value. New subscribers get nothing until the first `next()` call. This is appropriate when there's genuinely no valid initial state — for example, the first product search results don't exist until the user types something. `ReplaySubject(1)` correctly emits "nothing" until results arrive, rather than emitting a fake empty-array initial value.
>
> My decision rule: if the state has a valid, meaningful initial value (empty array, null user, 'light' theme), use BehaviorSubject with that value. The synchronous `getValue()` method is a bonus — it lets guards and interceptors read current state without subscribing. If there's no valid initial value and emitting prematurely would be wrong, use `ReplaySubject(1)`. The practical implication: in Angular DI, initializing services before async data loads usually means BehaviorSubject with null/default is the right choice for current-user-type state.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Expose BehaviorSubject publicly in service" | "I make the BehaviorSubject public so components can subscribe to it" | ALWAYS expose only `.asObservable()` from a service; if the BehaviorSubject itself is public, any component can call `bSubject.next(wrongValue)` — bypassing any validation logic in the service; this causes hard-to-trace state corruption bugs; the pattern: `private readonly _state$ = new BehaviorSubject<State>(...)` and `readonly state$ = this._state$.asObservable()` — service controls writes, consumers can only read |
| "getValue() is the same as subscribing" | "I use getValue() to get the current value" | `getValue()` returns the synchronously stored value at that instant — it does NOT set up reactive tracking; code that reads `myBehaviorSubject.getValue()` won't re-run when the value changes; it's useful only for one-time synchronous reads (like in an HTTP interceptor reading the current auth token); using `getValue()` in a template or rendering logic prevents the component from reacting to future state changes; subscribe (or use `async` pipe) for anything that should react to value changes |
| "ReplaySubject(1) is always better than BehaviorSubject" | "I use ReplaySubject(1) instead of BehaviorSubject since it's more flexible" | They're NOT equivalent operationally; BehaviorSubject has `getValue()` for synchronous reads (critical for guards/interceptors needing current state without subscribing); BehaviorSubject throws if `next()` is called after `error()` (Subject contract violation signal); BehaviorSubject signals intent ("this is current state with a meaningful default"); ReplaySubject signals intent more like "here is a buffer" — for true state management in services, BehaviorSubject is semantically clearer and has the `getValue()` advantage |
| "Subject completes automatically" | "I don't need to complete the Subject when a service is destroyed" | Root-scoped Services (`providedIn: 'root'`) live for the app's lifetime — Subject cleanup is usually not needed; but component-scoped or module-scoped services DO get destroyed; a Subject that's never completed holds open subscriptions from components that have already been destroyed but whose subscription callback keeps a closure reference to the destroyed component; always complete Subjects in `ngOnDestroy` of non-singleton services: `this._state$.complete()` — this triggers `complete` on all subscribers, allowing `takeUntil` / `takeWhile` operators to clean up gracefully |

---

## 7. Hruday's Real Experience Hook
> "The SAP workflow BehaviorSubject state machine is the example I always reach for because it illustrates the BehaviorSubject's key value proposition so concretely: zero race-condition risk on component mounting.
>
> Before we moved to BehaviorSubject, the workflow used a regular Subject plus an initial REST API call in each component's `ngOnInit`. Each of the three components (step header, form body, action bar) independently called the API on mount. Three API calls per page load. And there was a brief moment — maybe 200ms — where the components were mounted but the API responses hadn't arrived. During that window, the action bar was showing the wrong buttons for the wrong workflow step.
>
> BehaviorSubject eliminated the problem structurally. The `WorkflowService` fetches state ONCE on initialization and emits it to the BehaviorSubject. Every component that subscribes — regardless of when it mounts — immediately receives the current workflow state. One API call total, no race conditions, no loading flash.
>
> The other pattern I've used consistently is `asObservable()` for service encapsulation. Early in my career I saw a bug where a junior developer called `headerStateSubject.next(null)` from a component on a whim — clearing the navigation state app-wide. After that I've been strict: all Subjects in services are private; only the `.asObservable()` is exposed. The compile error ("Property 'next' does not exist on type 'Observable'") is the guard.

---

## 8. Scale Evolution

**Small app →** BehaviorSubject per major state slice (auth, cart, theme); Subject for UI events (modal shown/hidden, form reset); expose `.asObservable()` always.

**Medium Angular app →** dedicated ServiceState class pattern — service holds BehaviorSubject of a rich state object, exposes computed Observables for specific slices; `map + distinctUntilChanged` for derived state to prevent unnecessary emissions.

**Large-scale app (approaching NgRx territory) →** BehaviorSubject-based state becomes error-prone at scale; consider signals (Angular 17+) for local component state and BehaviorSubject for cross-service shared state; or adopt NgRx for complex state with many transitions and a need for Redux DevTools time-travel debugging; the BehaviorSubject patterns learned here directly translate to understanding NgRx Store's internal implementation (which uses a BehaviorSubject under the hood).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment step state machine (BehaviorSubject for current checkout step — components always see correct step); transaction event stream (Subject for transaction Posted/Credited/Failed events); auth state with BehaviorSubject for immediate guard checks | BehaviorSubject for payment state; asObservable encapsulation; Subject for payment events |
| Swiggy / Meesho | Cart BehaviorSubject shared across product listing, cart drawer, checkout; delivery update Subject events; ReplaySubject for last 5 order status messages (notification toasts visible to late-mounted notification components) | State vs event distinction; ReplaySubject with window time for recent notifications |
| Adobe / Microsoft | Document collaboration state (BehaviorSubject for current doc state); cursor position events (Subject — late subscribers don't need where cursor WAS, only where it IS); undo/redo history (ReplaySubject for operation log) | Full four-Subject-type fluency; replay semantics for audit/undo scenarios |
| SAP Labs | Direct experience: SAP invoice approval BehaviorSubject state machine; WorkflowEventBus with Subject; ReplaySubject(10) for alarm history in Bosch dashboard late-mounted widgets; `.asObservable()` encapsulation as SAP code review standard | Real production state machine story; encapsulation discipline; explicit state vs event reasoning |

---

## 10. Related Topics — What to Study Next

- **Topic 219 — Cold vs Hot Observables** — Subjects ARE hot Observables; understanding cold vs hot explains WHY Subjects have the semantics they do (late subscribers miss values: because the Subject is hot, the producer runs independently of subscription count); BehaviorSubject's replay-on-subscribe is a modification of the hot base behaviour; these two topics are conceptual complements — cold/hot is the theory, Subject types are the practice
- **Topic 222 — takeUntil Memory Leak Prevention** — subjects in component-level services (non-singleton) require explicit cleanup; the `takeUntil(destroy$)` pattern applied to BehaviorSubject subscriptions from OTHER services prevents the subscribing component from leaking; the component subscribes to `authService.currentUser$` (a BehaviorSubject in a root service) — this subscription must be cleaned up when the component is destroyed or the component exists as a garbage-collected zombie
- **Topic 223 — combineLatest, forkJoin, withLatestFrom** — combination operators work with Subjects/BehaviorSubjects as inputs; `combineLatest([userSubject$, cartSubject$])` will emit when EITHER emits; `withLatestFrom(userSubject$)` reads the CURRENT value from a BehaviorSubject only when the primary stream emits; knowing Subject types clarifies when combination operators are safe (BehaviorSubject always has a value = combineLatest will emit immediately for all active BehaviorSubjects)
- **Topic 218 — Angular Signals v17+** — BehaviorSubject and signal serve overlapping roles (both hold current state and notify dependants); signals are the Angular 17+ preferred mechanism for component-local state; BehaviorSubject remains the preferred mechanism for cross-service shared state and Observable pipelines; `toSignal(behaviorSubject$)` is the bridge; understanding both and knowing when to use which is a senior Angular developer competency

---

*Part 12 · RxJS — Subject, BehaviorSubject, ReplaySubject · Full Stack Interview Guide · Hruday D · 2026*
