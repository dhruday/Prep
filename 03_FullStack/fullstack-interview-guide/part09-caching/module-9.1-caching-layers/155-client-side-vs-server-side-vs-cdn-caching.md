# Client-Side vs Server-Side vs CDN Caching
> Part 9 — Caching Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- There are three caching layers: **client-side** (browser/app), **server-side** (your backend), and **CDN** (edge servers near the user) — each solves a different problem
- Client-side cache saves the user from a round-trip entirely — response time goes from 50ms to 0ms
- Server-side cache saves the DB from a slow query — a 200ms query becomes a 1ms Redis lookup
- CDN cache reduces physical distance — a UK user hits a London edge node instead of a Mumbai origin
- 🔥 At SAP, we controlled client caching via `Cache-Control` headers; server-side Redis was our first scale lever for product catalog data

---

## 1. One-Line Definition
Caching layers store copies of data closer to where it is needed — client-side in the browser, server-side in memory or Redis, and CDN at geographic edge nodes — so each request travels as short a distance as possible.

---

## 2. The Problem It Solves

Picture a flash sale on an e-commerce platform. 50,000 users land on the same product page within 30 seconds. Each page load needs the product name, price, images, and seller info. Without caching, every request hits your Spring Boot service, which hits your MySQL DB. The DB gets 50,000 identical queries for the same rows, connection pools exhaust, response times spike from 80ms to 4 seconds, and users see a blank page.

Now add three caching layers. The CDN caches the product page HTML at 68 edge locations worldwide — 80% of users never even reach your servers. Your server-side Redis cache serves the product JSON for the remaining users — one DB query fills the cache, and 9,999 other requests read from memory in under 1ms. The browser's `Cache-Control` header tells each user's browser to keep the product images for 30 days — the same user refreshing never re-downloads the images at all.

The result: the DB handles maybe 200 queries instead of 50,000. Your servers stay healthy. Users load the page in 180ms instead of 4 seconds.

---

## 3. How It Works Internally

### The Mental Model
Think of three concentric circles around your data. The innermost circle is your database — slow but always correct. The middle circle is your server-side cache (Redis) — fast and close to your code. The outer circle is the CDN — blazing fast but geographically distributed. And outside all of them is the user's own browser, which can cache locally with zero network calls at all.

Every request tries the closest layer first. If the data is there (a "cache hit"), it returns immediately. If not (a "cache miss"), it goes to the next layer inward. This is called the cache lookup chain.

### The Mechanism — Step by Step

**Client-Side Caching:**
1. Browser receives a response with a `Cache-Control: max-age=300` header
2. Browser stores the response in its local cache with an expiry timestamp
3. Next request within 300 seconds → browser returns cached response without any network call
4. After 300 seconds: browser sends `If-None-Match: "etag-value"` to server
5. If unchanged: server returns `304 Not Modified` (empty body, saves bandwidth)
6. If changed: server returns full new response with updated `ETag`

**Server-Side Caching:**
1. Request arrives at Spring Boot service
2. Spring Cache checks Redis for key (e.g. `product::{id}`)
3. Cache hit → return deserialized object directly, no DB call
4. Cache miss → execute DB query, store result in Redis with TTL, return result
5. On data update → explicitly evict the cache key so next request re-reads from DB

**CDN Caching:**
1. User's browser sends request to `cdn.example.com/product/123`
2. CDN routes to nearest edge server (e.g. Mumbai PoP for Indian users)
3. Edge server checks its local cache for `product/123`
4. Cache hit → respond from edge (typically < 5ms)
5. Cache miss → edge fetches from your origin server, caches the response, returns it
6. TTL expires or origin sends `Cache-Control: no-store` → edge evicts and re-fetches

### ASCII Diagram

