# 212. Designing Idempotent APIs in Spring

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Idempotency** means that executing the same operation multiple times produces the same result as executing it once. An idempotent API is one where retrying a request (due to timeout, network failure, or client uncertainty) does not cause duplicate state mutations.

**What it is:**
- A property of HTTP operations: safe retries with no unintended side effects on the second or later invocations
- Implemented through client-supplied idempotency keys that uniquely identify each logical operation
- The server deduplicates: on repeat request, it returns the stored previous response instead of re-executing the operation

**Why it matters:**
- Networks fail; clients retry; load balancers timeout and retry
- Without idempotency: a customer's credit card is charged twice; an order is placed twice; an inventory item is decremented twice
- With idempotency: the retry gets back the original result, no duplicate is created

**Role in distributed systems:**
- At-least-once delivery (Kafka, SQS, webhooks) guarantees messages arrive but may duplicate them → consumers must be idempotent
- Payment processors (Stripe, PayPal) all require idempotency keys for charge operations
- Microservice saga steps must be idempotent so the orchestrator can safely retry a step on timeout

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### HTTP Method Idempotency by Specification

| Method | Idempotent | Safe | Notes |
|---|---|---|---|
| GET | ✅ | ✅ | No mutation; always idempotent |
| HEAD | ✅ | ✅ | Same as GET, no body |
| PUT | ✅ | ❌ | Replace resource; same PUT = same state |
| DELETE | ✅ | ❌ | Delete once or ten times → resource is gone |
| PATCH | ❌ | ❌ | Partial update — semantics depend on implementation |
| POST | ❌ | ❌ | Not idempotent by default → requires explicit deduplication |

**The key insight:** POST (create, trigger action) is not inherently idempotent. You must make it idempotent by design.

---

### Idempotency Key Pattern — Core Design

**Protocol:**
1. Client generates a unique key (UUID v4) per logical operation before sending
2. Client includes the key in every request: `Idempotency-Key: <uuid>`
3. Server checks if the key has been seen before:
   - **First time:** Execute the operation, store `(key → response)`, return response
   - **Repeat request (same key):** Skip execution, return stored response

```
Client: POST /payments
        Idempotency-Key: 4f3a9bc2-7d81-4e1e-a7c3-1bc2f83d0a12
        Body: { amount: 100, currency: "USD", customerId: 42 }

Server first time:
  → Key not in cache
  → Execute payment charge
  → Store {key → {orderId: 999, status: "CHARGED"}} in Redis (TTL: 24h)
  → Return HTTP 201 {orderId: 999, status: "CHARGED"}

Client retry (network timeout):
  → Same request, same Idempotency-Key
  → Key found in cache
  → Return stored HTTP 201 {orderId: 999, status: "CHARGED"}
  → No duplicate charge
```

---

### Spring Boot Implementation

#### Step 1: Idempotency Filter

```java
@Component
@Order(2)  // After authentication filter
public class IdempotencyFilter extends OncePerRequestFilter {

    @Autowired
    IdempotencyStore idempotencyStore;

    private static final Set<String> IDEMPOTENT_METHODS =
        Set.of("POST", "PATCH");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain chain) throws IOException, ServletException {

        if (!IDEMPOTENT_METHODS.contains(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String key = request.getHeader("Idempotency-Key");
        if (key == null || key.isBlank()) {
            chain.doFilter(request, response); // Not enforced for all endpoints — or return 400
            return;
        }

        // Validate key format (UUID)
        if (!isValidUUID(key)) {
            response.sendError(HttpStatus.BAD_REQUEST.value(),
                               "Idempotency-Key must be a valid UUID");
            return;
        }

        // Check store
        Optional<CachedResponse> cached = idempotencyStore.get(key);
        if (cached.isPresent()) {
            // Replay stored response
            CachedResponse stored = cached.get();
            response.setStatus(stored.getStatusCode());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(stored.getBody());
            return;
        }

        // First execution: wrap response to capture it
        CachingResponseWrapper wrapper = new CachingResponseWrapper(response);
        chain.doFilter(request, wrapper);

        // Store the response
        idempotencyStore.put(key, new CachedResponse(
            wrapper.getStatusCode(),
            wrapper.getCapturedBody()
        ), Duration.ofHours(24));

        // Write actual response
        response.setStatus(wrapper.getStatusCode());
        response.getWriter().write(wrapper.getCapturedBody());
    }

    private boolean isValidUUID(String key) {
        try {
            UUID.fromString(key);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
```

---

#### Step 2: Idempotency Store (Redis-backed)

```java
@Component
public class IdempotencyStore {

    @Autowired
    RedisTemplate<String, CachedResponse> redisTemplate;

    private static final String KEY_PREFIX = "idempotency:";

    public Optional<CachedResponse> get(String idempotencyKey) {
        CachedResponse value = redisTemplate.opsForValue()
            .get(KEY_PREFIX + idempotencyKey);
        return Optional.ofNullable(value);
    }

    public void put(String idempotencyKey, CachedResponse response, Duration ttl) {
        redisTemplate.opsForValue()
            .set(KEY_PREFIX + idempotencyKey, response, ttl);
    }
}
```

