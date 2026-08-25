# Microsoft — SDE-3 Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | SDE-3 (Senior) |
| **Level** | 63 |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Coding + System Design + Hiring Manager)
- **Rejection Reason:** System design — didn't adequately address multi-region consistency
- **Timeline:** 2 weeks

---

## Round 1: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Design Hit Counter** (LeetCode 362)
2. **Follow-up: Thread-safe version for multi-threaded monitoring system**

### 💡 Interview-Ready Answer

```java
class HitCounter {
    private final int[] times;
    private final int[] hits;
    private static final int WINDOW = 300; // 5 minutes
    
    public HitCounter() {
        times = new int[WINDOW];
        hits = new int[WINDOW];
    }
    
    public void hit(int timestamp) {
        int idx = timestamp % WINDOW;
        if (times[idx] != timestamp) {
            times[idx] = timestamp;
            hits[idx] = 1; // New second, reset counter
        } else {
            hits[idx]++;
        }
    }
    
    public int getHits(int timestamp) {
        int total = 0;
        for (int i = 0; i < WINDOW; i++) {
            if (timestamp - times[i] < WINDOW) {
                total += hits[i];
            }
        }
        return total;
    }
}
// Time: hit O(1), getHits O(300) = O(1)
// Space: O(300) = O(1)

// Thread-safe version
class ConcurrentHitCounter {
    private final AtomicLong[] buckets;
    private static final int WINDOW = 300;
    
    public ConcurrentHitCounter() {
        buckets = new AtomicLong[WINDOW];
        for (int i = 0; i < WINDOW; i++) {
            buckets[i] = new AtomicLong(0);
        }
    }
    
    // Each AtomicLong encodes: (timestamp << 32 | count)
    public void hit(int timestamp) {
        int idx = timestamp % WINDOW;
        while (true) {
            long current = buckets[idx].get();
            int storedTime = (int)(current >> 32);
            int count = (int)(current & 0xFFFFFFFFL);
            
            long newVal;
            if (storedTime != timestamp) {
                newVal = ((long) timestamp << 32) | 1L; // Reset
            } else {
                newVal = ((long) timestamp << 32) | (count + 1L); // Increment
            }
            
            if (buckets[idx].compareAndSet(current, newVal)) break;
            // CAS failed → retry (another thread modified)
        }
    }
    
    public int getHits(int timestamp) {
        int total = 0;
        for (int i = 0; i < WINDOW; i++) {
            long val = buckets[i].get();
            int storedTime = (int)(val >> 32);
            int count = (int)(val & 0xFFFFFFFFL);
            if (timestamp - storedTime < WINDOW) {
                total += count;
            }
        }
        return total;
    }
}
```

---

## Round 2: Coding 2
**Duration:** 45 minutes

### Questions Asked
1. **Reconstruct Itinerary** (LeetCode 332) — Hierholzer's Algorithm (Eulerian Path)

### 💡 Interview-Ready Answer

