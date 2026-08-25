# Database Replication — Master-Slave, Master-Master
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Replication = keeping a copy of your database on one or more additional servers. The server that accepts writes is called the PRIMARY (or master). Servers that receive copies are called REPLICAS (or slaves/standbys).
- Why do it: (1) read scaling — route read queries to replicas to reduce load on primary; (2) high availability — if primary fails, promote a replica to new primary (failover); (3) disaster recovery — geo-distributed replica for data safety
- Master-slave (primary-replica): primary accepts all writes. Changes are streamed to replicas via a replication log. Replicas are read-only. Standard setup in Postgres (streaming replication), MySQL (binlog-based). Promoted replica takes over if primary fails.
- Master-master (multi-primary): both nodes accept writes. Conflict resolution needed when two nodes get different writes to the same row simultaneously. Complex to operate. Example: Galera Cluster for MySQL, CockroachDB. Mostly used when geo-distributed writes are mandatory.
- Replication lag: the time between a write on the primary and the write becoming visible on the replica. Usually milliseconds but can grow to seconds under heavy write load. A user who just wrote data and immediately reads from the replica MAY see stale data — this is read-after-write inconsistency.
- Fix for read-after-write: route reads that must see their own writes back to the primary, or wait for replication to catch up (sync replication), or use a sticky session that routes to primary for a time window after a write.
- Gap to bridge: candidates know "use read replicas to scale reads" but cannot explain replication lag, how to handle read-after-write inconsistency in code, or when master-master creates more problems than it solves

---

## 1. One-Line Definition
Database replication is the process of automatically copying every committed write from one database server (the primary) to one or more additional servers (replicas), enabling read scaling and high availability.

---

## 2. The Problem It Solves

```
PROBLEM: Single database server under load.

Traffic pattern for a typical e-commerce application:
  Reads:  95% of all queries (product browse, order history, searches)
  Writes:  5% of all queries (place order, update cart, write review)

A single database server handles both.
As traffic grows, the CPU and I/O on that one server becomes the bottleneck.

You can scale up (add more CPU/RAM to one machine) — expensive, hits hardware limits.
You can scale out (add more machines) — need a way to distribute the work.

Replication lets you:
  Primary server: handles ALL writes (5% of traffic) — stays focused
  Replica 1: handles read queries (browsers, searches) — 30% of reads
  Replica 2: handles read queries (analytics, reports) — 30% of reads
  Replica 3: handles read queries (user dashboards) — 30% of reads

Total:
  Primary: 5% write traffic
  Each replica: ~30% read traffic (balanced via read routing)
  System can handle 3× more read traffic than before
  By adding more replicas, read capacity scales linearly

HIGH AVAILABILITY benefit (different from scaling):
  If primary crashes:
  Without replication: database is down until repaired — hours of downtime
  With replication:    promote replica 1 to new primary in ~30 seconds
                       Other replicas reconfigure to follow new primary
                       Application reconnects — minimal downtime
```

---

## 3. How It Works Internally

### Sync vs Async Replication

```
ASYNCHRONOUS (default in most setups, including Postgres streaming replication):

  Client ──WRITE──→ Primary
                    Primary writes to disk
                    Primary confirms COMMIT to client  ← client gets success response here
                    Primary streams change to replica  ← happens AFTER commit confirmation
                    Replica applies the change
  
  Timeline:  Write committed at t=0    Client confirmed at t=0
             Replica receives at t=5ms  Replica applies at t=6ms
  
  Replication lag = 6ms in this example. Can stretch to seconds under load.
  
  Risk: if primary crashes between t=0 and t=6ms, the replica has not applied the
  change. Those writes are LOST when the replica is promoted to primary.
  This is called replication lag data loss — typically milliseconds, but not zero.

SYNCHRONOUS (optional, high durability):

  Client ──WRITE──→ Primary
                    Primary writes to disk
                    Primary WAITS for replica to confirm it received the write
                    Primary confirms COMMIT to client  ← client waits for this
  
  Zero data loss on failover — replica is guaranteed up-to-date at failover time.
  
  Trade-off: write latency increases by the round-trip time to the replica.
  If primary-to-replica network is 10ms, ALL writes take 10ms extra.
  Replica failure makes writes block until replica recovers (or timeout kicks in).

POSTGRES CONFIGURATION:
  -- On primary, synchronous_commit = on (async) or remote_write (sync to replica WAL)
  -- For per-transaction sync: SET LOCAL synchronous_commit = 'remote_write';
  
  synchronous_commit = 'off'          → fastest, can lose last ~200ms of data
  synchronous_commit = 'on'           → local sync, asynchronous to replica (default)
  synchronous_commit = 'remote_write' → primary waits until replica wrote to its WAL
  synchronous_commit = 'remote_apply' → primary waits until replica applied write
```

