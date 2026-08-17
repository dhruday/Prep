# 202. Fail Fast vs Fail Safe

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Fail Fast** and **Fail Safe** are two opposing design philosophies for how a system should behave when it encounters an error, invalid state, or unexpected condition. Understanding when to apply each is a mark of engineering maturity.

**Fail Fast:**
- When an error is detected, **stop immediately** and report clearly — don't proceed with invalid state
- Make failures visible, loud, and early
- Like a circuit breaker: trip early to prevent further damage

**Fail Safe:**
- When an error occurs, **continue operating gracefully** in a degraded but safe mode
- Maintain partial functionality, protect user experience, prevent data loss
- Like a car that brakes automatically when a sensor fails — safe default behavior

**Why both exist:**
- Some failures should halt execution — proceeding would corrupt data or produce incorrect results
- Some failures should degrade gracefully — user experience matters more than completeness
- The right choice depends on what is at risk: **data integrity vs. availability**

**Role in large-scale distributed systems:**
- Fail fast at validation boundaries prevents garbage from entering the system
- Fail safe at service boundaries prevents cascading failures during partial outages
- Both are necessary; the art is knowing which to apply where

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Fail Fast: When and Why

#### Scenario 1: Startup Validation

```java
// ✅ Fail fast at startup — misconfiguration detected before serving traffic
@Component
public class PaymentGatewayConfig {
    private final String apiKey;

    public PaymentGatewayConfig(@Value("${payment.api-key}") String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                "FATAL: payment.api-key is not configured. Service cannot start."
            );
        }
        this.apiKey = apiKey;
    }
}
```

Without fail fast: service starts, serves 10,000 requests, fails on payment for all of them.

#### Scenario 2: Object Construction Invariants

```java
// ✅ Reject invalid objects at construction time
public class Money {
    private final long amountInCents;
    private final Currency currency;

    public Money(long amountInCents, Currency currency) {
        if (amountInCents < 0) throw new IllegalArgumentException("Amount cannot be negative");
        if (currency == null)  throw new NullPointerException("Currency is required");
        this.amountInCents = amountInCents;
        this.currency = currency;
    }
}
// A Money object can NEVER be in invalid state.
```

#### Scenario 3: Domain State Precondition

```java
// ✅ Fail fast when a required state precondition is violated
public void ship(Order order) {
    if (order.getStatus() != OrderStatus.CONFIRMED) {
        throw new IllegalStateException(
            "Cannot ship order " + order.getId() + " in status " + order.getStatus()
        );
    }
    // proceed — state is valid
}
```

#### When to Choose Fail Fast

| Situation | Reason |
|---|---|
| Configuration missing at startup | Can't function; surface immediately |
| Required preconditions violated | Proceeding produces incorrect results or corrupts data |
| API input violates the contract | Reject immediately with 400/422; don't partially process |
| Domain invariant violated | Object is in impossible state; stop to prevent data corruption |
| Programming errors (NullPointer, ClassCast) | These are bugs — they should fail loudly, not be swallowed |

---

### Fail Safe: When and Why

#### Scenario 1: Graceful Degradation in API Response

```java
// ✅ Fail safe: recommendations service is down — return empty list, not an error
public ProductDetailResponse getProductDetail(String productId) {
    Product product = productRepository.findById(productId)
        .orElseThrow(() -> new NotFoundException("Product not found"));

    List<Product> recommendations;
    try {
        recommendations = recommendationService.getRelated(productId);
    } catch (RecommendationServiceException e) {
        log.warn("Recommendation service unavailable — degrading gracefully", e);
        recommendations = Collections.emptyList();  // safe default
    }

    return ProductDetailResponse.of(product, recommendations);
}
```

#### Scenario 2: Circuit Breaker as Fail Safe Mechanism

```java
// ✅ Resilience4j Circuit Breaker
@CircuitBreaker(name = "inventoryService", fallbackMethod = "defaultInventory")
public InventoryStatus checkInventory(String productId) {
    return inventoryClient.getStatus(productId);
}

private InventoryStatus defaultInventory(String productId, Exception e) {
    log.warn("Inventory service down — returning safe default for product {}", productId);
    return InventoryStatus.UNKNOWN;  // don't block purchase, check later
}
```

#### Scenario 3: Feature Flags with Safe Defaults

```java
// ✅ If feature flag service is unavailable, use safe defaults
public boolean isFeatureEnabled(String featureName) {
    try {
        return featureFlagService.isEnabled(featureName);
    } catch (FeatureFlagServiceException e) {
        log.warn("Feature flag service unavailable — defaulting to OFF for {}", featureName);
        return false;  // safe default: don't enable experimental features
    }
}
```

