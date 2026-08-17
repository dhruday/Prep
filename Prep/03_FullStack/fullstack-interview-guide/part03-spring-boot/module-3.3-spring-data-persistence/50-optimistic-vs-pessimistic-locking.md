# Optimistic vs Pessimistic Locking
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Optimistic locking**: assume no conflict, detect it on write using a `@Version` field — fast, scalable, but requires retry logic on conflict
- **Pessimistic locking**: assume conflict, lock the row on read (`SELECT FOR UPDATE`) — safe but slow under contention, can cause deadlocks
- `@Version` in JPA: Spring adds `WHERE id=? AND version=?` to UPDATE — if 0 rows affected, another transaction competed → `OptimisticLockException` → you retry
- Use optimistic locking when conflicts are RARE (most reads, e-commerce carts, article editing)
- Use pessimistic locking when conflicts are FREQUENT or correctness is critical with no retry option (inventory decrement, ticket booking, financial transfers)
- Gap to bridge: implementing retry logic on `OptimisticLockException` — the version mismatch is expected and the calling code must handle it gracefully

---

## 1. One-Line Definition
Optimistic locking detects conflicts after the fact using a version number, while pessimistic locking prevents conflicts by locking the row before any work begins — both solve the lost-update problem but with very different performance profiles.

---

## 2. The Problem It Solves

Two users open the same product page — current stock: 3 units. Both decide to buy 2 units. Both read `stock = 3`. Both check `3 >= 2` — yes, proceed. Both set `stock = 3 - 2 = 1` and write. The second write overwrites the first. Final stock: 1 unit instead of the correct -1 (which should have been rejected). You just oversold.

This is the **lost update problem**. It happens when two transactions read the same row, make decisions based on it, and both write without knowing about the other's change.

Two solutions:

**Optimistic locking**: Both reads proceed without locking. Each write checks: "was the version I read still current when I wrote?" If the first transaction wrote `version 1 → 2`, the second transaction still tries to write `version 1 → 2`, but the database says: no row with `id=X AND version=1` exists anymore — it is version 2 now. Zero rows updated. `OptimisticLockException` thrown. Second transaction retries from the beginning, reads `stock = 1`, sees 1 < 2, rejects the purchase properly.

**Pessimistic locking**: The first `SELECT stock FROM products WHERE id=X FOR UPDATE` locks the row. The second transaction tries the same `SELECT FOR UPDATE` — it waits. Only after the first transaction commits (releasing the lock) does the second transaction read the updated stock (1 unit), correctly reject the purchase (1 < 2), and proceed without the lock conflict.

---

## 3. How It Works Internally

### The Mental Model
**Optimistic locking** is like two people editing the same Google Doc. You both grab a copy of version 5. You make changes and save. When the second person saves, Google tells them: "Someone else saved a newer version while you were editing. Here are the conflicts — please resolve and save again." No lock was held during editing, but the conflict is detected at save time.

**Pessimistic locking** is like checking out a physical library book. When you take the book, no one else can read it. You have the only copy. It is safe — impossible for two people to edit simultaneously — but the book is unavailable to everyone else while you have it.

### Optimistic Locking — JPA Mechanism

1. Entity has a `@Version` field (usually `Long` or `int`)
2. When Spring Data reads an entity, the `version` field value is captured: e.g., `version = 5`
3. When you modify the entity and call `save()`, Hibernate generates:
   ```sql
   UPDATE products SET stock = 1, version = 6
   WHERE id = 42 AND version = 5
   ```
4. If another transaction already committed a change (version is now 6, not 5), this UPDATE matches 0 rows
5. Hibernate sees 0 rows updated → throws `OptimisticLockException`
6. Your service must catch this and retry the operation

### Pessimistic Locking — Database Mechanism

