# Kafka Topics, Partitions, Offsets, Consumer Groups
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Topic** — a named stream of events. Like a database table, but append-only. Topics are split into partitions for parallelism. Example: `order.placed`, `payment.processed`.
- **Partition** — a single ordered, append-only log. Events within a partition have a monotonically increasing number called an **offset**. Offsets do NOT reset or skip. Order is guaranteed within a partition. Across partitions: no order guarantee.
- **Offset** — the position of an event within a partition (0, 1, 2, 3...). Consumers track which offset they've read up to. This is how Kafka knows what to send next and enables replay (rewind offset to re-read past events).
- **Consumer Group** — a named group of consumers that share the work of reading a topic. Kafka assigns each partition to exactly ONE consumer in the group. If a group has fewer consumers than partitions: some consumers handle multiple partitions. If a group has MORE consumers than partitions: extra consumers sit idle.
- Critical insight: **multiple consumer groups** each get the full stream independently. `order.placed` can be consumed by a restaurant-service group, a payment-service group, and a fraud-detection group simultaneously — each groups reads every event, independently.
- Choosing the right number of partitions: partition count = your maximum parallelism for consumers in a group. You can always increase partitions, but you cannot decrease them without deleting and recreating the topic + key assignment changes.

---

## 1. One-Line Definition
A Kafka topic is a named, durable event stream split into partitions (ordered logs), where each event's position is tracked by an offset, and consumer groups each read from all partitions independently — enabling massively parallel, replayed, multi-subscriber event processing.

---

## 2. The Problem It Solves

Imagine you're publishing order events at 100,000 orders per hour. A single ordered queue can only be consumed as fast as one consumer can process it. If your order processor takes 20ms per order, a single consumer processes 3,000 orders per minute — about 50 per second. But you're publishing 100,000 per hour (28 per second). A single consumer can keep up, but barely.

Now imagine the system grows to 1 million orders per hour (278 per second). One consumer, processing at 28/sec, falls further and further behind. Consumer lag grows. Events accumulate. Processing delays grow from minutes to hours.

Partitions solve this: split the topic into 10 partitions. Assign 10 consumers to the group. Each consumer handles 1/10th of the traffic. Total throughput: 10x. Parallelism scales with partition count.

The second problem: what if the Fraud Detection service needs to read the same order events as the Analytics service? Without consumer groups, you'd need to copy events to two separate queues. With consumer groups, both services independently read the full stream without any coupling or duplication.

---

## 3. How It Works Internally

### The Mental Model
Think of a Kafka topic as a multi-lane highway on-ramp database (that's a mouthful — let's simplify).

A **topic** is the highway. It has multiple **lanes (partitions)**. Each car entering (event) chooses a lane based on its number plate (message key). Cars in the same lane always stay in order; cars in different lanes don't need to be in order relative to each other.

A **consumer group** is a team of workers at the off-ramps. Each worker watches exactly one lane. They note where they left off (their **offset**) so if they take a break (consumer restart), they can resume from the exact same spot.

Multiple teams of workers watch the same highway independently. Team A (restaurant service) and Team B (analytics) both watch all lanes — they don't share workers.

### Core Mechanics — Partition Assignment

```
TOPIC: "order.placed" with 4 partitions

Partition 0: [event0, event1, event3, event6, ...]
Partition 1: [event2, event4, event8, ...]
Partition 2: [event5, event7, event9, ...]
Partition 3: [event10, event11, ...]

HOW AN EVENT IS ASSIGNED TO A PARTITION:
  If message key is set:
    partition = hash(key) % num_partitions
    Same key → always same partition → ordering guaranteed per key
    orderId="42" → always Partition 2 (for this topic)
    orderId="43" → always Partition 0
  
  If no key:
    Round-robin (default) or sticky partitioner (batches to same partition)

WHY KEY MATTERS:
  All events for order 42 land in Partition 2, in order.
  Consumer reading Partition 2 sees: order placed → out for delivery → delivered
  (always in this order, never interleaved with order 43's events)
  
  Without a key: events for order 42 could be in any partition.
  Partition 0: "order 42 delivered"
  Partition 2: "order 42 placed"
  ← Consumer sees delivered BEFORE placed ← wrong
```

### Consumer Group — Assignment and Rebalance