```
User Request
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 1: Browser Cache                                    │
│  Cache-Control, ETag, Last-Modified                        │
│  Hit = 0ms, no network call                                │
└──────────────────────────────────────────────────────────┘
     │ miss
     ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 2: CDN Edge Node (Cloudfront / Cloudflare)          │
│  Geographically close. Caches static + semi-static content │
│  Hit = 5–15ms (from edge). Miss = forward to origin        │
└──────────────────────────────────────────────────────────┘
     │ miss
     ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 3: API Gateway / Server-side Cache (Redis)          │
│  Caches API responses, product data, session tokens        │
│  Hit = 1–3ms. Miss = query DB                              │
└──────────────────────────────────────────────────────────┘
     │ miss
     ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 4: Database (PostgreSQL / MySQL)                    │
│  Source of truth. Always correct. Slowest: 20–200ms        │
└──────────────────────────────────────────────────────────┘
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// ProductController.java — NO caching at all
@GetMapping("/products/{id}")
public Product getProduct(@PathVariable Long id) {
    // Every single request hits the DB — no cache headers, no server-side cache
    // At 1,000 requests/sec this destroys your DB connection pool
    return productRepository.findById(id).orElseThrow();
}
```
```typescript
// React component — NO client-side cache awareness
async function fetchProduct(id: string) {
  // fetch() with no cache option — browser uses default heuristic caching
  // The server sends no Cache-Control header so browser re-fetches every time
  const res = await fetch(`/api/products/${id}`);
  return res.json();
}
```
> **Why this fails in production:** Without `Cache-Control` headers on the server and no Redis cache, every refresh by every user hammers the DB. At any meaningful traffic scale, DB connections exhaust and latency spikes.

### Right Way — Production Quality

**Backend — Spring Boot with Redis cache + proper HTTP cache headers:**
```java
@Service
public class ProductService {

    private final ProductRepository productRepository;

    // Spring Cache reads from Redis first; DB only called on cache miss
    // TTL is set in Redis config (see yaml below) — product data is semi-static
    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }

    // When a product is updated, evict so next request re-reads fresh from DB
    @CacheEvict(value = "products", key = "#product.id")
    public Product updateProduct(Product product) {
        return productRepository.save(product);
    }
}

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id) {
        Product product = productService.getProduct(id);

        // max-age=300: browser caches for 5 minutes
        // s-maxage=3600: CDN caches for 1 hour (overrides max-age for shared caches)
        // must-revalidate: browser must check server once max-age expires (not serve stale)
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS)
                .sMaxAge(3600, TimeUnit.SECONDS)
                .mustRevalidate())
            // ETag allows conditional requests — 304 Not Modified saves bandwidth
            .eTag(String.valueOf(product.getVersion()))
            .body(product);
    }
}
```

**application.yml — Redis cache TTL configuration:**
```yaml
spring:
  cache:
    type: redis
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: 6379
  cache:
    redis:
      time-to-live: 3600000   # 1 hour in milliseconds — products don't change often
      cache-null-values: false  # don't cache null — avoids caching "not found" misses
```

**Frontend — React with fetch cache control:**
```typescript
// Explicit cache behaviour per request type
async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, {
    // 'default': use browser cache if fresh (respects Cache-Control max-age)
    // 'no-store': never cache (use for real-time financial data like stock prices)
    // 'reload': always fetch fresh, but update cache for next time
    cache: 'default'
  });

  if (!res.ok) throw new Error(`Product fetch failed: ${res.status}`);
  return res.json();
}

// For user-specific data (cart, wishlist) — must NOT be CDN-cached
// Set Cache-Control: private, no-store or use Authorization header
async function fetchUserCart(userId: string): Promise<Cart> {
  const res = await fetch(`/api/users/${userId}/cart`, {
    cache: 'no-store',  // never cache personalised data in shared CDN
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  return res.json();
}
```

> **Key decisions here:**
> - `s-maxage=3600` specifically controls CDN TTL while `max-age=300` controls browsers — they are independent
> - ETag + `must-revalidate` gives freshness guarantee without full re-download when unchanged
> - `@CacheEvict` on updates keeps the server-side cache consistent — without this, users see stale data until TTL expires
> - `cache: 'no-store'` on user-specific endpoints prevents personalised data from leaking via shared CDN cache

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are the three main caching layers in a web system and what does each one cache?"

