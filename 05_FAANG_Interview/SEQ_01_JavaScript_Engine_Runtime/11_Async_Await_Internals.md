# 11. async/await — How It Compiles Down to Promises
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"`async/await` is syntactic sugar over Promises — an `async` function always returns a Promise, and `await` unwraps a Promise using the same microtask mechanism as `.then`. Under the hood, V8 transforms every `await` expression into a continuation that is scheduled as a microtask when the awaited Promise settles. The function is suspended at each `await` — it yields the event loop, allowing other code to run — then resumes exactly where it left off. The critical implication: `await` does NOT block the thread. It suspends the current async function and comes back to it via a microtask callback when the awaited value is ready. At SAP, this saved us during a Fiori migration from nested callbacks: 200 lines of nested `.then` chains across 3 API calls became 40 lines of sequential, readable `async/await` code that was immediately testable and debuggable, with zero behaviour change in production."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**Problem:** `.then` chains, while better than callbacks, still create noise:
- Error handling with `.catch` is detached from the operation that throws
- Multiple values require closure or argument threading through handlers
- Debugging is hard — stack traces show anonymous microtask frames, not line numbers
- Parallel vs sequential is structurally identical — easy to accidentally serialise

**Solution:** `async/await` provides imperative-looking code that reads top-to-bottom, with `try/catch` for errors, and the familiar variable scoping you'd expect — while still being entirely asynchronous under the hood.

