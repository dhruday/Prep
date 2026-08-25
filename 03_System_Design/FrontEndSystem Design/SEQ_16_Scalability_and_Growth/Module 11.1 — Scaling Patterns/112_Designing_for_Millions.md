# 112. Designing for Millions

## 1. High-Level Explanation (Frontend Interview Level)

**Designing for millions** refers to architecting frontend applications that can serve millions of concurrent users without degrading performance, availability, or user experience. This encompasses:

- **What**: An architectural approach that distributes load across infrastructure, optimizes asset delivery, implements intelligent caching, gracefully handles failures, and ensures consistent performance regardless of traffic volume
- **Why**: Modern web applications face unpredictable traffic spikes (product launches, viral events, seasonal peaks), global user bases with varying network conditions, and business requirements for 99.9%+ uptime
- **When**: Essential for consumer-facing products (e-commerce, social media, streaming), enterprise SaaS platforms, and any application expecting exponential growth
- **Role**: Forms the foundation of frontend architecture decisions—from bundle splitting and CDN strategy to state management and rendering approaches

At scale, every millisecond of latency, every unnecessary network request, and every inefficient render directly impacts business metrics: conversion rates drop 7% for every 100ms delay (Amazon), user engagement plummets with slow load times.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Architecture Principles for Scale

**1. Horizontal Distribution Over Vertical Scaling**
- **Static Assets**: Distribute via global CDN with edge caching (CloudFlare, Fastly, Akamai)
- **API Layer**: Load balance across multiple regions (ALB, NGINX, Envoy)
- **State Management**: Distribute session data (Redis Cluster, DynamoDB Global Tables)
- **Why**: Single-region infrastructure becomes bottleneck; edge distribution reduces latency from 500ms to 50ms for global users

**2. Progressive Enhancement & Graceful Degradation**
- **Core Functionality First**: Critical path renders without JavaScript (SSR/SSG)
- **Non-Blocking Enhancements**: Analytics, chat widgets, recommendations load async
- **Fallback Strategies**: CDN failures → origin fallback, API errors → cached data, JS errors → static HTML
- **Trade-off**: More complex deployment pipeline vs resilience to partial failures

**3. Intelligent Caching Layers**
```
Browser Cache (immutable assets)
  ↓
Service Worker Cache (offline-first)
  ↓
CDN Edge Cache (POP-level, 1-5min TTL)
  ↓
CDN Shield Cache (regional, 1hr TTL)
  ↓
Application Cache (Redis/Memcached)
  ↓
Database
```

**Cache Invalidation at Scale**:
- **Immutable Assets**: `main.a3f2b1.js` with content hashes—infinite cache, no invalidation
- **Mutable Assets**: `index.html` with `Cache-Control: max-age=0, must-revalidate`
- **Stale-While-Revalidate**: Serve cached while fetching fresh (`s-maxage=60, stale-while-revalidate=3600`)
- **Purge Strategy**: API changes trigger CDN purge of affected routes (< 150ms propagation on Fastly)

**Anti-Pattern**: Setting long cache TTLs on HTML entry points—causes users to load outdated JS bundles leading to version mismatch errors.

**4. Bundle Optimization for Scale**

**Code Splitting Strategy**:
```javascript
// Route-based splitting (baseline)
const Dashboard = lazy(() => import('./Dashboard'));

// Component-level splitting (advanced)
const HeavyChart = lazy(() => import(
  /* webpackChunkName: "charts" */
  /* webpackPrefetch: true */
  './components/HeavyChart'
));

// Vendor splitting (long-term caching)
optimization: {
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10
      },
      common: {
        minChunks: 2,
        priority: 5,
        reuseExistingChunk: true
      }
    }
  }
}
```

**Bundle Size Targets (FAANG Standards)**:
- **Initial JS**: < 200KB (gzipped)—loads in < 2s on 3G
- **Initial CSS**: < 50KB (gzipped)
- **First Route**: < 100KB additional JS
- **Lazy Routes**: < 50KB each
- **Total Budget**: < 1MB for entire app critical path

