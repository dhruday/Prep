# 179. Long Tasks & Yielding Control
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"A long task is any JavaScript execution that occupies the main thread for more than 50ms without yielding. During a long task, the browser cannot respond to clicks, keyboard input, scroll events, or animation frames. Users perceive this as the page being frozen. The threshold is 50ms because user-perceived responsiveness requires interaction responses within 100ms, and 50ms is the budget for JavaScript to leave enough headroom for rendering. The Long Tasks API has been available since Chrome 58, but in 2024 it was superseded by the Long Animation Frames API (LoAF), which is more precise: instead of reporting about 50ms+ script execution, LoAF reports on 50ms+ animation frames — the unit that actually matters for rendering. LoAF attributes blocking time to specific scripts with source URLs, making debugging much more actionable. The solution to long tasks is cooperative yielding: break the task into chunks and yield between chunks. Modern browsers provide `scheduler.yield()` for this, which gives higher priority than `setTimeout(0)` and ensures pending input events are processed between chunks."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Long Tasks API (Legacy — Still Widely Supported)

```typescript
// Detect and report long tasks (Chrome 52+, Samsung Internet, Edge)
const longTaskObserver = new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries()) {
    if (entry.duration > 50) {
      console.warn(`Long task detected: ${entry.duration.toFixed(1)}ms`);

      // entry.attribution: which frame/script caused it
      const attr = (entry as PerformanceEventTiming & {
        attribution: Array<{ containerType: string; containerName: string }>
      }).attribution;
      console.warn('Attribution:', attr);

      // Report to analytics
      navigator.sendBeacon('/metrics', JSON.stringify({
        type: 'long-task',
        duration: entry.duration,
        startTime: entry.startTime,
        url: location.pathname,
      }));
    }
  }
});

longTaskObserver.observe({ type: 'longtask', buffered: true });
```

### Long Animation Frames API (LoAF — 2024, Chrome 123+)

LoAF reports on frames — 50ms+ animation frames. This is more useful than the Long Tasks API because:
1. It attributes blocking time to **specific script URLs and functions**
2. It distinguishes **UI task type** (style, layout, paint) from script time
3. It captures the **render blocking duration** — the part that actually delays INP

```typescript
const loafObserver = new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries() as PerformanceLoAFEntry[]) {
    // entry.duration: total frame duration (> 50ms to be reported)
    // entry.blockingDuration: time that blocked input (the INP-relevant part)
    // entry.scripts: array of scripts that ran in this frame

    if (entry.blockingDuration > 0) {
      console.warn(`LoAF: ${entry.duration.toFixed(1)}ms frame, ` +
        `${entry.blockingDuration.toFixed(1)}ms blocking`);

      entry.scripts.forEach(script => {
        console.warn(`  Script: ${script.sourceURL}:${script.startTime.toFixed(1)}ms ` +
          `duration=${script.duration.toFixed(1)}ms`);
        // script.invokerType: 'classic-script' | 'module-script' | 'event-listener' | etc.
        // script.sourceURL: file path — tells you which file to optimize
        // script.invoker: 'onclick' | 'setTimeout handler' | etc.
      });
    }
  }
});

loafObserver.observe({ type: 'long-animation-frame', buffered: true });

// TypeScript types for LoAF (not yet in lib.dom.d.ts as of 2025)
interface PerformanceLoAFEntry extends PerformanceEntry {
  blockingDuration: number;
  scripts: PerformanceScriptTiming[];
  renderStart: number;
  styleAndLayoutStart: number;
  firstUIEventTimestamp: number;
}

interface PerformanceScriptTiming {
  startTime: number;
  duration: number;
  sourceURL: string;
  sourceFunctionName: string;
  invokerType: string;
  invoker: string;
}
```

### Yielding Strategies — From Worst to Best

```
Strategy            | Yield timing              | Input priority | Latency | Support
────────────────────────────────────────────────────────────────────────────────────────
Promise.resolve()   | Microtask (NO real yield) | ❌ No yield    | ~0ms    | Universal
queueMicrotask()    | Microtask (NO real yield) | ❌ No yield    | ~0ms    | Universal
setTimeout(fn, 0)   | Macrotask (4ms clamped)   | ✅ Yields      | 4–8ms   | Universal
MessageChannel      | Macrotask (< 1ms)         | ✅ Yields      | ~1ms    | Universal
requestIdleCallback | Idle (unpredictable)      | ✅ Yields      | 10–50ms | Chrome/FF
scheduler.yield()   | Prioritized macrotask     | ✅ Yields      | ~1ms    | Chrome 115+
```

**The `scheduler.yield()` advantage:**

