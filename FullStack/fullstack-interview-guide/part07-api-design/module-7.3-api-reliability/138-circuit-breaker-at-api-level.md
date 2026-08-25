# Circuit Breaker at API Level
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Circuit breaker** is a stability pattern that prevents a service from repeatedly calling a downstream dependency that is failing. Named after the electrical safety device: when too much current flows (too many failures), the breaker trips (opens) and stops the circuit. The system then heals itself by periodically testing whether the downstream is healthy again.
- **Three states**: CLOSED (normal — all requests pass through), OPEN (failing — requests fail fast with no downstream call), HALF-OPEN (probe state — a small number of test requests go through; if they succeed, circuit closes again; if they fail, stays open).
- **Why fail fast is better than waiting**: when a downstream service is down, each request to it hangs for the full timeout (say 30 seconds). With 200 concurrent users and a 30-second timeout, that's 200 × 30 = 6,000 connection-seconds of blocked threads. Thread pool exhausts. New requests start failing even for unrelated endpoints. Circuit breaker fails fast immediately (in milliseconds), releasing threads, allowing the system to serve other requests normally.
- **Configuration**: failure rate threshold (e.g., open when 50% of last 100 calls fail), slow call rate threshold (e.g., open when 80% of calls exceed 2 seconds), wait duration in open state (e.g., 30 seconds before transitioning to HALF-OPEN), permitted calls in half-open state (e.g., 5 test calls).
- **Resilience4j**: `@CircuitBreaker(name="paymentService", fallbackMethod="paymentFallback")` on service method. Spring Boot auto-configuration via `application.yml`. Spring Cloud Gateway has `CircuitBreakerGatewayFilter` for gateway-level circuit breaking before requests reach any service.
- **Fallback**: when the circuit is OPEN, the fallback method runs. Fallback can return cached data, a degraded response, or a clear error. Never let fallback throw — it must always return something.

---

## 1. One-Line Definition
A circuit breaker monitors calls to a downstream service, opens (blocks calls) when failure rate exceeds a threshold, and periodically probes for recovery — converting cascading failure into controlled fast-fail with fallback responses.

---

## 2. The Problem It Solves

### Cascading Failure Without Circuit Breaker

```
SCENARIO: Swiggy checkout flow. Payment Service depends on an external payment gateway.
Payment gateway has an outage. What happens?

WITHOUT CIRCUIT BREAKER:

T=00:00  Payment gateway starts failing
          Payment Service timeout = 30 seconds (waiting for gateway response)

T=00:01  100 users try to checkout simultaneously
          Each creates a thread (or reactive subscription) waiting on payment gateway
          100 threads occupied, each waiting 30 seconds

T=00:15  100 more users try checkout
          Another 100 threads waiting
          Total: 200 threads occupied out of a thread pool of 200
          Thread pool EXHAUSTED

T=00:16  User tries to view ORDER HISTORY (has nothing to do with payments)
          Spring Boot has no available threads
          Request queues, then timeouts
          Order History API now returns 503 — for no reason related to it

T=00:17  Health check endpoint (no business logic, just "return OK")
          Cannot get a thread — returns 503
          Kubernetes marks pod as unhealthy — restarts it
          Now the entire pod is down for 30 seconds during restart

T=00:18  Kubernetes starts more pods (autoscaler reacts to 503s)
          New pods connect to... the failed payment gateway
          They also get stuck
          Kubernetes keeps restarting

OUTCOME:
  A 30-second payment gateway outage causes a full application meltdown
  All endpoints (even completely unrelated ones) fail for 10+ minutes
  This is CASCADING FAILURE — one dependency failure takes down everything

WITH CIRCUIT BREAKER:

T=00:00  Payment gateway starts failing
T=00:01  First 100 payment calls fail within 30s timeout (circuit CLOSED, no breaker yet)
T=00:06  Failure rate crosses 50% threshold (10 failures in last 20 calls)
          Circuit OPENS
T=00:07  New payment requests → circuit breaker catches them
          Immediately returns fallback: "Payment service temporarily unavailable. Try again."
          Response time: <5ms (no downstream call)
          Thread: released immediately
T=00:07  Order history, product browsing, cart API → continue serving normally
          Thread pool has capacity — unrelated endpoints unaffected
T=00:36  Circuit transitions to HALF-OPEN (after 30s wait)
          5 probe requests allowed through to payment gateway
          If gateway still down: probe fails → back to OPEN
          If gateway recovers: probes succeed → circuit CLOSES
T=01:00  Payment gateway recovers. Circuit closes. Normal operation resumes.

OUTCOME: 30-second gateway outage causes 30-60s payment disruption only
         Zero impact on unrelated functionality
         No cascading failure
         No Kubernetes restart storm
```

