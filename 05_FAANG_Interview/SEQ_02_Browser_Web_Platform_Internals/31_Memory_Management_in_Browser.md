# 31. Memory Management in Browser
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"Browser memory management involves the V8 JavaScript heap (managed by garbage collection), GPU VRAM (for compositor layers and WebGL textures), and browser process memory (for DOM nodes, CSSOM, layout objects). V8 uses a generational garbage collector: most objects are short-lived and collected cheaply in the 'young generation'; long-lived objects graduate to the 'old generation' and are collected less frequently via Mark-Sweep. Memory leaks in JavaScript occur when references prevent the GC from collecting objects that are no longer logically needed — the most common sources are forgotten event listeners, closures capturing large objects, detached DOM nodes being held in JavaScript references, and global state accumulators. At SAP, profiling with Chrome DevTools Memory tab revealed a 400MB → 120MB heap reduction opportunity: an Angular component was adding ResizeObserver callbacks on every render without removing the previous ones, creating a listener accumulation that doubled memory every 5 minutes."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### V8 Memory Architecture

```
V8 Heap Sections:
  Young Generation (New Space):
    ├─ From Space (half, ~1-8MB)
    └─ To Space (half) — semi-space copying GC
    
    If object survives 1 minor GC cycle → promoted to Old Generation
    Most objects are short-lived → cheap collection in Young Generation
  
  Old Generation (Old Space):
    ├─ Old Pointer Space: objects with pointers to other objects
    ├─ Old Data Space: objects containing only data (strings, typed arrays)
    ├─ Large Object Space: objects > 1MB (avoid these in hot paths)
    ├─ Code Space: JIT-compiled JavaScript bytecode + machine code
    └─ Map Space: V8 "hidden classes" (shapes)
    
  Non-V8 Heap (outside GC):
    ├─ DOM Nodes (allocated by Blink's garbage collector, Oilpan)
    ├─ CSS objects (CSSOM, StyleResolver)
    ├─ ArrayBuffers / SharedArrayBuffers (off-heap typed data)
    └─ WASM memory
```

### V8 Garbage Collection Algorithms

```
Minor GC (Scavenge) — Young Generation:
  Runs very frequently (every ~1MB allocated)
  Algorithm: Cheney's semi-space copying
  
  1. From Space is full
  2. Trace all live objects starting from roots (stack, globals)
  3. Copy live objects to To Space
  4. Swap From/To → old "From" space is now entirely free
  5. Objects that survived: "age" increments → promote to Old Gen after N cycles
  
  Cost: ~1-5ms, pauses JS execution (stop-the-world, short)
  
Major GC (Mark-Sweep-Compact) — Old Generation:
  Runs when Old Gen is filling up
  Phase 1 - Marking:
    Start from roots, traverse all reachable objects, mark as alive
    V8 uses "incremental marking" — spread across multiple JS tasks
      (interleaved with JS execution to avoid long pauses)
  Phase 2 - Sweeping:
    Collect unmarked objects, add to free lists
    Can run concurrently (background threads)
  Phase 3 - Compaction (when fragmented):
    Move surviving objects to contiguous memory (eliminates fragmentation)
    Requires stop-the-world pause
    V8 only compacts highly fragmented pages
    
  Cost: 20-200ms in stop-the-world portions, spread over time with incrementall/concurrent

Idle GC:
  Chrome schedules major GC during requestIdleCallback idle periods
  Minimizes jank from GC pauses
```

### Common Memory Leak Patterns

