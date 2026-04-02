# 67. Cold vs Hot Observables
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

A cold Observable starts a new producer for every subscriber — like a Netflix video that starts from the beginning each time you press play. A hot Observable shares a single producer across all subscribers — like a live TV broadcast where you join the stream mid-way. `HttpClient.get()` is cold — every subscription triggers a separate HTTP request. A `BehaviorSubject` is hot — all subscribers receive the same stream. At Bosch, understanding this distinction was critical: accidentally subscribing to an HTTP Observable twice (once in the template via `async` pipe, once in `ngOnInit`) made two separate API calls. `shareReplay(1)` solved it by making the stream hot.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

The cold/hot distinction describes the **relationship between subscription and producer execution**.

- **Cold Observable:** The producer (data source) is created *inside* the Observable's subscribe function. Each subscription creates a new independent producer. Subscribing = starting the work.
- **Hot Observable:** The producer exists *outside* the Observable. The Observable is a transparent wrapper around an already-running stream. Subscribing = joining the stream wherever it currently is.

### How It Works Internally

**Cold Observable anatomy:**

```typescript
// The "factory" lives INSIDE the subscribe call
const cold$ = new Observable<number>(subscriber => {
  // This code runs for EVERY subscription
  console.log('Producer started');
  let count = 0;
  const interval = setInterval(() => subscriber.next(count++), 1000);
  return () => clearInterval(interval);  // teardown per subscriber
});

cold$.subscribe(v => console.log('Sub A:', v));  // starts new interval
cold$.subscribe(v => console.log('Sub B:', v));  // starts ANOTHER new interval
// Output: two independent counter streams, Producer started printed twice
```

**Hot Observable anatomy:**

```typescript
// Producer exists OUTSIDE, Observable just forwards
const ws = new WebSocket('wss://example.com');  // one connection, created once

const hot$ = new Observable<MessageEvent>(subscriber => {
  // Just attaches a listener to the existing producer
  const handler = (event: MessageEvent) => subscriber.next(event);
  ws.addEventListener('message', handler);
  return () => ws.removeEventListener('message', handler);
});

hot$.subscribe(v => console.log('Sub A:', v.data));  // joins existing stream
hot$.subscribe(v => console.log('Sub B:', v.data));  // joins same stream
// One WebSocket, two listeners. Both see same messages in real-time.
```

**Making cold into hot — `share()` family:**

| Operator | Behaviour | Use case |
|---|---|---|
| `share()` | Multicasts, unsubscribes from source when last subscriber leaves | Event streams with variable subscriber count |
| `shareReplay(n)` | Multicasts + replays last n emissions to new subscribers | HTTP data caching, state streams |
| `publish()` + `connect()` | Manual multicast control | Advanced orchestration |
| `publishReplay(n)` + `refCount()` | Legacy equivalent of `shareReplay` | Old code — prefer `shareReplay` |

**`shareReplay(1)` is the most common pattern in Angular:**

```typescript
// Without shareReplay:
this.user$ = this.http.get<User>('/api/user');
// template: {{ user$ | async }} — one HTTP call
// component: this.user$.subscribe(u => this.form.patchValue(u)) — SECOND HTTP call
// Total: 2 requests

// With shareReplay(1):
this.user$ = this.http.get<User>('/api/user').pipe(shareReplay(1));
// Both subscriptions share ONE HTTP call; second subscriber gets the cached result
// Total: 1 request, both get the response
```

**`Subject` as hot by nature:**
All `Subject` types are inherently hot — they have `next()` called externally, independent of subscribers. Subscribers join the multicast at subscription time.

**`fromEvent()` is inherently hot:**
```typescript
const clicks$ = fromEvent(document, 'click');
// The document already exists; clicks$ just attaches/detaches listeners
// Each subscribe adds a new listener; they all see the same document events
// Unsubscribe removes that individual listener
```

**Ice-cold vs warm warm terminology:**
- "Cold": new execution per subscription
- "Warm" (popularized by Ben Lesh): shares but doesn't replay — `share()`
- "Hot": always running, shares, subscribers join mid-stream — `Subject`, `fromEvent`
- "Lukewarm" (common use): `shareReplay(1)` — replays last value to new subscribers

### Architecture & Component Boundaries

```
Service pattern (Angular best practice):
@Injectable({ providedIn: 'root' })
export class UserService {
  // ❌ Cold — new HTTP call per component subscription
  getUser(): Observable<User> {
    return this.http.get<User>('/api/user');
  }
  
  // ✅ Hot+replay — shared once, cached across all components
  readonly user$: Observable<User> = this.http.get<User>('/api/user').pipe(
    shareReplay(1)
  );
}
```

