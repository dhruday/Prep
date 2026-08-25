# 481 — Communication Patterns Overview: Choosing the Right Protocol

────────────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

Real-time web communication relies on a spectrum of transport mechanisms — each with distinct
trade-offs in latency, complexity, scalability, and browser support. The seven major patterns
every senior frontend engineer must evaluate are:

| Pattern | Direction | Summary |
|---|---|---|
| **Short Polling** | Client → Server (repeated) | Client asks at fixed intervals |
| **Long Polling** | Client → Server (held) | Server holds request until data available |
| **WebSockets** | Bidirectional | Persistent full-duplex TCP connection |
| **Server-Sent Events (SSE)** | Server → Client | HTTP-based unidirectional push stream |
| **WebTransport** | Bidirectional | QUIC-based next-gen transport (HTTP/3) |
| **gRPC Streaming** | Bidirectional | HTTP/2-based RPC with protobuf serialization |
| **Webhooks** | Server → Server | HTTP POST callback on event occurrence |

The right choice depends on latency requirements, message direction, scale targets,
infrastructure constraints, and team expertise.

────────────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior / Staff Level)

### A. How Each Pattern Works — ASCII Message Flows

```
SHORT POLLING
─────────────
Client              Server
  │── GET /data ──────→│  (t=0s)
  │←── 200 (empty) ───│
  │                    │
  │── GET /data ──────→│  (t=5s)
  │←── 200 {new} ─────│
  │                    │
  │── GET /data ──────→│  (t=10s)
  │←── 200 (empty) ───│

LONG POLLING
────────────
Client              Server
  │── GET /updates ───→│  (held open...)
  │       ...wait...   │  (server blocks until event)
  │←── 200 {event} ───│  (responds with data)
  │── GET /updates ───→│  (immediately reconnect)
  │       ...wait...   │

WEBSOCKET
─────────
Client              Server
  │── HTTP Upgrade ───→│
  │←── 101 Switching ─│
  │◄══ full-duplex ══►│  (binary frames, no HTTP overhead)
  │── frame: msg ─────→│
  │←── frame: ack ────│
  │←── frame: push ───│
  │── frame: close ───→│

SERVER-SENT EVENTS (SSE)
────────────────────────
Client              Server
  │── GET /stream ────→│  (Accept: text/event-stream)
  │←── 200 (chunked) ─│
  │←── data: evt1 ────│
  │←── data: evt2 ────│
  │←── :keepalive ────│  (comment heartbeat)
  │←── data: evt3 ────│
  │   (connection drop)│
  │── GET /stream ────→│  (Last-Event-ID: 3, auto-reconnect)

WEBTRANSPORT
────────────
Client              Server
  │── QUIC handshake ─→│  (0-RTT or 1-RTT)
  │◄══ streams ═══════►│  (multiple ordered streams)
  │◄── datagrams ─────►│  (unordered, unreliable)
  │── stream 1 data ──→│
  │←── stream 2 push ─│
  │←── datagram ──────│  (fire-and-forget)

gRPC STREAMING
──────────────
Client              Server
  │── HTTP/2 POST ────→│  (protobuf-encoded)
  │←── header frame ──│
  │←── data frame 1 ──│  (server stream)
  │── data frame ─────→│  (client stream, if bidi)
  │←── data frame 2 ──│
  │←── trailer frame ─│  (status + metadata)

WEBHOOKS
────────
External Service       Your Server        Client (Browser)
  │                      │                   │
  │── POST /webhook ────→│                   │
  │←── 200 OK ──────────│                   │
  │                      │── push via WS/SSE→│
  │                      │   or store for    │
  │                      │   client to poll  │
```

### B. Comprehensive Comparison Table (17 Dimensions)

