# Redundancy Patterns
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Redundancy** = having more components than strictly necessary so that some can fail without stopping the system. The extra components are the "spare capacity" that absorbs failures.
- **N+1 Redundancy**: run N instances needed to handle load, plus 1 spare. If any one fails, the remaining N instances continue serving (with slightly higher load). Minimum viable redundancy. Used: 3-pod Kubernetes deployment when 2 pods would handle the nominal load.
- **N+2 Redundancy**: two spares. Any two instances can fail simultaneously and load is still handled. Used for highly critical components where double failure during repair window is plausible.
- **Active-Active**: all redundant instances handle live traffic simultaneously. When one fails, load redistributes to survivors. Zero failover delay. Complexity: all instances must handle the same requests without conflict. Best for stateless services, eventually-consistent databases (Cassandra, DynamoDB), and CDN edge nodes.
- **Active-Passive (Hot Standby)**: one primary handles traffic. Secondary is ready but idle. When primary fails, secondary promotes (detects failure, claims role, starts accepting traffic). Failover delay: 10-120 seconds depending on detection + promotion speed. Best for: databases (avoid write conflicts), Kafka controller, any component where two active instances would cause split-brain.
- **Active-Passive (Cold Standby)**: secondary is shut down and only started when primary fails. Longer failover time (minutes). Lower cost (no running compute for standby). Used for: disaster recovery secondary region, non-critical batch processing backups.
- **Geographic Redundancy**: replicate across different physical locations (data centres, AWS regions). Protects against site-wide failures (power outage, natural disaster, regional AWS incident). Adds complexity (cross-region latency, data sovereignty concerns).
- **The interview answer pattern**: name the redundancy level → explain the failure it protects against → explain the failover mechanism → state the RTO/RPO → name the cost/complexity trade-off.

---

## 1. One-Line Definition
Redundancy patterns are architectural strategies that run extra system components (N+1, N+2, active-active, active-passive) so that the failure of one or more components doesn't cause a total outage — the surviving components absorb the load and maintain service continuity.

---

## 2. The Problem It Solves

### Quantifying Why Redundancy Is Worth the Cost

```
RELIABILITY MATH: What does redundancy actually buy?

Single component with 99.9% uptime (8.76 hours downtime/year):

N+1 REDUNDANCY (2 of same component, either can fail):
  Both fail simultaneously: 0.001 × 0.001 = 0.000001 probability
  Time both fail simultaneously: 365 × 24 × 0.001 × 0.001 = 0.00876 hours/year
  = 0.53 minutes of downtime per year
  Availability: 99.9999% (six nines!) from just one extra instance
  
  WHY: failures of two independent components must overlap in time.
  Each is down 8.76 hours/year (non-overlapping, random times).
  The probability that BOTH are down at the same second = (8.76/8760)² ≈ 0.000001
  Going from 99.9% to 99.9999% with one spare: astronomically better.

N replicas in Active-Active (all must fail for outage):
  3 replicas: probability all 3 fail simultaneously = 0.001³ = 0.000000001
  Effectively: six nines of availability from three reasonably reliable components
  
  CAVEAT: This math assumes truly independent failures.
  If all 3 instances are in the same AZ on the same physical network switch:
  They're NOT independent — one switch failure kills all 3
  Redundancy across AZs/racks ensures independence

COST OF DOWNTIME vs COST OF REDUNDANCY:

  E-commerce (Meesho): ₹50 lakh revenue per hour at peak
  Database downtime: 30 minutes/year (99.9% single instance)
  Cost of downtime: 30/60 × 50,00,000 = ₹25,00,000/year in lost revenue
  
  Cost of N+1 RDS Multi-AZ: ~₹80,000/month extra = ₹9,60,000/year
  
  ROI: investing ₹9.6 lakh/year in redundancy prevents ₹25 lakh/year in losses
  3x return on HA investment in hardware/cloud costs alone (not counting reputation damage)
```

---

## 3. How It Works Internally

### Active-Active — Both Serve Traffic

