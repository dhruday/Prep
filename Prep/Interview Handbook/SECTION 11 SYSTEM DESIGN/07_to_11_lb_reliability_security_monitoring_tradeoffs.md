# Foundation 07 — Load Balancing

---

## Load Balancing Algorithms

### 1. Round Robin
```
Requests: R1, R2, R3, R4, R5, R6
Servers:  S1, S2, S3, S1, S2, S3  (cycles through)

Pros: Simple, even distribution (if servers equal)
Cons: Ignores server health/capacity
Use: Stateless services with equal capacity
```

### 2. Weighted Round Robin
```
S1 (weight 3): gets 3/6 = 50% of requests
S2 (weight 2): gets 2/6 = 33% of requests
S3 (weight 1): gets 1/6 = 17% of requests

Use: Servers with different capacities
```

### 3. Least Connections
```
Route to server with fewest active connections
Great for: Long-lived connections (WebSockets, streaming)
Cons: Requires tracking state (overhead)
```

### 4. IP Hash / Sticky Sessions
```
hash(client_IP) % N → same server always

Pros: Session affinity (stateful apps)
Cons: Uneven distribution, server removal breaks sessions
Use: Legacy stateful apps, WebSockets when no external session store
```

### 5. Consistent Hashing
```
Servers and keys hashed to same ring
Client request → nearest server clockwise

Pros: Adding/removing server → minimal remapping
Use: Distributed caches, CDN routing
```

### 6. Random Selection
```
Pick server randomly
Simple, surprisingly effective at scale (law of large numbers)
```

### 7. Resource-Based / Adaptive
```
Monitor CPU/memory of each server
Route to server with most available resources
Use: Heterogeneous workloads, cloud auto-scaling
```

---

## Load Balancer Layers

```
L4 (Transport Layer):
- Operates on TCP/UDP
- Routes based on IP + port
- Faster (no packet inspection)
- No content-based routing
- Examples: AWS NLB, HAProxy (TCP mode)

L7 (Application Layer):
- Operates on HTTP/HTTPS
- Routes based on URL, headers, cookies, content
- Can do SSL termination
- Can modify requests/responses
- Examples: AWS ALB, Nginx, Traefik, Envoy
```

**When L4 vs L7:**
```
L4: Raw TCP throughput (databases, message brokers, game servers)
L7: HTTP microservices, A/B testing, canary deploys, content routing
```

---

## Global Load Balancing

```
GeoDNS:
  User in US    → DNS resolves to US LB → US region
  User in India → DNS resolves to IN LB → India region
  
  Tools: Route53 (AWS), Cloud DNS (GCP), Cloudflare

Anycast (BGP-level):
  Same IP advertised from multiple locations
  User routes to geographically nearest PoP
  Used by: Cloudflare, Google, CDNs

Global Traffic Manager:
  Health-check aware
  Failover across regions automatically
  Tools: AWS Global Accelerator, Azure Traffic Manager
```

---

## Health Checks

```
Active health check (LB polls backend):
  GET /health → 200 OK (healthy)
              → timeout / 503 (unhealthy → remove from pool)

Passive health check (monitor real traffic):
  Track error rates per server
  If errors > threshold → mark unhealthy

Health check endpoint should check:
  - App is running
  - DB connection available
  - Cache connection available
  - Disk space available
  - NOT: complex business logic (too slow)
```

---

## High Availability Load Balancer Setup

```
Active-Active LB pair:
  LB1 (active) ─┐
                 ├─▶ Virtual IP (VIP) ─▶ App Servers
  LB2 (active) ─┘
  
  Both LBs serve traffic
  If LB1 fails: LB2 handles all traffic
  Floating VIP moves to healthy LB (VRRP/Keepalived)

Active-Passive:
  LB1 (active)  ─▶ VIP ─▶ App Servers
  LB2 (standby)  (takes over if LB1 fails)
```

---

# Foundation 08 — Reliability & Fault Tolerance

---

## Availability Patterns

### Redundancy
```
No single point of failure (SPOF)
Every component has at least one backup

N+1 redundancy: 1 spare per type
2N redundancy:  Full duplicate of everything
```

### Circuit Breaker Pattern
```
CLOSED state (normal):
  Requests flow through
  Track failure rate

OPEN state (circuit tripped):
  Failures exceeded threshold → circuit opens
  All requests fail fast (no waiting for timeout)
  Attempt recovery after cooldown

HALF-OPEN state (testing recovery):
  Let some requests through
  If success → close circuit
  If failure → open again

States:
CLOSED ──(failures > threshold)──▶ OPEN
  ▲                                  │
  └──(success)── HALF-OPEN ◀──(timeout)┘
```

