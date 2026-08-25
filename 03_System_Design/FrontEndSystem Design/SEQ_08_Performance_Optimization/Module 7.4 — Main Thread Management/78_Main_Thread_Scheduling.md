# 78. Main Thread Scheduling

## High-Level Overview

Main thread scheduling is one of the most critical yet under-discussed aspects of frontend performance. The main thread in a browser is responsible for executing JavaScript, handling user interactions, performing layout, painting, and much more. When the main thread is blocked, the entire user interface becomes unresponsive, leading to poor user experience.

**Key Concept**: The browser's main thread is single-threaded and operates on a task queue system. Understanding how to schedule work efficiently on this thread is crucial for maintaining responsive UIs, especially in complex applications.

**Why It Matters:**
- **Responsiveness**: Long-running tasks block user interactions
- **Core Web Vitals**: Directly impacts INP (Interaction to Next Paint)
- **User Experience**: Janky UIs lead to user frustration and abandonment
- **Performance Budget**: Main thread time is your most precious resource

**Real-World Impact:**
- Google found that improving INP by 100ms increased conversions by 10%
- Amazon calculated that every 100ms of latency costs them 1% in sales
- Pinterest reduced main thread work and saw a 40% increase in engagement

---

## Deep Technical Dive

### 1. Main Thread Architecture

The main thread operates on an event loop that processes tasks from various queues:

```
┌─────────────────────────────────────┐
│         JavaScript Execution         │
├─────────────────────────────────────┤
│         Style Calculation            │
├─────────────────────────────────────┤
│         Layout (Reflow)              │
├─────────────────────────────────────┤
│         Paint                        │
├─────────────────────────────────────┤
│         Composite                    │
└─────────────────────────────────────┘
          Main Thread (Single)
```

**Task Queue Priority:**
1. **Microtasks** (Promises, queueMicrotask) - Highest priority
2. **User Interactions** (clicks, keyboard) - High priority
3. **Rendering** (requestAnimationFrame) - High priority
4. **Timer Callbacks** (setTimeout, setInterval) - Medium priority
5. **Idle Callbacks** (requestIdleCallback) - Lowest priority

### 2. Long Tasks and the 50ms Rule

**Definition**: A "long task" is any task that blocks the main thread for 50ms or more.

**Why 50ms?**
- Users perceive latency at ~100ms
- 50ms gives buffer for browser overhead and other tasks
- Aligns with RAIL performance model (Response: 50ms, Animation: 16ms, Idle, Load)

```javascript
// BAD: Long task (blocks main thread for 500ms)
function processLargeDataset(data) {
  console.time('Processing');
  
  let result = [];
  for (let i = 0; i < 1000000; i++) {
    result.push({
      id: i,
      value: Math.sqrt(i),
      squared: i * i,
      cubed: i * i * i
    });
  }
  
  console.timeEnd('Processing'); // ~500ms
  return result;
}

// During these 500ms:
// - UI is frozen
// - Clicks don't respond
// - Scrolling is janky
// - Animations drop frames
// - User thinks app crashed
```

### 3. Task Scheduling APIs

#### 3.1 setTimeout (Macrotask Scheduling)

```javascript
// Schedule work for next event loop iteration
setTimeout(() => {
  console.log('Executed after current call stack clears');
}, 0);

// Problem: Minimum 4ms delay (HTML spec)
// Even setTimeout(fn, 0) has 4-5ms delay
```

#### 3.2 requestIdleCallback (Idle Time Scheduling)

```javascript
// Execute during idle periods
requestIdleCallback((deadline) => {
  console.log('Time remaining:', deadline.timeRemaining()); // ms until next frame
  console.log('Did timeout:', deadline.didTimeout);
  
  // Only do work if we have time
  while (deadline.timeRemaining() > 0 && workQueue.length > 0) {
    const task = workQueue.shift();
    processTask(task);
  }
  
  // If more work, schedule again
  if (workQueue.length > 0) {
    requestIdleCallback(processWork);
  }
}, { timeout: 1000 }); // Max wait time

// Browser calls callback during idle periods:
// - After rendering complete
// - Before next animation frame
// - When no user interactions pending
```

#### 3.3 Scheduler API (Experimental)

