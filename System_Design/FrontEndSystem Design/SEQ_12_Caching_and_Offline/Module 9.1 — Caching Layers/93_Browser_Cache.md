# 71. Browser Cache

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Browser Cache** is the local storage mechanism where browsers store copies of web resources (HTML, CSS, JavaScript, images, fonts) to avoid redundant downloads. It operates as a multi-tiered system with memory cache, disk cache, and sophisticated eviction policies, all governed by HTTP headers and browser heuristics.

### What it is:
A multi-layered caching system within the browser:
- **Memory cache**: RAM-based, ultra-fast (< 1ms), cleared on tab/process close
- **Disk cache**: Persistent storage (SSD/HDD), fast (5-20ms), survives restarts
- **Cache metadata**: Stores headers, expiry times, validation tokens
- **Eviction policies**: LRU (Least Recently Used), size limits, age-based
- **Heuristic caching**: Browser-determined caching when headers missing

**Key characteristics:**
- Size: ~300MB-1GB typical disk cache, ~50-100MB memory cache
- Scope: Per-origin isolation (security boundary)
- Privacy: Private per-user (not shared like CDN)
- Control: HTTP headers (Cache-Control, Expires, ETag)

### Why it exists:
- **Zero latency**: Serve from local disk vs 50-300ms network roundtrip
- **Bandwidth savings**: Eliminate redundant downloads (90%+ reduction)
- **Offline capability**: Continue working without network
- **User experience**: Instant navigation, no loading spinners
- **Battery life**: Network requests drain mobile battery

**Real-world impact:**
```
Typical website (first vs return visit):

First visit (cold cache):
- Homepage HTML: 45KB (network, 150ms)
- main.js: 850KB (network, 800ms)
- vendor.js: 620KB (network, 600ms)
- main.css: 320KB (network, 280ms)
- Images: 2.1MB (network, 1.8s)
- Total: 3.9MB, 3.6s load time

Return visit (warm cache):
- Homepage HTML: 45KB (network, 150ms, revalidated)
- main.js: 850KB (memory cache, < 1ms)
- vendor.js: 620KB (memory cache, < 1ms)
- main.css: 320KB (memory cache, < 1ms)
- Images: 2.1MB (disk cache, 50ms)
- Total: 45KB network, 200ms load time (18x faster!)

Cache hit ratio: 98.8% (3.855MB cached / 3.9MB total)
```

### When and where it's used:
- **Static assets**: JavaScript, CSS, fonts (long-term cache)
- **Images**: Product photos, avatars, icons (medium-term cache)
- **HTML**: Pages (short-term or no cache for freshness)
- **API responses**: Cacheable GET requests (selective)
- **Service Workers**: Programmatic cache control (PWAs)

### Role in large-scale applications:
In production systems:
- **Cache-aware architecture** assumes 90%+ users have warm cache
- **Versioned assets** enable aggressive caching without staleness
- **Monitoring** tracks cache hit rates via Performance API
- **Preloading** warms cache for critical resources
- **Cache partitioning** (privacy feature) affects cache sharing

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Browser Cache Architecture

**Multi-tiered cache hierarchy:**

```
Request Flow: GET /static/main.js

┌─────────────────────────────────────────┐
│ 1. Memory Cache (L1)                    │
│    - Location: RAM (process memory)     │
│    - Size: 50-100MB typical             │
│    - Speed: < 1ms                       │
│    - Lifetime: Tab/process duration     │
│    - Priority: Recently accessed        │
└─────────────┬───────────────────────────┘
              │ MISS ↓
┌─────────────────────────────────────────┐
│ 2. Disk Cache (L2)                      │
│    - Location: SSD/HDD                  │
│    - Size: 300MB-1GB typical            │
│    - Speed: 5-20ms (SSD) / 20-100ms (HDD)│
│    - Lifetime: Persistent (30-90 days)  │
│    - Priority: LRU eviction             │
└─────────────┬───────────────────────────┘
              │ MISS ↓
┌─────────────────────────────────────────┐
│ 3. Service Worker Cache (Optional)      │
│    - Location: Disk (CacheStorage API)  │
│    - Size: Quota-based (~1GB)           │
│    - Speed: 10-30ms                     │
│    - Lifetime: Persistent until cleared │
│    - Priority: Programmatic control     │
└─────────────┬───────────────────────────┘
              │ MISS ↓
┌─────────────────────────────────────────┐
│ 4. Network (CDN/Origin)                 │
│    - Speed: 50-300ms (latency)          │
│    - Bandwidth: Full resource size      │
│    - Cost: Data transfer charges        │
└─────────────────────────────────────────┘
```

**Performance characteristics:**
```javascript
// Performance API measurement
const entries = performance.getEntriesByType('resource');

entries.forEach(entry => {
  const {
    name,
    transferSize,      // Bytes over network (0 = memory cache)
    encodedBodySize,   // Compressed size
    decodedBodySize,   // Uncompressed size
    duration,          // Total time
  } = entry;
  
  // Detect cache type
  if (transferSize === 0 && decodedBodySize > 0) {
    console.log(`${name}: Memory cache (${duration}ms)`);
  } else if (transferSize > 0 && transferSize < decodedBodySize) {
    console.log(`${name}: Disk cache + compression (${duration}ms)`);
  } else {
    console.log(`${name}: Network (${duration}ms)`);
  }
});

// Typical results:
// main.js: Memory cache (0.5ms)
// vendor.js: Disk cache + compression (12ms)
// image.jpg: Network (245ms)
```

### Memory Cache vs Disk Cache

**Memory Cache characteristics:**

```
Advantages:
+ Ultra-fast: < 1ms access time
+ Zero I/O: No disk reads
+ Battery efficient: No disk spin-up
+ Already decoded: Ready to use (images/JS parsed)

Disadvantages:
- Limited size: ~50-100MB (varies by available RAM)
- Volatile: Cleared on tab close
- Process-bound: Not shared across tabs/windows
- First-come eviction: Under memory pressure

When used:
- Recently accessed resources (last 30-60 seconds)
- Current page resources
- Critical render path assets
- Small resources (< 10MB)

Eviction triggers:
- Tab closed
- Browser process terminated
- Low memory conditions
- Cache size limit exceeded
- Explicit cache clear
```

**Disk Cache characteristics:**

```
Advantages:
+ Persistent: Survives browser restarts
+ Large capacity: 300MB-1GB typical
+ Shared: Across tabs/windows (same origin)
+ Long-term: Resources available for weeks

Disadvantages:
- Slower: 5-20ms (SSD), 20-100ms (HDD)
- I/O cost: Disk reads consume resources
- Battery impact: Disk activity drains battery
- Privacy concerns: Persistent tracking potential

When used:
- Not in memory cache
- Resources accessed > 60s ago
- Larger resources (> 1MB)
- Cross-tab resources
- Long-term cacheable assets

Eviction triggers:
- LRU (Least Recently Used) when full
- Age-based (30-90 days unused)
- Manual browser clear
- Cache size limit exceeded
```