---

## 3. How It Works Internally

### State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
          ────────▶ │              CLOSED                     │ ◀────────
         │          │  (normal operation)                     │          │
         │          │  All calls pass through to downstream   │          │
         │          │                                         │          │
         │          │  Counting: track last N calls           │          │
         │          │  failure_rate = failures / N            │          │
         │          └──────────────┬──────────────────────────┘          │
         │                         │                                      │
         │              failure_rate > threshold                          │
         │              or slow_call_rate > threshold                     │
         │                         │                                      │
         │                         ▼                                      │
         │          ┌──────────────────────────────────────────────┐      │
         │          │                                              │      │
         │          │                  OPEN                        │      │
         │          │  (fail fast — NO downstream calls)          │      │
         │          │  Every call → immediate error/fallback       │      │
         │          │  Response time: ~1ms                         │      │
         │          │                                              │      │
         │          │  Wait: waitDurationInOpenState (e.g. 30s)   │      │
         │          └──────────────┬───────────────────────────────┘      │
         │                         │                                      │
         │              Wait time elapsed                                 │
         │                         │                                      │
         │                         ▼                                      │
         │          ┌──────────────────────────────────────────────┐      │
         │          │                                              │      │
         │          │              HALF-OPEN                       │      │
         │          │  (probe — limited calls allowed through)    │      │
         │          │  Max N probe calls (e.g. 5)                 │      │
         │          │  Rest: fail fast (same as OPEN)              │      │
         │          │                                              │      │
         │          │  Probe results:                             │      │
         │          └───┬──────────────────────────────────────┬──┘      │
         │              │                                       │         │
         │    probes fail                             probes succeed      │
         │    (service still down)                   (service recovered)  │
         │              │                                       │         │
         └──────────────┘                                       └─────────┘
              → OPEN again                                → CLOSED again
              (wait another 30s)                          (normal operation)
```

### Resilience4j Sliding Window Types

```
COUNT-BASED sliding window (type: COUNT_BASED):
  Track the last N calls (e.g., last 100 calls)
  failure_rate = failures_in_last_100 / 100
  Good for: steady traffic. Simple to understand.
  
  Timeline: call 1, call 2 ... call 100, call 101 (drops call 1 from window)
  Window: always exactly last 100 calls
  
TIME-BASED sliding window (type: TIME_BASED):
  Track calls in the last N seconds (e.g., last 60 seconds)
  failure_rate = failures_in_last_60s / total_calls_in_last_60s
  Good for: bursty traffic where call count varies by time
  Minimum calls: don't open circuit unless at least N calls occurred (avoids false open on idle)
  
COMPARISON:
  Count-based: more deterministic, ignores time
  Time-based: adapts to changing traffic rates, better for services with variable load
```

---

## 4. The Code

### ❌ Wrong Way — Catch and Retry Forever

```java
// ❌ WRONG: Infinite retry without circuit breaker
@Service
public class PaymentServiceClient {

