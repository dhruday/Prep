# Quorum-Based Systems
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Quorum** means "majority agreement." In a distributed system with N nodes, a quorum is any group of nodes that forms a majority — typically ⌊N/2⌋ + 1 nodes. Before a write is acknowledged (or a read is returned), a quorum of nodes must agree. If you can't reach a quorum, you refuse rather than risk inconsistency.
- **The key formula**: `R + W > N` gives "read your writes" consistency. R = nodes that must agree on a read. W = nodes that must ACK a write. N = total nodes. If R + W > N, any quorum read will overlap with the last quorum write by at least one node — guaranteeing the reader sees the latest write.
- **Common configuration with N=3**: W=2, R=2. Any write needs 2 of 3 ACKs. Any read needs 2 of 3 to respond. R+W=4 > 3. Works correctly even if 1 node is down. Can tolerate 1 failure.
- **Trade-off**: quorum gives strong-ish consistency at a latency cost. W=1 (just write to one node) = fastest write, eventual consistency. W=3 (write to all nodes) = slowest, most consistent. W=2 (quorum) = the sweet spot for most production systems.
- **Where you see quorum**: Cassandra `ConsistencyLevel.QUORUM`, Zookeeper (leader election needs quorum to write), etcd/Raft (log entry committed when majority ACKs), DynamoDB strongly consistent reads (implicit quorum).
- **Sloppy quorum** (used by Cassandra, DynamoDB by default): if target nodes are down, writes go to "hint" nodes — available nodes not normally responsible for the data. When the target recovers, hints are replayed. This improves availability but weakens the R+W>N guarantee temporarily.

---

## 1. One-Line Definition
Quorum-based systems require a majority of nodes to agree before acknowledging a read or write, ensuring that any read quorum overlaps with the most recent write quorum by at least one node — giving consistency guarantees even when some nodes are down.

---

## 2. The Problem It Solves

### Why Pure Majority Vote Avoids Both Extremes

```
PROBLEM 1: Write to one node only (W=1) — too weak
  N=3 nodes: A, B, C
  Write X=5 to node A only (W=1 — fastest)
  
  Node A: X=5
  Node B: X=3 (old value)
  Node C: X=3 (old value)
  
  Client reads from any node:
    Hits A: X=5 ✅ (correct)
    Hits B: X=3 ❌ (stale)
    Hits C: X=3 ❌ (stale)
    
  2/3 reads return wrong answer — eventual consistency only
  If node A goes down: the write is lost entirely (no replicas know)
  ❌ Not safe for important data

PROBLEM 2: Write to ALL nodes (W=N=3) — too slow / brittle
  Write X=5 to nodes A, B, C (W=3 — requires all)
  
  If node C is slow: write waits for C
  If node C is down: write FAILS (can't reach all 3)
  
  ❌ One failure → system refuses all writes
  ❌ Availability = availability of your weakest node
  ❌ Cannot tolerate even one node failure

SOLUTION: Quorum (W=2 for N=3)
  Write X=5, any 2 of 3 must ACK:
  Node A: X=5 ✅ ACK
  Node B: X=5 ✅ ACK → WRITE SUCCESS (reached quorum)
  Node C: X=3 (update in-flight or C is offline)
  
  At max 1 node can be down and writes still work: ✅
  
  Now read (R=2 — any 2 nodes must respond):
  Read hits nodes A + C:
    A: X=5 (latest), C: X=3 (stale)
    Return: X=5 (latest timestamp wins)
    
  Why does this work?
    Write reached {A, B}
    Read queries {A, C}
    Overlap = {A} → node A has the latest value ✅
    
  R + W = 2 + 2 = 4 > N = 3
  Any write set and any read set MUST share at least one node
  That shared node has the latest value
  GUARANTEED: every read sees the latest write
```

---

## 3. How It Works Internally

### The Quorum Mathematics

