# 78. Pure Pipes vs Impure Pipes
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

A **pure pipe** re-runs only when its input reference changes — Angular caches the output and skips re-execution for the same reference, making it cheap to use in templates. An **impure pipe** runs on every change detection cycle, regardless of input changes. `pure: false` in the `@Pipe` decorator makes a pipe impure. The built-in `async` pipe is the canonical impure pipe — it must check the Observable for new emissions every CD cycle because emissions are asynchronous. For custom pipes, the rule is: if the transformation is deterministic for a given input reference (same ref → same output), it should be pure. If the transformation reads mutable state outside the input (time, random, shared service), it needs to be impure — but impure pipes carry a real performance cost and should be avoided where possible.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What Pipes Do and Why Purity Matters

Pipes transform template data: `{{ date | date:'shortDate' }}`, `{{ user | uppercase }}`, `{{ items | filterActive }}`. Angular calls the pipe's `transform()` method during template rendering.

**The performance question:** How often is `transform()` called?

- **Pure pipe:** Only when the input value or arguments change by reference (`===` check). Angular maintains a cache — if the last call had the same inputs, it returns the cached result without calling `transform()` again.
- **Impure pipe:** Called on every single change detection cycle — every timer, every event, every microtask resolution. Even if nothing in the template changed.

**The implication:**

```
500-component tree, CD runs 60x/second (WebSocket feed triggering zone)

Pure pipe on each component:    → transform() calls only when input reference changes
Impure pipe on each component:  → 500 × 60 = 30,000 transform() calls per second
```

An impure pipe on a list of 200 items running 60 CD cycles/second = 12,000 `transform()` calls/second, even if the data hasn't changed.

### Pure Pipes — Default Behavior

```typescript
@Pipe({ name: 'formatKpi', pure: true })  // pure: true is the default — can omit
export class FormatKpiPipe implements PipeTransform {
  transform(value: number, format: 'compact' | 'full' = 'compact'): string {
    if (format === 'compact') {
      return new Intl.NumberFormat('en-US', {
        notation: 'compact', maximumFractionDigits: 1
      }).format(value);
    }
    return new Intl.NumberFormat('en-US').format(value);
  }
}
```

**Pure pipe call conditions:**
- `value` changes by reference (`===` check)
- `format` argument changes
- Otherwise: returns cached string

**Works perfectly for:**
- Formatting numbers, dates, currencies
- String transformations (uppercase, truncate, sanitize)
- Unit conversions
- Mapping primitives to display strings

**Does NOT work for:**
- Filtering/sorting arrays: `items | filterActive` where `items` is the same array reference but items inside mutated → pipe never re-runs because `items === items`
- Objects with mutated properties: same reference, different content

**Solution for array/object pipes: ensure immutability upstream:**

```typescript
// ✅ Correct: spread creates new reference → pure pipe re-runs
this.items = [...this.items.map(i => i.id === id ? {...i, active: true} : i)];

// ❌ Breaks pure pipe: mutation — pipe cached result persists
this.items.find(i => i.id === id)!.active = true;
```

### Impure Pipes — `pure: false`

```typescript
@Pipe({ name: 'filterActive', pure: false })  // explicitly impure
export class FilterActivePipe implements PipeTransform {
  transform(items: Item[]): Item[] {
    return items ? items.filter(i => i.active) : [];
  }
}
```

**Why this needs `pure: false`:**
If items are mutated in-place (`item.active = false`) without creating a new array reference, the pure check (`items === items`) returns true → cached result returned → stale filter output. Setting `pure: false` makes Angular call `transform()` every CD cycle — always fresh but always costly.

**The async pipe — the canonical impure pipe:**

```typescript
// Angular's built-in async pipe — impure by necessity
@Pipe({ name: 'async', pure: false })
export class AsyncPipe implements PipeTransform, OnDestroy {
  private _latestValue: any = null;
  private _subscription: SubscriptionLike | null = null;

  transform<T>(obj: Observable<T> | Promise<T> | null): T | null {
    if (!this._subscription) {
      this._subscribe(obj);  // subscribe on first run
    }
    return this._latestValue;  // always returns the latest emitted value
  }
  // Called every CD cycle to return the latest value
  // Must be impure because new emissions arrive asynchronously
}
```

The `async` pipe MUST be impure — it can't know from the Observable reference whether a new value was emitted. It runs `transform()` every CD cycle, checks `_latestValue`, and returns it. If the value changed since last cycle (due to async emission), Angular sees a new return value and updates the DOM.

