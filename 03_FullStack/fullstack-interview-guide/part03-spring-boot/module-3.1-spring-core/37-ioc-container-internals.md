# IoC Container Internals
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- IoC means the container creates your objects, wires them, and controls their lifecycle — you never call `new`
- `BeanDefinition` is Spring's recipe: it stores the class, scope, init method, destroy method, and all constructor args for each bean
- `ApplicationContext` is the real container you use — it sits on top of `BeanFactory` and adds auto-scan, events, AOP, and eager init
- `@Configuration` classes get CGLIB-proxied — so calling a `@Bean` method twice returns the same bean, not two objects
- Gap to bridge: Spring Boot auto-configures the `ApplicationContext` via `@SpringBootApplication` — you never build it manually, but you must know what it wires under the hood

---

## 1. One-Line Definition
The IoC container is the engine inside Spring that reads your class definitions, builds all objects in the right order, wires their dependencies, and manages them from startup to shutdown.

---

## 2. The Problem It Solves

Imagine you build an order service for a food delivery app. `OrderController` needs `OrderService`. `OrderService` needs `OrderRepository`, `PaymentService`, and `NotificationService`. `PaymentService` needs a `RestTemplate`, a `RetryConfig`, and a `PaymentLogger`.

Without a container, you write this:
```java
PaymentLogger logger = new PaymentLogger();
RetryConfig retry = new RetryConfig(3, 200);
RestTemplate rest = new RestTemplate();
PaymentService payment = new PaymentService(rest, retry, logger);
NotificationService notify = new NotificationService();
OrderRepository repo = new OrderRepository(dataSource);
OrderService service = new OrderService(repo, payment, notify);
OrderController controller = new OrderController(service);
```

You are now the wiring board. If `PaymentLogger` needs something new, you hunt down every place that creates it. If `OrderRepository` needs a database pool, you pass it through three layers. Tests become nightmares because you must build the full dependency tree just to unit test one class.

The IoC container solves all of this. You declare what each class needs. Spring figures out the build order and passes everything in. You stop thinking about wiring and start thinking about business logic.

---

## 3. How It Works Internally

### The Mental Model
Think of the IoC container as a smart kitchen with a recipe book. Every class you annotate with `@Component` or `@Service` is a recipe card. When the kitchen opens (app starts), it reads all recipe cards, figures out which dish needs which ingredient, and prepares everything in the right order. When someone orders (a request comes in), the dish is already ready. The kitchen manages the lifecycle — it heats things up at the start and cleans up at shutdown.

### The Mechanism — Step by Step

1. **Startup trigger** — `SpringApplication.run()` fires. Spring Boot creates an `AnnotationConfigServletWebServerApplicationContext` (a subtype of `ApplicationContext`).

2. **Component scan** — `@SpringBootApplication` includes `@ComponentScan`. Spring scans all packages under your main class for classes annotated with `@Component`, `@Service`, `@Repository`, `@Controller`, or `@Configuration`.

3. **BeanDefinition registration** — For every class it finds, Spring creates a `BeanDefinition` object. This object holds: the class to instantiate, the scope (`singleton` by default), whether it is lazy, the init method name, the destroy method name, and any constructor arguments or property values.

4. **BeanDefinitionRegistry** — All `BeanDefinition` objects go into a registry inside `DefaultListableBeanFactory`, which is the actual bean store Spring Boot uses.

5. **BeanPostProcessor wiring** — Spring registers special processors before any beans are created. The most important is `AutowiredAnnotationBeanPostProcessor`. It handles all `@Autowired` and `@Value` injection. Another key one is `InitDestroyAnnotationBeanPostProcessor`, which handles `@PostConstruct` and `@PreDestroy`.

6. **Singleton pre-instantiation** — Spring calls `preInstantiateSingletons()`. Every non-lazy singleton bean is created now. Construction order follows the dependency graph — Spring resolves it automatically.

7. **Dependency injection** — After constructing each bean, `AutowiredAnnotationBeanPostProcessor` scans its fields and methods and injects the right dependencies.

8. **Init callbacks** — `@PostConstruct` methods run. Then any `InitializingBean.afterPropertiesSet()` implementations run.

9. **Application is ready** — `ApplicationContext` publishes a `ContextRefreshedEvent`. Your app is now serving requests.

10. **Shutdown** — On JVM shutdown, `@PreDestroy` methods run. Then any `DisposableBean.destroy()` implementations run.

