# 113. CDN-First Architecture

## 1. High-Level Explanation (Frontend Interview Level)

**CDN-First Architecture** is a design philosophy where the Content Delivery Network (CDN) is treated as the primary infrastructure layer for serving frontend applications, not just a caching layer. In this model:

- **What**: Every request flows through CDN edge servers (200-300 globally distributed Points of Presence) that handle caching, routing, security, personalization, and compute—origin servers become fallback, not primary
- **Why**: Reduce latency from 500ms→50ms globally, offload 90%+ traffic from origin, enable edge compute for personalization, improve reliability through geographic distribution
- **When**: Essential for global consumer applications (e-commerce, media, SaaS), B2C platforms with unpredictable traffic, and mobile-first experiences where every millisecond matters
- **Role**: CDN becomes intelligent edge layer handling: static asset delivery, dynamic content caching, API gateway functions, A/B testing, bot mitigation, DDoS protection

Traditional approach treats CDN as "dumb cache"—fetch from origin, cache for X seconds. CDN-first treats edge as **smart compute layer** with Workers/Functions executing logic closest to users.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Core Principles of CDN-First Architecture

**1. Edge-First Request Flow**

```
User Request (London)
  ↓
CDN Edge (London POP) — 10ms latency
  ↓
Decision Tree:
├─ Static Asset? → Serve from edge cache (cache HIT: 95%)
├─ Personalized? → Execute edge function (50ms)
├─ Dynamic API? → Proxy with edge caching (100ms)
└─ Cache MISS? → Origin (Ohio) — 150ms latency
```

**Key Insight**: 95% of requests never hit origin. Edge serves cached responses in < 50ms vs 150ms+ origin roundtrip.

**2. Cache Strategy by Content Type**

| Content Type | Cache Strategy | TTL | Invalidation |
|--------------|----------------|-----|--------------|
| **HTML (entry)** | `max-age=0, s-maxage=60, stale-while-revalidate=300` | 1min edge, serve stale during revalidation | On deploy (API purge) |
| **JS/CSS bundles** | `public, max-age=31536000, immutable` | 1 year | Content hash in filename |
| **Images** | `public, max-age=2592000` | 30 days | Versioned URLs |
| **API responses** | `private, s-maxage=10, stale-while-revalidate=60` | 10s edge, 1min stale | Event-driven purge |
| **User data** | `private, no-cache` | Validate every time | N/A |

**Stale-While-Revalidate Pattern**:
```http
Cache-Control: s-maxage=60, stale-while-revalidate=300

Timeline:
0-60s:     Fresh → serve from cache
60-360s:   Stale → serve from cache + async revalidate in background
>360s:     Expired → fetch fresh from origin
```

**Why This Works**: Users get instant responses (even if slightly stale), origin sees smooth traffic (no thundering herd).

**3. Edge Compute Capabilities**

**Cloudflare Workers Example**:
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // 1. Bot detection (< 1ms)
  const isBot = /bot|crawler|spider/i.test(request.headers.get('User-Agent'));
  if (isBot && url.pathname.startsWith('/api/')) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // 2. A/B testing at edge (< 1ms)
  const userId = getCookie(request, 'user_id');
  const variant = hashCode(userId) % 100 < 50 ? 'A' : 'B';
  
  // 3. Personalization (fetch from KV store: 1-5ms)
  const userPrefs = await USER_PREFS.get(userId, 'json');
  
  // 4. Fetch from cache or origin
  const cacheKey = `${url.pathname}?variant=${variant}`;
  let response = await caches.default.match(cacheKey);
  
  if (!response) {
    response = await fetch(request);
    
    // Clone and cache if cacheable
    if (response.ok && request.method === 'GET') {
      const clone = response.clone();
      event.waitUntil(caches.default.put(cacheKey, clone));
    }
  }
  
  // 5. Add custom headers
  response = new Response(response.body, response);
  response.headers.set('X-Variant', variant);
  response.headers.set('X-Cache-Status', response.headers.get('CF-Cache-Status'));
  
  return response;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

