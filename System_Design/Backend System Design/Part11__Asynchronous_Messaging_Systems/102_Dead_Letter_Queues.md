# 102. Dead Letter Queues (DLQ)

## 📌 Overview

A **Dead Letter Queue (DLQ)** is a special queue for messages that **cannot be processed successfully** after multiple retry attempts. Instead of losing failed messages or retrying forever, they're moved to a DLQ for:
- Manual inspection
- Debugging
- Fixing and reprocessing

---

## 🎯 Why DLQs?

### **Problem: What to Do with Failed Messages?**

```
Option 1: Discard ❌
├─ Message lost forever
└─ Data loss

Option 2: Retry forever ❌
├─ Poison message blocks queue
└─ Other messages can't process

Option 3: Dead Letter Queue ✅
├─ Move to DLQ after N retries
├─ Investigate failure
└─ Fix and reprocess
```

---

## 🏗️ DLQ Architecture

```
┌─────────┐      ┌───────────┐      ┌──────────┐
│Producer │─────>│Main Queue │─────>│Consumer  │
└─────────┘      └───────────┘      └──────────┘
                       │                  │
                       │                  ▼
                       │              ✅ Success
                       │                  │
                       │                  ▼
                       │              ❌ Failure
                       │                  │
                       │                  ▼
                       │              Retry (1)
                       │                  │
                       │                  ▼
                       │              Retry (2)
                       │                  │
                       │                  ▼
                       │              Retry (3)
                       │                  │
                       │                  ▼
                       │          Max retries reached
                       │                  │
                       ▼                  ▼
                  ┌─────────────────────────┐
                  │  Dead Letter Queue      │
                  │  (Manual Review)        │
                  └─────────────────────────┘
```

---

## 🛠️ Implementation Examples

### **AWS SQS DLQ**

```python
import boto3

sqs = boto3.client('sqs')

# Create main queue
main_queue = sqs.create_queue(QueueName='orders')
main_queue_url = main_queue['QueueUrl']

# Create DLQ
dlq = sqs.create_queue(QueueName='orders-dlq')
dlq_url = dlq['QueueUrl']
dlq_arn = sqs.get_queue_attributes(
    QueueUrl=dlq_url,
    AttributeNames=['QueueArn']
)['Attributes']['QueueArn']

# Configure main queue with DLQ
sqs.set_queue_attributes(
    QueueUrl=main_queue_url,
    Attributes={
        'RedrivePolicy': json.dumps({
            'deadLetterTargetArn': dlq_arn,
            'maxReceiveCount': 3  # Move to DLQ after 3 attempts
        })
    }
)

# Consumer
while True:
    messages = sqs.receive_message(QueueUrl=main_queue_url)
    
    for message in messages.get('Messages', []):
        try:
            # Process message
            process(message['Body'])
            
            # Success: Delete from queue
            sqs.delete_message(
                QueueUrl=main_queue_url,
                ReceiptHandle=message['ReceiptHandle']
            )
        except Exception as e:
            print(f"Failed to process: {e}")
            # Don't delete → message returns to queue
            # After 3 failures → moved to DLQ automatically
```

---

### **RabbitMQ DLX (Dead Letter Exchange)**

```python
import pika
import json

connection = pika.BlockingConnection()
channel = connection.channel()

# Create DLX (Dead Letter Exchange)
channel.exchange_declare(exchange='dlx', exchange_type='direct')
channel.queue_declare(queue='dlq')
channel.queue_bind(exchange='dlx', queue='dlq', routing_key='failed')

# Create main queue with DLX configuration
channel.queue_declare(
    queue='tasks',
    arguments={
        'x-dead-letter-exchange': 'dlx',  # Failed → DLX
        'x-dead-letter-routing-key': 'failed',
        'x-message-ttl': 60000  # 60 seconds TTL (optional)
    }
)

# Consumer
def callback(ch, method, properties, body):
    try:
        # Process message
        process(json.loads(body))
        
        # Success: ACK
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"Failed: {e}")
        
        # Failure: NACK without requeue
        ch.basic_nack(
            delivery_tag=method.delivery_tag,
            requeue=False  # Don't requeue → goes to DLX
        )

channel.basic_consume(queue='tasks', on_message_callback=callback)
channel.start_consuming()
```

---

### **Kafka Manual DLQ**

Kafka doesn't have built-in DLQ, but you can implement it:

```python
from kafka import KafkaConsumer, KafkaProducer
import json

consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092']
)

producer = KafkaProducer(bootstrap_servers=['localhost:9092'])

# Track retry counts
retry_counts = {}

for message in consumer:
    message_id = message.value['id']
    retry_count = retry_counts.get(message_id, 0)
    
    try:
        # Process message
        process(message.value)
        
        # Success: Remove from retry tracking
        retry_counts.pop(message_id, None)
        
    except Exception as e:
        print(f"Failed (attempt {retry_count + 1}): {e}")
        
        retry_count += 1
        retry_counts[message_id] = retry_count
        
        if retry_count >= 3:
            # Max retries → send to DLQ
            producer.send('orders-dlq', value=json.dumps({
                'original_message': message.value,
                'error': str(e),
                'retry_count': retry_count,
                'timestamp': time.time()
            }).encode())
            
            # Remove from retry tracking
            retry_counts.pop(message_id, None)
        else:
            # Retry: Send back to main topic (or delay)
            time.sleep(2 ** retry_count)  # Exponential backoff
```

---

## 🎯 Retry Strategies

### **1. Immediate Retry**
```python
max_retries = 3

for attempt in range(max_retries):
    try:
        process(message)
        break  # Success
    except Exception as e:
        if attempt == max_retries - 1:
            send_to_dlq(message)  # Final failure
```

