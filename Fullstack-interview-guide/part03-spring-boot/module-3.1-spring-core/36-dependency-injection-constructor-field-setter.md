# Dependency Injection — Constructor vs Field vs Setter
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Dependency Injection (DI)**: instead of a class creating its own dependencies (`new Service()`), Spring creates them and injects them in. The class declares WHAT it needs; Spring provides it.
- **Three injection styles:** Constructor injection (preferred), Field injection (`@Autowired` on field — avoid), Setter injection (optional dependencies).
- **Constructor injection is the best practice**: dependencies are declared as final, guaranteed non-null at object creation, easy to test without Spring, clear contract of required collaborators.
- **Field injection `@Autowired` is an anti-pattern**: requires Spring to use reflection, fields can't be `final`, makes unit testing hard (can't inject mocks without Spring context or `ReflectionTestUtils`), hides dependencies.
- **Spring Boot 4.x / Spring 6**: `@Autowired` is optional on single-constructor classes — just declare the constructor. Spring auto-detects it.
- **`@Qualifier`** resolves ambiguity when multiple beans of the same type exist. **`@Primary`** marks one bean as the default. **`@Lazy`** defers creation.

---

## 1. One-Line Definition
Dependency Injection is a design pattern where a class receives its dependencies from an external source (the Spring IoC container) rather than creating them itself — decoupling object creation from object usage.

---

## 2. The Problem It Solves

