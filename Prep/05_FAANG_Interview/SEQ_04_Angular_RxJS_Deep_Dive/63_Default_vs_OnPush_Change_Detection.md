# 63. Default vs OnPush Change Detection
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Angular's Default change detection checks every component in the tree after every async event. OnPush limits checks to components where an `@Input` reference changed, an async pipe emitted, or change detection was triggered manually. At SAP's BI dashboard with 200+ widget components, switching all leaf widgets to OnPush reduced change detection time per interaction from ~18ms to ~3ms, which dropped INP from 400ms to 120ms — a number that directly impacted our Core Web Vitals score.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Angular's change detection (CD) is the mechanism that keeps the DOM in sync with component state. After any async event, Angular runs a **check cycle** — walking the component tree and comparing current state to the last snapshot to determine what to update in the DOM.

**Default CD** checks every component every cycle. **OnPush CD** opts a component subtree out of automatic checks, only re-checking under specific conditions.

### How It Works Internally

**Default (ChangeDetectionStrategy.Default):**
- After any async event (click, xhr, setTimeout, WebSocket message), zone.js notifies Angular
- Angular runs `ApplicationRef.tick()` which starts at the root component
- Every component in the tree is checked — all bindings re-evaluated top-to-bottom
- The "dirty check" compares `currentValue !== previousValue` for each binding
- Any component that changed gets its DOM updated via the renderer

**OnPush (ChangeDetectionStrategy.OnPush):**
- An OnPush component is only checked when one of four conditions is true:

| Condition | How it happens |
|---|---|
| An `@Input()` reference changes | Parent re-renders with a new object/array reference |
| An `async` pipe's Observable emits | Pipe calls `markForCheck()` internally |
| An event fires from within the component | Angular CD tracks component-internal events |
| `ChangeDetectorRef.markForCheck()` is called | Manual opt-in to next check cycle |

- If none apply, the component is **skipped** during the check walk — Angular doesn't enter its subtree

**The CD tree walk:**

```
Default:                    OnPush:
AppComponent ✓              AppComponent ✓
├── NavComponent ✓          ├── NavComponent ✓ (OnPush, input changed)
│   └── MenuComponent ✓    │   └── MenuComponent ✓ (child of dirty OnPush)
├── DashboardComponent ✓   ├── DashboardComponent (OnPush, no change → SKIP)
│   ├── Widget1 ✓           │   ├── Widget1 (SKIP — subtree not entered)
│   ├── Widget2 ✓           │   ├── Widget2 (SKIP)
│   └── Widget3 ✓           │   └── Widget3 (SKIP)
└── FooterComponent ✓      └── FooterComponent ✓ (no OnPush — always checked)
```

**OnPush + Immutability contract:**
OnPush ONLY detects input changes when the reference changes. If a parent mutates an array in place (`items.push(newItem)`) and passes the same reference, the OnPush child never re-renders. This is why OnPush mandates immutable data patterns — spread operator, `Object.assign`, return new arrays instead of mutating.

**Internal mechanism — `LView` flags:**
Angular's internal component view data (`LView`) has a `dirty` flag. When an OnPush trigger fires, Angular calls `markForCheck()` which walks up the component tree to the root, marking all ancestors as dirty. On the next tick, Angular traverses the tree but skips branches marked as clean.

### Architecture & Component Boundaries

```
Strategy choice by component type:

Container components (smart):
  - Use Default OR OnPush with async pipe
  - Own state, make HTTP calls, dispatch actions
  - Should be few in number

Presentational components (dumb):
  - Always OnPush
  - Receive data via @Input, emit via @Output
  - Do NOT hold state, no side effects
  - All data flows through @Input references

Rule: If a component doesn't make decisions, it should be OnPush.
```

### Data Flow & State Flow

With OnPush, data flow becomes **push-based**:
- Push-based: parent creates new reference → child re-checks → DOM updates
- Pull-based (Default): Angular pulls state from every component on every tick

With `async` pipe: Observable → `async` pipe calls `markForCheck()` on emission → component re-checks → DOM reflects new value. The `async` pipe is the idiomatic OnPush pattern.

