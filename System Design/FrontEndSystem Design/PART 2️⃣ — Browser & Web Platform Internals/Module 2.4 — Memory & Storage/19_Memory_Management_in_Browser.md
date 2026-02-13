# 19. Memory Management in Browser

## 1. High-Level Explanation (Frontend Interview Level)

**Memory Management in Browser** handles how JavaScript allocates, uses, and frees memory through garbage collection—understanding heap structure, GC algorithms, and memory leak patterns enables building performant applications that don't crash due to out-of-memory errors.

- **Heap Memory**: Where objects/arrays are stored (automatic GC)
- **Garbage Collection**: Mark-and-sweep algorithm frees unreferenced objects
- **Memory Leaks**: Detached DOM, event listeners, closures prevent GC

**Key Principle**: "Allocate efficiently, release references promptly—avoid memory leaks that prevent garbage collection."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Memory Structure

**JavaScript Memory Layout**:
```
Stack (LIFO):
├── Primitives (numbers, booleans, null, undefined)
├── References to heap objects
├── Function call frames
├── Size: ~1-2MB (limited)
└── Fast access (LIFO push/pop)

Heap (Dynamic):
├── Objects
├── Arrays
├── Functions
├── Closures
├── Size: Varies (32-bit: ~1.4GB, 64-bit: ~4GB default)
└── Slower access (requires GC)
```

**Example**:
```javascript
function example() {
  const num = 42;              // Stack (primitive)
  const str = 'hello';         // Stack (primitive in V8)
  const obj = { x: 1 };        // Heap (object)
  const arr = [1, 2, 3];       // Heap (array)
  
  // Stack holds references to heap objects
  // When function returns, stack frame popped
  // Heap objects eligible for GC (if no other references)
}
```

---

### Garbage Collection (GC)

**Generational Hypothesis**:
```
Observation: Most objects die young

Young Generation (Minor GC):
├── Nursery (new objects)
│   ├── Fast allocation
│   ├── Frequent GC (every 1-8MB allocated)
│   └── Short-lived objects (90%+ die)
└── Survivor (survived 1 GC)
    ├── Intermediate objects
    └── If survive 2 GCs → promoted to Old Gen

Old Generation (Major GC):
├── Long-lived objects
├── Infrequent GC (100MB+ allocated)
└── More expensive (full heap scan)
```

**GC Timeline**:
```
Time 0ms:     Allocate 100 objects (Nursery)
Time 10ms:    Minor GC triggered (8MB threshold)
              ├── Mark: Find reachable from roots
              ├── Sweep: Free unreachable (90 objects)
              └── Move survivors to Survivor space (10 objects)
              Cost: 1-5ms (short pause)

Time 100ms:   Allocate 10,000 objects
Time 500ms:   Major GC triggered (Old Gen full)
              ├── Mark: Scan entire heap
              ├── Sweep: Free unreachable
              └── Compact: Move objects together (defragment)
              Cost: 10-100ms (long pause, can cause jank)
```

---

### Mark-and-Sweep Algorithm

**Phase 1: Mark** (Find reachable objects):
```javascript
// Roots (starting points for GC):
const roots = [
  window,                    // Global object
  document,                  // DOM
  activeFunctionCallStacks,  // Stack frames
  setInterval/setTimeout,    // Timers
  Web Workers,               // Worker contexts
];

// Mark algorithm (simplified):
function mark(roots) {
  const marked = new Set();
  const stack = [...roots];
  
  while (stack.length > 0) {
    const obj = stack.pop();
    
    if (!marked.has(obj)) {
      marked.add(obj);
      
      // Follow references (recursive)
      for (const ref of Object.values(obj)) {
        if (typeof ref === 'object' && ref !== null) {
          stack.push(ref);
        }
      }
    }
  }
  
  return marked;
}
```

**Phase 2: Sweep** (Free unmarked objects):
```javascript
// Sweep algorithm (simplified):
function sweep(heap, marked) {
  for (const obj of heap) {
    if (!marked.has(obj)) {
      // Object not reachable → free memory
      freeMemory(obj);
    }
  }
}
```

**Phase 3: Compact** (Optional, Old Gen):
```
Before compact (fragmented):
[Obj1][Free][Obj2][Free][Free][Obj3]

After compact (defragmented):
[Obj1][Obj2][Obj3][Free][Free][Free]

Benefits:
- Contiguous free memory (faster allocation)
- Better cache locality (faster access)

Cost:
- Expensive (move objects, update pointers)
```

---

### Memory Leaks (Prevent GC)

