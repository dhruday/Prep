# Memory Management & Garbage Collection

## 1. High-Level Explanation (Frontend Interview Level)

**Memory Management** is how JavaScript allocates and frees memory for variables, objects, and functions. **Garbage Collection (GC)** is the automatic process that reclaims memory from objects that are no longer needed.

### The Big Picture

```
MEMORY LIFECYCLE
├─ Allocation (automatic when you create variables)
├─ Usage (reading/writing data)
└─ Release (garbage collection when unreachable)

JAVASCRIPT MEMORY MODEL
├─ Stack (primitives, references, function calls)
└─ Heap (objects, arrays, functions, closures)

GARBAGE COLLECTION
├─ Mark-and-Sweep Algorithm
├─ Generational Collection
└─ Incremental Collection
```

### Why This Matters in Interviews

**Junior Engineer:**
```
"JavaScript automatically handles memory, so I don't need to worry about it"
```
→ Dangerous assumption

**Senior/Staff Engineer:**
```
"While JavaScript has automatic garbage collection, memory leaks are still 
common in production applications. I focus on:

1. Understanding how GC works (mark-and-sweep, generational)
2. Identifying leak patterns (detached DOM, closures, event listeners)
3. Using profiling tools (Chrome DevTools Memory tab)
4. Designing memory-efficient architectures

Example: At [Company], we had a memory leak in our dashboard that grew 
from 50 MB to 2 GB over 8 hours, crashing tabs. The issue was unremoved 
event listeners on chart components. After fixing:
- Memory stable at 80 MB
- No more crashes
- 50% faster interactions (less GC pressure)"
```
→ Shows production awareness and problem-solving

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### JavaScript Memory Model

#### Stack vs Heap

```
┌─────────────────────────────────────────────────────────┐
│                    STACK (Fast, Fixed Size)              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Function Call Frame                               │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │ Local Variables:                             │ │ │
│  │  │   age = 30 (primitive, stored here)          │ │ │
│  │  │   name = @0x001 (reference to heap)          │ │ │
│  │  │   user = @0x002 (reference to heap)          │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Previous Function Call Frame                      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              HEAP (Slower, Dynamic Size)                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  @0x001: String "John"                             │ │
│  │  @0x002: Object { name: @0x001, age: 30 }          │ │
│  │  @0x003: Array [1, 2, 3, 4, 5]                     │ │
│  │  @0x004: Function (closures, scope chain)          │ │
│  │  @0x005: DOM Node <div>...</div>                   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key Principles:**

1. **Primitives** (number, string, boolean, null, undefined, symbol, bigint)
   - Small values stored directly on stack
   - Copied by value

2. **Objects** (objects, arrays, functions, DOM nodes)
   - Stored on heap
   - Stack holds reference (pointer)
   - Copied by reference

---

### Garbage Collection Algorithm: Mark-and-Sweep

#### Phase 1: Mark (Find Reachable Objects)

```
ROOT OBJECTS (Always Reachable)
├─ Global object (window)
├─ Call stack (local variables)
└─ Active closures

REACHABILITY ALGORITHM
1. Start from roots
2. Mark all reachable objects
3. Recursively mark objects referenced by marked objects
4. Unmarked objects = garbage
```

**Visual Example:**

```javascript
// Initial state
const user = { name: "Alice" };           // @0x001
const profile = { user: user };           // @0x002
let temp = { data: "unused" };            // @0x003

// Reachability graph
window
  └─ user (@0x001) ✅ Reachable
       └─ profile (@0x002) ✅ Reachable (references user)
  └─ temp (@0x003) ✅ Reachable (referenced by stack)

// After: temp = null
temp = null;

// New reachability graph
window
  └─ user (@0x001) ✅ Reachable
       └─ profile (@0x002) ✅ Reachable
  └─ @0x003 ❌ Unreachable → GARBAGE

// GC will reclaim @0x003
```

---

#### Phase 2: Sweep (Reclaim Garbage)

```
HEAP BEFORE SWEEP
┌────────────────────────────────────────┐
│ @0x001: ✅ { name: "Alice" }           │
│ @0x002: ✅ { user: @0x001 }            │
│ @0x003: ❌ { data: "unused" }          │
│ @0x004: ✅ [1, 2, 3]                   │
│ @0x005: ❌ { old: "data" }             │
└────────────────────────────────────────┘

SWEEP PROCESS
1. Traverse heap
2. Free unmarked objects (@0x003, @0x005)
3. Compact memory (optional)

HEAP AFTER SWEEP
┌────────────────────────────────────────┐
│ @0x001: { name: "Alice" }              │
│ @0x002: { user: @0x001 }               │
│ @0x004: [1, 2, 3]                      │
│ [Free space]                           │
└────────────────────────────────────────┘
```

---

### Generational Garbage Collection

**Key Insight:** Most objects die young (short-lived)

```
GENERATIONAL HYPOTHESIS
- 90% of objects die within seconds
- 10% live for a long time

