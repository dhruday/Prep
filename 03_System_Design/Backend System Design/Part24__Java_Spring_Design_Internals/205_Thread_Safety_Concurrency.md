# 205. Thread Safety & Concurrency Basics

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Thread safety** means that a class or method behaves correctly when accessed concurrently from multiple threads — without requiring any additional synchronization from the caller. In a Spring Boot backend, every HTTP request is handled by a separate thread, so virtually all shared state must be thread-safe.

**What it is:**
- The property of code that guarantees correct behavior under concurrent execution
- The discipline of protecting shared mutable state from race conditions, visibility issues, and atomicity violations
- A spectrum: from complete immutability (naturally thread-safe) to fully synchronized (explicitly safe) to stateless (trivially safe)

**Why it matters:**
- Web frameworks are inherently multi-threaded — Tomcat runs 200 concurrent request-handler threads by default
- A race condition in shared state causes intermittent, hard-to-reproduce bugs
- Data corruption from concurrency issues in financial systems (e.g., double-spending) can be catastrophic

**The problem it solves:**
- Race conditions: two threads reading and writing shared state concurrently, producing unpredictable results
- Visibility issues: a write by one thread not being visible to another thread (CPU cache not flushed)
- Atomicity violations: a multi-step operation being interrupted partway through by another thread

**Role in large-scale distributed systems:**
- High-throughput services with shared caches, connection pools, or counters must be explicitly thread-safe
- Concurrency bugs are non-deterministic — they appear under load and are nearly impossible to reproduce in tests
- Lock contention is a scalability bottleneck: fine-grained locking or lock-free data structures are required at scale

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### The Java Memory Model (JMM)

The JMM defines visibility and ordering guarantees between threads:
- Without synchronization: writes by Thread A may not be visible to Thread B (CPU caches/reordering)
- `volatile`, `synchronized`, `java.util.concurrent.locks` establish **happens-before** relationships

**happens-before rules (key ones):**
- A `synchronized` block unlock happens-before a subsequent lock on the same monitor
- A `volatile` write happens-before a subsequent read of the same variable
- Thread start happens-before any action in the started thread
- Thread termination happens-before `Thread.join()` returns

---

### Level 1: Immutability — The Safest Option

Immutable objects are inherently thread-safe: once constructed, their state never changes.

```java
// ✅ Immutable — share freely across threads
public final class Money {
    private final long amountInCents;
    private final Currency currency;

    public Money(long amountInCents, Currency currency) {
        this.amountInCents = amountInCents;
        this.currency = currency;
    }
    // No setters. Fields are final.
    public Money add(Money other) {
        return new Money(this.amountInCents + other.amountInCents, this.currency);
    }
}
```

---

### Level 2: Stateless Classes

Classes with no instance fields are trivially thread-safe.

```java
// ✅ Spring @Service beans are singletons — they must be stateless
@Service
public class OrderCalculationService {
    // No instance fields → no shared mutable state → thread-safe
    public Money calculateTotal(List<OrderItem> items) {
        return items.stream()
            .map(i -> i.getPrice().multiply(i.getQuantity()))
            .reduce(Money.ZERO, Money::add);
    }
}
```

**Spring singletons:** Spring creates one instance of each `@Service`/`@Component` bean shared across all requests. If that bean has mutable instance fields, you have a concurrency bug.

---

### Level 3: `volatile` — Visibility Without Atomicity

`volatile` guarantees visibility (flushes write to main memory) but NOT atomicity of compound operations.

```java
// ✅ Safe for simple flag — one writer, multiple readers
private volatile boolean shutdownRequested = false;

public void requestShutdown() { shutdownRequested = true; }
public boolean isShuttingDown() { return shutdownRequested; }

// ❌ NOT safe for check-then-act
if (!shutdownRequested) {          // Thread A reads false
    shutdownRequested = true;      // Thread B: also reads false, both set to true
    doShutdown();                  // Both threads call doShutdown()
}
```

---

### Level 4: `synchronized` — Mutual Exclusion

```java
// ✅ Fully synchronized counter
public class RequestCounter {
    private int count = 0;

    public synchronized void increment() { count++; }
    public synchronized int getCount() { return count; }
}
```

**Problems with `synchronized`:**
- Contention: only one thread can hold the lock at a time → throughput bottleneck
- Deadlock: two threads each holding a lock and waiting for the other's lock
- Can't be interrupted or timed out easily

---

### Level 5: `java.util.concurrent` — The Right Level