---

#### Step 3: Database-Level Deduplication (Strongly Consistent)

For payment or financial operations, Redis alone is insufficient — Redis can lose data. Use the database with a unique constraint:

```sql
-- Idempotency table
CREATE TABLE idempotency_keys (
    key         VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    endpoint    VARCHAR(200) NOT NULL,
    status_code INT NOT NULL,
    response    TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    expires_at  TIMESTAMP NOT NULL
);
```

```java
@Service
public class PaymentService {

    @Transactional
    public PaymentResult chargeCard(String idempotencyKey, ChargeRequest request) {
        // Check for existing result
        Optional<IdempotencyRecord> existing = idempotencyRepo.findByKey(idempotencyKey);
        if (existing.isPresent()) {
            return deserialize(existing.get().getResponse(), PaymentResult.class);
        }

        // Execute the payment
        PaymentResult result = paymentGateway.charge(request);

        // Persist result atomically with the payment (same transaction)
        idempotencyRepo.save(new IdempotencyRecord(
            idempotencyKey,
            request.getUserId(),
            serialize(result),
            Instant.now().plus(Duration.ofDays(1))
        ));

        return result;
    }
}
```

This approach is ACID: the idempotency record and the payment are committed in the same transaction. Either both succeed or both are rolled back — no partial state.

---

### Natural Idempotency with PUT

REST PUT operation is designed to be idempotent:

```java
// ✅ Idempotent by design: PUT replaces the full resource
@PutMapping("/orders/{id}/status")
public ResponseEntity<OrderDto> updateStatus(
        @PathVariable Long id,
        @Valid @RequestBody UpdateStatusRequest request) {
    Order order = orderService.updateStatus(id, request.getStatus());
    return ResponseEntity.ok(OrderDto.from(order));
}
// PUT /orders/123/status {status: "SHIPPED"}
// Calling this 10 times → order status is SHIPPED, not 10 events fired
```

---

### Idempotency for Kafka Consumers

Consumers must be idempotent because Kafka's at-least-once delivery can re-deliver messages:

```java
@KafkaListener(topics = "order-events")
@Transactional
public void handleOrderEvent(OrderEvent event) {
    // ✅ Check if already processed
    if (processedEventRepository.existsByEventId(event.getEventId())) {
        log.debug("Already processed event: {}", event.getEventId());
        return; // Idempotent: skip duplicate
    }

    // Process the event
    orderService.applyEvent(event);

    // Record processing
    processedEventRepository.save(new ProcessedEvent(event.getEventId(), Instant.now()));
    // Both operations in same @Transactional — atomic
}
```

---

### Conditional Requests (ETags)

For resource updates, use ETags to prevent lost updates and achieve conditional idempotency:

