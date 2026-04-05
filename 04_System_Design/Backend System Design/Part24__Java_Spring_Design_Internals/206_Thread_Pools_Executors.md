# 206. Thread Pools & Executors

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

A **thread pool** is a managed collection of pre-created worker threads that can execute submitted tasks. Rather than creating and destroying a new OS thread for each request (expensive: ~1MB stack + OS overhead), a pool keeps threads alive and reuses them across tasks.

**What it is:**
- A resource management pattern for threads: bounded, reusable, observable
- The foundation of all Java concurrency: Spring MVC, `@Async`, Kafka consumers, scheduled tasks — all use thread pools
- Exposed through `java.util.concurrent.ExecutorService`

**Why it exists:**
- Thread creation is expensive: ~50μs to create a new OS thread
- Thread stacks consume memory: 500 threads × 512KB = 250MB just for stacks
- Unbounded thread creation under load causes memory exhaustion and context-switch thrashing

**The problem it solves:**
- Limits resource usage: bounded queue + bounded pool = bounded memory and CPU
- Reduces latency: pre-created threads are immediately available
- Provides visibility and control: monitoring active threads, queue depth, rejected tasks

**Role in large-scale distributed systems:**
- Thread pool sizing is the primary lever for tuning throughput vs. latency in backend services
- Thread pool saturation is the #1 cause of service timeouts and cascading failures
- Bulkhead pattern: separate thread pools isolate slow dependencies from fast ones

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### ThreadPoolExecutor Internals

`ThreadPoolExecutor` is the core implementation. Understanding its parameters is critical:

```java
ThreadPoolExecutor(
    int corePoolSize,      // Minimum active threads (even when idle)
    int maximumPoolSize,   // Maximum threads (created when queue is full)
    long keepAliveTime,    // How long excess idle threads are kept
    TimeUnit unit,
    BlockingQueue<Runnable> workQueue,    // Task queue — bounded!
    RejectedExecutionHandler handler      // What to do when queue is full + max threads reached
)
```

**Execution flow:**
```
Submit task
     │
     ▼
Active threads < corePoolSize? ──YES──> Create new thread, execute task
     │
    NO
     │
     ▼
WorkQueue not full? ──YES──> Enqueue task
     │
    NO
     │
     ▼
Active threads < maxPoolSize? ──YES──> Create new thread, execute task
     │
    NO
     │
     ▼
RejectedExecutionHandler → [ABORT / CALLER_RUNS / DISCARD / DISCARD_OLDEST]
```

---

### Rejection Policies

| Policy | Behavior | Use Case |
|---|---|---|
| `AbortPolicy` (default) | Throws `RejectedExecutionException` | Callers must handle the exception |
| `CallerRunsPolicy` | Current thread executes the task | Backpressure: slows down the producer |
| `DiscardPolicy` | Silently drops the task | For fire-and-forget tasks (analytics, metrics) |
| `DiscardOldestPolicy` | Drops the oldest queued task | For real-time work where latest is more important |

---

### Common ExecutorService Factory Methods

```java
// ✅ Named thread pools — for production observability
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    10,                              // core
    50,                              // max
    60, TimeUnit.SECONDS,            // keepAlive
    new ArrayBlockingQueue<>(1000),  // bounded queue — ALWAYS bound in production!
    new ThreadFactoryBuilder().setNameFormat("order-processor-%d").build(),
    new ThreadPoolExecutor.CallerRunsPolicy()
);

// ❌ Avoid these in production:
Executors.newFixedThreadPool(10)        // Unbounded LinkedBlockingQueue → memory leak under load
Executors.newCachedThreadPool()         // Unbounded thread creation → thread explosion
Executors.newSingleThreadExecutor()     // Single thread + unbounded queue → memory leak
```

**The critical rule:** Always use a **bounded queue** in production. An unbounded queue under sustained overload will fill the heap with pending tasks before any backpressure kicks in.

---

### Spring Boot `@Async` Thread Pool Configuration

By default, Spring `@Async` uses `SimpleAsyncTaskExecutor` — **creates a new thread per task** (no pooling). This is a common production performance issue.

```java
// ✅ Configure a real thread pool for @Async
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("async-task-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
```

---

### Scheduled Task Executor

`@Scheduled` tasks in Spring use a single-threaded `ScheduledExecutor` by default. If a task takes longer than its interval, it delays subsequent executions.

