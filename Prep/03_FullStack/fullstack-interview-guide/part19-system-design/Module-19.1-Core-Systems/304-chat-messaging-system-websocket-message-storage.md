# Chat / Messaging System — WebSocket, Message Storage
> Part 19 — System Design Case Studies · 🔥 High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **WebSocket**: full-duplex TCP connection between client and server that stays open; either side can send data at any time; unlike HTTP: no request-response cycle; established via HTTP Upgrade handshake; stays alive with periodic ping/pong frames to detect dead connections
- **Connection challenge**: each server can only hold open connections for so many concurrent users (memory/file-descriptor limits); horizontal scaling means a user on Server A can't talk to a user on Server B without a shared pub/sub layer — use Redis Pub/Sub or Kafka between servers
- **Message delivery guarantee**: at-least-once is the real-world standard; client acks each message with a `{messageId}`; if no ack within timeout → server retries; client deduplicates by messageId; this handles the sent-but-not-acknowledged crash scenario
- **Message ordering**: total order within a conversation; use Snowflake IDs or `(conversationId, sequence_number)` to define order; append to conversation partition in Kafka; per-partition ordering is guaranteed
- **Storage**: recent messages → Redis Sorted Set keyed by timestamp (fast fan-out for active chats); all messages → Cassandra or DynamoDB keyed by `(conversationId, timeUUID)` — write-heavy, append-only, time-range reads; no relational DB for message table at scale
- **Read receipts**: separate lightweight events (delivered, read) sent back over WebSocket connection; stored separately from message data; don't block message storage on read receipt
- **Online presence**: heartbeat PING every 20 seconds; server marks user online in Redis with 30-second TTL; no heartbeat → key expires → user offline; publish presence changes to subscribers via Redis Pub/Sub
- **Group chat**: fan-out on write — when one user sends a message, copy it (or its reference) to every member's mailbox; OR fan-out on read — each member fetches the group conversation; fan-out on write better for active small groups; fan-out on read for large groups (1000+ members)

---

## 1. One-Line Definition
A chat system enables real-time bidirectional messaging between users over persistent WebSocket connections, with messages stored durably in an append-only database, ordered within conversations, and delivered across distributed servers via a shared pub/sub layer.

---

## 2. The Problem It Solves

A support chat widget on a SaaS product uses AJAX polling — every 2 seconds, the browser asks "any new messages?" This works for 100 users. At 10,000 concurrent users, that's 5,000 HTTP requests per second just to poll for empty responses. 95% of those polls return nothing. The server is CPU-saturated answering empty polls. User experience is also poor — messages feel up to 2 seconds delayed.

WebSocket solves the infrastructure problem: one persistent connection per user, server pushes messages instantly when they arrive — no polling. But now the design problem shifts: messages must be stored reliably, delivered in order, acknowledged, and delivered across multiple server instances that each hold a subset of all WebSocket connections.

---

## 3. How It Works Internally

### The Mental Model
Think of a telephone exchange. Each server is a switchboard handling calls (WebSocket connections) for its subset of users. When User A (connected to Switch 1) calls User B (connected to Switch 2), Switch 1 can't directly reach User B's phone — it sends the call through the exchange's internal network (Redis Pub/Sub) to Switch 2, which delivers it to User B.

### Architecture Breakdown

