# Cache Consistency in Microservices
> Part 9 — Caching Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- In microservices, Service A owns the DB and cache; Service B reads from Service A's cache — when A writes, B's cached copy may not update
- **Problem**: distributed caches across multiple services have no automatic consistency guarantee — each service has its own Redis namespace or local cache
- **Solution 1 — Single cache owner**: only the service that owns the data owns its cache; other services call the owner via API, not directly via shared cache
- **Solution 2 — Event-driven cache invalidation**: data owner publishes a Kafka event on change; all interested services evict their local copies
- 🆕 Cache consistency is a data ownership problem, not a cache problem — solve it by making ownership explicit and using events to notify dependents

---

## 1. One-Line Definition
Cache consistency in microservices means ensuring that when data changes in one service (the owner), all other services that cached a copy of that data either invalidate their copy or receive the updated value — so no service serves stale data after a write.

---

## 2. The Problem It Solves

Imagine a fintech platform with three services: User Service (owns user profile + balance), Order Service (reads user credit limit to validate orders), and Notification Service (reads user email to send alerts). Both Order Service and Notification Service cache user profile data in their own local Redis instances to avoid making a synchronous API call to User Service on every request.

A user updates their email address. User Service updates its DB and its own cache. But Order Service's Redis cache still has the old email. Notification Service's Redis cache also has the old email. Every order confirmation email for the next 2 hours goes to the wrong address. The user never receives their confirmation.

This is a cache consistency problem across service boundaries. Each service correctly manages its own cache — the problem is that they have no mechanism to learn about changes happening in another service's data.

The root cause: caching a copy of another service's data creates a distributed consistency responsibility that no one explicitly owns.

---

## 3. How It Works Internally

### The Mental Model
Think of three people who each have their own notebook with a copy of some shared information. One person updates the original source. The others don't know. They each go home and refer to their out-of-date notebooks for the rest of the day.

The fix is to give everyone a radio. When the original is updated, broadcast the change. Everyone who has a copy and is listening updates their notebook — or at least crosses out the old entry and notes "needs re-reading."

In microservices, Kafka is the radio. The data owner broadcasts updates. Each interested service subscribes and invalidates or updates its cached copy.

### The Mechanism — Step by Step

**Anti-Pattern — Shared Redis namespace across services:**
1. Service A and Service B both write to `redis.example.com` under keys like `user:42`
2. Service B can directly write stale data into a key that Service A owns
3. Service A's business rules around data validation are bypassed
4. No single service is responsible for the correctness of the cache key
5. → Avoid shared Redis namespaces where multiple owning services write to the same keys

**Pattern 1 — Cache Behind API (delegate reads to the owner):**
1. Service B needs user email → calls `GET /users/{id}` on User Service
2. User Service returns data from its own cache (fast, ~2ms Redis hit)
3. Service B does NOT cache the response at all
4. Consistency is guaranteed — User Service's cache always reflects its own DB
5. Trade-off: Service B has a runtime dependency on User Service; if User Service is down, Service B is impacted

**Pattern 2 — Event-Driven Cache Invalidation:**
1. User Service updates user email in DB
2. User Service publishes `UserUpdated { userId: 42, email: "new@email.com" }` to Kafka
3. Order Service and Notification Service subscribe to `user-events` topic
4. Each subscriber evicts or updates its cached copy of user 42
5. Next request to Order Service or Notification Service hits its own cache → fresh data
6. Kafka consumer group configuration: each service has its own group ID → each receives every event (parallel consumption, not load-balanced)

**Pattern 3 — Cache-Behind with short TTL + event invalidation (hybrid):**
1. Service B caches user data with a 5-minute TTL (safety net)
2. On `UserUpdated` Kafka event → explicitly evict the key (immediate freshness)
3. Best of both worlds: if an event is missed, staleness is bounded by 5-minute TTL
4. This is the recommended production pattern for non-critical eventual consistency

**The data ownership rule:**
```
Rule: Only the service that OWNS the data writes to that data's cache.
      All other services either:
      (a) call the owner's API, or
      (b) cache their own READ COPY and use events to invalidate it
```

### ASCII Diagram