**Atomic classes (lock-free, CAS-based):**
```java
// ✅ AtomicLong — more efficient than synchronized for a counter
private final AtomicLong requestCount = new AtomicLong(0);

public void recordRequest() { requestCount.incrementAndGet(); }
public long getCount() { return requestCount.get(); }
```

**Concurrent collections:**
```java
// ✅ ConcurrentHashMap — thread-safe, fine-grained locking
private final ConcurrentHashMap<String, UserSession> sessions = new ConcurrentHashMap<>();

sessions.putIfAbsent(token, session);           // atomic check-and-insert
sessions.computeIfAbsent(key, k -> loadFromDB(k)); // atomic compute-if-absent
```

**ReadWriteLock — optimize for read-heavy scenarios:**
```java
private final ReadWriteLock lock = new ReentrantReadWriteLock();

public UserProfile getProfile(String userId) {
    lock.readLock().lock();
    try { return cache.get(userId); }
    finally { lock.readLock().unlock(); }
}

public void updateProfile(String userId, UserProfile profile) {
    lock.writeLock().lock();
    try { cache.put(userId, profile); }
    finally { lock.writeLock().unlock(); }
}
```

---

### Common Concurrency Anti-Patterns in Spring Boot

#### Anti-Pattern 1: Mutable Instance Fields in a Singleton Bean

```java
// ❌ Singleton bean with mutable state — race condition
@Service
public class ReportService {
    private List<String> currentReportLines = new ArrayList<>(); // shared across ALL requests!

    @Transactional
    public Report generateReport(User user) {
        currentReportLines.clear();     // Thread A clears
        currentReportLines.add("...");  // Thread B also reads/writes simultaneously
        return new Report(currentReportLines);
    }
}

// ✅ Use local variables — each request has its own list
@Service
public class ReportService {
    public Report generateReport(User user) {
        List<String> lines = new ArrayList<>();  // local to this call stack
        lines.add("...");
        return new Report(lines);
    }
}
```

#### Anti-Pattern 2: Double-Checked Locking Without `volatile`

```java
// ❌ Broken — object reference may be published before object is fully constructed
private static ServiceClient instance;

public static ServiceClient getInstance() {
    if (instance == null) {               // Thread-unsafe read
        synchronized (ServiceClient.class) {
            if (instance == null) {
                instance = new ServiceClient();  // visible before constructor finishes
            }
        }
    }
    return instance;
}

// ✅ Add volatile — guarantees construction happens-before reference assignment
private static volatile ServiceClient instance;
```

---

### Lock Ordering to Prevent Deadlock

```java
// ❌ Deadlock: Thread A holds lockA, waits for lockB
//             Thread B holds lockB, waits for lockA

// ✅ Always acquire locks in the same global order
// Define: acquire lower-id lock first
void transfer(Account from, Account to, Money amount) {
    Account first  = from.getId() < to.getId() ? from : to;
    Account second = from.getId() < to.getId() ? to : from;

    synchronized (first) {
        synchronized (second) {
            from.debit(amount);
            to.credit(amount);
        }
    }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

**Throughput impact of locking:**
- A heavily contended `synchronized` block serializes all callers → max throughput = 1 / (lock duration)
- At 1ms lock hold time: max 1,000 TPS regardless of thread count
- Replace with `ConcurrentHashMap.computeIfAbsent()` → fine-grained locks per key → scales with thread count

**Thread count:**
- Default Tomcat: 200 request threads
- Default HikariCP: 10 DB connections
- Under load: Tomcat threads waiting for DB connections → thread pool exhaustion
- Increase DB pool or reduce query time to fix

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

- **DB transactions provide serialization:** use `@Transactional(isolation = SERIALIZABLE)` for high-stakes operations, but it reduces throughput
- **Optimistic locking:** Use `@Version` on JPA entities — conflict detected at write time, not via DB-level lock

```java
@Entity
public class Order {
    @Version
    private int version;  // JPA checks version on UPDATE; throws OptimisticLockException on conflict
}
```

- **Pessimistic locking:** `SELECT FOR UPDATE` — explicit DB row lock; blocks concurrent writers

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- **Lock contention** is a scalability cliff: throughput is flat or drops as concurrency increases
- **Lock-free alternatives:** `AtomicLong`, `ConcurrentHashMap`, `LongAdder` — scale linearly with threads
- **`LongAdder` vs `AtomicLong`:** At high concurrency, `LongAdder` is faster (uses thread-local cells + aggregation)

```java
// ✅ High-throughput counter under heavy concurrency
private final LongAdder requestCount = new LongAdder();
requestCount.increment();
long total = requestCount.sum();
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- **Spring Security's `SecurityContextHolder`** uses `ThreadLocal` by default — thread-safe per request, but must be configured to propagate when using async (`@Async`)
- **TOCTOU (Time-of-Check-Time-of-Use) vulnerabilities:** A permission check followed by an operation that is not atomic can be exploited by concurrent threads. Use `synchronized` or `CAS` to make the check-then-act atomic.

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### ConcurrentModificationException in Production
- A service iterated a `HashMap` in one thread while another thread added to it during high load
- `ConcurrentModificationException` was thrown mid-iteration — request failed
- Fix: Replace `HashMap` with `ConcurrentHashMap` or copy before iterating