`SELECT ... FOR UPDATE` acquires an exclusive row lock at the database level:
- Other transactions trying `SELECT ... FOR UPDATE` on the same row: **wait**
- Other transactions trying `UPDATE` on the same row: **wait**
- Other plain `SELECT` (without FOR UPDATE): **do not wait** (with MVCC — they see the pre-lock version)

The lock is held until the transaction commits or rolls back. This provides full safety but limits concurrency.

There is also `SELECT ... FOR SHARE` — a shared lock. Multiple readers can hold shared locks on the same row simultaneously, but a writer must wait for ALL shared locks to release.

### When Does Each Win?

**Optimistic wins when:**
- Conflicts are rare (most real-world scenarios: < 5% of concurrent operations touch the same row)
- Read traffic is high (no lock overhead on reads)
- Throughput > safety delay is the priority
- Retry is acceptable and cheap (your business logic handles the retry gracefully)

**Pessimistic wins when:**
- Conflicts are frequent (high contention on specific rows like an escrow account, limited seats, a single inventory item like the last ticket)
- Retry is NOT acceptable (payment debit — retrying means potentially double-charging if the first actually committed)
- Lock duration is short (lock for the time of one simple UPDATE, not 10+ seconds of processing)

### ASCII Diagram

```
Lost Update Problem:
───────────────────────────────────────────────────────────
  T1: SELECT stock FROM products WHERE id=1  → stock=3    
  T2: SELECT stock FROM products WHERE id=1  → stock=3    
  T1: stock >= 2? YES → UPDATE SET stock=3-2=1 → COMMIT   
  T2: stock >= 2? YES → UPDATE SET stock=3-2=1 → COMMIT ← stock=1 (should be rejected!)
  Result: OVERSOLD

Optimistic Locking Fix (version field):
───────────────────────────────────────────────────────────
  T1: SELECT id,stock,version FROM products WHERE id=1 → {stock=3, version=5}
  T2: SELECT id,stock,version FROM products WHERE id=1 → {stock=3, version=5}
  T1: UPDATE products SET stock=1, version=6 WHERE id=1 AND version=5 → 1 row affected ✅ COMMIT
  T2: UPDATE products SET stock=1, version=6 WHERE id=1 AND version=5 → 0 rows affected ❌
      → OptimisticLockException thrown
      → T2 RETRIES: SELECT → {stock=1, version=6} → 1 < 2 → reject purchase → correct!

Pessimistic Locking Fix (SELECT FOR UPDATE):
───────────────────────────────────────────────────────────
  T1: SELECT * FROM products WHERE id=1 FOR UPDATE → {stock=3} — ROW LOCKED 🔒
  T2: SELECT * FROM products WHERE id=1 FOR UPDATE → WAITS... 
  T1: UPDATE SET stock=3-2=1 → COMMIT — lock released
  T2: UNBLOCKED → reads {stock=1} → 1 < 2 → reject purchase → correct!
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// No concurrency protection at all — classic lost update setup
@Service
public class InventoryService {

    @Transactional
    public void purchase(Long productId, int quantity) {
        Product product = productRepository.findById(productId).orElseThrow();
        
        // DANGER: two concurrent calls on the same product both read stock=3
        // Both check stock >= quantity → both pass
        // Both write stock=3-quantity → one overwrites the other
        // Result: oversold
        if (product.getStock() < quantity) {
            throw new InsufficientStockException();
        }
        product.setStock(product.getStock() - quantity);
        productRepository.save(product); // no version check, no lock — lost update!
    }
}
```
> **Why this fails in production:** Under concurrent load (Black Friday sale, flash sale), multiple threads enter this method simultaneously with the same product. All read the same stock, all pass the check, all write the decremented value. Customers receive confirmation for purchases that exceed actual inventory.

### Right Way — Optimistic Locking (for most use cases)
```java
// Entity — @Version enables optimistic locking
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private int stock;

    // @Version is all you need to enable optimistic locking
    // Hibernate automatically includes this field in every UPDATE's WHERE clause
    // Use Long (not int) to avoid overflow on very high-update entities
    @Version
    private Long version;
}
```