**Monitoring**: Real User Monitoring (RUM) tracking P95 bundle load times, alerting when thresholds exceeded.

**5. Rendering Strategy by Use Case**

| Pattern | Use Case | Scale Consideration |
|---------|----------|---------------------|
| **SSG** | Marketing pages, docs | Max scalability—serve from CDN edge |
| **SSR** | E-commerce PDPs, personalized feeds | Balance edge caching with personalization |
| **ISR** | Product listings, blog posts | Incremental regeneration avoids full rebuilds |
| **CSR** | Dashboards, admin tools | Minimize server load, maximize interactivity |
| **Streaming SSR** | News feeds, social timelines | Progressive hydration reduces TTI |

**Hybrid Example (Next.js)**:
```javascript
// Product page: SSG with ISR (revalidate every 60s)
export async function getStaticProps() {
  return {
    props: { product: await fetchProduct() },
    revalidate: 60 // ISR
  };
}

// User dashboard: SSR with edge caching
export async function getServerSideProps(context) {
  context.res.setHeader(
    'Cache-Control',
    's-maxage=10, stale-while-revalidate=59'
  );
  return { props: { user: await fetchUser(context.req) } };
}
```

**6. Database & API Scaling Patterns**

**Frontend Impact**:
- **Read Replicas**: Route read-heavy queries to replicas (99% of frontend requests)
- **Materialized Views**: Pre-aggregate data for dashboards (10x faster than live queries)
- **GraphQL Federation**: Distribute graph across services, gateway handles stitching
- **Cursor-Based Pagination**: `after=cursor_xyz` instead of `offset=1000` (O(1) vs O(n))

**Anti-Pattern**: Offset pagination at scale—`OFFSET 1000000` scans 1M rows, takes 5+ seconds.

**7. Global State Distribution**

**Session Management at Scale**:
```javascript
// Anti-pattern: Server-side sessions (memory bottleneck)
// Pattern: Stateless JWT with short expiry + refresh tokens

const TokenManager = {
  access: 'JWT signed, 15min expiry, stored in memory',
  refresh: 'HttpOnly cookie, 7 days, single-use rotation',
  
  // Distributed cache for blacklisting (logout, compromise)
  isBlacklisted: async (jti) => {
    return await redis.get(`blacklist:${jti}`);
  }
};
```

**Feature Flags & Config Distribution**:
```javascript
// Edge workers fetch flags from KV store (1ms lookup)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const flags = await FEATURE_FLAGS.get('global', 'json');
  const userId = getUserId(request);
  
  // Consistent hashing for A/B tests
  const variant = consistentHash(userId, flags.experimentSeed) % 100;
  
  return new Response(html, {
    headers: {
      'X-Experiment-Variant': variant < 50 ? 'A' : 'B'
    }
  });
}
```

**8. Failure Scenarios & Mitigation**

**Thundering Herd Prevention**:
```javascript
// Stagger cache expiry with jitter
const cacheKey = `user:${userId}`;
const ttl = 3600 + Math.random() * 600; // 60-70min, not exactly 60min

// Request coalescing (deduplication)
class RequestCache {
  pending = new Map();
  
  async fetch(key, fetcher) {
    if (this.pending.has(key)) {
      return this.pending.get(key); // Return in-flight promise
    }
    
    const promise = fetcher();
    this.pending.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pending.delete(key);
    }
  }
}
```

**Circuit Breaker for API Dependencies**:
```javascript
class CircuitBreaker {
  state = 'CLOSED'; // CLOSED → OPEN → HALF_OPEN
  failures = 0;
  threshold = 5;
  timeout = 60000; // 1min
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker OPEN');
      }
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
    if (this.state === 'HALF_OPEN') this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }
}
```

**9. Performance Monitoring at Scale**

**Key Metrics (Real User Monitoring)**:
- **LCP (Largest Contentful Paint)**: < 2.5s (75th percentile)
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3.5s on mobile
- **Custom**: API latency P95, error rate, cache hit ratio

