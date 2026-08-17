# 2. Event Loop — Microtasks vs Macrotasks
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds. Crisp. Confident. Numbers included where relevant.

"The JavaScript event loop is the mechanism that allows a single-threaded runtime to handle asynchronous operations without blocking. The critical rule is queue priority: after every task, the engine drains the entire microtask queue before picking the next macrotask. Microtasks — Promise callbacks, `queueMicrotask`, MutationObserver — have higher priority than macrotasks like `setTimeout`, `setInterval`, and I/O callbacks. This distinction directly impacts rendering: the browser will not paint a new frame between microtasks, but it may paint between macrotasks. At SAP, I used this knowledge to ensure our data-binding updates coalesced in microtasks so we never caused an intermediate render with partially-updated state — which would have caused visible flicker in our Fiori dashboards. Understanding this queue model is the foundation for every async optimization decision I make."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

The **event loop** is the coordination mechanism between:
- The **V8 Call Stack** (synchronous execution)
- **Web APIs** (async work done by the browser off main thread)
- **Task queues** (where completed async work waits to re-enter the call stack)

It exists because JavaScript is single-threaded but the real world is asynchronous. Without it, you'd have to either block waiting for I/O (terrible for UX) or spawn OS threads (complex, error-prone with DOM). The event loop gives a clean mental model: *one thing at a time, but nothing is ever truly waiting*.

The key insight that separates senior engineers from junior ones: **there are two distinct queues with different priorities**, and the rendering pipeline sits between them.

---

### How It Works Internally

**The Formal Event Loop Algorithm (WHATWG HTML Living Standard):**

```
EVENT LOOP ITERATION (one "tick"):
1. Dequeue ONE task from the Macrotask Queue (oldest task)
2. Execute that task to completion on the Call Stack
3. MICROTASK CHECKPOINT:
   - While Microtask Queue is NOT empty:
     - Dequeue and execute next microtask
     - (microtasks can queue more microtasks — all drain)
4. UPDATE THE RENDERING (if browser decides it's time):
   - Run requestAnimationFrame callbacks
   - Run IntersectionObserver callbacks
   - Perform style calculations
   - Perform layout
   - Perform paint / composite
5. Go to step 1
```

**Macrotask Queue (Task Queue):**
Sources that produce macrotasks:
- `setTimeout(fn, delay)` — minimum 4ms in nested contexts (HTML spec)
- `setInterval(fn, delay)`
- `MessageChannel.postMessage` — used by React Scheduler internally
- I/O callbacks (fetch completion in Node.js environment)
- `requestAnimationFrame` callbacks (technically a separate "animation frame" queue, but conceptually macrotask-level in that rendering happens between tasks)
- Script execution (the initial `<script>` tag execution is itself a task)
- DOM event handlers (click, keydown, etc.)

**Microtask Queue (Job Queue — ECMAScript spec terminology):**
Sources that produce microtasks:
- `Promise.prototype.then` / `.catch` / `.finally` callbacks
- `Promise.resolve().then(fn)` — immediately queued microtask
- `queueMicrotask(fn)` — explicit microtask queuing (modern)
- `MutationObserver` callbacks
- `async/await` — each `await` suspension resumes as a microtask
- `process.nextTick` in Node.js — actually runs BEFORE Promise microtasks in Node.js (special Node-only priority)

**Critical Differences:**

| Property | Macrotask | Microtask |
|---|---|---|
| Queue per iteration | ONE dequeued | ALL drained |
| Can starve UI | If task > 50ms | If infinite microtask loop |
| Rendering between | Yes (browser may paint) | No (rendering blocked until queue empty) |
| Minimum delay | 4ms (nested setTimeout) | None — synchronous-like priority |
| Source spec | HTML Living Standard | ECMAScript spec |

---

