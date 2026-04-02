# WebSockets — Real-Time Bidirectional Communication
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **WebSocket** is a full-duplex (both sides can send at any time), persistent TCP connection between client and server. After the initial HTTP upgrade handshake, it stays open — no new HTTP requests needed for each message. Both client AND server can push data anytime.
- **The problem it solves**: HTTP is request-response — the client asks, the server answers, connection is done. For real-time data (chat messages, live scores, stock prices, collaborative editing) you'd have to poll every second. Polling is wasteful and slow. WebSocket eliminates polling — server pushes when data changes.
- **Handshake**: the client sends an HTTP/1.1 Upgrade request with `Connection: Upgrade` and `Upgrade: websocket`. Server responds with HTTP 101 Switching Protocols. From that point, the TCP connection is a WebSocket connection — no more HTTP protocol, raw framed messages in both directions.
- **Message types**: text frames (JSON strings) and binary frames (ArrayBuffer, Blob). In practice: JSON text is most common for application messages.
- **WebSocket vs SSE**: WebSocket is bidirectional (client and server both send). Server-Sent Events (Topic 133) is unidirectional (server pushes only). Use WebSocket when clients also need to send data (chat, collaborative editing, gaming). Use SSE when server pushes only (live score feed, stock ticker, notifications).
- **Scaling bottleneck**: WebSocket connections are stateful — they're tied to a specific server instance. Load balancing WebSocket requires sticky sessions OR a shared message broker (Redis Pub/Sub) so any server can broadcast to any client regardless of which instance they're connected to.
- **Hruday's real experience**: built real-time industrial dashboards at Bosch using Angular + WebSocket — sensor telemetry data pushed from OPC-UA industrial servers to browser-based monitoring dashboards.

---

## 1. One-Line Definition
WebSocket is a persistent, full-duplex communication channel over a single TCP connection — the client upgrades from HTTP then both ends can push messages at any time without polling — enabling true real-time experiences for chat, live dashboards, collaborative tools, and gaming.

---

## 2. The Problem It Solves

### HTTP Polling — Why It Doesn't Work for Real-Time

```
SCENARIO: Build a live cricket score widget on a news website.
Score updates every 15-30 seconds during play. Millions of users watching simultaneously.

Approach 1 — Short Polling (naive):
  Browser polls every second:
  GET /api/score/match/42 → { "score": "74-3" }   (no change)
  GET /api/score/match/42 → { "score": "74-3" }   (no change)
  GET /api/score/match/42 → { "score": "74-3" }   (no change)
  GET /api/score/match/42 → { "score": "75-3" }   (change! boundary delivery)

  For 1 million users:
    1 request/second × 1M users = 1M requests/second
    Average response: 200 bytes × 1M = 200MB/second of bandwidth
    99% of responses are "no change" — pure waste
    
  HTTP overhead per request:
    New TCP connection (or keep-alive reuse) + HTTP headers (200+ bytes)
    Those headers are LARGER than the actual JSON payload

Approach 2 — Long Polling:
  Browser sends request. Server holds it open until score changes or 30s timeout.
  Better — only fires when data changes. But:
  - Server holds 1M open HTTP connections — high memory and connection limit cost
  - Each "fire" still creates a new HTTP request cycle
  - Complex server-side management of waiting connections
  
WebSocket approach:
  Browser opens ONE WebSocket connection at page load.
  Server pushes update ONLY when score changes.
  
  For 1 million users:
    1M persistent TCP connections (but idle connections use ~4KB each = ~4GB RAM for connections only)
    Data sent: 0 bytes when no change. Score update bytes × subscribers when change occurs.
    No request overhead — pure data frames.
    
  1M idle WebSocket connections vs 1M requests/second polling:
    WebSocket: constant low memory, bandwidth only when data changes
    Polling: constant high CPU + bandwidth even when nothing changes

For a score update every 30 seconds: WebSocket uses 1/30 the bandwidth of 1-second polling.
For 1M users: that's a massive infrastructure cost difference.
```

---

## 3. How It Works Internally

### The WebSocket Upgrade Handshake

