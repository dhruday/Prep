# 96. RabbitMQ Fundamentals

## 📌 Overview

**RabbitMQ** is a message broker that implements **AMQP** (Advanced Message Queuing Protocol). It's designed for reliable message delivery with flexible routing.

---

## 🎯 Core Concepts

### **Exchange Types**

#### **1. Direct Exchange**
```
Messages routed by exact routing key match

Producer → [Exchange] → Queue
           routing_key="error" → error_queue
           routing_key="info"  → info_queue
```

```python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# Declare exchange
channel.exchange_declare(exchange='logs_direct', exchange_type='direct')

# Declare queues
channel.queue_declare(queue='error_queue')
channel.queue_declare(queue='info_queue')

# Bind queues to exchange
channel.queue_bind(exchange='logs_direct', queue='error_queue', routing_key='error')
channel.queue_bind(exchange='logs_direct', queue='info_queue', routing_key='info')

# Publish
channel.basic_publish(
    exchange='logs_direct',
    routing_key='error',
    body='Critical error occurred'
)
```

#### **2. Fanout Exchange**
```
Broadcast to ALL bound queues (ignores routing key)

Producer → [Exchange] → Queue 1
                     → Queue 2
                     → Queue 3
```

```python
# Fanout (broadcast)
channel.exchange_declare(exchange='notifications', exchange_type='fanout')

# All queues receive same message
channel.queue_bind(exchange='notifications', queue='email_queue')
channel.queue_bind(exchange='notifications', queue='sms_queue')
channel.queue_bind(exchange='notifications', queue='push_queue')

# Publish
channel.basic_publish(exchange='notifications', routing_key='', body='New order!')
# All 3 queues receive message
```

#### **3. Topic Exchange**
```
Pattern-based routing

Producer → [Exchange]
           routing_key="user.signup.email" → queue_email
           routing_key="user.signup.sms"   → queue_sms
           routing_key="user.*.email"      → queue_all_email (wildcard)
```

```python
# Topic exchange
channel.exchange_declare(exchange='events', exchange_type='topic')

# Bind with patterns
channel.queue_bind(exchange='events', queue='user_events', routing_key='user.#')
# user.# matches user.signup, user.login, user.logout, etc.

channel.queue_bind(exchange='events', queue='signup_events', routing_key='*.signup.*')
# Matches user.signup.email, admin.signup.sms, etc.

# Publish
channel.basic_publish(
    exchange='events',
    routing_key='user.signup.email',
    body='User registered'
)
```

#### **4. Headers Exchange**
```
Route based on message headers (not routing key)
```

---

## 🏗️ RabbitMQ Architecture

```
┌─────────┐     ┌──────────┐     ┌───────┐     ┌──────────┐
│Producer │ ──> │ Exchange │ ──> │ Queue │ ──> │ Consumer │
└─────────┘     └──────────┘     └───────┘     └──────────┘
                    ↓
               (Routing Logic)
```

---

## 🎯 Message Acknowledgment

```python
# Consumer with ACK
def callback(ch, method, properties, body):
    print(f"Received: {body}")
    
    try:
        process_message(body)
        ch.basic_ack(delivery_tag=method.delivery_tag)  # ACK success
    except Exception as e:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)  # Retry

channel.basic_consume(queue='tasks', on_message_callback=callback, auto_ack=False)
channel.start_consuming()
```

**ACK Types**:
- `basic_ack`: Success (delete message)
- `basic_nack`: Failure (requeue or dead letter)
- `basic_reject`: Reject single message

---

## 🔧 Key Features

### **1. Message Durability**
```python
# Durable queue (survives broker restart)
channel.queue_declare(queue='tasks', durable=True)

# Persistent messages
channel.basic_publish(
    exchange='',
    routing_key='tasks',
    body='Important task',
    properties=pika.BasicProperties(delivery_mode=2)  # Persistent
)
```

### **2. Priority Queues**
```python
# Declare queue with max priority
channel.queue_declare(queue='priority_tasks', arguments={'x-max-priority': 10})

# Publish with priority
channel.basic_publish(
    exchange='',
    routing_key='priority_tasks',
    body='High priority task',
    properties=pika.BasicProperties(priority=9)  # 0-10 scale
)
```