```javascript
// New Scheduler API for fine-grained control
// Chrome 94+, experimental

// Priority levels
const priorities = {
  'user-blocking': 'Critical user interactions',
  'user-visible': 'Visible to user but not blocking',
  'background': 'Background work'
};

// Schedule with priority
const controller = new TaskController();

scheduler.postTask(() => {
  console.log('High priority task');
}, {
  priority: 'user-blocking',
  signal: controller.signal
});

scheduler.postTask(() => {
  console.log('Low priority task');
}, {
  priority: 'background'
});

// Cancel task
controller.abort();

// Advanced: Yield to browser
async function processWithYield() {
  for (let item of largeArray) {
    await processItem(item);
    
    // Yield to browser if needed
    if (navigator.scheduling?.isInputPending()) {
      await scheduler.yield();
    }
  }
}
```

### 4. Chunking Work Pattern

**Strategy**: Break long tasks into smaller chunks that yield control back to the browser.

```javascript
// Pattern 1: Manual Chunking with setTimeout
function processInChunks(data, chunkSize = 100) {
  let index = 0;
  
  function processChunk() {
    const chunk = data.slice(index, index + chunkSize);
    
    // Process chunk
    chunk.forEach(item => {
      // Heavy processing
      processItem(item);
    });
    
    index += chunkSize;
    
    // More work? Schedule next chunk
    if (index < data.length) {
      setTimeout(processChunk, 0); // Yield to browser
    } else {
      console.log('All data processed!');
    }
  }
  
  processChunk();
}

// Usage
const largeDataset = Array.from({ length: 10000 }, (_, i) => i);
processInChunks(largeDataset);

// Pattern 2: Time-based Chunking
function processWithTimeLimit(data, timeLimit = 16) {
  let index = 0;
  
  function processBatch() {
    const startTime = performance.now();
    
    // Process items until time limit reached
    while (index < data.length && performance.now() - startTime < timeLimit) {
      processItem(data[index]);
      index++;
    }
    
    // Update progress
    updateProgressBar(index / data.length);
    
    // More work?
    if (index < data.length) {
      requestAnimationFrame(processBatch); // Yield between frames
    } else {
      onComplete();
    }
  }
  
  processBatch();
}

// Pattern 3: requestIdleCallback Chunking
function processWhenIdle(data) {
  let index = 0;
  
  function processIdleChunk(deadline) {
    // Process as much as possible in available time
    while (deadline.timeRemaining() > 1 && index < data.length) {
      processItem(data[index]);
      index++;
    }
    
    // More work?
    if (index < data.length) {
      requestIdleCallback(processIdleChunk);
    }
  }
  
  requestIdleCallback(processIdleChunk);
}
```

### 5. Input Prioritization

**Problem**: Long tasks can block user input, making the app feel unresponsive.

**Solution**: Detect and prioritize input events.

```javascript
// Check if input is pending (experimental)
if (navigator.scheduling?.isInputPending()) {
  // User is trying to interact, yield immediately
  await scheduler.yield();
}

// Prioritize input events
async function processWithInputPriority(tasks) {
  for (const task of tasks) {
    // Check before each task
    if (navigator.scheduling?.isInputPending()) {
      // Yield to handle input first
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    await processTask(task);
  }
}

// Alternative: Queue and prioritize
class PriorityQueue {
  constructor() {
    this.highPriority = []; // User interactions
    this.normalPriority = []; // Regular work
    this.lowPriority = []; // Background tasks
  }
  
  add(task, priority = 'normal') {
    switch(priority) {
      case 'high':
        this.highPriority.push(task);
        break;
      case 'low':
        this.lowPriority.push(task);
        break;
      default:
        this.normalPriority.push(task);
    }
  }
  
  getNext() {
    if (this.highPriority.length > 0) {
      return this.highPriority.shift();
    }
    if (this.normalPriority.length > 0) {
      return this.normalPriority.shift();
    }
    if (this.lowPriority.length > 0) {
      return this.lowPriority.shift();
    }
    return null;
  }
}

// Usage
const queue = new PriorityQueue();

// User clicked button (high priority)
button.addEventListener('click', () => {
  queue.add(() => handleClick(), 'high');
  processQueue();
});

// Background data processing (low priority)
queue.add(() => processAnalytics(), 'low');
```

### 6. Frame Budget Management

**Target**: 16.67ms per frame for 60fps

