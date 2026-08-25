# 139. Messaging / Chat System (like WhatsApp, Slack)

## 📌 Problem Statement

**Design a messaging system** that supports 1-on-1 chat and group chat.

**Example**:
```
User A sends message to User B → User B receives instantly (real-time)
User A creates group with B, C, D → All members receive messages
```

---

## 🎯 Step 1: Requirements

### **Functional Requirements**

1. **1-on-1 chat**: Two users exchange messages
2. **Group chat**: Multiple users (up to 500)
3. **Online/offline status**: Show user status
4. **Message history**: Load past messages
5. **Read receipts**: Seen/delivered status
6. **Media sharing**: Images, videos, files
7. **Typing indicators**: "User is typing..."

### **Non-Functional Requirements**

1. **Low latency**: < 1 second message delivery
2. **High availability**: 99.99% uptime
3. **Scalability**: 1 billion users, 100 million DAU
4. **Consistency**: Messages delivered in order
5. **Durability**: Messages never lost

---

## 🎯 Step 2: Capacity Estimation

### **Users**

```
Total users: 1 billion
Daily active users (DAU): 100 million
Concurrent users: 10 million
```

### **Messages**

```
Messages per user per day: 50
Total messages per day: 100M × 50 = 5 billion messages
Messages per second: 5B / 86400 = 58k messages/sec
```

### **Storage**

```
Message size: 100 bytes (text + metadata)
Media files: 1 KB average (after compression)

Total storage per day: 5B × 100 bytes = 500 GB (text)
Total storage per day: 5B × 1 KB = 5 TB (media)
Total over 5 years: 500 GB × 365 × 5 = 912 TB (text)
                    5 TB × 365 × 5 = 9 PB (media)
```

### **WebSocket Connections**

```
Concurrent users: 10 million
Connections per server: 10k (typical)
Total servers: 10M / 10k = 1000 servers
```

---

## 🎯 Step 3: API Design

### **1. Send Message**

**Request**:
```http
POST /api/messages
Content-Type: application/json
Authorization: Bearer <token>

{
  "recipient_id": 456,      // For 1-on-1
  "group_id": 789,          // For group chat (mutually exclusive)
  "content": "Hello!",
  "type": "text",           // text, image, video, file
  "media_url": null
}
```

**Response**:
```json
{
  "message_id": 123,
  "sender_id": 123,
  "recipient_id": 456,
  "content": "Hello!",
  "timestamp": "2024-01-15T10:00:00Z",
  "status": "sent"
}
```

---

### **2. Get Message History**

**Request**:
```http
GET /api/messages?recipient_id=456&before=123&limit=50
```

**Response**:
```json
{
  "messages": [
    {
      "message_id": 122,
      "sender_id": 123,
      "recipient_id": 456,
      "content": "Hi!",
      "timestamp": "2024-01-15T09:59:00Z",
      "status": "delivered"
    },
    ...
  ],
  "has_more": true
}
```

---

### **3. Mark as Read**

**Request**:
```http
POST /api/messages/123/read
```

---

### **4. WebSocket (Real-time)**

**Connection**:
```javascript
const ws = new WebSocket('wss://chat.example.com/ws?token=<auth_token>');

// Receive message
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('New message:', message);
};

// Send message
ws.send(JSON.stringify({
  type: 'message',
  recipient_id: 456,
  content: 'Hello!'
}));
```

---

## 🎯 Step 4: Database Schema

### **Users Table**

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    last_seen TIMESTAMP,
    online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **Messages Table** (Sharded by user_id)

```sql
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    recipient_id BIGINT,              -- For 1-on-1
    group_id BIGINT,                  -- For group chat
    content TEXT,
    type VARCHAR(20) DEFAULT 'text',  -- text, image, video, file
    media_url TEXT,
    status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, read
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_recipient_created (recipient_id, created_at DESC),
    INDEX idx_sender_created (sender_id, created_at DESC),
    INDEX idx_group_created (group_id, created_at DESC)
);
```

### **Groups Table**

