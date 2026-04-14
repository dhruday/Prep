# LinkedIn — SDE-3 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Staff Software Engineer |
| **Level** | Senior Staff |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Rejection Reason** | System design — didn't address data consistency for cross-region replication |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + HM)

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Alien Dictionary** (LeetCode 269) — Topological Sort from word order
2. **Follow-up: Detect if the given word order is invalid**

### 💡 Alien Dictionary

```java
public String alienOrder(String[] words) {
    // Build adjacency list from word comparisons
    Map<Character, Set<Character>> adj = new HashMap<>();
    Map<Character, Integer> inDegree = new HashMap<>();
    
    // Initialize all characters
    for (String word : words) {
        for (char c : word.toCharArray()) {
            adj.putIfAbsent(c, new HashSet<>());
            inDegree.putIfAbsent(c, 0);
        }
    }
    
    // Compare adjacent words to derive ordering rules
    for (int i = 0; i < words.length - 1; i++) {
        String w1 = words[i], w2 = words[i + 1];
        
        // Edge case: "abc" before "ab" is INVALID
        if (w1.length() > w2.length() && w1.startsWith(w2)) return "";
        
        for (int j = 0; j < Math.min(w1.length(), w2.length()); j++) {
            char c1 = w1.charAt(j), c2 = w2.charAt(j);
            if (c1 != c2) {
                // c1 comes before c2 in alien alphabet
                if (adj.get(c1).add(c2)) { // Only if not already added
                    inDegree.merge(c2, 1, Integer::sum);
                }
                break; // Only first different character matters
            }
        }
    }
    
    // Topological sort (Kahn's BFS)
    Queue<Character> queue = new LinkedList<>();
    for (var entry : inDegree.entrySet()) {
        if (entry.getValue() == 0) queue.offer(entry.getKey());
    }
    
    StringBuilder result = new StringBuilder();
    while (!queue.isEmpty()) {
        char c = queue.poll();
        result.append(c);
        for (char neighbor : adj.get(c)) {
            int newDeg = inDegree.merge(neighbor, -1, Integer::sum);
            if (newDeg == 0) queue.offer(neighbor);
        }
    }
    
    // If not all characters included → cycle → invalid
    return result.length() == inDegree.size() ? result.toString() : "";
}
// Time: O(C) where C = total characters in all words
// Space: O(U + min(U², N)) where U = unique chars
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design LinkedIn Messaging System**
   - 1:1 and group messages (up to 50 people)
   - Read receipts and typing indicators
   - Message search (full-text within conversations)
   - Rich media: images, files, code blocks
   - InMail (messages to non-connections, premium feature)
   - Offline message delivery

### 💡 Key Design

```
Architecture:
┌──────────┐                    ┌──────────┐
│  Web App │◀──WebSocket───────▶│  WS      │
│  Mobile  │                    │  Gateway  │
└──────────┘                    └────┬─────┘
                                     │
      ┌──────────────────────────────┼──────────────────┐
      │                              │                   │
 ┌────▼────┐      ┌────────────┐  ┌──▼──────┐    ┌─────▼──────┐
 │ Message  │      │ Presence   │  │ Search  │    │ Notification│
 │ Service  │      │ Service    │  │ Service │    │ Service     │
 │ CRUD+fan │      │ typing,    │  │ ES index│    │ push/email  │
 │ out      │      │ online,    │  │         │    │             │
 │          │      │ read rcpt  │  │         │    │             │
 └────┬────┘      └──────┬─────┘  └─────────┘    └─────────────┘
      │                   │
 ┌────▼────┐         ┌───▼────┐
 │ Messages │         │ Redis  │
 │ DB       │         │ PubSub │
 │ (Sharded │         │ + Pres.│
 │ Cassandra)│        │        │
 └──────────┘         └────────┘

Data Model (Cassandra — write-optimized):
// Thread members (partition by conversation_id)
CREATE TABLE conversation_members (
    conversation_id UUID,
    member_id UUID,
    joined_at TIMESTAMP,
    last_read_at TIMESTAMP,
    PRIMARY KEY (conversation_id, member_id)
);

// Messages (partition by conversation_id, clustered by time DESC)
CREATE TABLE messages (
    conversation_id UUID,
    message_id TIMEUUID,
    sender_id UUID,
    content TEXT,
    content_type TEXT, -- text, image, file, code
    media_url TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (conversation_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);
// Recent messages first — pagination is reverse chronological

// User inbox (denormalized for fast "my conversations" query)
CREATE TABLE user_inbox (
    user_id UUID,
    conversation_id UUID,
    last_message_preview TEXT,
    last_message_at TIMESTAMP,
    unread_count INT,
    PRIMARY KEY (user_id, last_message_at)
) WITH CLUSTERING ORDER BY (last_message_at DESC);

Message Send Flow:
1. Client → WS Gateway → Message Service
2. Persist to Cassandra (messages table)
3. Fan-out to all conversation members:
   a. Update user_inbox for each member (unread_count++)
   b. Publish to Redis PubSub: channel=user:{memberId}
   c. If member online (WS connected) → real-time delivery via WebSocket
   d. If member offline → queue push notification (debounce 30s)
4. Index message in ElasticSearch (async via Kafka)

Read Receipts:
- Client sends: { type: 'read', conversation_id, message_id }
- Update last_read_at in conversation_members
- Broadcast to other members via Redis PubSub
- UI shows: blue tick = read by all, single tick = delivered

Typing Indicator:
- Client sends: { type: 'typing', conversation_id }
- DO NOT persist — ephemeral Redis key with 3s TTL
- Redis PubSub to other online members only
- Show "[Name] is typing..." with 3s debounce

Message Search:
- ElasticSearch index: { conversation_id, sender_id, content, created_at }
- Query: filter by user's conversations + full-text match on content
- Results: highlight matching text + link to message in context

Scale:
- 900M users, 100M DAU messaging
- 1B messages/day
- Cassandra: sharded by conversation_id, 3x replication
- WebSocket: 50M concurrent connections across 1000 gateway servers
- 99.9% delivery within 200ms for online users
```

---

## 🎯 Key Takeaways
- LinkedIn = **professional messaging + search + connection graph**
- **Alien Dictionary**: topological sort of character graph derived from word ordering
- **Invalid detection**: prefix check (`w1.startsWith(w2)` but w1 is longer) + cycle in topo sort
- **Messaging architecture**: Cassandra for write-heavy + fan-out + denormalized inbox
- **Fan-out on write**: update all members' inboxes at send time → fast reads for inbox list
- **Typing indicators**: ephemeral (Redis TTL 3s), never persist — reduce write load
- **Read receipts**: update `last_read_at`, compare with message timestamps to compute read status
- **Message search**: async ES indexing via Kafka — slight delay acceptable for search freshness

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Alien Dictionary, Topological Sort |
| Coding 2 | Medium | Graph, BFS |
| System Design | Hard | Messaging, Fan-Out, Cassandra |
| HM | Medium | LinkedIn Values |
