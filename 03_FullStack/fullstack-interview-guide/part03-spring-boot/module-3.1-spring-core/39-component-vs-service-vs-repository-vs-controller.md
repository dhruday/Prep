# @Component vs @Service vs @Repository vs @Controller
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- All four annotations make Spring register the class as a bean — they all extend `@Component`
- The difference is **semantic** (communicates intent) and **behavioural** (`@Repository` adds one real behaviour: exception translation)
- `@Controller` tells Spring MVC to look for `@RequestMapping` methods to handle HTTP requests
- `@Service` marks business logic — no Spring behaviour difference from `@Component`, but it serves as documentation for the architecture layer
- `@Repository` adds **persistence exception translation** — Spring wraps SQL/JPA exceptions into its own `DataAccessException` hierarchy
- Gap to bridge: understanding that `@Service` vs `@Component` is NOT a technical difference — it is an architectural communication signal

---

## 1. One-Line Definition
`@Component`, `@Service`, `@Repository`, and `@Controller` are all stereotype annotations that register a class as a Spring-managed bean — but each one signals a different architectural role and some carry additional behaviour.

---

## 2. The Problem It Solves

Early Spring required XML to declare each bean:
```xml
<bean id="orderService" class="com.myapp.service.OrderService"/>
<bean id="orderRepository" class="com.myapp.repo.OrderRepository"/>
```

This was verbose, error-prone, and hard to navigate in large codebases. Every class needed a manual entry. Moving a class meant updating XML.

Spring 2.5 introduced stereotype annotations so you could scan classes and register them automatically. But having just one `@Component` annotation on everything meant you could not tell at a glance what a class was supposed to do. Is this business logic? Data access? HTTP handling?

The four annotations solve two problems at once: automatic registration (no XML), and architecture communication (what layer this class belongs to). A developer reading a class header immediately knows its responsibility just from the annotation — before reading a single method.

---

## 3. How It Works Internally

### The Mental Model
Think of a company with four department labels on office doors: `@Component` is a generic employee badge (works everywhere), `@Service` is the Operations team badge (business logic), `@Repository` is the Data team badge (database work), and `@Controller` is the Front Desk badge (handles incoming requests). All badges let you enter the building, but each door has different rules — the Front Desk badge means your desk faces the lobby and handles walk-ins.

### The Mechanism — Step by Step

1. **Component scan triggers** — `@SpringBootApplication` includes `@ComponentScan`. Spring scans all packages for classes annotated with any stereotype annotation.

2. **Meta-annotation resolution** — Spring reads the `@Target` and meta-annotations of each stereotype. `@Service`, `@Repository`, and `@Controller` are all annotated with `@Component` themselves. Spring recognises the chain: anything with `@Component` in its annotation hierarchy is a candidate for bean registration.

3. **BeanDefinition created** — A `BeanDefinition` is registered in the context for each found class. At this point, there is no behavioural difference between `@Component`, `@Service`, and `@Repository` in terms of the BeanDefinition structure.

4. **@Repository — exception translation BeanPostProcessor** — After all beans are created, Spring checks: any beans annotated with `@Repository` get a `PersistenceExceptionTranslationInterceptor` applied. This is a real AOP interceptor that catches low-level persistence exceptions (like Hibernate's `ConstraintViolationException` or JPA's `PersistenceException`) and translates them into Spring's `DataAccessException` hierarchy. This is the ONE case where the stereotype makes a real runtime difference.

5. **@Controller — RequestMappingHandlerMapping** — On startup, `RequestMappingHandlerMapping` scans all beans looking for `@Controller` (and `@RestController`, which combines `@Controller` and `@ResponseBody`). It reads `@RequestMapping`, `@GetMapping`, etc. and builds a handler map. This map is used to route incoming HTTP requests to the right method.

6. **@Service — no extra wiring** — No special BeanPostProcessor is applied. `@Service` is a pure semantic annotation. Its value is in code readability, layer architecture enforcement (via package conventions), and Spring AOP pointcuts that target specific stereotypes.

### Why @Repository Exception Translation Matters

Without `@Repository`, a JPA exception like `HibernateException: could not delete object` bubbles up through your service layer as a raw Hibernate exception. Your service code either catches `HibernateException` (coupling service to infrastructure) or lets it propagate as an unhelpful 500 error.

