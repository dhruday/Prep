# Stale-While-Revalidate Pattern
> Part 9 — Caching Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Stale-While-Revalidate (SWR)**: return the cached (possibly stale) value immediately, then refresh it in the background — combines instant response + eventual freshness
- HTTP header: `Cache-Control: max-age=60, stale-while-revalidate=300` — browser serves fresh for 60s, stale-but-revalidating for the next 300s
- Server-side: Caffeine `refreshAfterWrite` implements SWR — serves stale while background thread queries DB
- Frontend: the SWR library (Tanstack Query) returns cached data immediately to the UI, then fetches fresh data and re-renders
- ✅ At SAP/Bosch: used this exact pattern in Angular + RxJS — local cache serves instantly while HTTP request runs; UI updates only when fresh data arrives — zero loading spinner for known data

---

## 1. One-Line Definition
Stale-While-Revalidate (SWR) is a caching strategy where an expired or near-expired cache entry is served immediately to the requester while a background refresh fetches new data — the requester gets instant response speed, and the cache gets fresh data for future requests.

---

## 2. The Problem It Solves

Classic caching gives you a binary: data is either fresh (cached, fast) or stale (not cached, slow). When the cache expires, the next user waits for the full DB query time — typically 20–200ms. Users see a loading spinner where they previously saw instant data.

This is particularly jarring in two scenarios. First, when data changes slowly — if your product catalog is refreshed every hour, making users wait 200ms on cache expiry every hour is unnecessary. The data from 5 minutes ago is almost certainly acceptable. Second, during a cache stampede (Topic 159) — when the TTL expires under high concurrency, thousands of users all wait for the DB simultaneously.

Stale-While-Revalidate solves both: the expired data is served instantly (zero wait for the user), and the refresh happens in the background for the benefit of the next user. The trade-off is a brief window where users see data that is 1–2 refresh cycles stale. For data where "5 seconds old" is acceptable, this is the right pattern.

---

## 3. How It Works Internally

### The Mental Model
Think of a morning newspaper. You subscribe to the paper. Every morning you get yesterday's edition. You read it over breakfast — it's good enough for most things. Meanwhile, the delivery truck is already on the road bringing today's edition. By the time you finish breakfast, the fresh paper is in your box. You never had to wait — you always had something to read.

SWR works the same way: serve what you have (yesterday's paper) immediately, while the refresh trucks are already running (today's paper coming). The user is never blocked waiting.

### The Mechanism — Step by Step

**HTTP SWR (browser and CDN):**
1. Response is served with `Cache-Control: max-age=60, stale-while-revalidate=300`
2. For the first 60 seconds: browser serves response from local cache (fresh, max-age not expired)
3. After 60 seconds: cache is "stale but revalidatable"
4. Next request in this window (60–360 seconds): browser returns the stale cached response **immediately** (no delay) AND sends a background conditional request to the server
5. Server responds (either 304 Not Modified or updated response) — browser updates its cache for next time
6. After 360 seconds total: entry is fully expired; next request waits for a full response (no more SWR window)

**Server-side SWR (Caffeine `refreshAfterWrite`):**
1. Cache entry has two timestamps: `write time` and `last access time`
2. After `refreshAfterWrite` duration passes, the entry is "stale-eligible for refresh"
3. Next request that accesses a stale entry: immediately returns the stale value AND triggers a background async `CacheLoader` call
4. Background call fetches from DB, updates the cache entry
5. Subsequent requests get the fresh value from cache (updated in background)
6. Entry is never removed during the refresh — it stays in cache until `expireAfterWrite` hits

**React SWR / Tanstack Query (frontend):**
1. Component mounts and calls `useQuery("product-42", fetchProduct)`
2. If cached: return cached data immediately — React renders instantly
3. In background: start a fresh fetch request to the API
4. When API responds: if data differs from cache, update state → component re-renders with fresh data
5. If API fails: stale data stays in UI — user isn't shown an error for data they were already seeing
6. This is "stale-while-revalidate": UI is always snappy, data is always eventually fresh

### ASCII Diagram

