# 191. CDN Usage
**Phase:** Performance & Architecture | **Sequence:** SEQ 09 | **Company:** Adobe, Microsoft, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

A Content Delivery Network (CDN) is a globally distributed network of edge servers that cache and serve assets from locations close to the user, addressing the fundamental physics problem that a request from Tokyo to a US-East origin server adds 150–200ms of latency regardless of server speed — nothing can make light travel faster. CDNs solve this by caching assets at Points of Presence (PoPs) closest to users, serving cached responses with latency of 5–20ms rather than 150–250ms. Beyond static asset delivery, modern CDNs also provide: edge caching for SSR HTML (reducing origin load for popular pages), origin shield (a single caching tier between edge and origin, preventing cache stampede on cache misses), and edge compute (Cloudflare Workers, Lambda@Edge — running JavaScript at 200+ PoPs). At SAP, deploying our BI Launchpad assets to a CDN with proper cache headers reduced our global P95 LCP from 8 seconds (US-East origin, Asia-Pacific users) to 2.3 seconds (CDN edge in Singapore PoP).

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

The speed-of-light problem: a TCP/TLS handshake from a user in Mumbai to a server in US-East takes ~350ms before a single byte of data is transferred. Add to that actual data transfer, and a 500KB JavaScript bundle takes well over a second just in network time for international users. CDNs eliminate this for static assets and cacheable dynamic content by storing copies geographically close to users. "Geographically close" means 5–20ms RTT at a local PoP versus 100–350ms RTT to a distant origin.

### How It Works Internally

**CDN request flow:**
```
User (Mumbai) → CDN Edge (Singapore PoP) → [Cache HIT?]
    → YES: serve immediately from edge (~8ms RTT)
    → NO: fetch from Origin Shield (e.g., Singapore hub) → [Shield Cache HIT?]
         → YES: serve from shield (~20ms to origin shield, ~28ms total)
         → NO: fetch from Origin (US-East, ~190ms RTT) → cache in shield → cache in edge → serve
```

**Cache key and header configuration:**
```nginx
# Origin response headers that control CDN caching behavior

# Static assets (content-hash filenames — never change for same URL)
Cache-Control: public, max-age=31536000, immutable
# CDN caches for 1 year; browser caches for 1 year; 'immutable' = don't revalidate even on force-refresh
# When asset changes → new filename (hash changes) → new URL → forced cache miss

# HTML (changes on deploy)
Cache-Control: public, max-age=0, s-maxage=86400, stale-while-revalidate=3600
# Browser: don't cache (max-age=0)
# CDN: cache for 24 hours (s-maxage=86400)
# CDN: serve stale for up to 1hr while fetching fresh (stale-while-revalidate=3600)

# API responses (short TTL, public)
Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=60
# CDN caches for 5 minutes; browser for 1 minute; serve stale during revalidation

# Private/user-specific data (never CDN-cache)
Cache-Control: private, no-store
```

**`s-maxage`** — CDN-only cache directive. `max-age` applies to all caches (browser + CDN). `s-maxage` overrides `max-age` for shared caches (CDN) only — allows different TTLs for browser vs CDN.

**CDN cache invalidation strategies:**
```typescript
// Strategy 1: Content-hash filenames (recommended for static assets)
// app.abc123.js → app.def456.js on new build
// Old URL is never invalidated — it simply gets fewer requests as users load new HTML
// No CDN API calls needed at deploy time

// Strategy 2: Cache-busting via CDN purge API (for HTML / no-hash assets)
// Cloudflare API example:
async function purgeCloudflareCache(urls: string[]): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    }
  );
  if (!response.ok) throw new Error(`Cache purge failed: ${response.status}`);
}

// Called at deploy: purge HTML files that have changed
await purgeCloudflareCache([
  'https://app.example.com/',
  'https://app.example.com/dashboard',
]);
```

**Vary header — CDN caches per variation:**
```
Vary: Accept-Encoding          → separate cache entry per encoding (gzip vs brotli)
Vary: Accept-Language          → separate cache entry per language
Vary: Cookie                   → ⚠️ DANGEROUS — results in near-zero CDN hit rate
                                   (nearly every request has unique cookies)
```
`Vary: Cookie` is a common mistake that defeats CDN caching entirely. Use `Vary: Accept-Encoding` only for static assets.

