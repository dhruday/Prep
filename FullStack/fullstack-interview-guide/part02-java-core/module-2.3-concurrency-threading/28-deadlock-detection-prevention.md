# Deadlock — Detection and Prevention
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Deadlock** = Thread A holds Lock 1 and waits for Lock 2. Thread B holds Lock 2 and waits for Lock 1. Both wait forever. No progress.
- **4 conditions for deadlock (Coffman):** Mutual exclusion + Hold and wait + No preemption + Circular wait. Remove ANY ONE and there is no deadlock.
- **Prevention strategies in Java:**
  1. Always acquire locks in the same order (breaks circular wait)
  2. Use `tryLock(timeout)` on ReentrantLock (breaks hold and wait)
  3. Use lock ordering — assign an ID to resources, always lock lower-ID first
  4. Avoid holding a lock while calling external/unknown code
- **Detection in production:** Thread dump (`jstack <pid>`) shows "found one Java-level deadlock" — JVM detects cycles in lock wait graph automatically.
- Know the special case: **thread pool deadlock** — Task A in pool submits Task B to the SAME pool and blocks waiting for B. If pool is saturated with A-type tasks, B can never run. A circular dependency without a traditional lock.

---

## 1. One-Line Definition
Deadlock is a state where two or more threads are permanently blocked, each waiting for a resource held by another — a circular dependency where no thread can proceed because none can release what the next one needs.

---

## 2. The Problem It Solves (What Deadlocks Arise From)

Deadlocks arise specifically because programs need to protect shared resources. You introduce locks to prevent race conditions. Those locks, when used incorrectly, create the potential for deadlock. As systems grow more complex — more shared resources, more threads, more services — the chance of introducing a deadlock grows.

