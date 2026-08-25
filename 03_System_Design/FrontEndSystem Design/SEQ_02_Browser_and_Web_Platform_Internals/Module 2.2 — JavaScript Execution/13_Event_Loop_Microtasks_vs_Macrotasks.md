# 13. Event Loop (Microtasks vs Macrotasks)

---

## 1. High-Level Explanation (Frontend Interview Level)

The **Event Loop** is the mechanism that enables JavaScript's single-threaded runtime to handle asynchronous operations — timers, network requests, user input, and Promises — without requiring multiple threads. It continuously monitors the call stack and two queues, deciding what to run next.

**The three actors:**
1. **Call Stack** — Currently executing synchronous JavaScript
2. **Microtask Queue** — High-priority callbacks: Promises (`.then`/`.catch`/`.finally`), `async/await`, `queueMicrotask()`, `MutationObserver` callbacks
3. **Macrotask Queue (Task Queue)** — Lower-priority callbacks: `setTimeout`, `setInterval`, `setImmediate` (Node.js), I/O callbacks, UI event handlers (`click`, `input`), `requestAnimationFrame` (special case)

**The Event Loop algorithm (simplified):**
```
while (true) {
  // 1. Run one macrotask (or the initial script execution)
  if (callStack.isEmpty() && macrotaskQueue.hasTask()) {
    callStack.push(macrotaskQueue.dequeue());
    execute();
  }
  
  // 2. Run ALL microtasks (including new ones added during microtask execution)
  while (microtaskQueue.hasTask()) {
    callStack.push(microtaskQueue.dequeue());
    execute();
  }
  
  // 3. Render (if needed, browser decides)
  if (renderingNeeded) { render(); }
  
  // Repeat
}
```

**Key rule:** After every macrotask (including the initial script), ALL pending microtasks are drained completely before the next macrotask runs, and before the browser renders.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Macrotask Queue (Task Queue)

Sources of macrotasks:
- `setTimeout(fn, delay)` — Minimum delay is the actual delay; in inactive tabs, Chrome throttles to 1000ms
- `setInterval(fn, delay)` — Repeated macrotask
- DOM event handlers (`addEventListener` callbacks) — Each event = one macrotask
- `requestAnimationFrame` — Technically a "rendering task" not a macrotask, but behaves similarly; fires before paint
- `MessageChannel.port.onmessage` — Used by React's scheduler for high-priority scheduling
- `fetch` callbacks (network I/O completion) — These are actually microtasks in modern spec (`.then()` on fetch response)

**One macrotask per loop iteration.** The browser picks one macrotask from the queue and executes it completely (run-to-completion). Long macrotasks (>50ms) are "long tasks" that block rendering.

### Microtask Queue

Sources of microtasks:
- `Promise.then()`, `.catch()`, `.finally()`
- `async/await` (the `await` continuation is a microtask)
- `queueMicrotask(fn)`
- `MutationObserver` callbacks
- `IntersectionObserver` callbacks (spec varies by browser)

**All microtasks run before the next macrotask.** If a microtask schedules another microtask, that too runs before any macrotask. This can be dangerous — an infinite microtask loop will starve the event loop and freeze the browser:

```javascript
// DANGEROUS: infinite microtask loop — browser freezes
function infiniteMicrotasks() {
  Promise.resolve().then(infiniteMicrotasks);
}
infiniteMicrotasks();
```

### The Full Event Loop Step-by-Step

```
Initial script executes (one macrotask)
    ↓
Script schedules: setTimeout(A, 0), Promise.resolve().then(B), queueMicrotask(C)
    ↓
Script finishes → Call Stack empty
    ↓
EVENT LOOP TICK:
  1. Drain microtask queue: B runs, C runs (in order added)
     - If B or C schedule more microtasks, they run HERE too
  2. Render frame if needed (browser schedules ~60fps)
  3. Pick next macrotask: A runs
    ↓
After A:
  1. Drain microtask queue again (anything A scheduled)
  2. Render
  3. Next macrotask (another setTimeout, click event, etc.)
```

### requestAnimationFrame Position in the Loop

`rAF` is NOT a macrotask or microtask. It's part of the **rendering steps** which occur between macrotask execution and before the next macrotask:

```
[Macrotask] → [Microtasks] → [rAF callbacks] → [Render] → [Microtasks] → [Macrotask]
```

**This is why `rAF` is ideal for visual updates** — it runs at the exact point in the loop when the browser is about to render, and the work you do there is included in the current frame.

### async/await Desugaring

