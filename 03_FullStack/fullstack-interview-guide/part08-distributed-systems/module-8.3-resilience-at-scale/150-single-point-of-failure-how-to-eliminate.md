# Single Point of Failure — How to Eliminate 🔥
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- A **Single Point of Failure (SPOF)** is any component in a system whose failure would bring down the entire system or a critical capability. If removing one component causes a total outage, that component is a SPOF.
- SPOFs are everywhere in naive architectures: one database primary, one load balancer, one Kafka broker, one DNS server, one deployment region, one availability zone, even one configuration file hosted in a single location.
- **The three elimination patterns**: (1) Redundancy — run multiple copies so one can fail without affecting the system. (2) Active-active — multiple instances all serving traffic simultaneously. (3) Active-passive — one primary instance serves traffic; a standby is ready to take over if primary fails.
- **Active-active vs active-passive**: active-active has no failover delay (both are already serving traffic), but both instances must handle the same requests correctly without conflicting. Active-passive has a failover delay (seconds to minutes to promote standby), but is simpler to reason about — only one writes at a time.
- **Common SPOFs in interviews**: (1) Single database primary → solution: primary with read replicas, automated failover to a hot standby. (2) Single load balancer → solution: two load balancers in active-passive (DNS failover) or active-active. (3) Single Availability Zone → solution: deploy across 3 AZs (AWS design best practice). (4) Single Kafka broker → solution: 3-broker cluster with replication factor 3. (5) Single Redis instance → solution: Redis Sentinel or Redis Cluster. (6) Single developer with domain knowledge → human SPOF, solved by documentation and cross-training.
- **SPOF in code**: hardcoded URL (fails if that server moves), synchronous dependency on one downstream service (if the downstream fails, you fail), single thread handling all writes (lock contention). SPOFs aren't only infrastructure — they appear in code design too.

---

## 1. One-Line Definition
A Single Point of Failure is any component whose failure causes the entire system (or a critical capability) to become unavailable; eliminating SPOFs requires redundancy so that no individual component failure produces a total outage.

---

## 2. The Problem It Solves

### The Domino Effect — One Component Takes Down Everything

```
SCENARIO: Razorpay's payment system architecture (before HA redesign)

NAIVE (SPOF-FILLED) ARCHITECTURE:

  Internet
    │
    ▼
  Load Balancer (1 instance) ← SPOF #1
    │
    ▼
  API Server (1 instance)    ← SPOF #2
    │
    ├──► MySQL Primary (1 instance) ← SPOF #3
    │         │
    │         └──► MySQL Replica (read-only, cannot take over writes)
    │
    ├──► Redis Cache (1 instance)   ← SPOF #4
    │
    └──► Kafka Broker (1 instance)  ← SPOF #5

FAILURE ANALYSIS:
  Load Balancer EC2 instance crashes (hardware failure):
  → All traffic drops. Users get "Connection refused."
  → API servers are fine, DB is fine, Redis is fine — irrelevant.
  → System is DOWN. Incident P0. MTTR: 5-15 minutes (launch replacement LB + DNS update).
  
  MySQL Primary disk fills up at 2 AM:
  → Write queries fail (INSERT/UPDATE return error).
  → Payment creation fails. Orders stuck in "processing" state.
  → Read queries to Replica still work, but that's useless for payment flow.
  → System is DOWN for writes. MTTR: 20-40 minutes (disk expansion + MySQL restart).
  
  Redis memory exhausted, OOM-kill by OS:
  → All sessions lost (if using Redis for sessions).
  → All cached data gone.
  → Every API call now hits DB directly (cache stampede).
  → DB overwhelmed by 10x traffic. DB CPU at 100%.
  → Secondary failure: DB also goes unresponsive.
  → System DOWN via cascading failure.
  
ANY SINGLE ONE OF 5 SPOFs CAUSES A TOTAL OUTAGE.
  
PROBABILITY OF AVAILABILITY:
  Each component: 99.9% uptime (8.76 hours downtime per year)
  System with 5 SPOFs: 0.999^5 = 99.5% = 43.8 hours downtime per year
  (Each SPOF's downtime is additive)
  
  With HA (redundancy removes SPOFs):
  System availability ≈ 99.99% (requires proper active-active/active-passive)
```

---

## 3. How It Works Internally

### SPOF Catalogue — Most Common in Interviews

