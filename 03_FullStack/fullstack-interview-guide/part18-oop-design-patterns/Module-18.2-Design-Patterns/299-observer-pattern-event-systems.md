# Observer Pattern — Event Systems
> Part 18 — OOP, SOLID & Design Patterns · 🔥 High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Observer pattern**: defines a one-to-many dependency; when one subject (publisher) changes state, ALL its dependents (observers/subscribers) are automatically notified; publisher doesn't know who its observers are — only that they implement the observer interface
- **Key decoupling**: publisher has NO direct dependency on subscribers; it holds a list of `Observer` references; subscribers register themselves; publisher calls `observer.update()` for all registered — doesn't import any observer's class
- **Spring ApplicationEventPublisher**: `events.publishEvent(new OrderPlacedEvent(order))` — Spring dispatches to all `@EventListener` methods; publisher doesn't know which classes are listening; listeners don't know which publisher published; pure decoupling
- **Synchronous vs async**: by default, Spring event listeners are synchronous (same thread, same transaction); add `@Async` for async dispatch; add `@TransactionalEventListener(phase = AFTER_COMMIT)` to only trigger after the publishing transaction commits (prevents phantom notifications for rolled-back transactions)
- **RxJS / Angular**: `Subject.next(value)` = publish; `subject.subscribe(val => ...)` = observe; `BehaviorSubject` = Subject that always emits the LAST value to new subscribers (current state)
- **Kafka/messaging at scale**: Kafka is the infrastructure-level Observer — producer publishes, N consumer groups observe; each consumer group is an independent observer; producer doesn't know about consumers; this is the Observer pattern distributed across services

---

## 1. One-Line Definition
Observer establishes a publish-subscribe relationship where subjects notify a dynamic set of observers on state change, eliminating direct coupling between the source of the change and all the reactions to it.

---

## 2. The Problem It Solves

**Without Observer:**
```java
// OrderService must call every downstream service DIRECTLY
public void placeOrder(Order order) {
    orders.save(order);
    inventoryService.reserve(order);         // coupled
    emailService.sendConfirmation(order);    // coupled
    loyaltyService.addPoints(order);         // coupled
    analyticsService.trackOrder(order);      // coupled
    // New service needed? Edit this method. Every downstream is a direct import.
    // Inventory down? Order fails. Email slow? Order is slow.
}
```

**With Observer:**
```java
public void placeOrder(Order order) {
    orders.save(order);
    events.publishEvent(new OrderPlacedEvent(order));
    // Zero knowledge of who observes. 4 handlers run independently.
    // Add a new service: it registers its own listener — OrderService unchanged.
}
```

---

## 3. How It Works Internally

```
Subject (OrderService)
  - holds: ApplicationEventPublisher
  - on placeOrder: publishEvent(OrderPlacedEvent)

SpringApplicationEventPublisher
  - maintains: Map<EventType, List<EventListener methods>>
  - dispatches synchronously (or async if @Async)
  - finds all @EventListener methods matching OrderPlacedEvent

Observers (independent Spring beans):
  - InventoryHandler.onOrderPlaced(@EventListener)
  - EmailHandler.onOrderPlaced(@EventListener)
  - LoyaltyHandler.onOrderPlaced(@EventListener)
  - AnalyticsHandler.onOrderPlaced(@EventListener)

OrderService has ZERO direct knowledge of any handler class.
Adding a new observer: new class + @EventListener method. OrderService not touched.
```

---

## 4. The Code

### Wrong Way — Direct Coupling to All Downstream Services

```java
// ❌ OrderService directly calls all downstream: tight coupling, slow, fragile

@Service
public class OrderService {
    // ❌ Direct injection of every downstream — 5 already, growing
    private final InventoryService inventory;
    private final EmailService email;
    private final LoyaltyService loyalty;
    private final AnalyticsService analytics;
    private final AuditService audit;
    
    // ❌ When FraudService is added next sprint: inject + call + test here
    
    @Transactional
    public void placeOrder(Order order) {
        orders.save(order);
        
        inventory.reserve(order);          // ❌ if inventory is slow, order is slow
        email.sendConfirmation(order);     // ❌ if email is down, order fails (!)
        loyalty.addPoints(order);          // ❌ loyalty bug can crash order placement
        analytics.trackOrder(order);       // ❌ analytics outage blocks orders
        audit.logOrder(order);             // ❌ audit service down = orders fail
        
        // Testing: mock 5 services for even basic order placement test
        // Every new downstream = add import + field + constructor arg + test mock
    }
}
```

