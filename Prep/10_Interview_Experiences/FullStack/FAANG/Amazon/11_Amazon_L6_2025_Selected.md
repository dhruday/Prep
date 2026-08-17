# Amazon — L6 FullStack Interview Experience (2025) — #11

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Senior SDE (L6) |
| **Level** | L6 |
| **YOE** | 9 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Seattle, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Amazon Ads |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (System Design + 2 Coding + 2 LP rounds)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Design and Implement a Concurrent Rate Limiter** (Sliding Window Log + Token Bucket hybrid)
2. **Follow-up: Distributed version across multiple servers**

### 💡 Sliding Window Rate Limiter (Thread-Safe)

```java
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Sliding window log rate limiter: exact counting using timestamps.
 * Thread-safe using CAS operations + concurrent deque.
 * 
 * Tradeoff vs fixed window: exact count, but O(n) memory for timestamps.
 * Tradeoff vs sliding window counter: exact (no approximation), but more memory.
 */
class SlidingWindowRateLimiter {
    private final int maxRequests;
    private final long windowMs;
    private final ConcurrentLinkedDeque<Long> timestamps;
    private final AtomicLong count;
    
    SlidingWindowRateLimiter(int maxRequests, long windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.timestamps = new ConcurrentLinkedDeque<>();
        this.count = new AtomicLong(0);
    }
    
    boolean allowRequest() {
        long now = System.currentTimeMillis();
        long windowStart = now - windowMs;
        
        // Clean expired entries from head
        while (!timestamps.isEmpty()) {
            Long oldest = timestamps.peekFirst();
            if (oldest != null && oldest <= windowStart) {
                if (timestamps.pollFirst() != null) {
                    count.decrementAndGet();
                }
            } else {
                break;
            }
        }
        
        // Check if under limit
        if (count.get() < maxRequests) {
            timestamps.addLast(now);
            count.incrementAndGet();
            return true;
        }
        
        return false;
    }
}

/**
 * Distributed rate limiter using Redis with Lua script
 * for atomic sliding window operations.
 */
class DistributedRateLimiter {
    // Redis Lua script — atomic execution (no race conditions)
    static final String LUA_SCRIPT = """
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        
        -- Remove expired timestamps
        redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
        
        -- Count current window
        local count = redis.call('ZCARD', key)
        
        if count < limit then
            -- Add current timestamp (score = timestamp, member = unique id)
            redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
            redis.call('EXPIRE', key, math.ceil(window / 1000))
            return 1
        end
        
        return 0
    """;
    
    /*
    Usage:
    Object result = jedis.eval(LUA_SCRIPT, 
        List.of("rate:user:123"),       // KEYS
        List.of(                        // ARGV
            String.valueOf(System.currentTimeMillis()),
            String.valueOf(60000),      // 60s window
            String.valueOf(100)         // 100 req/min
        )
    );
    boolean allowed = ((Long) result) == 1;
    */
}
```

**Complexity:**
| Approach | Time | Space | Accuracy |
|----------|------|-------|----------|
| Sliding Window Log | O(n) cleanup | O(n) timestamps | Exact |
| Sliding Window Counter | O(1) | O(1) | Approximate (~1% error) |
| Token Bucket | O(1) | O(1) | Allows bursts up to bucket size |
| Redis ZSET | O(log n) per op | O(n) on Redis | Exact, distributed |

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Amazon's Ad Serving Platform (Real-Time Bidding)**
   - Ad selection in <100ms (P99)
   - Targeting: user demographics, browsing history, search queries
   - Budget management: daily + lifetime budgets, pacing
   - Real-time bidding: multiple advertisers compete per impression
   - Click fraud detection
   - Scale: 1M ad requests/sec, 10B impressions/day

### 💡 Ad Serving Architecture

