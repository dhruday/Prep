# 13. Generators and Iterators
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"Generators are functions that can pause execution and resume later, yielding values one at a time — they are the language-level implementation of lazy sequences. When a generator function is called, it returns an iterator object with a `.next()` method. Each call to `.next()` runs the function body until the next `yield`, suspends there, and returns `{ value, done }`. The generator's call stack state is preserved between `.next()` calls — unlike regular functions which reset every call. Iterators are the broader protocol — any object with a `.next()` method returning `{ value, done }` is iterable with `for...of`. Generators are the easiest way to create custom iterators. At SAP, I used async generators to implement a paginated API streaming abstraction — the consumer could `for await...of` an infinite sequence of pages without the underlying fetch/pagination logic leaking into business code."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The core problem generators solve:** Producing sequences of values lazily — generating only the next value when requested, not all values upfront.

**Without generators:** To implement a custom iterable (e.g., a pagination helper, a range of numbers, a tree traversal), you must implement the iterator protocol manually — create an object with a `.next()` method, track state in closure variables, manage `done` properly.

**With generators:** The function body IS the iterator logic. `yield` is the suspension point. State is automatically preserved in the function's call stack. No manual state machine needed.

---

### The Iterator Protocol

**An iterable** is any object that implements `[Symbol.iterator](): Iterator`.
**An iterator** is any object with `next(): { value: T, done: boolean }`.

```
Iterable:
  [Symbol.iterator]() → Iterator

Iterator:
  next()    → { value: T, done: false }  (has more values)
            OR { value: undefined, done: true }  (exhausted)
  return()  → { value: T, done: true }  (optional: called when iteration aborted early by break/return)
  throw()   → { value, done }  (optional: injects error into generator)

Built-in iterables: Array, String, Map, Set, TypedArray, NodeList, arguments
Built-in consumers: for...of, spread [...], destructuring, Array.from, Promise.all
```

**Generator function + generator object:**

```typescript
function* range(start: number, end: number, step = 1): Generator<number> {
  for (let i = start; i < end; i += step) {
    yield i; // suspend here — return { value: i, done: false }
  }
  // function falls through — return { value: undefined, done: true }
}

const gen = range(0, 5); // Does NOT execute function body yet — lazy
gen.next(); // { value: 0, done: false } — runs until first yield
gen.next(); // { value: 1, done: false }
gen.next(); // { value: 2, done: false }
gen.next(); // { value: 3, done: false }
gen.next(); // { value: 4, done: false }
gen.next(); // { value: undefined, done: true }

// for...of: automatically calls .next() and stops at done:true
for (const n of range(0, 5)) console.log(n); // 0 1 2 3 4
```

---

### How Generators Work Internally

**Generator call stack preservation:**

```
Normal function:
  function add(a, b) { return a + b; }
  Call:  push frame onto stack → execute → pop frame (frame destroyed)
  Next call: fresh frame, all state gone

Generator function:
  function* gen() { ... }
  call gen(): creates Generator Object
    → Generator Object stores:
       - Reference to function code
       - Current PC (program counter) — which yield we're paused at
       - Local variables snapshot
       - State: 'suspended' | 'running' | 'completed' | 'closed'
    → No code executes yet
  
  gen.next():
    → Restore context from Generator Object
    → Set state: 'running'
    → Execute until next yield
    → Save context back to Generator Object
    → Set state: 'suspended'
    → Return { value: yieldedValue, done: false }
```

**Two-way communication — `.next(value)` passing values in:**

```typescript
function* calculator(): Generator<string, void, number> {
  console.log('Start');
  const x = yield 'Enter first number:';  // yield sends out a message, receives input
  const y = yield 'Enter second number:'; // receives second input
  console.log(`Sum: ${x + y}`);
}

const calc = calculator();
calc.next();       // runs to first yield → { value: 'Enter first number:', done: false }
calc.next(10);     // resumes, x=10, runs to second yield → { value: 'Enter second number:', done: false }
calc.next(20);     // resumes, y=20, logs "Sum: 30" → { value: undefined, done: true }
```

