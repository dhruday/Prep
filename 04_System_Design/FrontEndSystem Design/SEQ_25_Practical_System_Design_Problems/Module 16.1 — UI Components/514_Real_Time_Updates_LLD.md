# 514. Real-Time Updates LLD (Optimistic UI + Live Data)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
Real-Time Updates LLD encompasses the frontend patterns for displaying data that changes frequently — live dashboards, notification badges, stock tickers, collaborative editing cursors, and social media feeds. The core challenge is choosing the right transport (WebSocket, SSE, polling), implementing optimistic updates (show expected state immediately, reconcile with server later), handling stale data, managing connection lifecycle, and ensuring the UI remains responsive under continuous data flow.

**Why it exists:**
Modern users expect instant feedback. When you send a message in Slack, it appears immediately (optimistic). When a teammate edits a Google Doc, you see their cursor in real-time. When a stock price changes, the ticker updates without page refresh. Building these experiences requires a systematic approach to real-time data flow, not ad-hoc solutions.

**When and where it's used:**
- Chat applications (optimistic send, real-time receive)
- Notification systems (badge count, toast notifications)
- Collaborative editing (cursor presence, document sync)
- Live dashboards (metrics, monitoring, analytics)
- Social media feeds (new post injection, like counts)
- E-commerce (inventory count, price updates, flash sales)
- Gaming (leaderboards, matchmaking status)

**Role in large-scale applications:**
This is a common LLD interview question at Google, Meta, and Microsoft. It tests your understanding of the full real-time stack: transport selection, optimistic UI patterns, conflict resolution, connection management, and performance under continuous updates.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Transport Selection Decision Matrix**

| Factor | WebSocket | SSE (Server-Sent Events) | Polling | Long Polling |
|--------|-----------|--------------------------|---------|--------------|
| **Direction** | Bidirectional | Server → Client | Client → Server (pull) | Client → Server (pull) |
| **Latency** | ~50ms | ~100ms | Polling interval | ~100ms |
| **Connection** | Persistent | Persistent | New request each time | Held open |
| **HTTP/2 support** | Separate protocol | Multiplexed on HTTP/2 | Native | Native |
| **Reconnection** | Manual | Built-in (auto-reconnect) | Not needed | Manual |
| **Binary data** | ✅ Yes | ❌ No (text only) | ✅ Yes | ✅ Yes |
| **Proxy/firewall** | ⚠️ Some block | ✅ Works everywhere | ✅ Works everywhere | ✅ Works everywhere |
| **Scale cost** | High (persistent conn) | Medium | Low (stateless) | High (held conn) |
| **Best for** | Chat, gaming, collab | Notifications, feeds, dashboards | Simple status checks | Legacy real-time |

**Decision tree:**

```
Need bidirectional?
├── Yes → WebSocket (chat, gaming, collab editing)
└── No → Server pushes only?
    ├── Yes → SSE (notifications, live feed, dashboard)
    └── No → Polling (simple status, low-frequency checks)
```

### **B. Optimistic Update Pattern**

```
┌───────────────────────────────────────────────────────────┐
│               OPTIMISTIC UPDATE FLOW                       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  1. User Action (e.g., "Like" button click)              │
│     │                                                     │
│     ▼                                                     │
│  2. IMMEDIATELY update local state (optimistic)           │
│     → Show filled heart, increment count                  │
│     → Generate temporary ID                               │
│     │                                                     │
│     ├──── 3a. Send request to server ────────────────┐   │
│     │                                                │   │
│     │     ┌──── 4a. Server SUCCESS ──────┐           │   │
│     │     │  → Replace temp ID with real  │           │   │
│     │     │  → Merge server data          │           │   │
│     │     └──────────────────────────────┘           │   │
│     │                                                │   │
│     │     ┌──── 4b. Server FAILURE ──────┐           │   │
│     │     │  → ROLLBACK to previous state │           │   │
│     │     │  → Show error toast           │           │   │
│     │     │  → Queue for retry (optional) │           │   │
│     │     └──────────────────────────────┘           │   │
│     │                                                │   │
│     └── 3b. User sees result instantly ──────────────┘   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

```typescript
// ─── Optimistic Update Hook ────────────────────────
interface OptimisticOptions<T> {
  /** The optimistic state to show immediately */
  optimisticValue: T;
  /** The API call to make */
  apiCall: () => Promise<T>;
  /** Called on success with server response */
  onSuccess?: (serverValue: T) => void;
  /** Called on failure — should rollback */
  onError?: (error: Error, rollbackValue: T) => void;
}