### Performance Implications

- **Default on 100 components:** Each async event checks all 100 components — O(n) per event where n = component count.
- **OnPush on 100 components, sparse inputs:** Only components with changed inputs are checked — effectively O(m) where m = changed component count, typically << n.
- **Real numbers (SAP BI):** 200 widget components, user scrolls a filter → Default: all 200 checked → 18ms CD time. OnPush: 3 filter components checked → 3ms. INP went from 400ms to 120ms.
- **Core Web Vitals impact:** INP (Interaction to Next Paint) directly measures CD and rendering time after user interaction. OnPush is the #1 INP optimization in data-heavy Angular apps.
- **Bundle size:** Zero impact — strategy is a build-time annotation.

### Scalability Considerations

- **< 20 components:** Default is fine; performance difference imperceptible.
- **50–200 components:** OnPush for leaf components provides measurable INP improvement.
- **200+ components (dashboard/data grid):** OnPush + immutable state is non-negotiable. Default CD at this scale produces janky interactions measurable in Chrome DevTools.
- **Signals (Angular 17+):** Signals make OnPush partially redundant — fine-grained reactivity replaces zone-triggered full-tree checks. But OnPush is still the current production standard.

### Trade-offs

| OnPush | Default | Choose OnPush when |
|---|---|---|
| Explicit state flow — bugs are harder to create silently | Forgiving — mutation works | OnPush: component receives all data via @Input |
| Requires immutable data patterns | Works with mutable state | OnPush: presentational components |
| Better performance for complex trees | Simple, zero mental overhead | Default: prototype or tiny app only |
| Must use `async` pipe or `markForCheck()` for service state | Direct property updates work | OnPush: mature, production Angular code |

### ⚠️ Anti-Patterns & Pitfalls

- **Mutating an `@Input` object in-place with OnPush** — `component.items.push(x)` doesn't change the reference. The child OnPush component never re-renders. Always return new references: `component.items = [...component.items, x]`.
- **Calling a service in a template expression with Default CD** — `{{ calculateTotal() }}` is called on every CD cycle. With 100 components this runs 100 times per event. Move to `ngOnInit` or use `pure` pipe.
- **Not using `async` pipe with OnPush** — directly subscribing in `ngOnInit` and assigning to a component property requires `this.cdr.markForCheck()` after every emission. Miss one and the view goes stale. Use `async` pipe — it handles this automatically.
- **Enabling OnPush without immutable state** — the contract is broken silently. The component doesn't update, users see stale data, and the bug is very hard to find without understanding OnPush semantics.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
The SAP BI Launchpad had 200+ widget tiles on the main dashboard. Each tile was a component with Default CD. Scrolling the filter bar — a single zone.js event — triggered all 200 components to run their CD cycle. Chrome DevTools Performance profiler showed 18ms of scripting time per scroll event. I added `ChangeDetectionStrategy.OnPush` to all 200 widget tiles and enforced immutable `@Input` patterns for the tile data objects. CD time per event dropped to ~3ms. INP went from 400ms to 120ms — the only change was CD strategy.

At Bosch, the real-time data feed updated many components simultaneously via a BehaviorSubject. Using `async` pipe in templates with OnPush meant only components that had an active Observable emission in that tick were re-checked, rather than all components on every WebSocket message.

**At FAANG scale:**
- **Microsoft (Azure Monitor):** Metrics dashboard with time-series charts — all chart components are OnPush. Only the chart that received new data from its Observable is re-checked. Without OnPush, every chart would re-evaluate all bindings on every metrics data point.
- **Adobe (Photoshop Web):** Layer panel components are OnPush with immutable layer state objects. Adding a layer creates a new array reference — only the layer list component re-renders, not all other unrelated panels.
- **Salesforce (Activity Feed):** Feed item components are all OnPush. As new feed items arrive via WebSocket, only the feed list receives the new reference; individual item components are stable and skipped.
- **Cisco (WebEx participant list):** Participant tile components are OnPush — when one participant's video state changes, only that participant's component re-checks, not all 50 participant tiles.

