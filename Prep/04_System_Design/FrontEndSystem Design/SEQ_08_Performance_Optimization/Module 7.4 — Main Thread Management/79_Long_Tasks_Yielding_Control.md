# 79. Long Tasks & Yielding Control

## High-Level Overview

Long tasks are the silent killers of web performance. They represent any piece of JavaScript execution that monopolizes the main thread for 50 milliseconds or more, causing the entire user interface to freeze. During a long task, users cannot click buttons, type in inputs, or scroll smoothly—the browser is completely unresponsive.

**Key Concept**: Yielding control means intentionally pausing JavaScript execution to give the browser a chance to handle user interactions, update the UI, and perform other critical tasks. It's like taking turns in a conversation—you speak for a bit, then let others respond.

**Why It Matters:**
- **User Experience**: Frozen UIs lead to frustrated users and abandoned sessions
- **Core Web Vitals**: Long tasks directly degrade INP (Interaction to Next Paint)
- **Mobile Performance**: Low-powered devices suffer even more from long tasks
- **Perceived Performance**: Users tolerate slow loads but not unresponsive interfaces

**Real-World Impact:**
- **Pinterest**: Reduced long tasks by 50%, saw 40% increase in engagement
- **Zillow**: Eliminated long tasks during search, reduced bounce rate by 25%
- **Shopify**: Optimized checkout by yielding during validation, increased conversions by 15%

---

## Deep Technical Dive

### 1. Anatomy of a Long Task

**Definition**: A long task is any uninterrupted JavaScript execution that runs for ≥50ms.

**Why 50ms?**
```
User Perception Research (Jakob Nielsen):
- 0-100ms: Instant (no perceived delay)
- 100-300ms: Slight delay (noticeable but acceptable)
- 300-1000ms: Machine is working (requires feedback)
- 1000ms+: Mental context switch (user loses focus)

Browser Strategy:
- Target: Respond within 100ms
- Buffer: Reserve 50ms for browser overhead
- Result: JavaScript budget = 50ms
```

**What Happens During a Long Task:**
```javascript
console.time('Long Task');

// Long task starts
for (let i = 0; i < 10000000; i++) {
  // Heavy computation
  const result = Math.sqrt(i) * Math.pow(i, 2);
}

console.timeEnd('Long Task'); // ~500ms

// During these 500ms:
// ❌ Click events queued but not processed
// ❌ Text input appears frozen
// ❌ Scroll requests buffered
// ❌ Animations drop frames
// ❌ Touch gestures ignored
// ❌ Network responses waiting
// ❌ Timers delayed
// ❌ requestAnimationFrame postponed
```

### 2. Detecting Long Tasks

#### Method 1: Long Tasks API (Preferred)

```javascript
// Create observer for long tasks
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn('🐌 Long Task Detected:', {
      name: entry.name,
      duration: entry.duration.toFixed(2) + 'ms',
      startTime: entry.startTime.toFixed(2) + 'ms',
      
      // Attribution: what caused it
      attribution: entry.attribution.map(attr => ({
        containerType: attr.containerType,
        containerName: attr.containerName,
        containerSrc: attr.containerSrc,
        containerId: attr.containerId
      }))
    });
    
    // Send to analytics
    if (entry.duration > 100) {
      analytics.track('critical-long-task', {
        duration: entry.duration,
        url: window.location.href,
        timestamp: Date.now()
      });
    }
  }
});

// Start observing
observer.observe({ 
  entryTypes: ['longtask'],
  buffered: true // Include tasks that occurred before observer
});

// Example output:
// 🐌 Long Task Detected: {
//   name: "self",
//   duration: "273.40ms",
//   startTime: "1234.56ms",
//   attribution: [{
//     containerType: "iframe",
//     containerName: "ads-iframe",
//     containerSrc: "https://ads.example.com/ad.js",
//     containerId: "ad-container"
//   }]
// }
```

#### Method 2: Performance.measure() (Manual)

```javascript
// Wrap potentially long operations
function measureTask(name, fn) {
  performance.mark(`${name}-start`);
  
  const result = fn();
  
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);
  
  const measure = performance.getEntriesByName(name)[0];
  
  if (measure.duration > 50) {
    console.warn(`⚠️ Long task: ${name} took ${measure.duration.toFixed(2)}ms`);
  }
  
  return result;
}

// Usage
measureTask('data-processing', () => {
  return processLargeDataset(data);
});
```

#### Method 3: Chrome DevTools (Development)

```javascript
// In Chrome DevTools Console:

// 1. Open Performance Tab
// 2. Click Record
// 3. Perform actions
// 4. Stop recording
// 5. Look for red triangles in Timeline (long tasks)

// Programmatic tracking
performance.mark('operation-start');
heavyOperation();
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');

// View in DevTools:
// Performance > Timings section shows your marks and measures
```

### 3. Core Yielding Strategies

#### Strategy 1: setTimeout (Basic Yielding)

```javascript
// WITHOUT YIELDING
function processArray(items) {
  const results = [];
  
  // Blocks for entire array processing
  for (let i = 0; i < items.length; i++) {
    results.push(processItem(items[i]));
  }
  
  return results;
}

// 10,000 items × 0.05ms = 500ms BLOCKED ❌

// WITH YIELDING
async function processArrayWithYield(items) {
  const results = [];
  const chunkSize = 50;
  
  for (let i = 0; i < items.length; i += chunkSize) {
    // Process chunk
    for (let j = i; j < i + chunkSize && j < items.length; j++) {
      results.push(processItem(items[j]));
    }
    
    // Yield to browser
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Update progress
    updateProgress((i / items.length) * 100);
  }
  
  return results;
}

// 10,000 items / 50 per chunk = 200 chunks
// Each chunk: ~2.5ms processing + 4ms yield = 6.5ms
// Total: 1300ms, but UI responsive throughout ✅

// Why setTimeout(fn, 0)?
// - Adds callback to macrotask queue
// - Browser processes:
//   1. Current script completes
//   2. Microtasks (promises) execute
//   3. Rendering updates
//   4. User input handling
//   5. Your callback runs
// - Minimum 4ms delay (HTML spec)
```