| Dimension | Short Polling | Long Polling | WebSocket | SSE | WebTransport | gRPC Stream | Webhook |
|---|---|---|---|---|---|---|---|
| **Direction** | Client→Server | Client→Server | Bidirectional | Server→Client | Bidirectional | Bidirectional | Server→Server |
| **Latency** | interval/2 avg | Near real-time | ~ms | ~ms | ~ms (0-RTT) | ~ms | Event-driven |
| **Bandwidth** | High (headers) | Moderate | Low (frames) | Low | Very low | Low (protobuf) | Minimal |
| **Connection** | New per request | Held + reconnect | Persistent | Persistent | Persistent | Persistent | On-demand POST |
| **Protocol** | HTTP/1.1+ | HTTP/1.1+ | ws:// / wss:// | HTTP/1.1+ | HTTP/3 (QUIC) | HTTP/2 | HTTP POST |
| **Browser Support** | Universal | Universal | 98%+ | 97%+ (no IE) | Chrome 97+ | Via grpc-web | N/A (server) |
| **Proxy Compat** | Excellent | Good | Fair (upgrade) | Good | Limited | Fair | Excellent |
| **Reconnection** | Built-in (timer) | Manual | Manual | Auto (EventSource) | Manual | Manual | N/A (retries) |
| **Ordering** | Not guaranteed | Per-response | Guaranteed | Guaranteed | Per-stream | Per-stream | Not guaranteed |
| **Multiplexing** | None | None | Single TCP conn | Single conn | Multi-stream | Multi-stream | N/A |
| **Binary Data** | Base64 encode | Base64 encode | Native | Text only | Native | Native (protobuf) | Payload-dependent |
| **Scalability** | Poor (1K+) | Moderate (10K) | Good (100K+) | Good (100K+) | Excellent | Excellent | Excellent |
| **Server Complexity** | Low | Moderate | High | Low-Moderate | High | High | Moderate |
| **Firewall Friendly** | Yes | Yes | Sometimes | Yes | Rarely | Sometimes | Yes |
| **Auth Model** | Per-request | Per-request | On-upgrade | Per-request | On-connect | Per-call/stream | Signature (HMAC) |
| **Back-pressure** | N/A | Implicit | Manual | Implicit | Built-in | Built-in | N/A |
| **Max Connections** | Browser limit 6 | Browser limit 6 | No HTTP limit | Browser limit 6 | No HTTP limit | Shared HTTP/2 | N/A |

### C. Decision Framework — Flowchart

```
                        ┌─────────────────────────────┐
                        │  What is the data flow need? │
                        └──────────┬──────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              Server→Client   Bidirectional   Server→Server
                    │              │              │
                    ▼              ▼              ▼
           ┌───────────┐   ┌───────────┐   ┌───────────┐
           │ Need binary│   │ Need binary│   │ Webhooks  │
           │  or text?  │   │  or text?  │   └───────────┘
           └─────┬─────┘   └─────┬─────┘
              text│            both│
                 ▼              ▼
           ┌─────────┐   ┌───────────────┐
           │  SSE    │   │ Latency <10ms?│
           └─────────┘   └──────┬────────┘
                                │
                    ┌───────────┼──────────┐
                    ▼                      ▼
              ┌───────────┐         ┌────────────┐
              │ WebSocket │         │ Long Poll / │
              │ or        │         │ Short Poll  │
              │ WebTransport       └────────────┘
              └───────────┘
                    │
           ┌────────┴────────┐
           ▼                 ▼
    HTTP/3 available?   No HTTP/3
           │                 │
           ▼                 ▼
    WebTransport        WebSocket
```

**Decision rules:**
1. Server→Client only, text data → **SSE** (simplest, auto-reconnect)
2. Bidirectional, low-latency → **WebSocket** (mature, well-supported)
3. Bidirectional, binary, need multiplexing → **WebTransport** (if HTTP/3 available)
4. Infrequent updates (<1/min), simple infra → **Short Polling**
5. Moderate frequency, can't use WS/SSE → **Long Polling**
6. Microservice-to-microservice streaming → **gRPC Streaming**
7. Third-party event callbacks → **Webhooks**

### D. Real Production Scenario Mapping