```sql
CREATE TABLE groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100),
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE group_members (
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);
```

### **Conversations Table** (Metadata)

```sql
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    user1_id BIGINT NOT NULL,         -- Lower user_id
    user2_id BIGINT NOT NULL,         -- Higher user_id
    last_message_id BIGINT,
    last_message_time TIMESTAMP,
    unread_count_user1 INT DEFAULT 0,
    unread_count_user2 INT DEFAULT 0,
    UNIQUE (user1_id, user2_id)
);
```

---

## 🎯 Step 5: High-Level Design

```
┌─────────────┐
│   Client    │ (Mobile, Web)
└──────┬──────┘
       │
       │ 1. WebSocket connection
       ▼
┌─────────────────────────────────────┐
│    Load Balancer (WebSocket)        │
│  - Consistent hashing by user_id    │
└──────────────┬──────────────────────┘
               │
               │ 2. Route to Chat Server
               ▼
┌─────────────────────────────────────┐
│      Chat Servers (WebSocket)       │
│  - Maintain connections (10k/server)│
│  - Send/receive messages            │
└──────────────┬──────────────────────┘
               │
               │ 3. Publish message
               ▼
┌─────────────────────────────────────┐
│      Message Queue (Kafka)          │
│  - Topic: messages                  │
│  - Partition by recipient_id        │
└──────────────┬──────────────────────┘
               │
               │ 4. Consume & deliver
               ▼
┌─────────────────────────────────────┐
│      Chat Servers (Deliver)         │
│  - Find recipient's server          │
│  - Push via WebSocket               │
└──────────────┬──────────────────────┘
               │
               │ 5. Store message
               ▼
┌─────────────────────────────────────┐
│    Database (PostgreSQL/Cassandra)  │
│  - Sharded by user_id               │
└─────────────────────────────────────┘
```

---

## 🎯 Step 6: Message Flow

### **1-on-1 Chat**

```
User A (ID 123) → Sends message to User B (ID 456)

1. User A → WebSocket → Chat Server 1
2. Chat Server 1 → Save to database (sender_id=123, recipient_id=456)
3. Chat Server 1 → Publish to Kafka (topic: messages, partition: 456)
4. Chat Server 2 (where User B is connected) → Consumes from Kafka
5. Chat Server 2 → Push to User B via WebSocket
6. User B → Receives message
7. User B → Sends "delivered" acknowledgment
8. Chat Server 2 → Update message status (delivered)
9. Chat Server 2 → Push "delivered" to User A
```

---

### **Group Chat**

```
User A (ID 123) → Sends message to Group G (IDs: 456, 789, 101)

1. User A → Chat Server 1
2. Chat Server 1 → Save to database (sender_id=123, group_id=G)
3. Chat Server 1 → Publish to Kafka (topic: groups, partition: G)
4. Group Workers → Consume from Kafka
5. Group Workers → Fan-out to all members (456, 789, 101)
6. For each member:
   - Publish to Kafka (topic: messages, partition: member_id)
7. Chat Servers (where members are connected) → Push via WebSocket
```

---

## 🎯 Step 7: Implementation

### **WebSocket Server (Flask-SocketIO)**

