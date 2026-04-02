# Service Decomposition Strategies — By Domain, By Capability
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Service decomposition = deciding WHERE to draw the lines between services — the most critical architectural decision in microservices; wrong cuts create tightly coupled services that are worse than a monolith
- **By business capability**: split by what the system DOES — Order Management, Payment Processing, Inventory, Delivery Tracking; each service owns a full capability end-to-end
- **By domain (DDD bounded context)**: split by business language boundaries — where the word "Order" means something different in Logistics vs Finance is a boundary signal
- **By subdomain type**: Core domains (your competitive advantage — build them) vs Supporting (needed but not unique — consider buying) vs Generic (commodity — use SaaS)
- Wrong cut signal: two services that must always be deployed together are probably one service cut in the wrong place
- Gap to bridge: at Oracle the monolith had implicit domain boundaries in packages — learning to make those explicit as service boundaries is the skill being built here

---

## 1. One-Line Definition
Service decomposition is the design process of deciding which parts of a system become separate microservices — drawing boundaries so each service has high cohesion (related things together) and low coupling (minimal cross-service dependencies).

---

## 2. The Problem It Solves

The most common microservices mistake is cutting services too fine, too early, or along the wrong lines. A team of engineers is building a food delivery app. Excited about microservices, they create: `UserService`, `UserAddressService`, `UserPreferencesService`, `MenuService`, `MenuItemService`, `MenuCategoryService`, `OrderService`, `OrderItemService`, `OrderStatusService`...

Now every user profile page requires 5 API calls. Every order create requires 7. Services are deployed together every time because they always change together. To show a menu, OrderService calls MenuService which calls MenuCategoryService which calls MenuItemService — four network hops for one page. Performance collapses. Debugging is a nightmare. The "microservices" are actually tightly coupled nano-services with all the operational overhead and none of the independence benefits.

The right question is not "what is the smallest possible unit?" — it is "what belongs together because it changes together and serves a cohesive business purpose?" Order, OrderItem, and OrderStatus should almost certainly live in ONE OrderService — they are always read together, changed together, and have no reason to scale independently. `MenuService` owns menu, categories, and items — they are one business concept managed by one team.

---

## 3. How It Works Internally

### The Mental Model
Think of service decomposition like designing the departments of a restaurant. You have: kitchen (food preparation), front-of-house (customer seating and orders), bar (drinks), cashier (payment), and supply/logistics (ingredients). Each department has its own team, tools, and workflow. You would never create separate departments for "knife washing" and "plate washing" — they are both part of the kitchen, serve the same purpose, and change together.

The right boundaries follow business operations, not technical entities. When you reorganise the restaurant, you don't split the kitchen into "hot food kitchen" and "cold food kitchen" unless they genuinely need different staff, equipment, and management. Same principle applies to services.

### Decomposition Strategies

**Strategy 1 — By Business Capability (most common starting point)**

Business capabilities are what the system DOES — not how it does it. Identify the core functions:
- Order Management: create, update, track, cancel orders
- Payment Processing: charge, refund, reconcile
- Inventory Management: track stock, reserve, deplete
- Delivery Tracking: assign driver, track location, estimate ETA
- Notification: send SMS, email, push

Each capability maps to a service. This works well when you know the business domain well. Start here.

**Strategy 2 — By DDD Bounded Context**

Domain-Driven Design (DDD) — a way of designing systems around the business domain — introduces the concept of a "bounded context": a boundary within which a specific business language (ubiquitous language) is consistent.

The key insight: the word "Order" means different things to different teams:
- **Finance team**: an Order is a financial instrument with billing address, tax details, invoice number
- **Logistics team**: an Order is a physical package with dimensions, weight, delivery address
- **Customer team**: an Order is a status tracker — placed, confirmed, on the way, delivered

These three understandings of "Order" are different bounded contexts. They may even share the same order ID but store completely different data about it. Each context becomes a service boundary.