```python
class CircuitBreaker:
    def __init__(self, threshold=5, timeout=60):
        self.failures = 0
        self.threshold = threshold
        self.state = "CLOSED"
        self.last_failure_time = None
        self.timeout = timeout
    
    def call(self, fn, *args):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "HALF-OPEN"
            else:
                raise CircuitOpenError("Circuit is open")
        
        try:
            result = fn(*args)
            if self.state == "HALF-OPEN":
                self.state = "CLOSED"
                self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.threshold:
                self.state = "OPEN"
            raise
```

### Bulkhead Pattern
```
Isolate resources per service (like ship bulkheads)
Prevent one service's failure from consuming all resources

Example: Separate thread pools per downstream service
  Payment pool:    20 threads
  Inventory pool:  10 threads
  
If Inventory service is slow:
  → Only Inventory pool exhausted
  → Payment pool unaffected
  → System degrades gracefully
```

### Retry Pattern with Backoff
```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(TransientError)
)
def call_service():
    return requests.get("http://service/api")

# Attempt 1: immediate
# Attempt 2: wait 1s
# Attempt 3: wait 2s
# Give up and propagate exception
```

### Timeout Pattern
```
Always set timeouts on:
  - HTTP client calls
  - DB queries
  - Cache operations
  - Message queue operations

Timeout hierarchy:
  Client timeout > Gateway timeout > Service timeout > DB timeout
  E.g.:   30s        25s              20s              15s

Without this: cascading timeouts, thread pool exhaustion
```

---

## Disaster Recovery

```
RTO (Recovery Time Objective):  Max acceptable downtime
RPO (Recovery Point Objective): Max acceptable data loss

RPO = 0:  Synchronous replication to standby (expensive)
RPO = 1h: Hourly backups restored on failure
RPO = 24h: Daily backups

RTO = 0:  Active-active (no failover needed)
RTO = 5m: Warm standby (pre-provisioned, quick cutover)
RTO = 1h: Cold standby (provision on failure)

Cost: Active-Active > Warm Standby > Cold Standby
```

### Disaster Recovery Strategies

```
1. Backup & Restore (cheapest)
   Hourly/daily snapshots to S3
   Restore on disaster: RTO hours, RPO hours

2. Pilot Light
   Minimal core infrastructure running
   Scale up on disaster: RTO 30-60 min

3. Warm Standby
   Scaled-down version always running
   Scale up on disaster: RTO 5-15 min

4. Active-Active (most expensive)
   Full production in multiple regions
   Traffic routed away on failure: RTO near-zero
```

---

# Foundation 09 — Security

---

## Authentication vs Authorization

```
Authentication: Who are you? (Identity)
Authorization:  What can you do? (Permissions)

AuthN → AuthZ → Access

Example:
  AuthN: "I am user@example.com (JWT token verified)"
  AuthZ: "user@example.com has READ permission on /api/reports/123"
```

## JWT (JSON Web Tokens)

```
Structure: header.payload.signature (Base64URL encoded)

Header:  {"alg": "HS256", "typ": "JWT"}
Payload: {"user_id": "123", "role": "admin", "exp": 1700000000}
Signature: HMAC-SHA256(header + "." + payload, secret)

Stateless: No DB lookup needed to verify (just verify signature)
Problem:   Cannot revoke before expiry (use short expiry + refresh tokens)

Access token:  Short-lived (15 min)
Refresh token: Long-lived (7-30 days), stored in DB for revocation
```

## OAuth 2.0 Flow

```
Authorization Code Flow (web apps):
1. User clicks "Login with Google"
2. App redirects to Google with client_id, redirect_uri, scope
3. User logs into Google, grants permission
4. Google redirects to app with authorization code
5. App exchanges code for access token (server-side, secure)
6. App uses access token for API calls

PKCE (for mobile/SPA):
  Same flow but uses code_verifier/code_challenge
  Prevents authorization code interception
```

## Rate Limiting Algorithms

```
1. Token Bucket (most common):
   Bucket holds N tokens
   Request consumes 1 token
   Tokens refill at rate R per second
   If empty → reject request
   
   Pros: Burst allowed, smooth average rate
   Used by: Most API gateways

2. Leaky Bucket:
   Queue requests (bucket)
   Process at fixed rate (leak)
   If bucket full → reject
   
   Pros: Smooth output rate
   Cons: Burst not allowed

3. Fixed Window Counter:
   Count requests per window (e.g., per minute)
   Window boundary problem: 100 at :59 + 100 at :01 = 200 in 2 sec
   
4. Sliding Window:
   Precise but memory-intensive
   Redis sorted set: ZADD with timestamp, ZREMRANGEBYSCORE, ZCARD

5. Sliding Window Counter:
   Hybrid: (previous_window_count × overlap%) + current_window_count
   Good approximation with O(1) memory
```

## API Security Best Practices