### Architecture & Component Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│                    One Event Loop Tick                        │
│                                                              │
│  ┌─────────────────┐                                         │
│  │  Macrotask Queue │ ← setTimeout, setInterval, I/O,        │
│  │  [task1, task2,] │   MessageChannel, DOM events            │
│  └────────┬─────────┘                                         │
│           │ dequeue ONE                                        │
│           ▼                                                   │
│  ┌─────────────────┐                                         │
│  │   Call Stack     │  Execute task to completion             │
│  │   [fn → fn → fn] │                                         │
│  └────────┬─────────┘                                         │
│           │ task done                                         │
│           ▼                                                   │
│  ┌────────────────────────────────────┐                       │
│  │     MICROTASK CHECKPOINT           │                       │
│  │  ┌────────────────────────────┐    │                       │
│  │  │  Microtask Queue           │    │                       │
│  │  │  [p1.then, p2.then, qMT]   │    │                       │
│  │  └────────────────────────────┘    │                       │
│  │  → Drain ALL (including new ones   │                       │
│  │    queued during processing)       │                       │
│  └────────────────────────────────────┘                       │
│           │ queue empty                                       │
│           ▼                                                   │
│  ┌────────────────────────────────────┐                       │
│  │     RENDERING (if needed)          │                       │
│  │  rAF callbacks → style → layout    │                       │
│  │  → paint → composite               │                       │
│  └────────────────────────────────────┘                       │
│           │                                                   │
│           ▼                                                   │
│  Next tick: dequeue next macrotask                           │
└──────────────────────────────────────────────────────────────┘
```

**Where this sits in the frontend architecture:**
- **React Scheduler** uses `MessageChannel.postMessage` to create macrotasks for low-priority work (avoids setTimeout's 4ms delay)
- **Angular zone.js** patches all async APIs (setTimeout, Promise, XHR, DOM events) to trigger change detection after each task — it wraps the event loop
- **RxJS schedulers** (`asyncScheduler`, `asapScheduler`, `animationFrameScheduler`) are abstractions over macrotasks, microtasks, and rAF respectively

---

### Data Flow & State Flow

**Scenario: User clicks a button → state update → re-render**

```
Click event fires
  → Browser creates macrotask: DOM click handler
  → Calls JavaScript click handler
  → Inside handler: fetch('/api/data')
     → fetch is a Web API, handed off to network thread
  → Handler completes
  → Call stack empty

MICROTASK CHECKPOINT: (empty — no promises resolved yet)

RENDER: Browser may repaint (e.g., to show loading spinner if CSS updated)

[... time passes, network response arrives ...]

  → Browser pushes fetch completion callback to Macrotask Queue
  → Event loop dequeues it
  → .then(response => response.json()) runs
     → response.json() is async → returns Promise → queues microtask
  → Task completes

MICROTASK CHECKPOINT:
  → .then(data => setState(data)) runs
  → (React 18) setState queued for batching
  → (React) schedules reconciliation via MessageChannel (macrotask)

RENDER: May repaint intermediate state

Next macrotask: React reconciliation
  → Diffing → commit to DOM
  → New DOM painted
