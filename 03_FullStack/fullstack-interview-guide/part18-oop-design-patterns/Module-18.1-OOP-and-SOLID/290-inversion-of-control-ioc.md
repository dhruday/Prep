# Inversion of Control (IoC)
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **IoC definition**: your code does NOT call the framework; the framework calls your code; control of execution flow is INVERTED from the application to the container
- **The Hollywood Principle**: "Don't call us — we'll call you"; you write a `@RestController` with a handler method; you never call that method directly; Spring MVC calls it when an HTTP request arrives
- **DI is one form of IoC**: when Spring resolves your constructor and injects beans, Spring controls the creation of your objects — you don't call `new`; DI is the most common IoC mechanism in Spring
- **Other IoC forms**: event listeners (`@EventListener`, `@KafkaListener`), template pattern (base class defines algorithm structure and calls your hook methods), lifecycle callbacks (`@PostConstruct`, `@PreDestroy`), reactive subscriptions (`Flux.subscribe` — the publisher calls your lambda when data is ready)
- **IoC Container = ApplicationContext**: Spring's `ApplicationContext` IS the IoC container — it owns the object lifecycle, creates beans, injects deps, fires lifecycle callbacks, and destroys beans on shutdown
- **Why IoC matters for architecture**: framework code is reusable exactly because it calls application-specific code via abstractions; your `PaymentGateway` implementation is "plugged in" to the framework; the framework doesn't need to know your payment provider exists at compile time

---

## 1. One-Line Definition
Inversion of Control is the design principle where a framework or container manages the execution flow and calls into your application code at the appropriate times, instead of your application code calling the framework for every operation.

---

## 2. The Problem It Solves

**Without IoC (procedural, control in your code):**

```java
// Your code controls everything
public static void main(String[] args) {
    DataSource ds = new HikariDataSource(...);
    OrderRepository repo = new JpaOrderRepository(ds);
    OrderService service = new OrderService(repo);
    
    HttpServer server = new SimpleHttpServer(8080);
    while (true) {
        HttpRequest req = server.accept();  // ← your code pulls requests
        if (req.getPath().equals("/orders")) {
            service.placeOrder(parseBody(req));
            server.respond(req, "200 OK");
        }
        // Every new endpoint = more if/else here
    }
}
```

**With IoC (framework controls, calls your code):**

```java
// You write what should happen; Spring decides WHEN and HOW to call it
@RestController
class OrderController {
    @PostMapping("/orders")
    ResponseEntity<Order> placeOrder(@RequestBody OrderRequest request) {
        // Spring MVC calls THIS method when POST /orders arrives
        // Spring handles HTTP parsing, content-type negotiation, exception mapping, serialization
        // You write ONLY the business logic
    }
}
// No HttpServer loop, no if/else routing, no manual request parsing
```

The gain: you write the "what" (handle this request, process this event). The framework writes the "when" and "how" (manage threads, parse HTTP, manage transactions, retry on failure).

---

## 3. How It Works Internally

Spring's IoC container (`ApplicationContext`) at a structural level:

```
Your Code (POJOs with annotations)
         ↓ reads / scans
ApplicationContext (IoC Container)
         ↓ creates / wires
BeanFactory (singleton registry, dependency graph)
         ↓ calls at right time
@PostConstruct → @EventListener → @KafkaListener → @Scheduled
         ↓ proxies for cross-cutting concerns
AOP Proxy (wraps bean with @Transactional, @Cacheable, etc.)
         ↓ calls
Your actual bean method
```

When `@Transactional` works, it's IoC: you didn't call `beginTransaction()`. Spring's proxy called it before your method and `commit()`/`rollback()` after — without your method knowing a transaction existed.

---

## 4. The Code

### Wrong Way — Procedural, You Control Everything