#### Strategy 2: requestIdleCallback (Idle-Time Yielding)

```javascript
// Run work only when browser is idle
function processWhenIdle(tasks, deadline = 5000) {
  let currentIndex = 0;
  
  function processIdleBatch(idleDeadline) {
    // Process while we have idle time
    while (
      currentIndex < tasks.length && 
      idleDeadline.timeRemaining() > 1 // Leave 1ms buffer
    ) {
      processTask(tasks[currentIndex]);
      currentIndex++;
    }
    
    // Update progress
    updateProgress((currentIndex / tasks.length) * 100);
    
    // More work remaining?
    if (currentIndex < tasks.length) {
      requestIdleCallback(processIdleBatch, { timeout: deadline });
    } else {
      onComplete();
    }
  }
  
  requestIdleCallback(processIdleBatch, { timeout: deadline });
}

// How it works:
// - Browser calculates idle time per frame:
//   Frame budget: 16.67ms (60fps)
//   Used for rendering: 8ms
//   Idle time: 8.67ms
// - idleDeadline.timeRemaining() returns available ms
// - If timeout expires, didTimeout = true (run anyway)

// Example with timeout handling
function robustIdleProcessing(tasks) {
  let index = 0;
  
  function processBatch(deadline) {
    const timeRemaining = deadline.timeRemaining();
    const isTimeout = deadline.didTimeout;
    
    if (isTimeout) {
      console.warn('Idle callback timed out, running anyway');
      // Process at least one task
      processTask(tasks[index++]);
    } else {
      // Process while we have time
      while (timeRemaining > 1 && index < tasks.length) {
        processTask(tasks[index++]);
      }
    }
    
    if (index < tasks.length) {
      requestIdleCallback(processBatch, { timeout: 2000 });
    }
  }
  
  requestIdleCallback(processBatch, { timeout: 2000 });
}
```

#### Strategy 3: requestAnimationFrame (Visual Yielding)

```javascript
// Yield between animation frames
async function processWithAnimationYield(items) {
  const results = [];
  const chunkSize = 50;
  
  for (let i = 0; i < items.length; i += chunkSize) {
    // Process chunk
    for (let j = i; j < i + chunkSize && j < items.length; j++) {
      results.push(processItem(items[j]));
    }
    
    // Yield until next frame
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Update visual progress (smooth because synced with frames)
    progressBar.style.width = ((i / items.length) * 100) + '%';
  }
  
  return results;
}

// Why requestAnimationFrame?
// - Runs before next paint (perfect for visual updates)
// - Synced with display refresh (60fps = every 16.67ms)
// - Pauses when tab hidden (battery friendly)
// - Smoother progress bars than setTimeout

// Comparison:
// setTimeout: Yield every ~4ms (can run while hidden)
// rAF: Yield every ~16ms (pauses when hidden, smooth visuals)
// rIC: Yield during idle (best for background work)
```

#### Strategy 4: Scheduler API (Advanced - Chrome 94+)

```javascript
// New Scheduler API provides fine-grained control
async function processWithScheduler(items) {
  const results = [];
  const chunkSize = 50;
  
  for (let i = 0; i < items.length; i += chunkSize) {
    // Process chunk
    for (let j = i; j < i + chunkSize && j < items.length; j++) {
      results.push(processItem(items[j]));
    }
    
    // Yield with scheduler
    await scheduler.yield();
    // Alternative: await scheduler.postTask(() => {}, { priority: 'background' });
  }
  
  return results;
}

// Check if input is pending before continuing
async function smartYield() {
  if (navigator.scheduling?.isInputPending()) {
    // User is trying to interact, yield immediately
    await scheduler.yield();
    return true;
  }
  return false;
}

// Priority-based processing
async function processWithPriority(tasks, priority = 'background') {
  for (const task of tasks) {
    // Check for user input
    if (await smartYield()) {
      console.log('Yielded for user input');
    }
    
    // Process with specified priority
    await scheduler.postTask(() => processTask(task), { 
      priority // 'user-blocking', 'user-visible', 'background'
    });
  }
}
```

### 4. Advanced Yielding Patterns

#### Pattern 1: Time-Budgeted Yielding

```javascript
class TimeBudgetProcessor {
  constructor(budgetMs = 50) {
    this.budget = budgetMs;
  }
  
  async process(items, processFn) {
    const results = [];
    let i = 0;
    
    while (i < items.length) {
      const batchStart = performance.now();
      
      // Process items within budget
      while (i < items.length) {
        results.push(processFn(items[i]));
        i++;
        
        const elapsed = performance.now() - batchStart;
        
        // Check budget
        if (elapsed >= this.budget) {
          break;
        }
      }
      
      // Yield if more work
      if (i < items.length) {
        await this.yield();
      }
    }
    
    return results;
  }
  
  async yield() {
    // Choose yielding strategy
    if ('scheduler' in window) {
      await scheduler.yield();
    } else {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// Usage
const processor = new TimeBudgetProcessor(50); // 50ms budget

await processor.process(largeArray, item => {
  return expensiveOperation(item);
});

// Guarantees:
// - No single task exceeds 50ms
// - UI stays responsive
// - Progress can be tracked
```

#### Pattern 2: Priority Queue with Yielding