```javascript
// Track frame budget
class FrameBudgetManager {
  constructor(targetFPS = 60) {
    this.frameTime = 1000 / targetFPS; // 16.67ms for 60fps
    this.buffer = 2; // Reserve 2ms for browser overhead
    this.workBudget = this.frameTime - this.buffer; // 14.67ms available
  }
  
  async processWithBudget(tasks) {
    let frameStartTime = performance.now();
    let tasksCompleted = 0;
    
    for (const task of tasks) {
      const elapsed = performance.now() - frameStartTime;
      
      // Check if we have budget left
      if (elapsed > this.workBudget) {
        // Out of budget, yield to next frame
        await new Promise(resolve => requestAnimationFrame(resolve));
        frameStartTime = performance.now();
      }
      
      // Process task
      await task();
      tasksCompleted++;
    }
    
    console.log(`Completed ${tasksCompleted} tasks`);
  }
}

// Usage
const manager = new FrameBudgetManager();
const tasks = [task1, task2, task3, /* ... */];
manager.processWithBudget(tasks);
```

### 7. Web Workers Offloading

**When to offload to Web Workers:**
- CPU-intensive computations (> 50ms)
- Large data processing
- Image/video manipulation
- Complex algorithms (sorting, searching)

```javascript
// main.js
const worker = new Worker('worker.js');

// Offload heavy computation
worker.postMessage({
  type: 'PROCESS_DATA',
  data: largeDataset
});

worker.onmessage = (e) => {
  if (e.data.type === 'PROGRESS') {
    updateProgress(e.data.progress);
  } else if (e.data.type === 'COMPLETE') {
    handleResults(e.data.result);
  }
};

// worker.js
self.onmessage = (e) => {
  const { type, data } = e.data;
  
  if (type === 'PROCESS_DATA') {
    // Heavy computation here (doesn't block main thread!)
    const result = processLargeDataset(data);
    
    // Report progress periodically
    for (let i = 0; i < result.length; i++) {
      processItem(result[i]);
      
      // Report every 100 items
      if (i % 100 === 0) {
        self.postMessage({
          type: 'PROGRESS',
          progress: i / result.length
        });
      }
    }
    
    // Send final result
    self.postMessage({
      type: 'COMPLETE',
      result: result
    });
  }
};
```

---

## Real-World Production Examples

### Example 1: React Large List Rendering

**Problem**: Rendering 10,000 items blocks main thread for 2+ seconds.

```javascript
// BAD: Renders all 10,000 items at once
function LargeList({ items }) {
  return (
    <div>
      {items.map(item => (
        <ListItem key={item.id} data={item} />
      ))}
    </div>
  );
}

// Blocks main thread for 2000ms
// UI completely frozen
// INP score: POOR (> 500ms)
```

**Solution 1: Chunked Rendering with Scheduler**

```javascript
function LargeListOptimized({ items }) {
  const [renderedItems, setRenderedItems] = useState([]);
  const [isRendering, setIsRendering] = useState(true);
  
  useEffect(() => {
    let index = 0;
    const chunkSize = 50;
    
    async function renderChunk() {
      if (index >= items.length) {
        setIsRendering(false);
        return;
      }
      
      // Render chunk
      const chunk = items.slice(index, index + chunkSize);
      setRenderedItems(prev => [...prev, ...chunk]);
      
      index += chunkSize;
      
      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Continue rendering
      renderChunk();
    }
    
    renderChunk();
  }, [items]);
  
  return (
    <div>
      {renderedItems.map(item => (
        <ListItem key={item.id} data={item} />
      ))}
      {isRendering && <div>Loading...</div>}
    </div>
  );
}

// Renders in chunks of 50
// Main thread never blocked > 50ms
// INP score: GOOD (< 200ms)
```

**Solution 2: Virtualization (Best for large lists)**

```javascript
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <ListItem
          style={style}
          data={items[index]}
        />
      )}
    </FixedSizeList>
  );
}

// Only renders visible items (~20-30)
// Constant time complexity
// INP score: EXCELLENT (< 100ms)
```

### Example 2: Search Autocomplete with Debouncing

**Problem**: Expensive search on every keystroke blocks main thread.

```javascript
// BAD: Searches on every keystroke
function SearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Expensive search (200ms)
    const searchResults = expensiveSearch(value);
    setResults(searchResults);
  };
  
  return (
    <input
      value={query}
      onChange={handleChange}
      placeholder="Search..."
    />
  );
}

// Typing "hello" (5 keystrokes):
// - 5 searches × 200ms = 1000ms total
// - UI freezes on every keystroke
// - Terrible UX
```

