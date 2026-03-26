# Server-Sent Events — One-Way Streaming
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Server-Sent Events (SSE)** is a server-to-client push mechanism that uses a plain HTTP connection. The client opens one long-lived HTTP connection and the server streams newline-delimited text events down it. One-way only: server pushes, client receives. No client-to-server messages after the initial request.
- **Protocol**: plain HTTP/1.1 or HTTP/2. Content-Type must be `text/event-stream`. Each event is one or more `data:` lines followed by `\n\n`. Optional: `id:` (event ID for reconnection), `event:` (custom event type), `retry:` (reconnect interval in ms).
- **Automatic reconnect built in**: if the connection drops, the browser reconnects automatically after the `retry` time (default 3 seconds). It sends `Last-Event-ID` header with the last received event ID — the server can use this to replay missed events. This is built into the browser EventSource API with zero client code needed.
- **SSE vs WebSocket**: SSE is simpler — plain HTTP, no upgrade handshake, no new protocol, works through HTTP proxies and corpo firewalls without special config. WebSocket is bidirectional — client can also push. Use SSE when the server only needs to push (notifications, live feeds, order status). Use WebSocket when the client also sends frequently (chat, collaborative editing, gaming).
- **SSE vs SSE on HTTP/2**: with HTTP/2 multiplexing, you can have many simultaneous SSE streams on one TCP connection — one stream per tab/feature without extra connections. HTTP/1.1 SSE uses one TCP connection per SSE stream (limited by browser's 6 connections per domain).
- **Real-world use**: GitHub Copilot streams token-by-token responses via SSE. ChatGPT uses SSE for streaming LLM responses. Swiggy-style tracking pushes "food is being prepared → picked up → out for delivery" via SSE.

---

## 1. One-Line Definition
Server-Sent Events (SSE) is a simple one-way HTTP streaming mechanism where the server pushes newline-delimited text events to a client over a single persistent HTTP connection, with browser-native auto-reconnect and event replay built in.

---

## 2. The Problem It Solves

### Polling vs SSE — The Notification Feed Problem

```
SCENARIO: Show a Swiggy-style order status feed to the customer.
Status changes: PLACED → CONFIRMED → PREPARING → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED

Each status change happens at unpredictable times.
The customer has the order tracking screen open for 20-40 minutes.

SHORT POLLING — what many teams start with:
  Browser requests every 5 seconds:
  GET /api/orders/ORD-42/status → { "status": "PREPARING" }   (no change)
  GET /api/orders/ORD-42/status → { "status": "PREPARING" }   (no change)
  GET /api/orders/ORD-42/status → { "status": "PREPARING" }   (no change)
  GET /api/orders/ORD-42/status → { "status": "PICKED_UP" }   (CHANGE!)
  
  For 1 million active orders at lunch time:
    1M × (1 poll/5s) = 200,000 requests/second
    Each request: HTTP overhead ~300 bytes × 200K = ~60MB/s of HTTP header traffic alone
    99% of responses have no change — pure waste
    Average delay vs real-time: 0-5 seconds lag (half the poll interval on average)
  
WEBSOCKET — more powerful than needed:
  Full-duplex bidirectional channel.
  For order status: customer doesn't SEND anything after ordering.
  A WebSocket is bidirectional infrastructure for a one-direction problem.
  Adds: upgrade handshake complexity, WebSocket-specific proxy config,
  custom reconnection code, message broker for scaling.
  Overkill if you only need server-push.
  
SSE — the right tool:
  Customer opens tracking screen → one HTTP GET to /api/orders/ORD-42/events
  Server holds connection open, Content-Type: text/event-stream
  Server pushes ONLY when status changes:
    data: {"status":"PREPARING","timestamp":"2025-06-10T12:05:00Z"}\n\n
    (10 minutes later)
    data: {"status":"PICKED_UP","timestamp":"2025-06-10T12:15:00Z"}\n\n
    (8 minutes later)
    data: {"status":"OUT_FOR_DELIVERY","timestamp":"2025-06-10T12:23:00Z"}\n\n
    
  Bandwidth: ~100 bytes × 6 status changes × 1M orders = ~600MB total (not per second)
  HTTP GET overhead: one request for the full 40-minute session (not every 5 seconds)
  Push instant when event occurs — zero polling lag
  Browser auto-reconnect: if mobile data drops for 30s, browser reconnects and resumes
```

---

## 3. How It Works Internally

### SSE Wire Format — Exactly What Travels Over HTTP

```
CLIENT REQUEST:
  GET /api/orders/ORD-42/events HTTP/1.1
  Host: api.swiggy.com
  Accept: text/event-stream                ← signals to server: SSE client
  Cache-Control: no-cache
  Last-Event-ID: 5                         ← if reconnecting: last event received

SERVER RESPONSE (persistent, never closes until done):
  HTTP/1.1 200 OK
  Content-Type: text/event-stream          ← MUST be this exact content type
  Cache-Control: no-cache                  ← MUST have this — SSE must not be cached
  Connection: keep-alive
  X-Accel-Buffering: no                    ← Nginx: disable response buffering for SSE
  
  (body starts — server writes events as they occur):
  
  : keepalive comment (colon = comment, not delivered to client)
  
  id: 1
  event: status-update
  data: {"status":"CONFIRMED","message":"Restaurant confirmed your order"}
  
  (blank line — signals end of this event block. Browser delivers event to JS)
  
  id: 2
  event: status-update
  data: {"status":"PREPARING","message":"Chef is preparing your food"}
  
  
  retry: 3000
  
  id: 3
  event: status-update
  data: {"status":"PICKED_UP","message":"Delivery partner picked up"}
  
  
  (server writes an event each time the order status changes)
  (connection stays open until order is DELIVERED, then server sends close event)
  
  event: complete
  data: {"status":"DELIVERED"}
  
  
  (server closes connection — browser does NOT auto-reconnect after clean close)
```

### SSE Event Fields

```
FIELD         MEANING
─────────────────────────────────────────────────────
id: N         Event ID — sent back as Last-Event-ID on reconnection
              Server uses it to replay missed events after reconnect
              Without this: missed events on disconnect are lost

event: name   Custom event type. Default: "message"
              Client: eventSource.addEventListener("status-update", handler)
              Without type: eventSource.onmessage = handler (catches default only)

data: text    The content. For JSON: data: {"key":"value"}
              For multi-line: send multiple data: lines → joined with newline
              data: line 1
              data: line 2
              → client receives "line 1\nline 2"

retry: ms     How long browser waits before reconnecting (milliseconds)
              Default: 3000ms (3 seconds)
              Set higher for less aggressive reconnection

: comment     Lines starting with colon are comments — not delivered to client
              Use for keepalive heartbeats to prevent proxy timeouts:
              : keepalive
              (blank line)
              Send every 15-30 seconds on idle connections
```

### Browser EventSource API — Lifecycle

```
          Client opens EventSource
                │
                ▼
          HTTP GET /api/stream
          Headers: Accept: text/event-stream
                │
                ▼
          Connection established → readyState = OPEN
                │
    ┌───────────┴───────────────┐
    │                           │
    ▼                           ▼
event received             Connection drops?
(onmessage / addEventListener)   │
Update UI                        ▼
                        readyState = CONNECTING
                        Wait retry ms (default 3000)
                        Reconnect with Last-Event-ID header
                        Server sends missed events → resume
                                 │
                                 ▼
                          readyState = OPEN → continuous stream
                          
Close:
  eventSource.close() → client closes connection
  server closes connection → no auto-reconnect (clean close)
  
  readyState values:
    0 = CONNECTING
    1 = OPEN  
    2 = CLOSED (after explicit close() or server-side terminal event)
```

---

## 4. The Code

### ❌ Wrong Way — Long Polling (Simulates SSE Manually)

```java
// ❌ WRONG: Long polling — artificial simulation of SSE, not real streaming
@GetMapping("/orders/{orderId}/status-poll")
public DeferredResult<ResponseEntity<OrderStatusDto>> pollStatus(
        @PathVariable String orderId) {
    DeferredResult<ResponseEntity<OrderStatusDto>> result = new DeferredResult<>(30_000L);

    // ❌ Each poll creates a new HTTP request + response cycle
    // ❌ Long-lived server threads per client — doesn't scale
    // ❌ No event ID — missed events on disconnect are lost forever
    // ❌ Client code: must re-poll after each response — manual complexity
    orderStatusQueue.waitForChange(orderId, newStatus -> {
        result.setResult(ResponseEntity.ok(OrderStatusDto.from(newStatus)));
    });
    return result;
}
```

> **Why this fails in production:** Each long poll creates a new HTTP request cycle after every event, adding latency and overhead. No built-in replay on reconnect — missed events during poll window transition are lost permanently.

---

### ✅ Right Way — Spring Boot SSE with SseEmitter

```java
// Server-side SSE endpoint
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class OrderSseController {

    private final OrderEventRegistrar eventRegistrar;

    @GetMapping(value = "/orders/{orderId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamOrderEvents(
            @PathVariable String orderId,
            @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId,
            @AuthenticationPrincipal JwtUserDetails user) {

        // ✅ Validate access before opening SSE stream
        if (!orderService.belongsToUser(orderId, user.getUserId())) {
            throw new ResourceNotFoundException("Order not found: " + orderId);
        }

        // ✅ Timeout = max stream duration. -1L = no timeout (keep open until done or disconnect)
        SseEmitter emitter = new SseEmitter(1_800_000L);  // 30 minutes max

        // ✅ If reconnecting with Last-Event-ID, replay missed events first
        if (lastEventId != null) {
            eventRegistrar.replayMissedEvents(orderId, Long.parseLong(lastEventId), emitter);
        }

        // Register emitter — receive future events as they occur
        eventRegistrar.register(orderId, emitter);

        // ✅ Cleanup on complete/timeout/error — remove from registry
        emitter.onCompletion(() -> eventRegistrar.unregister(orderId, emitter));
        emitter.onTimeout(() -> {
            log.info("SSE timeout for orderId={}", orderId);
            eventRegistrar.unregister(orderId, emitter);
        });
        emitter.onError(ex -> {
            log.warn("SSE error for orderId={}: {}", orderId, ex.getMessage());
            eventRegistrar.unregister(orderId, emitter);
        });

        return emitter;
    }
}
```

```java
// Event registration and broadcasting service
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEventRegistrar {

    // Map of orderId → list of active SSE emitters (in-memory per server instance)
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>> emitters
        = new ConcurrentHashMap<>();

    private final OrderEventRepository eventRepository;  // For replay

    // Called when a new client SSE connection opens
    public void register(String orderId, SseEmitter emitter) {
        emitters.computeIfAbsent(orderId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        
        // ✅ Send current state immediately so client has latest status on connect
        OrderStatus currentStatus = orderRepository.getStatus(orderId);
        sendEvent(emitter, 0L, "status-update", OrderStatusDto.from(currentStatus));
        
        // ✅ Start keepalive: comment every 25 seconds to prevent proxy timeout (30s default)
        scheduleKeepalive(emitter);
        log.info("SSE registered for orderId={} total emitters={}", orderId,
            emitters.getOrDefault(orderId, new CopyOnWriteArrayList<>()).size());
    }

    // Called by application events (Kafka consumer, domain event listener, etc.)
    @EventListener
    public void onOrderStatusChanged(OrderStatusChangedEvent event) {
        List<SseEmitter> orderEmitters = emitters.get(event.getOrderId());
        if (orderEmitters == null || orderEmitters.isEmpty()) return;

        // ✅ Persist event record for replay (enables Last-Event-ID reconnection)
        long eventId = eventRepository.save(event).getId();

        // Broadcast to all SSE clients watching this order
        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : orderEmitters) {
            try {
                sendEvent(emitter, eventId, "status-update",
                    new OrderStatusDto(event.getOrderId(), event.getNewStatus(), event.getMessage()));

                // If order is terminal: close stream — browser will not reconnect on clean close
                if (event.getNewStatus().isTerminal()) {
                    emitter.complete();
                }
            } catch (IOException e) {
                deadEmitters.add(emitter);  // Client disconnected — mark for removal
            }
        }
        orderEmitters.removeAll(deadEmitters);
    }

    // Replay events after Last-Event-ID for reconnecting clients
    public void replayMissedEvents(String orderId, long lastEventId, SseEmitter emitter) {
        List<OrderEvent> missed = eventRepository.findAfter(orderId, lastEventId);
        missed.forEach(event ->
            sendEvent(emitter, event.getId(), "status-update", OrderStatusDto.from(event))
        );
        log.info("Replayed {} missed events for orderId={} after eventId={}",
            missed.size(), orderId, lastEventId);
    }

    private void sendEvent(SseEmitter emitter, long id, String eventType, Object data) {
        try {
            emitter.send(SseEmitter.event()
                .id(String.valueOf(id))
                .name(eventType)
                .data(data, MediaType.APPLICATION_JSON)
                .reconnectTime(3000));  // ✅ Tell browser: retry after 3s
        } catch (IOException e) {
            // Client disconnected — caller handles cleanup
            throw new RuntimeException(e);
        }
    }

    private void scheduleKeepalive(SseEmitter emitter) {
        // Send a comment every 25s to prevent intermediate proxy from closing idle connection
        Executors.newSingleThreadScheduledExecutor().scheduleAtFixedRate(() -> {
            try {
                emitter.send(SseEmitter.event().comment("keepalive"));
            } catch (IOException e) {
                // Client gone — stop the keepalive
                throw new RuntimeException(e);
            }
        }, 25, 25, TimeUnit.SECONDS);
    }

    public void unregister(String orderId, SseEmitter emitter) {
        emitters.getOrDefault(orderId, new CopyOnWriteArrayList<>()).remove(emitter);
    }
}
```

### TypeScript React — EventSource with Event Types

```typescript
import { useEffect, useState, useRef, useCallback } from 'react';

interface OrderStatusUpdate {
  status: string;
  message: string;
  timestamp: string;
}

// ✅ Custom hook: SSE with auto-reconnect awareness and cleanup
function useOrderStatusStream(orderId: string) {
  const [statusHistory, setStatusHistory] = useState<OrderStatusUpdate[]>([]);
  const [connected, setConnected] = useState(false);
  const lastEventIdRef = useRef<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    // ✅ Include Last-Event-ID for replay on manual reconnect
    // Note: browser EventSource sends Last-Event-ID automatically on auto-reconnect
    const url = `/api/v1/orders/${orderId}/events`;
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => setConnected(true);

    // ✅ Listen for specific named event type "status-update"
    eventSource.addEventListener('status-update', (event: MessageEvent) => {
      const update: OrderStatusUpdate = JSON.parse(event.data);
      lastEventIdRef.current = event.lastEventId;  // Browser tracks this automatically
      setStatusHistory(prev => [...prev, update]);
    });

    // ✅ Handle specific event type for order completion
    eventSource.addEventListener('complete', () => {
      setConnected(false);
      eventSource.close();  // Final state - no need to reconnect
    });

    eventSource.onerror = () => {
      setConnected(false);
      // Browser auto-reconnects after retry ms — we just update UI state
      // Do NOT manually reconnect here — browser handles it, do so would create duplicates
    };
  }, [orderId]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();  // ✅ Clean close on unmount — stops auto-reconnect
    };
  }, [connect]);

  return { statusHistory, connected };
}

// Component: displays live order status timeline
const OrderTracker: React.FC<{ orderId: string }> = ({ orderId }) => {
  const { statusHistory, connected } = useOrderStatusStream(orderId);

  return (
    <div className="order-tracker">
      <div className={`connection-status ${connected ? 'live' : 'reconnecting'}`}>
        {connected ? '● Live' : '○ Reconnecting...'}
      </div>
      <div className="status-timeline">
        {statusHistory.map((update, i) => (
          <div key={i} className="status-step">
            <span className="status">{update.status}</span>
            <span className="message">{update.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Configuration — Nginx for SSE (No Buffering)

```nginx
# Nginx config: disable buffering for SSE endpoints
# Without this, Nginx buffers responses and SSE events are NOT sent to client until buffer fills
location /api/v1/orders/ {
    proxy_pass http://backend;
    
    # ✅ Disable buffering — required for SSE to reach client immediately
    proxy_buffering off;
    proxy_cache off;
    
    # ✅ Increase timeout — SSE connections stay open for minutes/hours
    proxy_read_timeout 1800s;
    proxy_send_timeout 1800s;
    
    # ✅ Tell upstream servers (Spring Boot) not to buffer
    proxy_set_header X-Accel-Buffering no;
    
    # ✅ Keep connection alive between Nginx and backend
    proxy_http_version 1.1;
    proxy_set_header Connection "";
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Comparison
**Interviewer asks:** "What is the difference between Server-Sent Events and WebSockets, and when would you choose each?"

**Hruday's answer:**
> WebSocket is full-duplex — both sides can send messages at any time after the upgrade handshake. It uses a separate protocol over a TCP connection. SSE is one-way — the server pushes, the client only receives. It's plain HTTP with `Content-Type: text/event-stream`.
>
> That one-directionality is SSE's biggest advantage in the right context. SSE uses standard HTTP — it works through corporate proxies, firewalls, and load balancers that understand HTTP perfectly. WebSocket requires proxy config changes and causes issues at proxies that don't understand the Upgrade handshake. SSE reconnects automatically — the browser's EventSource API handles it with zero client code; WebSocket needs custom reconnection logic. SSE also carries a much lighter server cost because there's no persistent bidirectional overhead.
>
> Choose SSE when: the server only needs to push data — live notifications, order status updates, deployment progress, LLM response streaming (ChatGPT uses SSE for this). Choose WebSocket when: the client also sends messages frequently after connection — chat applications, collaborative editing, gaming, live auctions where bidders send bids.
>
> The rule: if it's a one-way information feed from server to client, SSE is simpler and more robust. If the client talks back regularly, WebSocket is necessary.

---

### Q2 — LLM Streaming
**Interviewer asks:** "How does ChatGPT's token streaming work? What technology does it use?"

**Hruday's answer:**
> ChatGPT streams its response token by token using Server-Sent Events. Instead of waiting for the entire response to be generated (which could take 10-30 seconds for long answers), the LLM generates tokens continuously and the server pushes each token as an SSE event to the client immediately.
>
> The technical flow: the client sends the user's message via a regular POST request to the inference endpoint. The response has `Content-Type: text/event-stream` and the server starts streaming data. Each SSE event contains a small JSON payload with the next token or a few tokens: `data: {"choices":[{"delta":{"content":"Hello"}}]}`. The React frontend appends each token to the displayed text as it arrives — the user sees the text appearing word by word.
>
> Why SSE over WebSocket for this? The communication is one-way during a response — the server pushes tokens, the client receives. Once the user sends a message (a regular POST), they don't need to interrupt mid-stream. SSE is perfect: simpler, HTTP-based, auto-reconnects if the stream drops.
>
> The `done` signal: when the LLM finishes generating, the server sends `data: [DONE]` which is a special sentinel token. The client detects this and stops appending text, shows the final response.
>
> If building a similar feature in Spring Boot: the AI integration service calls the LLM API which itself streams tokens back, and we forward those as SSE events to the browser via `SseEmitter`.

---

### Q3 — Scaling
**Interviewer asks:** "An SSE endpoint is running on 5 server instances behind a load balancer. How do you ensure all clients receive order status updates even if the event is processed by a different server than the one they're connected to?"

**Hruday's answer:**
> This is the same cross-instance fanout problem as WebSocket scaling — the solution is the same: a shared message broker.
>
> Each of the 5 server instances maintains a registry of active SSE emitters (like my `OrderEventRegistrar`). When an order status changes — say, Kafka delivers a `OrderStatusChangedEvent` — the Kafka consumer may run on any of the 5 instances. That instance must broadcast the event to ALL clients watching that order, including those connected to the other 4 instances.
>
> Solution: Spring's `SimpMessagingTemplate` backed by a Redis Pub/Sub or RabbitMQ topic relay. When any instance processes the Kafka event, it publishes to `Redis PUBLISH order:ORD-42 <status-payload>`. All 5 instances subscribe to `order:ORD-42`. Each instance broadcasts the event to the SSE emitters it holds for that order.
>
> Alternatively: dedicated SSE relay service. The Kafka consumer runs in a separate service that holds all SSE connections. Other services publish events to Kafka, one relay service consumes and broadcasts. Simpler than per-service SSE registration but adds an infrastructure tier.
>
> For a stateless-friendly option: sticky sessions on the load balancer route each `orderId`'s SSE connections to the same instance. Simpler but reduces horizontal scaling freedom. The Redis Pub/Sub approach is preferred for high scale.

---

### Q4 — Reconnection
**Interviewer asks:** "How does event replay work with SSE when a client reconnects after losing connection for 2 minutes?"

**Hruday's answer:**
> SSE's event ID and `Last-Event-ID` header handle this. Every event sent by the server includes an `id: N` field. The browser stores the ID of the last event it successfully received. When the connection drops, the browser waits `retry` milliseconds and reconnects. On reconnect, it sends `Last-Event-ID: N` in the request header automatically — no client code needed.
>
> The server reads this header. In my implementation: the `streamOrderEvents` Spring controller reads `@RequestHeader("Last-Event-ID")`. If present, it calls `replayMissedEvents(orderId, lastEventId, emitter)` which fetches all events for that order with ID greater than `lastEventId` from an event store (PostgreSQL or Redis list) and sends them to the new emitter before registering it for future events.
>
> For the 2-minute disconnect scenario: if 3 status changes occurred during those 2 minutes (events 6, 7, 8 while client had received through event 5), on reconnect the client sends `Last-Event-ID: 5`. The server replays events 6, 7, 8 immediately, then continues streaming. The client's status timeline fills in the gap seamlessly.
>
> Key requirement: events must be persisted server-side for replay to work. The server can't replay what it didn't store. I store events in a simple `order_events` table with `(id, order_id, event_type, payload, occurred_at)` — TTL of 24 hours, then cleanup.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "SSE needs manual reconnection code in the client" | "I need to write reconnection logic in JavaScript for SSE" | "Reconnection is built into the `EventSource` API. When the connection drops, the browser automatically waits `retry` ms (default 3 seconds — override with `retry: 5000` in events) and reconnects, sending `Last-Event-ID`. No client code. The only client code needed: don't call `eventSource.close()` in the `onerror` handler. If you close on error, you cancel the auto-reconnect. Let the browser handle it — only call `close()` when you genuinely want to stop streaming (component unmount, order delivered)." |
| "SSE won't work through an HTTP proxy or load balancer" | "SSE has proxy issues — I'd use WebSocket instead" | "SSE IS plain HTTP — any proxy that handles HTTP handles SSE. The one real requirement: response buffering must be disabled on Nginx/load balancer for SSE events to arrive in real time instead of being batched. `proxy_buffering off` in Nginx, `X-Accel-Buffering: no` header from Spring, or equivalent. Without this, Nginx may hold events in its buffer for seconds before flushing. This is a one-line config change. WebSocket, by comparison, requires proxies to support protocol upgrades and sometimes specific Nginx module configuration. For enterprise environments with strict proxy rules: SSE is more likely to work out of the box." |
| "SSE is limited to 6 connections in the browser" | "HTTP/1.1 has a 6-connection limit per domain — SSE uses one connection permanently" | "This is a real HTTP/1.1 constraint but it's addressed by HTTP/2. Under HTTP/1.1: yes, browsers limit to 6 connections per domain, so 6 open SSE streams would use all connections. The solutions: put your SSE endpoint on a subdomain (`stream.api.example.com`) to get its own connection pool, or use HTTP/2 where multiplexing allows unlimited streams over one TCP connection. Spring Boot with TLS on HTTP/2 multiplexes SSE streams naturally. In practice: most SSE use cases need only one stream per page (the live status feed for the current order). The 6-connection limit is an academic concern for single-domain multi-stream scenarios." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we built a long-running financial report generation feature. Users would click 'Generate Report,' which triggered a 2-3 minute server-side processing job. The original implementation blocked the HTTP request for the full duration — users saw a spinner and sometimes hit proxy timeouts. We replaced this with a job dispatch pattern: POST returns 202 immediately with a job ID, and SSE streams the progress to the frontend. The `EventSource` on the React side listened for `progress` events (`10%... 30%... 60%... 100%... done`) and updated the progress bar in real time. The reconnect capability was immediately valuable — if a user switched to another tab and back, the SSE resumed from where it left off. SSE was fundamentally simpler to implement and more robust than the long-polling fallback we'd previously considered."

---

## 8. Scale Evolution

**1,000 users →** `SseEmitter` in Spring Boot with in-memory emitter registry. Nginx with `proxy_buffering off`. Keepalive comments every 25s. Works well for a single instance.

**100,000 users →** Redis Pub/Sub as cross-instance broadcast bus. Multiple Spring Boot SSE instances behind load balancer. Event store for replay (PostgreSQL `order_events` table, 24h retention). Prometheus: active emitter count per instance, events delivered per second.

**10 million users →** Dedicated SSE relay service (separate from business logic services). Kafka → SSE relay via direct consumption + in-process emitter registry. Redis Cluster for pub/sub at scale. HTTP/2 everywhere — multiplexed streams share connections. Sticky sessions as fallback. Connection pooling monitored: each idle SSE connection uses ~4KB RAM on the relay server. 10M connections = ~40GB RAM dedicated to connection management → horizontal scaling of relay fleet.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment confirmation push to payer and payee dashboards in real time. UPI transaction status stream (initiated → pending → settled). No polling needed for merchant dashboards. | "Design real-time payment status updates to a merchant's dashboard when a customer completes a UPI payment — without polling." |
| Swiggy / Meesho | Order lifecycle updates (placed → confirmed → preparing → picked up → out for delivery → delivered) pushed to customer tracking screen. Delivery partner's status feed. | "How does the Swiggy customer see order status updates in real time on the tracking screen without refreshing the page?" |
| Adobe / Microsoft | GitHub Copilot streams code completions token-by-token via SSE. GitHub Actions live build logs stream via SSE. Azure deployment progress streams. | "How would you implement GitHub Actions-style live build log streaming to the browser?" |
| SAP Labs (current) | Long-running financial batch job progress streaming. ERP document approval workflow real-time status updates. Live import/export progress for mass data operations. | "A financial report generation job takes 2-3 minutes. How do you show live progress to the user without blocking the HTTP response or using polling?" |

---

## 10. Related Topics — What to Study Next

- **Topic 132 — WebSockets** — the bidirectional counterpart to SSE; the core comparison — one-way HTTP vs full-duplex protocol — defines when each is the right tool; understanding both gives the complete real-time communication vocabulary
- **Topic 103 — Redis Pub/Sub** — the cross-server broadcast mechanism for scaling SSE across multiple instances; any production multi-instance SSE deployment needs a shared broadcast bus, and Redis Pub/Sub is the standard choice
- **Topic 202 — SPA vs SSR** — SSE works differently in SSR (Next.js Server Components) vs SPA contexts; in Next.js App Router, route handlers can stream SSE directly from the server to the browser, which changes the architecture
- **Topic 127 — HTTP Status Codes** — SSE requires `200 OK` with `text/event-stream` content type; incorrect status codes (like 404 before the stream opens) are a common source of SSE connection bugs when the resource doesn't exist

---

*Part 7 · Server-Sent Events — One-Way Streaming · Full Stack Interview Guide · Hruday D · 2026*
