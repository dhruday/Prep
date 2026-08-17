# Stripe — Senior Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Senior Software Engineer |
| **Level** | L3 |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Remote (India) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + Integration Design + System Design + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Coding — Implement an Idempotent Retry Client with Backoff

### Problem
Build an HTTP client wrapper that:
- Supports idempotent retries with configurable retry count
- Exponential backoff with jitter
- Idempotency key tracking to prevent duplicate operations
- Circuit breaker pattern (open after N failures)
- Request/response logging with correlation IDs
- Timeout support per request

### 💡 Interview-Ready Answer

```java
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;

public class ResilientHttpClient {

    enum CircuitState { CLOSED, OPEN, HALF_OPEN }

    record HttpRequest(String method, String url, Map<String, String> headers,
                       String body, String idempotencyKey) {}

    record HttpResponse(int statusCode, String body, Map<String, String> headers,
                        long latencyMs) {}

    record RetryConfig(int maxRetries, long initialDelayMs, long maxDelayMs,
                       double backoffMultiplier, double jitterFactor,
                       Set<Integer> retryableStatusCodes) {

        static RetryConfig defaults() {
            return new RetryConfig(3, 500, 30_000, 2.0, 0.3,
                Set.of(429, 500, 502, 503, 504));
        }
    }

    static class CircuitBreaker {
        private CircuitState state = CircuitState.CLOSED;
        private final int failureThreshold;
        private final long recoveryTimeMs;
        private final AtomicInteger failureCount = new AtomicInteger(0);
        private volatile long lastFailureTime = 0;

        CircuitBreaker(int failureThreshold, long recoveryTimeMs) {
            this.failureThreshold = failureThreshold;
            this.recoveryTimeMs = recoveryTimeMs;
        }

        boolean allowRequest() {
            switch (state) {
                case CLOSED: return true;
                case OPEN:
                    if (System.currentTimeMillis() - lastFailureTime > recoveryTimeMs) {
                        state = CircuitState.HALF_OPEN;
                        return true;
                    }
                    return false;
                case HALF_OPEN: return true;
                default: return false;
            }
        }

        void recordSuccess() {
            failureCount.set(0);
            state = CircuitState.CLOSED;
        }

        void recordFailure() {
            lastFailureTime = System.currentTimeMillis();
            if (failureCount.incrementAndGet() >= failureThreshold) {
                state = CircuitState.OPEN;
            }
        }

        CircuitState getState() { return state; }
    }

    // Idempotency store: key -> response (prevents duplicate processing)
    private final ConcurrentHashMap<String, HttpResponse> idempotencyStore = new ConcurrentHashMap<>();
    private final CircuitBreaker circuitBreaker;
    private final RetryConfig retryConfig;
    private final Function<HttpRequest, HttpResponse> httpExecutor;
    private final Random random = new Random();

    // Metrics
    private final AtomicLong totalRequests = new AtomicLong();
    private final AtomicLong totalRetries = new AtomicLong();
    private final AtomicLong totalFailures = new AtomicLong();

    public ResilientHttpClient(Function<HttpRequest, HttpResponse> httpExecutor,
                               RetryConfig retryConfig, int cbThreshold, long cbRecoveryMs) {
        this.httpExecutor = httpExecutor;
        this.retryConfig = retryConfig;
        this.circuitBreaker = new CircuitBreaker(cbThreshold, cbRecoveryMs);
    }

    /**
     * Execute request with retry, idempotency, and circuit breaker.
     */
    public HttpResponse execute(HttpRequest request) throws Exception {
        String correlationId = UUID.randomUUID().toString().substring(0, 8);
        totalRequests.incrementAndGet();

        // Check idempotency cache
        if (request.idempotencyKey() != null) {
            HttpResponse cached = idempotencyStore.get(request.idempotencyKey());
            if (cached != null) {
                log(correlationId, "IDEMPOTENT_HIT", request.url(), 0, cached.statusCode());
                return cached;
            }
        }

        // Check circuit breaker
        if (!circuitBreaker.allowRequest()) {
            log(correlationId, "CIRCUIT_OPEN", request.url(), 0, 503);
            throw new RuntimeException("Circuit breaker is OPEN for: " + request.url());
        }

        Exception lastException = null;

        for (int attempt = 0; attempt <= retryConfig.maxRetries(); attempt++) {
            if (attempt > 0) {
                long delay = calculateDelay(attempt);
                totalRetries.incrementAndGet();
                log(correlationId, "RETRY_" + attempt, request.url(), delay, -1);
                Thread.sleep(delay);
            }

            try {
                long start = System.currentTimeMillis();
                HttpResponse response = httpExecutor.apply(request);
                long latency = System.currentTimeMillis() - start;

                log(correlationId, "RESPONSE", request.url(), latency, response.statusCode());

                if (isSuccess(response.statusCode())) {
                    circuitBreaker.recordSuccess();

                    // Cache idempotent response
                    if (request.idempotencyKey() != null) {
                        idempotencyStore.put(request.idempotencyKey(), response);
                    }
                    return response;
                }

                if (!isRetryable(response.statusCode())) {
                    // Non-retryable error — return immediately
                    return response;
                }

                circuitBreaker.recordFailure();
                lastException = new RuntimeException("HTTP " + response.statusCode());

            } catch (Exception e) {
                circuitBreaker.recordFailure();
                lastException = e;
                log(correlationId, "ERROR", request.url(), 0, -1);

                if (attempt == retryConfig.maxRetries()) break;
            }
        }

        totalFailures.incrementAndGet();
        throw new RuntimeException("All retries exhausted for " + request.url(), lastException);
    }

    /**
     * Exponential backoff with decorrelated jitter.
     * delay = min(maxDelay, initialDelay * multiplier^attempt * (1 + jitter))
     */
    long calculateDelay(int attempt) {
        double baseDelay = retryConfig.initialDelayMs()
            * Math.pow(retryConfig.backoffMultiplier(), attempt - 1);

        // Add random jitter: [1-jitter, 1+jitter]
        double jitter = 1.0 + (random.nextDouble() * 2 - 1) * retryConfig.jitterFactor();
        long delay = (long) (baseDelay * jitter);

        return Math.min(delay, retryConfig.maxDelayMs());
    }

    private boolean isSuccess(int statusCode) {
        return statusCode >= 200 && statusCode < 300;
    }

    private boolean isRetryable(int statusCode) {
        return retryConfig.retryableStatusCodes().contains(statusCode);
    }

    private void log(String corrId, String event, String url, long latencyOrDelay, int status) {
        System.out.printf("[%s] %-16s %s (latency/delay: %dms, status: %d, circuit: %s)%n",
            corrId, event, url, latencyOrDelay, status, circuitBreaker.getState());
    }

    public Map<String, Long> getMetrics() {
        return Map.of(
            "totalRequests", totalRequests.get(),
            "totalRetries", totalRetries.get(),
            "totalFailures", totalFailures.get(),
            "idempotencyCacheSize", (long) idempotencyStore.size()
        );
    }

    public static void main(String[] args) throws Exception {
        AtomicInteger callCount = new AtomicInteger(0);

        // Simulate flaky HTTP endpoint
        Function<HttpRequest, HttpResponse> flakyServer = req -> {
            int count = callCount.incrementAndGet();
            if (count <= 2) {
                return new HttpResponse(503, "Service Unavailable", Map.of(), 100);
            }
            return new HttpResponse(200,
                "{\"payment_id\":\"pay_abc123\",\"status\":\"captured\"}",
                Map.of("x-request-id", UUID.randomUUID().toString()), 50);
        };

        ResilientHttpClient client = new ResilientHttpClient(
            flakyServer, RetryConfig.defaults(), 5, 30_000);

        // Execute with idempotency key
        HttpRequest paymentReq = new HttpRequest(
            "POST", "/v1/payments/capture",
            Map.of("Content-Type", "application/json"),
            "{\"amount\":5000,\"currency\":\"inr\"}",
            "idem_key_pay123"
        );

        System.out.println("=== First call (will retry twice then succeed) ===");
        HttpResponse resp = client.execute(paymentReq);
        System.out.printf("Response: %d — %s%n%n", resp.statusCode(), resp.body());

        System.out.println("=== Second call (idempotent — from cache) ===");
        HttpResponse resp2 = client.execute(paymentReq);
        System.out.printf("Response: %d — %s%n%n", resp2.statusCode(), resp2.body());

        System.out.println("=== Metrics ===");
        client.getMetrics().forEach((k, v) -> System.out.printf("  %s: %d%n", k, v));
    }
}
```

## 🎯 Key Takeaways
- Stripe asks **API infrastructure** problems — resilience, idempotency, payment capture
- **Idempotency key pattern**: cache response by key, return cached on duplicate calls
- Exponential backoff with **decorrelated jitter** prevents thundering herd
- Circuit breaker: CLOSED → OPEN (after N failures) → HALF_OPEN (after recovery time) → test → CLOSED
- Correlation IDs in logs enable distributed tracing
- Retryable vs non-retryable status codes (429, 5xx are retryable; 4xx except 429 are not)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Medium-Hard | Resilience Patterns, Concurrency |
| Integration Design | Hard | API Gateway, Webhook Delivery |
| System Design | Hard | Payment Processing Pipeline |
| HM | Medium | Behavioral, Debugging Stories |
