# 239 – Chat UI

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A Chat UI is a real-time messaging interface with a message list, input field, typing indicators, read receipts, and presence indicators. It tests **WebSocket/SSE for real-time communication**, **reverse-chronological infinite scrolling** (scroll up to load older messages), **optimistic message sending**, **message states** (sending → sent → delivered → read), **offline support**, and **rich media handling** (images, files, links with previews). The key architectural decision is how to manage the bidirectional data flow between the WebSocket connection and the UI state.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌─────────────────────────────────────────┐
│              ChatWindow                  │
│  ┌─────────────────────────────────┐    │
│  │ ChatHeader                       │    │
│  │  [Avatar] John Doe  ● Online     │    │
│  ├─────────────────────────────────┤    │
│  │ MessageList (virtualized)        │    │  ← role="log"
│  │  [Load older messages]           │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │ 10:30 AM - Alice          │  │    │
│  │  │ Hey, how's the project?   │  │    │
│  │  ├───────────────────────────┤  │    │
│  │  │ 10:31 AM - You            │  │    │
│  │  │ Going well! ✓✓            │  │    │  ← double check = read
│  │  └───────────────────────────┘  │    │
│  │  "John is typing..."            │    │  ← typing indicator
│  ├─────────────────────────────────┤    │
│  │ MessageInput                     │    │
│  │  [📎 Type a message...  ➤]      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Data Model

```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  tempId?: string;  // for optimistic mapping
}

interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
  typingUsers: string[];
}
```

### WebSocket Message Protocol

```typescript
// Outgoing (client → server)
{ type: 'message.send', payload: { conversationId, content, tempId } }
{ type: 'typing.start', payload: { conversationId } }
{ type: 'message.read', payload: { conversationId, messageId } }

// Incoming (server → client)
{ type: 'message.new', payload: Message }
{ type: 'message.statusUpdate', payload: { messageId, status } }
{ type: 'typing.indicator', payload: { conversationId, userId, isTyping } }
{ type: 'presence.update', payload: { userId, status: 'online' | 'offline' } }
```

### Optimistic Sending

```typescript
function sendMessage(content: string) {
  const tempId = crypto.randomUUID();
  
  // 1. Add to UI immediately with 'sending' status
  dispatch(addMessage({
    id: tempId, content, status: 'sending',
    senderId: currentUserId, createdAt: new Date().toISOString(),
  }));
  
  // 2. Send via WebSocket
  ws.send(JSON.stringify({ type: 'message.send', payload: { content, tempId } }));
  
  // 3. Server responds with real ID — map tempId to real ID
  // In WS handler: dispatch(confirmMessage({ tempId, realId, status: 'sent' }));
  
  // 4. If no confirmation in 5s, mark as 'failed' with retry option
}
```

### Reverse Infinite Scroll (Load Older Messages)

```typescript
// Scroll up to load history — opposite of typical infinite scroll
const listRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && hasOlderMessages) {
      const scrollHeightBefore = listRef.current!.scrollHeight;
      loadOlderMessages().then(() => {
        // Maintain scroll position after prepending
        const scrollHeightAfter = listRef.current!.scrollHeight;
        listRef.current!.scrollTop = scrollHeightAfter - scrollHeightBefore;
      });
    }
  });
  // Observe sentinel at top of list
  observer.observe(topSentinelRef.current!);
}, [hasOlderMessages]);
```

### Accessibility

- Message list: `role="log"` with `aria-live="polite"` — new messages are announced
- Each message: time + sender + content in accessible text
- Typing indicator: `aria-live="polite"` — "John is typing"
- Input: `aria-label="Type a message"`, Enter sends, Shift+Enter for newline
- Conversation list: `role="listbox"` with each conversation as `role="option"`

### Anti-Patterns

- ❌ Polling for new messages — use WebSocket/SSE for real-time
- ❌ Rendering all messages without virtualization — memory blowup for long conversations
- ❌ Not maintaining scroll position when loading older messages — content jumps
- ❌ No optimistic sending — user waits for server confirmation before seeing their message
- ❌ No offline queue — messages lost if sent during connectivity gap

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Slack
Slack uses WebSocket for real-time messaging with a sophisticated offline queue. Messages are stored in IndexedDB for offline access. Typing indicators are debounced and expire after 5 seconds. Thread replies are separate from channel messages — a nested conversation model.

### Hruday @ Bosch
At Bosch, I built a real-time WebSocket dashboard for IoT devices. The same WebSocket management patterns (connection, reconnection, message routing) apply directly to a chat UI. We used a pub/sub model for device channels — analogous to chat conversations.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd structure the chat UI with three main components: ConversationList (sidebar), ChatWindow (active chat), and MessageInput (composer).*

*Real-time: A single WebSocket connection handles all message types — new messages, status updates, typing indicators, and presence. I use a message router that dispatches incoming WS events to the appropriate Redux/Zustand actions.*

*Sending is optimistic: the message appears immediately with 'sending' status and a tempId. When the server confirms (via WS), I map tempId → realId and update status to 'sent'. If no confirmation in 5 seconds, I mark it 'failed' with a retry button.*

*Message list uses virtualized reverse scrolling — starts scrolled to bottom, loading older messages on scroll-up. After prepending older messages, I adjust scrollTop to maintain the user's reading position.*

*Offline: messages queue in IndexedDB, sent when connection restores. WebSocket handles automatic reconnection with exponential backoff.*

*At Bosch, I built a real-time WebSocket dashboard with similar connection management patterns — automatic reconnection, message routing, and offline buffering."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// WebSocket Manager for Chat
class ChatConnection {
  private ws: WebSocket | null = null;
  private messageQueue: any[] = [];
  private reconnectDelay = 1000;

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.flushQueue();
    };
    this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
    this.ws.onclose = () => setTimeout(() => this.connect(url), this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000));
  }

  send(type: string, payload: any) {
    const message = JSON.stringify({ type, payload });
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      this.ws?.send(this.messageQueue.shift());
    }
  }

  private handleMessage(data: { type: string; payload: any }) {
    switch (data.type) {
      case 'message.new': store.dispatch(addMessage(data.payload)); break;
      case 'message.statusUpdate': store.dispatch(updateStatus(data.payload)); break;
      case 'typing.indicator': store.dispatch(setTyping(data.payload)); break;
      case 'presence.update': store.dispatch(updatePresence(data.payload)); break;
    }
  }
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Chat = WebSocket + Optimistic Send + Reverse Scroll + Message Status State Machine."** WebSocket handles: new messages, status updates, typing indicators, presence. Send flow: optimistic UI (tempId) → WS → server confirms (realId). Message status: sending → sent → delivered → read. Reverse infinite scroll: load older on scroll-up, maintain scroll position. Offline: queue in IndexedDB, flush on reconnect.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Chat tests real-time architecture, optimistic UI, state management complexity, and offline resilience — the complete frontend stack.
**How:** WebSocket for bidirectional real-time communication. Optimistic sending with tempId mapping. Virtualized reverse scroll for message history. Message status state machine. Offline queue with IndexedDB.
**Companies:** Microsoft (Teams — deep real-time expertise), Adobe (Creative Cloud messaging), Salesforce (Service Cloud chat), Cisco (Webex messaging — core product).
