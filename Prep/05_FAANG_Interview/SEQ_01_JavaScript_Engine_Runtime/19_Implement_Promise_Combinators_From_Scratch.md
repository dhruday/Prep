# 19. Implement Promise.all / Promise.race from Scratch
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"Implementing Promise combinators from scratch demonstrates whether you truly understand Promise internals — the microtask queue, Promise state machine, and how multiple promises interact. The four combinators are: `Promise.all` (all must resolve; first rejection rejects all), `Promise.race` (first settled wins — resolve or reject), `Promise.allSettled` (all settle regardless of outcome), and `Promise.any` (first resolution wins; throws AggregateError if all reject). The critical implementation detail for `Promise.all` is tracking results by **index** not by completion order — `results[i] = value` not `results.push(value)` — because promises resolve in arbitrary order but the results array must mirror the input array order. Every combinator must wrap each input with `Promise.resolve()` to handle non-Promise inputs gracefully. At SAP, I used `Promise.all` to load 8 tile permission checks in parallel — reducing sequential 400ms to parallel 50ms — and built a custom `promiseAllWithTimeout` when the default had no cancellation safety valve."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

```
Problem: You have N async operations and need different coordination semantics:

  Promise.all([a, b, c]):
    → All must succeed. One failure → immediate rejection. 
    → Use: parallel API calls where ALL results are needed.

  Promise.race([a, b, c]):
    → First to settle (resolve OR reject) wins.
    → Use: timeout patterns, primary vs fallback resource.

  Promise.allSettled([a, b, c]):
    → Wait for all, regardless of outcome. Returns status objects.
    → Use: batch operations where you need results of all, including failures.

  Promise.any([a, b, c]):
    → First to RESOLVE wins. Only fails if ALL reject.
    → Use: try multiple endpoints, use first success.
```

---

### Algorithm Deep Dive: Promise.all

```
myPromiseAll(promises):
  
  return new Promise((resolve, reject) => {
    if promises is empty → resolve([]) immediately
    
    results = new Array(promises.length)  // pre-sized, preserves order
    pending = promises.length             // counter: how many still running
    
    for i = 0 to promises.length-1:
      Promise.resolve(promises[i])        // wrap non-Promises
        .then(value => {
          results[i] = value              // ← store at INDEX not push
          pending--
          if pending === 0:              // all resolved
            resolve(results)
        })
        .catch(err => {
          reject(err)                    // first rejection wins; others ignored
        })
  })
```

**Why `results[i] = value` not `results.push(value)`?**

```
Input: [fast(→'A'), slow(→'B'), medium(→'C')]
Completion order: fast(0ms), medium(200ms), slow(400ms) → 'A', 'C', 'B'

With push:    ['A', 'C', 'B'] ← wrong order
With index:   results[0]='A', results[2]='C', results[1]='B' → ['A','B','C'] ✅
```

---

### Algorithm Deep Dive: Promise.race

```
myPromiseRace(promises):
  
  return new Promise((resolve, reject) => {
    if promises is empty → Promise that NEVER settles (per spec)
                          // no reject/resolve called on empty array
    
    for each promise in promises:
      Promise.resolve(promise)        // wrap non-Promises
        .then(resolve)                // first resolve wins
        .catch(reject)               // first reject wins
    
    // Once one settles, resolve/reject is called.
    // Subsequent calls to resolve/reject on an already-settled Promise are ignored by spec.
  })
```

**The Promise rejection/resolve idempotency rule:** Once a Promise is settled (resolved or rejected), calling `resolve()` or `reject()` again has no effect. This is why race is trivially implemented — just attach `then(resolve, reject)` to all promises; only the first settlement lands.

---

### Algorithm Deep Dive: Promise.allSettled

```
myPromiseAllSettled(promises):
  
  return new Promise((resolve) => {  // never rejects
    if promises is empty → resolve([]) immediately
    
    results = new Array(promises.length)
    pending = promises.length
    
    for i = 0 to promises.length-1:
      Promise.resolve(promises[i])
        .then(value => {
          results[i] = { status: 'fulfilled', value }    // ← shape matters
          pending--
          if pending === 0: resolve(results)
        })
        .catch(reason => {
          results[i] = { status: 'rejected', reason }   // ← shape matters
          pending--
          if pending === 0: resolve(results)
        })
  })
```

---

### Algorithm Deep Dive: Promise.any

