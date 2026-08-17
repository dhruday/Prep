# Meta — Software Engineer E5 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta (Facebook) |
| **Role** | Software Engineer E5 |
| **Level** | E5 (Senior) |
| **YOE** | 6 years |
| **Date** | 2025 |
| **Result** | ✅ Selected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

## 🔄 Interview Process Overview
4 rounds over 1 day (virtual onsite). Phone screen → Coding → System Design → Behavioral. Total ~3 hours. Recruiter prep call 1 week before. Results in 5 business days.

---

## Round 1: Phone Screen (45 min)
**Duration:** 45 minutes | **Format:** CoderPad shared editor

### Question 1A: Vertical Order Traversal of Binary Tree (LC 987)
**Problem:** Given a binary tree, return the vertical order traversal. Nodes at same row+col sorted by value.

### 💡 Interview-Ready Answer

**Approach:** BFS with column tracking. Use a TreeMap<col, PriorityQueue<(row, val)>> to auto-sort columns and handle ties.

```java
class Solution {
    public List<List<Integer>> verticalTraversal(TreeNode root) {
        // TreeMap: col -> min-heap of (row, val) pairs
        TreeMap<Integer, PriorityQueue<int[]>> map = new TreeMap<>();
        Queue<Object[]> queue = new LinkedList<>(); // {node, row, col}
        queue.offer(new Object[]{root, 0, 0});

        while (!queue.isEmpty()) {
            Object[] curr = queue.poll();
            TreeNode node = (TreeNode) curr[0];
            int row = (int) curr[1], col = (int) curr[2];

            map.computeIfAbsent(col, k -> new PriorityQueue<>(
                (a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]
            )).offer(new int[]{row, node.val});

            if (node.left != null)  queue.offer(new Object[]{node.left, row + 1, col - 1});
            if (node.right != null) queue.offer(new Object[]{node.right, row + 1, col + 1});
        }

        List<List<Integer>> result = new ArrayList<>();
        for (var pq : map.values()) {
            List<Integer> col = new ArrayList<>();
            while (!pq.isEmpty()) col.add(pq.poll()[1]);
            result.add(col);
        }
        return result;
    }
}
```

| Complexity | Value |
|-----------|-------|
| **Time** | O(N log N) — sorting within columns |
| **Space** | O(N) — storing all nodes |

**Edge Cases:** Single node, skewed tree (all left/right), nodes with same position and same value.

---

### Question 1B: Random Pick with Weight (LC 528)
**Problem:** Given array `w` where `w[i]` is the weight of index `i`, implement `pickIndex()` returning index with probability proportional to weight.

### 💡 Interview-Ready Answer

**Approach:** Prefix sum + binary search. Build cumulative weight array. Generate random number in [1, totalWeight], binary search for the target index.

```java
class Solution {
    private int[] prefixSum;
    private Random rand = new Random();

    public Solution(int[] w) {
        prefixSum = new int[w.length];
        prefixSum[0] = w[0];
        for (int i = 1; i < w.length; i++) {
            prefixSum[i] = prefixSum[i - 1] + w[i];
        }
    }

    public int pickIndex() {
        int target = rand.nextInt(prefixSum[prefixSum.length - 1]) + 1;
        int lo = 0, hi = prefixSum.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (prefixSum[mid] < target) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
```

| Complexity | Value |
|-----------|-------|
| **Constructor** | O(N) |
| **pickIndex()** | O(log N) |
| **Space** | O(N) |

**Edge Cases:** Single element, all equal weights, very large weights (overflow — use long).

---

## Round 2: Coding (45 min)

### Question: Merge K Sorted Lists (LC 23)
**Problem:** Merge k sorted linked lists into one sorted list.

### 💡 Interview-Ready Answer

**Approach:** Min-heap of size k. Always extract minimum head, push its next.

```java
class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> a.val - b.val);
        for (ListNode head : lists) {
            if (head != null) pq.offer(head);
        }

        ListNode dummy = new ListNode(0), curr = dummy;
        while (!pq.isEmpty()) {
            ListNode min = pq.poll();
            curr.next = min;
            curr = curr.next;
            if (min.next != null) pq.offer(min.next);
        }
        return dummy.next;
    }
}
```

