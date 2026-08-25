# Database per Service Pattern
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Database per service = each microservice has its own private database that NO other service can directly access — services must talk through APIs or events, not shared tables
- Why it exists: if two services share a database, they are still tightly coupled at the data layer — one service's schema change breaks the other; one service's heavy query slows the other; you cannot deploy them truly independently
- Each service picks its own DB technology based on its needs: UserService (PostgreSQL), SessionService (Redis), CatalogService (Elasticsearch), MetricsService (InfluxDB), FileService (S3) — technology polyglotism is the benefit
- The trade-off: cross-service queries that were one SQL JOIN are now a service call or an event-driven data copy — this is the price of independence
- Gap to bridge: the "how do I query data from two services together?" problem is the hardest part — Topic 76 (Saga), Topic 79 (Outbox), and CQRS (Topic 80) are the patterns that solve this

---

## 1. One-Line Definition
Database per Service is the pattern where each microservice owns its data exclusively in a private database — no other service can read from or write to it directly — enforcing data isolation so services are independently deployable and independently scalable.

---

## 2. The Problem It Solves

Imagine two microservices — OrderService and InventoryService — sharing a single PostgreSQL database. The two services each have their own tables, but they live in the same schema on the same server.

What goes wrong:
- A DBA on the InventoryService team adds an index to the `products` table for a performance report. This index is so large it causes lock contention on the same PostgreSQL instance, slowing down OrderService reads at peak time.
- The InventoryService team renames the `product_sku` column to `item_sku` in their migration script. OrderService queries that directly referenced `product_sku` break mid-deploy — even though OrderService wasn't involved in that change.
- During a sale event, InventoryService's reconciliation job runs a full-table scan on `inventory_levels`. This exhausts the connection pool and OrderService gets connection timeouts for two minutes.
- You want to deploy InventoryService without touching OrderService. But the migration script InventoryService needs changes a table that OrderService reads. You must coordinate both service teams for every database change.

All these problems exist because the services share a database. The services are independently deployed but collectively coupled at the data layer. They are a distributed monolith.

Database per Service isolates these surfaces. If InventoryService has its own database, no migration, query, or connection pool issue in InventoryService can affect OrderService.

---

## 3. How It Works Internally

### The Core Rule
A service's database is treated as an implementation detail. The interface of the service is its API (REST, gRPC, or events). External services can only access data through the API — never directly through the database.

This rule is enforced by:
- Separate database credentials — each service has credentials that only give access to its own database
- Network isolation — database is on a private subnet, only accessible from the owning service's pods/containers
- Organisational discipline — code review rejects any code that connects to another service's database

### Choosing the Right Database Type

This isolation enables polyglot persistence — each service picks the best storage technology:

```
Service             Best Database         Reason
─────────────────────────────────────────────────────────────────────
User Service        PostgreSQL            ACID, complex queries, JSON support
Session/Auth        Redis                 Sub-millisecond reads, TTL built-in
Product Catalog     Elasticsearch         Full-text search, faceted filters
Order History       PostgreSQL/MongoDB    Relational or document depending on structure
Real-time Location  Redis Geo or MongoDB  Geospatial queries
Metrics/Analytics   InfluxDB / Redshift   Time series or columnar aggregations
Media Files         S3 + CDN              Binary object storage
Recommendation      Neo4j / Redis         Graph traversal or caching
Chat/Stream         Cassandra             High write throughput, time-ordered reads
```

Without database-per-service, the team would be forced to use one database for all use cases — typically PostgreSQL — which is adequate but not optimal for all the above.

### How Services Share Data Without Sharing a Database

**Approach 1 — API Calls (Synchronous)**
One service calls another's REST or gRPC endpoint to fetch data it needs. Simple, but creates runtime coupling — if UserService is down, OrderService cannot get the user name for a display query.

```
OrderService needs user email for order confirmation:
→ OrderService calls GET /users/{userId} on UserService at read time
→ Adds latency; adds failure dependency
→ Cache aggressively to mitigate
```

