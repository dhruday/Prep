# Database Transactions — ACID Properties
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **ACID** = Atomicity, Consistency, Isolation, Durability — the four guarantees a relational database transaction provides
- **Atomicity**: all operations in the transaction commit together, or NONE of them do — no partial writes
- **Consistency**: a transaction moves the database from one valid state to another — all constraints (PK, FK, CHECK) must hold after commit
- **Isolation**: concurrent transactions do not see each other's intermediate/uncommitted state (to varying degrees based on isolation level)
- **Durability**: once committed, the data survives crashes — it is written to WAL (Write-Ahead Log) before the response is returned to you
- Gap to bridge: ACID is EXPENSIVE — achieving full ACID requires locking, WAL writes, log syncing. Understanding the trade-offs helps you decide when to relax isolation for performance

---

## 1. One-Line Definition
ACID is the set of four properties that a database transaction must satisfy to guarantee correct, reliable operation even in the presence of concurrent users and system failures.

---

## 2. The Problem It Solves

Imagine a payment transfer: deduct ₹5000 from Account A and add ₹5000 to Account B. This is two SQL UPDATE statements.

**Without ACID:**

Without Atomicity: the server crashes after the deduction but before the deposit. ₹5000 disappears — neither in A nor in B. Money is created or destroyed.

Without Isolation: two simultaneous transfers from Account A both read the balance as ₹10000, both subtract ₹5000 and write ₹5000. Account A should have ₹0 but has ₹5000 — money was created from nothing.

Without Durability: the database confirms the transfer but crashes before writing to disk. When it restarts, the transfer is gone. Consistent state is lost.

ACID guarantees that these scenarios are impossible. Databases are designed with financial data in mind — the rules are not bureaucratic formalities, they are correctness guarantees that make distributed coordination possible.

---

## 3. How It Works Internally

### The Mental Model
Think of ACID as the four promises a bank makes when you do a transfer at the counter. **Atomicity**: "Either both accounts are updated or neither is — we will NOT stop in the middle." **Consistency**: "The books will balance before and after — no invalid entry." **Isolation**: "Your transfer is private until complete — other customers don't see your deduction until we verify the deposit." **Durability**: "We wrote it in permanent ink — even if the building burns down tonight, your deposit will be in tomorrow's records."

### The Mechanism — Property by Property

#### Atomicity
The database writes all SQL changes to a **transaction log** (WAL — Write-Ahead Log) BEFORE applying them to the actual data files. When you commit, the log entry is synced to disk first. Only then are data files updated. If the server crashes mid-transaction (before the commit entry in the WAL), the database replays the log on restart and decides: "incomplete transaction — rollback all its changes."

#### Consistency
Consistency is partly the database's job and partly yours. The database enforces: constraints (NOT NULL, CHECK, UNIQUE), foreign key integrity, and data types. These are checked at every write. If your transaction violates any constraint, the entire transaction is rejected. Your job: design your schema with correct constraints so "valid state" is well-defined.

#### Isolation
The database uses **locks** and **MVCC** (Multi-Version Concurrency Control) to control how much of other transactions' work is visible.

**Locking approach**: each row or table gets a lock when modified. Other transactions wanting to read or write that row must wait. Simple but slow under high contention.

**MVCC** (used by PostgreSQL, MySQL InnoDB): instead of locking readers, the database keeps **multiple versions** of a row. Each transaction reads the version of the row that was committed before the transaction started. Writers create new versions. This allows readers and writers to run concurrently without blocking each other. Most modern databases use MVCC.

**Isolation levels** (from least to most strict):
- `READ UNCOMMITTED`: see uncommitted data from other transactions (dirty reads possible). Almost never used.
- `READ COMMITTED`: only see committed data. Default for PostgreSQL and most databases. Cannot prevent non-repeatable reads.
- `REPEATABLE READ`: rows you read at the start of the transaction return the same data if read again — prevents non-repeatable reads. MySQL InnoDB default.
- `SERIALIZABLE`: complete isolation — transactions behave as if run one at a time. Prevents phantom reads. Slowest — requires range locks or predicate locks.