With `@Repository`, Spring's interceptor catches it and wraps it into `DataIntegrityViolationException extends DataAccessException`. Now your service layer can catch `DataAccessException` — it is decoupled from the specific ORM framework.

### ASCII Diagram

```
Annotation Hierarchy
──────────────────────────────────────────────────────────
                    @Component
                   (meta-annotation)
                        |
         ┌──────────────┼──────────────────┐
         |              |                  |
     @Service      @Repository         @Controller
         |              |                  |
 (business logic)  (data access)    (HTTP handler)
 No extra wiring   Exception          Request
                   Translation        Mapping

──────────────────────────────────────────────────────────

Runtime Behaviour at Startup
──────────────────────────────────────────────────────────
@Component   → registered as bean. Nothing else.
@Service     → registered as bean. Nothing else.
@Repository  → registered as bean + PersistenceExceptionTranslationInterceptor applied
@Controller  → registered as bean + RequestMappingHandlerMapping reads it for URL routes
──────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Using @Component for everything — works, but communicates nothing
// A new dev reading this has no idea what layer this class belongs to
@Component  // Is this a controller? A service? A repository helper?
public class OrderProcessor {

    @Autowired
    private OrderRepository orderRepository;

    // No layer signals — hard to understand architecture at a glance
    public Order processOrder(OrderRequest request) {
        return orderRepository.save(new Order(request));
    }
}
```
> **Why this hurts over time:** Using `@Component` on everything loses architectural signals. Teams cannot write AOP pointcuts targeting "all service layer beans" (`@within(Service)`). Code review becomes harder — a reviewer cannot tell if business logic accidentally lives in what should be a repository class.

### Right Way — Production Quality
```java
// @Controller — handles HTTP, nothing else
// This layer ONLY knows about HTTP request/response translation
@RestController  // = @Controller + @ResponseBody — responds with JSON directly
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    // Constructor injection — the controller depends on the service, never on the repo directly
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest request) {
        // Controller responsibility: validate HTTP input, call service, translate to HTTP response
        // It does NOT know about databases, does NOT do business logic
        Order order = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(OrderResponse.from(order));
    }
}
```

```java
// @Service — business logic layer
// Owns the business rules, orchestrates repositories, handles transactions
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final NotificationService notificationService;

    public OrderService(OrderRepository orderRepository,
                        PaymentService paymentService,
                        NotificationService notificationService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
        this.notificationService = notificationService;
    }

    // Business logic lives here — not in the controller, not in the repository
    @Transactional
    public Order createOrder(OrderRequest request) {
        validateInventory(request);          // business rule
        Order order = new Order(request);
        orderRepository.save(order);         // persistence call
        paymentService.initiate(order);      // side effect
        notificationService.sendConfirmation(order); // side effect
        return order;
    }

    private void validateInventory(OrderRequest request) {
        // business validation — belongs here, not in the controller
        if (!inventoryService.isAvailable(request.getProductId(), request.getQty())) {
            throw new InsufficientInventoryException(request.getProductId());
        }
    }
}
```

```java
// @Repository — data access layer
// Only talks to the database — no business logic, no HTTP concerns
@Repository
public class OrderRepository {

    @PersistenceContext
    private EntityManager em;

    public Order save(Order order) {
        em.persist(order);
        return order;
    }

    public Optional<Order> findById(Long id) {
        return Optional.ofNullable(em.find(Order.class, id));
    }

    // If save() throws HibernateException, Spring translates it to DataAccessException
    // because @Repository is present — the caller (OrderService) gets DataAccessException,
    // not a raw Hibernate exception — decoupled from the ORM framework
}
```

