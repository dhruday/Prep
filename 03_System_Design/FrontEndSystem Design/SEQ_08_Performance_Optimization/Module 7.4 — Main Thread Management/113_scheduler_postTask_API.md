# 113. scheduler.postTask() API ★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

`scheduler.postTask()` is a browser-native API that gives JavaScript developers fine-grained control over task scheduling on the main thread. Before this API, developers had only blunt tools — `setTimeout(fn, 0)` to defer work or `requestIdleCallback` for background tasks — with no way to express priority. `scheduler.postTask()` introduces three explicit priority levels: **`user-blocking`** (interrupts user interaction), **`user-visible`** (renders new content), and **`background`** (preloading, analytics). This directly maps to the browser's concept of task priority in the scheduler, enabling you to cooperative-schedule long work, yield to user interaction in the middle of a computation, and prevent the main thread stalls that cause poor INP (Interaction to Next Paint). Angular 18+ uses this API internally via its `afterNextRender` scheduling. React's experimental scheduler similarly uses it when available.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### The Main Thread Scheduling Problem

```
Without scheduler.postTask():
─────────────────────────────
User clicks button                    ← User event (high priority)
→ JS event handler runs (5ms)
→ Long data processing starts (200ms) ← Main thread BLOCKED
→ User clicks again                   ← Input event QUEUED, not processed!
→ Layout / Paint (16ms)
→ Input events finally process        ← 200ms+ INP — "poor" rating

With scheduler.postTask():
─────────────────────────────
User clicks button
→ JS event handler runs (5ms)
→ Schedule data processing as 'background'
→ Layout / Paint (16ms)              ← Frame completes ✅
→ Second user click processes (2ms)  ← INP = 7ms ✅
→ Background task runs in idle slices
```

### Priority Levels

```typescript
// Priority levels in scheduler.postTask()
type TaskPriority = 'user-blocking' | 'user-visible' | 'background';

// user-blocking: Highest priority. Run immediately in next task.
// Use for: direct UI mutation in response to user input
// Maps to: same category as 'user event' tasks
scheduler.postTask(() => updateUIDirectly(), { priority: 'user-blocking' });

// user-visible: Medium priority. Run before next frame if possible.
// Use for: rendering new content, updating UI in response to async data
// Maps to: requestAnimationFrame-like timing
scheduler.postTask(() => renderNewContent(), { priority: 'user-visible' });

// background: Lowest priority. Run in idle time.
// Use for: prefetching, precomputing, analytics, cache warming
// Maps to: requestIdleCallback-like timing
scheduler.postTask(() => prefetchNextPage(), { priority: 'background' });
```

### Basic Usage

```typescript
// Check availability (not yet in Safari as of 2025)
const hasScheduler = 'scheduler' in window;

// Basic task scheduling
if (hasScheduler) {
  scheduler.postTask(() => {
    console.log('Running in background');
  }, { priority: 'background' });
} else {
  // Fallback: setTimeout with 0 delay for 'user-visible', large delay for 'background'
  setTimeout(() => {
    console.log('Fallback background task');
  }, 200);
}
```

### Yielding Cooperatively During Long Work

```typescript
// The "chunked work + yield" pattern — essential for INP improvement
// This is the most important use case for postTask at senior level

async function processLargeDataset(items: DataItem[]): Promise<void> {
  const CHUNK_SIZE = 50;
  
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    
    // Process chunk synchronously
    processChunk(chunk);
    
    // YIELD to browser: let user interactions through before continuing
    await yieldToMain();
  }
}

// Polyfillable yield helper
async function yieldToMain(): Promise<void> {
  if ('scheduler' in window) {
    // Yield with user-visible priority — browser runs high-priority tasks first
    return scheduler.postTask(() => {}, { priority: 'user-visible' });
  }
  
  // Fallback: MessageChannel is faster than setTimeout(0) (zero-delay clamp issue)
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage('');
  });
}
```

### Cancellable Tasks with TaskController

```typescript
// Cancel tasks that are no longer needed (e.g., user navigated away)
const controller = new TaskController({ priority: 'background' });

// Schedule prefetch task
const prefetchTask = scheduler.postTask(
  () => prefetchProductData(productId),
  { signal: controller.signal, priority: 'background' }
);

// Cancel if user navigates (like AbortController for fetch)
function onRouteChange(): void {
  controller.abort('Navigation: prefetch no longer needed');
}

// Handle cancellation
try {
  await prefetchTask;
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    // Task was cancelled — normal, no action needed
    return;
  }
  throw error;
}
```

### Priority Inheritance with TaskSignal

