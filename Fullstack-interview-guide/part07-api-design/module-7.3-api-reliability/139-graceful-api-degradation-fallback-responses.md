# Graceful API Degradation — Fallback Responses
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Graceful degradation** is the design principle that a system under stress or partial failure should continue to provide reduced but useful functionality, rather than failing completely. Instead of returning a 500 or nothing, the degraded system returns a simplified, cached, or default response that keeps the core user flow working.
- **The key insight**: not all features are equally critical. "Place order" and "process payment" are core — they must always work. "Personalised recommendations" and "real-time inventory count" are enhancements — users can live without them for a few minutes. Graceful degradation means: protect the critical path at all costs, allow non-critical features to degrade without polluting the critical path.
- **Techniques**: (1) **Stale cache fallback** — when the live data source fails, serve the last-known value from Redis cache (data may be 5 minutes old — acceptable). (2) **Default/empty response** — when the recommendation engine is down, return an empty list (UI shows nothing; user can still check out). (3) **Feature flag kill switch** — turn off non-critical features (personalisation, live updates) during incident to reduce load on surviving systems. (4) **Async instead of sync** — when real-time processing fails, accept the request and process it asynchronously (202 Accepted + poll or webhook callback).
- **Degradation contract**: degraded responses should include `"degraded": true` in the response body. The frontend should check this flag and show appropriate UI messaging (e.g., hide recommendations section, show "live prices unavailable — prices may differ" notice).
- **Bulkhead pattern**: isolate failure domains so recommendation service degradation cannot physically affect checkout. Thread pool isolation or separate Kubernetes pods with separate resource limits.
- **Feature flags**: LaunchDarkly, Unleash, or a simple Redis-backed toggle. Allows instant kill-switch without code deployment.

---

## 1. One-Line Definition
Graceful API degradation is the deliberate design of reduced-but-functional responses when parts of the system are unavailable, ensuring core flows (checkout, payment, order placement) continue working while non-essential features fail silently.

---

## 2. The Problem It Solves

### All-or-Nothing vs Graceful Degradation

```
SCENARIO: Swiggy's home page loads data from 6 services:
  1. User Service         → greeting, order history tabs
  2. Restaurant Service   → nearby restaurants (core — user needs this to order)
  3. Recommendation Engine → personalised top picks (nice to have)
  4. Live Inventory       → real-time dish availability (nice to have)
  5. Promotions Service   → active coupons/offers (nice to have)
  6. Social Proof         → "32 people ordered this today" (nice to have)

ALL-OR-NOTHING APPROACH (no degradation):
  Recommendation Engine has an incident at 1:00 PM (lunch peak)
  
  Option A: Home page waits for all 6 services
    → Home page spins for 30 seconds waiting for Recommendation Engine timeout
    → Eventually returns 503 or blank screen
    → User cannot see restaurants at all
    → User cannot place an order
    → Revenue impact: ₹X per minute during lunch peak
    
  Option B: Call all 6 in parallel, fail if any fails
    → One service fails → entire page fails
    → 1 of 6 services having issues causes 100% customer impact
    → Reliability of the page = reliability of worst service = 99% × 99% × 99% × 99% × 99% × 99% = 94%
    → A page with 6 dependencies has 6% downtime from 1%-per-service incident rate

GRACEFUL DEGRADATION APPROACH:
  Recommendation Engine incident at 1:00 PM
  
  Restaurant Service - REQUIRED: wait for it; if it fails, show "try again" error (acceptable)
  Recommendation Engine - OPTIONAL: circuit already open → return empty list immediately
  Live Inventory - OPTIONAL: cache hit → return inventory from 5 minutes ago (prices may differ)
  Promotions Service - OPTIONAL: cache miss → return empty promotions list (no coupons shown)
  Social Proof - OPTIONAL: circuit open → hide section entirely (not critical)
  
  USER EXPERIENCE:
    Home page loads in 200ms
    Restaurants listed — user can order ✅
    Top picks section hidden or shows generic (not crash) ✅
    Promotions greyed out with "offers loading..." ✅
    "32 people ordered" not shown ✅
    
  Revenue impact: ~0
  Customer experience: 90% normal
  Engineering is paged for Recommendation Engine specifically — not for a full outage
  
THE ISOLATION QUESTION:
  Without bulkhead: Recommendation Engine's slow calls pile up
  Thread pool exhausted → RESTAURANT SERVICE calls now slow
  → Core flow degraded by non-critical service
  
  With bulkhead: separate thread pools per downstream
  Recommendation thread pool (10 threads) fills up → only recommendation calls fail
  Restaurant thread pool (50 threads) unaffected
  Core flow continues normally
```