```

**Key insight:** Between the click and the render, there were multiple macrotask iterations. Microtasks within each iteration ran synchronously relative to each other — ensuring `response.json()` and the subsequent `.then` chained without any render happening between them.

---

### Performance Implications

**Microtasks and rendering:**
- If you create a chain of 1000 microtasks, the browser cannot paint a single frame until all 1000 complete.
- This is usually fine (microtasks are fast) but infinite microtask recursion (`Promise.resolve().then(self)`) will freeze the tab permanently.

**setTimeout(fn, 0) behavior:**
- Minimum 4ms in nested calls (5+ levels of nesting per HTML spec).
- First call: 0ms. Second call inside timeout: 0ms. Fifth nested call: 4ms minimum clamp.
- This means `setTimeout` is NOT a zero-delay operation at any real depth.

**Core Web Vitals impact:**

| Pattern | CWV Impact |
|---|---|
| Long synchronous task (one macrotask) | High TBT, bad INP |
| Infinite microtask loop | Page freeze, worst INP |
| Many small macrotasks (chunked work) | Low TBT, good INP |
| Microtask-based state batching | Good — prevents flicker renders |
| rAF for visual updates | Correct — synchronized with display refresh |

**React 18's automatic batching** specifically relies on this: React wraps multiple `setState` calls within a Scheduler task (macrotask), and all queued updates are flushed in a single `flushSync` call before the microtask checkpoint → preventing intermediate renders.

---

### Scalability Considerations

| Scale | Event Loop Concerns |
|---|---|
| < 10K users | Profile in Chrome DevTools Performance tab. Task duration is visible. Long tasks show red marks. |
| 100K users | Device diversity. Use CPU throttling (4× in DevTools) to simulate mid-range devices. A 100ms task on your machine is 500ms on Moto G4. |
| 10M+ users | Real User Monitoring (RUM) with Long Tasks API: `PerformanceObserver({ type: 'longtask' })` to collect field data. Event loop health is a production SLO metric at companies like Microsoft. |

**At enterprise SAP scale:** Fiori Launchpad had multiple Angular modules competing for the event loop during initialization. We staggered module initialization using `setTimeout(0)` to break up the initial 800ms blocking task into six ~130ms tasks — TTI improved by 45%.

---

### Trade-offs

| Approach | Alternative | When to Choose |
|---|---|---|
| `queueMicrotask` (high priority) | `setTimeout(0)` (macrotask) | Use `queueMicrotask` when you need guaranteed same-tick execution before render; use `setTimeout` when you want to yield to render |
| `Promise.resolve().then(fn)` | `queueMicrotask(fn)` | Functionally identical; `queueMicrotask` is cleaner, has better stack traces |
| `requestAnimationFrame` | `setTimeout(16)` | Always use rAF for visual work — it's synchronized with display refresh and skips ticks when tab is hidden |
| `MessageChannel` (React Scheduler) | `setTimeout(0)` | MessageChannel has no 4ms minimum delay — used by React for responsive scheduling without artificial delay |
| `scheduler.postTask()` | `setTimeout` with manual priority | `postTask` adds explicit priority levels — use in modern apps (Chrome 94+) with `isInputPending` for real-time priority |

---

### ⚠️ Anti-Patterns & Pitfalls

- **Infinite microtask recursion** — `Promise.resolve().then(function loop() { Promise.resolve().then(loop); })` completely starves the macrotask queue. The event loop never reaches the render step. Tab becomes unresponsive. No recovery possible except kill tab. This is harder to detect than a while(true) because CPU usage may not be 100% until V8 heap fills.

- **Assuming `setTimeout(fn, 0)` is zero delay** — In a function that recursively calls `setTimeout` 5+ levels deep, the HTML spec mandates a minimum 4ms delay. At 60fps budget of 16.67ms per frame, 4 nested setTimeouts = entire frame budget. Use `MessageChannel` or `scheduler.postTask` for zero-delay task splitting.

- **Relying on microtask order across separate Promise chains** — If you have `Promise.resolve().then(A)` and `Promise.resolve().then(B)`, A runs before B because they were queued in that order. But if A itself queues a microtask C, the order is: A → C → B. Inter-chain ordering can surprise: always make ordering explicit with chained `.then` rather than separate chains.

- **Blocking the loop with synchronous XHR** — `XMLHttpRequest` with `async: false` blocks the entire call stack synchronously. Removed from service workers for this reason. Never use in production. Some legacy SAP UI5 components had this — migrating away was a prerequisite for our performance improvement work.

- **MutationObserver timing misunderstanding** — MutationObserver callbacks are microtasks, not macrotasks. They run before the next paint. If your MutationObserver triggers expensive DOM work, it can block rendering even though it appears "async" in the code.

- **Over-using `async/await` without understanding the task boundary** — Every `await` creates a microtask suspension. An `async` function with 10 `await` points creates 10 microtask re-entries. This is fine for I/O but can surprising if you expect code after an `await` to run before a `setTimeout(0)` — it will, because microtasks have priority over macrotasks.

---

## 🏭 3. Real-World Examples

**At Hruday's level — SAP BI Launchpad:**

During the WCAG AA accessibility audit at SAP, a failing criterion was focus management: when a modal opened, focus was being moved to the modal button before the DOM was fully updated, causing screen readers to announce the wrong content. The fix required understanding microtask vs macrotask timing:

```typescript
// BROKEN — setTimeout causes a macrotask gap — render may have happened
// with focus in wrong place
setTimeout(() => modalRef.current?.focus(), 0);

