# Spring AMQP — @RabbitListener
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- `@RabbitListener` is Spring AMQP's annotation for declaring a method as a RabbitMQ consumer. Under the hood, it creates a `SimpleMessageListenerContainer` (or `DirectMessageListenerContainer`) that manages the AMQP connection, channel, and poll loop. You get Spring-style dependency injection, JSON deserialization, and automatic ACK/NACK — no manual AMQP channel handling required.
- `RabbitTemplate` is the producer equivalent — inject it, call `convertAndSend(exchange, routingKey, payload)`. Handles serialization, channel management, and correlation IDs for RPC patterns.
- **Ack modes**: `AUTO` (default — ACK on successful return, NACK on exception — requeues by default), `MANUAL` (you call channel.basicAck()/basicNack()), `NONE` (no ack sent — auto-ack mode, fire-and-forget, messages removed immediately). For production: `MANUAL` or configure AUTO with `AmqpRejectAndDontRequeueException` for DLQ routing.
- **Concurrency**: `@RabbitListener(concurrency="3-10")` — min 3, max 10 consumer threads. Threads scale up when queue depth grows. Scale-down after idle period. This is the RabbitMQ equivalent of `@KafkaListener(concurrency=N)`.
- `@RabbitListener` can declare queues and bindings inline using `@QueueBinding` — useful for tests and simple setups. For production: declare queues and bindings as `@Bean` in a configuration class (better control, IaC friendly).
- Serialization: default is Java serialization (never use in production — insecure and brittle). Configure `Jackson2JsonMessageConverter` globally so all messages are serialized/deserialized as JSON automatically.

---

## 1. One-Line Definition
`@RabbitListener` and `RabbitTemplate` are Spring AMQP's message consumer and producer abstractions — they wrap RabbitMQ's AMQP client with Spring idioms (dependency injection, auto-configuration, JSON conversion) so that consuming or publishing a message requires a single annotated method or a single `convertAndSend` call.

---

## 2. The Problem It Solves

The native RabbitMQ Java client (`com.rabbitmq:amqp-client`) requires: manually create a `Connection` and `Channel`, call `channel.basicConsume(queue, autoAck, deliverCallback, cancelCallback)`, handle AMQP delivery in a callback lambda, manually ACK/NACK per delivery tag, handle connection failures and channel recovery. Each consumer = ~40 lines of boilerplate + error handling.

Spring AMQP solves this the same way Spring Kafka solves Kafka boilerplate:
1. Auto-configuration creates `ConnectionFactory`, `RabbitAdmin`, and `RabbitTemplate` from `application.yml`
2. `@RabbitListener` creates a listener container managing channels and callbacks
3. Type-safe payload deserialization via `Jackson2JsonMessageConverter`
4. `RabbitTemplate.convertAndSend()` handles producer boilerplate
5. Built-in retry and error handling via `SimpleRetryPolicy` or `StatefulRetryOperationsInterceptor`

The result: a RabbitMQ consumer in one annotated method.

---

## 3. How It Works Internally

```
@RabbitListener method registered → Spring creates:
  SimpleMessageListenerContainer
    │
    ├── ConnectionFactory → creates AMQP Connection to broker
    │
    ├── N Channel instances (one per consumer thread per concurrency setting)
    │
    ├── consumer calls channel.basicConsume(queue, autoAck=false, ...)
    │
    └── for each delivery:
           1. MessageConverter.fromMessage() → deserialise bytes → Java POJO
           2. Call @RabbitListener method with POJO
           3. On successful return: channel.basicAck(deliveryTag, false)
              On AmqpRejectAndDontRequeueException: channel.basicNack(tag, false, false)
              On other exception: channel.basicNack(tag, false, true) [requeue]

Channel is long-lived — not created per message.
One channel per consumer thread = N channels for concurrency=N.
```

---

## 4. The Code

### application.yml — Spring AMQP Configuration