```java
// ❌ BEFORE IoC: all control is in application code

public class LegacyOrderProcessor {
    
    public void run() {
        // ❌ Application creates AND manages infrastructure
        DataSource ds = new HikariDataSource(...);
        EntityManagerFactory emf = Persistence.createEntityManagerFactory("mypu");
        EntityManager em = emf.createEntityManager();
        
        // ❌ Application manages transaction manually
        em.getTransaction().begin();
        try {
            Order order = em.find(Order.class, 1L);
            order.setStatus("CONFIRMED");
            em.merge(order);
            em.getTransaction().commit();
        } catch (Exception e) {
            em.getTransaction().rollback();
        } finally {
            em.close();
        }
        
        // ❌ Application polls for work (pull model)
        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(List.of("orders"));
        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
            for (ConsumerRecord<String, String> record : records) {
                processRecord(record.value());  // ← your code controls the poll loop
            }
        }
    }
}
// Problems:
// - Boilerplate transaction code in every method that touches the DB
// - Every new message type = more `if` in the poll loop
// - Testing requires real Kafka + real DB connections
// - Cross-cutting concerns (retry, logging, tracing) must be added manually everywhere
```

```java
// ✅ WITH IoC: Spring controls the lifecycle; you write only business logic

// ✅ Spring manages transaction lifecycle
@Service
@Transactional  // ← IoC: Spring's proxy begins/commits/rolls back for you
public class OrderService {
    
    private final OrderRepository repo;
    
    public OrderService(OrderRepository repo) { this.repo = repo; }
    
    // Spring calls this on startup (lifecycle callback IoC)
    @PostConstruct
    void warmCache() { /* populate any startup cache */ }
    
    public void confirm(Long orderId) {
        Order order = repo.findById(orderId).orElseThrow();
        order.setStatus("CONFIRMED");
        // No em.merge(), no commit(), no rollback() — Spring handles it
        // If this method throws a RuntimeException, Spring rolls back automatically
    }
    
    // Spring calls this on context shutdown (lifecycle callback IoC)
    @PreDestroy
    void cleanup() { /* flush any pending state */ }
}

// ✅ Spring calls your handler when a Kafka message arrives (event IoC)
@Service
class OrderEventHandler {
    
    @KafkaListener(topics = "order-events")  // ← Spring calls this for every message; you don't poll
    @Transactional                           // ← Spring's transaction wraps the handler automatically
    public void handle(OrderEvent event) {
        // You write only what to DO with the event
        // Spring manages: consumer group, offset commit, deserialization, retry, DLQ
    }
}

// ✅ Spring calls your scheduled method on a timer (scheduling IoC)
@Service
class ReportScheduler {
    @Scheduled(cron = "0 0 8 * * MON-FRI")  // ← Spring calls this at 8am weekdays; you don't manage threads
    public void generateDailyReport() { /* business logic only */ }
}
```

```java
// ✅ Template Method pattern as IoC — base class calls your hook

// javax.persistence hooks (Spring Data uses internally)
// Your code extends, the framework calls in order

@Entity
class Order {
    @PrePersist   // ← JPA calls this BEFORE insert; you don't call it
    void onPrePersist() { this.createdAt = Instant.now(); }
    
    @PostLoad     // ← JPA calls this AFTER loading from DB; you don't call it
    void onPostLoad() { this.displayName = firstName + " " + lastName; }
}

// Spring Data Repository — template pattern IoC
interface OrderRepository extends JpaRepository<Order, Long> {
    // You DECLARE what you need; Spring generates the implementation
    List<Order> findByStatus(String status);
    // Spring finds findBy + Status, translates to JPQL, executes — you don't write the SQL
}
```

