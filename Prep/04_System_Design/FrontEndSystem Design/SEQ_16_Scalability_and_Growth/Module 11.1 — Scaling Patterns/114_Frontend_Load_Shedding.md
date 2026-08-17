# 114. Frontend Load Shedding

## 1. High-Level Explanation (Frontend Interview Level)

**Frontend Load Shedding** is a proactive strategy to maintain application stability and user experience during traffic overload by gracefully degrading non-critical features, delaying expensive operations, and prioritizing essential functionality.

- **What**: Systematic reduction of frontend workload through: deferring non-critical renders, throttling API calls, disabling heavy features, serving cached data, and implementing priority queues for requests
- **Why**: Prevent complete system collapse during traffic spikes (product launches, viral events), maintain core functionality for all users rather than slow experience for everyone, protect backend services from cascading failures
- **When**: Traffic exceeds capacity (200% normal load), elevated backend error rates (> 5%), degraded response times (P95 > 2s), resource exhaustion (memory, CPU)
- **Role**: Acts as circuit breaker between frontend and backend, ensures graceful degradation over catastrophic failure, maintains business-critical paths (checkout > recommendations)

**Key Principle**: Better to serve 100% of users with 80% features than 50% of users with 100% features during overload.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Load Shedding Strategies

**1. Priority-Based Request Handling**

**Classification System**:
```javascript
const RequestPriority = {
  CRITICAL: 0,    // Auth, checkout, cart
  HIGH: 1,        // Product details, search
  MEDIUM: 2,      // Recommendations, reviews
  LOW: 3,         // Analytics, tracking, ads
};

class PriorityQueue {
  queues = [[], [], [], []]; // 4 priority levels
  processing = false;
  
  async enqueue(request, priority = RequestPriority.MEDIUM) {
    return new Promise((resolve, reject) => {
      this.queues[priority].push({ request, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.processing) return;
    this.processing = true;
    
    // Process highest priority first
    for (let priority = 0; priority < 4; priority++) {
      const queue = this.queues[priority];
      
      while (queue.length > 0) {
        const { request, resolve, reject } = queue.shift();
        
        try {
          const response = await fetch(request);
          resolve(response);
        } catch (error) {
          // Critical requests: retry, others: fail fast
          if (priority === RequestPriority.CRITICAL) {
            queue.unshift({ request, resolve, reject }); // Retry
            await sleep(1000);
          } else {
            reject(error);
          }
        }
      }
    }
    
    this.processing = false;
  }
}
```

**Why This Works**: Critical paths (checkout) always processed first, non-critical (analytics) dropped during overload.

**2. Adaptive Feature Flags**

**Dynamic Disabling Based on Health**:
```javascript
class AdaptiveFeatureManager {
  healthMetrics = {
    errorRate: 0.01,        // 1% baseline
    p95Latency: 500,        // 500ms baseline
    requestsPerSecond: 1000 // Normal load
  };
  
  featureConfig = {
    recommendations: { 
      priority: 'LOW', 
      disableAt: { errorRate: 0.05, p95Latency: 2000 }
    },
    reviews: { 
      priority: 'MEDIUM', 
      disableAt: { errorRate: 0.08, p95Latency: 3000 }
    },
    liveChat: { 
      priority: 'LOW', 
      disableAt: { errorRate: 0.03, p95Latency: 1500 }
    }
  };
  
  isFeatureEnabled(featureName) {
    const feature = this.featureConfig[featureName];
    if (!feature) return true;
    
    // Disable if any threshold exceeded
    if (this.healthMetrics.errorRate > feature.disableAt.errorRate) {
      console.warn(`[Load Shedding] Disabled ${featureName}: error rate threshold`);
      return false;
    }
    
    if (this.healthMetrics.p95Latency > feature.disableAt.p95Latency) {
      console.warn(`[Load Shedding] Disabled ${featureName}: latency threshold`);
      return false;
    }
    
    return true;
  }
  
  updateHealthMetrics(metrics) {
    this.healthMetrics = { ...this.healthMetrics, ...metrics };
  }
}

// Usage in component
function ProductPage() {
  const featureManager = useFeatureManager();
  
  return (
    <div>
      <ProductDetails /> {/* Always render */}
      {featureManager.isFeatureEnabled('recommendations') && (
        <Recommendations /> // Disabled during overload
      )}
      {featureManager.isFeatureEnabled('reviews') && (
        <Reviews /> // Disabled at higher threshold
      )}
    </div>
  );
}
```

