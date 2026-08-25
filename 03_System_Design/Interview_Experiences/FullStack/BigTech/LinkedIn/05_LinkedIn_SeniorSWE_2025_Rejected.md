# LinkedIn — Senior FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Senior Software Engineer |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected (System Design) |
| **Location** | Sunnyvale, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | LinkedIn Notifications |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Coding + System Design + Behavioral)

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Implement LFU Cache** (LeetCode 460) — O(1) for all operations
2. **Follow-up: Support expiry and bulk eviction**

### 💡 LFU Cache O(1)

```java
/**
 * LFU Cache with O(1) get/put/evict.
 * 
 * Key insight: maintain a frequency → doubly-linked-list map.
 * Each frequency bucket contains keys in LRU order.
 * Track minimum frequency for O(1) eviction.
 * 
 * Data structures:
 * 1. keyMap: key → Node (value, freq)
 * 2. freqMap: freq → DoublyLinkedList (LRU order within freq)
 * 3. minFreq: minimum frequency counter
 */
class LFUCache {
    private final int capacity;
    private int minFreq;
    private final Map<Integer, Node> keyMap;
    private final Map<Integer, DLinkedList> freqMap;
    
    LFUCache(int capacity) {
        this.capacity = capacity;
        this.minFreq = 0;
        this.keyMap = new HashMap<>();
        this.freqMap = new HashMap<>();
    }
    
    int get(int key) {
        Node node = keyMap.get(key);
        if (node == null) return -1;
        
        updateFreq(node);
        return node.val;
    }
    
    void put(int key, int value) {
        if (capacity == 0) return;
        
        Node node = keyMap.get(key);
        
        if (node != null) {
            node.val = value;
            updateFreq(node);
            return;
        }
        
        // Evict if at capacity
        if (keyMap.size() >= capacity) {
            DLinkedList minList = freqMap.get(minFreq);
            Node evicted = minList.removeLast(); // LRU within min-freq bucket
            keyMap.remove(evicted.key);
        }
        
        // Insert new node with freq = 1
        Node newNode = new Node(key, value);
        keyMap.put(key, newNode);
        freqMap.computeIfAbsent(1, k -> new DLinkedList()).addFirst(newNode);
        minFreq = 1; // New node always has freq 1 → it's the new minimum
    }
    
    private void updateFreq(Node node) {
        int oldFreq = node.freq;
        
        // Remove from current frequency bucket
        DLinkedList oldList = freqMap.get(oldFreq);
        oldList.remove(node);
        
        // If this was the min-freq bucket and it's now empty, increment minFreq
        if (oldFreq == minFreq && oldList.size == 0) {
            minFreq++;
        }
        
        // Add to new frequency bucket
        node.freq++;
        freqMap.computeIfAbsent(node.freq, k -> new DLinkedList()).addFirst(node);
    }
    
    static class Node {
        int key, val, freq;
        Node prev, next;
        
        Node(int key, int val) {
            this.key = key;
            this.val = val;
            this.freq = 1;
        }
    }
    
    static class DLinkedList {
        Node head, tail;
        int size;
        
        DLinkedList() {
            head = new Node(0, 0);
            tail = new Node(0, 0);
            head.next = tail;
            tail.prev = head;
            size = 0;
        }
        
        void addFirst(Node node) {
            node.next = head.next;
            node.prev = head;
            head.next.prev = node;
            head.next = node;
            size++;
        }
        
        void remove(Node node) {
            node.prev.next = node.next;
            node.next.prev = node.prev;
            size--;
        }
        
        Node removeLast() {
            Node last = tail.prev;
            remove(last);
            return last;
        }
    }
}
// All operations: O(1) time, O(capacity) space
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design LinkedIn's Notification System**
   - Multi-channel: in-app, email, push (mobile), SMS
   - Notification types: connections, messages, job alerts, endorsements, post reactions
   - User preferences: per-channel + per-type toggles
   - Aggregation: "5 people viewed your profile" instead of 5 separate notifications
   - Rate limiting: don't spam users
   - Scale: 900M members, 1B+ notifications/day

### 💡 Notification System Architecture

```
Architecture:
┌─────────────────────────────────────────────────────┐
│                Event Producers                       │
│  Connection accepted, Message received, Job match,   │
│  Post liked, Profile viewed, Endorsement, etc.       │
└──────────────┬──────────────────────────────────────┘
               │ Events → Kafka (topic: notifications.raw)