**Hruday's answer:**
> The three layers are client-side, server-side, and CDN. Client-side caching lives in the browser — using `Cache-Control` headers, the browser stores responses locally so repeat requests return instantly with zero network calls. Server-side caching, typically Redis, sits in your backend between your service and the database — it stores DB query results so repeated lookups return in under 2ms instead of 50–200ms. CDN caching lives at geographic edge nodes — it stores your static and semi-static content close to the user, so a user in Germany hits a Frankfurt edge node instead of your Mumbai origin, cutting latency from 250ms to 15ms.
>
> The key separation is what each layer is good at. The browser layer eliminates round-trips for that one user. The server layer eliminates DB load across all users. The CDN layer eliminates geographic distance. At SAP, we controlled browser caching carefully via headers because we had large Angular bundles — we set long `max-age` on versioned assets and short TTLs on API responses.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do `Cache-Control: max-age` and `s-maxage` interact, and how does an ETag prevent serving stale content?"

**Hruday's answer:**
> `max-age` tells the browser (and any shared cache) the freshness lifetime in seconds. `s-maxage` overrides `max-age` specifically for shared caches — meaning CDNs and proxy servers read `s-maxage`, not `max-age`, for their TTL. This lets you have different policies: browsers cache product data for 5 minutes while the CDN holds it for an hour, because the CDN can handle cache invalidation through a purge API, but you can't control how long an individual browser holds something.
>
> ETag works alongside this. When the browser's max-age expires, instead of re-downloading the full response, it sends a conditional request: `If-None-Match: "v42"`. The server computes the current ETag — usually a hash of the response body or a version number. If it matches, the server returns `304 Not Modified` with an empty body, which saves hundreds of kilobytes on a product page. The browser then refreshes its cache entry with the new max-age and reuses the existing local copy. This means the user gets both freshness checking and bandwidth saving — they pay with a small round-trip latency, not a full re-download.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you NOT use CDN caching, and what risks does CDN caching introduce?"

**Hruday's answer:**
> I would never CDN-cache personalised or user-specific content — cart data, user profiles, real-time notifications, payment status. If you accidentally cache a response that contains another user's data at the CDN edge, every user hitting that cache key gets that one person's data. That's a data privacy incident, not a performance issue.
>
> The practical rule: if the response's correctness depends on the `Authorization` header or a user session cookie, it must not be cached at a shared CDN layer. You signal this with `Cache-Control: private` — CDNs respect this and won't cache the response.
>
> The bigger operational risk is cache poisoning. If an attacker can inject a malicious response that gets stored in the CDN cache, it gets served to all users who request that resource. Mitigations include strict cache key normalisation (sanitise query params), setting `Vary: Accept-Encoding` correctly, and CDN WAF rules.
>
> Finally, CDN caches introduce cache invalidation complexity — stale content can stay at 300+ edge nodes for the full TTL. If you push a critical bug fix, you need CDN purge APIs. At SAP, we versioned all static asset filenames (fingerprinting via webpack contenthash) so old assets auto-expired and new ones were always fetched fresh.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the caching strategy for a product catalog on an e-commerce platform that has 5 million daily users and runs flash sales."

