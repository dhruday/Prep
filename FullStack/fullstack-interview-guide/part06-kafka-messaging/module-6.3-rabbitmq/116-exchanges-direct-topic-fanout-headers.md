# RabbitMQ Exchanges — Direct, Topic, Fanout, Headers
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- In RabbitMQ, producers do NOT publish directly to queues. They publish to an **Exchange**. The exchange is a routing engine that decides which queue(s) receive a copy of the message.
- **Direct Exchange**: routes to queues whose binding key exactly matches the message's routing key. One-to-one routing. Used for work queues with a specific task type. Example: `routingKey=payment.success` → goes to `payment-success-queue` only.
- **Topic Exchange**: routes to queues whose binding pattern matches the routing key using wildcards. `*` = exactly one word. `#` = zero or more words. `payment.*.success` matches `payment.upi.success` but not `payment.upi.partial.success`. `payment.#` matches anything starting with `payment.`. Most flexible and most commonly used in production.
- **Fanout Exchange**: ignores the routing key entirely and broadcasts the message to EVERY queue bound to it. No filtering — all subscribers receive all messages. Used for broadcast scenarios: push notifications, cache invalidation, WebSocket broadcasts.
- **Headers Exchange**: routes based on message headers (key-value pairs) instead of routing key. More expressive than topic routing (match on multiple attributes). Rarely used — complex to reason about. Know it exists; topic exchange handles most production use cases.
- Default exchange: RabbitMQ's default exchange is a direct exchange pre-declared with empty name `""`. If you publish to `""` with routingKey = `"myQueue"`, the message goes directly to the queue named `myQueue`. This is the shortcut used in tutorials — production code should use named exchanges.

---

## 1. One-Line Definition
A RabbitMQ Exchange is the message routing layer between producers and queues — it receives messages from producers and routes them to one or more queues based on exchange type (direct/topic/fanout/headers) and binding rules defined by the queue configuration.

---

## 2. The Problem It Solves

A payment platform needs to route payment events to different queues based on:
- Payment method: UPI events → settlement queue for UPI reconciler; Card events → settlement queue for card reconciler
- Event type: all success events → billing team's audit queue; all failure events → retry queue AND alert queue simultaneously
- Geographic split: India payments → India queue; International → International queue

Without exchanges: you'd need one Kafka-style topic per "route" — or a smart producer that decides which queue to publish to. This couples routing logic to the producer code. Every new subscriber requires changing the producer.

With exchanges: the producer publishes once to the `payment.exchange` with a routing key like `payment.upi.success`. The exchange routes based on bindings defined by queue administrators. Adding a new subscriber (new team binding a new queue) requires zero producer changes. Routing is declarative and centralised.

This decoupling of producer from routing logic is the core value of the exchange model.

---

## 3. How It Works Internally

### Exchange Routing — ASCII Diagram

```
                           ┌──────────────┐
                           │    EXCHANGE   │
PRODUCER publishes:        │   (routing    │
  exchange="notifications" │    engine)    │
  routingKey="order.upi"   └──────┬────────┘
  headers={region:"IN"}           │
                        ┌─────────┼─────────┐
                        ▼         ▼         ▼
                    Queue A    Queue B    Queue C
                  (upi-team)  (all-payments) (India-team)
                        │
                  Binding: routingKey="order.upi"
                                    │
                              Binding: routingKey="order.#"
                                                │
                                          Binding: header region=IN

Each queue has a BINDING — a rule that tells the exchange "send me messages matching X"
```

### Direct Exchange — Exact Match Routing

```
Exchange type: direct

Bindings:
  Queue "upi-settlement"  bound with key "payment.upi"
  Queue "card-settlement" bound with key "payment.card"
  Queue "wallet-settle"   bound with key "payment.wallet"

Producer publishes:
  routingKey = "payment.upi"   → goes to "upi-settlement" ONLY
  routingKey = "payment.card"  → goes to "card-settlement" ONLY
  routingKey = "payment.OTHER" → goes NOWHERE (no binding match) → message dropped
                                 (or sent to alternate exchange if configured)

Use case: work queues where message type determines the worker pool
```

