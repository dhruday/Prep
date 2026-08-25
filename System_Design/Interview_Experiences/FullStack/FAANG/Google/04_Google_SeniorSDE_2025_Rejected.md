# Google — Senior SDE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Senior Software Developer |
| **Level** | L4 |
| **YOE** | 6 years |
| **Date** | June 2025 |
| **Result** | ❌ Rejected |
| **Location** | Remote (US) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + Tech Screen + 3 Onsite)
- **Timeline:** 3 weeks
- **Format:** Virtual via Google Meet
- **Rejection Reason:** Weak system design (could not articulate sharding strategy under pressure)

---

## Round 1: Technical Screen — Coding
**Duration:** 45 minutes | **Interviewer:** L4 SDE

### Questions Asked
1. **Two Sum Variant on Sorted Rotated Array**
   - Given a sorted array that has been rotated, find if there exist two elements that sum to a target

### 💡 Interview-Ready Answer

**Key Insight:** Find the pivot (max element), then use two pointers — one starting at smallest, one at largest.

```java
public boolean twoSumRotated(int[] arr, int target) {
    int n = arr.length;
    
    // Find pivot (index of max element)
    int pivot = 0;
    for (int i = 1; i < n; i++) {
        if (arr[i] < arr[i - 1]) {
            pivot = i - 1;
            break;
        }
    }
    
    // Two pointers: left = smallest (pivot+1), right = largest (pivot)
    int left = (pivot + 1) % n;
    int right = pivot;
    
    while (left != right) {
        int sum = arr[left] + arr[right];
        if (sum == target) return true;
        else if (sum < target) left = (left + 1) % n;   // move to next larger
        else right = (right - 1 + n) % n;               // move to next smaller
    }
    return false;
}
```

**Complexity:** Time O(n), Space O(1)

**Edge Cases:**
- Array not rotated (pivot at end) → standard two sum
- All elements same → only works if 2*element == target
- Single element → false
- Duplicates → works correctly with this approach

---

## Round 2: System Design
**Duration:** 45 minutes | **Interviewer:** Staff SDE (L6)

### Questions Asked
1. **Design a Rate Limiter**

### 💡 Interview-Ready Answer

#### Algorithms Comparison
| Algorithm | Pros | Cons | Use Case |
|-----------|------|------|----------|
| **Token Bucket** | Allows bursts, smooth | Memory per user | API gateway |
| **Sliding Window Log** | Precise | High memory (stores timestamps) | Strict compliance |
| **Sliding Window Counter** | Low memory, fairly accurate | Approximate at window edges | General purpose |
| **Fixed Window** | Simple | Spike at window boundary | Simple use cases |

#### Chosen: Sliding Window Counter (best balance)

```
Architecture:
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────┐
│  Client   │────▶│  API Gateway │────▶│ Rate Limiter │────▶│ Backend │
│           │◀────│  (Nginx/     │◀────│  Middleware   │     │ Service │
│           │ 429 │   Envoy)     │     └──────┬───────┘     └─────────┘
└──────────┘     └──────────────┘            │
                                              ▼
                                     ┌──────────────┐
                                     │    Redis      │
                                     │  (Counters +  │
                                     │   TTL keys)   │
                                     └──────────────┘
```