In a microservice, the resources being locked are not always explicit Java locks. They can be:
- **DB row-level locks**: Transaction 1 locks Row A, requests Row B. Transaction 2 locks Row B, requests Row A. DB deadlock.
- **External API calls**: Service A calls Service B while Service B simultaneously calls Service A — distributed deadlock (both services waiting for each other's response).
- **Thread pool tasks**: Task A in an executor submits Task B to the same executor and calls `future.get()`. If the pool has no free thread for B, A waits forever. Thread pool deadlock.

Knowing how to prevent deadlocks and how to diagnose them in production is a direct signal that you've worked on real multi-threaded backend systems.

---

## 3. How It Works Internally

### The Mental Model
Two narrow bridges face each other across a river. Car A is on Bridge 1 heading east, waiting for Car B to back up off Bridge 2. Car B is on Bridge 2 heading west, waiting for Car A to back up off Bridge 1. Neither backs down. Traffic stops forever.

### Coffman's Four Conditions for Deadlock
All four must hold simultaneously for a deadlock to occur. Break any one → no deadlock.

```
1. MUTUAL EXCLUSION:  A resource can be held by only one thread at a time.
   (Locks, monitors, DB row locks are mutually exclusive by design.)

2. HOLD AND WAIT:     A thread holds at least one resource and waits to acquire more.
   (Thread A holds Lock 1 and then tries to acquire Lock 2.)

3. NO PREEMPTION:     A resource cannot be forcibly taken from a thread; it must be
                      released voluntarily.
   (Thread B cannot steal Lock 2 from Thread A.)

4. CIRCULAR WAIT:     Thread A waits for Thread B, which waits for Thread A (or a
                      longer cycle: A→B→C→A).
```

### Deadlock Detection in Java

The JVM tracks which thread holds which monitor and which thread is waiting for which monitor. It can detect cycles in this graph. When you take a thread dump, the JVM traverses the lock ownership graph and reports any cycles.

```bash
# Take a thread dump:
jstack <pid>           # standard thread dump
kill -3 <pid>          # SIGQUIT on Linux — prints to stdout
jcmd <pid> Thread.print
```

The thread dump will contain:
```
Found one Java-level deadlock:
=============================
"Thread-A":
  waiting to lock monitor 0x000000001cf08098 (object 0x00000000d5f5ad88, a java.lang.Object),
  which is held by "Thread-B"
"Thread-B":
  waiting to lock monitor 0x000000001cf08078 (object 0x00000000d5f5ad68, a java.lang.Object),
  which is held by "Thread-A"
```

For `ReentrantLock`, the JVM doesn't automatically detect deadlocks in thread dumps — only monitor (synchronized) locks show up in the standard "found deadlock" output. Use `ThreadMXBean` programmatically:

```java
ThreadMXBean bean = ManagementFactory.getThreadMXBean();
long[] deadlockedIds = bean.findDeadlockedThreads();  // includes ReentrantLock deadlocks
if (deadlockedIds != null) {
    // log/alert: deadlock detected
}
```

### Four Prevention Strategies

```
Strategy 1: LOCK ORDERING (breaks circular wait)
  Assign a global ordering to all locks. Always acquire in that order.
  Thread A: acquire Lock 1, then Lock 2 (in order)
  Thread B: acquire Lock 1 (must wait), then Lock 2
  No circular wait possible. This is the most reliable prevention strategy.

Strategy 2: tryLock WITH TIMEOUT (breaks hold and wait)
  Instead of blocking indefinitely, try to acquire for N ms.
  If not acquired → release all held locks, wait, retry.
  Thread A: holds Lock 1, tries Lock 2 with 100ms timeout.
  If Lock 2 not acquired → releases Lock 1, waits, retries from scratch.
  No permanent blocking. But: risk of livelock if both threads retry at the same time.

Strategy 3: ACQUIRE ALL LOCKS AT ONCE (breaks hold and wait)
  Request all needed locks in one atomic step (using a global ordering or a meta-lock).
  While trying to acquire, hold nothing. Either get all or backoff.

Strategy 4: AVOID NESTED LOCKS
  If your design requires never holding two locks at the same time,
  there can be no lock ordering problem — and no deadlock.
  Minimise code paths that hold multiple locks simultaneously.
```

### ASCII Diagram

```
DEADLOCK — CIRCULAR WAIT:

  Thread A:
  ┌─────────────────────────────────────────────┐
  │  Holds: Lock 1 (account A)                  │
  │  Waiting for: Lock 2 (account B) ──────────►│── BLOCKED
  └─────────────────────────────────────────────┘       │
                                                        │ Lock 2 held by Thread B
  Thread B:                                             │
  ┌─────────────────────────────────────────────┐       │
  │  Holds: Lock 2 (account B) ◄────────────────│───────┘
  │  Waiting for: Lock 1 (account A) ──────────►│── BLOCKED
  └─────────────────────────────────────────────┘
                                    │
                             Lock 1 held by Thread A
  ↕ Both threads blocked forever. JVM thread dump will show this cycle.

PREVENTION — LOCK ORDERING:

  Thread A:  Lock 1 → Lock 2  (always lower ID first)
  Thread B:  Lock 1 → Lock 2  (forced same order)
  Thread B waits for Lock 1. Thread A finishes → releases Lock 1 → Thread B proceeds.
  No circular wait. No deadlock.
```

---

## 4. The Code

### Wrong Way — Classic Deadlocks
```java
// WRONG 1: Lock acquisition in different orders (classic deadlock)
Object lockA = new Object();
Object lockB = new Object();

Thread t1 = new Thread(() -> {
    synchronized (lockA) {
        sleep(100);
        synchronized (lockB) {         // Thread 1: A → B
            System.out.println("T1 got both");
        }
    }
});

Thread t2 = new Thread(() -> {
    synchronized (lockB) {
        sleep(100);
        synchronized (lockA) {         // Thread 2: B → A  ← opposite order
            System.out.println("T2 got both");
        }
    }
});
// After 100ms sleep, T1 holds A, wants B. T2 holds B, wants A. Deadlock.

// WRONG 2: Thread pool deadlock
ExecutorService pool = Executors.newFixedThreadPool(5);

for (int i = 0; i < 5; i++) {
    pool.submit(() -> {
        // This outer task submits an inner task to THE SAME pool and waits
        Future<String> inner = pool.submit(() -> "inner result");
        String result = inner.get();  // BLOCKS waiting for the inner task
        return "outer used: " + result;
    });
}
// All 5 threads are occupied by outer tasks waiting for inner tasks.
// Inner tasks are queued but NO THREAD IS FREE to run them.
// All 5 threads blocked. DEADLOCK. No exception, no log — just infinite hang.

// WRONG 3: DB deadlock (SQL equivalent in Java code)
@Transactional
public void transferFunds(Account from, Account to, BigDecimal amount) {
    // Transaction 1: locks accounts in order: AccountId 100, then 200
    repository.updateBalance(from);   // acquires row lock on 'from' (id=100)
    // Concurrent thread does: updateBalance(to) first (id=200), then updateBalance(from)
    // → opposite row lock order → DB deadlock → SQLException: deadlock detected
    repository.updateBalance(to);
}
```

### Right Way — Deadlock Prevention Patterns
```java
// CORRECT 1: Lock ordering by ID (works for accounts, resources, any comparable entity)
public void transfer(Account from, Account to, BigDecimal amount) {
    // Always lock the lower-ID account first, regardless of direction
    Account first  = from.getId() < to.getId() ? from : to;
    Account second = from.getId() < to.getId() ? to : from;

    synchronized (first) {
        synchronized (second) {
            from.debit(amount);
            to.credit(amount);
        }
    }
    // Thread A transferring 100→200 and Thread B transferring 200→100:
    // BOTH will try to acquire account-100's lock first.
    // One succeeds, the other waits. No circular wait. No deadlock.
}

// CORRECT 2: tryLock with timeout (prevents indefinite blocking)
public class SafeTransfer {
    private final ReentrantLock lockA = new ReentrantLock();
    private final ReentrantLock lockB = new ReentrantLock();

    public boolean transfer(BigDecimal amount, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;

        while (true) {
            if (lockA.tryLock(50, TimeUnit.MILLISECONDS)) {
                try {
                    long remaining = deadline - System.currentTimeMillis();
                    if (remaining <= 0) return false;

                    if (lockB.tryLock(remaining, TimeUnit.MILLISECONDS)) {
                        try {
                            // Both locks acquired safely
                            process(amount);
                            return true;
                        } finally {
                            lockB.unlock();
                        }
                    }
                    // lockB not acquired → fall through, release lockA, retry
                } finally {
                    lockA.unlock();
                }
            }
            // With random back-off to avoid livelock:
            Thread.sleep(ThreadLocalRandom.current().nextInt(10, 50));

            if (System.currentTimeMillis() > deadline) return false;
        }
    }
}

// CORRECT 3: Fix thread pool deadlock — use separate pools for parent and child tasks
@Configuration
public class ExecutorConfig {
    @Bean("outerTaskExecutor")
    public ExecutorService outerTaskExecutor() {
        return new ThreadPoolExecutor(5, 10, 60, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(100), new ThreadPoolExecutor.CallerRunsPolicy());
    }

    @Bean("innerTaskExecutor")
    public ExecutorService innerTaskExecutor() {
        return new ThreadPoolExecutor(10, 20, 60, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(500), new ThreadPoolExecutor.CallerRunsPolicy());
    }
}

@Service
public class TaskOrchestrator {
    @Autowired @Qualifier("outerTaskExecutor") ExecutorService outerPool;
    @Autowired @Qualifier("innerTaskExecutor") ExecutorService innerPool;  // separate pool!

    public void runTask() {
        outerPool.submit(() -> {
            Future<String> inner = innerPool.submit(() -> "inner result");  // different pool
            return "outer: " + inner.get();   // can block — inner has its own threads
        });
    }
}

// CORRECT 4: DB deadlock prevention — consistent row lock ordering
@Transactional
public void transfer(long fromAccountId, long toAccountId, BigDecimal amount) {
    // Order DB selects by ID — consistent lock acquisition order across all transactions
    long firstId  = Math.min(fromAccountId, toAccountId);
    long secondId = Math.max(fromAccountId, toAccountId);

    // SELECT FOR UPDATE ensures row locks are acquired in order
    Account first  = repository.findByIdForUpdate(firstId);   // row lock on lower ID first
    Account second = repository.findByIdForUpdate(secondId);  // then higher ID

    if (fromAccountId == firstId) {
        first.debit(amount);
        second.credit(amount);
    } else {
        second.debit(amount);
        first.credit(amount);
    }
}
// All transactions acquire row locks in the same order. No circular wait at DB level.

// CORRECT 5: Deadlock detection at runtime (monitoring)
@Scheduled(fixedDelay = 30_000)
public void detectDeadlocks() {
    ThreadMXBean bean = ManagementFactory.getThreadMXBean();
    long[] deadlocked = bean.findDeadlockedThreads();
    if (deadlocked != null) {
        ThreadInfo[] infos = bean.getThreadInfo(deadlocked, true, true);
        String report = Arrays.stream(infos)
            .map(ThreadInfo::toString)
            .collect(Collectors.joining("\n"));
        log.error("DEADLOCK DETECTED:\n{}", report);
        alertingService.sendCriticalAlert("Deadlock detected in JVM: " + report);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are the four necessary conditions for a deadlock to occur?"

**Hruday's answer:**
> These are Coffman's four conditions, and all four must hold simultaneously for a deadlock to happen. Remove any one and you prevent deadlock.
>
> First: **mutual exclusion** — at least one resource must be non-shareable; only one thread can hold it at a time. Locks, mutexes, and DB row locks are mutually exclusive by design. You can't really remove this one because it's why you have locks at all.
>
> Second: **hold and wait** — a thread holds at least one resource and requests additional resources held by others. Classic: Thread A holds Lock 1 and waits for Lock 2. Break this by acquiring all locks at once or using try-lock with backoff.
>
> Third: **no preemption** — locks cannot be taken away from a thread; the thread must release them voluntarily. `tryLock(timeout)` is a form of voluntary preemption — the thread decides to give up after a timeout. Break this by allowing timeouts.
>
> Fourth: **circular wait** — a circular chain of threads, each waiting for a resource held by the next. Thread A → waits for Thread B → waits for Thread A. Break this with global lock ordering — all threads acquire locks in the same order, so circular wait is impossible.
>
> In practice, lock ordering (breaking circular wait) is the most common and reliable prevention strategy in Java code.

---

### Q2 — Deep Dive
**Interviewer asks:** "How would you diagnose a deadlock in a production Spring Boot service?"

**Hruday's answer:**
> Step 1: **Confirm it's a deadlock, not just slowness.** Signs: certain operations hang indefinitely, timeouts start firing, threads that should complete are stuck. Thread pool activeCount stays maxed. No new tasks completing.
>
> Step 2: **Take a thread dump without stopping the JVM.** On Linux: `kill -3 <pid>` (writes to stdout/logs) or `jstack <pid>`. In containers: `jcmd <pid> Thread.print` or use a pod exec command. In Spring Boot with Actuator, if the app is still somewhat responsive: `GET /actuator/threaddump`.
>
> Step 3: **Read the thread dump.** Look for "Found one Java-level deadlock" near the top. The dump will list the thread names, which lock each holds, and which each is waiting for. The cycle is clearly shown.
>
> Step 4: **Match thread names to code.** If I've named my threads properly (like `order-processor-3`), I can immediately find which service method is involved. Trace back to the code path that acquires the locks.
>
> Step 5: **Fix — usually lock ordering.** Determine what two (or more) resources are being locked in different orders. Standardise the order, or replace the inner lock acquisition with `tryLock(timeout)`.
>
> Step 6: **Add deadlock detection to monitoring.** Schedule a `ThreadMXBean.findDeadlockedThreads()` check every 30 seconds. Alert immediately if a deadlock is found. This catches regressions in CI or early in production.

---

### Q3 — Tricky Scenario
**Interviewer asks:** "You have a production service where a scheduled job and an HTTP handler both update the same two resources. How do you prevent deadlocks without changing the business logic?"

**Hruday's answer:**
> This is the classic "two parties need the same two resources" scenario. The safest solution without touching business logic: enforce a consistent lock acquisition order that both code paths obey.
>
> If the two resources are database rows, I sort by primary key. If they're in-memory objects with identifiable addresses or IDs, I sort by that. The key insight: as long as every code path — whether scheduled job or HTTP handler — acquires the locks in the same order, circular wait is impossible.
>
> Here's the pattern I'd apply:
> ```java
> void updateResources(Resource r1, Resource r2) {
>     // Order by identity hash code — consistent, no object IDs needed
>     if (System.identityHashCode(r1) < System.identityHashCode(r2)) {
>         synchronized(r1) { synchronized(r2) { applyUpdate(); } }
>     } else if (System.identityHashCode(r1) > System.identityHashCode(r2)) {
>         synchronized(r2) { synchronized(r1) { applyUpdate(); } }
>     } else {
>         // Tie-breaker needed — use an additional lock to handle hash collision
>         synchronized(tieBreaker) { synchronized(r1) { synchronized(r2) { applyUpdate(); } } }
>     }
> }
> ```
> In practice for DB resources, I'd use SELECT FOR UPDATE with consistent ID ordering in the WHERE clause.
>
> Secondary measure: add `@Transactional(timeout = 10)` on the scheduled job so that if the job is waiting for a DB lock longer than 10 seconds, it rolls back with a timeout exception rather than hanging indefinitely.

---

### Q4 — Thread Pool Deadlock
**Interviewer asks:** "What's a thread pool deadlock and how is it different from a regular lock-based deadlock?"

**Hruday's answer:**
> A thread pool deadlock is more subtle because there are no traditional lock objects involved. The deadlock occurs through task dependencies.
>
> Classic scenario: a FixedThreadPool with 5 threads. Five outer tasks are submitted and all 5 threads are occupied. Each outer task submits an inner task to the SAME pool and calls `future.get()` — blocking its thread waiting for the inner task's result. But the pool has no free threads — all 5 are blocked waiting. The inner tasks are queued but can never start because no thread is available. All 5 threads wait forever.
>
> It's different from a lock deadlock in two ways. First, there's no circular lock ownership — no `jstack` deadlock report. The thread dump just shows all threads blocked on `FutureTask.get()` — it LOOKS like a performance issue, not a deadlock. Very hard to diagnose. Second, the resource being waited on isn't a lock — it's a free thread slot in the pool.
>
> Prevention: use separate thread pools for parent tasks and child tasks. Never have a task in Pool A submit work to Pool A and block waiting for it. Either submit to a different pool (Pool B has dedicated threads for child tasks) or restructure the code to use `CompletableFuture.thenCompose()` — asynchronous chaining that doesn't hold threads while waiting.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Deadlocks are rare in Java" | "Just use synchronized carefully." | "Deadlocks are common in any multi-threaded system with multiple resources. Any code path that acquires two locks is a candidate. Always lock in a consistent order." |
| Thread dump only shows monitor deadlocks | "jstack will show me all deadlocks." | "jstack shows monitor (synchronized) deadlocks automatically. ReentrantLock deadlocks need ThreadMXBean.findDeadlockedThreads(). Thread pool deadlocks show as threads blocked on Future.get() — no deadlock marker." |
| tryLock fixes everything | "I'll just use tryLock everywhere." | "tryLock can cause livelock — both threads retry at the same time, both fail, both retry again, forever cycling. Add randomised backoff (ThreadLocalRandom.nextInt()) to break the symmetry." |
| Deadlock needs exactly 2 threads | "Deadlock = Thread A waits for B, B waits for A." | "Deadlocks can be multi-party cycles: A→B→C→A. Three threads, each with one lock, each waiting for the next. Same Coffman conditions apply. Lock ordering prevents all cycle lengths." |

---

## 7. Hruday's Real Experience Hook

> "At Capgemini, I worked on a Node.js/Java hybrid microservice that processed insurance claim events. Two workers shared two externally managed resources: a Redis distributed lock for the claim document and a DB row lock on the claim record. Worker A always locked Redis first, then acquired the DB row. Worker B locked the DB row first (inside a `@Transactional` Spring method), then tried to acquire the Redis lock. Classic out-of-order acquisition.
>
> The symptom: every few nights, two claim events would get stuck and time out. The on-call team would restart the service (releasing the locks) and claims would process — treating it as a transient issue for months. When I traced the timing, I found the pattern: only one specific pair of claim IDs caused the overlap.
>
> The fix: standardised lock acquisition in both workers. Always acquire the Redis distributed lock BEFORE starting the Spring transaction (which would then acquire the DB row lock). Now both workers locked in the same order. The nightly timeouts stopped.
>
> The lesson: distributed locks live outside the JVM — jstack won't show you the Redis lock. You have to trace the lock acquisition order at the application logic level, not just the JVM level."

---

## 8. Scale Evolution

**Junior engineer →** Knows deadlock as a concept. Fixes it by removing locks entirely (introduces race conditions) or adding more synchronized methods.

**Mid-level engineer →** Uses lock ordering within a single JVM. Knows `jstack` for diagnosis. Can identify classic deadlocks from thread dumps.

**Senior engineer →** Handles distributed deadlocks (DB locks, Redis locks, service-to-service calls). Uses `tryLock(timeout)` with randomised backoff. Adds programmatic deadlock detection via `ThreadMXBean`. Knows thread pool deadlocks.

**Staff engineer →** Designs systems to minimise shared mutable state (immutable data, event-driven architecture) so locking is rarely needed. When locks are unavoidable, uses structured lock hierarchies documented as architecture decisions. Instruments lock contention with Micrometer.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment transfers — concurrent access to from/to accounts, DB row deadlocks are real | "You used ID-ordered SELECT FOR UPDATE to prevent DB deadlocks. That's a real production pattern." |
| Swiggy / Meesho | Order status updates from multiple threads (payment + logistics + inventory simultaneously) | "You explained thread pool deadlock and how to detect it. Most candidates miss that." |
| Google / Amazon | SDE-2 Java systems design — deadlock is a canonical concurrent programming interview topic | "Describe how you'd diagnose a deadlock in a running JVM without restarting it." |
| SAP | Enterprise background jobs running alongside web request handlers — classic scheduled+HTTP deadlock scenario | "You standardised lock order across the batch job and HTTP handler. Real production thinking." |

---

## 10. Related Topics — What to Study Next

- **synchronized vs ReentrantLock (Topic 27)** — The locking primitives that cause deadlocks. `tryLock(timeout)` is the key ReentrantLock feature for deadlock prevention.
- **CompletableFuture (Topic 29)** — The modern way to avoid lock-based deadlocks: pass results through async chains instead of sharing mutable state.
- **Thread Pools (Topic 26)** — Thread pool deadlock scenario — tasks waiting for tasks in the same pool.
- **Distributed Systems (Part 8)** — Distributed deadlocks across services, two-phase locking, and why distributed transactions amplify deadlock risk.

---

*Part 2 · Deadlock — Detection and Prevention · Full Stack Interview Guide · Hruday D · 2026*
