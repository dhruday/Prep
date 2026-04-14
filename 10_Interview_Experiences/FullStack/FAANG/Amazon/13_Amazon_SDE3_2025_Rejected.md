# Amazon — SDE-3 FullStack Interview Experience (2025) — #13

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-3 |
| **Level** | L6 |
| **YOE** | 9 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected (Bar Raiser round) |
| **Location** | Seattle, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | AWS Lambda |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite including Bar Raiser)

---

## Round 2: Coding — Implement a Thread-Safe Bounded Channel (Producer-Consumer)
**Duration:** 45 minutes

### Question: Design a bounded blocking channel supporting multiple producers and consumers. put() blocks when full, take() blocks when empty.

```java
import java.util.concurrent.locks.*;
import java.util.LinkedList;

/**
 * Thread-Safe Bounded Channel (Producer-Consumer Queue):
 * 
 * - put(item): blocks if queue is full
 * - take(): blocks if queue is empty
 * - tryPut(item, timeout): non-blocking with timeout
 * - tryTake(timeout): non-blocking with timeout
 * - close(): signal no more items, wake all waiters
 * 
 * Implementation: ReentrantLock + two Conditions (notFull, notEmpty)
 * 
 * Why not synchronized?
 * - Need TWO wait conditions (notFull + notEmpty)
 * - synchronized only has ONE wait set per monitor
 * - ReentrantLock supports multiple Condition objects
 */
class BoundedChannel<T> {
    
    private final LinkedList<T> queue;
    private final int capacity;
    
    private final ReentrantLock lock;
    private final Condition notFull;   // Producers wait here when full
    private final Condition notEmpty;  // Consumers wait here when empty
    
    private volatile boolean closed = false;
    
    public BoundedChannel(int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException("Capacity must be positive");
        this.capacity = capacity;
        this.queue = new LinkedList<>();
        this.lock = new ReentrantLock(true); // Fair lock to prevent starvation
        this.notFull = lock.newCondition();
        this.notEmpty = lock.newCondition();
    }
    
    /**
     * Put item into channel. Blocks if full.
     * Throws IllegalStateException if channel is closed.
     */
    public void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (queue.size() >= capacity) {
                if (closed) throw new IllegalStateException("Channel closed");
                notFull.await(); // Release lock, wait, re-acquire on wake
            }
            
            if (closed) throw new IllegalStateException("Channel closed");
            
            queue.addLast(item);
            notEmpty.signal(); // Wake one waiting consumer
        } finally {
            lock.unlock();
        }
    }
    
    /**
     * Take item from channel. Blocks if empty.
     * Returns null if channel is closed AND empty.
     */
    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (queue.isEmpty()) {
                if (closed) return null; // Channel closed & drained
                notEmpty.await();
            }
            
            T item = queue.removeFirst();
            notFull.signal(); // Wake one waiting producer
            return item;
        } finally {
            lock.unlock();
        }
    }
    
    /**
     * Try to put with timeout.
     * Returns true if successful, false if timed out.
     */
    public boolean tryPut(T item, long timeoutMs) throws InterruptedException {
        long deadline = System.nanoTime() + timeoutMs * 1_000_000;
        
        lock.lock();
        try {
            while (queue.size() >= capacity) {
                if (closed) return false;
                long remaining = deadline - System.nanoTime();
                if (remaining <= 0) return false; // Timeout
                notFull.awaitNanos(remaining);
            }
            
            if (closed) return false;
            
            queue.addLast(item);
            notEmpty.signal();
            return true;
        } finally {
            lock.unlock();
        }
    }
    
    /**
     * Try to take with timeout.
     * Returns null if timed out or channel closed & empty.
     */
    public T tryTake(long timeoutMs) throws InterruptedException {
        long deadline = System.nanoTime() + timeoutMs * 1_000_000;
        
        lock.lock();
        try {
            while (queue.isEmpty()) {
                if (closed) return null;
                long remaining = deadline - System.nanoTime();
                if (remaining <= 0) return null;
                notEmpty.awaitNanos(remaining);
            }
            
            T item = queue.removeFirst();
            notFull.signal();
            return item;
        } finally {
            lock.unlock();
        }
    }
    
    /**
     * Close the channel. No more puts allowed.
     * Consumers can still drain remaining items.
     * Wake all waiters so they can check the closed flag.
     */
    public void close() {
        lock.lock();
        try {
            closed = true;
            notFull.signalAll();  // Wake all blocked producers
            notEmpty.signalAll(); // Wake all blocked consumers
        } finally {
            lock.unlock();
        }
    }
    
    public int size() {
        lock.lock();
        try {
            return queue.size();
        } finally {
            lock.unlock();
        }
    }
    
    public boolean isClosed() { return closed; }
    public boolean isEmpty() { return size() == 0; }
}

/**
 * Usage Pattern:
 * 
 * BoundedChannel<String> channel = new BoundedChannel<>(100);
 * 
 * // Producer threads
 * for (int i = 0; i < 3; i++) {
 *     new Thread(() -> {
 *         try {
 *             for (int j = 0; j < 1000; j++) {
 *                 channel.put("message-" + j);
 *             }
 *         } catch (InterruptedException e) {
 *             Thread.currentThread().interrupt();
 *         }
 *     }).start();
 * }
 * 
 * // Consumer threads
 * for (int i = 0; i < 2; i++) {
 *     new Thread(() -> {
 *         try {
 *             String item;
 *             while ((item = channel.take()) != null) {
 *                 process(item);
 *             }
 *         } catch (InterruptedException e) {
 *             Thread.currentThread().interrupt();
 *         }
 *     }).start();
 * }
 */
```

---

## 🎯 Key Takeaways
- Amazon SDE-3 = **Thread-safe bounded channel + LP stories at Bar Raiser level**
- **Two Conditions pattern**: `notFull` for producers, `notEmpty` for consumers — critical insight over `synchronized`
- **`while` not `if`**: always re-check condition after `await()` — spurious wakeups + race conditions
- **Fair lock**: `ReentrantLock(true)` prevents starvation under high contention
- **`awaitNanos(remaining)`**: timeout-based wait using `deadline - System.nanoTime()` — monotonic clock
- **Graceful close**: set `closed` flag + `signalAll()` both conditions — producers get exception, consumers drain then get null
- **`lock.lock()` in try/finally**: ALWAYS unlock in finally — prevents deadlocks on exceptions
- **Rejected at Bar Raiser**: strong technical but LP stories weren't deep enough on "Disagree and Commit" and "Have Backbone"
- Amazon L6 Bar = **deep LP stories with measurable impact + concurrent programming expertise**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | DSA + LP |
| Coding | Very Hard | Concurrency, Lock+Conditions |
| System Design | Very Hard | AWS Lambda Internals |
| LP Deep Dive | Hard | Leadership Principles |
| Bar Raiser | Very Hard | LP + Behavioral |
