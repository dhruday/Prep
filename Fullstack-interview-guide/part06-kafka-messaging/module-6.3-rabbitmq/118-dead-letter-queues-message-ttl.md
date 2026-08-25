# RabbitMQ Dead Letter Queues and Message TTL
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- A **Dead Letter Exchange (DLX)** is a regular exchange that receives "dead" messages — messages that were NACK'd without requeue, exceeded their TTL while waiting in a queue, or were rejected because the queue was full (max-length overflow).
- Configuring DLX on a queue: add `x-dead-letter-exchange` argument pointing to an exchange, optionally `x-dead-letter-routing-key` for the dead letter's routing key. When a message dies in the queue, the broker automatically forwards it to the DLX. That exchange routes it to a Dead Letter Queue (DLQ) for inspection.
- **Message TTL** (Time-To-Live): set per-message (producer sets `expiration` header in milliseconds) or per-queue (`x-message-ttl` argument). When TTL expires before consumption: message is moved to DLX, not silently deleted. This is how OTP expiry works — message expires → DLX → dead letter queue → log it.
- **Queue TTL** (`x-expires`): the QUEUE itself is deleted after this idle period (no consumers, no messages). Useful for temporary reply queues and developer testing queues that should auto-clean.
- DLQ pattern: always bind a DLQ to the DLX. Without the binding, dead messages are silently dropped even with DLX configured. DLQ = inspection, alerting, manual retry.
- Retry pattern using DLQ: on processing failure → NACK without requeue → message goes to DLX → routed to DLQ → separate consumer on DLQ processes (wait/retry) → re-publishes to original queue if retryable. This is the RabbitMQ equivalent of Spring Kafka's `DefaultErrorHandler` retry-then-DLQ pattern.

---

## 1. One-Line Definition
RabbitMQ Dead Letter Queues (DLQ) are the safety net for messages that can't be processed — messages rejected/expired/overflowed are forwarded to a Dead Letter Exchange and routed to a Dead Letter Queue for inspection, alerting, and manual retry, preventing silent message loss.

---

## 2. The Problem It Solves

**Scenario A — Payment processing failure:**
Your payment settlement consumer nacks a message because the settlement API returned 503 (service temporarily unavailable). Without DLX: the message is either requeued (causing an infinite retry loop every millisecond) or dropped entirely. With DLX: nack without requeue → message moves to DLX → DLQ → retry consumer waits 60 seconds → re-publishes to original settlement queue. Clean, bounded retry.

**Scenario B — OTP expiry:**
OTP request messages should expire after 5 minutes — if the email service can't process them within 5 minutes, the OTP is already invalid. Set `x-message-ttl=300000` (5 minutes) on the OTP queue. Expired messages → DLX → DLQ containing expired OTP events → alerting consumer monitors expired OTPs for fraud pattern analysis.

**Scenario C — Queue overflow:**
Your notification queue hits max-length (1 million messages). New incoming messages would be dropped silently. Instead: configure `x-overflow=reject-publish-dlx` → overflow messages → DLX → DLQ → monitoring alert fires. Ops team knows: notification processing is falling behind the publish rate.

All three scenarios share the same pattern: instead of silent loss, dead messages flow to a visible, consumable Dead Letter Queue.

---

## 3. How It Works Internally

### When Does a Message Die?

```
Three conditions that move a message to the DLX (Dead Letter Exchange):

1. NACK without requeue:
   consumer calls basicNack(deliveryTag, multiple=false, requeue=false)
   OR @RabbitListener throws AmqpRejectAndDontRequeueException
   → message NOT requeued → moved to DLX

2. TTL expired:
   Per-message: message has 'expiration' header set to ms value
   Per-queue: queue has 'x-message-ttl' argument
   Message waits longer than allowed → expires → moved to DLX

3. Queue max-length overflow:
   Queue has 'x-max-length' set
   'x-overflow=reject-publish-dlx' configured
   New messages are rejected → moved to DLX
   (default overflow behaviour: drop oldest messages silently)
```

### Message Headers Added on Dead Lettering

