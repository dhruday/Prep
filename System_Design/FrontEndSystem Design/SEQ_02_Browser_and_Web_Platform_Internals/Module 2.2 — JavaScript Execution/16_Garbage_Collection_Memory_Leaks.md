# 16. Garbage Collection & Memory Leaks in JavaScript

---

## 1. High-Level Explanation (Frontend Interview Level)

JavaScript uses **automatic memory management** — the engine allocates memory when objects are created and reclaims it when those objects are no longer reachable. This is handled by the **garbage collector (GC)**, which periodically identifies unreachable objects and frees their memory. The primary algorithm V8 uses is **Mark-and-Sweep**, enhanced by **Generational Collection** (splitting heap into young/old generations for efficiency).

**Core concepts:**
- **Reachability** — an object is "alive" if it can be reached from a GC root (global variables, call stack, closures, DOM references). Everything else is collectible.
- **GC Roots** — `window`, `globalThis`, variables on the current call stack, local variables in active closures
- **Memory Leak** — an object that is no longer needed but cannot be garbage collected because an unintended reference still holds it alive
- **Stop-the-World pauses** — older GC strategies required pausing JS execution; V8's **incremental** and **concurrent** GC minimises this to microseconds in most cases

**Why it matters for system design:**
Memory leaks in long-running SPAs cause progressive performance degradation — memory grows, GC pressure increases, tab crashes over hours of use. Preventing them is a core senior engineering skill and a direct interview topic at Microsoft, Adobe, and Cisco.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### V8 Memory Regions

```
┌───────────────────────────────────────────────────────────────┐
│                        V8 Heap                                 │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   New Space  │  │   Old Space  │  │   Large Object Space  │ │
│  │ (Young Gen)  │  │  (Old Gen)   │  │  (objects > 1MB)      │ │
│  │  1–8 MB      │  │  100–2000 MB │  │  No moving allowed    │ │
│  │  Scavenge GC │  │  Mark-Sweep  │  │                       │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │  Code Space  │  │  Map Space   │                          │
│  │ (JIT output) │  │(Hidden Class)│                          │
│  └──────────────┘  └──────────────┘                          │
└───────────────────────────────────────────────────────────────┘
```

**Call Stack** (not in heap): primitive values, references/pointers — freed automatically on function return.

---

### Generational Garbage Collection

V8 uses a two-generation strategy because empirically, **most objects die young** (allocate in a render cycle, used once, discarded):

#### Young Generation — Scavenge (Cheney's Algorithm)
The New Space is split into two equal semi-spaces: **From-space** (active) and **To-space** (empty).

```
Scavenge cycle:
1. All NEW allocations go to From-space
2. GC runs: find all live objects referenced from roots
3. COPY live objects to To-space (compacting as it goes)
4. Swap From-space ↔ To-space
5. Old From-space is wiped clean (free in one operation)

Objects that survive 2+ Scavenge cycles are PROMOTED to Old Generation
```

**Why this is fast:** Allocating is just incrementing a pointer (bump allocation). Collection only traces live objects, not dead ones. Typically completes in <1ms.

#### Old Generation — Major GC (Mark-Sweep-Compact)
For long-lived objects. Three phases:

**Phase 1: Mark**
```
Starting from GC roots (global, stack, closures):
  - Paint each reachable object GREY (discovered but not processed)
  - Process grey objects: mark their children, paint object BLACK (done)
  - Any object not painted BLACK at the end = unreachable = garbage

DFS traversal of the object graph:
  GC Root → window → document → body → [child elements...] → event handlers → closures → ...
```

**Phase 2: Sweep**
```
Scan the entire heap linearly
  - BLACK objects: keep them
  - WHITE (unmarked) objects: reclaim their memory
  - Add reclaimed memory to a "free list" for future allocations
```

**Phase 3: Compact (optional)**
```
Fragmented heap after many sweeps = slow allocation (no contiguous blocks)
Compact: move live objects together, update all pointers
Expensive — V8 only runs this when fragmentation is high
```

#### Tri-Color Incremental Marking (Avoiding Stop-the-World)

Older GC would stop all JS execution during marking — causing jank. V8 uses **incremental marking**: break the mark phase into small slices (1–5ms), interleaved with JS execution.