```java
// ✅ OBSERVER PATTERN with Spring ApplicationEventPublisher

// 1. Domain event — a record of what happened in the domain
public class OrderPlacedEvent {
    private final Order order;
    private final Instant occurredAt;
    
    public OrderPlacedEvent(Order order) {
        this.order      = order;
        this.occurredAt = Instant.now();
    }
    public Order getOrder() { return order; }
    public Instant getOccurredAt() { return occurredAt; }
}

// 2. Subject (publisher) — no knowledge of who observes
@Service
public class OrderService {
    private final OrderRepository orders;
    private final ApplicationEventPublisher events;   // ← ONE dependency, not five
    
    public OrderService(OrderRepository orders, ApplicationEventPublisher events) {
        this.orders = orders;
        this.events = events;
    }
    
    @Transactional
    public void placeOrder(Order order) {
        orders.save(order);
        events.publishEvent(new OrderPlacedEvent(order));
        // ← Done. Observers handle the rest.
        // Testing: mock ApplicationEventPublisher and verify event was published.
        // No need to mock inventory, email, loyalty, analytics, audit.
    }
}

// 3. Observers — each in its own class, independently deployable logic

@Component
class InventoryHandler {
    private final InventoryService inventory;
    
    public InventoryHandler(InventoryService inventory) { this.inventory = inventory; }
    
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    // ← Only runs AFTER the order transaction commits — no phantom reservation on rollback
    public void onOrderPlaced(OrderPlacedEvent event) {
        inventory.reserve(event.getOrder());
    }
}

@Component
class OrderNotificationHandler {
    private final EmailService email;
    
    @Async  // ← async: doesn't block the order placement thread
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        email.sendConfirmation(event.getOrder().getCustomerEmail(), event.getOrder());
    }
}

@Component
class LoyaltyHandler {
    private final LoyaltyService loyalty;
    
    @Async
    @EventListener  // ← transactional nuance not needed for loyalty (best-effort)
    public void onOrderPlaced(OrderPlacedEvent event) {
        loyalty.addPoints(event.getOrder().getCustomerId(), event.getOrder().getTotalAmount());
    }
}

// ✅ Adding FraudDetectionHandler next sprint: new class. Zero changes to OrderService.
@Component
class FraudDetectionHandler {
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)  
    public void onOrderPlaced(OrderPlacedEvent event) {
        fraudService.assessRisk(event.getOrder());
    }
}
```

```java
// ✅ @TransactionalEventListener — critical distinction

@Service
public class UserService {
    @Transactional
    public void registerUser(User user) {
        users.save(user);
        events.publishEvent(new UserRegisteredEvent(user));
        // If we throw here → transaction ROLLS BACK
        // With @EventListener: WelcomeEmailHandler would have already been called
        //   even for the rolled-back user — phantom email sent to user who isn't registered!
        // With @TransactionalEventListener(AFTER_COMMIT): handler only runs if commit succeeds
        //   no phantom emails for rolled-back registrations
        if (needsApproval(user)) {
            throw new PendingApprovalException("User requires manual approval");
            // Transaction rolls back — user NOT saved — @TransactionalEventListener handler NOT called ✅
        }
    }
}

@Component
class WelcomeEmailHandler {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    // ✅ Only runs if the publishEvent's transaction committed successfully
    public void onUserRegistered(UserRegisteredEvent event) {
        email.sendWelcome(event.getUser());
    }
}
```

