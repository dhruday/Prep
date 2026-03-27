# Main Thread Scheduling — Long Tasks, INP, and Yielding
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Long Task**: any JavaScript task running on the main thread for more than 50ms; visible in Chrome DevTools Performance tab as wide red/orange bars with a red corner triangle; blocks ALL browser activity (rendering, input handling, animations) for its duration
- **INP (Interaction to Next Paint)**: measures P75 of all page interaction delays (click, keypress, tap) — from event fire to next frame paint; the main cause of poor INP (> 200ms) is long tasks blocking the main thread when the user tries to interact
- **`scheduler.yield()`**: the new browser API (Chrome 129+, available behind origin trial / polyfillable); `await scheduler.yield()` yields the main thread back to the browser — allowing it to process pending paint requests and input events — then immediately re-queues your work; like `setTimeout(0)` but smarter (respects task scheduler priorities)
- **`requestIdleCallback()`**: schedule non-critical work during browser idle time; `requestIdleCallback(() => trackAnalyticsEvent(...))` does NOT block the current frame; use it for analytics, telemetry, prefetch, non-urgent side effects
- **`requestAnimationFrame()`**: schedule visual updates to run just before the browser paints the next frame; the only correct time to read layout properties (offsetWidth, clientHeight) and write them back without triggering forced synchronous layout
- **Web Workers**: run CPU-intensive code completely off the main thread (image processing, data transformation, complex calculations); communicate via `postMessage`; cannot access DOM; use Comlink for a promise-based Web Worker API without manual message handling

---

## 1. One-Line Definition
The main thread in a browser is single-threaded and handles JavaScript execution, layout, paint, and input processing — a "long task" (> 50ms of unbroken work) on this thread prevents the browser from responding to user interactions and painting new frames, causing poor INP; the techniques in this topic break up or offload that work.

---

## 2. The Problem It Solves

JavaScript execution is single-threaded. The browser's main thread handles:
- JavaScript execution
- DOM event processing (clicks, keypresses, scrolls)
- CSS layout calculations
- Paint and compositing

When JavaScript runs for more than 50ms without yielding, the browser cannot process any events that arrive during those 50ms. A user who clicks during a 300ms JavaScript task will wait 300ms for any visual response — even if the handler for their click is tiny. This is the direct cause of a poor INP score.

Concrete scenario: a product filter is implemented synchronously. The user selects a filter — the click event fires, a 300ms filtering and sorting operation runs synchronously, THEN the click is processed and the filter selection visually appears. The user clicked but saw nothing happen for 300ms.

Three patterns cause long tasks:

1. **Synchronous heavy computation**: filtering/sorting/aggregating large datasets in a single loop without yielding. 10,000-item array operations, complex data transformations, JSON.parse of large payloads.

2. **Forced synchronous layout (layout thrashing)**: reading a layout property (like `element.offsetWidth`) after making a DOM change forces the browser to synchronously recalculate layout before returning the value, then another DOM change, then another read — creating a sequence of forced synchronous layouts that together constitute a long task.

3. **Too much JavaScript in a single event handler**: an event handler that updates multiple complex data structures, triggers multiple React state updates, processes business logic, AND dispatches analytics events — all in one synchronous function call.

---

## 3. How It Works Internally

### The Main Thread Task Queue

```
Browser main thread (simplified):

  Task queue:
  ┌─────────────────────────────────────────────────────────────┐
  │ [Click handler: heavy filter()] [Paint frame] [User input]  │
  └─────────────────────────────────────────────────────────────┘
                │
                ▼
  Browser picks "Click handler: heavy filter()" — starts executing
  ┌─────────────────────────────────────────────────────────────────┐
  │ filterProducts(10000 items)         300ms of JavaScript          │
  │ ████████████████████████████████████████████████████████████   │  ← Long Task!
  └─────────────────────────────────────────────────────────────────┘
                                              ↑
  During this 300ms:                          │
  - Paint frame request: BLOCKED              │
  - User keyboard input: QUEUED               │  (will process after task ends)
  - Another click event: QUEUED               │
  - requestAnimationFrame callback: BLOCKED   │
  
  Task ends → browser processes Paint, then queued Input, then...
  User perceived delay: 300ms (POOR INP)

With yielding (scheduler.yield()):

  Task queue:
  ┌──────────────────────────────────────────────────────────────────┐
  │ [filter chunk 1 (~10ms)] [Paint/Input] [filter chunk 2 (~10ms)] │
  └──────────────────────────────────────────────────────────────────┘
  
  Filter chunk 1 runs: 10ms
  → await scheduler.yield() → yields to browser
  → browser processes pending Paint + pending Input events (< 5ms)
  → filter chunk 2 runs: 10ms
  → ... etc.
  
  User interaction during filter: browser sees it between chunks → fast INP
```

