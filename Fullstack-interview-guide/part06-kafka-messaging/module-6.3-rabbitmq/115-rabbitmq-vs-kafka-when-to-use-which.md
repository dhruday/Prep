# RabbitMQ vs Kafka — When to Use Which
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **RabbitMQ** is a traditional message broker. It routes messages from producers through exchanges → queues → consumers. Once a consumer reads and acknowledges a message, **it is deleted from the queue**. RabbitMQ is designed for work queues (task distribution) and point-to-point or pub/sub messaging where messages are consumed once and discarded.
- **Kafka** is a distributed event log. Messages are written to topics and **retained on disk** regardless of consumption. Any number of consumer groups can read the same messages independently. Kafka is designed for event streaming, real-time data pipelines, and replay-capable systems.
- The single most important difference: **Kafka retains messages; RabbitMQ discards them after consumption.** This makes Kafka the choice whenever: you need replay, multiple consumer groups, or event sourcing. RabbitMQ wins when: each message should be processed by exactly one consumer, work is ephemeral, or routing flexibility matters.
- RabbitMQ's routing flexibility is superior: exchanges can be **direct** (exact routing key match), **topic** (wildcard routing key), **fanout** (broadcast to all queues), or **headers** (match on message headers). Multiple queues can subscribe to one exchange with different binding keys — fine-grained routing without code. Kafka has no equivalent — consumers decide what to do with messages in application code.
- Throughput: Kafka sustains millions of messages/second at very low latency by batching disk writes sequentially. RabbitMQ: handles hundreds of thousands of messages/second; adds routing overhead per message. For raw event throughput, Kafka wins. For complex routing with many queues and different routing rules, RabbitMQ is simpler to reason about.
- Technology choice reality: most large-scale systems (Razorpay, Swiggy, Meesho) use Kafka for the event backbone and RabbitMQ or SQS for task queues and service-to-service notifications. They're complementary, not mutually exclusive.

---

## 1. One-Line Definition
RabbitMQ and Kafka are both messaging systems, but fundamentally different in nature: RabbitMQ is a message broker that routes and deletes messages after consumption (transient, smart routing); Kafka is an append-only distributed log that retains messages for replay by any number of consumers (persistent, dumb storage, smart consumers).

---

## 2. The Problem It Solves

### Why the comparison matters
You're designing a new payment platform microservices system. You need:
1. Payment service → triggers invoice, email notification, and ledger update simultaneously
2. Order fulfillment → work queue: 10 workers consuming tasks from a queue in parallel
3. Real-time fraud detection → stream every payment event for analysis
4. Analytics team → replay all payment events from last 30 days to recalculate metrics

These are FOUR different messaging patterns. No single tool is optimal for all four. Understanding which tool fits which pattern is what senior engineers are expected to know in system design interviews.

### When RabbitMQ is the right choice
- **Task distribution / work queues**: 10 background workers processing jobs (email sending, PDF generation, image resizing). One message = one job. Messages deleted after processed. AMQP work queue pattern. RabbitMQ is designed exactly for this.
- **Complex routing**: route messages based on type (direct/topic exchange), send to multiple queues with different filters. Example: route messages by `routingKey=payment.success.upi` to UPI settlement queue, `payment.success.card` to card settlement queue — without code changes.
- **Per-message TTL and priority queues**: RabbitMQ lets messages expire automatically (TTL per message or per queue) and supports message priority natively.
- **Low latency, small payload**: for sub-millisecond message delivery with small individual messages (< 1KB), RabbitMQ's AMQP protocol overhead is minimal.

### When Kafka is the right choice
- **Replay**: consumer crashed for 3 hours? Kafka has the events. Consumer reads from the last committed offset on restart. RabbitMQ: those 3 hours of messages are gone (unless DLQ was set up).
- **Multiple independent consumers**: 8 different services all need the same payment event. In Kafka: 8 consumer groups, all reading independently from the same topic. In RabbitMQ: requires either fanout exchange (one copy per queue) or duplication of messages.
- **Audit log / event sourcing**: events are facts that happened — you never want to delete them. Kafka with long retention (30-90 days) or compaction for entity state.
- **High-throughput firehose**: clickstream events (millions/sec), IoT sensor data, log aggregation. Kafka's sequential disk writes and batching make this economical.
- **Real-time streaming and aggregations**: Kafka Streams (Topic 113) processes events continuously. No equivalent in RabbitMQ — you'd need an external stream processor.