**Generator TypeScript signature:** `Generator<YieldType, ReturnType, NextType>`

---

### Async Generators — The Production Pattern

**Async generators** combine generators with Promises. Used with `for await...of`. Each `yield` can yield a Promise; each `.next()` returns a Promise of `{ value, done }`.

```typescript
async function* paginate<T>(
  fetcher: (page: number) => Promise<{ data: T[]; hasMore: boolean }>
): AsyncGenerator<T[]> {
  let page = 0;
  while (true) {
    const { data, hasMore } = await fetcher(page++); // await inside generator
    yield data; // yield the page
    if (!hasMore) return;
  }
}

// Usage — SAP BI Launchpad data export
async function exportAllUsers(): Promise<void> {
  const userPages = paginate(page => fetchUsersPage(page));

  for await (const users of userPages) {
    await processUserBatch(users); // lazy — loads next page only when requested
  }
}

async function fetchUsersPage(page: number): Promise<{ data: unknown[]; hasMore: boolean }> {
  return { data: [], hasMore: false }; // stub
}
async function processUserBatch(users: unknown[]): Promise<void> { /* export logic */ }
```

**Key advantage:** The consumer doesn't know or care about pagination — it just `for await...of` the async generator. The generator encapsulates all pagination state. This is the "separation of concerns" version of async streaming.

---

### Architecture: Generators vs Alternatives

```
PRODUCING A SEQUENCE OF VALUES:

Option 1: Array — compute all values upfront
  pros: simple, random access, chainable (.map, .filter)
  cons: all values in memory, slow first result if generating is expensive,
        can't be infinite

Option 2: Generator — compute lazily on demand
  pros: lazy (memory efficient), first result instant, can be infinite
  cons: single-pass (can't rewind), not directly composable (.map doesn't exist)

Option 3: RxJS Observable
  pros: composable operators, cancellable, hot vs cold, multi-subscriber
  cons: requires RxJS dependency, steeper learning curve
  
USE:
  Array → finite, known-size, needs random access or array methods
  Generator → lazy sequences, pagination, tree traversal, resource-constrained
  Observable → user events, WebSocket streams, multiple subscribers
```

---

### Performance Implications

**Memory efficiency of lazy generators:**
```
Without generator (materialise all):
  const allRecords = await fetchAllRecords(); // 10,000 records → 10MB in memory
  allRecords.forEach(process);

With async generator (lazy):
  for await (const batch of paginatedRecords(100)) {
    process(batch); // 100 records in memory at a time → 0.1MB peak
  }
  // RAM usage: 100× lower peak
```

