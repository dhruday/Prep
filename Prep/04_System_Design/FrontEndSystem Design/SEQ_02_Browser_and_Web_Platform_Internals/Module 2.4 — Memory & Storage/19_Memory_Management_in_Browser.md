# 19. Memory Management in the Browser

---

## 1. High-Level Explanation (Frontend Interview Level)

Browser memory management is the process by which JavaScript objects, DOM nodes, and other resources are allocated and released. The browser uses **automatic garbage collection (GC)** — developers don't manually free memory, but they must understand how the GC works to avoid **memory leaks** that cause slow, bloated, and eventually crashing applications.

**Why it matters for frontend engineers:**
- SPAs (Single Page Applications) are especially prone to memory leaks — the page never unloads, so leaked memory accumulates across navigations
- A memory leak in a long-lived SPA can cause the browser tab to consume gigabytes of RAM over a work session
- GC pauses (brief stop-the-world events) can cause unexpected jank in smooth animations
- Understanding memory models allows you to write leak-free React/Angular/Vue components

**Key concepts:**
- **Stack Memory** — Primitive values, function frames; automatically freed on return
- **Heap Memory** — Objects, arrays, closures; managed by GC
- **Mark-and-Sweep GC** — The dominant GC algorithm in V8
- **Memory Leaks** — Objects that should be freed but remain reachable through unintended references
- **Detached DOM Nodes** — The most common leak type in component-based UIs

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### V8's Garbage Collector Architecture

V8 uses a **generational garbage collector** (Orinoco GC):

```
Heap
├── Young Generation (Nursery + Intermediate)
│   ├── Scavenger (Minor GC) — runs frequently, very fast
│   └── Objects promoted here after surviving 1-2 minor GC cycles
│
└── Old Generation (Large Objects Space + Code Space + More)
    └── Major GC (Mark-Compact) — runs infrequently, more disruptive
```

**Generational Hypothesis:** Most objects die young (short-lived temporaries). By separating young and old objects, the GC can collect young-gen objects very cheaply (just scan a small area) without touching the large old-gen heap.

**Minor GC (Scavenger):** Runs in ~1ms, uses a "semi-space" copying algorithm. Live young objects are copied to a new area; dead ones are simply left behind (their space is reclaimed).

**Major GC (Mark-Compact):**
1. **Mark phase:** Starting from GC roots (global variables, stack, Web API callbacks), trace all reachable objects. Objects that are NOT reachable are garbage.
2. **Compact phase:** Move live objects together, eliminating fragmentation.
3. **Sweep phase:** Reclaim dead object space.

**Stop-the-World vs Incremental/Concurrent GC:**
Old V8 ran Major GC as a stop-the-world pause — all JS execution halted. Modern V8 uses:
- **Incremental Marking** — Mark phase is interleaved with JS execution in small increments
- **Concurrent Marking** — Marking runs on helper threads while JS runs in parallel
- **Lazy Sweeping** — Sweep is deferred to idle time
- Result: GC pauses are rare and much shorter (<1ms typical for minor GC)

**What GC roots include:**
- All global variables (`window`, `document`)
- Current call stack
- Registered Web API callbacks (event listeners, timers, Promises)
- Cross-context references (worker messages, iframes)

### Common Memory Leak Patterns

**1. Forgotten Event Listeners**

```javascript
// LEAK: addEventListener without removeEventListener
class Component {
  mount() {
    this.handler = () => this.handleClick();
    document.addEventListener('click', this.handler); // Registers handler
    // Component is removed from DOM but handler still holds reference to 'this'!
  }
  
  // Missing: unmount() { document.removeEventListener('click', this.handler); }
}

// FIX: Always clean up event listeners
class Component {
  mount() {
    this.handler = this.handleClick.bind(this);
    document.addEventListener('click', this.handler);
  }
  
  unmount() {
    document.removeEventListener('click', this.handler); // Required!
  }
}

// MODERN FIX: AbortController signal
const controller = new AbortController();
document.addEventListener('click', handler, { signal: controller.signal });
// Later:
controller.abort(); // Removes all listeners registered with this signal
```

**2. Detached DOM Nodes**

```javascript
// LEAK: holding references to DOM nodes after removal
const button = document.getElementById('my-button');
button.remove(); // Node is removed from DOM tree

// But 'button' variable still holds a reference!
// GC cannot collect it. It's a "detached DOM node" — no parent, but referenced in JS

// FIX: Null out references when done
let button = document.getElementById('my-button');
button.remove();
button = null; // Let GC collect it
```

React's `useEffect` cleanup with refs:
```javascript
function Component() {
  const timerRef = useRef(null);
  
  useEffect(() => {
    timerRef.current = setInterval(() => {
      // Do work
    }, 1000);
    
    // CRITICAL: cleanup function prevents leak when component unmounts
    return () => {
      clearInterval(timerRef.current); // Remove timer — releases closure reference
      timerRef.current = null;
    };
  }, []);
}
```

