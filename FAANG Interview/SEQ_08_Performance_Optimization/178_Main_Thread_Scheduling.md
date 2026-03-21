# 178. Main Thread Scheduling
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"The browser's main thread is the single-threaded environment where JavaScript executes, the DOM is mutated, layout is calculated, and styles are applied. Everything that affects the user's visible experience runs on the main thread. When JavaScript runs for more than 50ms without yielding, it becomes a 'long task' — the browser can't respond to user input, scroll smoothly, or run animations during that time. Users experience this as freezing, clicking on buttons that don't respond, or janky animations. Main thread scheduling is the discipline of structuring work to avoid monopolizing the thread: break long tasks into smaller chunks, yield between chunks, prioritize user-interaction tasks above background work, and push truly parallelizable work to Web Workers. At SAP, our product catalog's filter function processed 5,000 items synchronously in one 340ms long task. Every filter keystroke blocked the entire app for 340ms. After chunking the processing with `setTimeout(0)` yields, we held main thread time below 16ms per chunk, making the filter feel instant while the full result set accumulated in the background."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Main Thread Model

```
Main Thread Timeline:
┌─────────────────────────────────────────────────────────────────┐
│ Task Queue (macro tasks)                                         │
│ [Script] [setTimeout] [click event] [XMLHttpRequest] [...] │
└─────────────────────────────────────────────────────────────────┘
                    ↓ Event Loop picks next task
┌──────────────────────────────────────┐
│ Execute Task (e.g., click handler)   │ ← Main thread BLOCKED
│                                      │   NO rendering
│  JS runs...                          │   NO input processing
│  DOM mutations pending...            │   NO scrolling
└──────────────────────────────────────┘
                    ↓ Task complete
          ┌─────────────────────┐
          │ Microtask Checkpoint │ (Promises, MutationObserver)
          └─────────────────────┘
                    ↓
          ┌──────────────────────┐
          │ Render Step (16.7ms) │ requestAnimationFrame, Style, Layout, Paint
          └──────────────────────┘
                    ↓ Picks next macro task
```

**50ms threshold:** Google defines a "long task" as any task that exceeds 50ms. Beyond 50ms, users perceive the page as unresponsive. The 50ms budget for any given task breaks down:
```
50ms budget per task:
├── ~16ms for JavaScript logic
├── ~16ms for rendering (style + layout + paint)
└── ~18ms overhead (task scheduling, housekeeping)
```

### Scheduling APIs Comparison

```
API                     | Priority    | When it runs          | Good for
─────────────────────────────────────────────────────────────────────────────────
setTimeout(fn, 0)        | Macro task  | After current task    | Chunking long work
requestAnimationFrame    | Before next | Before browser paint  | Visual animations
requestIdleCallback      | Idle        | Browser truly idle    | Non-critical work
scheduler.postTask()     | Configurable| Priority queue        | Structured scheduling
scheduler.yield()        | Yield point | After current task    | Cooperative yielding
queueMicrotask           | Microtask   | After current task    | Async-like, no yield
```

### Technique 1 — setTimeout(0) for Chunking

```typescript
// ❌ BEFORE: 340ms long task — blocks entire main thread
function filterProducts(products: Product[], query: string): Product[] {
  return products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.description.toLowerCase().includes(query) ||
    p.tags.some(t => t.includes(query))
  );
}
// When called: single 340ms long task for 5,000 items

// ✅ AFTER: chunked processing with yield points
function filterProductsChunked(
  products: Product[],
  query: string,
  onComplete: (results: Product[]) => void,
  chunkSize = 200,
): void {
  const results: Product[] = [];
  let index = 0;

  function processChunk(): void {
    const end = Math.min(index + chunkSize, products.length);

    for (let i = index; i < end; i++) {
      const p = products[i];
      if (
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some(t => t.includes(query))
      ) {
        results.push(p);
      }
    }

    index = end;

    if (index < products.length) {
      // Yield control to the browser — allows input and rendering between chunks
      // Each chunk = 200 items ≈ 13ms (well under 50ms budget)
      setTimeout(processChunk, 0);
    } else {
      onComplete(results);
    }
  }

  processChunk();
}
```

