# 12. Promise.all / Promise.race / Promise.allSettled / Promise.any
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"The four Promise combinators each address a different coordination problem. `Promise.all` runs promises in parallel and resolves when ALL succeed — it short-circuits on the first rejection, making it ideal for dependent data that all needs to succeed together. `Promise.race` resolves or rejects as soon as the FIRST promise settles — ideal for timeout patterns. `Promise.allSettled` waits for ALL promises to finish regardless of outcome — ideal when you need results from every task even if some failed. `Promise.any` resolves with the FIRST success and only rejects if ALL fail — ideal for redundant requests to multiple endpoints. At SAP, I use `Promise.all` for the Fiori tile loading (all 4 API calls must succeed) and `Promise.allSettled` for batch data exports where partial success still has value — we report which items exported successfully and which failed, rather than aborting the whole batch."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The coordination problem:** Async operations rarely run in isolation. You need to:
1. Run 5 API calls in parallel and wait for ALL to succeed before rendering
2. Race a request against a timeout to avoid hanging UI
3. Run 10 batch operations and collect all results even if 3 fail
4. Try 3 CDN endpoints and use whichever responds first

Each combinator solves exactly one of these patterns. Choosing wrong costs performance (unnecessary serialisation), reliability (silent partial failures), or UX (hung screens).

---

### How They Work Internally

**Promise.all — "All must succeed"**
```
Promise.all([p1, p2, p3]):
  Creates result Promise P
  Starts counting: need 3 resolves
  
  On EACH resolve:
    results[i] = value
    resolvedCount++
    if resolvedCount === total: resolve(P) with results array
  
  On ANY reject:
    reject(P) with that error IMMEDIATELY
    (other promises still run to completion — cannot be cancelled!)
    (their results are simply ignored)

Key: input array ordering PRESERVED in output array
     Promise.all([fast, slow])
     results[0] = fast's result (regardless of which resolved first)
```

**Promise.race — "First settles wins"**
```
Promise.race([p1, p2, p3]):
  Creates result Promise P
  
  On FIRST settle (resolve OR reject):
    adopt that outcome to P
    (other promises still run — cannot cancel them)
    (only first matters)

Use case: timeout pattern
  Promise.race([
    fetchData(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
  ])
```

**Promise.allSettled — "All finish, report each"**
```
Promise.allSettled([p1, p2, p3]):
  NEVER rejects the outer Promise
  
  On each settle:
    if fulfilled: results[i] = { status: 'fulfilled', value: ... }
    if rejected:  results[i] = { status: 'rejected', reason: ... }
    settledCount++
    if settledCount === total: resolve(P) with results array

Output is always an array of SettledResult objects
TypeScript: PromiseSettledResult<T>[] — each is PromiseFulfilledResult<T> | PromiseRejectedResult
```

**Promise.any — "First SUCCESS wins"**
```
Promise.any([p1, p2, p3]):
  Creates result Promise P
  Tracks rejections: []
  
  On FIRST resolve: resolve(P) immediately
  
  On EACH reject:
    rejections.push(reason)
    if all rejected: reject(P) with AggregateError(rejections)
    
AggregateError: contains .errors array with all individual rejection reasons
ES2021 — check compatibility for older targets
```

---

### Architecture: Decision Matrix

```
ASYNC COORDINATION DECISION TREE:

Need results from MULTIPLE operations?
├── ALL must succeed to proceed?
│   └── YES → Promise.all
│       (Dashboard data load, form submission with multiple validators)
│
├── Need results even if some fail?
│   └── YES → Promise.allSettled
│       (Batch export, partial data loading, audit logging)
│
├── First ONE to succeed is enough?
│   └── YES → Promise.any
│       (Redundant CDN endpoints, nearest server selection, feature flag A/B)
│
└── First to SETTLE (succeed or fail) is enough?
    └── YES → Promise.race
        (Timeout pattern, cancel-previous-request pattern, first available)

Special cases:
- Need timeout? → Promise.race with timeout stub
- Need cancellable? → AbortController + Promise.race
- Need partial results as they arrive? → .then on each Promise separately, then await Promise.allSettled
```

---

### Data Flow — Timing Diagram