OPTIMIZATION: Two Generations
┌─────────────────────────────────────────────────────────┐
│                  YOUNG GENERATION (2-4 MB)               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  New objects allocated here                        │ │
│  │  Frequent GC (every few seconds)                   │ │
│  │  Fast collection (small space)                     │ │
│  │                                                     │ │
│  │  Nursery: [obj1, obj2, obj3, ...]                  │ │
│  │  Intermediate: [obj10, obj11, ...]                 │ │
│  └────────────────────────────────────────────────────┘ │
│                        │                                 │
│                        │ Survived 2+ GC cycles           │
│                        ↓                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │              OLD GENERATION (Larger)                │ │
│  │  Long-lived objects promoted here                  │ │
│  │  Infrequent GC (every few minutes)                 │ │
│  │  Slower collection (larger space)                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- **Fast minor GC:** Only scan young generation (small, frequent)
- **Slow major GC:** Scan all generations (rare, comprehensive)
- **90% reduction** in GC time compared to single-generation

---

### Incremental Garbage Collection

**Problem:** Full GC can pause JavaScript for 100ms+ (janky)

**Solution:** Break GC into small increments

```
TRADITIONAL GC (Stop-the-World)
JavaScript Execution ████████████████ (100ms)
GC Pause            ░░░░░░░░░░░░░░░░ (100ms) ← UI frozen!
JavaScript Execution ████████████████

User Experience: Janky, frozen UI for 100ms


INCREMENTAL GC (Interleaved)
JavaScript Execution ██ (10ms)
GC Increment        ░░ (5ms)
JavaScript Execution ██ (10ms)
GC Increment        ░░ (5ms)
JavaScript Execution ██ (10ms)
... (repeat 20 times)

Total GC Time: 100ms (same)
Max Pause: 5ms (20× better!)
User Experience: Smooth, no noticeable jank
```

**V8 Implementation:**
- **Incremental Marking:** Mark in 5-10ms chunks
- **Concurrent Marking:** Mark on background threads
- **Concurrent Sweeping:** Reclaim memory on background threads
- **Idle-time GC:** Run during requestIdleCallback

---

### Memory Leak Patterns

#### Leak Pattern 1: Detached DOM Nodes

```javascript
// ❌ MEMORY LEAK: DOM removed, but JS still references it
let cache = [];

function addWidget() {
  const widget = document.createElement('div');
  widget.innerHTML = '<h1>Widget</h1>';
  document.body.appendChild(widget);
  
  // Store reference in cache
  cache.push(widget);
  
  // Later: Remove from DOM
  setTimeout(() => {
    widget.remove(); // Removed from DOM, but cache still holds reference!
  }, 5000);
}

// After 100 widgets:
// - DOM: 0 widgets (all removed)
// - Memory: 100 widgets (cached, leaked!)

// Fix: Clear references when removing
function addWidget() {
  const widget = document.createElement('div');
  widget.innerHTML = '<h1>Widget</h1>';
  document.body.appendChild(widget);
  
  const widgetRef = { element: widget };
  cache.push(widgetRef);
  
  setTimeout(() => {
    widget.remove();
    
    // ✅ Clear reference
    const index = cache.indexOf(widgetRef);
    cache.splice(index, 1);
    widgetRef.element = null;
  }, 5000);
}
```

**Detection:**
```
Chrome DevTools → Memory → Heap Snapshot
1. Take snapshot before action
2. Perform action (add/remove widgets)
3. Take snapshot after action
4. Compare → Look for "Detached HTMLDivElement"
```

---

#### Leak Pattern 2: Event Listeners

```javascript
// ❌ MEMORY LEAK: Event listener prevents GC
class Chart {
  constructor(container) {
    this.container = container;
    this.data = new Array(100000).fill(0); // 1 MB
    
    // Add listener
    window.addEventListener('resize', () => {
      this.render(); // Closure captures 'this' (entire Chart instance)
    });
  }
  
  render() {
    // Render chart...
  }
}

// Usage
let chart = new Chart(document.getElementById('chart'));

// Later: Try to clean up
chart = null; // Doesn't free memory!

// Why? Window still has reference:
// window.listeners.resize → closure → 'this' → Chart instance (1 MB)
```

**Memory Timeline:**
```
Create chart:    Memory = 1 MB
Create 10 more:  Memory = 11 MB
chart = null:    Memory = 11 MB (still!) ← Leak!
Create 10 more:  Memory = 22 MB
... Memory grows unbounded
```

**Fix: Remove listeners**

```javascript
// ✅ GOOD: Clean up listeners
class Chart {
  constructor(container) {
    this.container = container;
    this.data = new Array(100000).fill(0);
    
    // Store bound function reference
    this.handleResize = this.render.bind(this);
    window.addEventListener('resize', this.handleResize);
  }
  
  render() {
    // Render chart...
  }
  
  destroy() {
    // ✅ Remove listener
    window.removeEventListener('resize', this.handleResize);
    this.container = null;
    this.data = null;
  }
}

// Usage
let chart = new Chart(document.getElementById('chart'));

// Proper cleanup
chart.destroy();
chart = null; // Now memory is freed! ✅
```