```java
@GetMapping("/orders/{id}")
public ResponseEntity<OrderDto> getOrder(@PathVariable Long id) {
    Order order = orderService.findById(id);
    String etag = "\"" + order.getVersion() + "\""; // Hibernate @Version
    return ResponseEntity.ok()
            .eTag(etag)
            .body(OrderDto.from(order));
}

@PutMapping("/orders/{id}")
public ResponseEntity<OrderDto> updateOrder(
        @PathVariable Long id,
        @RequestHeader(HttpHeaders.IF_MATCH) String ifMatch,
        @RequestBody UpdateOrderRequest request) {
    // If version doesn't match → 412 Precondition Failed
    return orderService.updateIfVersionMatches(id, parseVersion(ifMatch), request);
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

**Idempotency store sizing:**
```
100 QPS POST requests × 24h retention × 2 KB avg response = 17 GB Redis storage
Use LRU eviction or explicit TTL to cap storage
```

**Redis vs DB for idempotency keys:**
- Redis: fast (< 1ms), suitable for high-frequency APIs, risk of data loss on restart
- DB: slower (~5ms), ACID guarantees, correct for financial operations
- Hybrid: Redis for fast duplicate check; DB for authoritative record

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

- Idempotency keys should be scoped to `(user, endpoint, key)` to prevent one user's key from matching another's
- TTL = 24 hours is common for payment systems (Stripe uses 24 hours)
- Store idempotency records in the same DB as the business data (for atomic commits)
- Unique constraint on `idempotency_key` prevents race condition from concurrent duplicate submissions

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- **Race condition:** Two concurrent requests with the same key — both check "key not found" simultaneously, both execute
  - Fix: `INSERT ... ON CONFLICT DO NOTHING` or DB unique constraint; the second transaction will fail and can then read the first result
- **Store failure:** If Redis is down, fail open (allow execution without idempotency) or fail closed (return 503) — depends on business risk
- **Partial execution:** If the business operation succeeds but storing the idempotency record fails → client retries → operation runs again
  - Fix: Store idempotency record in the same DB transaction as the business operation

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- Scope idempotency keys to authenticated user: `key = hash(userId + idempotencyKey)` to prevent a user from replaying another user's operation key
- Validate key format (UUID) to prevent injection via the key field
- Do NOT cache 4xx error responses with idempotency keys — the client should fix their request and retry with the same key (Stripe's behavior: only cache 2xx and 5xx)
- Log idempotency key with each request for distributed tracing and audit

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Stripe: Idempotency Keys as First-Class API Concept
- Every Stripe charge/refund API requires an `Idempotency-Key` header
- Keys are retained for 24 hours
- Stripe's documentation: "If a request fails with a network error, send the same `Idempotency-Key` — Stripe will return the original result"
- Implementation: stored in PostgreSQL with unique constraint per `(user_id, key)`

### Amazon SQS: At-Least-Once + Consumer Idempotency
- Amazon SQS guarantees at-least-once delivery (may duplicate messages)
- Amazon recommends consumers use `MessageDeduplicationId` for FIFO queues
- For standard queues: consumer-side deduplication via DB unique constraint on `message_id`

### Banking: Transfer Idempotency
- POST /transfers with idempotency key ensures a network retry doesn't charge twice
- Backend: `INSERT INTO transfers (..., idempotency_key) ON CONFLICT (idempotency_key) DO NOTHING` + `RETURNING` clause to get the original row
- Second request gets the original transfer record returned — no second debit

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "Idempotency ensures that retrying a failed operation doesn't cause unintended side effects like duplicate charges. By HTTP spec, GET/PUT/DELETE are idempotent; POST is not. For POST endpoints, I implement idempotency keys: the client sends a UUID in an `Idempotency-Key` header, the server stores `(key → response)` in Redis or the DB, and on retry returns the cached response instead of re-executing. For financial operations I insist on DB-backed storage for ACID guarantees — storing the idempotency record and the business operation in the same transaction guarantees they're atomic. The critical race condition to handle is two concurrent requests with the same key: a unique DB constraint on the key column makes the second insert fail, and that transaction can then read the first result."

### Follow-Up Questions

1. **"What's the difference between idempotency and safety?"** → A safe operation has no side effects (GET). An idempotent operation can have side effects, but repeated execution results in the same state (DELETE: first call removes; subsequent calls find nothing to remove but state is identical).
2. **"Why is POST not idempotent by default?"** → POST semantics mean "process this payload and create a new resource or trigger an action". There's no built-in deduplication — each POST can create a new record.
3. **"What's the race condition risk and how do you mitigate it?"** → Two concurrent requests with the same key can both pass the "key not found" check before either stores the result. Mitigate with a unique DB constraint: the second `INSERT` fails with a conflict, and that path reads the first result via `ON CONFLICT DO NOTHING`.
4. **"Should you cache error responses with idempotency keys?"** → Only cache terminal results. Cache 2xx (success). For 5xx: Stripe caches server errors so clients can retry later and see if the operation eventually succeeded. 4xx errors (client error) should NOT be cached — client fixes the request and retries.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### Idempotency Flow

```
Client                    API Server               Store (Redis/DB)
  │                           │                         │
  │─ POST /payments ──────────►│                         │
  │  Idempotency-Key: abc-123  │                         │
  │                           │─ GET "idempotency:abc-123"►│
  │                           │◄── NOT FOUND ────────────│
  │                           │                         │
  │                           │── execute payment ──────►│ (payment DB)
  │                           │◄── result: {id:999} ────│
  │                           │                         │
  │                           │─ SET "idempotency:abc-123"►│
  │                           │  value: {id:999}, TTL 24h│
  │◄── 201 {id:999} ──────────│                         │
  │                           │                         │
  │  [network timeout, retry] │                         │
  │─ POST /payments ──────────►│                         │
  │  Idempotency-Key: abc-123  │                         │
  │                           │─ GET "idempotency:abc-123"►│
  │                           │◄── FOUND: {id:999} ──────│
  │◄── 201 {id:999} ──────────│                         │
  │  (no duplicate charge)     │                         │
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

**Why idempotency is critical:**
- Networks, clients, and load balancers retry requests; without idempotency, retries cause duplicate mutations
- Payment systems, financial operations, and inventory updates require idempotency as a safety guarantee
- Message consumers (Kafka, SQS) must be idempotent because at-least-once delivery is the default

**How to implement:**
1. Client generates UUID per operation → includes as `Idempotency-Key` header
2. Server checks store (Redis / DB) for key on entry
3. On first request: execute, store result with TTL, return result
4. On repeat request: return stored result, skip execution
5. Scope key to user: `prefixKey = userId + ":" + idempotencyKey`
6. Use DB unique constraint for race condition safety

**Key rules:**
- PUT and DELETE are inherently idempotent — no extra work needed
- POST and PATCH require explicit idempotency implementation
- Store idempotency record atomically with the business operation (same transaction)
- Do not cache client error (4xx) responses; do cache success (2xx) responses
