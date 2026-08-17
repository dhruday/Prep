# Outbox Pattern — Reliable Event Publishing
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Outbox Pattern = a technique to guarantee that a database write and an event publication happen atomically — you write both the business change AND an outbox message into your OWN database in a single local transaction, then a separate process reliably reads and publishes the outbox messages to Kafka/RabbitMQ
- The problem it solves: without the outbox, you write to DB first and then send the Kafka event — if the service crashes between those two steps, the DB is updated but no event is published → other services never hear about the change → the saga gets stuck mid-way or the distributed state diverges
- How it works: (1) Inside your @Transactional method: `orderRepository.save(order)` + `outboxRepository.save(new OutboxEvent("OrderCreated", payload))` — both in the same DB transaction; (2) An OutboxPoller runs on a schedule/Debezium CDC reads the outbox table and publishes to Kafka, then marks the record as published
- Debezium = a CDC (Change Data Capture) tool that watches the database's transaction log (WAL in Postgres, binlog in MySQL) and streams changes as events — no polling needed, Debezium reacts to changes in real-time from the transaction log
- At-least-once delivery: the outbox guarantees the message WILL be published (even after a crash), but the consumer must handle duplicates with idempotency keys
- Gap to bridge: Most candidates know about outbox conceptually but cannot describe the polling vs CDC delivery approaches, or explain why at-least-once (not exactly-once) is the realistic guarantee

---

## 1. One-Line Definition
The Transactional Outbox Pattern ensures atomic coupling between a database write and an event publication by writing both the business data and the outbox event record into the same local database transaction, then using a background process (polling or CDC) to reliably deliver the event to the message broker.

---

## 2. The Problem It Solves

In a choreography Saga or any event-driven system, services must publish events whenever their state changes. The naive implementation:

```java
// NAIVE — DO NOT DO THIS:
@Transactional
public Order placeOrder(CreateOrderRequest req) {
    Order order = orderRepository.save(new Order(req));  // Writes to DB ✅
    kafkaTemplate.send("order-events", new OrderCreatedEvent(order));  // Publishes to Kafka ⚠️
    return order;
}

// Problem scenarios:
// Scenario 1: DB write succeeds, then service CRASHES before kafkaTemplate.send() runs
//   → DB has the order. Kafka has nothing. Inventory never reserves stock. Order stuck.

// Scenario 2: DB write succeeds, kafkaTemplate.send() called but Kafka is temporarily down
//   → Same result: empty Kafka, stuck saga.

// Scenario 3: kafkaTemplate.send() technically succeeds (put on socket buffer)
//   but the Kafka broker is partitioned and receives it only after long delay
//   → Unpredictable delivery timing, potentially out-of-order with other events.

// There is NO transactional guarantee between a database write and a Kafka publish.
// They are completely separate systems with separate failure modes.
```

The Outbox Pattern solves this by using ONLY the database transaction as the durability mechanism. The Kafka publication is decoupled and guaranteed to happen eventually — no event is ever lost, and no event is published for a transaction that rolled back.

---

## 3. How It Works Internally

### The Core Mechanism — Outbox Table in Same Database

```
SERVICE DATABASE (same DB as business tables):
┌─────────────────────────────────────┐
│  orders table                       │
│  ─────────────────────────────────  │
│  id | status | user_id | total      │
│  42 | PLACED | usr-7   | 1200.00    │
└─────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  outbox_events table (in the SAME database as orders)           │
│  ─────────────────────────────────────────────────────────────  │
│  id | event_type   | aggregate_id | payload | published_at      │
│   1 | OrderCreated | 42           | {...}   | NULL (not yet)    │
└─────────────────────────────────────────────────────────────────┘

Step 1: @Transactional method:
  BEGIN TRANSACTION
    INSERT INTO orders (...) VALUES (...)         ← business change
    INSERT INTO outbox_events (...) VALUES (...)  ← outbox event
  COMMIT  ← BOTH write together, atomically

  If the transaction commits → BOTH records exist. Event publication will happen.
  If the transaction rolls back → NEITHER record exists. No orphaned event.

Step 2: Outbox Publisher (runs outside the transaction):
  Option A — Polling publisher: reads WHERE published_at IS NULL, publishes to Kafka, updates published_at
  Option B — Debezium CDC: watches Postgres WAL for INSERTs to outbox_events, publishes to Kafka automatically

The KEY insight: the outbox_events table is in the SAME database as the orders table.
The database's ACID transaction guarantees that they are written together.
No dual-write, no crash-gap.
```

