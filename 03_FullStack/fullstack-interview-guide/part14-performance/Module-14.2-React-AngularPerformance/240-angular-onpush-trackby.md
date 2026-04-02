# Angular OnPush Change Detection + trackBy Patterns
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Angular's default change detection**: runs on EVERY browser event (click, keyup, setTimeout, HTTP response, WebSocket message) and checks EVERY component in the tree for changes — scales poorly when you have 50+ components in view
- **`ChangeDetectionStrategy.OnPush`**: a component only re-checks when: an `@Input()` reference changes, an event fires from within the component itself, an Observable subscribed via `async` pipe emits, or `markForCheck()` is called explicitly — parent state changes do NOT trigger the child
- **Key requirement**: OnPush only works correctly with IMMUTABLE data patterns; you must return new object/array references on mutation (spread operator, `[...arr]`, `{...obj}`) — mutating in place is invisible to OnPush's reference check
- **`trackBy` in `*ngFor`**: tells Angular how to identify list items by a stable key (like `item.id`) instead of object reference; without trackBy, Angular destroys and recreates ALL DOM nodes when the array reference changes; with trackBy, only changed/added/removed items update
- **Angular Signals (v16+)**: the modern answer to OnPush complexity; signals automatically notify only the components that read a specific signal when it changes — fine-grained reactivity without manual CD flags or immutable patterns
- ✅ **Hruday's anchor**: Bosch (via SAP ecosystem) — industrial dashboard with 50 machine status cards updating via WebSocket every second; Default CD was running 60+ cycles/second across all 50 cards; adding OnPush + trackBy on the machine card component reduced CD cycles from 60/second to 3-5/second during active streaming; Angular DevTools confirmed the improvement

---

## 1. One-Line Definition
Angular OnPush is a change detection strategy that limits when a component re-checks its template — to input reference changes, internal events, and Observable emissions — reducing the number of change detection cycles from "every browser event" to "only relevant changes"; `trackBy` extends this to list rendering by minimizing DOM node destruction on array updates.

---

## 2. The Problem It Solves

Angular's default change detection (CheckAlways) runs a tree traversal on every asynchronous event. Zone.js patches all browser APIs (setTimeout, Promise, HTTP, WebSocket, UI events) and triggers Angular's change detection after each one. In an app with WebSocket data streaming:

- WebSocket fires 60 messages/second
- Each message → Zone.js triggers CD
- CD traverses the ENTIRE component tree (if using default strategy)
- With 50 components in view: 50 components × 60 times/second = 3,000 CD cycles/second
- CPU usage spikes, the main thread is saturated, interactions feel laggy

The problem is proportional: the bigger the app and the more frequent the events, the worse the default CD performs.

`OnPush` solves this by making components "opt-in" to change detection. Instead of Angular visiting every OnPush component on every event, it only visits a component when that component's specific inputs have changed. 50 components with 60 WebSocket messages/second, but each message only affects 2-3 components? Angular checks only those 2-3 — not all 50.

`trackBy` solves a related problem in list rendering: when you assign a new array reference to an `*ngFor`, Angular by default destroys all existing DOM nodes and recreates them from scratch — even if 98% of the items are identical. For a 50-item machine card list where one card's value updates, this means destroying 50 DOM nodes and creating 50 new ones. `trackBy: trackById` tells Angular to use `id` as the stable identity, so only the 1 changed card's DOM updates.

At Bosch, the industrial monitoring dashboard had both problems. Default CD + frequent WebSocket updates meant the browser was doing nothing but change detection. After OnPush + trackBy, the CPU usage dropped significantly and the dashboard was able to handle 5x more machine cards without degrading.

---

## 3. How It Works Internally

### Default vs OnPush CD Algorithm