```
QUORUM FORMULA: R + W > N

N = 3 replicas
        Write Quorum (W)
         1       2       3
    ┌─────────────────────────┐
  1 │ EV │  EV │  SC │
R 2 │ EV │  SC │  SC │
  3 │ SC  │  SC │  SC │
    └─────────────────────────┘
  
  EV = Eventual (R + W ≤ N — no guaranteed overlap)
  SC = Strong (R + W > N — guaranteed overlap by pigeonhole principle)

N = 5 replicas (common in high-availability setups)
  Quorum = 3 (majority)
  W = 3, R = 3: R + W = 6 > 5 ✅ Strong consistency
  Can tolerate 2 node failures (5-2=3, still meets quorum)

FAILURE TOLERANCE:
  A quorum of size W can tolerate (N-W) simultaneous failures
  W = ⌊N/2⌋ + 1 = simple majority
  
  N=3: majority W = 2, tolerates 1 failure
  N=5: majority W = 3, tolerates 2 failures
  N=7: majority W = 4, tolerates 3 failures
  
  Why odd number of nodes?
    N=4: majority = 3, tolerates 1 failure (only 25% failure tolerance)
    N=5: majority = 3, tolerates 2 failures (40% failure tolerance)
    Even N wastes a node — N=4 adds one node but still only tolerates 1 failure
    Odd N is more efficient per failure tolerance ratio
```

### Quorum in Practice — Cassandra Example

```
CLUSTER: N=3 replicas (replication_factor=3)
Data: row with partition key "user:u-123"
      Stored on: Node A (Mumbai), Node B (Pune), Node C (Hyderabad)

WRITE with ConsistencyLevel.QUORUM (W=2):
  ┌──────────────────────────────────────────────────────────────┐
  │  Client → Coordinator (any node)                             │
  │  Coordinator → Node A: write { balance: 5000 }  → ACK       │
  │  Coordinator → Node B: write { balance: 5000 }  → ACK       │
  │  Coordinator → Node C: write { balance: 5000 }  (async, no wait)│
  │  Coordinator → Client: SUCCESS (2 ACKs received = quorum)   │
  └──────────────────────────────────────────────────────────────┘
  Time: ~50ms (wait for 2nd fastest node, not 3rd)
  Node C: may not have the write yet for 50-100ms
  
READ with ConsistencyLevel.QUORUM (R=2):
  ┌──────────────────────────────────────────────────────────────┐
  │  Client → Coordinator                                        │
  │  Coordinator → Node A: read user:u-123 → { balance: 5000, ts: 100 }│
  │  Coordinator → Node C: read user:u-123 → { balance: 4500, ts: 90 }│
  │  (Node B: not queried — reached R=2 already)                 │
  │                                                              │
  │  Coordinator compares: ts:100 > ts:90 → return balance:5000 │
  │  OPTIONAL: Read Repair — Coordinator sends 5000 to Node C   │
  │  Client: { balance: 5000 } ✅ CORRECT (latest value)        │
  └──────────────────────────────────────────────────────────────┘
  
READ REPAIR (background healing):
  Coordinator notices Node C returned stale value
  Sends the latest value to Node C asynchronously (read repair)
  Node C: updated to { balance: 5000 }
  System self-heals without operator intervention
```

---

## 4. The Code

### ❌ Wrong Way — Default ConsistencyLevel Without Understanding Trade-Off

```java
// ❌ WRONG: Using Cassandra defaults (ConsistencyLevel.LOCAL_ONE) for financial data
@Repository
public class AccountRepository {

    @Autowired
    private CassandraTemplate cassandraTemplate;  // Uses LOCAL_ONE by default

    public Account findAccount(String accountId) {
        // ❌ LOCAL_ONE: reads from closest single replica
        // If that replica is lagging: returns stale balance
        // For a ₹10,000 balance that was just deducted to ₹2,000:
        // This read may return ₹10,000 (stale) → approves an overdraft
        return cassandraTemplate.selectOne(
            Query.query(Criteria.where("account_id").is(accountId)),
            Account.class
        );
    }

    public void updateBalance(String accountId, BigDecimal newBalance) {
        // ❌ LOCAL_ONE write: only one node ACKs
        // If that node fails before replication: write is lost
        cassandraTemplate.update(Account.class)
            .matching(Query.query(Criteria.where("account_id").is(accountId)))
            .apply(Update.update("balance", newBalance))
            .first();
    }
}
```

---

### ✅ Right Way — Explicit Quorum with Tuning per Operation