```
ACTIVE-ACTIVE ARCHITECTURE:

Both instances serve live traffic. Load is distributed across them.

    Client
    │
    ▼
  Load Balancer
  ┌─────────────┐
  │             │
  ▼             ▼
Server-A      Server-B
(active)      (active)
  │             │
  └──── Shared state ────┘
       (DB, Redis, Kafka)

FAILURE SCENARIO:
  Server-A crashes at 3:47 PM:
  Load balancer detects failed health check (within 5-30 seconds)
  Removes Server-A from rotation immediately
  All traffic → Server-B
  Server-B CPU: 55% → 90% (handling all traffic now)
  
  If Server-B can't handle full load alone: need N+1 design
  (Server-B + Server-C running alongside, either can absorb Server-A's traffic)
  
ACTIVE-ACTIVE REQUIREMENTS:
  1. STATELESS: any server handles any request without consulting the others
     (Session state in Redis, not in Server-A's memory)
     
  2. IDEMPOTENT OPERATIONS: if a request is retried on Server-B
     (because Server-A died mid-request), the operation must be safe to retry
     (Use database-level idempotency keys or Kafka exactly-once semantics)
     
  3. SHARED DATA LAYER: database must be accessible from both active instances
     (If using primary DB: both servers share the same primary)
     
ACTIVE-ACTIVE DATABASES (more complex):
  Two database nodes both accepting writes:
  Same record updated on Node-A and Node-B simultaneously:
  → CONFLICT. Which value wins?
  
  Solutions:
  - Cassandra: last-write-wins (LWW) by timestamp, or CRDTs
  - DynamoDB: conditional writes (optimistic concurrency)
  - CockroachDB: distributed transactions using Raft per-shard leader
  - Traditional MySQL/PostgreSQL: NOT safe for active-active writes without extra tooling
                                  (Galera Cluster works but adds write latency)
```

### Active-Passive — Hot Standby

```
ACTIVE-PASSIVE ARCHITECTURE:

One primary handles all traffic. Standby is running but idle.

    Client
    │
    ▼
VIP (Virtual IP)
    │
    ▼ (normally)
  Primary (active)  ←── synchronous replication ──► Secondary (passive)
  
FAILURE SCENARIO:
  Primary crashes at 3:47 PM:
  Keepalived/VRRP (or Patroni, or AWS Multi-AZ internal mechanism):
    Detects heartbeat missing (within 3-10 seconds)
    Secondary claims the Virtual IP (gratuitous ARP broadcast)
    Secondary starts accepting connections
  
  FAILOVER TIMELINE:
    3:47:00 PM  Primary crashes
    3:47:05 PM  Keepalived detects failure (5-second heartbeat timeout)
    3:47:05 PM  Keepalived on secondary acquires VIP
    3:47:06 PM  New TCP connections to VIP → Secondary (now primary)
    3:47:35 PM  Existing application connections timeout (30s TCP timeout)
                Applications reconnect → go to new primary
    
    Total user-visible impact: 35 seconds of connection errors
    RTO (time to recovery): ~35 seconds
    RPO (data loss): 0 (synchronous replication → no committed data lost)
    
ACTIVE-PASSIVE USE CASES:
  1. Databases (avoid split-brain): only one accepts writes at a time
  2. Kafka Controller (one controller manages partition leadership)
  3. Any component where "two think they're primary" = catastrophic
  
HOT vs WARM vs COLD STANDBY:
  Hot standby: running, synced, can take traffic in seconds
  Warm standby: running, partially synced (may lag), minutes to promote
  Cold standby: not running, start from last backup, hours to restore
  
  Hot: highest cost (idle running resources), lowest RTO (seconds)
  Cold: lowest cost, highest RTO (hours)
  Warm: middle ground (common for DR secondary regions)
```

### Geographic Redundancy

