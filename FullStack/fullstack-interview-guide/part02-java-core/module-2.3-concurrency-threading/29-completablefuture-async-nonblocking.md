# CompletableFuture — Async Non-Blocking Patterns
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> **🆕 Active gap — extra focus needed.** Read this carefully before any interview.

- `CompletableFuture` (Java 8+) is a promise — it represents a value that will be available in the future. It lets you chain async operations without blocking threads.
- Key creation: `CompletableFuture.supplyAsync(() -> result)` runs on `ForkJoinPool.commonPool()` (or your executor). `runAsync()` for Runnable (no return value).
- Key chaining: `thenApply()` (transform result), `thenAccept()` (consume result, no return), `thenCompose()` (flatMap — chain another CF), `thenCombine()` (combine two independent CFs).
- Key composition: `allOf()` — wait for ALL to complete. `anyOf()` — wait for ANY one.
- **Non-blocking** means: the calling thread does NOT block. The computation runs on another thread. When done, the next step runs — also on a background thread.
- Use `exceptionally()` for error handling. Use `handle()` for both success and error in one step.
- **In Spring Boot:** `@Async` returns `CompletableFuture<T>`. Use it with a named `ThreadPoolTaskExecutor` bean — not the default common pool.

---

## 1. One-Line Definition
`CompletableFuture<T>` is Java's built-in promise/future implementation that lets you compose asynchronous computations — run them in background threads, chain transformations, combine multiple in parallel, and handle errors — all without blocking the calling thread at each step.

---

## 2. The Problem It Solves

In a typical REST controller, you might call three independent backend services to compose a response: a user service, a product service, and a price service. Doing them sequentially:

```
GET /dashboard:
  userService.getUser()          → 200ms
  productService.getProducts()   → 300ms
  priceService.getPrices()       → 250ms
  Total:                         → 750ms
```

These three calls are completely independent. Running them in parallel:

```
All three parallel:              → max(200, 300, 250) = 300ms
```

Without `CompletableFuture`, achieving this requires manual thread management: create threads, submit tasks, call `future.get()` (which blocks), join results. That's verbose and error-prone.

`CompletableFuture` solves this cleanly. You express what needs to happen and in what order. The runtime handles the actual threading. The calling code reads like a pipeline:
```java
CompletableFuture.supplyAsync(userService::getUser)
    .thenCombine(CompletableFuture.supplyAsync(productService::getProducts), this::merge)
```

It also solves the **callback hell** problem: instead of nested callbacks (like JavaScript before Promises), you chain operations in a readable sequence. And it solves the **thread blocking waste** problem: a thread waiting for an IO response is idle. `CompletableFuture` lets that thread return to the pool; the next step runs on a different thread when the result is ready.

---

## 3. How It Works Internally

### The Mental Model
Think of a factory production line. You submit raw material (input) to Stage 1 (a worker). When Stage 1 finishes, the output automatically moves to Stage 2's conveyor belt. Stage 2 doesn't need to poll or wait — it gets triggered when Stage 1 is done. Multiple lines can run in parallel. The factory manager (the calling code) doesn't stand watching one worker — they set up the pipeline and come back when everything is done.

### The Mechanism — Promise State Machine

```
CompletableFuture<T> has three states:
  1. INCOMPLETE — computation not finished yet
  2. COMPLETED NORMALLY — result available
  3. COMPLETED EXCEPTIONALLY — exception occurred

Internally:
  - Object result field: null (incomplete), T value (success), AltResult(Throwable) (exception)
  - Stack of dependent actions (the chained callbacks): stored internally, triggered on completion

When you call:
  cf.thenApply(fn)
  → Creates a new CompletableFuture (dependent)
  → Registers fn as a completion action
  → When cf completes: fn runs with cf's result → dependent CF completes with fn's output

Thread assignment:
  thenApply()   → runs on the thread that completed the upstream stage
                  (or the calling thread if already completed)
  thenApplyAsync() → runs on ForkJoinPool.commonPool() (or specified executor)
                  (always on a background thread, not the completing thread)
```

