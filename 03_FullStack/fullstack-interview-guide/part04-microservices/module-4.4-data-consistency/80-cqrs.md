# CQRS — Command Query Responsibility Segregation
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- CQRS = **C**ommand **Q**uery **R**esponsibility **S**egregation — a pattern that separates the write model (commands that change state) from the read model (queries that return data), each optimised for its purpose; writes go to the command side (normalised, transactional), reads come from the read side (denormalised, pre-joined, fast)
- WHY: a single model optimised for both writes and reads is often a trade-off that serves neither well; write models need constraints, integrity, and transaction boundaries; read models need pre-aggregated, denormalised data for sub-millisecond queries with low join overhead
- HOW: a command changes state in the write database → the service publishes a domain event → a projection/event handler updates one or more read models (separate tables or databases optimised for specific query patterns)
- The read model is EVENTUALLY CONSISTENT with the write model — the propagation happens through events; designed explicitly, not accidentally
- CQRS ≠ Event Sourcing — CQRS separates read/write models but the write side can still be a normal relational database; Event Sourcing (storing every state change as an event instead of the current state) is a different pattern that CQRS is often combined with
- Gap to bridge: Most candidates know CQRS as a buzzword and think it means "separate read/write databases." The real depth is in projection design — how you build and maintain multiple specialised read models from the command side's domain events

---

## 1. One-Line Definition
CQRS (Command Query Responsibility Segregation) is an architectural pattern that explicitly separates the model used to handle write operations (Commands that change state) from the model used to handle read operations (Queries that return data), allowing each side to be independently optimised, scaled, and evolved.

---

## 2. The Problem It Solves

A typical "flat CRUD service" has one model for both reading and writing:

```java
// Single model — the table looks like this:
// orders table:
// id | user_id | status | created_at | item_count | total | address_line1 | city | ...

// WRITE use case: "Place an order" needs validation, calculations, status transitions
// → Needs constraints, foreign keys, normalisation, transaction integrity

// READ use case 1: "My orders" page for a user 
// → Needs: order_id, status, total, item descriptions, thumbnail images
// → Requires JOIN to order_items, products, images tables

// READ use case 2: "Order analytics dashboard"
// → Needs: total orders per day, totals by city, top products by revenue
// → Requires complex aggregations across large datasets

// READ use case 3: "Admin order search" 
// → Full-text search on customer name + item descriptions + order IDs

// All three read patterns have completely different data shapes and access patterns.
// Trying to serve them all from the same normalised relational schema means:
// - Complex JOINs (3-5 tables joined per query) on every page load
// - No optimisation for specific query patterns
// - Index management becomes complex (adding read-optimised indexes hurts write performance)
// - Scaling writes and reads together — if reads spike (Black Friday browsing), writes are impacted too
```

**The CQRS solution:** 
- Keep the write model normalised and transactionally correct (source of truth)
- Build specialised read models from domain events: a denormalised orders view optimised for "My Orders" page, a pre-aggregated view for analytics, an Elasticsearch index for search
- Each read model serves exactly the queries it's designed for — sub-millisecond response because it's pre-computed

---

## 3. How It Works Internally

### CQRS Architecture — Command Side and Query Side

```
COMMAND SIDE (Write operations — strong consistency, transactional):
                                
  Client → POST /orders → OrderCommandHandler
                               │
                               │ validates, applies business rules
                               ▼
                    OrderRepository.save()
                               │
                    ┌──────────┴───────────┐
                    │  Write Database       │
                    │  (Postgres, normalised)│
                    │  orders table         │
                    │  order_items table   │
                    └──────────┬───────────┘
                               │
                    publishes domain event
                               │
                               ▼
                    ┌──────────────────┐
                    │  Kafka / Outbox   │
                    │  OrderPlacedEvent │
                    └──────────┬───────┘
                               │
QUERY SIDE (Read operations — eventually consistent, fast):
                               │
              ┌────────────────┼──────────────────┐
              ▼                ▼                   ▼
     ┌────────────────┐ ┌──────────────┐  ┌──────────────────────┐
     │  UserOrdersView│ │  Analytics   │  │  OrderSearch         │
     │  (Postgres,    │ │  (Timescale  │  │  (Elasticsearch      │
     │   denormalised)│ │   or Redis)  │  │   index)             │
     │  pre-joined    │ │  pre-aggreg. │  │  full-text           │
     └───────┬────────┘ └──────┬───────┘  └──────────┬───────────┘
             │                 │                       │
             ▼                 ▼                       ▼
  GET /users/{id}/orders   GET /analytics/daily    GET /orders/search?q=
  (instant, single-table)  (instant, aggregated)  (instant, indexed)
```

