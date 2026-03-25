# Redis Pub/Sub Basics
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Redis Pub/Sub (Publish/Subscribe) is a messaging pattern where publishers send messages to a named channel and all current subscribers immediately receive those messages. Publishers and subscribers don't know about each other — they only know the channel name.
- The critical characteristic that defines its use cases: **fire and forget**. If no subscriber is listening when a message is published, that message is lost. Redis Pub/Sub has zero message durability — it is NOT a message queue. If a subscriber disconnects and reconnects, it misses all messages published during the gap.
- When to use Pub/Sub: real-time notifications that are valuable only right now (live chat, typing indicators, dashboard live updates, cache invalidation signals). When to NOT use: anything where every message must be processed (order events, payment confirmations, audit logs). For durability, use Kafka or RabbitMQ.
- Redis also has **Pub/Sub with patterns** (PSUBSCRIBE): subscribe to channels matching a glob pattern. `PSUBSCRIBE order:*` receives messages from `order:placed`, `order:shipped`, `order:cancelled` all at once. Useful when you need a single subscriber to listen on many related channels.
- Redis Streams (XADD/XREAD) were built to fix Pub/Sub's durability gap — Streams are persistent, replayable, and support consumer groups. In 2026, if you need messaging inside Redis, Streams are usually the better choice over raw Pub/Sub.
- Gap to bridge: many candidates describe Pub/Sub as "like Kafka but in Redis." It is not. Kafka persists every message and replays from any offset. Redis Pub/Sub is an in-memory signal bus with no history, no replay, no consumer groups, no delivery guarantees.

---

## 1. One-Line Definition
Redis Pub/Sub is a real-time message broadcast system where a publisher sends a message to a channel and all currently-connected subscribers receive it immediately — with no storage, no delivery guarantee, and no replay.

---

## 2. The Problem It Solves

You are building a live sports scoring dashboard. Thousands of users have the page open. When a goal is scored, the score updates on every user's screen within a second. How do you push that update from your backend to all connected users?

Option 1 — polling: every browser polls the backend API every second. 10,000 users × 1 request/second = 10,000 API calls per second to check if the score changed. Result: enormous unnecessary load, 1-second delay at worst.

Option 2 — WebSocket + Redis Pub/Sub: your backend maintains WebSocket connections to all 10,000 users. But your backend is not one server — it is 5 load-balanced servers. User A is connected to Server 1 and User B is connected to Server 3. When User A's server receives the goal event, it needs to push to ALL 10,000 users, not just the users on its own WebSocket connections.

Redis Pub/Sub solves the cross-server broadcast problem. When a goal is scored, any backend server publishes to a Redis channel: `PUBLISH score-updates "{\"matchId\":42, \"score\":\"2-1\"}"`. All 5 backend servers subscribe to that same channel. All receive the message in milliseconds. Each server then pushes the update to all WebSocket connections it holds. Total result: all 10,000 users get the update with sub-second latency.

This is the canonical use case: Redis Pub/Sub as the cross-process fanout mechanism that bridges WebSocket servers.

---

## 3. How It Works Internally

### The Mental Model
Think of Redis Pub/Sub like a radio station and radios. The radio station (publisher) broadcasts on a frequency (channel). Any radio (subscriber) tuned to that frequency at that moment hears the broadcast instantly. If your radio is off when the broadcast happens — you miss it, and there is no replay. The station does not store old broadcasts. It only broadcasts to right now.

### Mechanism — Step by Step

```
PUBLISHER                    REDIS SERVER               SUBSCRIBERS
────────────────             ─────────────────          ──────────────────
                             Channel: "alerts"          Server 1 ─┐
PUBLISH alerts "flash-sale"  ──────────────────►        Server 2 ─┤ all receive
                             Internal lookup:           Server 3 ─┘ the message
                             which connections are       simultaneously
                             subscribed to "alerts"?
                             Deliver to each one.
                              (~0.1ms per subscriber)
```

### Command Reference

