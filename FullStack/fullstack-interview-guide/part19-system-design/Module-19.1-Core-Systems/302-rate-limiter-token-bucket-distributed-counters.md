# Rate Limiter — Token Bucket, Distributed Counters
> Part 19 — System Design Case Studies · 🔥 High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why rate limit**: protect backend from traffic spikes, scrapers, and runaway clients; prevent one bad actor from degrading service for everyone; enforce business limits (freemium plan: 100 API calls/day)
- **Token bucket**: most common algorithm; bucket holds max N tokens; tokens refill at a fixed rate (e.g., 10/sec); each request consumes 1 token; if bucket empty → 429 Too Many Requests; allows burst up to the bucket size while enforcing average rate
- **Leaky bucket**: incoming requests add to a queue; queue drains at a fixed rate regardless of input rate; smooths bursty traffic; downside: tail latency if queue is full — requests wait or get dropped
- **Fixed window counter**: count requests in a fixed time window (00:00–00:59, 01:00–01:59); problem: burst at window boundary — 100 at :59 + 100 at :00 = 200 in 2 seconds despite 100/min limit
- **Sliding window log**: store timestamp of every request in a sorted set; count requests in the last 60 seconds; accurate; memory-heavy at scale
- **Sliding window counter**: hybrid — use two fixed window counts and interpolate; memory-efficient AND accurate enough for production; Redis ZADD + ZRANGEBYSCORE implementation
- **Distributed**: single-node counters don't work in a cluster; use Redis INCR/EXPIRE or Lua script for atomic check-and-increment; Redis is single-threaded: operations are serialised safely
- **Where to rate limit**: API Gateway (first line of defence); application service (per-user business limits); database query layer (prevent expensive query storms)

---

## 1. One-Line Definition
A rate limiter controls how many requests a client can make in a time window, protecting backend systems from overload while enforcing fair-use policies — and returns HTTP 429 with a Retry-After header when the limit is exceeded.

---

## 2. The Problem It Solves

A fintech startup launches a "check any GSTIN instantly" API. They offer a freemium tier — 100 requests per day free. On day two, a developer writes a script to call the API in a loop, draining their entire free quota in 3 seconds, then writes an angry review that the API is "broken."

Meanwhile, the same loop pattern from a different user started doing 10,000 calls/minute against the production database lookup. The database CPU hit 100%, all other users experienced 30-second timeouts. The whole service was down for 12 minutes.

Rate limiting solves two distinct problems: business enforcement (freemium quotas), and operational protection (traffic spike isolation). Without it, one abusive client can take down infrastructure for all legitimate users.

---

## 3. How It Works Internally

### The Mental Model
Token bucket: imagine a bucket that fills with water at a steady drip (say, 10 drops per second). Every request takes one drop. You can burst — if no one has been in for 10 seconds, you have 100 drops and can use them all at once. But the bucket has a max capacity — you can't accumulate infinite drops. When empty, new requests wait or are rejected.

### Algorithms Compared

```
Fixed Window:
  |---00:00-01:00---|---01:00-02:00---|
  [99 requests here ] [100 requests here]
  ^window start      ^window start
  Problem: 99 + 100 = 199 requests in a 2-second window at the boundary

Sliding Window Log (accurate, memory-heavy):
  Keep sorted set of timestamps: [59.1s, 59.3s, 59.7s, 59.9s, 60.2s, 60.4s ...]
  On each request: remove all timestamps older than 60 seconds, count remaining
  Count >= limit → reject. Accurate but O(n) memory per user.

Token Bucket (most common):
  tokens = min(capacity, last_tokens + (now - last_refill) * rate)
  if tokens >= 1: tokens--; allow; last_refill = now
  else: reject with 429
  
  Redis Lua script makes this atomic:
  EVAL script 0 userId now capacity refillRate
```

### ASCII Diagram