#### Redis Implementation (Sliding Window Counter)
```python
import time
import redis

class SlidingWindowRateLimiter:
    def __init__(self, redis_client, max_requests, window_seconds):
        self.redis = redis_client
        self.max_requests = max_requests
        self.window = window_seconds
    
    def is_allowed(self, client_id: str) -> bool:
        now = time.time()
        current_window = int(now // self.window)
        previous_window = current_window - 1
        elapsed = now % self.window  # time elapsed in current window
        
        current_key = f"rate:{client_id}:{current_window}"
        previous_key = f"rate:{client_id}:{previous_window}"
        
        # Use pipeline for atomic read
        pipe = self.redis.pipeline()
        pipe.get(current_key)
        pipe.get(previous_key)
        current_count, prev_count = pipe.execute()
        
        current_count = int(current_count or 0)
        prev_count = int(prev_count or 0)
        
        # Weighted count: prev_window * overlap + current_window
        weight = 1 - (elapsed / self.window)
        estimated_count = prev_count * weight + current_count
        
        if estimated_count >= self.max_requests:
            return False
        
        # Increment current window counter
        pipe = self.redis.pipeline()
        pipe.incr(current_key)
        pipe.expire(current_key, self.window * 2)  # TTL = 2 windows
        pipe.execute()
        return True

# Usage: limiter = SlidingWindowRateLimiter(redis, max_requests=100, window_seconds=60)
```

#### Distributed Rate Limiting
- **Problem:** Multiple API gateway instances → each has local view
- **Solution 1:** Centralized Redis (single source of truth) — adds ~1ms latency
- **Solution 2:** Local rate limit + periodic sync — allows temporary burst, eventually consistent
- **Solution 3:** Token bucket with Redis Lua script (atomic operation)

```lua
-- Redis Lua script for atomic token bucket
local tokens = tonumber(redis.call("get", KEYS[1]) or ARGV[1])
local last_time = tonumber(redis.call("get", KEYS[2]) or ARGV[3])
local now = tonumber(ARGV[3])
local rate = tonumber(ARGV[2])
local max_tokens = tonumber(ARGV[1])

-- Refill tokens based on elapsed time
local elapsed = now - last_time
tokens = math.min(max_tokens, tokens + elapsed * rate)

if tokens >= 1 then
    tokens = tokens - 1
    redis.call("set", KEYS[1], tokens)
    redis.call("set", KEYS[2], now)
    return 1  -- allowed
else
    redis.call("set", KEYS[1], tokens)
    redis.call("set", KEYS[2], now)
    return 0  -- rejected
end
```

#### HTTP Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1678901234
Retry-After: 30  (on 429)
```

#### Scale Considerations
- Redis single instance: ~100K ops/sec → sufficient for most
- Redis Cluster for >100K QPS (shard by client_id)
- Consider local caching (10% of window) to reduce Redis round trips

---

## Round 3: Coding II
**Duration:** 45 minutes | **Interviewer:** L5 SDE

### Questions Asked
1. **Serialize and Deserialize Binary Tree** (LeetCode 297)
2. **Follow-up: Extend to N-ary Tree**

### 💡 Interview-Ready Answer

```java
public class Codec {
    // Serialize: preorder traversal with "null" markers
    public String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        serializeHelper(root, sb);
        return sb.toString();
    }
    
    private void serializeHelper(TreeNode node, StringBuilder sb) {
        if (node == null) {
            sb.append("null,");
            return;
        }
        sb.append(node.val).append(",");
        serializeHelper(node.left, sb);
        serializeHelper(node.right, sb);
    }
    
    // Deserialize: consume tokens in preorder
    public TreeNode deserialize(String data) {
        Queue<String> tokens = new LinkedList<>(Arrays.asList(data.split(",")));
        return deserializeHelper(tokens);
    }
    
    private TreeNode deserializeHelper(Queue<String> tokens) {
        String val = tokens.poll();
        if (val.equals("null")) return null;
        
        TreeNode node = new TreeNode(Integer.parseInt(val));
        node.left = deserializeHelper(tokens);
        node.right = deserializeHelper(tokens);
        return node;
    }
}
```

**N-ary Extension:**
```java
public class NaryCodec {
    public String serialize(NaryNode root) {
        StringBuilder sb = new StringBuilder();
        serializeN(root, sb);
        return sb.toString();
    }
    
    private void serializeN(NaryNode node, StringBuilder sb) {
        if (node == null) return;
        sb.append(node.val).append(",");
        sb.append(node.children.size()).append(","); // encode child count
        for (NaryNode child : node.children) {
            serializeN(child, sb);
        }
    }
    
