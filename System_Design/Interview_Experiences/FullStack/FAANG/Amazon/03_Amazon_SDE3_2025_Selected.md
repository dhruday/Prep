# Amazon — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Senior Software Development Engineer |
| **Level** | L6 (SDE-3) |
| **YOE** | 7 years |
| **Date** | May 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/amazon-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + 2 System Design + Bar Raiser)
- **Timeline:** 3 weeks
- **Format:** Onsite (Bangalore office, full day)
- **Note:** L6 expects system-level ownership, mentoring signals, and cross-org impact

---

## Round 1: Coding + LP
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Course Schedule II** (LeetCode 210) — Return ordering of courses to finish all (topological sort)
2. **LP: "Tell me about a time you demonstrated customer obsession"**

### 💡 Interview-Ready Answer — Course Schedule II

```java
public int[] findOrder(int numCourses, int[][] prerequisites) {
    // Build adjacency list and in-degree array
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[numCourses];
    
    for (int i = 0; i < numCourses; i++) graph.add(new ArrayList<>());
    
    for (int[] pre : prerequisites) {
        graph.get(pre[1]).add(pre[0]); // pre[1] → pre[0]
        inDegree[pre[0]]++;
    }
    
    // Kahn's Algorithm: BFS with in-degree
    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numCourses; i++) {
        if (inDegree[i] == 0) queue.offer(i);
    }
    
    int[] order = new int[numCourses];
    int idx = 0;
    
    while (!queue.isEmpty()) {
        int course = queue.poll();
        order[idx++] = course;
        
        for (int next : graph.get(course)) {
            inDegree[next]--;
            if (inDegree[next] == 0) queue.offer(next);
        }
    }
    
    return idx == numCourses ? order : new int[0]; // empty if cycle exists
}
```
**Time:** O(V + E), **Space:** O(V + E)

**Edge Cases:**
- Cycle detected → return empty array
- No prerequisites → return [0, 1, 2, ...]
- Single course → return [0]

### 💡 LP Answer — Customer Obsession

**Situation:** Our e-commerce platform's search was returning irrelevant results for regional language queries (Hindi, Tamil). Our customer support was getting 200+ complaints/week from Tier-2/3 city users. Product team had deprioritized it as "edge case."

**Task:** Improve search relevance for 30M+ non-English speaking users who were the fastest growing segment.

**Action:**
1. **Data analysis:** Pulled search logs — 22% of searches from T2/T3 cities were in regional languages, with 85% zero-result rate
2. **Built a transliteration layer** — integrated Google Transliterate API to convert Romanized Hindi ("kurta") and Devanagari inputs to standardized product terms
3. **Championed the initiative** — presented data to VP showing $4M/quarter revenue leakage from abandoned searches
4. **Led a 3-engineer team** over 6 weeks — built synonym mapping, fuzzy matching, and phonetic search (Soundex for Hindi)
5. **A/B tested** with 5% traffic — conversion rate up 35% for regional queries

**Result:** Search zero-result rate dropped from 85% to 12% for regional queries. Conversion improved 35%. Feature rolled out to 100% traffic, estimated $15M/year incremental revenue. Won company-wide innovation award.

---

## Round 2: System Design — HLD
**Duration:** 60 minutes | **Interviewer:** Principal Engineer

### Questions Asked
1. **Design Amazon Product Search**
   - Inverted index, ranking, spell correction, autocomplete
   - Handle 50K QPS, 500M products

### 💡 Interview-Ready Answer

#### Requirements
**Functional:** Full-text search across product catalog, faceted filtering (price, brand, rating), spell correction, autocomplete, personalized ranking
**Non-Functional:** < 200ms P99, 50K QPS, 500M products, real-time indexing for new products

