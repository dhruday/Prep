# Cache Warming Strategies
> Part 9 — Caching Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Cache warming** = pre-filling the cache before real traffic arrives — so the first user gets a fast response instead of a slow DB hit
- **Cold start problem**: every pod restart or cache flush means the first N requests are slow (DB queries) — this is especially bad when you scale up pods for a traffic spike
- **Strategy 1 — Startup warming**: `@PostConstruct` or `ApplicationReadyEvent` method loads the top-K most important data into cache before the pod starts handling requests
- **Strategy 2 — Predictive warming**: a scheduled job pre-populates cache before known traffic spikes (lunch hour, Monday morning, flash sale start)
- **Strategy 3 — Shadow warming**: new pods join the Kafka consumer group and "warm themselves" by listening to recent cache-population events from existing pods
- 🔥 At SAP, startup cache warming before accepting traffic was the fix for a cold-start DB spike every deployment

---

## 1. One-Line Definition
Cache warming is the process of pre-populating a cache with data before requests arrive, so the system avoids a "cold start" where every initial request is a slow cache miss that hits the database.

---

## 2. The Problem It Solves

It is Monday morning at PhonePe. 9:00 AM. Your Kubernetes pod autoscaler is about to scale from 5 pods to 25 pods to handle the morning salary-day payment rush. At 9:01 AM, 20 new pods start. All 20 have empty caches — they just launched. At 9:02 AM, 200,000 users open the app. The autoscaler did its job: you have 25 pods. But all 20 new pods are cold. The first requests these pods handle all miss the cache and hit the DB.

You added 20 pods to handle more load, but for the first 2–3 minutes, every request those pods handle hits the DB — potentially 10,000 simultaneous DB queries from cold pods just when you need the system to perform best. Your DB gets hammered exactly at the peak moment.

Cache warming solves this by pre-filling new pods' caches (or a shared Redis cache) before they are marked ready to receive real traffic. By the time the autoscaler sends traffic to a new pod, its cache already contains the 1,000 most-requested products, account configurations, and merchant data.

---

## 3. How It Works Internally

### The Mental Model
Think of a new employee starting on their first day. They are smart but don't know anything about the company yet. If you immediately put them on customer calls, the first 50 customers get slow answers while the employee looks everything up. Instead, you spend an hour briefing them on the top 50 FAQs before they start taking calls. That hour is cache warming.

The same principle applies to pods: before marking a pod as ready (Kubernetes readiness probe returns `true`), load it with the data it will most commonly need. Then open it for traffic.

### The Mechanism — Step by Step

**Strategy 1 — Startup Warming (Eager loading at pod launch):**
1. Pod starts. Spring Boot context loads.
2. `@PostConstruct` method runs before the first request is served
3. Method queries DB for top-K most critical data (e.g. top 1,000 products by traffic)
4. Data is stored in local Caffeine cache or Redis
5. Kubernetes readiness probe only returns `true` after warming is complete
6. Traffic routes to this pod only when it is ready + warm

**Strategy 2 — Predictive Scheduled Warming:**
1. Cron job or `@Scheduled` method runs N minutes before known traffic spikes
2. Job pre-fetches data that will be needed: current day's deals, active promotions, scheduled events
3. Stores in Redis with a TTL slightly longer than the busy period
4. Traffic hits warm cache at spike time, not cold cache

**Strategy 3 — Shadow Warming via Kafka:**
1. Existing service pods publish `CachePopulated` events to Kafka when they load data into cache
2. New pods subscribe to this topic
3. New pods receive recent cache population events and pre-warm their own cache from the events
4. "Warm by learning what others cached recently"
5. Useful when warm data set is dynamic and too large to load from scratch

**Strategy 4 — Redis Pre-warm Script (external warm-up):**
1. Before a deployment or flash sale, a standalone script runs
2. Script queries DB for the target hot data
3. Script writes directly to Redis with the correct key format and TTL
4. All pods share this Redis — all benefit from the pre-warm without each pod loading independently
5. Useful for shared Redis caches (L2) vs per-pod Caffeine (L1)

