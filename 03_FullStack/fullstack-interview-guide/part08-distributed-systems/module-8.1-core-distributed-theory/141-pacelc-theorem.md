# PACELC Theorem
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **PACELC** is an extension of CAP that adds the latency dimension. CAP only describes what happens during a network **P**artition. PACELC adds: even when there's **E**lse — no partition, normal operation — there's still a trade-off between **L**atency and **C**onsistency.
- **Full expansion**: If there's a **P**artition, choose between **A**vailability and **C**onsistency. **E**lse (no partition), choose between **L**atency and **C**onsistency.
- **Why CAP is incomplete**: CAP only talks about failure scenarios. But normal-operation trade-offs matter too. To make a write consistent across replicas, you need to wait for all replicas to acknowledge — that takes time (latency). To make it fast, you write to one replica and replicate asynchronously — but now reads on other replicas may be stale (inconsistency). This latency-vs-consistency trade-off happens every second, not just during rare partitions.
- **Database classifications**: DynamoDB is PA/EL (Available under partition, Low-latency normally — eventual consistency by default). Cassandra is PA/EL (same pattern). Google Spanner is PC/EC (Consistent under partition, Consistent normally — but at higher latency cost). MySQL with sync replication is PC/EC. Maria DB in async mode is PA/EL.
- **The practical question PACELC answers**: "Even when there's no failure, should I write to one replica fast (low latency, maybe stale reads) or write to all replicas synchronously (consistent reads, higher latency)?" This is a daily engineering decision, not a disaster scenario.
- **Interview signal**: mentioning PACELC after discussing CAP shows depth. It signals that you understand distributed systems trade-offs happen in normal operation, not just failures.

---

## 1. One-Line Definition
PACELC extends CAP by recognising that even when there is no network partition (the normal case), distributed systems still face a trade-off between low latency (write fast, replicate later) and strong consistency (wait for all replicas before responding).

---

## 2. The Problem It Solves

### What CAP Misses — The Everyday Performance vs Consistency Trade-Off

```
SCENARIO: Swiggy writes a new restaurant listing to a database with 3 replicas
          across Mumbai (primary), Pune (replica 1), Hyderabad (replica 2).

THE NETWORK IS FINE — no partition. CAP says you can have C + A + P.
But you still have a choice to make every single write:

CHOICE A — Synchronous replication (wait for all replicas):
  Application → Mumbai: "Write: restaurant XYZ open"
  Mumbai writes locally
  Mumbai → Pune: replicate
  Mumbai → Hyderabad: replicate
  Wait for Pune ACK (30ms network round trip)
  Wait for Hyderabad ACK (45ms network round trip)
  Return success to application
  Total write latency: 45ms (must wait for slowest)
  
  RESULT:
    ✅ Any read from any node immediately sees restaurant XYZ
    ❌  Every write takes 45ms minimum (cross-region RTT)
    ❌  If Hyderabad is slow, every write is slow
  
CHOICE B — Asynchronous replication (write primary, replicate in background):
  Application → Mumbai: "Write: restaurant XYZ open"
  Mumbai writes locally
  Returns success to application IMMEDIATELY (2ms)
  In background: Mumbai → Pune: replicate (30ms later)
  In background: Mumbai → Hyderabad: replicate (45ms later)
  
  RESULT:
    ✅ Write latency: 2ms (very fast)
    ❌ For the next 30-45ms, reads from Pune or Hyderabad don't see restaurant XYZ
    ❌ User in Hyderabad searches for restaurant XYZ — not found (search hit Hyderabad replica)
    ❌ Inconsistent reads across replicas
    
THIS IS THE PACELC TRADE-OFF — and it happens on every single write, not just partitions.

CAP doesn't model this. PACELC does:
  PA/EL: Available under partition, favour Low-latency normally
         → Write fast, accept stale reads during propagation
  PC/EC: Consistent under partition, favour Consistency normally
         → Wait for replicas, reject writes during partition
```

---

## 3. How It Works Internally

### The PACELC Classification