**Approach 2 — Event-Driven Data Replication (Asynchronous — preferred)**
When data changes, the owning service publishes an event to Kafka. Other services consume the event and store the subset of data they need in their own database.

```
UserService publishes event: UserEmailUpdated { userId: 42, email: "new@email.com" }
NotificationService consumes event → stores email in its own table
NotificationService can now send emails without calling UserService at all
```

This is called "data denormalisation by intent" — it is not a mistake, it's a design decision that accepts data duplication in exchange for independence.

**Approach 3 — CQRS Read Models**
A dedicated query service subscribes to events from multiple services and builds a combined read model for complex queries. The write path stays cleanly separated.

```
DashboardService subscribes to:
  - OrderService: OrderPlaced, OrderCompleted
  - PaymentService: PaymentProcessed
  - InventoryService: StockDepleted

DashboardService builds its own "order summary" view in its own database.
One query hits DashboardService — no cross-service join needed.
```

### Handling Cross-Service Queries

The most common objection to database-per-service: "But I need data from three tables across three services in one query!"

The answer: you stop thinking in relational JOIN terms and start thinking in event-driven materialised views.

```sql
-- BEFORE (monolith): One SQL query
SELECT o.id, u.name, u.email, p.product_name, o.total
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
WHERE o.status = 'PLACED'

-- AFTER (microservices): OrderService materialises the data it needs at ORDER TIME
-- OrderService stores a snapshot of product name and price at order time
-- OrderService stores a snapshot of user email (received via Kafka event)
-- Now a single query on OrderService's own DB gives all needed data
SELECT order_id, user_name_snapshot, user_email_snapshot,
       item_name_snapshot, total_amount
FROM orders
JOIN order_items ON order_items.order_id = orders.id
WHERE status = 'PLACED'
-- All data is in OrderService's own database — no cross-service join needed
```

The word "snapshot" is key: the data is captured AT WRITE TIME from the event stream or from the service API at creation. It is intentionally denormalised and may be slightly stale — but for most display purposes, stale-by-seconds is perfectly acceptable.

---

## 4. The Code

### Spring Boot — Multiple DataSource Configuration
```java
// When a service needs access to two separate databases (rare but valid)
// Example: OrderService has its own DB but also writes audit records to a separate audit DB

@Configuration
public class DataSourceConfig {

    // Primary datasource — the service's own database
    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    // Secondary datasource — audit/compliance database (write-only for this service)
    @Bean
    @ConfigurationProperties("spring.datasource.audit")
    public DataSource auditDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @Primary
    public EntityManagerFactory primaryEntityManagerFactory(
            @Qualifier("primaryDataSource") DataSource dataSource,
            JpaProperties jpaProperties) {
        // configure for primary
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.example.orders.domain");  // Only scans order domain packages
        // ...
        return em.getObject();
    }
}
```

### Auto-Generating Service DB Schema with Flyway
```java
// application.yml for OrderService — isolated database config
spring:
  datasource:
    url: jdbc:postgresql://order-db:5432/order_service_db  # Dedicated DB
    username: ${ORDER_DB_USER}          # Service-specific credentials
    password: ${ORDER_DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      connection-timeout: 3000
      pool-name: OrderServicePool

  flyway:
    enabled: true
    locations: classpath:db/migrations/orders  # Service-specific migrations
    baseline-on-migrate: true
    table: order_schema_history  # Keeps migration history in this service's DB only

  jpa:
    hibernate:
      ddl-auto: validate   # Validate schema matches entities — NEVER use update in production
    show-sql: false        # Disable in production — performance cost
```

