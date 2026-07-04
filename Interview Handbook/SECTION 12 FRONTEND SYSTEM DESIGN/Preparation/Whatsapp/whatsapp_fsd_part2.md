<a name="ch11"></a>
# Chapter 11: Offline First Architecture

## 11.1 Philosophy

"Offline First" doesn't mean "assume no internet". It means: **design the UI to work fully with local data, and treat network as an enhancement, not a dependency**. For WhatsApp Web — where a user might lose WiFi momentarily on a commute — the experience should remain seamless: read old messages, compose new ones, see everything sync automatically the instant connectivity returns.

```
OFFLINE FIRST MENTAL MODEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WRONG APPROACH (Network First):
  User action → Network request → Update UI
  Failure → Show error
  Offline → App breaks

CORRECT APPROACH (Offline First):
  User action → Update local state immediately
             → Persist to IndexedDB
             → THEN attempt network sync
             → On success: reconcile
             → On failure: queue for retry
             → User experience: NEVER blocked by network
```

## 11.2 IndexedDB Schema Design

```ts
// Using Dexie.js (IndexedDB wrapper) for cleaner API
// db/schema.ts

import Dexie, { Table } from 'dexie';

export class WhatsAppDB extends Dexie {
  messages!: Table<MessageRecord>;
  chats!: Table<ChatRecord>;
  contacts!: Table<ContactRecord>;
  pendingMessages!: Table<PendingMessageRecord>;
  mediaCache!: Table<MediaCacheRecord>;
  syncState!: Table<SyncStateRecord>;

  constructor() {
    super('WhatsAppWebDB');
    
    this.version(1).stores({
      // Primary key + indexes
      messages: '++, id, chatId, senderId, timestamp, status, [chatId+timestamp]',
      chats: 'id, lastMessageTimestamp, isArchived, isPinned',
      contacts: 'id, phone, name',
      pendingMessages: '++id, chatId, queuedAt, status',
      mediaCache: 'mediaId, mimeType, cachedAt',
      syncState: 'chatId',
    });
  }
}

// Message record structure
interface MessageRecord {
  id: string;                   // Server ID (or tempId if pending)
  chatId: string;
  senderId: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'document';
  content: string;              // Encrypted content or text
  timestamp: number;            // Unix ms
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyToId?: string;
  mediaId?: string;
  isOptimistic?: boolean;       // tempId flag
  syncedAt?: number;
}

// Pending message for offline queue
interface PendingMessageRecord {
  id?: number;                  // Auto-increment
  tempId: string;
  chatId: string;
  payload: OutboundMessage;
  queuedAt: number;
  attempts: number;
  lastAttemptAt?: number;
  status: 'queued' | 'sending' | 'failed';
}

// Sync checkpoint per chat
interface SyncStateRecord {
  chatId: string;
  lastSyncedMessageId: string | null;
  lastSyncedTimestamp: number | null;
  lastSyncedAt: number;
}

export const db = new WhatsAppDB();
```

## 11.3 Offline Queue Implementation

```ts
// services/offlineQueue.ts
class OfflineQueue {
  private isFlushing = false;

  async enqueue(message: OutboundMessage): Promise<void> {
    await db.pendingMessages.add({
      tempId: message.tempId,
      chatId: message.chatId,
      payload: message,
      queuedAt: Date.now(),
      attempts: 0,
      status: 'queued',
    });
    
    // Update Redux to show pending count
    store.dispatch(incrementPendingCount());
  }

  async drain(wsClient: WebSocketClient): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      const pending = await db.pendingMessages
        .where('status').equals('queued')
        .sortBy('queuedAt');  // Preserve send order

      for (const record of pending) {
        try {
          await db.pendingMessages.update(record.id!, { status: 'sending' });
          
          const result = await wsClient.sendMessage(record.payload);
          
          // Success: remove from queue, update message in DB
          await db.pendingMessages.delete(record.id!);
          await db.messages.update(record.tempId, {
            id: result.serverId,
            status: 'sent',
            isOptimistic: false,
          });
          
          store.dispatch(confirmMessage({
            tempId: record.tempId,
            serverId: result.serverId,
            chatId: record.chatId,
          }));
          
        } catch (err) {
          // Failed: increment attempts, reset to queued
          await db.pendingMessages.update(record.id!, {
            status: 'queued',
            attempts: record.attempts + 1,
            lastAttemptAt: Date.now(),
          });
          
          // If max attempts reached, mark as permanently failed
          if (record.attempts >= 5) {
            await db.pendingMessages.update(record.id!, { status: 'failed' });
            store.dispatch(failMessage({ tempId: record.tempId, chatId: record.chatId }));
          }
        }
      }
    } finally {
      this.isFlushing = false;
      store.dispatch(syncPendingCount(await db.pendingMessages.count()));
    }
  }

  async getPendingCount(): Promise<number> {
    return db.pendingMessages.where('status').anyOf(['queued', 'sending']).count();
  }
}

export const offlineQueue = new OfflineQueue();
```

## 11.4 Sync Protocol on Reconnect

```
DELTA SYNC ALGORITHM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On reconnect, client must determine:
1. What messages did I miss while offline?
2. What status updates (delivered/read) did I miss?
3. What presence changes happened?

APPROACH: Per-chat sync watermark

For each chat, store in IndexedDB:
  { chatId, lastSyncedMessageId, lastSyncedTimestamp }

On reconnect, send these watermarks to server:
  { chatId: "c1", since: "msg_500", ts: 1705316400000 }
  { chatId: "c2", since: "msg_200", ts: 1705316380000 }
  ...

Server computes delta:
  SELECT * FROM messages WHERE chatId = 'c1' AND id > 'msg_500'

Server sends back:
  { messages: [...], statusUpdates: [...], presenceChanges: [...] }

Client processes:
  1. Deduplicate against local DB
  2. Insert missing messages into IndexedDB
  3. Dispatch batch update to Redux
  4. Update sync watermarks
  5. Send read receipts for open chats
  6. Drain offline queue (outbound messages)
```

## 11.5 Conflict Resolution

```
CONFLICT SCENARIOS AND RESOLUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONFLICT 1: Message edit while offline
  - User edits message M locally (version A)
  - Server has edit from another device (version B)
  - Resolution: LAST-WRITE-WINS on server timestamp
    → Server timestamp > local timestamp → server version wins
    → Client discards local edit, shows server version
    → UI shows "edited" indicator

CONFLICT 2: Message deleted for everyone while offline
  - User sees message locally that server deleted
  - Resolution: Server deletion is authoritative
    → On sync, delete event arrives
    → Remove from local DB, show "This message was deleted"

CONFLICT 3: Same message sent twice (duplicate send)
  - Client sends M → ACK lost → client resends M
  - Resolution: Server deduplicates by tempId
    → Returns same serverId for both sends
    → Client deduplicates by serverId in local DB

CONFLICT 4: Typing indicator race
  - User A types → indicator shown → goes offline → comes back
  - Resolution: Typing indicators have TTL (5s)
    → Server auto-expires typing state
    → No conflict — state is ephemeral, not synced

RESOLUTION STRATEGY MATRIX:
  ┌────────────────────────┬─────────────────────────┐
  │ Conflict Type          │ Resolution               │
  ├────────────────────────┼─────────────────────────┤
  │ Text message edit      │ Last-write-wins (server) │
  │ Message deletion       │ Server authoritative      │
  │ Duplicate message      │ Idempotency key (tempId) │
  │ Unread count           │ Server count wins         │
  │ Typing indicator       │ TTL expiry (no conflict)  │
  │ Presence status        │ Most recent event wins    │
  └────────────────────────┴─────────────────────────┘
```

## 11.6 Connectivity Detection

```tsx
// hooks/useConnectivity.ts
function useConnectivity() {
  const dispatch = useDispatch();
  
  useEffect(() => {
    const handleOnline = () => {
      dispatch(setOnline(true));
      // Trigger WebSocket reconnect + drain offline queue
      wsManager.reconnect().then(() => {
        offlineQueue.drain(wsManager.client);
      });
    };
    
    const handleOffline = () => {
      dispatch(setOnline(false));
      // Show offline banner
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Also detect via WebSocket heartbeat failure
    wsManager.on('dead', handleOffline);
    wsManager.on('reconnected', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);
  
  return {
    isOnline: useSelector(selectIsOnline),
    wsStatus: useSelector(selectWsStatus),
    pendingCount: useSelector(selectPendingCount),
  };
}

// ConnectivityBanner.tsx
function ConnectivityBanner() {
  const { isOnline, wsStatus, pendingCount } = useConnectivity();
  
  if (isOnline && wsStatus === 'connected') return null;
  
  return (
    <div role="status" className="connectivity-banner">
      {!isOnline && (
        <span>⚠️ You are offline. {pendingCount} message(s) pending.</span>
      )}
      {isOnline && wsStatus === 'reconnecting' && (
        <span>🔄 Reconnecting...</span>
      )}
    </div>
  );
}
```

