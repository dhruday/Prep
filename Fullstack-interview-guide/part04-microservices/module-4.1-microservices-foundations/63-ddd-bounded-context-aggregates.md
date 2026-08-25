# Domain-Driven Design (DDD) — Bounded Contexts, Aggregates, Entities
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- DDD = a design philosophy for building software that models the real business domain — uses the business team's language as the design language; the structure of the code follows the structure of the business
- **Bounded Context**: a boundary within which a specific "ubiquitous language" (shared vocabulary) is consistent — same word can mean different things in different contexts (an "Account" means different things in Banking vs Shipping)
- **Aggregate**: a cluster of related entities treated as a single unit for data changes — has one root entity (Aggregate Root) that is the only public entry point — guarantees consistency within the boundary
- **Entity**: an object with a unique identity that persists over time — a Customer is an entity (same customer can change their email, still same customer)
- **Value Object**: an object with no identity — defined purely by its value — an Address or Money amount is a Value Object (two addresses with the same street are equal — there is no "Address #42")
- Gap to bridge: DDD is the theoretical framework behind why decomposing services by business capability (Topic 62) works — it gives the formal vocabulary to describe and justify those boundaries

---

## 1. One-Line Definition
Domain-Driven Design (DDD) is a software design approach where the structure of the code, the boundaries of the system, and the language used in code (class names, method names, variable names) all directly reflect the business domain and its rules — not database tables or technical layers.

---

## 2. The Problem It Solves

The year is 2012. A major bank has a codebase with 3,000 classes. The classes are named: `AccountTable`, `AccountHelper`, `AccountManager`, `AccountUtil`, `AccountService`, `AccountFacade`, `AccountValidator`, `AccountController`. There are also `TransactionBean`, `TransactionDTO`, `TransactionManager`, `TransactionProcessor`...

A new developer joins. They want to understand how a bank transfer works. They read `AccountHelper` — it handles display logic. `AccountManager` — it handles database operations. `AccountService` — it handles some business rules. `AccountFacade` — it's unclear. The business logic is scattered, named by technical role (helper, manager, util) with no business meaning.

The business analyst describes the domain as: "A current Account has a balance. A customer can initiate a Transfer from one Account to another, which creates a Debit and a Credit transaction, and the net must never exceed the Overdraft Limit." This language exists only in conversations and Word documents — it is not reflected in the code at all.

DDD solves this by making the code speak the business language:
- `Account` class — not `AccountManager` — simply represents an account
- `Account.transfer(Money amount, Account target)` — clearly expresses the business operation
- `OverdraftLimitExceededException` — the domain rule is in the code
- `Transaction` — contains `Debit` and `Credit` as first-class concepts

When code speaks the domain language, business analysts and developers can communicate directly using the same words. Bugs are easier to trace. New requirements map clearly to existing code. Service boundaries are obvious.

---

## 3. How It Works Internally

### The Building Blocks

**Ubiquitous Language**
The shared vocabulary agreed upon by developers AND business people in a specific context. Every class name, method name, and variable name uses this language. If the business says "Order" and developers call it "Purchase Request", fix the code to say "Order".

Example: A financial system's ubiquitous language might include: "Account", "Balance", "Debit", "Credit", "Statement", "Overdraft Limit". These exact words should appear in code — not "account_record", "amount_stored", "subtract_from_balance".

**Bounded Context**
A boundary within which the ubiquitous language is consistent and unambiguous. Outside the boundary, the same word may mean something different.

```
E-commerce platform — same word "Product" in three bounded contexts:

Catalog Context:         "Product" = name, description, images, category, SEO tags
Inventory Context:       "Product" = SKU, warehouse location, stock count, reorder point
Pricing Context:         "Product" = base price, tax category, promotional rules, price history

These are three DIFFERENT objects with the SAME business name.
In a monolith, you'd force them into one table and get a messy entity with 40 columns.
In microservices, each context becomes a service with its own "Product" data model.
```

**Entity**
An object with a unique identity that persists and changes over time. The identity is what matters — attributes can change, but the entity remains the same.

- Customer (has a CustomerID — same customer even if they change name, email, address)
- Order (has an OrderID — same order even as status changes from Placed → Paid → Shipped)
- Account (has AccountNumber — same account through all transactions)