```
Incoming Request
       │
       ▼
  API Gateway / Load Balancer
       │
       ▼
  Rate Limit Middleware
  ┌─────────────────────────────────────────┐
  │ key = "rl:{userId}:{window}"            │
  │ INCR key → new_count                    │
  │ if new_count == 1: EXPIRE key 60        │ ← set TTL on first write
  │ if new_count > limit: return 429        │
  │ else: pass through                      │
  └─────────────────────────────────────────┘
       │ (allowed)
       ▼
  Backend Service
  
Headers returned to client:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 47
  X-RateLimit-Reset: 1690000060    ← Unix timestamp when window resets
  Retry-After: 32                  ← seconds to wait (only on 429)
```

---

## 4. The Code

### Wrong Way — In-Memory Single Node, No Race Safety

```java
// ❌ In-memory ConcurrentHashMap — breaks in multi-node cluster

@Component
public class NaiveRateLimiter {
    // ❌ Only works on ONE server — if 3 servers, each has independent counter
    //    User can hit 3x the limit by routing to different servers
    private final Map<String, AtomicInteger> counters = new ConcurrentHashMap<>();
    private final Map<String, Long> windowStarts = new ConcurrentHashMap<>();
    
    public boolean isAllowed(String userId) {
        long now = System.currentTimeMillis();
        String key = userId;
        
        // ❌ Not atomic: check-then-act race condition between threads
        Long windowStart = windowStarts.get(key);
        if (windowStart == null || now - windowStart > 60_000) {
            windowStarts.put(key, now);
            counters.put(key, new AtomicInteger(0));
        }
        
        AtomicInteger count = counters.get(key);
        // ❌ Fixed window boundary burst problem unresolved
        return count.incrementAndGet() <= 100;
    }
    
    // ❌ Memory leak: counters for old users never removed
    // ❌ JVM restart: all state lost — all users get fresh quota
}
```

```java
// ✅ Redis-backed Token Bucket — distributed, atomic, correct

@Component
public class TokenBucketRateLimiter {
    private final StringRedisTemplate redis;
    private final RateLimiterConfig config;
    
    // ✅ Lua script: check + update is ATOMIC on Redis (single-threaded Redis)
    // No race condition even with thousands of concurrent requests
    private static final String TOKEN_BUCKET_SCRIPT =
        """
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local capacity = tonumber(ARGV[2])
        local refillRate = tonumber(ARGV[3])  -- tokens per second
        local requested = tonumber(ARGV[4])
        
        local data = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(data[1]) or capacity        -- start full
        local lastRefill = tonumber(data[2]) or now
        
        -- Refill tokens based on elapsed time
        local elapsed = math.max(0, now - lastRefill)
        tokens = math.min(capacity, tokens + elapsed * refillRate)
        
        local allowed = 0
        if tokens >= requested then
            tokens = tokens - requested
            allowed = 1
        end
        
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, 3600)   -- expire key after 1h of inactivity
        
        return { allowed, math.floor(tokens) }
        """;
    
    public RateLimitResult checkLimit(RateLimitRequest request) {
        String key = buildKey(request);
        long now = System.currentTimeMillis() / 1000;  // seconds
        
        TierConfig tier = config.getTierFor(request.getPlan());  // FREE, PRO, ENTERPRISE
        
        List<Object> result = redis.execute(
            new DefaultRedisScript<>(TOKEN_BUCKET_SCRIPT, List.class),
            List.of(key),
            String.valueOf(now),
            String.valueOf(tier.getCapacity()),
            String.valueOf(tier.getRefillRatePerSecond()),
            "1"  // requesting 1 token
        );
        
        boolean allowed = ((Long) result.get(0)) == 1L;
        long remaining = (Long) result.get(1);
        
        return new RateLimitResult(
            allowed,
            remaining,
            tier.getCapacity(),
            now + (long) Math.ceil((double)(tier.getCapacity() - remaining) / tier.getRefillRatePerSecond())
        );
    }
    
    private String buildKey(RateLimitRequest request) {
        // Key: type:identifier — different rate limits by dimension
        return switch (request.getType()) {
            case USER    -> "rl:user:" + request.getUserId();
            case IP      -> "rl:ip:" + request.getIpHash();   // hash, not raw IP
            case API_KEY -> "rl:key:" + request.getApiKey();
            case GLOBAL  -> "rl:global:";                      // site-wide throttle
        };
    }
}

// ✅ Spring MVC filter — applied before controller methods
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitFilter extends OncePerRequestFilter {
    private final TokenBucketRateLimiter limiter;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        
        String apiKey = request.getHeader("X-API-Key");
        String userId  = extractUserId(request);
        
        // ✅ Multi-dimension rate limiting: both per-user AND per-API-key
        RateLimitResult userResult   = limiter.checkLimit(RateLimitRequest.forUser(userId));
        RateLimitResult keyResult    = apiKey != null
            ? limiter.checkLimit(RateLimitRequest.forApiKey(apiKey))
            : userResult;
        
        RateLimitResult binding = Stream.of(userResult, keyResult)
            .filter(r -> !r.isAllowed())
            .findFirst()
            .orElse(userResult);
        
        // ✅ Always set rate limit headers — even on allowed requests
        response.setHeader("X-RateLimit-Limit",     String.valueOf(binding.getLimit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(binding.getRemaining()));
        response.setHeader("X-RateLimit-Reset",     String.valueOf(binding.getResetAt()));
        
        if (!binding.isAllowed()) {
            long retryAfter = binding.getResetAt() - (System.currentTimeMillis() / 1000);
            response.setHeader("Retry-After", String.valueOf(Math.max(1, retryAfter)));
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                """
                {"error":"rate_limit_exceeded","message":"Too many requests. Please retry after %d seconds."}
                """.formatted(retryAfter)
            );
            return;  // ← stop the filter chain
        }
        
        chain.doFilter(request, response);
    }
}
```

