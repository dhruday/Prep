# Monolith vs Microservices — Trade-offs
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Monolith**: one deployable unit — all code, all features, one database, deployed together; simple to develop and debug early on, but painful to scale and deploy at size
- **Microservices**: each business capability is a separate service with its own codebase, database, and deployment lifecycle; independently scalable but operationally complex
- The interview trap: "monolith is bad, microservices is good" — WRONG. Monolith is the right starting architecture for most products. Microservices solve specific scale and team problems at the cost of distributed system complexity
- Breaking point: microservices start making sense when deploys block multiple teams, when one feature area needs 10x more scaling than others, or when a team grows past 2-pizza size on a single codebase
- Gap to bridge: Hruday's background is monolithic Spring Boot services at Oracle and Angular/React frontends at SAP — this topic frames the architectural journey from monolith to microservices that Razorpay/Swiggy/PhonePe have already made

---

## 1. One-Line Definition
A monolith bundles all features into one deployable application; microservices break each business domain into an independently deployable, independently scalable service — the choice is about where you want the complexity to live.

---

## 2. The Problem It Solves

Imagine a food delivery app built as a monolith. The `UserService`, `RestaurantService`, `OrderService`, `PaymentService`, `DeliveryService`, and `NotificationService` all live in one Spring Boot application. One database. One deploy unit.

This works fine at the start. But three years in, you hit problems. The `OrderService` has a memory leak that brings down the entire application — including `PaymentService`, which now cannot process payments. You want to scale `OrderService` during lunch rush (50x normal load) but you must scale the entire application — including `UserService` which has no load. A team of 80 engineers all commit to the same codebase; every deploy is a merge conflict battlefield. A two-line change in the notification module requires a full application test suite run — 45 minutes — before it can go to production.

Microservices solve these exact problems: isolation (a memory leak in OrderService doesn't kill PaymentService), independent scaling (scale only the services under load), independent deployments (notification team deploys without touching the payment team). But each solution introduces new complexity: network calls instead of method calls, distributed transactions instead of local transactions, service discovery, distributed tracing, circuit breakers, eventual consistency. You are trading one set of problems for a different set of problems — the microservices set happens to scale better.

---

## 3. How It Works Internally

### The Mental Model
A monolith is like a single Swiss Army knife — one tool that does everything. Simple to carry, quick to start using, everything in one place. A microservices architecture is like a kitchen full of specialised tools — each tool does one thing extremely well, but you need a full kitchen setup (counter space, knife block, storage) before you can cook anything. The Swiss Army knife is better for camping. The kitchen is better for a restaurant.

The question is not which is "better" — it is which fits your current situation. Most startups should not start with a kitchen when they are still figuring out what to cook.

### The Mechanism — Key Characteristics Side by Side

| Dimension | Monolith | Microservices |
|-----------|----------|---------------|
| Deployment | One unit — all or nothing | Each service deploys independently |
| Scaling | Scale the whole app | Scale only what needs scaling |
| Database | One shared DB | Each service owns its data |
| Communication | Method calls (in-process) | Network calls (HTTP/gRPC/Kafka) |
| Transaction | ACID across all entities | Eventual consistency, Saga pattern |
| Testing | One test suite | Integration testing is complex |
| Team structure | All teams share one codebase | Conway's Law — one team per service |
| Failure isolation | One crash = whole app down | Service failure is isolated |
| Observability | Easy — one log file | Hard — need distributed tracing |
| Operational cost | Low | High — containers, K8s, service mesh |

### The Strangler Fig Migration Pattern
When moving from monolith to microservices, the standard approach is the Strangler Fig pattern — named after a vine that slowly grows around a tree and eventually replaces it. You don't rewrite the monolith from scratch. You extract one domain at a time into a new service. The API gateway routes `/api/orders/**` to the new OrderService; everything else still goes to the monolith. Gradually, the monolith shrinks as more domains are extracted. This is how Swiggy, Uber, and most large companies actually made the transition.

### ASCII Diagram

```
MONOLITH
┌─────────────────────────────────────────────┐
│  Single Spring Boot Application              │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  Order   │ │ Payment  │ │Notification │  │
│  │ Service  │ │ Service  │ │  Service    │  │
│  └────┬─────┘ └────┬─────┘ └──────┬──────┘  │
│       │             │              │         │
│  ─────┴─────────────┴──────────────┴──────   │
│              Shared DB (PostgreSQL)          │
└─────────────────────────────────────────────┘
One JAR. One deploy. One DB.

MICROSERVICES
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Order     │─────│   Payment   │─────│Notification │
│   Service   │HTTP │   Service   │Kafka│   Service   │
│  [Own DB]   │     │  [Own DB]   │     │  [Own DB]   │
└─────────────┘     └─────────────┘     └─────────────┘
     ▲                    ▲                    ▲
     │                    │                   │
     └────────────────────┴───────────────────┘
                     API Gateway
                     (routes traffic)
Three separate JARs. Three separate DBs. Independent deploys.
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write in Interviews
```
"We should always use microservices — monoliths don't scale."
or
"Microservices are just hype — a well-structured monolith is fine."
```
> **Why both extremes fail:** Neither answer shows architectural judgement. The interviewer wants to see you reason about trade-offs based on the specific context — team size, traffic, domain complexity, operational maturity.

### Right Way — Monolith: Well-Structured Package Layout
```java
// A well-structured monolith uses package boundaries to prepare for future extraction.
// Each domain is self-contained WITHIN the monolith — easy to extract later.

// com.company.ecommerce/
//   ├── order/
//   │    ├── OrderController.java
//   │    ├── OrderService.java
//   │    ├── OrderRepository.java
//   │    └── Order.java  (entity)
//   ├── payment/
//   │    ├── PaymentController.java
//   │    ├── PaymentService.java
//   │    ├── PaymentRepository.java
//   │    └── Payment.java
//   └── notification/
//        ├── NotificationService.java
//        └── NotificationRepository.java

// Cross-domain calls go through SERVICE interfaces — not direct repository access
// This preparation lets you later extract payment/ to its own service
// with a REST/Kafka interface replacing the direct method call

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;        // interface — easy to swap to HTTP client
    private final NotificationService notificationService;  // interface — easy to swap to Kafka

    public Order placeOrder(PlaceOrderRequest request) {
        Order order = orderRepository.save(new Order(request));

        // Internal call now — becomes an HTTP call or Kafka event when extracted
        paymentService.initiatePayment(order.getId(), order.getTotal());
        notificationService.orderPlaced(order.getId(), request.getUserEmail());

        return order;
    }
}
```

### Right Way — Microservices: Order Service Calling Payment Service via HTTP
```java
// In a microservices setup: OrderService calls PaymentService via REST
// Service-to-service HTTP call — replaces the direct method call