```
P1: ════════════════════════════════╗ resolves at 300ms
P2: ═══════════╗                     rejected at 150ms  
P3: ════════════════════════╗        resolves at 250ms

Promise.all([P1,P2,P3]):
    ←──────────────150ms──────────►REJECTED (P2 failed)
    
Promise.race([P1,P2,P3]):
    ←──────────────150ms──────────►REJECTED (P2 settled first)
    
Promise.allSettled([P1,P2,P3]):
    ←─────────────────────────────────────300ms──►RESOLVED
    [ {fulfilled, P1val}, {rejected, P2reason}, {fulfilled, P3val} ]
    
Promise.any([P1,P2,P3]):
    ←──────────────────────────250ms──►RESOLVED with P3's value
    (P2 rejected but P3 succeeded before P1)
```

---

### Performance Implications

**`Promise.all` concurrency is limited by return value ordering:**
```typescript
// ✅ All requests fire simultaneously
// Response order is IRRELEVANT — results array matches input array order
const [users, orders] = await Promise.all([fetchUsers(), fetchOrders()]);
// Even if fetchOrders() completes first, results[0] is always users result
```

**`Promise.race` doesn't cancel losing promises:**
```typescript
// ⚠️ Both requests are sent to the network!
// race only ignores the slower result — doesn't abort it
const result = await Promise.race([fetchFromCDN1(), fetchFromCDN2()]);
// CDN1's response arrives and is DISCARDED — but the HTTP request still completed
// Network cost incurred for BOTH requests

// ✅ With AbortController — actually cancels the losing request
async function raceWithCancel<T>(fns: ((signal: AbortSignal) => Promise<T>)[]): Promise<T> {
  const controller = new AbortController();
  return Promise.race(fns.map(fn => fn(controller.signal)))
    .finally(() => controller.abort()); // abort remaining after first resolves
}
```

**Batch size tuning for `Promise.all`:**
```typescript
// ❌ Promise.all(1000 API calls) — overwhelms server, rate limited
const allResults = await Promise.all(items.map(fetchItem));

// ✅ Batched Promise.all — server-friendly
async function batchedAll<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 10
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    results.push(...await Promise.all(batch.map(fn)));
  }
  return results;
}
```

---

### Scalability Considerations

| Scale | Consideration |
|---|---|
| Small app | `Promise.all` for parallel fetches — immediate win over sequential |
| Medium SPA (SAP Fiori) | `Promise.allSettled` for batch operations. Per-operation error reporting rather than all-or-nothing |
| High scale (Microsoft Graph API) | Rate-limited APIs: batchedAll with retry logic. `Promise.any` for multi-region failover |
| Global (CDN + edge) | `Promise.any` for geographic failover — first CDN to respond wins. `Promise.race` with AbortController for timeout-enforced SLA |

---

### Trade-offs

| Combinator | Rejects when | Use case | Risk |
|---|---|---|---|
| `Promise.all` | First rejection | All-or-nothing data loads | Silent loss of partial success if not handled |
| `Promise.race` | First rejection OR first resolution | Timeout, first-available | Losing Promises still run (network cost) |
| `Promise.allSettled` | Never | Batch operations, partial success | Must inspect each result manually |
| `Promise.any` | All rejected (AggregateError) | Redundancy, fallback | `AggregateError` is less familiar — need handling |

---

### ⚠️ Anti-Patterns & Pitfalls

- **`Promise.all` without error handling** — If any Promise rejects, the whole operation fails. Unhandled rejection in the outer Promise. Always wrap in `try/catch` or attach `.catch`.

- **`Promise.race` for "take first success"** — `Promise.race` settles with FIRST outcome, including rejections. If you only want first SUCCESS, use `Promise.any`.

- **`Promise.allSettled` results not inspected** — `allSettled` never rejects, so errors are silently wrapped in `{ status: 'rejected', reason }`. If you don't iterate results and check `status`, you silently ignore all failures.

- **Ignoring `AggregateError` from `Promise.any`** — When all promises reject, `Promise.any` throws `AggregateError`. Its `.errors` array contains all rejection reasons. Always handle this to surface the actual failure causes.

