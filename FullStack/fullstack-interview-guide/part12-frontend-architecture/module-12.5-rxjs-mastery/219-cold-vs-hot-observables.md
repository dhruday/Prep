# RxJS — Cold vs Hot Observables
> Part 12 — Frontend Architecture — Module 12.5: RxJS Mastery
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Cold Observable**: producer is created INSIDE the Observable; each subscriber gets their own independent execution; no sharing; analogous to a Netflix movie — every viewer starts their own independent stream from the beginning
- **Hot Observable**: producer exists OUTSIDE the Observable, running regardless of subscribers; subscribers share the same stream and get only the values emitted AFTER they subscribe; analogous to a live TV broadcast — all viewers see the same current frame
- **Cold examples**: `HttpClient.get()` (each subscribe = new HTTP request), `timer()`, `interval()`, `of()`, `from()`, `new Observable(subscriber => { ... })` where the function creates its own data source
- **Hot examples**: `Subject`, `BehaviorSubject`, `ReplaySubject`, `fromEvent(document, 'click')` (DOM event wrapper), `webSocket()`, `shareReplay()` on a cold Observable
- **`shareReplay(1)`**: converts a cold Observable to hot-like (multicasted); subsequent subscribers share the single execution and replay the last `n` values; the canonical way to cache an HTTP call so it fires only once even with multiple subscribers
- **`share()`**: multicasts a cold Observable to multiple subscribers — but does NOT replay; late subscribers miss values emitted before they subscribed; used for event streams (not caching)
- **`refCount` vs `connect()`**: `shareReplay()` uses `refCount: true` by default (auto-connects when first subscriber arrives, auto-completes when last subscriber leaves); `share()` + manual `connect()` gives explicit control over when the shared stream starts
- ✅ **Hruday's anchor**: coaching Capgemini junior engineers — the cold vs hot distinction resolved weeks of intermittent "HTTP call fires twice" bugs in their team

---

## 1. One-Line Definition
A cold Observable creates a new producer per subscriber (each gets an independent stream from scratch), while a hot Observable shares a single producer among all subscribers (each gets only values emitted after they join) — and operators like `shareReplay()` bridge the two, converting cold Observables into multicasted streams for caching and sharing.

---

## 2. The Problem It Solves

**The HTTP double-call problem:** a component displays the same product data in two places — the title bar and the detail panel. Both parts subscribe to the same `getProduct()` Observable. Unknown to the developer, this fires TWO separate HTTP requests — cold Observable, two subscribers, two executions. Network tab shows duplicate API calls. The product page becomes expensive per render.

**The stale-state problem on subscription timing:** a hot Observable (like a BehaviorSubject tracking cart count) has been emitting values since app startup. A navbar component subscribes when it renders. If the cart has already been updated five times before the navbar subscribes, the navbar gets only NEW updates — it misses the current cart count. A BehaviorSubject (replays the latest value) vs a plain Subject (no replay) makes the difference between a navbar that shows the current count immediately vs one that shows nothing until the next update.

Understanding cold vs hot is the foundation for understanding when to use `shareReplay`, when to use Subjects, and why `async` pipe's subscription management matters.

---

## 3. How It Works Internally

### Cold Observable — Producer Inside

```typescript
// This is what a cold Observable looks like conceptually:
const coldTimer$ = new Observable(subscriber => {
  // Producer (setInterval) is created INSIDE the Observable factory function.
  // This function runs FRESH for EVERY subscriber.
  let count = 0;
  const intervalId = setInterval(() => {
    subscriber.next(count++);
  }, 1000);
  
  // Each subscriber gets their OWN setInterval — their OWN producer.
  // Subscriber A starts counting from 0 at time T.
  // Subscriber B subscribes at time T+5: also starts counting from 0 at T+5.
  // They are COMPLETELY INDEPENDENT streams.
  
  return () => clearInterval(intervalId); // Cleanup when unsubscribed
});

coldTimer$.subscribe(val => console.log('A:', val)); // A: 0, A: 1, A: 2...
// 5 seconds later:
coldTimer$.subscribe(val => console.log('B:', val)); // B: 0, B: 1... (starts fresh)

// HTTP call is a cold Observable:
const product$ = this.http.get<Product>('/api/products/1');
// No HTTP request has fired yet.

product$.subscribe(p => console.log('Component A gets:', p)); // HTTP request fires
product$.subscribe(p => console.log('Component B gets:', p)); // ANOTHER HTTP request fires
// Two HTTP requests for the same resource. Both get the full response independently.
```