**Why readiness probe matters:**
- Kubernetes sends traffic to a pod only when its readiness probe returns healthy
- If you delay readiness probe success until after warming is complete, Kubernetes naturally holds traffic back until the pod is warm
- This is the Kubernetes-native cache warming mechanism — zero extra code needed beyond the warming logic itself

### ASCII Diagram

```
Without warming:                    With warming:
                                    
Pod starts                          Pod starts
    │                                   │
    ├─ Ready: TRUE immediately          ├─ @PostConstruct runs (10–20s)
    │                                   │    │
    ▼                                   │    ├─ Load top 1000 products → cache
Traffic arrives                         │    ├─ Load active promotions → cache
    │                                   │    └─ Load user configs → cache
    ├─ All misses → DB queries          │
    ├─ DB overloaded 🔴                 ├─ Ready: TRUE (after warming)
    └─ Users see slow response          │
                                        ▼
                                    Traffic arrives
                                        │
                                        ├─ 90% hits → cache (fast)
                                        ├─ 10% misses → DB (acceptable)
                                        └─ Users see fast response ✅

Kubernetes readiness probe:
    spring.boot.healthcheck.enabled=true
    livenessProbe.path=/actuator/health/liveness
    readinessProbe.path=/actuator/health/readiness
         ↑
    Mark NOT ready during warming; mark READY after warming completes
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Service starts, immediately serves traffic, cache warms up "naturally"
@Service
public class ProductService {

    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        return repo.findById(id).orElseThrow();
    }

    // No warming — cache fills up slowly as requests trickle in.
    // During the first 2 minutes of a deployment or scale-up:
    // - Every request is a cache miss
    // - Every request hits the DB
    // - If this happens under a traffic spike, the DB takes the full load
    // - The cache only becomes useful 10–20 minutes into the deployment
}
```
> **Why this fails in production:** Natural cache population is too slow. Under a traffic spike, the cold period (when all requests miss) happens at exactly the moment you need the system to perform best. Each pod restart during a rolling deployment creates a temporary performance regression.

### Right Way — Production Quality

**Strategy 1 — Startup warm on `ApplicationReadyEvent` (runs after Spring context is fully up):**
```java
@Component
@Slf4j
public class CacheWarmer {

    private final ProductRepository productRepo;
    private final CacheManager cacheManager;
    private final ApplicationContext appContext;

    // ApplicationReadyEvent fires AFTER the full Spring context is ready
    // This includes all beans, data sources, and the web server starting
    // Using @PostConstruct is too early — repositories may not be injected yet
    @EventListener(ApplicationReadyEvent.class)
    public void warmCacheOnStartup() {
        long start = System.currentTimeMillis();
        log.info("Starting cache warm-up...");

        try {
            Cache productCache = cacheManager.getCache("products");
            Cache categoryCache = cacheManager.getCache("categories");

            // Warm top 1,000 most-viewed products — sorted by view count DESC
            // This covers ~80% of product requests based on Pareto principle
            List<Product> topProducts = productRepo.findTopByViewCountDesc(1000);
            for (Product p : topProducts) {
                if (productCache != null) {
                    productCache.put(p.getId(), p);
                }
            }

            // Warm all categories — small dataset, rarely changes
            List<Category> categories = categoryRepo.findAll();
            for (Category c : categories) {
                if (categoryCache != null) {
                    categoryCache.put(c.getId(), c);
                }
            }

            long elapsed = System.currentTimeMillis() - start;
            log.info("Cache warm-up complete: {} products, {} categories in {}ms",
                topProducts.size(), categories.size(), elapsed);

        } catch (Exception e) {
            // IMPORTANT: do not let warming failure prevent the pod from starting
            // Log the error but allow the pod to come up — it will warm naturally
            log.error("Cache warm-up failed — pod will start with cold cache", e);
        }
    }
}
```

