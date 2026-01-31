# 54. Frontend Performance Metrics

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Frontend Performance Metrics** are quantifiable measurements that help us understand how fast, responsive, and user-friendly a web application is. They capture the user's perception of performance—not just technical benchmarks.

### What They Are:
- **Standardized measurements** of loading speed, interactivity, and visual stability
- **User-centric metrics** that correlate with real user experience
- **Key performance indicators (KPIs)** used for monitoring, alerting, and optimization

### Why They Exist:
- **Business Impact**: 100ms delay can reduce conversion by 7% (Amazon study)
- **User Retention**: 53% of mobile users abandon sites that take >3s to load
- **SEO Rankings**: Google uses Core Web Vitals as ranking signals
- **Competitive Advantage**: Faster sites lead to higher engagement and revenue

### When and Where Used:
- **Development**: Performance budgets during feature development
- **CI/CD**: Automated performance testing in pipelines
- **Production Monitoring**: Real-User Monitoring (RUM) and synthetic monitoring
- **A/B Testing**: Comparing performance impact of different implementations
- **Post-Incident Analysis**: Understanding performance regressions

### Role in Large-Scale Frontend Applications:
At FAANG scale, performance metrics are:
- Tracked per **region, device type, network condition**
- Integrated into **alerting systems** (PagerDuty, Datadog)
- Used for **capacity planning** and infrastructure decisions
- Part of **team SLAs and OKRs**
- Critical for **mobile-first markets** (India, Southeast Asia, Africa)

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Core Web Vitals (Google's User-Centric Metrics)

#### **LCP (Largest Contentful Paint)**
- **What**: Time until the largest visible content element renders
- **Why It Matters**: Represents perceived loading speed
- **Good**: < 2.5s | **Needs Improvement**: 2.5s - 4s | **Poor**: > 4s
- **What Counts**: `<img>`, `<video>`, block-level elements with background images, text blocks
- **Technical Details**:
  - Measured from navigation start to render time
  - Can change as page loads (progressive rendering)
  - Stops tracking after first user interaction (scroll, click)
  - Affected by: server response time, render-blocking resources, client-side rendering

#### **FID (First Input Delay) → INP (Interaction to Next Paint)**
- **FID** (being replaced):
  - Time from first user interaction to browser response
  - Measures input latency, not processing time
  - Good: < 100ms
- **INP** (new standard, 2024+):
  - Latency of ALL interactions throughout page lifecycle
  - Measures full interaction duration (input delay + processing + rendering)
  - Good: < 200ms | Poor: > 500ms
  - **Why Better**: Captures ongoing interactivity, not just first input

#### **CLS (Cumulative Layout Shift)**
- **What**: Sum of all unexpected layout shifts during page lifecycle
- **Formula**: `Impact Fraction × Distance Fraction`
- **Good**: < 0.1 | **Needs Improvement**: 0.1 - 0.25 | **Poor**: > 0.25
- **Common Causes**:
  - Images/ads without dimensions
  - Dynamically injected content above existing content
  - Web fonts causing FOIT/FOUT (Flash of Invisible/Unstyled Text)
  - Animations triggering layout instead of using transforms

### Additional Critical Metrics

#### **TTFB (Time to First Byte)**
- First byte of response from server
- Good: < 200ms on 3G, < 100ms on fast connections
- Indicates: backend performance, CDN effectiveness, DNS/SSL overhead

#### **FCP (First Contentful Paint)**
- First DOM content rendered (text, image, canvas)
- Good: < 1.8s
- Different from FP (First Paint) which includes non-content

#### **TTI (Time to Interactive)**
- Page fully interactive (event handlers attached, 50ms response to input)
- Good: < 3.8s on mobile
- Critical for SPAs where JavaScript controls interactivity

#### **TBT (Total Blocking Time)**
- Sum of time between FCP and TTI where main thread is blocked >50ms
- Good: < 200ms
- Indicates JavaScript execution overhead

#### **Speed Index**
- How quickly content is visually populated
- Good: < 3.4s on mobile
- Based on visual progression of page load

### Browser Performance APIs

```javascript
// Navigation Timing API
const perfData = performance.getEntriesByType('navigation')[0];
console.log('DNS Lookup:', perfData.domainLookupEnd - perfData.domainLookupStart);
console.log('TCP Connection:', perfData.connectEnd - perfData.connectStart);
console.log('TTFB:', perfData.responseStart - perfData.requestStart);
console.log('DOM Interactive:', perfData.domInteractive - perfData.fetchStart);
console.log('DOM Complete:', perfData.domComplete - perfData.fetchStart);
console.log('Load Complete:', perfData.loadEventEnd - perfData.fetchStart);

// Resource Timing API
const resources = performance.getEntriesByType('resource');
const slowResources = resources.filter(r => r.duration > 1000);

// Paint Timing API
const paintMetrics = performance.getEntriesByType('paint');
const fcp = paintMetrics.find(m => m.name === 'first-contentful-paint')?.startTime;

// Largest Contentful Paint
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
}).observe({ entryTypes: ['largest-contentful-paint'] });

// Layout Shift (CLS)
let clsScore = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      clsScore += entry.value;
    }
  }
}).observe({ entryTypes: ['layout-shift'] });

// First Input Delay
new PerformanceObserver((list) => {
  const firstInput = list.getEntries()[0];
  console.log('FID:', firstInput.processingStart - firstInput.startTime);
}).observe({ entryTypes: ['first-input'] });
```

### Trade-offs and Considerations

#### **Synthetic vs Real-User Monitoring (RUM)**
| Aspect | Synthetic (Lab) | RUM (Field) |
|--------|-----------------|-------------|
| **Environment** | Controlled (Lighthouse, WebPageTest) | Real users, real conditions |
| **Consistency** | Highly reproducible | High variance |
| **Coverage** | Pre-release testing | Production only |
| **Cost** | Low (automated) | Higher (data collection, storage) |
| **Actionability** | Clear baselines | Harder to debug |

**Senior Decision**: Use both—synthetic for CI/CD gates, RUM for production reality.

#### **Percentiles Matter More Than Averages**
- **P50 (Median)**: Typical user experience
- **P75**: Above-average network/device constraints
- **P95**: Worst 5% (often mobile users on slow networks)
- **P99**: Edge cases, critical for global apps

**Example**: If P50 LCP is 2s but P95 is 8s, you're losing users in key markets.

#### **Device and Network Stratification**
At scale, segment metrics by:
- **Device Type**: Desktop, mobile, tablet
- **Network**: 4G, 3G, slow 3G, offline
- **Geography**: US (fast) vs India (slow)
- **User Cohort**: New vs returning users (caching impact)

### Performance Budgets

Define maximum acceptable values for key metrics:

```javascript
// Example Performance Budget (E-commerce)
const performanceBudget = {
  // Core Web Vitals
  LCP: { target: 2000, max: 2500 },
  FID: { target: 50, max: 100 },
  CLS: { target: 0.05, max: 0.1 },
  
  // Loading
  TTFB: { target: 200, max: 400 },
  FCP: { target: 1500, max: 1800 },
  TTI: { target: 3000, max: 3800 },
  
  // Bundle sizes
  jsBundle: { target: 200, max: 250 }, // KB
  cssBundle: { target: 50, max: 70 },
  
  // Requests
  httpRequests: { target: 50, max: 75 },
  
  // Stratified by device
  mobile: {
    LCP: { target: 2500, max: 3000 },
    TTI: { target: 4000, max: 5000 }
  }
};
```

### Common Pitfalls

1. **Optimizing for Wrong Metrics**
   - Focusing on load time while ignoring CLS
   - Improving TTI at expense of LCP

2. **Lab-Only Testing**
   - Lighthouse scores don't reflect real users
   - Not testing on slow networks/devices

3. **Ignoring Long-Tail Performance**
   - Only looking at P50, missing P95 problems
   - Not segmenting by geography/device

4. **Missing Attribution**
   - Knowing LCP is slow, but not why
   - Not tracking which component/resource caused issue

5. **No Regression Detection**
   - Shipping features without performance checks
   - Missing gradual degradation over time

### Real-World Failure Scenarios

**Case Study 1: Image Carousel Causing CLS**
- Marketing adds hero carousel without fixed height
- Each image loads with different dimensions
- CLS jumps from 0.05 to 0.4
- **Fix**: Reserve space with aspect-ratio CSS, skeleton loaders

**Case Study 2: Third-Party Script Killing INP**
- Analytics script added, blocking main thread
- INP increases from 150ms to 600ms
- **Fix**: Load scripts with `defer`, use web workers, implement request idling

**Case Study 3: Mobile Users Abandoned**
- P50 LCP looks good (2.2s), but P95 is 12s
- Investigation: mobile users on 3G in India
- **Fix**: Implement adaptive loading, smaller bundles for mobile, edge caching

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce Product Page (Amazon-Scale)

**Metrics Tracked**:
```javascript
// Critical User Journeys
const metricsTracking = {
  // Page Load
  productPageLCP: 'First product image render',
  productPageCLS: 'Layout stability during image/review load',
  
  // Interaction
  addToCartINP: 'Time from click to cart update',
  searchAutocompleteINP: 'Search input responsiveness',
  
  // Business Impact
  timeToAddCart: 'LCP + INP to first purchase action',
  checkoutFunnelPerformance: 'TTI at each checkout step'
};
```

**Performance Budget**:
- LCP < 2.5s (product image)
- CLS < 0.05 (no layout shifts during scroll)
- INP < 200ms (add to cart feels instant)

**Optimization Strategy**:
1. Preload product images
2. Use `aspect-ratio` for all images
3. Lazy load reviews below fold
4. Code-split checkout flow

### Example 2: Real-Time Dashboard (FAANG Monitoring)

**Challenge**: Live data updates cause layout shifts and janky interactions

**Metrics Focus**:
- **INP**: All chart interactions must feel < 100ms
- **CLS**: 0 layout shift as new data streams in
- **Custom Metric**: Chart Render Time (time to paint new data)

**Solution Architecture**:
```javascript
// Performance-optimized dashboard
class DashboardMetrics {
  constructor() {
    this.metrics = {
      chartRenderTime: [],
      interactionLatency: [],
      memoryUsage: []
    };
  }
  
  trackChartRender(chartId, duration) {
    this.metrics.chartRenderTime.push({
      chartId,
      duration,
      timestamp: Date.now()
    });
    
    // Alert if render > 100ms
    if (duration > 100) {
      this.sendAlert('Chart render slow', { chartId, duration });
    }
  }
  
  trackInteraction(action, duration) {
    this.metrics.interactionLatency.push({
      action,
      duration,
      timestamp: Date.now()
    });
    
    // Track as INP proxy
    if (duration > 200) {
      this.sendAlert('Interaction slow', { action, duration });
    }
  }
}
```

### Example 3: Social Media Feed (Twitter/Meta Scale)

**Infinite Scroll Performance**:
```javascript
// Virtualization for large lists
const FeedMetrics = {
  // Custom metrics
  scrollFPS: 'Maintain 60fps during scroll',
  imageLoadTime: 'Progressive image loading',
  feedItemRenderTime: 'Time to render single post',
  
  // Standard metrics affected
  INP: 'Like/share interaction latency',
  CLS: 'No shift as images load',
  memory: 'DOM node count < 1000'
};

// Monitoring scroll performance
let lastScrollTime = performance.now();
let frameDrops = 0;

window.addEventListener('scroll', () => {
  const now = performance.now();
  const delta = now - lastScrollTime;
  
  // 60fps = 16.67ms per frame
  if (delta > 16.67) {
    frameDrops++;
    
    // Log if consistent janky scroll
    if (frameDrops > 10) {
      logMetric('scroll-jank', { frameDrops, avgDelta: delta });
    }
  }
  
  lastScrollTime = now;
});
```

### Example 4: Single-Page Application (Gmail-Style)

**Challenge**: Initial load vs in-app navigation performance

**Metrics Strategy**:
```javascript
// Different budgets for different navigation types
const SPAMetrics = {
  initialLoad: {
    LCP: 2500,  // First email preview
    TTI: 3800,  // Can compose email
    FCP: 1500   // UI chrome visible
  },
  
  clientSideNavigation: {
    navigationTime: 200,  // Folder change
    renderTime: 100,      // Email list update
    INP: 50               // Instant feel for in-app actions
  },
  
  backgroundSync: {
    newEmailLatency: 1000,  // Show new email badge
    indexingTime: 5000      // Index for search
  }
};

// Track SPA navigations separately
function trackSPANavigation(from, to) {
  const startTime = performance.now();
  
  // Navigation logic...
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  logMetric('spa-navigation', {
    from,
    to,
    duration,
    budget: SPAMetrics.clientSideNavigation.navigationTime,
    exceeded: duration > SPAMetrics.clientSideNavigation.navigationTime
  });
}
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question**: "How do you measure and improve frontend performance at scale?"

**Strong Answer**:

"I approach frontend performance through three lenses: measurement, monitoring, and optimization.

**For measurement**, I focus on Core Web Vitals—LCP, INP, and CLS—because they correlate directly with user experience and business metrics. For example, at my previous company, we found that improving LCP from 3.2s to 2.1s increased our mobile conversion rate by 12%.

**The key is percentile-based monitoring**, not averages. We track P95 performance segmented by device type, network speed, and geography. This revealed that while our P50 LCP was great at 2s, P95 mobile users in Southeast Asia were seeing 8+ seconds, which we traced to unoptimized images and lack of edge caching.

**For monitoring**, we use both synthetic and RUM. Lighthouse runs in our CI/CD with strict performance budgets—if a PR regresses LCP by more than 200ms, it fails. In production, we use RUM via our observability platform to track real user metrics, with alerts on P95 degradation.

**For optimization**, I prioritize based on impact. For LCP, this usually means optimizing the critical rendering path—preloading hero images, eliminating render-blocking resources, using SSR for above-fold content. For INP, it's about debouncing expensive operations, using requestIdleCallback for non-critical work, and code-splitting to reduce initial JavaScript parse time.

**The trade-off** I navigate constantly is feature velocity vs performance. I advocate for performance budgets baked into our definition of done, so performance isn't an afterthought. We also use feature flags to A/B test performance impact of new features before full rollout.

**At scale**, we've implemented adaptive loading—serving smaller bundles and lower-res images to mobile/slow network users. We also track custom metrics beyond Core Web Vitals, like 'time to first interaction' for our key user journeys, because standard metrics don't always capture product-specific performance."

### Likely Follow-Up Questions

1. **"How do you handle third-party scripts impacting performance?"**
   - Load non-critical scripts asynchronously
   - Use facade pattern for heavy embeds (YouTube, chat widgets)
   - Implement request budgets per third-party
   - Consider server-side proxying for analytics

2. **"What's your process when LCP is slow but you can't identify the cause?"**
   - Use Performance Observer API to identify LCP element
   - Check TTFB—if slow, it's backend/network
   - Use DevTools Performance panel to find render-blocking resources
   - Check for client-side rendering waterfalls
   - Verify CDN cache hit rates

3. **"How do you prevent performance regressions?"**
   - Performance budgets in CI/CD (Lighthouse CI, WebPageTest API)
   - Bundle size tracking (bundlesize, bundlephobia)
   - Automated visual regression tests (Chromatic, Percy)
   - Performance dashboards with trend analysis
   - Regular performance audits (quarterly)

4. **"How would you optimize INP for a complex data grid?"**
   - Virtualize rows (react-window, react-virtualized)
   - Debounce sorting/filtering operations
   - Use Web Workers for heavy computations
   - Implement progressive rendering
   - Memoize expensive cell renderers
   - Consider pagination over infinite scroll

5. **"How do you balance performance with feature richness?"**
   - Establish performance as a feature requirement
   - Use performance budgets to force trade-off conversations
   - Implement progressive enhancement
   - Use A/B testing to measure impact
   - Consider adaptive loading based on device/network

### Comparison: Metrics Evolution

| Metric | Old Standard | New Standard | Why It Changed |
|--------|-------------|--------------|----------------|
| **Interactivity** | FID (first input only) | INP (all interactions) | FID missed ongoing janky UX |
| **Load** | Page Load Time | LCP | Load time doesn't reflect perceived speed |
| **Stability** | No standard | CLS | Visual stability critical for UX |
| **Overall** | PageSpeed Score | Core Web Vitals | User-centric vs technical score |

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Comprehensive Performance Monitoring Class

```javascript
/**
 * Production-grade performance monitoring
 * Tracks Core Web Vitals and custom metrics
 */
class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      enabledMetrics: ['LCP', 'FID', 'CLS', 'TTFB', 'FCP'],
      sampleRate: 1.0, // 100% sampling, reduce in production
      endpoint: '/api/metrics',
      ...config
    };
    
    this.metrics = {};
    this.init();
  }
  
  init() {
    if (Math.random() > this.config.sampleRate) return;
    
    this.trackNavigationTiming();
    this.trackCoreWebVitals();
    this.trackCustomMetrics();
    this.setupBeacon();
  }
  
  trackNavigationTiming() {
    window.addEventListener('load', () => {
      const navTiming = performance.getEntriesByType('navigation')[0];
      
      this.metrics.TTFB = navTiming.responseStart - navTiming.requestStart;
      this.metrics.domInteractive = navTiming.domInteractive - navTiming.fetchStart;
      this.metrics.domComplete = navTiming.domComplete - navTiming.fetchStart;
      this.metrics.loadComplete = navTiming.loadEventEnd - navTiming.fetchStart;
      
      // Track resource timing
      const resources = performance.getEntriesByType('resource');
      this.metrics.totalResources = resources.length;
      this.metrics.totalTransferSize = resources.reduce((sum, r) => sum + r.transferSize, 0);
      this.metrics.slowResources = resources.filter(r => r.duration > 1000).length;
    });
  }
  
  trackCoreWebVitals() {
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
      this.metrics.LCPElement = lastEntry.element?.tagName;
    }).observe({ entryTypes: ['largest-contentful-paint'], buffered: true });
    
    // FID (legacy, but still tracked)
    new PerformanceObserver((list) => {
      const firstInput = list.getEntries()[0];
      this.metrics.FID = firstInput.processingStart - firstInput.startTime;
      this.metrics.FIDTarget = firstInput.target?.tagName;
    }).observe({ entryTypes: ['first-input'], buffered: true });
    
    // INP (approximation, real implementation more complex)
    let worstINP = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = entry.processingStart - entry.startTime + entry.duration;
        if (duration > worstINP) {
          worstINP = duration;
          this.metrics.INP = worstINP;
        }
      }
    }).observe({ entryTypes: ['event'], buffered: true });
    
    // CLS
    let clsScore = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
          this.metrics.CLS = clsScore;
        }
      }
    }).observe({ entryTypes: ['layout-shift'], buffered: true });
    
    // FCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcp = entries.find(e => e.name === 'first-contentful-paint');
      if (fcp) {
        this.metrics.FCP = fcp.startTime;
      }
    }).observe({ entryTypes: ['paint'], buffered: true });
  }
  
  trackCustomMetrics() {
    // Time to Interactive (simplified)
    this.metrics.TTI = this.estimateTTI();
    
    // Long tasks (blocking main thread > 50ms)
    if ('PerformanceObserver' in window) {
      try {
        new PerformanceObserver((list) => {
          const longTasks = list.getEntries();
          this.metrics.longTaskCount = (this.metrics.longTaskCount || 0) + longTasks.length;
          this.metrics.totalBlockingTime = longTasks.reduce((sum, task) => {
            return sum + Math.max(0, task.duration - 50);
          }, this.metrics.totalBlockingTime || 0);
        }).observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // longtask not supported in all browsers
      }
    }
    
    // Memory (if available)
    if (performance.memory) {
      this.metrics.jsHeapSize = performance.memory.usedJSHeapSize;
      this.metrics.jsHeapLimit = performance.memory.jsHeapSizeLimit;
    }
  }
  
  estimateTTI() {
    // Simplified TTI estimation
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (!navTiming) return null;
    
    return navTiming.domInteractive - navTiming.fetchStart;
  }
  
  setupBeacon() {
    // Send metrics on page unload
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendMetrics();
      }
    });
    
    // Fallback for page close
    window.addEventListener('pagehide', () => {
      this.sendMetrics();
    });
  }
  
  sendMetrics() {
    const payload = {
      ...this.metrics,
      url: window.location.href,
      timestamp: Date.now(),
      connection: navigator.connection?.effectiveType,
      deviceMemory: navigator.deviceMemory,
      userAgent: navigator.userAgent
    };
    
    // Use sendBeacon for reliable delivery
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        this.config.endpoint,
        JSON.stringify(payload)
      );
    } else {
      // Fallback to fetch with keepalive
      fetch(this.config.endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true
      });
    }
  }
  
  // Public API for custom metrics
  trackCustomMetric(name, value) {
    this.metrics[name] = value;
  }
  
  // Mark custom timings
  mark(name) {
    performance.mark(name);
  }
  
  measure(name, startMark, endMark) {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    this.metrics[name] = measure.duration;
  }
}