┌──────────────▼──────────────────────────────────────┐
│           Notification Processor (Flink)             │
│                                                      │
│  1. Event Enrichment:                                │
│     • Fetch user preferences (Redis cache)           │
│     • Fetch actor info (who triggered this)          │
│     • Fetch object info (what was affected)          │
│                                                      │
│  2. Preference Check:                                │
│     • User enabled this notification type?           │
│     • For which channels? (in-app, email, push)      │
│     • Frequency: real-time, daily digest, weekly?    │
│                                                      │
│  3. Rate Limiting:                                   │
│     • Per-user: max 50 notifications/day             │
│     • Per-type: max 5 connection suggestions/day     │
│     • Per-channel: max 3 push notifications/hour     │
│     • Redis: sliding window counter per user+type    │
│                                                      │
│  4. Aggregation (window-based):                      │
│     • Group by: (recipient, notification_type, object)│
│     • Window: 15 minutes                             │
│     • "5 people liked your post" instead of 5 msgs  │
│     • Key in Redis: agg:{userId}:{type}:{objectId}  │
│     • Count in window → threshold reached → send     │
│                                                      │
│  5. Priority Classification:                         │
│     • P0: Messages, connection acceptance (immediate)│
│     • P1: Job alerts, endorsements (within 5 min)   │
│     • P2: Profile views, post reactions (aggregated) │
│     • P3: Newsletters, tips (batched daily/weekly)   │
└──────────┬───────────┬──────────┬───────────────────┘
           │           │          │
    ┌──────▼───┐ ┌────▼────┐ ┌──▼──────────┐
    │ In-App   │ │ Push    │ │ Email       │
    │ Service  │ │ Service │ │ Service     │
    └──────────┘ └─────────┘ └─────────────┘

In-App Notification Service:
┌─────────────────────────────────────────────────┐
│ Storage: Cassandra (partition: userId)            │
│ • notification_id, type, actor, object, text     │
│ • created_at, read_at, clicked_at               │
│ • TTL: 90 days (auto-expire old notifications)   │
│                                                  │
│ Delivery: WebSocket (persistent connection)      │
│ • User online → push via WS immediately          │
│ • User offline → store in Cassandra, deliver     │
│   on next app open                               │
│                                                  │
│ Badge count: Redis INCR on new, DECR on read     │
│ • Key: badge:{userId}                            │
│ • Atomic operations for consistency               │
│                                                  │
│ Notification Feed:                               │
│ • GET /notifications?cursor={created_at}         │
│ • Return 20 notifications per page               │
│ • Grouped: "Alice and 3 others liked your post"  │
└─────────────────────────────────────────────────┘

Push Notification Service:
┌─────────────────────────────────────────────────┐
│ Channels:                                        │
│ • iOS: APNs (Apple Push Notification Service)    │
│ • Android: FCM (Firebase Cloud Messaging)        │
│                                                  │
│ Device Registry:                                 │
│ • userId → [{deviceToken, platform, lastActive}] │
│ • Stored in DynamoDB                             │
│ • Prune inactive devices (no ping in 30 days)    │
│                                                  │
│ Delivery:                                        │
│ 1. Lookup device tokens for user                 │
│ 2. Format payload per platform                   │
│ 3. Send to APNs/FCM                             │
│ 4. Handle failures: invalid token → remove,      │
│    rate limited → exponential backoff             │
│                                                  │
│ Silent push: data-only notification              │
│ → App processes in background                    │
│ → Used for badge count updates, content prefetch │
└─────────────────────────────────────────────────┘

Email Notification Service:
┌─────────────────────────────────────────────────┐
│ Modes:                                           │
│ • Immediate: P0 notifications (messages)         │
│ • Digest: daily/weekly aggregated email          │
│                                                  │
│ Digest pipeline:                                 │
│ 1. Cron job: daily at 8am user's local time      │
│ 2. Query Cassandra: unread notifications of type │
│    = P2/P3 from last 24 hours                    │
│ 3. Template rendering (Mustache/Handlebars)      │
│ 4. Send via SES (Amazon) / SendGrid              │
│ 5. Rate: max 1 digest email per day              │
│                                                  │
│ Unsubscribe: one-click unsubscribe header        │
│ • List-Unsubscribe: <https://..../unsub?token>   │
│ • CAN-SPAM compliant                             │
│ • Token = HMAC(userId + type) — no auth needed   │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- LinkedIn = **LFU Cache O(1) + Notification system design**
- **LFU key insight**: `minFreq` + frequency-to-DLL map — on put: new item is always freq=1 so `minFreq=1`
- **On updateFreq**: remove from old bucket, if old bucket was minFreq and now empty → `minFreq++`
- **Notification aggregation**: window-based grouping — "5 people liked your post" reduces notification fatigue
- **Priority classification**: P0-P3 determines delivery speed — messages are immediate, digests are batched
- **Rate limiting per user+type**: prevent spam — max 50/day total, max 5/type, max 3 push/hour
- **Email digest**: daily at user's local timezone — query unread P2/P3 notifications from last 24h
- LinkedIn rejected in **system design** — need deeper coverage of aggregation + delivery guarantees

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Hard | LFU Cache O(1) |
| Coding 2 | Medium-Hard | Graph / DP |
| System Design | Hard | Notification System, Multi-Channel |
| Behavioral | Medium | Leadership, Impact |
