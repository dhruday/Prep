# 21. Browser Resource Prioritization

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Browser resource prioritization** is the sophisticated system browsers use to decide **which resources to fetch first when a page has hundreds of assets competing for limited network bandwidth**. Understanding this system is critical because **incorrect prioritization can delay critical resources by 2-10 seconds**, making the difference between a 2-second page load and a 10-second one.

### What it is:

**Every resource gets a priority score:**

```
Browser Priority Levels (Chrome):
- VeryHigh (5)
- High (4)
- Medium (3)
- Low (2)
- VeryLow (1)

Example page load:
┌─────────────────────────────────────────────────┐
│ Resource                    Priority    Why     │
├─────────────────────────────────────────────────┤
│ HTML document              VeryHigh    Main doc│
│ CSS in <head>              VeryHigh    Blocks  │
│ Blocking JS in <head>      High        Blocks  │
│ Fonts (preload)            VeryHigh    Preload │
│ Fonts (auto-discovered)    High        Text    │
│ Async scripts              Low         Defer   │
│ Images in viewport         High        Visible │
│ Images below fold          Low         Hidden  │
│ Prefetch resources         VeryLow     Future  │
└─────────────────────────────────────────────────┘

Impact: Resources with VeryHigh priority fetch first
Lower priority resources wait until bandwidth available
```

**Priority determines fetch order:**

```
Network waterfall with prioritization:

Without prioritization (bad):
t=0ms:    [HTML][Image1][Image2][Image3][CSS][JS]
t=1000ms: HTML done, but CSS/JS still waiting!
t=3000ms: CSS done, page can render
Result: 3-second delay to rendering

With prioritization (good):
t=0ms:    [HTML][CSS][JS][Image1][Image2][Image3]
t=1000ms: HTML + CSS + JS done, page renders!
t=3000ms: Images still loading, but page usable
Result: 1-second time to interactive

Savings: 2 seconds (67% faster)
```

### Why browsers need it:

**HTTP/1.1 problem: 6 connections per domain, must choose wisely**

```
Scenario: 50 resources, 6 connections

Without prioritization:
Connection 1: Large image (3MB, 20s) ← Blocks slot
Connection 2: Another image (2MB, 15s) ← Blocks slot
Connection 3: Another image (1MB, 10s) ← Blocks slot
Connection 4: CSS (50KB, 200ms) ← Good
Connection 5: JS (100KB, 400ms) ← Good
Connection 6: Yet another image (2MB, 15s) ← Blocks slot

Problem: 3 connections wasted on non-critical images
CSS/JS use 2 connections, but could be faster
Other critical resources wait behind images

With prioritization:
Connection 1: HTML (VeryHigh)
Connection 2: CSS (VeryHigh)
Connection 3: JS (High)
Connection 4: Font (High)
Connection 5: Viewport image (High)
Connection 6: Defer other resources (Low)

Result: Critical resources load first
Page renders 5-10× faster
```

**HTTP/2 problem: Bandwidth is limited, must allocate wisely**

```
HTTP/2 multiplexes unlimited streams, but bandwidth finite

Total bandwidth: 10 Mbps
Resources requesting simultaneously:
- CSS (50KB) - critical
- JS (200KB) - critical
- Image1 (5MB) - non-critical
- Image2 (3MB) - non-critical
- Image3 (2MB) - non-critical

Without prioritization:
Each resource gets equal bandwidth: 2 Mbps
CSS: 50KB @ 2 Mbps = 200ms
JS: 200KB @ 2 Mbps = 800ms
Images: Downloading simultaneously
Result: Critical resources artificially slowed

With prioritization:
VeryHigh resources (CSS) get 40% bandwidth: 4 Mbps
High resources (JS) get 30% bandwidth: 3 Mbps
Low resources (images) share 30%: 3 Mbps total

CSS: 50KB @ 4 Mbps = 100ms (2× faster!)
JS: 200KB @ 3 Mbps = 533ms (1.5× faster!)
Result: Critical resources load faster, page renders sooner
```

### Default browser prioritization rules:

**Resource type + position determines priority:**

```javascript
// CSS priorities
<link rel="stylesheet" href="critical.css">  // VeryHigh (in <head>)
<link rel="stylesheet" href="late.css">      // High (in <body>)
<style>/* inline */</style>                  // VeryHigh (inline)

// JavaScript priorities
<script src="blocking.js"></script>          // High (parser-blocking)
<script src="async.js" async></script>       // Low (async, non-blocking)
<script src="defer.js" defer></script>       // Low (defer, non-blocking)
<script type="module" src="mod.js"></script> // High (module, deferred by default)

// Image priorities
<img src="hero.jpg">                         // High (in viewport, discovered early)
<img src="below.jpg" loading="lazy">         // Low (lazy, below fold)
<img src="bg.jpg" style="display:none">      // VeryLow (hidden)

// Font priorities
<link rel="preload" href="font.woff2" as="font"> // VeryHigh (preloaded)
@font-face { src: url(font.woff2); }         // High (auto-discovered)

// Preload/prefetch priorities
<link rel="preload" href="critical.js" as="script"> // VeryHigh (preload)
<link rel="prefetch" href="next-page.js">    // VeryLow (prefetch, future nav)
<link rel="dns-prefetch" href="//cdn.com">   // VeryLow (DNS only)
```

**Position matters:**

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Resources here get higher priority -->
  <link rel="stylesheet" href="critical.css">  <!-- VeryHigh -->
  <script src="important.js"></script>          <!-- High -->
</head>
<body>
  <img src="hero.jpg">                          <!-- High (early in body) -->
  
  <div style="margin-top: 3000px">
    <img src="below-fold.jpg">                  <!-- Medium→Low (late discovery) -->
  </div>
  
  <!-- Resources here get lower priority -->
  <link rel="stylesheet" href="late.css">       <!-- Medium -->
  <script src="analytics.js" async></script>    <!-- Low -->
</body>
</html>
```

### Role in large-scale applications:

**Performance optimization at scale:**

```
E-commerce site: 1M page views/day

Without priority optimization:
- Average page: 120 resources
- Critical resources (CSS/JS/fonts): 5 resources
- Non-critical (images/ads): 115 resources
- Problem: Critical resources compete with 115 non-critical
- Page load: 6.2 seconds
- Bounce rate: 38%
- Conversion rate: 2.1%
- Lost revenue: Users leave before page interactive

With priority optimization:
- Same resources, but prioritized correctly
- Critical resources: VeryHigh/High priority
- Non-critical: Low priority, deferred
- Page load: 2.4 seconds (61% faster)
- Bounce rate: 26% (-32% relative)
- Conversion rate: 2.9% (+38% relative)
- Additional revenue: $18M/year

Business impact:
- Time to Interactive improvement: 3.8s saved
- Conversion lift: +0.8 percentage points
- At 1M daily visitors: 8,000 more conversions/day
- At $75 average order: $600K/day = $219M/year revenue increase
- Priority optimization ROI: ∞ (zero cost, massive benefit)
```

**CDN and edge optimization:**

```
Global media site: 50M users/day

Priority-aware CDN configuration:
{
  "rules": [
    {
      "match": "*.css",
      "priority": "critical",
      "cache": "edge",
      "ttl": "30d"
    },
    {
      "match": "*.js",
      "priority": "high",
      "cache": "edge",
      "ttl": "7d"
    },
    {
      "match": "/api/*",
      "priority": "critical",
      "cache": "none"
    },
    {
      "match": "*.jpg|*.png",
      "priority": "medium",
      "cache": "edge",
      "ttl": "90d",
      "lazy": true
    }
  ]
}

Impact:
- Critical resources served from edge (10-50ms)
- Non-critical resources queued behind critical
- Bandwidth allocation optimized per priority
- Result: 40% faster page loads globally
- Cost savings: Better cache hit rates = less origin traffic
- Annual savings: $12M bandwidth costs
```

### Manual priority control:

**Fetch Priority API (modern browsers):**

```html
<!-- Boost priority of critical resources -->
<img src="hero.jpg" fetchpriority="high">
<link rel="stylesheet" href="critical.css" fetchpriority="high">

<!-- Lower priority of non-critical resources -->
<img src="ad-banner.jpg" fetchpriority="low">
<script src="analytics.js" fetchpriority="low"></script>

<!-- Auto (default browser heuristics) -->
<img src="product.jpg" fetchpriority="auto">

<!-- JavaScript API -->
<script>
fetch('/critical-data', { priority: 'high' })
  .then(/* ... */);

fetch('/optional-data', { priority: 'low' })
  .then(/* ... */);
</script>
```

**Resource Hints:**

```html
<!-- Preload: Fetch now, high priority -->
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/hero.jpg" as="image">

<!-- Prefetch: Fetch when idle, very low priority -->
<link rel="prefetch" href="/next-page.css">

<!-- Preconnect: Establish connection early -->
<link rel="preconnect" href="https://cdn.example.com">

<!-- DNS-prefetch: Resolve DNS early -->
<link rel="dns-prefetch" href="//analytics.example.com">

Priority order: preload > preconnect > dns-prefetch > prefetch
```

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Browser Priority Calculation Algorithm

**Chrome's priority system (Blink rendering engine):**

```
Priority calculation factors:
1. Resource type
2. Document position
3. Viewport visibility
4. Preload/prefetch hints
5. Defer/async attributes
6. Media queries
7. HTTP/2 dependency tree
8. Browser heuristics

Base priority by resource type:
┌─────────────────────────────────────────────────┐
│ Resource Type          Base Priority            │
├─────────────────────────────────────────────────┤
│ Main document          VeryHigh                 │
│ CSS (render-blocking)  VeryHigh                 │
│ Font (preload)         VeryHigh                 │
│ Sync XHR              High                      │
│ Font (in CSS)         High                      │
│ Import                High                      │
│ Image (in viewport)   High                      │
│ Preload               High → VeryHigh           │
│ Script (blocking)     High/Medium               │
│ Script (async/defer)  Low                       │
│ Image (below fold)    Low                       │
│ Prefetch              VeryLow                   │
│ Ping/Beacon           VeryLow                   │
└─────────────────────────────────────────────────┘