// CORRECT — queueMicrotask runs before any render
// Focus is set after DOM update but before paint
queueMicrotask(() => modalRef.current?.focus());
```

This moved 3 accessibility failures (focus management, live region timing, modal announce) to passing in a single change.

**At FAANG scale — Microsoft Outlook Web:**

Outlook Web handles incoming emails in real time. Each email arrival involves: WebSocket message receipt (macrotask) → JSON parse → UI update via React setState. If multiple emails arrive simultaneously, the `MessageChannel`-based React Scheduler batches the state updates in a single macrotask, drains microtasks (reconciliation), and paints once. Without this batching, 10 simultaneous emails would trigger 10 renders, 10 paints — visible as jank. Microsoft's Fluent UI performance team specifically documents this as a solved problem via React 18 automatic batching.

**At Bosch (your experience) — WebSocket dashboard:**

Real-time industrial monitoring WebSocket streams were firing 50–100 data updates/second. Each handler was placing state updates in individual macrotasks (via RxJS `asyncScheduler`) to avoid blocking the loop — but this caused 50–100 re-renders per second. The fix was switching to `animationFrameScheduler` to coalesce all updates per frame (16ms window), reducing re-renders from 100/s to 60/s while maintaining real-time accuracy.

**How it evolves with scale:**
- **Small scale (< 10K users):** Event loop health isn't monitored. Developers profile manually when issues appear.
- **Medium scale (100K users):** Lighthouse CI in pipeline catches TBT regressions. Long Tasks API added to RUM to track p75/p95 task durations.
- **Large scale (10M+ users):** Event loop health is a production SLO. Teams like Microsoft Fluent, Google Chrome DevRel measure long task rate per session. Scheduler API and `isInputPending()` are used to build work-stealing schedulers that yield when the user interacts.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "The event loop coordinates between the single call stack and multiple async sources. The core rule is queue priority: after every macrotask completes, the engine drains the entire microtask queue before picking the next macrotask, and before the browser renders.
>
> Macrotasks come from setTimeout, setInterval, I/O, DOM events — one per iteration. Microtasks come from Promises and queueMicrotask — all of them drain before anything else happens.
>
> This has real consequences. At SAP, I used this to fix a focus management bug where screen readers were announcing stale content. We were using setTimeout(0) to defer focus — but a render was happening in that gap. Switching to queueMicrotask meant focus was set before paint, fixing 3 WCAG violations at once.
>
> At scale, React's Scheduler exploits this model deliberately — it uses MessageChannel instead of setTimeout to create macrotasks without the 4ms minimum delay, and batches all state updates in a single Scheduler task before the microtask checkpoint, preventing intermediate renders. Understanding this model is why I think about async code in terms of task boundaries rather than just 'callback later'."

---

### Likely Follow-up Questions

1. **Why does React use `MessageChannel` instead of `setTimeout`?** → `setTimeout` has a minimum 4ms delay per HTML spec in nested contexts. `MessageChannel.postMessage` has no minimum — it queues a true zero-delay macrotask.

2. **What happens if a microtask queues another microtask?** → The new microtask is added to the end of the microtask queue and will run in the same microtask checkpoint — before any macrotask or render. Microtask queue fully drains, including dynamically added ones.

3. **How does `requestAnimationFrame` fit into the queue model?** → rAF callbacks are in a separate "animation frame callback" list. They run after microtasks but before paint — giving them a predictable slot tied to the display refresh rate (~16.67ms at 60fps). If a tab is hidden, rAF is throttled/stopped.

4. **What is `scheduler.yield()` and why is it better than `setTimeout(0)` for chunking?** → `scheduler.yield()` returns a Promise (microtask resume) but signals the browser's task scheduler to check for pending input before resuming. It respects `isInputPending()` — yielding to user interaction without the 4ms setTimeout tax.

5. **Can `async/await` starve the event loop?** → No by itself — but an `async` function that `await`s in a tight loop over millions of items will still accumulate microtasks faster than macrotasks run. If each iteration produces a new `await`, the microtask queue grows. Better to batch with `scheduler.yield()` every N iterations.

---

### vs Alternatives

| Event Loop model | Multi-threaded model (Erlang, Go) | Choose event loop when |
|---|---|---|
| Single-threaded, no race conditions on DOM | Multiple threads, shared memory, mutexes | DOM manipulation requires single owner |
| Microtask queue gives atomic state updates | Thread context switches can interrupt | Need predictable state coherence within a task |
| Long tasks block everything | Other threads continue | CPU-bound work: use Worker; I/O-bound: event loop wins |
| Simple debugging (single stack trace) | Multi-thread debugging is complex | Developer experience matters |

---

### How to Signal Senior Thinking

> "The event loop isn't just theory — the queue priority rules directly determine UI consistency. Knowing *when* the browser renders relative to my async code is the difference between an accessible focus pattern and a screen reader bug."

---

## 💻 5. Code Example
> Demonstrates precise queue ordering, rendering boundary, and the React Scheduler pattern.

```typescript
// ============================================================
// DEMO 1: Proving render happens between macrotasks, not microtasks
// Relevant to: focus management, WCAG, flicker prevention
// ============================================================

