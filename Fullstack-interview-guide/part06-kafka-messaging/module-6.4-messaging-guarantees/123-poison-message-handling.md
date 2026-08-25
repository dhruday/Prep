# Poison Message Handling
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- A **poison message** (poison pill) is a message that causes the consumer to fail every time it's processed, regardless of how many retries occur. The cause is typically permanent: corrupt payload, missing required field, invalid data that violates a business invariant, or a code bug that throws on a specific input pattern.
- **Why it's dangerous**: a poison pill blocks the ENTIRE partition (in Kafka) or entire queue (in RabbitMQ with single consumer). No messages AFTER the poison pill are processed until the pill is dealt with. Consumer lag grows unboundedly. The system is effectively stuck on that partition.
- **In Kafka**: the consumer is stuck at the poison pill's offset. It keeps failing and retrying. With `DefaultErrorHandler` configured: after max retries, the message is published to DLT and the offset is committed → consumer resumes processing messages after the poison pill. Without `DefaultErrorHandler`: infinite loop. The DLT is the automatic poison pill resolution mechanism.
- **In RabbitMQ**: a poison pill NACK'd with `requeue=true` bounces back to the queue immediately and is redelivered to the same (or another) consumer — an infinite bounce loop. Fix: NACK with `requeue=false` after max retries → message goes to DLX → DLQ. Use the `x-death.count` header to track retry count and enforce the max.
- **Detection**: monitor consumer lag that grows without progress on a specific partition (Kafka) or `x-death.count` header growing on recirculating messages. Alert when a single Kafka offset is retried more than N times or when RabbitMQ message death count exceeds threshold.
- **Ops recovery**: for Kafka without error handler — manually skip the poison pill by resetting the committed offset for that partition to `offset + 1` using `kafka-consumer-groups.sh --shift-by 1`. Then investigate and fix the root cause.

---

## 1. One-Line Definition
A poison message is a message that permanently fails consumer processing — corrupted payload, invalid data, or untriggered code bug — and without proper handling it blocks the entire consumer on that partition/queue indefinitely; the solution is bounded retry + automatic DLQ routing + offset advancement so the consumer continues past the poison pill.

---

## 2. The Problem It Solves

### Poison Pill in Production — What Happens Without Handling

```
Kafka topic: order.placed — 12 partitions, 3 consumer threads (each handles 4 partitions)

Partition 4 events:
  Offset 1200: valid order event     → processed successfully
  Offset 1201: valid order event     → processed successfully
  Offset 1202: POISON PILL           → consumer throws NullPointerException every time
  Offset 1203: valid order event     ← NEVER PROCESSED
  Offset 1204: valid order event     ← NEVER PROCESSED
  ...

Without error handler configured:
  Consumer reads offset 1202 → throws NPE → retries → NPE → retries → NPE → infinite loop
  Consumer thread 1 is stuck on partition 4 offset 1202 indefinitely
  All events after offset 1202 on partition 4: never processed
  Consumer lag for partition 4: grows by N messages/minute

Impact after 1 hour: 60 minutes × throughput rate of messages blocked
Impact after 1 day: potentially thousands of valid orders never processed
Symptom: monitoring shows partition 4 consumer lag growing while others are stable
```

### The Three Poison Pill Scenarios

```
TYPE 1 — Corrupt payload:
  A bug in a message serialiser produced a truncated JSON:
  {"orderId": "ORD-001", "amount": 499.99, "user   <-- truncated
  JsonDeserializationException on every deserialization attempt.
  Permanent failure — no retry will ever succeed on this message.

TYPE 2 — Invalid business data:
  Message contains userId=null (schema validation wasn't enforced on producer).
  Consumer tries orderService.process(null userId) → NullPointerException.
  Other messages with valid userId succeed. This one always fails.

TYPE 3 — Consumer bug triggered by specific data pattern:
  Message with amount=0.00 → consumer divides by amount → ArithmeticException: / by zero.
  All other messages succeed. Zero-amount messages always fail.
  Fix requires code change + deployment.
```

---

## 3. How It Works Internally

### Spring Kafka — Poison Pill Detection and DLT Routing

