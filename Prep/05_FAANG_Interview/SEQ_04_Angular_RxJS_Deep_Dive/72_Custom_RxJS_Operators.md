# 72. Custom RxJS Operators
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

A custom RxJS operator is a function that takes an Observable and returns a new Observable — just like any built-in operator such as `map` or `filter`. You create them as higher-order functions: `function myOperator<T>(): MonoTypeOperatorFunction<T>` returning a function `(source: Observable<T>) => Observable<T>`. They compose into `pipe()` exactly like built-in operators. At SAP, I built a `retryWithBackoff()` custom operator used across 40+ API calls for a consistent exponential retry strategy — it replaced 40 copies of ad-hoc retry logic with a single, tested operator.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Every built-in RxJS operator (`map`, `filter`, `switchMap`, `debounceTime`) is a function that returns a function from `Observable<T>` to `Observable<R>`. Custom operators follow exactly the same pattern — this is not a special API, it's just composing the existing Observable contract.

**Why build custom operators:**
1. **Reusability:** Same Observable transformation used in 5+ places → extract into a named, testable function
2. **Naming:** A chain of 6 operators with a business intention → wrap in a descriptively named custom operator
3. **Testing:** Custom operators can be tested in isolation with marble testing
4. **Encapsulation:** Retry strategies, caching, audit logic contained in one place

### How It Works Internally

**Type signatures:**

```typescript
// Operator that preserves the type (T → T)
type MonoTypeOperatorFunction<T> = (source: Observable<T>) => Observable<T>;

// Operator that transforms the type (T → R)
type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>;

// How pipe() works internally:
// source$.pipe(opA, opB, opC)
// = opC(opB(opA(source$)))
// = function composition, left to right
```

**Minimal custom operator pattern:**

```typescript
function myOperator<T>(): MonoTypeOperatorFunction<T> {
  // Return a function that takes the source Observable
  return (source: Observable<T>) => {
    // Return a new Observable
    return new Observable<T>(subscriber => {
      const sub = source.subscribe({
        next: value => subscriber.next(value),
        error: err => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
      // Teardown: unsubscribe from source when outer subscriber unsubscribes
      return () => sub.unsubscribe();
    });
  };
}
```

**Practical pattern: compose built-in operators (preferred for most cases):**

Most custom operators don't need `new Observable` — they compose built-in operators:

```typescript
// This is the pattern for 90% of custom operators
function retryWithBackoff<T>(maxRetries = 3, baseDelayMs = 1000): MonoTypeOperatorFunction<T> {
  return pipe(    // rxjs/operators 'pipe' — composes operators
    retryWhen(errors => errors.pipe(
      scan((retryCount, error) => {
        if (retryCount >= maxRetries) throw error;  // re-throw after max
        return retryCount + 1;
      }, 0),
      delayWhen(retryCount => timer(baseDelayMs * Math.pow(2, retryCount)))
    ))
  );
}
```

Using `pipe()` from `rxjs` (not the method on `Observable`) composes operators without creating a full custom Observable — cleaner and more efficient.

### Architecture: When to Write a Custom Operator vs Something Else

**Write a custom operator when:**
- Same 3+ operator chain appears in multiple places
- The chain has a specific, nameable business meaning (e.g., `retryWithBackoff`, `debounceDistinct`, `filterByPermission`)
- You need unit-testable stream transformations in isolation
- The chain includes state (scan accumulator, cache, dedup logic)

**Don't write a custom operator when:**
- The chain is complex but only used once
- A single built-in operator does the job
- You need side effects — use `tap` instead of wrapping in a custom operator

**Where custom operators live:**
```
src/
  app/
    shared/
      operators/
        retry-with-backoff.operator.ts
        debounce-distinct.operator.ts
        filter-by-permission.operator.ts
      operators/
        index.ts   ← barrel export
```

### Marble Testing Custom Operators