```
PUBLISHING (no subscribe state needed):
  PUBLISH channel message      → send message to channel
                                 returns: number of subscribers that received it

SUBSCRIBING (connection shifts to subscriber mode):
  SUBSCRIBE channel [channel…] → subscribe to one or more channels
                                 Once in subscribe mode, only SUBSCRIBE,
                                 UNSUBSCRIBE, PING, RESET, QUIT are allowed.
                                 You cannot run GET or SET while subscribed.

  UNSUBSCRIBE [channel…]       → leave channel(s)
  PSUBSCRIBE pattern           → subscribe by glob pattern
                                 e.g., PSUBSCRIBE order:* → receives all order:X channels
  PUNSUBSCRIBE [pattern]       → leave pattern subscription

WHAT YOU RECEIVE (subscriber gets a 3-part reply):
  1. Message type: "message" | "subscribe" | "unsubscribe"
  2. Channel name: "alerts"
  3. Message content: "flash-sale"
```

### ASCII Diagram — Multi-Server WebSocket Fanout

```
Browser clients                    Backend (5 WS servers)         Redis
────────────────                   ───────────────────────        ─────────────
User 1 ──WebSocket──► WS Server 1 ─── SUBSCRIBE live:scores ────►
User 2 ──WebSocket──► WS Server 1      (all 5 servers listen)    │ Channel:
User 3 ──WebSocket──► WS Server 2 ─── SUBSCRIBE live:scores ────►│ live:scores
User 4 ──WebSocket──► WS Server 2                                 │
User 5 ──WebSocket──► WS Server 3 ─── SUBSCRIBE live:scores ────►│
...                   WS Server 4 ─── SUBSCRIBE live:scores ────►│
Users 9-10 ──────────► WS Server 5 ── SUBSCRIBE live:scores ────►│
                                                                   │
Score Update Event:                                                │
                        Score Service ─── PUBLISH live:scores "2-1" ──►
                                                                   │
                                                                   │ Redis broadcasts to
                                                                   │ ALL 5 subscribers
                                                                   │
                       ◄── WS Server 1 receives "2-1" ────────────┘
                            pushes to User 1, User 2
                       ◄── WS Server 2 receives "2-1"
                            pushes to User 3, User 4
                       ◄── WS Server 3-5 receive, push to their users
                                                                   
Result: All 10 users see score "2-1" within ~50ms of the event
```

---

## 4. The Code

### Wrong Way — Using Pub/Sub for Order Events (Durability Required)

```java
// Wrong: using Redis Pub/Sub for order processing events
// An order event MUST be processed. If the subscriber is down for
// 30 seconds during a deployment, all orders placed in that window are lost.
// No retry, no DLQ, no replay — Redis Pub/Sub provides none of these.
redisTemplate.convertAndSend("orders", orderEventJson);

// This is correct for: UI notifications that can be missed (typing indicators)
// This is WRONG for: events that must trigger business logic (payment, shipment)
```
> **Why this fails in production:** Redis Pub/Sub does not persist messages. A subscriber restart, network hiccup, or Redis failover loses all messages published during the gap. For order processing, this means silent data loss — orders never fulfilled, payments never processed.

### Right Way — Spring Boot WebSocket + Redis Pub/Sub Broadcast

```java
// Configuration: wire Redis Pub/Sub message listener
@Configuration
public class RedisPubSubConfig {

    @Bean
    public RedisMessageListenerContainer container(
        RedisConnectionFactory connectionFactory,
        MessageListenerAdapter listenerAdapter
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        // Subscribe this listener to the "live:scores" channel
        container.addMessageListener(listenerAdapter, new ChannelTopic("live:scores"));
        return container;
    }

    @Bean
    public MessageListenerAdapter listenerAdapter(ScoreUpdateHandler handler) {
        // "onMessage" is the method called on new messages
        return new MessageListenerAdapter(handler, "onMessage");
    }
}

// Handler: receives Redis Pub/Sub message, broadcasts to all WebSocket clients
@Component
public class ScoreUpdateHandler {

    private final SimpMessagingTemplate websocketTemplate;

    public ScoreUpdateHandler(SimpMessagingTemplate websocketTemplate) {
        this.websocketTemplate = websocketTemplate;
    }

    // Called by Redis when a message arrives on "live:scores"
    public void onMessage(String message, String channel) {
        // Broadcast to all WebSocket clients subscribed to /topic/scores
        // This is the bridge: Redis Pub/Sub → WebSocket fanout
        websocketTemplate.convertAndSend("/topic/scores", message);
    }
}

// Publisher: score service publishes when a goal is scored
// Can run on ANY backend server — all servers are subscribed
@Service
public class ScoreService {

    private final RedisTemplate<String, String> redisTemplate;

    public ScoreService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void recordGoal(Long matchId, ScoreUpdate update) {
        // Persist to database first — durability via DB, not Redis
        matchRepository.updateScore(matchId, update);

        // Then publish to Redis — real-time notification only
        // If this publish fails, users miss the live update but the match record is correct
        String payload = objectMapper.writeValueAsString(update);
        redisTemplate.convertAndSend("live:scores", payload);
    }
}
```

