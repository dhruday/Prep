# Singleton — and Why It Is Dangerous
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Classic Singleton**: a class that guarantees exactly one instance exists in the JVM; accessed via a global static method `getInstance()`; the class creates and holds its own instance
- **Dangers**: global mutable state — any code anywhere can call `getInstance()` and CHANGE shared state; race conditions — classic double-checked locking requires volatile correctly; testing — can't inject a mock; hidden dependency — caller doesn't declare it as a parameter; tight coupling — caller imports the concrete class; if two class loaders load the same class, you get TWO singletons (breaks the guarantee)
- **Thread-safe lazy singleton**: use `enum` (JVM guarantees one instance per class loader, thread-safe by specification) or initialise-on-demand holder idiom; NOT double-checked locking unless you know exactly what you're doing with `volatile`
- **Spring singleton vs classic Singleton**: Spring's `@Scope("singleton")` — one instance per ApplicationContext — is managed by the IoC container; it's injected via DI (no static `getInstance()` call), it can be mocked in tests, it's declared as a dependency — no hidden coupling; Spring singleton is NOT the Singleton design pattern
- **When classic Singleton is acceptable**: stateless utilities (LoggerFactory, clock providers) where there is no mutable state to corrupt; even then, Spring-managed singletons are preferable in Spring applications
- **The real danger summary**: static global access + mutable shared state + no mock capability = the Singleton anti-pattern in production systems

---

## 1. One-Line Definition
The Singleton pattern restricts a class to one instance with global access, but its dangers — global mutable state, implicit coupling, untestability, and broken guarantees across class loaders — make it an anti-pattern in most production code, replaced by IoC container-managed singletons in Spring.

---

## 2. The Problem It Solves

**Original intent:** ensure a single database connection pool, a single configuration registry, or a single logger factory exists. Creating multiple would waste resources or cause inconsistency.

**Why it causes problems in practice:**
- `UserSessionSingleton.getInstance().setCurrentUser(user)` — any thread can change the "current user"; in a multi-threaded server handling thousands of requests, one thread's user becomes another thread's user (data leak, security vulnerability)
- `Config.getInstance().reload()` — a test that calls this affects ALL other tests running in the same JVM; tests are no longer isolated
- `Singleton.getInstance()` is an invisible dependency — the class that calls it doesn't declare it in its constructor, so callers looking at the constructor can't tell this dependency exists; tests can't replace it with a mock

---

## 3. How It Works Internally

Classic implementations and their flaws:

```java
// ❌ Basic singleton — NOT thread safe
public class ConfigManager {
    private static ConfigManager instance;  // null initially
    
    private ConfigManager() {}
    
    public static ConfigManager getInstance() {
        if (instance == null) {             // ← Thread A checks, null
            instance = new ConfigManager(); // ← Thread B also checks, null; BOTH enter
        }                                   // ← TWO instances created; last one wins; A's reference is stale
        return instance;
    }
}

// ❌ Double-checked locking — correct ONLY with volatile; often done wrong
public class ConfigManager {
    private static volatile ConfigManager instance;  // volatile is required (instruction reorder risk)
    
    public static ConfigManager getInstance() {
        if (instance == null) {                      // 1st check without lock
            synchronized (ConfigManager.class) {
                if (instance == null) {              // 2nd check with lock
                    instance = new ConfigManager();  // ← Without volatile, another thread may see
                }                                    //   partially-constructed object before constructor returns
            }
        }
        return instance;
    }
    // Correct if volatile is present — but the complexity is a maintenance trap
}

// ✅ Enum singleton — thread-safe by JVM specification, simplest correct approach
public enum AppConfig {
    INSTANCE;
    
    private final Properties props = new Properties();
    
    public String get(String key) { return props.getProperty(key); }
    public void load(String file) throws IOException { props.load(new FileReader(file)); }
}
// Usage: AppConfig.INSTANCE.get("db.url")
// Thread safety: guaranteed by class loader; serialisation-safe; reflection-safe

// ✅ Initialise-on-demand holder — lazy, thread-safe, no synchronisation overhead
public class ConfigManager {
    private ConfigManager() {}
    
    private static class Holder {
        static final ConfigManager INSTANCE = new ConfigManager();
        // Class loaded lazily (only when Holder is first accessed); class loading is thread-safe by JVM
    }
    
    public static ConfigManager getInstance() { return Holder.INSTANCE; }
}
```

