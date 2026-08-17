# RxJS — takeUntil Pattern for Memory Leak Prevention
> Part 12 — Frontend Architecture — Module 12.5: RxJS Mastery
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The memory leak**: an Angular component subscribes to an Observable in `ngOnInit`; the component is destroyed (user navigates away); but the Observable keeps running and its subscription callback holds a reference to the destroyed component's properties — the component is never garbage collected; this repeats on every navigation until the browser tab uses hundreds of MB
- **Root cause**: Observables that never complete on their own — Subjects, `interval()`, `fromEvent()`, `BehaviorSubject` streams from services — stay active forever unless you explicitly unsubscribe
- **`takeUntil(destroy$)` pattern**: create a `Subject<void>` called `destroy$`; in every `subscribe()` call, add `.pipe(takeUntil(this.destroy$))`; in `ngOnDestroy()`, call `this.destroy$.next(); this.destroy$.complete()`; when `destroy$` emits, `takeUntil` completes ALL subscriptions in one shot
- **Angular 16+ — `takeUntilDestroyed()`**: replaces the manual destroy Subject; import from `@angular/core/rxjs-interop`; call `takeUntilDestroyed()` inside the injection context (constructor, field initialiser); Angular auto-unsubscribes when the component is destroyed — no `ngOnDestroy` needed
- **`async` pipe**: the zero-boilerplate alternative; subscribes in template, unsubscribes automatically on component destroy; use wherever possible instead of manual `subscribe()`
- **The trap**: nesting `subscribe()` inside `subscribe()` — `takeUntil` on the outer does NOT unsubscribe the inner; always use higher-order operators (`switchMap`, `concatMap`) instead of nested subscribes
- ✅ **Hruday's anchor**: SAP — memory profiler caught 40 MB leak from unsubscribed WebSocket metric streams; fixed with `takeUntil` pattern across 15 dashboard components

---

## 1. One-Line Definition
The `takeUntil` pattern provides a single clean exit point that completes all of a component's Observable subscriptions the moment its `ngOnDestroy` fires — preventing the memory leaks and stale callbacks that occur when subscriptions outlive the components that created them.

---

## 2. The Problem It Solves

A user opens a dashboard. The component subscribes to three things in `ngOnInit`: a WebSocket stream of live data, an `interval(5000)` poller, and a `BehaviorSubject` from a cart service. The user navigates away. Angular calls `ngOnDestroy` and removes the component from the DOM.

But the three Observable subscriptions are still alive. Every 5 seconds, the poller fires and tries to update `this.metrics` — a property on a component that no longer exists in Angular's view. The WebSocket still pushes data and the callback still runs, holding a closure over the destroyed component's entire scope, preventing the garbage collector from freeing it.

The user navigates in and out of the dashboard five times. Each navigation creates a fresh component with three new subscriptions. The old ones never die. Five sets of subscriptions drain CPU every 5 seconds. Memory climbs with each navigation cycle.

In production: this is invisible in development (single-page test runs never trigger enough navigation cycles). It surfaces in UX analytics as slow tab performance at hour two of browser use, and in Chrome DevTools' Memory tab as a growing heap with repeated component class instances.

---

## 3. How It Works Internally

### The takeUntil Mechanism

```
How takeUntil(notifier$) works:

Source Observable:  --a--b--c--d--e--f--|
notifier$:          ----------X
                               ↑ notifier$ emits (takeUntil triggers)

Result:             --a--b--c--|
                              ↑ complete signal sent to subscriber

When notifier$ emits ANY value → takeUntil sends a complete() to the source subscription.
complete() triggers the subscriber's teardown logic → subscription is removed.
The source Observable continues running (it doesn't know anyone left).
The SUBSCRIPTION is terminated, not the source.

With destroy$ Subject:

Component mounted   → destroy$ = new Subject<void>() created
ngOnInit            → stream$.pipe(takeUntil(this.destroy$)).subscribe(cb)
                       takeUntil now listens to both stream$ and destroy$
ngOnDestroy         → this.destroy$.next()  ← emits a value to takeUntil
                       ← ALL subscriptions using takeUntil(this.destroy$) complete
                    → this.destroy$.complete() ← no further emissions possible

"One destroy$.next() terminates ALL subscriptions simultaneously."
This is why one destroy$ per component handles any number of subscriptions.
```