    public PaymentResult processPayment(PaymentRequest request) {
        int retries = 0;
        while (true) {  // ❌ Infinite loop — will never stop if service is permanently down
            try {
                return externalPaymentGateway.charge(request);
            } catch (Exception e) {
                retries++;
                // ❌ No limit on retries, no circuit state, no fast-fail
                // ❌ Each retry holds the calling thread for the full timeout duration
                // ❌ Under load: all threads blocked here → cascading failure
                try {
                    Thread.sleep(1000);  // ❌ Blocking sleep in service thread
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }
    }
}
```

---

### ✅ Right Way — Resilience4j Circuit Breaker

```yaml
# application.yml — Circuit breaker configuration
resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        # Sliding window: COUNT_BASED (last 100 calls) or TIME_BASED (last 60 seconds)
        slidingWindowType: COUNT_BASED
        slidingWindowSize: 100
        
        # Open circuit when >= 50% of last 100 calls fail
        failureRateThreshold: 50
        
        # Also open when >= 80% of calls are slower than slowCallDurationThreshold
        slowCallRateThreshold: 80
        slowCallDurationThreshold: 2000ms   # 2 seconds = "slow call"
        
        # Don't evaluate until at least 20 calls have been recorded
        # Prevents opening on 1 failure during startup (1/1 = 100% failure rate)
        minimumNumberOfCalls: 20
        
        # How long to stay in OPEN state before probing
        waitDurationInOpenState: 30s
        
        # How many calls to allow through in HALF-OPEN state
        permittedNumberOfCallsInHalfOpenState: 5
        
        # Automatically transition from OPEN to HALF-OPEN (don't wait for a call to trigger it)
        automaticTransitionFromOpenToHalfOpenEnabled: true
        
        # Record these exceptions as failures (add expected business exceptions as successes)
        recordExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
          - feign.FeignException
        
        # Don't count these as failures (business errors — not infrastructure failures)
        ignoreExceptions:
          - com.example.payments.InsufficientFundsException
          - com.example.payments.InvalidCardException

  # Retry: complements circuit breaker — retries before recording failure
  retry:
    instances:
      paymentService:
        maxAttempts: 3
        waitDuration: 500ms
        exponentialBackoffMultiplier: 2    # 500ms → 1000ms → 2000ms
        retryExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
        ignoreExceptions:
          - com.example.payments.InsufficientFundsException
```

```java
// Payment service with circuit breaker and fallback
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final ExternalPaymentGatewayClient gatewayClient;
    private final PaymentCacheService cacheService;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    // ✅ @CircuitBreaker wraps this method
    // If circuit is OPEN: fallbackMethod is called instead (no downstream call)
    // If circuit is CLOSED: normal execution; failures are tracked for threshold
    // @Retry applies BEFORE @CircuitBreaker counts the failure
    @CircuitBreaker(name = "paymentService", fallbackMethod = "processPaymentFallback")
    @Retry(name = "paymentService")
    public PaymentResult processPayment(String userId, PaymentRequest request) {
        log.info("Processing payment via gateway. userId={} amount={}", userId, request.amount());

        PaymentResult result = gatewayClient.charge(
            GatewayChargeRequest.builder()
                .amount(request.amount())
                .currency(request.currency())
                .paymentMethodId(request.paymentMethodId())
                .idempotencyKey(request.idempotencyKey())
                .build()
        );

        log.info("Payment successful. paymentId={}", result.getPaymentId());
        return result;
    }

    // ✅ Fallback: called when circuit is OPEN (or all retries exhausted)
    // Fallback parameter signature must match the primary method + the throwable
    // MUST NOT throw — always return something (even a degraded response)
    private PaymentResult processPaymentFallback(String userId, PaymentRequest request, Throwable ex) {
        log.warn("Circuit OPEN — using fallback for userId={} reason={}",
            userId, ex.getClass().getSimpleName());

        // Fallback strategy depends on operation type:
        // For a payment: cannot silently succeed — return clear failure
        // For recommendations: return cached/default — silent degradation ok
        
        // Check circuit breaker state for better user messaging
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("paymentService");
        CircuitBreaker.State state = cb.getState();

        if (state == CircuitBreaker.State.OPEN) {
            // Payment gateway is currently unavailable (circuit breaker tripped)
            return PaymentResult.failed(
                "GATEWAY_UNAVAILABLE",
                "Payment system is temporarily unavailable. Please try again in 30 seconds.",
                true  // isRetryable = true
            );
        }

        // Specific gateway error — pass through meaningful message
        return PaymentResult.failed(
            "PAYMENT_FAILED",
            "Unable to process payment at this time. Please try again.",
            true
        );
    }

    // Expose circuit breaker health for monitoring
    public CircuitBreakerHealthInfo getCircuitBreakerHealth() {
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("paymentService");
        CircuitBreaker.Metrics metrics = cb.getMetrics();
        return new CircuitBreakerHealthInfo(
            cb.getState().toString(),
            metrics.getFailureRate(),
            metrics.getSlowCallRate(),
            metrics.getNumberOfSuccessfulCalls(),
            metrics.getNumberOfFailedCalls()
        );
    }
}
```

### Spring Cloud Gateway — CircuitBreaker Filter

```java
// Gateway-level circuit breaker: trip before requests reach services
// Configured in application.yml for Spring Cloud Gateway routes

// application.yml:
// spring:
//   cloud:
//     gateway:
//       routes:
//         - id: recommendation-service
//           uri: lb://recommendation-service
//           predicates:
//             - Path=/api/v1/recommendations/**
//           filters:
//             - name: CircuitBreaker
//               args:
//                 name: recommendationCB
//                 fallbackUri: forward:/fallback/recommendations
//
//         - id: payment-service
//           uri: lb://payment-service
//           predicates:
//             - Path=/api/v1/payments/**
//           filters:
//             - name: CircuitBreaker
//               args:
//                 name: paymentCB
//                 fallbackUri: forward:/fallback/payment-unavailable
//                 statusCodes:
//                   - 503
//                   - 504
//                   - 500

// Fallback controller — returns degraded response when circuit is open
@RestController
@RequestMapping("/fallback")
public class GatewayFallbackController {

