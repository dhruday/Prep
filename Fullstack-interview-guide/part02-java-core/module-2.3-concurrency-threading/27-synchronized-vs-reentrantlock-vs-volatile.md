# synchronized vs ReentrantLock vs volatile
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **volatile**: guarantees visibility, not atomicity. One thread writes, all other threads see the fresh value immediately. No compound operations (i+1 is NOT thread-safe with volatile alone).
- **synchronized**: full mutual exclusion. Only one thread at a time runs the synchronized block. Intrinsic (monitor) lock — every object has one.
- **ReentrantLock**: same mutual exclusion as synchronized, but with extras: tryLock() with timeout, interruptible lock acquisition, fairness, multiple Condition variables.
- Use **volatile** for simple flags and reference updates (no compound operation). Use **synchronized** for simple shared state in straightforward scenarios. Use **ReentrantLock** when you need timeout, interruption, multiple wait conditions, or fairness.
- For counters, prefer `AtomicInteger` over volatile. For collections, prefer `ConcurrentHashMap` over synchronizing a regular `HashMap`.

---

## 1. One-Line Definition
- **volatile**: a keyword that forces every read of a variable to come from main memory and every write to immediately flush to main memory, preventing CPU caching of stale values.
- **synchronized**: a keyword/block that acquires the object's intrinsic monitor lock, ensuring only one thread executes the guarded code at a time and all changes are visible to other threads on release.
- **ReentrantLock**: a `java.util.concurrent.locks` class that provides the same mutual exclusion as `synchronized` but with explicit lock/unlock control, timeout, interruptibility, and fair queuing.

---

## 2. The Problem It Solves

When multiple threads access shared data, two problems emerge:

**Visibility problem:** Thread A writes `running = true` to a CPU register and cache. Thread B reads `running` from its own CPU cache — sees the stale value `false`. Thread B never knows Thread A changed it. This is the cache coherence problem across CPU cores. `volatile` solves it by bypassing the CPU cache — every write is flushed to main memory, every read is from main memory.

**Atomicity problem:** A seemingly simple operation like `count++` is actually three steps: read count, increment it, write it back. If two threads both read `count = 5` at the same time, both increment to 6, both write 6 — you expected 7, you got 6. `volatile` doesn't help here. You need a lock (synchronized or ReentrantLock) or an atomic class (`AtomicInteger`).

**Advanced concurrency problems:** Sometimes you need to try acquiring a lock without waiting forever (deadlock avoidance), or respond to thread interrupts while waiting for a lock, or have multiple wait-and-notify conditions in the same object. `synchronized` doesn't support any of these. `ReentrantLock` does.

---

## 3. How It Works Internally

### The Mental Model for Each

**volatile** — A notice board. When Thread A writes to a volatile variable, it puts the value on the notice board (main memory). When Thread B reads that variable, it checks the notice board instead of its private notepad (CPU cache). Cheap, but only handles single reads/writes.

**synchronized** — A single-key room. The key is the monitor lock. Only one thread holds the key at a time. The holder enters, does work, exits and returns the key. Other threads queue outside the door. When a thread acquires the lock, it also refreshes all its cached variables from main memory. When it releases the lock, all its writes are flushed to main memory. So synchronized guarantees both atomicity AND visibility.

**ReentrantLock** — Same single-key room, but the key has extra features: a timer (tryLock with timeout), an emergency exit button (lock.lockInterruptibly()), and multiple internal waiting rooms (Condition objects for different wait conditions).

### The Mechanism

**volatile under the hood:**
```
Normal variable: CPU may cache value in L1/L2 cache, never refreshing from RAM.
volatile variable: 
  - Write: CPU immediately writes to RAM (store barrier instruction)
  - Read:  CPU always reads from RAM (load barrier instruction)
  - Also prevents instruction reordering around the read/write (memory barrier)
Cost: slightly slower than normal variable (no cache benefit), but still lock-free.
```

