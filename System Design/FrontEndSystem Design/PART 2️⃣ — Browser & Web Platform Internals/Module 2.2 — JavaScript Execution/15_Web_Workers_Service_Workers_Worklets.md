# 23. Web Workers, Service Workers, Worklets (When & Why)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Web Workers, Service Workers, and Worklets** are three distinct types of background execution contexts in the browser, each designed for different use cases. Understanding the differences is critical because **choosing the wrong one can lead to architectural problems**, while **choosing correctly can improve performance by 3-5×** and enable features impossible on the main thread alone.

### Quick Comparison:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THREE TYPES OF WORKERS                        │
└─────────────────────────────────────────────────────────────────────┘

1. WEB WORKERS (Dedicated Workers)
   Purpose: Offload CPU-intensive work from main thread
   Lifetime: Tied to page (dies when page closes)
   Relationship: 1 worker per page
   Use case: Heavy computation without blocking UI
   
   Example:
   const worker = new Worker('worker.js');
   worker.postMessage({ action: 'compute', data: [...] });
   worker.onmessage = (e) => displayResult(e.data);

2. SERVICE WORKERS
   Purpose: Act as programmable network proxy
   Lifetime: Independent of pages (survives page close)
   Relationship: 1 worker controls multiple pages
   Use case: Offline functionality, caching, push notifications
   
   Example:
   navigator.serviceWorker.register('/sw.js');
   // sw.js intercepts network requests
   self.addEventListener('fetch', (e) => {
     e.respondWith(caches.match(e.request));
   });

3. WORKLETS
   Purpose: Run code in rendering pipeline
   Lifetime: Tied to page
   Relationship: Multiple worklets per page
   Types: Paint, Animation, Audio, Layout (experimental)
   Use case: Custom rendering, audio processing
   
   Example:
   CSS.paintWorklet.addModule('paint.js');
   // paint.js runs during paint phase
   registerPaint('custom-gradient', class { paint(ctx, size) {...} });
```

### Web Workers (Dedicated Workers)

**What they are:**
```
Web Workers = Parallel JavaScript execution for CPU-intensive work

Main Thread:                    Web Worker:
┌─────────────────┐            ┌─────────────────┐
│ UI updates      │            │ Heavy           │
│ Event handling  │ ←message→  │ computation     │
│ DOM access      │            │ No DOM          │
│ Animations      │            │ Isolated        │
└─────────────────┘            └─────────────────┘

Purpose: Keep UI responsive during heavy computation

Without worker:
User clicks "Process" → Main thread blocked 2 seconds → UI frozen

With worker:
User clicks "Process" → Worker processes (2s parallel) → UI responsive
```

**When to use:**
```
✓ Image processing (filters, resize, compression)
✓ Large dataset operations (sort, filter, search)
✓ JSON/CSV parsing (large files)
✓ Cryptography (encryption, hashing)
✓ Mathematical calculations (physics, simulations)
✓ Text processing (search indexing, spell check)

✗ Small operations (<50ms) - overhead not worth it
✗ Operations needing DOM access - not allowed
✗ One-time setup code - no benefit

Example use case: Photo editor
- Apply blur filter to 10MP image
- Main thread: 3000ms blocked → UI frozen (BAD)
- Worker: 3000ms parallel → UI responsive (GOOD)
```

**Real-world impact:**
```
SaaS spreadsheet application:
- Formula calculation on 100K cells
- Main thread: 800ms blocked per recalculation
- Result: Laggy typing, frozen scrolling

With workers:
- Calculation in worker: 800ms parallel
- Main thread: Free to handle UI
- Result: Smooth typing, responsive scrolling
- User satisfaction: +34%
- Paid conversion: +18%
```

### Service Workers

**What they are:**
```
Service Workers = Programmable network proxy between app and network

Browser:
┌────────────────────────────────────────────────────┐
│ Web Page (Tab 1, Tab 2, Tab 3)                    │
│ ↓ ↓ ↓                                             │
│ ┌──────────────────────────────────────┐          │
│ │ Service Worker (Intercepts all)      │          │
│ │ ↓                                     │          │
│ │ Cache Storage ←→ Network              │          │
│ └──────────────────────────────────────┘          │
└────────────────────────────────────────────────────┘

Key characteristics:
1. Runs in background (independent of pages)
2. Intercepts network requests (fetch events)
3. Has Cache API access
4. Survives page close
5. Can receive push notifications
6. Requires HTTPS (security)

Service Worker Lifecycle:
1. Register: navigator.serviceWorker.register('/sw.js')
2. Install: Download resources, populate cache
3. Activate: Clean up old caches, take control
4. Fetch: Intercept network requests
5. Update: New version detected, repeat cycle
```

**When to use:**
```
✓ Offline functionality (PWA requirement)
✓ Cache management (assets, API responses)
✓ Push notifications
✓ Background sync (queue failed requests)
✓ Performance optimization (cache-first strategies)
✓ Network resilience (fallback when offline)

✗ Heavy computation - use Web Worker
✗ Real-time cross-tab sync - use Shared Worker
✗ Short-lived tasks - too complex

Example use case: News app PWA
- User reads article online
- Service Worker caches article in background
- User goes offline (subway)
- Service Worker serves cached version
- User continues reading seamlessly
```

**Caching strategies:**
```
1. Cache First (fast, stale okay)
   Try cache → If miss, network → Cache response
   Use: Static assets (CSS, JS, images)

2. Network First (fresh data priority)
   Try network → If fail, cache → Cache response
   Use: API data, dynamic content

3. Stale-While-Revalidate (fast + fresh)
   Serve cache → Update from network in background
   Use: Non-critical updates (user avatars, counts)

4. Network Only
   Always network, no cache
   Use: Real-time data, analytics

5. Cache Only
   Only serve cached, never network
   Use: Pre-cached shell, offline-first

Example:
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // API: Network first
    event.respondWith(networkFirst(event.request));
  } else if (event.request.url.includes('.jpg')) {
    // Images: Cache first
    event.respondWith(cacheFirst(event.request));
  }
});
```

**Real-world impact:**
```
E-commerce PWA:
Before (no Service Worker):
- Offline: "No internet" error → 100% bounce
- Slow 3G: 8s load time → 70% bounce

After (with Service Worker):
- Offline: Cached product pages → Browse continues
- Slow 3G: 1.5s load (cached shell) → 15% bounce
- Push notifications: +45% return visits
- Add-to-home-screen: +28% engagement

Business metrics:
- Offline sessions: 0 → 12% of traffic
- Bounce rate: 70% → 15% (-55pp)
- Conversion rate: 2.1% → 3.4% (+62%)
- Revenue impact: +$8.3M annually (3M users)
```

### Worklets

**What they are:**
```
Worklets = Lightweight workers that run in rendering pipeline

Worklet Types:
1. Paint Worklet (CSS Paint API)
   - Runs during paint phase
   - Custom CSS backgrounds/borders
   - Lightweight graphics

2. Animation Worklet
   - Runs in compositor thread
   - 60fps smooth animations
   - Scroll-linked effects

3. Audio Worklet
   - Runs in audio rendering thread
   - Low-latency audio processing
   - Custom audio effects

4. Layout Worklet (experimental)
   - Custom layout algorithms
   - CSS Layout API

Key difference from Workers:
- Much lighter weight (< 1ms startup)
- Runs in rendering pipeline (not isolated)
- Limited API surface (focused on specific task)
- No postMessage overhead (direct integration)
```

**Paint Worklet:**
```
Purpose: Custom CSS paint functions

// register-paint.js
registerPaint('custom-gradient', class {
  paint(ctx, size, properties) {
    // Draw custom gradient
    const gradient = ctx.createLinearGradient(0, 0, size.width, size.height);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(1, 'blue');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width, size.height);
  }
});

// CSS
.element {
  background: paint(custom-gradient);
}

// JavaScript
CSS.paintWorklet.addModule('register-paint.js');

Why use:
- Custom backgrounds impossible in CSS
- Dynamic patterns (responsive to size, state)
- Lightweight (no canvas element needed)
- GPU accelerated

Example use cases:
- Animated backgrounds
- Custom borders/patterns
- Data visualizations
- Generative art
```

**Animation Worklet:**
```
Purpose: Smooth scroll-linked animations

registerAnimator('parallax', class {
  animate(currentTime, effect) {
    const scroll = currentTime;
    effect.localTime = scroll * 0.5; // Parallax effect
  }
});

// JavaScript
await CSS.animationWorklet.addModule('parallax.js');

new WorkletAnimation(
  'parallax',
  new KeyframeEffect(element, [
    { transform: 'translateY(0)' },
    { transform: 'translateY(-100px)' }
  ], { duration: 1000 }),
  new ScrollTimeline({ scrollSource: document.scrollingElement })
).play();

Why use:
- Runs on compositor thread (separate from main)
- 60fps guaranteed (no main thread jank)
- Lower battery usage
- Smooth even during JavaScript execution

Example use cases:
- Parallax scrolling
- Scroll-driven animations
- Progress indicators
- Gesture-based animations
```

**Audio Worklet:**
```
Purpose: Low-latency audio processing

class NoiseProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    
    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      
      for (let i = 0; i < outputChannel.length; i++) {
        // Generate white noise
        outputChannel[i] = Math.random() * 2 - 1;
      }
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('noise-processor', NoiseProcessor);

// Main thread
const audioContext = new AudioContext();
await audioContext.audioWorklet.addModule('noise-processor.js');

const noiseNode = new AudioWorkletNode(audioContext, 'noise-processor');
noiseNode.connect(audioContext.destination);

Why use:
- Lower latency than ScriptProcessorNode (deprecated)
- Runs in audio rendering thread
- Real-time audio processing
- No main thread blocking

Example use cases:
- Audio effects (reverb, distortion, filters)
- Synthesizers
- Audio analysis (pitch detection, beat detection)
- Voice processing
```

**Real-world impact:**
```
Music production web app:

Without Audio Worklet (ScriptProcessorNode):
- Latency: 50-100ms (noticeable delay)
- Main thread: Blocked during audio processing
- UI: Laggy when playing audio
- Max complexity: Limited (drops audio)

With Audio Worklet:
- Latency: 5-10ms (imperceptible)
- Main thread: Free (audio in separate thread)
- UI: Smooth during audio playback
- Max complexity: 10× more effects

User experience:
- Professional feel (low latency)
- Reliable (no audio drops)
- Feature-rich (more effects possible)

Business impact:
- Pro user adoption: +67%
- Paid subscriptions: +42%
- Churn reduction: -34%
- Annual value: $1.8M (200K users)
```

### Decision Framework

**Which to use when:**

```
┌─────────────────────────────────────────────────────────────┐
│ DECISION TREE                                               │
└─────────────────────────────────────────────────────────────┘

Need offline functionality?
├─ YES → Service Worker
└─ NO ↓

Need network caching?
├─ YES → Service Worker
└─ NO ↓

Need push notifications?
├─ YES → Service Worker
└─ NO ↓

Need heavy computation (>50ms)?
├─ YES → Web Worker
└─ NO ↓

Need custom CSS effects?
├─ YES → Paint Worklet
└─ NO ↓

Need scroll-linked animations?
├─ YES → Animation Worklet
└─ NO ↓

Need audio processing?
├─ YES → Audio Worklet
└─ NO ↓

Need cross-tab communication?
├─ YES → Shared Worker (not covered, but related)
└─ NO → Main Thread

───────────────────────────────────────────────────────────────

COMBINING MULTIPLE:

Progressive Web App (PWA):
✓ Service Worker: Offline, caching, push notifications
✓ Web Worker: Heavy computation (search indexing)
✓ Paint Worklet: Custom UI effects
= Complete solution

Example architecture:
┌────────────────────────────────────────────┐
│ Page (Main Thread)                         │
│ ↓                                          │
│ Service Worker (Network layer)             │
│ ↓                                          │
│ Web Worker (Computation)                   │
│ ↓                                          │
│ Paint Worklet (Rendering)                  │
└────────────────────────────────────────────┘
```

### Performance Characteristics

```
Performance Comparison (Startup Time):

Web Worker:
- Creation: 10-50ms
- First message: 1-5ms
- Total: 15-55ms overhead

Service Worker:
- Registration: 50-200ms
- Installation: 100-500ms (initial)
- Activation: 10-50ms
- First fetch: <1ms (after active)
- Total: 160-750ms initial setup
- Subsequent: <1ms (stays registered)

Paint Worklet:
- Registration: <1ms
- First paint: <1ms
- Total: <2ms overhead

Animation Worklet:
- Registration: <1ms
- Animation start: <1ms
- Total: <2ms overhead

Audio Worklet:
- Registration: 5-10ms
- Node creation: 1-5ms
- Total: 6-15ms overhead

───────────────────────────────────────────────────────────────

Memory Usage:

Web Worker:
- Heap: 10-50MB per worker
- Overhead: Significant for multiple workers

Service Worker:
- Heap: 5-15MB (shared across pages)
- Overhead: Minimal (only one per scope)

Worklets:
- Heap: <1MB per worklet
- Overhead: Negligible

───────────────────────────────────────────────────────────────

When to use each (Performance POV):

High overhead, high benefit:
→ Service Worker (worth it for offline/caching)

Medium overhead, high benefit:
→ Web Worker (worth it for >50ms tasks)

Low overhead, medium benefit:
→ Worklets (worth it for rendering pipeline)
```

### Common Misconceptions

```
❌ "Service Workers are just for offline"
✓ Reality: Also cache management, push, background sync, 
   performance optimization

❌ "Web Workers are slow because of message passing"
✓ Reality: 1-5ms overhead << 50-3000ms of blocked main thread

❌ "Worklets are the same as Workers"
✓ Reality: Worklets are lighter, more integrated, task-specific

❌ "I need Service Worker for PWA"
✓ Reality: Technically yes, but also need manifest, HTTPS, etc.

❌ "Workers can access localStorage"
✓ Reality: No localStorage, but can use IndexedDB

❌ "Service Worker runs on every page load"
✓ Reality: Stays registered, wakes up for events only

❌ "Paint Worklet can animate"
✓ Reality: Static paint, use Animation Worklet for animation

❌ "One Service Worker per page"
✓ Reality: One Service Worker per scope (usually entire origin)
```

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Web Workers Architecture

**Threading Model:**

```
Process Architecture:

Browser Process (Main)
├─ Renderer Process (Per Tab/Group)
│  ├─ Main Thread (UI, JavaScript, Layout, Paint)
│  ├─ Compositor Thread (Scrolling, Animations)
│  ├─ Raster Threads (Drawing)
│  └─ Worker Threads (Web Workers)
│     ├─ Worker 1 (Isolated V8 context)
│     ├─ Worker 2 (Isolated V8 context)
│     └─ Worker N (Isolated V8 context)
├─ GPU Process
└─ Network Process

Each Web Worker:
- Separate V8 isolate (independent JavaScript heap)
- Own event loop
- Own call stack
- No shared memory with main thread (except SharedArrayBuffer)
- Communication via structured clone or transfer

Memory Isolation:
Main Thread Heap          Worker Thread Heap
┌──────────────────┐      ┌──────────────────┐
│ DOM objects      │      │ Computation data │
│ Window object    │      │ WorkerGlobalScope│
│ Document         │      │ No DOM           │
│ UI state         │      │ No window        │
└──────────────────┘      └──────────────────┘
       ↑                          ↑
       └──────────┬───────────────┘
                  │
          postMessage (copy)
          or transfer (ownership)
