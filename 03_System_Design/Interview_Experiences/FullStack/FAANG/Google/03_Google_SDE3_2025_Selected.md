# Google — SDE-3 (L5) Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Senior Software Engineer (SDE-3) |
| **Level** | L5 |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Mountain View, CA |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/google-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 6 (Recruiter Screen + Technical Screen + 4 Onsite)
- **Timeline:** 4 weeks end-to-end
- **Format:** Onsite at Googleplex, 45 min each round
- **Note:** L5 rounds demand system-level thinking, cross-team impact, and leadership signals

---

## Round 1: Phone Screen — Recruiter
**Duration:** 30 minutes

### Questions Asked
1. Background walkthrough, motivation for Google
2. Current role responsibilities and team size
3. Compensation expectations and timeline

### 💡 Interview-Ready Answer
> Keep it concise: "8 years of experience, currently leading a platform team of 12 at [Company], built distributed data pipelines processing 500M events/day. Looking for L5 at Google to work on infrastructure problems at planetary scale."

---

## Round 2: Technical Screen — Coding
**Duration:** 45 minutes | **Interviewer:** L5 SDE

### Questions Asked
1. **Minimum Window Substring** (LeetCode 76)
   - Given strings `s` and `t`, find the minimum window in `s` that contains all characters of `t`

### 💡 Interview-Ready Answer

**Approach:** Sliding Window with Character Frequency Map

```java
public String minWindow(String s, String t) {
    if (s.length() < t.length()) return "";
    
    // Count required characters
    Map<Character, Integer> required = new HashMap<>();
    for (char c : t.toCharArray()) {
        required.merge(c, 1, Integer::sum);
    }
    
    int have = 0, need = required.size();
    Map<Character, Integer> window = new HashMap<>();
    int[] result = {-1, 0, 0}; // length, left, right
    int left = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        window.merge(c, 1, Integer::sum);
        
        // Check if current char's frequency matches required
        if (required.containsKey(c) && window.get(c).intValue() == required.get(c).intValue()) {
            have++;
        }
        
        // Try to contract window from left
        while (have == need) {
            int windowLen = right - left + 1;
            if (result[0] == -1 || windowLen < result[0]) {
                result[0] = windowLen;
                result[1] = left;
                result[2] = right;
            }
            
            char leftChar = s.charAt(left);
            window.merge(leftChar, -1, Integer::sum);
            if (required.containsKey(leftChar) && window.get(leftChar) < required.get(leftChar)) {
                have--;
            }
            left++;
        }
    }
    
    return result[0] == -1 ? "" : s.substring(result[1], result[2] + 1);
}
```

**Complexity:** Time O(|s| + |t|), Space O(|s| + |t|)

**Edge Cases:**
- `t` longer than `s` → return ""
- `t` has duplicate chars → frequency must match exactly
- Multiple valid windows → return any minimum
- `s` == `t` → return `s`

**Follow-ups:**
- "Can you do it with an array instead of HashMap?" → Yes, int[128] for ASCII — faster constant factor
- "What if we need all minimum windows?" → Don't break early in contraction loop, collect all of same min length

---

## Round 3: Onsite — System Design
**Duration:** 45 minutes | **Interviewer:** Staff SDE (L6)

### Questions Asked
1. **Design a Distributed Message Queue (Google Pub/Sub)**

### 💡 Interview-Ready Answer

#### Requirements Gathering
**Functional:**
- Publishers send messages to topics
- Subscribers receive messages from subscriptions (push/pull)
- At-least-once delivery guarantee
- Message ordering within a partition
- Dead letter queue for failed messages
- Message retention (7 days default)

**Non-Functional:**
- Throughput: 10M messages/sec globally
- Latency: < 100ms publish-to-deliver (P99)
- Durability: 99.999% (no message loss)
- Availability: 99.99%

#### Back-of-Envelope Calculations
```
Messages: 10M/sec = 864B/day
Avg message size: 1KB
Storage/day: 864B * 1KB = 864TB/day
7-day retention: ~6PB
Write throughput: 10M * 1KB = 10GB/sec
```