```javascript
class YieldingPriorityQueue {
  constructor() {
    this.queues = {
      urgent: [],
      high: [],
      normal: [],
      low: []
    };
    this.processing = false;
  }
  
  enqueue(task, priority = 'normal') {
    if (!this.queues[priority]) {
      throw new Error(`Invalid priority: ${priority}`);
    }
    
    this.queues[priority].push(task);
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  async processQueue() {
    this.processing = true;
    
    const priorities = ['urgent', 'high', 'normal', 'low'];
    
    while (this.hasWork()) {
      const batchStart = performance.now();
      const batchBudget = 50; // 50ms per batch
      
      // Check for input
      if (navigator.scheduling?.isInputPending()) {
        await scheduler.yield();
        continue;
      }
      
      // Process highest priority tasks within budget
      let processed = false;
      
      for (const priority of priorities) {
        const queue = this.queues[priority];
        
        while (queue.length > 0) {
          const task = queue.shift();
          await task();
          processed = true;
          
          const elapsed = performance.now() - batchStart;
          
          // Budget exhausted?
          if (elapsed >= batchBudget) {
            break;
          }
          
          // Check for user input
          if (navigator.scheduling?.isInputPending()) {
            break;
          }
        }
        
        // If we processed something and ran out of budget, yield
        if (processed && performance.now() - batchStart >= batchBudget) {
          await this.yield();
          break;
        }
      }
      
      // Yield between batches
      if (this.hasWork()) {
        await this.yield();
      }
    }
    
    this.processing = false;
  }
  
  hasWork() {
    return Object.values(this.queues).some(q => q.length > 0);
  }
  
  async yield() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}

// Usage
const queue = new YieldingPriorityQueue();

// User clicked button (urgent)
button.addEventListener('click', () => {
  queue.enqueue(async () => {
    await handleButtonClick();
  }, 'urgent');
});

// Data processing (normal)
queue.enqueue(async () => {
  await processData();
}, 'normal');

// Analytics (low)
queue.enqueue(async () => {
  await sendAnalytics();
}, 'low');
```

#### Pattern 3: Cooperative Multitasking

```javascript
// Generator-based yielding
function* processIncrementally(items) {
  for (let i = 0; i < items.length; i++) {
    yield processItem(items[i]);
  }
}

async function runWithYield(generator) {
  const results = [];
  const batchSize = 50;
  let count = 0;
  
  for (const result of generator) {
    results.push(result);
    count++;
    
    // Yield every batchSize items
    if (count % batchSize === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
      updateProgress(count);
    }
  }
  
  return results;
}

// Usage
const generator = processIncrementally(largeArray);
const results = await runWithYield(generator);

// Advanced: Pausable/Resumable processing
class PausableProcessor {
  constructor(items, processFn) {
    this.items = items;
    this.processFn = processFn;
    this.index = 0;
    this.results = [];
    this.paused = false;
    this.cancelled = false;
  }
  
  async start() {
    while (this.index < this.items.length && !this.cancelled) {
      // Check if paused
      if (this.paused) {
        await this.waitForResume();
      }
      
      // Process item
      const result = await this.processFn(this.items[this.index]);
      this.results.push(result);
      this.index++;
      
      // Yield periodically
      if (this.index % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        this.onProgress?.(this.index / this.items.length);
      }
    }
    
    return this.cancelled ? null : this.results;
  }
  
  pause() {
    this.paused = true;
  }
  
  resume() {
    this.paused = false;
    this.resumeResolve?.();
  }
  
  cancel() {
    this.cancelled = true;
    this.resume(); // Unblock if paused
  }
  
  async waitForResume() {
    return new Promise(resolve => {
      this.resumeResolve = resolve;
    });
  }
}

// Usage
const processor = new PausableProcessor(
  largeArray,
  async (item) => expensiveOperation(item)
);

processor.onProgress = (progress) => {
  console.log(`Progress: ${(progress * 100).toFixed(1)}%`);
};

// Start processing
const resultsPromise = processor.start();

// User wants to pause
pauseButton.addEventListener('click', () => {
  processor.pause();
});

// Resume
resumeButton.addEventListener('click', () => {
  processor.resume();
});

// Cancel
cancelButton.addEventListener('click', () => {
  processor.cancel();
});
```

### 5. Measuring Yield Effectiveness

```javascript
class YieldMetrics {
  constructor() {
    this.totalTasks = 0;
    this.longTasks = 0;
    this.maxTaskDuration = 0;
    this.totalBlockingTime = 0;
    
    this.setupObserver();
  }
  
  setupObserver() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.totalTasks++;
        
        if (entry.duration > 50) {
          this.longTasks++;
          this.maxTaskDuration = Math.max(this.maxTaskDuration, entry.duration);
          
          // Total Blocking Time = time beyond 50ms threshold
          const blockingTime = entry.duration - 50;
          this.totalBlockingTime += blockingTime;
        }
      }
    });
    
    observer.observe({ entryTypes: ['longtask'] });
  }
  
  getReport() {
    return {
      totalTasks: this.totalTasks,
      longTasks: this.longTasks,
      longTaskPercentage: ((this.longTasks / this.totalTasks) * 100).toFixed(2) + '%',
      maxTaskDuration: this.maxTaskDuration.toFixed(2) + 'ms',
      totalBlockingTime: this.totalBlockingTime.toFixed(2) + 'ms',
      avgBlockingTimePerLongTask: (this.totalBlockingTime / this.longTasks).toFixed(2) + 'ms',
      
      // Grade
      grade: this.getGrade()
    };
  }
  
  getGrade() {
    if (this.longTasks === 0) return 'A+ (Perfect)';
    
    const percentage = (this.longTasks / this.totalTasks) * 100;
    
    if (percentage < 5) return 'A (Excellent)';
    if (percentage < 10) return 'B (Good)';
    if (percentage < 20) return 'C (Needs Improvement)';
    return 'F (Poor)';
  }
  
  reset() {
    this.totalTasks = 0;
    this.longTasks = 0;
    this.maxTaskDuration = 0;
    this.totalBlockingTime = 0;
  }
}

// Usage
const metrics = new YieldMetrics();

// After user session
setTimeout(() => {
  console.table(metrics.getReport());
}, 30000); // 30 second sample

// Example output:
// ┌──────────────────────────────┬──────────┐
// │ Metric                       │ Value    │
// ├──────────────────────────────┼──────────┤
// │ totalTasks                   │ 847      │
// │ longTasks                    │ 12       │
// │ longTaskPercentage           │ 1.42%    │
// │ maxTaskDuration              │ 147.32ms │
// │ totalBlockingTime            │ 892.44ms │
// │ avgBlockingTimePerLongTask   │ 74.37ms  │
// │ grade                        │ A        │
// └──────────────────────────────┴──────────┘
```