function useOptimisticUpdate<T>(
  currentValue: T,
  setValue: (value: T) => void
) {
  const rollbackRef = useRef<T>(currentValue);

  const execute = useCallback(async (options: OptimisticOptions<T>) => {
    const { optimisticValue, apiCall, onSuccess, onError } = options;

    // Store rollback point
    rollbackRef.current = currentValue;

    // Apply optimistic update immediately
    setValue(optimisticValue);

    try {
      const serverValue = await apiCall();
      // Reconcile with server truth
      setValue(serverValue);
      onSuccess?.(serverValue);
    } catch (error) {
      // Rollback to pre-optimistic state
      setValue(rollbackRef.current);
      onError?.(error as Error, rollbackRef.current);
    }
  }, [currentValue, setValue]);

  return { execute };
}

// ─── Usage Example: Like Button ────────────────────
function LikeButton({ postId, initialLikes, initialLiked }: {
  postId: string;
  initialLikes: number;
  initialLiked: boolean;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);

  const handleLike = async () => {
    const newLiked = !liked;
    const newLikes = liked ? likes - 1 : likes + 1;

    // Optimistic: show immediately
    setLiked(newLiked);
    setLikes(newLikes);

    try {
      const result = await fetch(`/api/posts/${postId}/like`, {
        method: newLiked ? 'POST' : 'DELETE',
      });
      const data = await result.json();
      // Reconcile with actual server count
      setLikes(data.likeCount);
    } catch {
      // Rollback
      setLiked(!newLiked);
      setLikes(likes);
      toast.error('Failed to update. Please try again.');
    }
  };

  return (
    <button onClick={handleLike} aria-pressed={liked}>
      {liked ? '❤️' : '🤍'} {likes}
    </button>
  );
}
```

### **C. WebSocket Connection Manager**

```typescript
interface WSManagerOptions {
  url: string;
  onMessage: (data: unknown) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  maxReconnectAttempts?: number;
  heartbeatIntervalMs?: number;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private options: Required<WSManagerOptions>;

  constructor(options: WSManagerOptions) {
    this.options = {
      maxReconnectAttempts: 10,
      heartbeatIntervalMs: 30000,
      ...options,
    };
    this.connect();
  }

  private connect(): void {
    this.options.onStatusChange('connecting');
    this.ws = new WebSocket(this.options.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.options.onStatusChange('connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') return; // Heartbeat response
      this.options.onMessage(data);
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      if (!event.wasClean) {
        this.options.onStatusChange('disconnected');
        this.reconnect();
      }
    };

    this.ws.onerror = () => {
      this.options.onStatusChange('error');
    };
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.options.onStatusChange('error');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.options.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  destroy(): void {
    this.stopHeartbeat();
    this.ws?.close(1000, 'Client disconnect');
  }
}
```

### **D. Live Data Store Pattern**

```typescript
// Normalized store for real-time entities
interface LiveStore<T extends { id: string }> {
  entities: Map<string, T>;
  orderedIds: string[];
  lastUpdated: number;
}

class RealtimeStore<T extends { id: string }> {
  private store: LiveStore<T>;
  private subscribers: Set<() => void> = new Set();
  private updateQueue: T[] = [];
  private rafId: number | null = null;

  constructor() {
    this.store = { entities: new Map(), orderedIds: [], lastUpdated: 0 };
  }