### Right Way — Cache Invalidation via Pub/Sub

```java
// Pattern: update database → publish invalidation event → all servers clear their cache

// Publisher: called after a product update
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final LocalCacheService localCache; // in-memory Caffeine cache on this server

    public void updateProduct(Long productId, UpdateProductRequest request) {
        productRepository.updateProduct(productId, request);
        // Notify all backend servers to evict their local cache for this product
        redisTemplate.convertAndSend("cache:invalidate:product", productId.toString());
    }
}

// Subscriber (runs on EVERY backend server):
@Component
public class CacheInvalidationListener {

    private final LocalCacheService localCache;

    @Bean
    public MessageListenerAdapter invalidationAdapter() {
        return new MessageListenerAdapter(this, "onInvalidation");
    }

    public void onInvalidation(String productId, String channel) {
        // Each server evicts its own local cache entry
        localCache.evict("product:" + productId);
        // Now every server's next request for this product fetches fresh data from Redis/DB
    }
}
```

> **Key decisions here:**
> - Always persist to DB BEFORE publishing — if the publish fails, data integrity is preserved
> - Redis Pub/Sub for UI notifications only — never as the sole trigger for business logic
> - Cache invalidation is a good Pub/Sub use case: if the invalidation message is missed, the cache expires by TTL anyway (safety net exists)

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Redis Pub/Sub and what are its limitations?"

**Hruday's answer:**
> Redis Pub/Sub is a messaging system built into Redis where publishers send messages to named channels and subscribers receive them in real time. It's extremely fast — sub-millisecond delivery in most setups — and is built into Redis with no additional infrastructure.
>
> But it has important limitations. First, no durability: published messages are not stored. If a subscriber is disconnected when a message arrives, that message is gone. Second, no delivery guarantee: the PUBLISH command returns the number of current subscribers, but you have no way to know if they actually processed the message. Third, no replay: you cannot ask Redis "give me the last 100 messages on this channel." Fourth, when a connection is in subscribe mode, it can't execute any other commands — you need a dedicated connection.
>
> These limitations define when you can and can't use Pub/Sub. Use it when messages are ephemeral — typing indicators, live score updates, cache invalidation signals. Don't use it when every message must be processed — order events, payment events, anything with audit requirements. For durability inside Redis, Redis Streams solves these problems. For cross-system messaging with persistence, Kafka is the right tool.

---

### Q2 — Deep Dive
**Interviewer asks:** "How would you use Redis Pub/Sub to coordinate cache invalidation across a cluster of backend servers?"

**Hruday's answer:**
> Each backend server has a local in-memory cache — something like Caffeine — for the very hottest data: user roles, feature flags, reference data. This avoids even the Redis network hop. The problem is coherence: when the data changes, all servers' local caches need to evict the stale entry.
>
> The pattern is: on every backend server startup, subscribe to a `cache:invalidate` Redis channel. When an admin updates a feature flag or user role, the write service publishes the updated key to that Redis channel. All backend servers receive the message simultaneously and each evicts the corresponding local cache entry. The next request on any server fetches fresh data from Redis (or the database), re-populates the local cache, and stays fresh until the next invalidation.
>
> The important safety net: Pub/Sub provides no delivery guarantee. If a server misses an invalidation message — say it was restarting during the publish — its local cache may be stale until the TTL expires. This is acceptable for reference data where stale data for a few minutes causes no harm. For security-critical data like permission changes, I'd either use shorter TTLs or skip local caching entirely and route those reads directly to Redis.
>
> I'd use the same pattern I described: a Spring `RedisMessageListenerContainer` subscribed to the invalidation channel, with a `MessageListenerAdapter` that calls a local cache eviction method on receipt.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Redis Pub/Sub vs Redis Streams — when would you choose each?"