- **Using `Promise.all` when `Promise.allSettled` is needed** — If batch operations are independent (any failing doesn't invalidate others), `Promise.all` is wrong — one failure aborts all results. Use `Promise.allSettled`.

- **`Promise.race` for timeout without cleanup** — `Promise.race([fetchData(), timeout(3000)])` — after 3s timeout, the fetch is still in flight but its result is silently discarded. Add `AbortController` to actually cancel the fetch.

---

## 🏭 3. Real-World Examples

**SAP Fiori Launchpad — `Promise.all` for tile loading:**

Each SAP Fiori Launchpad homepage loads 4 resources simultaneously: user settings, role-based catalog, recent apps list, and recommendation list. `Promise.all` ensures the full tile grid renders only when all data is available — no partial renders with empty tiles. If any fails, the error state covers the full grid with a refresh option.

```typescript
// SAP Fiori pattern:
async function loadLaunchpad(userId: string): Promise<LaunchpadData> {
  const [settings, catalog, recents, recommendations] = await Promise.all([
    loadUserSettings(userId),
    loadTileCatalog(userId),
    loadRecentApps(userId),
    loadRecommendations(userId),
  ]);
  return { settings, catalog, recents, recommendations };
}

interface LaunchpadData {
  settings: unknown; catalog: unknown; recents: unknown; recommendations: unknown;
}
async function loadUserSettings(id: string): Promise<unknown> { return {}; }
async function loadTileCatalog(id: string): Promise<unknown> { return {}; }
async function loadRecentApps(id: string): Promise<unknown> { return {}; }
async function loadRecommendations(id: string): Promise<unknown> { return {}; }
```

**Microsoft 365 — `Promise.allSettled` for Graph API batch:**

Microsoft Graph API allows batch requests. The client sends 20 operations in one HTTP batch call and receives an array of results — some may fail (permissions denied, resource not found). The UI must show status per item:

```typescript
interface BatchItemResult {
  id: string;
  status: 'success' | 'error';
  data?: unknown;
  error?: string;
}

async function processBatch(operations: Operation[]): Promise<BatchItemResult[]> {
  const results = await Promise.allSettled(operations.map(op => executeOperation(op)));
  return results.map((result, i) => ({
    id: operations[i].id,
    status: result.status === 'fulfilled' ? 'success' : 'error',
    data: result.status === 'fulfilled' ? result.value : undefined,
    error: result.status === 'rejected' ? String(result.reason) : undefined,
  }));
}

interface Operation { id: string }
async function executeOperation(op: Operation): Promise<unknown> { return {}; }
```

**Cisco WebEx — `Promise.any` for ICE server fallback:**

WebEx TURN server selection: multiple TURN servers across regions. `Promise.any` fires connectivity checks to all available servers and uses the first one that responds successfully — geographic or network proximity automatically wins.

**Adobe Stock — `Promise.race` with timeout:**

Adobe Stock image search: max 3 seconds for AI-powered results. If the AI search exceeds 3s, race resolves with a fast keyword-only fallback. User sees results immediately rather than a loading spinner for 5+ seconds.

---

## 💬 4. Interview Execution

### Sample Answer (3-minute verbal)

> "The four combinators handle four coordination patterns. `Promise.all` — parallel execution, resolve when ALL succeed, reject immediately if any fails. `Promise.race` — parallel, first to settle wins (success or failure). `Promise.allSettled` — parallel, wait for ALL to finish, never rejects, gives you status per operation. `Promise.any` — parallel, first SUCCESS wins, only rejects if ALL fail via `AggregateError`.
>
> The decision rule is simple: if all operations MUST succeed, use `Promise.all`. If you need results from all regardless of failures, use `Promise.allSettled`. If you want the first success, use `Promise.any`. If you want the first to settle (for timeouts), use `Promise.race`.
>
> Common pitfall: `Promise.race` rejects if the first settler is a rejection — don't use it when you need first SUCCESS. And `Promise.allSettled` never rejects — errors are wrapped in result objects you must inspect."

---

### Likely Follow-up Questions

1. **What does `Promise.any` throw when all promises reject?** → `AggregateError` — a subclass of `Error` with an `.errors` array containing all rejection reasons in input order. `err.message` is "All promises were rejected". ES2021 — check for browser support or use a polyfill.

2. **Does `Promise.all` wait for all promises after one rejects?** → No — the returned Promise rejects immediately when ANY input rejects. The other Promises continue running to completion (they can't be stopped without `AbortController`), but their results are ignored. This creates a "fire and forget" situation for the remaining operations.

3. **How is `Promise.allSettled` different from `Promise.all` with individual `.catch`?** → `Promise.allSettled` is cleaner — it unifies both cases in a single structured result object. `Promise.all` with individual `.catch` on each input promise achieves the same behavior but requires more verbose error wrapping per operation.

4. **How would you implement `Promise.all` from scratch?** → Create a new Promise. Attach `.then` and `.catch` to each input. Track a counter of resolved promises. On each resolve, store the value at its index and check if counter equals total — if so, resolve outer Promise. On first reject, reject outer Promise immediately. (This is Topic 19 — Implement combinators from scratch.)

5. **When would you choose `Promise.race` over `Promise.any`?** → `Promise.race`: you care about the first settled outcome regardless of success/failure (timeout patterns, "did any network activity happen?"). `Promise.any`: you only care about the first success — ignore failures until all fail (CDN fallback, retry with multiple endpoints).

---

### Combinator Summary Table

| Combinator | Resolves when | Rejects when | Result type | Use case |
|---|---|---|---|---|
| `Promise.all` | ALL resolve | ANY rejects | `T[]` (ordered) | All-or-nothing parallel |
| `Promise.race` | FIRST settles | FIRST rejects | `T` | Timeout, first available |
| `Promise.allSettled` | ALL settle | Never | `PromiseSettledResult<T>[]` | Batch with partial success |
| `Promise.any` | FIRST resolves | ALL reject | `T` | First success, redundancy |

---

### How to Signal Senior Thinking

> "In production, I never use `Promise.race` for timeout patterns without pairing it with `AbortController` — otherwise the losing request still completes, consumes server resources, and the response is just discarded silently. Real timeout patterns abort the underlying operation. And for `Promise.allSettled`, I always write a utility to separate fulfilled vs rejected results into typed arrays rather than scattering status checks throughout business logic."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: All four combinators with explicit output annotation
// ============================================================

const fast = Promise.resolve('fast');
const slow = new Promise<string>(r => setTimeout(() => r('slow'), 100));
const failing = Promise.reject<string>(new Error('fail'));

// Promise.all — fails if any rejects
Promise.all([fast, slow])
  .then(([a, b]) => console.log('all:', a, b))
  .catch(err => console.error('all failed:', err.message));

// Promise.race — first settler wins
Promise.race([fast, slow, failing])
  .then(v => console.log('race won:', v)) // 'fast' wins (synchronously resolved)
  .catch(err => console.error('race rejected:', err.message));

// Promise.allSettled — always resolves
Promise.allSettled([fast, slow, failing])
  .then(results => {
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') console.log(`settled[${i}] OK:`, r.value);
      else console.log(`settled[${i}] ERR:`, r.reason?.message);
    });
  });

