# Thread Lifecycle and States
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- A Java thread has 6 states: **NEW** → **RUNNABLE** → **BLOCKED / WAITING / TIMED_WAITING** → **TERMINATED**.
- **NEW**: thread created, `start()` not yet called.
- **RUNNABLE**: thread is running OR ready to run (waiting for CPU — OS decides actual execution).
- **BLOCKED**: waiting to acquire a `synchronized` lock held by another thread.
- **WAITING**: waiting indefinitely — someone must call `notify()`, `notifyAll()`, or the thread must be interrupted.
- **TIMED_WAITING**: waiting with a timeout — `Thread.sleep(ms)`, `obj.wait(ms)`, `lock.tryLock(ms)`.
- **TERMINATED**: run() method finished or an uncaught exception ended it.
- Interview trap: BLOCKED = waiting for a lock. WAITING = waiting for a signal. Two completely different states. Deadlock involves BLOCKED threads, not WAITING ones.

---

## 1. One-Line Definition
A Java thread's lifecycle is the sequence of states — NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED — that describes what a thread is doing at any given moment, from creation to completion.

---

## 2. The Problem It Solves

A Spring Boot service goes unresponsive at midnight. Requests pile up. No errors in the log — just silence. The on-call engineer connects to the running JVM and runs `jstack <PID>`. The thread dump shows:

```
49 threads in state: BLOCKED
12 threads in state: WAITING
2 threads in state: RUNNABLE
```

Without knowing thread states, this dump is meaningless. With knowledge of thread states: 49 threads waiting for a lock means there's severe lock contention or a deadlock. The 12 threads in WAITING are probably waiting for a condition that no one is signalling. The 2 RUNNABLE threads? They might be holding the locks that 49 threads are fighting for.

The entire diagnosis of production threading problems — deadlocks, thread starvation, lock contention, executor saturation — starts with reading thread dumps and knowing what each state means. Thread lifecycle knowledge is not academic — it's the diagnostic vocabulary for production incidents.

---

## 3. How It Works Internally

### The Mental Model
Think of threads like workers in a factory.

- **NEW**: hired but hasn't started their first shift yet.
- **RUNNABLE**: on the floor working, or standing at their station waiting for the machine (CPU) to be free — the manager (OS scheduler) decides who gets on the machine.
- **BLOCKED**: standing outside a locked tool cabinet, waiting for a coworker to finish using the tool and release the key (the `synchronized` lock).
- **WAITING**: standing in the break room, waiting for a call that says "your next task is ready" — someone has to call them back (`notify()`).
- **TIMED_WAITING**: same as WAITING but with an alarm set — "if nobody calls me in 5 minutes, I'll go check myself."
- **TERMINATED**: finished their shift, gone home for the day.

### The Mechanism — State Transitions in Detail

```
  Thread t = new Thread(() -> { ... });
     ↓ (state: NEW)

  t.start();
     ↓ (state: RUNNABLE — ready to run or currently executing on CPU)

  RUNNABLE → BLOCKED:
     Thread tries to enter a synchronized block/method
     held by another thread → goes to BLOCKED
     "I want the lock, but it's held — blocking until it's free"

  RUNNABLE → WAITING:
     Thread calls:
       - Object.wait()             (releases lock, waits for notify/notifyAll)
       - Thread.join() (no timeout) (waits for another thread to finish)
       - LockSupport.park()        (waits until unparked)

  RUNNABLE → TIMED_WAITING:
     Thread calls:
       - Thread.sleep(ms)
       - Object.wait(ms)
       - Thread.join(ms)
       - Lock.tryLock(time, unit)
       - LockSupport.parkNanos(ns)

  BLOCKED/WAITING/TIMED_WAITING → RUNNABLE:
     - Lock is released → BLOCKED thread becomes RUNNABLE
     - notify()/notifyAll() called → WAITING thread becomes BLOCKED (must re-acquire lock)
     - Timeout expires → TIMED_WAITING thread becomes RUNNABLE
     - Thread.interrupt() → WAITING/TIMED_WAITING thread throws InterruptedException

  RUNNABLE → TERMINATED:
     - run() method completes normally
     - Uncaught exception escapes run()
     - Thread cannot restart once TERMINATED
```

