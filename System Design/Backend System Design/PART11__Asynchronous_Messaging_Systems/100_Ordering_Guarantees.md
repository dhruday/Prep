# 100. Ordering Guarantees

## 📌 Overview

**Ordering guarantees** define whether messages are processed in the order they were sent. In distributed systems, maintaining order is challenging due to:
- Network delays
- Multiple partitions/queues
- Concurrent processing

---

## 🎯 Levels of Ordering

### **1. No Ordering Guarantee**
```
Sent: [A, B, C]
Received: [B, C, A] ❌

Fastest but chaotic
```

### **2. Partition-Level Ordering**
```
Sent: [A₁, B₁, C₁] to partition 1 → Received: [A₁, B₁, C₁] ✓
Sent: [A₂, B₂, C₂] to partition 2 → Received: [A₂, B₂, C₂] ✓

Ordered within partition, no global order
```

### **3. Global Ordering**
```
Sent: [A, B, C]
Received: [A, B, C] ✓

All messages in exact order (single partition)
```

---

## 🏗️ Kafka Ordering

### **Partition-Level Ordering**
```python
from kafka import KafkaProducer

producer = KafkaProducer(bootstrap_servers=['localhost:9092'])

# Same key → same partition → ordered
producer.send('orders', key=b'user-123', value=b'Order1')
producer.send('orders', key=b'user-123', value=b'Order2')
producer.send('orders', key=b'user-123', value=b'Order3')
# Guaranteed order: Order1 → Order2 → Order3

# Different keys → different partitions → no order guarantee
producer.send('orders', key=b'user-456', value=b'OrderA')
producer.send('orders', key=b'user-123', value=b'OrderB')
# OrderA and OrderB may arrive in any order
```

**How Kafka Maintains Order**:
```
Topic: orders (3 partitions)

Key: user-123 → hash(user-123) % 3 = 2 → Partition 2
All messages with key user-123 go to Partition 2

Partition 2:
┌─────────┬─────────┬─────────┐
│ Order1  │ Order2  │ Order3  │
└─────────┴─────────┴─────────┘
   ↓         ↓         ↓
  Read in order by consumer
```

### **Global Ordering (Single Partition)**
```python
# Force all messages to one partition
producer = KafkaProducer(
    partitioner=lambda key, all_partitions, available: 0  # Always partition 0
)

producer.send('orders', value=b'Order1')
producer.send('orders', value=b'Order2')
producer.send('orders', value=b'Order3')
# All go to partition 0 → global order

# ⚠️ Bottleneck: Single partition = no parallelism!
```

---

## 🎯 RabbitMQ Ordering

### **Queue-Level Ordering**
```python
import pika

connection = pika.BlockingConnection()
channel = connection.channel()

# Single consumer → ordered processing
channel.basic_qos(prefetch_count=1)  # Process one at a time

def callback(ch, method, properties, body):
    print(f"Processing: {body}")
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_consume(queue='tasks', on_message_callback=callback)
channel.start_consuming()
# Messages processed in order
```

### **Lost Ordering with Multiple Consumers**
```python
# Multiple consumers → no order guarantee
consumer1 = Thread(target=consume, args=('tasks',))
consumer2 = Thread(target=consume, args=('tasks',))

# Sent: [A, B, C]
# Consumer1 gets: A, C
# Consumer2 gets: B
# Processing: B (faster) → A (slower) → C ❌
# Order lost!
```

---

## 📊 Ordering Strategies

### **1. Message Key (Partition Assignment)**
```python
# Partition by key for ordering
def send_with_ordering(key, message):
    partition = hash(key) % num_partitions
    producer.send('topic', message, partition=partition)

# Same user → same partition → ordered
send_with_ordering('user-123', 'UpdateProfile')
send_with_ordering('user-123', 'PlaceOrder')
# Ordered: UpdateProfile → PlaceOrder ✓
```

### **2. Sequence Numbers**
```python
# Add sequence number to messages
sequence = 0

def send_ordered(message):
    global sequence
    producer.send('topic', {
        'seq': sequence,
        'data': message
    })
    sequence += 1

# Consumer reorders if needed
received = []

def consume():
    for message in consumer:
        received.append(message.value)
        
        # Sort by sequence number
        received.sort(key=lambda m: m['seq'])
        
        # Process in order
        process_in_order(received)
```

