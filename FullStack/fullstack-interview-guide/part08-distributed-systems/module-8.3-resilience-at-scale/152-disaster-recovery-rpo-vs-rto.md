# Disaster Recovery — RPO vs RTO
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **RPO (Recovery Point Objective)**: the maximum acceptable amount of data loss measured in time. "How old can the most recent backup be when disaster strikes?" If RPO = 1 hour: losing up to 1 hour of data is acceptable. If RPO = 0: zero data loss — every committed transaction must survive the disaster.
- **RTO (Recovery Time Objective)**: the maximum acceptable time to restore service after a disaster. "How long can the system be down?" RTO = 0 means the system must be continuously available (active-active). RTO = 4 hours means the business can tolerate up to 4 hours of downtime.
- **The relationship**: RPO drives data replication strategy. RTO drives infrastructure redundancy strategy. Lower RPO requires synchronous replication (expensive latency). Lower RTO requires pre-warmed standby or active-active (expensive compute).
- **RPO ↔ replication type**: RPO=0 → synchronous replication (write confirmed only after secondary acknowledges). RPO=minutes → asynchronous replication (write acknowledged immediately, secondary lags by minutes). RPO=hours → periodic backups (hourly snapshot to S3, for example).
- **RTO ↔ standby type**: RTO=seconds → active-active (no failover needed). RTO=minutes → hot standby (pre-warmed secondary, automatic failover). RTO=hours → warm standby (secondary is running but not fully ready). RTO=days → cold standby (secondary is a backed-up image that must be restored).
- **Business context always drives RPO/RTO**: payment service: RPO=0, RTO<60sec. Internal analytics dashboard: RPO=4h, RTO=24h. Product images CDN: RPO=24h (regeneratable), RTO=30min (can serve stale). Define RPO/RTO per service based on business impact of data loss and downtime.
- **MTTR vs RTO**: RTO is the target (objective). MTTR (Mean Time To Recover) is the actual measured value. Goal: MTTR ≤ RTO. If MTTR consistently exceeds RTO: either improve the architecture or revise the RTO target upward to match reality.

---

## 1. One-Line Definition
RPO (Recovery Point Objective) defines the maximum tolerable data loss (in time) when recovering from a disaster; RTO (Recovery Time Objective) defines the maximum tolerable downtime; together they determine the data replication strategy and infrastructure redundancy required.

---

## 2. The Problem It Solves

### Why "We Have Backups" Is Not a DR Strategy

```
SCENARIO: Swiggy's order database gets corrupted at 2 PM.
          DBA says "We have backups."
          
BACKUP-ONLY "DR PLAN" FAILURE:

  Last backup: 6 AM daily backup to S3 (automated nightly job)
  
  At 2 PM: database corruption detected
  
  DR process:
    14:00  Incident detected — 10 minutes to confirm corruption
    14:10  Decision: restore from backup
    14:10  Download 6 AM backup from S3: ~20 minutes (500GB database = large download)
    14:30  Restore database from backup: ~40 minutes
    15:10  Database restored to 6 AM state
    15:10  Application reconnects — orders_after_6AM are GONE
           8 hours of orders lost: ₹40 crore in orders, thousands of transactions
    15:15  Service is "up" but with 8-hour-old data
    15:30  Users flood support: "My 1 PM order is missing"
    
  ACTUAL RPO DELIVERED: 8 hours (time between last backup and failure)
  ACTUAL RTO DELIVERED: 1 hour 30 minutes (time from detection to service restoration)
  
  STATED DR PLAN: "We have backups" (implied RPO=24h, no stated RTO)
  BUSINESS EXPECTATION: RPO=5 minutes, RTO=10 minutes (for an order platform)
  
  Gap: the backup plan was never aligned with actual business requirements.
  
PROPER DR ALIGNMENT:

  Payment data: RPO=0 (zero data loss), RTO=60sec
  → Synchronous DB replication (RDS Multi-AZ) + automated failover
  
  Order history: RPO=5min, RTO=5min  
  → Asynchronous DB replication (replica lag 100ms-5min) + automated promotion
  
  Product catalog: RPO=1h, RTO=30min
  → Hourly S3 snapshots + read from replica if primary down
  
  Analytics data warehouse: RPO=24h, RTO=4h
  → Daily backup to S3 + restore procedure documented and tested
  
  Each service gets individual RPO/RTO aligned to its business criticality.
```