```
Data Flow: User email update propagated to caches

User Service                    Kafka                   Order Service          Notification Service
──────────────                  ─────                   ──────────────         ────────────────────
│ DB.update(email)│─────────────►│UserUpdated{          │                      │
│ cache.put(user)│               │  userId:42,          │◄─ evict user:42 ─────┼──────────────────◄│
│                │               │  email:new           │                      │
│                │               │}                     │                      │

Next request:
Order Service reads user:42      → cache miss → call User Service API → fresh data
Notification Service reads user:42 → cache miss → call User Service API → fresh data
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Order Service — directly connecting to User Service's Redis
@Service
public class OrderValidationService {

    // BAD: Order Service connects to the SAME Redis as User Service
    // and reads cache keys that User Service owns
    @Autowired private RedisTemplate<String, User> sharedRedis;

    public boolean canPlaceOrder(Long userId, BigDecimal orderAmount) {
        // Directly reading User Service's cache namespace
        User user = (User) sharedRedis.opsForValue().get("user:" + userId);
        if (user == null) {
            // On cache miss, calls User Service... sometimes. Sometimes doesn't.
            // This is ad-hoc and inconsistent.
        }
        return user != null && user.getCreditLimit().compareTo(orderAmount) >= 0;
    }
}
```
> **Why this fails in production:** Order Service bypasses User Service's business logic and reads directly from its cache. If User Service changes its cache key format or serialisation, Order Service breaks silently. Worse, Order Service might write to these keys (accidentally or intentionally) and corrupt data that User Service manages. Services are no longer independent.

### Right Way — Production Quality

**User Service — owns data and publishes update events:**
```java
@Service
public class UserService {

    private final UserRepository repo;
    private final KafkaTemplate<String, UserUpdatedEvent> kafka;

    // Read: user service serves its own data from its own cache
    @Cacheable(value = "users", key = "#id")
    public User getUser(Long id) {
        return repo.findById(id).orElseThrow(() -> new UserNotFoundException(id));
    }

    // Write: update DB + own cache + broadcast event to all interested services
    @CachePut(value = "users", key = "#user.id")
    @Transactional
    public User updateUser(User user) {
        User saved = repo.save(user);
        // Broadcast to other services that cached a copy of this user
        kafka.send("user-events",
            String.valueOf(user.getId()),             // partition key = userId (preserves order per user)
            UserUpdatedEvent.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .creditLimit(user.getCreditLimit())
                .version(saved.getVersion())
                .build());
        return saved;
    }
}
```

**Order Service — caches its own READ copy, responds to invalidation events:**
```java
@Service
public class OrderValidationService {

    private final UserServiceClient userClient;  // Feign/WebClient HTTP client to User Service
    private final CacheManager cacheManager;

    // Order Service's OWN cache of user data — separate Redis namespace ('order-users')
    // NOT the same namespace as User Service's 'users' cache
    @Cacheable(value = "order-users", key = "#userId")
    public User getCachedUser(Long userId) {
        // On cache miss: call User Service API — do NOT call the DB or shared Redis directly
        return userClient.getUser(userId);
    }

    // Kafka listener: when user changes, evict the local cached copy
    @KafkaListener(
        topics = "user-events",
        // Unique groupId per service ensures Order Service gets ALL events,
        // not just the ones assigned to it by Kafka load balancing
        groupId = "order-service-cache-sync"
    )
    public void onUserUpdated(UserUpdatedEvent event) {
        Cache cache = cacheManager.getCache("order-users");
        if (cache != null) {
            cache.evict(event.getUserId());
        }
        log.info("Order service evicted user cache for userId={}", event.getUserId());
    }

    public boolean canPlaceOrder(Long userId, BigDecimal orderAmount) {
        User user = getCachedUser(userId);
        return user.getCreditLimit().compareTo(orderAmount) >= 0;
    }
}
```

**application.yml — per-service Redis namespace separation:**
```yaml
# Order Service's application.yml
spring:
  cache:
    type: redis
  data:
    redis:
      host: ${REDIS_HOST}
      port: 6379
  cache:
    redis:
      # Order service uses key prefix 'order-service:' to avoid clashing with User Service keys
      # even if they share the same Redis cluster
      key-prefix: "order-service:"
      time-to-live: 300000   # 5-minute TTL as safety net for missed events
```

