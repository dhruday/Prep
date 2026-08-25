# 80. Interaction to Next Paint (INP)

## High-Level Overview

Interaction to Next Paint (INP) is a Core Web Vital metric that measures the responsiveness of a web page to user interactions. It represents the time between when a user interacts with the page (clicks, taps, or presses a key) and when the browser is able to paint the next frame showing visual feedback for that interaction.

**Key Concept**: INP captures the worst-case interaction latency during a user's entire visit to your page. Unlike FID (First Input Delay) which only measured the first interaction, INP considers all interactions throughout the page lifecycle, making it a much more comprehensive responsiveness metric.

**Why It Matters:**
- **User Perception**: Delays > 200ms feel sluggish; > 500ms feels broken
- **Core Web Vital**: Officially replaced FID as the interaction responsiveness metric in March 2024
- **Real User Experience**: Measures actual user frustration, not synthetic tests
- **Revenue Impact**: Poor INP directly correlates with decreased conversions and engagement

**Real-World Impact:**
- **Vodafone**: Improved INP by 31%, increased sales by 8%
- **Rakuten**: Reduced INP to < 200ms, saw 53.4% increase in revenue per visitor
- **Redbus**: Improved INP by 40%, increased sales by 7%
- **Google**: Pages with good INP have 70% higher engagement rates

---

## Deep Technical Dive

### 1. Understanding INP

#### What INP Measures

```
User Interaction Flow:
─────────────────────────────────────────────────────────────

1. Input Delay (Time to Event Handler)
   User clicks → Browser receives event → Event handler starts
   
2. Processing Time (Event Handler Execution)
   Event handler starts → Event handler completes
   
3. Presentation Delay (Rendering)
   Event handler completes → Browser paints visual update

INP = Input Delay + Processing Time + Presentation Delay

Example:
Click button → [12ms input delay] → [145ms JS execution] → [23ms rendering] → Paint
INP = 12 + 145 + 23 = 180ms ✅ Good!

Another example:
Click button → [45ms input delay] → [520ms JS execution] → [67ms rendering] → Paint
INP = 45 + 520 + 67 = 632ms ❌ Poor!
```

#### INP Thresholds

```javascript
// Official thresholds (as of 2024)
const INP_THRESHOLDS = {
  good: 200,        // ≤ 200ms = Good (Green)
  needsImprovement: 500, // 201-500ms = Needs Improvement (Orange)
  poor: Infinity    // > 500ms = Poor (Red)
};

// Rating function
function rateINP(inpValue) {
  if (inpValue <= 200) return 'good';
  if (inpValue <= 500) return 'needs-improvement';
  return 'poor';
}

// Percentile-based reporting
// INP is measured at 75th percentile
// Meaning: 75% of interactions must be under threshold
```

#### How INP is Calculated

```javascript
// Simplified INP calculation algorithm
class INPCalculator {
  constructor() {
    this.interactions = [];
  }
  
  recordInteraction(interaction) {
    this.interactions.push({
      type: interaction.type, // 'click', 'keydown', 'tap'
      duration: interaction.duration,
      startTime: interaction.startTime,
      target: interaction.target
    });
  }
  
  calculateINP() {
    if (this.interactions.length === 0) return 0;
    
    // Sort interactions by duration
    const sorted = this.interactions
      .map(i => i.duration)
      .sort((a, b) => a - b);
    
    // Get 75th percentile (or worst if < 50 interactions)
    let index;
    if (this.interactions.length < 50) {
      // Use worst interaction
      index = sorted.length - 1;
    } else {
      // Use 75th percentile
      index = Math.floor(sorted.length * 0.75);
    }
    
    return sorted[index];
  }
  
  getWorstInteractions(count = 10) {
    return this.interactions
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }
}

// Browser automatically tracks INP via PerformanceObserver
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Interaction:', {
      type: entry.name, // 'click', 'keydown', 'pointerdown'
      duration: entry.duration, // Total INP time
      startTime: entry.startTime,
      processingStart: entry.processingStart,
      processingEnd: entry.processingEnd,
      target: entry.target // DOM element
    });
  }
});

observer.observe({ 
  type: 'event',
  durationThreshold: 16, // Only track interactions > 16ms
  buffered: true 
});
```

### 2. Three Phases of INP

#### Phase 1: Input Delay

```javascript
// Input Delay = Time from user action to event handler start

// CAUSES OF HIGH INPUT DELAY:

// 1. Main thread busy with long task
function longRunningTask() {
  // This blocks the main thread for 500ms
  const start = Date.now();
  while (Date.now() - start < 500) {
    // Busy loop
  }
}

// User clicks during this task → Input delayed by up to 500ms ❌

// 2. Too many event listeners
document.querySelectorAll('.item').forEach(item => {
  item.addEventListener('click', handler); // 10,000 listeners = slower dispatch
});

// 3. Heavy rendering in progress
function triggerExpensiveLayout() {
  // Force synchronous layout calculations
  for (let i = 0; i < 1000; i++) {
    element.style.width = i + 'px';
    const width = element.offsetWidth; // Forces layout
  }
}

// SOLUTIONS:

// 1. Avoid long tasks (break into chunks)
async function optimizedTask() {
  const chunkSize = 50;
  for (let i = 0; i < 1000; i += chunkSize) {
    processChunk(i, i + chunkSize);
    
    // Yield to browser
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

// 2. Use event delegation
// Instead of 10,000 listeners:
document.getElementById('container').addEventListener('click', (e) => {
  if (e.target.matches('.item')) {
    handleItemClick(e.target);
  }
});

// 3. Batch layout operations
function optimizedLayout() {
  // Read all at once
  const measurements = Array.from(elements).map(el => ({
    width: el.offsetWidth,
    height: el.offsetHeight
  }));
  
  // Write all at once (no interleaving)
  measurements.forEach((m, i) => {
    elements[i].style.width = m.width + 10 + 'px';
    elements[i].style.height = m.height + 10 + 'px';
  });
}
```

#### Phase 2: Processing Time (Event Handlers)

```javascript
// Processing Time = Event handler execution duration

// CAUSES OF HIGH PROCESSING TIME:

// 1. Expensive synchronous operations
button.addEventListener('click', () => {
  // Bad: Expensive sync operation (300ms)
  const results = processLargeDataset(data);
  updateUI(results);
  
  // Total: 300ms processing time ❌
});

// 2. Multiple state updates in React
function ExpensiveComponent() {
  const [state1, setState1] = useState();
  const [state2, setState2] = useState();
  const [state3, setState3] = useState();
  
  const handleClick = () => {
    // Bad: 3 separate renders
    setState1(newValue1);
    setState2(newValue2);
    setState3(newValue3);
    // Each setState can trigger re-render
  };
}

// 3. Complex DOM manipulations
button.addEventListener('click', () => {
  // Bad: Multiple DOM operations
  for (let i = 0; i < 1000; i++) {
    const div = document.createElement('div');
    div.textContent = `Item ${i}`;
    container.appendChild(div); // Forces layout each time!
  }
});

// SOLUTIONS:

// 1. Defer non-critical work
button.addEventListener('click', async () => {
  // Immediate: Update UI optimistically
  showLoadingState();
  
  // Defer: Heavy processing
  await new Promise(resolve => setTimeout(resolve, 0));
  const results = await processLargeDataset(data);
  
  updateUI(results);
});

// 2. Batch state updates (React 18+)
import { startTransition } from 'react';

function OptimizedComponent() {
  const handleClick = () => {
    // Urgent: Show immediate feedback
    setLoading(true);
    
    // Non-urgent: Batch these updates
    startTransition(() => {
      setState1(newValue1);
      setState2(newValue2);
      setState3(newValue3);
    });
  };
}

// 3. Use DocumentFragment
button.addEventListener('click', () => {
  const fragment = document.createDocumentFragment();
  
  // Build DOM tree in memory
  for (let i = 0; i < 1000; i++) {
    const div = document.createElement('div');
    div.textContent = `Item ${i}`;
    fragment.appendChild(div);
  }
  
  // Single DOM operation
  container.appendChild(fragment); // Much faster! ✅
});

// 4. Debounce expensive operations
const debouncedHandler = debounce((value) => {
  expensiveOperation(value);
}, 300);

input.addEventListener('input', (e) => {
  // Immediate: Update input value
  setValue(e.target.value);
  
  // Deferred: Expensive work
  debouncedHandler(e.target.value);
});
```