**1. Detached DOM Nodes**:

**Problem**: DOM removed, but JavaScript holds reference.

```javascript
// ❌ Memory leak
let detached;

function createList() {
  const list = document.createElement('ul');
  for (let i = 0; i < 1000; i++) {
    list.appendChild(document.createElement('li'));
  }
  document.body.appendChild(list);
  
  // Store reference
  detached = list;
  
  // Remove from DOM (but detached still references it)
  document.body.removeChild(list);
  
  // Result: 1000 <li> nodes in memory (not GC'd)
}

// ✅ Fix: Release reference
function createList() {
  const list = document.createElement('ul');
  // ...
  document.body.appendChild(list);
  
  document.body.removeChild(list);
  
  // No reference → GC can collect
}
```

**Detection**:
```
Chrome DevTools → Memory → Heap Snapshot
Filter: "Detached"
Shows: Detached DOM nodes with references
```

---

**2. Event Listeners**:

**Problem**: Event listeners not removed on element removal.

```javascript
// ❌ Memory leak
function addListItem(text) {
  const li = document.createElement('li');
  li.textContent = text;
  
  // Event listener holds closure over 'li'
  li.addEventListener('click', () => {
    console.log('Clicked:', text);
  });
  
  list.appendChild(li);
}

// Remove list (but event listeners still registered)
list.remove();

// Result: All <li> + listeners in memory (not GC'd)
```

**Fix**:
```javascript
// ✅ Solution 1: Remove listeners manually
const listeners = new Map();

function addListItem(text) {
  const li = document.createElement('li');
  li.textContent = text;
  
  const handler = () => console.log('Clicked:', text);
  li.addEventListener('click', handler);
  
  listeners.set(li, handler);
  list.appendChild(li);
}

function cleanup() {
  for (const [li, handler] of listeners) {
    li.removeEventListener('click', handler);
  }
  listeners.clear();
  list.remove();
}

// ✅ Solution 2: AbortController (Chrome 88+)
function addListItem(text) {
  const li = document.createElement('li');
  li.textContent = text;
  
  const controller = new AbortController();
  
  li.addEventListener('click', () => {
    console.log('Clicked:', text);
  }, { signal: controller.signal });
  
  list.appendChild(li);
  
  // Cleanup: abort removes listener automatically
  li.dataset.abort = controller;
}

function cleanup() {
  for (const li of list.children) {
    li.dataset.abort?.abort();
  }
  list.remove();
}
```

---

**3. Closures**:

**Problem**: Closures capture outer scope (prevents GC).

```javascript
// ❌ Memory leak
function createHeavyClosures() {
  const largeData = new Array(1000000).fill('data'); // ~8MB
  
  // Closure captures largeData (even if not used)
  const closures = [];
  for (let i = 0; i < 1000; i++) {
    closures.push(() => {
      console.log(i); // Captures entire scope (including largeData)
    });
  }
  
  return closures;
}

const fns = createHeavyClosures();
// Result: largeData in memory forever (captured by closures)
```

**Fix**:
```javascript
// ✅ Fix: Don't capture unnecessary variables
function createHeavyClosures() {
  const largeData = new Array(1000000).fill('data');
  
  // Process data (without capturing)
  const results = processData(largeData);
  
  // largeData can be GC'd here
  
  // Closures only capture what they use
  const closures = [];
  for (let i = 0; i < 1000; i++) {
    closures.push(() => {
      console.log(i); // Only captures i, not largeData
    });
  }
  
  return closures;
}
```

---

**4. Timers**:

**Problem**: setInterval/setTimeout not cleared.

```javascript
// ❌ Memory leak
function startPolling() {
  const data = { large: new Array(100000) };
  
  setInterval(() => {
    processData(data); // Closure captures data
  }, 1000);
}

// Interval runs forever (data never GC'd)
```

**Fix**:
```javascript
// ✅ Fix: Clear interval
function startPolling() {
  const data = { large: new Array(100000) };
  
  const intervalId = setInterval(() => {
    processData(data);
  }, 1000);
  
  // Clear on component unmount
  return () => clearInterval(intervalId);
}

const cleanup = startPolling();

// Later: cleanup();
```

---

**5. Global Variables**:

**Problem**: Global variables never GC'd.

```javascript
// ❌ Memory leak
window.cache = {};

function addToCache(key, value) {
  window.cache[key] = value; // Never removed
}

// Cache grows forever (10,000 entries = OOM)
```