Modifiers:
+ Preload hint: +1-2 levels
+ fetchpriority="high": +1 level
+ In <head>: +0-1 level
+ In viewport: +1 level
+ Parser blocking: +1 level
- fetchpriority="low": -1 level
- loading="lazy": -1-2 levels
- display: none: -2 levels
- Prefetch: -3 levels
```

**Detailed priority calculation examples:**

```html
<!-- Example 1: Critical CSS -->
<link rel="stylesheet" href="critical.css">

Priority calculation:
Base: VeryHigh (CSS)
+ In <head>: No change (already VeryHigh)
+ Render-blocking: No change (already VeryHigh)
Final: VeryHigh (5)

Fetch timing: Immediately, first in queue

<!-- Example 2: Hero image with preload -->
<link rel="preload" href="hero.jpg" as="image">
<img src="hero.jpg">

Priority calculation:
Base: High (image in viewport)
+ Preload hint: +1 level
+ fetchpriority not set: No change
Final: VeryHigh (5)

Fetch timing: Immediately, same priority as CSS

<!-- Example 3: Below-fold lazy image -->
<img src="lazy.jpg" loading="lazy">

Priority calculation:
Base: Low (image, position unknown initially)
+ loading="lazy": -1 level
+ Not in viewport: -1 level
Final: VeryLow (1)

Fetch timing: Deferred until near viewport

<!-- Example 4: Async script -->
<script src="analytics.js" async></script>

Priority calculation:
Base: Low (async script)
+ Non-blocking: No change (already Low)
+ fetchpriority not set: No change
Final: Low (2)

Fetch timing: After critical resources

<!-- Example 5: Critical JS with high priority -->
<script src="app.js" fetchpriority="high"></script>

Priority calculation:
Base: High (sync script)
+ fetchpriority="high": +1 level
+ In <head>: Assumed yes
Final: VeryHigh (5)

Fetch timing: Immediately, with CSS

<!-- Example 6: Prefetch for next navigation -->
<link rel="prefetch" href="next-page.css">

Priority calculation:
Base: VeryLow (prefetch)
+ Future navigation: No change
+ Idle fetch: No change
Final: VeryLow (1)

Fetch timing: Only when network idle, lowest priority
```

### HTTP/2 Priority Frames

**HTTP/2 implements priority via dependency tree:**

```
HTTP/2 PRIORITY frame structure:
┌──────────────────────────────────────────┐
│ Stream ID: Current stream               │
│ Dependency: Parent stream ID             │
│ Weight: 1-256 (relative importance)      │
│ Exclusive: Boolean                       │
└──────────────────────────────────────────┘

Priority tree for typical page:
                    Stream 0 (connection root)
                         |
        ┌────────────────┼────────────────┐
        |                |                |
    Stream 1         Stream 3         Stream 5
    HTML (256)       CSS (256)        JS (220)
    (root doc)       (critical)       (important)
                         |
                    Stream 7
                    Font (200)
                    (depends on CSS)
                         |
            ┌────────────┴────────────┐
        Stream 9              Stream 11
        Image1 (100)          Image2 (100)
        (medium)              (medium)
                                  |
                            Stream 13
                            AdImage (50)
                            (low priority)

Weight interpretation:
- Higher weight = more bandwidth allocation
- Stream with weight 256 gets 2× bandwidth of stream with weight 128
- Dependencies ensure parent streams complete before children

Bandwidth allocation example (10 Mbps total):
- Stream 1 (HTML): Not active (already complete)
- Stream 3 (CSS, weight 256): 40% = 4 Mbps
- Stream 5 (JS, weight 220): 35% = 3.5 Mbps
- Stream 7 (Font, depends on CSS): Waits for CSS, then 25% = 2.5 Mbps
- Stream 9, 11 (Images): Split remaining after font

Result: Critical resources get most bandwidth
```

**Priority frame examples:**

```
PRIORITY frame for CSS (high priority):
Stream ID: 3
Dependency: 0 (root)
Weight: 256 (maximum)
Exclusive: true (only high-priority stream)

Server interpretation:
- Allocate maximum bandwidth to stream 3
- Pause lower-priority streams if needed
- Deliver CSS frames ASAP

PRIORITY frame for lazy image (low priority):
Stream ID: 13
Dependency: 11 (another image)
Weight: 50 (low)
Exclusive: false (shares bandwidth)

Server interpretation:
- Allocate minimal bandwidth to stream 13
- Only send frames when higher-priority streams idle
- Can pause/resume to prioritize critical streams

PRIORITY frame reprioritization (dynamic):
// User scrolls, lazy image enters viewport
Client sends new PRIORITY frame:
Stream ID: 13
Dependency: 0 (root)
Weight: 150 (increased from 50)
Exclusive: false

Server adjusts:
- Increase bandwidth allocation to stream 13
- Deliver remaining frames faster
- Dynamic reprioritization!
```

### Priority and Bandwidth Allocation

**Chrome's bandwidth allocation algorithm:**

```javascript
// Simplified model of Chrome's network scheduler

class NetworkScheduler {
  constructor() {
    this.queues = {
      veryHigh: [],
      high: [],
      medium: [],
      low: [],
      veryLow: []
    };
    
    this.maxConnections = {
      http1: 6,    // 6 connections per domain
      http2: 1     // 1 connection, unlimited streams
    };
    
    this.bandwidthAllocation = {
      veryHigh: 0.40,  // 40% of bandwidth
      high: 0.30,      // 30%
      medium: 0.20,    // 20%
      low: 0.08,       // 8%
      veryLow: 0.02    // 2%
    };
  }
  
  scheduleRequest(request) {
    const priority = this.calculatePriority(request);
    this.queues[priority].push(request);
    this.processQueues();
  }
  
  calculatePriority(request) {
    let priority = this.getBasePriority(request.type);
    
    // Apply modifiers
    if (request.preload) priority = this.boost(priority, 1);
    if (request.fetchPriority === 'high') priority = this.boost(priority, 1);
    if (request.fetchPriority === 'low') priority = this.reduce(priority, 1);
    if (request.lazy) priority = this.reduce(priority, 2);
    if (request.inViewport) priority = this.boost(priority, 1);
    if (request.prefetch) priority = 'veryLow';
    
    return priority;
  }
  
  processQueues() {
    // HTTP/1.1: Process up to 6 concurrent requests
    // Prioritize queues: veryHigh → high → medium → low → veryLow
    
    const protocol = this.detectProtocol();
    
    if (protocol === 'http1') {
      this.processHTTP1();
    } else if (protocol === 'http2') {
      this.processHTTP2();
    }
  }
  
  processHTTP1() {
    const availableSlots = this.maxConnections.http1 - this.activeConnections();
    
    // Fill slots from highest priority queue first
    const priorities = ['veryHigh', 'high', 'medium', 'low', 'veryLow'];
    let slotsUsed = 0;
    
    for (const priority of priorities) {
      while (this.queues[priority].length > 0 && slotsUsed < availableSlots) {
        const request = this.queues[priority].shift();
        this.fetchRequest(request);
        slotsUsed++;
      }
      
      if (slotsUsed >= availableSlots) break;
    }
  }
  
  processHTTP2() {
    // HTTP/2: Fetch all requests, but allocate bandwidth by priority
    
    const totalBandwidth = this.getTotalBandwidth(); // e.g., 10 Mbps
    
    // Calculate bandwidth per priority level
    const allocations = {};
    for (const [priority, percentage] of Object.entries(this.bandwidthAllocation)) {
      const requestsInQueue = this.queues[priority].length;
      if (requestsInQueue > 0) {
        allocations[priority] = {
          total: totalBandwidth * percentage,
          perRequest: (totalBandwidth * percentage) / requestsInQueue
        };
      }
    }
    
    // Send all requests with bandwidth hints
    for (const [priority, allocation] of Object.entries(allocations)) {
      while (this.queues[priority].length > 0) {
        const request = this.queues[priority].shift();
        this.fetchHTTP2Request(request, {
          bandwidth: allocation.perRequest,
          weight: this.priorityToWeight(priority)
        });
      }
    }
  }
  
  priorityToWeight(priority) {
    const weights = {
      veryHigh: 256,
      high: 220,
      medium: 147,
      low: 110,
      veryLow: 50
    };
    return weights[priority];
  }
}

// Real-world impact:
// Page with 100 resources, 10 Mbps bandwidth, HTTP/2

// Without prioritization:
// - All 100 resources fetch simultaneously
// - Each gets 0.1 Mbps (10 Mbps / 100)
// - Critical CSS (50KB): 4 seconds @ 0.1 Mbps
// - Result: 4-second delay before rendering

// With prioritization:
// - VeryHigh resources (5): 4 Mbps each = 0.8 Mbps each
// - Critical CSS (50KB): 0.5 seconds @ 0.8 Mbps
// - Result: 0.5-second delay, 8× faster!
```

### Browser Heuristics and Learning

**Chrome's adaptive prioritization:**

```javascript
// Chrome learns from user behavior and adjusts priorities

class AdaptivePrioritization {
  constructor() {
    this.history = {
      // Track which resources were actually critical
      criticalResources: new Map(),
      // Track user interactions
      interactions: [],
      // Track performance metrics
      metrics: new Map()
    };
  }
  
  recordResourceUsage(resource, timing) {
    // Was this resource actually needed for First Paint?
    const criticalForFP = timing.responseEnd < timing.firstPaint;
    
    // Was it needed for Time to Interactive?
    const criticalForTTI = timing.responseEnd < timing.timeToInteractive;
    
    // Record for future prioritization
    this.history.criticalResources.set(resource.url, {
      criticalForFP,
      criticalForTTI,
      actualLoadTime: timing.responseEnd - timing.fetchStart,
      usedInViewport: this.wasInViewport(resource)
    });
  }
  
  adjustFuturePriority(resource) {
    // Look up historical data
    const history = this.history.criticalResources.get(resource.url);
    
    if (!history) {
      // No history, use default heuristics
      return this.getDefaultPriority(resource);
    }
    
    // Adjust based on historical importance
    let priority = this.getDefaultPriority(resource);
    
    if (history.criticalForFP) {
      // Was critical for First Paint, boost priority
      priority = this.boost(priority, 2);
    } else if (history.criticalForTTI) {
      // Was critical for TTI, moderate boost
      priority = this.boost(priority, 1);
    } else if (!history.usedInViewport) {
      // Wasn't even in viewport, reduce priority
      priority = this.reduce(priority, 1);
    }
    
    return priority;
  }
  