#### Phase 3: Presentation Delay (Rendering)

```javascript
// Presentation Delay = Time from handler completion to paint

// CAUSES OF HIGH PRESENTATION DELAY:

// 1. Forced synchronous layouts
button.addEventListener('click', () => {
  // Set property
  element.style.width = '200px';
  
  // Read layout property (forces immediate layout!)
  const height = element.offsetHeight; // ❌ Forces layout
  
  // More changes
  element.style.height = height + 100 + 'px';
});

// 2. Complex CSS selectors
button.addEventListener('click', () => {
  // Adding class triggers style recalculation
  element.classList.add('complex-styles');
  
  // If CSS has expensive selectors:
  // .complex-styles div > span:nth-child(2n+1) { ... }
  // Recalculation is expensive ❌
});

// 3. Large DOM updates
button.addEventListener('click', () => {
  // Update 1000 elements
  items.forEach(item => {
    item.textContent = 'Updated'; // Each update queues render work
  });
  // Presentation delay increases with DOM size
});

// SOLUTIONS:

// 1. Batch reads and writes
button.addEventListener('click', () => {
  // Read phase
  const measurements = elements.map(el => el.offsetHeight);
  
  // Write phase
  elements.forEach((el, i) => {
    el.style.height = measurements[i] + 100 + 'px';
  });
  // Single layout, single paint ✅
});

// 2. Use CSS containment
.optimized-component {
  /* Isolate layout calculations */
  contain: layout style paint;
}

// 3. Virtualize long lists
import { FixedSizeList } from 'react-window';

// Only render visible items (constant presentation delay)
<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
>
  {Row}
</FixedSizeList>

// 4. Use content-visibility for off-screen content
.offscreen-content {
  /* Skip rendering until scrolled into view */
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}
```

### 3. Measuring INP in Production

#### Using web-vitals Library

```javascript
// Install: npm install web-vitals

import { onINP } from 'web-vitals';

// Basic tracking
onINP(console.log);

// Advanced tracking with analytics
onINP((metric) => {
  console.log('INP Metric:', {
    name: metric.name, // 'INP'
    value: metric.value, // INP in milliseconds
    rating: metric.rating, // 'good', 'needs-improvement', 'poor'
    delta: metric.delta, // Change since last report
    id: metric.id, // Unique ID
    entries: metric.entries // All interaction entries
  });
  
  // Send to analytics
  sendToAnalytics({
    event: 'web_vitals',
    metric_name: metric.name,
    metric_value: metric.value,
    metric_rating: metric.rating,
    page_url: window.location.href,
    user_agent: navigator.userAgent
  });
  
  // Log worst interactions
  if (metric.rating === 'poor') {
    const worstInteractions = metric.entries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(entry => ({
        type: entry.name,
        duration: entry.duration,
        target: entry.target,
        startTime: entry.startTime
      }));
    
    console.warn('Poor INP! Worst interactions:', worstInteractions);
    
    // Send detailed report
    sendToAnalytics({
      event: 'poor_inp',
      metric_value: metric.value,
      worst_interactions: worstInteractions
    });
  }
});

// Track attribution (what caused poor INP)
import { onINP } from 'web-vitals/attribution';

onINP((metric) => {
  console.log('INP Attribution:', {
    value: metric.value,
    rating: metric.rating,
    
    // Attribution data
    attribution: {
      interactionTarget: metric.attribution.interactionTarget, // DOM element
      interactionType: metric.attribution.interactionType, // 'click', 'keydown'
      interactionTime: metric.attribution.interactionTime,
      
      // Breakdown by phase
      inputDelay: metric.attribution.inputDelay,
      processingDuration: metric.attribution.processingDuration,
      presentationDelay: metric.attribution.presentationDelay,
      
      // Long tasks during interaction
      longAnimationFrameEntries: metric.attribution.longAnimationFrameEntries
    }
  });
  
  // Identify bottleneck
  const attr = metric.attribution;
  let bottleneck = 'unknown';
  
  if (attr.inputDelay > 100) {
    bottleneck = 'input_delay';
  } else if (attr.processingDuration > 100) {
    bottleneck = 'processing';
  } else if (attr.presentationDelay > 100) {
    bottleneck = 'presentation';
  }
  
  sendToAnalytics({
    event: 'inp_bottleneck',
    bottleneck,
    value: metric.value,
    target: attr.interactionTarget
  });
});
```

#### Custom INP Monitoring

