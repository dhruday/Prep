# Foundation 06 — Messaging Systems

> Async messaging is the backbone of every scalable distributed system.
> Know Kafka, SQS, RabbitMQ, and when to use each.

---

## Why Message Queues?

```
Without Queue (Synchronous):
  Service A ──HTTP──▶ Service B  ← tight coupling, B must be UP, A waits

With Queue (Asynchronous):
  Service A ──▶ Queue ──▶ Service B  ← decoupled, B can be down, A returns immediately
```

**Benefits:**
- **Decoupling:** Producer doesn't know about consumers
- **Buffering:** Absorb bursts (Black Friday spike → queue absorbs)
- **Reliability:** Message persisted; B can crash and recover
- **Fan-out:** One message → multiple consumers
- **Rate limiting:** Consumers pull at their own pace

---

## Core Concepts

### Message Queue vs Event Stream

| Concept | Queue (SQS, RabbitMQ) | Stream (Kafka) |
|---------|----------------------|----------------|
| Message deleted after ack? | Yes | No (log-based) |
| Multiple consumers? | Usually one | Yes (consumer groups) |
| Replay messages? | No | Yes (seek to offset) |
| Ordering | Per queue | Per partition |
| Use case | Task distribution | Event sourcing, streaming |

---

## Apache Kafka

### Architecture

```
                        Kafka Cluster
                   ┌────────────────────┐
Producers ─────▶   │ Broker 1  Broker 2 │
(microservices,     │                    │  ◀──── ZooKeeper / KRaft
 IoT devices,       │ Topic: orders      │        (metadata, leader election)
 logs)              │  Partition 0       │
                    │  Partition 1  ───────────▶ Consumers
                    │  Partition 2       │        (Consumer Group A)
                    │                    │        (Consumer Group B)
                    └────────────────────┘
```

### Key Concepts

**Topic:** Named stream of messages (like a database table)
**Partition:** Ordered, immutable log within a topic
**Offset:** Position of a message within a partition
**Consumer Group:** Group of consumers that divide partitions among them

```
Topic "orders" with 3 partitions:

Partition 0: [msg0, msg1, msg2, msg3...]
Partition 1: [msg0, msg1, msg2...]
Partition 2: [msg0, msg1...]

Consumer Group A (3 consumers):
  Consumer A1 → Partition 0
  Consumer A2 → Partition 1
  Consumer A3 → Partition 2

Consumer Group B (1 consumer):
  Consumer B1 → All 3 partitions (sequential within each)
```

### Partitioning Strategy

```python
# Default: hash(key) % num_partitions
producer.send("orders", key=b"user-123", value=b"order-data")
# All messages for user-123 go to same partition → ordering guaranteed

# Round-robin (no key): Even distribution, no ordering
producer.send("logs", value=b"log-line")

# Custom partitioner
class UserRegionPartitioner:
    def partition(self, key, partitions):
        region = get_region(key)
        return region_to_partition[region]
```

### Consumer Groups

```
Max parallelism = number of partitions
(Adding more consumers than partitions → idle consumers)

Topic: 6 partitions
Consumer Group: 3 consumers → each handles 2 partitions
Consumer Group: 6 consumers → each handles 1 partition (max)
Consumer Group: 9 consumers → 3 consumers idle!
```

### Kafka Guarantees

```
At-Most-Once:    acks=0 (fire and forget)
At-Least-Once:   acks=1 or acks=all + auto-commit disabled + manual ack
Exactly-Once:    acks=all + idempotent producer + transactional API
```

### Kafka Configuration

```properties
# Producer reliability
acks=all                    # Wait for all ISR replicas
retries=3
enable.idempotence=true    # Idempotent producer

# Consumer reliability  
enable.auto.commit=false    # Manual commit after processing
auto.offset.reset=earliest  # Start from beginning if no offset

# Performance
batch.size=65536           # 64KB batch size
linger.ms=5                # Wait 5ms to batch messages
compression.type=snappy    # Compress messages
```

### Kafka Retention

```
log.retention.hours=168     # Keep 7 days (default)
log.retention.bytes=1GB     # Or by size
log.segment.bytes=1GB       # Segment files

Compaction (keep latest value per key):
log.cleanup.policy=compact  # For changelog topics
```

### Kafka Use Cases

```
✅ Event sourcing (immutable log)
✅ Activity tracking (user events)
✅ Metrics/log aggregation
✅ Stream processing (Kafka Streams, Flink)
✅ Change Data Capture (Debezium)
✅ Event-driven microservices
✅ Replay capability needed
✅ Multiple independent consumers

❌ Simple task queues (use SQS)
❌ Complex routing rules (use RabbitMQ)
❌ Low message count (overkill)
❌ Request-reply pattern (use RPC)
```