```
STEP 1 — Client sends HTTP upgrade request:
  GET /ws/score-feed HTTP/1.1
  Host: scores.example.com
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==   ← random 16-byte base64 value
  Sec-WebSocket-Version: 13

STEP 2 — Server responds HTTP 101:
  HTTP/1.1 101 Switching Protocols
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=   ← derived from client's key
  
  (The Sec-WebSocket-Accept value is SHA-1 of client key + magic string,
   base64-encoded. Clients verify this — prevents HTTP caches replying as WebSocket)

STEP 3 — TCP connection is now a WebSocket:
  Same TCP connection. No more HTTP protocol.
  Both sides can now send "frames" at any time.
  
  Server → Client: {"type":"SCORE_UPDATE","score":"75-3","overs":"15.4"}
  Client → Server: {"type":"SUBSCRIBE","matchId":42}
  Server → Client: {"type":"SCORE_UPDATE","score":"81-3","overs":"17.1"}
  Client → Server: {"type":"PING"}   ← keepalive
  Server → Client: {"type":"PONG"}

WebSocket Frame structure (simplified):
  [1 bit: FIN (last fragment)][3 bits: reserved][4 bits: opcode]
  [1 bit: MASK][7 bits: payload length]
  [0 or 4 bytes: masking key (mandatory for client→server)]
  [payload data]
  
  Opcodes: 0x1 = Text frame, 0x2 = Binary frame,
           0x8 = Connection close, 0x9 = Ping, 0xA = Pong
  
  Client→Server frames MUST be masked (prevents cache poisoning attacks)
  Server→Client frames must NOT be masked
```

### WebSocket Lifecycle

```
OPEN
  │
  ├── Messages flow in both directions (any time, any order)
  │   Client → Server:  subscribe, user actions, commands
  │   Server → Client:  data updates, broadcasts, notifications
  │
  ├── Ping/Pong for keepalive
  │   Server sends Ping frame every 30s → client responds with Pong
  │   If no Pong received in X seconds → assume connection dead, close
  │
  ├── Reconnection (not built into spec — must implement in client):
  │   On connection close: wait N seconds, attempt reconnect
  │   Exponential backoff: 1s, 2s, 4s, 8s, max 30s
  │   Resume state after reconnect (which messages were missed?)
  │
CLOSE
  Both sides can initiate close:
  Sender: sends Close frame with status code and optional reason
  Receiver: echoes the Close frame
  TCP connection is then closed
  
  Close codes:
  1000 = Normal closure
  1001 = Going away (server shutdown / browser tab closed)
  1006 = Abnormal closure (no close frame received — network disconnect)
  1011 = Server encountered unexpected condition
```

### Scaling WebSocket — The Key Challenge

```
PROBLEM:
  User A connects to Server 1 (out of 3 load-balanced servers)
  User B connects to Server 2
  
  When Server 1 wants to broadcast "score updated" to ALL users:
    Server 1 can reach User A (directly connected)
    Server 1 CANNOT reach User B (connected to Server 2)
    
SOLUTION: Redis Pub/Sub as cross-server broadcast bus

  Event occurs (score update) → ANY server can receive it
        │
        ▼
  Server pushes event to Redis channel: PUBLISH "score:match:42" "75-3"
        │
        ├── Server 1 receives (subscribed) → pushes to its WebSocket connections
        ├── Server 2 receives (subscribed) → pushes to its WebSocket connections
        └── Server 3 receives (subscribed) → pushes to its WebSocket connections
  
  All users on all servers receive the update within milliseconds. ✅
  No sticky sessions needed. Any server can handle any message.
  
  This was the exact pattern at Bosch: 
  Multiple backend services → Redis → multiple WebSocket server instances → browser dashboards
```

---

## 4. The Code

### ❌ Wrong Way — Polling Instead of WebSocket

```typescript
// ❌ WRONG: Polling every second — wastes bandwidth, adds latency
const DashboardBadExample: React.FC = () => {
  const [score, setScore] = useState('');

  useEffect(() => {
    // ❌ Request every second: CPU, bandwidth, latency waste
    const interval = setInterval(async () => {
      const response = await fetch('/api/score/match/42');
      const data = await response.json();
      setScore(data.score);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return <div>Score: {score}</div>;
};
```

---

### ✅ Right Way — Spring WebSocket + React