### The CGLIB Proxy Detail
When you annotate a class with `@Configuration`, Spring creates a CGLIB subclass (a bytecode-generated child class) at runtime. Every `@Bean` method in that class gets intercepted. If one `@Bean` method calls another `@Bean` method inside the same `@Configuration` class, the CGLIB proxy intercepts the call and returns the already-registered singleton from the container. This prevents Spring from creating two instances of the same bean.

If you use `@Configuration(proxyBeanMethods = false)`, Spring skips CGLIB. Each `@Bean` method is a plain factory method. Calling it twice creates two objects. Use this only when your `@Bean` methods never call each other.

### ASCII Diagram

```
SpringApplication.run()
         |
         v
 AnnotationConfigApplicationContext
         |
         v
 [1] ComponentScan
     → reads @Component, @Service, @Repository, @Controller, @Configuration
         |
         v
 [2] BeanDefinition Registry
     ┌────────────────────────────────┐
     │ "orderService"  → BeanDef{...} │
     │ "paymentService"→ BeanDef{...} │
     │ "orderRepo"     → BeanDef{...} │
     └────────────────────────────────┘
         |
         v
 [3] BeanPostProcessor Registration
     → AutowiredAnnotationBeanPostProcessor
     → InitDestroyAnnotationBeanPostProcessor
         |
         v
 [4] preInstantiateSingletons()
     → construct OrderRepository
     → construct PaymentService (needs OrderRepository → inject it)
     → construct OrderService   (needs PaymentService → inject it)
         |
         v
 [5] @PostConstruct callbacks
     → OrderService.init()
         |
         v
 [6] App READY — serving requests
         |
         v (on shutdown)
 [7] @PreDestroy callbacks
     → OrderService.cleanup()
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Creating beans manually in code — bypasses the container entirely
@RestController
public class OrderController {

    private final OrderService orderService;

    public OrderController() {
        // DO NOT DO THIS
        // You are bypassing Spring entirely.
        // Each controller instance creates its own OrderService.
        // No singleton guarantee. No proxy. No transaction management.
        // You also cannot mock this in tests.
        this.orderService = new OrderService(new OrderRepository(), new PaymentService());
    }
}
```
> **Why this fails in production:** You lose all Spring features — no DI, no `@Transactional`, no lifecycle callbacks. Every controller instance creates a new service instance, which creates new DB connections. Your connection pool explodes under load.

### Right Way — Production Quality
```java
// Configuration class — the explicit bean declaration style
@Configuration
public class AppConfig {

    // @Bean tells Spring: "I am managing this object, call this factory method to create it"
    // Spring calls this method once for singletons, stores the result, and injects it everywhere
    @Bean
    public RestTemplate restTemplate() {
        RestTemplate template = new RestTemplate();
        // Set a read timeout — always do this in production
        // A missing timeout lets a slow downstream service hang your thread pool forever
        template.setRequestFactory(clientHttpRequestFactory());
        return template;
    }

    @Bean
    public ClientHttpRequestFactory clientHttpRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);   // 3 seconds to connect
        factory.setReadTimeout(10000);     // 10 seconds to read response
        return factory;
    }
}
```

```java
// Component-style — the annotation-driven registration approach
// Spring discovers this class during component scan and registers it as a bean
@Service  // same as @Component but signals "business logic layer"
public class OrderService {

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;

    // Constructor injection — the recommended way
    // Why: the object cannot be created without its dependencies (fail fast)
    // Why: easy to mock in unit tests — just pass in mocks via constructor
    // Why: works well with final fields — immutable and thread-safe
    @Autowired  // optional when there is exactly one constructor — Spring injects automatically
    public OrderService(OrderRepository orderRepository, PaymentService paymentService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
    }

    // Spring calls this after the object is fully constructed and all dependencies are injected
    // Use it for: opening DB connections, loading config from DB, warming caches
    @PostConstruct
    public void init() {
        log.info("OrderService ready — validating payment gateway connection");
        paymentService.healthCheck(); // verify connectivity at startup, not at first request
    }

    // Spring calls this before the bean is destroyed (JVM shutdown or context close)
    // Use it for: closing connections, flushing buffers, releasing file handles
    @PreDestroy
    public void cleanup() {
        log.info("OrderService shutting down — draining in-flight requests");
    }
}
```

