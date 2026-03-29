# 130. Edge Caching vs Origin Caching ★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Origin caching** refers to caching at your application server — in-memory (Redis, Memcached) or server-side HTTP cache. **Edge caching** refers to caching at CDN Points of Presence (PoPs), geographically distributed nodes that serve cached responses from the location closest to the user, bypassing the origin entirely. The distinction matters profoundly at scale. An origin cache can be a few hundred milliseconds away (cross-country latency), while an edge cache might be 20ms away. For static and semi-static content — HTML pages, API responses with moderate staleness tolerance, images — edge caching is the right architecture: it reduces origin load by 90%+, reduces latency by 80-90%, and provides automatic DDoS protection. At senior level, the decision of what to cache at the edge vs at the origin (vs not cache at all) is a core architecture trade-off that affects CDN costs, data freshness, cache poisoning risk, and ability to purge on demand.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Architecture Comparison

```
Without CDN / Origin-Only Caching:
──────────────────────────────────────────────────────────
User (Tokyo)  →  [Atlantic Ocean + US datacenter]  →  Origin (US-East-1)
              →                                    ←
              latency: 180ms round trip

With Edge Caching (CDN):
──────────────────────────────────────────────────────────
User (Tokyo)  →  CDN PoP (Tokyo, 5ms away)  →  Cached response (0 origin hit)
              ←
              latency: 5ms round trip

Cache MISS (first Tokyo user or expired cache):
User (Tokyo)  →  CDN PoP (Tokyo)  →  Origin (US-East-1)
                                   ←  Response + cache it in Tokyo
                                ← cached response delivered
```

### Cache Layers in a Frontend System

```
Browser Cache        Edge Cache (CDN)       Origin Cache (Redis)    Database
─────────────────    ─────────────────      ─────────────────       ──────────
Scope: 1 user        Scope: All users       Scope: All users         Raw data
TTL: minutes-hours   TTL: seconds-hours     TTL: seconds-minutes
Location: browser    Location: CDN PoP      Location: App server

Priority: Browser → Edge → Origin → Database
(Each layer is checked in order, most to least cached)
```

### What Should Go Where

```typescript
type CacheLayer = 'browser' | 'edge' | 'origin' | 'no-cache';

interface CachingDecision {
  contentType: string;
  layer: CacheLayer;
  ttl: string;
  reason: string;
}

const cachingDecisions: CachingDecision[] = [
  // Static assets → edge + browser (long lived, content hashed)
  { contentType: 'JS/CSS bundles (hash in URL)', layer: 'edge', ttl: '1 year', reason: 'Immutable — hash changes on update' },
  { contentType: 'Images (content-addressed)', layer: 'edge', ttl: '1 year', reason: 'Immutable content hash' },
  { contentType: 'Fonts', layer: 'edge', ttl: '1 year', reason: 'Never change (version in path)' },
  
  // HTML pages → edge with short TTL or stale-while-revalidate
  { contentType: 'Static marketing page', layer: 'edge', ttl: '5 min SWR', reason: 'Infrequent updates; global audience' },
  { contentType: 'Authenticated dashboard HTML shell', layer: 'edge', ttl: '1 min', reason: 'Never cache user-specific HTML at edge' },
  
  // API responses → depends on personalization
  { contentType: 'Public catalog API (/api/products)', layer: 'edge', ttl: '60s', reason: 'Same for all users; updates OK to be 60s stale' },
  { contentType: 'User-specific API (/api/user/cart)', layer: 'no-cache', ttl: 'never', reason: 'Personal data — must not be served to wrong user' },
  { contentType: 'Config / feature flags API', layer: 'edge', ttl: '30s', reason: 'Same for all users; infrequent changes' },
  
  // Session-dependent → origin cache only
  { contentType: 'Auth tokens / sessions', layer: 'origin', ttl: '15 min', reason: 'Never at edge — security risk' },
];
```

### Cache-Control Header Strategy

