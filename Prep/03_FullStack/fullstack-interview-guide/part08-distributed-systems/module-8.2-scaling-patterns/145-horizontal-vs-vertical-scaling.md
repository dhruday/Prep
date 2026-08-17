# Horizontal vs Vertical Scaling 🔥
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Vertical scaling (scale up)**: replace the current machine with a bigger one — more CPU cores, more RAM, faster SSD. Simple, no code changes needed, works immediately. But has a hard ceiling (you can't buy infinite RAM), costs exponentially more per unit of compute, and creates a single point of failure (one big machine still means one crash = total outage).
- **Horizontal scaling (scale out)**: add more machines of the same size and distribute load across them. Scales infinitely (in theory — just keep adding machines). No single point of failure — one machine dying leaves the rest serving traffic. But requires your application to be stateless and your data layer to handle distributed access.
- **The practical rule**: scale up first (it's cheaper and faster to implement). Scale out when you hit the vertical ceiling OR when you can't afford the single point of failure risk.
- **The deep trade-off you must know**: vertical scaling preserves all the simplicity of a single-process runtime — shared memory, transactions, no network calls. Horizontal scaling forces you to deal with distributed state: sessions need to be externalised (Redis), transactions become 2PC or saga, caches need invalidation across nodes.
- **CPU-bound vs memory-bound**: vertical scaling helps CPU-bound work (more cores = more parallel threads). But if you're memory-bound (large in-process cache), you can't share that memory across horizontally scaled instances — you need a shared cache layer (Redis, Memcached).
- **Interview signal**: explain that "scale out" isn't just "add servers" — you must first make the application stateless, then add a load balancer, then add horizontal scaling. Skipping the stateless step creates even worse bugs than before.

---

## 1. One-Line Definition
Vertical scaling (scale up) means increasing the capacity of a single server; horizontal scaling (scale out) means adding more servers. Vertical is simple but has a ceiling; horizontal scales indefinitely but requires stateless, distributed-aware application design.

---

## 2. The Problem It Solves

### Why "Just Add More RAM" Eventually Fails

```
SCENARIO: SAP CFIN reporting service needs to handle growing load.
          Currently running on 1 server. Load is doubling every 6 months.

VERTICAL SCALING JOURNEY:
  Month 0:   4 vCPUs, 8GB RAM   — handles 500 req/sec, p99 latency = 80ms
  Month 6:   8 vCPUs, 16GB RAM  — handles 1,200 req/sec, p99 = 75ms
             Cost: 2.5x per month (non-linear cost increase)
  Month 12: 32 vCPUs, 64GB RAM  — handles 4,000 req/sec, p99 = 70ms
             Cost: 8x per month
  Month 18: 64 vCPUs, 128GB RAM — handles 7,500 req/sec, p99 = 72ms
             Cost: 18x per month
  Month 24: Hitting AWS instance type ceiling (largest available: 96 vCPUs, 192GB)
             Can't scale further. At ceiling.
             
  PROBLEM 1: Cost is exponential. 18x cost for 15x throughput.
  PROBLEM 2: Single point of failure. This one machine has:
             - Planned maintenance window: 4 hours downtime
             - Unexpected failure rate: ~0.05%/month per large instance
             - One JVM crash → all 7,500 req/sec fail → full outage
  PROBLEM 3: Vertical ceiling. 192GB RAM is the max. Can't scale further.
  PROBLEM 4: Application restart (deployments) = full brief outage.
             No rolling deployments on a single server.
             
SWITCHING TO HORIZONTAL SCALING:
  Instead of 1x 32vCPU server → 8x 4vCPU servers
  Same total vCPUs. Similar cost. But different failure model:
  
  One of 8 servers crashes → load balancer removes it → 7/8 capacity remains
  Traffic continues. Users see slightly higher latency, not an outage.
  
  Need double the capacity? Add 8 more servers. Takes minutes.
  No ceiling. No exponential cost increase.
  No planned maintenance windows — rolling deployments replace servers one at a time.
```

---

## 3. How It Works Internally

### When to Choose Vertical Scaling

```
GOOD FITS FOR VERTICAL SCALING:

1. STATEFUL by nature — can't easily distribute state:
   Example: PostgreSQL primary database
   Solution: Scale the DB server vertically (more RAM for buffer pool,
             more CPU for query execution, faster SSD for I/O)
   Horizontal would require: partitioning/sharding (huge complexity)
   Vertical up to a large instance is the right first move
   
2. LEGACY NON-STATELESS CODE:
   Example: SAP ECC application (monolith, in-process session)
   Can't easily make it stateless without rewriting
   Vertical scaling is the pragmatic option
   
3. LOW-TRAFFIC APPLICATIONS:
   Internal admin tools, reporting dashboards, dev/staging environments
   Not worth the operational complexity of clustering
   Single large server is simpler to operate and costs less than
   the engineering time to build distributed infrastructure

VERTICAL SCALING LIMITS (approximate guide):
  Commodity cloud (AWS/Azure): up to ~96 vCPUs, 768GB RAM (e.g., r6i.32xlarge)
  When you hit this: you MUST go horizontal (or switch to purpose-built DB like Spanner)
  Cost at this level: ~$20,000/month for the instance alone
  At that price: 20x 4vCPU instances = same compute, same cost, much better fault tolerance
```

### The Stateless Prerequisite for Horizontal Scaling

```
MAKING YOUR SERVICE STATELESS FOR HORIZONTAL SCALING:

BEFORE (stateful — cannot scale horizontally):

  HTTP request from User A → hits Server 1
  Server 1: UserSession stored in JVM heap (HashMap<userId, session>)
  Session contains: shopping cart, auth token, user preferences
  
  Next request from User A → MUST go to Server 1 (sticky sessions)
  Load balancer routes by user cookie → always to Server 1
  
  Problem: Server 1 has 60% of sessions (popular server)
           Server 2 has 20%
           Server 3 has 20%
  Load is NOT balanced — sticky sessions defeat the purpose
  If Server 1 crashes: all 60% of sessions lost — users logged out, cart emptied
  
AFTER (stateless — can scale horizontally):

  HTTP request from User A → can go to ANY server
  No in-process state.
  
  Auth: JWT token in Authorization header → stateless, self-contained
  Session data: externalised to Redis
    Server 1 on request: auth token → validate JWT → fetch session from Redis if needed
    Server 2 on next request: same JWT → same Redis lookup → same session
  Shopping cart: stored in Redis (TTL = 24 hours)
  User preferences: fetched from database
  
  Now load balancer can use round-robin (any server handles any request)
  Server 1 crashes: requests route to Server 2 and 3
  Users' sessions survive (data is in Redis, not Server 1's heap)
  Redis itself is clustered for high availability
  
STATELESS CHECKLIST:
  ✅ No in-process session state (use Redis / JWT)
  ✅ No in-process cache (use Redis / Memcached / CDN)
  ✅ No local file writes that the request depends on reading back (use S3 / NFS)
  ✅ Any node can handle any request independently
  ✅ Server restart loses nothing (all state is external)
```

### Kubernetes Horizontal Pod Autoscaler (HPA)

```
HOW HORIZONTAL SCLAING WORKS IN KUBERNETES (the platform used at SAP Labs):

DEPLOYMENT SPEC:
  replicas: 3  ← minimum 3 pods always running
  
HPA spec:
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 60
  
  Meaning: if average CPU across all pods > 60%:
           add more pods (up to 20 maximum)
  
           if average CPU < 60% for 5 minutes:
           reduce pods (down to minimum of 3)
  
SCALE UP EXAMPLE:
  9:00 AM: 3 pods, CPU 20% each (quiet morning)
  9:30 AM: Swiggy's lunch-rush begins
  9:35 AM: 3 pods, CPU 72% each (above 60% target)
  9:36 AM: HPA calculates: need ceil(3 * 72/60) = ceil(3.6) = 4 pods
           Kubernetes creates pod 4. Takes ~30 seconds to start.
  9:37 AM: 4 pods, CPU ~54% each. Within target.
  
  10:00 AM: Traffic keeps growing
  10:05 AM: 4 pods, CPU 78% each
  10:06 AM: HPA: need ceil(4 * 78/60) = ceil(5.2) = 6 pods
            Two more pods created.
  10:07 AM: 6 pods, CPU ~52%. Stable.
  
SCALE DOWN:
  2:00 PM: Post-lunch traffic drop
  2:05 PM: 6 pods, CPU 12% each (under-utilised)
  2:10 PM: still 12% (5-min stabilisation window to prevent oscillation)
  2:10 PM: HPA: scale down to max(3, ceil(6 * 12/60)) = max(3, 2) = 3 pods
           Terminate 3 pods gracefully (SIGTERM → 30s drain → remove from service)
           3 pods remain. Cost reduced.
  
VERTICAL AUTOSCALER (VPA):
  Adjusts CPU/memory limits on existing pods rather than adding pods
  Cannot vertically scale beyond node capacity
  Useful for: databases, stateful services that can't scale horizontally
  VPA + HPA: usually use HPA for stateless services, VPA for databases
```

---

## 4. The Code

### ❌ Wrong Way — Vertical Scaling Without Stateless Refactor

```java
// ❌ WRONG: Increasing resources without addressing the stateful design
// This is the mistake: assume vertical scaling is always the answer

@RestController
public class ReportingController {
    
    // ❌ In-process cache — cannot be shared across multiple instances
    private final Map<String, Report> reportCache = new HashMap<>();
    
    // ❌ In-process session — locks users to one server instance
    private final Map<String, UserSession> activeSessions = new ConcurrentHashMap<>();
    
    @GetMapping("/reports/{id}")
    public Report getReport(@PathVariable String id, HttpSession httpSession) {
        // ❌ HttpSession is server-local — user must always hit this server
        UserSession session = activeSessions.get(httpSession.getId());
        
        // ❌ In-process cache — if we add a second server, this cache is empty on server 2
        Report cached = reportCache.get(id);
        if (cached != null) {
            return cached;  // server 1 returns cached; server 2 re-fetches every time
        }
        
        Report report = reportService.fetch(id);
        reportCache.put(id, report);  // ❌ Only cached on this server
        return report;
    }
}
// Giving this service more RAM makes the local cache bigger on ONE server.
// But adding a second server creates a second, inconsistent cache.
// Adding more RAM won't solve the fundamental design problem.
```

---

### ✅ Right Way — Stateless Service with External State

```java
// ✅ CORRECT: Stateless service with external session and cache
// Now any instance can handle any request

@RestController
@RequiredArgsConstructor
public class ReportingController {
    
    // ✅ Shared cache: all instances read/write the same Redis cluster
    private final RedisTemplate<String, Report> reportCache;
    
    // ✅ No in-process sessions — JWT carries identity, Redis carries session state
    private final JwtValidator jwtValidator;
    
    @GetMapping("/reports/{id}")
    public ResponseEntity<Report> getReport(
            @PathVariable String id,
            @RequestHeader("Authorization") String bearerToken) {
        
        // ✅ JWT validation: stateless — no server-side session lookup needed
        // The JWT contains userId, roles, expiry — self-contained
        JwtClaims claims = jwtValidator.validate(bearerToken);
        if (!claims.hasRole("REPORT_READ")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        // ✅ Check shared Redis cache — same result regardless of which server handles it
        String cacheKey = "report:" + id;
        Report cached = reportCache.opsForValue().get(cacheKey);
        if (cached != null) {
            return ResponseEntity.ok(cached);
        }
        
        // Cache miss: fetch from DB, store in shared cache
        Report report = reportService.fetch(id, claims.getUserId());
        reportCache.opsForValue().set(cacheKey, report, Duration.ofMinutes(10));  // TTL
        
        return ResponseEntity.ok(report);
    }
}
```

```yaml
# ✅ Kubernetes Deployment — horizontal scaling with HPA
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reporting-service
spec:
  replicas: 3           # minimum 3 pods
  template:
    spec:
      containers:
        - name: reporting-service
          image: sap-labs/reporting-service:v2.3.1
          resources:
            requests:
              cpu: "500m"       # 0.5 CPU requested (for scheduling)
              memory: "512Mi"   # 512MB requested
            limits:
              cpu: "1000m"      # 1 CPU max (vertical limit per pod)
              memory: "1024Mi"  # 1GB max per pod
          # ✅ Readiness probe: don't send traffic to a pod that isn't ready
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 20
            periodSeconds: 5
---
# ✅ HPA: horizontal scaling based on CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: reporting-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: reporting-service
  minReplicas: 3       # Always at least 3 pods (spans 3 availability zones)
  maxReplicas: 20      # Cap at 20 for cost control
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60   # Target 60% CPU average
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75   # Also scale on memory pressure
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30   # Scale up fast (30s to confirm trend)
    scaleDown:
      stabilizationWindowSeconds: 300  # Scale down slowly (5min — avoid oscillation)
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Difference
**Interviewer asks:** "When would you choose vertical scaling over horizontal scaling?"

**Hruday's answer:**
> Vertical scaling is the right choice in three situations. First, when the service is inherently stateful and the cost of distributing that state outweighs the cost of a bigger machine — the classic example is a PostgreSQL primary. Making it horizontally scalable requires either read replicas (only helps read-heavy workloads) or sharding (extreme complexity). For most database workloads, scaling the primary vertically — more RAM for the buffer pool, more CPU for query execution, faster NVMe storage — is the right engineering choice.
>
> Second, for legacy monolithic applications that have in-process session state and can't easily be made stateless. Going from a stateful monolith to a horizontally scalable cluster requires externalising sessions to Redis, removing in-process caches, and handling distributed consistency. That engineering effort may not be justified if the application serves a small team and vertical scaling gives another 2 years of headroom.
>
> Third, for low-traffic services where operational simplicity matters — internal tools, admin dashboards, CI/CD services. Running a 3-node cluster for a service that handles 10 requests per minute is over-engineering. One well-sized server is simpler, cheaper to operate, and easier to debug.
>
> The rule of thumb: scale up first (it's zero code change), scale out when you hit the ceiling or when single-point-of-failure risk becomes unacceptable.

---

### Q2 — Practical Application
**Interviewer asks:** "Walk me through how you would migrate a stateful Spring Boot service to be horizontally scalable."

**Hruday's answer:**
> The migration has four concrete steps. First, identify all server-side state: `HttpSession` usage (look for `session.getAttribute`), in-process caches like Guava or Caffeine, any local file writes that subsequent requests read. These are all the things that "lock" a user to one server instance.
>
> Second, externalise sessions. Replace `HttpSession` with JWT for authentication state — a properly signed JWT carries the user identity and roles without any server-side lookup. For application session data that genuinely needs to persist between requests (like a multi-step wizard), move it to Redis using Spring Session Redis. The `@EnableRedisHttpSession` annotation on your config class handles this almost automatically. Spring Session transparently stores session data in Redis and makes it available to any instance that receives the request.
>
> Third, externalise caches. Replace in-process Caffeine/Guava caches with Spring Cache backed by Redis. Any cache decorated with `@Cacheable` will now write to and read from the shared Redis cluster. All instances share the same cache. No more cache-miss differences between servers 1 and 2.
>
> Fourth, externalise any local file dependencies. If the service writes temp files that next requests read, move to S3 or Azure Blob Storage. If there's a local config file that's manually maintained, move to Spring Cloud Config Server or Kubernetes ConfigMap.
>
> After these steps, any instance can handle any request. Deploy behind a load balancer, set up HPA in Kubernetes, and you're horizontally scalable.

---

### Q3 — Design Challenge
**Interviewer asks:** "Swiggy needs to handle 100x lunch rush compared to overnight. How would you design scaling for the Order Service?"

**Hruday's answer:**
> The Order Service must be stateless first — that's table stakes. Sessions in JWT, cart data in Redis, no local state. Then the scaling strategy has two layers.
>
> For planned lunch-rush scaling: use Kubernetes HPA set to a CPU target of 60%. But HPA reacts slowly — it takes 30-90 seconds to spin up new pods. For a predictable daily spike, Kubernetes also supports CronJob-based scheduled scaling: at 11:30 AM, pre-scale to 15 pods; at 2:30 PM, scale back to 5 pods. This is the "predictive scaling" approach — you scale before the spike arrives rather than reacting to it.
>
> For the data layer: the Order Service database is typically the bottleneck before the application layer is. MySQL primary needs vertical scaling first — more connection pool capacity, read replicas for read-heavy queries (order history, status lookups). Write path (new order creation) stays on the primary.
>
> For burst handling above the autoscaling ceiling: if 100x peak is truly unpredictable (say, a flash sale), add a Kafka queue between the API (always responds instantly with "order received, ID: 12345") and the actual order processing. The API layer is lightweight and scales very fast. The processing layer (DB writes, payment calls, restaurant notifications) drains the queue at its own pace. This decoupling prevents the spike from directly slamming the database.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Horizontal scaling is always better" | "You should always prefer horizontal over vertical" | "Horizontal scaling requires a stateless design, a load balancer, external state management, and distributed tracing. The engineering investment is significant. For a database, for a small internal service, or for a legacy system — vertical scaling is often the correct first choice. Premature horizontal scaling adds complexity without benefit." |
| "Just add more pods and it'll scale" | "I'd just increase the replica count in Kubernetes" | "Adding more pods of a stateful service creates a worse system — inconsistent in-process caches (users get different data from different pods), sticky sessions that defeat load balancing, and split-brain data. 'Add more pods' only works AFTER the service is properly stateless. The pods question is the easy part; making the service stateless is the hard part." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we had a Spring Boot service that generated SAP financial reports — it ran on a single large server (32 vCPUs, 64GB RAM). As SAP's user base scaled, we kept upgrading the server. At one point we were allocating a r6i.8xlarge (32 vCPUs, 256GB RAM) — and it was expensive and still a single point of failure. When we analysed the service, we found it was using in-process Caffeine cache (large report data stored in heap) and HttpSession for user filters. The migration to horizontal scaling took two sprints: externalise Caffeine cache to Redis (Spring Cache annotations swapped out cleanly), replace HttpSession with JWT + Redis Session. After that, we deployed 6 smaller instances (4 vCPUs, 8GB each) behind a Kubernetes Ingress. Total compute was similar, cost was lower, and one pod crashing was invisible to users. We also added HPA — during month-end financial close (peak report generation), the service automatically scaled to 15 pods and scaled back down after the peak. The vertical-to-horizontal migration solved both the cost problem and the SPOF problem."

---

## 8. Scale Evolution

**1,000 users →** Single server, vertical scaling. 4 vCPUs, 8GB RAM handles it comfortably. No need for distributed complexity. Focus on application correctness instead.

**100,000 users →** Stateless application layer horizontally scaled behind a load balancer (3-5 pods minimum, HPA). Database still vertical (scale up PostgreSQL to 16 vCPUs, 64GB for connection pool and buffer cache). Redis for sessions and application cache.

**10 million users →** Application layer: horizontal auto-scaling (20-100 pods per region). Database: vertical limit reached → read replicas for read-heavy queries + write path sharding or moving to a distributed DB like CockroachDB or Aurora. Redis: Redis Cluster (sharded across 6+ nodes). CDN for static assets. Queue-based decoupling for writes to protect the DB from traffic spikes.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment API must scale horizontally — UPI transaction volumes spike on salary day, festival sales, IPO subscriptions. API layer stateless, behind NLB. Core payment processing with Kafka queue decoupling. DB: vertical + read replicas + CRDB for global transactions. | "Razorpay processes 10x more transactions on Diwali than a normal day. How does the payment API scale to handle this?" |
| Swiggy / Meesho | Lunch rush and dinner rush require 10-50x burst capacity. HPA on Order Service and Restaurant Service. DB: Aurora autoscaling. Message queue decoupling for notification spikes. Redis for cart and session — must horizontally scale. | "Swiggy's Order Service gets 80,000 orders in the first 10 minutes of lunch rush. Design the autoscaling strategy." |
| Adobe / Microsoft | Creative Cloud media processing: horizontal scaling for render workers (CPU-bound). AI model inference: vertical GPU instance for single-model high-throughput then horizontal for burst. Document editing (Adobe Sign): horizontal stateless API layer. | "Adobe's PDF rendering backend handles document uploads that vary from 1 page to 2,000 pages. How do you scale this efficiently?" |
| SAP Labs (current) | SAP CFIN sync service: horizontal scaling with leader election (one pod does sync, others on standby). SAP Fiori reporting: stateless REST API horizontally scaled behind ingress. ERP backend: primarily vertically scaled large Oracle/HANA DB instances. | "SAP's month-end financial close generates 50x normal report query volume in a 48-hour window. How do you scale the reporting service?" |

---

## 10. Related Topics — What to Study Next

- **Topic 146 — Stateless Services** — horizontal scaling is impossible without statelessness; this topic drills into exactly how to make a Spring Boot service stateless: replacing HttpSession with JWT, replacing in-process cache with Redis, removing sticky sessions — the prerequisite for everything in this topic
- **Topic 147 — Load Balancing L4 vs L7** — horizontal scaling requires a load balancer to distribute traffic across your multiple instances; this topic explains how the load balancer routes traffic, what Layer 4 vs Layer 7 means, and how to configure health checks so unhealthy instances are removed from rotation
- **Topic 149 — Auto-Scaling Strategies** — HPA in Kubernetes is the "how do you add and remove those pods automatically" answer; this topic covers CPU/memory metrics, custom metrics (Kafka consumer lag), cool-down periods, and scale-out vs scale-in strategies
- **Topic 150 — Single Point of Failure** — the main reason to choose horizontal over vertical scaling is SPOF elimination; this topic explains all the failure modes in a distributed system (single DB primary, single load balancer, single message broker) and how redundancy patterns address each one

---

*Part 8 · Horizontal vs Vertical Scaling · Full Stack Interview Guide · Hruday D · 2026*