## 11.7 Service Worker for Asset Offline

```js
// service-worker.js
const CACHE_NAME = 'whatsapp-web-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/css/main.chunk.css',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/api/')) {
    // Network first for API calls
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response('{"error":"offline"}', {
          headers: { 'Content-Type': 'application/json' }
        }))
    );
  } else if (url.hostname.includes('cdn.')) {
    // Cache first for CDN media
    event.respondWith(
      caches.match(event.request).then(cached => 
        cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
      )
    );
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
```

---

> **💡 Interview Tip (Chapter 11):** Interviewers love asking "What happens if the user sends a message while offline?" Walk through: (1) message goes into IndexedDB-backed offline queue, (2) UI shows it with a clock icon, (3) `navigator.onLine` event fires when network returns, (4) WS reconnects, (5) queue drains in order, (6) server deduplicates via tempId. Mention service worker for asset caching. This is a complete answer.

---

<a name="ch12"></a>
# Chapter 12: Rendering Strategy

## 12.1 The Four Rendering Strategies

```
RENDERING STRATEGY COMPARISON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CSR (Client-Side Rendering)
  ─────────────────────────────────────────────────────────────
  Browser downloads empty HTML + JS bundle
  JS executes → React renders UI → Fetches data → Shows content
  
  Pros:  Full offline capability, Rich interactions, No server compute
  Cons:  Slow initial load, Poor SEO, JS bundle size matters heavily
  
  Use case: WhatsApp Web ✅ (logged-in app, SEO irrelevant)

SSR (Server-Side Rendering)
  ─────────────────────────────────────────────────────────────
  Server renders HTML for each request
  Browser gets pre-filled HTML → Hydrates with React
  
  Pros:  Fast FCP (first content visible), Good SEO, Works without JS
  Cons:  Server load scales with traffic, Hydration cost, No offline
  
  Use case: Marketing page, Login screen ✅ (SEO needed)

SSG (Static Site Generation)
  ─────────────────────────────────────────────────────────────
  HTML generated at build time
  
  Pros:  Fastest possible delivery, CDN cacheable, No server needed
  Cons:  Content is stale until rebuild, Can't be personalized
  
  Use case: Help center, FAQ, Blog ✅

ISR (Incremental Static Regeneration) / Streaming
  ─────────────────────────────────────────────────────────────
  HTML streamed from server as content resolves
  Critical shell HTML sent first, below-fold filled progressively
  
  Use case: News feeds, Product listings ✅

REACT SERVER COMPONENTS (RSC)
  ─────────────────────────────────────────────────────────────
  Components run on server, never sent to client
  No JS bundle for server components
  
  Use case: Data-heavy reads that don't need interactivity ✅
```

## 12.2 Why WhatsApp Web Uses CSR

```
REASONING FOR CSR IN WHATSAPP WEB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. AUTHENTICATION WALL
   Every route requires authentication.
   SSR would need to forward JWT to server per navigation.
   CSR: JS checks auth in memory, no server roundtrip per route.

2. OFFLINE REQUIREMENT
   Service Workers + IndexedDB need JavaScript environment.
   Pure SSR pages reload and lose all local state.
   CSR: Single SPA instance, persistent in-memory state.

3. REAL-TIME DOMINANCE
   UI is driven by WebSocket events, not page navigation.
   New message → Redux → React re-render. No page load.
   SSR is designed for request-response. CSR fits event-driven.

4. SEO IRRELEVANCE
   WhatsApp messages are private. No search engines crawl them.
   The one page needing SEO (marketing landing) is separate.

5. PERSISTENT TAB BEHAVIOR
   WhatsApp Web is left open as a persistent tab.
   Users don't navigate away — SPA is perfect.
   Initial load time matters, but only once per session (not per message).

6. COMPLEXITY OF HYDRATION
   10,000 messages + typing indicators + presence = massive state.
   Hydrating SSR'd HTML with this state is error-prone.
   CSR: React owns the DOM from the start, no hydration mismatches.
```

## 12.3 Performance Timeline for CSR

```
CSR LOADING TIMELINE (WhatsApp Web, 4G)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

0ms      → Browser requests index.html
50ms     → Server returns minimal HTML (shell + <script> tags)
50-400ms → Browser downloads JS bundle (code-split, parallel)
400ms    → React boots, checks auth (IndexedDB / localStorage)
400-500ms→ Auth valid? → Render app skeleton (sidebar + chat area)
500-700ms→ IndexedDB hydration: load cached chats + messages
700ms    → FIRST MEANINGFUL PAINT: User sees chat list ✅
700-900ms→ Establish WebSocket connection
900ms    → Request fresh data (chat list, active chat messages)
1000ms   → Sync any missed messages from server
1200ms   → FULLY INTERACTIVE: Real-time ready ✅

KEY OPTIMIZATIONS:
  → Split bundle: auth chunk loads first (50KB), chat chunk lazy (~300KB)
  → IndexedDB pre-populates UI before API call (perceived instant load)
  → Skeleton screens during all loading states
  → WebSocket connects in parallel with IndexedDB read
```

## 12.4 Code Splitting Strategy

```tsx
// Lazy load heavy features to reduce initial bundle

// app/router.tsx
const ChatPage = lazy(() => import('../features/chats/ChatPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const StatusPage = lazy(() => import('../features/status/StatusPage'));
const MediaViewer = lazy(() => import('../features/media/MediaViewer'));

// EmojiPicker is large (emoji data) — lazy load on first click
const EmojiPicker = lazy(() => import('../features/messages/components/EmojiPicker'));

// Bundle analysis targets:
// Initial bundle:   < 150KB gzipped (auth + core shell)
// Chat bundle:      < 300KB gzipped (main app)
// Emoji bundle:     < 200KB gzipped (emoji data)
// Media bundle:     < 100KB gzipped (video player, PDF viewer)

// Preload next likely bundles:
function ChatLayout() {
  useEffect(() => {
    // Preload EmojiPicker after initial render (high probability user clicks it)
    const preload = () => import('../features/messages/components/EmojiPicker');
    const timer = setTimeout(preload, 3000); // After 3s idle
    return () => clearTimeout(timer);
  }, []);
  
  return <Layout />;
}
```

---

> **💡 Interview Tip (Chapter 12):** Always explain WHY before stating the choice. Don't just say "WhatsApp uses CSR." Say: "WhatsApp Web is an authenticated, offline-capable, real-time SPA. SSR would fight the offline-first requirement (service workers need JS), create hydration complexity for real-time state, and add server compute costs for zero SEO benefit. CSR with aggressive code-splitting, IndexedDB pre-population, and skeleton screens achieves a <1s perceived load. The landing page (marketing, download links) uses SSR for SEO — a hybrid approach."

---

<a name="ch13"></a>
# Chapter 13: Performance Optimization

## 13.1 Virtualized Message List

The single most impactful performance optimization in WhatsApp Web. A chat with 10,000 messages cannot render all 10,000 DOM nodes simultaneously — that would crash the browser (10K nodes × ~1500 bytes each = 15MB of DOM).

```
VIRTUALIZATION CONCEPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WITHOUT VIRTUALIZATION:
  DOM: [msg_1][msg_2][msg_3]...[msg_10000]
  All 10,000 nodes in DOM = 🔥 Browser laggy/crashed

WITH VIRTUALIZATION (Windowing):
  DOM: [msg_498][msg_499][msg_500][msg_501][msg_502]
  Only visible messages + overscan buffer (~20-30) in DOM
  As user scrolls, components are recycled (reused DOM nodes)

  ┌─────────────────────────────────────┐
  │                                     │ ← Scroll container
  │  [Virtual spacer: 9800px height]    │ ← Maintains scroll position
  │                                     │
  │  ┌──[msg_498]──────────────────┐   │
  │  │  Hello! How are you?        │   │ ← VIEWPORT
  │  │  ✓✓ 10:30 AM               │   │   (only these
  │  └────────────────────────────────┘  │    rendered)
  │  ┌──[msg_499]──────────────────┐   │
  │  │  Good, thanks! And you?     │   │
  │  └────────────────────────────────┘  │
  │  [Virtual spacer: 200px height]     │
  └─────────────────────────────────────┘
```