**Sampling Strategy**:
```javascript
// 100% error sampling, 1% success sampling (cost optimization)
const sampleRate = response.ok ? 0.01 : 1.0;

if (Math.random() < sampleRate) {
  analytics.track('api.request', {
    duration: performance.now() - startTime,
    status: response.status,
    endpoint: url.pathname
  });
}
```

**10. Deployment Strategy**

**Blue-Green with Canary**:
```
1. Deploy v2 to 5% of traffic (canary)
2. Monitor error rates for 10min
3. If stable → 25% → 50% → 100% (30min total)
4. If errors spike → instant rollback to v1
```

**Feature Flags for Decoupling**:
```javascript
// Deploy code disabled, enable progressively
if (featureFlags.newCheckoutFlow && userSegment === 'beta') {
  return <NewCheckout />;
}
return <LegacyCheckout />;
```

**What NOT to Do**:
- ❌ Big bang deploys on Fridays
- ❌ Cache TTLs > 5min on HTML
- ❌ Synchronous third-party scripts blocking render
- ❌ No monitoring until production issues occur
- ❌ Over-fetching data (N+1 queries in components)

---

## 3. Clear Real-World Examples

### Example 1: Amazon Product Page (100M+ Daily Users)

**Architecture**:
```
User Request → Route53 → CloudFront Edge (200+ POPs)
  ↓
- Cache HIT (90%): Serve HTML from edge (< 50ms)
- Cache MISS: Fetch from S3 origin (SSG)
  ↓
HTML includes:
- Critical CSS inlined (< 14KB for first packet)
- Preload product image
- Defer recommendations, reviews (lazy)
  ↓
API Calls (CSR):
- /api/cart → ALB → ECS (multi-region)
- /api/recommendations → GraphQL gateway → microservices
```

**Key Optimizations**:
- **Image CDN**: Auto-format WebP/AVIF, responsive srcset, lazy load below fold
- **Inline Critical Data**: Product name, price, availability in HTML (no API waterfall)
- **Predictive Prefetch**: Hover on "Add to Cart" → prefetch checkout route
- **Graceful Degradation**: Recommendations fail → show bestsellers from cache

**Scale Numbers**:
- 500K RPS during Prime Day
- < 50ms P50 latency globally
- 99.99% availability SLA

### Example 2: Netflix Browse Experience (200M+ Subscribers)

**Rendering Strategy**:
```javascript
// Server-side render initial viewport (6 rows)
export async function getServerSideProps(context) {
  const [hero, trending, popular] = await Promise.all([
    fetchHeroVideo(context.userId),
    fetchTrending({ limit: 20 }),
    fetchPopular({ limit: 20 })
  ]);
  
  context.res.setHeader(
    'Cache-Control',
    'private, s-maxage=30, stale-while-revalidate=300'
  );
  
  return { props: { hero, trending, popular } };
}

// Client-side: Infinite scroll + virtualization
function BrowsePage({ hero, trending, popular }) {
  const rows = useInfiniteScroll(
    async (page) => fetchMoreRows(page),
    { initialData: [trending, popular] }
  );
  
  return (
    <>
      <Hero video={hero} />
      <VirtualizedRows rows={rows} /> {/* react-window */}
    </>
  );
}
```

**Scale Optimizations**:
- **Adaptive Bitrate**: Stream quality adjusts to network (4K → 720p gracefully)
- **Predictive Caching**: Pre-cache first 30s of hovered videos
- **Personalization Edge**: A/B test title artwork at CDN edge (no origin call)
- **Thumbnail Generation**: 10 keyframes per video, served from Akamai

### Example 3: Slack Workspace Scaling (10M+ Daily Active Users)

**Architecture Considerations**:
```
Small Workspace (< 100 users):
- WebSocket connection to single region
- Full message history loaded on mount
- Simple Redux store

Medium Workspace (100-10K users):
- Regional WebSocket clusters (sticky sessions)
- Paginated message history (50 at a time)
- Normalized state (messages by channel ID)

Enterprise Workspace (10K+ users):
- Multi-region with edge routing (lowest latency)
- Virtualized message list (react-window)
- IndexedDB for offline persistence
- GraphQL subscriptions for real-time
```