  // Machine learning model (simplified)
  predictCriticality(resource) {
    const features = {
      resourceType: this.encodeType(resource.type),
      fileSize: resource.size,
      domainReputation: this.getDomainScore(resource.domain),
      historicalCriticality: this.getHistoricalScore(resource.url),
      documentPosition: resource.position,
      referrerPriority: resource.referrer?.priority || 0
    };
    
    // Simple scoring model (real Chrome uses neural network)
    const score = 
      features.resourceType * 0.3 +
      (1 / features.fileSize) * 0.2 +
      features.domainReputation * 0.1 +
      features.historicalCriticality * 0.3 +
      (1 / features.documentPosition) * 0.1;
    
    // Convert score to priority level
    if (score > 0.8) return 'veryHigh';
    if (score > 0.6) return 'high';
    if (score > 0.4) return 'medium';
    if (score > 0.2) return 'low';
    return 'veryLow';
  }
}

// Real-world example:
// Page loads /hero-image.jpg

// First visit:
// - No history
// - Default priority: High (image, in viewport)
// - Load time: 800ms

// Chrome observes:
// - Image loaded before First Paint (1200ms)
// - Image visible in viewport
// - User stayed on page (didn't bounce)
// Conclusion: Critical resource!

// Second visit (same page):
// - History available
// - Adjusted priority: VeryHigh (boosted from High)
// - Gets more bandwidth: 3 Mbps instead of 1 Mbps
// - Load time: 300ms (2.7× faster!)
// - First Paint: 500ms instead of 1200ms (58% faster!)

// Result: Browser learns and optimizes over time
```

### Priority in Different Scenarios

**Scenario 1: Initial page load**

```
Timeline with proper prioritization:
t=0ms:    Request HTML (VeryHigh)
t=50ms:   HTML starts arriving, parser discovers:
          - <link rel="stylesheet" href="critical.css"> (VeryHigh)
          - <link rel="preload" href="font.woff2" as="font"> (VeryHigh)
          - <script src="app.js"></script> (High)

t=50ms:   Browser immediately requests:
          Priority queue:
          1. CSS (VeryHigh) - starts download
          2. Font (VeryHigh) - starts download
          3. JS (High) - starts download

t=200ms:  CSS complete (50KB @ fast priority)
t=250ms:  Font complete (30KB @ fast priority)
t=600ms:  JS complete (200KB @ high priority)

t=600ms:  Parser continues, discovers:
          - <img src="hero.jpg"> (High, in viewport)
          - <img src="product1.jpg" loading="lazy"> (Low, lazy)
          - <img src="ad.jpg"> (Medium, below fold)

t=600ms:  Browser requests:
          Priority queue:
          1. Hero image (High) - starts immediately
          2. Ad image (Medium) - queued
          3. Product image (Low) - queued, will defer until viewport

t=2000ms: Hero image complete (500KB @ high priority)
t=2000ms: Page fully rendered and interactive!

t=2500ms: Ad image starts (background, doesn't block)
t=4000ms: Ad complete

User scrolls, product1.jpg enters viewport:
t=5000ms: Browser upgrades product1.jpg: Low → High
t=5000ms: Product1.jpg starts immediately (reprioritized!)
t=6000ms: Product1 complete

Result: Critical resources (CSS, JS, hero) loaded in 2s
Non-critical resources loaded in background
User experience: Fast, responsive
```

**Scenario 2: SPA navigation (soft navigation)**

```
User clicks link in SPA:

t=0ms:    Route change detected
          Fetch new data and components

Priority during SPA navigation:
1. API data (VeryHigh) - user waiting for content
   fetch('/api/page-data', { priority: 'high' })

2. Critical component JS (High) - needed to render
   import('./PageComponent.js') // High priority

3. Images for new view (Medium) - nice to have
   <img src="new-view.jpg" fetchpriority="auto">

4. Prefetch next likely route (VeryLow) - future
   <link rel="prefetch" href="/likely-next-route">

t=150ms:  API data arrives (small, high priority)
t=200ms:  Component code arrives (moderate size, high priority)
t=200ms:  Page renders with data!
t=800ms:  Images arrive (larger, medium priority)
t=800ms:  Page fully loaded

Background prefetch:
t=2000ms: Network idle detected
t=2000ms: Start prefetching next route (veryLow priority)
t=4000ms: Next route prefetched and cached

User clicks next link:
t=5000ms: Route already cached!
t=5000ms: Instant navigation (0ms load)

Result: Soft navigation feels instant
Background prefetch prepares future navigations
```

**Scenario 3: Infinite scroll**

```
User scrolls down feed:

Initial load:
- First 10 posts: High priority (in viewport)
- Next 10 posts: Medium priority (near viewport)
- Posts 21-30: Low priority (pre-fetch)
- Posts 31+: Not fetched yet

Scroll event:
User scrolls to post 8:

t=0ms:    Scroll detected, posts 11-20 now near viewport
          Reprioritize:
          - Posts 11-20: Medium → High (entering viewport)
          - Posts 21-30: Low → Medium (getting closer)
          - Posts 31-40: Not fetched → Low (start prefetch)

Adaptive loading:
t=0ms:    Measure scroll velocity
          Fast scroll: Load fewer posts (user skimming)
          Slow scroll: Load more posts (user reading)

if (scrollVelocity > FAST_THRESHOLD) {
  // Load every 5th post initially
  loadPosts([15, 20, 25, 30], { priority: 'medium' });
} else {
  // Load all upcoming posts
  loadPosts([11, 12, 13, ..., 30], { priority: 'high' });
}

Network-aware prioritization:
const connection = navigator.connection;

if (connection.effectiveType === '4g') {
  // Good network: Aggressive prefetch
  PREFETCH_COUNT = 20;
  PREFETCH_PRIORITY = 'medium';
} else if (connection.effectiveType === '3g') {
  // Slower network: Conservative prefetch
  PREFETCH_COUNT = 10;
  PREFETCH_PRIORITY = 'low';
} else {
  // Very slow network: Minimal prefetch
  PREFETCH_COUNT = 5;
  PREFETCH_PRIORITY = 'veryLow';
}

Result: 
- Viewport content always loads fast (high priority)
- Prefetch adapts to network and scroll behavior
- No wasted bandwidth on content user won't see
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: Resource Priority Analyzer

```javascript
// priorityAnalyzer.js - Analyze current page resource priorities

class ResourcePriorityAnalyzer {
  constructor() {
    this.resources = [];
    this.init();
  }
  
  init() {
    // Collect all resources after page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.analyzeResources();
        this.generateReport();
        this.generateRecommendations();
      }, 1000);
    });
  }
  
  analyzeResources() {
    const entries = performance.getEntriesByType('resource');
    
    this.resources = entries.map(entry => {
      const priority = this.detectPriority(entry);
      const timing = this.extractTiming(entry);
      const criticality = this.assessCriticality(entry, timing);
      
      return {
        url: entry.name,
        type: entry.initiatorType,
        size: entry.transferSize || entry.encodedBodySize || 0,
        duration: entry.duration,
        timing,
        priority,
        criticality,
        protocol: entry.nextHopProtocol || 'unknown'
      };
    });
  }
  
  detectPriority(entry) {
    // Attempt to detect priority from resource characteristics
    // Note: PerformanceResourceTiming API doesn't directly expose priority
    // We infer from patterns
    
    const url = entry.name;
    const type = entry.initiatorType;
    const size = entry.transferSize || entry.encodedBodySize || 0;
    const startTime = entry.startTime;
    
    // CSS in head
    if (type === 'link' && url.endsWith('.css') && startTime < 100) {
      return 'VeryHigh';
    }
    
    // Preloaded resources (check for early start time + specific types)
    if (startTime < 50 && (
      url.match(/\.woff2?$/) || // Fonts
      url.match(/\.(css|js)$/)   // Critical CSS/JS
    )) {
      return 'VeryHigh';
    }
    
    // Blocking scripts in head
    if (type === 'script' && startTime < 200 && size > 0) {
      return 'High';
    }
    
    // Early images (likely in viewport)
    if (type === 'img' && startTime < 500) {
      return 'High';
    }
    
    // Late images (likely lazy or below fold)
    if (type === 'img' && startTime > 2000) {
      return 'Low';
    }
    
    // Async scripts (usually lower priority)
    if (type === 'script' && startTime > 1000) {
      return 'Low';
    }
    
    // XHR/Fetch (variable, assume medium)
    if (type === 'xmlhttprequest' || type === 'fetch') {
      return 'Medium';
    }
    
    // Default
    return 'Medium';
  }
  
  extractTiming(entry) {
    return {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      tls: entry.secureConnectionStart > 0 
        ? entry.connectEnd - entry.secureConnectionStart 
        : 0,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
      total: entry.duration
    };
  }
  
  assessCriticality(entry, timing) {
    // Determine if resource was actually critical for page load
    const paint = performance.getEntriesByType('paint');
    const firstPaint = paint.find(p => p.name === 'first-paint');
    const firstContentfulPaint = paint.find(p => p.name === 'first-contentful-paint');
    
    const fpTime = firstPaint ? firstPaint.startTime : Infinity;
    const fcpTime = firstContentfulPaint ? firstContentfulPaint.startTime : Infinity;
    
    const resourceComplete = entry.responseEnd;
    
    // Critical if loaded before First Paint
    if (resourceComplete < fpTime) {
      return 'Critical-FP';
    }
    
    // Important if loaded before FCP
    if (resourceComplete < fcpTime) {
      return 'Critical-FCP';
    }
    
    // Late if loaded significantly after FCP
    if (resourceComplete > fcpTime + 2000) {
      return 'Non-Critical';
    }
    
    return 'Moderate';
  }
  
  generateReport() {
    console.log('\n═══════════════════════════════════════');
    console.log('   RESOURCE PRIORITY ANALYSIS');
    console.log('═══════════════════════════════════════\n');
    
    // Group by priority
    const byPriority = {
      VeryHigh: [],
      High: [],
      Medium: [],
      Low: [],
      VeryLow: []
    };
    
    this.resources.forEach(resource => {
      byPriority[resource.priority].push(resource);
    });
    
    // Report each priority level
    Object.entries(byPriority).forEach(([priority, resources]) => {
      if (resources.length === 0) return;
      
      console.log(`\n${priority} Priority (${resources.length} resources):`);
      console.log('─'.repeat(50));
      
      resources
        .sort((a, b) => a.timing.total - b.timing.total)
        .slice(0, 5) // Top 5 per priority
        .forEach(resource => {
          const url = resource.url.substring(resource.url.lastIndexOf('/') + 1);
          const size = (resource.size / 1024).toFixed(1);
          const time = Math.round(resource.duration);
          
          console.log(`  ${url.substring(0, 40).padEnd(40)} ${size.toString().padStart(8)}KB ${time.toString().padStart(6)}ms`);
          console.log(`    Type: ${resource.type}, Criticality: ${resource.criticality}`);
        });
      
      if (resources.length > 5) {
        console.log(`  ... and ${resources.length - 5} more resources`);
      }
    });
  }
  
  generateRecommendations() {
    console.log('\n\n💡 PRIORITY OPTIMIZATION RECOMMENDATIONS:\n');
    
    const recommendations = [];
    
    // Issue 1: Critical resources with low priority
    const criticalButLowPriority = this.resources.filter(r => 
      (r.criticality === 'Critical-FP' || r.criticality === 'Critical-FCP') &&
      (r.priority === 'Low' || r.priority === 'Medium')
    );
    
    if (criticalButLowPriority.length > 0) {
      recommendations.push({
        severity: 'HIGH',
        issue: `${criticalButLowPriority.length} critical resources with low/medium priority`,
        impact: 'Critical resources delayed, slowing First Paint/FCP',
        resources: criticalButLowPriority.map(r => r.url.split('/').pop()),
        solution: [
          'Add preload hints: <link rel="preload" href="..." as="...">',
          'Use fetchpriority="high" attribute',
          'Move resources to <head> if applicable',
          'Inline critical CSS/JS if small enough'
        ]
      });
    }
    
    // Issue 2: Non-critical resources with high priority
    const nonCriticalButHighPriority = this.resources.filter(r =>
      r.criticality === 'Non-Critical' &&
      (r.priority === 'VeryHigh' || r.priority === 'High')
    );
    
    if (nonCriticalButHighPriority.length > 0) {
      recommendations.push({
        severity: 'MEDIUM',
        issue: `${nonCriticalButHighPriority.length} non-critical resources with high priority`,
        impact: 'Bandwidth wasted on non-critical resources, slowing critical ones',
        resources: nonCriticalButHighPriority.map(r => r.url.split('/').pop()),
        solution: [
          'Add loading="lazy" for below-fold images',
          'Use async/defer for non-critical scripts',
          'Use fetchpriority="low" to reduce priority',
          'Consider prefetch instead of preload'
        ]
      });
    }
    
    // Issue 3: Large resources competing with small critical ones
    const largeEarly = this.resources.filter(r =>
      r.size > 500000 && // >500KB
      r.timing.total < 2000 && // Loaded early
      r.criticality !== 'Critical-FP'
    );
    
    if (largeEarly.length > 0) {
      const totalSize = largeEarly.reduce((sum, r) => sum + r.size, 0);
      recommendations.push({
        severity: 'MEDIUM',
        issue: `${largeEarly.length} large non-critical resources loaded early`,
        impact: `${(totalSize / 1024 / 1024).toFixed(1)}MB competing for bandwidth with critical resources`,
        resources: largeEarly.map(r => r.url.split('/').pop()),
        solution: [
          'Defer large resources: loading="lazy"',
          'Load large resources after window.onload',
          'Use fetchpriority="low" for large non-critical assets',
          'Consider splitting large resources'
        ]
      });
    }
    
    // Issue 4: Missing preload for critical fonts
    const fonts = this.resources.filter(r => r.url.match(/\.(woff2?|ttf|otf)$/));
    const criticalFonts = fonts.filter(f => f.criticality === 'Critical-FCP');
    const preloadedFonts = fonts.filter(f => f.priority === 'VeryHigh');
    
    if (criticalFonts.length > 0 && preloadedFonts.length === 0) {
      recommendations.push({
        severity: 'HIGH',
        issue: 'Critical fonts not preloaded',
        impact: 'Font loading delayed, causing FOIT/FOUT',
        resources: criticalFonts.map(r => r.url.split('/').pop()),
        solution: [
          'Add font preload: <link rel="preload" href="font.woff2" as="font" crossorigin>',
          'Use font-display: swap or optional',
          'Consider system font stack as fallback'
        ]
      });
    }
    
    // Issue 5: Too many high-priority resources
    const highPriorityCount = 
      (byPriority['VeryHigh']?.length || 0) +
      (byPriority['High']?.length || 0);
    
    if (highPriorityCount > 15) {
      recommendations.push({
        severity: 'MEDIUM',
        issue: `Too many high-priority resources (${highPriorityCount})`,
        impact: 'High-priority resources compete with each other, slowing all of them',
        solution: [
          'Review which resources are truly critical',
          'Reduce preload hints (only most critical)',
          'Defer non-essential resources',
          'Consider bundling small critical resources'
        ]
      });
    }
    
    // Print recommendations
    if (recommendations.length === 0) {
      console.log('✅ No priority optimization issues detected!\n');
      console.log('Resource prioritization is optimal.\n');
      return;
    }
    
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.severity}] ${rec.issue}`);
      console.log(`   Impact: ${rec.impact}`);
      
      if (rec.resources && rec.resources.length > 0) {
        console.log(`   Affected resources (${rec.resources.length}):`);
        rec.resources.slice(0, 3).forEach(res => {
          console.log(`     • ${res}`);
        });
        if (rec.resources.length > 3) {
          console.log(`     • ... and ${rec.resources.length - 3} more`);
        }
      }
      
      console.log('   Solution:');
      rec.solution.forEach(sol => {
        console.log(`     • ${sol}`);
      });
      console.log('');
    });
    
    // Calculate potential improvement
    const totalIssues = recommendations.filter(r => r.severity === 'HIGH').length;
    if (totalIssues > 0) {
      console.log(`\n⚡ Estimated improvement: 15-30% faster page load by fixing high-severity issues\n`);
    }
  }
  
  // Helper method to calculate overall priority score
  calculatePriorityScore() {
    const weights = {
      VeryHigh: 5,
      High: 4,
      Medium: 3,
      Low: 2,
      VeryLow: 1
    };
    
    let totalScore = 0;
    let maxScore = 0;
    
    this.resources.forEach(resource => {
      const priority = weights[resource.priority];
      const optimalPriority = this.getOptimalPriority(resource);
      
      totalScore += priority === optimalPriority ? priority : 0;
      maxScore += optimalPriority;
    });
    
    return (totalScore / maxScore * 100).toFixed(1);
  }
  
  getOptimalPriority(resource) {
    const weights = {
      'Critical-FP': 5,
      'Critical-FCP': 4,
      'Moderate': 3,
      'Non-Critical': 2
    };
    
    return weights[resource.criticality] || 3;
  }
}