```
Default (CheckAlways) strategy — Angular's default:

  WebSocket message arrives → Zone.js intercepts
       │
       ▼
  Angular triggers change detection from root
       │
       ▼  (visits EVERY component in tree)
  AppComponent (check)
  ├── HeaderComponent (check — even if unrelated to WebSocket data)
  ├── SidenavComponent (check — even if hidden)
  └── DashboardComponent (check)
      ├── MachineCard[0] (check)
      ├── MachineCard[1] (check)
      ├── ... × 50 cards (all check, even unchanged ones)
      └── MachineCard[49] (check)

  Total: 50+ components checked on EVERY WebSocket message


OnPush strategy — opt-in per component:

  WebSocket message arrives → Zone.js intercepts → Angular triggers CD from root
       │
       ▼  (OnPush components are SKIPPED unless their trigger fires)
  AppComponent (check — default, it's the root)
  ├── HeaderComponent (SKIP — OnPush, no input changes, no async emit)
  ├── SidenavComponent (SKIP — OnPush, no input changes)
  └── DashboardComponent (check — subscribes to WebSocket Observable via async pipe)
      ├── MachineCard[0] (check — its @Input() machine reference CHANGED)
      ├── MachineCard[1] (SKIP — its @Input() machine reference SAME)
      ├── MachineCard[2] (SKIP — its @Input() machine reference SAME)
      └── MachineCard[49] (SKIP — unchanged)

  Total: 3-5 components checked (only the ones with updated inputs)
```

### The Four OnPush Triggers

```
An OnPush component re-checks its template when ANY of these happen:

1. @Input() reference changes:
   parent template: [machine]="machineSignal | async"
   ← if the Observable emits a NEW object reference, child re-checks
   ← if same reference, child is SKIPPED

2. Event in the component itself:
   <button (click)="toggle()"> </button>
   ← user clicks button INSIDE this component → CD runs for this component

3. async pipe emits:
   machine$ | async in the template
   ← when the Observable emits, CD is triggered specifically for this component

4. markForCheck() is called:
   constructor(private cdr: ChangeDetectorRef) {}
   this.cdr.markForCheck();  // Manual trigger for edge cases
   ← Marks the component and all its ancestors for the next CD cycle
```

### How trackBy Works

```
Without trackBy (default):

  Initial render: list = [{ id: 1 }, { id: 2 }, { id: 3 }]
  Angular creates 3 DOM nodes: <li>1</li> <li>2</li> <li>3</li>

  New array arrives: list = [{ id: 1 }, { id: 2 }, { id: 3, value: 'updated' }]
  (same IDs, but item 3 has an updated value)
  
  Angular sees: new array reference ([] !== [])
  Angular destroys ALL 3 DOM nodes
  Angular creates ALL 3 DOM nodes from scratch
  → 3 destroy + 3 create = unnecessary DOM churn for a one-item update


With trackBy: (idFn = (index, item) => item.id)

  New array arrives: list = [{ id: 1 }, { id: 2 }, { id: 3, value: 'updated' }]
  Angular identity check using trackBy:
    Item id:1 existed before → REUSE DOM node, check for property changes
    Item id:2 existed before → REUSE DOM node, check for property changes
    Item id:3 existed before → REUSE DOM node, UPDATE value: 'updated'
  
  Result: 0 DOM nodes destroyed, 0 created, 1 updated → minimal DOM churn
```

---

## 4. The Code

### Wrong Way — Default CD in a High-Frequency App

```typescript
// ❌ WRONG — Default change detection with unstable inputs

// ❌ Default change detection: Angular checks this on EVERY browser event
@Component({
  selector: 'app-machine-card',
  template: `
    <div class="card">
      <h3>{{ machine.name }}</h3>
      <!-- ❌ getStatusColor() called on EVERY CD cycle — even if machine hasn't changed -->
      <span [class]="getStatusColor(machine.status)">{{ machine.status }}</span>
      <p>Last updated: {{ machine.lastUpdated | date:'HH:mm:ss' }}</p>
    </div>
  `,
  // ❌ No changeDetection declaration = ChangeDetectionStrategy.Default
})
export class MachineCardComponent {
  @Input() machine!: Machine;

  getStatusColor(status: string): string {
    // ❌ Called 60 times/second when WebSocket is streaming
    return status === 'running' ? 'green' : status === 'warning' ? 'yellow' : 'red';
  }
}

// ❌ Parent with default CD + mutable array mutation
@Component({
  template: `
    <!-- ❌ No trackBy: destroys/recreates ALL DOM nodes on every array update -->
    <app-machine-card *ngFor="let m of machines" [machine]="m"></app-machine-card>
  `,
})
export class DashboardComponent {
  machines: Machine[] = [];

  updateMachine(updatedMachine: Machine) {
    // ❌ Find and MUTATE in place: same array reference → Angular might miss the change
    // Or if it doesn't miss it, it creates a new array that destroys all DOM nodes
    const index = this.machines.findIndex(m => m.id === updatedMachine.id);
    this.machines[index] = updatedMachine;  // ← Mutation in place
    // Angular OnPush won't detect this — same array reference
    // JavaScript doesn't notify Angular about item replacement in an existing array
  }
}
```

