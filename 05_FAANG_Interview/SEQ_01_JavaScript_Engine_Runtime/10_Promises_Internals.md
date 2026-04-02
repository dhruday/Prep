# 10. Promises Internals — Microtask Queue, .then Chaining
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"A Promise is a state machine — it starts Pending and transitions to either Fulfilled or Rejected, exactly once and irreversibly. Internally, V8 stores the resolved value and a list of reaction records (`.then`/`.catch` callbacks). When a Promise settles, its reactions are scheduled as microtasks — not macrotasks — which means they run immediately after the currently executing synchronous code, before any timer or I/O callback. This is critical for predictable ordering. `.then` always returns a new Promise, allowing chaining — each `.then` scheduled as a fresh microtask with the prior result. At SAP, understanding this deeply let me fix a subtle data-consistency bug where two independent API calls' `.then` handlers assumed a specific ordering — they were actually interleaved incorrectly because one ran in a timer and one ran in a microtask. Once I understood the queue mechanics, the fix was a single `Promise.all` call."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**Problem Promises solve:** Before Promises, asynchronous code used callbacks — the pyramid of doom (callback hell). Callbacks have 4 fundamental problems:
1. **Inversion of control** — you hand your continuation (next steps) to a third party to call. If they call it twice, not at all, or synchronously — you have no recourse.
2. **Trust issues** — no guarantee about when, how many times, or in what order your callback fires.
3. **Error propagation** — no standard mechanism. Errors silently swallowed.
4. **Composability** — hard to run tasks in parallel and coordinate results.

Promises solve all four: they call your continuation (`.then`) exactly once, asynchronously, after settling, with reliable error propagation via `.catch`.

---

### How It Works Internally

**Promise State Machine:**
```
         ┌──────────────────────────────┐
         │         PENDING              │
         │  Initial state. Value: none  │
         │  Reactions: [] (empty list)  │
         └──────────┬──────┬────────────┘
                    │      │
              resolve()  reject()
                    │      │
         ┌──────────▼──┐  ┌▼──────────────┐
         │  FULFILLED  │  │   REJECTED     │
         │  Value: X   │  │  Reason: err  │
         │  Reactions  │  │  Reactions    │
         │  scheduled  │  │  scheduled    │
         │  (microtask)│  │  (microtask)  │
         └─────────────┘  └───────────────┘

RULES:
- State transition is IRREVERSIBLE — once settled, always settled
- Value/reason is IMMUTABLE — same value delivered to all `.then`s
- `.then()` called on already-settled Promise: reaction scheduled immediately (next microtask)
- `.then()` called on pending Promise: reaction added to internal reactions list, scheduled when settled
```

**`.then` Internal Mechanics:**
```
p.then(onFulfilled, onRejected) creates a new Promise p2.
When p settles:
  1. A PromiseReaction record is created: { promise: p2, handler: onFulfilled/onRejected }
  2. PromiseReaction is pushed to the MicrotaskQueue
  3. After current synchronous code completes, event loop runs MicrotaskQueue
  4. PromiseReaction runs:
     a. If handler returns a plain value V: p2 resolves with V
     b. If handler returns a Promise Q: p2 adopts Q's state (thenables resolved recursively)
     c. If handler throws err: p2 rejects with err
```

**Thenable Resolution — The "assimilation" algorithm:**
When you `return aPromise` from a `.then` handler, JavaScript doesn't blindly adopt that Promise. It calls the **PromiseResolutionProcedure** (spec: `[[Resolve]]`):
1. If returned value is the new Promise itself → `TypeError` (prevent circular)
2. If returned value has a `.then` method (a "thenable") → call `.then(resolve, reject)` to assimilate its state
3. If plain value → resolve immediately

This enables interoperability with third-party Promise libraries and thenable objects.

**Key insight — Why `.then` is always async even when resolved:**
```typescript
const p = Promise.resolve(42); // already resolved

p.then(v => console.log('then:', v)); // callback NOT called immediately
console.log('after .then()');         // this runs FIRST

// Output: "after .then()"  →  "then: 42"
```

Promise handlers are ALWAYS asynchronous — the spec mandates they are never called synchronously, even if the Promise is already settled. This ensures consistent behaviour regardless of whether the Promise was pre-resolved or async.

---

### Architecture & Promise Chaining Data Flow