```
DATABASE            P-A or P-C    E-L or E-C    NOTES
────────────────────────────────────────────────────────────────────
Cassandra           PA            EL            Default: eventual consistency
                                                Tunable: can increase to QUORUM
DynamoDB            PA            EL            Eventually consistent default
                                                Optional strongly consistent reads (+cost)
MySQL async replica PA            EL            Async replication = stale reads possible
CouchDB             PA            EL            Conflict resolution, eventual merge
Riak                PA            EL            Vector clocks for conflict resolution

Google Spanner      PC            EC            TrueTime API, Paxos consensus
                                                External consistency: your best-effort CP
PostgreSQL sync     PC            EC            Sync replication: waits for standby
HBase               PC            EC            CP — refuses reads during HDFS issues
ZooKeeper           PC            EC            Leader election: CP by design
etcd                PC            EC            Raft consensus: PC/EC
MongoDB (default)   PA            EL            Primary writes fast, may be stale on read
MongoDB (majority)  PC            EC            writeConcern:majority + readConcern:majority

NOTATION:
  PA = Available under Partition (continue serving, may diverge)
  PC = Consistent under Partition (refuse to serve rather than diverge)
  EL = Low latency Else (async replication in normal operation)
  EC = Consistent Else (sync replication in normal operation, higher latency)
```

### Visualising the Normal-Operation Trade-Off

```
WRITE REQUEST LATENCY vs CONSISTENCY

  High consistency │         Sync to all replicas (PC/EC)
    (strong        │         e.g. Spanner, PostgreSQL sync
     consistency)  │         Write waits for all ACKs
                   │         RTT to furthest replica
                   │
                   │    └───────── PACELC trade-off applies HERE
                   │               (no partition, just performance vs correctness)
  Low consistency  │
    (eventual)     │──────────── ► Write to primary only (PA/EL)
                       │         e.g. Cassandra ONE, DynamoDB default
                       │         Write returns at primary ACK
                       │         ~1-5ms  │  ~30-50ms cross-region
                       │
                 Low latency         High latency
                 (fast writes)     (slow writes, strong reads)
                 
READING STALENESS:
  With PA/EL (async replication):
    After a write, for duration T (replication lag):
    Reads from replicas may return OLD value
    T = network RTT to replica + processing time
    Typically 10ms (same data centre) to 200ms (cross-region)
    
    Applications must accept: "I wrote X, but if I immediately read
    from a different replica, I may not see X yet"
    Solutions: read-your-writes consistency (route reads to same node),
               version vectors, or wait for propagation
```

---

## 4. The Code

### ❌ Wrong Way — Ignoring Replication Lag in Application Logic

```java
// ❌ WRONG: Writing to primary, immediately reading from replica, assuming consistency
@Service
public class RestaurantService {

    @Autowired
    @Qualifier("primaryDataSource")  // writes go to primary
    private JdbcTemplate primaryJdbc;

    @Autowired
    @Qualifier("readReplicaDataSource")  // reads go to replica
    private JdbcTemplate replicaJdbc;

    public Restaurant createRestaurant(CreateRestaurantRequest req) {
        // Write to primary
        primaryJdbc.update(
            "INSERT INTO restaurants (id, name, status) VALUES (?, ?, 'ACTIVE')",
            req.getId(), req.getName()
        );

        // ❌ Immediately read from replica — async replication means it's NOT there yet!
        // Replication lag could be 50-500ms. This read will return null.
        Restaurant created = replicaJdbc.queryForObject(
            "SELECT * FROM restaurants WHERE id = ?",
            restaurantRowMapper, req.getId()
        );

        // ❌ This throws NullPointerException — or worse, silently returns wrong data
        notifyAdminDashboard(created);
        return created;
    }
}
```

> **Why this fails in production:** Async read replicas have replication lag — typically 10-500ms. Writing to primary and immediately reading from replica breaks the "read your writes" expectation. This is a classic PACELC-EL bug: you chose low latency writes, but didn't account for the resulting inconsistency.

---

