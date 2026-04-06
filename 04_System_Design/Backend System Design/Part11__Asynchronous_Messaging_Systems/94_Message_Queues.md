# 94. Message Queues

## 📌 Overview

A **message queue** is a communication pattern where messages are stored in a queue and processed asynchronously by consumers. It decouples producers (senders) from consumers (receivers).

---

## 🎯 Core Concepts

```
┌──────────┐    enqueue    ┌───────┐    dequeue    ┌──────────┐
│ Producer │ ────────────> │ Queue │ ───────────> │ Consumer │
└──────────┘               └───────┘               └──────────┘
                          (FIFO order)
```

### Key Properties
- **Asynchronous**: Producer doesn't wait for consumer
- **Decoupling**: Producer/consumer don't know each other
- **Buffering**: Queue stores messages temporarily
- **Load leveling**: Absorbs traffic spikes

---

## 🛠️ Basic Implementation

```python
import queue
import threading
import time

class SimpleMessageQueue:
    def __init__(self):
        self.queue = queue.Queue()
    
    def produce(self, message):
        """Producer adds message to queue"""
        self.queue.put(message)
        print(f"Produced: {message}")
    
    def consume(self):
        """Consumer processes messages"""
        while True:
            message = self.queue.get()  # Blocks until message available
            print(f"Consumed: {message}")
            time.sleep(1)  # Simulate processing
            self.queue.task_done()

# Usage
mq = SimpleMessageQueue()

# Start consumer in background thread
consumer_thread = threading.Thread(target=mq.consume, daemon=True)
consumer_thread.start()

# Producer sends messages
for i in range(5):
    mq.produce(f"Message {i}")
    time.sleep(0.5)

# Wait for all messages processed
mq.queue.join()
```

---

## 📊 Message Queue Patterns

### **1. Point-to-Point (Single Consumer)**
```
┌─────────┐     ┌─────────┐     ┌──────────┐
│Producer │ ──> │  Queue  │ ──> │ Consumer │
└─────────┘     └─────────┘     └──────────┘
               Each message consumed once
```

### **2. Work Queue (Multiple Consumers)**
```
                                ┌──────────┐
                           ┌──> │Consumer 1│
┌─────────┐     ┌─────────┐    └──────────┘
│Producer │ ──> │  Queue  │
└─────────┘     └─────────┘    ┌──────────┐
                           └──> │Consumer 2│
                                └──────────┘
            Load balanced across consumers
```

---

## 🏗️ Popular Message Queues

### **RabbitMQ**
```python
import pika

# Connect to RabbitMQ
connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# Declare queue
channel.queue_declare(queue='tasks')

# Producer
channel.basic_publish(
    exchange='',
    routing_key='tasks',
    body='Process this task'
)

# Consumer
def callback(ch, method, properties, body):
    print(f"Received: {body}")
    ch.basic_ack(delivery_tag=method.delivery_tag)  # ACK

channel.basic_consume(queue='tasks', on_message_callback=callback)
channel.start_consuming()
```

### **AWS SQS**
```python
import boto3

sqs = boto3.client('sqs')
queue_url = 'https://sqs.us-east-1.amazonaws.com/123456789/my-queue'

# Send message
sqs.send_message(
    QueueUrl=queue_url,
    MessageBody='Process this task',
    DelaySeconds=0
)

# Receive message
response = sqs.receive_message(
    QueueUrl=queue_url,
    MaxNumberOfMessages=1,
    WaitTimeSeconds=10  # Long polling
)

for message in response.get('Messages', []):
    print(message['Body'])
    # Delete after processing
    sqs.delete_message(
        QueueUrl=queue_url,
        ReceiptHandle=message['ReceiptHandle']
    )
```

### **Redis Queue**
```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Producer
r.lpush('tasks', 'Process this task')

# Consumer (blocking pop)
while True:
    task = r.brpop('tasks', timeout=5)  # Blocks until message available
    if task:
        _, message = task
        print(f"Processing: {message}")
```

---

## 🎯 Use Cases

### **1. Email Sending**
```python
# Producer (API endpoint)
@app.route('/register', methods=['POST'])
def register():
    user = create_user(request.json)
    
    # Queue welcome email (async)
    queue.enqueue('send_email', {
        'to': user.email,
        'subject': 'Welcome!',
        'body': 'Thanks for registering'
    })
    
    return {"status": "registered"}  # Returns immediately

# Consumer (background worker)
@worker.task
def send_email(email_data):
    smtp.send(email_data['to'], email_data['subject'], email_data['body'])
```

### **2. Image Processing**
```python
# Producer (upload endpoint)
@app.route('/upload', methods=['POST'])
def upload_image():
    image_id = save_image(request.files['image'])
    
    # Queue image processing
    queue.enqueue('process_image', image_id)
    
    return {"image_id": image_id, "status": "processing"}

# Consumer (worker)
@worker.task
def process_image(image_id):
    image = load_image(image_id)
    thumbnail = resize(image, 200, 200)
    save_thumbnail(image_id, thumbnail)
```

### **3. Order Processing**
```python
# Producer
def place_order(order_data):
    order_id = create_order(order_data)
    
    # Queue order fulfillment
    queue.enqueue('fulfill_order', {
        'order_id': order_id,
        'items': order_data['items'],
        'shipping_address': order_data['address']
    })
    
    return {"order_id": order_id, "status": "processing"}

# Consumer
@worker.task
def fulfill_order(order_info):
    reserve_inventory(order_info['items'])
    generate_shipping_label(order_info['shipping_address'])
    notify_warehouse(order_info['order_id'])
```

---

## ✅ Benefits

1. **Decoupling**: Producer/consumer evolve independently
2. **Load Leveling**: Queue absorbs traffic spikes
3. **Reliability**: Messages persisted until processed
4. **Scalability**: Add more consumers for throughput
5. **Fault Tolerance**: Retry failed messages

---

## ⚠️ Challenges

1. **Complexity**: Need infrastructure (RabbitMQ, SQS)
2. **Ordering**: FIFO not guaranteed in distributed queues
3. **Duplicates**: At-least-once delivery may cause duplicates
4. **Latency**: Async = delayed processing
5. **Debugging**: Harder to trace async flows

---

## 🎓 Interview Tips

**Q: "What is a message queue?"**

A: "Message queue is async communication pattern where producers send messages to a queue, and consumers process them independently. Benefits: decoupling, load leveling, reliability. Used for: emails, image processing, background jobs."

**Q: "When would you use a message queue?"**

A: "Use when:
- Long-running tasks (video transcode)
- Non-critical path (emails, notifications)
- Traffic spikes (handle 1000 req/sec with 10 workers)
- Decoupling services (microservices communication)"

---

## 🔗 Related Topics
- **93. Synchronous vs Asynchronous** - Why async
- **95. Kafka Fundamentals** - Event streaming
- **96. RabbitMQ Fundamentals** - Detailed implementation
- **99. Delivery Guarantees** - Reliability

---

## 📚 Summary

**Message Queue**: Async communication via queue

**Pattern**: Producer → Queue → Consumer

**Benefits**: Decoupling, load leveling, reliability

**Use Cases**: Emails, image processing, background jobs

**Popular**: RabbitMQ, AWS SQS, Redis, Kafka 🚀
