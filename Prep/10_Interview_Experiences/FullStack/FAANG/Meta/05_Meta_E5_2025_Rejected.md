# Meta — E5 Interview Experience (2025) — Rejected

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta (Facebook) |
| **Role** | Software Engineer |
| **Level** | E5 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Seattle, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Coding + System Design + Behavioral)
- **Timeline:** 2 weeks
- **Rejection Reason:** System Design — didn't go deep enough on consistency vs availability trade-offs

---

## Round 1: Coding 1
**Duration:** 35 minutes

### Questions Asked
1. **Minimum Remove to Make Valid Parentheses** (LeetCode 1249)
2. **Follow-up: Return all possible results** (multiple valid answers)

### 💡 Interview-Ready Answer

```java
// Return ONE valid result — O(n) time, O(n) space
public String minRemoveToMakeValid(String s) {
    StringBuilder sb = new StringBuilder(s);
    Deque<Integer> stack = new ArrayDeque<>(); // Stack of indices of unmatched '('
    
    // Pass 1: Mark unmatched ')' with '*'
    for (int i = 0; i < sb.length(); i++) {
        char c = sb.charAt(i);
        if (c == '(') {
            stack.push(i);
        } else if (c == ')') {
            if (stack.isEmpty()) {
                sb.setCharAt(i, '*'); // Unmatched ')'
            } else {
                stack.pop(); // Matched
            }
        }
    }
    
    // Pass 2: Mark remaining unmatched '(' with '*'
    while (!stack.isEmpty()) {
        sb.setCharAt(stack.pop(), '*');
    }
    
    // Pass 3: Build result without '*'
    StringBuilder result = new StringBuilder();
    for (int i = 0; i < sb.length(); i++) {
        if (sb.charAt(i) != '*') result.append(sb.charAt(i));
    }
    
    return result.toString();
}

// Follow-up: Return ALL possible valid results
public List<String> minRemoveToMakeValidAll(String s) {
    // First find minimum removals needed
    int openToRemove = 0, closeToRemove = 0;
    for (char c : s.toCharArray()) {
        if (c == '(') openToRemove++;
        else if (c == ')') {
            if (openToRemove > 0) openToRemove--;
            else closeToRemove++;
        }
    }
    
    Set<String> result = new HashSet<>();
    backtrack(s, 0, 0, openToRemove, closeToRemove, new StringBuilder(), result);
    return new ArrayList<>(result);
}

private void backtrack(String s, int idx, int openCount, 
                       int openRem, int closeRem, StringBuilder sb, Set<String> result) {
    if (idx == s.length()) {
        if (openRem == 0 && closeRem == 0 && openCount == 0) {
            result.add(sb.toString());
        }
        return;
    }
    
    char c = s.charAt(idx);
    int len = sb.length();
    
    if (c == '(' && openRem > 0) {
        // Option 1: Skip this '('
        backtrack(s, idx + 1, openCount, openRem - 1, closeRem, sb, result);
    }
    if (c == ')' && closeRem > 0) {
        // Option 1: Skip this ')'
        backtrack(s, idx + 1, openCount, openRem, closeRem - 1, sb, result);
    }
    
    // Option 2: Keep this character
    sb.append(c);
    if (c == '(') {
        backtrack(s, idx + 1, openCount + 1, openRem, closeRem, sb, result);
    } else if (c == ')') {
        if (openCount > 0) { // Only keep ')' if there's a matching '('
            backtrack(s, idx + 1, openCount - 1, openRem, closeRem, sb, result);
        }
    } else {
        backtrack(s, idx + 1, openCount, openRem, closeRem, sb, result);
    }
    sb.setLength(len); // Backtrack
}
```

---

## Round 2: Coding 2
**Duration:** 35 minutes

### Questions Asked
1. **LCA of Binary Tree with Parent Pointers** (LeetCode 1650)
2. **Sparse Vector Dot Product** (LeetCode 1570)

### 💡 LCA with Parent Pointers

```java
// Two pointers approach — like finding intersection of two linked lists
public Node lowestCommonAncestor(Node p, Node q) {
    Node a = p, b = q;
    
    while (a != b) {
        a = (a.parent != null) ? a.parent : q; // When reaches root, jump to other node
        b = (b.parent != null) ? b.parent : p;
    }
    
    return a;
}
// Why this works: 
// Path lengths: p→root = d1, q→root = d2
// Pointer a travels: d1 + d2, Pointer b travels: d2 + d1
// They converge at LCA (same total distance, same meeting point)
// Time: O(h), Space: O(1)
```

### 💡 Sparse Vector Dot Product