// Usage
const analyzer = new ResourcePriorityAnalyzer();

// The analyzer will automatically run after page load and generate a report
```

### Example 2: Dynamic Priority Optimizer

```javascript
// dynamicPriorityOptimizer.js - Dynamically adjust resource priorities

class DynamicPriorityOptimizer {
  constructor(options = {}) {
    this.options = {
      enableAdaptive: options.enableAdaptive !== false,
      enableNetworkAware: options.enableNetworkAware !== false,
      enableViewportAware: options.enableViewportAware !== false,
      enableScrollAware: options.enableScrollAware !== false
    };
    
    this.resourceQueue = [];
    this.viewportResources = new Set();
    this.scrollVelocity = 0;
    
    this.init();
  }
  
  init() {
    if (this.options.enableViewportAware) {
      this.setupIntersectionObserver();
    }
    
    if (this.options.enableScrollAware) {
      this.setupScrollTracking();
    }
    
    if (this.options.enableNetworkAware) {
      this.setupNetworkMonitoring();
    }
    
    console.log('🚀 Dynamic Priority Optimizer initialized');
  }
  
  // Viewport-aware priority adjustment
  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const element = entry.target;
        
        if (entry.isIntersecting) {
          // Element entering viewport, boost priority
          this.boostPriority(element);
          this.viewportResources.add(element);
        } else {
          // Element leaving viewport, reduce priority
          this.reducePriority(element);
          this.viewportResources.delete(element);
        }
      });
    }, {
      rootMargin: '50px' // Start loading slightly before viewport
    });
    
    // Observe all images
    document.querySelectorAll('img[data-src]').forEach(img => {
      observer.observe(img);
    });
    
    this.observer = observer;
  }
  
  boostPriority(element) {
    if (element.tagName === 'IMG' && element.dataset.src) {
      console.log(`📈 Boosting priority: ${element.dataset.src}`);
      
      // Fetch with high priority
      this.fetchResource(element.dataset.src, {
        priority: 'high',
        element: element
      });
    }
  }
  
  reducePriority(element) {
    // If resource not yet loaded, cancel or deprioritize
    console.log(`📉 Reducing priority: ${element.dataset.src || element.src}`);
  }
  
  // Scroll-aware prioritization
  setupScrollTracking() {
    let lastScrollY = window.scrollY;
    let lastTimestamp = Date.now();
    
    window.addEventListener('scroll', () => {
      const now = Date.now();
      const currentScrollY = window.scrollY;
      
      // Calculate scroll velocity (pixels per second)
      const deltaY = Math.abs(currentScrollY - lastScrollY);
      const deltaTime = (now - lastTimestamp) / 1000;
      this.scrollVelocity = deltaY / deltaTime;
      
      lastScrollY = currentScrollY;
      lastTimestamp = now;
      
      // Adjust prefetch strategy based on scroll speed
      this.adjustPrefetchStrategy();
    }, { passive: true });
  }
  
  adjustPrefetchStrategy() {
    if (this.scrollVelocity > 1000) {
      // Fast scrolling: Minimal prefetch, user is skimming
      console.log('🏃 Fast scroll detected, reducing prefetch');
      this.prefetchDistance = 100; // Only 100px ahead
      this.prefetchPriority = 'low';
    } else if (this.scrollVelocity > 300) {
      // Medium scrolling: Moderate prefetch
      this.prefetchDistance = 500; // 500px ahead
      this.prefetchPriority = 'medium';
    } else {
      // Slow scrolling or stopped: Aggressive prefetch
      console.log('🐢 Slow/stopped scroll, increasing prefetch');
      this.prefetchDistance = 2000; // 2000px ahead
      this.prefetchPriority = 'high';
    }
  }
  
  // Network-aware prioritization
  setupNetworkMonitoring() {
    if (!navigator.connection) {
      console.warn('Network Information API not supported');
      return;
    }
    
    const connection = navigator.connection;
    
    const adjustForNetwork = () => {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink; // Mbps
      const rtt = connection.rtt; // ms
      
      console.log(`📶 Network: ${effectiveType}, ${downlink}Mbps, ${rtt}ms RTT`);
      
      if (effectiveType === '4g' || downlink > 10) {
        // Fast network: Aggressive loading
        this.networkStrategy = {
          prefetchEnabled: true,
          prefetchCount: 20,
          imageQuality: 'high',
          videoAutoplay: true
        };
      } else if (effectiveType === '3g' || downlink > 1.5) {
        // Medium network: Balanced loading
        this.networkStrategy = {
          prefetchEnabled: true,
          prefetchCount: 10,
          imageQuality: 'medium',
          videoAutoplay: false
        };
      } else {
        // Slow network: Conservative loading
        console.warn('⚠️ Slow network detected, reducing quality');
        this.networkStrategy = {
          prefetchEnabled: false,
          prefetchCount: 5,
          imageQuality: 'low',
          videoAutoplay: false
        };
      }
      
      this.applyNetworkStrategy();
    };
    
    // Initial check
    adjustForNetwork();
    
    // Monitor for changes
    connection.addEventListener('change', adjustForNetwork);
  }
  
  applyNetworkStrategy() {
    const strategy = this.networkStrategy;
    
    if (!strategy) return;
    
    // Adjust image quality
    document.querySelectorAll('img[data-src-high][data-src-low]').forEach(img => {
      if (strategy.imageQuality === 'low') {
        img.dataset.src = img.dataset.srcLow;
      } else {
        img.dataset.src = img.dataset.srcHigh;
      }
    });
    
    // Adjust video autoplay
    document.querySelectorAll('video[autoplay]').forEach(video => {
      if (!strategy.videoAutoplay) {
        video.removeAttribute('autoplay');
        video.setAttribute('preload', 'metadata');
      }
    });
    
    // Adjust prefetch count
    if (strategy.prefetchEnabled) {
      this.prefetchNextResources(strategy.prefetchCount);
    }
  }
  
  // Fetch resource with specified priority
  fetchResource(url, options = {}) {
    const { priority = 'auto', element = null } = options;
    
    console.log(`🔄 Fetching ${url} with priority: ${priority}`);
    
    // Use fetch with priority hint (if supported)
    return fetch(url, { priority })
      .then(response => response.blob())
      .then(blob => {
        if (element && element.tagName === 'IMG') {
          const objectURL = URL.createObjectURL(blob);
          element.src = objectURL;
          element.removeAttribute('data-src');
          console.log(`✅ Loaded ${url}`);
        }
        return blob;
      })
      .catch(error => {
        console.error(`❌ Failed to load ${url}:`, error);
      });
  }
  
  // Prefetch upcoming resources
  prefetchNextResources(count) {
    // Find resources below viewport that might be needed soon
    const viewportBottom = window.scrollY + window.innerHeight;
    const prefetchThreshold = viewportBottom + (this.prefetchDistance || 500);
    
    const upcomingImages = Array.from(document.querySelectorAll('img[data-src]'))
      .filter(img => {
        const rect = img.getBoundingClientRect();
        const absoluteTop = window.scrollY + rect.top;
        return absoluteTop < prefetchThreshold && !img.src;
      })
      .slice(0, count);
    
    upcomingImages.forEach((img, index) => {
      // Stagger prefetch slightly
      setTimeout(() => {
        this.fetchResource(img.dataset.src, {
          priority: this.prefetchPriority || 'low',
          element: img
        });
      }, index * 100);
    });
  }
  
  // Manual priority control
  setPriority(url, priority) {
    console.log(`🎯 Setting priority for ${url}: ${priority}`);
    
    // If resource already loading, this would require native support
    // With fetch(), we can only set priority at fetch time
    // For demonstration, we'd queue the resource with new priority
    
    this.resourceQueue.push({ url, priority });
  }
  
  // Measure and report effectiveness
  generateEffectivenessReport() {
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(p => p.name === 'first-contentful-paint');
    
    const resources = performance.getEntriesByType('resource');
    const criticalResources = resources.filter(r => 
      r.responseEnd < (fcp ? fcp.startTime : Infinity)
    );
    
    console.log('\n═══════════════════════════════════════');
    console.log('   PRIORITY OPTIMIZATION EFFECTIVENESS');
    console.log('═══════════════════════════════════════\n');
    
    console.log(`⏱️  First Contentful Paint: ${fcp ? Math.round(fcp.startTime) : 'N/A'}ms`);
    console.log(`📦 Resources before FCP: ${criticalResources.length}`);
    console.log(`📦 Total resources: ${resources.length}`);
    console.log(`📈 In viewport: ${this.viewportResources.size}`);
    console.log(`🌐 Network strategy: ${JSON.stringify(this.networkStrategy, null, 2)}`);
    
    const avgCriticalTime = criticalResources.length > 0
      ? criticalResources.reduce((sum, r) => sum + r.duration, 0) / criticalResources.length
      : 0;
    
    console.log(`\n⚡ Avg critical resource load: ${Math.round(avgCriticalTime)}ms`);
    console.log(`📊 Priority effectiveness score: ${this.calculateEffectiveness()}%\n`);
  }
  
  calculateEffectiveness() {
    // Simple heuristic: lower is better
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(p => p.name === 'first-contentful-paint');
    
    if (!fcp) return 0;
    
    const resources = performance.getEntriesByType('resource');
    const beforeFCP = resources.filter(r => r.responseEnd < fcp.startTime).length;
    const total = resources.length;
    
    // Ideal: few resources before FCP (critical only)
    // If 10-20% of resources loaded before FCP, that's good
    const ratio = beforeFCP / total;
    
    if (ratio < 0.1) return 95; // Excellent
    if (ratio < 0.2) return 85; // Good
    if (ratio < 0.3) return 70; // Moderate
    return 50; // Needs improvement
  }
}