To handle the mutation problem (JS might modify object graph between slices):
- **Write barriers**: every heap write (`obj.x = y`) triggers a small barrier that adds the modified object back to the grey worklist

---

### How Memory Leaks Happen: The 8 Common Patterns

#### 1. Forgotten Event Listeners
```javascript
// LEAK: listener holds reference to component's closure scope
function setupDashboard() {
  const largeDataset = loadMillionRows(); // 50MB in memory

  document.addEventListener('resize', () => {
    // This closure references largeDataset — keeps it alive FOREVER
    updateChart(largeDataset);
  });
  // When dashboard is destroyed, listener STILL registered on document
  // largeDataset CANNOT be GC'd
}

// FIX: clean up on component unmount
function setupDashboard() {
  const largeDataset = loadMillionRows();
  const handler = () => updateChart(largeDataset);
  document.addEventListener('resize', handler);

  return () => document.removeEventListener('resize', handler); // cleanup!
}
```

#### 2. Detached DOM Nodes
```javascript
// LEAK: reference to DOM node that has been removed from the document
let detachedTree = null;

function createTable() {
  const table = document.createElement('table'); // in DOM
  document.body.appendChild(table);
  detachedTree = table; // grab a reference

  document.body.removeChild(table); // removed from DOM = detached
  // table is no longer in the document, but detachedTree still holds it
  // The entire sub-tree (all children, their closures, their listeners) is leaked
}

// FIX: null out the reference when no longer needed
function cleanUp() {
  detachedTree = null; // now GC can collect the table + entire sub-tree
}
```

#### 3. Closures Over Large Data
```javascript
// LEAK: unnecessary capture of large object in closure
function attachHandler(element, config) {
  const bigConfig = fetchConfig(); // 5MB config object

  element.addEventListener('click', (e) => {
    // ONLY uses config.theme, but captures the ENTIRE bigConfig object
    applyTheme(bigConfig.theme);
  });
}

// FIX: extract only what you need BEFORE the closure
function attachHandler(element, config) {
  const bigConfig = fetchConfig();
  const theme = bigConfig.theme; // extract primitive — bigConfig can be GC'd
  // bigConfig reference NOT in closure scope

  element.addEventListener('click', (e) => {
    applyTheme(theme); // only `theme` (string) is captured
  });
}
```

#### 4. Global Variables Accumulating
```javascript
// LEAK: inadvertent global (missing `let`/`const`)
function processData(data) {
  result = transform(data); // No `const`! → `result` becomes window.result
  // window.result is a GC root — NEVER collected
}

// LEAK: intentional global that grows unboundedly
window.eventLog = [];
function trackEvent(event) {
  window.eventLog.push(event); // grows forever, never flushed
}

// FIX: scope properly, flush/cap arrays
const MAX_LOG_SIZE = 1000;
function trackEvent(event) {
  eventLog.push(event);
  if (eventLog.length > MAX_LOG_SIZE) eventLog.shift(); // circular buffer
}
```

#### 5. setInterval / setTimeout Leaks
```javascript
// LEAK: interval holds closure, closure holds large object
function startPolling() {
  const cache = buildCache(); // 20MB

  setInterval(() => {
    // This interval fires FOREVER — cache never GC'd
    cache.refresh();
  }, 5000);
}

// FIX: return cleanup function, clear interval on unmount
function startPolling() {
  const cache = buildCache();
  const intervalId = setInterval(() => cache.refresh(), 5000);
  return () => clearInterval(intervalId); // call this to stop the leak
}
```

#### 6. Promises and Async/Await Chains
```javascript
// LEAK: unresolved promise keeps closure alive
function watchForEvent() {
  return new Promise((resolve) => {
    const largeBuffer = new ArrayBuffer(100 * 1024 * 1024); // 100MB

    // If the event never fires, this promise never resolves
    // largeBuffer is held in the closure forever
    document.addEventListener('custom-event', () => {
      resolve(processBuffer(largeBuffer));
    });
  });
}

// FIX: add AbortController / timeout to ensure promise resolves/rejects
function watchForEvent(signal) {
  return new Promise((resolve, reject) => {
    const largeBuffer = new ArrayBuffer(100 * 1024 * 1024);
    const handler = () => resolve(processBuffer(largeBuffer));
    document.addEventListener('custom-event', handler, { signal });
    // AbortController abort() removes the listener and rejects the promise
  });
}
```

