# Database Isolation Levels — READ COMMITTED, REPEATABLE READ, SERIALIZABLE
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Isolation level = a setting that controls how much one in-progress transaction can see the uncommitted changes (or committed changes that happened while it was running) of other concurrent transactions. It is a direct trade-off: higher isolation = stronger consistency guarantees, higher performance cost.
- The four concurrency anomalies that isolation levels protect against:
  1. Dirty read: reading another transaction's UNCOMMITTED data
  2. Non-repeatable read: reading the same row twice in one transaction, seeing different values because another transaction COMMITTED between the two reads
  3. Phantom read: running the same query twice in one transaction and seeing DIFFERENT ROWS because another transaction inserted/deleted rows between the two queries
  4. Lost update: two transactions both read X=10, both compute X+1=11, both write 11 — even though two increments happened, the result is 11 not 12
- READ UNCOMMITTED: no protection (reads dirty data — almost never used in practice; Postgres implements it as READ COMMITTED)
- READ COMMITTED (Postgres default): protects against dirty reads only. Sees only committed data but may see different data on two reads within the same transaction (non-repeatable reads allowed).
- REPEATABLE READ: protects against dirty reads AND non-repeatable reads. Same row returns same value in one transaction. But phantom reads are possible (new rows from another transaction may appear). Postgres also prevents phantom reads here.
- SERIALIZABLE: full protection — transactions execute as if they were completely sequential (even though they run concurrently). Prevents all anomalies. Highest performance cost.
- Spring annotation: `@Transactional(isolation = Isolation.REPEATABLE_READ)`
- Gap to bridge: candidates can recite the four levels but cannot explain the lost-update problem, why SELECT FOR UPDATE is needed even in REPEATABLE READ, or how SERIALIZABLE works without locking in Postgres (SSI — Serializable Snapshot Isolation)

---

## 1. One-Line Definition
A transaction isolation level defines the rules for how and when the changes made by one transaction become visible to other concurrent transactions — balancing data consistency against the performance cost of stricter isolation.

---

## 2. The Problem It Solves

```
SCENARIO: Two API requests arrive simultaneously for the same account.

Account balance: ₹1,000

Request A (withdraw ₹300):                Request B (withdraw ₹800):
  T=1: BEGIN TRANSACTION                    T=1: BEGIN TRANSACTION
  T=2: SELECT balance FROM accounts         T=2: SELECT balance FROM accounts
       WHERE id = 'ACC-1'                        WHERE id = 'ACC-1'
       → returns 1000                            → returns 1000
  T=3: Check: 1000 >= 300? YES              T=3: Check: 1000 >= 800? YES
  T=4: UPDATE balance = 1000 - 300 = 700    T=4: UPDATE balance = 1000 - 800 = 200
  T=5: COMMIT                               T=5: COMMIT
  
Result: balance = 200
  Both withdrawals succeeded.
  Account was overdrawn: ₹300 + ₹800 = ₹1100 withdrawn from ₹1000.
  This is a LOST UPDATE anomaly.
  
WITHOUT correct isolation: the bank lost ₹100.
WITH correct isolation (SERIALIZABLE or SELECT FOR UPDATE): one transaction
  sees the other's write, fails the balance check, and gets rejected.

This is why isolation levels matter in financial systems.
```

---

## 3. How It Works Internally

### The Four Isolation Levels and What They Prevent

```
SQL Standard matrix (X = anomaly prevented, blank = can occur):

Level               | Dirty Read | Non-Repeatable | Phantom Read | Lost Update
--------------------|-----------|----------------|--------------|------------
READ UNCOMMITTED    |           |                |              |
READ COMMITTED      |     X     |                |              |
REPEATABLE READ     |     X     |       X        |              |   X (Postgres)
SERIALIZABLE        |     X     |       X        |      X       |   X
(Postgres adds phantom read prevention to REPEATABLE READ too)

DIRTY READ:
  T1 updates a row but has NOT committed.
  T2 reads that row and sees T1's uncommitted value.
  T1 rolls back.
  T2 acted on data that never really existed.
  
  Prevented by: READ COMMITTED and above.
  In practice: Postgres never allows dirty reads at any level.

NON-REPEATABLE READ:
  T1 reads row R at time t1 — value = 100.
  T2 updates row R, commits.
  T1 reads row R again at time t2 (still in same transaction) — value = 150.
  Same transaction, same query, different result.
  
  Prevented by: REPEATABLE READ — T1 sees a snapshot of the database as it was
  at the START of T1's transaction for all reads within the transaction.
  
PHANTOM READ:
  T1 runs SELECT * FROM orders WHERE amount > 1000 — returns 5 rows.
  T2 inserts a new order with amount=2000, commits.
  T1 runs the same query again — NOW returns 6 rows.
  A "phantom" row appeared within the same transaction.
  
  Prevented by: SERIALIZABLE (and in Postgres, also REPEATABLE READ for row-level;
  range locks or SSI prevents phantom reads in both).

LOST UPDATE (the bank account problem above):
  T1 reads X=100, T2 reads X=100.
  T1 computes X+50=150 and writes 150.
  T2 computes X+30=130 and writes 130.
  Final value: 130. T1's write is lost.
  
  Prevention options:
  1. SELECT FOR UPDATE: T1's read acquires a row lock. T2's SELECT FOR UPDATE
     waits until T1 commits. T2 then reads X=150 (T1's committed result).
  2. SERIALIZABLE: detects the conflict and aborts one of the transactions.
  3. Compare-and-swap: UPDATE SET balance = 150 WHERE balance = 100 + check rows_updated
```