### Cache Eviction Policies

**LRU (Least Recently Used) algorithm:**

```javascript
// Simplified browser cache eviction model

class BrowserCache {
  constructor(maxSize = 500 * 1024 * 1024) { // 500MB
    this.maxSize = maxSize;
    this.currentSize = 0;
    this.entries = new Map(); // URL → CacheEntry
    this.accessOrder = []; // LRU order
  }
  
  get(url) {
    if (!this.entries.has(url)) {
      return null; // Cache miss
    }
    
    const entry = this.entries.get(url);
    
    // Check if expired
    if (Date.now() > entry.expires) {
      this.delete(url);
      return null;
    }
    
    // Update LRU order (move to end = most recently used)
    this.accessOrder = this.accessOrder.filter(u => u !== url);
    this.accessOrder.push(url);
    
    return entry.data;
  }
  
  set(url, data, expires) {
    const size = data.byteLength;
    
    // Evict if necessary
    while (this.currentSize + size > this.maxSize && this.entries.size > 0) {
      this.evictLRU();
    }
    
    // Add to cache
    this.entries.set(url, { data, expires, size });
    this.currentSize += size;
    this.accessOrder.push(url);
  }
  
  evictLRU() {
    // Remove least recently used (first in accessOrder)
    const lruUrl = this.accessOrder.shift();
    if (lruUrl) {
      const entry = this.entries.get(lruUrl);
      this.currentSize -= entry.size;
      this.entries.delete(lruUrl);
      console.log(`Evicted: ${lruUrl} (LRU)`);
    }
  }
}

// Browser maintains similar structure internally
// with additional factors:
// - Resource priority (CSS/JS > images)
// - Access frequency (not just recency)
// - Cache-Control directives
// - HTTPS vs HTTP (HTTPS prioritized)
```

### Heuristic Caching

**When Cache-Control is missing:**

```http
Response without Cache-Control:
HTTP/1.1 200 OK
Last-Modified: Wed, 15 Nov 2023 10:00:00 GMT
Content-Type: image/jpeg
Content-Length: 50000

[Image data]

Browser heuristic:
1. Calculate age: now - Last-Modified = 30 days
2. Apply 10% rule: cache TTL = age × 0.1 = 3 days
3. Store in cache with calculated TTL

Note: Heuristic caching is unreliable—always set Cache-Control!
```

**RFC 7234 heuristic freshness:**
```
If no explicit expiration time:
  freshness_lifetime = (date - last_modified) * 0.1
  
Example:
- Resource last modified: 100 days ago
- Heuristic cache: 10 days
- Problem: Long-lived resources cached longer

Better approach: Always specify Cache-Control
```

### Cache Partitioning (Privacy Feature)

**Traditional shared cache (pre-2020):**
```
Cache key: URL only

Problem:
1. evil.com loads image: tracker.com/image.jpg
2. Image cached with key: "tracker.com/image.jpg"
3. example.com loads same image
4. Cache hit reveals: user visited evil.com (timing attack)

Privacy leak: Cross-site tracking via cache timing
```

**Partitioned cache (Chrome 86+, Firefox 85+):**
```
Cache key: (top-level site, URL)

Same resource, different cache entries:
1. evil.com loads tracker.com/image.jpg
   Cache key: (evil.com, tracker.com/image.jpg)
   
2. example.com loads tracker.com/image.jpg
   Cache key: (example.com, tracker.com/image.jpg)
   
Result: No cache hit, no timing attack

Trade-off:
+ Privacy: No cross-site tracking
+ Security: Isolated per top-level site
- Performance: More cache misses (reduced sharing)
- Storage: Duplicate resources cached
```

**Impact on CDN effectiveness:**
```
Before partitioning:
- CDN serves tracker.com/lib.js to 1000 sites
- First load: network request
- Subsequent sites: cache hit (0ms, 0KB)
- Effective CDN utilization: 99.9% hits

After partitioning:
- CDN serves tracker.com/lib.js to 1000 sites
- Each site: separate cache entry (first load from network)
- No cross-site cache sharing
- Effective CDN utilization: Per-site only

Mitigation: Use same-origin resources or subresource integrity
```

### Cache and Security

**HTTPS vs HTTP caching:**
```
HTTPS resources:
- Cached normally in disk cache
- Encrypted at rest (some browsers)
- Never cached by proxies (end-to-end encryption)
- Secure: No man-in-the-middle access

HTTP resources:
- Cached normally in disk cache
- Not encrypted at rest
- Can be cached/inspected by proxies
- Insecure: Visible to intermediaries

Mixed content:
- HTTPS page loading HTTP resources: blocked by browsers
- Prevents cache poisoning attacks
```

**Cache poisoning prevention:**
```
Attack scenario:
1. Attacker injects malicious response
2. Response cached by browser
3. Victim uses poisoned cache
4. Malicious code executes

Defenses:
- HTTPS only (prevents injection)
- Subresource Integrity (SRI) for CDN resources
- Cache-Control: no-store for sensitive responses
- Content Security Policy (CSP)
- Same-origin policy enforcement
```

### Cache Debugging

**Chrome DevTools Network panel:**
```
Size column indicators:
- "memory cache": Served from memory (fastest)
- "disk cache": Served from disk (fast)
- "ServiceWorker": Served by Service Worker
- "(from prefetch cache)": Preloaded resource
- Actual size: Downloaded from network

Time column:
- < 1ms: Memory cache
- 5-20ms: Disk cache (SSD)
- 50-300ms: Network

Headers:
- Age: Time resource has been in cache
- X-Cache: CDN cache status (HIT/MISS)
```

**Bypass cache for testing:**
```
Normal reload (F5):
- Uses cache, validates with If-None-Match/If-Modified-Since
- Good for testing 304 responses

Hard reload (Ctrl+Shift+R):
- Ignores cache, forces redownload
- Sets Cache-Control: no-cache on request
- Good for testing fresh responses

Empty cache and hard reload:
- Clears all cached resources
- Forces redownload of everything
- Good for testing cold cache performance
```

### Common Pitfalls

1. **Assuming cache is always available:**
   ```
   Problem: User clears cache, or browser evicts resources
   Result: App breaks if it depends on cached resources
   Solution: Graceful degradation, network fallback
   ```

2. **Not considering cache partitioning:**
   ```
   Problem: Expecting cross-site cache hits for CDN resources
   Result: Each site downloads CDN resources (no sharing)
   Solution: Accept trade-off, optimize per-site caching
   ```

3. **Memory cache not persistent:**
   ```
   Problem: Expecting resources in memory after tab close
   Result: Resources reload from disk or network
   Solution: Use disk cache (Cache-Control) or Service Worker
   ```

4. **Cache size limits:**
   ```
   Problem: Caching 5GB of video without eviction strategy
   Result: Cache full, critical assets evicted
   Solution: Prioritize critical assets, monitor cache size
   ```