```
Promise Chain execution trace:

fetch('/api/user')                    // → Promise<Response>    [P1]
  .then(res => res.json())            // res.json() → Promise   [P2]
  .then(data => transform(data))      // returns value          [P3]
  .then(result => setState(result))   // returns undefined      [P4]
  .catch(err => logError(err));       // attached to P4's rejection chain

Execution timeline:
──────────────────────────────────────────────────────────────────►
Sync: fetch() called → P1 created (Pending) → P2,P3,P4 created (Pending)
     Network request dispatched (I/O, not blocking JS thread)

[Time passes → I/O completes → MacroTask pushed to MacroTask Queue]

Tick boundary:
  MacroTask: "Network response received" runs
    → Calls resolve(Response) on P1
    → P1 transitions to Fulfilled
    → P2's onFulfilled reaction scheduled → MicrotaskQueue: [P2-onFulfilled]

MicrotaskQueue drains:
  → P2-onFulfilled runs: res.json() called → returns Promise Q (reading body)
    → P2 must adopt Q's state → "thenable assimilation" of Q
    → P2 is now waiting for Q (still Pending)
    → MicrotaskQueue: []

[Time passes → res.json() body read completes → Q resolves with parsed JSON]

Next MacroTask boundary (or next microtask scheduling):
  → Q resolves → P2's [[Resolve]] called → P2 resolves with data object
  → P3's onFulfilled reaction scheduled → MicrotaskQueue: [P3-onFulfilled]

MicrotaskQueue drains:
  → P3-onFulfilled runs: transform(data) → returns transformedResult
    → P4's onFulfilled reaction scheduled → MicrotaskQueue: [P4-onFulfilled]
  → P4-onFulfilled runs: setState(result) → returns undefined
    → .catch reaction NOT triggered (no rejection)
```

---

### Performance Implications

**Microtask queue depth matters:**

Deeply chained `.then` chains create a large microtask queue before any rendering can occur. If you have 100 `.then` chained calls, all 100 microtasks run before the browser renders the next frame. This starves rendering:

```typescript
// ❌ 100 unnecessary microtask hops
let p = Promise.resolve(data);
for (let i = 0; i < 100; i++) p = p.then(v => process(v)); // 100 microtasks before render
await p;

// ✅ Single synchronous loop — 0 extra microtasks
for (const item of data) process(item);
// OR batch with a single await
await Promise.resolve(); // yield once to microtask queue
for (const item of data) process(item);
```

**`Promise.resolve()` as a "yield to queue" mechanism:**
```typescript
// React Scheduler uses this pattern — give browser a chance between chunks
async function processInChunks(items: unknown[]): Promise<void> {
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    processChunk(chunk);
    await Promise.resolve(); // yields to microtask queue; other pending microtasks can run
    // (does NOT yield to render or macrotasks — use scheduler.yield() or setTimeout for that)
  }
}

const CHUNK_SIZE = 50;
function processChunk(chunk: unknown[]): void { /* ... */ }
```

---

### Scalability Considerations

| Scale | Promise Concerns |
|---|---|
| Simple app | Unhandled rejection → silent failure. Enable `unhandledrejection` listener globally |
| Complex SPA | Promise memory: each in-flight Promise holds its reaction list. Thousands of promises in flight = memory pressure |
| Data pipeline (Adobe/Salesforce) | Promise chaining overhead: each `.then` creates a new Promise object, allocates reaction record. For high-frequency pipelines, consider Observables (RxJS) for lazy, cancellable streams |
| SDK / Library | Promise interoperability: always return native Promises. Never mix library Promises and native — thenable assimilation adds overhead and can cause unexpected ordering |

---

### Trade-offs

| Approach | Trade-off |
|---|---|
| `.then` chaining | vs `async/await` — same semantics, different syntax. `async/await` compiles to `.then` chains. Prefer `async/await` for readability unless building utilities |
| `Promise.all` | vs sequential `.then` chains — `Promise.all` runs in parallel; sequential chains serialize. Use `Promise.all` for independent operations |
| Promise | vs `Observable` (RxJS) — Promises are eager (execute immediately), single-value, non-cancellable. Observables are lazy, multi-value, cancellable. Use Observable for streams, polling, user events |

---

### ⚠️ Anti-Patterns & Pitfalls