---

## Real-World Production Examples

### Example 1: Spreadsheet Application (Heavy Computation)

**Problem**: Recalculating formulas in large spreadsheet (1000+ cells) blocks UI for 3+ seconds.

```javascript
// BAD: No yielding
function recalculateAllCells(cells) {
  console.time('Recalculation');
  
  cells.forEach(cell => {
    if (cell.formula) {
      cell.value = evaluateFormula(cell.formula);
      cell.element.textContent = cell.value;
    }
  });
  
  console.timeEnd('Recalculation'); // 3200ms
  // UI frozen entire time ❌
}

// User experience:
// 1. User clicks cell
// 2. UI freezes for 3+ seconds
// 3. User thinks app crashed
// 4. User clicks repeatedly (making it worse)
// 5. Finally updates, but too late
```

**Solution: Yielding with Progress**

```javascript
class SpreadsheetRecalculator {
  constructor(cells) {
    this.cells = cells;
    this.cancelled = false;
  }
  
  async recalculate() {
    const startTime = performance.now();
    const chunkSize = 50; // Process 50 cells at a time
    const totalCells = this.cells.length;
    
    for (let i = 0; i < totalCells; i += chunkSize) {
      if (this.cancelled) {
        console.log('Recalculation cancelled');
        return null;
      }
      
      // Process chunk
      const chunk = this.cells.slice(i, i + chunkSize);
      
      for (const cell of chunk) {
        if (cell.formula) {
          cell.value = evaluateFormula(cell.formula);
          cell.element.textContent = cell.value;
        }
      }
      
      // Update progress
      const progress = Math.min(i + chunkSize, totalCells) / totalCells;
      this.updateProgress(progress);
      
      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    const duration = performance.now() - startTime;
    console.log(`Recalculation complete in ${duration.toFixed(0)}ms`);
    
    return duration;
  }
  
  updateProgress(progress) {
    const percent = (progress * 100).toFixed(0);
    const progressBar = document.getElementById('calc-progress');
    const progressText = document.getElementById('calc-text');
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.textContent = `Recalculating... ${percent}%`;
  }
  
  cancel() {
    this.cancelled = true;
  }
}

// Usage
const recalculator = new SpreadsheetRecalculator(allCells);

// Start recalculation
const recalcButton = document.getElementById('recalc-btn');
recalcButton.addEventListener('click', async () => {
  recalcButton.disabled = true;
  showProgressBar();
  
  await recalculator.recalculate();
  
  hideProgressBar();
  recalcButton.disabled = false;
});

// Allow cancellation
const cancelButton = document.getElementById('cancel-btn');
cancelButton.addEventListener('click', () => {
  recalculator.cancel();
});

// Result:
// - Total time: ~3500ms (slightly longer due to yields)
// - But UI responsive throughout!
// - User can cancel if needed
// - Progress feedback reduces perceived wait time
// - No "frozen app" experience
```

### Example 2: Image Gallery with Lazy Processing

**Problem**: Processing 1000 images for thumbnail generation blocks main thread.

```javascript
// BAD: Process all images immediately
async function generateAllThumbnails(images) {
  const thumbnails = [];
  
  for (const image of images) {
    const thumb = await generateThumbnail(image); // 20ms each
    thumbnails.push(thumb);
  }
  
  return thumbnails;
  // 1000 × 20ms = 20,000ms (20 seconds) blocked ❌
}
```

**Solution: Intelligent Yielding with Priorities**

```javascript
class ThumbnailGenerator {
  constructor(images) {
    this.images = images;
    this.thumbnails = new Map();
    this.visibleIndices = new Set();
    this.processing = false;
  }
  
  // Mark images as visible (priority)
  setVisibleImages(startIndex, endIndex) {
    this.visibleIndices.clear();
    for (let i = startIndex; i <= endIndex; i++) {
      this.visibleIndices.add(i);
    }
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  async processQueue() {
    this.processing = true;
    
    // Process visible images first
    await this.processSet(this.visibleIndices, 'high-priority');
    
    // Then process remaining images
    const remainingIndices = new Set();
    for (let i = 0; i < this.images.length; i++) {
      if (!this.thumbnails.has(i) && !this.visibleIndices.has(i)) {
        remainingIndices.add(i);
      }
    }
    
    await this.processSet(remainingIndices, 'low-priority');
    
    this.processing = false;
  }
  
  async processSet(indices, priority) {
    const indexArray = Array.from(indices);
    
    for (let i = 0; i < indexArray.length; i++) {
      const index = indexArray[i];
      
      // Skip if already processed
      if (this.thumbnails.has(index)) continue;
      
      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(this.images[index]);
      this.thumbnails.set(index, thumbnail);
      
      // Emit event
      this.onThumbnailReady?.(index, thumbnail);
      
      // Yield based on priority
      if (priority === 'high-priority') {
        // Yield less frequently for visible images
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } else {
        // Yield more frequently for background processing
        if (i % 2 === 0) {
          await new Promise(resolve => requestIdleCallback(resolve));
        }
      }
    }
  }
  
  async generateThumbnail(image) {
    // Simulate thumbnail generation
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 200;
      canvas.height = 150;
      
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 200, 150);
        resolve(canvas.toDataURL());
      };
      img.src = image.src;
    });
  }
  
  getThumbnail(index) {
    return this.thumbnails.get(index);
  }
}

// Usage
const generator = new ThumbnailGenerator(allImages);

// When user scrolls, update visible range
scrollContainer.addEventListener('scroll', debounce(() => {
  const startIndex = Math.floor(scrollContainer.scrollTop / itemHeight);
  const endIndex = startIndex + visibleItemCount;
  
  generator.setVisibleImages(startIndex, endIndex);
}, 100));

// Listen for thumbnails
generator.onThumbnailReady = (index, thumbnail) => {
  const img = document.querySelector(`[data-index="${index}"] img`);
  if (img) img.src = thumbnail;
};

// Result:
// - Visible images: thumbnails ready in ~200ms
// - Invisible images: processed in background
// - UI stays responsive
// - Users see content immediately
```