**Key rule:** Inside an `async` function, `await someValue` pauses execution of the `async` function until `someValue` (if it's a Promise) settles. The function is resumed as a microtask callback with the resolved value (or throws into the catch block if rejected).

---

### How It Works Internally

**Compiler transformation — what V8 does:**

```typescript
// What you write:
async function fetchUserData(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const user: User = await response.json();
  return user;
}

// What V8 generates conceptually (simplified generator-based desugaring):
function fetchUserData(id: number): Promise<User> {
  return new Promise((resolve, reject) => {
    function step(nextValue?: unknown, nextError?: unknown): void {
      try {
        let result: IteratorResult<unknown, User>;

        if (nextError !== undefined) {
          result = gen.throw(nextError as Error);
        } else {
          result = gen.next(nextValue);
        }

        if (result.done) {
          resolve(result.value);
        } else {
          // Await: schedule continuation as microtask when yielded Promise settles
          Promise.resolve(result.value).then(
            (val) => step(val),
            (err) => step(undefined, err)
          );
        }
      } catch (err) {
        reject(err);
      }
    }

    const gen = generatorVersion(id);
    step();
  });
}

// The generator equivalent of the async function:
function* generatorVersion(id: number): Generator<Promise<unknown>, User, unknown> {
  const response = (yield fetch(`/api/users/${id}`)) as Response;
  const user = (yield response.json()) as User;
  return user;
}

interface User { id: number; name: string }
```

**Actual V8 behaviour (more accurate):**

Modern V8 (Node 12+ / Chrome 69+) does NOT actually use generators internally — it has a native, optimised async function implementation. But the generator model is the conceptual equivalent and is exact enough for interview purposes.

**The 3 microtask hops of `await`:**

This is a key interview detail — `await` actually involves 2–3 microtask scheduling steps:

```
async function example(): Promise<void> {
  const result = await fetch(url); // ← what happens here?
}

1. fetch(url) returns Promise P1
2. await P1 — V8 wraps P1 in Promise.resolve(P1) and attaches a .then handler
3. [sync code continues outside example() until call stack empty]
4. Microtask: P1 resolves → V8 schedules example()'s continuation as microtask
5. Microtask: example() resumes, "result" = resolved value
```

**Important V8 optimisation (Node 12 / Chrome 73+):** Async/await is now FASTER than manually chaining `.then` in modern V8 because V8 can track the async function's execution context more efficiently than an anonymous `.then` closure. The number of microtask hops was reduced from 3 to 2 in V8 6.6+ by the `--harmony-await-optimization` flag (now default).

---

### Architecture & Control Flow

```
Async function execution timeline:

caller()                           fetchUserData(1)          event loop
─────────────────────────────────────────────────────────────────
call fetchUserData(1)
  ──────────────────────────────►
                                  runs synchronously until await
                                  fetch('/api/users/1') called
                                  [network request dispatched]
                                  await suspends function
  ◄────────────────────────────── returns Promise (pending) to caller
Promise stored / .then attached
caller continues its own code
════════════════════════════════════════════════════════════════
[network response arrives → macrotask scheduled]
                                                        macrotask runs
                                                        → resolves fetch Promise
                                                        → schedules fetchUserData
                                                          continuation as microtask
─────────────────────────────────────────────────────────────────
                                  microtask: fetchUserData resumes
                                  response.json() called
                                  await suspends again
═══════════════════════════════════════════════════════
[body read] → microtask: resumes, user = parsed JSON
fetchUserData returns user
→ outer Promise resolves → awaiting callers notified
```

---

### Performance Implications

**`await` in a loop — the serialisation trap:**
```typescript
// ❌ SERIAL: each fetch waits for previous to complete
// 1000ms total if each fetch takes 100ms × requests
async function loadUsersSerial(ids: number[]): Promise<User[]> {
  const users: User[] = [];
  for (const id of ids) {
    users.push(await fetchUserData(id)); // sequential — each awaits previous
  }
  return users;
}

// ✅ PARALLEL: all fetches start simultaneously
// ~100ms total regardless of count (up to server limits)
async function loadUsersParallel(ids: number[]): Promise<User[]> {
  return Promise.all(ids.map(id => fetchUserData(id)));
}

// ✅ PARALLEL with concurrency limit (avoid overwhelming server):
async function loadUsersConcurrent(ids: number[], limit = 5): Promise<User[]> {
  const results: User[] = [];
  for (let i = 0; i < ids.length; i += limit) {
    const batch = ids.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(id => fetchUserData(id)));
    results.push(...batchResults);
  }
  return results;
}
```

**The `await` overhead:** Each `await` adds ~2 microtask hops. In ultra-performance-sensitive code (thousands of awaits per second), this matters. For typical UI use — negligible.

---

### Scalability Considerations

| Scale | async/await Concern |
|---|---|
| Simple app | `try/catch` error handling; avoid unhandled rejection |
| Medium SPA | Don't `await` in loops — use `Promise.all`. Don't mix `async/await` and raw `.then` in the same function |
| Large-scale (1M+ RPS equivalent in Node backend) | `async/await` overhead is measurable per call. Avoid unnecessary `await`s on already-resolved values in hot paths |
| Testing | `async/await` functions are trivial to test — `await expect(fn()).resolves.toBe(x)`. No callback gymnastics |

---

### Trade-offs

| `async/await` | Raw `.then` chains | Choose when |
|---|---|---|
| Linear, readable | Functional, composable | `async/await` for most application code |
| `try/catch` error handling | `.catch` on each step or end of chain | `try/catch` easier to scope granularly |
| Easy to accidentally serialise | Easy to see when things are parallel (side-by-side `.then`) | `async/await`: use `Promise.all()` explicitly for parallel |
| Better stack traces (V8 knows it's an async function) | Anonymous microtask frames | `async/await` — significantly easier to debug |

---

### ⚠️ Anti-Patterns & Pitfalls

- **`await` inside `forEach`** — `forEach` doesn't `await` returned Promises. The loop completes synchronously while all async operations are kicked off but not awaited. Use `for...of` or `Promise.all(items.map(...))`.

- **`async` functions returning `new Promise` explicitly** — `async function foo() { return new Promise(...) }` — wrong style. The `async` keyword already wraps the return in a Promise. Just `return value` or `throw error`.

- **Not using `try/catch`** — `async` function without `try/catch` + no `.catch` on the returned Promise = unhandled rejection. Always either `try/catch` inside the function OR attach `.catch` to its caller.

- **`await` on a non-Promise** — `await 42` is valid — it wraps `42` in `Promise.resolve(42)` and schedules one microtask hop. It's not wrong but adds a pointless microtask delay. Only `await` actual Promises.

- **Sequential `await` when parallel is possible** — Any time you see two `await` calls with no data dependency between them, they should run as `Promise.all`. The most common performance anti-pattern in `async/await` code.

- **`async IIFE` not `.catch`-handled** — `(async () => { await doThing(); })()` — the IIFE returns a Promise nobody is watching. If it throws, it's an unhandled rejection. Always add `.catch` or top-level `await` (in modules).

- **Forgetting `await` entirely** — `const user = fetchUserData(1)` — `user` is a `Promise<User>`, not a `User`. TypeScript catches this with strict settings (`@typescript-eslint/no-floating-promises`, `@typescript-eslint/await-thenable`).

---

## 🏭 3. Real-World Examples

**SAP Fiori Launchpad — callback pyramid to async/await:**

The Fiori Launchpad had a 3-level nested fetch sequence: load user config → load role-based tiles → load each tile's metadata. In the original code, this was implemented as nested XHR callbacks → then `.then` chains → finally migrated to `async/await`. The `async/await` version allowed proper error boundaries with `try/catch` per stage, proper loading state management with simple boolean variables, and the team found 3 previously invisible bugs in production that were hidden by swallowed errors in the callback version.

**Microsoft Azure Portal — TypeScript strict async patterns:**

Azure Portal uses TypeScript's `@typescript-eslint/no-floating-promises` rule — every `async` function call must be `await`-ed or explicitly `.catch`-handled. This prevents silent failures in a portal used by millions daily. Azure's internal coding standard: "Any `async` function you call in event handlers must be wrapped in `void handleAsync(fn)` if you intentionally don't need the result."

```typescript
// Azure pattern for event handlers with async operations:
function handleButtonClick(event: Event): void {
  void (async () => {
    try {
      await saveData();
      showSuccessToast();
    } catch (err) {
      showErrorBanner(err);
    }
  })();
}

// Type stubs:
declare function saveData(): Promise<void>;
declare function showSuccessToast(): void;
declare function showErrorBanner(err: unknown): void;
```

**Adobe After Effects Web — sequential vs parallel:**

Adobe After Effects Web exports timeline frames. Each frame export is an async GPU operation. Their code uses a concurrent queue pattern — not sequential `await` (would be extremely slow) and not `Promise.all` (overwhelms GPU), but a concurrency-limited async loop (`limit = navigator.hardwareConcurrency`).

**Bosch Industrial Dashboard — async data pipeline:**

Hruday's Angular WebSocket dashboard used `async/await` for the data transformation pipeline:
1. `await` WebSocket connection establishment
2. `await` schema validation against server config
3. `await` initial state hydration from REST API
4. Then switch to synchronous Observable stream for live updates

The sequential `await` chain for startup was ideal — steps are strictly ordered (can't validate schema before connection). But step 4's live data used RxJS Observables — the natural handoff point from "async boot sequence" to "streaming event system."

---

## 💬 4. Interview Execution

### Sample Answer (3-minute verbal)

> "An `async` function is syntactic sugar that always returns a Promise. Inside, every `await` expression desugars to a `.then` callback — the function suspends its execution at the `await`, returns control to the event loop, and a microtask schedules it to resume when the awaited Promise settles. This is non-blocking — the thread isn't paused; the async function is simply not in the call stack until resumed.
>
> The most important implication is that `await` in a loop creates sequential execution — each iteration waits for the previous. When you have independent async operations, you must use `Promise.all` explicitly to run them in parallel.
>
> `async/await` gives better stack traces than `.then` chains because V8 tracks async function boundaries. `try/catch` works naturally for error handling — catch blocks receive rejections just like thrown errors. The mental model is: async function is a state machine that yields at `await` points and resumes via microtask scheduling.
>
> At SAP, converting 200 lines of nested Promise chains to 40 lines of `async/await` revealed 3 hidden bugs that were swallowed by missing `.catch` handlers in the original chain."

---

### Likely Follow-up Questions

1. **What does `async` before a function do?** → It makes the function always return a Promise. If the function returns a plain value `V`, it's wrapped in `Promise.resolve(V)`. If it throws, the returned Promise rejects. It also enables use of `await` inside the function body.

2. **Can you use `await` outside an `async` function?** → In ES2022 modules (top-level `await`), yes — `await` at the module's top level is valid. The module is treated as an implicit async function and won't be considered loaded until the awaited Promise resolves. Otherwise, `await` must be inside an `async` function.

3. **How do you handle errors in async/await?** → `try/catch` inside the async function catches rejections. `try` wraps the await expressions, `catch` receives the rejection reason. Also, always add `.catch` on the Promise returned by the async function if the caller doesn't `await` it.

4. **What is "top-level await" and when is it useful?** → ES2022 feature in ES modules. Allows `await` at the top level of a module — module evaluation pauses until the awaited Promise settles. Useful for lazy loading (`const config = await loadConfig()`), database connection in Node.js module setup, or dynamic `import()` loading. Module ordering is preserved by the module system.

5. **How does `await` affect the event loop?** → `await` suspends the current async function and returns control to the caller and eventually to the event loop. Other macrotasks and microtasks can run while the async function is suspended. The function resumes as a new microtask when the awaited Promise settles. `await` does NOT block the thread — it's a cooperative yield.

---

### vs Alternatives

| `async/await` | Generator + `.next()` manual | Promise `.then` chaining | Choose when |
|---|---|---|---|
| Linear syntax, implicit suspension | Explicit generator protocol | Functional composition | `async/await`: 99% of use cases |
| Desugar to Promises (V8 optimised) | More complex, same power | Same power, more noise | Generators: custom async iterators, infinite sequences |
| Better stack traces | Opaque stack traces | Poor stack traces | `async/await` for debuggability |
| Easy `try/catch` | Manual `.throw()` | `.catch` at chain end | `async/await` for error handling clarity |

---

### How to Signal Senior Thinking

> "The most important async/await performance principle: any two awaits with no data dependency between them should become a single `Promise.all`. It's the most common performance mistake I see in code reviews — sequential awaits that could be 3× faster in parallel. Also: `async/await` surface syntax hides the Promise model, which can confuse developers into thinking the thread is blocked. Clarifying this — 'await suspends the function, not the thread' — is a key mental model I reinforce in team code reviews."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: async/await execution order proof
// ============================================================

async function demo(): Promise<void> {
  console.log('A'); // 1st — sync
  const val = await Promise.resolve('resolved'); // suspends here
  console.log('C', val); // 3rd — after microtask
}

console.log('before');
demo(); // Promise returned — NOT awaited here
console.log('B'); // 2nd — sync (after demo's first sync part)
// Output: "before" → "A" → "B" → "C resolved"

// ============================================================
// DEMO 2: try/catch error handling — SAP pattern
// ============================================================

interface User { id: number; name: string }
interface UserProfile { user: User; permissions: string[] }

async function loadUserProfile(userId: number): Promise<UserProfile | null> {
  try {
    // PARALLEL: user + permissions fetched simultaneously
    const [user, permissions] = await Promise.all([
      fetchUser(userId),
      fetchUserPermissions(userId),
    ]);
    return { user, permissions };
  } catch (err) {
    if (err instanceof NetworkError) {
      console.warn('Network unavailable, returning cached profile');
      return getCachedProfile(userId);
    }
    // Unknown error — re-throw for caller to handle
    throw err;
  }
}

class NetworkError extends Error {
  constructor(message: string) { super(message); this.name = 'NetworkError'; }
}

async function fetchUser(id: number): Promise<User> {
  return { id, name: 'Hruday' };
}

async function fetchUserPermissions(id: number): Promise<string[]> {
  return ['read', 'write'];
}

async function getCachedProfile(id: number): Promise<UserProfile | null> {
  return null; // or localStorage
}

// ============================================================
// DEMO 3: Sequential vs Parallel — the critical difference
// ============================================================

type DashboardData = { user: User; orders: Order[]; metrics: Metric[] };
interface Order { id: number }
interface Metric { name: string; value: number }

// ❌ SEQUENTIAL: each request waits for previous
// Total time = sum of all request times
async function loadDashboardSlow(userId: number): Promise<DashboardData> {
  const user = await fetchUser(userId);            // 100ms
  const orders = await fetchOrders(userId);        // 200ms
  const metrics = await fetchMetrics(userId);      // 150ms
  return { user, orders, metrics };
  // Total: ~450ms (sequential)
}

// ✅ PARALLEL: all requests fire simultaneously
// Total time ≈ slowest request
async function loadDashboardFast(userId: number): Promise<DashboardData> {
  const [user, orders, metrics] = await Promise.all([
    fetchUser(userId),           // 100ms ──────────────────────►
    fetchOrders(userId),         // 200ms ──────────────────────────────────►
    fetchMetrics(userId),        // 150ms ─────────────────────────────►
  ]);
  return { user, orders, metrics };
  // Total: ~200ms (slowest request determines total)
}

async function fetchOrders(userId: number): Promise<Order[]> {
  return [{ id: 1 }];
}
async function fetchMetrics(userId: number): Promise<Metric[]> {
  return [{ name: 'INP', value: 85 }];
}

// ============================================================
// DEMO 4: Concurrency-limited parallel processing
// (Bosch: process sensor data in batches)
// ============================================================

async function processWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 5 // process 5 items at a time
): Promise<R[]> {
  const results: R[] = new Array(items.length);

  for (let i = 0; i < items.length; i += concurrency) {
    const batchIndices = Array.from(
      { length: Math.min(concurrency, items.length - i) },
      (_, j) => i + j
    );
    await Promise.all(
      batchIndices.map(async (idx) => {
        results[idx] = await fn(items[idx]);
      })
    );
  }
  return results;
}

// Usage: process 100 sensor readings, 5 at a time
// processWithConcurrency(sensorReadings, analyzeSensor, 5);
```

**Interview vs Production difference:**
- **Interview:** Demos 1 (execution order), 2 (`try/catch` with error types), 3 (sequential vs parallel) — all classic interview tests. Being able to predict the output of Demo 1 immediately signals mastery.
- **Production:** Demo 4 (concurrency-limited processing) — critical for server-side Node.js or batch operations. Demo 2's `instanceof NetworkError` pattern — always use typed error classes, not string matching, in production TypeScript.

---

## 🧠 6. Memory Aid

**Mental Model:** An `async` function is a wizard that can momentarily transform into a note and slip under the door. At each `await`, it writes "I'll be back when this Promise resolves," folds itself into a microtask callback, and slips under the door (suspends). Meanwhile, the rest of the building keeps running (event loop continues). When the Promise resolves, the note becomes the wizard again and continues exactly where it left off. The hallway (call stack) is never blocked.

**If you go blank:** *"async returns a Promise. await suspends the function — not the thread — and resumes via microtask when the awaited Promise settles. Error handling: try/catch. Parallel: Promise.all. Common mistake: await in a loop = sequential, use Promise.all outside the loop for parallel."*

**Mnemonic:** **SRPTE** — **S**ugar over Promises, **R**eturns a Promise always, **P**auses function not thread, **T**ry/catch for errors, **E**xplicit Promise.all for parallelism.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** `async/await` in React event handlers, data fetching hooks, and form submissions directly affects UI responsiveness. Sequential awaits cause unnecessary waterfall loading — parallel patterns with `Promise.all` cut load times by 2–5×.
→ **Performance:** V8 optimises `async/await` more aggressively than manual `.then` chains since Chrome 73. Better stack traces reduce debugging time, directly impacting engineering velocity.
→ **Business:** Every interview for Microsoft/Adobe/Salesforce/Cisco will include async code challenges. Mastery of `async/await` execution order and parallelism patterns is a baseline expectation at the senior level.

**How it works (3 sentences):**
An `async` function is syntactically transformed by V8 into a state machine — each `await` expression is a suspension point where the function yields control by scheduling its continuation as a microtask callback on the awaited Promise's `.then` handler. The function never blocks the main thread; it cooperatively suspends and resumes via the microtask queue, making `async/await` functionally equivalent to sequential `.then` chaining but with linear code structure, native `try/catch` error handling, and better stack traces. The most critical performance implication is that `await` in a loop creates serial execution — whenever operations are independent, `Promise.all` must be used explicitly to achieve parallelism.

**Company relevance:**
- **Microsoft:** TypeScript strict mode + `@typescript-eslint/no-floating-promises` — every async call must be handled. Azure Portal uses async error boundary wrappers for all async event handlers. Microsoft's VS Code codebase is a masterclass in `async/await` patterns at scale.
- **Adobe:** Adobe Experience Platform uses async/await throughout its data pipeline SDK. Adobe's engineering blog documents their "parallel-by-default" coding standard — sequential awaits require explicit justification in code review.
- **Salesforce:** LWC async lifecycle hooks — `connectedCallback` can be async (returns Promise). Salesforce documents the correct pattern for async component init: error boundaries, loading states, and skeleton loaders tied to async operations.
- **Cisco:** WebEx Meetings Web — the WebRTC peer connection setup is a 12-step async sequence (getUserMedia → createOffer → setLocalDescription → signaling → setRemoteDescription → ICE completion). `async/await` makes this linear and debuggable; each step's error type informs the user-facing error message.

---
✅ **Topic 11/486 complete.**
→ **Continuing to Topic 12: Promise.all / Promise.race / Promise.allSettled / Promise.any**
