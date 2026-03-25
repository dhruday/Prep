# Spring Kafka — @KafkaListener and KafkaTemplate
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- `KafkaTemplate` is Spring's abstraction for producing Kafka messages. Inject it, call `send(topic, key, value)`. Returns a `CompletableFuture<SendResult>` — call `.get()` to block and confirm delivery, or add a `whenComplete` callback for async confirmation. Always configure `acks=all` and `enable.idempotence=true` for production producers.
- `@KafkaListener` marks a method as a consumer. It handles all the complexity of polling, offset management, and consumer group coordination. Add `groupId` to join a group. Add `topicPartitions` to manually assign partitions. Use `containerFactory` to customise concurrency, error handlers, and ack mode.
- **Concurrency in Spring Kafka**: one `@KafkaListener` method with `concurrency=3` creates 3 consumer threads (3 `KafkaConsumer` instances), each assigned to different partitions within the same consumer group. More threads = higher throughput, up to the number of partitions.
- **Always disable auto-commit**. Use `AckMode.MANUAL_IMMEDIATE`. Call `acknowledgment.acknowledge()` only after the business logic succeeds. This gives at-least-once semantics — you control when the offset is committed.
- Serialisation: use JSON (Jackson `JsonSerializer`/`JsonDeserializer`) for development and most production use. For cross-language teams or large payload volume: move to Avro + Schema Registry (Topic 114). Configure `spring.kafka.producer.value-serializer` and `spring.kafka.consumer.value-deserializer` in `application.yml`.
- Gap to bridge: Kafka is in Hruday's active gaps. This topic establishes the wiring between theoretical Kafka concepts (Topics 106-110) and actual Spring Boot code. Interviewers expect it in the Spring Boot / Microservices section.

---

## 1. One-Line Definition
`KafkaTemplate` (producer) and `@KafkaListener` (consumer) are Spring Kafka's core abstractions that wrap the native Kafka producer/consumer APIs behind familiar Spring patterns — dependency injection, annotations, and auto-configuration.

---

## 2. The Problem It Solves

The native Kafka Java client requires 30+ lines of boilerplate to configure a producer or consumer: create a `Properties` object with dozens of config keys, instantiate `KafkaProducer<K,V>`, call `producer.send()`, handle exceptions, close in a try-finally block. For consumers: create a `KafkaConsumer`, call `subscribe()`, run a `while(true)` poll loop, process records, commit offsets, handle rebalances. This is repetitive, error-prone, and not idiomatic in a Spring Boot microservice.

Spring Kafka solves this by:
1. Auto-configuring producers and consumers from `application.yml` properties
2. Providing `KafkaTemplate` — a thin wrapper around `KafkaProducer` with Spring-style exceptions and `CompletableFuture` return types
3. Providing `@KafkaListener` — an annotation that spins up a `KafkaMessageListenerContainer` managing the poll loop, partition assignment, rebalance events, and offset commits
4. Integrating Kafka with Spring's `@Transactional` for Kafka transactions (Topic 109)
5. Providing a `DefaultErrorHandler` pipeline with retry and dead-letter publishing built-in (Topic 112)

The result: a Kafka producer in 2 lines, a consumer in 1 annotated method, the complex wiring handled by the framework.

---

## 3. How It Works Internally

### KafkaTemplate Internals

```
KafkaTemplate wraps a KafkaProducer (from kafka-clients library).
One KafkaTemplate instance = one KafkaProducer = one internal connection pool to brokers.
Thread-safe: multiple threads can call kafkaTemplate.send() concurrently.
Serialisation: uses configured Serializer<V> to convert your Java objects to byte[].

Flow when you call kafkaTemplate.send("topic", key, value):
1. kafkaTemplate calls producer.send(ProducerRecord)
2. ProducerRecord is serialised (key→bytes, value→bytes)
3. Added to internal RecordAccumulator (batching buffer)
4. Sender I/O thread picks up batches and sends to leader broker
5. Broker writes to partition log
6. Broker sends acknowledgment back
7. CompletableFuture completes — either success (with SendResult) or failure (with Exception)
```

### @KafkaListener Internals