`async/await` is syntactic sugar over Promises and uses microtasks:

```javascript
async function fetchUser() {
  const response = await fetch('/api/user'); // Checkpoint 1
  const data = await response.json();       // Checkpoint 2
  return data;
}

// Equivalent to:
function fetchUser() {
  return fetch('/api/user').then(response => {  // Microtask after fetch
    return response.json().then(data => {        // Microtask after json
      return data;
    });
  });
}
```

Each `await` suspends the async function and schedules the continuation as a microtask. When the awaited Promise resolves, the continuation is enqueued in the microtask queue.

### Execution Order Exercise (Common Interview Question)

```javascript
console.log('1');                          // Sync

setTimeout(() => console.log('2'), 0);    // Macrotask

Promise.resolve().then(() => {
  console.log('3');                        // Microtask
  queueMicrotask(() => console.log('4')); // Microtask inside microtask
});

console.log('5');                          // Sync

// Output: 1, 5, 3, 4, 2
```

**Explanation:**
- `1` and `5` are synchronous → run immediately in the initial script
- After script: microtask queue drains → `3` runs, which enqueues `4` (microtask), `4` runs
- Then macrotask: `2` runs from setTimeout queue

### Browser Rendering and the Event Loop

The browser's rendering pipeline (style → layout → paint → composite) runs as part of the rendering step between event loop ticks. A long macrotask delays this rendering step, causing:
- **Jank** in animations (dropped frames)
- **Frozen UI** (clicks/inputs not processed while task runs)
- **High INP** (Interaction to Next Paint) — the 2024 Core Web Vital

**This is the fundamental reason 50ms is the "long task" threshold** — 50ms tasks within a 16.7ms frame budget blow the frame budget 3x over, causing visible jank.

### React Scheduler and the Event Loop

React's custom scheduler (`react-scheduler` package) uses the Event Loop intentionally:

```javascript
// React Scheduler uses MessageChannel to schedule between macrotasks
// This allows the browser to render between React work chunks

const channel = new MessageChannel();
channel.port1.onmessage = performWork; // Macrotask

function scheduleWork() {
  channel.port2.postMessage(null); // Triggers macrotask
}

function performWork() {
  // Do a small chunk of React reconciliation
  // Check deadline
  if (shouldYield()) {
    scheduleWork(); // Requeue as next macrotask, browser can render
  } else {
    continueWork();
  }
}
```

By chunking work across macrotasks, React gives the browser rendering steps between each chunk — enabling concurrent rendering and responsive UIs even during large re-renders.

---

## 3. Real-World Examples

### React 18 Concurrent Mode
React 18's `startTransition` marks certain state updates as "interruptible". The scheduler queues transition updates as lower-priority macrotasks, allowing urgent updates (like typing) — which are microtasks/high-priority macrotasks — to cut in line. This is direct exploitation of the event loop's priority model.

### Node.js HTTP Server (Same Model)
The Event Loop is also why Node.js handles 10,000+ concurrent connections with a single thread — each connection's I/O callback is a macrotask, and the loop processes them interleaved with incoming requests. Understanding this explains why CPU-bound work in Node.js blocks all connections.

### Debounce / Throttle Implementation
`debounce` uses `setTimeout` (macrotask scheduling) to delay execution. The Event Loop model explains exactly why `debounce(fn, 300)` works: `clearTimeout` cancels the scheduled macrotask before it fires.

### Promise Anti-Pattern at Scale
In a large e-commerce checkout flow, chaining 20+ `.then()` calls to process an order creates 20+ microtask queue entries. These all run synchronously within one event loop iteration, potentially blocking render if each `.then()` does heavy computation. The fix is to chunk work across macrotasks or use Web Workers.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"The Event Loop is how JavaScript achieves concurrency on a single thread. The core rule is: after each macrotask completes, ALL pending microtasks are drained before the browser renders and before the next macrotask executes.*

*Macrotasks include setTimeout callbacks, DOM event handlers, and MessageChannel messages. Microtasks include Promise continuations and queueMicrotask callbacks. Because microtasks drain completely between macrotasks, a chain of Promise callbacks runs atomically — no render, no user input handling interrupts them.*

*requestAnimationFrame fires during the rendering step, after microtasks and before the next paint — makes it ideal for visual work. Long tasks (>50ms) block this rendering step, causing dropped frames and high INP scores.*

*React 18's concurrent renderer exploits the Event Loop by splitting reconciliation work across multiple macrotasks via MessageChannel. This lets the browser render between React work chunks, keeping the UI responsive during heavy re-renders. That's the architectural motivation behind `startTransition` and `Suspense`."*