**CDN edge compute (Cloudflare Workers) — redirect, rewrite, personalize at edge:**
```typescript
// Cloudflare Worker — serve WebP/AVIF based on Accept header at edge
// No origin involvement — pure edge transformation
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const accept = request.headers.get('Accept') ?? '';
    
    if (url.pathname.match(/\.(jpg|jpeg|png)$/i)) {
      if (accept.includes('image/avif')) {
        const avifUrl = url.pathname.replace(/\.(jpg|jpeg|png)$/i, '.avif');
        return fetch(new Request(avifUrl, request));
      }
      if (accept.includes('image/webp')) {
        const webpUrl = url.pathname.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        return fetch(new Request(webpUrl, request));
      }
    }
    return fetch(request);  // passthrough for non-image or unsupported format
  },
};
```

### Architecture & Component Boundaries

```
[Build pipeline]
  Output: content-hash filenames (app.abc123.js, main.xyz789.css)
  Pre-compressed: .br, .gz variants
  Cache headers set in origin server config

[CDN Layer (Cloudflare/Fastly/CloudFront)]
  Edge PoPs (200+ globally)
  Origin Shield (single cache tier, prevents cache stampede)
  Automatic Brotli fallback from pre-compressed assets
  Vary: Accept-Encoding respected → separate cache per encoding
  Purge API for deploy-time HTML invalidation

[Browser]
  Static assets: disk/memory cache (max-age=31536000, immutable)
  HTML: network revalidation (s-maxage expired after 24h, purged on deploy)
```

### Data Flow & State Flow

**CDN cache hit rate monitoring:**
A CDN request hits the cache or misses it. Target cache hit rate for static assets: > 95%. For SSR HTML (varies by popularity): CDN cache hits > 80% for high-traffic pages.

```
CDN response headers that reveal cache status:
CF-Cache-Status: HIT        → Cloudflare edge cache hit
CF-Cache-Status: MISS       → Not in cache; fetched from origin
CF-Cache-Status: DYNAMIC    → Marked private/uncacheable
CF-Cache-Status: EXPIRED    → Was cached but TTL expired; revalidated from origin
X-Cache: Hit from cloudfront → AWS CloudFront cache hit
```

### Performance Implications

| Configuration | Global P95 LCP (estimate) |
|---|---|
| Single origin (US-East), no CDN | 3–8s for Asia-Pacific users |
| CDN with static assets only | 1.5–3s (JS/CSS from edge; HTML still from origin) |
| CDN with SSR HTML caching | 0.8–1.8s (all assets from closest PoP) |
| CDN + edge compute + image optimization | 0.6–1.4s (format selection, resize at edge) |

### Scalability Considerations

- **< 10K users (single-region):** Even CDN for static assets provides significant latency improvement for users far from origin; Cloudflare Free tier serves static assets from 200+ PoPs
- **100K users (multi-region):** CDN for static + SSR HTML caching; origin shield to protect origin on cache misses; CDN purge in deploy pipeline for HTML cache invalidation
- **10M+ users (global):** Edge caching for all cacheable responses; real-time CDN analytics for cache hit monitoring; edge compute for A/B testing, geolocation, and bot filtering at PoPs; multi-CDN redundancy (Cloudflare + Fastly) for resilience

### Trade-offs

| Content-hash cache busting | CDN purge API | Short TTLs |
|---|---|---|
| Zero deploy coordination needed | Works for any asset type | No stale content risk |
| Asset cached for 1 year (immutable) | API call required on every deploy | Higher origin load; defeats CDN at low TTLs |
| Requires hash in filename (build pipeline) | Risk: purge API failure leaves stale HTML | Acceptable for frequently-changing data |

### ⚠️ Anti-Patterns & Pitfalls