### Memory State — Before and After

```
WITHOUT takeUntil:

ngOnDestroy called:
  Angular removes component from DOM ✓
  Angular clears @ViewChild references ✓
  Component object: STILL IN MEMORY ✗
    ↓ because subscription callbacks hold closures over:
      this.metrics → holds MetricData[]
      this.product → holds Product object
      this.cdr     → ChangeDetectorRef (references Angular's CD tree)
  
  Subscription A (WebSocket) → fires → runs callback → accesses this.metrics
    (no error thrown — stale reference, silent wrong behavior)
  Subscription B (interval) → fires every 5s → accesses this.cdr.markForCheck()
    (ChangeDetectorRef for destroyed component → error or no-op)

  GC cannot collect the component → MEMORY LEAK

WITH takeUntil:

ngOnDestroy called:
  destroy$.next()
    → Subscription A: takeUntil completes → unsubscribed ✓
    → Subscription B: takeUntil completes → unsubscribed ✓
    → Subscription C: takeUntil completes → unsubscribed ✓
  destroy$.complete() ← prevents future memory from lingering Subject
  
  No subscription holds a closure over the component anymore.
  GC collects the component → NO LEAK ✓
```

---

## 4. The Code

### Wrong Way — Missing Unsubscription

```typescript
// ❌ WRONG — subscriptions with no cleanup

@Component({
  selector: 'realtime-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ currentValue }}</div>`
})
export class RealtimeDashboardComponent implements OnInit {
  currentValue = 0;
  
  constructor(
    private metricsService: MetricsService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit() {
    // ❌ BehaviorSubject from service — never completes, no cleanup
    this.metricsService.liveMetrics$.subscribe(metrics => {
      this.currentValue = metrics.value;
      this.cdr.markForCheck();
      // Callback holds: this.currentValue, this.cdr — both inside the destroyed component
    });
    
    // ❌ interval — never completes, no cleanup
    interval(5000).subscribe(() => {
      this.metricsService.refresh();
    });
    
    // ❌ DOM event — never completes, no cleanup
    fromEvent(window, 'resize').subscribe(() => {
      this.onResize();
    });
  }
  // No ngOnDestroy at all.
  // Every navigation to this route creates 3 new "zombie" subscriptions.
}

// ❌ WRONG — manual Subscription but forgetting one
@Component({ ... })
export class PartialCleanupComponent implements OnInit, OnDestroy {
  private sub1!: Subscription;
  private sub2!: Subscription;
  // sub3 forgotten ❌

  ngOnInit() {
    this.sub1 = this.serviceA.data$.subscribe(d => this.processA(d));
    this.sub2 = this.serviceB.status$.subscribe(s => this.processB(s));
    this.serviceC.events$.subscribe(e => this.processC(e)); // ❌ No variable — no way to unsub
  }
  
  ngOnDestroy() {
    this.sub1.unsubscribe(); // Cleaned up
    this.sub2.unsubscribe(); // Cleaned up
    // serviceC.events$ still running — silent leak ❌
  }
  
