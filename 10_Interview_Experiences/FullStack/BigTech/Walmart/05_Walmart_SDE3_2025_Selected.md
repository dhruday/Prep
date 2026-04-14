# Walmart — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart Global Tech |
| **Role** | Staff Software Engineer |
| **Level** | SDE-3 |
| **YOE** | 8 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/walmart-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Grocery |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Machine Coding + DS/Algo + System Design + HM)

---

## Round 2: Machine Coding — Build a Rate Limiter Service with Multiple Strategies
**Duration:** 90 minutes

### Challenge: Build a configurable rate limiter supporting: Fixed Window, Sliding Window Log, Token Bucket, and Leaky Bucket. Support per-user and per-API-path limits.

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate Limiter Service:
 * 
 * Strategies:
 * 1. Fixed Window: count requests per window (e.g., 100/min)
 * 2. Sliding Window Log: track timestamps, count within window
 * 3. Token Bucket: tokens refill at fixed rate, each request costs 1 token
 * 4. Leaky Bucket: requests queue, processed at fixed rate
 * 
 * Config per rule: strategy + limit + window + key extractor (user/path/IP)
 */

enum RateLimitStrategy { FIXED_WINDOW, SLIDING_WINDOW_LOG, TOKEN_BUCKET, LEAKY_BUCKET }

class RateLimitConfig {
    String ruleId;
    RateLimitStrategy strategy;
    int maxRequests;       // Max requests per window (fixed/sliding) or bucket capacity (token/leaky)
    long windowMs;         // Window size in ms
    double refillRate;     // Tokens per second (for token bucket)
    
    RateLimitConfig(String ruleId, RateLimitStrategy strategy, int maxRequests, long windowMs) {
        this.ruleId = ruleId;
        this.strategy = strategy;
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.refillRate = (double) maxRequests / (windowMs / 1000.0);
    }
}

class RateLimitResult {
    boolean allowed;
    int remaining;
    long retryAfterMs;
    String ruleId;
    
    RateLimitResult(boolean allowed, int remaining, long retryAfterMs, String ruleId) {
        this.allowed = allowed; this.remaining = remaining;
        this.retryAfterMs = retryAfterMs; this.ruleId = ruleId;
    }
}

interface RateLimiter {
    RateLimitResult tryAcquire(String key);
}

// ---- Strategy Implementations ----

class FixedWindowLimiter implements RateLimiter {
    private final ConcurrentHashMap<String, long[]> counters = new ConcurrentHashMap<>();
    // counters value: [windowStart, count]
    private final int maxRequests;
    private final long windowMs;
    private final String ruleId;
    
    FixedWindowLimiter(RateLimitConfig config) {
        this.maxRequests = config.maxRequests;
        this.windowMs = config.windowMs;
        this.ruleId = config.ruleId;
    }
    
    public synchronized RateLimitResult tryAcquire(String key) {
        long now = System.currentTimeMillis();
        long windowStart = (now / windowMs) * windowMs;
        
        long[] state = counters.computeIfAbsent(key, k -> new long[]{ windowStart, 0 });
        
        // Reset if new window
        if (state[0] != windowStart) {
            state[0] = windowStart;
            state[1] = 0;
        }
        
        if (state[1] < maxRequests) {
            state[1]++;
            return new RateLimitResult(true, (int)(maxRequests - state[1]), 0, ruleId);
        }
        
        long retryAfter = windowStart + windowMs - now;
        return new RateLimitResult(false, 0, retryAfter, ruleId);
    }
}

class SlidingWindowLogLimiter implements RateLimiter {
    private final ConcurrentHashMap<String, Deque<Long>> logs = new ConcurrentHashMap<>();
    private final int maxRequests;
    private final long windowMs;
    private final String ruleId;
    
    SlidingWindowLogLimiter(RateLimitConfig config) {
        this.maxRequests = config.maxRequests;
        this.windowMs = config.windowMs;
        this.ruleId = config.ruleId;
    }
    
    public synchronized RateLimitResult tryAcquire(String key) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = logs.computeIfAbsent(key, k -> new ArrayDeque<>());
        
        // Remove expired entries
        while (!timestamps.isEmpty() && timestamps.peekFirst() <= now - windowMs) {
            timestamps.pollFirst();
        }
        
        if (timestamps.size() < maxRequests) {
            timestamps.addLast(now);
            return new RateLimitResult(true, maxRequests - timestamps.size(), 0, ruleId);
        }
        
        long oldestInWindow = timestamps.peekFirst();
        long retryAfter = oldestInWindow + windowMs - now;
        return new RateLimitResult(false, 0, retryAfter, ruleId);
    }
}

class TokenBucketLimiter implements RateLimiter {
    private final ConcurrentHashMap<String, double[]> buckets = new ConcurrentHashMap<>();
    // buckets value: [tokens, lastRefillTimestamp]
    private final int capacity;
    private final double refillRate; // tokens per ms
    private final String ruleId;
    
    TokenBucketLimiter(RateLimitConfig config) {
        this.capacity = config.maxRequests;
        this.refillRate = config.refillRate / 1000.0; // per second → per ms
        this.ruleId = config.ruleId;
    }
    