- **`Vary: Cookie` on public assets:** Results in ~0% CDN cache hit rate because every request has different cookies — only set `Vary: Cookie` on user-specific SSR responses that must be segmented by cookie value
- **No `s-maxage` on HTML:** Without `s-maxage`, the CDN respects `max-age` which is typically `max-age=0` for HTML (to force freshness in browser) — this means the CDN also doesn't cache HTML; use `s-maxage=86400` to cache at CDN while still setting `max-age=0` for the browser
- **Missing origin shield configuration:** Without origin shield, a popular cache miss (e.g., after a purge or first deploy) causes thousands of simultaneous requests to hit the origin (cache stampede); origin shield ensures only one request per PoP cluster reaches the origin
- **Cache-busting query strings vs content-hash filenames:** `?v=123` query string cache busting works but CDNs sometimes handle query string variants poorly; content-hash filenames (`app.abc123.js`) are more reliably differentiated by CDN cache keys
- **Not purging CDN on HTML changes at deploy:** If `s-maxage` is set for HTML and CDN purge API isn't called on deploy, users in warmed PoPs may see stale HTML (pointing to old asset versions) for up to the s-maxage duration

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP BI Launchpad was initially deployed to a single US-East AWS origin. Analysis of Lighthouse scores by user geography revealed that Asia-Pacific users were experiencing P95 LCP of 7.8 seconds — nearly entirely attributable to network RTT. After migrating static assets to Cloudflare CDN with content-hash filenames and `Cache-Control: public, max-age=31536000, immutable`, and configuring SSR HTML with `s-maxage=3600, stale-while-revalidate=600`, P95 LCP for Asia-Pacific users improved to 2.3 seconds. Monitoring revealed initial CDN cache hit rate was only 72% due to `Vary: Cookie` being set on static assets by default in the origin Nginx config — removing that header brought cache hit rate to 98%.

**At FAANG scale:**
Netflix operates its own CDN (Open Connect) with ~10K servers deployed at ISPs globally — they deliver 100+ Tbps of streaming traffic with CDN PoPs literally co-located inside ISP data centers, achieving sub-5ms RTT for video manifest and segment requests. Cloudflare serves 55M+ HTTP requests per second globally across 300+ PoPs. Adobe Experience Manager uses Fastly CDN with VCL configuration for edge-side personalization.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "A CDN solves the physics problem — light travels at a fixed speed and a user in Singapore making a request to US-East adds 180ms of latency before a byte is sent. CDN edge PoPs put a geographically close cache between the user and origin, dropping that to 8–20ms for cached assets. The critical configuration decisions are: cache headers for each asset type — static assets with content-hash filenames get `Cache-Control: public, max-age=31536000, immutable` (the hash guarantees cache busting on change); HTML gets `s-maxage` for CDN caching but `max-age=0` for the browser so the CDN caches the popular page but the browser always revalidates; and the `Vary: Accept-Encoding` header ensures the CDN caches separate versions for Brotli vs Gzip. Two mistakes I always check: `Vary: Cookie` accidentally applied to public assets — this kills CDN hit rate to near-zero; and missing origin shield — without it, a cache miss after deploy causes a cache stampede directly to origin. At SAP, fixing those two issues brought CDN cache hit rate from 72% to 98%."

### Likely Follow-up Questions
1. What is origin shield? → A separate cache tier between edge PoPs and origin. When multiple edge PoPs have a cache miss, they fan-out to origin shield rather than directly to origin, so origin sees at most one miss per cache period (eliminates cache stampede)
2. What is the difference between `max-age` and `s-maxage`? → `max-age` applies to all caches (browser + CDN); `s-maxage` overrides `max-age` only for shared/proxy caches (CDN). Use `max-age=0, s-maxage=3600` to prevent browser caching while CDN caches for 1 hour
3. How do you handle cache invalidation for HTML on deploy? → Two approaches: CDN purge API (call at deploy time for all HTML URLs that changed) or `stale-while-revalidate` with short `s-maxage` so CDN revalidates frequently
4. What is edge compute and when would you use it? → JavaScript running at 200+ CDN PoPs rather than at origin; used for: A/B testing (route to variant without origin round-trip), bot detection/filtering, image format negotiation, geolocation-based routing, authentication token validation

### How to Signal Senior Thinking
> "Beyond static asset caching, the next frontier is using the CDN for full HTML caching of personalized content via edge-side logic. Traditionally, HTML with any user-specific content couldn't be CDN-cached. With edge compute (Cloudflare Workers, Lambda@Edge), we can cache the 'structure shell' of a page and inject personalized fragments at the edge from a KV store — no origin round-trip for the expensive SSR. This moves TTI from 500ms (origin SSR) to 20ms (edge-cached shell + KV fragment injection) for returning users. That's the architectural evolution from simple static asset CDN to edge-first rendering."

---

## 💻 5. Code Example

```typescript
// Cache header configuration — Next.js (App Router) response headers
// next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  async headers() {
    return [
      {
        // Static assets with content-hash — cached immutably for 1 year
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Public images (without content-hash — use shorter TTL)
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
      {
        // HTML pages — CDN caches, browser revalidates, stale-while-revalidate for smooth deploys
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=600',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
            // Explicitly NOT varying on Cookie — page is public/cacheable
          },
        ],
      },
    ];
  },
};

export default config;
```