5. **Private data in disk cache:**
   ```
   Problem: User data cached with public Cache-Control
   Result: Next user sees previous user's data (shared device)
   Solution: Cache-Control: private, no-store for sensitive data
   ```

### Best Practices

1. **Leverage memory cache for hot resources:**
   ```javascript
   // Preload critical resources to get them in memory cache
   <link rel="preload" href="/critical.js" as="script">
   <link rel="preload" href="/critical.css" as="style">
   ```

2. **Optimize for disk cache persistence:**
   ```http
   Cache-Control: public, max-age=31536000, immutable
   
   - public: Can be disk cached
   - max-age: 1 year persistence
   - immutable: Don't revalidate
   ```

3. **Monitor cache effectiveness:**
   ```javascript
   const cacheHitRatio = performance.getEntriesByType('resource')
     .filter(r => r.transferSize === 0).length / 
     performance.getEntriesByType('resource').length;
   
   console.log(`Cache hit ratio: ${(cacheHitRatio * 100).toFixed(2)}%`);
   // Target: > 90% on return visits
   ```

4. **Account for cache partitioning:**
   ```javascript
   // Don't expect cross-site cache hits
   // Optimize per-origin caching instead
   
   // Self-host critical libraries (not CDN)
   // Better: /static/react.js vs cdn.jsdelivr.net/npm/react
   ```

5. **Test cold and warm cache scenarios:**
   ```javascript
   // Measure performance both ways
   
   // Cold cache (first visit):
   // - Expect slower load
   // - All resources from network
   
   // Warm cache (return visit):
   // - Expect fast load
   // - Most resources from cache
   
   // Target metrics:
   // Cold: < 3s LCP
   // Warm: < 1s LCP
   ```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce SPA Cache Strategy

**Asset categorization for optimal caching:**

```javascript
// webpack.config.js - Output with content hashes
module.exports = {
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    path: path.resolve(__dirname, 'build'),
  },
  
  optimization: {
    runtimeChunk: 'single', // Separate runtime for better caching
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
};

// Output files:
// runtime.a1b2c3d4.js      (5KB, changes every build)
// vendors.e5f6g7h8.js      (620KB, changes on dependency update)
// main.i9j0k1l2.js         (850KB, changes on code update)
// home.m3n4o5p6.chunk.js   (120KB, changes on home page update)

// Cache strategy:
const cacheStrategy = {
  // Runtime: Short cache (changes frequently)
  'runtime.*.js': {
    cacheControl: 'public, max-age=3600', // 1 hour
    reason: 'Contains webpack module IDs, changes often'
  },
  
  // Vendors: Long cache (changes rarely)
  'vendors.*.js': {
    cacheControl: 'public, max-age=31536000, immutable',
    reason: 'Third-party code, content-hashed filename'
  },
  
  // App code: Long cache (content-hashed)
  'main.*.js': {
    cacheControl: 'public, max-age=31536000, immutable',
    reason: 'App code, content-hashed filename'
  },
  
  // Route chunks: Long cache (content-hashed)
  '*.chunk.js': {
    cacheControl: 'public, max-age=31536000, immutable',
    reason: 'Lazy-loaded routes, content-hashed filename'
  },
  
  // HTML: No cache (references versioned assets)
  'index.html': {
    cacheControl: 'no-cache',
    reason: 'Entry point, must always be fresh'
  },
};
```

**Nginx configuration:**
```nginx
# nginx.conf
server {
  listen 80;
  server_name shop.example.com;
  root /var/www/shop/build;
  
  # HTML - no cache, always fresh
  location = / {
    try_files /index.html =404;
    add_header Cache-Control "no-cache";
    etag on;
  }
  
  location = /index.html {
    add_header Cache-Control "no-cache";
    etag on;
  }
  
  # Runtime - short cache (changes often)
  location ~* /runtime\.[a-f0-9]{8}\.js$ {
    add_header Cache-Control "public, max-age=3600";
    add_header Vary "Accept-Encoding";
  }
  
  # Vendors and app code - long immutable cache
  location ~* \.(vendors|main)\.[a-f0-9]{8}\.(js|css)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Vary "Accept-Encoding";
  }
  
  # Route chunks - long immutable cache
  location ~* \.[a-f0-9]{8}\.chunk\.(js|css)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Vary "Accept-Encoding";
  }
  
  # Images - medium cache
  location ~* \.(jpg|jpeg|png|gif|svg|webp)$ {
    add_header Cache-Control "public, max-age=2592000"; # 30 days
    add_header Vary "Accept";
  }
  
  # Fonts - long cache
  location ~* \.(woff|woff2|ttf|eot)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "*";
  }
}
```

### Example 2: Cache Performance Monitor

```javascript
// cachePerformanceMonitor.js
class CachePerformanceMonitor {
  constructor() {
    this.metrics = {
      memoryCache: { count: 0, totalSize: 0, avgTime: 0 },
      diskCache: { count: 0, totalSize: 0, avgTime: 0 },
      network: { count: 0, totalSize: 0, avgTime: 0 },
    };
    
    this.init();
  }
  
  init() {
    // Use PerformanceObserver for real-time monitoring
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.analyzeResource(entry);
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
    
    // Also analyze existing entries
    performance.getEntriesByType('resource').forEach(entry => {
      this.analyzeResource(entry);
    });
  }
  
  analyzeResource(entry) {
    const {
      name,
      transferSize,
      encodedBodySize,
      decodedBodySize,
      duration,
    } = entry;
    
    // Classify cache type
    let cacheType;
    if (transferSize === 0 && decodedBodySize > 0) {
      cacheType = 'memoryCache';
    } else if (transferSize > 0 && transferSize < encodedBodySize * 0.1) {
      // Very small transfer = likely from disk cache with 304
      cacheType = 'diskCache';
    } else if (transferSize > 0) {
      cacheType = 'network';
    } else {
      return; // Skip invalid entries
    }
    
    // Update metrics
    const metric = this.metrics[cacheType];
    metric.count++;
    metric.totalSize += decodedBodySize;
    metric.avgTime = ((metric.avgTime * (metric.count - 1)) + duration) / metric.count;
  }
  
  getReport() {
    const total = Object.values(this.metrics).reduce((sum, m) => sum + m.count, 0);
    
    const report = {
      summary: {
        totalResources: total,
        memoryCacheHits: this.metrics.memoryCache.count,
        diskCacheHits: this.metrics.diskCache.count,
        networkFetches: this.metrics.network.count,
        overallCacheHitRatio: (
          ((this.metrics.memoryCache.count + this.metrics.diskCache.count) / total) * 100
        ).toFixed(2) + '%',
      },
      
      performance: {
        memoryCache: {
          avgTime: this.metrics.memoryCache.avgTime.toFixed(2) + 'ms',
          totalSize: (this.metrics.memoryCache.totalSize / 1024 / 1024).toFixed(2) + ' MB',
        },
        diskCache: {
          avgTime: this.metrics.diskCache.avgTime.toFixed(2) + 'ms',
          totalSize: (this.metrics.diskCache.totalSize / 1024 / 1024).toFixed(2) + ' MB',
        },
        network: {
          avgTime: this.metrics.network.avgTime.toFixed(2) + 'ms',
          totalSize: (this.metrics.network.totalSize / 1024 / 1024).toFixed(2) + ' MB',
        },
      },
      
      speedup: {
        memoryCacheVsNetwork: (
          this.metrics.network.avgTime / this.metrics.memoryCache.avgTime
        ).toFixed(2) + 'x',
        diskCacheVsNetwork: (
          this.metrics.network.avgTime / this.metrics.diskCache.avgTime
        ).toFixed(2) + 'x',
      },
    };
    
    return report;
  }
  
  printReport() {
    const report = this.getReport();
    
    console.log('\n📊 Browser Cache Performance Report\n');
    console.log('Summary:');
    console.table(report.summary);
    
    console.log('\nPerformance by Cache Type:');
    console.table(report.performance);
    
    console.log('\nSpeedup vs Network:');
    console.table(report.speedup);
    
    // Send to analytics
    this.sendToAnalytics(report);
  }
  
  sendToAnalytics(report) {
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/analytics/cache', JSON.stringify(report));
    }
  }
}

// Initialize on page load
const monitor = new CachePerformanceMonitor();

// Report after page fully loaded
window.addEventListener('load', () => {
  setTimeout(() => {
    monitor.printReport();
  }, 3000); // Wait 3s for all resources
});

// Make available globally for debugging
window.cacheMonitor = monitor;
```