```java
// Repository — standard JpaRepository is enough; @Version handles the locking
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
}
```

```java
// Service — handles OptimisticLockException with retry
@Service
public class InventoryService {

    private final ProductRepository productRepository;

    public InventoryService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional
    @Retryable(
        value = OptimisticLockException.class,
        maxAttempts = 3,           // retry up to 3 times
        backoff = @Backoff(delay = 100, multiplier = 2) // 100ms, then 200ms, then 400ms
    )
    // @Retryable requires spring-retry dependency + @EnableRetry on your @SpringBootApplication
    public void purchase(Long productId, int quantity) {
        Product product = productRepository.findById(productId).orElseThrow();

        if (product.getStock() < quantity) {
            throw new InsufficientStockException("Not enough stock: " + product.getStock());
        }

        product.setStock(product.getStock() - quantity);
        productRepository.save(product);
        // Hibernate generates: UPDATE products SET stock=?, version=new WHERE id=? AND version=old
        // If version=old is stale → 0 rows updated → OptimisticLockException
        // @Retryable catches it → re-reads product (fresh version) → retries
    }
}
```

### Right Way — Pessimistic Locking (for high-contention scenarios)
```java
// Repository — add a method that locks the row on read
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // LockModeType.PESSIMISTIC_WRITE = SELECT ... FOR UPDATE
    // Blocks ALL other reads-with-lock and writes until this transaction commits
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithLock(@Param("id") Long id);

    // LockModeType.PESSIMISTIC_READ = SELECT ... FOR SHARE
    // Allows multiple concurrent readers, blocks writers
    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithShareLock(@Param("id") Long id);
}
```

```java
// Service — using pessimistic lock for ticket booking (no retry acceptable)
@Service
public class TicketBookingService {

    @Transactional
    public Ticket bookTicket(Long eventId, Long userId) {
        // SELECT FOR UPDATE — row is locked from this point until transaction commits
        // If another transaction is holding the lock, this call BLOCKS (up to lock timeout)
        Event event = eventRepository.findByIdWithLock(eventId).orElseThrow();

        if (event.getAvailableSeats() <= 0) {
            throw new NoSeatsAvailableException();
        }

        event.setAvailableSeats(event.getAvailableSeats() - 1);
        eventRepository.save(event);

        Ticket ticket = new Ticket(event, userId);
        ticketRepository.save(ticket);

        return ticket;
        // On transaction commit: lock released — next waiting SELECT FOR UPDATE proceeds
    }
}
```