**Thread.State enum — what the JDK defines:**
```java
public enum State {
    NEW,
    RUNNABLE,
    BLOCKED,
    WAITING,
    TIMED_WAITING,
    TERMINATED
}

// Get a thread's state:
Thread.State state = myThread.getState();
```

**BLOCKED vs WAITING — the critical distinction:**
```
BLOCKED:
  - Trying to acquire a MONITOR lock (synchronized keyword)
  - No action needed from anyone else — thread will unblock automatically when lock is released
  - Shows up in thread dumps as: "waiting to lock <0x00000000c2b5f210>"

WAITING:
  - Voluntarily waiting — has released the lock, waiting for a signal
  - Needs notify()/notifyAll() or LockSupport.unpark() to wake up
  - If signal is never sent: WAITING forever (deadlock-like situation)
  - Shows up in thread dumps as: "in Object.wait()"
```

### ASCII Diagram

```
JAVA THREAD STATE MACHINE:
────────────────────────────────────────────────────────────────────
                    new Thread()
                        │
                        ▼
                      ┌─────┐
                      │ NEW │
                      └─────┘
                        │ t.start()
                        ▼
                   ┌──────────┐
         ┌────────▶│ RUNNABLE │◀──────────────────────┐
         │         └──────────┘                        │
         │      / executing or waiting for CPU \        │
         │                 │                            │
         │    ┌────────────┼──────────────┐            │
         │    │            │              │            │
         │    ▼            ▼              ▼            │
         │  ┌────────┐  ┌─────────┐  ┌────────────┐  │
         │  │BLOCKED │  │WAITING  │  │TIMED_WAITING│  │
         │  │(sync   │  │(wait(), │  │(sleep(),   │  │
         │  │ lock)  │  │ join()) │  │ wait(ms),  │  │
         │  └────────┘  └─────────┘  │ tryLock()) │  │
         │       │           │       └────────────┘  │
         │  lock │       notify│          timeout│     │
         │  released│    ();  │         expires │     │
         └──────────┴──────────┴─────────────────┘    │
                                                       │
                   ┌────────────┐                      │
                   │ TERMINATED │  ← run() finishes ───┘
                   └────────────┘
────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — Ignoring Thread States Leads to Misdiagnosis
```java
// WRONG 1: Confusing BLOCKED and WAITING in code design
// This code intends to use wait/notify but accidentally causes DEADLOCK:

public class BrokenQueue {
    private Queue<Task> tasks = new LinkedList<>();

    public synchronized void addTask(Task task) {
        tasks.add(task);
        notify();    // Correct: signals a waiting consumer
    }

    public synchronized Task takeTask() throws InterruptedException {
        while (tasks.isEmpty()) {
            wait();  // Releases lock, enters WAITING state
        }
        // BUG: what if two consumer threads both wake up?
        // One gets the task, the other calls tasks.poll() on an empty queue
        // → NullPointerException (missing null check after while loop exit)
        return tasks.poll();
    }
}

// WRONG 2: Calling Thread.sleep() inside a synchronized block
// (holds the lock while sleeping — blocks all other threads from entering)
public synchronized void processWithDelay() throws InterruptedException {
    doWork();
    Thread.sleep(1000);   // Holding the lock for 1 second!
    // Every other thread needing this lock is BLOCKED for 1 second.
    // 100 threads blocked = 100-second combined wait time
    doMoreWork();
}

