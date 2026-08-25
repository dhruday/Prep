# Read Replicas — When and How to Use
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Read replica = an extra database server that receives a copy of every write from the primary and can serve SELECT queries — but does NOT accept writes. Its purpose is to offload read traffic from the primary.
- Use case 1 — Read traffic offload: API endpoints that serve browse/search/reporting queries route to the replica. Primary handles writes only. Result: primary CPU utilisation drops significantly.
- Use case 2 — Analytics / reporting isolation: run heavy analytical queries (GROUP BY, large JOINs, full table scans) on a dedicated replica so they cannot impact user-facing API performance on the primary.
- Use case 3 — Failover standby: a synchronous replica can be promoted to primary in < 1 minute if the primary dies. Better RTO (Recovery Time Objective) than restoring from backup.
- Use case 4 — Geo-proximity reads: a replica in a different geographic region lets users in that region read data with low latency without writing to the regional replica.
- When NOT to use: if you need guaranteed read-after-write consistency for all reads — the lag (even milliseconds) means a replica may return stale data. Writes must always go to primary.
- Spring Boot integration: AbstractRoutingDataSource routes @Transactional(readOnly=true) to replica datasource; @Transactional without readOnly goes to primary. LazyConnectionDataSourceProxy defers connection acquisition until the first DB statement — prevents connection checkout before JPA figures out transaction type.
- Gap to bridge: candidates know "add read replica and route reads to it" but cannot explain connection pool sizing for multiple datasources, why LazyConnectionDataSourceProxy matters, or how to handle the window of stale data after a write

---

## 1. One-Line Definition
A read replica is a continuously synchronized, read-only copy of the primary database that serves SELECT queries, offloading read traffic from the primary and providing options for analytics isolation, geographic read distribution, and high-availability failover.

---

## 2. The Problem It Solves

```
PROBLEM: Primary database handles all reads and all writes.

Application traffic profile (typical web app):
  80% reads: product listing, user profile, order history, search
  20% writes: place order, update cart, submit review

All 100% of queries → single primary server
  Primary CPU: 85% average, spikes to 100% during peak hours
  Primary read IOPS: maxed out, causing read latency > 500ms
  Write latency also degrades because reads and writes compete for the same I/O
  
What happens to writes when reads saturate the database:
  A user saving a payment card data → write operation waits in the queue
  Behind 200 read queries already executing on the saturated primary
  Payment latency: 3 seconds instead of 50ms → user thinks payment failed → double-click

READ REPLICA SOLUTION:
  Add 2 read replicas.
  Route 80% read traffic to replicas (split between replica 1 and replica 2).
  Primary handles 20% write traffic + 20-30% of the most critical reads (post-write reads).
  
  Primary CPU: drops from 85% to ~25%
  Write latency: back to 50ms — no more read interference
  User-facing read latency: also improves because replicas have headroom
```

---

## 3. How It Works Internally

### Read Replica Architecture

```
                [Application Servers]
                        │
          ┌─────────────┼─────────────┐
          │             │             │
      WRITES         READS         READS
          │           │  │           │
          ▼           ▼  │           ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ PRIMARY  │─▶│ REPLICA 1│  │ REPLICA 2│
    │(read/wrt)│  │(read-only│  │(read-only│
    └──────────┘  │ replication│  replication│
                  └──────────┘  └──────────┘
                  
  WAL (Write-Ahead Log) stream:
    Primary applies write to its WAL.
    Asynchronously sends WAL record to each replica.
    Each replica applies the record to its copy.
    
  Lag measurement (Postgres):
    On replica: SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;
    On primary: SELECT application_name, write_lag, flush_lag, replay_lag
                FROM pg_stat_replication;
    
  Normal lag: < 100ms under moderate write load
  Elevated lag: seconds, during heavy batch inserts or large migrations on primary

DEDICATED ANALYTICS REPLICA:
    ┌──────────┐
    │ PRIMARY  │──WAL──▶ [User-facing Replica 1] ──▶ API reads
    │          │──WAL──▶ [User-facing Replica 2] ──▶ API reads
    │          │──WAL──▶ [Analytics Replica]     ──▶ Reports, dashboards
    └──────────┘
    
  Analytics replica can run queries that:
  - Take 30 seconds to complete
  - Consume 100% of one server's CPU
  - Scan 1 billion rows
  
  These queries have ZERO impact on the primary or user-facing replicas.
  Before analytics replicas: one overnight report killed user API performance.
```