Custom operators are the most testable unit in RxJS — they're pure functions over time. Use `TestScheduler` with marble syntax:

```typescript
// Marble syntax: '-' = 1 frame, 'a' = emission, '|' = complete, '#' = error, '(ab)' = sync emissions
it('should debounce distinct values', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold('a-a-b-b-c|');
    const result = source.pipe(debounceDistinct(1));
    expectObservable(result).toBe('----b---c|');
  });
});
```

### ⚠️ Anti-Patterns & Pitfalls

- **Not handling unsubscription in `new Observable`** — if your operator creates inner subscriptions (via `subscribe()` inside the operator), the teardown function returned from `new Observable` must call `innerSub.unsubscribe()`. Otherwise, unsubscribing from the outer Observable doesn't clean up inner subscriptions — reproduces the exact memory leak pattern `takeUntilDestroyed` was invented to fix.
- **Putting side effects inside operator functions instead of `tap`** — operators should transform streams; side effects (logging, analytics) go in `tap`.
- **Over-parameterizing** — an operator with 8 configuration options is not a reusable abstraction; it's a function masquerading as one. Custom operators should be narrow and specific.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, every API call to the BI backend had slightly different retry logic — some duplicated `catchError + retry`, others had `retryWhen`. I extracted a `retryWithBackoff(maxRetries, baseDelayMs)` operator used in all 40+ API methods, standardizing retries at 1s, 2s, 4s with a maximum of 3 retries. Error rates reduced by ~20% during transient network events because the timing was now consistent and correct everywhere.

At Oracle, I built a `filterByUserPermission$(permission)` operator: it internally calls `inject(AuthService).hasPermission(permission)` and uses `switchMap` to only pass values through when the user has the required permission. This cleaned up repetitive permission checks from 12 smart components into a single operator with a single test suite.

**At FAANG scale:**
- **Microsoft (VS Code/Azure):** Observable operators for telemetry streams — `auditByCategory` custom operator groups telemetry events and rate-limits by category before sending to Application Insights
- **Adobe (Creative Cloud):** `debounceDistinct` operator for document auto-save pipeline — debounces edits but only when the value has actually changed (prevents saving identical content)
- **Salesforce:** `filterByPermission` operator across Lightning components — permissions are checked once via `BehaviorSubject`, operator gates downstream data automatically
- **Cisco (WebEx):** `decodeWebRTCStats` operator transforms raw WebRTC statistics maps into typed `ConnectionQuality` objects — used across 8 different connection-monitoring components

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "Custom RxJS operators are just functions — you take an Observable in, return an Observable out. There are two ways to write them: compose built-in operators using the `pipe` function from RxJS, or use `new Observable` for full control when you need to manage your own subscriptions and teardown. I always prefer the pipe-composition approach because it's shorter, leverages the battle-tested built-in operators, and handles teardown automatically.
>
> The signature is `function myOp<T>(): MonoTypeOperatorFunction<T>` — returning `(source$: Observable<T>) => Observable<T>`, and it plugs into `.pipe()` exactly like any built-in operator.
>
> At SAP I built a `retryWithBackoff` operator that standardized our exponential retry strategy — before it, 40 API calls each had subtly different retry logic. One operator, one test suite, consistent behavior. The key power of custom operators is testability: they're pure functions over time streams, so marble testing with `TestScheduler` gives you precise time-based assertions."

### Likely Follow-up Questions

1. **How do you handle teardown in a custom operator?** → If using `new Observable`, return a cleanup function from the subscriber function: `return () => innerSub.unsubscribe()`. If composing with `pipe`, built-in operators handle teardown automatically.
2. **What's a `MonoTypeOperatorFunction` vs `OperatorFunction`?** → `MonoTypeOperatorFunction<T>` is `OperatorFunction<T, T>` — the type doesn't change. Use `OperatorFunction<T, R>` when input and output types differ (like `map`).
3. **How do you test them?** → `TestScheduler` + marble testing. The custom operator is just a function — pass any cold Observable and verify output with `expectObservable`.
4. **When would you use `new Observable` instead of `pipe`?** → When the operator needs to imperatively create resources (like a WebSocket connection or event listener lifecycle tied specifically to the subscription), `new Observable` is necessary. For transformations, `pipe` is almost always sufficient.

