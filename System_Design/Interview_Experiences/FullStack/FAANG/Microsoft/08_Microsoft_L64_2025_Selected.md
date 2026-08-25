# Microsoft — L64 FullStack Interview Experience (2025) — #8

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Software Engineer |
| **Level** | L64 (Senior) |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Redmond, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Microsoft Teams |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Coding + System Design + As Appropriate)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Find Median from Data Stream** (LeetCode 295)
2. **Follow-up: Handle duplicate values efficiently + support remove()**

### 💡 Median from Data Stream with Remove Support

```java
/**
 * Two heaps approach:
 * - maxHeap: stores smaller half (top = max of smaller half)
 * - minHeap: stores larger half (top = min of larger half)
 * 
 * Invariant: maxHeap.size() == minHeap.size() ± 1
 * Median = maxHeap.peek() (odd) or avg(maxHeap.peek(), minHeap.peek()) (even)
 * 
 * For remove(): use lazy deletion with a counter map.
 */
class MedianFinder {
    private PriorityQueue<Integer> maxHeap; // Lower half
    private PriorityQueue<Integer> minHeap; // Upper half
    private Map<Integer, Integer> removed;  // Lazy deletion counts
    private int maxHeapSize, minHeapSize;   // Effective sizes (excluding removed)
    
    MedianFinder() {
        maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        minHeap = new PriorityQueue<>();
        removed = new HashMap<>();
        maxHeapSize = 0;
        minHeapSize = 0;
    }
    
    void addNum(int num) {
        // Decide which heap to add to
        if (maxHeapSize == 0 || num <= maxHeap.peek()) {
            maxHeap.offer(num);
            maxHeapSize++;
        } else {
            minHeap.offer(num);
            minHeapSize++;
        }
        
        rebalance();
    }
    
    void removeNum(int num) {
        removed.merge(num, 1, Integer::sum);
        
        // Determine which heap contains this number
        if (num <= maxHeap.peek()) {
            maxHeapSize--;
        } else {
            minHeapSize--;
        }
        
        rebalance();
        prune(maxHeap);
        prune(minHeap);
    }
    
    double findMedian() {
        if (maxHeapSize == minHeapSize) {
            return ((double) maxHeap.peek() + minHeap.peek()) / 2.0;
        }
        return maxHeap.peek();
    }
    
    private void rebalance() {
        // maxHeap can have at most 1 more element than minHeap
        if (maxHeapSize > minHeapSize + 1) {
            minHeap.offer(maxHeap.poll());
            maxHeapSize--;
            minHeapSize++;
            prune(maxHeap);
        } else if (minHeapSize > maxHeapSize) {
            maxHeap.offer(minHeap.poll());
            minHeapSize--;
            maxHeapSize++;
            prune(minHeap);
        }
    }
    
    // Lazy deletion: remove elements from heap top that are marked for deletion
    private void prune(PriorityQueue<Integer> heap) {
        while (!heap.isEmpty()) {
            int top = heap.peek();
            if (removed.containsKey(top) && removed.get(top) > 0) {
                heap.poll();
                removed.merge(top, -1, Integer::sum);
                if (removed.get(top) == 0) removed.remove(top);
            } else {
                break;
            }
        }
    }
}
// Time: O(log n) add, O(1) findMedian, O(log n) amortized remove
// Space: O(n)
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Microsoft Teams Real-Time Communication Platform**
   - 1:1 and group chat messaging
   - Audio/video calls (P2P + SFU for groups)
   - Screen sharing
   - Presence indicators (online, away, busy, DnD)
   - Message reactions, threads, @mentions
   - Offline support and message sync
   - Scale: 300M monthly active users, 100K concurrent meetings

### 💡 Microsoft Teams Architecture

```
Architecture Overview:
┌──────────────────────────────────────────────────────┐
│                   Client Apps                         │
│  (Electron Desktop, Web, iOS, Android)               │
│  └── Offline cache (IndexedDB/SQLite)                │
│  └── SignalR connection (persistent WebSocket)       │
└─────────────────┬────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────┐
│              Azure Front Door (CDN + L7 LB)           │
└──────┬──────────┬───────────────┬────────────────────┘
       │          │               │
┌──────▼───┐ ┌───▼────────┐ ┌───▼────────────┐
│ Chat     │ │ Calling    │ │ Presence       │
│ Service  │ │ Service    │ │ Service        │
└──────────┘ └────────────┘ └────────────────┘