### Storing Data Snapshots at Write Time
```java
// When an order is placed, capture the data we need from other services at CREATION TIME
// This avoids runtime cross-service calls for every read

@Service
@Transactional
public class CreateOrderService {

    private final UserServiceClient userServiceClient;
    private final ProductCatalogClient productCatalogClient;
    private final OrderRepository orderRepository;

    public OrderId createOrder(CreateOrderCommand command) {
        // Fetch user data from UserService ONCE at order creation time
        // This information is snapshotted into the order — not re-fetched on every read
        UserSnapshot userSnapshot = userServiceClient.getUserSnapshot(command.getUserId());
        //  UserSnapshot contains: userId, displayName, email — the fields OrderService will need
        // UserService may change the user's data later — this snapshot is fixed at order time

        Order order = Order.create(
            OrderId.generate(),
            command.getUserId(),
            userSnapshot.getDisplayName(),   // Stored directly in orders table
            userSnapshot.getEmail(),         // Stored directly in orders table
            command.getShippingAddress()
        );

        for (CreateOrderCommand.Item item : command.getItems()) {
            // Fetch product name from CatalogService at order creation
            ProductSnapshot productSnapshot = productCatalogClient.getProductSnapshot(item.getProductId());

            order.addItem(
                item.getProductId(),
                productSnapshot.getProductName(),  // Snapshotted — catalog may rename product later
                item.getQuantity(),
                productSnapshot.getCurrentPrice()  // Price locked at order time
            );
        }

        order.place();
        orderRepository.save(order);
        return order.getId();
    }
}
```