### The Projection — Building the Read Model from Events

A **Projection** (or **Event Handler**) is the component that consumes domain events and maintains read model tables. Think of a projection as a "materialised view maintained by event processing."

```
OrderPlacedEvent arrives → UserOrdersProjection handles it:
  → INSERT INTO user_orders_view (
       order_id, user_id, status, created_at, total,
       items_summary,   ← pre-computed: "2x Nike Air Max, 1x Levi Jeans"
       thumbnail_url    ← first item's image URL (pre-fetched at write time)
     ) VALUES (...)

OrderStatusUpdatedEvent arrives → UserOrdersProjection handles it:
  → UPDATE user_orders_view SET status = 'SHIPPED', shipped_at = NOW()
    WHERE order_id = ?

OrderStatusUpdatedEvent arrives → AnalyticsProjection handles it:
  → UPDATE daily_order_metrics SET orders_shipped = orders_shipped + 1
    WHERE date = CURRENT_DATE

The SAME event can be consumed by MULTIPLE projections, each building a different read model.
If a projection is rebuilt (new read model added), it replays all historical events to build from scratch.
```

### CQRS vs Event Sourcing — Understanding the Difference

```
CQRS alone (most common in microservices):
  Write side: Updates the current state in a relational database
  Event: Published AFTER the state change, for propagation purposes
  
  Example:
    Command: "PlaceOrder {orderId, items}"
    Handler: validate → save Order to database → publish OrderPlacedEvent
    Projections: update read models based on OrderPlacedEvent
  
  The authoritative state IS the current state of the orders table.

CQRS + Event Sourcing (more complex, used in audit-critical or time-travel systems):
  Write side: NEVER stores current state. Stores the SEQUENCE OF EVENTS that led to the current state.
  "Current state" is computed by replaying all historical events.
  
  Example:
    Command: "PlaceOrder {orderId, items}"
    Handler: validate → append OrderPlacedEvent to event store
    Current Order state = replay(OrderCreatedEvent, OrderItemAddedEvent, ..., OrderPlacedEvent)
    Projections: same as CQRS — update read models from events
  
  Advantages: full audit trail, time-travel queries ("what was the order state at 3pm yesterday?"),
  event replay for debugging or new feature rollout
  Trade-offs: complex to implement and query; aggregate loading requires replaying all events (mitigated by snapshots)

For most microservices use cases: use CQRS without Event Sourcing.
Add Event Sourcing only for audit-critical domains: financial transaction ledgers, healthcare records, compliance systems.
```

---

## 4. The Code

### Command Side — Handler and Domain Event Publication
```java
// Command Object
public record PlaceOrderCommand(
    String orderId,
    String userId,
    List<OrderItemRequest> items
) {}

// Command Handler — write side
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderCommandHandler {

    private final OrderRepository orderRepository;
    private final OutboxEventRepository outboxRepo;  // Outbox for reliable event publication
    private final ObjectMapper objectMapper;

    @Transactional
    public void handle(PlaceOrderCommand cmd) {
        // Business validation
        if (cmd.items().isEmpty()) {
            throw new InvalidOrderException("Order must have at least one item");
        }

        // Write to normalised orders/order_items tables (write model)
        Order order = new Order(cmd.orderId(), cmd.userId(), OrderStatus.PLACED);
        cmd.items().forEach(item -> order.addItem(new OrderItem(item.productId(), item.qty(), item.price())));
        orderRepository.save(order);

        // Publish domain event via outbox
        OrderPlacedEvent event = new OrderPlacedEvent(
            cmd.orderId(), cmd.userId(),
            cmd.items().stream()
               .map(i -> new ItemSummary(i.productId(), i.qty(), i.price()))
               .toList(),
            order.getTotal()
        );
        outboxRepo.save(new OutboxEvent("OrderPlaced", "Order", cmd.orderId(), serialize(event)));

        log.info("Order command handled: orderId={}", cmd.orderId());
        // TX commits: order rows + outbox event row committed atomically
    }

    private String serialize(Object o) {
        try { return objectMapper.writeValueAsString(o); }
        catch (JsonProcessingException e) { throw new RuntimeException(e); }
    }
}

// REST Controller — routes commands
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderCommandController {

    private final OrderCommandHandler commandHandler;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void placeOrder(@Valid @RequestBody PlaceOrderCommand command) {
        commandHandler.handle(command);
        // DO NOT return the full order from this endpoint — that's a query operation
        // Return 201 Created with Location header pointing to the query endpoint
    }
}
```