**Kubernetes readiness probe integration — pod stays NOT ready until warming completes:**
```java
// Custom health indicator — tells Kubernetes "not ready until warm"
@Component
public class CacheWarmthHealthIndicator implements HealthIndicator {

    private volatile boolean isWarm = false;

    // Called by CacheWarmer when warming completes
    public void markWarm() { this.isWarm = true; }

    @Override
    public Health health() {
        if (isWarm) {
            return Health.up().withDetail("cacheStatus", "warm").build();
        } else {
            // Returning DOWN makes readiness probe fail — Kubernetes doesn't send traffic yet
            return Health.down().withDetail("cacheStatus", "warming").build();
        }
    }
}

// Updated CacheWarmer — marks health indicator ready when done
@Component
@Slf4j
public class CacheWarmer {

    private final CacheWarmthHealthIndicator healthIndicator;

    @EventListener(ApplicationReadyEvent.class)
    public void warmCacheOnStartup() {
        try {
            // ... warming logic ...
            healthIndicator.markWarm();  // NOW Kubernetes readiness probe returns UP
            log.info("Cache warm and pod is ready for traffic");
        } catch (Exception e) {
            log.error("Warming failed — marking ready anyway to prevent deploy blocking");
            healthIndicator.markWarm();  // fail-open — pod starts warm or not
        }
    }
}
```

**application.yml — readiness probe configuration:**
```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true
      group:
        readiness:
          include: cacheWarmth,db,redis   # readiness fails if cache not warm yet
        liveness:
          include: db,redis              # liveness only checks core health (not warmth)

# Kubernetes deployment YAML snippet:
# readinessProbe:
#   httpGet:
#     path: /actuator/health/readiness
#     port: 8080
#   initialDelaySeconds: 30   # give the pod time to warm before first probe
#   periodSeconds: 10
#   failureThreshold: 3
```

**Strategy 2 — Scheduled pre-warming before flash sale:**
```java
@Component
@Slf4j
public class FlashSalePreWarmer {

    private final DealRepository dealRepo;
    private final CacheManager cacheManager;

    // Run 10 minutes before every noon — deals go live at 12:00 PM
    // "0 50 11 * * ?" = 11:50 AM every day
    @Scheduled(cron = "0 50 11 * * ?")
    public void preWarmFlashSaleCache() {
        log.info("Pre-warming flash sale deals cache at {}", LocalDateTime.now());
        Cache dealCache = cacheManager.getCache("deals");
        if (dealCache == null) return;

        // Load today's active deals — these will be the hot items at 12:00 PM
        List<Deal> activeDeals = dealRepo.findActiveDealsForToday();
        activeDeals.forEach(deal -> dealCache.put(deal.getId(), deal));

        log.info("Pre-warmed {} deals for today's flash sale", activeDeals.size());
    }
}
```

**Strategy 3 — Redis pre-warm script (for shared L2 cache across all pods):**
```java
// Run as a one-off Job before deployment (e.g. Kubernetes Job or CI/CD step)
@SpringBootApplication
public class CachePrewarmJob implements CommandLineRunner {

    private final ProductRepository repo;
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;

    @Override
    public void run(String... args) throws Exception {
        log.info("Running Redis pre-warm job...");

        List<Product> topProducts = repo.findTopByViewCountDesc(5000);
        for (Product p : topProducts) {
            String key = "products::" + p.getId();
            // Only warm if key not already in Redis — avoid overwriting fresher data
            if (Boolean.FALSE.equals(redis.hasKey(key))) {
                redis.opsForValue().set(key, mapper.writeValueAsString(p), 1, TimeUnit.HOURS);
            }
        }

        log.info("Pre-warming complete: {} products loaded into Redis", topProducts.size());
    }
}
```

> **Key decisions here:**
> - Use `ApplicationReadyEvent`, not `@PostConstruct` — `@PostConstruct` fires too early (before DB connections are fully pooled); `ApplicationReadyEvent` fires when the entire application is actually ready
> - Fail-open on warming errors — a warming failure should never block a deployment; log the error and let the pod start cold (it will warm naturally)
> - Limit warming scope: top 1,000 products, not all 1 million — a 1 million product warm-up takes 20+ seconds and creates a massive DB query; stick to the Pareto hot set
> - Readiness probe + warming integration is the cleanest approach — Kubernetes naturally holds traffic until the pod is ready, no extra coordination needed

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the cache cold start problem and why does it matter in Kubernetes deployments?"