### Polling vs CDC — Two Outbox Delivery Approaches

```
APPROACH 1 — POLLING PUBLISHER:
──────────────────────────────
Application runs a scheduled job (every 100ms):
  SELECT * FROM outbox_events WHERE published_at IS NULL
  For each row:
    kafkaTemplate.send(topic, event)
    UPDATE outbox_events SET published_at = NOW() WHERE id = ?

  Pro: Simple to implement, no additional infrastructure
  Con: Polling introduces latency (up to pollingInterval); adds DB load; 
       at high throughput, polling can become a bottleneck

APPROACH 2 — DEBEZIUM CDC (Change Data Capture):
────────────────────────────────────────────────
Debezium connects to the Postgres Write-Ahead Log (WAL):
  Postgres WAL records every committed change: INSERT, UPDATE, DELETE
  Debezium streams these WAL records from Postgres as events
  
  When a new row is inserted into outbox_events:
  → Debezium reads the WAL within milliseconds
  → Debezium publishes the outbox row's payload as a Kafka message
  → Debezium records the WAL offset so it knows where to resume if it restarts
  
  Pro: Near-real-time delivery (milliseconds not polling-interval seconds)
       No polling load on the application database
       Debezium handles its own state — offset tracking in Kafka
  Con: Additional infrastructure to deploy and manage (Debezium + Kafka Connect)
       Debezium requires Postgres WAL retention to be configured
       Schema changes to outbox table can affect Debezium's deserialization

Flow:
  Order Service DB → Debezium (reads WAL) → Kafka Connect → Kafka Topic "order-events"
```

### ASCII Diagram — The Outbox Flow

```
WITHOUT OUTBOX (unreliable):
┌─────────────────┐      write       ┌────────────┐
│  OrderService   │ ───────────────► │   Orders   │
│  @Transactional │                  │   Table    │
└────────┬────────┘                  └────────────┘
         │
         │ separate, non-transactional
         ▼
    kafkaTemplate.send()
         │
         ▼ ← CRASH HERE? Event lost forever.
    ┌────────┐
    │ Kafka  │
    └────────┘

WITH OUTBOX (reliable):
┌─────────────────┐      BEGIN TX    ┌────────────────────────┐
│  OrderService   │ ───────────────► │   Orders Table         │
│  @Transactional │                  │   + Outbox Table       │
└─────────────────┘      COMMIT TX   │   (same DB, atomic)    │
                                     └────────────┬───────────┘
                                                  │
                                     WAL/polling  ▼
                                     ┌─────────────────────┐
                                     │ Debezium / Poller   │
                                     └──────────┬──────────┘
                                                │ guaranteed delivery
                                                ▼
                                           ┌────────┐
                                           │ Kafka  │
                                           └────────┘
CRASH ANYWHERE after TX commit → outbox row persists → delivery still happens on recovery
```

---

## 4. The Code