### How `scheduler.yield()` Works vs `setTimeout(0)`

```
setTimeout(() => { nextChunk(); }, 0):
  - Creates a new macrotask scheduled after AT LEAST 4ms (browser minimum)
  - The gap between chunks is ≥ 4ms (sometimes much more under load)
  - Input events can run between chunks ✅
  - But: setTimeout() does NOT have priority awareness
    → A low-priority analytics update gets equal priority to a high-priority render

scheduler.yield()  (new API, Chrome 129+):
  - Yields at the CURRENT priority level
  - The continuation is immediately re-queued at the SAME priority
  - Typical gap: < 1ms (much faster than setTimeout's 4ms minimum)
  - Input events can run between yields ✅
  - Priority-aware: yields with the scheduler's priority context intact
  - Polyfill: await new Promise(resolve => setTimeout(resolve, 0)) as fallback
```

---

## 4. The Code

### Wrong Way — Long Synchronous Task on Click

```typescript
// ❌ WRONG — Synchronous heavy computation blocks the main thread

// Event handler runs synchronously: user's click → 400ms freeze → visual feedback
const handleFilterChange = (newFilters: FilterState) => {
  // ❌ Synchronous loop over 10,000 products: ~200ms
  const filtered = products.filter(p => {
    return (
      (newFilters.category === 'all' || p.category === newFilters.category) &&
      p.price >= newFilters.minPrice &&
      p.price <= newFilters.maxPrice &&
      (newFilters.inStockOnly ? p.inStock : true) &&
      complexMatchLogic(p, newFilters)  // ← Additional computation per item
    );
  });
  
  // ❌ Synchronous sort on filtered results: ~100ms
  filtered.sort((a, b) => {
    if (newFilters.sortBy === 'price-asc') return a.price - b.price;
    if (newFilters.sortBy === 'price-desc') return b.price - a.price;
    return a.name.localeCompare(b.name);
  });
  
  // ❌ setState here triggers reconciliation (~100ms for 200 card updates)
  setFilteredProducts(filtered);
  
  // ❌ Synchronous analytics event tracking: additional processing
  trackFilterEvent({ filters: newFilters, resultCount: filtered.length });
  
  // Total: ~400ms unbroken main thread block
  // INP = 400ms = POOR
};
```

### Right Way — Yielding and Web Workers

```typescript
// ✅ RIGHT — Breaking up work with async/await and scheduler.yield()

// Polyfill for scheduler.yield() for browsers that don't support it yet
async function yieldToMain(): Promise<void> {
  if ('scheduler' in window && 'yield' in (window as any).scheduler) {
    await (window as any).scheduler.yield();
  } else {
    // Fallback: setTimeout(0) — yields to the task queue
    return new Promise<void>(resolve => setTimeout(resolve, 0));
  }
}

const handleFilterChange = async (newFilters: FilterState) => {
  // ✅ Immediate visual feedback: show loading state before any heavy computation
  // Browser paints this immediately when the event handler yields
  setFilterState('loading');
  
  // ✅ Yield: give browser a chance to paint the loading state and process pending inputs
  await yieldToMain();
  
  // ✅ Chunk 1: filter in batches to keep each chunk under 50ms
  // Process 2,000 items at a time, yield between batches
  let filtered: Product[] = [];
  const BATCH_SIZE = 2000;
  
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchFiltered = batch.filter(p =>
      matchesFilters(p, newFilters)
    );
    filtered = filtered.concat(batchFiltered);
    
    // ✅ Yield after each batch: browser can process clicks/inputs between batches
    if (i + BATCH_SIZE < products.length) {
      await yieldToMain();
    }
  }
  
  // ✅ Sort is typically fast (filtered set is much smaller than full set)
  filtered.sort(getSortComparator(newFilters.sortBy));
  
  // ✅ Update state with results
  setFilteredProducts(filtered);
  setFilterState('idle');
  
  // ✅ Non-critical analytics: run in requestIdleCallback, does not block current frame
  requestIdleCallback(() => {
    trackFilterEvent({ filters: newFilters, resultCount: filtered.length });
  });
};
```