Without DI: a class that needs a database connection creates one itself.
```java
public class OrderService {
    private final OrderRepository repo = new OrderRepositoryImpl(
        new DataSource("jdbc:mysql://localhost/db", "root", "secret"));
}
```
Problems: tight coupling (changing DB = changes in OrderService), untestable (can't swap with a mock), configuration leaked into business code.

With DI: the class declares what it needs; something else provides it.
```java
public class OrderService {
    private final OrderRepository repo;   // declared, not created
    public OrderService(OrderRepository repo) { this.repo = repo; }
}
```
Now OrderService doesn't know or care how `OrderRepository` is implemented. In tests, inject a mock. In production, inject the real JPA implementation. In staging, inject a stub. Zero changes to `OrderService`.

DI also centralises configuration — all wiring is in one place (Spring's context, `@Configuration` classes, or component scanning), not scattered across business classes.

---

## 3. How It Works Internally

### The Mental Model
Think of a car factory that assembles cars from parts. The engine department doesn't build its own tyres — it tells the factory "I need 4 tyres of this spec." The factory provides them. Each department states its dependencies; the factory wires them together. Spring is the factory. Your beans are the departments.

### The Three Injection Styles

```
1. CONSTRUCTOR INJECTION (Recommended):

   @Service
   public class OrderService {
       private final OrderRepository repo;
       private final PaymentGateway gateway;

       public OrderService(OrderRepository repo, PaymentGateway gateway) {
           this.repo = repo;
           this.gateway = gateway;
       }
   }

   Spring sees: one constructor with two params → resolves beans for each param → calls constructor.

   WHY IT'S BEST:
   - Fields can be final → compile-time guarantee against null
   - No Spring needed in unit tests: new OrderService(mockRepo, mockGateway)
   - Dependencies visible in the constructor signature (explicit contract)
   - Circular dependency detection at startup (Spring throws, not at runtime)

2. FIELD INJECTION (@Autowired on field — Anti-pattern):

   @Service
   public class OrderService {
       @Autowired private OrderRepository repo;   // Spring uses reflection to set this
       @Autowired private PaymentGateway gateway;
   }

   WHY IT'S BAD:
   - Fields can't be final → could be reassigned or null
   - Unit test: new OrderService() leaves fields null → NPE unless you use Spring or ReflectionTestUtils
   - Dependencies hidden — you can't see from the class signature what it needs
   - Harder to detect circular deps at test time

3. SETTER INJECTION (for optional dependencies):

   @Service
   public class OrderService {
       private NotificationService notifications;

       @Autowired(required = false)        // optional — OK if no bean found
       public void setNotifications(NotificationService notifications) {
           this.notifications = notifications;
       }
   }

   WHEN TO USE: Only for optional dependencies that may or may not be present.
   NOT for required dependencies — constructor injection is clearer for those.
```

**How Spring resolves the injection:**
```
When Spring creates a bean:
1. Find all constructors (or use no-arg default).
2. If only one constructor: use it (no @Autowired needed in Spring 5+).
3. For each parameter: look up a bean of that type in the ApplicationContext.
   3a. Exactly one match → inject it.
   3b. Multiple matches of same type → check @Qualifier or @Primary.
   3c. No match → BeanCreationException at startup.
4. Instantiate the bean with the resolved dependencies.
5. Register the bean in the ApplicationContext by its class/interface type.
```

### @Autowired Resolution Order

```
Spring resolves ambiguity in this exact order:
1. Type match (most common: one bean of that type → inject)
2. @Primary on one of the candidates → inject that one
3. @Qualifier("specificBeanName") on injection point → inject by name
4. Variable/parameter name matching the bean name (last resort)
5. BeanCreationException if still ambiguous

Example:
  interface MessageSender { void send(String msg); }
  @Service("emailSender") class EmailSender implements MessageSender {}
  @Primary @Service("smsSender") class SmsSender implements MessageSender {}

  @Autowired MessageSender sender;  → SmsSender (due to @Primary)
  @Autowired @Qualifier("emailSender") MessageSender sender;  → EmailSender
```

### ASCII Diagram

```
DI CONTAINER — BEAN WIRING:

  ApplicationContext (Spring IoC Container)
  ─────────────────────────────────────────────────────────────
  Component Scan finds:
    @Service OrderService          @Repository OrderRepositoryImpl
    @Service PaymentGateway        @Service NotificationService

  Wiring:
    OrderService requires: OrderRepository, PaymentGateway (in constructor)
    → finds OrderRepositoryImpl (implements OrderRepository) → injects
    → finds PaymentGateway                                  → injects

    new OrderService(orderRepositoryImpl, paymentGateway)

  Result: fully-wired OrderService object in the context.
  Client code: @Autowired OrderService → gets fully-wired singleton.

CONSTRUCTOR vs FIELD INJECTION:

  Constructor:                          Field (@Autowired):
  ─────────────────────────────────    ──────────────────────────────
  final OrderRepository repo     ←──  OrderRepository repo (not final)
  Set at construction time              Set by Spring after construction
  Unit test: direct constructor call    Unit test: needs Spring or reflection
  Circular dep: caught at startup       Circular dep: may work (proxy), confusing
  Fields guaranteed non-null            Fields could theoretically be null
```

---

## 4. The Code

### Wrong Way — Field Injection Anti-Pattern
```java
// WRONG: Field injection everywhere
@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;    // not final, hidden dependency

    @Autowired
    private PaymentGateway paymentGateway;      // not final, hidden dependency

    @Autowired
    private NotificationService notifications;  // required? optional? unclear

    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(request.toOrder());
        paymentGateway.charge(order);
        notifications.sendConfirmation(order);   // NPE if notifications wasn't injected
        return order;
    }
}

// Unit test problem:
@Test
void testCreateOrder() {
    OrderService service = new OrderService();   // all fields are null!
    // service.createOrder(request);  → NullPointerException
    // To fix: either use Spring test context (slow) or ReflectionTestUtils (ugly)
}
```

### Right Way — Constructor Injection
```java
// CORRECT: Constructor injection — the Spring Boot 3 standard
@Service
public class OrderService {
    private final OrderRepository   orderRepository;    // final — immutable reference
    private final PaymentGateway    paymentGateway;     // final
    private final NotificationService notifications;    // final

    // Spring auto-detects single constructor → no @Autowired needed (Spring 5+)
    public OrderService(OrderRepository orderRepository,
                        PaymentGateway paymentGateway,
                        NotificationService notifications) {
        this.orderRepository   = Objects.requireNonNull(orderRepository);
        this.paymentGateway    = Objects.requireNonNull(paymentGateway);
        this.notifications     = Objects.requireNonNull(notifications);
    }

    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(request.toOrder());
        paymentGateway.charge(order);
        notifications.sendConfirmation(order);
        return order;
    }
}

// Unit test — no Spring context needed, fast test:
@Test
void testCreateOrder() {
    OrderRepository mockRepo    = mock(OrderRepository.class);
    PaymentGateway mockGateway  = mock(PaymentGateway.class);
    NotificationService mockNotif = mock(NotificationService.class);

    OrderService service = new OrderService(mockRepo, mockGateway, mockNotif);
    // test runs without Spring context — pure Java, fast
}

// With Lombok @RequiredArgsConstructor — even less boilerplate:
@Service
@RequiredArgsConstructor    // generates constructor for all final fields
public class OrderService {
    private final OrderRepository   orderRepository;
    private final PaymentGateway    paymentGateway;
    private final NotificationService notifications;
    // constructor auto-generated — Spring detects it automatically
}

// Handling multiple beans of same type with @Qualifier:
@Configuration
public class NotificationConfig {
    @Bean("emailSender")
    public MessageSender emailSender(SmtpClient smtp) {
        return new EmailMessageSender(smtp);
    }

    @Bean("smsSender")
    @Primary    // default when only type is specified
    public MessageSender smsSender(TwilioClient twilio) {
        return new SmsMessageSender(twilio);
    }
}

@Service
public class AlertService {
    private final MessageSender defaultSender;     // gets @Primary (smsSender)
    private final MessageSender emailSender;       // gets emailSender by @Qualifier

    public AlertService(
            MessageSender defaultSender,                        // @Primary injected
            @Qualifier("emailSender") MessageSender emailSender) {
        this.defaultSender = defaultSender;
        this.emailSender   = emailSender;
    }
}

// Optional dependency with non-mandatory injection:
@Service
public class MetricsService {
    private final MandatoryRepo repo;
    private final Optional<ElasticSearchClient> esClient;   // optional via Optional<T>

    public MetricsService(MandatoryRepo repo,
                          Optional<ElasticSearchClient> esClient) {
        this.repo     = repo;
        this.esClient = esClient;   // empty Optional if no ElasticSearchClient bean
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are the three ways to inject dependencies in Spring and which do you prefer?"

**Hruday's answer:**
> The three styles are constructor injection, field injection (`@Autowired` on the field), and setter injection.
>
> I always use **constructor injection** and recommend it as the default. The three reasons:
>
> First, **testability**: with constructor injection, I can create the class directly with `new ServiceClass(mockDep1, mockDep2)` in a unit test. No Spring context, no reflection hacks. Tests are fast — milliseconds instead of seconds.
>
> Second, **immutability**: constructor-injected fields can be `final`. The dependency cannot be null at construction time (Spring would fail with an exception at startup). Field-injected fields can't be final, and they're null until Spring injects them.
>
> Third, **explicitness**: the constructor signature is the class's contract — it says "I need these to work." Field injection hides dependencies. You can't tell from the class signature what it needs — you have to scan all fields for `@Autowired` annotations.
>
> I use setter injection only for genuinely optional dependencies that may or may not exist in the context. In practice, that's rare — I prefer `Optional<T>` injection for optional dependencies in the constructor.
>
> Field injection is a JetBrains IntelliJ warning out of the box for a reason — it's considered anti-pattern in production Spring code.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does Spring resolve ambiguity when there are two beans of the same type?"

**Hruday's answer:**
> Spring resolves type-matching ambiguity in a specific order:
>
> 1. **@Primary**: if one of the beans is annotated `@Primary`, Spring injects that one when no qualifier is specified. This is the "default" marker for multi-bean scenarios.
>
> 2. **@Qualifier("beanName")**: at the injection point, you specify exactly which bean by name. `@Qualifier("emailSender")` tells Spring to inject the bean named "emailSender" regardless of `@Primary`.
>
> 3. **Parameter/field name matching**: if neither qualifier nor primary resolves it, Spring tries to match the parameter name to a bean name. If the injected parameter is named `emailSender`, it tries to find a bean with that exact name. This is fragile — names can change during refactoring. I don't rely on this.
>
> 4. **NoUniqueBeanDefinitionException**: if none of the above resolves the ambiguity, Spring throws this exception at startup.
>
> In practice for my code: `@Primary` for the most common implementation (e.g., production SMS sender is primary), `@Qualifier` in the rare places that need the non-default bean (e.g., the email audit log service always needs the email sender). This is clear and explicit.

---

### Q3 — Circular Dependency
**Interviewer asks:** "What is a circular dependency in Spring and how is it caught?"

**Hruday's answer:**
> Circular dependency: Bean A depends on Bean B in its constructor, and Bean B depends on Bean A in its constructor. Spring can't create A (needs B) and can't create B (needs A). Deadlock.
>
> With constructor injection: Spring throws `BeanCurrentlyInCreationException` at **startup**. You see the error immediately, before any request is served. The cycle is clearly reported.
>
> With field injection: Spring historically used to resolve this silently by injecting a proxy. This was Spring's workaround for circular dependencies — but it masked a design problem. Spring Boot 2.6+ disabled this by default (`spring.main.allow-circular-references=false`). Now field-injection circular deps also fail at startup.
>
> The real fix is not a configuration flag — it's a design fix. Circular dependency means the two classes have a design coupling that needs to be broken. Options:
> - Move the shared functionality to a third class that both depend on.
> - Use an event (`ApplicationEvent`) to decouple the two: A publishes an event, B handles it, without A knowing about B at all.
> - `@Lazy` on one of the injections — defers creation until first use, breaks the creation cycle. Use sparingly; it defers the error discovery.
>
> In code review, I treat circular dependencies as a smell that signals a design problem, not a Spring config issue.

---

### Q4 — Practical Scenario
**Interviewer asks:** "You have a service that's very heavy to create (cache warm-up on startup). You only want it created if it's actually used. How do you handle this in Spring DI?"

**Hruday's answer:**
> Two options depending on the scenario:
>
> **Option 1: `@Lazy`**: annotate the injection point. Spring creates the bean proxy at startup but the REAL bean is only instantiated when the first actual method is called.
> ```java
> @Service
> public class DashboardController {
>     private final HeavyAnalyticsService analytics;
>     public DashboardController(@Lazy HeavyAnalyticsService analytics) {
>         this.analytics = analytics;  // just a CGLIB proxy — no real init yet
>     }
> }
> // HeavyAnalyticsService is only instantiated when analytics.someMethod() is first called.
> ```
>
> **Option 2: `@ConditionalOnProperty`**: a better approach when the service should only exist in certain environments.
> ```java
> @Service
> @ConditionalOnProperty(name = "analytics.enabled", havingValue = "true")
> public class HeavyAnalyticsService { ... }
> // Bean doesn't exist at all when analytics.enabled=false.
> // The injection point uses Optional<HeavyAnalyticsService> to handle absence.
> ```
>
> For most production cases, I'd use `@ConditionalOnProperty` or a feature flag approach. `@Lazy` is useful for dev environments or when the service is legitimately optional at runtime, not just configuration-dependent. The difference: `@Lazy` delays creation; `@ConditionalOnProperty` conditionally skips creation.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "@Autowired is the standard" | "I use @Autowired on all my fields." | "@Autowired on fields is an anti-pattern for production Spring. Constructor injection is the standard since Spring 4+. IntelliJ even warns about field injection by default." |
| "Spring handles circular deps" | "Spring can handle circular dependencies automatically." | "Spring Boot 2.6+ disabled the circular reference workaround by default. Circular deps with constructor injection = startup failure. That's the design: catch it at startup, not runtime." |
| "@Qualifier is optional" | "Spring just figures out which bean to use." | "If two beans exist for the same type and neither is @Primary, Spring throws NoUniqueBeanDefinitionException. Ambiguity is a startup error. Resolve it with @Primary or @Qualifier — don't leave it implicit." |
| "DI = Spring annotation magic" | "DI is the @Autowired annotation." | "DI is a design principle: dependencies come in, not created internally. Spring implements DI. But the principle predates Spring. Constructor injection works even without Spring — you can manually wire it in tests." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, inheriting a Spring Boot service from a previous developer, I found 40 services all using `@Autowired` field injection. Unit tests didn't exist — every test spun up a full Spring context (slow) because nobody could instantiate the services without Spring. A full test run took 8 minutes.
>
> I refactored 40 services to constructor injection over one sprint. Added `@RequiredArgsConstructor` from Lombok — 40 service files, each reduced by 10-15 lines. Then rewrote unit tests using plain `new ServiceName(mock())` — no Spring context. Full test run dropped from 8 minutes to 45 seconds.
>
> The second benefit: during the refactor, we discovered 3 circular dependencies that Spring had been silently proxying. They manifested as intermittent issues in production — services that were sometimes partially initialised. Constructor injection made the cycles visible at compile time. We redesigned those relationships, and two production issues disappeared.
>
> The lesson: constructor injection isn't corporate style pedantry. It's the difference between unit tests that run in milliseconds and tests that need Spring, and between catching design flaws at startup vs. in production."

---

## 8. Scale Evolution

**Junior engineer →** Uses `@Autowired` on all fields. Doesn't know about circular dependencies or why constructor injection is preferred.

**Mid-level engineer →** Uses constructor injection. Knows`@Qualifier` and `@Primary`. Tests with a Spring `@SpringBootTest` context.

**Senior engineer →** Constructor injection as default, `@Lazy` and `@Conditional` for advanced scenarios. Tests with plain `new Service(mocks)` — no Spring context. Catches circular dependencies in design review.

**Staff engineer →** Designs DI-friendly architectures: clear dependency graphs, no circular deps, well-defined module boundaries. Uses `@Configuration` classes to make wiring explicit and reviewable. Avoids component scan for infrastructure beans — explicit `@Bean` methods make dependencies auditable.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | High-scale services — avoiding @Autowired field injection directly improves test speed and code quality | "You refactored field injection to constructor injection and test run time dropped 90%. Real impact." |
| Swiggy / Meesho | Spring microservices — dependency management across many services | "You explained @Primary vs @Qualifier disambiguation. Shows you've dealt with multi-bean scenarios." |
| Adobe / SAP | Enterprise Spring codebases with hundreds of services — DI best practices matter at scale | "You diagnosed and fixed circular dependencies that manifested as production issues." |
| Google / Amazon | Spring Boot depth interview — DI is a canonical question in Java system design rounds | "Explain how Spring resolves an @Autowired injection point when three beans implement the same interface." |

---

## 10. Related Topics — What to Study Next

- **IoC Container Internals (Topic 37)** — Next topic. How Spring's ApplicationContext discovers, creates, and wires beans.
- **Bean Lifecycle (Topic 38)** — When beans are created, when `@PostConstruct` runs, scopes (singleton vs prototype).
- **Spring AOP (Topic 40)** — Proxy-based behavior added to beans by Spring — how `@Transactional` and `@Async` work at the DI level.

---

*Part 3 · Dependency Injection — Constructor vs Field vs Setter · Full Stack Interview Guide · Hruday D · 2026*