```
Kafka @KafkaListener with DefaultErrorHandler configured:

Message arrives at consumer listener
    │
    ▼
Listener throws exception
    │
    ├── ExceptionClassifier: is exception non-retryable?
    │     YES → immediately publish to DLT, commit offset
    │
    ├── retry count < maxAttempts?
    │     YES → backoff delay → retry same message (same offset not committed)
    │
    └── retry count == maxAttempts → EXHAUSTED
          │
          ▼
    DeadLetterPublishingRecoverer:
      - Publish message to "order.placed.DLT"
      - Headers: kafka_dlt-exception-message, original-partition, original-offset
          │
          ▼
    Commit original offset (1202 in our example)
      - Consumer now reads offset 1203 — the partition UNBLOCKS
      - Other valid orders resume processing
```

### RabbitMQ — Poison Pill via DLQ x-death Counting

```
Message arrives at RabbitMQ consumer
    │
    ▼
Consumer throws exception → manual ack mode
    │
    ├── DLQ consumer checks x-death[0].count < MAX_RETRIES (e.g., 3)?
    │     YES → backoff + re-publish to original queue → increment count
    │
    └── count >= MAX_RETRIES
          │
          ▼
    Publish to permanent DLQ + alert ops
    ACK the DLQ message — stop recirculating
    Queue UNBLOCKS for subsequent messages
```

---

## 4. The Code

### Spring Kafka — MaxAttempts + DLT (Automatic Poison Pill Resolution)

```java
@Configuration
public class KafkaErrorConfig {

    // ✅ RIGHT WAY: DefaultErrorHandler with bounded retries + DLT
    // After maxAttempts, poison pill is DLQ-ed and offset is committed
    @Bean
    public DefaultErrorHandler poisonPillHandler(
            DeadLetterPublishingRecoverer recoverer) {

        // Max 3 attempts (1 initial + 2 retries)
        FixedBackOff backOff = new FixedBackOff(5000L, 2L);  // 5s between retries, max 2 retries

        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backOff);

        // Non-retryable: immediately DLT without any retries
        // These are ALWAYS poison pills — retrying wastes time
        handler.addNotRetryableExceptions(
            JsonDeserializationException.class,     // corrupt/malformed message
            MessageConversionException.class        // schema mismatch
        );

        // Log every retry attempt for monitoring
        handler.setRetryListeners((record, ex, deliveryAttempt) ->
            log.warn("RETRY {}/3 for poison pill candidate: topic={} partition={} offset={} error={}",
                deliveryAttempt,
                record.topic(), record.partition(), record.offset(),
                ex.getMessage()
            )
        );

        return handler;
    }

    @Bean
    public DeadLetterPublishingRecoverer dltRecoverer(
            KafkaTemplate<Object, Object> kafkaTemplate) {

        return new DeadLetterPublishingRecoverer(kafkaTemplate,
            (record, ex) -> {
                // Route to DLT — matching partition for ordered DLT inspection
                TopicPartition dltTarget = new TopicPartition(
                    record.topic() + ".DLT",
                    record.partition()
                );

                // Log for immediate visibility
                log.error("POISON PILL → DLT: topic={} partition={} offset={} error={}",
                    record.topic(), record.partition(), record.offset(),
                    ex.getMessage());

                return dltTarget;
            }
        );
    }
}
```

### Spring Kafka — Consumer with Non-Retryable Classification

```java
@Component
@Slf4j
public class OrderEventConsumer {

    @KafkaListener(topics = "order.placed", groupId = "order-processor")
    public void handleOrder(
            @Payload OrderPlacedEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {

        // ✅ Explicit poison pill detection: classify failures at the throw site
        if (event == null || event.getOrderId() == null) {
            // Permanent failure: invalid message — always fails, skip retries
            throw new IllegalArgumentException(
                "Invalid order event: null event or orderId at partition=" + partition + " offset=" + offset);
            // DefaultErrorHandler: IllegalArgumentException is in non-retryable list → DLT immediately
        }

        if (event.getAmount() == null || event.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            // Permanent failure: invalid business data
            throw new IllegalArgumentException(
                "Invalid order amount: " + event.getAmount() + " for orderId=" + event.getOrderId());
        }

        try {
            orderService.processOrder(event);
            acknowledgment.acknowledge();
        } catch (DataAccessException e) {
            // Transient failure: retryable
            log.warn("Transient DB error for orderId={}, will retry", event.getOrderId());
            throw e;  // DefaultErrorHandler will retry with backoff
        }
    }
}
```

