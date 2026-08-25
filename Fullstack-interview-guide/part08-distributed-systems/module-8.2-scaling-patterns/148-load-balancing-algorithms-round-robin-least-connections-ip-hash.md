# Load Balancing Algorithms — Round Robin, Least Connections, IP Hash
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Load balancing algorithms decide WHICH backend server receives each incoming request. These are distinct from the L4/L7 distinction (which determines what information a load balancer uses for routing). The algorithm runs after the routing decision, to pick one specific server from the pool.
- **Round Robin**: requests are distributed to backend servers in a rotating sequence — server 1, server 2, server 3, server 1, server 2... Works perfectly when all servers are equally capable and all requests take roughly the same processing time. Simplest algorithm. AWS ALB default. Kubernetes Service default.
- **Weighted Round Robin**: like Round Robin but each server gets a weight. Server with weight 3 gets 3 requests for every 1 request to a server with weight 1. Use this when servers have different hardware capacities (e.g., one has 8 CPUs and another has 2 CPUs).
- **Least Connections**: the next request goes to the server currently handling the fewest active connections. Handles variable-duration requests well — a slow database query on server 2 means it gets fewer new requests while server 1 (which finished fast) gets more. Better than Round Robin for mixed-workload APIs.
- **IP Hash (Sticky by Client IP)**: hash(client_IP) mod N → deterministic server selection. Same client IP always routes to the same server. Used when you have server-side session that can't be externalised (legacy stateful apps). Downside: uneven distribution if many clients are behind a corporate NAT (all appear as one IP).
- **Least Response Time**: tracks actual response time per server and routes to the fastest one. Combines response time with connection count. Most intelligent but also most complex to implement. Nginx Plus and Envoy support this.
- **The cheat sheet for interviews**: stateless services → Round Robin. Variable request durations (DB-heavy, ML inference) → Least Connections. Legacy stateful sessions → IP Hash. Heterogeneous server capacity → Weighted Round Robin.

---

## 1. One-Line Definition
Load balancing algorithms determine which specific backend server receives each request; the choice of algorithm (Round Robin, Least Connections, IP Hash, Weighted) directly affects how evenly load is distributed and whether clients have session affinity to specific servers.

---

## 2. The Problem It Solves

### Why Round Robin Breaks for Variable-Duration Requests

```
SCENARIO: Image processing service — some requests convert small icons (5ms),
          others convert 8K photos (2000ms). 3 servers.
          
ROUND ROBIN FAILURE:

  11:00:00.000  Request-1 (icon, 5ms)      → Server-1
  11:00:00.001  Request-2 (icon, 5ms)      → Server-2
  11:00:00.002  Request-3 (8K photo, 2000ms) → Server-3  ← SLOW
  11:00:00.003  Request-4 (icon, 5ms)      → Server-1   (Server-1 done, idle)
  11:00:00.004  Request-5 (icon, 5ms)      → Server-2   (Server-2 done, idle)
  11:00:00.005  Request-6 (8K photo, 2000ms) → Server-3  ← ANOTHER SLOW ONE
  
  Server-3 state timeline:
  11:00:00.002 - 11:00:02.002: processing Request-3 (slow)
  11:00:00.005 - 11:00:02.005: now ALSO processing Request-6 (concurrent)
  11:00:00.008: Request-9 (8K photo) → Route to Server-3 (Round Robin)
  
  Server-3: now handling 3 concurrent slow jobs → 6000ms per job
  Server-1: idle (finished its 1ms job 1.999 seconds ago)
  Server-2: idle
  
  Round Robin doesn't see this imbalance.
  Server-3 is overloaded. Server-1 and 2 are idle.
  
LEAST CONNECTIONS FIX:

  11:00:00.002  Request-3 → Server-3 (all have 0 connections — ties to first)
  ...
  11:00:00.005  Request-6: 
    Server-1: 0 active connections (finished its fast requests)
    Server-2: 0 active connections
    Server-3: 1 active connection (still processing Request-3)
    
    → Routes to Server-1 (fewest connections = 0) ✅
    
  11:00:00.008  Request-9 (8K photo):
    Server-1: 1 active (Request-6)
    Server-2: 0 active
    Server-3: 1 active (Request-3)
    
    → Routes to Server-2 (fewest connections = 0) ✅
    
  Result: even distribution of slow jobs across all three servers.
  No single server gets overwhelmed by slow requests.
```

