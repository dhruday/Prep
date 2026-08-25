# Thread Pools — Executors, ThreadPoolExecutor
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- A thread pool is a fixed group of pre-created threads that pick up tasks from a queue — reusing threads instead of creating/destroying one per task.
- `ThreadPoolExecutor` has 5 key parameters: **corePoolSize**, **maximumPoolSize**, **keepAliveTime**, **workQueue**, **rejectionHandler**.
- The lifecycle: task arrives → if core threads busy → goes to queue → if queue full → create thread up to maxSize → if maxSize reached → rejection policy runs.
- `Executors.newFixedThreadPool(n)` = fixed pool size, unbounded queue. Risk: unbounded queue → OOM if tasks back up faster than they're consumed.
- `Executors.newCachedThreadPool()` = unlimited threads, 0 queue. Risk: thread explosion under burst load. Never use in production without a bound.
- Know the 4 rejection policies: **AbortPolicy** (throw), **CallerRunsPolicy** (caller's thread executes), **DiscardPolicy** (silently drop), **DiscardOldestPolicy** (drop oldest queued task).

---

## 1. One-Line Definition
A thread pool is a managed group of pre-created reusable threads that processes submitted tasks from an internal queue, eliminating the overhead of creating and destroying threads for every task.

---

## 2. The Problem It Solves

A naive Java web server creates a new `Thread` for every incoming HTTP request. Creating a thread is expensive — the JVM needs memory allocation (stack space), OS-level thread registration, and some initialisation time. On a busy e-commerce site with 500 concurrent requests, this creates 500 threads — each consuming ~512KB of stack. That's 256MB just in thread stacks. And it gets worse: creating 500 threads in a burst takes time; some threads complete and are destroyed immediately while others take longer — constant create/destroy cycles add GC and OS scheduling pressure.

Thread pools solve this by reusing threads. You create 50 threads at startup. Requests arrive, get queued, and threads pick them up one after another. The threads never die — they return to the pool after completing a task. 500 requests, 50 threads processing them in batches of 50 at a time, with the rest in a queue. No thread creation overhead per request.

Tomcat (Spring Boot's default server) uses thread pools for HTTP handling. Spring's `@Async` uses an `Executor` (which is a thread pool) for background tasks. Spring's Kafka consumer runs on a thread pool. Understanding how thread pools work — the parameters, the queue, the rejection policy — is essential for every Spring Boot application in production.

---

## 3. How It Works Internally

### The Mental Model
Think of a restaurant kitchen. The restaurant has 5 chefs (core threads). At lunch rush, orders (tasks) come in faster than 5 chefs can handle, so orders queue up on a ticket rail (work queue). If the queue fills up, the manager calls in 3 extra chefs (additional threads up to max). If still overloaded, the restaurant has a policy: "Sorry, not accepting more orders right now" (rejection policy). After the rush, the extra chefs go home after being idle for 30 minutes (keepAliveTime), and the 5 core chefs stay on.

### The Mechanism — ThreadPoolExecutor Decision Tree

```
Task submitted to ThreadPoolExecutor:

Step 1: Is active thread count < corePoolSize?
  YES → Create a new core thread to run the task.
        (Even if existing core threads are idle — core threads are created on demand)
  NO  → Go to Step 2.

Step 2: Is the workQueue not full?
  YES → Put the task in the queue.
        An idle core thread will pick it up.
  NO  → Go to Step 3.

Step 3: Is active thread count < maximumPoolSize?
  YES → Create a new non-core (temporary) thread to run the task directly.
  NO  → Go to Step 4.

Step 4: Apply RejectedExecutionHandler:
  AbortPolicy (default)    → throw RejectedExecutionException
  CallerRunsPolicy         → the thread that submitted the task runs it directly
  DiscardPolicy            → silently discard the task
  DiscardOldestPolicy      → discard the oldest queued task, re-submit this one
```

**Important nuance:** new threads are only created beyond corePoolSize when the queue is FULL. If corePoolSize=5 and queue is unbounded (LinkedBlockingQueue default), the pool will never grow beyond 5 threads — the queue absorbs all backlog. MaximumPoolSize only matters when the queue has a bound.

**Thread lifecycle in the pool:**
```
Core thread:     Created when first task arrives (up to corePoolSize).
                 Lives as long as the pool is alive.
                 Stays alive even when idle (unless allowCoreThreadTimeOut=true).

Non-core thread: Created when queue is full and threadCount < maxPoolSize.
                 After completing a task, waits for work up to keepAliveTime.
                 If no work arrives within keepAliveTime → terminates.
```

**Factory methods vs raw ThreadPoolExecutor:**
```java
// Executors.newFixedThreadPool(n):
  corePoolSize = maxPoolSize = n
  workQueue = new LinkedBlockingQueue() ← UNBOUNDED
  Risk: queue grows without bound if tasks slow. OOM possible.

// Executors.newCachedThreadPool():
  corePoolSize = 0
  maxPoolSize = Integer.MAX_VALUE ← effectively unlimited
  workQueue = SynchronousQueue ← no queue! tasks directly to threads
  keepAlive = 60s
  Risk: burst of 10,000 tasks → 10,000 threads created → OOM

// Executors.newSingleThreadExecutor():
  corePoolSize = 1, maxPoolSize = 1
  Sequential task processing — guarantees ordering
  Still has unbounded queue risk.

// ThreadPoolExecutor (manual, RECOMMENDED for production):
  You control all five parameters explicitly. Safer.
```

### ASCII Diagram

```
THREADPOOLEXECUTOR FLOW:
────────────────────────────────────────────────────────────────────
  New Task arrives
        │
        ▼
  active < corePoolSize?
  ├── YES → Create core thread → run task
  └── NO
        │
        ▼
  queue not full?
  ├── YES → Add to workQueue → idle thread picks it up
  └── NO
        │
        ▼
  active < maxPoolSize?
  ├── YES → Create non-core thread → run task
  └── NO
        │
        ▼
  RejectedExecutionHandler
  ├── AbortPolicy         → throw RejectedExecutionException
  ├── CallerRunsPolicy    → caller thread executes the task
  ├── DiscardPolicy       → drop task silently
  └── DiscardOldestPolicy → drop oldest queued task, retry new task

  Idle non-core thread after keepAliveTime → terminates
  Core thread → lives on (unless allowCoreThreadTimeOut=true)
────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — Common Thread Pool Mistakes
```java
// WRONG 1: Unbounded queue — the Executors.newFixedThreadPool risk
ExecutorService executor = Executors.newFixedThreadPool(10);
// workQueue is LinkedBlockingQueue() with no bound.
// If tasks are slow (e.g., DB query taking 2 seconds) and tasks arrive at 100/s:
// 10 threads processing, 90+ tasks/second queuing
// After 30 seconds: 2,700 tasks in queue. Memory grows. Eventually OOM.

// WRONG 2: newCachedThreadPool in production
ExecutorService executor = Executors.newCachedThreadPool();
// Each task that can't be immediately handed to an idle thread creates a new thread.
// Burst of 5,000 tasks → 5,000 threads created → 2.5GB stack memory → OOM
// Never use in production without profiling under load.

// WRONG 3: No rejection handler → RejectedExecutionException crashes the caller
ThreadPoolExecutor tpe = new ThreadPoolExecutor(5, 10, 60, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(100));
// Default rejection policy = AbortPolicy = throws RejectedExecutionException
// If this exception is unhandled in the calling thread, the request fails with 500.
// No retry, no backpressure, no graceful degradation.

// WRONG 4: Shutting down without waiting for completion
executor.shutdown();              // Signals shutdown — running tasks continue
// Missing: executor.awaitTermination(30, TimeUnit.SECONDS)
// If JVM exits before tasks complete: data partially processed, inconsistent state.

// WRONG 5: Blocking inside thread pool tasks (thread starvation deadlock)
ExecutorService pool = Executors.newFixedThreadPool(5);
// Task A submitted to pool submits Task B to the SAME pool and waits for B:
pool.submit(() -> {
    Future<String> b = pool.submit(() -> "task B result");
    String result = b.get();  // Task A BLOCKS waiting for B
    // All 5 threads are occupied by Task A variants waiting for B variants
    // B tasks can't start because all threads are held by waiting A tasks
    // DEADLOCK — all 5 threads waiting for tasks that can't run
});
```

### Right Way — ThreadPoolExecutor Sized for Production
```java
// RIGHT: Explicit ThreadPoolExecutor with bounded queue and CallerRunsPolicy
@Configuration
public class AsyncConfig {

    @Bean("orderProcessingExecutor")
    public ThreadPoolExecutor orderProcessingExecutor() {
        int coreThreads  = Runtime.getRuntime().availableProcessors();      // e.g., 8
        int maxThreads   = coreThreads * 2;                                 // e.g., 16
        int queueCapacity = 500;                                             // bounded
        long keepAlive   = 60L;

        return new ThreadPoolExecutor(
            coreThreads,
            maxThreads,
            keepAlive, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(queueCapacity),
            new ThreadFactory() {                            // Named threads for debugging
                private final AtomicInteger count = new AtomicInteger(0);
                @Override
                public Thread newThread(Runnable r) {
                    Thread t = new Thread(r);
                    t.setName("order-processor-" + count.incrementAndGet());
                    t.setDaemon(false);                      // Non-daemon: JVM won't exit while running
                    return t;
                }
            },
            new ThreadPoolExecutor.CallerRunsPolicy()        // Backpressure: slow down the caller
            // CallerRunsPolicy = when pool is saturated, the submitting thread processes the task
            // Natural backpressure: if Kafka consumer submits tasks, Kafka consumer slows down
            // Prevents OOM from infinite queuing while not dropping tasks
        );
    }
}

// Usage in a Spring service:
@Service
public class OrderService {
    private final ThreadPoolExecutor executor;

    public OrderService(@Qualifier("orderProcessingExecutor") ThreadPoolExecutor executor) {
        this.executor = executor;
    }

    public void submitOrderAsync(Order order) {
        executor.submit(() -> processOrder(order));
    }

    // Monitoring the pool (expose via Micrometer or actuator):
    public Map<String, Object> getPoolStats() {
        return Map.of(
            "corePoolSize",      executor.getCorePoolSize(),
            "activeCount",       executor.getActiveCount(),
            "queueSize",         executor.getQueue().size(),
            "completedTasks",    executor.getCompletedTaskCount(),
            "maxPoolSize",       executor.getMaximumPoolSize()
        );
    }
}

// Spring @Async with custom executor
@Service
public class NotificationService {
    @Async("orderProcessingExecutor")  // Uses the named executor bean
    public CompletableFuture<Void> sendAsync(Notification n) {
        send(n);
        return CompletableFuture.completedFuture(null);
    }
}

// Graceful shutdown:
@PreDestroy
public void shutdown() {
    executor.shutdown();
    try {
        if (!executor.awaitTermination(30, TimeUnit.SECONDS)) {
            executor.shutdownNow();  // Force if tasks don't finish in 30s
        }
    } catch (InterruptedException e) {
        executor.shutdownNow();
        Thread.currentThread().interrupt();
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are the key parameters of ThreadPoolExecutor and what does each do?"

**Hruday's answer:**
> `ThreadPoolExecutor` has five core parameters:
>
> **corePoolSize**: the number of threads that always exist in the pool, even when idle. Setting it to the number of CPU cores is a good starting point for CPU-bound tasks. For IO-bound tasks (DB queries, HTTP calls), you can go higher since threads spend most of their time waiting, not computing.
>
> **maximumPoolSize**: the ceiling on total threads. Only matters when the queue is full. If you use an unbounded queue, this parameter is effectively meaningless — the pool will never exceed corePoolSize.
>
> **keepAliveTime**: how long a non-core thread (one created beyond corePoolSize) waits for work before terminating. Core threads live forever by default.
>
> **workQueue**: where tasks wait when all core threads are busy. Bounded queues (`ArrayBlockingQueue`) provide backpressure — the pool will reject or apply the rejection policy when full. Unbounded queues (`LinkedBlockingQueue`) absorb tasks indefinitely — risk of OOM.
>
> **rejectedExecutionHandler**: what happens when the pool is saturated (all threads busy, queue full). The default `AbortPolicy` throws an exception. `CallerRunsPolicy` is my preferred production choice — it makes the submitting thread do the work, providing natural backpressure without dropping tasks.
>
> In production I always create a `ThreadPoolExecutor` manually rather than using `Executors.newFixedThreadPool` — the factory methods use unbounded queues by default, which is a hidden risk.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you size a thread pool for a Spring Boot service that makes DB calls?"

**Hruday's answer:**
> DB calls are IO-bound — the thread spends most of its time waiting for the DB to respond, not using the CPU. For IO-bound tasks, you can use more threads than CPU cores because many threads can be waiting simultaneously.
>
> A common starting formula for IO-bound pools:
> ```
> threads = (expected concurrency) × (1 + wait time / compute time)
> ```
>
> Practical example: if the average DB call takes 50ms total, of which 45ms is waiting for the network/DB, and 5ms is CPU processing — the ratio is 9:1. A single CPU core could handle 10 threads efficiently (one computing, 9 waiting).
>
> For a service with 4 CPU cores expecting ~100 concurrent DB-bound requests:
> - `corePoolSize = 20–50` (IO-bound, threads can be idle safely)
> - `maximumPoolSize = 100` (upper safety ceiling)
> - `workQueue = ArrayBlockingQueue(200)` (bounded, not unlimited)
> - `rejectedExecutionHandler = CallerRunsPolicy` (backpressure)
>
> But the real answer is: instrument and measure. Add thread pool metrics to Micrometer (`activeCount`, `queueSize`, `completedTaskCount`). Run load tests. If queueSize is frequently > 0, increase corePoolSize. If CPU is maxed, you've set corePoolSize too high.
>
> Also: thread pool size is limited by DB connection pool size. If HikariCP has maxPoolSize=20, having 100 thread pool threads all making DB calls = 80 threads waiting for a DB connection. Match your thread count to your connection pool capacity.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would CallerRunsPolicy be the wrong rejection strategy?"

**Hruday's answer:**
> `CallerRunsPolicy` is great for general-purpose backpressure but bad in two specific situations:
>
> First: when the caller is a Tomcat HTTP handler thread. If Tomcat's thread submits a task and CallerRunsPolicy makes Tomcat's thread run it, that HTTP handler thread is now tied up executing the task instead of serving new requests. Tomcat's thread pool is now saturated too. The backpressure propagates all the way to the HTTP layer — incoming requests start queuing. That might be acceptable (controlled degradation) or catastrophic (Tomcat times out), depending on the load.
>
> Second: when the task can't safely run on the caller's thread. For example, if the task needs a specific thread identity (for logging MDC, or Spring's SecurityContext), running it on the caller's thread might use the wrong context, causing logging or security failures.
>
> Alternative rejection strategies:
> - For events that can be dropped (analytics, non-critical notifications): `DiscardPolicy`
> - For background processing where you want fair queuing: `DiscardOldestPolicy` (but tasks are dropped, which can cause data loss)
> - For HTTP APIs under load: return HTTP 429 (Too Many Requests) immediately rather than letting the request wait in a saturated pool — this is better done at the API gateway or with a try-submit pattern
>
> The general rule: `CallerRunsPolicy` for internal async processing. Explicit capacity checks + HTTP 429 for externally-visible APIs.

---

### Q4 — Scenario Question
**Interviewer asks:** "A thread pool has 20 core threads. Your monitoring shows activeCount is always 20 and queueSize keeps growing. What's happening and what do you do?"

**Hruday's answer:**
> The pool is saturated. Tasks are arriving faster than the 20 threads can process them. The queue is absorbing the backlog, but if demand stays above capacity, the queue will grow indefinitely until OOM.
>
> Step 1: understand WHY tasks are slow. Is it CPU-bound (each task burns CPU)? DB-bound (each task waits on a slow DB query)? Network-bound (external API is responding slowly)?
>
> Step 2: check task duration. `completedTaskCount / uptime` gives you throughput. Average task duration = `active_threads / throughput`. If average task is 500ms and 20 threads, max throughput is 40 tasks/second.
>
> Step 3: address the root cause:
> - If IO-bound and DB is slow: investigate the DB query (add indexes, reduce N+1), add read replicas, or increase connection pool size.
> - If IO-bound and external API is slow: circuit breaker (Resilience4J) — fail fast instead of accumulating waiting threads.
> - If genuinely CPU-bound: increase `maximumPoolSize` up to the number of CPU cores (adding more threads beyond CPU count doesn't help for CPU-bound work).
>
> Step 4: protect the queue. If I can't fix throughput immediately:
> - Reduce `ArrayBlockingQueue` size to force CallerRunsPolicy earlier — adds backpressure.
> - Add a circuit breaker around the blocking operation — fail fast instead of queue buildup.
>
> Long-term: the right fix is always to speed up the tasks, not just add threads. Adding more threads without fixing the bottleneck just shifts the OOM risk to a later point.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Using Executors factory for production | "I use Executors.newFixedThreadPool(10)." | "Executors.newFixedThreadPool uses an unbounded LinkedBlockingQueue. Under sustained load it OOMs. Use ThreadPoolExecutor with a bounded ArrayBlockingQueue." |
| Thread count = CPU count | "Set thread count to number of CPUs." | "CPU count is right for CPU-bound tasks. For IO-bound (DB, HTTP): much higher — threads spend most time waiting, not computing. Match thread count to IO concurrency." |
| Ignoring queueSize in metrics | "I monitor active thread count." | "QueueSize is the early warning. ActiveCount = 20 is expected. QueueSize growing = you're falling behind. Alert on queueSize > threshold." |
| Not naming threads | "Default thread names are fine." | "Always name threads (thread factory). In thread dumps: 'order-processor-1 BLOCKED' is instantly diagnosable. 'pool-3-thread-7 BLOCKED' is not." |

---

## 7. Hruday's Real Experience Hook

> "At Bosch, we had a Spring Kafka consumer that processed incoming sensor events and wrote results to a PostgreSQL DB. The initial setup: `Executors.newFixedThreadPool(10)` — 10 threads, unbounded queue. During a burst of events from a factory test run (50,000 events in 5 minutes), the thread pool queue grew to 40,000 entries. Memory climbed to 3.5GB. The pod was OOM-killed. We lost the events.
>
> The fix: switched to a `ThreadPoolExecutor` with `ArrayBlockingQueue(1000)` and `CallerRunsPolicy`. When the queue hit 1000, CallerRunsPolicy made the Kafka consumer thread process the task directly — which slowed Kafka consumption, which naturally applied backpressure to Kafka. Kafka held the unprocessed events in its own topic partition until we caught up. No events lost. No OOM. The system self-throttled. That's when I understood that bounded queues with CallerRunsPolicy create natural end-to-end backpressure. Unbounded queues hide the pressure and eventually cause crashes."

---

## 8. Scale Evolution

**Junior engineer →** Uses `new Thread(() -> { ... }).start()` per task. Doesn't know what a thread pool is.

**Mid-level engineer →** Uses `Executors.newFixedThreadPool(n)`. Knows @Async. Doesn't know about bounded queues or rejection policies.

**Senior engineer →** Creates `ThreadPoolExecutor` manually with all 5 parameters explicit. Names threads. Uses CallerRunsPolicy for backpressure. Monitors pool metrics (activeCount, queueSize).

**Staff engineer →** Correlates thread pool saturation with upstream signals (Kafka consumer lag, HTTP 429 rates). Designs end-to-end backpressure: bounded queue → CallerRunsPolicy → slows Kafka consumer → Kafka holds messages → producer is notified. Builds thread pool metrics as SLO signals.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | High-concurrency payment processing — thread pool sizing directly impacts throughput and latency | "You chose CallerRunsPolicy and explained how it creates natural backpressure through the Kafka consumer. Exactly right." |
| Swiggy / Meesho | Order processing — thread pool saturation = orders queued → delayed delivery ETAs | "You explained why Executors.newFixedThreadPool is risky in production. That shows production experience." |
| Adobe / SAP | Large enterprise services with @Async, Spring Kafka, async batch processing | "You matched thread pool size to DB connection pool size. That's a common gap we see." |
| Google / Amazon | SDE-2 Java concurrency — ThreadPoolExecutor is the standard deep-dive question | "Walk me through what happens when a task is submitted to a saturated ThreadPoolExecutor." |

---

## 10. Related Topics — What to Study Next

- **synchronized vs ReentrantLock vs volatile (Topic 27)** — Next topic. The locking mechanisms tasks in a thread pool use to share state safely.
- **Deadlock (Topic 28)** — Thread pool deadlock (Task A waiting for Task B, both in same pool) is a common hidden risk.
- **CompletableFuture (Topic 29)** — The modern async pattern that submits work to thread pools without blocking threads.
- **Kafka Messaging (Part 6)** — Spring Kafka's concurrency model runs on thread pools. Understanding both together explains production throughput tuning.

---

*Part 2 · Thread Pools — Executors, ThreadPoolExecutor · Full Stack Interview Guide · Hruday D · 2026*
