# Google — L4 Interview Experience (April 2026)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer L4 |
| **Level** | L4 |
| **YOE** | 4 years |
| **Date** | April 2026 |
| **Result** | ⏳ Pending |
| **Location** | Remote |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/post/7881477/google-l4-chances-by-anonymous_user-ik8e/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 3 Technical + 1 Behavioral)
- **Timeline:** ~2 weeks
- **Format:** Virtual via Google Meet + Google Docs for coding

---

## Round 1: DSA — Monotonic Stack
**Duration:** 45 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Count Visible People — Variant**
   - Problem: Given an array of heights representing people standing in a line, for each person, count how many people they can see to their right. If the observer is taller, shorter people behind are visible until blocked by someone equal or taller.
   - Twist: Modified visibility rules — a shorter person between two taller people is visible to the leftmost taller one.

### 💡 Interview-Ready Answer

**Approach: Brute Force → Monotonic Stack**

**Brute Force O(n²):** For each person, scan right and count visible people until blocked.

**Optimal — Monotonic Decreasing Stack O(n):**

The key insight: traverse from right to left. Maintain a stack of heights in decreasing order. For each person, pop all shorter people (they're visible) and count them. If the stack isn't empty after popping, the person at the top is also visible (the first taller person that blocks further view).

```java
public int[] canSeePersonsCount(int[] heights) {
    int n = heights.length;
    int[] result = new int[n];
    Deque<Integer> stack = new ArrayDeque<>(); // monotonic decreasing stack
    
    for (int i = n - 1; i >= 0; i--) {
        int count = 0;
        
        // Pop all shorter people — current person can see them
        while (!stack.isEmpty() && stack.peek() < heights[i]) {
            stack.pop();
            count++;
        }
        
        // If stack not empty, current person can also see the first taller/equal person
        if (!stack.isEmpty()) {
            count++;
        }
        
        result[i] = count;
        stack.push(heights[i]);
    }
    
    return result;
}
```

**Time Complexity:** O(n) — each element pushed and popped at most once
**Space Complexity:** O(n) — stack space

**Edge Cases:**
- All same height → each person sees exactly 1 (the immediate next person)
- Strictly increasing → each person sees exactly 1
- Strictly decreasing → first person sees all n-1 people
- Single person → sees 0
- Two people → first sees 1, second sees 0

**Dry Run:**
```
heights = [10, 6, 8, 5, 11, 9]

i=5: stack=[], count=0 → result[5]=0, stack=[9]
i=4: 9<11→pop, count=1, stack empty → result[4]=1, stack=[11]
i=3: 11>5→stop, stack not empty→count+1 → result[3]=1, stack=[5,11]
i=2: 5<8→pop, count=1; 11>8→stop, count+1=2 → result[2]=2, stack=[8,11]
i=1: 8>6→stop, count+1=1 → result[1]=1, stack=[6,8,11]
i=0: 6<10→pop(1); 8<10→pop(2); 11>10→stop, count+1=3 → result[0]=3, stack=[10,11]

Result: [3, 1, 2, 1, 1, 0] ✓
```

### Follow-up Questions
- "What if people are standing in a circle?" → Use 2x array trick (circular array), traverse 2n elements
- "What if we need to count visible people in both directions?" → Run the algorithm twice (left-to-right and right-to-left)
- "Can you do this in O(1) extra space?" → Not possible with stack approach; need O(n) auxiliary

---

## Round 2: System Design — Design Google Docs
**Duration:** 45 minutes | **Interviewer:** Staff SDE

### Questions Asked
1. **Design Google Docs (Real-time Collaborative Editing)**
   - Support multiple users editing the same document simultaneously
   - Show real-time cursors of other users
   - Handle conflict resolution
   - Scale to millions of documents

### 💡 Interview-Ready Answer

**Step 1: Requirements Gathering**

**Functional:**
- Create, edit, delete documents
- Real-time collaborative editing (multiple users, same document)
- Rich text formatting (bold, italic, lists, tables)
- Show active collaborators and their cursor positions
- Version history and undo/redo
- Comments and suggestions

**Non-Functional:**
- Low latency: < 100ms for edits to appear on other users' screens
- Strong eventual consistency (all users converge to same state)
- Support 100+ concurrent editors per document
- Availability: 99.99% uptime
- Scale: 1B+ documents, 100M DAU

**Back-of-Envelope:**
- 100M DAU, avg 5 edits/minute = 500M edits/min ≈ 8.3M ops/sec
- Document size: avg 50KB, max 10MB
- Storage: 1B docs × 50KB = 50TB active data

**Step 2: High-Level Architecture**

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client     │────▶│   API Gateway     │────▶│  Auth Service   │
│  (Browser)   │     │   (Load Balancer) │     │  (OAuth/SSO)    │
│              │     └──────┬───────────┘     └─────────────────┘
│  - Editor UI │            │
│  - CRDT      │     ┌──────▼───────────┐     ┌─────────────────┐
│    Engine    │     │ Collaboration     │────▶│  Presence        │
│  - WebSocket │◀───▶│ Service           │     │  Service         │
│    Client    │     │ (OT/CRDT Server)  │     │  (Redis PubSub)  │
└─────────────┘     └──────┬───────────┘     └─────────────────┘
                           │ 
                    ┌──────▼───────────┐     ┌─────────────────┐
                    │  Document         │────▶│  Version History │
                    │  Service          │     │  Service         │
                    │  (CRUD + Storage) │     │  (Event Sourcing)│
                    └──────┬───────────┘     └─────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Spanner  │ │  GCS     │ │  Redis   │
        │  (Meta)   │ │  (Blobs) │ │  (Cache) │
        └──────────┘ └──────────┘ └──────────┘
```

**Step 3: Core Algorithm — CRDT vs OT**

| Aspect | OT (Operational Transform) | CRDT (Conflict-free Replicated Data Types) |
|--------|---------------------------|-------------------------------------------|
| **Consistency** | Requires central server | Decentralized, eventually consistent |
| **Latency** | Server round-trip needed | Immediate local apply |
| **Complexity** | O(n²) transform pairs | O(1) merge operations |
| **Used by** | Google Docs (original) | Figma, Yjs, Automerge |

**Chosen: CRDT (Yjs-style) for modern implementation**

```
CRDT Operation Structure:
{
  "siteId": "user-123",
  "clock": 42,
  "type": "insert",
  "position": [1, 3, 2],  // fractional index
  "content": "H",
  "formatting": {"bold": true}
}
```

**Step 4: Real-time Communication**

```
Client A ──edit──▶ WebSocket ──▶ Collab Service ──broadcast──▶ Client B, C
                                      │
                                      ▼
                              Persist to Document DB
                              (async, batched every 2s)
```

- Use **WebSocket** for bidirectional real-time communication
- **Presence channel** (separate lightweight connection) for cursor positions
- **Batching:** Client batches local operations every 50ms before sending

**Step 5: Database Schema**

```sql
-- Documents table (Spanner)
CREATE TABLE documents (
    doc_id       STRING(36) PRIMARY KEY,      -- UUID
    owner_id     STRING(36) NOT NULL,
    title        STRING(500),
    created_at   TIMESTAMP NOT NULL,
    updated_at   TIMESTAMP NOT NULL,
    is_deleted   BOOL DEFAULT false,
    content_ref  STRING(500)                  -- GCS blob reference
);

-- Document versions (Event Sourcing)
CREATE TABLE doc_operations (
    doc_id       STRING(36),
    seq_num      INT64,
    site_id      STRING(36),
    operation    BYTES(MAX),                  -- serialized CRDT op
    timestamp    TIMESTAMP,
    PRIMARY KEY (doc_id, seq_num)
);

-- Active sessions
CREATE TABLE active_sessions (
    doc_id       STRING(36),
    user_id      STRING(36),
    cursor_pos   INT64,
    color        STRING(7),                   -- hex color for cursor
    last_seen    TIMESTAMP,
    PRIMARY KEY (doc_id, user_id)
);
```

**Step 6: Conflict Resolution**

```
User A types "Hello" at position 5
User B deletes character at position 3 (simultaneously)

Without CRDT:
  A sees: "HelHellolo" (duplicate)

With CRDT (fractional indexing):
  A's insert: position (0.5, 0.6, 0.7, 0.8, 0.9)
  B's delete: removes element at position 0.3
  
  Both converge to same state: "HeHellolo" → "HeHello"
  Operations are commutative and idempotent ✓
```

**Step 7: Scale Considerations**
- **Hot documents** (1000+ simultaneous editors): Shard collaboration service by document, use dedicated instance
- **Offline support:** Queue operations locally, sync on reconnect using CRDT merge
- **Storage optimization:** Snapshot documents periodically, compact operation logs

### Follow-up Questions
- "How do you handle offline editing?" → CRDT's commutative property allows merge without conflicts on reconnect
- "How would you implement undo/redo?" → Per-user operation stack; undo generates inverse CRDT operation
- "What about permissions?" → ACL service: Owner/Editor/Viewer/Commenter roles, cached in Redis

---

## Round 3: Behavioral — Googleyness
**Duration:** 45 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **"Tell me about a time you navigated ambiguity"**
2. **"How do you bring others along when they disagree with your approach?"**

### 💡 Interview-Ready Answers (STAR Format)

**Q: "Navigating ambiguity"**

**Situation:** Our company acquired a startup, and I was tasked with integrating their user authentication system into our platform. There was no technical documentation, no architecture diagrams, and the acquired team had left. We had 6 weeks before the SLA deadline.

**Task:** Understand the existing auth system, create an integration plan, and migrate 2M users without downtime.

**Action:** Week 1: I reverse-engineered the codebase (Node.js/MongoDB) by writing integration tests against production (read-only). Mapped the data model and auth flow. Week 2: Identified the gap — their system used custom JWT tokens incompatible with our OAuth2. Proposed a token translation layer as an intermediate step rather than a "big bang" migration. Week 3-5: Built the translation layer, ran shadow traffic to validate. Week 6: Blue-green deployment with instant rollback capability.

**Result:** Zero-downtime migration of 2M users. The token translation layer became a reusable component used by 3 other integrations. Completed 4 days ahead of deadline.

---

## 🎯 Key Takeaways
- Google L4 DSA rounds focus on **pattern recognition** — monotonic stack, sliding window, BFS/DFS
- System Design at L4 expects you to **drive the discussion** — requirements → architecture → deep dive
- Googleyness round values **intellectual humility** and **collaborative problem-solving**
- Always **quantify** your behavioral answers with metrics
- Monotonic stack problems are a **Google favorite** — practice all variants

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 (DSA) | Medium-Hard | Monotonic Stack, Arrays |
| Round 2 (System Design) | Hard | CRDT, WebSocket, Distributed Systems |
| Round 3 (Behavioral) | Medium | Googleyness, Leadership |
