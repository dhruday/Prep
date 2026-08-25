# Memory Leaks — How They Happen in Backend Systems
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- A Java memory leak is NOT a crash — it's when objects stay referenced long past their useful life, so GC can't collect them. The heap slowly fills. Eventually: `OutOfMemoryError`.
- The four most common causes in Spring Boot: **static collections** that grow forever, **ThreadLocal** values not removed after use, **event/listener registrations** never unregistered, and **unclosed resources** (DB connections, streams, sessions) left open.
- Memory leaks are insidious: the service runs fine for hours, then degrades gradually, then crashes under load — often at 2 AM in production.
- The primary diagnostic tool: **heap dump analysis** — take a heap dump with `jcmd`, analyse with Eclipse MAT, look for large object trees held by unexpected roots.
- Gap to bridge: understanding memory leaks tells interviewers you've dealt with real production incidents — not just written code that works in dev.

---

## 1. One-Line Definition
A memory leak in Java is when objects on the Heap are no longer useful to the application but can't be garbage-collected because some live reference still accidentally points to them.

---

## 2. The Problem It Solves

A payment service at a fintech company processes thousands of transactions per minute. It runs fine for the first six hours after deployment. Then at hour 7, response times start creeping up. At hour 9, the Kubernetes pod's memory usage is at 95%. At hour 10, the pod is OOM-killed. Kubernetes restarts it. The team gets paged at 2 AM.

This happened because someone added a `HashMap<String, TransactionRecord>` as a `@Service` field — effectively a static cache — to speed up fraud checks. But the cache had no eviction policy. Every transaction added an entry. Nothing ever removed them. After 10 hours of 2,000 transactions per minute, the cache held 1.2 million records, consuming 4GB of heap. GC couldn't collect any of them because the `@Service` was alive for the entire JVM lifetime.

This is a memory leak. GC is working perfectly — it just can't collect objects that are still referenced. The reference is what makes them "alive" even though no business logic needs them anymore.

Understanding the common memory leak patterns — and how to find them with a heap dump — is the difference between a team that debugs this in 30 minutes and a team that restarts pods and crosses their fingers for three nights in a row.

---

## 3. How It Works Internally

### The Mental Model
Think of GC as a landscaper who removes dead plants. A dead plant is one that nobody is growing intentionally — no one is watering it, no path leads to it.

A memory leak is a hose accidentally left running to a patch of weeds. The landscaper can't remove plants that are still being watered, even accidentally. The weeds (dead objects) keep accumulating. Eventually the garden (heap) is full of accidentally-alive weeds and there's no room for anything new.

The hose = a stale reference. Cutting the hose = removing the reference (nulling a field, clearing a collection, calling `remove()` on a ThreadLocal). Once you cut the hose, the next GC cycle removes the weeds.

### The Mechanism — Four Common Memory Leak Patterns

**Pattern 1: Unbounded static collection**
```
Cause: A static or long-lived collection that grows without eviction.
Object: @Service, @Component, or any singleton-scoped Spring bean with a non-evicting Map/List field.

Lifecycle:
  JVM starts → Service bean created (lives until JVM stops)
  Request comes in → object added to bean's field
  Request ends → service is still alive → field is still referenced → object can't be GC'd
  After N requests → N objects in the field → memory full

Common examples:
  - An audit log List<AuditEntry> in a @Service that never clears
  - A cache Map<String, UserProfile> in a @Component with no max size
  - A deduplication Set<String> that only adds, never removes
```

**Pattern 2: ThreadLocal values not removed**
```
Cause: ThreadLocal stores a value per thread. If the thread is from a thread pool (reused),
       the ThreadLocal value from request 1 is still there when thread is reused for request 100.

Lifecycle:
  Thread pool has 50 threads.
  Request 1: thread 5 sets ThreadLocal.set(largeObject)
  Request 1 ends: largeObject NOT removed → stays in thread 5's ThreadLocal
  10,000 requests later: thread 5's ThreadLocal still holds largeObject from request 1.
  JVM can't collect largeObject because thread 5 (still live in the pool) references it.

Common in: logging MDC, SecurityContext, request correlation ID, tenant context in multitenant apps.
```

