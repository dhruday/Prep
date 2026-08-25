# 139. Performance Monitoring

## 1. High-Level Explanation (Frontend Interview Level)

**Performance Monitoring** is the continuous measurement and analysis of frontend performance metrics in production to detect regressions, optimize user experience, and meet performance budgets.

- **What**: Track Core Web Vitals (LCP, FID/INP, CLS), page load metrics, API latency, resource timing—aggregate data from real users for actionable insights
- **Why**: Detect performance regressions early, correlate speed with conversion/revenue, meet SLAs, optimize for real user conditions
- **When**: Essential for all production apps, critical for e-commerce/content sites where speed = revenue, required for Core Web Vitals compliance
- **Role**: Data-driven performance optimization enabling proactive issue detection and continuous improvement

**Key Principle**: "You can't improve what you don't measure"—systematic monitoring drives performance culture.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Core Web Vitals Tracking

**1. Web Vitals Library**:
```typescript
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';

interface Metric {
  name: 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    
    // Context
    url: window.location.href,
    userAgent: navigator.userAgent,
    connection: (navigator as any).connection?.effectiveType,
    
    // User info
    userId: getUserId(),
    sessionId: getSessionId(),
    
    // Environment
    timestamp: Date.now(),
    version: process.env.REACT_APP_VERSION
  });
  
  // Use sendBeacon for reliability
  navigator.sendBeacon('/api/web-vitals', body);
}

// Track all Core Web Vitals
onCLS(sendToAnalytics);
onFID(sendToAnalytics); // or onINP for Chrome 96+
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
onINP(sendToAnalytics);
```

**2. Custom Performance Monitor**:
```typescript
class PerformanceMonitor {
  private observer: PerformanceObserver | null = null;
  private metrics: Map<string, number[]> = new Map();
  
  init() {
    this.trackNavigationTiming();
    this.trackResourceTiming();
    this.trackLongTasks();
    this.trackLayoutShifts();
  }
  
  private trackNavigationTiming() {
    if (!('performance' in window)) return;
    
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (!navigation) return;
        
        const metrics = {
          // DNS
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          
          // TCP
          tcp: navigation.connectEnd - navigation.connectStart,
          
          // SSL
          ssl: navigation.secureConnectionStart > 0 
            ? navigation.connectEnd - navigation.secureConnectionStart 
            : 0,
          
          // TTFB
          ttfb: navigation.responseStart - navigation.requestStart,
          
          // Response
          response: navigation.responseEnd - navigation.responseStart,
          
          // DOM Processing
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          domComplete: navigation.domComplete - navigation.fetchStart,
          
          // Load
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart
        };
        
        this.sendMetrics('navigation', metrics);
      }, 0);
    });
  }
  
  private trackResourceTiming() {
    if (!('PerformanceObserver' in window)) return;
    
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        
        // Group by resource type
        const type = this.getResourceType(resource.name);
        
        const timing = {
          name: resource.name,
          type,
          duration: resource.duration,
          size: resource.transferSize,
          
          // Breakdown
          dns: resource.domainLookupEnd - resource.domainLookupStart,
          tcp: resource.connectEnd - resource.connectStart,
          ttfb: resource.responseStart - resource.requestStart,
          download: resource.responseEnd - resource.responseStart,
          
          // Cache
          cached: resource.transferSize === 0 && resource.decodedBodySize > 0
        };
        
        // Track slow resources
        if (timing.duration > 1000) {
          this.sendMetrics('slow-resource', timing);
        }
        
        // Aggregate by type
        this.aggregateMetric(`resource:${type}:duration`, timing.duration);
        this.aggregateMetric(`resource:${type}:size`, timing.size);
      }
    });
    
    this.observer.observe({ entryTypes: ['resource'] });
  }
  
  private trackLongTasks() {
    if (!('PerformanceObserver' in window)) return;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Long task > 50ms blocks main thread
        this.sendMetrics('long-task', {
          duration: entry.duration,
          startTime: entry.startTime,
          name: entry.name,
          attribution: (entry as any).attribution
        });
      }
    });
    
    observer.observe({ entryTypes: ['longtask'] });
  }
  
  private trackLayoutShifts() {
    if (!('PerformanceObserver' in window)) return;
    
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;
        
        // Only count unexpected shifts (not user-initiated)
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
          clsEntries.push(entry);
          
          // Log significant shifts
          if (layoutShift.value > 0.1) {
            this.sendMetrics('layout-shift', {
              value: layoutShift.value,
              sources: layoutShift.sources,
              startTime: layoutShift.startTime
            });
          }
        }
      }
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
    
    // Send final CLS on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.sendMetrics('cls-final', {
          value: clsValue,
          entries: clsEntries.length
        });
      }
    });
  }
  
  private getResourceType(url: string): string {
    if (/\.js/.test(url)) return 'script';
    if (/\.css/.test(url)) return 'stylesheet';
    if (/\.(png|jpg|jpeg|gif|webp|svg)/.test(url)) return 'image';
    if (/\.(woff|woff2|ttf|eot)/.test(url)) return 'font';
    if (/\/api\//.test(url)) return 'api';
    return 'other';
  }
  
  private aggregateMetric(key: string, value: number) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)!.push(value);
  }
  
  private sendMetrics(type: string, data: any) {
    const body = JSON.stringify({
      type,
      data,
      url: window.location.href,
      timestamp: Date.now(),
      userId: getUserId(),
      sessionId: getSessionId()
    });
    
    navigator.sendBeacon('/api/performance', body);
  }
  
  getAggregatedMetrics() {
    const aggregated: Record<string, any> = {};
    
    for (const [key, values] of this.metrics.entries()) {
      aggregated[key] = {
        count: values.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: this.percentile(values, 50),
        p95: this.percentile(values, 95),
        p99: this.percentile(values, 99),
        max: Math.max(...values)
      };
    }
    
    return aggregated;
  }
  
  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

export const performanceMonitor = new PerformanceMonitor();
performanceMonitor.init();
```

