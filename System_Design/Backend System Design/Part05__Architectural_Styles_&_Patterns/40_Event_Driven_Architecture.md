# 40. Event-Driven Architecture

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Event-Driven Architecture (EDA)** is a software design pattern where systems communicate by producing and consuming events—significant state changes or occurrences—rather than making direct synchronous calls. Events are published to a message broker (Kafka, RabbitMQ) and consumed asynchronously by interested services.

**What it is:**
- Producers publish events to message broker when something happens
- Consumers subscribe to events and react independently
- Loose coupling (producers don't know consumers)
- Asynchronous communication (fire-and-forget)

**Why it exists:**
- Decoupling (services don't depend on each other directly)
- Scalability (process events in parallel, add consumers without changing producers)
- Resilience (consumers down, events queued and processed later)
- Real-time processing (react to events as they happen)

**Problem it solves:**
- Tight coupling (services calling each other directly)
- Synchronous bottlenecks (waiting for responses)
- Single point of failure (one service down, entire chain fails)
- Difficulty adding new features (must modify existing services)

**Event flow:**

```
Service A → Publish event → Kafka/RabbitMQ
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              Service B    Service C    Service D
             (consume)    (consume)    (consume)
```

💡 **Interview Opening:** "Event-Driven Architecture uses events to trigger and communicate between decoupled services. When a user places an order, the Order Service publishes an `OrderCreated` event to Kafka. Multiple services consume this independently: Inventory Service deducts stock, Email Service sends confirmation, Analytics Service tracks metrics—all without Order Service knowing they exist. This provides loose coupling (add new consumers without changing producer), scalability (process millions of events/second with Kafka), and resilience (if Email Service down, event retained for 7 days, processed when service recovers). Trade-off: eventual consistency (not immediate) and complexity (event versioning, ordering, idempotency). Companies like Uber (1+ trillion Kafka events/day), Netflix, and LinkedIn use EDA for real-time processing at massive scale."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Event-Driven Architecture Patterns**

#### **1. Event Notification**

```
Simple notification: Something happened

Example event:
{
  "eventType": "OrderCreated",
  "orderId": "12345",
  "timestamp": "2024-02-15T10:30:00Z"
}

Consumer behavior:
- Receives notification
- If needs details, calls Order Service API
- GET /api/orders/12345

Pros:
✅ Small event size (low bandwidth)
✅ Producer doesn't expose full data

Cons:
❌ Consumer must make additional API call (latency)
❌ Coupling (consumer depends on Order Service availability)
```

#### **2. Event-Carried State Transfer**

```
Event contains all necessary data

Example event:
{
  "eventType": "OrderCreated",
  "orderId": "12345",
  "userId": "67890",
  "items": [
    { "productId": "abc", "quantity": 2, "price": 29.99 }
  ],
  "totalAmount": 59.98,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "San Francisco",
    "zip": "94102"
  },
  "timestamp": "2024-02-15T10:30:00Z"
}

Consumer behavior:
- Receives complete data
- Stores locally if needed
- No additional API calls

Pros:
✅ No coupling (consumer independent)
✅ Low latency (no API calls)
✅ Works even if producer down

Cons:
❌ Large event size (bandwidth)
❌ Data duplication
❌ Eventually consistent
```

#### **3. Event Sourcing**

```
Store events as source of truth, not current state

Traditional (state-based):
orders table:
id | user_id | status    | total_amount
1  | 123     | CONFIRMED | 59.98

Event Sourcing:
order_events table:
id | order_id | event_type      | data               | timestamp
1  | 1        | OrderCreated    | {amount: 59.98...} | 2024-02-15 10:00
2  | 1        | PaymentReceived | {amount: 59.98}    | 2024-02-15 10:02
3  | 1        | OrderShipped    | {trackingNo: ...}  | 2024-02-15 12:00

Current state = Replay all events
Order 1 status = OrderCreated → PaymentReceived → OrderShipped = SHIPPED

Benefits:
✅ Full audit trail (know how you got to current state)
✅ Time travel (replay to any point in history)
✅ Event replay (rebuild projections)
✅ No data loss (never delete events)

Drawbacks:
❌ Query complexity (must replay events for current state)
❌ Event versioning (schema evolution hard)
❌ Storage overhead (keep all events forever)
```

#### **4. CQRS (Command Query Responsibility Segregation)**

```
Separate write model from read model

Write side (Commands):
OrderService → Process "CreateOrder" command
            → Append "OrderCreated" event to event store
            → Optimized for writes

Read side (Queries):
Event Handler → Consume "OrderCreated" event
              → Update read-optimized database (denormalized)
              → Optimized for reads

Example:

Write Model (normalized):
orders: id, user_id, status
order_items: id, order_id, product_id, quantity

Read Model (denormalized):
order_summaries: id, user_id, status, item_count, total_amount, product_names

Benefits:
✅ Scale reads and writes independently
✅ Optimize each side separately
✅ Different data models for different needs

Cons:
❌ Eventual consistency (read model lags behind)
❌ Complexity (maintain two models)
```

### **Message Brokers**

#### **Kafka (Distributed Log)**

```
Topic: orders
Partition 0: [msg1, msg2, msg3, msg4]  (Consumer Group A: Consumer 1)
Partition 1: [msg5, msg6, msg7, msg8]  (Consumer Group A: Consumer 2)
Partition 2: [msg9, msg10, msg11]      (Consumer Group A: Consumer 3)

Key features:
✅ Persistent (messages retained for days/weeks)
✅ Ordered within partition (guarantee order per key)
✅ Scalable (add partitions to scale)
✅ Replayable (consumers can re-read from beginning)

Producer code (Node.js):

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka1:9092', 'kafka2:9092']
});

const producer = kafka.producer();

await producer.connect();

// Publish event
await producer.send({
  topic: 'orders',
  messages: [
    {
      key: orderId.toString(),  // Partition by order ID
      value: JSON.stringify({
        eventType: 'OrderCreated',
        orderId: orderId,
        userId: userId,
        totalAmount: totalAmount,
        timestamp: new Date().toISOString()
      })
    }
  ]
});

Consumer code:

const consumer = kafka.consumer({ groupId: 'email-service' });

await consumer.connect();
await consumer.subscribe({ topic: 'orders', fromBeginning: false });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());
    
    console.log(`Received event: ${event.eventType}`);
    
    if (event.eventType === 'OrderCreated') {
      await sendOrderConfirmationEmail(event);
    }
    
    // Kafka commits offset automatically (at-least-once delivery)
  }
});
```

#### **RabbitMQ (Message Queue)**

```
Exchange (routing logic)
    │
    ├─→ Queue 1 (email-service) → Consumer 1
    ├─→ Queue 2 (analytics-service) → Consumer 2
    └─→ Queue 3 (inventory-service) → Consumer 3

Key features:
✅ Flexible routing (direct, topic, fanout, headers)
✅ Acknowledgments (message deleted after processing)
✅ Priority queues (high-priority messages first)
✅ Dead letter queues (failed messages)

Publisher code (Python):

import pika
import json

connection = pika.BlockingConnection(
    pika.ConnectionParameters('rabbitmq')
)
channel = connection.channel()

# Declare exchange
channel.exchange_declare(
    exchange='orders',
    exchange_type='topic'
)

# Publish event
event = {
    'eventType': 'OrderCreated',
    'orderId': 12345,
    'userId': 67890,
    'totalAmount': 59.98
}

channel.basic_publish(
    exchange='orders',
    routing_key='order.created',
    body=json.dumps(event),
    properties=pika.BasicProperties(
        delivery_mode=2,  # Persistent
        content_type='application/json'
    )
)

connection.close()

Consumer code:

connection = pika.BlockingConnection(
    pika.ConnectionParameters('rabbitmq')
)
channel = connection.channel()

# Declare queue
channel.queue_declare(queue='email-queue', durable=True)

# Bind queue to exchange
channel.queue_bind(
    exchange='orders',
    queue='email-queue',
    routing_key='order.created'
)

def callback(ch, method, properties, body):
    event = json.loads(body)
    print(f"Received: {event['eventType']}")
    
    # Process event
    send_email(event)
    
    # Acknowledge (remove from queue)
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_consume(
    queue='email-queue',
    on_message_callback=callback,
    auto_ack=False  # Manual acknowledgment
)

channel.start_consuming()
```

### **Event Design**

#### **Event Schema**

```json
{
  "eventId": "uuid-v4",
  "eventType": "OrderCreated",
  "eventVersion": "1.0",
  "timestamp": "2024-02-15T10:30:00Z",
  "source": "order-service",
  "metadata": {
    "correlationId": "request-123",
    "userId": "67890",
    "traceId": "trace-abc"
  },
  "data": {
    "orderId": "12345",
    "userId": "67890",
    "items": [
      {
        "productId": "abc",
        "quantity": 2,
        "price": 29.99
      }
    ],
    "totalAmount": 59.98,
    "shippingAddress": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102"
    }
  }
}
```

**Key fields:**

- **eventId**: Unique identifier (idempotency key)
- **eventType**: What happened (OrderCreated, OrderShipped)
- **eventVersion**: Schema version (handle evolution)
- **timestamp**: When event occurred (UTC)
- **source**: Which service produced event
- **correlationId**: Track related events
- **traceId**: Distributed tracing
- **data**: Event-specific payload

#### **Event Versioning**

```
Problem: Event schema changes over time

Version 1:
{
  "eventType": "OrderCreated",
  "eventVersion": "1.0",
  "data": {
    "orderId": "123",
    "amount": 59.98
  }
}

Version 2 (add field):
{
  "eventType": "OrderCreated",
  "eventVersion": "2.0",
  "data": {
    "orderId": "123",
    "amount": 59.98,
    "currency": "USD"  ← New field
  }
}

Consumer handling:

function handleOrderCreated(event) {
  if (event.eventVersion === '1.0') {
    // Old schema: Assume USD
    const currency = 'USD';
    processOrder(event.data.orderId, event.data.amount, currency);
  } else if (event.eventVersion === '2.0') {
    // New schema: Use provided currency
    processOrder(
      event.data.orderId,
      event.data.amount,
      event.data.currency
    );
  } else {
    console.error(`Unknown event version: ${event.eventVersion}`);
  }
}

Best practices:
✅ Always include eventVersion field
✅ Support multiple versions in consumers
✅ Add fields (backward compatible)
❌ Avoid removing/renaming fields (breaking change)
✅ Migrate gradually (old and new versions coexist)
```

### **Idempotency**

```
Problem: Consumer processes same event multiple times (at-least-once delivery)

Solution: Idempotent event handlers

Non-idempotent (bad):
function handleOrderCreated(event) {
  // Problem: If event processed twice, charge twice!
  chargeCustomer(event.orderId, event.amount);
  sendEmail(event.orderId);
}

Idempotent (good):
function handleOrderCreated(event) {
  const eventId = event.eventId;
  
  // Check if already processed
  if (processedEvents.has(eventId)) {
    console.log(`Event ${eventId} already processed, skipping`);
    return;
  }
  
  // Process
  chargeCustomer(event.orderId, event.amount);
  sendEmail(event.orderId);
  
  // Mark as processed
  processedEvents.add(eventId);
  // Store in database: INSERT INTO processed_events (event_id) VALUES (...)
}

Database-backed idempotency:

CREATE TABLE processed_events (
  event_id VARCHAR(255) PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Before processing, check:
SELECT 1 FROM processed_events WHERE event_id = ?;

-- If not exists, process and insert:
BEGIN TRANSACTION;
  -- Process event (charge customer, etc.)
  INSERT INTO processed_events (event_id) VALUES (?);
COMMIT;

-- If event_id already exists → UNIQUE constraint violation → Skip
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **Event Volume Estimation**

**Scenario:** E-commerce with 100K daily active users

```
Event types and volumes:

UserRegistered:    1K events/day (new users)
UserLogin:         200K events/day (2 logins/user)
ProductViewed:     2M events/day (20 views/user)
CartUpdated:       500K events/day (5 cart changes/user)
OrderCreated:      10K events/day (10% conversion)
OrderShipped:      10K events/day (all orders ship)
OrderDelivered:    10K events/day (all orders delivered)
PaymentProcessed:  10K events/day
EmailSent:         50K events/day (order + marketing)

Total: 2.79M events/day = 32.3 events/second (average)
Peak: 160 events/second (5x average)

Event size:
Small (UserLogin): 500 bytes
Medium (OrderCreated): 2 KB
Large (ProductViewed with images): 10 KB
Average: 2 KB per event

Bandwidth:
2.79M events × 2 KB = 5.58 GB/day
Peak: 160 events/s × 2 KB = 320 KB/s = 2.56 Mbps

Kafka capacity planning:

Retention: 7 days (replay capability)
Storage: 5.58 GB/day × 7 days = 39 GB

Replication factor: 3 (for durability)
Total storage: 39 GB × 3 = 117 GB

Partitions: 10 (for parallelism)
Throughput per partition: 160 events/s / 10 = 16 events/s per partition

Brokers: 3 (minimum for quorum)
Storage per broker: 117 GB / 3 = 39 GB

Instance sizing (AWS):
- 3 × t3.medium (2 CPU, 4 GB RAM, 100 GB SSD): $100/month
- At larger scale: i3.large (NVMe SSD for high throughput)

Consumer scaling:
- Email Service: 50K emails/day / 86,400s = 0.6 events/s → 1 consumer
- Analytics Service: 2.79M events/day = 32 events/s → 3-5 consumers
- Inventory Service: 10K events/day = 0.1 events/s → 1 consumer
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Event Store Schema**

```sql
-- Event Sourcing pattern
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID UNIQUE NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  event_version VARCHAR(10) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,  -- Order ID, User ID, etc.
  aggregate_type VARCHAR(50) NOT NULL, -- "Order", "User", etc.
  event_data JSONB NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  sequence_number BIGINT,
  
  INDEX idx_aggregate (aggregate_id, aggregate_type, sequence_number),
  INDEX idx_event_type (event_type),
  INDEX idx_timestamp (timestamp)
);

-- Get all events for an order (to rebuild state)
SELECT * FROM events
WHERE aggregate_id = '12345'
  AND aggregate_type = 'Order'
ORDER BY sequence_number ASC;

-- Get all OrderCreated events in last hour
SELECT * FROM events
WHERE event_type = 'OrderCreated'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

### **Idempotency Table**

```sql
CREATE TABLE processed_events (
  event_id UUID PRIMARY KEY,
  consumer_name VARCHAR(255) NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE (event_id, consumer_name)
);

-- Before processing, check:
SELECT 1 FROM processed_events
WHERE event_id = ? AND consumer_name = 'email-service';

-- If not exists, process:
BEGIN;
  -- Send email
  -- ...
  
  -- Mark as processed
  INSERT INTO processed_events (event_id, consumer_name)
  VALUES (?, 'email-service');
COMMIT;
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Scaling Patterns**

#### **1. Partition by Key**

```
Kafka topic "orders" with 10 partitions

Producer logic:
- Partition key = orderId % 10
- Order 123 → Partition 3
- Order 124 → Partition 4
- Order 125 → Partition 5

Benefits:
✅ Related events in same partition (ordering guarantee)
✅ Scale consumers (10 consumers, one per partition)
✅ Parallelism (process 10 orders simultaneously)

Consumer Group (email-service):
Consumer 1 → Partitions 0, 1, 2, 3
Consumer 2 → Partitions 4, 5, 6
Consumer 3 → Partitions 7, 8, 9

If add Consumer 4:
Kafka rebalances:
Consumer 1 → Partitions 0, 1, 2
Consumer 2 → Partitions 3, 4, 5
Consumer 3 → Partitions 6, 7
Consumer 4 → Partitions 8, 9

Automatic load balancing!
```

#### **2. Dead Letter Queue**

```
Problem: Event processing fails repeatedly

Example: Email service can't send email (SMTP server down)

Without DLQ:
- Consumer retries forever
- Blocks processing of subsequent events
- Queue backs up

With DLQ:
- Retry 3 times
- If still fails → Move to dead letter queue
- Continue processing next event

RabbitMQ configuration:

channel.queue_declare(
  queue='email-queue',
  arguments={
    'x-dead-letter-exchange': 'dlx',
    'x-dead-letter-routing-key': 'email-failed'
  }
);

channel.queue_declare(queue='email-dlq', durable=True);

channel.queue_bind(
  exchange='dlx',
  queue='email-dlq',
  routing_key='email-failed'
);

Consumer handling:

let retries = 0;

function handleEvent(event) {
  try {
    sendEmail(event);
    ack(event);  // Success, acknowledge
  } catch (error) {
    retries++;
    if (retries < 3) {
      nack(event, requeue=true);  // Retry
    } else {
      nack(event, requeue=false);  // Move to DLQ
      logError(event, error);
    }
  }
}

Monitoring:
- Alert if DLQ size > 100
- Investigate failures
- Replay from DLQ after fixing issue
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **Event Schema Registry**

```
Confluent Schema Registry (for Kafka)

Problem: Consumers break when producer changes schema

Solution: Centralized schema validation

Producer:
1. Registers schema with registry
2. Schema assigned ID
3. Publishes event with schema ID

Consumer:
1. Reads schema ID from event
2. Fetches schema from registry
3. Validates event against schema
4. Deserializes safely

Schema evolution rules:
✅ Add optional fields (backward compatible)
✅ Remove fields (forward compatible)
❌ Change field type (breaking change)
❌ Rename field (breaking change)

Example (Avro schema):

{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.events",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "currency", "type": ["null", "string"], "default": null}
  ]
}

Version 2 (add field):
{
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "currency", "type": ["null", "string"], "default": null},
    {"name": "items", "type": ["null", {"type": "array", "items": "string"}], "default": null}
  ]
}

