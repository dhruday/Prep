# 75. Angular Signals (v17+) — signal(), computed(), effect()
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Angular Signals (stable in v17) are a synchronous, fine-grained reactivity primitive — a `signal()` holds a value and tracks which `computed()` values and `effect()` callbacks depend on it. When a signal changes, only the directly dependent computeds and effects re-run — no zone.js polling, no top-down change detection pass. The reactive graph is maintained automatically. `toSignal()` and `toObservable()` bridge RxJS and Signals. In Angular 17.1+, `input()` and `output()` replace `@Input()`/`@Output()` with signal-native bindings, and `model()` provides two-way signal binding. At SAP, a POC replacing `BehaviorSubject` + Zone CD with Signals and `provideExperimentalZonelessChangeDetection()` reduced change detection overhead from 12ms to under 1ms per update cycle for a 200-tile dashboard.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The problem Signals solve:**

Angular's pre-Signal reactivity relied on Zone.js to detect any async operation and trigger a full top-down change detection pass. Even OnPush only reduced this to "dirty subtree" checking — it still ran the check pass. For fine-grained updates (one of 200 tiles changes its title), this was wasteful.

**Signals provide pull-based, fine-grained reactivity:**
- **Tracking:** When a `computed()` or `effect()` reads a signal, Angular registers a dependency automatically
- **Notification:** When a signal's value is set, only direct dependents are scheduled for re-execution
- **No zone required:** Signals are synchronous primitives — no async interception needed; the signal itself records changes
- **Synchronous:** Signal reads return the current value immediately (no subscribe, no Observable pipe)

### The Three Primitives

**1. `signal(initialValue)` — writable reactive state:**

```typescript
const count = signal(0);

// Read
console.log(count());   // 0 — call it as a function

// Write
count.set(5);           // set to new value
count.update(v => v + 1); // derive from current value
count.mutate(arr => arr.push(item)); // mutate array in place (signals v1, removed in v17)

// In Angular 17+: use set/update; for arrays/objects, use update with spread
count.update(v => [...v, newItem]);
```

**2. `computed(derivationFn)` — lazy, memoized derived state:**

```typescript
const count = signal(0);
const doubled = computed(() => count() * 2);
// doubled is NOT computed yet

console.log(doubled());  // read triggers computation → 0
count.set(5);
console.log(doubled());  // re-runs derivation only because count changed → 10

// Composed computeds
const price = signal(10);
const tax = signal(0.1);
const total = computed(() => price() * (1 + tax())); // depends on price AND tax
// total is lazy: only recomputes when read AND count/tax changed since last read
```

**`computed()` properties:**
- **Lazy:** Only recomputes when read, not on every signal change
- **Memoized:** Returns cached result if no dependency changed since last read
- **Read-only:** `computed()` returns a `Signal<T>` not a `WritableSignal<T>`
- **Reactive graph tracking:** Angular automatically tracks which signals were read during the computation and registers them as dependencies

**3. `effect(sideEffectFn)` — reactive side effects:**

```typescript
const query = signal('');

effect(() => {
  // Runs once immediately, then every time query() changes
  console.log('Query changed to:', query());
  // This is a side effect — analytics tracking, logging, DOM manipulation
});

// Effect cleanup: return a function for teardown (runs before next re-execution)
effect(() => {
  const connection = openConnection(query());
  return () => connection.close();  // cleanup on next run or on destroy
});
```

**`effect()` rules:**
- Cannot be called inside templates
- Must be called in an injection context or passed a `DestroyRef`/`Injector` option
- `effect()` is for side effects only — for derived values, use `computed()`
- Does NOT run synchronously on signal change — scheduled in the next microtask (after current synchronous work)

### Angular 17+ Signal APIs

**`input()` signal — replaces `@Input()`:**

```typescript
// Old
@Input({ required: true }) tileId!: string;

// New — Angular 17.1+
readonly tileId = input.required<string>();   // Signal<string>
readonly label = input<string>('Default');    // Signal<string> with default

// Reading in template or computed
const fullLabel = computed(() => `${this.label()} (${this.tileId()})`);

// input() is read-only from outside the component — no accidental mutation
```