### Query Side — Read Model and Projection
```java
// READ MODEL — denormalised, optimised for "My Orders" page query
@Entity
@Table(name = "user_orders_view")
@Data
public class UserOrderView {
    @Id
    private String orderId;
    private String userId;
    private String status;
    private BigDecimal total;
    private String itemsSummary;  // pre-computed: "Nike Air Max ×2, Levi's 511 ×1"
    private String firstItemImageUrl;  // thumbnail for display
    private Instant createdAt;
    private Instant updatedAt;
    // No JOINs needed when querying — all data pre-prepared in this denormalised table
}

// PROJECTION — maintains the read model based on events
@Component
@RequiredArgsConstructor
@Slf4j
public class UserOrderViewProjection {

    private final UserOrderViewRepository viewRepository;
    private final ProductDetailsClient productClient;  // fetches product names/thumbnails

    @KafkaListener(topics = "order-events", groupId = "cqrs-order-projection")
    @Transactional
    public void on(OrderPlacedEvent event, Acknowledgment ack) {
        // Look up product details to build the denormalised summary
        // (projection enriches data — queries don't need to)
        List<String> itemDescriptions = event.items().stream()
            .map(item -> {
                String productName = productClient.getName(item.productId());
                return productName + " ×" + item.qty();
            })
            .toList();

        String summary = String.join(", ", itemDescriptions);
        String thumbnail = productClient.getThumbnailUrl(event.items().get(0).productId());

        UserOrderView view = new UserOrderView();
        view.setOrderId(event.orderId());
        view.setUserId(event.userId());
        view.setStatus("PLACED");
        view.setTotal(event.total());
        view.setItemsSummary(summary);
        view.setFirstItemImageUrl(thumbnail);
        view.setCreatedAt(Instant.now());
        viewRepository.save(view);

        ack.acknowledge();
        log.info("UserOrderView created for orderId={}", event.orderId());
    }

    @KafkaListener(topics = "order-events", groupId = "cqrs-order-projection")
    @Transactional
    public void on(OrderStatusUpdatedEvent event, Acknowledgment ack) {
        viewRepository.findById(event.orderId()).ifPresent(view -> {
            view.setStatus(event.newStatus());
            view.setUpdatedAt(Instant.now());
            viewRepository.save(view);
        });
        ack.acknowledge();
    }
}

// QUERY CONTROLLER — reads from the denormalised view
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderQueryController {

    private final UserOrderViewRepository userOrderViewRepository;

    // GET /api/v1/orders?userId=usr-42 → instant, single-table query, no JOINs
    @GetMapping
    public List<UserOrderView> getMyOrders(
            @RequestParam String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return userOrderViewRepository
            .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is CQRS and why use it?"

**Hruday's answer:**
> CQRS stands for Command Query Responsibility Segregation. The core idea is to use different models for write operations and read operations, rather than forcing a single domain model to serve both purposes.
>
> The motivation: writes need normalised, constrained, transactionally consistent data models. Reads need pre-joined, denormalised, query-optimised data. A model designed for safe writes — with foreign key constraints, normalised tables, business rule validation — is a poor fit for fast reads that need data from 5 tables joined together with aggregated fields.
>
> With CQRS: when an order is placed, the command handler writes to normalised orders and order_items tables (the write model). It also publishes an OrderPlaced event. A projection consumes that event and builds a denormalised user_orders_view table with all the data the "My Orders" page needs — pre-joined, pre-summarised. The query endpoint reads directly from that denormalised view in a single table scan with no runtime JOINs.
>
> The result: reads are extremely fast because the query-time work has been done at event-processing time. The write model stays clean and transaction-safe. Each side can be scaled independently — more replicas of the read database if read load spikes; scale writes independently.

---

### Q2 — Consistency Model
**Interviewer asks:** "When you place an order and then immediately query your orders list, will you see the new order?"

**Hruday's answer:**
> Not necessarily immediately — and that's a known trade-off of CQRS. The read model is eventually consistent with the write model. When the command handler places the order, it commits to the write database and publishes an event. The projection processes that event and updates the read model. If you query the "My Orders" list 50ms after placing the order, you might hit the query endpoint before the projection has processed the event — you see the old list.
>
> Handling this in the UI: two options. First, optimistic UI updates — the frontend knows the order was successfully placed (the POST returned 201), so it immediately renders the new order in the orders list based on the data it just sent, without waiting for the read model. The background eventually-consistent state catches up silently.
>
> Second, read-your-own-writes provision: after placing an order, the command response includes the orderId. The orders list UI can separately query GET /orders/{orderId} which hits the write model directly — that one is strongly consistent. Use eventually consistent for list views, strongly consistent for direct ID lookups immediately after write.
>
> The key is to design the system with this trade-off acknowledged upfront — not to pretend CQRS read models are synchronously consistent. They aren't, and that's fine for most use cases.

---

### Q3 — When NOT to Use CQRS
**Interviewer asks:** "Would you apply CQRS to every microservice?"

**Hruday's answer:**
> No — CQRS adds complexity: separate models, event flows, projection maintenance, eventual consistency to manage. For simple CRUD services where the write model IS the read model — basic admin panels, internal configuration management, small reference data services — CQRS is over-engineering.
>
> I apply CQRS when the read and write requirements are genuinely different enough to warrant it. The signals: the service has 3+ distinct read patterns with different data shapes (list view, detail view, search, analytics); the query performance of the write model is becoming a problem (complex JOINs, full-table scans for aggregates); the read and write volumes are significantly different (10x more reads than writes) and need to scale independently; or an audit trail of state changes is required.
>
> The classic CQRS candidates: order management (as I described — list view, detail view, search, analytics are all different shapes), user profiles with social features (feed generation requires separate denormalised read models), and financial transaction history (detailed ledger with pre-computed balances).
>
> For a service managing 5 configuration keys that are read 100 times a day and written twice: a single @Repository with a simple table is the right answer.

---

### Q4 — Rebuilding Projections
**Interviewer asks:** "What happens if you need to add a new field to your read model?"

**Hruday's answer:**
> This is one of the key operational aspects of CQRS. The read model is built by replaying events through projections. If I need to add a "coupon_code" field to the user_orders_view read model, I need to rebuild that projection.
>
> The process: first, I update the projection handler to extract coupon_code from OrderPlacedEvents. Then I deploy the new projection. Because existing rows in the user_orders_view don't have coupon_code, I need to replay all historical OrderPlaced events to backfill the data.
>
> Event replay means the projection reads all historical OrderPlaced events from Kafka (Kafka retains events based on configured retention) or from an event store if I'm using Event Sourcing. The projection re-processes each event and upserts the read model rows.
>
> For zero-downtime during replay: use the blue-green approach for the read model — build the new read model in a separate table (user_orders_view_v2) while keeping the old one serving traffic. Once replay is complete and the new projection is caught up, switch the query endpoint to the new table and drop the old one.
>
> This ability to rebuild read models from historical events is a significant operational advantage of CQRS — your stored events are the ground truth, and you can always derive any read model you want from them. It's a one-way door: if you have the events, you can always create new views. If you only have the denormalised view, you can't get the original events back.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "CQRS = separate read/write databases" | "CQRS means you have one database for writes and another for reads" | "Separate databases is a possible implementation, but CQRS is about separate MODELS, not separate databases. You can implement CQRS with the write model and read model tables in the same PostgreSQL database — two tables with different schemas, maintained by different handlers. Separate databases become relevant when the read model needs a completely different storage engine (Elasticsearch for full-text search, Redis for caching, Timescale for analytics)." |
| "CQRS = Event Sourcing" | "CQRS means you store all events instead of current state" | "Event Sourcing is a separate pattern from CQRS. Event Sourcing stores state as an append-only log of events and computes current state by replaying. CQRS just separates read and write models. You can have CQRS with a normal relational write model (stores current state) and denormalised read model tables. Combining both is possible and has advantages, but they're independent concepts. Conflating them confuses the architecture discussion." |
| "The command should return the updated object" | "POST /orders should return the full order JSON" | "The command side's job is to change state and return a success/failure signal (HTTP 201 with a Location header pointing to the query endpoint). The command handler doesn't know the read model's structure — that's the query side's concern. Returning the full object from the command side couples the two models and defeats the separation. The client should follow the Location header to GET the freshly placed order from the query side." |
| "CQRS handles all the complexity automatically" | "CQRS with Axon Framework or EventStoreDB handles this for me" | "Frameworks help with boilerplate but the operational complexity of CQRS is in projection design, eventual consistency management, and event schema evolution. A framework won't tell you when a projection event handler is falling behind, what to do when an event has a schema that changed, or how to rebuild a projection with zero downtime. These require deliberate design choices that are architecture decisions, not framework decisions." |

---

## 7. Hruday's Real Experience Hook

> "SAP's Report programs — the R in ABAP's report programs — are historically the read side of a CQRS-like design, though it wasn't called that. SAP's transactional tables (EKKO/EKPO for purchase orders, BSEG for accounting entries) are write-optimised relational tables maintained by transactional ABAP programs. SAP's BW (Business Warehouse) system is a completely separate datastore with denormalised, pre-aggregated InfoCubes — the read side, built by extracting deltas from the transactional tables. The delta extraction and InfoCube loading is exactly a projection: 'as the transactional tables change, update the read model.' Understanding this helped me see CQRS not as a new concept but as a formalisation of a pattern I'd seen in production at enterprise scale."

---

## 8. Scale Evolution

**Single table, no CQRS:** Read and write queries both hit the same normalised tables. Fine for low volume.

**Read replicas + read model in same DB:** Add a denormalised read model table in the same database, maintained by simple triggers or application post-write logic. First step toward CQRS without separate infrastructure.

**Full CQRS with event-driven projections:** Command side publishes events (via Outbox + Kafka). Multiple projections maintain specialised read model tables. Read side reads from projections only.

**Specialised read stores:** Add Elasticsearch for search projection, Redis for hot/recent order caching projection, Timescale for analytics projection. Each query pattern uses the optimal storage technology, all fed from the same event stream.

**Event Sourcing layer:** Store all commands as events in an event store (Axon EventStoreDB, or Kafka with infinite retention). Projections are rebuilt from these events on demand. Full audit trail and time-travel queries available for compliance-sensitive data.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment transaction history: write-optimised for the transaction processor; read-optimised for dashboards (merchant analytics), user history, and statement generation — clearly different models. | "How would you design the transaction history system for 10M daily transactions?" |
| Swiggy / Meesho | Order tracking: write model for saga state transitions; read models for user app (simplified), delivery partner app (location + items), admin dashboard (all details), analytics (aggregated). Four consumers, one write source. | "Design the order tracking system where users, drivers, and ops all need different views." |
| Adobe / Microsoft | Creative Cloud usage analytics: write model (event ingestion), read models (user dashboard, product analytics, compliance reports). CQRS is standard for high-volume telemetry + analytics pipelines. | "How would you design the usage tracking system for Creative Cloud?" |
| Amazon | Amazon's "My Orders" page is a classic CQRS read model: a denormalised pre-aggregated view of orders built from order event streams, not a live JOIN against the order processing system. | "How does Amazon serve 'My Orders' at scale without hitting the order processing database directly?" |

---

## 10. Related Topics — What to Study Next

- **Topic 79 — Outbox Pattern** — the reliable event publication mechanism that feeds events from the command side to the projections on the query side; without the Outbox, CQRS projections can miss events
- **Topic 76 — Saga Pattern** — CQRS and Saga are complementary; Sagas coordinate distributed state transitions (command side) and CQRS provides optimised read models that the UI queries to show progress
- **Topic 78 — Eventual Consistency** — the consistency model the CQRS query side operates under; understanding what eventual consistency means for read model freshness is essential for designing correct CQRS systems
- **Topic 67 — Kafka and Asynchronous Communication** — the event bus connecting command side to query side projections; Kafka's consumer group offsets, consumer lag monitoring, and offset management are critical operational concerns for projection reliability

---

*Part 4 · CQRS — Command Query Responsibility Segregation · Full Stack Interview Guide · Hruday D · 2026*