**Edge Compute Use Cases**:
- **A/B Testing**: Route users to variants without origin call
- **Personalization**: Inject user-specific data from KV store
- **API Composition**: Aggregate multiple backend calls at edge
- **Authentication**: Verify JWTs at edge, block unauthorized requests
- **Rate Limiting**: Token bucket algorithm at edge (prevent backend DDoS)
- **Image Optimization**: Auto-format WebP/AVIF, resize, compress

**Performance**: Edge compute adds 1-10ms latency vs 100-500ms origin roundtrip.

**4. Multi-Tier Caching Architecture**

```
Browser Cache (5min TTL, 10MB limit)
  ↓
Service Worker Cache (offline-first, 50MB)
  ↓
CDN Edge Cache (POP-level: 200+ locations, 1-5min TTL)
  ↓
CDN Shield Cache (regional: 10-20 locations, 1hr TTL)
  ↓
Origin Server (with Redis/Memcached)
  ↓
Database
```

**Shield Caching** (Cloudflare Argo, Fastly Shielding):
- Reduces origin requests by 95%+ even on cache misses
- Edge POP → Regional Shield → Origin (instead of 200 POPs hitting origin)
- **Example**: 200 edge misses → 1 shield request → 1 origin request

**Anti-Pattern**: Every edge miss hits origin directly → thundering herd, origin overload.

**5. Cache Invalidation Strategies**

**Immediate Purge (Deploy)**:
```javascript
// On deploy, purge specific paths
await fetch('https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CF_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    files: [
      'https://example.com/',
      'https://example.com/index.html',
      'https://example.com/products'
    ]
  })
});
```

**Propagation Time**: < 150ms globally (Fastly), 2-5s (CloudFront).

**Event-Driven Purge (Content Update)**:
```javascript
// When product updated, purge related caches
async function onProductUpdate(productId) {
  await Promise.all([
    purgeCDN(`/api/products/${productId}`),
    purgeCDN(`/products/${productId}`),
    purgeCDN(`/products?category=${product.category}`)
  ]);
}
```

**Tag-Based Purge** (Fastly Surrogate Keys):
```http
Surrogate-Key: product-123 category-shoes homepage

# Purge all product-123 responses across all URLs
curl -X PURGE https://api.fastly.com/service/{service}/purge/product-123
```

**What NOT to Do**:
- ❌ Purge entire cache on every deploy (defeats caching benefits)
- ❌ Set TTL too high on mutable content (users see stale data for hours)
- ❌ No versioning on HTML entry points (version mismatch errors)

**6. Geographic Routing & Failover**

**Latency-Based Routing**:
```
User in Tokyo → Tokyo POP (10ms)
User in Berlin → Frankfurt POP (15ms)
User in NYC → NYC POP (8ms)
```

**Health-Check Failover**:
```javascript
// CDN configuration
const origins = [
  { url: 'us-east-1.example.com', healthy: true },
  { url: 'us-west-2.example.com', healthy: true },
  { url: 'eu-west-1.example.com', healthy: false } // Health check failed
];

function selectOrigin(userLocation) {
  const healthy = origins.filter(o => o.healthy);
  
  // Route to closest healthy origin
  return healthy.reduce((closest, origin) => {
    const distance = calculateDistance(userLocation, origin.location);
    return distance < closest.distance ? { origin, distance } : closest;
  }, { origin: healthy[0], distance: Infinity }).origin;
}
```

**Failover Strategy**:
```
Primary Origin (us-east-1) fails
  ↓
Health check detects failure (< 10s)
  ↓
CDN routes to Secondary (us-west-2)
  ↓
Users experience 0 downtime (transparent failover)
```

**7. Security at the Edge**

