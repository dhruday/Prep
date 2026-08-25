# 201. Defensive Programming

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Defensive Programming** is the practice of writing code that anticipates and handles unexpected or incorrect input, unexpected execution states, and external failures gracefully. It is the discipline of not trusting any input — from users, external services, databases, or even other parts of the same system.

**What it is:**
- A programming approach that assumes things can and will go wrong
- Proactive validation and error handling at system boundaries
- Guarding against null references, out-of-bounds access, type mismatches, and protocol violations

**Why it exists:**
- Real systems receive bad input all the time — validation errors, network corruption, version skew
- Undefended code corrupts data silently or crashes unpredictably
- Defensive code catches problems at their origin, not 5 layers deep in the call stack

**The problem it solves:**
- `NullPointerException` caused by an unchecked external dependency returning null
- Silent data corruption from an API client sending out-of-range values
- Cascading failures when one service misbehaves and callers don't validate responses

**Where to apply:**
- **System boundaries:** All user inputs, all API responses, all database reads
- **Method preconditions:** When correctness requires specific input invariants
- **Object construction:** Validate before the object enters an inconsistent state
- NOT in every internal method call — internal code should trust contract-fulfilling callers

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### The Trust Boundary Model

```
External World (untrusted zone):
  - User input (HTTP requests, form data, query params)
  - External API responses
  - Message queue messages
  - File uploads
  - Database reads (may contain legacy garbage data)

  ↓  VALIDATE HERE — Defensive Programming Zone  ↓

Internal System (trusted zone):
  - Validated domain objects
  - Method calls between your own classes
  - In-memory business logic
```

---

### Technique 1: Input Validation at System Entry Points

```java
// ✅ Validate all external input before it enters the domain
@RestController
public class OrderController {
    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> createOrder(@RequestBody @Valid CreateOrderRequest request) {
        // @Valid triggers JSR-380 Bean Validation
        return orderService.createOrder(request);
    }
}

public class CreateOrderRequest {
    @NotNull @Positive
    private Long productId;

    @NotNull @Min(1) @Max(1000)
    private Integer quantity;

    @NotBlank @Size(max = 255)
    private String shippingAddress;
}
```

---

### Technique 2: Guard Clauses (Early Return on Invalid Input)

Replace nested conditionals with flat, early-exit validation.

```java
// ❌ Nested conditionals — hard to read
public void processPayment(Payment payment) {
    if (payment != null) {
        if (payment.getAmount() > 0) {
            if (payment.getCurrency() != null) {
                // actual logic buried here
            }
        }
    }
}

// ✅ Guard clauses — fail fast, main path is clean
public void processPayment(Payment payment) {
    Objects.requireNonNull(payment, "Payment must not be null");
    if (payment.getAmount() <= 0) throw new InvalidPaymentException("Amount must be positive");
    if (payment.getCurrency() == null) throw new InvalidPaymentException("Currency is required");

    // Main logic — all preconditions met
    executePayment(payment);
}
```

---

### Technique 3: Use Optional Instead of Null

```java
// ❌ Returns null — callers may forget to check
public User findUser(long id) {
    return userRepository.findById(id); // might return null → NPE
}

// ✅ Optional makes absence explicit
public Optional<User> findUser(long id) {
    return userRepository.findById(id);
}

// Caller is forced to handle absence:
service.findUser(id)
       .map(User::getEmail)
       .orElse("unknown");
```

---

### Technique 4: Validate Object Construction

```java
// ❌ Object can be created in invalid state
Order order = new Order();
order.setUserId(null);  // valid Java, invalid domain

// ✅ Constructor enforces invariants
public class Order {
    private final long userId;
    private final List<OrderItem> items;

    private Order(long userId, List<OrderItem> items) {
        if (userId <= 0) throw new IllegalArgumentException("userId must be positive");
        if (items == null || items.isEmpty()) throw new IllegalArgumentException("Order must have items");
        this.userId = userId;
        this.items = List.copyOf(items);  // defensive copy — immutable
    }

    public static Order of(long userId, List<OrderItem> items) {
        return new Order(userId, items);
    }
}
```

---

### Technique 5: Defensive Copying

Prevent callers from mutating internal state.

```java
// ❌ Returns internal list — caller can mutate Order's state
public List<OrderItem> getItems() {
    return items;
}

// ✅ Defensive copy
public List<OrderItem> getItems() {
    return Collections.unmodifiableList(items);
}
```

---

### Technique 6: Use Enums / Value Types — Reject Strings

```java
// ❌ Any string is accepted — validation scattered everywhere
public void updateStatus(String status) {
    if (!status.equals("PENDING") && !status.equals("SHIPPED") && ...)
        throw new IllegalArgumentException("Unknown status: " + status);
}

// ✅ Type-safe enum — invalid values rejected at compile time
public void updateStatus(OrderStatus status) {
    Objects.requireNonNull(status);
    this.status = status;
}
// enum OrderStatus { PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED }
```

---

### Technique 7: Defensive External Service Calls

```java
// ✅ Validate response, handle null and unexpected shapes
public UserProfile fetchProfile(String userId) {
    try {
        UserProfileResponse response = profileClient.getProfile(userId);

        if (response == null) {
            log.warn("Profile service returned null for userId={}", userId);
            return UserProfile.anonymous();
        }
        if (response.getEmail() == null || response.getEmail().isBlank()) {
            throw new InvalidProfileResponseException("Profile email missing: " + userId);
        }
        return ProfileMapper.toDomain(response);

    } catch (FeignException e) {
        log.error("Profile service unavailable for userId={}", userId, e);
        throw new ProfileServiceException("Unable to fetch profile", e);
    }
}
```

---

### Over-Defensive Code: The Anti-Pattern