**Thresholds** (FAANG Standards):
- Error rate > 5% → Disable LOW priority features
- Error rate > 8% → Disable MEDIUM priority features
- Error rate > 15% → Disable all non-CRITICAL features

**3. Request Coalescing & Debouncing**

**Prevent Request Amplification**:
```javascript
class RequestCoalescer {
  pendingRequests = new Map();
  
  async fetch(key, fetcher, ttl = 5000) {
    // Return in-flight request if exists
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key).promise;
    }
    
    // Create new request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ttl);
    
    const promise = fetcher({ signal: controller.signal })
      .finally(() => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(key);
      });
    
    this.pendingRequests.set(key, { promise, controller });
    return promise;
  }
  
  // Cancel all pending LOW priority requests during overload
  cancelLowPriority() {
    for (const [key, { controller }] of this.pendingRequests.entries()) {
      if (key.startsWith('LOW:')) {
        controller.abort();
        this.pendingRequests.delete(key);
      }
    }
  }
}

// Debounced search to prevent request flood
function useDebounceSearch(delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState('');
  const timeoutRef = useRef();
  
  const setValue = useCallback((value) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
  }, [delay]);
  
  return [debouncedValue, setValue];
}

// Usage: 10 keystrokes → 1 API call (90% reduction)
function SearchBox() {
  const [query, setQuery] = useDebounceSearch(300);
  const { data } = useQuery(['search', query], () => searchAPI(query), {
    enabled: query.length > 2
  });
}
```

**Impact**: 1000 concurrent users typing → 1000 debounced API calls vs 10,000+ without debouncing.

**4. Stale-While-Revalidate Aggressive Caching**

**Serve Stale Data During Overload**:
```javascript
class StaleCache {
  cache = new Map();
  
  async fetch(key, fetcher, options = {}) {
    const { 
      staleTime = 60000,      // 60s fresh
      cacheTime = 300000,     // 5min stale allowed
      forceCache = false      // Force stale during overload
    } = options;
    
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached) {
      const age = now - cached.timestamp;
      
      // Fresh: return immediately
      if (age < staleTime) {
        return cached.data;
      }
      
      // Stale but within cacheTime: serve stale + revalidate
      if (age < cacheTime || forceCache) {
        // Async revalidation (don't await)
        this.revalidate(key, fetcher);
        return cached.data; // Serve stale immediately
      }
    }
    
    // No cache or expired: fetch fresh
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }
  
  async revalidate(key, fetcher) {
    try {
      const data = await fetcher();
      this.cache.set(key, { data, timestamp: Date.now() });
    } catch (error) {
      // Revalidation failed, keep stale data
      console.warn(`Revalidation failed for ${key}, keeping stale data`);
    }
  }
  
  // Enable aggressive caching during overload
  setForceStale(enabled) {
    this.forceStale = enabled;
  }
}

// Health check triggers aggressive caching
async function monitorHealth() {
  const health = await fetch('/api/health').then(r => r.json());
  
  if (health.errorRate > 0.05) {
    staleCache.setForceStale(true); // Serve stale aggressively
    console.warn('[Load Shedding] Enabled aggressive stale caching');
  } else {
    staleCache.setForceStale(false);
  }
}
```

**Trade-off**: Users see slightly stale data (1-5min old) vs API overload causing errors for everyone.

**5. Client-Side Rate Limiting**

**Prevent Individual User Abuse**:
```javascript
class ClientRateLimiter {
  buckets = new Map();
  
  async checkLimit(key, limit = 100, window = 60000) {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    
    // Create new bucket
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + window };
      this.buckets.set(key, bucket);
    }
    
    // Check limit
    if (bucket.count >= limit) {
      const waitTime = bucket.resetAt - now;
      throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(waitTime / 1000)}s`);
    }
    
    bucket.count++;
    return true;
  }
}

// Usage with React Query
const rateLimiter = new ClientRateLimiter();

function useRateLimitedQuery(key, fetcher) {
  return useQuery(key, async () => {
    await rateLimiter.checkLimit(key[0], 10, 60000); // 10 req/min
    return fetcher();
  }, {
    onError: (error) => {
      if (error.message.includes('Rate limit')) {
        toast.error('Too many requests. Please slow down.');
      }
    }
  });
}
```

**Protection**: Prevents single user from exhausting quota (intentional or bug-induced infinite loops).

**6. Progressive Rendering & Lazy Hydration**

**Delay Non-Critical Rendering**:
```javascript
function DashboardPage() {
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    // Delay hydration until idle
    requestIdleCallback(() => {
      setHydrated(true);
    });
  }, []);
  
  return (
    <div>
      {/* Critical: render immediately */}
      <Metrics />
      
      {/* Non-critical: defer hydration */}
      {hydrated ? (
        <>
          <HeavyChart />
          <ActivityFeed />
        </>
      ) : (
        <div>Loading additional content...</div>
      )}
    </div>
  );
}