- **Forgetting to return from `.then`** — `p.then(x => { doSomething(x); })` — the implicit return is `undefined`, so p2 resolves with `undefined`. The chain proceeds immediately, not waiting for `doSomething` if it's async. Must return the Promise/value.

- **Promise constructor anti-pattern** — `new Promise(resolve => resolve(asyncFn()))` — unnecessary wrapping of an already-returning-a-Promise function. Just chain onto the existing Promise.

- **Unhandled promise rejection** — Promise `.catch` not attached. In modern Node.js and Chrome, this emits a warning/crash. Always add `.catch` or use `try/catch` with `async/await`.

- **Duplicate resolution ignored silently** — If you call `resolve()` twice in a Promise constructor, only the first call has effect. No error thrown. Silent correctness issue if constructor logic is complex.

- **Promise inside a forEach** — `items.forEach(item => asyncProcess(item))` — `forEach` doesn't `await` the returned Promise. All promises start in parallel but `forEach` returns before any complete. Use `Promise.all(items.map(...))` or a `for...of` loop with `await`.

---

## 🏭 3. Real-World Examples

**SAP BI Launchpad — ordering bug from mixing microtask and macrotask:**

A team had two API calls: `fetchUserConfig()` (XHR with Promise) and `fetchCachedData()` (via `setTimeout(..., 0)` for a "deferred load"). Both wrote to the same Redux state slice. The XHR resolved quickly and wrote state. Then `setTimeout` callback tried to read that state for initialisation — but because the `setTimeout` was queued as a macrotask and the XHR `.then` was a microtask, the ordering looked reliable in testing but broke in production when the XHR was served from cache too fast. Fix: `Promise.all([fetchUserConfig(), Promise.resolve(getCachedData())])` — both as microtasks, explicit coordination.

**Microsoft Outlook Web — `Promise.all` for parallel API requests:**

Outlook's mail list view fires 4 API requests simultaneously (`Promise.all`): mailbox metadata, first-page messages, categories list, unread counts. They render progressively as each settles (using `.then` on each individual Promise, not `Promise.all.then`) — the list appears as fast as the first batch completes, not all-or-nothing. This reduces perceived loading time by ~40% vs sequential chaining.

**Adobe Substance — Cancellable Promise via AbortController:**

Adobe Substance 3D uses `AbortController`-wrapped fetch Promises for asset previews — when a user scrolls past a 3D thumbnail, the pending preview fetch is aborted. The `.catch` handler distinguishes `AbortError` (ignore silently) vs other errors (report). This prevents backed-up Promise queues from stale requests.

**Salesforce LWC — Promise-based wire adapters:**

Salesforce LWC's `@wire` decorator is internally implemented as a reactive Promise-based system. When component props change, new Promises are created for refetch. The framework guarantees `.then` ordering via microtask semantics — component's `renderedCallback` always sees up-to-date data from the most recently settled wire Promise.

---

## 💬 4. Interview Execution

### Sample Answer (3-minute verbal)

> "A Promise is a state machine with three states: Pending, Fulfilled, and Rejected. Once settled, the state never changes. Internally, V8 stores the Promise's value and a list of reaction records — these are the `.then` callbacks you register. When the Promise settles, each reaction is pushed onto the microtask queue as a job and processed after the current synchronous code completes.
>
> `.then` always returns a new Promise, enabling chains. Each handler receives the previous handler's return value. If a handler returns another Promise, the chain adopts its state via the thenable resolution algorithm. If a handler throws, the next `.catch` handles it.
>
> The critical detail for interviews: Promise callbacks are ALWAYS asynchronous — even if the Promise is already resolved. This ensures predictable ordering. Microtasks run before any macrotask or render, so a deeply nested Promise chain can delay rendering.
>
> At SAP, I fixed a data-consistency bug caused by mixing a Promise microtask with a setTimeout macrotask — two handlers that assumed a specific execution order. The fix was `Promise.all` to enforce explicit coordination."

---

### Likely Follow-up Questions

1. **What happens if you throw in a `.then` handler?** → The returned Promise from that `.then` is rejected with the thrown error. The error propagates down the chain to the next `.catch`. If no `.catch` exists, it becomes an unhandled rejection.

2. **What is the difference between `return Promise.resolve(x)` and `return x` inside a `.then`?** → Both produce the same outcome — the next `.then` receives `x`. However, `return Promise.resolve(x)` adds one extra microtask hop (thenable assimilation). Prefer plain `return x` unless you need thenable semantics.