---

## 3. How It Works Internally

### RPO — What Drives Data Replication Choice

```
RPO SPECTRUM AND REPLICATION STRATEGIES:

RPO = 0 (Zero Data Loss):
  Technology: SYNCHRONOUS REPLICATION
  How it works:
    1. Application writes transaction to primary DB
    2. Primary writes to its WAL (Write-Ahead Log)
    3. Primary WAITS for replica to confirm WAL receipt
    4. Only after replica ACKs: primary sends "commit confirmed" to application
    
  Guarantee: even if primary dies the instant after step 4:
             replica has the data → promote replica → data intact
             
  Cost: every write waits for the replica round-trip
  Latency impact:
    Same data centre (different rack):  +1-3ms per write
    Same region (different AZ):         +2-8ms per write
    Cross-region (Mumbai → Singapore):  +70-110ms per write
    
  PostgreSQL config: synchronous_commit = remote_write
                     synchronous_standby_names = 'ANY 1 (standby1, standby2)'
  RDS: Multi-AZ = synchronous replication to standby in different AZ

RPO = seconds to minutes (Small Loss OK):
  Technology: ASYNCHRONOUS REPLICATION
  How it works:
    1. Application writes to primary
    2. Primary commits → immediately returns success to application
    3. Primary replicates to replica in background (fire-and-forget)
    
  Guarantee: if primary dies after step 2:
             replication may not have happened yet
             RPO = time lag between primary commit and last replica confirmation
             Typical: 100ms (same region), 1-5 minutes (cross-region)
             
  Benefit: zero write latency impact. Application gets immediate ACK.
  
  PostgreSQL config: synchronous_commit = off (default is async on replica)
  RDS: read replicas use async replication (not Multi-AZ failover path)

RPO = hours (Significant Loss Tolerable):
  Technology: POINT-IN-TIME BACKUPS
  Daily S3 snapshot: restore to last 6 AM backup
  RPO = time since last backup (up to 24 hours)
  
  Cost: minimal storage cost, no replication overhead
  Use case: analytics data warehouse, development databases, low-criticality data

RPO = days (Very Old Data OK):
  Technology: TAPE/GLACIER BACKUP
  Weekly full backup to cold storage
  For compliance, audit archives, disaster recovery of non-critical historical data

AWS RDS PITR (Point-In-Time Recovery):
  Automated backups + transaction log streaming to S3
  Can restore to any point within retention window (1-35 days)
  RPO = minutes (time for current logs to flush to S3, typically <5 minutes)
  RTO = minutes to hours depending on database size
  Not zero-data-loss, but much better than daily snapshots
```

### RTO — What Drives Infrastructure Redundancy Choice

