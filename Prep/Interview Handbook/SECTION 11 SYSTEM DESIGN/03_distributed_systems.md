# Foundation 03 — Distributed Systems Concepts

> The theoretical backbone every senior engineer must know cold.

---

## CAP Theorem

**CAP states:** A distributed system can guarantee at most 2 of 3:

```
        Consistency
           /\
          /  \
         /    \
        /  CA  \
       /--------\
      / CP |  AP \
     /_____|_____\
Partition Tolerance  Availability
```

| Guarantee | Meaning |
|-----------|---------|
| **C**onsistency | Every read receives the most recent write (or an error) |
| **A**vailability | Every request gets a response (not guaranteed to be latest) |
| **P**artition Tolerance | System continues operating despite network failures between nodes |

**The hard truth:** Network partitions are inevitable in distributed systems. You MUST choose between C and A when a partition occurs.

### Real-World CAP Choices

| System | Choice | Rationale |
|--------|--------|-----------|
| HBase, Zookeeper | CP | Strong consistency over availability |
| Cassandra, DynamoDB (default) | AP | High availability, eventual consistency |
| PostgreSQL (single node) | CA | No partition tolerance; not truly distributed |
| MongoDB (with replica sets) | CP | Consistency during partition |
| Riak, CouchDB | AP | Prefer availability |

### CAP Interview Answer Template

> "CAP theorem tells us that in a distributed system, we can only guarantee two of three: Consistency, Availability, and Partition Tolerance. Since network partitions are inevitable, we must choose between CP and AP. For a payment system, I'd choose CP — losing a transaction is worse than a brief outage. For a social feed, I'd choose AP — it's better to show slightly stale tweets than to error out."

---

## PACELC Theorem

**CAP's limitation:** It only addresses behavior during partitions. PACELC addresses normal operation too.

```
If [Partition] then [Availability vs Consistency]
Else [Latency vs Consistency]
```

| System | Partition | Else |
|--------|-----------|------|
| DynamoDB | A | L (low latency over consistency) |
| Cassandra | A | L |
| BigTable, HBase | C | C |
| MongoDB | C | C |
| MySQL (sync replication) | C | C |
| MySQL (async replication) | A | L |

> **Why this matters:** Even without partitions, there's a latency-consistency trade-off. Strong consistency requires synchronous replication = higher latency.

---

## Consistency Models (Detailed)

### Linearizability (Strongest)
Operations appear to take effect at a single point in time between start and end.
```
Client A: Write X=1 ----[committed]--->
Client B:               Read X → must return 1
```
- **Used by:** Zookeeper, etcd, Google Spanner
- **Cost:** High latency (synchronous), lower throughput

### Sequential Consistency
All operations appear in some sequential order consistent with each process's local order.
```
Client A: Write X=1 | Write X=2
Client B: Read X → can return 1 or 2, but must be consistent with A's order
```

### Causal Consistency
Causally related operations are seen in order; concurrent ops may differ.
```
Client A: Write post → Write comment on post
Client B: Must see post before comment
Client C: May see comment before post (no causal link to C)
```
- **Used by:** Facebook's TAO, MongoDB sessions

### Eventual Consistency (Weakest)
All replicas converge to the same value given no new updates.
```
Client A: Write X=1 to Replica 1
Client B: Read X from Replica 2 → may return old value
Eventually: Both replicas converge to X=1
```
- **Used by:** DynamoDB, Cassandra, S3, DNS
- **Sufficient for:** Social likes, shopping cart, DNS records

---

## Consensus Algorithms

### Paxos
The foundational consensus algorithm. Complex but correct.

**Three Roles:**
- **Proposer:** Proposes values
- **Acceptor:** Accepts/rejects proposals
- **Learner:** Learns the chosen value

**Two Phases:**
```
Phase 1 (Prepare):
  Proposer → sends Prepare(n) to Acceptors
  Acceptors → if n > any seen, promise to not accept lower & return highest accepted

Phase 2 (Accept):
  Proposer → sends Accept(n, value) to quorum
  Acceptors → accept if no higher prepare seen
  Learner → learns when majority accepts
```
- **Used by:** Google Chubby, original Zookeeper

### Raft (Simpler Paxos Alternative)
Designed for understandability. Same guarantees as Paxos.

**Key Concepts:**
```
Leader Election:
  - Nodes start as Followers
  - If no heartbeat received → become Candidate
  - Candidate requests votes from peers
  - If majority votes received → become Leader
  - Leader sends heartbeats to prevent new elections

Log Replication:
  - All writes go to Leader
  - Leader appends to log, sends to Followers
  - Committed when majority acknowledges
  - Leader sends commit to all Followers
```

**States:**
```
FOLLOWER ──(timeout)──▶ CANDIDATE ──(majority votes)──▶ LEADER
    ▲                        │                               │
    └────────────────────────┘◀──────────────────────────────┘
         (higher term seen)          (higher term seen)
```
- **Used by:** etcd, TiKV, CockroachDB, Consul