```
Spring creates one KafkaMessageListenerContainer per @KafkaListener.
Inside: a KafkaConsumer assigned to the topic and consumer group.
A background thread runs the poll loop:
  while(running) {
    ConsumerRecords records = consumer.poll(Duration.ofMillis(timeout));
    for (ConsumerRecord record : records) {
      yourAnnotatedMethod(record.value(), acknowledgment);
    }
  }

If concurrency > 1: multiple KafkaMessageListenerContainers are created,
each running its own poll loop in its own thread → each consuming from a subset of partitions.
```

---

## 4. The Code

### application.yml — Full Configuration

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092

    # ─── PRODUCER ─────────────────────────────────────────────────────────────
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer

      # Safest production settings (Topics 108)
      acks: all                          # Wait for all ISR replicas
      retries: 2147483647                # Integer.MAX_VALUE — retry until delivery.timeout
      delivery-timeout-ms: 120000        # 2-min total retry window
      enable-idempotence: true           # Exactly-once per partition
      compression-type: snappy           # Compress batches

      properties:
        # Batch tuning
        batch.size: 16384                # 16KB batch — accumulate before send
        linger.ms: 5                     # Wait up to 5ms to fill a batch
        # Custom JSON properties
        spring.json.add.type.headers: false  # Don't add Java class headers (breaks backwards compat)

    # ─── CONSUMER ─────────────────────────────────────────────────────────────
    consumer:
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest        # Read from beginning if no committed offset
      enable-auto-commit: false          # CRITICAL: manual ack control

      properties:
        # Trust these packages for JSON deserialization — prevent RCE
        spring.json.trusted.packages: "com.example.events"
        # Map incoming type header to local class (for cross-service events)
        spring.json.value.default.type: "com.example.events.OrderPlacedEvent"

    # ─── LISTENER ─────────────────────────────────────────────────────────────
    listener:
      ack-mode: MANUAL_IMMEDIATE         # Commit offset ONLY when we call ack
      concurrency: 3                     # 3 consumer threads per @KafkaListener
      poll-timeout: 3000                 # 3s poll timeout
      missing-topics-fatal: false        # Don't crash on app start if topic doesn't exist yet
```

### Producer — KafkaTemplate Usage

```java
@Service
public class OrderEventPublisher {

    private final KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate;

    private static final String TOPIC = "order.placed";

    // ✅ RIGHT WAY: Async with result callback — don't block the request thread
    public void publishAsync(OrderPlacedEvent event) {
        kafkaTemplate.send(TOPIC, event.getOrderId(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to send order event orderId={} reason={}",
                        event.getOrderId(), ex.getMessage());
                    // Alert, retry logic, or fallback store
                } else {
                    log.info("Order event sent orderId={} partition={} offset={}",
                        event.getOrderId(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset()
                    );
                }
            });
    }

    // ❌ WRONG WAY: Blocking send() on request thread
    // Do NOT do this — it blocks the HTTP thread waiting for broker ack
    // Under load this causes thread pool exhaustion
    public void publishBlocking_WRONG(OrderPlacedEvent event) {
        try {
            // .get() blocks until broker confirms or timeout
            kafkaTemplate.send(TOPIC, event.getOrderId(), event).get();
        } catch (Exception e) {
            throw new RuntimeException("Kafka send failed", e);
        }
    }

    // ✅ RIGHT WAY: When you genuinely need synchronous confirmation
    // (e.g., API must confirm event is stored before responding)
    // Use with timeout — never block indefinitely
    public void publishWithConfirmation(OrderPlacedEvent event) {
        try {
            kafkaTemplate.send(TOPIC, event.getOrderId(), event)
                .get(5, TimeUnit.SECONDS);  // timeout — throw if no confirm in 5s
        } catch (TimeoutException e) {
            throw new KafkaPublishException("Timeout publishing order event", e);
        } catch (ExecutionException e) {
            throw new KafkaPublishException("Failed publishing order event", e.getCause());
        }
    }
}
```

### Consumer — @KafkaListener with Manual Acknowledgment

```java
@Component
public class OrderEventConsumer {

    private final OrderService orderService;