// WRONG 3: Not handling InterruptedException properly
public void doLongWork() {
    try {
        Thread.sleep(Long.MAX_VALUE);  // Waiting a very long time
    } catch (InterruptedException e) {
        // WRONG: swallowing the interrupt!
        // The interrupt signal is now lost. Thread continues as if nothing happened.
        // The thread pool trying to shut this down will wait forever.
    }
}
```

### Right Way — Thread States Used Correctly
```java
// RIGHT 1: Correct wait/notify with while loop (always check condition in loop)
public class CorrectBlockingQueue<T> {
    private final Queue<T> items = new LinkedList<>();
    private final int maxSize;

    public CorrectBlockingQueue(int maxSize) {
        this.maxSize = maxSize;
    }

    public synchronized void put(T item) throws InterruptedException {
        while (items.size() == maxSize) {  // while, not if — re-check after wakeup
            wait();            // WAITING state: releases lock, waits for signal
        }
        items.add(item);
        notifyAll();           // Signal all — consumers might be waiting
    }

    public synchronized T take() throws InterruptedException {
        while (items.isEmpty()) {  // while loop handles spurious wakeups
            wait();
        }
        T item = items.poll();
        notifyAll();           // Signal all — producers might be waiting for space
        return item;
    }
}

// In practice: prefer java.util.concurrent.LinkedBlockingQueue — it does all this correctly.

// RIGHT 2: Don't hold locks while sleeping — release and re-acquire
public void processWithDelay() throws InterruptedException {
    synchronized(this) {
        doWork();
    }                         // Lock released
    Thread.sleep(1000);       // Sleep WITHOUT holding the lock
    synchronized(this) {
        doMoreWork();
    }                         // Re-acquire when needed
}

// RIGHT 3: Always propagate or restore the interrupt
public void doLongWork() {
    try {
        Thread.sleep(10_000);
    } catch (InterruptedException e) {
        // Option A: restore interrupt flag (if you can't throw from this method)
        Thread.currentThread().interrupt();
        return;  // Exit cleanly

        // Option B: propagate (preferred when signature allows)
        // throw e;
    }
}

// RIGHT 4: Reading thread states for diagnostics
public void diagnoseThreadPool(ExecutorService executor) {
    if (executor instanceof ThreadPoolExecutor tpe) {
        System.out.println("Active threads: " + tpe.getActiveCount());
        System.out.println("Queue size: " + tpe.getQueue().size());
        System.out.println("Completed: " + tpe.getCompletedTaskCount());
    }
    // For full thread state dump:
    // jstack <PID> or Thread.getAllStackTraces() in code
}

// RIGHT 5: Using thread states via JMX/actuator in Spring Boot
// Spring Boot Actuator exposes thread info at: /actuator/threaddump (JSON)
// Each entry has: threadName, threadState, blockedCount, waitedCount, stackTrace
// JSON format makes it easy to parse and alert on high BLOCKED counts.
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Walk me through the Java thread lifecycle."

**Hruday's answer:**
> A thread starts in the **NEW** state — created but `start()` not yet called.
>
> `start()` moves it to **RUNNABLE**. In this state, the thread is either actively executing on a CPU core or waiting for the OS scheduler to give it one. From our code's perspective, we can't distinguish "executing" from "waiting for CPU" — both show as RUNNABLE.
>
> From RUNNABLE, a thread can move to three blocking states:
>
> **BLOCKED**: trying to acquire a `synchronized` lock that another thread holds. It just waits quietly until the lock is released. No notification needed — it will unblock automatically.
>
> **WAITING**: called `wait()`, `join()` (no timeout), or `LockSupport.park()`. The thread voluntarily pauses — it's waiting for a signal. Someone must call `notify()`, `notifyAll()`, or `unpark()` to wake it up. If the signal never comes, it waits forever.
>
> **TIMED_WAITING**: same as WAITING but with a timeout. `Thread.sleep(1000)`, `wait(1000)`, `join(1000)`. Wakes up when the signal arrives OR when the time expires — whichever comes first.
>
> From any of those states, the thread returns to RUNNABLE when the condition is met.
>
> Finally, when `run()` completes (normally or via exception), the thread moves to **TERMINATED**. It can't be restarted.

