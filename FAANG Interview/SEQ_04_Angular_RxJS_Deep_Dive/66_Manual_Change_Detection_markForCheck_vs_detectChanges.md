# 66. Manual Change Detection — markForCheck vs detectChanges
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Two main methods on `ChangeDetectorRef`: `markForCheck()` enqueues the component for checking on the next zone.js-triggered cycle — it works upward, marking parent components as dirty too, but doesn't run CD immediately. `detectChanges()` runs change detection synchronously right now, on this component and its children only, regardless of the current CD state. I use `markForCheck()` for service-pushed state updates in OnPush components, and `detectChanges()` when I need to synchronously update the view — like after `ngAfterViewInit` initializes a canvas or after a `setTimeout` callback I've moved outside NgZone.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

`ChangeDetectorRef` (CDR) is Angular's handle for manual control over when a component participates in change detection. It exists because:

1. **OnPush components** opt out of automatic CD — you need a way to re-include them explicitly
2. **Outside NgZone operations** (from `runOutsideAngular`) don't trigger CD — you need to manually update the view after them
3. **Immediate synchronous updates** are sometimes needed — like initializing a DOM-dependent library in `ngAfterViewInit`
4. **Performance optimization** — sometimes you want to completely detach a component from CD when it's off-screen

### How It Works Internally

