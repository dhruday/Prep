# @Transactional Internals — Propagation, Isolation Levels
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- `@Transactional` works via **AOP proxy** — Spring wraps your bean in a proxy that begins and commits/rollbacks the transaction around your method
- By default, Spring only rolls back on **unchecked exceptions** (`RuntimeException` and `Error`) — it does NOT rollback on checked exceptions
- **Propagation** controls what happens when a transactional method calls another transactional method — `REQUIRED` (default: join existing or create new), `REQUIRES_NEW` (always new, suspends outer), `NESTED`, `NOT_SUPPORTED` etc.
- **Isolation** controls what a transaction can see from other concurrent transactions — `READ_COMMITTED` (default in most DBs), `REPEATABLE_READ`, `SERIALIZABLE`
- Calling a `@Transactional` method from WITHIN the same class bypasses the proxy — the transaction does NOT start
- Gap to bridge: understanding propagation differences is a high-frequency interview question — especially `REQUIRED` vs `REQUIRES_NEW` in audit logging scenarios

---

## 1. One-Line Definition
`@Transactional` is a Spring AOP annotation that wraps a method in a database transaction — the transaction starts before the method, commits if it succeeds, and rolls back if an unchecked exception escapes.

---

## 2. The Problem It Solves

You are building an order service. Creating an order involves: saving an `Order` record, updating inventory count, creating a payment record, and sending an audit log entry. If the payment record creation fails, you want NONE of the previous writes to be visible — the database should remain as if the operation never happened.

Without transaction management, you write `beginTransaction()`, `commit()`, and `rollback()` in try-catch blocks in every service method. Every method needs 15 lines of transaction boilerplate. Error handling is repeated everywhere. If you forget the `rollback()` call in any error branch, you leave a partial write in the database.

Worse: if `OrderService.createOrder()` calls `InventoryService.updateStock()`, and `InventoryService` has its own `beginTransaction()`, you now have two nested transactions — and the behaviour depends on whether the JDBC driver supports nested transactions (most do not in the way you expect).

`@Transactional` solves this with a declarative approach: annotate the method, Spring handles the plumbing. Propagation rules (`REQUIRED`, `REQUIRES_NEW`) define exactly how nested calls behave.

---

## 3. How It Works Internally

### The Mental Model
Think of a whiteboard. `@Transactional` puts a "DO NOT ERASE" fence around your work. You write multiple steps. If you finish successfully, everything inside the fence is written permanently to the whiteboard. If you make a mistake (exception), someone erases everything inside the fence and the whiteboard is back to where it was before you started. The proxy is the person holding the eraser.

### The Mechanism — Step by Step

1. **AOP proxy creation** — When Spring creates a `@Service` bean that has any `@Transactional` method, `TransactionInterceptor` (a Spring AOP `MethodInterceptor`) is applied. The bean is replaced by a proxy.

2. **Proxy intercepts the method call** — When `orderService.createOrder()` is called, the proxy intercepts the call in `TransactionInterceptor.invoke()`.

3. **TransactionAttributeSource reads the annotation** — Spring reads the `@Transactional` metadata: propagation, isolation, readOnly, timeout, rollbackFor.

4. **PlatformTransactionManager is consulted** — Spring calls `PlatformTransactionManager.getTransaction(transactionDefinition)`. The `TransactionManager` determines: is there already an active transaction? Based on the propagation rule, it creates a new transaction, joins the existing one, or suspends the current one.

5. **Transaction bound to thread** — The active transaction (represented as a `TransactionStatus`) is stored in `TransactionSynchronizationManager` — a `ThreadLocal` holder. Every database operation on the same thread uses the same connection, which is bound to the same transaction.

6. **Your method runs** — All database calls on this thread use the connection bound to the active transaction.

7. **Commit or rollback** — After your method returns, `TransactionInterceptor` checks: did an exception escape? If no exception: `TransactionManager.commit()`. If a `RuntimeException` or `Error`: `TransactionManager.rollback()`. If a checked exception: DEFAULT is to COMMIT (not rollback) — a common trap.