### Business Write + Outbox in One Transaction
```java
@Entity
@Table(name = "outbox_events")
@Data
@NoArgsConstructor
public class OutboxEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "aggregate_type", nullable = false)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false)
    private String aggregateId;

    @Column(columnDefinition = "jsonb", nullable = false)
    private String payload;  // JSON serialized event

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "published_at")
    private Instant publishedAt;  // NULL = not yet published

    public OutboxEvent(String eventType, String aggregateType, String aggregateId, String payload) {
        this.eventType = eventType;
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
```

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OutboxEventRepository outboxRepo;
    private final ObjectMapper objectMapper;

    // Both the order AND the outbox event are saved in ONE transaction
    @Transactional
    public Order placeOrder(CreateOrderRequest request) {
        Order order = new Order(
            UUID.randomUUID().toString(),
            request.getUserId(),
            request.getItems(),
            OrderStatus.PLACED
        );
        Order saved = orderRepository.save(order);

        // Construct the event payload
        OrderCreatedEvent event = new OrderCreatedEvent(
            saved.getId(),
            saved.getUserId(),
            saved.getItems(),
            saved.getTotal()
        );

        // Write outbox event in the SAME transaction as the order
        OutboxEvent outboxEvent = new OutboxEvent(
            "OrderCreated",
            "Order",
            saved.getId(),
            serialize(event)  // JSON
        );
        outboxRepo.save(outboxEvent);  // Same DB, same transaction

        log.info("Order placed and outbox event recorded: orderId={}", saved.getId());
        return saved;
        // COMMIT here: both order row and outbox_events row committed atomically
    }

    private String serialize(Object event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize event", e);
        }
    }
}
```

### Polling Publisher (for lower-volume services without Debezium)
```java
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPollingPublisher {

    private final OutboxEventRepository outboxRepo;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    // Runs every 100ms to pick up unpublished outbox events
    @Scheduled(fixedDelay = 100)
    @Transactional
    public void publishPending() {
        // Fetch unprocessed events with a limit to avoid processing too many at once
        List<OutboxEvent> pending = outboxRepo
            .findByPublishedAtIsNullOrderByCreatedAtAsc(PageRequest.of(0, 50));

        if (pending.isEmpty()) return;

        for (OutboxEvent event : pending) {
            try {
                String topic = resolveKafkaTopic(event.getAggregateType(), event.getEventType());

                kafkaTemplate.send(topic, event.getAggregateId(), event.getPayload())
                    .get(5, TimeUnit.SECONDS);  // Block to confirm send

                event.setPublishedAt(Instant.now());
                outboxRepo.save(event);  // Mark as published

                log.debug("Published outbox event: type={} aggregateId={}", 
                         event.getEventType(), event.getAggregateId());

            } catch (Exception e) {
                log.error("Failed to publish outbox event id={}: {}", event.getId(), e.getMessage());
                // Do NOT mark as published — will retry next poll cycle
                // Alert if this event keeps failing
            }
        }
    }

    private String resolveKafkaTopic(String aggregateType, String eventType) {
        return aggregateType.toLowerCase() + "-events";  // e.g., "order-events"
    }
}
```

### Debezium Configuration (application.properties-style for Kafka Connect)
```json
{
  "name": "order-service-outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "order-service-db",
    "database.port": "5432",
    "database.user": "debezium_user",
    "database.password": "secret",
    "database.dbname": "order_db",
    "database.server.name": "order-service",
    "table.include.list": "public.outbox_events",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.id": "id",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.route.by.field": "aggregate_type",
    "transforms.outbox.route.topic.replacement": "${routedByValue}-events"
  }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the Outbox Pattern and what problem does it solve?"

**Hruday's answer:**
> The Outbox Pattern solves the dual-write problem in event-driven microservices. When a service needs to update its database AND publish an event to Kafka, these are two separate transactional systems. If the service updates the database and then crashes before it can publish the Kafka event, the database reflects the change but no downstream service ever receives the event — sagas get stuck, data becomes inconsistent across services.
>
> The Outbox Pattern solves this by never directly publishing to Kafka from within the business transaction. Instead, the service writes both the business data change and an outbox event record into its own database as part of ONE atomic transaction. If the transaction commits, both records exist together. If it rolls back, neither record exists.
>
> A separate process — either a polling job or a Debezium CDC connector — then reads the outbox table and publishes the events to Kafka. If that publishing step fails, it can retry — the event is still in the outbox table. The event is only marked as published after Kafka confirms receipt.
>
> The guarantee this provides: every committed business transaction generates exactly one publishable event. No events are lost due to crashes. No events are published for rolled-back transactions.

---

### Q2 — CDC vs Polling
**Interviewer asks:** "When would you use Debezium CDC versus a polling publisher for the outbox?"

