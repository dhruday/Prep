# Problem 03 — Design WhatsApp / Facebook Messenger

> Frequency: ⭐⭐⭐⭐⭐ | Asked at: Meta, Google, Microsoft, Amazon | Difficulty: 🔴 Senior

---

## PART 1 — Problem Statement

### Functional Requirements
- One-on-one messaging
- Group messaging (up to 1,000 members)
- Message delivery receipts (sent ✓, delivered ✓✓, read ✓✓)
- Online presence (online/offline/last seen)
- Media sharing (images, video, documents)
- Push notifications for offline users
- End-to-end encryption (bonus)

### Non-Functional Requirements
- **Scale:** 2B users, 500M DAU
- **Throughput:** 100B messages/day
- **Latency:** Message delivery < 100ms (p99, same region)
- **Availability:** 99.99%
- **Ordering:** Messages in correct order within conversation
- **Durability:** No message loss

---

## PART 2 — Clarification Questions

```
□ Max group size?
□ Message types: text only or media?
□ Message retention period?
□ Delivery guarantees? (at-least-once acceptable?)
□ Read receipts required?
□ Online presence tracking?
□ End-to-end encryption scope?
□ Message search needed?
□ Multi-device support (web + mobile)?
□ Voice/video calls in scope?
```

---

## PART 3 — Capacity Estimation

```
=== TRAFFIC ===
DAU:                    500M users
Messages per user/day:  40 messages avg
Total messages/day:     500M × 40 = 20 billion/day
Message throughput:     20B / 86,400 ≈ 231,000 msg/sec
Peak throughput:        231K × 3 = ~700K msg/sec

=== STORAGE ===
Text message:           100 bytes avg
Media (photo):          ~300 KB compressed
Media (video, 1min):    ~10 MB compressed

Message mix:
  90% text:   20B × 90% × 100B = 1.8 TB/day
  9% photo:   20B × 9% × 300KB = 540 TB/day
  1% video:   20B × 1% × 10MB  = 2,000 TB/day = 2 PB/day

Total storage/day:      ~2.5 PB/day
With replication (3x):  ~7.5 PB/day
Per year:               ~900 PB ≈ 1 EB

Note: WhatsApp stores media on device; server stores 30 days
With 30-day retention: ~75 PB total (much more feasible)

=== CONNECTIONS ===
500M DAU, avg session 30 min
Concurrent connections: 500M × 30% online = 150M simultaneous connections
WebSocket servers needed: 150M / 10K per server = 15,000 servers
```

---

## PART 4 — High-Level Architecture

```
                    ┌──────────────────────────────────────────┐
                    │           Mobile / Web Client             │
                    └────────────────┬──────────────────────────┘
                                     │ WebSocket (persistent)
                                     │ HTTPS (API calls)
                                     ▼
                    ┌──────────────────────────────────────────┐
                    │         Load Balancer (L7)                │
                    │   (WebSocket-aware, sticky sessions)      │
                    └──────┬──────────────────┬────────────────┘
                           │                  │
              ┌────────────▼───┐   ┌──────────▼──────────────┐
              │  Chat Server   │   │  Chat Server             │  × 15,000
              │  (WebSocket)   │   │  (WebSocket)             │
              │  User A: conn  │   │  User B: conn            │
              └────────┬───────┘   └──────────┬──────────────┘
                       │                       │
                       └──────────┬────────────┘
                                  │
          ┌───────────────────────▼──────────────────────────┐
          │                   Message Bus                      │
          │                (Apache Kafka)                      │
          │   Topic: messages    Topic: presence               │
          └────┬──────────────────────┬───────────────────────┘
               │                      │
    ┌──────────▼──────┐    ┌──────────▼──────────────────────┐
    │  Message Store  │    │  Presence Service                │
    │  Service        │    │  (Redis pub/sub)                 │
    └────────┬────────┘    └──────────────────────────────────┘
             │
    ┌────────▼────────────────────────────────────┐
    │              Storage Layer                   │
    │  Messages: Cassandra (wide-column)           │
    │  Media:    S3 / Object Storage               │
    │  Cache:    Redis (recent messages, sessions) │
    │  Users:    MySQL (profiles, relationships)   │
    └──────────────────────────────────────────────┘
             │
    ┌────────▼────────────────┐
    │  Notification Service   │
    │  (APNs, FCM, Web Push)  │
    └─────────────────────────┘
```

