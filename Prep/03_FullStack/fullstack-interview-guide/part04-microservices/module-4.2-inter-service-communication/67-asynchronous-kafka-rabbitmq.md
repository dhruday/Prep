# Asynchronous Communication — Event-Driven with Kafka and RabbitMQ
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Async communication = Service A publishes an event and moves on — it does NOT wait for Service B to process it — decouples services in time AND in availability (Service B can be down; events accumulate; processed when back up)
- **Kafka**: distributed log — events are stored durably on disk, can be replayed, retained for days/months — designed for high throughput (millions of events/second), ordered partitions, multiple independent consumer groups — the choice for event streaming at scale
- **RabbitMQ**: message broker — messages are routed through exchanges to queues, deleted after consumption — designed for task distribution, routing, and request-reply patterns — easier setup for moderate throughput
- Key Kafka concept: **consumer group** = multiple instances of the same service reading from the same topic in parallel — each partition is assigned to one consumer in the group — this is how Kafka achieves parallel processing without duplicate consumption
- Key difference from sync: OrderService publishes `OrderPlaced` to Kafka and returns 200 to the user immediately — InventoryService, NotificationService, and LedgerService all process the event independently, in their own time — none of them block the order placement
- Gap to bridge: understanding Kafka partitions, consumer groups, offset management, and at-least-once vs exactly-once delivery is what separates candidates who "know Kafka" from those who understand it

---

## 1. One-Line Definition
Asynchronous event-driven communication is when one microservice publishes an event to a message broker (Kafka or RabbitMQ) and immediately continues, while other services consume and process that event independently — eliminating the runtime coupling created by synchronous calls.

---

## 2. The Problem It Solves

When OrderService synchronously calls InventoryService, NotificationService, and PaymentService in sequence during order placement:

1. Total latency = sum of all service latencies (50ms + 30ms + 80ms = 160ms minimum)
2. If NotificationService is slow (email provider outage), order placement is slow  
3. If NotificationService is down, order placement fails — even though sending a notification is not required for the order to be placed
4. OrderService must know about all downstream consumers — tight coupling by knowledge

The fundamental issue: not all operations need to happen synchronously. The user needs to know immediately whether the ORDER WAS PLACED. They do not need to wait for the notification email to be sent, the inventory to be decremented in a reconciliation job, or the ledger to be updated. These are important but can happen within seconds — not within milliseconds of the order placement.

Async communication fixes this by letting OrderService say "an order was placed" (via Kafka) and return a response to the user immediately. InventoryService picks up the event when it is ready. NotificationService picks it up and sends the email. LedgerService updates the accounting records. All within 1-5 seconds, fully independently, without blocking the user's order confirmation.

---

## 3. How It Works Internally

### Kafka Architecture

Kafka's core abstraction is a **distributed commit log** — an ordered, immutable sequence of events stored on disk.

```
Kafka Cluster Architecture:

Topic: order-events
  Partition 0: [OrderPlaced(1), OrderConfirmed(3), OrderCancelled(7), ...]
  Partition 1: [OrderPlaced(2), OrderShipped(4), OrderDelivered(6), ...]
  Partition 2: [OrderPlaced(5), OrderConfirmed(8), ...]
  (Each partition is an ordered log on a Kafka broker node)

Producer (OrderService):
  → Writes OrderPlaced event to a partition (by key — e.g., orderId hash → partition)
  → Gets an offset (sequential position in the partition) on success
  → Fire-and-forget after ack from broker

Consumer Group: inventory-consumer-group
  Instance 1 → reads Partition 0 exclusively
  Instance 2 → reads Partition 1 exclusively
  Instance 3 → reads Partition 2 exclusively
  (No two consumers in the same group read the same partition — no duplicates)

Consumer Group: notification-consumer-group (SEPARATE GROUP)
  → ALSO reads ALL three partitions, independently
  → Has its own offset tracking — completely independent of inventory group
  → InventoryService processing at offset 50 does NOT affect NotificationService at offset 23

KEY INSIGHT: Every consumer group gets a complete copy of all events.
Adding a new consumer (e.g., Analytics) does not affect existing consumers.
Events are retained and replayable. If InventoryService was down for an hour,
it resumes from where it left off when it comes back up.
```

### Kafka vs RabbitMQ Decision