When pending input is waiting, `scheduler.yield()` fast-tracks the rescheduled continuation because it inherits the priority of the original task. `setTimeout(0)` loses priority — the rescheduled chunk goes to the back of the task queue behind all the user input events. `scheduler.yield()` puts the rescheduled chunk back at the front (after input) and marks it as a continuation of the interrupted task.

### Practical Yield Implementation

```typescript
// Universal yield function — uses best available mechanism
async function yieldToMain(): Promise<void> {
  // Best: scheduler.yield() (Chrome 115+) — preserves task priority, ~1ms
  if ('scheduler' in window && typeof (window as any).scheduler.yield === 'function') {
    await (window as any).scheduler.yield();
    return;
  }

  // Good: MessageChannel — no 4ms minimum clamp, ~1ms
  return new Promise<void>(resolve => {
    const mc = new MessageChannel();
    mc.port1.onmessage = () => resolve();
    mc.port2.postMessage(null);
  });

  // Fallback: setTimeout(0) — 4ms minimum (browsers clamp to 4ms in nested calls)
  // return new Promise<void>(resolve => setTimeout(resolve, 0));
}

// isInputPending — check if user input is waiting
// Returns true if there's pending user input (clicks, keyboard, pointer) in the queue
// Available in Chrome 87+ via navigator.scheduling.isInputPending()
function hasUserInputPending(): boolean {
  return (navigator as any).scheduling?.isInputPending?.() ?? false;
}

// Adaptive yield: only yield if user input is pending (minimize yield overhead)
async function adaptiveYield(): Promise<void> {
  if (hasUserInputPending()) {
    await yieldToMain();
  }
  // else: no input pending, continue without yielding (lower overhead)
}
```

### Complete Long Task Breaker Pattern

```typescript
interface ProcessingOptions<T, R> {
  items: T[];
  processFn: (item: T) => R;
  chunkSize?: number;
  signal?: AbortSignal;           // allow cancellation (e.g., user changes query)
  onProgress?: (pct: number) => void;
  // If true, yield after every chunk regardless (safer)
  // If false, only yield when input is pending (faster)
  alwaysYield?: boolean;
}

async function processWithYielding<T, R>({
  items,
  processFn,
  chunkSize = 200,
  signal,
  onProgress,
  alwaysYield = false,
}: ProcessingOptions<T, R>): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    // Respect cancellation (e.g., user typed a new query)
    if (signal?.aborted) {
      throw new DOMException('Processing cancelled', 'AbortError');
    }

    const chunk = items.slice(i, i + chunkSize);
    for (const item of chunk) {
      results.push(processFn(item));
    }

    onProgress?.((Math.min(i + chunkSize, items.length) / items.length) * 100);

    // Yield to allow browser to process pending input/rendering
    const shouldYield = alwaysYield || hasUserInputPending();
    if (shouldYield && i + chunkSize < items.length) {
      await yieldToMain();
    }
  }

  return results;
}

// React hook wrapping processWithYielding with cancellation
function useFilteredProducts(products: Product[], query: string): {
  filtered: Product[];
  isProcessing: boolean;
} {
  const [filtered, setFiltered] = useState<Product[]>(products);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query) {
      setFiltered(products);
      setIsProcessing(false);
      return;
    }

    // Cancel any in-flight processing
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsProcessing(true);

    const lower = query.toLowerCase();
    processWithYielding({
      items: products,
      processFn: (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower)
          ? p
          : null,
      chunkSize: 250,
      signal: abortRef.current.signal,
    })
      .then(results => {
        setFiltered(results.filter(Boolean) as Product[]);
        setIsProcessing(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') throw err;
        // Silently handle cancellation — next effect run will start fresh
      });

    return () => abortRef.current?.abort();
  }, [products, query]);

  return { filtered, isProcessing };
}
```

### LoAF for INP Attribution — Production Debugging

```typescript
// Connect LoAF data to INP measurement for precise attribution

import { onINP } from 'web-vitals/attribution';

onINP(({ value, attribution, rating }) => {
  // attribution.nextPaintTime: when the next frame actually painted
  // attribution.processingStart: when the event handler started running
  // attribution.processingEnd: when the event handler finished
  // attribution.interactionId: links to LoAF entries for this interaction

  const loafEntries = performance.getEntriesByType('long-animation-frame')
    .filter((e): e is PerformanceLoAFEntry =>
      (e as PerformanceLoAFEntry).firstUIEventTimestamp >=
      (attribution.processingStart ?? 0) - 50
    );

  if (loafEntries.length > 0) {
    const entry = loafEntries[0];
    const topScript = entry.scripts
      .sort((a, b) => b.duration - a.duration)[0];

    console.log(`INP ${value}ms (${rating}):
  - Input delay: ${(attribution.processingStart ?? 0) - (attribution.eventTarget ? parseFloat(attribution.eventEntry?.startTime?.toFixed(1) ?? '0') : 0)}ms
  - Processing: ${(attribution.processingEnd ?? 0) - (attribution.processingStart ?? 0)}ms  
  - Presentation: ${value - ((attribution.processingEnd ?? 0) - (attribution.eventTarget ? parseFloat(attribution.eventEntry?.startTime?.toFixed(1) ?? '0') : 0))}ms
  - Worst script: ${topScript?.sourceURL} — ${topScript?.duration.toFixed(1)}ms`
    );
  }
});
```