**Other legitimate impure pipes:**
- A pipe that reads the current locale (`Intl.DateTimeFormat`) — locale can change at runtime
- A pipe that reads from a service's current state (though this is usually better handled with signals/store selectors)
- A pipe that depends on the current time (`timeAgo` pipe: "5 minutes ago" must update even if the input timestamp doesn't change)

### Custom Pipe Patterns — Best Practices

**Time-relative pipe (legit impure use case):**

```typescript
@Pipe({ name: 'timeAgo', pure: false })
export class TimeAgoPipe implements PipeTransform {
  transform(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }
}
// Pure: false because Date.now() changes on every CD cycle
// The same timestamp returns different output over time
// If pure: transform() would only call on input change → stale "5m ago" forever
```

**Performance mitigation for impure pipes:**
Since impure pipes run on every CD cycle, keep their logic lightweight:

```typescript
// ❌ Expensive impure pipe logic
@Pipe({ name: 'sorted', pure: false })
export class SortedPipe implements PipeTransform {
  transform(items: Item[]): Item[] {
    // O(n log n) on every CD cycle — potentially thousands of times/sec
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }
}

// ✅ Better: make data immutable + use pure pipe
// OR: do sorting in the component/store and pass sorted data directly

// ✅ Or: cached impure pipe — only re-sort if input actually changed
@Pipe({ name: 'sorted', pure: false })
export class SortedPipe implements PipeTransform {
  private _cachedItems: Item[] | null = null;
  private _cachedResult: Item[] = [];

  transform(items: Item[]): Item[] {
    if (items === this._cachedItems) return this._cachedResult;  // O(1) cache check
    this._cachedItems = items;
    this._cachedResult = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return this._cachedResult;
  }
}
```

### Pipes in Standalone Components

```typescript
@Component({
  standalone: true,
  imports: [FormatKpiPipe, TimeAgoPipe],  // import pipes directly
  template: `
    <span>{{ value | formatKpi:'compact' }}</span>
    <span>{{ createdAt | timeAgo }}</span>
  `,
})
export class MetricCardComponent {}
```

### ⚠️ Anti-Patterns & Pitfalls

- **Impure pipe for filtering/sorting arrays** — the entire point of pipes is reusable template logic; filtering/sorting is usually better done in the component/store and the results passed as an already-filtered array. Impure filter pipes on large lists are a performance anti-pattern.
- **Assuming pure pipe works with mutated objects** — the most common bug: `{{ user | fullName }}` returns stale name after `user.firstName = 'New'` because `user` reference unchanged. Fix: `user = { ...user, firstName: 'New' }`.
- **Using impure pipe when pure + immutability would work** — every time you reach for `pure: false`, ask: "Can I make the data immutable so a pure pipe would work?"
- **Complex logic in `transform()`** — whether pure or impure, `transform()` is called in the template render path. No HTTP calls, no `setTimeout`, no `store.dispatch`. Keep it synchronous and cheap.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP BI, the dashboard used a custom `formatKpi` pure pipe for number formatting (compact KPI display: 1.2M, 340K). This ran thousands of times per session with zero performance impact — pure pipe caching meant the same number wasn't reformatted more than once per reference change. I initially wrote it as an impure pipe (unnecessary `pure: false`) and the profiler showed it as a hot spot in `transform()` calls for no reason; removing `pure: false` immediately made it disappear from the profiler.

At Oracle, a `dateDistanceToNow` impure pipe was used to show relative timestamps on records ("last modified 3 minutes ago"). It needed to be impure because the time display changes every minute even when the timestamp doesn't change. I added a manual cache check (`Date.now()` comparison with 60-second granularity) to avoid expensive recomputation more than once per minute.

**At FAANG scale:**
- **Microsoft:** Locale-specific number formatting as pure pipes in Azure Portal (currency, percentage, byte size); locale changes are rare → pure pipes work; `async` pipe used extensively on Observable store selectors
- **Adobe:** Lightroom Web uses a pure `fileSizePipe` for asset byte sizes; `timeAgo` impure pipe for last-modified timestamps with manual cache reducing recompute to once per minute  
- **Salesforce:** Custom formatting pipes across Lightning component library; lint rule `no-impure-pipes` in shared component library — all custom pipes must be pure unless reviewed and approved
- **Cisco:** WebEx meeting duration pipe (`elapsed`) must be impure — shows "00:45:23" counting up every second; optimized with a `setInterval` inside the pipe's private state updating at 1Hz instead of relying on CD frequency

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "By default, an Angular pipe is pure — Angular caches the output and only calls `transform()` again when the input reference changes. This makes pipes cheap: a `DatePipe` on a component that renders 500 times per session only actually computes the formatted date once per data change, not 500 times.
>
> An impure pipe — `pure: false` — runs on every change detection cycle. The `async` pipe is the classic example: it must check whether the Observable emitted a new value on every CD cycle, because that emission is asynchronous and Angular can't detect it with a reference check. That's the only legitimate reason for `pure: false`: when the output depends on something other than the inputs — time, async emissions, mutable external state.
>
> The pitfall: a pure pipe on mutated objects doesn't re-run. If you do `user.firstName = 'New'` and the template has `{{ user | fullName }}`, the pure pipe returns the cached stale output because `user` reference didn't change. The fix is immutability: `user = { ...user, firstName: 'New' }`.
>
> My rule: reach for pure pipes by default, ensure immutable data, and only use `pure: false` when the output has external time-dependent or async-dependent state."

### Likely Follow-up Questions

1. **When would you use a pipe vs a component method vs a store selector?** → Pipe: reusable, stateless formatting (dates, numbers, strings). Component method: works but called every CD cycle (same performance as impure pipe) — avoid for expensive logic. Store selector: for filtering/sorting business data — computed once, memoized, reused across components.
2. **Can a pure pipe use injection?** → Yes: `transform(value: T): R { return inject(FormatterService).format(value); }`. But if the service has mutable state that affects the output, the pipe should be impure or the service state should be passed as a pipe argument.
3. **Is the `async` pipe the only built-in impure pipe?** → No — `slice` (for array/string slicing with mutable data) is also impure; `keyvalue` is impure (iterates object keys which may not be stable); `i18nPlural` and `i18nSelect` are pure. Built-in impure pipes are explicitly documented.
4. **What's the difference between a pipe and a function in the template?** → Template functions are called on every CD cycle (impure by default). Pipes allow Angular to cache based on input reference equality (pure pipe). For expensive transformations called in templates, pure pipes are always preferable to functions.

### vs Alternatives

| Pure Pipe | Impure Pipe | Component computed property | Store selector |
|---|---|---|---|
| Reusable, cheapest | Reusable, expensive | Not reusable | Cross-component, memoized |
| Call count: on ref change | Call count: every CD cycle | Call count: every CD cycle | Call count: on input ref change |
| Best for display transforms | Required for async/time | Simple one-off values | Business data filtering/sorting |

### How to Signal Senior Thinking

> "The deeper principle: Angular's change detection is a pull model — it checks what might have changed. Pure pipes make that pull cheap by caching at the function level. Impure pipes opt out of caching and pay for it with call frequency. Understanding this: every `pure: false` is a performance toll you're accepting and need to justify. The `async` pipe earns its toll because there's no other way to bridge Observable emissions to the view layer synchronously."

---

## 💻 5. Code Example

```typescript
import { Pipe, PipeTransform, inject } from '@angular/core';

// ========================
// Pure Pipe — default (omit pure: true)
// ========================
@Pipe({ name: 'formatKpi', standalone: true })  // pure: true is default
export class FormatKpiPipe implements PipeTransform {
  transform(value: number | null, format: 'compact' | 'full' | 'percent' = 'compact'): string {
    if (value === null || value === undefined) return '—';

    switch (format) {
      case 'compact':
        return new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(value);

      case 'full':
        return new Intl.NumberFormat('en-US').format(value);

      case 'percent':
        return `${(value * 100).toFixed(1)}%`;

      default:
        return String(value);
    }
  }
  // Called only when value or format changes by reference
  // Same value = same cached output = no recalculation
}

// ========================
// Pure Pipe — with injection
// ========================
@Pipe({ name: 'localizedDate', standalone: true })
export class LocalizedDatePipe implements PipeTransform {
  private locale = inject(LOCALE_ID);

  transform(date: Date | number | string, dateStyle: Intl.DateTimeFormatOptions['dateStyle'] = 'medium'): string {
    return new Intl.DateTimeFormat(this.locale, { dateStyle })
      .format(new Date(date));
  }
  // Pure: locale doesn't change at runtime (injected once)
  // Same date reference + same dateStyle = cached output
}

// ========================
// Impure Pipe — time-relative (legitimate impure use case)
// ========================
@Pipe({ name: 'timeAgo', standalone: true, pure: false })
export class TimeAgoPipe implements PipeTransform {
  // Manual granularity cache — avoid re-formatting more than once per 10 seconds
  private _lastInput: number | null = null;
  private _lastGranularity = 0;  // rounded time bucket
  private _cachedOutput = '';

  transform(timestamp: number | Date | null): string {
    if (!timestamp) return '';

    const ts = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
    const nowBucket = Math.floor(Date.now() / 10000);  // 10-second buckets

    // Only re-compute if input changed OR time bucket changed
    if (ts === this._lastInput && nowBucket === this._lastGranularity) {
      return this._cachedOutput;
    }

    this._lastInput = ts;
    this._lastGranularity = nowBucket;
    this._cachedOutput = this._format(ts);
    return this._cachedOutput;
  }

  private _format(ts: number): string {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return `Just now`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
}

// ========================
// The WRONG pattern — impure filter pipe (avoid)
// ========================
@Pipe({ name: 'filterActive', standalone: true, pure: false })
export class FilterActivePipe implements PipeTransform {
  // Called every CD cycle — expensive for large arrays
  transform(items: Item[]): Item[] {
    return items?.filter(i => i.active) ?? [];
  }
}

// ✅ Better alternatives to the above:
// 1. Use immutable data + pure pipe:
@Pipe({ name: 'filterActive', standalone: true })  // pure (no pure: false)
export class FilterActivePipePure implements PipeTransform {
  transform(items: Item[]): Item[] {
    return items?.filter(i => i.active) ?? [];
  }
  // Now: only runs when items reference changes
  // Requires: always produce new array reference when items change (immutability)
}

// 2. Filter in the store selector (best for cross-component use)
// selectActiveTiles = createSelector(selectAllTiles, tiles => tiles.filter(t => t.active))

// ========================
// Component usage — standalone imports
// ========================
@Component({
  standalone: true,
  imports: [FormatKpiPipe, LocalizedDatePipe, TimeAgoPipe, AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-record-card',
  template: `
    <div class="record-card">
      <h3>{{ record.name }}</h3>
      <!-- Pure pipe: only recomputes when record.value reference changes -->
      <span>{{ record.value | formatKpi:'compact' }}</span>

      <!-- Pure pipe with locale injection -->
      <span>{{ record.createdAt | localizedDate }}</span>

      <!-- Impure pipe: recomputes in time buckets; must show "5m ago" live -->
      <time>{{ record.updatedAt | timeAgo }}</time>

      <!-- Built-in impure async pipe: re-checks every CD cycle for new emission -->
      <span *ngIf="status$ | async as status">{{ status }}</span>
    </div>
  `,
})
export class RecordCardComponent {
  @Input({ required: true }) record!: Record;
  readonly status$ = inject(RecordService).getStatus(this.record.id);
}
```

---

## 🧠 6. Memory Aid

**Mental Model:** A pure pipe is a **vending machine with memory** — same coins (inputs) → same snack (output) from cache, no mechanical work. An impure pipe is a **chef** who cooks fresh every time you place an order, regardless of whether you ordered the same thing as last time.

**If you go blank:** "Pure (default) = only runs when input reference changes, cached result. Impure (`pure: false`) = runs every CD cycle. `async` pipe is impure because Observable emissions are async. Use pure by default; ensure immutable data so pure pipes detect changes. Only use `pure: false` for time/async-dependent transforms."

**Mnemonic:** **PIC** — **P**ure = cached by reference, **I**mpure = every cycle, **C**anonical impure = async pipe.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance: An impure pipe on a list of 200 items at 60 CD cycles/second = 12,000 `transform()` calls/second for zero benefit in most cases; pure pipes reduce this to the exact number of actual data changes
→ Correctness: The most common pipe bug is a pure pipe on mutated object/array state — the pipe returns stale cached output because reference is unchanged; understanding pure vs impure is key to diagnosing this

**How it works (3 sentences):**
Angular calls a pipe's `transform()` method during template evaluation — for a **pure** pipe (default), Angular compares the current inputs to the previous call's inputs using strict reference equality (`===`) and returns the cached result without calling `transform()` if inputs are unchanged, making pure pipes as efficient as memoized computed values. For an **impure** pipe (`pure: false` in `@Pipe` decorator), Angular calls `transform()` on every single change detection cycle regardless of input changes — necessary for pipes whose output depends on state external to their inputs, like the built-in `async` pipe which must check its Observable's latest emission on every cycle. The design rule: prefer pure pipes with immutable input data (new reference when content changes) and use `pure: false` only when the pipe's output genuinely depends on time, mutable external state, or asynchronous changes that cannot be expressed as input reference changes.

**Company relevance:**
- Microsoft: Azure Portal currency/number formatting — pure pipes for locale-specific display; audit log shows lint rule enforcement requiring `pure: true` in shared pipe library; `async` pipe on all store selector Observables
- Adobe: Lightroom Web `fileSizePipe` (pure) formats byte counts for asset sizes; `timeAgo` pipe (impure with 10-second cache granularity) for last-modified; ESLint rule flags new impure pipes for performance review
- Salesforce: Lightning component library — `no-impure-pipes` lint rule for shared components; custom impure pipes require written annotation explaining why `pure: false` is necessary; ensures filtering/sorting is kept in NgRx selectors, not pipes
- Cisco: WebEx meeting timer pipe (`elapsedTime`) — impure by necessity, showing HH:MM:SS counting up; optimized with a private `setInterval` at 1Hz that triggers change detection explicitly rather than relying on zone-triggered CD at arbitrary frequency

---
✅ Topic 78/486 complete → Continuing to Topic 79: Lazy Loaded Modules + Route-Level Code Splitting