### Spring Boot Routing Setup

```
DataSource routing lifecycle with @Transactional:

Without LazyConnectionDataSourceProxy:
  1. Spring intercepts the @Transactional method
  2. Gets the connection from the datasource BEFORE executing the method body
  3. Determines primary or replica... but the @Transactional annotation is evaluated
     AFTER the connection is obtained in some JPA implementations → always picks primary

With LazyConnectionDataSourceProxy:
  1. Spring intercepts the @Transactional method
  2. Creates a LAZY connection wrapper (no actual JDBC connection yet)
  3. Method body begins executing — @Transactional is evaluated → isReadOnly = true
  4. First JPA statement fires → now the lazy wrapper asks the router for a connection
  5. Router checks isReadOnly() → TRUE → picks replica datasource
  6. Returns actual JDBC connection from the replica connection pool
  
  This ensures the routing decision happens AFTER Spring has set up the transaction
  (and thus knows readOnly status), not before.
```

---

## 4. The Code

### Wrong Way — No Lazy Proxy, Routing Doesn't Work Correctly
```java
// WRONG: Routing without LazyConnectionDataSourceProxy — may always route to primary
@Configuration
public class BrokenDataSourceConfig {

    @Bean
    @Primary
    public DataSource routingDataSource(DataSource primary, DataSource replica) {
        ReadWriteRoutingDataSource routing = new ReadWriteRoutingDataSource();
        Map<Object, Object> sources = Map.of("PRIMARY", primary, "REPLICA", replica);
        routing.setTargetDataSources(sources);
        routing.setDefaultTargetDataSource(primary);
        return routing;
        // BUG: Without LazyConnectionDataSourceProxy, Spring's JPA may obtain the
        // connection before the @Transactional annotation sets isReadOnly = true.
        // Result: even @Transactional(readOnly=true) methods use primary.
    }
}
```
> **Why this fails:** The routing data source checks `isCurrentTransactionReadOnly()` when a connection is requested. Without a lazy proxy, the connection may be fetched before Spring's transaction manager has set the readOnly flag, so the routing always sees `false` and always returns the primary connection.

### Right Way — Full Routing with LazyConnectionDataSourceProxy
```java
// DataSourceRouter: checks the current transaction context
public class ReadWriteRoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
            ? DataSourceType.REPLICA
            : DataSourceType.PRIMARY;
    }
}

public enum DataSourceType { PRIMARY, REPLICA }

@Configuration
@RequiredArgsConstructor
public class DataSourceConfig {

    // Primary datasource (handles writes)
    @Bean(name = "primaryDataSource")
    @ConfigurationProperties("app.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().type(HikariDataSource.class).build();
    }

    // Replica datasource (handles reads)
    @Bean(name = "replicaDataSource")
    @ConfigurationProperties("app.datasource.replica")
    public DataSource replicaDataSource() {
        return DataSourceBuilder.create().type(HikariDataSource.class).build();
    }

    // Routing datasource: delegates to primary or replica based on transaction type
    @Bean(name = "routingDataSource")
    public DataSource routingDataSource(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {

        ReadWriteRoutingDataSource routing = new ReadWriteRoutingDataSource();
        Map<Object, Object> sources = new EnumMap<>(DataSourceType.class);
        sources.put(DataSourceType.PRIMARY, primary);
        sources.put(DataSourceType.REPLICA, replica);
        routing.setTargetDataSources(sources);
        routing.setDefaultTargetDataSource(primary);
        return routing;
    }

    // LazyConnectionDataSourceProxy: ensures connection is obtained AFTER
    // Spring sets the transaction's readOnly status — routing works correctly
    @Bean
    @Primary
    public DataSource dataSource(@Qualifier("routingDataSource") DataSource routing) {
        return new LazyConnectionDataSourceProxy(routing);
    }
}
```