**Pattern 3: Event listener / callback not unregistered**
```
Cause: You register an object as a listener. The object should be short-lived.
       But the event source holds a strong reference to the listener indefinitely.

Lifecycle:
  EventBus.subscribe(this)  ← listener registered (EventBus is a long-lived singleton)
  Component created for request X → registered as listener
  Request ends → component goes out of scope
  BUT: EventBus still holds reference → component not collectable
  After 10,000 requests: 10,000 listener objects in EventBus, all unreclaimable

Common in: Guava EventBus, Spring ApplicationEventPublisher, WebSocket session listeners,
          OS file system watchers, database change listeners.
```

**Pattern 4: Unclosed resources**
```
Cause: JDBC connections, file handles, HTTP client connections opened but not closed.

Unlike "object" leaks, these are OS-level resource leaks:
  - JDBC connection not closed → connection pool exhausted → new requests hang waiting for a connection
  - File handle not closed → OS runs out of file descriptors → IOException on new file operations
  - Memory-mapped file not released → off-heap memory grows without bound

Common in: missing try-with-resources, caught exceptions before close() is called,
          manual JDBC code without finally block, pre-Java 7 patterns.
```

### ASCII Diagram

```
MEMORY LEAK: STATIC COLLECTION ACCUMULATION
────────────────────────────────────────────────────────────────────
  JVM Heap over time:

  Hour 1:   [■■■■░░░░░░░░░░░░░░░░░░░░░░░░░░]  15% full
            (normal objects, GC collected all unused)

  Hour 5:   [■■■■■■■■■■■■░░░░░░░░░░░░░░░░░░]  40% full
            (static cache growing, won't GC — still referenced)

  Hour 9:   [■■■■■■■■■■■■■■■■■■■■■■■■░░░░░░]  80% full
            (GC runs frequently, collecting everything EXCEPT the static cache)

  Hour 10:  [■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■]  OOM → pod crashes

  The static cache is the "hose still running":
  @Service → cacheMap → [obj1, obj2, ..., obj1.2M] — all unreachable by GC

GC ROOT CHAIN (why GC can't collect):
  GC Roots: JVM threads + Static fields + JNI refs
  Thread[main] → ApplicationContext → @Service bean → cacheMap → User[id=1001] → ALIVE
  Even though "nobody is using User[id=1001]", GC sees the chain and won't collect it.
────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — Four Classic Memory Leak Patterns
```java
// LEAK 1: Unbounded static collection in a Spring Service
@Service
public class FraudDetectionService {
    // Lives for the entire lifetime of the application
    private final Map<String, FraudScore> scoreCache = new HashMap<>();

    public void checkFraud(String userId, BigDecimal amount) {
        FraudScore score = computeScore(userId, amount);
        scoreCache.put(userId, score);  // Added but never removed
        // After 1 million users: 1M FraudScore objects permanently in memory
    }
}

// LEAK 2: ThreadLocal not removed
public class RequestContextHolder {
    private static final ThreadLocal<RequestContext> context = new ThreadLocal<>();

    public static void setContext(RequestContext ctx) {
        context.set(ctx);  // Set at start of request
    }

    public static RequestContext getContext() {
        return context.get();
    }
    // Missing: remove() at end of request!
    // Thread pool thread reuses without clearing — request 2 sees request 1's context
}

// LEAK 3: Listener never unregistered
@Component
public class OrderEventHandler implements ApplicationListener<OrderEvent> {
    // Spring @Component implementing ApplicationListener = auto-registered on startup
    // But if you programmatically add listeners inside a loop or on every request:
    public void setupHandlers() {
        for (int i = 0; i < 100; i++) {
            applicationEventPublisher.addListener(new TempHandler());  // Never removed
            // 100 TempHandler objects in memory, each holding the eventPublisher reference
        }
    }
}

