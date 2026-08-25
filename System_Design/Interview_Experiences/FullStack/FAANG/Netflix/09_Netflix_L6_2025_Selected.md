# Netflix — L6 FullStack Interview Experience (2025) — #9

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | L6 |
| **YOE** | 8 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA |
| **Source** | [Blind](https://www.teamblind.com) |
| **Author** | Anonymous |
| **Team** | Encoding Pipeline |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Culture Fit)

---

## Round 3: Coding — Implement a Concurrent Work-Stealing Queue
**Duration:** 60 minutes

### Question: Implement a work-stealing deque used in fork-join parallelism. The owning thread pushes/pops from the bottom (LIFO). Stealing threads take from the top (FIFO). Must be lock-free for the owner.

```java
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicReferenceArray;

/**
 * Work-Stealing Deque (Chase-Lev):
 * 
 * - Owner thread: pushBottom(), popBottom() — fast path, no CAS needed usually
 * - Thieves: steal() — CAS on top pointer
 * - Resizable circular array
 * 
 * Based on: "Dynamic Circular Work-Stealing Deque" (Chase & Lev, 2005)
 * 
 * bottom: index where owner pushes next (owned exclusively)
 * top: index where thieves steal from (contended, CAS)
 * 
 * Invariant: top <= bottom, size = bottom - top
 */
class WorkStealingDeque<T> {
    
    // Circular buffer (resizable)
    static class CircularArray<T> {
        private final int logSize;
        private final AtomicReferenceArray<Object> segment;
        
        CircularArray(int logSize) {
            this.logSize = logSize;
            int size = 1 << logSize;
            this.segment = new AtomicReferenceArray<>(size);
        }
        
        int size() { return 1 << logSize; }
        
        @SuppressWarnings("unchecked")
        T get(long index) {
            return (T) segment.get((int)(index & (size() - 1)));
        }
        
        void put(long index, T value) {
            segment.set((int)(index & (size() - 1)), value);
        }
        
        /**
         * Grow: double the array, copy all elements.
         * Called only by owner thread (no concurrent writes to bottom half).
         */
        CircularArray<T> grow(long bottom, long top) {
            CircularArray<T> newArray = new CircularArray<>(logSize + 1);
            for (long i = top; i < bottom; i++) {
                newArray.put(i, this.get(i));
            }
            return newArray;
        }
    }
    
    private volatile long bottom = 0;
    private final AtomicLong top = new AtomicLong(0);
    private volatile CircularArray<T> array;
    
    private static final int INITIAL_LOG_SIZE = 4; // 16 slots
    
    public WorkStealingDeque() {
        this.array = new CircularArray<>(INITIAL_LOG_SIZE);
    }
    
    /**
     * Push a task onto the bottom (owner thread only).
     * 
     * No synchronization needed for the write — only owner writes to bottom.
     * Resize if full.
     */
    public void pushBottom(T task) {
        long b = bottom;
        long t = top.get();
        CircularArray<T> a = array;
        
        if (b - t >= a.size() - 1) {
            // Grow the array
            a = a.grow(b, t);
            array = a;
        }
        
        a.put(b, task);
        
        // StoreStore barrier: ensure task is visible before incrementing bottom
        // In Java, volatile write to bottom provides this
        bottom = b + 1;
    }
    
    /**
     * Pop a task from the bottom (owner thread only — LIFO).
     * 
     * Contention with steal(): if only one element left, uses CAS to resolve.
     */
    @SuppressWarnings("unchecked")
    public T popBottom() {
        long b = bottom - 1;
        CircularArray<T> a = array;
        bottom = b; // Volatile write — makes decrement visible to stealers
        
        long t = top.get();
        long size = b - t;
        
        if (size < 0) {
            // Empty
            bottom = t;
            return null;
        }
        
        T task = a.get(b);
        
        if (size > 0) {
            // More than one element — no contention, safe to take
            return task;
        }
        
        // Exactly one element left — contend with steal()
        // Use CAS on top to claim it
        if (!top.compareAndSet(t, t + 1)) {
            // Stealer got it
            task = null;
        }
        
        bottom = t + 1; // Reset to empty state
        return task;
    }
    
    /**
     * Steal a task from the top (thief thread — FIFO).
     * 
     * Uses CAS on top pointer. If contention, just return null (try another deque).
     */
    public T steal() {
        long t = top.get();
        long b = bottom; // Volatile read
        
        if (t >= b) {
            // Empty
            return null;
        }
        
        CircularArray<T> a = array;
        T task = a.get(t);
        
        // CAS to claim this slot
        if (!top.compareAndSet(t, t + 1)) {
            // Another stealer or popBottom won — abort
            return null;
        }
        
        return task;
    }
    
    public int size() {
        long b = bottom;
        long t = top.get();
        return (int) Math.max(0, b - t);
    }
    
    public boolean isEmpty() {
        return size() == 0;
    }
}

/**
 * Simple Fork-Join pool demonstrating work-stealing.
 */
class SimpleWorkStealingPool {
    private final WorkStealingDeque<Runnable>[] deques;
    private final Thread[] workers;
    private volatile boolean shutdown = false;
    
    @SuppressWarnings("unchecked")
    SimpleWorkStealingPool(int nThreads) {
        deques = new WorkStealingDeque[nThreads];
        workers = new Thread[nThreads];
        
        for (int i = 0; i < nThreads; i++) {
            deques[i] = new WorkStealingDeque<>();
            final int id = i;
            workers[i] = new Thread(() -> workerLoop(id));
            workers[i].setDaemon(true);
            workers[i].start();
        }
    }
    
    void submit(Runnable task) {
        // Round-robin assignment
        int idx = (int)(Thread.currentThread().getId() % deques.length);
        deques[idx].pushBottom(task);
    }
    
    private void workerLoop(int id) {
        while (!shutdown) {
            // Try own deque first (LIFO — cache-friendly)
            Runnable task = deques[id].popBottom();
            
            if (task == null) {
                // Work stealing: try other deques (FIFO — coarse-grained)
                task = trySteal(id);
            }
            
            if (task != null) {
                task.run();
            } else {
                Thread.yield(); // Nothing to do
            }
        }
    }
    
    private Runnable trySteal(int myId) {
        for (int i = 0; i < deques.length; i++) {
            if (i == myId) continue;
            Runnable stolen = deques[i].steal();
            if (stolen != null) return stolen;
        }
        return null;
    }
    
    void shutdown() {
        this.shutdown = true;
    }
}
```

---

## 🎯 Key Takeaways
- Netflix L6 = **Lock-free concurrent work-stealing deque (Chase-Lev)** — systems-level concurrency
- **Bottom**: owned exclusively by one thread — no CAS needed for push (just volatile write)
- **Top**: contended between stealers and popBottom — CAS for synchronization
- **Single-element race**: popBottom and steal can race when size=1 — CAS on top to resolve
- **LIFO for owner**: temporal locality — recently pushed tasks likely in L1 cache
- **FIFO for stealers**: spatial locality — steal coarse-grained older tasks
- **Circular array**: index masking `index & (size - 1)` — power-of-2 size for fast modulo
- **Grow**: only owner calls grow (owns bottom region) — safe to copy without CAS
- Netflix = **high-performance systems** — encoding pipelines, content delivery — expect lock-free data structures

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Coding |
| Coding 1 | Very Hard | Lock-Free DS |
| Coding 2 (this) | Extremely Hard | Work-Stealing Deque |
| System Design | Very Hard | Video Encoding Pipeline |
| Culture | Hard | Netflix Culture |