```

**Worker Lifecycle:**

```
Detailed Lifecycle:

1. Creation (Main Thread):
   const worker = new Worker('worker.js');
   
   Browser actions:
   a. Parse URL (resolve relative to page)
   b. Fetch worker.js (HTTP request or cache)
   c. Create new V8 isolate (10-30ms)
   d. Allocate memory for worker heap (10-50MB)
   e. Initialize WorkerGlobalScope
   f. Parse and execute worker.js (depends on script size)
   
   Total time: 10-50ms (cached script)
              50-200ms (network fetch)

2. Execution:
   Worker script executes top-level code immediately
   Sets up event listeners (onmessage, onerror)
   Enters event loop
   
   // worker.js
   console.log('Worker started'); // Runs immediately
   
   let state = {}; // Persistent across messages
   
   self.onmessage = (e) => {
     // Handle messages
     state.counter = (state.counter || 0) + 1;
   };

3. Message Passing:
   Main → Worker: worker.postMessage(data)
   Worker → Main: self.postMessage(data)
   
   Message Queue (per direction):
   ┌────────────────────────────────┐
   │ [message1] [message2] [message3]│
   └────────────────────────────────┘
   Processed in order (FIFO)
   
   Each message:
   - Serialized (structured clone)
   - Queued
   - Delivered on next event loop tick
   - Deserialized
   - Dispatched to handler

4. Termination:
   // From main thread (immediate)
   worker.terminate();
   
   // From worker (clean shutdown)
   self.close();
   
   Cleanup:
   - Event loop stops
   - Pending messages dropped
   - Memory deallocated
   - V8 isolate destroyed

5. Error Handling:
   worker.onerror = (error) => {
     console.error(error.message);
     // Worker continues running
   };
   
   self.onerror = (error) => {
     // Can prevent error propagation
     return true;
   };
```

**Advanced Worker Patterns:**

```javascript
// Pattern 1: Worker Pool with Priority Queue

class PriorityWorkerPool {
  constructor(size, workerScript) {
    this.workers = Array(size).fill(null).map(() => ({
      worker: new Worker(workerScript),
      busy: false,
      priority: 0
    }));
    
    // Priority queues (high to low)
    this.queues = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    this.setupWorkers();
  }
  
  setupWorkers() {
    this.workers.forEach((w) => {
      w.worker.onmessage = (e) => {
        w.busy = false;
        
        // Resolve task
        const task = this.tasks.get(e.data.taskId);
        if (task) {
          task.resolve(e.data.result);
          this.tasks.delete(e.data.taskId);
        }
        
        // Process next task
        this.processQueue();
      };
    });
  }
  
  async execute(task, priority = 'medium') {
    return new Promise((resolve, reject) => {
      const taskId = this.generateId();
      
      this.tasks.set(taskId, { resolve, reject });
      this.queues[priority].push({ taskId, task });
      
      this.processQueue();
    });
  }
  
  processQueue() {
    // Process in priority order
    const priorities = ['critical', 'high', 'medium', 'low'];
    
    for (const priority of priorities) {
      while (this.queues[priority].length > 0) {
        const worker = this.getAvailableWorker();
        
        if (!worker) return;
        
        const { taskId, task } = this.queues[priority].shift();
        
        worker.busy = true;
        worker.priority = priorities.indexOf(priority);
        worker.worker.postMessage({ taskId, ...task });
      }
    }
  }
  
  getAvailableWorker() {
    return this.workers.find(w => !w.busy);
  }
  
  getStats() {
    return {
      workers: this.workers.map(w => ({
        busy: w.busy,
        priority: w.priority
      })),
      queued: {
        critical: this.queues.critical.length,
        high: this.queues.high.length,
        medium: this.queues.medium.length,
        low: this.queues.low.length
      }
    };
  }
}

// Usage
const pool = new PriorityWorkerPool(4, 'processor.js');

// Critical task (processed first)
await pool.execute({ action: 'process', data: urgentData }, 'critical');

// Low priority task (processed last)
await pool.execute({ action: 'process', data: backgroundData }, 'low');

// Pattern 2: Worker with Transferable Objects

class ImageWorkerOptimized {
  constructor() {
    this.worker = new Worker('image-worker.js');
    this.callbacks = new Map();
  }
  
  async processImage(imageData) {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);
      
      this.callbacks.set(id, { resolve, reject });
      
      // Transfer ArrayBuffer (zero-copy)
      this.worker.postMessage(
        {
          id,
          imageData: {
            data: imageData.data,
            width: imageData.width,
            height: imageData.height
          }
        },
        [imageData.data.buffer] // Transfer ownership
      );
      
      // imageData.data now detached (length = 0)
    });
  }
  
  handleResult(e) {
    const { id, imageData } = e.data;
    const callback = this.callbacks.get(id);
    
    if (callback) {
      // Reconstruct ImageData
      const result = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );
      
      callback.resolve(result);
      this.callbacks.delete(id);
    }
  }
}

// Performance comparison:
// 10MB image

// Copy approach:
// Main → Worker: 100ms (copy 10MB)
// Processing: 200ms
// Worker → Main: 100ms (copy 10MB)
// Total: 400ms

// Transfer approach:
// Main → Worker: <1ms (transfer)
// Processing: 200ms
// Worker → Main: <1ms (transfer)
// Total: 202ms

// Improvement: 2× faster (400ms → 202ms)

// Pattern 3: Worker with Shared State (SharedArrayBuffer)

class SharedStateWorker {
  constructor() {
    // Create shared memory
    this.sharedBuffer = new SharedArrayBuffer(1024);
    this.sharedArray = new Int32Array(this.sharedBuffer);
    
    // Initialize shared state
    Atomics.store(this.sharedArray, 0, 0); // counter
    Atomics.store(this.sharedArray, 1, 0); // status
    
    this.worker = new Worker('shared-worker.js');
    
    // Send shared buffer to worker
    this.worker.postMessage({ sharedBuffer: this.sharedBuffer });
  }
  
  incrementCounter() {
    // Atomic increment (thread-safe)
    return Atomics.add(this.sharedArray, 0, 1);
  }
  
  getCounter() {
    return Atomics.load(this.sharedArray, 0);
  }
  
  waitForStatus(expectedStatus) {
    // Block until status changes
    Atomics.wait(this.sharedArray, 1, expectedStatus);
    return Atomics.load(this.sharedArray, 1);
  }
  
  setStatus(status) {
    Atomics.store(this.sharedArray, 1, status);
    // Notify waiting threads
    Atomics.notify(this.sharedArray, 1, Infinity);
  }
}

// shared-worker.js
let sharedArray;

self.onmessage = (e) => {
  if (e.data.sharedBuffer) {
    sharedArray = new Int32Array(e.data.sharedBuffer);
    
    // Worker can directly access shared memory
    setInterval(() => {
      const counter = Atomics.load(sharedArray, 0);
      console.log('Counter:', counter);
    }, 1000);
  }
};

// Use case: Real-time collaboration
// Multiple workers update shared state
// No message passing overhead
// Atomic operations ensure consistency
```

### Service Worker Architecture

**Lifecycle State Machine:**

```
Service Worker Lifecycle:

┌──────────────────────────────────────────────────────────┐
│                     LIFECYCLE STATES                      │
└──────────────────────────────────────────────────────────┘

1. PARSED
   ↓ (register called)

2. INSTALLING
   ├─ Download service worker script
   ├─ Parse and compile
   ├─ Fire 'install' event
   ├─ Wait for install event to complete
   └─ Cache initial resources
   
   self.addEventListener('install', (event) => {
     event.waitUntil(
       caches.open('v1').then(cache => 
         cache.addAll(['/index.html', '/style.css', '/app.js'])
       )
     );
   });
   
   ↓ (install success)

3. INSTALLED (waiting)
   ├─ Install succeeded
   ├─ Waiting for old service worker to release
   ├─ Won't activate until all pages close (default)
   └─ Can skip waiting: self.skipWaiting()
   
   ↓ (all controlled pages closed OR skipWaiting)

4. ACTIVATING
   ├─ Fire 'activate' event
   ├─ Clean up old caches
   ├─ Prepare to take control
   └─ Can claim clients: self.clients.claim()
   
   self.addEventListener('activate', (event) => {
     event.waitUntil(
       caches.keys().then(keys => 
         Promise.all(
           keys.map(key => {
             if (key !== 'v1') return caches.delete(key);
           })
         )
       )
     );
   });
   
   ↓ (activation complete)

5. ACTIVATED
   ├─ Ready to handle fetch events
   ├─ Controls pages
   ├─ Stays active until:
   │  └─ New version detected
   │  └─ Unregistered
   │  └─ Browser terminates
   └─ Can be terminated when idle (restarted on event)
   
   self.addEventListener('fetch', (event) => {
     event.respondWith(handleRequest(event.request));
   });

6. REDUNDANT
   └─ Failed to install/activate OR replaced by new version

───────────────────────────────────────────────────────────

Update Flow (New Version):

Old SW (v1)          New SW (v2)          Browser
ACTIVATED            PARSED               User visits page
    │                    ↓                     │
    │                INSTALLING           Detects new SW
    │                    ↓                     │
    │                INSTALLED (waiting)   Shows "update available"
    │                    │                     │
    ├─ (still serving)   │                     │
    │                    │                     │
(pages close)            │                (refresh)
    │                    ↓                     │
    ↓                ACTIVATING            Activates new SW
REDUNDANT                ↓                     │
                     ACTIVATED             New SW serves pages

Fast update (skip waiting):
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Don't wait for old SW
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // Take control immediately
});
```

**Fetch Event Interception:**

```
Network Request Flow with Service Worker:

Page                Service Worker         Cache        Network
 │                        │                  │             │
 ├─ fetch('/api/data')    │                  │             │
 │                        │                  │             │
 ├────────────────────────→ fetch event      │             │
                           │                  │             │
                           ├─ Check cache ───→             │
                           │                  │             │
                           ←─ Cache miss ─────┤             │
                           │                                │
                           ├─ Fetch from network ──────────→
                           │                                │
                           ←─ Response ────────────────────┤
                           │                                │
                           ├─ Cache response ──→            │
                           │                  │             │
 ←─────────────────────────┤ Respond to page │             │
 │                                                          │
 ├─ Display data                                           │

Fetch Event Handler:

self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // event.respondWith() takes over response
  event.respondWith(
    // Can return:
    // 1. Response from cache
    // 2. Response from network
    // 3. Synthetic response
    // 4. Promise that resolves to Response
    
    handleRequest(request)
  );
});

async function handleRequest(request) {
  // Strategy: Cache, falling back to network
  
  try {
    // Check cache first
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('Cache hit:', request.url);
      return cachedResponse;
    }
    
    // Cache miss, fetch from network
    console.log('Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open('dynamic-v1');
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network failed, try to serve offline page
    console.error('Fetch failed:', error);
    
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    // Return synthetic error response
    return new Response('Network error', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

Advanced Patterns:

// Pattern 1: Dynamic cache with size limit
class BoundedCache {
  constructor(cacheName, maxItems) {
    this.cacheName = cacheName;
    this.maxItems = maxItems;
  }
  
  async put(request, response) {
    const cache = await caches.open(this.cacheName);
    
    // Add new item
    await cache.put(request, response);
    
    // Enforce size limit
    const keys = await cache.keys();
    if (keys.length > this.maxItems) {
      // Delete oldest (FIFO)
      await cache.delete(keys[0]);
    }
  }
  
  async match(request) {
    const cache = await caches.open(this.cacheName);
    return cache.match(request);
  }
}

const imageCache = new BoundedCache('images', 50);

// Pattern 2: Stale-while-revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open('swrevalidate');
  const cachedResponse = await cache.match(request);
  
  // Fetch fresh version in background
  const fetchPromise = fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  });
  
  // Return cached immediately if available
  return cachedResponse || fetchPromise;
}

// Pattern 3: Network timeout fallback
async function networkWithTimeout(request, timeout = 3000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]).catch(async () => {
    // Timeout or error, serve cache
    return caches.match(request);
  });
}

// Pattern 4: Routing by URL pattern
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API requests: Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
  }
  // Static assets: Cache first
  else if (url.pathname.match(/\.(js|css|jpg|png|gif|svg)$/)) {
    event.respondWith(cacheFirst(event.request));
  }
  // HTML: Stale-while-revalidate
  else if (url.pathname.endsWith('.html')) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
  // Default: Network only
  else {
    event.respondWith(fetch(event.request));
  }
});
```

**Push Notifications:**

```
Push Notification Flow:

Backend Server      Push Service      Service Worker     Browser
      │                  │                  │               │
      ├─ Generate push ──→                  │               │
      │  subscription                       │               │
      │  (VAPID keys)                       │               │
      │                  │                  │               │
      │                  ├─ Store sub ──────→               │
      │                  │  (client)                        │
      │                                                     │
(want to notify)                                           │
      │                                                     │
      ├─ Send push ──────→                                  │
      │  message                                            │
      │  (encrypted)                                        │
      │                  │                                  │
      │                  ├─ Deliver push ───→               │
      │                  │                  │               │
      │                  │                  ├─ 'push' event │
      │                  │                  │               │
      │                  │                  ├─ Show ────────→
      │                  │                  │  notification │
      │                  │                  │               │
      │                  │                  │          (displayed)

Service Worker Implementation:

// Register for push notifications
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
  });
  
  // Send subscription to backend
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: { 'Content-Type': 'application/json' }
  });
  
  return subscription;
}

// In service worker: Handle push events
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    const url = event.notification.data.url;
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // If already open, focus that tab
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open new tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

Backend (Node.js with web-push):

const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:admin@example.com',
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

// Send push notification
async function sendPush(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('Push sent successfully');
  } catch (error) {
    console.error('Push failed:', error);
    
    if (error.statusCode === 410) {
      // Subscription expired, remove from database
      await deleteSubscription(subscription);
    }
  }
}

// Example usage
await sendPush(userSubscription, {
  title: 'New Message',
  body: 'You have a new message from John',
  url: '/messages/123'
});
```

### Worklets Deep Dive

**Paint Worklet Internals:**

```
Paint Worklet Rendering Pipeline:

Style Calculation → Layout → Paint (WORKLET) → Composite
                               ↑
                         Custom paint code

Paint Worklet Execution Context:

Main Thread                 Paint Worklet Thread
┌─────────────────┐         ┌──────────────────┐
│ CSS parsing     │         │ Isolated context │
│ Style calc      │         │ Limited globals  │
│ Layout          │         │ No DOM access    │
└─────────────────┘         └──────────────────┘
        │                            │
        ├─ Paint needed ─────────────→
        │  (element size, properties) │
        │                            │
        │                   Execute paint()
        │                            │
        │                   Draw to canvas
        │                            │
        ←─ Painted image ────────────┤

Paint Worklet API:

// register-paint.js
registerPaint('my-paint', class {
  // Static properties
  static get inputProperties() {
    // CSS custom properties this paint uses
    return ['--my-color', '--my-size'];
  }
  
  static get inputArguments() {
    // Additional arguments from CSS
    return ['<length>', '<color>'];
  }
  
  static get contextOptions() {
    return { alpha: true };
  }
  
  // Paint method (called on every repaint)
  paint(ctx, size, properties, args) {
    // ctx: CanvasRenderingContext2D-like API
    // size: { width, height } of element
    // properties: StylePropertyMapReadOnly
    // args: Array of parsed CSS arguments
    
    const color = properties.get('--my-color').toString();
    const pixelSize = parseInt(properties.get('--my-size').toString());
    
    ctx.fillStyle = color;
    
    // Draw checkerboard pattern
    for (let y = 0; y < size.height; y += pixelSize) {
      for (let x = 0; x < size.width; x += pixelSize) {
        if ((x + y) / pixelSize % 2 === 0) {
          ctx.fillRect(x, y, pixelSize, pixelSize);
        }
      }
    }
  }
});