**Value Object**
An object with no identity — defined entirely by its data. Two Value Objects with the same data are equal. They are immutable.

- Money (100 USD = 100 USD — there is no "Money #42"; they are equal by value)
- Address (same street + city + postcode = same address for shipping purposes)
- DateRange (Jan 1 to Jan 31) — two date ranges covering the same dates are equal
- Color, Coordinate, PhoneNumber, EmailAddress — all Value Objects

**Aggregate**
A cluster of entities and value objects that must always be consistent together. The outer boundary of an aggregate is enforced by an Aggregate Root entity.

Rules of aggregates:
1. Only the Aggregate Root has a global identity that can be referenced from outside
2. Objects outside the aggregate can only hold a REFERENCE (ID) to the root — never a direct reference to inner parts
3. All modifications to the aggregate go THROUGH the root — the root enforces invariants
4. Each aggregate is a transaction boundary — changes to one aggregate must be atomic

```
Order Aggregate:
┌─────────────────────────────────────────────────┐
│  AGGREGATE ROOT: Order (orderId, status, total) │
│                                                 │
│  Entity: OrderItem (itemId, productId, qty, price)│
│  Entity: OrderItem                              │
│  Value Object: ShippingAddress (street, city)   │
│  Value Object: Money (amount, currency)         │
│                                                 │
│  Rule enforced by root:                         │
│  - total must always equal sum of item prices   │
│  - cannot add items if order is CONFIRMED       │
│  - can only have 1-99 items                     │
└─────────────────────────────────────────────────┘

PaymentAggregate:
┌─────────────────────────────────────────────────┐
│  AGGREGATE ROOT: Payment (paymentId, orderId)   │
│  Value Object: Money (chargedAmount, currency)  │
│  Value Object: PaymentMethod (card, upi, netBanking)│
│  Status: PENDING → PROCESSING → COMPLETED       │
└─────────────────────────────────────────────────┘

Payment stores orderId (reference to Order root by ID only).
Payment does NOT have a Java reference to Order object.
Order does NOT have a Java reference to Payment object.
Cross-aggregate reference = always by ID, never by object reference.
```

### Domain Services vs Application Services

**Domain Service**: business logic that doesn't naturally belong to any single entity. Example: `TransferService.transfer(sourceAccount, targetAccount, amount)` — the logic spans two Account entities; it doesn't belong in either one.

**Application Service**: orchestrates the use case — loads aggregates, calls domain services, saves changes, fires events. No business logic lives here. Thin orchestration layer only.

### Domain Events
When something significant happens in the domain, a Domain Event is raised. These events are facts — past tense — things that HAVE happened: `OrderPlaced`, `PaymentFailed`, `ItemShipped`. Other parts of the system can react to these events without creating direct coupling.

---

## 4. The Code

### Value Objects — Immutable, Defined by Value
```java
// Money is a Value Object — no identity, defined by its value, immutable
@Value  // Lombok — generates equals, hashCode, toString, all-args constructor, getters
public class Money {
    private final BigDecimal amount;
    private final Currency currency;

    // Factory method with validation — guards domain invariant
    public static Money of(BigDecimal amount, Currency currency) {
        if (amount == null) throw new IllegalArgumentException("Amount cannot be null");
        if (currency == null) throw new IllegalArgumentException("Currency cannot be null");
        if (amount.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("Amount cannot be negative");
        return new Money(amount, currency);
    }

    // Business operation returns NEW instance — immutable
    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new CurrencyMismatchException("Cannot add " + currency + " and " + other.currency);
        }
        return Money.of(this.amount.add(other.amount), this.currency);
    }

    public boolean isGreaterThan(Money other) {
        if (!this.currency.equals(other.currency)) throw new CurrencyMismatchException("Cannot compare");
        return this.amount.compareTo(other.amount) > 0;
    }
}

// Usage is expressive — reads like business language
Money price = Money.of(new BigDecimal("999.00"), Currency.getInstance("INR"));
Money discount = Money.of(new BigDecimal("100.00"), Currency.getInstance("INR"));
Money finalPrice = price.add(discount.negate());
```

