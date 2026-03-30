# 233 – Notification System

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A frontend Notification System encompasses push notifications, in-app notification panels, badge counts, toast messages, and email/SMS triggers — all orchestrated through a unified architecture. Unlike a simple toast component, this is a **full system design** covering the notification center UI, real-time delivery via WebSocket/SSE, read/unread state management, notification grouping, user preferences, and cross-tab synchronization. It tests your ability to design a comprehensive end-to-end feature that spans frontend UI, state management, real-time communication, and user experience.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### System Architecture

```
Server (Notification Service)
    │
    ├── WebSocket / SSE  ──────────────────┐
    │                                       ▼
    │                              ┌──────────────────┐
    │                              │  NotificationHub  │ ← global store
    │                              └──────────────────┘
    │                                 │           │
    │                    ┌────────────┘           └──────────┐
    │                    ▼                                    ▼
    │          ┌──────────────┐                   ┌──────────────────┐
    │          │ Bell Icon +   │                   │  Toast Pop-ups    │
    │          │ Badge Count   │                   │  (transient)      │
    │          │ ┌──────────┐ │                   └──────────────────┘
    │          │ │ Panel     │ │
    │          │ │ ┌──────┐ │ │
    │          │ │ │Item 1│ │ │
    │          │ │ │Item 2│ │ │
    │          │ │ └──────┘ │ │
    │          │ └──────────┘ │
    │          └──────────────┘
```

### Data Model

```typescript
interface Notification {
  id: string;
  type: 'mention' | 'assignment' | 'comment' | 'system' | 'alert';
  title: string;
  body: string;
  avatar?: string;
  link?: string;          // deep link to relevant content
  read: boolean;
  createdAt: string;      // ISO timestamp
  groupKey?: string;      // for grouping ("3 people commented on X")
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actions?: { label: string; action: string }[];
}

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  isOpen: boolean;        // panel visibility
  hasMore: boolean;       // for pagination
  cursor: string | null;  // for cursor-based pagination
  preferences: NotificationPreferences;
}
```

### Real-Time Delivery

**WebSocket (bidirectional):**
```typescript
const ws = new WebSocket('wss://api.example.com/notifications');
ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  store.dispatch(addNotification(notification));
  if (notification.priority === 'high') showToast(notification);
  updateBadgeCount();
};
```

**Server-Sent Events (unidirectional, simpler):**
```typescript
const source = new EventSource('/api/notifications/stream');
source.onmessage = (event) => { /* same handling */ };
```

### Notification Grouping

"John, Sarah, and 3 others commented on your post" — collapse similar notifications:
```typescript
function groupNotifications(items: Notification[]): GroupedNotification[] {
  const groups = new Map<string, Notification[]>();
  for (const item of items) {
    const key = item.groupKey ?? item.id; // ungrouped = standalone
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    latest: items[0],
    count: items.length,
    actors: items.map(i => i.avatar).slice(0, 3),
  }));
}
```

### Cross-Tab Synchronization

If user reads a notification in Tab A, Tab B should update badge count:
```typescript
// BroadcastChannel API
const channel = new BroadcastChannel('notifications');
channel.onmessage = (event) => {
  if (event.data.type === 'MARK_READ') {
    store.dispatch(markAsRead(event.data.notificationId));
  }
};

// When marking as read:
function markRead(id: string) {
  store.dispatch(markAsRead(id));
  channel.postMessage({ type: 'MARK_READ', notificationId: id });
}
```

### Accessibility

- Bell icon: `aria-label="Notifications, 5 unread"` (dynamic count)
- Panel: `role="region"` with `aria-label="Notification center"`
- Each notification: accessible name, `role="article"` or `role="listitem"`
- New notifications: `aria-live="polite"` to announce arrival
- Keyboard: Tab into panel, Arrow keys navigate items, Enter activates, Escape closes

### Anti-Patterns

- ❌ Polling every second — use WebSocket/SSE for real-time delivery
- ❌ No grouping — 50 individual "X commented" notifications overwhelm users
- ❌ No persistent storage — notifications lost on refresh (they should be fetched from API)
- ❌ Sound on every notification — provide user preferences to disable
- ❌ No cross-tab sync — badge shows different counts in different tabs

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Slack Notifications
Slack has channel mentions, DMs, thread replies, and system alerts. Notifications are grouped by channel. They use a "Do Not Disturb" schedule, per-channel mute preferences, and cross-platform sync (web, desktop, mobile). Desktop uses the Web Push API.

### Hruday @ SAP Labs
At SAP, Fiori Launchpad has a centralized notification service integrated via OData. Notifications appear in the shell header bell icon with a count badge. Clicking opens a popup list with grouping by notification type. The same architecture pattern of a centralized notification hub applies to any enterprise app.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design a notification center with three layers: delivery (WebSocket connection for real-time push), state management (global store with normalized notifications), and UI (bell icon with badge, dropdown panel, toast pop-ups for high-priority items).*

*The data model: each notification has type, priority, read state, groupKey, and optional deep link. Notifications with the same groupKey are collapsed ('3 people commented on...').*

*Real-time delivery via WebSocket — when a notification arrives, it's added to the store and, if high-priority, triggers a toast. Badge count is computed as a selector counting unread items.*

*Cross-tab sync: I use BroadcastChannel API so marking as read in one tab updates all others immediately.*

*Accessibility: Bell button shows dynamic unread count in aria-label. Panel is navigable by keyboard. New notifications announced via aria-live='polite'. User preferences control notification types, sounds, and DND schedule."*

### Follow-ups

1. **"How do you handle notification overload?"** — Grouping, priority filtering, rate limiting (max 3 toasts per minute), and DND mode.
2. **"Web Push Notifications?"** — Service Worker + Push API + Notification API. Requires user permission. Fallback to in-app notifications if denied.
3. **"How to handle offline?"** — Cache notifications in IndexedDB. Sync when reconnected. Service Worker handles Push events while offline.

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Notification Store (Zustand)
import { create } from 'zustand';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  add: (n: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  add: (n) => set(state => ({
    notifications: [n, ...state.notifications],
    unreadCount: state.unreadCount + (n.read ? 0 : 1),
  })),
  markRead: (id) => {
    const n = get().notifications.find(n => n.id === id);
    if (!n || n.read) return;
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: state.unreadCount - 1,
    }));
    // Cross-tab sync
    broadcastChannel.postMessage({ type: 'MARK_READ', id });
    // Server sync
    fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },
  markAllRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),
}));

// WebSocket connection
function connectNotificationStream() {
  const ws = new WebSocket('wss://api.example.com/notifications');
  ws.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    useNotificationStore.getState().add(notification);
  };
  return ws;
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Notification System = WebSocket delivery + Global Store + Bell+Panel+Toast UI + Cross-tab sync."** Three UI layers: badge (count), panel (list), toast (transient). Group by groupKey. Cross-tab via BroadcastChannel. Preferences: type filters, DND, sound toggle. High-priority triggers toast, low-priority just updates badge. Accessibility: dynamic aria-label on bell, aria-live for new items.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Tests real-time architecture, global state management, UI layering, cross-tab communication, and user experience design — all in one feature.
**How:** WebSocket/SSE for real-time delivery. Zustand/Redux store for notification state. Bell icon (badge count) + dropdown panel (grouped list) + toast (transient high-priority). BroadcastChannel for cross-tab sync. User preferences for notification control.
**Companies:** Microsoft (Teams notifications — very deep), Adobe (Creative Cloud alerts), Salesforce (platform events + bell notifications), Cisco (Webex meeting alerts).