### ✅ Right Way — Acknowledge the Latency-Consistency Trade-Off Explicitly

```java
// ✅ RIGHT: Explicit routing strategy that acknowledges PACELC trade-off
@Service
@RequiredArgsConstructor
@Slf4j
public class RestaurantService {

    private final RestaurantRepository primaryRepo;         // writes + critical reads
    private final RestaurantReadReplicaRepository replicaRepo; // non-critical reads
    private final ApplicationEventPublisher events;

    // ✅ After a write, read back from PRIMARY (not replica) to confirm and return
    // This is "read your writes" consistency — send read to same node as write
    @Transactional
    public Restaurant createRestaurant(CreateRestaurantRequest req) {
        Restaurant saved = primaryRepo.save(Restaurant.builder()
            .id(req.getId())
            .name(req.getName())
            .status(RestaurantStatus.ACTIVE)
            .build());

        // ✅ Read from PRIMARY — same node we just wrote to — guaranteed to see our write
        log.info("Restaurant created: id={} name={}", saved.getId(), saved.getName());

        // Publish event: async notification does not need to wait for replication
        events.publishEvent(new RestaurantCreatedEvent(saved));
        return saved;
    }

    // ✅ For non-critical reads (listing page, search): use replica — accept staleness
    // This is the PACELC-EL choice: low latency, possibly stale data
    public Page<Restaurant> listRestaurants(String city, Pageable pageable) {
        // Replica may be 50-200ms behind primary — fine for a listing page
        // User won't notice if a restaurant added 100ms ago isn't shown yet
        return replicaRepo.findByCityAndStatus(city, RestaurantStatus.ACTIVE, pageable);
    }

    // ✅ For admin operations requiring freshness: always use primary
    // This is the PACELC-EC choice: accept higher latency for correctness
    public Restaurant getRestaurantForAdmin(String restaurantId) {
        // Admin console should see the latest state, not possibly-stale replica data
        return primaryRepo.findById(restaurantId)
            .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found"));
    }

    // ✅ For highly critical reads (payment verification, inventory check):
    // Read from primary AND add explicit version check
    public boolean verifyRestaurantActiveForOrder(String restaurantId) {
        // Never use replica for order acceptance verification — primary only
        return primaryRepo.existsByIdAndStatus(restaurantId, RestaurantStatus.ACTIVE);
    }
}
```

```yaml
# Spring Boot: routing reads to replica vs primary
# application.yml
spring:
  datasource:
    primary:
      url: jdbc:postgresql://primary-host:5432/swiggydb
      # Used for: writes, critical reads, admin queries (PACELC-EC behaviour)
    read-replica:
      url: jdbc:postgresql://replica-host:5432/swiggydb
      # Used for: non-critical listing reads, search, analytics (PACELC-EL behaviour)
      # Acknowledge: replica may lag primary by 10-500ms
      # Configure acceptable lag: monitoring alert if lag > 1000ms
      
  # DynamoDB: explicit per-request consistency choice (PACELC in SDK)
  # dynamodb:
  #   Default reads: eventually consistent (PA/EL — low latency)
  #   Override to strongly consistent: .withConsistentRead(true) (PC/EC — higher cost)
```

---

## 5. Interview Questions & Model Answers

### Q1 — Definition
**Interviewer asks:** "What is PACELC and why is it more useful than CAP for real-world database selection?"

**Hruday's answer:**
> PACELC is an extension of CAP proposed by Daniel Abadi. CAP only models what happens during a network partition — a relatively rare event. But PACELC says: even when the network is perfectly healthy (the "Else" case), there's still a trade-off: do you favour low Latency or strong Consistency when replicating writes?
>
> This matters in practice because database designers make this choice for every write, not just during failures. If I write to a Cassandra primary with ConsistencyLevel.ONE, the write returns in 2ms, but the other two replicas are updated asynchronously over the next 50ms. That's the EL choice — low latency, eventual consistency. If I use ConsistencyLevel.ALL, every write waits for all three replicas before returning — that's the EC choice — consistent, higher latency.
>
> CAP would classify Cassandra as AP and PostgreSQL with sync replication as CP — and stop there. PACELC gives fuller information: Cassandra is PA/EL; PostgreSQL sync replication is PC/EC. That tells me: Cassandra is fast in normal operation but accepts staleness; PostgreSQL sync is consistent in normal operation but slower writes.
>
> For selecting a database in a system design: PACELC lets me match the database's normal-operation behaviour to my use case, not just its partition behaviour. High-traffic listing reads: PA/EL database (Cassandra, DynamoDB). Financial transactions: PC/EC database (Spanner, PostgreSQL sync). That's why PACELC is the more useful framework.