    public synchronized RateLimitResult tryAcquire(String key) {
        long now = System.currentTimeMillis();
        double[] state = buckets.computeIfAbsent(key, k -> new double[]{ capacity, now });
        
        // Refill tokens
        double elapsed = now - state[1];
        state[0] = Math.min(capacity, state[0] + elapsed * refillRate);
        state[1] = now;
        
        if (state[0] >= 1.0) {
            state[0] -= 1.0;
            return new RateLimitResult(true, (int) state[0], 0, ruleId);
        }
        
        long retryAfter = (long)((1.0 - state[0]) / refillRate);
        return new RateLimitResult(false, 0, retryAfter, ruleId);
    }
}

class LeakyBucketLimiter implements RateLimiter {
    private final ConcurrentHashMap<String, long[]> buckets = new ConcurrentHashMap<>();
    // buckets value: [queueSize, lastLeakTimestamp]
    private final int capacity;
    private final double leakRate; // requests per ms
    private final String ruleId;
    
    LeakyBucketLimiter(RateLimitConfig config) {
        this.capacity = config.maxRequests;
        this.leakRate = config.refillRate / 1000.0;
        this.ruleId = config.ruleId;
    }
    
    public synchronized RateLimitResult tryAcquire(String key) {
        long now = System.currentTimeMillis();
        long[] state = buckets.computeIfAbsent(key, k -> new long[]{ 0, now });
        
        // Leak: reduce queue by elapsed * leakRate
        long elapsed = now - state[1];
        long leaked = (long)(elapsed * leakRate);
        state[0] = Math.max(0, state[0] - leaked);
        state[1] = now;
        
        if (state[0] < capacity) {
            state[0]++;
            return new RateLimitResult(true, (int)(capacity - state[0]), 0, ruleId);
        }
        
        return new RateLimitResult(false, 0, (long)(1.0 / leakRate), ruleId);
    }
}

// ---- Rate Limiter Service ----

class RateLimiterService {
    
    private final Map<String, RateLimiter> limiters = new ConcurrentHashMap<>();
    
    // Rules: ruleId → config
    private final Map<String, RateLimitConfig> configs = new ConcurrentHashMap<>();
    
    // Rule assignment: "apiPath" or "userId" → list of ruleIds
    private final Map<String, List<String>> ruleAssignments = new ConcurrentHashMap<>();
    
    public void addRule(RateLimitConfig config) {
        configs.put(config.ruleId, config);
        
        RateLimiter limiter;
        switch (config.strategy) {
            case FIXED_WINDOW: limiter = new FixedWindowLimiter(config); break;
            case SLIDING_WINDOW_LOG: limiter = new SlidingWindowLogLimiter(config); break;
            case TOKEN_BUCKET: limiter = new TokenBucketLimiter(config); break;
            case LEAKY_BUCKET: limiter = new LeakyBucketLimiter(config); break;
            default: throw new IllegalArgumentException("Unknown strategy");
        }
        
        limiters.put(config.ruleId, limiter);
    }
    
    public void assignRule(String target, String ruleId) {
        ruleAssignments.computeIfAbsent(target, k -> new ArrayList<>()).add(ruleId);
    }
    
    /**
     * Check rate limits. Applies ALL assigned rules — ALL must pass.
     * Returns first rejection, or success with minimum remaining.
     */
    public RateLimitResult checkLimit(String target, String key) {
        List<String> ruleIds = ruleAssignments.getOrDefault(target, Collections.emptyList());
        
        int minRemaining = Integer.MAX_VALUE;
        
        for (String ruleId : ruleIds) {
            RateLimiter limiter = limiters.get(ruleId);
            if (limiter == null) continue;
            
            RateLimitResult result = limiter.tryAcquire(key);
            if (!result.allowed) return result; // First rejection wins
            
            minRemaining = Math.min(minRemaining, result.remaining);
        }
        
        return new RateLimitResult(true, 
            minRemaining == Integer.MAX_VALUE ? -1 : minRemaining, 0, null);
    }
}
```

---

## 🎯 Key Takeaways
- Walmart SDE-3 = **Rate limiter with 4 strategies — Fixed Window, Sliding Log, Token Bucket, Leaky Bucket**
- **Fixed Window**: simple counter per time bucket — boundary spike problem (2× burst at window edge)
- **Sliding Window Log**: track all timestamps — most accurate but O(N) memory per key
- **Token Bucket**: allows bursts up to capacity, then throttles to refill rate — best for API gateways
- **Leaky Bucket**: smooths output rate — best for downstream protection (constant rate processing)
- **Multiple rules**: ALL must pass — compose per-user + per-path + global limits
- **retryAfter**: tells client when to retry — important for good UX and reducing retry storms
- Walmart = **high-scale retail** — rate limiting is critical for flash sales, checkout, inventory APIs

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Very Hard | Rate Limiting, Concurrency |
| DS/Algo | Hard | Graph/DP |
| System Design | Very Hard | Grocery @ Scale |
| HM | Medium | Culture |
