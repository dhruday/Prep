# Leader Election — Raft, ZooKeeper
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Leader election** is the process by which a group of distributed nodes chooses one node to act as the "leader" — the single authority that coordinates writes, holds the lock, or drives the workflow. When the leader fails, the remaining nodes re-elect a new leader automatically without human intervention.
- **Why you need a leader**: some operations must happen on exactly one node at a time — writing to a distributed log, holding a distributed lock, or being the "master" in a primary-replica database setup. Without a single leader, two nodes might both think they're in charge, issue conflicting decisions, and corrupt shared state (this is called "split brain").
- **Raft consensus algorithm**: the most important consensus algorithm for modern systems. Works in three roles: Leader (receives writes, sends heartbeats), Follower (receives log entries from leader, votes in elections), Candidate (intermediate state, trying to become leader). A node becomes leader when a majority of nodes vote for it. Used by: etcd (Kubernetes), CockroachDB, TiKV, Consul.
- **ZooKeeper (ZAB protocol)**: ZooKeeper uses its own Zab (ZooKeeper Atomic Broadcast) protocol. Every write goes through a single ZooKeeper leader. Strong consistency. Used for: distributed configuration, service discovery, distributed locks, leader election coordination. Used by: Kafka (pre-3.0 for controller), HBase, Hadoop.
- **Split-brain prevention**: a leader is only valid if it holds a "lease" (a time-bounded grant from a quorum). If a leader can't renew its lease (network partition), it must step down. This prevents two nodes from both acting as leader simultaneously.
- **Practical uses you'll encounter**: Kubernetes uses etcd (Raft-based) to elect which controller instance is active. Kafka 3.0+ uses KRaft (Raft in Kafka) for broker leader election. Spring Integration's Leader selector uses ZooKeeper or Redis.

---

## 1. One-Line Definition
Leader election is the process by which distributed nodes use a consensus algorithm (Raft, ZAB) to agree on a single node as the coordinator, ensuring only one node takes decisions at any time and automatically replacing the leader when it fails.

---

## 2. The Problem It Solves

### Split-Brain — Why "Just Pick the First Node" Doesn't Work

```
SCENARIO: Kafka has one "controller" (a special broker that manages
          partition leadership assignments). What happens when two nodes
          both think they are the controller?

WITHOUT LEADER ELECTION (naive approach: first node to start wins):

  Setup: 3 Kafka brokers — K1, K2, K3
  K1 starts first → claims "I am the controller"
  K2, K3 acknowledge K1 as controller
  
  Normal operation: K1 assigns partition leaders, manages replication
  
  At 2:00 AM: network blip between K1 and {K2, K3}
  
  K2 and K3 can't reach K1 for 35 seconds
  K2 thinks K1 is dead → starts an election → K2 becomes controller
  
  K1 is NOT dead — it was just unreachable from K2/K3's side
  K1 still thinks it's the controller
  
  SPLIT BRAIN:
    K1 (controller): reassigns Partition-5 leader to broker K3
    K2 (also controller): reassigns Partition-5 leader to broker K1
    Both decisions go out simultaneously
    K3 receives both assignments — which to follow?
    Partition-5 has two "leaders" writing simultaneously:
    Producer A writes to K3 (following K1's instruction)
    Producer B writes to K1 (following K2's instruction)
    
    Result: two diverging copies of Partition-5 data
    Consumers read from one "leader" — miss the other's messages
    DATA LOSS. CORRUPTION.
    
WITH RAFT-BASED LEADER ELECTION:
  Network blip isolates K1
  K2 starts election: sends RequestVote to K3
  K3 votes for K2 → K2 has majority (2 of 3)
  K2 becomes controller with TERM 2
  
  K1 still thinks it's controller (TERM 1)
  K1 tries to issue a command → marks it with TERM 1
  K2 and K3 ignore TERM 1 commands (they're in TERM 2)
  TERM number is the safety mechanism — old leader's commands are invalidated
  
  When K1 reconnects: sees responses from K2 with TERM 2
  K1 immediately steps down → reverts to follower role
  ONE controller at all times. ✅
```

---

## 3. How It Works Internally

### Raft — The Three States

