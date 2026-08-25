# 209. @Transactional Internals

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

`@Transactional` is Spring's declarative transaction management annotation. It lets you define transaction boundaries at the method (or class) level without writing boilerplate transaction begin/commit/rollback code. Under the hood, it works through Spring's AOP proxy mechanism.

**What it does:**
- Wraps a method in a transaction: begins before the method, commits after successful return, rolls back on exception
- Manages transaction propagation when multiple `@Transactional` methods call each other
- Controls isolation level, rollback rules, timeout, and read-only hints

**Why it exists:**
- Writing `PlatformTransactionManager.getTransaction()` / `commit()` / `rollback()` manually in every service method is error-prone and repetitive
- Declarative transactions separate the what (business logic) from the how (transaction management infrastructure)

**Role in distributed systems:**
- Controls ACID guarantees within a single database resource
- For multi-database or multi-service transactions, use patterns like Saga or Two-Phase Commit (XA) — `@Transactional` alone is not sufficient
- Wrong propagation or isolation level is one of the most common sources of data corruption bugs in Spring applications

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### How @Transactional Works — The Proxy Chain

```
Caller (Bean A)
    │
    ▼
Spring AOP Proxy (for OrderService)
    ├── TransactionInterceptor.invoke()
    │       ├── PlatformTransactionManager.getTransaction()   // BEGIN
    │       │         (uses ThreadLocal to store connection)
    │       ├── target.createOrder(...)                       // Call actual method
    │       ├── commit() — if no exception                    // COMMIT
    │       └── rollback() — if RuntimeException             // ROLLBACK
    │
    └── returns to caller
```

Key implementation details:
- `TransactionSynchronizationManager` stores the current transaction (database connection, status) in a `ThreadLocal`
- The same connection is reused for all DB calls within the same transaction — this is how nested `save()` calls participate in one transaction
- If method completes normally → `commit()`
- If `RuntimeException` or `Error` propagates out → `rollback()`
- `CheckedException` (subclass of `Exception`, not `RuntimeException`) does NOT trigger rollback by default

---

### Transaction Propagation Levels

Propagation defines what happens when a `@Transactional` method is called from another `@Transactional` method.

| Propagation | Behavior |
|---|---|
| `REQUIRED` (default) | Join existing transaction if present; create new one if not |
| `REQUIRES_NEW` | Always create a new transaction; suspend existing one |
| `SUPPORTS` | Join existing if present; run without transaction if none |
| `NOT_SUPPORTED` | Always run without transaction; suspend existing one |
| `MANDATORY` | Must have existing transaction; throw if none |
| `NEVER` | Must NOT have a transaction; throw if one exists |
| `NESTED` | Execute in a nested transaction (savepoint); rollback nested without rolling back outer |

```java
// ✅ REQUIRES_NEW: audit log always persists, even if order creation is rolled back
@Service
public class OrderService {

    @Autowired
    AuditService auditService;

    @Transactional
    public void createOrder(Order order) {
        orderRepository.save(order);
        auditService.logAction("ORDER_CREATED", order.getId()); // REQUIRES_NEW
        // If this method rolls back, audit log is already committed separately
    }
}

@Service
public class AuditService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(String action, Long entityId) {
        auditRepository.save(new AuditLog(action, entityId));
        // Always committed independently
    }
}
```

---

### Isolation Levels

Isolation level controls how concurrent transactions see each other's data.

| Isolation | Dirty Read | Non-Repeatable Read | Phantom Read | Use Case |
|---|---|---|---|---|
| `READ_UNCOMMITTED` | ✅ possible | ✅ possible | ✅ possible | Analytics (rare) |
| `READ_COMMITTED` (default for most DBs) | ❌ prevented | ✅ possible | ✅ possible | Standard OLTP |
| `REPEATABLE_READ` | ❌ | ❌ prevented | ✅ possible | Financial reads |
| `SERIALIZABLE` | ❌ | ❌ | ❌ prevented | Strictest correctness |

```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
public FundTransferResult transfer(Long fromAccountId, Long toAccountId, BigDecimal amount) {
    Account from = accountRepo.findById(fromAccountId).orElseThrow();
    Account to   = accountRepo.findById(toAccountId).orElseThrow();
    // REPEATABLE_READ guarantees balance won't change between reads within this transaction
    from.debit(amount);
    to.credit(amount);
    accountRepo.save(from);
    accountRepo.save(to);
    return new FundTransferResult(...);
}
```