```
SPOF 1: SINGLE LOAD BALANCER
  
  Problem: one LB instance = routing fails when LB crashes
  
  Solution A: Active-Passive LB pair
    Primary LB: serves traffic
    Secondary LB: on standby, receives same health check pings
    Keepalived/VRRP: if primary doesn't respond in 2s, secondary claims the Virtual IP
    DNS still points to same VIP — clients see no change
    Failover time: ~3-5 seconds
    
  Solution B: AWS NLB or ALB
    AWS manages the load balancer HA internally
    Multiple availability zone endpoints behind one DNS name
    Single AZ failure: traffic shifts to other AZs automatically
    Effectively removes this SPOF by using cloud-managed service

SPOF 2: SINGLE DATABASE PRIMARY

  Problem: one DB primary = all writes fail when it crashes
  
  Solution: Primary with hot standby + automatic failover
  
  MySQL/PostgreSQL setup:
    primary-db (writes + reads)
    replica-1 (synchronous replication — guaranteed 0 data loss)
    replica-2 (asynchronous replication — fast, <100ms lag)
    
  Automatic failover tools:
    AWS RDS Multi-AZ: AWS manages failover automatically (~60-120 second RTO)
    Patroni (open-source): PostgreSQL HA manager, promotes replica in 10-30 seconds
    
  Application impact:
    Services must reconnect when primary changes IP
    Spring Boot: Spring Retry on DataAccessException
    JDBC URL: AWS RDS endpoint (DNS updated by AWS on failover automatically)
    
SPOF 3: SINGLE AVAILABILITY ZONE (AZ)

  ALL resources in one AZ:
  Power failure, network issue, or AWS hardware problem in that AZ = TOTAL OUTAGE
  
  Solution: spread across 3 AZs in one region (standard AWS best practice)
  
  Application layer: Kubernetes pods spread across 3 AZs via topology spread constraints
  Database: primary in AZ-1, synchronous replica in AZ-2, async replica in AZ-3
  Kafka: brokers spread across 3 AZs, replication factor 3 (1 replica in each AZ)
  Redis: master in AZ-1, replica in AZ-2 (Redis Sentinel for automatic failover)
  
  AZ failure scenario:
  AZ-1 fails: Kubernetes reschedules pods to AZ-2 and AZ-3 (90-120 seconds)
  DB primary was in AZ-1: Patroni promotes AZ-2 replica (30 seconds)
  Total impact: ~2-3 minutes elevated latency + ~30 seconds of write failures
  No total outage.

SPOF 4: SINGLE KAFKA BROKER

  Problem: one Kafka broker = all Kafka producer failures when broker crashes
  
  Solution: 3-broker Kafka cluster with replication factor 3
    Every topic partition has 3 replicas across 3 brokers
    Leader election: if broker-1 (partition leader) dies, ZooKeeper/KRaft elects
                     broker-2 as new leader in 10-30 seconds
    Producers: automatically reconnect to new leader (handled by Kafka client)
    ISR (In-Sync Replicas): min.insync.replicas=2 ensures 2 replicas must ACK
                             before write is confirmed — no data loss on leader failure
    
  SPOF-risk scenario: all 3 brokers in same AZ, or replication.factor=1
  Production requirement: replication.factor=3, min.insync.replicas=2, cross-AZ brokers

SPOF 5: SINGLE REDIS INSTANCE

  Problem: one Redis = all cache misses + session loss on Redis crash
  
  Solution A: Redis Sentinel (for cache + session HA)
    3 Sentinel processes monitor 1 master + 2 replicas
    Master fails: Sentinel quorum (2 of 3 agree) promotes replica in ~30 seconds
    Application: Spring Boot with `spring.redis.sentinel.master` config
    
  Solution B: Redis Cluster (for large datasets)
    16,384 hash slots split across N master nodes (each with 1 replica)
    One master failing: its replica promotes automatically
    Application: Spring Boot Lettuce client (default) supports Redis Cluster natively

SPOF 6: SINGLE REGION (GEOGRAPHIC SPOF)

  AWS region outage (rare but happens): total loss of entire region (us-east-1, ap-south-1)
  
  Solution: multi-region active-active or active-passive
  Active-passive: all traffic to primary region; standby region pre-provisioned but idle
                  Failover: Route53 health checks → if primary unhealthy, DNS fails to secondary
                  RTO: ~5-10 minutes (DNS propagation + secondary warmup)
                  
  Active-active: both regions serve traffic (latency-optimised routing)
                 All writes replicated synchronously or asynchronously between regions
                 Synchronous: higher latency (+~50ms per write for cross-region ACK)
                 Asynchronous: lower latency but RPO > 0 (some data loss possible)
```