```typescript
// LEAK 1: Forgotten event listeners

class ComponentWithLeak {
  private data: Float64Array = new Float64Array(1e6); // 8MB per instance

  mount(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
    // 'bind' creates a NEW function object every call
    // ↑ Cannot be removed (different reference each call)
    // Accumulates on every mount → eventually many listeners + 8MB each
  }

  handleResize(): void { /* ... */ }

  // ❌ This is wrong:
  unmount(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    // NEW bind() → different reference → NOT the same listener → NOT removed!
  }
}

// FIX: store bound handler reference
class ComponentFixed {
  private data: Float64Array = new Float64Array(1e6);
  private handleResizeBound: () => void;

  constructor() {
    this.handleResizeBound = this.handleResize.bind(this);
  }

  mount(): void {
    window.addEventListener('resize', this.handleResizeBound);
  }

  handleResize(): void { /* ... */ }

  unmount(): void {
    window.removeEventListener('resize', this.handleResizeBound);
    // ✅ Same reference → correctly removed
  }
}
```

```typescript
// LEAK 2: Detached DOM nodes held by JavaScript

let detachedTree: Element | null = null;

function createLeak(): void {
  const fragment = document.createElement('div');
  for (let i = 0; i < 1000; i++) {
    fragment.appendChild(document.createElement('p'));
  }

  document.body.appendChild(fragment);
  document.body.removeChild(fragment); // removed from DOM

  detachedTree = fragment; // ❌ Still referenced! Cannot be GC'd
  // All 1000 <p> elements + fragment = DETACHED DOM TREE leak
}

// Fix: null out the reference when done
function fixedVersion(): void {
  const fragment = document.createElement('div');
  // ... use fragment ...
  document.body.removeChild(fragment);
  detachedTree = null; // ✅ Allow GC
}
```

```typescript
// LEAK 3: Closure capturing large data

function startDashboard(): () => void {
  const sensorData = new Float64Array(1e7); // 80MB sensor buffer

  // ❌ LEAK: setInterval callback closes over sensorData
  const interval = setInterval(() => {
    processSomeOf(sensorData); // valid use during interval lifetime
  }, 1000);

  return () => {
    clearInterval(interval); // ✅ cleanup, but is sensorData released?
    // If closure still has reference after cleanup → GC cannot collect sensorData
  };
}

// In practice: clearInterval breaks the scheduler reference,
// so after cleanup() the interval callback is GC'd → sensorData released
// BUT: if you store the callback in a module-level variable too → still leaks

let leaked: (() => void) | null = null;
function badVersion(): void {
  const sensorData = new Float64Array(1e7);
  leaked = () => processSomeOf(sensorData); // Module-level reference → never GC'd
  setInterval(leaked, 1000);
}
```

```typescript
// LEAK 4: Growing global data structures (caches without eviction)

const CACHE: Map<string, object> = new Map(); // module-level — lives forever

function fetchAndCache(key: string, data: object): void {
  CACHE.set(key, data); // Accumulates forever → memory leak
}

// FIX: LRU cache with max size
class BoundedCache<K, V> {
  private map = new Map<K, V>();

  constructor(private maxSize: number) {}

  set(key: K, value: V): void {
    if (this.map.size >= this.maxSize) {
      // Evict oldest (first key in insertion-order Map)
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(key, value);
  }

  get(key: K): V | undefined {
    return this.map.get(key);
  }
}

const boundedCache = new BoundedCache<string, object>(500);
```

```typescript
// LEAK 5: WeakMap/WeakRef — GC-friendly references

// WeakMap: key must be object, doesn't prevent GC of key
const elementMetadata = new WeakMap<Element, { height: number }>();

function trackElement(el: Element): void {
  elementMetadata.set(el, { height: el.clientHeight });
  // When 'el' is removed from DOM and no other references exist,
  // GC can collect 'el' AND the WeakMap entry is automatically removed
}

// WeakRef (ES2021): hold a reference that doesn't prevent GC
class SoftCache<V extends object> {
  private refs = new Map<string, WeakRef<V>>();
  private registry = new FinalizationRegistry<string>((key) => {
    this.refs.delete(key); // Map entry cleaned up when value is GC'd
    console.log(`Cache entry '${key}' was garbage collected`);
  });

  set(key: string, value: V): void {
    this.refs.set(key, new WeakRef(value));
    this.registry.register(value, key);
  }

  get(key: string): V | undefined {
    return this.refs.get(key)?.deref(); // Returns undefined if GC'd
  }
}
```

