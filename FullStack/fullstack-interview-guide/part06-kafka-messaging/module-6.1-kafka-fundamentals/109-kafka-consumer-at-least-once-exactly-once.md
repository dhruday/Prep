# Kafka Consumer — At-Least-Once vs Exactly-Once
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Three delivery guarantees exist in distributed messaging: **at-most-once** (may lose events, never duplicates), **at-least-once** (may duplicate events, never loses), **exactly-once** (no loss, no duplicates — hardest to achieve).
- Kafka's default consumer behaviour is **at-least-once**: after processing an event, the consumer commits the offset. If the consumer crashes after processing but before committing, Kafka re-delivers the same event. Your consumer code runs twice. This is fine IF your consumer is **idempotent** (safe to run many times — same result every time).
- **At-most-once** is achieved by committing the offset BEFORE processing. The consumer claims "I've handled this" and then processes. If it crashes during processing, the event is gone — never re-delivered. Use only for non-critical data where loss is acceptable.
- **Exactly-once** inside Kafka (Kafka Transactions) is possible with `transactional.id` on the producer + `isolation.level=read_committed` on the consumer. This guarantees an event is written to an output topic exactly once. But this is limited to Kafka-to-Kafka processing (Kafka Streams). Cross-system exactly-once (Kafka → DB → third service) is practically impossible — use at-least-once + idempotent consumers instead.
- The practical production answer: **at-least-once + idempotent consumers**. Design every consumer to handle duplicate delivery gracefully — check if the event was already processed before acting. This covers 99% of real-world needs without the complexity of Kafka transactions.
- Gap to bridge: many candidates answer "use exactly-once" for reliability without understanding it's limited to Kafka-to-Kafka operations, or that it requires significant extra configuration that adds latency.

---

## 1. One-Line Definition
Kafka consumer delivery semantics determine whether an event can be lost (at-most-once), delivered multiple times (at-least-once), or delivered exactly once — where the practical production choice is at-least-once delivery with idempotent consumer logic that safely handles duplicates.

---

## 2. The Problem It Solves

A payment service consumes `payment.initiated` events from Kafka and calls the payment gateway. The gateway charges the customer's card. You need this to happen exactly once per event.

At-most-once: the consumer auto-commits immediately after reading (before processing). The event offset is committed — "done." Consumer then calls the payment gateway. Gateway call fails. You never retry because the offset is committed and Kafka won't re-deliver. Customer never gets charged. Silent payment failure.

At-least-once (incorrectly handled): consumer calls the gateway, commits offset after success. On retry after a crash: the gateway is called again for the same payment. If the gateway is not idempotent, the customer gets charged twice.

At-least-once (correctly handled): consumer calls the gateway, checks first if this payment was already processed (idempotency check using the payment ID), only charges if not already done, commits offset. On re-delivery: idempotency check detects the duplicate — skips the charge. Offset committed. Net result: customer charged exactly once.

This is why the real answer in production is not "use exactly-once Kafka semantics" — it's "use at-least-once processing + design your consumer to be idempotent."

---

## 3. How It Works Internally

### The Mental Model
Think of a Kafka consumer like a factory worker reading from a conveyor belt. The worker picks up an item, processes it, then stamps it "done" (commits offset). If the conveyor stamp is done BEFORE the worker processes the item and the worker drops it — the item is gone (at-most-once). If the stamp is done AFTER processing but the worker drops the item after processing but before stamping — the conveyor sends the item again (at-least-once). If you design the worker to check "did I already process this item?" before doing anything — re-delivery has no effect (idempotent at-least-once).

### The Three Semantics — Mechanism