```tsx
// Using @tanstack/react-virtual for message list
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList({ chatId }: { chatId: string }) {
  const messages = useSelector(selectMessagesByChatId(chatId));
  const containerRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const msg = messages[index];
      // Estimate height by type to reduce layout shift
      switch (msg.type) {
        case 'text': return 60 + Math.ceil(msg.content.length / 40) * 20;
        case 'image': return 280;
        case 'video': return 220;
        case 'voice': return 72;
        default: return 80;
      }
    },
    overscan: 5,          // Render 5 extra above/below viewport
    scrollToFn: ...       // Custom scroll behavior for auto-scroll
  });
  
  return (
    <div ref={containerRef} className="message-list-container">
      {/* Total height spacer */}
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={message.id}
              ref={virtualizer.measureElement}       // Dynamic height measurement
              data-index={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MessageBubbleContainer messageId={message.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## 13.2 Memoization Strategy

```tsx
// MESSAGE BUBBLE — Memoize with custom comparison
const MessageBubble = React.memo(
  function MessageBubble({ message, onReply, onDelete }: MessageBubbleProps) {
    return (
      <div className={`bubble ${message.senderId === myId ? 'sent' : 'received'}`}>
        {/* ... */}
      </div>
    );
  },
  // Custom comparator — only re-render if relevant fields change
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.status === nextProps.message.status &&     // Status changes
      prevProps.message.content === nextProps.message.content &&   // Edits
      prevProps.message.reactions?.length === nextProps.message.reactions?.length
    );
  }
);

// CONVERSATION ITEM — Memoize (renders in long list)
const ConversationItem = React.memo(function ConversationItem({ chatId }: Props) {
  const chat = useSelector(selectChatById(chatId));          // Granular selector
  const lastMessage = useSelector(selectLastMessage(chatId));
  const unreadCount = useSelector(selectUnreadCount(chatId));
  const presence = useSelector(selectPresence(chat.contactId));
  
  const handleClick = useCallback(() => {
    dispatch(setActiveChat(chatId));
  }, [chatId, dispatch]);
  
  return <ConversationItemUI chat={chat} lastMessage={lastMessage} unreadCount={unreadCount} presence={presence} onClick={handleClick} />;
});

// SELECTOR MEMOIZATION — Prevent unnecessary re-renders
const selectMessagesByChatId = createSelector(
  [(state: RootState) => state.messages.byChat, (_, chatId: string) => chatId],
  (byChat, chatId) => {
    const chatMessages = byChat[chatId];
    if (!chatMessages) return EMPTY_ARRAY; // Stable reference!
    return chatMessages.ids.map(id => chatMessages.entities[id]);
  }
);
```

## 13.3 Typing Indicator Debounce

```tsx
// DEBOUNCE TYPING EVENTS — Never spam the server with typing events
function useTypingIndicator(chatId: string) {
  const wsClient = useWebSocketClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  
  const sendTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      wsClient.emit('typing:start', { chatId });
    }
  }, [chatId, wsClient]);
  
  const sendTypingStop = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      wsClient.emit('typing:stop', { chatId });
    }
  }, [chatId, wsClient]);
  
  const handleInputChange = useCallback(() => {
    sendTypingStart();
    
    // Auto-stop typing after 3s of no keystroke
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(sendTypingStop, 3000);
  }, [sendTypingStart, sendTypingStop]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sendTypingStop();
    };
  }, [sendTypingStop]);
  
  return { handleInputChange };
}
```

## 13.4 Image Lazy Loading & Progressive Loading

```tsx
// PROGRESSIVE IMAGE LOADING — BlurHash → Thumbnail → Full
function ChatImage({ mediaId, blurHash, thumbUrl, fullUrl, width, height }: Props) {
  const [loadState, setLoadState] = useState<'blur' | 'thumb' | 'full'>('blur');
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Intersection Observer — only load when in viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }  // Start loading 200px before entering view
    );
    
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div
      ref={imgRef}
      className="chat-image"
      style={{ width, height, aspectRatio: `${width}/${height}` }}
    >
      {/* Layer 1: BlurHash placeholder (always rendered, no network) */}
      {loadState === 'blur' && (
        <BlurhashCanvas hash={blurHash} width={32} height={32} />
      )}
      
      {/* Layer 2: Thumbnail (loads fast, low quality) */}
      {isInView && loadState !== 'full' && (
        <img
          src={thumbUrl}
          style={{ filter: loadState === 'blur' ? 'blur(10px)' : 'none' }}
          onLoad={() => setLoadState('thumb')}
        />
      )}
      
      {/* Layer 3: Full resolution (loads after thumb) */}
      {loadState === 'thumb' && (
        <img
          src={fullUrl}
          onLoad={() => setLoadState('full')}
          style={{ opacity: 0, position: 'absolute' }}
        />
      )}
    </div>
  );
}
```

## 13.5 Web Worker for Heavy Operations

```ts
// workers/messageProcessor.worker.ts
// Off-main-thread: crypto, search indexing, emoji parsing

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'ENCRYPT_MESSAGE':
      const encrypted = encryptMessage(payload.content, payload.recipientKey);
      self.postMessage({ type: 'ENCRYPTED', payload: { encrypted, tempId: payload.tempId } });
      break;
      
    case 'DECRYPT_MESSAGES':
      const decrypted = payload.messages.map(msg => ({
        ...msg,
        content: decryptMessage(msg.content, payload.myKey),
      }));
      self.postMessage({ type: 'DECRYPTED', payload: decrypted });
      break;
      
    case 'INDEX_MESSAGES_FOR_SEARCH':
      const index = buildSearchIndex(payload.messages);
      self.postMessage({ type: 'INDEX_READY', payload: index });
      break;
      
    case 'COMPRESS_IMAGE':
      const compressed = compressImage(payload.imageData, payload.maxSizeKB);
      self.postMessage({ type: 'COMPRESSED', payload: compressed });
      break;
  }
};

// Main thread usage:
const worker = new Worker(new URL('./workers/messageProcessor.worker', import.meta.url));

async function encryptAndSend(content: string, recipientKey: string): Promise<string> {
  return new Promise((resolve) => {
    const tempId = generateId();
    worker.postMessage({ type: 'ENCRYPT_MESSAGE', payload: { content, recipientKey, tempId } });
    worker.addEventListener('message', function handler(e) {
      if (e.data.type === 'ENCRYPTED' && e.data.payload.tempId === tempId) {
        worker.removeEventListener('message', handler);
        resolve(e.data.payload.encrypted);
      }
    });
  });
}
```

## 13.6 Performance Timeline

```
PERFORMANCE BUDGET AND TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INITIAL LOAD (4G, cold cache):
  0ms    ──── HTML response
  50ms   ──── Parse HTML, start resource discovery
  400ms  ──── Critical JS loaded and parsed
  700ms  ──── First paint (skeleton screens)    ← Target: <1s
  1200ms ──── Interactive, messages visible      ← Target: <1.5s
  1500ms ──── WebSocket connected, real-time     ← Target: <2s

INITIAL LOAD (warm cache / IndexedDB):
  0ms    ──── HTML response
  400ms  ──── JS executes
  500ms  ──── IndexedDB read (20 chats, 50 msgs each)
  600ms  ──── Messages render from cache         ← FELT INSTANT
  800ms  ──── WebSocket connects
  900ms  ──── Sync fresh messages from server
  1000ms ──── Background refresh of contact info

MESSAGE SEND LATENCY:
  0ms    ──── User taps Send
  0ms    ──── Optimistic UI update (message appears) ← INSTANT
  100ms  ──── WS send + ACK round trip (P50)
  200ms  ──── Gray tick → Dark tick (sent)
  500ms  ──── Dark tick → Double dark tick (delivered)
  1-5s   ──── Double tick → Blue tick (read, variable)

SCROLL PERFORMANCE:
  Target: 60fps (16.6ms/frame) during scroll
  With virtualization: 8-12ms/frame ✅
  Without virtualization (10K msgs): 80-200ms/frame ❌

TYPING INDICATOR LATENCY:
  0ms    ──── User presses first key
  0ms    ──── typing:start WebSocket event sent
  150ms  ──── Recipient sees "typing..." ✅