### **3. Timestamp Ordering**
```python
# Add timestamp to messages
def send_with_timestamp(message):
    producer.send('topic', {
        'timestamp': time.time(),
        'data': message
    })

# Consumer sorts by timestamp
def consume_ordered():
    buffer = []
    
    for message in consumer:
        buffer.append(message.value)
        
        # Wait for window (e.g., 5 seconds)
        now = time.time()
        buffer = [m for m in buffer if now - m['timestamp'] < 5]
        
        # Sort and process
        buffer.sort(key=lambda m: m['timestamp'])
        for msg in buffer:
            process(msg)
```

### **4. Single Consumer**
```python
# Simplest: One consumer per partition
consumer = KafkaConsumer(
    'topic',
    group_id='my-group',
    # Only one consumer in group → ordered
)

for message in consumer:
    process(message.value)  # Sequential processing
```

---

## 🎯 Real-World Examples

### **1. Bank Transactions (Strict Ordering)**
```python
# Account updates must be ordered
# Partition by account_id

def process_transaction(account_id, transaction):
    producer.send(
        'transactions',
        key=account_id.encode(),  # Same account → same partition
        value=json.dumps(transaction).encode()
    )

# Same account transactions ordered:
process_transaction('acc-123', {'type': 'deposit', 'amount': 1000})
process_transaction('acc-123', {'type': 'withdraw', 'amount': 500})
# Guaranteed order: deposit → withdraw ✓
```

### **2. Chat Messages (Partial Ordering)**
```python
# Messages in same conversation must be ordered
# Partition by conversation_id

def send_message(conversation_id, sender, text):
    producer.send(
        'chat-messages',
        key=conversation_id.encode(),  # Same conversation → same partition
        value=json.dumps({
            'sender': sender,
            'text': text,
            'timestamp': time.time()
        }).encode()
    )

# Same conversation ordered, different conversations independent
send_message('conv-1', 'Alice', 'Hello')
send_message('conv-1', 'Bob', 'Hi there')
# Ordered within conv-1 ✓

send_message('conv-2', 'Carol', 'Hey')
# conv-2 independent, no ordering constraint with conv-1
```

### **3. Log Processing (No Ordering Needed)**
```python
# Logs can be processed in any order (independent)

def send_log(level, message):
    producer.send(
        'logs',
        # No key → random partition
        value=json.dumps({'level': level, 'message': message}).encode()
    )

# Multiple consumers process in parallel
# No ordering needed → maximum throughput ✓
```

---

## ✅ Trade-offs

| Ordering | Throughput | Latency | Complexity | Use Case |
|----------|------------|---------|------------|----------|
| **None** | Highest | Lowest | Simplest | Logs, metrics |
| **Partition-level** | High | Low | Medium | User events, accounts |
| **Global** | Lowest | Highest | Complex | Critical sequences |

---

## ⚠️ Challenges

1. **Hot Partitions**: Popular keys overload one partition
2. **Rebalancing**: Consumer rebalancing may reorder messages
3. **Clock Skew**: Timestamps unreliable across servers
4. **Retries**: Failed messages may arrive out of order

---

## 🎓 Interview Tips

**Q: "How does Kafka guarantee message ordering?"**

A: "Kafka guarantees ordering **within a partition**:
- Messages with same key go to same partition (hash(key) % num_partitions)
- Consumer reads partition sequentially → ordered

Example: User events (user_id as key) → all events for user-123 go to same partition → ordered processing.

⚠️ No global ordering across partitions (trade-off for parallelism)."

**Q: "How would you handle ordering with multiple consumers?"**

A: "Strategies:
1. **Partition assignment**: Each consumer handles specific partitions (Kafka consumer groups)
2. **Sequence numbers**: Consumers buffer and reorder by sequence
3. **Single consumer per key**: Route key to specific consumer (consistent hashing)

Example: Route user-123 to Consumer 1, user-456 to Consumer 2 (always same mapping)."

---

## 🔗 Related Topics
- **95. Kafka Fundamentals** - Partition ordering
- **100. Idempotency** - Out-of-order retries
- **99. Delivery Guarantees** - Order vs reliability
- **96. RabbitMQ** - Queue ordering

---

## 📚 Summary

**Ordering Levels**:
- **None**: Maximum throughput (logs)
- **Partition-level**: Balanced (user events)
- **Global**: Strict order (critical sequences)

**Kafka Approach**: Same key → same partition → ordered

**Trade-off**: Strict ordering = lower throughput

**Best Practice**: Partition by entity ID (user_id, account_id) 🚀