### vs Alternatives

| Custom operator | Service method returning Observable | Inline pipe chain |
|---|---|---|
| Reusable across components | One place per service | Not reusable |
| Testable in isolation | Tested with service mocks | Can't test in isolation |
| Composable into `.pipe()` | Composable | Composable |
| Use when: 3+ use sites | Use when: tightly coupled to one service | Use when: single use, simple |

### How to Signal Senior Thinking

> "The discipline is treating Observable transformations the same way you treat pure functions in general — if the same transformation logic appears in multiple places, name it and test it in isolation. RxJS operators are the function abstraction for time-based data transformations. Custom operators aren't special Angular/RxJS magic; they're just recognizing that `(source: Observable<T>) => Observable<T>` is a first-class composable unit of work."

---

## 💻 5. Code Example

```typescript
import { Observable, pipe, timer } from 'rxjs';
import {
  MonoTypeOperatorFunction, OperatorFunction,
  retryWhen, scan, delayWhen, distinctUntilChanged,
  debounceTime, filter, map, catchError, throwError,
  switchMap, take
} from 'rxjs/operators';

// -------------------------------------------------------
// Pattern 1: Compose built-in operators (preferred)
// -------------------------------------------------------

// SAP API calls: exponential retry with configurable limit
export function retryWithBackoff<T>(
  maxRetries = 3,
  baseDelayMs = 1000
): MonoTypeOperatorFunction<T> {
  return pipe(
    retryWhen(errors =>
      errors.pipe(
        scan((retryCount, error: Error) => {
          if (retryCount >= maxRetries) throw error;  // stop retrying
          console.warn(`Retry attempt ${retryCount + 1}/${maxRetries}`);
          return retryCount + 1;
        }, 0),
        delayWhen(retryCount =>
          timer(baseDelayMs * Math.pow(2, retryCount - 1))  // 1s, 2s, 4s
        )
      )
    )
  );
}

// Usage — plugs into pipe() like any built-in operator
this.http.get<Data[]>('/api/data').pipe(
  retryWithBackoff(3, 1000),
  catchError(err => {
    this.errorService.report(err);
    return throwError(() => err);
  })
).subscribe(data => this.data = data);

// -------------------------------------------------------
// Pattern 2: debounceDistinct — debounce but only emit when value changed
// -------------------------------------------------------
export function debounceDistinct<T>(dueTimeMs: number): MonoTypeOperatorFunction<T> {
  return pipe(
    debounceTime(dueTimeMs),
    distinctUntilChanged(),  // only pass if value actually changed
  );
}

// Adobe doc auto-save: only save when edits settle AND value has changed
documentEdits$.pipe(
  debounceDistinct(500),
  switchMap(content => this.documentService.save(content))
).subscribe();

// -------------------------------------------------------
// Pattern 3: Type-transforming operator (OperatorFunction<T, R>)
// -------------------------------------------------------

// Transform raw API response to domain model
export function mapToDomainModel<Raw, Domain>(
  transform: (raw: Raw) => Domain
): OperatorFunction<Raw, Domain> {
  return pipe(
    map(transform),
    filter((v): v is Domain => v !== null && v !== undefined)
  );
}

// Usage
this.http.get<RawUser[]>('/api/users').pipe(
  mapToDomainModel(raw => raw.map(toDomainUser)),
).subscribe(users => this.users = users);

// -------------------------------------------------------
// Pattern 4: new Observable — for full teardown control
// -------------------------------------------------------

// Custom operator that logs subscription/unsubscription lifecycle
export function debugSubscription<T>(label: string): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) => new Observable<T>(subscriber => {
    console.log(`[${label}] subscribed`);

    const sub = source.subscribe({
      next: value => {
        console.log(`[${label}] next:`, value);
        subscriber.next(value);
      },
      error: err => {
        console.error(`[${label}] error:`, err);
        subscriber.error(err);
      },
      complete: () => {
        console.log(`[${label}] complete`);
        subscriber.complete();
      },
    });

    // Critical: teardown function — called when outer subscriber unsubscribes
    return () => {
      console.log(`[${label}] unsubscribed`);
      sub.unsubscribe();
    };
  });
}

// -------------------------------------------------------
// Marble testing
// -------------------------------------------------------
import { TestScheduler } from 'rxjs/testing';

describe('retryWithBackoff', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) =>
      expect(actual).toEqual(expected)
    );
  });

  it('should retry on error then succeed', () => {
    testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      let attempt = 0;
      const source = cold<number>('--a|', { a: 1 });
      const failThenSucceed = source.pipe(
        map(() => {
          if (++attempt < 2) throw new Error('network error');
          return 42;
        }),
        retryWithBackoff(3, 10),  // 10ms base in tests
        take(1)
      );

      expectObservable(failThenSucceed).toBe('----------(a|)', { a: 42 });
    });
  });
});
```