```
myPromiseAny(promises):
  
  return new Promise((resolve, reject) => {
    if promises is empty → reject(new AggregateError([], 'All promises were rejected'))
    
    errors = new Array(promises.length)
    pending = promises.length
    
    for i = 0 to promises.length-1:
      Promise.resolve(promises[i])
        .then(resolve)           // first RESOLUTION wins
        .catch(err => {
          errors[i] = err        // ← store at INDEX, preserve order
          pending--
          if pending === 0:     // ALL rejected
            reject(new AggregateError(errors, 'All promises were rejected'))
        })
  })
```

**`AggregateError`** (ES2021): A single error that wraps multiple errors. `new AggregateError([err1, err2], 'message')`. The `errors` property holds the array.

---

### The Empty Array Edge Cases (Interview Gotcha)

```
Promise.all([])      → resolves with []  (immediate)
Promise.race([])     → NEVER settles     (spec says pending forever)
Promise.allSettled([]) → resolves with [] (immediate)
Promise.any([])      → rejects with AggregateError (immediate)

Why does race([]) never settle?
  Spec: "If the iterable argument is empty, Promise.race returns a forever-pending promise"
  Rationale: there are no promises to race — none can win — so the race never ends
```

---

### Architecture & Component Boundaries

```
Where combinators live in a frontend app:

  Promise.all:
    → Parallel data loading: load user + permissions + preferences together
    → Critical path optimization: all required data in one network round trip
    → SAP: 8 tile metadata fetches in parallel (400ms → 50ms)

  Promise.race:
    → Timeout implementation: race(fetch(url), timeout(3000))
    → Primary vs fallback: race(primaryCDN, fallbackCDN)
    → Connection test: race(server1, server2, server3) for WebRTC TURN selection

  Promise.allSettled:
    → Batch operations with partial failure tolerance
    → Sending analytics events where some may fail without blocking the UX
    → Bulk user operations: invite 50 users, some may fail, collect all results

  Promise.any:
    → Redundant requests: first successful source wins
    → Feature detection + API version negotiation
    → Cisco: multiple TURN servers, use whichever responds first
```

---

### Performance Implications

**Promise.all vs sequential awaits:**

```typescript
// Sequential (WRONG — 3× slower):
const a = await fetch('/api/a'); // wait 100ms
const b = await fetch('/api/b'); // wait 100ms
const c = await fetch('/api/c'); // wait 100ms
// Total: ~300ms

// Parallel (CORRECT — Promise.all):
const [a, b, c] = await Promise.all([
  fetch('/api/a'),
  fetch('/api/b'),
  fetch('/api/c'),
]); // Total: ~100ms (all in flight simultaneously)
```

**The #1 async/await anti-pattern** seen in production code: `await` inside a `for` loop or sequential destructuring when the calls are independent.

---

### Trade-offs

| Combinator | Failure behavior | Empty array | Use case |
|---|---|---|---|
| `all` | First rejection rejects all | Resolves `[]` | All results needed; any failure is fatal |
| `race` | First settlement (any) wins | Never settles | Timeout; fastest wins |
| `allSettled` | Never rejects | Resolves `[]` | Collect all; partial failure ok |
| `any` | Only fails if ALL fail | Rejects AggregateError | First success; redundancy |

---

### ⚠️ Anti-Patterns & Pitfalls

- **Using `Array.push` instead of `results[i] = value` in Promise.all:** The results array must mirror the input array by index, not by completion order. If fast promises push first, you lose the original order.

- **Forgetting to wrap with `Promise.resolve()`:** If the input array contains non-Promise values (numbers, strings, already-resolved values), accessing `.then()` directly will throw `TypeError: not a function`. `Promise.resolve(x)` converts any value to a Promise — thenables, non-thenables, and already-resolved Promises.

- **Not handling the empty array edge case:** `Promise.all([])` must resolve with `[]` immediately. Without the check, `pending` starts at 0 and the Promise never resolves (it would need `pending === 0` check but that happens in the loop which never runs).

- **Promise.race with empty array — expecting immediate rejection:** `Promise.race([])` per-spec never settles. Don't add a `resolve([])` fallback thinking you're being safe — that deviates from spec and could surprise callers.

- **Forgetting AggregateError in Promise.any:** The rejection of `Promise.any` is NOT a plain Error — it's an `AggregateError` with an `.errors` array containing each individual rejection reason, preserving order.

---

## 🏭 3. Real-World Examples

**SAP Fiori — parallel tile permission loading:**