```
Feature                    Kafka                        RabbitMQ
──────────────────────────────────────────────────────────────────────
Model                      Distributed log              Message broker
Message persistence        Durable on disk (retained)   Deleted after consumption
Replay capability          Yes (from any offset)        No (consumed once)
Throughput                 Millions/sec                 ~50,000-100,000/sec
Multiple consumers         Yes (consumer groups)        Yes (competing consumers)
Message ordering           Per partition                Per queue (if needed)
Routing                    Topic/partition              Exchange → Queue (4 types)
Complexity                 Higher (cluster, ZK/KRaft)   Lower (standalone)
Best use case              Event streaming, event replay, audit trails  Task queues, routing, RPC-style messaging
Learning curve             Higher                       Lower
Storage                    Kafka retains all messages   Queue empties after consume

Choose Kafka when:
  → Event streaming (all consumers get all events)
  → Replay/audit (process historical events again)
  → High throughput (>100K events/sec)
  → Multiple independent consumers of the same events
  → Decoupled microservices architecture at scale

Choose RabbitMQ when:
  → Task queue (one consumer processes each job exactly once)
  → Complex routing (topic exchanges, header matching)
  → Smaller scale, simpler setup
  → Request-reply messaging patterns (correlationId, reply-to queue)
  → Team needs simpler operational overhead
```

### Event Design Principles

**Events are facts — past tense.** They represent something that DID happen, not something that should happen.

```
Bad event (command disguised as event):
  topic: "send-notifications"
  payload: {"to": "user@email.com", "message": "Your order was placed"}
  — This is a command. OrderService is TELLING NotificationService what to do.
  — Tight coupling: OrderService knows about NotificationService implementation.

Good event (fact):
  topic: "order-events"
  payload: {"eventType": "ORDER_PLACED", "orderId": "ORD-789",
            "userId": 42, "total": {"amount": 999, "currency": "INR"},
            "timestamp": "2025-01-15T10:30:00Z"}
  — This is a fact. "An order was placed."
  — NotificationService can CHOOSE to react to this. OrderService has no knowledge of it.
  — InventoryService, Analytics, and LedgerService ALSO react to this same event independently.
```

---

## 4. The Code

### Kafka Producer — Publishing Domain Events (Spring Kafka)
```java
// application.yml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all       # Wait for all replicas to acknowledge — durability guarantee
      retries: 3
      properties:
        enable.idempotence: true   # Exactly-once producer semantics — no duplicate messages
        max.in.flight.requests.per.connection: 5
```

```java
// Domain event structure — self-contained, includes context for consumers
public record OrderPlacedEvent(
    String eventId,        // UUID — for idempotency on consumer side
    String eventType,      // "ORDER_PLACED"
    String orderId,
    Long userId,
    Money totalAmount,
    List<OrderItemSnapshot> items,  // Include what consumers need — avoid cross-service calls
    String shippingAddress,         // Snapshot — current address at time of event
    Instant occurredAt
) {}
```

```java
@Service
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.order-events}")
    private String orderEventsTopic;

    public void publishOrderPlaced(Order order) {
        OrderPlacedEvent event = new OrderPlacedEvent(
            UUID.randomUUID().toString(),    // Unique event ID for deduplication
            "ORDER_PLACED",
            order.getId().toString(),
            order.getUserId(),
            order.getTotal(),
            order.getItemSnapshots(),
            order.getShippingAddress().formatted(),
            Instant.now()
        );

        // Use orderId as the partition key — events for the same order
        // always go to the same partition → guaranteed ordering per order
        ProducerRecord<String, Object> record =
            new ProducerRecord<>(orderEventsTopic, order.getId().toString(), event);

        // Send async — do NOT block the order placement API response waiting for Kafka ack
        // The onSuccess/onFailure callbacks handle results asynchronously
        kafkaTemplate.send(record)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    // Log and alert — consider Outbox pattern (Topic 79) for guaranteed delivery
                    log.error("Failed to publish OrderPlaced event for orderId={}: {}",
                              order.getId(), ex.getMessage());
                } else {
                    log.info("OrderPlaced event published: orderId={} partition={} offset={}",
                             order.getId(),
                             result.getRecordMetadata().partition(),
                             result.getRecordMetadata().offset());
                }
            });
    }
}
```

