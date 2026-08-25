# Event Loop — Microtasks vs Macrotasks
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **JavaScript is single-threaded**: only one piece of code runs at a time on the main thread; all UI rendering, event handling, and JavaScript share this one thread — any blocking code freezes the UI
- **Call Stack**: where synchronous code executes; LIFO (last in, first out); when the call stack is clear, the event loop picks the next task
- **Macrotasks (Task Queue)**: `setTimeout`, `setInterval`, `requestAnimationFrame`, DOM events (click, keydown), I/O events; only ONE macrotask runs per event loop iteration — the event loop then checks for microtasks and renders before the next macrotask
- **Microtasks (Microtask Queue)**: `Promise.then/.catch/.finally`, `async/await` (which are Promises), `queueMicrotask()`, `MutationObserver`; ALL microtasks drain COMPLETELY before the next macrotask starts — this is the key difference
- **Order per event loop tick**: call stack clears → drain ALL microtasks → render if needed → run ONE macrotask → drain ALL microtasks → render... (repeat)
- **Critical implication**: `Promise.resolve().then(fn)` ALWAYS runs before `setTimeout(fn, 0)` because Promises are microtasks; a long chain of chained Promises can starve the UI (all microtasks run to completion before any render frame)
- **Long Task (>50ms)**: if any single macrotask or synchronous code block ties up the main thread for more than 50ms, INP (Interaction to Next Paint) suffers; break heavy work with `setTimeout(fn, 0)` to yield the main thread between chunks

---

## 1. One-Line Definition
The event loop is the mechanism that allows JavaScript to be non-blocking despite running on a single thread — it processes one task at a time from the call stack, drains all microtasks after each task (before rendering), then picks the next macrotask, giving the browser windows to paint between logical units of work.

---

## 2. The Problem It Solves

Consider this JavaScript:

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
```

What does this print? Many developers guess: `1, 2, 3, 4` or `1, 4, 2, 3`. The actual output is `1, 4, 3, 2`. Understanding WHY is the event loop.

The real-world problem this models: a developer chains five Promises in a click handler and wraps some work in `setTimeout(fn, 0)` believing it will run immediately. But a pending microtask from a `.then()` chain runs before that setTimeout, in a different order than expected — causing a race condition in UI state.

More concretely: a Bosch real-time dashboard had a WebSocket `onmessage` handler that updated a `BehaviorSubject`, which triggered a RxJS stream, which fired a `.then()` chain, which indirectly called `requestAnimationFrame`. The frames were updating OUT OF ORDER during burst events. Understanding that Promises (microtasks) drained before `requestAnimationFrame` (macrotask/rendering step) was the key to debugging the ordering bug — and fixing it required restructuring the chain to use `queueMicrotask()` in the right position.

---

## 3. How It Works Internally

### The Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser / Node.js                         │
│                                                                    │
│  ┌──────────────┐    ┌─────────────────┐   ┌──────────────────┐  │
│  │  Call Stack  │    │  Microtask Queue │   │   Task Queue      │  │
│  │   (LIFO)     │    │  (drain fully)   │   │  (Macrotask Queue)│  │
│  │              │    │                  │   │                  │  │
│  │ [main()]     │    │ Promise.then()   │   │ setTimeout()     │  │
│  │ [fn()]       │    │ async/await      │   │ setInterval()    │  │
│  │              │    │ queueMicrotask() │   │ DOM events       │  │
│  │              │    │ MutationObserver │   │ XHR callbacks    │  │
│  └──────────────┘    └─────────────────┘   │ rAF (special)    │  │
│         │                    │              └──────────────────┘  │
│         │                    │                      │             │
│         └────────────────────┴──────────────────────┘             │
│                               │                                    │
│                        ┌──────▼──────┐                            │
│                        │  Event Loop  │                            │
│                        └─────────────┘                            │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Event Loop Algorithm (per tick)                 │  │
│  │                                                              │  │
│  │  1. Execute synchronous code on call stack until it empties  │  │
│  │  2. Execute ALL microtasks (microtask queue fully drained)   │  │
│  │     a. If new microtasks are added during step 2, run those  │  │
│  │        too — drain completely before moving on               │  │
│  │  3. Check if a render update is needed (60fps target = check │  │
│  │     every ~16ms) — if yes, run requestAnimationFrame         │  │
│  │     callbacks, then update DOM                               │  │
│  │  4. Execute ONE macrotask from the task queue                │  │
│  │  5. Go back to step 2 (drain microtasks from that task)      │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Step-by-Step: The Classic Example

```
Code:
  console.log('1');
  setTimeout(() => console.log('2'), 0);
  Promise.resolve().then(() => console.log('3'));
  console.log('4');

