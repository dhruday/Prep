# Kafka Error Handling and Dead Letter Queue (DLQ)
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Without error handling: when `@KafkaListener` throws an unhandled exception, Spring Kafka's default behaviour is to retry the message ONCE, then LOG and DROP it. The offset IS committed. The message is gone forever. This is unacceptable for production.
- `DefaultErrorHandler` is Spring Kafka's error handling pipeline. Configure it on the `ContainerFactory`. It gives you: (1) **retry with backoff** — retry the same message N times with exponential delay; (2) **dead-letter publishing** — after N failed retries, publish the failed message to a `{originalTopic}.DLT` dead-letter topic; (3) **non-retryable exception classification** — skip retries entirely for known permanent errors (e.g., `JsonDeserializationException`).
- A **Dead Letter Topic (DLT/DLQ)** is a separate Kafka topic where messages that permanently fail processing are stored. They can be: (a) consumed by an alert service; (b) manually inspected by ops team; (c) reprocessed after a code fix; (d) stored for compliance audit trails.
- `DeadLetterPublishingRecoverer` is the Spring Kafka class that publishes failed messages to the DLT. By default it routes to `{originalTopic}.DLT` on partition 0. Override the routing function to match original partition.
- Key retry decision: retry for **transient failures** (DB temporarily down, HTTP timeout, lock contention). Do NOT retry for **permanent failures** (invalid message format, business validation error, missing required field). Adding non-retryable exceptions prevents retry storms eating resources on messages that will never succeed.
- Gap to bridge: this is a natural extension of Topics 111 (Spring Kafka basics) and 109 (delivery semantics). Every production Kafka service needs error handling — but many candidates describe only the happy path.

---

## 1. One-Line Definition
Kafka error handling in Spring Boot is the pipeline that intercepts consumer exceptions, retries transient failures with backoff, classifies permanent failures, and routes unrecoverable messages to a Dead Letter Topic for manual review or later reprocessing — preventing silent message loss while avoiding infinite retry loops.

---

## 2. The Problem It Solves

Consider an inventory reservation consumer that processes `order.placed` events. 95% of the time it works fine. But what happens in these scenarios?

**Scenario A — Transient failure:** Database is temporarily unreachable (30-second maintenance). The consumer throws `DataAccessException`. Without error handling: the message is retried once, fails twice, offset is committed, message is DROPPED. The order was placed and confirmed to the customer, but inventory was NEVER reserved. Overselling starts silently.

**Scenario B — Permanent failure:** A producer bug sends a malformed JSON event missing the required `itemId` field. Every attempt to process this message throws `NullPointerException`. Without a maximum retry cap: this message blocks the consumer forever, or causes an infinite retry loop consuming CPU until the service OOMs.

**Scenario C — Poison pill:** A message with extreme payload (100MB JSON) causes `OutOfMemoryError` on the consumer. Every restart: the consumer immediately OOMs on the same message. The consumer group is stuck — no messages after this offset are ever processed. The entire topic is blocked.

Error handling with DLQ solves all three:
- Scenario A: retry 3 times with exponential backoff → succeeds on retry 2 after DB recovers
- Scenario B: `NullPointerException` is classified as non-retryable → immediately DLQ, offset committed, next message proceeds
- Scenario C: after max retries, the poison pill is published to DLT, offset committed, processing continues

---

## 3. How It Works Internally

### The Error Handler Pipeline

```
@KafkaListener method throws Exception
                │
                ▼
    DefaultErrorHandler.handleRemaining()
                │
                ├─ Is exception in non-retryable list?
                │    YES → skip retries → go directly to Recoverer
                │    NO  → continue to retry check
                │
                ├─ Retry count < maxAttempts?
                │    YES → apply ExponentialBackOff delay → retry the SAME message
                │    NO  → max retries exhausted → go to Recoverer
                │
                ▼
    DeadLetterPublishingRecoverer
        │
        ├─ Publish original message to "{topic}.DLT"
        │   with headers: kafka_dlt-exception-message, kafka_dlt-original-topic,
        │                  kafka_dlt-original-partition, kafka_dlt-original-offset
        ├─ Offset committed for the original message
        └─ Processing resumes with next message
```

### What Spring Kafka Adds to the DLT Message