```javascript
class INPMonitor {
  constructor() {
    this.interactions = [];
    this.setupObserver();
  }
  
  setupObserver() {
    // Use PerformanceObserver for event timing
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordInteraction(entry);
      }
    });
    
    observer.observe({
      type: 'event',
      durationThreshold: 16, // Track interactions > 16ms
      buffered: true
    });
    
    // Also observe long animation frames (Chrome 116+)
    try {
      const lafObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('Long Animation Frame:', {
            duration: entry.duration,
            blockingDuration: entry.blockingDuration,
            scripts: entry.scripts
          });
        }
      });
      
      lafObserver.observe({ type: 'long-animation-frame', buffered: true });
    } catch (e) {
      console.log('Long Animation Frame API not supported');
    }
  }
  
  recordInteraction(entry) {
    const interaction = {
      type: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      processingStart: entry.processingStart,
      processingEnd: entry.processingEnd,
      target: this.getElementSelector(entry.target),
      
      // Calculate phases
      inputDelay: entry.processingStart - entry.startTime,
      processingTime: entry.processingEnd - entry.processingStart,
      presentationDelay: entry.duration - (entry.processingEnd - entry.startTime)
    };
    
    this.interactions.push(interaction);
    
    // Check if this is a slow interaction
    if (entry.duration > 200) {
      this.reportSlowInteraction(interaction);
    }
  }
  
  getElementSelector(target) {
    if (!target) return 'unknown';
    
    let selector = target.tagName.toLowerCase();
    if (target.id) selector += `#${target.id}`;
    if (target.className) selector += `.${target.className.split(' ').join('.')}`;
    
    return selector;
  }
  
  reportSlowInteraction(interaction) {
    console.warn('🐌 Slow Interaction Detected:', {
      target: interaction.target,
      type: interaction.type,
      duration: `${interaction.duration.toFixed(2)}ms`,
      breakdown: {
        inputDelay: `${interaction.inputDelay.toFixed(2)}ms`,
        processing: `${interaction.processingTime.toFixed(2)}ms`,
        presentation: `${interaction.presentationDelay.toFixed(2)}ms`
      }
    });
    
    // Identify bottleneck
    const bottleneck = this.identifyBottleneck(interaction);
    console.log(`💡 Bottleneck: ${bottleneck}`);
    
    // Send to analytics
    this.sendToAnalytics({
      event: 'slow_interaction',
      ...interaction,
      bottleneck
    });
  }
  
  identifyBottleneck(interaction) {
    const { inputDelay, processingTime, presentationDelay } = interaction;
    
    const max = Math.max(inputDelay, processingTime, presentationDelay);
    
    if (max === inputDelay && inputDelay > 50) {
      return 'Input Delay (Main thread was busy)';
    }
    if (max === processingTime && processingTime > 50) {
      return 'Processing Time (Event handler too slow)';
    }
    if (max === presentationDelay && presentationDelay > 50) {
      return 'Presentation Delay (Rendering too slow)';
    }
    
    return 'Unknown';
  }
  
  calculateINP() {
    if (this.interactions.length === 0) return 0;
    
    // Sort by duration
    const sorted = this.interactions
      .map(i => i.duration)
      .sort((a, b) => a - b);
    
    // Get 75th percentile (or worst if < 50 interactions)
    const index = this.interactions.length < 50
      ? sorted.length - 1
      : Math.floor(sorted.length * 0.75);
    
    return sorted[index];
  }
  
  getReport() {
    const inp = this.calculateINP();
    const rating = inp <= 200 ? 'good' : inp <= 500 ? 'needs-improvement' : 'poor';
    
    return {
      inp: inp.toFixed(2) + 'ms',
      rating,
      totalInteractions: this.interactions.length,
      slowInteractions: this.interactions.filter(i => i.duration > 200).length,
      worstInteractions: this.getWorstInteractions(5)
    };
  }
  
  getWorstInteractions(count = 10) {
    return this.interactions
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count)
      .map(i => ({
        target: i.target,
        type: i.type,
        duration: i.duration.toFixed(2) + 'ms',
        inputDelay: i.inputDelay.toFixed(2) + 'ms',
        processing: i.processingTime.toFixed(2) + 'ms',
        presentation: i.presentationDelay.toFixed(2) + 'ms'
      }));
  }
  
  sendToAnalytics(data) {
    // Implement your analytics sending logic
    if (window.gtag) {
      window.gtag('event', data.event, data);
    }
  }
}

// Usage
const monitor = new INPMonitor();

// Get report after user session
setTimeout(() => {
  const report = monitor.getReport();
  console.table(report.worstInteractions);
}, 30000);
```

### 4. Common INP Optimization Patterns

#### Pattern 1: Optimistic UI Updates

```javascript
// Bad: Wait for processing before showing feedback
async function handleSubmit(data) {
  // User waits 500ms with no feedback ❌
  const result = await processData(data);
  showSuccess();
  updateUI(result);
}

// Good: Immediate feedback
async function handleSubmitOptimized(data) {
  // Immediate: Show loading state (< 10ms)
  showLoadingState();
  disableButton();
  
  // Defer: Heavy processing
  try {
    const result = await processData(data);
    showSuccess();
    updateUI(result);
  } catch (error) {
    // Revert optimistic update
    showError();
    enableButton();
  }
}

// React example
function FormComponent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Immediate: Update UI
    setIsSubmitting(true);
    
    // Defer: Processing (doesn't block INP)
    await new Promise(resolve => setTimeout(resolve, 0));
    
    try {
      await submitForm(formData);
      showSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* UI reflects state immediately */}
      <button disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

#### Pattern 2: Debouncing + Progressive Enhancement

```javascript
// Bad: Expensive operation on every keystroke
searchInput.addEventListener('input', (e) => {
  const results = expensiveSearch(e.target.value); // 200ms
  displayResults(results);
  // INP: 200ms+ per keystroke ❌
});

// Good: Debounced + Progressive
class SmartSearch {
  constructor(searchFn) {
    this.searchFn = searchFn;
    this.debounceTimeout = null;
    this.currentQuery = '';
  }
  
  handleInput(value) {
    // Immediate: Update input (< 10ms)
    this.currentQuery = value;
    updateInputValue(value);
    
    // Clear previous search
    clearTimeout(this.debounceTimeout);
    
    // Show "searching..." immediately
    showSearchingIndicator();
    
    // Debounce actual search
    this.debounceTimeout = setTimeout(async () => {
      await this.performSearch(value);
    }, 300);
  }
  
  async performSearch(query) {
    // Defer to next task (doesn't block INP)
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Perform search in chunks
    const results = await this.searchFn(query);
    
    // Only show if query hasn't changed
    if (this.currentQuery === query) {
      displayResults(results);
      hideSearchingIndicator();
    }
  }
}

// Usage
const searcher = new SmartSearch(expensiveSearchFunction);
searchInput.addEventListener('input', (e) => {
  searcher.handleInput(e.target.value);
});

// Result: INP < 50ms per keystroke ✅
```

#### Pattern 3: Chunked Processing with Progress

```javascript
// Bad: Process all items in click handler
button.addEventListener('click', () => {
  items.forEach(item => processItem(item)); // 2000ms
  showComplete();
  // INP: 2000ms ❌
});

// Good: Chunked with immediate feedback
button.addEventListener('click', async () => {
  // Immediate: Show progress UI (< 10ms)
  showProgressBar();
  disableButton();
  
  // Defer: Processing
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // Process in chunks
  const chunkSize = 50;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    chunk.forEach(item => processItem(item));
    
    // Update progress
    updateProgress((i + chunkSize) / items.length);
    
    // Yield
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  // Complete
  hideProgressBar();
  showComplete();
  enableButton();
});

// Result: INP < 50ms, total time ~2100ms ✅
```

#### Pattern 4: Web Workers for Heavy Work

```javascript
// Bad: Heavy computation blocks main thread
button.addEventListener('click', () => {
  const result = complexCalculation(largeDataset); // 3000ms
  displayResult(result);
  // INP: 3000ms ❌
});

// Good: Offload to worker
// main.js
const worker = new Worker('calculator.js');

button.addEventListener('click', () => {
  // Immediate: Show loading (< 10ms)
  showCalculating();
  
  // Offload work
  worker.postMessage({ data: largeDataset });
  
  // INP: < 50ms ✅
});

worker.onmessage = (e) => {
  // Display result when ready
  displayResult(e.data.result);
  hideCalculating();
};

// calculator.js (worker)
self.onmessage = (e) => {
  const result = complexCalculation(e.data.data);
  self.postMessage({ result });
};
```

---

## Real-World Production Examples

### Example 1: E-commerce Product Filter

**Problem**: Filtering 5000 products causes 600ms INP on every filter change.

