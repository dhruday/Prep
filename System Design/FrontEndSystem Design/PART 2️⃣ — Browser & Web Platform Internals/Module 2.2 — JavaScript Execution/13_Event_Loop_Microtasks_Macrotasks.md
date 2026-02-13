# 13. Event Loop (Microtasks vs Macrotasks)

## 1. High-Level Explanation (Frontend Interview Level)

**Event Loop** is the mechanism that coordinates asynchronous JavaScript execution by managing the Call Stack, Task Queue (macrotasks), and Microtask Queue—understanding task priority is critical for predicting execution order and avoiding blocking the Main Thread.

- **What**: Call Stack → Microtasks (Promises, MutationObserver) → Macrotasks (setTimeout, I/O) → Render
- **Why**: JavaScript is single-threaded but non-blocking through event-driven async execution
- **When**: All async operations (fetch, setTimeout, Promises, event handlers)
- **Role**: Core of async JavaScript—explains Promise resolution timing, RAF timing, render blocking

**Key Principle**: "Microtasks run before macrotasks, render happens between macrotasks."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Event Loop Mechanism

**Complete Event Loop Cycle**:
```
1. Execute Call Stack (synchronous code)
   └── Run until empty

2. Process ALL Microtasks (FIFO)
   ├── Promise callbacks (.then, .catch, .finally)
   ├── queueMicrotask()
   ├── MutationObserver callbacks
   └── Process until Microtask Queue empty
   
3. Check if render needed (60fps = every ~16ms)
   ├── Yes → Render Pipeline
   │   ├── requestAnimationFrame callbacks
   │   ├── Style calculation
   │   ├── Layout
   │   ├── Paint
   │   └── Composite
   └── No → Skip to step 4

4. Process ONE Macrotask (oldest first)
   ├── setTimeout / setInterval callbacks
   ├── setImmediate (Node.js)
   ├── I/O operations
   ├── UI events (click, scroll, input)
   └── requestIdleCallback
   
5. Back to step 2 (process microtasks again)
```

**Visual Timeline**:
```
Call Stack: [syncCode] → empty
↓
Microtasks: [promise1, promise2] → empty
↓
Render?: Check if 16ms passed → Yes/No
↓
Macrotask: [setTimeout1] → execute → empty
↓
Microtasks: [newPromise] → empty
↓
Render?: Check again
↓
Macrotask: [setTimeout2] → execute
↓
... repeat ...
```

---

### Microtasks vs Macrotasks

**Microtasks** (high priority, run immediately after Call Stack):
```javascript
// 1. Promise callbacks
Promise.resolve().then(() => console.log('Promise'));

// 2. queueMicrotask
queueMicrotask(() => console.log('Microtask'));

// 3. MutationObserver
const observer = new MutationObserver(() => {
  console.log('DOM changed');
});
observer.observe(document.body, { childList: true });

// 4. async/await (syntactic sugar for Promises)
async function foo() {
  console.log('Async');
}
foo();
```

**Macrotasks** (lower priority, run one per loop):
```javascript
// 1. setTimeout / setInterval
setTimeout(() => console.log('Timeout'), 0);

// 2. setImmediate (Node.js only)
setImmediate(() => console.log('Immediate'));

// 3. I/O operations
fetch('/api').then(() => console.log('Fetch'));

// 4. UI events
button.addEventListener('click', () => console.log('Click'));

// 5. requestIdleCallback
requestIdleCallback(() => console.log('Idle'));
```

**Priority Order**:
```
1. Call Stack (synchronous)
2. Microtasks (ALL, before next macrotask)
3. Render (if 16ms passed)
4. Macrotask (ONE, then back to microtasks)
```

---

### Execution Order Examples

**Example 1: Basic Order**:
```javascript
console.log('1: Sync start');

setTimeout(() => console.log('2: Timeout'), 0);

Promise.resolve().then(() => console.log('3: Promise'));

console.log('4: Sync end');

// Output:
// 1: Sync start
// 4: Sync end
// 3: Promise (microtask)
// 2: Timeout (macrotask)

// Explanation:
// 1. Sync code runs first (Call Stack)
// 2. All microtasks run (Promise)
// 3. Macrotasks run one at a time (setTimeout)
```