**Key method families:**
```
Creation:
  supplyAsync(Supplier<T>)          → async, returns value
  runAsync(Runnable)                 → async, no return value
  completedFuture(T)                 → already-completed future (testing/defaults)

Transformation (1 input → 1 output):
  thenApply(T → U)                   → sync on completing thread
  thenApplyAsync(T → U)              → async, new thread
  thenAccept(T → void)               → consume result, no new value
  thenRun(Runnable)                  → run after, ignores result

Chaining (1 CF → another CF):
  thenCompose(T → CompletableFuture<U>)  → flatMap — avoids nested CFs
                                            use when next step IS another async call

Combining (2 independent CFs → 1):
  thenCombine(CF<U>, (T, U) → V)     → wait for both, combine their results
  thenAcceptBoth(CF<U>, (T, U) → void)

Composition (N CFs):
  allOf(CF<?>...)                    → completes when ALL complete. Returns CF<Void>.
  anyOf(CF<?>...)                    → completes when ANY ONE completes. Returns CF<Object>.

Error handling:
  exceptionally(Throwable → T)       → recovery: return fallback value on exception
  handle((T, Throwable) → U)         → handles both success and exception in one step
  whenComplete((T, Throwable) → void) → observe result/exception, no transformation
```

### ASCII Diagram

```
SEQUENTIAL (OLD WAY — BLOCKING):
  Controller Thread
  ──────────────────────────────────────────────────────────────────
  → userService.getUser() ............. (200ms wait) → result
  → productService.getProducts() ...... (300ms wait) → result
  → priceService.getPrices() .......... (250ms wait) → result
  → combine and return
  Total: 750ms · Thread blocked entire time

PARALLEL WITH CompletableFuture:
  Controller Thread
  ──────────────────────────────────────────────────────────────────
  → supplyAsync(getUser)   ──────→ [Pool Thread 1: 200ms]
  → supplyAsync(getProducts) ────→ [Pool Thread 2: 300ms]
  → supplyAsync(getPrices)  ─────→ [Pool Thread 3: 250ms]
  → allOf(...).join()       ← wait for ALL (non-blocking for pool threads)
                              Done in 300ms (longest), not 750ms

CHAINING — thenCompose vs thenApply:
  CF<UserId>
      │
      ├── thenApply(id → id.toString())      → CF<String>       (transform)
      │
      └── thenCompose(id → getUserAsync(id)) → CF<User>         (flatMap — another async call)
            If you used thenApply(id → getUserAsync(id)):
            → CF<CompletableFuture<User>>   (unwanted nesting!)
            Always use thenCompose when the function returns another CompletableFuture.
```

---

## 4. The Code

### Wrong Way — Common CompletableFuture Mistakes
```java
// WRONG 1: Blocking immediately after creating the CF — defeats the purpose
String result = CompletableFuture.supplyAsync(() -> fetchFromDB())
    .get();   // .get() blocks the calling thread. You got async + blocked = worse than sync.
// Use .get() ONLY at the very end of a pipeline, and only in non-reactive contexts.
// In a Spring MVC endpoint, return CompletableFuture<ResponseEntity<T>> directly.

// WRONG 2: Using ForkJoinPool.commonPool() for IO-bound tasks
CompletableFuture.supplyAsync(() -> httpClient.get(url));
// commonPool has (CPU cores - 1) threads. DB/HTTP calls will saturate it quickly.
// The commonPool is shared with all ForkJoin tasks — blocking it degrades system-wide perf.
// Always provide your own executor for IO-bound async calls.

// WRONG 3: thenApply instead of thenCompose for chained async calls
CompletableFuture<CompletableFuture<User>> wrong =
    cf.thenApply(id -> getUserAsync(id));  // getUserAsync returns a CF → CF<CF<User>>
// Correct: cf.thenCompose(id -> getUserAsync(id)) → CF<User>  (flat, not nested)

// WRONG 4: No exception handling — silent failures
CompletableFuture.supplyAsync(() -> riskyOperation())
    .thenApply(result -> transform(result));
// If riskyOperation() throws, the whole chain completes exceptionally.
// Without exceptionally() or handle(), the exception is SWALLOWED silently.
// The caller's .get() will throw ExecutionException, but if nobody calls .get()...
// The exception disappears. No log, no alert.

// WRONG 5: allOf() result — forgetting to re-retrieve results
CompletableFuture<String> cf1 = ...;
CompletableFuture<String> cf2 = ...;
CompletableFuture<Void> all = CompletableFuture.allOf(cf1, cf2);
all.join();
// all.join() just waits. The values are in cf1.get() and cf2.get() — not in 'all'.
// Forgetting to call cf1.join() after allOf().join() is a common mistake.
```

