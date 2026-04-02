# Implement Promise.all / Promise.race from Scratch
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **`Promise.all(promises)`**: resolves when ALL N promises resolve, with an array of results IN THE SAME ORDER as the input (not the order they completed); rejects immediately if ANY single promise rejects (fail-fast); track with a counter `resolved = 0`, increment on each resolution, resolve the outer promise when `resolved === promises.length`
- **`Promise.race(promises)`**: resolves or rejects with the result of the FIRST promise that settles (either resolves or rejects); call `resolve` or `reject` on the first callback, all subsequent callbacks are no-ops because a Promise can only settle once
- **`Promise.allSettled(promises)`**: like `Promise.all` but never rejects; waits for ALL promises regardless of outcome, returns `[{status: 'fulfilled', value}, {status: 'rejected', reason}]` array; use when you need partial results
- **`Promise.any(promises)`**: resolves with the FIRST fulfilled promise (ignores rejections); rejects with `AggregateError` only when ALL promises reject; the inverse of `Promise.race`
- **Key implementation insight**: you cannot `await` a native Promise from inside your custom implementation — you must attach `.then(resolve, reject)` callbacks to each input promise; the outer Promise's `resolve`/`reject` functions are captured from the constructor and called inside the callbacks
- **Order preservation in `Promise.all`**: store results at `results[i] = value` (index from the original loop) NOT by appending — array order must match input order, not completion order

---

## 1. One-Line Definition
`Promise.all` waits for all async operations to succeed and returns their results in order; `Promise.race` returns the result of whichever operation finishes first; both are implemented by wrapping a new Promise and calling its resolve/reject from within inner `.then/.catch` callbacks.

---

## 2. The Problem It Solves

**`Promise.all` — parallel fan-out:**
When fetching data from three independent APIs (user profile, user orders, user preferences), you want to start all three requests simultaneously and wait for all three to complete before rendering. Sequential `await` does them one after another — slow. `Promise.all` runs them in parallel and resolves when the last one finishes.

```
Sequential:   [---user---][---orders---][---prefs---]  total = sum(durations)
Parallel:     [---user---]
              [---orders---]
              [---prefs---]                            total = max(durations)
```

**`Promise.race` — timeout + request:**
Send a request to an endpoint, but if it doesn't respond within 3 seconds, cancel it and show a timeout error. `Promise.race` between the request promise and a 3-second timer promise — whichever resolves/rejects first wins.

---

## 3. How It Works Internally

### Promise.all State Machine

```
Input: [P1, P2, P3]  where P2 resolves first (200ms), P1 third (500ms), P3 second (350ms)

Create outer promise with resolve/reject capture.
results = [undefined, undefined, undefined]
resolved = 0

Attach callbacks to each promise:
  P1.then(v => { results[0] = v; if (++resolved === 3) resolve(results); })
  P2.then(v => { results[1] = v; if (++resolved === 3) resolve(results); })
  P3.then(v => { results[2] = v; if (++resolved === 3) resolve(results); })

P2 resolves:  results = [undef, "P2val", undef], resolved = 1  → no resolve yet
P3 resolves:  results = [undef, "P2val", "P3val"], resolved = 2 → no resolve yet
P1 resolves:  results = ["P1val", "P2val", "P3val"], resolved = 3 → RESOLVE([P1val, P2val, P3val])

Result: ["P1val", "P2val", "P3val"]  ← input ORDER, not completion order
```

### Promise.race State Machine

```
Input: [slowRequest (800ms), timeout (3000ms)]  ← slowRequest wins

Attach callbacks:
  slowRequest.then(v => resolve(v), r => reject(r))
  timeout.then(v => resolve(v), r => reject(r))

slowRequest resolves at 800ms → resolve("response") called
                             → outer promise settles as FULFILLED

timeout resolves at 3000ms → tries to call resolve("timeout")
                           → already settled → has no effect (a Promise can only settle once)

Result: "response"  ← the first to settle wins
```

---

## 4. The Code

### Wrong Way — Classic Bugs

```typescript
// ❌ WRONG 1: Push to results array instead of using index — wrong ORDER

function promiseAllWrong<T>(promises: Promise<T>[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const results: T[] = [];
        let resolved = 0;
        
        promises.forEach(p => {
            p.then(value => {
                results.push(value);  // ❌ push appends in COMPLETION order, not input order
                if (++resolved === promises.length) resolve(results);
            }).catch(reject);
        });
    });
}
// If P2 resolves first, P2's value is at index 0 instead of index 1
// Breaks calling code that expects results[i] to correspond to promises[i]
```