```java
// ✅ Configure a scheduled task executor with a thread pool
@Configuration
public class SchedulingConfig implements SchedulingConfigurer {
    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        registrar.setScheduler(Executors.newScheduledThreadPool(5));
    }
}
```

---

### Thread Pool Sizing: CPU-Bound vs I/O-Bound

This is the most important tuning decision.

**CPU-bound tasks** (e.g., image processing, encryption, data aggregation):
```
Optimal thread count = N_CPU (or N_CPU + 1)
Reason: More threads than CPUs → context-switch overhead dominates
```

**I/O-bound tasks** (e.g., HTTP calls, DB queries, file reads):
```
Optimal thread count = N_CPU × (1 + Wait time / Compute time)
Example: 8 CPUs, task takes 10ms compute + 90ms I/O
→ 8 × (1 + 90/10) = 80 threads
```

**Practical approach:**
- Start with a reasonable value (20–100 for I/O-bound web servers)
- Measure throughput and queue depth under load test
- Tune upward until throughput plateaus or latency increases

---

### Bulkhead Pattern with Thread Pools

Isolate different types of work into separate thread pools to prevent one slow dependency from saturating the entire application.

```java
// ✅ Separate pools for different concerns
@Bean("paymentExecutor")
public Executor paymentExecutor() {
    // Payment calls are external and can be slow
    return buildThreadPool("payment", 20, 20, 100);
}

@Bean("inventoryExecutor")
public Executor inventoryExecutor() {
    // Inventory is local and fast
    return buildThreadPool("inventory", 5, 5, 50);
}

// Payment service slowdown saturates paymentExecutor only
// inventoryExecutor remains unaffected
```

---

### Virtual Threads (Java 21+, Project Loom)

Virtual threads are JVM-managed, not OS threads. They solve the I/O blocking problem:

```java
// Java 21+: Virtual thread executor
ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
// Creates a virtual thread per task — millions supported
// Blocked virtual threads park without holding OS thread → no thread pool tuning needed

// Spring Boot 3.2+: Enable virtual threads
spring.threads.virtual.enabled=true
```

With virtual threads: thread pool sizing becomes largely obsolete for I/O-bound workloads because virtual threads are cheap enough to create per-task.

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

**Thread pool sizing formula (I/O-bound):**
```
Service handles 1,000 QPS
Average request latency: 50ms (10ms compute + 40ms DB wait)
Threads needed = QPS × latency = 1,000 × 0.05s = 50 threads

Add 20% buffer → configure 60 threads
Queue capacity → buffer for bursts: 200 tasks
```

**Memory estimation:**
```
60 threads × 512 KB stack = 30 MB (stack)
200 queued tasks × ~1 KB per Runnable = ~200 KB
Thread pool overhead: negligible
```

