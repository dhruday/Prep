# Angular Change Detection — Default vs OnPush
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Change Detection (CD)**: Angular's mechanism to sync the component model (TypeScript properties) with the view (DOM); on each CD cycle, Angular checks if any bound template expression has changed and updates the DOM if so; triggered by Zone.js after ANY async event (click, setTimeout, HTTP response, setInterval, Promise, etc.)
- **Default (CheckAlways)**: Angular checks EVERY component in the entire tree after EVERY event, from root to leaves; reliable but expensive; a click on one button triggers CD on ALL components whether they could possibly have changed or not
- **OnPush**: component re-renders ONLY when one of its `@Input()` reference changes (new object reference, not mutation), when an `async` pipe triggers (Observable emits), when `ChangeDetectorRef.markForCheck()` is called, or when an event ORIGINATES from within the component or its children; all other components in the tree are skipped during that CD cycle
- **Immutability required**: OnPush works because Angular can compare `@Input()` references with `===`; if you MUTATE an object (push to an array, update a property), the reference stays the same → OnPush sees no change → view does NOT update; always return new object/array references for state changes
- **`ChangeDetectorRef`**: injected service to manually control CD; `markForCheck()` marks the component and ALL its ancestors for CD in the next cycle (used in OnPush with async data); `detectChanges()` runs CD synchronously on this component and its descendants (used in isolated scenarios like virtual scroll); `detach()` removes the component from CD entirely (manual control)
- ✅ **Hruday's anchor**: at Bosch, OnPush + `async` pipe + RxJS stream achieved 60fps rendering for a real-time WebSocket dashboard with 100ms update intervals

---

## 1. One-Line Definition
Angular's change detection determines when to update the DOM — Default mode checks everything after every event (safe but potentially slow), while OnPush mode checks a component only when its immutable inputs change, an Observable emits, or it's explicitly marked — enabling significant performance gains for data-heavy applications.

---

## 2. The Problem It Solves

A dashboard has 200 components. User clicks a button that changes state in ONE component. Angular's Default CD cycles through all 200 components to check if any template expressions changed — even the 199 components that couldn't possibly have changed because they don't share any state with the clicked component.

With 200 components and 50 bound expressions each: potentially 10,000 expression evaluations per event. At 60fps (16ms per frame), the component tree must complete in under 16ms or frames drop.

OnPush solves this: 199 of the 200 components have `@Input()` references that didn't change. Angular skips them entirely. Only the one component whose input reference changed (or whose child event triggered) is checked. CD work drops to the components actually relevant to the change.

---

## 3. How It Works Internally

### Zone.js and the Change Detection Trigger

```
Traditional Angular CD pipeline (with Zone.js):

1. Zone.js patches async APIs: setTimeout, setInterval, XMLHttpRequest,
   fetch, Promise.then, addEventListener, MutationObserver, etc.

2. After ANY async operation completes (any of the above), Zone.js calls:
   ApplicationRef.tick() → full change detection cycle

3. Angular walks the component tree depth-first from the root:
   AppComponent → LayoutComponent → NavComponent → DashboardComponent
                                  → SidebarComponent
                → MainComponent  → ChartComponent
                                 → TableComponent
                                 → FilterComponent
   Checks every bound expression at every node.
   
   For function calls in templates ({{ data.compute() }}):
   The function is called on every CD cycle — potentially hundreds of times/sec.
   This is why template function calls are a performance anti-pattern.

4. For each component:
   Default     → ALWAYS check (regardless of input changes)
   OnPush      → Check ONLY IF marked dirty (input ref changed, event from component,
                  Observable emitted via async pipe, markForCheck() called)
```

### Default vs OnPush CD Cycle

```
Component tree structure with OnPush annotations:

AppComponent [Default]
├── NavbarComponent [OnPush]
│   └── UserAvatarComponent [OnPush]
├── DashboardComponent [OnPush]
│   ├── MetricCardComponent [OnPush]  ← Has WebSocket input
│   ├── MetricCardComponent [OnPush]
│   ├── RevenueChartComponent [OnPush]
│   └── AlertBannerComponent [OnPush]
└── FooterComponent [OnPush]

Event: User clicks a button INSIDE MetricCardComponent

Default mode (without OnPush):
  Even with OnPush on MetricCardComponent, the DEFAULT AppComponent is always checked.
  Angular walks DOWN from AppComponent:
    → AppComponent: check (Default) ✓
    → NavbarComponent: check (marked? no → SKIP children) 
    → DashboardComponent: check (marked? MetricCard caused event → YES, check)
      → MetricCardComponent: check (event origin → YES) ✓
        (other MetricCards): SKIP (no input change, no event origin)
      → RevenueChartComponent: SKIP
      → AlertBannerComponent: SKIP
    → FooterComponent: SKIP
  
  Only the component chain from the event's component to the root is checked.
  All siblings and unrelated subtrees are SKIPPED.

Key: OnPush components are DIRTY (need check) when:
  1. An @Input() reference changes (=== comparison)
  2. An event (click, etc.) originates from within the component tree
  3. An Observable emits via the async pipe
  4. markForCheck() or detectChanges() is called
```