**`output()` — replaces `@Output()`:**

```typescript
// Old
@Output() tileSelected = new EventEmitter<string>();

// New
readonly tileSelected = output<string>();  // OutputEmitterRef<string>

// Emit
this.tileSelected.emit(tileId);

// Subscribe (in parent template)
// (tileSelected)="onTileSelected($event)" — same as before
```

**`model()` — two-way binding signal:**

```typescript
// Child component
readonly value = model<string>('');   // WritableSignal<string>

// Parent template
<app-input [(value)]="searchQuery" />
// searchQuery updated when child calls this.value.set(newVal)
```

**`linkedSignal()` (Angular 19+) — derived writable signal:**

```typescript
// Writable signal that resets when source changes
const source = signal(['a', 'b', 'c']);
const selected = linkedSignal(() => source()[0]);  // defaults to first item
// When source changes, selected resets to source()[0]
// But can also be manually set: selected.set('b')
```

### Bridge APIs: RxJS ↔ Signals

**`toSignal()` — Observable → Signal:**

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

@Component({...})
export class MyComponent {
  private searchService = inject(SearchService);

  // Convert Observable to Signal — subscribes automatically
  results = toSignal(
    this.searchService.results$,
    { initialValue: [] as SearchResult[] }  // required if Observable hasn't emitted yet
  );

  // Use in template without async pipe:
  // {{ results() }}
  // No subscription management needed — toSignal handles teardown via DestroyRef
}
```

**`toObservable()` — Signal → Observable:**

```typescript
import { toObservable } from '@angular/core/rxjs-interop';

const query = signal('');
const query$ = toObservable(query);

// Now compose with RxJS operators
query$.pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q))
).subscribe(results => results.set(results));
```

### The Reactive Graph

Angular Signals maintain an internal reactive graph where each signal tracks which computeds and effects read it. When `signal.set()` is called:

```
1. Signal marks all dependent computeds as STALE (dirty flag)
2. Signal schedules all dependent effects for re-execution (microtask queue)
3. When a computed is READ (lazily), if STALE: re-evaluates projection
4. If recomputed value === previous value (===): dependents of this computed
   are NOT re-triggered (glitch-free propagation)
```

This is called the **push-pull model**: signals push staleness notifications, computeds pull values lazily on read.

**Glitch prevention:** Consider `doubled = computed(() => count() * 2)` and `statement = computed(() => count() + doubled())`. If `count` changes from 1 to 2:
- Without glitch prevention: `statement` might read `count = 2` but `doubled` still `2` (old value) → `statement = 4` (incorrect momentarily)
- Angular's signal graph: `doubled` is re-evaluated before `statement` uses it; `statement` always sees consistent values

### Performance vs Zone.js

```
Zone.js CD model:
Event fires → zone intercepts → triggers app-wide CD pass → checks every node

Signals + Zoneless CD model:
Signal changes → reactive graph updates only stale computeds → 
only template bindings reading stale signals re-evaluate →
only those specific DOM nodes update