### AOP Pointcut Using Stereotypes
```java
// You can write AOP rules that target specific layers using stereotype annotations
@Aspect
@Component
public class ExecutionTimeAspect {

    // This pointcut matches ALL methods in ALL classes annotated with @Service
    @Around("within(@org.springframework.stereotype.Service *)")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        long duration = System.currentTimeMillis() - start;

        log.info("[SERVICE] {}.{} → {}ms",
            joinPoint.getSignature().getDeclaringTypeName(),
            joinPoint.getSignature().getName(),
            duration);

        return result;
    }

    // Same for @Repository methods — useful for slow query detection
    @Around("within(@org.springframework.stereotype.Repository *)")
    public Object logRepositoryCall(ProceedingJoinPoint joinPoint) throws Throwable {
        // log all DB calls — useful for N+1 detection in dev
        long start = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        log.debug("[REPO] {} → {}ms", joinPoint.getSignature().getName(),
            System.currentTimeMillis() - start);
        return result;
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between @Component, @Service, and @Repository in Spring?"

**Hruday's answer:**
> All three register the class as a Spring bean — they all use `@Component` as a meta-annotation under the hood, so at the bean registration level they behave identically.
>
> The differences are semantic and practical. `@Component` is the generic label — use it when none of the more specific ones fit. `@Service` signals business logic layer — no runtime difference from `@Component`, but it tells every developer reading the code "this is where business rules live". It also lets you write AOP pointcuts that target only the service layer.
>
> `@Repository` is the one that actually adds runtime behaviour. It activates exception translation — Spring wraps raw JPA and Hibernate exceptions into its own `DataAccessException` hierarchy. This means your service layer only catches `DataAccessException`, not `HibernateException`, keeping it decoupled from the specific ORM.
>
> `@Controller` is separate — it triggers `RequestMappingHandlerMapping` to scan the bean for `@RequestMapping` methods and register them as HTTP endpoints.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is exception translation and why does @Repository enable it?"

**Hruday's answer:**
> Exception translation is the process of catching low-level persistence exceptions and replacing them with Spring's framework-neutral `DataAccessException` hierarchy.
>
> Here is the problem without it. Your repository uses Hibernate. When a unique constraint fails, Hibernate throws `ConstraintViolationException`. If your service catches this directly, it imports `org.hibernate.exception.ConstraintViolationException` — your business logic is now coupled to Hibernate. If you swap to EclipseLink or JDBC, you must rewrite every service catch block.
>
> With `@Repository`, Spring wraps the bean in a `PersistenceExceptionTranslationInterceptor`. This AOP interceptor intercepts every method call on the repository. When a `HibernateException`, `JDBCException`, or `PersistenceException` is thrown, it translates it to the right `DataAccessException` subclass — `DataIntegrityViolationException` for constraint failures, `OptimisticLockingFailureException` for version conflicts, and so on.
>
> Your service layer catches `DataAccessException` — framework-neutral, clean, stable across ORM changes.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Why not just use @Component for everything? Why does layer separation matter?"

**Hruday's answer:**
> Using `@Component` for everything works at the start but creates problems as the codebase grows.
>
> First, readable architecture. When you open a class marked `@Service`, you know: business logic lives here, transactions live here, no HTTP objects, no SQL. When it says `@Repository`, you know: only data access, no business validation. You understand the contract before reading a single method.
>
> Second, enforced separation. Teams use ArchUnit or package-level conventions to check that `@Controller` classes never import from `@Repository` classes directly. If everything is `@Component`, these architectural rules cannot be expressed.
>
> Third, AOP targeting. You cannot write a pointcut that says "log all service layer calls" if everything is `@Component`. With `@Service`, you can write `@within(Service)` and it captures exactly the right layer.
>
> The trade-off: it requires discipline. Putting business logic in a `@Controller` and calling it fine is a common mistake — the app works, but the architecture degrades. Code reviews must enforce: is this annotation accurate for what this class does?

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You are reviewing a PR where a developer put all business validation, database calls, and HTTP mapping in a single class annotated @Controller. What do you say?"

**Hruday's answer:**
> I would flag it in review and explain the separation-of-concerns issue clearly — not as a style preference, but as a maintenance risk.
>
> A controller doing database calls means: testing requires a running database. You cannot unit test the HTTP handling without the ORM layer. You cannot reuse the business logic in a Kafka consumer or a scheduled job without duplicating it.
>
> I would suggest splitting it: move the business logic (inventory check, order validation, price calculation) into a `@Service`. Move the database calls into a `@Repository`. Keep the controller thin — just HTTP request parsing, calling the service, and translating the result to a response.
>
> I would share a concrete example: when we added a Kafka-based order processor at Oracle, all the business logic was already in `OrderService` because the controller was thin. The Kafka listener just called `orderService.processOrder()`. If the logic had been in the controller, we would have had to extract and refactor under time pressure.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "@Service adds transaction management" | "Yes, @Service makes methods transactional" | "No. @Service does nothing transactional by itself. @Transactional is a separate annotation and works on any Spring bean — @Component, @Service, @Repository, anything. @Service is purely semantic." |
| "@Repository catch block" | "You need to catch JPA exceptions manually in your service" | "No. @Repository activates exception translation via AOP. JPA/Hibernate exceptions are automatically translated to DataAccessException before they reach your service. You catch DataAccessException in the service — framework-neutral." |
| "@RestController vs @Controller" | "@RestController is a newer version of @Controller" | "@RestController = @Controller + @ResponseBody. @ResponseBody tells Spring to write the return value directly to the HTTP response as JSON (via Jackson), instead of treating it as a view name. @Controller without @ResponseBody looks up a view template by the returned string name." |
| "Can a @Repository be a @Service too?" | "Yes, combine them" | "Technically a class can have both, but it is an architectural mistake. A class cannot be both data access AND business logic — pick one. If you are combining both in one class, the class has too many responsibilities." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, our code review checklist explicitly asked: 'Is the stereotype annotation correct for this class's responsibility?' We caught several cases where developers put database queries inside `@Controller` methods during deadline pressure. We extracted them into `@Repository` classes in the next sprint. The real benefit came when we wrote integration tests — controller tests could mock the service layer, service tests could mock the repository, and we could run the full test suite without a real database for 90% of test cases."

---

## 8. Scale Evolution

**1,000 users →** Layer separation is good practice but not critical at this scale. A single service where all three annotations are mixed will still serve traffic fine. Main value at this scale: code readability and testability.

**100,000 users →** Teams grow. Multiple developers work on the same codebase. Layer boundaries become enforcement rules. You add ArchUnit tests to ensure `@Controller` classes never directly import `@Repository` interfaces. If layers are not separated from the beginning, you spend a sprint refactoring instead of building features.

**10 million users →** You split the monolith into microservices. Each service has its own clean layer structure. You add a Kafka consumer service that needs to call `OrderService` directly — it works because business logic is in `@Service`, not `@Controller`. You add a batch processing job — it calls `@Service` directly too. Layer separation at this scale is the difference between a 2-hour feature addition and a 2-week refactor.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment services have strict layer boundaries for security audits. Business logic in `@Service`, data access in `@Repository`, PII data handling auditable layer by layer. | "Walk me through how a payment goes from HTTP request to database in your Spring Boot service." |
| Swiggy / Meesho | Large engineering teams with many services. Layer conventions make onboarding faster and code reviews consistent across 20+ microservices. | Likely to ask: "How do you enforce architecture rules in a Spring Boot project?" (Answer: ArchUnit + package conventions + code review checklist.) |
| Adobe / Microsoft | Enterprise projects with multiple teams contributing to a shared service. Stereotype conventions are part of the coding standard documentation. | May show a class and ask: "Which annotation is correct here and why?" Focus on justifying your answer. |
| Remote / Global roles | Open-source-style code review culture where architectural clarity is as valued as correctness. | Expect code review exercises during the interview — they will ask you to critique an existing class's design. |

---

## 10. Related Topics — What to Study Next

- **Topic 40 — Spring AOP** — AOP pointcuts use stereotype annotations to target layers (`@within(Service)` — knowing what `@Service` does is a prerequisite)
- **Topic 44 — @Transactional Internals** — `@Transactional` is separate from `@Service` but almost always lives on service-layer beans — understanding why requires this topic first
- **Topic 46 — Spring Data JPA** — Spring Data repositories use `@Repository` as their stereotype — knowing what it does explains the exception translation behaviour in JPA repositories
- **Topic 58 — Exception Handling (@ControllerAdvice)** — the other side of exception translation: what happens to `DataAccessException` after it leaves the `@Repository` layer and reaches the HTTP layer
- **Topic 36 — Dependency Injection** — constructor injection works regardless of which stereotype you use — but understanding layer separation helps you decide what a class should inject and what it should not

---

*Part 3 · @Component vs @Service vs @Repository vs @Controller · Full Stack Interview Guide · Hruday D · 2026*
