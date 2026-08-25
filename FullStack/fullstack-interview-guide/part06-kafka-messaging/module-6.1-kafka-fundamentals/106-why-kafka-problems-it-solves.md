# Why Kafka — Problems It Solves
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Kafka is a distributed, persistent event streaming platform. It solves three core problems: (1) **decoupling** — services communicate without knowing about each other; (2) **durability** — events are stored on disk and can be replayed; (3) **scale** — millions of events per second handled by partitioning across multiple machines.
- The fundamental model: producers write events to named **topics**. Kafka stores them on disk in order. Consumers read from topics at their own pace — they control when they read, from what point they read, and can replay past events. This is the key difference from REST: Kafka is asynchronous, producers never wait for consumers.
- Why not a database? A database stores state. Kafka stores what happened (events). Why not a message queue (RabbitMQ)? RabbitMQ deletes messages after consumption. Kafka retains them for configurable days/weeks, allowing multiple consumers to read independently and replay from the past.
- The three problems Kafka solves that nothing else solves as cleanly: event replay (re-process historical events after a bug fix), fan-out without coupling (one event → many independent consumers, producer knows none of them), and decoupled scale (producer and consumer scale independently — consumer can be slow without affecting producer).
- Gap to bridge: this is marked 🆕 for Hruday — Kafka is the most critical gap to demonstrate in senior interviews. Interviewers at Swiggy, Razorpay, and PhonePe treat Kafka as expected knowledge. Not knowing "why Kafka over REST for event-driven systems" immediately signals a gap in distributed systems experience.

---

## 1. One-Line Definition
Apache Kafka is a distributed, durable event log that allows producers to write events without waiting for consumers, consumers to read at their own pace from any point in history, and multiple independent services to react to the same events without coupling to each other.

---

## 2. The Problem It Solves

Picture a food delivery app. When an order is placed, 8 different things need to happen: (1) confirm the order, (2) notify the restaurant, (3) assign a driver, (4) notify the customer, (5) deduct inventory, (6) charge the customer, (7) update the analytics dashboard, and (8) start the fraud detection check.

The naive approach is synchronous: the Order Service calls each of the 8 downstream services via REST before returning. Problems: the order confirmation takes 8x longer (serial calls). If the Analytics Service is slow, the customer's confirmation is delayed. If the Fraud Detection Service is down, the whole order fails. The Order Service now depends on 8 other services to complete its own job.

This is the coupling problem. "The Order Service knows too much about the rest of the system." Every time you add a new step, you modify the Order Service. Every downstream service failure causes order failures.

Kafka solves this with event-driven decoupling: the Order Service publishes ONE event: `order.placed {orderId, customerId, items, total}`. Then it returns immediately. Kafka stores this event. Each of the 8 downstream services has its own consumer that reads `order.placed` events and does its work independently. The Restaurant Notification Service doesn't know the Analytics Service exists. The Order Service doesn't know any of them exist.

The second problem: what if the Analytics Service was down for 2 hours? With REST: those 2 hours of events are lost. With Kafka: the events are stored on disk. When Analytics comes back, it reads from where it left off and catches up. No data loss. No manual re-processing.

The third problem: at 100,000 orders per hour, a synchronous chain of 8 REST calls blows up. Kafka's commit log and parallel consumer groups allow you to process millions of events per second without any service waiting on any other.

---

## 3. How It Works Internally

### The Mental Model
Think of Kafka as a newspaper. The newspaper publishes one edition per day (events). Anyone who subscribes gets their own copy. The newspaper doesn't care who reads it or when. If you go on holiday for two weeks (consumer was down), you can buy all 14 back issues and catch up from where you left off. Meanwhile, new issues keep being printed. New subscribers start reading from today's issue; old subscribers can request back issues from any date.

This is fundamentally different from a phone call (REST API, synchronous — caller waits for receiver) and from a Post Office (RabbitMQ — message delivered once and then gone).

### Kafka Architecture — Core Components

