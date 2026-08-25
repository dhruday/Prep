# CDN Caching — Edge vs Origin
> Part 9 — Caching Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Origin**: your actual server (AWS EC2, Kubernetes pod, Lambda) — the single source of truth
- **Edge**: CDN server near the user (CloudFront PoP in Mumbai, Cloudflare in Singapore) — serves cached content in 5–15ms vs 250ms to origin
- **Edge cache hit**: user gets response from the nearby edge server — never reaches your origin
- **Cache miss / bypass**: edge doesn't have it → fetches from origin → caches for future requests
- 🔥 At SAP, versioned Angular bundles were served from S3+CloudFront with `Cache-Control: immutable, max-age=31536000` — zero origin requests after first deployment deployment; static assets never touch our servers

---

## 1. One-Line Definition
CDN caching places copies of your content on edge servers distributed worldwide — users get content from a server physically close to them (low latency), while your origin server only handles cache misses and dynamic content that cannot be cached.

---

## 2. The Problem It Solves

Your startup is based in Bangalore and runs on an AWS region in Mumbai. You have users in London, Singapore, and New York. When a London user loads your product page, the HTTP request travels Bangalore → UK undersea cable → Mumbai servers → back to London. That round-trip is 250–300ms before your server even starts processing.

Now multiply this by every asset on the page: HTML, CSS, JavaScript bundles, product images, fonts. A page with 50 assets × 250ms round-trip = the page would take 12 seconds to load if downloads were sequential. With HTTP/2 parallelism it's better — but the physical distance problem remains. A user in London simply cannot get data from Mumbai faster than the speed of light over an undersea cable.

CDNs solve this by caching your content at ~300+ edge locations worldwide. A London user hits a CloudFront edge in Dublin (5ms away). The first user from anywhere triggers a fetch to your Mumbai origin, but every subsequent user from the same region gets the cached copy from the nearest edge — 5–15ms instead of 250ms. For a global product, this is not a nice-to-have; it is the difference between 1-second and 5-second page loads.

---

## 3. How It Works Internally

### The Mental Model
Imagine your restaurant is in Mumbai. Instead of making every customer fly to Mumbai to taste your food, you open franchise kitchens in London, Singapore, and New York. Each franchise makes a copy of your menu items and serves them locally. When a customer in London orders something not yet at the London kitchen, they wait while it gets made in Mumbai and shipped over — once. After that, the London kitchen has it and can serve all London customers instantly.

The Mumbai restaurant is your origin. The franchise kitchens are CDN edge nodes. "Not yet at the London kitchen" is a cache miss. "Already served it once" is a cache hit.

### The Mechanism — Step by Step

**Cache Miss (first request from a region):**
1. User in London requests `https://cdn.example.com/product.jpg`
2. DNS resolves to the nearest CDN edge server (Dublin PoP)
3. Edge checks its local cache — no entry found (cache miss)
4. Edge fetches from your origin server (`origin.example.com`) — 250ms round-trip
5. Origin responds with the image and `Cache-Control: max-age=86400`
6. Edge stores the response in its local cache with the TTL from `Cache-Control`
7. Edge forwards the response to the user — user receives the image (with some extra 250ms for first user)

**Cache Hit (subsequent requests):**
1. Second user (or same user on refresh) requests the same image
2. DNS → Dublin edge
3. Edge finds the image in its local cache (TTL not expired)
4. Edge responds directly — 5–15ms. Origin never contacted.

**Cache Invalidation at CDN:**
1. You update the product.jpg (new product image)
2. CDN still serves old image from all edge caches until TTL expires (could be 24 hours)
3. To serve fresh immediately: call CDN purge API (CloudFront: `CreateInvalidation`, Cloudflare: `POST /zones/{id}/purge_cache`)
4. Purge propagates to all edges within 5–30 seconds
5. Next request from any region triggers a fresh origin fetch

**CDN Cache Key:**
- Default: URL + optional `Vary` headers (e.g. `Vary: Accept-Encoding` means gzip and non-gzip get separate cache entries)
- Adding query params to cache key: `?v=42` creates a different cache key — useful for versioned assets
- Removing query params from cache key: CDN ignores `?utm_campaign=...` and serves the same cached object to all users regardless of UTM params (important for marketing links)