```
When a message moves to DLX, RabbitMQ adds 'x-death' header:
  x-death: [
    {
      count: 1,                                 — how many times this message has been dead-lettered
      reason: "rejected" | "expired" | "maxlen", — why it died
      exchange: "payment.topic.exchange",        — original exchange
      routing-keys: ["payment.upi.success"],     — original routing key
      queue: "payment.success.queue",            — queue it died from
      time: 1704067200                           — timestamp
    }
  ]

This metadata allows the DLQ consumer to:
  - Know how many times a message has been retried (count)
  - Know why it was dead-lettered (reason)
  - Re-route it to the correct original queue (exchange + routing-keys) for retry
  - Respect a max-retry limit (count > N → discard, don't retry again)
```

### Full DLQ Flow Diagram

```
PRODUCER ──► payment.topic.exchange ──► payment.success.queue
                                              │  x-dead-letter-exchange: payment.dlx
                                              │  x-dead-letter-routing-key: dead.payment
                                              │
                                    Consumer throws exception
                                    NACK(requeue=false)
                                              │
                                              ▼
                                     payment.dlx (direct exchange)
                                              │
                                     bind key: "dead.payment"
                                              │
                                              ▼
                                     DLQ: payment.dead.queue
                                              │
                                    DLQ Consumer reads:
                                      - Inspect x-death headers
                                      - If count < 3 and reason=rejected: re-queue to original
                                      - If count >= 3: send to ops alert + permanent DLQ
                                      - If reason=expired: log and discard (too old to retry)
```

---

## 4. The Code

### Configuring DLX and DLQ on a Queue

```java
@Configuration
public class RabbitMQDLQConfig {

    // ─── DEAD LETTER INFRASTRUCTURE ──────────────────────────────────────────

    // The Dead Letter Exchange — receives all dead messages from configured queues
    @Bean
    public DirectExchange deadLetterExchange() {
        return ExchangeBuilder.directExchange("payment.dlx")
            .durable(true)
            .build();
    }

    // The Dead Letter Queue — where dead messages accumulate
    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable("payment.dead.queue")
            // Quorum for safety — dead letters are evidence, should not be lost
            .quorum()
            // No DLX on this queue — prevent infinite DLQ-chaining
            .build();
    }

    // Binding: DLX routes dead messages to DLQ
    @Bean
    public Binding deadLetterBinding(Queue deadLetterQueue,
                                     DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue)
            .to(deadLetterExchange)
            .with("dead.payment");  // matches x-dead-letter-routing-key on source queues
    }

    // ─── MAIN QUEUE WITH DLX CONFIGURED ─────────────────────────────────────

    @Bean
    public Queue paymentSuccessQueue() {
        return QueueBuilder.durable("payment.success.queue")
            .quorum()
            // Where dead messages go
            .withArgument("x-dead-letter-exchange", "payment.dlx")
            // Routing key to use when forwarding to DLX
            .withArgument("x-dead-letter-routing-key", "dead.payment")
            // Max messages in queue — overflow protection
            .withArgument("x-max-length", 500_000)
            // Overflow: reject new publishes + dead-letter to DLX (not silent drop)
            .withArgument("x-overflow", "reject-publish-dlx")
            .build();
    }

    // ─── TTL QUEUE EXAMPLE: OTP EVENTS ───────────────────────────────────────

    @Bean
    public Queue otpQueue() {
        return QueueBuilder.durable("otp.dispatch.queue")
            // Message expires after 5 minutes if not consumed
            .withArgument("x-message-ttl", 300_000)   // 5 minutes in ms
            // Expired messages go to DLX — for auditing/pattern analysis
            .withArgument("x-dead-letter-exchange", "otp.dlx")
            .withArgument("x-dead-letter-routing-key", "dead.otp")
            .build();
    }

    @Bean
    public DirectExchange otpDeadLetterExchange() {
        return ExchangeBuilder.directExchange("otp.dlx").durable(true).build();
    }

    @Bean
    public Queue otpDeadLetterQueue() {
        return QueueBuilder.durable("otp.dead.queue").build();
    }

    @Bean
    public Binding otpDlqBinding(Queue otpDeadLetterQueue,
                                  DirectExchange otpDeadLetterExchange) {
        return BindingBuilder.bind(otpDeadLetterQueue)
            .to(otpDeadLetterExchange)
            .with("dead.otp");
    }
}
```