### Immutability is Non-Negotiable with OnPush

```typescript
// What OnPush sees when checking an @Input():
// Angular stores the previous value and compares with ===

// ❌ MUTATION — OnPush MISSES this change
this.data.push(newItem);   // Same array reference → === is still true → NOT DIRTY
this.user.name = 'Hruday'; // Same object reference → NOT DIRTY

// ✅ IMMUTABLE UPDATE — OnPush DETECTS this change
this.data = [...this.data, newItem];         // NEW array reference → === is false → DIRTY
this.user = { ...this.user, name: 'Hruday'}; // NEW object reference → DIRTY

// For @Input() binding:
@Input() metrics: MetricData; // OnPush component

// Parent passing same object with mutated property — MISSED by OnPush:
this.metrics.value = 42;          // Mutation — no new reference
// <child-component [metrics]="metrics"> still shows old value

// Parent passing new object — DETECTED by OnPush:
this.metrics = { ...this.metrics, value: 42 }; // New reference
// <child-component [metrics]="metrics"> updates correctly
```

---

## 4. The Code

### Wrong Way — Default CD Under Load, and Missed Updates

```typescript
// ❌ WRONG — Default CD on a high-frequency data component
@Component({
  selector: 'realtime-dashboard',
  // No changeDetection — defaults to ChangeDetectionStrategy.Default
  template: `
    <!-- ❌ Function call in template: runs on EVERY CD cycle -->
    <div>{{ computeTotal() }}</div>
    <div *ngFor="let metric of metrics">{{ metric.value }}</div>
  `
})
export class RealtimeDashboardComponent {
  metrics: MetricData[] = [];
  
  // Called 60 times per second with Angular's CD — even if metrics didn't change!
  computeTotal(): number {
    return this.metrics.reduce((sum, m) => sum + m.value, 0);
  }
  
  updateMetrics(newData: MetricData[]) {
    // ❌ MUTATION: same array reference, just content changed
    // Even if this component had OnPush, the update would be missed
    newData.forEach(m => {
      const existing = this.metrics.find(e => e.id === m.id);
      if (existing) existing.value = m.value; // mutates in place
    });
  }
}

// ❌ WRONG — OnPush without markForCheck in async subscription
@Component({
  selector: 'async-metric',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ currentValue }}</div>`
})
export class AsyncMetricComponent implements OnInit {
  currentValue = 0;
  