**Solution: Debouncing + Chunked Processing**

```javascript
function SearchInputOptimized() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounce search
  const debouncedSearch = useMemo(
    () => debounce(async (value) => {
      setIsSearching(true);
      
      // Offload to worker or chunk the work
      const searchResults = await searchInChunks(value);
      
      setResults(searchResults);
      setIsSearching(false);
    }, 300), // Wait 300ms after last keystroke
    []
  );
  
  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };
  
  return (
    <div>
      <input
        value={query}
        onChange={handleChange}
        placeholder="Search..."
      />
      {isSearching && <Spinner />}
      <ResultsList results={results} />
    </div>
  );
}

// Typing "hello" (5 keystrokes):
// - Waits 300ms after last keystroke
// - 1 search instead of 5
// - Chunked processing prevents blocking
// - Smooth, responsive UX

// Helper: Chunked search
async function searchInChunks(query) {
  const allItems = getAllItems(); // 10,000 items
  const results = [];
  const chunkSize = 500;
  
  for (let i = 0; i < allItems.length; i += chunkSize) {
    const chunk = allItems.slice(i, i + chunkSize);
    
    // Filter chunk
    const matches = chunk.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    
    results.push(...matches);
    
    // Yield every chunk
    if (i + chunkSize < allItems.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
}
```

### Example 3: Image Processing with Progressive Enhancement

**Problem**: Applying filter to 4K image blocks main thread for 3+ seconds.

```javascript
// BAD: Processes entire image at once
function applyFilter(imageData) {
  const data = imageData.data;
  
  // Process all pixels (8.3M pixels in 4K image)
  for (let i = 0; i < data.length; i += 4) {
    // Complex filter calculation
    data[i] = applyComplexFilter(data[i], data[i+1], data[i+2]);
    data[i+1] = applyComplexFilter(data[i+1], data[i+2], data[i]);
    data[i+2] = applyComplexFilter(data[i+2], data[i], data[i+1]);
  }
  
  return imageData;
}

// 3840 × 2160 pixels = 8,294,400 pixels
// Each pixel: ~0.0003ms processing
// Total: ~3000ms (3 seconds)
// Main thread completely blocked
```

**Solution 1: Web Worker Offloading**

```javascript
// main.js
const filterWorker = new Worker('filter-worker.js');

async function applyFilterAsync(imageData) {
  return new Promise((resolve, reject) => {
    // Transfer image data to worker (zero-copy)
    filterWorker.postMessage(
      { type: 'APPLY_FILTER', imageData },
      [imageData.data.buffer]
    );
    
    filterWorker.onmessage = (e) => {
      if (e.data.type === 'PROGRESS') {
        updateProgressBar(e.data.progress);
      } else if (e.data.type === 'COMPLETE') {
        resolve(e.data.imageData);
      }
    };
    
    filterWorker.onerror = reject;
  });
}

// filter-worker.js
self.onmessage = (e) => {
  const { type, imageData } = e.data;
  
  if (type === 'APPLY_FILTER') {
    const data = imageData.data;
    const totalPixels = data.length / 4;
    
    // Process in chunks to report progress
    const chunkSize = 100000; // 100K pixels per chunk
    
    for (let i = 0; i < data.length; i += chunkSize * 4) {
      const end = Math.min(i + chunkSize * 4, data.length);
      
      // Process chunk
      for (let j = i; j < end; j += 4) {
        data[j] = applyComplexFilter(data[j], data[j+1], data[j+2]);
        data[j+1] = applyComplexFilter(data[j+1], data[j+2], data[j]);
        data[j+2] = applyComplexFilter(data[j+2], data[j], data[j+1]);
      }
      
      // Report progress
      const progress = (end / 4) / totalPixels;
      self.postMessage({ type: 'PROGRESS', progress });
    }
    
    // Send result back (transfer ownership)
    self.postMessage(
      { type: 'COMPLETE', imageData },
      [imageData.data.buffer]
    );
  }
};

// Result:
// - Main thread stays responsive
// - User can cancel operation
// - Progress bar shows status
// - Still takes 3 seconds, but non-blocking
```

**Solution 2: Progressive Rendering**

