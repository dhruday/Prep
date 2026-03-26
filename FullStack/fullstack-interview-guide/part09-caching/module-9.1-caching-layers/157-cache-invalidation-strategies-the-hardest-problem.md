# Cache Invalidation Strategies — The Hardest Problem
> Part 9 — Caching Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Phil Karlton's famous quote: *"There are only two hard things in computer science: cache invalidation and naming things"* — the first one can cost you money and users
- **TTL-based**: cache expires after N seconds — simple, eventual consistency, stale data possible during TTL window
- **Write-through invalidation**: evict/update cache on every write — immediate consistency but all writes touch both DB and cache
- **Event-driven invalidation**: a Kafka event triggers cache eviction across all service instances — the correct pattern for distributed microservices
- 🔥 The trap: forgetting that a single service may run as 20 pods each with a local Caffeine cache — you need event-driven eviction to push invalidation to all pods

---

## 1. One-Line Definition
Cache invalidation is the process of removing or updating a cached item when the underlying data changes — so that the next request gets fresh, correct data instead of a stale copy.

---

## 2. The Problem It Solves

You are building an order management system at PhonePe. Your Spring Boot service caches user account balances in Redis with a 1-hour TTL. A user tops up their wallet. Your payment service writes the new balance to PostgreSQL. But your cached balance in Redis still shows the old, lower number. For the next 58 minutes, every balance check returns the stale value. Users see an incorrect balance. Support tickets flood in.

This is a cache consistency problem — your cache and your DB are now out of sync, and you have no mechanism to tell the cache "this entry is no longer valid."

The naive fix is to use a very short TTL — 30 seconds. But now you've limited yourself to 30 seconds of caching benefit, and you're making a DB query every 30 seconds per user whether the balance changed or not. You've traded a correctness problem for a performance problem.

The real fix is explicit cache invalidation: **when the data changes, actively remove or update the cache entry for that exact key**. This keeps the cache fresh without unnecessary DB calls. But building this correctly in a distributed system — where 20 service pods all have their own local caches and one Redis cluster — is the genuinely hard part.

---

## 3. How It Works Internally

### The Mental Model
Think of a cache entry as a sticky note on your board. TTL invalidation is like having the note self-destruct after a fixed time — even if the underlying information hasn't changed. Write-through invalidation is like saying "whenever the original document changes, someone runs over and removes the sticky note immediately." Event-driven invalidation adds a broadcast system: "whenever the document changes, publish a message, and all sticky-note boards across all offices get updated at once."

The challenge in distributed systems is the "all offices" part. You can't just invalidate locally.

### The Mechanism — Step by Step

**Strategy 1 — TTL-based expiry:**
1. Cache entry is stored with a TTL (e.g. 3600 seconds)
2. Cache serves stale data for up to TTL seconds after the underlying data changes
3. TTL expires → cache entry is removed → next request queries DB → fresh data
4. Simplest to implement — no coordination needed
5. Trade-off: eventual consistency (stale for TTL duration), wasted DB queries when data doesn't change

**Strategy 2 — Write-through explicit eviction:**
1. Write operation updates DB
2. Same code path (or same transaction) calls `cache.evict(key)` or `cache.put(key, newValue)`
3. Next read finds no cache entry (or finds updated value) → correct data
4. Problem: if the write succeeds but the cache eviction fails, you have a split-brain until TTL expires
5. Solution: evict first, then write to DB (though this introduces a brief miss window)

**Strategy 3 — Event-driven invalidation (distributed):**
1. Write operation updates DB
2. Write operation publishes a `ProductUpdated` event to Kafka (or Redis pub/sub)
3. All service pods that subscribe to this event channel receive it
4. Each pod evicts its local Caffeine cache entry for the affected key
5. Optionally: also publish the new value so pods can warm their cache instead of evicting
6. Benefit: all 20 pods get invalidated within milliseconds, regardless of local cache TTL

**Strategy 4 — Cache-aside with conditional reads:**
1. Cache stores value + version number together
2. On read: if version in cache matches version in DB → serve from cache; else — cache miss, reload
3. Requires an extra DB call on every read to check the version counter — defeats much of the purpose
4. Use this only when data correctness is critical and you must verify every time

### ASCII Diagram