**Hruday's answer:**
> The cold start problem is when a new service pod starts with an empty cache and every initial request is a cache miss, forcing a slow DB query. In a single-instance system, this is a one-time issue at startup and quickly resolves as the cache fills naturally.
>
> In Kubernetes, cold start matters much more because pods are replaced frequently — during rolling deployments, pod restarts on node failures, and especially during auto-scaling. If you scale from 5 pods to 20 pods for a traffic spike, all 15 new pods start cold. During the first 2–3 minutes, those 15 pods are cold and every request they handle queries the DB. If the scaling happened because of a traffic spike, you've just multiplied DB load at exactly the moment you needed the cache to absorb it.
>
> Cache warming solves this by pre-populating the cache before the pod is marked as ready to receive traffic. Combined with Kubernetes readiness probes, you can delay traffic routing to a new pod until its cache is warm, converting a cold-start problem into a zero-impact deployment.

---

### Q2 — Deep Dive
**Interviewer asks:** "How would you use Kubernetes readiness probes to implement cache warming without any race conditions?"

**Hruday's answer:**
> The key insight is that Kubernetes readiness probes control when traffic routes to a pod. If the probe returns unhealthy, no traffic goes to that pod. This is exactly the gate I need for cache warming.
>
> I implement a custom `HealthIndicator` in Spring Boot that starts in a "not ready" state. In the `ApplicationReadyEvent` listener, I run the cache warming logic — loading top products, categories, and other hot data. When warming completes, I call `markWarm()` which flips the health indicator to `UP`. The readiness probe endpoint (`/actuator/health/readiness`) is configured to include this indicator, so it returns 200 only after warming.
>
> Kubernetes is configured with `initialDelaySeconds: 30` on the readiness probe to give the pod time to start before the first probe, then checks every 10 seconds. The pod receives no traffic until the readiness probe passes, and the readiness probe only passes after warming. There is no race condition — traffic routing and cache warmth are naturally sequenced by the probe mechanism.
>
> One important detail: I fail-open — if warming throws an exception, I still mark the pod as ready rather than blocking the deployment indefinitely. The pod starts with a partially warm cache and fills up naturally. A stuck deployment is worse than a briefly cold pod.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Pre-warming the entire product catalog in a pod with 2 million products isn't practical. How do you decide what to warm?"

**Hruday's answer:**
> You warm the Pareto set — the 20% of data that accounts for 80% of requests. For a product catalog, I'd analyse access logs to find the top 1,000–5,000 most-viewed product IDs. These are the homepage featured items, the current deals, the perennial bestsellers. They account for the vast majority of product page reads.
>
> I'd run a weekly batch job that writes these hot product IDs to a `hot_products` lookup table or a Redis set. The warming logic reads from this precomputed list rather than scanning the entire products table. This means warming 1,000 products, not 2 million — taking 1–3 seconds instead of minutes.
>
> For the remaining 1.99 million products, natural cache filling is acceptable. If a customer happens to browse an obscure product, one DB query isn't a problem. The problem is only when all concurrent requests for common items are simultaneously cold — warming prevents exactly that scenario.
>
> Finally, warm different data categories with different priorities: critical reference data (categories, configurations) always; top product list always; personalised data (user-specific recommendations) never — it changes per user and can't be meaningfully bulk-warmed.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "It's 11:55 AM on Swiggy. Your flash sale goes live at 12:00 PM. You expect 500,000 users in the first minute. Walk me through your cache warming strategy."

**Hruday's answer:**
> I'd run a three-layer warming strategy starting at 11:45 AM, 15 minutes before the sale.
>
> At the CDN layer, I'd trigger a CDN pre-warm: a script makes HTTP requests to the top 1,000 deal page URLs from our CI infrastructure. This fills CloudFront edge nodes with those pages. When users hit the CDN at 12:00 PM, 70–80% of requests return from edge nodes within 5–15ms.
>
> At the Redis layer, a scheduled job at 11:50 AM runs a query: `DealRepository.findActiveDealsSortedByPopularity()`. It fetches today's top 500 deals and writes them to Redis with a 2-hour TTL. All pods share this Redis — all 25 pods have the deal data available from Redis the moment requests arrive.
>
> At the pod level, I'd have started the autoscaler pre-scaling at 11:30 AM (a CronJob scales from 5 to 25 pods). By 12:00 PM all 25 pods have been running for 30 minutes, have had a startup warming step run at launch, and have their Caffeine L1 caches filled with the most common reference data.
>
> The goal: at 12:00 PM exactly, when 500,000 users open the app, 80% hit CDN, 18% hit Redis, and only 2% hit the DB — the same DB that normally handles 100,000 users with no issue.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Warm everything | "Pre-load all 2 million products" | Warming everything takes too long and defeats the purpose; warm only the Pareto hot set — top 1K–5K most requested items |
| @PostConstruct timing | "Use @PostConstruct for startup warming" | @PostConstruct fires before beans are fully wired; use `ApplicationReadyEvent` which fires after the entire context is ready |
| Blocking deployment on warm failure | "If warming fails, pod should not start" | Fail-open — warming failure should not block deployments; log the error, start cold, fill naturally |
| Forgetting readiness probe integration | "Warming runs in background while traffic arrives" | Without readiness probe integration, traffic routes to the pod before warming completes; Kubernetes readiness probe is the gate |