---

## 3. How It Works Internally

### Degradation Strategy Matrix

```
FEATURE              TIER        DEGRADATION STRATEGY              USER IMPACT
──────────────────────────────────────────────────────────────────────────────
Checkout / Payment   CRITICAL    Never degrade — fail visibly       User sees error, can retry
Order placement      CRITICAL    Never degrade — fail visibly       User sees error, can retry
Product listing      CORE        Stale cache (up to 5 min)         Prices may be slightly stale
Search results       CORE        Stale cache (up to 10 min)        Results may not include new items
Recommendations      OPTIONAL    Empty list or generic items        Section hidden or shows default
Personalisation      OPTIONAL    Anonymous/default experience       User sees generic content
Live inventory count OPTIONAL    Stale cache or hide number         No "only 3 left" badge
User reviews         OPTIONAL    Stale cache or hide section        Review section shows "loading"
Social proof         OPTIONAL    Hide section entirely              "N people ordered" not shown
Coupons/offers       OPTIONAL    Empty promotions or hide           No coupon applied automatically

CACHE TTL HIERARCHY:
  Financial data (prices, inventory for checkout): <30s stale acceptable
  Product data (descriptions, images): <5min stale acceptable
  Recommendation data: <10min stale acceptable
  Static data (categories, menus): <1 hour stale acceptable
```

### Bulkhead Thread Pool Isolation

```
WITHOUT BULKHEAD:
  All downstream calls share one Tomcat thread pool (200 threads)
  
  Recommendation Engine starts timing out (5s each)
  30 concurrent users hit home page
  30 × 5s = 150 threads occupied waiting for Recommendation Engine
  
  ORDER service needs 5 threads to process orders
  Only 50 threads left in pool
  Performance degrades for orders
  
  RESULT: Non-critical service (recommendation) impacts critical service (orders)

WITH BULKHEAD:
  ┌─────────────────────────────────────────────────────────────┐
  │  RestaurantServiceClient     │ ThreadPoolBulkhead: 50 threads │
  │  OrderServiceClient          │ ThreadPoolBulkhead: 50 threads │
  │  PaymentGatewayClient        │ ThreadPoolBulkhead: 30 threads │
  │  RecommendationClient        │ ThreadPoolBulkhead: 10 threads │ ← separate, small
  │  PromotionsClient            │ ThreadPoolBulkhead: 10 threads │
  │  SocialProofClient           │ ThreadPoolBulkhead: 5 threads  │
  └─────────────────────────────────────────────────────────────┘
  
  Recommendation Engine times out: fills 10 recommendation threads
  Order thread pool: untouched, all 50 available
  Payment thread pool: untouched, all 30 available
  
  RESULT: Complete isolation. Recommendation failure = recommendation failure only.
```

---

## 4. The Code

### ❌ Wrong Way — Single Service Call, Hard Fail

```java
// ❌ WRONG: All-or-nothing approach — one failure cascades
@GetMapping("/home")
public ResponseEntity<HomePageResponse> getHomePage(@RequestHeader("X-User-Id") String userId) {
    // ❌ All three calls are required and blocking
    // ❌ If any one of them fails, the whole page fails
    // ❌ No timeout, no fallback, no isolation
    List<Restaurant> restaurants = restaurantService.getNearbyRestaurants(userId);
    List<Recommendation> recs = recommendationEngine.getRecommendations(userId);
    List<Offer> offers = promotionsService.getActiveOffers(userId);

    return ResponseEntity.ok(new HomePageResponse(restaurants, recs, offers));
}
```

---

### ✅ Right Way — Tiered Degradation with Fallbacks and Bulkhead