```
MULTI-REGION REDUNDANCY:

PRIMARY REGION: AWS ap-south-1 (Mumbai)
DR REGION:      AWS ap-southeast-1 (Singapore)

Data replication:
  PostgreSQL: physical streaming replication (cross-region async replica)
              lag: typically 20-200ms
              RPO: up to 200ms of data potentially lost in region failure
              
  S3: S3 Cross-Region Replication (CRR) — automatic, asynchronous
  
  Kafka: Kafka MirrorMaker 2 (KM2) — mirrors topics cross-region
         Consumer offset sync: KM2 also syncs offsets (consumers can resume in DR)
         
Failover triggers:
  Route53 health check: HTTP 200 from /health endpoint in ap-south-1?
  If 3 consecutive checks fail (every 10 seconds): health check fails
  Route53 DNS: update A record from ap-south-1 ALB → ap-southeast-1 ALB
  DNS TTL: 60 seconds → within 60-70 seconds all new requests go to DR region
  
  Total RTO for region failover:
  Detection: 30 seconds (3 × 10s health check)
  DNS propagation: 60 seconds (TTL)
  DR region warmup: 2-5 minutes (if warm standby, pods may need to scale up)
  Total: ~5-7 minutes RTO for full region failover

ACTIVE-ACTIVE MULTI-REGION (highest complexity):
  Route53 latency routing: users routed to nearest region automatically
  Mumbai users → ap-south-1 (10ms round trip)
  Singapore users → ap-southeast-1 (10ms round trip)
  
  Database write conflict across regions:
  CockroachDB or Google Spanner: handle this natively with distributed transactions
  DynamoDB Global Tables: eventual consistency with LWW resolution
  Standard PostgreSQL: NOT designed for active-active writes across regions
                       (region-specific write routing required: user data → user's region)
```

---

## 4. The Code

### ❌ Wrong Way — Single Instance with No Redundancy Plan

```yaml
# ❌ WRONG: Single replica, no anti-affinity, no PDB — a single failure = brief outage

apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 1   # ❌ Single replica — pod crash = 100% payment service outage
  template:
    spec:
      containers:
        - name: payment-service
          image: razorpay/payment-service:v2.1
          # ❌ No pod anti-affinity — if spec'd to 3 replicas, all 3 might land on same node
          # Node failure → all 3 pods gone simultaneously (artificial SPOF)
          
# ❌ No PodDisruptionBudget — during node drain (Kubernetes upgrade):
# Kubernetes might kill all replicas simultaneously if maxUnavailable is not set
# Result: payment outage during planned Kubernetes version upgrade
```

---

### ✅ Right Way — Properly Redundant with Anti-Affinity and PDB

```yaml
# ✅ CORRECT: 3 replicas with topology spread + PDB

apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 3   # ✅ N+1: 2 needed for load, 1 spare for rolling updates + failures
  template:
    spec:
      # ✅ Anti-affinity: pods won't be scheduled on the same node
      # Pod crash affects 1 pod only; node failure affects 1/3 of traffic
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values: ["payment-service"]
              topologyKey: "kubernetes.io/hostname"  # Different physical nodes

      # ✅ Topology spread: spread across AZs for geographic redundancy within region
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: payment-service

      containers:
        - name: payment-service
          image: razorpay/payment-service:v2.1
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 20
            periodSeconds: 5
---
# ✅ PodDisruptionBudget: always at least 2 pods serving during disruptions
# Prevents Kubernetes from draining too many nodes simultaneously during upgrades
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
spec:
  minAvailable: 2           # ✅ ALWAYS keep at least 2 pods running
  selector:
    matchLabels:
      app: payment-service  # Applies to our 3 payment-service pods
# During node drain: K8s will only drain if 2+ pods remain available
# Prevents the scenario: Kubernetes drains all nodes for upgrade → payment outage
```

