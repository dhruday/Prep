# 204. Java Memory Leaks in Backend Systems

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

A **Java memory leak** occurs when objects that are no longer needed by the application logic remain reachable by at least one GC root — so the Garbage Collector cannot reclaim them. Unlike C/C++, Java leaks are not about forgetting to `free()` memory. They are about **holding references longer than necessary**, preventing the GC from doing its job.

**What it is:**
- Objects accumulating in the heap that will never be used again — but are still referenced
- A slow resource exhaustion that eventually causes `OutOfMemoryError: Java heap space`
- Often intermittent at first: GC can temporarily reclaim, but heap grows over time

**Why it matters:**
- Memory leaks in backend services cause gradual performance degradation and eventually crashes
- Services running for days/weeks without restart are particularly susceptible
- In containerized environments, OOM causes the container to be killed and restarted — impacting availability

**The problem it causes:**
- Increasing heap usage trend over time
- More frequent and longer GC pauses
- Eventually `OutOfMemoryError` and service restart
- Data loss if in-flight requests are killed

**Role in large-scale distributed systems:**
- A single slow memory leak in a high-traffic service can cause hours of degraded performance before an outage
- Rolling restarts can mask leaks in canary deployments — the leak reappears at production traffic levels

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Root Cause Categories

#### 1. Static Collections Growing Without Bound

```java
// ❌ Static Map that never shrinks — classic leak pattern
public class UserSessionCache {
    private static final Map<String, UserSession> sessions = new HashMap<>();

    public static void addSession(String token, UserSession session) {
        sessions.put(token, session);   // items added...
        // ...but never removed on logout or expiry
    }
}
```

**Fix:** Use an `LRU` evicting cache (`LinkedHashMap` with `removeEldestEntry`, or `Caffeine`), or explicitly remove entries.

```java
// ✅ Use a cache with eviction
private static final Cache<String, UserSession> sessions = Caffeine.newBuilder()
    .expireAfterWrite(30, TimeUnit.MINUTES)
    .maximumSize(10_000)
    .build();
```

---

#### 2. ThreadLocal Not Cleaned Up

`ThreadLocal` binds a value to a thread. In thread pools (Spring, Tomcat, Netty), threads are reused. If `ThreadLocal` values are not removed, they persist across requests on the same thread.

```java
// ❌ ThreadLocal leak in a servlet container
public class RequestContext {
    private static final ThreadLocal<User> currentUser = new ThreadLocal<>();

    public static void setUser(User user) { currentUser.set(user); }
    public static User getUser() { return currentUser.get(); }
    // Missing: threadLocal.remove() at end of request
}

// Servlet thread 1 handles request A → sets user "Alice"
// Request A ends — no remove()
// Servlet thread 1 handles request B → currentUser STILL returns "Alice" (stale) + memory leak
```

**Fix:** Always call `threadLocal.remove()` in a `finally` block or in a `Filter`/`Interceptor` cleanup stage.

```java
// ✅ Remove in request completion
public class RequestContextFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        try {
            chain.doFilter(req, res);
        } finally {
            RequestContext.clear();  // threadLocal.remove() inside clear()
        }
    }
}
```

---

#### 3. Event Listener / Observer Leak

Registering listeners without deregistering them is a classic Java memory leak pattern.

```java
// ❌ Listener registered on each request, never deregistered
public class InventoryService {
    private final EventBus eventBus;

    public void processOrder(Order order) {
        // New listener registered per call — old ones accumulate
        eventBus.register(new OrderCompletionListener(order));
        eventBus.post(new ProcessOrderEvent(order));
        // Missing: eventBus.unregister() after processing
    }
}
```

**Fix:** Use weak reference listeners, or maintain a reference to deregister explicitly.

---

#### 4. Unclosed Resources

Connections, streams, and file handles that are not closed hold references and exhaust pools.

```java
// ❌ Connection never closed — connection pool exhaustion + heap leak
public List<User> getUsers() {
    Connection conn = dataSource.getConnection(); // never closed
    Statement stmt = conn.createStatement();
    ResultSet rs = stmt.executeQuery("SELECT * FROM users");
    // ... process
    // no close() call
}

// ✅ Try-with-resources ensures cleanup
public List<User> getUsers() throws SQLException {
    try (Connection conn = dataSource.getConnection();
         Statement stmt = conn.createStatement();
         ResultSet rs = stmt.executeQuery("SELECT * FROM users")) {
        // process — all resources closed on exit
    }
}
```