```
AT-MOST-ONCE:
  1. Poll event from Kafka
  2. Commit offset immediately (before processing)
     → Kafka marks this event as "consumed"
  3. Process the event
  
  What happens on crash after step 2, during step 3:
  → Event offset was committed. Kafka won't re-deliver.
  → Processing never completed.
  → LOST EVENT.
  
  When acceptable: fire-and-forget metrics, analytics you can afford to miss

──────────────────────────────────────────────────────────────────────────────

AT-LEAST-ONCE (default, most common):
  1. Poll event from Kafka
  2. Process the event (call DB, call API, compute result)
  3. Commit offset ONLY after successful processing
  
  What happens on crash during step 2, before step 3:
  → Offset not committed. Kafka re-delivers the event to the next consumer.
  → Processing may have partially completed (wrote to DB, but didn't send email)
  → Event is re-delivered. Processing runs again.
  → POTENTIAL DUPLICATE PROCESSING.
  
  Solution: idempotent consumer
  Before step 2: check if this event was already processed.
  If yes: skip processing, commit offset. Done.
  If no: process, then commit offset.

──────────────────────────────────────────────────────────────────────────────

EXACTLY-ONCE (Kafka Transactions — Kafka-to-Kafka only):
  Requires:
    Producer: transactional.id set, initTransactions() called
    Consumer: isolation.level=read_committed
  
  What it guarantees:
  Writing to output topic X and committing the input offset
  happen atomically. Either both succeed or both abort.
  
  No partial writes: if the producer crashes during a transaction,
  the transaction is automatically aborted on recovery.
  Consumers with read_committed NEVER see uncommitted events.
  
  What it DOES NOT guarantee:
  - Exactly-once writes to an external DB (PostgreSQL, Redis)
  - Exactly-once HTTP calls to a payment gateway
  - Any side effect outside of Kafka
  
  Use when: Kafka Streams processing where input and output are both Kafka topics.
  Do NOT use as a replacement for idempotent consumer design.
```

### Idempotent Consumer — How It Works

```
IDEMPOTENCY KEY:
  Every event has a unique, stable identifier.
  For payments: paymentId
  For order events: orderId + eventType + timestamp (or a UUID in the event)
  For user registrations: userId or email

IDEMPOTENCY CHECK PATTERNS:

PATTERN 1 — Database deduplication table:
  Before processing, run:
    SELECT id FROM processed_events WHERE event_id = :eventId
  If found: skip, commit offset.
  If not found: process, INSERT into processed_events, commit offset.
  Drawback: extra DB query per event. Use a unique constraint + INSERT ignore.

PATTERN 2 — Idempotent operation design:
  Use UPSERT (INSERT ... ON CONFLICT DO NOTHING or UPDATE):
    "Set user registration_completed = true WHERE userId = :id"
  Running this 10 times produces the same result as running it once.
  No separate deduplication table needed.

PATTERN 3 — Natural idempotency:
  Some operations are inherently idempotent:
  - PATCH product:42 price=999 (same result every time — idempotent)
  - Sending a notification for "order delivered" (once sent is enough,
    but: check notifications table for existing record for this orderId+type)

PATTERN 4 — Redis deduplication with TTL:
  SETNX processed:payment:{paymentId} 1 EX 86400
  If 0 (already exists): skip.
  If 1 (newly set): process.
  Fast O(1) check. TTL auto-cleans old entries.
  Risk: Redis restart loses dedup state → brief window of possible duplicates.
```

### ASCII Diagram — At-Least-Once with Idempotency

```
KAFKA TOPIC: payment.initiated
  Offset 42: {paymentId: "pay-999", amount: 500, userId: "u-42"}

CONSUMER (payment-processor group):

Step 1: Poll event at offset 42
        {paymentId: "pay-999", ...}

Step 2: Check idempotency
        SELECT * FROM processed_payments WHERE payment_id = 'pay-999'
        → Not found → proceed

Step 3: Call payment gateway
        → Charges customer ₹500
        → Returns success

Step 4: Mark as processed
        INSERT INTO processed_payments (payment_id, processed_at) VALUES (...)

Step 5: Commit offset 42 to Kafka

─── CRASH SCENARIO ───────────────────────────────────────────────────────────

Step 3: Call payment gateway → SUCCESS
Step 4: → CRASH before INSERT or commit

On restart:
  Kafka re-delivers offset 42: {paymentId: "pay-999", ...}

Step 2 (again): SELECT * WHERE payment_id = 'pay-999'
               → Still not found (INSERT never completed before crash)
               → Proceeds again → GATEWAY CALLED AGAIN

↑ This is why the GATEWAY must be idempotent or use idempotency keys.
  Pass paymentId as the idempotency key to the gateway:
  Gateway: "I already have a charge for pay-999 → return previous result"
  No double-charge.

ALTERNATIVELY:
  Wrap Steps 3+4 in a database transaction:
  BEGIN;
    Insert into processed_payments (payment_id) VALUES ('pay-999')
    -- ON CONFLICT DO NOTHING (if already exists, this is a no-op)
  COMMIT;
  IF rows_affected = 0: skip gateway call (already processed)
  IF rows_affected = 1: call gateway, then commit Kafka offset
```