```yaml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest            # use secrets manager in production, never plaintext
    virtual-host: /
    # Connection pool — publisher confirms
    publisher-confirm-type: correlated    # async publisher confirms
    publisher-returns: true               # return unroutable messages
    template:
      mandatory: true                     # trigger return callback when message unroutable
    listener:
      simple:
        acknowledge-mode: manual          # default for all listeners unless overridden
        concurrency: 3                    # min consumer threads
        max-concurrency: 10               # max consumer threads
        prefetch: 1                       # process 1 message at a time per consumer
        retry:
          enabled: true
          max-attempts: 3
          initial-interval: 1000          # 1 second initial backoff
          multiplier: 2.0                 # exponential: 1s → 2s → 4s
          max-interval: 10000             # cap at 10s
      type: simple                        # SimpleMessageListenerContainer
```

### Global MessageConverter — JSON for all messages

```java
@Configuration
public class RabbitMQConfig {

    // ✅ Register Jackson converter globally — all listeners receive typed POJOs
    // Without this: default is Java serialisation (insecure, version-brittle)
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // Wire converter into the RabbitTemplate (producer)
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        template.setMandatory(true);  // unroutable messages trigger return callback

        // Publisher return callback: called when message can't be routed to any queue
        template.setReturnsCallback(returned ->
            log.error("Message returned: exchange={} routingKey={} replyCode={}",
                returned.getExchange(),
                returned.getRoutingKey(),
                returned.getReplyCode())
        );

        return template;
    }
}
```

### Producer — RabbitTemplate Usage

```java
@Service
public class PaymentEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    // ✅ RIGHT WAY: Named exchange, explicit routing key, typed payload
    public void publishPaymentSuccess(PaymentEvent event) {
        rabbitTemplate.convertAndSend(
            "payment.topic.exchange",   // exchange name
            "payment.upi.success",      // routing key
            event                       // payload → serialised as JSON by converter
        );
        log.info("Published payment event: paymentId={}", event.getPaymentId());
    }

    // ❌ WRONG WAY: Publish to queue name directly via default exchange
    // Tightly couples producer to queue topology
    public void publishWrong(PaymentEvent event) {
        rabbitTemplate.convertAndSend("upi.settlement.queue", event);
        // Uses default exchange with queue name as routing key
        // Works but bypasses exchange-based routing architecture
    }

    // Publisher confirm: async confirmation that broker received the message
    public void publishWithConfirm(PaymentEvent event) {
        CorrelationData correlationData = new CorrelationData(event.getPaymentId());
        correlationData.getFuture().whenComplete((confirm, ex) -> {
            if (ex != null || !confirm.isAck()) {
                log.error("Broker NACK for paymentId={}", event.getPaymentId());
                // Alert or retry
            } else {
                log.debug("Broker confirmed paymentId={}", event.getPaymentId());
            }
        });

        rabbitTemplate.convertAndSend(
            "payment.topic.exchange",
            "payment.upi.success",
            event,
            correlationData
        );
    }
}
```

### Consumer — @RabbitListener Patterns