### RabbitMQ — Poison Pill via x-death Count Guard

```java
@Component
@Slf4j
public class RabbitPoisonPillHandler {

    private final RabbitTemplate rabbitTemplate;
    private final AlertingService alertingService;

    private static final int MAX_RETRIES = 3;

    @RabbitListener(queues = "order.processing.dlq", ackMode = "MANUAL")
    public void handleDeadMessage(
            Message message,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {

        List<Map<String, Object>> xDeaths = message.getMessageProperties().getXDeathHeader();
        int deathCount = extractDeathCount(xDeaths);
        String reason = extractDeathReason(xDeaths);

        log.warn("DLQ message: deathCount={} reason={}", deathCount, reason);

        if (deathCount >= MAX_RETRIES) {
            // ✅ Poison pill detected: max retries exceeded
            // Publish to permanent DLQ, stop recirculating
            log.error("POISON PILL detected: max retries ({}) exceeded. Sending to permanent DLQ.", MAX_RETRIES);

            rabbitTemplate.send(
                "",                          // default exchange
                "order.permanent.dlq",       // permanent dead queue
                message
            );

            // Alert ops team
            String orderId = (String) message.getMessageProperties().getHeaders().get("orderId");
            alertingService.sendPoisonPillAlert(orderId, deathCount, reason);

            channel.basicAck(deliveryTag, false);  // ack DLQ message — stop recirculation
            return;
        }

        // Under max retries: retry with increasing delay
        long delayMs = 10_000L * (long) Math.pow(2, deathCount - 1);  // 10s, 20s, 40s
        log.info("Retrying message: deathCount={} delay={}ms", deathCount, delayMs);

        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Re-publish to original queue
        String originalExchange = (String) xDeaths.get(0).get("exchange");
        List<?> routingKeys = (List<?>) xDeaths.get(0).get("routing-keys");
        rabbitTemplate.send(originalExchange, routingKeys.get(0).toString(), message);
        channel.basicAck(deliveryTag, false);
    }

    private int extractDeathCount(List<Map<String, Object>> xDeaths) {
        if (xDeaths == null || xDeaths.isEmpty()) return 0;
        Object count = xDeaths.get(0).get("count");
        return count instanceof Long ? ((Long) count).intValue() : 0;
    }

    private String extractDeathReason(List<Map<String, Object>> xDeaths) {
        if (xDeaths == null || xDeaths.isEmpty()) return "unknown";
        return (String) xDeaths.get(0).getOrDefault("reason", "unknown");
    }
}
```

### Emergency Ops: Skip Poison Pill in Kafka Without Code Change

```bash
# When DefaultErrorHandler is NOT configured and consumer is stuck on a poison pill:
# Manually advance the committed offset to skip the poison pill

# 1. Stop the consumer service

# 2. Check which offset is stuck
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group order-processor \
  --describe

# Output shows:
# TOPIC        PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# order.placed    4          1202           1500           298  ← stuck at 1202

# 3. Skip partition 4 offset 1202 by setting offset to 1203
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group order-processor \
  --topic order.placed:4 \
  --reset-offsets \
  --to-offset 1203 \
  --execute

# 4. Restart consumer — it now reads from offset 1203
# 5. Inspect the poison pill message at offset 1202 separately
# (read it using kafka-console-consumer with --partition 4 --offset 1202)
# 6. Fix the root cause and deploy
```

---

## 5. Interview Questions & Model Answers

### Q1 — Definition
**Interviewer asks:** "What is a poison message, and how does it affect a Kafka consumer?"

**Hruday's answer:**
> A poison message is one that the consumer permanently fails to process — every attempt throws an exception. The cause is typically in the message itself: corrupt payload, missing required field, or a data pattern that triggers an unhandled code path.
>
> In Kafka: a poison message blocks the entire partition. Kafka's consumer commits offsets sequentially — to advance past offset N, you must first successfully process (or explicitly skip) offset N. If the consumer keeps failing on offset 1202, it never commits that offset, and offsets 1203, 1204, 1205... are never processed. Consumer lag grows indefinitely.
>
> The automatic fix: `DefaultErrorHandler` with a max attempt count and `DeadLetterPublishingRecoverer`. After max retries, the poison message is published to a DLT and the offset IS committed, unblocking the partition. The consumer resumes at the next offset. The poison pill is safely parked in the DLT for investigation without blocking any further processing.