### Topic Exchange — Wildcard Routing

```
Exchange type: topic

Routing key format: words separated by dots → "payment.upi.success"
  * = matches exactly ONE word
  # = matches zero or more words

Bindings:
  Queue "audit-queue"       bound with "payment.#"          (all payment events)
  Queue "success-queue"     bound with "*.*.success"        (any.any.success)
  Queue "upi-queue"         bound with "payment.upi.*"      (payment.upi.anything)
  Queue "all-failure-queue" bound with "#.failure"          (anything ending in failure)

Producer publishes routingKey="payment.upi.success":
  ✓ Matches "payment.#"        → goes to audit-queue
  ✓ Matches "*.*.success"      → goes to success-queue
  ✓ Matches "payment.upi.*"    → goes to upi-queue
  ✗ "payment.upi.success" does NOT end in "failure"

Result: message is COPIED to audit-queue, success-queue, upi-queue
        upi-queue gets a copy = 3 copies total in this routing
```

### Fanout Exchange — Broadcast

```
Exchange type: fanout
Routing key: IGNORED completely

All queues bound to this exchange receive the message:
  notification.exchange (fanout)
  ├── push-notification-queue    (send push to mobile app)
  ├── email-notification-queue   (send email)
  ├── sms-notification-queue     (send SMS)
  └── analytics-notification-queue (log notification event)

Producer publishes with ANY routing key (or none):
  ALL 4 queues receive the message simultaneously
  4 independent copies created

Use case: cache invalidation broadcast, WebSocket server alerts,
          sending the same message to all microservice instances
```

### Headers Exchange — Attribute-Based Routing

```
Exchange type: headers
Routing key: IGNORED

Bindings use header key-value pairs with x-match:
  Queue "india-payments" binding:
    x-match: all    (ALL headers must match)
    headers: {region: "IN", currency: "INR"}

  Queue "upi-payments" binding:
    x-match: any    (ANY one header must match)
    headers: {paymentMethod: "UPI", scheme: "BHIM"}

Producer message headers: {region:"IN", currency:"INR", paymentMethod:"UPI"}
  → india-payments matches (all: region=IN ✓, currency=INR ✓)
  → upi-payments matches (any: paymentMethod=UPI ✓)
  → Both queues receive the message
```

---

## 4. The Code

### Declaring Exchanges — Spring AMQP Configuration

