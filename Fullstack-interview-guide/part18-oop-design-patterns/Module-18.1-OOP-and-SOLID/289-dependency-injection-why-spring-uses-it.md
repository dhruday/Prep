# Dependency Injection — Why Spring Uses It
> Part 18 — OOP, SOLID & Design Patterns · 🔥 High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **DI definition**: instead of a class creating its own dependencies (`new X()`), dependencies are provided FROM OUTSIDE — by a framework (Spring) or by the caller
- **Why Spring uses DI**: loose coupling (swap implementations without changing consumers), testability (inject mocks in tests), lifecycle management (Spring owns when objects are created and destroyed — singletons, prototype, request, session scopes), removes boilerplate wiring code
- **Three types**: constructor injection (preferred — immutable fields, clear deps, makes cycle detectable at startup); setter injection (optional deps); field injection (`@Autowired` on field — don't use: hides deps, prevents immutability, hard to test outside Spring context)
- **`@Autowired` mechanics**: Spring scans classpath for `@Component`/`@Service`/`@Repository`/`@Controller`, builds `ApplicationContext` bean graph, resolves constructor params by type, injects at application startup
- **Disambiguation**: when two beans implement same interface, use `@Qualifier("beanName")` or `@Primary` on the preferred one
- **Circular dependency**: A needs B, B needs A at construction time → Spring throws `BeanCurrentlyInCreationException`; fix: break cycle (usually a design issue), use `@Lazy`, or use setter injection (Spring can partially-construct A, then set B's reference to it)
- **Test**: use `@MockBean` (replaces bean in context) or `@InjectMocks` + `@Mock` (pure Mockito, no Spring context) to inject mock dependencies

---

## 1. One-Line Definition
Dependency Injection is a pattern where a class's collaborators are supplied to it from outside rather than created by the class itself, shifting the control of object creation to a container (Spring) that wires the complete application graph at startup.

---

## 2. The Problem It Solves

Without DI, every class that needs a database connection creates its own:

```java
public class ProductService {
    // ❌ Creates its own connection pool — 50 service classes = 50 separate connection pools
    private final DataSource ds = new HikariCP("jdbc:postgresql://...", "user", "pass");
    // ❌ Hardcodes credentials — changes to DB password require recompiling every service
    // ❌ Can't test without a real database
}
```

With DI: one `DataSource` bean is created at startup; all service classes receive the SAME instance injected. Connection pool is shared. Credentials are externalised. Test classes inject a `DataSource` backed by H2 instead.

---

## 3. How It Works Internally

Spring's DI lifecycle at startup:

```
1. ComponentScan — discovers all @Component, @Service, @Repository, @Controller classes
2. BeanDefinition creation — Spring records: class, scope, constructor params
3. Dependency resolution — Spring topologically sorts beans (A depends on B → B is created first)
4. Instantiation — Spring calls constructors with resolved arguments
5. Post-processors — e.g., @Value injection, AOP proxying, @PostConstruct callbacks
6. ApplicationContext ready — all beans wired; app can serve requests
```

For every request-scoped or prototype-scoped bean, steps 4–6 repeat per request/per call.

---

## 4. The Code

### Wrong Way — Manual Wiring / Field Injection

```java
// ❌ Field injection — hidden dependencies, prevents immutability, breaks outside Spring

@Service
public class OrderService {
    
    @Autowired
    private PaymentGateway payment;  // ❌ invisible: constructor doesn't show what OrderService needs
    
    @Autowired
    private InventoryRepository inventory;  // ❌ can't be final — not immutable
    
    @Autowired  
    private EmailSender email;  // ❌ to test this class, you must start the entire Spring context
    //       OR use reflection-based injection with obscure Mockito setup
    
    public void placeOrder(Order order) {
        inventory.reserve(order);
        payment.charge(order);
        email.sendConfirmation(order);
    }
}

// ❌ Manual wiring without Spring — brittle and verbose
public class Application {
    public static void main(String[] args) {
        DataSource ds = new HikariDataSource(...);
        InventoryRepository inv = new JpaInventoryRepository(ds);
        PaymentGateway pg = new StripePaymentGateway(...);
        EmailSender email = new SmtpEmailSender(...);
        OrderService os = new OrderService(inv, pg, email);  // ← any new dep = change here + everywhere
        // If OrderService gains a new dep, this file and every test file must create it manually
    }
}
```

```java
// ✅ Constructor injection — preferred in Spring

@Service
public class OrderService {
    
    private final PaymentGateway payment;      // ✅ final — immutable after injection
    private final InventoryRepository inventory;
    private final ApplicationEventPublisher events;  // ✅ even Spring infrastructure is injected
    
    // ✅ Single constructor — Spring auto-injects without @Autowired in Spring 4.3+
    // All deps are visible at a glance — clear contract of what this class needs
    public OrderService(PaymentGateway payment,
                        InventoryRepository inventory,
                        ApplicationEventPublisher events) {
        this.payment   = payment;
        this.inventory = inventory;
        this.events    = events;
    }
    
    public void placeOrder(Order order) {
        inventory.reserve(order);
        payment.charge(order);
        events.publishEvent(new OrderPlacedEvent(order));
    }
}
```

```java
// ✅ Swapping implementations via Spring profiles — zero change to OrderService

interface PaymentGateway {
    void charge(Order order);
}

@Component
@Profile("production")
class StripePaymentGateway implements PaymentGateway {
    @Override public void charge(Order order) { /* Stripe SDK */ }
}

@Component
@Profile("test")
class FakePaymentGateway implements PaymentGateway {
    List<Order> chargedOrders = new ArrayList<>();
    @Override public void charge(Order order) { chargedOrders.add(order);  }
}

// ✅ Unit test — no Spring context at all
class OrderServiceTest {
    
    @Test
    void placeOrder_reservesInventoryAndChargesPayment() {
        // Arrange — construct manually with mocks
        PaymentGateway mockPayment = mock(PaymentGateway.class);
        InventoryRepository mockInventory = mock(InventoryRepository.class);
        ApplicationEventPublisher mockEvents = mock(ApplicationEventPublisher.class);
        
        OrderService service = new OrderService(mockPayment, mockInventory, mockEvents);
        Order order = new Order("product-1", 2);
        
        // Act
        service.placeOrder(order);
        
        // Assert
        verify(mockInventory).reserve(order);
        verify(mockPayment).charge(order);
        verify(mockEvents).publishEvent(any(OrderPlacedEvent.class));
        // No database, no HTTP, no SMTP — test runs in milliseconds
    }
}
```

```java
// ✅ Qualifier disambiguation — when two beans implement the same interface

@Component
@Qualifier("stripe")
class StripeGateway implements PaymentGateway { ... }

@Component
@Qualifier("razorpay")
class RazorpayGateway implements PaymentGateway { ... }

@Service
public class OrderService {
    // ✅ Tell Spring exactly which bean to inject
    public OrderService(@Qualifier("razorpay") PaymentGateway payment, ...) {
        this.payment = payment;
    }
}
```

```typescript
// ✅ Angular DI — same concept, different syntax

// Service
@Injectable({ providedIn: 'root' })  // ← 'root' = singleton, same as Spring @Scope("singleton")
class ProductService {
    constructor(private http: HttpClient) {}  // ← Angular injects HttpClient
    getProducts() { return this.http.get<Product[]>('/api/products'); }
}

// Component
@Component({ selector: 'app-product-list', template: '...' })
class ProductListComponent implements OnInit {
    constructor(private productService: ProductService) {}  // ← Angular injects ProductService
    ngOnInit() { this.productService.getProducts().subscribe(...); }
}

// Testing — provide a mock in TestBed
TestBed.configureTestingModule({
    providers: [
        { provide: ProductService, useClass: MockProductService }
        //  ↑ Angular injects MockProductService wherever ProductService is requested
    ]
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why does Spring encourage constructor injection over field injection?"

**Hruday's answer:**
> Three reasons.
>
> First, immutability: constructor injection allows dependencies to be `final`. A `final` field can never be accidentally reassigned after construction. Field injection forces fields to be non-final.
>
> Second, visibility: when I look at a class with constructor injection, the constructor signature immediately tells me every dependency the class requires. With field injection, deps are scattered through the class body as `@Autowired` fields. I have to read the entire class to understand what it needs.
>
> Third, testability outside Spring: with constructor injection, I can write a unit test that creates the class with `new OrderService(mockPayment, mockInventory)` — no Spring context needed. With field injection, I either start an `@SpringBootTest` (slow) or use `ReflectionTestUtils.setField` (fragile hack). Constructor injection makes the test code match the production wiring exactly.
>
> Spring docs and recent Spring training material explicitly recommend constructor injection for mandatory dependencies since Spring 4.3.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does Spring resolve circular dependencies and when should that concern you?"

**Hruday's answer:**
> Spring detects circular dependencies at startup. If A requires B and B requires A in their constructors, Spring throws `BeanCurrentlyInCreationException` immediately — the app won't start. That's actually a good thing: it surfaces a design problem early.
>
> A circular dependency usually means:
> - The two classes have too much shared responsibility and should be split (Single Responsibility)
> - One direction should be replaced by an event (A publishes an event, B handles it — no circular dependency)
> - There's a third service that both A and B should depend on instead of each other
>
> If you really can't break the cycle, Spring can resolve it with setter injection or `@Lazy` on one of the dependencies — Spring will create A with a proxy for B, then inject B when it's available. But this is symptom treatment, not a cure; the real fix is the design.
>
> At SAP Labs, when we hit a circular dependency between `OrderService` and `NotificationService` (order needs to notify, notification queries orders for context), we moved to events — `OrderPlacedEvent` — and the cycle disappeared. `NotificationHandler` listens; `OrderService` no longer knows `NotificationService` exists.

---

### Q3 — Application
**Interviewer asks:** "What's the difference between `@MockBean` and `@Mock` in Spring tests?"

**Hruday's answer:**
> `@Mock` is pure Mockito — it creates a mock without involving Spring at all. If I use `@InjectMocks`, Mockito finds the mocks and injects them using reflection, essentially simulating what Spring would do. This is the fastest kind of test — no context startup, runs in milliseconds.
>
> `@MockBean` is a Spring Boot testing tool. It replaces a bean IN the Spring `ApplicationContext` with a Mockito mock. The full Spring context starts (or a slice of it, with `@WebMvcTest` or `@DataJpaTest`), but the specific bean is replaced with a mock.
>
> Use `@Mock` + `@InjectMocks` for pure unit tests where I don't need Spring infrastructure at all — services, domain logic.
>
> Use `@MockBean` when I need some Spring infrastructure — e.g., I'm testing a `@RestController` with `@WebMvcTest` (Spring MVC is real), but I want to mock the `OrderService` so I don't need a database.
>
> Mixing them up is a common performance problem: `@MockBean` forces Spring context restart between tests, which can make a test suite that should run in seconds take minutes.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| DI = Spring | "You need Spring to do DI" | DI is a pattern, not a framework; you can manually construct objects with `new A(new B(), new C())` — that IS DI (manual DI); Spring automates the wiring; Guice, Micronaut, Quarkus all do DI without being Spring; Angular does DI without Spring; the pattern predates any framework |
| @Autowired on every field | "I put @Autowired on all my dependencies" | Field injection is an anti-pattern in production code; it makes testing harder, prevents immutability, and hides dependencies; Spring itself deprecated field injection in its documentation recommendations; prefer constructor injection with `final` fields; if there are more than 4-5 constructor params, it's a signal the class has too many responsibilities and should be refactored |
| Singleton scope is global mutable state | "Spring beans are singletons so they're safe to share state in" | Singleton beans in Spring are shared across ALL requests and all threads concurrently; if a singleton service has a mutable instance field (e.g., `private List<Order> cache = new ArrayList<>()`) and two threads access it simultaneously, it's a race condition; singleton beans must be STATELESS (all state in method-local variables or in injected stateful beans like repositories); this is the most common threading bug in Spring applications |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we inherited a legacy backend where every service class created its own database connections — each service had a `new HikariDataSource(...)` call in the class body with hardcoded JDBC credentials. The database server had a maximum connection limit of 200.
>
> We were running 24 service classes, each creating a pool of 10 connections by default — 240 connections at startup, immediately over the limit. During deployments, the app would fail to start because it couldn't acquire connections.
>
> We migrated to constructor injection with a single shared `DataSource` bean defined in `@Configuration`. All 24 services now shared one pool of 30 connections — easily within the 200 limit. Connection acquisition time in peak load dropped from 800ms (pool exhaustion + wait) to under 5ms.
>
> A separate benefit: our test suite went from needing a live database to running purely with H2 in-memory. CI pipeline time for the service module dropped from 4 minutes to 40 seconds — because tests no longer needed a real PostgreSQL container to pass."

---

## 8. Scale Evolution

**1,000 users →** Single `DataSource` bean shared across all services via DI. Connection pool tuning. All dependencies injected via constructor. Unit tests use mocks.

**100,000 users →** Scope matters at scale: request-scoped beans for per-request state (e.g., security context), prototype-scoped for expensive objects per operation; Spring's `ObjectProvider<T>` for lazy/optional/multiple bean resolution at scale.

**10 million users →** DI container startup time matters in cloud functions / serverless (cold start); frameworks like Quarkus and Micronaut generate DI wiring at build time (AOT compilation) rather than at runtime reflection scanning, cutting startup from seconds to milliseconds; Quarkus uses build-time DI to achieve sub-100ms startup vs Spring Boot's 2-5s.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | DI for swapping payment provider adapters (e.g., Razorpay vs international gateway based on currency); singleton stateless service beans for high-throughput transaction processing | Qualifier disambiguation; singleton statelessness |
| Swiggy / Meesho | Feature-flag-driven DI: inject `PricingStrategy` implementation based on seller tier; `@Profile`-based wiring for A/B test variants | Profile-based bean switching; testability |
| Adobe / Microsoft | Deep DI system design: service locator pattern vs constructor injection; build-time DI (Spring Native) for low-latency cloud functions | Service locator anti-pattern; build-time vs runtime DI |
| SAP Labs | 24-service shared DataSource story (240 → 30 connections, 800ms → 5ms); CI pipeline from 4m → 40s with injected mocks; constructor injection migration | Concrete pool exhaustion story; measurable test speed improvement |

---

## 10. Related Topics — What to Study Next

- **Topic 288 — Tight Coupling vs Loose Coupling** — DI is the implementation mechanism for loose coupling; understanding WHY we want loose coupling is the prerequisite to understanding WHY Spring was designed around DI
- **Topic 290 — Inversion of Control (IoC)** — DI is one form of IoC; understanding the broader IoC principle (the framework calls your code rather than your code calling the framework) explains why Spring is called an IoC container
- **Topic 291 — Singleton Pattern — and Why It Is Dangerous** — Spring's default bean scope is singleton; the risks of traditional singleton (global mutable state, can't be mocked) explain exactly why Spring's DI-managed singleton is different from the class-level singleton anti-pattern; understanding that distinction is a senior-level signal

---

*Part 18 · Dependency Injection — Why Spring Uses It · Full Stack Interview Guide · Hruday D · 2026*