**Origin Shield (CloudFront feature):**
- Without origin shield: a cache miss from 50 edge PoPs = 50 concurrent origin requests
- With origin shield: a regional cache layer sits between edge PoPs and origin; misses from many edges are consolidated to one regional cache that forwards one request to origin
- Reduces origin load by eliminating stampede from cache misses across edges

### ASCII Diagram

```
User Geographic Regions → CDN Edge Network → Single Origin

London       ─────► [Dublin Edge PoP]─────────────┐
Singapore    ─────► [Singapore Edge PoP]───────────┤  Cache MISS only
Mumbai       ─────► [Mumbai Edge PoP]──────────────►  origin.example.com  
New York     ─────► [Virginia Edge PoP]─────────────┘  (Mumbai AWS)
São Paulo    ─────► [São Paulo Edge PoP]

Cache HIT: edge responds locally, origin never called
                                                       
Dublin PoP cache:
  product.jpg     ← fetched once from origin 18h ago, TTL 24h
  bundle.abc.js   ← fetched once, immutable (max-age=1year)
  homepage html   ← fetched once, TTL 5min (or stale-while-revalidate)

CloudFront Origin Shield (optional, reduces origin load):
London/Paris/Amsterdam misses → Regional cache (Frankfurt) → origin
Singapore/Japan misses → Regional cache (Tokyo) → origin
(one origin call per regional miss, not one per edge miss)
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Spring Boot serves everything directly — no CDN, no cache headers
@GetMapping("/products/{id}/image")
public ResponseEntity<byte[]> getProductImage(@PathVariable Long id) {
    byte[] imageData = productService.getProductImage(id);
    // No Cache-Control header — browser/CDN uses heuristic caching (unpredictable)
    // Every request for this image hits your origin server
    // 1,000 users in London = 1,000 round-trips to Mumbai origin
    return ResponseEntity.ok()
        .contentType(MediaType.IMAGE_JPEG)
        .body(imageData);
}
```
```typescript
// Angular app served without CDN — large bundles downloaded from origin on every visit
// In package.json scripts: "start": "ng serve" — no CDN deployment, no static asset serving
// 500KB bundle × 10,000 users per day = 5GB of origin bandwidth every day
```
> **Why this fails in production:** Every user in every region downloads assets from your single origin server. User experience degrades by region — a London user gets 250ms added to every request. Your origin bandwidth costs scale linearly with users. You've built a global product that only runs fast for users close to your data centre.

### Right Way — Production Quality

**Spring Boot — correct cache headers per content type:**
```java
@RestController
@RequestMapping("/api")
public class ProductController {

    // Product data API — short CDN TTL, user-specific data excluded from CDN
    @GetMapping("/products/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id) {
        Product product = productService.getProduct(id);
        return ResponseEntity.ok()
            // max-age=60: browser caches for 1 minute
            // s-maxage=3600: CDN caches for 1 hour (overrides max-age for shared caches)
            // stale-while-revalidate=300: CDN serves stale + revalidates for 5 more minutes
            // must-revalidate: browser must check origin after max-age expires (not serve indefinitely stale)
            .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS)
                .sMaxAge(3600, TimeUnit.SECONDS)
                .staleWhileRevalidate(300, TimeUnit.SECONDS)
                .mustRevalidate())
            .eTag(String.valueOf(product.getVersion()))
            .body(product);
    }

    // User-specific data — NEVER stored at CDN (private = CDN won't cache)
    @GetMapping("/users/{id}/cart")
    public ResponseEntity<Cart> getCart(@PathVariable Long id) {
        Cart cart = cartService.getCart(id);
        return ResponseEntity.ok()
            // private: CDN must not cache — only the user's browser may cache
            // no-store: do not cache at all (for highly sensitive data)
            .cacheControl(CacheControl.noStore())
            .body(cart);
    }

    // Static images — very long CDN TTL; versioned URL handles invalidation
    @GetMapping("/products/{id}/image/{version}")
    public ResponseEntity<byte[]> getProductImage(
            @PathVariable Long id, @PathVariable String version) {
        byte[] data = storageService.getProductImage(id, version);
        return ResponseEntity.ok()
            // immutable: cache for 1 year; don't revalidate — URL versioning handles invalidation
            // When image changes, URL changes (new version), old URL can remain cached forever
            .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).immutable())
            .contentType(MediaType.IMAGE_JPEG)
            .body(data);
    }
}
```