**Infinite sequences — only possible with generators:**
```typescript
function* fibonacci(): Generator<number> {
  let [a, b] = [0, 1];
  while (true) { // infinite loop — OK in generator
    yield a;
    [a, b] = [b, a + b];
  }
}

function take<T>(gen: Generator<T>, n: number): T[] {
  const result: T[] = [];
  for (const val of gen) {
    result.push(val);
    if (result.length >= n) break; // generator's return() called — cleanup
  }
  return result;
}

take(fibonacci(), 10); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

---

### Scalability Considerations

| Scale | Generator Use Case |
|---|---|
| Small app | Rarely needed — arrays suffice |
| Data processing (SAP BI) | Async generators for paginated API consumption, CSV streaming |
| Large-scale export (Adobe, Salesforce) | Streaming 100K+ records in batches; generators prevent OOM errors |
| Custom protocol (Cisco) | `async function*` reading chunks from a ReadableStream |

---

### ⚠️ Anti-Patterns & Pitfalls

- **Generators are single-pass** — Once exhausted (`done: true`), calling `.next()` always returns `{ value: undefined, done: true }`. You cannot rewind a generator. If you need multi-pass, re-call the generator function or store results in an array.

- **Error handling in generators** — Errors thrown inside a generator propagate to the `.next()` caller as thrown exceptions. Errors from `gen.throw(err)` are injected at the current yield point. Forgetting `try/catch` inside the generator leaks errors to the consumer unexpectedly.

- **Generator cleanup with early termination** — `for...of break` calls `gen.return()` — the generator's `finally` blocks run. If you have cleanup logic (close DB connection, release file handle), put it in `try...finally` inside the generator, not after the loop.

- **Async generator without cleanup** — If an async generator is not fully consumed (consumer `break`s or throws), ensure resources are released in the generator's `finally` block.

- **Using generators where arrays suffice** — Generators add complexity. If the sequence is small and finite and you need `.map/.filter`, use an array. Reach for generators only when lazy evaluation or infinite sequences are genuinely needed.

---

## 🏭 3. Real-World Examples

**SAP BI Launchpad — async generator for paginated API:**

The Fiori Analytics workspace loads table data from a REST API that paginates in pages of 100. Using an async generator:
1. UI code consumes `for await (const rows of paginatedData(...))` — doesn't care about pagination
2. Generator handles retry logic on rate-limit (429) responses
3. Generator terminates naturally when `hasMore` is false
4. Memory stays low — only current page in memory during processing

**Microsoft VS Code — iteration protocol usage:**

VS Code's extension API extensively uses JavaScript iterators. `workspace.textDocuments` is iterable. `window.visibleTextEditors` is iterable. Many internal VS Code utilities (like `TreeDataProvider`) implement the async iterator protocol for lazy tree node loading.

**Adobe InDesign Web — incremental rendering with generators:**

Adobe InDesign Web renders a design file as a sequence of DOM elements. Using a generator: render the first visible page, yield back to the browser (via `requestIdleCallback`), render next page. This enables progressive rendering without blocking the main thread — users see content immediately while off-screen pages load lazily.

**Salesforce LWC data table — virtual scrolling:**

Salesforce's datatable component uses a generator-like pattern (implemented via iterators) for virtual scrolling — only generating row component data for the visible viewport + a buffer. Avoids materialising 100K rows into DOM when only 50 are visible.

---

## 💬 4. Interview Execution

### Sample Answer (3-minute verbal)

> "Generators are functions that can pause and resume, yielding values on demand. Call the generator function: get an iterator object. Call `.next()`: runs until the next `yield`, pauses, returns `{ value, done: false }`. Call `.next()` again: resumes from where it paused. The function's entire call stack — all local variables — is preserved between `.next()` calls. When the function exits, you get `{ value: undefined, done: true }`.
>
> Generators implement the iterator protocol — any `for...of` loop, spread operator, or destructuring can consume them. They're the recommended way to create custom iterables.
>
> The production context I use most is async generators — `async function*` — for API pagination. The consumer `for await...of`s the generator, the generator handles page fetching, retry, and termination. Memory stays O(page size) not O(total records).
>
> The key difference from Promises: Promises are one async value. Generators are a sequence of values. Async generators bridge both — a sequence of async values, consumed lazily."

---

### Likely Follow-up Questions

1. **What is the difference between an iterable and an iterator?** → An iterable is an object with `[Symbol.iterator]()` that RETURNS an iterator. An iterator has `.next()`. Arrays are iterables (call `[Symbol.iterator]()` to get an array iterator). A generator function returns an object that is BOTH iterable and iterator — it has both `[Symbol.iterator]()` (returns itself) and `.next()`.

2. **How do you return a value from a generator?** → `return value` inside the generator produces `{ value: value, done: true }`. The `return` value is usually ignored by `for...of` (which only processes `done: false` values). To capture it, use `.next()` manually.

3. **How do you pass a value INTO a generator?** → `gen.next(value)` — the `value` argument becomes the result of the `yield` expression in the generator. First `.next()` call's argument is ignored (no `yield` to receive it yet).

4. **What is `yield*`?** → Delegates iteration to another iterable/generator. `yield* [1,2,3]` inside a generator yields 1, then 2, then 3 as if those were individual `yield` calls. Used to compose generators.

5. **How do generators relate to async/await?** → Conceptually, `async/await` is a specialised generator where `await` desugars to `yield` and the runtime's scheduler is the `.next()` caller. V8 doesn't literally use generators for async/await (it has a native optimised implementation), but the conceptual model is identical.

---

### vs Alternatives

| Generator | Array | RxJS Observable | Choose when |
|---|---|---|---|
| Lazy, single-pass | Eager, multi-pass | Lazy (on subscribe), multi-subscriber | Generator: pagination, large data, memory constraints |
| No operators (.map etc.) | Full operator suite | Full operator suite (pipe, map, filter…) | Observable: event streams, complex transformation chains |
| Infinite sequences possible | Finite only | Infinite with never() | Generator: fibonacci, natural numbers, stream reading |
| Built-in (no deps) | Built-in | Requires RxJS | Generator: utilities, libraries; Observable: app event handling |

---

### How to Signal Senior Thinking

> "The real power of async generators is that they create a clean abstraction boundary. The consumer sees a `for await...of` loop — simple, linear, readable. All the complexity of pagination, retry, rate limiting, and termination lives inside the generator. This is the principle of minimising what consumers need to know. I use this pattern for any API that pages — analytics exports, admin bulk operations, real-time log streaming. The generator IS the streaming abstraction."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: Basic generator — range utility
// ============================================================

function* range(start: number, end: number, step = 1): Generator<number, void, undefined> {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

console.log([...range(0, 10, 2)]); // [0, 2, 4, 6, 8]

// ============================================================
// DEMO 2: Infinite generator with take utility
// ============================================================

function* integers(start = 0): Generator<number> {
  while (true) yield start++;
}

function* take<T>(source: Iterable<T>, count: number): Generator<T> {
  let taken = 0;
  for (const val of source) {
    if (taken++ >= count) return;
    yield val;
  }
}

console.log([...take(integers(1), 5)]); // [1, 2, 3, 4, 5]

// ============================================================
// DEMO 3: Custom iterable class (tree traversal)
// ============================================================

interface TreeNode<T> {
  value: T;
  left?: TreeNode<T>;
  right?: TreeNode<T>;
}

function* inOrder<T>(node: TreeNode<T> | undefined): Generator<T> {
  if (!node) return;
  yield* inOrder(node.left);  // delegate to left subtree
  yield node.value;
  yield* inOrder(node.right); // delegate to right subtree
}

const tree: TreeNode<number> = {
  value: 4,
  left: { value: 2, left: { value: 1 }, right: { value: 3 } },
  right: { value: 6, left: { value: 5 }, right: { value: 7 } },
};
console.log([...inOrder(tree)]); // [1, 2, 3, 4, 5, 6, 7]

// ============================================================
// DEMO 4: Async generator — paginated API (SAP BI export pattern)
// ============================================================

interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

async function* fetchAllPages<T>(
  fetchPage: (cursor: string | null) => Promise<Page<T>>
): AsyncGenerator<T[]> {
  let cursor: string | null = null;
  do {
    const page = await fetchPage(cursor);
    yield page.data;
    cursor = page.nextCursor;
  } while (cursor !== null);
}

// Consumer — clean, pagination-unaware
async function exportAllData(): Promise<void> {
  const pages = fetchAllPages<{ id: number; name: string }>(async (cursor) => ({
    data: [{ id: 1, name: 'Item' }], // mock
    nextCursor: null, // last page
  }));

  let totalProcessed = 0;
  for await (const batch of pages) {
    await saveBatch(batch);
    totalProcessed += batch.length;
    console.log(`Exported ${totalProcessed} records total`);
  }
}

async function saveBatch(batch: unknown[]): Promise<void> {
  // write to file/database
}

// ============================================================
// DEMO 5: Generator for SAP tile loading with cancellation
// ============================================================

async function* streamTiles(
  tileIds: string[],
  signal: AbortSignal
): AsyncGenerator<{ id: string; data: unknown }> {
  for (const id of tileIds) {
    if (signal.aborted) return; // check cancellation at each step
    const data = await loadTile(id);
    yield { id, data };
  }
}

async function loadTile(id: string): Promise<unknown> {
  return { content: `Tile ${id}` };
}

// Usage with cancellation:
const controller = new AbortController();
(async () => {
  for await (const tile of streamTiles(['t1', 't2', 't3'], controller.signal)) {
    renderTile(tile.id, tile.data);
  }
})();
function renderTile(id: string, data: unknown): void {
  console.log('Rendering', id);
}
setTimeout(() => controller.abort(), 500); // Cancel after 500ms
```