```typescript
// Deploy script: purge CDN cache for changed HTML pages
// deploy.ts (run at end of CI/CD pipeline)
interface CloudflarePurgeResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
}

async function purgeCDNCacheOnDeploy(changedPaths: string[]): Promise<void> {
  const baseUrl = process.env.APP_BASE_URL!;  // e.g., 'https://app.example.com'
  const urls = changedPaths.map(path => `${baseUrl}${path}`);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CF_PURGE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    }
  );

  const result = (await response.json()) as CloudflarePurgeResponse;
  if (!result.success) {
    console.error('❌ CDN purge failed:', result.errors);
    // Don't fail the deploy — stale content is better than no deploy
    // But alert the team (Slack, PagerDuty)
  } else {
    console.log(`✅ Purged ${urls.length} CDN cache entries`);
  }
}
```

**Interview vs Production difference:**
In an interview, explain the CDN request flow (edge PoP → origin shield → origin), cache headers (`max-age` vs `s-maxage`, `Vary: Accept-Encoding`, `immutable`), and content-hash cache busting. In production, add: cache hit rate monitoring, deploy-time purge integration, origin shield configuration, and `stale-while-revalidate` for smooth rolling deploys without stale content.

---

## 🧠 6. Memory Aid

**Mental Model:** A CDN is like a global library system — instead of everyone traveling to the national archive (origin), local branches (edge PoPs) hold popular books (assets). Content-hash filenames are like ISBNs — each edition gets a unique identifier, so caching a new edition never conflicts with the old one.

**If you go blank:** "CDN solves physics: edge PoPs serve from 5–20ms RTT vs 150–350ms to origin. Key configs: content-hash filenames + immutable for static assets; s-maxage for CDN HTML caching; Vary: Accept-Encoding for compression variants. Don't Vary by Cookie on public assets."

**Mnemonic:** **E-S-V** — **E**dge PoPs (close to users), **S**-maxage (CDN-only cache TTL), **V**ary: Accept-Encoding (not Cookie).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: CDN is the primary mechanism for global performance parity — without it, LCP can be 4–10x worse for users far from the origin; no amount of application optimization compensates for 300ms of raw network RTT
→ Performance: Cache hit rate > 95% for static assets means the origin serves < 5% of asset requests; origin can be significantly smaller/simpler
→ Business: Global companies (Adobe, Microsoft, Salesforce) have users on every continent — CDN is not optional, it is infrastructure foundation

**How it works (3 sentences):**
A CDN maintains a network of edge PoPs distributed globally — upon first request, the CDN fetches the asset from the origin (potentially via an intermediate origin shield tier), caches it at the edge PoP, and serves all subsequent requests from the geographically closest PoP at 5–20ms latency rather than the 100–350ms latency of a distant origin. Cache control is governed by HTTP headers — `Cache-Control: public, max-age=31536000, immutable` for content-hash static assets (never expires, never revalidated), `Cache-Control: public, max-age=0, s-maxage=3600` for HTML (CDN caches for 1 hour, browser revalidates immediately), and `Vary: Accept-Encoding` to ensure the CDN maintains separate cache entries for Brotli vs Gzip encoded variants. Cache invalidation for non-hash assets uses the CDN purge API at deploy time, while content-hash filenames provide automatic cache busting by changing URLs when content changes — making CDN purge unnecessary for the majority of assets.

**Company relevance:**
- Microsoft: Azure CDN (Front Door) is Microsoft's CDN product and is used ubiquitously across Microsoft web properties — understanding it in depth is directly relevant; SharePoint, Teams and O365 web apps all depend on CDN architecture
- Adobe: Fastly CDN is Adobe's CDN of choice for adobe.com and creative cloud apps; VCL edge logic for personalization and Vary header management are Adobe-specific concerns
- Salesforce: Salesforce operates a multi-tenant SaaS with global users — CDN for org-specific static assets and Lightning Web Components bundles is a core infrastructure matter
- Cisco: Cisco's web presence and SaaS products (Webex, Meraki) rely on CDN for global latency on control plane UIs and media assets

---
**✅ Topic 191/486 complete.**
**→ Continuing to Topic 192: Third-Party Script Management**