```
SCENARIO: Topic "order.placed" has 6 partitions. Two consumer groups.

CONSUMER GROUP "notification-service":
  Starts with 2 consumers → each handles 3 partitions
  Adds 4 more consumers → each consumer handles 1 partition
  Adds 7th consumer → goes idle (no partition to assign — can't share)

  Consumer 1: partitions 0, 1, 2
  Consumer 2: partitions 3, 4, 5

  Scale to 6 consumers:
  Consumer 1: partition 0
  Consumer 2: partition 1
  Consumer 3: partition 2
  Consumer 4: partition 3
  Consumer 5: partition 4
  Consumer 6: partition 5

  Scale to 7 consumers:
  Consumer 7: IDLE (no partition left — wasted)

CONSUMER GROUP "analytics-service":
  INDEPENDENT of notification-service.
  Has its OWN offsets for each partition.
  Reads ALL events completely independently.
  If analytics is 2 hours behind: fine — the other group is not affected.

REBALANCE: triggered when a consumer joins or leaves the group
  Kafka redistributes partitions among remaining consumers.
  During rebalance: all consumers in the group PAUSE processing.
  Complete rebalances take milliseconds to seconds.
  Use incremental cooperative rebalancing (Kafka 2.4+) to minimise pause.
```

### Offset — Tracking Position

```
PARTITION 0 of topic "order.placed":

offset: 0   1   2   3   4   5   6   7   8   ...
event:  e0  e1  e2  e3  e4  e5  e6  e7  e8  ...

Consumer (notification-service group):
  - Last committed offset for partition 0: 5
  - This means: events 0-5 have been processed and acknowledged
  - Next event to read: offset 6

ON RESTART:
  Consumer A crashes after reading e6 but before committing offset 6.
  Consumer restarts. Reads last committed offset from Kafka: 5.
  Re-reads e6. Processes it again.
  → at-least-once delivery (may process duplicates after restart)

ON REPLAY:
  Admin command: reset consumer group offset for partition 0 to 0.
  Consumer re-reads ALL events from the beginning.
  Use case: fix a bug in the consumer code, replay all events to rebuild state.
  This is one of Kafka's most powerful operational features.

OFFSET STORAGE:
  Kafka stores group offsets in a special internal topic: __consumer_offsets
  Each consumer group has its offsets stored there automatically.
  No external database needed to track position.
```

### ASCII Diagram — Full Architecture

```
PRODUCERS                    KAFKA CLUSTER                 CONSUMERS

Order Service ──►           TOPIC: order.placed
                            ┌─────────────────────────────┐
                  key:42 →  │ Partition 0: [o1,o4,o7,...] │──► Group A (notification)
                  key:55 →  │ Partition 1: [o2,o5,o8,...] │    Consumer A1: P0
                  key:99 →  │ Partition 2: [o3,o6,o9,...] │    Consumer A2: P1
                  key:42 →  │ Partition 0: [o10,...]      │    Consumer A3: P2
                            └─────────────────────────────┘
                                        │
                                        ├──► Group B (analytics)
                                        │    Consumer B1: P0, P1, P2 (1 consumer)
                                        │
                                        └──► Group C (fraud-detection)
                                             Consumer C1: P0
                                             Consumer C2: P1
                                             Consumer C3: P2

Note: Group B has fewer consumers than partitions — one consumer reads all 3.
Note: Groups A, B, C are completely independent. Each reads all events.
Note: Both order 42 events (o1, o10) land in Partition 0 — in order.
```

---

## 4. The Code

### Wrong Way — No Message Key (Ordering Broken)

```java
// Wrong: sending without a key — events for the same orderId
// can land in different partitions and be consumed out of order
kafkaTemplate.send("order.status", orderStatusEvent);
// Consumer may see: "delivered" before "placed" for the same order.
// The partitioner will round-robin events across all partitions.
```
> **Why this fails in production:** Without a key, Kafka distributes events across partitions arbitrarily. Order status updates for orderId=42 land in different partitions, consumed by different consumer instances, potentially in wrong order. A driver dashboard shows statuses out of order; downstream services build incorrect state.

### Right Way — Keyed Messages for Ordering

```java
@Service
public class OrderEventPublisher {

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;
    private static final String ORDER_TOPIC = "order.placed";

    // Always send with orderId as key.
    // All events for the same order → same partition → guaranteed order.
    public void publishOrderPlaced(Order order) {
        OrderEvent event = OrderEvent.fromOrder(order);
        // Key = orderId (String). Value = the event object.
        // KafkaTemplate uses StringSerializer for key (configured in app.yml).
        kafkaTemplate.send(ORDER_TOPIC, order.getId().toString(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish order event for orderId={}", order.getId(), ex);
                    // In production: use Outbox Pattern instead of handling here.
                    // See Topic 79 — Outbox Pattern for reliable event publishing.
                } else {
                    log.info("Published order event. Topic={}, Partition={}, Offset={}",
                        result.getRecordMetadata().topic(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
    }
}
```