```typescript
// HTTP Cache-Control: the language of edge and browser caching

// 1. Immutable static assets (JS/CSS with content hash)
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
// public: browser + CDN can cache
// max-age=31536000: 1 year in seconds
// immutable: browser never sends conditional request (ETag/If-Modified-Since)

// 2. HTML pages (SSR or static)
res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
// s-maxage=60: CDN caches for 60 seconds (overrides max-age for shared caches)
// stale-while-revalidate=300: CDN serves stale for up to 5 minutes while revalidating
// max-age=0: browser always revalidates (gets fresh from CDN at s-maxage frequency)

// 3. Public API responses
res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
// CDN caches API for 30 seconds, serves stale for 60 more while revalidating

// 4. Authenticated/personalized content — NEVER cache at CDN
res.setHeader('Cache-Control', 'private, no-store');
// private: only browser can cache (NOT CDN/shared caches)
// no-store: browser doesn't cache either — fully fresh every time
// Use for: user dashboard, cart, account data, admin pages

// 5. Vary header — critical for edge caching format-negotiated responses
res.setHeader('Cache-Control', 'public, max-age=3600');
res.setHeader('Vary', 'Accept-Encoding, Accept');
// Vary: Accept-Encoding → CDN caches separate versions for gzip/brotli/identity
// Vary: Accept → CDN caches separate versions per image format (AVIF vs WebP vs JPEG)
```

### CDN Cache Key Design

```typescript
// Cache key = what makes two requests "the same" to the CDN
// Default: URL only
// Custom: URL + selected headers + query parameters

// Problem: Cookie headers in requests
// /api/products?page=1 with different Cookie values = same cache key
// A user's personalized response would be served to everyone!

// Solution: Normalize cache key + remove cookies from cached requests
// Cloudflare Worker example:
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Remove tracking/session cookies from cache key for public endpoints
    if (url.pathname.startsWith('/api/products')) {
      const cleanRequest = new Request(url.toString(), {
        method: request.method,
        headers: {
          // Only forward content negotiation headers — not auth/session
          'Accept': request.headers.get('Accept') ?? '',
          'Accept-Encoding': request.headers.get('Accept-Encoding') ?? '',
          // DO NOT forward: Cookie, Authorization headers to cache layer
        },
      });
      return fetch(cleanRequest);
    }
    
    return fetch(request);
  },
};
```

### Edge Cache Purging

```typescript
// When does cached content need immediate purging?
// - Product price updated in e-commerce
// - Breaking news published
// - Feature flag changed
// - Security vulnerability: need to push updated script reference immediately

// Cloudflare API: purge by URL
async function purgeByURL(urls: string[]): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Cache purge failed: ${response.statusText}`);
  }
}

// Purge on CMS publish (Next.js On-Demand ISR):
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { secret, path, tag } = await req.json();
  
  // Validate revalidation secret to prevent unauthorized purges
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }
  
  if (path) revalidatePath(path);    // Purge specific path
  if (tag) revalidateTag(tag);       // Purge by tag (all pages tagged 'product')
  
  return NextResponse.json({ revalidated: true });
}
```

### Edge vs Origin: The Anti-Patterns

```
❌ Caching authenticated user data at edge:
GET /api/user/profile → CDN caches response
→ Second user makes same request → receives first user's profile data
→ This is a data breach

✅ Correct: Cache-Control: private, no-store for all auth-gated endpoints

❌ Long edge TTL without purge strategy:
Cache-Control: public, s-maxage=86400 (1 day) for product listings
Product goes out of stock → still shows as available for 24 hours
No team member knows how to trigger CDN purge

✅ Correct: Implement purge webhook from CMS/inventory system
   + Set s-maxage=300 (5 min) or use stale-while-revalidate for freshness tolerance

❌ Caching responses with Vary: Cookie
Many CDNs treat Vary: Cookie as "don't cache" — effectively bypasses edge cache
Common mistake: frameworks that set Vary: Cookie on all responses (session middleware)

✅ Correct: Remove Vary: Cookie from public endpoints via CDN override rule
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**GitHub:**
Static assets (JS/CSS) served with 1-year CDN cache + immutable. HTML pages served with `s-maxage=5` (5 second edge cache for scale) + `stale-while-revalidate=600`. Repository data API uses no edge cache — it's auth-gated. Result: static assets never hit origin; HTML serves 99% from edge; API always fresh.

**Netflix:**
Movie metadata (titles, descriptions, thumbnails) edge-cached at Cloudflare with 5-minute TTL. Viewing history and recommendations are 100% origin — personalized, zero caching. Each CDN PoP (200+ globally) serves all non-personalized content. Reduces Netflix data center egress by >80%.

