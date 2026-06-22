# 03 — Design Trello (Frontend System Design)

> ⚡ **Quick Summary:** Trello is a kanban board with drag-and-drop, real-time state sync, and virtualization for large boards. The key challenges are making drag-and-drop feel smooth (60fps), handling concurrent card moves from multiple users, and efficiently rendering boards with hundreds of cards across many columns.

---

## 🧠 Mental Model
Think of Trello as: **Nested sortable lists** (Board → Columns → Cards) + **real-time sync** (all users see moves instantly) + **optimistic UI** (card snaps to new position before server confirms).

---

## PART 1 — Problem Statement

### Functional Requirements
- Boards with multiple columns (lists)
- Cards within columns (with title, description, labels, due dates, attachments)
- Drag-and-drop cards between and within columns
- Real-time updates: see other users moving cards live
- Board membership and permissions
- Card activity log / comments
- Infinite boards per workspace

### Non-Functional Requirements
- Drag must be 60fps (smooth animation)
- Real-time updates < 200ms latency
- Boards with 50+ columns and 1000+ cards must still perform
- Offline: view boards, queue moves for when online

---

## PART 2 — Architecture

### High-Level
```
┌─────────────────────────────────────────────────┐
│                 BROWSER                          │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │            Board Page                      │ │
│  │  ┌────────────────────────────────────┐   │ │
│  │  │  Horizontal Scroll Container       │   │ │
│  │  │  ┌──────┐ ┌──────┐ ┌──────┐      │   │ │
│  │  │  │ Col1 │ │ Col2 │ │ Col3 │ ...  │   │ │
│  │  │  │Card  │ │Card  │ │      │      │   │ │
│  │  │  │Card  │ │      │ │Card  │      │   │ │
│  │  │  └──────┘ └──────┘ └──────┘      │   │ │
│  │  └────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  DnD Library → Zustand → WebSocket → React Query │
└─────────────────────────────────────────────────┘
```

---

## PART 3 — Drag and Drop Implementation

### Library Choice
```
dnd-kit   → Modern, accessibility-first, React-native ✅ Recommended
react-dnd → Older, uses HTML5 DnD API (has bugs on touch/mobile)
@dnd-kit  → Better touch support, works with virtualized lists

Never use: plain HTML5 drag events (inconsistent cross-browser)
```

### Core DnD Setup
```javascript
import { DndContext, closestCorners, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const Board = ({ columns }) => {
  const [activeCard, setActiveCard] = useState(null);
  
  const handleDragStart = ({ active }) => {
    setActiveCard(findCard(active.id));
  };
  
  const handleDragEnd = ({ active, over }) => {
    if (!over) return;
    
    const { sourceCol, sourceIndex } = findCardLocation(active.id);
    const { destCol, destIndex } = findDropTarget(over.id);
    
    if (sourceCol === destCol && sourceIndex === destIndex) return; // no change
    
    // 1. Optimistic update (instant UI)
    moveCard(active.id, destCol, destIndex);
    
    // 2. Persist to server (async)
    saveMoveToServer({ cardId: active.id, destCol, destIndex });
  };
  
  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <BoardColumns columns={columns} />
      
      {/* DragOverlay: renders card under cursor during drag */}
      <DragOverlay>
        {activeCard && <CardPreview card={activeCard} />}
      </DragOverlay>
    </DndContext>
  );
};
```

### Optimistic Card Move
```javascript
// State update BEFORE server confirms — makes UI feel instant
const moveCard = (cardId, destColumnId, destIndex) => {
  const previousState = boardStore.getState();
  
  // Update UI immediately
  boardStore.setState(moveCardInState(cardId, destColumnId, destIndex));
  
  // Then save to server
  api.moveCard({ cardId, destColumnId, destIndex })
    .catch(() => {
      // Rollback on error
      boardStore.setState(previousState);
      showToast('Failed to move card. Please try again.');
    });
};
```

---

## PART 4 — Real-Time Sync