    public NaryNode deserialize(String data) {
        if (data.isEmpty()) return null;
        Queue<String> tokens = new LinkedList<>(Arrays.asList(data.split(",")));
        return deserializeN(tokens);
    }
    
    private NaryNode deserializeN(Queue<String> tokens) {
        if (tokens.isEmpty()) return null;
        int val = Integer.parseInt(tokens.poll());
        int childCount = Integer.parseInt(tokens.poll());
        NaryNode node = new NaryNode(val);
        node.children = new ArrayList<>();
        for (int i = 0; i < childCount; i++) {
            node.children.add(deserializeN(tokens));
        }
        return node;
    }
}
```

**Complexity:** Both O(n) time/space. The N-ary encoding adds 1 integer per node for child count.

---

## Round 4: System Design II
**Duration:** 45 minutes | **Interviewer:** L6 Staff SDE

### Questions Asked
1. **Design YouTube's Video Recommendation Feed**

### 💡 Interview-Ready Answer

#### Architecture
```
┌─────────┐    ┌─────────────┐    ┌──────────────────────────────┐
│  User   │───▶│  Feed API   │───▶│  Recommendation Service      │
│  App    │    │  (GraphQL)  │    │  ┌────────────────────────┐  │
└─────────┘    └─────────────┘    │  │ Candidate Generation   │  │
                                   │  │ (1000 videos)          │  │
                                   │  └───────────┬────────────┘  │
                                   │              ▼               │
                                   │  ┌────────────────────────┐  │
                                   │  │ Ranking Model (ML)     │  │
                                   │  │ (Score & rank → top 50)│  │
                                   │  └───────────┬────────────┘  │
                                   │              ▼               │
                                   │  ┌────────────────────────┐  │
                                   │  │ Re-ranking / Filtering │  │
                                   │  │ (Diversity, freshness) │  │
                                   │  └────────────────────────┘  │
                                   └──────────────────────────────┘
                                              │
                    ┌─────────────────────────┼──────────────────┐
                    ▼                         ▼                  ▼
           ┌──────────────┐        ┌──────────────┐   ┌──────────────┐
           │ User Profile │        │ Video Metadata│   │ Watch History│
           │ (Bigtable)   │        │ (Spanner)    │   │ (Bigtable)   │
           └──────────────┘        └──────────────┘   └──────────────┘
```

**Two-stage approach:**
1. **Candidate generation:** Collaborative filtering + content-based. Pull ~1000 candidates from user's interest clusters.
2. **Ranking:** Deep neural network scores each candidate on P(watch | user, context). Features: watch history, time of day, device, video age, creator affinity.
3. **Re-ranking:** Inject diversity (not all same topic), remove watched, apply business rules (boost originals).

**Scale:** 2B users, 100M feed requests/day. Pre-compute top candidates offline (MapReduce), refine in real-time.

> **Why I was rejected:** I couldn't explain the sharding strategy for the ranking model under pressure. The interviewer pushed on "how do you shard user embeddings across 10K machines?" and I stumbled on consistent hashing vs. parameter servers.

---

## 🎯 Key Takeaways
- **System design deep dives can make or break you** — the interviewer will push until you break
- Don't just draw boxes — be ready to **explain sharding, replication, and failure modes** for each component
- Rate limiter is a Google staple — know Token Bucket, Sliding Window, and distributed variants
- Serialize/Deserialize is a classic — practice both binary tree and N-ary variants
- **Rejection after strong coding rounds means system design was the deciding factor**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 | Medium | Two Pointers, Rotated Array |
| Round 2 | Medium-Hard | Rate Limiting, Redis, Distributed Systems |
| Round 3 | Medium | Tree Serialization, Recursion |
| Round 4 | Hard | ML Systems, Recommendation, Sharding |