```
┌──────────────────────────────────┬────────────────────┬──────────────────────────────────┐
│ Scenario                         │ Best Pattern        │ Why                              │
├──────────────────────────────────┼────────────────────┼──────────────────────────────────┤
│ Notification bell (new alerts)   │ SSE                │ Server→client, text, auto-recon  │
│ Chat / messaging                 │ WebSocket          │ Bidirectional, low-latency       │
│ Stock ticker / live prices       │ WebSocket          │ High-frequency, binary optional  │
│ CI/CD build status               │ Short Polling      │ Infrequent, simple, stateless    │
│ Payment confirmation (Stripe)    │ Webhook → SSE      │ 3rd party push → notify browser  │
│ Collaborative editing (Docs)     │ WebSocket + CRDT   │ Bidirectional, ordered ops       │
│ Live sports scores               │ SSE                │ Server→client, moderate freq     │
│ File upload progress             │ WebSocket          │ Bidirectional progress updates   │
│ IoT sensor dashboard (Bosch)     │ WebSocket          │ High-throughput, binary frames   │
│ Social media feed updates        │ Long Polling / SSE │ Moderate freq, wide compat       │
│ Multiplayer game state           │ WebTransport       │ Low-latency, unreliable OK       │
│ Log streaming (tail -f)          │ SSE                │ Server→client, ordered, text     │
│ GitHub PR status updates         │ Webhook → Polling  │ Event-driven, infrequent         │
│ Video conferencing signals       │ WebSocket          │ Signaling + ICE candidates       │
│ E-commerce inventory updates     │ SSE / Short Poll   │ Near-real-time, server→client    │
└──────────────────────────────────┴────────────────────┴──────────────────────────────────┘
```

### E. Scale Considerations (1K → 1M Users)

```
CONNECTIONS AT SCALE
────────────────────

1K users:
  ├── Short Polling:  ~200 req/sec (5s interval) → any single server handles it
  ├── WebSocket:      1K persistent connections → ~8MB RAM, trivial
  └── SSE:            1K persistent connections → ~8MB RAM, trivial

10K users:
  ├── Short Polling:  ~2K req/sec → load balancer needed, cache layer
  ├── WebSocket:      10K connections → ~80MB RAM, single Node.js handles it
  └── SSE:            10K connections → same, but watch browser connection limits

100K users:
  ├── Short Polling:  ~20K req/sec → CDN/cache essential, DB bottleneck
  ├── WebSocket:      100K conns → need sticky sessions or Redis pub/sub
  │                   Fan-out pattern: publish → Redis → all WS servers
  └── SSE:            Same as WS but simpler (HTTP/2 multiplexing helps)

1M users:
  ├── Short Polling:  ~200K req/sec → very expensive, avoid
  ├── WebSocket:      Multiple WS clusters behind L4 LB
  │                   Redis Cluster / Kafka for cross-node fan-out
  │                   Connection draining for deploys
  └── SSE:            Similar to WS, but easier horizontal scaling
  └── WebTransport:   Best theoretical scaling (QUIC, 0-RTT)
```

**Architecture at 1M:**

```
                    ┌─────────────┐
                    │   Clients   │  (1M browsers)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  L4/L7 LB   │  (sticky sessions for WS)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ WS Node 1│ │ WS Node 2│ │ WS Node N│  (each handles ~50K conns)
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           │
                    ┌──────▼──────┐
                    │ Redis Pub/  │  (cross-node message fan-out)
                    │ Sub Cluster │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Event Bus  │  (Kafka for durability)
                    │  / Queue    │
                    └─────────────┘
```

### F. Implementation Snippets for Each Pattern

**Short Polling (TypeScript):**

```typescript
class ShortPoller<T> {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private url: string,
    private intervalMs: number,
    private onData: (data: T) => void
  ) {}

  start(): void {
    this.poll(); // immediate first call
    this.timer = setInterval(() => this.poll(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    try {
      const res = await fetch(this.url, {
        headers: { 'If-None-Match': this.etag },
      });
      if (res.status === 200) {
        this.etag = res.headers.get('ETag') ?? '';
        const data: T = await res.json();
        this.onData(data);
      }
      // 304 = no change, skip
    } catch (err) {
      console.error('Poll failed:', err);
    }
  }

  private etag = '';
}

// Usage
const poller = new ShortPoller<BuildStatus>('/api/ci/status', 5000, (status) => {
  updateBuildBadge(status);
});
poller.start();
```

**Long Polling (TypeScript):**

```typescript
async function longPoll(url: string, onEvent: (data: unknown) => void): Promise<void> {
  let lastEventId = '';
  while (true) {
    try {
      const res = await fetch(url, {
        headers: { 'X-Last-Event-ID': lastEventId },
        signal: AbortSignal.timeout(30_000), // 30s timeout
      });
      if (res.ok) {
        const payload = await res.json();
        lastEventId = payload.id;
        onEvent(payload.data);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        continue; // normal timeout, reconnect immediately
      }
      await new Promise((r) => setTimeout(r, 2000)); // backoff on error
    }
  }
}
```