### Lost Update in Financial Transfer
- Two requests withdraw from the same account concurrently
- Both read balance = 1000, both subtract 600, both write balance = 400 instead of -200 or rejection
- Fix: Database-level row lock with `SELECT FOR UPDATE` or JPA `@Version` optimistic locking

### Stripe's Distributed Idempotency
- Stripe uses idempotency keys backed by a distributed Redis lock to prevent double-charging
- Application-level thread-safety is not enough across multiple server instances — requires distributed coordination

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "Thread safety in Spring Boot matters because every request runs on a different thread, and Spring beans are singletons. The safest approach is stateless beans — service methods that take inputs and return outputs with no instance-level state. For shared mutable state, I use `java.util.concurrent` types: `ConcurrentHashMap` for shared maps, `AtomicLong` for counters, `ReadWriteLock` for read-heavy caches. I avoid raw `synchronized` unless I need explicit lock semantics, because it creates contention bottlenecks. For critical domain operations (financial transfers), I use database-level optimistic or pessimistic locking to ensure cross-instance safety."

### Common Follow-Up Questions

1. **"What is a race condition?"** → When the outcome of a computation depends on the non-deterministic interleaving of operations from multiple threads. Manifests as inconsistent results that are hard to reproduce.
2. **"What's the difference between `synchronized` and `ReentrantLock`?"** → `ReentrantLock` supports try-lock with timeout, interruptible lock acquisition, and condition variables — more flexible. `synchronized` is simpler but less controllable.
3. **"What does `volatile` guarantee?"** → Visibility (writes are immediately visible to other threads) and prevents instruction reordering. Does NOT guarantee atomicity of compound operations.
4. **"How do you avoid deadlock?"** → Establish a global lock ordering and always acquire locks in the same sequence. Use `tryLock()` with timeouts. Prefer higher-level concurrency utilities over raw locks.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Thread Safety Decision Tree

```
Shared between threads?
         |
        YES
         |
         v
Can it be immutable?  ──YES──> Make it immutable (final fields, no setters)
         |
        NO
         |
         v
Is it stateless (no fields)? ──YES──> Already safe
         |
        NO
         |
         v
Simple counter/flag?  ──YES──> Use AtomicLong / volatile
         |
        NO
         |
         v
Shared map/collection? ──YES──> Use ConcurrentHashMap / CopyOnWriteArrayList
         |
        NO
         |
         v
Complex invariant maintenance? → synchronized / ReentrantLock / database lock
```

### Happens-Before Chain

```
Thread A:
  write x = 42
  lock.unlock()          ← release monitor

Thread B:
  lock.lock()            ← acquire same monitor (HAPPENS-AFTER unlock)
  read x                 ← guaranteed to see 42
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

**Why thread safety matters:**
- Spring Boot services are inherently concurrent — every request is a thread
- Concurrency bugs produce intermittent, hard-to-reproduce failures under load
- At FAANG scale, a single race condition in a hot path can cause hundreds of incorrect outcomes per second

**How it works:**
- Prefer immutability and statelessness — naturally thread-safe, no synchronization needed
- Use `java.util.concurrent` types for shared mutable state — lock-free, high-throughput
- Use database-level locking for critical cross-instance operations
- Identify and eliminate mutable singleton state in Spring beans

**Key trade-offs:**
- `synchronized` (correct but slower) vs. lock-free (`ConcurrentHashMap`, `AtomicLong`, faster at scale)
- Optimistic locking (high concurrency, occasional conflict) vs. pessimistic locking (lower concurrency, no conflicts)
- Immutability (safe, but creates object allocation pressure) vs. mutability (efficient, but requires synchronization)