---

#### Leak Pattern 3: Closures Capturing Large Scopes

```javascript
// ❌ MEMORY LEAK: Closure captures entire large scope
function processData(data) {
  const largeArray = new Array(1000000).fill(0); // 8 MB
  const metadata = { size: data.length };
  
  // This closure captures entire scope (largeArray + metadata)
  return function onClick() {
    console.log(metadata.size); // Only needs metadata, but captures largeArray too!
  };
}

const handler = processData(smallData);
button.addEventListener('click', handler);

// Memory: 8 MB retained (largeArray leaked via closure)
```

**Why?**
```
CLOSURE SCOPE CAPTURE (V8 Optimization)
┌─────────────────────────────────────┐
│  function processData(data) {       │
│    const largeArray = [...]  ← 8MB  │
│    const metadata = {...}            │
│                                      │
│    return function onClick() {      │
│      console.log(metadata.size)     │
│    }                                 │
│  }                                   │
└─────────────────────────────────────┘
         │
         ↓
  Closure's [[Scopes]]
  ├─ largeArray (captured, but unused!) ❌
  └─ metadata (captured, used) ✅

Result: 8 MB leaked
```

**Fix: Limit closure scope**

```javascript
// ✅ GOOD: Extract only what's needed
function processData(data) {
  const largeArray = new Array(1000000).fill(0);
  const metadata = { size: data.length };
  
  // Process with largeArray...
  computeStatistics(largeArray);
  
  // Return closure with minimal scope
  const size = metadata.size; // Extract primitive
  
  return function onClick() {
    console.log(size); // Only captures 'size' (8 bytes), not largeArray (8 MB)
  };
}

// Memory: 8 bytes (99.9999% reduction!)
```

---

#### Leak Pattern 4: Timers and Intervals

```javascript
// ❌ MEMORY LEAK: setInterval never cleared
class LiveFeed {
  constructor() {
    this.data = new Array(100000).fill(0); // 1 MB
    
    // Poll every second
    setInterval(() => {
      this.fetchUpdates(); // Closure captures 'this' (entire instance)
    }, 1000);
  }
  
  fetchUpdates() {
    // Fetch data...
  }
}

const feed = new LiveFeed();

// Later: Navigate away
feed = null; // Memory NOT freed!

// Why? setInterval still running:
// Interval → closure → 'this' → LiveFeed instance (1 MB)
```

**Fix: Clear timers**

```javascript
// ✅ GOOD: Clear interval on cleanup
class LiveFeed {
  constructor() {
    this.data = new Array(100000).fill(0);
    
    this.intervalId = setInterval(() => {
      this.fetchUpdates();
    }, 1000);
  }
  
  fetchUpdates() {
    // Fetch data...
  }
  
  destroy() {
    // ✅ Clear interval
    clearInterval(this.intervalId);
    this.data = null;
  }
}

const feed = new LiveFeed();

// Proper cleanup
feed.destroy();
feed = null; // Memory freed ✅
```

---

#### Leak Pattern 5: Global Variables

```javascript
// ❌ MEMORY LEAK: Accidental global
function loadUserData() {
  // Missing 'const' → Creates global variable!
  userData = fetchUser(); // window.userData = ...
  
  // userData never garbage collected (global)
}

loadUserData();
// Memory leaked forever (until page reload)
```

**Fix: Use strict mode + const/let**

```javascript
// ✅ GOOD: Use strict mode
'use strict';

function loadUserData() {
  const userData = fetchUser(); // Local variable, GC eligible
  return userData;
}

// Or: Enable strict mode in module (recommended)
// All ES6 modules are automatically strict
```

---

### Memory Profiling in Chrome DevTools

#### Tool 1: Heap Snapshot (Point-in-Time)

```
Steps:
1. Open DevTools → Memory tab
2. Select "Heap snapshot"
3. Click "Take snapshot"
4. Perform action (e.g., open modal)
5. Take another snapshot
6. Compare snapshots

What to Look For:
- Detached DOM nodes
- Arrays/objects with unexpected size
- Retained size (total memory kept alive)
```

**Reading the Snapshot:**

```
COLUMNS EXPLAINED

Shallow Size:
- Memory used by object itself
- Example: Array of 1000 numbers = 8 KB

Retained Size:
- Shallow size + all objects only reachable through this object
- Example: Parent object (1 KB) → Child array (8 KB) = 9 KB retained

Distance:
- Number of hops from root (GC root = window, stack)
- Distance 1 = Direct reference from root
- Distance 10 = 10 hops away (harder to debug)
```

---

#### Tool 2: Allocation Timeline (Over Time)

```
Steps:
1. DevTools → Memory → "Allocation instrumentation on timeline"
2. Click "Start"
3. Perform actions
4. Click "Stop"
5. Analyze spikes

What to Look For:
- Memory that never gets released (leak)
- Sawtooth pattern (healthy: allocate → GC → allocate → GC)
- Rising baseline (leak: memory never fully released)
```