---

## 4. The Code

### Wrong Way — Auto-Commit (At-Most-Once)

```java
// Wrong for business-critical events: auto-commit commits offset BEFORE processing
@KafkaListener(topics = "payment.initiated", groupId = "payment-processor")
public void processPayment(PaymentEvent event) {
    // By the time this method body runs, Spring Kafka (with auto-commit=true)
    // may have already committed the offset for this record.
    // If this method throws an exception or the process crashes:
    // → offset already committed
    // → Kafka never re-delivers
    // → payment silently lost
    paymentGateway.charge(event.getAmount(), event.getUserId());
}
```
> **Why this fails in production:** `enable-auto-commit=true` (the default in many configurations) commits offsets every 5 seconds regardless of processing outcome. A consumer crash after offset commit but before processing completes silently loses events. For payment processing, this is unacceptable.

### Right Way — Manual Commit with Idempotency

```java
@Service
public class PaymentConsumer {

    private final PaymentGateway paymentGateway;
    private final ProcessedPaymentRepository processedPaymentRepository;

    @KafkaListener(
        topics = "payment.initiated",
        groupId = "payment-processor",
        containerFactory = "manualAckKafkaListenerContainerFactory"
    )
    public void processPayment(
        PaymentEvent event,
        Acknowledgment acknowledgment
    ) {
        String paymentId = event.getPaymentId();

        // IDEMPOTENCY CHECK FIRST — before ANY work
        // If we've processed this payment before (crash recovery re-delivery):
        //   don't charge again, just commit the offset and move on.
        if (processedPaymentRepository.existsByPaymentId(paymentId)) {
            log.info("Duplicate delivery for paymentId={}. Skipping.", paymentId);
            acknowledgment.acknowledge(); // safe to commit — already processed
            return;
        }

        try {
            // Call gateway with idempotency key = paymentId
            // Gateway will return the original result if paymentId was already charged.
            GatewayResult result = paymentGateway.charge(
                event.getAmount(),
                event.getUserId(),
                paymentId  // idempotency key passed to external gateway
            );

            // Persist result + mark as processed in one transaction
            processedPaymentRepository.save(
                ProcessedPayment.builder()
                    .paymentId(paymentId)
                    .gatewayRef(result.getReference())
                    .processedAt(Instant.now())
                    .build()
            );

            // Commit offset ONLY after successful processing AND DB save
            acknowledgment.acknowledge();

            log.info("Payment {} processed successfully. Ref={}", paymentId, result.getReference());

        } catch (GatewayException e) {
            // Don't acknowledge — Kafka will re-deliver after session.timeout.ms
            // Spring Retry or RetryTopics will handle back-off retries
            log.error("Gateway error for paymentId={}. Will retry.", paymentId, e);
            // DO NOT call acknowledgment.acknowledge() — triggers re-delivery
        }
    }
}
```

### Right Way — Kafka Transactions (Kafka-to-Kafka, Exactly-Once)

```java
// Use case: Kafka Streams — read from input topic, write to output topic exactly once
// NOT for writing to databases or calling external APIs

@Configuration
public class KafkaTransactionalConfig {

    @Bean
    public ProducerFactory<String, Object> transactionalProducerFactory(
        KafkaProperties properties
    ) {
        Map<String, Object> props = new HashMap<>(properties.buildProducerProperties());
        // Unique transactional ID per producer instance
        // For multi-instance: append hostname or pod name to make it unique
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "payment-transformer-0");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public ConsumerFactory<String, Object> committedOnlyConsumerFactory(
        KafkaProperties properties
    ) {
        Map<String, Object> props = new HashMap<>(properties.buildConsumerProperties());
        // read_committed: consumer only sees events whose transactions were committed.
        // Prevents seeing "in-flight" events from an aborted transaction.
        props.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");
        return new DefaultKafkaConsumerFactory<>(props);
    }
}

// Kafka-to-Kafka transformation with exactly-once semantics:
@Service
public class PaymentTransformer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    // This is EXACTLY-ONCE: read from input AND write to output atomically.
    // Either both happen or neither. No partial writes to the output topic.
    @Transactional
    public void transformAndForward(PaymentEvent inputEvent) {
        EnrichedPaymentEvent output = enrichPayment(inputEvent);
        // This write to the output topic is part of: the same transaction
        // that will also atomically commit the input offset.
        // Consumer with isolation.level=read_committed won't see this
        // until the transaction commits.
        kafkaTemplate.send("payment.enriched", inputEvent.getPaymentId(), output);
        // Spring Kafka + @Transactional will commit the offset and the
        // Kafka topic write atomically on method return.
    }
}
```