// Virtualized lists for infinite scroll (prevent DOM bloat)
import { FixedSizeList } from 'react-window';

function MessageList({ messages }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {messages[index].text}
    </div>
  );
  
  // Only renders visible rows (20-30) instead of all 10,000
  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={60}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**Performance**: 10,000 messages → render 30 visible rows (99.7% reduction in DOM nodes).

**7. Backend Circuit Breaker Integration**

**Frontend Respects Backend Health**:
```javascript
class CircuitBreaker {
  state = 'CLOSED'; // CLOSED → OPEN → HALF_OPEN
  failures = 0;
  threshold = 5;
  timeout = 60000;
  halfOpenRequests = 0;
  maxHalfOpenRequests = 3;
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt > this.timeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenRequests = 0;
      } else {
        throw new Error('Circuit breaker OPEN');
      }
    }
    
    if (this.state === 'HALF_OPEN' && this.halfOpenRequests >= this.maxHalfOpenRequests) {
      throw new Error('Circuit breaker HALF_OPEN, max requests reached');
    }
    
    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests++;
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.info('[Circuit Breaker] Recovered: HALF_OPEN → CLOSED');
    }
  }
  
  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      console.error('[Circuit Breaker] Tripped: CLOSED → OPEN');
    }
  }
}

// Usage with API client
const circuitBreaker = new CircuitBreaker();

async function fetchWithCircuitBreaker(url) {
  return circuitBreaker.call(async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API error');
    return response.json();
  });
}
```

**State Transitions**:
```
CLOSED (normal): All requests allowed
  ↓ (5 consecutive failures)
OPEN (tripped): Block all requests for 60s, serve cached/fallback
  ↓ (after timeout)
HALF_OPEN (testing): Allow 3 test requests
  ↓ (success)
CLOSED (recovered): Resume normal operation
  ↓ (failure)
OPEN (re-trip): Back to blocking
```

**8. Monitoring & Auto-Recovery**

**Health Polling & Alerting**:
```javascript
class LoadSheddingMonitor {
  intervalId = null;
  listeners = [];
  
  start(pollInterval = 10000) {
    this.intervalId = setInterval(async () => {
      const health = await this.checkHealth();
      this.notifyListeners(health);
      
      if (health.loadSheddingActive) {
        console.warn('[Load Shedding] Active:', health.reason);
      }
    }, pollInterval);
  }
  
  async checkHealth() {
    try {
      const response = await fetch('/api/health', { 
        signal: AbortSignal.timeout(5000) 
      });
      const data = await response.json();
      
      return {
        errorRate: data.errorRate,
        p95Latency: data.p95Latency,
        requestsPerSecond: data.requestsPerSecond,
        loadSheddingActive: this.shouldActivateLoadShedding(data),
        reason: this.getLoadSheddingReason(data)
      };
    } catch (error) {
      // Health check failed, assume overload
      return {
        errorRate: 1.0,
        loadSheddingActive: true,
        reason: 'Health check failed'
      };
    }
  }
  
  shouldActivateLoadShedding(health) {
    return health.errorRate > 0.05 || 
           health.p95Latency > 2000 ||
           health.requestsPerSecond > 10000;
  }
  
  getLoadSheddingReason(health) {
    const reasons = [];
    if (health.errorRate > 0.05) reasons.push(`Error rate: ${(health.errorRate * 100).toFixed(1)}%`);
    if (health.p95Latency > 2000) reasons.push(`P95 latency: ${health.p95Latency}ms`);
    if (health.requestsPerSecond > 10000) reasons.push(`RPS: ${health.requestsPerSecond}`);
    return reasons.join(', ');
  }
  
  subscribe(listener) {
    this.listeners.push(listener);
  }
  
  notifyListeners(health) {
    this.listeners.forEach(listener => listener(health));
  }
}

// React integration
function useLoadShedding() {
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    const monitor = new LoadSheddingMonitor();
    
    monitor.subscribe((health) => {
      setIsActive(health.loadSheddingActive);
      
      // Update feature flags
      featureManager.updateHealthMetrics({
        errorRate: health.errorRate,
        p95Latency: health.p95Latency
      });
    });
    
    monitor.start(10000); // Poll every 10s
    
    return () => monitor.stop();
  }, []);
  
  return isActive;
}
```