3. **How do you handle multiple independent promises and collect all results?** → `Promise.all([p1, p2, p3])` — runs all in parallel, resolves with array of results when ALL settle. Rejects immediately if ANY rejects. Use `Promise.allSettled` instead if you need all results regardless of rejection.

4. **Can you cancel a Promise?** → Not natively — Promises have no cancellation mechanism. Use `AbortController` with `fetch` and check `signal.aborted` in custom Promises. Or use RxJS Observables, which are cancellable via `subscription.unsubscribe()`.

5. **What is the "explicit construction anti-pattern" (Promise constructor anti-pattern)?** → Wrapping a function that already returns a Promise in `new Promise((resolve, reject) => ...)`. This adds unnecessary complexity and can swallow errors. Just chain `.then/.catch` on the existing Promise.

---

### vs Alternatives

| Promise | Callback | Observable (RxJS) | Choose when |
|---|---|---|---|
| Single async value | Single async value | Multiple values over time | Promise: one-shot API calls, data fetching |
| Non-cancellable | Non-cancellable | Cancellable via unsubscribe | Observable: user input streams, polling, WebSocket |
| Eager (runs immediately) | Eager | Lazy (runs on subscribe) | Observable: conditional async — only run if subscribed |
| Native, no deps | Native, no deps | Requires RxJS | Promise: always available; Observable: import from RxJS |

---

### How to Signal Senior Thinking

> "Promises are fundamentally about trust and composability — they solve callback's inversion of control problem. The microtask semantics are critical for correctness: knowing that `.then` fires before any macrotask means you can reason about ordering without timers. The performance concern is deep chains creating microtask backpressure that delays rendering. For complex async coordination, I reach for `async/await` syntax over raw `.then` chains for readability, but I always know the underlying Promise mechanics because the async behaviour is identical."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: Promise state machine + microtask ordering proof
// ============================================================

console.log('1: start');

const p = new Promise<number>((resolve) => {
  console.log('2: executor runs synchronously');
  resolve(42); // Promise settles immediately
});

p.then(v => console.log('4: .then value:', v)); // scheduled as microtask

console.log('3: after .then registration');
// Output order: 1 → 2 → 3 → 4  (not 1 → 2 → 4 → 3!)
// Shows: executor is sync, .then is ALWAYS async (microtask)

// ============================================================
// DEMO 2: Chain with thenable assimilation
// ============================================================

function fetchUser(id: number): Promise<{ name: string; roleId: number }> {
  return Promise.resolve({ name: 'Hruday', roleId: 2 });
}

function fetchRole(roleId: number): Promise<{ title: string }> {
  return Promise.resolve({ title: 'Senior Engineer' });
}

// Chaining — each .then returns a new Promise
const userWithRole = fetchUser(1)
  .then(user => {
    // Returns a Promise — chain adopts its state (thenable assimilation)
    return fetchRole(user.roleId).then(role => ({ ...user, role: role.title }));
  })
  .then(combined => {
    console.log(`${combined.name} — ${combined.role}`);
    return combined;
  })
  .catch(err => {
    console.error('Failed to load user:', err);
    throw err; // re-throw to propagate
  });

// ============================================================
// DEMO 3: Unhandled rejection — global handler
// Production pattern: capture at app root
// ============================================================

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('[UNHANDLED PROMISE REJECTION]', event.reason);
  event.preventDefault(); // suppress default browser error
  // Send to error monitoring (Sentry, Application Insights)
  reportError(event.reason);
});

function reportError(err: unknown): void {
  // --> Integration with monitoring platform
  console.error('Reporting:', err);
}

// ============================================================
// DEMO 4: Promise.all for parallel API calls (Salesforce pattern)
// ============================================================

interface User { id: number; name: string }
interface Permissions { canEdit: boolean; canDelete: boolean }
interface Preferences { theme: 'dark' | 'light' }

async function loadDashboard(userId: number): Promise<void> {
  // ✅ Fire all 3 requests IN PARALLEL — don't await sequentially
  const [user, permissions, preferences] = await Promise.all([
    fetchUserData(userId),
    fetchPermissions(userId),
    fetchPreferences(userId),
  ]);
  // Dashboard renders with all data at once, not 3 sequential round trips
  renderDashboard(user, permissions, preferences);
}