```javascript
// BAD: Synchronous filtering
filterCheckbox.addEventListener('change', () => {
  // Filter 5000 products (600ms)
  const filtered = products.filter(product => {
    return matchesAllFilters(product, selectedFilters);
  });
  
  // Update DOM (100ms)
  displayProducts(filtered);
  
  // INP: 700ms ❌ POOR
});
```

**Solution: Optimistic UI + Chunked Processing**

```javascript
class ProductFilter {
  constructor(products) {
    this.products = products;
    this.filtered = products;
    this.processing = false;
  }
  
  async applyFilters(filters) {
    if (this.processing) return;
    this.processing = true;
    
    // Phase 1: Immediate feedback (< 10ms)
    showFilteringIndicator();
    updateFilterBadges(filters);
    
    // Phase 2: Defer filtering
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Phase 3: Filter in chunks
    const results = [];
    const chunkSize = 500;
    
    for (let i = 0; i < this.products.length; i += chunkSize) {
      const chunk = this.products.slice(i, i + chunkSize);
      
      const filtered = chunk.filter(product => 
        this.matchesFilters(product, filters)
      );
      
      results.push(...filtered);
      
      // Progressive display
      if (i === 0 || results.length >= 20) {
        displayProducts(results.slice(0, 20)); // Show first 20
      }
      
      // Yield
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // Final display
    this.filtered = results;
    displayProducts(results);
    hideFilteringIndicator();
    updateResultCount(results.length);
    
    this.processing = false;
  }
  
  matchesFilters(product, filters) {
    // Quick exit for common cases
    if (Object.keys(filters).length === 0) return true;
    
    // Check each filter
    for (const [key, value] of Object.entries(filters)) {
      if (!this.matchesFilter(product, key, value)) {
        return false;
      }
    }
    
    return true;
  }
  
  matchesFilter(product, key, value) {
    switch (key) {
      case 'category':
        return product.category === value;
      case 'priceRange':
        return product.price >= value.min && product.price <= value.max;
      case 'inStock':
        return value ? product.stock > 0 : true;
      default:
        return true;
    }
  }
}

// Usage
const productFilter = new ProductFilter(allProducts);

// Attach to filter controls
document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
  checkbox.addEventListener('change', async () => {
    const filters = getSelectedFilters();
    await productFilter.applyFilters(filters);
  });
});

// Result:
// - INP: < 50ms (immediate feedback)
// - First results visible: ~100ms
// - All results: ~800ms (but non-blocking)
// - User sees progress throughout
```

### Example 2: Rich Text Editor

**Problem**: Typing in large document (10,000 words) causes 300ms+ INP.

```javascript
// BAD: Heavy processing on every keystroke
editor.addEventListener('keydown', (e) => {
  // Update document model (50ms)
  updateDocumentModel(e.key);
  
  // Syntax highlighting (150ms)
  applySyntaxHighlighting();
  
  // Spell check (100ms)
  runSpellCheck();
  
  // Auto-save (50ms)
  autoSave();
  
  // INP: 350ms ❌ POOR
});
```

**Solution: Prioritized + Debounced Processing**

```javascript
class RichTextEditor {
  constructor(element) {
    this.element = element;
    this.debounceTimers = {};
  }
  
  attachHandlers() {
    this.element.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
  }
  
  async handleKeyDown(e) {
    // IMMEDIATE (< 10ms): Update display
    this.updateCursor();
    this.insertCharacter(e.key);
    
    // DEFERRED: Heavy operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Update document model (lightweight)
    this.updateDocumentModel(e.key);
    
    // Debounce expensive operations
    this.scheduleHighlighting();
    this.scheduleSpellCheck();
    this.scheduleAutoSave();
    
    // Result: INP < 50ms ✅
  }
  
  scheduleHighlighting() {
    clearTimeout(this.debounceTimers.highlighting);
    
    this.debounceTimers.highlighting = setTimeout(async () => {
      // Only highlight visible portion
      await this.highlightVisible();
    }, 100); // 100ms debounce
  }
  
  async highlightVisible() {
    const visibleRange = this.getVisibleRange();
    
    // Highlight in chunks
    const chunkSize = 100; // lines
    for (let i = visibleRange.start; i < visibleRange.end; i += chunkSize) {
      const chunk = this.getLines(i, i + chunkSize);
      this.applySyntaxHighlight(chunk);
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  scheduleSpellCheck() {
    clearTimeout(this.debounceTimers.spellCheck);
    
    this.debounceTimers.spellCheck = setTimeout(async () => {
      await this.runIncrementalSpellCheck();
    }, 500); // 500ms debounce
  }
  
  async runIncrementalSpellCheck() {
    // Only check changed paragraphs
    const changedParagraphs = this.getChangedParagraphs();
    
    for (const paragraph of changedParagraphs) {
      await this.checkParagraph(paragraph);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  scheduleAutoSave() {
    clearTimeout(this.debounceTimers.autoSave);
    
    this.debounceTimers.autoSave = setTimeout(() => {
      this.autoSave();
    }, 2000); // 2 second debounce
  }
  
  updateCursor() {
    // Immediate cursor position update
    this.element.focus();
  }
  
  insertCharacter(key) {
    // Immediate character insertion
    document.execCommand('insertText', false, key);
  }
  
  updateDocumentModel(key) {
    // Lightweight model update
    this.document.currentParagraph += key;
    this.document.wordCount = this.countWords();
  }
  
  getVisibleRange() {
    const scrollTop = this.element.scrollTop;
    const viewportHeight = this.element.clientHeight;
    const lineHeight = 20;
    
    return {
      start: Math.floor(scrollTop / lineHeight),
      end: Math.floor((scrollTop + viewportHeight) / lineHeight)
    };
  }
  
  // Other helper methods...
}

// Usage
const editor = new RichTextEditor(document.getElementById('editor'));
editor.attachHandlers();

// Result:
// - INP: < 50ms (typing feels instant)
// - Syntax highlighting: Visible portion only, 100ms delay
// - Spell check: Changed paragraphs only, 500ms delay
// - Auto-save: 2 second delay
// - Smooth typing experience ✅
```

### Example 3: Data Table with Inline Editing

**Problem**: Clicking edit button causes 400ms INP due to form initialization.

```javascript
// BAD: Heavy initialization blocks interaction
editButton.addEventListener('click', () => {
  // Load field configurations (50ms)
  const fields = loadFieldConfigurations();
  
  // Initialize validators (100ms)
  const validators = initializeValidators(fields);
  
  // Build form DOM (150ms)
  const form = buildComplexForm(fields, validators);
  
  // Setup event listeners (50ms)
  attachFormHandlers(form);
  
  // Show form (50ms)
  showForm(form);
  
  // INP: 400ms ❌ NEEDS IMPROVEMENT
});
```

**Solution: Lazy Initialization + Caching**