#### 7. Cache Without Eviction (WeakMap vs Map)
```javascript
// LEAK: Map holds strong references — keys and values never GC'd
const cache = new Map();
function cacheComponent(domNode, data) {
  cache.set(domNode, data); // domNode lives forever in Map key
  // Even if domNode is removed from DOM and all other refs cleared,
  // the Map key keeps it alive
}

// FIX: WeakMap — keys are weakly held, don't prevent GC
const cache = new WeakMap();
function cacheComponent(domNode, data) {
  cache.set(domNode, data);
  // If domNode is removed from DOM and all refs dropped,
  // GC can collect it AND the WeakMap entry is automatically removed
}
```

#### 8. React/Angular Component Leaks
```javascript
// React: subscription not cleaned up
function DashboardWidget() {
  useEffect(() => {
    const subscription = dataStream$.subscribe(update => setState(update));
    // MISSING: return cleanup — subscription holds component reference forever
  }, []);
}

// FIX
function DashboardWidget() {
  useEffect(() => {
    const subscription = dataStream$.subscribe(update => setState(update));
    return () => subscription.unsubscribe(); // cleanup on unmount
  }, []);
}

// Angular: takeUntilDestroyed pattern
@Component({...})
class WidgetComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    dataStream$
      .pipe(takeUntilDestroyed(this.destroyRef)) // Auto-completes on destroy
      .subscribe(data => (this.data = data));
  }
}
```

---

### Memory Measurement & Tooling

#### Chrome DevTools Memory Tab

```
1. Heap Snapshot:
   - Take snapshot before action, after action, after cleanup
   - Compare snapshots: anything in "Snapshot 2 but not Snapshot 3" = leak candidate
   - Look for: Detached HTMLElement, Detached Window, growing arrays

2. Allocation Timeline:
   - Record while performing the leaking action multiple times
   - Blue bars = live objects, grey bars = collected objects
   - If objects accumulate without grey bars appearing = leak

3. Allocation Sampling:
   - Low-overhead profiling of allocation by function
   - Shows which function is allocating the most memory
   - Production-safe unlike heap snapshots
```

#### Performance.memory API (Chrome-only)

```javascript
// Snapshot memory at key points
function measureMemory(label) {
  if (performance.memory) {
    console.log(`[${label}]`, {
      usedJSHeapSize: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`,
      totalJSHeapSize: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB`,
      jsHeapSizeLimit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB`
    });
  }
}

measureMemory('before');
runSuspectedLeakyCode();
gc(); // Force GC in DevTools debugger (--expose-gc in Node)
measureMemory('after GC');
```

#### FinalizationRegistry (ES2021) — Debugging Aid

```javascript
// Only for debugging — never rely on GC timing in production code
const registry = new FinalizationRegistry((label) => {
  console.log(`✅ ${label} was garbage collected`);
});

function track(obj, label) {
  registry.register(obj, label);
}

// Usage
let bigObject = { data: new Array(100000) };
track(bigObject, 'bigObject');
bigObject = null; // Remove strong reference
// ... eventually: "✅ bigObject was garbage collected"
```

---

### WeakRef & WeakMap — Weak References

When you want to hold an object without preventing GC:

```javascript
// WeakRef — observe without preventing collection
let obj = { id: 1, name: 'component' };
const ref = new WeakRef(obj);

// Later:
const deref = ref.deref(); // Returns obj if still alive, undefined if GC'd
if (deref) {
  console.log(deref.name);
} else {
  // Object was collected — rebuild it
}

// WeakSet — track objects without preventing collection
const trackedComponents = new WeakSet();
trackedComponents.add(componentRef);
// If componentRef goes out of scope, WeakSet entry disappears automatically
```

---

### GC Pressure & Performance

High GC pressure (many short-lived allocations) triggers frequent Scavenge cycles, causing micro-pauses (1–5ms each). In 60fps rendering, you have 16.6ms per frame — frequent GC pauses can directly cause dropped frames.

**Object pooling — reusing objects instead of creating/destroying:**

```javascript
// Without pooling: allocates a new object every frame (GC pressure)
function onFrame(timestamp) {
  const vec = { x: 0, y: 0 }; // New object each frame = GC pressure
  computeVelocity(vec);
  applyPhysics(vec);
  requestAnimationFrame(onFrame);
}