### Data Flow & State Flow

**Subscription timing matters for hot Observables:**

```
Time →  0     1     2     3     4
Hot:    A  →  B  →  C  →  D  →  E   (continuous stream)

Sub1 at t=0:  receives A, B, C, D, E
Sub2 at t=2:  receives C, D, E  ← missed A, B — no replay
Sub3 with shareReplay(1) at t=2: receives C (replayed), then D, E
```

### Performance Implications

- **Cold HTTP + multiple subscribers** — the #1 unintentional duplicate API call source in Angular. Multiple `async` pipes on the same Observable in a component template each subscribe independently → `n` HTTP requests.
- **`shareReplay(1)` overhead** — minimal. Stores last emission in memory, shares across subscribers. The only concern is memory leaks if subscribers never unsubscribe from a long-running `shareReplay` stream that holds large data.
- **`shareReplay({ bufferSize: 1, refCount: true })` — the memory-safe version** — when `refCount` is true, the source unsubscribes when all consumers unsubscribe, releasing the buffered value.
- **Hot WebSocket streams** — correct by nature for real-time data. One connection serves all components. No explicit multi-cast needed.

### Scalability Considerations

- **Small app:** `shareReplay(1)` on HTTP calls that multiple components consume.
- **Medium app:** Service-level `BehaviorSubject` / `ReplaySubject` as hot state stores — multiple components subscribe, state is shared, no duplicate fetching.
- **Large app:** Proper state management (NgRx, Signal Store) — the state layer IS the hot stream infrastructure. All Angular store implementations are fundamentally hot Observables.

### Trade-offs

| `shareReplay(1)` | `BehaviorSubject` | Choose based on ownership |
|---|---|---|
| Derives value from source Observable | Owns and controls the value | `shareReplay`: caching existing streams |
| Can't push new values manually | `next(v)` to push new values | BehaviorSubject: service-owned state |
| No initial value without first emission | Always has a current value | BehaviorSubject: needs immediate current value |
| Simpler — just an operator | Requires service pattern | `shareReplay`: for HTTP caching |

| Cold Observable | Hot Observable | Choose Hot when |
|---|---|---|
| Independent execution per subscriber | Shared execution across subscribers | Multiple consumers | 
| New data on every subscription | Subscribers may miss past emissions | State streams — use BehaviorSubject for current-value guarantee |
| Safe — no cross-subscriber side effects | Requires multicast architecture | Real-time: WebSocket, events |

### ⚠️ Anti-Patterns & Pitfills

- **`async` pipe on same cold Observable in multiple template locations** — `{{ user$ | async }}` used 3 times = 3 HTTP requests. Assign to a single property with `shareReplay(1)` or restructure template.
- **`shareReplay()` without `refCount: true` on infinite streams** — the source subscription never ends even when all consumers unsubscribe. For `BehaviorSubject`-backed streams this is harmless, but for cold HTTP streams it holds the subscription open permanently.
- **Subscribing once to a cold Observable "ahead of time" to "pre-warm" it** — if no subscribers are listening when the value arrives, the value is lost. Use `BehaviorSubject` or `shareReplay(1)` to ensure late subscribers get the last value.
- **Treating `fromEvent` as cold** — it's hot. If you unsubscribe and resubscribe, you don't get past events. Use `shareReplay(1)` if you need late subscribers to receive the last value.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At Bosch, the dashboard had both a `<header>` component and a `<sidebar>` component that both needed the current user's permissions. Both subscribed to `permissionsService.getPermissions()` — which was cold (a raw `HttpClient.get()`). Result: two API calls on every page load. The fix was `shareReplay(1)` in the service: one HTTP call, both components received the shared response. A secondary benefit was that the second subscriber (sidebar) received the cached response synchronously — no loading delay.

At Oracle, a record detail component had `(record$ | async)` in the template in three places — table header, form, audit log section. Three subscriptions to the same cold Observable → three Spring Boot API calls for the same record. Refactored to `shareReplay(1)` in the service — one call, all three template bindings update simultaneously.

**At FAANG scale:**
- **Microsoft (Azure):** Resource metadata Observable `shareReplay(1)` in the resource service — blade components showing the same resource (overview, metrics, logs) all share one API call per resource load.
- **Adobe (Creative Cloud):** User plan information fetched once and shared across toolbar, file picker, and export dialog via `shareReplay(1)` — no matter how many components mount, one auth-gated API call.
- **Salesforce (CRM):** Org settings and feature flags are hot `BehaviorSubject` streams in their configuration service — any component can subscribe and immediately get the current value without triggering a new fetch.
- **Cisco (WebEx):** Meeting stream events are inherently hot — `fromEvent(meetingSocket, 'participants')` is shared across the participant list, reaction bar, and recording indicator without any explicit multicast.

