# Idempotency — Designing Idempotent Consumers
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Idempotent consumer**: a consumer that produces the same outcome regardless of how many times the same message is delivered. Process a payment event once → customer charged once. Process it again (re-delivery) → idempotency check fires → customer NOT charged again. The correct output is the same whether the message was processed 1 time or 10 times.
- **Why it's needed**: at-least-once delivery (the production standard) guarantees no message loss but allows re-delivery. If your consumer is not idempotent, re-delivery = duplicate business effect (double charge, double order, double email).
- **Three main patterns**:
  1. **DB unique constraint**: `INSERT INTO payments(payment_id, ...) ON CONFLICT (payment_id) DO NOTHING`. Natural and durable. Relies on RDBMS constraint enforcement.
  2. **Redis SETNX with TTL**: `SET idempotency:{id} "1" NX EX 86400`. O(1), fast. Use for high-volume events where a DB constraint check would be too slow.
  3. **UPSERT**: `INSERT ... ON CONFLICT DO UPDATE SET ... = EXCLUDED....`. When you want to write AND ensure idempotency — use UPSERT instead of INSERT. The write either creates a new row or updates the existing one with the same result.
- **Idempotency key selection**: the key must uniquely identify the message IN BUSINESS TERMS. In Kafka: `topic + partition + offset` uniquely identifies a message, but a `paymentId` is more semantically meaningful and survives schema changes. Use the business entity ID as the idempotency key.
- **Danger zone**: idempotency only protects side effects inside your service. External HTTP calls (payment gateway, email API) need their own idempotency keys passed as request headers. The idempotency guarantee is only as wide as you explicitly engineer it.

---

## 1. One-Line Definition
An idempotent consumer detects and safely handles re-delivered messages — using techniques like database unique constraints, Redis deduplication, or UPSERT writes — so that processing the same event multiple times produces a single correct outcome and never a duplicated side effect.

---

## 2. The Problem It Solves

### The Re-delivery Reality

With at-least-once delivery (Kafka + manual ack, RabbitMQ + MANUAL ack mode):

```
Timeline of a crash scenario:

T=0s: Consumer receives payment.processed event (paymentId=PAY-001)
T=1s: Consumer calls payment gateway → customer charged ₹500 ✓
T=2s: Consumer inserts to ledger DB → ledgerEntry created ✓
T=3s: Consumer CRASHES before calling acknowledgment.acknowledge()

T=5s: Consumer restarts
T=6s: Kafka re-delivers payment.processed (paymentId=PAY-001) — same offset
T=7s: Consumer calls payment gateway again → customer charged ₹500 AGAIN ✗
T=8s: Duplicate ledger entry created ✗
T=9s: Consumer ACKs — offset committed

Result: Customer overcharged ₹500. DB has duplicate ledger row. P0 incident.
```

**Idempotent consumer with SETNX:**
```
T=6s: Consumer restarts, receives PAY-001 again
T=7s: Redis SETNX("idempotency:PAY-001") → returns 0 (key exists, set by T=1s)
T=8s: "Already processed" → skip payment gateway call
T=9s: "Already processed" → skip ledger insert
T=10s: ACK — offset committed. Correct.
```

### Common Sources of Re-delivery

In Kafka:
- Consumer crashes before ACK (offset not committed)
- Consumer group rebalance — partition reassigned mid-processing
- `auto.offset.reset=earliest` + new consumer group → re-reads from start
- Manual offset seek (ops procedure for replay)

In RabbitMQ:
- Consumer crashes before `basicAck`
- NACK with `requeue=true`
- Shovel/federation replaying messages across clusters
- Developer replay from DLQ after a bug fix

Every one of these scenarios can re-deliver a message to the same or different consumer instance.

---

## 3. How It Works Internally

### The Three Idempotency Patterns Compared