```java
@Component
@Slf4j
public class PaymentSettlementConsumer {

    private final SettlementService settlementService;

    // ✅ Simple consumer: typed payload, AUTO ack mode (ack on return, nack on exception)
    // Good for stateless services that either succeed or permanently fail
    @RabbitListener(queues = "payment.success.queue")
    public void handlePayment(@Payload PaymentEvent event,
                               @Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey) {

        log.info("Processing payment: paymentId={} routingKey={}",
            event.getPaymentId(), routingKey);

        // Throw AmqpRejectAndDontRequeueException for permanent failures → DLX
        // Throw any other exception for transient failures → requeue (default AUTO behaviour)
        try {
            settlementService.settle(event);
            // Method returns normally → AUTO ack
        } catch (InvalidPaymentException e) {
            // Permanent error: reject without requeue → DLX → DLQ
            throw new AmqpRejectAndDontRequeueException("Invalid payment: " + e.getMessage(), e);
        }
        // TransientException propagates normally → requeued by AUTO ack mode
    }

    // Manual ack: full control over ACK/NACK timing
    @RabbitListener(queues = "payment.success.queue",
                    ackMode = "MANUAL")
    public void handlePaymentManual(
            @Payload PaymentEvent event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {

        try {
            settlementService.settle(event);
            channel.basicAck(deliveryTag, false);  // success → ack

        } catch (TransientException e) {
            channel.basicNack(deliveryTag, false, true);   // requeue

        } catch (PermanentException e) {
            channel.basicNack(deliveryTag, false, false);  // no requeue → DLX
        }
    }

    // Multiple queues in one listener — different payloads handled in same method
    @RabbitListener(queues = {"payment.success.queue", "payment.manual.review.queue"})
    public void handleMultipleQueues(
            @Payload PaymentEvent event,
            @Header(AmqpHeaders.CONSUMER_QUEUE) String queue) {

        // Know which queue this message came from
        if ("payment.manual.review.queue".equals(queue)) {
            settlementService.settleWithReview(event);
        } else {
            settlementService.settle(event);
        }
    }

    // Concurrency range: min 3, max 10 threads for this listener
    @RabbitListener(queues = "payment.high.volume.queue",
                    concurrency = "3-10")
    public void handleHighVolume(@Payload PaymentEvent event) {
        settlementService.settle(event);
    }
}
```

### Inline Queue and Binding Declaration

