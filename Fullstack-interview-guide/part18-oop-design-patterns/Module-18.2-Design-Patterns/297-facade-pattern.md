# Facade Pattern
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Facade pattern**: provides a SIMPLIFIED interface to a complex subsystem; hides internal complexity behind a single entry point; callers don't need to know which components are orchestrated internally
- **vs Adapter**: Adapter = bridge between two INCOMPATIBLE interfaces (interface mismatch); Facade = SIMPLIFY a complex subsystem (complexity reduction); Facade usually calls multiple classes internally; Adapter usually wraps ONE class
- **Classic Java example**: `java.net.URL` — calling `url.openConnection().getInputStream()` hides DNS resolution, TCP handshake, HTTP protocol negotiation; `JdbcTemplate` in Spring hides connection acquire, statement prepare, result set iterate, connection close
- **Facade in Spring**: Spring Boot auto-configuration IS a macro-level Facade — `@SpringBootApplication` configures DataSource, ConnectionPool, JPA, MVC, Security by default; you don't configure each subsystem separately
- **When to NOT add a Facade**: avoid Facade if callers legitimately need fine-grained control over the subsystem; Facade is a SIMPLIFICATION tool, not an encapsulation tool for its own sake; if every caller needs different subsystem options, Facade artificially forces them through a single narrow API
- **Anti-pattern: God Service**: a Facade that grows beyond coordination — starts containing business logic itself — becomes a "God Service"; Facade should orchestrate, not decide

---

## 1. One-Line Definition
Facade provides a single simplified entry point into a complex subsystem, hiding internal implementation complexity and the orchestration of multiple components so that callers can complete common operations with a single call.

---

## 2. The Problem It Solves

**Without Facade:**
```java
// To send a single notification, callers must orchestrate 6 steps:
Authentication auth = AuthService.getInstance().authenticate(userToken);
TemplateEngine engine = new FreemarkerEngine();
String body = engine.render("notification.ftl", Map.of("user", user, "order", order));
EmailAddress from = EmailAddress.parse("noreply@sap.com");
EmailAddress to = EmailAddress.parse(user.getEmail());
MimeMessage msg = mailSession.createMimeMessage();
MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
helper.setFrom(from); helper.setTo(to.toString());
helper.setSubject("Order Confirmed");
helper.setText(body, true);
javaMailSender.send(msg);
auditService.log(AuditEvent.NOTIFICATION_SENT, user.getId());
```

**With Facade:**
```java
notificationFacade.sendOrderConfirmation(user, order);
// One call; all orchestration inside the Facade
```

---

## 3. How It Works Internally

```
Caller → NotificationFacade.sendOrderConfirmation(user, order)
              ↓ orchestrates internally
    TemplateEngine.render("order-confirmed.ftl", data)
    EmailSender.send(from, to, subject, body)
    PushNotifier.push(user.deviceToken, shortMessage)
    AuditLogger.log(NOTIFICATION_SENT, user, order)
    MetricsCollector.increment("notifications.sent")

Caller never knows these 5 classes exist.
Adding a new notification channel (WhatsApp): add to Facade — callers unchanged.
```

---

## 4. The Code

### Wrong Way — Callers Repeatedly Orchestrate Complex Subsystems

```java
// ❌ NO FACADE: every caller orchestrates the full checkout flow

@RestController
class CheckoutController {
    // ❌ Injecting all 6 subsystem services directly
    private final InventoryService inventory;
    private final PricingEngine pricing;
    private final PaymentGateway payment;
    private final OrderRepository orders;
    private final NotificationService notifications;
    private final AuditService audit;
    
    // ❌ Controller contains orchestration logic — should be minimal
    @PostMapping("/checkout")
    public ResponseEntity<OrderResponse> checkout(@RequestBody CheckoutRequest req) {
        // ❌ All 6 callers (CheckoutController, MobileController, ApiController, BulkOrderController...)
        // must implement this same orchestration, or copy-paste it
        
        inventory.validateStock(req.getItems());
        BigDecimal price = pricing.calculateTotal(req.getItems(), req.getPromoCode());
        
        Order order = new Order(req.getUserId(), req.getItems(), price);
        orders.save(order);
        
        PaymentResult result = payment.charge(order, req.getPaymentMethod());
        order.markPaid(result.getTransactionId());
        orders.save(order);
        
        inventory.reserve(req.getItems());
        notifications.sendOrderConfirmation(req.getUserId(), order);
        audit.log(AuditEvent.ORDER_PLACED, req.getUserId(), order.getId());
        
        return ResponseEntity.ok(new OrderResponse(order.getId(), price, result.getTransactionId()));
    }
}

// Now MobileController needs the same logic — copy-paste?
// BulkOrderController needs the same logic — copy-paste again?
// If payment step changes, update ALL callers.
```