```
Client A (browser)              Server Cluster              Client B (browser)
┌──────────────────┐   WS   ┌─────────────────┐   WS   ┌──────────────────┐
│                  │◄──────►│  Chat Server 1  │◄──────►│                  │
│  Chat UI         │        │  (holds A's WS) │        │  Chat UI         │
│  (React)         │        └────────┬────────┘        │  (React)         │
│                  │                 │                   │                  │
└──────────────────┘          Redis Pub/Sub              └──────────────────┘
                               ┌────┴──────┐
                          ┌────▼──┐   ┌────▼──┐
                          │ Chat  │   │ Chat  │
                          │ Srv 2 │   │ Srv 3 │
                          │ (B's  │   │       │
                          │  WS)  │   │       │
                          └───────┘   └───────┘
                               │
                    ┌──────────▼──────────────┐
                    │        Kafka            │
                    │   topic: chat.messages  │
                    │   (partitioned by       │
                    │    conversationId)      │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   Message Store Worker  │
                    │   Writes to Cassandra   │
                    │   (conversationId +     │
                    │    timeUUID as key)     │
                    └─────────────────────────┘
                    
Cassandra schema:
  CREATE TABLE messages (
    conversation_id UUID,
    message_id      TIMEUUID,           ← time-ordered UUID; no seq counter needed
    sender_id       UUID,
    content         TEXT,
    content_type    TEXT,               ← 'text', 'image', 'file'
    created_at      TIMESTAMP,
    PRIMARY KEY (conversation_id, message_id)
  ) WITH CLUSTERING ORDER BY (message_id DESC);  ← newest first
```

### Message Flow: Send to Delivery

```
1. User A types message, presses Send
2. Browser sends WebSocket frame to Chat Server 1:
   { type: 'message', conversationId: 'conv-123', content: 'Hello!', clientMsgId: 'abc-uuid' }
   
3. Chat Server 1:
   a. Generates server messageId (Snowflake or TIMEUUID)
   b. Publishes to Redis channel 'conv:conv-123':
      { messageId: 'srv-uuid', conversationId: 'conv-123', senderId: 'userA', content: 'Hello!' }
   c. Publishes to Kafka topic 'chat.messages' (async, for durable storage)
   d. ACKs client A with: { type: 'ack', clientMsgId: 'abc-uuid', serverMsgId: 'srv-uuid' }

4. All servers subscribed to Redis channel 'conv:conv-123' receive the message
   → Chat Server 2 (has User B's connection) pushes to User B's WebSocket

5. Kafka message store worker consumes 'chat.messages' → writes to Cassandra

6. User B receives message, sends read receipt back:
   { type: 'read_receipt', messageId: 'srv-uuid', conversationId: 'conv-123' }

7. Chat Server 2 fan-outs read receipt over Redis back to User A's server
```

---

## 4. The Code

### Wrong Way — Simple WebSocket Without Cross-Server Routing

```java
// ❌ @ServerEndpoint works on a single server; breaks in a cluster

@ServerEndpoint("/chat/{userId}")
@Component
public class NaiveChatEndpoint {
    // ❌ Static map — only holds connections on THIS server
    //    User A on Server 1 can't reach User B on Server 2
    private static final Map<String, Session> sessions = new ConcurrentHashMap<>();
    
    @OnOpen
    public void onOpen(Session session, @PathParam("userId") String userId) {
        sessions.put(userId, session);  // ❌ Only meaningful on this JVM
    }
    
    @OnMessage
    public void onMessage(String payload, @PathParam("userId") String senderId) throws Exception {
        MessageDto dto = objectMapper.readValue(payload, MessageDto.class);
        
        // ❌ Direct lookup — only works if recipient is on the same server
        Session recipientSession = sessions.get(dto.getRecipientId());
        if (recipientSession != null) {
            recipientSession.getBasicRemote().sendText(payload);
        }
        // ❌ else: message silently dropped — no cross-server delivery
        
        // ❌ No persistence — message lost if server restarts
        // ❌ No ordering guarantee — race between concurrent sends
        // ❌ No delivery acknowledgement
    }
}
```

