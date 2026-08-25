# Strong vs Eventual Consistency
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Strong consistency** means: after a write completes, every subsequent read from any node returns that exact value. No exceptions, no stale data, no "it depends on which node you hit." The write is not considered done until all nodes agree. This matches how a single-server database behaves.
- **Eventual consistency** means: after a write, all nodes will eventually converge to the same value — but reads during the convergence window may return older data. "Eventually" is usually milliseconds to seconds, not hours. The system will get consistent — just not instantly.
- **The concrete difference**: with strong consistency, write X=5, then immediately read X from any node → you get 5. With eventual consistency, write X=5 to node A, immediately read X from node B → you may get 4 (the old value). 100ms later, read again → now you get 5.
- **When each is right**: strong consistency for anything where a stale read causes a real problem — account balances, inventory deduction, distributed locks, leader election. Eventual consistency for anything where a briefly stale read is tolerable — user profiles, product listings, social media posts, analytics counters.
- **The "read your writes" consistency**: a middle ground. After you write, you always see your own latest write (routed to same node), but other users may still see the old value on different nodes. Used by most social apps — you see your own post immediately, others see it a few seconds later.
- **Tunable consistency** (DynamoDB, Cassandra): you set the consistency level per operation. `ConsistencyLevel.ONE` = fast, eventual. `ConsistencyLevel.QUORUM` = slightly slower, mostly consistent. `ConsistencyLevel.ALL` = slowest, strongly consistent.

---

## 1. One-Line Definition
Strong consistency guarantees that every read sees the most recent write on all nodes immediately; eventual consistency guarantees that all nodes will converge to the same value given enough time, but reads during the convergence window may return stale data.

---

## 2. The Problem It Solves

### The Bank Transfer Problem — Where Consistency Level Determines Outcome

```
SCENARIO: User has ₹10,000. Transfers ₹8,000 to a friend.
           Database has 3 replicas: Primary (Mumbai), Replica-1 (Pune), Replica-2 (Hyderabad)

WRITE HAPPENS:
  User submits transfer
  Write goes to Primary: balance = ₹2,000
  Primary → Replica-1: async replication (takes 40ms)
  Primary → Replica-2: async replication (takes 80ms)

IMMEDIATELY AFTER WRITE (within 80ms):
  Primary:    ₹2,000 (latest)
  Replica-1:  ₹10,000 → (update in transit)
  Replica-2:  ₹10,000 → (update in transit)

Now the user tries to make ANOTHER transfer of ₹5,000:

SCENARIO A: Read hits Replica-2 (still shows ₹10,000 — stale)
  System sees ₹10,000 balance
  ₹5,000 < ₹10,000 → APPROVED ← WRONG (actual balance is ₹2,000)
  User overdraws account
  ❌ Financial fraud enabled by eventual consistency

SCENARIO B: Read hits Primary (shows ₹2,000 — fresh)
  System sees ₹2,000 balance
  ₹5,000 > ₹2,000 → REJECTED ← CORRECT
  ✅ Strong consistency protects the user

LESSON:
  For balance reads: STRONG CONSISTENCY is required
  The cost: every read must hit Primary (or wait for quorum) — higher latency
  The benefit: correctness guaranteed — never approve an overdraft
  
CONTRAST WITH A SAFE USE CASE:
  User updates their profile bio — writes new bio to Primary
  For 80ms, Replica reads return the old bio
  After 80ms: all replicas show new bio
  
  ✅ Eventual consistency is perfect here:
    User doesn't lose money
    Other users seeing old bio for 80ms is invisible to them
    The user themselves would hit their own node (read-your-writes routing)
    Cost saved: no synchronous cross-node coordination for every profile update
```

---

## 3. How It Works Internally

### Strong Consistency — How It's Achieved

