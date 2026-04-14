# Meta — E5 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Software Engineer |
| **Level** | E5 (Senior) |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | London |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site: 2 Coding + System Design + Behavioral)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 3: Coding — Rate Limiter with Sliding Window

### Problem
Design and implement an in-memory rate limiter that supports:
1. **Fixed Window** — max N requests per time window
2. **Sliding Window Log** — exact tracking of individual request timestamps
3. **Sliding Window Counter** — weighted approximation between two windows
4. **Token Bucket** — tokens replenish at a steady rate

Each strategy must implement `boolean allowRequest(String clientId)`.

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class RateLimiterSuite {

    // --- Strategy Interface ---
    interface RateLimiter {
        boolean allowRequest(String clientId);
        String name();
    }

    // ============================================================
    // 1. FIXED WINDOW COUNTER
    // ============================================================
    static class FixedWindowLimiter implements RateLimiter {
        private final int maxRequests;
        private final long windowMillis;
        private final ConcurrentHashMap<String, long[]> counters = new ConcurrentHashMap<>();
        // long[0] = window start, long[1] = count

        FixedWindowLimiter(int maxRequests, long windowMillis) {
            this.maxRequests = maxRequests;
            this.windowMillis = windowMillis;
        }

        @Override
        public boolean allowRequest(String clientId) {
            long now = System.currentTimeMillis();
            counters.compute(clientId, (key, val) -> {
                if (val == null || now - val[0] >= windowMillis) {
                    return new long[]{now, 1};
                }
                val[1]++;
                return val;
            });
            return counters.get(clientId)[1] <= maxRequests;
        }

        @Override public String name() { return "FixedWindow"; }
    }

    // ============================================================
    // 2. SLIDING WINDOW LOG
    // ============================================================
    static class SlidingWindowLogLimiter implements RateLimiter {
        private final int maxRequests;
        private final long windowMillis;
        private final ConcurrentHashMap<String, Deque<Long>> logs = new ConcurrentHashMap<>();

        SlidingWindowLogLimiter(int maxRequests, long windowMillis) {
            this.maxRequests = maxRequests;
            this.windowMillis = windowMillis;
        }

        @Override
        public boolean allowRequest(String clientId) {
            long now = System.currentTimeMillis();
            Deque<Long> timestamps = logs.computeIfAbsent(clientId, k -> new ConcurrentLinkedDeque<>());

            // Evict expired timestamps
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() >= windowMillis) {
                timestamps.pollFirst();
            }

            if (timestamps.size() < maxRequests) {
                timestamps.addLast(now);
                return true;
            }
            return false;
        }

        @Override public String name() { return "SlidingWindowLog"; }
    }

    // ============================================================
    // 3. SLIDING WINDOW COUNTER (Weighted Approximation)
    // ============================================================
    static class SlidingWindowCounterLimiter implements RateLimiter {
        private final int maxRequests;
        private final long windowMillis;
        private final ConcurrentHashMap<String, long[]> windows = new ConcurrentHashMap<>();
        // long[0] = current window start
        // long[1] = previous window count
        // long[2] = current window count

        SlidingWindowCounterLimiter(int maxRequests, long windowMillis) {
            this.maxRequests = maxRequests;
            this.windowMillis = windowMillis;
        }

        @Override
        public boolean allowRequest(String clientId) {
            long now = System.currentTimeMillis();

            long[] state = windows.compute(clientId, (key, val) -> {
                if (val == null) {
                    return new long[]{now, 0, 1};
                }
                long elapsed = now - val[0];
                if (elapsed >= 2 * windowMillis) {
                    // Both windows expired
                    return new long[]{now, 0, 1};
                } else if (elapsed >= windowMillis) {
                    // Rotate: current → previous, start new current
                    return new long[]{val[0] + windowMillis, val[2], 1};
                } else {
                    val[2]++;
                    return val;
                }
            });

            // Weighted count = previous_count * overlap_fraction + current_count
            double elapsed = now - state[0];
            double overlapFraction = Math.max(0, 1.0 - elapsed / windowMillis);
            double weightedCount = state[1] * overlapFraction + state[2];

            return weightedCount <= maxRequests;
        }

        @Override public String name() { return "SlidingWindowCounter"; }
    }

    // ============================================================
    // 4. TOKEN BUCKET
    // ============================================================
    static class TokenBucketLimiter implements RateLimiter {
        private final int maxTokens;
        private final double refillRatePerMs;
        private final ConcurrentHashMap<String, double[]> buckets = new ConcurrentHashMap<>();
        // double[0] = current tokens, double[1] = last refill time (ms)

        TokenBucketLimiter(int maxTokens, double refillRatePerSecond) {
            this.maxTokens = maxTokens;
            this.refillRatePerMs = refillRatePerSecond / 1000.0;
        }

        @Override
        public boolean allowRequest(String clientId) {
            long now = System.currentTimeMillis();

            double[] bucket = buckets.compute(clientId, (key, val) -> {
                if (val == null) {
                    return new double[]{maxTokens - 1, now};
                }
                double elapsed = now - val[1];
                double refilled = Math.min(maxTokens, val[0] + elapsed * refillRatePerMs);
                if (refilled >= 1.0) {
                    return new double[]{refilled - 1, now};
                }
                return new double[]{refilled, val[1]}; // No token available
            });

            return bucket[0] >= 0;
        }

        @Override public String name() { return "TokenBucket"; }
    }

    // ============================================================
    // RATE LIMITER FACTORY
    // ============================================================
    enum Strategy { FIXED_WINDOW, SLIDING_LOG, SLIDING_COUNTER, TOKEN_BUCKET }

    static RateLimiter create(Strategy strategy, int maxRequests, long windowMs) {
        return switch (strategy) {
            case FIXED_WINDOW -> new FixedWindowLimiter(maxRequests, windowMs);
            case SLIDING_LOG -> new SlidingWindowLogLimiter(maxRequests, windowMs);
            case SLIDING_COUNTER -> new SlidingWindowCounterLimiter(maxRequests, windowMs);
            case TOKEN_BUCKET -> new TokenBucketLimiter(maxRequests, (double) maxRequests / (windowMs / 1000.0));
        };
    }

    // ============================================================
    // COMPOSITE: Chain multiple limiters (e.g., 10/sec AND 100/min)
    // ============================================================
    static class CompositeLimiter implements RateLimiter {
        private final List<RateLimiter> limiters;

        CompositeLimiter(RateLimiter... limiters) {
            this.limiters = List.of(limiters);
        }

        @Override
        public boolean allowRequest(String clientId) {
            return limiters.stream().allMatch(l -> l.allowRequest(clientId));
        }

        @Override
        public String name() {
            return "Composite[" + limiters.stream().map(RateLimiter::name)
                .reduce((a, b) -> a + "+" + b).orElse("") + "]";
        }
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) throws InterruptedException {
        System.out.println("=== Rate Limiter Comparison ===\n");

        for (Strategy strategy : Strategy.values()) {
            RateLimiter limiter = create(strategy, 5, 1000); // 5 requests per second
            System.out.printf("--- %s (5 req/sec) ---%n", limiter.name());

            int allowed = 0, denied = 0;
            for (int i = 0; i < 10; i++) {
                boolean ok = limiter.allowRequest("user-1");
                if (ok) allowed++; else denied++;
                System.out.printf("  Request %2d: %s%n", i + 1, ok ? "✓ ALLOWED" : "✗ DENIED");
            }
            System.out.printf("  → Allowed: %d, Denied: %d%n%n", allowed, denied);
        }

        // Composite demo: 3 per second AND 8 per 5 seconds
        System.out.println("--- Composite (3/sec AND 8/5sec) ---");
        RateLimiter composite = new CompositeLimiter(
            create(Strategy.SLIDING_LOG, 3, 1000),
            create(Strategy.SLIDING_LOG, 8, 5000)
        );

        for (int burst = 1; burst <= 3; burst++) {
            System.out.printf("  Burst %d:%n", burst);
            for (int i = 0; i < 4; i++) {
                boolean ok = composite.allowRequest("user-X");
                System.out.printf("    req %d: %s%n", i + 1, ok ? "✓" : "✗");
            }
            Thread.sleep(1100); // wait for per-sec window to reset
        }
    }
}
```

## 🎯 Key Takeaways
- Meta E5 coding rounds often ask **design + implementation** hybrids
- Fixed Window has boundary burst problem — 2x burst at window edges
- Sliding Window Log is most accurate but O(N) memory per client
- Sliding Window Counter is the best practical tradeoff (O(1) memory, ~approximate)
- Token Bucket allows controlled bursts up to bucket capacity
- Composite limiters let you combine rules (e.g., per-second + per-minute)
- ConcurrentHashMap.compute() for atomic read-modify-write in concurrent settings

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Trees, DFS |
| Coding 1 | Medium | Graphs, BFS |
| Coding 2 | Hard | Rate Limiting, Concurrency, Design Patterns |
| System Design | Hard | Distributed Rate Limiting, Redis |
| Behavioral | Medium | Conflict Resolution, Mentoring |
