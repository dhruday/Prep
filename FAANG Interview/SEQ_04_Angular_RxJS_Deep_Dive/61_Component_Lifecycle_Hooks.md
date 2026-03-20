# 61. Component Lifecycle Hooks — All 8 Hooks & When to Use
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Angular's 8 lifecycle hooks fire in a fixed sequence from construction through destruction. `ngOnInit` is where I put data fetching because inputs are resolved. `ngOnChanges` handles input updates with previous/current value diffing. `ngAfterViewInit` is where I safely access child components via `@ViewChild`. And `ngOnDestroy` is critical for cleanup — at Bosch I had memory leaks from WebSocket subscriptions that weren't being closed; adding `ngOnDestroy` with subscription teardown fixed them entirely.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Angular's lifecycle hooks are callbacks the framework invokes as it creates, updates, and destroys component and directive instances. They solve a critical problem: the DOM doesn't exist when the constructor runs, and inputs aren't resolved either — you need reliable entry points for initialisation, DOM access, and cleanup.

### How It Works Internally

Angular change detection (zone.js or signals) drives the lifecycle. The complete sequence:

```
constructor()          [DI runs, no inputs, no DOM]
    ↓
ngOnChanges()          [first time: all inputs set; subsequent: only changed inputs]
    ↓
ngOnInit()             [once, after first ngOnChanges; safe to use all @Input values]
    ↓
ngDoCheck()            [every change detection cycle; custom dirty-checking]
    ↓
ngAfterContentInit()   [once; ng-content projected nodes are available]
    ↓
ngAfterContentChecked() [every CD cycle after content check]
    ↓
ngAfterViewInit()      [once; @ViewChild / @ViewChildren are resolved]
    ↓
ngAfterViewChecked()   [every CD cycle after view check]
    ↓
ngOnDestroy()          [once; before Angular destroys the component]
```

**Key internal details:**
- `ngOnChanges` fires **before** `ngOnInit` on first render
- `ngOnChanges` only fires if the component has `@Input()` properties — it does NOT fire for components with no inputs
- `ngDoCheck` runs on **every** change detection pass, even if nothing changed — it is expensive; avoid heavy computation inside it
- `ngAfterViewInit` fires after Angular has assembled the component's view AND its child components' views — `@ViewChild` references are populated here
- `ngAfterContentInit` fires after `<ng-content>` projected content is initialized — before `ngAfterViewInit`
- All `*Checked` hooks fire after every change detection pass — these must be extremely lightweight

### Architecture & Component Boundaries

```
Parent Component
  ngOnChanges → ngOnInit → ngDoCheck → ngAfterContentInit → ngAfterContentChecked
                                                              ↓
                                                (Child components run their lifecycle)
                                                              ↓
                                           ngAfterViewInit → ngAfterViewChecked
  
  [Parent's view is complete only after all children complete their view lifecycle]
```

**Implication:** Modifying a parent's bound properties inside `ngAfterViewInit` of a child causes `ExpressionChangedAfterItHasBeenCheckedError` in development mode — because Angular has already started the parent's check cycle and you're changing it mid-cycle.

### Data Flow & State Flow

| Hook | Safe to read `@Input` | Safe to access `@ViewChild` | Safe to trigger CD | Safe to modify parent binding |
|---|---|---|---|---|
| constructor | ❌ Not set yet | ❌ | ❌ | ❌ |
| ngOnChanges | ✅ | ❌ | ⚠️ Careful | ❌ |
| ngOnInit | ✅ | ❌ | ✅ | ❌ |
| ngDoCheck | ✅ | ❌ | ✅ | ❌ |
| ngAfterContentInit | ✅ | ❌ (content only) | ✅ | ❌ |
| ngAfterViewInit | ✅ | ✅ | ⚠️ Use setTimeOut(0) or CD.detectChanges | ❌ (use EventEmitter/setter) |
| ngAfterViewChecked | ✅ | ✅ | ❌ (will loop) | ❌ |
| ngOnDestroy | ✅ | ⚠️ Being torn down | N/A | N/A |

### Performance Implications