CORE WEB VITALS TARGETS:
  LCP (Largest Contentful Paint): < 2.5s
  FID (First Input Delay): < 100ms
  CLS (Cumulative Layout Shift): < 0.1
  INP (Interaction to Next Paint): < 200ms
```

## 13.7 Throttle for Scroll Events

```tsx
function useScrollPerformance(listRef: RefObject<HTMLDivElement>) {
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    
    // THROTTLE scroll handler — fire max once per 100ms
    let lastScrollTop = 0;
    let ticking = false;
    
    const handleScroll = () => {
      lastScrollTop = container.scrollTop;
      
      if (!ticking) {
        // Use requestAnimationFrame for scroll events (throttles to 60fps)
        requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
          setShowScrollButton(distanceFromBottom > 200);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [listRef]);
  
  return { showScrollButton };
}
```

---

> **💡 Interview Tip (Chapter 13):** When asked about performance, lead with the biggest wins in order of impact: (1) Virtual scroll — eliminates the O(n) DOM problem, (2) Memoization with granular selectors — prevents cascade re-renders, (3) IndexedDB pre-hydration — near-instant perceived load, (4) Image lazy load + BlurHash — no layout shift, beautiful UX, (5) Web Worker for crypto/compression — keeps main thread free. State the metric (fps, ms) for each optimization.

---

<a name="ch14"></a>
# Chapter 14: Infinite Scroll

## 14.1 The WhatsApp Scroll Challenge

WhatsApp's message list has a unique UX challenge: it scrolls **bottom-to-top** for history, while **new messages auto-scroll to bottom**. This is the opposite of a typical social feed.

```
WHATSAPP SCROLL DIRECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INITIAL STATE: Latest messages at bottom
┌─────────────────────┐
│  [Older messages]   │ ← Hidden above viewport
│                     │
│──── VIEWPORT ───────│
│  [msg 498] "Hi"     │
│  [msg 499] "Hey"    │
│  [msg 500] "How r u"│ ← Most recent, at bottom ✅
└─────────────────────┘

User SCROLLS UP → load OLDER messages (prepend above)
┌─────────────────────┐
│ [Loading spinner]   │ ← Triggers history load when scrolling to top
│ [msg 445] "..."     │ ← New older messages prepended
│ [msg 446] "..."     │
│  [old visible msgs] │
│──── VIEWPORT ───────│
│  [msg 498] "Hi"     │ ← Maintain scroll position! (CRITICAL)
│  [msg 499] "Hey"    │
│  [msg 500] "How r u"│
└─────────────────────┘

New message ARRIVES → auto-scroll to bottom IF user was at bottom
```

## 14.2 Scroll Anchor / Position Preservation

```tsx
// CRITICAL: When prepending old messages, maintain current scroll position
// Problem: Prepending 50 messages shifts everything down by 50 × avg_height

function useScrollAnchor(containerRef: RefObject<HTMLDivElement>) {
  const anchorRef = useRef<{ messageId: string; offsetTop: number } | null>(null);
  
  // Before loading more messages, record anchor point
  const captureAnchor = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Find the first visible message
    const messages = container.querySelectorAll('[data-message-id]');
    for (const el of messages) {
      const rect = el.getBoundingClientRect();
      if (rect.top >= 0) {
        anchorRef.current = {
          messageId: el.getAttribute('data-message-id')!,
          offsetTop: rect.top,
        };
        break;
      }
    }
  }, [containerRef]);
  
  // After loading and rendering, restore position
  const restoreAnchor = useCallback(() => {
    if (!anchorRef.current || !containerRef.current) return;
    
    const { messageId, offsetTop } = anchorRef.current;
    const el = containerRef.current.querySelector(`[data-message-id="${messageId}"]`);
    
    if (el) {
      const newRect = el.getBoundingClientRect();
      const shift = newRect.top - offsetTop;
      containerRef.current.scrollTop += shift;  // Compensate for shift
    }
    anchorRef.current = null;
  }, [containerRef]);
  
  return { captureAnchor, restoreAnchor };
}
```

## 14.3 Loading History on Scroll

```tsx
function useInfiniteMessages(chatId: string, containerRef: RefObject<HTMLDivElement>) {
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const { captureAnchor, restoreAnchor } = useScrollAnchor(containerRef);
  const dispatch = useDispatch();
  const { nextCursor, hasMore } = useSelector(selectChatPagination(chatId));
  
  // Load older messages when user scrolls to top
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasMore || !nextCursor) return;
    
    setIsLoadingOlder(true);
    captureAnchor();         // Record position before DOM changes
    
    try {
      const response = await messagesApi.getMessages(chatId, {
        before: nextCursor,
        limit: 50,
      });
      
      dispatch(prependMessages({
        chatId,
        messages: response.messages,
        nextCursor: response.pagination.nextCursor,
        hasMore: response.pagination.hasMore,
      }));
      
      // Next frame — DOM has updated with new messages
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {   // Double rAF for layout settle
          restoreAnchor();             // Restore scroll position
        });
      });
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasMore, nextCursor, chatId, captureAnchor, restoreAnchor, dispatch]);
  
  // Intersection Observer — trigger when top sentinel enters viewport
  useEffect(() => {
    const sentinel = document.getElementById(`top-sentinel-${chatId}`);
    if (!sentinel) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadOlderMessages(); },
      { root: containerRef.current, rootMargin: '200px 0px 0px 0px' }
    );
    
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [chatId, loadOlderMessages, containerRef]);
  
  return { isLoadingOlder };
}
```

## 14.4 Jump to Unread

```tsx
// Jump to first unread message when opening a chat
function useChatInitialization(chatId: string, containerRef: RefObject<HTMLDivElement>) {
  const firstUnreadId = useSelector(selectFirstUnreadMessageId(chatId));
  const messages = useSelector(selectMessagesByChatId(chatId));
  
  useEffect(() => {
    if (!firstUnreadId) {
      // No unread — scroll to bottom
      scrollToBottom(containerRef, 'auto');
      return;
    }
    
    // Has unread — scroll to first unread message
    const unreadIndex = messages.findIndex(m => m.id === firstUnreadId);
    
    if (unreadIndex !== -1) {
      // Already in local state — scroll directly
      virtualizer.scrollToIndex(unreadIndex, { align: 'start' });
    } else {
      // Not loaded yet — need to fetch messages around firstUnreadId
      dispatch(loadMessagesAroundId({ chatId, messageId: firstUnreadId }));
    }
  }, [chatId]);  // Only on chat change
}
```

## 14.5 Duplicate Prevention During Scroll

```ts
// When loading more history, prevent duplicates
// These can occur if:
// 1. User scrolls fast and triggers loadMore twice
// 2. WebSocket delivers a message that overlaps with paginated history

const seenMessageIds = new Set<string>();

function prependMessages(state: MessagesState, { chatId, messages }: Action) {
  const chatState = state.byChat[chatId];
  
  const newMessages = messages.filter(msg => {
    if (chatState.entities[msg.id]) return false;  // Already exists
    return true;
  });
  
  // Prepend new (older) messages while preserving sort order
  chatState.ids = [
    ...newMessages.map(m => m.id),
    ...chatState.ids,
  ];
  
  newMessages.forEach(msg => {
    chatState.entities[msg.id] = msg;
  });
}
```

---

> **💡 Interview Tip (Chapter 14):** The scroll anchor technique is a Senior-level detail. Say: "Before prepending older messages, I capture the current anchor point — the first visible message and its distance from the top. After the DOM updates with the prepended messages, I calculate the new position of that anchor element and adjust `scrollTop` by the difference. This prevents the jarring jump users see in poorly implemented infinite scroll." This answer alone often gets you an L5+ signal.

---

<a name="ch15"></a>
# Chapter 15: Presence System

## 15.1 Presence States

```
PRESENCE STATE MACHINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

         ┌─────────────────────────────────────┐
         │                                     │
    ─────▼──────    Tab focused/active    ──────────────
   │   ONLINE   │ ─────────────────────► │   TYPING   │
    ────────────               ◄─────────  ────────────
         │          Tab unfocused         Input cleared
         │ No interaction 5min
         ▼
    ─────────────────
   │    AWAY         │ (WhatsApp shows as "online" but inactive)
    ─────────────────
         │
         │ Browser closed / 30s heartbeat missed
         ▼
    ─────────────────
   │    OFFLINE      │
    ─────────────────
         │
         │ (privacy setting: show last seen)
         ▼
    ─────────────────────────────────────
   │ "Last seen today at 3:45 PM"        │
    ─────────────────────────────────────