---

## 3. How It Works Internally

### Round Robin — The Default

```
ROUND ROBIN ALGORITHM:

State: index = 0
Servers: [S1, S2, S3]

Each request:
  selected = servers[index % 3]
  index++
  return selected
  
Sequence: S1, S2, S3, S1, S2, S3, S1, S2, S3...

Time complexity: O(1) per request
Space: one integer (the index counter)

WEIGHTED ROUND ROBIN:
Servers: [{S1, weight=3}, {S2, weight=1}, {S3, weight=2}]
Expanded: [S1, S1, S1, S2, S3, S3]
Sequence: S1, S1, S1, S2, S3, S3, S1, S1, S1, S2...

Use case: S1 has 3x the capacity of S2 (larger instance).
          S1 should get 3x more traffic.
          
BEST FIT FOR ROUND ROBIN:
- Homogeneous servers (same hardware)
- Stateless services
- Similar request processing time (APIs that are all ~5ms)
- Default choice for Spring Boot microservices behind Kubernetes Service
```

### Least Connections — For Variable-Duration Requests

```
LEAST CONNECTIONS ALGORITHM:

State: connection_count[S1]=0, connection_count[S2]=0, connection_count[S3]=0

On request arrival:
  selected = argmin(connection_count)  // server with fewest active connections
  connection_count[selected]++
  return selected

On request completion:
  connection_count[selected]--

Thread-safe implementation requires an atomic counter (AtomicInteger per server)
or a mutex on the selection step.

PROBLEM: "Thundering herd at startup"
  All servers have 0 connections at startup
  First 100 requests all go to Server-1 (all are equal at 0, tie-breaking picks first)
  Server-1 briefly gets all traffic
  
FIX: Add small random jitter to tie-breaking — if multiple servers tied at min connections,
     pick randomly among tied servers (not always the first one in list)

BEST FIT FOR LEAST CONNECTIONS:
- API calls with highly variable processing time
- Calls that do synchronous downstream calls (DB query time varies)
- Machine learning inference (input complexity affects duration)
- Any service where "connection open" duration correlates with server load
```

### IP Hash — Deterministic Sticky Routing

```
IP HASH ALGORITHM:

hash(client_IP) mod N = server_index

Example: 
  Client IP: 203.0.113.42
  hash(203.0.113.42) = 3847291834  (CRC32 or similar)
  3847291834 mod 3 = 1
  → Always routes to Server-2 (index 1)
  
  Client IP: 10.0.0.15
  hash(10.0.0.15) = 2918371823
  2918371823 mod 3 = 0
  → Always routes to Server-1
  
STABILITY UNDER SERVER CHANGES:
  If Server-2 goes down: servers = [S1, S3] (only 2 now)
  hash(203.0.113.42) mod 2 = 0 → now routes to Server-1
  Client's session on Server-2 is lost anyway (server is down)
  All clients are remapped to surviving servers
  
CONSISTENT HASHING (better version):
  Normal IP hash: adding/removing a server remaps ALL clients
  Consistent hashing: a ring-based hash space where adding/removing a server
                      only remaps the clients assigned to that specific server
                      ~N/numServers clients remapped instead of all clients
  Use case: distributed caches (Memcached, Redis Cluster) — adding a cache node
            only invalidates the cache entries assigned to that node

THE CORPORATE NAT PROBLEM:
  100 employees behind a corporate proxy at IP 203.0.113.1
  hash(203.0.113.1) mod 3 = 2 → ALL 100 employees → Server-3
  Server-3 overloaded; Server-1 and Server-2 idle
  
  Solution: use X-Forwarded-For header (client's real IP) instead of proxy IP
  Or: use cookie-based stickiness (L7) instead of IP-based (more granular)
  
BEST FIT FOR IP HASH:
  - Legacy stateful web apps that can't externalise session
  - When you want session affinity but can't put sessions in Redis
  - Simple sticky routing without cookie support (native TCP clients)
```

### Comparing All Algorithms Side by Side