// Usage in CSS
.element {
  --my-color: #ff0000;
  --my-size: 20;
  background-image: paint(my-paint);
}

// Or with arguments
.element {
  background-image: paint(my-paint, 10px, blue);
}

Performance Characteristics:

// Paint frequency:
// - Initial render: 1×
// - Resize: Every resize
// - Custom property change: Every change
// - Scroll: 0× (cached, unless invalidated)

// Optimization: Cache expensive operations
let cachedPattern = null;
let cachedSize = null;

paint(ctx, size, properties) {
  if (!cachedPattern || 
      cachedSize.width !== size.width || 
      cachedSize.height !== size.height) {
    
    cachedPattern = generatePattern(size);
    cachedSize = size;
  }
  
  ctx.drawImage(cachedPattern, 0, 0);
}

Advanced Paint Worklet Example:

// Animated gradient (responds to scroll)
registerPaint('scroll-gradient', class {
  static get inputProperties() {
    return ['--scroll-offset'];
  }
  
  paint(ctx, size, properties) {
    const scrollOffset = parseFloat(properties.get('--scroll-offset'));
    
    // Create gradient based on scroll
    const gradient = ctx.createLinearGradient(
      0, scrollOffset % size.height,
      size.width, size.height + (scrollOffset % size.height)
    );
    
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.5, '#00ff00');
    gradient.addColorStop(1, '#0000ff');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width, size.height);
  }
});

// Update custom property on scroll
window.addEventListener('scroll', () => {
  document.documentElement.style.setProperty(
    '--scroll-offset',
    window.scrollY
  );
});
```

**Animation Worklet Internals:**

```
Animation Worklet Execution:

Main Thread              Compositor Thread        Animation Worklet
    │                           │                        │
    ├─ Register animator ───────────────────────────────→
    │                           │                        │
    ├─ Create animation ────────→                        │
    │                           │                        │
    │                           ├─ Every frame ──────────→
    │                           │                        │
    │                           │              Execute animate()
    │                           │                        │
    │                           ←─ Effect timing ────────┤
    │                           │                        │
    │                    Apply animation                 │
    │                           │                        │
    │                    Composite frame                 │
    │                           │                        │
    (no main thread involvement after creation!)

Key Advantage: Runs on compositor thread
- Smooth 60fps even if main thread busy
- No JavaScript jank
- Lower battery consumption

Animation Worklet API:

// parallax.js
registerAnimator('parallax', class {
  constructor(options) {
    // options passed from main thread
    this.speed = options.speed || 0.5;
  }
  
  animate(currentTime, effect) {
    // currentTime: milliseconds from animation start
    // effect: WorkletGroupEffect with timing
    
    // Calculate parallax offset
    const scrollOffset = currentTime * this.speed;
    
    // Update effect timing
    effect.localTime = scrollOffset;
  }
});

// Main thread usage
await CSS.animationWorklet.addModule('parallax.js');

const animation = new WorkletAnimation(
  'parallax',
  new KeyframeEffect(
    element,
    [
      { transform: 'translateY(0px)' },
      { transform: 'translateY(-200px)' }
    ],
    {
      duration: 1000,
      iterations: 1
    }
  ),
  new ScrollTimeline({
    scrollSource: document.scrollingElement,
    orientation: 'vertical'
  }),
  { speed: 0.5 } // options passed to constructor
);

animation.play();

Performance Comparison:

// RequestAnimationFrame (Main Thread):
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      element.style.transform = `translateY(${scrollY * 0.5}px)`;
      ticking = false;
    });
    ticking = true;
  }
});

// Problems:
// - Runs on main thread (competes with JavaScript)
// - Can drop frames if main thread busy
// - Requires continuous style recalculation

// Animation Worklet:
// - Runs on compositor (isolated from main thread)
// - Guaranteed 60fps
// - No style recalculation overhead

Advanced: Multiple Timelines

registerAnimator('multi-effect', class {
  animate(currentTime, effect) {
    // Can respond to multiple inputs simultaneously
    
    const scrollProgress = effect.timeline.currentTime;
    const gestureProgress = effect.gesture?.currentTime || 0;
    
    // Combine effects
    effect.localTime = scrollProgress + gestureProgress;
  }
});
```

**Audio Worklet Internals:**

```
Audio Worklet Architecture:

Main Thread           Audio Rendering Thread      Audio Worklet
    │                          │                        │
    ├─ Create AudioContext ────→                        │
    │                          │                        │
    ├─ Load AudioWorklet ──────────────────────────────→
    │                          │                        │
    ├─ Create AudioWorkletNode ────────────────────────→
    │                          │                        │
    ├─ Connect nodes ──────────→                        │
    │                          │                        │
    │                          ├─ Audio callback ───────→
    │                          │  (128 samples)          │
    │                          │                        │
    │                          │             Process audio
    │                          │                        │
    │                          ←─ Output samples ───────┤
    │                          │                        │
    │                   Mix/render output                │
    │                          │                        │
    (no main thread involvement during audio processing!)

Audio Callback: Called every ~3ms (128 samples @ 44.1kHz)
Must complete in < 3ms or audio drops/glitches

Audio Worklet Processor:

// noise-processor.js
class NoiseProcessor extends AudioWorkletProcessor {
  // Constructor (called once)
  constructor(options) {
    super();
    this.amplitude = options.processorOptions?.amplitude || 1.0;
    
    // Setup message handling
    this.port.onmessage = (e) => {
      if (e.data.amplitude !== undefined) {
        this.amplitude = e.data.amplitude;
      }
    };
  }
  
  // Static getter for parameters
  static get parameterDescriptors() {
    return [{
      name: 'gain',
      defaultValue: 1.0,
      minValue: 0,
      maxValue: 1.0,
      automationRate: 'a-rate' // per-sample automation
    }];
  }
  
  // Process method (called every audio callback)
  process(inputs, outputs, parameters) {
    // inputs: Array of input channels
    // outputs: Array of output channels
    // parameters: Map of parameter values
    
    const output = outputs[0];
    const gain = parameters.gain;
    
    // Process each channel
    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      
      // Process each sample (128 typically)
      for (let i = 0; i < outputChannel.length; i++) {
        // Get gain (can vary per sample if automated)
        const gainValue = gain.length > 1 ? gain[i] : gain[0];
        
        // Generate white noise
        outputChannel[i] = (Math.random() * 2 - 1) * this.amplitude * gainValue;
      }
    }
    
    // Return true to keep processor alive
    // Return false to garbage collect
    return true;
  }
}

registerProcessor('noise-processor', NoiseProcessor);

// Main thread usage:
const audioContext = new AudioContext();

await audioContext.audioWorklet.addModule('noise-processor.js');

const noiseNode = new AudioWorkletNode(audioContext, 'noise-processor', {
  processorOptions: {
    amplitude: 0.5
  }
});

// Connect to destination (speakers)
noiseNode.connect(audioContext.destination);

// Change amplitude dynamically
noiseNode.port.postMessage({ amplitude: 0.8 });

// Automate gain parameter
const gainParam = noiseNode.parameters.get('gain');
gainParam.setValueAtTime(1.0, audioContext.currentTime);
gainParam.linearRampToValueAtTime(0.0, audioContext.currentTime + 2);

Real-World Example: Reverb Effect

class ReverbProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Delay lines for reverb
    this.delayBuffers = [];
    this.delayTimes = [37, 113, 179, 251]; // Prime numbers (less comb filtering)
    this.delayIndices = [0, 0, 0, 0];
    
    // Initialize delay buffers
    this.delayTimes.forEach((time, i) => {
      const samples = Math.floor(time * sampleRate / 1000);
      this.delayBuffers[i] = new Float32Array(samples);
      this.delayBuffers[i].fill(0);
    });
    
    this.feedback = 0.7;
    this.mix = 0.3;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input.length) return true;
    
    const inputChannel = input[0];
    const outputChannel = output[0];
    
    for (let i = 0; i < outputChannel.length; i++) {
      const inputSample = inputChannel[i];
      let reverbSample = 0;
      
      // Process each delay line
      this.delayBuffers.forEach((buffer, j) => {
        const delayIndex = this.delayIndices[j];
        
        // Read from delay line
        const delayedSample = buffer[delayIndex];
        reverbSample += delayedSample;
        
        // Write to delay line (with feedback)
        buffer[delayIndex] = inputSample + delayedSample * this.feedback;
        
        // Increment index (circular buffer)
        this.delayIndices[j] = (delayIndex + 1) % buffer.length;
      });
      
      // Mix dry and wet signals
      outputChannel[i] = inputSample * (1 - this.mix) + 
                         reverbSample * this.mix / this.delayBuffers.length;
    }
    
    return true;
  }
}

registerProcessor('reverb', ReverbProcessor);

Performance Considerations:

// Audio callback must complete in < 3ms
// 128 samples @ 44.1kHz = 2.9ms

// Optimization tips:
// 1. Avoid allocations in process()
//    ❌ const buffer = new Float32Array(128); // Every callback!
//    ✓ this.buffer = new Float32Array(128);   // In constructor

// 2. Avoid Math functions (expensive)
//    ❌ Math.sin(x)
//    ✓ Pre-computed lookup table

// 3. Avoid conditionals in tight loops
//    ❌ for (let i = 0; i < 128; i++) { if (...) {...} }
//    ✓ Unroll or restructure

// 4. Use TypedArrays (faster than regular arrays)
//    ✓ Float32Array

// 5. Minimize message passing
//    ❌ this.port.postMessage(sample); // Every sample!
//    ✓ Batch updates every N samples

Monitoring Performance:

class MonitoredProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameCount = 0;
    this.totalTime = 0;
  }
  
  process(inputs, outputs, parameters) {
    const startTime = performance.now();
    
    // ... do audio processing ...
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.totalTime += duration;
    this.frameCount++;
    
    // Report every second
    if (this.frameCount % 345 === 0) { // ~1 second @ 44.1kHz
      const avgTime = this.totalTime / this.frameCount;
      
      this.port.postMessage({
        type: 'performance',
        avgProcessTime: avgTime,
        maxAllowed: 2.9 // ms
      });
      
      if (avgTime > 2.5) {
        console.warn('Audio processing too slow!', avgTime, 'ms');
      }
      
      // Reset counters
      this.frameCount = 0;
      this.totalTime = 0;
    }
    
    return true;
  }
}
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: Progressive Web App with Service Worker

```javascript
// sw.js - Complete Service Worker for PWA

const CACHE_VERSION = 'v1.0.3';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/db.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install event: Cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete old versions
            if (!Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event: Serve cached content or fetch from network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API: Network first, cache as fallback
    event.respondWith(networkFirst(request, CACHE_NAMES.dynamic));
  } else if (request.destination === 'image') {
    // Images: Cache first
    event.respondWith(cacheFirst(request, CACHE_NAMES.images));
  } else if (url.pathname.endsWith('.html') || url.pathname === '/') {
    // HTML: Stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.static));
  } else {
    // Static assets: Cache first
    event.respondWith(cacheFirst(request, CACHE_NAMES.static));
  }
});

// Caching Strategies

async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Not in cache, fetch from network
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Cache first failed:', error);
    return offlineFallback(request);
  }
}

async function networkFirst(request, cacheName) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    console.log('Network failed, trying cache:', request.url);
    
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    return offlineFallback(request);
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Fetch fresh version in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  
  // Return cached immediately if available
  return cached || fetchPromise;
}

async function offlineFallback(request) {
  // Serve offline page for navigation requests
  if (request.mode === 'navigate') {
    const cache = await caches.open(CACHE_NAMES.static);
    return cache.match('/offline.html');
  }
  
  // Synthetic error response for other requests
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Background Sync
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Sync event:', event.tag);
  
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

async function syncPosts() {
  try {
    // Get pending posts from IndexedDB
    const pendingPosts = await getFromIndexedDB('pending-posts');
    
    // Send each post
    for (const post of pendingPosts) {
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(post),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Remove from pending
        await removeFromIndexedDB('pending-posts', post.id);
      }
    }
    
    // Notify all clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'sync-complete' });
    });
    
  } catch (error) {
    console.error('Sync failed:', error);
    throw error; // Retry later
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  let data = { title: 'New Notification', body: 'You have a new notification' };
  
  if (event.data) {
    data = event.data.json();
  }
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Open', icon: '/icons/open.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
    ],
    tag: data.tag || 'default',
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'open') {
    const url = event.notification.data.url;
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Check if already open
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Message handling from clients
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAMES.dynamic).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Helper: IndexedDB operations
function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('app-db', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

function removeFromIndexedDB(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('app-db', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Main application (app.js)

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration.scope);
      
      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            showUpdateNotification();
          }
        });
      });
      
      // Request notification permission
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      
      // Subscribe to push notifications
      if (Notification.permission === 'granted') {
        await subscribeToPush(registration);
      }
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

// Subscribe to push notifications
async function subscribeToPush(registration) {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });
    
    // Send subscription to backend
    await fetch('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Push subscription successful');
  } catch (error) {
    console.error('Push subscription failed:', error);
  }
}

// Show update notification
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <p>A new version is available!</p>
    <button onclick="updateServiceWorker()">Update Now</button>
    <button onclick="this.parentElement.remove()">Later</button>
  `;
  document.body.appendChild(notification);
}

// Update service worker
function updateServiceWorker() {
  navigator.serviceWorker.ready.then(registration => {
    if (registration.waiting) {
      // Tell waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload page after activation
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  });
}

// Offline detection
window.addEventListener('online', () => {
  console.log('Back online');
  showNotification('You are back online!', 'success');
  
  // Trigger background sync
  if ('sync' in registration) {
    registration.sync.register('sync-posts');
  }
});

window.addEventListener('offline', () => {
  console.log('Went offline');
  showNotification('You are offline. Some features may be limited.', 'warning');
});

// Listen for messages from service worker
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'sync-complete') {
    showNotification('Posts synced successfully!', 'success');
  }
});
```

### Example 2: Image Processing with Web Workers and Worklets

```javascript
// image-app.js - Main application

class ImageEditor {
  constructor() {
    this.worker = new Worker('image-worker.js');
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    
    // Register paint worklet for custom effects
    CSS.paintWorklet.addModule('image-paint-worklet.js');
  }
  
  async applyFilter(imageData, filterType) {
    return new Promise((resolve, reject) => {
      const taskId = Math.random().toString(36);
      
      this.callbacks = this.callbacks || new Map();
      this.callbacks.set(taskId, { resolve, reject });
      
      // Transfer image data to worker (zero-copy)
      this.worker.postMessage(
        {
          taskId,
          action: 'filter',
          filterType,
          imageData: {
            data: imageData.data,
            width: imageData.width,
            height: imageData.height
          }
        },
        [imageData.data.buffer] // Transfer ownership
      );
    });
  }
  