- `ngDoCheck` + `ngAfterContentChecked` + `ngAfterViewChecked` run on **every** change detection cycle. In an app with zone.js, any async event (click, HTTP, timer) triggers CD. With 20 components each having non-trivial `ngDoCheck` logic, that's 20 function calls per event. Keep these empty or with O(1) checks only.
- `ngOnInit` for HTTP calls: subscribe here, not in constructor. Service injection is complete; template can show loading state immediately.
- `ngOnDestroy` for cleanup: Every `subscribe()`, `interval()`, `fromEvent()`, and DOM event listener must be cleaned up here or in `takeUntilDestroyed()`. Memory leaks from missing teardown are the #1 Angular memory issue.

### Scalability Considerations

- Component trees with 500+ nodes: `ngAfterViewChecked` running on all 500 per interaction event kills performance. Use `OnPush` to limit which components enter the check cycle.
- Server-side rendering (Angular Universal): `ngAfterViewInit` and `ngAfterViewChecked` do NOT run on the server — DOM does not exist. Guards are needed for any DOM-dependent code.

### Trade-offs

| ngOnInit for data fetch | constructor for data fetch | Choose ngOnInit |
|---|---|---|
| Inputs resolved, template updates correctly | Inputs not set, template shows wrong initial state | Always — constructor is for DI only |
| Compatible with OnPush | Can cause missed change detection | ngOnInit with OnPush works correctly |

| ngOnDestroy manual cleanup | takeUntilDestroyed() | Choose takeUntilDestroyed() for new code |
|---|---|---|
| Explicit, verbose | Declarative, one-liner | `takeUntilDestroyed(destroyRef)` for Angular 16+ |
| Must remember every subscription | Automatic for all piped subscriptions | takeUntilDestroyed is cleaner |

### ⚠️ Anti-Patterns & Pitfalls

- **Heavy computation in `ngDoCheck`** — runs every CD cycle including cycles with no relevant changes. Use only for detecting changes Angular can't detect (e.g., mutable array mutation without reference change).
- **Accessing `@ViewChild` in `ngOnInit`** — the view isn't assembled yet; reference is `undefined`. Always use `ngAfterViewInit`.
- **Modifying parent-bound property in `ngAfterViewInit`** — causes `ExpressionChangedAfterItHasBeenCheckedError`. Fix: emit an event to parent, or wrap in `Promise.resolve().then(...)` / `setTimeout(0)` (though `setTimeout` is a code smell — prefer `ChangeDetectorRef.detectChanges()` or re-architecture).
- **Subscribing without unsubscribing in `ngOnInit`** — the component instance may be destroyed but the Observable's subscriber remains active, keeping the component in memory and processing values after destruction.
- **Forgetting `ngOnChanges` fires before `ngOnInit`** — if your `ngOnInit` depends on a transformed version of an input, the transformation must happen in `ngOnChanges` first or `ngOnInit` will operate on the raw value.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At Bosch, the real-time monitoring dashboard had `WebSocketFeedService` subscriptions opened in `ngOnInit`. When users navigated away, the component was destroyed but subscriptions continued running, holding the component in memory and pushing data to nothing. After profiling with Chrome DevTools memory heap snapshots, I added `ngOnDestroy` with explicit `subscription.unsubscribe()` calls — later refactored to `takeUntilDestroyed()` in Angular 16. Memory profile went from a steady 15% heap growth over 30 minutes to flat.

At SAP, drag-and-drop analytics widgets used `ngAfterViewInit` to initialize a third-party charting library (SAP Analytics Cloud SDK) that required a `<canvas>` DOM element. Attempting initialization in `ngOnInit` caused null pointer errors; `ngAfterViewInit` guaranteed the native element was present.

**At FAANG scale:**
- **Microsoft (Azure):** Dashboard blades use `ngOnChanges` to re-fetch resource data when the blade's `resourceId` input changes — without needing to destroy and recreate the component.
- **Adobe (Photoshop Web):** Canvas-based tools use `ngAfterViewInit` to initialize WebGL contexts on `<canvas>` elements. SSR guard (`isPlatformBrowser`) prevents WebGL initialization during server-side rendering.
- **Salesforce (LWC-to-Angular bridge):** `ngOnDestroy` registered cleanup callbacks for LWC message bus subscriptions when Angular components embedded in a Salesforce page were removed.
- **Cisco (WebEx):** `ngDoCheck` monitors a non-immutable WebRTC stats object for participant count changes — using a custom differ pattern because zone.js can't detect properties mutated in place.