---

## 4. The Code

### ❌ Wrong Way — Hardcoded Single Endpoints (SPOF in Code)

```java
// ❌ WRONG: Hardcoded single database and Redis URLs — code-level SPOFs

@Configuration
public class DatabaseConfig {

    @Bean
    public DataSource dataSource() {
        return DataSourceBuilder.create()
            // ❌ Hardcoded single DB host — this IP is a code SPOF
            // When DB primary fails and IP changes (failover), must redeploy application
            .url("jdbc:mysql://10.0.1.45:3306/payments")  // ❌ Single hardcoded host
            .username("app_user")
            .password("password123")  // ❌ Hardcoded password (security SPOF + bad practice)
            .build();
    }
}

@Configuration
public class RedisConfig {

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        // ❌ Hardcoded single Redis node — if this node crashes, all cache is lost
        // No Sentinel or Cluster configuration = Redis is a SPOF
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName("10.0.1.90");  // ❌ Single host
        config.setPort(6379);
        return new LettuceConnectionFactory(config);
    }
}
// When 10.0.1.45 (MySQL) goes down: all payment writes fail immediately
// When 10.0.1.90 (Redis) goes down: all cache operations fail → cache miss storm → DB overload
```

---

### ✅ Right Way — HA Configuration with Redundant Endpoints

```java
// ✅ CORRECT: HA-aware configuration for database and Redis

@Configuration
@Slf4j
public class DatabaseConfig {

    @Value("${spring.datasource.url}")          // ✅ From Kubernetes Secret or ConfigMap
    private String primaryUrl;                   //    aws RDS endpoint — DNS auto-updates on failover

    @Bean
    @Primary
    public DataSource primaryDataSource() {
        HikariConfig config = new HikariConfig();
        // ✅ AWS RDS Multi-AZ endpoint: DNS managed by RDS
        //    On failover, AWS updates this DNS name to point to promoted replica
        //    JDBC connections fail over within 60-120 seconds (when DNS TTL expires)
        config.setJdbcUrl(primaryUrl);
        config.setUsername(System.getenv("DB_USER"));    // ✅ From environment variable
        config.setPassword(System.getenv("DB_PASSWORD")); // ✅ From Kubernetes Secret
        
        // ✅ Connection pool tuning for HA
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(5_000);         // 5s to get a connection from pool
        config.setIdleTimeout(300_000);             // Release idle connections after 5 min
        config.setMaxLifetime(1_800_000);           // Force reconnect every 30 min (catches stale)
        config.setConnectionTestQuery("SELECT 1");  // Validate connection before use
        
        return new HikariDataSource(config);
    }

    // ✅ Read replica data source — routes read-only queries to replica
    //    Replica can still serve reads even if promotion is in progress
    @Bean
    public DataSource readReplicaDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DB_REPLICA_URL"));  // Separate replica endpoint
        config.setMaximumPoolSize(30);  // Replicas handle more read connections
        config.setReadOnly(true);       // Mark connections as read-only
        return new HikariDataSource(config);
    }
    
    // ✅ AbstractRoutingDataSource: routes to primary or replica based on context
    @Bean
    public DataSource routingDataSource(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("readReplicaDataSource") DataSource replica) {
        Map<Object, Object> dataSources = new HashMap<>();
        dataSources.put("primary", primary);
        dataSources.put("replica", replica);
        
        AbstractRoutingDataSource routingDS = new AbstractRoutingDataSource() {
            @Override
            protected Object determineCurrentLookupKey() {
                // Routes read-only transactions to replica; others to primary
                return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                    ? "replica" : "primary";
            }
        };
        routingDS.setTargetDataSources(dataSources);
        routingDS.setDefaultTargetDataSource(primary);
        return routingDS;
    }
}
```