### Hot Observable — Producer Outside

```typescript
// Subject: producer is OUTSIDE the Observable - it exists independently.
// Subscribers share the Subject's emission stream.
const hotSubject$ = new Subject<number>();

hotSubject$.subscribe(val => console.log('A:', val));

hotSubject$.next(1); // A: 1
hotSubject$.next(2); // A: 2

// B subscribes LATE:
hotSubject$.subscribe(val => console.log('B:', val));

hotSubject$.next(3); // A: 3, B: 3 (both get it)
hotSubject$.next(4); // A: 4, B: 4

// Key: B MISSED values 1 and 2 entirely.
// The Subject (hot source) was running before B subscribed — B only gets future values.

// BehaviorSubject: hot, but replays LAST VALUE to new subscribers:
const hotBehavior$ = new BehaviorSubject<number>(0); // Initial value: 0

hotBehavior$.next(1);
hotBehavior$.next(2);

hotBehavior$.subscribe(val => console.log('C:', val)); // C: 2 ← gets CURRENT value immediately
hotBehavior$.next(3); // C: 3

// fromEvent: wraps an existing DOM event — always hot (DOM exists independently):
const clicks$ = fromEvent(document, 'click');
// The DOM doesn't restart on subscribe — you get clicks that happen AFTER subscription.
```

### shareReplay — Making Cold Hot (with Caching)

```typescript
// Without shareReplay: cold HTTP call, fires once per subscriber
const product$ = this.http.get<Product>('/api/products/1');

// With shareReplay: fires ONCE, result shared and replayed to all subscribers
const cachedProduct$ = this.http.get<Product>('/api/products/1').pipe(
  shareReplay(1)  // buffer size 1: replay 1 most recent value to new subscribers
);

// Even with 5 components subscribing:
cachedProduct$.subscribe(p => displayTitle(p));      // HTTP fires first time
cachedProduct$.subscribe(p => displayDetails(p));    // Gets replayed value (no new HTTP)
cachedProduct$.subscribe(p => displayRelated(p));    // Gets replayed value
cachedProduct$.subscribe(p => displayReviews(p));    // Gets replayed value
// Result: ONE HTTP request, four components all receive the same response.

// Important: shareReplay(1) with refCount: true (default in RxJS 7):
const autoRefCount$ = source$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
// refCount: true → unsubscribes from source when all subscribers unsubscribe
//                  (correct for component-scoped caching — cleans up properly)
// refCount: false (legacy default in RxJS 6) → source stays alive even with 0 subscribers
//                  (correct for app-wide service caching — keeps cache warm)
```

---

## 4. The Code

### Wrong Way — Duplicate HTTP Calls, Late Subscription Bugs

```typescript
// ❌ WRONG — same Observable subscribed multiple times → multiple HTTP calls

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) {}
  
  getProduct(id: string): Observable<Product> {
    // ❌ Returns a cold Observable — no sharing, no caching
    return this.http.get<Product>(`/api/products/${id}`);
  }
}

@Component({ ... })
export class ProductPageComponent implements OnInit {
  product!: Product;
  relatedProducts: Product[] = [];
  
  constructor(private productService: ProductService, private route: ActivatedRoute) {}
  
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const product$ = this.productService.getProduct(id);
    
    // ❌ TWO subscriptions to the same cold Observable = TWO HTTP requests:
    product$.subscribe(p => this.product = p);           // HTTP request #1
    product$.subscribe(p => this.loadRelated(p.category)); // HTTP request #2
    
    // Network tab shows: GET /api/products/123 (200) × 2
    // Backend gets hit twice for the same resource on EVERY page load.
  }
}

// ❌ WRONG — Subject used where BehaviorSubject is needed
// Symptom: component mounts but shows no cart count until next update
@Injectable({ providedIn: 'root' })
export class CartService {
  // ❌ Plain Subject: late subscribers miss current state
  private readonly cartCount$ = new Subject<number>();
  
  readonly count$ = this.cartCount$.asObservable();
  
  private count = 0;
  
  addItem() {
    this.count++;
    this.cartCount$.next(this.count);
  }
}

// NavbarComponent subscribes when it renders.
// If CartService was updated BEFORE NavbarComponent mounted (e.g., items added
// from localStorage on startup), NavbarComponent gets NO value until the next
// addItem() call. Cart badge shows '0' or nothing — even though the cart has 3 items.
// This is the classic Subject vs BehaviorSubject confusion bug.
```