**Healthy vs Leaky Pattern:**

```
HEALTHY (Sawtooth)
Memory
  ↑ 50 MB  /\    /\    /\    /\
  |       /  \  /  \  /  \  /  \
  ↓ 20 MB     \/    \/    \/    \
  ├──────────────────────────────> Time
  Allocate → GC → Allocate → GC ✅


LEAKY (Rising Baseline)
Memory
  ↑ 200 MB                    ┌────
  |                     ┌─────┘
  | 100 MB        ┌─────┘
  |         ┌─────┘
  ↓ 20 MB ──┘
  ├──────────────────────────────> Time
  Memory never fully released ❌
```

---

#### Tool 3: Performance Monitor (Real-Time)

```
Steps:
1. DevTools → Performance Monitor (Ctrl+Shift+P → "Show Performance Monitor")
2. Watch metrics in real-time

Key Metrics:
- JS Heap Size: Current memory usage
- Nodes: DOM node count
- Listeners: Event listener count
- Layouts/sec: Layout thrashing indicator
```

**Example Values:**

```
HEALTHY APP
JS Heap: 30-80 MB (stable)
Nodes: 500-2000 (reasonable DOM)
Listeners: 50-200 (manageable)
Layouts/sec: 0-5 (smooth)

PROBLEMATIC APP
JS Heap: 500 MB+ (high, potential leak)
Nodes: 10,000+ (DOM bloat)
Listeners: 5,000+ (listener leak)
Layouts/sec: 30+ (layout thrashing)
```

---

## 3. Clear Real-World Examples

### Example 1: React Component Memory Leak

**Problem:** useEffect without cleanup

```javascript
// ❌ MEMORY LEAK
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Fetch user
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data)); // Async setState
    
    // Problem: Component unmounts before fetch completes
    // → setState on unmounted component
    // → Closure keeps component in memory
  }, [userId]);
  
  return <div>{user?.name}</div>;
}

// Scenario:
// 1. Mount UserProfile (userId=1)
// 2. Start fetch (300ms)
// 3. Navigate away (unmount) after 100ms
// 4. Fetch completes at 300ms → setUser() on unmounted component
// 5. Component leaked (closure keeps it alive)
```

**Fix: Cleanup with AbortController**

```javascript
// ✅ GOOD: Cleanup async operations
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const controller = new AbortController();
    
    fetch(`/api/users/${userId}`, {
      signal: controller.signal, // Pass abort signal
    })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => {
        if (err.name === 'AbortError') {
          // Request was cancelled (component unmounted)
          console.log('Fetch aborted');
        }
      });
    
    // Cleanup: Abort fetch if component unmounts
    return () => {
      controller.abort();
    };
  }, [userId]);
  
  return <div>{user?.name}</div>;
}

// Now:
// 1. Mount UserProfile (userId=1)
// 2. Start fetch with abort signal
// 3. Navigate away → useEffect cleanup → controller.abort()
// 4. Fetch cancelled → No setState on unmounted component ✅
// 5. Component properly garbage collected ✅
```

---

### Example 2: Infinite Scroll Memory Optimization

**Problem:** Loading 10,000 items = 10,000 DOM nodes

```javascript
// ❌ BAD: All items in DOM (memory grows unbounded)
function InfiniteScroll() {
  const [items, setItems] = useState([]);
  
  useEffect(() => {
    const loadMore = () => {
      if (isScrolledToBottom()) {
        // Load 100 more items
        fetch('/api/items?offset=' + items.length)
          .then(res => res.json())
          .then(newItems => {
            setItems([...items, ...newItems]); // Append to array
          });
      }
    };
    
    window.addEventListener('scroll', loadMore);
    return () => window.removeEventListener('scroll', loadMore);
  }, [items]);
  
  return (
    <div>
      {items.map(item => (
        <ItemCard key={item.id} item={item} /> // All items rendered!
      ))}
    </div>
  );
}

// After loading 10,000 items:
// - DOM nodes: 10,000+
// - Memory: 500 MB+
// - Scroll: Janky (layout/paint expensive)
```

**Fix: Virtual scrolling + windowing**