    // ✅ RIGHT WAY: Manual ack, typed payload, exception-safety
    @KafkaListener(
        topics = "order.placed",
        groupId = "inventory-service-group",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleOrderPlaced(
            @Payload OrderPlacedEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {

        String orderId = event.getOrderId();
        log.info("Received order event orderId={} partition={} offset={}",
            orderId, partition, offset);

        try {
            // Business logic: reserve inventory for this order
            orderService.reserveInventory(event);

            // ✅ Commit offset ONLY after successful processing
            // If this line is NOT reached (exception above), offset is NOT committed
            // → message will be re-delivered on restart → at-least-once semantics
            acknowledgment.acknowledge();

        } catch (Exception e) {
            // Don't commit offset — this record will be re-delivered
            // For transient errors: let it retry
            // For permanent errors: error handler will DLQ it (Topic 112)
            log.error("Failed to process order event orderId={}", orderId, e);
            throw e; // re-throw so Spring's error handler pipeline kicks in
        }
    }

    // ❌ WRONG WAY: No acknowledgment-control — relies on auto-commit
    // Auto-commit runs on a timer (~5s) regardless of whether processing succeeded
    // If the service crashes after auto-commit but before processing: silent event loss
    @KafkaListener(topics = "order.placed", groupId = "inventory-service-group-bad")
    public void handleOrderPlaced_WRONG(OrderPlacedEvent event) {
        // If this throws halfway through, offset was already auto-committed
        // → event lost permanently
        orderService.reserveInventory(event);
    }
}
```

### ContainerFactory Bean — Wiring It Together

```java
@Configuration
public class KafkaConsumerConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, OrderPlacedEvent>
    kafkaListenerContainerFactory(ConsumerFactory<String, OrderPlacedEvent> consumerFactory) {

        ConcurrentKafkaListenerContainerFactory<String, OrderPlacedEvent> factory =
            new ConcurrentKafkaListenerContainerFactory<>();

        factory.setConsumerFactory(consumerFactory);

        // Concurrency: 3 threads = up to 3 partitions consumed in parallel
        factory.setConcurrency(3);

        // MANUAL_IMMEDIATE: offset committed as soon as acknowledgment.acknowledge() is called
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);

        // Batch listening: process records in batches instead of one-by-one
        // factory.setBatchListener(true);  // Use for high-throughput bulk processing

        // Error handling: retry 3 times then DLQ — configured in Topic 112
        // factory.setCommonErrorHandler(new DefaultErrorHandler(...));

        return factory;
    }

    @Bean
    public ConsumerFactory<String, OrderPlacedEvent> consumerFactory(KafkaProperties props) {
        Map<String, Object> config = props.buildConsumerProperties(null);
        return new DefaultKafkaConsumerFactory<>(
            config,
            new StringDeserializer(),
            new JsonDeserializer<>(OrderPlacedEvent.class, false)
            // false = don't use type headers (safer for cross-service compatibility)
        );
    }
}
```

### Multiple Topics and Batch Listeners

```java
@Component
public class MultiTopicConsumer {

    // Listen to two topics in one consumer — same consumer group
    @KafkaListener(
        topics = {"order.placed", "order.updated"},
        groupId = "notification-service-group"
    )
    public void handleOrderEvents(
            @Payload String rawJson,              // raw string if type varies per topic
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        switch (topic) {
            case "order.placed"  -> handleNewOrder(rawJson);
            case "order.updated" -> handleOrderUpdate(rawJson);
        }
        acknowledgment.acknowledge();
    }