Over-defending internal code creates noise and obscures intent.

```java
// ❌ Over-defending internal private method — callers are in the same class
private double applyTax(Order order) {
    if (order == null) throw new IllegalArgumentException("order is null"); // not needed
    if (order.getItems() == null) throw ...                                 // invariant already checked
}

// ✅ Internal methods trust pre-validated, invariant-enforcing objects
// Only validate at trust boundaries
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

- Validation at API boundaries: ~0.1ms per request (negligible)
- Defensive copies of large collections: O(n) — avoid for large in-memory collections in hot paths
- Exception creation (with stack trace): ~1–10ms — never use exceptions for flow control

**Rule:** Validate at boundaries, not in tight inner loops.

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

```sql
-- ✅ Database-level defensive design
CREATE TABLE orders (
    id          BIGINT PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    amount      DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status      VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

- `NOT NULL` constraints for required fields — don't rely on application code alone
- `CHECK` constraints enforce business rules at the DB level
- Foreign keys enforce referential integrity

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- Validate ALL incoming Kafka/RabbitMQ messages — producers can send schema-breaking changes
- Schema validation (Avro/Protobuf/JSON Schema) as a defensive layer on message consumption
- Dead Letter Queues for messages that fail validation — prevent poison pills from blocking consumers
- Every external call must have an explicit timeout:

```java
// ✅ Always configure explicit timeouts
HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(2))
    .build();
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

Defensive programming IS security programming at the boundary:

```java
// ❌ SQL Injection vulnerability
String query = "SELECT * FROM users WHERE email = '" + email + "'";

// ✅ Parameterized query — defensive against injection
PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE email = ?");
stmt.setString(1, email);
```

- **Command Injection:** Never pass user input to system commands — whitelist validation if unavoidable
- **Path Traversal:** Canonicalize file paths and validate against allowed directories
- **Overflow:** Validate range on all numeric inputs
- **XSS:** Encode all output; validate input encoding at boundary

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Amazon's Retry Storm (2011)
- A failed deployment caused services to return empty responses instead of errors
- Callers that didn't defensively validate responses proceeded with empty data
- Downstream writes corrupted the catalog database with blank product names
- Defensive validation of responses would have stopped propagation at the first layer

### Heartbleed Bug (OpenSSL, 2014)
- No bounds check on the `length` field in a heartbeat request
- Server trusted the client-supplied length and read beyond the allocated buffer
- A single `if (length > actual_payload_size) return ERROR;` would have prevented it

### Stripe's Defensive Design
- Stripe validates every incoming webhook payload against a cryptographic signature
- Invalid signatures are rejected immediately — no downstream processing occurs
- All API inputs are validated against strict type rules before any business logic runs

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "Defensive programming is about being rigorous at system trust boundaries — user input, external API responses, message queue payloads, and database reads. Inside those boundaries, once data is validated into typed domain objects, I trust the internal contract. My key techniques: guard clauses for early validation; Optional instead of null; constructors that enforce invariants; defensive copies for mutable data; enums and value types instead of raw strings. Every external call gets a timeout; every response gets validated before use."

### Common Follow-Up Questions

1. **"Where should you validate — controller or service?"** → Both, with different concerns. Controller validates format/structure. Service validates business rules. Don't mix them.
2. **"Optional vs null — when?"** → Use Optional for return types where absence is a valid outcome. Don't use Optional as method parameters or field types.
3. **"How do you handle validation in Kafka consumers defensively?"** → Validate schema (Avro/Schema Registry). Catch deserialization errors. Route invalid messages to a dead letter topic. Never let a bad message block the consumer.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Trust Boundary Diagram

```
    ┌─────────────────────────────────────────────────────┐
    │  Untrusted Zone                                      │
    │  (User requests, external APIs, Kafka, DB reads)    │
    └─────────────────────┬───────────────────────────────┘
                          │
                ┌─────────▼──────────┐
                │  VALIDATION LAYER  │  ← Defensive programming lives here
                │  - Schema check    │
                │  - Null checks     │
                │  - Range checks    │
                │  - Business rules  │
                └─────────┬──────────┘
                          │
    ┌─────────────────────▼───────────────────────────────┐
    │  Trusted Zone                                        │
    │  (Domain objects, service layer, business logic)    │
    │  → All objects here are valid by construction       │
    └─────────────────────────────────────────────────────┘
```

### Guard Clause Pattern
```java
public Result processRefund(RefundRequest request) {
    // VALIDATE: all guards at the top
    Objects.requireNonNull(request, "request must not be null");
    if (request.getOrderId() <= 0)   throw new ValidationException("Invalid orderId");
    if (request.getAmount() <= 0)    throw new ValidationException("Amount must be positive");
    if (request.getReason() == null) throw new ValidationException("Reason is required");

    // BUSINESS LOGIC: no defensive checks needed below — preconditions are met
    Order order = orderRepository.findById(request.getOrderId());
    return refundEngine.process(order, request.getAmount(), request.getReason());
}
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

**Why defensive programming matters:**
- External inputs are always hostile — by accident (misconfiguration) or intent (attacks)
- Undefended systems fail silently, corrupt data, and trigger cascading incidents
- Validation at boundaries prevents an entire class of bugs from entering the system

**How it works:**
- Validate at trust boundaries; trust validated objects internally
- Use types (enums, value objects, `Optional`) to make invalid states unrepresentable
- Enforce invariants in constructors and factory methods
- Apply timeouts, schema validation, and DLQs at service boundaries

**Key trade-offs:**
- Validation overhead vs. protection — validate at entry points, not in inner loops
- Strictness vs. flexibility — reject invalid input early; don't silently coerce bad values
- Trusting internal code vs. over-checking — internal classes trust validated objects; only boundaries defend