```
PATTERN 1 — DB Unique Constraint:
  Approach: message ID stored in DB as unique key; INSERT fails on duplicate
  Strengths: 
    - Durable (survives restart)
    - Atomic with business data (same DB transaction)
    - Self-cleaning with partition pruning or TTL
  Weaknesses:
    - Extra DB round-trip per message check
    - Only protects the DB write — not external HTTP calls
  Best for: low-to-medium volume events, financial data where durability matters

PATTERN 2 — Redis SETNX:
  Approach: set idempotency key in Redis with NX (Only If Not Exists) + TTL
  Strengths:
    - O(1) Redis write — extremely fast
    - No DB overhead per check
    - TTL = automatic cleanup of old keys
  Weaknesses:
    - Ephemeral: Redis restart clears keys (unless RDB/AOF enabled)
    - Separate write from business DB — not one atomic operation
    - TTL must be > potential re-delivery window (usually 24h-7 days)
  Best for: high-volume events where DB throughput is the bottleneck

PATTERN 3 — UPSERT:
  Approach: INSERT ... ON CONFLICT DO UPDATE instead of plain INSERT
  Strengths:
    - Single DB operation (no separate check)
    - Atomic — cannot fail due to race conditions
    - Naturally idempotent — same payload = same result whether it's insert or update
  Weaknesses:
    - Only protects the DB write — not external HTTP calls
    - Update semantics: if you UPSERT with new data, you may overwrite intentional updates
      (must ensure the conflict clause only writes the same data, not newer)
  Best for: entity state updates (user last-seen, device heartbeat, account balance)

PATTERN 4 — Idempotency Key to External API:
  Approach: generate deterministic idempotency key, pass in request header
  Strengths:
    - Protects external API calls from duplicate charges/actions
    - Supported by Stripe, Razorpay, Braintree, Twilio, etc.
  Weaknesses:
    - Key must be stored/deterministic for re-delivery to reuse same key
    - API provider must support idempotency keys
    - Check if idempotency key TTL on API side covers your re-delivery window
  Best for: payment gateway calls, SMS/email APIs, any idempotent external API
```

---

## 4. The Code

### Pattern 1 — DB Unique Constraint

```sql
-- Schema: add UNIQUE constraint on the business event identifier
CREATE TABLE payment_settlements (
    id              BIGSERIAL PRIMARY KEY,
    payment_id      VARCHAR(100) NOT NULL,     -- idempotency key
    amount          DECIMAL(10,2) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uk_payment_id UNIQUE (payment_id)
);
```

```java
@Service
public class PaymentSettlementService {

    private final SettlementRepository settlementRepository;

    // ❌ WRONG: Plain INSERT — duplicate payment_id throws DataIntegrityViolationException
    // Exception propagates → consumer retries → infinite duplicate attempts
    public void settleWrong(PaymentEvent event) {
        Settlement s = new Settlement(event.getPaymentId(), event.getAmount());
        settlementRepository.save(s);  // second call with same paymentId → exception
    }

    // ✅ RIGHT: Check-then-act with unique constraint as safety net
    @Transactional
    public void settle(PaymentEvent event) {
        // Fast path: check if already processed
        if (settlementRepository.existsByPaymentId(event.getPaymentId())) {
            log.info("Duplicate event skipped: paymentId={}", event.getPaymentId());
            return;  // idempotent: no-op on re-delivery
        }

        // Process payment gateway call first (idempotency key prevents double charge)
        String gatewayResponse = paymentGateway.charge(
            event.getPaymentId(),            // use paymentId as gateway idempotency key
            event.getAmount(),
            event.getCurrency()
        );

        // Insert settlement record — unique constraint prevents DB duplicate
        // even if two threads race past the existsByPaymentId check
        Settlement settlement = new Settlement(
            event.getPaymentId(), event.getAmount(), gatewayResponse);
        try {
            settlementRepository.save(settlement);
        } catch (DataIntegrityViolationException e) {
            // Race condition: another thread already inserted this paymentId
            // Treat as successful idempotent no-op — not a real error
            log.info("Concurrent duplicate for paymentId={} — already settled",
                event.getPaymentId());
        }
    }
}
```

### Pattern 2 — Redis SETNX Deduplication