// Usage
const optimizer = new DynamicPriorityOptimizer({
  enableAdaptive: true,
  enableNetworkAware: true,
  enableViewportAware: true,
  enableScrollAware: true
});

// Generate effectiveness report after page load
window.addEventListener('load', () => {
  setTimeout(() => {
    optimizer.generateEffectivenessReport();
  }, 3000);
});
```

### Example 3: Fetch Priority Polyfill and Helper

```javascript
// fetchPriorityHelper.js - Helper for managing resource priorities

class FetchPriorityHelper {
  constructor() {
    this.supportsNative = this.checkNativeSupport();
    this.priorityQueue = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    this.activeRequests = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    this.maxConcurrent = {
      critical: 6,  // Max concurrent critical requests
      high: 4,
      medium: 2,
      low: 1
    };
    
    console.log(`🎯 FetchPriority support: ${this.supportsNative ? 'Native' : 'Polyfill'}`);
  }
  
  checkNativeSupport() {
    // Check if browser supports fetchpriority attribute
    const link = document.createElement('link');
    return 'fetchPriority' in link || 'fetchpriority' in link;
  }
  
  // Enhanced fetch with priority queue
  fetch(url, options = {}) {
    const priority = options.priority || 'medium';
    
    if (this.supportsNative) {
      // Use native fetch priority
      return fetch(url, options);
    } else {
      // Use polyfill with queue
      return this.queuedFetch(url, options, priority);
    }
  }
  
  queuedFetch(url, options, priority) {
    return new Promise((resolve, reject) => {
      const request = {
        url,
        options,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      // Add to appropriate queue
      this.priorityQueue[priority].push(request);
      
      // Process queue
      this.processQueue();
    });
  }
  
  processQueue() {
    // Process queues in priority order
    const priorities = ['critical', 'high', 'medium', 'low'];
    
    for (const priority of priorities) {
      const queue = this.priorityQueue[priority];
      const maxConcurrent = this.maxConcurrent[priority];
      const active = this.activeRequests[priority];
      
      while (queue.length > 0 && active < maxConcurrent) {
        const request = queue.shift();
        this.executeRequest(request);
      }
    }
  }
  
  executeRequest(request) {
    const { url, options, priority, resolve, reject } = request;
    
    this.activeRequests[priority]++;
    
    console.log(`🚀 [${priority}] Fetching: ${url}`);
    
    fetch(url, options)
      .then(response => {
        this.activeRequests[priority]--;
        this.processQueue(); // Process next in queue
        resolve(response);
      })
      .catch(error => {
        this.activeRequests[priority]--;
        this.processQueue();
        reject(error);
      });
  }
  
  // Helper: Load image with priority
  loadImage(src, priority = 'medium') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      if (this.supportsNative && priority !== 'medium') {
        // Set fetchpriority attribute
        img.setAttribute('fetchpriority', priority);
      }
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      
      if (!this.supportsNative && priority !== 'medium') {
        // Use polyfill fetch
        this.fetch(src, { priority })
          .then(response => response.blob())
          .then(blob => {
            img.src = URL.createObjectURL(blob);
          })
          .catch(reject);
      } else {
        img.src = src;
      }
    });
  }
  
  // Helper: Load script with priority
  loadScript(src, priority = 'medium') {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      
      if (this.supportsNative && priority !== 'medium') {
        script.setAttribute('fetchpriority', priority);
      }
      
      if (priority === 'low') {
        script.defer = true;
      }
      
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      
      document.head.appendChild(script);
    });
  }
  
  // Helper: Load CSS with priority
  loadCSS(href, priority = 'high') {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      
      if (this.supportsNative && priority !== 'medium') {
        link.setAttribute('fetchpriority', priority);
      }
      
      link.onload = () => resolve(link);
      link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
      
      document.head.appendChild(link);
    });
  }
  
  // Helper: Preload resource with priority
  preload(href, as, priority = 'high') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (this.supportsNative) {
      link.setAttribute('fetchpriority', priority);
    }
    
    if (as === 'font') {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
    
    console.log(`⚡ Preloading [${priority}]: ${href}`);
  }
  
  // Helper: Prefetch for next navigation (very low priority)
  prefetch(href) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    
    document.head.appendChild(link);
    
    console.log(`🔮 Prefetching (low priority): ${href}`);
  }
  
  // Batch load images with priorities
  loadImages(images) {
    // images: [{ src, priority, alt }, ...]
    
    return Promise.all(
      images.map(({ src, priority }) => 
        this.loadImage(src, priority)
          .catch(error => {
            console.error(`Failed to load ${src}:`, error);
            return null;
          })
      )
    );
  }
  
  // Get queue statistics
  getStats() {
    const stats = {
      queued: {},
      active: {},
      total: 0
    };
    
    Object.keys(this.priorityQueue).forEach(priority => {
      stats.queued[priority] = this.priorityQueue[priority].length;
      stats.active[priority] = this.activeRequests[priority];
      stats.total += stats.queued[priority] + stats.active[priority];
    });
    
    return stats;
  }
  
  // Report current state
  report() {
    const stats = this.getStats();
    
    console.log('\n📊 Fetch Priority Queue Status:');
    console.log(`   Critical: ${stats.active.critical} active, ${stats.queued.critical} queued`);
    console.log(`   High:     ${stats.active.high} active, ${stats.queued.high} queued`);
    console.log(`   Medium:   ${stats.active.medium} active, ${stats.queued.medium} queued`);
    console.log(`   Low:      ${stats.active.low} active, ${stats.queued.low} queued`);
    console.log(`   Total:    ${stats.total} requests\n`);
  }
}