| Complexity | Value |
|-----------|-------|
| **Time** | O(N log K) — N total nodes, heap of size k |
| **Space** | O(K) — heap size |

### Follow-up: What if lists are too large to fit in memory?

**External merge sort approach:**
1. **Chunk reading:** Read first B elements from each list into memory (B = memory / k)
2. **K-way merge:** Use min-heap on the k buffer heads
3. **Streaming write:** Write merged output to disk sequentially
4. **Buffer refill:** When a buffer empties, read next B elements from that list's file
5. **Multi-pass if needed:** If k > memory/blockSize, do hierarchical merge (merge groups of k' lists, then merge results)

```
Disk: [List1_File] [List2_File] ... [ListK_File]
         |              |                |
Memory:  [Buf1]       [Buf2]     ...   [BufK]
            \            |             /
             [   Min-Heap (size k)   ]
                       |
                 [Output Buffer]
                       |
                 [Output_File]
```

---

## Round 3: System Design (45 min)

### Design Facebook News Feed

#### Requirements
**Functional:** Generate personalized feed, support posts (text/image/video), likes/comments, real-time updates.
**Non-Functional:** <200ms latency, 2B users, 500M DAU, 99.99% availability.

#### Back-of-Envelope
- 500M DAU × 10 feed views/day = 5B feed reads/day ≈ **58K QPS** (peak: ~120K QPS)
- 500M DAU × 2 posts/day = 1B writes/day ≈ **12K QPS**
- Read-heavy: 5:1 ratio → optimize for reads

#### High-Level Architecture
```
┌──────────┐     ┌──────────────┐     ┌──────────────────┐
│  Client   │────▶│ API Gateway  │────▶│  Load Balancer   │
│ (Mobile/  │     │ (Rate Limit, │     │  (L7 / Nginx)    │
│  Web)     │     │  Auth)       │     └────────┬─────────┘
└──────────┘     └──────────────┘              │
                                    ┌──────────┴──────────┐
                                    │                     │
                              ┌─────▼─────┐        ┌─────▼──────┐
                              │  Post     │        │  Feed      │
                              │  Service  │        │  Service   │
                              └─────┬─────┘        └─────┬──────┘
                                    │                     │
                              ┌─────▼─────┐        ┌─────▼──────┐
                              │  Fanout   │        │  Feed      │
                              │  Service  │        │  Cache     │
                              └─────┬─────┘        │  (Redis)   │
                                    │              └─────┬──────┘
                         ┌──────────┴──────────┐         │
                         │                     │   ┌─────▼──────┐
                   ┌─────▼─────┐        ┌──────▼─┐│  Ranking   │
                   │  Social   │        │ Message││  Service   │
                   │  Graph    │        │ Queue  │└────────────┘
                   │  Service  │        │(Kafka) │
                   └───────────┘        └────────┘
                         │
                   ┌─────▼──────────┐
                   │  Posts DB       │
                   │  (MySQL sharded │
                   │   by user_id)   │
                   └─────────────────┘
```

#### Fanout Strategy — Hybrid Approach
| User Type | Strategy | Reason |
|-----------|----------|--------|
| Normal users (<5K followers) | **Fanout-on-write** | Pre-compute feed at write time. Fast reads. |
| Celebrities (>5K followers) | **Fanout-on-read** | Avoid writing to millions of feeds. Merge at read time. |

#### DB Schema
```sql
-- Posts table (sharded by user_id)
CREATE TABLE posts (
    post_id     BIGINT PRIMARY KEY,   -- Snowflake ID
    user_id     BIGINT NOT NULL,
    content     TEXT,
    media_urls  JSON,
    created_at  TIMESTAMP,
    INDEX idx_user_time (user_id, created_at DESC)
);

-- Pre-computed feed (Redis sorted set per user)
-- Key: feed:{user_id}
-- Members: post_id, Score: ranking_score (time-decayed + engagement)

-- Social Graph (sharded by user_id)
CREATE TABLE follows (
    follower_id  BIGINT,
    followee_id  BIGINT,
    created_at   TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id),
    INDEX idx_followee (followee_id)
);
```

#### API Design
```
POST /v1/posts              — Create post { content, media_ids }
GET  /v1/feed?cursor=X&limit=20  — Get personalized feed (cursor-based pagination)
POST /v1/posts/{id}/like    — Like a post
GET  /v1/posts/{id}/comments?cursor=X — Get comments
```

#### Feed Ranking
Score = `w1 * affinity + w2 * time_decay + w3 * engagement + w4 * content_type_boost`
- **Affinity:** How often user interacts with poster (ML model)
- **Time decay:** Exponential decay, half-life ~6 hours
- **Engagement:** likes + comments + shares (weighted)

#### Cache Strategy
- **Feed cache (Redis):** Top 200 posts per user in sorted set. TTL 24h. Invalidate on new post from followed user.
- **Post cache:** LRU cache for hot posts. Write-through for new posts, write-behind for engagement counters.
- **Social graph cache:** Adjacency lists in Redis for fanout lookups.

---

## Round 4: Behavioral (45 min)

### Q1: "Tell me about your biggest impact project"
**STAR Answer:**
- **Situation:** At previous company, our payment processing system had 2% failure rate affecting $4M/month in revenue. Team of 8 engineers, I was tech lead.
- **Task:** Reduce failure rate to <0.1% within one quarter while maintaining 99.99% uptime.
- **Action:** Led root cause analysis — identified 3 failure modes: timeout cascades (60%), stale retry logic (25%), DB connection exhaustion (15%). Implemented circuit breaker pattern with Resilience4j, redesigned retry with exponential backoff + jitter, connection pooling with HikariCP. Drove weekly design reviews with the team.
- **Result:** Failure rate dropped to 0.05%. Recovered ~$3.8M/month. System handled 3x traffic during Black Friday with zero incidents. Promoted to senior within 2 months.

### Q2: "Conflict resolution — disagreement with another engineer"
**STAR Answer:**
- **Situation:** Senior backend engineer insisted on monolithic approach for a new real-time notifications service. I advocated for event-driven microservice.
- **Task:** Reach alignment without damaging working relationship. Project had a 6-week deadline.
- **Action:** Scheduled 1:1 with coffee. Listened to his concerns (deployment complexity, debugging difficulty). Created a comparison doc with pros/cons using our actual traffic numbers. Proposed compromise: start with a modular monolith with clear bounded contexts, extract to microservice in phase 2. Presented trade-off analysis to team.
- **Result:** Team aligned on my compromise approach. Shipped on time. Phase 2 extraction took only 2 weeks because boundaries were clean. Engineer became a strong advocate for the approach on future projects.

### Q3: "Move fast culture"
- Discussed shipping a feature to 10% of users within 2 days of ideation, gathering data, then iterating. Emphasized testing in production with feature flags, not perfecting in staging.

---

## 🎯 Key Takeaways
- **Coding rounds:** Meta expects clean code FAST. Practice writing bug-free code in 15-20 min per problem.
- **System design:** Hybrid fanout was the key differentiator. Knowing exact trade-offs mattered more than breadth.
- **Behavioral:** Meta values "move fast" and quantifiable impact. Every story needs numbers.
- **Communication:** Talked through approach before coding. Asked clarifying questions. Discussed trade-offs proactively.

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 (Phone) | Medium-Hard | BFS, TreeMap, Prefix Sum, Binary Search |
| Round 2 (Coding) | Hard | Heap, Linked Lists, External Merge Sort |
| Round 3 (System Design) | Hard | Feed Ranking, Fanout, Caching, Sharding |
| Round 4 (Behavioral) | Medium | Impact, Conflict, Culture Fit |
# Meta — Software Engineer E5 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta (Facebook) |
| **Role** | Software Engineer E5 |
| **Level** | E5 (Senior) |
| **YOE** | 6 years |
| **Date** | 2025 |
| **Result** | ✅ Selected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

## 🔄 Interview Process Overview
4 rounds total over 1 day virtual onsite. Recruiter reached out on LinkedIn → phone screen → virtual onsite (2 coding + 1 system design + 1 behavioral). Timeline: ~3 weeks from recruiter screen to offer.

---

## Round 1: Phone Screen (45 min)
**Duration:** 45 minutes | **Format:** CoderPad shared editor

### Question 1(a): Vertical Order Traversal of Binary Tree
**Problem:** Given a binary tree, return the vertical order traversal. Nodes at the same row and column should be sorted by value.

### 💡 Interview-Ready Answer

**Approach:** BFS with column tracking. Use a map of column → list of (row, val). Sort each column by row then value.

```java
// Java — Vertical Order Traversal (LC 987)
class Solution {
    public List<List<Integer>> verticalTraversal(TreeNode root) {
        // TreeMap keeps columns sorted: col -> list of (row, val)
        TreeMap<Integer, List<int[]>> colMap = new TreeMap<>();
        Queue<int[]> queue = new LinkedList<>(); // [node.val, row, col] — store node ref separately
        Map<int[], TreeNode> nodeRef = new HashMap<>();

        // Simpler: use Queue of Object[]
        Queue<Object[]> q = new LinkedList<>();
        q.offer(new Object[]{root, 0, 0});

        while (!q.isEmpty()) {
            Object[] curr = q.poll();
            TreeNode node = (TreeNode) curr[0];
            int row = (int) curr[1], col = (int) curr[2];

            colMap.computeIfAbsent(col, k -> new ArrayList<>()).add(new int[]{row, node.val});

            if (node.left != null)  q.offer(new Object[]{node.left, row + 1, col - 1});
            if (node.right != null) q.offer(new Object[]{node.right, row + 1, col + 1});
        }

        List<List<Integer>> result = new ArrayList<>();
        for (var entry : colMap.entrySet()) {
            List<int[]> nodes = entry.getValue();
            // Sort by row first, then by value if same row
            nodes.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);
            List<Integer> colList = new ArrayList<>();
            for (int[] n : nodes) colList.add(n[1]);
            result.add(colList);
        }
        return result;
    }
}
```

**Complexity:** Time O(N log N) for sorting, Space O(N)
**Edge Cases:** Single node → [[val]], skewed tree → each node in different column, duplicate values at same position

---

### Question 1(b): Random Pick with Weight
**Problem:** Given array `w` where `w[i]` is the weight of index `i`, implement `pickIndex()` that randomly picks an index proportional to its weight.

### 💡 Interview-Ready Answer

**Approach:** Build prefix sum array. Use binary search to find the index where a random number falls.

```java
// Java — Random Pick with Weight (LC 528)
class Solution {
    private int[] prefixSum;
    private Random rand;

    public Solution(int[] w) {
        rand = new Random();
        prefixSum = new int[w.length];
        prefixSum[0] = w[0];
        for (int i = 1; i < w.length; i++) {
            prefixSum[i] = prefixSum[i - 1] + w[i];
        }
    }

    public int pickIndex() {
        int target = rand.nextInt(prefixSum[prefixSum.length - 1]) + 1; // [1, totalWeight]
        // Binary search: find first index where prefixSum[i] >= target
        int lo = 0, hi = prefixSum.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (prefixSum[mid] < target) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
```

**Complexity:** Constructor O(N), pickIndex O(log N), Space O(N)
**Edge Cases:** Single element → always return 0, all weights equal → uniform distribution, very large weights → use long for prefix sum

---

## Round 2: Coding (45 min)
**Duration:** 45 minutes | **Format:** CoderPad

### Question: Merge K Sorted Lists
**Problem:** Merge k sorted linked lists into one sorted linked list.

### 💡 Interview-Ready Answer

**Approach:** Min-heap (priority queue) of size k. Always extract the smallest node and advance its pointer.

```java
// Java — Merge K Sorted Lists (LC 23)
class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> minHeap = new PriorityQueue<>(
            (a, b) -> a.val - b.val
        );

        // Add head of each non-null list
        for (ListNode head : lists) {
            if (head != null) minHeap.offer(head);
        }

        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;

        while (!minHeap.isEmpty()) {
            ListNode smallest = minHeap.poll();
            curr.next = smallest;
            curr = curr.next;
            if (smallest.next != null) {
                minHeap.offer(smallest.next);
            }
        }
        return dummy.next;
    }
}
```

**Complexity:** Time O(N log K) where N = total nodes, K = number of lists. Space O(K) for heap.
**Edge Cases:** Empty lists array, all lists empty, single list, lists of varying length

### Follow-up: What if lists are too large to fit in memory?

**Answer:** External merge sort approach:
1. **Chunked reading:** Read one node at a time from each list (stream from disk/network). The heap only holds K nodes — one per list.
2. **External storage:** Write merged output to disk sequentially. Use buffered I/O (e.g., 4KB write buffer).
3. **Multi-pass merge:** If K is too large for heap in memory, do tournament-style: merge K lists in groups of M (where M fits in memory), producing K/M intermediate lists. Repeat until 1 list remains.

```
Pass 1: [L1,L2,...,LM] → T1, [LM+1,...,L2M] → T2, ...
Pass 2: [T1,T2,...,TM] → U1, ...
Final:  Single sorted list
```

---

## Round 3: System Design (45 min)
**Duration:** 45 minutes | **Topic:** Design Facebook News Feed

### 💡 Interview-Ready Answer

#### Requirements
**Functional:** Users see a feed of posts from friends/pages they follow. Posts ranked by relevance. Support text, images, video. Like/comment/share. Real-time updates.
**Non-Functional:** 2B MAU, ~500M DAU, ~10K QPS for feed reads, <500ms P99 latency, high availability (99.99%).

#### Scale Estimates
- 500M DAU × 10 feed loads/day = 5B feed requests/day ≈ **58K QPS** (peak 2x = 116K QPS)
- Avg user has 500 friends/follows → feed generation scans 500 sources
- Storage: 1B posts/day × 1KB avg = 1TB/day new posts

#### Architecture

```
                            ┌─────────────┐
                            │   CDN       │ (images, video, static)
                            └──────┬──────┘
                                   │
┌──────────┐    ┌──────────────┐   │   ┌──────────────────┐
│  Mobile   │───│  API Gateway │───┼───│  Load Balancer   │
│  Web App  │   │  (Rate Limit)│   │   └────────┬─────────┘
└──────────┘    └──────────────┘   │            │
                                   │   ┌────────┴─────────┐
                          ┌────────┴───┤  Feed Service     │
                          │            │  (Read Path)      │
                          │            └────────┬──────────┘
                          │                     │
                 ┌────────┴──────┐    ┌────────┴──────────┐
                 │ Post Service  │    │  Feed Cache        │
                 │ (Write Path)  │    │  (Redis Cluster)   │
                 └───────┬───────┘    └────────┬──────────┘
                         │                     │
                ┌────────┴───────┐    ┌────────┴──────────┐
                │  Fanout Service│    │  Ranking Service   │
                │  (Async)       │    │  (ML Model)        │
                └───────┬────────┘    └───────────────────┘
                        │
              ┌─────────┴──────────┐
              │  Message Queue     │
              │  (Kafka)           │
              └─────────┬──────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
   ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴──────┐
   │ Posts DB   │ │ Social    │ │ Feed Store │
   │ (MySQL    │ │ Graph DB  │ │ (Redis +   │
   │  sharded) │ │           │ │  Cassandra)│
   └───────────┘ └───────────┘ └────────────┘
```

#### Fanout Strategy: Hybrid Approach
- **Fanout-on-write** for normal users (<5K followers): When user posts, push post ID to all followers' feed caches. Low read latency.
- **Fanout-on-read** for celebrities (>5K followers): Don't fanout. At read time, merge celebrity posts with pre-computed feed. Avoids writing to millions of caches.

#### DB Schema

```sql
-- Posts table (MySQL, sharded by user_id)
CREATE TABLE posts (
    post_id     BIGINT PRIMARY KEY,  -- Snowflake ID
    user_id     BIGINT NOT NULL,
    content     TEXT,
    media_urls  JSON,
    post_type   ENUM('text','image','video','link'),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_time (user_id, created_at DESC)
);

-- Feed cache per user (Redis sorted set)
-- Key: feed:{user_id}
-- Score: timestamp (or ranking score)
-- Value: post_id

-- Social graph (adjacency list, sharded by user_id)
CREATE TABLE follows (
    follower_id  BIGINT,
    followee_id  BIGINT,
    created_at   TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id),
    INDEX idx_followee (followee_id)
);
```

#### API Design

```
GET  /v1/feed?user_id={id}&cursor={cursor}&limit=20
     → { posts: [{post_id, author, content, media, reactions, timestamp}], next_cursor }

POST /v1/posts
     Body: { content, media_ids[], audience }
     → { post_id, created_at }

POST /v1/posts/{post_id}/reactions
     Body: { type: "like"|"love"|"haha" }
```

#### Cache Strategy
- **L1 Cache (Feed Service local):** Hot user feeds, 5-min TTL
- **L2 Cache (Redis Cluster):** Pre-computed feeds for all active users, top 500 posts per user
- **Cache invalidation:** On new post, fanout service writes to Redis sorted sets. TTL-based eviction for inactive users.

#### Trade-offs Discussed
| Decision | Option A | Option B | Chosen |
|----------|----------|----------|--------|
| Fanout | On-write (low read latency) | On-read (low write cost) | **Hybrid** |
| Feed DB | Redis only (fast) | Cassandra (durable) | **Both** — Redis for hot, Cassandra for cold |
| Ranking | Chronological | ML-based | **ML-based** with chronological fallback |

---

## Round 4: Behavioral (45 min)
**Duration:** 45 minutes | **Focus:** Meta's "Move Fast" culture

### Q1: Tell me about a time you moved fast to deliver impact.

**STAR Answer:**
- **Situation:** At my previous company, a critical payment service was experiencing 3% transaction failures during peak Black Friday traffic (affecting ~$2M revenue/hour).
- **Task:** I owned the payments microservice and needed to diagnose and fix within hours, not days.
- **Action:** I skipped the normal RFC process, identified the root cause (connection pool exhaustion to our payment gateway) within 30 minutes using distributed tracing. Implemented connection pooling with HikariCP, added circuit breaker with Resilience4j, and deployed with a feature flag — all within 4 hours. Communicated risk trade-offs to my manager in real-time.
- **Result:** Transaction failures dropped from 3% to 0.02%. Saved an estimated $8M in revenue over the Black Friday weekend. Later wrote the RFC retroactively and it became the team's standard pattern.

### Q2: Describe a conflict with a teammate and how you resolved it.

**STAR Answer:**
- **Situation:** Senior engineer on my team insisted on rewriting our monolith to microservices all at once. I believed in incremental strangler fig pattern.
- **Task:** Reach alignment without damaging the working relationship, as we collaborated daily.
- **Action:** I organized a tech design review with data: listed the 3 highest-traffic services, showed that rewriting all 12 services simultaneously would take 9 months vs 3 months for the top 3. Built a small POC of the strangler fig approach in 2 days. Presented both approaches fairly to the team with pros/cons.
- **Result:** Team voted for incremental approach. We migrated the top 3 services in 3 months with zero downtime. The other engineer eventually became the biggest advocate for the approach and co-authored our migration playbook.

### Q3: What was your biggest impact project?

**STAR Answer:**
- **Situation:** Our e-commerce platform's search service had P99 latency of 2.3 seconds, causing a 15% drop-off rate on search results pages.
- **Task:** As tech lead of the search team (4 engineers), reduce P99 to under 500ms.
- **Action:** Introduced Elasticsearch with a custom ranking plugin, implemented query caching with Redis, added async indexing pipeline using Kafka, and designed a two-phase search (fast recall + precise re-ranking). Led the team through 3 sprint cycles.
- **Result:** P99 dropped from 2.3s to 180ms. Search-to-purchase conversion improved by 22%, adding ~$12M annual revenue. The architecture became a reference implementation for 3 other teams.

---

## 🎯 Key Takeaways
- Meta E5 expects **clean, bug-free code** in 20-25 minutes per problem — practice under time pressure
- System design: Always discuss **hybrid fanout** for news feed — it's a Meta classic
- Behavioral: Every answer must demonstrate **"Move Fast"** — show bias for action with calculated risk
- The interviewers probed deeply on trade-offs in system design — don't just present one solution
- Phone screen is a hard filter: both problems must be solved optimally

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 (Phone) | Medium-Hard | BFS, TreeMap, Binary Search, Prefix Sum |
| Round 2 (Coding) | Medium | Heap, Linked Lists, External Sort |
| Round 3 (System Design) | Hard | Feed Ranking, Fanout, Caching, Scale |
| Round 4 (Behavioral) | Medium | Leadership, Conflict, Impact |