```
HTTP SWR Timeline:

T=0s         T=60s (max-age)     T=360s (max-age + swr window)
│            │                    │
├────────────┤────────────────────┤────────────────► time
│   FRESH    │  STALE (SWR zone)  │  EXPIRED (must wait)
│            │                    │
│ All reads  │ Returns stale + bg │ Full round-trip
│ from cache │ refresh triggered  │ required
│ (0ms)      │ (0ms for user)     │ (200ms wait)
│            │     ↑              │
│            │  background GET    │
│            │  updates cache     │

Server-Side (Caffeine refreshAfterWrite=5min, expireAfterWrite=10min):

T=0         T=5min (refreshAfter)   T=10min (expireAfter)
│           │                       │
├───────────┤───────────────────────┤───────► time
│  FRESH    │  stale, refresh zone  │  gone
│           │                       │
│ serves    │  next read: returns   │ serves from DB
│ from      │  stale + kicks off    │ (one-time miss)
│ cache     │  background DB call   │
│ (1ms)     │  (1ms, then fresh)    │
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```typescript
// React component — no stale-while-revalidate; loading spinner on every cache miss
function ProductPage({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Every time this component mounts, user sees loading spinner
    // Even if they just viewed the same product 30 seconds ago
    // Even if the data is almost certainly unchanged
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => { setProduct(data); setLoading(false); });
  }, [productId]);

  if (loading) return <Spinner />; // User sees this every single navigation
  return <ProductDetails product={product} />;
}
```
> **Why this fails in production:** The loading spinner appears on every page visit, even when the user just saw this product 10 seconds ago. The data is almost certainly the same. The user's experience is degraded for no benefit. At SAP, this pattern was the source of several "why does the page always flash a loading spinner" feedback items.

### Right Way — Production Quality

**Frontend SWR with Tanstack Query (React):**
```typescript
// Tanstack Query uses stale-while-revalidate by default
// staleTime: how long before data is considered stale (triggers background refetch)
// gcTime: how long to keep data in cache after all components unmount (garbage collect)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,     // 60 seconds — fresh (no background refetch during this window)
      gcTime: 5 * 60 * 1000,    // 5 minutes — keep in client cache even after component unmounts
      retry: 3,                  // retry on failure before showing error
      refetchOnWindowFocus: true // refetch when user comes back to browser tab
    }
  }
});

function ProductPage({ productId }: { productId: string }) {
  const { data: product, isLoading, isStale } = useQuery({
    queryKey: ['products', productId],
    queryFn: () => fetchProduct(productId),
    // staleTime: 5 minutes — product data changes infrequently
    // During these 5 minutes, serving cached data is correct behaviour
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) return <Spinner />;
  // isLoading is true ONLY on the very first request (no cache at all)
  // On subsequent renders: data is returned from cache IMMEDIATELY (~0ms)
  // while background refetch happens silently

  return (
    <div>
      {/* isStale shows a subtle indicator that data may be refreshing */}
      {isStale && <StaleIndicator refreshing />}
      <ProductDetails product={product} />
    </div>
  );
}
```

**Backend SWR with Spring Boot + Caffeine `refreshAfterWrite`:**
```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager(ProductRepository repo) {
        CaffeineCacheManager manager = new CaffeineCacheManager();

        manager.registerCustomCache("products",
            Caffeine.newBuilder()
                .maximumSize(10_000)
                // refreshAfterWrite: after 5 minutes, entry is "stale"
                // next read returns stale value AND triggers background DB call
                .refreshAfterWrite(5, TimeUnit.MINUTES)
                // expireAfterWrite: hard expiry at 10 minutes
                // if no read happens within 10 min of refresh, entry is fully evicted
                .expireAfterWrite(10, TimeUnit.MINUTES)
                .recordStats()
                // CacheLoader: called by background thread when refresh is triggered
                // Never called on the request thread — user is not blocked
                .build(new CacheLoader<Object, Object>() {
                    @Override
                    public Object load(Object key) throws Exception {
                        log.debug("SWR: background refresh for product key={}", key);
                        Long id = Long.parseLong(key.toString());
                        return repo.findById(id).orElse(null);
                    }

                    // reload() is key: called when the existing value is being refreshed
                    // receives the OLD value as input — allows conditional refresh
                    @Override
                    public Object reload(Object key, Object oldValue) throws Exception {
                        Long id = Long.parseLong(key.toString());
                        Product existingProduct = (Product) oldValue;
                        // Optional: check version BEFORE full fetch — saves DB round-trip
                        // if version hasn't changed, return the same old value
                        Long currentVersion = repo.findVersionById(id);
                        if (currentVersion != null && currentVersion.equals(existingProduct.getVersion())) {
                            log.debug("SWR: version unchanged for product {}, skipping refresh", id);
                            return oldValue;  // return old value — no change
                        }
                        return repo.findById(id).orElse(oldValue);  // return refreshed
                    }
                }));

        return manager;
    }
}
```

**HTTP SWR header in Spring Boot REST controller:**
```java
@GetMapping("/products/{id}")
public ResponseEntity<Product> getProduct(@PathVariable Long id) {
    Product product = productService.getProduct(id);

    // Cache-Control: max-age=60 — serve fresh for 60 seconds
    // stale-while-revalidate=300 — after 60s, serve stale for up to 300 more seconds
    //   during those 300s, browser sends a background revalidation request
    // stale-if-error=600 — if server returns error, serve stale for up to 600 more seconds
    //   (graceful degradation: serve stale rather than showing an error)
    CacheControl cacheControl = CacheControl
        .maxAge(60, TimeUnit.SECONDS)
        .staleWhileRevalidate(300, TimeUnit.SECONDS)
        .staleIfError(600, TimeUnit.SECONDS);

    return ResponseEntity.ok()
        .cacheControl(cacheControl)
        .eTag(String.valueOf(product.getVersion()))
        .body(product);
}
```

**Angular RxJS SWR pattern (component stays responsive while fetch happens):**
```typescript
// Angular service with SWR using BehaviorSubject + HTTP
@Injectable({ providedIn: 'root' })
export class ProductService {