```javascript
class InlineEditor {
  constructor() {
    this.formCache = new Map();
    this.validators = null;
  }
  
  async handleEdit(rowId) {
    // IMMEDIATE: Show placeholder (< 10ms)
    this.showEditPlaceholder(rowId);
    
    // DEFER: Form initialization
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check cache
    let form = this.formCache.get(rowId);
    
    if (!form) {
      form = await this.buildFormIncremental(rowId);
      this.formCache.set(rowId, form);
    }
    
    // Replace placeholder with real form
    this.showForm(rowId, form);
    
    // Focus first field
    form.querySelector('input').focus();
    
    // Result: INP < 50ms ✅
  }
  
  showEditPlaceholder(rowId) {
    const row = document.querySelector(`[data-id="${rowId}"]`);
    const placeholder = document.createElement('div');
    placeholder.className = 'edit-placeholder';
    placeholder.innerHTML = `
      <input type="text" placeholder="Loading..." disabled>
      <div class="skeleton-loader"></div>
    `;
    
    row.replaceWith(placeholder);
    placeholder.dataset.rowId = rowId;
  }
  
  async buildFormIncremental(rowId) {
    // Load minimal configuration first
    const basicFields = await this.loadBasicFields(rowId);
    
    // Build basic form
    const form = this.buildBasicForm(basicFields);
    
    // Yield
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Lazy-load validators
    if (!this.validators) {
      this.validators = await this.loadValidators();
    }
    
    // Attach validators
    this.attachValidators(form, this.validators);
    
    return form;
  }
  
  buildBasicForm(fields) {
    const form = document.createElement('form');
    form.className = 'inline-edit-form';
    
    // Build DOM efficiently
    const fragment = document.createDocumentFragment();
    
    fields.forEach(field => {
      const input = document.createElement('input');
      input.name = field.name;
      input.value = field.value;
      input.type = field.type;
      
      fragment.appendChild(input);
    });
    
    // Buttons
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.type = 'submit';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.type = 'button';
    
    fragment.appendChild(saveBtn);
    fragment.appendChild(cancelBtn);
    
    form.appendChild(fragment);
    
    return form;
  }
  
  showForm(rowId, form) {
    const placeholder = document.querySelector(`[data-row-id="${rowId}"]`);
    if (placeholder) {
      placeholder.replaceWith(form);
    }
  }
  
  async loadBasicFields(rowId) {
    // Simulate API call
    return [
      { name: 'name', value: 'John Doe', type: 'text' },
      { name: 'email', value: 'john@example.com', type: 'email' },
      { name: 'phone', value: '555-1234', type: 'tel' }
    ];
  }
  
  async loadValidators() {
    // Lazy-load validation library
    const { validators } = await import('./validators.js');
    return validators;
  }
  
  attachValidators(form, validators) {
    const inputs = form.querySelectorAll('input');
    
    inputs.forEach(input => {
      const validator = validators[input.type];
      if (validator) {
        input.addEventListener('blur', () => {
          validator.validate(input.value);
        });
      }
    });
  }
}

// Usage
const editor = new InlineEditor();

document.querySelectorAll('.edit-button').forEach(button => {
  button.addEventListener('click', async (e) => {
    const rowId = e.target.closest('[data-id]').dataset.id;
    await editor.handleEdit(rowId);
  });
});

// Result:
// - INP: < 50ms (placeholder shows immediately)
// - Form ready: ~150ms (incremental build)
// - Validators loaded: ~200ms (lazy)
// - Subsequent edits: < 50ms (cached) ✅
```

### Example 4: Mobile Menu with Animations

**Problem**: Opening menu causes 500ms INP due to animation calculations.

```javascript
// BAD: Heavy calculations block interaction
menuButton.addEventListener('click', () => {
  // Calculate animation paths (200ms)
  const animations = calculateComplexAnimations();
  
  // Apply transforms (150ms)
  applyAnimations(animations);
  
  // Initialize menu items (100ms)
  initializeMenuItems();
  
  // Setup event listeners (50ms)
  attachMenuHandlers();
  
  // INP: 500ms ❌ POOR
});
```

**Solution: CSS Transitions + Lazy Content**

```javascript
class MobileMenu {
  constructor() {
    this.isOpen = false;
    this.contentLoaded = false;
  }
  
  async handleToggle() {
    if (this.isOpen) {
      this.close();
    } else {
      await this.open();
    }
  }
  
  async open() {
    // IMMEDIATE: Start CSS animation (< 10ms)
    const menu = document.getElementById('mobile-menu');
    menu.classList.add('opening');
    
    // CSS handles animation (GPU-accelerated, non-blocking)
    // No JavaScript animation calculations needed!
    
    this.isOpen = true;
    
    // DEFER: Load menu content
    await new Promise(resolve => setTimeout(resolve, 0));
    
    if (!this.contentLoaded) {
      await this.loadMenuContent();
      this.contentLoaded = true;
    }
    
    // Animation completes via CSS (250ms)
    setTimeout(() => {
      menu.classList.remove('opening');
      menu.classList.add('open');
    }, 250);
    
    // Result: INP < 50ms ✅
  }
  
  close() {
    // IMMEDIATE: Start close animation (< 10ms)
    const menu = document.getElementById('mobile-menu');
    menu.classList.remove('open');
    menu.classList.add('closing');
    
    this.isOpen = false;
    
    // Complete after animation
    setTimeout(() => {
      menu.classList.remove('closing');
    }, 250);
    
    // Result: INP < 50ms ✅
  }
  
  async loadMenuContent() {
    // Load in chunks
    const sections = ['nav', 'user', 'settings'];
    
    for (const section of sections) {
      await this.loadSection(section);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  async loadSection(name) {
    const content = await this.fetchSectionContent(name);
    const container = document.querySelector(`#menu-${name}`);
    if (container) {
      container.innerHTML = content;
    }
  }
  
  async fetchSectionContent(name) {
    // Simulate API or template loading
    return `<div class="menu-section">${name} content</div>`;
  }
}

// CSS (GPU-accelerated, doesn't block main thread)
/*
#mobile-menu {
  transform: translateX(-100%);
  transition: transform 250ms ease-out;
  will-change: transform; // GPU hint
}

#mobile-menu.opening,
#mobile-menu.open {
  transform: translateX(0);
}

#mobile-menu.closing {
  transform: translateX(-100%);
}
*/

// Usage
const mobileMenu = new MobileMenu();

document.getElementById('menu-button').addEventListener('click', async () => {
  await mobileMenu.handleToggle();
});

// Result:
// - INP: < 50ms (CSS handles animation)
// - Animation: Smooth 60fps (GPU-accelerated)
// - Content: Loads progressively
// - Feels instant to user ✅
```

---

## Interview-Oriented Deep Dive

### Common Interview Questions

#### Q1: "What is INP and how does it differ from FID?"

**Complete Answer:**
```
INP (Interaction to Next Paint):
- Measures ALL interactions throughout page lifecycle
- Captures complete interaction duration (input → processing → paint)
- Uses 75th percentile of all interactions
- Replaced FID as Core Web Vital in March 2024
- Thresholds: Good ≤ 200ms, Poor > 500ms

FID (First Input Delay):
- Only measured FIRST interaction
- Only captured input delay (not processing or rendering)
- Didn't reflect ongoing responsiveness
- Deprecated in favor of INP

Key Differences:

1. Coverage:
   FID: First interaction only
   INP: All interactions (more comprehensive)

2. Measurement:
   FID: Input delay only (time until handler starts)
   INP: Full duration (input delay + processing + presentation)

3. Percentile:
   FID: Single measurement (first interaction)
   INP: 75th percentile (captures typical bad case)

4. Real-world accuracy:
   FID: Often showed "good" even when page felt sluggish
   INP: Better reflects actual user experience