**Code Evolution**:
```javascript
// Small workspace: Load all channels
const channels = await fetchChannels();

// Medium workspace: Load recent + lazy load rest
const recentChannels = await fetchChannels({ limit: 50 });

// Enterprise: Infinite scroll channels + search
const { data, fetchMore } = useInfiniteQuery(
  'channels',
  ({ pageParam = 0 }) => fetchChannels({ offset: pageParam, limit: 50 }),
  { getNextPageParam: (lastPage) => lastPage.nextOffset }
);
```

**Critical Metric**: Time from click to first message render < 500ms (P95).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you design a frontend application to serve 10 million daily active users?"

**Answer**:

"I'd approach this in three layers: **asset delivery, runtime performance, and observability**.

**Asset Delivery**:  
First, I'd implement a CDN-first architecture with CloudFront or Fastly. All static assets—JS bundles, CSS, images—have content hashes (`main.a3f2b1.js`) and infinite cache headers, served from 200+ edge locations globally. HTML entry points have `max-age=0` with `stale-while-revalidate` to ensure users get the latest version while maintaining high cache hit ratios.

For rendering strategy, I'd use **SSG for marketing pages**, **ISR for product catalogs** (revalidate every 60s), and **SSR with edge caching for personalized feeds** (`s-maxage=10, stale-while-revalidate=59`). This balances performance with freshness.

**Bundle optimization** is critical: I'd target < 200KB initial JS (gzipped) via code splitting—route-based splitting at minimum, vendor chunks for long-term caching, and component-level splitting for heavy features like charts. We'd use webpack's `splitChunks` to extract common code across routes.

**Runtime Performance**:  
For data fetching, I'd implement **request coalescing**—if 10 components need the same user data, deduplicate to a single API call. Use React Query or SWR for automatic caching and revalidation. For lists, virtualization with `react-window` to handle 10K+ items without DOM bloat.

State management depends on scale: small apps can use Context, but at 10M users I'd use Redux Toolkit or Zustand with normalized state to prevent unnecessary re-renders. For real-time features, WebSockets with exponential backoff and circuit breakers to handle reconnections gracefully.

**Observability**:  
Deploy Real User Monitoring tracking Core Web Vitals—LCP < 2.5s, FID < 100ms, CLS < 0.1. Sample 100% of errors, 1% of successes for cost efficiency. Alert on P95 latency regressions.

For deployment, I'd use **blue-green with canary**: deploy to 5% traffic, monitor error rates for 10min, then progressively roll to 100%. Feature flags let us decouple deploys from releases.

**Trade-offs**:  
More caching layers add complexity—cache invalidation is hard. CDN adds cost but reduces origin load by 90%+. SSR increases server costs but improves SEO and TTI. At this scale, every architectural decision is about balancing cost, complexity, and performance."

### Follow-Up Questions

**Q1**: "How do you handle cache invalidation when you deploy a new version?"

**A**: "Immutable assets solve this—`main.a3f2b1.js` never changes, new deploy creates `main.d7e9f2.js`. The HTML entry point references the new hash. Since HTML has `max-age=0`, users fetch fresh HTML on next page load, which pulls the latest hashed assets. For SPAs, we'd detect version mismatch (check `/api/version` on focus/visibility change) and prompt users to refresh."

**Q2**: "What if your API goes down during high traffic?"

**A**: "Multi-layered fallbacks: (1) **Stale-while-revalidate** serves cached data while retrying, (2) **Circuit breaker** stops requests after 5 consecutive failures to prevent cascading failures, (3) **Error boundaries** catch errors and render fallback UI with cached data if available, (4) **Graceful degradation**—core features work, nice-to-haves fail silently. For critical APIs like auth, have multi-region failover with health checks."

**Q3**: "How do you prevent a thundering herd when cache expires?"

**A**: "(1) **Jitter cache TTLs**—instead of 60min exactly, use 60-70min randomized, (2) **Stale-while-revalidate**—serve stale while fetching fresh asynchronously, (3) **Request coalescing**—if 1000 requests hit simultaneously, deduplicate to 1 backend call, (4) **Probabilistic early expiration**—start revalidating before expiry based on TTL percentage."