---

### Q2 — Distinction
**Interviewer asks:** "What is the practical difference between a transient failure and a poison message?"

**Hruday's answer:**
> A transient failure: the message is fine, but the environment is not. Database temporarily unreachable, downstream API returning 503, Redis timeout. On retry after a few seconds: succeeds. The message eventually processes correctly.
>
> A poison message: the message is the problem. The consumer consistently fails because of the message's content, structure, or data. Retry after 5 seconds = same failure. Retry after 1 hour = same failure. No amount of waiting resolves it — only a code fix, an override, or skipping the message resolves it.
>
> Why the distinction matters in code: configure `addNotRetryableExceptions(JsonDeserializationException.class, IllegalArgumentException.class, NullPointerException.class)` for poison-pill-type exceptions. These go directly to DLT — no time wasted on retries that will never work. Transient exceptions (DataAccessException, ConnectException) use the retry mechanism. Getting this classification right is the difference between a snappy poison pill resolution and a wasted 30-second retry window.

---

### Q3 — Scenario
**Interviewer asks:** "Your team deployed a bug where order events with amount=0 throw ArithmeticException in the consumer. By the time you detect this, 500 poison pills are stuck in the DLT. How do you recover?"

**Hruday's answer:**
> Two parallel tracks: fix the code, then replay.
>
> Immediate: check if any partitions are currently stuck. With `DefaultErrorHandler` configured, all 500 poison pills should have been automatically DLT-ed with their offsets committed. Processing continued. If no consumers are stuck, production is fine — the only impact is 500 unprocessed DLT messages.
>
> Code fix: deploy the fix for the ArithmeticException — handle amount=0 gracefully (skip, or treat as free order, whatever the business rule requires).
>
> Replay: after deploying the fix, consume the DLT. For each DLT message, re-publish it to the original `order.placed` topic (or directly to the downstream processing function if safe). With the fix deployed: amount=0 orders now process correctly.
>
> Validation: after replay, verify the 500 orders appear in the expected state (fulfilled, notified, etc.). Check for exactly once processing using idempotency checks — re-publishing to the original topic triggers duplicate checks, so the same orderId shouldn't create doubly-booked inventory.

---

### Q4 — Prevention
**Interviewer asks:** "How do you prevent poison messages from occurring in the first place?"

**Hruday's answer:**
> Three prevention layers.
>
> First: producer-side schema validation. Use Avro + Schema Registry (Topic 114) — the registry enforces schema compatibility at publish time. A producer publishing a null userId triggers a schema validation failure before the message reaches Kafka. Corrupt or missing fields are caught at the source.
>
> Second: consumer-side defensive validation. At the start of every consumer method: validate the deserialized payload — nulls, negative amounts, required fields, business invariants. If validation fails: throw `IllegalArgumentException` (marked non-retryable) → immediately DLT. Fail fast, fail clearly.
>
> Third: contract testing between producer and consumer teams. Publish/subscribe contract tests using Pact or Spring Cloud Contract. When the producer changes the event schema, contract tests in the consumer's CI pipeline catch the breaking change before deployment. Prevents the "producer deployed a new field, consumer crashed" class of poison messages.
>
> No system eliminates 100% of poison messages — but these three layers reduce the occurrence to edge cases, and `DefaultErrorHandler` handles the remaining edge cases automatically.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Infinite retry on exception is fine, it'll eventually succeed" | "The consumer will keep retrying until the service recovers" | "Retrying forever is catastrophic for a permanent failure. Retry assumes the failure is transient — environment recovers, message succeeds. For a poison pill, the message is the problem — the environment is irrelevant. Retrying a corrupt message 10,000 times produces 10,000 identical failures and advances zero offsets. The entire partition is blocked, consumer lag grows to minutes-then-hours. Always bound retries with `FixedBackOff` or `ExponentialBackOff` and a `maxAttempts`. After max: DLT the message, commit the offset, MOVE ON." |
| "NACK with requeue=true handles failures in RabbitMQ" | "I'll nack with requeue=true so the message isn't lost" | "`requeue=true` on a permanent failure = instant infinite loop. The broker returns the message to the queue head immediately. The consumer picks it up immediately. Fails immediately. Requeues immediately. This tight loop consumes one consumer thread entirely and processes no other messages. In production, this can OOM the consumer (Java heap filled with retry exceptions) or cause a CPU spike. For confirmed permanent failures: `requeue=false` → DLX → DLQ. Only use `requeue=true` for genuinely transient failures, and add a delay (backoff) between retries to avoid the tight loop." |
| "DLT messages are safe to ignore" | "I'll set up DLT and monitor it occasionally" | "DLT messages are not a parking lot — they're production failures that require active response. Each DLT message represents a real business event that wasn't processed. For a payment platform: a message in payment.processed.DLT means a payment confirmation wasn't processed — a potential customer service issue or financial reconciliation gap. DLT must have: (1) real-time alerting when message count exceeds threshold, (2) a well-defined SLA for investigation (e.g., P1 alert if > 10 DLT messages per minute), (3) a replay procedure documented and tested. Treat DLT like a production incident queue — it's not optional." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, the Oracle ERP integration had an equivalent to poison messages: financial documents with validation errors that the posting batch job kept failing on, preventing all subsequent documents in the batch from posting. The resolution was manually quarantining the failing document (moving it to an 'error' status in a separate table), allowing the batch to continue, and flagging it for manual correction. That quarantine-and-continue pattern is exactly what `DefaultErrorHandler` + DLT does automatically. What took manual production intervention and an ops procedure in the Oracle batch world is an automatic, configured, zero-intervention flow in a properly configured Kafka consumer."

