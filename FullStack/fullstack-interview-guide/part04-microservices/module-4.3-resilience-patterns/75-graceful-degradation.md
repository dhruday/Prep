# Graceful Degradation — Fallback Responses
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Graceful degradation = when part of the system fails, the system continues to function in a reduced but acceptable mode — users get a degraded experience rather than a complete failure
- Core principle: classify every feature as CRITICAL (must work for core user flow) vs NON-CRITICAL (improves experience but not required); degrade non-critical features; protect critical ones
- Fallback types: **cached data** (stale but better than nothing), **default/placeholder response** (empty cart, generic recommendations), **alternative service** (primary payment rail down → try secondary), **reduced functionality** (dashboard missing analytics but orders still work)
- Anti-pattern: silent fallback — serving stale/wrong data without telling the user, logging nothing, and not alerting operations; graceful degradation must be observable
- The graceful degradation conversation always comes up as: "What happens to your system during a dependency outage?" — this is the answer
- Gap to bridge: knowing what a fallback IS versus knowing how to DESIGN the entire degradation strategy (which features degrade, what the fallback provides, how it's communicated to users) is the Senior Engineer answer

---

## 1. One-Line Definition
Graceful degradation is a system design strategy that maintains core user functionality when secondary or non-critical components fail, replacing the failed component's output with a predefined fallback — cached, default, or alternative — rather than returning an error or failing completely.

---

## 2. The Problem It Solves

A food ordering app has these features on the home screen:
1. List of restaurants near the user (core — users came to order food)
2. Personalised recommendations (nice to have — AI model suggests restaurants)
3. Promotions banner (marketing — shows current deals)
4. Order history (recent orders — 3 tap shortcut to re-order)
5. Search functionality (core — users search for specific food)

On a busy Friday night, the ML-based recommendation service goes down. There are two possible responses:

**Response without graceful degradation**: the home screen loads and shows an error page for the entire screen, because the BFF cannot assemble a complete response with recommendations missing.

**Response with graceful degradation**: the home screen loads WITHOUT recommendations. Restaurant list is there. Search works. Recent orders work. Promotions might show a generic banner. The user can still order food — they just don't have personalised recommendations tonight. 98% of the user experience is preserved.

The difference: one approach treats every dependency as equally critical, causing total failure when any one of them fails. The other classifies dependencies as critical vs non-critical and degrades gracefully.

Graceful degradation is the difference between a partial outage (recommendation service down) and a complete outage (entire app unusable). At Swiggy scale — millions of users — even a 5-minute complete outage during peak dinner hours costs lakhs of rupees and user trust. A degraded experience with no recommendations costs almost nothing.

---

## 3. How It Works Internally

### Classifying Features for Degradation

The design exercise for graceful degradation:

| Feature | Critical? | Degradation if component fails |
|---------|-----------|-------------------------------|
| Restaurant listing by location | YES | No degradation possible — this IS the app |
| Search for specific restaurant | YES | No degradation — core feature |
| Personalised recommendations | NO | Show popular restaurants in user's city |
| Active promotions banner | NO | Show a static "10% off first order" default banner |
| Order history shortcut | NO | Hide the section or show empty state |
| Real-time delivery ETA | PARTIAL | Show estimated range ("25-40 min") instead of live ETA |
| Payment via UPI | YES | Try card payment as fallback; both down → show error |
| Analytics/tracking events | NO | Drop events silently; user never sees this |

### Fallback Strategy Types

**Type 1 — Cached Data (Stale Cache)**
Store the last good response. On downstream failure, serve the stale response with a `from-cache` indicator or a "data may be slightly delayed" notice.
- Best for: slowly-changing data (restaurant details, menu, user profile)
- Works poorly for: real-time data (stock prices, live location tracking)
- Implementation: Redis TTL-based cache with a longer "stale" TTL than normal

**Type 2 — Default/Placeholder Response**
Return a sensible default when the real data is unavailable.
- Best for: recommendations, personalisation, non-critical enhancements
- Example: recommendation service down → return top-10 most-ordered restaurants in the city
- Example: user profile service down → show "Welcome, User!" instead of personalised greeting

**Type 3 — Alternative Service (Secondary)**
Route to a backup service or provider when the primary fails.
- Best for: critical paths with an alternative (primary payment rail → secondary payment rail)
- Example: fraud detection model A down → use rule-based fraud check B (less accurate but present)
- Example: primary SMS provider down → secondary SMS provider

**Type 4 — Reduced Functionality**
Serve the page without the failed component's section. Don't render that part of the UI.
- Best for: page sections that enhance experience but aren't required
- Example: analytics widgets on the admin dashboard — can show "Data temporarily unavailable" for those tiles while the rest of the dashboard is functional

**Type 5 — Optimistic Response**
Proceed as if the operation succeeded; reconcile later.
- Best for: non-reversible quick actions (analytics event tracking, notifications sent)
- Example: inventory check service down → proceed with order for small quantities (optimistically assume in stock); inventory reconciliation job ran later

### The Degradation Decision Tree

```
Downstream service call fails
          ↓
Is this feature CRITICAL to the user's core need?
          ↓
    YES ─────────────────────────────→ Error + Retry + Circuit Breaker
                                       Cannot gracefully degrade a critical feature
                                       (could try secondary service if one exists)
          ↓
    NO
          ↓
Do I have a valid cached version of this data?
          ↓
    YES → Serve stale cache + log degradation event + metric increment
          ↓
    NO
          ↓
Do I have a meaningful generic default?
          ↓
    YES → Serve default + flag in response (X-Degraded: recommendations)
          ↓
    NO
          ↓
Hide the feature entirely from UI (graceful omission)
Log, alert, increment degradation counter
          ↓
Is degradation ongoing for >5 minutes?
    YES → Alert on-call engineer (degraded state is observable, not silent)
```

---

## 4. The Code

### BFF with Graceful Degradation — Parallel Calls with Individual Fallbacks
```java
@RestController
@RequestMapping("/api/mobile/v1")
@Slf4j
public class MobileHomeBff {

    private final RestaurantServiceClient restaurantClient;
    private final RecommendationServiceClient recommendationClient;
    private final PromotionServiceClient promotionClient;
    private final OrderHistoryServiceClient orderHistoryClient;
    private final DegradationMetrics degradationMetrics;  // Micrometer counter

    @GetMapping("/home")
    public Mono<MobileHomeResponse> getHomeScreen(
            @RequestHeader("X-User-ID") String userId,
            @RequestParam String lat, @RequestParam String lng) {

        // CRITICAL features — must succeed; don't catch failures here, let them propagate
        Mono<List<RestaurantCard>> restaurantsMono =
            restaurantClient.getNearbyRestaurants(lat, lng, 20)
                            .timeout(Duration.ofMillis(3000));  // Timeout but no fallback — it's critical

        // NON-CRITICAL features — each has an independent fallback
        Mono<List<RecommendationCard>> recsMono =
            recommendationClient.getPersonalised(userId, 5)
                .timeout(Duration.ofMillis(1500))
                .onErrorResume(ex -> {
                    // ANY failure from recommendations → return popular fallback
                    log.warn("RecommendationService unavailable for userId={}: {}", userId, ex.getMessage());
                    degradationMetrics.increment("recommendations.degraded");
                    return restaurantClient.getPopular(lat, lng, 5)  // Fallback: popular restaurants
                                          .map(this::toRecommendationCards);
                });

        Mono<PromotionBanner> promoMono =
            promotionClient.getActivePromotion(userId)
                .timeout(Duration.ofMillis(800))
                .onErrorReturn(defaultPromoBanner());  // Static default banner on any failure

        Mono<List<RecentOrderCard>> recentOrdersMono =
            orderHistoryClient.getRecent(userId, 3)
                .timeout(Duration.ofMillis(1000))
                .onErrorReturn(List.of());  // Empty list — hide the section gracefully

        // Assemble response — each component has its own failure handling
        // If a NON-CRITICAL component fails → fallback applied independently
        // If a CRITICAL component fails → the whole Mono fails (correct)
        return Mono.zip(restaurantsMono, recsMono, promoMono, recentOrdersMono)
                   .map(tuple -> MobileHomeResponse.builder()
                           .restaurants(tuple.getT1())         // Always present (critical)
                           .recommendations(tuple.getT2())     // Present or fallback
                           .promotionBanner(tuple.getT3())     // Present or default
                           .recentOrders(tuple.getT4())        // Present or empty
                           .degraded(isDegraded(tuple))        // Flag if any fallback used
                           .build())
                   .timeout(Duration.ofMillis(5000));  // Total BFF response deadline
    }

    private PromotionBanner defaultPromoBanner() {
        return new PromotionBanner("default", "Get ₹50 off your first order!", null);
    }

    private boolean isDegraded(Tuple4<?, ?, ?, ?> tuple) {
        // Check metadata flags from each component to detect if fallback was used
        // Simple implementation: always false here; real impl checks degradation flags
        return false;
    }
}
```

### Circuit Breaker with Meaningful Fallback
```java
@Service
@Slf4j
public class PaymentServiceClient {

    private final WebClient primaryPaymentWebClient;
    private final WebClient secondaryPaymentWebClient;  // Alternative provider

    @CircuitBreaker(name = "primaryPaymentService", fallbackMethod = "chargeViaSecondary")
    public Mono<PaymentResult> charge(PaymentRequest request) {
        return primaryPaymentWebClient.post()
                .uri("/api/v1/charge")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(PaymentResult.class);
    }

    // Fallback for critical feature: try secondary payment provider
    // (NOT a silent fallback — this is a documented alternative path)
    private Mono<PaymentResult> chargeViaSecondary(PaymentRequest request, Throwable ex) {
        log.warn("Primary payment service unavailable for orderId={}. Routing to secondary.",
                 request.getOrderId());

        // Emit a metric so operations knows about the degraded payment path
        meterRegistry.counter("payment.route", "path", "secondary").increment();

        return secondaryPaymentWebClient.post()
                .uri("/api/v1/charge")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(PaymentResult.class)
                .onErrorMap(secondaryEx -> new PaymentUnavailableException(
                    "Both payment providers unavailable: primary=" + ex.getMessage()
                    + ", secondary=" + secondaryEx.getMessage()
                ));
        // If secondary also fails → payment cannot be processed → real error to user
        // This is the correct behaviour for a CRITICAL feature with no further fallback
    }
}
```

### Stale Cache Fallback with Redis
```java
@Service
@Slf4j
public class ProductCatalogCacheService {

    private final RedisTemplate<String, ProductDetails> redisTemplate;
    private final CatalogServiceClient catalogClient;

    private static final Duration FRESH_TTL = Duration.ofMinutes(5);    // Normal cache
    private static final Duration STALE_TTL = Duration.ofHours(1);      // Extended for degraded mode

    public Mono<ProductDetails> getProduct(String productId) {
        String cacheKey = "product:" + productId;

        return catalogClient.getProduct(productId)
                .timeout(Duration.ofMillis(1500))
                .doOnNext(product -> {
                    // Successful fetch — update cache with fresh TTL
                    redisTemplate.opsForValue().set(cacheKey, product, FRESH_TTL);
                })
                .onErrorResume(ex -> {
                    // Service failed — try stale cache
                    log.warn("CatalogService unavailable for productId={}. Checking stale cache.", productId);

                    ProductDetails cached = redisTemplate.opsForValue().get(cacheKey);
                    if (cached != null) {
                        log.info("Serving stale cache for productId={}. Age may be up to 1 hour.", productId);
                        // Extend TTL — keep the stale data alive while service is down
                        redisTemplate.expire(cacheKey, STALE_TTL);
                        return Mono.just(cached.withStaleFlag(true));  // Mark as stale in response
                    }

                    // No cache — cannot degrade further for product detail
                    return Mono.error(new ProductUnavailableException(
                        "Product details unavailable: service down and no cache. productId=" + productId));
                });
    }
}
```

### Degradation Observability — Alert on Degraded State
```java
@Component
@Slf4j
public class DegradationMonitor {

    private final MeterRegistry meterRegistry;

    // Track how often each fallback is served
    public void recordDegradation(String componentName, String reason) {
        Counter.builder("degradation.events")
               .tag("component", componentName)
               .tag("reason", reason)
               .register(meterRegistry)
               .increment();

        log.warn("DEGRADED: component={} reason={}", componentName, reason);
    }

    // Alert if degradation rate is sustained (not just a spike)
    @Scheduled(fixedDelay = 60_000)  // Check every minute
    public void checkSustainedDegradation() {
        // Query last 5-minute degradation rates for critical non-critical services
        // If recommendations degradation rate > 50% for 5 minutes → alert on-call
        // The alert is "Non-critical degradation sustained — RecommendationService likely down"
        // NOT a PagerDuty wake-up call — lower severity alert (Slack alert)
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is graceful degradation in microservices and how do you implement it?"

**Hruday's answer:**
> Graceful degradation is a resilience strategy where you decide in advance what each part of your system should do if one of its dependencies fails — rather than failing completely, you serve a reduced-quality but functional response.
>
> The implementation starts with a classification exercise: which features are critical to the user's core need, and which are enhancements? For a food ordering app, showing the restaurant list is critical; personalised recommendations are not. When the recommendation service fails, the restaurant list still shows — you just serve popular restaurants as the default instead of personalised ones.
>
> In code, the pattern is: on a downstream call failure, instead of propagating the exception, return a meaningful fallback. In Spring WebFlux, `onErrorReturn(defaultValue)` or `onErrorResume(fallbackMono)`. In Spring Cloud CircuitBreaker, the fallback method. The fallback should be: a stale cached value, a sensible default, an alternative service, or (for sections that have no meaningful fallback) an empty/hidden state in the UI.
>
> The critical discipline: degradation must be observable. Log each fallback usage, increment a metric counter, and alert if degraded state is sustained for more than a few minutes. Silent degradation — serving wrong/stale data without logging or alerting — is worse than a clean error message because you won't know the system is operating incorrectly.

---

### Q2 — Design Challenge
**Interviewer asks:** "Swiggy's recommendation engine is down for 30 minutes during peak dinner time. Walk me through your graceful degradation strategy."

**Hruday's answer:**
> First, I'd already have this mapped out in the system design — graceful degradation is a design-time decision, not an incident-time improvisation.
>
> For recommendations, the fallback strategy I'd design in advance: the home screen BFF has two paths for recommendations. Primary: call RecommendationService with a 1.5s timeout. On any failure (timeout, 5xx, circuit open): fall back to a static ranked list of top-20 restaurants in the user's city by order volume in the last 7 days. This list is pre-computed nightly by a batch job and stored in Redis. Even if RecommendationService is completely down, the Redis cache is independent and available.
>
> The user experience: they see "Popular restaurants near you" instead of "Recommended for you" — a subtle label change. The list is good quality (high-volume restaurants) even if not personalised. The ordering experience is 100% functional.
>
> The operational visibility: the circuit breaker on RecommendationService opens after 30 failures. An event publisher logs `CircuitBreaker 'recommendationService' state: CLOSED → OPEN`. A Micrometer counter for `degradation.events{component=recommendations}` spikes. A Grafana alert fires: "Non-critical service degraded: recommendations > 50% fallback rate for 5 minutes" → engineer is notified but nobody's paged in the middle of dinner (lower severity, monitoring channel alert only).
>
> Result: 30 million users during dinner hour experience Swiggy with good (not personalised) recommendations. Zero complete failures. Order flow is entirely unaffected.

---

### Q3 — Identifying What to Degrade
**Interviewer asks:** "How do you decide which features can be gracefully degraded and which cannot?"

**Hruday's answer:**
> I use two criteria: is this feature in the critical user flow, and is there a meaningful substitute response?
>
> A feature is in the critical user flow if removing it prevents the user from completing their primary intent. For a payment gateway like Razorpay, the payment processing itself cannot be gracefully degraded — if it fails, the payment fails, and that's the right outcome. For an e-commerce platform, product browsing can be degraded (stale cache), but checkout payment cannot.
>
> A feature has a meaningful substitute if there is some response that, while less ideal, still serves the user better than an error: popular items instead of personalised recommendations; estimated delivery time instead of live GPS ETA; yesterday's inventory count instead of real-time stock availability; a static promotional banner instead of a personalised promotion.
>
> Features that CANNOT be gracefully degraded: payment processing, order placement (the write operation), and real-time critical paths (fraud detection — degrade this carefully; if fraud check is down, the risk of proceeding is a business decision, not a default architectural fallback).
>
> The exercise I'd do with the product team at the start of each feature area: "What should this page show if Service X is down?" Answering that question for every dependency forces clarity on what is critical, what is nice-to-have, and what the fallback is.

---

### Q4 — Observability of Degradation
**Interviewer asks:** "How do you make sure you know when your system is operating in degraded mode?"

**Hruday's answer:**
> Graceful degradation without observability is dangerous — you could serve stale or degraded data to users for days without knowing. Three layers of visibility are needed.
>
> Metrics: every fallback path increments a counter: `degradation_events_total{service="recommendations", type="circuit_open"}`. Dashboard panels show degradation rate per service over time. Alerting rule: "if degradation rate for any service > 5% over 10 minutes, fire a non-paging alert to the operations channel."
>
> Logs: every time a fallback is used, log at WARN level with context: service name, reason, userId if relevant, which fallback was used. Do not log at INFO (too noisy in normal operation) — but WARN is appropriate since degraded mode is abnormal.
>
> API response flags: consider adding a `X-Degraded: recommendations,promotions` response header when fallbacks are active. Frontend can read this header and optionally show a subtle "Some features are loading slowly" message or just use this for client-side monitoring.
>
> The operational rule: degraded state is acceptable for short periods (transient outages). If degradation persists beyond 5 minutes, the responsible team should be investigating even if it's non-critical. Prolonged degradation is a leading indicator of a deeper problem — a service that never fully recovers, or keeps flapping.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Return empty response for all failures" | "If service fails, return empty array — user sees blank section" | "Returning an empty array when the service is down tells the user 'there is nothing here' — which may be factually wrong. If there ARE recommendations but the service is temporarily down, an empty array misleads the user. A meaningful fallback (popular restaurants) or a clear 'unavailable' state with a reason is better than silent empty. If you return empty, you must know it's the right default — not just a lazy error swallow." |
| "Never fail — always degrade" | "We should have a fallback for everything so we never show an error" | "Some failures SHOULD result in errors. If a user tries to pay and the payment service is down, showing a degraded 'payment complete' screen and queuing the payment silently is potentially fraudulent. Critical features must fail visibly and require human action. Graceful degradation applies to non-critical features. Over-applying it to critical paths protects operational uptime metrics at the cost of data integrity." |
| "Cache everything" | "Put a 1-hour cache in front of every service call" | "Long caches make degradation silent — your 1-hour stale cache serves wrong data for an hour before anyone notices. Cache TTLs must match data freshness requirements: product name (can be 24 hours stale), price (should be max 5 minutes stale), stock availability (max 30 seconds stale for checkout). Uniform long TTLs protect availability but sacrifice correctness." |
| "Degradation is automatic" | "The circuit breaker handles fallback automatically" | "The circuit breaker fires a fallback method — but YOU write what that fallback does. A fallback that just logs and re-throws the exception is meaningless. The fallback must actively provide useful data. The engineering work in graceful degradation is designing what each fallback should return and validating that it's genuinely useful, not just syntactically correct." |

---

## 7. Hruday's Real Experience Hook

> "Working on the Oracle ERP frontend, the scheduler module showed a dashboard that pulled from six backend APIs: open orders, pending approvals, budget variances, supplier alerts, compliance deadlines, and system health. During peak batch processing, the system health API would be slow (it ran its own complex queries). Originally, if this API timed out, the entire dashboard failed to load — a classic all-or-nothing failure. My team refactored the Angular component to use `forkJoin` with individual `catchError` fallbacks on each API call. System health timeout → show a 'data temporarily unavailable' card for that tile. All other tiles loaded normally. Users could still process approvals, review budget variances, and take action — they just didn't see the system health widget. That was my first practical implementation of graceful degradation, before I knew it had a formal name."

---

## 8. Scale Evolution

**Early stage →** Even without formal fallback infrastructure, the principle matters: wrap non-critical service calls in try/catch with meaningful defaults. No fancy tooling needed initially.

**Growth stage →** Circuit breakers with fallback methods. Redis stale cache for slowly-changing data. Degradation metrics in Micrometer.

**Scale stage →** Feature flags (e.g., LaunchDarkly) to toggle degradation modes. Chaos engineering (Chaos Monkey) to test that degradation paths actually work under real load. Synthetic monitoring that deliberately triggers degradation and verifies fallbacks produce correct output.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Swiggy / Meesho | "What happens to recommendation service during flash sale?" is a direct graceful degradation design question. Non-critical personalisation features must degrade elegantly so core ordering flow is 100% available. | "RecommendationService is down during 7pm peak. What do users see? How does the system behave?" |
| Razorpay / PhonePe | Fraud detection and 3DS authentication have fallback policies (proceed vs decline based on risk threshold) when ML services are degraded. Graceful degradation in financial systems requires precise business logic. | "Our fraud detection ML model is down. Do we decline all payments? Proceed with all? Design the fallback policy." |
| Adobe / Microsoft | Document editing features (AI suggestions, OCR, cloud sync) can degrade to offline/manual modes. Core editing must always work — AI enhancements are non-critical. | "AI autocomplete is down for 2 hours. What should our document editor do?" |
| Google / Amazon | System design interviews explicitly ask "what happens when dependency X is down?" — graceful degradation strategy is the complete answer, not circuit breaker alone. | "Design Google Photos storage system. What happens if the ML tagging service is down?" |

---

## 10. Related Topics — What to Study Next

- **Topic 71 — Circuit Breaker Pattern** — the primary mechanism that TRIGGERS graceful degradation; when the circuit opens, the fallback method IS the graceful degradation strategy
- **Topic 73 — Bulkhead Pattern** — bulkhead prevents resource exhaustion that would cause an entire service to fail; graceful degradation handles what to show when any individual component fails
- **Topic 67 — Asynchronous Kafka Communication** — async communication is inherently more graceful than sync: a Kafka producer publishes and moves on; the consumer processes at its own pace; consumer downtime doesn't break the producer's user flow
- **Topic 78 — Eventual Consistency** — graceful degradation often involves serving eventually consistent data (stale cache, async-updated read models); understanding eventual consistency helps set appropriate expectations for fallback data quality
- **Topic 84 — Distributed Tracing** — understanding which service caused a degradation and how long it lasted requires distributed tracing; operational response to degradation depends on trace data

---

*Part 4 · Graceful Degradation · Full Stack Interview Guide · Hruday D · 2026*