**Interview vs Production difference:**
- **Interview:** Demo 1 (range generator) and Demo 2 (infinite sequence with take) are classic coding questions. Demo 3 (tree traversal with `yield*`) is the advanced generator question.
- **Production:** Demo 4 (async generator for paginated API) is the most common real-world use. Demo 5 (cancellable async generator) is the production-hardened version with `AbortController` integration.

---

## 🧠 6. Memory Aid

**Mental Model:** A generator is a pause button on a function. Every `yield` pauses the movie (function execution) and hands you the current frame (value). You can resume the movie anytime by pressing play (`.next()`). The movie remembers exactly where it was paused — all the props on the set (local variables), the dialogue so far (closure scope), the scene (program counter). Regular functions don't have a pause button — they always start from the beginning.

**If you go blank:** *"Generator = function with pause button. yield = pause + return value. .next() = resume. Returns { value, done }. Async generator = async function with yield, consumed with for await...of. Use case: lazy sequences, pagination, tree traversal, streaming."*

**Mnemonic:** **LYND** — **L**azy, **Y**ield pauses, **N**ext resumes, **D**one when function exits.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Lazy evaluation via generators prevents loading all data upfront — progressive rendering, incremental search results, paginated tables stay responsive even with 100K+ records.
→ **Performance:** Async generators keep peak memory O(batch size) not O(total data size). For export jobs processing 100K records in a browser or Node.js service, this is the difference between success and OOM crash.
→ **Business:** Generator-based abstractions (paginated API iterator, streaming export) reduce business logic complexity — consumers use clean `for...of` without knowing about pagination, retries, or streaming internals.