### application.yml — Consumer Settings for At-Least-Once

```yaml
spring:
  kafka:
    consumer:
      group-id: payment-processor
      auto-offset-reset: earliest
      # CRITICAL: disable auto-commit for at-least-once with manual control
      enable-auto-commit: false
      
    listener:
      # MANUAL_IMMEDIATE: offset committed when Acknowledgment.acknowledge() is called
      ack-mode: MANUAL_IMMEDIATE
      # concurrency: number of consumer threads (max = partition count)
      concurrency: 6

    # For exactly-once Kafka transactions (Kafka-to-Kafka only)
    # consumer:
    #   isolation-level: read_committed
    # producer:
    #   transaction-id-prefix: tx-payment-
```

> **Key decisions here:**
> - Idempotency check BEFORE processing — not after — to avoid any work before confirming it's a new event
> - Pass the event's unique ID as the idempotency key to external APIs (payment gateway, email service) — this delegates duplicate detection to the external system
> - Kafka transactions (`@Transactional` on a Kafka-sending method) work only for Kafka → Kafka operations — never assume they protect external DB writes
> - On non-retryable errors (invalid data, fraud rejection): acknowledge the offset and send to Dead Letter Topic — never block a partition by not acknowledging permanent failures

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is at-least-once delivery in Kafka and how do you make it safe?"

**Hruday's answer:**
> At-least-once means every event is processed at least once — possibly more than once if the consumer crashes after processing but before committing the offset. Kafka re-delivers the event to the restarted consumer.
>
> How it happens: a consumer reads an event, processes it — say, charging a payment — and then commits the offset. If the consumer crashes after the charge but before the commit, the offset isn't saved. On restart, Kafka sees the last committed offset and re-delivers the same event. The consumer processes it again. Without a safeguard, the customer gets charged twice.
>
> To make it safe: design the consumer to be idempotent. Before doing any work, check whether this event was already processed. A common pattern is a `processed_events` table with a unique constraint on the event ID. Try to insert the event ID — if the insert fails with a unique constraint violation, this is a duplicate, skip processing. If it succeeds, proceed with the work.
>
> Alternatively, pass the event's unique ID as an idempotency key to external systems — payment gateways, email services — that natively support idempotency. The gateway returns the original result if the key was already processed.
>
> At-least-once plus idempotent consumers is the industry-standard pattern for reliable event processing. It's simpler than Kafka exactly-once transactions and works across external systems.

---

### Q2 — Deep Dive
**Interviewer asks:** "When would you use Kafka exactly-once semantics and what does it NOT protect against?"

**Hruday's answer:**
> Kafka exactly-once semantics (EOS) use transactions to atomically write an event to an output topic AND commit the input offset. Either both happen or neither. This guarantees the output event appears exactly once in the output topic, even if the producer crashes mid-transaction.
>
> The right use case is Kafka Streams processing: read from input topic, transform, write to output topic. Example: payment events flow through a fraud-scoring job — read raw payment events, compute fraud score, write enriched events to an enriched-payments topic. With EOS, no event appears twice in enriched-payments even on consumer restarts.
>
> What EOS does NOT protect: any side effect outside of Kafka. If your consumer job calls a payment gateway, sends an email, or writes to PostgreSQL — these happen inside the Kafka transaction. The Kafka transaction commits successfully. But the HTTP call to the gateway happened before the Kafka commit — it already went through. If you need to roll back due to a downstream failure, you can't undo the HTTP call. Kafka transactions have no awareness of external systems.
>
> This is why exactly-once is primarily a Kafka-to-Kafka guarantee. For any processing involving external APIs, network calls, or database writes — use at-least-once delivery plus idempotent consumer logic. The idempotency check is your protection at the application layer, and it works regardless of what external systems the consumer calls.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Is it possible to achieve true exactly-once processing when consuming Kafka events and writing to a PostgreSQL database?"

