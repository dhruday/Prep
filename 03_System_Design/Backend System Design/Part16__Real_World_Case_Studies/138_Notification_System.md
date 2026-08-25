# 138. Notification System

## 📌 Problem Statement

**Design a notification system** that sends notifications via multiple channels (push, email, SMS).

**Example**:
```
User 123 places order → Send notifications:
- Push notification: "Order confirmed! #12345"
- Email: Order confirmation with details
- SMS: "Your order #12345 is confirmed"
```

---

## 🎯 Step 1: Requirements

### **Functional Requirements**

1. **Send notifications**: Push, email, SMS
2. **Multiple triggers**: User actions, system events, scheduled
3. **Personalization**: User preferences, templates
4. **Priority**: Urgent (SMS) vs normal (email)
5. **Delivery tracking**: Delivered, failed, retry

### **Non-Functional Requirements**

1. **High throughput**: 10 million notifications/day
2. **Low latency**: Send within 1 second
3. **Reliability**: 99.9% delivery rate
4. **Scalability**: Handle spikes (Black Friday)

---

## 🎯 Step 2: Notification Channels

### **1. Push Notifications** (Mobile app)

**Providers**: FCM (Firebase Cloud Messaging), APNS (Apple Push Notification Service)

**Use cases**: Real-time updates, urgent alerts

**Example**:
```json
{
  "title": "Order Confirmed",
  "body": "Your order #12345 is confirmed",
  "data": {
    "order_id": 12345,
    "deep_link": "app://orders/12345"
  }
}
```

---

### **2. Email**

**Providers**: SendGrid, AWS SES, Mailgun

**Use cases**: Receipts, newsletters, password reset

**Example**:
```html
Subject: Order Confirmation #12345

Dear John,

Your order #12345 has been confirmed.

Order Details:
- Item: iPhone 14
- Price: $999
- Delivery: Jan 20, 2024

Track your order: https://example.com/orders/12345

Thanks,
Example Team
```

---

### **3. SMS**

**Providers**: Twilio, AWS SNS

**Use cases**: OTP, urgent alerts

**Example**:
```
Your order #12345 is confirmed. Track: https://example.com/orders/12345
```

---

### **4. In-App Notifications**

**Storage**: Database, WebSockets for real-time

**Use cases**: Activity feed, mentions, likes

**Example**:
```json
{
  "id": 789,
  "user_id": 123,
  "type": "order_confirmed",
  "message": "Your order #12345 is confirmed",
  "read": false,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

## 🎯 Step 3: High-Level Design

```
┌─────────────┐
│   Services  │ (Orders, Payments, etc.)
└──────┬──────┘
       │
       │ 1. Trigger event (order_confirmed)
       ▼
┌─────────────────────────────────────┐
│    Notification Service (API)       │
│  - Validate request                 │
│  - Check user preferences           │
│  - Send to message queue            │
└──────────────┬──────────────────────┘
               │
               │ 2. Publish to queue
               ▼
┌─────────────────────────────────────┐
│      Message Queue (Kafka)          │
│  - Topic: notifications             │
│  - Partition by user_id             │
└──────────────┬──────────────────────┘
               │
               │ 3. Consume messages
               ▼
┌─────────────────────────────────────┐
│    Notification Workers (Pool)      │
│  - Push Worker                      │
│  - Email Worker                     │
│  - SMS Worker                       │
└──────────────┬──────────────────────┘
               │
               │ 4. Send to providers
               ▼
