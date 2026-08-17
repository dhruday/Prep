# Bean Lifecycle — @PostConstruct, @PreDestroy, Scopes
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Spring bean lifecycle: **construct → inject → @PostConstruct → ready → @PreDestroy → destroy**
- `@PostConstruct` runs after all fields are injected — safe to use your dependencies here
- `@PreDestroy` runs on context close or JVM shutdown — use it to close connections and flush queues
- Default scope is **singleton** — one shared instance for the entire app
- Prototype scope creates a new bean every time you ask for it — Spring does NOT call `@PreDestroy` for prototype beans (you own cleanup)
- Gap to bridge: knowing the order — Constructor → `@Autowired` field injection → `@PostConstruct` is a high-frequency interview question

---

## 1. One-Line Definition
The Spring bean lifecycle is the series of steps that happen to every bean from the moment Spring creates it, through the time it is active and serving requests, until the application shuts down and Spring destroys it.

---

## 2. The Problem It Solves

Imagine a `DatabaseConnectionPool` service. It needs to open 10 database connections when the app starts, and gracefully close them all when the app stops. Without lifecycle hooks, you have no clean way to do this.

You could put setup code in the constructor. But at that point, `@Autowired` dependencies (like database config) have NOT been injected yet — the constructor runs before injection. If you try to use an injected field in the constructor body, you get a `NullPointerException`.

You could use a static initializer. But static code runs before Spring ever creates the bean — Spring config is not available yet.

You could put cleanup code in a `Runtime.addShutdownHook()`. But that runs outside Spring's control, after `@PreDestroy` methods should have already run. You end up with cleanup happening in the wrong order.

Spring's lifecycle hooks solve exactly this. `@PostConstruct` runs AFTER all dependencies are injected but BEFORE the bean starts serving requests. `@PreDestroy` runs when the context closes, BEFORE JVM shutdown hooks, in the right order. You get predictable, dependency-safe, orderly startup and shutdown.

---

## 3. How It Works Internally

### The Mental Model
Think of a restaurant kitchen. Opening the kitchen (`@PostConstruct`) means: fire up the ovens, confirm all ingredients are stocked, and signal "ready to cook". Closing the kitchen (`@PreDestroy`) means: finish the current orders, turn off the gas, and lock the doors. You would not fire up ovens before the ingredients arrive (that is the constructor running before injection), and you would not lock up while orders are still in the queue (that is unordered shutdown).

### The Mechanism — Step by Step

1. **Constructor call** — Spring uses reflection to call the constructor. At this point, NO fields are injected. The object exists but is empty of dependencies.

2. **Field and setter injection** — `AutowiredAnnotationBeanPostProcessor` runs. It looks for `@Autowired` on fields, setter methods, and constructor parameters (constructor injection is actually done in step 1 when constructor args are passed). After this step, all injected dependencies are available.

3. **BeanNameAware / BeanFactoryAware (optional)** — If your bean implements these interfaces, Spring calls `setBeanName()` and `setBeanFactory()`. Mostly used in advanced framework code — you rarely implement these.

4. **BeanPostProcessor — postProcessBeforeInitialization()** — Any registered `BeanPostProcessor` gets a chance to wrap or modify the bean before init methods run. This is how AOP proxies are created.

5. **@PostConstruct** — `InitDestroyAnnotationBeanPostProcessor` detects the annotation and calls the method. All dependencies are available. Safe to open connections, load reference data, start background threads.

6. **InitializingBean.afterPropertiesSet() (optional)** — Runs after `@PostConstruct` if your class implements `InitializingBean`. Same purpose, but `@PostConstruct` is preferred — it does not couple your code to Spring's API.

7. **BeanPostProcessor — postProcessAfterInitialization()** — After init, processors wrap the bean again if needed (e.g., create a JDK dynamic proxy for transactions). The proxy replaces your original bean in the context.

8. **Bean is READY** — The bean is now live. The context publishes `ContextRefreshedEvent`. Your app starts serving requests.

9. **Context close (shutdown)** — Call `context.close()` or JVM shutdown triggers `SpringApplication`'s shutdown hook.

10. **@PreDestroy** — `InitDestroyAnnotationBeanPostProcessor` calls `@PreDestroy` methods. Close connections, flush remaining messages, release locks.

11. **DisposableBean.destroy() (optional)** — Runs after `@PreDestroy` if implemented. Same purpose, `@PreDestroy` is preferred.

### Scope Behaviour Differences

**Singleton (default):** One instance created at startup. `@PostConstruct` runs once. `@PreDestroy` runs once on shutdown. The same object is shared by all callers.