8. **Connection released** — The database connection returns to HikariCP's pool.

### Propagation Types — The Key Table

| Propagation | Behaviour |
|------------|-----------|
| `REQUIRED` (default) | Join existing transaction if one exists. Create new if none exists. |
| `REQUIRES_NEW` | Always start a brand new transaction. Suspend the existing one. Commit/rollback independently. |
| `NESTED` | If existing transaction — execute as a savepoint inside it. If none — like REQUIRED. |
| `SUPPORTS` | If existing transaction — participate. If none — run without a transaction. |
| `NOT_SUPPORTED` | Always run WITHOUT a transaction. Suspend existing if any. |
| `NEVER` | Run without a transaction. Throw exception if a transaction exists. |
| `MANDATORY` | Must run within an existing transaction. Throw exception if none exists. |

### Isolation Levels — What You Can See

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-----------------|------------|--------------------|-|
| `READ_UNCOMMITTED` | ✅ Possible | ✅ Possible | ✅ Possible |
| `READ_COMMITTED` | ❌ Prevented | ✅ Possible | ✅ Possible |
| `REPEATABLE_READ` | ❌ Prevented | ❌ Prevented | ✅ Possible |
| `SERIALIZABLE` | ❌ Prevented | ❌ Prevented | ❌ Prevented |

- **Dirty Read**: You read data that another transaction hasn't committed yet — if that transaction rolls back, you read data that never existed.
- **Non-Repeatable Read**: You read the same row twice in the same transaction and get different values — another transaction committed a change in between.
- **Phantom Read**: You run the same query twice and get different numbers of rows — another transaction inserted or deleted rows in between.

### ASCII Diagram

```
@Transactional Proxy Flow
────────────────────────────────────────────────────────────────────────
  Caller
    |
    v
  OrderServiceProxy (CGLIB proxy)
    |
    ├── TransactionInterceptor.invoke()
    |     ├── read @Transactional metadata (propagation=REQUIRED, isolation=DEFAULT)
    |     ├── PlatformTransactionManager.getTransaction()
    |     |     └── check ThreadLocal: existing transaction? NO → create new
    |     |     └── get connection from HikariCP
    |     |     └── conn.setAutoCommit(false)
    |     |     └── bind connection to ThreadLocal (TransactionSynchronizationManager)
    |     |
    |     ├── call actual OrderService.createOrder()
    |     |     ├── orderRepository.save()   ← uses same ThreadLocal connection
    |     |     ├── inventoryService.update() ← if @Transactional(REQUIRED), joins THIS transaction
    |     |     └── [no exception] return order
    |     |
    |     └── PlatformTransactionManager.commit()
    |           └── conn.commit()
    |           └── conn returned to HikariCP pool
    v
  Caller gets result

IF RuntimeException thrown inside:
    └── PlatformTransactionManager.rollback()
         └── conn.rollback()
         └── conn returned to pool
────────────────────────────────────────────────────────────────────────

REQUIRED vs REQUIRES_NEW
────────────────────────────────────────────────────────────────────────
  OuterService.doWork()                 AuditService.log()
  @Transactional(REQUIRED)             @Transactional(REQUIRES_NEW)
  ┌──────────────────────┐             ┌────────────────────────┐
  │  TX A starts         │             │  TX A SUSPENDED        │
  │  orderRepo.save()    │             │  TX B starts (new)     │
  │  ─────────────────── │ ──calls──>  │  auditRepo.save()      │
  │  TX B completes      │ <─returns─  │  TX B commits          │
  │  TX A resumes        │             └────────────────────────┘
  │  [exception in A]    │             (TX B already committed — not rolled back)
  │  TX A rolls back     │
  └──────────────────────┘
  ← audit log IS saved even though outer TX failed (important for audit!)
────────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
@Service
public class OrderService {

    @Transactional
    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(new Order(request));
        try {
            paymentService.initiate(order); // this throws a checked exception
        } catch (PaymentException ex) {
            // WRONG: catching a checked exception and rethrowing is fine IF you rethrow unchecked
            // But this code just logs and returns — the transaction COMMITS even though payment failed!
            log.error("Payment failed", ex);
            return null; // transaction commits here — order is saved, payment is NOT
        }
        return order;
    }
}
```
> **Why this fails in production:** Spring only rolls back on unchecked exceptions by default. `PaymentException` (a checked exception) swallowed in a catch block means the transaction commits successfully. Your order is saved in the database but no payment was initiated. The customer has an order with no payment — a real data integrity bug.