```java
@Configuration
public class RabbitMQExchangeConfig {

    // ─── DIRECT EXCHANGE ──────────────────────────────────────────────────────
    // For exact routing key matching — work queues by type
    @Bean
    public DirectExchange paymentDirectExchange() {
        return ExchangeBuilder.directExchange("payment.direct.exchange")
            .durable(true)         // survives broker restart
            .build();
    }

    // ─── TOPIC EXCHANGE ───────────────────────────────────────────────────────
    // For wildcard routing — flexible multi-subscriber patterns
    @Bean
    public TopicExchange paymentTopicExchange() {
        return ExchangeBuilder.topicExchange("payment.topic.exchange")
            .durable(true)
            .build();
    }

    // ─── FANOUT EXCHANGE ──────────────────────────────────────────────────────
    // For broadcast to all queues — cache invalidation, WebSocket events
    @Bean
    public FanoutExchange notificationFanoutExchange() {
        return ExchangeBuilder.fanoutExchange("notification.fanout.exchange")
            .durable(true)
            .build();
    }

    // ─── QUEUES ───────────────────────────────────────────────────────────────
    @Bean
    public Queue upiSettlementQueue() {
        return QueueBuilder.durable("upi.settlement.queue").build();
    }

    @Bean
    public Queue cardSettlementQueue() {
        return QueueBuilder.durable("card.settlement.queue").build();
    }

    @Bean
    public Queue allPaymentsAuditQueue() {
        return QueueBuilder.durable("all.payments.audit.queue").build();
    }

    @Bean
    public Queue pushNotificationQueue() {
        return QueueBuilder.durable("push.notification.queue").build();
    }

    @Bean
    public Queue emailNotificationQueue() {
        return QueueBuilder.durable("email.notification.queue").build();
    }

    // ─── BINDINGS — DIRECT ───────────────────────────────────────────────────
    @Bean
    public Binding upiDirectBinding(Queue upiSettlementQueue,
                                    DirectExchange paymentDirectExchange) {
        return BindingBuilder.bind(upiSettlementQueue)
            .to(paymentDirectExchange)
            .with("payment.upi");  // exact routing key
    }

    @Bean
    public Binding cardDirectBinding(Queue cardSettlementQueue,
                                     DirectExchange paymentDirectExchange) {
        return BindingBuilder.bind(cardSettlementQueue)
            .to(paymentDirectExchange)
            .with("payment.card");
    }

    // ─── BINDINGS — TOPIC ────────────────────────────────────────────────────
    // Audit queue gets ALL payment events (payment.#)
    @Bean
    public Binding auditTopicBinding(Queue allPaymentsAuditQueue,
                                     TopicExchange paymentTopicExchange) {
        return BindingBuilder.bind(allPaymentsAuditQueue)
            .to(paymentTopicExchange)
            .with("payment.#");    // wildcard: payment.upi.success, payment.card.failure, etc.
    }

    // ─── BINDINGS — FANOUT ───────────────────────────────────────────────────
    // ALL queues bound to fanout exchange receive every message
    @Bean
    public Binding pushFanoutBinding(Queue pushNotificationQueue,
                                     FanoutExchange notificationFanoutExchange) {
        return BindingBuilder.bind(pushNotificationQueue)
            .to(notificationFanoutExchange);  // no routing key for fanout
    }

    @Bean
    public Binding emailFanoutBinding(Queue emailNotificationQueue,
                                      FanoutExchange notificationFanoutExchange) {
        return BindingBuilder.bind(emailNotificationQueue)
            .to(notificationFanoutExchange);
    }
}
```

### Producer — Publishing to Different Exchange Types

```java
@Service
public class PaymentEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    // ❌ WRONG WAY: Publish to default exchange using queue name as routing key
    // Works in dev, but tightly couples producer to queue names
    // Can't add new subscribers without changing producer
    public void publishWrong(PaymentEvent event) {
        rabbitTemplate.convertAndSend("upi.settlement.queue", event);
        // queue name IS the routing key on default exchange — fragile coupling
    }

    // ✅ RIGHT WAY: Publish to named exchange — queues bind to it
    // Producer doesn't know about queues; routing is exchange's responsibility

    // Direct exchange: specific routing key
    public void publishPaymentDirect(PaymentEvent event) {
        String routingKey = "payment." + event.getPaymentMethod().toLowerCase();
        // e.g., "payment.upi", "payment.card", "payment.wallet"
        rabbitTemplate.convertAndSend(
            "payment.direct.exchange",
            routingKey,
            event
        );
    }

    // Topic exchange: hierarchical routing key for flexible binding
    public void publishPaymentTopic(PaymentEvent event) {
        String routingKey = String.format("payment.%s.%s",
            event.getPaymentMethod().toLowerCase(),  // upi, card, wallet
            event.getStatus().toLowerCase()          // success, failure, pending
        );
        // e.g., "payment.upi.success" — matches payment.#, *.*.success, payment.upi.*
        rabbitTemplate.convertAndSend(
            "payment.topic.exchange",
            routingKey,
            event
        );
    }

    // Fanout exchange: broadcast — all queues get the message
    public void broadcastNotification(NotificationEvent event) {
        rabbitTemplate.convertAndSend(
            "notification.fanout.exchange",
            "",    // routing key ignored for fanout — pass empty string
            event
        );
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a RabbitMQ Exchange? Why can't producers publish directly to queues?"

**Hruday's answer:**
> An exchange is the routing layer in RabbitMQ. Producers always publish to exchanges, never directly to queues. The exchange decides which queues receive the message based on its type (direct, topic, fanout, headers) and the bindings configured on those queues.
>
> Why this separation? It decouples the producer from the consumer topology. A producer publishes with a routing key to an exchange — it knows nothing about how many queues exist or which teams are consuming. If a new team wants to subscribe to payment events, they bind a new queue to the payment exchange with their desired routing pattern. Zero changes to the producer. This is the same publish-subscribe decoupling benefit as Kafka, but implemented at the broker routing layer rather than consumer group management.

---

### Q2 — Comparison
**Interviewer asks:** "When would you use a Topic exchange vs a Fanout exchange?"

**Hruday's answer:**
> Use Fanout when all bound subscribers need every message — no filtering. Classic examples: cache invalidation (every instance needs to invalidate the same cache entry), WebSocket broadcast (all connected server instances need to push the same update to clients), order status updates that all downstream services should receive.
>
> Use Topic when different subscribers need different subsets of messages. Example: audit service wants ALL payment events (`payment.#`) — bound with `payment.#`. UPI reconciler wants only UPI payments (`payment.upi.*`). Failure alerting wants all failures (`#.failure`). One producer publishes with structured routing keys, and each consumer's binding controls what they receive, independently, without any coordination between consumer teams.
>
> Topic exchange is the workhorse for production routing. Fanout is for genuine broadcasts. Most payment/order event routing benefits from topic exchange's selectivity rather than fanout's "everything to everyone" approach.