**Prototype:** A NEW instance is created EVERY TIME someone requests the bean (via `@Autowired` or `applicationContext.getBean()`). `@PostConstruct` runs on each new instance. `@PreDestroy` is NEVER called — Spring creates prototype beans but does not track them after delivery. You are responsible for cleanup.

**Request scope:** One instance per HTTP request. Created when the request starts, destroyed when it ends. `@PreDestroy` runs at request end.

**Session scope:** One instance per HTTP session.

### ASCII Diagram

```
Bean Lifecycle (Singleton)
─────────────────────────────────────────────────────────────────────────
 [1] new MyBean()              ← constructor — NO dependencies injected yet

 [2] @Autowired injection      ← Spring sets all @Autowired fields

 [3] BeanPostProcessor.before  ← processors can modify bean (e.g., AOP wrapping)

 [4] @PostConstruct runs        ← YOUR hook — safe to use all injected fields here
                                   e.g., open DB connections, load startup cache

 [5] BeanPostProcessor.after   ← final proxy wrapping (e.g., @Transactional proxy)

 [6] ★ BEAN IS LIVE ★          ← serving requests

 [7] context.close() called    ← on shutdown / JVM exit

 [8] @PreDestroy runs           ← YOUR hook — close connections, flush queues

 [9] Bean removed from context

─────────────────────────────────────────────────────────────────────────

Bean Scopes
──────────────────────────────────────────────────────────
 Singleton  │ one instance │ @PostConstruct ✅ │ @PreDestroy ✅
 Prototype  │ new on each getBean() call │ @PostConstruct ✅ │ @PreDestroy ❌
 Request    │ one per HTTP request │ @PostConstruct ✅ │ @PreDestroy ✅ (on request end)
 Session    │ one per HTTP session │ @PostConstruct ✅ │ @PreDestroy ✅ (on session end)
──────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
@Service
public class CacheWarmupService {

    @Autowired
    private ProductRepository productRepository; // field-injected

    private List<Product> cache;

    public CacheWarmupService() {
        // WRONG: trying to use productRepository in the constructor
        // At this point, productRepository is NULL — Spring has not injected it yet
        // This will throw NullPointerException
        this.cache = productRepository.findTopSellers(); // NPE HERE
    }
}
```
> **Why this fails in production:** Field injection happens AFTER the constructor runs. Using any `@Autowired` field inside the constructor body always gives `null`. This is silent at compile time and crashes at runtime.

### Right Way — Production Quality
```java
@Service
public class CacheWarmupService {

    // Constructor injection — the dependency is available immediately in the constructor
    private final ProductRepository productRepository;
    private List<Product> hotCache;

    // With constructor injection, productRepository is guaranteed non-null here
    @Autowired
    public CacheWarmupService(ProductRepository productRepository) {
        this.productRepository = productRepository;
        // You can use productRepository here safely — it was passed in
        // But don't do expensive work in constructor either — keep it simple
    }

    // This is the right place for expensive startup work
    // All dependencies are fully injected and available
    // Spring calls this AFTER construction, BEFORE the bean goes live
    @PostConstruct
    public void warmCache() {
        log.info("Warming product cache — loading top 1000 products from DB");
        // This is safe — productRepository is fully injected and working
        this.hotCache = productRepository.findTopSellersCached(1000);
        log.info("Cache ready — loaded {} products", hotCache.size());
    }

    // Spring calls this before the container shuts down
    // Use it to release resources, flush queues, close background threads
    @PreDestroy
    public void clearCache() {
        log.info("Shutting down — clearing product cache");
        if (hotCache != null) {
            hotCache.clear(); // release memory
        }
        // If you had a background refresh thread, stop it here
    }
}
```

### Prototype Scope — When You Need a Fresh Instance
```java
// Use prototype scope when your bean holds per-request state
// Example: a builder or parser that accumulates data per call
@Component
@Scope("prototype")  // new instance every time
public class ReportBuilder {

    private final List<String> lines = new ArrayList<>();

    public void addLine(String line) {
        lines.add(line);
    }

    public String build() {
        return String.join("\n", lines);
    }

    // NOTE: @PreDestroy will NOT be called for prototype beans
    // Spring does not track prototype beans after delivering them
    // If you need cleanup, call it yourself in the calling code
}
```

```java
// CORRECT way to use a prototype bean inside a singleton
// If you @Autowired it directly, you only get ONE instance (Spring injects once at construction)
@Service
public class ReportService {

    // Injecting the ApplicationContext lets you call getBean() on demand
    private final ApplicationContext ctx;

    public ReportService(ApplicationContext ctx) {
        this.ctx = ctx;
    }

    public String generateReport(List<Order> orders) {
        // Each call creates a NEW ReportBuilder instance — correct prototype behaviour
        ReportBuilder builder = ctx.getBean(ReportBuilder.class);
        orders.forEach(o -> builder.addLine(o.toSummary()));
        return builder.build();
    }
}
```

