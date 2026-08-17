# Event Sourcing Basics
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Event Sourcing** is an architectural pattern where you store every change to application state as a **sequence of immutable events**, rather than storing only the current state.
- Traditional persistence: `UPDATE orders SET status = 'SHIPPED'` — the previous state is **overwritten and lost**.
- Event Sourcing: append `OrderShipped { orderId, shippedAt, trackingId }` to an event log — **previous states are preserved**. You can always rebuild current state by replaying all events in order.
- The **current state** of an entity (called an **aggregate**) is computed by replaying all its events: `OrderCreated → PaymentReceived → ItemPicked → OrderShipped` = current state is "shipped".
- **Four key benefits**: (1) complete audit trail for free — every state change has who/what/when; (2) time travel — reconstruct state at any point in the past; (3) replay for bug investigation — reproduce exact system state at the moment of a bug; (4) derived projections — build new read models from the same event stream without data migration.
- **Key trade-offs**: eventual consistency for read models (projections lag behind events), growing event store (snapshots mitigate this), schema evolution complexity (old events must remain processable), replay time for large aggregates.
- **Kafka as an event store**: Kafka topics with long retention (`retention.ms = Long.MAX_VALUE`) or compacted-plus-time topics serve as an event store. Consumers rebuild state by starting from the earliest offset. This is how Kafka Streams KTables work internally.
- Inseparable companion: **CQRS** (Command Query Responsibility Segregation) — separate write model (event store) from read model (projections). Event Sourcing naturally enables CQRS.

---

## 1. One-Line Definition
Event Sourcing persists application state as a sequence of immutable domain events rather than mutable rows — state is never updated, only appended to; current state is derived by replaying events from the log.

---

## 2. The Problem It Solves

### Traditional Persistence — What Gets Lost

```
TRADITIONAL: Store only current state

Table: orders
id     | status   | amount  | updated_at
-------|----------|---------|--------------------
ORD-1  | SHIPPED  | 499.99  | 2025-06-10 14:32:01

Question: "What was the order status at 2025-06-09 09:00?"
Answer: UNKNOWN. It was overwritten.

Question: "Why was the order refunded? Who approved it?"
Answer: UNKNOWN. The previous status and actor are gone.

Question: "Show me every state transition this order went through"
Answer: IMPOSSIBLE without a separate audit_log table that must be manually maintained.

Reality: financial regulations (PCI-DSS, SOX), operations teams, and customer service
all need this history. Most systems bolt on an audit log as an afterthought.
```

### Event Sourcing — Full History Preserved

```
EVENT SOURCING: Store every state change as an event

Event Store (append-only):
sequence | aggregate_id | event_type          | payload                                          | timestamp
---------|--------------|---------------------|--------------------------------------------------|---------------------
1        | ORD-1        | OrderCreated        | {userId: U-42, items: [...], amount: 499.99}     | 2025-06-09 08:01:00
2        | ORD-1        | PaymentReceived     | {paymentId: PAY-99, method: UPI}                 | 2025-06-09 08:01:45
3        | ORD-1        | ItemsPicked         | {warehouseId: WH-3, pickedBy: "Ravi"}            | 2025-06-09 11:20:00
4        | ORD-1        | OrderShipped        | {trackingId: "TK123", carrier: "BlueDart"}       | 2025-06-09 15:10:00
5        | ORD-1        | RefundRequested     | {reason: "damaged", requestedBy: "customer"}     | 2025-06-10 09:00:00
6        | ORD-1        | RefundApproved      | {approvedBy: "agent-007", amount: 499.99}        | 2025-06-10 14:30:00

Question: "What was the order status at 2025-06-09 09:00?"
Answer: CREATED (replay events up to 09:00 → only OrderCreated was stored → state is CREATED)

Question: "Why was the order refunded? Who approved it?"
Answer: RefundRequested by customer (damaged), RefundApproved by agent-007

Question: "Show me every state transition?"
Answer: CREATED → PAYMENT_RECEIVED → ITEMS_PICKED → SHIPPED → REFUND_REQUESTED → REFUND_APPROVED

This is the audit trail. It wasn't bolted on — it's the primary storage mechanism.
```

---

## 3. How It Works Internally

### The Aggregate: State Rebuilt by Replaying Events