  private cache = new Map<string, {data: Product, timestamp: number}>();
  private STALE_AFTER_MS = 5 * 60 * 1000;  // 5 minutes

  constructor(private http: HttpClient) {}

  getProduct(id: string): Observable<Product> {
    const cached = this.cache.get(id);
    const now = Date.now();

    if (cached) {
      const isStale = (now - cached.timestamp) > this.STALE_AFTER_MS;

      if (!isStale) {
        // Fresh: return cached immediately, no HTTP call
        return of(cached.data);
      } else {
        // Stale: return cached immediately AND kick off background HTTP request
        // Using concat: emit cached first, then emit fresh when it arrives
        // Component renders immediately with stale data, then re-renders with fresh
        const fresh$ = this.http.get<Product>(`/api/products/${id}`).pipe(
          tap(fresh => this.cache.set(id, {data: fresh, timestamp: Date.now()}))
        );
        // startWith(cached.data) emits the stale value BEFORE the HTTP response
        return fresh$.pipe(startWith(cached.data));
      }
    }

    // No cache at all: normal fetch
    return this.http.get<Product>(`/api/products/${id}`).pipe(
      tap(p => this.cache.set(id, {data: p, timestamp: Date.now()}))
    );
  }
}
```

> **Key decisions here:**
> - Caffeine's `reload()` method receives the OLD value — use it for version-check conditional refresh (avoid full DB re-read if nothing changed)
> - `stale-if-error` in HTTP Cache-Control provides graceful degradation: if the backend is down, browser continues serving cached (stale) data rather than showing a 503 to the user
> - Tanstack Query's `isLoading` is `true` only on first load with no cache; `isFetching` is `true` whenever a background refetch is in progress — this distinction lets you show a subtle refresh indicator without a blocking spinner
> - The Angular `startWith(cached.data)` pattern is the RxJS implementation of SWR: emit stale immediately, then emit fresh when HTTP completes

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What does `Cache-Control: stale-while-revalidate=300` mean in a HTTP response header?"

**Hruday's answer:**
> `stale-while-revalidate=300` extends the cache's useful lifetime beyond `max-age`. When combined with `max-age=60`, it creates two windows. The first window — 0 to 60 seconds — is the fresh window. The browser serves its cached copy with no network call.
>
> After 60 seconds, the entry is stale. But with `stale-while-revalidate=300`, instead of making the next request wait for a full round-trip, the browser returns its stale cached copy immediately — zero wait for the user — AND sends a background conditional request to the server to check for updates. The server either returns 304 Not Modified or a fresh response. Either way, the browser updates its cache for the next request.
>
> This "stale window" lasts from 60 seconds to 360 seconds (60 + 300). After 360 seconds, the entry is fully expired and the next request must wait for a full response.
>
> The user experience difference is significant: without SWR, a user hitting the page at second 61 sees a spinner while waiting for the server response. With SWR, they see the previous content instantly, and if the data changed, a silent re-render updates the UI 100ms later.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does Caffeine's `refreshAfterWrite` implement stale-while-revalidate server-side? What is the difference between `refreshAfterWrite` and `expireAfterWrite`?"

**Hruday's answer:**
> `expireAfterWrite` is a hard expiry. After the specified time, Caffeine removes the entry entirely. The next request finds a cache miss and must wait for the cache loader to fetch fresh data synchronously before returning.
>
> `refreshAfterWrite` is the SWR equivalent. After the specified time, the entry becomes "stale" but is NOT removed. When the next request hits this stale entry, two things happen simultaneously: the stale value is returned immediately to the requester — zero latency — and Caffeine schedules an asynchronous call to the `CacheLoader.reload()` method in a background thread. When the background fetch completes, Caffeine updates the entry in the cache. All subsequent requests get the fresh value.
>
> In practice I configure both together. `refreshAfterWrite: 5 minutes` drives the SWR refresh behaviour. `expireAfterWrite: 10 minutes` is a safety net — if no request hits the entry for 10 minutes (it was inactive), Caffeine removes it completely to free memory. The hard expiry prevents inactive entries from cluttering the cache indefinitely.
>
> The `CacheLoader.reload()` method is the advanced version — it receives the old value as a parameter. I use this to do a version check before the full DB query: if the version in the cache matches the current version in DB, I return the old value unchanged, saving a round-trip.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When is stale-while-revalidate the wrong choice? What data should you never serve stale?"

**Hruday's answer:**
> Stale-While-Revalidate is the wrong choice whenever the consequence of serving outdated data is a user-visible error or a financial/security impact.
>
> Account balances and payment status: if a user's balance is ₹10,000 and they just topped up ₹5,000, serving the stale ₹10,000 value for 5 more seconds could cause a legitimate transaction to be declined as insufficient funds. The cost of that stale read is a failed transaction.
>
> Inventory counts at checkout: serving stale inventory that shows "in stock" when the item actually sold out 3 seconds ago means the user completes checkout, payment is taken, and then a fulfilment failure happens downstream. This is worse than telling the user "sold out" at the search stage.
>
> Authentication and permissions: if a user's role has been revoked, serving a stale "admin" permission from cache (even for 30 seconds) is a security vulnerability.
>
> The rule: use SWR freely for display data (product descriptions, deal feeds, content) where 1–5 seconds of staleness is invisible to the user. Never use it for data that drives transactions, access control, or financial decisions. Those must always be fresh.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "How would you use SWR to improve the user experience on Adobe's asset browser where users browse thousands of creative templates?"

**Hruday's answer:**
> Adobe templates are a perfect SWR use case: they're read-heavy, change infrequently (maybe once a week when new templates are published), and showing a template that's 5 minutes stale is entirely acceptable — users won't notice.
>
> In the React frontend, I'd configure Tanstack Query with `staleTime: 10 * 60 * 1000` (10 minutes) on template list queries. When a user opens the template browser, templates display instantly from the client cache. Background revalidation fetches any updates silently. Since templates are enriched with user metadata (bookmarks, recent use) that changes more frequently, I'd set `staleTime: 60 * 1000` (1 minute) for that layer.
>
> On the Spring Boot backend, I'd serve templates from a Caffeine cache with `refreshAfterWrite: 30 minutes` — returning immediately from cache while background DB or CDN refresh happens. I'd include `Cache-Control: max-age=600, stale-while-revalidate=3600, stale-if-error=86400` in the HTTP response — the `stale-if-error` is key here: if Adobe's template service has a brief outage, users' browsers continue showing the last cached templates instead of a blank page, for up to 24 hours.
>
> This combination means a browsing session with 100 template views results in 2–3 actual API calls, not 100. Perceived performance is instant, and the creative workflow is never interrupted by loading states.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| refreshAfterWrite removes entry | "After refreshAfterWrite interval, entry is gone" | refreshAfterWrite does NOT remove the entry — it marks it stale and triggers background refresh; entry stays in cache throughout; only expireAfterWrite removes it |
| HTTP stale-while-revalidate support | "Not all browsers support it" | All major browsers (Chrome, Firefox, Safari, Edge) fully support it since 2021; it is safe to use in production |
| SWR for financial data | "Use SWR everywhere for performance" | Never use SWR for balances, permissions, inventory at checkout — stale financial data causes real failures; use SWR only for display data |
| Tanstack isLoading vs isFetching | "Both mean the same thing" | `isLoading` = no cached data yet, first fetch in progress (show spinner); `isFetching` = has cached data, background refresh in progress (show subtle indicator, not full spinner) |

---

## 7. Hruday's Real Experience Hook
> "At Bosch, I built a real-time industrial dashboard in Angular. Device telemetry data arrived via WebSocket every second, but configuration data (device names, thresholds, alert rules) was only updated by engineers maybe once per shift. Rather than re-fetching configuration on every component mount, I implemented a manual SWR pattern in my Angular service using `BehaviorSubject` and RxJS: emit the last-known configuration immediately, then update asynchronously when the HTTP response arrived. Components always rendered instantly with the last configuration while a background `refreshAfterWrite` check ran. The Bosch team noticed the dashboard felt much more responsive — no configuration loading spinners even after browser refreshes. I didn't know then that I was implementing SWR — I just knew the pattern felt right."

---

## 8. Scale Evolution

**1,000 users/day →** HTTP `stale-while-revalidate` header alone is sufficient. No server-side SWR needed. Adding it costs nothing and improves the experience for returning users who already have the page in their browser cache.

**100,000 users/day →** Caffeine `refreshAfterWrite` on the Spring Boot backend eliminates the brief latency spike when cache entries expire. Background refresh means the server-side cache never becomes a bottleneck — there's always a warm value available, even during refresh.

**10 million users/day →** Full SWR across all layers: HTTP headers for browser + CDN, Caffeine `refreshAfterWrite` for in-process cache, CDN background revalidation (CloudFront `stale-while-revalidate` behaviour), and Tanstack Query on the React frontend. The combination means virtually zero loading states for any data that was previously loaded. CDN `stale-if-error` provides resilience during origin outages. The system serves users during brief backend failures with no visible degradation.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction history, merchant dashboard — perfect SWR use case: display only, changes infrequently, immediate render expected; payment status is the hard exception (must be fresh) | Can you distinguish which data is SWR-safe vs must-be-fresh? |
| Swiggy / Meesho | Restaurant menu browsing, product catalog — users expect instant loads even on revisit; `stale-while-revalidate` in CDN and Tanstack Query in React | Know the HTTP Cache-Control `stale-while-revalidate` directive and how CDNs like CloudFront support it |
| Adobe / Microsoft | Creative template browser — hundreds of template card renders per session; SWR means each session does 2–3 API calls not 100; perceived performance = instant | Know Tanstack Query `isLoading` vs `isFetching` and how to show appropriate UI state for each |
| SAP Labs | Angular enterprise app — configuration data and master data loaded on every page; Angular SWR pattern with `startWith(cachedData)` in RxJS eliminates loading spinners on navigation | Know the RxJS `startWith` + `tap(cache.set)` pattern for manual SWR in Angular services |

---

## 10. Related Topics — What to Study Next

- **Topic 159 — Cache Stampede Prevention** — SWR's background refresh is one of the three stampede prevention strategies; understanding both topics together gives the full picture
- **Topic 162 — Cache Warming Strategies** — SWR and cache warming are complementary: warming prevents cold starts; SWR prevents stale-TTL latency spikes
- **Topic 155 — Client-Side vs Server-Side vs CDN Caching** — `stale-while-revalidate` applies at all three layers; understanding each layer helps you apply SWR correctly at each one
- **Topic 227 — React Query / Tanstack Query** — the standard frontend SWR implementation; `useQuery`, `staleTime`, `gcTime`, `isFetching` in depth
- **Topic 219 — Cold vs Hot Observables (RxJS)** — the Angular SWR pattern uses `startWith` and `tap` on a cold HTTP observable; understanding RxJS cold observables is prerequisite

---

*Part 9 · Stale-While-Revalidate Pattern · Full Stack Interview Guide · Hruday D · 2026*