### Configuration — Scopes
```java
// You can set scope with the @Scope annotation on the bean class
@Component
@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE) // constant is cleaner than "prototype" string
public class StatefulProcessor { ... }

// Or on a @Bean method in a @Configuration class
@Configuration
public class ScopeConfig {

    @Bean
    @Scope("request") // new instance per HTTP request — only works in a web context
    public RequestTracker requestTracker() {
        return new RequestTracker();
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the order in which @PostConstruct runs relative to the constructor and @Autowired injection?"

**Hruday's answer:**
> The order is: constructor first, then Spring injects all `@Autowired` fields and setters, then `@PostConstruct` runs.
>
> The constructor runs first because that is how Java works — the object must exist before Spring can do anything with it. At that point, if you use field injection, the `@Autowired` fields are still null.
>
> After construction, Spring's `AutowiredAnnotationBeanPostProcessor` scans the object for `@Autowired` annotations and sets all the fields. Now all your dependencies are available.
>
> Then `@PostConstruct` runs. Since all fields are injected, it is the right place to do setup work that uses those dependencies — opening connections, loading data, starting scheduled tasks.
>
> The practical lesson: never access `@Autowired` fields inside the constructor body. Use `@PostConstruct` for any startup logic.

---

### Q2 — Deep Dive
**Interviewer asks:** "You have a singleton bean with a prototype-scoped dependency. What happens? How do you fix it?"

**Hruday's answer:**
> This is a common trap. When a singleton bean declares an `@Autowired` dependency that has `@Scope("prototype")`, Spring injects the prototype bean ONCE at construction time — when the singleton is created. After that, every call to the singleton uses that same prototype instance. You never get a fresh instance.
>
> Why? Because Spring injects into singletons only once — at startup. The singleton's lifecycle is lifetime-of-app. The prototype's lifecycle is "new per request", but nobody is re-requesting it after the first injection.
>
> There are two clean fixes. First, inject `ApplicationContext` into the singleton and call `ctx.getBean(MyPrototype.class)` each time you need a fresh instance. Second, use `@Lookup` method injection — Spring overrides the annotated method with CGLIB to call `getBean()` each time you invoke it.
>
> The `@Lookup` approach is cleaner because it avoids the `ApplicationContext` dependency in your service code:
> ```java
> @Service
> public abstract class MyService {
>     @Lookup
>     protected abstract MyPrototype createProcessor(); // Spring overrides this
> }
> ```

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use a prototype bean instead of just creating the object with `new`?"

**Hruday's answer:**
> Great question. Prototype beans add overhead over plain `new` — Spring uses reflection, runs `@PostConstruct`, scans for annotations on every creation. So the value needs to justify the cost.
>
> Use prototype beans when the object needs Spring features — `@Autowired` dependencies, AOP proxying, lifecycle callbacks. A plain `new` gives you none of these. For example: a per-request security context builder that needs `@Autowired` logger and auditing service — make it prototype, not `new`.
>
> Use plain `new` (or object pooling) when the object is pure logic with no Spring dependencies — a value object, a data transfer object, a parser. No Spring features needed = no Spring overhead.
>
> The mistake to avoid: make a stateful object a singleton by accident. If two concurrent requests share one instance of a stateful object, you get race conditions. Make it prototype or use `ThreadLocal` inside the singleton.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Your Spring Boot app needs to gracefully shut down. In-flight HTTP requests are still being processed and you have a Kafka consumer running. How do you handle this?"

**Hruday's answer:**
> Graceful shutdown is a lifecycle management problem with three layers.
>
> First, the HTTP server. Spring Boot 2.3+ supports graceful shutdown natively. Set `server.shutdown=graceful` in `application.yml`. Spring stops accepting new requests immediately on shutdown and waits up to `spring.lifecycle.timeout-per-shutdown-phase` (default 30 seconds) for in-flight requests to complete.
>
> Second, the Kafka consumer. Put the consumer stop logic in a `@PreDestroy` method. Call `consumer.wakeup()` to interrupt the poll loop, then join the consumer thread. Spring calls `@PreDestroy` during context close, which happens before the JVM exits. If you use Spring Kafka's `@KafkaListener`, call `kafkaListenerEndpointRegistry.stop()` in `@PreDestroy`.
>
> Third, order matters. Spring closes beans in reverse creation order — if your Kafka consumer was created after your `OrderService`, `OrderService`'s `@PreDestroy` runs first. This is intentional — higher-level services clean up before their downstream dependencies.
>
> I would also add a health check endpoint. During shutdown, the `/actuator/health` endpoint immediately returns `OUT_OF_SERVICE`. The load balancer stops routing traffic before the shutdown sequence begins.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "@PostConstruct vs constructor for init logic" | "Both are fine — just pick one" | "Not the same. @Autowired field injection happens AFTER the constructor. Using fields in the constructor gives NPE. @PostConstruct is the correct place for init logic that uses injected dependencies." |
| "Does Spring call @PreDestroy on prototype beans?" | "Yes, at shutdown" | "No. Spring does not track prototype beans after delivering them. It creates prototype beans but never destroys them. If your prototype holds resources (connections, file handles), you must call close() yourself or implement AutoCloseable and manage it in the caller." |
| "What is default scope?" | "prototype" | "Singleton. One instance shared across the entire ApplicationContext. This is why stateful beans at the class level (non-ThreadLocal fields set during request processing) cause race conditions in multi-threaded apps." |
| "Can you change bean scope at runtime?" | "Yes with @Scope" | "No. @Scope is declared at class/method definition time, read once during BeanDefinition registration, and fixed for the lifetime of that bean class in the context. You cannot change a bean's scope after the context starts." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, our Spring Boot REST API had a `ReportGenerationService` that loaded a large dataset into memory at startup. We put the loading logic inside the constructor, which caused the app to fail to start whenever the database was slow at boot time — the loading happened before Spring's health checks ran. We moved it to `@PostConstruct` with a timeout, and if it failed we logged a warning instead of crashing. The app started healthy and degraded gracefully. That change also made the bean testable — in unit tests we could inject a mock repository and skip the `@PostConstruct` entirely."

---

## 8. Scale Evolution

**1,000 users →** Default singleton beans handle everything fine. `@PostConstruct` for startup cache, `@PreDestroy` for connection close. No scope-related issues at this scale.

**100,000 users →** Singleton beans serving stateful request data become a problem. This is when you notice bugs like a field modified in one request being visible in another. You fix by making stateful helpers prototype-scoped, using `ThreadLocal`, or making them stateless and passing all state via method parameters.

**10 million users →** Startup time matters for auto-scaling. Heavy `@PostConstruct` methods (loading 100MB of reference data per instance) slow down new instance startup and delay scale-out during traffic spikes. You fix this by: (1) moving data loading to a lazy cache that populates on first access, (2) using a shared external cache (Redis) so not every instance loads the data independently, or (3) pre-warming new instances in the background before cutting them into the load balancer rotation.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment services must shut down cleanly without losing in-flight transaction state. @PreDestroy for draining queues is critical. | Expect questions on graceful shutdown and prototype-in-singleton traps in stateful financial beans. |
| Swiggy / Meesho | Order services with background threads (delivery tracking, notification dispatch) need @PostConstruct to start threads and @PreDestroy to stop them cleanly. | "How do you start and stop a background polling thread safely in a Spring Boot service?" |
| Adobe / Microsoft | Enterprise apps with complex bean init chains. They care about init failure handling — what happens if @PostConstruct throws? | "@PostConstruct throws — what happens to the bean? The app?" (Answer: bean init fails, Spring throws BeanCreationException, app startup fails unless you handle the exception inside @PostConstruct.) |
| Remote / Global roles | Microservices deployed to Kubernetes. Kubernetes sends SIGTERM on pod termination. They want to know about the full graceful shutdown chain. | "Walk me through what happens from Kubernetes SIGTERM to your last in-flight request completing." |

---

## 10. Related Topics — What to Study Next

- **Topic 37 — IoC Container Internals** — understand how BeanDefinitions, BeanPostProcessors, and the container create the environment that the lifecycle hooks run inside
- **Topic 44 — @Transactional Internals** — `@Transactional` uses AOP proxies created during the BeanPostProcessor phase of the lifecycle — timing is critical when combining transactions with `@PostConstruct`
- **Topic 41 — Spring Boot Autoconfiguration** — autoconfigured beans also go through the same lifecycle — understanding this helps you debug why an autoconfigured bean initialises at a certain point
- **Topic 85 — Health Checks and Readiness Probes** — Kubernetes readiness probes should report NOT READY until all `@PostConstruct` methods complete — this connects bean lifecycle to deployment health
- **Topic 48 — HikariCP Connection Pooling** — HikariCP is initialised during bean construction and uses its own lifecycle callbacks — connects to this topic when DB connection fails at startup

---

*Part 3 · Bean Lifecycle · Full Stack Interview Guide · Hruday D · 2026*