### Technique 2 — requestIdleCallback for Background Work

```typescript
// Tasks that should run only when browser has spare time:
// - Prefetching next page data
// - Analytics event batching
// - Cache warming
// - Spell-check, grammar analysis
// - Non-critical localStorage writes

function scheduleNonCriticalWork(task: () => void, timeout = 2000): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      (deadline) => {
        // deadline.timeRemaining(): how many ms the browser has before it needs
        // to do something else; typically 10–50ms
        if (deadline.timeRemaining() > 5) {
          task();
        } else {
          // Not enough time — reschedule for next idle period
          scheduleNonCriticalWork(task, timeout);
        }
      },
      { timeout } // Force execution after timeout ms even if never fully idle
    );
  } else {
    // Fallback: setTimeout is the best polyfill
    setTimeout(task, 200);
  }
}

// Usage: Prefetch product recommendations without blocking user interactions
scheduleNonCriticalWork(() => {
  prefetchRecommendations(currentProductId);
});

// Usage: Batch analytics events
scheduleNonCriticalWork(() => {
  flushAnalyticsQueue();
});
```

### Technique 3 — requestAnimationFrame for Visual Work

```typescript
// requestAnimationFrame runs just before the browser paints a new frame
// Perfect for: animations, canvas drawing, DOM reads before layout, scroll handlers

class SmoothScroller {
  private isScrolling = false;
  private targetY = 0;
  private currentY = 0;
  private rafId: number | null = null;

  scrollTo(y: number): void {
    this.targetY = y;
    if (!this.isScrolling) {
      this.isScrolling = true;
      this.animate();
    }
  }

  private animate = (): void => {
    // Lerp: move 10% of remaining distance each frame (easing)
    this.currentY += (this.targetY - this.currentY) * 0.1;
    window.scrollTo(0, this.currentY);

    if (Math.abs(this.targetY - this.currentY) > 1) {
      this.rafId = requestAnimationFrame(this.animate);
    } else {
      this.isScrolling = false;
      this.rafId = null;
    }
  };

  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

// requestAnimationFrame for DOM read batching (avoid layout thrashing)
function readDOMThenWrite(elements: HTMLElement[]): void {
  requestAnimationFrame(() => {
    // READ phase: all DOM reads in one batch (no layout recalculation between reads)
    const widths = elements.map(el => el.offsetWidth);

    // WRITE phase: DOM writes happen after all reads (browser can batch recalculation)
    elements.forEach((el, i) => {
      el.style.height = `${widths[i]}px`; // square elements
    });
  });
}
```

### Technique 4 — Web Workers for CPU-Intensive Work

Some tasks are genuinely too expensive for the main thread no matter how you schedule them:

```typescript
// main.ts — create worker and send work
const worker = new Worker(new URL('./data.worker.ts', import.meta.url));

worker.onmessage = ({ data }: MessageEvent<FilterResult>) => {
  // This runs on main thread — update UI with result
  setFilteredProducts(data.results);
  setIsFiltering(false);
};

function triggerFilter(products: Product[], query: string): void {
  setIsFiltering(true);
  // Send work to background thread — main thread is free
  worker.postMessage({ products, query }); // structured clone (no shared memory)
}

// data.worker.ts — runs in separate thread, no DOM access
self.onmessage = ({ data }: MessageEvent<{ products: Product[]; query: string }>) => {
  const { products, query } = data;
  const lower = query.toLowerCase();
  const results = products.filter(p =>
    p.name.toLowerCase().includes(lower) ||
    p.description.toLowerCase().includes(lower)
  );
  // Post result back to main thread
  self.postMessage({ results });
};
```