```java
// ✅ Redis Sentinel configuration — eliminates Redis as a SPOF

@Configuration
public class RedisConfig {

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        // ✅ Redis Sentinel: 3 Sentinel nodes monitor 1 master + 2 replicas
        //    Spring Boot Lettuce client automatically handles master promotion
        //    When master fails: Sentinel elects new master, Lettuce reconnects automatically
        RedisSentinelConfiguration sentinelConfig = new RedisSentinelConfiguration()
            .master("mymaster")  // Sentinel master name — defined in sentinel.conf
            .sentinel("redis-sentinel-1.internal", 26379)  // Sentinel node 1
            .sentinel("redis-sentinel-2.internal", 26379)  // Sentinel node 2
            .sentinel("redis-sentinel-3.internal", 26379); // Sentinel node 3
        
        sentinelConfig.setPassword(
            RedisPassword.of(System.getenv("REDIS_PASSWORD"))  // ✅ From Kubernetes Secret
        );
        
        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
            .readFrom(ReadFrom.REPLICA_PREFERRED)  // ✅ Read from replica when available
            .build();                               //    Writes always go to master
        
        return new LettuceConnectionFactory(sentinelConfig, clientConfig);
    }
}
```

```yaml
# ✅ Kubernetes: spread pods across Availability Zones to eliminate AZ SPOF

apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 3
  template:
    spec:
      # ✅ topology spread: ensure pods are distributed across nodes and AZs
      topologySpreadConstraints:
        - maxSkew: 1                            # At most 1 pod difference between nodes
          topologyKey: kubernetes.io/hostname   # Spread across different physical nodes
          whenUnsatisfiable: DoNotSchedule      # Prefer spreading (fail schedule if impossible)
          labelSelector:
            matchLabels:
              app: payment-service
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone   # ✅ Spread across AZs
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: payment-service
      # Result: 3 replicas → 1 in AZ-a, 1 in AZ-b, 1 in AZ-c
      # AZ-a fails: 1 pod down → Kubernetes reschedules it to AZ-b or AZ-c
      # 2 pods remain immediately serving traffic — zero total outage
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Concept
**Interviewer asks:** "What is a single point of failure, and give me three examples in a typical microservices architecture?"

**Hruday's answer:**
> A single point of failure is any component where its failure causes the entire service — or a critical capability — to become unavailable. It's the component you can't afford to lose.
>
> Three concrete examples in a microservices architecture: First, the database primary. If there's one MySQL or PostgreSQL primary with no hot standby, every write operation fails the moment that instance crashes. A read replica doesn't help because it can't accept writes. The solution is a synchronous hot standby with automatic failover — AWS RDS Multi-AZ does this transparently.
>
> Second, a single Kafka broker. If all your Kafka topics have `replication.factor=1` (the dangerous default in development), one broker failure means those topic-partitions become unavailable. Producers get `LeaderNotAvailableException`. Orders, payment events, notifications — all queue up or fail. Production requirement: 3 brokers, replication factor 3, min insync replicas 2.
>
> Third, a single Availability Zone. If all your application pods, database, Redis, and Kafka are in one AZ, and that AZ has a network issue (which happens — AWS has AZ-level incidents a few times per year), your entire service is down. The fix is Kubernetes topology spread constraints across 3 AZs, plus multi-AZ database setup. You don't need multi-region to eliminate AZ SPOFs — multi-AZ in one region is usually sufficient for 99.9% availability targets.

---

### Q2 — Elimination Strategy
**Interviewer asks:** "How would you eliminate the database as a single point of failure without moving to a distributed database like Cassandra?"

**Hruday's answer:**
> For a typical PostgreSQL or MySQL setup, I'd use a primary with one synchronous replica and automatic failover. The key components: the primary receives all writes. One synchronous replica confirms every write before the primary acknowledges it to the application — this is zero data loss failover (RPO=0). One asynchronous replica receives writes slightly delayed — it can serve reads but lags slightly, and isn't used for failover.
>
> For automatic failover, I'd use AWS RDS Multi-AZ — AWS manages the standby replica, monitors the primary, and fails over automatically within 60-120 seconds when it detects failure. The DNS endpoint for the RDS cluster automatically updates to point to the promoted replica. My application uses that DNS endpoint (not a hardcoded IP), so after the JDBC connection pool's connection TTL refreshes (90-120 seconds), all new connections go to the new primary.
>
> For open-source, I'd use Patroni with etcd — it's the PostgreSQL HA standard. Patroni monitors the primary, and when it fails, the Patroni leader (elected via etcd) promotes the synchronous replica within 10-30 seconds, updates the service DNS record, and reconfigures the cluster. The application reconnects automatically.
>
> One critical application-side requirement: Spring Boot's `spring.datasource.hikari.maxLifetime` should be set to 1,800,000ms (30 minutes). This forces HikariCP to close and reopen connections proactively, ensuring that after a failover, stale connections are replaced by new ones pointing to the promoted replica within 30 minutes, even if the DNS TTL doesn't expire within that window.

---

### Q3 — Design Challenge
**Interviewer asks:** "Design a payment processing system with no single points of failure for 99.99% availability."

**Hruday's answer:**
> Achieving 99.99% — which is 52 minutes of downtime per year — requires eliminating SPOFs at every layer. Here's how I'd design it.
>
> Entry layer: Two AWS ALBs in an active-active configuration (AWS manages ALB HA internally across AZs). Route53 with health checks provides DNS-level failover between regions if needed.
>
> Application layer: Kubernetes with pods spread across 3 AZs via topology spread constraints. Minimum 3 replicas for every critical service. PodDisruptionBudget: `maxUnavailable: 1` — Kubernetes will never kill more than 1 pod simultaneously during node maintenance, ensuring 2 pods always serve traffic.
>
> Database: PostgreSQL on AWS RDS Multi-AZ with automatic failover. Synchronous standby replica is in a different AZ. Read traffic goes to Aurora read replicas. Connection pooling via PgBouncer (each app pod gets a shared pool, preventing connection exhaustion during failover reconnection surge).
>
> Message broker: Kafka with 3 brokers across 3 AZs. Replication factor 3, min insync replicas 2. KRaft mode (no ZooKeeper dependency — ZooKeeper itself was a SPOF in older Kafka).
>
> Cache: Redis Sentinel with 3 Sentinel nodes, 1 master + 2 replicas across AZs. Spring Boot Lettuce client with `ReadFrom.REPLICA_PREFERRED`.
>
> For 99.99% target, also add cross-region active-passive: all infrastructure mirrored in a second region. Route53 failover routing: if primary region health check fails, DNS fails over to secondary region within 60 seconds. RTO ~5 minutes, RPO based on replication lag (typically < 1 second for async RDS cross-region replication). The cross-region is the last line of defence — the multi-AZ setup handles 99.9%, the cross-region covers the extra 9.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Active-active is always better than active-passive" | "Use active-active for zero failover time" | "Active-active requires both instances to handle the same requests without conflicting. For databases: active-active means two primaries accepting concurrent writes — which requires conflict resolution (last-write-wins, vector clocks, or CRDTs). Cassandra and DynamoDB handle this. PostgreSQL and MySQL do NOT natively support active-active writes — using them in active-active requires application-level sharding or Galera Cluster (which has its own conflict issues). Active-passive with automatic failover (<60 seconds) is the right choice for transactional databases. Active-active is correct for stateless application tiers and eventually consistent data stores." |
| "More replicas = more availability" | "I'd add 5 read replicas to the database for HA" | "Read replicas improve read throughput and provide a fallback for reads, but they do NOT eliminate the write SPOF. If the primary crashes, read replicas cannot accept writes — they are read-only standby nodes. The SPOF for writes is specifically: 'who can accept writes after primary failure?' Only a hot standby configured for failover promotion (synchronous replication + Patroni or RDS Multi-AZ) eliminates the write SPOF. Adding more read replicas is a read-scaling strategy, not an HA strategy for writes." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we had an incident where our SAP CFIN database primary instance ran out of disk space during month-end financial close (the worst possible time). The application logs filled a 200GB volume in 36 hours — nobody had set log rotation properly. The MySQL primary froze on every write transaction (INSERT transactions couldn't commit because the binary log couldn't be written to a full disk).
>
> The read replica was fine — it replicated from the binary log, which had already been received and acknowledged before the disk filled. But all write operations failed. The CFIN processing job had no fallback for write failures — it just crashed. Finance users couldn't create any new journal entries for 40 minutes.
>
> After the incident, we made three changes: (1) moved to AWS RDS Multi-AZ (automated failover standby in a different AZ on different physical storage — a full AZ or storage failure triggers automatic promotion); (2) added CloudWatch storage alarms at 75% and 90% disk usage with PagerDuty escalation; (3) added a circuit breaker in the CFIN processing service that gracefully queues writes to Kafka when the DB returns errors, drains the queue when DB recovers, and surfaces a degraded-mode status page instead of crashing entirely. The disk SPOF was eliminated via RDS Multi-AZ; the missing observability was fixed with monitoring; the missing resilience in code was fixed with the circuit breaker."

---

## 8. Scale Evolution

**1,000 users →** Single database with a read replica (scale-and-fallback). Single Redis. AWS ALB (AWS manages LB HA). Acceptable risk at this scale — limited revenue impact from brief outages. Focus: monitoring to detect failures fast (MTTD), not prevent them.

**100,000 users →** Multi-AZ everything. RDS Multi-AZ for database. Kubernetes pods across 3 AZs. Kafka 3-broker cluster. Redis Sentinel. PodDisruptionBudget configured. AWS ALB (HA by design). Acceptable RTO: 60-120 seconds. Goal: no single infrastructure failure causes P0.

**10 million users →** Multi-region active-passive (primary region + standby). RDS cross-region read replica with manual or automatic promotion capability. Multi-region Kafka (Kafka MirrorMaker 2 for cross-region replication). Global Redis Cluster. Chaos Engineering (Netflix Chaos Monkey equivalent) to regularly test failure scenarios. SLO for each SPOF elimination: "time to detect + time to failover < 60 seconds total." GameDay exercises: deliberately fail components and measure actual recovery.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment infrastructure: 0 tolerance for SPOF. Multi-AZ everything. Payment DB: synchronous replication (RPO=0 for payment data). Kafka: replication factor 3, min.insync.replicas=2 (no message loss). Load balancer: AWS NLB (AZ-aware). Audit log: immutable write-once storage (no SPOF for regulatory compliance). | "Razorpay processes ₹500 crore in payments per day. Describe the SPOF elimination strategy for the payment database, message broker, and network." |
| Swiggy / Meesho | Order Service DB: Multi-AZ MySQL. Restaurant notification: Kafka 3-broker. Redis for cart: Sentinel. Delivery tracking: Cassandra (active-active across 3 AZs — no SPOF by design). CDN for static assets (global CDN = no SPOF for frontend resources). | "Swiggy's order assignment service is down for 10 minutes. 50,000 unassigned orders are queuing up. What was likely the SPOF, and how would you prevent it?" |
| Adobe / Microsoft | Azure: Availability Zones used by default. Cosmos DB: multi-region active-active (built-in SPOF elimination). Azure Storage: zone-redundant storage (ZRS) by default for critical data. Microsoft 365: multiple data centre regions, transparent failover. | "Adobe's document storage serves 50 million users. If one Azure data centre fails, how does the storage remain available?" |
| SAP Labs (current) | SAP HANA: multi-tier HA (primary + secondary) with SAP HANA System Replication. SAP BTP: Kyma on AKS with multi-AZ node pools. PostgreSQL on Azure Database for PostgreSQL — Zone Redundant HA. Redis: Azure Cache for Redis with geo-replication. | "SAP CFIN runs on a 3-node AKS cluster in a single AZ. What SPOFs exist and how would you eliminate them?" |

---

## 10. Related Topics — What to Study Next

- **Topic 151 — Redundancy Patterns** — SPOF elimination IS redundancy; this topic goes deeper into the specific patterns: N+1 redundancy (one spare of every component), active-active vs active-passive details, geographic redundancy across regions, and how to quantify redundancy requirements based on failure probability
- **Topic 152 — Disaster Recovery RPO vs RTO** — RPO (Recovery Point Objective) and RTO (Recovery Time Objective) are the metrics that drive SPOF elimination decisions; RPO=0 requires synchronous replication (no SPOF for data); RTO=0 requires active-active (no failover delay); understanding what RPO/RTO your business requires tells you what redundancy level to invest in
- **Topic 144 — Leader Election** — eliminating the database SPOF requires that when the primary fails, one standby is automatically promoted and becomes the new leader; leader election (via Patroni with etcd, or AWS RDS Multi-AZ internal mechanism) is the distributed consensus algorithm that makes automated failover safe — it prevents two standbys from both claiming "I am the new primary" (split-brain)
- **Topic 153 — Chaos Engineering** — the only way to KNOW your SPOF elimination actually works is to test it deliberately; chaos engineering is the discipline of injecting failures in production (or production-like environments) to validate that HA mechanisms work before a real failure triggers them; you haven't eliminated a SPOF until you've tested the failure of that component and measured the actual recovery time

---

*Part 8 · Single Point of Failure — How to Eliminate · Full Stack Interview Guide · Hruday D · 2026*