    // When recommendation service circuit is open: return empty recommendations
    @GetMapping("/recommendations")
    public ResponseEntity<Map<String, Object>> recommendationFallback() {
        return ResponseEntity.ok(Map.of(
            "recommendations", List.of(),  // Empty list — UI shows nothing, doesn't break
            "degraded", true,
            "message", "Recommendations are temporarily unavailable"
        ));
    }

    // When payment service circuit is open: return clear error with retry guidance
    @PostMapping("/payment-unavailable")
    public ResponseEntity<Map<String, Object>> paymentFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
            "error", "PAYMENT_GATEWAY_UNAVAILABLE",
            "message", "Payment service is temporarily unavailable. Please retry in 30 seconds.",
            "retryAfter", 30,
            "degraded", true
        ));
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — State Transitions
**Interviewer asks:** "Walk me through the three states of a circuit breaker and when each transition happens."

**Hruday's answer:**
> CLOSED is the default state — normal operation. Every request passes through to the downstream service. The circuit breaker records each call outcome. When the failure rate among the last N calls (COUNT_BASED window) or within the last N seconds (TIME_BASED window) exceeds the configured threshold — say 50% — the circuit transitions to OPEN.
>
> OPEN means fail-fast. The circuit breaker short-circuits every call immediately, without making any downstream call, and invokes the fallback. This is why circuit breakers prevent cascading failure: each blocked call takes microseconds instead of 30 seconds of timeout. Thread pool stays available for other requests.
>
> After the configured wait duration (say 30 seconds), the circuit transitions to HALF-OPEN. In HALF-OPEN, a small number of probe calls are allowed through (say 5 calls). The rest are still fast-failed. If the probe calls succeed (failure rate below threshold among those 5): assume recovery → transition back to CLOSED. If probes fail: downstream is still down → go back to OPEN and wait another 30 seconds.
>
> The key nuance candidates miss: `minimumNumberOfCalls`. During startup or after a period of no traffic, even 1 failure out of 1 call would be 100% failure rate — the circuit would open immediately on a single transient error. The `minimumNumberOfCalls` ensures the circuit doesn't open until enough calls have been recorded to make the failure rate statistically meaningful — typically 20-50 calls.

---

### Q2 — Fallback Design
**Interviewer asks:** "What does your fallback method do when the payment service circuit is open?"