```python
from flask import Flask
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins='*')

# User ID → Socket ID mapping (Redis)
user_connections = {}  # {user_id: socket_id}

@socketio.on('connect')
def handle_connect():
    user_id = get_user_id_from_token(request.args.get('token'))
    
    # Store connection
    user_connections[user_id] = request.sid
    redis.set(f'connection:{user_id}', request.sid, ex=3600)
    
    # Update online status
    db.execute('UPDATE users SET online=true, last_seen=NOW() WHERE id=?', user_id)
    
    # Notify friends (user came online)
    friends = db.query('SELECT friend_id FROM friendships WHERE user_id=?', user_id)
    for friend in friends:
        emit('user_online', {'user_id': user_id}, room=user_connections.get(friend['friend_id']))

@socketio.on('disconnect')
def handle_disconnect():
    user_id = get_user_id_from_socket(request.sid)
    
    # Remove connection
    del user_connections[user_id]
    redis.delete(f'connection:{user_id}')
    
    # Update offline status
    db.execute('UPDATE users SET online=false, last_seen=NOW() WHERE id=?', user_id)
    
    # Notify friends (user went offline)
    friends = db.query('SELECT friend_id FROM friendships WHERE user_id=?', user_id)
    for friend in friends:
        emit('user_offline', {'user_id': user_id}, room=user_connections.get(friend['friend_id']))

@socketio.on('send_message')
def handle_send_message(data):
    sender_id = get_user_id_from_socket(request.sid)
    recipient_id = data['recipient_id']
    content = data['content']
    
    # 1. Save to database
    message_id = db.insert('''
        INSERT INTO messages (sender_id, recipient_id, content, status)
        VALUES (?, ?, ?, 'sent')
        RETURNING id
    ''', sender_id, recipient_id, content)
    
    # 2. Publish to Kafka
    kafka_producer.send('messages', value=json.dumps({
        'message_id': message_id,
        'sender_id': sender_id,
        'recipient_id': recipient_id,
        'content': content,
        'timestamp': time.time()
    }).encode())
    
    # 3. Send acknowledgment to sender
    emit('message_sent', {'message_id': message_id, 'status': 'sent'})

@socketio.on('typing')
def handle_typing(data):
    recipient_id = data['recipient_id']
    sender_id = get_user_id_from_socket(request.sid)
    
    # Send typing indicator to recipient
    emit('user_typing', {'user_id': sender_id}, room=user_connections.get(recipient_id))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
```

---

### **Message Delivery Worker (Kafka Consumer)**

```python
from kafka import KafkaConsumer

consumer = KafkaConsumer('messages', bootstrap_servers='localhost:9092')

for message in consumer:
    data = json.loads(message.value)
    
    recipient_id = data['recipient_id']
    
    # 1. Check if recipient is online
    socket_id = redis.get(f'connection:{recipient_id}')
    
    if socket_id:
        # 2. Recipient online → Push via WebSocket
        socketio.emit('new_message', {
            'message_id': data['message_id'],
            'sender_id': data['sender_id'],
            'content': data['content'],
            'timestamp': data['timestamp']
        }, room=socket_id)
        
        # 3. Update status (delivered)
        db.execute('UPDATE messages SET status="delivered" WHERE id=?', data['message_id'])
    else:
        # Recipient offline → Will fetch on next login
        pass
```

---

## 🎯 Step 8: Optimizations

### **1. Message Caching (Redis)**

**Problem**: Load recent messages from database (slow)

**Solution**: Cache recent messages in Redis

```python
def get_messages(user_id, recipient_id, limit=50):
    cache_key = f'messages:{min(user_id, recipient_id)}:{max(user_id, recipient_id)}'
    
    # 1. Check cache
    messages = redis.lrange(cache_key, 0, limit - 1)
    
    if messages:
        return [json.loads(m) for m in messages]
    
    # 2. Cache miss → Query database
    messages = db.query('''
        SELECT * FROM messages
        WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)
        ORDER BY created_at DESC
        LIMIT ?
    ''', user_id, recipient_id, recipient_id, user_id, limit)
    
    # 3. Store in cache (TTL = 1 hour)
    for message in messages:
        redis.lpush(cache_key, json.dumps(message))
    redis.expire(cache_key, 3600)
    
    return messages
```

---

### **2. Presence Service (Online/Offline)**

**Problem**: Checking online status for 1000 friends (slow)

**Solution**: Presence service + Redis

```python
# When user connects
redis.sadd('online_users', user_id)
redis.expire(f'online:{user_id}', 300)  # Heartbeat every 5 min

# When user disconnects
redis.srem('online_users', user_id)

# Check if user online
def is_online(user_id):
    return redis.sismember('online_users', user_id)
```

---

### **3. Sharding**

**Problem**: 1.5 trillion messages → Single database bottleneck

**Solution**: Shard by user_id