// Stub implementations:
function fetchUserData(id: number): Promise<User> {
  return Promise.resolve({ id, name: 'Hruday' });
}
function fetchPermissions(id: number): Promise<Permissions> {
  return Promise.resolve({ canEdit: true, canDelete: false });
}
function fetchPreferences(id: number): Promise<Preferences> {
  return Promise.resolve({ theme: 'dark' });
}
function renderDashboard(u: User, p: Permissions, pref: Preferences): void {
  console.log('Rendering for', u.name, p, pref);
}

// ============================================================
// DEMO 5: SAP pattern — custom Promise utility with timeout
// ============================================================

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Usage: abort slow API calls
withTimeout(fetchUserData(1), 3000)
  .then(user => console.log('User loaded:', user.name))
  .catch(err => console.error('Load failed:', err.message));
```

**Interview vs Production difference:**
- **Interview:** Demo 1 (ordering proof) and Demo 3 (chain with inner Promise) are classic interview problems. Explaining that `.then` is always async, even on already-resolved Promises, demonstrates deep understanding.
- **Production:** Demo 3 (unhandled rejection global handler) is a critical production safeguard. Demo 4 (`Promise.all` parallelism) is universal. Demo 5 (timeout wrapper) is a reusable production utility for all outbound API calls.

---

## 🧠 6. Memory Aid

**Mental Model:** A Promise is a subscription receipt. When you call `fetch(url)`, the restaurant hands you a receipt (Promise). You can add callbacks to that receipt (`.then`) — they get called when the food is ready (async). Multiple people can hold copies of the same receipt and each gets their own notification. The receipt only changes state once (from "your order is being prepared" to "ready" or "cancelled"). All the order-ready notifications are delivered together before any new orders are taken (microtasks before macrotasks).

**If you go blank:** *"Promise: Pending → Fulfilled/Rejected, once. `.then` callbacks queued as microtasks when settled. Always async — never synchronous. Chains work because `.then` returns a new Promise, adopting the return value's state. Common patterns: `Promise.all` for parallel, `.catch` at chain end, global `unhandledrejection` handler."*

**Mnemonic:** **PRAM** — **P**ending→Fulfilled/Rejected, **R**eactions queued as microtasks, **A**lways async (never sync), **M**icrotasks before render/macrotasks.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Promises are the foundation of all asynchronous UI interactions — data fetching, form submission, image loading. Deep understanding prevents subtle ordering bugs that cause incorrect data display.
→ **Performance:** Knowing that `.then` schedules microtasks lets you reason about which code runs before vs after rendering. `Promise.all` for parallel requests directly reduces perceived load time.
→ **Business:** Every modern frontend framework (React Suspense, Vue async components, Angular HttpClient, Salesforce LWC wire adapters) is built on Promises or Observables. Mastery of Promise internals makes you fluent in all of them.

**How it works (3 sentences):**
A Promise is a state machine that transitions from Pending to either Fulfilled or Rejected exactly once, storing the settled value and a list of reaction records (`.then`/`.catch` callbacks). When a Promise settles, its reactions are queued as microtasks — processed immediately after the current synchronous execution frame, before any rendering or macrotask runs. `.then` always returns a new Promise that adopts the return value of the handler, making chains linear and composable with predictable error propagation through `.catch`.

**Company relevance:**
- **Microsoft:** Outlook/Teams use `Promise.all` + progressive rendering patterns extensively. Microsoft's TypeScript team documents Promise best practices in its internal SDK guidelines — especially `async/await` over raw `.then` for maintainability.
- **Adobe:** Adobe XD and Photoshop Web use long Promise chains for sequenced canvas operations. Adobe's engineering blog details their pattern: serialised operations as Promise chains, parallelisable operations as `Promise.all` groups.
- **Salesforce:** LWC `@wire` adapters are Promises internally. Salesforce's component lifecycle hooks (`connectedCallback`, `renderedCallback`) have documented relationships with when Promise microtasks run — directly affecting first-render data availability.
- **Cisco:** WebEx's signaling layer (WebRTC) uses Promise chains for ICE candidate negotiation, DTLS handshake, and media stream connection. Each step is strictly ordered — sequential `.then` chains with error recovery `.catch` for fallback ICE servers.

---
✅ **Topic 10/486 complete.**
→ **Continuing to Topic 11: async/await — How It Compiles Down to Promises**