// With pooling: reuse the same object
const pool = { x: 0, y: 0 }; // One object, reused every frame
function onFrame(timestamp) {
  pool.x = 0; pool.y = 0; // Reset, not recreate
  computeVelocity(pool);
  applyPhysics(pool);
  requestAnimationFrame(onFrame);
}
```

---

## 3. Real-World Examples

### Gmail's Infinite Scroll — Detached Node Leaks
Gmail's web client was notorious in early versions for accumulating detached DOM nodes as emails were loaded. Each email panel was removed from the visual DOM but held in JavaScript arrays for "quick back navigation." After scrolling thousands of emails, the tab would use 500MB+. The fix: a bounded cache (LRU, max 50 panels) using WeakMap, with panels beyond the window properly nulled out and allowed to be GC'd.

### Slack's Desktop App — Electron Memory Management
Slack's Electron app suffered progressive memory growth: starting at ~200MB, growing to 1GB+ after 8 hours. Root cause: Redux store accumulated all historical message objects without cleanup. The fix introduced store slicing — only keeping the last N messages per channel in memory, with others lazy-loaded from IndexedDB on scroll. Memory stabilised at ~350MB. This is a direct application of bounded-state patterns at enterprise scale.

### SAP BI Launchpad — Your Own Project (Directly Relevant)
In a large Angular SPA like SAP BI Launchpad, every module registers event listeners and RxJS subscriptions. Without the `takeUntil(this.destroy$)` pattern, navigating between Fiori apps accumulates subscriptions. After 30 navigation cycles, heap can grow by 50–100MB. Implementing a `DestroyableMixin` base class that enforces the `destroy$` pattern across all components is the kind of architectural decision that separates senior from staff-level engineers.

### Scale Perspective: 1K → 10M Users
- **1K users:** Memory leaks are invisible — browser GC handles minor issues, tab rarely stays open long enough to matter
- **100K users:** First reports of "tab slowdown after hours of use" — identifiable with Chrome Memory DevTools
- **10M users:** Memory leaks become a billing concern (more server-side rendering to offload client), a trust issue, and correlate directly with session abandonment. Netflix found that a 50MB memory reduction in their web player improved session length by 8% on low-memory mobile devices.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"JavaScript garbage collection in V8 uses a generational approach. Short-lived objects are allocated in the New Space and collected quickly via Scavenge — a copy-based algorithm that runs in under a millisecond. Long-lived objects get promoted to Old Space and collected via incremental Mark-and-Sweep, which V8 interleaves with JS execution in 1–5ms slices to avoid stop-the-world pauses.*

*Memory leaks happen when an object is no longer semantically needed but still reachable from a GC root — so the GC correctly keeps it alive. The most common sources are: forgotten event listeners on long-lived targets like `document` or `window`, closures that capture large objects unnecessarily, detached DOM nodes retained by JavaScript references, setInterval callbacks that hold closure scope, and caches backed by Map instead of WeakMap.*

*In production Angular apps — like the dashboards I built at Bosch — the typical fix is enforcing `takeUntil(this.destroy$)` on every subscription and doing WeakMap-backed component caches. In React, `useEffect` cleanup functions handle this. I also track memory in Lighthouse CI: heap snapshots before and after navigation cycles, asserting that memory returns to baseline within 10% to catch regressions in the pipeline."*

### Likely Follow-up Questions

1. **"What's the difference between WeakMap and Map for GC?"**
   → Map holds strong references to keys, so keys can never be GC'd while the Map exists. WeakMap holds weak references — if the key object is otherwise unreachable, GC can collect it and the WeakMap entry disappears automatically. WeakMap is ideal for component-to-metadata caches.

2. **"How do you detect a memory leak in production?"**
   → Three tools: (1) Chrome DevTools Heap Snapshot comparison — take snapshots before/after suspected leaky action, look for growing detached nodes. (2) `performance.memory.usedJSHeapSize` polling — log heap size at regular intervals, alert if it exceeds a threshold. (3) RUM tools like Datadog Real User Monitoring — track "Page Memory" custom metric.

3. **"What is a detached DOM node?"**
   → A DOM node that has been removed from the document tree (`removeChild`, `innerHTML = ''`, etc.) but is still referenced by a JavaScript variable or closure. The node and its entire subtree (all children, their event listeners, their closures) cannot be GC'd. Fix: null out JavaScript references after removing from DOM.

4. **"What's the GC impact of using `const` vs `let` vs `var`?"**
   → Essentially none at the GC level — all three create variable bindings. The GC only cares about whether an object is reachable, not how the binding was declared. `const` improves developer intent clarity and may allow V8 optimizations in closures (knowing the binding won't be reassigned), but it's not a GC mechanism.

5. **"How does React's `useEffect` cleanup prevent memory leaks?"**
   → The function returned from `useEffect` runs when the component unmounts (and before the effect re-runs if deps change). This is where you cancel subscriptions, clear timers, and remove event listeners — exactly the same operations you'd do in Angular's `ngOnDestroy`.

6. **"When would you use `FinalizationRegistry`?"**
   → Almost never in production. Its callback fires non-deterministically, possibly never, and certainly not immediately after GC. It's only useful for debugging — confirming that an object was indeed collected. Never use it for resource cleanup (use explicit cleanup in finally blocks or destructors).

### Comparison: Strong Reference vs Weak Reference Caches

| Approach | GC Behaviour | Use Case |
|----------|-------------|----------|
| `new Map()` | Keys/values kept alive indefinitely | Cache with explicit eviction (LRU) |
| `new WeakMap()` | Entry auto-removed when key GC'd | Component metadata, DOM augmentation |
| `new WeakRef()` | Object collectible, deref to check | Non-critical observation without ownership |
| `new FinalizationRegistry()` | Callback on collection (non-deterministic) | Debugging only |

### How to Explain Trade-offs Verbally

> *"The trade-off with WeakMap is that you can't iterate over it or measure its size — it's intentionally opaque to prevent the GC state from being observable. For a bounded LRU cache where you need `size` and iteration, you need a Map with explicit eviction. For component-to-data metadata where you just want "forget it when the component is gone," WeakMap is the correct primitive."*

> *"The reason most memory leaks are hard to find is that the GC is doing exactly the right thing — it preserves anything reachable. The bug is in the application's reachability graph, not the GC. So you debug it by reasoning about ownership: who holds a reference to this object, and should they still?"*

---

## 5. Code Examples

### Proper Subscription Management in Angular

```typescript
// Pattern 1: Subject-based takeUntil (classic, Angular 2–16)
@Component({ selector: 'app-dashboard', template: '...' })
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.updates$
      .pipe(
        takeUntil(this.destroy$),    // Auto-unsubscribe on destroy
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(data => this.handleUpdate(data));
  }

  ngOnDestroy() {
    this.destroy$.next();   // Emit to complete all takeUntil subscriptions
    this.destroy$.complete();
  }
}