Backward compatible: Old consumers can read new events
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Uber (Event-Driven Dispatch)**

**Architecture:**
```
Real-time ride dispatch using Kafka

Events per second: 1+ million
Messages per day: 1+ trillion

Flow:
1. Rider requests ride → "RideRequested" event
2. Dispatch Service consumes event:
   - Find nearby drivers (geospatial query)
   - Calculate ETA (routing service)
   - Apply surge pricing (pricing service)
3. Publish "DriverAssigned" event
4. Multiple consumers:
   - Notification Service → Send push to rider/driver
   - ETA Service → Calculate real-time ETA
   - Analytics Service → Track metrics

Benefits:
✅ Real-time (sub-second dispatch)
✅ Scalable (handle millions of rides/day)
✅ Decoupled (add new features without changing dispatch)
```

### **Example 2: Netflix (Event-Driven Recommendations)**

**Architecture:**
```
User viewing history drives recommendations

Events:
- VideoStarted
- VideoProgress (every 10 minutes)
- VideoCompleted
- VideoPaused
- VideoRated

Flow:
1. Client publishes viewing events to Kafka
2. Recommendation Service consumes events:
   - Update user profile (real-time)
   - Retrain ML model (batch, hourly)
   - Generate recommendations
3. Publish "RecommendationsUpdated" event
4. UI fetches updated recommendations

Scale:
- 200M+ subscribers
- Billions of viewing events per day
- Real-time personalization

Benefits:
✅ Real-time recommendations (within seconds)
✅ Scalable (handle billions of events)
✅ Flexible (add new event types easily)
```