Cost: O(affected bindings) vs O(all components in tree)
```

### ⚠️ Anti-Patterns & Pitfalls

- **Calling `effect()` outside an injection context** — effects must be created in a constructor, field initializer, or with an explicit `Injector` — same rule as `inject()`. Use `effect(fn, { injector: this.injector })` if needed outside injection context.
- **Using `effect()` for derived values** — if you need a derived value, use `computed()`. `effect()` is only for side effects (HTTP calls, localStorage, analytics, DOM outside Angular). Using `effect()` to compute a value and store it in another signal creates a dependency cycle risk.
- **Reading a signal outside a reactive context** — reading a signal inside a `setTimeout`, event callback, or non-tracked function creates no dependency. The signal value is read as a snapshot, not reactively. If you need reactive tracking, read inside `computed()` or `effect()`.
- **Mutating arrays/objects without signal notification** — `const items = signal<Item[]>([]); items().push(x)` — this mutates the array but doesn't notify dependents because the array reference hasn't changed. Use `items.update(arr => [...arr, x])`.
- **Mixing `input()` signals with `@Input()` in the same component** — technically possible but creates confusion; migrate fully to signal inputs in new components.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP BI, I prototyped a signal-based tile state system. Each tile component used `input()` for its `TileConfig` signal and `computed()` for derived display values (formatted KPI values, accessible labels). With `provideExperimentalZonelessChangeDetection()`, the browser profile showed CD-related work dropping from 12ms to ~0.8ms per update cycle for 200 tiles — because only the tile with changed data had its template re-evaluated.

At Bosch, I used `toSignal()` to bridge the existing WebSocket `Observable` to a signal for display in a performance-critical real-time chart component. The component had previously used `async` pipe + OnPush; with `toSignal`, the same reactivity was maintained without the subscription overhead, and the code was simpler — no `async` pipe plumbing.

**At FAANG scale:**
- **Microsoft (GitHub/VS Code Web):** Code editor's reactive UI state — cursor position, selection range as signals; `computed()` for derived status bar information (line count, character count); no zone needed
- **Adobe (Firefly AI):** Generation parameters as `WritableSignal` values — prompt, style, aspect ratio — `computed()` derives request payload; `effect()` fires preview generation when params settle (after debounce via `toObservable().pipe(debounceTime(500))`)
- **Salesforce (LWC):** Salesforce Lightning Web Components has a similar signals-like reactive property system; Angular Signals provide the same model for Salesforce's Angular-based internal tools
- **Cisco (WebEx):** Meeting UI state — audio/video enabled flags as signals; `computed()` for derived UI states (button disabled state, label text); UI re-renders precisely when the relevant flag changes

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "Angular Signals are a fine-grained reactivity primitive. A `signal()` holds a value; `computed()` derives values reactively with lazy memoization; `effect()` runs side effects when signals change. The key difference from Zone.js-driven change detection: signals build an explicit reactive graph. When a signal changes, only the computeds and template bindings that directly read that signal are re-evaluated — no full component tree scan.
>
> In Angular 17.1+, `input()` and `output()` replace `@Input()` and `@Output()` with signal-native APIs — `input()` returns a read-only signal, so components can `computed()` from their inputs without wiring up `ngOnChanges`. `model()` handles two-way binding as a writable signal.
>
> For RxJS interop, `toSignal(observable$)` converts an Observable to a read-only signal — Angular manages the subscription and teardown via `DestroyRef`. `toObservable(signal)` goes the other way for when you need the RxJS pipeline operators.
>
> The architectural implication is that Signals + zoneless change detection is where Angular is heading for high-performance UIs. At SAP I measured 12ms to 0.8ms CD overhead per update on a 200-tile dashboard."

### Likely Follow-up Questions

1. **What's the difference between `computed()` and `effect()`?** → `computed()` lazily derives a new value; it's memoized and can be read in templates. `effect()` runs a side effect reactively; it returns nothing and shouldn't write signals (causes cycles). Computed = derived value; Effect = reactive side effect.
2. **How does `toSignal()` handle errors?** → If the source Observable errors, the signal throws the error when read. Pass `{ requireSync: false }` if the Observable might not emit sync. Use `catchError` on the Observable before passing to `toSignal` for graceful error handling.
3. **Are Signals synchronous?** → Signal reads (`count()`) are synchronous. Signal writes (`count.set()`) mark dependents as stale synchronously but schedule effects asynchronously (microtask). Computed values are lazy — they re-evaluations happen synchronously when read.
4. **Can you write to a signal inside a `computed()`?** → You should not. Writing to a signal inside `computed()` is a side effect and risks infinite loops (computed writes signal → signal triggers computed → computed writes signal…). Angular will throw in dev mode if a signal write happens during a non-`untracked` computation.

### vs Alternatives

| Signals | BehaviorSubject | Zone.js + OnPush |
|---|---|---|
| Fine-grained, synchronous, no subscription | Observable-based, subscription management | Requires zone, coarser CD |
| Angular 16+ | All Angular versions | All Angular versions |
| `computed()` for derived state | `combineLatest` for derived state | Same, but more boilerplate |
| Best for reactive state in components | Best for shared service-level streams | Legacy — migrate toward Signals |
| Native type: `Signal<T>` — no subscribe | `Observable<T>` — subscribe required | N/A |

### How to Signal Senior Thinking

> "Signals are the convergence of Angular's reactivity model with what the browser actually supports efficiently. The reactive graph pattern — where the framework tracks dependencies automatically rather than polling or subscribing — is the same model used by Solid.js, Vue 3's Composition API, and Preact's signals. Angular adopting this means bundle sizes drop (zone.js removed), startup time improves (no zone monkey-patching), and runtime performance scales sub-linearly with reactive state complexity instead of linearly with component tree size."

---

## 💻 5. Code Example

```typescript
import {
  signal, computed, effect, Signal, WritableSignal,
  Component, inject, DestroyRef, ChangeDetectionStrategy,
  input, output, model
} from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