### Kafka Consumer — Processing Events (Spring Kafka)
```java
// application.yml — Consumer config
spring:
  kafka:
    consumer:
      group-id: ${spring.application.name}  # e.g., "inventory-service"
      auto-offset-reset: earliest  # On first start, read from beginning
      enable-auto-commit: false    # NEVER use auto-commit — handle manually for reliability
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.example.orders.events"
    listener:
      ack-mode: MANUAL_IMMEDIATE  # Commit offset only after successful processing
```

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventConsumer {

    private final InventoryReservationService inventoryReservationService;
    private final ProcessedEventRepository processedEventRepository;  // For idempotency

    @KafkaListener(
        topics = "${kafka.topics.order-events}",
        groupId = "${spring.application.name}",
        containerFactory = "orderEventListenerContainerFactory"
    )
    public void onOrderEvent(
            @Payload OrderPlacedEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment ack) {

        log.info("Received OrderPlaced event: eventId={} orderId={} partition={} offset={}",
                 event.eventId(), event.orderId(), partition, offset);

        // IDEMPOTENCY CHECK: at-least-once delivery means we may receive duplicates
        // Check if we already processed this event ID before processing again
        if (processedEventRepository.hasProcessed(event.eventId())) {
            log.info("Duplicate event ignored: eventId={}", event.eventId());
            ack.acknowledge();  // Commit offset — yes, we've seen and handled this
            return;
        }

        try {
            // Process the event — reserve inventory for each item in the order
            for (OrderItemSnapshot item : event.items()) {
                inventoryReservationService.reserve(item.productId(), item.quantity(), event.orderId());
            }

            // Mark event as processed BEFORE committing offset
            // This creates a database record in InventoryService's own DB
            processedEventRepository.markProcessed(event.eventId());

            // Commit the Kafka offset — only after successful processing
            ack.acknowledge();

        } catch (InsufficientStockException e) {
            // Business logic failure — we CAN process but stock is insufficient
            // Publish a compensating event — don't retry, it won't fix the stock shortage
            log.warn("Insufficient stock for orderId={}: {}", event.orderId(), e.getMessage());
            publishInventoryReservationFailed(event.orderId(), e.getMessage());
            ack.acknowledge();  // Commit offset — we handled this case, don't redeliver

        } catch (Exception e) {
            // Transient failure — do NOT commit offset — Kafka will redeliver
            log.error("Transient failure processing OrderPlaced for orderId={}: {}",
                      event.orderId(), e.getMessage());
            // Do not call ack.acknowledge() → Kafka redelivers after consumer restart/timeout
        }
    }
}
```

### Dead Letter Topic Setup
```java
// Configure Dead Letter Topic (DLT) — messages that fail after max retries go here
@Bean
public DefaultErrorHandler kafkaErrorHandler(KafkaOperations<?, ?> kafkaTemplate) {
    // Send unrecoverable failures to the DLT for manual review
    DeadLetterPublishingRecoverer recoverer =
        new DeadLetterPublishingRecoverer(kafkaTemplate,
            (record, ex) -> new TopicPartition(record.topic() + ".DLT", record.partition()));

    // Retry 3 times with backoff before sending to DLT
    ExponentialBackOffWithMaxRetries backOff = new ExponentialBackOffWithMaxRetries(3);
    backOff.setInitialInterval(500L);
    backOff.setMultiplier(2.0);
    backOff.setMaxInterval(5000L);

    return new DefaultErrorHandler(recoverer, backOff);
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between Kafka and RabbitMQ and when would you use each?"

**Hruday's answer:**
> The fundamental model difference: Kafka is a distributed log where messages are retained and each consumer group reads the log independently at its own pace. RabbitMQ is a message broker where messages are routed through exchanges to queues and deleted after consumption.
>
> This distinction drives the use-case split. I would choose Kafka when: I need multiple independent consumers to process the same events — an order event should trigger inventory update, notification, ledger entry, and analytics independently, all from the same event; when I need event replay — if InventoryService had a bug and need to reprocess the last 2 days of order events, Kafka retains them and I can replay; when throughput is high — Kafka handles millions of events per second per partition.
>
> I would choose RabbitMQ when: task distribution is the goal — one email job is processed by exactly one worker from a pool; complex message routing is needed — RabbitMQ's exchange types (direct, topic, fanout, headers) give powerful routing without custom code; the system is smaller scale and operational simplicity matters — RabbitMQ is easier to operate than a Kafka cluster.
>
> In a fintech system like Razorpay, I would use Kafka for the event streaming backbone — payment events, transaction events, fraud signals — because multiple systems need the same events and audit replay is mandatory. I might use RabbitMQ for an email/SMS task queue where each notification is processed once and doesn't need to be replayed.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain Kafka consumer groups and partition assignment."

**Hruday's answer:**
> A Kafka consumer group is a way to scale message consumption across multiple instances of the same service. Within a consumer group, each partition is assigned to exactly one consumer instance at a time. This guarantees that each message (or rather, each offset in a partition) is processed exactly once within that consumer group — no two instances of InventoryService process the same order event.
>
> The partition-consumer mapping: if an `order-events` topic has 6 partitions and InventoryService has 3 instances, each instance gets 2 partitions. If InventoryService scales up to 6 instances, each instance gets 1 partition. If it scales up to 7 instances — 6 consume, 1 sits idle. You cannot have more active consumers in a group than partitions.
>
> Multiple consumer groups are fully independent. NotificationService's consumer group and InventoryService's consumer group both subscribe to `order-events`. Each group tracks its own offsets. InventoryService at offset 100 does not affect NotificationService at offset 50. They are effectively separate subscriptions to the same log.
>
> This is the crucial insight: in Kafka, adding a new consumer service that needs order events means adding a new consumer group. The new service gets all historical events from offset 0 (or from a specific timestamp). Existing consumers are completely unaffected. This would be impossible in RabbitMQ's point-to-point queue model.

---

### Q3 — Handling Failures
**Interviewer asks:** "How do you ensure at-least-once delivery and handle duplicate events in Kafka?"

**Hruday's answer:**
> Kafka's delivery semantic is at-least-once by default when using manual commit. At-at least-once means: if a consumer processes an event but crashes or restarts before committing the offset, Kafka will redeliver the event. The event may be processed multiple times — but it will never be lost.
>
> The critical rule: never commit the offset before you have successfully processed the event. If you auto-commit (the Kafka default), you might commit the offset after receiving the message but before processing it — that is at-most-once delivery, meaning events can be lost.
>
> To handle duplicates caused by at-least-once delivery, implement idempotent consumers. The event carries a unique eventId (a UUID generated by the publisher). The consumer checks a `processed_events` table in its own database before processing: "have I seen this eventId before?" If yes, skip it. If no, process it and record the eventId. This idempotency check, combined with the actual processing, should be in one database transaction to avoid a race condition where two instances check simultaneously.
>
> For Kafka with producer `enable.idempotence=true` and `acks=all`, the producer side is also idempotent — retries on the producer side will not create duplicate messages in the Kafka topic. These two levels of idempotency together give effectively-once semantics: producer does not create duplicates, consumer checks before re-processing duplicates that Kafka might redeliver.

---

### Q4 — Scenario
**Interviewer asks:** "When a user places an order, which downstream operations should be synchronous and which should be asynchronous?"

**Hruday's answer:**
> The dividing line is "does the user's immediate API response depend on the outcome of this operation, AND can the outcome of this operation change whether the order is placed?"
>
> Synchronous — must happen BEFORE returning 200 to the user:
> - Stock availability check: if stock is unavailable, we must reject the order. Must be synchronous.
> - Payment processing: if payment fails, the order should not be placed. Must be synchronous.
> - Fraud risk scoring: if risk score is too high, block the order. Must be synchronous (or very fast async with a short hold time).
>
> Asynchronous — can happen AFTER returning 200, independently:
> - Inventory reservation update (decrement stock count): the ORDER is placed; the stock has been claimed. The database decrement can happen via event in the next seconds.
> - Order confirmation email/SMS: the user has their order ID on screen. The email follows within 30 seconds.
> - Analytics and reporting: update dashboards, recalculate recommendation models. Happens whenever.
> - Loyalty points calculation: the user doesn't need their points balance updated before the order confirmation screen loads.
> - Warehouse notification (fulfill this order): important, but does not need to block the API response.
>
> The resulting architecture: OrderService calls InventoryService (gRPC, synchronous) to RESERVE stock, calls PaymentService (gRPC, synchronous) to CHARGE. On success: places the order, saves it, publishes `OrderPlaced` event to Kafka, returns 201 to the user. InventoryService, NotificationService, WarehouseService, Analytics — all consume the Kafka event asynchronously.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Auto-commit is fine" | "Enable auto-commit to simplify the consumer" | "Auto-commit will commit the offset after the message is received but before your code processes it successfully. If your code throws an exception AFTER the auto-commit, the message is permanently lost — at-most-once delivery. For production, always use `enable-auto-commit: false` and manual ack after successful processing. This is the most critical Kafka consumer configuration." |
| "One partition = enough" | "We don't need multiple partitions for our topic" | "One partition means one active consumer from your consumer group at a time. There is no parallelism. If you have 3 InventoryService instances and one partition, 2 instances are idle. More importantly, one slow consumer creates backlog with no way to parallelize. Fan out your topics with enough partitions for your expected peak consumer parallelism — typically 12-24 for a production topic." |
| "Events contain only IDs" | "Events should be minimal — just IDs, consumers can look up the rest" | "Thin events (ID-only) force every consumer to make a synchronous call back to the origin service to get context. If OrderPlacedEvent contains only orderId, NotificationService must call OrderService to get the user email, which re-creates synchronous coupling and a runtime dependency. Include the data consumers need in the event payload — this is intentional denormalisation called an 'enriched event'." |
| "Delete messages after processing" | "Messages should be cleaned up to save space" | "Kafka's most powerful feature is message retention and replay. Compulsively deleting messages destroys the audit trail and prevents replaying events for new consumers, bug fixes, or disaster recovery. Set retention based on business need — 7 days for operational events, 90 days for financial events, indefinitely for critical audit events (using log compaction). Storage is cheap; the ability to replay is priceless." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, working on the UI layer for enterprise workflows, I first encountered the concept of event-driven state as RxJS observables — UI state that reacts to events without polling. The Angular/RxJS pattern of `subject.next(newValue)` and subscribing components re-rendering independently is conceptually identical to Kafka's producer-consumer model. An EventEmitter is a single-tenant Kafka topic with no persistence. That realisation — that the reactive UI patterns I knew deeply at the frontend directly parallel event streaming patterns at the backend — made Kafka's mental model click for me. It is the same paradigm: emit a fact, let all subscribers react in their own time."

---

## 8. Scale Evolution

**1K events/day →** RabbitMQ is perfectly adequate. Simple task queues, routing, no replay needed. Kafka cluster overhead is not worth it.

**1M events/day →** Kafka starts making sense. Multiple consumer groups, need for replay (replaying past events to fix a consumer bug), high availability needs. Start with a managed Kafka (Confluent Cloud, AWS MSK) to avoid operational overhead.

**100M events/day →** Kafka is essential. Partitioned topics per business domain (order-events, payment-events, inventory-events). Multiple consumer groups per topic. Kafka Streams for real-time processing. Schema Registry for Avro/Protobuf schema evolution management.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Every payment triggers: settlement calculation, ledger entry, merchant notification, fraud model update, analytics pipeline update — all from one event, all independent, all needing the Kafka async model. | "How would you make the payment confirmation notification always fire within 1 second while keeping the payment API fast?" |
| Swiggy / Meesho | Order event drives: restaurant notification, driver assignment, inventory decrement, user notification, analytics — all Kafka consumers. During peak events (IPL ordering surge), the async model absorbs traffic spikes without cascading to every downstream system. | "During our peak sale, order confirmation was taking 8 seconds. We suspect it is waiting for notifications. How would you fix this?" |
| Adobe / Microsoft | Document events (save, share, export) drive collaboration state, version history, notification, analytics — event-driven architecture is fundamental. | "When a user saves a document, what happens asynchronously vs synchronously?" |
| SAP Labs (current) | SAP's Integration Suite and Event Mesh are essentially Kafka-compatible brokers for SAP-to-third-party and SAP-to-SAP event communication. Understanding Kafka deeply helps with SAP event architecture. | SAP BTP Event Mesh architecture conversations. |

---

## 10. Related Topics — What to Study Next

- **Topic 66 — Synchronous REST vs gRPC** — the complement: when you DO need a response before continuing, this topic covers the synchronous options and when each is appropriate
- **Topic 79 — Outbox Pattern** — the pattern that guarantees events are never lost even if the service crashes after writing to the DB but before publishing to Kafka — a direct dependency of reliable Kafka publishing
- **Topic 76 — Saga Pattern** — multi-step distributed transactions using Kafka events — the pattern for maintaining data consistency when work is split across services that communicate via Kafka
- **Topic 78 — Eventual Consistency** — the consistency model accepted when using async communication — understanding what "eventually consistent" means in practice, how to reason about it, and where it is and isn't acceptable
- **Topic 68 — Service Discovery** — closely related to how services connect — Kafka consumer groups handle service discovery via broker coordination, but synchronous callers need a different discovery mechanism

---

*Part 4 · Asynchronous Communication (Kafka/RabbitMQ) · Full Stack Interview Guide · Hruday D · 2026*