```
ALGORITHM COMPARISON TABLE:

Algorithm          | Distribution | Sticky? | CPU cost | Best for
-------------------|-------------|---------|----------|--------------------
Round Robin        | Equal        | No      | O(1)     | Homogeneous stateless
Weighted RR        | Proportional | No      | O(1)     | Heterogeneous capacity
Least Connections  | Load-aware   | No      | O(log N) | Variable request time
IP Hash            | Deterministic| Yes(IP) | O(1)     | Legacy stateful apps
Cookie-based sticky| Deterministic| Yes(user)| O(1)    | User-session sticky
Least Response Time| Load+speed   | No      | O(N)     | Mixed latency services
Random             | Roughly equal| No      | O(1)     | Simple, near-round-robin

KUBERNETES KUBE-PROXY ALGORITHM:
  iptables mode: random selection among healthy endpoints (effective Round Robin)
  IPVS mode: supports Round Robin, Least Connections, Source Hash (IP Hash)
  
  Configure IPVS Least Connections:
  kube-proxy --proxy-mode=ipvs --ipvs-scheduler=lc
```

---

## 4. The Code

### ❌ Wrong Way — Ignoring Algorithm Choice and SPOF in Nginx Config

```nginx
# ❌ WRONG: Default round-robin for a service with highly variable request times
# Missing health checks and algorithm choice

upstream order_service {
    server 10.0.1.1:8080;
    server 10.0.1.2:8080;
    server 10.0.1.3:8080;
    # ❌ No health check — dead servers receive traffic until nginx notices TCP failure
    # ❌ No algorithm specified — defaults to round-robin (wrong for DB-heavy order processing)
    # ❌ No weights — all servers treated equally even if they have different capacities
    # ❌ No max_fails or fail_timeout — nginx won't fast-fail unhealthy servers
}

server {
    location /api/orders {
        proxy_pass http://order_service;
        # ❌ No timeout configured — hanging backend request hangs nginx worker thread
        # ❌ No retry logic — first-instance failure not retried on another server
    }
}
```

---

### ✅ Right Way — Nginx Upstream with Appropriate Algorithm and Health Checks

```nginx
# ✅ CORRECT: Proper upstream configuration with algorithm and resilience settings

# For a DB-heavy Order Service with variable request durations:
upstream order_service {
    least_conn;  # ✅ Least connections — better than round-robin for variable DB query time
    
    server 10.0.1.1:8080 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.2:8080 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.3:8080 weight=2 max_fails=3 fail_timeout=30s;
    # ✅ Server 3 has weight=2 (larger instance) — gets 2x the requests
    # ✅ max_fails=3: after 3 consecutive failures, mark server as unavailable for 30s
    # ✅ fail_timeout=30s: after 30s, try the server again (it may have recovered)
    
    keepalive 32;  # ✅ Keep 32 connections alive to upstream (reduce TCP handshake overhead)
}

# For a stateless Reporting Service with similar request durations:
upstream reporting_service {
    # Round robin (default) is correct here — all requests are similar duration
    server 10.0.2.1:8080 max_fails=3 fail_timeout=30s;
    server 10.0.2.2:8080 max_fails=3 fail_timeout=30s;
    server 10.0.2.3:8080 max_fails=3 fail_timeout=30s;
    keepalive 16;
}

server {
    listen 443 ssl;
    
    location /api/orders {
        proxy_pass http://order_service;
        proxy_connect_timeout 5s;    # ✅ Give up on connect after 5s
        proxy_read_timeout 30s;      # ✅ Give up on response after 30s
        proxy_next_upstream error timeout http_503;  # ✅ Retry on failure/timeout/503
        proxy_next_upstream_tries 2;  # ✅ Try at most 2 upstream servers before giving up
    }
    
    location /api/reports {
        proxy_pass http://reporting_service;
        proxy_connect_timeout 2s;
        proxy_read_timeout 60s;  # Reports can take longer — set appropriate timeout
    }
}
```