---

## PART 5 — Data Model

### Messages Table (Cassandra)
```sql
-- Partition by conversation, cluster by time
CREATE TABLE messages (
    conversation_id   UUID,
    message_id        TIMEUUID,        -- TimeUUID for time-ordering
    sender_id         BIGINT,
    message_type      TEXT,            -- 'text', 'image', 'video', 'doc'
    content           TEXT,            -- text content or media URL
    created_at        TIMESTAMP,
    
    PRIMARY KEY (conversation_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC)
  AND default_time_to_live = 2592000;  -- 30 day TTL
```

**Why Cassandra here?**
- Partition by conversation → all messages for a chat on one node
- Time-ordered clustering → efficient range reads for message history
- Write-heavy (100B messages/day) → Cassandra excels
- TTL support → auto-expire old messages

### Conversations Table
```sql
CREATE TABLE conversations (
    conversation_id     UUID PRIMARY KEY,
    type                TEXT,       -- 'direct', 'group'
    created_at          TIMESTAMP,
    last_message_id     TIMEUUID,
    last_message_text   TEXT,       -- denormalized for preview
    last_message_at     TIMESTAMP,
    participant_count   INT
);
```

### Participants Table
```sql
CREATE TABLE participants (
    user_id             BIGINT,
    conversation_id     UUID,
    joined_at           TIMESTAMP,
    last_read_message   TIMEUUID,
    
    PRIMARY KEY (user_id, conversation_id)
);

-- Reverse lookup: all participants in a conversation
CREATE TABLE conversation_members (
    conversation_id     UUID,
    user_id             BIGINT,
    
    PRIMARY KEY (conversation_id, user_id)
);
```

### Presence (Redis)
```
Key: "presence:{user_id}"
Value: {"status": "online", "last_seen": "2024-01-15T10:30:00Z"}
TTL: 30 seconds (refreshed every 10 seconds by client heartbeat)

On TTL expiry → user considered offline
Notify interested parties via pub/sub
```

---

## PART 6 — API Design

### WebSocket Protocol (Client ↔ Server)

```json
// Client → Server: Send message
{
  "type": "send_message",
  "conversation_id": "conv-abc123",
  "message_id": "msg-client-generated-uuid",  // for dedup
  "content": "Hello!",
  "message_type": "text"
}

// Server → Client: Message delivered to server
{
  "type": "message_ack",
  "message_id": "msg-client-generated-uuid",
  "status": "sent",
  "server_message_id": "timeuuid-123"
}

// Server → Client: New incoming message
{
  "type": "new_message",
  "conversation_id": "conv-abc123",
  "message_id": "timeuuid-123",
  "sender_id": "456",
  "content": "Hi there!",
  "sent_at": "2024-01-15T10:30:00Z"
}

// Client → Server: Read receipt
{
  "type": "read_receipt",
  "conversation_id": "conv-abc123",
  "last_read_message_id": "timeuuid-123"
}

// Server → Client: Delivery receipt
{
  "type": "delivery_receipt",
  "message_id": "timeuuid-123",
  "status": "delivered",  // "delivered", "read"
  "user_id": "456",
  "timestamp": "2024-01-15T10:30:01Z"
}
```

### REST API