---

## 3. How It Works Internally

### RabbitMQ Architecture

```
PRODUCER  ──►  EXCHANGE  ──►  QUEUES  ──►  CONSUMERS
           (routing logic)  (message store)  (ack + delete)

Exchange types:
  DIRECT  : route to queue with exact routingKey match
  TOPIC   : route using wildcard pattern (*.success.*, payment.#)
  FANOUT  : broadcast to ALL bound queues (ignore routingKey)
  HEADERS : match on message header key-values

Message lifecycle:
  1. Producer publishes to exchange with routingKey
  2. Exchange routes to matching queues
  3. Message stored in queue (in-memory or durable/persisted)
  4. Consumer pulls (or Rabbit pushes) message
  5. Consumer processes, sends ACK
  6. Rabbit DELETES the message from queue
  If NACK: message can be requeued OR sent to Dead Letter Exchange
  If TTL expires before consumption: expired, moved to DLX or discarded
```

### Kafka Architecture (Contrast)

```
PRODUCER  ──►  TOPIC (PARTITIONED)  ◄──  CONSUMERS (per group)
             (append-only log)          (read independently)

Message lifecycle:
  1. Producer publishes to topic (key-based partition routing)
  2. Message appended to partition segment file on broker disk
  3. Message STAYS on disk until retention expires (7 days default)
  4. ANY consumer group can read it at any time
  5. Consumer commits offset (independently per group)
  6. Different consumer groups have different committed offsets
  7. When retention expires: deleted from disk
  No concept of "consuming" = "deleting"
```

### Side-by-Side Architecture Comparison

```
                    RabbitMQ                    Kafka
─────────────────────────────────────────────────────────────
Storage unit        Queue                       Partition (of topic)
Message lifecycle   Deleted after consumer ACK  Retained until retention.ms expires
Consumer model      Each message → 1 consumer   Message → many consumer groups
Routing             Exchange (smart broker)     Topic name only (dumb broker)
Replay              ❌ No (message deleted)     ✅ Yes (read from any offset)
Protocol            AMQP 0-9-1                  Custom binary over TCP
Ordering            Per-queue FIFO              Per-partition
Max throughput      ~100K–500K msg/sec          1M–10M msg/sec
Message size        Any (practical: < 128MB)    Default 1MB (configurable)
Consumer groups     Via bindings/queues         First-class concept
Schema management   None built-in               Schema Registry (Avro/Protobuf)
Management UI       RabbitMQ Management Plugin  Kafdrop, AKHQ, Confluent UI
Spring integration  spring-boot-starter-amqp    spring-kafka
```

---

## 4. The Code

### RabbitMQ — Spring AMQP Quick Look

```java
// ❌ Using Kafka where RabbitMQ is better (task queue example)
// Kafka for ephemeral work tasks that must be processed exactly once is overkill —
// requires idempotency handling, offset management, and partition sizing
// just to achieve what RabbitMQ work queues do out of the box

// ✅ RIGHT TOOL: RabbitMQ for task distribution work queue

// Configuration
@Bean
public Queue emailQueue() {
    return QueueBuilder.durable("email.notifications")
        .withArgument("x-message-ttl", 3600000)      // messages expire after 1h
        .withArgument("x-dead-letter-exchange", "dlx") // DLX on expiry/nack
        .build();
}

@Bean
public DirectExchange emailExchange() {
    return new DirectExchange("notification.exchange");
}

@Bean
public Binding emailBinding(Queue emailQueue, DirectExchange emailExchange) {
    return BindingBuilder.bind(emailQueue)
        .to(emailExchange)
        .with("email");  // routingKey = "email"
}

// Producer
@Service
public class NotificationPublisher {
    private final RabbitTemplate rabbitTemplate;

    public void sendEmailNotification(EmailNotificationDto dto) {
        rabbitTemplate.convertAndSend(
            "notification.exchange",  // exchange
            "email",                  // routingKey
            dto                       // message (auto-serialised to JSON)
        );
    }
}

// Consumer — work queue: each email job processed by ONE worker
@Component
public class EmailNotificationConsumer {
    @RabbitListener(queues = "email.notifications")
    public void processEmail(EmailNotificationDto dto) {
        emailService.sendEmail(dto.getTo(), dto.getSubject(), dto.getBody());
        // ACK sent automatically on successful return
        // NACK sent automatically on exception → message requeued or sent to DLX
    }
}
```

