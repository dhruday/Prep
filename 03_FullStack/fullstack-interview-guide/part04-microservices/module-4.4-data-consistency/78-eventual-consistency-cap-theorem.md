# Eventual Consistency — CAP Theorem, BASE vs ACID
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Eventual consistency = a guarantee that if no new updates are made to a piece of data, ALL replicas or services will converge to the same value EVENTUALLY — but reads at any given moment might return stale data
- CAP Theorem: a distributed system can guarantee at most two of three properties — Consistency (every read gets the most recent write), Availability (every request gets a response), Partition Tolerance (system keeps working despite network partitions). Since network partitions occur in real distributed systems, you must choose between C and A.
- CP systems (choose Consistency over Availability): during a network partition, block or fail requests rather than return stale data — example: Zookeeper, HBase, traditional relational DBs with synchronous replication
- AP systems (choose Availability over Consistency): during a network partition, continue serving requests with possibly stale data, converging later — example: Cassandra, DynamoDB, CouchDB, DNS
- BASE (the AP model): **B**asically **A**vailable, **S**oft state, **E**ventual consistency — the philosophical model for distributed systems that prioritize availability
- ACID (the CP model): **A**tomic, **C**onsistent, **I**solated, **D**urable — the traditional relational database transaction model
- Gap to bridge: candidates often say "we use eventual consistency" but cannot define the staleness window, what read anomalies are possible, or when eventual consistency is unacceptable — those three details are the senior-level differentiators

---

## 1. One-Line Definition
Eventual consistency is a distributed system consistency model where updates to a data item are guaranteed to propagate to all replicas and services over time — but reads may temporarily return stale or different values from different replicas during that propagation window.

---

## 2. The Problem It Solves

A single-database monolith has ACID consistency by default. When you write to Postgres and immediately read from it (same connection), you read exactly what you wrote. All transactions are linearisable — there is one definitive order of operations.

In a distributed system, this becomes hard:

**Problem 1 — Database Replication Lag:**
```
Write to Primary Postgres → Replication to Replica → Read from Replica
         |                         |                         |
      t=0ms                     t=50ms                   t=10ms
                                                     (reads BEFORE replication)
→ User writes a profile update → reads their own profile immediately
→ Gets the OLD profile (pre-update)
→ Looks broken even though data will be correct in 40ms
```

**Problem 2 — Multiple Microservices with Separate Data:**
```
UserService writes new email to its database
OrderService has a cached copy of the user's email
                    
At t=0:  UserService: email = "new@example.com" ✅
At t=0:  OrderService cache: email = "old@example.com" ❌ (stale)
At t+5s: OrderService received UserEmailUpdated event → updates cache ✅
          
Between t=0 and t+5s: OrderService sends emails to the OLD address
→ This is the "inconsistency window" — it exists, it's real, and it's acceptable if understood
```

**Problem 3 — Network Partitions:**
```
US-East writes to User table
Network partition occurs — US-West cannot reach US-East for 3 seconds

Choice:
Option A (CP): Refuse all writes and reads on US-West during partition → consistent but UNAVAILABLE
Option B (AP): Allow reads and writes on US-West (possibly diverging from US-East) → available but INCONSISTENT
               → Merge/reconcile when partition heals → eventual consistency
```

Eventual consistency is the design choice that prioritises Availability (Option B) and accepts temporary inconsistency in return. It solves the "how do I keep the system working despite network issues and replication lag" problem.

---

## 3. How It Works Internally

### The CAP Theorem — Formalised

```
           CONSISTENCY
          (every read returns
           the latest write)
                △
               /|\
              / | \
             /  |  \
            /   |   \
           /    |    \
          /     |     \
AVAILABIL. ────────────── PARTITION
(every request    TOLERANCE
 gets a response) (keeps working
                   despite net failures)

REAL distributed systems: PARTITION TOLERANCE is mandatory (networks DO fail).
Therefore: choose between CONSISTENCY (CP) and AVAILABILITY (AP).

CP systems:
- MongoDB (with majority write concern + read from primary)
- Apache Zookeeper (majority consensus before responding)
- HBase
- Google Spanner (uses TrueTime for strict external consistency)

AP systems:
- Apache Cassandra (tunable consistency, but default is AP)
- Amazon DynamoDB (eventually consistent reads by default)
- Apache CouchDB
- DNS (cached responses are eventually consistent)
- Microservices Saga architecture (by design)
```