### Right Way — Consumer Group with Manual Offset Commit

```java
@Component
public class OrderNotificationConsumer {

    private final NotificationService notificationService;

    @KafkaListener(
        topics = "order.placed",
        groupId = "notification-service",
        // concurrency = number of consumer threads = should match partition count
        // but never exceed partition count (extra consumers sit idle)
        concurrency = "3"
    )
    public void consume(
        @Payload OrderEvent event,
        @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
        @Header(KafkaHeaders.OFFSET) long offset,
        Acknowledgment acknowledgment  // manual commit handle
    ) {
        try {
            notificationService.sendOrderConfirmation(event);

            // Commit offset ONLY after successful processing.
            // If this service restarts before commit, Kafka re-delivers
            // the event → at-least-once, so notificationService must be idempotent.
            acknowledgment.acknowledge();

        } catch (RecoverableException e) {
            // Transient error (network hiccup, downstream unavailable)
            // Don't acknowledge — Kafka will re-deliver after poll timeout
            log.warn("Transient error processing event at partition={}, offset={}", partition, offset, e);
            // For retry with backoff: use Spring Kafka's retry topics or @Retryable
        } catch (PermanentException e) {
            // Poison message — will never succeed, don't block the partition.
            // Send to Dead Letter Topic (DLT) and acknowledge.
            log.error("Permanent failure at partition={}, offset={}. Sending to DLT.", partition, offset, e);
            deadLetterPublisher.send("order.placed.DLT", event, e);
            acknowledgment.acknowledge(); // must acknowledge to unblock partition
        }
    }
}
```

### Configuration — Consumer Group Behaviour

```yaml
spring:
  kafka:
    consumer:
      group-id: notification-service
      # earliest: on first startup, read from beginning of all retained events
      # latest: on first startup, only read new events published after now
      auto-offset-reset: earliest

      # CRITICAL: disable auto-commit for production consumers
      # Auto-commit commits the offset on a schedule regardless of
      # whether your processing succeeded. On crash between auto-commit
      # and finishing processing: your message is silently lost.
      enable-auto-commit: false

    listener:
      # MANUAL_IMMEDIATE: commit offset when Acknowledgment.acknowledge() is called
      # MANUAL: batch commits at the end of each poll loop
      ack-mode: MANUAL_IMMEDIATE

      # concurrency: number of consumer threads (should not exceed partition count)
      concurrency: 3
```

> **Key decisions here:**
> - `enable-auto-commit: false` is the most critical setting — prevents silent message loss
> - concurrency should match partition count at maximum — extra threads sit idle consuming memory
> - `auto-offset-reset: earliest` for new consumer groups — reads all retained history, which lets you bootstrap state from past events
> - Dead-letter for permanent failures — unacknowledging a poison message blocks the entire partition permanently

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a Kafka partition and why does the number of partitions matter?"

**Hruday's answer:**
> A partition is a single ordered, append-only log within a topic. Each event in a partition has a unique, monotonically increasing offset. Events within a partition are always read in the order they were written. Events across different partitions have no guaranteed order relative to each other.
>
> Partition count matters for two reasons. First, it defines the maximum parallelism for consumers in a group. If a topic has 6 partitions and I have a consumer group, I can have at most 6 active consumers — each consuming its assigned partition. A 7th consumer sits idle. So if I need to process events faster, I need more partitions. This is why you should plan partition count based on expected peak consumer throughput.
>
> Second, partition count is where you set message key routing. All events with the same key go to the same partition. This is how you guarantee ordering per entity: if orderId is the key, all events for order 42 always land in the same partition, in the order they were published. If I chose 10 partitions and orderId 42 hashes to partition 3, every status update for order 42 goes to partition 3.
>
> You can increase partition count later, but the key→partition mapping changes when you do — events for the same order ID may go to a different partition than historical events. This can break ordering guarantees for active orders at the time of partition increase. It's better to over-provision partitions upfront.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain how consumer group rebalancing works and what problems it can cause."

