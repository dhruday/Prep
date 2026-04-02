# Kafka Streams Basics
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Kafka Streams is a **client library** (JAR) for stream processing. It runs INSIDE your Spring Boot service — there is no separate cluster to manage. It reads from Kafka input topics, processes the events (filter, transform, group, aggregate, join), and writes results to Kafka output topics.
- Two mental models: a **KStream** is an unbounded stream of events — every event is independent, like a stream of transactions. A **KTable** is a materialised view of the latest value per key — like a snapshot table, backed by a compacted Kafka topic. Joining KStream + KTable is joining "new event" + "current state" — the most common pattern.
- **Stateless operations**: `filter` (drop events that don't match), `map` (transform one event to another), `flatMap` (one event to many), `branch` (route to multiple streams). These need no state — just transform the record.
- **Stateful operations**: `groupByKey().count()`, `groupByKey().aggregate()` — need a **state store** to accumulate results. State stores are backed by RocksDB (local disk) and replicated via a Kafka changelog topic. This is how Kafka Streams recovers state after a restart.
- A **Topology** is the graph of operations connecting input topics → processors → output topics. Build it declaratively with Streams DSL (high-level). The Streams runtime handles partitioning, state management, offset commits, and fault recovery automatically.
- Gap to bridge: Kafka Streams is an active gap for Hruday. Most interviewers at companies with real-time analytics, fraud detection, or live dashboards (Razorpay, Swiggy, PhonePe) ask this. Knowing even the basics strongly differentiates candidates.

---

## 1. One-Line Definition
Kafka Streams is an embedded Java library for building real-time stream processing applications that read from Kafka topics, apply stateless or stateful transformations (filter, aggregate, join), and write results back to Kafka — with exactly-once semantics and automatic state recovery built in.

---

## 2. The Problem It Solves

You're building a real-time fraud detection system. Every payment event arrives on the `payment.processed` Kafka topic. The rule: if a user makes more than 5 payments in 60 seconds, flag it as suspicious.

**Without Kafka Streams:** Each payment event is consumed by a `@KafkaListener`. For each event: query Redis for "how many payments has this user made in the last 60 seconds?" → increment counter → if > 5: publish fraud alert. Problem: this requires 2 external I/O calls (Redis read + Redis write) per event. Under 100,000 events/sec: 200,000 Redis calls/sec. Expensive, and Redis becomes a bottleneck/single point of failure.

**With Kafka Streams:** Define a topology: read from `payment.processed` → group by userId → window by 60-second tumbling window → count events per window → filter where count > 5 → write to `fraud.alerts`. All the state (count per user per window) is stored locally in RocksDB on the service's disk, replicated to a Kafka changelog topic. No Redis needed. The stream processor does not leave the JVM boundary for state access — it's local disk I/O (microseconds) instead of network I/O (milliseconds).

This is the core Kafka Streams value proposition: **co-located state** — the processing logic and the state it needs live in the same JVM, eliminating the network hop to an external state store.

---

## 3. How It Works Internally

### Topology and Stream Graph

```
INPUT TOPICS          PROCESSORS              OUTPUT TOPICS
                                                
payment.processed ──► filter(amount > 0) ──► groupByKey
                                                   │
                                              count by window
                                                   │
                                              filter(count > 5)
                                                   │
                                         ──────────►  fraud.alerts

Each "box" is a Processor node in the topology graph.
Data flows as a continuous stream from left to right.
```

### KStream vs KTable — The Core Abstraction

```
KStream: a log of events (like a Kafka topic itself)
  - Every record is an independent event
  - Same key can appear multiple times
  - "userId:42 paid ₹500", "userId:42 paid ₹200", "userId:42 paid ₹800"
  - Reading from the beginning gives you the full history
  - Use for: transactions, clicks, log entries, notifications

KTable: the latest snapshot per key (like a database table)
  - Only ONE record per key at any time
  - New record for a key REPLACES the old one
  - "userId:42 → currentBalance:₹12,000"
  - Updated when a new event for that key arrives
  - Backed by a compacted Kafka topic (Topic 110)
  - Use for: user profiles, account balances, product inventory counts

KStream + KTable JOIN — the most powerful pattern:
  - "New payment event for userId:42" (KStream)
    JOIN
  - "userId:42's current account balance" (KTable)
  → result: payment event enriched with account status
  
  This join is: for each new event in the KStream, look up the CURRENT state
  from the KTable. Non-blocking — KTable is local state, no network call.
```

### State Stores and Fault Tolerance

```
When you call groupByKey().count() or .aggregate():
Kafka Streams needs to store running totals somewhere.
  
LOCAL STATE STORE:
  - RocksDB instance on the service's local disk
  - Extremely fast (local SSD I/O, microseconds)
  - Holds the current count/aggregate per key
  
CHANGELOG TOPIC:
  - Kafka topic: "{applicationId}-{storeName}-changelog"
  - Every state update is published here (write-ahead log pattern)
  - Allows complete state rebuild after crash:
    - Service restarts → reads changelog topic from beginning → rebuilds RocksDB
    - Other instances take over partitions immediately
  
RECOVERY FLOW:
  Service A crashes (had partition 0-3 state)
  → Kafka detects consumer failure → triggers rebalance
  → Service B assigned partitions 0-3
  → Service B reads "{app}-count-store-changelog" for partitions 0-3
  → Rebuilds RocksDB state from changelog
  → Begins processing new events (state is consistent with pre-crash state)
```

### Windowing — Time-Based Aggregations

```
TUMBLING WINDOW:  non-overlapping fixed-length windows
  |___10min___|___10min___|___10min___|
  Events in window 1 are NOT in window 2.
  Use: count events per 10-minute period.

HOPPING WINDOW:  overlapping windows
  |___10min___|
       |___10min___|
            |___10min___|
  Hop = 5 min, window = 10 min → events appear in 2 windows.
  Use: rolling averages.

SESSION WINDOW:  gaps define window boundaries
  Activity──activity──INACTIVITY(5min)──close window
  New activity = new session.
  Use: user session analytics, gap-based grouping.
```

---

## 4. The Code

### Maven Dependency

```xml
<dependency>
    <groupId>org.apache.kafka</groupId>
    <artifactId>kafka-streams</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

### Enable Kafka Streams in Spring Boot

```java
@SpringBootApplication
@EnableKafkaStreams  // enables Kafka Streams auto-configuration
public class FraudDetectionApplication {
    public static void main(String[] args) {
        SpringApplication.run(FraudDetectionApplication.class, args);
    }
}
```

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    streams:
      application-id: fraud-detection-app   # consumer group ID AND state store prefix
      default-key-serde: org.apache.kafka.common.serialization.Serdes$StringSerde
      default-value-serde: org.springframework.kafka.support.serializer.JsonSerde
      replication-factor: 3
      # Exactly-once semantics for stream processing
      properties:
        processing.guarantee: exactly_once_v2  # Kafka 2.5+
        commit.interval.ms: 100   # flush state to changelog every 100ms
```

### Stateless Topology — Filter and Transform

```java
// ❌ WRONG WAY: Using @KafkaListener for event transformations
// Reads from topic A, processes, manually publishes to topic B
// No composable pipeline — just two separate listeners with a dependency
@KafkaListener(topics = "order.placed", groupId = "transform-group")
public void handle(OrderPlacedEvent event, Acknowledgment ack) {
    if (event.getAmount() > 0) {
        NotificationEvent notification = NotificationEvent.from(event);
        kafkaTemplate.send("order.notifications", notification);
    }
    ack.acknowledge();
}
```

```java
// ✅ RIGHT WAY: Kafka Streams DSL — declarative pipeline
@Configuration
public class OrderNotificationTopology {

    @Bean
    public KStream<String, OrderPlacedEvent> orderNotificationStream(StreamsBuilder builder) {

        // Read from input topic (KStream of OrderPlacedEvents)
        KStream<String, OrderPlacedEvent> orders =
            builder.stream("order.placed",
                Consumed.with(Serdes.String(),
                    new JsonSerde<>(OrderPlacedEvent.class)));

        orders
            // Filter: only process orders with positive amount (defensive)
            .filter((orderId, event) -> event.getAmount() > 0)

            // Filter: only COD or PREPAID — skip CANCELLED
            .filter((orderId, event) ->
                Set.of("COD", "PREPAID").contains(event.getPaymentMethod()))

            // Map: transform OrderPlacedEvent → NotificationEvent
            .mapValues(event -> NotificationEvent.builder()
                .userId(event.getUserId())
                .message("Your order " + event.getOrderId() + " has been placed!")
                .channel("PUSH")
                .build())

            // Write to output topic
            .to("order.notifications",
                Produced.with(Serdes.String(),
                    new JsonSerde<>(NotificationEvent.class)));

        return orders;
    }
}
```

### Stateful Topology — Real-Time Fraud Detection

```java
@Configuration
public class FraudDetectionTopology {

    private static final String INPUT_TOPIC  = "payment.processed";
    private static final String OUTPUT_TOPIC = "fraud.alerts";
    private static final int    FRAUD_THRESHOLD = 5;

    @Bean
    public KStream<String, PaymentEvent> fraudDetectionStream(StreamsBuilder builder) {

        KStream<String, PaymentEvent> payments =
            builder.stream(INPUT_TOPIC,
                Consumed.with(Serdes.String(), new JsonSerde<>(PaymentEvent.class)));

        // Step 1: Group by userId (key)
        KGroupedStream<String, PaymentEvent> groupedByUser =
            payments.groupByKey(
                Grouped.with(Serdes.String(), new JsonSerde<>(PaymentEvent.class)));

        // Step 2: Count events in 60-second tumbling windows
        // State automatically stored in RocksDB, replicated to changelog topic
        KTable<Windowed<String>, Long> paymentCountsPerWindow = groupedByUser
            .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofSeconds(60)))
            .count(Materialized.as("payment-count-store"));  // named state store

        // Step 3: Filter windows where count > FRAUD_THRESHOLD
        paymentCountsPerWindow
            .toStream()
            // Windowed key: suppress until window is fully closed
            .filter((windowedKey, count) -> count > FRAUD_THRESHOLD)
            // Map to fraud alert event
            .map((windowedKey, count) -> KeyValue.pair(
                windowedKey.key(),  // userId as key
                FraudAlertEvent.builder()
                    .userId(windowedKey.key())
                    .paymentCount(count)
                    .windowStart(windowedKey.window().startTime())
                    .windowEnd(windowedKey.window().endTime())
                    .reason("Too many payments in 60 seconds: " + count)
                    .build()
            ))
            // Write fraud alerts to output topic
            .to(OUTPUT_TOPIC,
                Produced.with(Serdes.String(), new JsonSerde<>(FraudAlertEvent.class)));

        return payments;
    }
}
```

### KStream + KTable Join — Enrichment Pattern

```java
@Configuration
public class PaymentEnrichmentTopology {

    @Bean
    public KStream<String, EnrichedPaymentEvent> enrichmentStream(StreamsBuilder builder) {

        // KStream: incoming payment events (key = userId)
        KStream<String, PaymentEvent> payments =
            builder.stream("payment.processed",
                Consumed.with(Serdes.String(), new JsonSerde<>(PaymentEvent.class)));

        // KTable: current user profiles (key = userId, value = UserProfile)
        // Backed by a compacted topic — latest profile per userId
        KTable<String, UserProfile> userProfiles =
            builder.table("user.profile.current",
                Consumed.with(Serdes.String(), new JsonSerde<>(UserProfile.class)));

        // Join: for each payment event, look up the user's CURRENT profile
        // No network call — KTable state is local (RocksDB)
        return payments.join(
            userProfiles,
            // Joiner: combine payment + profile into enriched event
            (payment, profile) -> EnrichedPaymentEvent.builder()
                .paymentId(payment.getPaymentId())
                .amount(payment.getAmount())
                .userId(profile.getUserId())
                .userTier(profile.getTier())           // "GOLD", "SILVER", "BASIC"
                .userEmail(profile.getEmail())         // for notification
                .riskScore(profile.getRiskScore())     // for downstream fraud scoring
                .build(),
            Joined.with(Serdes.String(),
                new JsonSerde<>(PaymentEvent.class),
                new JsonSerde<>(UserProfile.class))
        );
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Kafka Streams and how is it different from a regular Kafka consumer?"

**Hruday's answer:**
> A regular Kafka consumer — like `@KafkaListener` — reads one event at a time, runs business logic, and publishes results manually. It's imperative: pull event, process, push output, commit offset. If you need state (like how many times a user triggered an event in the last minute), you manage that state yourself — typically via Redis or a database.
>
> Kafka Streams is a library for building stream processing pipelines declaratively. You define a topology: "read from topic A, filter, aggregate, write to topic B." State is managed automatically by the library — stored in local RocksDB, replicated to Kafka changelog topics for fault tolerance. No external Redis needed for aggregations.
>
> The key differences: Kafka Streams handles state lifecycle (creation, recovery after crash, replication), windowed aggregations (time windows for count/sum operations), and table joins (enriching events with current state from another topic). `@KafkaListener` is for simple event processing — one event in, one action out. Kafka Streams is for continuous event transformation pipelines with state.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain how Kafka Streams handles fault tolerance when a node crashes."

**Hruday's answer:**
> Kafka Streams combines two mechanisms for fault tolerance: offset tracking and state store replication.
>
> Offset tracking: same as any Kafka consumer. The application ID acts as the consumer group ID. Offsets are committed to `__consumer_offsets`. On restart: resume from last committed offset.
>
> State store replication: every write to a state store (RocksDB) also writes a changelog event to the corresponding Kafka changelog topic — for example, `{applicationId}-payment-count-store-changelog`. This is a compacted topic containing the full state as key-value pairs.
>
> When a node crashes and another node inherits its partitions: it reads the changelog topic from the beginning for those partitions and rebuilds the entire RocksDB state. Processing continues with consistent state. Before standby replicas (Kafka Streams 2.6+): this rebuild could take seconds to minutes depending on state size. With standby replicas (`num.standby.replicas=1`): a secondary instance maintains a hot-standby copy of the state, reducing failover time to near-zero — just a rebalance without a full changelog replay.

---

### Q3 — Scenario
**Interviewer asks:** "When would you use Kafka Streams vs a regular @KafkaListener?"

**Hruday's answer:**
> Use `@KafkaListener` when: the processing is stateless or very simple (read event, call downstream service, write to DB), each event is independent, or you're orchestrating complex multi-step business logic (order fulfillment, payment processing with external calls). `@KafkaListener` is easier to understand, debug, and integrate with Spring's transaction management.
>
> Use Kafka Streams when: you need real-time aggregations (count/sum events per key per time window), you need to join an event stream with a current-state snapshot, or you need stateful computations without external dependencies. Examples: real-time dashboard metrics (order count per minute), fraud detection (payment frequency per user), inventory current-count per product (KTable updated by order events).
>
> The practical boundary: if you find yourself storing and querying Redis for computed state inside a consumer, consider replacing that with Kafka Streams. The state store in Kafka Streams is faster (local), fault-tolerant, and eliminates the external Redis dependency for that use case.

---

### Q4 — Conceptual
**Interviewer asks:** "What is a KTable and how is it different from a KStream?"

**Hruday's answer:**
> A KStream models a stream of events — like an append-only log. Every record is independent. The same key can appear multiple times — each occurrence is a new event. For example: every payment event for `userId:42` is a separate record. Reading from the beginning gives you the full event history.
>
> A KTable models the current state per key — like a database table. For each key, only the latest value is relevant. A new record for the same key replaces (updates) the old one. For example: `userId:42 → currentBalance:₹12,000`. If a new balance event arrives, the KTable is updated to the new value. Reading from the beginning gives you the current state of all keys.
>
> Internally: a KTable is backed by a compacted log topic and a local state store. The state store is the local, fast-access representation of the table. The compacted topic is the durable, replicable source of truth.
>
> The combination: `KStream.join(KTable)` — for each new event in the KStream, look up the CURRENT state from the KTable. This is enrichment: new payment event + current user profile = enriched payment event. No database call — table lookup is local.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Kafka Streams requires a separate processing cluster" | "I need to deploy Kafka Streams on a separate cluster like Flink" | "Kafka Streams is a JAR library — it runs inside your Spring Boot application. No separate cluster. No additional infrastructure. You add the `kafka-streams` dependency, annotate with `@EnableKafkaStreams`, define `@Bean` topologies, and the framework handles everything. The 'cluster' is your existing microservice instances. This is one of Kafka Streams' biggest advantages over Flink or Spark Streaming — no infrastructure overhead for simpler use cases." |
| "State is in-memory and lost on restart" | "The aggregation counts are in memory and reset after restart" | "State is in RocksDB on local disk, not in-memory. More importantly: every state update is written to a changelog Kafka topic. After a restart: Kafka Streams replays the changelog topic to rebuild the RocksDB state completely. Aggregation counts survive restarts. This is called durable state and it's a first-class Kafka Streams feature — not something you need to implement yourself." |
| "All events in a group are in the same node" | "Grouping by userId routes all events for that user to one consumer" | "Kafka's partition assignment ensures all events for the same key go to the same partition. With `groupByKey()`: events for `userId:42` are always in the same partition — and the Kafka Streams instance handling that partition handles all of userId:42's events. State for userId:42 is on that instance's RocksDB. This is consistent, but you must ensure you're keying by the right field BEFORE calling `groupByKey()`. If the original message key doesn't match your grouping key, you need a `selectKey()` operation first to re-key the stream." |
| "Kafka Streams is only for simple operations" | "For complex analytics, use a real stream processing framework like Flink" | "Kafka Streams supports sophisticated patterns: session windows, global KTables (shared lookup state not partitioned by key), interactive queries (querying state stores from outside the topology via REST endpoint), foreign key joins (KTable-KTable joins on non-primary keys, Kafka 2.4+). For pure Kafka-to-Kafka stream processing with Java, Kafka Streams is fully production-ready for most use cases. Flink or Spark Streaming adds value for: multi-source joins (non-Kafka sources), SQL-based processing, batch+streaming unified models, or very long state windows that exceed Kafka's practical retention limits." |

---

## 7. Hruday's Real Experience Hook

> "Kafka Streams is a deliberate gap I'm bridging. At SAP Labs, real-time computations (financial document aggregations by cost centre, ledger balance summaries) are done via scheduled batch jobs — not streaming. The limitation: batch jobs run every 5 minutes at best; real-time dashboards are not possible. I'm studying Kafka Streams because the pattern would directly replace several scheduled aggregation jobs with continuous real-time computation — no more 5-minute lag on financial summaries, no more Redis caching of stale aggregates. The KStream + KTable join pattern specifically mirrors what I currently do with Redis (store latest state in Redis, join incoming events against it) — but without the external dependency and with fault-tolerant state persistence."

---

## 8. Scale Evolution

**1,000 users →** Single Kafka Streams instance, simple topologies (filter + map). RocksDB state small enough to fit in RAM. Changelog replay fast (< 1 second on restart).

**100,000 users →** Parallelism via partition count. 12 partitions → up to 12 parallel Kafka Streams instances. Stateful operations (aggregations) distributed across instances by key-hash. Each instance handles ~8K user-keyed states. Changelog replay: seconds. Set `num.standby.replicas=1` to reduce failover time.

**10 million users →** State store size becomes significant (GB of RocksDB per instance). Tune RocksDB: block cache size, bloom filters for faster key lookups. Separate Kafka Streams application per processing domain (fraud detection, analytics, notification) — each as independent microservice with own `application-id`. Interactive queries (querying state stores via HTTP) for building real-time dashboards directly from stream state without a secondary data store.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Real-time fraud detection (payment frequency per user per time window). Real-time transaction metrics for risk dashboard. KStream + KTable for enriching payments with user risk profiles. | "Design a real-time fraud detection system using Kafka Streams that flags users making more than 5 payments in 60 seconds." |
| Swiggy / Meesho | Real-time order-per-restaurant metrics for dashboards. Live inventory count updates (KTable updated by order events). Delivery ETA estimation from live delivery stream. | "How would you compute real-time city-level order counts using Kafka Streams?" |
| Adobe / Microsoft | Asset processing pipelines — filter, transform, route events to type-specific processors. Document collaboration event streams. User activity analysis for product analytics. | "Walk me through a KStream topology for routing document-edit events to per-document state stores." |
| SAP Labs (current) | Real-time financial aggregations replacing batch computation. KTable for ledger current balances updated by journal entry events. Live cost-centre expense dashboards. | "Replace a 5-minute batch aggregation job with a Kafka Streams topology for real-time financial reporting." |

---

## 10. Related Topics — What to Study Next

- **Topic 110 — Kafka Retention and Compaction** — KTable is backed by a compacted Kafka topic; understanding compaction (Topic 110) is prerequisite for understanding how KTable state persists across restarts and whether keys ever disappear
- **Topic 112 — Kafka Error Handling and DLQ** — Kafka Streams has its own exception handling model (`StreamsUncaughtExceptionHandler` returning `REPLACE_THREAD` or `SHUTDOWN_APPLICATION`); differs from `DefaultErrorHandler` in `@KafkaListener`
- **Topic 114 — Schema Registry and Avro** — production Kafka Streams topologies use Avro serialisation with Schema Registry for type safety across topology stages; JSON Serde works for development but schema evolution conflicts break topologies in production
- **Topic 63 — Microservices Event-Driven Architecture** — Kafka Streams fits into the broader event-driven architecture as the "stream processing" component between event producers and event consumers; understanding the full architectural context clarifies when Streams is the right tool vs a simple consumer

---

*Part 6 · Kafka Streams Basics · Full Stack Interview Guide · Hruday D · 2026*