### Right Way — Production Quality
```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final AuditService auditService;

    public OrderService(OrderRepository orderRepository,
                        PaymentService paymentService,
                        AuditService auditService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
        this.auditService = auditService;
    }

    @Transactional
    // Default: REQUIRED propagation — creates TX or joins existing
    // Default: rolls back on RuntimeException and Error ONLY
    // readOnly=false — we are writing, so false is correct
    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(new Order(request));
        // If initiate() fails with ANYTHING, convert to RuntimeException so rollback happens
        paymentService.initiate(order);
        // If we reach here, both save and initiate succeeded — commit will happen
        return order;
    }

    // Explicit rollback for checked exceptions:
    // rollbackFor tells Spring: rollback even if this checked exception escapes
    @Transactional(rollbackFor = {PaymentException.class, InventoryException.class})
    public Order createOrderWithCheckedExceptions(OrderRequest request) throws PaymentException {
        Order order = orderRepository.save(new Order(request));
        paymentService.initiateChecked(order); // throws PaymentException (checked)
        return order;
    }

    // readOnly=true — hints to the DB and connection pool that no writes happen
    // Allows DB to skip dirty tracking, use read replicas, optimize resources
    @Transactional(readOnly = true)
    public Optional<Order> findById(Long id) {
        return orderRepository.findById(id);
    }
}
```

```java
// Correct use of REQUIRES_NEW for audit logging
// Audit entries must persist EVEN IF the main transaction rolls back
@Service
public class AuditService {

    private final AuditRepository auditRepository;

    public AuditService(AuditRepository auditRepository) {
        this.auditRepository = auditRepository;
    }

    // REQUIRES_NEW: always starts its own transaction
    // When called from inside OrderService's transaction:
    //   - OrderService's transaction is SUSPENDED
    //   - this method's transaction starts, commits independently
    //   - then OrderService's transaction resumes
    // Result: audit record is saved even if OrderService's TX rolls back later
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordEvent(AuditEvent event) {
        auditRepository.save(new AuditEntry(event));
        // This commits BEFORE returning to OrderService
        // Even if OrderService later throws and rolls back — this record stays
    }
}
```