  // Problem scales: each new subscribe() call needs a matching Subscription variable.
  // Easy to forget one. No enforcement. Scales poorly with 10+ subscriptions.
}

// ❌ WRONG — Nested subscribe (takeUntil only cleans the OUTER)
this.userService.currentUser$
  .pipe(takeUntil(this.destroy$))
  .subscribe(user => {
    // ❌ Inner subscribe is NOT covered by the outer takeUntil!
    this.orderService.getOrders(user.id).subscribe(orders => {
      this.orders = orders;
    });
  });
// When destroy$.next() fires:
// Outer subscription (currentUser$) → cleaned up ✓
// Inner subscriptions (getOrders) → still running ✗ (nested subscriptions escape takeUntil)
```

> **Why this fails in production:** subscriptions that outlive their component hold closures over component state, preventing garbage collection and causing silent stale callbacks — hard to detect until memory profiling reveals duplicate component instances in the heap.

### Right Way — takeUntil One-Destroyer Pattern + Angular 16+ `takeUntilDestroyed`

```typescript
// ✅ RIGHT — Classic takeUntil pattern (works in all Angular versions)

@Component({
  selector: 'realtime-dashboard',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- BEST: async pipe — zero subscription management needed -->
    <div class="metric">{{ primaryMetric$ | async | number:'1.2-2' }}</div>
    
    <!-- async pipe also works for multiple bindings via *ngIf let pattern -->
    <ng-container *ngIf="dashboardVm$ | async as vm">
      <div>{{ vm.title }}</div>
      <div>{{ vm.count }}</div>
    </ng-container>
  `
})
export class RealtimeDashboardComponent implements OnInit, OnDestroy {
  // Single destroy$ Subject — one per component, handles ALL subscriptions
  private readonly destroy$ = new Subject<void>();
  
  // Best case: Observable bindings via async pipe (no subscribe needed at all)
  readonly primaryMetric$ = this.metricsService.primaryMetric$;
  readonly dashboardVm$ = this.metricsService.dashboardViewModel$;
  
  // When you must use subscribe() (Chart.js, third-party libs, imperative DOM):
  private chart!: Chart;
  
  constructor(private metricsService: MetricsService) {}
  
  ngOnInit() {
    // ✅ Imperative Chart.js update — must subscribe, add takeUntil
    this.metricsService.chartData$.pipe(
      takeUntil(this.destroy$),        // ← ties to component lifetime
      debounceTime(100)
    ).subscribe(data => {
      if (this.chart) {
        this.chart.data.datasets[0].data = data.values;
        this.chart.update('none');     // Chart.js imperative update
      }
    });
    
    // ✅ DOM event — add takeUntil
    fromEvent(window, 'resize').pipe(
      takeUntil(this.destroy$),        // ← same destroy$ Subject
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe(() => {
      this.chart?.resize();
    });
    
    // ✅ Polling — add takeUntil
    interval(30_000).pipe(
      takeUntil(this.destroy$),        // ← same destroy$ Subject
      switchMap(() => this.metricsService.refresh())
    ).subscribe();
    
    // All three subscriptions above will be cleaned up by ONE destroy$.next() call.
  }
  
  ngOnDestroy() {
    // One call cleans up ALL subscriptions registered with takeUntil(this.destroy$)
    this.destroy$.next();
    this.destroy$.complete(); // ← prevents memory from Subject itself lingering
  }
  
  // Fix for nested subscribe: use higher-order operators instead
  loadUserOrders(userId: string) {
    this.userService.currentUser$.pipe(
      takeUntil(this.destroy$),
      // ✅ switchMap instead of nested subscribe — inner subscription managed by operator
      switchMap(user => this.orderService.getOrders(user.id))
    ).subscribe(orders => { this.orders = orders; });
    // Both "layers" of subscription are fully managed by the outer takeUntil.
  }
}


// ✅ RIGHT — Angular 16+ takeUntilDestroyed() (recommended modern approach)

import { Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'modern-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ currentMetric }}</div>`
})
export class ModernDashboardComponent implements OnInit {
  currentMetric = 0;
  
  private metricsService = inject(MetricsService);
  
  // Option A: takeUntilDestroyed in field initializer (injection context)
  // Clean: no Subject, no ngOnDestroy needed
  private readonly _ = this.metricsService.chartData$.pipe(
    takeUntilDestroyed()   // ← No argument: uses current DestroyRef automatically
  ).subscribe(data => {
    this.currentMetric = data.current;
  });
  
  // Option B: toSignal (even cleaner — no subscribe at all)
  readonly latestMetric = toSignal(
    this.metricsService.primaryMetric$,
    { initialValue: 0 }
    // toSignal internally uses takeUntilDestroyed — auto-cleans up
  );
  
  constructor() {
    // takeUntilDestroyed() also works in constructor injection context:
    this.metricsService.alerts$.pipe(
      takeUntilDestroyed()   // ← Constructor is injection context ✓
    ).subscribe(alert => this.handleAlert(alert));
  }
  