// ========================
// Basic: signal + computed + effect
// ========================
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kpi-tile',
  template: `
    <div class="kpi-tile" [class.loading]="isLoading()">
      <h4>{{ label() }}</h4>
      <span class="value">{{ formattedValue() }}</span>
      <span class="trend" [class.up]="trend() > 0">
        {{ trend() > 0 ? '▲' : '▼' }} {{ Math.abs(trend()) }}%
      </span>
    </div>
  `,
})
export class KpiTileComponent {
  // Signal inputs (Angular 17.1+)
  readonly label = input.required<string>();
  readonly rawValue = input<number>(0);
  readonly previousValue = input<number>(0);

  // Computed derived values — lazy, memoized
  readonly formattedValue = computed(() =>
    new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(this.rawValue())
  );

  readonly trend = computed(() => {
    const prev = this.previousValue();
    if (prev === 0) return 0;
    return Math.round(((this.rawValue() - prev) / prev) * 100);
  });

  readonly isLoading = signal(false);

  // Effect for analytics tracking (side effect)
  constructor() {
    effect(() => {
      // Runs when rawValue changes — tracks with reactive graph
      analyticsService.track('kpi_viewed', {
        label: this.label(),
        value: this.rawValue()
      });
    });
  }
}

// ========================
// toSignal: bridge Observable → Signal
// ========================
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-search',
  template: `
    <input [value]="query()" (input)="query.set($any($event.target).value)" />
    @if (loading()) {
      <app-spinner />
    }
    @for (result of results(); track result.id) {
      <app-result [result]="result" />
    }
  `,
})
export class SearchComponent {
  readonly query = signal<string>('');

  // Convert signal → Observable to use RxJS pipeline
  private query$ = toObservable(this.query);

  // Build the search Observable with debounce + switchMap
  private results$ = this.query$.pipe(
    debounceTime(300),
    switchMap(q => q.length >= 2
      ? inject(SearchService).search(q)
      : of([])
    ),
    catchError(() => of([]))
  );

  // Convert back to Signal for template — no async pipe needed
  readonly results = toSignal(this.results$, { initialValue: [] as SearchResult[] });
  readonly loading = signal(false);
}

// ========================
// model() for two-way binding
// ========================
@Component({
  standalone: true,
  selector: 'app-range-slider',
  template: `
    <input type="range" [min]="min()" [max]="max()"
           [value]="value()"
           (input)="value.set(+$any($event.target).value)" />
    {{ value() }}
  `,
})
export class RangeSliderComponent {
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly value = model<number>(50);  // two-way: parent can read & write
}

// Parent usage:
// <app-range-slider [(value)]="threshold" [min]="0" [max]="200" />

// ========================
// Computed dependency graph
// ========================
// Demonstrates automatic dependency tracking + glitch-free updates
export class FilterState {
  // State signals
  readonly searchText = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly sortBy = signal<'name' | 'date'>('name');
  readonly records = signal<Record[]>([]);

  // Derived — depends on records AND statusFilter
  readonly filteredRecords = computed(() => {
    const status = this.statusFilter();
    return status === 'all'
      ? this.records()
      : this.records().filter(r => r.status === status);
  });