```javascript
// ✅ GOOD: Only render visible items
function InfiniteScroll() {
  const [allItems, setAllItems] = useState([]);
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  
  const ITEM_HEIGHT = 100;
  
  useEffect(() => {
    const loadMore = () => {
      if (isScrolledToBottom()) {
        fetch('/api/items?offset=' + allItems.length)
          .then(res => res.json())
          .then(newItems => {
            setAllItems(prev => [...prev, ...newItems]);
          });
      }
    };
    
    const updateVisibleRange = () => {
      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const start = Math.floor(scrollTop / ITEM_HEIGHT);
      const visibleCount = Math.ceil(container.offsetHeight / ITEM_HEIGHT);
      const end = start + visibleCount + 5; // +5 buffer
      
      setVisibleRange({ start, end });
    };
    
    const handleScroll = () => {
      updateVisibleRange();
      loadMore();
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [allItems]);
  
  // Only render visible items
  const visibleItems = allItems.slice(visibleRange.start, visibleRange.end);
  
  return (
    <div ref={containerRef} style={{ height: '500px', overflow: 'auto' }}>
      {/* Spacer for scroll position */}
      <div style={{ height: visibleRange.start * ITEM_HEIGHT }} />
      
      {/* Only visible items */}
      {visibleItems.map((item, index) => (
        <ItemCard
          key={item.id}
          item={item}
          style={{ height: ITEM_HEIGHT }}
        />
      ))}
      
      {/* Bottom spacer */}
      <div style={{
        height: (allItems.length - visibleRange.end) * ITEM_HEIGHT
      }} />
    </div>
  );
}

// After loading 10,000 items:
// - DOM nodes: ~25 (only visible)
// - Memory: 20 MB (96% reduction!)
// - Scroll: Smooth 60 FPS ✅
```

---

### Example 3: Image Gallery Memory Optimization

**Problem:** Loading all images at once

```javascript
// ❌ BAD: Load all 1000 images
function Gallery({ imageUrls }) {
  return (
    <div className="gallery">
      {imageUrls.map(url => (
        <img key={url} src={url} /> // All 1000 images load!
      ))}
    </div>
  );
}

// Memory usage:
// 1000 images × 2 MB each = 2 GB memory
// Browser crashes or becomes unusable
```

**Fix: Lazy loading + cleanup**

```javascript
// ✅ GOOD: Lazy load with Intersection Observer + cleanup
function Gallery({ imageUrls }) {
  return (
    <div className="gallery">
      {imageUrls.map(url => (
        <LazyImage key={url} src={url} />
      ))}
    </div>
  );
}

function LazyImage({ src }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);
  const imageObjectRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect(); // Stop observing once visible
          }
        });
      },
      { rootMargin: '200px' } // Load 200px before visible
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => {
      observer.disconnect();
      
      // Cleanup: Release image memory when component unmounts
      if (imageObjectRef.current) {
        imageObjectRef.current.src = ''; // Free image memory
        imageObjectRef.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    if (isVisible && !isLoaded) {
      // Load image
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setIsLoaded(true);
        imageObjectRef.current = img;
      };
    }
  }, [isVisible, src, isLoaded]);
  
  return (
    <div
      ref={imgRef}
      className="lazy-image"
      style={{ minHeight: '200px', background: '#f0f0f0' }}
    >
      {isLoaded ? (
        <img src={src} alt="" />
      ) : isVisible ? (
        <div>Loading...</div>
      ) : null}
    </div>
  );
}

// Memory usage:
// Only ~10 visible images × 2 MB = 20 MB
// As you scroll away, old images can be GC'd
// 99% memory reduction! ✅
```

---

### Example 4: WebSocket Memory Leak

**Problem:** WebSocket not closed on unmount

```javascript
// ❌ MEMORY LEAK
function LiveChat() {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    const ws = new WebSocket('wss://chat.example.com');
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]); // Closure captures component
    };
    
    // Problem: ws never closed!
    // Component unmounts, but ws.onmessage closure keeps it alive
  }, []);
  
  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}

// Scenario:
// 1. Mount LiveChat → Open WebSocket
// 2. Receive 1000 messages (1 MB of messages)
// 3. Navigate away → Unmount component
// 4. WebSocket still open, receiving messages
// 5. onmessage closure → setMessages → component kept in memory
// 6. Component leaked (grows with each new message)
```

**Fix: Close WebSocket on cleanup**

```javascript
// ✅ GOOD: Cleanup WebSocket
function LiveChat() {
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);
  
  useEffect(() => {
    const ws = new WebSocket('wss://chat.example.com');
    wsRef.current = ws;
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      // Check if still mounted (defensive)
      if (wsRef.current) {
        setMessages(prev => [...prev, message]);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Cleanup: Close WebSocket
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);
  
  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}

// Now:
// 1. Mount LiveChat → Open WebSocket
// 2. Receive messages
// 3. Navigate away → useEffect cleanup → ws.close()
// 4. WebSocket closed, no more messages
// 5. Component properly garbage collected ✅
```

---

## 4. Interview-Oriented Explanation

### Sample Interview Answer (7+ Years Experience)

**Question:** "Explain how garbage collection works in JavaScript and how you prevent memory leaks in production apps."

**Your Answer:**