### Example 3: Intelligent Resource Preloading

```javascript
// intelligentPreloader.js
class IntelligentPreloader {
  constructor(options = {}) {
    this.options = {
      maxPreloadSize: options.maxPreloadSize || 5 * 1024 * 1024, // 5MB
      minCacheTime: options.minCacheTime || 3600, // 1 hour
      priorities: options.priorities || {
        critical: ['css', 'js'],
        high: ['woff2', 'woff'],
        medium: ['jpg', 'png', 'svg'],
        low: ['mp4', 'webm'],
      },
    };
    
    this.preloadedResources = new Set();
  }
  
  /**
   * Preload resources likely to be needed soon
   */
  preloadForRoute(route) {
    // Get resources for this route from manifest
    const resources = this.getRouteResources(route);
    
    // Filter and prioritize
    const toPreload = resources
      .filter(r => !this.isInCache(r.url))
      .sort((a, b) => this.getPriority(a) - this.getPriority(b))
      .slice(0, 10); // Limit to top 10
    
    // Preload each resource
    toPreload.forEach(resource => {
      this.preload(resource.url, resource.type);
    });
  }
  
  preload(url, type) {
    if (this.preloadedResources.has(url)) {
      return; // Already preloaded
    }
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    
    // Add to DOM
    document.head.appendChild(link);
    this.preloadedResources.add(url);
    
    console.log(`Preloading: ${url} (${type})`);
  }
  
  getPriority(resource) {
    const ext = resource.url.split('.').pop();
    
    if (this.options.priorities.critical.includes(ext)) return 0;
    if (this.options.priorities.high.includes(ext)) return 1;
    if (this.options.priorities.medium.includes(ext)) return 2;
    return 3; // low priority
  }
  
  isInCache(url) {
    // Check if resource is in cache using Performance API
    const entries = performance.getEntriesByName(url);
    if (entries.length === 0) return false;
    
    const latest = entries[entries.length - 1];
    
    // If transferSize is 0, it was served from cache
    return latest.transferSize === 0;
  }
  
  getRouteResources(route) {
    // In production, this would come from build manifest
    const manifest = {
      '/products': [
        { url: '/static/products.chunk.js', type: 'script' },
        { url: '/static/product-list.css', type: 'style' },
        { url: '/images/placeholder.jpg', type: 'image' },
      ],
      '/checkout': [
        { url: '/static/checkout.chunk.js', type: 'script' },
        { url: '/static/payment-form.css', type: 'style' },
      ],
    };
    
    return manifest[route] || [];
  }
  
  /**
   * Preload on hover (link prefetching)
   */
  enableHoverPreload() {
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http')) return;
      
      // Preload resources for this route
      this.preloadForRoute(href);
    }, { passive: true });
  }
  
  /**
   * Preload on idle
   */
  enableIdlePreload() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Preload most likely next pages
        this.preloadForRoute('/products');
      }, { timeout: 2000 });
    }
  }
}

// Usage
const preloader = new IntelligentPreloader();

// Enable hover prefetching
preloader.enableHoverPreload();

// Preload during idle time
preloader.enableIdlePreload();

// Explicit preload before navigation
function navigateToProducts() {
  preloader.preloadForRoute('/products');
  
  // Navigate after brief delay (let preload start)
  setTimeout(() => {
    window.location.href = '/products';
  }, 50);
}
```

### Example 4: Cache Warming Strategy

```javascript
// cacheWarmer.js
class CacheWarmer {
  constructor(criticalResources) {
    this.criticalResources = criticalResources;
    this.warmed = new Set();
  }
  
  /**
   * Warm cache with critical resources
   */
  async warmCache() {
    console.log('🔥 Warming browser cache...');
    
    const startTime = Date.now();
    
    // Warm in parallel with priority
    await Promise.all(
      this.criticalResources.map(resource =>
        this.warmResource(resource)
      )
    );
    
    const duration = Date.now() - startTime;
    console.log(`✓ Cache warmed in ${duration}ms`);
    
    return {
      resources: this.criticalResources.length,
      duration,
      success: this.warmed.size,
      failed: this.criticalResources.length - this.warmed.size,
    };
  }
  
  async warmResource(resource) {
    try {
      // Fetch resource to get it into cache
      const response = await fetch(resource.url, {
        mode: 'cors',
        credentials: 'same-origin',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Read body to ensure it's cached
      await response.blob();
      
      this.warmed.add(resource.url);
      console.log(`  ✓ Warmed: ${resource.url}`);
      
      return { url: resource.url, status: 'success' };
    } catch (error) {
      console.error(`  ✗ Failed: ${resource.url}`, error);
      return { url: resource.url, status: 'failed', error: error.message };
    }
  }
  
  /**
   * Verify resources are in cache
   */
  verifyCacheWarming() {
    const results = this.criticalResources.map(resource => {
      const entries = performance.getEntriesByName(resource.url);
      if (entries.length === 0) {
        return { url: resource.url, inCache: false };
      }
      
      const latest = entries[entries.length - 1];
      const inCache = latest.transferSize === 0 || 
                      latest.transferSize < latest.encodedBodySize * 0.1;
      
      return {
        url: resource.url,
        inCache,
        transferSize: latest.transferSize,
        duration: latest.duration.toFixed(2) + 'ms',
      };
    });
    
    console.log('\n📊 Cache Warming Verification:');
    console.table(results);
    
    return results;
  }
}

// Define critical resources
const criticalResources = [
  { url: '/static/runtime.a1b2c3d4.js', priority: 'critical' },
  { url: '/static/vendors.e5f6g7h8.js', priority: 'high' },
  { url: '/static/main.i9j0k1l2.js', priority: 'high' },
  { url: '/static/main.css', priority: 'high' },
  { url: '/fonts/roboto-v30-latin-regular.woff2', priority: 'medium' },
];

// Warm cache on app initialization
const warmer = new CacheWarmer(criticalResources);

// Warm during idle time (don't block initial render)
if ('requestIdleCallback' in window) {
  requestIdleCallback(async () => {
    await warmer.warmCache();
    warmer.verifyCacheWarming();
  });
} else {
  // Fallback for browsers without requestIdleCallback
  setTimeout(async () => {
    await warmer.warmCache();
    warmer.verifyCacheWarming();
  }, 1000);
}
```

