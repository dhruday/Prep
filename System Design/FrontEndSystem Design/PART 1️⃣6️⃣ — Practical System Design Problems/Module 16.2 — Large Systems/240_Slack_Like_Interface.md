# 240 – Slack-Like Interface

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Designing a Slack-like interface goes beyond a simple chat UI — it's a **complex multi-panel application** with a workspace sidebar, channel list, message pane, thread panel, search overlay, and user presence. The design challenge scales to handling hundreds of channels, thousands of messages in each, real-time updates across all visible panels, mention notifications, unread counts per channel, message reactions, file sharing, and rich text formatting. It tests **micro-frontend thinking** (each panel as a semi-autonomous module), **state management at scale** (channel subscriptions, unread tracking), and **performance** (only subscribing to visible channels).

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Layout Architecture

```
┌─────┬───────────────┬─────────────────┬──────────────┐
│     │               │                  │              │
│ W   │   Channel     │    Message       │   Thread     │
│ O   │   Sidebar     │    Pane          │   Panel      │
│ R   │               │                  │   (sliding)  │
│ K   │   # general   │   [Messages]     │              │
│ S   │   # random    │   [Messages]     │   [Thread    │
│ P   │   # project   │   [Messages]     │    Replies]  │
│ A   │               │                  │              │
│ C   │   DMs         │   [Input]        │   [Input]    │
│ E   │               │                  │              │
└─────┴───────────────┴─────────────────┴──────────────┘
  48px     240px          flex: 1           400px (opt)
```

### Data Model

```typescript
interface Workspace {
  id: string;
  name: string;
  channels: string[];  // channel IDs
  members: string[];
}

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'dm';
  unreadCount: number;
  mentionCount: number;
  lastMessage: Message | null;
  members: string[];
}

interface Message {
  id: string;
  channelId: string;
  threadId: string | null;   // null = root message, string = thread reply
  senderId: string;
  content: string;            // Markdown or structured content
  reactions: Record<string, string[]>;  // emoji → userIds
  attachments: Attachment[];
  edited: boolean;
  timestamp: string;
}
```

### Channel Subscription Management

With 200+ channels, subscribing to all via WebSocket wastes resources:

```typescript
// Subscribe to visible/active channels only
function useChannelSubscription(channelId: string) {
  useEffect(() => {
    wsManager.send('channel.subscribe', { channelId });
    return () => wsManager.send('channel.unsubscribe', { channelId });
  }, [channelId]);
}

// For sidebar: lightweight "unread count" subscription
// Server pushes badge counts for all channels, full messages only for active channel
```

### Unread Count Architecture

```typescript
// Efficient unread tracking
interface UnreadState {
  channelUnreads: Record<string, { count: number; mentionCount: number; lastReadTimestamp: string }>;
}

// On channel switch:
function markChannelRead(channelId: string) {
  dispatch(setLastRead(channelId, Date.now()));
  api.post(`/channels/${channelId}/read`);
  // Server recalculates unread = messages after lastReadTimestamp
}
```

### Thread Panel Architecture

Threads are a "panel within a panel" — the thread panel slides in from the right, showing replies to a specific message. The message pane remains visible but narrower.

```typescript
interface ThreadState {
  activeThreadId: string | null;   // which root message's thread is open
  threadMessages: Record<string, Message[]>;  // threadId → replies
}
```

### Performance Considerations

- **Channel switching**: Cache messages per channel in memory (last 100). Only fetch from API if not cached.
- **Message rendering**: Virtualized list per channel. Messages are memoized components.
- **Reactions**: Local emoji picker (not fetched from server). Optimistic add/remove.
- **Search**: Debounced, federated search across messages/channels/people. Server-side full-text search.
- **Presence**: Poll presence for visible users only, not all workspace members.

### Anti-Patterns

