# Request Deduplication
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Request deduplication** ensures that the same operation is performed exactly once, even when the exact same request arrives multiple times — due to network retries, user double-clicking, or client-side retry logic. It is the infrastructure-level implementation of idempotency: recognise duplicate requests and return the same response without re-executing the operation.
- **How it works**: the client generates a unique **Idempotency Key** (UUID) for each logical operation and sends it as a request header: `Idempotency-Key: 3e8b4a2c-1f7d-...`. The server stores the key and the first response in a fast store (Redis). On the second and any subsequent requests with the same key: the server looks up the key, finds the stored response, and returns it immediately without re-processing. The operation happens exactly once regardless of how many times the request arrives.
- **Redis pattern**: `SET dedup:{idempotency-key} {serialized-response} EX 86400 NX`. `NX` = only set if not exists (atomic). Return: 1 = first time, set and process. Return: 0 = duplicate, return cached response.
- **Request deduplication vs idempotency**: idempotency is the property (calling PUT twice gives the same result naturally). Request deduplication is an implementation technique for non-naturally-idempotent operations (POST actions like payment initiation) to make them safe to retry.
- **Request deduplication vs rate limiting**: rate limiting asks "is this client making too many requests?" — it counts total volume. Deduplication asks "have I seen this specific request before?" — it matches by content identity. Different questions, different tools.
- **Real-world critical use case**: payment APIs. Razorpay and Stripe require `Idempotency-Key` on payment initiation requests. A user's internet drops after sending a payment POST — the client retries — without deduplication, the user is charged twice. With it: same key → return the first response → one charge.

---

## 1. One-Line Definition
Request deduplication detects when the same logical operation (identified by an idempotency key) arrives more than once and returns the original response without re-processing, ensuring exactly-once semantics for non-idempotent operations.

---

## 2. The Problem It Solves

### The Retry-Without-Deduplication Problem

```
SCENARIO: Swiggy order placement — mobile app retries when network is unreliable

TIMELINE WITHOUT DEDUPLICATION:

  T=0.0s  User taps "Place Order" on mobile app
  T=0.1s  App sends POST /api/orders { restaurantId: R-45, items: [...] }
  T=0.1s  Request arrives at Order Service
  T=0.2s  Order Service inserts order into DB (ORDER-001), charges payment
  T=4.0s  Response taking long (mobile network hiccup) — app timeout fires
  T=4.0s  App retries: POST /api/orders { restaurantId: R-45, items: [...] }
           (Same body, but server doesn't know it's a retry)
  T=4.1s  Order Service inserts ANOTHER order into DB (ORDER-002)
           Charges payment AGAIN
           
  USER OUTCOME:
    Two orders placed for one tap
    Payment deducted twice
    Two delivery partners dispatched
    User calls support
    Manual refund process triggered
    Support cost: ₹50-200/incident
    At Swiggy scale: 5M orders/day, even 0.01% retry rate = 500 double-orders/day
    ₹25,000/day in manual resolution cost + NPS damage
    
  ALSO PROBLEMATIC: browser button double-click
    User taps "Pay Now" on PhonePe, sees spinner
    Network slow, taps again (impatient)
    Without dedup: two payment requests reach the server
    Even 200ms between taps → two separate POST requests
    
  AND: Kafka consumer retries
    Order Service publishes to Kafka → payment processor reads event
    Network blip between Kafka and payment processor
    Payment processor processes, crashes before commit
    Kafka re-delivers the event (at-least-once guarantee)
    Without dedup: payment processed twice
    With idempotency key on the payment: second attempt hits Redis → skip → exactly once
```

---

## 3. How It Works Internally

### Deduplication Flow — State Machine

```
REQUEST ARRIVES WITH Idempotency-Key: KEY-123
                │
                ▼
         Check Redis:
         GET dedup:KEY-123
                │
         ┌──────┴──────┐
         │             │
         ▼             ▼
      HIT (key exists)  MISS (first time)
         │             │
         ▼             ▼
  Return cached    SET dedup:KEY-123 "PROCESSING" EX 86400 NX
   response            │
   immediately         ▼ (atomic: NX means only if not exists)
   [SUCCESS]      │
                  ┌────┴────┐
                  │         │
                  ▼         ▼
               SET OK    SET FAILED (race condition: concurrent request)
               (first)   Return 409 Conflict (concurrent duplicate)
                  │
                  ▼
           Execute business logic
                  │
            ┌─────┴────────┐
            │              │
            ▼              ▼
           OK            ERROR
            │              │
            ▼              ▼
  SET dedup:KEY-123    SET dedup:KEY-123
  {response payload}   {error response}
  EX 86400             EX 86400
  Return response      Return error
                       (stored so retry returns same error, 
                        not re-attempts)

TTL DESIGN:
  86400 seconds = 24 hours
  Rationale: client retry window is usually seconds to minutes
  24h gives generous coverage for delayed retries
  After 24h: key expires from Redis, next attempt treated as fresh
  
  For payment APIs: some use 7-30 days TTL
  (Stripe: 24h. Razorpay: 48h. Custom: depends on business requirements)
```

