# 95. Kafka Fundamentals

## 📌 Overview

**Apache Kafka** is a distributed streaming platform designed for high-throughput, fault-tolerant, real-time data pipelines. Unlike traditional message queues, Kafka stores messages permanently and allows multiple consumers to read the same data.

---

## 🎯 Core Concepts

### **Topics**
```
Topic = Category/Feed of messages

Topic: "user-signups"
├─ Partition 0: [msg1, msg2, msg3]
├─ Partition 1: [msg4, msg5, msg6]
└─ Partition 2: [msg7, msg8, msg9]
```

### **Partitions**
- Topic divided into partitions for parallelism
- Each partition is ordered, immutable log
- Messages have offsets (sequential IDs)

### **Producers**
```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Send message
producer.send('user-signups', {'user_id': 123, 'email': 'alice@example.com'})
producer.flush()  # Ensure sent
```

### **Consumers & Consumer Groups**
```python
from kafka import KafkaConsumer

consumer = KafkaConsumer(
    'user-signups',
    bootstrap_servers=['localhost:9092'],
    group_id='email-service',  # Consumer group
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    print(f"Offset: {message.offset}, Value: {message.value}")
```

**Consumer Groups**: Multiple consumers share workload
```
Topic: 3 partitions
Consumer Group "email-service":
├─ Consumer 1 → Partition 0
├─ Consumer 2 → Partition 1
└─ Consumer 3 → Partition 2

Each partition consumed by ONE consumer in group
```

---

## 📊 Kafka vs Traditional Message Queue

| Feature | Kafka | RabbitMQ/SQS |
|---------|-------|--------------|
| **Storage** | Permanent (days/weeks) | Temporary (until consumed) |
| **Replayability** | Yes (rewind offset) | No (message deleted) |
| **Multiple Consumers** | Yes (different groups) | No (single consumer) |
| **Ordering** | Per-partition | Per-queue |
| **Throughput** | Very high (millions/sec) | Medium (thousands/sec) |

---

## 🏗️ Kafka Architecture

```
┌─────────────────────────────────────────┐
│            Kafka Cluster                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │Broker 1 │  │Broker 2 │  │Broker 3 │ │
│  │Leader P0│  │Replica  │  │Replica  │ │
│  └─────────┘  └─────────┘  └─────────┘ │
└─────────────────────────────────────────┘
         ↑                        ↓
    ┌─────────┐              ┌──────────┐
    │Producer │              │ Consumer │
    └─────────┘              └──────────┘
```

### **Replication**
```
Topic: "orders" (replication-factor=3)
Partition 0:
├─ Leader: Broker 1 (reads/writes)
├─ Replica: Broker 2 (sync)
└─ Replica: Broker 3 (sync)

If Broker 1 fails → Broker 2 becomes leader
```

---

## 🎯 Common Use Cases

### **1. Activity Tracking**
```python
# Producer (web server logs user actions)
producer.send('user-activity', {
    'user_id': 123,
    'action': 'view_product',
    'product_id': 456,
    'timestamp': time.time()
})

# Consumer (analytics service)
for message in consumer:
    activity = message.value
    update_analytics(activity)
```

### **2. Log Aggregation**
```python
# Producers (multiple services send logs)
app1_producer.send('logs', {'service': 'api', 'level': 'ERROR', 'msg': '500 error'})
app2_producer.send('logs', {'service': 'web', 'level': 'INFO', 'msg': 'Request'})

# Consumer (centralized logging)
for message in consumer:
    log = message.value
    elasticsearch.index('logs', log)
```

### **3. Event Sourcing**
```python
# Producer (order service emits events)
producer.send('order-events', {
    'event': 'OrderCreated',
    'order_id': 789,
    'user_id': 123,
    'total': 99.99
})

# Consumers (multiple services listen)
# - Inventory service: Reserve stock
# - Email service: Send confirmation
# - Analytics service: Track revenue
```

---

## 🔧 Key Features

### **Offset Management**
```python
# Manual offset control
consumer = KafkaConsumer(
    'my-topic',
    group_id='my-group',
    enable_auto_commit=False  # Manual commit
)

for message in consumer:
    process(message.value)
    consumer.commit()  # Commit after processing

# Seek to specific offset (replay)
consumer.seek(TopicPartition('my-topic', 0), 100)  # Start from offset 100
```

### **Message Retention**
```bash
# Kafka config: Retain messages for 7 days
log.retention.hours=168

# Or by size
log.retention.bytes=1073741824  # 1GB per partition
```

### **Exactly-Once Semantics**
```python
# Producer with idempotent writes
producer = KafkaProducer(
    enable_idempotence=True,  # Prevents duplicates
    transactional_id='my-transactional-id'
)

# Transactional writes
producer.begin_transaction()
producer.send('topic1', {'data': 'value1'})
producer.send('topic2', {'data': 'value2'})
producer.commit_transaction()
# Both messages committed atomically
```

---

## 📈 Performance

**Throughput**:
- Single broker: 100K-500K messages/sec
- Cluster (3 brokers): 1-2M messages/sec

**Latency**:
- End-to-end: 2-10ms (typical)
- Replication lag: <1ms (same DC)

---

## ✅ Best Practices

1. **Partition by key**: Use consistent key (user_id) for ordering
2. **Monitor lag**: Track consumer lag (messages behind)
3. **Set retention**: Balance storage cost vs replayability
4. **Batch writes**: Send multiple messages at once (higher throughput)
5. **Handle rebalancing**: Consumers may reassign partitions

---

## 🎓 Interview Tips

**Q: "What is Kafka and how does it differ from RabbitMQ?"**

A: "Kafka is distributed streaming platform with permanent storage. Key differences:
- **Storage**: Kafka keeps messages (days/weeks), RabbitMQ deletes after consumption
- **Replayability**: Kafka can rewind/replay, RabbitMQ cannot
- **Throughput**: Kafka millions/sec, RabbitMQ thousands/sec
- **Use case**: Kafka for event streaming/analytics, RabbitMQ for task queues"

**Q: "How does Kafka guarantee ordering?"**

A: "Kafka guarantees ordering **per partition**. Messages with same key go to same partition (via hash). Example: All orders for user_id=123 go to partition 2, maintaining order. Different partitions have independent ordering."

---

## 🔗 Related Topics
- **94. Message Queues** - General queuing
- **97. Pub-Sub Model** - Kafka's model
- **98. Event Streaming** - Kafka use cases
- **99. Delivery Guarantees** - At-least-once, exactly-once

---

## 📚 Summary

**Kafka**: Distributed streaming platform

**Key Features**:
- Permanent storage (replayable)
- High throughput (millions/sec)
- Partitioned for scale
- Multiple consumer groups

**Use Cases**: Activity tracking, log aggregation, event sourcing

**When to use**: High-throughput streaming, event-driven architecture 🚀