function demonstrateQueueOrdering(): void {
  console.log('1. sync — call stack');

  // Macrotask — runs AFTER render may occur
  setTimeout(() => console.log('5. macrotask — setTimeout'), 0);

  // Microtasks — run before render
  Promise.resolve().then(() => console.log('3. microtask — Promise'));
  queueMicrotask(() => console.log('4. microtask — queueMicrotask'));

  // rAF — runs just before paint (after microtasks, before actual paint pixels)
  requestAnimationFrame(() => console.log('? rAF — before paint'));

  console.log('2. sync — still call stack');
}
// Output: 1 → 2 → 3 → 4 → rAF → [render] → 5
// Note: rAF order vs microtask order is implementation-specific but rAF precedes paint


// ============================================================
// DEMO 2: Focus management fix using microtask (SAP use case)
// ============================================================

function openModalWithCorrectFocus(modalRef: React.RefObject<HTMLElement>): void {
  // DOM update happens here (React batch commit)
  // ...render modal...

  // WRONG: setTimeout gives browser a chance to paint with wrong focus
  // setTimeout(() => modalRef.current?.focus(), 0);

  // CORRECT: queueMicrotask runs before paint — focus set atomically with DOM update
  queueMicrotask(() => {
    modalRef.current?.focus();
    // Screen reader now announces the correct focused element
  });
}


// ============================================================
// DEMO 3: Work chunking — yielding between macrotasks
// Demonstrates how to respect the 50ms long-task budget
// ============================================================

// Polyfill/wrapper for scheduler.yield with fallback
function yieldToMain(): Promise<void> {
  // Modern: scheduler.yield() preserves user-input priority
  if ('scheduler' in globalThis && typeof (globalThis as any).scheduler?.yield === 'function') {
    return (globalThis as any).scheduler.yield();
  }
  // Fallback: MessageChannel (zero-delay macrotask, no 4ms clamp)
  return new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
}