---

## 7. Hruday's Real Experience Hook
> "At SAP, every time we deployed a new version of our Spring Boot product configuration service, the first 2–3 minutes post-deployment were slow — the new pods had empty caches and were all querying the DB simultaneously. Users noticed the slowdown during Monday morning deployments. I added a startup warming step using `ApplicationReadyEvent` that pre-loaded the top 200 product configurations from the DB into the Caffeine cache before the pod joined the load balancer pool. The deployment slowdown disappeared entirely. That was my first hands-on experience with the Kubernetes readiness probe + cache warming combination, and it's now a default pattern in every service I build."

---

## 8. Scale Evolution

**1,000 users/day →** No warming needed. Natural cache fill happens in seconds and the request rate is low enough that cold-start misses don't cause any perceptible DB load.

**100,000 users/day →** Rolling deployments start to cause noticeable DB load spikes. Add startup warming via `ApplicationReadyEvent` for top 500 items. Readiness probe integration prevents cold pods from receiving traffic during the warm-up window.

**10 million users/day →** Full three-layer warming is required. CDN pre-warming before flash sales. Redis pre-warm job (Kubernetes Job) before deployments. Per-pod startup warming for Caffeine L1 caches. A dedicated hot-list service that continuously tracks the top-K most-accessed keys and makes them available to the warming logic. Auto-scaling policies scheduled to pre-scale 30 minutes before known traffic spikes so pods have time to warm before the spike hits.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Monday morning and salary day payment spikes — pods must be pre-scaled AND pre-warmed before the spike; cold pods at peak time cause real financial transaction failures | Do you know how to combine auto-scaling pre-scale CronJob with startup cache warming? |
| Swiggy / Meesho | Flash sale launches — the classic warming problem; CDN pre-warm + Redis pre-warm 15 minutes before launch | Can you describe a multi-layer cache warming strategy for a flash sale at 12:00 PM? |
| Adobe / Microsoft | Creative template catalog and asset library — warming top-used templates at pod startup reduces first-open latency which directly affects Lighthouse scores | Know the Pareto warm-set approach — what percentage of assets account for 80% of requests? |
| SAP Labs | Configuration service warm-up — ERP systems have predictable peak times (business hours); startup warming + scheduled off-hours refresh is the correct pattern | ApplicationReadyEvent vs @PostConstruct timing difference |

---

## 10. Related Topics — What to Study Next

- **Topic 159 — Cache Stampede Prevention** — cold start is a form of cache stampede; the mutex and background refresh techniques prevent the DB spike during the cold window
- **Topic 149 — Auto-Scaling Strategies** — pre-scaling + pre-warming work together; pre-scaling brings up new pods before the spike; pre-warming fills those pods' caches before traffic hits
- **Topic 188 — Kubernetes Liveness and Readiness Probes** — the core Kubernetes mechanism used to hold traffic off cold pods; understanding how Spring Boot Actuator integrates with probes
- **Topic 155 — Client-Side vs Server-Side vs CDN Caching** — CDN pre-warming is the L3 cache warming technique for content-heavy applications
- **Topic 163 — Stale-While-Revalidate Pattern** — an alternative to warming: serve stale data immediately while refreshing in the background, eliminating the cold window entirely

---

*Part 9 · Cache Warming Strategies · Full Stack Interview Guide · Hruday D · 2026*
