# PART 7️⃣ — Performance Optimization

## 📖 Overview

Performance is **non-negotiable** at scale. A 100ms delay can cost millions in revenue. This section covers Core Web Vitals, profiling techniques, rendering optimizations, and main thread management.

## 🎯 Why This Matters

**Business Impact**:
- Amazon: 100ms delay = 1% revenue loss
- Google: 500ms delay = 20% traffic drop
- Pinterest: 40% performance improvement = 15% signup increase

**Interview Reality**:
- "Your app is slow. How do you debug it?"
- "Explain Core Web Vitals and how to optimize them."
- "Design a dashboard with 1000 charts - how do you keep it performant?"

---

## 📚 Module Breakdown

### Module 7.1 — Metrics & Measurement
**Focus**: Core Web Vitals, profiling tools

**Topics Covered**:

#### **Core Web Vitals**
```
┌─────────────────────────────────────────────────────────────┐
│                   CORE WEB VITALS                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. LCP (Largest Contentful Paint)                          │
│     What: Time to render largest content element            │
│     Target: < 2.5 seconds                                   │
│     Measures: Perceived load speed                          │
│                                                              │
│     Common LCP Elements:                                    │
│     • Hero images                                           │
│     • Large text blocks                                     │
│     • Video thumbnails                                      │
│                                                              │
│     Optimization:                                           │
│     • Optimize images (WebP, compression)                   │
│     • Preload critical resources                            │
│     • Remove render-blocking resources                      │
│     • Use CDN for static assets                             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  2. FID (First Input Delay) / INP (Interaction to Next Paint)│
│     What: Time from user interaction to response            │
│     Target: < 100ms (FID), < 200ms (INP)                   │
│     Measures: Interactivity                                 │
│                                                              │
│     Common Issues:                                          │
│     • Long-running JavaScript tasks                         │
│     • Heavy event handlers                                  │
│     • Blocking main thread                                  │
│                                                              │
│     Optimization:                                           │
│     • Break up long tasks                                   │
│     • Use Web Workers                                       │
│     • Defer non-critical JS                                 │
│     • Optimize event handlers                               │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  3. CLS (Cumulative Layout Shift)                           │
│     What: Visual stability (unexpected layout shifts)       │
│     Target: < 0.1                                           │
│     Measures: Visual stability                              │
│                                                              │
│     Common Causes:                                          │
│     • Images without dimensions                             │
│     • Ads/embeds injected dynamically                       │
│     • Fonts loading (FOIT/FOUT)                             │
│     • Animations without transforms                         │
│                                                              │
│     Optimization:                                           │
│     • Always set width/height on images                     │
│     • Reserve space for ads                                 │
│     • Use font-display: swap                                │
│     • Animate with transform/opacity only                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Measuring Web Vitals**
```javascript
// Using web-vitals library
import { onLCP, onFID, onCLS } from 'web-vitals';

onLCP(console.log); // { name: 'LCP', value: 2341, rating: 'good' }
onFID(console.log);
onCLS(console.log);

// Send to analytics
function sendToAnalytics(metric) {
  const body = JSON.stringify(metric);
  fetch('/analytics', { method: 'POST', body, keepalive: true });
}

onLCP(sendToAnalytics);
onFID(sendToAnalytics);
onCLS(sendToAnalytics);

// Real User Monitoring (RUM)
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(entry.name, entry.startTime, entry.duration);
    }
  });
  
  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
}
```

#### **Chrome DevTools Profiling**
```
┌─────────────────────────────────────────────────────────────┐
│               CHROME DEVTOOLS PROFILING                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PERFORMANCE PANEL                                       │
│     • Record page load or interaction                       │
│     • Flame chart: see all tasks                            │
│     • Long Tasks: > 50ms (red triangle)                     │
│     • Frame rate: should be 60 FPS                          │
│                                                              │
│  2. LIGHTHOUSE                                              │
│     • Automated audit                                       │
│     • Scores: Performance, Accessibility, SEO               │
│     • Opportunities: Quick wins                             │
│     • Diagnostics: Deeper issues                            │
│                                                              │
│  3. COVERAGE TOOL                                           │
│     • Shows unused CSS/JS                                   │
│     • Remove dead code                                      │
│     • Code splitting opportunities                          │
│                                                              │
│  4. NETWORK PANEL                                           │
│     • Waterfall: see request timing                         │
│     • Blocking time                                         │
│     • Large payloads                                        │
│                                                              │
│  5. RENDERING PANEL                                         │
│     • Paint flashing: see repaints                          │
│     • Layout shift regions: CLS culprits                    │
│     • FPS meter                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**React DevTools Profiler**
```jsx
import { Profiler } from 'react';

function onRenderCallback(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="App" onRender={onRenderCallback}>
  <App />
</Profiler>

// Chrome extension: React DevTools > Profiler tab
// • Record interactions
// • Flamegraph: see render times
// • Ranked: slowest components
// • Why did this render?
```

