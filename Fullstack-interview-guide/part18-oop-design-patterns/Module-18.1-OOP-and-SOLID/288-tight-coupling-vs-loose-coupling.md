# Tight Coupling vs Loose Coupling
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Tight coupling** = a class KNOWS the concrete type of its collaborators and depends on their internal structure; change a detail in `StripeService` and `OrderService` must be reviewed/modified too; testing `OrderService` requires a real Stripe connection
- **Loose coupling** = a class depends only on an interface or abstraction; it doesn't know the concrete type; change `StripeService`'s internals and `OrderService` is unaffected; testing `OrderService` requires only a mock that implements the interface
- **Indicators of tight coupling**: `new ConcreteClass()` inside a method or constructor; `import com.stripe.StripeService` in your business logic; instanceof checks; accessing `field.innerField.innerInnerField` (the Law of Demeter violation = "train wreck")
- **Indicators of loose coupling**: `private final PaymentGateway gateway;` (interface); constructor injection; factories; event publishing (the publisher doesn't know what listens)
- **Law of Demeter (LoD)**: a method should only call methods on: itself, its fields, its constructor parameters, locally created objects; `order.getCustomer().getAddress().getCity()` = tight coupling to 3 internal structures at once; if any of those three changes, the calling code breaks
- **Microservices coupling**: services that call each other synchronously (REST) are more tightly coupled than services that communicate via events (Kafka); if `OrderService` calls `InventoryService` synchronously, it's tightly coupled — `InventoryService` being slow directly degrades `OrderService`

---

## 1. One-Line Definition
Tight coupling means changes in one class require changes in its dependents; loose coupling, achieved through abstractions and dependency injection, isolates changes so one component can change without forcing changes in its consumers.

---

## 2. The Problem It Solves

**Tight coupling cascade:**
1. `OrderService` directly calls `new EmailService().send(...)` (tight: knows concrete class)
2. `EmailService` is rewired to use async queue instead of SMTP
3. Now `OrderService.send()` — which previously blocked until email was sent — no longer blocks
4. Since `OrderService` expected synchronous confirmation before marking the order complete, order status logic breaks
5. The email team didn't know `OrderService` depended on synchronous behaviour; `OrderService` team didn't expect the email team to go async

With loose coupling: `OrderService` calls `NotificationPort.notify(order)`. Whether it's sync or async is the `NotificationPort` implementation's concern. `OrderService`'s caller logic doesn't depend on that detail.

---

## 3. How It Works Internally

### Law of Demeter — Train Wreck Pattern

```java
// ❌ TIGHT: Train wreck — reaches 3 levels deep
public String getOrderCity(Order order) {
    return order.getCustomer().getAddress().getCity();
    // Coupled to: Customer having getAddress(), Address having getCity()
    // If Customer model changes (no longer has Address directly, uses ContactInfo instead)
    //   → this line breaks even though Order itself didn't change
}

// ✅ LOOSE: Order exposes what you need directly
public String getOrderCity(Order order) {
    return order.getDeliveryCity();  // ← Order knows its delivery city; caller doesn't need to know HOW
}
// Internally, Order.getDeliveryCity() may call customer.address.city
// But that coupling is contained inside Order, not spread to all callers
```

### Event-Driven Loose Coupling

```java
// ❌ TIGHT: OrderService directly calls InventoryService (synchronous, runtime coupling)
@Service
class OrderService {
    private final InventoryService inventory;  // ← direct dependency; if inventory is down, orders fail
    
    public void placeOrder(Order order) {
        inventory.reserveStock(order);  // ← synchronous call; InventoryService latency = OrderService latency
        // If InventoryService is slow, OrderService is slow
        // If InventoryService schema changes, this line may break
    }
}

// ✅ LOOSE: OrderService publishes an event; InventoryService listens independently
@Service
class OrderService {
    private final ApplicationEventPublisher events;  // ← depends on abstraction, not InventoryService
    
    public void placeOrder(Order order) {
        save(order);
        events.publishEvent(new OrderPlacedEvent(order));  // ← fire and forget (or async handler)
        // InventoryService down? Event delivery retries. OrderService is not degraded.
        // InventoryService can be deployed independently.
    }
}

@Component
class InventoryEventHandler {
    @EventListener  // ← decoupled listener; OrderService doesn't know this class exists
    @Async
    public void onOrderPlaced(OrderPlacedEvent event) {
        reserveStock(event.getOrder());
    }
}
```

---

## 4. The Code

### Wrong Way — Tightly Coupled

```java
// ❌ TIGHT COUPLING in service layer

@Service
public class ProductService {
    
    // ❌ 1. Direct new — hardcoded dependency
    private final MySqlProductRepository repo = new MySqlProductRepository("jdbc:mysql://localhost/db");
    
    // ❌ 2. Import and use of concrete SDK class directly
    private final ElasticsearchClient esClient = new ElasticsearchClient("http://elastic:9200");
    
    public void updateProduct(Product product) {
        // ❌ 3. Train wreck — reaches multiple levels deep
        String auditUser = product.getCreatedBy().getProfile().getDisplayName();
        
        repo.save(product);               // tightly bound to MySQL
        esClient.index("products", product); // tightly bound to Elasticsearch host
        
        // ❌ 4. instanceof check — depends on concrete type
        if (product instanceof DigitalProduct dp) {
            dp.triggerDownloadLink();  // now ProductService knows about DigitalProduct internals
        }
    }
}
// Consequences:
// - Can't unit test without a real MySQL + Elasticsearch instance
// - Moving to PostgreSQL requires opening ProductService
// - Moving to OpenSearch requires opening ProductService
// - Every digital product lifecycle change requires opening ProductService
```

```java
// ✅ LOOSE COUPLING — inject abstractions, publish events

interface ProductRepository { void save(Product product); }
interface SearchIndex { void index(Product product); }

@Service
public class ProductService {
    private final ProductRepository repository;  // ← abstraction
    private final SearchIndex searchIndex;        // ← abstraction
    private final ApplicationEventPublisher events;
    
    // ✅ Constructor injection — Spring injects concrete implementations
    public ProductService(ProductRepository repository, SearchIndex searchIndex,
                          ApplicationEventPublisher events) {
        this.repository  = repository;
        this.searchIndex = searchIndex;
        this.events      = events;
    }
    
    public void updateProduct(Product product) {
        String auditUser = product.auditUserName();  // ✅ delegate to Product — no train wreck
        
        repository.save(product);    // ✅ doesn't care if it's MySQL or PostgreSQL
        searchIndex.index(product);  // ✅ doesn't care if it's Elasticsearch or OpenSearch
        
        events.publishEvent(new ProductUpdatedEvent(product));
        // ✅ DigitalProduct download link is triggered by a handler, not here
        // ProductService doesn't even know DigitalProduct exists
    }
}

// Concrete implementations bound by Spring config
@Repository
@Profile("mysql")
class MySqlProductRepository implements ProductRepository { /* MySQL */ }

@Component
class ElasticSearchIndex implements SearchIndex { /* Elasticsearch */ }

// DigitalProduct lifecycle handled in its own handler — no coupling to ProductService
@Component
class DigitalProductHandler {
    @EventListener
    public void onProductUpdated(ProductUpdatedEvent event) {
        if (event.getProduct() instanceof DigitalProduct dp) {
            dp.triggerDownloadLink();
        }
    }
}
```

```typescript
// ✅ TypeScript — loose coupling via interfaces in Angular services

// ❌ TIGHT: Component depends on concrete HTTP service
@Component({ ... })
class ProductListComponent {
    products: Product[] = [];
    
    constructor(private http: HttpClient) {  // ← depends on Angular HttpClient directly
        this.http.get<Product[]>('/api/products').subscribe(ps => this.products = ps);
    }
    // Switching to a WebSocket feed requires modifying this component
}

// ✅ LOOSE: Depend on abstract service; component tests easy to mock
abstract class ProductSource {
    abstract getProducts(): Observable<Product[]>;
}

@Injectable({ providedIn: 'root' })
class HttpProductSource extends ProductSource {
    constructor(private http: HttpClient) { super(); }
    getProducts() { return this.http.get<Product[]>('/api/products'); }
}

@Component({ ... })
class ProductListComponent implements OnInit {
    products: Product[] = [];
    
    constructor(private source: ProductSource) {}  // ✅ depends on abstraction
    
    ngOnInit() {
        this.source.getProducts().subscribe(ps => this.products = ps);
    }
}
// Switching to WebSocket: write WebSocketProductSource extends ProductSource and swap in providers
// Testing: inject MockProductSource extends ProductSource that returns fixed data
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What makes two classes tightly coupled?"

**Hruday's answer:**
> Tight coupling happens when a class has direct knowledge of another class's concrete type, internal structure, or implementation details.
>
> The most common indicators:
> - `new ConcreteClass()` inside a constructor or method — the class creates its own dependencies; it can't be tested or swapped without changing the class itself
> - Direct imports of framework-specific or vendor-specific classes in business logic (e.g., `import org.hibernate.Session` in a service class)
> - Train wrecks like `order.getCustomer().getAddress().getCity()` — coupled to the internal structure of Customer and Address
> - Method calls like `instanceof ConcreteType` — the caller knows about the hierarchy
>
> The test is simple: can I test this class in complete isolation? If I need to spin up a database, a real HTTP server, or a real email provider to run the class's tests, it's tightly coupled to those infrastructure concerns.

---

### Q2 — Deep Dive
**Interviewer asks:** "Compare synchronous REST calls between microservices vs event-driven messaging in terms of coupling."

**Hruday's answer:**
> Synchronous REST calls are temporal coupling: Service A must be available and responsive for Service B to complete its operation. If A is down, B fails. If A is slow, B is slow. If A changes its response contract, B breaks immediately.
>
> Event-driven communication (Kafka, RabbitMQ) removes temporal coupling: Service B publishes an event and continues. Service A processes the event when it's available. B and A don't need to be running simultaneously. A's availability doesn't affect B's availability.
>
> There's still schema coupling — A and B need to agree on the event's structure — but tools like schema registries with backward-compatible evolution reduce this.
>
> In practice: for operations that logically require an immediate response (user queries current inventory levels), use synchronous. For operations that are fire-and-forget or can tolerate eventual consistency (inventory reservation after order placed, sending confirmation email), use events. The coupling choice mirrors the consistency and availability trade-off.

---

### Q3 — Application
**Interviewer asks:** "What is the Law of Demeter and when does it matter?"

**Hruday's answer:**
> The Law of Demeter says a method should only talk to its immediate friends: itself, its own fields, objects passed as parameters, and objects it creates locally.
>
> `order.getCustomer().getAddress().getCity()` violates it — `OrderService` is reaching through `Order` to `Customer` to `Address` to get `City`. If `Customer` restructures and wraps addresses in a `ContactInfo` object, every piece of code doing this chain breaks.
>
> The fix: add `order.getDeliveryCity()` which internally returns `customer.address.city`. Now `OrderService` only knows about `Order`. The chain is contained inside `Order`. `OrderService` no longer breaks when `Customer` changes.
>
> This matters most in domain model code that many parts of the system touch. A single deeply-chained access in a widely-used service becomes a maintenance liability — the deeply-nested objects form an implicit public API that nobody intended to maintain.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Coupling = always bad | "Loose coupling is always better than tight coupling" | Every system has SOME coupling — that's what makes it a system; the goal is coupling to STABLE abstractions that don't change often; coupling to `List` (the Java interface) is fine because it never changes; coupling to `ArrayList`'s internal array type is fragile; there's also a cost to loose coupling — more abstractions, more indirection, harder to trace call paths; apply loose coupling where change is expected and testability is required, not universally |
| Equating loose coupling with lots of interfaces | "I'll write an interface for every class" | An interface for every class adds ceremony without value; an `UserServiceInterface` implemented by exactly one `UserServiceImpl` in a CRUD application is pointless abstraction; loose coupling means coupling to a stable point of variation; the interface is valuable when (a) there are multiple implementations or (b) the implementation needs to be swapped (different environments, A/B test, mock in test); one implementation + one interface with no other use = over-engineering |
| Ignoring indirect coupling via events | "Since we're using events, we have no coupling" | Events reduce temporal coupling but introduce event contract coupling — the event schema is a shared data structure; if `OrderPlacedEvent` changes (type of `amount` changes from `double` to `BigDecimal`), all consumers break; event coupling is typically managed through schema registries (Confluent Schema Registry for Kafka), backward-compatible schema evolution, and consumer-driven contract testing (Pact); it's a different kind of coupling, not no coupling |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, the initial order processing backend called six downstream services synchronously: inventory, shipping calculation, loyalty points, audit log, email notification, and analytics. When the analytics service had a 500ms average response time during end-of-month reporting, every single order took 500ms extra.
>
> We categorised the calls:
> - Inventory and shipping: must be synchronous (user waits for stock availability confirmation)
> - Analytics, audit, email, loyalty: can be asynchronous (user doesn't wait for these)
>
> We moved the four async calls to Kafka events. `OrderService` now publishes one `OrderPlacedEvent` and returns. The four services each consume from their own consumer group.
>
> Average order API latency: from 850ms to 180ms. The P99 dropped from 2000ms to 350ms. Analytics service slowdowns no longer affected customers.
>
> The coupling metric improved: `OrderService` went from 6 direct Spring imports (one per downstream service) to 1 (`ApplicationEventPublisher`). A new downstream service (loyalty expansion feature, 3 months later) required zero changes to `OrderService`."

---

## 8. Scale Evolution

**1,000 users →** Constructor injection, interface-based dependencies within one application. Testing is the primary benefit. No distributed concerns.

**100,000 users →** Service coupling in microservices — synchronous vs async call design. Temporal coupling causes cascading failures (one slow service degrades all callers). Event-driven decoupling with Kafka prevents cascade failure propagation.

**10 million users →** Consumer-driven contract testing (Pact) to manage schema coupling in event-driven systems at scale; service mesh (Istio) with circuit breakers manage temporal coupling when some synchronous calls are unavoidable; open-closed principle at the protocol level: a schema registry with backward-compatible evolution keeps consumers decoupled from producer schema changes.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flow: inventory + payment synchronous (user-facing); fraud analysis + analytics + notifications asynchronous (events); tight coupling of direct gateway calls = single point of failure | Coupling type selection by user-impact; event-driven for non-critical flows |
| Swiggy / Meesho | High-throughput order placement: synchronous stock check + price, asynchronous delivery estimate + loyalty + analytics; temporal coupling as cascade failure risk | Cascade failure prevention; sync vs async coupling rationale |
| Adobe / Microsoft | "Find coupling violations in this code" is a common code review exercise in senior rounds; Law of Demeter violations specifically called out; architectural coupling between services | Train wreck identification; Law of Demeter fix; event vs REST coupling |
| SAP Labs | 6-service sync → 4 async events story (850ms → 180ms); import count from 6 to 1 in OrderService; new loyalty service with zero OrderService changes | Concrete perf improvement; import count as coupling metric |

---

## 10. Related Topics — What to Study Next

- **Topic 289 — Dependency Injection** — DI is the primary mechanism for achieving loose coupling in Spring; understanding WHY coupling is bad makes DI's value obvious: DI allows the coupling point (which concrete class to use) to be resolved at application startup instead of at class-definition time
- **Topic 298 — Strategy Pattern** — the Strategy pattern is a formal way to apply loose coupling for interchangeable algorithms: the context depends on a `Strategy` interface, not any concrete strategy; recognising "this if/else chain would benefit from loose coupling via Strategy" is the key insight
- **Topic 071 — Circuit Breaker Pattern** — in microservices, temporal coupling propagates failures: a slow downstream service degrades all callers; the circuit breaker is the production mechanism for managing tight temporal coupling that can't be removed (synchronous calls that are genuinely needed); it breaks the coupling when the downstream is unhealthy

---

*Part 18 · Tight Coupling vs Loose Coupling · Full Stack Interview Guide · Hruday D · 2026*