```
RAFT NODE STATE MACHINE:

Start: All nodes start as FOLLOWER
         │
         │ Election timeout fires
         │ (150-300ms random — no heartbeat from leader)
         ▼
      CANDIDATE
         │ Send RequestVote to all nodes
         │ Include: term, lastLogIndex, lastLogTerm
         │
    ┌────┴──────────────────┐
    │                       │
    ▼ got majority votes     ▼ didn't get majority
 LEADER                  Back to FOLLOWER
    │                    (term updated from winner's response)
    │ Send heartbeats every 50ms
    │ Append-only log replication
    │ Only leader can accept writes
    │
    │ Leader failure or partition:
    ▼
(Timeout fires on followers → new CANDIDATE → new election)

TERM NUMBER — the safety mechanism:
  Each election increments the "term" number (epoch)
  Current term = global truth of who's in charge
  
  Old leader K1 (term=5) receives response from K2 (term=6):
  K1 immediately steps down — higher term means newer leader exists
  K1 reverts to FOLLOWER, adopts term=6
  
  Any message with term < current term is REJECTED silently
  This prevents old ideas (stale messages, slow network deliveries) from causing harm
```

### Raft Log Replication — How It Stays Consistent

```
WRITE COMMITTED only when accepted by MAJORITY:

  Leader receives write: "SET X=5"
  
  Step 1: Append to leader's uncommitted log
          Entry: [term=3, index=47, cmd="SET X=5"]
  
  Step 2: Send AppendEntries RPC to all followers
          ┌────────────────────────────────────────────┐
          │ Leader → Follower-1: AppendEntries (index=47)│
          │ Leader → Follower-2: AppendEntries (index=47)│
          │ Leader → Follower-3: AppendEntries (index=47)│
          └────────────────────────────────────────────┘
  
  Step 3: Wait for majority ACKs (2 of 3 followers + leader = 3 of 4 total)
          Follower-1: ✅ ACK
          Follower-2: ✅ ACK — MAJORITY REACHED
          Follower-3: (slow — still replicating)
  
  Step 4: Leader commits entry: "SET X=5" is now COMMITTED
          Leader applies to state machine → X=5
  
  Step 5: Leader notifies followers of commit in next AppendEntries
          Followers commit their copy → X=5
  
  GUARANTEE: once committed (majority ACKs), the entry will NEVER be lost
  Even if the leader immediately dies after committing:
  At least (majority - 1) followers also have it
  Any new leader election from those followers will pick someone with the entry
  New leader will re-commit it
```

### ZooKeeper Leader Election Pattern

```
USING ZOOKEEPER FOR DISTRIBUTED LEADER ELECTION:

ZooKeeper approach: node that holds the "lowest sequential znode" becomes leader

Election Process:
  1. Each service instance creates an ephemeral sequential znode:
     /election/service-name-instance-000001  (node A)
     /election/service-name-instance-000002  (node B)
     /election/service-name-instance-000003  (node C)
     
  2. Each node reads all children of /election/
     Finds the node with the smallest sequence number
     
  3. Node with lowest number = LEADER
     Other nodes: watch the znode just below theirs
     (Not the leader — watching the one just below avoids "herd effect")
     
  4. If the leader (000001) dies:
     Its ephemeral znode is automatically deleted (ZooKeeper removes on disconnect)
     Node watching 000001 receives a watch notification
     Checks: am I now the lowest? YES → I am the new leader
     
HERD EFFECT PROBLEM (why not watch the leader):
  If all N nodes watch the leader's znode:
  Leader dies → N-1 notifications fire simultaneously
  N-1 nodes all check who's lowest → N-1 DB reads → thundering herd
  
  FIX: each node watches the one just below its own number
  Leader dies: only one node (watching leader) is notified
  That node promotes itself. All others unchanged.
  O(1) notifications per leadership change instead of O(N)
```

---

## 4. The Code

### ❌ Wrong Way — Timestamp-Based "Leader" Without Consensus

```java
// ❌ WRONG: Naive leader election based on who wrote to a shared record last
@Service
public class NaiveLeaderElection {

    @Autowired
    private RedisTemplate<String, String> redis;

    // ❌ Not atomic — two instances can both "win" simultaneously
    public boolean tryBecomeLeader(String instanceId) {
        String currentLeader = redis.opsForValue().get("leader");

        if (currentLeader == null) {
            // ❌ RACE CONDITION: between the read above and this write,
            // another instance could have also seen null and is also writing
            redis.opsForValue().set("leader", instanceId);
            return true;
        }

        return instanceId.equals(currentLeader);
    }
    // ❌ Multiple instances may simultaneously see null and all claim to be leader
    // ❌ No TTL — if leader dies, "leader" key stays forever, no new election possible
    // ❌ No heartbeat mechanism — no way to detect if current leader is still alive
}
```

---

### ✅ Right Way — Redis-Based Leader Election with Spring Integration