**Hruday's answer:**
> Redis Pub/Sub is the right choice when: the message is only valuable right now, missing it is acceptable, and you don't need replay or consumer groups. Live score updates, typing indicators, presence notifications — if a user misses a "User X is typing" indicator because of a transient network issue, it has no business consequence.
>
> Redis Streams are the right choice when: every message must be processed, you need consumer groups (distributed processing), or you need replay (resume from last-processed offset). Think of Streams as a lightweight Kafka built into Redis. Like Kafka, each consumer group tracks its own offset independently. Like Kafka, messages are persistent and replayable. Unlike Pub/Sub, a consumer that was offline reconnects and reads from its last acknowledged message ID — no data loss.
>
> The rule I use: if a missed message would require a user action (retry, refresh, re-request) or would silently skip a business step — use Streams. If a missed message is just a missed instant notification — use Pub/Sub. If the scope goes beyond Redis — multiple services, long retention, massive throughput — use Kafka.
>
> In 2026, I'd default to Streams for any new event processing within a single system, and Pub/Sub only for the specific real-time broadcast cases it's designed for.

---

### Q4 — Scenario
**Interviewer asks:** "Design the real-time notification system for a food delivery app where drivers and customers receive live order status updates."

**Hruday's answer:**
> This is exactly the cross-server WebSocket fanout problem Pub/Sub solves well.
>
> Architecture: all mobile clients (driver app and customer app) maintain WebSocket connections to a fleet of WebSocket gateway servers. The backend has separate services for order management. When an order status changes (placed → accepted → picked up → delivered), the order service publishes the event.
>
> Redis Pub/Sub connects everything: the order service publishes to a channel `order:status:{orderId}`. Every WebSocket gateway server subscribes to ALL order channels using pattern subscription: `PSUBSCRIBE order:status:*`. When a status change arrives, each gateway server checks which of its WebSocket connections belongs to the customer and driver on that order and pushes directly.
>
> Alternative: use per-user channels `user:{userId}:notifications`. The order service resolves which user IDs are involved (customer and driver) and publishes to each user's channel. WebSocket servers subscribe to the channels of the users they are serving. This is more targeted but requires the order service to know user IDs, which it already does.
>
> Important: the Pub/Sub notification is a best-effort delivery for the real-time UI. The source of truth for order status is the database. If a mobile client loses connection and misses a Pub/Sub message, it polls the order status API when it reconnects. Pub/Sub handles the real-time fast path; the REST API handles the reconnect fallback.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Pub/Sub persists messages like Kafka" | "I'll use Redis Pub/Sub to replace Kafka for events" | "Redis Pub/Sub has zero message persistence. A subscriber restart loses all messages published during the downtime. Kafka retains messages for configurable periods (days, weeks) and lets consumers replay from any offset. These are fundamentally different tools for different problems. For event streaming with delivery guarantees, use Kafka or RabbitMQ. Use Redis Pub/Sub for ephemeral real-time signals only." |
| "PUBLISH returns success means delivery" | "I know a message was delivered because PUBLISH returned 1" | "PUBLISH returns the number of subscribers that received the message at that instant. It means they received it in Redis's network buffer — it does NOT mean they processed it, that their consumer code ran, or that they acknowledged it. If the subscriber crashes after receiving the message but before processing it, the message is lost and PUBLISH already returned 1. Pub/Sub is at-most-once delivery — there is no acknowledgment mechanism." |
| "Use Pub/Sub for all inter-service events" | "Services publish events to Redis Pub/Sub channel" | "Redis Pub/Sub is not designed for inter-service messaging at production scale. If Service A publishes an order event and Service B is restarting during that 5-second window, Service B never processes the order. Silent data loss in a distributed system. Use Kafka (persistent, replayable, consumer groups), RabbitMQ (durable queues, ACK mechanism), or Redis Streams (persistence + consumer groups within Redis). Pub/Sub is for same-system real-time fanout, not cross-service event buses." |
| "Subscriber connection can run normal commands" | "I'll subscribe and then also run GET/SET on the same connection" | "A Redis connection in subscribe mode is locked. The only valid commands are SUBSCRIBE, UNSUBSCRIBE, PSUBSCRIBE, PUNSUBSCRIBE, PING, RESET, and QUIT. Any other command returns an error. In practice, you must allocate a dedicated Redis connection for subscriptions, separate from the connection pool used for GET/SET/ZADD operations. Spring's RedisMessageListenerContainer handles this automatically with its own connection." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we had a case where updating a user's permissions needed to take effect immediately across all active sessions. The naïve solution was to flush all permission caches system-wide on every admin update, which was disruptive and slow. The better solution was a targeted Pub/Sub invalidation: admin update → PUBLISH cache:permissions:invalidate userId → all app servers clear that user's permission cache → the next request for that user fetches fresh data. It's a one-line publish, and every server reacts in milliseconds without polling. The beauty of it was: even if a server missed the message (restart during publish), the short TTL on the permission cache (5 minutes) acted as a safety net — worst case, stale permissions for 5 minutes, not indefinitely."