---

## Amazon SQS

### Architecture

```
Producer ──▶ SQS Queue ──▶ Consumer (polls for messages)
                │
                └──▶ Dead Letter Queue (failed messages)
```

### Queue Types

**Standard Queue:**
```
- At-least-once delivery (possible duplicates)
- Best-effort ordering (not guaranteed)
- Unlimited throughput
- Good for: most async tasks
```

**FIFO Queue:**
```
- Exactly-once processing
- Strict ordering guaranteed
- 3,000 TPS (with batching) / 300 TPS (without)
- Message Group ID for ordered subsets
- Good for: financial transactions, ordered processing
```

### Key Features

```python
# Send message
sqs.send_message(
    QueueUrl=queue_url,
    MessageBody=json.dumps({"order_id": 123}),
    MessageDeduplicationId="unique-id-abc",  # FIFO: dedup window 5min
    MessageGroupId="order-group-1",          # FIFO: ordering group
    DelaySeconds=30,                          # Delay delivery
)

# Receive and process
messages = sqs.receive_message(
    QueueUrl=queue_url,
    MaxNumberOfMessages=10,        # Batch up to 10
    WaitTimeSeconds=20,            # Long polling (save cost)
    VisibilityTimeout=300,         # 5min to process before re-visible
)

for msg in messages["Messages"]:
    process(msg["Body"])
    sqs.delete_message(receipt_handle=msg["ReceiptHandle"])  # Ack
```

### Visibility Timeout

```
Consumer reads message → message invisible for N seconds
If consumer doesn't delete within N seconds → message becomes visible again
→ Another consumer picks it up (at-least-once delivery)

Set: VisibilityTimeout > max processing time
Extend: ChangeMessageVisibility if processing takes longer
```

### Dead Letter Queue (DLQ)

```
Main Queue ──▶ Consumer (fails 3 times)
              ──▶ DLQ (for inspection, alerting, retry)

Alert on DLQ depth → investigate failed messages
```

---

## RabbitMQ

### Architecture

```
Producer ──▶ Exchange ──(binding)──▶ Queue ──▶ Consumer
```

**Exchange Types:**
```
Direct:   Route by exact routing key
          "order.created" → "order.created" queue

Topic:    Route by pattern
          "order.*"       → order queues
          "*.created"     → all created events
          "#"             → all messages

Fanout:   Broadcast to all bound queues
          Great for pub/sub

Headers:  Route by message headers (not routing key)
```

### RabbitMQ vs Kafka vs SQS

| Feature | RabbitMQ | Kafka | SQS |
|---------|----------|-------|-----|
| Protocol | AMQP | Custom | HTTP |
| Ordering | Queue-level | Partition-level | FIFO only |
| Replay | No | Yes | No |
| Routing | Complex (exchange) | Simple (topic) | None |
| Throughput | ~50K msg/s | ~1M msg/s | Unlimited |
| Managed | Self / CloudAMQP | MSK (AWS) | Fully managed |
| Best for | Complex routing, RPC | Event streaming | AWS-native tasks |

---

## Pub/Sub Pattern

```
Publisher ──▶ Topic ──▶ Subscriber 1
                    └──▶ Subscriber 2
                    └──▶ Subscriber 3

All subscribers receive a copy of each message
```

**Implementations:**
- Redis Pub/Sub (in-memory, non-durable)
- Google Cloud Pub/Sub (durable, at-least-once)
- AWS SNS → SQS fanout (durable with DLQ)
- Kafka (persistent, replayable)

**SNS → SQS Fanout Pattern:**
```
Event ──▶ SNS Topic ──▶ SQS Queue A (email service)
                   ├──▶ SQS Queue B (analytics service)
                   └──▶ SQS Queue C (audit log service)

Each service processes at its own pace, independently
SQS adds buffering + DLQ + retry
```

---

## Retry Mechanisms

### Exponential Backoff with Jitter

```python
def send_with_retry(message, max_retries=3):
    for attempt in range(max_retries):
        try:
            return send(message)
        except TransientError as e:
            if attempt == max_retries - 1:
                raise
            
            # Exponential backoff: 1s, 2s, 4s
            base_delay = 2 ** attempt
            
            # Jitter: prevent thundering herd
            jitter = random.uniform(0, base_delay * 0.1)
            
            sleep(base_delay + jitter)
    
    raise MaxRetriesExceeded()
```

### Retry Policies