**Fix**:
```javascript
// ✅ Fix: LRU Cache with size limit
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  set(key, value) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }
  
  get(key) {
    const value = this.cache.get(key);
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
}

const cache = new LRUCache(100); // Max 100 entries
```

---

### Memory Profiling

**Chrome DevTools**:

**1. Heap Snapshot**:
```
DevTools → Memory → Heap snapshot → Take snapshot

Shows:
- Object count (how many instances)
- Shallow size (object size, excluding refs)
- Retained size (object + all refs, if GC'd)
- Retainers (what's keeping object alive)

Workflow:
1. Take snapshot 1
2. Perform action (e.g., add 100 items)
3. Take snapshot 2
4. Compare: "Objects allocated between Snapshot 1 and 2"
5. Find leaks: Objects that should be GC'd but aren't
```

**2. Allocation Timeline**:
```
DevTools → Memory → Allocation instrumentation on timeline → Record

Shows:
- Allocations over time (blue bars)
- Retained allocations (red bars, not GC'd)

Workflow:
1. Start recording
2. Perform actions (e.g., navigate, add/remove items)
3. Stop recording
4. Blue bars: Temporary allocations (GC'd)
5. Red bars: Leaks (not GC'd)
```

**3. Memory Panel** (Task Manager):
```
Chrome → More Tools → Task Manager

Shows:
- Memory footprint (per tab, total)
- JavaScript memory (heap size)

Normal:
- Simple page: 50-200MB
- SPA: 200-500MB
- Heavy app: 500MB-2GB

Warning signs:
- Memory growing continuously (leak)
- Not released after action (e.g., close modal)
```

---

### Optimization Techniques

**1. Object Pooling**:

**Problem**: Frequent allocation → GC pauses.

```javascript
// ❌ BAD: Allocate 60 objects/sec (GC every second)
function animate() {
  const particle = { x: 0, y: 0, vx: 1, vy: 1 };
  particles.push(particle);
  
  requestAnimationFrame(animate);
}

// GC pauses: 5-20ms every second (dropped frames)
```

**Solution**:
```javascript
// ✅ GOOD: Object pool (reuse objects)
class ParticlePool {
  constructor(size = 1000) {
    this.pool = [];
    for (let i = 0; i < size; i++) {
      this.pool.push({ x: 0, y: 0, vx: 0, vy: 0 });
    }
  }
  
  acquire() {
    return this.pool.pop() || { x: 0, y: 0, vx: 0, vy: 0 };
  }
  
  release(obj) {
    this.pool.push(obj);
  }
}

const pool = new ParticlePool();

function animate() {
  const particle = pool.acquire(); // Reuse
  particle.x = 0;
  particle.y = 0;
  particles.push(particle);
  
  requestAnimationFrame(animate);
}

function removeParticle(particle) {
  pool.release(particle); // Return to pool
}

// Result: No allocations → no GC pauses
```

---

**2. WeakMap/WeakSet** (Weak References):

**Problem**: Map/Set hold strong references (prevent GC).

```javascript
// ❌ Strong reference (prevents GC)
const cache = new Map();

function cacheElement(el) {
  cache.set(el, expensiveComputation(el));
}

// Even if element removed from DOM, cache holds reference
```

**Solution**:
```javascript
// ✅ Weak reference (allows GC)
const cache = new WeakMap();

function cacheElement(el) {
  cache.set(el, expensiveComputation(el));
}

// If element removed from DOM + no other refs → GC'd
// Cache entry automatically removed
```

**WeakMap Use Cases**:
- DOM element metadata (auto-cleanup)
- Private data (weak key)
- Memoization (auto-expires)

---

**3. Avoid Large Allocations**:

```javascript
// ❌ BAD: Allocate 100MB at once (triggers Major GC)
const large = new Array(10000000).fill(0);

// ✅ GOOD: Allocate incrementally (Minor GCs only)
const large = [];
for (let i = 0; i < 10000000; i++) {
  large.push(0);
  
  // Yield occasionally (avoid Long Task)
  if (i % 10000 === 0) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

---

## 3. Clear Real-World Examples

### Example 1: Gmail – Object Pooling for Email List

**Challenge**: Rendering 1000 emails allocates 1000 divs (GC pauses).

**Solution**: Object pool for DOM nodes:
```javascript
class EmailPool {
  constructor() {
    this.pool = [];
  }
  
  acquire() {
    return this.pool.pop() || document.createElement('div');
  }
  
  release(div) {
    div.innerHTML = ''; // Clear content
    this.pool.push(div);
  }
}

const pool = new EmailPool();

function renderEmail(email) {
  const div = pool.acquire(); // Reuse
  div.innerHTML = email.content;
  list.appendChild(div);
}