#### When to Choose Fail Safe

| Situation | Reason |
|---|---|
| Non-critical enrichment service fails | Core functionality should remain available |
| Recommendations / personalization down | Show content without personalization |
| Analytics event fails to send | User experience should not be impacted |
| Feature flag service is down | Default to conservative (safe) behavior |

---

### The Critical Distinction: Data Integrity vs. Availability

```
                    ┌──────────────────────────────────┐
                    │   What is the cost of proceeding? │
                    └──────┬───────────────────────────┘
                           │
              ┌────────────┴───────────────┐
              │                            │
   Data corruption /                   Poor UX /
   Incorrect results                   Partial service
              │                            │
              ▼                            ▼
         FAIL FAST                    FAIL SAFE
  (stop, report the error)     (degrade, preserve core function)
```

- **Financial systems:** Fail fast on invalid transactions — incorrect money movement is unacceptable
- **E-commerce:** Fail safe on recommendations — don't block purchase for a non-critical feature
- **Authentication:** Fail fast on token signing errors — a misconfigured JWT system must NOT silently issue bad tokens
- **Search:** Fail safe — return empty results rather than an error page if the search service is slow

---

### Special Case: Fail Closed vs Fail Open (Security Context)

When a security gate fails:

| Approach | Behavior | When to Use |
|---|---|---|
| **Fail Closed** | Deny access when auth service is unavailable | High-security: payments, admin panels |
| **Fail Open** | Allow access when auth service is unavailable | Low-risk: viewing a public product page |

```java
// Fail closed — deny when authorization check can't complete
public boolean isAuthorized(String userId, String resource) {
    try {
        return authService.check(userId, resource);
    } catch (AuthServiceException e) {
        log.error("Auth service unavailable — failing CLOSED for security");
        return false;  // deny access — safe default for security
    }
}
```

---

### Patterns in Spring Boot

**Fail fast at startup:**
```java
@Component
public class StartupValidator implements ApplicationRunner {
    @Override
    public void run(ApplicationArguments args) throws Exception {
        validateDatabaseConnection();
        validateExternalServiceHealth();
        // If any check fails: throw → Spring Boot exits with non-zero code
    }
}
```

**Fail safe with Resilience4j:**
```java
@Service
public class UserProfileService {
    @CircuitBreaker(name = "profileService", fallbackMethod = "fallbackProfile")
    @TimeLimiter(name = "profileService")
    public CompletableFuture<UserProfile> fetchProfile(String userId) {
        return CompletableFuture.supplyAsync(() -> profileClient.fetch(userId));
    }

    private CompletableFuture<UserProfile> fallbackProfile(String userId, Throwable t) {
        return CompletableFuture.completedFuture(UserProfile.anonymous());
    }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

**Fail fast performance:**
- Guard clause exception creation: ~1–10ms — negligible for validation paths
- Startup validator: runs once; no QPS impact

**Fail safe circuit breaker metrics:**
- OPEN state: requests fail immediately (~0.1ms for fallback) — prevents thread pool exhaustion
- Without circuit breaker at 10,000 QPS with 5s timeout downstream: 10,000 × 5s = 50,000 thread-seconds wasted
- With circuit breaker: trips after N failures → fallback in 0.1ms → thread pool freed

**Timeout configuration:**
```
Without timeout: 1 hung call holds a thread; 200 concurrent = thread pool saturation
With timeout (2s): at 200 concurrent → max 200 × 2s = 400 thread-seconds before recovery
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

**Fail fast in database transactions:**
- DB constraint violations (NOT NULL, UNIQUE, FK) fail fast — surface as domain errors immediately
- Don't catch `DataIntegrityViolationException` and silently ignore

**Fail safe for database reads:**
- If a secondary replica is unavailable, fail over to primary (fail safe — degraded performance, not failure)
- Read-only features can fail safely with "data temporarily unavailable" message

**Fail fast for schema migrations:**
- Validate schema on startup; reject if migration is required but not applied
- Flyway: `validateOnMigrate=true` → fail fast if migration state is unexpected

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

**The full resilience stack works together:**
```
Fail fast:        bad input caught at entry → nothing bad enters the system
Circuit breaker:  fail safe for external calls → fallback when downstream is unhealthy
Retry/backoff:    recover transient failures → fail fast after N retries
Bulkhead:         isolate thread pools → one failing service doesn't exhaust all threads
Timeout:          prevent hung calls → safe with predictable latency bound
```