---

#### 5. Inner Classes Holding Outer Class Reference

Non-static inner classes hold an implicit reference to their enclosing outer class instance.

```java
// ❌ Anonymous Runnable holds reference to enclosing Service
public class OrderService {
    private final List<Order> pendingOrders = new ArrayList<>();

    public void scheduleCleanup() {
        executor.scheduleAtFixedRate(new Runnable() {
            @Override
            public void run() {
                // This anonymous Runnable holds a reference to OrderService
                // If executor outlives OrderService: OrderService can't be GC'd
            }
        }, 0, 1, TimeUnit.HOURS);
    }
}

// ✅ Use a static inner class or lambda with no captured state
executor.scheduleAtFixedRate(() -> cleanupPendingOrders(), 0, 1, TimeUnit.HOURS);
```

---

#### 6. String Interning Abuse

```java
// ❌ Interning unbounded external strings fills the String pool (PermGen/Metaspace)
for (String userId : millionsOfUserIds) {
    String internedId = userId.intern();  // unbounded growth in String pool
}
```

---

#### 7. Classloader Leak (Metaspace)

In application servers (Tomcat, JBoss), re-deploying applications without proper cleanup of classloaders leads to old class definitions accumulating in Metaspace.

**Symptom:** `OutOfMemoryError: Metaspace` after multiple hot-redeploys.
**Fix:** Use microservices (one app per JVM) — no hot redeploy, no classloader leak. Or use `WeakReference` for classloader-registered resources.

---

### Detecting Memory Leaks

**Step 1: Monitor heap trend**
```bash
jstat -gcutil <pid> 5000  # print GC stats every 5 seconds
# Watch for Old Gen % steadily increasing after major GC
```

**Step 2: Capture heap dump**
```bash
# At OOM automatically:
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heapdump.hprof

# On demand:
jmap -dump:format=b,file=/tmp/dump.hprof <pid>
```

**Step 3: Analyze with Eclipse MAT**
- Open heap dump in Eclipse MAT
- Run "Leak Suspects Report"
- Look for:
  - Large retained heap objects
  - Objects with unexpectedly high instance counts
  - GC roots pointing to objects that should have been freed

**Step 4: Fix and verify**
- Deploy fix
- Monitor heap growth rate for 24 hours
- Confirm major GC brings heap back to a stable baseline

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

**Memory leak growth rate estimation:**
```
Service handles 1,000 QPS
Each request leaks 1 KB of retained heap
Leak rate: 1,000 × 1 KB = 1 MB/second
Heap growth: 1 MB/s × 3,600s = 3.6 GB/hour
With Xmx=4g: OOM in approximately 1 hour of traffic
```

**Alert thresholds:**
- Alert when old gen > 80% after a full GC cycle
- Alert when heap growth trend is upward over 30 minutes

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

- **ORM session scope:** Hibernate `EntityManager` sessions in incorrect scope can retain entity graphs in memory. Use `OSIV` (Open Session in View) carefully — it extends the session lifetime across the entire HTTP request including view rendering.
- **Large query results:** Loading millions of rows into a `List<Entity>` fills the heap. Use `Stream` processing with `ScrollableResults` or pagination.