### **Example 3: LinkedIn (Kafka for Activity Streams)**

**Architecture:**
```
LinkedIn invented Kafka for activity streams

Events:
- ProfileViewed
- JobPosted
- ConnectionRequest
- MessageSent
- PostCreated
- PostLiked

Flow:
1. User activity → Publish event to Kafka
2. Multiple consumers:
   - Newsfeed Service → Update feed in real-time
   - Notification Service → Send notifications
   - Analytics Service → Track engagement
   - Data Lake → Store for batch analysis

Scale:
- 900M+ users
- Trillions of events

Origin of Kafka:
LinkedIn built Kafka in 2011 to handle activity streams
Now industry-standard (open-sourced)
```

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: Explain Event-Driven Architecture and when you would use it.**

**Answer:**
"Event-Driven Architecture uses asynchronous events to communicate between decoupled services. Instead of Service A calling Service B directly (synchronous, coupled), Service A publishes an event to a message broker (Kafka, RabbitMQ), and Service B consumes it independently.

**Core concepts:**

**1. Event:** Notification that something happened. Example: `OrderCreated`, `PaymentProcessed`, `UserRegistered`.

**2. Event Types:**
- **Event Notification:** Lightweight, just says "something happened" (consumer fetches details if needed)
- **Event-Carried State Transfer:** Contains full data (consumer has everything, no additional calls)
- **Event Sourcing:** Events are source of truth (rebuild current state by replaying events)