```typescript
// ✅ RIGHT — React useTransition: deprioritize heavy renders to keep UI responsive

import { useState, useTransition, useDeferredValue } from 'react';

// ✅ useTransition: marks a state update as "non-urgent"
// → React renders the urgent parts first (input value shows immediately)
// → Then renders the non-urgent update (filtered list) in background
// → No blocking: user can continue typing while list updates

const FilterSearch: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleInput = (value: string) => {
    // ✅ Urgent update: show typed character immediately (no useTransition)
    setInputValue(value);
    
    // ✅ Non-urgent update: update searchQuery in a "transition" (can be interrupted)
    // React renders the list update at lower priority
    // If user types again before the list finishes updating, React CANCELS the old update
    startTransition(() => {
      setSearchQuery(value);
    });
  };

  return (
    <div>
      <input
        value={inputValue}
        onChange={e => handleInput(e.target.value)}
      />
      {/* ✅ Dim the list while the transition is pending (feedback to user) */}
      <ProductList
        style={{ opacity: isPending ? 0.7 : 1 }}
        searchQuery={searchQuery}
      />
    </div>
  );
};

// ✅ useDeferredValue: similar to useTransition but for RECEIVED values
// Use when you can't control the trigger (e.g., value comes from a parent)

const ProductList: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  // ✅ deferredQuery: React uses the previous query for rendering while computing new results
  // Input stays responsive; the list shows slightly stale results momentarily, then catches up
  const deferredQuery = useDeferredValue(searchQuery);
  const isStale = searchQuery !== deferredQuery;
  
  const filtered = useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(deferredQuery.toLowerCase())),
    [deferredQuery]  // ← Uses deferred value: runs only when React has idle time
  );
  
  return (
    <ul style={{ opacity: isStale ? 0.7 : 1, transition: 'opacity 200ms' }}>
      {filtered.map(p => <ProductCard key={p.id} product={p} />)}
    </ul>
  );
};
```

```typescript
// ✅ RIGHT — Web Worker for CPU-intensive computations

// workers/data-processor.worker.ts
// This file runs in a SEPARATE THREAD — no access to DOM, Window, or React state
// Communication only via postMessage / onmessage

interface WorkerMessage {
  type: 'PROCESS_DATA';
  data: Product[];
  filters: FilterState;
}

interface WorkerResponse {
  type: 'DATA_PROCESSED';
  result: Product[];
  processingTime: number;
}

// Worker receives messages from the main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type === 'PROCESS_DATA') {
    const startTime = performance.now();
    
    // ✅ Heavy computation runs here — completely OFF the main thread
    // Main thread stays free for user interactions and paint
    const result = event.data.data
      .filter(p => matchesFilters(p, event.data.filters))
      .sort(getSortComparator(event.data.filters.sortBy));
    
    const processingTime = performance.now() - startTime;
    
    // ✅ Send result back to main thread via postMessage
    (self as unknown as Worker).postMessage({
      type: 'DATA_PROCESSED',
      result,
      processingTime,
    } satisfies WorkerResponse);
  }
};

// ─────────────────────────────────────────────────────────────
// hooks/useDataWorker.ts — using the worker from React component
import { useRef, useCallback, useEffect } from 'react';

export const useDataWorker = () => {
  // ✅ Worker reference persists across renders (useRef, not useState)
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // ✅ Create worker once on mount
    // Vite/webpack handle the ?worker import syntax for worker bundling
    workerRef.current = new Worker(
      new URL('../workers/data-processor.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    return () => {
      // ✅ Clean up worker on unmount to prevent memory leaks
      workerRef.current?.terminate();
    };
  }, []);

  const processData = useCallback(
    (data: Product[], filters: FilterState): Promise<Product[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }
        
        // ✅ One-time response handler
        const handleMessage = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.type === 'DATA_PROCESSED') {
            workerRef.current!.removeEventListener('message', handleMessage);
            resolve(event.data.result);
          }
        };
        
        workerRef.current.addEventListener('message', handleMessage);
        workerRef.current.postMessage({ type: 'PROCESS_DATA', data, filters });
      });
    },
    []
  );

  return { processData };
};

// ─────────────────────────────────────────────────────────────
// Component using the worker:
const FilteredProductGrid: React.FC = () => {
  const { processData } = useDataWorker();
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilterChange = async (filters: FilterState) => {
    setIsProcessing(true);
    // ✅ All heavy work happens in the worker — main thread stays free
    const result = await processData(allProducts, filters);
    setFilteredProducts(result);
    setIsProcessing(false);
  };

  return (
    <div>
      <FilterBar onFilterChange={handleFilterChange} />
      {isProcessing && <ProgressBar />}
      <ProductGrid products={filteredProducts} />
    </div>
  );
};
```