### WebSocket Events
```javascript
// Server pushes these events to all users on the board
const BOARD_EVENTS = {
  CARD_MOVED:    'card:moved',    // { cardId, destCol, destIndex, userId }
  CARD_CREATED:  'card:created',  // { card, columnId }
  CARD_DELETED:  'card:deleted',  // { cardId }
  COLUMN_ADDED:  'column:added',  // { column }
  USER_JOINED:   'user:joined',   // { userId, name, avatar }
  USER_LEFT:     'user:left',     // { userId }
};

// Handle incoming updates
ws.on('card:moved', ({ cardId, destCol, destIndex, userId }) => {
  // Don't apply if WE sent this (would cause double-move)
  if (userId === currentUserId) return;
  
  // Apply remote move
  boardStore.setState(moveCardInState(cardId, destCol, destIndex));
  
  // Show "User moved this card" indicator briefly
  showCardActivity(cardId, userId, 'moved');
});
```

---

## PART 5 — Virtualization for Large Boards

### When to Virtualize
```
< 20 columns, < 50 cards per column → No virtualization needed
> 50 columns OR > 100 cards per column → Virtualize!

Virtualization options:
1. Virtual columns (horizontal virtual scroll)
2. Virtual cards within each column (vertical virtual scroll)
3. Both (for very large boards)
```

### Column Virtualization
```javascript
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualBoard = ({ columns }) => {
  const parentRef = useRef();
  
  const virtualizer = useVirtualizer({
    horizontal: true,
    count: columns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // column width
    overscan: 2, // render 2 columns outside visible area
  });
  
  return (
    <div ref={parentRef} style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ width: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <Column
            key={columns[virtualItem.index].id}
            column={columns[virtualItem.index]}
            style={{ 
              position: 'absolute', 
              left: `${virtualItem.start}px` 
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## PART 6 — Accessibility for Drag and Drop

### Keyboard DnD (dnd-kit built-in)
```
dnd-kit supports keyboard drag by default:
  Space       → Pick up / drop card
  Arrow keys  → Move card between positions
  Escape      → Cancel drag
  Tab         → Move focus between draggable items

Announce to screen readers:
  "Picked up card 'Fix login bug' from column 'To Do'"
  "Card moved to position 2 of 5 in column 'In Progress'"
  "Card dropped in column 'Done'"
```

---

## 🎯 Trello Cheat Sheet

```
Trello = dnd-kit + Zustand + WebSocket + react-virtual

Key Patterns:
  Optimistic UI     → Move card in state BEFORE server confirms
  DragOverlay       → Clone under cursor during drag (not the actual card)
  Rollback on error → Save previous state, restore if API fails
  Throttle WS       → Don't send move events more than 5x/sec

Don't use:
  HTML5 DnD API     → Mobile doesn't support it well
  react-beautiful-dnd → Deprecated by creator