```java
@Service
public class RedisIdempotencyService {

    private final StringRedisTemplate redisTemplate;

    private static final String KEY_PREFIX = "idempotency:";
    private static final Duration TTL = Duration.ofHours(24);  // cover max re-delivery window

    /**
     * Returns true if the key was newly set (first processing).
     * Returns false if the key already existed (duplicate — skip processing).
     */
    public boolean claim(String idempotencyKey) {
        Boolean claimed = redisTemplate.opsForValue().setIfAbsent(
            KEY_PREFIX + idempotencyKey,
            "1",          // value doesn't matter — just the key's existence
            TTL
        );
        return Boolean.TRUE.equals(claimed);
    }
}

@Service
public class NotificationService {

    private final RedisIdempotencyService idempotency;
    private final EmailSender emailSender;

    @KafkaListener(topics = "order.placed", groupId = "notification-group")
    public void sendOrderConfirmation(
            @Payload OrderPlacedEvent event,
            Acknowledgment acknowledgment) {

        String idempotencyKey = "order-confirm:" + event.getOrderId();

        if (!idempotency.claim(idempotencyKey)) {
            // Key already exists → this event was already processed
            log.info("Duplicate notification skipped: orderId={}", event.getOrderId());
            acknowledgment.acknowledge();
            return;
        }

        // First time processing this event
        emailSender.sendOrderConfirmation(event.getUserEmail(), event.getOrderId());
        acknowledgment.acknowledge();
    }
}
```

### Pattern 3 — UPSERT for Entity State Updates

```java
// JPA repository with native UPSERT query
public interface DeviceStateRepository extends JpaRepository<DeviceState, String> {

    @Modifying
    @Query(value = """
        INSERT INTO device_state (device_id, status, last_seen, battery_level)
        VALUES (:deviceId, :status, :lastSeen, :batteryLevel)
        ON CONFLICT (device_id) DO UPDATE SET
            status = EXCLUDED.status,
            last_seen = EXCLUDED.last_seen,
            battery_level = EXCLUDED.battery_level
        """, nativeQuery = true)
    void upsertDeviceState(
        @Param("deviceId") String deviceId,
        @Param("status") String status,
        @Param("lastSeen") Instant lastSeen,
        @Param("batteryLevel") int batteryLevel
    );
}

@Service
public class DeviceStateConsumer {

    private final DeviceStateRepository repository;

    @KafkaListener(topics = "device.heartbeat", groupId = "device-tracker")
    public void updateDeviceState(
            @Payload DeviceHeartbeatEvent event,
            Acknowledgment acknowledgment) {

        // UPSERT: idempotent by design
        // Re-delivering the same event writes the same values — no duplicate rows
        repository.upsertDeviceState(
            event.getDeviceId(),
            event.getStatus(),
            event.getTimestamp(),
            event.getBatteryLevel()
        );

        acknowledgment.acknowledge();
    }
}
```

### Pattern 4 — Idempotency Key to External API