### Kafka — When Replay and Fan-Out Is Needed

```java
// ✅ Right tool: Kafka for "payment.processed" — multiple consumers, replay needed

// Payment Service publishes (acks=all, idempotent)
kafkaTemplate.send("payment.processed", payment.getId(), paymentEvent);

// FraudDetectionService consumer group — reads ALL payment events
@KafkaListener(topics = "payment.processed", groupId = "fraud-detection-group")
public void detectFraud(PaymentEvent event, Acknowledgment ack) { ... }

// LedgerService consumer group — reads same messages independently
@KafkaListener(topics = "payment.processed", groupId = "ledger-service-group")
public void updateLedger(PaymentEvent event, Acknowledgment ack) { ... }

// AnalyticsService consumer group — reads same messages, can seek backwards to replay
@KafkaListener(topics = "payment.processed", groupId = "analytics-service-group")
public void processAnalytics(PaymentEvent event, Acknowledgment ack) { ... }
// In RabbitMQ fanout: 3 separate queues, 3x the storage, no replay possible
```

### Decision Table in Code Comments

```java
// USE RABBITMQ WHEN:
// ✓ Image resizing job queue — one consumer per task, delete after done
// ✓ Email/SMS dispatch — task queue, 10 worker threads, ordered not needed
// ✓ Complex routing — direct/topic exchange routing by order type, payment method
// ✓ Message TTL — OTP expiry after 5 min, session events after 15 min
// ✓ Request-reply pattern — RPC over AMQP (reply queue + correlation ID)

// USE KAFKA WHEN:
// ✓ Payment events — ledger + fraud + analytics all need the same events
// ✓ Audit trail — events must be available for 90 days for compliance replay
// ✓ Event sourcing — aggregate state rebuilt by replaying from Kafka
// ✓ Metrics / click stream — 1M events/sec, high throughput firehose
// ✓ Real-time streaming — Kafka Streams topologies (aggregation, joining)
// ✓ CDC (Change Data Capture) — Debezium compacted topic for DB replication

// USE BOTH (most realistic at scale):
// → Kafka for the event backbone (payment, order, user events)  
// → RabbitMQ/SQS for task queues (email dispatch, async jobs)
```

---

## 5. Interview Questions & Model Answers

### Q1 — Classic Comparison
**Interviewer asks:** "When would you choose RabbitMQ over Kafka?"

**Hruday's answer:**
> I'd choose RabbitMQ over Kafka in three scenarios.
>
> First, task distribution work queues where messages should be consumed exactly once by one consumer and deleted. An email sending service, PDF generation service, or image processing service — N parallel workers consume tasks from a queue. In Kafka, achieving "one worker per message" requires partition assignment tricks. In RabbitMQ, it's the default work queue behaviour.
>
> Second, complex per-message routing. If I need to route messages by content or routing key to different queues — for example, payment events routed to UPI queue vs Card queue vs Wallet queue based on payment method — RabbitMQ's exchange-binding system handles this declaratively. In Kafka, that routing logic lives in application code inside the consumer.
>
> Third, per-message TTL and priority queues. RabbitMQ natively supports message expiry (OTPs that should auto-expire after 5 minutes) and message priority (high-priority support tickets processed before low-priority ones). Kafka doesn't support per-message TTL or priority natively.
>
> RabbitMQ is not the choice when replay is needed, when multiple independent consumer groups need the same events, or when throughput is in the millions per second.

---

### Q2 — Architecture Scenario
**Interviewer asks:** "Design the messaging layer for an e-commerce platform's order fulfilment system."

**Hruday's answer:**
> I'd use both Kafka and RabbitMQ, each for what it does best.
>
> Kafka for the event backbone: `order.placed` topic with 12 partitions. Consumer groups: InventoryService, PaymentService, NotificationService, AnalyticsService, FraudDetectionService — all reading independently. 30-day retention for replay and compliance. When a new analytics pipeline onboards, it can replay all orders from the last 30 days.
>
> RabbitMQ for task queues: after the Notification fanout consumer (Kafka) triggers a notification decision, the actual email, SMS, and push notification dispatch jobs go into RabbitMQ queues. EmailWorkers consume from the email queue — N workers for parallelism, one email per job, delete after sent. SMS workers consume from the SMS queue. The notification events are ephemeral after dispatch — no need to store them in Kafka.
>
> Why this split: Kafka gives me the replay window (event history), fan-out (N consumers), and throughput for the core order events. RabbitMQ gives me the task queue semantics (one job = one worker = delete) for the notification dispatch layer. These are two genuinely different problems that each tool solves optimally.