```http
# Get conversation history
GET /api/v1/conversations/{conversation_id}/messages
  ?before={message_id}&limit=50

# Create group
POST /api/v1/conversations
{
  "type": "group",
  "name": "Team Chat",
  "participant_ids": [123, 456, 789]
}

# Upload media
POST /api/v1/media/upload
  → returns pre-signed S3 URL
  → client uploads directly to S3
  → sends message with S3 URL

# Search messages (Elasticsearch)
GET /api/v1/conversations/{id}/search?q=hello&limit=20
```

---

## PART 7 — Deep Dive: Message Flow

### Sending a Message (User A → User B)

```
Step 1: Client A sends message via WebSocket to Chat Server A
  {type: "send_message", to: user_b, content: "Hello"}

Step 2: Chat Server A:
  a. Validate message
  b. Generate message_id (Snowflake ID)
  c. Persist to Cassandra (async, with Kafka)
  d. Look up which Chat Server User B is connected to
     → Router Service (Redis): "user_b_server" → Server B IP
  e. Send to Chat Server B OR publish to Kafka

Step 3: If User B is ONLINE (connected to Server B):
  Chat Server B delivers message via WebSocket to User B

Step 4: If User B is OFFLINE:
  Notification Service sends push notification (APNs/FCM)
  Message stored in Cassandra for later retrieval

Step 5: Delivery receipt:
  User B's client sends {type: "delivered", message_id: X}
  Chat Server B → Kafka → Chat Server A → WebSocket to User A

Step 6: Read receipt:
  User B opens conversation
  Client sends {type: "read", last_read: message_id}
  → propagated back to sender
```

### Connection Routing (How does Server A know User B's server?)

```
Option 1: Centralized Router (Redis Hash)
  "user_connection:{user_id}" → "server-IP:port"
  Set on connect, delete on disconnect
  TTL: 30 seconds (heartbeat refreshes)

Option 2: Consistent Hashing
  hash(user_id) → server
  No lookup needed; server calculated from user_id
  Problem: Server failures break hashing

Option 3: Message Bus (Kafka) — Recommended
  All chat servers subscribe to Kafka
  Message published to topic "messages:{user_id}"
  Target server consumes and delivers
  Decoupled; handles server failures gracefully
```

---

## PART 8 — Scalability

### 10K Users
```
Single server with WebSocket + SQLite/PostgreSQL
Simple in-process pub/sub
No separate components needed
```

### 1M Users
```
Multiple chat servers behind load balancer
Redis for session routing
MySQL/PostgreSQL for messages
Sticky sessions for WebSocket
Separate push notification service
```

### 10M Users
```
Kafka for message routing between chat servers
Cassandra for messages (write-heavy)
Redis Cluster for presence
Separate media service (S3)
Multiple data centers
```

### 100M Users
```
Thousands of chat servers
Geo-distributed: users connect to nearest region
Cross-region message routing via Kafka
Dedicated teams per service
Observability stack (tracing, metrics)
```

### 500M DAU (WhatsApp Scale)
```
Custom protocol (XMPP initially, moved to custom binary)
Erlang/Elixir for WebSocket servers (millions of connections/server)
Worldwide CDN for media delivery
Custom Kafka deployment (petabytes/day)
Dedicated infrastructure team
```

---

## PART 9 — Group Messaging

```
Small groups (< 100 members):
  Fan-out at write time (send to all members' inboxes)
  
  On message:
  For each member:
    → find their connection server
    → deliver or queue for offline notification

Large groups (100-1000 members):
  Hybrid fan-out:
    → Push to online members immediately
    → Batch notification for offline members
    → Members pull history when they connect
  
  Why not push to all 1000?
    1000 DB writes per message × 100K groups × 10 msg/min
    = massive write amplification

  Alternative: Pull model for large groups
    Don't fan-out; group has a shared message log
    Members pull from log on connection
    Bookmark: "last_read_message_id" per member
```

---

## PART 10 — End-to-End Encryption (E2EE)