```java
// ✅ FACADE: CheckoutFacade hides orchestration; callers use one method

// 1. Facade class — orchestrates, doesn't contain business rules
@Service
public class CheckoutFacade {
    private final InventoryService inventory;
    private final PricingEngine pricing;
    private final PaymentGateway payment;
    private final OrderRepository orders;
    private final ApplicationEventPublisher events;
    
    public CheckoutFacade(InventoryService inventory, PricingEngine pricing,
                          PaymentGateway payment, OrderRepository orders,
                          ApplicationEventPublisher events) {
        this.inventory = inventory;
        this.pricing   = pricing;
        this.payment   = payment;
        this.orders    = orders;
        this.events    = events;
    }
    
    @Transactional
    public CheckoutResult placeOrder(CheckoutRequest request) {
        // ← All orchestration in one place
        
        // Step 1: validate and price
        inventory.validateStock(request.getItems());
        BigDecimal total = pricing.calculateTotal(request.getItems(), request.getPromoCode());
        
        // Step 2: create order
        Order order = Order.of(request.getUserId(), request.getItems(), total);
        orders.save(order);
        
        // Step 3: charge payment
        PaymentResult payment = this.payment.charge(order, request.getPaymentMethod());
        order.markPaid(payment.getTransactionId());
        orders.save(order);
        
        // Step 4: reserve inventory + fire events (async notification, audit)
        inventory.reserve(request.getItems());
        events.publishEvent(new OrderPlacedEvent(order));
        // Notifications and audit handled by event listeners — Facade stays clean
        
        return new CheckoutResult(order.getId(), total, payment.getTransactionId());
    }
    
    // Additional simplified operations
    public void cancelOrder(Long orderId) {
        Order order = orders.findById(orderId).orElseThrow();
        payment.refund(order.getPaymentTransactionId(), order.getTotalAmount());
        inventory.release(order.getItems());
        order.cancel();
        orders.save(order);
        events.publishEvent(new OrderCancelledEvent(order));
    }
}

// 2. Callers are simple — one dependency, one method call
@RestController
class CheckoutController {
    private final CheckoutFacade checkout;   // ← ONE dependency instead of SIX
    
    public CheckoutController(CheckoutFacade checkout) { this.checkout = checkout; }
    
    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResult> checkout(@RequestBody CheckoutRequest req) {
        return ResponseEntity.ok(checkout.placeOrder(req));
        // ← ONE line; orchestration is Facade's responsibility
    }
}

@RestController
class MobileCheckoutController {
    private final CheckoutFacade checkout;  // ← same Facade, same simplicity
    
    @PostMapping("/mobile/checkout")
    public ResponseEntity<CheckoutResult> mobileCheckout(@RequestBody MobileCheckoutRequest req) {
        CheckoutRequest normalized = mapToCheckout(req);
        return ResponseEntity.ok(checkout.placeOrder(normalized));
    }
}
```

```java
// ✅ Spring's JdbcTemplate — classic Spring Facade example

// ❌ Without JdbcTemplate: manually manage all JDBC ceremony
public List<Product> findByCategory(String category) {
    Connection conn = null;
    PreparedStatement ps = null;
    ResultSet rs = null;
    try {
        conn = dataSource.getConnection();
        ps = conn.prepareStatement("SELECT * FROM products WHERE category = ?");
        ps.setString(1, category);
        rs = ps.executeQuery();
        List<Product> results = new ArrayList<>();
        while (rs.next()) {
            results.add(new Product(rs.getLong("id"), rs.getString("name"), rs.getString("category")));
        }
        return results;
    } catch (SQLException e) {
        throw new RuntimeException("DB error", e);
    } finally {
        // Close rs, ps, conn in reverse order — 15 more lines with nested null checks
    }
}

// ✅ With JdbcTemplate Facade: 3 lines
public List<Product> findByCategory(String category) {
    return jdbcTemplate.query(
        "SELECT * FROM products WHERE category = ?",
        (rs, rowNum) -> new Product(rs.getLong("id"), rs.getString("name"), rs.getString("category")),
        category
    );
    // JdbcTemplate handles: connection acquire, param binding, execution, mapping,
    // ResultSet iteration, connection close, exception translation — all hidden
}
```