### Right Way — Production-Ready CompletableFuture
```java
// Setup: Custom executor for IO-bound async operations (NOT commonPool)
@Configuration
public class AsyncExecutorConfig {
    @Bean("ioExecutor")
    public Executor ioExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(20);
        exec.setMaxPoolSize(50);
        exec.setQueueCapacity(200);
        exec.setThreadNamePrefix("async-io-");
        exec.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        exec.initialize();
        return exec;
    }
}

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final UserService    userService;
    private final ProductService productService;
    private final PriceService   priceService;
    @Qualifier("ioExecutor") private final Executor executor;

    // CORRECT 1: Parallel independent calls with allOf
    public DashboardResponse getDashboard(String userId) {
        CompletableFuture<User>         userFuture    = CompletableFuture.supplyAsync(
                () -> userService.getUser(userId), executor);

        CompletableFuture<List<Product>> productFuture = CompletableFuture.supplyAsync(
                () -> productService.getProducts(userId), executor);

        CompletableFuture<PriceMap>     priceFuture   = CompletableFuture.supplyAsync(
                () -> priceService.getPrices(userId), executor);

        // Wait for all three to complete (still non-blocking in the pool threads)
        CompletableFuture.allOf(userFuture, productFuture, priceFuture).join();

        // After allOf().join() — all three are done, retrieve results:
        return DashboardResponse.of(
            userFuture.join(),
            productFuture.join(),
            priceFuture.join()
        );
    }

    // CORRECT 2: thenCompose — chaining dependent async calls
    public CompletableFuture<OrderDetails> getOrderDetails(String orderId) {
        return CompletableFuture
            .supplyAsync(() -> orderRepository.findById(orderId), executor)   // CF<Order>
            .thenCompose(order ->                                              // Order → CF<User>
                CompletableFuture.supplyAsync(() -> userService.getUser(order.getUserId()), executor)
                    .thenApply(user -> OrderDetails.of(order, user))          // CF<OrderDetails>
            );
        // thenCompose flattens CF<CF<OrderDetails>> into CF<OrderDetails>
        // Each step runs on a thread from executor. Calling thread never blocks.
    }

    // CORRECT 3: thenCombine — two independent CFs whose results need merging
    public CompletableFuture<EnrichedProduct> getEnrichedProduct(String productId) {
        CompletableFuture<Product>  productCF = CompletableFuture.supplyAsync(
                () -> productService.getProduct(productId), executor);

        CompletableFuture<Inventory> inventoryCF = CompletableFuture.supplyAsync(
                () -> inventoryService.getStock(productId), executor);

        return productCF.thenCombine(inventoryCF, EnrichedProduct::new);
        // When BOTH complete: merge their results into EnrichedProduct
        // Neither call depends on the other — run in parallel.
    }

    // CORRECT 4: Exception handling with exceptionally
    public CompletableFuture<User> getUserWithFallback(String userId) {
        return CompletableFuture
            .supplyAsync(() -> userService.getUser(userId), executor)
            .exceptionally(ex -> {
                log.warn("User service failed for {}, using cached data: {}", userId, ex.getMessage());
                return userCacheService.getCachedUser(userId);  // fallback value
            });
    }

    // CORRECT 5: handle() — covers both success and exception
    public CompletableFuture<ApiResponse<User>> getUserResponse(String userId) {
        return CompletableFuture
            .supplyAsync(() -> userService.getUser(userId), executor)
            .handle((user, ex) -> {
                if (ex != null) {
                    return ApiResponse.error(ex.getMessage());
                }
                return ApiResponse.success(user);
            });
    }
}

// CORRECT 6: Spring @Async — returns CompletableFuture
@Service
public class EmailService {
    @Async("ioExecutor")  // runs on ioExecutor, not the HTTP handler thread
    public CompletableFuture<Void> sendWelcomeEmail(User user) {
        emailClient.send(user.getEmail());
        return CompletableFuture.completedFuture(null);
    }
}

// Calling the async method from controller — HTTP thread is free immediately:
@PostMapping("/users")
public ResponseEntity<User> createUser(@RequestBody CreateUserRequest req) {
    User user = userService.create(req);
    emailService.sendWelcomeEmail(user);   // fires and forgets — HTTP response doesn't wait
    return ResponseEntity.ok(user);
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between thenApply and thenCompose?"

**Hruday's answer:**
> Both transform the result of a `CompletableFuture`, but for different scenarios.
>
> `thenApply` is for synchronous transformations. The function you give it takes a value and returns a new value directly. Example: `cf.thenApply(user -> user.getName())` — takes a User, returns a String. Result type: `CF<String>`.
>
> `thenCompose` is for async transformations — when the next step is itself another `CompletableFuture`. The function takes a value and returns a new `CompletableFuture`. Example: `cf.thenCompose(userId -> getUserAsync(userId))` — takes a userId, returns `CF<User>`. Result type: `CF<User>`, not `CF<CF<User>>`.
>
> If I used `thenApply` for the async case: `cf.thenApply(userId -> getUserAsync(userId))` — I'd get `CompletableFuture<CompletableFuture<User>>`. That's nested futures — awkward to work with. `thenCompose` flattens it, like `flatMap` in streams. The analogy is exact: `thenApply` is like `map`, `thenCompose` is like `flatMap`.
>
> Rule: if the function returns a `CompletableFuture`, use `thenCompose`. If it returns a plain value, use `thenApply`.

---

### Q2 — Trade-Off Question
**Interviewer asks:** "Why shouldn't you use CompletableFuture.supplyAsync() without specifying an executor?"

**Hruday's answer:**
> By default, `supplyAsync()` uses `ForkJoinPool.commonPool()`. This pool has a fixed size of `(CPU cores - 1)` threads by default. On a 4-core machine, that's 3 threads.
>
> The problem: `ForkJoinPool.commonPool()` is shared across the entire JVM — parallel streams, all unspecified CompletableFutures, anything else that uses the ForkJoin framework. And it's designed for CPU-bound, short-lived tasks like fork-join recursion, not IO-bound tasks like HTTP calls or DB queries.
>
> If I submit 5 tasks that each make a 300ms HTTP call to the commonPool with 3 threads, only 3 run at a time. But worse: those 3 threads are blocked waiting for HTTP responses. They're not doing CPU work. The ForkJoinPool uses work-stealing, but blocked IO tasks don't yield their thread — they just sit there using a thread slot. The pool is saturated by idle waiters.
>
> In production: always provide a dedicated executor. For IO-bound tasks: a `ThreadPoolTaskExecutor` with a higher core count (20–50 for services making DB/HTTP calls). For CPU-bound tasks: a fixed pool matching CPU count. This way the commonPool is available for its intended use case, and your async IO doesn't contend with system-level parallel streams.

---

### Q3 — Code Walk-Through
**Interviewer asks:** "Walk me through this code and explain what happens:"
```java
CompletableFuture<String> result = CompletableFuture
    .supplyAsync(() -> "hello")
    .thenApply(s -> s + " world")
    .thenApplyAsync(s -> s.toUpperCase(), executor);