### Memory Profiling with Chrome DevTools

```
Tools available:
  Chrome DevTools → Memory tab:
  
  1. Heap Snapshot:
     Captures all live JS objects at a point in time
     Filter by: constructor name, retained size, distance from GC root
     Key columns:
       - Shallow size: memory the object itself uses
       - Retained size: memory freed if object were GC'd (includes all keeps-alive)
     
     Usage pattern to find leaks:
       Snapshot 1: baseline (after page load)
       Perform leaky action (open/close modal 10 times)
       Force GC (DevTools GC button)
       Snapshot 2: after actions
       Compare: objects in Snapshot 2 that weren't in Snapshot 1
       → Constructor shows what leaked

  2. Allocation Timeline:
     Records all heap allocations over time
     Shows when memory is allocated and whether it's freed
     Look for: "stepped" memory that never decreases (leak)

  3. Performance → Memory checkbox:
     Records JS heap, DOM count, layout count over time
     Used to: identify memory spikes during animations, detect DOM node leaks

DOM node count tracking:
  performance.memory (non-standard, Chrome only):
    usedJSHeapSize: current heap bytes in use
    totalJSHeapSize: committed heap size
    jsHeapSizeLimit: max heap limit

  'node' count: DevTools Performance shows DOM node count
    Steadily growing DOM count = detached DOM node leak (or infinite list without virtualization)
```

### Memory Budget Guidelines

```
Desktop:
  JS heap: < 50MB for most apps; < 200MB for data-heavy apps
  DOM nodes: < 10,000 for smooth rendering; < 1500 recommend for animation perf
  GPU VRAM: < 150MB total for compositing layers

Mobile (midrange Android, 3GB RAM):
  JS heap: < 20MB
  DOM nodes: < 3,000 (virtualize any list > 100 items)
  GPU VRAM: < 50MB compositor layers

SAP Fiori target (after optimization): 120MB JS heap (from 400MB)
  Key changes:
    - Angular OnPush change detection (skip re-renders → less JS allocation)
    - Virtualized tile grid (3,000 DOM nodes → 200 at any time)  
    - LRU tile data cache (500 max entries)
    - Removed accumulating ResizeObserver callbacks on re-render
```

---

### ⚠️ Anti-Patterns & Pitfalls

- **`addEventListener` in a React `useEffect` without cleanup:** Every `useEffect` that adds an event listener must return a cleanup function calling `removeEventListener`. Forgetting this means every component re-mount adds a new listener without removing the old one. In strict mode (React 18), effects run twice intentionally to surface exactly this bug.

- **Storing large objects in React state when only a property is needed:** `const [sensorData, setSensorData] = useState<Float64Array>(new Float64Array(1e7))`. The entire 80MB array is held in React state and re-created on each update (even if only reading one field). Use refs or external stores (Zustand) for large non-reactive data.

- **Circular references between parent and child components:** Component A holds a reference to Component B; Component B holds a callback reference to Component A. Circular references prevent GC in older GC implementations. Modern GC handles cycles, but explicit cleanup (setting references to null on unmount) is still best practice.

- **Generating large arrays in `useMemo` or computed properties without memoization keys:** A `useMemo(() => generateLargeArray(), [])` is fine. A `useMemo(() => generateLargeArray(), [items])` where `items` changes every render (object literal in JSX) generates a new large array every render.

- **setInterval without proper cleanup in SPA navigation:** SPAs don't fully unload pages. An Angular component with `setInterval` that doesn't clear it in `ngOnDestroy` keeps running indefinitely — both leaking the interval closure's captured data AND burning CPU cycles.

---

## 🏭 3. Real-World Examples

**SAP Fiori — 400MB → 120MB heap reduction:**