```
Event-Driven Cache Invalidation Across Service Pods

 Service Pod A        Service Pod B        Service Pod C
 [Caffeine L1]        [Caffeine L1]        [Caffeine L1]
      │                     │                     │
      └────────┐            │            ┌────────┘
               │            │            │
               ▼            ▼            ▼
          ┌───────────────────────────────────┐
          │       Kafka Topic: cache-events    │
          │   ProductUpdated { id: 42, v: 7 } │
          └───────────────────────────────────┘
                            ▲
                            │  publish
                 ┌──────────┴──────────┐
                 │  Write Service       │
                 │  1. DB.update(...)   │
                 │  2. kafka.send(event)│
                 └─────────────────────┘
                            │
                            ▼
                     PostgreSQL (primary)

All three pods receive the Kafka event and evict key "product:42" 
from their local Caffeine caches within < 50ms.
Next read on any pod queries Redis → fresh from DB.
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
@Service
public class ProductService {

    @Autowired private ProductRepository repo;
    @Autowired private RedisTemplate<String, Product> redisTemplate;

    public Product getProduct(Long id) {
        String key = "product:" + id;
        Product cached = (Product) redisTemplate.opsForValue().get(key);
        if (cached != null) return cached;
        Product p = repo.findById(id).orElseThrow();
        // TTL is 1 hour — data could be stale for up to 1 hour after any update
        redisTemplate.opsForValue().set(key, p, 1, TimeUnit.HOURS);
        return p;
    }

    public void updateProduct(Product product) {
        repo.save(product);
        // Cache is NOT invalidated here.
        // Users will see stale data for up to 1 hour.
        // This is the bug that causes "why is the price still wrong" support tickets.
    }
}
```
> **Why this fails in production:** Not invalidating on write means users see stale data for the full TTL window. For anything user-visible — prices, stock levels, balance — 1 hour of stale data is unacceptable.

### Right Way — Production Quality

**Option A — Spring Cache with explicit eviction on write:**
```java
@Service
public class ProductService {

    private final ProductRepository repo;
    private final KafkaTemplate<String, CacheInvalidationEvent> kafkaTemplate;

    // Read: check cache first, populate on miss
    // key="#id" means the cache key is the product ID
    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        // Only called on cache miss — Spring handles the cache interaction
        return repo.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
    }

    // Write: save to DB, then evict the specific cache key
    // allEntries=false (default) — only evict this one key, not the entire cache
    @Transactional
    @CacheEvict(value = "products", key = "#product.id")
    public Product updateProduct(Product product) {
        Product saved = repo.save(product);
        // Publish Kafka event so OTHER pods evict their local Caffeine caches too
        // Without this, only this pod's cache is evicted — 19 other pods still serve stale data
        kafkaTemplate.send("cache-invalidation",
            new CacheInvalidationEvent("products", product.getId().toString()));
        return saved;
    }

    // Nuclear option: evict ALL product cache entries
    // Use during bulk price updates or flash sale activation
    @CacheEvict(value = "products", allEntries = true)
    public void clearAllProductCache() {
        // Spring evicts all "products" cache entries on return
    }
}
```

**Kafka-driven invalidation listener — evicts across all pods:**
```java
@Component
public class CacheInvalidationListener {

    private final CacheManager cacheManager;

    // @KafkaListener subscribes to the cache-invalidation topic
    // Every pod in the cluster runs this listener
    @KafkaListener(topics = "cache-invalidation", groupId = "cache-sync-#{T(java.util.UUID).randomUUID()}")
    // IMPORTANT: groupId must be unique per pod instance, not shared
    // Shared groupId = only ONE pod receives each message (Kafka consumer group load balancing)
    // Random UUID groupId = ALL pods receive every message (fan-out / broadcast)
    public void onInvalidationEvent(CacheInvalidationEvent event) {
        Cache cache = cacheManager.getCache(event.getCacheName());
        if (cache != null) {
            if (event.getKey() != null) {
                // Evict specific key only
                cache.evict(event.getKey());
            } else {
                // Evict all entries in this cache
                cache.clear();
            }
        }
        log.info("Cache invalidated: {} / {}", event.getCacheName(), event.getKey());
    }
}
```

**Configuration — application.yml:**
```yaml
spring:
  cache:
    type: redis   # L2 distributed cache — Redis
  data:
    redis:
      host: ${REDIS_HOST}
      port: 6379
  cache:
    redis:
      time-to-live: 7200000   # 2 hours — safety TTL, explicit eviction handles freshness
      # 2-hour TTL is a SAFETY NET, not the primary freshness mechanism
      # Primary mechanism is @CacheEvict + Kafka invalidation events

# Caffeine L1 in-process cache (in front of Redis to reduce network calls)
# In practice you configure this per bean rather than application.yml
```