```typescript
// TaskController can dynamically change priority of running tasks
// Use case: search box — background prefetch becomes user-blocking when user submits

class SearchService {
  private searchController: TaskController | null = null;
  
  async search(query: string): Promise<void> {
    // Cancel previous search task
    this.searchController?.abort('New search');
    
    // Start new search as background (user still typing)
    this.searchController = new TaskController({ priority: 'background' });
    
    try {
      const results = await scheduler.postTask(
        () => this.fetchResults(query),
        { signal: this.searchController.signal }
      );
      
      // Upgrade priority to show results quickly
      this.searchController.setPriority('user-visible');
      await this.renderResults(results);
      
    } catch {
      // Cancelled by new search — ignore
    }
  }
}
```

### Integration with React 18 Concurrent Features

```typescript
// React 18 uses its own scheduler internally, but you can complement it
// with scheduler.postTask() for non-React work

import { startTransition } from 'react';

async function handleSearch(query: string): Promise<void> {
  // User-blocking: update the input immediately
  setInputValue(query);
  
  // user-visible: schedule state update as a React transition
  // React will yield to urgent updates (typing) before applying this
  startTransition(() => {
    setSearchResults(pendingResults);
  });
  
  // background: prefetch next likely pages
  if ('scheduler' in window) {
    scheduler.postTask(
      () => prefetchLikelyNextContent(query),
      { priority: 'background' }
    );
  }
}
```

### INP Optimization Pattern: Submit Button

```typescript
// Real-world INP fix: form submit with heavy validation
async function handleFormSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  
  // Phase 1: user-blocking — update UI immediately (button disabled, spinner)
  setSubmitting(true);
  setButtonState('loading');
  
  // Yield — let the UI update render before heavy work
  await yieldToMain();
  
  // Phase 2: user-visible — run validation (medium priority)
  const validationResult = await scheduler.postTask(
    () => runExpensiveValidation(formData),
    { priority: 'user-visible' }
  );
  
  if (!validationResult.valid) {
    // user-blocking — show errors immediately
    await scheduler.postTask(
      () => showValidationErrors(validationResult.errors),
      { priority: 'user-blocking' }
    );
    setSubmitting(false);
    return;
  }
  
  // Phase 3: background — submit API call (non-blocking)
  scheduler.postTask(
    async () => {
      const result = await submitToAPI(formData);
      // user-blocking to show success feedback
      scheduler.postTask(
        () => showSuccessState(result),
        { priority: 'user-blocking' }
      );
    },
    { priority: 'background' }
  );
}
```

### Browser Support and Polyfill Strategy

```typescript
// Browser support (March 2026):
// Chrome/Edge: Yes (since Chrome 94)
// Firefox: Yes (since Firefox 101)
// Safari: Partial (iOS 18+, macOS Sonoma+)

// Polyfill for Safari/older browsers:
export function scheduleTask(
  callback: () => void,
  priority: 'user-blocking' | 'user-visible' | 'background',
): Promise<void> {
  if ('scheduler' in window && typeof (window as Window & { scheduler?: Scheduler }).scheduler?.postTask === 'function') {
    return (window as Window & { scheduler: Scheduler }).scheduler.postTask(callback, { priority });
  }
  
  // Polyfill fallback
  const delay = priority === 'user-blocking' ? 0 
              : priority === 'user-visible' ? 0 
              : 200;  // background = 200ms delay
  
  return new Promise(resolve => {
    setTimeout(() => {
      callback();
      resolve();
    }, delay);
  });
}
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Angular 18 (direct usage):**
Angular's `afterNextRender` API internally uses `scheduler.postTask()` when available. When Angular needs to run DOM measurements after render (for animations or virtual scroll), it uses `user-visible` priority to ensure measurements happen in the same frame without blocking interactions.

**Google Search:**
Google Search uses task scheduling to split the rendering of search results into priority buckets: the top 3 results render at `user-blocking` priority; ads and related searches render at `user-visible`; "People also ask" sections render at `background` priority. This keeps INP green (<200ms) even when the full SERP page is computationally heavy.

**Microsoft Teams Web:**
Teams uses chunked processing with yields to process chat message history. Loading 1000 messages was a 400ms blocking task. With `scheduler.postTask()` + chunking at `background` priority with yields every 50 messages, the main thread stays free, and users can start typing messages while history loads in the background.

**Scaling considerations:**
- 1K users: `setTimeout` workarounds are "fine"
- 100K users: INP becomes a Google Search ranking signal — scheduling matters
- Real-time dashboards: `scheduler.postTask()` is the architecture for keeping dashboards responsive while processing data

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "The core problem `scheduler.postTask()` solves is that JavaScript is single-threaded — if you have 200ms of data processing work to do, no user interaction can be processed until that work completes. Before this API, the best we could do was `setTimeout(fn, 0)` which is imprecise and doesn't express intent. `scheduler.postTask()` gives you three explicit priorities — `user-blocking`, `user-visible`, and `background` — that map to actual browser scheduling concepts, so the browser can correctly interleave high-priority user events between your background work chunks. The pattern I use is: break any work over 50ms into chunks of ~50 items each, yield between chunks using `scheduler.postTask(() => {}, { priority: 'user-visible' })`, so user interactions (clicks, keystrokes) can be processed between chunks. This directly improves INP — the most important Core Web Vital for interactive apps. At Bosch, we had a dashboard that processed 10,000 sensor readings on load — a 300ms block. Using chunked processing with postTask yields, that same computation completed in background while keeping the UI fully interactive."

**Likely Follow-up Questions:**
1. *What's the browser support story?* → Chrome/Firefox: stable; Safari: iOS 18+ / macOS Sonoma; use polyfill pattern for older Safari
2. *How does this differ from requestIdleCallback?* → `requestIdleCallback` only has one priority (idle); can be delayed indefinitely under load; no cancellation control. `postTask` has three priorities, is more predictable, and supports cancellation via `TaskController`
3. *How do you yield to the main thread in React?* → React 18's `startTransition` marks state updates as non-urgent (equivalent to `user-visible`); for non-React work, use `scheduler.postTask()` or the MessageChannel yield technique
4. *What's the INP connection?* → INP measures delay from user interaction to next paint. Long tasks block the main thread, delaying interaction response. Chunking work with yields ensures user events are processed between chunks → lower INP
5. *How does Angular Signals interact with this?* → Angular 18 uses `scheduler.postTask()` internally for change detection scheduling; signals tell Angular what's dirty, postTask tells it when to check

**Comparison Table:**

| API | Priority | Cancellable | Use Case |
|---|---|---|---|
| `scheduler.postTask()` | 3 levels | Yes (TaskController) | General task scheduling |
| `requestIdleCallback` | Idle only | Yes (`cancelIdleCallback`) | Low-priority background work |
| `requestAnimationFrame` | Pre-paint | Yes | DOM/animation updates |
| `setTimeout(fn, 0)` | Macrotask | No | Simple defer (legacy) |
| `queueMicrotask` | Microtask | No | After current task |
| `React startTransition` | Non-urgent | No | React state updates |

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Production INP Fix)
────────────────────────────────────────────────────────────

```typescript
// Real production scenario: filtering 10,000 items on search input