Chat Service:
┌─────────────────────────────────────────────────────┐
│ Message Flow:                                        │
│                                                      │
│ 1. Client sends message via SignalR                  │
│    → { threadId, content, attachments[], mentions[] }│
│                                                      │
│ 2. Chat Service:                                     │
│    a. Validate permissions (is user in this thread?) │
│    b. Assign message sequence number (per-thread     │
│       monotonic counter in Redis)                    │
│    c. Store in Cosmos DB (partition: threadId)        │
│    d. Publish to Azure Service Bus topic             │
│                                                      │
│ 3. Notification Service (subscribes to topic):       │
│    a. For each thread member:                        │
│       - If online (SignalR connected) → push via WS  │
│       - If mobile + offline → push notification      │
│       - Update unread counter (Redis INCR)           │
│                                                      │
│ 4. Mention processing:                               │
│    a. Extract @mentions from message                 │
│    b. Send targeted notifications                     │
│    c. Index for "Mentions" view                      │
│                                                      │
│ Message Schema (Cosmos DB):                          │
│ {                                                    │
│   "id": "msg-uuid",                                 │
│   "threadId": "thread-123",      // Partition key    │
│   "sequenceNumber": 42,                              │
│   "senderId": "user-456",                            │
│   "content": "Hello @everyone",                      │
│   "messageType": "text",         // text, card, file │
│   "mentions": [{"userId": "*", "type": "everyone"}], │
│   "reactions": {"👍": ["user-789"], "❤️": ["user-321"]},│
│   "threadReplyTo": "msg-prev-uuid",                  │
│   "editedAt": null,                                  │
│   "deletedAt": null,                                 │
│   "createdAt": "2025-04-15T10:30:00Z"               │
│ }                                                    │
└─────────────────────────────────────────────────────┘

Calling Service (Audio/Video):
┌─────────────────────────────────────────────────────┐
│ 1:1 Call: Peer-to-Peer (P2P) via WebRTC             │
│ ├── Signaling server: exchange SDP + ICE candidates  │
│ ├── STUN: discover public IP (NAT traversal)        │
│ └── TURN: relay if P2P fails (symmetric NAT)        │
│                                                      │
│ Group Call (3+ participants): SFU (Selective Forward) │
│ ├── Each participant sends 1 stream to SFU           │
│ ├── SFU forwards streams to other participants       │
│ ├── SFU can:                                        │
│ │   - Simulcast: sender sends multiple qualities     │
│ │   - Selective subscribe: receiver picks quality    │
│ │   - Last-N: only forward top N active speakers     │
│ │                                                    │
│ ├── Layout:                                         │
│ │   - Gallery view: all participants (low quality)   │
│ │   - Speaker view: active speaker (high quality)    │
│ │   - Together mode: composite view (server-side)   │
│ │                                                    │
│ └── Scale: SFU cluster per Azure region             │
│     - Cascading SFU: multi-region meetings          │
│     - Region A's SFU ↔ Region B's SFU (one stream)  │
│     - Reduces cross-region bandwidth                │
│                                                      │
│ Screen Share:                                        │
│ ├── getDisplayMedia() API on sender                  │
│ ├── Separate media stream (not mixed with camera)    │
│ ├── Higher resolution, lower frame rate (5-15fps)    │
│ └── Content type hint: motion vs detail              │
└─────────────────────────────────────────────────────┘

Presence Service:
┌─────────────────────────────────────────────────────┐
│ States: Available, Busy, DnD, BeRightBack, Away,     │
│         Offline, InAMeeting, Presenting              │
│                                                      │
│ Architecture:                                        │
│ • Client sends heartbeat every 30s via SignalR       │
│ • If no heartbeat for 5 min → Away                   │
│ • If no heartbeat for 15 min → Offline               │
│ • Calendar integration: InAMeeting auto-set          │
│ • Call status: InACall / Presenting auto-set         │
│                                                      │
│ Storage: Redis cluster (SETEX with TTL)              │
│ • Key: presence:{userId}                             │
│ • Value: {state, lastSeen, clientType}               │
│ • TTL: 20 min (auto-expire to Offline)               │
│                                                      │
│ Subscriptions: user subscribes to contacts' presence │
│ • Redis Pub/Sub per user                             │
│ • On change → push to subscribed clients             │
│ • Batched updates (every 5s) to reduce traffic       │
└─────────────────────────────────────────────────────┘

Offline Sync:
1. Client stores messages in IndexedDB (last 30 days)
2. On reconnect: send last known sequence number per thread
3. Server returns all messages with seq > client's seq
4. Conflict: server wins (no client-side message editing offline)
5. Attachments: download on demand, cache locally
```

---

## 🎯 Key Takeaways
- Microsoft L64 = **MedianFinder with lazy deletion + Teams real-time communication**
- **Two heaps + lazy deletion**: mark removed elements in HashMap, prune from heap top on access — O(log n) amortized
- **SignalR**: Microsoft's persistent WebSocket abstraction — handles reconnection, fallback to long polling
- **SFU (Selective Forwarding Unit)**: preferred over MCU for group calls — less server CPU, flexible quality
- **Cascading SFU**: multi-region meetings — one trunk stream between regions, then fan-out within region
- **Presence**: heartbeat-based with Redis TTL — auto-expire to Offline, calendar/call integration
- **Offline sync**: IndexedDB + sequence numbers — server sends delta on reconnect
- Microsoft interviews: **design + code** — expect Azure service usage in system design answers

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Hard | Two Heaps, Lazy Deletion |
| Coding 2 | Medium-Hard | Graph / DP |
| System Design | Very Hard | Real-Time Communication, WebRTC, SFU |
| As Appropriate | Medium | Leadership, Collaboration |