### Read-After-Write Problem

```
Scenario:
  t=0ms: User clicks "Update email" → POST /users/123/email
         → Application writes new email to PRIMARY
         → Write committed. Primary email: new@example.com

  t=2ms: Application renders "Profile updated!" page
         → GET /users/123 to show updated profile
         → Read query routed to REPLICA
         → Replica lag is 5ms — replica still has old email: old@example.com
         → Page shows: old@example.com  ← User sees their own stale data

This is read-after-write inconsistency. User is confused why their update didn't stick.

SOLUTIONS:
  1. Route reads to PRIMARY immediately after a write from the same user
     (sticky routing, shard by user session, or use request-scoped primary flag)
  
  2. Mark "profile page" as primary-only read:
     @Transactional(readOnly = false)  ← Spring will use primary datasource
     
  3. Short time window: for N seconds after a write, user's reads go to primary
     (tracked in Redis: "user 123 wrote at t=0, route to primary until t+5s")
  
  4. Version token: write returns a version/timestamp, GET includes it,
     application waits for replica to reach that version before reading
     (complex but elegant for distributed systems)
  
  5. Accept eventual consistency: for non-critical reads (search ranking, 
     recommendation lists) — stale by 1 second is perfectly fine
```

### Master-Master: When and Why Not

```
MASTER-MASTER (Multi-Primary):
  Both Node A and Node B accept writes simultaneously.
  Each node replicates changes to the other.

CONFLICT SCENARIO:
  t=0ms: User 1 on Node A: UPDATE orders SET status='SHIPPED' WHERE id='O-001'
  t=0ms: User 2 on Node B: UPDATE orders SET status='CANCELLED' WHERE id='O-001'
  (Same row, different nodes, same instant)
  
  t=5ms: Node A receives Node B's change — CONFLICT
         Which one wins? SHIPPED or CANCELLED?

CONFLICT RESOLUTION OPTIONS:
  Last-write-wins (LWW): use timestamp, later write wins
    → Problem: clock skew between nodes means the "later" timestamp may be wrong
  
  Application-level resolution: detect conflict, send to application for manual resolution
    → Complex, slows down writes
  
  CRDT (Conflict-free Replicated Data Types): data structures designed to merge without conflict
    → Works for counters and sets, not for ORDER STATUS

WHEN MASTER-MASTER MAKES SENSE:
  ✅ Geo-distributed writes where users are physically in different regions
     and need low write latency to their local data center
     Example: game user data — Europe users write to EU node, Asia users to APAC node
  
  ✅ Data types that can merge (user 1 adds to cart, user 2 adds to cart — both adds OK)
  
  ✅ When you use a database designed for it (CockroachDB, YugabyteDB, Galera)

WHEN NOT TO USE MASTER-MASTER:
  ❌ Financial transactions where order status must be consistent
  ❌ Inventory management (5 items in stock, two nodes each sell the last one)
  ❌ When single-region replication can handle your read scaling needs
  
  Verdict: 99% of applications should start with primary-replica (read replicas).
  Master-master is applied only when geo-distributed writes are a hard requirement.
```

---

## 4. The Code