---

### Rollback Rules

By default:
- `RuntimeException` or `Error` → rollback
- `CheckedException` (e.g., `IOException`) → NO rollback (commit instead)

```java
// ✅ Rollback on custom checked exception
@Transactional(rollbackFor = InsufficientFundsException.class)
public void transfer(BigDecimal amount) throws InsufficientFundsException {
    // ...
}

// ✅ Do NOT rollback on specific exception (e.g., email sending failure is non-critical)
@Transactional(noRollbackFor = EmailNotificationException.class)
public void processOrder(Order order) throws EmailNotificationException {
    orderRepository.save(order);       // Must persist
    emailService.sendConfirmation();   // Can fail without rolling back order persistence
}
```

---

### Read-Only Transactions

```java
@Transactional(readOnly = true)
public List<OrderDto> getAllOrders() {
    return orderRepository.findAll()
                          .stream()
                          .map(orderMapper::toDto)
                          .collect(toList());
}
```

Benefits of `readOnly = true`:
- JPA/Hibernate skips dirty checking (no need to snapshot entities for comparison at commit time)
- Some databases optimise read-only transactions (replicas, snapshot isolation)
- HikariCP can route read-only transactions to read replicas (with `AbstractRoutingDataSource`)

---

### The Self-Invocation Problem

`@Transactional` works through the AOP proxy. If you call a `@Transactional` method from within the same class, the proxy is bypassed.

```java
@Service
public class OrderService {

    @Transactional
    public void processOrder(Order order) {
        saveOrder(order);   // ❌ Direct call — @Transactional on saveOrder is IGNORED
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveOrder(Order order) {
        orderRepository.save(order);
    }
}
```

**Fixes:**
```java
// ✅ Fix 1: Extract to separate bean (preferred)
@Service
public class OrderPersistenceService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveOrder(Order order) { ... }
}

// ✅ Fix 2: Self-inject via Spring context (pragmatic workaround)
@Service
public class OrderService {
    @Autowired
    ApplicationContext ctx;

    @Transactional
    public void processOrder(Order order) {
        ctx.getBean(OrderService.class).saveOrder(order); // Goes through proxy
    }
}
```

---

### Transaction Boundaries and Lazy Loading

```java
@Transactional                    // Transaction is OPEN here
public OrderDto getOrderWithItems(Long orderId) {
    Order order = orderRepository.findById(orderId).orElseThrow();
    // ✅ Accessing lazy-loaded items works here — transaction is open
    return OrderDto.from(order.getItems());
}
// Transaction CLOSES here — after method returns

// ❌ Accessing lazy-loaded collection AFTER transaction closes → LazyInitException
Order order = orderRepository.findById(1L).orElseThrow();  // transaction closed
order.getItems().size();  // LazyInitializationException!
```

---

### @Transactional on Class vs Method