**`ChangeDetectorRef` represents the LView** (Angular's internal component view data structure). It provides six methods:

| Method | What it does | When to use |
|---|---|---|
| `markForCheck()` | Marks this component + ancestors as dirty; CD runs on next tick | OnPush components updated from services |
| `detectChanges()` | Runs CD synchronously on this component subtree NOW | After-view operations, outside-zone updates |
| `detach()` | Disconnects component from CD tree entirely | Virtual scrolling, off-screen components |
| `reattach()` | Reconnects detached component | When off-screen component comes back into view |
| `checkNoChanges()` | Dev-only assertion — throws if binding changed | Same as CD but in assert mode |
| `markDirty()` / `ɵmarkDirty()` | Internal method used by Signals; marks for async flush | Signals system internals |

**`markForCheck()` — the propagation chain:**

```
OnPush ComponentC (markForCheck called)
    → marks ComponentC as dirty
    → walks UP the tree
    → marks ComponentB (parent) as dirty
    → marks ComponentA (root) as dirty
    
Next zone.js-triggered tick:
    → CD runs from root
    → Hits ComponentA (dirty) → checks it
    → Hits ComponentB (dirty) → checks it
    → Hits ComponentC (dirty) → checks it
    → ComponentC's template re-evaluates
```

Key: `markForCheck()` does NOT run CD immediately. It schedules it for the next zone.js tick. If you're outside NgZone, the tick may never come unless something else triggers it.

**`detectChanges()` — synchronous, local:**

```
ComponentC.detectChanges() called
    → IMMEDIATELY runs CD on ComponentC and its CHILDREN
    → Does NOT propagate to parent
    → Does NOT wait for any tick
    → Response is synchronous — DOM is updated before next line executes
```

**`detach()` / `reattach()` — virtual scrolling pattern:**

```
VirtualScrollList
    ├── VisibleItem1 (reattached)
    ├── VisibleItem2 (reattached)
    ├── OffscreenItem3 (detached — CD never runs here)
    └── OffscreenItem4 (detached)
```

A detached component is completely invisible to Angular's CD tree walk — zero cost per cycle. Re-attach when scrolled into view.

### Architecture & Component Boundaries

```
Which method to use:

Service updates component state async (BehaviorSubject) → async pipe (auto markForCheck)
Service updates component state, no async pipe → markForCheck() after .subscribe()
ngAfterViewInit: @ViewChild DOM manipulation → detectChanges() after manipulation
runOutsideAngular → ngZone.run() (preferred) or markForCheck() is not enough alone
Virtual scrolling → detach() + reattach() on scroll
Testing → detectChanges() in TestBed to flush CD in unit tests
```

### Data Flow & State Flow

**Pattern 1 — Service push with `markForCheck()`:**
```
Service.data$.next(newData)
→ Component subscribed in ngOnInit, assigned to this.data
→ this.cdr.markForCheck()
→ On next zone tick → component checked → template re-evaluates
```

**Pattern 2 — Outside NgZone with `detectChanges()`:**
```
ngZone.runOutsideAngular(() => {
  ws.onmessage = () => {
    this.data = processMessage(event.data)
    // Zone.js intercepted nothing — no tick coming
    this.cdr.detectChanges()  // synchronous update now
  }
})
```

**Pattern 3 — `async` pipe (the best pattern):**
```
this.data$ = this.service.data$
// Template: {{ data$ | async }}
// async pipe internally calls markForCheck() on every emission
// Zero manual CDR code needed
```

### Performance Implications

- **`markForCheck()` overhead:** Very small — just flags dirty bits on LView nodes. No DOM work.
- **`detectChanges()` overhead:** Runs actual CD — evaluates all bindings in the subtree. Proportional to subtree size. If called 60fps (from rAF), ensure the subtree is small.
- **`detach()` for off-screen components:** Zero CD cost per cycle — huge win for large lists where 90% of items are out of viewport.
- **Calling `detectChanges()` inside `ngAfterViewChecked`** — infinite loop. The checked hook fires after CD, calling `detectChanges()` from it triggers CD again → infinite recursion. Angular catches this in development mode.

### Scalability Considerations

- **< 20 components:** Rely on `async` pipe — no manual CDR needed in most cases.
- **OnPush + service state:** Inject CDR, call `markForCheck()` in subscription. Cleaner: use `async` pipe always.
- **High-performance lists (1000+ items):** `detach()` all off-screen rows, `reattach()` + `detectChanges()` as they scroll into view — this is what `cdk/virtual-scroll` does internally.
- **Zoneless Angular:** `markForCheck()` and `detectChanges()` still exist but `markDirty()` (used by Signals) is the primary mechanism. CDR methods are retained for backwards compatibility.

### Trade-offs

| `markForCheck()` | `detectChanges()` | Choose `markForCheck()` when |
|---|---|---|
| Asynchronous — runs on next tick | Synchronous — runs immediately | Service push without async pipe |
| Propagates dirtiness UP the tree | Only checks DOWN from this component | Most OnPush service-update cases |
| Requires a zone tick to fire | No zone tick needed | Choose `detectChanges()` when outside zone |
| Safe to call multiple times per frame | Expensive if called in tight loops | detectChanges() for in-zone post-init DOM work |

| Manual CDR | `async` pipe | Prefer `async` pipe |
|---|---|---|
| Verbose, must be in every subscription | Declarative, one template change | All read-only template data |
| Risk of missing markForCheck call | Automatic | No risk of stale view |
| Necessary when binding to mutable properties | Works with Observable only | Async pipe is always preferred |

### ⚠️ Anti-Patterns & Pitfalls

- **Calling `detectChanges()` inside `ngAfterViewChecked`** — causes infinite CD loop. Angular will throw `ExpressionChangedAfterChecked` in dev mode.
- **Calling `markForCheck()` from outside NgZone without a subsequent zone event** — `markForCheck()` marks the component dirty, but if nothing else triggers a zone tick, the check never runs. Use `ngZone.run()` to guarantee the tick, or use `detectChanges()` instead.
- **Forgetting `markForCheck()` after subscribing inside OnPush** — the component updates `this.data` but never re-renders. Classic OnPush + manual subscription bug. Always use `async` pipe or pair subscription with `markForCheck()`.
- **Using `detach()` without `reattach()`** — component is permanently detached; user sees stale data permanently. Always pair with `reattach()` when the component becomes visible again.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At Bosch, a chart legend component was OnPush and received filtered data from a `NGRX selector` piped through an `async` pipe. A requirement came in to also update the legend color scheme based on a theme preference stored in `localStorage` — not an Observable. The fix was to inject `ChangeDetectorRef`, subscribe to a custom `EventEmitter` for theme changes, and call `this.cdr.markForCheck()` after setting the new scheme. The `async` pipe pattern wasn't applicable here because the data source wasn't an Observable.

At SAP, the virtual scrolling implementation for 2,000-row data tables used `cdk-virtual-scroll-viewport`. Understanding how Angular CDK internally uses `ChangeDetectorRef.detach()` and `reattach()` per row item let me debug a performance issue where rows were being re-attached before the viewport calculation completed — rows' `detectChanges()` calls were stacking up synchronously.

**At FAANG scale:**
- **Microsoft (Azure):** Portal uses `detectChanges()` in `ngAfterViewInit` for SVG-based architectural diagram rendering — the SVG is drawn based on `@ViewChild` canvas element dimensions after view init.
- **Adobe (Express):** Template picker grid — 1,000+ templates rendered via `cdk-virtual-scroll`. Off-screen template tiles are detached; only visible ones participate in CD, enabling smooth 60fps scrolling on mobile.
- **Salesforce (Tableau):** Complex chart components `detach()` and `reattach()` based on visibility intersection observer, enabling dashboards with 50+ charts to render without CD overhead.
- **Cisco (WebEx):** Post-call analytics renders summary charts in `ngAfterViewInit` using `detectChanges()` after chart library initialization — guarantees the view is consistent before the user sees it.

**How it evolves with scale:**
- Small scale: Use `async` pipe everywhere — near zero direct CDR usage.
- Medium scale: `markForCheck()` needed for service-driven OnPush state.
- Large scale: `detach()` / `reattach()` for virtual scrolling; `detectChanges()` for post-view-init DOM work.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "ChangeDetectorRef gives you three levels of manual CD control in Angular.
>
> `markForCheck()` is for OnPush components that need to re-render based on service state that isn't going through the async pipe. It marks the component and its ancestors as dirty and waits for the next zone-triggered tick. It's lightweight — just sets a flag — but it won't fire if you're completely outside NgZone.
>
> `detectChanges()` runs CD synchronously right now on this component's subtree. I use it in two situations: in `ngAfterViewInit` after initializing a DOM-dependent library, and in `runOutsideAngular` callbacks where I want the view to update without re-entering NgZone.
>
> `detach()` and `reattach()` are for advanced optimization — completely removing a component from the CD tree when it's off-screen. Angular CDK's virtual scroller uses this internally, which is why it can render 10,000 rows at 60fps.
>
> In practice, the best strategy is to use `async` pipe everywhere possible — it calls `markForCheck()` automatically and you never write manual CDR code. Direct CDR use is reserved for non-Observable state sources and post-view-init DOM operations."

### Likely Follow-up Questions

1. **Why doesn't `markForCheck()` work when called from `runOutsideAngular`?** → It marks dirty but no zone tick fires to run CD. Solution: use `ngZone.run()` to re-enter the zone, or call `detectChanges()` instead.
2. **Can you call `detectChanges()` from a destroyed component?** → It throws a runtime error — must guard with `if (!this.cdr['destroyed'])` or track destruction with a flag.
3. **What's the difference between `markForCheck()` and `markDirty()`?** → `markForCheck()` is the public API for zoned Angular; `markDirty()` (or `ɵmarkDirty`) is the internal method used by Signals for Zoneless scheduling. They have similar semantics but different scheduling mechanisms.
4. **How does TestBed use CDR?** → `fixture.detectChanges()` is a wrapper around `ChangeDetectorRef.detectChanges()` — explicitly triggers CD in unit tests, which don't have a live zone.

### vs Alternatives

| Manual `markForCheck()` | `async` pipe | Prefer `async` pipe |
|---|---|---|
| Manual — must call on every subscription | Declarative — automatic | For all template-bound Observable data |
| Prone to forgetting | Impossible to forget | async pipe: always the first choice |
| Necessary for mutable/non-Observable state | Only works with Observables | Manual: legacy mutable state sources |

| `detectChanges()` | `ngZone.run()` | Choose based on needs |
|---|---|---|
| Synchronous, local subtree only | Re-enters zone, marks whole app dirty | `detectChanges()`: surgical, immediate |
| No zone required | Requires zone.js | ngZone.run(): when you want next-tick CD |

### How to Signal Senior Thinking

> "The architectural discipline is: use `async` pipe and let Angular handle CD automatically. Inject `ChangeDetectorRef` only when you have a non-Observable state source, a post-view-init DOM requirement, or a virtual scrolling optimization. If I'm injecting CDR in more than 10–15% of my components, that's a signal the state management architecture needs revisiting."

---

## 💻 5. Code Example

```typescript
import { Component, ChangeDetectorRef, ChangeDetectionStrategy, inject, NgZone } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'app-sensor-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sensor-value">{{ currentValue }}</div>
    <div class="status" [class.warning]="isWarning">{{ status }}</div>
  `,
})
export class SensorWidgetComponent {
  currentValue = 0;
  status = 'normal';