### Redis Key Design

```
KEY: dedup:{idempotency-key}
     dedup:3e8b4a2c-1f7d-4a8c-9b5e-2d7f3c1e9a4b
     
VALUE (stored response):
  {
    "statusCode": 201,
    "headers": {
      "Content-Type": "application/json",
      "Location": "/api/v1/orders/ORD-001"
    },
    "body": {
      "orderId": "ORD-001",
      "status": "PLACED",
      "total": 450.00,
      "message": "Order placed successfully"
    }
  }

PROCESSING SENTINEL (before response is ready):
  "PROCESSING"
  
  Used for in-flight requests to handle concurrent duplicates:
  T=0ms  Request A arrives: SET dedup:KEY-123 "PROCESSING" EX 30 NX → SUCCESS
  T=1ms  Request B arrives (duplicate): SET dedup:KEY-123 "PROCESSING" EX 30 NX → FAIL
  T=1ms  Request B: GET dedup:KEY-123 → "PROCESSING"
  T=1ms  Return 409 Conflict {"message": "Request is being processed. Retry later."}
  
  This prevents both requests from processing simultaneously during network splits
```

---

## 4. The Code

### ❌ Wrong Way — No Deduplication on POST endpoint

```java
// ❌ WRONG: Payment API without idempotency key support
@PostMapping("/payments/initiate")
public ResponseEntity<PaymentResponse> initiatePayment(@RequestBody InitiatePaymentRequest request) {
    // ❌ If this request arrives twice (network retry, double-click), payment is charged twice
    // ❌ No way for the server to know this is a duplicate vs a new payment
    Payment payment = paymentService.processPayment(
        request.getAmount(),
        request.getUserId(),
        request.getPaymentMethodId()
    );
    return ResponseEntity.status(201).body(PaymentResponse.from(payment));
}
```

---

### ✅ Right Way — Idempotency Key + Redis Deduplication

```java
// Deduplication service
@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotentRequestService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String KEY_PREFIX = "dedup:";
    private static final String PROCESSING_SENTINEL = "PROCESSING";
    private static final long TTL_SECONDS = 86_400L;  // 24 hours

    public record DeduplicationResult(
        boolean isFirstRequest,
        boolean isProcessing,
        String cachedResponse
    ) {}

    // Returns FIRST_REQUEST if key is new, DUPLICATE if key seen before, PROCESSING if in-flight
    public DeduplicationResult checkAndLock(String idempotencyKey) {
        String redisKey = KEY_PREFIX + idempotencyKey;

        // ✅ SETNX equivalent using SET with NX option — atomic check-and-set
        Boolean wasSet = redisTemplate.opsForValue()
            .setIfAbsent(redisKey, PROCESSING_SENTINEL, Duration.ofSeconds(TTL_SECONDS));

        if (Boolean.TRUE.equals(wasSet)) {
            // First time we've seen this key — proceed with processing
            return new DeduplicationResult(true, false, null);
        }

        // Key exists — check if it's still processing or has a completed result
        String existing = redisTemplate.opsForValue().get(redisKey);

        if (PROCESSING_SENTINEL.equals(existing)) {
            // Another thread/instance is currently processing this exact request
            return new DeduplicationResult(false, true, null);
        }

        // Key exists with a completed response — return it (duplicate request)
        return new DeduplicationResult(false, false, existing);
    }

    // Store the completed response against the idempotency key
    public void storeResponse(String idempotencyKey, Object responseBody, int statusCode) {
        String redisKey = KEY_PREFIX + idempotencyKey;
        try {
            StoredResponse stored = new StoredResponse(statusCode, responseBody);
            String serialized = objectMapper.writeValueAsString(stored);
            // ✅ Overwrite the PROCESSING sentinel with the actual response
            // Keep the same TTL window (reset to full TTL from storage time)
            redisTemplate.opsForValue().set(redisKey, serialized, Duration.ofSeconds(TTL_SECONDS));
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize response for dedup key={}", idempotencyKey, e);
        }
    }

    public record StoredResponse(int statusCode, Object body) {}
}
```