**Interview Questions**:
- "Explain Core Web Vitals."
- "How do you debug performance issues?"
- "What tools do you use for profiling?"

**Interview Relevance**: 🔥🔥🔥🔥🔥
Every senior interview asks about performance.

---

### Module 7.2 — Code Optimization
**Focus**: Bundle size, code splitting, lazy loading

**Topics Covered**:

#### **Bundle Size Optimization**
```bash
# Analyze bundle
npx webpack-bundle-analyzer

# Common issues:
# • Large dependencies (lodash, moment.js)
# • Duplicate dependencies
# • Unused code

# Solutions:
# 1. Tree-shaking (import only what you need)
import { debounce } from 'lodash-es'; // ✅ Tree-shakeable
// vs
import _ from 'lodash'; // ❌ Imports everything

# 2. Replace heavy libraries
# moment.js (288KB) → date-fns (13KB) or dayjs (2KB)

# 3. Dynamic imports for large libraries
const Chart = lazy(() => import('chart.js'));
```

#### **Code Splitting**
```jsx
// Route-based splitting (most common)
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// Component-based splitting
const HeavyModal = lazy(() => import('./HeavyModal'));

function App() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>Open</button>
      {showModal && (
        <Suspense fallback={<Spinner />}>
          <HeavyModal onClose={() => setShowModal(false)} />
        </Suspense>
      )}
    </>
  );
}

// Library splitting
const Markdown = lazy(() => 
  import('react-markdown').then(module => ({ default: module.default }))
);
```

#### **Lazy Loading**
```jsx
// Images
<img 
  src="placeholder.jpg" 
  data-src="real-image.jpg" 
  loading="lazy" 
/>

// Intersection Observer (manual)
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));

// React library: react-lazyload
import LazyLoad from 'react-lazyload';

<LazyLoad height={200} offset={100}>
  <img src="image.jpg" />
</LazyLoad>
```

#### **Minification & Compression**
```javascript
// Webpack production config
module.exports = {
  mode: 'production', // Enables minification
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log
          },
        },
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
      },
    },
  },
};

// Server compression (gzip/brotli)
// Nginx config:
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

// Brotli (better than gzip)
brotli on;
brotli_comp_level 6;
```

**Interview Questions**:
- "How do you reduce bundle size?"
- "Explain code splitting strategies."
- "When would you lazy load a component?"

**Interview Relevance**: 🔥🔥🔥🔥
Common in frontend optimization discussions.

---

### Module 7.3 — Rendering Performance
**Focus**: Re-render optimization, memoization

**Topics Covered**:

#### **React Re-render Optimization**
```jsx
// Problem: Unnecessary re-renders
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ExpensiveChild /> {/* Re-renders every time count changes! */}
    </>
  );
}

// Solution 1: React.memo
const ExpensiveChild = React.memo(() => {
  console.log('Rendering ExpensiveChild');
  return <div>Heavy computation...</div>;
});

// Solution 2: Move state down
function Parent() {
  return (
    <>
      <Counter /> {/* State isolated here */}
      <ExpensiveChild />
    </>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

#### **useMemo & useCallback**
```jsx
// useMemo: Memoize expensive computations
function ProductList({ products, filter }) {
  // ❌ Bad: Re-filter on every render
  const filtered = products.filter(p => p.category === filter);
  
  // ✅ Good: Only re-filter when dependencies change
  const filtered = useMemo(
    () => products.filter(p => p.category === filter),
    [products, filter]
  );
  
  return <div>{filtered.map(renderProduct)}</div>;
}

// useCallback: Memoize functions (for props)
function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ Bad: New function on every render (child re-renders)
  const handleClick = () => console.log('Clicked');
  
  // ✅ Good: Same function reference
  const handleClick = useCallback(
    () => console.log('Clicked'),
    [] // No dependencies
  );
  
  return <Child onClick={handleClick} />;
}