```java
// Spring Boot WebSocket configuration
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // ✅ Enable simple in-memory broker for topic subscriptions
        // For production: registry.enableStompBrokerRelay("localhost", ...)
        //   pointing to RabbitMQ STOMP or ActiveMQ — scales across multiple server instances
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");   // Client-to-server messages
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // ✅ WebSocket endpoint — clients connect to this URL
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("https://app.example.com", "http://localhost:3000")
            .withSockJS();  // SockJS fallback for environments where WebSocket is blocked
    }
}
```

```java
// Server sends events to WebSocket clients
@Service
@RequiredArgsConstructor
@Slf4j
public class ScoreBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;

    // Called by a Kafka consumer or internal event listener when score changes
    @EventListener
    public void onScoreUpdate(ScoreUpdatedEvent event) {
        ScoreUpdateMessage message = ScoreUpdateMessage.builder()
            .matchId(event.getMatchId())
            .score(event.getScore())
            .overs(event.getOvers())
            .updatedAt(event.getOccurredAt())
            .build();

        // ✅ Broadcast to all clients subscribed to this match's topic
        messagingTemplate.convertAndSend(
            "/topic/match/" + event.getMatchId(),
            message
        );
        log.info("Score broadcast to WebSocket clients: matchId={} score={}", event.getMatchId(), event.getScore());
    }

    // Send to a specific user (private notifications)
    public void sendToUser(String userId, NotificationMessage notification) {
        messagingTemplate.convertAndSendToUser(
            userId,
            "/queue/notifications",
            notification
        );
    }
}
```

```java
// WebSocket message handling — client → server messages
@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketController {

    private final SubscriptionService subscriptionService;

    // Client sends: POST /app/subscribe with { matchId: 42 }
    @MessageMapping("/subscribe")
    public void subscribe(@Payload SubscribeRequest request,
                          @Header("simpSessionId") String sessionId,
                          Principal user) {
        log.info("User {} subscribing to match {}", user.getName(), request.getMatchId());
        subscriptionService.register(sessionId, request.getMatchId(), user.getName());
        // No return value — fire and forget
    }

    // Handle disconnection cleanup
    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        subscriptionService.unregister(event.getSessionId());
    }
}
```

### React TypeScript — WebSocket with Reconnection

```typescript
import { useEffect, useCallback, useRef, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface ScoreUpdate {
  matchId: string;
  score: string;
  overs: string;
  updatedAt: string;
}

// ✅ Custom hook: WebSocket connection with auto-reconnect + exponential backoff
function useMatchScore(matchId: string) {
  const [score, setScore] = useState<ScoreUpdate | null>(null);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  const connect = useCallback(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),  // SockJS for fallback support
      reconnectDelay: 5000,                        // ✅ Auto-reconnect after 5s
      heartbeatIncoming: 4000,                     // ✅ Keepalive: receive ping every 4s
      heartbeatOutgoing: 4000,                     // ✅ Keepalive: send ping every 4s

      onConnect: () => {
        setConnected(true);
        // ✅ Subscribe to this match's score topic
        client.subscribe(`/topic/match/${matchId}`, (message: IMessage) => {
          const update: ScoreUpdate = JSON.parse(message.body);
          setScore(update);
        });
      },

      onDisconnect: () => {
        setConnected(false);
      },

      onStompError: (error) => {
        console.error('WebSocket error:', error);
        // STOMP client auto-reconnects via reconnectDelay
      }
    });

    client.activate();
    clientRef.current = client;
  }, [matchId]);

  useEffect(() => {
    connect();
    return () => {
      if (clientRef.current?.active) {
        clientRef.current.deactivate();  // ✅ Clean disconnect on unmount
      }
    };
  }, [connect]);

  return { score, connected };
}

// Dashboard component using the hook
const MatchScoreDashboard: React.FC<{ matchId: string }> = ({ matchId }) => {
  const { score, connected } = useMatchScore(matchId);

  return (
    <div>
      <span className={connected ? 'status-live' : 'status-offline'}>
        {connected ? '🔴 LIVE' : '⚪ Reconnecting...'}
      </span>
      {score ? (
        <div className="score-board">
          <h2>{score.score}</h2>
          <p>Overs: {score.overs}</p>
          <small>Updated: {new Date(score.updatedAt).toLocaleTimeString()}</small>
        </div>
      ) : (
        <p>Waiting for updates...</p>
      )}
    </div>
  );
};
```