**3. Message Broker:** Central hub for events.
- **Kafka:** Distributed log, persistent (days/weeks), ordered within partition, replayable
- **RabbitMQ:** Traditional queue, flexible routing, message deleted after processing

**Real-world example (e-commerce):**

Order Service publishes `OrderCreated` event to Kafka topic `orders`:
```json
{
  "eventId": "uuid-123",
  "eventType": "OrderCreated",
  "orderId": "order-456",
  "userId": "user-789",
  "totalAmount": 59.98,
  "timestamp": "2024-02-15T10:30:00Z"
}
```

Multiple consumers process independently:
- **Inventory Service:** Deducts stock
- **Email Service:** Sends order confirmation
- **Analytics Service:** Tracks sales metrics
- **Shipping Service:** Creates shipment
- **Fraud Detection:** Flags suspicious orders

**Benefits:**

**1. Loose coupling:** Order Service doesn't know about consumers. Add Fraud Detection later without changing Order Service.

**2. Scalability:** Process millions of events/second. Kafka handles 1+ trillion messages/day at Uber.

**3. Resilience:** If Email Service down, events queued (retained 7 days in Kafka). Service recovers, processes backlog.

**4. Real-time:** React to events as they happen (sub-second latency).

**Trade-offs:**

**1. Eventual consistency:** Not immediate. Email might arrive seconds after order confirmed. Contrast with synchronous: `orderService.createOrder()` → `emailService.send()` (immediate).