**How it evolves with scale:**
- Small scale (< 20 components): Default is perfectly adequate.
- Medium scale (50–200 components): OnPush for leaf/presentational components — noticeable INP improvement.
- Large scale (200+ components): OnPush is mandatory — Default CD makes complex dashboards completely unresponsive. Combine with `trackBy` in `ngFor` and pure pipes for maximum effect.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "Angular's Default change detection checks every component in the tree after every async event — click, HTTP response, timer, WebSocket message. For a small app with 20 components that's fine, but in a data-heavy dashboard with 200+ components it becomes a serious performance problem.
>
> OnPush opts a component subtree out of automatic checks. An OnPush component is only re-checked when an `@Input()` reference changes, when an `async` pipe emits a new value, when an internal event fires, or when you manually call `markForCheck()`. If none of those happen, Angular skips the entire subtree during change detection — it doesn't even enter it.
>
> The key contract is immutability — OnPush only detects new object/array *references*, not mutations. If you mutate an input object in place, the child never re-renders. That's actually a feature: it forces clean data flow patterns.
>
> At SAP's BI Launchpad, adding OnPush to 200 widget tiles reduced change detection time per scroll event from 18ms to 3ms. INP dropped from 400ms to 120ms. That was the most impactful performance change in the whole project — just a one-line strategy annotation and immutable data enforcement."

### Likely Follow-up Questions

1. **If I mutate an `@Input` array in-place with OnPush, what happens?** → The child component sees the same reference — `ngOnChanges` doesn't fire, `markForCheck` isn't called — the view is stale. Return a new array.
2. **How does `async` pipe work with OnPush?** → `async` pipe internally calls `markForCheck()` on every emission, which marks the component and its ancestors as dirty for the next CD cycle.
3. **`markForCheck()` vs `detectChanges()`?** → `markForCheck()` marks the component for the next scheduler cycle; `detectChanges()` triggers synchronous CD immediately on this component subtree. Topic 66 covers this.
4. **Does OnPush work with NgRx selectors?** → Yes — selectors are Observables, `async` pipe handles `markForCheck()`. This is the canonical pattern: selector → async pipe → OnPush component.

### vs Alternatives

| OnPush + async pipe | Signals (Angular 17+) | Choose when |
|---|---|---|
| Per-component opt-in required | Fine-grained per-binding reactivity | Signals: new code in Angular 17+ |
| Works with all Observable patterns | New API, not all libs support yet | OnPush: existing RxJS/NgRx codebase |
| Zone.js still runs (notifies CD) | Can run zoneless — no zone.js overhead | Signals: ultimate performance, new architecture |
| Industry standard, well-documented | Emerging standard | OnPush: safest current production choice |

### How to Signal Senior Thinking

> "The mental model shift with OnPush is from pull-based to push-based rendering. Default CD pulls state from every component on every tick. OnPush makes components passive — they wait to be pushed new data via reference changes or Observable emissions. That push-based model is what makes Angular applications scale to hundreds of components without performance degradation."

---

## 💻 5. Code Example