> "JavaScript uses automatic garbage collection with a mark-and-sweep algorithm. Understanding it is critical for building performant, stable applications at scale.
>
> **How Garbage Collection Works:**
>
> **1. Mark-and-Sweep Algorithm**
> ```
> Phase 1: Mark
> - Start from roots (global object, call stack)
> - Recursively mark all reachable objects
> 
> Phase 2: Sweep
> - Traverse heap
> - Reclaim unmarked objects (garbage)
> ```
>
> **2. Generational Collection**
> - Young generation: New objects, frequent GC (every few seconds)
> - Old generation: Long-lived objects, infrequent GC (every few minutes)
> - Optimization: 90% of objects die young, so focus GC efforts there
>
> **3. Incremental Collection**
> - Break GC into small increments (5-10ms each)
> - Prevents long pauses that freeze UI
> - V8 uses concurrent marking/sweeping on background threads
>
> **Common Memory Leak Patterns I've Encountered:**
>
> **Pattern 1: Detached DOM Nodes**
> ```javascript
> // ❌ Leak: Cache holds references to removed DOM nodes
> let cache = [];
> element.onclick = () => {
>   cache.push(someDiv); // Reference stored
>   someDiv.remove(); // Removed from DOM, but cache still holds it
> };
>
> // ✅ Fix: Clear references
> cache = cache.filter(node => document.body.contains(node));
> ```
>
> **Pattern 2: Event Listeners**
> ```javascript
> // ❌ Leak: Listener prevents component GC
> class Chart {
>   constructor() {
>     window.addEventListener('resize', () => this.render());
>     // Closure captures 'this' → entire Chart instance retained
>   }
> }
>
> // ✅ Fix: Remove listeners
> class Chart {
>   constructor() {
>     this.handleResize = this.render.bind(this);
>     window.addEventListener('resize', this.handleResize);
>   }
>   destroy() {
>     window.removeEventListener('resize', this.handleResize);
>   }
> }
> ```
>
> **Pattern 3: Closures Capturing Large Scopes**
> ```javascript
> // ❌ Leak: Closure captures unnecessary large array
> function process(data) {
>   const largeArray = new Array(1000000); // 8 MB
>   const metadata = { size: data.length };
>   
>   return () => console.log(metadata.size);
>   // Closure captures both largeArray (unused) and metadata
> }
>
> // ✅ Fix: Extract only what's needed
> function process(data) {
>   const largeArray = new Array(1000000);
>   const size = data.length; // Extract primitive
>   
>   return () => console.log(size);
>   // Only captures 'size' (8 bytes, not 8 MB)
> }
> ```
>
> **Real-World Example from My Experience:**
>
> At [Company], we had a dashboard that leaked ~50 MB/minute, crashing tabs after 2 hours. Investigation revealed:
>
> **Problem:**
> ```javascript
> // Chart library attached global resize listener
> function createChart(config) {
>   const chart = new Chart(config);
>   window.addEventListener('resize', () => chart.resize());
>   return chart;
> }
>
> // Every page change created new chart, but old listeners remained
> // 100 page changes = 100 listeners = 100 chart instances in memory
> ```
>
> **Solution:**
> ```javascript
> class ChartManager {
>   constructor(config) {
>     this.chart = new Chart(config);
>     this.handleResize = () => this.chart.resize();
>     window.addEventListener('resize', this.handleResize);
>   }
>   
>   destroy() {
>     window.removeEventListener('resize', this.handleResize);
>     this.chart.destroy();
>     this.chart = null;
>   }
> }
>
> // Call destroy() on page navigation
> chartManager.destroy();
> ```
>
> **Results:**
> - Memory leak eliminated (stable at 80 MB) ✅
> - No more tab crashes ✅
> - 50% faster interactions (less GC pressure) ✅
> - User complaints dropped by 90% ✅
>
> **Detection Tools I Use:**
> 1. **Chrome DevTools Memory tab** - Heap snapshots, allocation timeline
> 2. **Performance Monitor** - Real-time heap size, node count
> 3. **Lighthouse** - Automated memory audit
> 4. **Production monitoring** - Track JS heap size over time (Datadog, New Relic)
>
> **Key Takeaway:**
> Memory leaks are insidious in SPAs. They don't crash immediately—they degrade performance over hours. Proactive detection, cleanup patterns, and monitoring are essential for production stability."

---

### Common Interview Mistakes

#### Mistake 1: "JavaScript handles memory automatically, so no need to worry"

```
❌ Bad Answer:
"JavaScript has garbage collection, so I don't need to think about memory"

→ Naive, doesn't understand production challenges
```

```
✅ Good Answer:
"While JavaScript has automatic GC, memory leaks are common in production:
- Event listeners not removed
- Closures capturing large scopes
- Detached DOM nodes
- Timers not cleared
- WebSocket connections not closed

I proactively use Chrome DevTools to profile memory and follow cleanup patterns."
```

---

#### Mistake 2: Not understanding reachability

```
❌ Bad Answer:
Interviewer: "Why isn't this object garbage collected?"

```javascript
let obj = { data: 'large' };
obj = null;
```

Candidate: "Because it's still in memory?"

→ Doesn't understand GC algorithm
```

```
✅ Good Answer:
"This object WILL be garbage collected because:

1. 'obj' was the only reference (root → object)
2. 'obj = null' removes the reference
3. Object is now unreachable
4. Next GC cycle → mark-and-sweep → object reclaimed

Objects are only kept if reachable from roots (global, stack, closures)."
```