```java
// Payment controller with deduplication
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final IdempotentRequestService deduplicationService;
    private final ObjectMapper objectMapper;

    @PostMapping("/payments/initiate")
    public ResponseEntity<PaymentResponse> initiatePayment(
            // ✅ Idempotency-Key header: required for state-changing operations
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestHeader("X-User-Id") String userId,  // Set by gateway
            @Valid @RequestBody InitiatePaymentRequest request) {

        // ✅ Validate idempotency key format — must be a valid UUID to prevent injection
        if (!idempotencyKey.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) {
            return ResponseEntity.badRequest()
                .body(PaymentResponse.error("Idempotency-Key must be a valid UUID v4"));
        }

        // ✅ Scope key to user: prevents user A replaying user B's idempotency key
        String scopedKey = userId + ":" + idempotencyKey;

        DeduplicationResult dedup = deduplicationService.checkAndLock(scopedKey);

        // Duplicate request: return the original response
        if (!dedup.isFirstRequest() && !dedup.isProcessing()) {
            log.info("Duplicate payment request — returning cached response. key={}", idempotencyKey);
            try {
                IdempotentRequestService.StoredResponse stored =
                    objectMapper.readValue(dedup.cachedResponse(),
                                         IdempotentRequestService.StoredResponse.class);
                PaymentResponse cachedBody = objectMapper.convertValue(stored.body(), PaymentResponse.class);
                // ✅ Add header so client knows this was a replay (useful for debugging)
                return ResponseEntity.status(stored.statusCode())
                    .header("Idempotent-Replayed", "true")
                    .body(cachedBody);
            } catch (JsonProcessingException e) {
                log.error("Failed to deserialize cached response for key={}", idempotencyKey, e);
                // Fallback: re-process (safe because we have the idempotency key scope)
            }
        }

        // In-flight duplicate: another instance is processing the same key right now
        if (dedup.isProcessing()) {
            log.info("Concurrent duplicate payment request. key={}", idempotencyKey);
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(PaymentResponse.error("Request is already being processed. Retry after 5 seconds."));
        }

        // ✅ First request — process it
        try {
            Payment payment = paymentService.processPayment(userId, request);
            PaymentResponse response = PaymentResponse.from(payment);

            // ✅ Store the successful response so duplicates return it
            deduplicationService.storeResponse(scopedKey, response, 201);

            log.info("Payment processed successfully. paymentId={} key={}", payment.getId(), idempotencyKey);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (InsufficientFundsException e) {
            PaymentResponse errorResponse = PaymentResponse.error("Insufficient funds");
            // ✅ Store error responses too — retrying a failed payment returns the same error
            // This prevents retries from accidentally succeeding after the first attempt failed
            deduplicationService.storeResponse(scopedKey, errorResponse, 422);
            return ResponseEntity.unprocessableEntity().body(errorResponse);

        } catch (Exception e) {
            // ✅ Do NOT store unexpected errors — allow retry after infrastructure fix
            // The PROCESSING sentinel will expire, allowing the next retry to be treated as fresh
            log.error("Unexpected error processing payment. key={}", idempotencyKey, e);
            // Delete the PROCESSING lock so client can retry
            redisTemplate.delete("dedup:" + scopedKey);
            return ResponseEntity.internalServerError()
                .body(PaymentResponse.error("Internal server error. Please retry."));
        }
    }
}
```

### TypeScript Client — Generating and Sending Idempotency Key