```
STRONG CONSISTENCY MECHANISMS:

1. SYNCHRONOUS REPLICATION (simplest):
   ┌──────────┐        ┌──────────┐        ┌──────────┐
   │ Primary  │──────▶ │Replica-1 │        │Replica-2 │
   │  Write   │◀────── │   ACK    │        │          │
   │          │──────────────────────────▶ │          │
   │          │◀────────────────────────── │   ACK    │
   │  SUCCESS │                            │          │
   └──────────┘                            └──────────┘
   Write does not return until ALL replicas ACK
   Latency = time to furthest replica
   
   Used by: PostgreSQL synchronous_standby_names, MySQL sync_master

2. QUORUM READS + WRITES (majority must agree):
   N = total replicas (e.g., 3)
   W = replicas that must ACK a write (e.g., 2)
   R = replicas that must agree on a read (e.g., 2)
   
   Rule: R + W > N → "Read your writes" guaranteed
   With N=3, W=2, R=2: R+W=4 > 3 ✅
   Why: write touches 2 nodes, read touches 2 nodes, at least 1 overlap
        That overlap node has the latest value
   
   ┌─────────────────────────────────────────────────────┐
   │ Write X=5: must ACK from 2 of 3 nodes               │
   │ Node A: X=5  ✅ ACK                                  │
   │ Node B: X=5  ✅ ACK → Write success returned        │
   │ Node C: X=4  (replication in-flight)                │
   │                                                     │
   │ Read X: query 2 of 3 nodes                          │
   │ Node A: X=5  ← this node was part of write quorum  │
   │ Node C: X=4  ← stale                               │
   │ Return: X=5  (latest wins via timestamp comparison) │
   └─────────────────────────────────────────────────────┘
   
   Used by: Cassandra QUORUM, DynamoDB strongly consistent reads,
            Riak (configurable)

3. SINGLE LEADER (writes only to primary, reads from primary):
   Simplest strong consistency: writes AND reads go to same node
   No staleness possible: reads always see latest write
   Cost: hot spot on primary, no read scale-out
   Used by: Redis (default), most SQL primaries
```

### Eventual Consistency — Convergence Mechanisms

```
HOW NODES RECONCILE DIVERGED STATE:

1. LAST WRITE WINS (LWW):
   Each write carries a timestamp
   When replicas share state: higher timestamp wins
   
   ⚠️ Risk: clock skew between nodes
   Node A clock: 12:00:00.100 → writes X=5
   Node B clock: 12:00:00.050 (50ms behind) → writes X=7 at "same time"
   LWW: 12:00:00.100 > 12:00:00.050 → X=5 wins
   X=7 is SILENTLY LOST — the user who set X=7 doesn't know
   Used by: Cassandra (default), DynamoDB (default)
   
2. VECTOR CLOCKS:
   Each write carries a version vector [nodeA:3, nodeB:2]
   On conflict: return BOTH values to application (conflict visible)
   Application/user resolves: "which version do you want to keep?"
   Used by: Riak, Amazon Dynamo original paper
   
3. CRDT (Conflict-free Replicated Data Types):
   Data structures designed so any two versions can always be merged
   without conflicts — the merge is mathematically defined
   
   Counter CRDT: only allows increment, never decrement → merge = max of each node's count
   Set CRDT: only allows add, never remove → merge = union of both sets
   OR-Set (Observed-Remove Set): removes tracked with vector clock → correct merge
   
   Used by: Redis (RDT extension), Riak (native CRDTs), collaborative editing (Figma, Google Docs)
   Hruday's example: Google Docs concurrent editing uses CRDT-like OT (operational transforms)
```

---

## 4. The Code

### ❌ Wrong Way — Treating Cassandra Like a Strongly Consistent Store

```java
// ❌ WRONG: Using Cassandra at default consistency (ONE = eventual)
// for data that requires strong consistency
@Service
public class WalletService {

    @Autowired
    private WalletRepository cassandraWalletRepo;  // Uses ConsistencyLevel.ONE (default)

    public void deductBalance(String userId, BigDecimal amount) {
        // ❌ Read may return stale balance (from a replica that hasn't seen latest write)
        Wallet wallet = cassandraWalletRepo.findByUserId(userId);

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException();
        }

        // ❌ Between this read and this write, another node may have written
        // a lower balance — race condition enables overdraft
        wallet.setBalance(wallet.getBalance().subtract(amount));
        cassandraWalletRepo.save(wallet);  // ConsistencyLevel.ONE — only one replica ACKs
    }
}
```

---

### ✅ Right Way — Match Consistency Level to Data Sensitivity