```javascript
// Show low-res preview immediately, then enhance
async function applyFilterProgressive(imageData, canvas) {
  // Step 1: Quick low-res preview (100ms)
  const lowRes = downsample(imageData, 4); // 1/4 resolution
  const lowResFiltered = applyFilter(lowRes);
  displayImage(canvas, lowResFiltered, true); // Scaled up
  
  // Step 2: Medium-res (500ms)
  await yieldToMain();
  const medRes = downsample(imageData, 2); // 1/2 resolution
  const medResFiltered = applyFilter(medRes);
  displayImage(canvas, medResFiltered, true);
  
  // Step 3: Full-res in worker (3000ms, non-blocking)
  const fullRes = await applyFilterAsync(imageData);
  displayImage(canvas, fullRes, false);
}

// User sees:
// - Blurry filtered preview in 100ms (instant feedback)
// - Better quality in 500ms (progressive enhancement)
// - Final quality in 3000ms (while UI stays responsive)
```

### Example 4: Dashboard with Real-Time Updates

**Problem**: Updating 100 charts every second blocks main thread.

```javascript
// BAD: Updates all charts synchronously
function updateDashboard(data) {
  const charts = document.querySelectorAll('.chart');
  
  charts.forEach((chart, i) => {
    // Each update: ~50ms
    updateChart(chart, data[i]);
  });
  
  // 100 charts × 50ms = 5000ms
  // Blocks for 5 seconds every update!
}

setInterval(() => {
  updateDashboard(fetchLatestData());
}, 1000);

// UI frozen for 5 seconds, responsive for 1 second
// Completely unusable
```

**Solution: Priority-Based Scheduling**

```javascript
class DashboardScheduler {
  constructor() {
    this.updateQueue = [];
    this.isProcessing = false;
  }
  
  scheduleUpdate(chart, data, priority = 'normal') {
    this.updateQueue.push({ chart, data, priority });
    this.updateQueue.sort((a, b) => {
      const priorities = { high: 3, normal: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  async processQueue() {
    this.isProcessing = true;
    
    while (this.updateQueue.length > 0) {
      const frameStartTime = performance.now();
      const frameBudget = 14; // 14ms per frame (60fps with buffer)
      
      // Process as many updates as possible within budget
      while (
        this.updateQueue.length > 0 && 
        performance.now() - frameStartTime < frameBudget
      ) {
        const { chart, data } = this.updateQueue.shift();
        updateChart(chart, data);
      }
      
      // Yield to browser for rendering
      if (this.updateQueue.length > 0) {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }
    
    this.isProcessing = false;
  }
}

// Usage
const scheduler = new DashboardScheduler();

// Update with priorities
function updateDashboard(data) {
  const charts = document.querySelectorAll('.chart');
  
  charts.forEach((chart, i) => {
    // Visible charts: high priority
    const isVisible = chart.getBoundingClientRect().top < window.innerHeight;
    const priority = isVisible ? 'high' : 'low';
    
    scheduler.scheduleUpdate(chart, data[i], priority);
  });
}

// Update every second
setInterval(() => {
  updateDashboard(fetchLatestData());
}, 1000);

// Result:
// - Visible charts update first (within 1-2 frames)
// - Off-screen charts update when idle
// - UI stays responsive at 60fps
// - Total update still takes 5 seconds, but spread over time
```

---

## Interview-Oriented Deep Dive

### Common Interview Questions

#### Q1: "What is a long task and why does it matter?"

**Complete Answer:**
```
A long task is any JavaScript execution that blocks the main thread for 50ms or 
more. This threshold comes from user perception research:

- Users perceive delays at 100ms
- 50ms gives buffer for browser overhead (rendering, input handling)
- Aligns with RAIL model (Response < 50ms, Animation < 16ms)

Why it matters:
1. Blocks user interactions (clicks, typing)
2. Causes frame drops (janky animations)
3. Hurts Core Web Vitals (especially INP)
4. Degrades user experience (app feels broken)

How to detect:
- Chrome DevTools Performance tab (red triangles)
- Long Tasks API: PerformanceObserver
- Web Vitals library reports INP

How to fix:
- Break into chunks with setTimeout/requestIdleCallback
- Offload to Web Workers
- Use requestAnimationFrame for visual updates
- Implement progressive enhancement
```

**Code Example:**
```javascript
// Detect long tasks
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === 'longtask') {
      console.warn('Long task detected:', {
        duration: entry.duration,
        startTime: entry.startTime,
        attribution: entry.attribution
      });
      
      // Report to analytics
      reportToAnalytics('long-task', entry.duration);
    }
  });
});

observer.observe({ entryTypes: ['longtask'] });
```