### ACID vs BASE — Side by Side

```
ACID (relational databases, monolith):
─────────────────────────────────────
A - Atomicity:   ALL operations in a transaction commit or ALL rollback. No partial.
C - Consistency: Every transaction takes the DB from one valid state to another valid state.
I - Isolation:   Concurrent transactions behave as if they ran serially (no dirty reads, etc.)
D - Durability:  Committed data survives crashes (written to disk/WAL).

Trade-off: To achieve full ACID across multiple distributed nodes, you need synchronous coordination
           (like 2PC), which has availability and performance costs.

BASE (distributed systems, AP systems):
───────────────────────────────────────
B - Basically Available: The system responds to ALL requests (even during partitions).
                         Responses might be stale or partial, but the system doesn't refuse.
S - Soft State:          State may change over time even without new input — as replication
                         and convergence propagate previous writes asynchronously.
E - Eventually Consistent: Given no new writes, all replicas/services WILL converge to the
                            same value. The "when" depends on network lag and system design.

Trade-off: Reads may be stale. Application code must handle "I might get old data" scenarios.
           Design patterns (Saga, Outbox, idempotency keys) are required to handle this safely.
```

### Types of Consistency Models (Spectrum from Strongest to Weakest)

```
STRONG / LINEARIZABILITY (strongest):
  - Every read reflects the most recent write, globally
  - All operations appear to happen instantaneously in a single, globally agreed order
  - Spanner achieves this with TrueTime. Very expensive.

SEQUENTIAL CONSISTENCY:
  - Operations from ALL processes appear in some globally agreed order
  - Each process's operations appear in program order
  - Not necessarily real-time

CAUSAL CONSISTENCY:
  - If event A caused event B (A happens-before B), all nodes see A before B
  - Unrelated events can be seen in different orders by different nodes
  - Good middle ground for many systems

EVENTUAL CONSISTENCY (weakest practical):
  - If no new writes, all replicas converge
  - Reads may be stale
  - No guarantee on ORDER of convergence (unless CRDTs or vector clocks are used)
  - Simplest to implement at scale

READ-YOUR-OWN-WRITES (special case of eventual):
  - After a user writes, they always read their own writes
  - Other users may still see stale data
  - Achieved by sticky sessions or routing reads after writes to the same node
  - Solves the "I updated my profile and it still shows old data" problem
```

### The Inconsistency Window — What It Means in Practice

```
Example: Product stock update after a sale

OrderService places order at t=0: stock = 10 → 9 (writes to order DB)
Publishes StockDecremented event to Kafka

ProductCatalogService receives event at t=200ms (Kafka processing lag)
→ Updates its cached stock to 9

Between t=0 and t=200ms:
→ ProductCatalogService still shows stock=10
→ Two concurrent orders might both see "1 in stock" and both try to purchase the last item
→ One order will fail at the actual inventory check (authoritative source)

This is the INCONSISTENCY WINDOW: ~200ms in this example.

Acceptability depends on business context:
- For stock display on product page: 200ms stale is completely acceptable
- For preventing double-booking of a hotel room: stronger consistency required
  (use database-level row locking or pessimistic reservation with saga)
- For financial account balance: read from authoritative source directly (not cache/replica)
```

---

## 4. The Code

### Handling Read-Your-Own-Writes in a Microservice
```java
// Problem: User updates profile → immediately reads it from a replica → sees old data
// Solution: Route the immediate post-write read to the primary (authoritative source)

@Service
@Slf4j
public class UserProfileService {

    private final UserRepository primaryRepository;  // Connected to RW primary DB
    private final UserCacheRepository cacheRepository; // Redis cache (may be stale)

    // After a write, read from primary to ensure read-your-own-writes
    @Transactional
    public UserProfile updateProfile(String userId, ProfileUpdateRequest request) {
        UserProfile user = primaryRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
        
        user.updateFrom(request);
        UserProfile saved = primaryRepository.save(user);
        
        // Invalidate cache so next read gets fresh data
        cacheRepository.invalidate(userId);
        
        // Return the just-saved primary data — NOT from cache
        return saved;
    }

    // Normal reads: serve from cache (may be eventually consistent with primary)
    public UserProfile getProfile(String userId) {
        return cacheRepository.get(userId)
            .orElseGet(() -> {
                UserProfile fresh = primaryRepository.findById(userId)
                    .orElseThrow(() -> new UserNotFoundException(userId));
                cacheRepository.put(userId, fresh, Duration.ofMinutes(5));
                return fresh;
            });
    }
}
```