### Likely Follow-up Questions

1. **"What's the execution order: `setTimeout(0)`, `Promise.then()`, synchronous code?"**
   → Sync code first, then Promise.then (microtask), then setTimeout (macrotask). Demo with classic ordering puzzle.

2. **"Can microtasks starve the event loop?"**
   → Yes. A microtask that enqueues another microtask recursively will drain all microtasks forever, preventing macrotasks and rendering. This is equivalent to an infinite synchronous loop for the event loop.

3. **"How does React's `startTransition` relate to the event loop?"**
   → `startTransition` marks work as interruptible low-priority. React's scheduler queues it as deferred macrotasks, allowing high-priority updates (like input handling) to process first.

4. **"Why does `rAF` produce smoother animations than `setTimeout(fn, 16)`?"**
   → `rAF` fires at precisely the right point in the event loop's rendering step, synchronized with the display refresh rate. `setTimeout(fn, 16)` is a macrotask with imprecise timing — it fires when the event loop gets to it, which may be after the render window has already passed.

---

## 5. Code Examples

### Event Loop Order Demonstration

```javascript
// Classic event loop ordering puzzle — understand this cold
console.log('Script start');         // 1: Sync

setTimeout(() => {
  console.log('setTimeout');         // 7: Macrotask (last)
}, 0);

Promise.resolve()
  .then(() => {
    console.log('Promise 1');        // 3: Microtask
    return Promise.resolve();
  })
  .then(() => {
    console.log('Promise 2');        // 4: Microtask (chained)
  });

queueMicrotask(() => {
  console.log('queueMicrotask');     // 5: Microtask
});

async function asyncFn() {
  console.log('async start');        // 2: Sync (async function body is sync until first await)
  await Promise.resolve();
  console.log('after await');        // 6: Microtask (continuation)
}

asyncFn();

console.log('Script end');           // (last sync before microtasks)

// Output: Script start, async start, Script end, Promise 1, queueMicrotask, after await, Promise 2, setTimeout
```

### Yielding to the Browser with Scheduler API

```javascript
// Modern approach: use the Scheduler API (progressive enhancement)
// Yields control back to the browser between work chunks

async function processLargeList(items) {
  const results = [];
  
  for (let i = 0; i < items.length; i++) {
    // Yield every 100 items to let browser render
    if (i % 100 === 0) {
      await scheduler.yield(); // Chromium 115+ — yields to event loop
      // Falls back to: await new Promise(r => setTimeout(r, 0));
    }
    results.push(heavyProcess(items[i]));
  }
  
  return results;
}

// Polyfill for scheduler.yield()
const yieldToMain = () => {
  if ('scheduler' in window && 'yield' in scheduler) {
    return scheduler.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
};
```

### Using rAF for Smooth Animations

```javascript
// BAD: setTimeout for animation — imprecise timing
let pos = 0;
function animateBad() {
  pos += 2;
  element.style.left = pos + 'px';
  setTimeout(animateBad, 16); // Not frame-synchronized!
}

// GOOD: rAF — frame synchronized, auto-pauses on hidden tabs
let pos = 0;
let rafId;

function animateGood(timestamp) {
  pos += 2;
  element.style.transform = `translateX(${pos}px)`; // Composited — no layout
  rafId = requestAnimationFrame(animateGood);
}

rafId = requestAnimationFrame(animateGood);

// Cleanup
cancelAnimationFrame(rafId);
```

---

## 6. Why & How Summary

**Why it matters:**
The Event Loop's microtask/macrotask distinction determines UI responsiveness. Long synchronous work (or excessive microtask chains) blocks the browser's rendering step, causing jank and high INP. React Fiber, scheduler APIs, and debounce/throttle patterns all exist to manage tasks within the Event Loop's constraints. Every `async/await` pattern, every Promise chain, every UI event handler is subject to the same loop — understanding it enables you to reason about exactly why certain code causes UI freezes and how to fix them with architectural changes.

**How it works:**
The Event Loop runs continuously. Each iteration: (1) dequeue one macrotask and run it to completion; (2) drain the entire microtask queue (including any microtasks added during microtask execution); (3) execute the rendering pipeline (rAF callbacks → style → layout → paint → composite) if a frame is needed; (4) repeat. Microtasks have higher priority than macrotasks and rendering — they run between every macrotask. `async/await` suspends the function at each `await` and schedules the continuation as a microtask when the awaited Promise resolves. This model enables concurrent asynchronous operations with deterministic execution ordering.