### Example 5: Cache-Aware Data Fetching Hook

```javascript
// useCacheAwareData.js
import { useState, useEffect, useRef } from 'react';

/**
 * Hook that leverages browser cache for data fetching
 * Optimizes for memory/disk cache hits
 */
function useCacheAwareData(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);
  
  const abortControllerRef = useRef(null);
  
  useEffect(() => {
    let cancelled = false;
    
    async function fetchData() {
      // Create abort controller for cleanup
      abortControllerRef.current = new AbortController();
      
      try {
        const start = performance.now();
        
        // Fetch with abort signal
        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
          ...options,
        });
        
        if (cancelled) return;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const responseData = await response.json();
        const duration = performance.now() - start;
        
        // Detect cache status from Performance API
        const perfEntry = performance.getEntriesByName(url).pop();
        let status = 'network';
        
        if (perfEntry) {
          if (perfEntry.transferSize === 0) {
            status = 'memory-cache';
          } else if (perfEntry.transferSize < perfEntry.encodedBodySize * 0.1) {
            status = 'disk-cache';
          }
        }
        
        setCacheStatus(status);
        setData(responseData);
        setLoading(false);
        
        // Log cache performance
        console.log(
          `Fetched ${url} from ${status} in ${duration.toFixed(2)}ms`
        );
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Fetch aborted');
          return;
        }
        
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      cancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url]);
  
  // Force refresh (bypass cache)
  const refresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        cache: 'reload', // Bypass cache
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const responseData = await response.json();
      setData(responseData);
      setCacheStatus('network');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  
  return { data, loading, error, cacheStatus, refresh };
}

// Usage in component
function ProductList() {
  const { data, loading, error, cacheStatus, refresh } = useCacheAwareData(
    '/api/products'
  );
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <div className="cache-status">
        {cacheStatus === 'memory-cache' && (
          <span className="badge badge-success">
            ⚡ Memory Cache (< 1ms)
          </span>
        )}
        {cacheStatus === 'disk-cache' && (
          <span className="badge badge-info">
            💾 Disk Cache (~10ms)
          </span>
        )}
        {cacheStatus === 'network' && (
          <span className="badge badge-warning">
            🌐 Network (~200ms)
          </span>
        )}
      </div>
      
      <button onClick={refresh} className="btn">
        Refresh (bypass cache)
      </button>
      
      <ul>
        {data.products.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "Explain how browser caching works and how you'd optimize it for a large-scale application."**

**Strong Answer:**

"Browser cache is a multi-tiered storage system that eliminates redundant network requests by storing resources locally. Understanding its architecture is critical for optimizing web performance at scale.

**The browser maintains two primary cache layers**: memory cache and disk cache. Memory cache is RAM-based, ultra-fast—sub-millisecond access—but limited to 50-100MB and cleared when tabs close. Disk cache is persistent storage, larger at 300MB-1GB, survives browser restarts, but slower at 5-20ms on SSD. When a resource is requested, the browser checks memory cache first, then disk cache, then finally the network.

**My optimization strategy starts with asset versioning**. All static JavaScript, CSS, and fonts use content-hash filenames like main.abc123.js. This enables immutable caching with `Cache-Control: public, max-age=31536000, immutable`. The 'immutable' directive tells browsers never to revalidate—just use the cached version. Since the filename contains a content hash, any code change produces a new filename, automatically invalidating old versions. This eliminates the cache invalidation problem entirely.

**For HTML, the strategy differs**. HTML files reference those versioned assets, so they must always be fresh. I use `Cache-Control: no-cache`, which is often misunderstood—it doesn't mean 'don't cache', it means 'revalidate before using'. The HTML is stored in disk cache but the browser sends `If-None-Match` with the ETag before using it. If unchanged, the server returns 304 Not Modified with no body, saving 99% of bandwidth while ensuring freshness.

**Memory cache optimization is about preloading**. Critical assets like main.js and main.css get `<link rel='preload'>` tags to load them immediately and keep them in memory cache. This is especially important for SPAs—when users navigate between routes, if the route chunk is already in memory cache, navigation feels instant.

**An important recent development is cache partitioning**. For privacy, modern browsers (Chrome 86+, Firefox 85+) partition the cache by top-level site. This means evil.com and example.com can't infer user behavior through cache timing attacks, but it also means CDN resources no longer benefit from cross-site caching. Each site loads jquery.js separately even if it's from the same CDN. The trade-off is worth it for privacy, but we adapt by self-hosting critical libraries or accepting the per-site cache behavior.

**At scale, monitoring cache effectiveness is essential**. I use the Performance API's transferSize property—zero indicates memory cache, small indicates disk cache or 304, large indicates network fetch. We track cache hit ratio (target 90%+ on return visits) and correlate it with page load times. A drop in cache hit ratio often indicates issues with Cache-Control headers or overly aggressive cache eviction.

**One challenge we faced was cache eviction under memory pressure**. On low-end devices, the browser was evicting our main.js from memory cache aggressively, forcing disk reads on every navigation. We solved this by reducing main.js size through code splitting—breaking it into smaller chunks meant more stayed in memory cache. We also increased the priority of critical chunks using `<link rel='preload'>` which signals to the browser they shouldn't be evicted.

**For disk cache, the key is understanding LRU eviction**. When the 500MB cache fills up, the browser evicts least recently used resources. Large media files can push out critical JavaScript. We addressed this by setting shorter max-age for large videos (1 day vs 1 year for JS) and prioritizing which assets should be long-lived in cache."

### Likely Follow-Up Questions

1. **"What's the difference between memory cache and disk cache?"**
   - **Memory**: RAM-based, < 1ms access, ~50-100MB, cleared on tab close
   - **Disk**: SSD/HDD, 5-20ms access, ~300MB-1GB, persists across sessions
   - Memory for recently accessed (hot), disk for long-term (warm)
   - Can't control which—browser decides based on recency, size, memory pressure
   - Both governed by same Cache-Control headers

2. **"How does cache partitioning affect CDN effectiveness?"**
   - Pre-2020: Cache shared across sites (privacy vulnerability)
   - Post-2020: Cache partitioned by (top-level site, URL)
   - Impact: CDN resources not shared cross-site
   - Example: 1000 sites using CDN jquery.js = 1000 separate cache entries
   - Mitigation: Self-host critical libraries or accept the trade-off
   - Privacy benefit outweighs performance cost

3. **"How do you measure cache effectiveness?"**
   - **Performance API**: `transferSize === 0` = memory/disk cache
   - **Cache hit ratio**: (cached / total) × 100, target > 90%
   - **Load time correlation**: Compare cold vs warm cache loads
   - **Network tab**: "memory cache" / "disk cache" indicators
   - **Real User Monitoring**: Aggregate cache metrics from users

4. **"What causes cache eviction?"**
   - **Size limits**: LRU eviction when cache full (300MB-1GB limit)
   - **Age**: Resources unused for 30-90 days
   - **Memory pressure**: Evict memory cache under low RAM
   - **Manual**: User clears browsing data
   - **Hard refresh**: Ctrl+Shift+R bypasses cache
   - Can't prevent eviction—optimize for it by prioritizing critical assets

5. **"How do you optimize for low-memory devices?"**
   - **Reduce bundle size**: Code splitting, tree shaking
   - **Prioritize critical assets**: `<link rel='preload'>` for must-haves
   - **Smaller chunks**: More likely to stay in memory cache
   - **Service Worker**: Programmatic cache control (survives eviction)
   - **Lazy load non-critical**: Images, below-fold content
   - **Monitor memory usage**: Detect low-memory conditions

6. **"Explain the immutable directive."**
   - Tells browser: "This resource never changes"
   - Browser never revalidates (even on reload)
   - Only safe for content-addressed resources (content hash in filename)
   - Saves revalidation requests (If-None-Match eliminated)
   - Chrome/Firefox support (Safari ignores but harmless)
   - Use with max-age=31536000 for 1-year cache

### Comparison with Alternatives

| Approach | When to Use | Trade-offs |
|----------|-------------|------------|
| **Browser HTTP cache** | Default for all web apps | Automatic, but limited control, privacy partitioning |
| **Service Worker cache** | PWAs, offline support | Full control, but requires code, 10-30ms access |
| **LocalStorage** | Small key-value data (< 5MB) | Synchronous API (blocks), not for large files |
| **IndexedDB** | Large structured data | Complex API, but powerful, good for offline |
| **Memory (in-app)** | Session-scoped data | Fastest, but lost on reload |

### Trade-Off Explanations

**Trade-off 1: Immutable Caching vs Update Latency**
"For our main.js bundle, we use immutable caching with 1-year max-age. This means if we deploy a bug fix, users with cached versions won't get it immediately—they'll get the new version only when the HTML references the new filename. The trade-off is deployment strategy: we deploy assets first, wait 2 minutes for CDN propagation, then deploy HTML. This ensures new HTML never references non-existent assets. The performance benefit—zero revalidation requests, instant loads—is worth the 2-minute deployment delay."

**Trade-off 2: Cache Partitioning Privacy vs Performance**
"Cache partitioning means our site loads React from CDN separately, even if the user just visited another site using the same CDN React. We measured a 12% increase in load time on first visit due to lost cross-site cache hits. However, privacy is non-negotiable—the old cache timing attacks were a genuine threat. We mitigated by self-hosting the top 3 most-used libraries (React, Lodash, moment alternatives), which gave us back 8% of the lost performance while maintaining privacy."

**Trade-off 3: Large Memory Cache vs Available RAM**
"We tested aggressively caching 200MB of assets in memory for instant navigation. On desktop, this worked great—users loved the instant feel. On mobile devices with 2-4GB RAM, the OS aggressively evicted our memory cache to free RAM for other apps. Users returning to our tab found everything had been evicted, forcing disk cache reads or network fetches. We adjusted to a 50MB memory cache target on mobile (detected via navigator.deviceMemory), which stayed resident much longer. The trade-off is some mobile navigations are slower, but they don't fail entirely like they did with aggressive caching."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Browser Cache Inspector Tool

```javascript
// browserCacheInspector.js
class BrowserCacheInspector {
  constructor() {
    this.cacheSizes = {
      memory: 0,
      disk: 0,
      network: 0,
    };
    
    this.resources = [];
  }
  