**WebSocket with Reconnection (TypeScript):**

```typescript
class ResilientWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private maxReconnect = 10;
  private messageQueue: string[] = [];

  constructor(
    private url: string,
    private onMessage: (data: MessageEvent) => void
  ) {
    this.connect();
  }

  private connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      // flush queued messages
      while (this.messageQueue.length > 0) {
        this.ws!.send(this.messageQueue.shift()!);
      }
    };

    this.ws.onmessage = this.onMessage;

    this.ws.onclose = (event) => {
      if (!event.wasClean && this.reconnectAttempt < this.maxReconnect) {
        const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 30_000);
        setTimeout(() => this.connect(), delay);
        this.reconnectAttempt++;
      }
    };

    this.ws.onerror = () => this.ws?.close();
  }

  send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.messageQueue.push(data);
    }
  }

  close(): void {
    this.maxReconnect = 0;
    this.ws?.close(1000, 'Client closed');
  }
}
```

**SSE (TypeScript):**

```typescript
function subscribeSSE(url: string, handlers: Record<string, (data: string) => void>): EventSource {
  const es = new EventSource(url, { withCredentials: true });

  // Named events
  for (const [event, handler] of Object.entries(handlers)) {
    es.addEventListener(event, (e) => handler((e as MessageEvent).data));
  }

  // Default message event
  es.onmessage = (e) => handlers['message']?.(e.data);

  es.onerror = () => {
    // EventSource auto-reconnects; handle state if needed
    console.warn('SSE connection error, auto-reconnecting...');
  };

  return es;
}

// Usage
const source = subscribeSSE('/api/notifications/stream', {
  notification: (data) => showToast(JSON.parse(data)),
  heartbeat: () => resetConnectionTimer(),
});
```

### G. Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|---|---|---|
| Polling at 1s intervals at scale | crushes server, wastes bandwidth | Use SSE or WebSocket |
| WebSocket without heartbeat/ping | silent connection death | Implement ping/pong every 30s |
| SSE without Last-Event-ID | lose events on reconnect | Track and send Last-Event-ID |
| WebSocket for one-way server push | unnecessary complexity | Use SSE instead |
| No exponential backoff on reconnect | thundering herd on outage | Implement jittered backoff |
| Sending auth token in WS URL param | token in server logs/proxy | Use first-message auth or cookie |
| Not handling WebSocket bufferedAmount | memory leak on slow clients | Check before sending, apply backpressure |

────────────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

**Example 1 — Hruday's Bosch IoT Dashboard:**
At Bosch, Hruday built a WebSocket-based real-time dashboard for industrial sensor data. With
thousands of sensors publishing metrics every 100ms, WebSockets were chosen over SSE because:
- Bidirectional: operators could send threshold adjustments back
- Binary frames: protobuf-encoded sensor packets (40% smaller than JSON)
- Multiplexed channels per sensor group over a single connection

**Example 2 — SAP Lighthouse Notification System:**
During the Lighthouse performance optimization (60→95 score), Hruday migrated the notification
system from Short Polling (5s interval, 200 req/sec at 1K users) to SSE:
- Eliminated 98% of redundant requests
- Reduced P95 notification latency from 5s to <200ms
- Used `Last-Event-ID` for guaranteed delivery on reconnects
- Server memory: ~80 bytes per SSE connection vs ~2KB per polling context

**Example 3 — Payment Webhook → Browser Notification:**
In a micro-frontend architecture, Stripe payment webhook events were routed:
Stripe → Express webhook endpoint (HMAC verified) → Redis pub/sub → SSE endpoint → React UI
This avoided exposing the webhook endpoint to browsers while delivering real-time payment status.

────────────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

**Common interview questions:**
1. "How would you design a real-time notification system?"
2. "Compare WebSocket vs SSE — when would you use each?"
3. "How do you handle 1M concurrent connections?"
4. "What happens when a WebSocket connection drops?"