  // Batch updates via rAF for performance
  upsert(item: T): void {
    this.updateQueue.push(item);
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  private flush(): void {
    this.rafId = null;
    const batch = this.updateQueue.splice(0);

    for (const item of batch) {
      const isNew = !this.store.entities.has(item.id);
      this.store.entities.set(item.id, item);
      if (isNew) this.store.orderedIds.push(item.id);
    }

    this.store.lastUpdated = Date.now();
    this.notify();
  }

  remove(id: string): void {
    this.store.entities.delete(id);
    this.store.orderedIds = this.store.orderedIds.filter((i) => i !== id);
    this.notify();
  }

  getAll(): T[] {
    return this.store.orderedIds.map((id) => this.store.entities.get(id)!);
  }

  getById(id: string): T | undefined {
    return this.store.entities.get(id);
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    this.subscribers.forEach((cb) => cb());
  }
}
```

### **E. Stale Data & Conflict Resolution**

| Strategy | How It Works | When to Use |
|----------|-------------|-------------|
| **Last-Write-Wins** | Latest timestamp overwrites | Simple counters, status updates |
| **Server Authority** | Always use server value on conflict | Financial data, inventory counts |
| **Client Priority** | Optimistic until server corrects | Low-stakes: likes, reactions |
| **Merge** | Combine both changes | Collaborative text editing (CRDT/OT) |
| **Version Vector** | Track per-user versions | Multi-user sync, offline-first |

### **F. Anti-Patterns**

1. **Not implementing reconnection** — WebSocket connections drop. Without exponential backoff reconnection, users see stale data permanently.
2. **Optimistic update without rollback** — If the API fails and you don't rollback, UI shows incorrect state.
3. **Re-rendering entire list on each update** — Use normalized stores and memoized selectors so only changed entities re-render.
4. **No connection status indicator** — Users should see "Reconnecting..." when the connection drops. Don't let them interact with stale data thinking it's live.
5. **Polling when SSE/WebSocket is appropriate** — Polling at 1-second intervals wastes bandwidth. SSE is simpler than WebSocket for server-push-only scenarios.

────────────────────────────────────
## 3. Real-World Examples
────────────────────────────────────

### Hruday's Experience
- **Bosch WebSocket Dashboard:** Live sensor data with reconnection logic and auto-scroll — directly maps to the connection manager + auto-scroll pattern.
- **SAP:** Fiori apps with real-time notification badges and optimistic form submissions.

### Google Docs
- Uses OT (Operational Transform) for conflict resolution
- Cursor presence via WebSocket
- Optimistic local edits, reconciled with server transforms

### Scale Evolution

| Scale | Pattern | Architecture |
|-------|---------|-------------|
| Simple | Polling (30s interval) | REST API + setInterval |
| Interactive | SSE for feeds, optimistic mutations | SSE + REST + local cache |
| Real-time | WebSocket full-duplex | WS connection manager + normalized store |
| Massive | Event streaming + edge workers | Kafka → WS fanout, CDN for static |

────────────────────────────────────
## 4. Interview-Oriented Answer
────────────────────────────────────

**Sample Answer (7+ years level):**

> "For real-time updates I use a layered approach. First, transport selection: WebSocket for bidirectional (chat, collab), SSE for server-push (notifications, feeds), polling for low-frequency checks.
>
> Second, optimistic updates for user-initiated actions: immediately update local state, send API request in background, reconcile on success or rollback on failure. This gives instant feedback.
>
> Third, a WebSocket connection manager with exponential backoff reconnection, heartbeat pings, and connection status indicator so users know when they're offline.
>
> Fourth, a normalized real-time store with rAF batching — incoming WebSocket updates queue up and flush once per frame to prevent re-render storms. Entities are stored in a Map for O(1) lookup, and React selectors ensure only changed components re-render.
>
> At Bosch, I built a live telemetry dashboard with WebSocket reconnection and auto-scroll — the same connection manager and batching patterns I'd apply here."

────────────────────────────────────
## 5. Full Working Code (TypeScript + React)
────────────────────────────────────

See sections 2.B (Optimistic Hook), 2.C (WebSocket Manager), and 2.D (RealtimeStore) for complete implementations. Together they form the full real-time update infrastructure:

```typescript
// Composing all patterns together
function useRealtimeData<T extends { id: string }>(wsUrl: string) {
  const store = useRef(new RealtimeStore<T>());
  const [data, setData] = useState<T[]>([]);
  const [status, setStatus] = useState<string>('connecting');

  useEffect(() => {
    const unsubscribe = store.current.subscribe(() => {
      setData(store.current.getAll());
    });

    const ws = new WebSocketManager({
      url: wsUrl,
      onMessage: (msg) => store.current.upsert(msg as T),
      onStatusChange: setStatus,
    });

    return () => {
      unsubscribe();
      ws.destroy();
    };
  }, [wsUrl]);

  return { data, status };
}
```

────────────────────────────────────
## 6. Memory Aid (Quick Recall)
────────────────────────────────────

**Real-time update stack:** "Transport (WS/SSE/Poll) → Batch (rAF) → Store (normalized) → Optimistic (instant UI + rollback)"

**If you go blank:** "Pick transport by direction (WS=bidirectional, SSE=server-push, polling=simple). Update UI optimistically for instant feedback. Reconnect with exponential backoff. Batch server updates via rAF to prevent re-render storms."

────────────────────────────────────
## 7. Why & How Summary
────────────────────────────────────

**Why it matters:**
→ Real-time UX is table-stakes for modern apps. Users expect instant feedback (optimistic) and live updates (WebSocket/SSE). Getting the transport selection, connection lifecycle, batching, and optimistic patterns right is what separates senior from mid-level engineers.

**How it works:**
→ WebSocket/SSE delivers server updates → rAF batcher collects per-frame → normalized store updates entities → React selectors trigger minimal re-renders. User actions use optimistic update pattern: show expected state immediately, reconcile with server, rollback on failure.

**Company relevance:**
→ **Google:** Gmail, Docs, Meet all use real-time updates with different transports. Google interviews test transport selection and optimistic update reasoning.
→ **Microsoft:** Teams chat, OneDrive sync, Azure portal dashboards — all real-time.
→ **SAP (Hruday's current):** Bosch WebSocket dashboard + SAP notification system experience maps directly.