```java
// ✅ Class-level default, method-level override
@Service
@Transactional(readOnly = true)   // Default: read-only for all methods
public class OrderService {

    public List<Order> findAll() { ... }  // Inherits readOnly = true

    @Transactional                         // Override: read-write for this method
    public Order createOrder(Order o) { ... }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

- Each open transaction holds a DB connection from HikariCP
- Long-running transactions block connection slots → pool exhaustion
- Rule: Keep transaction scope as narrow as possible:
  - Do NOT perform slow external calls (HTTP, file I/O) inside a transaction
  - Do NOT hold transactions open across user interactions
- Typical transaction duration target: < 50ms

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

**Transaction scope includes all repositories touched on the same thread:**
- Multiple `repository.save()` calls within one `@Transactional` method share one connection
- All participate in the same ACID transaction
- Correct for: orderRepository + paymentRepository + inventoryRepository if all in one DB
- Wrong for: cross-microservice operations — use Saga pattern

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- **Long transactions cause deadlocks:** Two transactions each holding a lock on resource A while waiting for resource B → deadlock. Mitigation: acquire locks in a consistent order; keep transactions short.
- **Phantom reads in financial systems:** Use `SERIALIZABLE` or optimistic locking (`@Version`) for operations involving aggregates (e.g., inventory count, account balance).
- **`REQUIRES_NEW` contention:** Creating many independent transactions under load increases connection pool pressure — profile carefully.

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- Never expose transaction IDs to clients — they should not be observable
- Read-only transactions reduce lock contention and prevent accidental writes; use `readOnly = true` broadly on query methods
- `@Transactional` on `@Controller` methods is a code smell — business logic and transaction management belong in the service layer

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Bank Transfer — ACID and Isolation
- Debit Account A, Credit Account B must be atomic — partial updates would create inconsistent balances
- Use `REPEATABLE_READ` or `SERIALIZABLE` to prevent reading a balance that changes between two reads within the same transaction
- `@Version` on Account entity provides optimistic concurrency control at JPA level

### Order Processing — REQUIRES_NEW for Audit
- Order creation can fail (out of stock, payment declined), but the audit trail must always be committed
- `AuditService.logAction()` uses `REQUIRES_NEW` — commits its own transaction independently
- If order creation rolls back, audit entry is preserved in the DB

### Google Cloud Spanner — Serializable by Default
- Spanner uses serializable isolation by default for all transactions
- Eliminates entire classes of bugs (phantom reads, non-repeatable reads) at cost of reduced throughput
- Design choice: correctness > performance for financial-grade systems

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "`@Transactional` in Spring is implemented via AOP proxy. When you call a `@Transactional` method, the proxy intercepts the call, starts a transaction via `PlatformTransactionManager`, stores the connection in a `ThreadLocal`, and invokes the actual method. On normal return it commits; on `RuntimeException` it rolls back. The most common pitfall is self-invocation — calling a `@Transactional` method from within the same class bypasses the proxy. Propagation `REQUIRES_NEW` is useful when you need a sub-operation (like audit logging) to commit independently regardless of the outer transaction's outcome. Isolation controls concurrency anomalies: I use `READ_COMMITTED` as default and bump to `REPEATABLE_READ` for financial operations reading a balance multiple times within one transaction."

### Follow-Up Questions

1. **"What is the difference between `REQUIRED` and `REQUIRES_NEW`?"** → `REQUIRED` joins the existing transaction; `REQUIRES_NEW` always suspends the outer transaction and starts a fresh one. The new transaction commits/rolls back independently.
2. **"When does `@Transactional` NOT rollback?"** → On checked exceptions that are not declared in `rollbackFor`. Default rollback only for `RuntimeException` and `Error`.
3. **"What is `TransactionSynchronizationManager`?"** → A Spring utility class holding the current transaction's resources (connection, status flags) in a `ThreadLocal`. Repositories use this to participate in the active transaction.
4. **"Can you use `@Transactional` on a private method?"** → No. Spring AOP cannot proxy private methods. The annotation is silently ignored. Apply `@Transactional` only to public methods.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

```
@Transactional method call
           │
           ▼
  TransactionInterceptor
           │
           ├─ getExistingTransaction(ThreadLocal)
           │
           ├─ if REQUIRED + existing → join it
           │  if REQUIRED + none    → BEGIN new transaction
           │  if REQUIRES_NEW       → SUSPEND outer, BEGIN new
           │
           ▼
     Target method executes
           │
     ┌─────┴──────────┐
 SUCCESS           EXCEPTION
     │                  │
  COMMIT()          RuntimeException?
                      YES → ROLLBACK()
                      NO  → COMMIT() (checked exception default)
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

**Why `@Transactional` exists:**
- Keeps transaction management code out of business logic (Separation of Concerns)
- Provides consistent begin/commit/rollback semantics across all JDBC/JPA operations
- Enables nested transaction scoping through propagation levels

**How it works:**
- AOP proxy intercepts the method call
- `PlatformTransactionManager` begins transaction, stores connection in `ThreadLocal`
- All repositories in the call stack bind to the same connection via `TransactionSynchronizationManager`
- Commits or rolls back based on which exception (if any) propagates out

**Critical rules:**
- Self-invocation bypasses the proxy — extract to separate bean
- Never call slow external services inside a transaction — holds connection open
- Use `readOnly = true` for all read-only methods
- Default rollback is on `RuntimeException` — add `rollbackFor` for checked exceptions where needed