**What NOT to Do**:
- ❌ Drop critical requests (auth, checkout) during load shedding
- ❌ No user communication (show banner: "Experiencing high traffic...")
- ❌ Shed load blindly without priority classification
- ❌ No monitoring/alerting (teams unaware of load shedding activation)
- ❌ Synchronous load shedding decisions (slow health checks block requests)

---

## 3. Clear Real-World Examples

### Example 1: Amazon Prime Day (Traffic Spike Handling)

**Load Shedding Strategy**:
```javascript
// Priority classification
const featurePriorities = {
  // CRITICAL: Never disable
  productSearch: 'CRITICAL',
  cart: 'CRITICAL',
  checkout: 'CRITICAL',
  auth: 'CRITICAL',
  
  // HIGH: Disable at 10% error rate
  productReviews: 'HIGH',
  productImages: 'HIGH', // Serve lower quality
  
  // MEDIUM: Disable at 5% error rate
  recommendations: 'MEDIUM',
  wishlist: 'MEDIUM',
  
  // LOW: Disable at 2% error rate
  socialSharing: 'LOW',
  recentlyViewed: 'LOW',
  advertising: 'LOW'
};

// Adaptive image quality
function getImageQuality(errorRate) {
  if (errorRate > 0.10) return 'low';     // 60% JPEG quality
  if (errorRate > 0.05) return 'medium';  // 75% quality
  return 'high';                           // 90% quality
}

// During Prime Day spike:
// - Recommendations disabled (saved 30% API traffic)
// - Image quality reduced to medium (40% bandwidth reduction)
// - Review loading delayed by 2s (progressive enhancement)
// - Advertising completely disabled (saved 10% requests)
// Result: Core shopping experience maintained for all users
```

**Outcome**: During 2022 Prime Day, Amazon handled 300M+ visits with < 0.1% error rate using aggressive load shedding.

### Example 2: Twitter During Major Events (Super Bowl, Elections)

**Progressive Degradation**:
```javascript
// Health-based feature toggles
const TwitterLoadShedding = {
  errorRate: 0.12, // 12% errors during Super Bowl halftime
  
  features: {
    timeline: {
      enabled: true,
      degradation: 'polls_every_30s' // Instead of real-time
    },
    trending: {
      enabled: true,
      degradation: 'cached_5min' // Stale trends acceptable
    },
    media: {
      enabled: true,
      degradation: 'thumbnails_only' // Full images lazy loaded
    },
    analytics: {
      enabled: false // Completely disabled
    },
    advertising: {
      enabled: false // Disabled, lost revenue but kept service up
    }
  }
};

// Polling degradation
function useTimeline() {
  const errorRate = useHealthMetric('errorRate');
  const pollInterval = errorRate > 0.10 ? 30000 : 5000; // 30s vs 5s
  
  return useQuery('timeline', fetchTimeline, {
    refetchInterval: pollInterval
  });
}
```

**Outcome**: Twitter maintained core functionality (reading tweets, posting) during Super Bowl LVII despite 200% normal traffic.

### Example 3: Shopify Black Friday/Cyber Monday

**Multi-Layer Load Shedding**:
```javascript
// Layer 1: CDN-level (Fastly)
// - Serve stale product pages up to 5min (normally 1min)
// - Aggressive bot blocking (save 20% capacity)

// Layer 2: Edge Workers
addEventListener('fetch', event => {
  const health = await getHealth();
  
  if (health.errorRate > 0.08) {
    // Block non-checkout API calls
    if (event.request.url.includes('/api/') && 
        !event.request.url.includes('/checkout')) {
      return new Response('Service temporarily unavailable', { 
        status: 503,
        headers: { 'Retry-After': '60' }
      });
    }
  }
});

// Layer 3: Frontend
function ProductPage() {
  const health = useHealthMonitor();
  
  return (
    <>
      {health.errorRate > 0.05 && (
        <Banner type="warning">
          We're experiencing high traffic. Some features may be delayed.
        </Banner>
      )}
      
      <ProductDetails /> {/* Always shown */}
      
      {health.errorRate < 0.08 && <Reviews />}
      {health.errorRate < 0.05 && <Recommendations />}
      {health.errorRate < 0.03 && <RelatedProducts />}
    </>
  );
}
```

**Scale Numbers**:
- **1.5M requests/second** peak during 2023 BFCM
- **$7.5B in sales** over weekend
- **99.99% uptime** maintained with load shedding
- **30% requests** served from cache (doubled from normal 15%)