Chrome DevTools Memory Heap Snapshot comparison before/after navigating between SAP modules revealed: the 'ResizeObserver' constructor had 1,200 live instances after 10 minutes of use (should be ~20). An Angular component was creating `new ResizeObserver(...)` on every `ngOnChanges` call (called on every `@Input` change) without disconnecting the previous observer. Each observer held a reference to the component instance → preventing GC of old component instances. Fix: Store observer reference, call `.disconnect()` in `ngOnDestroy` and before creating new instance. Result: heap stabilized at 120MB (was steadily growing to 400MB in 10 minutes).

**Bosch WebSocket Dashboard — Accumulating sensor buffer:**

The sensor data stream arrived at 50Hz (50 messages/second). Each message's raw data was pushed to a module-level array. The array was never truncated — after 1 hour, it held 180,000 sensor readings × 8 fields × 8 bytes = ~11.5MB per hour, reaching 690MB after a workday. Fix: Circular buffer (ring buffer) of fixed size 10,000 readings for display, plus a compressed archival store separate from the live WebSocket buffer.

**Microsoft Teams — Virtual list for infinite message history:**

Teams' chat message list used an infinite DOM: all messages ever loaded stayed in the DOM. With 10,000 messages (common for active channels), the DOM had 50,000+ nodes and the layout/paint time grew linearly. Teams migrated to a virtualized list (TanStack Virtual): only ~30-50 visible items in DOM at any time. Memory usage: ~800 DOM nodes (fixed) vs 50,000 DOM nodes (before). Scroll performance improved from 20fps → 60fps.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim)

> "Browser memory management has three layers: V8 heap (JavaScript objects, GC-managed), DOM memory (Blink's Oilpan GC for DOM nodes and CSS), and GPU VRAM (compositor layers, WebGL textures). V8 uses a generational GC: short-lived objects collected cheaply in Young Generation via semi-space copying; long-lived objects in Old Generation collected by incremental Mark-Sweep.

> Memory leaks in JavaScript occur when references prevent GC from collecting objects that are no longer needed. The four key leak patterns: (1) event listeners added without remove — especially `.bind(this)` storing a new reference; (2) detached DOM nodes stored in JS variables; (3) global caches without eviction (Map that only grows); (4) closures over large objects in setInterval/rAF.

> At SAP, profiling with Heap Snapshot comparison found ResizeObserver instances accumulating (1,200 live instances when only 20 should exist). Each held a reference to its Angular component — preventing their GC. Fix: store observer reference, disconnect in ngOnDestroy. Heap went from 400MB down to 120MB."

---

### Likely Follow-up Questions

1. **Why doesn't JavaScript's GC handle circular references?** → Modern V8 (Mark-Sweep) DOES handle circular references — the marking phase only fails to trace objects that are unreachable from roots, regardless of internal cycles. Circular references prevented collection only in older reference-counting GC implementations (IE6). Today, circular references are fine as long as the cycle itself is unreachable from roots.

2. **What is a "detached DOM node"?** → A DOM node that has been removed from the document (via `removeChild` or `innerHTML = ''`) but is still referenced by JavaScript. Since JS holds a reference, V8 cannot GC the node. In Chrome DevTools → Memory → Heap Snapshot, filter by "Detached" to find these. Common source: storing removed list items in a JS array for "undo" functionality without limiting the array size.

3. **When would you use WeakMap over Map for caching?** → When the cache key is a DOM element or object that might be removed/GC'd independently of the cache. `WeakMap` doesn't hold a strong reference to its keys, so if the key object is GC'd, the entry is automatically removed. With a regular `Map`, storing an element as key keeps it alive even after removal from DOM.

4. **How does React's `useEffect` cleanup prevent memory leaks?** → The cleanup function returned from `useEffect` runs before the next effect invocation and on component unmount. It's the mechanism to call `removeEventListener`, `clearInterval`, `cancelAnimationFrame`, `observer.disconnect()`, etc. — releasing all resources the effect acquired. Without it, each re-render or remount accumulates resources.

---

## 💻 5. Code Example