---

## 8. Scale Evolution

**1,000 users →** `DefaultErrorHandler` with `FixedBackOff` and 3 retries. DLT consumer sends Slack alert. Manual replay via DLT consumer when needed.

**100,000 users →** DLT metrics in Prometheus: DLT message rate alert (> 5/min = P2, > 50/min = P1). Automated DLT classification (transient vs structural by exception type in headers). Run-book documentation for DLT replay procedures.

**10 million users →** DLT relay service: automatically re-publishes DLT messages after code deploy (ops gives signal: "fix deployed, replay DLT"). DLT partitioned by exception type for targeted analysis. Dead letter topic retention = 90 days for compliance (every failed financial event is auditable). Live DLT rate dashboard visible to on-call engineers at all times.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | A payment event in the DLT = a payment not settled. P1 alert, immediate investigation, manual replay after code fix. Zero tolerance for unprocessed payment events. | "A payment event keeps failing in your Kafka consumer. How do you ensure it doesn't block all other payments and how do you recover?" |
| Swiggy / Meesho | Order event with corrupt menu snapshot causes processing failure. Partition blocked = orders on that partition not confirmed. | "Describe the full poison pill lifecycle in your Kafka-based order system from detection to recovery." |
| Adobe / Microsoft | Document processing event with invalid asset format triggers stream processor failure. DLT with classification by failure type (codec error, permissions error, size limit exceeded). | "How do you distinguish between a transient timeout failure and a permanent poison message in your asset processing consumer?" |
| SAP Labs (current) | Financial document with invalid GL account code fails posting. Requires quarantine (move to DLT), manual correction, and replay — same lifecycle as production DLT handling. | "How would you design poison message handling for a financial document posting Kafka consumer to comply with audit trail requirements?" |

---

## 10. Related Topics — What to Study Next

- **Topic 112 — Kafka Error Handling and DLQ** — `DefaultErrorHandler` configuration that RESOLVES poison messages automatically is covered in detail there; this topic explains the problem, Topic 112 explains the full Spring Kafka wiring
- **Topic 118 — RabbitMQ Dead Letter Queues and Message TTL** — the RabbitMQ equivalent of DLT; the x-death.count pattern for max-retry enforcement in RabbitMQ complements the Kafka side shown here
- **Topic 121 — Idempotent Consumers** — when a poison pill is retried multiple times before being DLT-ed, some side effects may have occurred on earlier attempts; idempotency ensures those partial side effects are safely handled when the message is eventually replayed from DLT
- **Topic 120 — Delivery Semantics** — the relationship between retry behaviour and delivery semantics: a poison pill that retries before DLT triggers multiple delivery attempts; understanding at-least-once semantics clarifies what guarantees hold during those retries

---

*Part 6 · Poison Message Handling · Full Stack Interview Guide · Hruday D · 2026*