### Example 3: Search Filter with Live Results

**Problem**: Filtering 50,000 products on every keystroke causes UI freezes.

```javascript
// BAD: Filter entire dataset on every keystroke
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  
  // Blocks for ~300ms with 50,000 products
  const results = products.filter(product => {
    return product.name.toLowerCase().includes(query) ||
           product.description.toLowerCase().includes(query) ||
           product.category.toLowerCase().includes(query);
  });
  
  displayResults(results);
});

// Typing "laptop" (6 keystrokes):
// l     -> 300ms freeze
// la    -> 300ms freeze
// lap   -> 300ms freeze
// lapt  -> 300ms freeze
// lapto -> 300ms freeze
// laptop-> 300ms freeze
// Total: 1800ms of freezing while typing ❌
```

**Solution: Debounced + Yielding + Progressive Results**

```javascript
class ProgressiveSearch {
  constructor(dataset, searchFn) {
    this.dataset = dataset;
    this.searchFn = searchFn;
    this.currentQuery = '';
    this.currentController = null;
  }
  
  async search(query, onProgress) {
    // Cancel previous search
    if (this.currentController) {
      this.currentController.cancel();
    }
    
    this.currentQuery = query;
    this.currentController = new SearchController();
    
    const results = [];
    const chunkSize = 500;
    
    for (let i = 0; i < this.dataset.length; i += chunkSize) {
      // Check if cancelled
      if (this.currentController.cancelled) {
        return null;
      }
      
      // Process chunk
      const chunk = this.dataset.slice(i, i + chunkSize);
      const chunkResults = chunk.filter(item => 
        this.searchFn(item, query)
      );
      
      results.push(...chunkResults);
      
      // Show progressive results
      if (chunkResults.length > 0) {
        onProgress?.(results.slice()); // Send copy
      }
      
      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }
}

class SearchController {
  constructor() {
    this.cancelled = false;
  }
  
  cancel() {
    this.cancelled = true;
  }
}

// Setup
const searcher = new ProgressiveSearch(
  products,
  (product, query) => {
    const q = query.toLowerCase();
    return product.name.toLowerCase().includes(q) ||
           product.description.toLowerCase().includes(q) ||
           product.category.toLowerCase().includes(q);
  }
);

// Debounced search
const debouncedSearch = debounce(async (query) => {
  if (!query) {
    displayResults([]);
    return;
  }
  
  showSearching();
  
  await searcher.search(query, (progressResults) => {
    // Show results as they come in
    displayResults(progressResults);
  });
  
  hideSearching();
}, 300); // Wait 300ms after last keystroke

// Wire up input
searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});

// Result:
// Typing "laptop":
// - No freezes during typing ✅
// - Waits 300ms after last keystroke
// - Shows results progressively (10-20ms between updates)
// - Can cancel if user types more
// - First results visible in ~50ms
// - All results in ~1000ms (spread out)

// Helper: Simple debounce
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

### Example 4: Data Import with Validation

**Problem**: Importing and validating 10,000 CSV rows blocks UI for 5+ seconds.

```javascript
// BAD: Process all rows at once
function importCSV(csvData) {
  const rows = parseCSV(csvData); // Fast
  const errors = [];
  const validRows = [];
  
  // Validation blocks for 5+ seconds
  rows.forEach((row, index) => {
    const validation = validateRow(row);
    
    if (validation.isValid) {
      validRows.push(row);
    } else {
      errors.push({ row: index + 1, errors: validation.errors });
    }
  });
  
  return { validRows, errors };
  // UI completely frozen during validation ❌
}
```

**Solution: Yielding with Real-Time Feedback**

```javascript
class CSVImporter {
  constructor() {
    this.cancelled = false;
  }
  
  async import(csvData, callbacks = {}) {
    const rows = parseCSV(csvData);
    const totalRows = rows.length;
    
    const results = {
      validRows: [],
      errors: [],
      warnings: []
    };
    
    const chunkSize = 100;
    const batchBudget = 50; // 50ms max per batch
    
    for (let i = 0; i < totalRows; i += chunkSize) {
      if (this.cancelled) {
        callbacks.onCancel?.();
        return null;
      }
      
      const batchStart = performance.now();
      const chunk = rows.slice(i, i + chunkSize);
      
      // Process chunk
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const rowIndex = i + j;
        
        // Validate row
        const validation = this.validateRow(row, rowIndex);
        
        if (validation.isValid) {
          results.validRows.push(row);
        } else {
          results.errors.push({
            row: rowIndex + 1,
            errors: validation.errors
          });
        }
        
        if (validation.warnings.length > 0) {
          results.warnings.push({
            row: rowIndex + 1,
            warnings: validation.warnings
          });
        }
        
        // Check time budget
        const elapsed = performance.now() - batchStart;
        if (elapsed > batchBudget) {
          // Adjust chunk size for next iteration
          chunkSize = Math.max(10, Math.floor(j * 0.8));
          break;
        }
      }
      
      // Progress callback
      const progress = Math.min(i + chunkSize, totalRows) / totalRows;
      callbacks.onProgress?.({
        progress,
        processed: Math.min(i + chunkSize, totalRows),
        total: totalRows,
        validCount: results.validRows.length,
        errorCount: results.errors.length
      });
      
      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    callbacks.onComplete?.(results);
    return results;
  }
  