- Amazon's checkout: core path (cart + payment) NEVER fails safely — it fails fast on errors
- Peripheral components (recommendations, reviews) fail safely — empty sections, not 500 errors

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- **Fail fast on security violations:** Invalid auth tokens, missing permissions → reject immediately
- **Fail closed for auth failures:** When auth service is down, deny access (not grant access)
- **Fail fast on config errors:** Missing encryption keys, invalid TLS certificates → startup rejection
- **Rate limiting:** When rate limiter data store is unavailable — document and choose policy deliberately (fail open: allow; fail closed: reject)

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Knight Capital Group (2012) — Failure to Fail Fast
- A trading algorithm deployed with a bug continued executing trades worth $440M in 45 minutes
- No fail-fast check caught the anomalous behavior early
- Result: $440M loss; company bankrupted
- Lesson: High-risk operations require trip wires (fail fast checks) at multiple levels

### Amazon's Dependency Isolation (Fail Safe)
- Amazon's product pages are composed of many services: cart, recommendations, reviews, promotions
- Core path (cart + checkout) fails fast on errors — never silently proceeds
- Peripheral components fail safely — show empty sections rather than full page errors

### Netflix's Chaos Engineering (Fail Safe Validation)
- Netflix kills services in production to validate fail-safe fallbacks
- Each service must have a tested, validated fallback for when dependencies fail
- Fail fast is validated at startup; fail safe is validated by chaos experiments

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "Fail fast and fail safe are complementary strategies. Fail fast means: detect errors at the earliest possible point and surface them loudly — reject invalid input at creation, validate configuration at startup, throw immediately when an invariant is violated. This prevents garbage from propagating. Fail safe means: when a non-critical dependency fails, degrade gracefully rather than bringing the whole operation down. I use fail fast at trust boundaries and for invariant enforcement; fail safe at external service boundaries with circuit breakers and fallbacks. For security decisions, I almost always fail closed — deny access rather than allow when auth checks can't complete."

### Common Follow-Up Questions

1. **"Should rate limiting fail open or fail closed?"** → Depends on the risk. API with billing limits: fail closed (protect from overcharge). Public CDN: fail open (availability over strict enforcement). Document the choice explicitly.
2. **"How do you decide between fail fast vs fail safe?"** → Ask: "What is the cost of proceeding with this error?" Corrupts data / incorrect results → fail fast. Reduces quality → fail safe.
3. **"What is fail closed on a circuit breaker?"** → A closed circuit allows requests through (healthy). An open circuit blocks requests (tripped). "Fail closed" in security means the blocking/denying state.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Combined Architecture: Fail Fast + Fail Safe

```
Incoming Request
        │
        ▼
┌───────────────────┐
│ Input Validation   │ ← FAIL FAST: reject invalid input (400/422)
└────────┬──────────┘
         │ (validated)
         ▼
┌───────────────────┐
│ Business Logic     │ ← FAIL FAST: invariant violations throw immediately
└────────┬──────────┘
         │
         ▼
┌───────────────────┐    ┌─────────────────────┐
│ External Service   │────│ Circuit Breaker      │ ← FAIL SAFE: fallback if down
│ (payment, profile) │    │ + Fallback method    │
└────────────────────┘   └─────────────────────┘
         │
         ▼
┌───────────────────┐
│ Response Builder   │ ← FAIL SAFE: missing optional data → default/empty
└───────────────────┘
```

### Decision Matrix

```
                              Critical path?
                    ┌─────────────────────────────┐
                    │ YES              │ NO        │
────────────────────┼─────────────────────────────┤
Error corrupts data │ FAIL FAST        │ FAIL FAST │
Error reduces quality│ FAIL FAST       │ FAIL SAFE │
Auth/security error │ FAIL CLOSED      │ FAIL CLOSED (if any doubt) │
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

**Why fail fast matters:**
- Early detection prevents corrupt state from propagating, making debugging impossible
- Startup validation prevents entire classes of production incidents
- Invariant enforcement makes the system's guarantees explicit and trustworthy

**Why fail safe matters:**
- Distributed systems have partial failures as a normal operating condition
- User experience is more important than completeness for non-critical features
- Graceful degradation is often the difference between a minor incident and a full outage

**Key trade-offs:**
- Security: almost always fail closed — safety over availability
- Data integrity: almost always fail fast — correctness over availability
- User experience (non-critical): almost always fail safe — availability over completeness
- **Worst outcome:** silently processing invalid state — neither failing fast nor safely, just wrong