// LEAK 4: Resource not closed (old-style, pre-try-with-resources)
public List<Order> queryOrders(String userId) throws Exception {
    Connection conn = dataSource.getConnection();
    PreparedStatement stmt = conn.prepareStatement("SELECT * FROM orders WHERE user_id=?");
    stmt.setString(1, userId);
    ResultSet rs = stmt.executeQuery();
    List<Order> orders = mapToOrders(rs);     // If this throws an exception...
    rs.close();
    stmt.close();
    conn.close();    // ...these never run. Connection pool leaks 1 connection per exception.
    return orders;
}
```

### Right Way — All Four Patterns Fixed
```java
// FIX 1: Bounded cache with eviction → use Caffeine
@Service
public class FraudDetectionService {
    // Bounded cache: max 10,000 entries, evict after 5 minutes of no access
    private final Cache<String, FraudScore> scoreCache = Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterAccess(Duration.ofMinutes(5))
        .build();

    public void checkFraud(String userId, BigDecimal amount) {
        FraudScore score = scoreCache.get(userId, k -> computeScore(k, amount));
        // Caffeine automatically evicts stale/excess entries
        // Maximum memory usage: bounded at creation time
    }
}

// FIX 2: ThreadLocal with mandatory cleanup (always in finally block or interceptor)
public class RequestContextHolder {
    private static final ThreadLocal<RequestContext> context = new ThreadLocal<>();

    public static void setContext(RequestContext ctx) {
        context.set(ctx);
    }

    public static RequestContext getContext() {
        return context.get();
    }

    // MUST be called when request ends — put in Spring interceptor or filter
    public static void clearContext() {
        context.remove();  // Removes the value for the current thread
    }
}

// In a Spring HandlerInterceptor:
@Component
public class RequestContextInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        RequestContextHolder.setContext(new RequestContext(req));
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res,
                                 Object handler, Exception ex) {
        RequestContextHolder.clearContext();  // ALWAYS called — even on exception
    }
}

// FIX 3: Weak references for event listeners (or use Spring's @EventListener which auto-deregisters)
@Service
public class EventRegistry {
    // WeakReference allows GC to collect the listener if nobody else holds it
    private final List<WeakReference<OrderEventListener>> listeners = new CopyOnWriteArrayList<>();

    public void register(OrderEventListener listener) {
        listeners.add(new WeakReference<>(listener));
    }

    public void publish(OrderEvent event) {
        listeners.removeIf(ref -> {
            OrderEventListener l = ref.get();
            if (l == null) return true;   // GC collected it → remove from list
            l.onOrderEvent(event);
            return false;
        });
    }
}