**When to use Web Workers:**
```
Use Web Workers when:
✅ Pure computation (no DOM) > 50ms
✅ Image/video processing
✅ Data parsing (large JSON, CSV, protobuf)
✅ Cryptography
✅ Machine learning inference (ONNX Runtime Web)
✅ Text search across large datasets

Do NOT use Web Workers for:
❌ Any DOM manipulation or reading
❌ Tasks requiring shared mutable state (use SharedArrayBuffer + Atomics if truly needed)
❌ Tasks < 20ms (Worker transfer overhead ~1–2ms per message)
```

### Layout Thrashing — The Hidden Main Thread Killer

Layout thrashing is a pattern where interleaved DOM reads and writes force the browser to recalculate layout (reflow) repeatedly in the same frame:

```typescript
// ❌ Layout thrashing: each read forces reflow of pending write
function badResize(elements: HTMLElement[]): void {
  elements.forEach(el => {
    const width = el.offsetWidth;     // READ — forces reflow (pending writes exist)
    el.style.width = `${width * 2}px`; // WRITE — invalidates layout
    // repeat for each element: each read forces another reflow
  });
  // N reads × N writes = N² reflow calculations
}

// ✅ Batched reads then writes: single reflow
function goodResize(elements: HTMLElement[]): void {
  // Phase 1: all reads (single reflow calculation at start)
  const widths = elements.map(el => el.offsetWidth);

  // Phase 2: all writes (layout invalidated once, recalculated once on next read/paint)
  elements.forEach((el, i) => {
    el.style.width = `${widths[i] * 2}px`;
  });
}

// FastDOM library automates read/write batching
import fastdom from 'fastdom';

fastdom.measure(() => {
  const width = element.offsetWidth; // READ
  fastdom.mutate(() => {
    element.style.width = `${width * 2}px`; // WRITE
  });
});
```

---

## 🌍 3. Real-World Examples

### SAP — Filter Chunking: 340ms Long Task → 13ms Chunks
SAP product filter processed 5,000 items synchronously. Chrome DevTools long task indicator showed 340ms blocking every filter keystroke. The fix: process 200 items per chunk with `setTimeout(0)` yield between chunks. Each chunk ran in ~13ms. Angular's `markForCheck()` was called after all chunks completed to update the view. The filter interaction changed from 340ms freeze to an incremental progress-feeling experience (~17 × 13ms chunks, but the first chunk result appeared in 13ms instead of the user waiting 340ms for any feedback).

### Google Docs — Incremental Rendering
Google Docs renders large documents by scheduling rendering chunks via `requestIdleCallback`. When you open a 100-page document, the first viewport renders immediately, and the rest renders during idle time. This prevents a 100-page document from creating a long task — the initial render is fast and the document "fills in" as the browser has spare capacity. Without this: opening a large doc would freeze the tab for several seconds.

### Facebook Scheduler — React's Internal Scheduler
React's internal scheduler (the `@react/scheduler` package) is a production implementation of cooperative scheduling. It uses `MessageChannel` (not setTimeout) to yield to the browser between render batches, because `MessageChannel` has lower latency than `setTimeout(0)` (which has a minimum 4ms clamp). React Concurrent Mode's entire premise — component rendering that can be interrupted and resumed — relies on the scheduler's ability to yield control and check if higher-priority work has arrived.

