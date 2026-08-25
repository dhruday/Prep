# Meta — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta (Facebook) |
| **Role** | Frontend Engineer |
| **Level** | E5 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | London, UK → Menlo Park transfer |
| **Source** | [Blind](https://www.teamblind.com/post/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Coding + System Design + Behavioral)
- **Timeline:** 2 weeks
- **Note:** Meta FE interview is heavy on React internals + system design

---

## Round 1: Coding 1
**Duration:** 35 minutes

### Questions Asked
1. **Flatten Nested Object** (with dot notation keys)
2. **Follow-up: Unflatten it back**

### 💡 Interview-Ready Answer

```javascript
// Flatten: { a: { b: { c: 1 }, d: 2 } } → { "a.b.c": 1, "a.d": 2 }
function flatten(obj, prefix = '', result = {}) {
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    const newKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flatten(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

// Unflatten: { "a.b.c": 1, "a.d": 2 } → { a: { b: { c: 1 }, d: 2 } }
function unflatten(obj) {
  const result = {};
  
  for (const key in obj) {
    const parts = key.split('.');
    let current = result;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        // Check if next part is numeric → create array, else object
        current[part] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = obj[key];
  }
  
  return result;
}

// Test:
const flat = flatten({ a: { b: { c: 1 }, d: [2, 3] } });
// { "a.b.c": 1, "a.d": [2, 3] }  (arrays kept as-is)
```

---

## Round 2: Coding 2
**Duration:** 35 minutes

### Questions Asked
1. **Implement a Scheduler that runs max N tasks at a time** (Concurrency Limiter)
2. **Follow-up: Add priority support — higher priority tasks execute first**

### 💡 Concurrency-Limited Scheduler with Priority

```javascript
class TaskScheduler {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = []; // Priority queue (sorted array for simplicity)
  }
  
  add(task, priority = 0) {
    return new Promise((resolve, reject) => {
      const entry = { task, priority, resolve, reject };
      
      // Insert in priority order (higher priority = lower number = executes first)
      const insertIdx = this.queue.findIndex(e => e.priority > priority);
      if (insertIdx === -1) {
        this.queue.push(entry);
      } else {
        this.queue.splice(insertIdx, 0, entry);
      }
      
      this.tryRun();
    });
  }
  
  tryRun() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift();
      this.running++;
      
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.running--;
          this.tryRun();
        });
    }
  }
}

// Usage:
const scheduler = new TaskScheduler(2); // Max 2 concurrent

const delay = (ms, label) => () => new Promise(resolve => {
  console.log(`Started: ${label}`);
  setTimeout(() => { console.log(`Done: ${label}`); resolve(label); }, ms);
});

scheduler.add(delay(2000, 'A'), 2); // Low priority
scheduler.add(delay(1000, 'B'), 1); // High priority
scheduler.add(delay(500, 'C'), 1);  // High priority
scheduler.add(delay(1500, 'D'), 0); // Highest priority

// Execution order: D (priority 0), B (priority 1) → start first (max 2)
// When one finishes → C (priority 1) → then A (priority 2)
```

---

## Round 3: System Design
**Duration:** 40 minutes

### Questions Asked
1. **Design Facebook's Notifications System (Frontend)**
   - Real-time notifications, badge count, notification center, read/unread, push notifications

### 💡 Interview-Ready Answer

```
Notification System Frontend Design:
┌──────────────────────────────────────────────────────────────┐
│  Real-Time Delivery:                                          │
│  - Primary: SSE (Server-Sent Events)                         │
│    Why not WebSocket? Notifications are server→client only.  │
│    SSE is simpler, auto-reconnects, works with HTTP/2.       │
│  - Fallback: Long polling (for old browsers)                 │
│  - Push: Service Worker + Web Push API for background        │
│                                                                │
│  SSE Connection:                                              │
│  const source = new EventSource('/api/notifications/stream');│
│  source.onmessage = (e) => {                                │
│    const notification = JSON.parse(e.data);                  │
│    store.dispatch(addNotification(notification));             │
│    updateBadgeCount(+1);                                     │
│    if (document.hidden) showBrowserNotification(notification);│
│  };                                                           │
│  source.onerror = () => {                                    │
│    // EventSource auto-reconnects with exponential backoff   │
│  };                                                           │
└──────────────────────────────────────────────────────────────┘

Notification Center Component:
┌──────────────────────────────────────────────────────────────┐
│  State Management:                                            │
│  {                                                            │
│    notifications: [                                          │
│      { id, type, actor, action, target, timestamp, read,     │
│        thumbnail, deepLink }                                 │
│    ],                                                         │
│    unreadCount: 5,                                           │
│    hasMore: true,                                            │
│    lastFetchedAt: "2025-02-15T10:00:00Z"                    │
│  }                                                            │
│                                                                │
│  Notification Types (polymorphic rendering):                  │
│  - LIKE: "{actor} liked your {target}"                       │
│  - COMMENT: "{actor} commented on your {target}"             │
│  - FRIEND_REQUEST: "{actor} sent you a friend request"       │
│  - MENTION: "{actor} mentioned you in {target}"              │
│  - GROUP: "3 new posts in {group}"                           │
│                                                                │
│  Rendering Strategy:                                          │
│  function NotificationItem({ notification }) {                │
│    const renderers = {                                        │
│      LIKE: LikeNotification,                                 │
│      COMMENT: CommentNotification,                           │
│      FRIEND_REQUEST: FriendRequestNotification,              │
│      // ... extensible via registry pattern                  │
│    };                                                         │
│    const Renderer = renderers[notification.type];             │
│    return <Renderer data={notification} />;                  │
│  }                                                            │
│                                                                │
│  Mark as Read:                                                │
│  - Optimistic update: mark read in UI immediately            │
│  - Background API call: POST /api/notifications/read         │
│  - Batch: collect IDs for 1s → send single request           │
│  - IntersectionObserver: auto-mark read when scrolled into   │
│    view for > 1 second                                       │
└──────────────────────────────────────────────────────────────┘

Badge Count:
- Fetch initial count on page load: GET /api/notifications/count
- Increment on SSE event (no re-fetch needed)
- Decrement when notification marked as read
- Sync with server periodically (every 60s) to correct drift
- Tab title update: "(3) Facebook" when unread > 0
- Favicon badge: dynamic canvas-drawn favicon with count

Push Notifications (Background):
- Service Worker registered on first visit
- Web Push subscription → stored on server
- When new notification + user is away:
  server sends push via FCM/Web Push
- Service Worker receives → show system notification
- Click → navigate to deep link (e.g., the post that was liked)
```

---

## Round 4: Behavioral (E5 Calibration)
**Duration:** 35 minutes

### Questions Asked
1. **Tell me about a time you led a technical project with ambiguity**
2. **How do you handle cross-team dependencies?**
3. **Describe a situation where you had to influence without authority**

---

## 🎯 Key Takeaways
- Meta FE E5 expects **systems thinking** even in coding rounds — follow-ups are always about scale
- **Flatten/Unflatten** is a Meta FE classic — must handle arrays in unflatten
- **Concurrency Limiter** with priority queue = extremely common Meta question
- **SSE over WebSocket** for notifications — know WHY (unidirectional, auto-reconnect, HTTP/2 mux)
- **IntersectionObserver** for auto-marking notifications as read — elegant solution Meta likes
- **Push Notifications** via Service Worker + Web Push → know the full lifecycle
- E5 behavioral = demonstrate **leading through influence**, not authority

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | Object Manipulation, Recursion |
| Coding 2 | Medium-Hard | Concurrency, Promise, Priority Queue |
| System Design | Hard | Real-Time, SSE, Push Notifications |
| Behavioral | Medium-Hard | Leadership, Influence |