#### High-Level Architecture
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Publishers  │────▶│  API Gateway /   │────▶│  Topic Router   │
│  (gRPC/HTTP) │     │  Load Balancer   │     │  (Consistent    │
└─────────────┘     └──────────────────┘     │   Hashing)      │
                                              └────────┬────────┘
                                                       │
                    ┌──────────────────────────────────┤
                    ▼                                  ▼
            ┌──────────────┐                ┌──────────────┐
            │  Partition 0 │                │  Partition N  │
            │  ┌─────────┐ │                │  ┌─────────┐ │
            │  │ WAL Log  │ │                │  │ WAL Log  │ │
            │  │ (Append) │ │                │  │ (Append) │ │
            │  └─────────┘ │                │  └─────────┘ │
            │  ┌─────────┐ │                │  ┌─────────┐ │
            │  │Replicas  │ │                │  │Replicas  │ │
            │  │(3x Raft) │ │                │  │(3x Raft) │ │
            │  └─────────┘ │                │  └─────────┘ │
            └──────┬───────┘                └──────┬───────┘
                   │                               │
                   ▼                               ▼
            ┌──────────────────────────────────────────┐
            │         Subscription Manager              │
            │  ┌────────────┐    ┌────────────────┐    │
            │  │ Pull Subs  │    │ Push Subs      │    │
            │  │ (Consumer  │    │ (Webhook/gRPC  │    │
            │  │  polls)    │    │  delivery)     │    │
            │  └────────────┘    └────────────────┘    │
            └──────────────────────────────────────────┘
                   │
                   ▼
            ┌──────────────┐
            │  Subscribers  │
            └──────────────┘
```

#### Key Components
1. **Topic Router:** Consistent hashing assigns messages to partitions. Each topic has N partitions (configurable).
2. **Write-Ahead Log (WAL):** Append-only log per partition. Messages are immutable once written. Indexed by offset.
3. **Replication:** Raft consensus (3 replicas). Leader handles writes, followers replicate. Auto leader election on failure.
4. **Subscription Manager:** Tracks consumer offsets per subscription. Supports fan-out (multiple subs per topic).
5. **Dead Letter Queue:** Messages failing delivery after N retries → moved to DLQ topic.

#### Database Schema
```sql
-- Topic metadata (stored in Spanner/CockroachDB for global consistency)
CREATE TABLE topics (
    topic_id        UUID PRIMARY KEY,
    name            VARCHAR(255) UNIQUE,
    num_partitions  INT DEFAULT 8,
    retention_days  INT DEFAULT 7,
    created_at      TIMESTAMP
);

-- Subscriptions
CREATE TABLE subscriptions (
    sub_id          UUID PRIMARY KEY,
    topic_id        UUID REFERENCES topics(topic_id),
    name            VARCHAR(255),
    type            ENUM('PULL', 'PUSH'),
    push_endpoint   VARCHAR(512),
    ack_deadline_ms INT DEFAULT 10000,
    max_retries     INT DEFAULT 5
);

-- Consumer offsets (stored in distributed KV store like Bigtable)
-- Key: {sub_id}:{partition_id}
-- Value: {last_ack_offset, pending_offsets[]}
```

#### API Design
```
POST /v1/topics/{topic}/publish
Body: { "messages": [{"data": "base64...", "attributes": {"key": "val"}}] }
Response: { "messageIds": ["id1", "id2"] }

POST /v1/subscriptions/{sub}/pull
Body: { "maxMessages": 100 }
Response: { "messages": [{"ackId": "...", "message": {...}}] }

POST /v1/subscriptions/{sub}/acknowledge
Body: { "ackIds": ["id1", "id2"] }