**DDoS Mitigation**:
- **Challenge-Response**: Suspicious traffic gets JavaScript challenge (bots fail)
- **Rate Limiting**: 100 req/min per IP at edge (before origin)
- **IP Reputation**: Block known malicious IPs at edge

**WAF Rules at Edge**:
```javascript
// Cloudflare WAF rule
if (request.headers.get('Content-Type') === 'application/json' && 
    !isValidJSON(request.body)) {
  return new Response('Invalid JSON', { status: 400 });
}

// Block SQL injection patterns
if (/(\bUNION\b|\bSELECT\b.*\bFROM\b)/i.test(request.url)) {
  return new Response('Forbidden', { status: 403 });
}
```

**TLS Termination at Edge**:
- TLS handshake happens at edge (10ms) vs origin (150ms)
- HTTP/2 & HTTP/3 enabled at edge (multiplexing, 0-RTT)

**8. Performance Monitoring**

**CDN Metrics to Track**:
```javascript
{
  cacheHitRatio: 0.94,        // 94% requests served from cache
  edgeLatencyP50: 25,         // 25ms median edge response
  edgeLatencyP95: 80,         // 95th percentile
  originRequests: 50000,      // 5% of total (1M requests)
  bandwidth: '10TB',          // Monthly
  invalidationTime: 120,      // ms to propagate purge
  edgeErrors: 0.001           // 0.1% error rate
}
```

**Alerting Thresholds**:
- Cache hit ratio < 90% → investigate cache config
- P95 latency > 150ms → edge performance degraded
- Origin requests > 10% of total → cache misses too high
- Error rate > 0.5% → origin issues or edge misconfig

**9. Cost Optimization**

**Bandwidth Tiers** (Cloudflare):
```
0-10TB:   $0.08/GB
10-50TB:  $0.06/GB
50-100TB: $0.04/GB
>100TB:   $0.02/GB
```

**Cost Savings**:
```
Without CDN:
- Origin bandwidth: 100TB/month × $0.12/GB = $12,000
- Origin servers: 20 instances × $200/month = $4,000
Total: $16,000/month

With CDN:
- CDN bandwidth: 100TB × $0.04/GB = $4,000
- Origin bandwidth: 5TB (5% cache miss) × $0.12/GB = $600
- Origin servers: 2 instances × $200/month = $400
Total: $5,000/month

Savings: 68% reduction
```

**Optimization Strategies**:
- **Tiered Caching**: Shield reduces origin requests by 95%
- **Smart Compression**: Brotli-11 on static assets (20-30% smaller than gzip)
- **Image Optimization**: Auto-format WebP/AVIF saves 50% bandwidth
- **Edge Compute**: Replace origin API calls with edge functions (cheaper)

**10. Migration Strategy**

**Phase 1: Static Assets Only (Week 1)**
```
Route53 → CDN (static assets: *.js, *.css, *.png)
       ↘ Origin (HTML, API)
```

**Phase 2: HTML with Edge Caching (Week 2-3)**
```
Route53 → CDN (all frontend traffic)
       → Origin (API only)
```

**Phase 3: Edge Functions (Week 4+)**
```
CDN Edge Workers (A/B testing, personalization)
  ↓
CDN Cache (HTML, static assets)
  ↓
Origin (API, database)
```

**Rollback Plan**: DNS TTL = 60s allows quick failover to origin.

---

## 3. Clear Real-World Examples

### Example 1: Vercel Edge Network (Next.js Deployments)

**Architecture**:
```javascript
// next.config.js
module.exports = {
  // Automatic edge caching with ISR
  async headers() {
    return [
      {
        source: '/products/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
};

// pages/products/[slug].tsx
export async function getStaticProps({ params }) {
  const product = await fetchProduct(params.slug);
  
  return {
    props: { product },
    revalidate: 60, // ISR: regenerate every 60s
  };
}
```