Fiori Launchpad renders 50-200 tiles on the home page. Each tile requires an authorization check from the backend. Original implementation: sequential loop with `await` inside — 200 × 2ms = 400ms blocking. Refactored to `Promise.all(tileIds.map(checkPermission))` — all 200 checks fire simultaneously; total time = single request round trip (~50ms). A custom `promiseAllWithTimeout` variant rejected after 5 seconds if backend was slow, showing cached permissions instead.

**Adobe Stock — image metadata batch loading:**

Adobe Stock loads image thumbnails and metadata in parallel using `Promise.allSettled` — some metadata requests fail (deleted images, restricted content) but the page should still render all successful results. `allSettled` gives both successes and failures in one result array, allowing the UI to render available images while showing "unavailable" placeholders for failed ones.

**Cisco WebEx — TURN server selection:**

WebEx selects the fastest available TURN server using `Promise.race`: fire connectivity tests to all servers simultaneously, use the first one that responds. Any failure is ignored because `race` settles on the first success. If all fail, a timeout fallback triggers.

**Microsoft — Graph API batch requests:**

Microsoft Graph API supports batch requests (multiple operations in one HTTP call). The frontend uses `Promise.all` to assemble all pending operations, fires a single batch, then uses `Promise.allSettled` to process results — because individual operations in a batch can fail independently, `allSettled` correctly collects both successes and failures.

**How it evolves with scale:**
- **Small scale:** `Promise.all` for 2-3 dependent API calls
- **Medium scale:** `Promise.allSettled` for batch operations with partial failure tolerance; `Promise.race` for timeout safety
- **Large scale:** Custom combinators with retry, timeout, concurrency limiting (only N promises in flight at a time — Promise.all fires ALL at once which can overwhelm backends)

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "All four combinators follow the same pattern: wrap in a new Promise, iterate the input array, wrap each item in `Promise.resolve()` to handle non-Promises, and coordinate resolution via a counter and results array. The key detail that separates a correct `Promise.all` from an incorrect one: store results at `results[i] = value` using the loop index, not `results.push(value)`, because promises resolve in non-deterministic order but the output array must match input array order.

> The empty array edge cases are another gotcha: `all([])` and `allSettled([])` resolve with `[]` immediately, but `race([])` never settles per spec, and `any([])` rejects with `AggregateError` immediately.

> Production extension I'm happy to implement: `promiseAllWithTimeout` — `Promise.race([Promise.all(promises), timeout(ms)])` — so a slow single promise doesn't hang the entire group indefinitely."

---

### Likely Follow-up Questions

1. **Why `results[i]` not `results.push(value)` in Promise.all?** → Promises resolve in arbitrary order. If the second promise resolves before the first, `push` puts it at index 0 instead of index 1 — the results array doesn't match the input array order. Storing at index `i` preserves the correspondence between input position and result position.

2. **What does `Promise.race([])` return?** → Per the spec, it returns a Promise that is forever pending. No resolve or reject is called because the loop body (where `resolve`/`reject` are invoked) never executes. This is counterintuitive but correct per spec.

3. **How do you implement a timeout with Promise combinators?** → `Promise.race([operation, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))])`. The race settles with the operation result if it completes first, or with a timeout error if the timer fires first.

4. **What is AggregateError and when is it used?** → `AggregateError` (ES2021) is a special Error subclass that wraps multiple errors in its `errors` array property. `Promise.any` throws an `AggregateError` containing each individual rejection reason when all input promises reject. It's also used in `Promise.allSettled` by some custom implementations to batch-report failed operations.

5. **How would you implement a concurrency-limited Promise.all (only N at a time)?** → Instead of firing all promises simultaneously, maintain a pool: fire the first N, and for each that settles, fire the next one. Implementation: `p-limit` library, or manually with an index pointer and a pool of `capacity` running promises, each calling `next()` on completion.

---

### vs Alternatives

| Combinator | Use case | Failure semantic |
|---|---|---|
| `Promise.all` | All succeed or fail fast | First rejection rejects all |
| `Promise.allSettled` | Collect all, tolerate failures | Never rejects |
| `Promise.race` | First to settle wins | First rejection loses race |
| `Promise.any` | First to succeed wins | All reject → AggregateError |

---

### How to Signal Senior Thinking

> "The production gap with `Promise.all` is that it fires ALL promises simultaneously with no concurrency limit. If you have 200 API calls, `Promise.all` makes 200 requests simultaneously — most backends will rate-limit or fail under that load. The production solution is a concurrency-limited version: `p-limit(10)` or a custom pool that keeps exactly 10 promises in flight at any time. In the SAP tile permission scenario, we fire all 200 simultaneously because they hit the same backend endpoint which is designed to handle batch load — but for external APIs with rate limits, we'd use p-limit(5) to stay within service quotas."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: myPromiseAll — store by INDEX, handle empty array
// ============================================================