---

## 🌍 3. Real-World Examples

### SAP — LoAF Revealing the Real Culprit
After implementing LoAF monitoring in SAP's product catalog, a long frame was detected every time a filter changed. The `scripts` array pointed to `redux-saga/effects.js` — a saga middleware that was synchronously processing 15 sequential side effects in one call. The Long Tasks API had shown a 280ms task but gave no script attribution. LoAF showed exactly which file and function. The fix: split the saga into independent non-sequential effects. The long frame disappeared.

### Google — Chrome's Use of LoAF
Google uses LoAF internally to measure Chrome's own UI responsiveness. The Chrome team publishes the 75th percentile of LoAF blocking duration as an internal KPI for the browser's performance. Any Chrome release that worsens the LoAF P75 by more than 5ms triggers a regression alert. This is the most rigorous use of LoAF in production — it influences shipping decisions for the browser itself.

### Vercel / Next.js — React Concurrent and Yielding
Next.js App Router uses React 18 Concurrent features, which internally use `MessageChannel` for cooperative scheduling. When a server component tree is large, React breaks rendering into chunks and yields between them. This is why Next.js 13+ pages feel more responsive under load — React can interrupt ongoing renders to handle user interactions, then resume the render. This is cooperative yielding applied at the framework level, invisible to developers but measurable in LoAF data (shorter blocking durations per frame).

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Long tasks are JavaScript executions that exceed 50ms — during them, the browser can't process input, render frames, or respond to the user. The tool to detect them is the LoAF API — Long Animation Frames, introduced in Chrome 123. Unlike the older Long Tasks API, LoAF gives you the specific script file and function that caused the blocking, making diagnosis actionable rather than just telling you 'something was slow.' The solution is cooperative yielding: break long-running loops into chunks and yield between each chunk using `scheduler.yield()` or `MessageChannel`. The key insight is that `setTimeout(0)` yields but puts the continuation at the back of the task queue — input events get processed but so does everything else waiting. `scheduler.yield()` puts the continuation at higher priority — it's processed as soon as pending input is handled, before other queued tasks. I pair this with `navigator.scheduling.isInputPending()` — adaptive yielding: only pause if user input is actually waiting. This gives the benefits of yielding without the overhead of yielding on every chunk when nobody's interacting."

### Follow-Up Q&A

**Q: How does LoAF differ from the Long Tasks API in terms of what it measures?**
A: Long Tasks API measures any task > 50ms. LoAF measures any animation frame > 50ms. The key difference: a long task might not be visible to the user if it runs during a frame that happens not to update the UI. LoAF specifically captures frames that delayed rendering. Additionally, LoAF includes `blockingDuration` — the portion of frame time that actually blocked user interaction — and `scripts[]` with full source attribution including URL, function name, and invoker type. Long Tasks API gave you duration and a frame container type; LoAF gives you exact script-level attribution.

**Q: Can you explain what navigator.scheduling.isInputPending() does?**
A: It returns `true` if there are pending user input events (pointer, keyboard, touch) in the input queue waiting to be processed. This allows you to make yielding decisions adaptively: yield immediately if the user is trying to interact, skip yielding if they're not. This avoids the 1–4ms overhead of yielding when the user is idle. The `includeContinuous` option extends it to continuous events like `mousemove` and `scroll`. Important caveat: it's a hint, not a guarantee — the browser may process input before `isInputPending` returns, creating a race. It should be used to decide whether to fast-track a yield, not to skip yielding entirely in critical paths.

---

## 💻 5. Code Example (TypeScript)

