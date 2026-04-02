# At-Most-Once vs At-Least-Once vs Exactly-Once
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **At-most-once**: the message may be delivered zero or one time — NEVER more than once. Risk: message loss. Used when loss is acceptable (metrics, telemetry, log events). In Kafka: acks=0 (fire and forget), auto-commit=true. In AMQP: auto-ack (ack before processing).
- **At-least-once**: the message is delivered ONE or more times — NEVER zero. Risk: duplicate processing. Used when loss is unacceptable but duplicates are handled. In Kafka: acks=all + commit AFTER processing + manual ack. In AMQP: manual ack AFTER successful processing.
- **Exactly-once**: the message is delivered exactly one time — no loss, no duplicates. Hardest to achieve. In Kafka: requires Kafka transactions (`transactional.id` + `isolation.level=read_committed`) — works ONLY for Kafka-to-Kafka operations. For external systems (DB writes, HTTP calls): exactly-once is theoretically impossible — use at-least-once + idempotency.
- The practical reality: most production systems use **at-least-once + idempotent consumers**. You accept that re-delivery can happen, and you engineer your consumers to handle duplicate messages gracefully. This is simpler, more reliable, and performant vs true exactly-once.
- The interview formula: "We use at-least-once delivery semantics with idempotent consumers. Producer: acks=all, retries=MAX_INT. Consumer: manual ack after processing. Consumer logic: check if this event was already processed (idempotency check) before acting."
- Both RabbitMQ and Kafka support at-most-once and at-least-once. Exactly-once is only available in Kafka (within Kafka), not in RabbitMQ.

---

## 1. One-Line Definition
Delivery semantics define the guarantee a messaging system makes about how many times a message is delivered to a consumer — at-most-once (possible loss, no duplicates), at-least-once (no loss, possible duplicates), or exactly-once (no loss, no duplicates) — each involving different consumer commit and producer confirmation strategies.

---

## 2. The Problem It Solves

### Why delivery semantics matter

You process a payment event. The consumer:
1. Receives the message
2. Charges the customer
3. Commits the offset (Kafka) / ACKs (RabbitMQ)

**Two crash scenarios with different semantics:**