  // Depends on filteredRecords AND searchText
  readonly searchedRecords = computed(() => {
    const search = this.searchText().toLowerCase();
    return search
      ? this.filteredRecords().filter(r => r.name.toLowerCase().includes(search))
      : this.filteredRecords();
  });

  // Depends on searchedRecords AND sortBy
  readonly displayRecords = computed(() => {
    const key = this.sortBy();
    return [...this.searchedRecords()].sort((a, b) =>
      key === 'name'
        ? a.name.localeCompare(b.name)
        : b.updatedAt - a.updatedAt
    );
  });

  // Only `statusFilter` changes → filteredRecords recomputes → searchedRecords
  // recomputes → displayRecords recomputes → template updates
  // searchText and sortBy: signals unchanged → their dependents stay cached
}

// ========================
// Untracked: read signal without registering dependency
// ========================
const count = signal(0);
const label = signal('default');

const computed1 = computed(() => {
  // count() registers count as dependency
  // untracked(label) reads label WITHOUT registering it as dependency
  return `${count()} items, label: ${untracked(label)}`;
  // computed1 only recomputes when count changes, not when label changes
});
```

---

## 🧠 6. Memory Aid

**Mental Model:** Signals are like spreadsheet cells. A `signal` is a cell with a raw value. A `computed` is a formula cell that auto-updates when referenced cells change. An `effect` is a macro that runs when cells it reads change. The spreadsheet (Angular) tracks which cells reference which — no manual subscription, no polling.

**If you go blank:** "`signal()` = reactive value (read: `count()`, write: `count.set(n)`). `computed()` = lazy memoized derived value. `effect()` = reactive side effect. `toSignal(obs$)` = Observable → Signal. `input()` = signal-native @Input. In Angular 17+."

**Mnemonic:** **CETI** — **C**omputed for derived values, **E**ffect for side effects, **T**oSignal to bridge RxJS, **I**nput() for signal inputs.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance: Signals + zoneless enable O(affected bindings) change detection vs O(component tree) — at SAP, 200-tile dashboard CD overhead dropped from 12ms to 0.8ms
→ DX: No subscription management — `computed()` and `toSignal()` handle reactivity without subscribe/unsubscribe boilerplate; `input()` makes component inputs type-safe read-only signals that can be `computed()` from
→ Direction: Signals are Angular's long-term reactivity primitive — zone.js will be optional then removed; new APIs (Deferrable Views, Server Components, incremental hydration) all build on the signal model

**How it works (3 sentences):**
Angular Signals maintain an internal reactive graph where reads inside `computed()` and `effect()` automatically register dependencies — when a `WritableSignal` is updated via `.set()` or `.update()`, all dependent computeds are marked stale (lazily re-evaluated on next read) and dependent effects are scheduled (microtask); template bindings to signals are tracked the same way. `computed()` values are memoized by referential equality — if the recomputed value equals the previous value, dependents of the computed are not re-triggered (glitch-free propagation). Bridge APIs `toSignal()` and `toObservable()` integrate Signals with the existing RxJS ecosystem — `toSignal` subscribes to an Observable and stores emissions in a signal, automatically unsubscribing via `DestroyRef` when the component is destroyed.

**Company relevance:**
- Microsoft: VS Code Web editor uses signals-like fine-grained reactivity for cursor/selection state — millions of events per session; O(affected bindings) update model is critical for editor performance
- Adobe: Firefly AI generation parameters as signals — `computed()` builds the request payload; `effect()` on `toObservable(params).pipe(debounceTime(500))` fires the preview generation; no manual subscription management in generation parameter panel
- Salesforce: Internal Angular-based tools migrating @Input()/@Output() to `input()`/`output()` across component library — signal inputs provide type safety and allow derived state via `computed()` without `ngOnChanges` boilerplate
- Cisco: WebEx meeting controls — audio/video/screen share enabled flags as signals; computed() for toolbar button states (disabled, label, icon); effect() for analytics tracking on state changes; zoneless profiling shows 60fps maintained across a 100-participant meeting with active participant video

---
✅ Topic 75/486 complete → Continuing to Topic 76: Akita vs NgRx vs Signal Store — Trade-offs