**Hruday's answer:**
> Consumer group rebalancing is the process where Kafka redistributes partition ownership among consumers when the group membership changes. This happens when a consumer joins, leaves, or fails to send a heartbeat within the session timeout.
>
> The classic (eager) rebalance: when a rebalance triggers, all consumers in the group stop consuming simultaneously — this is called stop-the-world. Kafka's group coordinator revokes all partition assignments, then re-assigns all partitions from scratch. During this window — which can be seconds — no events are processed by any consumer in the group.
>
> This causes processing lag spikes. If you have 10 consumers and one new consumer joins, all 10 stop, the group rebalances, and all 10 restart. For a payment notification consumer, this means a period of no notifications being sent.
>
> For high-throughput topics, frequent rebalances (caused by slow consumers timing out, rolling deployments, or autoscaling) can cause significant lag buildup.
>
> The solution in Kafka 2.4+ is Incremental Cooperative Rebalancing (set via `partition.assignment.strategy = CooperativeStickyAssignor`). In this mode, only the partitions that need to move are revoked — not all partitions. Most consumers continue processing their existing partitions while a subset of partitions are reassigned. This dramatically reduces the stop-the-world pause.
>
> In Spring Kafka: use `@KafkaListener` with the `ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG` set to `CooperativeStickyAssignor` to enable incremental rebalancing.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What happens when there are more partitions than consumers? Fewer? And why would you not just use 1000 partitions to maximise parallelism?"

**Hruday's answer:**
> More partitions than consumers: each consumer handles multiple partitions. Events across those partitions are processed interleaved — the consumer reads from partition 0, then partition 1, etc. within each poll. This is fine — the consumer scales by processing more partitions. But per-partition ordering is still maintained.
>
> More consumers than partitions: extra consumers sit idle. They incur memory and CPU overhead for heartbeat keep-alives but process zero events. At peak load this wastes capacity. The fix is to either reduce consumer count or increase partition count.
>
> Why not just use 1000 partitions? Each partition has overhead. Every partition is a file on every broker's disk — 1,000 partitions on 3 brokers = 3,000 open file handles. Each partition has a leader broker, with heartbeat messages and metadata tracked by the controller. Partition increase also increases commit log and metadata overhead in __consumer_offsets. End-to-end latency for a topic with thousands of partitions increases measurably. Kafka's recommended guideline: a few thousand partitions per broker maximum.
>
> The practical advice: estimate your required consumer throughput (events/sec / per-consumer processing rate), plan partitions with 50% headroom for growth, and don't over-provision. A 10-partition topic with 10 consumers each running 3 threads is far better than a 1000-partition topic with near-zero utilisation per partition.

---

### Q4 — Scenario
**Interviewer asks:** "You have a Kafka consumer group processing payment events that is consistently 30 minutes behind. How do you diagnose and resolve the consumer lag?"