function myPromiseAll<T>(promises: Array<T | Promise<T>>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    // Edge case: empty array → resolve immediately
    if (promises.length === 0) {
      resolve([]);
      return;
    }

    const results = new Array<T>(promises.length);
    let pending = promises.length;

    promises.forEach((p, i) => {
      Promise.resolve(p) // wrap non-Promises (handles thenables + raw values)
        .then((value) => {
          results[i] = value; // ← INDEX not push — order preservation
          pending--;
          if (pending === 0) {
            resolve(results);
          }
        })
        .catch(reject); // first rejection rejects the whole Promise.all
    });
  });
}

// ============================================================
// DEMO 2: myPromiseRace — first settlement wins
// ============================================================

function myPromiseRace<T>(promises: Array<T | Promise<T>>): Promise<T> {
  return new Promise((resolve, reject) => {
    // Empty array → never settles (per spec — no resolve/reject called)
    promises.forEach((p) => {
      Promise.resolve(p)
        .then(resolve)  // first resolve lands; subsequent calls no-op on settled Promise
        .catch(reject); // first rejection lands; same no-op behavior
    });
  });
}

// ============================================================
// DEMO 3: myPromiseAllSettled — never rejects; always fulfills with status objects
// ============================================================

type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

function myPromiseAllSettled<T>(
  promises: Array<T | Promise<T>>
): Promise<SettledResult<T>[]> {
  return new Promise((resolve) => {
    if (promises.length === 0) {
      resolve([]);
      return;
    }

    const results = new Array<SettledResult<T>>(promises.length);
    let pending = promises.length;

    const checkDone = () => {
      if (--pending === 0) resolve(results);
    };

    promises.forEach((p, i) => {
      Promise.resolve(p)
        .then((value) => {
          results[i] = { status: 'fulfilled', value };
          checkDone();
        })
        .catch((reason) => {
          results[i] = { status: 'rejected', reason };
          checkDone();
        });
    });
  });
}

// ============================================================
// DEMO 4: myPromiseAny — first RESOLUTION wins; AggregateError if all reject
// ============================================================

function myPromiseAny<T>(promises: Array<T | Promise<T>>): Promise<T> {
  return new Promise((resolve, reject) => {
    // Empty array → immediately reject with AggregateError
    if (promises.length === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }

    const errors = new Array<unknown>(promises.length);
    let rejectedCount = 0;

    promises.forEach((p, i) => {
      Promise.resolve(p)
        .then(resolve) // first resolution wins
        .catch((err) => {
          errors[i] = err; // ← INDEX not push — preserve order of errors
          rejectedCount++;
          if (rejectedCount === promises.length) {
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        });
    });
  });
}

// ============================================================
// DEMO 5: Production extensions
// ============================================================

// promiseAllWithTimeout — SAP tile loading pattern:
function promiseAllWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number
): Promise<T[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([myPromiseAll(promises), timeout]);
}

// promiseAllSettledBatch — concurrency-limited allSettled:
async function promiseAllSettledBatch<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  concurrency = 5
): Promise<SettledResult<unknown>[]> {
  const results: SettledResult<unknown>[] = new Array(items.length);
  let index = 0;

  async function runNext(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    try {
      results[i] = { status: 'fulfilled', value: await fn(items[i]) };
    } catch (reason) {
      results[i] = { status: 'rejected', reason };
    }
    await runNext(); // replace self with next task
  }

  // Start 'concurrency' number of workers
  await Promise.all(Array.from({ length: concurrency }, runNext));
  return results;
}

// ============================================================
// DEMO 6: Verify behavior
// ============================================================

// Test all:
myPromiseAll([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3),
]).then(console.log); // [1, 2, 3] ✅

// Test race:
myPromiseRace([
  new Promise(r => setTimeout(() => r('slow'), 200)),
  new Promise(r => setTimeout(() => r('fast'), 50)),
]).then(console.log); // 'fast' ✅

// Test allSettled:
myPromiseAllSettled([
  Promise.resolve('ok'),
  Promise.reject(new Error('fail')),
]).then(console.log);
// [{ status:'fulfilled', value:'ok' }, { status:'rejected', reason: Error }] ✅