  validateRow(row, index) {
    const errors = [];
    const warnings = [];
    
    // Example validations
    if (!row.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(row.email)) {
      errors.push('Invalid email format');
    }
    
    if (!row.name || row.name.length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    
    if (row.age && (row.age < 0 || row.age > 150)) {
      warnings.push('Age seems unusual');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  cancel() {
    this.cancelled = true;
  }
}

// Usage
const importer = new CSVImporter();

importButton.addEventListener('click', async () => {
  const fileInput = document.getElementById('csv-file');
  const file = fileInput.files[0];
  
  if (!file) return;
  
  const csvData = await file.text();
  
  // Show progress UI
  const progressModal = showProgressModal();
  
  const results = await importer.import(csvData, {
    onProgress: ({ progress, processed, total, validCount, errorCount }) => {
      updateProgressBar(progress * 100);
      updateProgressText(
        `Processing ${processed}/${total} rows\n` +
        `✅ Valid: ${validCount}\n` +
        `❌ Errors: ${errorCount}`
      );
    },
    
    onComplete: (results) => {
      hideProgressModal();
      showResultsSummary(results);
    },
    
    onCancel: () => {
      hideProgressModal();
      showNotification('Import cancelled');
    }
  });
});

// Cancel button
cancelButton.addEventListener('click', () => {
  importer.cancel();
});

// Result:
// - 10,000 rows imported in ~6 seconds (vs 5 seconds blocking)
// - UI responsive throughout
// - Real-time progress updates
// - User can cancel anytime
// - Live statistics (valid/error counts)
// - Much better UX despite slightly longer total time
```

---

## Interview-Oriented Deep Dive

### Common Interview Questions

#### Q1: "What is a long task and how do you detect them?"

**Complete Answer:**
```
A long task is any uninterrupted JavaScript execution that blocks the main 
thread for 50ms or more.

Why 50ms?
- Based on RAIL performance model
- Users perceive delays at 100ms
- Need 50ms buffer for browser work (rendering, input)
- Industry standard threshold

Detection Methods:

1. Long Tasks API (Best)
   const observer = new PerformanceObserver((list) => {
     for (const entry of list.getEntries()) {
       console.log('Long task:', entry.duration);
     }
   });
   observer.observe({ entryTypes: ['longtask'] });

2. Performance.measure()
   performance.mark('start');
   heavyOperation();
   performance.mark('end');
   performance.measure('op', 'start', 'end');

3. Chrome DevTools
   - Performance tab
   - Red triangles indicate long tasks
   - Shows call stacks and attribution

4. Web Vitals Library
   import {onINP} from 'web-vitals';
   onINP(console.log);

Impact on Core Web Vitals:
- Long tasks directly increase INP (Interaction to Next Paint)
- INP > 200ms = needs improvement
- INP > 500ms = poor
- Long tasks during interactions = poor INP score
```

#### Q2: "Explain different yielding strategies and when to use each"

**Complete Answer:**
```
Four main yielding strategies:

1. setTimeout(fn, 0)
   When: General-purpose yielding
   How: Adds to macrotask queue, min 4ms delay
   Pros: Universal browser support, simple
   Cons: 4ms minimum delay even with 0
   
   await new Promise(r => setTimeout(r, 0));

2. requestAnimationFrame(fn)
   When: Visual updates, animations
   How: Runs before next paint, synced with display refresh
   Pros: Smooth visuals, pauses when tab hidden
   Cons: Only runs at display refresh rate (~16ms)
   
   await new Promise(r => requestAnimationFrame(r));

3. requestIdleCallback(fn)
   When: Low-priority background work
   How: Runs during browser idle time
   Pros: Doesn't interfere with critical work
   Cons: May never run if never idle, needs timeout
   
   await new Promise(r => requestIdleCallback(r, {timeout: 1000}));

4. scheduler.yield() (Chrome 94+)
   When: Modern applications, fine-grained control
   How: Intelligent yielding with priorities
   Pros: Best performance, input detection
   Cons: Limited browser support
   
   await scheduler.yield();

Priority Order (what runs first):
1. Microtasks (Promise.then)
2. User input events
3. requestAnimationFrame
4. Rendering
5. setTimeout (macrotasks)
6. requestIdleCallback (when idle)

Choosing Strategy:
- Visible work → requestAnimationFrame
- User-triggered work → setTimeout(0) or scheduler.yield()
- Background work → requestIdleCallback
- Universal compatibility → setTimeout(0)
```

**Code Comparison:**
```javascript
// Compare all strategies
async function compareYieldStrategies() {
  const strategies = {
    setTimeout: () => new Promise(r => setTimeout(r, 0)),
    rAF: () => new Promise(r => requestAnimationFrame(r)),
    rIC: () => new Promise(r => requestIdleCallback(r)),
    scheduler: () => scheduler.yield()
  };
  
  for (const [name, yieldFn] of Object.entries(strategies)) {
    const start = performance.now();
    await yieldFn();
    const duration = performance.now() - start;
    console.log(`${name}: ${duration.toFixed(2)}ms`);
  }
}

// Example output:
// setTimeout: 4.23ms
// rAF: 16.67ms (next frame)
// rIC: 8.45ms (idle time available)
// scheduler: 0.12ms (most efficient)
```

#### Q3: "How would you optimize processing 100,000 items without blocking?"

**Complete Answer:**
```
Comprehensive strategy with multiple techniques:

1. Chunk Processing
   - Break into smaller batches (50-100 items)
   - Process one batch per event loop iteration
   - Yield between batches

2. Time Budgeting
   - Set maximum time per batch (50ms)
   - Measure elapsed time
   - Yield when budget exhausted

3. Priority-Based
   - Process visible/critical items first
   - Defer non-critical items
   - Use requestIdleCallback for background

4. Web Workers
   - Offload CPU-intensive work
   - Keep main thread responsive
   - Transfer results when ready

5. Progressive Enhancement
   - Show partial results immediately
   - Enhance incrementally
   - Provide progress feedback

Implementation:
```

```javascript
class OptimizedProcessor {
  async process(items) {
    // Strategy 1: Visible items first
    const visible = items.filter(item => item.isVisible);
    const hidden = items.filter(item => !item.isVisible);
    
    // Strategy 2: Time-budgeted chunks
    const results = [];
    const chunkSize = 100;
    const timeBudget = 50;
    
    // Process visible items (high priority)
    for (let i = 0; i < visible.length; i += chunkSize) {
      const batchStart = performance.now();
      
      for (let j = i; j < i + chunkSize && j < visible.length; j++) {
        results.push(this.processItem(visible[j]));
        
        if (performance.now() - batchStart > timeBudget) {
          break;
        }
      }
      
      // Yield with rAF (visual updates)
      await new Promise(r => requestAnimationFrame(r));
      this.updateProgress(results.length / items.length);
    }
    
    // Process hidden items (low priority)
    for (let i = 0; i < hidden.length; i += chunkSize) {
      const chunk = hidden.slice(i, i + chunkSize);
      
      for (const item of chunk) {
        results.push(this.processItem(item));
      }
      
      // Yield with rIC (background)
      await new Promise(r => requestIdleCallback(r));
    }
    
    return results;
  }
  
  // Strategy 3: Web Worker for heavy work
  async processHeavy(items) {
    const worker = new Worker('processor.js');
    
    return new Promise((resolve) => {
      worker.postMessage({ items });
      
      worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
          this.updateProgress(e.data.progress);
        } else if (e.data.type === 'complete') {
          resolve(e.data.results);
          worker.terminate();
        }
      };
    });
  }
}

// Result: 100,000 items processed in ~2-3 seconds
// UI responsive throughout
// Progress feedback provided
// Critical items processed first
```

#### Q4: "How do you handle user interactions during long-running tasks?"

**Complete Answer:**
```
Key principle: User interactions must always take priority.

Strategies:

1. Detect Pending Input
   if (navigator.scheduling?.isInputPending()) {
     await scheduler.yield();
   }

2. Pausable Processing
   - Allow immediate pause
   - Resume when user done
   - Cancel if needed

3. Priority Queues
   - Urgent: User interactions
   - High: Visual updates
   - Normal: Data processing
   - Low: Background tasks

4. Debouncing/Throttling
   - Reduce update frequency
   - Batch related operations
   - Avoid redundant work

5. Feedback
   - Show progress indicators
   - Provide cancel buttons
   - Display remaining time

Complete Implementation:
```

```javascript
class InteractionAwareProcessor {
  constructor() {
    this.queue = {
      urgent: [],
      high: [],
      normal: [],
      low: []
    };
    this.paused = false;
    this.processing = false;
  }
  