```typescript
// ❌ WRONG 2: Not handling empty input array — Promise never resolves

function promiseAllEmpty<T>(promises: Promise<T>[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const results: T[] = [];
        let resolved = 0;
        
        promises.forEach((p, i) => {
            p.then(value => {
                results[i] = value;
                if (++resolved === promises.length) resolve(results);
            }).catch(reject);
        });
        // ❌ If promises = [], forEach runs zero iterations
        // resolved (0) === promises.length (0) condition is NEVER checked
        // The outer promise stays pending forever
    });
}
```

```typescript
// ❌ WRONG 3: Promise.race does not race non-Promises (e.g. resolve immediate values)

function promiseRaceWrong<T>(values: (T | Promise<T>)[]): Promise<T> {
    return new Promise((resolve, reject) => {
        for (const v of values) {
            // ❌ If v is not a Promise (it's a plain value), v.then is undefined
            // TypeError: v.then is not a function
            (v as Promise<T>).then(resolve).catch(reject);
        }
    });
}
// ✅ Fix: wrap each value in Promise.resolve(v) to normalise plain values to Promises
//    Promise.resolve(alreadyAPromise) returns the SAME promise (no wrapping overhead)
```

### Right Way — All Four Static Methods

```typescript
// ✅ PROMISE.ALL — all must resolve, preserves order, fail-fast on rejection

function promiseAll<T>(promises: (T | Promise<T>)[]): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
        // ✅ Edge case: empty input resolves immediately with empty array
        if (promises.length === 0) {
            resolve([]);
            return;
        }
        
        const results: T[] = new Array(promises.length);  // ← pre-size for index assignment
        let resolvedCount = 0;
        
        promises.forEach((p, i) => {
            // ✅ Wrap in Promise.resolve to handle non-Promise values gracefully
            Promise.resolve(p).then(value => {
                results[i] = value;          // ✅ store at INPUT index, not push
                resolvedCount++;
                
                if (resolvedCount === promises.length) {
                    resolve(results);         // ✅ all resolved → resolve outer promise
                }
            }).catch(reject);                // ✅ any rejection → reject outer immediately
        });
    });
}
```

```typescript
// ✅ PROMISE.RACE — first to settle wins (resolve OR reject)

function promiseRace<T>(promises: (T | Promise<T>)[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        // ✅ Wrap each in Promise.resolve — handles plain values (resolve immediately)
        for (const p of promises) {
            Promise.resolve(p).then(resolve).catch(reject);
            // ✅ After the first resolve/reject call, subsequent calls are no-ops
            //    A Promise can only settle once — the constructor guarantees this
        }
        // Edge case: empty array → outer promise stays pending forever
        // (consistent with native Promise.race([]) behaviour)
    });
}
```

```typescript
// ✅ PROMISE.ALLSETTLED — wait for all, never rejects, returns status objects

type SettledResult<T> =
    | { status: 'fulfilled'; value: T }
    | { status: 'rejected'; reason: unknown };

function promiseAllSettled<T>(promises: (T | Promise<T>)[]): Promise<SettledResult<T>[]> {
    return new Promise(resolve => {
        if (promises.length === 0) { resolve([]); return; }
        
        const results: SettledResult<T>[] = new Array(promises.length);
        let settledCount = 0;
        
        promises.forEach((p, i) => {
            Promise.resolve(p)
                .then(value => {
                    results[i] = { status: 'fulfilled', value };
                })
                .catch(reason => {
                    results[i] = { status: 'rejected', reason };
                })
                .finally(() => {
                    settledCount++;
                    // ✅ allSettled never rejects — always calls outer resolve
                    if (settledCount === promises.length) resolve(results);
                });
        });
    });
}
```

```typescript
// ✅ PROMISE.ANY — first FULFILLED wins; rejects only if ALL reject

function promiseAny<T>(promises: (T | Promise<T>)[]): Promise<T> {
    return new Promise((resolve, reject) => {
        if (promises.length === 0) {
            reject(new AggregateError([], 'All promises were rejected'));
            return;
        }
        
        const errors: unknown[] = new Array(promises.length);
        let rejectedCount = 0;
        
        promises.forEach((p, i) => {
            Promise.resolve(p)
                .then(resolve)   // ✅ first fulfillment wins — subsequent calls are no-ops
                .catch(reason => {
                    errors[i] = reason;
                    rejectedCount++;
                    // ✅ Only reject when ALL have failed
                    if (rejectedCount === promises.length) {
                        reject(new AggregateError(errors, 'All promises were rejected'));
                    }
                });
        });
    });
}
```

```typescript
// ✅ REAL USAGE PATTERN: parallel API calls with timeout

async function fetchUserDashboard(userId: string): Promise<DashboardData> {
    const timeout = (ms: number): Promise<never> =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms));
    
    // ✅ Promise.all: 3 parallel fetches, fail-fast if any fails
    const [profile, orders, preferences] = await promiseAll([
        fetch(`/api/users/${userId}`).then(r => r.json()),
        fetch(`/api/users/${userId}/orders`).then(r => r.json()),
        fetch(`/api/users/${userId}/preferences`).then(r => r.json())
    ]);
    
    return { profile, orders, preferences };
}

// ✅ Race with timeout
async function fetchWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return promiseRace([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
        )
    ]);
}
```