// Pattern 2: takeUntilDestroyed (Angular 16+ — cleaner)
@Component({ selector: 'app-dashboard', template: '...' })
export class DashboardComponent {
  private destroyRef = inject(DestroyRef);

  constructor(private dataService: DataService) {
    this.dataService.updates$
      .pipe(takeUntilDestroyed(this.destroyRef)) // No ngOnDestroy needed
      .subscribe(data => this.handleUpdate(data));
  }
}
```

### React Hook Pattern — Full Lifecycle

```typescript
// Custom hook that wraps an external subscription, fully leak-proof
function useDataStream<T>(stream$: Observable<T>): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    const subscription = stream$.subscribe({
      next: (v) => setValue(v),
      error: (e) => console.error('Stream error:', e),
    });

    // Cleanup: React calls this on unmount AND before every re-run (dep change)
    return () => subscription.unsubscribe();
  }, [stream$]); // stream$ in dep array: if it changes, old sub is cleaned up

  return value;
}

// AbortController pattern for fetch
function useResource(url: string) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(setData)
      .catch(e => {
        if (e.name !== 'AbortError') console.error(e); // Ignore expected abort
      });

    return () => controller.abort(); // Cancel in-flight request on unmount
  }, [url]);

  return data;
}
```

### Leak-Safe LRU Cache (Production Pattern)

```typescript
class LRUCache<K, V> {
  private map = new Map<K, V>();