  // Add task with priority
  enqueue(task, priority = 'normal') {
    this.queue[priority].push(task);
    if (!this.processing) this.process();
  }
  
  async process() {
    this.processing = true;
    const priorities = ['urgent', 'high', 'normal', 'low'];
    
    while (this.hasWork()) {
      // Check for pause
      if (this.paused) {
        await this.waitForResume();
      }
      
      // Check for user input (highest priority)
      if (navigator.scheduling?.isInputPending()) {
        await scheduler.yield();
        continue;
      }
      
      // Process with time budget
      const batchStart = performance.now();
      const budget = 50;
      
      for (const priority of priorities) {
        const queue = this.queue[priority];
        
        while (queue.length > 0) {
          await queue.shift()();
          
          // Check input between tasks
          if (navigator.scheduling?.isInputPending()) {
            break;
          }
          
          // Check time budget
          if (performance.now() - batchStart > budget) {
            break;
          }
        }
        
        if (performance.now() - batchStart > budget) {
          break;
        }
      }
      
      // Yield
      await scheduler.yield();
    }
    
    this.processing = false;
  }
  
  pause() {
    this.paused = true;
  }
  
  resume() {
    this.paused = false;
    this.resumeResolve?.();
  }
  
  async waitForResume() {
    return new Promise(r => this.resumeResolve = r);
  }
  