**Crash after step 2 but before step 3 (ACK never sent):**
- At-most-once: offset was committed BEFORE step 2. Customer charged once. Message gone. ✓ (but only if broker doesn't crash before step 2)
- At-least-once: offset committed AFTER step 2. Crash at step 3. On restart: message re-delivered. Consumer runs step 2 again → customer charged TWICE. ✗ (without idempotency)
- At-least-once + idempotency: offset committed AFTER step 2. On restart: message re-delivered. Idempotency check: "was this paymentId already charged?" → YES → skip charge → commit offset. Customer charged once. ✓

**Crash between step 1 and step 2 (before processing):**
- At-most-once with pre-commit: offset committed before processing. Crash kills the process. ON restart: consumer reads from next offset. Message was NEVER processed. Customer NOT charged. Silent loss. ✗
- At-least-once: offset not committed. On restart: same message re-delivered. Customer charged on retry. ✓

The second crash scenario is WHY at-most-once is dangerous for payments but acceptable for metrics.

---

## 3. How It Works Internally

### The Three Semantics — Decision Points

```
AT-MOST-ONCE:
  Kafka:  enable-auto-commit=true + commit BEFORE calling business logic
          OR: acks=0 (producer fire-and-forget, possible loss before broker write)
  AMQP:   ackMode=NONE (auto-ack: broker removes message on delivery, before consumer processes)

  ─── Timeline ───────────────────────────────────────────────────────
  Broker delivers message → COMMIT OFFSET / ACK → process message
    If crash here (after ack, before process) → message LOST
    If crash here (after ack AND after process) → processed once ✓
  ────────────────────────────────────────────────────────────────────
  Loss is possible. No duplicates. Performance: highest.

AT-LEAST-ONCE:
  Kafka:  enable-auto-commit=false, manual ack AFTER business logic
          acks=all (producer), retries=MAX_INT
  AMQP:   ackMode=MANUAL, channel.basicAck() AFTER processing

  ─── Timeline ───────────────────────────────────────────────────────
  Broker delivers message → process message → COMMIT OFFSET / ACK
    If crash here (after process, before ack) → re-delivered on restart → DUPLICATE
    If crash here (before process) → re-delivered on restart → processed once ✓
  ────────────────────────────────────────────────────────────────────
  No loss. Duplicates possible. Standard production choice.

EXACTLY-ONCE (Kafka only, within Kafka):
  Kafka: transactional.id on producer, isolation.level=read_committed on consumer
         Kafka atomically commits: produce output + commit input offsets in one transaction
  AMQP: NOT SUPPORTED at protocol level — no equivalent

  ─── Timeline ───────────────────────────────────────────────────────
  Read input event → produce output event + commit offset in one atomic transaction
    If crash anywhere in this step → transaction rolled back → restarted, no duplicate
  ────────────────────────────────────────────────────────────────────
  No loss. No duplicates. ONLY works for Kafka→Kafka operations.
  For DB writes, HTTP calls: not truly exactly-once.
```

### Real-World Reality Check

```
Claim: "We have exactly-once semantics"
Reality check: does 'exactly-once' include ALL side effects?

KAFKA TRANSACTION does NOT prevent:
  - Paying a payment gateway twice (HTTP call is not rollback-able)
  - Inserting to a DB twice (DB write not part of Kafka transaction)
  - Sending an email twice (email sends are not transactional)

Example: consumer reads payment.processed event
  → calls payment gateway API (side effect 1)
  → inserts to ledger DB (side effect 2)
  → produces to fraud.check topic (side effect 3 — in Kafka)
  → commits Kafka offset

Kafka transaction covers ONLY side effect 3 and the offset commit atomically.
Side effects 1 and 2 are NOT covered.

True exactly-once across ALL side effects requires:
  - Idempotency for HTTP calls (idempotency key per request)
  - DB upsert or ON CONFLICT DO NOTHING for DB writes
  - These are at-least-once + idempotency — not true exactly-once
  - And THAT is what production systems actually implement
```

---

## 4. The Code

### Kafka — At-Most-Once (not recommended for business events)

```yaml
# application.yml — at-most-once (metrics, logging — loss acceptable)
spring:
  kafka:
    producer:
      acks: 0                      # fire and forget — no broker confirmation
    consumer:
      enable-auto-commit: true
      auto-commit-interval: 1000   # commit every 1s regardless of processing
```

```java
// ❌ WRONG for business events — loss is silent:
// Auto-commit fires on timer, not tied to processing success.
// App crashes between auto-commit and processing → loss.
@KafkaListener(topics = "metrics.raw", groupId = "metrics-collector")
public void collectMetric(MetricEvent event) {
    metricsStore.record(event);  // If this fails after commit, event lost silently
}
```

### Kafka — At-Least-Once (production standard)

```yaml
# application.yml — at-least-once (business events)
spring:
  kafka:
    producer:
      acks: all
      retries: 2147483647
      enable-idempotence: true
    consumer:
      enable-auto-commit: false
    listener:
      ack-mode: MANUAL_IMMEDIATE
```

```java
// ✅ RIGHT: Manual ack AFTER processing — at-least-once semantics
@KafkaListener(topics = "payment.processed", groupId = "settlement-group")
public void processPayment(
        @Payload PaymentEvent event,
        Acknowledgment acknowledgment) {

    // 1. Idempotency check first — handle re-delivery gracefully
    if (settlementRepository.existsByPaymentId(event.getPaymentId())) {
        log.info("Duplicate payment event, skipping: {}", event.getPaymentId());
        acknowledgment.acknowledge();  // ack to advance offset — already processed
        return;
    }

    // 2. Process
    settlementService.settle(event);

    // 3. Ack ONLY after successful processing
    // If crash here (before ack): re-delivered on restart
    // Idempotency check in step 1 handles the re-delivery
    acknowledgment.acknowledge();
}
```

### Kafka — Exactly-Once (Kafka-to-Kafka only)

```java
// Exactly-once: read from input topic, write to output topic atomically
@Configuration
@EnableKafka
public class ExactlyOnceProducerConfig {

    @Bean
    public ProducerFactory<String, Object> exactlyOnceProducerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        config.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "my-transactional-producer");
        config.put(ProducerConfig.ACKS_CONFIG, "all");
        return new DefaultKafkaProducerFactory<>(config);
    }
}
```

```java
// Transactional Kafka produce + offset commit atomically
@Service
public class ExactlyOnceProcessor {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void processAndForward(ConsumerRecord<String, PaymentEvent> record) {
        kafkaTemplate.executeInTransaction(operations -> {
            // Process input event
            SettlementEvent settlement = SettlementEvent.from(record.value());

            // Produce to output topic
            operations.send("settlement.processed", record.key(), settlement);

            // Commit input offset as part of transaction
            // Both the output message and the offset commit succeed or both roll back
            operations.sendOffsetsToTransaction(
                Map.of(new TopicPartition(record.topic(), record.partition()),
                    new OffsetAndMetadata(record.offset() + 1)),
                "settlement-group"
            );

            return null;
        });
    }
}
```

### RabbitMQ — At-Least-Once

```java
// ✅ RabbitMQ at-least-once: MANUAL ack after processing
@RabbitListener(queues = "payment.success.queue", ackMode = "MANUAL")
public void handlePayment(
        @Payload PaymentEvent event,
        Channel channel,
        @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {

    // Idempotency check
    if (ledgerRepository.existsByPaymentId(event.getPaymentId())) {
        channel.basicAck(deliveryTag, false);  // skip, advance
        return;
    }

    // Process and ack only on success
    ledgerService.record(event);
    channel.basicAck(deliveryTag, false);     // at-least-once: ack after processing
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Classic
**Interviewer asks:** "What is the difference between at-least-once and exactly-once delivery semantics?"

**Hruday's answer:**
> At-least-once guarantees the message is always delivered and processed — but may be delivered more than once if the consumer crashes after processing but before committing the offset/ack. The solution is to make the consumer idempotent: if the same message arrives twice, the second processing is a no-op. In practice: this is what most production systems use.
>
> Exactly-once guarantees each message is processed exactly once — no loss, no duplicates. In Kafka this is achievable only within Kafka — using transactions that atomically commit the output message to one topic AND the input offset for another topic. If either fails, both roll back. But as soon as your processing touches external systems — a database, an HTTP API, an email — you no longer have exactly-once semantics. The external call is not part of the Kafka transaction.
>
> The honest production answer: "We use at-least-once with idempotent consumers. We make idempotency checks before side effects. This is simpler, performant, and achieves the same business result as exactly-once — the customer is only charged once, the ledger is only updated once — without the limitations of Kafka transactions."

---

### Q2 — Scenario
**Interviewer asks:** "A consumer crashes after calling the payment gateway but before committing the Kafka offset. What happens? How do you handle it?"

**Hruday's answer:**
> This is the classic at-least-once re-delivery scenario. Since the offset was never committed, when the consumer restarts it reads the same message again. It calls the payment gateway again — the gateway charges the customer a second time. This is a duplicate charge — a P0 production incident for a payment platform.
>
> The prevention: idempotency key at the payment gateway call. Before calling the gateway: generate a deterministic idempotency key from the Kafka message — for example, `paymentId + "-" + partitionId + "-" + offset`. Pass this as the `Idempotency-Key` header to the gateway API (Stripe, Razorpay, etc. support this). If the same request arrives again with the same idempotency key, the gateway returns the previous result without charging again.
>
> For database writes: use `INSERT ... ON CONFLICT (payment_id) DO NOTHING`. The second attempt detects the unique constraint and skips silently.
>
> End result: at-least-once delivery is safe because every side effect is idempotent. The customer is charged once regardless of how many times the message is delivered. This is the standard at-least-once + idempotency combination that replaces the need for true exactly-once semantics.

---

### Q3 — Conceptual
**Interviewer asks:** "When would you choose at-most-once delivery?"

**Hruday's answer:**
> When the business cost of message loss is lower than the performance cost of guaranteed delivery. Classic examples: real-time metrics (if one metric data point is lost, the dashboard shows a slight gap — not a business problem), application log events (losing occasional log lines is acceptable — logs are diagnostic, not transactional), clickstream analytics (losing 0.1% of click events doesn't affect the aggregate analysis significantly), IoT sensor readings (missing one temperature reading out of thousands per hour is acceptable).
>
> The performance difference: at-most-once in Kafka (acks=0) can sustain 10x the throughput of at-least-once (acks=all). For firehose-style telemetry at millions of events/second, this throughput difference matters more than perfect delivery.
>
> Never use at-most-once for: financial events (payments, transactions, charges), order events (order placed, order cancelled), compliance/audit events, or any event where silent loss would result in an inconsistent system state.

---

### Q4 — Critical Thinking
**Interviewer asks:** "Kafka claims exactly-once semantics. Is that true in practice?"

**Hruday's answer:**
> Kafka exactly-once, introduced in Kafka 0.11 and called EOS (Exactly-Once Semantics), is real — but scoped. It uses producer idempotence (sequence numbers per partition to deduplicate producer retries) and Kafka transactions (atomic write + offset commit across partitions) to guarantee exactly-once delivery within the Kafka system — meaning messages produced by a transactional producer to output topics and consumer offsets committed by a consuming application are both written or both rolled back, atomically.
>
> What "exactly-once" does NOT cover: any operation OUTSIDE Kafka. When the consumer writes to a PostgreSQL database, sends an HTTP request to a payment gateway, or publishes an SNS notification — none of these are part of the Kafka transaction. A crash after the DB write but before the Kafka transaction commits: the DB write succeeded, the Kafka transaction rolled back, the input is re-delivered — the DB write happens twice.
>
> So in practice: Kafka EOS is exactly-once for pure Kafka pipelines (Kafka Streams topology where input and output are both Kafka topics). For microservices with external dependencies: Kafka EOS gives you exactly-once within Kafka (the message won't appear twice in the output Kafka topic) but you still need idempotency for every external side effect. The documentation is accurate but the applicability to most real-world microservice patterns is narrower than it sounds.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Kafka exactly-once solves all duplicate problems" | "If I enable Kafka transactions, I never worry about duplicates" | "Kafka transactions prevent duplicates only in Kafka-to-Kafka data flows. If your consumer calls an HTTP API, writes to PostgreSQL, sends an email, or makes any external call — those are NOT covered by Kafka transactions. Exactly-once at the broker level doesn't make your application exactly-once. The only valid approach for real-world consumers: at-least-once delivery + idempotent side effects for EVERY external operation." |
| "At-least-once is all you need — duplicates are fine" | "We handle duplicates with try-catch and move on" | "Unhandled duplicates are silent correctness bugs. A duplicate payment charge is a customer complaint, a chargeback, and potentially a regulatory issue. A duplicate ledger entry corrupts financial reports. The fix isn't 'tolerate duplicates' — it's 'make each operation idempotent so duplicates cause no harm.' The idempotency check (DB unique constraint, Redis SETNX, payment gateway idempotency key) is NOT optional for at-least-once systems handling business events." |
| "Commit offset before processing = at-most-once is safe" | "In metrics services, commit before processing to avoid re-reads" | "Committing before processing IS at-most-once — and it's safe ONLY for the stated use case (metrics, telemetry). The danger is applying this pattern to business events 'to avoid duplicates' without understanding the trade-off. A developer who adds commit-before-processing to a payment consumer to 'solve the duplicate payment problem' has introduced silent payment loss — much worse than duplicate charges. Always match the semantic to the data's business impact. Metrics: at-most-once is fine. Payments: only at-least-once + idempotency." |

---

## 7. Hruday's Real Experience Hook

> "At Capgemini, the Node.js services processed payment webhooks using an HTTP endpoint without any idempotency. Stripe would retry the webhook if our endpoint didn't return 200 within 5 seconds. Under load, the endpoint sometimes returned 500 before processing completed, triggering a retry. Result: the same webhook event processed twice — order marked fulfilled twice, notification sent twice, loyalty points doubled. The fix was adding Redis SETNX with the Stripe event ID as the key — first arrival sets the key and processes; retry finds the key already set and skips. That's at-least-once + idempotency in practice. The same pattern applies to Kafka consumers — just the delivery mechanism (Stripe webhook → Kafka message) and idempotency check mechanism are the same."

---

## 8. Scale Evolution

**1,000 users →** Manual ack + simple DB unique constraint idempotency check is sufficient. Kafka acks=all. Retry on transient failures.

**100,000 users →** Idempotency check performance matters — Redis SETNX (O(1)) is faster than DB unique constraint check for high-volume consumers. DLQ for permanent failures. Monitor re-delivery rate as a metric.

**10 million users →** At-least-once + idempotency at all levels. Kafka producer idempotence (`enable.idempotence=true`) to prevent producer-side duplicates from retries. Consumer idempotency for external side effects. Kafka transactions for pure Kafka pipeline stages if needed. Exactly-once EOS only where the full pipeline is Kafka-to-Kafka (Kafka Streams use case).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment events must be exactly-once in business effect — customer charged once. Implementation: at-least-once + idempotency key to payment gateway + DB UPSERT. | "How do you prevent duplicate charges in a Kafka-based payment processing service with at-least-once delivery?" |
| Swiggy / Meesho | Order confirmation must happen exactly once. At-least-once delivery is used; idempotency at DB level prevents duplicate order creation. | "Your order consumer re-processes the same order event on restart. How do you prevent duplicate order creation in the database?" |
| Adobe / Microsoft | Asset processing (PDF render, video transcode) should happen exactly once per version. At-least-once + idempotency key per asset version in the job queue. | "How do you ensure a document is rendered exactly once even if the processing service crashes mid-render?" |
| SAP Labs (current) | Financial document posting must happen once. Oracle XA transactions in legacy system. New microservice layer: at-least-once + DB unique constraint on document ID. | "Your financial document posting consumer received the same event twice due to a rebalance. How do you ensure the document is posted to the ledger exactly once?" |

---

## 10. Related Topics — What to Study Next

- **Topic 121 — Idempotent Consumers** — this topic introduces the concept; Topic 121 goes deep on the implementation patterns (DB unique constraint, Redis SETNX, UPSERT, idempotency key) that make at-least-once delivery safe
- **Topic 109 — Kafka Consumer At-Least-Once vs Exactly-Once** — the Kafka-specific implementation details (transactional.id, isolation.level=read_committed, sendOffsetsToTransaction) for the exactly-once case covered conceptually here
- **Topic 79 — Outbox Pattern** — reliable event publishing from a database transaction using the transactional outbox pattern is the producer-side implementation of at-least-once semantics; prevents the "wrote to DB, failed to publish to Kafka" scenario
- **Topic 76 — Saga Pattern** — distributed transactions across microservices use at-least-once + idempotent compensating transactions; the delivery semantics from this topic are foundational to understanding saga reliability guarantees

---

*Part 6 · At-Most-Once vs At-Least-Once vs Exactly-Once · Full Stack Interview Guide · Hruday D · 2026*