**3. Closures over Large Scopes**

```javascript
// LEAK: closure captures entire large array
function processData(dataset) {
  const LARGE_ARRAY = new Array(100000).fill({data: 'sensitive'});
  
  return function getResult() {
    return LARGE_ARRAY[0]; // Only needs first item, but holds ALL 100K items
  };
}

// FIX: extract only what you need from the closure scope
function processData(dataset) {
  const LARGE_ARRAY = new Array(100000).fill({data: 'sensitive'});
  const firstItem = LARGE_ARRAY[0]; // Extract needed value
  
  return function getResult() {
    return firstItem; // Only holds one item's reference, not the whole array
  };
}
```

**4. Timers and Intervals**

```javascript
// LEAK: setInterval without clearInterval
function startPolling() {
  setInterval(() => {
    fetch('/api/updates').then(handleUpdate); // Keeps running forever
  }, 5000); // Missing: clearInterval reference
}

// FIX: track and clear
class PollingService {
  start() {
    this.intervalId = setInterval(() => {
      fetch('/api/updates').then(r => r.json()).then(this.handleUpdate);
    }, 5000);
  }
  
  stop() {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}
```

**5. Growing Collections (Caches Without Eviction)**

```javascript
// LEAK: unbounded cache grows forever
const requestCache = new Map();

async function fetchUser(id) {
  if (requestCache.has(id)) return requestCache.get(id);
  
  const user = await fetch(`/api/user/${id}`).then(r => r.json());
  requestCache.set(id, user); // Added but NEVER removed
  return user; // In a long-lived SPA, this map grows forever
}

// FIX 1: LRU cache with max size
// FIX 2: WeakMap (automatic GC when keys are collected)
const requestCache = new WeakMap(); // Keys must be objects; auto-cleaned by GC

// FIX 3: TTL-based expiration
const cache = new Map();
function setWithTTL(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  setTimeout(() => cache.delete(key), ttlMs); // Scheduled cleanup
}
```

**`WeakMap` and `WeakSet`** — weak references for cache-friendly patterns:
- Keys in `WeakMap` are held weakly — if no other reference to the key exists, the key AND value are GC'd
- Cannot iterate over them (no `.keys()`, `.values()`) — GC control of entries

### Memory Profiling Workflow

**Chrome DevTools — Memory Panel:**

1. **Heap Snapshot** — Point-in-time snapshot of all live objects
   - Identify large surviving objects
   - Look for arrays of detached DOM nodes (`Detached HTMLDivElement`)
   - Use "Snapshot comparison" to see what was created between two snapshots

2. **Allocation Timeline** — Record allocations over time
   - Identify which code paths are creating objects that survive long
   
3. **Allocation Sampling** — Lightweight continuous sampling
   - Less precise than full recording but suitable for production-like sessions

**Leak detection workflow:**
```
1. Take heap snapshot A (baseline)
2. Perform actions that might leak (navigate back and forth, open/close modals)
3. Force GC (DevTools Memory panel → force GC icon)
4. Take heap snapshot B
5. Compare: Objects in B that weren't in A are potential leaks
6. Filter by "Detached DOM" node type
7. Trace GC root path to identify retaining reference
```

### Performance.memory API (Chrome only)

```javascript
// Basic memory monitoring (non-standard, Chrome only)
if (performance.memory) {
  console.log({
    totalJSHeapSize: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
    usedJSHeapSize: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
    jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB',
  });
}

// Monitor for memory growth over time (basic leak detector)
let previousHeap = 0;
setInterval(() => {
  const current = performance.memory?.usedJSHeapSize || 0;
  if (current > previousHeap * 1.2) { // >20% growth
    console.warn(`Memory grew significantly: ${(current/1024/1024).toFixed(0)}MB`);
  }
  previousHeap = current;
}, 10000);
```

---

## 3. Real-World Examples

### Gmail — SPA Memory Management
Gmail runs as a long-lived SPA and previously was notorious for memory bloat. Google spent significant engineering effort on lifecycle management for their virtual component tree, ensuring every "view" that's removed from display properly removes all event listeners, cancels pending fetches, and nulls DOM references.

### React — useEffect Cleanup
React's `useEffect` cleanup function is explicitly designed to prevent memory leaks. The framework calls cleanup when components unmount, and React's linter rules (`react-hooks/exhaustive-deps`) enforce declaring all dependencies to prevent stale closure bugs.

### Slack — Long-Lived SPA Memory Limits
Slack (Electron/browser) is one of the most memory-heavy web apps. Per reports, a Slack tab in a browser can consume 1-2GB of RAM after hours of use. Many of these are memory leaks from cached message data, unreleased event listeners, and growing message history caches without proper LRU eviction.