**2. Complexity:**
- **Event versioning:** Schema changes over time (`OrderCreated` v1 vs v2)
- **Idempotency:** Consumer processes same event twice (at-least-once delivery). Need deduplication: check `event_id` before processing.
- **Event ordering:** Events out of order across partitions. Partition by key (`orderId`) for ordering guarantee.

**3. Debugging:** Trace event flow across services (distributed tracing required: Jaeger, Zipkin, correlation IDs).

**When to use:**

**1. Decoupling services:** Don't want tight synchronous calls (microservices communication).

**2. Real-time processing:** Activity streams (LinkedIn), recommendations (Netflix), ride dispatch (Uber).

**3. Integration:** Connect multiple systems (legacy + modern, different teams).

**4. Audit trail:** Event sourcing for compliance (financial transactions, healthcare).

**5. High volume:** Millions of events/second (social media feeds, IoT telemetry).

**When to avoid:**

**1. Strong consistency required:** Immediate ACID guarantees (use synchronous calls or 2PC).

**2. Simple CRUD:** Read-write patterns with no side effects (REST API sufficient).

**3. Low volume:** < 100 events/day (overhead not justified).

**Key patterns:**

**1. Idempotency:**
```python
if not already_processed(event_id):
    process_event(event)
    mark_processed(event_id)
```

**2. Dead Letter Queue:** Failed events moved to DLQ (investigate, replay later).

**3. Schema Registry:** Validate event schemas (prevent breaking changes).

**4. Event versioning:** Support multiple versions simultaneously during migration.

**Production wisdom:**
- Start simple (event notification)
- Add state transfer if latency critical
- Event sourcing only if audit trail required (adds complexity)
- Monitor consumer lag (Kafka: lag = offset difference)
- Alert if DLQ grows (indicates failures)

**Real-world scale:**
- Uber: 1+ trillion Kafka messages/day
- Netflix: Billions of viewing events/day
- LinkedIn: Trillions of activity events (Kafka invented here)"

### **Common Follow-Up Questions**

**Q1: How do you handle event ordering in distributed systems?**