  constructor(
    private metricsService: MetricsService,
    // Missing: private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit() {
    this.metricsService.getMetricStream()
      .subscribe(value => {
        this.currentValue = value;
        // ❌ OnPush component: property changed but Angular won't re-render!
        // The subscription callback runs outside Angular's zone awareness
        // because it came from an Observable (not a DOM event)
        // View stays at 0 forever despite currentValue updating
      });
  }
}
```

> **Why this fails:** function calls in templates execute on every CD cycle — with Default CD that's after every event, potentially hundreds of times per second. Without `markForCheck()` in an OnPush component's subscription callback, view updates are silently missed.

### Right Way — OnPush + async Pipe + Immutable State

```typescript
// ✅ RIGHT — OnPush with async pipe (Angular's recommended pattern)
// The async pipe is CD-aware: when the Observable emits, it calls markForCheck()
@Component({
  selector: 'realtime-metric-card',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [ngClass]="{ 'alert': (metric$ | async)?.isAlert }">
      <!-- async pipe subscribes, marks for check on each emission, unsubscribes on destroy -->
      <span class="value">{{ (metric$ | async)?.value | number:'1.2-2' }}</span>
      <span class="label">{{ (metric$ | async)?.label }}</span>
    </div>
  `
})
export class RealtimeMetricCardComponent {
  // @Input is an Observable → no mutable property, no markForCheck() needed
  @Input() metricId!: string;
  
  metric$!: Observable<MetricData>;
  
  constructor(private metricsService: MetricsService) {}
  
  ngOnInit() {
    this.metric$ = this.metricsService.getMetric(this.metricId).pipe(
      // Optional: debounce bursts for display
      debounceTime(50),
      // Optional: only emit if value actually changed
      distinctUntilChanged((a, b) => a.value === b.value)
    );
  }
  // No subscription management! async pipe subscribes and unsubscribes automatically.
  // OnPush + async pipe = perfect combination: CD runs only when Observable emits.
}

// ✅ RIGHT — OnPush with manual markForCheck (when you must use subscribe())
@Component({
  selector: 'chart-component',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #chartRef></canvas>`
})
export class ChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartRef') chartRef!: ElementRef<HTMLCanvasElement>;
  
  private chart!: Chart;
  private readonly destroy$ = new Subject<void>();
  
  constructor(
    private metricsService: MetricsService,
    private cdr: ChangeDetectorRef  // Inject ChangeDetectorRef for manual control
  ) {}
  
  ngOnInit() {
    this.metricsService.getChartData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // Update Chart.js imperatively (outside Angular's template binding)
        this.chart.data.datasets[0].data = data.values;
        this.chart.update();
        
        // If any template expressions depend on computed values:
        // Tell Angular this component is dirty — check it on the next CD cycle
        this.cdr.markForCheck();
        // (In this case, chart is drawn by Chart.js directly — markForCheck not needed
        //  unless there are also Angular template bindings to update)
      });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// ✅ RIGHT — Immutable update pattern in OnPush parent
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <metric-card 
      *ngFor="let metric of metrics; trackBy: trackByMetricId"
      [metric]="metric">
    </metric-card>
  `
})
export class DashboardComponent {
  metrics: MetricData[] = [];
  
  trackByMetricId(index: number, metric: MetricData): string {
    return metric.id; // ngFor efficiency + OnPush: stable identity helps both
  }
  
  updateMetricValue(id: string, newValue: number) {
    // ✅ Immutable update: map returns NEW array with NEW object for changed item
    // OnPush MetricCardComponent will detect the NEW object reference
    this.metrics = this.metrics.map(m => 
      m.id === id ? { ...m, value: newValue } : m
      //             ↑ New object for changed metric — new reference → OnPush detects
    );
    // this.metrics is now a new array reference too → parent's ngFor updated
  }
}

// ✅ RIGHT — detach() for completely manual control (advanced case — virtual scroll)
@Component({
  selector: 'virtual-scroll-row',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualScrollRowComponent implements OnInit {
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit() {
    // Detach: this component is COMPLETELY excluded from Angular's CD tree
    // Angular never checks it again unless we call detectChanges() or reattach()
    this.cdr.detach();
  }
  
  // Called by the virtual scroll container when this row's data changes
  renderWithData(data: RowData) {
    this.rowData = data;
    // Manually trigger CD for JUST this component and its subtree
    // (not the entire tree — extremely targeted)
    this.cdr.detectChanges();
  }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When does an OnPush component re-render?"

**Hruday's answer:**
> An OnPush component updates (gets included in the CD cycle) in exactly four scenarios:
>
> First: an `@Input()` reference changes — Angular compares using `===`; if the parent passes a new object or array reference, the OnPush component is marked dirty. If the parent MUTATES the existing object, the reference is the same, and OnPush misses the change. This is why OnPush requires immutable state patterns.
>
> Second: an Observable emits via the `async` pipe — the `async` pipe internally calls `markForCheck()` when the Observable emits, signalling Angular to check this component on the next CD cycle. This is the canonical pattern for real-time data in OnPush components.
>
> Third: an event originates from within the component — a user clicking a button, a form input change, any DOM event that fires from inside the OnPush component or its children. Zone.js catches this event and marks the component's path up to the root as dirty.
>
> Fourth: `ChangeDetectorRef.markForCheck()` or `detectChanges()` is called explicitly — manual escape hatch for scenarios like subscribing outside the `async` pipe, integrating third-party libraries, or Web Workers sending data via `postMessage`.

---

### Q2 — Bosch Experience
**Interviewer asks:** "Walk me through how you achieved 60fps rendering for a real-time dashboard."

**Hruday's answer:**
> The Bosch manufacturing dashboard was receiving WebSocket updates at 100ms intervals — roughly 10 metric updates per second per widget, with 20 widgets on screen. Under Default change detection, every 100ms update triggered a full CD cycle across all 20+ components. On lower-end Windows laptops (the hardware the manufacturing floor actually used), this caused visible frame stuttering.
>
> Three changes achieved 60fps rendering:
>
> First: all dashboard components were converted to OnPush. This meant Angular only checked components whose Observable streams had emitted in a given frame — typically 1-3 of the 20 components, not all 20.
>
> Second: every metric stream went through the `async` pipe. This eliminated all manual `subscribe()` calls and their associated `markForCheck()` bookkeeping. The async pipe handled subscription, emission-triggered CD marking, and cleanup on destroy. Template: `{{ (metric$ | async)?.value }}`.
>
> Third: we added `distinctUntilChanged()` and `debounceTime(50)` to the Observable pipes. If WebSocket sent the same value twice in 50ms, the second emission was suppressed — no CD, no render. This cut the actual CD work roughly in half for stable metrics.
>
> Result: CPU usage dropped from 35% (sustained) to 8% on the same hardware profile. Rendering was visually smooth at 60fps on the manufacturing floor terminals.

---

### Q3 — Deep Dive
**Interviewer asks:** "What's the difference between `markForCheck()` and `detectChanges()`?"

**Hruday's answer:**
> Both are on `ChangeDetectorRef` and both overcome OnPush's skipping — but they work differently.
>
> `markForCheck()`: SCHEDULES the component for checking in the NEXT Angular CD cycle. It doesn't run CD immediately — it marks the component and its entire ancestor chain as dirty. Angular will check them all in the next `ApplicationRef.tick()` call (which Zone.js triggers after the current async operation completes). Use this in subscribe callbacks when you want to update the view with new data — it's async, batches with other CD work, safe in any context.
>
> `detectChanges()`: runs CD synchronously RIGHT NOW on this component and its descendants, bypassing the Zone.js scheduling mechanism. Use this when you need an IMMEDIATE DOM update — like when a third-party library needs to read a DOM measurement right after an Angular state change, or when a Web Worker sends a message and you need the DOM to reflect it before taking the next action. It's more aggressive and can potentially cause issues if called in the middle of another CD cycle.
>
> My rule: default to `markForCheck()`. Use `detectChanges()` only when ordered execution matters — when code AFTER the call needs the DOM to be updated synchronously. In practice, `detectChanges()` is needed mainly for advanced patterns like detached components (virtual scroll rows that manage their own rendering) or integration with non-Zone-aware libraries.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "OnPush makes Angular faster automatically" | "Just add OnPush to all components for better performance" | OnPush is only as effective as the patterns it requires: you MUST use immutable updates (new object/array references for changes), you MUST use the `async` pipe or `markForCheck()` for async data, you MUST NOT have function calls in templates; slapping OnPush on a component that still mutates objects and has template functions will look like it works (no errors) but will have subtle stale-view bugs that are hard to reproduce |
| "Zone.js is required for Angular" | "Angular needs Zone.js to detect changes" | Zone.js is Angular's DEFAULT change detection trigger, but it's not required; Angular 17+ supports `provideExperimentally { zoneless: true }` for Zone.js-free apps; Angular Signals (v17+) with signal-based components enable fully zoneless change detection where only components with changed signals are updated; Zone.js-free is the FUTURE direction of Angular CD |
| "async pipe subscribes once" | "The async pipe subscribes to the Observable once" | The async pipe subscribes once per TEMPLATE BINDING, not once per component; if a template has `{{ vm$ | async }}` twice (rare but possible), that's two subscriptions, two emissions, two markForCheck calls; use `let` template variable pattern to bind once: `*ngIf="vm$ | async as vm"` — subscribes once, exposes the value as `vm` for multiple template uses |
| "detectChanges causes infinite loops" | "I avoid detectChanges because it can cause infinite loops" | A genuine infinite loop requires a CD run to trigger another state change that triggers another CD run — this is an APPLICATION BUG, not a `detectChanges` problem; calling `detectChanges()` in normal scenarios (subscriber callback, WebSocket handler) doesn't loop; where it CAN be dangerous: calling `detectChanges()` inside a lifecycle hook that modifies state that triggers CD again — Angular provides `ExpressionChangedAfterItHasBeenCheckedError` warnings to catch this pattern in development |

---

## 7. Hruday's Real Experience Hook
> "The Bosch Stellantis manufacturing dashboard is my clearest example of what OnPush change detection actually means in production performance numbers. Before the OnPush migration, the dashboard was burning 35% CPU on the standard corporate Windows laptops, and manufacturing supervisors were complaining about charts that were 'sticky' — they would lag, then catch up in a visible jump rather than smoothly updating.
>
> The Angular DevTools profiler (introduced in Angular 12) was invaluable. It showed the CD flame graph: on every WebSocket tick, 28 components were being checked even though only 2-3 were actually receiving new data. The other 25 components — navigation header, breadcrumbs, sidebar metrics that hadn't changed — were doing full template expression evaluation for nothing.
>
> After adding `changeDetection: ChangeDetectionStrategy.OnPush` to all components and converting all data bindings to the `async` pipe pattern, the profiler showed 3 components checking per tick instead of 28. CPU usage dropped to 8%. The frame stuttering disappeared.
>
> The single most important lesson: don't mix OnPush with mutable objects. During the migration, two widgets briefly showed 'frozen' values. The bug: the WebSocket message handler was mutating the data object in place (`metric.value = newValue`) instead of producing a new reference. OnPush correctly identified 'same reference → no change' and cached the stale value. The fix was a one-line change to `this.metricData = { ...this.metricData, value: newValue }`. After that, everything was smooth and correct."

---

## 8. Scale Evolution

**Standard Angular app →** Enable OnPush on all data-display components (those that receive `@Input()` data); use `async` pipe for all Observable bindings — eliminates memory leaks and markForCheck boilerplate simultaneously; avoid template function calls (use getters or pure pipes instead).

**Data-heavy dashboard / real-time app →** `trackBy` on all `*ngFor` loops (prevents unnecessary DOM destruction/recreation on list updates); `distinctUntilChanged` + `debounceTime` on high-frequency streams before `async` pipe binding; Angular DevTools profiler to measure CD work before and after OnPush adoption.

**Ultra-performance / zoneless (Angular 17+ future) →** Angular Signals (`signal()`, `computed()`, `effect()`) with `@Component({ ... })` signal-aware templates; Angular 17's `provideExperimentally({ zoneless: true })` removes Zone.js entirely; only signal-reading components re-render; no Zone.js monkey-patching means smaller bundle, faster startup, compatibility with non-Zone third-party libraries; combines naturally with standalone components.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Real-time payment status updates in checkout; payment analytics dashboards with frequent metric updates; OnPush + async pipe for live payment tracking widgets; immutable state mandatory for financial accuracy (mutable state causing stale display of payment amounts is a critical UX bug) | OnPush for real-time payment status; immutability requirement for financial data; markForCheck for WebSocket integration |
| Swiggy / Meesho | Live delivery tracking components (60 second polling); order status updates; product availability (out-of-stock realtime); high-frequency listing page updates (price, ratings changing); mobile performance critical | OnPush on listing page components; trackBy for product arrays; distinctUntilChanged for delivery position stream |
| Adobe / Microsoft | Document editor with frequent state changes (every keystroke); performance at scale is a product requirement; Azure/Office engineering interviews include Angular CD depth questions; OnPush required for any component in the render critical path | Full CD lifecycle understanding; detach() for virtual scroll; zoneless Angular knowledge |
| SAP Labs | Direct experience: Bosch manufacturing dashboard (real-time WebSocket, OnPush migration, profiler-verified performance); SAP Fiori performance standard requires OnPush on all production components; 8-component default component template includes OnPush in SAP's own Angular schematics | Real production performance numbers (35% → 8% CPU); Angular DevTools profiler fluency; immutable update patterns at SAP |

---

## 10. Related Topics — What to Study Next

- **Topic 218 — Angular Signals v17+** — Angular Signals are the next evolution of change detection, designed to replace Zone.js-triggered full-tree CD; signals make OnPush-like precision automatic — only components that read a changed signal re-render; signals are the direct answer to "what comes after OnPush?" in the Angular change detection story
- **Topic 219 — Cold vs Hot Observables (RxJS)** — the `async` pipe is the CD integration point between Angular and RxJS; understanding cold vs hot Observables affects how the `async` pipe interacts with CD (cold Observable: each `async` pipe binding creates a new subscription; hot Observable: all `async` pipe bindings on the same Observable share one stream); this explains why `*ngIf="vm$ | async as vm"` is preferred over multiple `| async` calls
- **Topic 222 — takeUntil Memory Leak Prevention** — when you CAN'T use the `async` pipe and must manually subscribe (imperative Chart.js integration, Web Worker connections), `takeUntil` + `markForCheck()` is the safe pattern; the two topics are complements — async pipe or takeUntil + markForCheck are the two main patterns for safe OnPush+Observable integration
- **Topic 214 — NgModules vs Standalone Components** — `changeDetection: ChangeDetectionStrategy.OnPush` should be a default in every new standalone component; standalone components define their own scope cleanly and combining `standalone: true` with `OnPush` is the canonical Angular 17+ component pattern; the two features work together naturally

---

*Part 12 · Angular Change Detection — Default vs OnPush · Full Stack Interview Guide · Hruday D · 2026*