  /**
   * Analyze all loaded resources
   */
  analyze() {
    const entries = performance.getEntriesByType('resource');
    
    this.resources = entries.map(entry => {
      const analysis = this.analyzeEntry(entry);
      
      // Aggregate sizes
      if (analysis.source === 'memory') {
        this.cacheSizes.memory += analysis.decodedBodySize;
      } else if (analysis.source === 'disk') {
        this.cacheSizes.disk += analysis.decodedBodySize;
      } else {
        this.cacheSizes.network += analysis.transferSize;
      }
      
      return analysis;
    });
    
    return this.generateReport();
  }
  
  analyzeEntry(entry) {
    const {
      name,
      initiatorType,
      transferSize,
      encodedBodySize,
      decodedBodySize,
      duration,
      startTime,
    } = entry;
    
    // Determine cache source
    let source;
    let cacheEfficiency = 0;
    
    if (transferSize === 0 && decodedBodySize > 0) {
      source = 'memory';
      cacheEfficiency = 100;
    } else if (transferSize > 0 && transferSize < decodedBodySize * 0.05) {
      // Less than 5% transferred (304 or disk cache)
      source = 'disk';
      cacheEfficiency = ((decodedBodySize - transferSize) / decodedBodySize * 100);
    } else {
      source = 'network';
      cacheEfficiency = encodedBodySize > 0
        ? ((encodedBodySize - transferSize) / encodedBodySize * 100)
        : 0;
    }
    
    // Estimate savings
    const estimatedNetworkTime = this.estimateNetworkTime(decodedBodySize);
    const timeSaved = source !== 'network' ? estimatedNetworkTime - duration : 0;
    
    return {
      url: name,
      type: initiatorType,
      source,
      transferSize,
      encodedBodySize,
      decodedBodySize,
      duration: Math.round(duration),
      timeSaved: Math.round(timeSaved),
      cacheEfficiency: Math.round(cacheEfficiency),
    };
  }
  
  estimateNetworkTime(size) {
    // Assume 3G connection: 750 Kbps = ~94 KB/s
    // Plus 100ms latency
    const throughputKBps = 94;
    const latency = 100;
    
    return latency + (size / 1024 / throughputKBps) * 1000;
  }
  