**How it works (3 sentences):**
A generator function creates an iterator object when called — the function body does not execute until the first `.next()` call, which runs the function until the next `yield` keyword, suspends execution (preserving all local variable state and call position), and returns `{ value: yieldedValue, done: false }`. Each subsequent `.next()` call resumes from the suspension point; when the function exits, it returns `{ value: returnValue, done: true }`. Async generators extend this with `await` support — yielding Promises that are automatically awaited, consumed via `for await...of`, enabling lazy streaming of asynchronous data sequences with O(batch size) memory usage.

**Company relevance:**
- **Microsoft:** VS Code extension API uses iterators throughout. TypeScript's compiler internals use generators extensively for tree traversal and code transformation pipelines. Microsoft's streaming APIs (`IAsyncEnumerable` in C# surface as async generators in JS-equivalents).
- **Adobe:** Photoshop Web's layer rendering pipeline uses an async generator pattern to render visible layers first, then progressively render invisible/offscreen layers. This gives instant first render while conserving memory.
- **Salesforce:** Apex + LWC data exports use async generator-equivalent patterns. Salesforce's `@salesforce/apex` wire service under the hood uses an iterator-based data streaming protocol for large SOQL result sets.
- **Cisco:** WebEx's WebRTC stack handles video frames using a `ReadableStream` (which itself implements the async iterator protocol) — `for await (const chunk of stream)` pattern for processing video frames from a DTLS transport.

---
✅ **Topic 13/486 complete.**
→ **Continuing to Topic 14: AbortController & Request Cancellation**