const Child = React.memo(({ onClick }) => {
  return <button onClick={onClick}>Click</button>;
});
```

#### **Virtualization (Large Lists)**
```jsx
// Problem: Rendering 10,000 items is slow
function BadList({ items }) {
  return (
    <div>
      {items.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
}

// Solution: react-window (only render visible items)
import { FixedSizeList } from 'react-window';

function GoodList({ items }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <Item {...items[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}

// For variable sizes: VariableSizeList
// For grids: FixedSizeGrid
```

#### **Debouncing & Throttling**
```jsx
import { debounce, throttle } from 'lodash-es';
import { useMemo } from 'react';

function SearchInput() {
  // Debounce: Wait for user to stop typing
  const handleSearch = useMemo(
    () => debounce((query) => {
      fetch(`/api/search?q=${query}`);
    }, 300),
    []
  );
  
  return <input onChange={(e) => handleSearch(e.target.value)} />;
}

function ScrollHandler() {
  // Throttle: Limit execution rate
  const handleScroll = useMemo(
    () => throttle(() => {
      console.log('Scrolled');
    }, 100),
    []
  );
  
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
}
```

**Interview Questions**:
- "How do you prevent unnecessary re-renders?"
- "When should you use useMemo?"
- "How do you render 100,000 items performantly?"

**Interview Relevance**: 🔥🔥🔥🔥🔥
Core React performance question.

---

### Module 7.4 — Main Thread Management
**Focus**: Web Workers, task scheduling

**Topics Covered**:

#### **Long Tasks**
```javascript
// Problem: Long task blocks main thread (janky UI)
function processLargeDataset(data) {
  for (let i = 0; i < 1000000; i++) {
    // Heavy computation... (blocks UI for 2 seconds)
  }
}

// Solution 1: Break into chunks with setTimeout
function processLargeDataset(data) {
  let i = 0;
  
  function processChunk() {
    const chunkSize = 1000;
    const end = Math.min(i + chunkSize, data.length);
    
    for (; i < end; i++) {
      // Process item
    }
    
    if (i < data.length) {
      setTimeout(processChunk, 0); // Yield to browser
    }
  }
  
  processChunk();
}

// Solution 2: requestIdleCallback (run when idle)
function processLargeDataset(data) {
  let i = 0;
  
  function processChunk(deadline) {
    while (i < data.length && deadline.timeRemaining() > 0) {
      // Process item
      i++;
    }
    
    if (i < data.length) {
      requestIdleCallback(processChunk);
    }
  }
  
  requestIdleCallback(processChunk);
}

// Solution 3: scheduler.postTask (modern API)
async function processLargeDataset(data) {
  for (let i = 0; i < data.length; i += 1000) {
    await scheduler.postTask(
      () => processChunk(data.slice(i, i + 1000)),
      { priority: 'background' }
    );
  }
}
```

#### **Web Workers**
```javascript
// Main thread
const worker = new Worker('worker.js');

worker.postMessage({ data: largeDataset });

worker.onmessage = (e) => {
  const result = e.data;
  console.log('Processed:', result);
};

// worker.js (separate thread)
self.onmessage = (e) => {
  const { data } = e.message;
  
  // Heavy computation (doesn't block main thread!)
  const result = data.map(item => /* expensive operation */);
  
  self.postMessage(result);
};

// React integration
import { useEffect, useState } from 'react';

function useWorker(workerFunction, data) {
  const [result, setResult] = useState(null);
  
  useEffect(() => {
    const worker = new Worker(
      URL.createObjectURL(
        new Blob([`(${workerFunction.toString()})()`])
      )
    );
    
    worker.postMessage(data);
    worker.onmessage = (e) => setResult(e.data);
    
    return () => worker.terminate();
  }, [data]);
  
  return result;
}
```

#### **Time Slicing (React Concurrent)**
```jsx
// React 18: Concurrent rendering
import { startTransition } from 'react';

function App() {
  const [input, setInput] = useState('');
  const [list, setList] = useState([]);
  
  const handleChange = (e) => {
    // High priority: Update input immediately
    setInput(e.target.value);
    
    // Low priority: Update list in background
    startTransition(() => {
      const filtered = heavyFilter(data, e.target.value);
      setList(filtered);
    });
  };
  
  return (
    <>
      <input value={input} onChange={handleChange} />
      <List items={list} />
    </>
  );
}

// useDeferredValue: Another way
const deferredValue = useDeferredValue(value);
```

**Interview Questions**:
- "How do you handle long-running tasks?"
- "Explain Web Workers. When would you use them?"
- "What is time slicing?"

**Interview Relevance**: 🔥🔥🔥🔥
Asked for performance-critical applications.

---

## 🎓 Study Plan

### Week 1: Metrics
- **Day 1-2**: Core Web Vitals (LCP, FID, CLS)
- **Day 3-4**: Chrome DevTools profiling
- **Day 5**: React DevTools Profiler
- **Day 6-7**: Measure real app, identify bottlenecks

### Week 2: Code Optimization
- **Day 1-2**: Bundle analysis, tree-shaking
- **Day 3-4**: Code splitting, lazy loading
- **Day 5-6**: Minification, compression
- **Day 7**: Optimize real app bundle

### Week 3: Rendering
- **Day 1-2**: Re-render optimization, React.memo
- **Day 3-4**: useMemo, useCallback
- **Day 5-6**: Virtualization, debouncing
- **Day 7**: Optimize real app renders

### Week 4: Main Thread
- **Day 1-3**: Long tasks, Web Workers
- **Day 4-5**: Time slicing, concurrent React
- **Day 6-7**: Full performance audit of app

---

## 📊 Assessment Checklist

### Module 7.1: Metrics
- [ ] Can explain Core Web Vitals
- [ ] Can use Chrome DevTools Performance panel
- [ ] Can profile React components
- [ ] Can measure real user metrics

### Module 7.2: Code Optimization
- [ ] Can analyze and reduce bundle size
- [ ] Can implement code splitting
- [ ] Can lazy load components/routes
- [ ] Can configure minification/compression

### Module 7.3: Rendering
- [ ] Can prevent unnecessary re-renders
- [ ] Can use useMemo/useCallback appropriately
- [ ] Can implement virtualization
- [ ] Can debounce/throttle events

### Module 7.4: Main Thread
- [ ] Can identify and fix long tasks
- [ ] Can use Web Workers
- [ ] Can implement time slicing
- [ ] Can use requestIdleCallback

---

## 💡 Key Takeaways

### Performance Optimization Checklist

```
┌─────────────────────────────────────────────────────────────┐
│           PERFORMANCE OPTIMIZATION CHECKLIST                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ LOADING PERFORMANCE                                      │
│     □ Optimize images (WebP, compression)                   │
│     □ Code splitting (routes + lazy)                        │
│     □ Preload critical resources                            │
│     □ Remove render-blocking CSS/JS                         │
│     □ Use CDN for static assets                             │
│     □ Enable compression (gzip/brotli)                      │
│                                                              │
│  ✅ RENDERING PERFORMANCE                                    │
│     □ Minimize re-renders (React.memo)                      │
│     □ Memoize expensive computations (useMemo)              │
│     □ Virtualize long lists (react-window)                  │
│     □ Debounce/throttle expensive operations                │
│     □ Optimize animations (transform/opacity)               │
│                                                              │
│  ✅ RUNTIME PERFORMANCE                                      │
│     □ Break up long tasks                                   │
│     □ Use Web Workers for heavy computation                 │
│     □ Implement time slicing                                │
│     □ Lazy load non-critical code                           │
│                                                              │
│  ✅ NETWORK PERFORMANCE                                      │
│     □ Minimize requests (bundling)                          │
│     □ Use HTTP/2 (multiplexing)                             │
│     □ Implement caching strategies                          │
│     □ Prefetch/preload next pages                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Recommended Resources

### Documentation
- [web.dev - Core Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [MDN - Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)

### Tools
- **Lighthouse**: Automated audits
- **Chrome DevTools**: Profiling
- **webpack-bundle-analyzer**: Bundle analysis
- **React DevTools**: Component profiling

### Articles
- [The Cost of JavaScript](https://v8.dev/blog/cost-of-javascript-2019)
- [Optimizing Performance](https://react.dev/reference/react/memo)

---

## 🎬 Next Steps

**Proceed to**: [PART 8 — Assets & Resource Optimization](../PART%208️⃣%20—%20Assets%20&%20Resource%20Optimization/README.md)

---

**Part 7 Status**: Performance Mastery ✅
**Estimated Study Time**: 4 weeks
**Next Part**: Assets & Resource Optimization

You're now a performance expert! ⚡