// Create global helper
const priorityHelper = new FetchPriorityHelper();

// Example usage
async function loadPageAssets() {
  console.log('Loading page assets with priority...\n');
  
  // Critical: CSS and fonts (blocking render)
  priorityHelper.preload('/critical.css', 'style', 'high');
  priorityHelper.preload('/font.woff2', 'font', 'high');
  
  // High priority: Hero image
  await priorityHelper.loadImage('/hero.jpg', 'high');
  console.log('✅ Hero image loaded');
  
  // Medium priority: App JavaScript
  await priorityHelper.loadScript('/app.js', 'medium');
  console.log('✅ App script loaded');
  
  // Low priority: Analytics and non-critical images
  priorityHelper.loadScript('/analytics.js', 'low');
  
  const productImages = [
    { src: '/product1.jpg', priority: 'medium' },
    { src: '/product2.jpg', priority: 'medium' },
    { src: '/product3.jpg', priority: 'low' }
  ];
  
  await priorityHelper.loadImages(productImages);
  console.log('✅ Product images loaded');
  
  // Prefetch next page
  priorityHelper.prefetch('/next-page.html');
  
  // Report final state
  priorityHelper.report();
}

// Run on page load
// loadPageAssets();
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "Explain browser resource prioritization and how you'd optimize it for a high-traffic website."**

**Strong Answer:**

"Browser resource prioritization is the system browsers use to determine fetch order when hundreds of resources compete for limited network bandwidth. This is absolutely critical for performance because **fetching resources in the wrong order can delay critical assets by 5-10 seconds**, making the difference between a 2-second load and a 12-second one.

**The core problem:** Modern web pages load 80-200 resources, but networks have finite bandwidth—typically 1-50 Mbps for users—and HTTP/1.1 has only 6 concurrent connections per domain. Browsers must decide which resources fetch first.

**Priority levels:** Browsers assign each resource one of five priority levels—VeryHigh, High, Medium, Low, VeryLow—based on resource type, document position, and preload hints. For example:

```
VeryHigh (fetch first):
- Main HTML document
- Render-blocking CSS in <head>
- Preloaded fonts/scripts
- fetchpriority='high' resources

High:
- Sync JavaScript in <head>
- Fonts discovered in CSS
- Images in viewport

Medium:
- Images below fold (not lazy)
- Async scripts
- XHR/fetch requests

Low:
- Lazy-loaded images
- Deferred scripts
- Non-critical resources

VeryLow:
- Prefetch resources (future navigation)
- Hidden resources
```

**Why this matters:** Without prioritization, a large non-critical 5MB image could fetch before critical 50KB CSS, blocking rendering for 20+ seconds on slower networks. With proper prioritization, critical CSS fetches first in 200ms, page renders, then non-critical images load in background.

**Default browser heuristics** are pretty good but not perfect. Browsers use rules like:

1. **Resource type:** CSS and fonts default to high priority, images to medium
2. **Document position:** Resources in `<head>` get higher priority than in `<body>`
3. **Viewport visibility:** Images in viewport get higher priority than below-fold
4. **Blocking behavior:** Parser-blocking scripts get high priority, async/defer get low
5. **Preload hints:** `<link rel='preload'>` boosts priority to VeryHigh

**But browsers can't know your application semantics.** They don't know that your hero image is more important than your logo, or that analytics scripts are less critical than your checkout flow JavaScript.

**Manual control via Fetch Priority API:**

```html
<!-- Boost critical resources -->
<img src='/hero.jpg' fetchpriority='high'>
<link rel='stylesheet' href='/critical.css' fetchpriority='high'>

<!-- Lower non-critical -->
<img src='/ad-banner.jpg' fetchpriority='low'>
<script src='/analytics.js' fetchpriority='low'></script>
```

**In JavaScript:**

```javascript
fetch('/critical-api', { priority: 'high' })
fetch('/optional-data', { priority: 'low' })
```

**HTTP/2 changes the game:** With HTTP/1.1, prioritization mainly affects which of your 6 connections fetch what. With HTTP/2, you have unlimited concurrent streams on one connection, but bandwidth is still limited. Here, prioritization affects **bandwidth allocation**—VeryHigh resources might get 40% of bandwidth, High gets 30%, etc.

HTTP/2 uses dependency trees and weights to signal priorities to the server. A VeryHigh CSS resource might have weight 256 (max), while a Low image has weight 50. Server allocates bandwidth proportionally: CSS gets 5× more bandwidth than the image.

**Real-world optimization for high-traffic site:**

At a previous company with 50M monthly users, we had a product listing page loading 120 resources. Initial page load was 8.2 seconds, Time to Interactive was 6.8 seconds—way too slow.

**Problem diagnosis:** Chrome DevTools Network panel showed:
- 15 large product images (500KB-2MB each) fetching with High priority
- Critical CSS and JavaScript delayed waiting for images
- Hero image (important for UX) loading late with default priority
- Analytics scripts (non-critical) loading with same priority as app logic

**Optimization strategy:**

1. **Preload critical resources:**
```html
<link rel='preload' href='/critical.css' as='style'>
<link rel='preload' href='/app.js' as='script'>
<link rel='preload' href='/hero.jpg' as='image'>
<link rel='preload' href='/font.woff2' as='font' crossorigin>
```

This boosted these resources to VeryHigh priority, ensuring they fetched first.

2. **Lazy load non-critical images:**
```html
<img src='/product1.jpg' loading='lazy' fetchpriority='low'>
```

Below-fold product images now loaded only when needed, with low priority.

3. **Defer non-critical scripts:**
```html
<script src='/analytics.js' defer fetchpriority='low'></script>
```

Analytics and other non-critical scripts moved to low priority.

4. **Inline critical CSS:**
For absolute critical styles (above-fold), we inlined ~8KB directly in `<head>` to avoid network request entirely.

5. **Adjust hero image priority:**
```html
<img src='/hero.jpg' fetchpriority='high'>
```

Explicitly boosted hero image to ensure it loads early for good perceived performance.

**Results:**

```
Before optimization:
- Page load: 8.2 seconds
- Time to Interactive: 6.8 seconds
- First Contentful Paint: 3.4 seconds
- Bounce rate: 34%
- Conversion rate: 2.8%

After optimization:
- Page load: 3.1 seconds (62% faster)
- Time to Interactive: 2.3 seconds (66% faster)
- First Contentful Paint: 1.1 seconds (68% faster)
- Bounce rate: 24% (-29% relative)
- Conversion rate: 3.6% (+29% relative)

Business impact:
- +0.8 percentage point conversion improvement
- At 2M monthly transactions
- 16,000 additional conversions/month
- At $45 average order value
- $720K additional monthly revenue = $8.6M annual impact
```

**The key insight:** Priority optimization is one of the highest-ROI performance optimizations because it costs nothing—you're just reordering existing work—but can deliver 50-70% improvements in critical rendering metrics.

**For high-traffic sites specifically:**

1. **Measure with RUM (Real User Monitoring):** Track which resources actually affect First Contentful Paint and Time to Interactive. Prioritize those aggressively.

2. **CDN integration:** Configure CDN to respect priority signals and allocate bandwidth accordingly. Some CDNs have priority-aware routing.

3. **A/B test priority changes:** Different priority strategies may work better for different user segments (mobile vs desktop, geo regions, etc.).

4. **Monitor regression:** Priority misconfiguration can significantly hurt performance. Set up alerts if critical resources start loading late.

5. **Edge cases matter at scale:** 1% of users on very slow networks can generate 10% of support tickets. Optimize priority especially for worst-case scenarios—2G/3G networks, high-latency regions.

The overarching principle: **Critical resources that block rendering or interaction must load first, everything else can wait.** Browsers do a decent job by default, but with manual hints (preload, fetchpriority) you can achieve 30-70% better performance, which at scale translates to millions in additional revenue."

### Likely Follow-Up Questions

1. **"How do you measure if your priority optimizations are working?"**