**synchronized under the hood:**
```
Every Java object has a monitor (from Object header: 2 bits for lock state).
Thread acquires: CAS on object header (lightweight lock) → if contended, OS mutex (heavyweight lock).
Lock states:
  1. Unlocked → no contention
  2. Biased lock (JVM optimisation: if always same thread, no real lock needed)
  3. Thin (lightweight) lock → fast CAS spin, no OS involvement
  4. Fat (heavyweight) lock → OS mutex, thread parks (goes to sleep), context switch
On entry:  Thread reads all variables fresh from memory (happens-before guarantee).
On exit:   Thread flushes all writes to memory, releases monitor.
```

**ReentrantLock under the hood:**
```
Uses AbstractQueuedSynchronizer (AQS) — a framework that manages:
  - An int state (0 = unlocked, > 0 = locked, value = reentrancy count)
  - A CLH queue of waiting threads (linked list of parked threads)
  
"Reentrant" means: if Thread A holds the lock and calls another synchronized method,
Thread A can re-acquire its own lock. The state counter increments.
Thread A must release the lock as many times as it acquired it.
synchronized is also reentrant (same rule).

tryLock(): attempts CAS on state. Returns false immediately if another thread holds it. Non-blocking.
tryLock(5, SECONDS): tries CAS, parks for up to 5 seconds. Returns false on timeout.
lockInterruptibly(): parks while waiting. If Thread.interrupt() is called, throws InterruptedException.
```

### ASCII Diagram

```
VOLATILE — VISIBILITY ONLY:
  Thread A                   Main Memory              Thread B
  ─────────                  ───────────              ─────────
  flag = true (volatile) ──► flag = true  ◄───────── flag read
  (flushed to RAM immediately)            (always reads from RAM)


SYNCHRONIZED — MUTUAL EXCLUSION + VISIBILITY:
  Thread A         Monitor Lock        Thread B
  ─────────        ────────────        ─────────
  acquire lock ──► LOCKED             tries acquire
                                       BLOCKED (waits)
  execute block
  release lock ──► UNLOCKED ─────────► acquire lock
                                        execute block
                                        release lock


REENTRANTLOCK — EXTRA FEATURES:
  Thread A                 AQS State               Thread B
  ─────────                ─────────               ─────────
  lock.lock() ──────────► state = 1               tryLock() → false (returns immediately, no wait)
  lock.lock() (reenter) ► state = 2               tryLock(3, SECONDS) → waits up to 3s, then false
  lock.unlock() ─────────► state = 1
  lock.unlock() ─────────► state = 0 ────────────► lock.lock() succeeds
           AQS CLH Queue: [Thread C] → [Thread D] → [Thread B] (FIFO if fair=true)
```

---

## 4. The Code

### Wrong Way — Common Mistakes
```java
// WRONG 1: volatile for compound operations
volatile int counter = 0;
// In thread A: counter++
// In thread B: counter++
// counter++ is READ, INCREMENT, WRITE = 3 steps
// volatile only guarantees visibility of each individual step, not the combination
// Both threads can read 5, both write 6, instead of 7. Race condition.

// WRONG 2: Not releasing ReentrantLock in finally → deadlock if exception thrown
lock.lock();
doSomethingThatMightThrow();   // Exception thrown here!
lock.unlock();                  // NEVER REACHED → lock held forever → all other threads block
                                // This is a deadlock source.

// WRONG 3: synchronized on wrong object
class Counter {
    private Object lock = new Object();
    int count = 0;
    
    public void increment() {
        synchronized(this) {     // synchronizes on 'this'
            count++;
        }
    }
    
    public void check() {
        synchronized(lock) {     // synchronizes on 'lock' object — DIFFERENT LOCK
            if (count > 10) { }  // count and check are NOT mutually exclusive!
        }
    }
}
// Two synchronized blocks on different objects → they don't protect each other.

// WRONG 4: synchronized on a mutable reference
synchronized(this.myObject) {  // if myObject reference changes (e.g., reassigned),
    // later blocks synchronize on the NEW object, not this one
    // Different monitors → no mutual exclusion
}

// WRONG 5: Using volatile when you need AtomicReference
volatile List<String> items = new ArrayList<>();
// items = new ArrayList<>(items);  ← replacing the reference is safe (volatile)
// items.add("x");                  ← NOT safe! Internal list state is not volatile.
// volatile only protects the reference, not the object's internal state.
```