// Usage
const monitor = new PerformanceMonitor({
  sampleRate: 0.1, // 10% sampling in production
  endpoint: 'https://metrics.example.com/collect'
});

// Track custom user journey
monitor.mark('search-start');
// ... user performs search
monitor.mark('search-end');
monitor.measure('search-duration', 'search-start', 'search-end');
```

### Performance Budget Enforcement (CI/CD)

```javascript
// lighthouse-budget.js
// Run in CI/CD pipeline to enforce performance budgets

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const PERFORMANCE_BUDGET = {
  'first-contentful-paint': 1800,
  'largest-contentful-paint': 2500,
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 200,
  'speed-index': 3400,
  'interactive': 3800
};

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port
  };
  
  const runnerResult = await lighthouse(url, options);
  await chrome.kill();
  
  return runnerResult.lhr;
}

async function checkBudget(url) {
  console.log(`🔍 Auditing ${url}...`);
  const results = await runLighthouse(url);
  
  const metrics = results.audits;
  let failed = false;
  
  console.log('\n📊 Performance Metrics:\n');
  
  for (const [key, budget] of Object.entries(PERFORMANCE_BUDGET)) {
    const audit = metrics[key];
    const value = audit.numericValue;
    const passed = value <= budget;
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${key}: ${value.toFixed(0)} (budget: ${budget})`);
    
    if (!passed) {
      failed = true;
    }
  }
  
  if (failed) {
    console.error('\n❌ Performance budget check FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ Performance budget check PASSED');
  }
}

// Run for staging environment
const url = process.env.STAGING_URL || 'http://localhost:3000';
checkBudget(url);
```

### React Component Performance Tracking

```javascript
// PerformanceTrackedComponent.jsx
import { useEffect, useRef } from 'react';

/**
 * HOC to track component render performance
 */
function withPerformanceTracking(Component, componentName) {
  return function PerformanceTrackedComponent(props) {
    const renderCount = useRef(0);
    const mountTime = useRef(null);
    
    useEffect(() => {
      // Track mount time
      if (!mountTime.current) {
        mountTime.current = performance.now();
        performance.mark(`${componentName}-mount`);
      }
      
      renderCount.current++;
      
      // Measure render time
      const renderStart = performance.now();
      
      return () => {
        const renderDuration = performance.now() - renderStart;
        
        // Log slow renders
        if (renderDuration > 16) { // Slower than 60fps
          console.warn(`Slow render: ${componentName} took ${renderDuration.toFixed(2)}ms`);
          
          // Send to monitoring
          window.performanceMonitor?.trackCustomMetric(
            `component-render-${componentName}`,
            renderDuration
          );
        }
        
        // Track excessive re-renders
        if (renderCount.current > 10) {
          console.warn(`Excessive re-renders: ${componentName} rendered ${renderCount.current} times`);
        }
      };
    });
    
    return <Component {...props} />;
  };
}

// Usage
const TrackedProductCard = withPerformanceTracking(ProductCard, 'ProductCard');

// Or with React DevTools Profiler
import { Profiler } from 'react';

function onRenderCallback(
  id, // the "id" prop of the Profiler tree
  phase, // "mount" or "update"
  actualDuration, // time spent rendering
  baseDuration, // estimated time to render without memoization
  startTime, // when React began rendering
  commitTime // when React committed this update
) {
  if (actualDuration > 16) {
    console.warn(`Component ${id} slow ${phase}: ${actualDuration}ms`);
    
    window.performanceMonitor?.trackCustomMetric(
      `profiler-${id}-${phase}`,
      actualDuration
    );
  }
}

function App() {
  return (
    <Profiler id="ProductList" onRender={onRenderCallback}>
      <ProductList />
    </Profiler>
  );
}
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience**:
- 53% of users abandon sites > 3s load time
- 1 second delay reduces conversions by 7%
- Users perceive faster sites as more trustworthy

**Business Impact**:
- **Pinterest**: Reduced load time by 40% → 15% increase in sign-ups
- **Walmart**: 1s improvement → 2% increase in conversions
- **BBC**: Lost 10% of users for every additional second of load time

**SEO & Visibility**:
- Google uses Core Web Vitals as ranking factor
- Faster sites get better mobile search rankings
- Performance is competitive advantage

**Developer Productivity**:
- Performance budgets catch regressions early
- Metrics drive optimization priorities
- Clear targets improve team alignment

### How It Works

**Technical Flow**:
1. **Browser collects timing data** via Performance APIs
2. **Metrics calculated** from raw timings (LCP, FID, CLS)
3. **Data sent** to analytics backend (beacon API)
4. **Aggregated** by percentile, device, geography
5. **Visualized** in dashboards (Grafana, Datadog)
6. **Alerts triggered** when thresholds exceeded
7. **Engineers investigate** and optimize

**Implementation Strategy**:
1. **Define budgets** based on business requirements
2. **Instrument** codebase with monitoring
3. **Collect** both synthetic and RUM data
4. **Analyze** percentiles, not averages
5. **Optimize** based on data-driven priorities
6. **Prevent regressions** via CI/CD gates
7. **Iterate** continuously

**Key Principle**: **Measure what matters to users, optimize for P95, prevent regressions.**

────────────────────────────────────

**In a senior/staff interview, demonstrate**:
- Understanding of Core Web Vitals and their business impact
- Experience with percentile-based monitoring
- Trade-offs between metrics (e.g., optimizing LCP might hurt TTI)
- Real production war stories (debugging performance issues at scale)
- Tooling knowledge (Lighthouse, WebPageTest, browser DevTools)
- Proactive thinking (performance budgets, regression prevention)
- User empathy (understanding slow networks, low-end devices)