### Right Way — OnPush + Immutable Updates + trackBy

```typescript
// ✅ RIGHT — OnPush change detection with immutable inputs

import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-machine-card',
  standalone: true,
  imports: [AsyncPipe, DatePipe],
  template: `
    <div class="card" [class.highlight]="isHighlighted">
      <h3>{{ machine.name }}</h3>
      <!-- ✅ Pure pipe or pre-computed value in template: no method calls -->
      <!-- Method calls in templates re-run on every CD cycle -->
      <span [class]="statusColorClass">{{ machine.status }}</span>
      <p>Last updated: {{ machine.lastUpdated | date:'HH:mm:ss' }}</p>
      <button (click)="onAcknowledge()">Acknowledge</button>
    </div>
  `,
  // ✅ OnPush: this component only checks when @Input() reference changes,
  //            an event fires inside it, or an Observable via async pipe emits
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineCardComponent implements OnInit {
  @Input() machine!: Machine;
  @Input() isHighlighted = false;

  // ✅ Pre-compute derived values in ngOnChanges, not in template expressions
  // statusColorClass is ONLY recalculated when machine @Input() changes
  statusColorClass = '';

  ngOnChanges() {
    // This runs only when @Input() changes (because OnPush)
    this.statusColorClass = this.getStatusColor(this.machine.status);
  }

  private getStatusColor(status: string): string {
    // Safe to compute here — only called when machine input actually changes
    return status === 'running' ? 'status-green'
         : status === 'warning' ? 'status-yellow'
         : 'status-red';
  }

  onAcknowledge() {
    // ✅ User event inside component: CD IS triggered for this component
    // This is one of the four OnPush triggers — internal user events
    console.log('Acknowledged:', this.machine.id);
  }
}
```

```typescript
// ✅ RIGHT — Parent with OnPush + immutable updates + trackBy

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NgFor, AsyncPipe } from '@angular/common';
import { WebSocketService } from './websocket.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, AsyncPipe, MachineCardComponent],
  template: `
    <app-machine-card
      *ngFor="let machine of machines; trackBy: trackById"
      [machine]="machine"
      [isHighlighted]="machine.id === highlightedId"
    ></app-machine-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  machines: Machine[] = [];
  highlightedId: string | null = null;

  constructor(private wsService: WebSocketService) {}

  ngOnInit() {
    this.wsService.machineUpdates$.subscribe(updatedMachine => {
      // ✅ IMMUTABLE UPDATE: create a NEW array reference with the updated item
      // OnPush on child MachineCardComponent detects the new machine reference via @Input()
      this.machines = this.machines.map(m =>
        m.id === updatedMachine.id
          ? { ...m, ...updatedMachine }  // ← New object reference for the changed item
          : m                             // ← Same reference for unchanged items
      );
      // ↑ Only the updated machine gets a new reference → only that MachineCard re-checks
    });
  }

  // ✅ trackBy function: stable identity for list items
  // Returns item.id (string or number) — stable across renders
  // Angular uses this to identify which DOM nodes to reuse vs recreate
  trackById(index: number, machine: Machine): string {
    return machine.id;
    // ← Even if the machine object reference changes (due to immutable update above),
    //   the DOM node for machine.id='machine-01' is REUSED, not destroyed+recreated
  }
}
```

```typescript
// ✅ RIGHT — Angular Signals (v16+ / v17+): cleaner than OnPush + manual immutability