### Postgres Isolation Level Implementation

```
Postgres uses MVCC (Multi-Version Concurrency Control) not traditional locking:

MVCC approach:
  Every UPDATE creates a NEW VERSION of the row with a transaction ID (xid).
  Old versions are kept until VACUUM cleans them up.
  
  Each transaction sees rows based on its "snapshot":
    - The snapshot is taken at the START of the first query in READ COMMITTED.
    - The snapshot is taken at the START of the TRANSACTION in REPEATABLE READ.
  
  "Sees a row" = the row's xmin (created by transaction) ≤ snapshot point
             AND the row's xmax (deleted by transaction) is either 0, or from a
             transaction that started after the snapshot point.

READ COMMITTED (Postgres default):
  Each individual statement gets a FRESH snapshot.
  Two SELECTs in the same transaction see different committed data = non-repeatable reads possible.
  
  BEGIN;
  SELECT balance FROM accounts WHERE id='ACC-1';  -- snapshot at t=10, sees 1000
  -- (other transaction commits, changes balance to 800)
  SELECT balance FROM accounts WHERE id='ACC-1';  -- new snapshot at t=15, sees 800
  COMMIT;
  
  Application must handle this: can't assume values stay stable within a transaction.

REPEATABLE READ:
  The whole transaction gets ONE snapshot taken at the start.
  All statements within the transaction see data as of that snapshot.
  
  BEGIN;
  SELECT balance FROM accounts WHERE id='ACC-1';  -- snapshot at t=10, sees 1000
  -- (other transaction commits, changes balance to 800) — NOT VISIBLE to this txn
  SELECT balance FROM accounts WHERE id='ACC-1';  -- SAME snapshot t=10, sees 1000
  COMMIT;
  
  But: WRITE operations can still conflict. If T1 tries to update a row that T2
  already modified and committed since T1's snapshot, Postgres detects this and
  throws: "ERROR: could not serialize access due to concurrent update"
  Application must retry the transaction.

SERIALIZABLE (SSI — Serializable Snapshot Isolation):
  Postgres uses SSI (not two-phase locking) — tracks read/write dependencies.
  If two concurrent transactions would produce a result impossible with any serial order:
    One transaction is aborted with: "ERROR: could not serialize access due to
    concurrent update / read/write conflict"
  Application must retry.
  SSI is more concurrent than 2PL (not just locked out — only aborted on actual conflict).
```

---

## 4. The Code

### Wrong Way — Using Default READ COMMITTED for Financial Operations
```java
// WRONG: Default READ COMMITTED for balance transfer — lost update possible
@Service
@RequiredArgsConstructor
public class WalletService {

    private final AccountRepository accountRepo;

    @Transactional  // default: READ COMMITTED (or whatever Spring's default is)
    public void transfer(String fromId, String toId, BigDecimal amount) {
        Account from = accountRepo.findById(fromId).orElseThrow();
        Account to = accountRepo.findById(toId).orElseThrow();

        // RACE CONDITION: Two concurrent transfer calls both read from.balance = 1000
        // Both check: 1000 >= amount (e.g., 800) → true
        // Both deduct: from.balance = 200
        // Both commit: from.balance ends up as 200, but 1600 was sent out
        if (from.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException("Insufficient balance");
        }

        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));

        accountRepo.save(from);
        accountRepo.save(to);
        // Without SELECT FOR UPDATE or SERIALIZABLE: race condition causes overdraft
    }
}
```
> **Why this fails:** Two concurrent transfer operations both read the same balance under READ COMMITTED. Neither sees the other's uncommitted change. Both pass the balance check. Both deduct. Result: overdraft.