// Test any:
myPromiseAny([
  Promise.reject(new Error('e1')),
  Promise.resolve('success'),
  Promise.reject(new Error('e3')),
]).then(console.log); // 'success' ✅
```

**Interview vs Production difference:**
- **Interview:** Demo 1 (`myPromiseAll`) with the index-vs-push explanation + empty array check. Then Demo 2 (`myPromiseRace`). That's ~15 minutes of solid implementation. If time permits: Demo 3 (`allSettled`) to show you know the `{ status, value/reason }` shape.
- **Production:** Demo 5 (timeout + concurrency-limited batch) shows the real production thinking. No real codebase uses hand-rolled Promise combinators — you'd use `p-limit`, `p-settle`, or Bluebird's `Promise.map({ concurrency: 5 })`.

---

## 🧠 6. Memory Aid

**Mental Model:**
- `all` = a synchronized swim team — everyone must finish (any one drowning aborts the show — use index not push for position-correct results)
- `race` = Formula 1 start — first car to cross the finish line (regardless of which it is) wins
- `allSettled` = send everyone to the race, collect race reports from all of them (win or DNF) — never abort
- `any` = first person to raise their hand gets called on — only fail if nobody raises their hand

**If you go blank:** *"all: results[i]=value, pending counter, reject on first catch. race: then(resolve)/catch(reject) on each, first wins. allSettled: {status, value/reason} in results[i], never reject. any: then(resolve), errors[i] on catch, AggregateError when all rejected. ALL: wrap with Promise.resolve(p). ALL: check empty array first."*

**Mnemonic:** **I-WRAP-EMPTY** — **I**ndex not push (all/any), **W**rap with Promise.resolve(), **R**ace never settles on empty, **A**ggregateError for any, **P**ending counter for all, **E**mpty array = immediate resolve for all/allSettled, **M**irror input order, **P**ending decrements on every settlement, **Y**ield (resolve) when pending reaches 0.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** `Promise.all` makes parallel API calls — converting sequential 400ms to parallel 50ms at SAP Fiori. `Promise.race` enables timeout patterns that prevent the UI from hanging indefinitely on slow network. `Promise.allSettled` enables resilient batch operations that show partial results instead of complete failure pages.
→ **Performance:** Parallel promise execution is the most impactful async performance optimization available. Sequential `await` in a loop is O(n × latency); `Promise.all` is O(max(latency)) — for 10 independent calls at 100ms each, the difference is 1000ms vs 100ms.
→ **Business:** Every JavaScript interview at senior level expects you to implement `Promise.all` correctly. The `results[i]` vs `results.push` distinction and the empty array edge cases separate candidates who understand Promise internals from those who memorized the API. At SAP, parallel loading of tile data directly reduced time-to-interactive — a measurable business metric for the Fiori Launchpad team.

**How it works (3 sentences):**
All four combinators return a `new Promise` that coordinates multiple input promises: they iterate the input array wrapping each item in `Promise.resolve()` (to handle non-Promise values), then attach `.then/.catch` handlers that update shared state (a results array keyed by index and a pending counter or error counter) and call the outer `resolve` or `reject` when the coordination condition is met. The critical design details are: `Promise.all` and `Promise.any` both store results/errors at the loop index `i` (not via `push`) to preserve correspondence with the input array order regardless of resolution order, and both check for the empty array case upfront because the pending-counter exit condition (`pending === 0`) requires the loop to have run at least once. `Promise.race`'s implementation is the simplest — attach `then(resolve, reject)` to every input promise, relying on the Promise spec's guarantee that calling `resolve`/`reject` on an already-settled Promise is a no-op, so only the first settlement ever takes effect.

**Company relevance:**
- **Microsoft:** Microsoft Graph API SDK uses `Promise.all` for batching multiple Graph calls. Azure SDK uses Promise combinators for parallel resource operations. Microsoft's TypeScript codebase uses async/await patterns that interviewers expect you to translate to Promise internals.
- **Adobe:** Adobe Stock uses `Promise.allSettled` for image batch loading — partial failures show placeholders rather than crashing the gallery. Firefly uses `Promise.race` for timeout on AI generation requests.
- **Salesforce:** Salesforce LWC uses `Promise.all` for parallel Apex method calls (multiple wire adapter results). Salesforce's bulk API patterns use allSettled-style error collection to report per-record success/failure.
- **Cisco:** WebEx uses `Promise.race` for TURN server selection (first to respond wins). Cisco's collaboration APIs use `Promise.allSettled` to fire updates to multiple presence services, tolerating partial failures.

---
✅ **Topic 19/486 complete.**
→ **Continuing to Topic 20: Implement EventEmitter / Pub-Sub**