### Configuration (Bean Scope)
```yaml
# application.yml — controlling scope via profiles
spring:
  main:
    # lazy-initialization: true delays all bean creation until first use
    # Good for: faster startup in dev
    # Bad for: production — you want to catch wiring errors at startup, not at 2am
    lazy-initialization: false

# You can set scope on individual beans with @Scope annotation:
# @Scope("singleton")  — one instance shared by the entire application (default)
# @Scope("prototype")  — new instance every time someone requests it from the container
# @Scope("request")    — new instance per HTTP request (web apps only)
# @Scope("session")    — new instance per HTTP session (web apps only)
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is IoC and how does Spring's container work at a high level?"

**Hruday's answer:**
> IoC stands for Inversion of Control. Normally, your code creates its own dependencies — you call `new PaymentService()` inside `OrderService`. With IoC, you flip that. You declare what you need, and the container figures out how to build and deliver it.
>
> In Spring, the container is the `ApplicationContext`. At startup, it scans your classes for annotations like `@Service`, `@Component`, `@Repository`. For each class it finds, it creates a `BeanDefinition` — a recipe that describes how to build that object. Then it instantiates all singletons, resolves their dependencies, injects them, and calls any `@PostConstruct` methods.
>
> After that, your app is ready. When a request comes in, Spring serves the already-built, already-wired beans. On shutdown, it calls `@PreDestroy` methods so you can clean up resources.
>
> At Oracle, I used this daily — every service, repository, and controller in our Spring Boot REST API was managed by the container. I never thought about object creation, only about what each class needed.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain BeanDefinition. What does it contain and when is it used?"

**Hruday's answer:**
> A `BeanDefinition` is Spring's internal recipe for a single bean. It is not the bean itself — it is the instructions for how to create the bean.
>
> It stores: the class to instantiate (`beanClassName`), the scope (singleton, prototype, request), whether initialization is lazy (`lazyInit`), the name of an init method, the name of a destroy method, any constructor argument values, and property values to inject after construction.
>
> Spring creates `BeanDefinition` objects during the scanning phase — before any beans are actually instantiated. All of them go into a `BeanDefinitionRegistry` inside `DefaultListableBeanFactory`.
>
> During the instantiation phase, Spring reads each `BeanDefinition`, builds the object using reflection, injects dependencies, and calls init methods.
>
> Why does this matter? Because you can programmatically register your own `BeanDefinition` at runtime using `GenericBeanDefinition`. This is how Spring Boot's autoconfiguration works under the hood — it registers `BeanDefinition` objects conditionally based on what is on the classpath.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you NOT use Spring's IoC container?"

**Hruday's answer:**
> The container adds overhead — startup time, classpath scanning, proxy generation, reflection. For most server applications this is invisible. But there are cases where it hurts.
>
> First: tiny utilities or CLI tools that run and exit fast. A Spring Boot startup takes 2-4 seconds minimum. A command-line tool that runs in 200ms does not need that.
>
> Second: performance-critical hot-path code. Prototype-scoped beans create a new object per request to the container. If you call `applicationContext.getBean()` inside a hot loop, you pay reflection and proxy costs on every call. Pre-create and cache.
>
> Third: serverless functions with extreme cold-start requirements. AWS Lambda running a Spring application has cold starts of 1-2 seconds. Alternatives like Quarkus or Micronaut use build-time DI, which avoids runtime reflection and cuts cold starts to under 100ms.
>
> The right answer is: Spring's container is excellent for long-running services. For fast-start or ultra-lightweight runtimes, evaluate Quarkus or Micronaut.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "A senior engineer on your team wrote a @Configuration class where one @Bean method calls another @Bean method to share a dependency. Another engineer changed @Configuration to @Configuration(proxyBeanMethods=false). Production got two instances of a service that should have been a singleton. How do you debug this?"

**Hruday's answer:**
> This is a classic CGLIB proxy removal bug. Here is how I would debug it.
>
> First, I would add `applicationContext.getBeanDefinitionNames()` to print all registered beans at startup. I would check the scope of the suspect bean — if it is singleton but showing multiple instances, CGLIB is the issue.
>
> With `proxyBeanMethods=true` (the default), Spring wraps the `@Configuration` class in a CGLIB proxy. When `@Bean methodA()` calls `@Bean methodB()` inside the same config class, the proxy intercepts and returns the existing singleton.
>
> With `proxyBeanMethods=false`, there is no proxy. Calling `methodB()` directly just runs normal Java code — it calls the method again and creates a new instance.
>
> The fix: revert to `proxyBeanMethods=true`, OR refactor so that the shared bean is injected via a constructor parameter into the `@Configuration` class itself and passed to both `@Bean` methods — which then do not call each other.
>
> Going forward, I would add a lint rule: `proxyBeanMethods=false` only goes in `@Configuration` classes where no `@Bean` method calls another `@Bean` method.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "ApplicationContext vs BeanFactory?" | "ApplicationContext adds more features" | "BeanFactory is the core: lazy init, no events. ApplicationContext adds eager singleton init, AOP proxy creation, publishing ApplicationEvents, MessageSource for i18n, and ResourceLoader. In practice, always use ApplicationContext — you almost never touch BeanFactory directly." |
| "How does @Autowired work?" | "Spring injects the matching bean" | "At startup, `AutowiredAnnotationBeanPostProcessor` scans `@Autowired` fields and methods. It resolves by type first. If there are multiple candidates, it falls back to the field/parameter name as the bean name. If still ambiguous, throw `NoUniqueBeanDefinitionException`. You fix it with `@Qualifier`." |
| "@Configuration vs @Component for config?" | "Both work the same" | "@Component-annotated config classes do NOT get CGLIB proxied (proxyBeanMethods=false behaviour). @Bean methods calling each other will create new instances each time. @Configuration gets full CGLIB proxy. For config classes with inter-bean dependencies, always use @Configuration." |
| "Prototype scope in a Singleton bean?" | "It creates new instances per call" | "No. A singleton bean's dependencies are injected once at construction. If a singleton has a prototype-scoped dependency, it gets the SAME prototype instance forever, defeating the point. Fix: inject `ApplicationContext` and call `getBean()` each time, or use `@Lookup` method injection." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, every service in our Spring Boot-based API was container-managed. We had a case where a shared `AuditService` bean was being created multiple times — we saw duplicate audit logs in production. The root cause was a `@Configuration` class that someone converted to `@Component`. Once we put `@Configuration` back, the CGLIB proxy kicked in and the duplicate creation stopped. That day I actually dug into how CGLIB proxying worked, and it changed how I approach Spring config classes."

---

## 8. Scale Evolution

**1,000 users →** Single `ApplicationContext` with singleton beans handles everything. Startup takes 2-3 seconds, acceptable. No issues.

**100,000 users →** You start caring about startup time. Slow bean init (e.g., a bean that loads 10MB of reference data in `@PostConstruct`) delays readiness. You fix it: either move heavy loading to a background thread, or use lazy init for non-critical beans. You also profile bean count — 500+ beans are normal for large Spring Boot apps, but if someone added prototype beans in a hot path, fix them.

**10 million users →** You run tens of instances behind a load balancer. JVM startup time matters for auto-scaling speed. Cold instances spin up to serve traffic — slow startup = slow scale-out. At this scale, teams switch to GraalVM native images or Quarkus. GraalVM does AOT (ahead-of-time) compilation — it builds the dependency graph at build time, not runtime, cutting startup from 3 seconds to 50ms. The trade-off: reduced runtime flexibility (reflection must be pre-declared).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment services are Spring Boot heavy. They care about startup time (multiple services restart on deploy), transaction management, and correct singleton behaviour in financial calculations. | Expect deep questions on `@Configuration` proxying and `@Transactional` interaction with the container. |
| Swiggy / Meesho | High-scale microservices. They care about bean lifecycle management, graceful shutdown (`@PreDestroy`), and correct prototype-in-singleton traps when building stateful sessions. | Likely to ask: "how do you ensure clean shutdown of a service that has in-flight orders?" |
| Adobe / Microsoft | Enterprise Spring Boot applications with complex configuration hierarchies. They care about `@Import`, conditional beans (`@ConditionalOnProperty`), and modular config. | Expect questions on Spring autoconfiguration mechanics — how does `@ConditionalOnMissingBean` work? |
| Remote / Global roles | Often using Spring Boot for REST services behind API gateways. They care about correctness, not just knowledge. | Will give a buggy config class in a code review exercise and ask you to find the issue. |

---

## 10. Related Topics — What to Study Next

- **Topic 38 — Bean Lifecycle (@PostConstruct, @PreDestroy, scopes)** — the natural next step: now that you know how beans are created, learn what happens at each lifecycle phase and how to hook into it
- **Topic 36 — Dependency Injection (Constructor vs Field vs Setter)** — goes hand-in-hand with how the container resolves and injects dependencies
- **Topic 41 — Spring Boot Autoconfiguration** — autoconfiguration registers `BeanDefinition` objects conditionally using `@ConditionalOnMissingBean` and `@ConditionalOnProperty` — built on top of the mechanism you just learned
- **Topic 44 — @Transactional Internals** — Spring creates AOP proxies for `@Transactional` beans — understanding the container's proxy mechanism here is essential
- **Topic 40 — Spring AOP** — AOP uses the same container proxy infrastructure; understanding IoC makes AOP proxy creation much clearer

---

*Part 3 · IoC Container Internals · Full Stack Interview Guide · Hruday D · 2026*