  handleWorkerMessage(e) {
    const { taskId, result, error, progress } = e.data;
    
    if (progress !== undefined) {
      this.updateProgress(progress);
      return;
    }
    
    const callback = this.callbacks?.get(taskId);
    if (!callback) return;
    
    this.callbacks.delete(taskId);
    
    if (error) {
      callback.reject(new Error(error));
    } else {
      // Reconstruct ImageData
      const imageData = new ImageData(
        new Uint8ClampedArray(result.data),
        result.width,
        result.height
      );
      callback.resolve(imageData);
    }
  }
  
  updateProgress(progress) {
    const bar = document.getElementById('progress-bar');
    if (bar) {
      bar.style.width = `${progress}%`;
      bar.textContent = `${Math.round(progress)}%`;
    }
  }
}

// image-worker.js - Web Worker for heavy processing

self.onmessage = async (e) => {
  const { taskId, action, filterType, imageData } = e.data;
  
  try {
    let result;
    
    switch (action) {
      case 'filter':
        result = await applyFilter(imageData, filterType, (progress) => {
          // Report progress
          self.postMessage({ taskId, progress });
        });
        break;
        
      default:
        throw new Error('Unknown action: ' + action);
    }
    
    // Send result back (transfer buffer)
    self.postMessage(
      { taskId, result },
      [result.data.buffer]
    );
    
  } catch (error) {
    self.postMessage({
      taskId,
      error: error.message
    });
  }
};

async function applyFilter(imageData, filterType, onProgress) {
  const { data, width, height } = imageData;
  const pixels = new Uint8ClampedArray(data);
  const totalPixels = width * height;
  
  // Report progress every 10%
  let lastProgress = 0;
  const reportInterval = Math.floor(totalPixels / 10);
  
  switch (filterType) {
    case 'grayscale':
      for (let i = 0; i < pixels.length; i += 4) {
        const avg = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
        pixels[i] = pixels[i+1] = pixels[i+2] = avg;
        
        if (i % (reportInterval * 4) === 0) {
          const progress = (i / pixels.length) * 100;
          if (progress - lastProgress >= 10) {
            onProgress(progress);
            lastProgress = progress;
          }
        }
      }
      break;
      
    case 'blur':
      // Gaussian blur (expensive!)
      const radius = 3;
      const temp = new Uint8ClampedArray(pixels);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0, count = 0;
          
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = (ny * width + nx) * 4;
                r += temp[idx];
                g += temp[idx+1];
                b += temp[idx+2];
                count++;
              }
            }
          }
          
          const idx = (y * width + x) * 4;
          pixels[idx] = r / count;
          pixels[idx+1] = g / count;
          pixels[idx+2] = b / count;
        }
        
        if (y % Math.floor(height / 10) === 0) {
          onProgress((y / height) * 100);
        }
      }
      break;
      
    case 'edge-detect':
      // Sobel edge detection
      const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
      const temp2 = new Uint8ClampedArray(pixels);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let gx = 0, gy = 0;
          
          for (let ky = 0; ky < 3; ky++) {
            for (let kx = 0; kx < 3; kx++) {
              const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4;
              const gray = (temp2[idx] + temp2[idx+1] + temp2[idx+2]) / 3;
              
              gx += gray * sobelX[ky * 3 + kx];
              gy += gray * sobelY[ky * 3 + kx];
            }
          }
          
          const magnitude = Math.sqrt(gx * gx + gy * gy);
          const idx = (y * width + x) * 4;
          pixels[idx] = pixels[idx+1] = pixels[idx+2] = Math.min(255, magnitude);
        }
        
        if (y % Math.floor(height / 10) === 0) {
          onProgress((y / height) * 100);
        }
      }
      break;
  }
  
  onProgress(100);
  
  return { data: pixels, width, height };
}

// image-paint-worklet.js - Paint Worklet for custom effects

registerPaint('pixel-art', class {
  static get inputProperties() {
    return ['--pixel-size'];
  }
  
  paint(ctx, size, properties) {
    const pixelSize = parseInt(properties.get('--pixel-size') || 10);
    
    // Create pixelated effect
    ctx.imageSmoothingEnabled = false;
    
    const cols = Math.ceil(size.width / pixelSize);
    const rows = Math.ceil(size.height / pixelSize);
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const hue = (x + y) * 10 % 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }
});

registerPaint('scanlines', class {
  static get inputProperties() {
    return ['--line-spacing', '--line-color'];
  }
  
  paint(ctx, size, properties) {
    const spacing = parseInt(properties.get('--line-spacing') || 4);
    const color = properties.get('--line-color').toString() || 'rgba(0,0,0,0.1)';
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    
    for (let y = 0; y < size.height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y);
      ctx.stroke();
    }
  }
});

// Usage in HTML
/*
<style>
  .image-container {
    background: paint(pixel-art);
    --pixel-size: 20;
  }
  
  .image-with-scanlines {
    position: relative;
  }
  
  .image-with-scanlines::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: paint(scanlines);
    --line-spacing: 3;
    --line-color: rgba(0,0,0,0.15);
    pointer-events: none;
  }
</style>

<div class="image-container">
  <img id="main-image" src="photo.jpg">
</div>

<div class="image-with-scanlines">
  <img src="retro-photo.jpg">
</div>

<button onclick="applyFilterClick()">Apply Filter</button>
<div id="progress-bar"></div>
*/

// Click handler
const editor = new ImageEditor();

async function applyFilterClick() {
  const img = document.getElementById('main-image');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  try {
    const filtered = await editor.applyFilter(imageData, 'blur');
    ctx.putImageData(filtered, 0, 0);
    img.src = canvas.toDataURL();
  } catch (error) {
    console.error('Filter failed:', error);
  }
}
```

### Example 3: Audio Worklet for Music App

```javascript
// audio-app.js - Music production app

class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.nodes = {};
  }
  
  async initialize() {
    this.audioContext = new AudioContext();
    
    // Load Audio Worklets
    await this.audioContext.audioWorklet.addModule('synth-processor.js');
    await this.audioContext.audioWorklet.addModule('reverb-processor.js');
    await this.audioContext.audioWorklet.addModule('compressor-processor.js');
    
    console.log('Audio system initialized');
  }
  
  createSynth() {
    const synth = new AudioWorkletNode(this.audioContext, 'synth-processor');
    this.nodes.synth = synth;
    return synth;
  }
  
  createReverb() {
    const reverb = new AudioWorkletNode(this.audioContext, 'reverb-processor');
    this.nodes.reverb = reverb;
    return reverb;
  }
  
  createCompressor() {
    const compressor = new AudioWorkletNode(this.audioContext, 'compressor-processor');
    this.nodes.compressor = compressor;
    return compressor;
  }
  
  connect() {
    // Create audio chain: Synth → Reverb → Compressor → Destination
    const synth = this.createSynth();
    const reverb = this.createReverb();
    const compressor = this.createCompressor();
    
    synth.connect(reverb);
    reverb.connect(compressor);
    compressor.connect(this.audioContext.destination);
    
    return { synth, reverb, compressor };
  }
  
  playNote(frequency, duration) {
    const synth = this.nodes.synth;
    
    if (synth) {
      synth.port.postMessage({
        type: 'note-on',
        frequency,
        duration
      });
    }
  }
}

// synth-processor.js - Synthesizer Audio Worklet

class SynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    this.phase = 0;
    this.frequency = 440;
    this.amplitude = 0;
    this.targetAmplitude = 0;
    this.releaseTime = 0.1; // seconds
    
    this.port.onmessage = (e) => {
      const { type, frequency, duration } = e.data;
      
      if (type === 'note-on') {
        this.frequency = frequency;
        this.targetAmplitude = 0.3;
        
        // Schedule note off
        setTimeout(() => {
          this.targetAmplitude = 0;
        }, duration * 1000);
      }
    };
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    
    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      
      for (let i = 0; i < outputChannel.length; i++) {
        // Envelope (smooth amplitude changes)
        const delta = (this.targetAmplitude - this.amplitude) / (sampleRate * this.releaseTime);
        this.amplitude += delta;
        
        // Generate sine wave
        const sample = Math.sin(this.phase * 2 * Math.PI) * this.amplitude;
        outputChannel[i] = sample;
        
        // Increment phase
        this.phase += this.frequency / sampleRate;
        if (this.phase >= 1) this.phase -= 1;
      }
    }
    
    return true;
  }
}

registerProcessor('synth-processor', SynthProcessor);

// reverb-processor.js - Reverb Audio Worklet

class ReverbProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Multiple delay lines for reverb
    this.delayLines = [
      { buffer: new Float32Array(Math.floor(sampleRate * 0.037)), index: 0 },
      { buffer: new Float32Array(Math.floor(sampleRate * 0.113)), index: 0 },
      { buffer: new Float32Array(Math.floor(sampleRate * 0.179)), index: 0 },
      { buffer: new Float32Array(Math.floor(sampleRate * 0.251)), index: 0 }
    ];
    
    this.delayLines.forEach(line => line.buffer.fill(0));
    
    this.feedback = 0.7;
    this.wetDryMix = 0.3;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input.length) return true;
    
    const inputChannel = input[0];
    const outputChannel = output[0];
    
    for (let i = 0; i < outputChannel.length; i++) {
      const inputSample = inputChannel[i] || 0;
      let reverbSample = 0;
      
      // Process each delay line
      this.delayLines.forEach(line => {
        const delayedSample = line.buffer[line.index];
        reverbSample += delayedSample;
        
        // Write new sample with feedback
        line.buffer[line.index] = inputSample + delayedSample * this.feedback;
        
        // Increment circular buffer index
        line.index = (line.index + 1) % line.buffer.length;
      });
      
      // Mix dry and wet signals
      reverbSample /= this.delayLines.length;
      outputChannel[i] = inputSample * (1 - this.wetDryMix) + 
                         reverbSample * this.wetDryMix;
    }
    
    return true;
  }
}

registerProcessor('reverb-processor', ReverbProcessor);

// compressor-processor.js - Dynamic Range Compressor

class CompressorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    this.threshold = 0.5;
    this.ratio = 4;
    this.attack = 0.003; // seconds
    this.release = 0.25; // seconds
    this.envelope = 0;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input.length) return true;
    
    const inputChannel = input[0];
    const outputChannel = output[0];
    
    for (let i = 0; i < outputChannel.length; i++) {
      const inputSample = inputChannel[i] || 0;
      const inputLevel = Math.abs(inputSample);
      
      // Envelope follower
      if (inputLevel > this.envelope) {
        // Attack
        this.envelope += (inputLevel - this.envelope) * this.attack;
      } else {
        // Release
        this.envelope += (inputLevel - this.envelope) * this.release / sampleRate;
      }
      
      // Calculate gain reduction
      let gain = 1.0;
      if (this.envelope > this.threshold) {
        const excess = this.envelope - this.threshold;
        const compressed = excess / this.ratio;
        gain = (this.threshold + compressed) / this.envelope;
      }
      
      // Apply gain
      outputChannel[i] = inputSample * gain;
    }
    
    return true;
  }
}

registerProcessor('compressor-processor', CompressorProcessor);

// Usage
const audioSystem = new AudioProcessor();

document.getElementById('init-audio').addEventListener('click', async () => {
  await audioSystem.initialize();
  audioSystem.connect();
  
  // Enable keyboard
  document.addEventListener('keydown', (e) => {
    const noteMap = {
      'a': 261.63, // C4
      'w': 277.18, // C#4
      's': 293.66, // D4
      'e': 311.13, // D#4
      'd': 329.63, // E4
      'f': 349.23, // F4
      't': 369.99, // F#4
      'g': 392.00, // G4
      'y': 415.30, // G#4
      'h': 440.00, // A4
      'u': 466.16, // A#4
      'j': 493.88  // B4
    };
    
    const frequency = noteMap[e.key];
    if (frequency) {
      audioSystem.playNote(frequency, 0.5);
    }
  });
});
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "Explain the differences between Web Workers, Service Workers, and Worklets, and when you'd use each."**

**Strong Answer:**

"These are three distinct types of background execution contexts in the browser, each designed for specific use cases. Understanding the differences is critical for building performant, resilient web applications.

**1. Web Workers (Dedicated Workers)**

**Purpose:** Offload CPU-intensive computation from the main thread to keep UI responsive.

**Key characteristics:**
- **One-to-one relationship** with the page that creates it
- **Lifetime tied to page:** Terminates when page closes
- **Isolated execution:** Separate V8 context, no DOM access
- **Communication:** postMessage (structured clone or transfer)
- **Overhead:** 10-50ms creation, 1-5ms per message

**When to use:**
✓ Heavy computation (>50ms that would block main thread)
✓ Image/video processing
✓ Large dataset operations (sort, filter, search)
✓ Cryptography (encryption, hashing)
✓ Text processing (search indexing)

Example from my experience:

```javascript
// Main thread
const worker = new Worker('processor.js');

worker.postMessage({
  action: 'process',
  data: largeDataset
});

worker.onmessage = (e) => {
  displayResults(e.data);
};

// processor.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data.data);
  self.postMessage(result);
};
```

At a previous company, we had a spreadsheet application where formula recalculation on 100K cells took 800ms, freezing the UI. Moving calculation to Web Workers kept the main thread free, resulting in smooth scrolling and typing. User satisfaction increased 34%, and paid conversion grew 18%.

**2. Service Workers**

**Purpose:** Act as programmable network proxy for offline functionality, caching, and push notifications.

**Key characteristics:**
- **One-to-many relationship:** One Service Worker controls multiple pages
- **Lifetime independent** of pages: Survives page close, runs in background
- **Network interception:** Intercepts and handles fetch events
- **Cache API access:** Can serve cached responses
- **Requires HTTPS:** Security requirement (except localhost)
- **Lifecycle:** Install → Activate → Fetch → Update

**When to use:**
✓ Offline functionality (PWA requirement)
✓ Cache management (assets, API responses)
✓ Push notifications
✓ Background sync
✓ Performance optimization (cache-first strategies)

Lifecycle and caching strategies:

```javascript
// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('static-v1').then(cache => 
      cache.addAll(['/index.html', '/app.js', '/style.css'])
    )
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.map(key => key !== 'static-v1' && caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  // Cache first strategy for assets
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
```

Real-world impact: We implemented a Service Worker for an e-commerce PWA. Before, offline users saw a "No internet" error with 100% bounce rate. After, they could browse cached product pages, reducing bounce from 70% to 15% on slow 3G. Conversion increased 62%, generating $8.3M additional annual revenue for 3M users.

**The key insight:** Service Workers enable offline-first architecture. Instead of thinking "online vs offline," you think "cached vs network," with Service Worker mediating based on availability and freshness requirements.

**3. Worklets**

**Purpose:** Lightweight workers that run code in specific parts of the rendering pipeline.

**Types:**
- **Paint Worklet:** Custom CSS paint functions (CSS Paint API)
- **Animation Worklet:** Compositor-thread animations (scroll-linked, gesture-driven)
- **Audio Worklet:** Low-latency audio processing
- **Layout Worklet:** Custom layout algorithms (experimental)

**Key characteristics:**
- **Extremely lightweight:** <1ms startup (vs 10-50ms for Web Workers)
- **Rendering pipeline integration:** Runs during paint/animation/audio phases
- **Limited API surface:** Focused on specific task
- **No postMessage overhead:** Direct integration

**Paint Worklet Example:**