Example:
Page with 100 interactions during session:
- FID: Measures only interaction #1 (might be fast)
- INP: Measures all 100, reports 75th percentile (catches slow ones)

Why INP is Better:
- Single-Page Apps: FID missed subsequent interactions
- Long sessions: FID didn't capture degraded performance over time
- Better correlation: INP correlates better with user frustration
```

**Code Example:**
```javascript
// Both metrics via web-vitals library
import { onFID, onINP } from 'web-vitals';

// FID (deprecated but still available)
onFID((metric) => {
  console.log('FID (first interaction):', metric.value);
  // Only fires once per page load
});

// INP (current standard)
onINP((metric) => {
  console.log('INP (all interactions):', metric.value);
  // Updates as interactions occur
  // Final value at 75th percentile
});

// Typical scenario:
// First interaction: 50ms (good FID)
// Interactions 2-100: 300-600ms (poor INP)
// FID shows "good" but INP correctly shows "poor"
```

#### Q2: "Explain the three phases of INP and how to optimize each"

**Complete Answer:**
```
Three Phases of INP:

1. INPUT DELAY
   What: Time from user action to event handler start
   Caused by: Main thread busy with other work
   
   Optimization:
   - Avoid long tasks (< 50ms)
   - Break work into chunks with yielding
   - Use event delegation (fewer listeners)
   - Avoid synchronous layout calculations
   - Use Web Workers for heavy computation

2. PROCESSING TIME
   What: Event handler execution duration
   Caused by: Expensive operations in handler
   
   Optimization:
   - Defer non-critical work
   - Show immediate feedback (optimistic UI)
   - Debounce expensive operations
   - Batch DOM updates
   - Use React.startTransition() for non-urgent updates
   - Break processing into chunks

3. PRESENTATION DELAY
   What: Time from handler completion to paint
   Caused by: Expensive rendering/layout
   
   Optimization:
   - Avoid forced synchronous layouts
   - Batch read/write operations
   - Use CSS containment
   - Virtualize long lists
   - Minimize affected DOM
   - Use content-visibility for off-screen content

Visual Breakdown:
```

```javascript
// Measure all three phases
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const inputDelay = entry.processingStart - entry.startTime;
    const processingTime = entry.processingEnd - entry.processingStart;
    const presentationDelay = entry.duration - (entry.processingEnd - entry.startTime);
    
    console.log('INP Breakdown:', {
      total: entry.duration.toFixed(2) + 'ms',
      inputDelay: inputDelay.toFixed(2) + 'ms',
      processing: processingTime.toFixed(2) + 'ms',
      presentation: presentationDelay.toFixed(2) + 'ms'
    });
    
    // Identify bottleneck
    const max = Math.max(inputDelay, processingTime, presentationDelay);
    let bottleneck = '';
    
    if (max === inputDelay) {
      bottleneck = 'Input Delay - Main thread was busy';
    } else if (max === processingTime) {
      bottleneck = 'Processing - Event handler too slow';
    } else {
      bottleneck = 'Presentation - Rendering too slow';
    }
    
    console.log('Bottleneck:', bottleneck);
  }
});

observer.observe({ type: 'event', buffered: true });