**Hruday's answer:**
> True exactly-once across Kafka and PostgreSQL requires coordinating two separate distributed systems — a two-phase commit. This is theoretically possible with XA transactions (a standard for distributed transactions), but Kafka's XA support is limited and XA transactions are slow, error-prone, and create tight coupling between two systems that should be independently scalable.
>
> The practical, production-proven answer: achieve effectively-once using at-least-once delivery plus idempotent writes to PostgreSQL. Write with a unique constraint on the event ID column. Use INSERT ... ON CONFLICT DO NOTHING. If the event was already written, the insert is a no-op, the function returns without error, and the Kafka offset is committed. The end result: exactly one row in PostgreSQL per event, even under re-delivery.
>
> The pattern: within a single PostgreSQL transaction, insert into the idempotency table AND perform the business write. Either both commit or both roll back. If both commit: acknowledge the Kafka offset. If PostgreSQL fails: don't acknowledge — Kafka re-delivers — the PostgreSQL transaction rolled back — idempotency table has no entry — next delivery processes fresh.
>
> This approach — exactly-once database semantics via idempotent writes — is what Stripe, Razorpay, and distributed systems literature recommend. It's simpler than distributed transactions and just as correct for the goal of "process each event exactly once."

---

### Q4 — Scenario
**Interviewer asks:** "A consumer processes notification events. It reads an event, sends a push notification, and commits the offset. What happens if the process crashes between sending the notification and committing the offset?"

**Hruday's answer:**
> The notification is already sent — the FCM/APNs push call completed successfully. The offset is not committed. On restart, Kafka re-delivers the same event. The consumer sends the push notification again. The user gets two identical "Your order is on its way!" notifications.
>
> This is at-least-once delivery materialising as a duplicate push notification. It's a bad user experience but not a financial or data corruption problem, which is why notifications are actually a case where the trade-off is often accepted.
>
> To prevent it: idempotency check before sending. Maintain a sent_notifications table with a unique key on (eventId, notificationType). Before calling FCM: check if a row exists. If yes: skip, commit offset. If no: send push, insert row, commit offset.
>
> But — can the consumer crash between INSERT and offset commit? Yes. On next delivery: INSERT fails with unique constraint (already sent). Skip FCM call. Commit offset. User gets the notification exactly once.
>
> In practice, many teams accept duplicate push notifications on consumer restarts because: (1) consumer restarts are rare, (2) duplicate "your order is delivering" is a minor annoyance not a serious problem. They skip the deduplication table to avoid the extra DB write per notification. The decision depends on how harmful the specific duplicate is. Financial events: idempotency is mandatory. Push notifications for status updates: acceptable to tolerate rare duplicates.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Just use Kafka exactly-once — problem solved" | "Enable exactly-once semantics and all my consumer logic is safe" | "Kafka exactly-once is scoped to Kafka-to-Kafka writes only. Any call to a REST API, database write, email send, or Redis update is OUTSIDE the Kafka transaction and is NOT covered by EOS. If your consumer calls a payment gateway within a 'Kafka transaction', the charge goes through even if the Kafka transaction later aborts. EOS is for Kafka Streams — compute over a Kafka topic and write results to another Kafka topic. For all other processing: at-least-once + idempotent consumer." |
| "Auto-commit is fine for reliability" | "I'll leave auto-commit enabled — Kafka manages the offsets" | "Auto-commit commits the offset every 5 seconds regardless of processing outcome. A crash at second 4 of the 5-second window means offsets for all events processed in the last 4 seconds are NOT committed. All re-delivered. But a crash at second 6 means offsets were auto-committed while the processing code was still running. Those events are silently lost. Auto-commit gives you at-best-effort semantics — neither reliable at-least-once NOR at-most-once. For any production consumer, use manual offset commit." |
| "Idempotency check is too slow for high throughput" | "Checking a DB table for every event will bottleneck my consumer" | "The idempotency check can be made very fast. A unique constraint on the event_id column in PostgreSQL allows 'INSERT ... ON CONFLICT DO NOTHING' — this is a single indexed lookup and potential no-op. At 10K events/sec, this adds less than 1ms per event if the index is in memory. Alternatively: a Redis SETNX check is O(1) at sub-millisecond speeds. The idempotency check is rarely the bottleneck — the business logic (payment gateway call, email send) is. Don't skip idempotency for perceived performance." |
| "Consumer groups provide exactly-once" | "Each message is consumed by exactly one consumer in the group — so it's processed exactly once" | "Consumer groups partition events: each partition is read by exactly one consumer in the group. This prevents CONCURRENT duplicate processing (two consumers reading the same event simultaneously). But it does nothing to prevent SEQUENTIAL duplicates from re-delivery after consumer restarts. The same consumer reads the same event twice on restart. Consumer groups give you no-concurrent-duplicates, not no-duplicates-ever. Sequential duplicates from re-delivery require idempotent consumer logic." |