```
Answer:

Challenge: Events may arrive out of order

Example:
Event 1: OrderCreated (timestamp: 10:00:00)
Event 2: OrderUpdated (timestamp: 10:00:05)
Event 3: OrderShipped (timestamp: 10:00:10)

If network delay, might receive: Event 2 → Event 3 → Event 1
Result: Process OrderUpdated before OrderCreated (broken state)

Solutions:

1. Partition by key (Kafka):
   - Partition key = orderId
   - All events for order-123 go to same partition
   - Kafka guarantees order within partition
   - Order-123 events always processed in order

   Producer:
   await producer.send({
     topic: 'orders',
     messages: [{
       key: orderId.toString(),  // Partition key
       value: JSON.stringify(event)
     }]
   });

   Consumer:
   - Single consumer reads partition sequentially
   - Processes Event 1 → Event 2 → Event 3 (correct order)

2. Sequence numbers:
   - Add sequence number to events
   
   Event 1: { orderId: 123, sequenceNumber: 1, ... }
   Event 2: { orderId: 123, sequenceNumber: 2, ... }
   Event 3: { orderId: 123, sequenceNumber: 3, ... }
   
   Consumer logic:
   - Buffer events per orderId
   - Process in sequence number order
   - If Event 3 arrives before Event 2 → Buffer until Event 2 arrives

   lastProcessedSeq = { 'order-123': 1 };
   
   function handleEvent(event) {
     expected = lastProcessedSeq[event.orderId] + 1;
     
     if (event.sequenceNumber === expected) {
       process(event);
       lastProcessedSeq[event.orderId] = event.sequenceNumber;
     } else if (event.sequenceNumber > expected) {
       buffer[event.orderId].push(event);  // Wait for missing events
     } else {
       // Duplicate or out-of-order, skip
     }
   }

3. Timestamps + causality:
   - Lamport timestamps or vector clocks
   - Determine happened-before relationship
   
   Complex, rarely needed in practice

4. Accept eventual consistency:
   - Often ordering doesn't matter
   
   Example: View count
   - Event 1: VideoViewed (count = 1)
   - Event 2: VideoViewed (count = 2)
   - If processed out of order: Still correct (increment operation commutative)

Best practices:
✅ Partition by aggregate ID (order ID, user ID)
✅ Use single consumer per partition (no parallelism within partition)
✅ Add sequence numbers if strict ordering critical
✅ Accept eventual consistency where possible
❌ Don't rely on global ordering across all events (doesn't scale)

Real-world:
- Kafka: Ordering within partition only (by design)
- Uber: Partitions by ride ID (all ride events ordered)
- Netflix: Partitions by user ID (user viewing history ordered)
```

**Q2: How do you ensure exactly-once processing in event-driven systems?**

```
Answer:

Challenge: Message brokers provide at-most-once or at-least-once delivery

At-most-once:
- Message delivered 0 or 1 time
- Fast, but may lose messages (unacceptable for most)

At-least-once:
- Message delivered 1+ times
- Duplicates possible (consumer must handle)

Exactly-once:
- Message delivered exactly 1 time
- Hardest to achieve (requires idempotency)

Solutions:

1. Idempotent consumers (most common):
   - Consumer processes duplicate events safely
   - Use event_id as deduplication key
   
   CREATE TABLE processed_events (
     event_id UUID PRIMARY KEY,
     processed_at TIMESTAMP
   );
   
   async function handleEvent(event) {
     const exists = await db.query(
       'SELECT 1 FROM processed_events WHERE event_id = $1',
       [event.eventId]
     );
     
     if (exists) {
       console.log('Already processed, skipping');
       return;  // Idempotent: safe to call multiple times
     }
     
     await db.transaction(async (tx) => {
       // Process event
       await tx.query('INSERT INTO orders VALUES (...)');
       
       // Mark as processed
       await tx.query(
         'INSERT INTO processed_events (event_id) VALUES ($1)',
         [event.eventId]
       );
     });
   }
   
   Benefits:
   ✅ Simple, works with any broker
   ✅ Consumer controls deduplication
   
   Cons:
   ❌ Database overhead (query before processing)
   ❌ Storage grows (cleanup old entries)

2. Natural idempotency:
   - Some operations naturally idempotent
   
   Example:
   UPDATE users SET email = 'new@example.com' WHERE id = 123;
   → Executing twice has same effect (idempotent)
   
   INSERT INTO orders VALUES (123, ...);
   → Duplicate: Primary key violation (NOT idempotent)
   
   INSERT INTO orders VALUES (123, ...) ON CONFLICT DO NOTHING;
   → Now idempotent!

3. Kafka transactions (exactly-once semantics):
   - Producer, broker, consumer coordinate
   - Atomic: Write to Kafka + update consumer offset
   
   Producer:
   await producer.send({
     topic: 'orders',
     messages: [event],
     transactional: true
   });
   
   Consumer:
   await consumer.run({
     eachMessage: async ({ message }) => {
       await db.transaction(async (tx) => {
         // Process event
         await processEvent(message);
         
         // Commit offset (atomic with processing)
         await consumer.commitOffsets([{
           topic: 'orders',
           partition: 0,
           offset: message.offset
         }]);
       });
     }
   });
   
   Kafka ensures:
   - If processing fails → Offset not committed → Reprocess
   - If processing succeeds → Offset committed → Not reprocessed
   
   Benefits:
   ✅ True exactly-once (no duplicates)
   
   Cons:
   ❌ Complex configuration
   ❌ Performance overhead (transactions slower)
   ❌ Kafka-specific (doesn't work with RabbitMQ)

4. Outbox pattern:
   - Write event + business data in single transaction
   - Background process publishes from outbox
   
   Service:
   BEGIN TRANSACTION;
     INSERT INTO orders VALUES (...);
     INSERT INTO outbox_events VALUES ('OrderCreated', ...);
   COMMIT;
   
   Outbox publisher (separate process):
   SELECT * FROM outbox_events WHERE published = false;
   FOR EACH event:
     kafka.publish(event);
     UPDATE outbox_events SET published = true WHERE id = event.id;
   
   Benefits:
   ✅ Atomic (business data + event committed together)
   ✅ No lost events (transactionally consistent)
   
   Cons:
   ❌ Additional infrastructure (outbox publisher)
   ❌ Eventual publishing (slight delay)

Best practices:
✅ Use idempotent consumers (simple, reliable)
✅ Include unique event_id in all events
✅ Database transaction: process + mark as processed
✅ Cleanup processed_events table (retain 7-30 days)
✅ Monitor duplicate rate (should be < 1%)

Real-world:
- Uber: Idempotent consumers + outbox pattern
- Netflix: Natural idempotency where possible
- LinkedIn: Kafka transactions for critical flows
```

