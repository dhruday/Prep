# Async Processing — Offloading Work to Queues
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The core principle**: an HTTP request should return the moment it has done the minimum work required to serve the user; anything that isn't needed before the response should be offloaded to a background process
- **Synchronous trap**: sending an email, generating a PDF, resizing an image, writing audit logs — if these run in the HTTP thread, the user waits for all of them; the API is only as fast as its slowest background task
- **`@Async` + Spring ThreadPoolTaskExecutor**: simple in-process async; fire-and-forget within the JVM; fast to set up; NOT durable — if the JVM crashes or pod restarts mid-task, work is lost; good for low-stakes non-critical background work (analytics events, non-critical notifications)
- **Kafka for durable async**: when the work must not be lost (invoice generation, order confirmation email, payment settlement), publish an event to a Kafka topic; return HTTP 202 Accepted; a separate consumer service picks up the event durably; survives pod restarts, consumer failures, and deployment rollbacks
- **Pattern**: `POST /api/orders` → validate → `orderRepository.save(order)` (sync) → `kafkaTemplate.send("orders.created", event)` → return `202 Accepted` with order ID; consumer handles email + invoice + analytics in the background
- **Dead Letter Queue (DLQ)**: when Kafka consumer fails to process a message after max retries, publish to `orders.dlq`; DLQ listener alerts for manual intervention; prevents silent data loss on consumer errors
- ✅ **Hruday's anchor**: Oracle (Capgemini engagement) — invoice generation was synchronous inside the order confirmation API; generating a PDF invoice involved: query order details, calculate taxes, render PDF template, upload to S3, store S3 URL in database — 2-3 seconds per order; moved invoice generation to a Kafka consumer (`orders.invoice.generate` topic); order API now saves the order and publishes the event, returning 202 in 120ms; invoices are generated within 5 seconds in the background by the consumer; API response 2.8s → 120ms; customer checkout experience transformed

---

## 1. One-Line Definition
Async processing is the pattern of performing non-critical, time-consuming work outside the HTTP request/response cycle by publishing work items to a queue that's processed independently by background workers.

---

## 2. The Problem It Solves