### Wrong Way — Reading Everything From Primary
```java
// WRONG: All queries go to primary — read replicas wasted
@Repository
public interface OrderRepository extends JpaRepository<Order, String> {
    // No datasource routing — all queries use the default datasource (primary)
    List<Order> findByUserId(String userId);
    List<Order> findByStatus(String status);
    Page<Order> findAll(Pageable pageable);
    // At scale: primary drowns in read queries that replicas could serve
}
```
> **Why this fails:** At 100,000 read queries per second, the primary handles everything alone. Replicas are idle. The primary becomes a bottleneck for both reads and writes.

### Right Way — Routing Reads to Replica with Spring AbstractRoutingDataSource
```java
// DataSourceRouter: determines which connection to use for each transaction
public class ReadWriteRoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        // TransactionSynchronizationManager.isCurrentTransactionReadOnly() returns true
        // when the currently active @Transactional is annotated with readOnly = true
        boolean isReadOnly = TransactionSynchronizationManager.isCurrentTransactionReadOnly();
        return isReadOnly ? "REPLICA" : "PRIMARY";
    }
}

// Configuration: wire up primary + replica datasources
@Configuration
public class DataSourceConfig {

    @Bean
    @ConfigurationProperties("spring.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @ConfigurationProperties("spring.datasource.replica")
    public DataSource replicaDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @Primary
    public DataSource routingDataSource(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {

        ReadWriteRoutingDataSource routing = new ReadWriteRoutingDataSource();
        Map<Object, Object> sources = new HashMap<>();
        sources.put("PRIMARY", primary);
        sources.put("REPLICA", replica);
        routing.setTargetDataSources(sources);
        routing.setDefaultTargetDataSource(primary);  // default to primary on unknown key
        return routing;
    }
}

// Service layer: annotate read methods with readOnly = true → routes to replica
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepo;

    // readOnly = true → TransactionSynchronizationManager.isCurrentTransactionReadOnly() = true
    // → DataSource router returns "REPLICA" connection
    @Transactional(readOnly = true)
    public List<Order> getOrdersForUser(String userId) {
        return orderRepo.findByUserId(userId);
    }

    // No readOnly annotation → routes to PRIMARY
    @Transactional
    public Order placeOrder(PlaceOrderCommand cmd) {
        Order order = new Order(cmd.getUserId(), cmd.getItems());
        return orderRepo.save(order);
    }

    // Read-after-write scenario: user just placed order, wants to see it
    // MUST use primary to avoid replication lag showing stale data
    @Transactional  // intentionally NOT readOnly — routes to primary
    public Order getOrderImmediatelyAfterPlacement(String orderId) {
        return orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order: " + orderId));
    }
}
```