| Strategy | When to Use |
|----------|------------|
| Immediate retry | Transient failures (network blip) |
| Fixed delay | Rate limiting (429 errors) |
| Exponential backoff | Server overload |
| Backoff + jitter | Distributed systems (prevent stampede) |
| Circuit breaker | Persistent failures (don't keep hitting dead service) |

---

## Dead Letter Queue Patterns

```
Message lifecycle:
  Queue → Consumer (processing) → Success → Delete
                                → Failure × 3 → DLQ

DLQ strategies:
1. Alert on DLQ depth → manual investigation
2. DLQ consumer → log, analyze, attempt manual fix
3. Redrive policy → move fixed messages back to main queue
4. Lambda trigger on DLQ → automated processing/alerting
```

---

## Event-Driven Architecture

### Event Types

```
Domain Events:     "OrderCreated", "PaymentProcessed", "UserRegistered"
Integration Events: Cross-service events (published to message bus)
Commands:          "ProcessOrder", "SendEmail" (imperative, targeted)
Queries:           Not events (return data)
```

### Choreography vs Orchestration

```
Choreography (event-driven):
  Order Service publishes "OrderCreated"
  Payment Service subscribes → publishes "PaymentProcessed"
  Fulfillment Service subscribes → publishes "OrderShipped"
  
  Pros: Loose coupling, no single point of control
  Cons: Hard to trace flow, complex error handling

Orchestration (saga orchestrator):
  Saga Orchestrator tells each service what to do:
  → "Process payment" (to Payment Service)
  → "Reserve inventory" (to Inventory Service)
  → "Schedule delivery" (to Delivery Service)
  
  Pros: Clear flow, centralized error handling
  Cons: Orchestrator is more coupled, single point
```

### Outbox Pattern (Transactional Messaging)

**Problem:** How do you atomically update DB AND publish an event?

```python
# WRONG: Non-atomic
db.update_order(order_id, "completed")       # Step 1: DB update
kafka.publish("order-events", order_event)   # Step 2: Publish
# If crash between 1 and 2: DB updated, event not published → inconsistency

# RIGHT: Outbox pattern
with db.transaction():
    db.update_order(order_id, "completed")
    db.insert_outbox(event=order_event)  # Save event in same transaction

# Separate relay process (or Debezium CDC):
outbox_events = db.poll_outbox()
for event in outbox_events:
    kafka.publish(event)
    db.delete_outbox(event.id)
```

---

## Message Ordering Guarantees

```
Scenario: User sends messages A, B, C
Requirement: Consumer receives in order A, B, C

Kafka:
  Same key → same partition → ordered within partition ✅
  Different keys → different partitions → no ordering ❌
  Solution: Route related messages with same key

SQS FIFO:
  MessageGroupId → ordered within group ✅
  Different groups → no relative ordering

RabbitMQ:
  Single queue + single consumer → ordered ✅
  Multiple consumers → no ordering ❌
  Solution: Single consumer per queue or careful design
```

---

## Stream Processing

### Use Cases
- Real-time analytics
- Fraud detection
- Monitoring/alerting
- Event-driven pipelines

### Tools

**Kafka Streams (Java):**
```java
KStream<String, Order> orders = builder.stream("orders");
KTable<String, Long> orderCounts = orders
    .groupByKey()
    .count();
orderCounts.toStream().to("order-counts");
```

**Apache Flink:**
- True streaming (vs Spark micro-batching)
- Event time processing
- Complex event processing (CEP)
- Exactly-once guarantees
- Used by: Alibaba, Lyft, Netflix

**Apache Spark Streaming / Structured Streaming:**
- Micro-batch processing
- Integrates with Spark ML
- Used by: Uber, Airbnb, Netflix

---

## Messaging Interview Q&A

**Q: When would you use Kafka over SQS?**
> Kafka when you need: replay capability, multiple independent consumers, high throughput (>50K msg/s), event sourcing, or stream processing. SQS for simpler AWS-native task queues, especially when you don't need replay.

**Q: How do you ensure message ordering in a distributed system?**
> Use partition key (Kafka) or MessageGroupId (SQS FIFO) to route related messages to same partition/group. Within a partition, Kafka guarantees ordering. For cross-partition ordering, you need application-level sequencing.

**Q: How do you handle duplicate messages?**
> Idempotent consumers: check if already processed (using message ID + dedup table in DB or Redis). Design processing logic to be naturally idempotent where possible.

**Q: What is the Outbox pattern and why is it needed?**
> Ensures atomicity between DB writes and message publishing. Instead of writing to DB and publishing separately (risk of partial failure), write both to DB in a single transaction, then a relay process publishes the outbox event.

---

*Next: `07_load_balancing.md`*