**How it evolves with scale:**
- Small scale: Often doesn't matter — only one subscriber per Observable anyway.
- Medium scale: `shareReplay(1)` becomes essential when the same data is displayed in multiple places.
- Large scale: Dedicated state management is the answer — NgRx selectors are hot multicast streams by design; component subscriptions to filters are always shared.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "The cold vs hot distinction is about when the producer starts and whether it's shared.
>
> Cold: the Observable factory runs fresh for every subscriber. `HttpClient.get()` is the canonical example — each `.subscribe()` triggers a new HTTP request. This is safe for independent data needs but dangerous when multiple things consume the same Observable.
>
> Hot: the producer exists independently of subscriptions. A WebSocket, a DOM event, a Subject — these run regardless of subscribers. You join mid-stream when you subscribe.
>
> The practical problem I've hit repeatedly: a component subscribes to the same HTTP Observable via `async` pipe in multiple template locations, or once in `ngOnInit` and once in the template. Each `async` pipe subscription is independent — you get duplicate API calls. The fix is `shareReplay(1)` — it makes the cold Observable hot-ish, multicasting one execution to all subscribers and replaying the last value to late subscribers.
>
> At Oracle I had a record detail page with the same cold Observable `async`-piped in three template sections — header, form, audit log. Three API calls per page load. One line of `shareReplay(1)` in the service fixed all three."

### Likely Follow-up Questions

1. **What's the difference between `share()` and `shareReplay(1)`?** → `share()` multicasts but doesn't replay — a late subscriber gets no value until the next emission. `shareReplay(1)` replays the most recent value to new subscribers immediately.
2. **Is `fromEvent()` cold or hot?** → Hot — the DOM event source exists independently; `fromEvent` just attaches and detaches listeners.
3. **What's the memory risk of `shareReplay()`?** → Without `refCount: true`, the source subscription stays alive even when all consumers unsubscribe, potentially holding data indefinitely. Use `shareReplay({ bufferSize: 1, refCount: true })` for long-lived services.
4. **When would you use `cold` Observable intentionally?** → When each subscriber needs independent execution — retry logic per component, independent data fetching with different parameters, each subscription representing a distinct UI interaction.

### vs Alternatives

| Cold Observable | Hot Observable | Signals (Angular 17+) |
|---|---|---|
| New exec per subscriber | Shared exec, join mid-stream | Synchronous read, push-on-write |
| HTTP, timer, file read | WebSocket, DOM events, Subject | Component state, derived values |
| Use `shareReplay` to share | Use Subject to control | Replaces simple hot state patterns |
| Classic RxJS pattern | Classic RxJS pattern | New Angular-native pattern |

### How to Signal Senior Thinking

> "The architectural principle: data that has a natural producer — WebSocket, events, clocks — should be modeled as hot. Data that is fetched on demand — HTTP, file reads — is naturally cold, but may need to be shared via `shareReplay` when multiple consumers need the same result. The state management layer in any mature Angular app (NgRx, BehaviorSubject service, Signal store) is fundamentally hot — it's the shared broadcast network for application state."

---

## 💻 5. Code Example