### Example 4: GitHub Incident Response (Oct 2023)

**Cascading Failure Prevention**:
```javascript
// Database slow query caused API latency spike
// Frontend load shedding prevented full outage

const incidentResponse = {
  detection: {
    p95Latency: 5000, // 5s (normally 200ms)
    errorRate: 0.15    // 15%
  },
  
  actions: [
    'Disable code intelligence features',
    'Disable activity feed',
    'Disable notifications polling',
    'Serve repository pages from edge cache (15min TTL, stale allowed)',
    'Block new repository creation (write operations)',
    'Allow read operations (viewing code, PRs, issues)'
  ],
  
  outcome: {
    userImpact: 'Reduced features for 22 minutes',
    alternativeImpact: 'Full site outage for 1+ hour without load shedding'
  }
};
```

**Key Decision**: Disabled non-critical features to preserve core functionality (viewing code, existing workflows).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you handle a sudden 10x traffic spike on your frontend application?"

**Answer**:

"I'd implement **priority-based load shedding** with multiple layers of defense:

**Priority Classification**:  
First, classify all features by business criticality. **CRITICAL** (auth, checkout, cart) never disabled. **HIGH** (product details, search) disabled at 10% error rate. **MEDIUM** (recommendations, reviews) disabled at 5% error rate. **LOW** (analytics, ads) disabled at 2% error rate or immediately if detected.

**Frontend Techniques**:

1. **Adaptive Feature Flags**: Monitor health endpoint (every 10s) reporting error rate and P95 latency. Dynamically disable features based on thresholds. For example, if error rate exceeds 5%, recommendations component returns null—saves 30% API traffic.

2. **Aggressive Caching**: Switch to 'serve stale' mode—cache that's normally 60s fresh becomes acceptable up to 5min stale during overload. Better users see slightly old data than errors.

3. **Request Coalescing**: If 100 components need user data, deduplicate to single API call. During spike, this prevents request amplification.

4. **Client-Side Rate Limiting**: Limit individual users to 10 requests/min for non-critical APIs. Prevents abuse and ensures fair distribution.

5. **Circuit Breaker**: After 5 consecutive API failures, stop requests for 60s, serve cached fallbacks. Prevents hammering failing backend.

**Progressive Degradation Example**:
```
Normal: Product page shows details + reviews + recommendations + related
5% errors: Disable recommendations, related products
8% errors: Disable reviews (progressive lazy load)
10% errors: Reduce image quality to 60%
15% errors: Serve entirely from edge cache, block writes
```

**User Communication**: Show banner: 'Experiencing high traffic. Some features temporarily unavailable.' Don't silently degrade—users understand during major events.

**Monitoring**: Track which features disabled, for how long, error rate trends. Alert if load shedding active > 10min (escalate to on-call).

**Trade-offs**:  
Lose non-essential features but maintain core experience for all users. Risk slightly stale data. Complexity in priority classification and health monitoring.

**Real-World**: Amazon Prime Day disables ads, social sharing, personalized recommendations during peak—maintains checkout flow for all users."

### Follow-Up Questions

**Q1**: "How do you decide which features are critical vs non-critical?"

**A**: "Business-driven prioritization matrix:

**Revenue Impact**:
- Direct revenue (checkout, cart, product pages): CRITICAL
- Indirect revenue (recommendations, ads): MEDIUM/LOW

**User Expectations**:
- Core functionality (view product, search): CRITICAL
- Nice-to-haves (reviews, recently viewed): MEDIUM

**Operational Cost**:
- High-cost APIs (ML recommendations): Shed early to reduce backend load
- Low-cost reads (cached data): Keep longer

**Data Freshness Requirements**:
- Real-time critical (inventory, pricing): CRITICAL
- Acceptable stale (reviews, ratings): Serve from cache

**Framework**: Work with product, business, and SRE teams to create priority matrix. Document in runbooks. Review quarterly and after incidents."

**Q2**: "What if load shedding isn't enough and the system still fails?"

**A**: "Multi-layer fallbacks:

**Layer 1** (Frontend Load Shedding): Disable non-critical features—handles 2-3x traffic.

**Layer 2** (Edge Rate Limiting): If still overloaded, CDN enforces 100 req/min per IP—prevents DoS.

**Layer 3** (Queue System): Non-critical requests queued, processed when capacity available—'You're in a queue, ~2min wait.'