// FIX 4: try-with-resources — always closes resources even on exception
public List<Order> queryOrders(String userId) throws SQLException {
    try (Connection conn = dataSource.getConnection();
         PreparedStatement stmt = conn.prepareStatement(
             "SELECT * FROM orders WHERE user_id=?")) {
        stmt.setString(1, userId);
        try (ResultSet rs = stmt.executeQuery()) {
            return mapToOrders(rs);
        }
    }
    // All resources auto-closed on exit, regardless of exception
    // No connection pool leak. No file descriptor leak.
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How would you identify a memory leak in a production Java service?"

**Hruday's answer:**
> My approach is systematic, starting from the symptom and drilling to the cause.
>
> Step 1: Confirm it's a leak, not just sizing. Look at heap usage over time via a monitoring tool like Prometheus + Grafana or JConsole. A memory leak shows up as a sawtooth pattern that never comes back down to baseline — the heap grows, GC runs, it drops a little but not to where it started, then grows again, slightly higher each time. Eventually it hits the ceiling.
>
> Step 2: Enable GC logging and confirm GC is running correctly. If GC is running and still not reclaiming memory, objects are being held by live references — that's a leak.
>
> Step 3: Take a heap dump. `jcmd <PID> GC.heap_dump /tmp/heapdump.hprof` or use the auto-dump with `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/dump.hprof`. Do it twice, 5 minutes apart, so you can compare what grew.
>
> Step 4: Analyse the heap dump with Eclipse MAT. Run the "Leak Suspects" report. It will show the top accumulated objects and the reference chain keeping them alive (the GC root chain). That chain usually points directly to the leaking code: a static map, a ThreadLocal, a listener list.
>
> Step 5: Fix the reference. Null it out after use, add a max-size to a cache, add `ThreadLocal.remove()` in a finally block, or replace the static collection with a bounded Caffeine cache.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain how a ThreadLocal causes a memory leak in a thread pool."

**Hruday's answer:**
> ThreadLocal stores a value per thread — each thread has its own isolated slot. That's the right tool for storing per-request context (user ID, tenant ID, security context) without passing it as a parameter through every method.
>
> The leak happens because Spring Boot uses a thread pool (Tomcat's or your own `ThreadPoolExecutor`). Thread pool threads are never destroyed after a request — they're recycled. Thread 5 handles request A, completes it, and goes back to the pool. Thread 5 handles request B next.
>
> If request A sets `ThreadLocal.set(largeObject)` and never calls `ThreadLocal.remove()`, when thread 5 is recycled for request B, it still has `largeObject` in its ThreadLocal slot. Request B might not call `set()` at all, so `largeObject` just stays there permanently.
>
> The GC cannot collect `largeObject` because thread 5 is alive (in the pool), and thread 5's internal `ThreadLocalMap` holds a strong reference to `largeObject`. Even though no request is actively using it, the reference chain keeps it alive: `Thread[5] → ThreadLocalMap → Entry[key=threadLocal, value=largeObject]`.
>
> The fix is always `ThreadLocal.remove()` in a finally block or Spring interceptor's `afterCompletion`. Never set a ThreadLocal without a paired remove.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "You need an in-memory cache in a Spring service. When is it a memory risk?"

**Hruday's answer:**
> An in-memory cache in a Spring `@Service` is a memory risk when it grows without a bound on size or time.
>
> Risk 1: unbounded size. If you're using a `HashMap` that only adds entries and never removes them, its size is bounded only by the number of unique keys ever requested. In a product catalog cache keyed by product ID, that's fine — stable number of products. In a user request deduplication map keyed by request UUID, that's a disaster — a new UUID every request, growing forever.
>
> Risk 2: infinite TTL. Even a bounded-size cache that evicts by LRU is fine. But a cache with no expiry, keyed by user ID, holds stale user profiles forever. A user updates their profile — the in-memory cache still serves the old version for the life of the JVM. That's both a correctness and a memory risk.
>
> The safe pattern: always use Caffeine (or Guava Cache) instead of a raw `HashMap` for any in-process cache. Caffeine forces you to declare `maximumSize()` or `expireAfterWrite()` at construction — the bound is explicit and enforced. Raw `HashMap` has no such guard.
>
> For anything that needs to scale beyond one JVM instance — user sessions, rate limiter counts, shared flags — use Redis, not in-process caches. In-process caches are invisible to other pods.

---

### Q4 — Scenario Question
**Interviewer asks:** "A service's memory grows by 50MB every hour and never drops. Walk me through diagnosing it."

**Hruday's answer:**
> 50MB/hour, linear growth, never drops back to baseline — that's a classic reference leak, not a heap sizing issue (which would show a hard ceiling and OOM).
>
> Step 1: Confirm the pattern in Grafana. Heap usage shows a steady upward slope. GC runs periodically but barely reduces the floor. Old Generation is growing.
>
> Step 2: Take two heap dumps 30 minutes apart.
> `jcmd <PID> GC.heap_dump /tmp/heap1.hprof` → wait 30 min → `jcmd <PID> GC.heap_dump /tmp/heap2.hprof`
>
> Step 3: Open both in Eclipse MAT. Use "Compare to baseline" feature. Sort by delta — what object type grew the most between the two dumps?
>
> Step 4: Say the delta shows 250,000 new `AuditLogEntry` objects in dump 2. Click the object type → "Path to GC Roots" → follow the chain. It shows: `Thread[tomcat-thread-pool-5] → ThreadLocalMap → RequestContext → List<AuditLogEntry>`.
>
> That tells me: a `ThreadLocal<RequestContext>` is holding `List<AuditLogEntry>` per Tomcat thread, and `ThreadLocal.remove()` is never called. Each request adds audit entries to the context and the context is never released.
>
> Fix: in the request interceptor's `afterCompletion`, clear the ThreadLocal. Flush the audit entries to the DB or async queue before clearing. Deploy. Monitor heap — the slope flatlines.
>
> This process — heap dump, delta analysis, GC root chain — is the standard approach for any unexplained heap growth.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Java doesn't have memory leaks" | "GC prevents memory leaks." | "GC prevents leaks of unreachable objects. Leaks of accidentally-still-referenced objects are very much possible in Java." |
| Static = bad | "I'll avoid static fields." | "Static fields are fine for constants and singletons. The leak risk is a static field holding a collection that grows without eviction." |
| Debug with logs only | "I'd add log statements to track memory." | "Heap dump analysis is the right tool. Eclipse MAT shows exactly which objects are alive and which reference chain is holding them." |
| ThreadLocal is safe to leave | "ThreadLocal is per-thread so it clears itself." | "Not in thread pools. Thread reuse means ThreadLocal values persist across requests unless you explicitly call remove()." |

---

## 7. Hruday's Real Experience Hook

> "At Capgemini, we had an Angular/Node.js backend that kept crashing every 48 hours. The Node.js process (not Java, but same concept) grew to 2GB and crashed. The culprit: a global `Map` that stored user session tokens for validation. The map only had a `set()` — no `delete()`, no expiry. Every login added an entry. Every logout did nothing to the map. After two days of load testing, the map had 500,000 entries from 48 hours of test users — most of whom had been 'logged out' by front-end navigation but never truly removed from the map. The fix: add `map.delete(token)` on logout and a scheduled job to sweep entries older than 24 hours. That incident made me build cache eviction into the first version of any in-memory store — never as an afterthought."

---

## 8. Scale Evolution

**Junior engineer →** Thinks Java has no memory issues because GC exists. Hasn't debugged a leak, doesn't know about heap dumps.

**Mid-level engineer →** Has seen `OutOfMemoryError` in production. Knows to take a heap dump. Might not know how to analyse it correctly.

**Senior engineer →** Knows all four leak patterns. Takes and analyses heap dumps with Eclipse MAT. Uses Caffeine for every in-process cache. Always pairs ThreadLocal with `remove()`. Reviews code for listener registration patterns.

**Staff engineer →** Builds memory leak detection into CI — periodic heap analysis in staging, alerting on heap growth slope > threshold, automated heap dump collection before pod OOM. Makes memory hygiene part of the team's code review checklist.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment services run 24/7 — memory leaks cause overnight incidents | "You identified the ThreadLocal leak pattern and mentioned afterCompletion cleanup. That's production experience." |
| Swiggy / Meesho | High-traffic services — small per-request leaks compound under load | "You reached for Caffeine instead of HashMap for the in-process cache. Correct." |
| Adobe / SAP | Long-running enterprise services — listener leaks and large object retention | "You described the Eclipse MAT GC root chain analysis. That's the right diagnostic tool." |
| Google / Amazon | SDE-2 reliability questions — "what production incidents have you debugged?" | "Walk me through a memory leak you found and fixed in production." |

---

## 10. Related Topics — What to Study Next

- **Garbage Collection (Topic 22)** — GC runs correctly during a memory leak — understanding why GC can't collect "live" objects completes the picture.
- **ThreadLocal — Use Cases and Risks (Topic 30)** — The full deep dive on ThreadLocal patterns and the memory risks of improper use.
- **JVM Architecture (Topic 21)** — The heap structure that accumulates leaked objects.
- **Caching — Caffeine and Redis (Part 9)** — The right tool for in-process caches that avoids unbounded HashMap leaks.

---

*Part 2 · Memory Leaks — How They Happen in Backend Systems · Full Stack Interview Guide · Hruday D · 2026*