// Optimization example for each phase
button.addEventListener('click', async () => {
  // ===== PHASE 1: INPUT DELAY =====
  // Already minimized by:
  // - Using event delegation
  // - Avoiding long tasks before this click
  // - Breaking previous work into chunks
  
  // ===== PHASE 2: PROCESSING TIME =====
  // Immediate: Show feedback (< 10ms)
  button.disabled = true;
  button.textContent = 'Processing...';
  
  // Defer: Heavy work
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // Do work in chunks
  for (let i = 0; i < items.length; i += 50) {
    processChunk(items.slice(i, i + 50));
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  // ===== PHASE 3: PRESENTATION DELAY =====
  // Batch DOM updates
  const fragment = document.createDocumentFragment();
  results.forEach(item => {
    const el = createResultElement(item);
    fragment.appendChild(el);
  });
  
  // Single append (minimizes presentation delay)
  resultsContainer.appendChild(fragment);
  
  // Reset button
  button.disabled = false;
  button.textContent = 'Complete';
});
```

#### Q3: "How would you debug a page with poor INP score?"

**Complete Answer:**
```
Systematic Debugging Approach:

1. MEASURE & IDENTIFY
   - Use web-vitals library for baseline INP
   - Identify worst interactions (75th percentile)
   - Get attribution data (which elements, what phase)

2. CHROME DEVTOOLS ANALYSIS
   - Performance tab: Record user interaction
   - Look for long tasks (red triangles)
   - Analyze Main Thread flame chart
   - Check INP in Performance Insights panel

3. PRODUCTION MONITORING
   - Send INP data to analytics
   - Track by page, user agent, device
   - Monitor worst interactions
   - Set up alerts for regressions

4. ROOT CAUSE ANALYSIS
   - Input Delay > 100ms → Main thread blocked
   - Processing > 100ms → Event handler too slow
   - Presentation > 100ms → Rendering too expensive

5. FIX & VERIFY
   - Apply targeted optimizations
   - Re-measure with DevTools
   - A/B test in production
   - Monitor improvement

Complete Debugging Setup:
```

```javascript
// 1. Comprehensive monitoring
import { onINP } from 'web-vitals/attribution';

const inpDebugger = {
  interactions: [],
  
  init() {
    onINP((metric) => {
      this.recordMetric(metric);
      
      if (metric.rating === 'poor') {
        this.debugPoorINP(metric);
      }
    });
  },
  
  recordMetric(metric) {
    const data = {
      value: metric.value,
      rating: metric.rating,
      attribution: metric.attribution,
      timestamp: Date.now(),
      url: window.location.href,
      
      // Device info
      deviceMemory: navigator.deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      connection: navigator.connection?.effectiveType || 'unknown'
    };
    
    this.interactions.push(data);
    
    // Send to analytics
    this.sendToAnalytics(data);
  },
  
  debugPoorINP(metric) {
    const attr = metric.attribution;
    
    console.group('🐌 Poor INP Detected');
    console.log('Value:', metric.value.toFixed(2) + 'ms');
    console.log('Rating:', metric.rating);
    console.log('Target:', attr.interactionTarget);
    console.log('Type:', attr.interactionType);
    
    console.log('\nBreakdown:');
    console.log('  Input Delay:', attr.inputDelay.toFixed(2) + 'ms');
    console.log('  Processing:', attr.processingDuration.toFixed(2) + 'ms');
    console.log('  Presentation:', attr.presentationDelay.toFixed(2) + 'ms');
    
    // Identify bottleneck
    const phases = {
      'Input Delay': attr.inputDelay,
      'Processing': attr.processingDuration,
      'Presentation': attr.presentationDelay
    };
    
    const bottleneck = Object.entries(phases)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    console.log('\n🎯 Bottleneck:', bottleneck);
    
    // Recommendations
    this.getRecommendations(bottleneck, phases);
    
    // Long tasks during interaction
    if (attr.longAnimationFrameEntries?.length > 0) {
      console.log('\n⚠️ Long Animation Frames:');
      attr.longAnimationFrameEntries.forEach(entry => {
        console.log(`  - ${entry.duration.toFixed(2)}ms at ${entry.startTime.toFixed(2)}ms`);
      });
    }
    
    console.groupEnd();
  },
  
  getRecommendations(bottleneck, phases) {
    console.log('\n💡 Recommendations:');
    
    switch (bottleneck) {
      case 'Input Delay':
        console.log('  - Break long tasks into chunks');
        console.log('  - Yield more frequently');
        console.log('  - Use Web Workers for heavy work');
        console.log('  - Check for blocking scripts');
        break;
        
      case 'Processing':
        console.log('  - Defer non-critical work');
        console.log('  - Show immediate feedback');
        console.log('  - Debounce expensive operations');
        console.log('  - Profile event handler');
        break;
        
      case 'Presentation':
        console.log('  - Avoid forced layouts');
        console.log('  - Batch DOM updates');
        console.log('  - Use CSS containment');
        console.log('  - Virtualize long lists');
        break;
    }
  },
  
  sendToAnalytics(data) {
    if (window.gtag) {
      window.gtag('event', 'inp_metric', {
        value: Math.round(data.value),
        rating: data.rating,
        device_memory: data.deviceMemory,
        connection_type: data.connection
      });
    }
  },
  
  getReport() {
    const inp = this.calculateINP();
    const worstInteractions = this.getWorstInteractions();
    
    return {
      currentINP: inp,
      totalInteractions: this.interactions.length,
      poorInteractions: this.interactions.filter(i => i.rating === 'poor').length,
      worstInteractions,
      averageByPhase: this.getAverageByPhase()
    };
  },
  
  calculateINP() {
    if (this.interactions.length === 0) return 0;
    
    const values = this.interactions.map(i => i.value).sort((a, b) => a - b);
    const index = Math.floor(values.length * 0.75);
    
    return values[index];
  },
  
  getWorstInteractions(count = 5) {
    return this.interactions
      .sort((a, b) => b.value - a.value)
      .slice(0, count)
      .map(i => ({
        value: i.value.toFixed(2) + 'ms',
        target: i.attribution.interactionTarget,
        type: i.attribution.interactionType,
        inputDelay: i.attribution.inputDelay.toFixed(2) + 'ms',
        processing: i.attribution.processingDuration.toFixed(2) + 'ms',
        presentation: i.attribution.presentationDelay.toFixed(2) + 'ms'
      }));
  },
  
  getAverageByPhase() {
    const totals = { inputDelay: 0, processing: 0, presentation: 0 };
    
    this.interactions.forEach(i => {
      totals.inputDelay += i.attribution.inputDelay;
      totals.processing += i.attribution.processingDuration;
      totals.presentation += i.attribution.presentationDelay;
    });
    
    const count = this.interactions.length;
    
    return {
      inputDelay: (totals.inputDelay / count).toFixed(2) + 'ms',
      processing: (totals.processing / count).toFixed(2) + 'ms',
      presentation: (totals.presentation / count).toFixed(2) + 'ms'
    };
  }
};

// Initialize
inpDebugger.init();

// Get report after session
setTimeout(() => {
  console.log('INP Report:', inpDebugger.getReport());
}, 60000);

// 2. Chrome DevTools investigation
// - Open DevTools > Performance
// - Click Record
// - Perform slow interaction
// - Stop recording
// - Look for:
//   * Long tasks (red triangles) before interaction
//   * Event handler duration
//   * Layout/Paint time after handler
//   * Check Performance Insights for INP score

// 3. Production monitoring query (example)
// SELECT
//   AVG(inp_value) as avg_inp,
//   PERCENTILE(inp_value, 75) as p75_inp,
//   COUNT(*) as total_interactions,
//   page_url
// FROM analytics
// WHERE event = 'inp_metric'
//   AND timestamp > NOW() - INTERVAL '7 days'
// GROUP BY page_url
// HAVING p75_inp > 200
// ORDER BY p75_inp DESC;
```

#### Q4: "How does React 18's concurrent features help with INP?"

**Complete Answer:**
```
React 18 Concurrent Features for INP:

1. startTransition()
   - Marks updates as non-urgent
   - Allows React to interrupt rendering
   - Keeps UI responsive during state updates

2. useTransition()
   - Hook version of startTransition
   - Provides isPending state
   - Useful for showing loading states

3. useDeferredValue()
   - Defers value updates
   - Renders with stale value first (fast)
   - Re-renders with new value later

4. Automatic Batching
   - Groups multiple state updates
   - Single re-render instead of multiple
   - Reduces presentation delay

How They Help INP:
```

```javascript
// BEFORE React 18: Poor INP
function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const handleChange = (e) => {
    const value = e.target.value;
    
    // Both updates happen synchronously
    setQuery(value); // Urgent
    setResults(expensiveSearch(value)); // Also blocks! ❌
    
    // INP: 300ms+ (blocks for entire search)
  };
  
  return (
    <div>
      <input value={query} onChange={handleChange} />
      <ResultsList results={results} />
    </div>
  );
}

// WITH React 18: Good INP
import { startTransition, useDeferredValue } from 'react';

function SearchComponentOptimized() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const handleChange = (e) => {
    const value = e.target.value;
    
    // Urgent: Update input immediately
    setQuery(value);
    
    // Non-urgent: Defer expensive search
    startTransition(() => {
      setResults(expensiveSearch(value));
    });
    
    // INP: < 50ms (input updates immediately) ✅
  };
  
  return (
    <div>
      <input value={query} onChange={handleChange} />
      <ResultsList results={results} />
    </div>
  );
}

// Alternative: useDeferredValue
function SearchWithDeferredValue() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  
  // Expensive search uses deferred value
  const results = useMemo(
    () => expensiveSearch(deferredQuery),
    [deferredQuery]
  );
  
  const handleChange = (e) => {
    // Updates input immediately
    // But search uses deferred value
    setQuery(e.target.value);
    
    // INP: < 50ms ✅
  };
  
  return (
    <div>
      <input value={query} onChange={handleChange} />
      {query !== deferredQuery && <span>Searching...</span>}
      <ResultsList results={results} />
    </div>
  );
}

// Advanced: useTransition with loading state
import { useTransition } from 'react';

function TabsComponent() {
  const [activeTab, setActiveTab] = useState('tab1');
  const [isPending, startTransition] = useTransition();
  
  const handleTabClick = (tabId) => {
    // Urgent: Update button state
    // Non-urgent: Load tab content
    startTransition(() => {
      setActiveTab(tabId);
    });
    
    // INP: < 50ms (button responds immediately) ✅
  };
  
  return (
    <div>
      <button
        onClick={() => handleTabClick('tab1')}
        disabled={isPending}
      >
        Tab 1
      </button>
      <button
        onClick={() => handleTabClick('tab2')}
        disabled={isPending}
      >
        Tab 2
      </button>
      
      {isPending && <Spinner />}
      <TabContent tab={activeTab} />
    </div>
  );
}

// Automatic Batching (React 18+)
function AutoBatchingExample() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  
  const handleClick = () => {
    // React 17: 2 re-renders
    // React 18: 1 re-render (automatic batching) ✅
    setCount(c => c + 1);
    setFlag(f => !f);
    
    // Even in async functions!
    setTimeout(() => {
      setCount(c => c + 1); // Batched!
      setFlag(f => !f);     // Batched!
    }, 1000);
    
    // INP improved by reducing re-renders
  };
  
  console.log('Render'); // Logs once in React 18
  
  return <button onClick={handleClick}>Update</button>;
}