### Configuration
```yaml
# application.yml
spring:
  jpa:
    # show-sql: true logs every SQL statement — great for dev, remove in production
    show-sql: true
    properties:
      hibernate:
        # format_sql: true makes the logged SQL readable
        format_sql: true
        # default isolation level — matches what your DB uses
        # Spring Boot uses DB default if not specified
        connection:
          provider_disables_autocommit: true

# @Transactional timeout — set to avoid holding DB connections forever on slow operations
# Can set globally via TransactionManagementConfigurer or per-method: @Transactional(timeout=30)
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does @Transactional work? What happens when the annotated method throws an exception?"

**Hruday's answer:**
> `@Transactional` works through Spring AOP. When Spring creates a bean that has `@Transactional` methods, it wraps the bean in a proxy. The proxy holds a `TransactionInterceptor` that runs around every transactional method call.
>
> When you call a `@Transactional` method, the interceptor asks the `PlatformTransactionManager` to start or join a transaction. The database connection is bound to the current thread via `TransactionSynchronizationManager`. Every database call in your method uses this same connection, so they are all part of the same transaction.
>
> If the method completes without throwing: the interceptor calls `transactionManager.commit()`. All SQL writes become permanent.
>
> If a `RuntimeException` or `Error` escapes: the interceptor calls `transactionManager.rollback()`. All changes are undone.
>
> Important: if a **checked exception** escapes, Spring commits by default. It does NOT rollback automatically. To rollback on a checked exception, you must use `@Transactional(rollbackFor=MyCheckedException.class)`.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the difference between REQUIRED and REQUIRES_NEW propagation? Give a real use case."

**Hruday's answer:**
> `REQUIRED` means: if there is already a transaction running on this thread, join it. If not, start a new one. This is the default and it is what you want most of the time — all the work in a single unit.
>
> `REQUIRES_NEW` means: always start a completely new, independent transaction. If there is already one, suspend it. My transaction commits or rolls back independently of the outer one.
>
> The classic use case is audit logging. You want to record an audit entry for every order creation attempt — even failed ones. If audit logging uses `REQUIRED`, it joins the OrderService transaction. When OrderService rolls back (e.g., payment fails), the audit log entry ALSO rolls back — and you lose the record of the failed attempt.
>
> If audit logging uses `REQUIRES_NEW`, it gets its own transaction. OrderService suspends, audit commits, OrderService resumes. Even if OrderService rolls back, the audit entry is already committed. Your compliance log is complete.
>
> The trade-off: `REQUIRES_NEW` uses TWO database connections from the pool simultaneously during the outer transaction. On a high-traffic system with MANY nested transactions, this doubles connection consumption. Design carefully.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the risks of using @Transactional on everything?"

**Hruday's answer:**
> Overusing `@Transactional` causes three real problems.
>
> First: long-held database connections. A transaction holds a DB connection from start to finish. If your `@Transactional` method does a database save, then calls a slow external HTTP API (200ms), then does another DB operation — your connection is held for 200ms+ doing nothing while the HTTP call is happening. At 100 concurrent requests, you chew through the connection pool. Fix: do external calls BEFORE or AFTER the transaction, not inside it.
>
> Second: the lazy loading trap. If `readOnly=false` (or not set) on a read-only query method, Hibernate flushes the session before any query — it checks every tracked entity for modifications. On large datasets this is unnecessary work. Use `@Transactional(readOnly = true)` for read-only methods to skip the flush.
>
> Third: the self-call proxy bypass. Annotating a PRIVATE method `@Transactional` or calling a `@Transactional` method from within the same class — no transaction starts. These are silent bugs that look fine in unit tests but cause integrity issues in production.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You process orders that span three microservices — order-service, inventory-service, payment-service. Each has its own database. You can't use a single @Transactional. How do you maintain consistency?"

**Hruday's answer:**
> A single `@Transactional` only works within one database connection — it cannot span multiple services with separate databases. This is a distributed transaction problem. The solution is the Saga pattern.
>
> Saga means: break the operation into a sequence of local transactions, each in its own service. If one step fails, issue compensating transactions to undo the previous steps.
>
> Choreography-style Saga: each service listens to events and reacts. OrderService saves an order and emits `OrderCreated`. InventoryService listens, decrements stock, emits `InventoryReserved`. PaymentService listens, charges the card, emits `PaymentCompleted`. OrderService listens and marks the order as confirmed. If PaymentService fails, it emits `PaymentFailed`. InventoryService listens and restores stock. OrderService cancels the order.
>
> Each step has a local `@Transactional` — the transaction is scoped to that service's database. The overall consistency comes from event choreography.
>
> The key challenge is the Outbox pattern — when OrderService saves the order and publishes `OrderCreated`, the save and the publish must happen atomically. If the save succeeds but the event is never sent, the saga is stuck. The Outbox pattern writes the event to an `outbox` table in the same local transaction. A separate polling process reliably publishes it to Kafka.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Rollback on checked exceptions" | "Spring always rolls back on exceptions" | "No. Spring rolls back ONLY on RuntimeException and Error by default. Checked exceptions (like IOException, SQLException thrown directly) cause a COMMIT unless you add rollbackFor=MyException.class. This is a very common data integrity bug." |
| "Self-call @Transactional" | "If the method has @Transactional, calling it starts a transaction" | "Calls from within the same class bypass the proxy. this.myTransactionalMethod() calls the real object directly — no proxy, no transaction. Fix: restructure to call from another bean, or inject self (applicationContext.getBean())." |
| "REQUIRES_NEW is safe to use freely" | "It just starts a new transaction — no downside" | "REQUIRES_NEW holds TWO database connections simultaneously: the suspended outer and the new inner. In a high-load system with a pool of 20 connections, nested REQUIRES_NEW calls double connection consumption and can exhaust the pool. Use judiciously." |
| "@Transactional on private methods" | "Works normally" | "No. Spring AOP proxies cannot intercept private methods — they can only intercept public methods. A private @Transactional method compiles fine but the annotation is completely ignored at runtime." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we had a bug where order creation appeared to succeed but payments were not being initiated. The root cause: `PaymentService.initiate()` threw a checked `PaymentGatewayException`. The `OrderService.createOrder()` method was `@Transactional`, caught the exception, logged it, and returned `null`. Since `PaymentGatewayException` was checked, Spring committed the transaction — the order was saved but no payment record existed. We fixed it by adding `rollbackFor = PaymentGatewayException.class` to the `@Transactional` annotation. That one attribute change stopped silent data corruption that had been happening for weeks."

---

## 8. Scale Evolution

**1,000 users →** Default `@Transactional` with default HikariCP pool (10 connections) is fine. Transactions are short (milliseconds). No connection pressure.

**100,000 users →** Connection pool becomes a bottleneck. Audit that every `@Transactional` method does not make external HTTP calls inside the transaction (that holds connections). Use `readOnly=true` on all read methods — this allows HikariCP to route to read replicas. Tune the pool size to match your load: `maximumPoolSize = ((core_count * 2) + effective_spindle_count)`.

**10 million users →** Single-DB transactions are fast, but long transactions at scale need careful design. For bulk operations (processing millions of rows), use pagination + chunked transactions (each page in its own transaction via `REQUIRES_NEW`) to avoid locking table ranges. For cross-service operations, the single `@Transactional` doesn't span services — use Saga with the Outbox pattern. The Outbox table gets its own polling infrastructure with exactly-once delivery guarantees.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial transactions MUST be ACID-compliant. Every payment, refund, and transfer uses @Transactional carefully. Checked-exception rollback gotchas can cause real money loss. | "@Transactional deep dive is mandatory. Expect a scenario: 'PaymentService throws IOException — does the transaction rollback?'" |
| Swiggy / Meesho | High-volume order processing. Connection pool management under load is real. REQUIRES_NEW for audit is a real pattern they use. | "How would you ensure audit logs are written even when order creation fails?" |
| Adobe / Microsoft | Complex enterprise workflows spanning multiple repositories in one service. Nested transaction propagation and isolation management are routine. | "Explain NESTED propagation and when you'd use it over REQUIRES_NEW." |
| Remote / Global roles | @Transactional is universal Spring Boot knowledge. Combined with Saga for distributed systems, it is the core of backend data integrity. | "How do you maintain data consistency in a microservices system where each service has its own DB?" |

---

## 10. Related Topics — What to Study Next

- **Topic 40 — Spring AOP** — `@Transactional` is implemented as AOP — the proxy, the self-call bypass, and advice ordering all come from AOP internals
- **Topic 49 — Database Transactions and ACID** — `@Transactional` is the Spring API layer; ACID properties are the database guarantee layer — understand both together
- **Topic 76 — Saga Pattern** — when `@Transactional` is not enough (multiple services) — Saga is the distributed alternative
- **Topic 79 — Outbox Pattern** — reliable event publishing tied to local `@Transactional` — the right way to bridge local transactions and distributed messaging
- **Topic 50 — Optimistic vs Pessimistic Locking** — locking strategies interact directly with `@Transactional` isolation levels and propagation

---

*Part 3 · @Transactional Internals · Full Stack Interview Guide · Hruday D · 2026*