**CloudFront configuration (Terraform):**
```hcl
# AWS CloudFront distribution for API + static assets
resource "aws_cloudfront_distribution" "main" {

  # Origin: your Spring Boot service behind an ALB
  origin {
    domain_name = aws_lb.app_lb.dns_name
    origin_id   = "AppLoadBalancer"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Behaviour 1: Static assets (JS/CSS/images) — long cache, immutable
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    target_origin_id = "AppLoadBalancer"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = false    # ignore query params — content-hash in filename instead
      cookies { forward = "none" }
      # Do NOT forward cookies for static assets — avoid cache fragmentation
    }

    min_ttl     = 31536000   # 1 year minimum (content-hashed filenames)
    default_ttl = 31536000
    max_ttl     = 31536000

    viewer_protocol_policy = "redirect-to-https"
    compress               = true  # Gzip/Brotli compression at edge
  }

  # Behaviour 2: Product API — short cache, forward Auth header
  ordered_cache_behavior {
    path_pattern     = "/api/products/*"
    target_origin_id = "AppLoadBalancer"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = true   # forward query params — affects cache key
      cookies { forward = "none" }  # product API is not user-specific
      headers = ["Accept", "Accept-Encoding"]  # Vary by content type accepted
    }

    ttl_settings: # honours Cache-Control s-maxage from origin
    viewer_protocol_policy = "redirect-to-https"
  }

  # Behaviour 3: User-specific APIs — bypass CDN entirely (never cache)
  ordered_cache_behavior {
    path_pattern     = "/api/users/*"
    target_origin_id = "AppLoadBalancer"

    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      cookies { forward = "all" }     # forward session cookies
      headers = ["Authorization", "Cookie"]  # vary by auth — actually bypasses cache
    }

    min_ttl     = 0   # Cache-Control: no-store will be honoured
    default_ttl = 0
    max_ttl     = 0
  }
}
```

**Angular — content-hashed filenames so CDN caches can be immutable:**
```json
// angular.json — outputHashing ensures filenames include content hash
{
  "architect": {
    "build": {
      "options": {
        "outputHashing": "all"
        // Generates: main.abc123def456.js (hash changes when code changes)
        // Cache-Control: immutable, max-age=31536000 safe to set
        // When you deploy a new build, old hash URLs still work from CDN cache
        // New hash URLs get fresh origin fetch — zero downtime, zero cache invalidation needed
      }
    }
  }
}
```

```java
// When you DO need immediate CDN cache invalidation (content changed, no version in URL)
@Service
public class CdnInvalidationService {

    private final CloudFrontClient cloudFront;

    // Call this after updating product images or other CDN-cached content
    public void invalidateProductCache(Long productId) {
        String path = "/products/" + productId + "/*";
        cloudFront.createInvalidation(req -> req
            .distributionId("EXXXXXXXXXXXXX")    // from AWS CloudFront console
            .invalidationBatch(batch -> batch
                .paths(paths -> paths
                    .quantity(1)
                    .items(path))
                .callerReference(String.valueOf(System.currentTimeMillis()))
            )
        );
        log.info("CDN invalidation triggered for path: {}", path);
        // Invalidation propagates to all edge PoPs within 5–30 seconds
        // CloudFront charges per invalidation — batch paths to minimise cost
    }
}
```

> **Key decisions here:**
> - `s-maxage` controls the CDN TTL independently from `max-age` (which controls browsers) — always set both separately
> - Content-hash filenames (`main.abc123.js`) make long CDN TTLs safe for static assets — no purge needed on deploy; old hash URL stays cached (used by old browser tabs), new hash URL triggers fresh origin fetch
> - **Never forward Authorization/Cookie headers for public content** — forwarding Auth headers creates per-user cache keys, meaning the CDN caches T different copies per user (ineffective and expensive)
> - Origin Shield reduces origin load by 50–70% — worth adding when CDN miss rate is significant or when origin costs are high

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between edge and origin in a CDN, and when does traffic reach the origin?"