**Example 2: Nested Promises**:
```javascript
console.log('1: Start');

Promise.resolve()
  .then(() => {
    console.log('2: Promise 1');
    
    Promise.resolve().then(() => {
      console.log('3: Nested Promise');
    });
  })
  .then(() => {
    console.log('4: Promise 2');
  });

setTimeout(() => console.log('5: Timeout'), 0);

console.log('6: End');

// Output:
// 1: Start
// 6: End
// 2: Promise 1
// 3: Nested Promise
// 4: Promise 2
// 5: Timeout

// Explanation:
// - Sync code (1, 6)
// - ALL microtasks (2, 3, 4) before ANY macrotask
// - Macrotask (5)
```

**Example 3: Microtask Loop (Infinite)**:
```javascript
function recursiveMicrotask() {
  queueMicrotask(() => {
    console.log('Microtask');
    recursiveMicrotask(); // Schedules another microtask
  });
}

recursiveMicrotask();

setTimeout(() => {
  console.log('Timeout'); // NEVER RUNS!
}, 0);

// Output:
// Microtask
// Microtask
// Microtask
// ... (infinite)

// Problem: Microtasks run until queue empty
// Recursive microtask = queue never empty
// Macrotask (setTimeout) never runs
// Page FREEZES (no render, no events)
```

---

### requestAnimationFrame (RAF)

**Render Loop Timing**:
```javascript
console.log('1: Sync');

requestAnimationFrame(() => {
  console.log('2: RAF');
});

Promise.resolve().then(() => {
  console.log('3: Promise');
});

setTimeout(() => {
  console.log('4: Timeout');
}, 0);

// Output (60fps, ~16ms render):
// 1: Sync
// 3: Promise (microtask)
// 4: Timeout (macrotask)
// 2: RAF (before render, ~16ms later)

// Timeline:
// 0ms:  Sync code
// 0ms:  Microtask (Promise)
// 0ms:  Macrotask (Timeout)
// 16ms: RAF callback (before render)
// 16ms: Render (style, layout, paint)
```

**RAF vs setTimeout**:
```javascript
// ❌ BAD: setTimeout for animation (not synced with display)
function animate() {
  element.style.left = x + 'px';
  setTimeout(animate, 16); // Tries 60fps, but not synced
}

// ✅ GOOD: RAF synced with display refresh (60fps)
function animate() {
  element.style.left = x + 'px';
  requestAnimationFrame(animate);
}

// RAF benefits:
// 1. Synced with display refresh (no tearing)
// 2. Paused when tab hidden (saves CPU)
// 3. Batched with render (no layout thrashing)
```

---

### Render Timing

**When Browser Renders**:
```
Render happens if:
1. 16ms passed (60fps)
2. AND no long-running task
3. AND microtasks empty
4. AND macrotask complete
```

**Blocking Render**:
```javascript
// ❌ BLOCKS RENDER: Long microtask loop
Promise.resolve().then(function recursive() {
  // Heavy computation
  for (let i = 0; i < 1000000; i++) {}
  
  Promise.resolve().then(recursive);
});
// Microtasks never empty → No render → Page frozen

// ✅ ALLOWS RENDER: Yield with macrotask
function recursive() {
  // Heavy computation
  for (let i = 0; i < 1000000; i++) {}
  
  setTimeout(recursive, 0); // Macrotask → Allows render between calls
}
recursive();
```

---

### Task Queue Starvation