  hasWork() {
    return Object.values(this.queue).some(q => q.length > 0);
  }
}

// Usage: User interactions get immediate priority
const processor = new InteractionAwareProcessor();

// User clicks button (urgent)
button.addEventListener('click', () => {
  processor.enqueue(async () => {
    await handleClick();
  }, 'urgent');
});

// Background data sync (low)
processor.enqueue(async () => {
  await syncData();
}, 'low');

// Result:
// - Clicks always respond immediately
// - Background work pauses for interactions
// - No frozen UI ever
// - Smooth user experience
```

---

## Why This Matters & How to Apply

### Core Principles

1. **Never block for > 50ms** - Break work into chunks
2. **Yield strategically** - Choose right yielding method
3. **Prioritize user input** - Interactions come first
4. **Provide feedback** - Show progress, allow cancellation
5. **Measure impact** - Use Long Tasks API and INP

### Mental Model

```
Main Thread = Restaurant with One Chef
------------------------------------------
Long Task = Chef makes 1000 dishes without serving any
Yielding = Chef makes 10 dishes, serves them, repeats
Web Worker = Hire additional chef for prep work
Priority = VIP customers get served first
Feedback = Display "Your food is being prepared"
```

### Decision Framework

**Should I yield?**
```
Will this operation take > 50ms?
├─ Yes → MUST yield
│   └─ How to yield?
│       ├─ Visual update? → requestAnimationFrame
│       ├─ Background? → requestIdleCallback
│       └─ General? → setTimeout(0) or scheduler.yield()
└─ No → No yielding needed (< 50ms is safe)
```

**How often to yield?**
```
Operation Type:
├─ User-triggered → Every 50ms or 50-100 items
├─ Background → Every 100-200 items or use rIC
└─ Visual → Every animation frame (rAF)
```

### Production Checklist

**Before Shipping:**
- [ ] No long tasks > 50ms during interactions
- [ ] Progress indicators for operations > 1 second
- [ ] Cancel buttons for operations > 3 seconds
- [ ] INP score < 200ms (Web Vitals)
- [ ] Long Tasks API monitoring in place
- [ ] Yielding tested on low-end devices

**Monitoring:**
```javascript
// Track long tasks in production
const longTaskMonitor = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 100) { // Critical threshold
      analytics.track('critical-long-task', {
        duration: entry.duration,
        attribution: entry.attribution[0],
        url: window.location.href,
        timestamp: Date.now()
      });
    }
  }
});

longTaskMonitor.observe({ entryTypes: ['longtask'] });
```

### Common Mistakes

❌ **Mistake 1: Yielding too frequently**
```javascript
// BAD: Yield after every item (too much overhead)
for (const item of items) {
  processItem(item);
  await new Promise(r => setTimeout(r, 0)); // 4ms overhead each!
}
```

✅ **Fix: Yield in batches**
```javascript
for (let i = 0; i < items.length; i++) {
  processItem(items[i]);
  if (i % 50 === 0) {
    await new Promise(r => setTimeout(r, 0));
  }
}
```

❌ **Mistake 2: Not measuring impact**
```javascript
// BAD: Assume it's fast enough
function processData(data) {
  data.forEach(item => heavyOperation(item));
}
```

✅ **Fix: Measure and optimize**
```javascript
async function processData(data) {
  const start = performance.now();
  
  for (let i = 0; i < data.length; i += 50) {
    const batchStart = performance.now();
    
    for (let j = i; j < i + 50 && j < data.length; j++) {
      heavyOperation(data[j]);
    }
    
    const batchDuration = performance.now() - batchStart;
    
    if (batchDuration > 50) {
      console.warn(`Batch took ${batchDuration}ms, adjust chunk size`);
    }
    
    await new Promise(r => setTimeout(r, 0));
  }
  
  console.log(`Total: ${performance.now() - start}ms`);
}
```

❌ **Mistake 3: Blocking during user interactions**
```javascript
// BAD: Process on every keystroke
input.addEventListener('input', (e) => {
  const results = expensiveSearch(e.target.value); // 200ms
  displayResults(results);
});
```

✅ **Fix: Debounce + yield**
```javascript
input.addEventListener('input', debounce(async (e) => {
  const results = await searchWithYield(e.target.value);
  displayResults(results);
}, 300));
```

### Performance Impact

**Metrics:**
- **INP**: Target < 200ms (Good), < 100ms (Great)
- **Long Task Count**: Target 0 during interactions
- **Total Blocking Time**: Target < 300ms
- **Max Task Duration**: Target < 50ms

**Business Impact:**
- Each 100ms INP improvement: +1-2% conversion
- Eliminating long tasks: +20-40% engagement
- Responsive UI: -15-25% bounce rate
- Progress feedback: +30% completion rates

---

## Summary & Key Takeaways

### Critical Concepts

1. **Long task = ≥50ms** uninterrupted execution
2. **Yielding = Giving browser control** between chunks
3. **Four yielding methods**: setTimeout, rAF, rIC, scheduler
4. **User input always wins** - detect and prioritize
5. **Measure everything** - Long Tasks API, INP, DevTools
6. **Feedback is critical** - Progress bars, cancellation
7. **Chunk intelligently** - Balance overhead vs responsiveness

### Quick Reference

| Scenario | Yielding Method | Chunk Size | Why |
|----------|----------------|------------|-----|
| Visual updates | requestAnimationFrame | 50-100 items | Synced with display |
| Background work | requestIdleCallback | 100-200 items | Uses idle time |
| User-triggered | setTimeout(0) | 50-100 items | Universal support |
| Modern apps | scheduler.yield() | Dynamic | Input detection |
| Heavy computation | Web Worker | N/A | Off main thread |

### Interview Success Formula

1. **Define long task** - 50ms threshold, why it matters
2. **Explain impact** - Frozen UI, poor INP, bad UX
3. **Show detection** - Long Tasks API, DevTools
4. **Demonstrate yielding** - Code examples for each method
5. **Discuss priorities** - User input first always
6. **Mention monitoring** - Production tracking
7. **Real-world examples** - Spreadsheets, search, imports

### One-Sentence Summary

> Long tasks block the main thread for ≥50ms, freezing the UI; yielding control with setTimeout, requestAnimationFrame, or requestIdleCallback breaks work into responsive chunks that keep the interface interactive.

---

**Related Topics:**
- [78. Main Thread Scheduling](./78_Main_Thread_Scheduling.md)
- [80. Interaction to Next Paint (INP)](./80_Interaction_to_Next_Paint.md)
- [81. Avoiding Layout Thrashing](./81_Avoiding_Layout_Thrashing.md)
- [13. Event Loop (Microtasks vs Macrotasks)](../../PART%202️⃣%20—%20Browser%20&%20Web%20Platform%20Internals/Module%202.2%20—%20JavaScript%20Execution/13_Event_Loop_Microtasks_vs_Macrotasks.md)