```java
// ✅ RIGHT: Explicit consistency level per operation based on data sensitivity
@Repository
@RequiredArgsConstructor
@Slf4j
public class AccountRepository {

    private final CqlSession cqlSession;

    // Prepared statements — more efficient than building statement each time
    private PreparedStatement findAccountStmt;
    private PreparedStatement updateBalanceStmt;
    private PreparedStatement findHistoryStmt;

    @PostConstruct
    public void prepareStatements() {
        // ✅ Prepare once, reuse on each call (avoids parsing overhead)
        findAccountStmt = cqlSession.prepare(
            "SELECT account_id, balance, version FROM accounts WHERE account_id = ?"
        );
        updateBalanceStmt = cqlSession.prepare(
            "UPDATE accounts SET balance = ?, version = ? WHERE account_id = ? IF version = ?"
        );
        findHistoryStmt = cqlSession.prepare(
            "SELECT * FROM account_transactions WHERE account_id = ? LIMIT ? ALLOW FILTERING"
        );
    }

    // ✅ CRITICAL DATA: balance read — must be strongly consistent
    // Uses QUORUM: R=2 out of N=3 must agree
    // R + W = 2 + 2 = 4 > 3 → guaranteed to overlap with latest quorum write
    public Optional<AccountRecord> findAccountBalance(String accountId) {
        BoundStatement bound = findAccountStmt.bind(accountId)
            .setConsistencyLevel(DefaultConsistencyLevel.QUORUM);  // ← QUORUM, not ONE

        Row row = cqlSession.execute(bound).one();
        if (row == null) return Optional.empty();

        return Optional.of(AccountRecord.builder()
            .accountId(row.getString("account_id"))
            .balance(row.getBigDecimal("balance"))
            .version(row.getLong("version"))
            .build());
    }

    // ✅ CRITICAL WRITE: balance update with Lightweight Transaction (LWT)
    // LWT = Cassandra's Paxos-based Compare-and-Set → strongest consistency in Cassandra
    // SERIAL consistency level activates Paxos protocol for this write only
    public boolean updateBalanceCAS(String accountId, BigDecimal newBalance,
                                    long expectedVersion) {
        BoundStatement bound = updateBalanceStmt.bind(
            newBalance,
            expectedVersion + 1,
            accountId,
            expectedVersion
        )
        .setConsistencyLevel(DefaultConsistencyLevel.QUORUM)
        .setSerialConsistencyLevel(DefaultConsistencyLevel.SERIAL);  // LWT uses Paxos

        boolean applied = cqlSession.execute(bound).wasApplied();
        log.debug("Balance CAS for accountId={}: applied={}", accountId, applied);
        return applied;  // false = concurrent modification — caller should retry
    }

    // ✅ NON-CRITICAL READ: transaction history — eventual consistency fine
    // Uses LOCAL_ONE: fastest, reads from nearest single replica
    // Acceptable: transaction history is informational, 200ms stale is invisible
    public List<TransactionRecord> getTransactionHistory(String accountId, int limit) {
        BoundStatement bound = findHistoryStmt.bind(accountId, limit)
            .setConsistencyLevel(DefaultConsistencyLevel.LOCAL_ONE);  // ← eventual, fast

        return StreamSupport.stream(
            cqlSession.execute(bound).spliterator(), false)
            .map(row -> TransactionRecord.builder()
                .txnId(row.getString("txn_id"))
                .amount(row.getBigDecimal("amount"))
                .timestamp(row.getInstant("occurred_at"))
                .build())
            .collect(Collectors.toList());
    }
}
```