```javascript
// register-paint.js
registerPaint('custom-gradient', class {
  static get inputProperties() {
    return ['--start-color', '--end-color'];
  }
  
  paint(ctx, size, properties) {
    const start = properties.get('--start-color').toString();
    const end = properties.get('--end-color').toString();
    
    const gradient = ctx.createLinearGradient(0, 0, size.width, size.height);
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width, size.height);
  }
});

// CSS
.element {
  --start-color: #ff0000;
  --end-color: #0000ff;
  background: paint(custom-gradient);
}
```

**Animation Worklet Example:**

```javascript
// parallax.js
registerAnimator('parallax', class {
  animate(currentTime, effect) {
    effect.localTime = currentTime * 0.5; // Parallax speed
  }
});

// Main thread
CSS.animationWorklet.addModule('parallax.js');

new WorkletAnimation(
  'parallax',
  new KeyframeEffect(element, [
    { transform: 'translateY(0)' },
    { transform: 'translateY(-100px)' }
  ]),
  new ScrollTimeline({ scrollSource: document.scrollingElement })
).play();
```

Advantage: Runs on compositor thread, separate from main thread. Guaranteed 60fps even when JavaScript is busy.

**Audio Worklet Example:**

For a music production web app, we used Audio Worklets for low-latency effects processing. Previously with ScriptProcessorNode (deprecated), latency was 50-100ms (noticeable delay). With Audio Worklet, latency dropped to 5-10ms (imperceptible), running in the audio rendering thread. This enabled professional-grade audio processing in the browser, increasing pro user adoption 67% and paid subscriptions 42%.

**Decision Framework:**

```
Need offline/caching/push? → Service Worker
Need heavy computation? → Web Worker  
Need custom CSS effects? → Paint Worklet
Need smooth scroll animations? → Animation Worklet
Need audio processing? → Audio Worklet
```

**Combining Multiple:**

In a production PWA, we use all three:
- **Service Worker:** Offline functionality, cache API responses
- **Web Workers:** Search indexing on large product catalog
- **Paint Worklet:** Custom animated backgrounds

Architecture:

```
Page (Main Thread)
  ↓
Service Worker (Network layer)
  ↓
Web Worker Pool (Computation)
  ↓
Paint/Animation Worklets (Rendering)
```

**Performance Comparison:**

| Type | Creation | Overhead | Use Case |
|------|----------|----------|----------|
| Web Worker | 10-50ms | Medium | CPU computation |
| Service Worker | 50-200ms | Low (shared) | Network/cache |
| Paint Worklet | <1ms | Negligible | Custom paint |
| Animation Worklet | <1ms | Negligible | Smooth animation |
| Audio Worklet | 5-10ms | Low | Audio processing |

**Common Mistakes to Avoid:**

1. ❌ Using Web Worker for small tasks (<50ms) → overhead not worth it
2. ❌ Thinking Service Workers only for offline → Also cache, push, perf
3. ❌ Trying to access DOM from any worker/worklet → Not allowed
4. ❌ Not handling Service Worker updates → Users stuck on old version
5. ❌ Using ScriptProcessorNode for audio → Deprecated, use Audio Worklet

**The architectural insight:** These aren't competing technologies—they're complementary. **Web Workers keep UI responsive during computation. Service Workers make apps resilient to network conditions. Worklets make rendering pipeline extensible.** Understanding when to use each, and how to combine them, is fundamental to building modern, performant web applications that feel native-quality.

At scale, proper use of these technologies compounds benefits: Offline PWA with Service Worker reduces server load. Web Workers enable client-side processing, reducing backend costs. Worklets provide smooth UX without performance penalties. Combined, they enable web apps that rival native apps in performance, resilience, and capabilities—while maintaining web's unique advantages of instant deployment and universal access."

### Likely Follow-Up Questions

1. **"How do you handle Service Worker updates without breaking the user experience?"**

**Answer:**
```javascript
// Service Worker update strategy

// sw.js - New version
const VERSION = 'v2.0.0';
const CACHE_NAME = `app-cache-${VERSION}`;

self.addEventListener('install', (event) => {
  console.log(`Installing Service Worker ${VERSION}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => {
        // Skip waiting to activate immediately
        // BE CAREFUL: Only if backward compatible
        // return self.skipWaiting();
        
        // Or let user control update:
        console.log('New version ready, waiting for activation');
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`Activating Service Worker ${VERSION}`);
  
  event.waitUntil(
    // Clean up old caches
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      // return self.clients.claim();
      
      // Or notify clients of update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: VERSION
          });
        });
      });
    })
  );
});

// Main application update handling

class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
  }
  
  async register() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return;
    }
    
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration.scope);
      
      // Check for updates periodically
      setInterval(() => {
        this.registration.update();
      }, 60 * 60 * 1000); // Every hour
      
      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdate();
      });
      
      // Listen for messages from Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });
      
      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.updateAvailable) {
          // Reload to use new Service Worker
          window.location.reload();
        }
      });
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
  
  handleUpdate() {
    const newWorker = this.registration.installing;
    
    console.log('New Service Worker detected');
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New version available
          console.log('New version available');
          this.updateAvailable = true;
          this.showUpdateNotification();
        } else {
          // First install
          console.log('Service Worker installed for the first time');
        }
      }
    });
  }
  
  showUpdateNotification() {
    // Strategy 1: Gentle notification (recommended)
    const notification = this.createNotification({
      message: 'A new version is available!',
      actions: [
        {
          text: 'Update Now',
          action: () => this.applyUpdate()
        },
        {
          text: 'Later',
          action: () => notification.dismiss()
        }
      ]
    });
    
    // Strategy 2: Auto-update on next page load
    // (Less disruptive, but users may not see update for a while)
    sessionStorage.setItem('pendingUpdate', 'true');
    
    // Strategy 3: Force update immediately
    // (Most disruptive, only for critical fixes)
    // this.applyUpdate();
  }
  
  applyUpdate() {
    const newWorker = this.registration.waiting;
    
    if (!newWorker) {
      console.log('No waiting Service Worker');
      return;
    }
    
    // Tell Service Worker to skip waiting
    newWorker.postMessage({ type: 'SKIP_WAITING' });
    
    // Show loading state
    this.showLoading('Updating application...');
  }
  
  handleMessage(data) {
    switch (data.type) {
      case 'SW_ACTIVATED':
        console.log('Service Worker activated, version:', data.version);
        break;
        
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data.urls);
        break;
    }
  }
  
  createNotification(options) {
    const div = document.createElement('div');
    div.className = 'update-notification';
    div.innerHTML = `
      <div class="notification-content">
        <p>${options.message}</p>
        <div class="notification-actions">
          ${options.actions.map(action => `
            <button class="notification-action">${action.text}</button>
          `).join('')}
        </div>
      </div>
    `;
    
    div.querySelectorAll('.notification-action').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        options.actions[i].action();
        div.remove();
      });
    });
    
    document.body.appendChild(div);
    
    return {
      dismiss: () => div.remove()
    };
  }
  
  showLoading(message) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <p>${message}</p>
    `;
    document.body.appendChild(overlay);
  }
}

// Service Worker side: Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Initialize
const swManager = new ServiceWorkerManager();
swManager.register();

// Best practices for updates:

// 1. Version strategically
//    - Major version: Breaking changes, require user action
//    - Minor version: New features, gentle notification
//    - Patch version: Bug fixes, can auto-update

// 2. Test thoroughly
//    - Old version → New version transition
//    - Cache compatibility
//    - Data migration if needed

// 3. Monitor update success rate
//    - Track how many users update
//    - Identify stuck users
//    - Provide manual update option

// 4. Graceful degradation
//    - Ensure old and new versions can coexist briefly
//    - Don't break old version with server changes

// 5. Communicate changes
//    - Show changelog after update
//    - Highlight new features
//    - Explain why update was needed

// Example: Critical security fix
if (CRITICAL_SECURITY_UPDATE) {
  self.addEventListener('install', () => {
    self.skipWaiting(); // Activate immediately
  });
  
  self.addEventListener('activate', () => {
    self.clients.claim(); // Take control
    
    // Notify all clients to reload
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'FORCE_RELOAD',
          reason: 'Critical security update'
        });
      });
    });
  });
}

// Real-world metrics from update strategy:

// Before (no update notification):
// - Users on old version: 45% after 1 week
// - Users on old version: 15% after 1 month

// After (gentle notification):
// - Users on old version: 8% after 1 week
// - Users on old version: 2% after 1 month

// Improvement: 5× faster adoption
```

2. **"How do you debug Web Workers when they run in a separate context?"**

**Answer:**
```javascript
// Debugging strategies for Web Workers

// Strategy 1: Chrome DevTools Integration

// Workers appear in Sources panel under "Threads"
// Can set breakpoints, inspect variables, step through code
// console.log() in worker appears in main console

// worker.js
self.addEventListener('message', (e) => {
  debugger; // Breakpoint works!
  
  console.log('Worker received:', e.data);
  
  const result = processData(e.data);
  
  console.log('Worker sending:', result);
  
  self.postMessage(result);
});

// Strategy 2: Structured Error Handling

class WorkerWithLogging {
  constructor(script) {
    this.worker = new Worker(script);
    this.worker.onerror = this.handleError.bind(this);
    this.worker.onmessage = this.handleMessage.bind(this);
    
    // Enable remote logging
    this.setupRemoteLogging();
  }
  
  handleError(error) {
    const errorInfo = {
      message: error.message,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
      timestamp: Date.now()
    };
    
    console.error('Worker error:', errorInfo);
    
    // Send to error tracking service
    this.logToService('error', errorInfo);
  }
  
  handleMessage(e) {
    if (e.data.type === 'LOG') {
      // Worker sent log message
      console.log(`[Worker ${e.data.level}]`, e.data.message, e.data.data);
      
      // Forward to monitoring
      this.logToService(e.data.level, {
        message: e.data.message,
        data: e.data.data,
        timestamp: e.data.timestamp
      });
    }
  }
  
  setupRemoteLogging() {
    // Inject logging wrapper into worker
    this.worker.postMessage({
      type: 'SETUP_LOGGING',
      config: {
        level: 'debug',
        remote: true
      }
    });
  }
  
  logToService(level, data) {
    // Send to monitoring service (e.g., Sentry, Datadog)
    if (window.errorTracker) {
      window.errorTracker.log(level, 'worker', data);
    }
  }
}

// Worker side: Logging infrastructure
// worker-logger.js

class WorkerLogger {
  constructor() {
    this.config = { level: 'info', remote: false };
  }
  
  setup(config) {
    this.config = { ...this.config, ...config };
  }
  
  log(level, message, data) {
    // Console log
    console[level](message, data);
    
    // Send to main thread if remote logging enabled
    if (this.config.remote) {
      self.postMessage({
        type: 'LOG',
        level,
        message,
        data,
        timestamp: Date.now()
      });
    }
  }
  
  debug(message, data) { this.log('debug', message, data); }
  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
}

const logger = new WorkerLogger();

self.addEventListener('message', (e) => {
  if (e.data.type === 'SETUP_LOGGING') {
    logger.setup(e.data.config);
    return;
  }
  
  // Use logger
  logger.info('Processing data', { size: e.data.length });
  
  try {
    const result = processData(e.data);
    logger.info('Processing complete', { resultSize: result.length });
    self.postMessage(result);
  } catch (error) {
    logger.error('Processing failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});

// Strategy 3: Performance Profiling

class WorkerProfiler {
  constructor(worker) {
    this.worker = worker;
    this.metrics = {
      messages: 0,
      totalTime: 0,
      errors: 0
    };
    
    this.intercept();
  }
  
  intercept() {
    const originalPostMessage = this.worker.postMessage.bind(this.worker);
    const startTimes = new Map();
    
    this.worker.postMessage = (data, transfer) => {
      const messageId = Math.random().toString(36);
      startTimes.set(messageId, performance.now());
      
      this.metrics.messages++;
      
      // Inject message ID
      originalPostMessage({
        ...data,
        __messageId: messageId
      }, transfer);
    };
    
    this.worker.onmessage = (e) => {
      const messageId = e.data.__messageId;
      
      if (messageId && startTimes.has(messageId)) {
        const duration = performance.now() - startTimes.get(messageId);
        this.metrics.totalTime += duration;
        
        console.log(`Worker message ${messageId} took ${duration.toFixed(2)}ms`);
        
        startTimes.delete(messageId);
      }
      
      // Call original handler
      if (this.originalOnMessage) {
        this.originalOnMessage(e);
      }
    };
  }
  
  getStats() {
    return {
      ...this.metrics,
      avgTime: this.metrics.messages > 0 
        ? (this.metrics.totalTime / this.metrics.messages).toFixed(2) + 'ms'
        : 'N/A'
    };
  }
}

// Usage
const worker = new Worker('processor.js');
const profiler = new WorkerProfiler(worker);

// After some operations
console.table(profiler.getStats());
// {
//   messages: 100,
//   totalTime: 5234.56,
//   errors: 2,
//   avgTime: '52.35ms'
// }

// Strategy 4: Worker State Inspector

class WorkerInspector {
  constructor(worker) {
    this.worker = worker;
    this.state = {};
    
    this.setupInspection();
  }
  
  setupInspection() {
    // Request state snapshots periodically
    setInterval(() => {
      this.worker.postMessage({ type: 'GET_STATE' });
    }, 5000);
    
    // Handle state responses
    this.worker.addEventListener('message', (e) => {
      if (e.data.type === 'STATE_SNAPSHOT') {
        this.state = e.data.state;
        console.log('Worker state:', this.state);
      }
    });
  }
  
  getState() {
    return this.state;
  }
  
  visualize() {
    // Display in UI
    const inspector = document.getElementById('worker-inspector');
    inspector.innerHTML = `
      <h3>Worker State</h3>
      <pre>${JSON.stringify(this.state, null, 2)}</pre>
    `;
  }
}

// Worker side: State reporting
let workerState = {
  tasksProcessed: 0,
  lastTaskTime: null,
  errors: [],
  queue: []
};

self.addEventListener('message', (e) => {
  if (e.data.type === 'GET_STATE') {
    self.postMessage({
      type: 'STATE_SNAPSHOT',
      state: workerState
    });
    return;
  }
  
  // Update state during processing
  workerState.tasksProcessed++;
  workerState.lastTaskTime = Date.now();
});

// Strategy 5: Automated Testing

describe('Worker Tests', () => {
  let worker;
  
  beforeEach(() => {
    worker = new Worker('processor.js');
  });
  
  afterEach(() => {
    worker.terminate();
  });
  
  it('should process data correctly', async () => {
    const result = await new Promise((resolve) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.postMessage({ action: 'process', data: [1, 2, 3] });
    });
    
    expect(result).toEqual({ sum: 6 });
  });
  
  it('should handle errors gracefully', async () => {
    const error = await new Promise((resolve) => {
      worker.onerror = (e) => resolve(e);
      worker.postMessage({ action: 'invalid' });
    });
    
    expect(error.message).toContain('Unknown action');
  });
  
  it('should complete within performance budget', async () => {
    const start = performance.now();
    
    await new Promise((resolve) => {
      worker.onmessage = () => resolve();
      worker.postMessage({ action: 'heavy', data: largeDataset });
    });
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000); // 1 second budget
  });
});

// Real-world debugging scenario:

// Problem: Worker occasionally hangs, no error thrown
// Solution: Add heartbeat monitoring

// worker.js
setInterval(() => {
  self.postMessage({ type: 'HEARTBEAT' });
}, 1000);

// main.js
const heartbeatMonitor = {
  lastHeartbeat: Date.now(),
  missedHeartbeats: 0,
  
  onHeartbeat() {
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;
  },
  
  check() {
    const now = Date.now();
    if (now - this.lastHeartbeat > 5000) {
      this.missedHeartbeats++;
      console.warn('Worker missed heartbeat', this.missedHeartbeats);
      
      if (this.missedHeartbeats > 3) {
        console.error('Worker appears dead, restarting');
        this.restartWorker();
      }
    }
  }
};

worker.onmessage = (e) => {
  if (e.data.type === 'HEARTBEAT') {
    heartbeatMonitor.onHeartbeat();
  }
};

setInterval(() => heartbeatMonitor.check(), 2000);
```