### API Performance Tracking

**Track Fetch Performance**:
```typescript
// Intercept fetch for timing
const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const startTime = performance.now();
  const url = args[0] instanceof Request ? args[0].url : String(args[0]);
  
  try {
    const response = await originalFetch(...args);
    const duration = performance.now() - startTime;
    
    // Track API performance
    trackAPIMetric({
      url,
      method: args[1]?.method || 'GET',
      status: response.status,
      duration,
      success: response.ok,
      cached: response.headers.get('X-Cache') === 'HIT'
    });
    
    // Alert on slow APIs
    if (duration > 3000) {
      console.warn(`Slow API: ${url} took ${duration}ms`);
      sendSlowAPIAlert(url, duration);
    }
    
    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    trackAPIMetric({
      url,
      method: args[1]?.method || 'GET',
      status: 0,
      duration,
      success: false,
      error: String(error)
    });
    
    throw error;
  }
};

function trackAPIMetric(metric: any) {
  navigator.sendBeacon('/api/metrics/api', JSON.stringify(metric));
}
```

### React Performance Profiling

**Profiler Component**:
```typescript
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id, // Component identifier
  phase, // "mount" or "update"
  actualDuration, // Time spent rendering
  baseDuration, // Estimated time without memoization
  startTime,
  commitTime,
  interactions
) => {
  // Track slow renders
  if (actualDuration > 100) {
    console.warn(`Slow render: ${id} took ${actualDuration}ms`);
    
    sendPerformanceMetric({
      type: 'react-render',
      componentId: id,
      phase,
      actualDuration,
      baseDuration,
      wasted: baseDuration - actualDuration // Memoization savings
    });
  }
};

// Wrap components
<Profiler id="Dashboard" onRender={onRenderCallback}>
  <Dashboard />
</Profiler>
```

### Performance Budgets

**Automated Budget Enforcement**:
```typescript
interface PerformanceBudget {
  metric: string;
  budget: number; // ms or score
  tolerance: number; // % over budget allowed
}

const budgets: PerformanceBudget[] = [
  { metric: 'LCP', budget: 2500, tolerance: 0.1 },      // 2.5s ± 10%
  { metric: 'FID', budget: 100, tolerance: 0 },         // 100ms strict
  { metric: 'CLS', budget: 0.1, tolerance: 0.2 },       // 0.1 ± 20%
  { metric: 'TTFB', budget: 800, tolerance: 0.15 },     // 800ms ± 15%
  { metric: 'bundle-size', budget: 200000, tolerance: 0.05 } // 200KB ± 5%
];

class BudgetMonitor {
  private violations: Map<string, number> = new Map();
  
  checkBudget(metric: string, value: number) {
    const budget = budgets.find(b => b.metric === metric);
    
    if (!budget) return;
    
    const maxAllowed = budget.budget * (1 + budget.tolerance);
    
    if (value > maxAllowed) {
      this.recordViolation(metric, value, budget.budget);
      
      // Alert on budget violation
      sendAlert({
        severity: 'HIGH',
        message: `Performance budget exceeded: ${metric}`,
        expected: budget.budget,
        actual: value,
        overBy: ((value - budget.budget) / budget.budget * 100).toFixed(1) + '%'
      });
    }
  }
  
  private recordViolation(metric: string, value: number, budget: number) {
    const count = this.violations.get(metric) || 0;
    this.violations.set(metric, count + 1);
    
    // Fail CI if repeated violations
    if (count > 10) {
      throw new Error(`${metric} exceeded budget ${count} times`);
    }
  }
}
```

### Real User Monitoring (RUM) vs Synthetic

**RUM** (Real users):
- Actual user conditions (device, network, location)
- High volume, statistical significance
- Detects real-world issues

**Synthetic** (Lab):
- Controlled conditions (Lighthouse CI)
- Reproducible, debugging-friendly
- Catches regressions before production

**Use both**: Synthetic in CI/CD, RUM in production.

### What NOT to Do

