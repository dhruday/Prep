# 99. At-Most-Once vs At-Least-Once vs Exactly-Once

## 📌 Overview

**Delivery guarantees** define how message systems handle failures. The three levels are:

1. **At-Most-Once**: Message delivered 0 or 1 times (may lose)
2. **At-Least-Once**: Message delivered 1+ times (may duplicate)
3. **Exactly-Once**: Message delivered exactly 1 time (hardest)

---

## 🎯 The Three Guarantees

### **At-Most-Once** (Fire and Forget)
```
Producer → Send message → [Network failure?] → Consumer
           ↓
         No retry
         
Result: Message may be lost ❌
```

**Implementation**:
```python
# No acknowledgment, no retry
def send_at_most_once(message):
    try:
        socket.send(message)
        # Don't wait for ACK
    except Exception:
        pass  # Ignore failure, don't retry
```

**Use Case**: Metrics, logs (acceptable to lose some data)

---

### **At-Least-Once** (Retry Until Success)
```
Producer → Send → [Failure?] → Retry → Consumer
                                  ↓
                              Success!
                              
Result: Message may be delivered multiple times ✓✓
```

**Implementation**:
```python
# Retry until ACK received
def send_at_least_once(message):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            socket.send(message)
            ack = socket.recv()  # Wait for ACK
            if ack == 'OK':
                return  # Success
        except Exception:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
```

**Problem**: Duplicate processing
```
1. Producer sends message
2. Consumer processes message
3. Consumer sends ACK
4. ACK lost in network
5. Producer retries (thinks it failed)
6. Consumer processes AGAIN ✓✓ (duplicate!)
```

**Use Case**: Most systems (payments, orders) → Requires idempotency

---

### **Exactly-Once** (Hardest to Achieve)
```
Producer → Send (with unique ID) → Consumer
                                      ↓
                              Deduplication check
                                      ↓
                              Process only once ✓
```

**Implementation**:
```python
# Idempotent processing with deduplication
processed_ids = set()

def process_exactly_once(message):
    message_id = message['id']
    
    # Check if already processed
    if message_id in processed_ids:
        print(f"Duplicate: {message_id}, skipping")
        return  # Already processed
    
    # Process message
    process(message['data'])
    
    # Mark as processed
    processed_ids.add(message_id)
    
    # Send ACK
    send_ack(message_id)

# With database
def process_exactly_once_db(message):
    message_id = message['id']
    
    with transaction():
        # Check + insert in one transaction (atomic)
        if db.exists('processed_messages', message_id):
            return  # Already processed
        
        # Process message
        process(message['data'])
        
        # Mark as processed
        db.insert('processed_messages', message_id)
```

**Use Case**: Financial transactions, critical operations

---

## 📊 Comparison

| Guarantee | Delivery | Duplicates | Performance | Complexity | Use Case |
|-----------|----------|------------|-------------|-----------|----------|
| **At-Most-Once** | 0 or 1 | No | Fastest | Simplest | Metrics, logs |
| **At-Least-Once** | 1+ | Yes | Fast | Simple | Most systems |
| **Exactly-Once** | Exactly 1 | No | Slowest | Complex | Payments, critical |

---

## 🏗️ Real-World Examples

### **Kafka Delivery Guarantees**

#### At-Least-Once (Default)
```python
from kafka import KafkaProducer, KafkaConsumer

# Producer (at-least-once)
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    acks='all',  # Wait for all replicas
    retries=3  # Retry on failure
)
producer.send('topic', b'message')

# Consumer (at-least-once)
consumer = KafkaConsumer(
    'topic',
    enable_auto_commit=False  # Manual commit
)

for message in consumer:
    process(message.value)
    consumer.commit()  # Commit after processing
    # If crash before commit → message reprocessed (duplicate)
```

#### Exactly-Once (Transactions)
```python
# Producer with exactly-once
producer = KafkaProducer(
    enable_idempotence=True,  # Deduplication
    transactional_id='my-transactional-id'
)

producer.begin_transaction()
producer.send('topic', b'message')
producer.commit_transaction()  # Atomic commit
```

---

### **AWS SQS Delivery Guarantees**

#### Standard Queue (At-Least-Once)
```python
import boto3

sqs = boto3.client('sqs')
queue_url = 'https://sqs.us-east-1.amazonaws.com/123/my-queue'

# Receive message
response = sqs.receive_message(QueueUrl=queue_url)

for message in response['Messages']:
    # Process message
    process(message['Body'])
    
    # Delete after processing
    sqs.delete_message(
        QueueUrl=queue_url,
        ReceiptHandle=message['ReceiptHandle']
    )
    # If crash before delete → message reappears (duplicate)
```