3. **"What are the security implications of Service Workers?"**

**Answer:**
```javascript
// Security Considerations for Service Workers

// 1. HTTPS REQUIREMENT

// Service Workers ONLY work over HTTPS (except localhost)
// Reason: Can intercept ALL network requests
// If attacker injects malicious SW over HTTP → Complete compromise

// Exception: localhost for development
if (location.protocol === 'http:' && location.hostname !== 'localhost') {
  console.error('Service Workers require HTTPS');
  // Cannot register
}

// 2. SAME-ORIGIN POLICY

// Service Worker scoped to origin
// Cannot intercept requests to different origin
// Cannot access different origin's cache

// Example:
// https://example.com/sw.js
// Scope: https://example.com/*
// Cannot intercept: https://other-domain.com/*

// Scope restriction:
navigator.serviceWorker.register('/sw.js', {
  scope: '/app/' // Only controls /app/* URLs
});

// DANGER: Registering at root scope
// Controls entire origin - be careful!
navigator.serviceWorker.register('/sw.js'); // Scope: /*

// 3. CODE INJECTION PREVENTION

// BAD: Never trust user input in Service Worker
self.addEventListener('fetch', (event) => {
  // ❌ DANGEROUS: Eval user input
  const code = new URL(event.request.url).searchParams.get('code');
  eval(code); // NEVER DO THIS!
  
  // ❌ DANGEROUS: Execute arbitrary script
  const script = new URL(event.request.url).searchParams.get('script');
  importScripts(script); // Can load malicious code
});

// GOOD: Validate and sanitize all inputs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Whitelist approach
  const allowedOrigins = ['https://api.example.com', 'https://cdn.example.com'];
  
  if (!allowedOrigins.includes(url.origin)) {
    // Block cross-origin requests not in whitelist
    event.respondWith(new Response('Blocked', { status: 403 }));
    return;
  }
  
  // Proceed with request
  event.respondWith(fetch(event.request));
});

// 4. XSS PROTECTION

// Service Worker can inject content into responses
// Must sanitize to prevent XSS

// BAD: Injecting unsanitized content
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/profile')) {
    const userName = getUserName(); // From cache/IndexedDB
    
    // ❌ DANGEROUS: Direct string concatenation
    const html = `<h1>Welcome, ${userName}!</h1>`;
    
    event.respondWith(new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    }));
  }
});

// If userName = "<script>alert('XSS')</script>"
// Result: XSS vulnerability!

// GOOD: Sanitize all dynamic content
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/profile')) {
    const userName = escapeHtml(getUserName());
    const html = `<h1>Welcome, ${userName}!</h1>`;
    
    event.respondWith(new Response(html, {
      headers: { 
        'Content-Type': 'text/html',
        'Content-Security-Policy': "default-src 'self'" // Additional protection
      }
    }));
  }
});

// 5. CACHE POISONING

// Attacker could trick SW to cache malicious content

// BAD: Cache everything without validation
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        
        return fetch(event.request).then(response => {
          // ❌ DANGEROUS: Cache any response
          const cache = caches.open('dynamic');
          cache.put(event.request, response.clone());
          return response;
        });
      })
  );
});

// Scenario: Attacker sends request to https://example.com/api/data
// but DNS poisoned, returns malicious content
// SW caches it → All future requests serve malicious content

// GOOD: Validate responses before caching
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        
        return fetch(event.request).then(response => {
          // Validate response before caching
          if (!response.ok || response.status !== 200 || response.type !== 'basic') {
            console.warn('Suspicious response, not caching');
            return response;
          }
          
          // Additional validation
          const contentType = response.headers.get('Content-Type');
          if (!isExpectedContentType(contentType, event.request.url)) {
            console.warn('Unexpected content type, not caching');
            return response;
          }
          
          // Safe to cache
          const cache = caches.open('dynamic');
          cache.put(event.request, response.clone());
          return response;
        });
      })
  );
});

function isExpectedContentType(contentType, url) {
  if (url.endsWith('.js')) return contentType.includes('javascript');
  if (url.endsWith('.css')) return contentType.includes('css');
  if (url.endsWith('.json')) return contentType.includes('json');
  return true;
}

// 6. PERMISSIONS AND CAPABILITIES

// Service Workers have powerful capabilities
// Request permissions appropriately

// Push notifications
self.addEventListener('push', (event) => {
  // Only show if user granted permission
  if (Notification.permission !== 'granted') {
    return;
  }
  
  const data = event.data.json();
  
  // Validate notification data
  if (!isValidNotification(data)) {
    console.error('Invalid notification data');
    return;
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, data.options)
  );
});

function isValidNotification(data) {
  // Validate notification comes from trusted source
  // Check signature, origin, etc.
  return data && data.title && data.signature === EXPECTED_SIGNATURE;
}

// 7. UNREGISTRATION

// Malicious SW should be removable

// Unregister Service Worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.unregister();
  });
});

// Clear all caches
caches.keys().then(cacheNames => {
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
});

// 8. MONITORING AND AUDITING

// Log all SW activities for security audit

class ServiceWorkerSecurityMonitor {
  constructor() {
    this.events = [];
  }
  
  logEvent(type, details) {
    const event = {
      type,
      details,
      timestamp: Date.now(),
      url: location.href
    };
    
    this.events.push(event);
    
    // Send to security logging service
    this.sendToSecurityLog(event);
  }
  
  sendToSecurityLog(event) {
    // Send to backend for analysis
    fetch('/api/security-log', {
      method: 'POST',
      body: JSON.stringify(event),
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  getEvents() {
    return this.events;
  }
}

const securityMonitor = new ServiceWorkerSecurityMonitor();

// Monitor SW registration
navigator.serviceWorker.register('/sw.js').then(registration => {
  securityMonitor.logEvent('SW_REGISTERED', {
    scope: registration.scope
  });
});

// Monitor SW updates
navigator.serviceWorker.addEventListener('updatefound', () => {
  securityMonitor.logEvent('SW_UPDATE_FOUND', {
    timestamp: Date.now()
  });
});

// In Service Worker: Log all fetch interceptions
self.addEventListener('fetch', (event) => {
  // Log request details
  const logData = {
    url: event.request.url,
    method: event.request.method,
    mode: event.request.mode,
    cached: false
  };
  
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        logData.cached = true;
        logSecurityEvent('FETCH_CACHED', logData);
        return cached;
      }
      
      return fetch(event.request).then(response => {
        logSecurityEvent('FETCH_NETWORK', logData);
        return response;
      });
    })
  );
});

function logSecurityEvent(type, data) {
  // Send to main thread for logging
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'SECURITY_LOG',
        event: type,
        data
      });
    });
  });
}

// 9. CONTENT SECURITY POLICY

// Set restrictive CSP in Service Worker responses

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then(response => {
      // Add security headers
      const headers = new Headers(response.headers);
      
      headers.set('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.example.com;"
      );
      
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      headers.set('X-XSS-Protection', '1; mode=block');
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
    })
  );
});

// 10. REGULAR SECURITY AUDITS

// Checklist for Service Worker security:

// ✓ HTTPS enforced (except localhost)
// ✓ Minimal scope (not root unless necessary)
// ✓ Input validation and sanitization
// ✓ Response validation before caching
// ✓ Content-Type verification
// ✓ CSP headers set
// ✓ No eval() or importScripts() with user input
// ✓ Permissions requested appropriately
// ✓ Logging and monitoring in place
// ✓ Regular security reviews
// ✓ Incident response plan

// Real-world security incident:

// Problem: Third-party script compromised
// Impact: Injected malicious Service Worker
// Solution:
// 1. Subresource Integrity (SRI) for all scripts
// 2. Regular audit of third-party dependencies
// 3. Content Security Policy blocking unauthorized SW registration
// 4. Monitoring for unexpected SW registrations

// Prevention:
<script src="https://cdn.example.com/script.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>

// Monitor unauthorized registrations:
const observer = new MutationObserver(() => {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      if (!isAuthorizedScope(registration.scope)) {
        console.error('Unauthorized Service Worker detected!');
        registration.unregister();
        alertSecurityTeam();
      }
    });
  });
});

function isAuthorizedScope(scope) {
  const authorizedScopes = ['/app/', '/'];
  return authorizedScopes.some(s => scope.includes(s));
}
```

4. **"How do you measure the performance impact of Web Workers?"**

**Answer:**
```javascript
// Comprehensive performance measurement for Web Workers

class WorkerPerformanceMonitor {
  constructor() {
    this.metrics = {
      workerCreation: [],
      messageLatency: [],
      processingTime: [],
      memoryUsage: [],
      taskThroughput: []
    };
    
    this.startTime = performance.now();
  }
  
  // Measure worker creation time
  async measureWorkerCreation(workerScript, iterations = 10) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      const worker = new Worker(workerScript);
      
      // Wait for worker to be ready
      await new Promise(resolve => {
        worker.onmessage = () => resolve();
        worker.postMessage({ type: 'PING' });
      });
      
      const duration = performance.now() - start;
      times.push(duration);
      
      worker.terminate();
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    this.metrics.workerCreation = { avg, min, max, times };
    
    return { avg, min, max };
  }
  
  // Measure message passing latency
  async measureMessageLatency(worker, iterations = 100) {
    const latencies = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      await new Promise(resolve => {
        worker.onmessage = () => {
          const latency = performance.now() - start;
          latencies.push(latency);
          resolve();
        };
        
        worker.postMessage({ type: 'ECHO', data: 'test' });
      });
    }
    
    const avg = latencies.reduce((a, b) => a + b) / latencies.length;
    const p50 = percentile(latencies, 50);
    const p95 = percentile(latencies, 95);
    const p99 = percentile(latencies, 99);
    
    this.metrics.messageLatency = { avg, p50, p95, p99, latencies };
    
    return { avg, p50, p95, p99 };
  }
  
  // Measure task processing time
  async measureProcessingTime(worker, task, iterations = 50) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      await new Promise(resolve => {
        worker.onmessage = () => {
          const duration = performance.now() - start;
          times.push(duration);
          resolve();
        };
        
        worker.postMessage(task);
      });
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length;
    const median = percentile(times, 50);
    
    this.metrics.processingTime = { avg, median, times };
    
    return { avg, median };
  }
  
  // Compare with main thread processing
  async compareWithMainThread(worker, task, iterations = 20) {
    // Measure worker performance
    const workerTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await new Promise(resolve => {
        worker.onmessage = () => {
          workerTimes.push(performance.now() - start);
          resolve();
        };
        worker.postMessage(task);
      });
    }
    
    // Measure main thread performance
    const mainThreadTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      processTask(task); // Synchronous processing
      mainThreadTimes.push(performance.now() - start);
    }
    
    const workerAvg = workerTimes.reduce((a, b) => a + b) / workerTimes.length;
    const mainThreadAvg = mainThreadTimes.reduce((a, b) => a + b) / mainThreadTimes.length;
    
    const speedup = mainThreadAvg / workerAvg;
    
    return {
      workerAvg,
      mainThreadAvg,
      speedup,
      recommendation: speedup > 1.2 
        ? 'Use worker (faster)' 
        : 'Use main thread (overhead not worth it)'
    };
  }
  
  // Measure memory usage
  async measureMemoryUsage(worker) {
    if (!performance.memory) {
      return { error: 'performance.memory not available' };
    }
    
    const baseline = performance.memory.usedJSHeapSize;
    
    // Create workers
    const workers = Array(10).fill(null).map(() => new Worker('worker.js'));
    
    // Wait for GC to settle
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const withWorkers = performance.memory.usedJSHeapSize;
    const perWorker = (withWorkers - baseline) / 10;
    
    // Cleanup
    workers.forEach(w => w.terminate());
    
    this.metrics.memoryUsage = {
      baseline: formatBytes(baseline),
      withWorkers: formatBytes(withWorkers),
      perWorker: formatBytes(perWorker)
    };
    
    return {
      baseline,
      withWorkers,
      perWorker: perWorker / (1024 * 1024) // MB
    };
  }
  
  // Measure throughput
  async measureThroughput(worker, taskGenerator, duration = 10000) {
    let tasksCompleted = 0;
    const startTime = performance.now();
    
    const processNext = () => {
      return new Promise(resolve => {
        worker.onmessage = () => {
          tasksCompleted++;
          resolve();
        };
        worker.postMessage(taskGenerator());
      });
    };
    
    // Process tasks continuously
    while (performance.now() - startTime < duration) {
      await processNext();
    }
    
    const actualDuration = performance.now() - startTime;
    const throughput = (tasksCompleted / actualDuration) * 1000; // tasks/second
    
    this.metrics.taskThroughput = {
      tasksCompleted,
      duration: actualDuration,
      throughput
    };
    
    return { tasksCompleted, throughput };
  }
  
  // Real-time monitoring
  startMonitoring(worker) {
    const monitor = {
      taskCount: 0,
      errorCount: 0,
      startTime: performance.now(),
      responseTimes: []
    };
    
    // Intercept messages
    const originalPostMessage = worker.postMessage.bind(worker);
    const pendingTasks = new Map();
    
    worker.postMessage = function(data, transfer) {
      const taskId = Math.random().toString(36);
      pendingTasks.set(taskId, {
        start: performance.now(),
        data
      });
      
      originalPostMessage({
        ...data,
        __monitorId: taskId
      }, transfer);
      
      monitor.taskCount++;
    };
    
    worker.onmessage = (e) => {
      const monitorId = e.data.__monitorId;
      
      if (monitorId && pendingTasks.has(monitorId)) {
        const task = pendingTasks.get(monitorId);
        const responseTime = performance.now() - task.start;
        
        monitor.responseTimes.push(responseTime);
        pendingTasks.delete(monitorId);
      }
    };
    
    worker.onerror = () => {
      monitor.errorCount++;
    };
    
    // Report stats periodically
    setInterval(() => {
      const stats = this.getMonitorStats(monitor);
      console.log('Worker Stats:', stats);
    }, 5000);
    
    return monitor;
  }
  
  getMonitorStats(monitor) {
    const uptime = performance.now() - monitor.startTime;
    const avgResponseTime = monitor.responseTimes.length > 0
      ? monitor.responseTimes.reduce((a, b) => a + b) / monitor.responseTimes.length
      : 0;
    
    return {
      uptime: (uptime / 1000).toFixed(2) + 's',
      tasksCompleted: monitor.taskCount,
      errors: monitor.errorCount,
      throughput: ((monitor.taskCount / uptime) * 1000).toFixed(2) + ' tasks/s',
      avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
      errorRate: ((monitor.errorCount / monitor.taskCount) * 100).toFixed(2) + '%'
    };
  }
  
  // Generate comprehensive report
  generateReport() {
    return {
      summary: {
        testDuration: ((performance.now() - this.startTime) / 1000).toFixed(2) + 's',
        timestamp: new Date().toISOString()
      },
      workerCreation: this.metrics.workerCreation,
      messageLatency: this.metrics.messageLatency,
      processingTime: this.metrics.processingTime,
      memoryUsage: this.metrics.memoryUsage,
      throughput: this.metrics.taskThroughput,
      recommendations: this.generateRecommendations()
    };
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    // Worker creation
    if (this.metrics.workerCreation.avg > 50) {
      recommendations.push({
        metric: 'Worker Creation',
        issue: `High creation time (${this.metrics.workerCreation.avg.toFixed(2)}ms)`,
        suggestion: 'Consider worker pool to reuse workers'
      });
    }
    
    // Message latency
    if (this.metrics.messageLatency.p95 > 10) {
      recommendations.push({
        metric: 'Message Latency',
        issue: `High P95 latency (${this.metrics.messageLatency.p95.toFixed(2)}ms)`,
        suggestion: 'Use Transferable objects for large data'
      });
    }
    
    // Memory usage
    if (this.metrics.memoryUsage.perWorker > 50 * 1024 * 1024) {
      recommendations.push({
        metric: 'Memory Usage',
        issue: `High memory per worker (${(this.metrics.memoryUsage.perWorker / (1024*1024)).toFixed(2)}MB)`,
        suggestion: 'Optimize worker code, limit concurrent workers'
      });
    }
    
    return recommendations;
  }
}

// Helper functions
function percentile(arr, p) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Usage
const monitor = new WorkerPerformanceMonitor();

async function runPerformanceTest() {
  const worker = new Worker('processor.js');
  
  // 1. Worker creation
  console.log('Testing worker creation...');
  const creation = await monitor.measureWorkerCreation('processor.js');
  console.log('Creation time:', creation);
  
  // 2. Message latency
  console.log('Testing message latency...');
  const latency = await monitor.measureMessageLatency(worker);
  console.log('Message latency:', latency);
  
  // 3. Processing time
  console.log('Testing processing time...');
  const processing = await monitor.measureProcessingTime(worker, {
    action: 'process',
    data: generateTestData()
  });
  console.log('Processing time:', processing);
  
  // 4. Compare with main thread
  console.log('Comparing with main thread...');
  const comparison = await monitor.compareWithMainThread(worker, {
    action: 'process',
    data: generateTestData()
  });
  console.log('Comparison:', comparison);
  
  // 5. Memory usage
  console.log('Testing memory usage...');
  const memory = await monitor.measureMemoryUsage(worker);
  console.log('Memory usage:', memory);
  
  // 6. Throughput
  console.log('Testing throughput...');
  const throughput = await monitor.measureThroughput(worker, generateTestData, 5000);
  console.log('Throughput:', throughput);
  
  // Generate report
  const report = monitor.generateReport();
  console.log('Full Report:', report);
  
  // Cleanup
  worker.terminate();
}

// Real-world metrics from production:

// Image processing worker (10MP images):
// - Worker creation: 35ms
// - Message latency: 2ms
// - Processing time: 2500ms (main thread: 2500ms + UI blocking)
// - Memory per worker: 45MB
// - Throughput: 24 images/minute (single worker)

// Decision: Use worker
// Reason: Even though processing time same, UI stays responsive
// Business impact: 0% abandonment vs 40% with main thread blocking

// Search indexing worker (100K documents):
// - Worker creation: 42ms
// - Message latency: 5ms (large data transfer)
// - Processing time: 8000ms (main thread: 8200ms)
// - Memory per worker: 120MB
// - Throughput: 7.5 indexes/minute

// Optimization: Use transferable objects
// After optimization:
// - Message latency: <1ms (transfer instead of clone)
// - Processing time: 8000ms (same)
// - Total time: 8000ms vs 8200ms (200ms saved per index)

// At 1000 indexes/day: 3.3 hours saved
```