### Consumer — Controlled NACK for DLQ Routing

```java
@Component
@Slf4j
public class PaymentSettlementConsumer {

    private final SettlementService settlementService;

    // ❌ WRONG: Exception without NACK control
    // Spring AMQP default: exception → requeue=true → infinite retry loop
    @RabbitListener(queues = "payment.success.queue")
    public void handleWrong(PaymentEvent event) {
        settlementService.settle(event);  // If this throws, message is requeued forever
    }

    // ✅ RIGHT: Manual ack control — nack without requeue on permanent failure
    @RabbitListener(queues = "payment.success.queue", ackMode = "MANUAL")
    public void handlePayment(
            PaymentEvent event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {

        try {
            settlementService.settle(event);
            // Success: acknowledge → message removed from queue
            channel.basicAck(deliveryTag, false);

        } catch (TransientException e) {
            // Transient failure: requeue=true → message back to queue head, retry later
            log.warn("Transient failure settling paymentId={}, requeuing", event.getPaymentId(), e);
            channel.basicNack(deliveryTag, false, true);  // requeue=true

        } catch (PermanentException e) {
            // Permanent failure: requeue=false → message goes to DLX → DLQ
            log.error("Permanent failure settling paymentId={}, sending to DLQ", event.getPaymentId(), e);
            channel.basicNack(deliveryTag, false, false);  // requeue=false → DLX
        }
    }
}
```

### DLQ Consumer — Retry with Max-Attempt Check