```typescript
// ✅ Frontend: respect rate limit headers and implement retry

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '30', 10);
        const reset = parseInt(response.headers.get('X-RateLimit-Reset') ?? '0', 10);
        
        console.warn(`Rate limited. Retry after ${retryAfter}s (resets at ${new Date(reset * 1000).toISOString()})`);
        
        // ✅ Surface to user — don't silently retry, inform them
        throw new RateLimitError(retryAfter, reset);
    }
    
    return response.json() as T;
}

// React component: show remaining quota
function ApiQuotaIndicator() {
    const [remaining, setRemaining] = useState<number | null>(null);
    const [limit, setLimit] = useState<number | null>(null);
    
    // Update quota display after each API call
    useEffect(() => {
        const handler = (event: CustomEvent) => {
            setRemaining(event.detail.remaining);
            setLimit(event.detail.limit);
        };
        window.addEventListener('api-rate-limit-update', handler as EventListener);
        return () => window.removeEventListener('api-rate-limit-update', handler as EventListener);
    }, []);
    
    if (remaining === null || limit === null) return null;
    const pct = (remaining / limit) * 100;
    
    return (
        <div className={`quota-indicator ${pct < 10 ? 'quota-low' : ''}`}>
            {remaining}/{limit} API calls remaining
        </div>
    );
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain how the token bucket algorithm works."

**Hruday's answer:**
> Token bucket works like a physical bucket of tokens that refills at a steady rate. Say the bucket holds 100 tokens and refills at 10 tokens per second. Every API request takes one token from the bucket. If the bucket has tokens, the request goes through. If it's empty, the request gets rejected with 429.
>
> The key property is burst tolerance. If no requests come in for 10 seconds, 100 tokens accumulate (up to the bucket's capacity). The client can then send 100 requests in one second for a short burst — say, downloading all API results for a batch job at startup. After that burst, the rate drops to 10 per second until the bucket refills.
>
> Compare this to leaky bucket: leaky bucket allows requests into a queue and drains it at a fixed rate regardless of input. No bursting — 11 simultaneous requests means 10 get through and 1 waits or is dropped. Token bucket is better for APIs where clients have legitimate bursty patterns.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you make a rate limiter accurate in a multi-node setup without introducing a single point of failure?"

**Hruday's answer:**
> Redis is the answer, with a few important implementation details.
>
> The naive approach — INCR key, EXPIRE key 60 — has a race: two requests arrive simultaneously, both see count 0, both increment to 1, and EXPIRE is only set by the first one. If the second request arrives between INCR and EXPIRE, the TTL is never set. The key lives forever and eventually over-counts.
>
> The fix is a Lua script. Redis is single-threaded, so a Lua script runs atomically — no race conditions. The script reads the current token state, calculates the refill, checks if the request is allowed, and writes back — all in one atomic operation.
>
> For high availability: Redis Cluster with 3 primary shards. Rate limit keys are distributed by hash slot — a given user's key always hits the same shard. If a shard goes down, there's brief rate limit loss for users on that shard — they might get slightly more than their limit for a few seconds until failover completes. This is acceptable. In practice, stricter guarantees (Redlock algorithm) aren't needed for rate limiting — the cost of slightly over-allowing is far lower than the cost of a blocking distributed lock.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use a leaky bucket instead of token bucket?"

**Hruday's answer:**
> Leaky bucket is better when you need a smooth, constant output rate regardless of how bursty the input is.
>
> Classic use case: upstream from a payment processor that can only handle 50 transactions per second. Your application might receive 500 payment requests in a burst (Black Friday flash sale), but the processor can't handle bursts. Leaky bucket queues the 500, drains 50 per second to the processor. The processor sees a constant stream; the burst is absorbed in the queue.
>
> Token bucket allows bursts to pass through. For an API that your own servers handle, that's fine — your servers can absorb a burst. For a third-party rate-limited service (payment gateway, SMS provider, external API with fixed QPS quota), you need the smooth output that leaky bucket provides.
>
> The downside of leaky bucket at the public API level: tail latency. A request that arrives when the queue is full either waits or gets dropped. This makes P99 latency unpredictable. Token bucket rejects immediately (predictable 429), which is better for API clients that need to know their request was rejected, not silently queued.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design rate limiting for a payment API with three plans: Free (100/day), Pro (10,000/day), Enterprise (custom)."

**Hruday's answer:**
> I'd design three layers.
>
> Layer 1: API Gateway (Kong/AWS API Gateway). Define plans and quotas. Gateway reads the API key, looks up the plan, applies burst limits (Free: max 5/sec; Pro: max 100/sec; Enterprise: negotiated). Reject at the edge — no traffic hits application servers.
>
> Layer 2: Application-level rate limiter for finer controls. Free tier: 100 requests per day, token bucket capacity 10, refill rate 0.001/sec (= 100/day). Pro tier: 10,000 per day. Store in Redis with key `rl:{plan}:{apiKey}:{YYYY-MM-DD}` — daily bucket that resets at midnight UTC.
>
> Layer 3: Database query rate limiter specifically for expensive queries (fraud checks, bulk lookups). These can return 200 OK but trigger a Kafka event to deplete a separate "compute quota" bucket that limits expensive operations independently of request count.
>
> Enterprise: stored in a config service (DB table), looked up on first request and cached in Redis for 1 hour. Their limits are negotiated in their contract; the same token bucket code applies but with their custom values.
>
> Headers: always return `X-RateLimit-Plan: pro`, `X-RateLimit-Limit: 10000`, `X-RateLimit-Remaining: 9843`, `X-RateLimit-Reset: 1690000000` — clients build dashboards from these.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| No Retry-After header | "Just return 429 and the client knows to slow down" | Without Retry-After, clients don't know when to retry — they either hammer your API immediately (worsening the problem) or back off arbitrarily; RFC 6585 requires Retry-After on 429; well-designed clients like the Java Spring WebClient or Axios can automatically retry after the specified interval; also provide X-RateLimit-Reset in Unix timestamp so clients can calculate exactly when their quota resets |
| Sliding window is the only correct algorithm | "Token bucket has the boundary burst problem so sliding window is always better" | Token bucket doesn't have a window boundary burst problem — that's fixed window; token bucket naturally allows bursts up to capacity but enforces average rate; sliding window is more accurate but significantly more memory-intensive (store timestamp of every request in a sorted set vs two numbers for token bucket); for most production APIs, token bucket's memory efficiency at 1M+ users far outweighs the tiny accuracy difference against sliding window; Stripe, Razorpay, and GitHub all use token bucket variants |
| Rate limit only by IP | "I'd rate limit by IP address — simple and effective" | IP-based limiting is easily defeated by rotating IPs (residential proxy networks, mobile nat) and over-penalises users behind NAT (an entire office might share one IP); IP is a useful secondary dimension but the primary key should be user ID or API key; use IP rate limiting as a broad shield against unauthenticated traffic (before login endpoint), not as the primary fairness mechanism for authenticated API traffic |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a public API for fetching SAP system status — customers polled it to check if their cloud deployment was healthy. One customer's monitoring tool was misconfigured and hammered the endpoint 500 times per second, which degraded response time for all 2,000 other customers checking status. We had no rate limiting at all at that point.
>
> We shipped a Redis token bucket rate limiter within two days — 60 requests/min per customer API key, implemented as a Spring OncePerRequestFilter using a Lua script for atomicity. The misconfigured customer immediately hit 429s; we proactively contacted their team. All other customers' P99 dropped from 4 seconds back to 200ms within minutes of deployment."

---

## 8. Scale Evolution

**1,000 users →** In-memory rate limiter per node is fine. Use token bucket with `ConcurrentHashMap<userId, TokenBucket>` with scheduled cleanup. Simple, no Redis dependency.

**100,000 users →** Redis token bucket with Lua script for atomicity. Single Redis instance is fine. Multi-node app cluster all pointing to same Redis = consistent limits. Monitor Redis latency — rate limit adds 1ms per request.

**10 million users →** Redis Cluster (sharded). Rate limit keys distributed across shards. Consider local L1 cache (Caffeine, 1-second TTL) in front of Redis — most requests check local counter first; only sync to Redis periodically (slight over-allowance is acceptable vs Redis round-trip for every request). Separate Redis cluster for rate limiting from application cache cluster — isolate failure domains. API Gateway as first line; application as second — gateway rejects the bulk of abuse before it reaches application servers.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | API monetisation (freemium → pro → enterprise quotas); protecting payment gateway from merchant overage; per-endpoint rate limits (payout API considerably stricter than query API) | Token bucket design; plan-based multi-tier limits |
| Swiggy / Meesho | Flash sale traffic spikes — rate limiting protects checkout APIs from burst; delivery partner location API rate limited per driver to control GPS polling overhead | Burst absorption; per-entity rate limiting |
| Adobe / Microsoft | API product monetisation (Adobe API rate limits per plan); Azure APIM built-in rate limiting; design question: how would you build rate limiting for an API with 1B+ calls/day | Scale design; enterprise plan flexibility |
| SAP Labs | SAP status endpoint story — 500 RPS misconfigured customer hammering; Redis token bucket shipped in 2 days; P99 4s → 200ms | Real incident story; time-to-implement detail |

---

## 10. Related Topics — What to Study Next

- **Topic 101 — Redis Data Structures (String, Hash, List, Set, ZSet)** — rate limiting uses Redis HMSET/HMGET for token bucket state; ZADD/ZRANGEBYSCORE for sliding window logs; knowing which data structure to pick and why shows Redis depth
- **Topic 135 — Rate Limiting Algorithms (Full API design section)** — reinforces this topic with REST API design perspective: which headers to return, how to document limits, how rate limiting interacts with API versioning
- **Topic 71 — Circuit Breaker (Resilience4j)** — rate limiters and circuit breakers are complementary; rate limiter controls inbound rate; circuit breaker controls outbound calls to failing dependencies; a system that only has one without the other is incomplete
- **Topic 136 — API Gateway Pattern** — in production, API Gateway is the first enforcement point for rate limiting; understanding how Kong, AWS API Gateway, or Spring Cloud Gateway integrates with a Redis-backed rate limiter shows systems thinking

---

*Part 19 · Rate Limiter — Token Bucket, Distributed Counters · Full Stack Interview Guide · Hruday D · 2026*