---

## 7. Hruday's Real Experience Hook

> "At-least-once delivery design maps directly to how I've designed REST API idempotency at Oracle. PUT /journals/{id}/post was designed to be safe to call multiple times — retry the same POST and you get the same result, not a duplicate journal entry. The same thinking applies to Kafka consumers: if Kafka re-delivers a payment event because my consumer crashed before committing the offset, my consumer should behave exactly like a well-designed idempotent REST endpoint — check if the work was already done, skip if yes, proceed if no. The principle is identical; only the trigger for 'was this already done?' moves from HTTP retry-after response to Kafka re-delivery."

---

## 8. Scale Evolution

**1,000 users →** At-least-once with a simple DB unique-constraint idempotency check. Consumer lag monitoring via Kafka admin CLI. Manual offset commit in the consumer.

**100,000 users →** Idempotency Redis check (O(1) sub-ms) replaces DB check for high-frequency events. Separate the idempotency check from the business logic — a decorator pattern. Monitor consumer lag per partition and alert on lag > 30s. Retry topics for transient failures.

**10 million users →** Multi-partition topics with concurrent consumers. Idempotency at multiple levels: Redis for fast dedup, DB constraint as catch-all. Dead letter topics for permanent failures with alerting. Kafka consumer lag as an autoscaling signal (K8s HPA scales consumer pods based on lag metric). Kafka exactly-once enabled for the pure Kafka Streams pipeline layer (enrichment, aggregation) while the DB-writing layer uses at-least-once + idempotency.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment processing cannot tolerate double-charges OR missed charges. At-least-once + idempotent payment consumers is the core architecture. Idempotency key design for external gateway calls is a first-order interview topic. | "Walk through EXACTLY what happens — commit sequence, gateway call, DB write — when your payment consumer restarts mid-processing." |
| Swiggy / Meesho | Notification consumers (SMS, push) for order status. At what point do you commit? What happens on crash? Do you tolerate duplicate notifications or not? | "Your consumer sends an SMS, then commits. Crashes before commit. User gets the SMS twice. Is this acceptable and how would you prevent it?" |
| Adobe / Microsoft | Document processing pipelines — large batch jobs consuming Kafka events. Exactly-once for intermediate Kafka-to-Kafka stages. Idempotent writes to storage for the final consumer. | "How do you guarantee a large file conversion job (Kafka event → conversion → write to S3) doesn't produce duplicate output files on consumer restart?" |
| SAP Labs (current) | Financial document posting is a perfect at-least-once + idempotent consumer problem. Post the same document twice = accounting error. Idempotency via document number unique key. | "How would you design the Kafka consumer for financial document posting to guarantee exactly one DB insert per document event?" |

---

## 10. Related Topics — What to Study Next

- **Topic 108 — Kafka Producer (acks, idempotence)** — producer-side idempotence prevents duplicate events from being written; combined with consumer-side idempotency it closes the full loop
- **Topic 112 — Kafka Error Handling and Dead Letter Queues** — the next topic in this module; what to do when a consumer permanently fails to process an event (retry limits, DLT, alerting)
- **Topic 79 — Outbox Pattern** — Part 4; ensures the event was reliably published in the first place — the producer-side companion to consumer idempotency
- **Topic 121 — Idempotency Design** — Module 6.4; full treatment of idempotent consumer patterns including database-based, Redis-based, and natural idempotency approaches

---

*Part 6 · Kafka Consumer — At-Least-Once vs Exactly-Once · Full Stack Interview Guide · Hruday D · 2026*