POST /v1/subscriptions/{sub}/modifyAckDeadline
Body: { "ackIds": ["id1"], "ackDeadlineSeconds": 30 }
```

#### Deep Dive: Exactly-Once Delivery
- **At-least-once:** Default. Re-deliver on ack timeout.
- **Exactly-once:** Dedup using message fingerprint (hash of payload + attributes). Store in Bloom filter + LRU cache per subscription. Check before delivery.
- **Ordering:** Messages with same ordering key → same partition. Consumer processes sequentially within partition.

#### Trade-offs
| Decision | Choice | Why |
|----------|--------|-----|
| Storage | Append-only WAL | Sequential writes = high throughput, SSDs optimized for sequential |
| Consensus | Raft (not Paxos) | Simpler, understandable, battle-tested (etcd) |
| Push vs Pull | Both | Push for low-latency; Pull for batch consumers |
| Ordering | Per-partition only | Global ordering kills throughput (single writer bottleneck) |

---

## Round 4: Onsite — Coding II
**Duration:** 45 minutes | **Interviewer:** L5 SDE

### Questions Asked
1. **Word Ladder II** (LeetCode 126) — Find all shortest transformation sequences
2. **Alien Dictionary** (LeetCode 269) — Given sorted alien words, find character order

### 💡 Interview-Ready Answer — Word Ladder II

```java
public List<List<String>> findLadders(String beginWord, String endWord, List<String> wordList) {
    Set<String> wordSet = new HashSet<>(wordList);
    List<List<String>> result = new ArrayList<>();
    if (!wordSet.contains(endWord)) return result;
    
    // BFS to build shortest-path DAG
    Map<String, List<String>> parents = new HashMap<>();
    Map<String, Integer> distance = new HashMap<>();
    distance.put(beginWord, 0);
    
    Queue<String> queue = new LinkedList<>();
    queue.offer(beginWord);
    boolean found = false;
    
    while (!queue.isEmpty() && !found) {
        int size = queue.size();
        Set<String> visited = new HashSet<>();
        
        for (int i = 0; i < size; i++) {
            String word = queue.poll();
            char[] chars = word.toCharArray();
            
            for (int j = 0; j < chars.length; j++) {
                char original = chars[j];
                for (char c = 'a'; c <= 'z'; c++) {
                    if (c == original) continue;
                    chars[j] = c;
                    String next = new String(chars);
                    
                    if (wordSet.contains(next)) {
                        if (!distance.containsKey(next)) {
                            distance.put(next, distance.get(word) + 1);
                            visited.add(next);
                            queue.offer(next);
                        }
                        if (distance.get(next) == distance.get(word) + 1) {
                            parents.computeIfAbsent(next, k -> new ArrayList<>()).add(word);
                        }
                        if (next.equals(endWord)) found = true;
                    }
                }
                chars[j] = original;
            }
        }
    }
    
    // DFS backtrack from endWord to beginWord using parents map
    if (found) {
        List<String> path = new ArrayList<>();
        path.add(endWord);
        backtrack(endWord, beginWord, parents, path, result);
    }
    return result;
}

private void backtrack(String word, String beginWord, Map<String, List<String>> parents,
                       List<String> path, List<List<String>> result) {
    if (word.equals(beginWord)) {
        List<String> copy = new ArrayList<>(path);
        Collections.reverse(copy);
        result.add(copy);
        return;
    }
    for (String parent : parents.getOrDefault(word, Collections.emptyList())) {
        path.add(parent);
        backtrack(parent, beginWord, parents, path, result);
        path.remove(path.size() - 1);
    }
}
```

**Complexity:** Time O(N * M * 26) for BFS + O(paths) for backtracking. Space O(N * M).

### 💡 Interview-Ready Answer — Alien Dictionary

```java
public String alienOrder(String[] words) {
    // Build adjacency list from consecutive word pairs
    Map<Character, Set<Character>> graph = new HashMap<>();
    Map<Character, Integer> inDegree = new HashMap<>();
    
    // Initialize all characters
    for (String word : words) {
        for (char c : word.toCharArray()) {
            graph.putIfAbsent(c, new HashSet<>());
            inDegree.putIfAbsent(c, 0);
        }
    }
    
    // Build edges from adjacent words
    for (int i = 0; i < words.length - 1; i++) {
        String w1 = words[i], w2 = words[i + 1];
        // Edge case: ["abc", "ab"] → invalid
        if (w1.length() > w2.length() && w1.startsWith(w2)) return "";
        
        for (int j = 0; j < Math.min(w1.length(), w2.length()); j++) {
            if (w1.charAt(j) != w2.charAt(j)) {
                if (graph.get(w1.charAt(j)).add(w2.charAt(j))) {
                    inDegree.merge(w2.charAt(j), 1, Integer::sum);
                }
                break;
            }
        }
    }
    
    // Topological sort (Kahn's BFS)
    Queue<Character> queue = new LinkedList<>();
    for (var entry : inDegree.entrySet()) {
        if (entry.getValue() == 0) queue.offer(entry.getKey());
    }
    
    StringBuilder order = new StringBuilder();
    while (!queue.isEmpty()) {
        char c = queue.poll();
        order.append(c);
        for (char neighbor : graph.get(c)) {
            inDegree.merge(neighbor, -1, Integer::sum);
            if (inDegree.get(neighbor) == 0) queue.offer(neighbor);
        }
    }
    
    // If not all chars included → cycle exists → invalid
    return order.length() == inDegree.size() ? order.toString() : "";
}
```

**Complexity:** Time O(C) where C = total characters across all words. Space O(U + E) for graph.

---

## Round 5: Onsite — System Design II
**Duration:** 45 minutes | **Interviewer:** Staff SDE (L6)

### Questions Asked
1. **Design Google Search Autocomplete**

### 💡 Interview-Ready Answer

#### Requirements
- Return top 10 suggestions as user types
- Latency: < 50ms P99
- Personalized suggestions
- Handle 100K QPS for autocomplete queries
- Fresh suggestions (trending topics within minutes)

#### Architecture
```
User types "goo"
        │
        ▼