**Hruday's answer:**
> First, I measure the lag precisely. Consumer lag = latest partition offset minus the consumer's committed offset. I'd check this via the Kafka admin CLI: `kafka-consumer-groups.sh --describe --group payment-service`. This shows lag per partition. If all partitions have equal lag, the problem is overall throughput. If one partition has disproportionate lag, there's a hot partition — one message key is generating more events than others.
>
> For overall lag: calculate required throughput. If 1,000 events/second are published and each consumer processes 100 events/second, I need 10 consumers. If I have 3 consumers and 6 partitions, I'm at 30% of maximum possible throughput. Adding 3 more consumers (up to 6, matching partition count) should triple throughput and eliminate lag.
>
> For hot partition lag: if one partition (say partition 2) has 5x the lag of others, all events for a specific hash bucket are concentrating there. Options: increase partition count (redistributes hash buckets), use a more uniform key (orderId spread is usually fine, but if one merchant generated 80% of events and their hash goes to partition 2, that's a hot partition problem). In extreme cases, process partition 2 with dedicated higher-concurrency logic.
>
> Also diagnose processing time: if the consumer is slow because each event triggers a synchronous REST call taking 100ms, the fix is to make the consumer async — publish to a local in-memory queue and process in parallel threads, or use batch processing. Adding consumers won't help if the bottleneck is per-event processing time and you're already at max partition count.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Kafka guarantees order across topics" | "Kafka messages are always in order" | "Order is guaranteed within a partition, not across partitions. If your topic has 3 partitions and events for the same entity land in different partitions (because you didn't set a key), consumers read them out of order. The fix: always use a stable entity identifier as the message key. All events for orderId=42 will always hash to the same partition and always be read in publish order." |
| "More consumers always means faster processing" | "I'll add 20 consumers to catch up on lag" | "Consumer count can never exceed partition count usefully. If you have 6 partitions and add a 7th consumer, it sits idle. If you really need more than 6 consumers to hit required throughput, you must FIRST increase partition count. Increase partitions, THEN scale consumers. Also: increasing partition count on a live topic changes the key→partition hash mapping, which can cause brief out-of-order processing for in-flight events." |
| "Auto-commit is fine for correctness" | "I'll use auto-commit — Kafka handles offset management for me" | "Auto-commit commits the offset automatically on a schedule (default: every 5 seconds), regardless of whether your consumer successfully processed the event. If your consumer crashes after auto-commit but before finishing the business logic for an event, that event's offset is committed and it will never be re-delivered. The event is silently lost. Always use manual commit (enable-auto-commit: false, ack-mode: MANUAL_IMMEDIATE) and commit only after successful processing." |
| "Consumer groups share partitions between groups" | "Two consumer groups split the partitions between them" | "Consumer groups are completely independent. Each group gets ALL partitions. Group A has its own assignment of all partitions. Group B independently has its own assignment of all partitions. They never share or conflict. Group A is at offset 5 for partition 0. Group B is at offset 100 for partition 0. They don't know about each other. This independence is what enables fan-out — one topic, many consumer groups, each reading every event." |

---

## 7. Hruday's Real Experience Hook

> "Kafka internals are a key gap I'm bridging. The concept clicked for me when I thought about it as a distributed, durable, replayed version of Spring's ApplicationEventPublisher — which I've used at SAP Labs for in-process event dispatch. ApplicationEventPublisher is synchronous and in-process: no persistence, no replay, no external consumers. Kafka takes that same publish-subscribe model and makes it persistent, distributed, and replayable with independent consumer group offsets. The offset tracking mechanism specifically — that each consumer group has its own read position and can replay from any point — is the feature I immediately understood as solving the 'Analytics Service was down for 2 hours' problem we implicitly had with the polling approach at SAP Labs."

---

## 8. Scale Evolution

**1,000 users →** 1-3 partitions per topic. Single consumer per group. Kafka might even be replaced with Spring Events at this scale. But if you're building for growth, start with at least 3 partitions.

**100,000 users →** 6-12 partitions per high-traffic topic. Multiple consumers per group (match partition count). Monitor consumer lag with Grafana dashboards. Session timeout tuning to prevent unnecessary rebalances.

**10 million users →** High-traffic topics: 30-100+ partitions. Consumer groups scaled with autoscaling (K8s HPA based on consumer lag metric). Incremental cooperative rebalancing mandatory. Schema Registry + Avro for schema evolution without consumer breakage. Separate Kafka clusters per domain (Payment Kafka, Order Kafka) to prevent noisy neighbour problems.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment event streaming at millions of events per day. Partition key design (paymentId? merchantId? customerId?) is an interview debate point. Consumer lag = delayed risk alerts. | "How do you design partition keys for a payment topic to satisfy both throughput and ordering requirements simultaneously?" |
| Swiggy / Meesho | Order lifecycle events → how many partitions? What key? Peak dinner hour lag handling. Multiple consumer groups (restaurant, driver, customer, analytics) all reading the same topic. | "You have 500K simultaneous dinner orders. How many partitions does your order.placed topic need and how do you verify it's enough?" |
| Adobe / Microsoft | User action event streams for analytics. Billions of events/day. How do you partition a user-action topic to enable per-user ordering and parallel processing simultaneously? | "Design the partition strategy for a user-activity topic that needs per-user event ordering but also maximum parallelism for 50M daily active users." |
| SAP Labs (current) | SAP adopting event-driven architecture for document workflows. What partition key for financial document events? How many consumer groups for a single event type? | "Our financial document processing is moving to Kafka. How would you design partition keys and consumer groups for the document.posted topic?" |

---

## 10. Related Topics — What to Study Next

- **Topic 106 — Why Kafka** — the motivation layer for this deep-dive; if unclear on why you need partitions and consumer groups, revisit the fan-out and replay arguments
- **Topic 108 — Kafka Producer** — now that you understand partitions, the producer section covers how events are assigned to partitions (partitioner, acks, batching)
- **Topic 109 — Kafka Consumer** — extends the offset management concepts introduced here, covering at-least-once and exactly-once delivery guarantees
- **Topic 112 — Error Handling and DLQ** — the dead-letter topic pattern mentioned in the consumer code above, explained in full

---

*Part 6 · Kafka Topics, Partitions, Offsets, Consumer Groups · Full Stack Interview Guide · Hruday D · 2026*