```
1. HTTPS everywhere (TLS 1.2+)
2. Input validation (whitelist, not blacklist)
3. Output encoding (prevent XSS)
4. Parameterized queries (prevent SQL injection)
5. Rate limiting (prevent abuse)
6. Authentication on every endpoint
7. Least privilege (users get minimal permissions)
8. Secrets in env vars / secret managers (never in code)
9. CORS configuration (restrict origins)
10. API versioning (deprecate, don't break)
```

---

# Foundation 10 — Monitoring & Observability

---

## The Three Pillars

```
Logs    → What happened?     (events, errors, audit trail)
Metrics → How is it doing?   (counters, gauges, histograms)
Traces  → Why did it happen? (distributed request tracing)
```

## Metrics

```
Counter:   Always increases (requests served, errors)
Gauge:     Current value (active connections, memory usage)
Histogram: Distribution (request duration buckets)
Summary:   Pre-computed quantiles (p50, p99 latency)

Key Metrics (USE Method):
  Utilization: CPU %, memory %, disk %
  Saturation:  Queue depth, wait time
  Errors:      Error rate, error count

Key Metrics (RED Method):
  Rate:    Requests per second
  Errors:  Error rate (%)
  Duration: p50, p95, p99 latency
```

## SLI / SLO / SLA

```
SLI (Service Level Indicator):
  Measurable metric that represents service health
  Examples: request success rate, latency p99, throughput

SLO (Service Level Objective):
  Target value for an SLI (internal goal)
  Examples: 99.9% success rate, p99 < 300ms

SLA (Service Level Agreement):
  External contract (legal/commercial)
  Usually SLA = SLO - buffer (e.g., SLO 99.9%, SLA 99.5%)

Error Budget:
  = 1 - SLO = allowed downtime
  SLO 99.9% → Error budget = 0.1% = 43.8 min/month
  If budget exhausted: freeze releases, focus on reliability
```

## Distributed Tracing

```
Request enters system → Trace ID assigned
Each service adds Span (start time, end time, metadata)

User Request → [Trace: abc123]
  API Gateway → [Span: 5ms]
    Auth Service → [Span: 10ms]
    User Service → [Span: 15ms]
      DB Query → [Span: 8ms]
    Cache Lookup → [Span: 1ms]

Tools: Jaeger, Zipkin, AWS X-Ray, Datadog APM
Standard: OpenTelemetry (vendor-neutral)
```

---

# Foundation 11 — Trade-Off Analysis

---

## The Trade-Off Framework

Every design decision has trade-offs. Use this structure:

```
Decision: [What you're choosing between]
Chosen:   [What you picked]
Reason:   [Why: specific to requirements]
Pros:     [Benefits of this choice]
Cons:     [Downsides you accept]
Mitigations: [How you reduce the cons]
Alternative: [What you'd pick if requirements changed]
```

## Common Trade-Off Pairs

| Trade-Off | Choose A When | Choose B When |
|-----------|--------------|--------------|
| SQL vs NoSQL | ACID needed, complex queries | Scale > consistency, flexible schema |
| Push vs Pull feed | Small fanout (<10K followers) | Large fanout (celebrities) |
| Sync vs Async | Immediate feedback needed | Decouple, handle load spikes |
| Strong vs Eventual consistency | Financial, inventory | Social, DNS, recommendations |
| Normalize vs Denormalize | Write-heavy, storage cost | Read-heavy, query performance |
| Build vs Buy | Core competency, control | Non-core, speed, cost |
| Monolith vs Microservices | Small team, early stage | Scale, independent deploys |
| CDN vs Origin | Static, cacheable content | Dynamic, personalized |
| Replication vs Sharding | Scale reads | Scale writes/storage |

## Latency vs Consistency
```
Example: User updates their Twitter bio

Option A (Strong consistency):
  Write to master → wait for all replicas → return success
  User sees new bio immediately on any read
  Cost: Higher latency (wait for replication), lower availability

Option B (Eventual consistency):
  Write to master → return success → replicate async
  User might see old bio for 1-2 seconds
  Cost: Stale reads possible

Decision for Twitter bio: Eventual consistency is fine.
  The user doesn't care if they see their old bio for 2 seconds.
  But: use "read-your-own-writes" so the user always sees THEIR latest bio.
```

## Cost vs Performance
```
Example: Serving YouTube videos

Option A: Serve all from origin servers
  Cost: Low (no CDN fees)
  Latency: High (all requests hit origin)
  
Option B: CDN for everything
  Cost: High (~$0.01-0.08 per GB)
  Latency: Low (edge nodes)
  
Decision: CDN for popular content (top 20% of videos = 80% of traffic)
          Origin for long-tail (rest)
          S3/GCS for storage (cheaper than CDN for cold content)
```

---

*All foundations complete. Next: System Design Problems*