async function processItemsWithYield<T>(
  items: T[],
  processItem: (item: T) => void,
  chunkSize = 500
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);
    // Yield every chunkSize items — allows browser to render and handle input
    if ((i + 1) % chunkSize === 0) {
      await yieldToMain();
    }
  }
}

// Usage: process 50K records without blocking UI
// processItemsWithYield(largeArray, transformRow, 500);


// ============================================================
// DEMO 4: Infinite microtask trap — what NOT to do
// ============================================================

// DANGER: This will freeze the tab
function infiniteMicrotaskLoop(): void {
  // DO NOT run this in production
  function recurseMicrotask(): void {
    Promise.resolve().then(recurseMicrotask); // Queues microtask which queues microtask...
  }
  // recurseMicrotask(); // <-- Would permanently freeze the tab
}

// Contrast: Infinite macrotask loop is recoverable (can close tab)
// Infinite microtask loop is NOT — it starves the macrotask queue completely
```

**Interview vs Production difference:**
- **Interview:** Show Demo 1 (queue ordering) and Demo 2 (focus fix) — clean, demonstrable, shows deep knowledge without needing browser APIs.
- **Production:** Add `scheduler.yield()` with `isInputPending()` for input-aware yielding, add `PerformanceObserver({ type: 'longtask' })` to monitor task durations in RUM, use `MessageChannel` fallback over `setTimeout`.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** The event loop is a restaurant kitchen. One chef (call stack) per table (macrotask). The chef finishes one table, then handles all VIP orders (microtasks) before starting the next table. The restaurant manager (browser) resets the tables (renders) between each customer.

**If you go blank:** *"The rule is: one macrotask runs, then ALL microtasks drain, then the browser may render, then the next macrotask. Microtasks have priority over rendering."*

**Mnemonic:** **1-ALL-RENDER** — 1 macro → drain ALL micro → RENDER → repeat.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Microtask vs macrotask choice determines whether users see intermediate/flickering states or clean atomic updates.
→ **Performance:** Long macrotasks (> 50ms) cause bad INP, TBT. Infinite microtask loops freeze tabs. Correct queue selection = responsive, jank-free UI.
→ **Business:** At SAP, correct queue understanding fixed WCAG focus management violations (3 criteria). At scale (Microsoft, Adobe), it's the difference between 60fps and janky, unresponsive interfaces.

**How it works (3 sentences):**
After each macrotask the JavaScript engine runs a microtask checkpoint, draining the entire microtask queue — including any microtasks queued by microtasks — before returning control to the event loop. Only after the microtask queue is empty does the browser potentially render a frame (if 16.67ms has passed), then picks the next macrotask. This ordering means Promise chains run atomically relative to rendering, while setTimeout callbacks run in separate rendering windows.

**Company relevance:**
- **Microsoft:** Teams, Edge, VS Code Web all rely heavily on React Scheduler's use of MessageChannel (zero-delay macrotask) and Promise microtasks for responsive UI. They specifically test whether candidates understand WHY React chose MessageChannel over setTimeout.
- **Adobe:** Photoshop Web and XD use heavy Promise-chain pipelines for layer operations. Microtask ordering in their Wasm bridge determines whether operations appear atomic or produce visual artifacts mid-operation.
- **Salesforce:** LWC's rendering engine uses microtasks for its reactive property updates — similar to Angular signals. Understanding that LWC property changes coalesce in microtasks (no intermediate renders between multiple property sets) is a Salesforce-specific senior question.
- **Cisco:** WebEx real-time event handlers run in macrotasks. Understanding that a burst of 20 WebSocket messages creates 20 macrotasks — and that coalescing them with a debounce (setTimeout) or batching architecture (RxJS bufferTime) requires knowing the queue model — is a real interview topic for Cisco.

---
✅ **Topic 2/486 complete.**
→ **Continuing to Topic 3: Main Thread vs Worker Threads**