5. **"How do Worklets differ from Web Workers in terms of capabilities and performance?"**

**Answer:**
```javascript
// Comprehensive comparison: Worklets vs Web Workers

// ═══════════════════════════════════════════════════════════════
// FUNDAMENTAL DIFFERENCES
// ═══════════════════════════════════════════════════════════════

// Web Worker: General-purpose computation
// - Separate thread (dedicated V8 isolate)
// - Full JavaScript environment
// - postMessage communication (async)
// - Heavy (10-50ms creation, 10-50MB memory)

// Worklet: Rendering pipeline integration
// - Runs in rendering pipeline (paint/animation/audio thread)
// - Limited JavaScript (specific APIs only)
// - Direct integration (no postMessage)
// - Lightweight (<1ms creation, <1MB memory)

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE COMPARISON
// ═══════════════════════════════════════════════════════════════

class WorkletVsWorkerBenchmark {
  async compareCreation() {
    // Web Worker creation
    const workerStart = performance.now();
    const worker = new Worker('worker.js');
    await new Promise(resolve => {
      worker.onmessage = () => resolve();
      worker.postMessage('ping');
    });
    const workerTime = performance.now() - workerStart;
    
    // Paint Worklet creation
    const workletStart = performance.now();
    await CSS.paintWorklet.addModule('paint-worklet.js');
    const workletTime = performance.now() - workletStart;
    
    console.log('Creation Time:');
    console.log('  Worker:', workerTime.toFixed(2), 'ms');
    console.log('  Worklet:', workletTime.toFixed(2), 'ms');
    console.log('  Speedup:', (workerTime / workletTime).toFixed(1), 'x');
    
    // Typical results:
    // Worker: 35ms
    // Worklet: 0.8ms
    // Speedup: 44x faster
    
    worker.terminate();
  }
  
  async compareLatency() {
    // Web Worker latency (message passing)
    const worker = new Worker('worker.js');
    const workerLatencies = [];
    
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await new Promise(resolve => {
        worker.onmessage = () => {
          workerLatencies.push(performance.now() - start);
          resolve();
        };
        worker.postMessage({ data: 'test' });
      });
    }
    
    const workerAvg = workerLatencies.reduce((a, b) => a + b) / workerLatencies.length;
    
    // Paint Worklet latency (direct integration)
    // Measure paint time with worklet
    await CSS.paintWorklet.addModule('simple-paint.js');
    
    const element = document.createElement('div');
    element.style.width = '100px';
    element.style.height = '100px';
    element.style.background = 'paint(simple-pattern)';
    document.body.appendChild(element);
    
    // Force paint
    const workletLatencies = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      element.style.setProperty('--param', Math.random());
      // Force synchronous layout
      element.offsetHeight;
      workletLatencies.push(performance.now() - start);
    }
    
    const workletAvg = workletLatencies.reduce((a, b) => a + b) / workletLatencies.length;
    
    console.log('Latency (communication overhead):');
    console.log('  Worker:', workerAvg.toFixed(2), 'ms');
    console.log('  Worklet:', workletAvg.toFixed(2), 'ms');
    console.log('  Difference:', (workerAvg - workletAvg).toFixed(2), 'ms');
    
    // Typical results:
    // Worker: 2.5ms (postMessage overhead)
    // Worklet: 0.3ms (direct call)
    // Difference: 2.2ms saved per operation
    
    worker.terminate();
    element.remove();
  }
  
  async compareMemory() {
    if (!performance.memory) {
      console.log('performance.memory not available');
      return;
    }
    
    const baseline = performance.memory.usedJSHeapSize;
    
    // Create 10 Workers
    const workers = Array(10).fill(null).map(() => new Worker('worker.js'));
    await new Promise(resolve => setTimeout(resolve, 1000));
    const withWorkers = performance.memory.usedJSHeapSize;
    
    // Create 10 Worklets (reuse same module)
    await CSS.paintWorklet.addModule('paint-worklet.js');
    const elements = Array(10).fill(null).map(() => {
      const el = document.createElement('div');
      el.style.width = '100px';
      el.style.height = '100px';
      el.style.background = 'paint(pattern)';
      document.body.appendChild(el);
      return el;
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const withWorklets = performance.memory.usedJSHeapSize;
    
    const workerMemory = (withWorkers - baseline) / 10;
    const workletMemory = (withWorklets - withWorkers) / 10;
    
    console.log('Memory Usage (per instance):');
    console.log('  Worker:', (workerMemory / (1024 * 1024)).toFixed(2), 'MB');
    console.log('  Worklet:', (workletMemory / (1024 * 1024)).toFixed(2), 'MB');
    console.log('  Ratio:', (workerMemory / workletMemory).toFixed(1), 'x');
    
    // Typical results:
    // Worker: 35 MB per instance
    // Worklet: 0.5 MB per instance (shared module)
    // Ratio: 70x more memory efficient
    
    workers.forEach(w => w.terminate());
    elements.forEach(el => el.remove());
  }
}

// ═══════════════════════════════════════════════════════════════
// CAPABILITY COMPARISON
// ═══════════════════════════════════════════════════════════════

const capabilityMatrix = {
  'Feature': ['Web Worker', 'Paint Worklet', 'Animation Worklet', 'Audio Worklet'],
  
  // JavaScript Environment
  'Full JavaScript': ['✓', '✗ (limited)', '✗ (limited)', '✗ (limited)'],
  'ES6 modules': ['✓', '✓', '✓', '✓'],
  'importScripts': ['✓', '✗', '✗', '✗'],
  'fetch API': ['✓', '✗', '✗', '✗'],
  'setTimeout/setInterval': ['✓', '✗', '✗', '✗'],
  
  // DOM Access
  'DOM manipulation': ['✗', '✗', '✗', '✗'],
  'window object': ['✗', '✗', '✗', '✗'],
  'document object': ['✗', '✗', '✗', '✗'],
  
  // Storage
  'localStorage': ['✗', '✗', '✗', '✗'],
  'sessionStorage': ['✗', '✗', '✗', '✗'],
  'IndexedDB': ['✓', '✗', '✗', '✗'],
  'Cache API': ['✓', '✗', '✗', '✗'],
  
  // Communication
  'postMessage': ['✓', '✗', '✗', '✓ (limited)'],
  'MessagePort': ['✓', '✗', '✗', '✓'],
  'Direct callbacks': ['✗', '✓', '✓', '✓'],
  
  // Specialized APIs
  'Canvas 2D': ['✗', '✓ (limited)', '✗', '✗'],
  'Animation timing': ['✗', '✗', '✓', '✗'],
  'Audio processing': ['✗', '✗', '✗', '✓'],
  
  // Performance
  'Creation time': ['10-50ms', '<1ms', '<1ms', '5-10ms'],
  'Memory per instance': ['10-50MB', '<1MB', '<1MB', '5-10MB'],
  'Communication latency': ['1-5ms', 'none', 'none', 'low'],
  
  // Use Cases
  'Primary use case': [
    'CPU computation',
    'Custom CSS paint',
    'Smooth animations',
    'Audio effects'
  ]
};

// ═══════════════════════════════════════════════════════════════
// WHEN TO USE EACH
// ═══════════════════════════════════════════════════════════════

class TechnologySelector {
  static chooseFor(useCase) {
    const matrix = {
      // Heavy computation
      'Image processing': 'Web Worker',
      'Video processing': 'Web Worker',
      'Large dataset operations': 'Web Worker',
      'Cryptography': 'Web Worker',
      'JSON parsing (large)': 'Web Worker',
      'Search indexing': 'Web Worker',
      
      // Rendering
      'Custom CSS background': 'Paint Worklet',
      'Dynamic patterns': 'Paint Worklet',
      'Generative art': 'Paint Worklet',
      'Custom borders': 'Paint Worklet',
      
      // Animation
      'Parallax scrolling': 'Animation Worklet',
      'Scroll-driven animation': 'Animation Worklet',
      'Gesture-based animation': 'Animation Worklet',
      'Physics-based animation': 'Animation Worklet',
      
      // Audio
      'Audio effects': 'Audio Worklet',
      'Synthesizers': 'Audio Worklet',
      'Audio analysis': 'Audio Worklet',
      'Voice processing': 'Audio Worklet',
      
      // Network
      'Offline functionality': 'Service Worker',
      'Cache management': 'Service Worker',
      'Push notifications': 'Service Worker'
    };
    
    return matrix[useCase] || 'Evaluate requirements';
  }
  
  static evaluate(requirements) {
    const scores = {
      'Web Worker': 0,
      'Paint Worklet': 0,
      'Animation Worklet': 0,
      'Audio Worklet': 0
    };
    
    // Score based on requirements
    if (requirements.heavyComputation) scores['Web Worker'] += 10;
    if (requirements.needsDOM) return 'Main Thread (no worker can access DOM)';
    if (requirements.needsNetwork) scores['Web Worker'] += 5;
    if (requirements.customPaint) scores['Paint Worklet'] += 10;
    if (requirements.smoothAnimation) scores['Animation Worklet'] += 10;
    if (requirements.audioProcessing) scores['Audio Worklet'] += 10;
    if (requirements.lowLatency) {
      scores['Paint Worklet'] += 5;
      scores['Animation Worklet'] += 5;
      scores['Audio Worklet'] += 5;
    }
    if (requirements.lowMemory) {
      scores['Paint Worklet'] += 3;
      scores['Animation Worklet'] += 3;
    }
    
    // Find highest score
    const winner = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      recommendation: winner[0],
      score: winner[1],
      allScores: scores
    };
  }
}

// Usage examples
console.log(TechnologySelector.chooseFor('Image processing'));
// => 'Web Worker'

console.log(TechnologySelector.chooseFor('Parallax scrolling'));
// => 'Animation Worklet'

console.log(TechnologySelector.evaluate({
  heavyComputation: true,
  lowLatency: true,
  needsNetwork: false
}));
// => { recommendation: 'Web Worker', score: 15, ... }

// ═══════════════════════════════════════════════════════════════
// REAL-WORLD PERFORMANCE EXAMPLES
// ═══════════════════════════════════════════════════════════════

// Example 1: Custom CSS pattern

// With Web Worker (❌ wrong choice):
const worker = new Worker('pattern-generator.js');
worker.postMessage({ size: { width: 100, height: 100 } });
worker.onmessage = (e) => {
  const imageData = e.data;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  element.style.backgroundImage = `url(${canvas.toDataURL()})`;
};

// Problems:
// - 35ms worker creation
// - 2ms message latency
// - Creates bitmap (memory intensive)
// - Not responsive to CSS changes
// Total: 40ms+ per pattern

// With Paint Worklet (✓ correct choice):
await CSS.paintWorklet.addModule('pattern.js');
element.style.background = 'paint(pattern)';
element.style.setProperty('--pattern-size', '20px');

// Benefits:
// - <1ms registration (one-time)
// - Direct paint integration
// - Vector-based (memory efficient)
// - Automatically repaints on CSS changes
// Total: <1ms per paint

// Example 2: Smooth scroll animation

// With Web Worker (❌ wrong choice):
const animWorker = new Worker('scroll-anim.js');
window.addEventListener('scroll', () => {
  animWorker.postMessage({ scrollY: window.scrollY });
});
animWorker.onmessage = (e) => {
  element.style.transform = `translateY(${e.data.offset}px)`;
};

// Problems:
// - 2ms message latency per scroll event
// - Scroll events throttled (not 60fps)
// - Style recalculation on main thread
// Result: Janky animation (30-45fps)

// With Animation Worklet (✓ correct choice):
await CSS.animationWorklet.addModule('parallax.js');
new WorkletAnimation(
  'parallax',
  new KeyframeEffect(element, [...]),
  new ScrollTimeline({ scrollSource: document.scrollingElement })
).play();

// Benefits:
// - Runs on compositor thread
// - True 60fps (isolated from main thread)
// - No message passing overhead
// Result: Smooth animation (60fps)

// Example 3: Audio effects

// With Web Worker (❌ wrong choice):
const audioWorker = new Worker('audio-processor.js');
// Cannot access Web Audio API from worker!
// Would need to transfer audio buffers (huge overhead)

// With Audio Worklet (✓ correct choice):
await audioContext.audioWorklet.addModule('reverb.js');
const reverbNode = new AudioWorkletNode(audioContext, 'reverb');
sourceNode.connect(reverbNode).connect(audioContext.destination);

// Benefits:
// - Runs in audio rendering thread
// - 128-sample buffer (low latency)
// - Direct audio stream access
// Result: Professional audio quality

// ═══════════════════════════════════════════════════════════════
// DECISION TREE
// ═══════════════════════════════════════════════════════════════

function selectTechnology(requirements) {
  // Need CSS integration?
  if (requirements.cssIntegration) {
    return 'Paint Worklet';
  }
  
  // Need smooth animation?
  if (requirements.animation && requirements.smooth60fps) {
    return 'Animation Worklet';
  }
  
  // Need audio processing?
  if (requirements.audioProcessing) {
    return 'Audio Worklet';
  }
  
  // Need heavy computation?
  if (requirements.computation && requirements.durationMs > 50) {
    return 'Web Worker';
  }
  
  // Need network/storage?
  if (requirements.network || requirements.storage) {
    return 'Web Worker';
  }
  
  // Simple, quick task?
  return 'Main Thread';
}

// Key insight for interviews:
// "Worklets are specialized, lightweight workers for rendering pipeline.
//  Web Workers are general-purpose, heavyweight for computation.
//  Choose based on use case: rendering/animation/audio → Worklet,
//  computation/network/storage → Worker.
//  Worklets are 40-70× more efficient for their specific use cases."
```

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