```

## 15.2 Presence Architecture

```
PRESENCE SYSTEM DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLIENT SIDE:
  1. On WebSocket connect → server marks user ONLINE
  2. Every 30s → send heartbeat PING
  3. On heartbeat miss (×2) → server marks OFFLINE
  4. On browser close → send OFFLINE event (beforeunload)
  5. Page visibility change → pause/resume presence updates

SERVER SIDE:
  1. Redis stores presence: HSET presence:usr_abc status "online" lastSeen 0
  2. TTL on Redis key: 90s (2 missed heartbeats + buffer)
  3. When TTL expires → Presence Service marks OFFLINE → publishes event
  4. Redis pub/sub channel: presence:update → all subscribed gateways
  5. Gateways push presence:update to relevant clients

CLIENT SUBSCRIPTION OPTIMIZATION:
  WRONG: Subscribe to presence of ALL contacts (1000+ events/s)
  RIGHT: Subscribe only to contacts visible in:
         - Current chat list (loaded 20 chats)
         - Active chat contact
         - Currently open contact profile

// Track which presences we're subscribed to
const presenceSubscriptions = new Set<string>();

function subscribeToPresence(userIds: string[]) {
  const newIds = userIds.filter(id => !presenceSubscriptions.has(id));
  if (newIds.length === 0) return;
  
  wsClient.emit('presence:subscribe', { userIds: newIds });
  newIds.forEach(id => presenceSubscriptions.add(id));
}

function unsubscribeFromPresence(userIds: string[]) {
  wsClient.emit('presence:unsubscribe', { userIds });
  userIds.forEach(id => presenceSubscriptions.delete(id));
}
```

## 15.3 Typing Indicator Implementation

```tsx
// RECEIVING side — display typing indicator
function useTypingDisplay(chatId: string) {
  const typingUsers = useSelector(selectTypingUsers(chatId));
  // typingUsers: string[] of userIds currently typing in this chat
  
  // Auto-clear stale typing (server should handle TTL, client is backup)
  useEffect(() => {
    if (typingUsers.length === 0) return;
    
    const timer = setTimeout(() => {
      dispatch(clearTyping({ chatId }));
    }, 5000);  // Clear if no update in 5s
    
    return () => clearTimeout(timer);
  }, [typingUsers, chatId, dispatch]);
  
  return typingUsers;
}

// TypingIndicator component
function TypingIndicator({ chatId }: { chatId: string }) {
  const typingUsers = useTypingDisplay(chatId);
  
  if (typingUsers.length === 0) return null;
  
  const text = typingUsers.length === 1
    ? 'typing...'
    : `${typingUsers.length} people typing...`;
  
  return (
    <div className="typing-indicator" role="status" aria-live="polite">
      <TypingDots />
      <span>{text}</span>
    </div>
  );
}

// SENDING side — emit typing events
function useTypingSender(chatId: string) {
  const wsClient = useWebSocketClient();
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  
  const notifyTyping = useCallback(() => {
    if (!isTypingRef.current) {
      wsClient.emit('typing:start', { chatId });
      isTypingRef.current = true;
    }
    
    // Reset stop timer
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      wsClient.emit('typing:stop', { chatId });
      isTypingRef.current = false;
    }, 3000);
  }, [chatId, wsClient]);
  
  return { notifyTyping };
}
```

## 15.4 Last Seen Privacy

```
LAST SEEN PRIVACY MATRIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WhatsApp Privacy Setting for Last Seen:
  ├── "Everyone"     → Show last seen to all contacts + non-contacts
  ├── "My Contacts"  → Show only to contacts in phone book
  ├── "My Contacts Except..." → Exclude specific contacts
  └── "Nobody"       → Don't show last seen to anyone
                       (Trade-off: You also can't see others' last seen)

Frontend Behavior:
  If server returns lastSeen: null → Show "Online" or nothing
  If server returns lastSeen: timestamp → Format as relative time:
    < 1 min ago → "Online" (was very recently)
    < 60 min   → "last seen X minutes ago"
    Today      → "last seen today at 3:45 PM"
    Yesterday  → "last seen yesterday at 11:30 AM"
    Older      → "last seen 15/01/2025"