```
COMPONENTS:
────────────────────────────────────────────────────────────────────────────────

TOPIC: A named category. Like a database table name, but for events.
  Example: "order.placed", "payment.processed", "user.registered"
  A topic can have multiple partitions for parallel processing.

PARTITION: A single ordered, immutable log. Events are appended at the end.
  Each partition is stored as a sequence of files on disk.
  Events in a partition have monotonically increasing offsets (0, 1, 2, 3...).
  ORDER IS GUARANTEED within a partition. Not across partitions.
  Partition count = parallelism ceiling for consumers in a group.

BROKER: A Kafka server. A cluster has multiple brokers (usually 3).
  Each broker holds some partitions on its disk.
  Each partition has one leader broker and N-1 follower brokers (replicas).
  Writes go to the leader. Followers replicate. On leader failure: a follower
  is elected leader. No data loss (with acks=all configured).

PRODUCER: Writes events to a topic.
  Decides which partition to write to (by key hash, round-robin, or custom).
  Does NOT wait for consumers. Returns after Kafka acknowledges.

CONSUMER GROUP: One or more consumers that share the work of reading a topic.
  Kafka assigns each partition to exactly ONE consumer in a group.
  Multiple groups → each group gets ALL events independently (fan-out).
  Consumers track their position using offsets stored in Kafka itself.

ZooKeeper / KRaft: cluster metadata management (KRaft replaces ZooKeeper in Kafka 3+)
```

### Kafka vs REST vs RabbitMQ — Key Differences

```
FEATURE              REST API         RabbitMQ         Kafka
─────────────────────────────────────────────────────────────────────
Communication style  Synchronous      Async            Async
Producer waits?      Yes              No               No
Message persistence  No               Optional         Yes (disk, days)
Message replay       No               No               Yes (rewind offset)
# of consumers/msg   1                1 per queue      Unlimited groups
Ordering guarantee   n/a              per queue        per partition
Throughput           Medium           High             Very high
Use case             Request-reply    Task queues      Event streaming
Max fanout           1 recipient      Explicit fanout  Unlimited groups
Scale how            Load balancer    Queue consumers  Add partitions
```

### Why Kafka Over RabbitMQ for Event Streaming

```
PRIMARY DIFFERENCE: Deletion policy

  RabbitMQ: deletes a message after it is acknowledged by the consumer.
  Kafka: retains messages for a configured time (default 7 days), regardless.

  CONSEQUENCE of RabbitMQ deletion:
  - Only one consumer (per queue binding) receives each message.
  - Replay is impossible — once consumed, the message is gone.
  - New services that join cannot read past events.

  CONSEQUENCE of Kafka retention:
  - Unlimited consumer groups each read every message independently.
  - New Analytics Service can be deployed and reads ALL past events
    from the beginning of the retention window.
  - Bug in the Payment Service? Fix it, roll back the consumer offset,
    re-process every affected event. This is impossible with RabbitMQ.
  - Event-sourcing: the Kafka topic IS the authoritative history.
```

### ASCII Diagram — Event-Driven Decoupling

```
WITHOUT KAFKA (synchronous coupling):

Order Service ──►─ REST ──► Restaurant Service  (200ms)
              ──►─ REST ──► Driver Assignment    (150ms)
              ──►─ REST ──► Customer Notify     (100ms)
              ──►─ REST ──► Inventory Update     (80ms)
              ──►─ REST ──► Payment Charge       (500ms)
              ──►─ REST ──► Analytics Update     (50ms)
              ──►─ REST ──► Fraud Detection     (200ms)
              ──►─ REST ──► Email Service        (120ms)

Total latency to confirm order: ~1400ms serial chain
One downstream failure = order API fails
Adding new step = modify Order Service

─────────────────────────────────────────────────────────────

WITH KAFKA (event-driven decoupling):

Order Service ─► PUBLISH "order.placed" to Kafka ─► returns 50ms

Kafka Topic: "order.placed" (stored on disk, replays forever)
    ↓ (async, each at own pace)
  Consumer Group A: Restaurant Service
  Consumer Group B: Driver Assignment Service
  Consumer Group C: Customer Notification Service
  Consumer Group D: Inventory Service
  Consumer Group E: Payment Service
  Consumer Group F: Analytics Service (was down 2h → catches up on restart)
  Consumer Group G: Fraud Detection Service
  Consumer Group H: Email Service (added 6 months later → reads from beginning)

Order confirmation: 50ms
Any consumer failure: other consumers unaffected
Adding new consumer: zero changes to Order Service
Consumer was down: replays missed events automatically
```

---

## 4. The Code

### Wrong Way — Synchronous Chain (The Problem Kafka Solves)