---

### Q2 — Deep Dive
**Interviewer asks:** "What's the difference between BLOCKED and WAITING states?"

**Hruday's answer:**
> They're both "not running" states, but the cause and remedy are completely different.
>
> **BLOCKED** means the thread is trying to enter a `synchronized` block or method, but another thread currently holds that lock. The BLOCKED thread does nothing — it just waits at the lock boundary. When the lock is released, the JVM wakes up the BLOCKED thread (or one of many waiting). No action needed from your code — it's handled by the JVM's lock mechanism.
>
> **WAITING** means the thread called `wait()` — it voluntarily released a lock it held and is now waiting to be signalled. It will stay WAITING until another thread calls `notify()` or `notifyAll()` on the same object. If `notify()` is never called — maybe due to a bug where the producer never adds an item, or a condition that's never satisfied — the waiting thread hangs indefinitely.
>
> In a thread dump:
> - BLOCKED threads show: `"waiting to lock <0xABCDEF>"` — the lock object's address.
> - WAITING threads show: `"in Object.wait()"` — inside the wait call.
>
> This distinction matters for diagnosing production problems. 50 threads BLOCKED on the same lock → lock contention or a thread holding the lock is stuck. 5 threads WAITING on the same condition → producer isn't signalling, or a bug in the notification logic.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Why should you always use a while loop around wait(), not an if statement?"

**Hruday's answer:**
> Two reasons: spurious wakeups and multiple consumers.
>
> **Spurious wakeups**: the JVM specification allows threads to wake up from `wait()` even when nobody called `notify()`. This is rare but legal. If you use `if (queue.isEmpty()) { wait(); }`, a spuriously-woken thread will proceed to `queue.poll()` on an empty queue — `NullPointerException`. The `while` loop re-checks the condition: `while (queue.isEmpty()) { wait(); }`. If the condition is still false (spurious wake), it waits again. Safe.
>
> **Multiple consumers**: you call `notifyAll()` to wake all waiting consumers. Only one item is in the queue. All 5 waiting consumers wake up. The first one grabs the item. The other 4 also wake up and check the queue — it's now empty. With `if`, all 4 proceed to `queue.poll()` on an empty queue. With `while`, all 4 re-check the condition, see it's empty, and go back to waiting.
>
> The rule: any time you call `wait()`, wrap it in a `while` loop that checks your condition. This is in the Java documentation and is non-negotiable for correct wait/notify code.

---

### Q4 — Scenario Question
**Interviewer asks:** "A thread dump shows 100 threads in BLOCKED state, all waiting for the same lock. What does this suggest and what do you do?"

**Hruday's answer:**
> 100 threads all BLOCKED on the same lock is a severe lock contention problem. Here's my diagnosis:
>
> Step 1: identify which thread currently holds the lock. The thread dump will show something like: `"- waiting to lock <0x000000076b2b5490> (owned by Thread-12 "http-thread-pool-1")`. Thread-12 holds the lock. Find Thread-12 in the dump — see what it's doing.
>
> **Case A: Thread-12 is doing slow work while holding the lock.** For example, making an HTTP call or running a slow DB query while holding a `synchronized` lock. Fix: move the slow work outside the `synchronized` block. Only synchronise the minimum: the actual shared state read/write.
>
> **Case B: Thread-12 is also BLOCKED or WAITING.** That's a deadlock. Thread-12 is waiting for a lock held by another thread that's waiting for Thread-12. Fix: break the deadlock by releasing locks in a consistent order, or use `tryLock` with timeout.
>
> **Case C: The lock itself is overly coarse.** One `synchronized` method protects `50` lines of code when only `2` lines need the lock. Fix: narrow the synchronized block — hold the lock for the minimum time.
>
> The immediate production fix if this is an incident: if the lock is on a `HashMap`, replace with `ConcurrentHashMap`. If it's on a service method, consider `ReentrantLock` with `tryLock` so threads can fail fast rather than pile up.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| BLOCKED = WAITING | "BLOCKED and WAITING are the same — both mean the thread isn't running." | "Different states with different causes. BLOCKED = waiting for a lock. WAITING = voluntarily paused waiting for a signal. Completely different in thread dumps." |
| if instead of while around wait() | "I use if (condition) { wait(); }" | "Always use while around wait(). Spurious wakeups and multiple consumers make if unsafe." |
| Holding lock while sleeping | "I can sleep inside a synchronized method." | "Sleep while holding a lock blocks every other thread needing that lock. Always sleep outside synchronized blocks." |
| Swallowing InterruptedException | "I catch InterruptedException and continue." | "Either rethrow it or restore the interrupt flag with Thread.currentThread().interrupt(). Swallowing kills the thread pool's ability to shut down." |