```
An "aggregate" is a domain entity whose state is computed from events.
Replaying all events for aggregate ORD-1 produces current state:

OrderCreated:       order.status = CREATED, order.amount = 499.99
PaymentReceived:    order.status = PAYMENT_RECEIVED, order.paymentId = PAY-99
ItemsPicked:        order.status = PICKED, order.warehouseId = WH-3
OrderShipped:       order.status = SHIPPED, order.trackingId = TK123
RefundRequested:    order.status = REFUND_REQUESTED, order.refundReason = "damaged"
RefundApproved:     order.status = REFUND_APPROVED, order.refundAmount = 499.99

Current state of ORD-1: REFUND_APPROVED, refundAmount = 499.99

The state is never stored directly — it's always computed from events.
No stale data. No sync required. The events ARE the truth.
```

### Snapshots: Performance Optimisation for Long Aggregates

```
Problem: an account with 50,000 transactions replays 50,000 events every time it's loaded.
Solution: periodically persist a snapshot — a computed state checkpoint.

On load:
  1. Read latest snapshot (e.g., account state after event 49,900)
  2. Apply events 49,901 → 50,000 (only 100 events, not 50,000)
  3. Current state = snapshot + last 100 events applied

Snapshot creation rule: every N events (e.g., every 1,000 or 5,000)
Snapshots are read optimisations — the source of truth is still the events.
```

### CQRS + Event Sourcing Together

```
WRITE SIDE (Command):
  Client sends command: CreateOrder(userId, items, amount)
  Command handler validates, creates domain events
  Appends events to event store
  Returns success to client

Event store emits events to message bus (Kafka / RabbitMQ)

READ SIDE (Query):
  Event consumers receive events from bus
  Update read-optimised projections (denormalised tables, search indexes, caches)
  Clients query projections directly (fast, indexed, no replay needed)

Projections are EVENTUALLY CONSISTENT — they lag behind the event store by milliseconds.
Read models are rebuilt from scratch if they get out of sync (replay from event store).
```

---

## 4. The Code

### ❌ Wrong Way — Event-Sourced State Update Pattern in Traditional Style

```java
// ❌ WRONG: Mutating state directly and saving entity (not event sourcing)
@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    public void shipOrder(String orderId, String trackingId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));

        // ❌ Direct mutation — history is lost
        order.setStatus(OrderStatus.SHIPPED);
        order.setTrackingId(trackingId);
        order.setShippedAt(Instant.now());

        orderRepository.save(order);
        // Previous status (PICKED, PAYMENT_RECEIVED, etc.) — gone forever.
        // No record of what happened, when, or by whom.
    }
}
```

### ✅ Right Way — Event Sourcing with Spring and Kafka

```java
// Domain Event: an immutable fact about something that happened
@Value  // Lombok: immutable value object
public class OrderShippedEvent {
    String orderId;
    String trackingId;
    String carrier;
    Instant shippedAt;
    String shippedBy;  // actor who triggered this
    long version;      // monotonically increasing, for optimistic locking
}

// Order Aggregate: state built from events
@Slf4j
public class Order {

    // Current state fields — never persisted directly in event sourcing
    private String orderId;
    private OrderStatus status;
    private String trackingId;
    private BigDecimal amount;
    private long version = 0;

    // Private constructor — force creation via replay or event application
    private Order() {}

    // Reconstruct current state from event history (called on load)
    public static Order reconstitute(List<DomainEvent> events) {
        Order order = new Order();
        for (DomainEvent event : events) {
            order.apply(event);
        }
        return order;
    }

    // Handle a command: validate business rules, then produce event
    public OrderShippedEvent ship(String trackingId, String carrier, String actorId) {
        // Business rule validation
        if (this.status != OrderStatus.ITEMS_PICKED) {
            throw new InvalidOrderStateException(
                "Cannot ship order in status: " + this.status);
        }
        if (trackingId == null || trackingId.isBlank()) {
            throw new IllegalArgumentException("Tracking ID required for shipping");
        }

        // Produce the event — this is the COMMAND handler's output
        return OrderShippedEvent.builder()
            .orderId(this.orderId)
            .trackingId(trackingId)
            .carrier(carrier)
            .shippedAt(Instant.now())
            .shippedBy(actorId)
            .version(this.version + 1)
            .build();
        // NOTE: state is NOT mutated here. Event is returned. Caller persists event then applies it.
    }

    // Apply an event: pure state mutation — no validation, no side effects
    // Called both during reconstitution AND after new event is persisted
    public void apply(DomainEvent event) {
        if (event instanceof OrderCreatedEvent e) {
            this.orderId = e.getOrderId();
            this.status = OrderStatus.CREATED;
            this.amount = e.getAmount();
        } else if (event instanceof PaymentReceivedEvent e) {
            this.status = OrderStatus.PAYMENT_RECEIVED;
        } else if (event instanceof ItemsPickedEvent e) {
            this.status = OrderStatus.ITEMS_PICKED;
        } else if (event instanceof OrderShippedEvent e) {
            this.status = OrderStatus.SHIPPED;
            this.trackingId = e.getTrackingId();
        } else {
            log.warn("Unknown event type: {}", event.getClass().getSimpleName());
        }
        this.version++;
    }
}
```