#### Q2: "How would you optimize rendering 10,000 list items?"

**Complete Answer:**
```
Several strategies, each with trade-offs:

1. Virtualization (Best for uniform items)
   - Only render visible items (~20-30)
   - Libraries: react-window, react-virtualized
   - Pros: Constant time, minimal DOM
   - Cons: Complex for variable heights

2. Pagination
   - Load 50 items per page
   - Pros: Simple, works everywhere
   - Cons: Extra clicks, SEO challenges

3. Infinite Scroll
   - Load more as user scrolls
   - Pros: Seamless UX
   - Cons: Hard to reach footer, SEO

4. Chunked Rendering
   - Render 50 items per chunk
   - Yield between chunks
   - Pros: Works for any items
   - Cons: Takes time, needs loading state

5. Hybrid: Virtual + Chunked
   - Virtual window for visible items
   - Chunk-render items in view
   - Best of both worlds
```

**Code Example:**
```javascript
// Chunked rendering with progress
function ChunkedList({ items }) {
  const [renderedItems, setRenderedItems] = useState([]);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    let index = 0;
    const chunkSize = 50;
    
    async function renderChunk() {
      if (index >= items.length) {
        setProgress(100);
        return;
      }
      
      // Render chunk
      const chunk = items.slice(index, index + chunkSize);
      setRenderedItems(prev => [...prev, ...chunk]);
      
      // Update progress
      index += chunkSize;
      setProgress((index / items.length) * 100);
      
      // Yield to browser
      await new Promise(resolve => 
        requestIdleCallback(resolve, { timeout: 50 })
      );
      
      renderChunk();
    }
    
    renderChunk();
  }, [items]);
  
  return (
    <>
      {progress < 100 && <ProgressBar value={progress} />}
      <ul>
        {renderedItems.map(item => (
          <ListItem key={item.id} data={item} />
        ))}
      </ul>
    </>
  );
}
```

#### Q3: "Explain the difference between setTimeout, requestAnimationFrame, and requestIdleCallback"

**Complete Answer:**
```
setTimeout(fn, delay):
- Schedules task in macrotask queue
- Minimum 4ms delay (even with 0)
- Not synced with display refresh
- Use for: General async work

requestAnimationFrame(fn):
- Runs before next paint
- Synced with display refresh (typically 60fps)
- Guaranteed 16.67ms interval on 60Hz display
- Pauses when tab hidden (battery saving)
- Use for: Animations, visual updates

requestIdleCallback(fn, options):
- Runs during idle periods
- Gets called with deadline object
- Can specify timeout
- Might not run if never idle
- Use for: Low-priority background work

Priority order:
1. Microtasks (Promise.then)
2. User interactions
3. requestAnimationFrame
4. Rendering
5. setTimeout (macrotasks)
6. requestIdleCallback (when idle)
```

**Comparison Code:**
```javascript
console.log('1: Sync');

setTimeout(() => console.log('2: setTimeout'), 0);

requestAnimationFrame(() => console.log('3: rAF'));

requestIdleCallback(() => console.log('4: rIC'));

Promise.resolve().then(() => console.log('5: Promise'));

console.log('6: Sync');

// Output order: 1, 6, 5, 3, 2, 4
// Explanation:
// - Sync code runs first: 1, 6
// - Microtasks drain: 5
// - rAF before paint: 3
// - setTimeout macrotask: 2
// - rIC when idle: 4
```

#### Q4: "How do you prioritize tasks on the main thread?"

**Complete Answer:**
```
Priority-based task scheduling with multiple queues:

Priority Levels:
1. Critical: User interactions (clicks, typing)
2. High: Visual updates (animations, scrolling)
3. Normal: Data fetching, non-critical updates
4. Low: Analytics, background sync
5. Idle: Prefetching, cache cleanup

Implementation strategies:

1. Multiple Queues
   - Separate queue per priority
   - Process high priority first
   - Time-slice lower priorities

2. Scheduler API (Chrome 94+)
   - Built-in priority handling
   - User-blocking, user-visible, background
   - Can abort tasks

3. Custom Scheduler
   - Track task deadlines
   - Yield based on priority
   - Measure and adjust

4. Input Detection
   - Check navigator.scheduling.isInputPending()
   - Yield immediately if input pending
   - Prevents blocking interactions
```