### Right Way — Clean Usage of All Three
```java
// CORRECT 1: volatile for a simple flag (single write, single read, no compound op)
public class HealthChecker {
    private volatile boolean running = true;   // shutdown flag

    public void stop() {
        running = false;                       // one write — safe with volatile
    }

    public void checkLoop() {
        while (running) {                      // one read per iteration — safe with volatile
            checkHealth();
        }
    }
}

// CORRECT 2: synchronized for simple shared state (ALWAYS release inside try-finally is not needed,
// synchronized blocks auto-release on exception, so this is fine as-is):
public class SafeCounter {
    private int count = 0;

    public synchronized void increment() {
        count++;                               // only one thread at a time
    }

    public synchronized int get() {
        return count;                          // guarantees visibility of latest write
    }
}

// CORRECT 3: Prefer AtomicInteger for counters — lock-free performance:
public class AtomicCounter {
    private final AtomicInteger count = new AtomicInteger(0);

    public void increment() {
        count.incrementAndGet();               // CAS-based, no lock, thread-safe
    }

    public int get() {
        return count.get();
    }
}

// CORRECT 4: ReentrantLock — ALWAYS in try-finally to guarantee unlock:
public class ResourceManager {
    private final ReentrantLock lock = new ReentrantLock();
    private String resource;

    public void update(String value) {
        lock.lock();                           // acquire (blocks if held by another thread)
        try {
            resource = value;                  // critical section
        } finally {
            lock.unlock();                     // ALWAYS releases, even if exception is thrown
        }
    }

    // tryLock with timeout — avoids deadlock by not waiting forever:
    public boolean tryUpdate(String value, long timeoutMs) throws InterruptedException {
        if (lock.tryLock(timeoutMs, TimeUnit.MILLISECONDS)) {
            try {
                resource = value;
                return true;
            } finally {
                lock.unlock();
            }
        }
        return false;                          // lock not acquired within timeout
    }
}

// CORRECT 5: ReentrantLock with multiple Condition variables (producer-consumer):
public class BoundedBuffer<T> {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull  = lock.newCondition();  // separate wait set for producers
    private final Condition notEmpty = lock.newCondition();  // separate wait set for consumers
    private final Queue<T> queue;
    private final int capacity;

    public BoundedBuffer(int capacity) {
        this.capacity = capacity;
        this.queue = new ArrayDeque<>(capacity);
    }

    public void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (queue.size() == capacity) {
                notFull.await();               // producer waits if buffer full
            }
            queue.add(item);
            notEmpty.signal();                 // wake one consumer
        } finally {
            lock.unlock();
        }
    }

    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (queue.isEmpty()) {
                notEmpty.await();              // consumer waits if buffer empty
            }
            T item = queue.poll();
            notFull.signal();                  // wake one producer
            return item;
        } finally {
            lock.unlock();
        }
    }
}
// Note: with synchronized + Object.wait()/notifyAll(), you only get ONE wait set
// per object. You'd have to notifyAll() waking both producers AND consumers even
// when only one type needs waking. Multiple Condition variables are cleaner.

// CORRECT 6: Fair lock — prevents thread starvation in high-contention:
ReentrantLock fairLock = new ReentrantLock(true);  // fair = FIFO order
// Slightly slower than unfair (default) but prevents any thread from being
// starved indefinitely.
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between volatile and synchronized?"

**Hruday's answer:**
> Both deal with the visibility problem — making sure one thread's writes are visible to other threads. But they differ in atomicity and cost.
>
> `volatile` is lightweight. It guarantees every read comes from main memory and every write flushes to main memory immediately. No thread blocking. But it only protects single reads and writes. If you need to read-then-write atomically (like `count++`), volatile isn't enough.
>
> `synchronized` is heavier. It acquires a monitor lock — only one thread can hold it at a time, blocking others. Inside the block, you have both visibility (in/out memory barriers) AND atomicity (no other thread can execute the same block simultaneously). After release, all writes become visible to the next thread that acquires the same lock.
>
> Rule of thumb: volatile for simple flags where one thread writes and others read. synchronized for any compound operation or when you need the "read-modify-write" to be atomic.

---

### Q2 — Deep Dive
**Interviewer asks:** "When would you choose ReentrantLock over synchronized?"

**Hruday's answer:**
> I use `synchronized` for most simple cases — it's cleaner, less code, and the JVM has optimised it well with biased locking and thin locks. I switch to `ReentrantLock` when I need something `synchronized` can't do:
>
> **1. Timeout on lock acquisition:** `lock.tryLock(5, SECONDS)` — if the lock isn't available in 5 seconds, I give up and take an alternative action. This is key for deadlock avoidance — instead of waiting indefinitely, I time out, log a warning, and retry or fail fast.
>
> **2. Interruptible lock wait:** `lock.lockInterruptibly()` — if the thread is interrupted while waiting for the lock, it throws `InterruptedException` and unblocks. `synchronized` ignores interrupts while waiting for a monitor — you can't cancel a blocked thread.
>
> **3. Multiple Condition variables:** One `ReentrantLock` can have multiple `Condition` objects (`notFull`, `notEmpty` in a bounded buffer). With `synchronized`, you get one wait set per object — `notifyAll()` wakes everyone and you waste cycles. With two Conditions, you `notEmpty.signal()` to wake only consumers, and `notFull.signal()` to wake only producers.
>
> **4. Fairness:** `new ReentrantLock(true)` ensures threads acquire the lock in FIFO order. `synchronized` makes no fairness guarantee — a thread can be starved if unlucky. Fair lock is slower but eliminates starvation risk in high-contention scenarios.
>
> The rule: start with `synchronized`. Move to `ReentrantLock` when you hit one of those four specific needs.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Explain a scenario where volatile could cause a subtle bug."

**Hruday's answer:**
> Classic scenario: a volatile counter shared between threads.
>
> ```java
> volatile int count = 0;
> // Two threads both execute: count++
> ```
>
> Thread A reads count = 5 from main memory. At this exact same instant, Thread B also reads count = 5 from main memory (volatile guarantees freshness on each individual read, but they both read before either has written back). Thread A increments to 6, writes 6 to main memory. Thread B increments its local copy (also 5) to 6, writes 6 to main memory. Both wanted to count to 7, but count is 6. Lost update.
>
> Another subtle bug: checking a condition and acting on it. Example: `if (balance >= amount) { balance -= amount; }`. Even with `volatile int balance`, another thread can deduct from balance between the check and the deduction. The check and the deduction are not atomic. You need `synchronized` or `AtomicInteger.compareAndSet()`.
>
> The rule that saved me: if the operation is purely "set this to X" or "read this", volatile is fine. If the operation is "read, compute, write back" — use `AtomicInteger`, `AtomicReference`, or a lock.

---

### Q4 — Code Review Question
**Interviewer shows code and asks:** "What's wrong with this?"
```java
class Singleton {
    private static Singleton instance;
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

**Hruday's answer:**
> This is the double-checked locking pattern for lazy initialisation. The intent is correct — avoid synchronization every time by checking the null condition first. But there's a subtle bug with Java's memory model.
>
> `instance = new Singleton()` is NOT a single atomic operation. It involves: 1) allocate memory for the object, 2) initialise the object's fields, 3) assign the reference to `instance`. The JVM or CPU can reorder steps 2 and 3 — it might make `instance` point to the allocated but NOT YET FULLY INITIALISED object. Another thread reading `instance` in the first `if` sees a non-null reference and returns a partially-constructed object.
>
> The fix: declare `instance` as **volatile**:
> ```java
> private static volatile Singleton instance;
> ```
> `volatile` adds a memory barrier that prevents instruction reordering around the write to `instance`. Now the reference is only published after the object is fully initialised.
>
> This is the correct Java double-checked locking pattern, valid since Java 5. Alternatively, the simpler pattern is the holder idiom, which avoids synchronization entirely using class loader guarantees — but the volatile fix is the specific answer to this question.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| volatile for thread safety | "volatile makes a variable thread-safe." | "volatile only guarantees visibility, not atomicity. count++ with volatile is still a race condition. Use AtomicInteger for counters." |
| synchronized = heavy | "synchronized is slow, avoid it." | "The JVM heavily optimises synchronized with biased locks and thin locks. It's only slow under high contention (fat lock = OS mutex). Premature optimisation is worse than the lock cost." |
| Forgetting finally on ReentrantLock | "I always unlock at the end of the method." | "If an exception is thrown inside the lock block, unlock at end of method is never reached. Lock held forever. Always: lock.lock(); try { } finally { lock.unlock(); }." |
| synchronized on wrong object | "I just synchronize on this." | "Always verify both methods synchronize on the SAME object. If one uses 'this' and another uses a private lock field, they're on different monitors — no mutual exclusion." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, we had a Spring service that managed a shared connection registry — a Map of user sessions. The original code used synchronized methods on the Map... but the Map reference itself could be replaced during a hot-reload cycle. I found the bug during load testing: after a hot config reload, threads that acquired the lock before the reload were synchronizing on the old Map reference, while threads after the reload were on the new one. Two separate monitors — no mutual exclusion. Session data was getting corrupted.
>
> The fix: introduce a separate, final lock object that never changes reference. The Map could be replaced, but the lock reference stayed the same:
> ```java
> private final Object stateLock = new Object();
> private Map<String, Session> registry = new ConcurrentHashMap<>();
> synchronized(stateLock) { registry = newMap; }
> ```
> That experience cemented the rule: never synchronize on a mutable reference. Always use a dedicated final lock object or let the lock be intrinsic to the class itself via synchronized methods."