```typescript
// ✅ TypeScript — Facade for complex API orchestration

// Without Facade: component calls 4 services and assembles the page data
@Component({ ... })
class ProductPageComponent {
    constructor(
        private productService: ProductService,
        private reviewService: ReviewService,
        private inventoryService: InventoryService,
        private recommendationService: RecommendationService
    ) {}
    
    async ngOnInit() {
        // ❌ Component orchestrating cross-service data assembly
        const [product, reviews, inventory, recommendations] = await Promise.all([
            firstValueFrom(this.productService.getProduct(this.productId)),
            firstValueFrom(this.reviewService.getReviews(this.productId)),
            firstValueFrom(this.inventoryService.getStock(this.productId)),
            firstValueFrom(this.recommendationService.getSimilar(this.productId))
        ]);
        this.pageData = { product, reviews, inventory, recommendations };
    }
}

// ✅ With Facade: component is simple, Facade owns assembly
@Injectable({ providedIn: 'root' })
class ProductPageFacade {
    constructor(
        private products: ProductService,
        private reviews: ReviewService,
        private inventory: InventoryService,
        private recommendations: RecommendationService
    ) {}
    
    getPageData(productId: string): Observable<ProductPageData> {
        return combineLatest([
            this.products.getProduct(productId),
            this.reviews.getReviews(productId),
            this.inventory.getStock(productId),
            this.recommendations.getSimilar(productId)
        ]).pipe(
            map(([product, reviews, inventory, recommendations]) => ({
                product, reviews, inventory, recommendations
            }))
        );
    }
}

// Component: one dependency, reactive subscription
@Component({ ... })
class ProductPageComponent implements OnInit {
    pageData$!: Observable<ProductPageData>;
    
    constructor(private facade: ProductPageFacade) {}
    
    ngOnInit() {
        this.pageData$ = this.facade.getPageData(this.productId);
        // ← One line; lifecycle handled with async pipe in template
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the Facade pattern and how does it differ from Adapter?"

**Hruday's answer:**
> Facade provides a simplified unified interface to a complex subsystem. Adapter bridges two incompatible interfaces so that a client expecting one interface can work with a class providing a different interface.
>
> The key difference is the problem they solve:
> - Adapter is about interface MISMATCH — make `StripeClient` look like `PaymentGateway`. The adaptee is one class.
> - Facade is about complexity REDUCTION — hide the 6-step checkout orchestration behind `checkout.placeOrder()`. The facade calls multiple classes internally.
>
> In code they look similar — both wrap something. But Facade's job is to reduce what the caller needs to know about. Adapter's job is to make two things work together that otherwise wouldn't.
>
> A class can be both: a `PaymentFacade` that simplifies a complex payment flow AND adapts an external payment SDK to your domain interface. When they're combined, the intent is clearest from: "is this simplifying complexity (Facade) or bridging interface mismatch (Adapter)?"

---

### Q2 — Deep Dive
**Interviewer asks:** "When does a Facade become a 'God Service' anti-pattern?"

**Hruday's answer:**
> Facade becomes a God Service when it accumulates BUSINESS LOGIC instead of just orchestrating.
>
> Legitimate Facade job: "call inventory.validate, call pricing.calculate, call payment.charge, call orders.save, publish event" — pure coordination.
>
> God Service: the Facade starts deciding HOW pricing works, implementing discount rules, containing conditional logic for different order types, knowing about loyalty tiers, applying promotion stacking rules. Now it's a 1,000-line class with 40 methods that every team touches because all order logic lives there.
>
> The warning signs: the class grows past ~200 lines; it's the most-frequently-modified file in the repository; every new feature requires editing it; multiple teams are waiting on changes to it.
>
> Prevention: Facade should delegate business decisions to domain services (PricingEngine, PromotionService, LoyaltyService); Facade's methods should read like an orchestration script ("validate, price, pay, save, notify"), not like business rule code ("if customer.tier == 'GOLD' and items.sum > 500 and today is in promotion period..."). Business rules belong in domain objects and domain services; orchestration belongs in the Facade.

---

### Q3 — Application
**Interviewer asks:** "Is Spring Boot auto-configuration a Facade? Explain."

**Hruday's answer:**
> Yes, Spring Boot auto-configuration is a macro-level Facade.
>
> Without Spring Boot, setting up a Spring web application with JPA means: configure DataSource, configure connection pool (HikariCP), configure EntityManagerFactory, configure PlatformTransactionManager, configure LocalContainerEntityManagerFactoryBean, configure JpaTransactionManager, configure Spring MVC, configure DispatcherServlet, configure message converters, configure error handlers. Dozens of `@Bean` method definitions across multiple `@Configuration` classes.
>
> `@SpringBootApplication` combined with `spring-boot-starter-data-jpa` on the classpath does all of that automatically, with opinionated defaults. You declare what you need in `application.properties` (`spring.datasource.url`, etc.). Everything else is configured for you.
>
> The `@SpringBootApplication` annotation is the Facade: one entry point, hides the entire Spring subsystem setup. Auto-configuration classes are the "complex subsystem" behind the Facade — they're there if you need to override, but you don't need to know about them for standard use.
>
> The tradeoff is the same as every Facade: it simplifies common cases perfectly, but when you need customisation (custom connection pool, specific JPA dialect, non-standard transaction management), you need to understand what's behind the Facade to override the right pieces.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Facade = just service layer | "Facade is basically what we call a Service in Spring" | A Spring `@Service` CAN be a Facade — if it orchestrates multiple subsystems — but not all services are Facades; a `ProductService` that does CRUD on products is not a Facade, it's a domain service; a `CheckoutFacade` that orchestrates inventory + pricing + payment + notifications IS a Facade; the pattern is about orchestration responsibility and simplification of complexity, not about the `@Service` annotation |
| Facade kills testability | "If everything goes through the Facade, testing individual parts is hard" | Facade actually IMPROVES testability for callers — they test against a single simplified interface (or a mock Facade); the components behind the Facade are tested in THEIR own unit tests; the Facade itself is tested with integration tests that verify the orchestration is correct; the key is that Facade delegates to properly-injected dependencies — the Facade is fully testable because all its dependencies can be mocked |
| Facade must expose everything | "The Facade should expose all the subsystem's methods, not just common operations" | Facade's point is selective exposure — expose the common use cases simply, hide the uncommon or complex cases; if a caller needs unusual control, they should either call the subsystem directly or you expose an additional method; a Facade that exposes 50 methods is just a wrapper, not a simplification; identify the 3-5 most-frequently-needed operations and facade those; the Facade is a user-experience decision for your API |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, the analytics module had three frontend teams (Analytics Dashboard, Embedded Reports, Mobile App) each making direct calls to 7 backend services: DataSource, Query Builder, Aggregation Service, Cache Service, Export Service, Permission Service, and Audit Service. Each team had slightly different orchestration code, and all three diverged over time.
>
> When we added row-level security to the Permission Service, we had to update all three teams' integration code separately — a 3-week effort across 3 codebases.
>
> We introduced `AnalyticsFacade` with four operations: `executeQuery(querySpec)`, `exportReport(reportId, format)`, `getDashboardData(dashboardId)`, `refreshCache(queryId)`. Each orchestrated the 7 services correctly, including permission checks and audit logging.
>
> All three teams migrated to the Facade. When row-level security changed again six months later, it was a 2-day change in one class — the Facade.
>
> The additional benefit: when we added column-level encryption the following quarter, zero team coordination was needed — the Facade handled the decryption step transparently. Frontend teams didn't know it existed."

---

## 8. Scale Evolution

**1,000 users →** Facade for complex business flows — single entry point per feature domain. All callers (REST controller, mobile API, async event handler) use the same facade method. Business rule changes in one place.

**100,000 users →** Facade-as-BFF (Backend for Frontend): separate Facade per client type — mobile BFF assembles smaller payloads optimised for mobile; desktop BFF assembles richer data; both call the same downstream services but aggregate differently; reduces round trips from client to server.

**10 million users →** API Gateway as infrastructure Facade: single entry point for external clients, hides internal microservices topology; clients make one call to the gateway; gateway routes, aggregates, and transforms; downstream services can change topology without clients knowing; this is the Facade pattern at the infrastructure level.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flow Facade: `PaymentFacade.initiatePayment(request)` orchestrates risk scoring + PSP selection + transaction recording + notification; one call for any payment interface (API, SDK, mobile SDK) | Orchestration Facade for multi-step payment; BFF pattern |
| Swiggy / Meesho | `OrderFacade.placeOrder(cart)` orchestrates inventory + delivery partner selection + pricing + payment + fulfilment event; Facade ensures consistent order placement across web, mobile, and partner integrations | Multi-channel consistent facade; event publishing from facade |
| Adobe / Microsoft | "Design a system for document processing pipeline" — Facade for ETL pipeline; JdbcTemplate as textbook Facade example; API Gateway as infrastructure facade | JdbcTemplate knowledge; API Gateway as Facade |
| SAP Labs | AnalyticsFacade story (7-service integration → 4-method facade; row-level security change 3 weeks → 2 days; column encryption transparent to clients) | Concrete complexity reduction and change management improvement |

---

## 10. Related Topics — What to Study Next

- **Topic 294 — Adapter Pattern** — the most commonly confused pattern with Facade; both wrap something, but for different reasons; being able to articulate the difference clearly (interface mismatch vs complexity reduction) is a key pattern literacy signal
- **Topic 310 — BFF (Backend for Frontend) Pattern** — BFF is the architectural-scale application of the Facade concept: a backend service designed specifically for one type of client (mobile vs web), hiding microservices complexity behind a client-optimised API; the BFF pattern IS Facade at the system design level
- **Topic 298 — Strategy Pattern** — Facade and Strategy are often used together: the Facade's orchestration methods sometimes use Strategy internally to handle variations in the flow (different checkout flows for different customer tiers); knowing when to inject strategy INTO a facade vs exposing multiple Facade methods is an architectural design decision

---

*Part 18 · Facade Pattern · Full Stack Interview Guide · Hruday D · 2026*
