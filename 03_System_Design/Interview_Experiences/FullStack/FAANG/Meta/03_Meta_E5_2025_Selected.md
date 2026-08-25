# Meta — E5 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta (Facebook) |
| **Role** | Software Engineer |
| **Level** | E5 (Senior) |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote (London → Bangalore transfer) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + 2 Coding + System Design + Behavioral)
- **Timeline:** 3 weeks
- **Format:** Virtual
- **Note:** Meta coding rounds are 35 min each. MUST solve 2 medium or 1 hard + 1 medium in 35 min.

---

## Round 1: Coding Round 1
**Duration:** 35 minutes | **2 Problems**

### Questions Asked
1. **Vertical Order Traversal of Binary Tree** (LeetCode 987)
2. **Remove Invalid Parentheses** (LeetCode 301) — only approach discussed due to time

### 💡 Interview-Ready Answer — Vertical Order Traversal

```java
public List<List<Integer>> verticalTraversal(TreeNode root) {
    // TreeMap: col → sorted list of {row, val}
    TreeMap<Integer, List<int[]>> colMap = new TreeMap<>();
    
    // BFS with coordinates
    Queue<Object[]> queue = new LinkedList<>();
    queue.offer(new Object[]{root, 0, 0}); // node, row, col
    
    while (!queue.isEmpty()) {
        Object[] curr = queue.poll();
        TreeNode node = (TreeNode) curr[0];
        int row = (int) curr[1], col = (int) curr[2];
        
        colMap.computeIfAbsent(col, k -> new ArrayList<>()).add(new int[]{row, node.val});
        
        if (node.left != null) queue.offer(new Object[]{node.left, row + 1, col - 1});
        if (node.right != null) queue.offer(new Object[]{node.right, row + 1, col + 1});
    }
    
    List<List<Integer>> result = new ArrayList<>();
    for (var entry : colMap.entrySet()) {
        List<int[]> nodes = entry.getValue();
        // Sort by row, then by value (for same position)
        nodes.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);
        result.add(nodes.stream().map(n -> n[1]).collect(Collectors.toList()));
    }
    return result;
}
```

---

## Round 2: Coding Round 2
**Duration:** 35 minutes | **2 Problems**

### Questions Asked
1. **Random Pick with Weight** (LeetCode 528)
2. **Find All Anagrams in a String** (LeetCode 438)

### 💡 Interview-Ready Answer — Random Pick with Weight

```java
class Solution {
    int[] prefixSum;
    Random random;
    
    public Solution(int[] w) {
        random = new Random();
        prefixSum = new int[w.length];
        prefixSum[0] = w[0];
        for (int i = 1; i < w.length; i++) {
            prefixSum[i] = prefixSum[i - 1] + w[i];
        }
    }
    
    public int pickIndex() {
        int target = random.nextInt(prefixSum[prefixSum.length - 1]) + 1;
        // Binary search for target in prefix sum
        int lo = 0, hi = prefixSum.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (prefixSum[mid] < target) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
// O(n) build, O(log n) per pick
```

---

## Round 3: System Design
**Duration:** 40 minutes

### Questions Asked
1. **Design Facebook Messenger**
   - 1:1 messaging, group chats, read receipts, online/offline status, media sharing

### 💡 Interview-Ready Answer