```java
// Spring Integration Leader Election via Redis (uses Redis locks + heartbeats)
// Spring Integration's LeaderInitiator uses a proper distributed lock pattern

@Configuration
@RequiredArgsConstructor
@Slf4j
public class LeaderElectionConfig {

    private final RedisConnectionFactory redisConnectionFactory;

    // ✅ Spring Integration: LockRegistry-based leader election
    // Uses RedisLockRegistry internally — atomic SETNX + TTL for the lock
    @Bean
    public RedisLockRegistry leaderLockRegistry() {
        // Lock TTL: 30 seconds. Leader must renew every (TTL/2)=15 seconds.
        // If leader dies: lock expires in 30s → next candidate wins election
        return new RedisLockRegistry(redisConnectionFactory, "leader-election", 30_000L);
    }

    // ✅ Configure which component becomes "active" only when this instance is leader
    @Bean
    public LeaderInitiator leaderInitiator(RedisLockRegistry lockRegistry,
                                           LeaderAwareComponent component) {
        return new LeaderInitiator(lockRegistry, component, "payment-processor-leader");
    }
}

// The component that knows when it's the leader vs a follower
@Component
@Slf4j
public class LeaderAwareComponent implements Candidate {

    private volatile boolean isLeader = false;
    private final PaymentBatchProcessor batchProcessor;
    private final ScheduledExecutorService heartbeatScheduler;

    @Override
    public void onGranted(Context ctx) {
        // ✅ Called when this instance wins the election — becomes the leader
        isLeader = true;
        log.info("🏆 This instance is now the LEADER for payment batch processing");

        // Only the leader runs the batch job — prevents duplicate processing
        startBatchProcessing();
    }

    @Override
    public void onRevoked(Context ctx) {
        // ✅ Called when leadership is lost (another node won re-election)
        isLeader = false;
        log.info("▶ Leadership REVOKED — reverting to follower role");

        // Stop the batch job on this instance
        stopBatchProcessing();
    }

    @Override
    public String getRole() {
        return "payment-processor-leader";  // Lock name — only one instance holds this
    }

    // Methods that check leadership before acting
    public void processPaymentBatch(List<Payment> payments) {
        if (!isLeader) {
            log.debug("Not the leader — skipping batch processing (another instance handles it)");
            return;
        }
        batchProcessor.process(payments);
    }
}
```