---

### Q3 — Gotcha
**Interviewer asks:** "What happens when a message's routing key doesn't match any queue binding?"

**Hruday's answer:**
> By default: the message is silently dropped by the broker. No error is returned to the producer unless the producer set `mandatory=true` (which causes the broker to return the message with a basic.return if no queue matched).
>
> For production: this silent drop is dangerous. A misconfigured routing key or a missing queue binding causes message loss with no visibility. The safest approach: configure an **alternate exchange** on every exchange — an exchange that receives all unrouted messages. Bind a "dead-letter" queue to this alternate exchange. Now all unrouted messages end up in a visible queue rather than being silently dropped. Ops can then inspect the alternate exchange queue to catch binding misconfigurations.

---

### Q4 — Design
**Interviewer asks:** "Design the exchange topology for a notification system that needs to send email, SMS, and push notifications for the same events."

**Hruday's answer:**
> I'd use a Fanout Exchange for the notification broadcast: `notification.events.fanout`. Bind three queues to it: `email.dispatch.queue`, `sms.dispatch.queue`, `push.dispatch.queue`.
>
> When an order.placed event triggers a notification: publish once to the fanout exchange with a `UserNotificationEvent` payload. All three queues receive a copy. Email workers consume from email queue, SMS workers from SMS queue, push workers from push queue — all independently, with their own concurrency settings, retry policies, and DLQ configurations.
>
> If some users are opted out of SMS: the filtering logic belongs in the consumer (SMS consumer checks user preferences before sending), not at the exchange level. Exchanges route structurally; consumer code handles fine-grained business logic.
>
> If the queues need different filtering (only send marketing emails for certain event types, but send all transactional notifications): upgrade from fanout to topic exchange. Use routing keys like `notification.transactional.payment` and `notification.marketing.recommendation`. SMS queue binds to `notification.transactional.#` only; email queue binds to `notification.#` (all notifications).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "You can publish directly to a queue" | "I'll just send to the queue name directly" | "Technically possible via the default exchange — if you publish with an empty exchange name and use the queue name as routing key, it works. But this is the default exchange shortcut for development convenience. In production: always use explicitly named exchanges. It keeps routing declarative (exchange + binding = routing policy), allows multiple queue bindings to the same exchange, and allows changing routing rules without touching producer code. Publishing directly to queue names ties the producer to the exact queue topology." |
| "Topic exchange wildcards: * matches any word" | "'*' in topic routing key matches zero or more words" | "'*' matches EXACTLY one word (one dot-separated segment). '#' matches zero or more words. So 'payment.*' matches 'payment.upi' but NOT 'payment.upi.success' (that's two words after the dot). For 'payment.upi.success': use 'payment.#' (matches everything after payment) or 'payment.upi.*' (matches one word after payment.upi) or 'payment.*.success' (matches payment.ANYTHING.success). This is a common interview gotcha — write down the pattern and trace it manually if unsure." |
| "Fanout = Kafka consumer groups" | "Fanout is just like multiple consumer groups in Kafka" | "Both enable fan-out to multiple subscribers, but storage is different. Kafka stores ONE copy; N consumer groups read the same physical data. RabbitMQ fanout creates N physical COPIES — one per bound queue. If 10 queues are bound and each holds 10,000 messages: RabbitMQ holds 100,000 message copies. Adding a new queue binding creates a new copy stream. This makes RabbitMQ fanout unsuitable for large numbers of subscribers at high message volumes, while Kafka consumer groups scale to any number of consumers with zero additional storage cost." |