### Handling Stale Reads in a Saga Participant
```java
// Problem: OrderService receives an event about a user's new shipping address
// but may still have the old address in its local cache/table during the propagation window
// Solution: always use the event's data (source of truth at event time), not a re-fetch from cache

@Component
@Slf4j
public class OrderShippingEventHandler {

    @KafkaListener(topics = "user-events", groupId = "order-service")
    public void onUserAddressUpdated(UserAddressUpdatedEvent event, Acknowledgment ack) {
        // The event carries the data at the time of the change — this IS the latest address
        // Do NOT re-fetch the user to "be safe" — that fetch might return stale cached data
        // TRUST the event payload as authoritative for this operation

        orderRepository.updatePendingOrderShippingAddress(
            event.getUserId(),
            event.getNewAddress()  // Use data from the event, not from a cache lookup
        );

        log.info("Updated shipping address for userId={} on pending orders", event.getUserId());
        ack.acknowledge();
    }
}
```

### API Response That Communicates Eventual Consistency
```java
// When returning data that might be eventually consistent,
// include metadata that lets the client reason about freshness

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    @GetMapping("/{productId}/stock")
    public ResponseEntity<StockResponse> getStock(@PathVariable String productId) {
        StockInfo stock = productCatalogService.getStock(productId);

        StockResponse response = StockResponse.builder()
            .productId(productId)
            .stockLevel(stock.getLevel())
            .asOf(stock.getLastUpdatedAt())  // timestamp of when this data was last synced
            .consistencyNote("Stock levels are updated within 500ms of inventory changes")
            .build();

        return ResponseEntity.ok()
            .header("Cache-Control", "max-age=1")  // Clients may cache for 1 second
            .body(response);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is eventual consistency and how does it differ from strong consistency?"

**Hruday's answer:**
> Eventual consistency means that in the absence of new writes, all copies of a piece of data in a distributed system will converge to the same value. The word "eventual" is key — there is no time bound guarantee. In practice, well-designed systems converge in milliseconds to seconds, but the protocol doesn't promise a specific time.
>
> Strong consistency, or linearizability, means that every read reflects the latest write globally. After a write completes, any subsequent read — from any node, anywhere — returns that write's value. There's a globally agreed ordering of operations.
>
> The practical difference: in a strongly consistent system, if User A updates their profile on Server 1 and User B immediately reads it from Server 2, User B sees the updated profile. In an eventually consistent system, User B might see the old profile for a brief window — perhaps 200ms while the update propagates.
>
> The reason distributed systems often choose eventual consistency: achieving strong consistency requires synchronous coordination between ALL replicas for every write — every write must wait for confirmation from all nodes before returning. During a network partition, this means blocking indefinitely or failing. Eventual consistency lets you continue operating and propagate updates asynchronously when connectivity allows.

---

### Q2 — CAP Theorem Depth
**Interviewer asks:** "In the CAP theorem, why is Partition Tolerance not really optional?"

**Hruday's answer:**
> Network partitions in distributed systems aren't theoretical — they happen. A server's NIC fails, a switch drops packets, a cloud availability zone loses connectivity for 30 seconds. If you're running a distributed system with network communication between nodes, you WILL experience partitions.
>
> CP (choosing Consistency over Availability) means: when a partition occurs, the system refuses to serve reads or writes from the isolated nodes rather than risk serving stale or divergent data. The system is consistent but unavailable during the partition. Zookeeper does this — it refuses to answer if a quorum is unavailable. For a configuration management system like Zookeeper, this is correct — you'd rather fail than give wrong configuration data.
>
> AP (choosing Availability over Consistency) means: when a partition occurs, each side keeps serving requests with the data it has locally. When the partition heals, the system reconciles. DNS is the classic example — nameservers serve cached records during partitions. Your domain still resolves, just maybe to old IP. That's acceptable for DNS.
>
> For microservices, most business operations favour AP: "keep working, converge later." An e-commerce system continuing to show slightly stale product prices during a 10-second network hiccup is better than the entire checkout being blocked.

---

### Q3 — When NOT to Use Eventual Consistency
**Interviewer asks:** "Give me a concrete example where eventual consistency is NOT acceptable."

**Hruday's answer:**
> Financial balance reads during a transaction. If a user makes two concurrent withdrawals from different devices — say, they open the app on their phone and a web browser simultaneously — and both reads get the pre-withdrawal balance, both transactions might succeed, resulting in an overdraft. Eventual consistency means both withdrawal requests saw "balance = $100" and both committed. When they converge, balance = -$80 (impossible if you disallow overdrafts). That's a data integrity violation with real financial impact.
>
> The correct model here is pessimistic locking: the first withdrawal request acquires a row-level lock on the account balance row, processes, and releases. The second request waits until the first completes, then reads the updated balance. This is strong consistency — serialised access to the shared resource.
>
> Another example: distributed inventory reservation in a system where overbooking is unacceptable. A hotel booking system that shows one last room to 100 users simultaneously cannot use eventual consistency for the reservation step — it must serialise the reservation. (The availability page might use eventual consistency to show "rooms available: approximately 3" — that's fine. The final reservation confirmation must be strongly consistent.)
>
> The rule: whenever two concurrent operations on the same data can produce different results depending on which sees what, AND the wrong result has real-world consequences that cannot be compensated — that's where eventual consistency fails and you need stronger guarantees.

---

### Q4 — Practical Design Question
**Interviewer asks:** "How do you handle the case where a user orders an item that shows as available but is actually out of stock due to eventual consistency?"

**Hruday's answer:**
> This is a real scenario in e-commerce and I've thought through it for ordered services. The pattern is: use eventual consistency for display/browsing, and use strong consistency only at the point of commitment.
>
> The product listing page shows "In Stock" based on an eventually consistent cache or search index. This is OK — the display is approximate. 99% of the time it's accurate; occasionally it's slightly stale.
>
> When the user actually submits the order, the order placement saga reaches the Inventory Microservice, which does a transactional check: SELECT stock FOR UPDATE where product_id = ? — this is a database-level lock on the authoritative inventory row. If stock is 0, the order is rejected right there. The user gets an error: "Sorry, this item just went out of stock."
>
> The key insight: the browsable availability (eventually consistent) is a UX optimisation, not the final authority. The final authority is the authoritative inventory service's database, accessed with strong consistency at the point of commitment. This layered approach gives you the scale benefits of eventual consistency for browsing while maintaining data integrity for actual purchases.
>
> You can improve UX by having the saga try to reserve the item early in the flow (so the user knows early) and hold the reservation for a short window (10 minutes) while they go through checkout. This is pessimistic reservation — common in concert ticketing and hotel booking.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Eventual consistency is okay everywhere" | "Modern systems use eventual consistency, so we should too" | "The business requirement determines the consistency model, not the technology trend. Eventual consistency is acceptable for data where temporary staleness has no material impact — caches, search indexes, non-financial aggregates. It is NOT acceptable where stale reads can cause financial loss, legal violation, or unresolvable data conflicts. Map requirements to consistency models, never default to one model for everything." |
| "CAP says you only pick two" | "We choose CA — consistency and availability" | "CA is not a valid distributed system choice. Partition tolerance is not optional — networks do fail. 'Choosing CA' means choosing to pretend partitions don't happen and being surprised when they do. In reality, every distributed system makes a P/A or P/C trade-off. The real question is: when a partition occurs, does your system block (CP) or serve stale data (AP)?" |
| "Eventual consistency means no guarantees" | "With eventual consistency, anything might happen" | "Eventual consistency has a specific guarantee: convergence in the absence of new writes. Well-designed eventually consistent systems add additional guarantees on top: read-your-own-writes (you always see your own writes), monotonic reads (you never read a value older than one you've already seen), and causal consistency (you see caused-by events in order). The base model is weak, but applications build well-defined semantics on top." |
| "Just use distributed caches to be consistent" | "Put Redis in front and all services share the same data" | "A shared cache creates tight coupling and a shared-data anti-pattern (Topic 65). If the cache becomes unavailable, all services that depend on it are blocked. If cache invalidation is imperfect (which it always is), stale data still occurs — now system-wide. Each service should own its data and subscribe to events for updates. The eventual consistency window exists but is bounded and contained to the owning service's event processing latency." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle ERP, every cross-module report ran against a fully ACID-consistent transactional database. A Finance report at 5:00 PM showed the exact same data as a Supply Chain report at 5:01 PM — fully consistent, same database, all reads from the primary. As I studied distributed systems for SAP Labs and FAANG prep, I recognised this as the privilege of monolithic architecture: ACID for free. Designing the same reports in a microservices world requires acknowledging that the Finance service and Supply Chain service have separate databases, and their data is synchronized via events with a propagation delay. The equivalent distributed report would need to query both services and acknowledge that the totals might be off by a few seconds' worth of transactions. Understanding this tradeoff — ACID monolith vs. eventual consistency distributed — makes the 'why' of Kafka, Saga, and Outbox immediately clear."

---

## 8. Scale Evolution

**Monolith (strong consistency by default):** Every table read is a primary database read. All writes are ACID transactions. No eventual consistency challenges.

**First distributed step — read replicas:** Introduce replica lag as the first form of eventual consistency. Read-your-own-writes must be handled by routing post-write reads to the primary.

**Service decomposition:** Separate service databases make cross-service reads eventually consistent. Each service is the authoritative source for its domain data. Other services hold eventually consistent copies updated via events.

**High-scale AP systems:** Choose Cassandra or DynamoDB for data that needs high write throughput and is acceptable to be eventually consistent (user activity events, product view counts, ad impressions). Keep strongly consistent systems for financial records and inventory locks.

**Advanced:** Use CRDTs (Conflict-free Replicated Data Types) for data types that always converge correctly regardless of operation order (counters, sets) — used by systems like Riak and some DynamoDB features.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction ledger: must be strongly consistent. Dashboard analytics: can be eventually consistent. Knowing which is which — and implementing accordingly — is core to payment systems design. | "How do you ensure a user's balance is accurate during high traffic?" |
| Swiggy / Meesho | Restaurant availability: eventually consistent (slightly stale is fine). Order status for a specific order: read-your-own-writes required. Inventory for last item: strongly consistent at purchase. Three different models in one user flow. | "Design the stock availability system for a flash sale." |
| Amazon / Flipkart | Amazon's shopping cart is deliberately eventually consistent — items you add might not appear immediately on another device. Eventually consistent data is pervasive and designed explicitly, not accidental. | "How does Amazon handle the case where a product shows available but sells out between add-to-cart and checkout?" |
| SAP Labs | SAP HANA supports both ACID transactions and column-store OLAP queries. Understanding eventual consistency explains why reporting against operational data requires materialised views or separate OLAP systems — the "refresh lag" IS the inconsistency window. | "Why do SAP finance reports sometimes not match operational transaction data in real-time?" |

---

## 10. Related Topics — What to Study Next

- **Topic 77 — Two-Phase Commit (2PC)** — the strongly consistent alternative that eventual consistency is designed to replace; understanding 2PC's failure modes motivates acceptance of eventual consistency
- **Topic 76 — Saga Pattern** — the application-level pattern that achieves safe, useful work within an eventually consistent distributed system; Saga is the "how to live with eventual consistency safely"
- **Topic 79 — Outbox Pattern** — ensures that events driving eventual consistency are published reliably (at least once) alongside the database write; the mechanism that makes eventual consistency trustworthy
- **Topic 64 — Database per Service Pattern** — the design decision that creates the eventually consistent boundaries between services; understanding the cause of eventual consistency in your architecture

---

*Part 4 · Eventual Consistency — CAP Theorem, BASE vs ACID · Full Stack Interview Guide · Hruday D · 2026*