> **Key decisions here:**
> - Each service has its own **dedicated cache namespace** — even on a shared Redis cluster, key prefixes prevent cross-service namespace collision
> - The `5-minute TTL` as a safety net means even if the Kafka event fails to deliver, staleness is bounded — services don't serve stale data indefinitely
> - The Kafka event carries the updated field values, not just the key — this allows **cache update** (not just eviction) — Order Service could store the new email directly instead of causing a miss
> - `groupId = "order-service-cache-sync"` is a SHARED group ID here — all Order Service pods share this group, meaning Kafka load balances events across pods and each pod handles a subset: for cache eviction across a pod group this is correct (only ONE pod needs to evict — if that pod has the key; the others will simply miss on the next read and re-populate from User Service API)
> - For 100% eviction guarantee across all pods: use a unique groupId per pod instance (as in Topic 157); choose based on whether you can tolerate one pod serving stale for one TTL window

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why is cache consistency harder in microservices than in a monolith?"

**Hruday's answer:**
> In a monolith, cache consistency is straightforward: you update the DB in the same method that evicts the cache, and everything runs in the same process. You can wrap it in a single transaction. There's one cache, one DB, one codebase.
>
> In microservices, you have multiple services, each with its own DB (database-per-service pattern), each with its own cache. When Service A's data changes, Services B, C, and D may have cached copies of that data in their own caches. There's no single transaction that spans all four services — distributed transactions are too expensive and fragile. And there's no automatic "push update" from one service's data store to another's cache.
>
> The two practical solutions are: enforce strict data ownership so only the data owner's service caches the data and other services always call its API (stronger consistency, more coupling), or use event-driven invalidation where the data owner broadcasts Kafka events and other services listen to evict their copies (eventual consistency, loose coupling, more moving parts). The choice depends on how quickly other services must see changes — real-time financial data needs the former; content catalog data is fine with the latter.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the data ownership rule for caches in microservices and how do Kafka events fit in?"

**Hruday's answer:**
> The data ownership rule is simple: only the service that owns a piece of data is allowed to write to that data's authoritative cache. Other services can maintain their own read-only cached copies, but they don't write to the owner's cache namespace.
>
> This maps directly to the database-per-service pattern. The User Service owns the users table and the `users::*` cache namespace. The Order Service wants user credit limit data for validation. Order Service has two options: either call User Service's API every time (no caching at all), or cache the user data in its own namespace — say `order-users::*` — and take responsibility for keeping that copy fresh.
>
> Kafka events are the bridge for keeping the copy fresh. When User Service updates a user, it publishes a `UserUpdated` event to Kafka. Order Service subscribes to this topic. When it receives the event, it evicts (or updates) its `order-users::userId` cache key. The next read finds a cache miss and calls User Service's API, getting the fresh value.
>
> The Kafka event acts as an asynchronous "your cached copy is now invalid" signal. Combined with a short TTL as a safety net, this gives you eventual consistency — other services' caches will be fresh within seconds of a change, not hours.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the trade-offs between calling a service's API on every request vs caching a local copy with event invalidation?"

**Hruday's answer:**
> Calling the owning service's API on every request — the "cache delegation" approach — gives you the strongest consistency. You always get the most current data because the owner serves from its own cache. The cost is runtime coupling: if User Service is down or slow, every service that calls it degrades. You also add network overhead to every request that needs user data.
>
> Caching a local read copy with event invalidation gives you resilience — even if User Service goes down, Order Service can continue working with its cached user data for the TTL window. It also eliminates the inter-service network call from the hot path. The cost is eventual consistency: from the moment User Service updates data to the moment Order Service receives the Kafka event and evicts its cache, Order Service serves stale data — typically this window is 50–500ms.
>
> My decision framework: for data that affects money (credit limits, balances, permissions) — API delegation, accept the coupling, never serve stale data. For data that affects user experience but not correctness (display name, profile picture, preferences) — local cache with event invalidation, accept 500ms eventual consistency, gain resilience. This is a business requirement question disguised as a technical question.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the caching strategy for an e-commerce checkout where Order Service needs product price and inventory from Product Service, and user credit from User Service."