#### FIFO Queue (Exactly-Once)
```python
# FIFO queue with deduplication
sqs.send_message(
    QueueUrl='https://sqs.us-east-1.amazonaws.com/123/my-queue.fifo',
    MessageBody='Process payment',
    MessageDeduplicationId='payment-123',  # Dedup ID
    MessageGroupId='user-456'  # Ordering group
)
# Same dedup ID within 5 minutes → ignored (exactly-once)
```

---

### **RabbitMQ Delivery Guarantees**

#### At-Least-Once
```python
import pika

channel = connection.channel()

# Consumer
def callback(ch, method, properties, body):
    try:
        process(body)
        ch.basic_ack(delivery_tag=method.delivery_tag)  # ACK success
    except Exception:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        # Requeue on failure → at-least-once

channel.basic_consume(queue='tasks', on_message_callback=callback, auto_ack=False)
```

---

## 🔧 Achieving Exactly-Once

### **1. Idempotent Operations**
```python
# Non-idempotent (dangerous with duplicates)
def transfer_money(from_account, to_account, amount):
    from_balance = db.get(from_account)
    db.set(from_account, from_balance - amount)  # ❌ Duplicate = double charge!
    
    to_balance = db.get(to_account)
    db.set(to_account, to_balance + amount)

# Idempotent (safe with duplicates)
def transfer_money_idempotent(transfer_id, from_account, to_account, amount):
    # Check if already processed
    if db.exists('transfers', transfer_id):
        return  # Already processed, skip
    
    # Process transfer
    with transaction():
        db.update(from_account, -amount)
        db.update(to_account, +amount)
        db.insert('transfers', transfer_id)  # Mark as processed
```

### **2. Deduplication Table**
```python
# Track processed message IDs
def process_with_dedup(message_id, data):
    with transaction():
        # Check + insert atomically
        if not db.insert_if_not_exists('processed_messages', message_id):
            return  # Already processed
        
        # Process message
        process(data)
```

### **3. Unique Constraints**
```sql
-- Database ensures uniqueness
CREATE TABLE orders (
    order_id VARCHAR(255) PRIMARY KEY,  -- Unique constraint
    user_id INT,
    total DECIMAL(10, 2)
);

-- Duplicate INSERT fails (exactly-once)
INSERT INTO orders (order_id, user_id, total)
VALUES ('order-123', 456, 99.99);
-- Second INSERT with same order_id → error (ignored by application)
```

---

## ✅ Best Practices

1. **Default to At-Least-Once + Idempotency**: Most reliable
2. **Use unique IDs**: Generate UUID for each message
3. **Deduplication window**: Store processed IDs for limited time (e.g., 24 hours)
4. **Transaction logs**: Use database transactions for atomicity
5. **Monitor duplicates**: Track duplicate rate in metrics

---

## 🎓 Interview Tips

**Q: "Explain at-least-once vs exactly-once."**

A: "At-least-once guarantees message delivered but may duplicate (need retries). Exactly-once guarantees no duplicates (deduplication).

Example: Transfer $100
- **At-least-once**: Retry on failure → may transfer twice ($200 total) ❌
- **Exactly-once**: Check if transfer_id already processed → transfer once ✓

Achieve exactly-once with: Idempotent operations + deduplication table."

**Q: "How do you make an operation idempotent?"**

A: "Strategies:
1. **Unique ID**: Check if ID already processed
2. **Database constraints**: PRIMARY KEY prevents duplicates
3. **Conditional updates**: `UPDATE WHERE version = X` (optimistic locking)
4. **Deduplication table**: Track processed message IDs

Example: Payment with payment_id → check if payment_id exists before charging."

---

## 🔗 Related Topics
- **94. Message Queues** - Delivery mechanisms
- **101. Idempotency** - Safe retries
- **93. Async Processing** - Error handling
- **102. Dead Letter Queues** - Failed messages

---

## 📚 Summary

**Three Guarantees**:
- **At-Most-Once**: Fast, may lose (metrics, logs)
- **At-Least-Once**: Reliable, may duplicate (most systems)
- **Exactly-Once**: Perfect, complex (payments, critical)

**Achieving Exactly-Once**: Idempotent operations + deduplication

**Best Practice**: At-least-once + idempotency = reliable & simple 🚀