### Configuration — WebSocket with Redis Message Broker (Scales Across Instances)

```java
// ✅ Production: Use RabbitMQ or Redis as STOMP relay — scales across server instances
@Override
public void configureMessageBroker(MessageBrokerRegistry registry) {
    // Relay to RabbitMQ STOMP plugin — any server instance broadcasts to all clients
    registry.enableStompBrokerRelay("/topic", "/queue")
        .setRelayHost("rabbitmq.internal")
        .setRelayPort(61613)                          // RabbitMQ STOMP port
        .setClientLogin("ws-client")
        .setClientPasscode("ws-secret")
        .setSystemLogin("ws-system")
        .setSystemPasscode("ws-system-secret");
    registry.setApplicationDestinationPrefixes("/app");
}
// All WebSocket servers subscribe to the same RabbitMQ topics.
// Any server can broadcast — all clients on all servers receive it. ✅
```

---

## 5. Interview Questions & Model Answers

### Q1 — Fundamentals
**Interviewer asks:** "How does a WebSocket connection differ from a regular HTTP connection?"

**Hruday's answer:**
> HTTP is a request-response protocol. The client initiates every interaction: it sends a request, the server responds, and the exchange is done. The connection may stay alive (keep-alive), but the server cannot send data unless the client asks for it. For real-time data, this forces polling — the client asking "anything new?" repeatedly.
>
> WebSocket starts as an HTTP upgrade. The client sends a special HTTP request with `Upgrade: websocket`. The server responds with 101 Switching Protocols, and from that moment, the underlying TCP connection becomes a WebSocket connection — no more HTTP protocol overhead. Both sides can now send messages at any time.
>
> The key differences: first, bidirectionality — the server can push data without a waiting client request. Second, persistence — one TCP connection stays open for the life of the interaction, instead of one connection per request-response. Third, low overhead — WebSocket frames have 2-6 bytes of header versus the 200+ bytes in an HTTP/1.1 request header. For high-frequency small messages like sensor telemetry at Bosch, this overhead difference is meaningful.
>
> What WebSocket is NOT good for: request-response semantics (just use REST), large binary file transfers (REST is simpler), caching (WebSocket messages are not cached).

---

### Q2 — Scaling
**Interviewer asks:** "How do you scale WebSocket connections across multiple server instances?"

**Hruday's answer:**
> The fundamental problem: WebSocket connections are stateful. A user connected to Server Instance 1 can only receive messages that Server 1 delivers. If a score update event is processed by Server Instance 2, how does that update reach the user on Server Instance 1?
>
> Two approaches: sticky sessions or a shared message broker.
>
> Sticky sessions: the load balancer always routes a WebSocket connection to the same server instance. Simple to set up. But it removes the benefit of horizontal scaling — if Instance 1 is overloaded and Instance 2 is idle, you can't rebalance without dropping connections.
>
> Shared message broker (the scalable approach): use Redis Pub/Sub or RabbitMQ. When any server needs to broadcast a message, it publishes to a Redis channel. ALL server instances subscribe to that channel and receive the message. Each instance delivers it to the WebSocket clients currently connected to it. Any instance can handle any event; broadcasts reach all clients regardless of which instance they're on.
>
> In Spring, this is `enableStompBrokerRelay` pointing to RabbitMQ STOMP plugin. In a Node.js setup: socket.io with a Redis adapter. At Bosch, our industrial dashboard backend used a similar pattern — multiple instances of the WebSocket service all subscribed to the same message bus for cross-instance delivery.

---

### Q3 — Reconnection
**Interviewer asks:** "How do you handle WebSocket reconnection and message loss during a disconnect?"