```java
@Component
@Slf4j
public class PaymentDeadLetterConsumer {

    private final RabbitTemplate rabbitTemplate;
    private final AlertingService alertingService;

    private static final int MAX_RETRIES = 3;

    @RabbitListener(queues = "payment.dead.queue", ackMode = "MANUAL")
    public void processDeadLetter(
            Message message,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {

        // Extract x-death metadata
        List<Map<String, Object>> xDeath = message.getMessageProperties().getXDeathHeader();
        int deathCount = (xDeath != null && !xDeath.isEmpty())
            ? ((Long) xDeath.get(0).get("count")).intValue()
            : 0;
        String deathReason = (xDeath != null && !xDeath.isEmpty())
            ? (String) xDeath.get(0).get("reason")
            : "unknown";

        String paymentId = (String) message.getMessageProperties()
            .getHeaders().get("paymentId");

        log.warn("Dead letter received: paymentId={} deathCount={} reason={}",
            paymentId, deathCount, deathReason);

        if ("expired".equals(deathReason)) {
            // TTL expired: OTP or time-sensitive — don't retry, just log
            log.info("Message expired (TTL): paymentId={} — skipping retry", paymentId);
            alertingService.logExpiredMessage(paymentId, message);
            channel.basicAck(deliveryTag, false);
            return;
        }

        if (deathCount < MAX_RETRIES) {
            // Retry: re-publish to original queue after a delay
            try {
                Thread.sleep(10_000L * deathCount);  // backoff: 10s, 20s, 30s
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }

            // Re-publish to original exchange/routing-key from x-death metadata
            String originalExchange = (String) xDeath.get(0).get("exchange");
            List<?> routingKeysList = (List<?>) xDeath.get(0).get("routing-keys");
            String routingKey = routingKeysList.get(0).toString();

            rabbitTemplate.send(originalExchange, routingKey, message);
            channel.basicAck(deliveryTag, false);
            log.info("Retried dead letter: paymentId={} attempt={}", paymentId, deathCount + 1);

        } else {
            // Max retries exceeded: alert ops, move to permanent DLQ
            alertingService.sendPaymentDLQAlert(paymentId, deathCount, message);
            log.error("Max retries ({}) exceeded for paymentId={} — alerting ops",
                MAX_RETRIES, paymentId);
            channel.basicAck(deliveryTag, false);  // ack — don't requeue this permanently
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a Dead Letter Exchange in RabbitMQ?"

**Hruday's answer:**
> A Dead Letter Exchange (DLX) is a regular RabbitMQ exchange that receives messages that "die" in another queue. A message dies in three situations: it's manually nacked with requeue=false (consumer rejected it), it exceeds the queue's or message's TTL (waited too long), or the queue is full and the overflow policy routes new messages to the DLX.
>
> You configure DLX on a queue by setting the `x-dead-letter-exchange` argument to an exchange name. That exchange typically routes the dead message to a Dead Letter Queue (DLQ) — a normal durable queue where the dead messages accumulate. The DLQ consumer can then inspect the messages, determine why they died (via `x-death` headers), decide whether to retry them by re-publishing to the original exchange, or alert ops for manual investigation.
>
> Without DLX: failed or expired messages are either requeued infinitely or silently discarded. DLX turns silent failure into visible, recoverable failure.

---

### Q2 — Design Question
**Interviewer asks:** "Design a retry strategy for a payment consumer using RabbitMQ. The retry should have backoff and a max attempt limit."

**Hruday's answer:**
> I use a "TTL + DLX loop" retry pattern.
>
> Configuration: payment queue has `x-dead-letter-exchange=payment.retry.dlx`. Payment retry exchange routes to `payment.retry.queue`. Retry queue has `x-message-ttl=10000` (10-second wait) and `x-dead-letter-exchange=payment.topic.exchange` (original exchange). After TTL, message returns from retry queue to original exchange, re-routing to payment queue. This creates a natural delay loop: fail → DLQ → wait 10 seconds → retry.
>
> For max attempts: the `x-death[0].count` header tracks how many times the message has been dead-lettered. In the retry queue consumer (or in the DLQ consumer): if count >= 3, don't re-publish — route to a permanent DLQ and alert ops instead.
>
> For backoff: multiply the retry delay by count — but RabbitMQ's TTL is fixed per queue, so you need multiple retry queues with different TTLs (10s, 30s, 60s) to implement exponential backoff, routing between them based on count. Three queues: retry-10s, retry-30s, retry-60s, each with different TTLs. On each death: route to the next TTL tier.

---

### Q3 — Specific Scenario
**Interviewer asks:** "When should you nack with requeue=true vs requeue=false?"

**Hruday's answer:**
> `requeue=true` (nack and put back in queue): when the failure is transient. The downstream dependency (database, API) is temporarily unavailable but will recover. Example: settlement API returned 503. Requeue=true places the message back at the queue head — same consumer or another consumer picks it up and retries. Risk: if the failure is permanent, this creates an infinite retry loop consuming CPU without progress. Mitigate with a per-message retry counter in the message header.
>
> `requeue=false` (nack without requeue → message goes to DLX): when the failure is permanent for THIS message. The message itself is the problem — invalid payload, failed business validation, duplicate that shouldn't be processed again. Requeue=false ensures the message moves to the DLQ so it can be inspected and fixed rather than causing an infinite loop.
>
> In Spring AMQP: throwing `AmqpRejectAndDontRequeueException` is the standard way to trigger requeue=false without manual ack — Spring AMQP catches it and nacks without requeue automatically. For transient failures: rethrow as a regular exception (default behaviour: requeue=true) or use manual Channel.basicNack(tag, false, true).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "DLX is configured globally" | "You set up one DLX for the whole broker" | "DLX is configured PER QUEUE via the `x-dead-letter-exchange` argument. Each queue has its own DLX (or none). Different queues can point to different DLXes — for example, payment failures go to payment.dlx, notification failures go to notification.dlx. Centralising all dead letters into one DLX is possible (all queues point to the same exchange) but makes debugging harder — you lose the context of which queue the message died in. Per-queue or per-domain DLX with separate DLQ queues per domain is easier to monitor and manage." |
| "Expired messages are deleted" | "Setting TTL means messages are deleted after that time" | "With DLX configured: expired messages move to the DLX, not deleted. Without DLX: expired messages are silently dropped. The behaviour depends on whether you've configured `x-dead-letter-exchange`. In production: always configure DLX so you can see expired messages in the DLQ. For OTPs: the expired OTP event in the DLQ is useful for fraud monitoring (many expired OTP events for the same user = suspicious activity) and for debugging (dev team can verify TTL is correctly configured)." |
| "There's no infinite loop risk with DLQ" | "DLQ messages are safely stored forever for manual review" | "If the DLQ consumer re-publishes messages to the original queue unconditionally — without checking retry count — and the original consumer keeps failing and nacking them — the message bounces between the original queue and DLQ forever. Always check `x-death[0].count` in the DLQ consumer. If count exceeds max retries: stop re-publishing, alert ops, move to a permanent archival queue or database. The DLQ is a recovery mechanism, not an infinite retry loop." |

---

## 7. Hruday's Real Experience Hook

> "Message TTL and DLX map directly to a pattern I implemented at SAP Labs for Oracle approval workflow expiry: approval requests that weren't actioned within a deadline triggered an escalation. The 'message dies after N hours' → 'move to DLX' → 'escalation consumer processes it' is conceptually identical to what I built with scheduled Oracle jobs that checked pending approval ages. RabbitMQ's TTL + DLX is a cleaner, event-driven implementation of the same expiry-and-escalation pattern — the Oracle approach required polling; RabbitMQ's approach is reactive (the expiry event triggers immediately on TTL breach)."

---

## 8. Scale Evolution

**1,000 users →** Simple DLX with one DLQ. DLQ consumer logs dead letters and sends Slack message. Manual reprocessing when needed.

**100,000 users →** Separate DLX and DLQ per domain. DLQ consumer with retry logic and backoff. Metric: DLQ message count exported to Prometheus → Grafana dashboard alert if DLQ exceeds threshold.

**10 million users →** Dead letter metrics are SLA signals: DLQ rate > N/minute triggers PagerDuty. Automated retry pipeline with exponential backoff (multiple TTL queues). Permanent DLQ with 30-day retention for post-mortem analysis. DLQ message replay tool for ops team to re-publish corrected messages to original queues after code fix.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Settlement failures must not be silently dropped — DLX routes them to inspection queue with immediate alert. TTL for payment request timeouts (async payment confirmation). | "A payment confirmation message fails to settle 3 times. Walk me through your RabbitMQ DLQ retry strategy." |
| Swiggy / Meesho | Order assignment failures: if delivery assignment fails, DLQ → ops alert → manual reassignment. TTL on flash-sale order queues to reject orders older than 30 seconds. | "How do you handle delivery assignment failures in RabbitMQ without losing the order event?" |
| Adobe / Microsoft | Asset processing failures: failed conversions → DLQ with reason headers → analytics on failure types. Expired rendering requests (older than SLA window) → TTL → DLX → expired job audit. | "How do you capture and analyse asset processing failures in a RabbitMQ-based pipeline?" |
| SAP Labs (current) | Workflow expiry same as approval deadline escalation pattern. Dead letter analysis for SAP integration failures (external system timeout, API error). | "Design a message retry and dead letter strategy for a SAP ERP integration that must not lose financial document events." |

---

## 10. Related Topics — What to Study Next

- **Topic 116 — RabbitMQ Exchanges** — the DLX is a regular exchange; understanding exchange types is prerequisite for understanding how DLX routes dead letters to the DLQ
- **Topic 117 — Queues, Bindings, Routing Keys** — queue arguments like `x-dead-letter-exchange`, `x-message-ttl`, `x-max-length` configured here are queue-level settings; the queue configuration model is foundational
- **Topic 119 — Spring AMQP @RabbitListener** — `AmqpRejectAndDontRequeueException` is the Spring way to trigger DLX routing without manual channel operations; consumer ack modes determine when DLX routing is triggered
- **Topic 123 — Poison Message Handling** — poison messages (messages that always fail and block consumers) are the DLQ failure mode that requires max-retry-count enforcement; the x-death count checking pattern from this topic is the core of poison message protection

---

*Part 6 · RabbitMQ Dead Letter Queues and Message TTL · Full Stack Interview Guide · Hruday D · 2026*