---

## 8. Scale Evolution

**Junior engineer →** Uses `synchronized` method on everything. Doesn't know volatile exists. Doesn't understand the visibility problem.

**Mid-level engineer →** Knows volatile vs synchronized. Uses AtomicInteger for counters. Knows ReentrantLock exists but uses only `lock()` and `unlock()`.

**Senior engineer →** Knows when to use tryLock with timeout for deadlock avoidance. Uses multiple Conditions for producer-consumer. Understands the JMM (Java Memory Model) and happens-before relationships that make volatile work.

**Staff engineer →** Designs lock-free structures using `ConcurrentHashMap`, `AtomicReference`, `StampedLock` (read-write optimistic locking) for hot paths. Understands AQS (AbstractQueuedSynchronizer) internals well enough to write custom synchronizers.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment session state, concurrent transaction updates — locking bugs = money lost | "You fixed double-checked locking with volatile. Shows deep JMM knowledge." |
| Swiggy / Meesho | Order status tracking under concurrent updates (payment + logistics threads) | "You chose the right tool for each scenario rather than using synchronized everywhere." |
| Google / Amazon | Senior Java role — synchronized/volatile is a standard JMM deep-dive question at this level | "Describe the happens-before guarantees established by the monitor release." |
| SAP | Enterprise Java microservices — connection pool management, concurrent session registries | "You identified the mutable reference anti-pattern in synchronized. Real production experience." |

---

## 10. Related Topics — What to Study Next

- **Deadlock (Topic 28)** — Next topic. How locks create deadlocks and how tryLock(timeout) prevents them.
- **Thread Pools (Topic 26)** — Threads in a pool share state and use these exact locking mechanisms internally.
- **CompletableFuture (Topic 29)** — The modern alternative: avoid shared mutable state entirely by passing results through futures rather than sharing variables.

---

*Part 2 · synchronized vs ReentrantLock vs volatile · Full Stack Interview Guide · Hruday D · 2026*