```
Headers added to DLT message:
  kafka_dlt-original-topic     → "order.placed"
  kafka_dlt-original-partition → "2"
  kafka_dlt-original-offset    → "45892"
  kafka_dlt-exception-fqcn     → "org.springframework.dao.DataAccessException"
  kafka_dlt-exception-message  → "Unable to acquire connection from pool"
  kafka_dlt-exception-stacktrace → (full stack trace as string)
  kafka_dlt-original-timestamp → "1704067200000"

These headers allow ops/monitoring to:
  - Know exactly which original message failed
  - Understand why it failed
  - Replay it to the original topic after fixing the bug
```

---

## 4. The Code

### DefaultErrorHandler Configuration — The Right Way

```java
@Configuration
public class KafkaErrorHandlingConfig {

    // ❌ WRONG WAY: No error handler configured
    // Spring Kafka default: retry once, then LOG and DROP the message
    // "Processing error for order.placed" in logs, message gone forever
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object>
    brokenFactory(ConsumerFactory<String, Object> cf) {
        // ...no error handler set → silent message loss in production
        return new ConcurrentKafkaListenerContainerFactory<>();
    }

    // ✅ RIGHT WAY: DefaultErrorHandler with retry, backoff, DLQ, non-retryable list

    @Bean
    public DeadLetterPublishingRecoverer deadLetterPublishingRecoverer(
            KafkaTemplate<Object, Object> kafkaTemplate) {

        // Routes failed messages to "{originalTopic}.DLT", same partition as original
        // Matching partition ensures ordering guarantees are preserved in the DLT
        return new DeadLetterPublishingRecoverer(kafkaTemplate,
            (record, ex) -> new TopicPartition(
                record.topic() + ".DLT",
                record.partition()  // match original partition — not hardcode to 0
            )
        );
    }

    @Bean
    public DefaultErrorHandler defaultErrorHandler(
            DeadLetterPublishingRecoverer recoverer) {

        // Exponential backoff: wait 1s → 2s → 4s between retries (max 10s per retry)
        ExponentialBackOff backOff = new ExponentialBackOff(1000L, 2.0);
        backOff.setMaxInterval(10_000L);  // cap at 10 seconds
        backOff.setMaxElapsedTime(60_000L);  // total max retry window: 1 minute

        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backOff);

        // Non-retryable exceptions: skip all retries, go directly to DLT
        // These are PERMANENT failures — retrying will never succeed
        handler.addNotRetryableExceptions(
            JsonDeserializationException.class,   // malformed/invalid JSON payload
            IllegalArgumentException.class,       // business validation failed
            NullPointerException.class,           // missing required field in event
            ConstraintViolationException.class    // DB constraint — e.g., duplicate key
        );

        // Retryable exceptions: DataAccessException (transient DB issues),
        // ConnectException (downstream service temporarily down), etc.
        // These are NOT listed above, so they'll use the backoff retry strategy.

        // Callback for monitoring: log every retry attempt
        handler.setRetryListeners((record, ex, deliveryAttempt) ->
            log.warn("Retry attempt {} for topic={} partition={} offset={}",
                deliveryAttempt,
                record.topic(),
                record.partition(),
                record.offset(),
                ex
            )
        );

        return handler;
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object>
    kafkaListenerContainerFactory(
            ConsumerFactory<String, Object> consumerFactory,
            DefaultErrorHandler errorHandler) {

        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
            new ConcurrentKafkaListenerContainerFactory<>();

        factory.setConsumerFactory(consumerFactory);
        factory.setCommonErrorHandler(errorHandler);  // wire error handler
        factory.setConcurrency(3);
        factory.getContainerProperties().setAckMode(
            ContainerProperties.AckMode.MANUAL_IMMEDIATE
        );

        return factory;
    }
}
```

### Consumer With Error Handling Applied

```java
@Component
@Slf4j
public class InventoryReservationConsumer {

    private final InventoryService inventoryService;

    @KafkaListener(
        topics = "order.placed",
        groupId = "inventory-service-group"
    )
    public void handleOrderPlaced(
            @Payload OrderPlacedEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {

        // Business validation: if event is structurally invalid, throw non-retryable
        if (event.getItemId() == null || event.getQuantity() <= 0) {
            // IllegalArgumentException is in non-retryable list
            // → DefaultErrorHandler will immediately send this to order.placed.DLT
            // → offset committed, next message processed
            throw new IllegalArgumentException(
                "Invalid order event — missing itemId or quantity: " + event);
        }

        // Attempt business logic: may throw DataAccessException (transient DB issue)
        inventoryService.reserveItems(event.getItemId(), event.getQuantity());

        // Only reached if no exception thrown → commit offset
        acknowledgment.acknowledge();
        log.info("Inventory reserved for orderId={}", event.getOrderId());
    }
}
```