### Aggregate Root — Enforces Invariants
```java
// Order is the Aggregate Root — it owns OrderItems and enforces consistency
@Entity
@Table(name = "orders")
public class Order {  // Aggregate Root

    @Id
    private OrderId id;  // Value Object wrapping UUID — explicit type, not raw Long

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Embedded
    private ShippingAddress shippingAddress;  // Value Object — snapshot at order time

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    // Domain invariant: cannot add items to a confirmed order
    public void addItem(ProductId productId, Money price, int quantity) {
        if (this.status != OrderStatus.DRAFT) {
            throw new OrderNotModifiableException("Cannot add items to a " + status + " order");
        }
        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be positive");
        if (quantity > 99) throw new IllegalArgumentException("Maximum 99 items per line");
        this.items.add(new OrderItem(productId, price, quantity));
    }

    // Domain invariant: order must have at least one item to be placed
    public void place() {
        if (this.items.isEmpty()) throw new EmptyOrderException("Cannot place an empty order");
        if (this.shippingAddress == null) throw new MissingAddressException("Shipping address required");
        this.status = OrderStatus.PLACED;
        // Raise domain event — other services react via event bus
        DomainEvents.raise(new OrderPlacedEvent(this.id, this.getTotal(), LocalDateTime.now()));
    }

    // Derived value — always consistent because root controls items
    public Money getTotal() {
        return items.stream()
                    .map(item -> item.getPrice().multiply(item.getQuantity()))
                    .reduce(Money.ZERO_INR, Money::add);
    }

    // External code accesses ONLY through the root — never directly touching OrderItem
    public List<OrderItemView> getItemViews() {
        return items.stream().map(OrderItemView::from).collect(Collectors.toList());
    }
}
```