class ProductSearchService {
  private controller: TaskController | null = null;
  
  async filterProducts(
    query: string,
    allProducts: Product[],
    onResults: (results: Product[]) => void,
  ): Promise<void> {
    // Cancel previous search operation
    this.controller?.abort('New search query');
    this.controller = new TaskController({ priority: 'user-visible' });
    
    const signal = this.controller.signal;
    const results: Product[] = [];
    const CHUNK_SIZE = 100;
    
    try {
      for (let i = 0; i < allProducts.length; i += CHUNK_SIZE) {
        // Check if cancelled
        if (signal.aborted) return;
        
        // Process chunk
        const chunk = allProducts.slice(i, i + CHUNK_SIZE);
        const matched = chunk.filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase())
        );
        results.push(...matched);
        
        // Show partial results immediately (user-visible)
        onResults([...results]);
        
        // Yield between chunks — let typing continue without jank
        await scheduler.postTask(() => {}, {
          priority: 'user-visible',
          signal,
        });
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
    }
  }
}
```

**Why this code is production-quality:**
- Cancellation on new query prevents stale results
- Partial results shown as they're found (progressive UI)
- Yields every 100 items — keeps input response <16ms
- Error handling distinguishes cancellation from real errors

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"postTask = traffic controller for your main thread."**

Three priorities:
- `user-blocking` = red light — everything else waits
- `user-visible` = green light — run when road is clear
- `background` = yield sign — use spare cycles only

**The yield pattern in one line:**
```javascript
await scheduler.postTask(() => {}, { priority: 'user-visible' });
```
Put this between chunks of >50ms work to keep INP green.

**If you go blank:** "`scheduler.postTask()` is task scheduling with explicit priorities — I use it to break long tasks into chunks and yield between them, so user interactions are never blocked."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **INP is a Core Web Vital**: poor INP (<200ms = poor) affects Google Search ranking since March 2024
→ **Single-threaded model**: all JS, layout, and paint share one thread — long tasks block everything
→ **User perception**: interactions >100ms feel "sluggish"; >300ms feel "broken"

**How it works:**
→ `scheduler.postTask()` posts tasks to the browser's priority queue, which the browser's task scheduler processes in priority order. Between high-priority tasks (user events), lower-priority tasks get CPU slices. `await`-ing a `postTask()` call yields the current JS execution, allowing the browser to process pending events before resuming.

**Company relevance:**
→ **Microsoft**: Teams, Office 365 web use task scheduling for document rendering pipelines — postTask replaces custom task queue implementations
→ **Adobe**: Photoshop web uses prioritized task scheduling for render pipeline — filters run at `user-visible`, histogram computation at `background`
→ **Salesforce**: Flow Builder uses chunked rendering for complex workflows — postTask keeps the canvas responsive during large flow loads
→ **Cisco**: WebEx participant list rendering (500+ participants in large meetings) uses background-priority chunked rendering