```java
// Home page service: compose required + optional data, fail independently
@Service
@RequiredArgsConstructor
@Slf4j
public class HomePageComposer {

    private final RestaurantService restaurantService;
    private final RecommendationClient recommendationClient;
    private final PromotionsClient promotionsClient;
    private final SocialProofClient socialProofClient;
    private final HomePageCacheService cacheService;
    private final FeatureFlagService featureFlags;

    public HomePageResponse composePage(String userId, String userLocation) {
        // ✅ REQUIRED: fetch concurrently; fail if this fails (it's core)
        CompletableFuture<List<Restaurant>> restaurantsFuture = CompletableFuture
            .supplyAsync(() -> restaurantService.getNearby(userId, userLocation));

        // ✅ OPTIONAL: all wrapped in individual try-catch with fallbacks
        CompletableFuture<List<Recommendation>> recsFuture = CompletableFuture
            .supplyAsync(() -> fetchRecommendationsWithFallback(userId));

        CompletableFuture<List<Offer>> offersFuture = CompletableFuture
            .supplyAsync(() -> fetchOffersWithFallback(userId));

        CompletableFuture<SocialProofData> socialFuture = CompletableFuture
            .supplyAsync(() -> fetchSocialProofWithFallback());

        try {
            // ✅ Wait for required data (will throw if it fails — correct)
            List<Restaurant> restaurants = restaurantsFuture.get(3, TimeUnit.SECONDS);

            // ✅ Wait for optional data with timeout — use fallback if they exceed it
            List<Recommendation> recs = getFutureWithFallback(recsFuture, List.of(), "recommendations");
            List<Offer> offers = getFutureWithFallback(offersFuture, List.of(), "offers");
            SocialProofData social = getFutureWithFallback(socialFuture, SocialProofData.empty(), "social");

            return HomePageResponse.builder()
                .restaurants(restaurants)
                .recommendations(recs)
                .offers(offers)
                .socialProof(social)
                // ✅ Tell frontend which sections degraded so it can show appropriate UI
                .degradedSections(buildDegradedSectionsList(recs, offers, social))
                .build();

        } catch (TimeoutException e) {
            log.error("Core restaurant service timed out for userId={}", userId);
            throw new ServiceUnavailableException("Unable to load restaurants. Please try again.");
        } catch (ExecutionException e) {
            log.error("Core restaurant service failed for userId={}", userId, e.getCause());
            throw new ServiceUnavailableException("Unable to load restaurants. Please try again.");
        }
    }

    // ✅ Recommendations with multi-layer fallback strategy
    @CircuitBreaker(name = "recommendations", fallbackMethod = "recommendationsCached")
    @Bulkhead(name = "recommendations")  // Isolated thread pool — cannot starve core services
    private List<Recommendation> fetchRecommendationsWithFallback(String userId) {
        // Feature flag: allow instant kill-switch during incidents
        if (!featureFlags.isEnabled("recommendation-engine")) {
            log.info("Recommendations feature flag is OFF — returning empty");
            return List.of();
        }
        return recommendationClient.getPersonalised(userId);
    }

    // First fallback: try stale cache
    private List<Recommendation> recommendationsCached(String userId, Throwable ex) {
        log.warn("Recommendations circuit open — trying cache. userId={}", userId);
        List<Recommendation> cached = cacheService.getRecommendations(userId);
        if (!cached.isEmpty()) {
            log.info("Returning {} stale recommendations from cache for userId={}", cached.size(), userId);
            return cached;
        }
        // No cache — return generic (non-personalised) fallback
        return cacheService.getGenericRecommendations();
    }

    // ✅ Offers with stale cache fallback
    @CircuitBreaker(name = "promotions", fallbackMethod = "offersCached")
    @Bulkhead(name = "promotions")
    private List<Offer> fetchOffersWithFallback(String userId) {
        return promotionsClient.getActiveOffers(userId);
    }

    private List<Offer> offersCached(String userId, Throwable ex) {
        log.warn("Promotions circuit open — trying cache. userId={}", userId);
        return cacheService.getOffers(userId);  // Returns empty list if cache miss — OK
    }

    // ✅ Social proof — low value, hide entirely if unavailable
    @CircuitBreaker(name = "socialProof", fallbackMethod = "socialProofEmpty")
    @Bulkhead(name = "socialProof")
    private SocialProofData fetchSocialProofWithFallback() {
        return socialProofClient.getSocialData();
    }

    private SocialProofData socialProofEmpty(Throwable ex) {
        return SocialProofData.empty();  // Frontend: if empty → hide the section, no error
    }

    private <T> T getFutureWithFallback(CompletableFuture<T> future, T fallback, String name) {
        try {
            return future.get(1, TimeUnit.SECONDS);  // 1s max for optional data
        } catch (Exception e) {
            log.warn("Optional section '{}' failed or timed out — using fallback", name);
            return fallback;
        }
    }
}
```