```
RTO SPECTRUM AND INFRASTRUCTURE CHOICES:

RTO = 0 (Zero Downtime):
  Technology: ACTIVE-ACTIVE (no failover needed — never fully down)
  
  Architecture: multiple instances all serving traffic simultaneously
                any instance failure = load redistributes to survivors
                no "failover" event ever occurs
                
  Examples: Cassandra (multi-node cluster, all nodes serve reads+writes)
            DynamoDB (AWS-managed, globally distributed, no SPOF by design)
            Stateless microservices (3+ pods across AZs — pod failure = HPA replaces it)
            
  Cost: highest — must have excess capacity to absorb any instance failure

RTO = seconds to minutes:
  Technology: HOT STANDBY (active-passive with automatic failover)
  
  Architecture: Standby is running and synced (or fully caught up via sync replication)
                Keepalived/Patroni/AWS RDS Multi-AZ detects primary failure within seconds
                Automatic promotion of standby
                VIP or DNS record update: clients reconnect to promoted standby
                
  RTO breakdown:
    Failure detection: 5-30 seconds (heartbeat timeout)
    Promotion: 5-30 seconds (Patroni or RDS internal)
    Client reconnect: 30-60 seconds (HikariCP connection pool retry + DNS TTL)
    Total RTO: ~60-120 seconds
    
  Cost: moderate — standby is running (compute cost) but usually doesn't serve load

RTO = minutes to hours:
  Technology: WARM STANDBY
  
  Architecture: A secondary environment exists, is partially provisioned,
                and needs manual or automated 'warmup' before serving traffic
                (Pre-provisioned infrastructure, but application might be stopped
                 or scaled to zero, needs to scale up + reconnect after promotion)
  
  Example: DR region with 2 small pods running (but prod needs 10 pods at full load)
           After failover: HPA scales from 2 to 10 pods (takes 3-5 minutes to warm up)
  
  RTO: 5-30 minutes (scale-up + warmup time)
  Cost: modest — DR region runs minimal footprint

RTO = hours to days:
  Technology: COLD STANDBY / BACKUP RESTORE
  
  Architecture: No running infrastructure in secondary site.
                On disaster: spin up infrastructure from scratch (Terraform/CloudFormation)
                             restore data from S3 backup
                             deploy application
                             run smoke tests
                             redirect traffic
  
  RTO: 1-4 hours (for well-prepared runbooks)
  Cost: lowest — no idle running infrastructure
  
  Suitable for: internal tools, non-customer-facing systems, dev/staging environments
```

### DR Tiers — Aligning RPO/RTO to Business Criticality

```
TIERED DR ARCHITECTURE (common in enterprises like SAP):

TIER 1 (Mission Critical) — Payment, Order Processing:
  RPO: 0 (zero data loss)
  RTO: <60 seconds
  Architecture: Active-active application; synchronous DB replication (Multi-AZ)
                Automated DB failover (Patroni or RDS Multi-AZ)
                Cross-region hot standby (promote with Route53 DNS failover in 5-10 min)
  Test frequency: quarterly failover drills (mandatory)

TIER 2 (Critical) — Inventory, User Accounts:
  RPO: <5 minutes
  RTO: <10 minutes
  Architecture: Active-passive with hot standby; async DB replication
                Automated failover within same region; manual cross-region failover
  Test frequency: semi-annual

TIER 3 (Important) — Product Catalog, Reports:
  RPO: <1 hour
  RTO: <2 hours
  Architecture: Read replicas; hourly S3 snapshots
                Manual failover with documented runbook
  Test frequency: annual

TIER 4 (Non-Critical) — Analytics Data Warehouse, Audit Logs:
  RPO: <24 hours
  RTO: <24 hours
  Architecture: Daily backup to S3; cold standby
                Restore from backup with standard runbook
  Test frequency: when runbook changes or annually
```

---

## 4. The Code

### ❌ Wrong Way — No DR Consideration in Application Design

```java
// ❌ WRONG: No DR consideration — hardcoded DB URL, no retry, no fallback

@Service
public class OrderService {
    
    @Autowired
    private OrderRepository orderRepository;
    
    // ❌ No retry logic — if DB primary fails and failover is in progress (60 seconds),
    //    all saveOrder calls fail with DataAccessException during the 60-second failover window
    //    Result: 60 seconds of failed order saves — data loss, unhappy users
    public Order saveOrder(CreateOrderRequest request) {
        return orderRepository.save(Order.from(request));
    }
    
    // ❌ No fallback for the read path during DR scenario
    //    If primary DB is gone and replica takes time to promote:
    //    every getOrder call throws exception
    //    Instead of degrading gracefully: could serve from cache or return queued status
    public Order getOrder(Long orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
}
```

---