---

## 7. Hruday's Real Experience Hook

> "At Bosch, our real-time WebSocket service had a thread pool that processed sensor data updates. One day the service stopped delivering updates to connected clients — everything appeared to be running. I took a thread dump via `jstack` and found 47 of 50 thread pool threads in BLOCKED state, all waiting on the same lock inside our `SensorDataBuffer.add()` method — which was `synchronized` and included a slow compression call. The three RUNNABLE threads were the ones monopolising the lock — one at a time — doing 50ms of compression each. The fix: move the compression outside the synchronized block. Only synchronise the actual buffer `add()` — one line. BLOCKED thread count dropped to 0. Throughput restored in one deploy. After that, 'hold locks for the minimum time possible' became a team principle."

---

## 8. Scale Evolution

**Junior engineer →** Knows threads exist. Hasn't read a thread dump. Doesn't know the states by name.

**Mid-level engineer →** Knows the states. Has used `synchronized`. Has seen a BLOCKED thread. Might not know WAITING vs BLOCKED distinction deeply.

**Senior engineer →** Reads thread dumps routinely. Can diagnose lock contention, deadlocks, and WAITING condition bugs from a dump. Knows the while-loop pattern for wait/notify. Uses `jstack` or Spring Boot Actuator thread dump endpoint.

**Staff engineer →** Builds thread dump alerting into production observability. Sets thresholds: "> 30% threads BLOCKED → page on-call." Designs shared state patterns that avoid contention entirely (immutable data, per-thread data, ConcurrentHashMap).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | High-concurrency payment processing — thread contention under load is a live risk | "You diagnosed the compression-inside-lock contention from a thread dump. That's exactly what we see." |
| Swiggy / Meesho | Order processing thread pools — BLOCKED threads = orders not being processed | "You explained why 100 BLOCKED threads on one lock is contention, not deadlock, and how to tell which." |
| Adobe / SAP | Long-running server processes — thread leak and contention cause production incidents | "You knew the while-loop pattern for wait/notify and explained spurious wakeups." |
| Google / Amazon | SDE-2 Java concurrency questions — thread state transitions are standard | "Draw the Java thread state machine and explain every transition." |

---

## 10. Related Topics — What to Study Next

- **Thread Pools — Executors, ThreadPoolExecutor (Topic 26)** — The next topic. How thread pools manage the thread lifecycle for you.
- **synchronized vs ReentrantLock vs volatile (Topic 27)** — The locking mechanisms that cause BLOCKED state and control WAITING behaviour.
- **Deadlock — Detection and Prevention (Topic 28)** — Deadlock is the scenario where BLOCKED threads wait forever for each other.
- **CompletableFuture (Topic 29)** — Async non-blocking patterns that avoid WAITING and BLOCKED states entirely by not blocking threads.

---

*Part 2 · Thread Lifecycle and States · Full Stack Interview Guide · Hruday D · 2026*