```typescript
// DEMO 1: Safe event listener management with proper cleanup
class EventManager {
  private listeners: Array<{ target: EventTarget; type: string; fn: EventListenerOrEventListenerObject }> = [];

  on(
    target: EventTarget,
    type: string,
    fn: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions
  ): void {
    target.addEventListener(type, fn, options);
    this.listeners.push({ target, type, fn });
  }

  destroyAll(): void {
    this.listeners.forEach(({ target, type, fn }) => {
      target.removeEventListener(type, fn);
    });
    this.listeners = [];
  }
}

// Usage in a component:
class SensorWidget {
  private events = new EventManager();
  private resizeObserver: ResizeObserver | null = null;

  mount(container: HTMLElement): void {
    this.events.on(window, 'resize', this.onResize, { passive: true });
    this.events.on(document, 'visibilitychange', this.onVisibility);

    this.resizeObserver = new ResizeObserver(this.onContainerResize);
    this.resizeObserver.observe(container);
  }

  unmount(): void {
    this.events.destroyAll();              // Remove all event listeners
    this.resizeObserver?.disconnect();     // Disconnect observer
    this.resizeObserver = null;           // Release reference
  }

  private onResize = (): void => { /* ... */ };
  private onVisibility = (): void => { /* ... */ };
  private onContainerResize = (): void => { /* ... */ };
}

// DEMO 2: React useEffect with complete cleanup
import { useEffect, useRef } from 'react';

function useResizeObserver(
  ref: React.RefObject<HTMLElement>,
  callback: (size: { width: number; height: number }) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      const { inlineSize: width, blockSize: height } = entry.contentBoxSize[0];
      callbackRef.current({ width, height });
    });

    observer.observe(el);

    // ✅ Cleanup: disconnect observer on unmount or re-run
    return () => observer.disconnect();
  }, [ref]); // Effect re-runs only if ref changes
}

// DEMO 3: Memory-safe circular buffer for streaming data
class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private count = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  toArray(): T[] {
    if (this.count < this.capacity) return this.buffer.slice(0, this.count);
    const tail = this.head;
    return [
      ...this.buffer.slice(tail),
      ...this.buffer.slice(0, tail),
    ];
  }

  get size(): number { return this.count; }
}

// Bosch sensor stream: fixed 10,000 reading buffer
const sensorBuffer = new CircularBuffer<{ timestamp: number; value: number }>(10_000);

// DEMO 4: Memory profiling snapshot comparison utility
function captureMemorySnapshot(): { heapMB: number; domNodes: number; timestamp: number } {
  return {
    heapMB: 'memory' in performance
      ? +((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(1)
      : -1,
    domNodes: document.querySelectorAll('*').length,
    timestamp: Date.now(),
  };
}

function detectLeak(before: ReturnType<typeof captureMemorySnapshot>,
                    after: ReturnType<typeof captureMemorySnapshot>): void {
  const heapDiff = after.heapMB - before.heapMB;
  const domDiff = after.domNodes - before.domNodes;
  if (heapDiff > 5) console.warn(`Potential heap leak: +${heapDiff.toFixed(1)}MB`);
  if (domDiff > 50) console.warn(`DOM node accumulation: +${domDiff} nodes`);
}

// Usage:
const before = captureMemorySnapshot();
// ... perform action 10 times ...
const after = captureMemorySnapshot();
detectLeak(before, after);
```

---

## 🧠 6. Memory Aid

**Mental Model:**
Memory is like a storage unit. V8 GC is the storage manager who periodically checks which boxes are still claimed. A "leak" is a box that nobody uses anymore but the manager can't remove because there's still a name tag on it (reference). The fix: remove the name tag (null-out the reference, removeEventListener, disconnect observer, clearInterval).

**4 leak patterns:**
1. **Listeners without remove** → `addEventListener` without matching `removeEventListener`
2. **Detached DOM nodes** → removed from DOM, held in JS variable
3. **Unbounded caches** → Map/Set that only grows
4. **Closures in intervals** → setInterval callback closures holding large data indefinitely

**Generational GC mental model:**
- Young Gen = kindergarten: cheap, fast collection, most don't survive
- Old Gen = permanent employees: rarely let go, expensive collection when it happens
- Goal: keep allocations in Young Gen (short-lived objects)