// Promise.any — first success wins
Promise.any([failing, slow])
  .then(v => console.log('any first success:', v)) // 'slow' (failing is rejected)
  .catch((err: AggregateError) => console.error('all failed:', err.errors));

// ============================================================
// DEMO 2: Production timeout with AbortController (Cisco/Adobe pattern)
// ============================================================

async function fetchWithTimeout<T>(
  url: string,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId); // always clear timeout regardless of outcome
  }
}

// ============================================================
// DEMO 3: Redundant request with Promise.any (CDN fallback)
// ============================================================

async function fetchFromCDN(assetPath: string): Promise<string> {
  const CDN_ENDPOINTS = [
    'https://cdn1.example.com',
    'https://cdn2.example.com',
    'https://cdn3.example.com',
  ];

  try {
    // First CDN to respond wins — geographic/network proximity
    const url = await Promise.any(
      CDN_ENDPOINTS.map(cdn => fetchWithTimeout<string>(`${cdn}/${assetPath}`, 2000))
    );
    return url;
  } catch (err) {
    if (err instanceof AggregateError) {
      throw new Error(`All CDNs failed for ${assetPath}: ${err.errors.map((e: Error) => e.message).join(', ')}`);
    }
    throw err;
  }
}

// ============================================================
// DEMO 4: allSettled + typed result separation utility
// (SAP batch export pattern)
// ============================================================