#### Architecture
```
                          ┌────────────────┐
                          │  Search Query  │
                          │  "runing shoos"│
                          └───────┬────────┘
                                  ▼
┌──────────────────────────────────────────────────────────┐
│                     API Gateway                           │
│  Rate Limiting · Auth · Query Logging                    │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   Query Processing                        │
│  1. Spell Correction: "runing shoos" → "running shoes"  │
│  2. Tokenization + Stemming                              │
│  3. Query Expansion (synonyms: sneakers, trainers)       │
│  4. Intent Classification (product search vs brand)      │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Elasticsearch Cluster (Search Engine)         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │  Shard 0   │  │  Shard 1   │  │  Shard N   │         │
│  │  Products  │  │  Products  │  │  Products  │         │
│  │  A-F       │  │  G-M       │  │  N-Z       │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│  Inverted Index · BM25 Scoring · Aggregations            │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   Ranking Service                         │
│  Stage 1: BM25 (text relevance) → 1000 candidates       │
│  Stage 2: ML Ranker (click-through, purchase history,    │
│           price, ratings, freshness) → top 50            │
│  Stage 3: Business Rules (sponsored, boost new) → final  │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   Response Assembly                       │
│  Product details · Images · Pricing · Reviews snippet    │
│  Facets: Price ranges, Brands, Ratings, Categories       │
└──────────────────────────────────────────────────────────┘
```

#### Spell Correction
```
Approach: Edit distance (Levenshtein) + frequency-based ranking
1. SymSpell algorithm: Pre-compute deletes within edit distance 2
   - "shoes" → delete 1: {"hoes","soes","shes","shos","shoe"}
   - Store in HashMap: delete → [original words]
2. At query time: generate deletes of input, lookup in map
3. Rank corrections by: (a) edit distance, (b) term frequency in search logs

Time: O(1) lookup (pre-computed), Space: O(N * avg_deletes)
```

#### Indexing Pipeline
```
Product Created/Updated
        │
        ▼
  ┌──────────┐     ┌──────────┐     ┌──────────────┐
  │  Kafka   │────▶│  Indexer  │────▶│ Elasticsearch │
  │  (CDC)   │     │  Service  │     │  (Bulk API)   │
  └──────────┘     └──────────┘     └──────────────┘
  
  Indexer enriches: extract features, generate embeddings,
  tokenize, stem, add synonyms, compute quality score
```

#### Scale Numbers
```
Products: 500M × 2KB avg doc = 1TB index
Shards: 50 shards × 2 replicas = 150 Elasticsearch nodes
QPS: 50K queries / 150 nodes = ~333 queries/node
Memory: Index in memory for fast access → ~20GB/node
Latency budget: Query Processing (20ms) + ES Search (100ms) + Ranking (50ms) + Assembly (30ms) = 200ms
```

---

## Round 3: Coding + LP
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Median of Two Sorted Arrays** (LeetCode 4)
2. **LP: "Tell me about a time you showed bias for action"**

### 💡 Interview-Ready Answer — Median of Two Sorted Arrays

```java
public double findMedianSortedArrays(int[] nums1, int[] nums2) {
    // Ensure nums1 is smaller for binary search
    if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);
    
    int m = nums1.length, n = nums2.length;
    int lo = 0, hi = m;
    
    while (lo <= hi) {
        int i = (lo + hi) / 2;      // partition in nums1
        int j = (m + n + 1) / 2 - i; // partition in nums2
        
        int maxLeftA = (i == 0) ? Integer.MIN_VALUE : nums1[i - 1];
        int minRightA = (i == m) ? Integer.MAX_VALUE : nums1[i];
        int maxLeftB = (j == 0) ? Integer.MIN_VALUE : nums2[j - 1];
        int minRightB = (j == n) ? Integer.MAX_VALUE : nums2[j];
        
        if (maxLeftA <= minRightB && maxLeftB <= minRightA) {
            // Found correct partition
            if ((m + n) % 2 == 0) {
                return (Math.max(maxLeftA, maxLeftB) + Math.min(minRightA, minRightB)) / 2.0;
            } else {
                return Math.max(maxLeftA, maxLeftB);
            }
        } else if (maxLeftA > minRightB) {
            hi = i - 1; // move partition left
        } else {
            lo = i + 1; // move partition right
        }
    }
    throw new IllegalArgumentException("Input not sorted");
}
```
**Time:** O(log(min(m,n))), **Space:** O(1)

**Key Insight:** Binary search on the smaller array's partition point. The partition divides both arrays such that all left elements ≤ all right elements.

---

## Round 4: System Design — LLD
**Duration:** 60 minutes | **Interviewer:** Senior Principal

### Questions Asked
1. **Design Amazon's Cart & Checkout System**
   - Inventory locking, payment processing, consistency

### 💡 Interview-Ready Answer