```java
// ✅ RIGHT: Explicit consistency level choice per operation + LWT for atomic update
@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final CqlSession cqlSession;
    private final ObjectMapper mapper;

    // ✅ STRONG CONSISTENCY: deducting balance — cannot afford stale read
    // Uses Cassandra Lightweight Transaction (LWT) = compare-and-set
    // LWT uses Paxos = PC/EC behaviour within Cassandra's PA/EL design
    public WalletTransactionResult deductBalance(String userId, BigDecimal amount, String txnId) {
        // READ at QUORUM — see the most recent write (R + W > N with W=QUORUM)
        ResultSet readResult = cqlSession.execute(
            SimpleStatement.builder(
                "SELECT balance, version FROM wallets WHERE user_id = ? USING TIMESTAMP ?")
                .addPositionalValues(userId, System.currentTimeMillis())
                .setConsistencyLevel(DefaultConsistencyLevel.QUORUM)
                .build()
        );

        Row walletRow = readResult.one();
        if (walletRow == null) throw new WalletNotFoundException(userId);

        BigDecimal currentBalance = walletRow.getBigDecimal("balance");
        long currentVersion = walletRow.getLong("version");

        if (currentBalance.compareTo(amount) < 0) {
            log.info("Insufficient funds. userId={} balance={} requested={}",
                userId, currentBalance, amount);
            return WalletTransactionResult.failed("INSUFFICIENT_FUNDS");
        }

        BigDecimal newBalance = currentBalance.subtract(amount);

        // ✅ LWT (Lightweight Transaction) — conditional write
        // "UPDATE wallets SET balance = X, version = Y WHERE user_id = Z IF version = W"
        // This is atomic: only succeeds if version hasn't changed since we read it
        // If another concurrent write changed the balance: LWT returns [applied]=false → retry
        ResultSet updateResult = cqlSession.execute(
            SimpleStatement.builder(
                "UPDATE wallets SET balance = ?, version = ? " +
                "WHERE user_id = ? IF version = ?")
                .addPositionalValues(newBalance, currentVersion + 1,
                                     userId, currentVersion)
                .setConsistencyLevel(DefaultConsistencyLevel.QUORUM)
                .setSerialConsistencyLevel(DefaultConsistencyLevel.SERIAL) // LWT uses Paxos
                .build()
        );

        boolean applied = updateResult.wasApplied();
        if (!applied) {
            log.warn("LWT conflict — concurrent update detected. userId={} Retry.", userId);
            return WalletTransactionResult.retry("Concurrent update. Please retry.");
        }

        log.info("Balance deducted. userId={} amount={} newBalance={}", userId, amount, newBalance);
        return WalletTransactionResult.success(txnId, newBalance);
    }

    // ✅ EVENTUAL CONSISTENCY: reading transaction history — stale reads fine
    // User refreshing their transaction list will eventually see the latest entry
    public List<WalletTransaction> getTransactionHistory(String userId, int limit) {
        // ConsistencyLevel.ONE: fastest read, may be up to a few hundred ms stale
        // Acceptable: transaction history is informational, not used for decisions
        return cqlSession.execute(
            SimpleStatement.builder(
                "SELECT * FROM wallet_transactions WHERE user_id = ? LIMIT ?")
                .addPositionalValues(userId, limit)
                .setConsistencyLevel(DefaultConsistencyLevel.LOCAL_ONE)  // ← eventual
                .build()
        ).map(row -> WalletTransaction.builder()
            .txnId(row.getString("txn_id"))
            .amount(row.getBigDecimal("amount"))
            .timestamp(row.getInstant("created_at"))
            .build()
        ).all();
    }
}
```