```java
// ✅ Spring WebSocket with Redis Pub/Sub for cluster-wide fan-out

// WebSocket configuration
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    // ✅ STOMP protocol over WebSocket — structured message routing
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // ✅ In production: external Redis/RabbitMQ broker for cluster-wide routing
        registry.enableStompBrokerRelay("/topic", "/queue")
                .setRelayHost("redis-host")
                .setRelayPort(61613);
        registry.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/chat")
                .setAllowedOriginPatterns("https://*.yourdomain.com")  // ✅ restrict origins
                .withSockJS();    // fallback for environments that block WebSocket
    }
}

// ✅ Chat controller handling STOMP messages
@Controller
public class ChatController {
    private final SimpMessagingTemplate messagingTemplate;
    private final KafkaTemplate<String, ChatMessage> kafkaTemplate;
    private final ConversationService conversationService;
    
    // ✅ User sends message to /app/chat.send
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload SendMessageRequest req, 
                            Principal user,
                            SimpMessageHeaderAccessor headerAccessor) {
        
        // ✅ Authorisation: verify sender is a member of this conversation
        if (!conversationService.isMember(req.getConversationId(), user.getName())) {
            throw new AccessDeniedException("Not a member of conversation " + req.getConversationId());
        }
        
        ChatMessage message = ChatMessage.builder()
            .id(Snowflake.nextId())               // ✅ Globally unique, time-ordered ID
            .conversationId(req.getConversationId())
            .senderId(user.getName())
            .content(sanitize(req.getContent()))  // ✅ Sanitize to prevent XSS injection
            .contentType(req.getContentType())
            .clientMsgId(req.getClientMsgId())    // ✅ Client idempotency key
            .sentAt(Instant.now())
            .build();
        
        // ✅ Publish to STOMP topic — Redis relay fans out to all servers subscribed
        messagingTemplate.convertAndSend(
            "/topic/conversation." + req.getConversationId(), 
            message
        );
        
        // ✅ ACK back to sender with server-assigned ID
        messagingTemplate.convertAndSendToUser(
            user.getName(),
            "/queue/message-ack",
            new MessageAck(req.getClientMsgId(), message.getId())
        );
        
        // ✅ Async Kafka publish for durable storage — separate from delivery path
        kafkaTemplate.send("chat.messages", req.getConversationId(), message);
    }
    
    private String sanitize(String content) {
        // ✅ Strip HTML/script tags — prevent XSS in rendered chat
        return Jsoup.clean(content, Safelist.none());
    }
}

// ✅ Kafka consumer: persists messages to Cassandra
@KafkaListener(topics = "chat.messages", groupId = "message-store",
               concurrency = "10")   // ✅ 10 threads — match partition count
@Service
public class MessageStoreConsumer {
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    
    @KafkaHandler
    public void store(ChatMessage message) {
        // ✅ Idempotent write — Cassandra TIMEUUID primary key prevents duplicates
        messageRepository.save(mapToEntity(message));
        
        // ✅ Update conversation's last_message snapshot for inbox display
        conversationRepository.updateLastMessage(
            message.getConversationId(),
            message.getId(),
            message.getSenderId(),
            message.getContent().substring(0, Math.min(100, message.getContent().length())),
            message.getSentAt()
        );
    }
}

// ✅ Online presence service
@Service
public class PresenceService {
    private final StringRedisTemplate redis;
    private final SimpMessagingTemplate messagingTemplate;
    
    private static final int ONLINE_TTL_SECONDS = 30;
    
    // ✅ Called when user connects via WebSocket
    public void userConnected(String userId, String conversationId) {
        redis.opsForValue().set("presence:" + userId, "online", Duration.ofSeconds(ONLINE_TTL_SECONDS));
        broadcastPresence(userId, conversationId, "ONLINE");
    }
    
    // ✅ Called every 20 seconds from client heartbeat
    public void heartbeat(String userId) {
        redis.expire("presence:" + userId, Duration.ofSeconds(ONLINE_TTL_SECONDS));
    }
    
    // ✅ Called when WebSocket session closes
    public void userDisconnected(String userId, String conversationId) {
        redis.delete("presence:" + userId);
        broadcastPresence(userId, conversationId, "OFFLINE");
    }
    
    public boolean isOnline(String userId) {
        return redis.hasKey("presence:" + userId);
    }
    
    private void broadcastPresence(String userId, String conversationId, String status) {
        messagingTemplate.convertAndSend(
            "/topic/presence." + conversationId,
            new PresenceEvent(userId, status, Instant.now())
        );
    }
}
```