```typescript
// tile-widget.component.ts — presentational, all data via @Input
@Component({
  standalone: true,
  selector: 'app-tile-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,  // opt-in
  imports: [CommonModule, AsyncPipe, DecimalPipe],
  template: `
    <!-- async pipe: calls markForCheck() on emission automatically -->
    <div class="tile" [class.loading]="(metric$ | async) === null">
      <span class="label">{{ config.label }}</span>
      <span class="value">{{ (metric$ | async)?.value | number: '1.0-0' }}</span>
      <span class="trend" [class.up]="(metric$ | async)?.trend > 0">
        {{ (metric$ | async)?.trend | number: '+1.1-1' }}%
      </span>
    </div>
  `,
})
export class TileWidgetComponent {
  // @Input — OnPush detects reference changes here
  @Input({ required: true }) config!: TileConfig;
  @Input() metric$!: Observable<MetricData | null>;
  // ↑ Observable input: parent passes a new Observable reference only when
  //   the stream changes; component stays stable otherwise
}

// dashboard.component.ts — container, provides data
@Component({
  standalone: true,
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TileWidgetComponent, AsyncPipe],
  template: `
    <app-tile-widget
      *ngFor="let tile of tiles; trackBy: trackByTileId"
      [config]="tile.config"
      [metric$]="tile.metric$"
    />
  `,
})
export class DashboardComponent {
  private metricsService = inject(MetricsService);
  private cdr = inject(ChangeDetectorRef);

  // Immutable tiles array — new array reference triggers OnPush in parent
  tiles: TileDefinition[] = this.metricsService.getTileDefinitions().map(config => ({
    config,
    metric$: this.metricsService.getMetricStream(config.id),  // hot Observable
  }));

  trackByTileId = (_: number, tile: TileDefinition) => tile.config.id;
}

// WRONG — will break OnPush:
// ❌ this.tiles.push(newTile)  — same reference, OnPush parent won't re-check

// RIGHT — immutable update:
// ✅ this.tiles = [...this.tiles, newTile]  — new reference, OnPush detects it

// Service pushing data — triggers only the subscribed tile's markForCheck()
@Injectable({ providedIn: 'root' })
export class MetricsService {
  private streams = new Map<string, BehaviorSubject<MetricData | null>>();

  getMetricStream(tileId: string): Observable<MetricData | null> {
    if (!this.streams.has(tileId)) {
      this.streams.set(tileId, new BehaviorSubject<MetricData | null>(null));
    }
    return this.streams.get(tileId)!.asObservable();
  }

  updateMetric(tileId: string, data: MetricData): void {
    // This emission triggers markForCheck() only in TileWidgetComponents
    // subscribed to this specific tileId stream — other 199 tiles are untouched
    this.streams.get(tileId)?.next(data);
  }
}
```

**Interview vs Production difference:**
In an interview, show the `OnPush` annotation + `async` pipe pattern. In production, add `shareReplay(1)` to streams (prevent re-subscription on `async` pipe recreation), `distinctUntilChanged()` to prevent unnecessary CD cycles for repeated equal values, and a comprehensive `trackBy` for all `ngFor` loops.

---

## 🧠 6. Memory Aid

**Mental Model:** Default CD = a security guard who checks every room in the building after every alarm. OnPush CD = a security guard who only checks rooms where the entry card was swiped — all other rooms are skipped.

**If you go blank:** "OnPush skips a component's check unless an @Input reference changed, an async pipe emitted, or markForCheck was called. Requires immutable data — mutation without reference change is invisible to OnPush."

**Mnemonic:** **RAIM** — **R**eference change on @Input, **A**sync pipe emission, **I**nternal event, **M**anual markForCheck — these are the four conditions that trigger an OnPush check.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Directly reduces INP (Interaction to Next Paint) — the Core Web Vitals metric for responsiveness
→ Performance: O(n) → O(m) change detection, where m << n for stable component trees
→ Business: SAP BI Launchpad: INP 400ms → 120ms purely from OnPush + immutable data — no refactoring, no new architecture

**How it works (3 sentences):**
Angular's Default strategy runs change detection on every component in the tree after every async event; OnPush opts a component subtree out, only checking when an `@Input` reference changes, an `async` pipe emits, an internal event fires, or `ChangeDetectorRef.markForCheck()` is called. The `async` pipe is the canonical OnPush enabler — it automatically calls `markForCheck()` on every Observable emission, keeping the view live without manual intervention. The performance contract is immutability: OnPush components only see new data when they receive new object/array references, not in-place mutations.

**Company relevance:**
- Microsoft: Azure Monitor dashboards with live metric charts — OnPush ensures only charts receiving new data re-render, keeping 60fps scroll on metric-dense screens
- Adobe: Photoshop Web layer panel — 100+ layer tiles, all OnPush; adding/modifying a layer creates a new array reference touching only the layer list component, not every layer tile
- Salesforce: Activity feed with real-time updates — OnPush + WebSocket pushes ensure only the feed list component rerenders, not every feed item card
- Cisco: WebEx participant grid — 50 video tiles, all OnPush; single participant state change touches only that participant's tile, maintaining smooth 60fps video grid during participant events

---
✅ Topic 63/486 complete → Continuing to Topic 64: zone.js — How It Intercepts Async Operations