> **Key decisions here:**
> - Kafka consumer `groupId` must be **unique per pod instance** for broadcast invalidation — a shared group ID causes only one pod to receive each message (Kafka partition assignment)
> - `@CacheEvict` only evicts the local pod's cache — you need the Kafka publish to reach other pods
> - Keep a long TTL as a safety net even with explicit eviction — it handles edge cases where events are lost
> - Use `allEntries=true` sparingly — it clears the entire cache namespace, causing a thundering herd if many concurrent requests miss simultaneously

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is cache invalidation and why do developers say it's hard?"

**Hruday's answer:**
> Cache invalidation is the process of removing or updating a cached value when the underlying data changes — so requests get fresh data instead of a stale copy. It sounds simple, but it's hard in distributed systems for a specific reason.
>
> In a monolith running as one process, you can just call `cache.evict(key)` in the same code that handles the write, and you're done. But in a modern microservices deployment, your service runs as 20 pods, each with their own in-process Caffeine cache. If only one pod handles the write and evicts its own cache, the other 19 pods still serve stale data. You need a broadcast mechanism — something that tells all pods "this key is now invalid."
>
> That's where Kafka events or Redis pub/sub come in. The writing pod publishes an invalidation event. Every pod subscribes and evicts on receipt. But now you've added a distributed messaging dependency to a read path. And if the event is lost, your cache drifts forever. So you also keep a TTL as a safety net. The combination of explicit eviction plus broadcast plus safety TTL is the real production answer — and getting all three right is genuinely difficult.

---

### Q2 — Deep Dive
**Interviewer asks:** "Your service has 20 pods each with a local Caffeine cache. How do you ensure a product price update is reflected in all caches within 100ms?"

**Hruday's answer:**
> The write service updates the DB, then immediately publishes a `price-updated` event to a Kafka topic with the product ID. Every one of the 20 pods subscribes to this topic with a **unique consumer group ID** — typically I use a UUID suffix at startup. This is critical: if all pods share the same consumer group ID, Kafka's partition assignment means only one pod receives each event. With unique group IDs, all 20 pods receive every event independently, which gives you fan-out broadcast behaviour.
>
> Each pod, on receiving the event, calls `cache.evict("products", productId)` on its local Caffeine cache. End-to-end, the Kafka publish, event propagation to 20 consumers, and eviction typically completes in 20–50ms within the same data centre., comfortably within your 100ms target.
>
> I'd then also evict the Redis L2 cache key explicitly — so if a pod's Caffeine cache was already cold, the Redis read also gets fresh data. I keep a 2-hour TTL on Redis as a safety net for cases where the Kafka event fails to deliver, which is rare with `acks=all` but possible in a network partition scenario.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use TTL-only invalidation instead of explicit eviction?"

**Hruday's answer:**
> TTL-only makes sense when the data has low update frequency and you can tolerate a bounded staleness window. For example, country codes or currency names rarely change — new countries aren't created often. A 24-hour TTL is fine. The implementation is zero-overhead: no invalidation events, no Kafka dependency, nothing to break.
>
> Similarly, for reference data like category taxonomies or static configuration that's updated via a deployment, a TTL of 1–6 hours is acceptable. When a new deployment runs, old entries expire on their own.
>
> I would choose explicit eviction over TTL whenever user-visible correctness is important and changes happen in real time — account balances, inventory levels, flash sale prices, order status. A user reloading their app and seeing a stale balance for 30 minutes will call customer support. A user seeing a product that's out of stock listed as available will have a failed checkout experience.
>
> The pattern I follow: set TTL as a safety net for all caches, but add explicit eviction for any data where "wrong for up to N minutes" would cause a user-visible problem.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the cache invalidation strategy for a payment service where the account balance is cached in Redis."