### Event Store with Kafka (Long Retention)

```java
// Kafka as event store — topics configured for long or indefinite retention
@Configuration
public class EventStoreTopicConfig {

    @Bean
    public NewTopic orderEventsStoreTopic() {
        // ✅ Long retention: keep events indefinitely (Long.MAX_VALUE)
        // or retention.ms = 10 years equivalent for compliance
        return TopicBuilder.name("order.events.store")
            .partitions(12)         // partition by orderId hash → all events for one order on same partition
            .replicas(3)
            .config(TopicConfig.RETENTION_MS_CONFIG, String.valueOf(Long.MAX_VALUE))
            .config(TopicConfig.CLEANUP_POLICY_CONFIG, TopicConfig.CLEANUP_POLICY_DELETE)
            .build();
    }
}

// Command handler: persist event to Kafka, then apply to in-memory aggregate
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderCommandHandler {

    private final KafkaTemplate<String, DomainEvent> kafkaTemplate;
    private final EventStoreRepository eventStoreRepository; // also persists to RDB for query

    @Transactional
    public void handle(ShipOrderCommand command) {
        // 1. Load aggregate by replaying events from event store
        List<DomainEvent> history = eventStoreRepository.loadEvents(command.getOrderId());
        Order order = Order.reconstitute(history);

        // 2. Execute command — produces event (may throw on invalid state)
        OrderShippedEvent event = order.ship(
            command.getTrackingId(),
            command.getCarrier(),
            command.getActorId()
        );

        // 3. Persist event (append-only — NEVER update existing events)
        eventStoreRepository.appendEvent(command.getOrderId(), event);

        // 4. Publish to Kafka for event consumers / projections
        kafkaTemplate.send("order.events.store", command.getOrderId(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish OrderShippedEvent for orderId={}", command.getOrderId(), ex);
                    // Note: event is already persisted to DB — projections will catch up via replay
                }
            });

        log.info("Order {} shipped: trackingId={}", command.getOrderId(), event.getTrackingId());
    }
}
```

### Projection Builder: Rebuild Read Model from Kafka