```java
@Component
public class InlineQueueListenerExample {

    // ✅ Convenient for tests and simple setups
    // Declares queue, exchange, and binding inline via annotation
    @RabbitListener(bindings = @QueueBinding(
        value = @Queue(
            value = "order.notification.queue",
            durable = "true",
            arguments = {
                @Argument(name = "x-dead-letter-exchange", value = "order.dlx"),
                @Argument(name = "x-message-ttl", value = "3600000", type = "java.lang.Long")
            }
        ),
        exchange = @Exchange(
            value = "order.topic.exchange",
            type = ExchangeTypes.TOPIC
        ),
        key = "order.*.placed"  // routing key pattern
    ))
    public void handleOrderPlaced(@Payload OrderPlacedEvent event) {
        notificationService.notify(event);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Configuration Basics
**Interviewer asks:** "How do you configure a @RabbitListener to consume from a queue with manual acknowledge mode?"

**Hruday's answer:**
> Two approaches. First, set globally in `application.yml` under `spring.rabbitmq.listener.simple.acknowledge-mode=manual`. This applies to all `@RabbitListener` methods in the application. Second, override per-listener with the `ackMode` attribute: `@RabbitListener(queues="queueName", ackMode="MANUAL")`.
>
> With manual ack: the listener method receives a `Channel` parameter and a `@Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag` parameter. On success: `channel.basicAck(deliveryTag, false)`. On transient failure: `channel.basicNack(deliveryTag, false, true)` to requeue. On permanent failure: `channel.basicNack(deliveryTag, false, false)` to send to DLX.
>
> If the listener method doesn't call any ack/nack and returns normally: the message stays in an "unacknowledged" state. If the connection closes, it's requeued automatically. This unacknowledged state causes the queue to report N messages as "unacknowledged" in the management console — a signal that processing is slow or stuck.

---

### Q2 — Serialization
**Interviewer asks:** "What serialization does Spring AMQP use by default, and why is that a problem?"

**Hruday's answer:**
> By default, Spring AMQP uses Java serialization — it serializes your POJOs using `ObjectOutputStream` to produce binary bytes. Three production problems: (1) Java serialization is a well-known security vulnerability (OWASP #8: Software and Data Integrity Failures) — deserializing untrusted bytes can execute arbitrary code. (2) Java serialization is version-brittle: adding a field to a class changes the `serialVersionUID` if not explicitly managed, breaking deserialization of messages published before the deployment. (3) Java-only: non-JVM consumers (Node.js, Python, Go) can't read the messages.
>
> Solution: configure `Jackson2JsonMessageConverter` as a `@Bean` and wire it into `RabbitTemplate` and the listener container factory. Now all messages are serialized as JSON. More interoperable, debuggable (readable in RabbitMQ Management console), and version-tolerant (JSON ignores unknown fields by default).

---

### Q3 — Concurrency
**Interviewer asks:** "How does @RabbitListener concurrency work? If I set concurrency='3-10', what happens?"

**Hruday's answer:**
> `concurrency='3-10'` creates a `SimpleMessageListenerContainer` with 3 initial consumer threads and allows scaling up to 10. Each thread holds one AMQP channel and processes one message at a time (assuming `prefetch=1`). The container monitors queue depth and scales up toward 10 when messages are accumulating faster than the 3 threads can process. It scales back down to 3 after a period of low activity.
>
> Combined with `prefetch=1`: each of the 3-10 threads fetches one message at a time from the broker. The broker sends each message to an idle channel. This prevents one slow consumer from holding N messages while others are idle — prefetch=1 is fairest for work queue distribution.
>
> Deployment consideration: 3-10 threads mean 3-10 AMQP channels per service instance. If you run 5 instances: 15-50 channels total per consumer application. RabbitMQ brokers have a default channel limit — monitor channel count and set `channel-max` if needed for high-concurrency deployments.

---

### Q4 — Error Handling
**Interviewer asks:** "How do you send a message to the DLQ from a @RabbitListener without manually calling basicNack?"

**Hruday's answer:**
> Throw `AmqpRejectAndDontRequeueException` from the listener method. Spring AMQP's error handler catches this specific exception and calls `basicNack(deliveryTag, false, false)` — NACK without requeue. The message moves to the DLX (and then to the DLQ) automatically.
>
> Compare to other exceptions: throwing any other runtime exception in AUTO ack mode causes `basicNack ... requeue=true` by default — the message is requeued. If your consumer has a retry interceptor configured: Spring retries the method N times before escalating to the error handler.
>
> The pattern: distinguish exceptions at the throw site — throw `AmqpRejectAndDontRequeueException` for permanent failures (invalid data, business rule violation). Let transient exceptions propagate naturally (they cause requeue in AUTO mode, or you NACK+requeue manually in MANUAL mode). This one-exception-type rule replaces complex channel ack logic in most scenarios.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "AUTO ack = auto-commit like Kafka auto.commit" | "AUTO ack is similar to Kafka auto-commit" | "Superficially similar but mechanically different. Kafka auto-commit runs on a timer independent of processing — it can commit before processing finishes. AMQP AUTO ack mode acks IMMEDIATELY when the listener method returns normally (or nacks immediately on exception). There's no timer — ack is tied to the method's return. This means AMQP AUTO ack with an exception causes the message to be requeued (not lost). Kafka auto-commit can lose a message if the app crashes between commit and processing. AMQP AUTO is therefore safer than Kafka auto-commit — though both are inferior to manual ack for critical events." |
| "prefetch doesn't matter much" | "I'll leave prefetch at the default (250)" | "Default prefetch in Spring AMQP is 250 — the broker sends 250 messages to a channel before waiting for acks. With concurrency=3: 3 channels × 250 prefetch = 750 messages held by the consumer before a single ack is sent back. If the service crashes with 750 messages in-flight: all 750 are requeued. With prefetch=1: only 1 message per channel in-flight. Crash = at most 3 messages requeued. For work queues with slow processing: prefetch=1 ensures fair distribution. For high-throughput lightweight processing: higher prefetch reduces AMQP round-trips. Set prefetch based on mean processing time and acceptable re-delivery count on failure." |
| "RabbitTemplate is thread-safe" | "I'll create a new RabbitTemplate per request" | "RabbitTemplate IS thread-safe — it manages channels internally and is designed for concurrent use. Create ONE `RabbitTemplate` bean and inject it everywhere. Creating a new template per request is expensive (new connection negotiation, new channel creation per call). The template reuses channels from the underlying `CachingConnectionFactory` channel cache. Configure the channel cache size to match your expected concurrency to prevent channel creation overhead." |

---

## 7. Hruday's Real Experience Hook

> "Spring AMQP's `@RabbitListener` and `@KafkaListener` follow the same Spring idiom — annotated methods, typed payloads, auto-configuration. At SAP Labs, I use `@Scheduled` and `@Async` extensively — the mental model of 'annotate a method to declare its invocation trigger' is the same. REST has `@PostMapping`, async tasks have `@Async`, scheduled jobs have `@Scheduled`, Kafka consumers have `@KafkaListener`, RabbitMQ consumers have `@RabbitListener`. The pattern is consistent across the Spring ecosystem. Learning one deeply makes the others feel familiar — the key differences are the specific ack semantics and error handling wiring unique to each protocol."

---

## 8. Scale Evolution

**1,000 users →** Single `@RabbitListener` with default concurrency (1). AUTO ack mode. Jackson converter configured. Sufficient for low volume with simple retry.

**100,000 users →** Concurrency range (3-10) per consumer service. Manual ack mode for critical event queues. Retry interceptor with backoff on transient failures. Publisher confirms enabled. DLQ consumer for failed messages.

**10 million users →** Multiple service instances per consumer type (N pods, each with concurrency 3-10 → N×10 total consumers). Channel cache size tuned to max concurrency per instance. Prefetch tuned per queue type. Separate connection factories per consumer group to isolate connection failures. Spring AMQP metrics exported to Prometheus.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Settlement consumers with manual ack: process payment, ack only after DB write succeeds. DLQ routing for invalid payment events via AmqpRejectAndDontRequeueException. | "Walk me through how you'd configure a RabbitMQ consumer for payment settlement with retry and DLQ." |
| Swiggy / Meesho | Order notification consumers with concurrency scaled to handle lunchtime/dinnertime order spikes. Publisher confirms for order confirmation events. | "Your notification consumer is falling behind during peak hours. What concurrency and prefetch settings do you change?" |
| Adobe / Microsoft | Asset processing listener consuming rendering jobs. Jackson converter for cross-service JSON compatibility. Inline queue declaration for integration test setup. | "How do you configure type-safe JSON deserialization in Spring AMQP consumer that receives messages from a non-Java service?" |
| SAP Labs (current) | New event-driven integration layer: Spring AMQP consumers for document processing events alongside existing REST-based Oracle integration. | "How would you add a RabbitMQ consumer to an existing Spring Boot application that currently uses only REST for SAP integration?" |

---

## 10. Related Topics — What to Study Next

- **Topic 116 — RabbitMQ Exchanges** — the exchange declarations and bindings that determine where `RabbitTemplate.convertAndSend()` routes messages are defined in exchange config; producer and consumer config are two halves of the same setup
- **Topic 118 — Dead Letter Queues and Message TTL** — the DLX routing triggered by `AmqpRejectAndDontRequeueException` is configured at the queue level; understanding TTL + DLX config makes the consumer error handling code in this topic complete
- **Topic 111 — Spring Kafka @KafkaListener and KafkaTemplate** — the Spring Kafka equivalent of this topic; comparing the two side-by-side clarifies where the patterns are identical (JSON converter, typed payload, concurrency) and where they differ (AMQP ack vs Kafka offset commit, exchange routing vs consumer group partition assignment)
- **Topic 121 — Idempotent Consumers** — with manual ack and retry, a message may be re-delivered if ack is lost; idempotency patterns ensure re-delivered messages don't cause duplicate business side effects

---

*Part 6 · Spring AMQP @RabbitListener · Full Stack Interview Guide · Hruday D · 2026*