#### Durability
When you call `COMMIT`, the database does NOT consider the transaction committed until the WAL entry for it is flushed to persistent storage (SSD/disk). This fsync (force sync) is the slowest single operation in a database transaction. The WAL is sequential append — much faster than updating data files in place. But the fsync still adds 1-5ms of latency to every commit.

For high-throughput systems, you can trade durability for speed: `synchronous_commit=off` in PostgreSQL means the server acknowledges the commit before fsyncing. If the server crashes in the next 0.6s (PostgreSQL's wal_writer_delay), you lose the last few transactions. Acceptable for non-critical data, NOT acceptable for financial data.

### ASCII Diagram

```
ACID in Action — Money Transfer
────────────────────────────────────────────────────────────────────────

BEGIN TRANSACTION
  1. UPDATE accounts SET balance = balance - 5000 WHERE id = 'A'
  2. UPDATE accounts SET balance = balance + 5000 WHERE id = 'B'
COMMIT

Atomicity:
  ┌──────────────────────────────────────────────────────────────────┐
  │ Write-Ahead Log (WAL) — written BEFORE data files              │
  │  [TXN-001] DEDUCT A 5000                                        │
  │  [TXN-001] CREDIT B 5000                                        │
  │  [TXN-001] COMMIT                                               │
  └──────────────────────────────────────────────────────────────────┘
  → fsync WAL to disk → ACK to client → Update data files
  → Crash before COMMIT entry? → Replay replays nothing → Rollback
  → Crash after COMMIT entry? → Data files updated on restart → Durable

Isolation — MVCC (PostgreSQL):
  Transaction T1 (read A's balance)    Transaction T2 (transfer in progress)
  t=0: BEGIN                           t=0: BEGIN
  t=1: SELECT balance FROM A           t=1: UPDATE A SET balance = balance - 5000
       → sees version BEFORE T2        t=2: [not committed yet]
       → reads 10000 (old version)
                                       t=3: COMMIT → new version visible
  t=4: SELECT balance FROM A
       (if REPEATABLE READ)
       → still reads 10000 (from snapshot at t=0)
       (if READ COMMITTED)
       → reads 5000 (new committed version)
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Manual transaction management — error-prone consistency
@Service
public class WalletService {

    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        // WRONG: no transaction wrapping — if anything fails between these two calls,
        // the database is in an inconsistent state
        accountRepository.deductBalance(fromId, amount);  // Step 1 succeeds
        accountRepository.creditBalance(toId, amount);    // Step 2 could fail!
        // If Step 2 throws: deduction happened, credit didn't — money lost
        // Atomicity is BROKEN without a transaction around both operations
    }
}
```
> **Why this fails in production:** Without wrapping both operations in a single transaction, a failure after the first and before the second leaves the database in a state that satisfies no business rule. In financial services this is a regulatory violation, not just a bug.

### Right Way — Production Quality
```java
// @Transactional ensures atomicity — both operations commit together or neither does
@Service
public class WalletService {

    private final AccountRepository accountRepository;
    private final TransactionAuditRepository auditRepository;

    public WalletService(AccountRepository accountRepository,
                         TransactionAuditRepository auditRepository) {
        this.accountRepository = accountRepository;
        this.auditRepository = auditRepository;
    }

    // REQUIRED (default): both operations are in ONE transaction
    // If creditBalance throws: ENTIRE transaction rolls back — deduction also undone
    // Atomicity guaranteed
    @Transactional
    public TransferResult transfer(Long fromId, Long toId, BigDecimal amount) {
        Account from = accountRepository.findById(fromId)
            .orElseThrow(() -> new AccountNotFoundException(fromId));
        Account to = accountRepository.findById(toId)
            .orElseThrow(() -> new AccountNotFoundException(toId));

        // Consistency check: enforced by both code (below) and DB constraint (CHECK balance >= 0)
        if (from.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(fromId);
        }

        from.setBalance(from.getBalance().subtract(amount));   // deduct
        to.setBalance(to.getBalance().add(amount));            // credit

        accountRepository.save(from);    // both in same transaction
        accountRepository.save(to);      // commit if both succeed, rollback if either fails

        return new TransferResult(from.getBalance(), to.getBalance());
    }

    // Audit logging uses REQUIRES_NEW to ensure it commits even if the main TX rolls back
    // This ensures we always have a record of the attempt, successful or not
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void auditTransfer(Long fromId, Long toId, BigDecimal amount, boolean success) {
        auditRepository.save(new TransferAudit(fromId, toId, amount, success, Instant.now()));
    }
}
```

### Setting Isolation Level in Spring
```java
// Most use cases: READ_COMMITTED is correct (PostgreSQL default)
// REPEATABLE_READ: when you read a value, compute based on it, and expect it unchanged:
@Transactional(isolation = Isolation.REPEATABLE_READ)
public void computeAndUpdate(Long accountId) {
    Account account = accountRepository.findById(accountId).orElseThrow();
    BigDecimal interest = account.getBalance().multiply(interestRate); // computed from balance
    // Without REPEATABLE_READ: balance could change between the two reads
    account.setBalance(account.getBalance().add(interest)); // must see same balance
    accountRepository.save(account);
}

// SERIALIZABLE: the strongest isolation — for critical financial reconciliation
// Highest correctness, lowest throughput
@Transactional(isolation = Isolation.SERIALIZABLE)
public void reconcileAccounts() {
    // This sees a perfectly consistent snapshot of the entire database
    // No phantom rows, no non-repeatable reads, no dirty reads
    // Performance cost: range locks prevent all concurrent modifications to affected rows
}
```

### Configuration — Database Level
```sql
-- PostgreSQL: set default isolation level  
-- Your Spring @Transactional(isolation=...) overrides this per-transaction
ALTER DATABASE orderdb SET default_transaction_isolation TO 'read committed';

-- Check current isolation level
SHOW transaction_isolation;

-- For HIGHEST DURABILITY (safest for financial data)
ALTER SYSTEM SET synchronous_commit = 'on';  -- default, ensures WAL flush before ACK
-- For HIGHEST PERFORMANCE (acceptable for analytics, NOT for payments)
ALTER SYSTEM SET synchronous_commit = 'off'; -- ACK before WAL flush — risks last-few-transactions loss
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What does ACID stand for? Explain each property with an example."

**Hruday's answer:**
> ACID stands for Atomicity, Consistency, Isolation, and Durability.
>
> Atomicity means all-or-nothing. A bank transfer updates two accounts — deduct from A, credit B. If the credit fails, the deduction must also be undone. Without atomicity, money disappears. Spring's `@Transactional` ensures both writes are wrapped in one database transaction.
>
> Consistency means the database moves from one valid state to another. If account balance has a CHECK constraint `balance >= 0`, a transaction that would violate it is rejected — the entire transaction, not just the violating operation.
>
> Isolation means concurrent transactions do not interfere. If two transactions simultaneously read account A's balance and both try to deduct, isolation ensures they cannot both see the same starting balance and both commit — one will see the other's change and must retry. The level of isolation is configurable — READ_COMMITTED vs REPEATABLE_READ vs SERIALIZABLE.
>
> Durability means committed data survives failures. The database writes to a Write-Ahead Log (fsynced to disk) BEFORE confirming the commit. If the server crashes seconds later, the log is replayed and the committed data is recovered. At Oracle, I relied on this during a database instance restart — all committed orders were perfectly intact after restart.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does MVCC (Multi-Version Concurrency Control) enable isolation without heavy locking?"

**Hruday's answer:**
> MVCC is the mechanism that allows readers and writers to run concurrently without blocking each other — which is why PostgreSQL and MySQL can handle high read throughput without read locks.
>
> Here is how it works. Instead of locking a row when a writer modifies it, the database creates a NEW VERSION of the row with the update applied. The old version stays in place. Each row version has a creation transaction ID and a deletion transaction ID.
>
> When a reader starts a transaction, it gets a snapshot — a timestamp (or transaction ID) representing "what the database looked like when I started." When it reads a row, it looks for the version that was committed before its snapshot and not yet deleted. It always reads a consistent past state — it never sees uncommitted changes.
>
> Writers create new versions. Old versions accumulate until PostgreSQL's VACUUM process removes versions that no transaction can ever read again.
>
> The result: readers never block writers and writers never block readers. The database maintains multiple consistent views simultaneously. This is why you can run a long report query without blocking the payment service's writes — they live in different versions of the data.
>
> The trade-off: old row versions consume disk space (table bloat) until VACUUM cleans them. On very high-write databases, you must tune VACUUM aggressively to prevent bloat.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you relax ACID guarantees? Give real examples."

**Hruday's answer:**
> ACID is expensive. Full ACID requires WAL syncing, locking coordination, and version tracking. In certain scenarios, relaxing one or more properties for performance is a valid trade-off.
>
> First: relaxing isolation level. `READ_COMMITTED` instead of `SERIALIZABLE` is the right choice for most read operations. A product listing page does not need to see a perfectly consistent snapshot — if a price changed 50ms ago, the user seeing the new price is fine. Using SERIALIZABLE for this would add range locks and hurt throughput by 10x.
>
> Second: relaxing durability for analytics. Event processing pipelines that aggregate click events or page views often use `synchronous_commit=off` in PostgreSQL. Losing a few analytics events in a crash has no business impact. This doubles write throughput.
>
> Third: NoSQL databases. MongoDB, Cassandra, and DynamoDB sacrifice ACID in various ways to achieve horizontal scalability. MongoDB supports single-document atomicity but not cross-document atomicity (without multi-document transactions). Cassandra uses eventual consistency — a write may not be immediately visible to all replicas.
>
> The rule: relax ACID only when the business impact of the specific property's failure is acceptable and you have a recovery mechanism. For financial data — never relax. For analytics events — often acceptable with proper staleness bounds.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the transaction handling for a payment service that transfers money between two accounts and logs the audit trail. The audit must persist even if the transfer fails."

**Hruday's answer:**
> This classic problem requires two transactions with different isolation requirements.
>
> The transfer itself needs `@Transactional` with the default REQUIRED propagation and REPEATABLE_READ isolation — I want to read balances once and have them stable for the duration of the computation.
>
> The audit log needs `@Transactional(propagation=REQUIRES_NEW)`. This is critical: the audit must commit in its own transaction, independent of the transfer. If the transfer fails and rolls back, the audit of the attempt must still be written — for compliance and reconciliation.
>
> Additionally, the audit write must be idempotent. If the app crashes after the transfer commits but before the audit commits, the audit might be re-tried. Adding a unique constraint on (transfer_id, event_type) prevents duplicate audit entries.
>
> For the transfer itself, I use optimistic locking: `@Version` field on the Account entity. The UPDATE includes `WHERE version = current_version` — if another transaction committed a balance change between my read and write, my UPDATE affects 0 rows, Hibernate throws `OptimisticLockException`, and the caller retries. No pessimistic lock required, higher concurrency.
>
> This design: Atomicity (single transfer transaction), Consistency (balance >= 0 check + DB constraint), Isolation (REPEATABLE_READ for stable reads), Durability (WAL), and audit durability (REQUIRES_NEW separate transaction).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "ACID is all-or-nothing" | "Yes, either everything commits or nothing does" | "That describes Atomicity specifically. ACID is four separate properties. Consistency is about constraints holding. Isolation is about concurrent visibility. Durability is about crash survivability. Knowing which property is at risk in a given scenario is the senior-level answer." |
| "What is dirty read?" | "Reading uncommitted data" | "Correct. But the deeper point: a dirty read can cause cascading incorrect decisions. You read an uncommitted balance of ₹10000, approve a loan based on it, then the original transaction rolls back and the balance was actually ₹0. READ_COMMITTED (the default) prevents this — you only see committed data." |
| "SERIALIZABLE is always safest to use" | "Yes, use it for all critical operations" | "SERIALIZABLE is the most correct but also the most expensive. It requires predicate locking or serialisation snapshot isolation — significantly reducing throughput under concurrent writes. Use REPEATABLE_READ for most financial reads, SERIALIZABLE only when phantom read prevention is business-critical (e.g., uniqueness enforcement when application-level constraints are insufficient)." |
| "Durability = data is backed up" | "Right, backups make data durable" | "Durability means committed data survives SYSTEM CRASHES (power loss, OS crash). It is about WAL syncing to disk. Backups are for disaster recovery (hardware failure, data centre fire) — that is a different concern. You need BOTH: durable transactions AND backups." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we had a batch job that processed thousands of vendor invoices — each invoice triggered two writes: update the invoice status and insert a payment record. An early version ran each write in its own transaction. When a database connection dropped mid-batch, some invoices had their status updated but no payment record created. The finance team found the discrepancy during month-end reconciliation. We wrapped both writes in a single `@Transactional` method with `rollbackFor=Exception.class`. From then on, every invoice had either both records or neither — Atomicity meant no more reconciliation surprises."

---

## 8. Scale Evolution

**1,000 users →** Full ACID with `SERIALIZABLE` isolation for financial writes, `READ_COMMITTED` for reads. No performance concerns at this scale. Focus on correctness.

**100,000 users →** SERIALIZABLE isolation creates lock contention on hot account rows. Use `REPEATABLE_READ` for most operations — prevents read anomalies but allows more concurrency. Add database-level unique constraints to support optimistic locking patterns — let the DB enforce uniqueness rather than application-level locks.

**10 million users →** Single-node ACID has limits. High-write accounts (platform wallet, escrow) become contention hotspots — every transfer locks the wallet row. Solutions: (1) Batch aggregation — buffer individual writes in Redis, apply to DB in batch transactions. (2) Idempotency tables — track payment idempotency keys to allow safe retries. (3) Saga pattern — replace the single distributed transaction with a sequence of local ACID transactions with compensating actions. Single-DB ACID scales to tens of thousands of TPS; beyond that, distribute the problem.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | ACID is the foundation of financial correctness. Every payment, refund, and settlement must be atomic and durable. ACID knowledge is table stakes. | "Explain precisely how a bank transfer is made safe against crashes using ACID properties." |
| Swighy / Meesho | High-frequency order writes and refund operations. They balance ACID correctness with performance using isolation level selection and optimistic locking. | "How would you handle concurrent order creation from the same customer account to prevent double bookings?" |
| Adobe / Microsoft | Document management and subscription billing require transaction correctness. They care that engineers understand ACID deeply, not just as buzzwords. | "A subscription billing job timed out mid-run. What's the state of the database? How do you recover?" |
| Remote / Global roles | ACID is a universal distributed systems concept. Combined with CAP theorem understanding, it shows systems thinking maturity. | "Compare ACID and BASE (Basically Available, Soft state, Eventually consistent). When would you choose each?" |

---

## 10. Related Topics — What to Study Next

- **Topic 44 — @Transactional Internals** — the Spring layer that implements Atomicity and Isolation via `PlatformTransactionManager`
- **Topic 50 — Optimistic vs Pessimistic Locking** — locking strategies implement Isolation at a finer granularity than isolation level setting
- **Topic 95 — Database Isolation Levels** — deep dive into READ_COMMITTED vs REPEATABLE_READ vs SERIALIZABLE with real anomaly examples
- **Topic 77 — Two-Phase Commit (2PC)** — distributed ACID across multiple databases — why it is avoided and what to use instead
- **Topic 76 — Saga Pattern** — the distributed alternative to ACID when services have separate databases — trading Atomicity for availability

---

*Part 3 · Database Transactions — ACID Properties · Full Stack Interview Guide · Hruday D · 2026*