### Next.js Page Router vs App Router Memory
Next.js App Router (React Server Components) deliberately keeps heavy data on the server, only sending serialized props to the client. This architectural choice reduces client-side heap size compared to the old Page Router pattern of loading full datasets into client-side state.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"JavaScript memory is managed by V8's generational garbage collector. The young generation uses a fast scavenger algorithm — most short-lived objects (local variables, render-cycle temporaries) are collected here within milliseconds. The old generation uses mark-and-compact, which is more expensive, but V8 runs it incrementally and concurrently to minimize pauses.*

*The common memory leak patterns in SPAs are: forgotten event listeners (no cleanup on component unmount), detached DOM nodes (holding JS references to removed DOM elements), closures over large scopes, unbounded caches, and uncleaned timers/intervals.*

*In React specifically, `useEffect` cleanup functions are the primary mechanism for preventing leaks — clean up event listeners, cancel subscriptions, clear timers, abort pending fetches. The `AbortController` API is particularly clean for canceling fetch requests.*

*For production debugging, I use Chrome DevTools heap snapshots with the comparison mode — take a baseline snapshot, perform leak-inducing actions, force GC, take another snapshot, then compare. Detached DOM nodes in the diff are almost always the leak. For CI monitoring, I set alerts on heap size growth using the `performance.memory` API in long-running integration tests."*

### Likely Follow-up Questions

1. **"What is a detached DOM node and why is it a memory leak?"**
   → A DOM node that has been removed from the document tree but is still referenced by a JS variable. The GC cannot collect it because it's reachable. Common in component frameworks when cleanup code doesn't null out refs.

2. **"When would you use WeakMap over Map for caching?"**
   → When the cache key is an object whose lifetime you don't control (e.g., DOM nodes, React component instances). WeakMap keys are held weakly — when the key object is collected, the cache entry is automatically removed without your code needing to manage cleanup.

3. **"How do you prevent memory leaks in React components?"**
   → Return cleanup functions from `useEffect` to clear timers, remove event listeners, cancel subscriptions (AbortController for fetch, unsubscribe for stores). Use `useRef` for values that shouldn't trigger re-renders but need cleanup. Avoid storing DOM references without nulling them on unmount.

4. **"What's the practical difference between minor and major GC?"**
   → Minor GC (scavenger) is fast (~0.5–1ms), frequent, handles short-lived objects. Major GC (mark-compact) is slower, less frequent, but has been made incremental/concurrent in modern V8 to minimize pauses. You can see both in Chrome DevTools Performance panel as garbage collection events.

---

## 5. Code Examples

### React Hook for Leak-Free Async Operations

```javascript
// Custom hook that cancels async operations on unmount
function useAsync(asyncFn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    
    setState({ loading: true, data: null, error: null });
    
    asyncFn({ signal: controller.signal })
      .then(data => {
        if (mounted) setState({ loading: false, data, error: null });
      })
      .catch(error => {
        if (mounted && error.name !== 'AbortError') {
          setState({ loading: false, data: null, error });
        }
      });
    
    return () => {
      mounted = false;         // Prevent setState on unmounted component
      controller.abort();      // Cancel in-flight fetch
    };
  }, deps);
  
  return state;
}
```

### WeakRef for Optional Caching (V8 2020+)

```javascript
// WeakRef — references that don't prevent GC
// Use for optional caches where you want to use existing objects if available
// but don't want to prevent their collection

const cache = new Map(); // string → WeakRef<T>

function getCachedOrCreate(key, factory) {
  let ref = cache.get(key);
  let value = ref?.deref(); // Returns undefined if GC'd
  
  if (value === undefined) {
    value = factory();
    cache.set(key, new WeakRef(value));
  }
  
  return value;
}

// WeakRef does NOT guarantee the referenced object survives any particular GC
// It's an optimization hint, not a guarantee
```

---

## 6. Why & How Summary

**Why it matters:**
Memory leaks are the silent performance killer in long-lived SPAs. A tab that starts at 50MB can grow to 1GB after an hour of use, becoming unresponsive and eventually crashing. GC pressure (frequent allocations of large objects) causes minor GC pauses that appear as subtle jank. Memory management discipline — proper cleanup, bounded caches, weak references — is the architectural hygiene that keeps production SPAs responsive over long sessions. Senior engineers are expected to immediately recognize the leak patterns and prescribe idiomatic fixes.

**How it works:**
V8 uses a generational GC where young objects are collected by a fast scavenger, and long-lived objects promoted to the old generation are collected by a concurrent mark-compact GC. A memory leak occurs when an object that is functionally unreachable (unused) remains in the GC root traversal path through an accidental reference. The four main paths to leaks: event listeners registered on global/long-lived objects, JS variables pointing to removed DOM nodes, closures capturing large parent scopes, and global/module-level caches without eviction policies. Prevention: cleanup event listeners in component teardown, null DOM references after removal, use WeakMap/WeakSet for object-keyed caches, and enforce size limits on all caches.