**How it evolves with scale:**
- Small scale: Hook into what you need; `ngOnInit` + `ngOnDestroy` cover 90% of cases.
- Medium scale: `ngOnChanges` becomes important when inputs drive async data fetching — avoids full component re-creation for input updates.
- Large scale: `ngDoCheck` / `ngAfterViewChecked` are performance bottlenecks — profiling is mandatory; consider OnPush to reduce cycles.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "Angular has 8 lifecycle hooks. In practice I use 4 regularly and 4 occasionally.
>
> The 4 I use every day: `ngOnChanges` for reacting to input changes with previous/current diffs, `ngOnInit` for data fetching once inputs are resolved, `ngAfterViewInit` for anything needing a DOM reference — `@ViewChild` queries aren't populated until here — and `ngOnDestroy` for cleanup.
>
> The 4 I use carefully: `ngDoCheck` for custom change detection on mutable objects Angular can't detect, `ngAfterContentInit` for working with `ng-content` projected content, and the two `*Checked` hooks — but I almost never put any logic in those because they run on every single change detection cycle and are a performance trap.
>
> The most important discipline is `ngOnDestroy`. At Bosch I diagnosed a heap memory leak by profiling the app in DevTools — WebSocket subscriptions were opened in `ngOnInit` but never closed. Components were destroyed but subscriptions kept the objects alive. After adding `takeUntilDestroyed()` on every subscription, heap growth over a 30-minute session went from +15% to flat."

### Likely Follow-up Questions

1. **When does `ngOnChanges` NOT fire?** → When the component has no `@Input()` properties, OR when the input reference doesn't change (mutation without new reference).
2. **`ExpressionChangedAfterItHasBeenCheckedError` — what causes it and how do you fix it?** → Modifying a binding that the parent already passed its check cycle on. Fix: use `ChangeDetectorRef.detectChanges()` after the modification, or restructure to emit an event.
3. **Does `ngOnDestroy` run on the server (Universal)?** → Yes for services, yes for components — but `ngAfterViewInit` / `ngAfterViewChecked` do NOT run on server.
4. **Difference between `ngAfterContentInit` and `ngAfterViewInit`?** → Content = projected `<ng-content>` slots. View = the component's own template including `@ViewChild` queries. Content init fires first.

### vs Alternatives

| Angular lifecycle hooks | React useEffect | Key difference |
|---|---|---|
| Declarative interface methods | Hook function with dependency array | Angular: explicit named hooks; React: unified hook with conditions |
| `ngOnDestroy` auto-called | Must return cleanup function from useEffect | Conceptually similar; Angular auto-calls on injectable services too |
| `ngOnChanges` provides SimpleChanges diff | useEffect dependency array reruns on change | Angular: explicit previous/current; React: you track previous via `useRef` |

### How to Signal Senior Thinking

> "The lifecycle sequence reflects a deliberate constraint: Angular builds the component tree bottom-up for view assembly but runs inputs top-down. That's why `@ViewChild` isn't available in `ngOnInit` — the child view hasn't been assembled yet. Understanding that constraint tells you exactly where to put each piece of initialisation logic."

---

## 💻 5. Code Example