    // Batch listener: receive a list of records, process in bulk, one ack at the end
    @KafkaListener(
        topics = "metrics.raw",
        groupId = "metrics-aggregator-group",
        containerFactory = "batchKafkaListenerContainerFactory"
    )
    public void handleMetricsBatch(
            List<ConsumerRecord<String, MetricEvent>> records,
            Acknowledgment acknowledgment) {

        log.info("Processing batch of {} metric events", records.size());
        List<MetricEvent> events = records.stream()
            .map(ConsumerRecord::value)
            .toList();

        metricsService.bulkInsert(events);  // one DB call instead of N
        acknowledgment.acknowledge();       // one commit for the whole batch
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do you send a Kafka message from a Spring Boot service?"

**Hruday's answer:**
> Inject `KafkaTemplate<String, YourEventType>` via constructor injection. Call `kafkaTemplate.send(topicName, key, value)`. This returns a `CompletableFuture<SendResult>` — I add a `whenComplete` callback to log success/failure asynchronously without blocking the calling thread.
>
> For the serialiser: configure `spring.kafka.producer.value-serializer=JsonSerializer` in `application.yml`. Spring Kafka auto-configures the `KafkaTemplate` from these properties. For safety I also set `acks=all`, `enable.idempotence=true`, and `retries=Integer.MAX_VALUE` so no message is lost silently on broker failover.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain `@KafkaListener` concurrency. If I set concurrency=3 on a topic with 6 partitions, what happens?"

**Hruday's answer:**
> Setting `concurrency=3` on a `@KafkaListener` creates 3 `KafkaMessageListenerContainer` instances, each running a `KafkaConsumer` in its own thread. All 3 consumers join the same consumer group. Kafka assigns the 6 partitions across these 3 consumers: each consumer gets 2 partitions. Processing is now parallelised: 3 partitions processed concurrently.
>
> If concurrency=6: each consumer gets 1 partition — maximum parallelism for 6 partitions. If concurrency=8 with 6 partitions: 6 consumers are active (one per partition), 2 consumers are idle — Kafka can't assign a consumer more partitions than exist.
>
> Practical rule: set concurrency equal to the number of partitions on the topic (or a divisor of the partition count). Mismatched concurrency either leaves threads idle or creates load-imbalanced partition assignments.

---

### Q3 — Trade-off
**Interviewer asks:** "When would you use a batch listener instead of record-by-record processing?"

**Hruday's answer:**
> Use batch listeners when the bottleneck is per-record overhead, not per-record processing time. The classic case: writing Kafka events to a database. With record-by-record: N events = N INSERT statements = N round trips to the database. With batch listener with `batchListener=true`: receive 500 records in one poll, run one `INSERT ... VALUES (...), (...), (...)` or one `SaveAll()` — one DB round trip for all 500 records. Throughput improvement by an order of magnitude.
>
> When NOT to use batch: when events require individual business logic where partial failure is a concern. If you process 500 events in a batch and event 327 fails — the whole batch's offset isn't committed. You need an idempotent processing strategy that handles re-delivery of all 500 on the next attempt. For events with complex business logic that may fail partially, per-record processing with per-record retry is simpler and safer.

---

### Q4 — Configuration Gotcha
**Interviewer asks:** "Why is `enable-auto-commit: false` so important? What goes wrong if you leave it as true?"

**Hruday's answer:**
> Auto-commit runs on a background timer — by default every 5 seconds — regardless of whether your processing succeeded. The sequence with auto-commit enabled and a crash scenario is: poll records → start processing → 5-second timer fires → offset committed → service crashes mid-processing → on restart: Kafka says "offset X is already committed, start from X+1" → the records between the last committed offset and the crash point are NEVER processed again. Silent data loss.
>
> With `enable-auto-commit: false` and `AckMode.MANUAL_IMMEDIATE`: the offset is ONLY committed when I explicitly call `acknowledgment.acknowledge()`. I place that call AFTER my business logic succeeds. If the service crashes before reaching that line: offset is not committed → records are re-delivered on restart → at-least-once semantics. The risk is duplicate processing, which I handle with idempotency patterns — not silent data loss, which is unrecoverable.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use StringSerializer for the value" | "I'll serialise my objects to String/JSON with StringSerializer" | "Use `JsonSerializer` (Spring Kafka's) not `StringSerializer`. `JsonSerializer` handles the Java object-to-JSON conversion and type metadata automatically. `StringSerializer` would require you to manually serialise your objects before calling `send()`, and manually deserialise on the consumer side — that's boilerplate Spring Kafka eliminates. Also: set `spring.json.add.type.headers=false` to avoid brittle type header coupling between producer and consumer when they have different package names." |
| "Retry is handled automatically" | "If `@KafkaListener` throws, Kafka will retry" | "Retry is NOT handled by Kafka itself — Kafka just re-delivers the uncommitted message. The retry behaviour comes from Spring Kafka's `DefaultErrorHandler`. Without configuring it: if your listener throws, Spring logs the error and commits the offset anyway! The message is dropped! You MUST configure a `DefaultErrorHandler` with retry and DLQ backing (Topic 112) to get actual retry-then-DLQ behaviour. Don't assume Kafka retries — configure Spring Kafka's error handler explicitly." |
| "One @KafkaListener = one consumer thread" | "Each @KafkaListener method runs sequentially" | "With `concurrency > 1`, each `@KafkaListener` annotation spawns multiple threads. This means your listener method MUST be thread-safe — no shared mutable state without synchronisation. Inject stateless services only. Beans used inside the listener (services, repositories) must be thread-safe. Spring beans are singletons by default, so your `OrderService` is shared across all 3 consumer threads — ensure it has no instance variables that hold per-request state." |
| "KafkaTemplate.send() always succeeds" | "If no exception is thrown, the message was sent" | "`kafkaTemplate.send()` is asynchronous. It returns a `CompletableFuture`. If you don't call `.get()` or add a `.whenComplete()` callback, failures are silently swallowed. The method returns immediately regardless of whether the broker received the message. Always add a result callback or use the `ProducerListener` registered on the template via `setProducerListener()` to catch and alert on send failures at scale." |

---

## 7. Hruday's Real Experience Hook

> "I'm bridging this gap intentionally. At SAP Labs, my Spring Boot services communicate over REST (Oracle ERP integration) and occasionally via HTTP with external SAP BTP services. The event-driven patterns with Kafka are new territory I'm actively wiring in. One thing that helps: the Spring abstraction model is the same — dependency injection, component annotations, auto-configuration. `@KafkaListener` feels like `@RestController` + `@PostMapping` but for events. `KafkaTemplate` feels like `RestTemplate`/`WebClient` but for async event publishing. The mental model from Spring REST transfers directly. The critical differences are the acknowledgment model and the retry strategy — those are where I focus my learning."

---

## 8. Scale Evolution

**1,000 users / low volume →** Single `@KafkaListener` with 1 thread, auto-offset-reset=latest, JSON serialisation. Straightforward setup, default container factory.

**100,000 users →** `concurrency=partitionCount` to saturate all partitions. Custom `ContainerFactory` with explicit error handler and DLQ. Monitoring consumer lag (consumer group offset vs latest offset) via Prometheus + Kafka exporter.

**10 million users →** Batch listeners for bulk-write scenarios (metrics, events going to data warehouse). Separate `ContainerFactory` beans per consumer type (batch vs record). Consumer group lag alerts (lag > 10,000 = scale-up trigger). Ordered processing requirements (same key → same partition → same thread) verified against partition count to prevent cross-partition ordering assumptions.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Every payment event published and consumed via Kafka. Spring Kafka is the integration layer in Spring Boot microservices. | "Walk me through how you'd wire a payment-processed event publisher and a transaction-ledger consumer using Spring Kafka." |
| Swiggy / Meesho | Order events, inventory updates, delivery status — all Spring Kafka consumers with manual ack and DLQ. | "Your order-consumer is processing 50K messages/sec. How do you tune concurrency and batch listener settings?" |
| Adobe / Microsoft | Asset events, user actions, document events published via KafkaTemplate. Fine-grained control over retry and error handling per event type. | "How do you handle deserialization errors in @KafkaListener? What happens when the consumer receives a corrupt JSON message?" |
| SAP Labs (current) | Bridging gap: new microservices being built with event-driven patterns using Spring Kafka. Older Oracle integration via REST being augmented with async event layer. | "Show me how you'd add Kafka event publishing to an existing Spring Boot REST service at SAP." |

---

## 10. Related Topics — What to Study Next

- **Topic 108 — Kafka Producer Acks** — the `acks=all` and `enable.idempotence=true` settings configured in `application.yml` here go deeper there; understanding WHY those settings matter makes them memorable
- **Topic 109 — Kafka Consumer Delivery Semantics** — the manual ack pattern shown in Section 4 is the foundation for at-least-once semantics; idempotency patterns for handling re-delivered messages are covered there
- **Topic 112 — Kafka Error Handling and DLQ** — the `DefaultErrorHandler` referenced in the `ContainerFactory` config here is the next topic; retry policies, backoff, and dead-letter publishing complete the error handling picture
- **Topic 113 — Kafka Streams Basics** — after mastering producer/consumer, Kafka Streams builds on top using the same Spring Kafka starter with `@EnableKafkaStreams`, stream processing topologies, and stateful aggregations

---

*Part 6 · Spring Kafka KafkaListener and KafkaTemplate · Full Stack Interview Guide · Hruday D · 2026*