**Hruday's answer:**
> I think of it as a latency-vs-simplicity trade-off.
>
> A polling publisher is dead simple — a scheduled job that runs every 100-500ms, selects unpublished rows, publishes them to Kafka, and marks them done. No additional infrastructure beyond the database and Kafka you already have. The downside: latency is at least the polling interval. At 100ms polling, events are delivered up to 100ms after they're written. Under high volume, the polling query itself adds database load, and the sequential processing of polled batches can become a bottleneck.
>
> Debezium CDC is nearly real-time — it reads Postgres's WAL stream, so new outbox rows are detected within milliseconds of being committed, without any polling query load. The trade-off: it's additional infrastructure — a Debezium Kafka Connect cluster alongside your services. It requires configuring Postgres's WAL retention and replication settings. Schema changes to the outbox table can affect Debezium's behaviour. There's operational overhead in managing and monitoring Kafka Connect.
>
> My recommendation: start with polling for early-stage services — it's simpler, works well, and can be replaced later. Graduate to Debezium when event latency matters (sub-second saga steps), when you have multiple services with outbox tables and want a consistent delivery mechanism, or when polling query load on the database becomes measurable.

---

### Q3 — Idempotency and Duplicate Delivery
**Interviewer asks:** "The outbox guarantees at-least-once delivery. How do consumers handle duplicate events?"

**Hruday's answer:**
> At-least-once delivery means the outbox will ensure the event is published — potentially more than once if: the poller publishes the event and then crashes before marking it "published", so it publishes it again on restart. Or Debezium reprocesses a WAL segment on restart before its committed offset was saved.
>
> The consumer must be idempotent — if it processes the same event twice, the second processing should produce the same outcome as the first, with no duplicate side effects.
>
> The standard approach: every event carries a unique event ID (UUID). Each consumer service maintains a table: `processed_events(event_id, processed_at, consumer_group)`. Before processing any event, the consumer checks: "Is this event ID already in my processed_events table?" If yes, skip. If no, process it and insert the event ID into processed_events in the same database transaction as the actual business change.
>
> ```java
> @KafkaListener(topics = "order-events", groupId = "inventory-service")
> @Transactional
> public void onOrderCreated(OrderCreatedEvent event, Acknowledgment ack) {
>     if (processedEventRepository.existsByEventId(event.getEventId())) {
>         log.info("Duplicate event skipped: {}", event.getEventId());
>         ack.acknowledge();
>         return;
>     }
>     inventoryService.reserveStock(event.getOrderId(), event.getItems());
>     processedEventRepository.save(new ProcessedEvent(event.getEventId()));
>     ack.acknowledge();
> }
> ```
>
> The unique event ID in the outbox event row + the processed_events check in each consumer together provide effectively exactly-once business semantics on top of at-least-once delivery.

---

### Q4 — System Design Application
**Interviewer asks:** "In Swiggy's order system, how would you use the Outbox Pattern to ensure inventory is always updated when an order is placed?"

**Hruday's answer:**
> In OrderService's `placeOrder()` method, I wrap both the order table write and the outbox event write in a single `@Transactional` method. The outbox_events row says "OrderPlaced, orderId=XYZ, payload={items}". Both commit together in OrderService's Postgres database.
>
> Debezium watches OrderService's Postgres WAL and detects the new outbox_events row within milliseconds. It publishes the payload to the `order-events` Kafka topic.
>
> InventoryService's Kafka consumer receives the `OrderPlaced` event. It checks its processed_events table to ensure it's not a duplicate. Then it reserves the stock and records the processed event in the same transaction. If stock reservation fails (out of stock), it publishes a `StockReservationFailed` event — again, using its own outbox table for reliable event publication.
>
> The critical guarantee: even if every service crashes and restarts repeatedly during this flow, the outbox table in each service acts as a durable event store. No event is lost between service steps. The saga will always make forward progress or trigger compensating transactions — it never silently gets stuck in an unknown mid-state.
>
> This setup also makes the system observable: the outbox_events table shows all pending events. If events are accumulating without being published, that's an alert condition — Debezium or the poller is down.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Save to DB, then publish to Kafka, that's fine" | "Just use try/catch and handle the Kafka failure" | "Even with perfect error handling, you cannot recover from a process crash between the DB write and the Kafka publish. The crash doesn't throw an exception — it just stops execution. After restart, the service has no record of the pending Kafka message. The outbox table is the ONLY way to durably record the 'I need to publish this' intent in the same transaction as the business change." |
| "Outbox table is just a queue" | "I'll use Redis as the outbox" | "The outbox must be in the SAME database as the business tables so it participates in the same local ACID transaction. An external Redis, RabbitMQ, or any other store that is NOT the same database does not participate in the transaction — the dual-write problem applies to the Redis write too. The whole point is using the SINGLE local database transaction as the atomicity boundary." |
| "CDC is always better" | "Just use Debezium everywhere, it's more modern" | "Debezium requires WAL retention configured on the database, Kafka Connect infrastructure to manage, schema change coordination, and operational expertise in CDC. For a service with low event volume (thousands per hour), a simple polling publisher is operationally much simpler and costs less. Choose infrastructure complexity proportional to actual requirements." |
| "Mark as published before sending to Kafka" | "Update published_at first, then send to Kafka" | "If you mark it published and then the Kafka send fails, the event is marked published but never actually delivered. You lose it silently. The correct order: send to Kafka first, wait for confirmation from Kafka broker, THEN mark as published. If the marking fails after a successful Kafka send and the event gets re-sent, the consumer's idempotency check handles the duplicate. Silent loss is far worse than a duplicate." |