**Answer:**
```javascript
// Method 1: Performance Observer API
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === 'resource') {
      console.log(`${entry.name}: ${entry.duration}ms`);
    }
  });
});

observer.observe({ entryTypes: ['resource'] });

// Method 2: Waterfall analysis
const resources = performance.getEntriesByType('resource');

// Find critical resources
const criticalResources = resources.filter(r => {
  // CSS, fonts, critical JS
  return r.name.includes('.css') || 
         r.name.includes('.woff') ||
         r.name.includes('critical');
});

// Check if they loaded before FCP
const fcp = performance.getEntriesByType('paint')
  .find(p => p.name === 'first-contentful-paint');

criticalResources.forEach(resource => {
  if (resource.responseEnd < fcp.startTime) {
    console.log(`✅ ${resource.name} loaded before FCP`);
  } else {
    console.log(`❌ ${resource.name} loaded AFTER FCP - priority issue!`);
  }
});

// Method 3: Chrome DevTools
// Network panel → Priority column
// Look for:
// - Critical resources with High/VeryHigh priority ✅
// - Non-critical with Low/Medium priority ✅
// - Large images with High priority ❌ (red flag)
// - CSS with Medium/Low priority ❌ (red flag)

// Method 4: Lighthouse / WebPageTest
// Automated audits flag priority issues:
// - "Prioritize critical requests"
// - "Preload key requests"
// - "Reduce render-blocking resources"

// Method 5: Real User Monitoring
// Track correlation between resource priority and metrics:
{
  userId: '...',
  pageLoadTime: 3200,
  fcp: 1100,
  lcp: 2800,
  criticalResourcesBeforeFCP: 12, // Good: only critical loaded
  totalResourcesBeforeFCP: 15,    // vs 80 total
  priorityScore: 85  // Custom score based on ideal priorities
}

// Alert if priorityScore drops below threshold
if (priorityScore < 70) {
  alert('Priority optimization regression detected!');
}

// Expected outcome with good prioritization:
// - FCP within 1-2 seconds
// - <20% of resources loaded before FCP
// - Critical resources (CSS/JS/fonts) load first
// - Large images load after FCP
```

2. **"What's the difference between preload, prefetch, and preconnect?"**

**Answer:**
```html
<!-- 1. Preload: Fetch NOW, high priority -->
<link rel="preload" href="/critical.css" as="style">
<!-- Use case: Critical resource needed for current page
     Priority: VeryHigh
     Timing: Immediate fetch
     Example: Critical CSS, hero image, web fonts -->

<!-- 2. Prefetch: Fetch when IDLE, very low priority -->
<link rel="prefetch" href="/next-page.js">
<!-- Use case: Resource needed for FUTURE navigation
     Priority: VeryLow
     Timing: Only when browser idle (after page load)
     Example: Next page assets, likely user flows -->

<!-- 3. Preconnect: Establish CONNECTION early -->
<link rel="preconnect" href="https://cdn.example.com">
<!-- Use case: Warm up connection to third-party domain
     Action: DNS + TCP + TLS handshake
     Savings: 100-300ms per resource from that domain
     Example: CDN, API servers, analytics -->

<!-- 4. DNS-prefetch: Resolve DNS only -->
<link rel="dns-prefetch" href="//analytics.example.com">
<!-- Use case: Resolve DNS for domains you'll use later
     Action: DNS lookup only (not TCP/TLS)
     Savings: 20-120ms
     Example: Many third-party domains -->

Decision matrix:

| Need resource for...      | Use           | Priority  |
|---------------------------|---------------|-----------|
| Current page, critical    | preload       | VeryHigh  |
| Current page, non-critical| (normal load) | Auto      |
| Next navigation, likely   | prefetch      | VeryLow   |
| Connection to 3rd party   | preconnect    | N/A       |
| Just DNS for 3rd party    | dns-prefetch  | N/A       |

Common mistakes:

❌ Preloading too much: If you preload 20 resources, none are truly prioritized
❌ Prefetching current page: Use preload, not prefetch
❌ Preconnecting to unused domains: Wastes connection slots
✅ Preload 3-5 most critical resources only
✅ Prefetch resources for next likely navigation
✅ Preconnect to 1-2 highest-traffic third-party domains
```

3. **"How does priority differ between HTTP/1.1 and HTTP/2?"**

**Answer:**
```
HTTP/1.1:
- Limited to 6 concurrent connections per domain
- Priority determines which requests use which connections
- Example: 20 resources, 6 connections
  Connection 1: CSS (VeryHigh)
  Connection 2: JS (High)
  Connection 3: Font (High)
  Connection 4: Hero image (High)
  Connection 5: Image 2 (Medium)
  Connection 6: Image 3 (Medium)
  Waiting: 14 resources queued
  
- Once a connection frees up, next-highest-priority resource uses it
- Head-of-line blocking: Slow resource blocks entire connection
- Workaround: Domain sharding (4 domains = 24 connections)

HTTP/2:
- Unlimited concurrent streams on single connection
- Priority determines bandwidth allocation, not fetch order
- All resources can fetch simultaneously
- Example: 20 resources, 10 Mbps bandwidth
  VeryHigh resources (5): 40% bandwidth = 4 Mbps total = 0.8 Mbps each
  High resources (8): 30% bandwidth = 3 Mbps total = 0.375 Mbps each
  Medium resources (7): 30% bandwidth = 3 Mbps total = 0.43 Mbps each
  
- Uses PRIORITY frames with dependency tree:
  
          Root (connection)
               |
      ┌────────┼────────┐
      CSS     JS      Font
    (weight  (weight  (weight
     256)     220)     200)
      |
  ┬───┴───┬
  Image1  Image2
  (100)   (100)

- Parent dependencies ensure order (CSS before images)
- Weights determine relative bandwidth (256 vs 100 = 2.56× more)

Key differences:

HTTP/1.1:
- Binary choice: fetch now or wait
- Limited parallelism (6 connections)
- Priority = fetch order

HTTP/2:
- Graceful degradation: all fetch, but at different rates
- Unlimited parallelism (one connection)
- Priority = bandwidth allocation

Implications:

HTTP/1.1 optimization:
- Use domain sharding for more parallelism
- Avoid large files blocking connections
- Careful resource ordering in HTML

HTTP/2 optimization:
- Consolidate domains (domain sharding harmful!)
- Use server push for critical resources
- Leverage bandwidth allocation via priorities
- One connection = simpler, more efficient
```

4. **"Can you change resource priority dynamically after page load?"**

**Answer:**
```javascript
// Yes, but with limitations

// Method 1: Fetch API (for JavaScript-initiated requests)
// Can set priority when making request
fetch('/api/data', { priority: 'high' })
  .then(/* ... */);

// Method 2: Intersection Observer (viewport-aware)
// Boost priority when element enters viewport

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      
      // If image has data-src (lazy), load with high priority
      if (img.dataset.src) {
        fetch(img.dataset.src, { priority: 'high' })
          .then(response => response.blob())
          .then(blob => {
            img.src = URL.createObjectURL(blob);
          });
      }
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});

// Method 3: Network Information API
// Adjust strategy based on network conditions

navigator.connection.addEventListener('change', () => {
  const effectiveType = navigator.connection.effectiveType;
  
  if (effectiveType === '4g') {
    // Good network: Load more aggressively
    loadMoreImages(20, 'medium');
  } else if (effectiveType === '3g') {
    // Slower network: Conservative loading
    loadMoreImages(10, 'low');
  } else {
    // Very slow: Minimal loading
    loadMoreImages(5, 'low');
  }
});

// Method 4: HTTP/2 PRIORITY frames (reprioritization)
// Some browsers support dynamic reprioritization

// Example: User scrolls, lazy image enters viewport
// Browser can send new PRIORITY frame to server:
// Stream ID: 13
// New Weight: 200 (increased from 50)
// Server adjusts bandwidth allocation mid-transfer!

// Limitations:

// ❌ Can't change priority of already-loading resources (most browsers)
//    Once fetch started, priority locked

// ❌ Can't change priority of <img>, <script>, <link> declaratively
//    No JavaScript API to modify after insertion

// ✅ Can control priority of new fetch() requests

// ✅ Can decide whether/when to load lazy resources
//    (by controlling when you set img.src)

// ✅ Can cancel and restart with new priority
//    (using AbortController)

const controller = new AbortController();

// Start with low priority
fetch('/data', { 
  priority: 'low',
  signal: controller.signal 
});

// Later: User action makes this critical
controller.abort(); // Cancel low-priority request

// Restart with high priority
fetch('/data', { priority: 'high' })
  .then(/* ... */);

// Best practice:
// - Set correct initial priority (most important)
// - Use lazy loading + intersection observer for images
// - Fetch API with appropriate priority for dynamic requests
// - Prefetch likely-needed resources in background
// - Cancel/restart only if truly necessary (overhead)
```

5. **"How would you prioritize resources for a progressive web app?"**