---

### Q3 — Failure Mode
**Interviewer asks:** "Your RabbitMQ consumer crashes for 2 hours. What happens to messages published during that time?"

**Hruday's answer:**
> It depends on whether the queue is durable and whether the messages were published as persistent.
>
> If the queue is durable (survives broker restart) and messages are published with `deliveryMode=Persistent` (written to disk): messages accumulate in the queue for 2 hours. When the consumer recovers, it processes all queued messages. Nothing is lost.
>
> If the queue is non-durable (in-memory only) and messages are published as non-persistent: if the BROKER crashes during those 2 hours, all messages are gone. For production consumers handling order events or payments: always use durable queues + persistent messages. The trade-off: disk I/O cost per message.
>
> One thing RabbitMQ cannot do that Kafka can: if the consumer processes all queued messages but then a new requirement arrives wanting to replay those 2 hours of messages — impossible. RabbitMQ deletes after consumption. This is why business-critical events with potential replay needs belong on Kafka, even if the immediate consumer is a simple worker.

---

### Q4 — Tie-Breaker
**Interviewer asks:** "Your team is building a new notification service. Should you use Kafka or RabbitMQ?"

**Hruday's answer:**
> It depends on the notification trigger source and what downstream handling is needed.
>
> For receiving trigger events (payment completed, order shipped): these come from Kafka regardless — the originating services publish to Kafka topics. The notification service consumes from Kafka.
>
> For dispatching the actual notifications: a RabbitMQ work queue is a better fit. Reasons: (1) Each notification should be sent exactly once — work queue semantics. (2) Email and SMS dispatch is idempotent but expensive — if the same notification is sent twice the user is annoyed. Work queue pattern with proper ack/nack is simpler. (3) Per-channel queuing: separate queues for email, SMS, push — each with different worker counts (SMS workers: 5, email workers: 20). (4) Retry on failure: if the email gateway returns 503, nack the message → requeue → retry. (5) TTL: notifications older than 1 hour (e.g., OTP expired) can be discarded automatically via message TTL.
>
> So: Kafka for ingesting trigger events (upstream events are already on Kafka), RabbitMQ for the internal dispatch work queue. Both, for different parts of the same service.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "RabbitMQ and Kafka are interchangeable" | "Both are message queues, I'd use whichever the team knows" | "They solve fundamentally different problems. RabbitMQ is a broker with routing logic: messages flow through exchanges, land in queues, and are deleted after consumption. Kafka is a distributed log: messages are appended and retained until retention expires. Using Kafka for ephemeral work tasks (email, PDF) means adding complexity (offset management, idempotency, manual cleanup) to do what RabbitMQ work queues handle natively. Using RabbitMQ for event sourcing or replay-needed systems means losing the ability to replay — which breaks the core architectural requirement. Choosing based on team familiarity is valid ONLY when the use case genuinely fits both. When it doesn't, the wrong choice creates permanent architectural debt." |
| "Kafka is always better because it's higher throughput" | "Kafka scales to millions of messages per second, so it's better" | "Throughput is one dimension. RabbitMQ has lower latency per individual message at moderate throughput because it doesn't batch writes the way Kafka does. For task queues at 10,000 tasks/day, Kafka's throughput advantage is irrelevant — and the operational complexity (brokers, Zookeeper/KRaft, Schema Registry) adds overhead that RabbitMQ avoids. Use the right tool for the throughput you actually need. Kafka's batching actually INCREASES per-message latency (linger.ms delay) — it's designed for throughput, not minimum per-message latency." |
| "Fan-out in RabbitMQ = same as Kafka consumer groups" | "Fanout exchange sends to multiple consumers like Kafka consumer groups" | "They're superficially similar but fundamentally different. RabbitMQ fanout exchange copies the message to EACH bound queue — if 5 queues are bound, 5 copies of the message are stored. Each queue deletes its copy after its consumer ACKs. Storage cost scales with number of queues. In Kafka: ONE copy of the message is stored in the partition. ALL consumer groups read the same physical copy independently — each just tracking its own offset. 10 consumer groups = 1 copy of data. As you add consumer groups in Kafka: zero additional storage cost. In RabbitMQ: linear storage cost per additional queue." |
| "Kafka has no DLQ" | "Kafka doesn't support dead letter queues" | "Kafka doesn't have native DLQ support built into the broker — but Spring Kafka's `DeadLetterPublishingRecoverer` implements DLQ as an application-level pattern by publishing failed messages to a `{topic}.DLT` Kafka topic. This is actually MORE flexible than RabbitMQ's DLX: Kafka DLT topics have configurable retention, can be replayed, and carry full metadata headers about the original failure. RabbitMQ's DLX routes to a specific queue with TTL expiry. Kafka's DLT is a standard topic — queryable, replayable, subscribable by any consumer group." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, the Oracle ERP integration uses synchronous REST API calls for most service-to-service communication. When I look at where messaging would improve the architecture, the distinction between RabbitMQ and Kafka becomes practical: for background document processing jobs (generate PDF, send to external system) — that's a task queue, RabbitMQ-like semantics. For financial events that the audit team might need to replay in case of a discrepancy — that's Kafka-like event log semantics. The question is always: after this message is consumed, does anyone ever need to see it again? If no: RabbitMQ's delete-after-consumption is fine. If yes — for compliance, replay, or new consumers onboarding — that needs Kafka."