  ngOnInit() {
    // ❌ takeUntilDestroyed() does NOT work in ngOnInit (not injection context)
    // If you need it in ngOnInit, pass DestroyRef explicitly:
    const destroyRef = inject(DestroyRef); // ← inject() works in constructor, fields, DI
    this.someService.data$.pipe(
      takeUntilDestroyed(destroyRef)    // ← Explicit DestroyRef from outside ngOnInit
    ).subscribe(/* ... */);
  }
  
  private handleAlert(alert: Alert) { /* ... */ }
}


// ✅ RIGHT — Reusable destroy$ as a base class (Angular 14 and earlier pattern)
// Less common now with takeUntilDestroyed, but still valid:

@Directive()
export abstract class DestroyableComponent implements OnDestroy {
  protected readonly destroy$ = new Subject<void>();
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// Components extend it — no repeat boilerplate:
@Component({ ... })
export class DashboardComponent extends DestroyableComponent implements OnInit {
  ngOnInit() {
    this.metricsService.data$.pipe(
      takeUntil(this.destroy$)  // ← inherited from DestroyableComponent
    ).subscribe(/* ... */);
  }
  // ngOnDestroy provided by DestroyableComponent — no need to override unless
  // you need extra cleanup. If you do override, call super.ngOnDestroy().
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why does subscribing to a BehaviorSubject in `ngOnInit` cause a memory leak?"

**Hruday's answer:**
> A BehaviorSubject in a service is typically `providedIn: 'root'` — it lives for the entire app lifetime. It never completes on its own.
>
> When a component subscribes to it in `ngOnInit`, that subscription holds a callback closure referencing `this` — the component's properties and methods. When Angular destroys the component, it removes it from the DOM. But the subscription is still alive. The BehaviorSubject still has a reference to the callback, which still has a reference to the component object. The garbage collector cannot free the component because the Subject's subscriber list holds a live reference to it.
>
> This repeats every time the user navigates to that route. Each navigation creates a new component, a new subscription — but the old ones never die. After ten navigations you have ten zombie subscriptions, each emitting to a destroyed component every time the BehaviorSubject changes.
>
> The fix: `takeUntil(this.destroy$)` inside `ngOnInit`, with `this.destroy$.next()` called in `ngOnDestroy`. Or better: switch to `async` pipe in the template, which handles both subscription and automatic cleanup with zero boilerplate.

---

### Q2 — SAP Experience
**Interviewer asks:** "Tell me about a real memory leak you caught in production-level code."

**Hruday's answer:**
> At SAP, we noticed through browser memory profiling (Chrome DevTools Memory tab, heap snapshot comparison) that the manufacturing overview dashboard was growing by roughly 40 MB per navigation cycle — every time a supervisor navigated away from the dashboard and back, the heap grew. After three navigation cycles, the page started feeling sluggish.
>
> The heap snapshot comparison showed fifteen component instances of `DashboardOverviewComponent` all alive simultaneously, when there should be at most one. Each had their own live WebSocket subscription and polling interval still running.
>
> The root cause: the WebSocket Observable (`fromWebSocket()`) and the 10-second polling `interval()` were subscribed in `ngOnInit` with no cleanup. The `fromEvent(window, 'resize')` listener was also uncleaned.
>
> We introduced a `destroy$` Subject pattern as a shared abstract base — `DestroyableComponent` — that every dashboard component extended. All existing subscriptions got `.pipe(takeUntil(this.destroy$))`. The memory profiler, run again after the fix, showed a flat line — one component instance in the heap regardless of how many times the user navigated. The 40 MB growth per cycle disappeared entirely.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use `takeUntil` vs the `async` pipe vs `takeUntilDestroyed`?"

**Hruday's answer:**
> The right tool depends on two factors: where the subscription happens and which Angular version you're targeting.
>
> `async` pipe is always the first choice for any Observable you only need in the template. It has the cleanest API — subscribe happens in HTML, no `ngOnDestroy` needed, no Subject, works with OnPush naturally since it calls `markForCheck()` on each emission. If you can express the subscription as a template binding, use `async` pipe.
>
> `takeUntilDestroyed()` is the right choice for Angular 16+ when you need `subscribe()` — for imperative operations like Chart.js updates, Web Audio API, third-party library integration. It requires being called during construction (constructor or field initialiser) since it needs the injection context to access `DestroyRef`. Zero boilerplate: no destroy Subject, no `ngOnDestroy`.
>
> `takeUntil(this.destroy$)` is the right choice when you're in a pre-Angular-16 codebase, when you need to subscribe inside `ngOnInit` (outside injection context), or when you need fine-grained control — for example, cancelling a subset of subscriptions early, before component destroy. One Subject can serve as the destroy trigger for any number of subscriptions simultaneously.
>
> In practice: I mix all three. `async` pipe for template bindings. `takeUntilDestroyed()` for any new component in Angular 16+. `takeUntil` for legacy code or complex cancel-before-destroy scenarios.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "HTTP calls don't leak" | "HttpClient requests complete on their own — no cleanup needed" | For individual `HttpClient.get()` calls that complete in one response — true; they complete and unsubscribe automatically; but `HttpClient` calls inside `switchMap`, `mergeMap`, or `concatMap` inside a long-lived Observable pipeline DO need cleanup — if the outer Observable never completes and the component is destroyed, the entire pipe stays alive; always apply `takeUntil` at the outermost level of any non-trivial Observable pipeline |
| "takeUntilDestroyed works anywhere" | "`takeUntilDestroyed()` can be called anywhere in the component" | `takeUntilDestroyed()` MUST be called in an Angular injection context — constructor, field initialiser, or any code running during DI setup; calling it inside `ngOnInit`, `ngAfterViewInit`, or any lifecycle hook after construction throws: "NG0203: `inject()` must be called from an injection context"; if you need it in `ngOnInit`, get the `DestroyRef` in the constructor: `private destroyRef = inject(DestroyRef)` and then pass it explicitly: `takeUntilDestroyed(this.destroyRef)` |
| "`takeUntil` covers nested subscribes" | "If I add `takeUntil` to my subscription, inner subscriptions are also cleaned up" | `takeUntil` on the OUTER subscription only cleans up that subscription; callbacks from the outer subscription that contain their own `subscribe()` calls create inner subscriptions that are completely independent and NOT covered; the correct fix is to eliminate nested subscribes entirely by using higher-order operators: `switchMap`, `concatMap`, `mergeMap`, `exhaustMap` — these operators manage inner subscriptions internally and they ARE cleaned up when the outer `takeUntil` fires |
| "Complete the Subject is optional" | "I just call `destroy$.next()` in ngOnDestroy" | Always call `destroy$.complete()` AFTER `destroy$.next()`; without `complete()`, the Subject itself stays alive as a GC root until the component is fully collected — it's a minor issue but a precise pattern matters; `complete()` also signals that no more values will ever come, allowing any operator (like `last()` or `reduce()`) downstream to execute their completion handlers correctly |

---

## 7. Hruday's Real Experience Hook
> "The SAP manufacturing dashboard memory leak was a rite of passage moment for me with RxJS. I'd been using `takeUntil` for a while, but not every component religiously. The leaking code was written by two separate developers across a codebase in a tight deadline sprint — 'we'll add cleanup later' that never got revisited.
>
> The breakthrough was introducing `DestroyableComponent` as an abstract base and making it a team standard. Once the pattern was shared in a code review playbook and enforced in our Angular linting rules (we added the `rxjs-angular/no-unsafe-takeuntil` ESLint rule), memory leak occurrences from missing cleanup dropped to zero in subsequent sprints. The rule specifically checks for `takeUntil` inside `subscribe()` without the corresponding `ngOnDestroy` pattern — it catches the 'forgot the destroy trigger' class of bug at write time, not at profiling time.
>
> When Angular 16 shipped `takeUntilDestroyed()`, it validated the whole direction — the Angular team built cleanup as a first-class concern into the framework because the manual pattern was too easy to skip."

---

## 8. Scale Evolution

**Small Angular app →** `async` pipe everywhere possible (covers 80% of subscription scenarios); `takeUntil(destroy$)` for the remaining imperative subscriptions; single `destroy$` per component.

**Team of 5+ engineers →** add `DestroyableComponent` abstract base (pre-Angular-16) or standardise on `takeUntilDestroyed()` (Angular 16+); add ESLint rule `rxjs-angular/no-unsafe-takeuntil` and `rxjs/no-unsafe-subject-nexted` to catch patterns at write time; include memory profiling in performance review checklist (Chrome DevTools heap snapshot before and after navigating to key routes five times).

**Large enterprise app →** Angular DevTools for component lifecycle inspection; periodic Chrome Memory Tabs profiling as part of release validation; `takeUntilDestroyed()` mandated in team Angular standards document; signals (`toSignal`) adoption over manual subscriptions reduces the surface area for leaks further; performance budget includes "heap size after 10 navigation cycles" as a measurable threshold.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Single-page checkout flows with many subscription-heavy components; payment status polling must clean up when user navigates away (not continue polling after checkout is abandoned); memory leaks in payment flows degrade performance on lower-end Android browsers used by most Indian merchants | takeUntil on payment status polling; async pipe for checkout state; awareness of mobile memory constraints |
| Swiggy / Meesho | Delivery tracking components with WebSocket subscriptions; route-to-route navigation happens frequently (homepage → restaurant → cart → checkout → tracking); each navigation must clean up previous component subscriptions; memory growth across navigation harms app rating on low-RAM phones | takeUntilDestroyed in modern Angular; fromEvent cleanup; WebSocket subscription cleanup |
| Adobe / Microsoft | Long-running creative applications where users stay in the browser for hours; memory stability over 2–4 hour sessions is a product quality requirement; Adobe XD had publicly documented Angular RxJS memory issues in earlier versions; Microsoft Office Online engineers are expected to handle long-session memory management | Deep understanding of subscription lifecycle; async pipe priority; DestroyRef/takeUntilDestroyed patterns |
| SAP Labs | Direct experience: 40 MB heap leak fixed with takeUntil across 15 components; introduced DestroyableComponent base class and ESLint enforcement; SAP Fiori performance standards require memory-stable navigation; senior engineers reviewed for subscription hygiene in code reviews | Real leak story with heap numbers; team-wide enforcement pattern; ESLint rule knowledge |

---

## 10. Related Topics — What to Study Next

- **Topic 219 — Cold vs Hot Observables** — hot Observables (Subject, BehaviorSubject, DOM events) are the primary source of memory leaks because they never complete; cold Observables (HTTP calls, `of()`, `from()`) complete after their final value and unsubscribe naturally; knowing which Observables need `takeUntil` and which clean themselves up is foundational to this topic — cold = usually safe without `takeUntil`; hot = always needs explicit cleanup
- **Topic 220 — Subject, BehaviorSubject, ReplaySubject** — root-scoped service Subjects (`providedIn: 'root'`) are the most common source of leaks because they live longer than any single component; a component that subscribes to a root-service BehaviorSubject without `takeUntil` will always leak; understanding Subject lifetimes tells you which subscriptions are high-risk
- **Topic 215 — Angular Change Detection** — `ChangeDetectorRef.markForCheck()` is often called inside subscription callbacks of OnPush components; if the subscription leaks (no takeUntil), `markForCheck()` keeps getting called on a destroyed component; the interaction between leaked subscriptions and OnPush CD can cause `ExpressionChangedAfterItHasBeenChecked` errors in devMode and silent wrong-state rendering in prod
- **Topic 221 — switchMap, mergeMap, concatMap, exhaustMap** — the correct replacement for nested subscribes; higher-order operators manage their own inner subscription lifetime and respond correctly to the outer `takeUntil` signal; any pattern with subscribe-inside-subscribe should be converted to a higher-order operator, then the outermost subscription gets `takeUntil` — this is the composable, leak-safe pattern

---

*Part 12 · RxJS — takeUntil Memory Leak Prevention · Full Stack Interview Guide · Hruday D · 2026*