An e-commerce order confirmation flow might need to:
1. Validate the order (MUST be synchronous — user needs the result)
2. Save the order to the database (MUST be synchronous — user needs the order ID)
3. Send a confirmation email (user doesn't need to wait for this)
4. Generate a PDF invoice (user doesn't need this immediately)
5. Update inventory in the warehouse system (can lag by a few seconds)
6. Send analytics events to BI pipeline (totally non-blocking)
7. Notify the delivery service (can process within seconds)

If all 7 steps run synchronously in the HTTP handler, the API response time is the SUM of all steps. Step 3 alone (sending email via SendGrid) might take 300-500ms. PDF invoice generation: 2-3 seconds.

The user only needed steps 1 and 2 to get their order confirmed. Steps 3-7 could happen in the next 5-10 seconds with zero customer impact. Making the user wait for all of them is both unnecessary and bad UX.

Async processing separates the "synchronous minimum" (validate + persist) from the "background work" (notify + generate + analyze). The HTTP response is immediate; background work happens concurrently.

---

## 3. How It Works Internally

### @Async — In-Process Async with Spring

```
HTTP Thread:         Task Thread Pool:
order()             [ProxyMethod intercepted]
  ↓                      ↓
validate()          @Async method invoked on separate thread
  ↓                      ↓
save()              sendEmailAsync()  ← runs in TaskExecutor thread pool
  ↓                      ↓
sendEmailAsync()    executes email sending (300ms)
  ↓                      ↓
return 200          thread returns to pool
  (2ms)

Spring mechanism:
  @Async is implemented via proxy (CGLIB)
  Spring intercepts calls to @Async methods
  Wraps the method body in a Runnable
  Submits the Runnable to a ThreadPoolTaskExecutor
  The calling thread DOES NOT wait (fire-and-forget)
  Returns CompletableFuture if the method returns one
  
LIMITATIONS:
  - Work exists only in JVM heap (thread pool queue)
  - JVM crash / pod restart: all queued tasks are LOST
  - No retry on failure (unless hand-coded)
  - No visibility into failed tasks (unless hand-logged)
  - NOT appropriate for work that cannot be lost (invoices, payments, emails)
  - Calling @Async from within the same class = DOES NOT WORK (self-invocation bypass proxy)
```

### Kafka — Durable Async Processing

```
Producer (Order API):                 Kafka Broker:              Consumer (Invoice Service):
                                                                 
POST /api/orders                      Topic: orders.created      @KafkaListener
  ↓                                        ↓                        ↓
validate order                        Partition 0:               Read OrderCreatedEvent
  ↓                                   [event-1]                    ↓
save to DB (returns ID: 123)          [event-2]                  processInvoice()
  ↓                                   [event-3]                    ↓
publish OrderCreatedEvent             Partition 1:               generatePDF()
  { orderId: 123 }                    [event-4]                    ↓
  ↓                                   [event-5]                  uploadToS3()
return HTTP 202 Accepted              ...                          ↓
  { "orderId": 123,                                             saveInvoiceUrl()
    "status": "PROCESSING" }          Kafka stores events          ↓
  ↑                                   for retention period       commit offset
 120ms total                          (7 days default)             ↓ (success)
                                                               or publish to DLQ (max retries exceeded)

DURABILITY GUARANTEES:
  - Even if the Order API pod crashes after sending the event, Kafka has the message
  - Even if the Invoice Service crashes mid-processing, Kafka re-delivers the message
    (uncommitted offset → consumer reads from last committed offset on restart)
  - At-least-once delivery: the invoice may be generated twice on consumer restart
    → Make the consumer idempotent (check if invoice already exists before creating)
    → Use orderId as idempotency key: if invoices.findByOrderId(123) exists, skip generation

RETRY FLOW with @RetryableTopic:
  Consumer fails to process event (e.g., S3 timeout)
    → Retry 1 after 1 second
    → Retry 2 after 2 seconds  
    → Retry 3 after 4 seconds (exponential backoff)
    → After max retries: publish to orders.invoice.generate.dlt (Dead Letter Topic)
    → DLT listener alerts ops / stores for manual reprocessing
```

---

## 4. The Code

### Wrong Way — Synchronous Processing in HTTP Handler

```java
// ❌ WRONG — all post-order work in the HTTP request thread

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    
    @Autowired OrderService orderService;
    @Autowired EmailService emailService;
    @Autowired InvoiceService invoiceService;
    @Autowired InventoryService inventoryService;
    @Autowired AnalyticsService analyticsService;
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) {
        
        // ❌ All steps run in the HTTP thread — user waits for ALL of them
        
        // Step 1: validate (necessary — 5ms)
        orderService.validate(request);
        
        // Step 2: save (necessary — 30ms)
        Order order = orderService.save(request);
        
        // ❌ Step 3: send email (NOT necessary for response — 300-500ms via SendGrid)
        emailService.sendConfirmationEmail(order);  // blocks user for 300ms
        
        // ❌ Step 4: generate PDF invoice (NOT necessary for response — 2000-3000ms)
        invoiceService.generateAndUpload(order);    // blocks user for 2+ seconds
        
        // ❌ Step 5: update inventory (could lag a few seconds — 200ms + risk of timeout)
        inventoryService.updateStock(order);
        
        // ❌ Step 6: send analytics (totally non-blocking — 100ms)
        analyticsService.trackOrderCreated(order);
        
        return ResponseEntity.ok(new OrderResponse(order.getId(), "CONFIRMED"));
        // Total response time: 5 + 30 + 400 + 2500 + 200 + 100 = 3235ms ← user waits 3+ seconds
        // AND if ANY step fails (S3 timeout, email service down), the ENTIRE order creation fails
    }
}
```

### Right Way — @Async for Non-Critical Fire-and-Forget

```java
// ✅ @Async for low-stakes, non-critical background work

@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean("taskExecutor")
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);              // always 5 threads ready
        executor.setMaxPoolSize(10);             // can burst to 10
        executor.setQueueCapacity(100);          // queue up to 100 tasks before rejecting
        executor.setKeepAliveSeconds(60);        // idle threads beyond core size live 60s
        executor.setThreadNamePrefix("async-task-");
        executor.setRejectedExecutionHandler(new CallerRunsPolicy()); // caller runs on queue full
        executor.initialize();
        return executor;
    }
}

@Service
public class AnalyticsService {
    
    // ✅ @Async: this method runs on the taskExecutor thread pool, NOT the HTTP thread
    // HTTP handler returns immediately; analytics event is tracked in background
    @Async("taskExecutor")
    public CompletableFuture<Void> trackOrderCreated(Order order) {
        try {
            // Non-critical work: analytics events can be dropped without business impact
            analyticsClient.track("order.created", Map.of(
                "orderId", order.getId(),
                "userId", order.getUserId(),
                "totalAmount", order.getTotalAmount()
            ));
        } catch (Exception e) {
            // ✅ Log but don't rethrow — analytics failure must NOT propagate to caller
            log.warn("Failed to track order created event: orderId={}", order.getId(), e);
        }
        return CompletableFuture.completedFuture(null);
    }
    
    // ✅ @Async works correctly only when called from a DIFFERENT Spring bean
    // Self-invocation (calling an @Async method within the same class) bypasses the proxy
    // The @Async annotation is on the bean proxy, not the raw class method
}

@Service
public class OrderService {
    
    @Autowired AnalyticsService analyticsService;  // ← different bean = proxy works correctly
    
    @Transactional
    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(Order.from(request));
        
        // ✅ Fire and forget — HTTP thread continues immediately
        // If JVM crashes: analytics event lost (acceptable for analytics)
        analyticsService.trackOrderCreated(order);  // runs on async thread pool
        
        return order;  // returns 35ms (save time), not 135ms (save + analytics)
    }
}
```

### Right Way — Kafka for Durable Async Processing

```java
// ✅ Kafka producer: publish event, return 202 immediately

@Service
@Slf4j
public class OrderService {
    
    @Autowired OrderRepository orderRepository;
    @Autowired KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    
    @Transactional   // ← DB save and Kafka publish in same transaction (if using Transactional Outbox)
    public OrderResponse createOrder(OrderRequest request) {
        // Step 1: validate (sync — user needs this)
        validate(request);
        
        // Step 2: save to DB (sync — user needs orderId)
        Order order = orderRepository.save(Order.from(request));
        
        // Step 3: publish event to Kafka (NOT sync work — just sending a message)
        // kafkaTemplate.send() is itself fast (< 5ms) — just appends to producer buffer
        OrderCreatedEvent event = new OrderCreatedEvent(
            order.getId(),
            order.getUserId(),
            order.getTotalAmount(),
            order.getItems(),
            Instant.now()
        );
        
        kafkaTemplate.send("orders.created", order.getId().toString(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    // ✅ Log broker failure but DON'T fail the order
                    // Kafka publish failure is a problem to alert on, not to propagate to user
                    // The transactional outbox pattern solves this more robustly
                    log.error("Failed to publish OrderCreatedEvent for orderId={}", 
                        order.getId(), ex);
                } else {
                    log.debug("OrderCreatedEvent published: orderId={}, partition={}, offset={}", 
                        order.getId(), 
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
        
        // ✅ Return immediately — 50ms total (validate + save)
        // Email, invoice, analytics happen in background within seconds
        return new OrderResponse(order.getId(), "PROCESSING");
    }
}

// Controller returns 202 Accepted (not 200 OK — the work is still in progress)
@PostMapping
public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest request) {
    OrderResponse response = orderService.createOrder(request);
    // ✅ HTTP 202 Accepted: "request received, processing in background"
    // 200 OK would imply all work is done; 202 is the correct semantic for async processing
    return ResponseEntity.accepted().body(response);
}
```

```java
// ✅ Kafka consumer: durable async processing with @RetryableTopic

@Slf4j
@Service
public class InvoiceGenerationConsumer {
    
    @Autowired InvoiceService invoiceService;
    @Autowired InvoiceRepository invoiceRepository;
    
    // ✅ @RetryableTopic: automatic retry with exponential backoff + DLT routing
    // Kafka handles retry scheduling — consumer doesn't need Thread.sleep() loops
    @RetryableTopic(
        attempts = "4",                               // 1 original + 3 retries
        backoff = @Backoff(
            delay = 1000,                             // first retry after 1 second
            multiplier = 2.0,                         // 1s → 2s → 4s backoff
            maxDelay = 10000                          // cap at 10 seconds
        ),
        dltTopicSuffix = ".dlt",                     // dead letter topic: orders.created.dlt
        include = {S3UploadException.class, TemplateRenderException.class}  // only retry these
    )
    @KafkaListener(
        topics = "orders.created",
        groupId = "invoice-generation-service",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void onOrderCreated(OrderCreatedEvent event, 
                               @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
                               @Header(KafkaHeaders.OFFSET) long offset) {
        log.info("Processing invoice generation: orderId={}, partition={}, offset={}", 
            event.getOrderId(), partition, offset);
        
        // ✅ Idempotency check: if pod restarted mid-processing, Kafka re-delivers
        // Without this check: duplicate invoices generated for the same order
        if (invoiceRepository.existsByOrderId(event.getOrderId())) {
            log.info("Invoice already exists for orderId={} — skipping (idempotent)", 
                event.getOrderId());
            return;  // ← idempotent: duplicate delivery is handled gracefully
        }
        
        // Process the invoice (may take 1-3 seconds — that's fine, we're async)
        invoiceService.generateAndStore(event);
        
        log.info("Invoice generated successfully for orderId={}", event.getOrderId());
        // ← Kafka auto-commits offset after this method returns without exception
        // If method throws: Kafka does NOT commit offset → retry on next poll
    }
    
    // ✅ DLT handler: called when all retries exhausted
    @DltHandler
    public void handleDeadLetter(OrderCreatedEvent event, 
                                  @Header(KafkaHeaders.EXCEPTION_MESSAGE) String errorMessage) {
        log.error("Invoice generation FAILED after all retries: orderId={}, error={}", 
            event.getOrderId(), errorMessage);
        
        // Alert operations team (PagerDuty, Slack, etc.)
        alertService.sendAlert(
            "Invoice generation failure", 
            "orderId=" + event.getOrderId() + " requires manual intervention",
            Severity.HIGH
        );
        
        // Store in failed_events table for manual reprocessing
        failedEventRepository.save(FailedEvent.from(event, errorMessage));
    }
}
```

```java
// ✅ Kafka configuration for the consumer

@Configuration
@EnableKafka
public class KafkaConsumerConfig {
    
    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;
    
    @Bean
    public ConsumerFactory<String, OrderCreatedEvent> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "invoice-generation-service");
        
        // ✅ LATEST for new consumer groups: start from new messages
        // Production setting — don't reprocess all historical events on first start
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");  // EARLIEST for recovery
        
        // ✅ Manual commit mode with @RetryableTopic for fine-grained control
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        
        // Batch size and timing
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 10);  // process 10 records per poll
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300_000);  // 5 min max between polls
        
        return new DefaultKafkaConsumerFactory<>(
            props,
            new StringDeserializer(),
            new JsonDeserializer<>(OrderCreatedEvent.class)
        );
    }
    
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, OrderCreatedEvent> 
           kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, OrderCreatedEvent> factory = 
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.setConcurrency(3);  // 3 concurrent consumer threads per topic partition assignment
        // ✅ MANUAL_IMMEDIATE: offset committed immediately after listener returns
        factory.getContainerProperties().setAckMode(AckMode.RECORD);
        return factory;
    }
}
```

### Transactional Outbox Pattern (Advanced — Preventing Lost Events)

```java
// ✅ Transactional Outbox: solve the "DB committed but Kafka publish failed" race condition

// Problem: what if we save the order to DB (committed) but Kafka publish fails?
// Order exists in DB but no event → invoice never generated → customer gets no invoice
// Solution: Outbox pattern — write event to DB IN THE SAME TRANSACTION as the order

@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
    @Id @GeneratedValue
    private Long id;
    private String aggregateType;   // "Order"
    private String aggregateId;     // orderId
    private String eventType;       // "OrderCreated"
    
    @Column(columnDefinition = "jsonb")
    private String payload;         // JSON of OrderCreatedEvent
    
    private Instant createdAt;
    private boolean published;      // false until Kafka publish confirmed
}

@Service
@Transactional
public class OrderService {
    
    @Autowired OrderRepository orderRepository;
    @Autowired OutboxEventRepository outboxRepository;
    
    public OrderResponse createOrder(OrderRequest request) {
        // Save order + outbox event IN THE SAME DB TRANSACTION
        Order order = orderRepository.save(Order.from(request));
        
        // ✅ Write event to outbox table — same transaction as the order
        // If DB commits: both order AND outbox event exist → guaranteed consistency
        // If DB rolls back: neither order NOR event exist → no phantom events
        outboxRepository.save(OutboxEvent.builder()
            .aggregateType("Order")
            .aggregateId(order.getId().toString())
            .eventType("OrderCreated")
            .payload(objectMapper.writeValueAsString(OrderCreatedEvent.from(order)))
            .createdAt(Instant.now())
            .published(false)
            .build());
        
        return new OrderResponse(order.getId(), "PROCESSING");
    }
    // ← Transaction commits both order and outbox event atomically
}

// Separate relay scheduler reads unpublished outbox events and publishes to Kafka
@Component
@Slf4j
public class OutboxEventRelay {
    
    @Scheduled(fixedDelay = 1000)  // check every second
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pending = outboxRepository
            .findByPublishedFalseOrderByCreatedAtAsc(PageRequest.of(0, 50));
        
        for (OutboxEvent event : pending) {
            try {
                kafkaTemplate.send(
                    topicForEventType(event.getEventType()),
                    event.getAggregateId(),
                    event.getPayload()
                ).get(5, TimeUnit.SECONDS);  // sync send with timeout from relay
                
                event.setPublished(true);  // mark published IN SAME TRANSACTION
                outboxRepository.save(event);
                
            } catch (Exception e) {
                // Relay will retry on next scheduled run (event.published remains false)
                log.error("Failed to publish outbox event id={}: {}", event.getId(), e.getMessage());
            }
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When should you use @Async versus a message queue like Kafka for background processing?"

**Hruday's answer:**
> The deciding factor is durability — can you afford to lose the work?
>
> `@Async` is right for work where losing it is acceptable if the JVM crashes. Analytics events, non-critical notifications, logging side effects — if the pod restarts and the async thread queue disappears, the business doesn't care. `@Async` with a Spring `ThreadPoolTaskExecutor` is easy to set up, runs in the same JVM, and adds negligible latency (the fire-and-forget call is instant).
>
> Kafka is right when the work must not be lost. Invoice generation, confirmation emails, payment settlement, inventory updates — if the service crashes mid-processing, Kafka re-delivers the message when the consumer restarts because the offset wasn't committed. Kafka persists messages for the configured retention period (7 days typically), so even a prolonged outage doesn't lose work.
>
> The second factor is decoupling. `@Async` keeps everything in one service — tight coupling but simple. Kafka naturally decouples producer (order API) from consumer (invoice service, notification service, analytics service). You can add a new consumer to the same topic without changing the order API. You can scale invoice generation independently. This service boundary clarity becomes important as the system grows.
>
> In practice: `@Async` for analytics and non-critical notifications in the order confirmation flow; Kafka for invoice generation, email sending, and anything where the consumer might be a different microservice.

---

### Q2 — Oracle Experience Deep Dive
**Interviewer asks:** "Walk me through the invoice generation optimization at Oracle — what specifically was slow and how did the Kafka solution work?"

**Hruday's answer:**
> The order confirmation API at the Oracle client engagement had a measurable 2.8-second P95 response time. When I profiled the endpoint with Java Flight Recorder, the time breakdown was: 120ms for order validation and database save (the necessary work), plus 2.5-2.7 seconds for invoice generation (completely unnecessary for the API response).
>
> Invoice generation involved: querying the full order with all items ( JOIN-heavy), loading the customer's billing details, calculating tax breakdown by item category, rendering an HTML template to PDF using Apache FreeMarker + iText, uploading the PDF to S3, and saving the S3 URL back to the orders table. Six steps, each with its own latency. The user was waiting for all six before getting their order confirmed.
>
> The fix: we created a Kafka topic `orders.invoice.generate`. After saving the order, the API published an `InvoiceGenerationRequested` event containing just the order ID and returned 202 immediately. A separate Spring Boot consumer service subscribed to this topic and ran the full invoice generation pipeline.
>
> API response went from 2.8 seconds to 120 milliseconds. Invoices were generated within 5 seconds of order creation (the consumer was fast — it had no HTTP latency constraints). We added `@RetryableTopic` on the consumer with 3 retries and exponential backoff, and a DLT handler that alerted Slack when invoices failed after max retries.
>
> One thing we got right from the start: the consumer was idempotent. If Kafka re-delivered the event for any reason, the consumer checked `invoiceRepository.existsByOrderId(orderId)` before generating — if already generated, it returned immediately. This prevented duplicate invoices on consumer restart.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What is the transactional outbox pattern and when do you need it?"

**Hruday's answer:**
> The transactional outbox solves a specific race condition: you've committed an order to the database and now tried to publish a Kafka event — but the Kafka broker is temporarily unavailable. The order exists in the DB with no corresponding event. The invoice will never be generated. The customer gets no invoice silently.
>
> The problem exists because we have two separate systems (database and Kafka broker) and writing to both independently can fail partially. The database transaction can commit, but the Kafka publish can fail after the transaction is already committed.
>
> The outbox pattern: instead of publishing directly to Kafka inside the service, write the event to an `outbox_events` table in the SAME database transaction as the business entity. Now both the order and the event are written atomically — either both commit or both rollback. There can never be an order without a corresponding outbox event.
>
> A separate relay process (a scheduled job or a Debezium CDC connector reading the database change log) reads unprocessed outbox events and publishes them to Kafka. If Kafka is unavailable, the relay retries. If the relay crashes, it picks up from the last unprocessed event on restart.
>
> When do you need it: for any event that absolutely must be published when a transaction commits, in systems where Kafka availability cannot be assumed to be higher than database availability. In high-stakes flows — payment created, order confirmed — I'd use the outbox pattern. For analytics events and non-critical notifications, the simpler direct Kafka publish is sufficient.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design the async processing strategy for an e-commerce order checkout flow at Swiggy/Zomato scale."

**Hruday's answer:**
> At that scale, the checkout flow might handle 50,000–100,000 orders per hour during peak (dinner rush). The synchronous part of each request must be minimal to maintain low P99 latency.
>
> The synchronous minimum: validate the order (items available, prices correct, user authenticated), reserve inventory to prevent oversell (distributed lock or optimistic lock on inventory), charge the payment (synchronous because failure must be immediate), and persist the order. Return the response. Everything else is async.
>
> Async consumers on Kafka:
> - `orders.created` → [confirmation email consumer] [invoice generation consumer] [analytics consumer] [delivery coordination consumer]
> - `orders.payment_confirmed` → [kitchen notification consumer] [loyalty points consumer]
>
> Multiple consumers with different group IDs each get all events independently. Adding a new consumer (like loyalty points) doesn't touch the checkout API.
>
> For durability: outbox pattern for payment confirmation events (those must never be lost). Direct Kafka publish for analytics events (eventual consistency acceptable).
>
> Consumer isolation: invoice generation, email, and analytics consumers run in separate services with independent scaling. Delivery coordination runs as its own service with higher priority. If the analytics consumer is slow or overloaded, it doesn't affect order processing at all.
>
> Monitoring: consumer lag per group ID per partition (Kafka consumer lag metric). If the invoice consumer is lagging 10 minutes behind (processing slowly), it's visible without impacting the order API. SLA: invoice generated within 60 seconds of order creation — alert when consumer lag threatens this SLA.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "@Async is enough for all background work" | "I can make any background task @Async to speed up the API" | `@Async` runs work on a thread pool INSIDE the same JVM; if the JVM crashes (OOM error, pod eviction, deployment restart), all queued tasks in the thread pool queue disappear silently; there's no persistence, no retry, no acknowledgment; for anything that matters (emails, invoices, payment side effects), losing the work is a bug; `@Async` is only appropriate for work where occasional loss is acceptable — non-critical analytics, audit logs, statistics updates; the question to ask: if this task silently disappears because the pod restarted, would the business care? If yes → Kafka; if no → @Async is fine |
| "Return 200 OK for async operations" | "The API returns 200 because the order was saved successfully" | HTTP semantics matter: `200 OK` means the request was completed — all work is done; `202 Accepted` means the request was received and accepted for processing, but processing is still in progress; an order API that saves the order but processes invoice/email/inventory async should return `202 Accepted` because the complete order processing is NOT finished; the response body can include an `orderId` and a `statusUrl` where the client can poll for completion; returning 200 when work is still in progress confuses API consumers and violates the contract they'd reasonably expect |
| "Just retry failed Kafka messages manually" | "If a consumer fails, we'll manually reprocess the message" | Manual reprocessing is an ops firefighting process that happens at 3 AM and loses messages that weren't detected; `@RetryableTopic` automates retry with configurable backoff (exponential is correct — avoid thundering herd on recovery); the DLT (Dead Letter Topic) is the safety net — messages that exhaust retries go to the DLT where they can be inspected, alerted on, and replayed when the root cause is fixed; the DLT handler should ALWAYS send an alert and persist the failed message for visibility; "we'll fix it manually" is not a production reliability strategy |

---

## 7. Hruday's Real Experience Hook
> "The Oracle invoice optimization was the most impactful single change I made to that system. The 2.8-second order confirmation feels like a prehistoric UX by today's standards — but nobody had questioned it because it had always been that way and customers completed their orders anyway.
>
> What made the Kafka migration non-trivial was the idempotency requirement. Our first attempt at the consumer didn't have an idempotency check. During testing, we deliberately simulated a consumer pod restart mid-processing — exactly what happens during a Kubernetes rolling deployment. Kafka re-delivered the in-flight messages. Without the `existsByOrderId` check, we generated duplicate PDF invoices for those orders. Some customers received two invoice emails. That was an embarrassing bug to discover in staging.
>
> The fix — checking for an existing invoice before generating — is obvious in retrospect. But it's easy to miss because the happy path (no restart, no re-delivery) works perfectly without it. The rule I now follow: any Kafka consumer that creates a persistent artifact (generates a file, sends an email, charges a payment) must have an idempotency key check as the first line of the handler. Not as an afterthought.
>
> The second lesson: @RetryableTopic changed how I think about consumer failure. Before using it, I had hand-coded retry loops with Thread.sleep(). @RetryableTopic is dramatically cleaner — it handles the backoff scheduling, the retry topic routing, and the DLT routing automatically. The consumer code just throws an exception and the infrastructure handles the rest."

---

## 8. Scale Evolution

**Small app (single service, < 1K orders/day) →** `@Async` for non-critical background work (analytics, logs); synchronous email sending with try/catch to not block on failure; no Kafka needed; Spring's `ApplicationEventPublisher` as a simple in-process event bus for decoupling within the monolith.

**Medium app (10K–100K orders/day, 3-5 services) →** Kafka for durable events (invoice, email, inventory); `@RetryableTopic` + DLT; consumer group per downstream service; direct Kafka publish (no outbox yet — Kafka uptime usually sufficient); Micrometer consumer lag metrics.

**Large scale (Oracle/SAP, 100K+ orders/day, 20+ services) →** Transactional outbox pattern for payment and order events; Kafka with multiple partitions per topic (parallelism); consumer isolation — each consumer type in its own service with independent scaling; Debezium CDC reader as an alternative to the relay outbox; consumer lag SLAs with PagerDuty alerts; SAGA pattern for distributed transactions across services.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment events trigger downstream: settlement, ledger update, merchant notification, tax reporting; 200ms payment API that kicks off 8 downstream processes via Kafka; outbox pattern for payment events (financial consistency critical) | Kafka durable events for financial flows; outbox pattern; idempotency in payment processing |
| Swiggy / Meesho | Order placed → restaurant notification (Kafka, < 5s SLA) → delivery assignment → live tracking → analytics → review prompt; each step a separate consumer group; consumer lag monitoring for kitchen SLA | Multi-consumer fan-out; consumer lag SLAs for time-sensitive notifications; @RetryableTopic |
| Adobe / Microsoft | Document processing: upload triggers async conversion (PDF,DOCX,HMTL), thumbnail generation, full-text indexing, sharing notifications; Azure Service Bus instead of Kafka; similar async patterns | Experience translates to Azure Service Bus / AWS SQS; same patterns, different broker |
| SAP Labs | Direct: Oracle invoice generation 2.8s → 120ms via Kafka consumer; @RetryableTopic with DLT; idempotency key on consumer; transactional outbox pattern knowledge; Spring Kafka config @KafkaListener groupId | Specific numbers; idempotency detail; @RetryableTopic usage; DLT handler alerting |

---

## 10. Related Topics — What to Study Next

- **Topic 248 — Spring Cache Abstraction** — async processing reduces write path latency; caching reduces read path latency; together they address both directions of API performance; the consumer that processes an order event might update cached data (e.g., user order count cache) using `@CacheEvict` after processing
- **Topic 244 — N+1 Query Problem** — Kafka consumers are often the place where N+1 queries appear in unexpected ways; a consumer that processes a batch of order IDs and loads each order's items individually in a loop is an N+1 problem inside an async consumer; the same JOIN FETCH fixes apply; consumers that process slowly due to N+1 increase consumer lag and can breach SLAs
- **Resilience4j Circuit Breaker** — when a consumer calls downstream services (S3, email API, inventory service), those can fail; a circuit breaker on the downstream call prevents the consumer from retrying 100% CPU on a failed external service; the DLQ handles persistent failures; short-circuit + DLQ is the complete failure handling strategy
- **SAGA Pattern (Distributed Transactions)** — when an async flow (order → payment → inventory → notification) must be rolled back if one step fails, the SAGA pattern coordinates compensating transactions via Kafka events; e.g., if inventory update fails, publish an `OrderCancelled` event that triggers a payment refund; this is the next level of async complexity after understanding basic event publishing

---

*Part 14 · Async Processing — Offloading Work to Queues · Full Stack Interview Guide · Hruday D · 2026*