---

## 5. Code Examples

### Example 1: Scalable App Shell with Progressive Enhancement

```javascript
// pages/_app.tsx (Next.js)
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ErrorBoundary } from 'react-error-boundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1min
      cacheTime: 300_000, // 5min
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Avoid unnecessary refetches
    },
  },
});

function MyApp({ Component, pageProps }) {
  // Detect version mismatch (new deploy while user on site)
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version');
        const { version } = await res.json();
        
        if (version !== process.env.NEXT_PUBLIC_VERSION) {
          if (confirm('New version available. Refresh to update?')) {
            window.location.reload();
          }
        }
      } catch (error) {
        // Silently fail—not critical
      }
    };
    
    // Check on focus (user returns to tab)
    window.addEventListener('focus', checkVersion);
    return () => window.removeEventListener('focus', checkVersion);
  }, []);
  
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Send to monitoring (Sentry, Datadog)
        console.error('App Error:', error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <h1>Something went wrong</h1>
      <pre>{error.message}</pre>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  );
}
```

**Why This Works at Scale**:
- **React Query** deduplicates requests, caches responses, handles retries with exponential backoff
- **Error Boundary** prevents entire app crash, logs errors for monitoring
- **Version Check** ensures users on latest code without forcing refresh
- **Retry Strategy**: `min(1000 * 2^attempt, 30000)` = 1s, 2s, 4s, 8s, 16s, 30s cap

### Example 2: Intelligent Bundle Loading with Prefetch

```javascript
// components/RouteLink.tsx
import { useEffect, useRef } from 'react';
import Link from 'next/link';

function RouteLink({ href, children, prefetch = 'hover' }) {
  const linkRef = useRef(null);
  
  useEffect(() => {
    if (prefetch === 'hover' && linkRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Prefetch when link enters viewport
              const link = entry.target as HTMLAnchorElement;
              link.dispatchEvent(new MouseEvent('mouseenter'));
            }
          });
        },
        { rootMargin: '50px' } // Start prefetch 50px before visible
      );
      
      observer.observe(linkRef.current);
      return () => observer.disconnect();
    }
  }, [prefetch]);
  
  return (
    <Link href={href} prefetch={false}>
      <a ref={linkRef}>{children}</a>
    </Link>
  );
}

// Predictive prefetch on hover
function PredictiveLink({ href, children }) {
  const [prefetchTriggered, setPrefetchTriggered] = useState(false);
  
  const handleMouseEnter = () => {
    if (!prefetchTriggered) {
      setPrefetchTriggered(true);
      // Prefetch route bundle
      import(`../pages${href}`);
    }
  };
  
  return (
    <Link href={href} prefetch={false}>
      <a onMouseEnter={handleMouseEnter}>{children}</a>
    </Link>
  );
}
```

**Performance Impact**:
- **Intersection Observer**: Prefetches routes before user clicks (200-300ms faster navigation)
- **Hover Prefetch**: Loads bundle during hover delay (~200ms before click)
- **Selective**: Only prefetch critical routes to avoid wasting bandwidth

### Example 3: Request Deduplication & Coalescing

```javascript
// lib/dedupeCache.ts
class RequestDeduplicator {
  private cache = new Map<string, Promise<any>>();
  private results = new Map<string, { data: any; timestamp: number }>();
  
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5000 // 5s cache
  ): Promise<T> {
    // Return cached result if fresh
    const cached = this.results.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    // Return in-flight request if exists
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    // Create new request
    const promise = fetcher()
      .then((data) => {
        this.results.set(key, { data, timestamp: Date.now() });
        this.cache.delete(key);
        return data;
      })
      .catch((error) => {
        this.cache.delete(key);
        throw error;
      });
    
    this.cache.set(key, promise);
    return promise;
  }
  
  clear(keyPattern?: RegExp) {
    if (!keyPattern) {
      this.cache.clear();
      this.results.clear();
    } else {
      for (const key of this.cache.keys()) {
        if (keyPattern.test(key)) {
          this.cache.delete(key);
          this.results.delete(key);
        }
      }
    }
  }
}

export const dedupeCache = new RequestDeduplicator();

// Usage in component
function UserProfile({ userId }) {
  const { data, error } = useQuery(
    ['user', userId],
    () => dedupeCache.fetch(
      `user:${userId}`,
      () => fetch(`/api/users/${userId}`).then(r => r.json())
    )
  );
  
  // Even if 100 UserProfile components render,
  // only 1 API call is made (deduplicated)
}
```