```
Signal Protocol (used by WhatsApp, Signal, Facebook Messenger):

Key generation:
  Each device generates key pairs
  Public keys shared with server (key directory)
  Private keys NEVER leave device

Message encryption:
  Sender retrieves recipient's public key from server
  Double Ratchet Algorithm:
    - New encryption key for every message
    - Forward secrecy: past messages can't be decrypted
    - Break-in recovery: future messages secure after compromise

Server sees:
  Encrypted blob (cannot read content)
  Metadata: who, when, size (NOT content)
  
Key exchange diagram:
  Alice → [Server] "What's Bob's public key?"
  Server → Alice: Bob's public key
  Alice encrypts message with Bob's public key
  Alice → [Server] → Bob: encrypted blob
  Bob decrypts with his private key
```

---

## PART 11 — Message Ordering

```
Problem: 
  Message A sent at T=1 from device (slow network)
  Message B sent at T=2 from device (fast network)
  Server receives B before A
  → Display order wrong

Solutions:

1. Logical Timestamps (Lamport Clocks):
   Each message has client-side sequence number
   Sort by (user_id, sequence_number)

2. Vector Clocks:
   Track causality across devices
   Detect concurrent sends

3. Server-Side Ordering (Recommended):
   Server assigns sequence number to each message in conversation
   Monotonically increasing per conversation
   Client re-orders if needed based on server sequence

Implementation:
  Cassandra TimeUUID as message_id
  TimeUUID = timestamp + random bits → total order
  Per conversation: last_seq tracked in Redis
```

---

## PART 14 — Reliability

```
Message persistence before delivery:
  1. Write to Kafka (durable, replicated)
  2. Consumer persists to Cassandra
  3. Then delivers to recipient
  
If server crashes:
  Kafka retains message until consumer acknowledges
  New consumer pod picks up unprocessed messages

At-least-once delivery:
  Message may be delivered twice (network issues)
  Client deduplicates by message_id

Offline message delivery:
  Stored in Cassandra with user's undelivered messages
  On reconnect: server checks for pending messages
  Delivery window: 30 days (WhatsApp's policy)

Presence reliability:
  Client sends heartbeat every 10 seconds
  If no heartbeat for 30 seconds → mark offline
  Reconnect → mark online, sync missed messages
```

---

## PART 20 — Interview Summary

### 5-Minute Answer
> "WhatsApp uses persistent WebSocket connections — each chat server maintains millions of open connections. When Alice sends a message to Bob, her client sends it to her chat server via WebSocket. The server persists it to Cassandra, publishes to Kafka, and the message is consumed by Bob's chat server and delivered via his WebSocket. If Bob is offline, the notification service sends a push notification. Presence is managed via Redis with heartbeat TTLs."

### 15-Minute Answer
Add:
> "For routing: when a user connects, their server_id is stored in Redis with a 30-second TTL. When routing a message, look up Bob's server in Redis and forward directly (or via Kafka for decoupling). For groups: small groups (<100) use fan-out-on-write; large groups use pull model on connect to avoid write amplification. Cassandra data model: partition by conversation_id, cluster by TimeUUID — gives you ordered message history per conversation. For E2EE: Signal Protocol with Double Ratchet — server only sees encrypted blobs."

### 45-Minute Deep Dive
Add:
> "At WhatsApp scale (2B users, Erlang backend): Each Erlang process handles one user connection. Erlang's actor model and lightweight processes handle 2M connections per server. Cross-region: messages routed through Kafka clusters per region, with cross-region bridges. Media: uploaded to S3 directly from client via pre-signed URLs — server never handles media bytes. Message ordering: server assigns sequence numbers per conversation, clients re-order if out-of-sequence delivery. Backup: messages encrypted and backed up to iCloud/Google Drive using separate backup key (not the E2EE key). Analytics: metadata (not content) flows to ClickHouse for abuse detection."

---

*Next: `04_youtube_netflix.md`*