**Hruday's answer:**
> The origin is your actual server — your Spring Boot application running on AWS EC2 or in Kubernetes. It is the single source of truth. All writes go to the origin. The origin is responsible for generating correct responses.
>
> The edge is a CDN server in a physical location close to end users — London, Singapore, São Paulo, Sydney. There are typically 200–400 edge locations globally. The edge has no application logic; it just stores cached copies of responses it received from the origin.
>
> Traffic reaches the origin in three situations: a cache miss (this is the first request for this URL from this edge region, or the TTL has expired), a cache bypass (the response had `Cache-Control: private` or `no-store`), or a non-cacheable method (POST, PUT, DELETE — these always go to origin because they modify data).
>
> For a typical product page on an e-commerce site, the first user from a given region triggers origin fetches for each resource. Every subsequent user in that region gets responses from edge within 5–15ms. The CDN's value comes from the massive disparity in users: millions of users hit the cache versus the few thousand cache misses that actually reach origin.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain the difference between `max-age` and `s-maxage` in `Cache-Control` headers and why they matter for CDN caching."

**Hruday's answer:**
> `Cache-Control: max-age=N` tells both browsers (private caches) and shared caches (CDNs, proxy servers) to consider the response fresh for N seconds. It's a general instruction to everyone.
>
> `s-maxage=N` is specifically for shared caches — it overrides `max-age` for CDNs and proxies. Browsers ignore it entirely. This lets you set different policies: `max-age=60, s-maxage=3600` means browsers cache for 1 minute while CloudFront caches for 1 hour.
>
> Why would you want this difference? The CDN you control — you can call its purge API when data changes. You cannot make a user's browser flush its cache. So it's safe to give CDN a long TTL (1 hour) because you can invalidate it if needed. But the browser's 1-minute TTL means users who are actively browsing get reasonably fresh data without requiring a CDN purge.
>
> In the Spring Boot `CacheControl` builder, you chain `.maxAge(60, TimeUnit.SECONDS).sMaxAge(3600, TimeUnit.SECONDS)` to generate exactly this header combination. The CDN reads `s-maxage`, the browser reads `max-age`. They behave independently, which gives you fine-grained control over both caching layers.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the risks of aggressive CDN caching and how do you mitigate them?"

**Hruday's answer:**
> The biggest risk is serving stale content for the full TTL after data changes. If you set `s-maxage=86400` (24 hours) on a product page, a price change won't reach users for 24 hours unless you explicitly invalidate. The mitigation is keeping TTLs appropriate to data volatility — product descriptions can be 24 hours, prices should be shorter (1 hour or less with immediate purge on change), and user-generated content should not be CDN-cached at all.
>
> The second risk is cache poisoning: an attacker crafts a request that gets cached at the edge and served to other users. This is more theoretical but real — it happens when CDN cache key normalisation doesn't sanitise query parameters. Mitigation: strip unknown query params from cache keys in CloudFront's cache policy, and use WAF rules to reject requests with unusual headers.
>
> The third risk is accidentally caching personalised or sensitive data. If your `Authorization` header is forwarded to origin but NOT included in the CDN cache key, all requests with different auth tokens get the same cached response — one user could see another's data. Mitigation: always set `Cache-Control: private` or `no-store` on any response that contains user-specific data, and verify your CDN cache policy does NOT cache responses with `Authorization` headers.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the static asset delivery strategy for SAP's Angular SPA deployed to 50,000 enterprise users globally."