---

### Q2 — Application
**Interviewer asks:** "How do you handle the EL trade-off (replication lag) in your application code?"

**Hruday's answer:**
> When using a PA/EL system (async replication), the main challenge is "read your writes" consistency — a user writes something and immediately expects to read it back. If the write went to the primary and the read routes to a stale replica, the user sees their change hasn't saved. This erodes trust even though the system is technically working correctly.
>
> Several strategies work: first, sticky reads — route reads to the same node the write went to for a short time window after the write (Redis stores user-to-primary-node affinity for 5 seconds after a write). Second, write-then-read-from-primary — after a write, explicitly read back from the primary (not the replica) to confirm and return the result to the caller. Third, version-based reads — include a version token with the write response; on subsequent reads, pass this token; the system routes to a node that has at least this version.
>
> In the code at SAP Labs, we used the write-then-read-from-primary strategy for our entity creation flows. After persisting a financial document, we immediately queried the primary to get the complete record (with DB-generated fields like ID and timestamp) and returned that to the caller. Read-heavy paginated queries used the read replica — a 200ms stale product list is fine. Financial document status checks always hit the primary.

---

### Q3 — Trade-Off Decision
**Interviewer asks:** "Would you use a PA/EL or PC/EC database for Swiggy's order table? Justify your answer."

**Hruday's answer:**
> The order table has mixed requirements, so I'd split it. The order creation write and order status reads (for the customer's tracking screen) need strong consistency — PC/EC. If an order is placed, the customer must see it instantly. If the delivery partner marks it "picked up," the customer must see that immediately. Replication lag on the tracking screen creates a terrible experience. For this: PostgreSQL with synchronous standby, or MySQL with `sync_binlog=1` and `innodb_flush_log_at_trx_commit=1`. Write latency will be ~50ms for cross-zone sync — acceptable for an order transaction.
>
> The order analytics table (number of orders per restaurant per hour, delivery partner performance metrics) is pure AP/EL. Nobody cares if the analytics dashboard shows data that's 15 seconds old. For this: Cassandra or ClickHouse, async replication, fast writes at PA/EL. We'd stream order events from Kafka into the analytics store asynchronously.
>
> The order search index (customer searches "my orders") is PA/EL acceptable — Elasticsearch or OpenSearch with async indexing from Kafka. If a new order takes 2 seconds to appear in search results, that's fine. The order detail page (customer sees the order they just placed) always reads from the PC/EC PostgreSQL primary.
>
> In summary: one business domain, three data stores, three different PACELC choices, based on the consistency tolerance of each use case.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "PACELC is just an academic extension of CAP" | "I know CAP, PACELC is the same thing" | "PACELC is the practical framework. In a real distributed system, network partitions are rare (maybe once per year for well-designed systems). But replication lag happens on every single write, many times per second. The EL vs EC trade-off is a continuous daily decision, not an emergency response. DynamoDB, Cassandra, and MongoDB in default configuration are all PA/EL — this affects your application behaviour all day, not just during failures. Any AWS/Swiggy/Razorpay system design interview expects you to discuss replication lag for normal operation, not just partition behaviour." |
| "Google Spanner solves the PACELC trade-off" | "Spanner is CP and solves the latency problem with TrueTime" | "Spanner is PC/EC — it still makes the consistency-over-latency choice in normal operation. Spanner accepts higher write latency (Paxos consensus across replicas adds ~5-14ms for cross-region writes) to guarantee external consistency. It minimises this latency with TrueTime (GPS + atomic clock + bounded uncertainty), but it doesn't eliminate it. Spanner is the best available balance at enormous engineering cost ($$$). It doesn't dissolve the PACELC trade-off — it makes the best possible compromise at the 'EC' corner. For most applications: PostgreSQL with sync replication in a single region achieves PC/EC at much lower cost." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we had a PostgreSQL setup with one synchronous standby in the same data centre. This was PC/EC by design — every write waited for the standby's acknowledgement before returning success to the application. This added about 5ms of extra write latency per transaction. We accepted this as the cost of consistency. Our reporting queries used an asynchronous read replica — PA/EL — which could lag up to 30 seconds during heavy batch windows. I now understand this as an explicit PACELC design: PC/EC for the write path (financial data), PA/EL for the read-heavy reporting path. At the time we didn't frame it with this terminology, but the database topology expressed exactly the PACELC trade-off we were making."