---

## 7. Hruday's Real Experience Hook

> "The outbox pattern made intuitive sense to me because of an analogy from Oracle's procurement system at my previous engagement: in the Oracle Purchasing module, when a Purchase Order was approved, it wrote to the PO_HEADERS table AND to an AP_INTERFACE table (the Accounts Payable staging table) in the same database transaction. The AP module then periodically polled that interface table to create payable invoices. It was Oracle's version of the outbox pattern — write business data + write to staging table together in one transaction, then a separate process reads the staging table. The staging table was the outbox. Understanding that this pattern was already present in enterprise systems helped me see why Debezium/Kafka-based outbox is the natural evolution of the same idea for microservices."

---

## 8. Scale Evolution

**Low volume service:** Implemented polling publisher with a 500ms polling interval. Simple Spring `@Scheduled` method. The 500ms event latency is acceptable.

**Growing service (medium volume):** Reduce polling to 100ms. Add metrics: `outbox_events_pending_count` Prometheus gauge. Alert if pending count > threshold (publishing falling behind).

**High volume / latency-sensitive:** Deploy Debezium with Kafka Connect. Events published within milliseconds of transaction commit. Polling latency is no longer an issue.

**Multi-service platform:** Standardise on Debezium CDC across all services. Use Kafka Connect connectors per service database. Provide a shared outbox library that services include — defines the `OutboxEvent` entity and provides `OutboxHelper.save()` method so no service builds its own outbox infrastructure.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | In payment systems, losing a "payment completed" event means merchant accounts don't get credited. The outbox pattern is essential for every state change that must trigger downstream processing. | "How do you guarantee that a successful payment event is always published?" |
| Swiggy / Meesho | Order acceptance → inventory reservation → delivery assignment. Each step requires reliable event delivery. The outbox ensures no step is silently skipped due to service crashes. | "What happens if OrderService crashes after saving the order but before publishing the event?" |
| Adobe / Microsoft | Creative Cloud entitlement changes (subscription start/end) must reliably trigger downstream license grant/revoke systems. The outbox is the pattern for "this database change MUST generate an event." | "How do you ensure an entitlement grant is always reflected in the license service?" |
| Amazon | Amazon's item fulfillment pipeline: warehouse pick → pack → ship each triggers downstream systems. Debezium-style WAL-based CDC is foundational to Amazon's event streaming architecture (DynamoDB Streams is conceptually the same). | "How does DynamoDB Streams work and what does it solve?" |

---

## 10. Related Topics — What to Study Next

- **Topic 76 — Saga Pattern** — the Outbox Pattern is the reliability mechanism that makes choreography Sagas trustworthy; Saga defines WHAT events drive distributed coordination, Outbox ensures those events are RELIABLY delivered
- **Topic 67 — Kafka and Asynchronous Communication** — Outbox events are published via Kafka; deep understanding of producer acknowledgements (acks=all), offset commit, and at-least-once semantics is required to design the outbox correctly
- **Topic 78 — Eventual Consistency** — the Outbox Pattern is the infrastructure that makes eventual consistency reliable; understanding what "eventual" means in terms of propagation latency connects to the polling interval or CDC latency of the outbox publisher

---

*Part 4 · Outbox Pattern — Reliable Event Publishing · Full Stack Interview Guide · Hruday D · 2026*