**Hruday's answer:**
> I'd use S3 as the origin store and CloudFront as the CDN. The Angular build pipeline generates content-hashed filenames — `main.abc123.js`, `styles.def456.css`. Each deploy produces new hash values when code changes.
>
> For static assets (JS, CSS, fonts, images), I'd set `Cache-Control: max-age=31536000, immutable` — a one-year browser cache with the `immutable` directive telling the browser: "don't even bother checking if this changed, the filename would be different if it did." CloudFront respects this and also caches for one year. This means after the first visit, a user on a second visit loads the app **entirely from browser cache** — zero network requests for static assets. Lighthouse performance score impact is immediate.
>
> For the `index.html` (the entry point), I'd set `Cache-Control: no-cache` — meaning "always revalidate before using." This forces the browser and CDN to check whether the HTML has changed on each visit. Since the JS file references in `index.html` are content-hashed, getting the updated `index.html` is sufficient to pick up a new deployment.
>
> On deployment: new build → S3 upload (new hash filenames) → CloudFront detects `index.html` changed (short TTL) → users get new `index.html` which references new JS hashes → new JS is fetched fresh (different cache key). No invalidation needed. Old JS bundles stay cached (harmless, any old browser tabs still work with the old version). This is zero-downtime deployment with perfect caching.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| max-age vs s-maxage confusion | "max-age controls the CDN TTL" | `max-age` controls browsers AND CDNs; `s-maxage` overrides it specifically for shared caches (CDNs) — always set both in production |
| Caching authenticated responses | "CDN caches everything for performance" | If Auth header is forwarded but not in cache key, all users get the same cached response = data leak. `Cache-Control: private` or `no-store` for any user-specific response |
| "Content changes, CDN purge required" | Any content change needs CDN purge | Content-hashed filenames eliminate the need to purge — changing content changes the filename/URL, so old URL stays cached legitimately and new URL is just never cached yet |
| "CDN is only for static files" | "Use CDN for images and bundles only" | API responses can also be CDN-cached with appropriate `s-maxage` — product catalog, deal feeds, and other public semi-static API responses can be cached at the CDN layer for significant origin offload |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we deployed our Angular SPA without a CDN strategy initially. Bundle sizes were 600–800KB, and users in the US and Europe reported slow initial load times because our origin was in a single AWS region. When I added CloudFront with correct `Cache-Control: immutable` headers on content-hashed bundles and `no-cache` on `index.html`, the improvement was dramatic — returning users loaded the app in under 200ms from browser cache, while new users in the US got response times under 100ms from the CloudFront edge nodes. This change contributed to pushing our Lighthouse performance score from 60 to 95. Content-hash + immutable cache + CDN is now my default Angular deployment pattern."

---

## 8. Scale Evolution

**1,000 users/day →** Serving from a single origin is fine. CDN is optional but starts to make sense as soon as you have users more than 500km from your data centre. S3+CloudFront costs pennies at this scale.

**100,000 users/day →** CDN becomes essential for any non-local market. Without it, international users experience 200–500ms latency penalties on every asset. Static assets MUST be on CDN with long TTLs. API responses for public content (product catalog) should have CDN caching with appropriate TTLs.

**10 million users/day →** CDN handles 80–90% of all traffic. Origin sees only cache misses and authenticated/user-specific requests. CDN spend is significant — optimise with Origin Shield to reduce origin calls on edge misses. Cache hit rate monitoring via CloudFront analytics becomes a key metric. Separate CDN distributions for different content types (static assets vs API). Edge computing (CloudFront Functions, Lambda@Edge) for lightweight request processing (URL redirects, header manipulation, A/B routing) at the edge without hitting origin.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment page assets, merchant dashboard bundles — globally accessible product; CDN is critical for international merchants and users; payment flow assets must load fast everywhere | Know `s-maxage` for API caching + content-hash immutable for bundles |
| Swiggy / Meesho | Product images, restaurant photos — content-heavy; CDN reduces image bandwidth cost by 80%+ and improves load time for regional users | Can you design CDN caching for a high-image product catalog with flash sale price changes? |
| Adobe / Microsoft | Creative asset delivery — large files (PSD, video, fonts); CDN with Origin Shield; `stale-while-revalidate` for template previews; `Cache-Control: private` for licensed content | Do you know how to differentiate CDN strategy for public pre-made vs licensed user-specific content? |
| SAP Labs | Angular enterprise SPA with global users — content-hash + CDN + immutable bundles is the exact Lighthouse 60→95 strategy used at SAP | Can you explain why `index.html = no-cache` while JS bundle = `immutable, max-age=1year` makes sense together? |

---

## 10. Related Topics — What to Study Next

- **Topic 155 — Client-Side vs Server-Side vs CDN Caching** — the three-layer overview; this topic is the CDN deep-dive within that framework
- **Topic 157 — Cache Invalidation Strategies** — CDN purge is the invalidation mechanism for CDN-cached content; how to trigger purge from application events
- **Topic 163 — Stale-While-Revalidate Pattern** — `stale-while-revalidate` and `stale-if-error` are HTTP directives that CDNs also honour; CDN + SWR is a powerful combination for public API responses
- **Topic 235 — Code Splitting and Lazy Loading** — the Angular/React build patterns that create content-hashed chunk files, which enable the immutable CDN caching strategy described in this topic
- **Topic 195 — EC2, S3, RDS — Core AWS Services** — S3 as origin for static assets + CloudFront as CDN is the standard AWS static hosting architecture; understanding S3 bucket policies for CDN access

---

*Part 9 · CDN Caching — Edge vs Origin · Full Stack Interview Guide · Hruday D · 2026*