**Implementation:**
```javascript
class TaskScheduler {
  constructor() {
    this.queues = {
      critical: [],
      high: [],
      normal: [],
      low: [],
      idle: []
    };
    this.isProcessing = false;
  }
  
  schedule(task, priority = 'normal') {
    if (!this.queues[priority]) {
      throw new Error(`Invalid priority: ${priority}`);
    }
    
    this.queues[priority].push(task);
    
    if (!this.isProcessing) {
      this.process();
    }
  }
  
  async process() {
    this.isProcessing = true;
    
    const priorities = ['critical', 'high', 'normal', 'low', 'idle'];
    
    while (this.hasWork()) {
      const frameStartTime = performance.now();
      const frameBudget = 14; // 14ms budget per frame
      
      // Check for input (highest priority)
      if (navigator.scheduling?.isInputPending()) {
        await this.yieldToMain();
        continue;
      }
      
      // Process highest priority task within budget
      for (const priority of priorities) {
        const queue = this.queues[priority];
        
        while (
          queue.length > 0 && 
          performance.now() - frameStartTime < frameBudget
        ) {
          const task = queue.shift();
          await task();
          
          // Re-check input after each task
          if (navigator.scheduling?.isInputPending()) {
            break;
          }
        }
        
        // Move to next priority if this queue empty
        if (queue.length === 0) continue;
        
        // Still has tasks but out of budget
        if (performance.now() - frameStartTime >= frameBudget) {
          await this.yieldToMain();
          break;
        }
      }
      
      // Yield between frames
      if (this.hasWork()) {
        await this.yieldToMain();
      }
    }
    
    this.isProcessing = false;
  }
  
  hasWork() {
    return Object.values(this.queues).some(q => q.length > 0);
  }
  
  async yieldToMain() {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }
}

// Usage
const scheduler = new TaskScheduler();

// User interaction (critical)
button.addEventListener('click', () => {
  scheduler.schedule(() => handleClick(), 'critical');
});

// Animation (high)
scheduler.schedule(() => updateAnimation(), 'high');

// Data fetching (normal)
scheduler.schedule(() => fetchData(), 'normal');

// Analytics (low)
scheduler.schedule(() => sendAnalytics(), 'low');

// Cache cleanup (idle)
scheduler.schedule(() => cleanupCache(), 'idle');
```

---

## Why This Matters & How to Apply

### Core Principles

1. **50ms Rule**: Never block main thread for more than 50ms
2. **Frame Budget**: Reserve 2-3ms per frame for browser overhead
3. **Input Priority**: Always yield when user input is pending
4. **Progressive Enhancement**: Show something fast, enhance incrementally
5. **Measure, Don't Guess**: Use Performance API to measure actual impact

### Mental Model

```
Main Thread = Single Lane Highway
-----------------------------------
Long Task = Traffic Jam (blocks everyone)
Chunking = Multiple Short Trips (smooth traffic)
Web Worker = Parallel Highway (dedicated lane)
requestIdleCallback = Carpool Lane (use when empty)
Priority = Emergency Vehicles (go first)
```

### Decision Framework

**Should I schedule this work?**
```
Is it blocking user interaction? 
├─ Yes → Critical priority, run immediately
└─ No → Is it visible to user?
    ├─ Yes → High priority, schedule with rAF
    └─ No → Is it time-sensitive?
        ├─ Yes → Normal priority, chunk with setTimeout
        └─ No → Low priority, defer with rIC
```

**Should I use Web Workers?**
```
Is it CPU-intensive (> 50ms)?
├─ Yes → Can it run without DOM access?
│   ├─ Yes → Use Web Worker ✅
│   └─ No → Chunk on main thread
└─ No → Keep on main thread (overhead not worth it)
```

### Production Checklist

**Before Deploying:**
- [ ] All tasks < 50ms (check DevTools Performance)
- [ ] No long tasks during user interactions
- [ ] INP < 200ms (use Web Vitals library)
- [ ] Smooth 60fps animations
- [ ] Loading states for chunked work
- [ ] Cancel mechanisms for long operations
- [ ] Monitoring for long tasks in production