  generateReport() {
    const total = this.resources.length;
    const bySource = {
      memory: this.resources.filter(r => r.source === 'memory').length,
      disk: this.resources.filter(r => r.source === 'disk').length,
      network: this.resources.filter(r => r.source === 'network').length,
    };
    
    const cacheHitRatio = ((bySource.memory + bySource.disk) / total * 100).toFixed(2);
    
    const totalTimeSaved = this.resources
      .reduce((sum, r) => sum + r.timeSaved, 0);
    
    const report = {
      summary: {
        totalResources: total,
        memoryCached: bySource.memory,
        diskCached: bySource.disk,
        fromNetwork: bySource.network,
        cacheHitRatio: cacheHitRatio + '%',
      },
      
      performance: {
        totalTimeSaved: (totalTimeSaved / 1000).toFixed(2) + 's',
        avgMemoryCacheTime: this.getAvgTime('memory') + 'ms',
        avgDiskCacheTime: this.getAvgTime('disk') + 'ms',
        avgNetworkTime: this.getAvgTime('network') + 'ms',
      },
      
      storage: {
        memoryCacheSize: (this.cacheSizes.memory / 1024 / 1024).toFixed(2) + ' MB',
        diskCacheSize: (this.cacheSizes.disk / 1024 / 1024).toFixed(2) + ' MB',
        networkTransfer: (this.cacheSizes.network / 1024 / 1024).toFixed(2) + ' MB',
      },
      
      resources: this.resources,
    };
    
    return report;
  }
  
  getAvgTime(source) {
    const filtered = this.resources.filter(r => r.source === source);
    if (filtered.length === 0) return 0;
    
    const avg = filtered.reduce((sum, r) => sum + r.duration, 0) / filtered.length;
    return Math.round(avg);
  }
  
  /**
   * Print detailed report
   */
  printReport() {
    const report = this.generateReport();
    
    console.log('\n🔍 Browser Cache Inspector Report\n');
    console.log('=== Summary ===');
    console.table(report.summary);
    
    console.log('\n=== Performance ===');
    console.table(report.performance);
    
    console.log('\n=== Storage ===');
    console.table(report.storage);
    
    console.log('\n=== Top 10 Largest Resources ===');
    const largest = [...report.resources]
      .sort((a, b) => b.decodedBodySize - a.decodedBodySize)
      .slice(0, 10)
      .map(r => ({
        url: r.url.split('/').pop(),
        source: r.source,
        size: (r.decodedBodySize / 1024).toFixed(2) + ' KB',
        duration: r.duration + 'ms',
        efficiency: r.cacheEfficiency + '%',
      }));
    console.table(largest);
    
    console.log('\n=== Top 10 Slowest Resources ===');
    const slowest = [...report.resources]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(r => ({
        url: r.url.split('/').pop(),
        source: r.source,
        duration: r.duration + 'ms',
        size: (r.decodedBodySize / 1024).toFixed(2) + ' KB',
      }));
    console.table(slowest);
    
    return report;
  }
  
  /**
   * Export report as JSON
   */
  exportReport() {
    const report = this.generateReport();
    const json = JSON.stringify(report, null, 2);
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cache-report-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}

// Usage
const inspector = new BrowserCacheInspector();

// Run after page load
window.addEventListener('load', () => {
  setTimeout(() => {
    const report = inspector.printReport();
    
    // Make available globally
    window.cacheReport = report;
    window.exportCacheReport = () => inspector.exportReport();
  }, 2000);
});

// Run manually
window.inspectCache = () => inspector.printReport();
```

### Example 2: Cache-First Service Worker

```javascript
// sw-cache-first.js

const CACHE_VERSION = 'v1';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

const CACHE_STRATEGY = {
  // Cache first (memory/disk → Service Worker → network)
  cacheFirst: [
    '/static/.*\\.(js|css|woff2|jpg|png|svg)$',
  ],
  
  // Network first (network → Service Worker cache fallback)
  networkFirst: [
    '/api/.*',
  ],
  
  // Stale while revalidate (cache → background update)
  staleWhileRevalidate: [
    '/images/.*\\.(jpg|png|webp)$',
  ],
};

// Install - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/static/main.js',
        '/static/main.css',
      ]);
    })
  );
  
  // Force activation immediately
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  
  return self.clients.claim();
});

// Fetch - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Determine strategy
  const strategy = determineStrategy(url.pathname);
  
  switch (strategy) {
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    
    default:
      event.respondWith(fetch(request));
  }
});

function determineStrategy(pathname) {
  if (CACHE_STRATEGY.cacheFirst.some(pattern => new RegExp(pattern).test(pathname))) {
    return 'cacheFirst';
  }
  if (CACHE_STRATEGY.networkFirst.some(pattern => new RegExp(pattern).test(pathname))) {
    return 'networkFirst';
  }
  if (CACHE_STRATEGY.staleWhileRevalidate.some(pattern => new RegExp(pattern).test(pathname))) {
    return 'staleWhileRevalidate';
  }
  return 'network';
}