// Complete Example: Data Table with Filtering
function DataTable({ data }) {
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);
  const [isPending, startTransition] = useTransition();
  
  // Use deferred value for expensive filtering
  const filteredData = useMemo(() => {
    return data.filter(item =>
      item.name.toLowerCase().includes(deferredFilter.toLowerCase())
    );
  }, [data, deferredFilter]);
  
  const handleFilterChange = (e) => {
    const value = e.target.value;
    
    // Immediate: Update input
    setFilter(value);
    
    // Deferred: Filtering happens with deferredFilter
    
    // INP: < 50ms ✅
  };
  
  const handleSort = (column) => {
    startTransition(() => {
      // Non-urgent: Expensive sort
      setSortedData(sortByColumn(data, column));
    });
    
    // INP: < 50ms ✅
  };
  
  return (
    <div>
      <input
        value={filter}
        onChange={handleFilterChange}
        placeholder="Filter..."
      />
      
      {isPending && <LoadingIndicator />}
      
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('name')}>Name</th>
            <th onClick={() => handleSort('date')}>Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map(row => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Summary:
// - startTransition: Defer non-urgent updates
// - useDeferredValue: Keep UI responsive while re-computing
// - useTransition: Get loading state for transitions
// - Automatic Batching: Fewer re-renders = better INP
// - All help keep INP < 200ms even with expensive operations
```

---

## Why This Matters & How to Apply

### Core Principles

1. **Responsive UI is non-negotiable** - INP < 200ms target
2. **Three phases to optimize** - Input, Processing, Presentation
3. **Immediate feedback always** - Show something in < 50ms
4. **Defer expensive work** - Use transitions and deferrals
5. **Measure in production** - Real users, real devices

### Mental Model

```
INP = Restaurant Service Speed
─────────────────────────────────────────
Input Delay = Wait for waiter to notice you
Processing = Time to prepare food
Presentation = Time to deliver to table

Good INP (< 200ms) = Quick service
Poor INP (> 500ms) = Frustrated customers leave

Optimization = Hire more staff (workers), prepare ahead (cache),
               acknowledge immediately ("I'll be right with you!")
```

### Decision Framework

**Is my interaction slow?**
```
Measure INP for interaction:
├─ < 200ms → Good ✅
├─ 200-500ms → Needs improvement ⚠️
└─ > 500ms → Poor ❌ Fix immediately!
    └─ Which phase is slow?
        ├─ Input Delay → Main thread busy
        │   → Break long tasks, yield more
        ├─ Processing → Handler too slow
        │   → Defer work, show feedback
        └─ Presentation → Rendering slow
            → Batch updates, virtualize
```

### Production Checklist

**Before Launch:**
- [ ] All critical interactions < 200ms INP
- [ ] Worst-case (75th percentile) tested
- [ ] Mobile devices tested (lower-end)
- [ ] Slow network tested
- [ ] INP monitoring in place
- [ ] Alerts for regressions

**Monitoring:**
```javascript
// Track INP by page and device
import { onINP } from 'web-vitals';

onINP((metric) => {
  analytics.track('inp', {
    value: Math.round(metric.value),
    rating: metric.rating,
    page: window.location.pathname,
    deviceType: getDeviceType(),
    connectionSpeed: navigator.connection?.effectiveType
  });
});

function getDeviceType() {
  const memory = navigator.deviceMemory;
  if (!memory) return 'unknown';
  if (memory < 4) return 'low-end';
  if (memory < 8) return 'mid-range';
  return 'high-end';
}
```

### Common Mistakes

❌ **Mistake 1: Optimizing for fast devices only**
```javascript
// Tested on M1 MacBook: INP 100ms ✅
// On low-end Android: INP 800ms ❌
```

✅ **Fix: Test on real devices**
```javascript
// Use Chrome DevTools CPU throttling
// Test on real low-end devices
// Monitor INP by device type in production
```

❌ **Mistake 2: No immediate feedback**
```javascript
button.addEventListener('click', async () => {
  const result = await longOperation(); // User waits...
  showResult(result);
});
```

✅ **Fix: Show feedback immediately**
```javascript
button.addEventListener('click', async () => {
  showLoading(); // Immediate!
  const result = await longOperation();
  showResult(result);
});
```

❌ **Mistake 3: Not using attribution data**
```javascript
// Just tracking the score
onINP(metric => console.log(metric.value));
```

✅ **Fix: Track attribution to debug**
```javascript
import { onINP } from 'web-vitals/attribution';

onINP(metric => {
  console.log({
    value: metric.value,
    target: metric.attribution.interactionTarget,
    inputDelay: metric.attribution.inputDelay,
    processing: metric.attribution.processingDuration,
    presentation: metric.attribution.presentationDelay
  });
});
```

### Performance Impact

**Thresholds:**
- **Good**: ≤ 200ms (Green) - Target for all sites
- **Needs Improvement**: 201-500ms (Orange) - Acceptable but optimize
- **Poor**: > 500ms (Red) - Fix immediately

**Business Impact:**
- 100ms INP improvement: +1-2% conversion
- Good INP (< 200ms): 70% higher engagement
- Poor INP (> 500ms): 25-40% bounce rate increase

---

## Summary & Key Takeaways

### Critical Concepts

1. **INP = Input Delay + Processing + Presentation**
2. **Measures 75th percentile** of all interactions
3. **Target: < 200ms** for good rating
4. **Replaced FID** as Core Web Vital (March 2024)
5. **Three-phase optimization** required
6. **Immediate feedback** is non-negotiable
7. **Mobile devices** are typically the bottleneck

### Quick Reference

| Phase | Target | Common Issues | Solutions |
|-------|--------|---------------|-----------|
| Input Delay | < 50ms | Main thread busy | Break long tasks, yield |
| Processing | < 50ms | Slow handlers | Defer work, debounce |
| Presentation | < 50ms | Heavy rendering | Batch updates, virtualize |

### Interview Success Formula

1. **Define INP** - Three phases, 75th percentile, thresholds
2. **Explain measurement** - web-vitals library, PerformanceObserver
3. **Show optimization** - Immediate feedback, deferred work
4. **Discuss React 18** - startTransition, useDeferredValue
5. **Debug approach** - Attribution data, DevTools, monitoring
6. **Real examples** - Search, forms, menus
7. **Business impact** - Conversions, engagement, bounce rate

### One-Sentence Summary

> Interaction to Next Paint (INP) measures the time from when a user interacts with a page until the browser paints visual feedback, with a target of < 200ms achieved by showing immediate feedback and deferring expensive work.

---

**Related Topics:**
- [78. Main Thread Scheduling](./78_Main_Thread_Scheduling.md)
- [79. Long Tasks & Yielding Control](./79_Long_Tasks_Yielding_Control.md)
- [81. Avoiding Layout Thrashing](./81_Avoiding_Layout_Thrashing.md)
- [69. Frontend Performance Metrics](../Module%207.1%20—%20Metrics%20&%20Measurement/69_Frontend_Performance_Metrics.md)