---

## 8. Scale Evolution

**1,000 users →** A single Redis instance handles Pub/Sub easily. One channel per live entity (one "live:scores" channel for all sports updates). Minimal subscriber count.

**100,000 users →** Channel volume increases. 100K WebSocket connections spread across multiple gateway servers. Pattern subscriptions (`PSUBSCRIBE order:status:*`) must be bounded — a single subscriber to `PSUBSCRIBE *` on a high-traffic instance creates O(N_channels) CPU overhead per publish.

**10 million users →** Redis Pub/Sub alone is insufficient for true fan-out at this scale. Common pattern: move to Kafka for the event bus (durable, high-throughput). Each WebSocket gateway server is a Kafka consumer and translates Kafka messages to WebSocket pushes. Kafka handles the persistence and replay; the Kafka → WebSocket layer handles the last-mile delivery. Redis Pub/Sub may still exist but only for same-node coordination, not cluster-wide event distribution.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment status WebSocket updates to merchant dashboards. Redis Pub/Sub bridges backend services to WebSocket gateway servers sending live payment status to merchant POS systems. | "How do you push real-time payment status to a merchant's POS system connected via WebSocket?" |
| Swiggy / Meesho | Live order tracking — customer sees driver position update every 10 seconds. Redis Pub/Sub connects the location service to WebSocket gateways. | "Design the real-time order tracking system. How do location updates reach the customer's phone?" |
| Adobe / Microsoft | Real-time collaboration features — user presence, document edit notifications. Redis Pub/Sub for presence broadcast across multi-server collaboration backend. | "In your collaborative editor, how do you notify all active users when someone joins or leaves the document?" |
| SAP Labs (current) | Cache invalidation across clustered app servers for reference data (GL accounts, company codes). Redis Pub/Sub for targeted, immediate cache bust. | "How do you ensure a permission change by an admin propagates to all active sessions within seconds?" |

---

## 10. Related Topics — What to Study Next

- **Topic 104 — Redis Distributed Lock** — uses the same Redis String commands (SETNX) but for mutual exclusion; understanding why Pub/Sub has no delivery guarantee helps motivate why locks are needed for stampede prevention
- **Topic 107 — Kafka Topics, Partitions, Consumer Groups** — start of Part 6; Kafka solves all the durability and replay limitations of Pub/Sub; understanding both helps you choose correctly
- **Topic 132 — WebSockets** — the front-end half of the real-time notification story; Redis Pub/Sub is the back-end bridge; WebSocket is the delivery mechanism to the browser
- **Topic 133 — Server-Sent Events** — an alternative to WebSocket for one-way server-to-browser streaming; sometimes a simpler fit than Redis Pub/Sub + WebSocket when the direction is always server-to-client

---

*Part 5 · Redis Pub/Sub Basics · Full Stack Interview Guide · Hruday D · 2026*