### Configuration
```yaml
# Set lock timeout to prevent indefinite blocking (PostgreSQL-specific)
spring:
  jpa:
    properties:
      jakarta:
        persistence:
          lock:
            # Fail instead of waiting more than 5 seconds for a pessimistic lock
            timeout: 5000  # milliseconds; -1 = wait forever (dangerous), 0 = fail immediately

      hibernate:
        # Dialect with lock timeout support
        dialect: org.hibernate.dialect.PostgreSQLDialect
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is optimistic locking and how does @Version work in JPA?"

**Hruday's answer:**
> Optimistic locking is a strategy where you assume that concurrent modifications are rare, so you don't lock the row when reading. Instead, you detect a conflict when writing.
>
> In JPA, you enable it with `@Version` on a field in your entity. When Hibernate reads an entity, it captures the version value — say `version=5`. When you modify the entity and call save, Hibernate generates an UPDATE with an extra condition: `WHERE id = ? AND version = 5`. It expects to update exactly 1 row.
>
> If another transaction committed a change between your read and your write, that transaction incremented the version to 6. Now `WHERE id=? AND version=5` matches 0 rows. Hibernate sees 0 updated rows and throws `OptimisticLockException` (or `StaleObjectStateException`).
>
> Your code catches this exception (or uses `@Retryable`) and starts over — re-reads the fresh data with version=6, recalculates, and tries the update again. This retry is the key: you must design your service method so it is safe to run multiple times.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is a deadlock? Can optimistic locking cause one? Can pessimistic locking?"

**Hruday's answer:**
> A deadlock is when two transactions each hold a lock that the other needs, and neither can proceed. T1 locks row A and waits for row B. T2 locks row B and waits for row A. Both wait forever. The database detects this cycle and aborts one transaction (the deadlock victim), which throws an error to the application.
>
> Optimistic locking CANNOT cause deadlocks. It does not hold any row-level locks. The conflict detection happens at write time via a version check — no one is waiting on anyone.
>
> Pessimistic locking CAN cause deadlocks. If T1 acquires `FOR UPDATE` on product 42 then tries to lock product 99, and T2 concurrently acquires `FOR UPDATE` on product 99 then tries to lock product 42 — deadlock. The database kills one transaction and retries.
>
> Prevention: always acquire locks in the same consistent order. If your service always locks products by ascending ID (`ORDER BY id`), concurrent transactions cannot form a cycle. Also: keep the transaction as short as possible to minimize the window for deadlock.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "You are building a flash sale feature — 1000 items for 50,000 users hitting 'Buy' simultaneously. Optimistic or pessimistic locking? Justify."

**Hruday's answer:**
> For a flash sale, I would use pessimistic locking for the final inventory decrement, but with careful design to minimise lock contention.
>
> Why pessimistic here? In a flash sale, the conflict rate is extremely high — potentially thousands of concurrent writes to the same hot product rows. With optimistic locking, each conflict triggers a full retry: re-read, recalculate, re-attempt. Under extreme contention, threads can retry 20+ times before succeeding — the retry overhead piles up and degrades the entire service.
>
> But I would not use a single row lock for 50,000 users either. Instead, I would use a pre-decrement approach with atomic SQL:
> ```sql
> UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0
> ```
> This atomic decrement combined with `FOR UPDATE` eliminates the read-modify-write cycle entirely. The lock duration is minimal — just the time for one UPDATE. If the UPDATE affects 0 rows (stock already 0), the purchase is rejected.
>
> For further scale, I would move inventory decrement to Redis with `LPOP` on a pre-populated list of 1000 "token" keys — instant atomic dequeue, no DB lock at all. The DB write happens asynchronously. Redis's single-threaded model ensures atomicity without contention.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "An airline seat booking system allows two users to book the last seat simultaneously. How do you prevent double booking?"

**Hruday's answer:**
> Seat booking has zero tolerance for over-commitment — if both succeed, you have two passengers with boarding passes for one seat. Pessimistic locking is the right tool.
>
> The flow: begin transaction, `SELECT * FROM seats WHERE id=? AND status='AVAILABLE' FOR UPDATE`. The row lock is acquired. No other transaction can modify or acquire a lock on this seat.
>
> Check seat status: if 'AVAILABLE', proceed to `UPDATE seats SET status='BOOKED', passenger_id=? WHERE id=?` and insert a booking record. Commit — lock released.
>
> The second concurrent transaction's `SELECT ... FOR UPDATE` waits until T1 commits. It then reads the updated row: status='BOOKED'. Its check fails — seat unavailable — it returns a "seat already taken" response.
>
> Two safeguards I would add. First: a lock timeout (5 seconds) so the second transaction fails fast with a clear error instead of waiting indefinitely if the first transaction is slow. Second: a unique constraint on `bookings(seat_id, flight_id)` at the database level — this is the final defence. Even if my application logic had a bug, the database constraint prevents two bookings for the same seat.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "OptimisticLockException = bug" | "Something is wrong — fix the code" | "It is an EXPECTED exception in optimistic locking. It means the row was concurrently modified — exactly what the system was designed to detect. The correct response is to retry the operation (with fresh data). You must build retry logic into services using optimistic locking." |
| "Pessimistic locking is always safer" | "Lock the row and conflicts are impossible" | "Pessimistic locking introduces deadlock risk and throughput reduction. Two transactions locking rows in different orders can deadlock. Under high concurrency, long lock holding causes thread queuing. Use pessimistic locking only where conflicts are frequent and retry is not acceptable." |
| "@Version field type" | "Use int" | "Use Long. An int field overflows after ~2 billion updates — which sounds impossible but critical-path rows in high-frequency systems can reach this. Long (64-bit) won't overflow in any practical scenario." |
| "Pessimistic read lock vs write lock" | "They're the same" | "PESSIMISTIC_READ = SELECT FOR SHARE — multiple readers can hold simultaneously, but a writer must wait for all to release. PESSIMISTIC_WRITE = SELECT FOR UPDATE — exclusive lock, all other reads-with-lock AND writes are blocked. Use WRITE for update scenarios, READ for scenarios where you want no writes but concurrent reads are fine." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we had a vendor payment batch job that ran nightly. It read vendor account balances, computed interest, and updated balances. When two job instances accidentally ran simultaneously (a deployment issue), both read the same balances, both computed interest on the original values, and both wrote — effectively applying interest twice. We added `@Version` to the vendor account entity and `@Retryable` on the service method. From then on, one job would win the version check and the other would get `OptimisticLockException`, retry with fresh data, and correctly skip applying interest on a balance that had already been updated."

---

## 8. Scale Evolution

**1,000 users →** Optimistic locking works perfectly. Conflicts are rare. Retry happens occasionally with no user impact. Pessimistic locking for rare high-stakes operations (last ticket, seat booking).

**100,000 users →** Hot rows (popular products, limited inventory items) see high conflict rates. Optimistic locking retries add latency spikes under flash sale conditions. Pre-check availability in Redis before hitting the database. Batch writes for high-frequency counters (view counts, like counts) — collect in Redis, flush to DB every 30 seconds, no row-level locking needed.

**10 million users →** Per-row locking strategies hit their ceiling for truly global hot resources. Architecture shift: shard the resource. Instead of one inventory row for a product, split into 100 "inventory buckets" — each request randomly picks one bucket. If a bucket is empty, try the next. This distributes lock contention across 100 rows. Used by Ticketmaster and IRCTC-style systems.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Every payment write is a potential concurrent conflict. They use optimistic locking with idempotency keys to handle retries safely. | "Two payment requests with the same order ID arrive simultaneously. How do you handle this?" |
| Swiggy / Meesho | Flash sales, last-item scenarios, concurrent cart updates. Real production pressure on lock strategies. | "How does your inventory service handle two users buying the last available item simultaneously?" |
| Adobe / Microsoft | Document co-authoring scenarios. Multiple users editing the same document. Optimistic locking with conflict resolution is the standard approach. | "Design a concurrent document editing conflict resolution system." |
| Remote / Global roles | Classic database concurrency interview topic. Almost every senior backend interview includes either this or deadlock questions. | "What is the difference between optimistic and pessimistic locking? When do you use each?" |

---

## 10. Related Topics — What to Study Next

- **Topic 49 — Database Transactions (ACID)** — locking is how databases implement Isolation — knowing ACID without locking strategies is incomplete
- **Topic 44 — @Transactional Internals** — pessimistic locks are held for the duration of the `@Transactional` transaction — short transactions = shorter lock holds = better throughput
- **Topic 95 — Database Isolation Levels** — isolation levels define the visibility rules that locking and MVCC enforce — they are directly related
- **Topic 78 — Eventual Consistency** — in distributed systems where pessimistic locking is impractical, eventual consistency is the alternative — understanding the trade-offs
- **Topic 101 — Redis Distributed Lock (Redlock)** — for distributed systems where multiple app instances need to lock a shared resource, database locks don't work — Redis Redlock is the solution

---

*Part 3 · Optimistic vs Pessimistic Locking · Full Stack Interview Guide · Hruday D · 2026*