**SAP (Hruday's context):**
SAP Fiori in cloud deployments uses SAP Content Delivery Network for static assets (1-year immutable cache). OData API responses are NOT edge-cached because they're always user-specific — `Cache-Control: private, no-store`. Session token endpoints: same.

**Scaling:**
- 1K users: CDN optional; origin cache (Redis) sufficient
- 100K users: CDN mandatory for static assets; edge cache API responses with short TTL
- 10M users: Edge cache is the primary traffic handler; <10% origin hits; origin is backup

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "The core principle is: cache as close to the user as possible, but only data that's safe to share between users. Edge caching via CDN is ideal for static assets — JS/CSS bundles get 1-year immutable caching since the hash in the URL changes on every release. For API responses, I apply a two-tier rule: public, non-personalized data gets edge caching with a short TTL (30-60 seconds) plus stale-while-revalidate for freshness; user-specific data gets `Cache-Control: private, no-store` — if it ever hit an edge cache, we'd have a data breach. The Vary header is critical: `Vary: Accept` tells the CDN to cache separate versions per image format, enabling AVIF/WebP negotiation. The hardest part is cache invalidation — I implement a purge webhook from our content system so that CMS publishes trigger CDN purges within seconds, keeping edge cache TTLs low while maintaining cache efficiency. At SAP, I explicitly blocked the CDN from caching the OData API layer by returning `private, no-store` from all authenticated endpoints — essential for enterprise data security."

**Likely Follow-up Questions:**
1. *What's the difference between `max-age` and `s-maxage`?* → `max-age`: TTL for both browser and shared caches; `s-maxage`: TTL for shared caches (CDN) only — overrides `max-age` for CDN while letting browser behavior differ
2. *What happens if you cache a response with `Vary: Cookie`?* → Most CDNs treat `Vary: Cookie` as "uncacheable" because cookies vary per user — strips CDN cache benefit entirely. Override at CDN edge rule level to strip Cookie before cache lookup.
3. *How do you invalidate CDN cache?* → URL purge API (Cloudflare/Fastly purge API); Next.js `revalidatePath`/`revalidateTag`; content hash in URLs (no invalidation needed — new URL = new cache entry)
4. *What is stale-while-revalidate?* → Serve stale cached content immediately while revalidating in background; user sees fast response (stale), next request gets fresh content. Defined in Cache-Control: `stale-while-revalidate=N`
5. *When would you use origin cache (Redis) instead of edge cache?* → Session data, auth tokens, rate-limiting counters, real-time inventory — data that's per-user or per-request, or needs to be invalidated precisely

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Next.js Cache Control by Route)
────────────────────────────────────────────────────────────

```typescript
// next.config.js — Cache-Control headers per path pattern
const nextConfig = {
  async headers() {
    return [
      // Static assets: 1 year immutable (already have content hash in filename)
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Images with hash: 1 year
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Public API: 30s edge cache + 60s SWR
      {
        source: '/api/products/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=30, stale-while-revalidate=60' }],
      },
      // Authenticated API: no caching anywhere
      {
        source: '/api/user/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      // HTML pages: CDN caches 60s, browser revalidates
      {
        source: '/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' }],
      },
    ];
  },
};
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"Edge = cheap, fast, public. Origin = secure, precise, private."**

The one rule: **`Cache-Control: private` for anything user-specific. Everything else: edge cache.**

Key directives:
- `public, max-age=31536000, immutable` → static assets
- `s-maxage=60, stale-while-revalidate=300` → public pages/API
- `private, no-store` → auth-gated content (non-negotiable)

**If you go blank:** "Static assets go to edge cache for 1 year. Public API data goes to edge for 30-60 seconds. Authenticated data is `private, no-store` — never touches edge cache."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Latency**: CDN edge cache serves from ~5ms vs ~200ms cross-continental origin
→ **Scale**: 90% origin offload = your servers handle 1/10 the traffic
→ **Security**: Private content accidentally edge-cached = data breach

**How it works:**
→ CDN PoPs are cache servers globally distributed. When a request arrives at a PoP, it checks its cache using the URL (and configured cache key). On HIT, it responds immediately. On MISS, it forwards to origin, caches the response (unless `private` or `no-store`), and returns it. TTL is controlled by the origin's `Cache-Control` response header (`s-maxage` for CDNs).

**Company relevance:**
→ **Microsoft**: Azure Front Door is Microsoft's edge caching/CDN; all Microsoft 365 web apps route through AFD for edge caching of static assets
→ **Adobe**: Adobe Experience Manager uses Dispatcher + CDN (Fastly/Cloudflare) in a two-tier caching architecture
→ **Salesforce**: Salesforce CDN (built on Akamai) caches Experience Cloud static assets and public pages; all CRM data is `private, no-store`
→ **Cisco**: WebEx CDN uses CloudFront for media assets; zero edge caching for meeting participant data