import { Component, signal, computed, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { MachineService } from './machine.service';

@Component({
  selector: 'app-dashboard-signals',
  standalone: true,
  imports: [NgFor, MachineCardSignalComponent],
  template: `
    <!-- ✅ Signals: Angular knows EXACTLY which template expression to update -->
    <!-- No need for OnPush, no manual markForCheck, no async pipe needed -->
    <div>Total machines: {{ totalCount() }}</div>
    <app-machine-card
      *ngFor="let machine of machines(); trackBy: trackById"
      [machine]="machine"
    ></app-machine-card>
  `,
  // ✅ With Signals: Angular's zone-less mode is possible
  // Even without zone-less mode, signals trigger fine-grained DOM updates
})
export class DashboardSignalsComponent {
  private machineService = inject(MachineService);

  // ✅ Signal: reactive primitive — only components reading this signal re-render on change
  machines = this.machineService.machinesSignal;  // WritableSignal<Machine[]>

  // ✅ Computed: derived value that updates automatically when machines signal changes
  totalCount = computed(() => this.machines().filter(m => m.status === 'running').length);

  trackById = (index: number, machine: Machine) => machine.id;

  // Update from WebSocket — signals handle the notification automatically
  updateMachine(updated: Machine) {
    this.machines.update(current =>
      current.map(m => m.id === updated.id ? { ...m, ...updated } : m)
    );
    // ← Angular automatically knows totalCount() may have changed and updates only that DOM node
  }
}
```

### Using markForCheck for Edge Cases

```typescript
// ✅ RIGHT — markForCheck() for data arriving OUTSIDE Angular's zone

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #chart></canvas>`,
})
export class ChartComponent implements AfterViewInit {
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('chart') chartRef!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit() {
    // ✅ Third-party library callback runs OUTSIDE Angular's zone
    // Angular's OnPush won't automatically pick up this change
    // Solution: call markForCheck() to tell Angular "this component needs to check"
    someThirdPartyCharting.onDataLoad((newData: ChartData[]) => {
      this.chartData = newData;
      // ✅ markForCheck: schedules this component (and ancestors) for next CD cycle
      this.cdr.markForCheck();
    });
  }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Angular OnPush and when should you use it?"

**Hruday's answer:**
> Angular's default change detection visits every component in the tree on every browser event. OnPush is a strategy you opt into per component that limits change detection to four specific triggers: a direct `@Input()` reference changes, an event fires from within the component itself, an Observable subscribed via the `async` pipe emits, or `ChangeDetectorRef.markForCheck()` is called manually.
>
> You should use OnPush whenever a component is "pure" — its output depends only on its inputs, and those inputs arrive as immutable values. List items are the primary use case: a `MachineCard` component in a 50-item grid doesn't need to run change detection 60 times per second just because a WebSocket message came in. With OnPush, it only checks when the specific `machine` input it received actually changes.
>
> The prerequisite is immutable data patterns. If you pass a list to a component and then mutate that list in place (adding items, modifying properties), OnPush won't detect the change because the reference is the same. You must return new array/object references on mutation: `this.machines = [...this.machines, newMachine]` instead of `this.machines.push(newMachine)`.
>
> OnPush is most valuable in components that render many instances, components that receive frequent parent updates, and real-time dashboards with frequent data streams.

---

### Q2 — Bosch/SAP Experience Deep Dive
**Interviewer asks:** "Tell me about a concrete case where OnPush made a difference."

**Hruday's answer:**
> At a Bosch integration project within the SAP ecosystem, we built an industrial monitoring dashboard showing 50 machine status cards. Each card showed status (running/warning/stopped), current production rate, last event timestamp, and error counts. The data came from a WebSocket stream that updated 60+ messages per second across all machines.
>
> With Angular's default change detection, the dashboard was essentially running change detection on all 50 cards 60 times per second. Angular DevTools showed change detection cycles taking 12-15ms each, with approximately 60 cycles per second triggered by WebSocket Zone.js patches. Main thread utilization was at 70-80%, browsers on the factory floor workstations (mid-range hardware) were sluggish, and interactions on other parts of the dashboard felt delayed.
>
> The fix was two things. First: `ChangeDetectionStrategy.OnPush` on `MachineCardComponent`. This required changing the parent to use immutable updates — `this.machines = this.machines.map(m => m.id === update.id ? { ...m, ...update } : m)` — so that only the changed machine got a new reference. Second: `trackBy: trackById` in the `*ngFor` so that the DOM nodes for unchanged machines were reused rather than destroyed.
>
> After the change: Angular DevTools showed change detection dropping from 60 cycles/second to 3-5 cycles/second. The 3-5 remaining cycles were the actual changed machines. CPU usage dropped, interactions became responsive again. The dashboard could now handle displaying 100 cards without degradation.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would OnPush cause bugs, and how do you handle them?"

**Hruday's answer:**
> The most common OnPush bug comes from mutable state changes that Angular doesn't see. If you have an OnPush component and you do `this.someArray.push(newItem)` or `this.someObject.name = 'new name'`, the component reference hasn't changed, so OnPush skips change detection for that component. The template looks stale — it shows the old array or the old name.
>
> The fix is always to create new references: `this.someArray = [...this.someArray, newItem]` or `this.someObject = { ...this.someObject, name: 'new name' }`. This is the "immutable update" pattern.
>
> A related case: third-party code or legacy code that calls your component's methods from outside Angular's zone (via native event listeners, third-party library callbacks). These calls don't trigger Zone.js, so OnPush doesn't know to run. The solution is `ChangeDetectorRef.markForCheck()` called explicitly after the out-of-zone update.
>
> Another case: deep object mutations. You pass `{ user: { address: { city: 'Bangalore' } } }` to an OnPush component. The parent mutates `user.address.city = 'Mumbai'`. The top-level reference is the same object, so OnPush skips. You need immutable updates all the way down, or you need to pass only the specific data the component uses (pass `address.city` as a string @Input, not the large nested object).
>
> Angular Signals is the modern solution that eliminates most of these concerns — signals know exactly which template bindings read them and update only those, without requiring explicit OnPush or immutable patterns.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design the Angular architecture for a real-time stock trading dashboard with 100 stock ticker components updating every 250ms."

**Hruday's answer:**
> I'd design it around four decisions: signals for reactivity, OnPush everywhere, virtual scrolling for the list, and zone-less rendering.
>
> Data layer: a WebSocket service that receives price updates and stores them in a `Map<string, WritableSignal<StockQuote>>` — one signal per stock symbol. When a price update arrives, only the specific signal for that symbol is updated. Components reading that signal are notified without any other component being disturbed.
>
> Component strategy: every component uses `ChangeDetectionStrategy.OnPush`. The stock ticker component receives the signal (as a `Signal<StockQuote>` input) and reads `quote().price` directly in the template. Angular knows this component reads the signal and only re-renders when that specific signal changes. With 100 tickers updating at different rates, each ticker only pays the rendering cost when its own data updates.
>
> List rendering: the stock list uses `trackBy: (i, stock) => stock.symbol` to prevent DOM node churn on any array reorganization (sorting by price, filtering by sector). Virtual scrolling (`CdkVirtualScrollViewport`) if the list exceeds 50-100 items to keep DOM size manageable.
>
> Zone-less (Angular 17+ experimental): replace Zone.js with signals-based CD. `bootstrapApplication(AppComponent, { providers: [provideExperimentalZonelessChangeDetection()] })`. This eliminates the overhead of Zone.js patching browser APIs — no more "every setTimeout triggers CD." Change detection fires only when signals update. This is the lowest-overhead approach for a real-time app.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "OnPush prevents all re-renders" | "With OnPush, my component never unnecessarily re-renders" | OnPush reduces re-renders but the component STILL re-renders when any of its four triggers fire; if you pass a large object as an @Input() and the parent creates a new reference on every event (e.g., through `Observable.pipe(map(x => ({...x})))` returning new objects even when data hasn't changed), OnPush still re-renders on every emission; the fix is to either use `distinctUntilChanged()` with a deep equality check before the async pipe, or switch to signals where fine-grained updates at the field level are possible |
| "trackBy index is fine" | "`trackBy: (i) => i` avoids the rerender issue" | `trackBy: (index) => index` uses the ARRAY POSITION as identity, not the item itself; if the array is reordered or an item is inserted/removed at the beginning, ALL items from that position onwards get wrong identities — Angular thinks the item at position 0 is the same item even if it's now a completely different object; this causes wrong DOM node reuse (the DOM from the old item is applied to the new item) creating visual bugs and state leaks (input field values, CSS class state, component instance state); always track by a STABLE DOMAIN ID (`item.id`, `item.symbol`, `item.uuid`) never by array index unless the list is read-only and never reordered |
| "markForCheck == detectChanges" | "`markForCheck()` and `detectChanges()` do the same thing" | They're both on `ChangeDetectorRef` but fundamentally different: `markForCheck()` marks the component and its ancestors to be checked in the NEXT change detection cycle (scheduled later); `detectChanges()` synchronously runs change detection on this component and its CHILDREN IMMEDIATELY right now; `markForCheck()` is the right choice for OnPush components updated from outside Angular's zone (it piggybacks on the next Zone.js-triggered CD cycle); `detectChanges()` is for when you need an IMMEDIATE synchronous DOM update (rare, usually in animations or third-party canvas integration); using `detectChanges()` when `markForCheck()` would suffice can cause double-run CD cycles |

---

## 7. Hruday's Real Experience Hook
> "The Bosch industrial dashboard project made me understand Zone.js in a way that documentation never did. When I first saw Angular DevTools showing 60+ change detection cycles per second, I thought something was wrong with the WebSocket implementation. Then I realized: that's Angular working AS DESIGNED. Zone.js patches WebSocket.onmessage. Every message = one CD cycle. 60 messages/second = 60 CD cycles/second. Default strategy = all 50 components checked each cycle = 3,000 component checks per second. No bugs, just the expected behavior at scale.
>
> The OnPush migration took about 4 hours — mostly writing the immutable update functions for the service layer. The observable difference in the Angular DevTools was instant: 60 cycles/second dropped to 3-5 cycles/second. The same WebSocket stream, the same 50 cards, but Angular was now doing 20x less work.
>
> The migration also forced a discipline on the team: all state updates had to be immutable. This turned out to be a positive side effect — it made the data flow clearer and easier to reason about. You could look at any component and know: 'its state changes ONLY via @Input() reference changes.' No hidden mutation paths."

---

## 8. Scale Evolution

**Small Angular app (< 20 components) →** Default CD is fine; the overhead is negligible; don't add OnPush complexity unless you have a specific performance problem.

**Medium Angular app (20-100 components) →** Add OnPush to list item components first (these get the most benefit); use `async` pipe with Observables (it handles `markForCheck` automatically); `trackBy` on every `*ngFor` over dynamic data; Angular DevTools to verify fewer CD cycles.

**Large Angular app (100+ components, real-time data) →** OnPush on ALL components; signals for reactive state where possible (replaces OnPush + async pipe complexity); zone-less experimental mode if on Angular 17+; virtual scrolling for any list over 50 items; per-component profiling in Angular DevTools to identify remaining hotspots; `distinctUntilChanged()` / `shareReplay()` in Observables to prevent unnecessary emissions.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment analytics dashboard with real-time transaction stream; merchant portal with live status updates; Angular (or React) components updating on each payment event; OnPush + immutable patterns for transaction list components | Real-time data rendering with OnPush; immutable state patterns; performance profiling workflow |
| Swiggy / Meesho | Order tracking dashboard (multiple orders updating); seller analytics dashboard with live order stream; category navigation with large lists needing trackBy; Angular delivery partner dashboard | trackBy patterns in catalog lists; OnPush for frequently updated order status cards |
| Adobe / Microsoft | Microsoft Teams (Angular previously used Aurelia/custom framework but similar patterns); SharePoint Angular components; Azure portal built with Angular and handling real-time resource status updates; enterprise apps with complex component trees | OnPush in enterprise Angular apps; signals migration strategy; zone-less architecture |
| SAP Labs | Direct experience: Bosch industrial dashboard within SAP ecosystem; 50 machine cards → 60 CD cycles/second → OnPush → 3-5 cycles/second; immutable update patterns; trackBy for machine IDs; Angular DevTools profiling; Angular Signals adoption in newer components | Specific CD profiling story; quantified improvement; signals migration experience; taught team immutable update patterns |

---

## 10. Related Topics — What to Study Next

- **Topic 239 — Memoization (React.memo, useMemo, useCallback)** — the React equivalent of Angular OnPush; `React.memo` and `ChangeDetectionStrategy.OnPush` solve the same fundamental problem (prevent unnecessary re-computation) using different mechanics; knowing both shows depth in frontend performance
- **Topic 242 — Avoiding Unnecessary Re-renders** — the broader topic that synthesizes OnPush (Angular) and React.memo strategies; also covers Context placement in React, state collocation, and the general principle of colocating state near its consumers to minimize re-render scope
- **Topic 241 — Virtual Scrolling** — the next optimization after OnPush; once change detection cost per item is minimized with OnPush, the next bottleneck for large lists is DOM size; virtual scrolling keeps DOM node count constant regardless of list length
- **Topic 243 — Main Thread Scheduling and Long Tasks** — OnPush reduces CD frequency but each CD cycle still runs synchronously on the main thread; understanding how to break up heavy CD work with `requestAnimationFrame` and `scheduler.yield()` completes the Angular performance picture

---

*Part 14 · Angular OnPush Change Detection + trackBy · Full Stack Interview Guide · Hruday D · 2026*