### ✅ Right Way — DR-Aware Application with Retry and Graceful Degradation

```java
// ✅ CORRECT: DR-aware application — retry for write failover, cache fallback for reads

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final RedisTemplate<String, Order> orderCache;
    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    // ✅ Retry on DataAccessException: handles the 10-60 second window during DB failover
    // RetryableDataAccessException: Spring's marker for transient DB errors
    @Retryable(
        value = {DataAccessException.class, TransientDataAccessException.class},
        maxAttempts = 5,          // Try up to 5 times
        backoff = @Backoff(
            delay = 500,          // Start with 500ms wait
            multiplier = 2,       // Double each retry: 500ms, 1s, 2s, 4s
            maxDelay = 10_000     // Max 10s between retries
        )
    )  // Total max wait: ~17 seconds. DB failover typically completes in 30-60 seconds.
    @Recover  // ✅ If all retries fail: enqueue to Kafka for async processing
    public Order saveOrder(DataAccessException lastException, CreateOrderRequest request) {
        log.error("All DB retries exhausted during failover. Queueing order to Kafka.", lastException);
        OrderEvent event = OrderEvent.fromRequest(request);
        kafkaTemplate.send("order-persistence-queue", event.getOrderId(), event);
        return Order.pendingPersistence(request);  // Return pending order to user immediately
    }
    
    @Retryable(
        value = {DataAccessException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 200, multiplier = 2)
    )
    public Order saveOrder(CreateOrderRequest request) {
        Order order = orderRepository.save(Order.from(request));
        // ✅ Cache the order immediately after successful save
        //    Cache survives DB failover — reads can be served from cache during DB recovery
        orderCache.opsForValue().set(
            "order:" + order.getId(),
            order,
            Duration.ofMinutes(30)
        );
        return order;
    }

    // ✅ Cache-first reads: serve from Redis cache during DB failover
    @Transactional(readOnly = true)  // Routes to read replica (see Topic 150 routing DS)
    public Order getOrder(Long orderId) {
        // ✅ Step 1: Try Redis cache (survives DB failover)
        Order cached = orderCache.opsForValue().get("order:" + orderId);
        if (cached != null) {
            log.debug("Order {} served from cache during potential DR event", orderId);
            return cached;
        }
        
        // ✅ Step 2: Try DB (may be unavailable during failover)
        try {
            return orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
        } catch (DataAccessException e) {
            // ✅ Step 3: During DB unavailability — return "status unknown" gracefully
            // Do NOT throw 500. Return a partial response with status indication.
            log.warn("DB unavailable for order {} lookup — returning degraded response", orderId);
            throw new ServiceDegradedException("Order lookup temporarily unavailable. " +
                "Your order was received. Please check status in a few minutes.");
        }
    }
}
```