---

## 4. The Code

### Wrong Way — Classic Singleton with Global State

```java
// ❌ DANGEROUS singleton pattern in a web application

public class RequestContext {
    private static RequestContext instance;
    private String currentUserEmail;          // ❌ MUTABLE GLOBAL STATE
    private String requestId;
    private String tenantId;
    
    private RequestContext() {}
    
    public static RequestContext getInstance() {
        if (instance == null) instance = new RequestContext();  // ❌ NOT thread safe
        return instance;
    }
    
    public void setCurrentUser(String email) { this.currentUserEmail = email; }
    public String getCurrentUser()           { return currentUserEmail; }
}

// ❌ Used in a controller
@RestController
class OrderController {
    @PostMapping("/orders")
    public ResponseEntity<Order> place(@RequestBody OrderRequest req, HttpServletRequest httpReq) {
        // Thread A handling user alice@example.com sets this:
        RequestContext.getInstance().setCurrentUser("alice@example.com");
        
        // Thread B handling user bob@example.com immediately overwrites it:
        // RequestContext.getInstance().setCurrentUser("bob@example.com");
        
        // Thread A is now processing alice's order but logging bob's email
        // This is a data leak — cannot happen in production!
        String user = RequestContext.getInstance().getCurrentUser();
        orderService.placeOrderFor(user, req);
        return ResponseEntity.ok().build();
    }
}

// ❌ Testing — impossible to mock
class OrderServiceTest {
    @Test
    void shouldPlaceOrderForUser() {
        // Can't inject a mock RequestContext — it's static global
        // Can't reset state between tests — instance persists in JVM
        // Tests leak state into each other
        // Every test must call RequestContext.getInstance().setCurrentUser("test-user")
        // and then clean up — brittle and forgotten
    }
}
```

```java
// ✅ CORRECT — Spring-managed bean (effectively singleton per ApplicationContext) + request scope for per-request state

// Per-request state: use @RequestScope
@Component
@RequestScope           // ← new instance per HTTP request; no shared mutable state
class RequestContext {
    private String currentUserEmail;
    private String requestId;
    
    // Injected by Spring — no static getInstance() anywhere
    public void setCurrentUser(String email) { this.currentUserEmail = email; }
    public String getCurrentUser() { return currentUserEmail; }
}

// Singleton service (stateless) — safe to share across all threads
@Service  // ← @Scope("singleton") by default — but NO MUTABLE INSTANCE FIELDS
class OrderService {
    private final OrderRepository repo;
    private final RequestContext ctx;  // ← Spring injects request-scoped bean via a PROXY
    
    public OrderService(OrderRepository repo, RequestContext ctx) {
        this.repo = repo;
        this.ctx  = ctx;
    }
    
    public void placeOrder(OrderRequest req) {
        String user = ctx.getCurrentUser();  // ← ctx is a proxy; resolves to current request's instance
        repo.save(new Order(req, user));
    }
}

// ✅ Testing is trivial — inject mock RequestContext directly
class OrderServiceTest {
    @Test
    void shouldPlaceOrderForUser() {
        RequestContext mockCtx = mock(RequestContext.class);
        when(mockCtx.getCurrentUser()).thenReturn("alice@example.com");
        
        OrderRepository mockRepo = mock(OrderRepository.class);
        OrderService service = new OrderService(mockRepo, mockCtx);
        
        service.placeOrder(new OrderRequest(...));
        
        verify(mockRepo).save(argThat(o -> "alice@example.com".equals(o.getUserEmail())));
    }
}
```

```java
// ✅ When a true singleton is acceptable — stateless, immutable, no injection needed

// Stateless utility — no risk; enum singleton is safe
public enum TimeProvider {
    INSTANCE;
    
    public Instant now() { return Instant.now(); }
    // Read-only; no mutable state; safe to access from any thread
}

// ✅ Better: inject it to remain testable (even stateless utilities benefit from mockability in time-sensitive tests)
@Component
class TimeProvider {
    public Instant now() { return Instant.now(); }
}
// Now tests can inject a mock TimeProvider that returns a fixed time — deterministic tests
```