**Monitoring in Production:**
```javascript
// Track long tasks
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.duration > 50) {
      // Send to analytics
      analytics.track('long-task', {
        duration: entry.duration,
        startTime: entry.startTime,
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    }
  });
});

observer.observe({ entryTypes: ['longtask'] });

// Track INP
import { onINP } from 'web-vitals';

onINP((metric) => {
  analytics.track('inp', {
    value: metric.value,
    rating: metric.rating, // 'good', 'needs-improvement', 'poor'
    url: window.location.href
  });
});
```

### Common Mistakes to Avoid

❌ **Mistake 1: Not yielding during long loops**
```javascript
// Bad
for (let i = 0; i < 10000; i++) {
  processItem(i);
}
// Blocks for entire loop
```

✅ **Fix: Chunk with yields**
```javascript
async function processWithYield() {
  for (let i = 0; i < 10000; i++) {
    processItem(i);
    
    if (i % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

❌ **Mistake 2: Using setTimeout for animations**
```javascript
// Bad
setInterval(() => {
  box.style.left = position++ + 'px';
}, 16);
// Not synced with display refresh
```

✅ **Fix: Use requestAnimationFrame**
```javascript
function animate() {
  box.style.left = position++ + 'px';
  requestAnimationFrame(animate);
}
```

❌ **Mistake 3: Processing everything immediately**
```javascript
// Bad
data.forEach(item => processItem(item));
// Blocks if data is large
```

✅ **Fix: Prioritize and schedule**
```javascript
const visibleItems = data.filter(isVisible);
const hiddenItems = data.filter(isHidden);

// Process visible immediately
visibleItems.forEach(processItem);

// Defer hidden items
requestIdleCallback(() => {
  hiddenItems.forEach(processItem);
});
```

### Performance Impact

**Business Metrics Affected:**
- **Conversion Rate**: Each 100ms INP improvement = ~1-2% conversion increase
- **Bounce Rate**: Long tasks increase bounce rate by 10-20%
- **Engagement**: Smooth UIs see 30-50% longer session times
- **Revenue**: Amazon: 100ms delay = 1% sales loss

**Technical Metrics:**
- **INP**: Target < 200ms (Good), avoid > 500ms (Poor)
- **Frame Rate**: Target 60fps (16.67ms/frame)
- **Long Tasks**: Target 0 long tasks during interactions
- **Main Thread Work**: Target < 4 seconds total for page load

---

## Summary & Key Takeaways

### Critical Concepts

1. **Main thread is single-threaded** - Everything competes for CPU time
2. **50ms is the threshold** - Longer = long task = bad UX
3. **Frame budget is 16.67ms** - Must fit work + browser overhead
4. **Chunking prevents blocking** - Break work into smaller pieces
5. **Priorities matter** - User input always wins
6. **Web Workers for heavy lifting** - Offload CPU-intensive work
7. **Progressive enhancement** - Show something fast, improve incrementally
8. **Measure in production** - Monitor long tasks and INP

### Quick Reference

| Technique | When to Use | Performance Impact |
|-----------|-------------|-------------------|
| setTimeout chunking | General async work | Good (yields every 4ms) |
| requestAnimationFrame | Visual updates | Excellent (synced with display) |
| requestIdleCallback | Background work | Best (runs when idle) |
| Web Workers | CPU-intensive (>50ms) | Excellent (parallel) |
| Scheduler API | Fine-grained priority | Excellent (native priority) |
| Virtualization | Large lists (>1000 items) | Excellent (constant time) |

### Interview Success Formula

1. **Understand the problem** - Long tasks block main thread
2. **Know the threshold** - 50ms for tasks, 16.67ms for frames
3. **Explain solutions** - Chunking, workers, scheduling
4. **Show code** - Demonstrate chunking patterns
5. **Discuss trade-offs** - Complexity vs performance
6. **Mention monitoring** - Long Tasks API, INP tracking

### One-Sentence Summary

> Main thread scheduling is about breaking CPU-intensive work into small chunks (<50ms) that yield control to the browser, ensuring the UI stays responsive and maintaining smooth 60fps performance.

---

**Related Topics:**
- [79. Long Tasks & Yielding Control](./79_Long_Tasks_Yielding_Control.md)
- [80. Interaction to Next Paint (INP)](./80_Interaction_to_Next_Paint.md)
- [81. Avoiding Layout Thrashing](./81_Avoiding_Layout_Thrashing.md)
- [76. Avoiding Unnecessary Re-Renders](../Module%207.3%20—%20Rendering%20Performance/76_Avoiding_Unnecessary_Re-Renders.md)