function removeEmail(div) {
  list.removeChild(div);
  pool.release(div); // Return to pool
}
```

**Result**: 80% reduction in GC pauses (50ms → 10ms).

---

### Example 2: React – Memory Leak from useEffect

**Challenge**: Event listener not removed on unmount.

**Problem**:
```javascript
function Component() {
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    
    // ❌ Missing cleanup (memory leak)
  }, []);
}
```

**Solution**:
```javascript
function Component() {
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    
    // ✅ Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
}
```

---

### Example 3: Figma – WeakMap for Canvas Metadata

**Challenge**: Store metadata per canvas element (100s of canvases).

**Solution**: WeakMap (auto-cleanup when canvas removed):
```javascript
const canvasMetadata = new WeakMap();

function addCanvas(canvas) {
  canvasMetadata.set(canvas, {
    width: canvas.width,
    height: canvas.height,
    context: canvas.getContext('2d')
  });
}

// Canvas removed from DOM → WeakMap entry auto-removed
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain memory management in browsers."

**Answer**:

"JavaScript uses **automatic memory management** with **garbage collection**:

---

### Memory Structure

**Stack** (LIFO, ~1-2MB):
- Primitives (numbers, booleans)
- References to heap objects
- Function call frames
- Fast (LIFO push/pop)

**Heap** (dynamic, ~1.4-4GB):
- Objects, arrays, functions
- Slower (requires GC)

---

### Garbage Collection

**Generational Hypothesis**: Most objects die young.

**Young Generation** (Minor GC):
- **Nursery**: New objects (fast allocation)
- **Survivor**: Survived 1 GC
- Frequent GC (every 1-8MB)
- Cost: 1-5ms (short pause)

**Old Generation** (Major GC):
- Long-lived objects (survived multiple GCs)
- Infrequent GC (100MB+)
- Cost: 10-100ms (long pause, can cause jank)

---

### Mark-and-Sweep Algorithm

**Phase 1: Mark** (find reachable):
```javascript
// Start from roots
roots = [window, document, stack frames, timers, workers];

// Traverse object graph (follow references)
// Mark reachable objects
```

**Phase 2: Sweep** (free unmarked):
```javascript
// Iterate heap
// Free objects NOT marked (unreachable)
```

**Phase 3: Compact** (optional, Old Gen):
```
Defragment memory (move objects together)
Cost: Expensive (move + update pointers)
```

---

### Memory Leaks

**1. Detached DOM**:
```javascript
// ❌ Leak
let detached;
const div = document.createElement('div');
document.body.appendChild(div);
detached = div; // Store reference
document.body.removeChild(div); // Remove from DOM
// div still in memory (detached reference)

// ✅ Fix: Release reference
detached = null;
```

**2. Event Listeners**:
```javascript
// ❌ Leak
element.addEventListener('click', handler);
element.remove(); // Listener still registered

// ✅ Fix: Remove listener
element.removeEventListener('click', handler);
element.remove();

// ✅ Fix: AbortController (Chrome 88+)
const controller = new AbortController();
element.addEventListener('click', handler, { signal: controller.signal });
// Cleanup: controller.abort() removes listener
```

**3. Closures**:
```javascript
// ❌ Leak (captures large data)
function createClosure() {
  const large = new Array(1000000);
  return () => console.log('hello'); // Captures entire scope
}

// ✅ Fix: Don't capture unnecessary vars
function createClosure() {
  const large = new Array(1000000);
  processData(large); // Use data
  // large can be GC'd here
  
  return () => console.log('hello'); // Only captures what's used
}
```

**4. Timers**:
```javascript
// ❌ Leak
setInterval(() => { /* ... */ }, 1000); // Runs forever

// ✅ Fix: Clear timer
const id = setInterval(() => { /* ... */ }, 1000);
// Later: clearInterval(id);
```

**5. Global Variables**:
```javascript
// ❌ Leak (never GC'd)
window.cache = {}; // Grows forever

// ✅ Fix: LRU Cache with size limit
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
    this.cache.set(key, value);
  }
}
```

---

### Profiling

**Chrome DevTools**:

**Heap Snapshot**:
1. Take snapshot 1
2. Perform action
3. Take snapshot 2
4. Compare: "Objects allocated between Snapshot 1 and 2"
5. Find: "Detached" DOM nodes, unexpected retainers

