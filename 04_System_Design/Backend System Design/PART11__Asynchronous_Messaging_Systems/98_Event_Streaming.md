# 98. Event Streaming

## 📌 Overview

**Event streaming** is the practice of capturing, storing, and processing events (state changes) in real-time as they occur. Unlike traditional request-response, events are immutable records stored in an append-only log.

---

## 🎯 Event Stream Concepts

### **Event**
```json
{
  "event_id": "evt_123",
  "event_type": "OrderPlaced",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "order_id": 789,
    "user_id": 456,
    "total": 99.99,
    "items": ["product1", "product2"]
  }
}
```

### **Event Stream**
```
Time →
[UserSignedUp] → [ProfileUpdated] → [OrderPlaced] → [OrderShipped] → ...

Immutable, append-only log of events
```

---

## 🏗️ Event Streaming vs Traditional

### **Traditional (Request-Response)**
```
Client → "Get user balance" → Database → Response: $1000
         (Query current state)

Only sees CURRENT state, not history
```

### **Event Streaming**
```
Event Stream:
├─ UserCreated (balance: $0)
├─ Deposited (amount: $1000)
├─ Withdrew (amount: $50)
└─ Deposited (amount: $100)

Current state = Replay all events = $1050
History preserved!
```

---

## 🛠️ Apache Kafka for Event Streaming

```python
from kafka import KafkaProducer, KafkaConsumer
import json

# Producer (emit events)
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Emit events
producer.send('order-events', {
    'event_type': 'OrderPlaced',
    'order_id': 123,
    'user_id': 456,
    'timestamp': time.time()
})

# Consumer (process stream)
consumer = KafkaConsumer(
    'order-events',
    bootstrap_servers=['localhost:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    event = message.value
    if event['event_type'] == 'OrderPlaced':
        send_confirmation_email(event['user_id'])
        update_analytics(event)
```

---

## 🎯 Event Sourcing Pattern

**Idea**: Store all state changes as events, reconstruct current state by replaying events.

```python
class Account:
    def __init__(self, account_id):
        self.account_id = account_id
        self.balance = 0
        self.events = []
    
    def deposit(self, amount):
        event = {
            'type': 'Deposited',
            'amount': amount,
            'timestamp': time.time()
        }
        self.apply_event(event)
        self.events.append(event)  # Store event
    
    def withdraw(self, amount):
        if self.balance < amount:
            raise InsufficientFundsError()
        
        event = {
            'type': 'Withdrew',
            'amount': amount,
            'timestamp': time.time()
        }
        self.apply_event(event)
        self.events.append(event)
    
    def apply_event(self, event):
        """Update state based on event"""
        if event['type'] == 'Deposited':
            self.balance += event['amount']
        elif event['type'] == 'Withdrew':
            self.balance -= event['amount']
    
    def rebuild_from_events(self, events):
        """Reconstruct state from event history"""
        self.balance = 0
        for event in events:
            self.apply_event(event)

# Usage
account = Account('acc_123')
account.deposit(1000)  # Event: Deposited $1000
account.withdraw(50)   # Event: Withdrew $50
account.deposit(100)   # Event: Deposited $100

print(account.balance)  # $1050

# Rebuild from events (time travel!)
new_account = Account('acc_123')
new_account.rebuild_from_events(account.events)
print(new_account.balance)  # $1050
```

---

## 📊 CQRS (Command Query Responsibility Segregation)

Separate write model (commands) from read model (queries).

```python
# Command Model (Write)
class OrderCommandService:
    def place_order(self, order_data):
        # Validate
        if not self.validate(order_data):
            raise ValidationError()
        
        # Emit event
        event = {
            'event_type': 'OrderPlaced',
            'order_id': order_data['order_id'],
            'user_id': order_data['user_id'],
            'items': order_data['items']
        }
        kafka_producer.send('order-events', event)
        
        return {"status": "accepted"}

# Query Model (Read)
class OrderQueryService:
    def __init__(self):
        self.read_db = MongoDB()  # Optimized for reads
    
    def get_user_orders(self, user_id):
        # Fast read from denormalized view
        return self.read_db.find({'user_id': user_id})

# Event Processor (Keep read model in sync)
@kafka_consumer('order-events')
def update_read_model(event):
    if event['event_type'] == 'OrderPlaced':
        mongodb.insert({
            'order_id': event['order_id'],
            'user_id': event['user_id'],
            'items': event['items'],
            'status': 'placed'
        })
    elif event['event_type'] == 'OrderShipped':
        mongodb.update(
            {'order_id': event['order_id']},
            {'$set': {'status': 'shipped'}}
        )
```