```java
// ✅ Active-passive application-level pattern: leader-aware processing
// Only the leader pod processes critical stateful work (prevents double-processing)
// All pods serve HTTP reads (active-active for stateless API)

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentReconciliationService {

    private final LeaderElectionService leaderElection;
    private final PaymentRepository paymentRepository;

    // ✅ Scheduled job runs on ALL pods, but only leader actually processes
    @Scheduled(fixedDelay = 60_000)  // Every 60 seconds
    public void reconcilePayments() {
        if (!leaderElection.isLeader()) {
            // ✅ Non-leader pods skip the job — they're the passive standby
            // If leader dies, a new election happens and a different pod becomes leader
            log.debug("Not the leader — skipping reconciliation (handled by leader pod)");
            return;
        }

        // Only the leader reaches here
        log.info("Leader: running payment reconciliation job");
        List<Payment> pendingPayments = paymentRepository.findPendingOlderThan(
            Duration.ofMinutes(5)
        );
        pendingPayments.forEach(this::reconcilePayment);
    }

    // ✅ API endpoint: active-active — any pod handles reads
    // No leader check needed for read operations
    public List<Payment> getPaymentHistory(String userId) {
        return paymentRepository.findByUserId(userId);  // Any pod can answer this
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Trade-offs
**Interviewer asks:** "What is the difference between active-active and active-passive redundancy? When would you choose each?"

**Hruday's answer:**
> Active-active means all redundant instances are simultaneously serving live traffic. There's no failover delay because when one instance fails, the others are already handling requests — they just receive more of them. The load redistributes immediately via the load balancer.
>
> Active-passive means one primary processes all traffic while one or more secondaries sit idle in ready state. When primary fails, a secondary is promoted — this takes seconds to minutes depending on the detection mechanism.
>
> I'd choose active-active for stateless application tiers: API servers, WebSocket servers, stateless microservices. All requests are independent, any server handles any request, and there's zero risk of conflict from two servers processing concurrently. The load balancer just uses a smaller pool after failure. Spring Boot microservices in Kubernetes are active-active by default — 3 replicas all serve traffic.
>
> I'd choose active-passive for any component where two simultaneous actives would cause a problem. The classic case is a writable database: if two PostgreSQL primaries both accept writes to the same table row simultaneously, you get a write conflict with no agreed resolution. Only one primary can accept writes. Active-passive with automatic failover (Patroni for PostgreSQL, AWS RDS Multi-AZ) is the right pattern. The Kafka controller is another example — only one broker is the controller at a time; ZooKeeper/KRaft ensures leader election makes this safe.

---

### Q2 — Practical Implementation
**Interviewer asks:** "How does a PodDisruptionBudget protect availability during Kubernetes node maintenance?"

**Hruday's answer:**
> When Kubernetes needs to drain a node — for example, to apply a security patch or during a cluster upgrade — it sends SIGTERM to every pod on that node and waits for them to shut down before marking the node as drained. Without a PodDisruptionBudget, Kubernetes will try to move all pods off that node simultaneously. If you have 3 replicas of a service and 2 of them happen to be on the same node being drained, both pods get terminated simultaneously. During the ~30-45 second window between termination and new pod readiness on another node, only 1 pod is serving traffic — which may be insufficient capacity.
>
> A PodDisruptionBudget says "this service must always have at least N pods available, regardless of what you're doing." With `minAvailable: 2` on a 3-replica service: Kubernetes will not drain a node if doing so would leave fewer than 2 pods running. It'll wait until a new pod is scheduled and ready on another node before draining the next pod. This converts what was a brief multi-pod outage window into a fully zero-downtime drain — it just takes a bit longer for each pod to drain.
>
> At SAP Labs, adding PodDisruptionBudgets to our critical services eliminated the brief request errors we occasionally saw during monthly AKS node pool upgrades. The upgrade takes longer (each pod drains sequentially with the PDB constraint), but users never see errors. The trade-off is explicitly: slower maintenance vs zero downtime. That's always the right call for production.

---

### Q3 — Architecture Design
**Interviewer asks:** "How would you set up geographic redundancy for a payment service to survive an entire AWS region going down?"

**Hruday's answer:**
> Geographic redundancy for a payment service is typically active-passive between regions, not active-active, because of the write conflict risk with financial data.
>
> The setup: primary region in `ap-south-1` (Mumbai) handles all traffic. A DR region in `ap-southeast-1` (Singapore, nearest to India) is pre-provisioned with all the same infrastructure but mostly idle — a warm standby.
>
> Data replication: PostgreSQL payment database uses AWS RDS with cross-region read replica. Every write to Mumbai is asynchronously replicated to Singapore — typically within 100ms. The replica is read-only but can be promoted to primary. S3 for payment receipts and documents uses cross-region replication. Kafka topic replication uses MirrorMaker 2 to sync payment events to the Singapore Kafka cluster.
>
> Failover trigger: AWS Route53 performs health checks on the Mumbai ALB endpoint every 10 seconds. If 3 consecutive checks fail (30 seconds of confirmed outage), Route53 automatically updates the DNS record for `payments-api.razorpay.com` from the Mumbai ALB IP to the Singapore ALB IP. DNS TTL is 60 seconds, so within 90 seconds all clients are routing to Singapore.
>
> On the Singapore side: we promote the RDS read replica to a new primary (takes 3-5 minutes). The application tier pre-warms (a minimum pod count is always running in Singapore — not zero). This is the RTO tradeoff: with a warm standby (some pods always running in Singapore), RTO is ~5-7 minutes total. With cold standby, it's 15-20 minutes.
>
> The RPO: because we use asynchronous replication, up to 100ms of committed payment data could theoretically be lost if the Mumbai region fails right as a write is in-flight but not yet replicated. For payments, this is generally acceptable — the probability of a transaction landing in exactly that 100ms window during a full region failure is extremely low, and the business tradeoff between synchronous replication (higher latency on every payment) vs this tiny data loss risk is usually resolved in favour of lower payment latency with async replication.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "N+1 means run N+1 instances regardless of load" | "Just run one extra pod for N+1 redundancy" | "N+1 means N instances handle the peak load with comfortable headroom, plus 1 spare that absorbs failures. If 2 pods can handle peak load at 60% CPU each, then 3 pods is N+1 — each pod runs at 40% nominal, spikes to 60% if one fails. But if you set N=10 with each pod at 95% CPU (barely handling load), then N+1=11 pods — the spare pod's capacity still isn't enough to absorb the failed pod's load. The math must work out: surviving N pods after one failure must still handle 100% of traffic within resource limits. This means each pod should be sized to handle (1/N × 100%) × (N/(N-1)) of traffic after failure — roughly: keep pods below 70% utilisation at peak so N-1 pods can absorb the slack." |
| "Active-active is always better because there's no failover delay" | "Active-active is superior to active-passive" | "Active-active introduces coordination complexity that can create worse problems than the failover delay it avoids. For databases: active-active writes require conflict resolution — last-write-wins silently discards concurrent updates, which is data loss. Vector clocks expose conflicts to the application but require application code to resolve them. For stateful leader election (Kafka controller): two active controllers = split brain = catastrophic partition reassignment conflicts. Active-passive is correct when concurrent operation of two 'active' instances would cause correctness problems. Active-active is correct when instances are truly independent (stateless services). Non-discriminating preference for either is a red flag." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we ran the SAP CFIN document processing service with only 2 replicas — reasoning was 'one for load, one for rolling deployment.' During a monthly AKS cluster upgrade (the Kubernetes nodes get cycled with a new OS image), both of our CFIN pods were on the same node being upgraded. They were terminated simultaneously during the drain. The 45-second window while new pods started on other nodes resulted in connection timeouts visible to finance users running year-end batch imports.
>
> The post-mortem revealed two gaps: (1) no PodDisruptionBudget configured (Kubernetes drained the node without knowing we needed a minimum of 1 pod always running); (2) both pods scheduled on the same node (no anti-affinity configured). We added `podAntiAffinity` with `requiredDuringSchedulingIgnoredDuringExecution` (hard requirement — never schedule CFIN pods on the same node), increased replicas to 3, and added `minAvailable: 2` PodDisruptionBudget. The next monthly AKS upgrade was zero-downtime — each pod drained sequentially, always leaving 2 pods serving traffic. This is the practical meaning of N+1 redundancy in Kubernetes."

---

## 8. Scale Evolution

**1,000 users →** 2 replicas, no strict anti-affinity (node pool might only have 2 nodes). PDB minAvailable:1. Tolerate brief single-pod failures — user impact is minimal. RDS single-AZ with manual failover. Cost is the constraint at this scale.

**100,000 users →** 3 replicas with hard podAntiAffinity (different nodes). PDB minAvailable:2. Topology spread across 3 AZs. RDS Multi-AZ (automated failover). Redis Sentinel. Kafka 3-broker with replication factor 3. All critical infrastructure is N+1 across AZs. Target: no AZ failure causes outage.

**10 million users →** N+2 redundancy for most critical services (2 pods can fail simultaneously without outage). Cross-region active-passive with Route53 health checks. Chaos Engineering: regularly test failure of each component class in production. Dedicated Reliability Engineering team to maintain SLO. Documented runbooks for every failure mode with measured RTO for each.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Active-active for stateless payment API pods. Active-passive with auto-failover for the payment database (synchronous standby = RPO=0). Multi-AZ Kafka with replication factor 3. Geographic redundancy (active-passive) between Mumbai and Singapore for major outage recovery. | "Razorpay needs to maintain 99.99% uptime for their payment API. Describe the redundancy architecture from load balancer to database." |
| Swiggy / Meesho | Active-active Order Service (stateless, 3+ replicas across AZs). Active-passive MySQL for write-heavy order DB. Active-active Cassandra for delivery tracking (built-in multi-AZ per design). Redis Sentinel for cart caching. PDB on all critical services. | "Swiggy's order management database goes down. Orders are being placed but can't be saved. Walk through the redundancy mechanism that auto-recovers this." |
| Adobe / Microsoft | Azure: active-active rendering worker pools. Cosmos DB: active-active multi-region (built-in). Azure SQL: active-passive with geo-replication. Auto-failover groups: automatic promotion of geo-replica on primary failure. | "Adobe Creative Cloud has users in 190 countries. How does geographic redundancy ensure users in Asia experience fast and available service even when US-East data centres have issues?" |
| SAP Labs (current) | AKS Kubernetes with multi-AZ node pools. CFIN services: 3 replicas with podAntiAffinity + PDB. PostgreSQL Azure Database with zone-redundant HA. Azure Cache for Redis with geo-replication enabled. SAP HANA: System Replication (synchronous tier-1 standby in same AZ, async tier-2 in DR). | "SAP CFIN processes financial documents during year-end close. An AKS node pool upgrade is scheduled during business hours. How do you ensure zero downtime for the CFIN document processing service?" |

---

## 10. Related Topics — What to Study Next

- **Topic 150 — Single Point of Failure** — redundancy directly eliminates SPOFs; this topic covers how to identify every SPOF in an architecture (each component with redundancy=1 is a SPOF) and maps the redundancy patterns from this topic to specific component types; the two topics are complementary — SPOF identifies the problem, redundancy patterns describe the solutions
- **Topic 152 — Disaster Recovery RPO vs RTO** — RPO and RTO are the quantitative requirements that determine WHICH redundancy pattern to use: RPO=0 requires synchronous replication (hot active-passive), RPO=5min allows asynchronous (warm standby), RTO=0 requires active-active, RTO=60sec allows active-passive hot standby; every redundancy decision should start from explicit RPO/RTO requirements
- **Topic 149 — Auto-Scaling Strategies** — HPA's `minReplicas` is the minimum of the N+1 redundancy calculation; the auto-scaler increases from N+1 up to maxReplicas during load spikes, but the `minReplicas` ensures you never drop below redundancy requirements; combining redundancy (N+1 minimum) and auto-scaling (N+k for load) gives both HA and cost efficiency
- **Topic 154 — SLI, SLO, SLA** — SLOs drive redundancy architecture decisions; a 99.9% availability SLO requires eliminating all SPOFs but not necessarily multi-region DR; a 99.99% SLO requires multi-AZ and potentially cross-region; a 99.999% SLO requires active-active multi-region; matching redundancy investment to the required SLO prevents both under-engineering (outages) and over-engineering (waste)

---

*Part 8 · Redundancy Patterns · Full Stack Interview Guide · Hruday D · 2026*