### Zab (Zookeeper Atomic Broadcast)
Used by Zookeeper. Similar to Raft with some differences.

---

## Leader Election

### Why Needed
- Distributed systems need a single coordinator for certain operations
- Prevents split-brain (two nodes thinking they're leader)

### Approaches

**1. Bully Algorithm**
```
- Highest-ID node becomes leader
- When leader fails, highest alive node wins "election"
- Problem: O(n²) messages, poor in dynamic membership
```

**2. Raft-based Election**
```
- Randomized election timeouts prevent simultaneous elections
- Candidate needs majority (quorum) of votes
- Leader sends periodic heartbeats to maintain authority
```

**3. External Coordinator (Zookeeper/etcd)**
```
- All nodes try to create ephemeral node /leader
- First to create wins; others watch for deletion
- When leader dies, ephemeral node deleted → new election
```

**4. Distributed Lock Services**
```
- Redis SETNX with TTL
- etcd distributed locks
- Zookeeper ephemeral nodes
```

---

## Quorum

**Definition:** Minimum number of nodes that must agree for an operation to be valid.

```
Quorum = ⌊N/2⌋ + 1  (where N = total nodes)

N=3: Quorum = 2  (can tolerate 1 failure)
N=5: Quorum = 3  (can tolerate 2 failures)
N=7: Quorum = 4  (can tolerate 3 failures)
```

### Read/Write Quorum

```
W + R > N  →  guarantees at least 1 node has latest data

Common configurations for N=3:
  W=3, R=1  → Write-heavy (strong write, fast read)
  W=1, R=3  → Read-heavy (fast write, strong read)
  W=2, R=2  → Balanced (default in Cassandra)
```

**Cassandra Consistency Levels:**
| Level | Meaning |
|-------|---------|
| ONE | 1 replica |
| QUORUM | ⌊N/2⌋ + 1 replicas |
| LOCAL_QUORUM | Quorum within local DC |
| ALL | All replicas (strong) |

---

## Distributed Locks

### Why Needed
- Preventing duplicate processing
- Leader election
- Rate limiting across nodes
- Mutual exclusion for shared resources

### Redis-Based Distributed Lock (Redlock)

```python
# Simple Redis lock (NOT production-safe)
def acquire_lock(client, lock_name, ttl_ms):
    return client.set(lock_name, "1", nx=True, px=ttl_ms)

def release_lock(client, lock_name):
    client.delete(lock_name)

# Redlock Algorithm (across N independent Redis nodes)
def acquire_redlock(nodes, lock_name, ttl_ms):
    start = current_time_ms()
    acquired = 0
    for node in nodes:
        if try_acquire(node, lock_name, ttl_ms):
            acquired += 1
    
    elapsed = current_time_ms() - start
    remaining_ttl = ttl_ms - elapsed
    
    if acquired >= len(nodes)//2 + 1 and remaining_ttl > 0:
        return True  # Lock acquired
    else:
        release_all(nodes, lock_name)  # Release partial
        return False
```

**Problems with distributed locks:**
```
1. Clock skew between nodes
2. Process pause (GC) can cause lock expiry mid-operation
3. Network partition during unlock
```

**Solution:** Use fencing tokens (monotonically increasing number returned with lock, checked by resource server).

### Zookeeper-Based Lock

```
1. Create ephemeral sequential node: /locks/resource-0000000001
2. Get all children, check if yours has lowest sequence number
3. If yes → you have the lock
4. If no → watch the node with next-lower sequence number
5. When watched node deleted → repeat step 2
6. Release: delete your node
```

---

## Idempotency

**Definition:** An operation is idempotent if performing it multiple times has the same effect as performing it once.

### Why Critical
- Network retries are inevitable
- At-least-once delivery is the default in most systems
- Without idempotency: duplicate orders, double charges, duplicate messages

### Implementing Idempotency

**1. Idempotency Keys (HTTP APIs)**
```http
POST /api/payments
Idempotency-Key: client-generated-uuid-abc123
Content-Type: application/json

{"amount": 100, "currency": "USD", "to": "user-456"}
```
Server:
- Hash the key, check DB
- If found: return cached response
- If not: process, store result with key → return result

**2. Natural Idempotency**
```
Idempotent:    PUT /users/123  {"name": "Alice"}  (same result every time)
NOT idempotent: POST /counter/increment             (different result each time)
               POST /payments                       (creates new payment)
```

**3. Conditional Writes**
```sql
-- Only update if version matches (optimistic locking)
UPDATE orders 
SET status = 'completed', version = version + 1
WHERE id = 123 AND version = 5;

-- If 0 rows affected → retry with fresh data
```

**4. Deduplication in Message Processing**
```python
def process_message(msg_id, payload):
    if redis.setnx(f"processed:{msg_id}", "1"):
        redis.expire(f"processed:{msg_id}", 86400)  # 24hr TTL
        # Process the message
        do_processing(payload)
    else:
        # Already processed, skip
        return "duplicate"
```

---

## Exactly-Once Processing

**The Three Delivery Semantics:**

```
At-Most-Once:   Send and forget. May lose messages. (fire-and-forget)
At-Least-Once:  Retry until acknowledged. May duplicate. (default)
Exactly-Once:   Process once and only once. (hardest to achieve)
```

### Achieving Exactly-Once in Kafka

```
# Producer side: Idempotent producer
producer = KafkaProducer(enable_idempotence=True)
# Kafka assigns sequence numbers; broker deduplicates

# Consumer side: Atomic offset commit + DB write in transaction
with db.transaction():
    process(message)
    db.save(result)
    consumer.commit_offset(message.offset)
# If crash before commit: reprocess (but idempotent processing handles it)
```

### Saga Pattern for Distributed Exactly-Once

```
Booking Saga:
Step 1: Reserve hotel      → success or compensate
Step 2: Reserve flight     → success or compensate
Step 3: Charge payment     → success or compensate
Step 4: Send confirmation  → success or compensate

If Step 3 fails:
  Compensate Step 2: Cancel flight reservation
  Compensate Step 1: Release hotel reservation
```

---

## Vector Clocks

**Problem:** How do you know the causal order of events in a distributed system where clocks aren't synchronized?

**Solution:** Vector clocks track causality without relying on wall-clock time.

```
Each node maintains a vector: [node1_counter, node2_counter, node3_counter]

Node A: [1,0,0] → sends event to B
Node B: [1,1,0] → receives A's event, increments own counter
Node B: [1,2,0] → sends to C
Node C: [1,2,1] → receives B's event

Comparing vectors:
[1,2,0] < [1,2,1]  → causally related (first happened before second)
[2,0,0] vs [0,2,0] → concurrent (neither caused the other)
```

- **Used by:** Amazon Dynamo (for conflict detection), Riak
- **Modern alternative:** Hybrid Logical Clocks (HLC) in CockroachDB

---

## Consistent Hashing

**Problem:** When you add/remove servers, traditional `hash(key) % N` remaps almost all keys.

**Solution:** Hash both keys AND servers to a ring [0, 2³²].

```
Ring (0 to 2³²):
               0
              / \
         S1--/   \--S2
            |     |
         S3--\   /--S4
              \ /
              2³²

Key K → hash(K) → find next clockwise server
Server added/removed → only keys on adjacent segment remapped
```

**Virtual Nodes (vnodes):**
```
Without vnodes: Uneven distribution (servers rarely placed evenly)
With vnodes: Each server gets 100-150 positions on ring
→ More even distribution
→ Smoother rebalancing when nodes join/leave
```

**Used by:** Cassandra, DynamoDB, Redis Cluster, Memcached (ketama)

---

## Gossip Protocol

**How distributed systems propagate state without central coordination.**

```
Node A learns info → tells 2-3 random nodes
Those nodes tell 2-3 random nodes each
Information spreads exponentially

Convergence time: O(log N) rounds for N nodes
```

**Used for:**
- Membership management (which nodes are alive?)
- Failure detection
- State propagation (Cassandra, Riak)
- Service discovery

---

## Bloom Filters

**What:** Probabilistic data structure that answers "is this element in the set?" with no false negatives but possible false positives.

```
"Definitely not in set" → always correct
"Probably in set"       → might be wrong (false positive rate configurable)

Space: O(m) bits for m bits filter
Time:  O(k) for k hash functions
```

**Use cases in system design:**
- Check if username exists before DB query
- Check if URL was already crawled
- Check if block exists in distributed storage
- Spam filtering

```python
# False positive rate formula:
# p ≈ (1 - e^(-kn/m))^k
# where k = hash functions, n = elements, m = bits
# For p=1%, n=1M elements → need ~9.6MB

# Optimal k = (m/n) × ln(2)
```

---

## Interview Questions: Distributed Systems

**Q1: Explain CAP theorem. When would you choose CP vs AP?**
> CP: Banking, inventory management, leader election
> AP: Social feeds, DNS, shopping carts, recommendations

**Q2: What's the difference between consistency in CAP and ACID?**
> CAP Consistency: Every read sees the most recent write
> ACID Consistency: Data integrity constraints always hold
> They're different concepts; don't conflate them.

**Q3: How does Raft achieve consensus?**
> Leader election, log replication, commitment when majority acknowledges. Randomized timeouts prevent split votes.

**Q4: How do you prevent duplicate payments in a distributed system?**
> Idempotency keys + atomic check-and-insert at DB level + deduplication cache.

**Q5: Explain consistent hashing and why it's used.**
> Hash ring maps keys to servers; only adjacent keys remapped on topology change. Used in Cassandra, DynamoDB, CDNs.

---

*Next: `04_database_design.md`*