┌─────────────────────────────────────┐
│       External Providers            │
│  - FCM (Push)                       │
│  - SendGrid (Email)                 │
│  - Twilio (SMS)                     │
└─────────────────────────────────────┘
```

---

## 🎯 Step 4: Database Schema

### **Notifications Table**

```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,        -- order_confirmed, payment_received
    channel VARCHAR(20) NOT NULL,     -- push, email, sms
    status VARCHAR(20) NOT NULL,      -- pending, sent, failed
    template_id VARCHAR(50),
    payload JSONB,                    -- {order_id: 12345, amount: 99.99}
    sent_at TIMESTAMP,
    failed_reason TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_status (user_id, status),
    INDEX idx_created_at (created_at)
);
```

### **User Preferences Table**

```sql
CREATE TABLE user_notification_preferences (
    user_id BIGINT PRIMARY KEY,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    email_address VARCHAR(255),
    phone_number VARCHAR(20),
    device_tokens JSONB,              -- ["fcm_token_1", "fcm_token_2"]
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Templates Table**

```sql
CREATE TABLE notification_templates (
    id VARCHAR(50) PRIMARY KEY,
    channel VARCHAR(20) NOT NULL,
    subject TEXT,                     -- For email
    body TEXT NOT NULL,               -- Template with variables
    created_at TIMESTAMP DEFAULT NOW()
);

-- Example template
INSERT INTO notification_templates VALUES (
    'order_confirmed_email',
    'email',
    'Order Confirmation #{{order_id}}',
    'Dear {{user_name}}, Your order #{{order_id}} has been confirmed. Total: ${{total}}.'
);
```

---

## 🎯 Step 5: API Design

### **1. Send Notification**

**Request**:
```http
POST /api/notifications/send
Content-Type: application/json

{
  "user_id": 123,
  "type": "order_confirmed",
  "channels": ["push", "email"],
  "payload": {
    "order_id": 12345,
    "total": 99.99
  },
  "priority": "high"
}
```

**Response**:
```json
{
  "notification_id": 789,
  "status": "queued",
  "channels": ["push", "email"]
}
```

---

### **2. Get Notification Status**

**Request**:
```http
GET /api/notifications/789
```

**Response**:
```json
{
  "notification_id": 789,
  "user_id": 123,
  "type": "order_confirmed",
  "channels": [
    {"channel": "push", "status": "sent", "sent_at": "2024-01-15T10:00:01Z"},
    {"channel": "email", "status": "sent", "sent_at": "2024-01-15T10:00:05Z"}
  ],
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### **3. Update User Preferences**

**Request**:
```http
PUT /api/users/123/notification-preferences
Content-Type: application/json

{
  "push_enabled": true,
  "email_enabled": false,
  "sms_enabled": false
}
```

---

## 🎯 Step 6: Implementation

### **Notification Service (Flask)**

```python
from flask import Flask, request, jsonify
import kafka

app = Flask(__name__)
producer = kafka.KafkaProducer(bootstrap_servers='localhost:9092')

@app.route('/api/notifications/send', methods=['POST'])
def send_notification():
    data = request.json
    user_id = data['user_id']
    
    # 1. Get user preferences
    prefs = db.query('SELECT * FROM user_notification_preferences WHERE user_id=?', user_id)
    
    # 2. Filter channels based on preferences
    channels = []
    if data.get('channels'):
        if 'push' in data['channels'] and prefs['push_enabled']:
            channels.append('push')
        if 'email' in data['channels'] and prefs['email_enabled']:
            channels.append('email')
        if 'sms' in data['channels'] and prefs['sms_enabled']:
            channels.append('sms')
    
    # 3. Create notification record
    notification_id = db.insert('''
        INSERT INTO notifications (user_id, type, channel, status, payload)
        VALUES (?, ?, ?, 'pending', ?)
    ''', user_id, data['type'], ','.join(channels), json.dumps(data['payload']))
    
    # 4. Publish to Kafka
    for channel in channels:
        message = {
            'notification_id': notification_id,
            'user_id': user_id,
            'type': data['type'],
            'channel': channel,
            'payload': data['payload']
        }
        producer.send('notifications', value=json.dumps(message).encode())
    
    return jsonify({
        'notification_id': notification_id,
        'status': 'queued',
        'channels': channels
    })
```

---

### **Push Notification Worker**

```python
from kafka import KafkaConsumer
import requests

consumer = KafkaConsumer('notifications', bootstrap_servers='localhost:9092')

def send_push_notification(user_id, payload):
    # Get user's device tokens
    prefs = db.query('SELECT device_tokens FROM user_notification_preferences WHERE user_id=?', user_id)
    device_tokens = prefs['device_tokens']
    
    # Send to FCM (Firebase Cloud Messaging)
    fcm_url = 'https://fcm.googleapis.com/fcm/send'
    headers = {
        'Authorization': f'key={FCM_SERVER_KEY}',
        'Content-Type': 'application/json'
    }
    
    for token in device_tokens:
        data = {
            'to': token,
            'notification': {
                'title': payload['title'],
                'body': payload['body']
            },
            'data': payload.get('data', {})
        }
        
        response = requests.post(fcm_url, headers=headers, json=data)
        
        if response.status_code == 200:
            # Success
            db.update('UPDATE notifications SET status="sent", sent_at=NOW() WHERE id=?', notification_id)
        else:
            # Failed
            db.update('UPDATE notifications SET status="failed", failed_reason=? WHERE id=?',
                     response.text, notification_id)

# Consumer loop
for message in consumer:
    data = json.loads(message.value)
    
    if data['channel'] == 'push':
        send_push_notification(data['user_id'], data['payload'])
```

---

### **Email Worker**

```python
import sendgrid
from sendgrid.helpers.mail import Mail

def send_email(user_id, payload):
    # Get user's email
    prefs = db.query('SELECT email_address FROM user_notification_preferences WHERE user_id=?', user_id)
    email = prefs['email_address']
    
    # Get template
    template = db.query('SELECT * FROM notification_templates WHERE id=?', 'order_confirmed_email')
    
    # Render template
    subject = template['subject'].replace('{{order_id}}', str(payload['order_id']))
    body = template['body'].replace('{{order_id}}', str(payload['order_id']))
    body = body.replace('{{total}}', str(payload['total']))
    
    # Send via SendGrid
    message = Mail(
        from_email='noreply@example.com',
        to_emails=email,
        subject=subject,
        html_content=body
    )
    
    sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
    response = sg.send(message)
    
    if response.status_code == 202:
        db.update('UPDATE notifications SET status="sent", sent_at=NOW() WHERE id=?', notification_id)
    else:
        db.update('UPDATE notifications SET status="failed", failed_reason=? WHERE id=?',
                 response.body, notification_id)

# Consumer loop
for message in consumer:
    data = json.loads(message.value)
    
    if data['channel'] == 'email':
        send_email(data['user_id'], data['payload'])
```

---

## 🎯 Step 7: Optimizations

### **1. Rate Limiting**

**Problem**: Sending 1 million emails/minute → Spam filters, provider limits

**Solution**: Rate limit per provider

```python
from ratelimit import limits, sleep_and_retry

@sleep_and_retry
@limits(calls=1000, period=60)  # 1000 emails per minute
def send_email_rate_limited(email, subject, body):
    # Send email...
```

---

### **2. Retry with Exponential Backoff**

**Problem**: Provider temporarily down → Failed notifications

**Solution**: Retry with exponential backoff

```python
import time

def send_with_retry(notification_id, max_retries=3):
    for attempt in range(max_retries):
        try:
            send_notification(notification_id)
            return True
        except Exception as e:
            if attempt == max_retries - 1:
                # Final failure
                db.update('UPDATE notifications SET status="failed" WHERE id=?', notification_id)
                return False
            
            # Exponential backoff: 1s, 2s, 4s
            wait_time = 2 ** attempt
            time.sleep(wait_time)
```

---

### **3. Dead Letter Queue**

**Problem**: Failed notifications lost

**Solution**: Send failed notifications to DLQ, retry later

```python
# After max retries failed
producer.send('notifications-dlq', value=json.dumps(message).encode())

# DLQ consumer (retry hourly)
for message in consumer_dlq:
    # Retry sending...
```

---

### **4. Deduplication**

**Problem**: Duplicate notifications (Kafka at-least-once delivery)

**Solution**: Track notification IDs

```python
def send_notification(notification_id):
    # Check if already sent
    if redis.exists(f'sent:{notification_id}'):
        return  # Skip duplicate
    
    # Send notification...
    
    # Mark as sent (TTL = 24 hours)
    redis.setex(f'sent:{notification_id}', 86400, '1')
```

---

## 🎯 Step 8: Real-World Examples

### **1. Facebook**

**Scale**: 10+ billion notifications/day

**Channels**: Push, email, SMS, in-app

**Features**:
- Batching (combine multiple notifications)
- Coalescing (merge similar notifications)
- User preferences (mute, snooze)

**Architecture**: Custom notification infrastructure (not Kafka)

---

### **2. Slack**

**Channels**: Push, email, desktop notifications

**Features**:
- Real-time (WebSockets)
- Do Not Disturb (schedule)
- Per-channel preferences

**Algorithm**: Coalescing (e.g., "5 new messages" instead of 5 separate notifications)

---

### **3. Uber**

**Channels**: Push, SMS (for drivers)

**Use cases**: Ride accepted, driver nearby, payment receipt

**Priority**: High priority for time-sensitive (driver nearby)

---

## 🎯 Step 9: Trade-offs

| Decision | Trade-off |
|----------|-----------|
| **Sync vs Async** | Sync (fast response, blocks) vs Async (slow response, scalable) |
| **Push vs Pull** | Push (real-time, complex) vs Pull (simple, polling delay) |
| **Single queue vs Multiple queues** | Single (simple, bottleneck) vs Multiple (scalable, complex) |
| **Retry vs DLQ** | Retry (eventual delivery) vs DLQ (faster recovery) |

---

## 🎓 Interview Tips

**Q: "How do you design a notification system?"**

A: "I design a notification system with multiple channels:

**Architecture**:
1. **Notification Service** (API): Receives requests, validates, publishes to queue
2. **Message Queue** (Kafka): Buffers notifications, decouples producers/consumers
3. **Workers** (Push/Email/SMS): Consume from queue, send to providers
4. **Providers** (FCM, SendGrid, Twilio): Deliver notifications

**Flow**:
```
Order Service → POST /api/notifications/send
  → Notification Service checks user preferences
    → Publish to Kafka (topic: notifications)
      → Workers consume messages
        → Send to FCM (push), SendGrid (email), Twilio (SMS)
```

**Key features**:
- **User preferences**: Enable/disable channels
- **Templates**: Reusable notification templates
- **Retry**: Exponential backoff for failures
- **Rate limiting**: Respect provider limits
- **Deduplication**: Prevent duplicate notifications

**Scale**: 10 million notifications/day, <1 second latency

Real-world: Facebook (10+ billion/day), Slack (real-time WebSockets)"

---

## 📚 Summary

**Channels**: Push (FCM, APNS), Email (SendGrid), SMS (Twilio)

**Architecture**: API → Kafka → Workers → Providers

**Features**: User preferences, templates, retry, rate limiting, deduplication

**Scale**: 10M notifications/day, <1s latency, 99.9% delivery rate 🚀