### Avoiding Forced Synchronous Layout

```typescript
// ❌ WRONG — Layout thrashing: read → write → read → write pattern

const animateItems = (items: HTMLElement[]) => {
  items.forEach(item => {
    // ❌ Read layout property: browser must synchronously calculate layout
    const width = item.offsetWidth;       // ← forces layout calculation
    // ❌ Write DOM: invalidates layout
    item.style.width = `${width * 1.1}px`;  // ← invalidates previous layout
    // On next loop iteration: read again → recalculate → write → invalidate
    // Each iteration: forced synchronous layout (~5-15ms each)
  });
};

// ✅ RIGHT — Batch reads before writes with requestAnimationFrame

const animateItemsCorrect = (items: HTMLElement[]) => {
  requestAnimationFrame(() => {
    // ✅ Read phase: read all layout values BEFORE any writes
    // Browser does ONE layout calculation for all reads
    const widths = items.map(item => item.offsetWidth);
    
    // ✅ Write phase: apply all DOM mutations AFTER all reads
    // This mutation invalidates layout, but there are no more reads in this frame
    items.forEach((item, i) => {
      // ✅ Use CSS transform instead of layout properties when possible
      // transform is GPU-composited: does NOT trigger layout recalculation
      item.style.transform = `scaleX(1.1)`;
      // ← If you MUST change layout properties (width, height, position):
      // do all reads first, then all writes (never interleave)
    });
  });
};
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a Long Task and why does it matter for INP?"

**Hruday's answer:**
> A Long Task is any unbroken JavaScript execution on the main thread that takes more than 50ms. The browser's main thread is single-threaded — it handles JavaScript, DOM events, style calculations, layout, and paint. When a task runs for more than 50ms without yielding, no other work can happen during that time.
>
> INP (Interaction to Next Paint) measures the delay between a user interaction — a click, keypress, or tap — and the browser painting the visual response. When a Long Task is running when the user interacts, their interaction is queued and can only be processed after the Long Task finishes. If the Long Task takes 300ms, the INP for that interaction is at least 300ms — in the "Poor" range.
>
> The most common causes of Long Tasks in my experience: heavy synchronous data processing (filtering/sorting large arrays in an event handler), JavaScript parsing and evaluation of large bundles (especially on first load), and complex React renders triggered by state updates (200 components reconciling can take 300ms+).
>
> Chrome DevTools Performance tab is the primary tool. Long Tasks appear as wide bars colored orange, with a red right-corner triangle. Clicking one shows the call stack — which functions were responsible for the 50ms+ execution. The fix depends on the cause: break computation into chunks with `await scheduler.yield()`, move computation off-thread with Web Workers, or deprioritize non-urgent renders with `useTransition`.

---

### Q2 — Experience Deep Dive
**Interviewer asks:** "Describe a Long Task you diagnosed and fixed."

**Hruday's answer:**
> At SAP, we had an INP problem on the product filter interaction. Users reported that clicking a filter option felt "laggy" — they'd click, nothing would appear to happen for 300-400ms, then the filter applied. The Chrome Performance tab showed a 350ms Long Task on every filter click.
>
> Drilling into the Long Task's call stack, I found three operations running synchronously in the event handler: a filter operation over 8,000 products (~130ms), a sort operation (~40ms), and a React setState that triggered reconciliation of 200+ product cards (~180ms). These all ran as one unbroken task.
>
> The fix had two parts. First, I moved the filter computation to use `useTransition`: the search input value update was urgent (`setInputValue` — immediate, no transition), but the filter application was non-urgent (`startTransition(() => setFilterQuery(value))`). React would render the urgent update first (showing the filter UI change), then compute the filtered results at background priority. If the user typed another character before the first filter finished computing, React would cancel the first computation and start fresh with the new value.
>
> Second, for a specific "Export filtered data" button that was doing CSV generation synchronously (a particularly long task at 600ms), I moved the computation to a Web Worker. The export button now shows a spinner immediately, the worker processes the data off-thread, and posts the result back when done. The main thread is free throughout.
>
> After both changes: filter INP dropped from 350ms to 60ms. The export feature went from "frozen UI for 600ms" to "immediate spinner, background processing."

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use Web Workers vs useTransition for offloading work?"

**Hruday's answer:**
> They solve different problems at different levels.
>
> `useTransition` works within React's rendering model. It marks a state update as low-priority — React renders the urgent parts first, then the non-urgent update during idle time, and can cancel and restart the non-urgent render if new updates arrive. Use it when the work to offload IS a React render update — updating state that triggers a heavy reconciliation. Filtering 200 items and re-rendering a list is a great use case. `useTransition` keeps the input responsive while the list catches up.
>
> Web Workers offload computation entirely off the main thread to a separate JavaScript context. Use them when the work is CPU-intensive computation rather than a React render — CSV export generation, image manipulation, complex mathematical modeling, JSON parsing of large payloads, sorting/filtering millions of items. The computation runs literally in parallel with the main thread. The constraint: Web Workers cannot access the DOM, React state, or window — they communicate only via `postMessage`.
>
> The practical distinction: if the heavy work is "process data and update React state," you have two parts — the computation and the React render. Web Workers handle the computation; `useTransition` handles the React render. Often you need both: Web Worker processes the data, sends back results, main thread receives them and starts a transition to update the list UI.
>
> For the product filter scenario: if filtering 200 items (fast enough), `useTransition` alone is sufficient. If filtering 10,000 items (too slow for the main thread), Web Worker for the filter computation + `useTransition` for the resulting React update.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design a search-as-you-type experience for a product catalog that maintains good INP."

**Hruday's answer:**
> I'd design this with four layers working together.
>
> Input handling: separate the "display what I typed" state (urgent, direct `useState`) from the "search query that triggers results" state (non-urgent, wrapped in `startTransition`). Every keystroke immediately shows in the input (zero delay, always good INP). The search query state updates in background, cancellable by the next keystroke. This alone keeps the input feeling instant.
>
> Server vs client search: for a large catalog (thousands of products), client-side search is limited. The client holds a pre-loaded set of maybe 500 recently-viewed or top-selling products. Searching within those 500 is instant. For the full catalog search, a debounced API call fires after 300ms of typing pause — the API returns ranked results. The two results merge: client-side instant-match at the top, server results below.
>
> Computation placement: the client-side matching (500 items, simple substring search) runs on the main thread with `useDeferredValue`. For any heavier computation (fuzzy matching, typo correction), those run in a Web Worker to keep the main thread clear.
>
> Result rendering: the result list uses virtual scrolling (if results can exceed 50 items), React.memo on result items, and a stable key per result. The transition from "loading" to "results" uses `useTransition` to avoid a layout shift — the old results remain visible (dimmed) while new results compute, then swap in a single atomic update.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "setTimeout(0) is equivalent to scheduler.yield()" | "I'll just use `setTimeout(() => nextChunk(), 0)` to break up long tasks" | `setTimeout(0)` is a semantic approximation, not an equivalent; browsers enforce a minimum 4ms delay for `setTimeout(0)` (and up to ~1ms jitter); more importantly, `setTimeout(0)` creates a MACROTASK — it goes to the end of the macrotask queue, potentially behind queued click handlers, network callbacks, and other events; `scheduler.yield()` yields within the CURRENT task's priority context and immediately re-queues the continuation at the same priority with minimal delay (< 1ms); `scheduler.yield()` is also CANCELLABLE (via `scheduler.postTask` with AbortController); for 2025+ targets, prefer `scheduler.yield()` with `setTimeout(0)` as a polyfill fallback |
| "Web Workers solve all performance issues" | "I'll move everything computation-heavy to Web Workers" | Web Workers are powerful but have real limits: no DOM access (cannot read element sizes, cannot call React setState, cannot access window/document); communication via `postMessage` involves structured clone serialization — for large datasets this serialization itself can be expensive (sending 100,000 product objects via postMessage involves copying all their data); Web Workers have startup cost (they are separate thread contexts that need to be initialized); they work best for truly CPU-intensive computation (image processing, cryptography, data transformation) but are NOT appropriate for tasks that need DOM access or tight coupling with React state |
| "useTransition defers work to the background" | "useTransition sends the render to a background thread" | `useTransition` does NOT move work to a different thread; React still runs on the main thread; `useTransition` marks an update as "interruptible" — if React is in the middle of rendering a transition state update and a new user input comes in, React PAUSES the transition render, handles the input, then RESUMES the transition render; this is concurrent rendering, not background threading; the performance benefit is that user inputs are never blocked by transition renders — not that compute is moved off-thread; if the transition render is too heavy (300ms total), the main thread is still occupied during those 300ms unless you additionally yield with `scheduler.yield()` between work chunks |

---

## 7. Hruday's Real Experience Hook
> "The interaction that stuck with me was the first time I used Chrome DevTools' INP measurement on the SAP filter UI. The Performance panel showed a 350ms Long Task and marked it as the cause of a 'Poor' INP. But what made it clear was the 'Interactions' section in the Performance panel — it showed the exact click event, the gap between the click time and the next paint time (350ms), and the culprit tasks that filled that gap.
>
> Before that, I thought the filter was 'slow to update' — a general perception. After seeing the trace, I knew exactly: 130ms in the filter loop, 40ms in sort, 180ms in React reconciliation. Each part had a different fix. The filter loop broke into batched chunks. The sort was acceptable. The React reconciliation was fixed with `useTransition`.
>
> The most surprising part: after adding `useTransition`, the total computation time (filter + sort + reconciliation) didn't change — it was still ~350ms. But the INP dropped from 350ms to 60ms. Why? Because `useTransition` let React yield between render chunks. The user's click was processed within 60ms (just enough to show the filter as selected), and the list update followed asynchronously. Same work, different scheduling — completely different user experience."

---

## 8. Scale Evolution

**Small app →** Long tasks unlikely to be a problem; only investigate if interactions feel slow; `useDeferredValue` for search inputs as a simple first-pass optimization.

**Medium app (complex interactions) →** Profile key interactions with Chrome DevTools INP measurement; `useTransition` for all state updates that trigger heavy list re-renders; debounce expensive event handlers; `requestIdleCallback` for analytics and telemetry; `requestAnimationFrame` for any layout-reading code.

**Large scale (SAP/Swiggy catalog level) →** Web Workers for data processing (filter/sort/aggregate on large datasets); `useTransition` for all list/table renders; Lighthouse CI with TBT < 200ms budget; per-interaction INP tracking via `web-vitals` library; `scheduler.yield()` (with polyfill) for batched computation; Long Tasks API in production monitoring to catch regressions.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment dashboard filter interactions — selecting date ranges, merchant filters, transaction status; heavy reconciliation on large transaction tables; INP directly affects how responsive the payment portal feels to merchants making time-sensitive decisions | useTransition for transaction filter; Web Worker for CSV export; INP profiling workflow |
| Swiggy / Meesho | Search-as-you-type for food items / products; filter interactions in catalog browsing; real-time availability updates during ordering; add-to-cart interaction must feel instant on low-end Android devices | Search INP optimization; Web Worker for catalog search; useTransition for filter results |
| Adobe / Microsoft | Creative Cloud tool interactions: changing brush settings, applying filters, rendering previews; Teams: message send, participant management; Microsoft 365: complex document operations; all require fast INP on heavy JS applications | Web Workers for image/document processing; useTransition for complex tool state; Long Task diagnosis in creative tools |
| SAP Labs | Direct: filter INP 350ms → 60ms using useTransition; export Long Task 600ms → background Web Worker; Chrome DevTools INP trace walkthrough; taught INP measurement to team; `web-vitals` library for production INP tracking; Lighthouse CI TBT budget gate | Specific INP trace story; useTransition + Web Worker combination; production INP monitoring setup |

---

## 10. Related Topics — What to Study Next

- **Topic 234 — Core Web Vitals: LCP, CLS, INP** — the framework that explains WHY INP matters; INP is the metric that long tasks directly break; understanding the INP threshold (< 200ms good) gives the target for all the techniques in this topic
- **Topic 242 — Avoiding Unnecessary Re-renders** — the complement to main thread scheduling; re-renders that don't need to happen are a form of Long Task; eliminating wasted renders (React.memo, OnPush, context splitting) reduces the main thread load that scheduling techniques have to manage
- **Topic 244 — N+1 Query Problem** — the backend analogue of the long task problem; just as long synchronous tasks block the frontend main thread, many small sequential database queries block the backend thread; both are solved by identifying unnecessary sequential work and batching or offloading it
- **Topic 247 — Async Processing with Queues** — the backend version of Web Workers; heavy backend operations (PDF generation, email sending, report calculation) are offloaded to async workers via Kafka; same principle: keep the request thread free for fast interactions, do heavy work in the background

---

*Part 14 · Main Thread Scheduling — Long Tasks, INP, Yielding · Full Stack Interview Guide · Hruday D · 2026*