**Strategy 3 — By Volatility / Change Rate**

Group things that change at the same rate together; separate things that change at different rates. The product catalog changes once a week. The pricing engine changes hourly for promotions. The user authentication system barely changes after stabilisation. Different change rates → different services → different deployment frequencies.

**Strategy 4 — By Team (Conway's Law)**

Conway's Law states: "Organisations design systems that mirror their own communication structure." If you have 4 teams, you will have ~4 natural service boundaries. Design the service boundaries to match how your teams work — not the other way around, which creates constant cross-team coordination for every feature.

### Wrong Cut Signals vs Right Cut Signals

```
WRONG CUT SIGNALS (you cut in the wrong place):
  ❌ Two services are always deployed together → should be one service
  ❌ One business operation always calls 5+ services in sequence → boundaries too fine
  ❌ Services share the same database tables → not actually independent
  ❌ A team owns more than 3-4 services → too granular for team operational capacity
  ❌ Service A always needs Service B's data → databases are too split
  ❌ Cross-service transactions are frequent → business domain poorly separated

RIGHT CUT SIGNALS (you found a good boundary):
  ✅ Service can be deployed independently 95%+ of the time
  ✅ One team fully owns the service — no cross-team coordination for most changes
  ✅ Service has its own clear SLA and can fail without taking others down
  ✅ Service data model makes sense in isolation — self-contained
  ✅ Different scaling requirements from its neighbours
  ✅ Could use a completely different technology stack if needed
```

### ASCII Diagram — E-Commerce Platform Decomposition

```
Customer-facing functions:
┌──────────────────────────┐   ┌──────────────────────────┐
│      User Service        │   │    Product Catalog        │
│ ─ register/login         │   │ ─ search products         │
│ ─ profile management     │   │ ─ categories & attributes │
│ ─ address book           │   │ ─ images & descriptions   │
│  [own DB: users]         │   │  [own DB: products]       │
└──────────────────────────┘   └──────────────────────────┘

Order flow:
┌──────────────┐  →  ┌──────────────┐  →  ┌──────────────┐
│ Cart Service │      │Order Service │      │Payment Svc   │
│ ─ add items  │      │ ─ placeOrder │      │ ─ charge     │
│ ─ remove     │      │ ─ status     │      │ ─ refund     │
│ ─ calculate  │      │ ─ history    │      │ ─ reconcile  │
│ [Redis]      │      │ [own DB]     │      │ [own DB]     │
└──────────────┘      └──────────────┘      └──────────────┘
                              ↓ Kafka event
┌──────────────────────────────────────────────────────────┐
│              Inventory Service                            │
│ ─ reserve stock        ─ deplete on order confirm        │
│ ─ restock notifications                                  │
│  [own DB: inventory levels]                              │
└──────────────────────────────────────────────────────────┘

Post-order:
┌──────────────────────────┐   ┌──────────────────────────┐
│    Delivery Service      │   │  Notification Service    │
│ ─ assign driver          │   │ ─ order confirmation SMS │
│ ─ track package          │   │ ─ delivery alerts        │
│ ─ ETA calculation        │   │ ─ promotional emails     │
│  [own DB: deliveries]    │   │  [templates + audit]     │
└──────────────────────────┘   └──────────────────────────┘

NOTE: Cart, Order, Payment, Inventory are related but separate services
because they: have different SLAs, scale differently, change at different
rates, and belong to different teams.
```

---

## 4. The Code

### Wrong Way — Over-Decomposed Services
```
// Over-decomposition leads to chatty services
// This is what a naive "one table = one service" decomposition looks like:

// To show a single order detail page, the UI must call:
OrderService.getOrder(42)                    → HTTP GET /orders/42
OrderItemService.getItemsForOrder(42)        → HTTP GET /order-items?orderId=42
OrderStatusService.getStatusHistory(42)      → HTTP GET /order-status-history?orderId=42
UserService.getUser(order.userId)            → HTTP GET /users/{id}
AddressService.getAddress(order.addressId)   → HTTP GET /addresses/{id}
// 5 HTTP calls for one page = 5x latency, 5x failure points, 5x network overhead

// These should all be in OrderService + UserService (2 calls max)
// Order already OWNS its items, status history, and delivery address
```
> **Why this fails in production:** Each extra service call adds network latency (5-30ms per hop), adds a failure point (any of the 5 calls can fail), and requires a circuit breaker for each one. A page that took 50ms as a monolith now takes 200-400ms. Worse — if OrderItemService is down, you cannot show the order page even though OrderService is healthy.

### Right Way — Bounded Context Decomposition
```java
// OrderService owns EVERYTHING about an order — items, status history, address
// It is a cohesive business domain — all parts change together, belong together

@Entity
@Table(name = "orders")
public class Order {
    @Id @GeneratedValue
    private Long id;
    private Long userId;          // stores user ID — NOT a JPA join to UserService
    private OrderStatus status;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "order_id")
    private List<OrderItem> items;  // owned by OrderService — one DB join, not a service call

    @Embedded
    private ShippingAddress shippingAddress;  // snapshot at order time — not a reference

    // The shipping address is a SNAPSHOT, not a reference to AddressService.
    // Why: if a user changes their address after ordering, the order should
    // still show the address it was shipped to — not the current address.
    // This is intentional data duplication with a business reason.
}

// To show the full order detail: ONE call to OrderService
// OrderService.getOrderDetail(42) returns everything in a single DB query
// No cross-service chattiness
```

```java
// Cross-service reference: store IDs, not full objects
// When Order needs to show the user's name — ask UserService once, at read time

@Service
public class OrderQueryService {

    private final OrderRepository orderRepository;
    private final UserServiceClient userServiceClient;  // HTTP client to UserService

    public OrderDetailView getOrderDetail(Long orderId, String correlationId) {
        Order order = orderRepository.findById(orderId).orElseThrow();

        // ONE cross-service call for user display name — acceptable
        // Cache this call aggressively (user name rarely changes)
        String userName = userServiceClient.getUserName(order.getUserId(), correlationId);

        return new OrderDetailView(order, userName);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do you decide the boundaries for microservices?"

**Hruday's answer:**
> I approach service boundaries by looking for natural cohesion in the business domain — what changes together should live together, and what has genuinely different concerns should be separated.
>
> My starting framework: business capabilities. List everything the system does — Order Management, Payment, Inventory, Delivery, Notifications. Each major capability is a service candidate. Within each capability, resist splitting further unless there is a clear reason: different teams, very different scaling needs, or genuinely different technology requirements.
>
> I then apply three tests to any proposed boundary. First: can this service be deployed independently without touching another service? If not, the boundary is probably wrong — they're actually part of the same domain. Second: does one team own this service entirely, without needing constant coordination with other teams for features? If not, the boundary creates cross-team friction. Third: does the service have a clear, independent failure mode — can it go down without cascading immediate failures elsewhere?
>
> The strongest signal for a wrong boundary: two services that are always deployed together. That tells you they are logically one service split artificially.
>
> I learned this by seeing the opposite at Oracle — well-structured packages within a monolith that mapped directly to what would become service boundaries. That internal structure made the right service cuts obvious.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is Conway's Law and how does it affect service design?"

**Hruday's answer:**
> Conway's Law is a 1967 observation by Melvin Conway that states: "Organisations which design systems are constrained to produce designs which are copies of the communication structures of those organisations."
>
> In plain English: your software architecture will end up mirroring how your teams talk to each other. If you have 4 teams that each work in relative isolation, your system will naturally have ~4 major components. If two teams work closely and communicate daily, the components they own will be tightly integrated. If two teams rarely talk, the interface between their components will be thin and well-defined.
>
> This has a critical implication for microservices design. You cannot just draw service boxes on a whiteboard and expect teams to reorganise around them. If Team A owns OrderService but also owns part of NotificationService because they built the order notification logic, they will keep that coupling alive — because changing it requires changing their operational habits.
>
> The architectural principle is: design your team structure and your service boundaries together, not independently. Organisations building microservices successfully (Spotify, Amazon, Netflix) invested as much in team topology as in the technical architecture. Amazon's famous "two-pizza teams" rule — no team bigger than you can feed with two pizzas — created natural service boundary pressure.
>
> If you design great service boundaries but keep the old team structure, Conway's Law predicts the teams will slowly recouple the services through shared libraries, shared databases, or implicit coordination.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When is it wrong to split a service that seems like a separate domain?"

**Hruday's answer:**
> Splitting services has real costs — more projects to manage, more deployment pipelines, more network calls, more circuit breakers, more distributed transaction complexity. I would NOT split a service when:
>
> The two "domains" always change together. If every feature request touches both, they are one domain split artificially. Building them as separate services means every feature deploy is a multi-service coordinated release — the exact deployment coupling problem microservices are supposed to solve.
>
> The data is deeply related. If you cannot show a meaningful page from one service's data without a synchronous call to the other service, they are too tightly coupled to be separate. Cart and Order are separate in e-commerce because a Cart is pre-purchase state and an Order is post-purchase committed state — they have meaningfully different lifecycles. But Order and OrderItem are the same domain; splitting them creates chattiness with no benefit.
>
> The team is too small. A two-person team owning four microservices will spend more time managing infrastructure, CI/CD pipelines, and on-call rotations than building features. Service count must scale with team capacity. Two people → one or at most two services.
>
> The domain is not yet understood. If you are still discovering how the business works — a brand-new startup — your service boundaries will be wrong. Every boundary revision in microservices is a costly cross-service refactor. Keep it as a modular monolith until the domain is stable.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the microservices for a ride-sharing application like Ola. What are the services and their boundaries?"

**Hruday's answer:**
> The core business capabilities for a ride-sharing platform translate directly to services:
>
> **User Service**: registration, login, profile, payment methods stored. Scales moderately — read-heavy. Changes infrequently after feature stability.
>
> **Driver Service**: driver profile, vehicle details, documents, ratings. Separate from User because Driver data model is fundamentally different — it has availability status, real-time location, and compliance data that User doesn't have.
>
> **Location Service**: real-time driver location ingestion, geospatial queries for "drivers near me." This is the highest-throughput service in the system — thousands of location updates per second. Needs a specialised time-series or geospatial store (Redis Geo, or PostgreSQL with PostGIS). Separated because it scales completely differently from everything else.
>
> **Matching Service**: pairs a rider's ride request with available nearby drivers. Stateful during matching — needs the output of Location Service. This is the core competitive differentiator (algorithm quality).
>
> **Trip Service**: manages the lifecycle of an active trip — started, en route, completed, cancelled. Owns trip data, route, fare calculation.
>
> **Payment Service**: fare collection, payment processing, driver payouts, refunds. Must be most reliable service in the system.
>
> **Notification Service**: SMS/push notifications for matched drivers, ETA updates, payment receipts. Stateless, fire-and-forget via Kafka.
>
> Boundary test: Location Service can go down and Trip Service continues serving in-progress trips from its own state. Notification Service going down doesn't affect the ability to book a ride. Payment going down prevents trip completion — it's in the critical path.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Split by database table" | "Each entity should be its own service" | "Splitting OrderService, OrderItemService, and OrderStatusService is over-decomposition. These entities belong to the same business concept. The rule is: split by business CAPABILITY, not by data entity. Order items are part of an order — they live in OrderService's database." |
| "DDD always means microservices" | "Use bounded contexts = split to services" | "DDD bounded contexts are design boundaries — they can exist within a monolith as separate packages. A bounded context IS NOT the same as a microservice. In a modular monolith, you can have 8 bounded contexts in one application with clean internal APIs between them. Only extract to a service when there's an operational reason (team independence, scaling)." |
| "More services = more scalable" | "More services = better architecture" | "More services = more operational complexity, more network calls, more failure points. The right number of services is the minimum needed to achieve team independence and scaling isolation. Most companies with 50 engineers and 30 microservices would be better served with 5-8 well-bounded services." |
| "Services should never share data" | "NEVER share data between services" | "Services should own their source of truth and not share databases. But it is perfectly fine for services to replicate data they need via events. NotificationService may store a denormalised copy of user email from UserService (received via Kafka event) to avoid a cross-service call at notification time. Event-driven data replication is the microservices pattern for sharing data without coupling." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, our ERP monolith had clear package boundaries: `com.oracle.erp.vendor`, `com.oracle.erp.purchases`, `com.oracle.erp.invoices`. Those package boundaries were natural service boundaries — each had its own data, its own business rules, and was owned by a different functional team. Moving to the microservices world, I now see those internal packages as what would become microservices in a distributed system. The decomposition work had already been done — it just needed formalising into deployment boundaries. This gave me a concrete mental model for how to identify service boundaries: find where the language changes, where the team changes, and where the data naturally lives."

---

## 8. Scale Evolution

**1,000 users →** A modular monolith with clean package boundaries. No operational overhead. Teams move fast. Domain knowledge is still being built — premature service boundaries will be wrong.

**100,000 users →** Extract 1-2 high-traffic or high-risk services — typically the real-time or payment domain. Keep the rest as monolith. Learn the operational patterns (service discovery, circuit breakers) without the full complexity.

**10 million users →** Full decomposition justified. Each major business capability is a service. Teams of 4-6 engineers each own 1-2 services. Load patterns are well-understood — Location Service scales 100x, Notification Service 10x, Admin/Config barely changes. Boundaries are proven by traffic data, not theoretical reasoning.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | They have 20+ microservices across payment rails, banking, merchant tools, and analytics. Service boundary questions come up when designing new payment products that must integrate with existing services. | "We need to add UPI Autopay. Is this a new service or an addition to the existing Payments service?" |
| Swiggy / Meesho | Flash sale scenarios require knowing which services are in the critical path. Wrong service decomposition means one slow service brings down order flow. | "Redesign the order flow so that a Notification Service outage doesn't block order placement." |
| Adobe / Microsoft | Large enterprise platforms with 100s of engineers. Service boundaries define team boundaries — poor decomposition creates constant cross-team coordination which kills productivity. | "How would you decompose Adobe Document Services into microservices for independent team ownership?" |
| Remote / Global roles | Service decomposition is a core distributed systems design skill asked at every senior+ interview. The ability to reason about bounded contexts and wrong-cut signals separates architects from coders. | "Draw the service boundary diagram for a Twitter-like application and justify each boundary." |

---

## 10. Related Topics — What to Study Next

- **Topic 63 — Domain-Driven Design (DDD) Basics** — bounded contexts, aggregates, and ubiquitous language are the formal vocabulary for what was described informally here — DDD gives the complete framework for service decomposition
- **Topic 64 — Database per Service Pattern** — once you define service boundaries, each service needs its own database — this topic covers how to design, migrate, and query data across those separate databases
- **Topic 61 — Monolith vs Microservices** — understand the full trade-off before committing to a decomposition — premature or wrong decomposition is worse than a monolith
- **Topic 76 — Saga Pattern** — when services are decomposed, cross-service business transactions (order + payment + inventory) need the Saga pattern instead of ACID transactions
- **Topic 84 — Distributed Tracing** — once you have multiple services, a single request touches many services; distributed tracing helps you find bottlenecks and failures across service boundaries

---

*Part 4 · Service Decomposition Strategies · Full Stack Interview Guide · Hruday D · 2026*