### Slack — Marking Messages as Read
Slack's "mark as read" logic processes message visibility updates using `requestIdleCallback`. As you scroll through a channel, hundreds of messages might need their read state updated. Doing this synchronously on each scroll event caused jank. Queuing the read-state updates for idle processing means smooth scrolling while reads are eventually consistent — an acceptable trade-off where correctness doesn't require synchronous processing.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Main thread scheduling is about ensuring JavaScript never runs for more than 50ms without yielding to the browser. When it does, the browser can't respond to input, paint frames, or run animations — users experience freezes and lag. There are three core techniques. First: chunking long synchronous work with `setTimeout(0)` yields — break a 300ms task into 15ms chunks, yield between each. Second: `requestIdleCallback` for non-critical background work like prefetching, analytics batching, or cache warming — runs only when the browser has spare time. Third: Web Workers for genuinely CPU-intensive pure computation — image processing, large data parsing, crypto — anything where you need a separate thread. The hidden killer is layout thrashing: interleaving DOM reads and writes forces the browser to recalculate layout N times instead of once. Batch all reads first, then all writes. `FastDOM` automates this. At SAP, a 340ms long task in the filter pipeline was chunked into 13ms segments, transforming a freezing interaction into a responsive one."

### Follow-Up Q&A

**Q: What's the difference between setTimeout(0) and queueMicrotask for yielding?**
A: They're fundamentally different. `queueMicrotask` schedules a microtask — it runs immediately after the current script and before any macrotask or rendering. It does NOT yield to the browser's rendering engine. `setTimeout(0)` schedules a macrotask — the event loop can process input events, rendering, and other tasks between the current task and the scheduled callback. For yielding to allow rendering and input: use `setTimeout(0)`, `scheduler.yield()`, or `MessageChannel`. `queueMicrotask` is for ordering async operations within a task — not for releasing the main thread.

**Q: When would you use requestAnimationFrame vs setTimeout for work scheduling?**
A: rAF is specifically for visual work synchronized to the browser's display refresh cycle. If your work produces visual output (CSS changes, Canvas drawing, DOM mutations that will be immediately painted), use rAF — it ensures your changes land at exactly the right time before paint, preventing visual inconsistencies. If your work is purely computational (data processing, filtering, sorting) and just happens to eventually update the DOM, setTimeout(0) is simpler and more appropriate. A common mistake is using setTimeout for animations — while it works, it can cause visual tearing or missed frames because it's not synchronized to the display refresh rate.

---

## 💻 5. Code Example (TypeScript)