**Edge Middleware**:
```javascript
// middleware.ts (runs at edge)
import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // A/B test at edge
  const variant = Math.random() < 0.5 ? 'A' : 'B';
  
  // Rewrite to variant-specific page
  if (pathname === '/pricing') {
    return NextResponse.rewrite(`/pricing-${variant}`);
  }
  
  // Add custom header
  const response = NextResponse.next();
  response.headers.set('X-Variant', variant);
  return response;
}
```

**Performance Results**:
- **Global TTFB**: < 50ms P50, < 150ms P95
- **Cache Hit Ratio**: 92%
- **Origin Requests**: 8% of total traffic
- **Cost**: $0.40/GB (includes edge compute)

### Example 2: Shopify Oxygen (Hydrogen Framework)

**Edge-First Rendering**:
```javascript
// Hydrogen storefront running on Cloudflare Workers
export default function Product({ params }) {
  // Fetch from Shopify Storefront API at edge
  const { data } = useShopQuery({
    query: PRODUCT_QUERY,
    variables: { handle: params.handle },
    cache: CacheLong() // 1hr cache at edge
  });
  
  return <ProductDetails product={data.product} />;
}

// Cache strategies
export function CacheLong() {
  return {
    mode: 'public',
    maxAge: 3600,        // Browser: 1hr
    staleWhileRevalidate: 82800, // 23hrs stale
  };
}
```

**Edge Performance**:
```
Traditional Shopify Store (Origin Rendering):
- TTFB: 600ms (origin in Toronto)
- LCP: 2.8s

Hydrogen Store (Edge Rendering):
- TTFB: 80ms (edge in user's region)
- LCP: 1.2s (56% improvement)
```

**Key Optimization**: GraphQL API calls happen at edge, reducing user-perceived latency by 500ms+.

### Example 3: Netflix Edge Engineering

**Multi-CDN Strategy**:
```javascript
// Intelligent CDN selection based on real-time performance
const cdnProviders = [
  { name: 'Akamai', latency: 45, availability: 0.999 },
  { name: 'Fastly', latency: 38, availability: 0.998 },
  { name: 'Cloudflare', latency: 52, availability: 0.997 }
];

function selectBestCDN(userLocation) {
  // Weighted scoring: latency (70%) + availability (30%)
  const scores = cdnProviders.map(cdn => ({
    name: cdn.name,
    score: (1 / cdn.latency) * 0.7 + cdn.availability * 0.3
  }));
  
  return scores.sort((a, b) => b.score - a.score)[0].name;
}
```

**Adaptive Bitrate at Edge**:
```javascript
// Edge worker detects connection quality
addEventListener('fetch', event => {
  event.respondWith(handleVideoRequest(event.request));
});

async function handleVideoRequest(request) {
  const quality = detectQuality(request);
  
  // Serve pre-transcoded video from edge cache
  const videoUrl = `/videos/${videoId}/${quality}.mp4`;
  const cached = await caches.default.match(videoUrl);
  
  if (cached) {
    return cached; // Cache HIT: < 10ms
  }
  
  // Fetch from origin storage (S3)
  const response = await fetch(videoUrl);
  event.waitUntil(caches.default.put(videoUrl, response.clone()));
  
  return response;
}

function detectQuality(request) {
  const bandwidth = request.headers.get('Downlink'); // Network Info API
  if (bandwidth > 10) return '4k';
  if (bandwidth > 5) return '1080p';
  if (bandwidth > 2) return '720p';
  return '480p';
}
```

**Scale Numbers**:
- **200M+ subscribers** globally
- **15% of global internet traffic**
- **95% served from CDN** edge cache
- **< 10ms latency** for 90% of video starts

### Example 4: Cloudflare Pages (JAMstack Hosting)

**Automatic Edge Optimization**:
```javascript
// Build output
dist/
├── index.html           → s-maxage=0 (always fresh)
├── _next/static/
│   ├── chunks/
│   │   └── main.abc123.js  → max-age=31536000 (1 year, immutable)
│   └── css/
│       └── styles.def456.css → max-age=31536000
└── images/
    └── hero.png        → max-age=2592000 (30 days)
```