```yaml
# Cassandra consistency level guide (as comments in config)
# cassandra:
#   consistency-levels:
#     financial-reads: QUORUM     # R + W > N, overlap guaranteed
#     financial-writes: QUORUM    # Wait for majority ACK
#     catalog-reads: LOCAL_ONE    # Fastest, eventual, one datacenter
#     catalog-writes: LOCAL_QUORUM # Majority within datacenter, no cross-DC wait
#     analytics-reads: ONE        # Fastest possible, stale acceptable
#     distributed-locks: SERIAL  # Paxos - strongest, for LWT only

# ZooKeeper/etcd quorum:
# zookeeper.connect=zk1:2181,zk2:2181,zk3:2181
# quorum.size: 2  # of 3 nodes — leader election needs majority before accepting writes
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Explanation
**Interviewer asks:** "Explain quorum-based systems. Why does R + W > N guarantee read-your-writes consistency?"

**Hruday's answer:**
> A quorum is a majority. In a cluster of N replicas, a quorum is any group large enough that any two quorums must share at least one member. The formula is: if you require R replicas to agree on a read and W replicas to ACK a write, and R + W > N, then it's mathematically impossible for a write quorum and a read quorum to not overlap. By the pigeonhole principle — you're picking two groups that together have more than N members from an N-member pool — they must share at least one.
>
> That shared member has seen the most recent write. When the read coordinator receives responses from R nodes and compares timestamps, the node with the latest write is in the response set — it returns the correct value.
>
> Concrete example with N=3: write quorum W=2, read quorum R=2. R+W=4>3. Write goes to nodes {A, B}. Read queries nodes {A, C} or {B, C} or {A, B} — whatever 2 the coordinator picks. Every possible pair overlaps with {A, B} by at least one node (A or B). The coordinator picks the value with the latest timestamp from the response — and the latest write is always represented.
>
> The trade-off: quorum adds latency. Instead of the write returning after the fastest node ACKs (W=1), you wait for the 2nd-fastest (W=2 of 3). For 3 nodes in the same data centre: this might be 5ms vs 1ms — small. For 3 nodes across data centres: 5ms vs 50ms — significant.

---

### Q2 — Failure Tolerance
**Interviewer asks:** "You have a Cassandra cluster with N=5 replicas. How many node failures can it tolerate while maintaining quorum reads and writes?"

**Hruday's answer:**
> With N=5 nodes, a quorum (simple majority) is 3. So W=3 and R=3 for quorum-level consistency.
>
> For the cluster to serve quorum reads and writes, you need at least 3 nodes alive. That means the cluster can tolerate at most N - W = 5 - 3 = 2 simultaneous node failures and still function. If 2 nodes fail, you have 3 remaining — exactly a quorum. Quorum operations succeed. If 3 fail, you have 2 remaining — below quorum — and operations at ConsistencyLevel.QUORUM fail (return error rather than risk incorrect data — this is the CP behaviour within Cassandra's AP design).
>
> The formula: failure tolerance = N - ⌊N/2⌋ - 1 = ⌊(N-1)/2⌋.
> N=3: tolerates 1 failure. N=5: tolerates 2. N=7: tolerates 3.
>
> This is why you see 3-node and 5-node configurations in production. 3 nodes is the minimum for any failure tolerance. 5 nodes is common for services that need to tolerate 2 simultaneous failures (typical for critical services during maintenance — you can have 1 node in rolling restart AND 1 node fail unexpectedly and still serve quorum). I'd choose N=5 with W=3, R=3 for a payment service at PhonePe — that's 2 failures tolerated with strong consistency maintained.

---

### Q3 — System Design
**Interviewer asks:** "What is sloppy quorum in Cassandra and when does it help versus hurt?"

**Hruday's answer:**
> Sloppy quorum is Cassandra's availability-over-consistency optimisation during node failures. In strict quorum: if a required target node is down, the write fails (cannot reach quorum). In sloppy quorum: if a target node is down, the coordinator writes to any available node as a "hinted handoff" — a temporary substitute. The substitute node stores the data plus a hint saying "this data belongs to node X, deliver it when node X comes back." When node X recovers, the hints are replayed.
>
> How it helps: write availability during rolling restarts or short failures. In a N=3 cluster, if one node goes down for maintenance, strict quorum would require 2 of the remaining 3 targets — possible but tight. Sloppy quorum allows any healthy node to take the hint — system stays available even during node replacement.
>
> How it hurts: it breaks the R+W>N guarantee temporarily. During the hint period, the substitute node has data that belongs to downed node X. If a read quorum does NOT query the substitute node (it's not a regular replica for this partition key), the read could miss the latest value. The R+W>N proof assumes reads query the actual replica set — hints may be on non-replica nodes.
>
> Practical impact: for high-write-availability use cases (logging, analytics, user activity tracking), sloppy quorum is fine — eventual consistency during node failure is acceptable. For financial data: I explicitly set `setReadConsistencyLevel(QUORUM)` and `setWriteConsistencyLevel(QUORUM)` without sloppy quorum, accepting that the write fails if we truly can't reach a majority rather than risk a hint-induced inconsistency.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Quorum means most nodes" | "Quorum is when most nodes agree" | "Quorum is a configuration, not just 'most nodes.' The R and W values are tunable. Cassandra ONE, QUORUM, ALL are explicit consistency levels. ONE is not a quorum at all — it's a single node. ALL is a full quorum. QUORUM (the default meaning) is the ⌊N/2⌋ + 1 majority. The key insight is that R and W are independent — you can have W=1 (fast writes, eventual) with R=3 (strong reads, slow). Or W=3 (slow writes, durable) with R=1 (fast reads, may be stale if write quorum didn't include that node). QUORUM on both is the sweet spot for most production cases — strong consistency at reasonable latency." |
| "More replicas always means faster reads" | "Adding replicas speeds up reads because more nodes can serve them" | "More replicas add load distribution for reads, but they also increase the cost of quorum operations. With N=3, QUORUM needs 2 reads. With N=9, QUORUM needs 5 reads — more network calls, more latency, more coordinator work. The read/write throughput benefit from more replicas is real (more nodes can serve EVENTUAL consistency reads), but for QUORUM operations, more replicas can actually slow things down by requiring more acknowledgements. The right replication factor is driven by failure tolerance requirements and geographic placement (3 in 3 data centres is the common SAP/enterprise pattern) — not by read performance." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we evaluated Cassandra for the CFIN document archive — storing millions of historical financial document snapshots. The quorum question came up immediately: our compliance requirements meant a financial document written at 11:59 PM must be readable by the auditor dashboard at midnight — zero tolerance for stale reads in the compliance context. We configured QUORUM reads and writes, with N=3 replicas across two zones. This gave us 1 node failure tolerance with guaranteed read-your-writes consistency. For the non-compliance metrics tables (document processing times, throughput statistics), we used LOCAL_ONE — fastest possible reads for the monitoring dashboard where a 2-second staleness was invisible. Two consistency levels, same cluster, driven by the business requirement for each data type."

---

## 8. Scale Evolution

**1,000 users →** Single node or primary-replica. No quorum relevant. Consistency is trivial — single writer, single reader.

**100,000 users →** 3-node Cassandra or DynamoDB cluster. Quorum (W=2, R=2) for critical data. LOCAL_ONE for read-heavy catalog. Read repair handles divergence. Replication factor: 3. Failure tolerance: 1 node.

**10 million users →** Multi-DC setup. `LOCAL_QUORUM` consistency level: quorum within each data centre, async cross-DC replication. This avoids cross-continent network RTT on every write while maintaining within-DC quorum consistency. N=3 per DC × 3 DCs = 9 replicas total. Cross-DC eventual consistency accepted (data is in both DCs eventually — for disaster recovery). Critical financial writes still use QUORUM across DCs (accepting cross-DC RTT latency for correctness).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction writes at QUORUM for durability. Balance reads at QUORUM for consistency. Multi-DC deployment with LOCAL_QUORUM. ZooKeeper quorum for distributed coordination (payment workflow locks). | "PhonePe processes 1 million UPI transactions per hour across 3 data centres. How do you configure replication and quorum to ensure no money is lost during a data centre failure?" |
| Swiggy / Meesho | Order state transitions use quorum writes (cannot afford to lose an order status change). Product catalog uses eventual (LOCAL_ONE). Distributed rate limiting uses quorum. | "Design Swiggy's order status storage — what quorum configuration ensures a 'DELIVERED' status written during a node failure is not lost?" |
| Adobe / Microsoft | etcd (Kubernetes control plane) uses Raft consensus — quorum of etcd nodes must agree on every config change. Creative asset metadata quorum for durability. | "Adobe runs Kubernetes for their Creative Cloud APIs. The etcd cluster has 5 nodes. How many can fail before the cluster stops accepting config changes?" |
| SAP Labs (current) | Cassandra for document archive uses QUORUM for compliance data. etcd in Kubernetes cluster for config management follows quorum rules. ZooKeeper for distributed job scheduling in batch pipelines. | "SAP's document archive receives 50K inserts per minute. How do you balance write throughput against the consistency requirement for financial compliance data?" |

---

## 10. Related Topics — What to Study Next

- **Topic 140 — CAP Theorem** — quorum is how CP systems stay consistent under partition; a quorum-sized majority is what makes a system refuse to serve rather than diverge; understanding CAP explains why quorum systems go unavailable when they can't reach majority
- **Topic 144 — Leader Election — Raft, ZooKeeper** — Raft and ZooKeeper both use quorum for leader election; a leader can only be elected if a majority of nodes vote for it; understanding quorum is a prerequisite for understanding how these consensus algorithms work
- **Topic 142 — Strong vs Eventual Consistency** — quorum with R+W>N gives strong consistency; quorum with R+W≤N gives eventual; the `QUORUM` vs `ONE` vs `ALL` consistency levels in Cassandra directly map to the strong-vs-eventual spectrum
- **Topic 104 — Redis Distributed Lock (Redlock)** — Redlock requires acquiring locks on a majority (quorum) of Redis nodes; if a lock can't be acquired on 3 of 5 nodes, it fails; this is quorum applied to mutual exclusion — understanding quorum explains why Redlock uses 5-node setup

---

*Part 8 · Quorum-Based Systems · Full Stack Interview Guide · Hruday D · 2026*