**Problem**: Too many microtasks delay macrotasks and rendering:
```javascript
// ❌ BAD: Microtask-heavy pattern
async function processItems(items) {
  for (const item of items) {
    await processItem(item); // Each await = microtask
  }
  // 10,000 items = 10,000 microtasks before ANY macrotask
  // UI events (clicks) delayed until all microtasks complete
}

// ✅ GOOD: Yield periodically
async function processItems(items) {
  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);
    
    // Yield every 50 items (allow macrotasks + render)
    if (i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

---

### MutationObserver (Microtask)

**Batching DOM Changes**:
```javascript
const observer = new MutationObserver((mutations) => {
  console.log('DOM changed:', mutations.length, 'mutations');
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Make 100 DOM changes synchronously
for (let i = 0; i < 100; i++) {
  const div = document.createElement('div');
  document.body.appendChild(div);
}

// Output (after sync code):
// DOM changed: 100 mutations

// Explanation:
// MutationObserver batches all sync DOM changes
// Fires ONCE as microtask (after Call Stack empty)
// Efficient: 1 callback instead of 100
```

---

### What NOT to Do

- ❌ **Recursive microtasks** (blocks render forever)
- ❌ **setTimeout(fn, 0) for animations** (use RAF)
- ❌ **Long microtask chains** (delays macrotasks + render)
- ❌ **Assume setTimeout(fn, 0) runs immediately** (waits for microtasks)
- ❌ **Forget microtasks run before render** (can block rendering)

---

## 3. Clear Real-World Examples

### Example 1: React – Batching State Updates

**Problem**: Multiple state updates triggered multiple renders.

**Before** (React 17):
```javascript
function handleClick() {
  setCount(count + 1);  // Render 1
  setName('Alice');     // Render 2
  setAge(30);           // Render 3
  // 3 renders!
}
```

**After** (React 18, automatic batching):
```javascript
function handleClick() {
  setCount(count + 1);
  setName('Alice');
  setAge(30);
  // All batched into 1 microtask → 1 render
}

// React uses microtasks (queueMicrotask) to batch updates
// All setState calls in same tick → Single render
```

**Result**: 3x fewer renders, better performance.

---

### Example 2: Gmail – Optimistic UI with Microtasks

**Challenge**: Show "Sent" immediately, but email send takes 200ms.

**Implementation**:
```javascript
async function sendEmail(email) {
  // 1. Optimistic UI update (sync)
  showSentStatus(email);
  
  // 2. Network request (macrotask)
  try {
    await fetch('/send', { method: 'POST', body: email });
    
    // 3. Confirm (microtask, runs before next render)
    Promise.resolve().then(() => {
      confirmSent(email);
    });
  } catch (error) {
    // 4. Rollback (microtask)
    Promise.resolve().then(() => {
      showError(email);
    });
  }
}

// Timeline:
// 0ms:   showSentStatus (sync)
// 0ms:   fetch starts (macrotask scheduled)
// 16ms:  Render (user sees "Sent")
// 200ms: fetch resolves (microtask: confirmSent)
// 216ms: Render (confirmation)
```

**Result**: Instant feedback (0ms), confirmed in 200ms.

---

### Example 3: Twitter – Scroll Performance

**Problem**: Infinite scroll triggered too many renders during fast scrolling.

**Before**:
```javascript
window.addEventListener('scroll', () => {
  if (nearBottom()) {
    loadMoreTweets(); // Triggers on every scroll event
  }
});
// 60 scroll events/sec → 60 loadMoreTweets calls → Janky
```

**After** (RAF + throttle):
```javascript
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      if (nearBottom()) {
        loadMoreTweets();
      }
      ticking = false;
    });
    ticking = true;
  }
});
// Max 60 checks/sec (synced with render) → Smooth
```

**Result**: Smooth scrolling, no janky frames.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain the Event Loop and difference between microtasks and macrotasks."

**Answer**:

"The Event Loop coordinates async JavaScript through **5 steps**:

**Event Loop Cycle**:
```
1. Execute Call Stack (sync code, until empty)
2. Process ALL Microtasks (until queue empty)
3. Render (if 16ms passed, 60fps)
4. Process ONE Macrotask
5. Back to step 2 (microtasks again)
```

**Microtasks (high priority)**:
- Promise callbacks (`.then`, `.catch`, `.finally`)
- `queueMicrotask()`
- `MutationObserver`
- `async/await` (syntactic sugar for Promises)

**Macrotasks (lower priority)**:
- `setTimeout` / `setInterval`
- `setImmediate` (Node.js)
- I/O operations (`fetch`)
- UI events (click, scroll)
- `requestIdleCallback`

**Key Differences**:

1. **Priority**: ALL microtasks run before ANY macrotask
2. **Batching**: Microtasks processed in batch, macrotasks one at a time
3. **Render**: Happens AFTER microtasks, BETWEEN macrotasks

**Execution Order Example**:
```javascript
console.log('1: Sync');