**Edge Functions for API Routes**:
```javascript
// functions/api/products.ts
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const productId = url.searchParams.get('id');
  
  // Check edge KV cache first (< 1ms)
  const cached = await env.PRODUCTS.get(productId);
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'X-Cache': 'HIT'
      }
    });
  }
  
  // Fetch from origin database
  const product = await fetchFromDB(productId, env);
  
  // Store in KV for next request
  await env.PRODUCTS.put(productId, JSON.stringify(product), {
    expirationTtl: 300 // 5min
  });
  
  return new Response(JSON.stringify(product), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
      'X-Cache': 'MISS'
    }
  });
}
```

**Performance**:
- **Cold start**: 0ms (unlike Lambda's 100-500ms)
- **Execution time**: 1-5ms for KV lookup
- **Global latency**: < 50ms P95

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you architect a frontend application to leverage CDN effectively?"

**Answer**:

"I'd design a **CDN-first architecture** where the CDN is the primary infrastructure layer, not just caching. Here's my approach:

**Cache Strategy**:  
First, I'd categorize content by mutability. **Static assets** (JS, CSS, images) get content hashes—`main.a3f2b1.js`—with `max-age=31536000, immutable`, cached for a year. **HTML entry points** get `max-age=0, s-maxage=60, stale-while-revalidate=300`—browsers always revalidate, but edge serves cached copies for 60s and stale copies during revalidation. **API responses** use `s-maxage=10, stale-while-revalidate=60` for near-real-time data.

This strategy ensures: (1) Users always get latest HTML, (2) Static assets cached infinitely, (3) Edge reduces origin load by 95%.

**Multi-Tier Caching**:  
I'd implement **shield caching** (Cloudflare Argo, Fastly Shielding) where edge POPs fetch from regional shields instead of origin. This reduces: 200 edge cache misses → 1 shield request → 1 origin request. Origin sees 95% fewer requests even during cache misses.

**Edge Compute**:  
Move logic to the edge with Workers/Functions for:
- **A/B Testing**: Route users to variants without origin call—consistent hashing based on user ID ensures stable assignment
- **Personalization**: Fetch user preferences from KV store (1-5ms) and inject into HTML at edge
- **Security**: Validate JWTs, rate limiting (token bucket), bot detection—all at edge before origin
- **API Composition**: Aggregate multiple backend calls at edge, reducing client latency

**Cache Invalidation**:  
On deploy, purge specific paths via CDN API—propagates globally in < 150ms (Fastly) or 2-5s (CloudFront). For content updates, use **event-driven purging**: when product updated → purge `/api/products/${id}` and related pages. Use **tag-based purging** (Fastly Surrogate Keys) to purge all URLs tagged with `product-123` in one API call.

**Geographic Routing**:  
Configure health checks on origin regions. If `us-east-1` fails, CDN automatically routes to `us-west-2`—users experience zero downtime. Latency-based routing sends Tokyo users to Tokyo POP (10ms) instead of Ohio origin (200ms).

**Monitoring**:  
Track: (1) **Cache hit ratio** (target > 90%), (2) **Edge latency P95** (< 150ms), (3) **Origin requests** (< 10% of total), (4) **Invalidation propagation time**. Alert if metrics degrade.

**Trade-offs**:  
CDN adds complexity—debugging is harder (is issue at edge or origin?). Costs scale with bandwidth, though offset by reduced origin infrastructure. Stale content is possible during revalidation—acceptable for most use cases, not for real-time trading platforms.

**Migration Strategy**:  
Start with static assets only → add HTML with edge caching → introduce edge functions. Keep DNS TTL low (60s) for quick rollback if issues arise."

### Follow-Up Questions

**Q1**: "How do you handle cache invalidation when multiple microservices update related data?"

**A**: "Use **tag-based purging** with Surrogate Keys. Each response includes tags for related entities:
```http
Surrogate-Key: product-123 category-shoes brand-nike user-segment-premium
```
When any microservice updates product 123, it calls: `PURGE /tag/product-123`, purging all cached responses tagged with that product. This decouples cache invalidation from URL knowledge—services emit events, CDN layer handles purging logic. For cross-service coordination, use event bus (SNS, EventBridge) where services publish 'product.updated' events, and cache invalidation service subscribes and purges tags."

**Q2**: "What if edge compute introduces bugs? How do you deploy safely?"

**A**: "Progressive rollout with **edge canary deployments**:
1. Deploy edge function to 1% of traffic
2. Monitor error rates, latency for 10min
3. If stable → 10% → 25% → 50% → 100% (30min total)
4. If errors spike → instant rollback (< 10s propagation)

Use **feature flags at edge**: deploy code disabled, enable progressively per user segment. Have **bypass mechanism**: `?bypass=1` query param skips edge compute, hits origin directly—useful for debugging. Maintain **version parity**: edge and origin run same business logic, edge is optimization layer, not divergent code path."

**Q3**: "How do you optimize CDN costs at scale?"

**A**: "(1) **Smart compression**: Brotli-11 on static assets saves 20-30% bandwidth vs gzip, (2) **Image optimization**: Auto-format WebP/AVIF (50% smaller), responsive srcset (don't send 4K to mobile), (3) **Tiered caching**: Shield layer reduces origin requests by 95%, lowering origin bandwidth costs, (4) **Selective caching**: Don't cache user-specific data at edge—wastes cache space, low hit ratio. Cache public data aggressively. (5) **Bandwidth commitments**: Pre-pay for 100TB/month gets bulk discounts (50% off), (6) **Multi-CDN arbitrage**: Route traffic to cheapest CDN per region—Asia Pacific on Cloudflare ($0.04/GB), Europe on Fastly ($0.05/GB)."

---

## 5. Code Examples

### Example 1: Comprehensive Edge Worker with All Patterns

```typescript
// Cloudflare Worker - Production-Ready
interface Env {
  PRODUCTS: KVNamespace;
  FEATURE_FLAGS: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
}

addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request, event));
});

async function handleRequest(request: Request, event: FetchEvent): Promise<Response> {
  const url = new URL(request.url);
  
  // 1. Security: Rate limiting
  const clientIP = request.headers.get('CF-Connecting-IP') || '';
  const rateLimitOk = await checkRateLimit(clientIP);
  if (!rateLimitOk) {
    return new Response('Too Many Requests', { 
      status: 429,
      headers: { 'Retry-After': '60' }
    });
  }
  
  // 2. Bot detection
  const userAgent = request.headers.get('User-Agent') || '';
  if (/bot|crawler|spider/i.test(userAgent) && url.pathname.startsWith('/api/')) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // 3. Cache check
  const cache = caches.default;
  let response = await cache.match(request);
  
  if (response) {
    // Clone and add cache status header
    response = new Response(response.body, response);
    response.headers.set('X-Cache-Status', 'HIT');
    return response;
  }
  
  // 4. Feature flags (KV lookup: 1-5ms)
  const flags = await env.FEATURE_FLAGS.get('global', 'json') || {};
  
  // 5. A/B testing
  const userId = getCookie(request, 'user_id');
  const variant = getABTestVariant(userId, flags.experimentSeed || 'default');
  
  // 6. Personalization (KV lookup)
  let userPrefs = {};
  if (userId) {
    const cached = await env.PRODUCTS.get(`user:${userId}:prefs`);
    userPrefs = cached ? JSON.parse(cached) : {};
  }
  
  // 7. Fetch from origin with custom headers
  const modifiedRequest = new Request(request, {
    headers: new Headers({
      ...Object.fromEntries(request.headers.entries()),
      'X-Variant': variant,
      'X-User-Segment': userPrefs.segment || 'default'
    })
  });
  
  response = await fetch(modifiedRequest);
  
  // 8. Cache successful GET requests
  if (response.ok && request.method === 'GET') {
    const cacheableResponse = response.clone();
    const cacheControl = response.headers.get('Cache-Control');
    
    if (cacheControl && !cacheControl.includes('no-store')) {
      event.waitUntil(cache.put(request, cacheableResponse));
    }
  }
  
  // 9. Add custom headers
  response = new Response(response.body, response);
  response.headers.set('X-Cache-Status', 'MISS');
  response.headers.set('X-Variant', variant);
  response.headers.set('X-Edge-Location', request.cf?.colo || 'UNKNOWN');
  
  return response;
}

// Rate limiting with in-memory counter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

async function checkRateLimit(ip: string): Promise<boolean> {
  const now = Date.now();
  const limit = 100; // 100 requests per minute
  const window = 60000; // 60 seconds
  
  let record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + window });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

// Consistent A/B test assignment
function getABTestVariant(userId: string, seed: string): string {
  if (!userId) return 'control';
  
  const hash = hashCode(userId + seed);
  return hash % 100 < 50 ? 'variant-a' : 'variant-b';
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get('Cookie');
  if (!cookies) return null;
  
  const match = cookies.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? match[2] : null;
}
```

**What This Achieves**:
- **< 10ms overhead** for edge logic (KV lookups, A/B test, rate limit)
- **Blocks bots** before origin (saves 20-30% bandwidth)
- **Consistent A/B assignment** without database query
- **Rate limiting** prevents DDoS (100 req/min per IP)

### Example 2: Next.js with Advanced CDN Configuration

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      // Static assets: infinite cache
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images: 30 day cache
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000',
          },
        ],
      },
      // API routes: short cache with stale-while-revalidate
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=60',
          },
        ],
      },
      // HTML: no browser cache, edge cache with stale-while-revalidate
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
  
  // Image optimization via CDN
  images: {
    domains: ['cdn.example.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 2592000, // 30 days
  },
};