#### Cart Design
```
Cart → CartItems → Product (with real-time price + availability check)

State Machine for Checkout:
  CART → CHECKOUT_INITIATED → PAYMENT_PENDING → PAYMENT_CONFIRMED 
       → ORDER_PLACED → (fulfillment takes over)
       
  Failure paths:
  PAYMENT_PENDING → PAYMENT_FAILED → CART (release inventory holds)
  CHECKOUT_INITIATED → EXPIRED (30 min TTL) → CART (release holds)
```

#### Inventory Locking Strategy
```
Problem: User adds item to cart. Between cart and checkout, another user buys the last item.

Solution: Two-phase inventory:
1. "Soft hold" when item added to cart → decrement available_count, increment held_count
   - TTL: 30 minutes (auto-release if no checkout)
2. "Hard lock" at payment initiation → move from held to locked
   - Cannot be released except by payment timeout (5 min)
3. "Committed" after payment success → decrement locked, increment sold

Table: inventory
+------------+--------+---------+--------+------+
| product_id | total  | available| held  | sold |
+------------+--------+---------+--------+------+
| SKU-001    | 1000   | 950     | 30     | 20   |
+------------+--------+---------+--------+------+
Invariant: total = available + held + sold (always)
```

#### Payment Processing
```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Checkout │───▶│ Payment      │───▶│ Payment      │───▶│ Order        │
│ Service  │    │ Orchestrator │    │ Gateway      │    │ Service      │
│          │    │ (Saga)       │    │ (Stripe/     │    │ (Create      │
│          │    │              │    │  Razorpay)   │    │  order)      │
└──────────┘    └──────────────┘    └──────────────┘    └──────────────┘

Saga Pattern for distributed transaction:
1. Reserve inventory (soft → hard lock)
2. Process payment (charge card)
3. Create order record
4. Confirm inventory (hard lock → sold)
5. Send confirmation notification

Compensating actions on failure:
- Payment fails → release inventory lock
- Order creation fails → refund payment + release lock
- Each step is idempotent (idempotency key = checkout_session_id)
```

---

## Round 5: Bar Raiser
**Duration:** 60 minutes | **Interviewer:** Director level (different org)

### Questions Asked
1. **LP Deep Dive (all previous designs):** "Walk me through the hardest trade-off you made in your career"
2. **LP: "Have backbone; disagree and commit"**
3. **Follow-up coding:** Quick problem — "Given a stream of stock prices, design a class that returns the max profit from one buy-sell" (LeetCode 121 variant as a class)

### 💡 LP Answer — Disagree and Commit

**Situation:** My director wanted to migrate our entire monolith to microservices in one quarter (3 months). I believed this was risky for our 15-engineer team with no microservices experience.

**Task:** Either convince leadership to change approach or commit to the plan fully.

**Action:**
1. **Prepared a risk analysis** with data: 3 case studies of failed big-bang migrations at similar-sized companies
2. **Proposed an alternative:** Strangler Fig pattern — extract one bounded context (user authentication) first as a pilot microservice, learn, then migrate incrementally
3. **Presented to director with CTO present** — director initially pushed back, but CTO saw the risk data
4. **Compromise reached:** Start with auth service (4 weeks), if successful, accelerate remaining extraction
5. **Key moment of "commit":** When some team members still resisted even the pilot, I fully championed the agreed plan, helped write the migration runbook, and led the auth service extraction myself

**Result:** Auth service migrated successfully in 3 weeks. Team gained confidence and skills. Full microservices migration completed in 2 quarters (6 months) instead of the unrealistic 1-quarter plan. Zero downtime during migration. Approach adopted as the company's standard migration playbook.

---

## 🎯 Key Takeaways
- Amazon L6 expects **organizational impact** — stories should span teams, not just personal achievements
- **Median of Two Sorted Arrays** is one of the hardest binary search problems — practice it until you can explain the invariant in your sleep
- **System design at SDE-3 level** requires depth: inventory locking, saga patterns, compensating transactions
- Amazon product search is a **real interview question** — know Elasticsearch, BM25, and SymSpell
- **Bar Raiser** can ask about ANY round — they synthesize all feedback

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 | Medium | Topological Sort, BFS, LP |
| Round 2 | Hard | Search Systems, Elasticsearch, NLP |
| Round 3 | Hard | Binary Search (advanced), LP |
| Round 4 | Hard | Distributed Transactions, Saga Pattern |
| Round 5 | Medium-Hard | LP Deep Dive, Quick Coding |