```

---
---
---

# 04 — Design WhatsApp Web (Frontend System Design)

> ⚡ **Quick Summary:** WhatsApp Web is a real-time chat application with presence indicators, typing indicators, read receipts, media uploads, and Web Push notifications. The hardest parts are managing WebSocket connections reliably and syncing with the mobile phone (WhatsApp Web mirrors the phone — it's not a standalone app).

---

## 🧠 Mental Model
Think of WhatsApp Web as: **A real-time event stream** (messages, typing, presence, read receipts) + **a mirror of your phone** (all data lives on phone, web just displays it) + **a media pipeline** (upload, optimize, display images/video/audio).

---

## PART 1 — Problem Statement

### Functional Requirements
- Send and receive text messages in real-time
- Group chats
- Typing indicators ("John is typing...")
- Read receipts (single ✓, delivered ✓✓, read 🔵✓✓)
- Online/offline presence
- Media: images, video, audio, documents
- Voice notes
- End-to-end encryption display (not implementing E2E, but showing padlock)
- Web Push notifications when tab is in background

### Non-Functional Requirements
- Message delivery: exactly once (no duplicates)
- Latency: < 100ms for message delivery
- Media: upload progress, resume interrupted uploads
- Offline: show last messages, queue sends
- Scale: 2 billion users, WhatsApp handles 100 billion messages/day

---

## PART 2 — Architecture

```
┌────────────────────────────────────────────────────────────┐
│                         BROWSER                            │
│                                                            │
│  ┌──────────────────┐    ┌──────────────────────────────┐ │
│  │  Chat List       │    │  Chat View                   │ │
│  │  (Virtual List)  │    │  ┌────────────────────────┐  │ │
│  │  ┌────────────┐  │    │  │  Message List          │  │ │
│  │  │ John ✓✓🔵 │  │    │  │  (Virtualized)         │  │ │
│  │  │ Jane ✓✓   │  │    │  │  [Bubble] [Bubble]     │  │ │
│  │  │ Group 🔴3 │  │    │  └────────────────────────┘  │ │
│  │  └────────────┘  │    │  ┌────────────────────────┐  │ │
│  └──────────────────┘    │  │  "John is typing..."   │  │ │
│                          │  └────────────────────────┘  │ │
│                          │  ┌────────────────────────┐  │ │
│                          │  │  Message Input         │  │ │
│                          │  └────────────────────────┘  │ │
│                          └──────────────────────────────┘ │
│                                                            │
│  WebSocket Manager → IndexedDB → Zustand → React Query    │
└────────────────────────────────────────────────────────────┘
```

---

## PART 3 — WebSocket Management

### Connection Manager
```javascript
class WhatsAppWebSocket {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30_000;
    this.messageQueue = []; // queue while disconnected
  }
  
  connect(token) {
    this.ws = new WebSocket(`wss://web.whatsapp.com/ws?token=${token}`);
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.flushQueue(); // send queued messages
      this.emit('connected');
    };
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleMessage(msg);
    };
    
    this.ws.onclose = () => {
      this.scheduleReconnect();
    };
    
    this.ws.onerror = () => {
      this.ws.close(); // triggers onclose → reconnect
    };
  }
  
  scheduleReconnect() {
    // Exponential backoff: 1s, 2s, 4s, 8s, ... max 30s
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxReconnectDelay);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
    this.emit('reconnecting', { delay, attempt: this.reconnectAttempts });
  }
  
  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message); // queue for later
    }
  }
  
  flushQueue() {
    while (this.messageQueue.length) {
      this.ws.send(JSON.stringify(this.messageQueue.shift()));
    }
  }
}
```

---

## PART 4 — Real-Time Features

### Typing Indicators
```javascript
// Throttle typing events (don't send on every keystroke)
const useTypingIndicator = (chatId) => {
  const isTypingRef = useRef(false);
  const stopTypingTimer = useRef(null);
  
  const onInput = useCallback(() => {
    if (!isTypingRef.current) {
      ws.send({ type: 'typing:start', chatId });
      isTypingRef.current = true;
    }
    
    // Reset 3-second timer
    clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      ws.send({ type: 'typing:stop', chatId });
      isTypingRef.current = false;
    }, 3000);
  }, [chatId]);
  
  return { onInput };
};
```

### Read Receipts
```javascript
// Track when messages become visible to user
const useMessageReadTracking = (messages, chatId) => {
  const observer = useRef(null);
  
  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        const visibleMessageIds = entries
          .filter(e => e.isIntersecting)
          .map(e => e.target.dataset.messageId)
          .filter(id => !readMessageIds.has(id));
        
        if (visibleMessageIds.length) {
          ws.send({ type: 'messages:read', chatId, messageIds: visibleMessageIds });
          visibleMessageIds.forEach(id => readMessageIds.add(id));
        }
      },
      { threshold: 0.5 } // 50% of message visible = "read"
    );
    
    // Observe all unread message elements
    document.querySelectorAll('[data-unread]').forEach(el => {
      observer.current.observe(el);
    });
    
    return () => observer.current.disconnect();
  }, [messages]);
};
```

### Presence (Online/Offline)
```javascript
// Show "online" status from WebSocket events
const presenceStore = create((set) => ({
  presence: {}, // { userId: { online: true, lastSeen: Date } }
  
  setPresence: (userId, data) => set(state => ({
    presence: { ...state.presence, [userId]: data }
  })),
}));