```yaml
# application.yml
spring:
  datasource:
    primary:
      url: jdbc:postgresql://primary-db:5432/appdb
      username: ${DB_USER}
      password: ${DB_PASSWORD}
      hikari:
        maximum-pool-size: 20
        minimum-idle: 5
    replica:
      url: jdbc:postgresql://replica-db:5432/appdb
      username: ${DB_READONLY_USER}
      password: ${DB_READONLY_PASSWORD}
      hikari:
        maximum-pool-size: 40   # more pool space: replicas handle most reads
        minimum-idle: 10
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is database replication and why would you use it?"

**Hruday's answer:**
> Database replication means maintaining one or more synchronized copies of a database on separate servers. The server that accepts all writes is called the primary. The copies — kept in sync by streaming every committed write from the primary — are called replicas.
>
> You'd use it for two main reasons. First: read scaling. Most applications read far more than they write — product browsing, dashboards, search. By routing those read queries to replicas, you reduce load on the primary and scale read capacity by simply adding more replicas. Second: high availability. If the primary server fails, you promote a replica to become the new primary in typically 30 seconds or less, instead of restoring from backup which could take hours.
>
> The tradeoff is replication lag: replicas are slightly behind the primary — usually milliseconds, but sometimes seconds under heavy write load. For most reads, this is acceptable. For cases where a user needs to read data they just wrote — like viewing their just-submitted order — you must ensure that read goes to the primary.

---

### Q2 — Replication Lag Handling
**Interviewer asks:** "A user updates their profile and immediately refreshes to see the change, but sees the old data. What happened and how do you fix it?"

**Hruday's answer:**
> The user's update went to the primary, but the profile page GET request was routed to a read replica that hasn't yet applied the change — this is replication lag causing a read-after-write inconsistency. It's especially visible for users who can immediately verify their own changes.
>
> The simplest fix: for the profile page specifically, route reads to the primary after a write. In Spring, this means not annotating the post-write read with `readOnly = true` — it then goes through the primary DataSource in the routing configuration.
>
> A more scalable approach: when the user writes their profile change, store a flag in their session or in Redis — "this user modified their profile at time T." For the next 10 seconds, their profile reads are routed to the primary. After 10 seconds, replication has certainly caught up, and reads return to the replica. This avoids permanently routing all profile reads to the primary.
>
> For non-critical data — search rankings, recommendation lists — I'd accept eventual consistency and document it. "Rankings update within 30 seconds" is a reasonable product decision that avoids over-engineering.

---

### Q3 — Master-Master
**Interviewer asks:** "Why not just use master-master replication so all servers accept writes?"

**Hruday's answer:**
> Master-master seems attractive — if both nodes accept writes, you get write scaling too. The problem is write conflicts: two nodes accept different writes to the same row simultaneously. "What is the order status: SHIPPED or CANCELLED?" The system must resolve this conflict, and the resolution strategies all have drawbacks.
>
> Last-write-wins using timestamps fails because clock synchronization between servers is imperfect — a write that actually happened later can have an earlier timestamp due to clock skew. Application-level conflict resolution is complex and slow. CRDTs work for specific data types like counters but not for status fields or financial balances.
>
> For the vast majority of applications — including most fintech and e-commerce systems — primary-replica with read routing solves the scaling problem without the conflict complexity. Master-master is genuinely useful for geo-distributed global applications where users in different regions MUST have low-latency writes to their local data center, and when you use a database specifically designed to handle conflicts (CockroachDB, YugabyteDB). Starting with master-master to get write scaling is almost always the wrong choice.

---

### Q4 — System Design
**Interviewer asks:** "Design the database layer for an application expecting 80% reads and 20% writes at 50,000 queries per second."

**Hruday's answer:**
> At 50,000 queries per second with 80% reads: 40,000 reads/sec, 10,000 writes/sec.
>
> Primary server: handles 10,000 writes per second. Modern Postgres with good hardware handles 15,000-20,000 writes per second comfortably. Primary is not the bottleneck.
>
> Read replicas: 40,000 reads/sec. If each replica handles 15,000 read queries/second, you need 3 replicas to handle the load with headroom. I'd add a 4th as a standby/hot failover.
>
> Routing: Spring's AbstractRoutingDataSource with read-only transaction annotation routes reads to a load balancer in front of the three read replicas. Writes go directly to primary.
>
> Replication lag management: instrument the replication lag metric — `SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))` on each replica. Alert if lag exceeds 5 seconds. For user-specific read-after-write: post-mutation reads for the same user go to primary for a 5-second window.
>
> Connection pooling: PgBouncer in front of each node — the application doesn't hold thousands of Postgres connections directly. Primary pool: 200 connections. Replica pool: 200 connections each.
>
> Failover: Patroni (or AWS RDS Multi-AZ) manages automatic failover — promotes the most up-to-date replica, updates DNS in ~30 seconds. Application reconnects via the same DNS name.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "readOnly forces replica use" | "Just mark transactions readOnly and queries go to replica" | "@Transactional(readOnly = true) alone does NOT route to a replica — it's a hint to Hibernate to not flush and to JDBC to set the connection read-only flag. To actually route to a different DataSource, you need AbstractRoutingDataSource (or a library like LazyConnectionDataSourceProxy + Replication DataSource). Most teams end up with @Transactional(readOnly=true) everywhere but still reading from primary because they never wired up the routing." |
| "Adding replicas scales writes" | "More read replicas means more write capacity too" | "Replicas don't scale writes — every replica receives and applies EVERY write from the primary. Adding 10 replicas means the primary must stream writes to 10 replicas, potentially increasing primary write I/O. Writes scale through sharding (different rows on different servers) or write-ahead queue architectures — not through read replicas. Read replicas scale READS only." |
| "Replication lag is always milliseconds" | "Replication lag is negligible — always just a few milliseconds" | "Under normal load, yes — often under 10ms. But during a big batch write (importing 10 million rows, running a large migration, doing bulk updates), the replication log grows faster than the replica can apply changes. Replication lag can grow to seconds or even minutes. Production incidents happen when teams assume lag is always negligible and ship code that reads from replicas without handling eventual consistency. Monitor lag as a production metric; alert at 5 seconds." |
| "Master-master for availability" | "Master-master gives you HA because both nodes are active" | "Primary-replica synchronous replication with automatic failover (Patroni, AWS RDS Multi-AZ) gives you HA with much less complexity than master-master. The typical failover time is 20-60 seconds, which is acceptable for most availability SLAs. Don't use master-master just for HA — use synchronous primary-replica replication with automated failover tooling. Master-master is for geo-distributed write requirements, not just availability." |

---

## 7. Hruday's Real Experience Hook

> "At Capgemini, a Node.js + PostgreSQL service started seeing timeouts during business-hour peak traffic — the database was CPU-bound serving both API read queries and scheduled reports simultaneously. The quick fix we shipped was a single read replica with an AbstractRoutingDataSource equivalent in Node.js that routed all scheduled report queries to the replica. Primary CPU usage dropped from 95% to 40%. The deeper lesson: separate your read and write traffic routing from day one in the architecture, even if you start with a single server — the routing code is trivial to add, but retrofitting it after production incidents is painful."

---

## 8. Scale Evolution

**Small system (< 1M reads/day):** Single primary is fine. Prepare for replication by using `@Transactional(readOnly=true)` consistently so routing is easy to add later.

**Medium system (1M-100M reads/day):** Add one read replica. Route heavy read operations (reports, search, analytics) to the replica. Monitor replication lag.

**Large system (> 100M reads/day):** Multiple replicas behind a load balancer. Separate replica for analytics/reporting (can tolerate more lag, can run heavy queries without affecting user-facing reads). Connection pooling (PgBouncer) at each layer.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment transaction reads vastly outnumber writes. Read replicas for merchant dashboards, settlement views, and audit queries. Replication lag on financial data requires careful read-after-write handling. | "How would you ensure a merchant always sees their just-completed transaction in the dashboard?" |
| Swiggy / Meesho | Order history and catalogue browsing are 90%+ reads. Replication architecture directly enables peak-hour read scaling during meal times. | "Design the database tier to handle 10× the normal read traffic during dinner hours." |
| Adobe / Microsoft | Analytics and reporting workloads separated from transactional workloads via read replicas. Synchronous replication for data durability requirements. | "How do you prevent analytics reports from impacting user-facing API performance at the database layer?" |
| SAP Labs (current) | Oracle Data Guard (equivalent to Postgres streaming replication) is standard for SAP production deployments. Understanding primary-standby concepts helps when configuring custom Oracle integrations and high availability setups. | "How does Oracle Data Guard differ from Postgres streaming replication, and what's the failover mechanism?" |

---

## 10. Related Topics — What to Study Next

- **Topic 92 — Sharding and Partitioning** — when replication alone can't keep up with write load, sharding is the next scaling step; the two techniques are complementary
- **Topic 93 — Read Replicas in Practice** — deeper dive into connection pooling, replica health monitoring, and lag handling strategies beyond the fundamentals covered here
- **Topic 95 — Isolation Levels** — understanding isolation levels is essential for designing correct transaction boundaries, which affects how replication lag impacts application correctness

---

*Part 5 · Database Replication — Master-Slave, Master-Master · Full Stack Interview Guide · Hruday D · 2026*