**Scale Impact**:
- **100 components** needing user data → **1 API call** (99% reduction)
- **Short TTL** (5s) prevents stale data while reducing redundant calls
- **Pattern-based invalidation**: `clear(/user:.*/)` on user update

### Example 4: Adaptive Image Loading

```javascript
// components/AdaptiveImage.tsx
import { useState, useEffect, useRef } from 'react';

interface AdaptiveImageProps {
  src: string;
  alt: string;
  priority?: boolean;
}

function AdaptiveImage({ src, alt, priority = false }: AdaptiveImageProps) {
  const [imageSrc, setImageSrc] = useState<string>();
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    // Detect effective connection type
    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType || '4g';
    
    // Adjust image quality based on network
    const quality = {
      'slow-2g': 'q_30',
      '2g': 'q_40',
      '3g': 'q_60',
      '4g': 'q_80'
    }[effectiveType] || 'q_80';
    
    // Build Cloudinary URL with transformations
    const optimizedSrc = src.replace(
      '/upload/',
      `/upload/${quality},f_auto,w_${imgRef.current?.clientWidth || 800}/`
    );
    
    setImageSrc(optimizedSrc);
  }, [src]);
  
  // Lazy load if not priority
  if (!priority) {
    return (
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    );
  }
  
  // Priority: preload & eager load
  return (
    <>
      <link rel="preload" as="image" href={imageSrc} />
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        loading="eager"
        decoding="sync"
        fetchpriority="high"
      />
    </>
  );
}
```

**Bandwidth Savings**:
- **4G**: 80% quality, ~200KB
- **3G**: 60% quality, ~120KB (40% reduction)
- **2G**: 30% quality, ~50KB (75% reduction)
- **Auto Format**: WebP/AVIF saves 30-50% vs JPEG

---

## 6. Why & How Summary

### Why It Matters

**Business Impact**:
- **Revenue**: 100ms faster load = 1% conversion increase (Walmart)
- **Engagement**: 1s delay = 11% fewer page views (BBC)
- **Retention**: 53% of mobile users abandon sites > 3s load (Google)
- **Cost**: CDN caching reduces origin traffic by 90%+ ($100K → $10K/month)

**Technical Debt Prevention**:
- Architecting for scale upfront avoids costly rewrites
- Performance budgets prevent gradual degradation
- Monitoring catches regressions before users churn

### How It Works (Technical Summary)

1. **Distribute Assets**: CDN edge caching (200+ POPs) → < 50ms TTFB globally
2. **Optimize Bundles**: Code splitting, tree shaking, compression → < 200KB initial load
3. **Cache Intelligently**: Immutable assets (infinite cache) + HTML (no cache) + API (stale-while-revalidate)
4. **Render Strategically**: SSG for static, ISR for semi-dynamic, SSR for personalized
5. **Handle Failures**: Circuit breakers, error boundaries, graceful degradation
6. **Monitor Continuously**: RUM tracking Core Web Vitals, alerting on P95 regressions
7. **Deploy Safely**: Blue-green + canary, feature flags for decoupling

**Key Formula**:
```
User Experience = f(Asset Delivery, Runtime Performance, Failure Handling)

Where:
- Asset Delivery = CDN Hit Rate × Edge Latency
- Runtime Performance = Initial Load Time + Interaction Latency
- Failure Handling = Availability × Graceful Degradation
```

**FAANG-Level Expectation**: Design systems that maintain < 2.5s LCP and < 100ms FID for P95 users globally, with 99.9%+ availability and < 0.1% error rate.