Event loop execution:

Tick 1 — Synchronous code runs:
  Call stack: [script]
  → console.log('1')  ➜  prints: 1
  → setTimeout(fn, 0)  ➜  schedules fn in MACROTASK QUEUE (not immediate)
  → Promise.resolve().then(fn)  ➜  schedules fn in MICROTASK QUEUE
  → console.log('4')  ➜  prints: 4
  Call stack: [] (empty)

After synchronous code — DRAIN MICROTASKS:
  Microtask queue has: [fn → console.log('3')]
  → console.log('3')  ➜  prints: 3
  Microtask queue: [] (empty)

(Optional) Check for render update — skip (< 16ms since last render)

Pick ONE macrotask:
  Task queue has: [fn → console.log('2')]
  → console.log('2')  ➜  prints: 2
  (Drain microtasks again — none → move on)

Final output: 1, 4, 3, 2
  ✓ Sync code runs first (1, 4)
  ✓ Microtasks run before macrotasks (3 before 2)
  ✓ setTimeout 0ms is a MACROTASK, NOT immediate
```

### Microtask Starvation (Danger Zone)

```javascript
// ⚠️ DANGER: infinite microtask chain starves rendering
function endlessPromiseChain() {
  return Promise.resolve().then(() => {
    // This schedules another microtask before it returns
    return endlessPromiseChain(); // recursive!
  });
}
endlessPromiseChain();
// The microtask queue NEVER empties
// → Browser NEVER gets to render
// → UI freezes completely
// (This is why infinite Promise recursion is worse than infinite setTimeout recursion)

// ✅ Safe: using setTimeout creates a macrotask boundary
// The browser gets a render frame between each recursive call
function chunkedProcessing(items, index = 0) {
  if (index >= items.length) return;
  processItem(items[index]);
  setTimeout(() => chunkedProcessing(items, index + 1), 0); // yields the main thread
}
```

---

## 4. The Code

### Wrong Way — Blocking the Main Thread and Queue Confusion

```typescript
// ❌ WRONG — Large synchronous computation blocks the entire main thread
// Button click handler that processes 50,000 rows
document.getElementById('processBtn').addEventListener('click', () => {
  // Synchronous loop — call stack doesn't empty until this finishes
  // During these 2000ms: NO events processed, NO renders, UI completely frozen
  const result = [];
  for (let i = 0; i < 50_000; i++) {
    result.push(heavyTransformation(data[i])); // CPU-intensive work per row
  }
  renderTable(result); // Only after ALL 50K rows processed
  // User clicks button → nothing appears to happen for 2 seconds → confused
});

// ❌ WRONG — Race condition from misunderstanding microtask/macrotask order
async function updateDashboard() {
  // Developer assumes setTimeout fires BEFORE the Promise chain
  // "Give a 0ms head start to the loading state, then fetch"
  setTimeout(() => setLoadingState(true), 0); // macrotask
  
  // But this .then() will run BEFORE the setTimeout above
  const data = await fetch('/api/stats');    // microtask chain
  setDashboardData(data);
  setLoadingState(false);
  
  // Result: dashboard data appears BEFORE loading spinner shows
  // (loading spinner was supposed to show during fetch, not after it)
}