```python
def get_shard(user_id):
    return user_id % NUM_SHARDS

# Example:
# User 123 → Shard 3
# User 456 → Shard 6
```

**Conversation between User A and User B**: Store in both shards (denormalized)

---

### **4. Read Receipts**

**Problem**: Sending "read" for every message (high write load)

**Solution**: Batch read receipts

```python
# Client sends read receipt every 5 seconds (batch)
@socketio.on('mark_read')
def handle_mark_read(data):
    message_ids = data['message_ids']  # [123, 124, 125]
    
    db.execute('UPDATE messages SET status="read" WHERE id IN (?)', message_ids)
    
    # Notify sender
    for message_id in message_ids:
        message = db.query('SELECT sender_id FROM messages WHERE id=?', message_id)
        emit('message_read', {'message_ids': message_ids}, room=user_connections.get(message['sender_id']))
```

---

## 🎯 Step 9: Real-World Examples

### **1. WhatsApp**

**Scale**: 2 billion users, 100 billion messages/day

**Stack**: Erlang (chat servers), Mnesia (in-memory database), FreeBSD

**Features**:
- End-to-end encryption (Signal Protocol)
- Media compression (reduce bandwidth)
- Offline message delivery (store & forward)

**Architecture**: Custom built (not Kafka)

---

### **2. Slack**

**Scale**: 10+ million DAU

**Stack**: PHP/Hack (API), Java (chat servers), MySQL, Redis

**Features**:
- Channels (public, private)
- Threads (organize conversations)
- Integrations (bots, webhooks)

**Real-time**: WebSockets + long polling (fallback)

---

### **3. Discord**

**Scale**: 150+ million MAU

**Stack**: Elixir (chat servers), Cassandra (messages), Rust (voice)

**Features**:
- Voice chat (WebRTC)
- Video streaming
- Low latency (<100ms)

**Architecture**: Microservices (chat, voice, video separate)

---

## 🎯 Step 10: Trade-offs

| Decision | Trade-off |
|----------|-----------|
| **WebSocket vs Long Polling** | WebSocket (real-time, complex) vs Long Polling (simple, delay) |
| **Kafka vs Database** | Kafka (scalable, eventual consistency) vs Database (simple, strong consistency) |
| **Sharding vs Replication** | Sharding (horizontal scale) vs Replication (high availability) |
| **Redis cache vs No cache** | Redis (fast, stale data) vs No cache (always fresh, slow) |

---

## 🎓 Interview Tips

**Q: "How do you design a messaging system?"**

A: "I design a real-time messaging system with WebSockets:

**Architecture**:
1. **WebSocket servers**: Maintain persistent connections (10k/server)
2. **Message queue** (Kafka): Decouple message ingestion/delivery
3. **Database** (Cassandra): Store messages (sharded by user_id)
4. **Redis**: Cache recent messages, online status

**Message flow**:
```
User A sends message to User B:
1. User A → WebSocket → Chat Server 1
2. Chat Server 1 → Save to Cassandra
3. Chat Server 1 → Publish to Kafka (partition: User B)
4. Chat Server 2 (User B's server) → Consume from Kafka
5. Chat Server 2 → Push to User B via WebSocket
```

**Key features**:
- **Low latency**: <1 second delivery (WebSocket real-time)
- **Offline support**: Store messages, deliver when online
- **Read receipts**: Batch updates (reduce writes)
- **Online status**: Presence service (Redis heartbeat)

**Scale**: 100M DAU, 58k messages/sec, 10M concurrent connections

Real-world: WhatsApp (100B messages/day), Slack (WebSocket + long polling)"

---

## 📚 Summary

**Architecture**: WebSocket servers + Kafka + Database (sharded) + Redis (cache)

**Real-time**: WebSockets (persistent connections)

**Scale**: 100M DAU, 58k messages/sec, 10M concurrent connections

**Features**: 1-on-1, group chat, read receipts, online status, message history

**Real-world**: WhatsApp (Erlang), Slack (Java chat servers), Discord (Elixir) 🚀