---

## 7. Hruday's Real Experience Hook

> "Exchange-based routing maps directly to something I've built in REST: a notification dispatcher at SAP Labs that decided whether to send an email, trigger a webhook, or log to audit, based on the event type and destination configuration. That routing logic was in application code — the dispatcher read a routing table from database. RabbitMQ's topic exchange is the messaging equivalent: the routing table lives in exchange bindings, evaluated by the broker, without any application code. The `payment.*.success` pattern I'd use in a topic exchange binding is almost exactly the routing criteria I was encoding in an if-else block in the dispatcher. The philosophy is the same — externalise routing from business logic — RabbitMQ provides it as infrastructure."

---

## 8. Scale Evolution

**1,000 users →** Simple direct exchange per queue type. 2-3 queues. Default exchange acceptable for internal tooling. Durable queues and persistent messages for any queue that handles business-critical events.

**100,000 users →** Topic exchange for payment/order events — flexible enough to add consumer queues without producer changes as the team grows. Separate exchanges per domain (payment.exchange, order.exchange, notification.exchange). Monitor exchange routing stats in RabbitMQ Management console.

**10 million users →** Exchange topology governed by IaC (Terraform/Pulumi RabbitMQ provider). Alternate exchange + DLQ for every exchange in production. Exchange topology documentation as code (bindings defined in Spring config, version-controlled). Consider migrating fanout patterns to Kafka for topics where replay or large numbers of consumers is needed.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Topic exchange for payment events: `payment.{method}.{status}` routing key → separate settlement queues per payment method. Fanout for real-time dashboards. | "Design the RabbitMQ exchange topology for routing payment events to UPI reconciler, card processor, and audit service." |
| Swiggy / Meesho | Topic exchange for order events: `order.{city}.{status}` routing to city-specific delivery queues. Fanout for broadcast restaurant menu updates to all server instances. | "How would you route order events to city-specific queues without changing producer code when you add a new city?" |
| Adobe / Microsoft | Fanout for asset-changed events broadcast to all processing pipelines. Direct exchange for task queues (rendering, conversion). | "Design the exchange topology for a document management system where all asset events go to audit, but only image events go to image processor." |
| SAP Labs (current) | Topic exchange for financial document routing: `doc.{type}.{action}` → type-specific processors. Legacy routing logic in application code being migrated to exchange bindings. | "How would you replace application-level event routing logic with RabbitMQ exchange bindings?" |

---

## 10. Related Topics — What to Study Next

- **Topic 117 — Queues, Bindings, and Routing Keys** — bindings are what connect queues to exchanges; the routing key matching rules are defined in bindings; this topic goes deeper into queue configuration (durability, exclusivity, auto-delete) and how binding patterns work
- **Topic 118 — Dead Letter Queues and Message TTL** — unroutable messages and expired messages from the routing discussed here end up in DLQ/DLX; the alternate exchange pattern is covered there
- **Topic 119 — Spring AMQP @RabbitListener** — the Spring Boot consumer code that consumes from the queues declared and bound in this topic; the `@Bean` declarations here are companion to the `@RabbitListener` annotations there
- **Topic 115 — RabbitMQ vs Kafka** — the broader comparison of when exchanges/queues vs Kafka topics are the right choice; exchange flexibility is one of RabbitMQ's key advantages in the comparison

---

*Part 6 · RabbitMQ Exchanges Direct Topic Fanout Headers · Full Stack Interview Guide · Hruday D · 2026*