- ❌ **Only synthetic monitoring** (misses real user issues)
- ❌ **No performance budgets** (gradual regression)
- ❌ **Track everything** (sample for cost efficiency)
- ❌ **No alerting** (detect issues too late)
- ❌ **Ignore mobile/slow networks** (most users)

---

## 3. Clear Real-World Examples

### Example 1: Vercel Analytics

**Built-in Web Vitals**:
```tsx
// Next.js App Router
export function reportWebVitals(metric: NextWebVitalsMetric) {
  const body = JSON.stringify(metric);
  const url = '/api/vitals';
  
  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { body, method: 'POST', keepalive: true });
  }
}
```

**Dashboard**: Automatic Web Vitals tracking per page, device, country.

### Example 2: Google Analytics 4

**Track Core Web Vitals**:
```typescript
import { onCLS, onFID, onLCP } from 'web-vitals';

function sendToGoogleAnalytics({ name, delta, id }: Metric) {
  gtag('event', name, {
    event_category: 'Web Vitals',
    value: Math.round(delta),
    event_label: id,
    non_interaction: true
  });
}

onCLS(sendToGoogleAnalytics);
onFID(sendToGoogleAnalytics);
onLCP(sendToGoogleAnalytics);
```

**Scale**: GA4 tracks Web Vitals for millions of sites.

### Example 3: Custom RUM Dashboard

**Backend Aggregation**:
```typescript
// Calculate percentiles
const lcpStats = await MetricModel.aggregate([
  {
    $match: {
      metric: 'LCP',
      timestamp: { $gte: new Date(Date.now() - 86400000) } // Last 24h
    }
  },
  {
    $group: {
      _id: '$url',
      p75: { $percentile: { input: '$value', p: [0.75], method: 'approximate' } },
      p95: { $percentile: { input: '$value', p: [0.95], method: 'approximate' } },
      count: { $sum: 1 }
    }
  },
  {
    $sort: { 'p75.0': -1 } // Slowest pages first
  }
]);

// Google CrUX thresholds
const rating = lcpStats.p75[0] <= 2500 ? 'good' 
  : lcpStats.p75[0] <= 4000 ? 'needs-improvement' 
  : 'poor';
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you monitor frontend performance in production?"

**Answer**:

"I'd implement **comprehensive RUM** with Core Web Vitals and custom metrics:

**1. Core Web Vitals**:

Use `web-vitals` library:
```typescript
import { onLCP, onFID, onCLS } from 'web-vitals';

onLCP(sendToAnalytics);
onFID(sendToAnalytics);
onCLS(sendToAnalytics);
```

Track LCP (< 2.5s), FID (< 100ms), CLS (< 0.1) per page.

**2. Navigation Timing**:

Capture TTFB, DOM load, full load:
```typescript
const nav = performance.getEntriesByType('navigation')[0];
const ttfb = nav.responseStart - nav.requestStart;
```

**3. Resource Timing**:

Track slow resources (> 1s):
```typescript
PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 1000) {
      trackSlowResource(entry.name, entry.duration);
    }
  }
}).observe({ entryTypes: ['resource'] });
```

**4. Long Tasks**:

Detect main thread blocking (> 50ms):
```typescript
PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    trackLongTask(entry.duration);
  }
}).observe({ entryTypes: ['longtask'] });
```

**5. API Performance**:

Intercept fetch, track duration:
```typescript
const start = performance.now();
await fetch('/api/products');
const duration = performance.now() - start;
```

Alert if > 3s.

**6. Performance Budgets**:

Enforce budgets in CI:
- LCP < 2.5s
- Bundle size < 200KB
- TTFB < 800ms

Fail build if exceeded.

**7. Sampling**:

100% Core Web Vitals, 10% resource timing (cost).

**8. Dashboards**:

**Datadog** or **Google Analytics**:
- P75/P95 by page, device, country
- Trends over time (detect regressions)
- Correlate with revenue (faster = more $$)

**9. Alerting**:

Alert if:
- LCP P75 > 3s (sustained 5 min)
- Error rate > 1%
- API latency > 2x baseline

**10. Mobile Tracking**:

Track separately (mobile 2-3x slower than desktop). Different budgets for mobile.

**Trade-offs**:

RUM adds ~5KB JS bundle. Sampling reduces cost but delays detection. I'd sample non-critical pages, track 100% of checkout/payment.

**Real-World**: Amazon: 100ms faster = 1% revenue increase. Google: 500ms slower = 20% drop in traffic."

---

## 6. Why & How Summary

### Why It Matters

**Revenue**: 100ms faster = 1% more revenue (Amazon)  
**SEO**: Core Web Vitals affect search ranking  
**Retention**: Slow sites lose 53% of mobile users

### How It Works

**1. Capture**: Web Vitals + resource timing + long tasks  
**2. Aggregate**: P75/P95 by page, device, country  
**3. Alert**: Budget violations trigger alerts  
**4. Optimize**: Data-driven improvements  
**5. Monitor**: Track impact of changes

**FAANG**: RUM + synthetic, < 5 min detection, automated budgets, correlate speed with conversion