// pages/products/[slug].tsx with ISR
export async function getStaticProps({ params }) {
  const product = await fetchProduct(params.slug);
  
  return {
    props: { product },
    revalidate: 60, // ISR: regenerate every 60s at edge
  };
}

export async function getStaticPaths() {
  // Only pre-render top 1000 products at build time
  const topProducts = await fetchTopProducts(1000);
  
  return {
    paths: topProducts.map(p => ({ params: { slug: p.slug } })),
    fallback: 'blocking', // Generate on-demand for others
  };
}

// Programmatic CDN purge on content update
// api/revalidate.ts
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { secret, slug } = req.body;
  
  // Verify webhook secret
  if (secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }
  
  try {
    // Revalidate Next.js page (ISR)
    await res.revalidate(`/products/${slug}`);
    
    // Purge CDN cache (Cloudflare)
    await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          `https://example.com/products/${slug}`,
          `https://example.com/api/products/${slug}`,
        ],
      }),
    });
    
    return res.json({ revalidated: true, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Revalidation failed' });
  }
}
```

### Example 3: Multi-CDN Routing Strategy

```javascript
// CDN selector based on real-time performance
class CDNSelector {
  providers = [
    { name: 'cloudflare', baseUrl: 'https://cdn.cloudflare.example.com' },
    { name: 'fastly', baseUrl: 'https://cdn.fastly.example.com' },
    { name: 'akamai', baseUrl: 'https://cdn.akamai.example.com' },
  ];
  