```typescript
// ✅ Frontend React: WebSocket chat client with reconnection

import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

function useChat(conversationId: string, userId: string) {
    const [messages, setMessages]   = useState<ChatMessage[]>([]);
    const [connected, setConnected] = useState(false);
    const stompClientRef            = useRef<Client | null>(null);
    const pendingAcks               = useRef<Map<string, ChatMessage>>(new Map());

    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS('/ws/chat'),
            reconnectDelay: 5000,    // ✅ Auto-reconnect after 5s
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
        });
        
        client.onConnect = () => {
            setConnected(true);
            
            // ✅ Subscribe to this conversation's messages
            client.subscribe(`/topic/conversation.${conversationId}`, (frame) => {
                const message = JSON.parse(frame.body) as ChatMessage;
                setMessages(prev => {
                    // ✅ Deduplicate: skip if already in list (retry scenario)
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message].sort((a, b) => a.id.localeCompare(b.id));
                });
            });
            
            // ✅ Subscribe to message ACKs
            client.subscribe(`/user/queue/message-ack`, (frame) => {
                const ack = JSON.parse(frame.body) as MessageAck;
                pendingAcks.current.delete(ack.clientMsgId);  // ✅ Message confirmed by server
            });
        };
        
        client.onDisconnect = () => setConnected(false);
        
        // ✅ Send heartbeat for presence tracking
        const heartbeatInterval = setInterval(() => {
            if (client.connected) {
                client.publish({ destination: '/app/presence.heartbeat', body: JSON.stringify({ userId }) });
            }
        }, 20_000);
        
        client.activate();
        stompClientRef.current = client;
        
        return () => {
            clearInterval(heartbeatInterval);
            client.deactivate();
        };
    }, [conversationId, userId]);
    
    const sendMessage = useCallback((content: string) => {
        if (!stompClientRef.current?.connected) return;
        
        const clientMsgId = crypto.randomUUID();  // ✅ Client idempotency key
        
        // ✅ Optimistic update: show message immediately, strike-through if no ACK
        const optimisticMsg: ChatMessage = {
            id: clientMsgId,   // temporary; replaced by server ID on ACK
            senderId: userId,
            content,
            sentAt: new Date().toISOString(),
            status: 'sending'
        };
        setMessages(prev => [...prev, optimisticMsg]);
        pendingAcks.current.set(clientMsgId, optimisticMsg);
        
        stompClientRef.current.publish({
            destination: '/app/chat.send',
            body: JSON.stringify({ conversationId, content, clientMsgId }),
        });
        
        // ✅ If no ACK in 5s, mark as failed — let user retry
        setTimeout(() => {
            if (pendingAcks.current.has(clientMsgId)) {
                setMessages(prev => prev.map(m =>
                    m.id === clientMsgId ? { ...m, status: 'failed' } : m
                ));
            }
        }, 5000);
        
    }, [conversationId, userId]);
    
    return { messages, connected, sendMessage };
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why do you need Redis Pub/Sub when you already have Kafka?"

**Hruday's answer:**
> They serve different roles. Kafka is for durable, reliable, replayable storage of messages — it guarantees every message is written to disk and can be replayed from any offset. It's perfect for async processing, analytics, and recovery.
>
> Redis Pub/Sub is for low-latency real-time delivery. A WebSocket push needs to happen in < 50ms. Kafka's consumer group model has polling overhead — it's optimised for throughput, not minimum latency. Redis Pub/Sub is fire-and-forget pub/sub; it delivers to all current subscribers in a few milliseconds.
>
> The pattern: messages go on both paths simultaneously. Redis Pub/Sub for instant WebSocket delivery (best-effort, fast). Kafka for guaranteed durable storage (slightly slower, durable). If a user is offline, the Redis pub fires but nobody is subscribed — no delivery. The Kafka path stores the message in Cassandra. When the user reconnects, the client sends its last received `messageId` and fetches missed messages from Cassandra. You need both.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you handle a message that was sent but the connection dropped before the client received the ACK?"

**Hruday's answer:**
> This is the at-least-once delivery problem. The client generates a `clientMsgId` UUID before sending. If the connection drops before the ACK arrives, the client doesn't know if the server received the message or not.
>
> On reconnect, the client sends the `clientMsgId` in a sync request: "here are my pending unacknowledged messages." The server checks if a message with this `clientMsgId` already exists in the conversation — if yes, it returns the server `messageId` without creating a duplicate. If not, it processes the message as new.
>
> On the server, the `clientMsgId` is stored on the message record. The Cassandra schema has a secondary index on `(conversation_id, sender_id, client_msg_id)` — or more efficiently a separate lightweight table — for dedup lookups. This covers the crash-between-write-and-ack scenario completely. The user's message either went through (duplicate safely rejected) or didn't (re-delivered on reconnect). The UI shows a single message with no duplicates.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Why Cassandra for message storage? Why not PostgreSQL?"

**Hruday's answer:**
> The access pattern for chat messages is the deciding factor. You almost always query: "give me messages in conversation X, newest first, page by page." This is a partition-key lookup (conversation_id) with clustering column ordering (message_id / time). Cassandra is purpose-built for this exact pattern — partition key identifies the node, clustering key provides sorted range scans. Writes are O(1) appends.
>
> PostgreSQL would work at small scale. At scale, the problem is the messages table grows to billions of rows. Adding time-based partitioning helps but adds operational complexity. B-tree indexes on a table with billions of rows are slow to maintain. Cassandra's LSM tree architecture handles write-heavy workloads far better.
>
> The other consideration: Cassandra tunable consistency. For message reads, I'd accept eventual consistency (QUORUM reads). New messages appear within 100ms across replicas — acceptable for chat. For strong consistency guarantees (financial audit log), PostgreSQL is better. Chat isn't a financial system.
>
> One thing Cassandra doesn't support well: complex queries across conversations — "search all messages containing 'invoice' for this user." That goes to Elasticsearch (async index built from the Kafka stream), not Cassandra.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design WhatsApp-style end-to-end encrypted messaging."

**Hruday's answer:**
> E2E encryption means the server never sees plaintext. Only sender and recipient's devices hold the keys.
>
> Key exchange: use the Signal protocol — specifically the X3DH (Extended Triple Diffie-Hellman) key agreement. Each device registers a bundle of public keys on the server (identity key, signed prekey, one-time prekeys). Sender fetches recipient's key bundle from the server, performs the X3DH calculation locally, derives a shared symmetric key that exists only on the two devices. Server stores only public keys, never the shared secret.
>
> Message encryption: AES-256-GCM using the derived symmetric key. Each message has a unique nonce. Ciphertext is what gets stored in Cassandra — the server stores opaque blobs, no plaintext.
>
> Multi-device support: each device has its own key bundle. Sender encrypts the message once per recipient device using that device's shared key. Server routes each ciphertext to the appropriate device.
>
> Backup: WhatsApp uses an optional encrypted backup with a user-held backup key. Server stores the encrypted backup — can't read it.
>
> From a system design perspective, the chat server architecture is largely the same. The difference: the message body is opaque. Read receipts, presence indicators, and message metadata are unencrypted (the server needs to see who is online, when messages are delivered). This metadata is what governments and researchers refer to when they say "metadata reveals as much as content" — something to acknowledge if the interviewer asks about privacy trade-offs.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| No cross-server handling | "I'd use a HashMap on the server to track connections" | A single HashMap breaks the instant you have two servers — and any production system has multiple servers; the mechanism for cross-server delivery is a shared pub/sub layer; Redis Pub/Sub works for moderate scale (< 1M concurrent connections); for Slack/WhatsApp scale, dedicated message routing infrastructure like a presence mesh; every chat system design that misses cross-server routing is incomplete |
| Relational DB for messages | "I'd store messages in PostgreSQL with a messages table indexed by conversation_id" | PostgreSQL works at small scale but becomes a bottleneck at hundreds of millions of messages; the access pattern (append-only, partition-key range scan) matches Cassandra or DynamoDB far better; also brings up sharding complexity in PostgreSQL that Cassandra handles natively via consistent hashing; showing awareness of this trade-off signals production experience |
| Ignoring message ordering in distributed systems | "Messages are ordered by created_at timestamp" | Timestamps from different servers can be skewed by NTP drift (milliseconds); two messages can get the same millisecond timestamp; use Snowflake IDs (Twitter's) or ULID — both are time-ordered AND unique, generated without coordination; Snowflake = 64-bit: 41-bit timestamp ms + 10-bit machine ID + 12-bit sequence; guarantees per-machine monotonic ordering with global approximate time ordering; this is what WhatsApp, Telegram, Discord use |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we built a real-time collaboration feature for a project management tool — team members could see each other's cursor position and leave inline comments. It used WebSocket, and in early development we ran fine on a single local server. When we deployed to a 3-instance cluster behind a load balancer, comments from one user weren't reaching others — the WebSocket connections were sticky to their server and there was no cross-server routing.
>
> We added Redis Pub/Sub. Each server subscribed to channels for each active project. When any server received a comment, it published to Redis — all three servers received it and forwarded to their connected clients. The fix took one afternoon. We also added reconnection logic on the frontend using STOMP's built-in reconnect delay, so users who briefly lost connectivity would re-join the room without a page refresh."

---

## 8. Scale Evolution

**1,000 users →** Single WebSocket server. In-memory session registry. Store messages in PostgreSQL — simple and reliable. STOMP over SockJS for browser compatibility. No Redis needed at this scale.

**100,000 users →** Multi-server cluster. Redis Pub/Sub for cross-server delivery. Move message storage to Cassandra or DynamoDB for write scalability. Redis for presence tracking. STOMP broker relay pointing at Redis or RabbitMQ. Load balancer with sticky sessions (or better: use connection tokens so any server can re-establish session).

**10 million users →** Redis Cluster for pub/sub. Cassandra multi-datacenter for message storage. Kafka as the backbone message bus — WebSocket delivery and persistence decoupled completely. Separate microservices: presence service, message service, conversation service. WebSocket servers scale independently from message storer. Push notification fallback for users who disconnect — pull from Cassandra on reconnect. CDN edge nodes for media (image/video) — don't go through WebSocket for binary data.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Customer support chat in payment disputes; internal team communication tool; real-time transaction notifications that look like chat messages | WebSocket fan-out; presence; message durability |
| Swiggy / Meesho | Delivery partner ↔ customer chat for order coordination; seller ↔ buyer messaging for RTO disputes; real-time location overlay in chat | Group chat (order participants); E2E encryption for sensitive comms |
| Adobe / Microsoft | Teams messaging at Microsoft-scale; Adobe Connect real-time collaboration; signal protocol and E2E encryption | Scale design; E2E encryption; federation |
| SAP Labs | Real-time collaboration for project management — the cursor + comments story; internal support chat widget for SAP cloud product | Real incident narrative; cross-server routing fix |

---

## 10. Related Topics — What to Study Next

- **Topic 303 — Notification System** — once a chat message arrives on the server, the offline path is a push notification; the notification system and chat system share infrastructure for the offline fan-out; message storage and notification delivery are complementary
- **Topic 307 — Real-time Dashboard** — both chat and dashboards use WebSocket/SSE for server push; understanding when to use STOMP vs raw WebSocket vs SSE completes the real-time design picture
- **Topic 99 — Kafka Fundamentals** — chat systems use Kafka for durable message storage and fan-out to workers (analytics, content moderation, search indexing); understanding partition ordering is key for message sequence guarantees
- **Topic 101 — Redis Data Structures** — presence tracking (Redis string with TTL), recent message cache (Redis Sorted Set), pub/sub routing — Redis is used in 3 different roles in a chat system

---

*Part 19 · Chat / Messaging System — WebSocket, Message Storage · Full Stack Interview Guide · Hruday D · 2026*