```typescript
// -------------------------------------------------------
// Cold Observable: HttpClient — each subscribe = new request
// -------------------------------------------------------
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  // ❌ Cold — each subscribe triggers HTTP request
  getUser_COLD(): Observable<User> {
    return this.http.get<User>('/api/user');
  }

  // ✅ Hot+replay — shared single request, 1-value cache
  private _user$ = this.http.get<User>('/api/user').pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
    // refCount: true → unsubscribes from source (HTTP) when no consumers remain
    // bufferSize: 1 → cache one value for late subscribers
  );
  readonly user$ = this._user$;

  // ✅✅ BehaviorSubject pattern — fully hot, imperative control
  private _currentUser = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this._currentUser.asObservable();  // expose as read-only

  loadUser(): void {
    this.http.get<User>('/api/user').subscribe(user => {
      this._currentUser.next(user);  // push to all subscribers
    });
  }

  updateUser(update: Partial<User>): void {
    const current = this._currentUser.getValue();
    if (current) {
      this._currentUser.next({ ...current, ...update });
    }
  }
}

// -------------------------------------------------------
// Demonstrating cold vs hot in a component
// -------------------------------------------------------
@Component({
  standalone: true,
  selector: 'app-user-demo',
  imports: [AsyncPipe, CommonModule],
  template: `
    <!-- ❌ Two subscriptions to cold$ → two HTTP calls -->
    Hello, {{ coldUser$ | async | json }}
    Role: {{ (coldUser$ | async)?.role }}

    <!-- ✅ Two subscriptions to hot$ → one HTTP call, shared response -->
    Hello, {{ hotUser$ | async | json }}
    Role: {{ (hotUser$ | async)?.role }}

    <!-- ✅✅ Best practice: assign once, use direct properties -->
    Hello, {{ (user$ | async)?.name }}
  `,
})
export class UserDemoComponent {
  private userService = inject(UserService);

  // ❌ cold — multiple async pipes will each make an HTTP call
  coldUser$ = this.userService.getUser_COLD();

  // ✅ hot — shared via shareReplay(1) in service
  hotUser$ = this.userService.user$;

  // ✅✅ Assign to local variable — one subscription, one API call
  user$ = this.userService.user$;
  // In template: only use (user$ | async) once, access .name/.role from result
}

// -------------------------------------------------------
// Making ANY cold Observable hot with share operators
// -------------------------------------------------------
function demonstrateColdToHot() {
  // Cold: new HTTP call per subscription
  const rawHttp$ = inject(HttpClient).get<ProductList>('/api/products');

  // Warm: multicast, unsubscribes source when all consumers leave
  const shared$ = rawHttp$.pipe(share());

  // Hot+replay(1): multicast + last value replayed to late subscribers
  const cached$ = rawHttp$.pipe(shareReplay({ bufferSize: 1, refCount: true }));

  // Hot+replay(3): replay last 3 values (e.g., last 3 notifications)  
  const notifications$ = inject(NotificationService).stream$.pipe(
    shareReplay({ bufferSize: 3, refCount: false })  // keep 3, never unsubscribe
  );
}
```

**Interview vs Production difference:**
In an interview, focus on explaining the core cold vs hot concept and show the `shareReplay(1)` fix for the duplicate HTTP call problem — this is the most common real-world application. In production, also consider `switchMap` for cancellable streams (search), add `catchError` + `retry()` before `shareReplay` to handle network failures gracefully, and use `BehaviorSubject` services for state that needs to be updated (not just cached HTTP responses).

---

## 🧠 6. Memory Aid

**Mental Model:** Cold = Netflix (you start from beginning). Hot = live TV (you join wherever the broadcast is). `shareReplay(1)` = DVR (one recording, replayable for anyone who missed the start).

**If you go blank:** "Cold Observable: new producer per subscriber — like HttpClient.get, each subscription makes a new request. Hot Observable: shared producer — like WebSocket, all subscribers get the same stream. Fix duplicate HTTP calls with `shareReplay(1)` in the service."

**Mnemonic:** **SNAP** — **S**hareReplay makes cold into hot (with replay), **N**ew producer per cold subscriber, **A**lways-running producer for hot, **P**ipe shareReplay to cache.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Duplicate API calls from cold Observables cause inconsistent data, race conditions, and unnecessary server load
→ Performance: `shareReplay(1)` converts N network requests to 1 — directly reduces latency for multi-component data sharing
→ Business: Understanding cold/hot is prerequisite to debugging any non-trivial RxJS data flow issue

**How it works (3 sentences):**
A cold Observable creates a new producer execution context for every subscriber — `HttpClient.get()` is the canonical example where each subscription triggers a new network request. A hot Observable wraps a producer that exists independently of subscriptions — WebSockets, DOM events, and Subjects are hot by nature, with subscribers joining the stream mid-flow. `shareReplay({ bufferSize: 1, refCount: true })` converts a cold Observable to a warm multicast stream, executing the source once and replaying the most recent emission to late subscribers, which is the standard pattern for sharing HTTP data across multiple Angular components.

**Company relevance:**
- Microsoft: Azure Portal resource metadata shared across blade components via `shareReplay(1)` — one authenticated API call per resource, regardless of how many blade sections display that resource's data
- Adobe: Creative Cloud user plan data cached in service via `shareReplay(1)` — toolbar, export dialog, and file picker all share one authenticated call
- Salesforce: Org configuration as `BehaviorSubject` — all components get current config on subscribe with no additional API calls; org changes propagate to all consumers simultaneously
- Cisco: WebEx meeting event stream is hot by nature — participant list, recording indicator, and reaction components all subscribe to the same WebSocket Observable without any explicit multicast management

---
✅ Topic 67/486 complete → Continuing to Topic 68: Subject, BehaviorSubject, ReplaySubject, AsyncSubject