```java
// Wrong: Order Service calling every downstream service synchronously
@PostMapping("/orders")
public ResponseEntity<Order> placeOrder(@RequestBody OrderRequest request) {
    Order order = orderRepository.save(new Order(request));

    // Any of these REST calls failing = the whole order API fails
    // Total latency = sum of all service calls
    // Order Service now tightly coupled to 4 other services
    restaurantClient.notifyNewOrder(order);       // 200ms
    driverService.requestAssignment(order);        // 150ms
    notificationService.sendOrderConfirmed(order); // 100ms
    paymentService.chargeCustomer(order);          // 500ms

    return ResponseEntity.ok(order);
    // Total: ~1950ms. One service down = order confirmation fails.
}
```
> **Why this fails in production:** A temporary Payment Service hiccup causes all order confirmations to fail. Every new business step requires modifying this method. The more service calls added, the longer the confirmation takes. Zero resilience, maximum coupling.

### Right Way — Kafka Event Publishing

```java
// pom.xml:
// <dependency>
//   <groupId>org.springframework.kafka</groupId>
//   <artifactId>spring-kafka</artifactId>
// </dependency>

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate;

    @Transactional
    public Order placeOrder(OrderRequest request) {
        // 1. Save order to database
        Order order = orderRepository.save(new Order(request));

        // 2. Publish one event to Kafka — does NOT wait for consumers
        //    orderId as the message key → all events for this order
        //    go to the same partition → ordering guaranteed per order
        OrderPlacedEvent event = new OrderPlacedEvent(
            order.getId(),
            order.getCustomerId(),
            order.getItems(),
            order.getTotal(),
            Instant.now()
        );

        kafkaTemplate.send("order.placed", order.getId().toString(), event);

        // 3. Return confirmed immediately — consumers process in background
        return order;
        // Total: ~50-100ms. Consumer failures don't affect this response.
        // Adding new consumer = zero changes to this class.
    }
}

// Any service can now independently consume this event:
@Component
public class RestaurantNotificationConsumer {

    @KafkaListener(topics = "order.placed", groupId = "restaurant-service")
    public void onOrderPlaced(OrderPlacedEvent event) {
        // Runs independently, at its own pace, without blocking Order Service
        restaurantService.notifyNewOrder(event);
    }
}

@Component
public class FraudDetectionConsumer {

    // Added 6 months later — reads ALL past events from retention window
    @KafkaListener(topics = "order.placed", groupId = "fraud-detection")
    public void analyseOrder(OrderPlacedEvent event) {
        fraudService.analyse(event);
    }
}
```

### Configuration — application.yml

```yaml
spring:
  kafka:
    bootstrap-servers: kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092

    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      # acks=all: wait for all in-sync replicas to confirm write → no data loss on broker failure
      acks: all
      # retries: retry on transient network errors
      retries: 3

    consumer:
      group-id: order-service
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      # earliest: new consumer group reads from the beginning (replay all)
      # latest: start from now (skip history)
      auto-offset-reset: earliest
      # Don't auto-commit — commit manually after successful processing
      enable-auto-commit: false
```

> **Key decisions here:**
> - Use `order.getId().toString()` as the message key — all events for the same order go to the same partition (guaranteed order per order)
> - `acks=all` on the producer — wait for all replicas to acknowledge before returning; prevents data loss on broker failure
> - `enable-auto-commit: false` — manual offset commit after successful processing; prevents losing events if consumer crashes before processing

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What problem does Kafka solve that a REST API cannot?"

**Hruday's answer:**
> Kafka solves three problems that REST cannot handle well.
>
> First: decoupling. With REST, the producer and consumer must both be up simultaneously. Kafka lets a producer publish events without the consumer being available. The consumer processes when it's ready. The Order Service doesn't even know who the consumers are — it just publishes an event and returns.
>
> Second: fan-out. With REST, a producer calls one endpoint. To notify 8 services, it needs 8 REST calls. With Kafka, the producer publishes one event. Any number of consumer groups can independently subscribe to that topic. Adding a new consumer never touches the producer.
>
> Third: durability and replay. REST has no memory — if the consumer misses a call, the data is gone. Kafka stores events on disk for a configurable retention period — days, weeks, or forever with compaction. A consumer that was down for hours catches up by reading from its last committed offset. A new service can onboard and read all past events to build its initial state.
>
> In summary: REST is request-reply — one caller, one receiver, synchronous. Kafka is event streaming — one publisher, unlimited subscribers, asynchronous, replayable.

---

### Q2 — Deep Dive
**Interviewer asks:** "What makes Kafka faster than traditional message queues at very high throughput?"