```java
class SparseVector {
    // Store only non-zero elements as (index, value) pairs
    List<int[]> pairs; // sorted by index
    
    SparseVector(int[] nums) {
        pairs = new ArrayList<>();
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] != 0) pairs.add(new int[]{i, nums[i]});
        }
    }
    
    // Two-pointer approach — O(L1 + L2) where L = non-zero count
    public int dotProduct(SparseVector vec) {
        int result = 0;
        int i = 0, j = 0;
        
        while (i < this.pairs.size() && j < vec.pairs.size()) {
            int idx1 = this.pairs.get(i)[0];
            int idx2 = vec.pairs.get(j)[0];
            
            if (idx1 == idx2) {
                result += this.pairs.get(i)[1] * vec.pairs.get(j)[1];
                i++; j++;
            } else if (idx1 < idx2) {
                i++;
            } else {
                j++;
            }
        }
        
        return result;
    }
    
    // Follow-up: If one vector is much smaller, use binary search
    // O(min(L1,L2) * log(max(L1,L2)))
    public int dotProductOptimized(SparseVector vec) {
        List<int[]> smaller = this.pairs.size() < vec.pairs.size() ? this.pairs : vec.pairs;
        List<int[]> larger = this.pairs.size() < vec.pairs.size() ? vec.pairs : this.pairs;
        
        int result = 0;
        for (int[] pair : smaller) {
            int idx = binarySearch(larger, pair[0]);
            if (idx >= 0) {
                result += pair[1] * larger.get(idx)[1];
            }
        }
        return result;
    }
    
    private int binarySearch(List<int[]> pairs, int targetIdx) {
        int lo = 0, hi = pairs.size() - 1;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            if (pairs.get(mid)[0] == targetIdx) return mid;
            if (pairs.get(mid)[0] < targetIdx) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
}
```

---

## Round 3: System Design
**Duration:** 40 minutes

### Questions Asked
1. **Design Instagram Stories**
   - Upload/view stories, 24-hour expiry, story rings, viewers list, ephemeral

### 💡 Interview-Ready Answer

```
Instagram Stories Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Upload Pipeline:                                             │
│  1. Client captures photo/video → compress                   │
│  2. Upload to S3/GCS (chunked for video)                     │
│  3. Process: resize, generate thumbnail, add filters         │
│  4. For video: transcode to HLS (short segments, 3-5s)      │
│  5. Store metadata: { userId, mediaUrl, createdAt, expiresAt }│
│                                                                │
│  Storage (Key Decision):                                      │
│  Hot path (active stories < 24h):                            │
│  - Redis sorted set: key = viewer_userId                     │
│    members = story creators, score = latest story timestamp  │
│  - Why: story ring order is "most recently updated" first    │
│  - Each story: Redis hash with media URL, viewers list       │
│                                                                │
│  Cold path (expired > 24h):                                  │
│  - Cassandra/DynamoDB: partition by userId, sort by timestamp│
│  - TTL = 24 hours (auto-delete)                              │
│  - Archive to cold storage for "highlights" feature          │
│                                                                │
│  Viewing Flow:                                                │
│  1. App opens → GET /api/stories/feed                        │
│  2. Server: get followed users from social graph             │
│  3. For each: check Redis ZRANGEBYSCORE with timestamp > now-24h│
│  4. Return ordered list of story rings (seen/unseen status)  │
│  5. User taps ring → GET /api/stories/{userId}               │
│  6. Prefetch next 2-3 users' stories (anticipate swipe)      │
│                                                                │
│  Viewers List:                                                │
│  - When user views story → POST /api/stories/{id}/view       │
│  - Store in Redis set: story_id → set of viewer_userIds      │
│  - Sorted by view time (sorted set, score = timestamp)       │
│  - Only story creator can see viewers list                    │
│                                                                │
│  24-Hour Expiry:                                              │
│  - TTL on Redis keys (auto-cleanup)                          │
│  - TTL on Cassandra rows                                     │
│  - Cron job: sweep expired stories from CDN cache            │
│  - Client-side: check expiresAt, skip if expired             │
│                                                                │
│  Scale:                                                       │
│  - 500M daily stories                                        │
│  - 1B daily story views                                      │
│  - Fanout: precompute story rings for active users           │
│  - CDN: cache media at edge (24h TTL matches story TTL)      │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Meta E5 System Design = must discuss **consistency vs availability trade-offs** proactively
- **Minimum Remove Valid Parentheses** → two-pass stack approach is optimal
- **LCA with parent pointers** → linked list intersection technique — O(1) space
- **Sparse Vector** → two-pointer + binary search follow-up for asymmetric sizes
- **Stories = ephemeral content** → Redis TTL + CDN TTL coordinated
- **Story rings ordering** = sorted set by latest story timestamp
- **Prefetching** adjacent stories = key UX optimization for tap-and-swipe flow
- I got **rejected because of System Design** — didn't discuss what happens when Redis is down (fallback to DB? stale data OK?)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium-Hard | Stack, Backtracking, Parentheses |
| Coding 2 | Medium | Two Pointers, Binary Search, Trees |
| System Design | Hard | Ephemeral Content, TTL, Fan-out |
| Behavioral | Medium-Hard | Leadership at E5 |