```typescript
// ✅ Angular: singleton services via 'providedIn: root'
// NOT class-level static — Angular's DI manages the single instance

@Injectable({ providedIn: 'root' })  // ← one instance for whole app, managed by Angular's IoC container
class AuthService {
    private currentUser$ = new BehaviorSubject<User | null>(null);  // ← reactive state, not mutable field
    
    get currentUser() { return this.currentUser$.asObservable(); }
    setUser(user: User) { this.currentUser$.next(user); }
}

// ✅ Testing — override in TestBed providers; no static getInstance() to work around
TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useClass: MockAuthService }]
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the Singleton pattern and why is it sometimes called an anti-pattern?"

**Hruday's answer:**
> The Singleton pattern ensures exactly one instance of a class exists throughout the application, accessible via a global static method.
>
> It's called an anti-pattern for three reasons.
>
> First: global mutable state. Any code can call `getInstance()` and modify the singleton's state. In a multi-threaded server (every Spring app is multi-threaded), two threads modifying shared state concurrently causes race conditions and data corruption without careful synchronisation.
>
> Second: hidden coupling. When I see a constructor `OrderService(OrderRepository, PaymentGateway)`, I know exactly what it depends on. But if `OrderService` internally calls `AuditLogger.getInstance()`, I can't tell from the constructor. The dependency is invisible — makes the code harder to reason about and maintain.
>
> Third: untestability. I can't inject a mock in place of `AuditLogger.getInstance()`. I either get the real logger (which may write to a real file in tests) or I have to add a separate static setter for testing — which is yet another design smell.
>
> Spring's IoC container solves all three: it manages one instance per ApplicationContext but injects it via constructor, so the dependency is visible, mockable, and the lifecycle is managed by the container.

---

### Q2 — Deep Dive
**Interviewer asks:** "Describe a thread-safe lazy singleton implementation and its trade-offs."

**Hruday's answer:**
> The three acceptable options:
>
> One: **Enum singleton** — `public enum MyService { INSTANCE; }`. JVM guarantees one instance per class loader. Thread-safe by specification. Also safe against serialization and reflection attacks. Downside: can't extend a class; looks unusual for anything other than small utilities.
>
> Two: **Initialise-on-demand holder** — a private static inner class holds the instance. JVM only loads the inner class when it's first accessed (lazy). Class loading itself is thread-safe by JVM spec. No `synchronized` keyword needed at runtime. This is the recommended pattern when you need lazy initialisation with clear Java class structure.
>
> Three: **Double-checked locking with `volatile`** — the field must be `volatile` to prevent instruction reordering. Without `volatile`, a thread may see a partially-constructed object before the constructor has finished running, because the JVM may reorder `instance = new ConfigManager()` at the bytecode level. This is technically correct when `volatile` is present but adds complexity that's easy to get wrong.
>
> In a Spring application, I'd use none of these in service classes — Spring manages the singleton lifecycle. I'd use enum singleton only for small, stateless utilities that live outside the Spring context.

---

### Q3 — Application
**Interviewer asks:** "What's the difference between Spring's singleton scope and the Singleton design pattern?"

**Hruday's answer:**
> They both ensure one instance — but the mechanism and the consequences are completely different.
>
> The Singleton design pattern manages its own instance with a static field and a static getter. It's self-managing, globally accessible, and tightly coupled to anyone who calls `getInstance()`. You can't mock it, can't replace it, can't control its lifecycle from outside.
>
> Spring's singleton scope means one bean instance per ApplicationContext. Spring — not the class — controls the instance. It's wired via constructor injection. Callers declare their dependency and Spring injects the single shared instance. In a test, you configure Spring to inject a mock instead. The class itself has no static fields, no static methods, no self-management.
>
> The key difference: Spring singleton = IoC-managed shared instance, fully mockable, visible dependency. Singleton pattern = self-managed global, hidden dependency, can't be mocked.
>
> Confusing them is a common source of defects: a Spring singleton bean that stores request-specific data in an instance field will leak data between requests because it's shared.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| @Service bean = thread safe | "Spring beans are singletons, so they're safe to use across threads" | Spring singleton = one instance shared by all threads, which is ONLY safe if the bean has no mutable instance fields; if `OrderService` has `private List<Order> pending = new ArrayList<>()`, two requests adding to `pending` simultaneously corrupt the list; Spring singleton beans MUST be stateless; all per-request state goes in method-local variables or request-scoped beans |
| Just add synchronized | "To fix the thread safety issue, just synchronize getInstance()" | Synchronizing the whole method makes every caller wait for a lock even after the instance is created, which is a performance bottleneck; this is why double-checked locking was invented; but the simplest solution is to not use a class-level singleton at all and let Spring manage singleton lifecycle via the IoC container; adding `synchronized` is symptom treatment for a design smell |
| Singleton is always bad | "I never use Singleton" | A blanket rejection is also wrong; stateless singletons — like `LoggerFactory` or `Clock` — are fine and appropriate; the problem is specifically MUTABLE state + global access + no mockability; if none of those apply, a singleton is the correct and efficient choice; Spring itself manages hundreds of singletons (all your `@Service`, `@Repository`, `@Controller` beans are singletons) |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, a legacy module used a Singleton `TenantContextHolder` to pass the current tenant ID through the call stack. The pattern was `TenantContextHolder.getInstance().setTenantId(id)` at the request entry point, then `getTenantId()` deep in the repository layer.
>
> In production, we scaled from 4 to 16 parallel request-handling threads. Within a week we received customer reports of data being returned for the wrong tenant — a B2B SaaS data leak, which is a severity-one incident.
>
> Root cause: Thread A handled tenant 'SAP-UK', set the singleton's tenantId. Thread B handled tenant 'SAP-DE', immediately overwrote the singleton's tenantId. Thread A's repository query now filtered with 'SAP-DE' instead of 'SAP-UK'. No lock, no thread safety.
>
> Fix: replaced `TenantContextHolder` singleton with a `ThreadLocal` (for the legacy path) and with a Spring `@RequestScope` bean (for new code). Every request gets its own instance. The singleton was deleted.
>
> The security incident review classified it as 'architecture-level vulnerability'; the root cause was mutable global state in a multi-threaded server — exactly the core danger of the Singleton pattern."

---

## 8. Scale Evolution

**1,000 users →** Classic Singleton risks surface: race conditions in mutable singletons. Use Spring-managed singletons. Ensure all singleton beans are stateless.

**100,000 users →** `ThreadLocal`-based context holders (like Spring Security's `SecurityContextHolder`) are effectively per-thread singletons — correct at this scale but require explicit cleanup (`SecurityContextHolder.clearContext()` in filters) to avoid thread pool context leaks. Spring handles this automatically for request-scoped beans.

**10 million users →** Distributed singletons (one config value across a cluster) need external coordination: Redis, Zookeeper, or Spring Cloud Config; there's no JVM-level singleton that spans multiple JVMs; at this scale "singleton" means "one source of truth in the distributed system", which is a distributed systems question (leader election, consensus), not a class design question.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Mutable singleton with payment session state = data breach risk; transaction context must be per-request, not global singleton; request-scoped beans for payment context | Security angle of mutable singletons; request scope |
| Swiggy / Meesho | High-concurrency order processing — singleton beans must be stateless; race conditions in shared cart or pricing singleton cause data corruption | Stateless singleton beans; ThreadLocal vs request scope |
| Adobe / Microsoft | Classic interview question — "implement a thread-safe singleton, then explain its trade-offs"; enum singleton vs holder idiom; double-checked locking analysis | Thread-safe singleton implementation variants |
| SAP Labs | TenantContextHolder singleton data leak story (wrong tenant data returned, S1 incident; fix: @RequestScope; singleton deleted) | Concrete multi-tenant data leak from mutable singleton |

---

## 10. Related Topics — What to Study Next

- **Topic 290 — Inversion of Control** — Spring's IoC container is the production alternative to the Singleton pattern; understanding IoC explains why Spring-managed singletons don't have the classic Singleton's problems: the IoC container manages the instance, not the class itself
- **Topic 296 — Proxy Pattern — Spring AOP Uses This** — Spring's singleton service beans are actually AOP proxies when annotated with `@Transactional`, `@Cacheable`, etc.; understanding proxies explains the "calling `@Transactional` method from within the same class doesn't start a transaction" gotcha, which trips up many Spring developers
- **Topic 298 — Strategy Pattern** — Strategy is often used as the correct alternative to Singleton-managed state: instead of a global strategy singleton that holds state, inject the strategy via DI; the strategy object is managed by the container, tested individually, swappable

---

*Part 18 · Singleton — and Why It Is Dangerous · Full Stack Interview Guide · Hruday D · 2026*