```java
// ✅ Java equivalent: CompletableFuture.allOf and anyOf

import java.util.concurrent.CompletableFuture;
import java.util.List;
import java.util.stream.Collectors;

// Promise.all equivalent
public <T> CompletableFuture<List<T>> allOf(List<CompletableFuture<T>> futures) {
    CompletableFuture<Void> allDone = CompletableFuture.allOf(
        futures.toArray(new CompletableFuture[0])
    );
    
    return allDone.thenApply(v ->
        futures.stream()
            .map(CompletableFuture::join)  // ← join is safe here: allDone ensures all completed
            .collect(Collectors.toList())
    );
}

// Promise.race equivalent — CompletableFuture.anyOf returns Object, needs cast
public CompletableFuture<Object> race(List<CompletableFuture<?>> futures) {
    return CompletableFuture.anyOf(futures.toArray(new CompletableFuture[0]));
}

// Usage: parallel service calls in Spring Boot
@Service
public class DashboardService {
    
    public CompletableFuture<DashboardData> loadDashboard(String userId) {
        CompletableFuture<UserProfile> profileFuture = 
            CompletableFuture.supplyAsync(() -> userService.getProfile(userId));
        CompletableFuture<List<Order>> ordersFuture = 
            CompletableFuture.supplyAsync(() -> orderService.getOrders(userId));
        CompletableFuture<UserPrefs> prefsFuture = 
            CompletableFuture.supplyAsync(() -> prefService.getPrefs(userId));
        
        return CompletableFuture.allOf(profileFuture, ordersFuture, prefsFuture)
            .thenApply(v -> new DashboardData(
                profileFuture.join(),
                ordersFuture.join(),
                prefsFuture.join()
            ));
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why does `Promise.all` preserve ORDER of results even if Promise 3 resolves before Promise 1?"

**Hruday's answer:**
> Because we store results at the ORIGINAL INDEX, not by appending.
>
> When I attach `.then` callbacks, I capture the index `i` from the outer `forEach` loop via closure. When a promise resolves, no matter when it resolves, the callback stores `results[i] = value` using that captured index. If promise at index 2 happens to resolve first, it writes to `results[2]`. When promise at index 0 resolves later, it writes to `results[0]`.
>
> Once all N promises have resolved and `resolvedCount === promises.length`, we resolve the outer promise with `results` — which by then has correct values at every index, in input order.
>
> The common mistake is `results.push(value)` — push appends in resolution order, not input order. Index 0 of the pushed array would be the FIRST to resolve, not the first input promise.

---

### Q2 — Deep Dive
**Interviewer asks:** "What happens if you call Promise.race with an empty array?"

**Hruday's answer:**
> With an empty array, the `for` loop runs zero times. No callbacks are attached. No resolve or reject is ever called. The outer Promise remains in the PENDING state indefinitely — it never settles.
>
> This is the defined native behaviour too: `Promise.race([])` returns a promise that is permanently pending.
>
> In practical code, this is almost always a bug — if you're racing zero promises, you probably have a logic error in the calling code. Some implementations of custom `promiseRace` add a guard: if the input is empty, reject immediately with an error like "Cannot race empty iterable". Whether to add this guard depends on the API contract you're implementing.
>
> `Promise.all([])` has the opposite defined behaviour: resolves immediately with `[]`. The logic: "all N of zero promises resolved" is vacuously true at the start, so it resolves at once. This is why the empty array check is the first thing in my `promiseAll` implementation.

---

### Q3 — Application
**Interviewer asks:** "When would you use `Promise.allSettled` instead of `Promise.all`?"

**Hruday's answer:**
> I use `Promise.allSettled` when I want partial results — when SOME requests might fail but I still want the data from the ones that succeeded.
>
> For example: loading a user dashboard with four widgets — profile, recent orders, recommendations, and notifications. If the recommendations endpoint is down, I still want to show the profile, orders, and notifications. `Promise.all` would fail the entire dashboard because one request failed.
>
> With `Promise.allSettled`, I get `[{status: 'fulfilled', value: profile}, {status: 'rejected', reason: ...}, ...]`. I iterate through the results: render the fulfilled widgets, show a "Could not load" placeholder for rejected ones.
>
> `Promise.all` is the right choice when ALL results are required — if any one fails, the whole operation doesn't make sense (e.g., all three parts of a financial transaction: deduct balance, update ledger, issue receipt — all three must succeed or roll back).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| `.push(value)` instead of `results[i] = value` | "I'll push values as they resolve and return the array" | Push produces results in completion order, not input order; `Promise.all` guarantees that `results[i]` corresponds to `promises[i]`, regardless of which promise resolved first; if the caller destructures `const [profile, orders] = await promiseAll(...)`, they expect index 0 to be profile and index 1 to be orders — push breaks this guarantee silently (no error, just wrong data) |
| Not handling empty input array | "I'll handle the normal case; empty array is an edge case" | Empty array is a perfectly valid input; for `Promise.all([])` the native spec says resolve immediately with `[]` — if your implementation doesn't check this, the promise never resolves (the counter check `resolved === 0` is never reached); interviewers specifically test this edge case; 2 lines at the top of the function covers it |
| Not wrapping non-Promises with `Promise.resolve()` | "The input is always Promises so I can call `.then()` directly" | The native `Promise.all` and `Promise.race` accept iterables of values OR Promises; a plain value like `42` can appear in the input; `(42).then(...)` throws TypeError; wrapping with `Promise.resolve(p)` normalises both cases: `Promise.resolve(42)` returns a resolved Promise with value 42, `Promise.resolve(existingPromise)` returns the same Promise unchanged — no extra wrapping overhead for Promises |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a product configuration page that needed data from three separate microservices: product catalogue service, pricing engine, and inventory service. The first version awaited them sequentially:
>
> ```typescript
> const catalogue = await catalogueClient.get(id);
> const pricing = await pricingClient.get(id);
> const inventory = await inventoryClient.get(id);
> ```
>
> Each call took ~150ms. Total = ~450ms per page load.
>
> Replacing with `Promise.all` ran all three in parallel: total = max(~150ms) = ~160ms. A 3x improvement with a one-line change. More importantly, the three services had no data dependency on each other — this was a pure fan-out pattern where parallel execution was always the right call.
>
> We also added a `Promise.race` with a 500ms timeout wrapper around the whole `Promise.all` — if any of the three services was slow (P99 was sometimes 400ms), we'd rather show a timeout message than make the user wait and eventually fail at 10 seconds. That race pattern prevented a slow inventory service from degrading the perceived performance of the entire product page."

---

## 8. Scale Evolution

**1,000 users →** `Promise.all` in the browser frontend or Node.js backend for parallel API calls. All within a single JavaScript event loop — no threading concerns.

**100,000 users →** Java backend: `CompletableFuture.allOf` with a thread pool executor for parallel service calls; or Spring's `@Async` for annotated non-blocking method calls; reactor `Flux.merge` / `Mono.zip` in a Spring WebFlux reactive context.

**10 million users →** Service mesh parallelism: API gateway fans out to multiple upstream services (catalogue, pricing, inventory) in a single request; the gateway uses a scatter-gather pattern — equivalent to `Promise.all` — and aggregates responses; circuit breakers (Resilience4j on the Java side) wrap each upstream call; a slow service triggers the circuit breaker's open state before the race timeout would.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Parallel gateway availability checks before routing a payment (Promise.all — all must succeed to choose a gateway); race with timeout for payment confirmation polling | Fail-fast semantics; race + timeout pattern |
| Swiggy / Meesho | Parallel menu + pricing + stock fetches for restaurant page (Promise.all); allSettled for dashboard where some widgets can fail gracefully | Partial success with allSettled; parallel fan-out rationale |
| Adobe / Microsoft | Custom Promise.all implementation is a common SDE-II frontend round at Microsoft; async/await internals and the event loop model are tested alongside this; clean implementation in 15 minutes expected | Clean index-based results; empty array edge case; non-Promise input handling |
| SAP Labs | Sequential → parallel 3x improvement story (450ms → 160ms); race + timeout preventing slow inventory degradation of product page; CompletableFuture.allOf in Spring Boot backend | Concrete before/after story; timeout race pattern |

---

## 10. Related Topics — What to Study Next

- **Topic 285 — Implement curry, memoize, once, pipe** — these complete the "build JavaScript utility functions from scratch" interview category; `memoize` caches the result of an async function (promise caching) which builds on the Promise fundamentals here; `curry` and `pipe` test function composition — conceptually simpler but tested in the same interview context
- **Topic 282 — Implement EventEmitter / Pub-Sub** — the counter pattern in `promiseAll` (`resolvedCount++; if (count === total) resolve(results)`) is identical in structure to an event emitter that fires once when N specific events have all occurred; both are coordination mechanisms for N async operations
- **Topic 097 — Async / Await and the Event Loop** — deep understanding of how the Promise microtask queue and the event loop interact; why `await Promise.all(...)` yields control to the event loop at each `.then` boundary; why `await` in a `for` loop is sequential but `Promise.all` is parallel

---

*Part 17 · Implement Promise.all / Promise.race from Scratch · Full Stack Interview Guide · Hruday D · 2026*