setTimeout(() => console.log('2: Timeout'), 0);

Promise.resolve().then(() => console.log('3: Promise'));

console.log('4: Sync');

// Output:
// 1: Sync
// 4: Sync
// 3: Promise (microtask, before macrotask)
// 2: Timeout (macrotask)
```

**requestAnimationFrame**:
- Runs BEFORE render (after microtasks, before paint)
- Synced with display refresh (60fps)
- Paused when tab hidden (saves CPU)

```javascript
requestAnimationFrame(() => {
  console.log('RAF'); // Before render
});

Promise.resolve().then(() => {
  console.log('Promise'); // Runs first
});

// Output:
// Promise (microtask)
// RAF (before render, ~16ms later)
```

**Common Pitfalls**:

**1. Recursive Microtasks (Infinite Loop)**:
```javascript
function recurse() {
  queueMicrotask(recurse); // Never yields
}
recurse();
// Microtask queue never empty → No macrotasks → No render → FROZEN
```

**2. Microtask Starvation**:
```javascript
// ❌ BAD: 10,000 microtasks before render
for (let i = 0; i < 10000; i++) {
  Promise.resolve().then(() => work());
}
// UI frozen during microtask processing

// ✅ GOOD: Yield periodically
async function process() {
  for (let i = 0; i < 10000; i++) {
    await work();
    
    if (i % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

**3. setTimeout(fn, 0) Not Immediate**:
```javascript
setTimeout(() => console.log('Timeout'), 0);
Promise.resolve().then(() => console.log('Promise'));

// Output:
// Promise (microtask first)
// Timeout (macrotask, minimum 4ms delay)
```

**Real-World Examples**:

**React 18**: Batches state updates in microtasks → 1 render instead of multiple.

**Gmail**: Optimistic UI with microtasks → Instant feedback, confirmed in 200ms.

**Twitter**: RAF + throttle for scroll → Smooth 60fps, no janky frames.

**Trade-offs**:

- **Microtasks**: Fast (runs immediately), but can block render if too many
- **Macrotasks**: Allows render between tasks, but slower (queued)
- **RAF**: Synced with render (smooth animations), but max 60fps

**Follow-up I Expect**:

Q: 'Why does setTimeout(fn, 0) have a minimum 4ms delay?'
A: HTML spec minimum (browsers enforce). Nested timeouts (>5 levels) increase to 4ms. Not truly 0ms, just 'as soon as possible after microtasks.'

Q: 'How would you prevent microtask queue starvation?'
A: Periodically yield with `setTimeout(fn, 0)` (macrotask) to allow render + event processing. Balance responsiveness (microtasks fast) with UI smoothness (render frequently).

Q: 'When would you use queueMicrotask vs setTimeout?'
A: `queueMicrotask` for high-priority work that must complete before render (e.g., batching state updates). `setTimeout` for lower-priority work that can be delayed (e.g., analytics, logging)."

---

## 6. Why & How Summary

### Why It Matters

**Execution Order**: Understanding task priority prevents bugs (Promise before setTimeout)  
**Performance**: Microtask starvation blocks UI (frozen page), RAF syncs with render (smooth 60fps)  
**Async Patterns**: Foundation of Promises, async/await, event handling

### How It Works

**Event Loop**: Call Stack → ALL Microtasks → Render (if 16ms) → ONE Macrotask → Repeat  
**Microtasks**: Promise callbacks, queueMicrotask, MutationObserver (high priority, batch processed)  
**Macrotasks**: setTimeout, I/O, UI events (lower priority, one per loop)  
**RAF**: Runs before render, synced with 60fps display refresh  
**Render Blocking**: Too many microtasks or long tasks prevent render (frozen UI)

**FAANG Expectation**: Explain full event loop cycle, microtask vs macrotask priority, RAF timing, execution order examples (Promise vs setTimeout), pitfalls (recursive microtasks, starvation), real-world patterns (React batching, optimistic UI, RAF for animations), when to yield (setTimeout for macrotask), profiling with Performance API