**Hruday's answer:**
> For checkout, two different consistency requirements apply to the two data sources.
>
> For **inventory and price** from Product Service: I'd cache with a short TTL of 60 seconds combined with event-driven invalidation on price changes. Product price changes are relatively infrequent — a few per day via Product Service's admin APIs. When a price changes, Product Service publishes to `product-events` topic. Order Service subscribes and evicts its cached copy. The short 60-second TTL guarantees at worst 60 seconds of stale price during flash sale activations.
>
> For **inventory count**: I'd NOT cache inventory in Order Service. Inventory changes on every order. Caching an inventory count that might be wrong by even 1 means showing in-stock for a sold-out item. Order Service should always call Product Service's API for inventory check, and Product Service handles its own highly-optimised inventory cache internally. The final inventory decrement must happen within the same transaction as the order creation, using Product Service's database-level locking.
>
> For **credit limit** from User Service: same as inventory — this is financial data. Order Service calls User Service's API for every checkout validation. No local caching. The API call adds ~5ms but correctness is non-negotiable. User Service serves from its own Redis cache, so the 5ms is a Redis read, not a DB query.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Shared Redis namespace | "All microservices share one Redis" | Services that write to each other's cache keys create invisible coupling; use key prefixes per service or separate Redis instances; only the data owner writes to its namespace |
| Kafka consumer group for cache sync | "Use a shared consumer group per topic" | For cross-service broadcast (all Order Service pods must evict), Kafka consumer group must be per-service (shared across pods), not per-pod; but each SERVICE needs its own group |
| "Event-driven is always enough" | "Just use Kafka events, no TTL needed" | Kafka events can be delayed or temporarily unavailable; TTL is a mandatory safety net to bound staleness; events handle the common case, TTL handles the edge case |
| Data ownership confusion | "Any service can read any service's cache" | Only the owning service writes to its cache; other services maintain their own read copies with explicit ownership — crossing this boundary creates hidden dependencies |

---

## 7. Hruday's Real Experience Hook
> "At Bosch, we had multiple Angular frontends each fetching device configuration data from the same backend service. Each frontend application cached the configuration independently in its own Redux store. When a configuration update was made, only the frontend that triggered the update reflected the change — the other frontends showed stale device states. The fix was a WebSocket broadcast: when configuration changed, the backend pushed a `config-invalidated` message to all connected frontends. Each frontend cleared its local cache and re-fetched. This was my first hands-on experience with the distributed cache consistency problem — just applied to the frontend layer. The same principle applies at the microservices level with Kafka instead of WebSockets."

---

## 8. Scale Evolution

**1,000 users/day →** Cache consistency across services is manageable with simple TTL-only approach. Staleness window of 5 minutes is acceptable for most data at this scale. If a service needs truly fresh data, just call the owner's API — overhead is acceptable.

**100,000 users/day →** Runtime coupling between services starts to matter. If User Service handles 10,000 API calls per second from 3 other services all calling for user data, it becomes a bottleneck. Local cached copies with event-driven invalidation become important for performance. The Kafka invalidation pipeline should be set up now before it becomes urgent.

**10 million users/day →** Each service needs its own Redis namespace or cluster for its local cache copies. The Kafka invalidation pipeline handles thousands of cache events per second. Cache key versioning (storing `version` alongside data) allows detecting stale reads even after eviction failure. A dedicated cache invalidation service coordinates invalidation across all services and cache layers (Redis L2 + CDN L3).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment service, merchant service, notification service all need user financial profile — shared Redis IS the anti-pattern; API delegation for financial data | Do you know when NOT to cache and always call the owner's API? |
| Swiggy / Meesho | Order service, delivery service, user service, catalogue service — classic multi-service cache consistency problem; event-driven invalidation via Kafka | Can you design the Kafka event schema and consumer group setup for cross-service cache sync? |
| Adobe / Microsoft | Creative asset ownership, document sharing — multiple services reading document metadata; collaborative editing adds write contention | How do you handle cache consistency when multiple users can edit the same document? |
| SAP Labs | ERP services share master data (materials, customers, pricing) — each service caches its own copy; SAP's event stream (change data capture) is the invalidation mechanism | Can you explain change data capture as an invalidation trigger instead of application-level events? |

---

## 10. Related Topics — What to Study Next

- **Topic 157 — Cache Invalidation Strategies** — foundational to this topic; the event-driven invalidation pattern in detail with code
- **Topic 79 — Outbox Pattern** — ensures the Kafka UserUpdated event is reliably published even if the service crashes between DB write and Kafka publish
- **Topic 78 — Eventual Consistency** — the consistency model you're accepting with event-driven cache invalidation; what "eventually consistent" means in practice
- **Topic 67 — Asynchronous Communication via Kafka** — the Kafka fundamentals needed to design consumer group topology for cache sync
- **Topic 160 — Redis as Distributed Cache** — the Redis layer being kept consistent; shared vs separate Redis instances per service

---

*Part 9 · Cache Consistency in Microservices · Full Stack Interview Guide · Hruday D · 2026*
