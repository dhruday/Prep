# Amazon — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 (L5) |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 3 Onsite — each has LP component)
- **Timeline:** 2 weeks
- **Format:** Virtual (Loop)
- **Rejection Reason:** Failed bar raiser round — LP stories weren't crisp enough

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Maximum Area of Island** (LeetCode 695)
2. **Top K Frequent Elements** (LeetCode 347)

### 💡 Interview-Ready Answer — Maximum Area of Island

```java
public int maxAreaOfIsland(int[][] grid) {
    int maxArea = 0;
    for (int i = 0; i < grid.length; i++) {
        for (int j = 0; j < grid[0].length; j++) {
            if (grid[i][j] == 1) {
                maxArea = Math.max(maxArea, dfs(grid, i, j));
            }
        }
    }
    return maxArea;
}

private int dfs(int[][] grid, int i, int j) {
    if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length || grid[i][j] == 0) return 0;
    grid[i][j] = 0; // mark visited
    return 1 + dfs(grid, i+1, j) + dfs(grid, i-1, j) + dfs(grid, i, j+1) + dfs(grid, i, j-1);
}
```

### 💡 Top K Frequent — Bucket Sort (O(n))

```java
public int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int n : nums) freq.merge(n, 1, Integer::sum);
    
    // Bucket sort: index = frequency, value = list of elements with that frequency
    List<Integer>[] buckets = new List[nums.length + 1];
    for (var entry : freq.entrySet()) {
        int f = entry.getValue();
        if (buckets[f] == null) buckets[f] = new ArrayList<>();
        buckets[f].add(entry.getKey());
    }
    
    int[] result = new int[k];
    int idx = 0;
    for (int i = buckets.length - 1; i >= 0 && idx < k; i--) {
        if (buckets[i] != null) {
            for (int num : buckets[i]) {
                if (idx < k) result[idx++] = num;
            }
        }
    }
    return result;
}
```

---

## Round 2: DSA + LP
**Duration:** 60 minutes

### Questions Asked
1. **LP (15 min):** "Tell me about a time you dove deep into a problem" (Dive Deep)
2. **Longest Valid Parentheses** (LeetCode 32)
3. **Design LFU Cache** (LeetCode 460) — discussed approach, didn't fully implement

### 💡 Interview-Ready Answer — Longest Valid Parentheses

```java
// Approach 1: Stack-based (O(n) time, O(n) space)
public int longestValidParentheses(String s) {
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(-1); // sentinel for base of valid sequence
    int maxLen = 0;
    
    for (int i = 0; i < s.length(); i++) {
        if (s.charAt(i) == '(') {
            stack.push(i);
        } else {
            stack.pop();
            if (stack.isEmpty()) {
                stack.push(i); // new sentinel
            } else {
                maxLen = Math.max(maxLen, i - stack.peek());
            }
        }
    }
    return maxLen;
}

// Approach 2: Two-pass (O(n) time, O(1) space)
public int longestValidParenthesesOptimal(String s) {
    int maxLen = 0;
    int open = 0, close = 0;
    
    // Left to right
    for (int i = 0; i < s.length(); i++) {
        if (s.charAt(i) == '(') open++; else close++;
        if (open == close) maxLen = Math.max(maxLen, 2 * close);
        else if (close > open) { open = 0; close = 0; }
    }
    
    open = 0; close = 0;
    // Right to left (handles cases like "(()")
    for (int i = s.length() - 1; i >= 0; i--) {
        if (s.charAt(i) == '(') open++; else close++;
        if (open == close) maxLen = Math.max(maxLen, 2 * open);
        else if (open > close) { open = 0; close = 0; }
    }
    
    return maxLen;
}
```

### 💡 LFU Cache Approach

```java
class LFUCache {
    int capacity;
    int minFreq;
    Map<Integer, int[]> cache;           // key → [value, freq]
    Map<Integer, LinkedHashSet<Integer>> freqToKeys; // freq → keys (insertion order)
    
    LFUCache(int capacity) {
        this.capacity = capacity;
        this.minFreq = 0;
        this.cache = new HashMap<>();
        this.freqToKeys = new HashMap<>();
    }
    
    int get(int key) {
        if (!cache.containsKey(key)) return -1;
        
        int[] entry = cache.get(key);
        int value = entry[0], freq = entry[1];
        
        // Increase frequency
        incrementFreq(key, freq);
        
        return value;
    }
    
    void put(int key, int value) {
        if (capacity == 0) return;
        
        if (cache.containsKey(key)) {
            int freq = cache.get(key)[1];
            cache.get(key)[0] = value;
            incrementFreq(key, freq);
            return;
        }
        
        if (cache.size() == capacity) {
            // Evict LFU key (if tie, evict LRU among them)
            LinkedHashSet<Integer> minFreqKeys = freqToKeys.get(minFreq);
            int evictKey = minFreqKeys.iterator().next(); // first = LRU
            minFreqKeys.remove(evictKey);
            if (minFreqKeys.isEmpty()) freqToKeys.remove(minFreq);
            cache.remove(evictKey);
        }
        
        cache.put(key, new int[]{value, 1});
        freqToKeys.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
        minFreq = 1;
    }
    
    private void incrementFreq(int key, int freq) {
        // Remove from old frequency list
        LinkedHashSet<Integer> oldFreqKeys = freqToKeys.get(freq);
        oldFreqKeys.remove(key);
        if (oldFreqKeys.isEmpty()) {
            freqToKeys.remove(freq);
            if (minFreq == freq) minFreq++;
        }
        
        // Add to new frequency list
        int newFreq = freq + 1;
        cache.get(key)[1] = newFreq;
        freqToKeys.computeIfAbsent(newFreq, k -> new LinkedHashSet<>()).add(key);
    }
}
// All operations: O(1) time
```