**Hruday's answer:**
> Kafka achieves high throughput through four specific design choices.
>
> First: sequential disk writes. Every event is appended to the end of a partition log — this is a sequential write. On modern SSDs and even spinning disks, sequential writes are orders of magnitude faster than random writes. Traditional databases and some message queues do random writes. Kafka's append-only log turns the slowest I/O operation into the fastest one.
>
> Second: zero-copy reads. When consumers read events, Kafka uses the OS `sendfile()` syscall to transfer data directly from the disk page cache to the network socket without copying it into application memory. This bypasses the CPU entirely for data transfer — the data moves from disk to network purely via the OS kernel and DMA.
>
> Third: batching. Kafka producers buffer multiple events and send them in a single batch request. Consumers also read in batches. This amortises the per-message overhead of network round trips across thousands of messages per batch.
>
> Fourth: partitioning for parallel I/O. A topic with 10 partitions can have 10 consumers in a group, each reading from their assigned partition in parallel. This means consumer throughput scales linearly with partition count. Adding more partitions = more parallel readers.
>
> Combined: a single Kafka broker can handle hundreds of thousands of events per second. Industry benchmarks show millions of events per second per cluster.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you choose RabbitMQ over Kafka?"

**Hruday's answer:**
> RabbitMQ is a better choice than Kafka for task queues where message delivery to exactly one worker matters, where work items should be distributed across workers (not broadcast), and where you don't need replay or multiple independent consumers.
>
> The classic RabbitMQ use case: image processing queue. Users upload images. Workers resize them. Each image should be processed exactly once by exactly one worker. RabbitMQ pushes each message to one worker and deletes it after acknowledgement. This is exactly the Push model RabbitMQ is designed for.
>
> Kafka is a pull model — consumers pull at their own pace. This is better for high-throughput streams but adds complexity for simple task queues. Kafka doesn't delete messages, so "exactly one worker processes this" requires consumer group partitioning discipline that's more complex to reason about than RabbitMQ's simple push-and-ack.
>
> Also: RabbitMQ supports flexible routing with exchanges — Topic, Fanout, Direct, Headers — that let you express complex message routing rules declaratively. Kafka's routing is purely by partition key.
>
> My decision rule: if I need replay, multiple independent consumer groups, event sourcing, or > 100K events/second → Kafka. If I need simple background task execution, complex routing rules, or task-queue semantics where messages are consumed once and deleted → RabbitMQ.

---

### Q4 — Scenario
**Interviewer asks:** "Design the event-driven architecture for a payment platform. Which events would you put on Kafka and which would you handle synchronously?"

**Hruday's answer:**
> I'd separate the synchronous path (time-critical, user-facing) from the asynchronous path (eventual processing, internal services).
>
> Synchronous: the actual payment authorisation. When a user clicks "Pay," the API synchronously calls the payment gateway — Razorpay, Stripe, the card network. This must be synchronous because the user is waiting for a success/failure response before completing checkout. There's no way to "fire and forget" a payment and tell the user "we'll confirm later." This is the core ACID transactional path.
>
> Everything else: async via Kafka. Once the payment is authorised (or declined), publish `payment.processed` to Kafka. Consumers: (1) Fraud detection — analyses patterns asynchronously; (2) Invoice generation — PDF created and stored; (3) Email notification — sends receipt; (4) Analytics service — updates realtime metrics; (5) Loyalty points service — credits reward points; (6) Audit log service — writes to immutable audit store.
>
> None of these need to block the user's checkout. If the email service is slow, the payment confirmation still completes in 300ms. If the analytics service is down, the other 5 consumers still process normally. The payment.processed event in Kafka stays for 7 days — the analytics service catches up when it comes back online.
>
> Additionally: `payment.failed` events for fraud pattern analysis and retry orchestration. `payment.refunded` for multi-step refund workflows via Saga pattern — each step is an event consumed by a different service.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Kafka is just a message queue" | "I'll use Kafka like RabbitMQ — produce, consume, done" | "Kafka is a commit log, not a traditional message queue. The fundamental difference: Kafka retains events after consumption. This enables replay, multiple consumer groups, and event sourcing — none of which RabbitMQ or JMS-style queues support. Treating Kafka like a queue (consuming once, never replaying) means you're ignoring 80% of its value. Design your consumers to be idempotent and replayable — take advantage of what Kafka actually is." |
| "Use Kafka for everything" | "We'll put all communication through Kafka including user login API" | "Kafka is asynchronous — it's wrong for request-reply interactions where the caller needs an immediate answer. User login, payment authorisation, search results — these require synchronous responses. Kafka is right for events that trigger downstream workflows where the initiating service doesn't need to wait: order placed, user registered, payment processed. The rule: if the caller needs a response from the receiver → REST or gRPC. If the caller just needs to notify others → Kafka." |
| "Order is always guaranteed across Kafka" | "Kafka guarantees event order" | "Kafka guarantees order WITHIN a partition, not across partitions. If a topic has 3 partitions, a consumer reading all 3 interleaves events in the order its reader gets them — not global timestamp order. For order guarantees, use a single partition (limits parallelism to 1) OR use a message key that routes all related events to the same partition (e.g., orderId as key routes all events for order 42 to the same partition). Know the scope of the guarantee when designing your system." |
| "Kafka handles exactly-once automatically" | "Kafka gives exactly-once delivery" | "Kafka offers exactly-once SEMANTICS (EOS) since version 0.11, but it requires explicit producer configuration — enable.idempotence=true and transactional.id set — AND consumers must also participate in the transaction. By default, Kafka is at-least-once: on consumer restart after a crash before committing, it reprocesses events. Your consumer logic must be idempotent (safe to process the same event twice) regardless of what delivery guarantee the broker provides." |