```java
public List<String> findItinerary(List<List<String>> tickets) {
    // Build graph: each airport → sorted destinations (priority queue)
    Map<String, PriorityQueue<String>> graph = new HashMap<>();
    
    for (List<String> ticket : tickets) {
        graph.computeIfAbsent(ticket.get(0), k -> new PriorityQueue<>())
             .offer(ticket.get(1));
    }
    
    // Hierholzer's: DFS, add to result when backtracking (no more edges)
    LinkedList<String> result = new LinkedList<>();
    dfs(graph, "JFK", result);
    return result;
}

private void dfs(Map<String, PriorityQueue<String>> graph, String airport, LinkedList<String> result) {
    PriorityQueue<String> destinations = graph.get(airport);
    while (destinations != null && !destinations.isEmpty()) {
        dfs(graph, destinations.poll(), result);
    }
    result.addFirst(airport); // Post-order: add when backtracking
}
// Time: O(E log E) where E = number of tickets (PQ operations)
// Space: O(E)

// Key insight: Post-order DFS builds Eulerian Path in reverse.
// Using PriorityQueue naturally gives lexicographically smallest itinerary.
// This works because:
// 1. If a node has remaining edges, keep exploring.
// 2. When stuck (no more edges), this node goes at the front.
// 3. This ensures dead-end paths are inserted in the middle of the result.
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Microsoft OneDrive / Dropbox File Sync System**
   - Multi-device sync, conflict resolution, offline editing, large file support

### 💡 Interview-Ready Answer

```
File Sync System Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Core Challenge:                                              │
│  - Sync files across multiple devices (laptop, phone, web)   │
│  - Handle offline editing → sync when reconnected            │
│  - Conflict resolution when same file edited on 2 devices    │
│  - Support large files (10GB+)                               │
│                                                                │
│  Sync Protocol:                                               │
│  1. File Watcher (client-side): detect local file changes    │
│     - OS-level: inotify (Linux), FSEvents (macOS), ReadDirectoryChangesW (Windows)
│  2. Compute block-level diff:                                │
│     - Split file into 4MB blocks (content-defined chunking)  │
│     - Hash each block (SHA-256)                              │
│     - Compare hashes with server → only upload changed blocks│
│  3. Upload changed blocks → server assembles file            │
│                                                                │
│  Content-Defined Chunking (Rabin Fingerprint):               │
│  - Variable-size chunks based on content boundaries          │
│  - Avg size: 4MB, Min: 1MB, Max: 8MB                        │
│  - Why? If you insert 1 byte at the start of a file:        │
│    - Fixed-size: ALL chunks shift → re-upload everything     │
│    - Content-defined: only first chunk changes               │
│                                                                │
│  Architecture:                                                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ Desktop   │─▶│ Sync Gateway │─▶│ Metadata Service │       │
│  │ Client    │  │ (WebSocket)  │  │ (file tree, ver) │       │
│  │           │  │              │  └────────┬─────────┘       │
│  │ File      │  │ Block Upload │           │                 │
│  │ Watcher   │  │ (gRPC stream)│  ┌────────▼─────────┐       │
│  └──────────┘  └──────────────┘  │ Block Store       │       │
│                                   │ (Azure Blob/S3)   │       │
│                                   └──────────────────┘       │
│                                                                │
│  Metadata Store (SQL — strong consistency):                   │
│  files:                                                       │
│    file_id UUID PK                                           │
│    user_id UUID FK                                           │
│    path VARCHAR(4096)    -- /Documents/report.docx           │
│    version BIGINT        -- monotonically increasing         │
│    block_list JSONB      -- [{hash, offset, size}, ...]      │
│    size BIGINT                                               │
│    modified_at TIMESTAMP                                     │
│    is_deleted BOOLEAN    -- soft delete for 30 days          │
│                                                                │
│  Conflict Resolution (WHY I GOT REJECTED):                   │
│  Strategy: Last-Writer-Wins (LWW) with conflict fork:        │
│  1. Device A edits file → uploads with version=5             │
│  2. Device B (offline) edits same file → has version=4       │
│  3. Device B reconnects → tries to upload with version=4     │
│  4. Server rejects: version conflict (server has 5)          │
│  5. Client B: download version 5 + save B's version as       │
│     "report (conflict copy - DeviceB - Mar2025).docx"        │
│  6. User manually resolves                                   │
│                                                                │
│  Multi-Region (WHAT I MISSED):                                │
│  - Metadata: strong consistency via Paxos/Raft (CockroachDB) │
│  - Blocks: eventual consistency OK (immutable, content-hash) │
│  - Write goes to nearest region → replicate to others async  │
│  - Read: prefer local region, fall back to remote            │
│  - Region failover: DNS-based, 30s TTL                       │
│  - Cross-region conflict: CRDTs for file tree operations     │
│    (create/delete/rename are commutative with CRDTs)         │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Microsoft SDE-3 expects **deep system design** — multi-region is critical to address
- **Hit Counter** with CAS (Compare-And-Swap) for thread safety — pack timestamp + count in long
- **Hierholzer's Algorithm** for Eulerian Path — DFS with post-order insertion
- **Content-Defined Chunking** (Rabin Fingerprint) is the key optimization for file sync
- **Conflict resolution** = version-based with conflict fork (not auto-merge for binary files)
- **I failed because** I only discussed single-region — always discuss multi-region for Microsoft
- Microsoft values **Windows/Office integration** context in answers

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | Hit Counter, Thread Safety, CAS |
| Coding 2 | Hard | Eulerian Path, Hierholzer's, DFS Post-Order |
| System Design | Very Hard | File Sync, Chunking, Multi-Region, CRDTs |
| HM | Medium | Behavioral + Leadership |