---

#### Mistake 3: Confusing shallow vs retained size

```
❌ Bad Answer:
Interviewer: "What's the difference between shallow and retained size?"

Candidate: "Shallow is smaller, retained is bigger?"

→ Doesn't understand heap snapshots
```

```
✅ Good Answer:
"In Chrome DevTools heap snapshots:

**Shallow Size:**
- Memory used by object itself
- Example: Array of 1000 numbers = 8 KB shallow

**Retained Size:**
- Shallow size + all objects only reachable through this object
- Example: Parent (1 KB) → Child array (8 KB) = 9 KB retained
- If parent is GC'd, child is also freed

**Why it matters:**
Large retained size indicates object keeps many other objects alive.
Finding and removing such objects has biggest memory impact.

**Example:**
```javascript
const parent = { // 100 bytes shallow
  children: new Array(10000) // 80 KB
};
// parent.retainedSize = 80.1 KB
// Freeing parent also frees children
```
"
```

---

## 5. Code Examples

### Complete Example: Memory-Efficient Data Table

```typescript
/**
 * Memory-efficient data table with:
 * - Virtual scrolling (only render visible rows)
 * - Lazy loading (load data on demand)
 * - Proper cleanup (remove listeners, abort requests)
 */

interface DataRow {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface DataTableProps {
  fetchData: (offset: number, limit: number) => Promise<DataRow[]>;
  rowHeight: number;
  containerHeight: number;
}

function DataTable({ fetchData, rowHeight, containerHeight }: DataTableProps) {
  const [allRows, setAllRows] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Load more data
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    // Create abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    try {
      const newRows = await fetchData(allRows.length, 50);
      
      // Check if request was aborted
      if (controller.signal.aborted) return;
      
      setAllRows(prev => [...prev, ...newRows]);
      
      if (newRows.length < 50) {
        setHasMore(false);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load data:', error);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [allRows.length, fetchData, loading, hasMore]);
  
  // Update visible range on scroll (with debouncing)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let rafId: number | null = null;
    
    const updateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const start = Math.floor(scrollTop / rowHeight);
      const visibleCount = Math.ceil(containerHeight / rowHeight);
      const end = Math.min(start + visibleCount + 10, allRows.length); // +10 buffer
      
      setVisibleRange({ start, end });
      
      // Load more if near bottom
      if (end >= allRows.length - 20) {
        loadMore();
      }
      
      rafId = null;
    };
    
    const handleScroll = () => {
      // Debounce with rAF (only one update per frame)
      if (rafId !== null) return;
      rafId = requestAnimationFrame(updateVisibleRange);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial load
    if (allRows.length === 0) {
      loadMore();
    }
    
    // Cleanup
    return () => {
      container.removeEventListener('scroll', handleScroll);
      
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      
      // Abort pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [allRows.length, rowHeight, containerHeight, loadMore]);
  
  // Only render visible rows
  const visibleRows = allRows.slice(visibleRange.start, visibleRange.end);
  
  return (
    <div
      ref={containerRef}
      style={{
        height: `${containerHeight}px`,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* Top spacer (for scroll position) */}
      <div style={{ height: `${visibleRange.start * rowHeight}px` }} />
      
      {/* Visible rows */}
      {visibleRows.map((row, index) => (
        <DataRow
          key={row.id}
          row={row}
          style={{ height: `${rowHeight}px` }}
        />
      ))}
      
      {/* Bottom spacer */}
      <div
        style={{
          height: `${(allRows.length - visibleRange.end) * rowHeight}px`,
        }}
      />
      
      {/* Loading indicator */}
      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Loading...
        </div>
      )}
    </div>
  );
}

interface DataRowProps {
  row: DataRow;
  style: React.CSSProperties;
}

const DataRow = React.memo(({ row, style }: DataRowProps) => {
  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid #eee',
      }}
    >
      <div style={{ flex: 1 }}>{row.name}</div>
      <div style={{ flex: 1 }}>{row.email}</div>
      <div style={{ flex: 1 }}>{row.status}</div>
    </div>
  );
});

// Memory benefits:
// - 10,000 rows × 100 bytes = 1 MB (data)
// - Only ~30 DOM nodes (visible rows)
// - Compared to rendering all: 10,000 DOM nodes, 50 MB
// Result: 98% memory reduction ✅
```

---

### Example: Memory Pool for Object Reuse