```typescript
import {
  Component, Input, ViewChild, ElementRef, OnChanges, OnInit,
  AfterViewInit, OnDestroy, SimpleChanges, ChangeDetectorRef
} from '@angular/core';
import { takeUntilDestroyed, DestroyRef } from '@angular/core/rxjs-interop';
import { inject } from '@angular/core';
import { ChartDataService } from './chart-data.service';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-chart-widget',
  template: `
    <canvas #canvasEl width="800" height="400"></canvas>
    <p *ngIf="loading">Loading...</p>
  `,
})
export class ChartWidgetComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) dataStreamId!: string;
  @Input() refreshInterval = 30_000; // ms

  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  loading = true;
  private chartInstance: ChartLibrary | null = null;

  private chartService = inject(ChartDataService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  // ngOnChanges: fires BEFORE ngOnInit; gets SimpleChanges with prev/current
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataStreamId'] && !changes['dataStreamId'].firstChange) {
      // Input changed after init — re-subscribe to new stream
      this.subscribeToStream();
    }
    if (changes['refreshInterval'] && !changes['refreshInterval'].firstChange) {
      // Refresh rate changed — resubscribe handled in subscribeToStream
      this.subscribeToStream();
    }
  }

  // ngOnInit: inputs are set, safe to begin data loading
  ngOnInit(): void {
    this.subscribeToStream();
  }

  // ngAfterViewInit: @ViewChild is resolved — safe to access native DOM
  ngAfterViewInit(): void {
    this.chartInstance = new ChartLibrary(this.canvasEl.nativeElement);
    // Must trigger CD manually if we modified template-bound properties here
    // to avoid ExpressionChangedAfterItHasBeenCheckedError
    this.cdr.detectChanges();
  }

  private subscribeToStream(): void {
    interval(this.refreshInterval).pipe(
      switchMap(() => this.chartService.getStreamData(this.dataStreamId)),
      takeUntilDestroyed(this.destroyRef),  // Angular 16+ — auto-unsubscribes on destroy
    ).subscribe(data => {
      this.chartInstance?.render(data);
      this.loading = false;
    });
  }

  // ngOnDestroy: runs before Angular destroys this component instance
  ngOnDestroy(): void {
    // takeUntilDestroyed handles subscriptions automatically
    // Manual cleanup for non-Observable resources:
    this.chartInstance?.destroy();
    this.chartInstance = null;
  }
}

// Type stub for demonstration
declare class ChartLibrary {
  constructor(canvas: HTMLCanvasElement);
  render(data: unknown): void;
  destroy(): void;
}
```

**Interview vs Production difference:**
In an interview, skip `DestroyRef` / `takeUntilDestroyed` and show a classic `Subject`-based `takeUntil` pattern — it's universally understood. In production, use `takeUntilDestroyed(destroyRef)` (Angular 16+) — less boilerplate and no risk of forgetting to call `next()` on the subject in `ngOnDestroy`.

---

## 🧠 6. Memory Aid

**Mental Model:** Think of a component's life as a human life: born (constructor), grown (ngOnInit), reacts to news (ngOnChanges), sees the world (ngAfterViewInit), and eventually cleaned up (ngOnDestroy). The `*Checked` hooks are like constant health checks that happen every heartbeat — keep them cheap.

**If you go blank:** "Constructor → OnChanges → OnInit → AfterContentInit → AfterViewInit → OnDestroy. ViewChild is available from AfterViewInit. Inputs are available from OnInit. Cleanup goes in OnDestroy."

**Mnemonic:** **COICAVD** — **C**onstructor, **O**nChanges, **I**nit, **C**ontent, **A**fterView, **V**iewChecked, **D**estroy.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Correct initialisation sequence prevents flash-of-wrong-content and null pointer template errors
→ Performance: Missing `ngOnDestroy` cleanup is the leading cause of Angular memory leaks in production
→ Business: `ngOnChanges` enables input-driven re-fetching without component destruction, reducing unnecessary API calls

**How it works (3 sentences):**
Angular invokes lifecycle hooks in a fixed sequence as it creates, updates, and destroys component instances during change detection cycles. `ngOnChanges` fires whenever a bound `@Input` reference changes, providing a `SimpleChanges` diff map with previous and current values. `ngAfterViewInit` fires once after the component's view (including child components) is fully assembled, making it the earliest safe point to access `@ViewChild` references or initialize DOM-dependent third-party libraries.

**Company relevance:**
- Microsoft: Complex form components with dynamic `@Input`-driven validation rules use `ngOnChanges` to react to schema changes without destroying/recreating expensive form trees
- Adobe: Canvas-based creative tools require `ngAfterViewInit` for WebGL context initialization — SSR awareness is critical for their hybrid rendering pipeline
- Salesforce: `ngOnDestroy` + service teardown pattern used in Salesforce org-switching — ensures no previous org's data bleeds into the new session
- Cisco: `ngDoCheck` used for custom WebRTC stats monitoring on mutable stat objects that Angular's default change detection cannot observe

---
✅ Topic 61/486 complete → Continuing to Topic 62: Angular Router — Lazy Loading, Guards, Resolvers