---

## 8. Scale Evolution

**1,000 users / simple system →** RabbitMQ is sufficient for most messaging needs at this scale. Simple task queues, direct exchange for routing. Easy to operate, low infrastructure cost. Kafka's complexity (replication, partitions, schema registry) is not justified.

**100,000 users / multiple services →** Kafka for the event backbone (shared events that multiple services consume). RabbitMQ for task queues. This is the "best of both" sweet spot: Kafka for event log semantics, RabbitMQ for ephemeral work distribution.

**10 million users / high volume →** Kafka is the primary event system. Kafka Streams for real-time processing. RabbitMQ potentially replaced by SQS/SNS (managed, less operational burden) for task queues. Or Kafka for everything with strict consumer group management (one consumer per task queue using consumer group with one consumer per partition for work queue behaviour). The architectural trade-off between operational simplicity (one fewer technology) vs optimal tool choice is a real company-level decision.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Kafka for payment event streams (compliance, replay, fan-out). RabbitMQ or SQS for email/SMS dispatch task queues. Clear separation of event backbone vs work queue layers. | "How do you design the messaging layer for a payment platform where fraud detection, ledger, and analytics all need payment events, but email notifications should only be sent once per event?" |
| Swiggy / Meesho | Kafka for order/inventory events. Worker queues for delivery assignment, restaurant notification, rider dispatch. Choice of RabbitMQ vs SQS depends on team familiarity and cloud strategy. | "You're adding a new notification service to an existing Kafka-backed order system. Should it consume from Kafka directly or use a separate queue?" |
| Adobe / Microsoft | Large-scale event streaming (user activity, asset events) on Kafka. Task distribution for document processing, asset conversion on SQS or RabbitMQ. | "Compare Kafka and RabbitMQ for a design where document-edited events must be processed by a rendering service, analytics pipeline, and notification service." |
| SAP Labs (current) | Evaluating messaging modernisation — replacing scheduled batch jobs with event-driven patterns. RabbitMQ or Kafka for new event backbone alongside existing Oracle integration. | "How would you incrementally introduce an event-driven messaging layer into an existing synchronous batch-based SAP integration architecture?" |

---

## 10. Related Topics — What to Study Next

- **Topic 106 — Why Kafka — Problems It Solves** — deep dive into the Kafka-specific motivation (decoupling, fan-out, replay) that makes it superior to REST for certain patterns; complements this comparison topic
- **Topic 111 — Spring Kafka KafkaListener and KafkaTemplate** — Spring Boot wiring for the Kafka side of this comparison; the equivalent for RabbitMQ is `spring-boot-starter-amqp` with `@RabbitListener` and `RabbitTemplate`
- **Topic 112 — Kafka Error Handling and DLQ** — the DLQ pattern comparison between RabbitMQ (Dead Letter Exchange) and Kafka (DLT via DeadLetterPublishingRecoverer) is explored here; key differentiator between the two platforms
- **Topic 120 — Messaging Guarantees and Idempotency** — both RabbitMQ and Kafka require application-level idempotency for at-least-once delivery; the strategies (unique constraint, SETNX, UPSERT) apply to both messaging systems

---

*Part 6 · RabbitMQ vs Kafka · Full Stack Interview Guide · Hruday D · 2026*