> **Why this fails:** cold Observables fire independently per subscriber — HTTP calls double when two parts of a component subscribe to the same Observable. Plain Subject doesn't replay current state to late subscribers — state synchronisation bugs.

### Right Way — shareReplay for Caching, BehaviorSubject for State

```typescript
// ✅ RIGHT — shareReplay for HTTP caching in service

@Injectable({ providedIn: 'root' })
export class ProductService {
  private cache = new Map<string, Observable<Product>>();
  
  constructor(private http: HttpClient) {}
  
  getProduct(id: string): Observable<Product> {
    if (!this.cache.has(id)) {
      const product$ = this.http.get<Product>(`/api/products/${id}`).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        // refCount: false → cache stays alive even when 0 components are subscribed
        // The cached value persists for the app's lifetime (or until cache.clear())
      );
      this.cache.set(id, product$);
    }
    return this.cache.get(id)!;
    // First subscriber: cache miss → HTTP fires, shareReplay captures response
    // Every subsequent subscriber: cache hit → replayed immediately, NO HTTP
  }
  
  invalidate(id: string) {
    this.cache.delete(id); // Force fresh HTTP on next request
  }
}

// Multiple component subscriptions — safe:
ngOnInit() {
  const product$ = this.productService.getProduct(id);
  
  // ✅ Both subscribe to same shareReplay Observable — ONLY ONE HTTP request
  product$.subscribe(p => { this.product = p; });
  product$.subscribe(p => { this.loadRelated(p.category); });
  
  // Or better: combine into one subscription
  product$.subscribe(p => {
    this.product = p;
    this.loadRelated(p.category);
  });
}


// ✅ RIGHT — BehaviorSubject for state that must be available immediately on subscribe

@Injectable({ providedIn: 'root' })
export class CartService {
  // ✅ BehaviorSubject: has initial value, replays latest to new subscribers
  private readonly _cartItems$ = new BehaviorSubject<CartItem[]>([]);
  private readonly _cartCount$ = new BehaviorSubject<number>(0);
  
  // Public read-only Observables (callers can't call next() from outside)
  readonly cartItems$ = this._cartItems$.asObservable();
  readonly cartCount$ = this._cartCount$.asObservable();
  
  // Computed Observable from BehaviorSubject
  readonly cartTotal$ = this._cartItems$.pipe(
    map(items => items.reduce((sum, i) => sum + i.price * i.quantity, 0))
  );
  
  constructor() {
    // Restore from storage on service init — BehaviorSubject emits immediately
    const saved = localStorage.getItem('cart');
    if (saved) {
      const items: CartItem[] = JSON.parse(saved);
      this._cartItems$.next(items);
      this._cartCount$.next(items.reduce((sum, i) => sum + i.quantity, 0));
    }
  }
  
  addItem(item: CartItem) {
    const currentItems = this._cartItems$.getValue(); // BehaviorSubject: synchronous read
    const updated = [...currentItems, item];          // Immutable update
    this._cartItems$.next(updated);
    this._cartCount$.next(updated.reduce((sum, i) => sum + i.quantity, 0));
    localStorage.setItem('cart', JSON.stringify(updated));
  }
}

// NavBarComponent — subscribes after CartService was potentially already updated:
@Component({ standalone: true, imports: [AsyncPipe] })
export class NavBarComponent {
  constructor(public cart: CartService) {}
  // ✅ BehaviorSubject replays current count immediately on subscription
  // Even if NavBar mounts AFTER 3 items were added, it shows '3' on first render
  // Template: <span>{{ cart.cartCount$ | async }}</span>
}


// ✅ RIGHT — Understanding cold Observable retry safety
// Cold Observables are SAFE to retry (each retry gets a fresh execution):
this.http.get<Product>('/api/products/1').pipe(
  retry({ count: 3, delay: 1000 }),  // On error: retry up to 3 times with 1s delay
  // ✅ Each retry creates a NEW HTTP request (cold Observable behavior)
  // If it were hot, retry wouldn't make sense — we'd just be re-subscribing to the same
  // stream and getting missed values, not retrying the failed operation
).subscribe(/* ... */);

// Hot Observables should NOT be retried with retry() in this way because:
// - The hot producer is continuous (like a WebSocket)
// - retry() on a completed/errored hot Observable just re-subscribes
// - For WebSocket reconnection, use a dedicated reconnect strategy, not retry()
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Is `HttpClient.get()` cold or hot? What's the practical implication?"

**Hruday's answer:**
> `HttpClient.get()` returns a cold Observable. No HTTP request is sent until a `subscribe()` is called. Each subscription triggers a new, independent HTTP request.
>
> The practical implication: if two parts of a component (or two components) subscribe to the same Observable returned by a service method (like `productService.getProduct(id)`), two HTTP requests fire to the same endpoint. The backend handles the same request twice, and the network has double the load.
>
> The fix is `shareReplay(1)` — cache the Observable in the service so subsequent subscribers get the replayed response without firing new HTTP requests. The standard pattern: in the service, store a `Map<string, Observable<T>>` keyed by entity ID; if an entry exists, return it (subscribers get the cached result); if not, create the HTTP Observable, pipe it through `shareReplay(1)`, store it, and return it.
>
> A subtlety: `shareReplay({ bufferSize: 1, refCount: false })` keeps the cache alive even when no components are subscribed — useful for app-wide service caches. `refCount: true` (the default in RxJS 7) cleans up when the last subscriber unsubscribes — appropriate for component-scoped caching.

---

### Q2 — Capgemini Experience
**Interviewer asks:** "Can you give me a real example of a cold vs hot confusion bug you encountered?"

**Hruday's answer:**
> At Capgemini, I was mentoring a junior team working on an Angular e-commerce frontend. They reported an intermittent bug: their shopping cart in the navigation bar sometimes showed 0 items even though the user had already added 3 items. The bug was inconsistent — it always showed correctly after the user added another item, but would show wrong on page refresh or after navigating between routes.
>
> The root cause was a plain `Subject` used for cart state. The CartService exposed a `cartCount$ = new Subject<number>()`. When the app loaded, it restored cart items from localStorage and called `cartCount$.next(3)` in the constructor. The NavigationBarComponent subscribed to this Observable in its `ngOnInit`, but Angular renders the NavBar AFTER the CartService constructor runs. By the time the NavBar subscribed, the Subject had already emitted the value and completed that emission. The NavBar subscribed "late" and missed the 3 — it showed 0 until the next `next()` call.
>
> The fix was a `BehaviorSubject(0)` — it holds the current value and replays it synchronously to any new subscriber. The NavBar subscribed and immediately got `3`. No timing dependency.
>
> After showing the team the root cause, that was the moment where cold vs hot became genuinely understood rather than memorised. I used the live TV analogy: a plain Subject is a live broadcast — if you tune in late, you missed what was said. A BehaviorSubject is a broadcast with a "last message" ticker — late tuners see the most recent message immediately.

---

### Q3 — Deep Dive
**Interviewer asks:** "What is `share()` and how does it differ from `shareReplay()`?"

**Hruday's answer:**
> Both are multicasting operators that convert a cold Observable to a shared (hot-like) stream. The difference is replay behaviour and lifetime.
>
> `share()` is `pipe(publish(), refCount())` under the hood. It creates a single shared execution of the source, multicasted to all current subscribers. When the first subscriber arrives, it connects to the source. When the last subscriber leaves, it disconnects (and loses all state). A new subscriber arriving AFTER the source has already emitted values will NOT get previous values — they start from that moment forward. Use `share()` for event streams where replay doesn't make sense — like mouse movement, WebSocket messages, sensor streams.
>
> `shareReplay(n)` is `pipe(publishReplay(n), refCount())`. It REPLAYS the last `n` values to any new subscriber, even if they subscribe after the source has already emitted. Use `shareReplay(1)` for caching — the canonical HTTP caching pattern. Late subscribers get the cached response immediately without triggering a new HTTP request.
>
> The critical difference materialises when: (1) your Observable completes (like HTTP GET) — `shareReplay(1)` replays the completed value to new subscribers AFTER completion; (2) a new subscriber arrives after some values have already been emitted — `share()` gives them nothing from the past; `shareReplay(1)` gives them the last emitted value. For HTTP caching, `shareReplay(1)` is always correct. For streams that should NOT replay (prevent a late subscriber from acting on stale event data), `share()` is correct.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "All RxJS Observables are lazy (cold)" | "Observables are lazy — nothing happens until you subscribe" | Cold Observables are lazy — their producer starts per subscription; HOT Observables (Subjects, DOM event wrappers, timers already running) are NOT lazy — their producer runs independently of subscribers; subscribing to a Subject doesn't start anything new; the Observable itself is just a listener attachment; this distinction matters practically: subscribing to `fromEvent(document, 'click')` does NOT add a new click listener to the document for each subscriber — `fromEvent` wraps the EXISTING DOM event, which is hot |
| "`shareReplay()` is always safe to use on HTTP calls" | "I always add shareReplay to HTTP calls for better performance" | `shareReplay({ bufferSize: 1, refCount: false })` with RxJS 6 (legacy default) has a known memory/resource leak: if the source errors out, `shareReplay` replays the error to new subscribers BUT also holds a reference to the source subject indefinitely (no refCount cleanup); always use `shareReplay({ bufferSize: 1, refCount: true })` for component-scoped caching where cleanup should happen when the last subscriber unsubscribes; for service-level long-lived caches, `refCount: false` is intentional but understand the trade-off |
| "The `async` pipe subscribes once per component" | "async pipe has one subscription" | The `async` pipe has one subscription PER USAGE in the template; `{{ data$ | async }}` twice in the same template = two subscriptions; with a cold HTTP Observable this means TWO requests; the fix: use `*ngIf="data$ | async as data"` which creates ONE subscription and exposes the value as `data` throughout the template, or use `shareReplay(1)` on the Observable so multiple subscriptions share the same execution |
| "Hot Observables can be retried like cold" | "I use retry() on WebSocket Observables to reconnect" | `retry()` on a cold Observable correctly re-executes: for a cold HTTP call, each retry fires a new HTTP request — intended behaviour; `retry()` on a hot/multicasted Observable does NOT re-create the producer — it just re-subscribes to the same Subject or event wrapper; this won't reconnect a WebSocket; for WebSocket reconnection, use a dedicated reconnect operator like `retryWhen` combined with a delay, or use `webSocket()`'s built-in reconnect configuration |

---

## 7. Hruday's Real Experience Hook
> "The Capgemini mentoring session was one of the clearest teaching moments I've had. The team had been debugging the cart count bug for two days — adding console logs, wondering if it was a race condition, suspecting change detection. When I was asked to look at it, I saw the bug immediately from the signature: brief incorrect value on subscribe that corrects itself on the next update — classic cold vs hot mismatch.
>
> I grabbed a whiteboard (we were in-office) and drew the timeline:
>
> ```
> T=0ms   CartService constructor: Subject.next(3) → emits to 0 subscribers
> T=35ms  NavBarComponent: ngOnInit → subscribes → NO replay → receives nothing
> T=500ms User adds item: Subject.next(4) → NavBar receives 4 (first value it sees)
> → NavBar shows 4 but user sees it flash from 0 → 4 on next action
> ```
>
> Below it I drew the BehaviorSubject timeline:
>
> ```
> T=0ms   CartService constructor: BehaviorSubject.next(3) → stored internally as current value
> T=35ms  NavBarComponent: ngOnInit → subscribes → REPLAYS 3 synchronously → shows 3
> T=500ms User adds item: BehaviorSubject.next(4) → NavBar receives 4
> ```
>
> The fix was a one-line change. `new Subject<number>()` → `new BehaviorSubject<number>(0)`. Two days of debugging, described and fixed in 15 minutes.
>
> After that session, I made cold vs hot the topic of our next team learning session. I also realised it should be a code review checklist item: anytime a service class uses `Subject` for state (not events), it should be questioned — is this state that subscribers need to see the current value of? If yes, BehaviorSubject. If it's truly event-like (fire and forget, only live subscribers care), Subject is correct."

---

## 8. Scale Evolution

**Small app →** Use `BehaviorSubject` for all service state (never plain `Subject` for state); `shareReplay(1)` on frequently-used HTTP calls; understand cold vs hot well enough to avoid duplicate API calls.

**Medium app with multiple components →** Abstract Observables through service methods with built-in caching (`Map<string, Observable<T>>` + `shareReplay`); `fromEvent` for DOM events (hot, share naturally); `Subject` strictly for event-emission where late subscribers intentionally don't get history (form validation triggers, button debounced actions).

**Large-scale app (enterprise dashboard, real-time system) →** WebSocket streams as hot Observables with explicit multicast management; `share()` for high-frequency streams (position data, price ticks) where replay of stale data is wrong; `shareReplay(100)` for last-n-values scenarios (message history, recent metric readings); performance profiling of subscription counts to detect cold Observable over-subscription patterns.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment status polling — cold Observable for single-use status check vs hot BehaviorSubject for real-time payment status stream; merchant analytics service caching with shareReplay; cart/checkout state with BehaviorSubject for consistent state across component tree | shareReplay for API caching; BehaviorSubject for shared state; cold Observable retry safety |
| Swiggy / Meesho | Delivery GPS tracking (hot stream — WebSocket, shared producer); product inventory updates (hot BehaviorSubject per category); search results caching per query (cold HTTP + shareReplay map); `fromEvent` for infinite scroll trigger | Hot stream for delivery tracking; shareReplay for search cache; BehaviorSubject for cart |
| Adobe / Microsoft | Real-time collaboration Observables (inherently hot — server push); document state as multicasted BehaviorSubject; file upload progress as cold Observable (safe to retry on failure); team expects RxJS depth at senior level | Full cold/hot knowledge; multicast operators; refCount understanding |
| SAP Labs | Direct mentoring: Capgemini BehaviorSubject vs Subject bug story; SAP Fiori uses RxJS extensively for data flow; senior engineers expected to diagnose cold/hot bugs and recommend correct patterns; shareReplay for SAP BTP API call caching in Angular services | Real debugging story; BehaviorSubject vs Subject pattern knowledge; shareReplay caching |

---

## 10. Related Topics — What to Study Next

- **Topic 220 — Subject, BehaviorSubject, ReplaySubject** — the three primary hot Observable sources; after understanding cold vs hot at a conceptual level, Topic 220 gives the full API and use-case map for each Subject type; BehaviorSubject (current value replay), ReplaySubject(n) (last n values), AsyncSubject (emit only on complete) each serve different caching/state scenarios
- **Topic 221 — switchMap, mergeMap, concatMap, exhaustMap** — higher-order mapping operators work differently based on the inner Observable being cold or hot; `switchMap` cancels the previous COLD inner Observable (e.g., cancels a pending HTTP request when the source emits again); if the inner Observable were hot, cancellation would just mean unsubscribing from a shared stream — understanding cold vs hot explains why these operators have the semantics they do
- **Topic 222 — takeUntil Memory Leak Prevention** — subscription leaks are cold Observable subscriptions that never complete and never get unsubscribed; hot Observables (Subjects, DOM events) that are subscribed to without `takeUntil` keep the component alive in memory because the hot Observable never completes on its own; cold HTTP calls complete naturally (one value, then complete), but hot streams require explicit unsubscription
- **Topic 218 — Angular Signals v17+** — `toSignal(observable$)` converts any Observable (cold or hot) into a Signal; the cold vs hot distinction determines the behaviour: `toSignal(httpCall$)` subscribes once and the cold Observable fires one HTTP request (the signal gets that resolved value); `toSignal(behaviorSubject$)` gets the current value and all future emissions; understanding cold vs hot predicts `toSignal`'s behaviour

---

*Part 12 · RxJS — Cold vs Hot Observables · Full Stack Interview Guide · Hruday D · 2026*