### **Key Talking Points**

1. **"Event-Driven = asynchronous communication via events, loose coupling"**: Core definition
2. **"Kafka for persistent, ordered, replayable events at scale"**: When to use Kafka
3. **"Trade-off: loose coupling vs eventual consistency"**: Key insight
4. **"Idempotency critical: check event_id before processing"**: Essential pattern
5. **"Partition by key for ordering guarantee (order ID, user ID)"**: Scalability pattern
6. **"Uber 1T+ Kafka messages/day, real-time dispatch"**: Success story
7. **"Dead Letter Queue for failed events, monitor and replay"**: Resilience pattern

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **Event Flow Diagram**

```
Order Service
     │
     │ 1. User places order
     ▼
┌─────────────────┐
│ Create order    │
│ in database     │
└────────┬────────┘
         │
         │ 2. Publish "OrderCreated" event
         ▼
    ┌────────────┐
    │   Kafka    │
    │Topic: orders│
    └────┬───────┘
         │
    ┌────┴────┬─────────┬────────┬─────────┐
    │         │         │        │         │
    ▼         ▼         ▼        ▼         ▼
┌────────┐ ┌────────┐ ┌───────┐ ┌───────┐ ┌──────┐
│Inventory│ Email  │ │Analytics│ Shipping│ Fraud │
│Service  │ Service│ │Service │ Service │ Detect│
└────┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └──┬───┘
     │         │         │        │        │
     │         │         │        │        │
     ▼         ▼         ▼        ▼        ▼
 Deduct   Send    Track    Create  Check
 stock    email   metrics  shipment fraud
 
All consumers process independently, in parallel
Order Service doesn't wait (fire-and-forget)
Total latency: < 100ms (publish event)
vs 500ms+ (if synchronous calls to 5 services)
```

### **Event Sourcing: Rebuild State**