```
Request Flow (< 100ms total):
User opens product page →
  1. Ad Gateway receives ad request (5ms)
     - User ID, page context, device info
  
  2. User Profile Service (10ms)
     - Redis/Aerospike: demographics, interests, segment memberships
     - DAX (DynamoDB Accelerator) for fast lookups
  
  3. Campaign Selection (15ms)
     - Filter: active campaigns matching targeting criteria
     - Pre-computed targeting index: {segment → campaign_ids}
     - Cached in local memory (refresh every 30s)
  
  4. Bid Calculation (20ms)
     - For each candidate campaign:
       a. Predicted CTR (ML model, TensorFlow Serving)
       b. Bid = advertiser_max_bid × pCTR (expected CPM)
       c. Budget check (Redis counter: remaining daily budget)
       d. Pacing: if campaign should slow down, reduce bid
     - Second-price auction: winner pays 2nd highest bid + $0.01
  
  5. Ad Rendering (10ms)
     - Select ad creative (A/B testing creative variants)
     - Generate impression tracking pixel URL
     - Return HTML/JSON to client

Architecture:
┌────────────┐
│   User     │
│ (Browser)  │
└──────┬─────┘
       │ ad request (with cookies/user_id)
┌──────▼──────────┐
│  Ad Gateway      │  L7 load balancer + rate limiting
│  (Edge servers)  │  Geographically distributed
└──────┬──────────┘
       │
┌──────▼──────────────┐
│  Ad Selection Service │
│                       │
│  ┌─────────────────┐  │
│  │ Targeting Engine │  │  Match user segments to campaigns
│  │ (Pre-filtered    │  │  Inverted index: segment → campaigns
│  │  in local cache) │  │
│  └────────┬────────┘  │
│           │            │
│  ┌────────▼────────┐  │
│  │ Bid Calculator   │  │  pCTR model + budget + pacing
│  │ (ML inference)   │  │  Second-price auction
│  └────────┬────────┘  │
│           │            │
│  ┌────────▼────────┐  │
│  │ Creative Selector│  │  A/B test creative variants
│  └─────────────────┘  │
└───────────────────────┘

Budget Management:
┌─────────────────────────────────────────────────┐
│ Challenge: 10B impressions/day, each deducting   │
│ from advertiser budget — can't hit DB each time  │
│                                                  │
│ Solution: Hierarchical budget counters           │
│                                                  │
│ L1: Local counter (per ad server, in-memory)     │
│     • Pre-allocated budget slice: $10 chunk       │
│     • Decrement locally per impression           │
│     • When exhausted → request new chunk from L2 │
│                                                  │
│ L2: Redis counter (per campaign)                 │
│     • DECRBY $10 atomically when L1 requests     │
│     • If remaining < $10 → allocate remainder    │
│     • If 0 → campaign paused                     │
│                                                  │
│ L3: DynamoDB (source of truth)                   │
│     • Synced every 5 min from Redis              │
│     • Handles daily budget reset at midnight     │
│     • Lifetime budget tracking                   │
│                                                  │
│ Result: 99.9% of impressions served from L1      │
│ Budget accuracy: within $10 of true spend        │
└─────────────────────────────────────────────────┘

Click Fraud Detection:
┌─────────────────────────────────────────────────┐
│ Real-time (inline, < 50ms):                      │
│ • IP frequency: >50 clicks/min from same IP → flag│
│ • User agent anomaly: headless browser signatures│
│ • Click timing: < 100ms between page load and    │
│   click → suspicious                             │
│                                                  │
│ Near-real-time (Flink streaming, < 5 min):       │
│ • Click-through rate anomaly: campaign CTR       │
│   suddenly 10x normal → investigate              │
│ • Geographic anomaly: clicks from unexpected     │
│   regions for geo-targeted campaigns             │
│ • Conversion correlation: high clicks, zero      │
│   conversions → likely bot traffic               │
│                                                  │
│ Batch (daily, ML models):                        │
│ • Random forest classifier trained on known      │
│   fraud patterns                                 │
│ • Refund affected advertisers                    │
│ • Update real-time rules based on new patterns   │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Amazon L6 = **Rate limiter + Ad serving system design + strong LP stories**
- **Sliding window log**: exact counting with timestamp deque — good for small windows, bad for large
- **Redis ZSET + Lua**: atomic distributed rate limiting — `ZREMRANGEBYSCORE` + `ZCARD` + `ZADD` in one script
- **Second-price auction**: winner pays 2nd highest bid + ε — incentivizes truthful bidding
- **Budget hierarchical counters**: L1 local → L2 Redis → L3 DynamoDB — 99.9% served from memory
- **pCTR model**: predicted click-through rate — multiply by bid to get expected value per impression
- **Click fraud**: 3-tier detection — inline (rules), streaming (Flink), batch (ML) — refund affected advertisers
- Amazon L6: **LP stories dominate 40% of interview** — Ownership, Bias for Action, Dive Deep heavily tested

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Hard | Sliding Window Rate Limiter |
| Coding 2 | Medium-Hard | Tree/Graph |
| System Design | Very Hard | Ad Serving, RTB, Fraud Detection |
| LP 1 | Medium | Ownership, Dive Deep |
| LP 2 (Bar Raiser) | Hard | Customer Obsession, Earn Trust |