> **Sample Answer (Question 1):**
>
> "For a notification system, I'd start by clarifying the requirements. If it's purely
> server-to-client push — like the notification system I optimized at SAP — SSE is my
> default choice. It runs over standard HTTP, auto-reconnects via EventSource, and supports
> Last-Event-ID for gap recovery. At SAP, switching from 5-second short polling to SSE
> cut our P95 latency from 5 seconds to under 200ms and eliminated 98% of unnecessary
> requests.
>
> For bidirectional needs — like the real-time IoT dashboard I built at Bosch — WebSockets
> are the right call. We needed operators to send threshold updates back while receiving
> sensor data at 10Hz.
>
> At scale (100K+ connections), I'd add a Redis Pub/Sub fan-out layer so any application
> server can publish to all connected clients across the cluster. For 1M+, I'd introduce
> Kafka for durability and partition the connection tier behind an L4 load balancer with
> sticky sessions.
>
> If third-party events are involved — like Stripe payment confirmations — webhooks feed
> into the same pipeline: Stripe → our server (HMAC verified) → Redis → SSE to browser."

**Follow-up questions to prepare:**
- "How do you authenticate WebSocket connections?" → Cookie or first-message token exchange
- "What about mobile networks and disconnections?" → Exponential backoff + message queue
- "How do you ensure message ordering?" → Sequence numbers, per-partition ordering in Kafka
- "What's your monitoring strategy?" → Connection count, message throughput, reconnect rate

────────────────────────────────────────────────────────────────────────

## 5. Code Examples

See Section 2F for complete implementations of each pattern.

Additional — **React hook for adaptive transport selection:**

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';

type Transport = 'websocket' | 'sse' | 'polling';

interface UseRealtimeOptions {
  wsUrl: string;
  sseUrl: string;
  pollUrl: string;
  pollInterval?: number;
  onMessage: (data: unknown) => void;
}

function useRealtime({ wsUrl, sseUrl, pollUrl, pollInterval = 5000, onMessage }: UseRealtimeOptions) {
  const [transport, setTransport] = useState<Transport>('websocket');
  const wsRef = useRef<WebSocket | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    esRef.current?.close();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    cleanup();

    if (transport === 'websocket') {
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => onMessage(JSON.parse(e.data));
      ws.onerror = () => {
        ws.close();
        setTransport('sse'); // fallback
      };
      wsRef.current = ws;
    } else if (transport === 'sse') {
      const es = new EventSource(sseUrl);
      es.onmessage = (e) => onMessage(JSON.parse(e.data));
      es.onerror = () => {
        es.close();
        setTransport('polling'); // final fallback
      };
      esRef.current = es;
    } else {
      timerRef.current = setInterval(async () => {
        const res = await fetch(pollUrl);
        if (res.ok) onMessage(await res.json());
      }, pollInterval);
    }

    return cleanup;
  }, [transport, wsUrl, sseUrl, pollUrl, pollInterval, onMessage, cleanup]);

  return { transport };
}
```

────────────────────────────────────────────────────────────────────────

## 6. Why & How Summary

| Question | Answer |
|---|---|
| **Why does this matter?** | Choosing the wrong transport can 10× your infrastructure cost or produce unacceptable latency |
| **When does it come up in interviews?** | System design rounds (notifications, chat, dashboards, collaborative editing) |
| **How to decide quickly?** | Server→client text = SSE; bidirectional = WebSocket; server-to-server events = Webhooks; legacy/simple = Polling |
| **What's the modern trend?** | WebTransport for next-gen, but WebSocket + SSE remain production defaults in 2025 |
| **How did Hruday apply this?** | SSE for SAP notifications (60→95 Lighthouse), WebSocket for Bosch IoT dashboard, Webhooks+SSE for payment flows in micro-frontend architecture |
| **Key numbers to cite** | SSE: ~80B/conn RAM, auto-reconnect; WS: ~2KB/conn, full-duplex; Polling at 1K users ≈ 200 req/s |
| **Security angle** | WS auth via cookie/first-message (contributed to Hruday's 80% security vulnerability reduction at SAP); HMAC for webhooks; CORS for SSE |
| **Accessibility tie-in** | Real-time updates must announce via ARIA live regions — part of Hruday's WCAG AA certification work |

────────────────────────────────────────────────────────────────────────
*Prep file for Hruday — Microsoft, Adobe, Salesforce, Cisco interviews*