```
Event Store (immutable log):
┌──────────────────────────────────────────┐
│ Event 1: OrderCreated                    │
│   { orderId: 123, amount: 59.98 }        │
├──────────────────────────────────────────┤
│ Event 2: PaymentReceived                 │
│   { orderId: 123, amount: 59.98 }        │
├──────────────────────────────────────────┤
│ Event 3: OrderShipped                    │
│   { orderId: 123, trackingNo: "ABC123" } │
├──────────────────────────────────────────┤
│ Event 4: OrderDelivered                  │
│   { orderId: 123, deliveredAt: "..." }   │
└──────────────────────────────────────────┘

Rebuild current state:
Initial state: {}
+ Event 1: { status: "PENDING", amount: 59.98 }
+ Event 2: { status: "PAID", amount: 59.98 }
+ Event 3: { status: "SHIPPED", trackingNo: "ABC123" }
+ Event 4: { status: "DELIVERED", deliveredAt: "..." }

Current state: Order 123 is DELIVERED

Benefits:
- Time travel (replay to any point)
- Audit trail (know how you got to current state)
- Rebuild projections (create new read models)
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why Event-Driven Architecture Matters**

**Business Impact:**
- **Decoupling**: Add features without changing existing services (faster development)
- **Real-time**: React to events as they happen (sub-second latency)
- **Scalability**: Handle millions of events/second (Uber: 1T+ Kafka messages/day)
- **Resilience**: Services fail independently, events queued (no data loss)

**Technical Impact:**
- **Loose coupling**: Producers don't know consumers (add/remove consumers easily)
- **Asynchronous**: Non-blocking (fire-and-forget vs wait for response)
- **Event replay**: Reprocess historical events (rebuild projections, debug issues)
- **Audit trail**: Full history of state changes (compliance, debugging)

### **How It Works (Simple Summary)**

1. **Producer** publishes event to message broker (Kafka topic, RabbitMQ exchange)
2. **Broker** stores event (persistent, replicated) and routes to interested consumers
3. **Consumers** subscribe to topics, process events independently
4. **Idempotency**: Check `event_id` before processing (handle duplicates)
5. **Dead Letter Queue**: Failed events moved to DLQ (investigate, replay)

**For production systems:**
- Use **Kafka** for high throughput, persistence, replay (activity streams, logs)
- Use **RabbitMQ** for flexible routing, priority queues (task queues)
- Implement **idempotent consumers** (check processed_events table)
- Add **dead letter queue** (failed events don't block processing)
- Use **schema registry** (validate events, prevent breaking changes)
- Monitor **consumer lag** (Kafka offset difference, alert if growing)

### **Key Trade-offs**

| Aspect | Synchronous (REST) | Asynchronous (Events) |
|--------|-------------------|------------------------|
| **Coupling** | Tight (caller knows callee) ❌ | Loose (producer doesn't know consumers) ✅ |
| **Latency** | Wait for response (~10-100ms) ❌ | Fire-and-forget (~1-5ms) ✅ |
| **Consistency** | Immediate (ACID) ✅ | Eventual (seconds lag) ❌ |
| **Debugging** | Easy (stack trace) ✅ | Hard (trace events) ❌ |
| **Failure handling** | Immediate error ✅ | Retry, DLQ ✅ |
| **Scalability** | Limited (1:1 calls) ❌ | High (1:N fanout) ✅ |

### **Remember These Numbers**

```
Kafka throughput:             1M+ messages/second (single broker)
Event publish latency:        1-5 milliseconds
Event processing latency:     10-100 milliseconds (consumer logic)

Kafka retention:              7 days (default), up to years
Event size:                   1-10 KB typical (avoid > 1 MB)

Consumer lag (healthy):       < 1000 messages
Consumer lag (degraded):      > 10,000 messages (alert)

Idempotency check:            ~1ms (database query)
Dead letter queue threshold:  > 100 events (investigate)

Real-world scale:
- Uber: 1+ trillion Kafka messages/day
- Netflix: Billions of viewing events/day
- LinkedIn: Trillions of activity events (invented Kafka)

Kafka cluster sizing:
- 3 brokers minimum (quorum)
- 10 partitions per topic (typical)
- Replication factor: 3 (durability)
```

### **Production Wisdom**

✅ **Use Kafka for high-scale activity streams** (persistent, ordered, replayable)  
✅ **Use RabbitMQ for task queues** (flexible routing, acknowledgments)  
✅ **Idempotent consumers always** (at-least-once delivery means duplicates)  
✅ **Partition by aggregate ID** (order ID, user ID for ordering guarantee)  
✅ **Event versioning** (support multiple schema versions during migration)  
✅ **Dead Letter Queue** (failed events don't block processing)  
✅ **Monitor consumer lag** (Kafka offset lag, alert if growing)  
✅ **Correlation IDs** (trace events across services)  
✅ **Schema registry** (validate events, prevent breaking changes)  
✅ **Start simple** (event notification), add complexity only if needed  

❌ **Don't use for strong consistency** (use synchronous calls or 2PC)  
❌ **Don't publish large events** (> 1 MB, use reference instead)  
❌ **Don't ignore idempotency** (duplicates will happen)  
❌ **Don't forget DLQ** (failed events need investigation)  
❌ **Don't over-partition** (100 partitions = 100 consumer max)  
❌ **Don't use for low volume** (< 100 events/day, overhead not justified)  

---

**Final thought for interviews:**

> "Event-Driven Architecture is the backbone of modern real-time systems at scale. Companies like Uber (1+ trillion Kafka messages/day) and Netflix (billions of viewing events) use EDA to decouple services, enable real-time processing, and handle massive scale. The core trade-off is loose coupling and scalability vs eventual consistency and debugging complexity. In production, implement idempotent consumers (check `event_id` before processing), use Dead Letter Queues (failed events don't block), partition by aggregate ID (ordering guarantee), and monitor consumer lag (Kafka offset difference). Start with simple event notification, add event-carried state transfer if latency critical, and use event sourcing only if audit trail required. The key insight: events enable 1:N fanout (one producer, many consumers) without producers knowing consumers—perfect for microservices communication, activity streams, and integration patterns."