**Hruday's answer:**
> I'd design three defensive layers. At the CDN layer, I'd cache the product detail page HTML and the product JSON API for 1 hour using `s-maxage=3600`. During a flash sale, I'd pre-warm the CDN by making synthetic requests to the top 1,000 product URLs 10 minutes before the sale starts, ensuring the first real user hits a warm cache.
>
> At the server layer, I'd use Redis with a 2-hour TTL on product data. I'd use Read-through caching with Spring's `@Cacheable` — on cache miss it queries DB, populates cache, and returns. I'd also use write-through on product updates via `@CacheEvict`. For flash sale price changes, I'd explicitly evict the affected product keys from Redis when the sale starts and ends.
>
> At the client layer, I'd set `Cache-Control: max-age=60, s-maxage=3600` on product API responses — short browser TTL because prices change, long CDN TTL because the CDN purge is under my control. For static assets (images), I'd use `Cache-Control: max-age=31536000, immutable` with content-hashed filenames.
>
> With these three layers, 80% of traffic never reaches my servers, 19% hits Redis, and only 1% reaches the DB — that's the model I'd explain to the architecture review.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "CDN caches everything" | "Deploy behind CDN and you're done" | CDN must never cache `Authorization`-gated responses — `Cache-Control: private` is critical for user-specific data |
| "Cache-Control is just max-age" | Mention only max-age | `s-maxage` overrides max-age for shared caches (CDNs) — these are independent TTL values |
| "Cache invalidation is easy" | "Just set a TTL" | TTL alone means stale data for the full TTL window — explicit `@CacheEvict` on writes is the right answer; Phil Karlton's quote exists for a reason |
| "Server-side cache is always right" | Put everything in Redis | If cache is not invalidated on write, users see stale data — cache + write strategy must always be designed together |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we had Angular bundles served via CloudFront CDN. Getting the `Cache-Control` strategy right — long TTLs on content-hashed assets, short TTLs on API responses — was a key part of pushing Lighthouse performance from 60 to 95+. I also saw how missing `Cache-Control: private` on an internal tool once caused a user's profile UI to briefly flash another user's name in a shared network environment. That was the moment I understood CDN cache poisoning risk from first principles. I now make HTTP caching header review a mandatory step in every API PR."

---

## 8. Scale Evolution

**1,000 users/day →** A simple server-side `@Cacheable` on the product service is enough. No CDN needed yet. Browser defaults are fine. Redis or even Caffeine (in-process) cache handles the load. DB hardly notices.

**100,000 users/day →** CDN becomes important, especially if users are globally distributed. A 200ms extra round-trip to origin for each user matters at this scale. Server-side Redis cache is now essential to protect the DB from repeated reads. HTTP `Cache-Control` headers on all product APIs become non-negotiable.

**10 million users/day →** Multi-layer caching is not optional — it is the architecture. CDN absorbs 85%+ of product page traffic. Redis cluster handles the remaining API reads. Cache warming before flash sales is a dedicated engineering concern. Cache invalidation pipelines (Kafka event → cache eviction listeners across all nodes) replace manual eviction. Separate CDN configurations for static assets vs API responses. You start worrying about cache stampede (Topic 159) under this load.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment status and user dashboard data must NEVER be CDN-cached — security and personalisation requirements are strict | Can you identify which data must have `Cache-Control: private, no-store`? |
| Swiggy / Meesho | Product catalog, restaurant menus, flash sale pricing — classic multi-layer caching targets; flash sale traffic spikes demand CDN pre-warming | Do you know s-maxage vs max-age and how to pre-warm CDN cache? |
| Adobe / Microsoft | Enterprise apps with many internal tools — proper HTTP cache headers prevent sensitive data leaking across shared network proxies | Do you know when `Vary` header is needed and how `ETag` works? |
| SAP Labs | Large Angular SPA bundles at enterprise scale — CDN + content-hashed assets + Spring Boot API cache headers | Can you explain why long cache TTLs on fingerprinted assets are safe even on weekly deploys? |

---

## 10. Related Topics — What to Study Next

- **Topic 156 — Cache Eviction Policies (LRU, LFU, FIFO)** — what happens when your cache fills up; which algorithm keeps your most-used data in memory
- **Topic 157 — Cache Invalidation Strategies** — the hardest caching problem; how to keep cache consistent with DB after writes
- **Topic 158 — Cache Aside vs Read-Through vs Write-Through** — the four standard access patterns; which one Spring Boot's `@Cacheable` uses and when to choose each
- **Topic 160 — Redis as Distributed Cache** — deep dive into Redis as the server-side cache layer; data structures, TTL, eviction at scale
- **Topic 164 — CDN Caching — Edge vs Origin** — deep dive into CDN mechanics; how edge servers decide what to cache, purge APIs, and origin shield

---

*Part 9 · Client-Side vs Server-Side vs CDN Caching · Full Stack Interview Guide · Hruday D · 2026*