**Mnemonic: LDCU** — **L**isteners (remove them), **D**etached DOM (null references), **C**aches (bound them), **U**nsubscribe (clearInterval, disconnect observers).

**If you go blank:** *"V8: generational GC (Young Gen = cheap Scavenge; Old Gen = expensive Mark-Sweep). Leaks: forgotten event listeners, detached DOM nodes held in JS, growing caches, closures in intervals. Fix: removeEventListener in cleanup, null detached nodes, LRU caches, clearInterval on unmount. Profile: Chrome DevTools → Memory → Heap Snapshot comparison."*

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Memory leaks in SPAs don't crash immediately — they cause gradual degradation. Pages become sluggish after 30 minutes of use (30-minute session = ~350MB heap in a leaky app). Users who keep tabs open all day (enterprise users: SAP, Salesforce portals) are most affected. On mobile, OOM (Out of Memory) kills causes tab crash with "Aw, Snap!" errors.
→ **Performance:** Garbage collection pauses (especially Major GC's stop-the-world phases) cause jank. A 100MB old generation heap has fewer major GC pauses than a 400MB heap. Reducing heap size reduces GC frequency and duration — improving both responsiveness and animation smoothness.
→ **Business:** Salesforce Experience Cloud supports 8-hour+ browser sessions for call center agents. Memory leaks that cause 1-2 tab refreshes per shift are measured as "productivity loss" (each refresh = 30-60s downtime). SAP monitors session memory usage for enterprise customers with SLAs on uptime and performance.

**How it works (3 sentences):**
V8's generational garbage collector allocates new JavaScript objects in the Young Generation (a small 1-8MB semi-space), cleans it cheaply and frequently via Scavenge (copying live objects to a fresh semi-space), and promotes long-lived survivors to the Old Generation where less frequent, more expensive incremental Mark-Sweep-Compact collection runs. Memory leaks occur when references prevent unreachable objects from being collected — the four main patterns are: event listeners added without matching removal (the listener reference chain keeps the entire component tree alive), detached DOM nodes stored in JavaScript variables, growing unbounded caches (unbounded Maps/Sets that accumulate entries forever), and closures capturing large objects inside setInterval or rAF callbacks that are never cleared. The fix in all cases is reference lifecycle management: store and remove event listener references, null out detached DOM references, bound caches with LRU eviction, and always clear timers and disconnect observers in component teardown (React's useEffect cleanup, Angular's ngOnDestroy, LitElement's disconnectedCallback).

**Company relevance:**
- **Microsoft:** Teams client is a long-lived SPA (users keep one tab open all day). Memory leak budget is an explicit engineering requirement: automated heap snapshot tests run against every major release, failing if heap grows > 5MB over a simulated 4-hour session. Teams' engineering blog documents the setInterval/closure leak as historically their #1 memory leak source.
- **Adobe:** Photoshop Web loads large image buffers (ArrayBuffer, up to 2GB for 100MP images). These are NOT V8 heap — they're off-heap ArrayBuffer allocations. Adobe's memory management explicitly manages these via `worker.postMessage(buffer, [buffer])` (transferables) to move data to Web Workers, freeing main thread ArrayBuffer references.
- **Salesforce:** Call Center Cloud (Service Cloud) is open 8 hours per shift. Salesforce's memory SLA: < 100MB JS heap growth per 8-hour session. Automated memory regression tests run on every CI build using Puppeteer + Chrome CDP memory profiling.
- **Cisco:** WebEx participant video tiles are `<video>` elements with MediaStream sources. When participants leave, `srcObject` must be set to null and the MediaStream tracks stopped — otherwise the browser holds MediaStream track memory (and potentially webcam access) indefinitely. Cisco's WebEx web client has explicit track stopping in the participant cleanup code path.

---
✅ **Topic 31/486 complete.**
→ **Continuing to Topic 32: Browser Storage Options Overview**