### **3. Dead Letter Exchange (DLX)**
```python
# Queue with dead letter routing
channel.queue_declare(
    queue='tasks',
    arguments={
        'x-dead-letter-exchange': 'dlx_exchange',
        'x-message-ttl': 60000  # 60 seconds TTL
    }
)

# Dead letter queue
channel.queue_declare(queue='failed_tasks')
channel.queue_bind(exchange='dlx_exchange', queue='failed_tasks')

# Failed/expired messages go to 'failed_tasks' queue
```

### **4. TTL (Time-To-Live)**
```python
# Message-level TTL
channel.basic_publish(
    exchange='',
    routing_key='tasks',
    body='Expire in 60 sec',
    properties=pika.BasicProperties(expiration='60000')  # milliseconds
)

# Queue-level TTL
channel.queue_declare(
    queue='temp_tasks',
    arguments={'x-message-ttl': 60000}  # All messages expire
)
```

---

## 📊 RabbitMQ vs Kafka

| Feature | RabbitMQ | Kafka |
|---------|----------|-------|
| **Message Model** | Queue (deleted after consumed) | Log (permanent) |
| **Ordering** | Queue-level | Partition-level |
| **Routing** | Flexible (exchanges) | Simple (topics) |
| **Throughput** | Moderate (thousands/sec) | High (millions/sec) |
| **Use Case** | Task queues, RPC | Event streaming, analytics |

---

## 🎯 Use Cases

### **1. Task Queue**
```python
# Producer (web server)
def create_report(user_id):
    channel.basic_publish(
        exchange='',
        routing_key='report_tasks',
        body=json.dumps({'user_id': user_id, 'type': 'monthly'})
    )
    return {"status": "Report generation started"}

# Consumer (worker)
def callback(ch, method, properties, body):
    task = json.loads(body)
    generate_report(task['user_id'], task['type'])
    ch.basic_ack(delivery_tag=method.delivery_tag)
```

### **2. Fan-Out Notifications**
```python
# New order → notify email, SMS, push
channel.basic_publish(
    exchange='order_notifications',  # Fanout
    routing_key='',
    body=json.dumps({'order_id': 123, 'user_id': 456})
)

# 3 consumers: email_worker, sms_worker, push_worker
# All receive same message
```

### **3. Log Routing**
```python
# Route logs by severity
channel.basic_publish(
    exchange='logs',
    routing_key='error',  # Direct exchange
    body='Database connection failed'
)

# error_queue → alerts on-call engineer
# info_queue → stores in database
```

---

## ✅ Best Practices

1. **Use ACKs**: Don't lose messages on worker crash
2. **Set prefetch count**: Limit unacked messages per worker
   ```python
   channel.basic_qos(prefetch_count=1)  # One message at a time
   ```
3. **Monitor queue depth**: Alert if queue growing (workers slow/down)
4. **Use DLX**: Handle permanently failed messages
5. **Connection pooling**: Reuse connections (expensive to create)

---

## 🎓 Interview Tips

**Q: "Explain RabbitMQ exchanges."**

A: "RabbitMQ has 4 exchange types:
1. **Direct**: Exact routing key match
2. **Fanout**: Broadcast to all queues
3. **Topic**: Pattern matching (user.*, *.signup)
4. **Headers**: Route by message headers

Producer sends to exchange → exchange routes to queue → consumer reads from queue."

**Q: "How do you handle failed messages in RabbitMQ?"**

A: "Use Dead Letter Exchange (DLX):
1. Configure queue with `x-dead-letter-exchange`
2. Failed messages (nack/reject/ttl expired) routed to DLX
3. Failed messages go to dead letter queue
4. Manual review or automated retry with exponential backoff"

---

## 🔗 Related Topics
- **94. Message Queues** - General concepts
- **95. Kafka Fundamentals** - Comparison
- **99. Delivery Guarantees** - At-least-once
- **102. Dead Letter Queues** - Error handling

---

## 📚 Summary

**RabbitMQ**: Message broker with flexible routing

**Key Features**:
- 4 exchange types (direct, fanout, topic, headers)
- Message ACKs (reliability)
- Dead letter queues (error handling)
- Priority queues, TTL

**Use Cases**: Task queues, notifications, log routing

**When to use**: Task processing, microservices communication 🚀