---

## 🧠 6. Memory Aid

**Mental Model:** Custom RxJS operators are like plumbing fittings — a standard interface on both ends (Observable in, Observable out) that lets you snap them into any pipeline. Built-in operators (`map`, `filter`) and custom operators are the same thing; the only difference is who named them.

**If you go blank:** "`function myOp<T>(): MonoTypeOperatorFunction<T>` returns `(source: Observable<T>) => Observable<T>`. Use `pipe()` from RxJS to compose built-in operators inside. Plug into `.pipe()` like any built-in operator."

**Mnemonic:** **PURE** — **P**ipe-composition preferred, **U**nsubscribe teardown required, **R**eusability is the trigger to extract, **E**xpose as function returning function.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ DRY: Duplicate Observable transformation logic is a maintenance liability — a bug in the retry timing needs fixing in 40 places vs one operator
→ Testing: Custom operators are the most unit-testable units in Angular — pure functions over time, marble-testable in isolation from components and services
→ Communication: A named custom operator like `retryWithBackoff` communicates intent clearly in code review; a chain of `retryWhen + scan + delayWhen` requires reading and decoding

**How it works (3 sentences):**
A custom RxJS operator is a function that accepts an `Observable<T>` and returns a new `Observable<R>` — the same interface every built-in operator uses, meaning they compose into `.pipe()` identically. The preferred implementation uses the `pipe` function from `rxjs` to compose existing built-in operators, which handles teardown/unsubscription automatically and avoids the need to manually manage inner subscriptions in `new Observable`. The `new Observable` constructor is reserved for operators that need imperative control over resource lifecycle — such as creating WebSocket connections, DOM event listeners, or third-party callback APIs tied to the subscription lifecycle.

**Company relevance:**
- Microsoft: `auditByCategory` operator in Azure Portal telemetry pipeline — groups and rate-limits analytics events by category, tested with marble tests in CI, referenced in Azure Portal RxJS best-practices internal documentation
- Adobe: `debounceDistinct` in document pipeline — auto-save only triggers when edits settle AND value has changed; prevents redundant storage I/O on Creative Cloud documents
- Salesforce: `filterByPermission` operator attached to all Lightning data streams — permission gateway centralized in one tested operator, not duplicated in 12 components
- Cisco: `decodeWebRTCStats` transforms raw WebRTC stats into typed quality metrics — all 8 connection-monitoring components use it, ensuring consistent interpretation of stats across the WebEx client

---
✅ Topic 72/486 complete → Continuing to Topic 73: NgRx — Store, Actions, Reducers, Effects, Selectors