┌───────────────┐    ┌──────────────┐    ┌─────────────────┐
│  CDN / Edge   │───▶│  API Server  │───▶│  Trie Service   │
│  (Cache hot   │    │  (Rate limit │    │  (Prefix lookup  │
│   prefixes)   │    │   + routing) │    │   + ranking)     │
└───────────────┘    └──────────────┘    └────────┬────────┘
                                                   │
                              ┌────────────────────┼────────────────┐
                              ▼                    ▼                ▼
                     ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
                     │  Trie Shard  │   │  Trie Shard  │  │  Trie Shard  │
                     │  (a-f)       │   │  (g-m)       │  │  (n-z)       │
                     └──────────────┘   └──────────────┘  └──────────────┘
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
              ┌────────────┐   ┌────────────────┐
              │ Frequency  │   │ Personalization │
              │ Aggregator │   │ Service         │
              │ (MapReduce)│   │ (User history)  │
              └────────────┘   └────────────────┘
```

**Key Design Decisions:**
- **Trie with Top-K at each node:** Pre-compute top 10 results at each prefix node → O(1) lookup
- **Sharding:** Shard by first character range. "goo" → shard "g-m"
- **Freshness:** Streaming pipeline (Kafka → Flink) aggregates search frequencies in 5-min windows. Trie updated incrementally.
- **Personalization:** Blend global frequency (70%) + user history (30%). User history stored in Redis per-user.

---

## Round 6: Behavioral — Googleyness
**Duration:** 45 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **"Tell me about navigating ambiguity in a project"**
2. **"How do you influence without authority?"**
3. **"Describe your approach to technical leadership"**

### 💡 Interview-Ready Answer (STAR)

**Q: "Navigating ambiguity"**

**Situation:** Our company acquired a startup, and I was asked to "integrate their ML pipeline with our platform." No specs, no timeline, no clear owner. Two teams (15 engineers total) had different tech stacks (Python/Airflow vs Java/Spark) and competing priorities.

**Task:** Define the integration strategy, get alignment from both teams, and deliver a working pipeline.

**Action:**
1. Spent first week doing discovery: interviewed 8 engineers from both teams, mapped data flows, identified 3 integration approaches
2. Wrote a 5-page design doc with pros/cons/effort for each approach, shared widely for feedback
3. Facilitated a design review meeting — let both teams voice concerns
4. Chose a "bridge" approach: keep both systems, add a translation layer (Avro schema registry) between them
5. Created a phased roadmap: Phase 1 (bridge, 4 weeks), Phase 2 (unified, 12 weeks)

**Result:** Phase 1 delivered in 3 weeks. Both teams stayed productive during transition. ML pipeline latency improved 40% post-integration. Approach was adopted as the standard integration pattern for 2 subsequent acquisitions.

---

## 🎯 Key Takeaways
- L5 interviews expect **system-level impact** — talk about cross-team influence, not just personal coding
- **Two system design rounds** at L5 level — prepare 8-10 systems thoroughly
- Behavioral round weighs heavier at L5 — prepare stories showing **leadership without authority**
- Coding problems are still Medium-Hard level — don't neglect DSA
- **Trie-based problems** are a Google favorite for autocomplete/search questions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 2 | Hard | Sliding Window, HashMap |
| Round 3 | Hard | Distributed Systems, Message Queues, Raft |
| Round 4 | Hard | BFS/DFS, Topological Sort, Backtracking |
| Round 5 | Medium-Hard | Trie, Ranking, CDN, Personalization |
| Round 6 | Medium | Leadership, Ambiguity, Influence |