### DLT Consumer — Reading Dead Letters for Monitoring/Reprocessing

```java
@Component
@Slf4j
public class DeadLetterConsumer {

    private final AlertingService alertingService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // Consumes from the .DLT topic to alert and potentially reprocess
    @KafkaListener(
        topics = "order.placed.DLT",
        groupId = "dead-letter-monitor-group"
    )
    public void handleDeadLetter(
            @Payload String rawPayload,  // raw bytes/string — original may be invalid JSON
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header("kafka_dlt-original-topic") String originalTopic,
            @Header("kafka_dlt-original-partition") String originalPartition,
            @Header("kafka_dlt-original-offset") String originalOffset,
            @Header("kafka_dlt-exception-message") String exceptionMessage,
            Acknowledgment acknowledgment) {

        log.error("DEAD LETTER received | originalTopic={} partition={} offset={} | error={}",
            originalTopic, originalPartition, originalOffset, exceptionMessage);

        // Alert ops team
        alertingService.sendKafkaDLTAlert(
            originalTopic, originalPartition, originalOffset, exceptionMessage, rawPayload
        );

        acknowledgment.acknowledge();
    }

    // Manual reprocessing endpoint: after fixing the bug, replay DLT → original topic
    // Called by ops/admin after deploying the fix
    public void reprocessDeadLetter(String orderId, OrderPlacedEvent correctedEvent) {
        kafkaTemplate.send("order.placed", orderId, correctedEvent);
        log.info("Reprocessed dead letter orderId={}", orderId);
    }
}
```

### application.yml — DLT Topic Auto-Creation