  metrics = new Map(); // Provider performance metrics
  
  async selectOptimalCDN(assetPath, userLocation) {
    // Load recent performance metrics from Redis
    const metrics = await this.loadMetrics();
    
    // Score each provider
    const scores = this.providers.map(provider => {
      const perf = metrics.get(provider.name) || { latency: 100, availability: 0.99 };
      
      // Weighted score: latency (60%) + availability (40%)
      const latencyScore = 1 / perf.latency; // Lower latency = higher score
      const availabilityScore = perf.availability;
      const score = latencyScore * 0.6 + availabilityScore * 0.4;
      
      return { provider, score };
    });
    
    // Return best provider
    const best = scores.sort((a, b) => b.score - a.score)[0];
    return `${best.provider.baseUrl}${assetPath}`;
  }
  
  async loadMetrics() {
    // Load from Redis (updated by monitoring system)
    const data = await redis.hgetall('cdn:metrics');
    
    return new Map(
      Object.entries(data).map(([name, json]) => [name, JSON.parse(json)])
    );
  }
  
  // Called by monitoring system every 10s
  async updateMetrics(provider, latency, isError) {
    const key = `cdn:metrics:${provider}`;
    const metrics = await redis.get(key);
    const current = metrics ? JSON.parse(metrics) : { latency: 100, availability: 0.99, samples: 0 };
    
    // Exponential moving average
    const alpha = 0.3;
    current.latency = alpha * latency + (1 - alpha) * current.latency;
    current.availability = isError 
      ? current.availability * 0.99 
      : current.availability * 0.99 + 0.01;
    current.samples++;
    
    await redis.set(key, JSON.stringify(current), 'EX', 300); // 5min TTL
  }
}