**Layer 4** (Maintenance Mode)**: If catastrophic (10x+ spike), serve static HTML: 'We're experiencing unprecedented traffic. Please check back in 10 minutes.' Preserves infrastructure, prevents cascading failures.

**Last Resort**: Graceful shutdown of least-critical services. For e-commerce: keep product viewing + checkout, disable everything else.

**Post-Incident**: Auto-scale triggers for future, pre-warm caches before known events (product launches), chaos engineering to test load shedding."

**Q3**: "How do you test load shedding before production?"

**A**: "Multi-pronged testing:

**1. Load Testing**: Use k6 or Gatling to simulate 10x traffic. Verify features disabled at correct thresholds, core paths remain functional.

**2. Chaos Engineering**: Inject failures (kill API pods, slow database) during staging tests. Verify circuit breakers trip, stale cache served.

**3. Synthetic Monitoring**: Continuously hit production with test requests from multiple regions. Alert if load shedding false-positives (activates during normal traffic).

**4. Feature Flag Testing**: Manually trigger load shedding in staging, verify UI gracefully hides features, no errors logged.

**5. Canary Deploys**: Roll load shedding logic to 1% production traffic first, monitor for 24h before full rollout.

**6. Dry-Run Mode**: Initially log 'would disable X feature' without actually disabling. Tune thresholds based on false-positive rate.

**7. Game Days**: Quarterly exercises where team intentionally triggers load shedding, practices incident response."

---

## 5. Code Examples

### Example 1: Complete Load Shedding System

```typescript
// loadShedding.ts - Production-ready implementation

interface HealthMetrics {
  errorRate: number;
  p95Latency: number;
  requestsPerSecond: number;
  timestamp: number;
}

interface FeatureConfig {
  name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  disableThresholds: {
    errorRate?: number;
    p95Latency?: number;
    requestsPerSecond?: number;
  };
  fallback?: () => React.ReactNode;
}

class LoadSheddingManager {
  private health: HealthMetrics = {
    errorRate: 0,
    p95Latency: 0,
    requestsPerSecond: 0,
    timestamp: Date.now()
  };
  
  private features: Map<string, FeatureConfig> = new Map();
  private listeners: Set<(health: HealthMetrics) => void> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;
  
  registerFeature(config: FeatureConfig) {
    this.features.set(config.name, config);
  }
  
  isFeatureEnabled(featureName: string): boolean {
    const feature = this.features.get(featureName);
    if (!feature || feature.priority === 'CRITICAL') {
      return true; // Critical features never disabled
    }
    
    const { disableThresholds } = feature;
    
    // Check each threshold
    if (disableThresholds.errorRate && 
        this.health.errorRate > disableThresholds.errorRate) {
      this.log('DISABLED', featureName, 'errorRate', this.health.errorRate);
      return false;
    }
    
    if (disableThresholds.p95Latency && 
        this.health.p95Latency > disableThresholds.p95Latency) {
      this.log('DISABLED', featureName, 'p95Latency', this.health.p95Latency);
      return false;
    }
    
    if (disableThresholds.requestsPerSecond && 
        this.health.requestsPerSecond > disableThresholds.requestsPerSecond) {
      this.log('DISABLED', featureName, 'requestsPerSecond', this.health.requestsPerSecond);
      return false;
    }
    
    return true;
  }
  
  async startMonitoring(intervalMs: number = 10000) {
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/health', {
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          throw new Error('Health check failed');
        }
        
        const health: HealthMetrics = await response.json();
        this.updateHealth(health);
      } catch (error) {
        // Health check failed, assume degraded
        this.updateHealth({
          errorRate: 0.5,
          p95Latency: 5000,
          requestsPerSecond: this.health.requestsPerSecond,
          timestamp: Date.now()
        });
      }
    }, intervalMs);
  }
  
  stopMonitoring() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
  
  updateHealth(health: HealthMetrics) {
    this.health = health;
    this.notifyListeners();
    this.sendToMonitoring(health);
  }
  
  subscribe(listener: (health: HealthMetrics) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.health));
  }
  
  private log(action: string, feature: string, metric: string, value: number) {
    console.warn(`[Load Shedding] ${action} ${feature}: ${metric} = ${value}`);
    
    // Send to monitoring (DataDog, Sentry)
    if (typeof window !== 'undefined' && (window as any).datadog) {
      (window as any).datadog.addAction('load_shedding', {
        action,
        feature,
        metric,
        value
      });
    }
  }
  
  private sendToMonitoring(health: HealthMetrics) {
    // Send metrics to monitoring service
    if (typeof window !== 'undefined' && (window as any).datadog) {
      (window as any).datadog.addRumGlobalContext('health', health);
    }
  }
  
  getStatus() {
    const disabledFeatures: string[] = [];
    
    this.features.forEach((config, name) => {
      if (!this.isFeatureEnabled(name)) {
        disabledFeatures.push(name);
      }
    });
    
    return {
      health: this.health,
      disabledFeatures,
      isLoadSheddingActive: disabledFeatures.length > 0
    };
  }
}

// Singleton instance
export const loadSheddingManager = new LoadSheddingManager();

// Register features
loadSheddingManager.registerFeature({
  name: 'recommendations',
  priority: 'MEDIUM',
  disableThresholds: {
    errorRate: 0.05, // 5%
    p95Latency: 2000 // 2s
  },
  fallback: () => <div>Recommendations temporarily unavailable</div>
});

loadSheddingManager.registerFeature({
  name: 'reviews',
  priority: 'HIGH',
  disableThresholds: {
    errorRate: 0.08,
    p95Latency: 3000
  }
});

loadSheddingManager.registerFeature({
  name: 'liveChat',
  priority: 'LOW',
  disableThresholds: {
    errorRate: 0.02,
    p95Latency: 1500
  },
  fallback: () => <div>Chat temporarily unavailable. <a href="/help">View Help</a></div>
});
```