```
Facebook Messenger Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Client ◄───── WebSocket (persistent) ────► Chat Gateway    │
│                                                                │
│  Message Send Path:                                           │
│  1. Client sends message via WebSocket                       │
│  2. Chat Gateway validates auth + rate limit                 │
│  3. Message Service:                                          │
│     a. Generate message_id (timestamp-based: Snowflake ID)   │
│     b. Store in Messages DB                                   │
│     c. Update conversation's last_message + unread count     │
│  4. Push to recipients:                                       │
│     a. If online → push via WebSocket                        │
│     b. If offline → push to APNS/FCM for notification        │
│  5. Client receives ACK (message delivered)                  │
└──────────────────────────────────────────────────────────────┘

Message Delivery States:
  ✓   SENT (server received)
  ✓✓  DELIVERED (recipient device received)
  ✓✓  READ (recipient opened conversation — blue ticks)

Data Model (HBase / Cassandra):
┌──────────────────────────────────────────────────────────────┐
│  messages table:                                              │
│  Row Key: conversation_id                                     │
│  Column: message_id (timestamp-based → naturally sorted)     │
│  Value: {sender_id, content, type, timestamp, status}        │
│                                                                │
│  conversations table:                                         │
│  Row Key: user_id                                             │
│  Column: conversation_id                                      │
│  Value: {participants[], last_message, unread_count,         │
│           is_group, group_name, updated_at}                   │
│                                                                │
│  Why HBase over SQL:                                          │
│  - Writes are sequential (append new messages)               │
│  - Reads are sequential (fetch last N messages)              │
│  - Row key = conversation_id → all msgs in one partition     │
│  - Scale: Meta handles 100B+ messages/day                    │
└──────────────────────────────────────────────────────────────┘
```

#### Connection Management
```
Challenge: 2B+ devices need persistent WebSocket connections

Solution: Connection Gateway Service
┌──────────────────────────────────────────────────────────────┐
│  Connection Gateway (stateful):                               │
│  - Each server handles ~500K WebSocket connections           │
│  - Store mapping: user_id → gateway_server_id in Redis       │
│  - When sending message to user:                             │
│    1. Lookup: which gateway server has user's WebSocket?     │
│    2. Route message to that specific server                  │
│    3. Server pushes through WebSocket to client              │
│                                                                │
│  Presence (Online/Offline):                                   │
│  - Heartbeat every 30 seconds via WebSocket                  │
│  - If no heartbeat for 60s → mark offline                    │
│  - Lazy presence: don't broadcast to ALL friends             │
│    → Only check when friend opens chat list                  │
│    → "Last seen" is pre-computed, not real-time              │
│                                                                │
│  Reconnection Strategy:                                       │
│  - Exponential backoff: 1s, 2s, 4s, 8s, max 30s            │
│  - On reconnect: fetch messages since last_received_id       │
│  - Offline queue: messages pending for offline users         │
│    → TTL: 30 days, then discard                              │
└──────────────────────────────────────────────────────────────┘
```

#### Group Chat Fan-out
```
1:1 Message: Write once, read twice (sender + receiver)
Group Message (500 members): Write once + fan-out 500 notifications

Strategy: Write fan-out (not read fan-out)
- Store message once in group conversation
- Fan-out notifications to each member's inbox asynchronously
- For large groups (>100): rate-limit notifications (batch every 5 min)

Group membership stored separately:
- Add/remove member = metadata update only
- Messages are per-conversation, not per-user
```

---

## Round 4: Behavioral
**Duration:** 40 minutes

### Questions Asked
1. **"Tell me about a significant technical project you led"**
2. **"How do you handle disagreements with your team?"**
3. **"Describe a situation where you had to make a difficult trade-off"**

### 💡 Meta Behavioral Tips
> Meta behavioral is more relaxed than Amazon LP but still structured:
> - Focus on **impact** and **collaboration**
> - Show you can operate at senior level: influence without authority
> - Discuss trade-offs you've made (e.g., "We chose eventual consistency because...")
> - Meta loves: "Move Fast" stories — shipping under uncertainty

---

## 🎯 Key Takeaways
- Meta coding rounds are **35 minutes for 2 problems** — speed is critical
- **Vertical Order Traversal** (BFS + TreeMap) is a Meta favorite
- **Weighted Random** with prefix sum + binary search — know the pattern cold
- **Messenger design** = WebSocket + message delivery states + HBase storage
- **Connection gateway** pattern for millions of WebSocket connections
- **Lazy presence** (don't broadcast online/offline to all friends)
- **Group chat fan-out** strategy: write once, fan-out notifications
- At E5 level, system design deep-dives are expected — know the numbers (100B msgs/day)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Hard | Tree Traversal, Backtracking |
| Coding 2 | Medium | Prefix Sum, Sliding Window |
| System Design | Very Hard | Messaging, WebSocket, HBase |
| Behavioral | Medium | Impact, Leadership, Trade-offs |