// Client-side usage
async function loadAsset(path) {
  const selector = new CDNSelector();
  const cdnUrl = await selector.selectOptimalCDN(path, getUserLocation());
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(cdnUrl);
    const latency = performance.now() - startTime;
    
    // Report success
    await selector.updateMetrics(getCDNProvider(cdnUrl), latency, false);
    
    return response;
  } catch (error) {
    // Report failure
    await selector.updateMetrics(getCDNProvider(cdnUrl), 9999, true);
    
    // Fallback to next CDN
    const fallbackUrl = await selector.selectOptimalCDN(path, getUserLocation());
    return fetch(fallbackUrl);
  }
}
```

**Benefits**:
- **Automatic failover** to best-performing CDN
- **Real-time routing** based on actual latency, not geography alone
- **Cost optimization** (route to cheapest when performance similar)

---

## 6. Why & How Summary

### Why It Matters

**Business Impact**:
- **Latency Reduction**: 500ms→50ms globally = 10%+ conversion increase
- **Availability**: Multi-CDN failover = 99.99% uptime vs 99.9% single origin
- **Cost**: 68% infrastructure savings (see cost analysis above)
- **Scalability**: Handle 10x traffic spikes without origin scaling

**User Experience**:
- **Fast First Paint**: < 1s globally vs 3s+ without CDN
- **Reliability**: Geographic redundancy eliminates regional outages
- **Bandwidth**: Adaptive delivery (WebP/AVIF) saves mobile users data

### How It Works (Technical Summary)

**Request Flow**:
```
1. User request → DNS resolves to nearest CDN POP (anycast routing)
2. Edge worker executes (rate limit, A/B test, personalization) - 1-10ms
3. Edge cache check → HIT (95%): return cached response - 20-50ms total
4. Cache MISS → Shield cache check → HIT (80% of misses): return - 100ms
5. Shield MISS → Origin request → cache at shield + edge - 200-500ms
6. Response streamed to user, cached at each layer with TTL
```

**Key Techniques**:
1. **Immutable Assets**: Content-hashed filenames → infinite cache, no invalidation
2. **Stale-While-Revalidate**: Serve cached while revalidating async → zero perceived latency
3. **Tiered Caching**: Edge → Shield → Origin reduces origin load 95%+
4. **Edge Compute**: Move logic to edge (< 10ms overhead) vs origin (100-500ms)
5. **Tag-Based Purging**: Invalidate related content across URLs with one API call

**FAANG-Level Expectation**: 
- Cache hit ratio > 90%
- Global P95 latency < 150ms
- Origin requests < 10% of total traffic
- Invalidation propagation < 5 seconds globally
- 99.99% availability with multi-CDN failover