```typescript
/**
 * Object pool to reduce GC pressure
 * Reuses objects instead of creating/destroying
 */

class ObjectPool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private factory: () => T;
  private reset: (obj: T) => void;
  
  constructor(factory: () => T, reset: (obj: T) => void, initialSize = 10) {
    this.factory = factory;
    this.reset = reset;
    
    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }
  
  /**
   * Get object from pool (or create new if pool empty)
   */
  acquire(): T {
    let obj = this.available.pop();
    
    if (!obj) {
      // Pool empty, create new
      obj = this.factory();
    }
    
    this.inUse.add(obj);
    return obj;
  }
  
  /**
   * Return object to pool for reuse
   */
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      console.warn('Releasing object not in use');
      return;
    }
    
    this.inUse.delete(obj);
    this.reset(obj); // Reset state
    this.available.push(obj);
  }
  
  /**
   * Get pool stats
   */
  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
    };
  }
}

// Usage Example: Particle System

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// Create pool
const particlePool = new ObjectPool<Particle>(
  // Factory: How to create new particle
  () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    color: '#fff',
  }),
  // Reset: How to reset particle for reuse
  (particle) => {
    particle.x = 0;
    particle.y = 0;
    particle.vx = 0;
    particle.vy = 0;
    particle.life = 0;
    particle.color = '#fff';
  },
  100 // Initial pool size
);

class ParticleSystem {
  private activeParticles: Particle[] = [];
  
  /**
   * Spawn particle (reuse from pool)
   */
  spawn(x: number, y: number) {
    const particle = particlePool.acquire(); // Reuse instead of 'new'
    
    particle.x = x;
    particle.y = y;
    particle.vx = (Math.random() - 0.5) * 5;
    particle.vy = (Math.random() - 0.5) * 5;
    particle.life = 1.0;
    particle.color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    
    this.activeParticles.push(particle);
  }
  
  /**
   * Update particles (60 FPS)
   */
  update(deltaTime: number) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      
      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      
      // Update life
      particle.life -= deltaTime;
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.activeParticles.splice(i, 1);
        particlePool.release(particle); // Return to pool ✅
      }
    }
  }
  
  /**
   * Render particles
   */
  render(ctx: CanvasRenderingContext2D) {
    this.activeParticles.forEach(particle => {
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life;
      ctx.fillRect(particle.x, particle.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;
  }
}

// Benefits:
// Without pool: Create 1000 particles/sec = 1000 allocations/sec → GC pressure
// With pool: Reuse 100 objects → 0 allocations after warmup → No GC pressure ✅
```

---

## 6. Why & How Summary

### Why Memory Management Matters

**Performance:**
- GC pauses = jank (UI freezes)
- Memory leaks = slowdown over time
- Large heap = slower GC cycles

**Stability:**
- Leaks → tab crashes (2 GB limit)
- Production apps run for hours/days
- Small leak (10 MB/min) = crash in 3 hours

**User Experience:**
- Fast, responsive UI
- No crashes during long sessions
- Smooth animations (less GC)

**Business Impact:**
- Tab crash = lost user work
- Slow performance = abandonment
- Memory efficiency = better battery life (mobile)

---

### How to Optimize Memory

**1. Understand GC Roots**
```javascript
// Objects reachable from roots are kept alive
Roots:
├─ window (global)
├─ Call stack (local variables)
└─ Closures (captured variables)

// Break references to allow GC
element = null;
listener.remove();
worker.terminate();
```

**2. Cleanup Pattern**
```javascript
// Always cleanup in lifecycle methods
useEffect(() => {
  const listener = () => {};
  window.addEventListener('resize', listener);
  
  return () => {
    window.removeEventListener('resize', listener); // ✅
  };
}, []);
```

**3. Limit Closure Scope**
```javascript
// ❌ Captures large array
function process() {
  const largeArray = new Array(1000000);
  return () => console.log(largeArray.length);
}

// ✅ Only captures length
function process() {
  const largeArray = new Array(1000000);
  const length = largeArray.length;
  return () => console.log(length);
}
```

**4. Use WeakMap/WeakSet for Metadata**
```javascript
// ✅ WeakMap: Doesn't prevent GC
const metadata = new WeakMap();

function attachMetadata(element, data) {
  metadata.set(element, data);
  // When element is GC'd, metadata entry is automatically removed ✅
}
```

**5. Profile Regularly**
```
Chrome DevTools:
1. Memory tab → Heap snapshot (before/after actions)
2. Performance Monitor → Watch heap size in real-time
3. Look for: Detached nodes, growing arrays, leaked listeners
```

---

### Quick Reference

**Common Leak Sources:**
- ✅ Event listeners not removed
- ✅ Timers not cleared (setInterval, setTimeout)
- ✅ WebSocket/EventSource not closed
- ✅ Closures capturing large scopes
- ✅ Detached DOM nodes
- ✅ Global variables
- ✅ Cache without size limit

**Memory Optimization Techniques:**
- Virtual scrolling (only render visible)
- Lazy loading (load on demand)
- Object pooling (reuse instead of allocate)
- WeakMap for metadata (allows GC)
- Web Workers (offload to separate heap)
- Abort controllers (cancel async operations)

**Performance Budget:**
- Initial load: < 50 MB heap
- Steady state: < 100 MB heap
- Growth rate: < 1 MB/minute
- GC pause: < 50ms (incremental GC)

---

**Next Topic:** Browser Storage Mechanisms (LocalStorage, IndexedDB, Cache API)