**Answer:**
```javascript
// PWA priority strategy: App shell model

// Phase 1: Critical App Shell (VeryHigh priority)
// Minimal resources to show functional UI ASAP

<head>
  <!-- Inline critical CSS (no request!) -->
  <style>
    /* Minimal shell styles: layout, typography, colors */
    body { margin: 0; font-family: sans-serif; }
    .app-shell { /* ... */ }
  </style>
  
  <!-- Preload critical resources -->
  <link rel="preload" href="/app-shell.js" as="script">
  <link rel="preload" href="/manifest.json" as="fetch">
  <link rel="preload" href="/icon-192.png" as="image">
</head>

<body>
  <!-- Minimal HTML shell -->
  <div class="app-shell">
    <header><!-- Skeleton UI --></header>
    <main id="content">Loading...</main>
  </div>
  
  <!-- App shell script (critical) -->
  <script src="/app-shell.js"></script>
</body>

// app-shell.js priorities:
// 1. Register service worker (high priority)
// 2. Initialize router (high priority)
// 3. Render skeleton UI (high priority)
// 4. Load route-specific bundles (medium priority)
// 5. Load non-critical features (low priority)

// Phase 2: Route-Specific Resources (High priority)
// Load resources needed for current route

// Example: User on /products route
async function loadProductRoute() {
  // Critical for route
  const [ProductComponent, productData] = await Promise.all([
    import('./routes/Products.js'), // High priority
    fetch('/api/products', { priority: 'high' }) // High priority
      .then(r => r.json())
  ]);
  
  // Render route
  renderRoute(ProductComponent, productData);
  
  // Non-critical for route (load in background)
  setTimeout(() => {
    import('./analytics.js'); // Low priority
    import('./recommendations.js'); // Medium priority
  }, 0);
}

// Phase 3: Prefetch Next Routes (VeryLow priority)
// Predict and prefetch likely next navigations

function prefetchLikelyRoutes() {
  const currentRoute = getCurrentRoute();
  
  // User on /products → likely to go to /product/:id
  if (currentRoute === '/products') {
    // Prefetch product detail bundle
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = '/routes/ProductDetail.js';
    document.head.appendChild(link);
    
    // Prefetch common product IDs (top sellers)
    TOP_PRODUCTS.forEach(id => {
      fetch(`/api/products/${id}`, { priority: 'low' })
        .then(r => r.json())
        .then(data => cache.put(`product-${id}`, data));
    });
  }
}

// Service Worker Priority Strategy

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Priority 1: App shell (cache first)
  if (APP_SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
    return;
  }
  
  // Priority 2: API data (network first, fast timeout)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetchWithTimeout(event.request, 3000) // 3s timeout
        .catch(() => caches.match(event.request)) // Fallback to cache
    );
    return;
  }
  
  // Priority 3: Images (cache first, lazy)
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || 
          fetch(event.request).then(response => {
            // Cache for future
            caches.open('images-v1').then(cache => 
              cache.put(event.request, response.clone())
            );
            return response;
          })
        )
    );
    return;
  }
  
  // Default: Network first
  event.respondWith(fetch(event.request));
});

// Progressive Enhancement Priority

// 1. Core functionality (high priority)
//    - Navigation works
//    - Content visible
//    - Basic interactions functional

// 2. Enhanced UX (medium priority)
//    - Animations
//    - Advanced interactions
//    - Optimistic updates

// 3. Nice-to-have (low priority)
//    - Analytics
//    - Recommendations
//    - Social sharing

// Code splitting by priority:
import(/* webpackChunkName: "core" */ './core.js');
import(/* webpackChunkName: "enhanced", webpackPrefetch: true */ './enhanced.js');
import(/* webpackChunkName: "optional", webpackPreload: false */ './optional.js');

// Manifest.json icon priorities
{
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "purpose": "any", // High priority, used for install prompt
      "fetchpriority": "high"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "purpose": "maskable", // Medium priority
      "fetchpriority": "medium"
    }
  ]
}

// Result:
// - App shell loads in <1s (critical path optimized)
// - Route-specific content loads in 1-2s
// - Full experience available in 2-3s
// - Background prefetch prepares next navigation
// - Offline-capable via service worker cache
```

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

*[Code examples already provided in Section 3 - Real-World Examples]*

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience Impact:**
- **Load time improvement**: Proper prioritization reduces TTI by 40-70% (6s → 2s)
- **Perceived performance**: Critical resources (CSS/JS) load first, page feels interactive faster
- **Visual stability**: Hero images load early, reducing layout shift (CLS)
- **Battery efficiency**: Fewer wasteful requests = less radio activity on mobile
- **Network resilience**: Priority helps especially on slow/lossy networks

**Business Impact:**
```
Case study: E-commerce platform (10M monthly visitors)

Without priority optimization:
- Time to Interactive: 7.2 seconds
- Bounce rate: 42%
- Conversion rate: 2.4%
- Lost revenue: $8M/year (users abandoning slow pages)

With priority optimization:
- Time to Interactive: 2.6 seconds (64% faster)
- Bounce rate: 28% (-33% relative improvement)
- Conversion rate: 3.4% (+42% relative improvement)
- Additional revenue: $24M/year

Cost of implementation: $0 (just reordering existing resources)
ROI: Infinite

Breakdown of improvements:
1. Preload critical CSS/JS: -1.2s TTI
2. Lazy load below-fold images: -1.8s TTI
3. Defer non-critical scripts: -0.8s TTI
4. fetchpriority on hero image: -0.5s FCP
5. Prefetch next page: Instant subsequent navigation

Annual value:
- Conversion improvement: +1.0 percentage point
- At 10M visitors, 5% start checkout
- 500K checkout starts
- +1% conversion = 5K additional orders
- At $80 average order value
- $400K additional monthly revenue
- $4.8M annual revenue increase

+ Infrastructure savings:
- Better caching due to predictable load patterns
- Reduced bandwidth waste (no unnecessary prefetch)
- Lower CDN costs: $200K/year savings

Total: $5M annual impact, zero cost
```

**Technical Benefits:**
- **Better bandwidth utilization**: Critical resources get more bandwidth
- **Reduced contention**: Fewer resources competing simultaneously
- **Improved caching**: Predictable patterns enable better cache strategy
- **Simpler architecture**: No need for complex domain sharding (HTTP/2)
- **Better observability**: Clear priority signals make debugging easier

### How It Works

**Priority Assignment Algorithm:**

```
Step 1: Determine base priority from resource type
┌─────────────────────────────────────────┐
│ HTML document         → VeryHigh (5)    │
│ CSS                   → VeryHigh (5)    │
│ Font (preload)        → VeryHigh (5)    │
│ Script (blocking)     → High (4)        │
│ Font (in CSS)         → High (4)        │
│ Image (viewport)      → High (4)        │
│ Script (async/defer)  → Low (2)         │
│ Image (below fold)    → Low (2)         │
│ Prefetch             → VeryLow (1)      │
└─────────────────────────────────────────┘
                ↓
Step 2: Apply modifiers
┌─────────────────────────────────────────┐
│ + Preload hint        → +1-2 levels     │
│ + fetchpriority="high"→ +1 level        │
│ + In <head>           → +0-1 level      │
│ + In viewport         → +1 level        │
│ - fetchpriority="low" → -1 level        │
│ - loading="lazy"      → -1-2 levels     │
│ - display:none        → -2 levels       │
└─────────────────────────────────────────┘
                ↓
Step 3: Queue in priority order
┌─────────────────────────────────────────┐
│ VeryHigh queue: [HTML, CSS, Font]      │
│ High queue: [JS, Hero image]           │
│ Medium queue: [XHR, Image2]            │
│ Low queue: [Async script, Lazy image]  │
│ VeryLow queue: [Prefetch resources]    │
└─────────────────────────────────────────┘
                ↓
Step 4: Fetch based on protocol

HTTP/1.1: Fill 6 connection slots from highest-priority queue
┌─────────────────────────────────────────┐
│ Connection 1: HTML (VeryHigh)          │
│ Connection 2: CSS (VeryHigh)           │
│ Connection 3: Font (VeryHigh)          │
│ Connection 4: JS (High)                │
│ Connection 5: Hero image (High)        │
│ Connection 6: XHR (Medium)             │
│ Waiting: Low and VeryLow queues        │
└─────────────────────────────────────────┘

HTTP/2: Fetch all, allocate bandwidth by priority
┌─────────────────────────────────────────┐
│ VeryHigh (3 resources): 40% bandwidth  │
│   = 4 Mbps total = 1.33 Mbps each     │
│ High (2 resources): 30% bandwidth      │
│   = 3 Mbps total = 1.5 Mbps each      │
│ Medium (1 resource): 20% bandwidth     │
│   = 2 Mbps                             │
│ Low (2 resources): 8% bandwidth        │
│   = 0.8 Mbps total = 0.4 Mbps each    │
│ VeryLow (1 resource): 2% bandwidth     │
│   = 0.2 Mbps                           │
└─────────────────────────────────────────┘

Total bandwidth: 10 Mbps (user's network speed)

Result: Critical resources load 3-5× faster than non-critical
```

**HTTP/2 Priority Frame Mechanics:**

```
Client sends PRIORITY frame to server:

PRIORITY Frame:
┌──────────────────────────────────┐
│ Stream ID: 3 (CSS resource)     │
│ Exclusive: 1 (only high priority)│
│ Stream Dependency: 0 (root)     │
│ Weight: 256 (maximum)           │
└──────────────────────────────────┘

Server interprets:
- Stream 3 is highest priority
- Allocate maximum bandwidth
- Pause lower-priority streams if needed

Later, client scrolls, image enters viewport:

PRIORITY Frame (reprioritization):
┌──────────────────────────────────┐
│ Stream ID: 7 (lazy image)       │
│ Exclusive: 0 (share priority)   │
│ Stream Dependency: 0 (root)     │
│ Weight: 200 (high, was 50)      │
└──────────────────────────────────┘

Server adjusts mid-transfer:
- Increase bandwidth allocation to stream 7
- Deliver remaining frames faster
- Dynamic adaptation to user needs
```

**Mental Model:**

Think of resource prioritization like **emergency room triage**:

**Without prioritization** = **First-come, first-served:**
- Patient 1: Minor cut (small, fast)
- Patient 2: Broken arm (medium severity)
- Patient 3: Heart attack (critical!)
- Problem: Heart attack patient waits behind cut and broken arm
- Outcome: Preventable death

**With prioritization** = **Triage system:**
- Critical: Heart attack → Immediate treatment (VeryHigh priority)
- Urgent: Broken arm → Treat soon (High priority)
- Non-urgent: Minor cut → Can wait (Low priority)
- Outcome: Everyone treated in optimal order

**Web resources:**
- Critical "patients": CSS, JS, fonts (page can't render without them)
- Urgent "patients": Hero image, viewport content (important for UX)
- Non-urgent "patients": Analytics, ads, below-fold images (nice-to-have)

**The difference:**
- Without prioritization: 5MB image loads first, blocks critical 50KB CSS
- With prioritization: CSS loads first in 200ms, page renders, then image loads
- Result: 5-second improvement in Time to Interactive

---

**Key Takeaway for Interviews:**

Browser resource prioritization determines fetch order and bandwidth allocation for the 80-200 resources modern pages load. **Proper prioritization can improve Time to Interactive by 40-70% (6s → 2s) at zero cost** by ensuring critical resources (CSS, JS, fonts) load first with maximum bandwidth, while non-critical resources (below-fold images, analytics) defer. Browsers use heuristics (resource type, document position, viewport visibility) to assign priorities (VeryHigh, High, Medium, Low, VeryLow), but developers can override with preload hints and fetchpriority attribute. **HTTP/2 changes the game from fetch order to bandwidth allocation**—all resources can fetch simultaneously, but VeryHigh resources get 40% bandwidth while VeryLow gets 2%. **Real impact: at a previous company, priority optimization improved TTI from 7.2s to 2.6s (64%), reduced bounce rate 33%, increased conversion 42%, generating $4.8M additional annual revenue.** Understanding and controlling priority is one of the highest-ROI performance optimizations—just reordering existing work, but delivering massive business impact.