---

## Round 3: System Design + LP
**Duration:** 60 minutes

### Questions Asked
1. **LP (15 min):** "Tell me about a time you had to deliver results under pressure" (Deliver Results)
2. **Design Amazon's Product Review System**
   - Write reviews, ratings, helpful votes, review ranking, spam detection

### 💡 Interview-Ready Answer

```
Product Review System:
┌──────────────────────────────────────────────────────────────┐
│  Write Path                                                   │
│  ┌──────────┐                                                │
│  │ User     │──▶ API Gateway ──▶ Review Service              │
│  │ submits  │                    ├── Validate (purchased?)    │
│  │ review   │                    ├── Spam detection (ML)      │
│  └──────────┘                    ├── Store in DynamoDB        │
│                                   └── Async: update aggregates│
│                                                                │
│  Spam Detection Pipeline:                                     │
│  1. Rule-based: too many reviews in short time                │
│  2. NLP: sentiment analysis, detect fake reviews              │
│  3. Cross-reference: same user, same product from diff accts  │
│  4. Verified Purchase badge: only if order exists             │
└──────────────────────────────────────────────────────────────┘

Read Path:
┌──────────────────────────────────────────────────────────────┐
│  GET /products/{id}/reviews?sort=helpful&page=1              │
│                                                                │
│  Review Ranking Algorithm:                                    │
│  score = (helpful_votes + 1) / (total_votes + 2) *           │
│          LOG(time_since_epoch) *                              │
│          (is_verified_purchase ? 1.5 : 1.0) *                │
│          (has_images ? 1.2 : 1.0)                            │
│                                                                │
│  Wilson Score for "helpful votes":                            │
│  Lower bound of 95% confidence interval                      │
│  Handles: 5/5 helpful > 100/200 helpful                      │
│  Formula: (p̂ + z²/2n - z√(p̂(1-p̂)/n + z²/4n²)) / (1+z²/n)│
│  where p̂ = helpful/total, z = 1.96 (95% CI), n = total     │
└──────────────────────────────────────────────────────────────┘

Data Model:
┌──────────────────────────────────────────────────────────────┐
│  DynamoDB Tables:                                             │
│                                                                │
│  reviews:                                                     │
│  PK: product_id                                               │
│  SK: review_id (ULID — sortable by time)                     │
│  Attributes: user_id, rating, title, body, images[],          │
│    verified_purchase, helpful_votes, total_votes, status,    │
│    created_at                                                 │
│  GSI1: user_id (to list user's reviews)                      │
│  GSI2: product_id + rating (to filter by star rating)        │
│                                                                │
│  review_aggregates:                                           │
│  PK: product_id                                               │
│  Attributes: avg_rating, total_reviews, rating_distribution  │
│    { "5": 1200, "4": 800, "3": 200, "2": 50, "1": 30 }    │
│                                                                │
│  Updated asynchronously via DynamoDB Streams + Lambda         │
│  (eventual consistency OK for aggregates)                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 4: Bar Raiser (LP Heavy)
**Duration:** 60 minutes

### Questions Asked (**LP-heavy — 70% of the round**)
1. **"Tell me about your most complex project"** (Think Big + Invent & Simplify)
2. **"Time you disagreed and committed"** (Have Backbone; Disagree and Commit)
3. **"Time you raised the bar for your team"** (Insist on Highest Standards)
4. **Coding:** Quick optimization problem (didn't go deep)

> **Why I was rejected:** Bar Raiser felt my LP stories lacked **specificity**. Said: "I could tell you the what, but not the how. Quantify your impact. What was YOUR specific contribution vs the team's?"
>
> **Lesson:** For Amazon, prepare 8-10 LP stories with:
> - Specific numbers (latency reduced by 40ms, saved $200K/year)
> - Clear "I" not "we" — what YOU did personally
> - Conflict resolution with stakeholders
> - Follow-up: what would you do differently?

---

## 🎯 Key Takeaways
- Amazon SDE-2 = **50% LP + 50% Technical** — LP stories can make or break
- **LFU Cache** with O(1) operations (using LinkedHashSet + frequency map) is a common hard question
- **Longest Valid Parentheses** — know both stack and two-pass approaches
- **Top K Frequent** with bucket sort = O(n) — beats heap approach
- **Wilson Score** for review ranking — better than naive percentage
- **DynamoDB design** with GSI is expected for Amazon system design
- **Bar Raiser** can reject even with strong technical rounds — prepare LP stories meticulously

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DFS, Bucket Sort |
| Round 2 | Hard | Stack, LFU Cache |
| Round 3 | Hard | Review System, Ranking, DynamoDB |
| Bar Raiser | Very Hard | LP Stories (specificity required) |