const formatLastSeen = (ts: number | null): string => {
  if (!ts) return '';
  const diff = Date.now() - ts;
  
  if (diff < 60_000) return 'last seen just now';
  if (diff < 3600_000) return `last seen ${Math.floor(diff/60_000)} minutes ago`;
  
  const date = new Date(ts);
  if (isToday(date)) return `last seen today at ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `last seen yesterday at ${format(date, 'h:mm a')}`;
  return `last seen ${format(date, 'dd/MM/yyyy')}`;
};
```

## 15.5 Presence Tradeoffs

| Decision | Option A | Option B | WhatsApp Choice |
|---|---|---|---|
| Presence granularity | Per-second updates | 30s heartbeat | 30s heartbeat (battery friendly) |
| Typing broadcast | All group members | Only direct chat | Both, with rate limit |
| Last seen precision | Exact timestamp | Relative buckets | Exact (privacy settings control visibility) |
| Presence storage | Client DB | Server Redis | Server Redis (real-time source of truth) |
| Subscription scope | All contacts | Visible contacts only | Visible + open chat |

---

> **💡 Interview Tip (Chapter 15):** Typing indicators are a classic system design question. The key insight: **never broadcast typing to a large group naively**. In a 1024-person group, 10 people typing simultaneously = 10 typing events × 1024 recipients = 10,240 WebSocket pushes per keystroke. Solution: (1) Rate limit: typing:start fires max once per 2s, (2) Server aggregates: if >3 people typing, sends "3 people typing" not individual names, (3) TTL-based auto-expiry avoids stop event dependency.

---

<a name="ch16"></a>
# Chapter 16: Message Ordering

## 16.1 The Ordering Problem

```
WHY MESSAGE ORDERING IS HARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCENARIO: Two users on different continents
  User A (India):   Sends "Hello!" at 10:00:00.000 IST
  User B (USA):     Sends "Hi!" at 10:00:00.100 IST

  If ordering by CLIENT timestamp:
    A's clock: 10:00:00.000
    B's clock: might show 9:59:59.900 (clock drift!)
    → "Hi!" appears before "Hello!" — WRONG

  If ordering by SERVER receipt timestamp:
    Server receives A's message: 10:00:00.200 UTC
    Server receives B's message: 10:00:00.150 UTC
    → "Hi!" appears first — also potentially confusing

SOLUTION: Hybrid Logical Clocks or Server-assigned sequence numbers per conversation
```

## 16.2 Server-Side Ordering

```
SEQUENCE NUMBER APPROACH (WhatsApp-style)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Per conversation, server maintains a monotonically increasing sequence:
  conversation_sequence = INCR chat:{chatId}:seq   (Redis atomic increment)

Every message gets:
  { messageId, chatId, seq: 1234, serverTimestamp, content }

Client ordering rule:
  PRIMARY sort: by seq (server-assigned, monotonic)
  FALLBACK: by serverTimestamp (for messages in same seq partition)

Client handles:
  - Out-of-order arrival: buffer and sort by seq
  - Missing seq: detect gap, request missing messages
  - Duplicate seq: deduplication (should never happen with server atomic ops)

FRONTEND IMPLEMENTATION:
const sortMessages = (messages: Message[]): Message[] => {
  return [...messages].sort((a, b) => {
    if (a.seq !== b.seq) return a.seq - b.seq;         // Primary: sequence
    return a.serverTimestamp - b.serverTimestamp;        // Fallback: timestamp
  });
};
```

## 16.3 Optimistic Message Placement

```tsx
// Optimistic messages (tempId, not yet ACKed) need placement
// Rule: show at the bottom (most recent), after all confirmed messages
// They get their final position when server ACK arrives with sequence number

function getOrderedMessages(state: MessagesState, chatId: string): DisplayMessage[] {
  const chatState = state.byChat[chatId];
  if (!chatState) return [];
  
  const confirmed = chatState.ids
    .map(id => chatState.entities[id])
    .filter(m => !m.isOptimistic)
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  
  const pending = chatState.ids
    .map(id => chatState.entities[id])
    .filter(m => m.isOptimistic)
    .sort((a, b) => a.timestamp - b.timestamp);  // Sort pending by client timestamp
  
  return [...confirmed, ...pending];  // Pending always at end
}
```

## 16.4 Clock Drift Handling

```
CLOCK DRIFT MITIGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Problem: Client clocks can be wrong by minutes or hours.
         A message timestamped "2 hours ago" on client
         might actually be "just now" on server time.

Solution:
  1. Use SERVER timestamps for all ordering decisions
  2. Use CLIENT timestamps ONLY for display ("3 minutes ago")
     with the server's authoritative time as the reference

  // Compute clock offset on connection
  const clockOffset = useRef(0);
  
  wsClient.on('pong', ({ serverTimestamp, clientTimestamp }) => {
    const roundTripTime = Date.now() - clientTimestamp;
    const serverNow = serverTimestamp + roundTripTime / 2;
    clockOffset.current = serverNow - Date.now();
  });
  
  // Adjusted client time
  const getAdjustedNow = () => Date.now() + clockOffset.current;

  3. Display timestamps relative to server time, not client time
  4. Never use client timestamps for sequence/ordering
  5. Server's seq number is the single source of truth for order
```

## 16.5 Exactly-Once vs At-Least-Once Delivery

| Property | At-Least-Once | Exactly-Once |
|---|---|---|
| **Description** | Message may be delivered multiple times | Message delivered exactly once |
| **Complexity** | Simple | High (idempotency layer required) |
| **Guarantees** | No message loss | No duplicates, no loss |
| **Cost** | Low | Higher (dedup storage, 2-phase commit) |
| **WhatsApp approach** | At-least-once delivery + client dedup | Effectively exactly-once from user POV |
| **Implementation** | Retry until ACK | Server: idempotency keys; Client: seenMessageIds Set |

```
WhatsApp's pragmatic approach:
  Server guarantees: at-least-once (retry until ACK from recipient)
  Client layer adds: deduplication via seenMessageIds Set
  Combined effect: user sees exactly-once
  
  This is cheaper than true exactly-once (no distributed transaction)
  while delivering the same user experience.
```

---

> **💡 Interview Tip (Chapter 16):** If asked "how do you handle message ordering?", never say "by timestamp" without qualification. Say: "Client timestamps are unreliable due to clock drift. The server assigns a monotonically increasing sequence number per conversation using an atomic Redis increment. The client sorts by sequence number as primary key, server timestamp as tiebreaker. Optimistic messages (not yet server-confirmed) are placed at the bottom with client timestamp as provisional order, then repositioned when the server ACK delivers the canonical sequence number."

---

<a name="ch17"></a>
# Chapter 17: Media Upload

## 17.1 Media Upload Architecture

```
MEDIA UPLOAD FLOW (CHUNKED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLIENT                        MEDIA SERVICE           CDN / S3
  │                                │                      │
  │  1. Pre-process (compress)     │                      │
  │  2. Generate checksum          │                      │
  │                                │                      │
  │  POST /media/uploads           │                      │
  │  { size, mimeType, checksum }  │                      │
  │ ──────────────────────────────►│                      │
  │                                │  Check dedup         │
  │                                │  (same checksum?)    │
  │  { uploadId, chunkSize,        │                      │
  │    totalChunks, uploadUrls }   │                      │
  │ ◄──────────────────────────────│                      │
  │                                │                      │
  │  PUT chunk[0] (0-512KB)        │                      │
  │ ─────────────────────────────────────────────────────►│
  │  PUT chunk[1] (512KB-1MB)      │                      │ (parallel,
  │ ─────────────────────────────────────────────────────►│  max 3 concurrent)
  │  PUT chunk[2] ...              │                      │
  │                                │                      │
  │  POST /media/uploads/:id/complete                     │
  │  { etags: [...] }              │                      │
  │ ──────────────────────────────►│                      │
  │                                │  Assemble chunks      │
  │                                │  Generate thumbnail   │
  │                                │  Push to CDN          │
  │  { mediaId, url,               │                      │
  │    thumbnailUrl, metadata }    │                      │
  │ ◄──────────────────────────────│                      │
  │                                │                      │
  │  Send message with mediaId     │                      │
  │ ──────────────────────────────►│                      │
```

## 17.2 Client-Side Compression

```ts
// services/mediaCompressor.ts
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const {
    maxWidthOrHeight = 1600,
    maxSizeKB = 1024,     // Target < 1MB
    quality = 0.85,
  } = options;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Scale down maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
        const ratio = maxWidthOrHeight / Math.max(width, height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      
      URL.revokeObjectURL(url);
      
      // Compress iteratively until under maxSizeKB
      let currentQuality = quality;
      const compress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            if (blob.size <= maxSizeKB * 1024 || currentQuality < 0.3) {
              resolve(blob);
            } else {
              currentQuality -= 0.1;
              compress();
            }
          },
          'image/webp',    // WebP: better compression than JPEG
          currentQuality
        );
      };
      compress();
    };
    
    img.onerror = reject;
    img.src = url;
  });
}

// Video compression — use WebCodecs API or FFmpeg.wasm in Web Worker
async function compressVideo(file: File): Promise<Blob> {
  // Off-main-thread: run in Web Worker to not block UI
  const worker = new Worker(new URL('./videoCompressor.worker', import.meta.url));
  
  return new Promise((resolve, reject) => {
    worker.postMessage({ file });
    worker.onmessage = (e) => resolve(e.data.blob);
    worker.onerror = reject;
  });
}
```

## 17.3 Upload Progress Tracking

```tsx
function useMediaUpload() {
  const [uploads, setUploads] = useState<Map<string, UploadState>>(new Map());
  
  const uploadMedia = useCallback(async (file: File, chatId: string) => {
    const uploadId = generateId();
    
    setUploads(prev => new Map(prev).set(uploadId, {
      progress: 0, status: 'compressing', file
    }));
    
    try {
      // Step 1: Compress
      const compressed = await compressImage(file);
      setUploads(prev => new Map(prev).set(uploadId, {
        ...prev.get(uploadId)!, progress: 5, status: 'uploading'
      }));
      
      // Step 2: Initialize upload
      const init = await mediaApi.initUpload({
        size: compressed.size,
        mimeType: compressed.type,
        checksum: await computeSHA256(compressed),
      });
      
      // Step 3: Chunk upload with progress
      const chunks = splitIntoChunks(compressed, init.chunkSize);
      const etags: string[] = [];
      let uploadedChunks = 0;
      
      // Upload chunks with concurrency limit (max 3 parallel)
      await uploadChunksWithConcurrencyLimit(
        chunks,
        async (chunk, index) => {
          const etag = await mediaApi.uploadChunk(init.uploadId, index, chunk, {
            onProgress: (chunkProgress) => {
              const overall = ((uploadedChunks + chunkProgress) / chunks.length) * 90 + 5;
              setUploads(prev => new Map(prev).set(uploadId, {
                ...prev.get(uploadId)!, progress: overall
              }));
            }
          });
          etags[index] = etag;
          uploadedChunks++;
        },
        3  // Max 3 concurrent
      );
      
      // Step 4: Complete upload
      const result = await mediaApi.completeUpload(init.uploadId, { etags });
      
      setUploads(prev => new Map(prev).set(uploadId, {
        ...prev.get(uploadId)!, progress: 100, status: 'complete', result
      }));
      
      return result;
      
    } catch (error) {
      setUploads(prev => new Map(prev).set(uploadId, {
        ...prev.get(uploadId)!, status: 'failed', error
      }));
      throw error;
    }
  }, []);
  
  const cancelUpload = useCallback((uploadId: string) => {
    // XHR abort or fetch AbortController
    uploadControllers.get(uploadId)?.abort();
    setUploads(prev => {
      const next = new Map(prev);
      next.delete(uploadId);
      return next;
    });
  }, []);
  
  return { uploadMedia, cancelUpload, uploads };
}
```

## 17.4 Voice Note Recording

```tsx
function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',  // Opus: best quality/size for voice
      });
      
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(100);  // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      // Track duration
      durationTimerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Microphone access denied:', err);
      throw new Error('MICROPHONE_PERMISSION_DENIED');
    }
  }, []);
  
  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setDuration(0);
  }, []);
  
  const cancelRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    chunksRef.current = [];     // Discard chunks
    setAudioBlob(null);
    setIsRecording(false);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setDuration(0);
  }, []);
  
  return { isRecording, duration, audioBlob, startRecording, stopRecording, cancelRecording };
}
```

---

> **💡 Interview Tip (Chapter 17):** When discussing media upload, always mention: (1) client-side compression BEFORE upload (saves bandwidth and storage), (2) chunked upload for resumability on poor networks, (3) deduplication via checksum (same file → same CDN URL, no re-upload), (4) direct-to-S3 upload via presigned URLs (bypasses your servers, massive throughput improvement). These four points show production-scale thinking.

---

<a name="ch18"></a>
# Chapter 18: Notifications

## 18.1 Notification Architecture

```
NOTIFICATION FLOW (BACKGROUND — user has WhatsApp Web closed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WhatsApp Server
  │
  │  User B is offline (no WebSocket connection)
  │  Message arrives for User B
  │
  ├── Notification Service checks: User B's push subscription
  │   (stored when user granted permission via Push API)
  │
  ├── Sends Web Push notification to browser's push service:
  │   (Chrome: FCM, Firefox: Mozilla Push Service, Safari: APNS)
  │
Browser Push Service (e.g., Google FCM)
  │
  ├── Delivers to browser's background process
  │
Service Worker (running even when tab is closed)
  │
  ├── Receives 'push' event
  ├── Decrypts notification payload (minimal: sender name + count)
  ├── Calls self.registration.showNotification(...)
  │
  └── Browser shows system notification
           │
           └── User clicks → Service Worker receives 'notificationclick'
               → Opens/focuses WhatsApp Web tab
               → Jumps to relevant chat
```

## 18.2 Permission Flow

```tsx
// Permission flow — must be triggered by user gesture
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }
  
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  
  // Must be called from user interaction (button click)
  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    await subscribeToPush();  // Register push subscription
    return true;
  }
  
  return false;
}

async function subscribeToPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  
  // Send subscription to server — server uses this to push notifications
  await notificationsApi.registerPushSubscription(subscription);
}
```

## 18.3 Service Worker Notification Handler

```js
// service-worker.js
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  
  const options = {
    body: data.preview || 'New message',    // Minimal preview (E2E: only if allowed)
    icon: '/icons/whatsapp-192.png',
    badge: '/icons/badge-72.png',
    tag: `chat-${data.chatId}`,             // Replace old notification from same chat
    renotify: true,
    data: {
      chatId: data.chatId,
      url: `/chat/${data.chatId}`,
    },
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    silent: false,
    vibrate: [200, 100, 200],
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.senderName || 'WhatsApp',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { url } = event.notification.data;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes('whatsapp') && 'focus' in client) {
          client.postMessage({ type: 'OPEN_CHAT', chatId: event.notification.data.chatId });
          return client.focus();
        }
      }
      // Otherwise open new tab
      return clients.openWindow(url);
    })
  );
});
```

## 18.4 In-App Notification (Foreground)

```tsx
// When app is OPEN and message arrives from a different chat
function useInAppNotifications() {
  const activeChatId = useSelector(selectActiveChatId);
  
  useEffect(() => {
    const handler = (message: Message) => {
      // Don't notify for active chat (user is already there)
      if (message.chatId === activeChatId) return;
      
      // Show in-app toast
      toast.show({
        title: message.senderName,
        body: message.preview,
        onClick: () => dispatch(setActiveChat(message.chatId)),
        duration: 4000,
      });
    };
    
    wsClient.on('message:received', handler);
    return () => wsClient.off('message:received', handler);
  }, [activeChatId, dispatch]);
}
```

## 18.5 Unread Badge

```tsx
// Update browser tab badge (PWA / Badging API)
function useUnreadBadge() {
  const totalUnread = useSelector(selectTotalUnreadCount);
  
  useEffect(() => {
    // Modern: Badging API (Chrome, Edge)
    if ('setAppBadge' in navigator) {
      if (totalUnread > 0) {
        navigator.setAppBadge(totalUnread).catch(console.error);
      } else {
        navigator.clearAppBadge().catch(console.error);
      }
    }
    
    // Fallback: Update page title
    document.title = totalUnread > 0
      ? `(${totalUnread}) WhatsApp`
      : 'WhatsApp';
    
    // Update favicon with badge
    if (totalUnread > 0) {
      updateFaviconWithBadge(totalUnread);
    } else {
      resetFavicon();
    }
  }, [totalUnread]);
}
```

---

> **💡 Interview Tip (Chapter 18):** Distinguish foreground vs background notifications clearly. "When the app is open and a message arrives in a different chat, I show an in-app toast notification — the service worker is irrelevant here. When the app is closed/background, the service worker receives the push event and shows a system notification. The key detail: for E2E encrypted messages, the push notification can't contain message content (server can't decrypt it) — so we send only sender name and unread count, then the app fetches the actual content when opened."

---

<a name="ch19"></a>
# Chapter 19: Search

## 19.1 Search Architecture

```
SEARCH TYPES IN WHATSAPP WEB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. CHAT SEARCH (search chats/contacts by name)
   → Searches contact list
   → Purely client-side (contacts cached locally)
   → Instant (no network)

2. MESSAGE SEARCH WITHIN ACTIVE CHAT
   → Full-text search of one chat's messages
   → Client-side (if chat fully loaded)
   → Falls back to server for large chats

3. GLOBAL MESSAGE SEARCH (across all chats)
   → Always server-side (cannot load all messages client-side)
   → Elasticsearch / full-text index on server
   → Note: server only has encrypted content in E2E — 
     WhatsApp actually builds a client-side search index!

WHATSAPP'S ACTUAL APPROACH (Client-Side Search Index):
  Because messages are E2E encrypted, the server cannot index them.
  WhatsApp builds and maintains a FULL-TEXT SEARCH INDEX in the client,
  stored in IndexedDB. The index is updated as messages arrive.
  
  Tradeoff: Search limited to messages on this device.
            Cannot search across devices (each device has its own index).
```

## 19.2 Client-Side Search Index

```ts
// Using Fuse.js for fuzzy search on contacts/chats
import Fuse from 'fuse.js';

class ChatSearchIndex {
  private fuseChats: Fuse<Chat> | null = null;
  private fuseContacts: Fuse<Contact> | null = null;
  
  buildIndex(chats: Chat[], contacts: Contact[]): void {
    this.fuseChats = new Fuse(chats, {
      keys: ['name', 'lastMessage.content'],
      threshold: 0.3,           // 0 = exact, 1 = anything
      includeScore: true,
      includeMatches: true,    // For highlighting
    });
    
    this.fuseContacts = new Fuse(contacts, {
      keys: ['name', 'phone'],
      threshold: 0.3,
    });
  }
  
  searchChats(query: string): SearchResult<Chat>[] {
    if (!this.fuseChats || !query) return [];
    return this.fuseChats.search(query).slice(0, 10);
  }
  
  searchContacts(query: string): SearchResult<Contact>[] {
    if (!this.fuseContacts || !query) return [];
    return this.fuseContacts.search(query).slice(0, 10);
  }
}

// For message search — inverted index in Web Worker
// workers/searchIndex.worker.ts
const invertedIndex = new Map<string, Set<string>>();  // word → Set<messageId>

function addToIndex(message: Message): void {
  const words = tokenize(message.content.toLowerCase());
  words.forEach(word => {
    if (!invertedIndex.has(word)) invertedIndex.set(word, new Set());
    invertedIndex.get(word)!.add(message.id);
  });
}

function search(query: string, chatId?: string): string[] {
  const queryWords = tokenize(query.toLowerCase());
  
  let resultIds: Set<string> | null = null;
  
  queryWords.forEach(word => {
    const matches = invertedIndex.get(word) || new Set<string>();
    if (resultIds === null) {
      resultIds = new Set(matches);
    } else {
      // Intersection: all words must match (AND search)
      for (const id of resultIds) {
        if (!matches.has(id)) resultIds.delete(id);
      }
    }
  });
  
  return Array.from(resultIds || []);
}
```

## 19.3 Search UI with Debounce

```tsx
function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ chats: [], messages: [] });
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounce: don't search on every keystroke
  const debouncedQuery = useDebounce(query, 300);
  
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults({ chats: [], messages: [] });
      return;
    }
    
    setIsSearching(true);
    
    // Local search (instant for chats/contacts)
    const chatResults = searchIndex.searchChats(debouncedQuery);
    setResults(prev => ({ ...prev, chats: chatResults }));
    
    // Server search for messages (debounced, across all chats)
    searchApi.searchMessages(debouncedQuery)
      .then(messages => setResults(prev => ({ ...prev, messages })))
      .finally(() => setIsSearching(false));
      
  }, [debouncedQuery]);
  
  return { query, setQuery, results, isSearching };
}

// Highlight matching text
function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="search-highlight">{part}</mark>
          : part
      )}
    </span>
  );
}
```

---

> **💡 Interview Tip (Chapter 19):** The E2E encryption + search paradox is a great discussion point. Say: "Because WhatsApp messages are E2E encrypted, the server cannot build a search index (it only sees ciphertext). WhatsApp solves this by maintaining a client-side inverted index in IndexedDB, built from decrypted messages as they arrive. Search runs entirely on-device via a Web Worker (to not block UI). The tradeoff: search only works for messages you've received on this device, not your full message history from other devices." This is the kind of nuanced, production-aware answer that distinguishes L5 from L6 candidates.

---

<a name="ch20"></a>
# Chapter 20: Accessibility

## 20.1 WCAG 2.1 AA Compliance Checklist

```
ACCESSIBILITY REQUIREMENTS FOR WHATSAPP WEB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LEVEL A (Must-Have):
  ✅ All images have alt text (or empty alt="" for decorative)
  ✅ All form inputs have associated labels
  ✅ Color is not the ONLY means of conveying information
     (e.g., message status: ticks are shape + color, not color-only)
  ✅ No content flashes >3 times/second (epilepsy prevention)
  ✅ Page has a title (<title>WhatsApp Web - Chat with John</title>)
  ✅ Keyboard access: all interactive elements reachable via Tab

LEVEL AA (Should-Have):
  ✅ Color contrast: 4.5:1 minimum for normal text, 3:1 for large text
  ✅ Focus visible: `:focus-visible` outline on all interactive elements
  ✅ Resize text: 200% zoom without horizontal scrolling
  ✅ Consistent navigation: sidebar always in same position
  ✅ Error identification: form errors in text, not just red color
  ✅ Live regions: new messages announced to screen readers
```

## 20.2 ARIA Implementation

```tsx
// LIVE REGION — Screen reader announces new messages
function MessageList({ chatId }: Props) {
  const newMessages = useSelector(selectNewMessages(chatId));
  
  return (
    <div>
      {/* Visually hidden live region for screen readers */}
      <div
        role="log"
        aria-live="polite"       // "polite" = announce after user finishes, not interrupt
        aria-label="Chat messages"
        aria-atomic="false"      // Announce individual new messages, not whole list
        className="sr-only"      // Visually hidden
      >
        {newMessages.map(msg => (
          <div key={msg.id}>
            {msg.senderName}: {msg.content}
          </div>
        ))}
      </div>
      
      {/* Actual visual message list */}
      <div role="list" aria-label="Messages">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}

// MESSAGE BUBBLE — Proper ARIA
function MessageBubble({ message }: Props) {
  return (
    <article
      role="listitem"
      aria-label={`${message.senderName}, ${message.content}, ${formatTime(message.timestamp)}, ${message.status}`}
    >
      <div className={`bubble ${message.isSent ? 'sent' : 'received'}`}>
        {message.senderName && (
          <span className="sender-name">{message.senderName}</span>
        )}
        <p>{message.content}</p>
        <div aria-hidden="true">   {/* Ticks described in article label */}
          <DeliveryTick status={message.status} />
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
        </div>
      </div>
    </article>
  );
}

// TYPING INDICATOR — Live polite announcement
function TypingIndicator({ typingUsers }: Props) {
  if (typingUsers.length === 0) return null;
  
  const announcement = typingUsers.length === 1
    ? `${typingUsers[0]} is typing`
    : `${typingUsers.length} people are typing`;
  
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={announcement}
    >
      <TypingDots aria-hidden="true" />
      <span className="sr-only">{announcement}</span>
    </div>
  );
}

// EMOJI PICKER — Keyboard navigable grid
function EmojiPicker({ onSelect }: Props) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const handleKeyDown = (e: KeyboardEvent, index: number, emoji: string) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        onSelect(emoji);
        break;
      case 'ArrowRight':
        setFocusedIndex(index + 1);
        break;
      case 'ArrowLeft':
        setFocusedIndex(index - 1);
        break;
      case 'ArrowDown':
        setFocusedIndex(index + EMOJIS_PER_ROW);
        break;
      case 'ArrowUp':
        setFocusedIndex(index - EMOJIS_PER_ROW);
        break;
    }
  };
  
  return (
    <div role="grid" aria-label="Emoji picker">
      {emojis.map((emoji, index) => (
        <button
          key={emoji.code}
          role="gridcell"
          aria-label={emoji.name}
          tabIndex={index === focusedIndex ? 0 : -1}  // Roving tabindex
          autoFocus={index === focusedIndex}
          onKeyDown={(e) => handleKeyDown(e, index, emoji.char)}
          onClick={() => onSelect(emoji.char)}
        >
          {emoji.char}
        </button>
      ))}
    </div>
  );
}
```

## 20.3 Focus Management

```tsx
// MODAL FOCUS TRAP — When context menu opens, trap focus inside
function ContextMenu({ isOpen, onClose, children }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    
    // Focus first item when menu opens
    const firstFocusable = menuRef.current?.querySelector<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
    
    // Trap focus inside modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      if (e.key !== 'Tab') return;
      
      const focusable = menuRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Message options"
      style={{ display: isOpen ? 'block' : 'none' }}
    >
      {children}
    </div>
  );
}
```

## 20.4 Reduced Motion

```tsx
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// In CSS
@media (prefers-reduced-motion: reduce) {
  .typing-dots span { animation: none; }
  .message-bubble { transition: none; }
  .notification-banner { animation: none; }
  .scroll-smooth { scroll-behavior: auto; }
}

// In JS — disable scroll animations for reduced motion users
function scrollToBottom(ref: RefObject<HTMLDivElement>, animate = true) {
  const behavior = (animate && !prefersReducedMotion) ? 'smooth' : 'auto';
  ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior });
}
```

## 20.5 RTL (Right-to-Left) Support

```tsx
// RTL for Arabic, Hebrew, Urdu, Farsi
// Use CSS logical properties — automatic RTL support

// Instead of:
.message-bubble { margin-left: 8px; padding-right: 16px; }

// Use logical properties:
.message-bubble { 
  margin-inline-start: 8px;   // = left in LTR, right in RTL
  padding-inline-end: 16px;   // = right in LTR, left in RTL
}

// In React — set dir attribute based on user's language
function App() {
  const { language } = useUser();
  const isRTL = RTL_LANGUAGES.includes(language);  // ['ar', 'he', 'ur', 'fa']
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} lang={language}>
      <Router />
    </div>
  );
}

// Delivery ticks reverse in RTL
.message-sent .message-meta {
  flex-direction: row;  // auto-reverses in RTL
}

// Sidebar appears on right in RTL (chat window on left)
.chat-layout {
  display: flex;
  flex-direction: row;  // Reverses to row-reverse in RTL context
}
```

## 20.6 Keyboard Navigation Map

```
KEYBOARD NAVIGATION IN WHATSAPP WEB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GLOBAL SHORTCUTS:
  Ctrl/Cmd + K    → Focus search bar
  Ctrl/Cmd + N    → New chat
  Ctrl/Cmd + [    → Previous chat
  Ctrl/Cmd + ]    → Next chat
  Escape          → Close modal / deselect / back

CHAT LIST:
  Tab             → Move to chat list
  ↑/↓            → Navigate between chats
  Enter           → Open selected chat
  
MESSAGE LIST:
  Tab             → Focus message input area
  Shift+Tab       → Focus chat header
  ↑/↓            → Focus individual messages (when aria-activedescendant used)
  Enter           → Open context menu on focused message
  
MESSAGE INPUT:
  Enter           → Send message (configurable: Shift+Enter for newline)
  Shift+Enter     → New line
  Alt+↑           → Reply to last message
  
EMOJI PICKER (when open):
  ↑↓←→          → Navigate emoji grid
  Enter/Space     → Select emoji
  Escape          → Close picker
```

---

> **💡 Interview Tip (Chapter 20):** Accessibility is often skipped by candidates who think "the interviewer won't care." At Google and Meta, senior engineers are expected to proactively mention accessibility without being asked. Say: "I'd implement WCAG 2.1 AA from day one — not as an afterthought. Key things: aria-live region for new messages so screen reader users hear them without losing focus, roving tabindex pattern in the emoji grid, focus trap in modals, and CSS logical properties for automatic RTL support for our Arabic/Hebrew users." This shows inclusive design thinking.