### Consuming Data Updates via Kafka Events
```java
// NotificationService keeps a local copy of user emails
// Updated via Kafka events — no runtime calls to UserService needed

@Component
public class UserEventConsumer {

    private final UserContactRepository userContactRepository;

    @KafkaListener(
        topics = "${kafka.topics.user-events}",
        groupId = "${spring.application.name}",
        containerFactory = "userEventListenerFactory"
    )
    public void onUserEvent(UserEvent event, Acknowledgment ack) {
        try {
            switch (event.getEventType()) {
                case USER_REGISTERED:
                    userContactRepository.upsert(
                        new UserContact(event.getUserId(), event.getEmail(), event.getPhone())
                    );
                    break;

                case USER_EMAIL_UPDATED:
                    userContactRepository.updateEmail(event.getUserId(), event.getEmail());
                    break;

                case USER_DELETED:
                    userContactRepository.deleteByUserId(event.getUserId());
                    break;
            }
            ack.acknowledge();  // Commit offset only after successful processing
        } catch (Exception e) {
            // Do NOT acknowledge — Kafka will redeliver
            // Log with correlationId for debugging
            log.error("Failed to process UserEvent for userId={}: {}", event.getUserId(), e.getMessage());
            // After max retries, will go to Dead Letter Topic for manual review
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What does database per service mean and why is it important?"

**Hruday's answer:**
> Database per service means each microservice has its own private database that it is the exclusive owner of. No other service can connect directly to it — the only way to access the data is through the service's published API (REST, gRPC) or through events it publishes.
>
> Why it's important: shared databases are the most common way microservices fail to achieve actual independence. You can deploy the services separately, but if they share a database, a schema migration in one service can break another, a slow query in one service can exhaust the connection pool for all others, and teams cannot evolve their data model without coordinating with every team that shares the database.
>
> The database is an implementation detail. The contract of a microservice is its API. When that principle is enforced — database stays private, API stays public — each team can refactor, migrate, replace, or tune their database completely independently.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you handle cross-service queries when each service has its own database?"

**Hruday's answer:**
> This is the main trade-off of database per service, and the answer depends on whether the query is for a write path or a read path.
>
> For write paths — when a business transaction spans multiple services — I use the Saga pattern. The saga coordinates the business transaction using domain events: OrderService places the order and publishes an event; PaymentService processes payment and publishes its result; InventoryService reserves stock. Each step reacts to the previous step's event.
>
> For read paths — when I need to display combined data from multiple services in a single view — I use event-driven data replication. Each service publishes events when its data changes. The service that needs the combined view consumes those events and builds a local materialised view. OrderService, for example, stores a snapshot of the product name and user email at order creation time. By the time someone reads the order history, all the display data is in OrderService's own database — no cross-service call needed.
>
> For complex reporting queries across many services, I use a dedicated read model service (CQRS pattern) that aggregates data from Kafka events into a queryable store — Elasticsearch or a read-optimised PostgreSQL schema.
>
> The key mindset shift: stop thinking about SQL JOINs and start thinking about correctly scoped data ownership. If OrderService constantly needs ProductService data to answer its queries, maybe those are the same bounded context and should be consolidated — not forced to work through API calls.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the downsides of database per service?"

**Hruday's answer:**
> The main downsides are: operational overhead, eventual consistency, and the loss of ACID transactions across service boundaries.
>
> Operational overhead: instead of managing one database, you manage N databases. Each needs backups, monitoring, connection pooling, schema migrations, and tuning. For a startup with 10 services, that's 10 database systems to manage. This is manageable with container orchestration and infrastructure-as-code, but it's real work.
>
> Eventual consistency: data that is shared between services is eventually consistent, not immediately consistent. If UserService updates a user's email, NotificationService gets that update via a Kafka event a few milliseconds later. Between the event publishing and the event consuming, the two services have different views of the data. For most read operations — showing historical order data, sending a notification — a few hundred milliseconds of staleness is perfectly acceptable. For critical operations like payment processing, you design to avoid the issue by snapshotting data at write time.
>
> No ACID transactions across services: you cannot do a two-phase commit across two separate databases and have it be practical in production (Topic 77 covers why 2PC fails at scale). Multi-service consistency relies on eventual consistency via Saga patterns and compensating transactions. If a business operation absolutely requires ACID guarantees across two data entities, those entities should probably live in the same service.
>
> I think of these as costs worth paying for the independence benefits — but the key is to know the costs upfront and design the system around them, not to discover them in production.

---

### Q4 — Scenario
**Interviewer asks:** "Design the data layer for a food delivery app — service databases and what each stores."

**Hruday's answer:**
> I would design five primary services, each with its own isolated database optimised for its workload:
>
> **UserService → PostgreSQL**: user accounts, authentication hashes, address book (soft reference — address is stored in User's DB, not shared with Order). Serves auth queries, profile reads. Moderate read/write. Publishes UserRegistered, UserEmailUpdated events.
>
> **RestaurantService → PostgreSQL + Elasticsearch**: restaurant details and menu in PostgreSQL (structured, ACID for menu updates). Elasticsearch index for menu search — "biryani near me" full-text + geospatial. Publishes MenuUpdated events. Read-heavy at browse time.
>
> **OrderService → PostgreSQL**: orders with JSONB column for order items and a snapshot of restaurant name, item names, prices, user display name, delivery address — all captured at order time. Status change history. Publishes OrderPlaced, OrderConfirmed, OrderDelivered events. Write-heavy during peak hours.
>
> **DeliveryService → PostgreSQL + Redis**: PostgreSQL for delivery lifecycle and history. Redis Geo for real-time driver location (thousands of updates per second, geospatial nearest-driver query must be sub-10ms). These two databases in one service because location is an operational concern of the same team.
>
> **NotificationService → PostgreSQL + Redis**: PostgreSQL for notification audit log. Redis for deduplication keys — prevents sending the same SMS twice if an event is replayed. Consumes events from all other services. Stateless compute-heavy, minimal persistent storage.
>
> **PaymentService → PostgreSQL with strict ACID**: all payment transactions, refunds, ledger entries. Strictest consistency requirements. No Redis caching of financial data. Tight isolation and comprehensive audit logging.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Share the database, separate the schema" | "We can have microservices share a PostgreSQL server with separate schemas, that's database per service" | "A separate schema on the same server is not database per service. The connection pool is shared, migrations run on the same server, a long-running query can affect all schemas, and a DBA can still JOIN across schemas. True isolation requires separate database instances — or at minimum, physically separate containers with separate process-level isolation." |
| "Just use JOIN service in the middle" | "Create a JoinService that connects to multiple DBs for complex queries" | "A JoinService that connects to multiple service databases is the worst of both worlds — it creates tight coupling via shared database access AND adds a network hop. It violates the service database ownership principle and creates a bottleneck. The right solution is event-driven data replication + materialised views." |
| "Database per service = microservice is slow" | "Performance must be worse because we can't JOIN" | "Performance is often BETTER with database per service because: queries are against smaller, more focused datasets; databases are tuned for their specific workload; indexes are optimised for one service's query patterns; read replicas can be added independently per service. The query complexity moves from SQL JOINs to event-driven data composition, which is distributed but often faster in aggregate." |
| "Just use one big MongoDB" | "MongoDB's flexible schema solves the database-per-service problem" | "MongoDB is a database technology. Database per service is about isolation and ownership, not about which technology you use. One MongoDB instance shared by all services has exactly the same coupling problems as one PostgreSQL instance. You still need separate database instances per service, whether those instances run MongoDB, PostgreSQL, Redis, or anything else." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we had a classic shared-database problem. The ERP's payments module and the procurement module shared the same Oracle DB schema. When the finance team ran month-end reconciliation reports — full table scans across millions of rows — the procurement module's response times would triple. The DBA team's solution was to schedule maintenance windows for reconciliation. That was the monolith way. Moving toward an event-driven architecture, I understand now that the right solution was isolating those databases and having reconciliation work on a replicated read model, so the production database was never touched by reporting workloads. Database isolation is not just about service deployability — it's a performance isolation boundary too."

---

## 8. Scale Evolution

**1,000 users →** One database for everything is fine. Focus on clean service API contracts and avoid cross-database queries in code. Lay the groundwork for future isolation.

**100,000 users →** Extract the highest-load services first and give them dedicated database instances. Typically: session/cache → Redis, product catalog → add Elasticsearch for search, order processing → dedicated PostgreSQL with connection pooling (PgBouncer).

**10 million users →** Full database-per-service. Each service's database is independently replicated, independently scaled (read replicas where needed). Kafka handles all inter-service data flow. Reporting workloads use a dedicated analytics database built from Kafka streams — never query production databases for report generation.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Multiple financial domains (UPI, Cards, Wallets, Settlements) each with completely different consistency requirements and data models — database per service is foundational. | "How does PaymentService, RefundService, and LedgerService share financial data without sharing a database?" |
| Swiggy / Meesho | Restaurant catalog (search-heavy), order management (write-heavy during peaks), real-time delivery tracking (high-frequency writes) — all have different optimal database technologies. | "Why would you use Elasticsearch for catalog and PostgreSQL for orders? How does data flow between them?" |
| Adobe / Microsoft | Document metadata, collaboration state, permission records, billing — all benefit from isolated databases with appropriate storage backends. | "How do you design the data layer for a SaaS platform where billing, usage tracking, and document metadata have different access patterns?" |
| SAP Labs (current) | Moving from monolithic ERP databases (single Oracle instance for everything) to service-oriented architecture with isolated data stores is a common SAP migration challenge. | Architecture discussions about modernising SAP BTP services. |

---

## 10. Related Topics — What to Study Next

- **Topic 65 — Shared Database Anti-Pattern** — the complementary topic: what goes wrong if you DON'T follow database per service, with specific failure modes and migration strategies
- **Topic 76 — Saga Pattern** — with databases isolated, cross-service transactions need the Saga choreography or orchestration approach — the most important pattern to understand after database-per-service
- **Topic 79 — Outbox Pattern** — reliably publishing events when a service changes its database (prevents the "wrote to DB, then crashed before publishing to Kafka" problem)
- **Topic 80 — CQRS Pattern** — the read model strategy for cross-service queries: separate write model (owns the data) from read model (event-driven materialised view)
- **Topic 63 — DDD Bounded Contexts** — the design framework that defines what data belongs to which service; bounded context = database boundary in microservices

---

*Part 4 · Database per Service Pattern · Full Stack Interview Guide · Hruday D · 2026*