```java
// application.yml — Bulkhead configuration for isolation
// resilience4j:
//   bulkhead:
//     instances:
//       recommendations:
//         maxConcurrentCalls: 10       # Max 10 recommendation calls at once
//         maxWaitDuration: 10ms        # If all 10 slots full: wait max 10ms, then fail fast
//       promotions:
//         maxConcurrentCalls: 10
//         maxWaitDuration: 10ms
//       socialProof:
//         maxConcurrentCalls: 5
//         maxWaitDuration: 5ms
//   circuitbreaker:
//     instances:
//       recommendations:
//         slidingWindowSize: 50
//         failureRateThreshold: 40     # More aggressive for optional service
//         waitDurationInOpenState: 60s # Stay open longer — non-critical
//         minimumNumberOfCalls: 10
//       promotions:
//         slidingWindowSize: 30
//         failureRateThreshold: 50
//         waitDurationInOpenState: 30s
```

### TypeScript React — Handle `degraded` Flag in Frontend

```typescript
interface HomePageResponse {
  restaurants: Restaurant[];
  recommendations: Recommendation[];
  offers: Offer[];
  socialProof: SocialProofData;
  degradedSections: string[];  // ['recommendations', 'offers'] when those sections degraded
}

const HomePage: React.FC = () => {
  const { data, isLoading, error } = useQuery<HomePageResponse>({
    queryKey: ['homePage'],
    queryFn: fetchHomePage
  });

  if (error) {
    // Core data (restaurants) failed — show a meaningful error, not blank page
    return <RetryableError message="Unable to load restaurants. Please try again." />;
  }

  const isDegraded = (section: string) => data?.degradedSections?.includes(section);

  return (
    <div>
      <RestaurantList restaurants={data?.restaurants ?? []} />

      {/* Recommendations: hide section if degraded, show skeleton if loading */}
      {!isDegraded('recommendations') && (
        <RecommendationsSection
          items={data?.recommendations ?? []}
          isLoading={isLoading}
        />
      )}

      {/* Offers: show "Offers unavailable" notice if degraded — don't hide silently for financial data */}
      {isDegraded('offers') ? (
        <OffersUnavailableNotice />
      ) : (
        <OffersSection offers={data?.offers ?? []} />
      )}

      {/* Social proof: silently hide if degraded — low information value */}
      {!isDegraded('socialProof') && data?.socialProof && (
        <SocialProofBadge data={data.socialProof} />
      )}
    </div>
  );
};
```

### Feature Flag Kill Switch — Redis-Backed