```java
// ZooKeeper-based leader election using Apache Curator (higher-level ZK client)
// For when you need production-grade distributed coordination
@Configuration
public class CuratorLeaderConfig {

    @Bean
    public CuratorFramework curatorClient() {
        CuratorFramework client = CuratorFrameworkFactory.builder()
            .connectString("zk1:2181,zk2:2181,zk3:2181")  // 3 ZooKeeper nodes
            .retryPolicy(new ExponentialBackoffRetry(1000, 3))
            .sessionTimeoutMs(15_000)    // Session expires if no heartbeat for 15s
            .connectionTimeoutMs(5_000)  // Wait 5s to establish connection
            .build();
        client.start();
        return client;
    }

    @Bean
    public LeaderSelector leaderSelector(CuratorFramework curator,
                                         LeaderSelectorListener listener) {
        // ✅ Curator handles: election, re-election, heartbeat renewal, session expiry
        LeaderSelector selector = new LeaderSelector(
            curator,
            "/leader-election/batch-processor",  // ZNode path
            listener
        );
        selector.autoRequeue();  // When leader revoked, re-queue for next election
        selector.start();
        return selector;
    }
}

@Component
@Slf4j
public class BatchLeaderListener extends LeaderSelectorListenerAdapter {

    @Override
    public void takeLeadership(CuratorFramework client) throws Exception {
        // ✅ This method runs ONLY on the leader node
        log.info("Became leader — starting batch processing loop");

        try {
            // Run until we want to give up leadership (or exception forces yield)
            while (!Thread.currentThread().isInterrupted()) {
                processBatch();
                Thread.sleep(5_000);  // Process every 5 seconds
            }
        } catch (InterruptedException e) {
            // Thread interrupted = leadership revoked. Clean up and exit.
            Thread.currentThread().interrupt();
            log.info("Leadership yielded — stepping down");
        }
        // Method returns → leadership is released → another node can win
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Raft Fundamentals
**Interviewer asks:** "How does Raft prevent two nodes from both thinking they're leaders at the same time?"

**Hruday's answer:**
> The term number is Raft's protection against having two leaders simultaneously. The term is a monotonically increasing integer that acts like a generation counter. Each successful election increments the term. Every message in Raft carries the sender's current term.
>
> The key rule: if a node receives any message with a higher term than its own, it immediately steps down to follower and updates its term. So if node K1 is leader in term 5 and gets partitioned from the rest of the cluster, the remaining nodes eventually time out waiting for K1's heartbeat, increment to term 6, elect a new leader, and start operating in term 6. When K1's network partition heals, K1 starts receiving messages stamped with term 6. K1 sees "term 6 > my term 5" — it immediately steps down. It cannot issue any more commands. The new leader in term 6 is the only one in charge.
>
> This is the key insight: the term eliminates split-brain by making the "older leader" recognise immediately that a newer election has happened. The old leader's commands are also ignored — any follower processing a command from term 5 will reject it once they know a term 6 leader exists. Term numbers are the distributed system's equivalent of "this token is expired."

---

### Q2 — Practical Application
**Interviewer asks:** "Where does leader election appear in the systems you've worked with?"

**Hruday's answer:**
> At SAP Labs, our Kubernetes cluster uses etcd as its backing store — and etcd is a Raft-based consensus system. Every Kubernetes controller (like the deployment controller that ensures the right number of pods are running) uses etcd leader election to ensure only one instance of each controller is active. We run 3 etcd nodes; losing one is safe (2 form the quorum), but we need to ensure the cluster never has fewer than 2 healthy etcd nodes.
>
> Kafka, which we evaluated for the CFIN event streaming, uses leader election for partition leaders. Each Kafka partition has one leader broker that handles all reads and writes for that partition. When a broker fails, the Kafka controller (itself using ZooKeeper or KRaft) elects a new leader from the in-sync replicas. This is transparent to producers and consumers — they automatically reconnect to the new leader.
>
> In Spring Boot application code, I've used Spring Integration's `LeaderInitiator` with Redis lock registry for a scheduled batch job. We had 3 instances of the service for redundancy, but the nightly payment settlement batch should run on exactly one instance. The leader election via Redis ensures only the leader runs the settlement. If the leader pod is replaced by Kubernetes during a deployment, the new pod wins the election within the lock TTL (30 seconds) and takes over. No duplicate settlement runs.

---

### Q3 — Design Challenge
**Interviewer asks:** "What is the 'herd effect' in leader election and how does ZooKeeper solve it?"

**Hruday's answer:**
> The herd effect (or thundering herd) happens when many nodes all watch the same resource and all react simultaneously when it changes. In the naive ZooKeeper leader election: all N nodes watch the current leader's znode. When the leader dies, the znode is deleted. ZooKeeper notifies all N-1 watchers simultaneously. All N-1 nodes wake up, check who's now the lowest sequential node, query ZooKeeper, and race to claim leadership. This is N-1 queries, N-1 mutex operations, N-1 network round trips — all at the same instant. At scale (say 50 service instances): 49 simultaneous operations pile onto ZooKeeper, potentially causing its own availability issues during exactly the moment when you need it most — just after a leader failure.
>
> The fix: instead of all nodes watching the leader's znode, each node watches the znode with the sequence number just below its own. Node with sequence 000003 watches 000002 (not 000001, the leader). When the leader (000001) dies, only the node watching 000001 — which is 000002 — gets notified. 000002 checks if it's now the lowest: yes → it becomes the new leader. Nodes 000003, 000004, etc. are not notified at all. They simply check their watch target. Their watch targets are still alive, so nothing changes for them.
>
> The result: exactly one notification per leadership change, regardless of cluster size. O(1) behaviour instead of O(N).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Just use a database flag for leader election" | "I'd use a row in the database with a 'is_leader' column" | "A database flag for leader election has a fundamental problem: if the current leader dies before clearing the flag, no new leader can be elected until someone manually clears it (or a timeout fires). Worse: if two instances simultaneously try to SET the flag with a non-atomic operation (SELECT + UPDATE), both succeed → split brain. The correct approach uses atomic operations: Redis `SET NX EX` (set if not exists with TTL), ZooKeeper ephemeral nodes (automatically deleted on session expiry), or Raft consensus. The TTL/ephemeral behaviour is critical — it ensures the leader slot is automatically freed if the leader crashes without cleaning up." |
| "Raft always blocks writes during election" | "When a leader fails, the system is unavailable until election completes" | "The election process in Raft is fast — typically 150-600ms. The election timeout is randomised (150-300ms) to prevent all followers trying to elect at the same time. The actual election — RequestVote, receive majority Votes, become leader — takes another network round trip. End-to-end: ~300ms for same-datacenter clusters. During this window, writes to the system are indeed paused — this is the CP (consistency over availability) trade-off. But writes that were committed before the leader died are NOT lost — they're already on a majority of followers. The new leader inherits that log. The window of unavailability is short (sub-second), which is why Raft-based systems like etcd are useful for coordination tasks but not recommended for storing hundreds of milliseconds of continuous writes." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we ran a scheduled SAP CFIN synchronisation job that pulled financial document changes from SAP S/4HANA and replicated them to our Central Finance platform. With 3 instances of our microservice running (for pod redundancy in Kubernetes), we had a problem: all 3 instances ran the sync job simultaneously, causing triple-processing of each document and triplicate Kafka messages. We introduced Spring Integration leader election using Redis — only the leader pod runs the sync job. The other two instances are on standby. If the leader pod is terminated (rolling deployment, node failure), a new leader is elected within the Redis lock TTL (30 seconds), and the sync resumes on a different pod automatically. This is leader election in practice — not a Raft academic exercise, but a real problem of 'only one node should do this work at a time.'"

---

## 8. Scale Evolution

**1,000 users →** Single instance. No election needed. If the process crashes, restart it — Kubernetes does this automatically. No distributed coordination.

**100,000 users →** 3 instances for HA. Spring Integration LeaderInitiator + Redis. One instance is the "leader" for scheduled jobs. Other instances serve HTTP requests normally (leader election only controls the batch/scheduled work, not live request serving).

**10 million users →** ZooKeeper 5-node cluster for coordination. Kubernetes 5-node etcd for control plane. Kafka KRaft (3-node) for broker coordination. Multiple independent leader election domains (one for payment settlement, one for Kafka partition leadership, one for config management). Monitoring: Prometheus alert if leadership changes > 3 times per hour (indicates instability). MTLD (mean time to leader detection) measured and tracked.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Kafka partition leaders for payment event streams. ZooKeeper / KRaft for Kafka controller election. Redis for distributed lock-based application-level leader election in batch settlements. | "In Razorpay's payment pipeline, what happens to in-flight Kafka messages when the partition leader broker crashes? How does leader election restore service?" |
| Swiggy / Meesho | Kubernetes etcd (Raft) for control plane. Application-level: only one instance runs the "order expiry" job (auto-cancel unpaid orders after 15 minutes). ZooKeeper or Spring Integration for this. | "Swiggy runs 5 pods of the Order Service for resilience. The order auto-expiry job should NOT run on all 5 pods simultaneously. How do you design this?" |
| Adobe / Microsoft | etcd (Raft) for Kubernetes. GitHub/Azure DevOps distributed schedulers use leader election. Microsoft's Azure Cosmos DB uses multi-region leader election for write region. | "Azure has data centres in US, EU, and AS. How does Cosmos DB elect which region accepts writes, and what happens when the current write region goes offline?" |
| SAP Labs (current) | Kubernetes etcd for SAP CFIN cluster. Spring Integration LeaderInitiator for batch synchronisation jobs. SAP Hadoop cluster uses ZooKeeper-managed NameNode HA (automatic leader election for HDFS master). | "SAP's CFIN batch sync job runs every minute. With 3 pods in Kubernetes, how do you ensure exactly one pod processes each sync cycle, even during rolling deployments?" |

---

## 10. Related Topics — What to Study Next

- **Topic 143 — Quorum-Based Systems** — quorum is the mathematical foundation of leader election; a candidate becomes leader only when it receives votes from a quorum (majority) of nodes; the R+W>N formula applies to leadership: a new leader can only be elected if it holds a quorum, ensuring the old leader cannot simultaneously hold a quorum — two leaders = impossible
- **Topic 140 — CAP Theorem** — leader election systems are CP by design; during a network partition, they refuse to elect a new leader unless a quorum is reachable, accepting reduced availability to prevent split-brain; understanding CAP explains why the system seems "stuck" during an election and why that's the correct behaviour
- **Topic 104 — Redis Distributed Lock (Redlock)** — the simplest form of leader election is just a distributed lock; whoever holds the lock is the leader; Redlock across 5 Redis nodes is the quorum-based distributed locking mechanism, and many application-level leader election systems like Spring Integration's Redis leader implementation are built on this pattern
- **Topic 84 — Distributed Tracing** — when a leader changes (new election), requests that were in-flight to the old leader need to be rerouted or replayed; distributed tracing with correlation IDs is essential for diagnosing "the request started on node A but the leader changed mid-flight to node B" — these election-during-request bugs are among the hardest to debug without tracing

---

*Part 8 · Leader Election — Raft, ZooKeeper · Full Stack Interview Guide · Hruday D · 2026*