// Strategy 1: Cache First
async function cacheFirst(request) {
  // Try cache first
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  // Fallback to network
  try {
    const response = await fetch(request);
    
    // Cache for future
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Return offline fallback
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Strategy 2: Network First
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fallback to cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

// Strategy 3: Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  // Start fetch in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      const cache = caches.open(CACHE_NAME);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  });
  
  // Return cache immediately, or wait for network
  return cached || fetchPromise;
}
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience:**
- **Speed**: Memory cache < 1ms vs network 50-300ms (50-300x faster)
- **Instant navigation**: Cached assets load instantly, no spinners
- **Offline capability**: Cached resources work without network
- **Battery life**: Network requests drain mobile battery significantly
- **Data savings**: 90%+ bandwidth reduction on return visits

**Business Impact:**
```
Real case study: Media Platform (2M daily users, 8 pages/user avg)

Without optimized browser caching:
- First visit: 3.9MB download, 3.6s load time
- Return visits: 3.9MB every time (no cache)
- Monthly bandwidth: 2M × 8 × 30 × 3.9MB = 1,872 TB
- Bandwidth cost: $187,200/month (at $0.10/GB)
- Load time: 3.6s average
- Bounce rate: 32%
- Pages per session: 4.2

With optimized browser caching (98.8% hit ratio):
- First visit: 3.9MB download, 3.6s load time
- Return visits: 45KB HTML only, 200ms load time
- Monthly bandwidth: (2M × 1 × 3.9MB) + (2M × 7 × 30 × 45KB) = 25.5 TB
- Bandwidth cost: $2,550/month (98.6% reduction)
- Load time: 0.4s average (90% improvement)
- Bounce rate: 14% (56% reduction)
- Pages per session: 7.8 (86% increase)
- Additional engagement = +$4.2M annual revenue

ROI: $2,550/month cost → $4.2M/year benefit = 1,647x return
```

**Technical Benefits:**
- **Scalability**: Handle 10x traffic without infrastructure changes
- **Resilience**: Work offline or during network issues
- **Server offload**: 90-98% requests served from cache (not origin)
- **Lower latency**: Sub-millisecond access for hot resources
- **Cost efficiency**: Massive bandwidth savings

### How It Works

**Technical Summary:**

**1. Browser Cache Decision Flow:**
```
User requests: GET /static/main.js

Step 1: Check Memory Cache (L1)
┌──────────────────────────────────┐
│ Location: Process RAM            │
│ Check: Recently accessed?        │
│ Speed: < 1ms                     │
└────────┬─────────────────────────┘
         │
    ┌────┴─────┐
    │ HIT      │ MISS
    ▼          ▼
  RETURN   Step 2: Check Disk Cache (L2)
           ┌─────────────────────────────┐
           │ Location: SSD/HDD           │
           │ Check: URL in disk cache?   │
           │ Validate: max-age expired?  │
           │ Speed: 5-20ms (SSD)         │
           └────────┬────────────────────┘
                    │
               ┌────┴─────┐
               │ HIT      │ MISS
               │          │
               ▼          ▼
           Check     Step 3: Network
           max-age   ┌──────────────────┐
               │     │ Request to CDN/  │
               │     │ origin server    │
               ▼     │ Speed: 50-300ms  │
           Fresh? ───────────────────────┘
          /      \                  │
      YES         NO                │
       │          │                 │
       ▼          ▼                 ▼
    RETURN   Revalidate        Response
             (If-None-Match)       │
                    │              │
                    ▼              │
               304 or 200?         │
              /          \         │
           304            200 ─────┘
            │              │
            ▼              ▼
         RETURN       Update Cache
         cached       & RETURN
```

**2. Memory vs Disk Cache Selection:**
```javascript
// Browser's internal decision logic (simplified)

function shouldUseMemoryCache(resource) {
  // Memory cache criteria:
  return (
    resource.lastAccessTime < 60_000 &&        // < 60s ago
    resource.size < 10 * 1024 * 1024 &&        // < 10MB
    availableMemory > 100 * 1024 * 1024 &&     // > 100MB free
    resource.type in ['script', 'style', 'image']
  );
}

function shouldUseDiskCache(resource) {
  // Disk cache criteria:
  return (
    resource.cacheControl.maxAge > 0 &&        // Cacheable
    resource.age < resource.maxAge &&          // Not expired
    diskCacheSize < 1024 * 1024 * 1024 &&      // < 1GB used
    !resource.cacheControl.noStore             // Not no-store
  );
}

// Result:
// - Hot resources (recent): Memory cache (< 1ms)
// - Warm resources (older): Disk cache (5-20ms)
// - Cold resources (expired): Network (50-300ms)
```

**3. Cache Sizing and Eviction:**
```
Browser cache limits (Chrome):

Memory Cache:
├─ Total size: 50-100MB (dynamic, based on available RAM)
├─ Per-resource: < 10MB (larger goes to disk)
├─ Eviction: LRU + memory pressure
└─ Lifetime: Until tab close or memory needed

Disk Cache:
├─ Total size: 300MB-1GB (configurable)
├─ Per-resource: No limit (but affects eviction)
├─ Eviction: LRU when full, age-based (30-90 days)
└─ Lifetime: Persistent until cleared

Eviction priority (lowest to highest):
1. Old, large, infrequently accessed
2. HTTP resources (vs HTTPS, lower priority)
3. Low-priority types (video, audio)
4. Short max-age resources
5. Recently accessed resources (protected)
6. Critical resources (CSS, JS, fonts)
7. HTTPS resources (higher priority)
```

**4. Performance Impact Calculation:**
```javascript
// Measured performance difference

const resourceSizes = {
  'main.js': 850 * 1024,        // 850 KB
  'vendor.js': 620 * 1024,      // 620 KB
  'main.css': 320 * 1024,       // 320 KB
  'image.jpg': 500 * 1024,      // 500 KB
};

const loadTimes = {
  memoryCache: 0.5,              // 0.5 ms
  diskCache: 15,                 // 15 ms (SSD)
  network: 245,                  // 245 ms (3G avg)
};

// First visit (all from network):
const firstVisitTime = Object.values(resourceSizes).length * loadTimes.network;
// = 4 resources × 245ms = 980ms

// Return visit (memory cache):
const returnVisitTime = Object.values(resourceSizes).length * loadTimes.memoryCache;
// = 4 resources × 0.5ms = 2ms

// Speedup:
const speedup = firstVisitTime / returnVisitTime;
// = 980ms / 2ms = 490x faster!

// Bandwidth saved:
const totalSize = Object.values(resourceSizes).reduce((a, b) => a + b, 0);
const bandwidthSaved = totalSize / 1024 / 1024; // MB
// = 2.29 MB per return visit

// At 1M return visits/day:
const dailySavings = bandwidthSaved * 1_000_000;
// = 2.29 TB/day = 68.7 TB/month

const monthlyCost = dailySavings * 0.10; // $0.10/GB
// = $6,870/month saved
```

**5. Cache Partitioning Impact:**
```
Before partitioning (pre-2020):
┌─────────────────────────────────┐
│ Global Cache                    │
│                                 │
│ cdn.com/react.js → [cached]    │
│                                 │
│ Used by:                        │
│ - site-a.com ✓ (cache hit)     │
│ - site-b.com ✓ (cache hit)     │
│ - site-c.com ✓ (cache hit)     │
│                                 │
│ Cache key: URL only             │
└─────────────────────────────────┘

After partitioning (Chrome 86+):
┌─────────────────────────────────┐
│ Partitioned Cache               │
│                                 │
│ (site-a.com, cdn.com/react.js) │
│ (site-b.com, cdn.com/react.js) │
│ (site-c.com, cdn.com/react.js) │
│                                 │
│ Each site: separate cache entry│
│ No cross-site cache hits        │
│                                 │
│ Cache key: (top-site, URL)     │
└─────────────────────────────────┘

Trade-off:
+ Privacy: No timing attacks
+ Security: Isolated caches
- Performance: No CDN sharing (12% slower first load)
- Storage: 3x duplication in example above
```

**Mental Model:**

Think of browser cache like **a personal library with an assistant**:
- **Memory cache** = Books on your desk (instant access, limited space)
- **Disk cache** = Your bookshelf (quick walk, more space)
- **Network** = City library (drive there, slow but authoritative)
- **LRU eviction** = When desk full, put least-used books back on shelf
- **Cache partitioning** = Separate desk per room (privacy, no sharing)
- **Preloading** = Asking assistant to put books on desk before you need them
- **Immutable** = Classic novels (never check for new editions)

---

**Key Takeaway for Interviews:**

Browser cache is a multi-tiered system with **memory cache** (< 1ms, 50-100MB, volatile) and **disk cache** (5-20ms, 300MB-1GB, persistent). Optimize with **versioned assets** + `immutable` directive for 1-year cache, **HTML** with `no-cache` + ETags for revalidation. Memory cache for hot resources (recent 60s), disk for warm (long-term). Cache partitioning (Chrome 86+) isolates per top-level site (privacy over cross-site sharing). Monitor via Performance API: `transferSize === 0` = cache hit. Target 90%+ hit ratio on return visits. LRU eviction when full (prioritize critical assets via `<link rel='preload'>`). Result: 50-300x faster loads, 90-98% bandwidth savings, instant navigation feel.