**Allocation Timeline**:
- Blue bars: Temporary (GC'd)
- Red bars: Leaks (not GC'd)

**Task Manager**:
- Normal: 50-500MB
- Warning: Continuous growth (leak)

---

### Optimization

**1. Object Pooling**:
```javascript
class Pool {
  constructor() { this.pool = []; }
  acquire() { return this.pool.pop() || createNew(); }
  release(obj) { this.pool.push(obj); }
}

// Result: No allocations → no GC pauses
```

**2. WeakMap** (weak references):
```javascript
const cache = new WeakMap();
cache.set(element, data);

// Element removed → cache entry auto-removed
```

**3. Avoid Large Allocations**:
```javascript
// ❌ 100MB at once (Major GC)
const large = new Array(10000000);

// ✅ Incremental (Minor GCs only)
for (let i = 0; i < 10000000; i++) {
  large.push(i);
  if (i % 10000 === 0) await yieldToMainThread();
}
```

---

### Real-World

**Gmail**: Object pooling for email list (80% reduction GC pauses, 50ms → 10ms).

**React**: useEffect cleanup (remove event listeners on unmount).

**Figma**: WeakMap for canvas metadata (auto-cleanup).

---

### Trade-offs

**GC**:
- ✅ Automatic (no manual free)
- ❌ Pauses (5-100ms, can cause jank)
- ❌ Non-deterministic (can't predict when)

**Object Pooling**:
- ✅ No allocations (no GC)
- ❌ Manual management (complex)
- ❌ Memory overhead (pool size)

**WeakMap**:
- ✅ Auto-cleanup (weak refs)
- ❌ Can't iterate (no `.keys()`)
- ❌ Limited use cases

**Follow-up I Expect**:

Q: 'How do you detect memory leaks?'
A: Chrome DevTools → Heap Snapshot. Take snapshot before/after action. Compare: look for unexpected growth (detached DOM, large closures). Allocation Timeline: red bars = leaks. Task Manager: continuous memory growth.

Q: 'What's the cost of GC?'
A: Minor GC (Young Gen): 1-5ms every 1-8MB allocated. Major GC (Old Gen): 10-100ms every 100MB+. Major GC can cause jank (dropped frames at 60fps). Minimize with object pooling, avoid large allocations.

Q: 'WeakMap vs Map?'
A: **Map**: Strong reference (prevents GC). **WeakMap**: Weak reference (allows GC if no other refs). WeakMap keys must be objects (not primitives). Use WeakMap for DOM metadata, memoization (auto-expires)."

---

## 6. Why & How Summary

### Why It Matters

**Performance**: GC pauses 5-100ms can cause jank—object pooling reduces pauses  
**Memory Leaks**: Detached DOM, event listeners, closures prevent GC—lead to OOM crashes  
**User Experience**: Memory leaks degrade performance over time (slow, unresponsive)  
**Mobile Constraints**: Limited RAM (1-4GB)—memory-efficient apps essential

### How It Works

**Memory Structure**: Stack (primitives, references, function frames, ~1-2MB LIFO fast), Heap (objects/arrays, dynamic size ~1.4-4GB, requires GC)  
**Garbage Collection**: Generational (Young: Nursery new + Survivor survived 1 GC, Old: long-lived), Mark-and-Sweep (mark reachable from roots, sweep unmarked, compact Old Gen), Minor GC (1-5ms every 1-8MB), Major GC (10-100ms every 100MB+)  
**Memory Leaks**: Detached DOM (removed but JS references), event listeners (not removed), closures (capture large scope), timers (not cleared), global variables (never GC'd)  
**Profiling**: Heap Snapshot (compare before/after, find detached/retainers), Allocation Timeline (red bars = leaks), Task Manager (continuous growth warning)  
**Optimization**: Object pooling (reuse objects, no allocations, no GC), WeakMap (weak references auto-cleanup), avoid large allocations (incremental with yields)

**FAANG Expectation**: Explain memory structure (Stack vs Heap), GC algorithm (Mark-and-Sweep with generational Young/Old), GC costs (Minor 1-5ms, Major 10-100ms can jank), five memory leak patterns (detached DOM, event listeners, closures, timers, globals) with code examples and fixes, profiling tools (Heap Snapshot compare before/after find detached/retainers, Allocation Timeline red bars, Task Manager growth), optimization techniques (object pooling reuse objects no GC, WeakMap weak refs auto-cleanup, incremental allocation avoid Major GC), real-world examples (Gmail object pooling 80% less GC, React useEffect cleanup, Figma WeakMap metadata), trade-offs (GC automatic but non-deterministic pauses, object pooling no GC but manual complex, WeakMap auto-cleanup but can't iterate)