**Hruday's answer:**
> For payment-critical operations, the fallback must be honest — it cannot silently pretend a payment went through. The fallback returns a clear, actionable error response: "Payment service is temporarily unavailable. Please try again in 30 seconds." The response includes `retryAfter: 30` and `degraded: true` so the frontend can show a clear message with a countdown timer instead of a generic error.
>
> The fallback for non-critical operations is different. For the recommendation service fallback: return an empty list. The UI shows "recommendations not available" or simply nothing — the shopping experience works, just without personalised recommendations. The degradation is silent and the user can still complete their purchase.
>
> Two rules I always follow: one, the fallback method must never throw an exception. If the fallback itself fails, Resilience4j will propagate the fallback exception — which loses the original circuit-breaker failure context. Fallback must always return a value. Two, fallbacks must be fast. If the fallback itself makes a network call (say, to a recommendation cache service), that call needs its own circuit breaker. Nested network calls in fallbacks are a common source of secondary cascading failures.

---

### Q3 — Circuit Breaker vs Retry
**Interviewer asks:** "What's the relationship between retry and circuit breaker in Resilience4j?"

**Hruday's answer:**
> They're complementary patterns that work at different time scales and failure types. Retry handles transient failures: a network hiccup that lasts 100ms, a momentary database connection drop that resolves in 200ms. Retry tries the same call up to N times with exponential backoff, hoping the transient issue resolves. It makes sense for short-lived failures that self-heal.
>
> Circuit breaker handles sustained failures: a downstream service that's been down for 30+ seconds or is consistently timing out. It doesn't make sense to retry 3 times against a service that's clearly down — each retry add 30 seconds of waiting. The circuit breaker detects the sustained failure pattern and opens, stopping retries at the circuit level.
>
> In Resilience4j, when you compose them, the Retry runs inside the Circuit Breaker. The call order: circuit breaker checks first (is circuit OPEN? → fast fail). If CLOSED or HALF-OPEN: retry logic runs (3 attempts with backoff). Each attempt result is reported to the circuit breaker's sliding window. If 3 retries all fail: the circuit breaker records that as one failure event against the threshold. Once enough calls fail their retries, the circuit opens.
>
> Think of it as: retry = "try a few more times before giving up on this one call." Circuit breaker = "after many calls have been failing their retries, stop trying for the next 30 seconds."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Circuit breaker prevents retries" | "The circuit breaker stops retries" | "Circuit breaker and retry are different concerns. Circuit breaker does not prevent retry — it's applied at a different level. When circuit is CLOSED, retry is active (each failure is retried N times before being counted as a circuit breaker failure). When circuit is OPEN, the circuit breaker short-circuits immediately — there are no retries because no call is made at all. The circuit breaker prevents the entire call from being attempted; it doesn't interact with the retry count of individual calls. In Resilience4j: `@Retry` + `@CircuitBreaker` on the same method — Retry runs inside the CircuitBreaker. When the circuit opens, subsequent calls don't reach Retry at all — they're failed at the CircuitBreaker boundary." |
| "One circuit breaker for all downstream services" | "I'll add one circuit breaker annotation at the service level" | "Circuit breakers must be per downstream dependency, not per service. If Payment Service calls both the payment gateway AND a fraud detection service, a single circuit breaker on the payment method would wrongly open (blocking both) when only the fraud service is slow. Bulkhead + circuit breaker per dependency: `@CircuitBreaker(name='paymentGateway')` on the gateway call, `@CircuitBreaker(name='fraudService')` on the fraud call. Each has its own metrics window, failure threshold, and fallback. When fraud service is slow: open that specific circuit, fall back to 'allow with monitoring' behaviour. Payment gateway stays fully operational. Never conflate multiple dependencies under a single circuit breaker — you lose the isolation that makes circuit breakers valuable." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we integrated with an external SAP RFC (Remote Function Call) endpoint for real-time financial document validation. This RFC endpoint was known to have instability during peak batch windows. We wrapped the RFC call in a Resilience4j circuit breaker with a TIME_BASED sliding window of 60 seconds, failure rate threshold of 50%, and slowCallDurationThreshold of 3 seconds (RFC calls should finish in under 1 second normally). During batch windows when the RFC endpoint started degrading — calls at 4-5 seconds, 30% failing — the circuit opened after about 45 seconds of this pattern. The fallback: queue the document for async validation instead of real-time. The documents were still processed, just with a validation timestamp 2-5 minutes later. This saved the system from thread pool exhaustion during the batch windows that previously caused P1 incidents every month-end."