- ❌ Subscribing to all channels via WebSocket — subscribe only to active channel + lightweight unread events
- ❌ Loading all messages for all channels upfront — lazy load on channel switch
- ❌ Single Redux store without normalization — channel, message, and user entities must be normalized
- ❌ No message virtualization — long channels with thousands of messages crash the browser

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Slack (Salesforce)
Slack uses a sophisticated desktop app (Electron) with aggressive caching. Messages are stored in a local SQLite database. WebSocket connections are per-workspace, not per-channel. The UI uses a custom renderer for messages (not standard React rendering) for performance.

### Hruday @ SAP / Bosch
At SAP, Fiori collaboration features use a similar panel layout (master-detail-detail pattern). At Bosch, the WebSocket dashboard I built used the same real-time subscription and multi-panel architecture.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd structure this as a multi-panel layout: Workspace Selector (48px icon rail), Channel Sidebar (240px), Message Pane (flex), and optional Thread Panel (400px, slides in).*

*State architecture: Normalized entities — `channels.byId`, `messages.byChannelId` (cached last 100 per channel), `users.byId`, `threads.byRootMessageId`. Global state for active workspace, active channel, active thread.*

*WebSocket: Single connection per workspace. Active channel gets full message subscription. All channels get lightweight unread-count events. On channel switch, unsubscribe from previous, subscribe to new, load cached messages (or fetch if not cached).*

*Unread counts: Track `lastReadTimestamp` per channel. On channel switch, mark read. Server-side counts messages after `lastReadTimestamp`. Badge shows `unreadCount` and highlighted `mentionCount`.*

*Thread panel: Opens when clicking a message with replies. Thread messages are a separate subscription. The panel narrows the message pane via CSS flex.*

*At Bosch, I built multi-panel WebSocket dashboards with similar subscription management — subscribing only to visible data channels."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Slack-like Layout Component
function SlackLayout() {
  const activeChannel = useSelector(s => s.activeChannelId);
  const activeThread = useSelector(s => s.activeThreadId);

  return (
    <div className="slack-layout"> {/* display: flex */}
      <WorkspaceSidebar />                    {/* 48px */}
      <ChannelSidebar />                      {/* 240px */}
      <MessagePane channelId={activeChannel}  
                   style={{ flex: 1 }} />      {/* flex:1 */}
      {activeThread && (
        <ThreadPanel threadId={activeThread}  
                     style={{ width: 400 }} /> {/* 400px */}
      )}
    </div>
  );
}

// Channel Switch Logic
function useChannelSwitch() {
  const dispatch = useDispatch();
  
  return useCallback((channelId: string) => {
    // 1. Mark previous channel as read
    const prevChannel = store.getState().activeChannelId;
    if (prevChannel) {
      dispatch(markChannelRead(prevChannel));
      wsManager.send('channel.unsubscribe', { channelId: prevChannel });
    }
    
    // 2. Switch active channel
    dispatch(setActiveChannel(channelId));
    
    // 3. Subscribe to new channel
    wsManager.send('channel.subscribe', { channelId });
    
    // 4. Load messages if not cached
    if (!store.getState().messages.byChannelId[channelId]) {
      dispatch(fetchMessages(channelId));
    }
  }, [dispatch]);
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Slack = Multi-Panel Layout + Channel Subscriptions + Normalized State + Unread Tracking."** Layout: workspace rail + channel sidebar + message pane + thread panel. WebSocket: single connection, subscribe to active channel only. Unread: `lastReadTimestamp` per channel, server counts messages after it. Cache last 100 messages per channel. Threads are a panel-in-panel pattern. Normalize: channels, messages, users, threads.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** The ultimate real-time frontend system design — tests multi-panel architecture, real-time subscriptions, state normalization, unread tracking, and performance at scale.
**How:** Panel-based responsive layout. WebSocket with selective channel subscriptions. Normalized Redux/Zustand store. Unread tracking via lastReadTimestamp. Message caching + virtualization. Thread panel as overlay.
**Companies:** Microsoft (Teams — direct competitor), Salesforce (Slack — they own it), Cisco (Webex — direct competitor), Adobe (internal team collaboration).