**Hruday's answer:**
> Reconnection is not built into the WebSocket spec — it must be implemented in the client. The standard pattern: on `onclose` event, wait with exponential backoff (1s, 2s, 4s, 8s, max 30s) and re-initiate the connection. Exponential backoff prevents thundering herd: if a server restarts and 10,000 clients try to reconnect simultaneously, they'd overwhelm the server. Backoff spreads them out.
>
> Message loss during reconnection is the harder problem. While the client was disconnected, the server kept broadcasting updates. When it reconnects, the client has missed those messages.
>
> Solutions depending on tolerance for missed messages:
>
> High-tolerance (live scores, stock tickers): on reconnect, fetch the current state via REST (`GET /api/score/match/42`) and resume from there. You missed some updates but you're now in sync with current reality.
>
> Low-tolerance (chat messages, financial events): number messages sequentially. When the client reconnects, it sends its last received sequence number. The server replays messages from that sequence point. This requires the server to store recent messages (in Redis or DB) for replay.
>
> At Bosch, for industrial dashboards we used the simple approach: on reconnect, fetch the latest sensor state snapshot from the REST API, then resume the WebSocket stream. Sensors updated every second — missing 5 seconds during reconnect showed as a brief gap, which was acceptable.

---

### Q4 — Design Scenario
**Interviewer asks:** "Design the real-time chat feature for a Swiggy-style app showing the customer and delivery partner's location to each other."

**Hruday's answer:**
> Two WebSocket channels needed: one for text chat and one for location streaming.
>
> For text chat: customer and delivery partner each connect to a WebSocket endpoint. Both are subscribed to a private channel keyed by order ID (`/queue/order/{orderId}/chat`). Messages sent to `/app/chat` with the orderId are persisted to the chat history DB, then broadcast to both parties via the channel.
>
> For location: the delivery partner's mobile app sends GPS coordinates every 5-10 seconds via WebSocket: `{ "lat": 12.97, "lng": 77.59, "orderId": "ORD-42" }`. The server publishes this to `/topic/order/ORD-42/location`. The customer's app is subscribed to this topic and updates the map marker in real time. One direction only (partner to customer) — could be SSE here too.
>
> Scaling: Redis Pub/Sub as the STOMP relay backend. Any server instance can receive the partner's location update and broadcast to the customer regardless of which instance the customer is connected to.
>
> Authentication: WebSocket handshake includes the JWT in the `Authorization` header or as a query param (`/ws?token=<JWT>`). Spring Security filters validate the token on upgrade. If token is invalid, server closes the connection during upgrade with 401.
>
> Message durability: chat messages persisted immediately on send, before broadcast. If both parties disconnect temporarily, the chat history is available from REST API. Location updates are ephemeral — last 5 positions cached in Redis, older ones discarded.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "WebSocket is always better than HTTP for real-time" | "Use WebSocket for all real-time communication" | "WebSocket's strengths are bidirectionality and low overhead for high-frequency messages. For server-push-only use cases (notifications, live feed updates, progress reporting) — Server-Sent Events (SSE) is simpler, uses standard HTTP, works through proxies without special handling, and automatically reconnects as part of the spec. SSE is easier to implement and debug. WebSocket adds complexity: sticky sessions or message broker for scaling, custom reconnection logic in the client, proxy/firewall issues (some corporate firewalls block WebSocket upgrade). Use WebSocket specifically when the client ALSO needs to push data continuously. For server-to-client only: prefer SSE for simplicity." |
| "WebSocket connections scale like HTTP" | "We can horizontally scale WebSocket the same way we scale REST APIs" | "HTTP is stateless — add servers freely, any server handles any request. WebSocket connections are stateful — they're tied to a specific server instance. Adding a new server instance doesn't automatically balance existing connections to it. Existing users stay on their current server. You need either sticky sessions (user always routes to same server — defeats free horizontal scaling) OR a shared message broker (Redis/RabbitMQ as the cross-instance message bus). Without one of these, messages from one server instance don't reach users connected to other instances. This is the #1 mistake teams make when scaling WebSocket from one server to many." |
| "Closed WebSocket = error" | "If the WebSocket closes, something is wrong — alert the ops team" | "WebSocket connections close all the time for legitimate reasons: mobile app backgrounded, browser tab closed, user locked their phone, corporate proxy idle timeout, server restart for deployment. Normal close code 1000 is expected. Abnormal close 1006 (no close frame) indicates a network issue. Client-side reconnection is normal behaviour, not an error. Alert only when reconnection fails after N attempts (the endpoint is genuinely unreachable) or when the close reason indicates a server-side error. Monitoring the wrong metric — total disconnects — creates constant false alerts. Monitor meaningful metrics: users unable to reconnect after 3 attempts, 5xx close reasons, message delivery failure rates." |