// ❌ WRONG — Deeply nested Promises creating accidental microtask build-up
function loadUserProfile(userId: string) {
  return getUser(userId)           // Promise
    .then(user => getAvatar(user)) // microtask
    .then(avatar => getSettings(avatar.owner)) // microtask
    .then(settings => getPermissions(settings.role)) // microtask
    .then(perms => buildProfileView(perms))  // microtask
    .then(view => renderProfile(view));       // microtask
    // 5 microtasks chained — no rendering can happen between them
    // For 5 concurrent profile loads: 25 consecutive microtasks before render
}
```

> **Why this fails:** synchronous loops of ANY length block the main thread — not just "big" ones. The setTimeout/Promise ordering misconception causes race conditions where UI state updates appear out of order. Deep Promise chains prevent any rendering between logical steps in long operations.

### Right Way — Correct Queue Awareness and Long Task Splitting

```typescript
// ✅ RIGHT — Chunked processing using setTimeout to yield main thread
// Process rows in chunks, yielding control between chunks for rendering
async function processLargeDataset(data: DataRow[]): Promise<ProcessedRow[]> {
  const CHUNK_SIZE = 500; // Process 500 rows per macrotask
  const result: ProcessedRow[] = [];
  
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    
    // Process this chunk synchronously (fast, <16ms per chunk)
    for (const row of chunk) {
      result.push(heavyTransformation(row));
    }
    
    // Update progress UI — actually visible because we yield here
    updateProgress(i / data.length);
    
    // Yield to event loop: one macrotask boundary per chunk
    // Browser can render progress bar update before next chunk starts
    // Also processes any pending user input between chunks
    await yieldToMain(); // custom helper below
  }
  
  return result;
}

// The key helper: returns a Promise that resolves in a setTimeout
// This creates a macrotask boundary — the browser gets a render frame
function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
  // Modern alternative: use scheduler.yield() when available (Chrome 115+)
  // return 'scheduler' in globalThis ? scheduler.yield() : new Promise(r => setTimeout(r, 0));
}

// ✅ RIGHT — Correct async loading state management
// Show loading FIRST, then initiate the async operation
async function loadDashboardData() {
  // Synchronous — runs immediately in current task
  setLoadingState(true);
  
  // Then await — this schedules the continuation as a microtask
  // But setLoadingState(true) is ALREADY committed before any awaiting happens
  try {
    const data = await fetch('/api/dashboard/stats').then(r => r.json());
    setDashboardData(data);
  } finally {
    setLoadingState(false);
  }
  // Loading state is set synchronously → Promise fetch starts → microtasks handle data
  // Correct order: loading=true → fetch completes → data renders → loading=false
}

// ✅ RIGHT — queueMicrotask for explicit microtask scheduling
// When you need something to run after current synchronous code
// but BEFORE the next macrotask (and before any rendering)
function processWebSocketMessage(message: string) {
  // Parse immediately
  const parsed = JSON.parse(message);
  
  // Update internal state synchronously  
  this.messageBuffer.push(parsed);
  
  // Schedule actual processing as a microtask
  // — but DON'T use Promise.resolve().then() (creates an extra tick through the Promise machinery)
  // — queueMicrotask() is more explicit and direct
  queueMicrotask(() => {
    this.processMicrobatch(this.messageBuffer.splice(0));
  });
  // Result: multiple WebSocket messages in the same macrotask
  // (e.g., from a burst) are batched in the subsequent microtask 
}

// ✅ RIGHT — requestAnimationFrame for visual updates
// rAF callbacks run before the browser renders the NEXT frame
// Use for: animations, visual state that must sync with display refresh
function smoothScrollIndicator(progress: number) {
  // ❌ Don't update visual state in a setTimeout — may render between logic steps
  // ✅ Use rAF — batches with the browser's rendering pipeline
  requestAnimationFrame(() => {
    scrollIndicator.style.transform = `scaleX(${progress})`;
    // This write is batched: the browser does NOT reflow here
    // All rAF callbacks run, then ONE layout/paint cycle happens
  });
}