```java
// Projection consumer: builds fast-query read model from events
@Component
@Slf4j
public class OrderProjectionConsumer {

    private final OrderProjectionRepository projectionRepo;

    @KafkaListener(
        topics = "order.events.store",
        groupId = "order-projection-builder",
        properties = "auto.offset.reset=earliest"  // start from beginning to rebuild full projection
    )
    public void onEvent(DomainEvent event, Acknowledgment ack) {
        try {
            if (event instanceof OrderCreatedEvent e) {
                projectionRepo.insert(OrderView.fromCreated(e));

            } else if (event instanceof PaymentReceivedEvent e) {
                projectionRepo.updatePaymentStatus(e.getOrderId(), "PAYMENT_RECEIVED", e.getPaymentId());

            } else if (event instanceof OrderShippedEvent e) {
                projectionRepo.updateShipping(e.getOrderId(), "SHIPPED", e.getTrackingId());

            }
            // Unrecognised events: ignore safely (forward compatibility — new events added later)
            ack.acknowledge();
        } catch (Exception ex) {
            log.error("Projection update failed for event: {}", event, ex);
            throw ex;  // DefaultErrorHandler handles; DLT if unrecoverable
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Definition
**Interviewer asks:** "What is Event Sourcing and when would you choose it over traditional CRUD?"

**Hruday's answer:**
> Event Sourcing stores state changes as a sequence of immutable events rather than overwriting state in place. The current state of an entity is always computed by replaying its event history. No event is ever deleted or modified — the event log is the source of truth.
>
> I'd choose Event Sourcing when: (1) the business requires a complete audit trail — financial systems, healthcare, compliance-driven domains; (2) the team needs time travel capability — debugging production issues by replaying events exactly as they occurred; (3) domain events are inherently meaningful — in a payment system, `PaymentCaptured`, `RefundIssued`, `ChargebackReceived` are real business facts, not just state transitions; (4) multiple downstream systems need to react to state changes — publish events to Kafka, let each downstream build its own projection.
>
> I would NOT choose it for: simple CRUD with no audit requirements (over-engineering), systems where performance of reconstructing aggregates matters more than replay capability, or teams unfamiliar with eventual consistency (the learning curve is steep).

---

### Q2 — Projection Rebuild
**Interviewer asks:** "Your team adds a new requirement: show 'last 7 days of orders with delivery SLA breached'. How does Event Sourcing help here?"

**Hruday's answer:**
> In a traditional system, this requires either adding a new query to an existing table — which may require a schema migration and back-filling data — or realising the data was never captured and there are no historical records.
>
> In Event Sourcing, I already have every event that ever occurred. To support this new requirement: create a new projection consumer that reads from `order.events.store` starting at `auto.offset.reset=earliest`. Build a new read model: for each order, calculate the time between `OrderCreated` event timestamp and `OrderShipped` event timestamp, compare to the promised SLA, and project into a new table `order_sla_breaches`. This consumer catches up from the beginning of time — it populates the new table with all historical SLA data automatically, within minutes.
>
> No data migration. No backfill script. No missing history. This is one of the most powerful properties of event sourcing: new projections can always be backfilled by replaying history.

---

### Q3 — Schema evolution
**Interviewer asks:** "An event you published 3 years ago has a different structure than your current code expects. How do you handle event schema evolution in Event Sourcing?"

**Hruday's answer:**
> This is one of the real challenges of Event Sourcing. Events are immutable — you can never change what was recorded. But you can handle evolution in three ways.
>
> First: upcasting. When reading old events, run them through an "upcaster" that transforms the old structure to the new structure before the aggregate processes it. Example: old `OrderCreated` had `"customer"` field, new code expects `"userId"`. An upcaster maps `customer → userId` at read time. The stored event is untouched; the in-memory view is normalised.
>
> Second: versioned event types. Rename the old event `OrderCreatedV1`, create `OrderCreatedV2` with the new structure. The `apply()` method handles both.
>
> Third: add fields with defaults. If adding a new field: old events simply won't have it, deserialise with null or a sensible default, and the aggregate handles null gracefully. Never remove fields from old events — deserialisation breaks on stored records.
>
> The operational rule: schema changes to events require the same discipline as API versioning — think before publishing because you can't change what's already been stored.

---

### Q4 — Kafka as Event Store
**Interviewer asks:** "How would you use Kafka as an event store for an event-sourced system?"

**Hruday's answer:**
> Kafka topics are append-only, ordered per partition, and retention is configurable. These properties make Kafka a natural event store.
>
> Setup: configure the event topic with `retention.ms = Long.MAX_VALUE` (infinite retention) and `cleanup.policy=delete` (not compact — we want all events, not just latest per key). Partition by aggregate ID (`orderId`, `paymentId`) so all events for one aggregate are on the same partition in order. Use `acks=all` and `enable.idempotence=true` on the producer so no events are lost or duplicated on publish.
>
> Rebuild aggregate: set `auto.offset.reset=earliest` and consumer.seek to the beginning of the relevant partitions. Apply events in offset order. For performance: maintain a local snapshot cache so you don't replay from offset 0 every time.
>
> Limitation: Kafka isn't a traditional event store — you can't efficiently query "all events for orderId=ORD-42" across partitions without knowing the partition assignment. For complex aggregate loading patterns: use a relational event store (PostgreSQL with an `events` table) as the primary store, and publish to Kafka as the event bus for projections. Both are valid architectures depending on query patterns.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Event Sourcing means you store events AND keep the current state table" | "I'll use event sourcing and also keep a state table in sync for queries" | "The state table IS the projection. In Event Sourcing, the canonical truth is the event log — not the state table. The state table (projection) is a derived, eventually-consistent read model built from events. If the state table and events diverge, throw away the state table and rebuild from events — not the other way around. Keeping a 'primary' state table alongside events means you don't actually trust your events, which defeats the purpose. Trust the events. The state table is a cache of the computed state — disposable and rebuildable." |
| "Replaying all events to get current state is too slow" | "Event Sourcing doesn't scale — replaying 10,000 events every request is too slow" | "Snapshots solve this directly. Snapshot the aggregate state every N events (e.g., every 1,000). On load: read latest snapshot + apply only events since that snapshot. Typically 10-50 events maximum. Performance is comparable to a regular DB read. Additionally: for read queries, NEVER replay events. Queries hit the projection (read model), not the event store. Event reconstruction only happens when processing a command that modifies aggregate state, which is far less frequent than reads." |
| "Events should contain the final state" | "I'll store the full state in each event — easier to query" | "Events should be minimal state-change facts, not full denormalised snapshots. `OrderShipped { orderId, trackingId, carrier, shippedAt }` is correct. `OrderShipped { orderId, trackingId, ..., ALL_ORDER_FIELDS }` is wrong. Embedding full state: bloats the event store, couples event schema to full aggregate schema (every field added to Order now requires event schema change), and misrepresents what actually changed. Events should capture what CHANGED and the minimal context needed to understand the change. Projections provide the full denormalised view." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, the Oracle ERP financial module uses a journal entry pattern that is the conceptual ancestor of Event Sourcing: every financial transaction is recorded as an immutable journal entry — debits and credits that are never modified. The current account balance is derived by summing all journal entries. There is no 'current balance field' — balance IS the sum of history. When debugging financial discrepancies, accountants replay entries to find where a figure changed. That accounting discipline maps directly to Event Sourcing: the ledger is the event store, journal entries are domain events, and account balance is the projected read model. Understanding Event Sourcing became much easier after recognising this pattern already existed in financial systems."

---

## 8. Scale Evolution

**1,000 users →** Event store as PostgreSQL `events` table (`aggregate_id`, `event_type`, `payload`, `occurred_at`, `version`). Publish to Kafka after commit. Single projection consumer. Snapshots every 500 events. No CQRS — query event store directly for admin tools.

**100,000 users →** Separate event store DB from projection DB. Multiple projection consumers (orders, inventory, notifications each have independent projections). Snapshots in Redis for sub-millisecond aggregate reconstruction. Upcasting layer for schema evolution. Kafka topic retention = 90 days, snapshot store fills in the rest.

**10 million users →** Dedicated event store service (EventStoreDB or custom). Event subscriptions via Kafka with consumer groups per projection. Projection rebuild tooling: ability to wipe and replay any projection from event store (zero-downtime using blue/green projection consumers). Event versioning with Avro + Schema Registry. Aggregate loading under 10ms via Redis snapshot cache + Kafka Streams KTable for real-time state.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Every payment must have a complete, immutable audit trail. Regulatory compliance (RBI guidelines require payment event records). Replay capabilities for reconciliation. | "How would you design the payment processing system to ensure zero audit data loss and support full transaction history replay?" |
| Swiggy / Meesho | Order lifecycle events (Created → Confirmed → Packed → Dispatched → Delivered) are naturally event-sourced. Projections serve real-time order tracking, dashboards, and analytics. | "Design an order state management system where every state transition is auditable and new projections can be added without data migration." |
| Adobe / Microsoft | Document workflow events (Created → Reviewed → Approved → Published → Archived) benefit from Event Sourcing for audit, compliance, and workflow replay. | "How would you implement Event Sourcing for a document management system that must satisfy enterprise compliance audit requirements?" |
| SAP Labs (current) | Oracle ERP journal entries are the accounting equivalent of Event Sourcing. Financial module state reconstruction, reconciliation, and audit are core SAP use cases. | "Explain how event sourcing principles apply to a financial ledger system and what guarantees you would provide around event immutability." |

---

## 10. Related Topics — What to Study Next

- **Topic 120 — Delivery Semantics** — exactly-once semantics becomes critical in Event Sourcing: if an event is published twice, the aggregate may process it twice and reach an incorrect state; idempotent event application via version checks prevents this
- **Topic 121 — Idempotent Consumers** — projection consumers must handle re-delivery of events idempotently; idempotent upserts in projections (based on event sequence or version number) ensure projections are correct even if events are delivered more than once
- **Topic 113 — Kafka Streams Basics** — KTables in Kafka Streams implement a form of event sourcing automatically: the KTable maintains the latest state per key by consuming an append-only event stream; understanding KTables gives a concrete implementation of the event-to-state-projection pattern
- **Topic 110 — Kafka Retention and Compaction** — when using Kafka as an event store, `retention.ms` and `cleanup.policy` configuration directly affects how long events are kept; for full Event Sourcing, understanding unlimited retention vs compaction trade-offs is essential

---

*Part 6 · Event Sourcing Basics · Full Stack Interview Guide · Hruday D · 2026*