```yaml
spring:
  kafka:
    # When using DeadLetterPublishingRecoverer, ensure DLT topic exists
    # Either create manually: kafka-topics.sh --create --topic order.placed.DLT
    # Or let Spring create it (careful: default partition count = 1)
    listener:
      missing-topics-fatal: false  # don't crash if DLT topic doesn't exist yet

# In production: create DLT topics explicitly with same partition count as original
# order.placed: 12 partitions → order.placed.DLT: 12 partitions
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What happens when a `@KafkaListener` method throws an exception?"

**Hruday's answer:**
> Without a configured error handler: Spring Kafka retries the message once, then logs the exception and commits the offset. The message is permanently dropped — no alert, no DLQ, silent loss.
>
> With `DefaultErrorHandler` configured: the exception type is checked against the non-retryable list first. If it's non-retryable — for example, `JsonDeserializationException` meaning the message can never be parsed — it's immediately published to the Dead Letter Topic and the offset is committed. If it's retryable — say `DataAccessException` from a temporary DB outage — the handler applies exponential backoff and retries up to the configured maximum. After max retries are exhausted, the message goes to the DLT. Either way: no silent drops, and the consumer continues processing the next message rather than being stuck indefinitely.

---

### Q2 — Deep Dive
**Interviewer asks:** "Design a DLQ strategy for a payment processing consumer."

**Hruday's answer:**
> For payment processing, I use a three-tier error handling strategy:
>
> **Tier 1 — Non-retryable, immediate DLT:** any message that cannot be parsed (JSON deserialization error, missing required fields like `paymentId` or `amount`) goes directly to `payment.processed.DLT` without any retries. These messages can never be processed correctly without fixing the producer — retrying is waste.
>
> **Tier 2 — Retryable with backoff:** transient failures like DB unavailability, the payment gateway's HTTP endpoint returning 503, or a Redis lock contention get retried up to 5 times with exponential backoff: 1s → 2s → 4s → 8s → 16s. Total window: ~30 seconds. This covers most transient issues (DB maintenance windows, short service restarts).
>
> **Tier 3 — DLT with immediate alert:** after 5 retries, the message goes to the DLT. The DLT consumer sends a PagerDuty alert to on-call immediately, with the original topic, partition, offset, and exception message. The ops team can investigate within minutes, fix the issue, and replay from the DLT.
>
> Payment-specific consideration: idempotency. When a payment event is retried, the payment gateway must handle duplicate calls gracefully (idempotency key per transaction). If the gateway doesn't support this, I use a Redis SETNX check before calling the gateway — if the transaction was already processed, skip the gateway call and just acknowledge.

---

### Q3 — Scenario
**Interviewer asks:** "Your consumer is stuck on one message that keeps failing. How do you diagnose and fix this?"

**Hruday's answer:**
> Without a DLQ: the consumer retries the same message forever — it's a "poison pill" blocking every message after it on that partition. The consumer group falls behind; lag grows; eventually everything that partition serves is stalled.
>
> Diagnosis: check consumer group lag via `kafka-consumer-groups.sh --describe` or Kafka Lag Exporter metrics. If all lag growth is from one partition: likely a poison pill. Look at the consumer logs for repeated error on the same offset.
>
> Fix with DLQ configured: the DefaultErrorHandler will exhaust retries and publish the poison pill to the DLT after the window expires. The consumer moves past it automatically. I then investigate the DLT message offline without production impact.
>
> Fix without DLQ (emergency): if DLQ isn't configured, manually skip the offset by creating a consumer with `auto.offset.reset=latest` and `seek` to the problematic offset + 1. Or use `kafka-consumer-groups.sh --shift-by 1` to advance the committed offset for that partition. Then deploy the proper DLQ fix so this never happens again.

---

### Q4 — Conceptual
**Interviewer asks:** "What's the difference between a DLQ in RabbitMQ and a Dead Letter Topic in Kafka?"

**Hruday's answer:**
> In RabbitMQ: messages are nack-ed (negative acknowledged) and routed by the broker to a Dead Letter Exchange, which routes to the DLQ. The broker handles the routing. The message has a TTL and is deleted from the DLQ after it expires unless consumed. DLQ is a queue — first in, first out, message-by-message processing.
>
> In Kafka: the consumer application is responsible for routing failed messages to the DLT (via `DeadLetterPublishingRecoverer`). The broker doesn't know about dead letters — it's an application-level pattern. The DLT is a normal Kafka topic with retention, partitions, and replay capability. This means: DLT messages can be replayed N times, inspected in order, filtered by exception type (via headers), and forwarded to the original topic after a code fix — all using standard Kafka tooling.
>
> Key practical difference: RabbitMQ DLQ is broker-managed with TTL expiry. Kafka DLT is application-managed with indefinite retention (until retention.ms expires). For systems where failed events must be auditable and eventually reprocessed, Kafka's DLT is more flexible because the failed events are just regular Kafka messages that can be consumed and re-routed at any time.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Kafka automatically retries failed messages" | "If the listener throws, Kafka retries it" | "Kafka the broker does not retry. The broker just holds the message at the committed offset. It's Spring Kafka's `DefaultErrorHandler` that retries by re-calling your listener method with the same record before advancing the offset. Without configuring `DefaultErrorHandler`: default behaviour is retry once, then LOG AND COMMIT — the message is permanently dropped. The retry mechanism lives entirely in the Spring Kafka layer, not in the broker." |
| "DLQ = end of life for the message" | "Messages in DLQ are dead forever" | "DLT in Kafka is NOT a graveyard — it's a hospital for sick messages. Failed messages have full metadata in headers (original topic, partition, offset, exception). After fixing the bug in the consumer: read from DLT, correct the message if needed, republish to the original topic. The whole flow is: DLT consumer reads message → validates fix → `kafkaTemplate.send('order.placed', key, correctedEvent)` → original consumer processes it. DLT enables zero-loss error handling with manual intervention for permanent failures." |
| "Use a fixed retry count as high as possible" | "I'll set retries=10 to be safe" | "More retries = longer blocking window on that message = growing consumer lag during extended outages. If DB is down for 1 hour and retry backoff maxes at 10 seconds with 10 retries: the consumer maxes out in 90 seconds, then DLQs everything. That might be fine — or it might DLQ thousands of valid messages that would have succeeded if the consumer had waited. Tune retry count × backoff interval to match the expected maximum transient outage duration for your dependencies. For DB outages: 3-5 retries with 10s backoff (30-50s window). For payment gateway 503: 3 retries with 2s backoff (6s window)." |
| "Non-retryable exceptions = exceptions that crash the service" | "I only catch exceptions that could crash the service" | "Non-retryable in `DefaultErrorHandler` context means: 'this exception, no matter how many times you retry, will never succeed.' Typically: `JsonDeserializationException` (corrupt/wrong-schema payload), `IllegalArgumentException` (invalid business data), `ConstraintViolationException` (DB constraint — duplicate unique key). These should go to DLT immediately on first occurrence, not waste resources on retries. Crashes (OutOfMemoryError, StackOverflowError) are Error not Exception and Spring's default handling typically restarts the container — those need a separate handling strategy." |

---

## 7. Hruday's Real Experience Hook

> "Error handling is a gap I've prioritised studying because at SAP Labs, the equivalent in REST-based systems is Resilience4j — retry with backoff, circuit breaker for dependency failures, fallback responses. The mental model maps cleanly to Kafka. In REST: if a downstream HTTP call fails transiently, Resilience4j retries with backoff; if it's a permanent failure (404, business rule violation), it goes to the fallback handler immediately. In Kafka: if the consumer throws transiently, `DefaultErrorHandler` retries with backoff; if it's permanent, it goes to the DLT immediately. The patterns are isomorphic — I just needed to learn the Kafka-specific wiring."

---

## 8. Scale Evolution

**1,000 users / low volume →** Basic `DefaultErrorHandler` with 3 retries, no backoff, simple DLT consumer that logs to a monitoring dashboard. No complex routing.

**100,000 users →** Exponential backoff to prevent retry storms during partial outages. DLT consumer sends Slack/PagerDuty alert. Separate DLT topics per service group. Monitor DLT message count as a Kafka metric — spike = sign of upstream data quality issue or dependency outage.

**10 million users →** Multiple DLT tiers: infrastructure DLT (transient retries exhausted — likely dependency outage), validation DLT (non-retryable — bad data from producer). DLT replay automation: scripts that re-publish DLT to original topic after ops confirms fix deployed. DLT retention set to 30 days — failed events kept long enough for post-mortem analysis. SLA: P0 alert if DLT count exceeds 100 messages in 1 minute.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment events that fail processing must NEVER be silently dropped. DLT + immediate alerting + manual reprocessing is non-negotiable at payment platforms. | "A payment confirmation event fails to process because the ledger DB is down. How does your Kafka consumer handle this without losing the event?" |
| Swiggy / Meesho | Order events drive inventory, delivery assignment, and notifications. Silent drops = order fulfilment failures. | "Your inventory consumer DLQs 500 messages because of a schema change. How do you replay them after deploying the fix?" |
| Adobe / Microsoft | Asset processing events. Deserialization failures (wrong schema version) must be caught and DLQ-ed without blocking all subsequent events. | "How do you handle deserialization errors in @KafkaListener without blocking the entire partition?" |
| SAP Labs (current) | Financial event processing — any unprocessed event is a compliance risk. DLT provides the audit trail: "this event failed, here's when, here's why, here's when it was reprocessed." | "How do you ensure that every financial event is eventually processed exactly once, even after transient failures?" |

---

## 10. Related Topics — What to Study Next

- **Topic 111 — Spring Kafka KafkaListener and KafkaTemplate** — the `ContainerFactory` and `@KafkaListener` wiring that error handling plugs into; error handling is meaningless without understanding the listener container lifecycle
- **Topic 109 — Kafka Consumer Delivery Semantics** — at-least-once semantics and idempotency patterns are HOW you safely handle re-delivered messages after a retry; error handling and delivery semantics are two halves of the same picture
- **Topic 113 — Kafka Streams Basics** — Kafka Streams has its own error handling model (`StreamsUncaughtExceptionHandler`) that differs from `@KafkaListener`; understanding both is needed for a complete picture
- **Topic 82 — Resilience4j Circuit Breaker** — the circuit breaker pattern for HTTP calls is the REST equivalent of Kafka retry + DLQ; interviewers often ask you to compare Resilience4j retry policies with Kafka `DefaultErrorHandler` retry policies

---

*Part 6 · Kafka Error Handling and Dead Letter Queue · Full Stack Interview Guide · Hruday D · 2026*