```java
// ✅ Spring Cloud Gateway load balancing algorithm configuration
// Using Spring Cloud LoadBalancer with custom algorithm

@Configuration
public class LoadBalancerConfig {

    // ✅ Configure Least Connections algorithm for Order Service
    // (replaces default Round Robin)
    @Bean
    @LoadBalancerClient(name = "order-service", configuration = OrderServiceLBConfig.class)
    public Object orderServiceLoadBalancerConfig() {
        return new Object();  // marker bean for the @LoadBalancerClient annotation
    }
}

// ✅ Per-service load balancer configuration
@Configuration
public class OrderServiceLBConfig {

    // Spring Cloud LoadBalancer supports Round Robin (default) and Random
    // For Least Connections: use a custom ReactorServiceInstanceLoadBalancer
    @Bean
    public ReactorLoadBalancer<ServiceInstance> orderServiceLoadBalancer(
            Environment environment,
            LoadBalancerClientFactory loadBalancerClientFactory) {

        String name = environment.getProperty(LoadBalancerClientFactory.PROPERTY_NAME);
        
        // ✅ Round Robin is fine for homogeneous stateless services
        // For true Least Connections at service mesh level → use Envoy/Istio sidecar 
        return new RoundRobinLoadBalancer(
            loadBalancerClientFactory.getLazyProvider(name, ServiceInstanceListSupplier.class),
            name
        );
    }
}
```