```typescript
// ✅ TypeScript/Angular — Observer pattern with RxJS

// Manual Observer for decoupled component communication
class CartService {
    private cartSubject = new BehaviorSubject<CartItem[]>([]);
    
    // Observable — components SUBSCRIBE, CartService doesn't call them directly
    cart$ = this.cartSubject.asObservable();
    
    addItem(item: CartItem) {
        const current = this.cartSubject.getValue();
        this.cartSubject.next([...current, item]);
        // All subscribers automatically notified — CartService doesn't know who subscribes
    }
    
    removeItem(productId: string) {
        const updated = this.cartSubject.getValue().filter(i => i.productId !== productId);
        this.cartSubject.next(updated);
    }
}

// Three independent observers — CartService has zero knowledge of any of them

@Component({ selector: 'app-cart-badge', template: '<span>{{ count$ | async }}</span>' })
class CartBadgeComponent {
    count$ = this.cartService.cart$.pipe(map(items => items.length));
    constructor(private cartService: CartService) {}
}

@Component({ selector: 'app-cart-total', template: '<span>{{ total$ | async | currency }}</span>' })
class CartTotalComponent {
    total$ = this.cartService.cart$.pipe(
        map(items => items.reduce((sum, i) => sum + i.price * i.qty, 0))
    );
    constructor(private cartService: CartService) {}
}

@Component({ selector: 'app-recommender', template: '...' })
class RecommendationComponent implements OnInit, OnDestroy {
    private sub!: Subscription;
    
    constructor(private cartService: CartService, private recs: RecommendationService) {}
    
    ngOnInit() {
        this.sub = this.cartService.cart$.subscribe(items => {
            this.recs.updateRecommendations(items.map(i => i.productId));
        });
    }
    
    ngOnDestroy() { this.sub.unsubscribe(); }  // ← always unsubscribe to prevent memory leak
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the Observer pattern and how does it reduce coupling?"

**Hruday's answer:**
> Observer defines a one-to-many relationship: one publisher (subject) maintains a list of observers; when it changes state, it notifies all observers uniformly through their interface.
>
> The coupling reduction is mutual:
> - The publisher doesn't import or know about any specific observer class; it holds a list of `Observer` references, not concrete types; adding a new observer doesn't change the publisher at all
> - Each observer is independent from other observers — they don't know about each other; adding or removing one observer doesn't affect others
>
> In Spring, `ApplicationEventPublisher.publishEvent(event)` embodies this: `OrderService` publishes `OrderPlacedEvent`; it has no knowledge of `InventoryHandler`, `EmailHandler`, `LoyaltyHandler`. Each handler class registers itself by having an `@EventListener` method. If I add `FraudDetectionHandler` next sprint, zero changes to `OrderService`.
>
> The contrast: without Observer, `OrderService` directly calls 5 services; a 6th service means editing `OrderService`. With Observer: unlimited observers, zero OrderService changes.

---

### Q2 — Deep Dive
**Interviewer asks:** "What's the difference between @EventListener and @TransactionalEventListener in Spring?"

**Hruday's answer:**
> `@EventListener` fires synchronously, inline with the event publishing code. If the publisher is inside a `@Transactional` method, the listener runs BEFORE the transaction commits. This means if the transaction later rolls back, the listener has already run — potentially with side effects (sent an email, reserved inventory) that can't be undone.
>
> `@TransactionalEventListener` defers execution until AFTER a specific transaction phase. The default phase is `AFTER_COMMIT`: the listener only runs if the publishing transaction has committed successfully. If the transaction rolls back, the listener never runs.
>
> The practical case: `OrderService.placeOrder()` saves the order and publishes `OrderPlacedEvent`. If a subsequent validation fails and the transaction rolls back, the order was never saved. With `@EventListener`, `InventoryHandler` would have already reserved stock for an order that doesn't exist. With `@TransactionalEventListener(AFTER_COMMIT)`, the inventory reservation only happens after the order is committed — no phantom reservations.
>
> The `BEFORE_COMMIT` phase is useful for final validation that must happen inside the transaction (e.g., check a condition one more time before commit). `AFTER_ROLLBACK` is for compensation/cleanup actions.

---

### Q3 — Application
**Interviewer asks:** "How does Kafka implement the Observer pattern at the microservices level?"

**Hruday's answer:**
> Kafka is the distributed Observer pattern.
>
> The Kafka producer publishes to a topic. It doesn't know who consumes from it — no direct coupling. A consumer group subscribes to a topic, receives and processes messages. Multiple consumer groups can independently subscribe to the same topic — each group processes every message independently, just like multiple observers in the classic pattern.
>
> The key advantages over synchronous Observer:
> - Temporal decoupling: consumers don't need to be running when the producer publishes; messages are durable; consumer can catch up when it recovers
> - Scale decoupling: each consumer group scales independently; the producer doesn't need to wait for slow consumers
> - Fault isolation: a failing consumer group doesn't affect the producer or other consumer groups; the failing group falls behind (increasing consumer lag) but doesn't break the producer
>
> In the Observer pattern terms: Kafka topic = subject/publisher; producer = the code calling `publishEvent`; consumer group = each observer class; Kafka broker = Spring's event dispatcher (but durable and distributed).
>
> The same `@TransactionalEventListener` vs `@EventListener` concern applies at the Kafka level: use transactional outbox pattern (write event to DB in same transaction, separate relay reads and publishes to Kafka) to avoid publishing events for transactions that rolled back.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Observer is always async | "When you publish an event, all listeners run asynchronously" | Spring's `@EventListener` is SYNCHRONOUS by default — runs in the same thread, inside the same transaction; it only becomes async when you add `@Async`; not knowing this default causes bugs where developers assume listeners are non-blocking but are actually adding latency to the publishing thread; always declare `@Async` explicitly when you want async behaviour |
| Memory leaks in Observer | "I just subscribe to observables and don't worry about cleanup" | A subscriber that never unsubscribes holds a reference to the subscriber object; if the subject lives longer than the subscriber (a global event bus vs a short-lived component), the subscriber is never garbage collected — memory leak; in Angular/React, always unsubscribe in `ngOnDestroy`/`useEffect` cleanup; with Spring `@EventListener`, the listener is a Spring-managed singleton and lives as long as the context — no leak; but with manual Observer lists, storing listener lambdas that close over component state can leak component memory |
| Spring events are in-memory only | "Spring events are great for microservices communication" | Spring's `ApplicationEventPublisher` is in-memory, within a single JVM; it cannot communicate between microservices; if the JVM crashes between the event publish and listener execution, the event is lost; for reliable cross-service communication, use Kafka, RabbitMQ, or a transactional outbox pattern; using Spring events within a SINGLE microservice for internal decoupling is correct; using them for cross-service communication is a design mistake |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, the order management service directly called six downstream services: inventory reservation, confirmation email, loyalty points, analytics tracking, warehouse routing, and the ERP sync. The `placeOrder` method had 6 direct service calls after the order save — 6 injected beans, 6 method calls, 6 points of potential failure.
>
> When the ERP sync service introduced a bug that added a 3-second delay and occasional timeouts, EVERY order placed took 3+ seconds. The ERP team's deployment broke the order placement SLA for all customers. The two teams' deployment schedules were operationally coupled.
>
> We moved to Spring events with `@TransactionalEventListener(AFTER_COMMIT)`. The `placeOrder` method became: save order, publish `OrderPlacedEvent`.
>
> Four listeners (`@Async`): inventory, email, loyalty, analytics. Two listeners (non-async, still needed in same flow): warehouse routing and ERP sync — but now in retry-backed queues via Kafka, not direct synchronous calls from the order thread.
>
> Order placement P99 from 3,200ms to 180ms (88% reduction — no longer blocked by downstream latency). The ERP sync team's deployments no longer affected order placement latency. A new 'Sales Reporting' team added a listener without pulling us into any PR review — classic Observer OCP."

---

## 8. Scale Evolution

**1,000 users →** Spring `@EventListener` / `@Async` for in-process decoupling. Publisher tests verify event was published with correct payload. Handler tests verify handlers react correctly to events. No direct coupling between order service and downstream logic.

**100,000 users →** `@TransactionalEventListener(AFTER_COMMIT)` prevents phantom events for rolled-back transactions. Async listeners prevent downstream latency from bleeding into the primary request path. Multiple independent observer classes = independent scaling of handlers.

**10 million users →** Kafka as Observer infrastructure: durable events survive producer crash; consumer groups process independently; each consumer group scales horizontally; event replay for new consumer groups (catch-up reads from oldest offset); exactly-once semantics with transactional producers and consumers; Kafka is why subject-observer decoupling works at hyperscale without data loss.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | `PaymentCompletedEvent` → inventory release + email + rewards + fraud flagging; `@TransactionalEventListener` prevents phantom events on payment rollback | Transactional event listener; payment event design |
| Swiggy / Meesho | `OrderAssignedEvent` → notifications to customer/driver/store; `DeliveryStatusChangedEvent` → customer app update + SLA tracking + analytics; Kafka for cross-service | Multi-observer event fan-out; Kafka as distributed Observer |
| Adobe / Microsoft | Observer as reactive state management (RxJS, React state); `BehaviorSubject` vs `Subject` distinction; memory leak prevention in Angular; EventEmitter anti-patterns | RxJS Subject types; subscription cleanup |
| SAP Labs | 6-service direct call → events story (88% P99 reduction; ERP deployment no longer affects orders; sales reporting team self-served listener with zero PR coordination) | Measurable decoupling benefit; operational independence of teams |

---

## 10. Related Topics — What to Study Next

- **Topic 282 — Implement EventEmitter / PubSub** — implementing a pub-sub system from scratch (as a coding challenge) tests the same Observer pattern knowledge; `on/off/emit/once` are the Observer/Subject methods under different names; knowing the pattern makes the implementation obvious
- **Topic 300 — Chain of Responsibility** — Chain of Responsibility and Observer are two different models for "one event, multiple handlers": in Observer, ALL handlers receive the notification; in Chain of Responsibility, handlers pass the request along and ONE handler claims it (or passes if it can't handle); Spring Security filters are Chain of Responsibility, not Observer
- **Topic 278 — BFS and DFS Templates** — in Angular/React, the component tree is a tree, and change detection is a traversal: Angular's default change detection walks the component tree depth-first observing `@Input` changes; understanding Change Detection as Observer (components observe data changes) and as DFS tree traversal connects frontend runtime behaviour to DSA concepts

---

*Part 18 · Observer Pattern — Event Systems · Full Stack Interview Guide · Hruday D · 2026*