```typescript
// ✅ Client generates a UUID per logical operation
// The key must be generated BEFORE the first attempt and reused on all retries
async function initiatePayment(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
  // Generate once per logical operation — store in memory or session storage for retries
  const idempotencyKey = crypto.randomUUID();  // Browser native — no library needed

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('/api/v1/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,  // ✅ Same key on every retry
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify(paymentRequest)
      });

      if (response.ok || response.status === 422) {
        // ✅ 201 success or 422 business error: both are deterministic — don't retry
        const data = await response.json();
        if (response.headers.get('Idempotent-Replayed') === 'true') {
          console.log('Server returned cached idempotent response');
        }
        return data;
      }

      if (response.status === 429 || response.status === 503) {
        // ✅ Retryable: rate limited or service unavailable
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '5') * 1000;
        if (attempt < MAX_RETRIES) await sleep(retryAfter);
        continue;
      }

      if (response.status === 409) {
        // In-flight duplicate — wait and retry to get the result
        await sleep(5000);
        continue;
      }

      throw new Error(`Payment failed with status ${response.status}`);
    } catch (networkError) {
      // Network error (no response received) — safe to retry with same idempotency key
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error('Payment failed after max retries');
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Explanation
**Interviewer asks:** "A user clicks 'Pay' and their mobile loses connectivity. The client retries. How do you ensure the payment is processed exactly once?"

**Hruday's answer:**
> This is the classic request deduplication (idempotency key) problem. The client generates a UUID before the first attempt — say `crypto.randomUUID()` in JavaScript. This UUID becomes the `Idempotency-Key` request header. On every retry for this same logical payment, the client sends the exact same UUID.
>
> On the server, before doing any business logic, we do an atomic check-and-set in Redis: `SET dedup:{userId}:{idempotencyKey} "PROCESSING" EX 86400 NX`. The `NX` flag means "set only if the key doesn't exist." If it returns success (key was not there), this is the first request — proceed with processing the payment. When processing completes, we replace "PROCESSING" with the serialized response in Redis so it's available for replay.
>
> When the same key arrives again (the retry), the Redis `SET NX` fails because the key exists. We read the stored value. If it's the completed response, we return it immediately without calling the payment service again. If it's still "PROCESSING" (means another instance is mid-flight), we return 409 Conflict with guidance to retry in a few seconds.
>
> Critical detail: scope the key to the user. If I use just the idempotency key as the Redis key, a malicious user could potentially replay another user's idempotency key. The Redis key should be `dedup:{userId}:{idempotencyKey}` — then user A's key only affects user A's namespace.

---

### Q2 — Edge Case
**Interviewer asks:** "What happens if the server processes the payment successfully but crashes before storing the response in Redis?"

**Hruday's answer:**
> This is the hardest edge case in deduplication. The sequence: (1) First request arrives, Redis SET NX succeeds — we own the lock. (2) Payment service processes successfully. (3) Server crashes before `storeResponse()` executes. (4) The Redis key contains "PROCESSING" sentinel. (5) Client retries after timeout.
>
> Two sub-cases: if the PROCESSING sentinel's TTL has expired (by default I set a short TTL on the processing sentinel — something like 30 seconds), the retry is treated as a fresh first request. Now we have a double-processing risk. This is the fundamental gap.
>
> The safe solution: make the underlying payment operation natively idempotent at the data layer. For payment: use the idempotency key as the primary key in the payments table — `INSERT INTO payments(id, ...) VALUES (?, ...) ON CONFLICT (id) DO NOTHING`. If the payment was inserted in step 2, the retry's INSERT does nothing (ON CONFLICT DO NOTHING). Then read the existing payment record and return it. This combines the deduplication key pattern with database-level constraint enforcement. The Redis layer is the fast path for the common case; the database constraint is the safety net for the crash-in-flight case.
>
> This is how Stripe implements it — the idempotency key is stored in the database alongside the payment record, so they have both fast Redis lookup AND permanent guarantee. I apply the same pattern at SAP Labs for financial document reprocessing scenarios.

---

### Q3 — Deduplication vs Rate Limiting
**Interviewer asks:** "What's the difference between request deduplication and rate limiting?"

**Hruday's answer:**
> Rate limiting asks: "Is this client sending too many requests in a given time period?" It counts total request volume per user per time window and rejects excess requests. The identity of each request doesn't matter — it's about volume. A user sending 101 requests in a minute when the limit is 100 gets rejected, even if all 101 are different operations.
>
> Request deduplication asks: "Have I seen this exact logical operation before?" It checks request identity (the idempotency key), not volume. A user sending 50 retries of the same payment (same idempotency key) is detected as duplicate and gets the same response back 50 times — but the business operation only executes once. The user is not rate-limited (the 50 requests go through the rate limiter, 50 is below 100/minute), but the operation deduplicates.
>
> They solve orthogonal problems and are both needed. Rate limiting is typically applied at the API Gateway — before reaching the service. Request deduplication is typically applied inside the service (or just before the business logic layer) because it needs to know the response to replay. Together they form the full safety net: rate limiting protects infrastructure from excess load; deduplication protects data integrity from retries.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use the request body as the deduplication key" | "Hash the request body — if the hash matches, it's a duplicate" | "Request body hashing misidentifies legitimate identical requests as duplicates. If a user transfers ₹100 to the same person twice in 24 hours (both intentional), the request bodies are identical — a body hash would wrongly return the first payment as the response to the second, refusing to process a legitimate new transaction. The correct key is always client-generated and client-controlled: `Idempotency-Key: <UUID>`. The client decides what constitutes one logical operation. The server only tracks 'have I seen this UUID'. The UUID is different for each intended new operation, even if the bodies are identical." |
| "Store idempotency keys in Redis only" | "I'll use Redis to store all idempotency keys and responses" | "Redis alone is not sufficient for permanent financial guarantee. Redis can lose data in specific failure modes (persistence config, crash before RDB/AOF flush). For financial operations like payment: the idempotency key should also be written to the database as part of the payment record, ideally in the same transaction that creates the payment. Then there are two sources of truth: Redis (fast lookup for 24h) and the database (permanent record). If Redis loses the key, the next lookup misses and the payment service tries to create a new payment — but the database constraint (UNIQUE on idempotency key + user ID) rejects the duplicate INSERT, preventing double-charging. This dual-layer approach is the production-safe pattern for anything involving money." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we built a REST endpoint for SAP S/4HANA to post financial journal entries to CFIN (Central Finance). Journal entry posting is an expensive, non-idempotent operation — duplicate entries cause reconciliation failures in audits. The challenge: SAP's background jobs retry on network timeouts without any application-level awareness of whether the previous attempt succeeded. We implemented a deduplication layer keyed on the SAP document number (which is naturally unique per business document). Before processing, we set a Redis key: `SET dedup:journal:{docNumber} PROCESSING EX 3600 NX`. On success, we stored the posting result. When the same SAP job retried after a timeout, it got back the original success response — no duplicate posting. We also stored the idempotency key in the `journal_postings` table as a UNIQUE constraint as the permanent safety net."

---

## 8. Scale Evolution

**Single service, low volume →** Redis SET NX per idempotency key. TTL = 86400s. Works correctly for single or multiple instances (Redis is shared state).

**High-volume payment flow →** Two-layer: Redis fast path (24h TTL) + database UNIQUE constraint (permanent). Redis serves 95%+ of lookups. Database constraint serves as crash-safety backup. Prometheus: dedup_hit_total counter (for monitoring retry rates — a spike indicates client-side retry storm).

**Multi-region →** Idempotency key scoped to region + user (prevents cross-region confusion). Redis per region (not cross-region replication — latency too high for synchronous dedup check). Accept: idempotency keys are not global — if customer hits EU region first, then US region, the second attempt is treated as new. For truly global: write idempotency keys to a globally consistent store (Google Spanner, CockroachDB) — significant engineering cost justified only for global payment platforms like Stripe.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Idempotency-Key is a first-class API concept in payment rails. Mobile payment retries on bad network are a core reliability concern. Double-charges have regulatory and customer trust consequences. | "A merchant's backend sends a payment initiation but times out before the response arrives. The backend retries. How do you ensure the money is not deducted twice?" |
| Swiggy / Meesho | Order placement must be deduplicated: double tap → one order, not two. Cart checkout → payment → order confirmation must be atomic and idempotent. Delivery assignment API must handle retried webhook deliveries. | "Swiggy's mobile app has a bug that sometimes double-taps the 'Place Order' button in under 200ms. How do you prevent duplicate orders at the API level?" |
| Adobe / Microsoft | Asset publish operations, document save operations, email notifications must all be deduplicated. SaaS billing operations: subscription creation, invoice generation. | "A scheduled job retries asset publish operations on failure. How do you ensure a creative asset is not published twice to the content delivery network?" |
| SAP Labs (current) | Financial document posting must be exactly-once — duplicate GL entries fail audits. ERP batch jobs retry aggressively on timeout. SAP Integration Suite provides idempotency as a feature in its runtime. | "SAP ERP retries journal entry postings on network timeout. How do you ensure CFIN doesn't accept duplicate financial postings from retried calls?" |

---

## 10. Related Topics — What to Study Next

- **Topic 121 — Idempotency — Designing Idempotent Consumers** — request deduplication is the server-side implementation of idempotency for APIs; that topic covers the same concept in the Kafka consumer context (exactly-once processing of messages); together they form the complete picture of idempotency across the full system stack
- **Topic 126 — HTTP Methods** — idempotency is a native property of PUT and DELETE (calling them multiple times = same result); POST is not natively idempotent; understanding this HTTP-level distinction motivates WHY deduplication is specifically needed for POST endpoints and not for PUT/DELETE
- **Topic 103 — Redis** — the complete Redis data structures and commands needed for deduplication: `SET NX EX`, `SETNX`, TTL management, Lua scripts for atomic operations; Lua scripting is needed for check-fetch-update patterns that must be atomic to prevent race conditions
- **Topic 138 — Circuit Breaker at API Level** — when the deduplication store (Redis) or the downstream service is unavailable, the circuit breaker determines the fallback behaviour; understanding both topics together covers the full reliability stack for state-changing API operations

---

*Part 7 · Request Deduplication · Full Stack Interview Guide · Hruday D · 2026*