```java
// ✅ Custom Weighted Round Robin implementation for internal use
// When you need proportional traffic distribution based on server capacity tags

@Component
public class WeightedLoadBalancer {

    private final DiscoveryClient discoveryClient;
    private final AtomicInteger counter = new AtomicInteger(0);

    // Builds a weighted server list: server with weight=3 appears 3 times
    private List<ServiceInstance> buildWeightedList(String serviceId) {
        List<ServiceInstance> instances = discoveryClient.getInstances(serviceId);
        List<ServiceInstance> weighted = new ArrayList<>();

        for (ServiceInstance instance : instances) {
            // ✅ Read weight from instance metadata tags (set in service registration)
            int weight = Integer.parseInt(
                instance.getMetadata().getOrDefault("load-balancer-weight", "1")
            );
            for (int i = 0; i < weight; i++) {
                weighted.add(instance);  // Add the instance 'weight' times
            }
        }
        return weighted;
    }

    public ServiceInstance selectInstance(String serviceId) {
        List<ServiceInstance> weighted = buildWeightedList(serviceId);
        if (weighted.isEmpty()) {
            throw new NoHealthyInstanceException(serviceId);
        }
        int index = Math.abs(counter.getAndIncrement() % weighted.size());
        return weighted.get(index);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Comparison
**Interviewer asks:** "When would you use Least Connections instead of Round Robin?"

**Hruday's answer:**
> I use Least Connections when requests have highly variable processing times. Round Robin works on the assumption that all requests are roughly equal in duration — if that's true, Round Robin distributes load evenly over time because every server processes requests at the same rate and the cycle through all servers keeps them balanced.
>
> But for a service like order processing at Swiggy: some orders involve a simple credit card payment (instant, 10ms), others involve EMI calculation with a banking API call (200ms), and some hit a database lock under peak load (2000ms). With Round Robin: the server unlucky enough to get the 2000ms requests will accumulate a backlog. Requests #1, #4, #7, #10 all go to Server-1 via Round Robin. If requests #1, #4, #7, #10 all happen to be slow DB-lock requests: Server-1 has 4 concurrent slow requests, Server-2 and Server-3 have already finished their fast requests and are idle.
>
> Least Connections solves this by routing the next new request to the server currently handling the fewest ongoing requests. Server-2 or Server-3 (which finished their fast requests) get the new ones, while Server-1 (still churning through slow requests) is skipped until its active count drops. The distribution becomes responsive to actual server load, not just request arrival sequence.
>
> Rule of thumb: stateless services with fast, similar-duration API calls → Round Robin (default). DB-heavy services, ML inference, any service where request duration varies significantly → Least Connections.

---

### Q2 — Algorithm Pitfall
**Interviewer asks:** "What is the problem with IP Hash load balancing, and how would you solve it?"

**Hruday's answer:**
> IP Hash has two main problems. The first is the corporate NAT problem: many enterprise clients and large ISPs route all their users through a single outbound IP address (a NAT gateway or proxy). If 10,000 employees at a company all appear to the load balancer as the single IP `203.0.113.1`, then `hash(203.0.113.1) mod N` sends ALL 10,000 to the same backend server. That server gets 10,000 connections; the others get almost nothing. The load distribution becomes completely broken.
>
> The second problem is instability during server changes. If I have 3 servers and one goes down, the hash changes from `mod 3` to `mod 2`, remapping about two-thirds of all clients to different servers. Any in-progress sessions are lost for all remapped clients, not just those that were on the failed server.
>
> The solution to the first problem: use L7 cookie-based stickiness instead of IP hash. The load balancer sets a cookie on the user's browser on their first request (e.g., `SERVERID=server2`). Subsequent requests from that user carry the cookie → always routes to the same server. This is per-user (not per-IP) stickiness, so corporate NAT isn't a problem. Both NGINX (with `sticky` module) and AWS ALB (with sticky sessions enabled on a target group) support this.
>
> The solution to the second problem: consistent hashing. Instead of `hash mod N`, a ring-based hash space maps client IDs to positions on the ring, and servers occupy sections of the ring. When a server is removed, only the clients mapped to that server's section are remapped to the next clockwise server — roughly 1/N of all clients instead of ~2/3.

---

### Q3 — System Design Application
**Interviewer asks:** "You're designing a load balancer for a real-time chat service. Thousands of users maintain persistent WebSocket connections. Which algorithm and why?"

**Hruday's answer:**
> For WebSocket connections specifically, Round Robin is actually the right choice — but with one important caveat. WebSocket connections are long-lived. Once a client connects to Server-2 via WebSocket, that connection stays open as long as the user is active. The "load balancing" decision is made once at connection establishment, not per-message. So the algorithm only matters at connection setup.
>
> Round Robin handles connection setup distribution well — as new users connect throughout the day, their initial connections are spread evenly across servers. Each server accumulates roughly equal numbers of long-lived connections over time.
>
> The caveat: if a server is redeployed or crashes, all its WebSocket connections are dropped. Clients reconnect, and those reconnections go through the load balancer again — Round Robin distributes them to the surviving servers. This is the correct behaviour. You can't "migrate" WebSocket connections seamlessly, so you design the clients to handle reconnection gracefully.
>
> What I would NOT use: IP Hash, because of the corporate NAT problem I mentioned — all users from a large company would pile onto one server. Least Connections doesn't help much here either because WebSocket connections are long-lived and mostly idle (just maintaining heartbeats) — the connection count grows slowly and uniformly if you use Round Robin. The CPU and memory load per connection is what matters, not the connection duration.
>
> For SAP Labs' real-time financial dashboard (we used WebSocket for live P&L updates), we used NGINX with Round Robin, and clients had reconnection logic with exponential backoff. Server rolling deployments happened during off-hours (2 AM IST) to minimise the active connection count during disruption.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Least Connections is always better than Round Robin" | "I'd always use Least Connections — it's more intelligent" | "Least Connections has overhead: the load balancer must maintain an atomic connection counter per server and find the minimum on every request. For high-frequency, fast-completing requests (10,000 req/sec, each completing in 5ms), the connection counts are all near zero at all times — Least Connections and Round Robin produce identical distributions. Round Robin is faster (no counter lookup, just increment an index). Use Least Connections for services where request duration is measurably variable — otherwise Round Robin is the correct, lower-overhead choice." |
| "Add more servers and the load balancer solves everything" | "Just add servers and the load balancer distributes the load" | "The load balancer distributes load evenly (or by algorithm), but if the bottleneck is a shared resource — a single database, a shared Redis, a downstream API with a rate limit — adding more application servers doesn't help. All those servers will hit the same bottleneck harder. Load balancing solves the application-tier bottleneck. Identify WHERE the bottleneck is before adding servers: application CPU/memory → add app servers. Database connection pool exhausted → add connection pooling (PgBouncer) or read replicas. Downstream API rate limit → add caching layer." |

---

## 7. Hruday's Real Experience Hook

> "At Bosch, we built a real-time dashboard for factory sensor data. The backend was a cluster of WebSocket servers that each maintained thousands of concurrent sensor connections (sensor devices → WebSocket → backend). The original NGINX config used Round Robin for worker assignment, which worked well for the initial 1,000 sensors.
>
> As we scaled to 50,000 sensors, we noticed some WebSocket workers accumulating significantly more connections than others. The root cause: sensors reconnected at protocol restart events (firmware update on the sensor itself, averaging 10 seconds of reconnection storm), and the reconnection timing was correlated — an entire factory floor would restart simultaneously. Round Robin distributed the reconnection storm evenly, but some unlucky servers were already at higher load from previous connection accumulations. We switched to Least Connections for the reconnection routing (new WebSocket upgrade requests use Least Connections; ongoing open connections are unaffected). This caused reconnecting sensors to prefer less-loaded servers, smoothing the distribution within 2 minutes of a reconnection storm instead of the 15 minutes it took with Round Robin."

---

## 8. Scale Evolution

**1,000 users →** NGINX round-robin (default). 2-3 stateless backend instances. No algorithm tuning needed at this scale — any algorithm works.

**100,000 users →** Least Connections for API services with DB calls (query time varies). Round Robin for simple, fast-completing API calls. Weighted Round Robin if Kubernetes HPA has mixed instance sizes. AWS ALB with stickiness off (stateless services don't need it). Health check: `/actuator/health` with 200 threshold.

**10 million users →** Istio service mesh with Envoy proxy sidecar: Least Request (Envoy's term for Least Connections) per service, configured in DestinationRule CRD. Consistent hashing for distributed cache routing. NGINX Plus or Kong for L7 gateway with Least Response Time (tracks actual response latency, most intelligent). Load balancer algorithm is per-service — different for each based on its request-duration profile.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment processing: Least Connections (high variance — instant UPI vs complex EMI). Static APIs (merchant dashboard read): Round Robin. Webhook delivery: weighted Round Robin (some receivers are faster). Stuck transaction detection (long-running requests) at load balancer level. | "Razorpay's payment API has requests ranging from 20ms (UPI) to 3 seconds (EMI bank call). Which load balancing algorithm distributes load most evenly?" |
| Swiggy / Meesho | Order creation: Least Connections (DB query time varies by restaurant complexity). Static menu browsing: Round Robin (CDN-backed, uniform). Delivery tracking WebSocket: Round Robin for connection setup. Surge pricing calculation: weighted Round Robin (large ML servers get more traffic). | "Swiggy's order API takes between 50ms and 5 seconds depending on restaurant availability checks. Round Robin or Least Connections — which and why?" |
| Adobe / Microsoft | Creative Cloud rendering workers: Least Connections (small icon = 50ms, 8K poster = 30 seconds). Adobe Stock image search: Round Robin (search queries uniform). Microsoft Teams WebSocket: Round Robin for initial connection, consistent hashing for re-connections to same server. | "Adobe's PDF rendering service handles documents of 1 to 10,000 pages. The load balancer has 10 worker servers. Which algorithm prevents a few workers from getting all the long jobs?" |
| SAP Labs (current) | SAP CFIN report generation: Least Connections (simple summary = fast; detailed drill-down = slow DB join). SAP Fiori static resources: Round Robin (all similar). CFIN processing jobs: weighted Round Robin based on job complexity hint in request headers. | "SAP's financial reporting service generates simple P&L summaries (100ms) and detailed subledger reconciliation reports (45 seconds). The load balancer has 5 servers. Which algorithm?" |

---

## 10. Related Topics — What to Study Next

- **Topic 147 — Load Balancing L4 vs L7** — the "which layer" question (L4 or L7) determines what information is available to the routing algorithms; IP Hash at L4 uses client IP; cookie-based stickiness requires L7 (cookie inspection); understanding L4/L7 explains WHY some of these algorithms are only possible at L7
- **Topic 149 — Auto-Scaling Strategies** — load balancing distributes existing servers; auto-scaling adds/removes servers dynamically; when auto-scaling adds a server mid-traffic, the load balancer must add it to rotation and the algorithm must adapt — Least Connections handles new servers naturally (they start at 0 connections and get traffic quickly); Round Robin also handles new servers cleanly on the next cycle
- **Topic 146 — Stateless Services** — the choice of load balancing algorithm is much simpler for stateless services (Round Robin is always fine); for stateful services you need IP Hash or cookie stickiness; the lesson: invest in making services stateless so the load balancer algorithm doesn't matter as much, and any server can handle any request
- **Topic 135 — Rate Limiting** — Token Bucket and Leaky Bucket rate limiting algorithms, like load balancing algorithms, are per-endpoint policies applied at the load balancer or API gateway layer; understanding both rate limiting and load balancing algorithms together gives the full picture of how API traffic is controlled and distributed

---

*Part 8 · Load Balancing Algorithms · Full Stack Interview Guide · Hruday D · 2026*