```java
// Simple Redis-backed feature flag for runtime kill switch
@Service
@RequiredArgsConstructor
@Slf4j
public class FeatureFlagService {

    private final RedisTemplate<String, String> redis;

    // Check if feature is enabled (default: true if key not set)
    public boolean isEnabled(String featureName) {
        String value = redis.opsForValue().get("feature:" + featureName);
        if (value == null) return true;  // Not set → enabled by default
        return !"false".equalsIgnoreCase(value);
    }

    // Disable a feature (call from admin endpoint during incident)
    // redis.opsForValue().set("feature:recommendation-engine", "false")
    // To re-enable: redis.delete("feature:recommendation-engine")
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Strategy Definition
**Interviewer asks:** "A third-party recommendation API that your home page depends on goes down. How do you ensure users can still place orders?"

**Hruday's answer:**
> The first design decision is feature tiering: is the recommendation API on the critical path for order placement? No — users don't need recommendations to browse restaurants and place orders. Recommendations are an enhancement, not a core feature. That classification drives the architecture.
>
> In the code, I separate required calls (restaurant listing) from optional calls (recommendations). Required calls: if they fail, the page fails — that's correct, the user needs restaurants to order. Optional calls: wrapped in circuit breakers with `@CircuitBreaker` fallback methods. When the recommendation API goes down, the circuit opens after the failure threshold (say 50% failure rate in last 50 calls). Every subsequent call fast-fails and goes to the fallback.
>
> The fallback strategy has layers: first, try the Redis stale cache (recommendations from the last successful call, up to 10 minutes old). If cache hit: return stale — the user gets recommendations, just not fresh ones. If cache miss: return an empty list or a generic (non-personalised) list. The frontend checks if `degradedSections` in the response includes 'recommendations' and either hides the section or shows a generic placeholder. Either way, the restaurant listing and checkout button are unaffected.
>
> As an emergency measure: a Redis-backed feature flag `feature:recommendation-engine` that engineering can flip to `false` in 10 seconds during an incident, routing all recommendation calls to the emergency fallback without waiting for the circuit breaker to trip.

---

### Q2 — Frontend Contract
**Interviewer asks:** "How should the API communicate to the frontend that a response is degraded?"

**Hruday's answer:**
> The API response includes a `degradedSections` array that lists which parts of the response are degraded. For example: `{ "restaurants": [...], "recommendations": [], "offers": [...], "degradedSections": ["recommendations"] }`. The frontend checks this field and adjusts the UI accordingly.
>
> Why explicit signalling rather than inferring from empty arrays? An empty recommendations array is ambiguous — it could mean "the API genuinely has no recommendations for this user" or "recommendations are degraded." If the frontend just shows nothing in both cases, that's fine for recommendations. But for offers/coupons, an empty list that looks like "no offers" when the reality is "offers service is down" could mislead users into missing valid coupons they're entitled to. The `degradedSections` flag lets the frontend distinguish and show "offers temporarily unavailable" instead of "no offers available."
>
> For financial data: never silently degrade. If the checkout price calculation API is returning a stale price, the response must include a warning that the price may have changed and prompt the user to confirmed before payment. Silent degradation on financial data creates trust and regulatory issues.

---

### Q3 — Async Degradation
**Interviewer asks:** "What is the 202 Accepted pattern and when do you use it for degradation?"

**Hruday's answer:**
> 202 Accepted means "I received your request and I'll process it, but I haven't finished yet." The response immediately returns a job ID or status URL. The client either polls for the result or receives a webhook callback when processing completes. The connection is released in milliseconds.
>
> This is a degradation strategy for operations that normally work synchronously but must degrade to async when the downstream is slow or partially unavailable. Example: generating a large financial report normally takes 3 seconds. During high load, the report generation service is backlogged. Instead of holding the connection for 3 seconds and risking timeout: return `202 Accepted` with `Location: /api/reports/RPT-42/status`. The client polls that endpoint (or receives a webhook) when the report is ready.
>
> Another example: document submission during a processing backlog. The user submits a document. Normally it's validated in 200ms and a result is returned. Under load, validation is backed up. Return 202 with a status URL. The document is queued in Kafka; processing happens when capacity is available; the status endpoint transitions from QUEUED → PROCESSING → COMPLETE. The user sees progress.
>
> The distinction from full failure: 503 Service Unavailable means "try again later, I can't help you now." 202 Accepted means "I have your request and WILL process it — you'll get a result, just not instantly." The semantic difference is significant for user trust. At SAP Labs, we used this pattern for financial batch jobs that would otherwise block the user's browser for minutes.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Degrade everything to the same fallback" | "When a service fails, return an empty response for that section" | "The fallback strategy must match the section's role and data sensitivity. 'Return empty' works for social proof (nobody cares if the '32 people ordered' badge disappears). It's wrong for offers (user is owed coupons — returning empty silently denies their discount without telling them). It's critically wrong for price data (returning a stale price without warning can result in a user paying a different price than displayed). The fallback strategy is: hide silently (social proof), show 'unavailable' message (offers), show 'price may have changed' warning (price data), never touch (payment processing). One size does not fit all." |
| "Cache everything with a long TTL as fallback" | "Store responses in Redis with a 24-hour TTL so we always have fallback data" | "Stale cache TTL must match business tolerance, not be set to a convenient long duration. For restaurant listings: 5 minutes stale is acceptable — a restaurant won't change its menu or close in 5 minutes. For real-time inventory ('only 3 left!'): 30 seconds stale acceptable — overselling 3 items is a minor operational issue, not a crisis. For price information used at checkout: maximum acceptable staleness is 30-60 seconds, and even then the user must see a warning. For payment confirmation: NEVER cache — the result of a payment must always be fresh from the source of truth. A 24-hour TTL on payment responses would be catastrophic — a user retrying a failed payment would get the old failed response from cache instead of trying again. Cache TTL = how bad it would be if a user acted on stale data × how likely they are to." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs in the CFIN platform, we had a dependency on an SAP BW reporting service that was consistently slow during month-end close — 15-30 second response times, sometimes timing out. The financial controller dashboard component depended on this data for subsidiary reporting. Originally, when BW was slow the entire CFO dashboard failed to load — including completely unrelated components like the GL balance view and cost center hierarchy which had no dependency on BW. We refactored to tiered loading: core GL data (required, fast, from HANA directly), BW data (optional, wrapped in circuit breaker with stale Redis cache fallback). The dashboard now loads in under 2 seconds with core data always. If BW is slow, the BW-powered sections show 'Reporting data is being refreshed — last updated: 2h ago' with a manual refresh button. The circuit breaker automatically closes when BW performance normalises after batch windows. Month-end P1 incidents for this dashboard dropped from 3/month to 0."

---

## 8. Scale Evolution

**Single service →** `@CircuitBreaker` + `@Bulkhead` on optional dependency calls. Fallback methods return stale cache or empty. `degraded: true` in response where applicable.

**Multiple services →** Composition layer (BFF or aggregator service) orchestrates required vs optional calls. `CompletableFuture.allOf` for required data, individual futures with 1s timeout for optional. Feature flag service in Redis for runtime kill switches per feature.

**Platform-level degradation →** Chaos engineering: deliberately degrade non-critical services in pre-prod to verify fallbacks work correctly (Netflix Chaos Monkey pattern). SLO / Error budget: track degraded response rate separately from error rate — degraded responses count against "reduced quality" SLO, not against "availability" SLO. Observability: custom Prometheus metric `api_degraded_response_total{section="recommendations"}` — spikes indicate which sections are degrading before users notice.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment processing is non-negotiable — never degrade silently. But ancillary features (transaction analytics dashboard, rewards engine, offer matching) can degrade gracefully without impacting money movement. Feature flags for instant kill-switch during incidents. | "During a Black Friday spike, Razorpay's fraud scoring service becomes slow. How do you ensure payments continue processing while the fraud service is overloaded?" |
| Swiggy / Meesho | Flash sales depend on many optional services (social proof, personalisation). Must isolate core order flow (restaurant listing → cart → checkout → payment) from non-core enhancements. 202 Accepted for post-order operations (loyalty points, review requests). | "Design Swiggy's home page so that if the recommendation engine goes down at 1pm peak, users can still browse restaurants and order — without any degradation to the checkout flow." |
| Adobe / Microsoft | Creative Cloud: if the AI generation service is slow, degrade to manual editing (still useful, just slower). GitHub: if code analysis is slow, show code without inline suggestions (still usable). Azure: auto-scale triggers before degradation needed — but circuit breaker + graceful fallback is the safety net. | "Adobe's AI background removal service hits capacity during peak. How do you ensure Photoshop web users can still edit and save their work even when the AI feature is unavailable?" |
| SAP Labs (current) | ERP integrations: if BW reporting is slow, degrade reporting sections but keep core financial data entry working. CFIN dashboard: required GL data vs optional BW reporting tier. SAP Integration Suite supports degradation policies in its API backend configuration. | "During month-end close, SAP BW reporting becomes slow due to overnight batch jobs. How do you design the finance dashboard to remain usable for GL processing while BW data refreshes?" |

---

## 10. Related Topics — What to Study Next

- **Topic 138 — Circuit Breaker at API Level** — graceful degradation defines WHAT to return when things fail; circuit breaker defines WHEN to take that path; the fallback method in `@CircuitBreaker` is the degradation response; these two topics are deeply interconnected and always appear together in resilience architecture discussions
- **Topic 135 — Rate Limiting** — both rate limiting and graceful degradation are responses to the system being under stress; rate limiting is the proactive approach (reduce load by capping requests); graceful degradation is the reactive approach (serve reduced quality under load); understanding both gives the full picture of resilience under traffic spikes
- **Topic 103 — Redis Caching** — the stale cache fallback strategy for graceful degradation is built entirely on Redis; understanding Redis TTL, cache-aside pattern, cache stampede prevention (probabilistic early expiry), and cache invalidation strategies is essential to implementing degradation correctly without serving dangerously stale data
- **Topic 202 — SPA vs SSR** — the 202 Accepted / async degradation pattern interacts with frontend architecture; SPAs can poll for async results or use SSE for push notification; SSR pages can show a progress page with auto-refresh; understanding the rendering model affects how async degradation is surfaced to users

---

*Part 7 · Graceful API Degradation — Fallback Responses · Full Stack Interview Guide · Hruday D · 2026*