### Example 2: React Integration with Load Shedding

```tsx
// useLoadShedding.ts
import { useState, useEffect } from 'react';
import { loadSheddingManager } from './loadShedding';

export function useLoadShedding() {
  const [health, setHealth] = useState(loadSheddingManager.getStatus().health);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    // Start monitoring
    loadSheddingManager.startMonitoring(10000);
    
    // Subscribe to updates
    const unsubscribe = loadSheddingManager.subscribe((newHealth) => {
      setHealth(newHealth);
      setIsActive(newHealth.errorRate > 0.02); // Any feature disabled
    });
    
    return () => {
      unsubscribe();
      loadSheddingManager.stopMonitoring();
    };
  }, []);
  
  return {
    health,
    isActive,
    isFeatureEnabled: (name: string) => loadSheddingManager.isFeatureEnabled(name),
    getStatus: () => loadSheddingManager.getStatus()
  };
}

// LoadSheddingBanner.tsx
export function LoadSheddingBanner() {
  const { isActive, getStatus } = useLoadShedding();
  
  if (!isActive) return null;
  
  const status = getStatus();
  
  return (
    <div className="banner banner-warning" role="alert">
      <strong>High Traffic Detected:</strong> Some features are temporarily disabled 
      to ensure a smooth experience. ({status.disabledFeatures.join(', ')})
    </div>
  );
}

// ProductPage.tsx
import { useLoadShedding } from './useLoadShedding';

export function ProductPage({ productId }: { productId: string }) {
  const { isFeatureEnabled } = useLoadShedding();
  
  const { data: product } = useQuery(
    ['product', productId],
    () => fetchProduct(productId),
    { priority: 'CRITICAL' } // Never disabled
  );
  
  return (
    <div>
      <LoadSheddingBanner />
      
      {/* Critical: Always rendered */}
      <ProductDetails product={product} />
      <AddToCartButton productId={productId} />
      
      {/* High priority: Disabled at 8% error rate */}
      {isFeatureEnabled('reviews') ? (
        <Suspense fallback={<ReviewsSkeleton />}>
          <Reviews productId={productId} />
        </Suspense>
      ) : (
        <div className="info-box">
          Reviews temporarily unavailable due to high traffic.
        </div>
      )}
      
      {/* Medium priority: Disabled at 5% error rate */}
      {isFeatureEnabled('recommendations') ? (
        <Recommendations productId={productId} />
      ) : null}
      
      {/* Low priority: Disabled at 2% error rate */}
      {isFeatureEnabled('liveChat') && <LiveChatWidget />}
    </div>
  );
}
```

### Example 3: Priority Queue for API Requests