---

## 7. Hruday's Real Experience Hook

> "Kafka is a clear gap in my hands-on experience — I've designed with it conceptually but haven't built production Kafka pipelines yet. At SAP Labs, the closest equivalent was a polling mechanism for financial event processing — a service polling a status table every 30 seconds to trigger downstream tasks. That approach has all the problems Kafka solves: polling delay, tight coupling to the status table schema, and missed events when the poller was down during maintenance. In hindsight, publishing an event to Kafka at the point of financial document completion and having downstream processors consume at their own pace would eliminate the polling entirely. I'm actively bridging this gap through the Spring Kafka module in this prep guide."

---

## 8. Scale Evolution

**1,000 users →** Kafka might be overkill. A simple in-process event system (Spring's `ApplicationEventPublisher`) or a lightweight queue works. At this scale, complexity should match the problem. Kafka is worth the operational overhead from the start only if event replay or fan-out are immediate requirements.

**100,000 users →** Kafka starts paying dividends. Multiple independent services need to react to the same events. Downtime-resilient processing matters. A 3-broker cluster with 1 partition per topic handles this comfortably.

**10 million users →** Kafka is essential. Topics need multiple partitions for parallel consumer throughput. Events per second may reach hundreds of thousands. Producer and consumer lag monitoring is critical. Schema Registry with Avro prevents serialisation incompatibility across services as the schema evolves. Dead letter queues for un-processable events. Consumer group lag dashboards in Grafana. This is the production Kafka that Swiggy and Razorpay run.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Kafka is central to payment event processing: payment.initiated, payment.processed, payment.failed, payout.completed. Every system design interview here will ask about the event-driven architecture. | "Walk me through the event-driven architecture for processing a payment — from initiation to settlement. What's on Kafka?" |
| Swiggy / Meesho | Order lifecycle events (placed → restaurant accepted → driver assigned → picked up → delivered) drive the entire operations layer via Kafka. Real-time tracking, SLA monitoring, customer notifications — all Kafka consumers. | "How does Swiggy's order status update propagate from the restaurant app to the customer app? What are the events?" |
| Adobe / Microsoft | Large-batch document processing, user action event streams for analytics, audit event pipelines. Scale of creative cloud platform necessitates event-driven architecture. | "Design the event pipeline for tracking every user action in Creative Cloud for analytics and GDPR audit trails." |
| SAP Labs (current) | SAP has begun adopting event-driven architecture (SAP Event Mesh, Kafka). Financial document posting events that need to trigger downstream systems — approval workflows, reconciliation jobs, reporting. | "How would you redesign our current synchronous financial document processing to be event-driven and resilient to downstream service failures?" |

---

## 10. Related Topics — What to Study Next

- **Topic 107 — Kafka Topics, Partitions, Offsets, Consumer Groups** — the internal mechanics that make the architecture described here possible; the next mandatory topic in this module
- **Topic 67 — Asynchronous Communication via Kafka/RabbitMQ** — Part 4 coverage of async patterns including how Kafka fits into microservices architecture
- **Topic 79 — Outbox Pattern** — ensures events are published to Kafka reliably from transactional service methods; the standard pattern to prevent data loss at the producer
- **Topic 120 — At-Most-Once, At-Least-Once, Exactly-Once** — the formal vocabulary for Kafka delivery guarantees; critical for describing your architecture correctly in interviews

---

*Part 6 · Why Kafka — Problems It Solves · Full Stack Interview Guide · Hruday D · 2026*