  constructor(private readonly maxSize: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.maxSize) {
      // Delete least recently used (first entry in Map iteration order)
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(key, value);
  }

  get size() { return this.map.size; }
}

// Usage: DOM node metadata without preventing GC (WeakMap for DOM nodes)
const componentMetaCache = new WeakMap<HTMLElement, ComponentMeta>();
// Usage: bounded cache for API responses (LRU with max size)
const apiCache = new LRUCache<string, ApiResponse>(100);
```

### Performance.memory Monitoring in React

```typescript
// Track heap growth across route transitions (detect SPA leaks)
function useMemoryMonitor(routeName: string) {
  useEffect(() => {
    const perf = (performance as any).memory;
    if (!perf) return;

    const before = perf.usedJSHeapSize;
    const label = `Route: ${routeName}`;

    return () => {
      // On unmount — measure heap delta
      setTimeout(() => { // setTimeout gives GC a chance to run
        const after = perf.usedJSHeapSize;
        const delta = after - before;
        if (delta > 5 * 1024 * 1024) { // 5MB threshold
          console.warn(`[MemoryMonitor] ${label} leaked ~${(delta/1024/1024).toFixed(1)}MB`);
          // In production: send to Datadog / Sentry
        }
      }, 1000);
    };
  }, [routeName]);
}
```

---

## 6. Memory Aid (Quick Recall for Interview)

**LEAK = LACE:**
- **L**isteners not removed (event listeners on document/window)
- **A**rray/cache without bounds (Map growing forever, no LRU eviction)
- **C**losures capturing large objects unnecessarily
- **E**lements detached from DOM but held in JS variables

**GC Mental Model:** Think of memory as a citation graph in a library. The GC is the librarian who discards any book no one is currently reading AND no currently-read book cites. A memory leak is a book you don't need anymore but it's listed in the bibliography of a reference you forgot to remove.

**If you go blank:** *"Memory leaks happen when objects are still reachable but no longer semantically needed. The fix is always about removing the unintended reference — unsubscribe, null out, remove EventListener, or switch from Map to WeakMap."*

---

## 7. Why & How Summary

**Why it matters:**
→ **UX Impact:** Memory leaks in SPAs cause progressive UI sluggishness, tab crashes on mobile (low-memory kill), and session abandonment. A 100MB leak after 1 hour of use is invisible in testing but catastrophic at scale.
→ **Performance Impact:** GC pressure from many short-lived allocations adds 1–5ms pauses per Scavenge cycle. At 60fps (16.6ms budget), frequent GC events are a direct cause of dropped frames and poor INP scores.
→ **Business Impact:** Adobe's telemetry showed a 12% increase in Creative Cloud session length after fixing the top 3 memory leaks in their web editor. Memory hygiene = user retention.

**How it works:**
V8 uses Generational GC: short-lived allocations (New Space) are collected by fast Scavenge (copy-live-objects, wipe the rest, < 1ms). Long-lived objects (Old Space) are collected by incremental Mark-and-Sweep, interleaved with JS execution via write barriers to avoid stop-the-world pauses. An object leaks when it remains in the reachability graph from a GC root despite no longer being needed — the GC is correct; the reference graph is wrong.

**Company relevance:**
→ **Microsoft** — Teams web client is a long-running SPA; memory management is a first-class engineering concern. They specifically test React cleanup patterns and WeakRef/WeakMap usage.
→ **Adobe** — Creative Cloud web apps run for hours in a single tab. Adobe interviews probe deeply on identifying and fixing leaks in complex component trees. Familiarity with Chrome DevTools Heap Snapshots is expected.
→ **Salesforce** — Lightning Experience is a long-running SPA with complex component lifecycles (LWC connectedCallback/disconnectedCallback). Memory leaks in LWC components are a known enterprise problem.
→ **Cisco** — Dashboard and network monitoring UIs run 24/7 on operator workstations. Memory leaks cause operator workstations to require daily tab refreshes — a reliability and trust problem.