```java
// ❌ Loads entire result into heap
List<Order> allOrders = orderRepository.findAll(); // 10M rows → heap explosion

// ✅ Stream with database cursor
orderRepository.streamAll().forEach(order -> processOrder(order));
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- Memory leaks cause **gradual performance degradation** — GC runs longer to reclaim less
- At scale: a memory leak in a service with 100 instances causes 100 simultaneous OOMs — massive blast radius
- Kubernetes `livenessProbe` restarts containers on OOM — but restarts under load create traffic spikes on healthy instances
- **Mitigation:** Scheduled rolling restarts (every 24h) as a temporary containment while leak is diagnosed
- **Real fix:** Always fix the root cause — scheduled restarts mask issues and hide symptoms

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- **ThreadLocal with security context:** Spring Security stores authentication in a ThreadLocal (`SecurityContextHolder`). If not cleared, a recycled thread may serve a subsequent request with a previous user's security context → **critical security bug**. Spring Security clears it automatically, but custom code must do the same.
- **Session tokens in static caches** without expiration: a user's session remains recoverable even after logout — privilege escalation risk.
- **Heap dumps contain sensitive data:** passwords, PII, tokens — heap dump files should be encrypted and access-controlled.

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### A Payment Service Leak (Common Pattern)
- A payment service started leaking after a new feature added a `Map<TransactionId, PaymentContext>` as a static field
- Map entries were added on payment start but never removed on payment completion
- At 500 TPS, the map grew by 500 entries/second — containing full `PaymentContext` objects with large nested graphs
- Service OOM'd every 4 hours; rolling restarts were applied as a temporary fix
- Root cause found by Eclipse MAT: `Map` retained 2.8 GB in a 4 GB heap

### Apache Tomcat ThreadLocal Leak
- A common bug in Tomcat applications: a library uses `ThreadLocal` internally but doesn't clean up
- On application undeploy, the thread (owned by Tomcat) still holds a reference to the class via ThreadLocal
- Class can't be unloaded → Metaspace grows on each redeploy → `OutOfMemoryError: Metaspace`
- Solution: Use one JVM per application (microservice pattern) or `javax.servlet.ServletContextListener.contextDestroyed` cleanup

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "Java memory leaks happen when objects are no longer needed but are still reachable by at least one GC root. The most common patterns I've seen in backend systems: static collections that grow without eviction, ThreadLocal values not cleaned up across request boundaries (dangerous in thread pools), event listeners registered but never deregistered, and unclosed database connections. I detect them by monitoring old generation heap growth after major GC — an upward trend is the signal. I diagnose using heap dumps and Eclipse MAT to find the retained object tree. Prevention: bounded caches with TTL and max size, always call `threadLocal.remove()` in a finally/filter, and always use try-with-resources for I/O."

### Common Follow-Up Questions

1. **"What's the difference between a memory leak and an OOM?"** → An OOM is the symptom; a leak is one possible cause. OOM can also happen if you're simply loading too much data for the configured heap size. Leaks grow over time; oversized data load is immediate.
2. **"How does ThreadLocal cause a security issue?"** → In thread pool environments, a recycled thread retains the previous request's ThreadLocal value (e.g., security context). If not cleared, the next request on that thread could inherit the previous user's identity.
3. **"What tools do you use to diagnose leaks?"** → `jstat` for GC monitoring, `jmap` for heap dumps, Eclipse MAT for leak analysis, JVisualVM or JProfiler for live profiling.
4. **"How do you prevent leaks in Hibernate?"** → Avoid the Open Session In View anti-pattern. Use bounded pagination for large queries. Close EntityManagers properly. Don't hold JPA entities in static caches.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Memory Leak Signature in GC Logs

```
Time 0h:   Old Gen = 500 MB  (after Full GC)
Time 1h:   Old Gen = 700 MB  (after Full GC)
Time 2h:   Old Gen = 900 MB  (after Full GC)
Time 3h:   Old Gen = 1100 MB (after Full GC)
                ↑ Upward trend after Full GC = MEMORY LEAK
                  Healthy system: stable baseline after Full GC
```

### ThreadLocal Safe Pattern

```java
@Component
public class RequestScopeFilter extends OncePerRequestFilter {

    private static final ThreadLocal<RequestMetadata> context = new ThreadLocal<>();

    public static void set(RequestMetadata meta) { context.set(meta); }
    public static RequestMetadata get() { return context.get(); }
    public static void clear() { context.remove(); }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        try {
            set(RequestMetadata.from(req));
            chain.doFilter(req, res);
        } finally {
            clear();  // ← CRITICAL: always in finally
        }
    }
}
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

**Why memory leaks matter:**
- They cause slow service degradation that is hard to diagnose and reproduce
- In production, they manifest as increasing GC pressure, P99 latency growth, and eventual OOM
- Container restarts mask the symptom but don't fix the root cause

**How to prevent them:**
- Use bounded caches with TTL and max size (Caffeine) — never unbounded static collections
- Always clean up ThreadLocal in a `finally` block or filter
- Use try-with-resources for all I/O — connections, streams, readers
- Use weak references for listener registrations when lifecycle management is unclear
- Monitor old gen heap growth trend as a leak signal

**Key trade-offs:**
- `WeakReference` for caches: eligible for GC when memory pressure is high — appropriate for soft-reference style caches
- Static maps for performance (avoid DB lookups) vs. leak risk — always bound with eviction
- Memory is cheap, but OOM in production has severe reliability consequences