---

## 8. Scale Evolution

**Simple service →** `@CircuitBreaker` annotation on internal service classes. Application.yml config. Fallback method adjacent to the primary method. Micrometer metrics auto-collected by Resilience4j starter.

**Microservices →** Circuit breakers exposed as Spring Actuator health endpoints: `/actuator/health/circuitBreakers` shows state of all circuit breakers. Prometheus alerts on `resilience4j_circuitbreaker_state{state="open"}` — alert if any circuit stays open > 2 minutes. Gateway-level circuit breakers (Spring Cloud Gateway `CircuitBreakerFilter`) stop traffic before it reaches failing services.

**Multi-layer circuit breakers →** API Gateway circuit breaker (stops all traffic to a service) + Service-level circuit breakers (per dependency within a service). Example: Gateway CB for Recommendation Service as a whole; inside Recommendation Service, individual CBs for ML Model API, Product Catalog DB, User History API. Failure in ML Model API opens that specific breaker, falls back to static recommendations; other dependencies continue normally.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment gateway integrations (Visa, Mastercard, bank APIs) have instability. Circuit breaker prevents one bank's downtime from cascading to affect all users. Fallback: queue payment for async retry with status page update. | "Razorpay integrates with 50+ banks. If State Bank of India's API goes down, how do you ensure PhonePe/Razorpay users of other banks are not affected?" |
| Swiggy / Meesho | Recommendation service is non-critical — circuit breaker opens, fallback returns empty. Order service is critical — circuit breaker fallback returns queue-and-retry. Flash sales: circuit breakers protect inventory service from recommendation service instability cross-contamination. | "During a Meesho flash sale, the recommendation engine becomes overloaded. How do you ensure checkout and payment flows remain unaffected?" |
| Adobe / Microsoft | Creative asset processing pipeline — if the AI upscaling service times out, circuit breaker stops the timeout cascade, fallback returns the original asset without upscaling. GitHub Actions uses circuit breakers for build runner dependencies. | "Adobe's AI image processing service becomes slow under load. How do you prevent this latency from blocking the main asset saving and sharing flow?" |
| SAP Labs (current) | External system integrations (SAP RFC, external ERP APIs) are classic circuit breaker use cases. Month-end close batch window instability. SAP Resilience4j integration in Spring Cloud microservices patterns. | "SAP's RFC endpoint becomes unstable during batch processing windows. How do you design the integration so that instability in the RFC doesn't block the main application UI?" |

---

## 10. Related Topics — What to Study Next

- **Topic 75 — Resilience4j in Depth** — the annotations, configuration properties, and metrics for all five Resilience4j patterns (circuit breaker, retry, rate limiter, bulkhead, time limiter); this topic covered the concept; that topic covers the full implementation details including metric endpoints, actuator health integration, and per-instance configuration
- **Topic 139 — Graceful API Degradation** — the flip side of circuit breaker: while circuit breaker detects failure and opens, graceful degradation defines what quality of response the system provides when it cannot deliver full functionality; the fallback method content is the degradation strategy
- **Topic 136 — API Gateway** — Spring Cloud Gateway's `CircuitBreakerGatewayFilter` applies circuit breaker logic at the network edge before requests reach any service, providing a coarser level of protection that complements fine-grained service-level circuit breakers
- **Topic 72 — Bulkhead Pattern** — bulkhead and circuit breaker are companion patterns; bulkhead limits concurrent calls (prevents resource exhaustion by design); circuit breaker stops calls when failure rate is high (reacts to failure); together they form the full isolation strategy for microservice dependencies

---

*Part 7 · Circuit Breaker at API Level · Full Stack Interview Guide · Hruday D · 2026*