```typescript
// priorityQueue.ts
type Priority = 0 | 1 | 2 | 3; // CRITICAL | HIGH | MEDIUM | LOW

interface QueuedRequest {
  request: Request;
  priority: Priority;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
  retries: number;
  maxRetries: number;
}

class PriorityRequestQueue {
  private queues: QueuedRequest[][] = [[], [], [], []];
  private processing = false;
  private maxConcurrent = 6; // Browser limit
  private currentConcurrent = 0;
  
  async enqueue(
    request: Request, 
    priority: Priority = 2,
    maxRetries: number = 3
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.queues[priority].push({
        request,
        priority,
        resolve,
        reject,
        retries: 0,
        maxRetries
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.processing || this.currentConcurrent >= this.maxConcurrent) {
      return;
    }
    
    this.processing = true;
    
    // Process highest priority queues first
    for (let priority = 0; priority < 4; priority++) {
      while (
        this.queues[priority].length > 0 && 
        this.currentConcurrent < this.maxConcurrent
      ) {
        const item = this.queues[priority].shift()!;
        this.currentConcurrent++;
        
        this.executeRequest(item);
      }
    }
    
    this.processing = false;
  }
  
  private async executeRequest(item: QueuedRequest) {
    try {
      const response = await fetch(item.request);
      
      if (!response.ok && item.retries < item.maxRetries) {
        // Retry with exponential backoff
        item.retries++;
        const delay = Math.min(1000 * 2 ** item.retries, 30000);
        
        setTimeout(() => {
          this.queues[item.priority].unshift(item); // Re-add to front
          this.currentConcurrent--;
          this.process();
        }, delay);
        
        return;
      }
      
      item.resolve(response);
    } catch (error) {
      if (item.retries < item.maxRetries && item.priority === 0) {
        // Only retry CRITICAL requests
        item.retries++;
        this.queues[item.priority].unshift(item);
      } else {
        item.reject(error as Error);
      }
    } finally {
      this.currentConcurrent--;
      this.process();
    }
  }
  
  // Cancel all LOW priority requests during overload
  cancelLowPriority() {
    const cancelled = this.queues[3].length;
    this.queues[3].forEach(item => {
      item.reject(new Error('Request cancelled due to load shedding'));
    });
    this.queues[3] = [];
    
    console.warn(`[Priority Queue] Cancelled ${cancelled} LOW priority requests`);
    return cancelled;
  }
  
  getStats() {
    return {
      queued: this.queues.map(q => q.length),
      processing: this.currentConcurrent
    };
  }
}

export const priorityQueue = new PriorityRequestQueue();

// Usage with fetch wrapper
export async function fetchWithPriority(
  url: string, 
  options: RequestInit & { priority?: Priority } = {}
) {
  const { priority = 2, ...fetchOptions } = options;
  const request = new Request(url, fetchOptions);
  
  return priorityQueue.enqueue(request, priority);
}

// React Query integration
export function usePriorityQuery(key, fetcher, options = {}) {
  const { priority = 2, ...queryOptions } = options;
  
  return useQuery(key, async () => {
    const response = await fetchWithPriority(fetcher.url, { 
      priority,
      ...fetcher.options 
    });
    return response.json();
  }, queryOptions);
}
```

---

## 6. Why & How Summary

### Why It Matters

**Business Impact**:
- **Availability**: 99.99% uptime during traffic spikes (vs complete outage)
- **Revenue Protection**: Maintain checkout flow (lose ads revenue, keep product sales)
- **User Trust**: Transparent degradation ("high traffic") vs mysterious errors
- **Cost**: Avoid emergency infrastructure scaling ($10K → $100K/hour during outage)

**Technical Debt Prevention**:
- Proactive defense prevents cascading failures (frontend → backend → database)
- Graceful degradation maintains brand reputation
- Load shedding data informs capacity planning

### How It Works (Technical Summary)

**1. Classification**: Categorize features by business priority (CRITICAL > HIGH > MEDIUM > LOW)

**2. Monitoring**: Health endpoint polled every 10s, tracking error rate, latency, RPS

**3. Thresholds**: Dynamic disable based on health:
   - 2% error rate → Disable LOW
   - 5% error rate → Disable MEDIUM
   - 8% error rate → Disable HIGH
   - CRITICAL never disabled

**4. Techniques**:
   - **Adaptive Feature Flags**: Dynamically hide components
   - **Aggressive Caching**: Serve stale data (1-5min old acceptable)
   - **Request Coalescing**: Deduplicate redundant API calls
   - **Circuit Breakers**: Stop requests to failing services
   - **Priority Queues**: Process CRITICAL requests first
   - **Client Rate Limiting**: 10-100 req/min per user

**5. User Communication**: Show banner explaining degradation, set expectations

**6. Auto-Recovery**: Re-enable features when health metrics return to normal

**FAANG-Level Expectation**: 
- Maintain core functionality during 10x traffic spikes
- < 5% revenue impact from disabled features
- Automated load shedding without manual intervention
- Full transparency in incident reports (which features disabled, why, for how long)
