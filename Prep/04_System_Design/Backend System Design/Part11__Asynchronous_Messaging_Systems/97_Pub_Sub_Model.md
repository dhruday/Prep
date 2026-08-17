# 97. Pub-Sub Model

## 📌 Overview

**Publish-Subscribe (Pub-Sub)** is a messaging pattern where publishers send messages to topics, and multiple subscribers receive copies of those messages. Unlike queues (one consumer), pub-sub allows **multiple consumers** to receive the **same message**.

---

## 🎯 Pub-Sub vs Queue

### **Queue (Point-to-Point)**
```
Producer → Queue → Consumer 1 ✓
                 X Consumer 2 (doesn't get message)

Each message consumed ONCE
```

### **Pub-Sub**
```
Publisher → Topic → Subscriber 1 ✓
                 → Subscriber 2 ✓
                 → Subscriber 3 ✓

Each subscriber gets a COPY
```

---

## 🏗️ Pub-Sub Architecture

```
┌───────────┐
│Publisher 1│────┐
└───────────┘    │
                 ▼
┌───────────┐  ┌───────┐  ┌─────────────┐
│Publisher 2│─>│ Topic │─>│Subscriber 1 │
└───────────┘  └───────┘  ├─────────────┤
                 ▲        │Subscriber 2 │
┌───────────┐    │        ├─────────────┤
│Publisher 3│────┘        │Subscriber 3 │
└───────────┘             └─────────────┘
```

---

## 🛠️ Implementations

### **Redis Pub-Sub**
```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Subscriber
pubsub = r.pubsub()
pubsub.subscribe('news')

for message in pubsub.listen():
    if message['type'] == 'message':
        print(f"Received: {message['data']}")

# Publisher
r.publish('news', 'Breaking news: System launched!')
```

### **Google Cloud Pub/Sub**
```python
from google.cloud import pubsub_v1

# Publisher
publisher = pubsub_v1.PublisherClient()
topic_path = 'projects/my-project/topics/my-topic'

future = publisher.publish(topic_path, b'Hello World')
print(f"Published message ID: {future.result()}")

# Subscriber
subscriber = pubsub_v1.SubscriberClient()
subscription_path = 'projects/my-project/subscriptions/my-sub'

def callback(message):
    print(f"Received: {message.data}")
    message.ack()  # Acknowledge

subscriber.subscribe(subscription_path, callback=callback)
```

### **AWS SNS + SQS**
```python
import boto3

sns = boto3.client('sns')
sqs = boto3.client('sqs')

# Create topic
topic_arn = sns.create_topic(Name='orders')['TopicArn']

# Create subscriptions (SQS queues)
queue1 = sqs.create_queue(QueueName='email-service')
queue2 = sqs.create_queue(QueueName='analytics-service')

sns.subscribe(TopicArn=topic_arn, Protocol='sqs', Endpoint=queue1['QueueUrl'])
sns.subscribe(TopicArn=topic_arn, Protocol='sqs', Endpoint=queue2['QueueUrl'])

# Publish
sns.publish(TopicArn=topic_arn, Message='New order placed')
# Both queues receive message
```

### **Apache Kafka (Pub-Sub)**
```python
from kafka import KafkaProducer, KafkaConsumer

# Publisher
producer = KafkaProducer(bootstrap_servers=['localhost:9092'])
producer.send('user-events', b'User signed up')

# Subscriber 1 (email service)
consumer1 = KafkaConsumer(
    'user-events',
    group_id='email-service',  # Different group = independent consumption
    bootstrap_servers=['localhost:9092']
)

# Subscriber 2 (analytics service)
consumer2 = KafkaConsumer(
    'user-events',
    group_id='analytics-service',  # Different group
    bootstrap_servers=['localhost:9092']
)

# Both consumers receive same message
```

---

## 🎯 Use Cases

### **1. Notifications**
```python
# Publish order event
sns.publish(TopicArn='orders', Message=json.dumps({
    'order_id': 123,
    'user_id': 456,
    'total': 99.99
}))

# Multiple subscribers:
# - Email service: Sends confirmation email
# - SMS service: Sends text notification
# - Push service: Sends mobile notification
# - Analytics: Tracks revenue
```

### **2. Event-Driven Architecture**
```python
# User signs up
publisher.send('user-events', {'event': 'UserSignedUp', 'user_id': 789})

# Multiple services listen:
# - Welcome email service
# - Analytics (track signups)
# - CRM (create contact)
# - Recommendation engine (initialize profile)
```

### **3. Real-Time Updates**
```python
# Stock price updates
redis.publish('stock-prices', json.dumps({
    'symbol': 'AAPL',
    'price': 150.25,
    'timestamp': time.time()
}))

# Multiple dashboards subscribe:
# - Trading dashboard
# - Mobile app
# - Analytics system
# All see real-time updates
```

---

## 📊 Pub-Sub Patterns

### **1. Fanout (Broadcast)**
```
One message → ALL subscribers

Publisher → Topic → Sub1 ✓
                 → Sub2 ✓
                 → Sub3 ✓
```

### **2. Topic-Based**
```
Subscribers filter by topic

Publisher → "stocks.AAPL" → Sub1 (subscribed to AAPL) ✓
         → "stocks.GOOG" → Sub2 (subscribed to GOOG) ✓
```

### **3. Content-Based**
```
Subscribers filter by message content

Publisher → {type: "order", total: 100} → Sub1 (filter: total > 50) ✓
         → {type: "order", total: 10}  → Sub1 X (filtered out)
```

---

## ✅ Benefits

1. **Decoupling**: Publishers/subscribers don't know each other
2. **Scalability**: Add subscribers without changing publishers
3. **Fan-out**: One message reaches multiple services
4. **Real-time**: Instant delivery to all subscribers

---

## ⚠️ Challenges

1. **Duplicate Processing**: Same message processed by multiple services
2. **Ordering**: No global order across subscribers
3. **Unacknowledged Messages**: Subscriber crash = message loss (in Redis)
4. **Debugging**: Hard to trace message flow across services

---

## 🎓 Interview Tips

**Q: "What's the difference between pub-sub and message queue?"**

A: "Key differences:
- **Queue**: One consumer per message (work distribution)
- **Pub-Sub**: Multiple subscribers per message (fan-out)

Example:
- Queue: Task processing (1 worker processes each task)
- Pub-Sub: Notifications (email, SMS, push all receive same event)"

**Q: "When would you use pub-sub?"**

A: "Use pub-sub when:
- Multiple services need same data (order event → email + analytics + CRM)
- Real-time updates (stock prices → all dashboards)
- Event-driven architecture (loosely coupled microservices)
- Broadcasting (system alerts to all users)"

---

## 🔗 Related Topics
- **94. Message Queues** - Queue vs Pub-Sub
- **95. Kafka Fundamentals** - Kafka pub-sub
- **98. Event Streaming** - Real-time events
- **40. Event-Driven Architecture** - Architectural pattern

---

## 📚 Summary

**Pub-Sub**: Multiple subscribers receive same message

**Pattern**: Publisher → Topic → Subscribers (fan-out)

**Use Cases**: Notifications, event-driven, real-time updates

**Systems**: Redis Pub/Sub, Google Pub/Sub, AWS SNS, Kafka

**When to use**: Multiple consumers need same data 🚀