---

## 7. Hruday's Real Experience Hook

> "At Bosch, I built real-time industrial equipment monitoring dashboards using Angular and WebSocket. The backend was a Java service consuming OPC-UA telemetry from industrial machinery — temperature sensors, pressure gauges, motor RPM — and streaming those readings to browser-based operator dashboards via WebSocket. Equipment readings arrived every 2-3 seconds per sensor, and the dashboards needed to show live values within 500ms. REST polling at that rate with 50+ simultaneous operator sessions would have been prohibitive. WebSocket made the system viable. The key challenge I solved was reconnection handling: operators would sometimes leave the dashboard overnight, and by morning the connection had dropped. The Angular service implemented exponential backoff reconnection with a REST state-sync on reconnect to catch up on any missed readings since the disconnect."

---

## 8. Scale Evolution

**1,000 users →** Single Spring Boot instance with `enableSimpleBroker` in-memory. React frontend with STOMP client. Simple reconnection on disconnect. Sufficient for a small team dashboard or limited beta.

**100,000 users →** Multiple Spring Boot instances behind a load balancer. `enableStompBrokerRelay` pointing to RabbitMQ STOMP for cross-instance broadcast. Sticky sessions as backup but not required. Connection pooling tuned (max WebSocket connections per instance ≈ 50,000–100,000 depending on JVM heap). Prometheus: active WebSocket connections per instance, message delivery latency.

**10 million users →** Dedicated WebSocket tier separate from REST API tier. WebSocket instances are memory-heavy (each connection uses ~50-100KB), REST instances are CPU-heavy — scale them independently. Kafka as the upstream event bus → WebSocket broadcast workers → Redis/RabbitMQ relay → WebSocket server instances → clients. Message delivery guarantees at the WebSocket layer: sequence numbers + client-side replay. Rate limiting per user on sends (prevent WebSocket message floods). Connection metadata in Redis (userId → server instance mapping) for targeted single-user pushes.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment status notifications pushed to merchant dashboards in real time. UPI collect requests require real-time status updates to both payer and payee apps. | "Design the real-time payment status notification flow when a UPI transfer completes — how does the payer's and payee's app instantly show the success screen?" |
| Swiggy / Meesho | Live order tracking (restaurant preparing → picked up → on the way), delivery partner location updates, live order management dashboard for restaurant partners. | "How does Swiggy show the delivery partner's current location moving on the customer's map in real time? What happens when the customer's app goes to background for 2 minutes?" |
| Adobe / Microsoft | Microsoft Teams (real-time collaboration), Microsoft Office real-time co-authoring, Azure Notification Hubs. Adobe collaborative document review. | "Design the real-time co-authoring feature for a document editing platform supporting 50 simultaneous editors on the same document." |
| SAP Labs (current) | SAP Fiori live approval workflow notifications, real-time ERP process monitoring dashboards, live stock and inventory updates in S/4HANA cloud. | "Design a real-time notification system for SAP business process approvals — when a purchase order is approved, the submitter's browser dashboard updates immediately without page refresh." |

---

## 10. Related Topics — What to Study Next

- **Topic 133 — Server-Sent Events** — the simpler, HTTP-native alternative to WebSocket for server-push-only use cases; understanding when SSE is preferable to WebSocket (unidirectional updates, HTTP/2 multiplexing, automatic reconnect built in) completes the real-time communication picture
- **Topic 103 — Redis Pub/Sub** — the cross-server broadcast mechanism that makes WebSocket scale horizontally; the architecture of multiple WebSocket instances all receiving messages via Redis channels is the production pattern for scaled WebSocket deployments
- **Topic 136 — API Gateway** — WebSocket connections pass through API gateways which must be configured to handle `101 Switching Protocols` responses and forward the upgraded connection; understanding how gateways (Kong, AWS API Gateway, Nginx) handle WebSocket is essential for production deployments
- **Topic 150 — Single Point of Failure** — WebSocket servers that hold stateful connections introduce an SPOF if not designed for resilience; Redis-backed cross-instance broadcast + graceful reconnection handling are the production resilience patterns for WebSocket infrastructure

---

*Part 7 · WebSockets — Real-Time Bidirectional Communication · Full Stack Interview Guide · Hruday D · 2026*
