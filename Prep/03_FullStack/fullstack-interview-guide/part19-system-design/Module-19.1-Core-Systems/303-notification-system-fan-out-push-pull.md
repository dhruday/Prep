# Notification System — Fan-Out, Push vs Pull
> Part 19 — System Design Case Studies · High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The problem**: you need to send one event (order placed) to many users via many channels (email, SMS, push notification, in-app) without the originating service waiting for any of them
- **Fan-out on write**: when event occurs, immediately push notification to every subscriber's channel; low read latency; high write amplification — 10M followers = 10M write operations
- **Fan-out on read**: don't push at write time; reader fetches notifications when they log in; low write cost; high read cost; notifications feel delayed
- **Hybrid**: fan-out on write for most users; fan-out on read for celebrities/super-nodes with millions of followers (the "celebrity problem")
- **Push**: server sends data to client proactively; technologies: WebSocket, SSE (Server-Sent Events), Firebase Cloud Messaging (FCM), APNs; requires persistent connection or a token registered with a push service
- **Pull**: client requests new notifications periodically (polling) or on demand; simpler, no persistent connection; latency = poll interval
- **Delivery guarantees**: at-least-once is standard for most notifications; idempotency key prevents duplicate notifications if consumer retries; critical notifications (2FA codes) need strict deduplication
- **Multi-channel**: decouple channel from event — a `NotificationEvent` message on Kafka triggers separate consumers for email (SendGrid), SMS (Twilio), push (FCM/APNs), in-app (WebSocket)

---

## 1. One-Line Definition
A notification system delivers event-driven alerts to users via one or more channels (email, SMS, push, in-app) by decoupling event production from delivery, using a fan-out pattern to scale to millions of recipients without blocking the originating service.

---

## 2. The Problem It Solves

An e-commerce platform's order service calls SendGrid, Twilio, and Firebase directly when an order is placed. One day the SMS provider's API is slow — 8-second response. The order placement endpoint now takes 8 seconds for every user. Worse, if the push notification call fails halfway through, did the user get a partial set of notifications? And when Black Friday brings 50,000 orders per minute, the order service is blocked sending 150,000 notification API calls.

The notification system pattern solves this by making notification delivery completely asynchronous. The order service fires one event to a queue and returns immediately. Separate, horizontally scalable workers consume the queue and handle delivery. Failure in one channel doesn't affect others. Scale each channel independently.

---

## 3. How It Works Internally

### The Mental Model
Think of a newspaper. The editor (order service) writes one article (event). The printing press (fan-out service) makes copies for each subscriber. Different delivery trucks (channel workers) carry papers to your door (email), your phone (SMS), and your tablet (push). The editor doesn't wait for delivery — they write the next article.

### Architecture Breakdown

```
Event Source                Fan-Out Service             Delivery Workers
┌─────────────┐            ┌─────────────────┐         ┌──────────────────┐
│ Order Svc   │            │                 │  Email  │ Email Worker     │ → SendGrid
│ Payment Svc │ ──event──▶ │  Notification   │ ──────▶ │ (Spring @Kafka)  │
│ Shipping    │            │  Orchestrator   │  SMS    ├──────────────────┤
│ Svc         │            │  (Kafka topic:  │ ──────▶ │ SMS Worker       │ → Twilio
└─────────────┘            │  notify.*)      │  Push   ├──────────────────┤
                           │                 │ ──────▶ │ Push Worker      │ → FCM / APNs
                           │  Fan-out:       │  InApp  ├──────────────────┤
                           │  - look up      │ ──────▶ │ InApp Worker     │ → Redis
                           │    user prefs   │         │  (WebSocket pub) │   Pub/Sub
                           │  - per channel  │         └──────────────────┘
                           │    queue        │
                           └─────────────────┘
                                  │
                           ┌──────▼──────────┐
                           │ User Pref DB    │
                           │ (channel prefs, │
                           │  quiet hours,   │
                           │  opt-outs)      │
                           └─────────────────┘
```

### Fan-Out Algorithm