// Server sends presence events
ws.on('presence:update', ({ userId, online, lastSeen }) => {
  presenceStore.getState().setPresence(userId, { online, lastSeen });
});

// Subscribe in component
const PresenceIndicator = ({ userId }) => {
  const presence = usePresenceStore(state => state.presence[userId]);
  
  if (presence?.online) return <span className="online-dot" aria-label="Online" />;
  if (presence?.lastSeen) return <span>Last seen {formatRelativeTime(presence.lastSeen)}</span>;
  return null;
};
```

---

## PART 5 — Media Upload

### Chunked Upload with Progress
```javascript
const uploadMedia = async (file, chatId) => {
  const CHUNK_SIZE = 512 * 1024; // 512KB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = generateId();
  
  // Show upload progress
  updateUploadProgress(uploadId, 0);
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);
    
    await fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
      signal: abortController.signal, // support cancel
    });
    
    const progress = ((chunkIndex + 1) / totalChunks) * 100;
    updateUploadProgress(uploadId, progress);
  }
  
  // Finalize upload
  const { url } = await fetch('/api/media/complete', {
    method: 'POST',
    body: JSON.stringify({ uploadId, chatId }),
  }).then(r => r.json());
  
  return url;
};
```

---

## PART 6 — Message Virtualization

### Virtual Message List
```javascript
// Chat with 10,000+ messages needs virtualization
const MessageList = ({ messages, chatId }) => {
  const parentRef = useRef();
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // estimated message height
    // Messages have variable height (text length varies)
    measureElement: (element) => element.getBoundingClientRect().height,
  });
  
  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    virtualizer.scrollToIndex(messages.length - 1, { behavior: 'smooth' });
  }, [messages.length]);
  
  return (
    <div ref={parentRef} style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => (
          <MessageBubble
            key={messages[item.index].id}
            message={messages[item.index]}
            style={{ 
              position: 'absolute', 
              top: `${item.start}px`,
              width: '100%'
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## PART 7 — Notifications

### Web Push Setup
```javascript
// Request notification permission
const requestNotifications = async () => {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.VAPID_PUBLIC_KEY,
    });
    await saveSubscriptionToServer(subscription);
  }
};

// Service Worker: handle push when tab is closed
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(`${data.sender}: ${data.preview}`, {
      icon: data.senderAvatar,
      badge: '/icon-badge.png',
      data: { chatId: data.chatId }, // used when notification clicked
      tag: data.chatId, // replace existing notification from same chat
      renotify: true,
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(`/chat/${event.notification.data.chatId}`)
  );
});
```

---

## 🎯 WhatsApp Web Cheat Sheet

```
WhatsApp Web = WebSocket + Zustand + react-virtual + IntersectionObserver + SW Push

Key Patterns:
  Exponential backoff  → Reconnect 1s, 2s, 4s, 8s, max 30s
  Message queue        → Queue sends while disconnected
  Optimistic messages  → Show message immediately before server confirms
  Typing throttle      → Send typing:start once, reset 3s timer on each keystroke
  Read receipts        → IntersectionObserver (50% visible = read)
  Chunked upload       → 512KB chunks, resume on failure

Status Icons:
  ⏰ → Pending (queued, not sent)
  ✓  → Sent to server
  ✓✓ → Delivered to recipient's device
  🔵✓✓→ Read by recipient

WebSocket Events to Handle:
  message:new, message:status, typing:start, typing:stop,
  presence:update, chat:read, media:uploaded
```

---
---
---

# 05 — Design Analytics Dashboard (Frontend System Design)

> ⚡ **Quick Summary:** An analytics dashboard displays live and historical data through charts, KPI widgets, and filters. The hard parts are handling live data updates without re-rendering everything, making charts performant with large datasets, and building a flexible widget system that users can customize.

---

## 🧠 Mental Model
Think of an Analytics Dashboard as: **A grid of independent data subscribers** where each widget subscribes to specific metrics, refreshes on its own schedule, and can be filtered/drilled into. The architecture is about **data isolation** — a chart updating shouldn't re-render unrelated widgets.

---

## PART 1 — Functional Requirements
- KPI cards (single metric, sparkline)
- Charts: line, bar, pie, area, funnel, scatter
- Filters: date range, dimensions (country, product, user segment)
- Drilldowns: click a bar → see breakdown
- Real-time mode: auto-refresh every N seconds
- Custom dashboards: add/remove/resize/reorder widgets
- Export: PNG, PDF, CSV

---

## PART 2 — Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     BROWSER                              │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Dashboard Shell                         │   │
│  │  ┌────────┐ ┌────────────────────────────────┐  │   │
│  │  │Filter  │ │  Widget Grid (react-grid-layout) │  │   │
│  │  │Panel   │ │  ┌──────────┐ ┌──────────────┐ │  │   │
│  │  │        │ │  │ KPI Card │ │  Line Chart  │ │  │   │
│  │  │        │ │  │ $2.3M    │ │  (Recharts)  │ │  │   │
│  │  │        │ │  └──────────┘ └──────────────┘ │  │   │
│  │  │        │ │  ┌──────────┐ ┌──────────────┐ │  │   │
│  │  │        │ │  │ Bar Chart│ │  Funnel      │ │  │   │
│  │  └────────┘ │  └──────────┘ └──────────────┘ │  │   │
│  │             └────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  React Query (per widget) + Zustand (filters) + SSE (live)│
└──────────────────────────────────────────────────────────┘
```

---

## PART 3 — Widget System

### Widget Registry Pattern
```javascript
// Register widget types
const WIDGET_REGISTRY = {
  kpi_card: {
    component: KPICard,
    defaultSize: { w: 2, h: 2 },
    configSchema: { metric: 'string', comparison: 'enum[wow, mom, yoy]' },
  },
  line_chart: {
    component: LineChartWidget,
    defaultSize: { w: 4, h: 3 },
    configSchema: { metrics: 'string[]', granularity: 'enum[hour, day, week]' },
  },
  bar_chart: {
    component: BarChartWidget,
    defaultSize: { w: 4, h: 3 },
    configSchema: { metric: 'string', dimension: 'string', limit: 'number' },
  },
};

// Render any widget by type
const WidgetRenderer = ({ widget }) => {
  const WidgetComponent = WIDGET_REGISTRY[widget.type]?.component;
  if (!WidgetComponent) return <ErrorWidget message="Unknown widget type" />;
  return <WidgetComponent config={widget.config} filters={globalFilters} />;
};
```

### Data Isolation Per Widget
```javascript
// Each widget fetches its own data independently
const LineChartWidget = ({ config, filters }) => {
  const { data, isLoading, isError } = useQuery(
    // Unique cache key per widget config + global filters
    ['chart', 'line', config.metrics, config.granularity, filters],
    () => fetchMetrics({ ...config, ...filters }),
    {
      staleTime: config.refreshInterval || 60_000,
      refetchInterval: config.liveMode ? 30_000 : false, // auto-refresh
    }
  );
  
  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ChartError onRetry={refetch} />;
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        {config.metrics.map(metric => (
          <Line key={metric} dataKey={metric} type="monotone" />
        ))}
        <XAxis dataKey="timestamp" tickFormatter={formatDate} />
        <YAxis tickFormatter={formatNumber} />
        <Tooltip />
        <Legend />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

---

## PART 4 — Filters Architecture

### Global Filter State
```javascript
// Filters stored in URL (shareable dashboards!)
const useFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters = {
    dateRange: {
      start: searchParams.get('start') || defaultStart,
      end: searchParams.get('end') || defaultEnd,
    },
    country: searchParams.getAll('country'),
    product: searchParams.getAll('product'),
  };
  
  const setFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (Array.isArray(value)) {
        next.delete(key);
        value.forEach(v => next.append(key, v));
      } else {
        next.set(key, value);
      }
      return next;
    });
  };
  
  return { filters, setFilter };
};
// Result: Dashboard state is in URL → shareable, bookmarkable, back-button works ✅
```

---

## PART 5 — Live Data with SSE

### Server-Sent Events for Live Metrics
```javascript
// SSE is perfect for one-way live metrics (no need for WebSocket)
const useLiveMetrics = (metricId) => {
  const [value, setValue] = useState(null);
  
  useEffect(() => {
    const sse = new EventSource(`/api/metrics/${metricId}/live`);
    
    sse.onmessage = (event) => {
      setValue(JSON.parse(event.data));
    };
    
    sse.onerror = () => {
      sse.close();
      // Fallback to polling
      const interval = setInterval(() => fetchMetric(metricId).then(setValue), 30_000);
      return () => clearInterval(interval);
    };
    
    return () => sse.close();
  }, [metricId]);
  
  return value;
};
```

---

## PART 6 — Performance with Large Datasets

### Canvas-Based Charts for 100K+ Points
```javascript
// Use canvas-based charts for massive datasets
// Recharts/Chart.js use SVG → slow with 10K+ data points
// Apache ECharts / Visx use Canvas → handles 100K+ points

import * as echarts from 'echarts';

const LargeDataChart = ({ data }) => {
  const chartRef = useRef();
  
  useEffect(() => {
    const chart = echarts.init(chartRef.current, null, {
      renderer: 'canvas', // Canvas is 10x faster than SVG for large data
    });
    
    chart.setOption({
      series: [{ 
        type: 'line', 
        data,
        sampling: 'lttb', // Largest Triangle Three Buckets algorithm
        // Intelligently downsamples 100K points to ~1000 visible points
      }],
    });
    
    return () => chart.dispose();
  }, [data]);
  
  return <div ref={chartRef} style={{ height: 400 }} />;
};
```

### Data Downsampling
```javascript
// Never render 100K points — downsample to ~1000
// LTTB algorithm preserves visual shape while reducing points

const downsampleData = (data, targetPoints) => {
  if (data.length <= targetPoints) return data;
  
  // Use LTTB (Largest Triangle Three Buckets) for visual accuracy
  // Available in 'downsample' npm package
  return lttb(data, targetPoints);
};
```

---

## PART 7 — Dashboard Customization (Drag-to-Resize Grid)

```javascript
import GridLayout from 'react-grid-layout';

const CustomDashboard = ({ widgets, onLayoutChange }) => {
  const layout = widgets.map(w => ({
    i: w.id,
    x: w.position.x,
    y: w.position.y,
    w: w.size.w,
    h: w.size.h,
    minW: 2,
    minH: 2,
  }));
  
  return (
    <GridLayout
      layout={layout}
      cols={12}
      rowHeight={80}
      onLayoutChange={(newLayout) => {
        // Debounce save to server
        debouncedSaveLayout(newLayout);
        onLayoutChange(newLayout);
      }}
      isDraggable={isEditMode}
      isResizable={isEditMode}
    >
      {widgets.map(widget => (
        <div key={widget.id}>
          <WidgetRenderer widget={widget} />
        </div>
      ))}
    </GridLayout>
  );
};
```

---

## 🎯 Analytics Dashboard Cheat Sheet

```
Analytics Dashboard = React Query (per widget) + Recharts/ECharts + URL filters + SSE (live)

Key Decisions:
  SVG charts (Recharts)  → < 1000 data points (good DX, interactive)
  Canvas charts (ECharts)→ > 10K data points (performance critical)
  LTTB downsampling     → Reduce 100K → 1000 points visually accurately
  URL-based filters     → Dashboards are shareable and bookmarkable
  SSE vs WebSocket      → SSE for metrics (one-way), WS for chat (bidirectional)
  Per-widget queries    → Data isolation, independent refresh rates

Performance Rules:
  1. Each widget is an independent React Query subscriber
  2. Filter changes invalidate ALL widget queries simultaneously
  3. Canvas rendering for > 5K data points
  4. Skeleton loaders while each widget loads independently
  5. Virtualize widget grid if > 50 widgets
```