---

## 8. Scale Evolution

**1,000 users →** Single database. No replication. PACELC not relevant — single node has no consistency-latency dilemma beyond disk I/O speed.

**100,000 users →** Add read replica (async = PA/EL for reads). Write to primary, read from replica for listings. Accept replication lag. Route critical reads to primary. Monitor replication lag — alert if > 500ms.

**10 million users →** Multi-region. PA/EL for catalog/sessions: Cassandra or DynamoDB in eventual consistency mode globally distributed. PC/EC for financial data: Spanner or CockroachDB (distributed SQL, PC/EC via Raft). Application must explicitly decide per-operation: which store, which consistency level. PACELC framework is the vocabulary for these architecture decision records.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment writes must be PC/EC (sync to standby before success). Transaction history reads can be PA/EL (async replica). Reconciliation jobs tolerate settlement lag. | "In Razorpay's payment system, what consistency model do you use for balance deductions vs transaction history reads, and why?" |
| Swiggy / Meesho | Order write = PC/EC. Product catalog = PA/EL (high read volume, tolerates stale). Flash sale inventory deduction = PC/EC (cannot oversell). Review comments = PA/EL. | "Walk me through the PACELC choices for each major data store in Swiggy's architecture." |
| Adobe / Microsoft | Asset metadata writes: PC/EC (content creator must see their upload immediately). Analytics: PA/EL (view counts 30s stale is fine). Collaboration cursor positions: PA/EL (real-time positions, stale ok). | "Adobe's collaborative design tool shows cursor positions for multiple users. What consistency model is appropriate for cursor position replication?" |
| SAP Labs (current) | Financial postings: PC/EC mandated by audit requirements. Report data: PA/EL acceptable. Config management (Spring Cloud Config): PC/EC — all services must see same config version. | "SAP's financial system writes a GL posting. What consistency guarantees are needed between the primary database and analytics replica?" |

---

## 10. Related Topics — What to Study Next

- **Topic 140 — CAP Theorem** — the foundation that PACELC extends; understanding the C/A partition-time choice is a prerequisite; PACELC adds the EL/EC normal-operation layer on top of CAP's partition-time layer
- **Topic 142 — Strong vs Eventual Consistency** — the concrete implementation of the PACELC E-side trade-off; strong consistency = EC (wait for all replicas); eventual consistency = EL (replicate asynchronously); this topic operationalises what PACELC describes theoretically
- **Topic 143 — Quorum-Based Systems** — the quorum mechanism is how databases like Cassandra tune their position on the PACELC spectrum; `QUORUM` consistency is the practical dial between PA/EL and PC/EC; understanding quorum maths shows why `R + W > N` gives "read your writes"
- **Topic 93 — Read Replicas** — the direct infrastructure implementation of the PA/EL choice in relational databases; async read replicas trade consistency for read throughput; this topic shows how to configure, monitor, and route traffic around replication lag

---

*Part 8 · PACELC Theorem · Full Stack Interview Guide · Hruday D · 2026*