**When to scale horizontally instead:**
```
If optimal thread count > 500 → scale out (add more service instances)
More than ~500 threads per JVM → context switching overhead dominates
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

- **HikariCP connection pool:** thread pool and connection pool must be matched — surplus threads waiting for connections is wasted resource
- **Rule:** DB connection pool size ≈ number of threads blocked on DB at any time ≈ `(QPS × DB query time)`
- HikariCP formula: `pool_size = (core_count * 2) + effective_spindle_count`

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

**Thread pool saturation → cascading failure:**
```
External service slows down (latency: 5s)
Thread pool: 50 threads, all blocked waiting for slow service
New requests arrive → queue fills → RejectedExecutionException
Service appears down from caller's perspective
```

**Prevention:**
- Timeout all external calls (never wait indefinitely)
- Circuit breaker: fail fast when downstream is unhealthy
- Bulkhead: dedicated pool for slow dependencies — can saturate without affecting other pools
- Queue depth metric → alert when queue depth > 50% capacity

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- ThreadLocal (user security context, MDC logging context) must be propagated to new threads explicitly
- Spring Security's `SecurityContextHolder` uses `ThreadLocal` — not propagated to async threads automatically
- Use `DelegatingSecurityContextExecutor` to propagate security context to `@Async` threads:

```java
@Bean("secureAsync")
public Executor secureAsyncExecutor() {
    return new DelegatingSecurityContextExecutorService(Executors.newFixedThreadPool(10));
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Netflix's Hystrix Bulkhead
- Netflix Hystrix assigned each external dependency (e.g., User Service, Payment Service, Recommendation Service) its own bounded thread pool
- A slowdown in Recommendation Service saturated only its own pool (10 threads)
- Other services (Payment, User) continued operating normally
- This is the textbook bulkhead pattern

### Tomcat Thread Pool Exhaustion
- A common production incident: Tomcat default 200 threads, each taking 5s for a slow DB query
- At 40 QPS sustained: 40 × 5s = 200 threads blocked → all threads occupied → 503 Service Unavailable
- Fix: reduce DB query time, or increase timeout and apply circuit breaker

### Spring `@Async` with Default Executor
- Team used `@Async` to send emails asynchronously
- Under load: `SimpleAsyncTaskExecutor` created a new thread per email → 10,000 QPS meant 10,000 threads → JVM OOM
- Fix: configure `ThreadPoolTaskExecutor` with bounded pool + queue

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "Thread pools are essential for managing concurrency in backend services. In production, I always use `ThreadPoolExecutor` with a bounded `ArrayBlockingQueue` — never `Executors.newFixedThreadPool()` which uses an unbounded queue. The pool size depends on the workload: CPU-bound tasks get `N_CPU + 1` threads; I/O-bound tasks get `N_CPU × (1 + wait/compute ratio)`. For Spring `@Async`, I configure `ThreadPoolTaskExecutor` with explicit bounds. For isolation (bulkhead pattern), I create separate pools for different downstream dependencies — a slow payment API saturating its pool won't affect inventory lookups. In Java 21+, virtual threads largely address the I/O-bound pool sizing problem by making millions of cheap threads feasible."

### Common Follow-Up Questions

1. **"Why is `Executors.newFixedThreadPool()` bad in production?"** → It uses `LinkedBlockingQueue` (unbounded) — under sustained overload the queue fills the heap with pending tasks, causing OOM before any backpressure is applied.
2. **"What happens when you submit to a full pool with `CallerRunsPolicy`?"** → The submitting thread itself executes the task — providing natural backpressure on the caller (e.g., Tomcat request thread slows down, reducing incoming rate).
3. **"How do you monitor thread pool health?"** → Active thread count, queue depth, rejected task count, task completion time. Export these as metrics (Micrometer/Prometheus) and alert on queue depth and rejection rate.
4. **"When would you use virtual threads?"** → Java 21+, for I/O-bound workloads where threads spend most time waiting. Eliminates the need for pool size tuning. Not ideal for CPU-bound work — still needs bounded parallelism.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### ThreadPoolExecutor State Machine

```
Task submitted
      │
      ▼
threads < corePoolSize?
  YES → spawn thread, execute
  NO  → queue not full?
           YES → enqueue
           NO  → threads < maxPoolSize?
                    YES → spawn thread, execute
                    NO  → REJECT (based on policy)
```

### Bulkhead Pool Architecture

```
Incoming Request
       │
       ▼
   API Layer
   /      \
  /          \
┌──────────────┐  ┌────────────────────────┐
│ Payment Pool │  │ Inventory Pool         │
│ [10 threads] │  │ [5 threads]            │
│ → Payment API│  │ → Inventory DB         │
│ (can be slow)│  │ (fast, local)          │
└──────────────┘  └────────────────────────┘
 ↑ saturates here   ↑ unaffected
 Payment slowdown   Inventory stays fast
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

**Why thread pools matter:**
- Unbounded thread creation causes OOM and context-switch degradation
- Thread pool saturation is the #1 cause of cascading failure in backend services
- Correct pool sizing is the primary tool for maximizing throughput at a given latency

**How it works:**
- `ThreadPoolExecutor` with bounded queue + explicit rejection policy
- Size by workload type: CPU-bound = N_CPU; I/O-bound = N_CPU × (1 + wait/compute ratio)
- Use bulkhead pattern: dedicated pools per dependency for isolation
- Java 21+ virtual threads: eliminate pool sizing for I/O-bound tasks

**Key trade-offs:**
- Large pool: better throughput but more memory and context-switch overhead
- Small pool: lower memory, but tasks queue up → latency increases
- Bounded queue: predictable memory, but tasks are rejected under overload (explicit backpressure)
- Java virtual threads: simpler code, but CPU-bound parallelism still needs explicit bounding