---

## 🎯 Use Cases

### **1. Activity Tracking**
```python
# Track user behavior
producer.send('user-activity', {
    'event_type': 'ProductViewed',
    'user_id': 123,
    'product_id': 456,
    'timestamp': time.time()
})

# Consumers:
# - Recommendation engine (what to show next)
# - Analytics (which products popular)
# - A/B testing (experiment tracking)
```

### **2. Audit Logging**
```python
# Financial transaction audit trail
producer.send('audit-log', {
    'event_type': 'MoneyTransferred',
    'from_account': 'acc_123',
    'to_account': 'acc_456',
    'amount': 1000,
    'timestamp': time.time(),
    'user_ip': '192.168.1.1'
})

# Complete audit trail: Who, what, when, where
# Immutable, never deleted
```

### **3. Real-Time Analytics**
```python
# Stream processing with Kafka Streams
from kafka import KafkaConsumer

# Count orders per minute
consumer = KafkaConsumer('order-events')
order_count = 0

for message in consumer:
    event = json.loads(message.value)
    if event['event_type'] == 'OrderPlaced':
        order_count += 1
        
        # Update dashboard in real-time
        dashboard.update('orders_per_minute', order_count)
```

---

## 🔧 Stream Processing

### **Stateless Processing**
```python
# Simple transformation (no state)
@stream_processor
def enrich_event(event):
    user = db.get_user(event['user_id'])
    event['user_name'] = user.name
    event['user_email'] = user.email
    return event
```

### **Stateful Processing (Aggregation)**
```python
# Count events by user (maintains state)
user_counts = {}

@stream_processor
def count_by_user(event):
    user_id = event['user_id']
    user_counts[user_id] = user_counts.get(user_id, 0) + 1
    
    if user_counts[user_id] > 100:
        alert(f"User {user_id} exceeded 100 events")
```

---

## ✅ Benefits

1. **History**: Complete audit trail of all changes
2. **Replay**: Reconstruct past states, fix bugs retroactively
3. **Real-time**: Process events as they happen
4. **Decoupling**: Multiple consumers process same events
5. **Scalability**: Partitioned streams for parallelism

---

## ⚠️ Challenges

1. **Complexity**: More moving parts than traditional architecture
2. **Eventual consistency**: Read model may lag behind writes
3. **Event schema evolution**: Changing event structure over time
4. **Storage**: Event logs grow indefinitely (need retention policy)

---

## 🎓 Interview Tips

**Q: "What is event sourcing?"**

A: "Event sourcing stores all state changes as events instead of current state. Benefits:
- **Audit trail**: Complete history of all changes
- **Time travel**: Reconstruct state at any point in time
- **Replayability**: Fix bugs by replaying events with new logic

Example: Bank account stores [Deposited $1000, Withdrew $50] instead of just balance=$950."

**Q: "What's the difference between event streaming and traditional messaging?"**

A: "Key differences:
- **Storage**: Events stored permanently (days/weeks), messages deleted after consumed
- **Replayability**: Can rewind event stream, can't replay consumed messages
- **Multiple consumers**: Event stream supports multiple independent consumers
- **Use case**: Events for real-time analytics/audit, messages for task processing"

---

## 🔗 Related Topics
- **95. Kafka Fundamentals** - Event streaming platform
- **97. Pub-Sub Model** - Event distribution
- **40. Event-Driven Architecture** - Architectural pattern
- **101. Idempotency** - Safe event replay

---

## 📚 Summary

**Event Streaming**: Capture, store, process events in real-time

**Key Concepts**:
- Events = immutable state changes
- Event sourcing = store all events
- CQRS = separate write/read models

**Use Cases**: Activity tracking, audit logging, real-time analytics

**When to use**: Need history, real-time processing, audit trails 🚀