@Service
public class OrderService {

    // WebClient is Spring 5+ non-blocking HTTP client (replaces RestTemplate)
    private final WebClient paymentServiceClient;
    private final OrderRepository orderRepository;

    public OrderService(@Value("${services.payment.url}") String paymentServiceUrl,
                        OrderRepository orderRepository) {
        this.paymentServiceClient = WebClient.builder()
            .baseUrl(paymentServiceUrl)
            .build();
        this.orderRepository = orderRepository;
    }

    public Order placeOrder(PlaceOrderRequest request) {
        Order order = orderRepository.save(new Order(request));

        // This is now a NETWORK CALL — can fail, can be slow, needs resilience
        // Topic 71 (Circuit Breaker) wraps this
        InitiatePaymentResponse paymentResponse = paymentServiceClient.post()
            .uri("/api/v1/payments")
            .bodyValue(new InitiatePaymentRequest(order.getId(), order.getTotal()))
            .retrieve()
            .bodyToMono(InitiatePaymentResponse.class)
            .block(); // Use .subscribe() for truly non-blocking

        return order;
    }
}
```

### Configuration — Service URL in application.yml
```yaml
# Order service's application.yml
services:
  payment:
    url: ${PAYMENT_SERVICE_URL:http://payment-service:8081}
    # In K8s, service name 'payment-service' resolves via DNS
    # PAYMENT_SERVICE_URL env var overrides for local dev

spring:
  application:
    name: order-service  # registers with service discovery under this name
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are the main trade-offs between a monolith and microservices?"

**Hruday's answer:**
> The core trade-off is: simplicity of development vs independence of deployment and scaling.
>
> A monolith is one deployable unit — all features together, one database, one codebase. It is simple to develop in the early stages: you run one application locally, write cross-domain code with regular method calls, and debug with a single log stream. Transactions are ACID — consistent by default.
>
> Microservices give each domain its own service, database, and deploy lifecycle. This means you can scale OrderService 20x during a sale without touching NotificationService. One team's deploy doesn't break another team's feature. A crash in one service is isolated — it doesn't take down the whole application.
>
> The cost of microservices is real: network calls replace method calls (adding latency and failure modes), transactions become distributed (eventual consistency, Saga pattern), debugging requires distributed tracing across services, and the operational overhead is much higher — you need Kubernetes, service discovery, health checks, circuit breakers.
>
> At Oracle, I built a monolithic Spring Boot application. It worked well for the team size and traffic. Moving to SAP, I saw the micro-frontend side of this trade-off — independent teams, independent deployments. The decision always depends on the team size, traffic patterns, and operational maturity.

---

### Q2 — Deep Dive
**Interviewer asks:** "When would you migrate from a monolith to microservices? What triggers the decision?"

**Hruday's answer:**
> I would migrate when the monolith's costs outweigh its simplicity benefits — and that usually happens at specific organisational and technical triggers, not at a specific user count.
>
> The first trigger: deployment coupling. When 5 teams must coordinate every deploy because they share one codebase, deployments slow down. Each team waits for everyone else's code to be ready and tested. This is Conway's Law — your architecture mirrors your team structure. When teams need independence, services give that independence.
>
> The second trigger: scaling asymmetry. If the image-processing service needs 50 instances during peak but the user-profile service needs only 2, running them in the same monolith forces you to scale everything together. Wasteful and expensive.
>
> The third trigger: technology divergence. The ML team needs Python. The real-time service needs Node.js. Locked to a monolith language (Java), you are forced to use Java for everything.
>
> The fourth trigger: fault isolation. A memory leak in one feature area bringing down the entire platform — including payments — is unacceptable at scale. Service isolation contains blast radius.
>
> But I would NOT migrate just because "everyone's doing microservices." A well-structured modular monolith is operationally simpler and faster to develop for small teams. Premature microservices add complexity before you've validated your product.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What problems does microservices introduce that a monolith doesn't have?"

**Hruday's answer:**
> Microservices solve deployment and scaling problems but introduce distributed system problems that simply do not exist in a monolith.
>
> Network failures. A method call inside a monolith cannot fail due to a network timeout. A service-to-service HTTP call can. You need retry logic, circuit breakers, and timeouts for every service-to-service call — all of which are unnecessary in a monolith.
>
> Distributed transactions. In a monolith, a database transaction wraps the whole operation — either all changes commit or none do. In microservices, Order and Payment are separate databases. If payment succeeds but order confirmation fails, you have an inconsistent state. You need Saga pattern or two-phase commit — both are complex.
>
> Distributed tracing. When a request flows across 5 services, finding where it slowed down or failed requires correlation IDs in every log and a tracing tool like Zipkin or Jaeger. In a monolith, one log file, one stack trace.
>
> Operational complexity. Instead of deploying one JAR, you manage 15 services, each with their own Docker images, K8s manifests, health checks, and alerting rules.
>
> The summary: microservices push complexity from the application layer to the infrastructure and communication layer. That trade is worth it at scale with mature ops teams. It is not worth it for a 5-person startup validating a product.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Swiggy started as a monolith. How would you approach migrating the order management module to its own microservice?"

**Hruday's answer:**
> I would use the Strangler Fig pattern — extract one domain at a time without a big-bang rewrite.
>
> Step 1: Identify the boundaries. The order domain owns: order creation, order status updates, order history. It depends on: payment (initiates payment), restaurant (checks availability), delivery (assigns a driver), notification (sends SMS/email). Document all these integration points.
>
> Step 2: Introduce an API Gateway (or use Spring Cloud Gateway). All traffic currently hits the monolith. Route `/api/orders/**` to the new OrderService, everything else still goes to the monolith. The client sees no change.
>
> Step 3: Create the OrderService with its own database. The new service starts with the order data migrated. Dual-write temporarily — monolith and new service both write order data during the transition — until we're confident in the new service.
>
> Step 4: Replace internal calls. Where the monolith called the Order module via method call, it now calls the OrderService via REST (or publishes a Kafka event the OrderService listens to). Add a circuit breaker here immediately.
>
> Step 5: Delete the order module from the monolith once traffic is fully on the new service and all rollback windows have passed.
>
> Key: never migrate the database before the application. The application migration must be stable first.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Start with microservices" | "Microservices from day 1 for a clean architecture" | "Starting with microservices before understanding your domain boundaries is premature. You will draw the wrong service boundaries — and refactoring service boundaries later is much harder than refactoring a monolith. Start with a modular monolith, identify natural boundaries through usage, then extract services when you have a clear reason." |
| "Microservices are always more scalable" | "Microservices scale better than monoliths" | "A well-optimised monolith can scale further than poorly written microservices. The overhead of hundreds of HTTP hops between services can make microservices slower than a monolith for the same request. Scaling is about architecture, caching, and database design — not just whether you split services." |
| "One service per endpoint" | "Each REST endpoint should be its own service" | "Splitting too granularly creates nano-services — each service has minimal logic but massive networking overhead and operational cost. The right boundary is a business capability (Order management, Payment, Inventory) — not a CRUD endpoint. A service should own a full domain, not a single table." |
| "Microservices solve data consistency automatically" | "Services have their own DB — it's cleaner" | "Separate databases eliminate the shared-schema coupling problem but introduce distributed data consistency problems. Querying data across services requires either API compositions (N service calls) or event-driven read models (CQRS). Cross-service transactions require Saga pattern. These are harder problems than shared-DB joins." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, I worked on a monolithic Spring Boot application that served an ERP module — vendor management, purchase orders, invoices. It was well-structured internally but all deployed as one unit. I saw firsthand how a memory issue in the reporting module caused the entire application to become unresponsive, taking down vendor payments with it. Now, studying for senior roles at Swiggy and Razorpay — companies that have already made the microservices journey — I understand why they extracted high-risk, high-load domains like payments into isolated services. That blast-radius isolation was exactly what we needed at Oracle."

---

## 8. Scale Evolution

**1,000 users →** A monolith is almost certainly the right choice. One codebase, one database, one deploy. Build it well with clean package structure by domain. Ship features fast.

**100,000 users →** You may start feeling the pain points: deploy frequency blocked by teams, one feature area consuming all memory. Consider extracting the highest-risk domain (usually payment or real-time tracking) as the first microservice. Keep the rest as monolith.

**10 million users →** Full microservices is likely necessary. Multiple teams, multiple domains, significant traffic asymmetry between services. You need containerisation (Docker), orchestration (Kubernetes), service discovery, distributed tracing, circuit breakers, and Saga pattern for distributed transactions. The platform team maintains the infrastructure so domain teams can focus on business logic.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Started small, now processing billions in transactions. They made the microservices migration and live with its complexity every day. They interview for engineers who understand both sides — and can navigate the distributed system challenges. | "We're seeing cascading failures between our payment and notification services. How do you isolate them?" |
| Swiggy / Meesho | Swiggy's order flow touches 8+ services in real time. Understanding the trade-offs helps design new features that fit the existing microservices architecture correctly. | "Should a new feature be its own service or added to an existing one?" |
| Adobe / Microsoft | Enterprise platforms with many independently shipped products. Microservices-style bounded context separation prevents one product's issues from affecting others. | "How do you decompose a large enterprise application for team independence?" |
| Remote / Global roles | Monolith vs microservices is a universal system design interview question. Senior engineers are expected to have nuanced, experience-based opinions — not just recite the benefits of microservices. | "What is your experience with microservices architecture? What would you do differently?" |

---

## 10. Related Topics — What to Study Next

- **Topic 62 — Service Decomposition Strategies** — once you decide to use microservices, how do you decide which services to create? Domain-driven decomposition, event storming, strangler fig — the "how to cut" question
- **Topic 64 — Database per Service Pattern** — the data isolation that makes microservices independent also creates cross-service query challenges — this topic covers the pattern and its trade-offs
- **Topic 71 — Circuit Breaker (Resilience4j)** — service-to-service calls can fail; the Circuit Breaker pattern prevents cascading failures — the #1 resilience pattern every microservices developer must know
- **Topic 76 — Saga Pattern** — distributed transactions across services without two-phase commit — the essential pattern for maintaining data consistency in microservices
- **Topic 84 — Distributed Tracing** — debugging a request that touches 5 services requires correlation IDs and tracing tools — the operational tool you need the moment you have more than 2 services

---

*Part 4 · Monolith vs Microservices · Full Stack Interview Guide · Hruday D · 2026*