```typescript
// LoAF monitoring + yielding pipeline — production-ready

// ── 1. LoAF monitoring with INP correlation ─────────────────────────────────

class LoAFMonitor {
  private entries: PerformanceLoAFEntry[] = [];

  constructor() {
    if (!PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
      return;
    }

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceLoAFEntry[]) {
        this.entries.push(entry);
        this.report(entry);
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  }

  private report(entry: PerformanceLoAFEntry): void {
    if (entry.blockingDuration < 50) return; // Only report significant frames

    const worst = entry.scripts.sort((a, b) => b.duration - a.duration)[0];
    if (!worst) return;

    navigator.sendBeacon('/telemetry/loaf', JSON.stringify({
      duration: Math.round(entry.duration),
      blockingDuration: Math.round(entry.blockingDuration),
      renderStart: Math.round(entry.renderStart - entry.startTime),
      worstScript: {
        url: worst.sourceURL.split('/').pop(), // filename only
        fn: worst.sourceFunctionName,
        duration: Math.round(worst.duration),
        invoker: worst.invoker,
      },
      url: location.pathname,
    }));
  }

  getRecentBlockingFrames(windowMs = 5000): PerformanceLoAFEntry[] {
    const cutoff = performance.now() - windowMs;
    return this.entries.filter(e => e.startTime > cutoff && e.blockingDuration > 0);
  }
}

// ── 2. Task queue with yield-aware processing ─────────────────────────────────

interface Task<T> {
  fn: () => T;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
}

class YieldingTaskQueue {
  private queue: Task<unknown>[] = [];
  private running = false;
  private yieldEveryMs: number;

  constructor(yieldEveryMs = 5) {
    this.yieldEveryMs = yieldEveryMs;
  }

  enqueue<T>(fn: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject } as Task<unknown>);
      if (!this.running) this.drain();
    });
  }

  private async drain(): Promise<void> {
    this.running = true;
    let batchStart = performance.now();

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      try {
        const result = task.fn();
        task.resolve(result);
      } catch (err) {
        task.reject(err);
      }

      // Yield if we've been running for yieldEveryMs or user input is pending
      const elapsed = performance.now() - batchStart;
      const inputPending = (navigator as any).scheduling?.isInputPending?.() ?? false;

      if (elapsed > this.yieldEveryMs || inputPending) {
        await new Promise<void>(resolve => {
          if ('scheduler' in window) {
            (window as any).scheduler.yield().then(resolve);
          } else {
            const mc = new MessageChannel();
            mc.port1.onmessage = () => resolve();
            mc.port2.postMessage(null);
          }
        });
        batchStart = performance.now(); // reset clock after yield
      }
    }

    this.running = false;
  }
}

// Usage:
const taskQueue = new YieldingTaskQueue(5); // yield every 5ms

// App startup: schedule initialization tasks by priority
async function initializeApp(): Promise<void> {
  // Critical path — must run immediately
  await taskQueue.enqueue(() => initAuthModule());
  await taskQueue.enqueue(() => initRouting());

  // Non-critical — will yield if input is pending
  taskQueue.enqueue(() => prefetchUserPreferences());
  taskQueue.enqueue(() => initAnalytics());
  taskQueue.enqueue(() => warmServiceWorkerCache());
}
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"LABS"**
- **L** — LoAF (Long Animation Frames API — precise attribution by script URL)
- **A** — Adaptive yield (isInputPending — only yield when user is interacting)
- **B** — Break tasks (50ms budget — chunk any loop that might exceed it)
- **S** — scheduler.yield() (best yield mechanism — priority-preserving)

### The Two APIs to Know
```
Long Tasks API (legacy, Chrome 58+):
  new PerformanceObserver(cb).observe({ type: 'longtask' })
  Reports: task duration > 50ms
  Attribution: frame container type only (coarse)

Long Animation Frames API (2024, Chrome 123+):
  new PerformanceObserver(cb).observe({ type: 'long-animation-frame' })
  Reports: frame duration > 50ms + blockingDuration + scripts[]
  Attribution: sourceURL + sourceFunctionName + invoker (precise)
  → Use this in new code
```

### Analogy
Long tasks are like a **checkout lane blocked by one shopper** with 200 items. Everyone behind them (input events, animation frames, render steps) waits until the 200 items are scanned. Yielding is teaching that shopper to step aside every 10 items, let the person behind them through, then continue — the lane moves overall at the same speed, but everyone gets served in a timely manner.

---

## ✅ 7. Why & How Summary

- **Why it matters:** Long tasks (> 50ms) block user input processing and frame rendering; they're the primary cause of poor INP scores; LoAF provides precise attribution to the script and function causing the block, enabling targeted fixes rather than guesswork
- **How it works:** `PerformanceObserver` with `type: 'long-animation-frame'` records any animation frame > 50ms with `blockingDuration` (time that blocked input) and `scripts[]` array with `sourceURL`, `sourceFunctionName`, and `invoker`; cooperative yielding via `scheduler.yield()` or `MessageChannel` releases the main thread between processing chunks; `isInputPending()` enables adaptive yielding — yield only when needed
- **How Hruday uses it:** LoAF monitoring in SAP production (sendBeacon to telemetry endpoint); identified redux-saga synchronous chain as the blocking culprit; implemented `processWithYielding` utility used across the product catalog filter, search, and sort operations; INP improved from 340ms to 85ms on the filter interaction

---

✅ Topic 179/486 complete → Continuing to Topic 180: Interaction to Next Paint (INP) — Applied Optimization