```yaml
# application.yml
app:
  datasource:
    primary:
      jdbc-url: jdbc:postgresql://primary.db.internal:5432/appdb
      username: ${DB_USER}
      password: ${DB_PASSWORD}
      hikari:
        pool-name: primary-pool
        maximum-pool-size: 20
        minimum-idle: 5
        connection-timeout: 3000
        idle-timeout: 600000
    replica:
      jdbc-url: jdbc:postgresql://replica.db.internal:5432/appdb
      username: ${DB_READONLY_USER}
      password: ${DB_READONLY_PASSWORD}
      hikari:
        pool-name: replica-pool
        maximum-pool-size: 40    # more capacity: most reads go here
        minimum-idle: 10
        connection-timeout: 3000
        idle-timeout: 600000
```

```java
// Service layer: readOnly = true routes to replica; no annotation → primary
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)  // default: all methods use replica unless overridden
public class OrderService {

    private final OrderRepository orderRepo;

    // Uses replica: readOnly = true from class-level annotation
    public List<OrderSummaryDto> getOrderHistory(String userId, Pageable pageable) {
        return orderRepo.findByUserId(userId, pageable)
            .map(OrderSummaryDto::from)
            .toList();
    }

    // Uses replica: analytics report — heavy query isolated from primary
    @Transactional(readOnly = true)
    public RevenueReportDto getRevenueReport(LocalDate from, LocalDate to) {
        return orderRepo.getRevenueAggregation(from, to);
    }

    // Uses PRIMARY: write operation — class-level readOnly overridden
    @Transactional  // readOnly = false (default)
    public Order placeOrder(PlaceOrderCommand cmd) {
        Order order = new Order(cmd.getUserId(), cmd.getTotalAmount());
        Order saved = orderRepo.save(order);
        // This write is committed on primary
        return saved;
    }

    // Uses PRIMARY: read-after-write — user just placed order, must see it
    // readOnly = false ensures we read from primary (no lag risk)
    @Transactional
    public Order getOrderAfterPlacement(String orderId) {
        return orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order: " + orderId));
    }
}

// Health monitoring: check replica lag, alert if above threshold
@Component
@RequiredArgsConstructor
@Slf4j
public class ReplicaHealthChecker {

    private final JdbcTemplate replicaJdbcTemplate;  // bound to replica datasource

    @Scheduled(fixedDelay = 30_000)  // every 30 seconds
    public void checkReplicaLag() {
        try {
            Double lagSeconds = replicaJdbcTemplate.queryForObject(
                "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))",
                Double.class
            );
            if (lagSeconds != null && lagSeconds > 10.0) {
                log.warn("Replica lag is HIGH: {}s — reads may serve stale data", lagSeconds);
                // Alert: PagerDuty, CloudWatch metric, etc.
            }
        } catch (DataAccessException e) {
            log.error("Cannot check replica lag — replica may be unavailable", e);
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you add a read replica to a production system?"

**Hruday's answer:**
> I'd add a read replica in three scenarios.
>
> First: when the primary's CPU or I/O is significantly loaded by read queries, causing write latency to increase. Read replicas move the read traffic off the primary, freeing it to handle writes with consistent low latency.
>
> Second: when there are heavy analytical or reporting queries that can't be optimised further — they just need to scan large amounts of data. A dedicated analytics replica lets those queries run without any risk of impacting the user-facing API. This is a very common use case for BI dashboards and scheduled reports.
>
> Third: as a high-availability standby for faster failover. If the primary fails, promoting a warm replica takes about 30 seconds. Restoring from backup can take hours.
>
> The signal to act: primary CPU > 70% average, read latency trending upward, or analytical queries causing visible performance spikes. Don't add replicas speculatively without evidence of the bottleneck.

---

### Q2 — LazyConnectionDataSourceProxy
**Interviewer asks:** "You set up read-write routing but all reads are still hitting the primary. What's wrong?"

**Hruday's answer:**
> This is a classic mistake: the routing data source is working, but the connection is being obtained before Spring's transaction interceptor has had a chance to set the readOnly flag.
>
> The sequence without a lazy proxy: Spring intercepts the method call → requests a connection from the datasource → routing data source checks `isCurrentTransactionReadOnly()` — but the transaction hasn't been fully started yet, so it returns false → primary connection returned → then the transaction sets readOnly to true, but the connection is already from primary.
>
> The fix is wrapping the routing data source in a `LazyConnectionDataSourceProxy`. This creates a proxy connection object immediately when requested, but delays actually acquiring the real JDBC connection until the first database operation. By that time, Spring's transaction management has fully initialized the transaction context, readOnly is correctly set, and the routing decision happens correctly — returning a replica connection.

---

### Q3 — Connection Pool Sizing with Multiple DataSources
**Interviewer asks:** "How do you size the connection pools when using read replicas?"

**Hruday's answer:**
> Each datasource (primary and each replica) needs its own Hikari connection pool sized appropriately for its expected traffic.
>
> The primary handles writes and some critical reads. If I expect 200 concurrent write operations, the primary pool needs at least 200 connections, plus overhead. I'd set maximum-pool-size to 250 and minimum-idle to 20 to keep connections warm.
>
> Replicas handle the bulk of reads. If I have 2 replicas and each handles ~400 concurrent read queries, each replica pool needs ~400-500 connections. Because reads are faster than writes (no transaction overhead, no locking), throughput per connection is higher — I might set maximum-pool-size to 300 per replica.
>
> But there's a hard limit: each Postgres server has `max_connections` (default 100). With HikariCP pools, HikariCP connections map 1:1 to Postgres connections. If you set pool size to 200 per datasource across 5 app server instances, you need 1000 Postgres connections on the primary. Use PgBouncer in "transaction mode" in front of each Postgres server — PgBouncer multiplexes thousands of app-level connections onto a small pool of actual server connections (e.g., 100). This is essential at scale.

---

### Q4 — Analytics Isolation
**Interviewer asks:** "Your monthly revenue report takes 45 seconds to run and causes user-facing slowdowns. How do you solve this with read replicas?"

**Hruday's answer:**
> The core problem: the report runs on the primary (or a shared replica), competing for I/O and CPU with user-facing queries. The 45-second query holds locks on index pages and competes for buffer cache, causing user API response times to spike.
>
> Solution: a dedicated analytics replica that no user-facing traffic touches. The analytics replica runs only scheduled reports and BI tool queries. Its HikariCP pool can be saturated by an analytics query without any user impact.
>
> Implementation: set up a third datasource in the Spring configuration — `analyticsDataSource` — pointing to `analytics-replica.db.internal`. The reporting service is injected with this datasource explicitly. The standard routing (primary/read-replica) doesn't apply to the reporting service.
>
> Additionally: I'd move the 45-second query to async execution. Instead of blocking an HTTP request for 45 seconds, the user triggers a report generation → job is queued → background worker runs on the analytics replica → result is stored → user is notified via WebSocket or email when ready. This decouples user experience entirely from query execution time.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "readOnly = true routes to replica" | "@Transactional(readOnly=true) is enough to use the replica" | "@Transactional(readOnly=true) without LazyConnectionDataSourceProxy and AbstractRoutingDataSource just adds a hint to JPA not to flush — it doesn't change the datasource. You need to implement the routing. Additionally, without LazyConnectionDataSourceProxy, the routing may always return Primary because the readOnly flag hasn't been set when the connection is acquired. Both components are required." |
| "Replica reads are always safe" | "Just route all reads to replicas and you're done" | "Reads immediately after writes may see stale data due to replication lag. A user who just updated their cart then refreshes the cart page may see the old cart if that read goes to a replica with 50ms lag. Model your read-after-write requirements explicitly: which reads MUST be fresh (security-critical, post-mutation confirmation), and which tolerate eventual consistency (product listings, recommendations). Route critical reads to primary; route the rest to replicas." |
| "One pool for primary + replica" | "Use one HikariCP pool with multiple connections" | "Primary and each replica need SEPARATE HikariCP pools. They are separate servers with separate connection limits. The primary pool should be sized for write concurrency, the replica pool for read concurrency. Sharing a pool would mean all connections come from one server — defeating the purpose. With PgBouncer, you might have the same pool-level config, but the underlying server endpoints are different. Separate DataSource beans, separate HikariDataSource instances, separate pools." |
| "Read replica for writes too on failure" | "If primary fails, temporarily route writes to the replica" | "Read replicas are configured read-only at the database level — they CANNOT accept writes. They're designed to apply changes from the primary, not generate new ones. To accept writes, a replica must be PROMOTED (the Postgres process changes from standby to primary mode). This is done via Patroni or AWS RDS fail-over. It takes 20-60 seconds, not instant. Until promotion completes, writes are unavailable. Design your write path to handle this brief write unavailability via retry logic with backoff." |

---

## 7. Hruday's Real Experience Hook

> "At Capgemini, we had a Node.js + PostgreSQL system where scheduled batch reports ran every 30 minutes during business hours — each report took 25 seconds on the primary. During report execution, user-facing API responses jumped from 80ms to 8 seconds. We added a read replica and routed all non-user-facing queries (reports, analytics exports, data migration scripts) to the replica. The primary was free. User-facing response times stayed at 80ms even during report execution. The replica handled the heavy scans with no impact on anyone else. That's the clearest demonstration of analytics isolation I've experienced."

---

## 8. Scale Evolution

**One server:** Primary only. Use `@Transactional(readOnly=true)` consistently now — easy to wire up routing later. Avoid reporting queries running during peak traffic hours via scheduling.

**First replica:** Route analytics and batch reports there. Add LazyConnectionDataSourceProxy + AbstractRoutingDataSource. Monitor replication lag. Identify read-after-write cases explicitly.

**Multiple replicas:** Load balancer in front of replicas (HAProxy, AWS Aurora endpoint, PgBouncer). Separate replica tiers: user-facing (low latency, fresh reads prioritised) and analytics (can tolerate higher lag, pool reserved for batch queries). Connection pooling via PgBouncer at each tier.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant dashboard queries routed to replica; settlement batch jobs on analytics replica. Strict read-after-write consistency for transaction confirmations (routes to primary). | "Design the read routing strategy for a payment platform's dashboard vs transaction confirmation flows." |
| Swiggy / Meesho | Order history browsing (replica), order placement confirmation (primary), analytics reports on demand (dedicated analytics replica). | "How would you prevent a nightly report from impacting live order APIs?" |
| Adobe / Microsoft | Document listing and search (replica), document save and version commit (primary), analytics pipeline reads (dedicated replica with higher lag tolerance). | "How do you isolate analytics workloads from transactional DB performance in a multi-tenant product?" |
| SAP Labs (current) | Oracle Active Data Guard (equivalent to Postgres hot standby/ read replica) is the standard DR setup in SAP production systems. Understanding when queries are routed to standby vs primary is relevant for custom integration development. | "What happens to read queries routed to Oracle Active Data Guard if replication lag exceeds the threshold?" |

---

## 10. Related Topics — What to Study Next

- **Topic 91 — Replication** — read replicas are the application-level use of replication; Topic 91 covers the underlying WAL streaming mechanism; read together as a pair
- **Topic 94 — Connection Pooling** — multiple datasources each need properly sized connection pools; PgBouncer architecture becomes important with replicas at scale
- **Topic 102 — Redis as Cache** — for very high read loads, Redis caching in front of the database (primary or replica) further reduces database read pressure; complements read replica architecture

---

*Part 5 · Read Replicas — When and How to Use · Full Stack Interview Guide · Hruday D · 2026*