```typescript
// TypeScript React: handle eventual consistency gracefully in UI
// After a write, show optimistic update rather than waiting for AP replica

function WalletTransferForm() {
  const queryClient = useQueryClient();

  const transferMutation = useMutation({
    mutationFn: (request: TransferRequest) =>
      api.post('/api/wallet/transfer', request),

    // ✅ Optimistic update: immediately show new balance before server confirms
    // This handles the eventual consistency lag invisibly to the user
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: ['wallet', 'balance'] });
      const previousBalance = queryClient.getQueryData(['wallet', 'balance']);

      // Optimistically set the balance UPfront
      queryClient.setQueryData(['wallet', 'balance'], (old: WalletData) => ({
        ...old,
        balance: old.balance - request.amount,
        pendingTransfer: true  // ← show "processing" indicator
      }));

      return { previousBalance };
    },

    onSuccess: () => {
      // ✅ After success: refetch from primary (strong consistency) to get authoritative balance
      // Small delay to allow sync replication to complete before refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      }, 500);
    },

    onError: (error, request, context) => {
      // ✅ Rollback optimistic update on error
      queryClient.setQueryData(['wallet', 'balance'], context?.previousBalance);
    }
  });

  return (/* transfer form JSX */);
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Definitions
**Interviewer asks:** "What is the difference between strong consistency and eventual consistency? Give me a concrete example of each."

**Hruday's answer:**
> Strong consistency means: after a write completes successfully, any subsequent read from any node in the cluster will return that written value. There's no window where you can see stale data. SQL databases with synchronous replication are strongly consistent — once the primary commits and the standby acknowledges, both return the same value.
>
> Eventual consistency means: after a write, the data propagates to other nodes asynchronously. During propagation, different nodes may return different values for the same key. Eventually — typically milliseconds to seconds — all nodes converge to the same value.
>
> Concrete examples: bank account balance with strong consistency — after I transfer ₹5,000, any read from any node shows my new balance immediately. This is critical because otherwise a second transfer could read the old higher balance and approve an overdraft.
>
> User profile photo with eventual consistency — I update my profile picture in a social app. The write goes to the primary. For the next 200ms, users on other servers might still see my old photo. After propagation: everyone sees the new photo. Nobody loses money. The 200ms inconsistency is completely invisible in practice because it's shorter than human perception delay for this feature.
>
> The engineering decision: what is the real cost if a user reads stale data? For balances: catastrophic. For profile photos: nil. Let that cost guide the consistency choice.

---

### Q2 — Implementation
**Interviewer asks:** "How does 'read your writes' consistency work and how do you implement it?"

**Hruday's answer:**
> Read-your-writes consistency is a middle ground: after you write, you are guaranteed to see your own write immediately. But other users might not see it yet — the data is still propagating to other nodes.
>
> The classic implementation: sticky session routing. When user X writes to node A, all subsequent reads for user X are routed to node A for the next N seconds (typically 1-5 seconds, longer than the expected replication lag). After the replication window, reads can return to load-balanced nodes since all replicas have caught up.
>
> In Redis: after writing, store a token `{userId}:last_write_node = nodeA` with a TTL of 5 seconds. Each read request checks this token — if it exists, route to that node. If expired: route freely.
>
> In DynamoDB and Cassandra: pass the write timestamp as a parameter to subsequent reads. The SDK ensures the read is served by a node with at least that version. This is the "monotonic reads" consistency guarantee.
>
> A simpler approach that I've used at SAP Labs: for the response to the write operation itself, always read-back from the primary (the node that just accepted the write) to return the confirmed new state. This is "read-after-write" for the immediate confirmation. Subsequent reads can be AP — users have already seen their latest data in the write response, and eventual propagation handles the rest.

---

### Q3 — System Design
**Interviewer asks:** "Design the consistency model for Swiggy's order system — which parts need strong consistency, which can be eventual?"

**Hruday's answer:**
> I'd split it into three tiers based on the cost of a stale read.
>
> Strong consistency (PC/EC) required: order creation, payment deduction, inventory reservation at checkout. If a customer places an order and reads back "no recent orders" due to replica lag, they'll re-submit — double order. Payment deduction must be atomic and consistent — cannot double-charge. For these: PostgreSQL with synchronous standby, or write + immediate read from primary, never read replica for user-visible result of a write.
>
> Read-your-writes: order status tracking. After the order is placed, the customer's own tracking screen always shows their latest order status (routed to same primary that accepted the write). Other users (like internal dashboards showing active orders) can tolerate 2-3 second lag — AP is fine for those.
>
> Eventual consistency (PA/EL): restaurant catalog, menu items, reviews, recommendations. All of these are read-heavy and writes are infrequent. A menu item change being visible 500ms later on other replicas is invisible to users. Cassandra or DynamoDB at LOCAL_QUORUM handles millions of catalog reads with much lower cost than strongly consistent SQL.
>
> Analytics/metrics: pure eventual. Kafka stream into Cassandra. A counter showing "45 orders last hour" being off by 2 for a few seconds is inconsequential.
>
> The pattern: data that affects money or user-visible action outcomes → strong consistency. Data that informs but does not trigger irreversible actions → eventual consistency.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Eventual consistency means the data is eventually correct" | "Eventual consistency means the data is eventually right but may be wrong now" | "Eventual consistency guarantees convergence, not correctness. The problem is how nodes resolve conflicts when they receive diverging writes. Last-write-wins (LWW) discards one of the conflicting writes silently — the 'losing' write is gone forever. The user who wrote it gets no error. LWW is only safe when writes are truly independent (different keys) or timing conflicts are rare and non-critical. For financial data, concurrent conflicting writes with LWW = silent money loss. The correct pattern for conflicting writes on important data: use vector clocks or CRDTs which expose conflicts to the application for explicit resolution, rather than silently dropping one value." |
| "Use strong consistency everywhere to be safe" | "If in doubt, use strong consistency — it's always safer" | "Strong consistency everywhere is not 'safe' — it's a different risk profile. A strongly consistent system that can't handle a node failure returns errors to ALL users during that failure. An eventually consistent system returns possibly stale data to some users during failure. For high-traffic systems at Swiggy scale: insisting on strong consistency for the product catalog means every catalog read waits for a quorum — at 1M reads/minute, the latency cost and throughput ceiling are severe. The right answer is intentional: strong consistency where stale data causes real harm (money, security), eventual consistency where it only causes minor UX issues (stale listings, old photos). Blanket strong consistency is technically expensive and architecturally lazy." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, we built an Angular dashboard that displayed real-time ERP document statuses. The backend used a PostgreSQL primary with an async read replica. During peak batch hours, the replica sometimes lagged 2-3 seconds. Users would post a document entry and then immediately see the dashboard refresh with the old state — their change missing — and panic that it hadn't saved. The fix: after a POST to create/update a record, we rerouted the immediate page refresh query to the primary (strong read-after-write), then used the replica for ongoing polling. This is exactly the read-your-writes pattern. Understanding it as a consistency model choice rather than a 'bug to fix' would have led to a cleaner solution immediately."

---

## 8. Scale Evolution

**1,000 users →** Single database. Strong consistency everywhere by default (single node = no replication inconsistency). No trade-off needed.

**100,000 users →** Add async read replica. Critical paths (writes + important reads) → primary. Read-heavy listing pages → replica. Monitor replication lag. First intentional eventual consistency decision made. Alert at lag > 1 second.

**10 million users →** Data split by consistency requirement: PostgreSQL (strong) for financial/order state, Cassandra (tunable) for catalog/session. Application routing layer directs requests to appropriate store. Eventual consistency domains explicitly documented. SLAs defined per data type: "balance reads: < 100ms from primary, strongly consistent; product listing reads: < 50ms from replica, last 500ms acceptable."

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Every rupee transaction needs strong consistency. User wallets, beneficiary bank accounts, reconciliation — all PC/EC. Session caching and notification delivery — PA/EL. | "Design the data store strategy for PhonePe's UPI payment flow — identify which operations need strong vs eventual consistency." |
| Swiggy / Meesho | Order state machine (placed → confirmed → prepared → delivered): strong consistency. Flash sale inventory counter: strong consistency. Product catalog, reviews, recommendations: eventual. | "A Meesho flash sale has 50K concurrent users hitting inventory. How does consistency model choice affect oversell probability?" |
| Adobe / Microsoft | Collaborative document editing (Figma, Google Docs): eventual consistency via CRDTs (Operational Transforms). File system metadata: strong consistency (two writes to same file = explicit conflict). Feature flags: eventual (slight delay is fine). | "How does Adobe Firefly's collaborative design editing handle two users editing the same object simultaneously — what consistency model applies?" |
| SAP Labs (current) | Financial document posting: strong consistency (audit requirements). Period-close status flags: strong consistency. Report data: eventual. Config: strong (all instances must see same config version). | "An SAP financial posting must appear in the CFO's dashboard immediately after confirmation. What consistency guarantee is required and how do you implement it?" |

---

## 10. Related Topics — What to Study Next

- **Topic 140 — CAP Theorem** — the theoretical foundation; strong consistency maps to CP (consistent under partition); eventual consistency maps to AP (available under partition); understanding CAP provides the vocabulary for why strong consistency costs availability
- **Topic 143 — Quorum-Based Systems** — the concrete implementation mechanism for "tunable" consistency; quorum reads and quorum writes are how Cassandra and Riak slide between eventual and strong consistency; the R+W>N formula is the key to understanding when "mostly consistent" becomes strongly consistent
- **Topic 76 — Saga Pattern** — distributed transactions across microservices that give up ACID strong consistency in favour of eventual consistency through compensation; sagas are the practical answer to "how do you coordinate writes across services without a strongly consistent distributed transaction"
- **Topic 121 — Idempotency — Designing Idempotent Consumers** — idempotency is the practical counterpart to eventual consistency; when a message may be delivered more than once (at-least-once delivery in an eventually consistent messaging system), the consumer must be idempotent to ensure exactly-once business effect

---

*Part 8 · Strong vs Eventual Consistency · Full Stack Interview Guide · Hruday D · 2026*