```
For each notification event:
  1. Load user preferences (channel wants, quiet hours, frequency caps)
  2. Filter channels the user has enabled
  3. For each enabled channel:
     - Create a channel-specific message (personalise subject, body, deeplink)
     - Publish to channel's Kafka topic (email.send, sms.send, push.send, inapp.send)
     - Record notification in DB (status = PENDING)
  4. Return immediately — do not wait for delivery confirmation
  
Each channel worker separately:
  - Consumes from its topic
  - Calls external API (SendGrid / Twilio / FCM)
  - On success: update DB status = DELIVERED
  - On failure: dead letter queue (DLQ); retry up to 3x; then status = FAILED
  - Emit Kafka event for analytics
```

---

## 4. The Code

### Wrong Way — Synchronous Multi-Channel Delivery

```java
// ❌ Order service directly calls all notification providers synchronously

@Service
public class OrderService {
    private final EmailService emailService;
    private final SmsService smsService;
    private final PushService pushService;
    
    @Transactional
    public Order placeOrder(CreateOrderRequest req) {
        Order order = orderRepository.save(createOrder(req));
        
        // ❌ If any of these throws, order placement partially fails
        // ❌ Each call adds latency to the user's checkout
        // ❌ SMS provider slow? User waits 8 seconds to see "Order Placed"
        // ❌ Can't retry independently; all-or-nothing failure model
        emailService.sendOrderConfirmation(req.getUserId(), order);     // 800ms
        smsService.sendOrderSms(req.getUserId(), order);                // 3000ms ← SMS provider slow
        pushService.sendOrderPush(req.getUserId(), order);              // 200ms
        
        // ❌ Total added latency: 4+ seconds for user just to confirm their order
        return order;
    }
}
```

```java
// ✅ Event-driven async notification via Kafka

@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final KafkaTemplate<String, NotificationEvent> kafkaTemplate;
    
    @Transactional
    public Order placeOrder(CreateOrderRequest req) {
        Order order = orderRepository.save(createOrder(req));
        
        // ✅ Fire-and-forget event — returns in < 5ms
        NotificationEvent event = NotificationEvent.builder()
            .eventId(UUID.randomUUID().toString())    // idempotency key
            .type(NotificationType.ORDER_PLACED)
            .userId(req.getUserId())
            .payload(Map.of(
                "orderId",    order.getId(),
                "totalAmount", order.getTotal(),
                "itemCount",   order.getItems().size()
            ))
            .occurredAt(Instant.now())
            .build();
        
        kafkaTemplate.send("notification.events", req.getUserId(), event);
        // ✅ Order response returned immediately; notification delivery is async
        return order;
    }
}

// ✅ Notification orchestrator — fan-out on write
@KafkaListener(topics = "notification.events", groupId = "notification-fanout")
@Service
public class NotificationOrchestrator {
    private final UserPreferenceService prefService;
    private final NotificationRepository notifRepo;
    private final KafkaTemplate<String, ChannelEvent> channelKafka;
    
    @KafkaHandler
    public void fanOut(NotificationEvent event) {
        UserPreferences prefs = prefService.getPreferences(event.getUserId());
        
        if (prefs.isInQuietHours()) {
            // ✅ Schedule for later instead of swallowing the notification
            notifRepo.saveScheduled(event, prefs.getQuietHoursEnd());
            return;
        }
        
        if (prefs.isFrequencyCapped(event.getType())) {
            // ✅ User has seen too many of this type today — skip
            return;
        }
        
        // ✅ Persist notification record before sending to channels
        Notification notif = notifRepo.save(Notification.builder()
            .id(UUID.randomUUID().toString())
            .eventId(event.getEventId())
            .userId(event.getUserId())
            .type(event.getType())
            .status(NotificationStatus.PENDING)
            .createdAt(Instant.now())
            .build());
        
        // ✅ Fan out to each enabled channel independently
        List<Channel> enabledChannels = prefs.getEnabledChannels();
        
        for (Channel channel : enabledChannels) {
            ChannelEvent channelEvent = ChannelEvent.builder()
                .notificationId(notif.getId())
                .channel(channel)
                .userId(event.getUserId())
                .type(event.getType())
                .payload(event.getPayload())
                .idempotencyKey(event.getEventId() + ":" + channel.name())
                .build();
            
            // ✅ Each channel has its own topic: email.send, sms.send, push.send, inapp.send
            channelKafka.send(channel.getTopicName(), event.getUserId(), channelEvent);
        }
    }
}

// ✅ Email channel worker
@KafkaListener(topics = "email.send", groupId = "email-delivery")
@Service
public class EmailDeliveryWorker {
    private final SendGridClient sendGrid;
    private final NotificationRepository notifRepo;
    private final TemplateEngine templateEngine;
    
    @KafkaHandler
    @Retryable(retryFor = {SendGridException.class}, maxAttempts = 3,
               backoff = @Backoff(delay = 1000, multiplier = 2))  // exponential backoff
    public void deliver(ChannelEvent event) {
        // ✅ Idempotency check — if already delivered (reprocessing after crash), skip
        if (notifRepo.isDelivered(event.getNotificationId(), Channel.EMAIL)) {
            log.info("Email already delivered for notification {}", event.getNotificationId());
            return;
        }
        
        String subject = templateEngine.renderSubject(event.getType(), event.getPayload());
        String body    = templateEngine.renderBody(event.getType(), event.getPayload());
        
        sendGrid.send(SendGridEmail.builder()
            .to(event.getUserEmail())
            .subject(subject)
            .htmlBody(body)
            .idempotencyKey(event.getIdempotencyKey())  // SendGrid dedup
            .build());
        
        notifRepo.updateStatus(event.getNotificationId(), Channel.EMAIL, NotificationStatus.DELIVERED);
    }
    
    @Recover
    public void onEmailFailure(SendGridException ex, ChannelEvent event) {
        log.error("Email delivery permanently failed for notification {}: {}", 
                  event.getNotificationId(), ex.getMessage());
        notifRepo.updateStatus(event.getNotificationId(), Channel.EMAIL, NotificationStatus.FAILED);
        // ✅ Dead-letter topic — ops team can replay or investigate
    }
}
```