  get isWarning() { return this.currentValue > 90; }

  private cdr = inject(ChangeDetectorRef);
  private sensorService = inject(SensorService);
  private ngZone = inject(NgZone);

  constructor() {
    // Pattern 1: subscribe to service, manual markForCheck
    // (would prefer async pipe but currentValue is used in imperative logic too)
    this.sensorService.sensorReading$
      .pipe(takeUntilDestroyed())
      .subscribe(reading => {
        this.currentValue = reading.value;
        this.status = reading.value > 90 ? 'critical' : 'normal';
        // OnPush: without this, template never re-renders
        this.cdr.markForCheck();
      });
  }
}

// -------------------------------------------------------
// Pattern 2: detectChanges after outside-NgZone update
// -------------------------------------------------------
@Component({
  standalone: true,
  selector: 'app-canvas-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas #canvasEl width="600" height="300"></canvas>
    <div>Frames: {{ frameCount }}</div>
  `,
})
export class CanvasChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  frameCount = 0;

  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private animFrameId: number | null = null;

  ngAfterViewInit(): void {
    // ngAfterViewInit: @ViewChild resolved — safe to initialize chart
    this.initChart();

    // detectChanges() needed if we modified template-bound properties
    // (frameCount was set in initChart)
    this.cdr.detectChanges();

    // Animation loop outside NgZone — 60fps without triggering CD each frame
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        this.drawFrame();
        this.frameCount++;

        // Re-enter NgZone only every 60 frames (1 second) for stats update
        if (this.frameCount % 60 === 0) {
          this.ngZone.run(() => {
            // frameCount update happens inside zone → triggers zone tick
            // OR: this.cdr.detectChanges() for synchronous update
          });
        }
        this.animFrameId = requestAnimationFrame(loop);
      };
      this.animFrameId = requestAnimationFrame(loop);
    });
  }

  private initChart(): void {
    const ctx = this.canvasEl.nativeElement.getContext('2d')!;
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, 600, 300);
    this.frameCount = 0;  // mutated here; detectChanges() needed after
  }

  private drawFrame(): void {
    // Canvas drawing — no Angular bindings involved
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }
}

// -------------------------------------------------------
// Pattern 3: detach/reattach for off-screen components
// -------------------------------------------------------
@Component({
  standalone: true,
  selector: 'app-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ item.name }} - {{ item.value }}</div>`,
})
export class ListItemComponent implements OnInit {
  @Input({ required: true }) item!: ListItem;
  @Input() visible = true;

  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    // Detach when off-screen — zero CD cost when not visible
    if (!this.visible) {
      this.cdr.detach();
    }
  }

  // Called by parent virtual scroll when visibility changes
  setVisible(isVisible: boolean): void {
    if (isVisible) {
      this.cdr.reattach();       // reconnect to CD tree
      this.cdr.detectChanges(); // immediately update to current state
    } else {
      this.cdr.detach();         // disconnect — zero CD cost until visible again
    }
  }
}
```

**Interview vs Production difference:**
In an interview, demonstrate `markForCheck()` with an OnPush + subscribe pattern, and explain why `async` pipe is preferred. In production, always use `async` pipe first; reach for `markForCheck()` only when you have non-Observable state sources; use `detectChanges()` only for post-`ngAfterViewInit` DOM work.

---

## 🧠 6. Memory Aid

**Mental Model:** `markForCheck()` = raise your hand to say "check me next time there's a check." `detectChanges()` = demand a check right now. `detach()` = leave the classroom so the teacher never calls on you. `reattach()` = come back in.

**If you go blank:** "`markForCheck()` schedules this component for the next CD cycle (async). `detectChanges()` runs CD synchronously right now on this subtree. Both are needed for OnPush components that get state from services rather than `async` pipe. Prefer `async` pipe to avoid needing either."

**Mnemonic:** **MDD** — **M**arkForCheck (mark dirty, next tick), **D**etectChanges (do it now), **D**etach/reattach (disappear from CD tree).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Without manual CD control, OnPush components go stale when state comes from non-Observable sources
→ Performance: `detach()` enables virtual scrolling at scale — OFF components have literally zero CD cost
→ Business: Understanding CDR is required for any performance debugging — it's the mechanism behind all Angular performance optimization patterns

**How it works (3 sentences):**
`ChangeDetectorRef.markForCheck()` marks the component and its ancestor chain as dirty in Angular's internal LView structure, ensuring they are included in the next change detection pass triggered by zone.js. `ChangeDetectorRef.detectChanges()` synchronously runs the change detection algorithm on the component and its children immediately, without waiting for a zone tick — essential for post-view-init DOM work and outside-NgZone state updates. `detach()` completely removes the component from the CD tree walk (zero runtime cost), while `reattach()` + `detectChanges()` synchronously brings it back up to date when needed.

**Company relevance:**
- Microsoft: Azure Portal SVG diagram components use `detectChanges()` in `ngAfterViewInit` after computing layout from `@ViewChild` elements — ensures consistent renders before first user interaction
- Adobe: Express template picker uses `detach()` on out-of-viewport template tiles via CDK virtual scrolling — enables 1,000+ template grid to scroll at 60fps on mobile
- Salesforce: Tableau-in-Salesforce integration uses `detach()` on off-screen chart panels in the dashboard builder, reducing CD load from 50 charts to only visible charts
- Cisco: WebEx participant grid `detach()` off-camera participant tiles during screenshare full-screen mode — only the active speaker tile participates in CD during presentation

---
✅ Topic 66/486 complete → Continuing to Topic 67: Cold vs Hot Observables