### Application Service — Thin Orchestration
```java
// Application service: no business logic — only orchestration
// Loads aggregate → calls domain methods → persists → fire events
@Service
@Transactional
public class PlaceOrderApplicationService {

    private final OrderRepository orderRepository;      // persist the aggregate
    private final ProductPricingClient pricingClient;  // external service call
    private final EventPublisher eventPublisher;        // publish domain events

    public OrderId placeOrder(PlaceOrderCommand command) {
        // Step 1: Load or create aggregate
        Order order = new Order(OrderId.generate(), command.getUserId(), command.getShippingAddress());

        // Step 2: Delegate business logic TO the aggregate — not inline here
        for (PlaceOrderCommand.Item item : command.getItems()) {
            Money price = pricingClient.getCurrentPrice(item.getProductId());
            order.addItem(item.getProductId(), price, item.getQuantity());
        }

        // Step 3: More domain logic — still delegated to aggregate
        order.place();  // enforces invariants, raises domain event internally

        // Step 4: Persist
        orderRepository.save(order);

        // Step 5: Publish domain events collected during the operation
        eventPublisher.publishAll(DomainEvents.drain());

        return order.getId();
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between an Entity and a Value Object in DDD?"

**Hruday's answer:**
> An Entity has an identity that persists over time. Even if all its attributes change, it remains the same entity because of its identity. A Customer who changes their name, email, and address is still the same Customer — identified by their CustomerID. Entities are mutable in the sense that their state can change while their identity stays the same.
>
> A Value Object has no identity — it is defined entirely by its attributes. Two addresses with the same street, city, and postcode are completely equal — there is no "Address #42". Value Objects should be immutable — instead of modifying a Money value, you create a new Money with the updated amount. This immutability prevents subtle bugs where multiple parts of the system share a reference to the same Money object and one of them changes it.
>
> The practical test: "Does this object need to be tracked as an individual thing, or is it just a measurement?" A temperature reading, a coordinate, an email address — these are Value Objects. An order, a customer, a bank account — these are Entities because we need to track them as specific things over time.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is an Aggregate and why is the Aggregate Root important?"

**Hruday's answer:**
> An Aggregate is a cluster of entities and value objects that must always be consistent with each other. The Aggregate Root is the outer boundary of that cluster — the only object in the aggregate that external code can hold a reference to.
>
> The purpose of the Aggregate Root is to enforce invariants — business rules that must always be true within the aggregate. For an Order aggregate, the invariant might be: "the total must equal the sum of all item prices times quantities, and no items can be added after the order is placed." By routing all modifications through the Aggregate Root, we guarantee that these invariants are checked on every change.
>
> The critical rule: external code can only REFERENCE the root by ID — never hold a direct object reference to inner parts of the aggregate. If PaymentService needs to cancel an Order, it sends a command to OrderService using the OrderID. PaymentService never has a direct Java object reference to an OrderItem. This is what creates the clean boundary.
>
> Aggregates are also the transaction boundary. You should only change ONE aggregate per database transaction. If a business operation requires changing two aggregates, it either means the aggregates are in the wrong boundary — maybe they should be one aggregate — or the consistency between them should be eventual, handled via domain events and a saga pattern.

---

### Q3 — DDD and Microservices Connection
**Interviewer asks:** "How does DDD relate to microservices service boundaries?"

**Hruday's answer:**
> DDD Bounded Contexts map very naturally to microservice boundaries — but they are not the same thing. A bounded context is a design boundary; a microservice is a deployment boundary. You can have bounded contexts inside a monolith — many teams do this as a first step. Only when you need independent deployment, team autonomy, or different scaling requirements should you promote a bounded context to a separate service.
>
> The practical connection: when you are designing microservices and asking "where do we draw the line?", DDD gives you a systematic answer. Find where different teams use the same word to mean different things — that is a context boundary. Find where one aggregate's invariants depend on another aggregate's state — if that dependency is tight, they might belong in the same service; if it's loose, they are good candidates for separate services.
>
> For example: in a ride-sharing app, "Driver" in the Fleet Management context has data about vehicle compliance, license expiry, and background check status. "Driver" in the Dispatch context has real-time location and availability. These are two different models of the same real-world entity. Fleet Management and Dispatch become separate bounded contexts, and excellent candidates for separate microservices because they have different teams, different change rates, and very different scaling profiles — Dispatch processes thousands of events per second while Fleet Management is almost static.

---

### Q4 — Scenario
**Interviewer asks:** "You have an e-commerce Order that contains items, payment info, and shipping address. How do you model this as DDD aggregates?"

**Hruday's answer:**
> I would model this as three distinct aggregates, not one mega-aggregate, for these reasons:
>
> **Order Aggregate** (root: Order): contains OrderItems and ShippingAddress as a snapshot. ShippingAddress is a Value Object — an immutable snapshot of the address at order time. If the customer changes their address in their profile later, this order's address stays the same. This is an intentional design: the address this order will be delivered to is fixed the moment the order is placed.
>
> **Payment Aggregate** (root: Payment): owns the payment method and financial transaction history. It stores OrderID as a reference to the Order aggregate — but it does NOT embed Order data. Why separate? Payment has completely different invariants, a different lifecycle, and a different failure domain. Payment processing failures should not affect Order status management.
>
> **Shipment Aggregate** (root: Shipment): owns the physical delivery — carrier, tracking number, estimated delivery, actual delivery. Contains a copy of ShippingAddress (from the Order, passed at creation time). Shipment lifecycle is independent: an Order can be placed and paid before a Shipment is created; a Shipment can be delivered while Order status is still "Processing" in a legacy system.
>
> The integration between these aggregates is via Domain Events — `OrderPlaced` triggers Payment creation, `PaymentConfirmed` triggers Shipment creation. No direct object references cross aggregate boundaries. Each aggregate is a separate transaction scope.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Aggregate = database table" | "Each table is an aggregate" | "A database table is a storage detail. An Aggregate is a domain concept. Order and OrderItem might be two tables, but they are one aggregate because they must always be consistent together. The aggregate boundary drives the database schema design — not the other way around." |
| "Huge aggregates for safety" | "Include everything in one aggregate to avoid consistency problems" | "Large aggregates are a performance anti-pattern. Every write to the aggregate locks the entire thing. An Order with 10,000 historical status changes and 500 items is impractical as a single aggregate. Break it at business invariant boundaries: the Order aggregate doesn't need the full Payment history — it just needs to know If payment succeeded (a status flag)." |
| "DDD = complex, only for large systems" | "DDD is over-engineering for small projects" | "The core DDD concepts — ubiquitous language, keeping code close to the business language — are valuable at any size. The tactical patterns (Aggregates, Repositories, Domain Events) have a learning curve but pay off when the domain is complex. The key signal: if your business rules are complex and your codebase is growing, DDD prevents the logic from leaking into controllers and utilities." |
| "Value Objects must be primitive" | "Value Objects are just DTOs with no methods" | "Value Objects are full domain objects. They contain behaviour. A Money object knows how to add itself to another Money, compare itself, convert currencies, and reject invalid states. A DateRange knows whether it contains a given date. The point is that behaviour lives IN the value object, not scattered across static utility classes." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, working on the ERP system, we had a classic DDD anti-pattern in our codebase: a single `Product` class with 65 fields covering everything from procurement metadata to sales pricing to warehouse bin location. Every team that touched it added their fields to the same class. Loading a product for display purposes pulled the entire 65-field object from the database even when we only needed name and description. When we refactored, we split it into bounded contexts: `ProductCatalog` (display data), `ProductPricing` (financial data), `ProductInventory` (warehouse data). Each context got its own smaller class, its own table, its own service. Queries got 5x faster. Teams could deploy their context independently. That was a practical DDD bounded context split before I had the vocabulary to call it that."

---

## 8. Scale Evolution

**1,000 users →** Use DDD vocabulary in a monolith — ubiquitous language, aggregate boundaries as package boundaries. No separate deployments needed yet. The discipline of modelling boundaries now makes future extraction clean.

**100,000 users →** Extract the highest-change-rate bounded context first (typically the catalog or order domain in e-commerce). Apply Aggregate and Domain Event patterns to create clean interface — other services listen for domain events instead of direct calls.

**10 million users →** Each bounded context is a separate service. Domain events flow through Kafka. Aggregates within each service enforce consistency within their boundary. Cross-aggregate consistency is managed by Saga pattern (Topic 76). Large aggregates may be further split using event sourcing to handle high write throughput.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial domain has naturally complex business rules and tight consistency requirements — exactly what DDD aggregates are designed for. Payment, Settlement, Ledger Entry, Refund are distinct aggregates with strict invariants. | "How would you model the Aggregate for a UPI payment transaction with its reversal and settlement lifecycle?" |
| Swiggy / Meesho | High-growth product domains that evolve quickly — DDD bounded contexts prevent accidental coupling as the system grows. "Order" at Swiggy is a bounded concept with clear invariants around preparation time and delivery window. | "We're adding a Schedule Later feature. Which bounded context does it belong to — Ordering, Delivery, or its own?" |
| Adobe / Microsoft | Enterprise contexts — complex domain models for document editing, permissions, collaboration. DDD aggregate patterns manage concurrent editing conflicts and permission invariants. | "How do you model a Document with nested Pages, Comments, and Permissions as DDD aggregates?" |
| SAP Labs (current) | Enterprise ERP — the birthplace of complex domain modelling. SAP's own design patterns (like Business Objects in S/4HANA) are essentially DDD aggregates. Understanding DDD gives language to describe SAP's implicit domain model explicitly. | Relevant for designing clean API boundaries in SAP extension frameworks. |

---

## 10. Related Topics — What to Study Next

- **Topic 62 — Service Decomposition Strategies** — DDD bounded contexts give the theoretical foundation for how those strategies work; if you haven't read that topic, it now makes more sense in the DDD vocabulary
- **Topic 64 — Database per Service Pattern** — each Aggregate stores its data in the service's private database; this topic covers how to design and migrate to that database-per-service model
- **Topic 76 — Saga Pattern** — when business operations span multiple Aggregates (Order + Payment + Inventory), the Saga pattern manages eventual consistency between them using domain events
- **Topic 79 — Outbox Pattern** — publishing domain events reliably requires the Outbox pattern to guarantee at-least-once delivery even if the service crashes after writing to the DB but before publishing to Kafka
- **Topic 80 — CQRS Pattern** — separating the read model from the write model in complex DDD domains is naturally expressed using Command and Query Responsibility Segregation

---

*Part 4 · Domain-Driven Design (DDD) · Full Stack Interview Guide · Hruday D · 2026*