```yaml
# ✅ Terraform: cross-region RDS read replica (DR setup for production)
# Primary: ap-south-1 (Mumbai). DR replica: ap-southeast-1 (Singapore)

# app/infrastructure/dr-replica.tf
resource "aws_db_instance" "payment_db_dr" {
  identifier           = "payment-db-dr-singapore"
  instance_class       = "db.r6g.xlarge"

  # ✅ This is a read replica of the Mumbai primary
  replicate_source_db  = aws_db_instance.payment_db_primary.arn

  # ✅ Multi-AZ within Singapore as well (redundancy within the DR region)
  multi_az             = true

  # ✅ Automated backups enabled in DR region (secondary protection)
  backup_retention_period = 7    # 7-day backup window in DR region
  
  # ✅ Performance Insights for DR replica monitoring
  performance_insights_enabled = true

  tags = {
    Environment = "production-dr"
    RPO         = "async-minutes"  # Document the RPO tier for this replica
    RTO         = "5-10-minutes"   # Document expected RTO for promotion
    Tier        = "2"              # DR tier 2 (non-zero RPO OK for this service)
  }
}

# ✅ CloudWatch alarm: if replication lag > 5 minutes, alert SRE team
resource "aws_cloudwatch_metric_alarm" "dr_replica_lag" {
  alarm_name          = "dr-replica-lag-critical"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 300    # 300 seconds = 5 minutes lag
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.payment_db_dr.identifier
  }
  alarm_actions = [aws_sns_topic.sre_alerts.arn]
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Definitions
**Interviewer asks:** "What is the difference between RPO and RTO? Give me a concrete example of each."

**Hruday's answer:**
> RPO and RTO measure two different dimensions of a disaster recovery scenario. RPO measures the DATA dimension: how old can the most recent recoverable data be when a disaster strikes? RTO measures the TIME dimension: how long does the service stay down while we recover?
>
> Concrete example for RPO: Razorpay's payment database has RPO=0. This means zero data loss is acceptable. If the primary database crashes at exactly 2:47:30 PM, we must be able to recover every transaction that was committed up to 2:47:30 PM — including the last payment that was committed 10 milliseconds before the crash. To achieve RPO=0, Razorpay uses synchronous database replication: every write is confirmed on both the primary and a synchronous standby before the application receives a "success" response. If the primary dies that instant, the synchronous standby has an identical copy of all committed data. No data loss.
>
> Concrete example for RTO: the same Razorpay payment database has RTO=60 seconds. This means Razorpay can tolerate the payment API being unavailable for at most 60 seconds during a database failover. AWS RDS Multi-AZ achieves this: failure detection takes 10-30 seconds, promotion of the standby takes 10-30 seconds, and the application reconnects via the updated DNS endpoint within 60 seconds total. Payment processing resumes within the 60-second RTO target.
>
> The difference: RPO is about the data you don't lose (measured backwards in time from the disaster). RTO is about the service downtime (measured forwards in time from the disaster until recovery).

---

### Q2 — Architecture Decision
**Interviewer asks:** "When would you choose asynchronous replication over synchronous, accepting a non-zero RPO?"

**Hruday's answer:**
> I'd choose asynchronous replication when the latency cost of synchronous confirmation outweighs the data loss risk. The most common case: cross-region replication.
>
> Synchronous replication across regions adds a round-trip network latency to every write. Mumbai to Singapore is about 70-100ms one-way. A synchronous write must wait for the Singapore replica to confirm before returning success — that's 140-200ms added to every DB write. For a payment API that currently completes in 80ms, synchronous cross-region replication more than triples the latency. That's a very visible degradation.
>
> The risk analysis for asynchronous cross-region: the RPO is the replication lag — typically 1-5 minutes. The probability of a full AWS region failure in exactly that 1-5 minute window is extremely low. And the data that would be lost is those 1-5 minutes of transactions — not all payment history, just the most recent window. For most businesses, that's an acceptable risk given the alternative (tripling API latency for all users, all the time).
>
> The decision framework: if the latency cost of synchronous replication is small (same AZ: +2ms), always use synchronous for critical data. If the latency cost is large (cross-region: +140ms), use asynchronous and quantify the business risk of the RPO delta. A 1-5 minute RPO for cross-region disaster recovery is acceptable for most systems when the alternative is +140ms on every transaction.

---

### Q3 — Design
**Interviewer asks:** "How would you design a DR strategy for a payment system with RPO=0 and RTO=60 seconds?"

**Hruday's answer:**
> RPO=0, RTO=60s is the most demanding combination — it requires synchronous data replication AND automated failover. Here's the exact design.
>
> Database: AWS RDS PostgreSQL in Multi-AZ configuration. AWS runs a synchronous standby in a different Availability Zone. Every write is confirmed on both primary (AZ-a) and standby (AZ-b) before the application gets success — this is the RPO=0 guarantee. When primary fails: AWS detects failure within 10-30 seconds via its internal monitoring, promotes the AZ-b standby to primary, and updates the RDS endpoint DNS record. The application's JDBC connection pool uses the RDS endpoint (not a hardcoded IP), so within the DNS TTL (60 seconds for RDS endpoints), new connection attempts resolve to the promoted primary.
>
> Application layer: Spring Boot with HikariCP. `connectionTestQuery: SELECT 1` to validate connections. `maxLifetime: 1800000` (30 minutes) to force connection renewal. Spring Retry on `DataAccessException` with exponential backoff starting at 500ms — handles the ~30-60 second window when connections to the old primary are failing and new connections to the new primary DNS are resolving. Retries up to 5 times over ~30 seconds, covering the full failover window.
>
> Monitoring: CloudWatch alarm on `DatabaseConnections` drop (rapid drop to zero = failover event). PagerDuty alert to SRE team for awareness (action not needed — it's automated). Measure actual MTTR per failover test to validate it stays within the 60-second RTO.
>
> Verification: quarterly DR drill. We actually trigger a failover (manually in a staging environment that mirrors production, or using AWS FIS — Fault Injection Simulator — in production during off-hours) and measure: time from failure to full service restoration. If MTTR consistently exceeds 60 seconds, we tune the HikariCP settings or investigate where the time is spent.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We take daily backups, so our RPO is fine" | "We have automated backups so we're covered" | "Automated backups define the MAXIMUM possible RPO — the worst case. If backups run at midnight and disaster strikes at 11:59 PM: backup is 23 hours old. All data from the past 23 hours is lost. RPO=23 hours in that scenario. Daily backups are only acceptable if your business genuinely tolerates losing up to 24 hours of data. For transactional systems (payments, orders), the acceptable RPO is minutes or zero — requiring continuous WAL streaming (RDS PITR) or synchronous replication, not daily backups." |
| "RTO = how fast the team responds" | "RTO depends on how quickly our team notices and reacts" | "RTO is an architectural property, not an operations property. RTO must be achievable WITHOUT human intervention for critical systems. A 60-second RTO is impossible if it depends on a human seeing an alert, logging into a console, and manually promoting a standby — that process takes 10-20 minutes minimum. True RTO <5 minutes requires automated failover: AWS RDS Multi-AZ (automatic), Patroni for self-managed PostgreSQL (automatic), Kubernetes Deployment restart (automatic). The role of the operations team is to monitor that automation worked correctly and to handle the edge cases where automation fails. Human-in-the-loop processes are for RTO >30 minutes." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we discovered our actual RPO and RTO didn't match what management assumed after an accidental database restart during a configuration change. The DBA applied a PostgreSQL config change (pgbouncer pool size tuning) and restarted the service. The restart went fine, but the 3-minute period while PostgreSQL was restarting caused DataAccessExceptions in every Spring Boot service that talked to it. No retry logic was configured. 47 financial document processing requests failed with 500 errors during that 3-minute window. Users had to manually resubmit.
>
> The assumed RTO was 'instant recovery after restart' and RPO was 'zero data loss for restarts.' The actual outcome: 3 minutes of service errors (RTO violation) and manual resubmission needed by users (data loss in the processing queue).
>
> Changes made: (1) Spring Retry with `@Retryable` on all DB-touching service methods — the DataAccessException during restart now triggers automatic retries with backoff, hiding transient DB unavailability from users. (2) Kafka-backed request queue for document processing — requests land in Kafka first, then get processed; a 3-minute DB restart means 3 minutes of Kafka lag, not data loss. (3) Runbook updated to specify 'restart procedure requires pre-announcement and must be done outside business hours for Tier-1 services.' We also established formal RPO/RTO tiers per service — before this incident, none were documented."

---

## 8. Scale Evolution

**1,000 users →** RPO=4h (daily S3 backup + RDS PITR), RTO=4h (restore from backup with tested runbook). Users tolerate brief downtime. Focus on correct functionality, not DR. Document recovery procedures even if not automated.

**100,000 users →** RPO=5min (async replication within region), RTO=5min (RDS Multi-AZ + automated failover). Spring Retry on DB operations. Tested quarterly. Route53 failover for region-level events (RTO=10min, RPO< 5min for cross-region).

**10 million users →** Per-service RPO/RTO tiers. Tier 1 (payments): RPO=0, RTO=60sec. Tier 2 (orders): RPO=1min, RTO=3min. Tier 3 (analytics): RPO=1h, RTO=2h. Continuous replication monitoring (CloudWatch replica lag alarms). Quarterly DR drills for Tier 1-2. Chaos Engineering tests include DB failover simulation. MTTR tracked as an SLO metric.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment data: RPO=0 (RBI regulatory requirement — no financial data loss), RTO<60sec. Transaction logs: immutable, WORM storage, multiple copies (audit compliance). All critical infrastructure: Multi-AZ synchronous replication. DR drills: mandatory per RBI guidelines for payment processors. | "What are the RPO and RTO requirements for Razorpay's payment transaction table, and how do you achieve them technically?" |
| Swiggy / Meesho | Order DB: RPO=1min (async, same-region replica), RTO=2min (hot standby). Restaurant catalog: RPO=1h (refreshed hourly anyway), RTO=30min. User accounts: RPO=0 (financial data in user wallets), RTO=2min. Flash sale inventory: RPO=0 (oversell prevention), RTO=30sec. | "Swiggy's order database is in ap-south-1. If that AWS region becomes unavailable at 1 PM during lunch rush, what is the RPO and RTO, and how does the recovery work?" |
| Adobe / Microsoft | Creative Cloud assets: RPO=0 (user creative work is irreplaceable), RTO=15min (users accept brief unavailability for such rare events). Document collaboration: RPO=0 (last-keystroke preservation), RTO=seconds (active-active multi-region). Analytics pipelines: RPO=24h, RTO=12h. | "A user saves their 6-hour Photoshop project to Creative Cloud and the storage node fails 100ms later. How does Adobe ensure RPO=0 for that save?" |
| SAP Labs (current) | CFIN financial data: RPO=0 (journal entries cannot be lost — SOX compliance), RTO<2min. CFIN reports (read-only): RPO=1h, RTO=1h. SAP landscapes (dev/test): RPO=24h, RTO=8h. HANA System Replication tier-1 (same site, synchronous): RPO=0, RTO<1min. Tier-2 (async, DR site): RPO=seconds, RTO<15min. | "SAP CFIN processes legally mandated financial journal entries. What RPO is acceptable for this data, and how does SAP's HANA System Replication achieve it?" |

---

## 10. Related Topics — What to Study Next

- **Topic 151 — Redundancy Patterns** — RPO and RTO requirements drive the choice of redundancy pattern: RPO=0 requires synchronous hot standby (active-passive with sync replication); RTO=0 requires active-active; understanding redundancy patterns gives the architectural vocabulary to express how you achieve specific RPO/RTO targets
- **Topic 153 — Chaos Engineering** — DR strategies are meaningless if never tested; chaos engineering is the practice of deliberately failing components to verify that the automated recovery actually achieves the RTO target and that no data loss occurs (verifying RPO); untested DR plans have a high probability of failing in the worst possible moment
- **Topic 154 — SLI, SLO, SLA** — RTO is effectively a SLO for recovery time; RPO is a SLO for data recoverability; these are measured as SLIs (actual recovery time of last N failover events) and enforced as SLAs in customer contracts (e.g., "99.9% of failover events complete within the stated RTO" may be a contractual commitment); the SLO/SLA framework gives RPO/RTO formal structure
- **Topic 150 — Single Point of Failure** — achieving RPO=0 requires that replication never has a single point of failure either (if the replication link itself is a SPOF, it can fail and leave you with no replica at all); multi-path replication, monitoring of replica lag, and AZ-spread of replicas are all SPOF elimination applied specifically to the DR replication chain

---

*Part 8 · Disaster Recovery — RPO vs RTO · Full Stack Interview Guide · Hruday D · 2026*