### **2. Exponential Backoff**
```python
def process_with_backoff(message, max_retries=3):
    for attempt in range(max_retries):
        try:
            process(message)
            return  # Success
        except Exception as e:
            if attempt == max_retries - 1:
                send_to_dlq(message)
                return
            
            # Exponential backoff: 2^attempt seconds
            delay = 2 ** attempt  # 1s, 2s, 4s, 8s...
            time.sleep(delay)
```

### **3. Retry with Delay Queue**
```python
# Separate queue for delayed retries
def process_message(message):
    try:
        process(message)
    except Exception:
        retry_count = message.get('retry_count', 0)
        
        if retry_count >= 3:
            send_to_dlq(message)
        else:
            # Send to retry queue with delay
            send_to_retry_queue({
                **message,
                'retry_count': retry_count + 1,
                'retry_after': time.time() + (2 ** retry_count)
            })

# Retry queue consumer
def process_retry_queue():
    for message in retry_queue:
        if time.time() >= message['retry_after']:
            send_to_main_queue(message)
```

---

## 🎯 DLQ Best Practices

### **1. Monitor DLQ Depth**
```python
# Alert if DLQ growing
def monitor_dlq():
    dlq_depth = sqs.get_queue_attributes(
        QueueUrl=dlq_url,
        AttributeNames=['ApproximateNumberOfMessages']
    )['Attributes']['ApproximateNumberOfMessages']
    
    if int(dlq_depth) > 10:
        alert(f"DLQ depth: {dlq_depth} messages")
```

### **2. Log Failure Reasons**
```python
def send_to_dlq(message, error):
    producer.send('dlq', value=json.dumps({
        'original_message': message,
        'error': str(error),
        'error_type': type(error).__name__,
        'timestamp': time.time(),
        'stack_trace': traceback.format_exc()
    }).encode())
```

### **3. Manual Review Process**
```python
# Inspect DLQ messages
def inspect_dlq():
    messages = sqs.receive_message(QueueUrl=dlq_url, MaxNumberOfMessages=10)
    
    for message in messages.get('Messages', []):
        data = json.loads(message['Body'])
        print(f"Failed message: {data['original_message']}")
        print(f"Error: {data['error']}")
        print(f"Timestamp: {data['timestamp']}")
        print("---")
```

### **4. Reprocess from DLQ**
```python
# Fix issue and reprocess
def reprocess_dlq():
    messages = sqs.receive_message(QueueUrl=dlq_url, MaxNumberOfMessages=10)
    
    for message in messages.get('Messages', []):
        data = json.loads(message['Body'])
        
        try:
            # Retry processing
            process(data['original_message'])
            
            # Success: Remove from DLQ
            sqs.delete_message(
                QueueUrl=dlq_url,
                ReceiptHandle=message['ReceiptHandle']
            )
            print(f"Reprocessed successfully: {data['original_message']}")
        except Exception as e:
            print(f"Still failing: {e}")
```

---

## 🎯 Common DLQ Scenarios

### **1. Invalid Message Format**
```python
try:
    data = json.loads(message)
    process(data)
except json.JSONDecodeError:
    # Can't parse → send to DLQ
    send_to_dlq(message, "Invalid JSON")
```

### **2. Missing Dependencies**
```python
try:
    user = db.get_user(message['user_id'])
    if not user:
        raise UserNotFoundError()
    process(user, message)
except UserNotFoundError:
    # User deleted → send to DLQ
    send_to_dlq(message, "User not found")
```

### **3. External Service Down**
```python
try:
    response = requests.post('https://api.example.com', json=message)
    response.raise_for_status()
except requests.RequestException as e:
    # Retry with backoff
    if retry_count >= 3:
        send_to_dlq(message, f"API failed after {retry_count} retries")
```

---

## ✅ Benefits

1. **No Data Loss**: Failed messages preserved
2. **Queue Health**: Poison messages don't block queue
3. **Debugging**: Inspect failures, fix root cause
4. **Reprocessing**: Fix issue and replay DLQ messages

---

## ⚠️ Challenges

1. **Manual Intervention**: DLQ requires human review
2. **Monitoring**: Must alert on DLQ growth
3. **Ordering**: Reprocessed messages out of order
4. **Storage Costs**: DLQ messages consume storage

---

## 🎓 Interview Tips

**Q: "What is a Dead Letter Queue?"**

A: "A DLQ is a queue for messages that fail processing after multiple retries. Instead of discarding or retrying forever, failed messages move to DLQ for:
- Manual inspection (why did it fail?)
- Debugging (fix root cause)
- Reprocessing (after fix, replay from DLQ)

Example: Payment processing fails 3 times (invalid card) → move to DLQ → engineer reviews → fixes card validation → reprocess."

**Q: "When should you send a message to DLQ?"**

A: "Send to DLQ when:
- **Max retries reached** (e.g., 3 attempts)
- **Permanent failure** (invalid format, missing data)
- **Poison message** (crashes consumer)

Don't send for transient failures (network timeout → retry with backoff)."

---

## 🔗 Related Topics
- **94. Message Queues** - Queue fundamentals
- **99. Delivery Guarantees** - Retry mechanisms
- **101. Idempotency** - Safe retries
- **93. Async Processing** - Error handling

---

## 📚 Summary

**DLQ**: Queue for permanently failed messages

**Purpose**: Preserve failed messages, investigate, reprocess

**Configuration**: Max retries (e.g., 3) → DLQ

**Best Practices**: Monitor depth, log errors, manual review

**When to use**: Retry failures, debugging, no data loss 🚀