```

**Hruday's answer:**
> Stage 1: `supplyAsync(() -> "hello")` — submits a task to the ForkJoinPool.commonPool (no executor specified here). A pool thread runs the lambda and produces the string "hello". The method returns immediately with a new CompletableFuture representing this computation.
>
> Stage 2: `.thenApply(s -> s + " world")` — when Stage 1 completes normally, this transformation runs. Note: `thenApply` (not `thenApplyAsync`) — it runs on the same thread that completed Stage 1, which is a commonPool thread. No new thread spawned. It takes "hello" and produces "hello world".
>
> Stage 3: `.thenApplyAsync(s -> s.toUpperCase(), executor)` — when Stage 2 completes, this runs on a thread from `executor` (the explicitly provided thread pool, not commonPool). It takes "hello world" and produces "HELLO WORLD".
>
> The variable `result` is a `CompletableFuture<String>` that will eventually hold "HELLO WORLD". The calling thread never blocked — all three stages run on pool threads. If I want the final value, I'd call `result.join()` or `result.get()`, which blocks until completion. In a Spring MVC endpoint, I'd return the `CompletableFuture` directly and let Spring await it.
>
> One observation: the switch between `thenApply` and `thenApplyAsync` is intentional — Stage 2 is a lightweight string operation, fine to run on the completing thread. Stage 3 switches to the custom executor, possibly because `executor` is higher-priority or has different thread characteristics.

---

### Q4 — Design Question
**Interviewer asks:** "You have a REST endpoint that needs to call 3 independent microservices and combine their results. The total time budget is 500ms. How do you implement this with CompletableFuture?"

**Hruday's answer:**
> I'd run all three calls in parallel using `allOf`, with a timeout. Here's the pattern:
>
> ```java
> @GetMapping("/composite")
> public CompletableFuture<CompositeResponse> getComposite() {
>     Executor executor = ioExecutor;
>     long budget = 500;
>
>     CompletableFuture<A> aFuture = CompletableFuture.supplyAsync(serviceA::getData, executor);
>     CompletableFuture<B> bFuture = CompletableFuture.supplyAsync(serviceB::getData, executor);
>     CompletableFuture<C> cFuture = CompletableFuture.supplyAsync(serviceC::getData, executor);
>
>     return CompletableFuture.allOf(aFuture, bFuture, cFuture)
>         .orTimeout(budget, TimeUnit.MILLISECONDS)   // Java 9+ — completes exceptionally after timeout
>         .handle((ignored, ex) -> {
>             A a = aFuture.isDone() ? aFuture.join() : defaultA;
>             B b = bFuture.isDone() ? bFuture.join() : defaultB;
>             C c = cFuture.isDone() ? cFuture.join() : defaultC;
>             return CompositeResponse.of(a, b, c);
>         });
> }
> ```
>
> The key decisions:
> 1. `allOf` runs all three in parallel — total time ≈ slowest service, not sum of all.
> 2. `orTimeout(500ms)` — if any service hasn't responded in 500ms, we stop waiting (Java 9+).
> 3. `handle()` catches both success (all done) and timeout/exception — in both cases I check `isDone()` on each individual future and use a default for those that didn't complete in time. This gives a partial response rather than a hard error.
>
> For the executor: I inject a dedicated `ThreadPoolTaskExecutor` with 20 core threads. Never the commonPool for IO-bound calls.
>
> If partial responses aren't acceptable (all three are required): use `exceptionally` to propagate the error and return HTTP 503.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Default executor is fine | "CompletableFuture uses a thread pool automatically." | "It uses ForkJoinPool.commonPool — (CPUs-1) threads, shared JVM-wide, designed for CPU-bound work. For IO-bound tasks, always provide a dedicated executor." |
| thenApply for all chaining | "I use thenApply to chain steps." | "When the next step is itself async (returns a CF), use thenCompose. thenApply with a CF-returning function gives CF<CF<T>> — nested futures. Always flatMap async-returning functions with thenCompose." |
| allOf() has the results | "allOf().join() gives me all the results." | "allOf().join() just waits for completion — returns Void. Results are in the individual CFs. After allOf().join(), call cf1.join(), cf2.join() to get the values." |
| Silent exception swallowing | "I handle exceptions in a catch block." | "Exceptions in CompletableFuture are captured in the future, not thrown to the calling thread. Without exceptionally() or handle(), they disappear if nobody calls .get(). Always add exception handling to every chain." |

---

## 7. Hruday's Real Experience Hook

> "At SAP, we built a GenAI tool that enriched product data by calling three external services: a translation API, a category classification model, and a pricing AI. Originally these ran sequentially per product — each product enrichment took 1.8 seconds (three 600ms calls in series). Processing a batch of 1,000 products took 30 minutes.
>
> I refactored using `CompletableFuture.thenCombine` and `allOf`. For each product, all three calls ran in parallel — total per-product time dropped to ~600ms (the slowest call). With a thread pool of 20 threads processing 20 products simultaneously, the 1,000-product batch now took under 3 minutes.
>
> The gotcha I hit: I initially used `CompletableFuture.supplyAsync()` without specifying an executor — it defaulted to ForkJoinPool.commonPool. With 20 parallel HTTP calls hitting the translation API, the commonPool saturated immediately (only 7 threads on our 8-core box). Response times got worse, not better. Switching to a dedicated `ThreadPoolTaskExecutor` with 30 core threads resolved it. The lesson: async is only faster than sync if the thread pool actually has capacity to run the tasks in parallel."

---

## 8. Scale Evolution

**Junior engineer →** Knows `Future<T>` from Java 5. Uses `.get()` immediately after submitting — async in name only, blocking in practice.

**Mid-level engineer →** Uses `CompletableFuture.supplyAsync()`. Returns CFs from `@Async` methods. Knows `thenApply`. Doesn't know the commonPool risk.

**Senior engineer →** Uses custom executors. Knows `thenCompose` vs `thenApply`. Knows `allOf`/`anyOf`. Uses `orTimeout()`. Handles exceptions with `exceptionally()`/`handle()`. Knows when NOT to use CF (simple synchronous code).

**Staff engineer →** Composes complex async pipelines: parallel calls, conditional chaining, partial failure tolerance, circuit breakers on individual CFs. Evaluates whether reactive (Project Reactor/WebFlux) is a better fit for high-throughput async scenarios than CompletableFuture + blocking thread pools.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flow calls bank API + fraud service + notification service — parallel calls are critical for P99 latency | "You used thenCombine for two independent calls and allOf for three. Showed you know the composition API." |
| Swiggy / Meesho | Real-time dashboard composites: order status + rider location + restaurant availability in parallel | "You added orTimeout and handle for partial responses. Production-grade thinking." |
| Adobe / SAP | GenAI enrichment pipelines, document processing — batch async over thousands of items | "You identified that commonPool causes contention. Switched to dedicated executor. Shows real production debugging." |
| Google / Amazon | SDE-2 Java async programming — CF is a standard system design and coding question | "Walk me through CompletableFuture exception propagation and how handle() differs from exceptionally()." |

---

## 10. Related Topics — What to Study Next

- **ThreadLocal (Topic 30)** — Next topic. How request context (MDC, security, tenant ID) propagates through CompletableFuture chains when callbacks run on different threads.
- **Thread Pools (Topic 26)** — The executor CompletableFuture runs on — all parameters and risks.
- **Streams API (Topic 31)** — Parallel streams use ForkJoinPool.commonPool too. Same thread pool concerns as CompletableFuture.
- **Kafka (Part 6)** — Kafka event processing with CompletableFuture for async enrichment is a common pattern.
- **Spring WebFlux / Project Reactor (Part 3)** — The reactive alternative to CompletableFuture for truly non-blocking end-to-end systems.

---

*Part 2 · CompletableFuture — Async Non-Blocking Patterns · Full Stack Interview Guide · Hruday D · 2026*