```typescript
// ✅ Frontend: real-time in-app notifications via SSE

// React hook for notification stream
function useNotifications(userId: string) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    
    useEffect(() => {
        // ✅ SSE is simpler than WebSocket for server-to-client only stream
        const eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`, {
            withCredentials: true
        });
        
        eventSource.addEventListener('notification', (event) => {
            const notif = JSON.parse(event.data) as Notification;
            setNotifications(prev => [notif, ...prev].slice(0, 50));  // keep last 50
            setUnreadCount(prev => prev + 1);
        });
        
        eventSource.onerror = () => {
            // ✅ SSE auto-reconnects; log but don't crash
            console.warn('Notification stream disconnected, browser will reconnect');
        };
        
        return () => eventSource.close();
    }, [userId]);
    
    const markRead = useCallback(async (notificationId: string) => {
        await fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
        setNotifications(prev => prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);
    
    return { notifications, unreadCount, markRead };
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is fan-out and when would you choose fan-out on read vs fan-out on write?"

**Hruday's answer:**
> Fan-out is spreading one event to many destinations. Fan-out on write means when a user posts something, you immediately push a copy to every follower's feed. Fan-out on read means followers fetch the author's timeline when they open the app — you compute their feed at read time from who they follow.
>
> Fan-out on write is better for most users because reads are fast — the feed is pre-computed. But it breaks down for celebrity accounts. If Elon Musk posts a tweet and 150 million followers all get a copy pushed immediately, that's 150 million write operations for one post. The write path can't sustain that.
>
> The hybrid model — used by Twitter, Instagram — does fan-out on write for regular users (up to ~1M followers), and fan-out on read for verified mega-accounts. Regular users get instant timeline updates. Celebrities' posts are fetched and merged in at read time. The client sees no difference; the infrastructure difference is enormous.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you guarantee a notification is delivered exactly once across a distributed system?"

**Hruday's answer:**
> Exactly-once delivery across external APIs (SendGrid, Twilio, FCM) is not achievable in the strict sense — these external systems are outside your transaction boundary. What you can achieve is at-least-once delivery with deduplication at the consumer end, which gives the user the experience of exactly-once.
>
> The mechanism: every notification event carries an idempotency key — a UUID generated by the producer and stable across retries. The channel worker checks this key against a `delivered_notifications` table before calling the external API. If a row already exists, the worker skips the call and returns success. If not, it calls the API, then inserts the row. Use a UNIQUE constraint on `(idempotency_key, channel)` — if two workers race, one succeeds and the other gets a unique constraint violation, which it treats as "already delivered" and exits cleanly.
>
> External providers like SendGrid and Twilio also accept an idempotency key header — they deduplicate on their end too. Belt and suspenders: our dedup prevents the call; their dedup prevents duplicate send even if we call twice.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "WebSocket vs Server-Sent Events vs long polling for in-app notifications — which do you pick?"

**Hruday's answer:**
> Server-Sent Events for notifications — one-directional server-to-client stream is exactly what SSE is designed for.
>
> WebSocket is bidirectional — client can send data back to server over the same connection. That's the right choice for chat, collaborative editing, live gaming. For notifications, the client doesn't need to push data back over the notification channel. WebSocket adds complexity (reconnection handling, custom protocol, load balancer sticky sessions) without benefit for this use case.
>
> Long polling works everywhere but wastes resources — client fires HTTP request, connection hangs, server responds when there's something to say. Every long-poll cycle is a full HTTP round-trip. Scales poorly at high volume.
>
> SSE works over plain HTTP/1.1 or HTTP/2. Browsers handle reconnection automatically. No sticky session requirement at the load balancer because each SSE reconnect is a fresh request — the server looks up missed notifications from Redis and replays them. Simple backend: Spring's `SseEmitter` or a reactive `Flux<ServerSentEvent>`. Supported in all browsers without a polyfill. The only downside: HTTP/1.1 browsers have a 6-connection-per-domain limit — SSE uses one of them. HTTP/2 multiplexing eliminates this entirely.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design a notification system that sends 10 million push notifications per hour."

**Hruday's answer:**
> Push notifications go through FCM (Android) and APNs (iOS) — they are the bottleneck, not our system. FCM supports batch sends up to 500 tokens per request. 10M/hour = ~2,780/second. At 500 per batch, that's ~6 batch requests/second to FCM, well within FCM's rate limits.
>
> Architecture: Kafka topic `push.send` with 20 partitions, each consumed by a Push Worker instance. Worker batches tokens up to 500 and calls FCM batch API. Each worker handles one partition — 20 workers × 500/batch × 10 batches/sec = 100,000 push/second = 360M/hour, far above our requirement.
>
> Token management: store FCM/APNs device tokens in Redis (fast lookup) with `userId:deviceId` as key. Tokens expire — FCM returns `registration not registered` for stale tokens; delete them from the store immediately and update the DB.
>
> Priority tiers: high-priority (2FA, fraud alert) → immediate send, bypass batching; normal (order updates, promotions) → batch; promotional (marketing) → rate limited to 1M/hour max to avoid Apple/Google throttling our app's push quota.
>
> Silent notifications for counts: instead of sending text push for every event, send a "badge update" silent push that tells the app to fetch fresh notification count. This avoids notification flooding while keeping badges accurate.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Ignoring user preferences | "Send notification to all users when event occurs" | User preferences are first-class: quiet hours (don't SMS someone at 3am), channel preferences (some users want email only, not SMS), frequency caps (don't send the same user more than 5 promotional emails per week), opt-outs (GDPR / CAN-SPAM require honouring unsubscribe immediately); load preferences before fan-out, not after; cache them aggressively in Redis with 5-minute TTL; a notification system that ignores preferences generates legal risk and user churn |
| No delivery tracking | "I'll just send and assume it's delivered" | Without delivery tracking you can't answer: did the notification go out? did the email provider accept it? did the user's device receive the push?; track every notification in a `notifications` table with status (PENDING → ACCEPTED → DELIVERED → SEEN); channel workers update status after each step; this data feeds dashboards, SLA reporting, and retry logic; without it, "why didn't I get my OTP?" becomes an unanswerable support ticket |
| Celebrity problem ignored | "Fan-out on write for all users — simple and consistent" | For any social feature where users can have asymmetric follower counts, the celebrity problem is a real scaling issue; one user with 50M followers doing fan-out on write = 50M DB writes per post; this can saturate your write capacity for minutes; the hybrid model (fan-out on write for < 1M followers; fan-out on read via a "following" merge query for celebrities) is how every large social platform solves this; naming the problem by its common term shows industry awareness |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we built a notification system for SAP's cloud monitoring product — customers needed to know when their SAP S/4HANA instance had degraded performance or an outage. The original design called the customer's registered email directly from the monitoring service, synchronously. During an actual outage, the monitoring service was hammering SendGrid while simultaneously trying to analyse alert data — the monitoring service itself slowed down due to the notification calls.
>
> We refactored to an event-driven design: monitoring publishes to a Kafka `alert.events` topic; a dedicated notification service consumes it, fans out to email/SMS/Slack webhook per customer's preference. The monitoring service is now purely concerned with detection. Notification delivery is independently scalable. We also added quiet hours and threshold-based deduplication — if it's the same alert firing every 5 minutes, consolidate into one 'still ongoing' notification per hour, not 12 separate emails."

---

## 8. Scale Evolution

**1,000 users →** Simple async task using Spring `@Async`. No Kafka — just a separate thread pool. Email via SendGrid, SMS via Twilio, called directly from workers. User preferences stored in a simple JSON column. Simple, no-ops deployment.

**100,000 users →** Introduce Kafka for decoupling. Separate worker services per channel. Basic user preference table with per-channel opt-in flags. Redis for in-app notification counts and SSE user connection registry.

**10 million users →** Kafka with 20+ partitions per channel topic. Push notification batching via FCM Batch API. Fan-out on read for high-follower accounts. Quiet hours and frequency capping enforced at orchestrator level. Notification DB sharded by `userId`. Redis Cluster for SSE connection registry. SLA dashboards per channel with P99 delivery latency tracked. GDPR preference sync within 24 hours of opt-out.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment notifications (settlement alerts, 2FA OTP, dispute notices) are critical-path; 2FA OTP must be delivered in < 5 seconds; promotional notifications have different SLA | Priority tiering; delivery SLA per notification type |
| Swiggy / Meesho | Order lifecycle notifications (confirmed, picked up, out for delivery, delivered) — 50M+ orders/day; localisation (regional language SMS); silent push for live tracking | Fan-out scale; multi-language templating |
| Adobe / Microsoft | Microsoft Teams notification delivery; Azure Notification Hubs architecture; Adobe Campaign notification pipelines | Platform-scale design; multi-channel orchestration |
| SAP Labs | SAP cloud monitoring alerts — the exact story above; quiet hours, alert consolidation, preference system | Real incident narrative; alert deduplication logic |

---

## 10. Related Topics — What to Study Next

- **Topic 301 — URL Shortener** — deeplink URLs in notifications (track click-through in email, SMS) use the same URL shortening + analytics infrastructure; notification click tracking and URL shortener analytics are often the same system
- **Topic 304 — Chat / Messaging System** — both use WebSocket/SSE for real-time delivery; chat and notifications share the same connection infrastructure; difference is chat is bidirectional, notifications are one-way
- **Topic 99 — Kafka Fundamentals (Producer, Consumer, Topics, Partitions)** — the Kafka backbone for notification fan-out; understanding partition count, consumer group semantics, and DLQ patterns is required for notification system design
- **Topic 84 — Spring Async and @Async** — notification workers use Spring async processing; understanding thread pool tuning, exception handling in async methods, and @KafkaListener threading model

---

*Part 19 · Notification System — Fan-Out, Push vs Pull · Full Stack Interview Guide · Hruday D · 2026*