### Right Way — SELECT FOR UPDATE or SERIALIZABLE for Financial Ops
```java
@Service
@RequiredArgsConstructor
public class WalletService {

    private final AccountRepository accountRepo;
    private final TransactionRepository transactionRepo;

    // Option 1: SELECT FOR UPDATE — pessimistic locking
    // Locks the rows immediately on read. Second concurrent call waits until first commit.
    @Transactional(isolation = Isolation.READ_COMMITTED)  // explicit though it's the default
    public void transfer(String fromId, String toId, BigDecimal amount) {

        // SELECT ... FOR UPDATE: acquires row-level exclusive lock
        // Second concurrent call blocks at this line until first call commits or rolls back
        // Then reads the UPDATED balance (not the one from before the first transfer)
        Account from = accountRepo.findByIdForUpdate(fromId)  // SELECT FOR UPDATE
            .orElseThrow(() -> new ResourceNotFoundException("Account: " + fromId));
        Account to = accountRepo.findByIdForUpdate(toId)      // SELECT FOR UPDATE
            .orElseThrow(() -> new ResourceNotFoundException("Account: " + toId));

        if (from.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(
                "Balance ₹" + from.getBalance() + " insufficient for transfer of ₹" + amount
            );
        }

        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));

        accountRepo.save(from);
        accountRepo.save(to);

        // Audit trail
        transactionRepo.save(Transaction.debit(fromId, amount, "transfer to " + toId));
        transactionRepo.save(Transaction.credit(toId, amount, "transfer from " + fromId));
    }

    // Option 2: SERIALIZABLE — optimistic, retry on conflict
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Retryable(
        retryFor = {PessimisticLockingFailureException.class,
                    CannotSerializeTransactionException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 50, multiplier = 2)
    )
    public void transferSerializable(String fromId, String toId, BigDecimal amount) {
        Account from = accountRepo.findById(fromId).orElseThrow();
        Account to = accountRepo.findById(toId).orElseThrow();

        if (from.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException("Insufficient balance");
        }

        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));

        accountRepo.save(from);
        accountRepo.save(to);
        // If Postgres detects a serialization conflict: throws an exception.
        // @Retryable retries the whole method up to 3 times with backoff.
    }
}

// Repository: SELECT FOR UPDATE using @Lock annotation
public interface AccountRepository extends JpaRepository<Account, String> {

    // JPA PESSIMISTIC_WRITE → SQL: SELECT ... FOR UPDATE
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdForUpdate(@Param("id") String id);

    // With timeout (fail fast if lock not acquired within 3 seconds)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "javax.persistence.lock.timeout", value = "3000"))
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdForUpdateWithTimeout(@Param("id") String id);
}
```