```typescript
// Production-grade task scheduler with priority, cancellation, and chunking

type Priority = 'user-blocking' | 'user-visible' | 'background';

interface ScheduledTask {
  id: string;
  priority: Priority;
  execute: () => void | Promise<void>;
  isCancelled: boolean;
}

class MainThreadScheduler {
  private queues: Record<Priority, ScheduledTask[]> = {
    'user-blocking': [],
    'user-visible': [],
    'background': [],
  };
  private isFlushingScheduled = false;

  schedule(
    execute: () => void | Promise<void>,
    priority: Priority = 'user-visible'
  ): () => void {
    const id = crypto.randomUUID();
    const task: ScheduledTask = { id, priority, execute, isCancelled: false };
    this.queues[priority].push(task);

    if (!this.isFlushingScheduled) {
      this.isFlushingScheduled = true;
      // Use MessageChannel for lower latency than setTimeout (no 4ms minimum)
      const channel = new MessageChannel();
      channel.port1.onmessage = () => this.flush();
      channel.port2.postMessage(null);
    }

    // Return cancel function
    return () => { task.isCancelled = true; };
  }

  private flush(): void {
    this.isFlushingScheduled = false;
    const startTime = performance.now();

    for (const priority of ['user-blocking', 'user-visible', 'background'] as Priority[]) {
      const queue = this.queues[priority];
      while (queue.length > 0) {
        const task = queue.shift()!;
        if (!task.isCancelled) {
          task.execute();
        }
        // Yield if we've used more than 5ms (user-blocking always gets full run)
        if (priority !== 'user-blocking' && performance.now() - startTime > 5) {
          // Re-schedule remaining work
          if (queue.length > 0 || Object.values(this.queues).some(q => q.length > 0)) {
            this.isFlushingScheduled = true;
            const channel = new MessageChannel();
            channel.port1.onmessage = () => this.flush();
            channel.port2.postMessage(null);
          }
          return;
        }
      }
    }
  }
}

// Usage
const scheduler = new MainThreadScheduler();

// User interaction handler: user-blocking priority
function handleFilterInput(query: string): void {
  scheduler.schedule(
    () => updateFilterUI(query),     // show search spinner immediately
    'user-blocking'
  );

  scheduler.schedule(
    () => runSearchInBackground(query), // heavy computation
    'background'
  );
}

// Chunked long-running operation with real yield control
async function processLargeDataset<T, R>(
  items: T[],
  processFn: (item: T) => R,
  { chunkSize = 200, onProgress }: { chunkSize?: number; onProgress?: (pct: number) => void } = {}
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    chunk.forEach(item => results.push(processFn(item)));

    onProgress?.((i + chunk.length) / items.length * 100);

    // Yield to browser between chunks
    await new Promise<void>(resolve => {
      // scheduler.yield() when available, else MessageChannel, else setTimeout
      if ('scheduler' in window && typeof (scheduler as any).yield === 'function') {
        (window as any).scheduler.yield().then(resolve);
      } else {
        const mc = new MessageChannel();
        mc.port1.onmessage = () => resolve();
        mc.port2.postMessage(null);
      }
    });
  }

  return results;
}

// Example: filter 5,000 products without blocking
async function filterProductsAsync(
  products: Product[],
  query: string,
  setResults: (r: Product[]) => void
): Promise<void> {
  const lower = query.toLowerCase();
  const filtered = await processLargeDataset(
    products,
    (p) => (
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower)
        ? p
        : null
    ),
    {
      chunkSize: 250,
      onProgress: (pct) => console.log(`Filtering: ${pct.toFixed(0)}%`),
    }
  );
  setResults(filtered.filter(Boolean) as Product[]);
}
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"BROW"**
- **B** — Batch reads before writes (avoid layout thrashing)
- **R** — rAF for visual/rendering work synchronised to frame rate
- **O** — Off main thread (Web Workers for CPU-intensive work)
- **W** — Work chunking (setTimeout/yield — never > 50ms in a single task)

### The 50ms Rule
```
Every task on the main thread must complete or yield within 50ms.
Long task = any task > 50ms = user perceives the app as frozen.

Measurement: Long Tasks API (deprecated) → LoAF API (2024)
Goal: INP < 200ms, which requires input handling < 50ms
```

### Scheduling Decision Tree
```
Is the work visual? (animations, canvas, layout reads)
  → Yes → requestAnimationFrame
  → No ↓

Is the work non-critical background? (prefetch, analytics)
  → Yes → requestIdleCallback (with timeout fallback)
  → No ↓

Is the work > 50ms AND no DOM access needed?
  → Yes → Web Worker
  → No ↓

Does the work need to be chunked to stay < 50ms?
  → Yes → setTimeout(0) or scheduler.yield() between chunks
  → No → Run synchronously (it's fast enough)
```

---

## ✅ 7. Why & How Summary

- **Why it matters:** The main thread is single-threaded — any task running > 50ms prevents the browser from processing user input, rendering frames, or running animations; INP measures exactly this; a 340ms long task in SAP's filter caused visible freezes on every keypress
- **How it works:** JavaScript tasks are queued as macro tasks; between tasks the browser can render and process input; yielding via `setTimeout(0)` or `MessageChannel` allows the browser to service these needs between chunks; `requestIdleCallback` schedules work for genuinely idle time; Web Workers move pure computation off the main thread entirely
- **How Hruday uses it:** Chunked SAP filter processing (340ms → 13ms chunks); `requestIdleCallback` for analytics batching and recommendation prefetching; Web Workers proposed for Bosch IoT data parsing (500KB sensor JSON payloads); layout thrashing audit using Chrome DevTools "Rendering" panel

---

✅ Topic 178/486 complete → Continuing to Topic 179: Long Tasks & Yielding Control