// ✅ RIGHT — Understanding the full tick for a click handler
function handlePaymentClick(event: MouseEvent) {
  // --- SYNCHRONOUS PART (call stack) ---
  event.preventDefault();
  setButtonState('loading');      // Updates internal state
  disableButton(event.target);   // DOM mutation
  
  // --- MICROTASK (Promise) ---
  submitPayment(formData)         // Returns a Promise
    .then(response => {
      // This runs in a microtask AFTER handlePaymentClick completes
      // But BEFORE any new DOM events or setTimeout callbacks
      setPaymentResult(response);
      setButtonState('success');
    })
    .catch(error => {
      setButtonState('error');
      showError(error.message);
    });
  
  // handlePaymentClick returns here
  // Event loop: drain microtasks (submitPayment .then/.catch)
  // Then: browser renders button state (loading → success or error)
  // The user sees the button as "loading" from the synchronous disableButton()
  // and sees "success" or "error" after the Promise resolves
}
```

```typescript
// ✅ Angular-specific: understanding change detection + event loop
// OnPush change detection works with the event loop
@Component({
  selector: 'dashboard-widget',
  template: `<div>{{ counter }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardWidgetComponent {
  counter = 0;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  // WebSocket burst handler — 100 messages may arrive as macrotasks
  handleWebSocketMessage(data: MetricData) {
    this.counter = data.value;
    
    // ❌ WRONG — calling detectChanges() on every message
    // 100 messages = 100 change detection cycles = potential frame drops
    // this.cdr.detectChanges();
    
    // ✅ RIGHT — mark for check, let Angular batch
    this.cdr.markForCheck();
    // Angular will run change detection in the next tick
    // Multiple markForCheck() calls in the same task are batched
  }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What will this code print and why?"

```javascript
console.log('start');
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
console.log('end');
```

**Hruday's answer:**
> `start`, `end`, `promise`, `timeout` — and here's the exact reason:
>
> `start` and `end` print first because they're synchronous — they run directly on the call stack, in order. Nothing deferred.
>
> The `setTimeout` with 0ms delay schedules its callback in the **macrotask queue**. The `Promise.resolve().then()` schedules its callback in the **microtask queue**.
>
> When the call stack empties (after `end` prints), the event loop drains ALL microtasks before picking up the next macrotask. So the Promise `.then()` runs before the `setTimeout` callback, printing `promise` then `timeout`.
>
> The important rule: microtasks ALWAYS drain completely after each task (including the initial script execution), and they drain BEFORE the next macrotask. `setTimeout(..., 0)` is not "instant" — it's "after microtasks and optionally a render frame."

---

### Q2 — Deep Dive
**Interviewer asks:** "What are the practical implications of this ordering for an Angular application with HTTP calls and component updates?"

**Hruday's answer:**
> In Angular, almost all asynchronous operations use Promises or Observables backed by Promises — `HttpClient` calls, `async/await`, and Zone.js-patched APIs. Zone.js wraps all macrotask APIs (setTimeout, XHR, Promise) to trigger change detection after they complete. Understanding the event loop helps in a few specific scenarios:
>
> First: when you call `this.http.get('/api/data').subscribe()`, the HTTP response comes as a macrotask (it's a network I/O event). Zone.js intercepts it and runs Angular change detection after. If you then update state in a `.then()` chain inside that subscription, you're adding microtasks that run BEFORE Zone.js can trigger change detection for the macrotask. This sometimes means multiple state updates happen before any single CD cycle runs — which is actually efficient.
>
> Second: with `async/await`, every `await` suspends execution and resumes it as a microtask. If you do `await fetch()` then `await processData()` then update your component state, all three happen as microtasks in sequence before the browser gets to render. This is usually what you want — atomic state updates.
>
> Third: the real problem I saw at Bosch was with `setInterval` for WebSocket polling. The interval callback (macrotask) was updating component state, but we had a `.then()` chain in the same handler that was finishing on the NEXT microtask drain cycle — AFTER the component had already begun rendering with the state from the macrotask. The fix was to restructure so all state mutations happened synchronously in the macrotask, with no Promise chains splitting the update into two microtask batches.

---

### Q3 — Scenario
**Interviewer asks:** "Why does `setTimeout(fn, 0)` not mean "run this immediately" and when would you intentionally use it?"

**Hruday's answer:**
> `setTimeout(fn, 0)` does NOT mean immediate. It schedules `fn` as a macrotask in the task queue. It will only run after: the current call stack empties, ALL pending microtasks drain, and potentially a render frame happens. The "0ms" means "no additional delay beyond those natural boundaries" — there's always at least one macrotask cycle of delay.
>
> Why use it intentionally?
>
> The most important use: **yielding the main thread** to allow rendering between heavy processing steps. If I have 50,000 rows to process, I split them into chunks of 500 and call `setTimeout(fn, 0)` between chunks. This creates macrotask boundaries where the browser can render a progress bar update and respond to user input (like a cancel button). Without this, the user sees a frozen UI for the entire processing time.
>
> The second use: **deferring work to after the current render cycle**. If a React component needs to read a DOM measurement that's only accurate after paint (like `getBoundingClientRect` for a tooltip position), wrapping it in `setTimeout(fn, 0)` ensures the DOM is laid out and painted before the measurement runs. `useLayoutEffect` handles this case more precisely, but `setTimeout` works for non-React code.
>
> What NOT to use it for: `setTimeout(fn, 0)` for "just to be async" or "to avoid the current synchronous execution" — there are better tools. For after-current-task microtask scheduling, use `Promise.resolve().then(fn)`.

---

### Q4 — Advanced
**Interviewer asks:** "How does the `async` and `await` syntax map onto the event loop? If you have 5 consecutive `await` calls, how many times is the event loop entered?"

**Hruday's answer:**
> `async/await` is syntactic sugar over Promises. Every `await` is a suspension point and a microtask boundary. Under the hood, `await expression` is equivalent to `expression.then(resumeFunction)`.
>
> For 5 consecutive `await` calls:
>
> ```javascript
> async function fetchAll() {
>   const a = await fetchA(); // suspension point 1 — microtask
>   const b = await fetchB(); // suspension point 2 — microtask
>   const c = await fetchC(); // suspension point 3 — microtask
>   const d = await fetchD(); // suspension point 4 — microtask
>   const e = await fetchE(); // suspension point 5 — microtask
>   return [a, b, c, d, e];
> }
> ```
>
> The function body before the first `await` runs synchronously. When `await fetchA()` is hit, execution suspends and returns. `fetchA()` completes (as a macrotask if it's a network call), and the continuation (code after `await fetchA()`) is scheduled as a microtask. That microtask runs until the next `await`, and so on.
>
> So: 5 `await` calls = 5 microtask-to-microtask transitions IF the awaited Promises resolve immediately (like `await Promise.resolve()`). But if `fetchA()` is a network request, the continuation waits for the MACROTASK (network I/O) to fire first, then the continuation runs as a microtask.
>
> Practical implication: `await` is NOT free — each one adds a microtask scheduling overhead. For hot code paths inside loops, prefer batching with `Promise.all()` over sequential awaits. But in normal application code, this overhead is negligible — the I/O latency dominates.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "setTimeout 0 is immediate" | "I use `setTimeout(fn, 0)` to run things immediately after the current code" | `setTimeout(fn, 0)` is a macrotask — it runs after ALL microtasks drain AND potentially after a render frame; `Promise.resolve().then(fn)` is the way to defer to the next microtask; `setTimeout(fn, 0)` defers to the next macrotask (which is significantly later) |
| "Promises are asynchronous" | "Promises run asynchronously so they don't block" | Promises run their `.then()` callbacks as microtasks — which run BEFORE the next macrotask and BEFORE any rendering; a deep chain of 20 resolved Promises running sequentially can block the render frame just as effectively as spinning synchronous code (all 20 `.then()` callbacks drain as microtasks before any paint) |
| "async/await is parallel" | "`async/await` lets multiple things run in parallel" | `async/await` is single-threaded; it does NOT run things in parallel; it suspends and resumes execution one step at a time; to run things in parallel use `Promise.all([fetchA(), fetchB()])` — these two fetches are fired simultaneously (both start before either awaits) instead of sequentially |
| "requestAnimationFrame timing" | "`requestAnimationFrame` is like a macrotask" | `requestAnimationFrame` is technically macro-task-tier but runs at a very specific moment — immediately before the browser renders the next frame (~16ms intervals at 60fps); it sits between "drain microtasks" and "render" in the event loop; critically, rAF callbacks are NOT processed if the browser decides to skip a frame, and they ARE coalesced — multiple `requestAnimationFrame` calls resolve to a single callback per frame |

---

## 7. Hruday's Real Experience Hook
> "At Bosch, we built a real-time manufacturing dashboard with WebSocket events arriving at 50-100 messages per second during peak production runs. Each message updated a React component's state via a Redux action, and race conditions were causing the UI to briefly display inconsistent states — old metric values alongside new ones.
>
> Debugging led me directly to the event loop. The Redux `dispatch()` was synchronous (call stack), but our middleware was doing a `Promise.resolve().then()` (microtask) to batch updates. Meanwhile, a `setInterval` (macrotask) was running to refresh a secondary timestamp display.
>
> The problem: the setInterval macrotask was updating the timestamp BETWEEN the WebSocket macrotask and its associated microtask chain. The sequence was: WebSocket message arrives (macrotask) → middleware schedules microtask for state update → setInterval fires (another macrotask) → updates timestamp → React re-renders with NEW timestamp but OLD metrics data → microtask chain completes with NEW metrics → second React re-render.
>
> Fix: moved all state mutations for a WebSocket message into synchronous code before any Promises. Used `queueMicrotask()` for the batch flush to ensure the flush ran before any setInterval callback. The `queueMicrotask()` replaced the `Promise.resolve().then()` — semantically equivalent but more explicit about the intent, and it confirmed we weren't accidentally creating resolved-Promise chains that could be delayed by other awaiting code."

---

## 8. Scale Evolution

**Simple web page →** Know: `setTimeout(fn, 0)` defers to next tick, Promises are microtasks, don't block the main thread with heavy loops. This prevents 95% of event-loop-related bugs in simple apps.

**Single-page application, product team →** Processing large datasets client-side (filtering, sorting, aggregating)? Use chunked processing with `yieldToMain()` between chunks. RxJS streams? Understand that Observable `.subscribe()` callbacks run synchronously for synchronous observables — if your RxJS chain has no async operators, it can still block the main thread. Use `observeOn(asyncScheduler)` to move Observable emissions to macrotasks.

**High-frequency data, real-time dashboard →** Need explicit control. Use `queueMicrotask()` judiciously to batch WebSocket message handlers. Consider `scheduler.postTask()` (Chrome 94+) for prioritized task scheduling — it exposes a `background` priority that truly defers to idle time, useful for analytics processing. Web Workers for heavy computation ENTIRELY OFF the main thread — they have their own event loop and message queue.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment checkout accuracy — race conditions in async state updates can show incorrect amounts or enable double submissions; event loop understanding directly prevents financial UX bugs; Interaction to Next Paint (INP) for payment button responsiveness depends on no long tasks blocking the main thread | Long task budgets (max 50ms); `Promise.all()` vs sequential `await`; main thread health for payment CTAs |
| Swiggy / Meesho | Feed pages with real-time inventory updates, live price changes, delivery tracking — all async; large datasets rendered client-side (recommendations, search results); event loop knowledge for smooth 60fps scroll while handling WebSocket updates | Non-blocking rendering of large lists; debounce/throttle with proper macro/microtask understanding; `requestAnimationFrame` for scroll handlers |
| Adobe / Microsoft | Browser-level knowledge expected at staff/senior level; Adobe's Document Cloud does heavy client-side PDF/image processing — understanding Web Workers and main thread budgets is core to the job; Microsoft's interview style includes event loop conceptual questions as an explicit filter | Web Worker message passing; scheduler API; non-blocking algorithms; `async/await` deep internals |
| SAP Labs | Bosch real-time dashboard experience — directly applicable; WebSocket ordering bug diagnosed via event loop; `queueMicrotask()` fix for burst state updates; SAP Fiori apps often have heavy data grids with client-side sorting/filtering that benefit from chunked processing | Real production examples of event loop debugging; Angular change detection + Zone.js interaction with microtasks; Observable scheduler understanding |

---

## 10. Related Topics — What to Study Next

- **Topic 205 — Critical Rendering Path** — the rendering pipeline is the visual complement to the event loop; render frames happen between macrotasks specifically; understanding that rendering is interleaved with macrotasks (not between every microtask) explains why heavy microtask chains starve the renderer; together, Topic 205 and 206 form the complete picture of how browsers handle JavaScript and rendering
- **Topic 208 — Web Workers and Service Workers** — Web Workers solve the single-thread limitation explored in this topic by running JavaScript on a separate thread with its own event loop; message passing (`postMessage`) between main thread and worker creates macrotask boundaries; understanding when to move work to a Web Worker requires knowing what constitutes a "Long Task" (>50ms) on the main thread
- **Topic 211 — React 18 Concurrent Mode and Suspense** — React 18's concurrent rendering model works WITH the event loop rather than against it; `startTransition` marks low-priority updates so React can yield the main thread between render chunks; `useDeferredValue` postpones expensive renders to idle macrotask time; these APIs are implementations of the "yield the main thread" pattern using React's own scheduler (which uses `MessageChannel` as a macrotask source)
- **Topic 222 — takeUntil Memory Leak Prevention** — Observable subscriptions that don't unsubscribe continue to receive events and schedule microtasks indefinitely; memory leaks in RxJS are partly an event loop problem — leaked subscriptions process microtasks for events that no component cares about anymore

---

*Part 12 · Event Loop — Microtasks vs Macrotasks · Full Stack Interview Guide · Hruday D · 2026*