```java
// Where isolation levels map to Spring @Transactional:

@Transactional(isolation = Isolation.READ_UNCOMMITTED)  // Postgres: treated as READ_COMMITTED
@Transactional(isolation = Isolation.READ_COMMITTED)    // Postgres default — non-repeatable reads possible
@Transactional(isolation = Isolation.REPEATABLE_READ)  // snapshot, no non-repeatable reads, optimistic writes
@Transactional(isolation = Isolation.SERIALIZABLE)     // full SSI — may need retry on conflict

// Default (no isolation specified) = database default (READ_COMMITTED in Postgres)
// Set application-level default in application.yml:
// spring.jpa.properties.hibernate.connection.isolation=2  (2=READ_COMMITTED)
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between READ COMMITTED and REPEATABLE READ isolation levels?"

**Hruday's answer:**
> The difference is about when the transaction takes its "snapshot" of the database.
>
> In READ COMMITTED — Postgres's default — each individual SQL statement gets a fresh snapshot of all committed data at the moment that statement executes. If transaction T1 runs two SELECT queries, and between those two queries another transaction T2 commits a change, T1's second SELECT sees T2's change. The two reads in T1 can return different results — this is called a non-repeatable read.
>
> In REPEATABLE READ, the entire transaction gets one snapshot taken at the start. All SELECT queries within that transaction see the same state of the database — as it was when the transaction began. T2's committed changes are invisible to T1 for the rest of T1's life. The same query returns the same data on every execution within the transaction.
>
> The practical implication: for code that reads the same row multiple times within one transaction and needs stability — like computing a balance before and after an update — REPEATABLE READ provides that guarantee. For typical CRUD where each query is a one-shot operation, READ COMMITTED is appropriate and has lower overhead.

---

### Q2 — Lost Update Problem
**Interviewer asks:** "Explain the lost update problem with a banking example. How do you prevent it?"

**Hruday's answer:**
> Imagine two API requests arrive simultaneously: "withdraw ₹300" and "withdraw ₹800" from an account with ₹1,000.
>
> Under READ COMMITTED: both transactions begin, both read the balance as ₹1,000. Both check: "₹1,000 >= my withdrawal amount?" — both say yes. Transaction A computes ₹1,000 - ₹300 = ₹700 and commits. Transaction B computes ₹1,000 - ₹800 = ₹200 and commits. The final balance is ₹200, but ₹1,100 was withdrawn. The bank lost ₹100.
>
> This is the lost update anomaly — B's write overwrote A's write without seeing A's committed change.
>
> The fix: use SELECT FOR UPDATE on the balance read. The first transaction to read "locks" the row. The second transaction's SELECT FOR UPDATE blocks and waits. When the first commits (balance = ₹700), the second reads the locked row — now ₹700. It checks: ₹700 >= ₹800? No. It throws InsufficientFundsException. Correct behaviour.
>
> Alternatively: SERIALIZABLE isolation with a retry mechanism. Postgres's SSI detects the read-write conflict and aborts one transaction. The application catches the serialization error and retries. SELECT FOR UPDATE is simpler and more predictable for single-row critical sections. SERIALIZABLE is better for complex multi-row business logic where you can't identify exactly which rows to lock upfront.

---

### Q3 — Serializable Performance
**Interviewer asks:** "If SERIALIZABLE prevents all anomalies, why don't you use it everywhere?"

**Hruday's answer:**
> SERIALIZABLE provides the strongest guarantee, but at a cost.
>
> First: the retry overhead. Postgres uses SSI (Serializable Snapshot Isolation) — it doesn't block like 2-Phase Locking, but it ABORTS transactions on detected serialization conflicts and the application must retry. Under high concurrent write load, conflict rate increases and retry storms can occur — the system spends significant time retrying rather than doing useful work.
>
> Second: tracking overhead. Postgres must track read and write dependencies between all concurrent SERIALIZABLE transactions — more memory and CPU than lower levels.
>
> Third: false conflicts. SSI sometimes aborts transactions for "potential" conflicts that would not actually have produced inconsistent results — conservative aborts increase the retry rate beyond truly conflicting cases.
>
> The right approach: use the appropriate isolation level for each transaction type. Financial debits/credits: SERIALIZABLE or SELECT FOR UPDATE. User profile reads: READ COMMITTED is perfectly safe. Order history reads: READ COMMITTED. Balance checks that feed payment decisions: REPEATABLE READ or SERIALIZABLE. Match the isolation strength to the actual consistency requirement — not one level for everything.

---

### Q4 — Scenario
**Interviewer asks:** "A coupon can only be redeemed once. Two concurrent requests try to redeem the same coupon. How do you handle this?"

**Hruday's answer:**
> This is a classic "claim once" problem. The naive approach — read the coupon status, check if unused, mark as used — has a race condition under concurrent requests.
>
> The cleanest solution: a database-level constraint combined with an atomic update. The coupons table has a `redeemed_by` column (nullable) and a `redeemed_at` column. Rather than read-check-write, use a single UPDATE with an optimistic check:
>
> `UPDATE coupons SET redeemed_by = ?, redeemed_at = NOW() WHERE id = ? AND redeemed_by IS NULL`
>
> This is atomic at the database level. Postgres evaluates the WHERE condition and applies the UPDATE as one operation with a row lock. Two concurrent requests both try this UPDATE. One succeeds (rows_updated = 1). The other finds the WHERE condition false (redeemed_by is no longer NULL) and no rows are updated (rows_updated = 0). Application checks the returned row count: 0 means "already redeemed."
>
> No explicit isolation level tuning needed — a single conditional UPDATE is inherently race-condition-safe because the database serialises concurrent writes to the same row. However, I'd also add a unique constraint on the coupon_code column to prevent duplicate coupon records, and implement idempotency at the API level (repeated requests with the same idempotency key don't execute twice).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Postgres REPEATABLE READ has phantom reads" | "REPEATABLE READ doesn't prevent phantom reads — need SERIALIZABLE for that" | "The SQL standard says REPEATABLE READ allows phantom reads. But Postgres's implementation is stronger than the standard — it uses MVCC snapshots, and the snapshot mechanism naturally prevents most phantom reads at REPEATABLE READ level too. An INSERT by another transaction after your snapshot is invisible to your transaction. Check the Postgres documentation; it explicitly states this distinction from the SQL standard. Don't quote the SQL-standard matrix as absolute truth for Postgres." |
| "SELECT FOR UPDATE means SERIALIZABLE" | "I use SELECT FOR UPDATE — this is like SERIALIZABLE isolation" | "SELECT FOR UPDATE is pessimistic locking — it locks specific rows for the duration of your transaction. SERIALIZABLE tracks ALL read/write dependencies across the entire transaction. They're different mechanisms with different trade-offs. SELECT FOR UPDATE locks exactly the rows you specify — good for targeted critical sections (a specific account). SERIALIZABLE protects multi-row invariants without knowing which rows to lock upfront — good for complex business logic. For locking a single resource: SELECT FOR UPDATE. For general transaction consistency across unknown rows: SERIALIZABLE." |
| "Isolation affects only reads" | "Isolation levels control what data I can read while a transaction is open" | "Isolation levels affect both reads AND writes. REPEATABLE READ in Postgres means a concurrent UPDATE on a row you've already read in your transaction will cause one of you to get an error: 'could not serialize access due to concurrent update.' Both transactions can't both successfully update the same row — one gets aborted. This is not a read restriction; it's a write conflict detection. Applications using REPEATABLE READ must handle and retry this error, typically with @Retryable in Spring." |
| "Higher isolation = always correct choice" | "Always use SERIALIZABLE to be safe" | "SERIALIZABLE requires the application to handle and retry on serialization errors. Teams that set SERIALIZABLE but don't implement retry logic end up with cryptic errors in production: 'ERROR: could not serialize access due to concurrent update.' API clients see 500 errors that should be retryable 409s. The 'safe' choice caused failures. Correct usage: choose the minimum isolation level that satisfies the consistency requirement, implement retries for REPEATABLE READ and SERIALIZABLE transactions, and test under concurrent load." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, an inventory reservation service had a race condition: two order placements could both successfully reserve the last item. The fix wasn't as complex as it sounds — we added a SELECT FOR UPDATE on the inventory record at the start of the reservation transaction. Under low load it didn't matter. Under the load test simulating a flash sale (50 simultaneous orders for 1 remaining unit), 49 of them blocked at the SELECT FOR UPDATE and waited for the 1st to commit — which set quantity = 0. All 49 subsequent transactions then read quantity = 0, failed the reservation check, and returned 'out of stock.' Exactly correct. One sold. None oversold. The lock held for < 100ms in each case — acceptable latency for the reservation flow."

---

## 8. Scale Evolution

**Simple CRUD / read-heavy app:** READ COMMITTED (Postgres default) is correct and sufficient. No extra configuration needed.

**Financial / inventory operations:** SELECT FOR UPDATE on affected rows. READ COMMITTED with explicit locking. Test with concurrent load to verify no race conditions.

**Complex multi-row invariants / regulatory systems:** SERIALIZABLE with retry logic. Test retry behaviour under concurrent load. Monitor abort rates in Postgres logs (`SHOW pg_stat_bgwriter; SHOW pg_stat_activity` for serialization failures).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Wallet deductions, refund processing, settlement ledger entries — all require correct transaction isolation. Overdraft prevention is a direct business requirement. | "Two concurrent refund requests for the same payment arrive. Walk through how you prevent double-refund with isolation levels." |
| Swiggy / Meesho | Flash sale inventory reservation: 1,000 users request the last 10 items simultaneously. Isolation level determines whether items are oversold. | "Design the inventory reservation flow to prevent overselling during a flash sale." |
| Adobe / Microsoft | Document version control: concurrent edits to the same document. Conflict detection and resolution require understanding of isolation semantics. | "How does your document editing backend prevent two users from overwriting each other's changes?" |
| SAP Labs (current) | Oracle uses lock-based isolation (not MVCC by default). SELECT FOR UPDATE is used extensively in SAP custom code. Understanding isolation helps diagnose deadlocks and lock waits in Oracle ABAP and Java EE backend code. | "This Oracle query is waiting indefinitely. How do you diagnose whether it's a deadlock or a lock wait, and what's the fix?" |

---

## 10. Related Topics — What to Study Next

- **Topic 94 — Connection Pooling** — long-running SERIALIZABLE/REPEATABLE READ transactions hold connections; pool exhaustion and isolation level choices are directly related
- **Topic 76 — Saga Pattern** — when transactions span microservices, database isolation can't help; the Saga pattern provides distributed consistency where SQL isolation cannot reach
- **Topic 92 — Sharding** — cross-shard transactions cannot use SQL isolation levels; understanding the limits of SQL isolation motivates the Saga and eventual consistency patterns used with sharded data

---

*Part 5 · Database Isolation Levels — READ COMMITTED, REPEATABLE READ, SERIALIZABLE · Full Stack Interview Guide · Hruday D · 2026*