interface BatchResult<T> {
  succeeded: { index: number; value: T }[];
  failed: { index: number; reason: unknown }[];
}

async function runBatchWithReport<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>
): Promise<BatchResult<R>> {
  const results = await Promise.allSettled(items.map(operation));
  const succeeded: { index: number; value: R }[] = [];
  const failed: { index: number; reason: unknown }[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      succeeded.push({ index, value: result.value });
    } else {
      failed.push({ index, reason: result.reason });
    }
  });

  console.log(`Batch: ${succeeded.length} succeeded, ${failed.length} failed`);
  return { succeeded, failed };
}
```

**Interview vs Production difference:**
- **Interview:** Demo 1 (prediction of all four outputs) and explaining the combinator table is the core interview deliverable. Know what each outputs when some succeed and some fail.
- **Production:** Demo 2 (`fetchWithTimeout` with `AbortController`) and Demo 4 (`runBatchWithReport`) are reusable production utilities. Every serious frontend codebase should have these or equivalent patterns.

---

## 🧠 6. Memory Aid

**Mental Model — racing/waiting scenarios:**
- `Promise.all` = a group project where EVERYONE must submit. One person missing → whole group fails.
- `Promise.race` = a footrace — whoever crosses the finish line first (win OR DNF) ends the race.
- `Promise.allSettled` = a survey — wait for everyone to respond, record each answer regardless of what they said.
- `Promise.any` = a job posting — first qualified applicant hired; only fails if nobody applies.

**If you go blank:** *"all = ALL must succeed OR reject immediately. race = FIRST settler wins. allSettled = wait for ALL, never rejects, gives status per item. any = FIRST success wins, rejects only if ALL fail with AggregateError."*

**Mnemonic:** **ARRA** — **A**ll (must all win), **R**ace (first to cross), **R**eport all (allSettled), **A**ny success (Promise.any).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** `Promise.all` for parallel dashboard loads reduces time-to-interactive by running independent requests concurrently. Wrong choice (sequential await) causes waterfall loading — each request adds its full latency.
→ **Performance:** `Promise.allSettled` for batch operations enables partial success — export 97/100 items and report the 3 failures rather than aborting the full batch on first failure.
→ **Business:** Redundant endpoint patterns with `Promise.any` are standard at CDN/global scale — Adobe, Microsoft, Salesforce all use nearest-endpoint selection. Knowing the correct combinator shows architectural thinking beyond just making code work.

**How it works (3 sentences):**
The four Promise combinators each solve a distinct coordination pattern: `Promise.all` resolves when all inputs resolve (rejects immediately on first failure), `Promise.race` resolves/rejects with the first settled Promise, `Promise.allSettled` resolves after all inputs settle with a status object for each (never rejects), and `Promise.any` resolves with the first success or rejects with `AggregateError` if all fail. All four start all Promises simultaneously — parallelism is inherent to all of them — and none can cancel the losing Promises once started without `AbortController`. The choice between them depends on whether partial success has value, whether failures matter, and whether first-one-wins is the goal.

**Company relevance:**
- **Microsoft:** Azure SDK uses `Promise.allSettled` for batch Graph API calls. Microsoft's TypeScript guidelines document typed result extraction utilities for `allSettled` results — equivalent to Demo 4 above.
- **Adobe:** Adobe's Creative Cloud desktop uses `Promise.any` for plugin marketplace CDN selection. Adobe Stock uses `Promise.race` with timeout for AI search fallback to keyword search.
- **Salesforce:** LWC components use `Promise.all` for wire adapter coordination — multiple `@wire` decorated properties that all need to be ready before rendering the main view. Salesforce's LWC testing utilities provide helpers for all four combinators.
- **Cisco:** WebEx backend (from the client's perspective) uses `Promise.any` for TURN server selection and `Promise.allSettled` to gather ICE candidates from multiple sources before selecting the optimal connection path.

---
✅ **Topic 12/486 complete.**
→ **Continuing to Topic 13: Generators and Iterators**
