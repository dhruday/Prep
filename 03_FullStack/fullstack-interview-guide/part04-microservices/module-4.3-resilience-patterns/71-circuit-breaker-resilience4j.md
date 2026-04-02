# Circuit Breaker Pattern — Resilience4j
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Circuit Breaker = a safety mechanism that stops calling a failing service after a threshold of failures — instead of waiting for timeouts on every call, it OPENS and returns a fallback immediately until the service recovers
- Three states: **CLOSED** (normal — calls go through), **OPEN** (service is failing — calls fail fast with fallback), **HALF_OPEN** (probe phase — allow a few test calls to see if the service has recovered)
- Why it exists: without a circuit breaker, a slow or down service causes every caller to wait for the full timeout, exhausting threads/connections → cascading failure — one bad service brings down the entire system
- **Resilience4j**: the Spring Boot 3 circuit breaker library (replaces Netflix Hystrix which is end-of-life) — annotation-based, configurable per operation, integrates with Micrometer for metrics
- Key metrics that open the circuit: failure rate % (e.g., >50% of last 100 calls failed), slow call rate % (>50% of calls took >2 seconds), minimum number of calls before evaluating (don't open after 1 failure)
- Gap to bridge: the circuit breaker is perhaps THE most important resilience pattern for Razorpay/Swiggy-type systems — understanding all three states and the half-open probing mechanism in detail is what experienced engineers know

---

## 1. One-Line Definition
A Circuit Breaker is a resilience pattern that monitors calls to an external service and "opens the circuit" — stopping further calls and immediately returning a fallback — when a failure threshold is exceeded, preventing cascading failures across a microservices system.

---

## 2. The Problem It Solves

OrderService calls PaymentService to process payment. PaymentService is experiencing high load — it takes 10 seconds to respond before timing out.

Without a circuit breaker:
1. User places order → OrderService calls PaymentService → waits 10 seconds → timeout
2. Another user places order → another call → another 10 second wait
3. 200 concurrent users → 200 threads in OrderService waiting 10 seconds each
4. OrderService's thread pool (20 threads) is exhausted
5. OrderService itself is now unresponsive to all requests
6. API Gateway gets no response from OrderService → all users see site is down
7. One slow PaymentService brought down the entire platform

This is called **cascading failure** — one service's slowness propagates up the call stack, taking down healthy services.

With a circuit breaker:
1. PaymentService starts returning errors / timing out
2. Resilience4j counts failures: 10 failures in last 100 calls = 10% failure rate
3. Failure rate exceeds 50% threshold → circuit OPENS
4. Next call to PaymentService: Resilience4j immediately throws `CallNotPermittedException` without waiting
5. OrderService's fallback runs: "Payment service temporarily unavailable. Order saved. Will retry payment in 5 minutes."
6. OrderService stays responsive — no threads waiting for PaymentService
7. After 30 seconds (wait duration in OPEN state), circuit enters HALF_OPEN
8. A few test calls are allowed through to PaymentService
9. If they succeed: circuit CLOSES. Normal operation resumes.

---

## 3. How It Works Internally

### The State Machine

```
                     ┌─────────────────────────────────────────┐
                     │                                         │
                     ▼         failure threshold exceeded       │
              ┌────────────┐ ─────────────────────────────── ┌────────────┐
              │   CLOSED   │                                  │    OPEN    │
              │  (normal)  │                                  │ (fail fast)│
              └────────────┘                                  └────────────┘
                     ▲                                               │
                     │         all probe calls succeed               │
                     │                                               ▼
                     │                                       ┌────────────────┐
                     └────────────────────────────────────── │  HALF_OPEN     │
                                                             │ (probe phase)  │
                         some probe calls fail               └────────────────┘
                     ┌───────────────────────────────────────────────┤
                     ▼                                               │
              ┌────────────┐                                         │
              │    OPEN    │ ◄───────────────────────────────────────┘
              └────────────┘

CLOSED:
  - All calls pass through to the real service
  - Resilience4j counts results in a sliding window (last N calls)
  - When: failure_rate% > threshold OR slow_call_rate% > threshold → OPEN

OPEN:
  - All calls immediately throw CallNotPermittedException (no actual service call)
  - Fallback logic runs immediately
  - After waitDurationInOpenState (e.g., 30 seconds) → HALF_OPEN

HALF_OPEN:
  - Only permittedNumberOfCallsInHalfOpenState calls go through (e.g., 5)
  - If all 5 succeed → CLOSED (service recovered)
  - If any fail → OPEN again (not recovered yet, wait another 30 seconds)
```

### Sliding Window Types

**Count-based window**: evaluate the last N calls. Simple. Doesn't account for time.
```
Last 100 calls: 60 successes, 40 failures → 40% failure rate → below 50% threshold → stay CLOSED
```

**Time-based window**: evaluate calls in the last N seconds. Better for bursty traffic.
```
Last 60 seconds: 5 calls total, 3 failures → 60% failure rate → exceeds 50% threshold → OPEN
```

For production: time-based window is generally preferred when traffic is variable. A service that fails for 5 calls in 1 second of low traffic should open the circuit; a count-based window might wait for 100 calls (minutes of low traffic) before opening.

---

## 4. The Code

### Dependency Configuration
```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
    <version>2.2.0</version>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

### Resilience4j Circuit Breaker Configuration
```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      paymentService:                           # Circuit breaker name — referenced in @CircuitBreaker
        registerHealthIndicator: true           # Expose state in /actuator/health
        slidingWindowType: COUNT_BASED
        slidingWindowSize: 100                  # Evaluate last 100 calls
        minimumNumberOfCalls: 20                # Don't open circuit before at least 20 calls
        failureRateThreshold: 50                # Open when >50% of last 100 calls fail
        slowCallDurationThreshold: 2000ms       # Calls taking >2s count as "slow"
        slowCallRateThreshold: 80               # Open when >80% of calls are slow
        waitDurationInOpenState: 30s            # Stay OPEN for 30s before going HALF_OPEN
        permittedNumberOfCallsInHalfOpenState: 5 # Allow 5 test calls in HALF_OPEN
        automaticTransitionFromOpenToHalfOpenEnabled: true

      inventoryService:
        slidingWindowType: TIME_BASED
        slidingWindowSize: 60                   # Evaluate last 60 seconds
        minimumNumberOfCalls: 10
        failureRateThreshold: 60
        waitDurationInOpenState: 60s            # Inventory can have longer recovery window

  # Fallback for when circuit is OPEN — return immediately without waiting
  timelimiter:
    instances:
      paymentService:
        timeoutDuration: 2s                     # Force timeout after 2s even if no Resilience4j timeout
```

### Service Implementation with Circuit Breaker
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceClient {

    private final WebClient paymentWebClient;
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final FallbackPaymentService fallbackPaymentService;

    // METHOD 1: Annotation-based — simple, clean, declarative
    @CircuitBreaker(name = "paymentService", fallbackMethod = "processPaymentFallback")
    @TimeLimiter(name = "paymentService")  // Also apply time limiter
    @Retry(name = "paymentService")        // Retry BEFORE circuit breaker counts failures
    public CompletableFuture<PaymentResult> processPayment(PaymentRequest request) {
        return paymentWebClient.post()
                .uri("/api/v1/payments")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(PaymentResult.class)
                .doOnNext(r -> log.info("Payment processed: paymentId={}", r.getPaymentId()))
                .toFuture();
    }

    // Fallback MUST have the same return type + Throwable as an extra parameter
    // Called when: circuit is OPEN, or the main method throws an exception and circuit trips
    private CompletableFuture<PaymentResult> processPaymentFallback(
            PaymentRequest request, Throwable ex) {

        if (ex instanceof CallNotPermittedException) {
            log.warn("Payment circuit OPEN for orderId={} — using fallback",
                     request.getOrderId());
        } else {
            log.error("Payment service error for orderId={}: {}",
                      request.getOrderId(), ex.getMessage());
        }

        // Fallback strategy: save request for async retry — do not fail the order
        return fallbackPaymentService.queueForRetry(request);
    }
}
```

### Programmatic Circuit Breaker (More Control)
```java
@Service
public class InventoryServiceClient {

    private final CircuitBreaker inventoryCircuitBreaker;
    private final WebClient inventoryWebClient;

    public InventoryServiceClient(CircuitBreakerRegistry registry, WebClient inventoryWebClient) {
        this.inventoryCircuitBreaker = registry.circuitBreaker("inventoryService");
        this.inventoryWebClient = inventoryWebClient;

        // Register event listeners for observability
        this.inventoryCircuitBreaker.getEventPublisher()
            .onStateTransition(event ->
                log.info("CircuitBreaker '{}' state: {} → {}",
                         event.getCircuitBreakerName(),
                         event.getStateTransition().getFromState(),
                         event.getStateTransition().getToState()))
            .onError(event ->
                log.warn("CircuitBreaker '{}' recorded error: {}",
                         event.getCircuitBreakerName(), event.getThrowable().getMessage()));
    }

    public StockCheckResult checkStock(String productId, int quantity) {
        // Decorator pattern — wraps the actual call with circuit breaker logic
        Supplier<StockCheckResult> stockCheckSupplier = CircuitBreaker.decorateSupplier(
            inventoryCircuitBreaker,
            () -> inventoryWebClient.get()
                    .uri("/api/v1/inventory/{productId}?qty={qty}", productId, quantity)
                    .retrieve()
                    .bodyToMono(StockCheckResult.class)
                    .block(Duration.ofMillis(2000))
        );

        // Try supplier — if circuit OPEN, throws CallNotPermittedException
        return Try.ofSupplier(stockCheckSupplier)
                  .recover(CallNotPermittedException.class,
                           ex -> StockCheckResult.optimistic(productId, quantity))  // Circuit open fallback
                  .recover(Exception.class,
                           ex -> StockCheckResult.unknown(productId, ex.getMessage())) // Service error fallback
                  .get();
    }
}
```

### Exposing Circuit Breaker State in Health Check
```java
// The circuit breaker state appears in /actuator/health automatically
// when registerHealthIndicator: true is configured

// Custom endpoint to get all circuit breaker states (useful for operations dashboard)
@RestController
@RequestMapping("/internal/circuit-breakers")
public class CircuitBreakerStatusController {

    private final CircuitBreakerRegistry registry;

    @GetMapping
    public Map<String, CircuitBreakerStateDto> getAllStates() {
        return registry.getAllCircuitBreakers().stream()
                .collect(Collectors.toMap(
                    CircuitBreaker::getName,
                    cb -> new CircuitBreakerStateDto(
                        cb.getState().name(),
                        cb.getMetrics().getFailureRate(),
                        cb.getMetrics().getSlowCallRate(),
                        cb.getMetrics().getNumberOfFailedCalls(),
                        cb.getMetrics().getNumberOfSuccessfulCalls()
                    )
                ));
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a circuit breaker and why do microservices need one?"

**Hruday's answer:**
> A circuit breaker is a resilience mechanism that monitors calls to a downstream service and stops sending requests when the service is failing. Instead of waiting for a timeout on every call to a broken service — which exhausts your thread pool and causes cascading failures — the circuit breaker "opens" and returns a fallback response immediately.
>
> Microservices need circuit breakers because of the cascading failure problem. If OrderService calls PaymentService and PaymentService is slow — say it takes 8 seconds before timing out — every thread handling an order request in OrderService is blocked for 8 seconds waiting for PaymentService. With 200 concurrent order requests and a thread pool of 20, all 20 threads are blocked. OrderService becomes unresponsive. The API Gateway times out waiting for OrderService. The entire platform appears down.
>
> The circuit breaker prevents this chain: after 50% of the last 100 calls fail, the circuit opens. Subsequent calls to PaymentService return immediately with a fallback (maybe queue the payment for retry). No threads are blocked. OrderService stays healthy. Only the payment path is degraded — not the entire system.

---

### Q2 — Deep Dive
**Interviewer asks:** "Walk me through the three states of a circuit breaker and how it decides to transition."

**Hruday's answer:**
> There are three states — CLOSED, OPEN, and HALF_OPEN.
>
> CLOSED is normal operation. All calls go through to the real service. Resilience4j maintains a sliding window of the last N calls (count-based) or calls in the last N seconds (time-based) and tracks success and failure rates. As long as the failure rate stays below the threshold — say 50% — the circuit stays CLOSED.
>
> When the failure rate exceeds the threshold AND the minimum number of calls has been made (important — don't open the circuit after just 1 failure on low traffic), the circuit OPENS. In OPEN state, any call that arrives immediately throws a `CallNotPermittedException` without actually contacting the downstream service. This is the "fail fast" behaviour that protects the caller's thread pool.
>
> After the configured wait duration (say 30 seconds), the circuit transitions to HALF_OPEN. This is the probe state. A limited number of test calls (say 5) are allowed through to the real service. If all 5 succeed, the circuit CLOSES — the service has recovered. If any of those 5 fail, the circuit goes back to OPEN and waits another 30 seconds before probing again.
>
> The half-open probe mechanism is what prevents the circuit from blindly opening and never recovering. Without it, a circuit that opened would stay open forever — you'd need a manual reset. The probe mechanism makes recovery automatic.

---

### Q3 — Configuration Judgment
**Interviewer asks:** "How do you set the threshold and timing for a circuit breaker in production?"

**Hruday's answer:**
> The settings depend on the downstream service's SLA and how critical the call is.
>
> Failure rate threshold: I base it on the downstream service's normal error rate + a buffer. If PaymentService normally returns errors for 2% of calls (invalid card, insufficient funds — expected business errors), setting the circuit breaker threshold to 50% means it only opens under genuine system failures, not normal business errors. I'd also distinguish exception types — `PaymentValidationException` is a business error, should not count toward circuit breaker failure rate. `SocketTimeoutException` and `ConnectException` are infrastructure failures that should count.
>
> Minimum calls: I set this high enough to avoid false positives during low traffic. On a quiet Sunday morning, 3 out of 3 calls failing should not open the circuit — maybe it's just coincidence. Set minimum to at least 10-20 calls before the circuit can open.
>
> Wait duration in OPEN: proportional to how long it typically takes the failing service to recover. If PaymentService's typical recovery after an incident is 2-3 minutes, I'd start with 60 seconds and tune. Too short: the circuit yo-yos between OPEN and HALF_OPEN, creating noise. Too long: the circuit stays OPEN even after the service recovers, causing unnecessary degradation.
>
> Slow call threshold: set to the 99th percentile latency of the downstream service under normal load. If PaymentService's p99 is 500ms, consider calls over 2 seconds as "slow." Configuring this conservatively avoids false positives from momentary load spikes.

---

### Q4 — Fallback Design
**Interviewer asks:** "What happens when the circuit breaker opens for PaymentService? What fallback do you implement?"

**Hruday's answer:**
> The fallback strategy depends entirely on the business criticality of the operation. Payment is critical — you cannot complete an order without payment. But you CAN decouple the payment processing from the order placement.
>
> The fallback for PaymentService open circuit: save the order as `PAYMENT_PENDING` in the database and publish a `PaymentRetryRequired` event to a Kafka dead-letter-style topic. Return 201 Created to the user with a message like "Your order is confirmed. Payment is being processed." A separate background process — PaymentRetryService — consumes from this topic and retries the payment when PaymentService recovers.
>
> This requires careful UX handling: the user sees "processing" not "failed." If payment ultimately fails after retries, the order is cancelled and the user is notified. This is eventually consistent payment processing — not ideal for all scenarios, but it prevents lost orders during temporary payment outages.
>
> For lower-criticality operations like recommendation service: the fallback is simply returning an empty list or a default set of recommendations. The user gets a degraded experience but the core flow works.
>
> The general principle: the fallback should provide the MINIMUM viable response that keeps the user's critical flow working. It should not pretend everything is fine (silent data loss), but it should not fail the entire user operation for a non-critical component outage.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Hystrix is the circuit breaker for Spring Boot" | "Use Hystrix for circuit breaking" | "Netflix Hystrix reached end-of-life in 2018 and is no longer maintained. Spring Cloud Netflix Hystrix is officially deprecated. The replacement is Resilience4j — lighter, modular, no RxJava dependency, Spring Boot 3 native with annotation support. Mentioning Hystrix without acknowledging it's deprecated signals an outdated knowledge base." |
| "Count all exceptions as failures" | "Any exception should trip the circuit" | "Business exceptions like `ProductNotFoundException` or `PaymentDeclinedException` should NOT count as circuit breaker failures — they are expected domain responses, not service health issues. Only infrastructure exceptions (connection refused, timeout, 5xx HTTP status) should contribute to the failure rate. Configure Resilience4j's `ignoreExceptions` and `recordExceptions` to distinguish them." |
| "One circuit breaker for the whole service" | "Add one circuit breaker to all PaymentService calls" | "Different operations on the same service can have very different SLAs and criticality. A read operation (GET payment details) should have a different circuit breaker configuration than a write operation (POST charge). And you might want a circuit breaker for PaymentService's fraud detection endpoint (non-critical, tolerate open circuit) vs its charge endpoint (critical, aggressive recovery)." |
| "Circuit breaker eliminates the need for timeouts" | "If the circuit breaker opens, no need for a timeout" | "Circuit breakers and timeouts serve different purposes. A timeout prevents any single call from blocking indefinitely. A circuit breaker prevents many calls from being made when the service is known to be failing. You need BOTH. The timeout fires first (prevents thread exhaustion per-call). The circuit breaker counts failures and opens when the pattern is consistent." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, our procurement service called the invoice service to calculate tax for each line item. During month-end close, the invoice service was under extreme load. Without a circuit breaker, procurement orders would stall waiting for slow invoice responses — sometimes 45 seconds — and procurement's transaction coordinator would ultimately roll back the entire multi-service operation. The impact was visible to end users as 'order placement failed, please try again.' A circuit breaker on those invoice service calls would have allowed procurement to proceed with estimated tax (fallback) and queue a recalculation job — users would see 'tax pending' rather than 'order failed.' That distinction — degraded but functional vs completely failed — is exactly what circuit breakers enable and why I understand their value beyond the theoretical."

---

## 8. Scale Evolution

**Development / staging →** Add circuit breakers from day one even if they never open — they provide metrics (failure rates, latency percentiles) that help you understand your service dependencies before production incidents.

**Production, <100 RPS per circuit →** Count-based sliding window with conservative thresholds. Alerting on circuit state changes (OPEN → log + PagerDuty alert).

**Production, >1000 RPS →** Time-based sliding windows. Multiple circuit breakers per service (per-operation granularity). Circuit breaker state exposed in service mesh observability dashboard (Kiali, Envoy). Fallback quality monitored separately — "how often are we serving fallback responses?" is a key SRE metric.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment processor depends on multiple bank APIs that regularly have intermittent outages. Circuit breakers on each bank connection + fallback to a secondary payment rail is a classic resilience design. | "Bank API X is down for 5 minutes during peak. How does your payment service handle it?" |
| Swiggy / Meesho | During IPL/Navratri peak orders, recommendation service is under load. Circuit breaker lets order placement proceed with empty recommendations rather than failing the order. | "Recommendations service is slow during peak. How do you ensure order placement is unaffected?" |
| Adobe / Microsoft | Document processing pipelines call multiple downstream services. Circuit breakers on content moderation, OCR, and rendering services ensure that slow AI services don't block document saves. | "OCR service is timing out. How do you prevent document upload failures?" |
| SAP Labs (current) | SAP's integration middleware calls external ERP connectors that can be unreliable. Circuit breakers in Spring Integration / Spring Boot services protect the core SAP BTP runtime from external connector failures. | Architecture review discussions for SAP BTP extension service resilience. |

---

## 10. Related Topics — What to Study Next

- **Topic 72 — Retry with Exponential Backoff** — the pattern that works WITH circuit breakers: retry a few times before counting a failure; exponential backoff prevents retry storms that make the failing service worse
- **Topic 73 — Bulkhead Pattern** — limits the resources (thread pool or semaphore) devoted to a single downstream service, preventing one service's failures from consuming all of OrderService's threads
- **Topic 74 — Timeout Strategies** — the foundational resilience pattern that circuit breakers depend on: without timeouts, circuit breakers wouldn't have failures to count
- **Topic 75 — Graceful Degradation** — the full strategy for what to do when a circuit is open: fallback responses, partial results, and degraded-but-functional user experiences
- **Topic 71 is also the prerequisite for Topics 73, 74, 75** — circuit breaker is the master resilience pattern; bulkhead, timeout, and graceful degradation are complementary techniques

---

*Part 4 · Circuit Breaker Pattern (Resilience4j) · Full Stack Interview Guide · Hruday D · 2026*