*[Code examples already extensively provided in Sections 3 and 4]*

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience Impact:**

```
Three technologies, three critical UX improvements:

1. Web Workers: Responsiveness
   Without: Heavy computation blocks UI for 2-3 seconds
   With: UI remains responsive, computation happens in background
   
   User perception:
   - Blocking: "App is broken/frozen" → 45% abandonment
   - Non-blocking: "App is processing" → 8% abandonment
   
   Improvement: 5.6× better retention

2. Service Workers: Resilience
   Without: "No internet connection" error
   With: Cached content, offline functionality
   
   User perception:
   - No SW: 100% bounce on offline
   - With SW: 12% usage even offline (cached content)
   
   Improvement: Previously impossible use case enabled

3. Worklets: Smoothness
   Without: Janky animations (30-45fps), high latency audio
   With: Butter-smooth 60fps, professional audio quality
   
   User perception:
   - Janky: "Feels cheap/broken"
   - Smooth: "Feels professional/native"
   
   Improvement: Professional-grade experience
```

**Business Impact:**

```
Case Study 1: E-commerce PWA (5M monthly users)

Before (no Service Worker):
- Offline: 100% bounce
- Slow 3G (8s load): 70% bounce
- Return visits: 28%
- Push notifications: Not possible
- Conversion: 2.1%

After (with Service Worker):
- Offline: 12% continue browsing (cached products)
- Slow 3G (1.5s load from cache): 15% bounce
- Return visits: 45% (+17pp from push notifications)
- Conversion: 3.4% (+62%)

Annual impact:
- 5M users × 3.4% conversion = 170K customers
- vs 5M × 2.1% = 105K customers
- Additional: 65K customers
- Average order: $120
- Additional revenue: $7.8M/year

Implementation cost: 3 weeks dev time (~$30K)
ROI: 260× first year

Case Study 2: Photo Editor SaaS (2M monthly users)

Before (no Web Workers):
- Filter application: 3s UI freeze
- User abandonment during filter: 45%
- Completion rate: 62%
- Paid conversion: 2.8%

After (with Web Workers):
- Filter application: 3s (parallel, UI responsive)
- User abandonment: 8%
- Completion rate: 94% (+52%)
- Paid conversion: 3.6% (+29%)

Annual impact:
- 2M users × 3.6% = 72K paid users
- vs 2M × 2.8% = 56K paid users
- Additional: 16K paid users
- Subscription: $60/year
- Additional revenue: $960K/year

Implementation cost: 2 weeks dev time (~$20K)
ROI: 48× first year

Case Study 3: Music Production App (200K users)

Before (no Audio Worklet, using ScriptProcessorNode):
- Audio latency: 50-100ms (noticeable)
- Max effects: 3-4 (performance limit)
- Audio dropouts: Common
- Pro user adoption: 12%
- Paid subscriptions: $18/month

After (with Audio Worklet):
- Audio latency: 5-10ms (imperceptible)
- Max effects: 30+ (10× more)
- Audio dropouts: None
- Pro user adoption: 20% (+67%)
- Paid subscriptions: $18/month

Annual impact:
- 200K users × 20% pro = 40K pro users
- vs 200K × 12% = 24K pro users
- Additional: 16K pro users
- Revenue per user: $216/year
- Additional revenue: $3.5M/year

Infrastructure savings:
- Audio processing on client (vs server)
- Reduced server costs: $800K/year

Total value: $4.3M/year
Implementation cost: 4 weeks dev time (~$40K)
ROI: 108× first year
```

**Technical Benefits:**

```
1. Architecture:
   - Clear separation: Main thread = presentation, Workers/Worklets = processing
   - Scalability: Utilize multi-core CPUs (4-core = 3-4× throughput)
   - Resilience: Worker crash doesn't crash main app
   - Maintainability: Isolated, testable modules

2. Performance:
   - Main thread freedom: 0ms blocking (vs 500-3000ms without workers)
   - Parallel execution: 4× faster on 4-core (Amdahl's law applies)
   - Efficient rendering: 60fps guaranteed (Animation Worklet on compositor)
   - Low latency: <10ms audio (Audio Worklet on audio thread)

3. Capabilities:
   - Offline-first: Service Worker enables new architectural patterns
   - Rich features: Push notifications, background sync, cache strategies
   - Custom rendering: Paint Worklet extends CSS
   - Professional audio: Audio Worklet rivals native apps

4. Resource efficiency:
   - Worklets: 70× less memory than Workers (for same task)
   - Service Workers: Shared across tabs (vs worker per tab)
   - Smart caching: Reduced server load, bandwidth savings
   - Battery life: Efficient thread usage, compositor thread for animations
```

### How It Works

**Web Workers: Parallel Execution Model**

```
Execution Flow:

Main Thread:                          Worker Thread:
┌──────────────────────────┐         ┌──────────────────────────┐
│ 1. Create Worker         │         │                          │
│    const w = new Worker()├────────→│ 2. Load script           │
│                          │         │    Execute top-level     │
│ 3. Send task             │         │                          │
│    w.postMessage(data)   ├────────→│ 4. Receive message       │
│                          │         │    self.onmessage        │
│ 5. Continue UI work      │         │                          │
│    (non-blocking!)       │         │ 5. Process task          │
│    Handle events         │         │    (parallel!)           │
│    Render frames         │         │                          │
│    Run other code        │         │ 6. Send result           │
│                          │←────────┤    self.postMessage()    │
│ 6. Receive result        │         │                          │
│    w.onmessage           │         │ 7. Wait for next task    │
│                          │         │                          │
│ 7. Update UI             │         │                          │
└──────────────────────────┘         └──────────────────────────┘

Time: t=0ms────────────────t=1000ms──────────────────────────────→

Main Thread:  [Create][Send][──UI responsive──][Receive][Update]
Worker Thread:        [Load][──────Process──────][Send]

Key insight: Main thread free during 1000ms processing!

Memory Model:

Main Heap:                 Worker Heap:
┌───────────────────┐     ┌───────────────────┐
│ DOM               │     │ Computation       │
│ UI state          │     │ Temp variables    │
│ Event handlers    │     │ WorkerGlobalScope │
│                   │     │                   │
│ NO SHARING        │     │ NO SHARING        │
└───────────────────┘     └───────────────────┘
        ↓                          ↓
        └────────Message Passing───┘
         (Structured Clone or Transfer)

Communication Cost:
- Small data (<1KB): 1ms clone
- Medium data (100KB): 5-10ms clone
- Large data (10MB): 100-300ms clone
- Transferable (10MB): <1ms transfer (ownership transfer)

Decision: Use transferable for data >1MB
```

**Service Workers: Network Proxy Model**

```
Lifecycle State Machine:

     ┌─────────────┐
     │   PARSED    │
     └──────┬──────┘
            ↓ register()
     ┌─────────────┐
     │ INSTALLING  │──→ Install event, cache resources
     └──────┬──────┘
            ↓ install success
     ┌─────────────┐
     │ INSTALLED   │──→ Wait for old SW to release
     │  (waiting)  │
     └──────┬──────┘
            ↓ old SW gone OR skipWaiting()
     ┌─────────────┐
     │ ACTIVATING  │──→ Activate event, clean old caches
     └──────┬──────┘
            ↓ activation complete
     ┌─────────────┐
     │  ACTIVATED  │──→ Controls pages, handles fetch events
     └──────┬──────┘
            ↓ new version OR unregister()
     ┌─────────────┐
     │  REDUNDANT  │──→ Replaced or failed
     └─────────────┘

Fetch Interception:

Page                SW                Cache              Network
 │                  │                  │                  │
 ├─fetch(/api/data)─→                 │                  │
 │                  │                  │                  │
 │              Check cache────────────→                  │
 │                  │                  │                  │
 │                  ←─────Cache miss───┤                  │
 │                  │                                     │
 │              Fetch network──────────────────────────→  │
 │                  │                                     │
 │                  ←─────────Response─────────────────────┤
 │                  │                                     │
 │              Update cache───────────→                  │
 │                  │                  │                  │
 ←──Return response──┤                                    │

Caching Strategies:

1. Cache First (fastest):
   Try cache → If miss: network → Cache response
   Use for: Static assets (CSS, JS, images)
   Performance: <1ms (cache hit), 100-500ms (cache miss + network)

2. Network First (freshest):
   Try network → If fail: cache
   Use for: API data, dynamic content
   Performance: 100-500ms (network), <1ms (cache fallback)

3. Stale-While-Revalidate (best of both):
   Serve cache immediately → Update from network in background
   Use for: Non-critical data (avatars, counts)
   Performance: <1ms (cache), updated in background

Strategy selection impact:

News app:
- Article content: Stale-while-revalidate (fast load, fresh eventually)
- Breaking news: Network first (freshness critical)
- Images/CSS: Cache first (static, rarely change)

Result:
- Load time: 1.2s (vs 4.5s without SW)
- Offline: 80% of content available
- Bandwidth: 60% reduction (cache hits)
```

**Worklets: Rendering Pipeline Integration**

```
Paint Worklet Execution:

Style → Layout → Paint (WORKLET) → Composite → Display
                   ↑
               Custom paint()

Timeline:
t=0ms:   CSS change detected (--color: red → blue)
t=1ms:   Style recalculation
t=2ms:   Layout (if needed)
t=3ms:   Paint Worklet invoked
         paint(ctx, size, properties) {
           // Draw with new color
         }
t=4ms:   Composite
t=5ms:   Display to screen

Total: 5ms (compared to 50ms+ with requestAnimationFrame + canvas)

Advantage: Integrated into pipeline, no extra frames

Animation Worklet Execution:

Main Thread          Compositor Thread       Animation Worklet
      │                     │                        │
      ├─Create animation────→                        │
      │                     │                        │
      │                     ├─Every frame────────────→
      │                     │                animate(time, effect)
      │                     │                        │
      │                     ←────Effect timing───────┤
      │                     │                        │
      │                Apply animation               │
      │                     │                        │
      (no main thread       │                        │
       involvement!)        │                        │

Scroll timeline:
User scrolls → Compositor updates scroll → Animation Worklet calculates effect
            → Compositor applies → Display (all without main thread!)

Result: 60fps guaranteed, even when JavaScript busy

Audio Worklet Execution:

Main Thread        Audio Rendering Thread     Audio Worklet
      │                     │                       │
      ├─Create node─────────→                       │
      │                     │                       │
      │              Every 128 samples──────────────→
      │                     │              process(inputs, outputs)
      │                     │                       │
      │                     ←─────Output samples────┤
      │                     │                       │
      │              Mix and render                 │
      │                     │                       │
      (no main thread       │                       │
       involvement!)        │                       │

Callback: Every ~3ms (128 samples @ 44.1kHz)
Must complete in <3ms or audio glitches

Advantage: Real-time processing, low latency, isolated from main thread
```

**Mental Models:**

```
1. Restaurant Analogy (Workers):

Main Thread = Front of House (FOH)
- Greets customers (handles events)
- Takes orders (receives inputs)
- Serves food (updates UI)
- Must always be available (responsive)
- Cannot disappear to cook (blocking!)

Web Worker = Kitchen
- Cooks food (processes data)
- Works in parallel with FOH
- No customer interaction (no DOM)
- Communicates via orders (messages)
- Can take time (non-blocking for FOH)

Result: Customers (users) never wait, excellent service (UX)

2. Post Office Analogy (Service Worker):

Without Service Worker:
- Every letter requires trip to sender
- No mail if postal service down
- Slow delivery on bad weather

With Service Worker:
- Local mailbox (cache)
- Delivers from mailbox if available
- Still checks for new mail (network)
- Works even when postal service down (offline)

Result: Fast, reliable mail delivery (content delivery)

3. Specialized Workers Analogy (Worklets):

Web Worker = General contractor
- Can do anything
- Expensive to hire (overhead)
- Takes time to start (creation)

Paint Worklet = Painter (specialist)
- Only paints
- Cheap to hire (lightweight)
- Starts immediately
- Perfect for painting tasks

Animation Worklet = Choreographer (specialist)
- Only animations
- Works independently
- Guarantees smooth performance

Audio Worklet = Sound engineer (specialist)
- Only audio
- Real-time processing
- Professional quality

Result: Right specialist for the job = efficient, high-quality
```

**Key Architectural Insight:**

These three technologies represent **fundamental shifts in web architecture**:

1. **Web Workers** = Shift from single-threaded to multi-threaded execution
   - Enables CPU-intensive work without blocking UI
   - Fundamental for responsive apps at scale

2. **Service Workers** = Shift from online-only to offline-first
   - Network becomes enhancement, not requirement
   - Fundamental for resilient apps

3. **Worklets** = Shift from JavaScript-only to pipeline-integrated
   - Extends browser capabilities (custom paint, smooth animation, pro audio)
   - Fundamental for native-quality experiences

**Combined, they enable web apps that:**
- Feel as responsive as native apps (Workers)
- Work reliably in any network condition (Service Workers)
- Look and sound professional (Worklets)

**This is the difference between "web app" and "web platform"**—the browser becomes a true application runtime, competitive with native platforms, while maintaining web's unique advantages: instant deployment, universal access, automatic updates.

At scale, these technologies compound: A PWA with offline capability (Service Worker) + smooth UI (Workers for computation, Worklets for rendering) + professional polish (Audio Worklets) rivals native apps in every dimension except app store distribution—and gains web's distribution advantages.

**For interviews:** Understanding these three technologies—their differences, use cases, and architectural implications—is fundamental to building modern web applications. The question isn't "should I use workers," it's "which worker for which task." This knowledge separates senior engineers who build basic web pages from staff engineers who architect scalable, resilient, native-quality web applications.