**Hruday's answer:**
> For payment data, correctness is paramount — I'd use a combination of explicit invalidation and conservative TTL, not just TTL. Stale balances cause failed transactions and support escalations.
>
> For reads: cache the balance in Redis with a 5-minute TTL. This limits stale windows to 5 minutes even if explicit invalidation fails.
>
> For writes: every balance change (top-up, debit) goes through a `@Transactional` method. After the DB commit, evict the Redis cache key for that user's balance. Critically, because payments run across multiple service instances, I also publish a `balance-updated` Kafka event. Every service pod subscribes with a broadcast consumer group and evicts its local Caffeine L1 cache on receipt.
>
> For the window between DB write and cache eviction — which is usually under 5ms — I don't want a race condition where a concurrent read populates the cache with the old value after eviction. So I evict the cache key **before** committing the DB transaction. If the eviction fails, the DB transaction rolls back too. If eviction succeeds but DB fails, the next read just queries the DB and finds no updated balance — safe, no stale data written.
>
> This "evict before write" pattern, combined with a short TTL safety net and Kafka broadcast, gives me the strongest consistency guarantee without introducing 2PC across DB and cache.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "TTL is good enough" | Use short TTL for freshness | Short TTL causes unnecessary DB load when data hasn't changed; explicit eviction on write is the right answer for mutable data |
| Multi-pod invalidation | "Evict on the write service pod" | @CacheEvict only evicts the local pod — you need Kafka event broadcast with **unique consumer group IDs per pod** to reach all pods |
| Kafka consumer group | Any groupId is fine | Shared groupId = only ONE pod gets the event (Kafka load balancing); unique groupId per pod = ALL pods receive broadcast |
| Write-through vs eviction | "Write the new value to cache on update" | Write-through is complex — the DB and cache update must be atomic; eviction is safer because it just means one more DB read on next access |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we had a user preference cache in an Angular frontend service that would sometimes show stale settings after a user updated their configuration. The root cause was that we were relying purely on TTL — a 10-minute cache meant users saw old settings for up to 10 minutes after their own save. When I investigated, I realised the fix needed two layers: explicit eviction on write from the backend, and a targeted cache refresh signal in the frontend via a reactive state update. That experience taught me that cache invalidation is not a cache problem — it is a data consistency problem that needs to be solved at the write path, not the read path."

---

## 8. Scale Evolution

**1,000 users/day →** TTL-based invalidation is perfectly fine. A 5-minute TTL on product data causes minimal stale windows and no appreciable DB overhead. No Kafka needed. `@CacheEvict` in the same service is enough.

**100,000 users/day →** Your service is now running 5–10 pods. `@CacheEvict` only reaches the local pod's cache. You start seeing inconsistent reads: one pod returns fresh data immediately after a write, another returns stale data for up to 5 minutes. Users notice. Add Redis pub/sub or a simple Kafka invalidation topic with unique consumer groups per pod.

**10 million users/day →** 50+ pods, multiple caching layers (Caffeine L1 + Redis L2 + CDN). Invalidation needs to cascade through all layers. CDN purge APIs must be called for content-changing updates. A dedicated cache invalidation service receives change events from all write services via Kafka and fans out invalidations to Redis and CDN. Invalidation events carry both the cache key and the new value (not just the key) — this allows cache warming on invalidation rather than causing a miss storm.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Account balance, payment status must never be stale — financial correctness requires explicit eviction, not TTL | Can you design a cache invalidation strategy that prevents stale balances from appearing in the UI? |
| Swiggy / Meesho | Flash sale prices change in real time — a 1-hour TTL means users see wrong prices for an hour; explicit eviction with Kafka broadcast is critical | Do you know the multi-pod cache invalidation problem and the Kafka consumer group ID trap? |
| Adobe / Microsoft | Document metadata, content management — collaborative editing scenarios where one user's change must be visible to all other users immediately | Can you handle cache invalidation across a CDN edge cache layer? |
| SAP Labs | ERP master data caching — pricing rules, tax configurations updated via transactions; exact same consumer group ID bug likely lurking in monolith-to-microservices migrations | What is the difference between local eviction and distributed broadcast eviction? |

---

## 10. Related Topics — What to Study Next

- **Topic 158 — Cache Aside vs Read-Through vs Write-Through** — the write-through pattern is one invalidation strategy; this topic covers all four access patterns and their consistency trade-offs
- **Topic 161 — Cache Consistency in Microservices** — deeper coverage of how to keep caches consistent when writes happen in a different service than reads
- **Topic 159 — Cache Stampede Prevention** — what happens when you invalidate a hot cache key and thousands of requests hit the DB simultaneously
- **Topic 79 — Outbox Pattern** — reliable event publishing for the Kafka invalidation event — ensures the event is published even if the service crashes after the DB write
- **Topic 107 — Kafka Topics, Partitions, Consumer Groups** — essential to understand why unique consumer group IDs per pod are needed for broadcast invalidation vs load-balanced consumption

---

*Part 9 · Cache Invalidation Strategies — The Hardest Problem · Full Stack Interview Guide · Hruday D · 2026*