```java
@Service
public class PaymentGatewayService {

    private final WebClient webClient;

    // ✅ Deterministic idempotency key: same input → same key → gateway returns cached result
    public GatewayResponse charge(PaymentEvent event) {
        // Key: use paymentId which is stable across re-deliveries
        // Do NOT use random UUID — would be different on each delivery
        String idempotencyKey = "charge:" + event.getPaymentId();

        return webClient.post()
            .uri("/v1/charges")
            .header("Idempotency-Key", idempotencyKey)  // Stripe/Razorpay specific header
            .bodyValue(Map.of(
                "amount",   event.getAmount(),
                "currency", event.getCurrency(),
                "source",   event.getPaymentMethodToken()
            ))
            .retrieve()
            .bodyToMono(GatewayResponse.class)
            .block();
        // If called twice with same Idempotency-Key: gateway returns the FIRST response
        // Customer charged once, response returned both times. Idempotent. ✓
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Definition
**Interviewer asks:** "What is an idempotent consumer and why is it important in a messaging system?"

**Hruday's answer:**
> An idempotent consumer processes the same message multiple times but produces the same business outcome as processing it once. It's important because at-least-once delivery — the standard production messaging guarantee — allows re-delivery of messages. If a consumer crashes after processing but before acknowledging, the message is re-delivered. Without idempotency: double processing causes duplicate business effects — double charges, duplicate orders, duplicate records.
>
> Idempotency is the contract that makes at-least-once delivery safe. You accept that re-delivery can happen and you design your consumer so that re-delivery is harmless. The idempotency check is: have I already processed this event? If yes: skip. If no: process and record that I've processed it.

---

### Q2 — Pattern Selection
**Interviewer asks:** "How do you choose between a DB unique constraint check and Redis SETNX for idempotency?"

**Hruday's answer:**
> DB unique constraint: durable, atomic with the business write, self-contained. If your idempotency check and your business DB write are in the same transaction, a unique constraint violation means the message was already processed AND the business write is consistent. Best for financial events (payments, settlements, ledger entries) where durability and atomicity matter more than throughput.
>
> Redis SETNX: O(1), fast enough for millions of checks per second, automatically cleaned up by TTL. Best for high-volume, non-financial events (notification dispatch, analytics event tracking, email deduplication). The risk: if Redis loses data (restart without persistence), the idempotency keys are gone — a subsequent re-delivery would be processed as if it were new. Mitigate with Redis AOF persistence.
>
> My decision rule: use DB unique constraint when the business data and idempotency state belong in the same RDBMS transaction. Use Redis when the check-rate is too high for DB to handle, the data isn't financial, and a missed deduplication on Redis restart is acceptable.

---

### Q3 — Edge Case
**Interviewer asks:** "Your service checks for duplicate payment ID, finds none, starts processing, and then crashes. After restart, the check finds no record again. Is this idempotent?"

**Hruday's answer:**
> No — this is the classic check-then-act race condition / crash-between-check-and-write problem. The consumer checked, found nothing, started processing (called the payment gateway), crashed before writing the idempotency record to DB. On restart: checks again, finds nothing (never written), calls the gateway AGAIN. Customer charged twice.
>
> Fix: change the order of operations. Write the idempotency record to DB BEFORE calling the payment gateway. Use a two-phase approach:
> 1. Insert idempotency record with status=PROCESSING (in same transaction, or as first write)
> 2. Call payment gateway
> 3. Update idempotency record to status=COMPLETE with gateway response
>
> On re-delivery after a crash: find the PROCESSING record → either complete it (if gateway call hasn't been made) or handle the COMPLETE case (already done). The idempotency check must be done BEFORE any side effects, not just before the DB write.
>
> Alternatively: use the gateway's idempotency key as the primary protection (pass paymentId as `Idempotency-Key` to gateway). Even if you call the gateway twice with the same key, it returns the same response and charges only once. External API idempotency is the outer safety net; internal DB idempotency is the inner one.

---

### Q4 — Code Approach
**Interviewer asks:** "You're building a service that processes Kafka events and sends emails. How do you make it idempotent?"

**Hruday's answer:**
> Email sending is non-trivially idempotent — most email APIs don't support deduplication by default. The recipient gets two emails and is annoyed. My approach: Redis SETNX with a 24-hour TTL using the event's orderId (or any stable business identifier) as the key.
>
> Before calling the email API: `redisTemplate.opsForValue().setIfAbsent("email-sent:ORDER-001", "1", 24h)`. If the return is `true` (key was newly set): first processing → send email. If the return is `false` (key already existed): re-delivery → skip email. Either way: ACK the Kafka offset.
>
> TTL of 24 hours: covers the maximum expected re-delivery window. If a Kafka consumer group doesn't commit for 24 hours in production, something is deeply wrong and needs manual intervention. 24 hours is a safe buffer.
>
> One additional note: if Redis is unavailable when this check runs (Redis connection refused), I fail the consumer with a retryable exception rather than defaulting to "process it anyway" — because falling through the Redis check on Redis outage would send duplicate emails to every user whose event is in the re-delivery window during that outage.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "DB check is always idempotent" | "I check the DB before every operation, so I'm safe" | "A DB check followed by a write is NOT atomic unless you wrap them in a transaction or use an upsert. Two concurrent consumer threads (in the same or different pods) can both perform the check, find nothing, and both proceed to write — resulting in a race condition and a duplicate. The safe approach: (1) use DB unique constraint + catch DataIntegrityViolationException (the constraint is the lock), or (2) use UPSERT which is atomic by design, or (3) use Redis SETNX which is a single atomic command. Never rely on 'I checked the DB and found nothing' as a safety guarantee in a concurrent system." |
| "Idempotency key = Kafka offset" | "I use the Kafka partition + offset as the idempotency key" | "Kafka partition + offset is technically unique per message, but it's an infrastructure detail, not a business key. If you replay from a different consumer group (with a different committed offset baseline), the same event may have a different offset than the first processing. More importantly: if you use partition+offset as the DB key, you're storing infrastructure metadata in your business schema — fragile if you ever change your Kafka configuration. Use the business entity ID (orderId, paymentId, transactionId) as the idempotency key. It's stable, meaningful, and survives infrastructure changes." |
| "External API calls are automatically idempotent" | "Payment gateways don't double-charge if called twice" | "Payment gateways double-charge by default unless you pass an idempotency key. The `Idempotency-Key` header is a client-set key that tells the gateway 'if you've seen this key before, return the previous response, don't execute the operation again.' Without it: two calls with the same payload = two charges. Always pass a deterministic idempotency key (not a random UUID, which would be different each call) for every payment gateway API call. Use the stable business payment ID so re-deliveries reuse the same idempotency key and the gateway deduplicates on their side." |

---

## 7. Hruday's Real Experience Hook

> "I dealt with this exact problem at Capgemini. The Node.js service processed Stripe payment webhooks without idempotency. Stripe sometimes retried webhooks on timeout, and our service didn't check for duplicates. We had a period of double order fulfilments — orders marked shipped twice, loyalty points doubled, and a few support tickets from confused customers. The fix: we added a PostgreSQL table `processed_webhooks(stripe_event_id UNIQUE, processed_at TIMESTAMP)`. Each webhook handler first checked this table — if the event ID existed: skip. If not: process and insert the event ID. Exactly the DB unique constraint pattern. Zero further duplicates. Same pattern, different technology — applies identically to Kafka consumer re-delivery."

---

## 8. Scale Evolution

**1,000 users →** DB unique constraint idempotency on the settlement/order table. Simple, durable. Handles the volume without performance concerns.

**100,000 users →** Redis SETNX for high-volume, non-financial events. DB unique constraint for financial events. Monitor Redis key count and TTL distribution. Alert if Redis key count grows unboundedly (missing TTL = memory leak).

**10 million users →** Separate idempotency service or library shared across consumers. Centralised policy: payment events → DB constraint, notification events → Redis SETNX, state updates → UPSERT. Idempotency key TTL calibrated per event type based on max expected re-delivery window from Kafka partition LAG monitoring.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment gateway charge must be idempotent — Idempotency-Key per payment. Ledger insert must be idempotent — DB unique constraint on transaction ID. | "How do you prevent double charges in a payment consumer that uses at-least-once Kafka delivery?" |
| Swiggy / Meesho | Order creation must be idempotent — DB UNIQUE on order_id. Rider assignment event must be idempotent — Redis SETNX for in-flight coordination. | "Your order consumer receives the same order.placed event twice during a Kafka rebalance. How do you ensure the order is created only once?" |
| Adobe / Microsoft | Document render job idempotency — Redis SETNX per (documentId + versionId). Email dispatch idempotency — Redis SETNX per (userId + notificationType + date). | "A document render event is re-delivered after a consumer crash. How do you avoid rendering the same document twice?" |
| SAP Labs (current) | Financial document posting idempotency — DB unique constraint on document reference. Oracle's MERGE statement (UPSERT equivalent in Oracle) for update-or-insert patterns. | "How would you ensure that a financial document is posted to the SAP ledger exactly once even if the event is re-delivered?" |

---

## 10. Related Topics — What to Study Next

- **Topic 120 — At-Most-Once vs At-Least-Once vs Exactly-Once** — the delivery semantics that CREATE the need for idempotency; at-least-once semantics are safe only when combined with the idempotent consumer patterns in this topic
- **Topic 104 — Redis Distributed Lock (Redlock)** — Redis SETNX used for idempotency in this topic uses the same command as Redlock for distributed locking; understanding the limits of SETNX (Redis restart, TTL choice) applies to both use cases
- **Topic 123 — Poison Message Handling** — a message that always fails (and is always re-delivered) is a poison pill; idempotency patterns here help distinguish "this message was processed, skip it" from "this message always fails, DLQ it"
- **Topic 79 — Outbox Pattern** — the outbox pattern solves the PRODUCER-side idempotency problem (publishing an event exactly once from a DB transaction); idempotent consumers solve the consumer-side; together they form a complete at-least-once + idempotent system

---

*Part 6 · Idempotency — Designing Idempotent Consumers · Full Stack Interview Guide · Hruday D · 2026*