```typescript
// ✅ Angular IoC — lifecycle hooks called by Angular's change detection cycle

@Component({ selector: 'app-order', template: '...' })
class OrderComponent implements OnInit, OnDestroy {
    // ← Angular calls ngOnInit when component is ready (NOT you)
    ngOnInit() {
        this.subscription = this.orderService.getOrders().subscribe(orders => {
            this.orders = orders;
        });
    }
    
    // ← Angular calls ngOnDestroy when component is removed from DOM (NOT you)
    ngOnDestroy() {
        this.subscription.unsubscribe();  // Cleanup — framework triggers this at the right time
    }
}

// ✅ RxJS is IoC — the Observable calls your function when data is ready
this.orders$ = this.http.get<Order[]>('/api/orders');
// You don't call get() and then iterate; you SUBSCRIBE a handler
// RxJS calls your handler when the response arrives (inversion: HTTP success "calls" your code)
this.orders$.subscribe(orders => this.render(orders));
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the Hollywood Principle and how does it relate to Spring?"

**Hruday's answer:**
> The Hollywood Principle is "Don't call us — we'll call you." It means: don't write code that calls the framework directly to do every step; instead, write code that the framework can call at the right time.
>
> Spring embodies this entirely. When I write a `@KafkaListener` method, I don't write the consumer loop, I don't call `consumer.poll()`, I don't manage offsets. I write the method body — the business logic — and Spring calls it when a message arrives.
>
> When I write a `@Transactional` service method, I don't call `begin()` or `commit()`. Spring's proxy calls those before and after my method.
>
> Even the simplest Spring MVC controller: I write `@GetMapping("/products")` and the method body. Spring MVC calls my method when GET /products arrives. I never wrote an HTTP server listening loop.
>
> That inversion — framework calling my code — is why Spring is called an IoC container.

---

### Q2 — Deep Dive
**Interviewer asks:** "What's the difference between IoC and DI? People use them interchangeably — are they the same?"

**Hruday's answer:**
> IoC is the broader principle; DI is one specific way to achieve it.
>
> IoC means the framework controls when your code runs. DI is a specific form of IoC where the framework controls the creation and wiring of your objects — it injects dependencies into your constructors instead of you calling `new`.
>
> Other forms of IoC in Spring that aren't DI:
> - `@EventListener` — you don't call the method; Spring's event bus calls it when an event is published
> - `@Scheduled` — a background thread owned by Spring calls your method on a schedule
> - `@KafkaListener` — Spring's Kafka container calls your method when a message arrives
> - `@Transactional` — Spring's AOP proxy wraps your method and calls begin/commit/rollback around it
>
> All of these are IoC — the framework is in control. DI is the IoC mechanism used for object wiring. The other mechanisms are IoC applied to event handling, scheduling, and cross-cutting concerns.
>
> Treating them as synonymous is technically imprecise, though in practice "IoC container" in Spring refers to the `ApplicationContext` which encompasses DI and all the other IoC mechanisms.

---

### Q3 — Application
**Interviewer asks:** "Why is the Template Method pattern an example of IoC?"

**Hruday's answer:**
> Template Method defines an algorithm's skeleton in a base class, with abstract hook methods that subclasses fill in. The base class controls the flow and CALLS the hooks at the right points.
>
> That's IoC: the subclass doesn't call `step1()`, `step2()`, `step3()` in sequence. The base class calls the subclass's `step1()`, `step2()` implementations at the right time.
>
> Spring Data's `JdbcTemplate` is a concrete example: `JdbcTemplate.query(sql, rowMapper)` manages the connection, prepares the statement, executes it, iterates the `ResultSet`, and calls your `RowMapper.mapRow()` for each row. You write `mapRow()`. `JdbcTemplate` calls it — you don't. You never write a `while (rs.next())` loop.
>
> JPA lifecycle callbacks (`@PrePersist`, `@PostLoad`) work the same way: JPA's persistence context owns the lifecycle and calls your annotated methods at the right phase. You write the hook; JPA calls it.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| IoC = just DI | "IoC is when Spring injects your dependencies" | DI is one form of IoC; IoC also includes event listeners, lifecycle callbacks, template method pattern, scheduled tasks, reactive subscriptions — anything where the framework calls your code at the right time; mentioning only DI when asked about IoC shows surface-level knowledge |
| ApplicationContext = BeanFactory | "Spring's IoC container is the BeanFactory" | `BeanFactory` is the basic interface; `ApplicationContext` is the full IoC container (extends `BeanFactory`) and adds: event publishing, `@Scheduled` support, AOP auto-proxy, message source (i18n), resource loading; in production Spring Boot applications you always use `ApplicationContext`; `BeanFactory` is the low-level, lazy-init base that `ApplicationContext` builds on |
| IoC makes code harder to follow | "IoC is confusing because you can't trace the call stack easily" | This is a real trade-off, not a flaw to dismiss; the benefit is reusable framework code that handles cross-cutting concerns (transactions, retry, serialization) that you'd otherwise repeat everywhere; the cost is indirect call flows that require understanding the framework (e.g., you need to know `@Transactional` is a proxy, not magic, to understand why calling a `@Transactional` method from within the same class doesn't start a transaction — the proxy is bypassed); acknowledging this trade-off shows experience |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a legacy batch job that read orders from a Kafka topic using a hand-rolled consumer loop: `while (true) { consumer.poll(...)... }` in a `@Scheduled` method. The method managed offsets manually, handled deserialization exceptions with catch blocks, and had no retry logic.
>
> When Kafka rebalanced (which happens during deployments), the poll loop would block for 30+ seconds, causing heartbeat failures, triggering another rebalance, causing a rebalance storm. During peak promotion periods, this made order processing stall for minutes.
>
> We migrated to `@KafkaListener` with a `ConcurrentKafkaListenerContainerFactory` configured with `setMissingTopicsFatal(false)`, `setAckMode(AckMode.RECORD)`, and three retries via `DefaultErrorHandler`. The hand-rolled 120-line consumer loop became a 15-line handler method.
>
> Spring's container now manages the consumer lifecycle, rebalancing, and heartbeats. Rebalance storms disappeared. During the next deployment, order processing paused for under 3 seconds (the normal rebalance pause) instead of minutes. The code that remained was only business logic — which is what IoC is supposed to give you."

---

## 8. Scale Evolution

**1,000 users →** One `ApplicationContext`, singleton beans, DI for wiring. IoC removes lifecycle boilerplate. `@Transactional` manages DB transactions.

**100,000 users →** Spring's IoC enables transparent AOP for cross-cutting concerns: `@Cacheable` (cache without changing service code), `@CircuitBreaker` (Resilience4j aspect wraps your method — IoC in action: you didn't call `CircuitBreaker.run()`), `@Retryable` (Spring Retry proxy retries on exception).

**10 million users →** IoC container startup time matters in auto-scaling scenarios (new instances must start fast to handle traffic spikes); Spring Native (GraalVM AOT compilation) moves IoC from runtime reflection to build-time code generation, reducing startup from 3-5s to under 100ms; Quarkus and Micronaut take the build-time IoC approach by default.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | `@KafkaListener` IoC for payment event processing; `@Transactional` IoC for atomic payment state updates; reactive `Flux/Mono.subscribe` IoC for async payment gateway calls | IoC in event-driven payment processing; reactive IoC |
| Swiggy / Meesho | Template pattern IoC in order processing pipeline; IoC container startup time for auto-scaling during flash sales; `@Scheduled` IoC for delivery ETA recalculation | Container startup time; scaling with IoC |
| Adobe / Microsoft | Deep discussion of IoC patterns: template method, observer, event listener; Spring Native and AOT for IoC without reflection overhead; IoC design in plugin architectures (IDE plugin frameworks use IoC — extension points call your plugin) | Plugin IoC; AOT compilation for IoC |
| SAP Labs | Hand-rolled consumer loop → `@KafkaListener` story (120 lines → 15 lines; rebalance storm eliminated; 3s pause vs minutes) | Concrete IoC migration story with measurable improvement |

---

## 10. Related Topics — What to Study Next

- **Topic 289 — Dependency Injection** — DI is the most pervasive form of IoC in Spring; understanding the broader IoC principle makes DI's rationale clear: DI is IoC applied to object creation and wiring
- **Topic 291 — Singleton Pattern and Why It Is Dangerous** — Spring's IoC container manages singletons; understanding how the IoC container manages singleton lifecycle (vs class-level singleton with `private static` instance) explains why Spring-managed singletons don't have the same design problems as the classic Singleton pattern
- **Topic 296 — Proxy Pattern — Spring AOP Uses This** — virtually every container-managed IoC feature in Spring (`@Transactional`, `@Cacheable`, `@CircuitBreaker`, `@Retryable`) is implemented via dynamic proxies; understanding the proxy pattern explains how IoC mechanisms like `@Transactional` actually work at the JVM level

---

*Part 18 · Inversion of Control (IoC) · Full Stack Interview Guide · Hruday D · 2026*
