# 46. Why Load Balancers

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is a Load Balancer?

A **Load Balancer** is a critical component that **distributes incoming network traffic across multiple backend servers** to ensure:

- **High Availability**: If one server fails, traffic is routed to healthy servers
- **Scalability**: Add more servers to handle increased load
- **Performance**: Distribute load evenly to prevent server overload
- **Fault Tolerance**: Automatic failover when servers become unhealthy

**Real-World Analogy**: 
Think of a busy airport with multiple check-in counters. Instead of everyone queuing at one counter (single server), an airport staff member (load balancer) directs passengers to available counters based on queue length and counter status.

### Why Do We Need Load Balancers?

**Without Load Balancer**:
```
Client → Single Server (192.168.1.10)

Problems:
- Single Point of Failure (SPOF)
- Limited capacity (e.g., 1000 req/s)
- No redundancy
- Downtime during deployments
```

**With Load Balancer**:
```
                    ┌──→ Server1 (192.168.1.10)
                    │
Client → Load Balancer ──→ Server2 (192.168.1.11)
                    │
                    └──→ Server3 (192.168.1.12)

Benefits:
- 3x capacity (3000 req/s)
- Redundancy (2 servers can handle load if 1 fails)
- Zero-downtime deployments (rolling updates)
- Better resource utilization
```

### Key Problems Load Balancers Solve

1. **Single Point of Failure**: Eliminate dependency on one server
2. **Scaling Bottleneck**: Add servers horizontally without client changes
3. **Uneven Load Distribution**: Prevent hot spots where one server is overloaded
4. **Zero-Downtime Deployments**: Route traffic away from servers being updated
5. **Geographic Distribution**: Route users to nearest datacenter

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### Load Balancer Architecture

**Typical Deployment**:
```
Internet
   ↓
Firewall/WAF
   ↓
External Load Balancer (Public IP: 203.0.113.10)
   ↓
   ├──→ Web Server 1 (10.0.1.10)
   ├──→ Web Server 2 (10.0.1.11)
   └──→ Web Server 3 (10.0.1.12)
        ↓
Internal Load Balancer (10.0.2.5)
        ↓
        ├──→ API Server 1 (10.0.2.10)
        ├──→ API Server 2 (10.0.2.11)
        └──→ API Server 3 (10.0.2.12)
             ↓
        Database Cluster
```

### Load Balancer Types by Deployment

#### 1. Hardware Load Balancers
**Examples**: F5 BIG-IP, Citrix NetScaler, A10 Networks

**Characteristics**:
- Physical appliances with dedicated hardware
- Very high throughput (1M+ concurrent connections)
- Advanced features (SSL offloading, WAF, DDoS protection)
- Expensive ($10K-$100K+)
- Vendor lock-in

**When to Use**:
- Enterprise environments with budget
- Require 10+ Gbps throughput
- Need hardware-backed SLAs
- Regulatory compliance (certified hardware)

#### 2. Software Load Balancers
**Examples**: NGINX, HAProxy, Envoy, Traefik

**Characteristics**:
- Run on commodity hardware/VMs
- Cost-effective (free or open-source)
- Flexible configuration
- Easier to scale (just add more instances)
- Cloud-native

**When to Use**:
- Modern cloud architectures
- Microservices (Service Mesh)
- Cost-conscious startups
- DevOps-driven environments

#### 3. Cloud Load Balancers
**Examples**: AWS ELB/ALB/NLB, GCP Cloud Load Balancing, Azure Load Balancer

**Characteristics**:
- Fully managed (no infrastructure to maintain)
- Auto-scaling (handles traffic spikes automatically)
- Pay-per-use pricing
- Integration with cloud services
- Global distribution

**When to Use**:
- Cloud-first organizations
- Variable traffic patterns
- Need global presence
- Want to avoid operational overhead

### Load Balancer Placement

#### External Load Balancer (Internet-Facing)
```
Client → [External LB] → Web Tier
```
- Public IP address
- SSL termination
- DDoS protection
- Geographic routing

#### Internal Load Balancer (Private Network)
```
Web Tier → [Internal LB] → API Tier → [Internal LB] → Database Tier
```
- Private IP address
- East-west traffic (service-to-service)
- No SSL overhead (optional within VPC)
- Lower latency

### Health Checks

Load balancers continuously monitor server health:

**Health Check Types**:

1. **TCP Health Check** (Basic connectivity)
```bash
# Check if port 80 is open
telnet 10.0.1.10 80
# If connection succeeds → Healthy
# If connection fails → Unhealthy
```

2. **HTTP Health Check** (Application-level)
```bash
GET /health HTTP/1.1
Host: 10.0.1.10

Expected Response: 200 OK
Body: {"status": "healthy"}
```

3. **Custom Script Health Check**
```python
# /health endpoint in Flask
@app.route('/health')
def health_check():
    # Check database connection
    if not db.is_connected():
        return jsonify({"status": "unhealthy"}), 503
    
    # Check critical dependencies
    if not redis.ping():
        return jsonify({"status": "unhealthy"}), 503
    
    return jsonify({"status": "healthy"}), 200
```

**Health Check Configuration**:
```yaml
health_check:
  endpoint: /health
  interval: 10s          # Check every 10 seconds
  timeout: 5s            # Wait max 5 seconds for response
  healthy_threshold: 2   # 2 consecutive successes → mark healthy
  unhealthy_threshold: 3 # 3 consecutive failures → mark unhealthy
```

**State Transition**:
```
Healthy Server
   ↓ (3 failed health checks)
Unhealthy Server (traffic stopped)
   ↓ (2 successful health checks)
Healthy Server (traffic resumed)
```

### Connection Draining

When removing a server from the pool (deployment, scaling down):

**Without Connection Draining**:
```
Server marked unhealthy → All connections immediately dropped → Users see errors
```

**With Connection Draining**:
```
1. Server marked "draining" (no NEW connections)
2. Existing connections continue (timeout: 300s)
3. After timeout or all connections closed → Server removed
```

**NGINX Configuration**:
```nginx
upstream backend {
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080 down;  # Gracefully drained
}

# Connection draining
keepalive_timeout 300s;
```

### Session Persistence (Sticky Sessions)

**Problem**: User's session stored on Server1, but next request routed to Server2
```
Request 1 → Server1 (session created: session_id=abc123)
Request 2 → Server2 (session not found: 404 error)
```

**Solutions**:

1. **IP Hash** (route same IP to same server)
2. **Cookie-Based** (load balancer sets cookie with server ID)
3. **Session Replication** (share sessions across servers)
4. **Centralized Session Store** (Redis, DynamoDB)

**Recommendation**: Use centralized session store (stateless servers).

---

## 3. Capacity Planning & Estimation (When Applicable)

### Scenario: E-Commerce Platform

**Requirements**:
- 1 million Daily Active Users (DAU)
- Peak traffic: 5x average (Black Friday, Cyber Monday)
- Each user: 20 requests/day on average
- Average response time target: < 200ms
- Availability target: 99.95%

### Step 1: Calculate RPS

**Average RPS**:
```
Total requests/day = 1M users × 20 requests = 20M requests/day
Seconds per day = 86,400
Average RPS = 20M / 86,400 ≈ 231.5 RPS
```

**Peak RPS**:
```
Peak RPS = 231.5 × 5 = 1,157.5 RPS ≈ 1,200 RPS
```

### Step 2: Single Server Capacity

**Benchmarking** (Node.js + Express):
```bash
# Use Apache Bench
ab -n 10000 -c 100 http://localhost:3000/api/products

Results:
- Requests per second: 400 RPS
- Average latency: 250ms
- 95th percentile: 450ms
```

**Single Server Capacity**: 400 RPS (with latency < 500ms)

### Step 3: Calculate Server Count

**Servers Needed**:
```
Servers = Peak RPS / (Server Capacity × Safety Factor)
Safety Factor = 0.7 (use 70% of max capacity)

Servers = 1,200 / (400 × 0.7)
        = 1,200 / 280
        ≈ 4.3 servers

Round up: 5 servers
```

**With N+1 Redundancy**:
```
Total Servers = 5 + 1 (redundancy) = 6 servers
```

### Step 4: Load Balancer Sizing

**Load Balancer Requirements**:
- Handle 1,200 RPS
- 10,000 concurrent connections (estimate: 10 conn per RPS)
- SSL termination (adds CPU overhead)

**NGINX Capacity** (single instance on 4 CPU, 8 GB RAM):
- 10,000-50,000 RPS (depending on complexity)
- 100,000+ concurrent connections

**Recommendation**: 2 NGINX instances (active-passive for HA)

### Step 5: Bandwidth Calculation

**Average Request/Response Size**:
- Request: 1 KB (headers + small body)
- Response: 10 KB (HTML/JSON)
- Total per request: 11 KB

**Bandwidth**:
```
Bandwidth = RPS × Data per request
Average = 231.5 RPS × 11 KB = 2.5 MB/s = 20 Mbps
Peak = 1,200 RPS × 11 KB = 13.2 MB/s = 105 Mbps
```

**Network Interface**: 1 Gbps NIC sufficient (with headroom)

### Step 6: Cost Estimation (AWS)

**Load Balancer** (Application Load Balancer):
- ALB: $0.0225/hour = $16.20/month
- LCU (Load Balancer Capacity Units): $0.008/hour per LCU
- Estimated LCUs: 5 (for 1,200 RPS)
- LCU Cost: $0.008 × 5 × 730 hours = $29.20/month
- **Total ALB Cost**: $45.40/month

**Backend Servers** (EC2 t3.medium: 2 vCPU, 4 GB RAM):
- 6 servers × $0.0416/hour = $0.2496/hour
- Monthly: $0.2496 × 730 = $182.21/month
- **Total Server Cost**: $182.21/month

**Data Transfer**:
- Outbound: 13.2 MB/s × 3,600 s/hr × 24 hr × 30 days = 102 TB/month
- First 10 TB: $0.09/GB = $900
- Next 40 TB: $0.085/GB = $3,400
- Next 52 TB: $0.07/GB = $3,640
- **Total Bandwidth Cost**: $7,940/month

**Total Monthly Cost**:
```
ALB:         $45.40
Servers:     $182.21
Bandwidth:   $7,940.00
─────────────────────
TOTAL:       $8,167.61/month
```

**Cost Optimization**:
- Use CDN for static content (reduce bandwidth by 70%)
- Reserved Instances for servers (40% savings)
- Autoscaling (scale down during off-peak)

### Availability Calculation

**Single Server Availability**: 99.9% (8.76 hours downtime/year)

**With Load Balancer + 6 Servers**:
```
Availability = 1 - (Probability all servers down simultaneously)
If each server 99.9% available:
P(server down) = 0.001

P(all 6 servers down) = 0.001^6 = 1×10^-18 (negligible)

But load balancer itself can fail:
LB Availability = 99.99% (with active-passive setup)

Total Availability ≈ 99.99% (52.6 minutes downtime/year)
```

---

## 4. Data & Storage Design

### Load Balancer State Management

**Stateless Load Balancing** (Preferred):
```
Client Request → LB (no state stored) → Server
```
- LB doesn't store session data
- Scales horizontally (add more LB instances)
- Fast failover (any LB can handle any request)

**Stateful Load Balancing**:
```
Client Request → LB (stores session mapping) → Server
```
- LB stores: `session_id → server_id` mapping
- Problem: LB becomes bottleneck
- Failover complex (state must be replicated)

### Session Storage Options

#### Option 1: Server-Side Sessions (Anti-Pattern)
```javascript
// Express.js with in-memory sessions
app.use(session({
  store: new MemoryStore(),  // ❌ Lost on server restart
  secret: 'secret',
  resave: false
}));
```
**Problem**: Sessions not shared across servers

#### Option 2: Sticky Sessions
```nginx
upstream backend {
    ip_hash;  # Same client IP → same server
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
}
```
**Problem**: Uneven load distribution, server failure loses sessions

#### Option 3: Centralized Session Store (Recommended)
```javascript
// Express.js with Redis sessions
const RedisStore = require('connect-redis')(session);
const redisClient = require('redis').createClient();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));
```

**Architecture**:
```
                    ┌──→ Server1 ──┐
                    │               ↓
Client → Load Balancer ──→ Server2 ──→ Redis (sessions)
                    │               ↑
                    └──→ Server3 ──┘
```

**Redis Session Data**:
```json
{
  "session:abc123": {
    "user_id": 42,
    "email": "user@example.com",
    "cart": [101, 203, 405],
    "expires_at": "2026-02-16T10:00:00Z"
  }
}
```

### Health Check Endpoints

**Database Schema** (optional, for advanced health checks):
```sql
CREATE TABLE health_status (
    server_id VARCHAR(50) PRIMARY KEY,
    status VARCHAR(20),  -- 'healthy', 'unhealthy', 'draining'
    last_check_at TIMESTAMP,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    active_connections INT
);

-- Load balancer queries this table
SELECT server_id FROM health_status 
WHERE status = 'healthy' 
  AND cpu_usage < 80 
  AND memory_usage < 85;
```

---

## 5. Scalability, Reliability & Fault Tolerance

### High Availability Patterns

#### Active-Passive Load Balancers
```
Primary LB (Active) ──┐
                      ├──→ Backend Servers
Secondary LB (Passive)┘
       ↑
   (Heartbeat)
```

**Failover Process**:
1. Primary LB sends heartbeat every 5s
2. Secondary monitors heartbeat
3. If 3 consecutive heartbeats missed (15s) → Secondary takes over
4. Virtual IP (VIP) moved to Secondary
5. DNS/Anycast routes traffic to new Primary

**VRRP (Virtual Router Redundancy Protocol)**:
```bash
# Primary LB (keepalived config)
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100  # Higher priority = Primary
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass secret123
    }
    virtual_ipaddress {
        203.0.113.10  # VIP shared by both LBs
    }
}
```

#### Active-Active Load Balancers
```
Primary LB ─┐
            ├──→ Backend Servers
Secondary LB┘
```
- Both LBs handle traffic simultaneously
- DNS round-robin or Anycast IP
- 2x capacity (no wasted resources)
- Automatic failover (1 LB handles all if other fails)

### Handling Server Failures

**Scenario**: Server2 crashes during request processing

**Without Connection Draining**:
```
Client → LB → Server2 (crashes) → Client sees 502 Bad Gateway
```

**With Retry Logic**:
```
Client → LB → Server2 (crashes) 
              ↓ (LB detects failure)
          Server1 (retry) → Success
```

**NGINX Retry Configuration**:
```nginx
upstream backend {
    server 10.0.1.10:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=30s;
}

location / {
    proxy_pass http://backend;
    proxy_next_upstream error timeout http_502 http_503 http_504;
    proxy_next_upstream_tries 3;
    proxy_next_upstream_timeout 10s;
}
```

### Disaster Recovery

**Multi-Region Deployment**:
```
                    Global Load Balancer (Route 53, Cloudflare)
                                  │
            ┌─────────────────────┼─────────────────────┐
            ↓                     ↓                     ↓
    US-East Region        US-West Region        EU Region
    (Primary)             (Hot Standby)         (Hot Standby)
         │                     │                     │
    Regional LB           Regional LB           Regional LB
         │                     │                     │
    ┌────┼────┐           ┌────┼────┐           ┌────┼────┐
Server1 Server2       Server3 Server4       Server5 Server6
```

**DNS-Based Failover** (AWS Route 53):
```json
{
  "Name": "api.example.com",
  "Type": "A",
  "SetIdentifier": "US-East",
  "Failover": "PRIMARY",
  "HealthCheckId": "abc123",
  "TTL": 60,
  "ResourceRecords": [{"Value": "203.0.113.10"}]
}
```

---

## 6. Security, APIs & Governance

### DDoS Protection

Load balancers provide first line of defense:

**Rate Limiting**:
```nginx
limit_req_zone $binary_remote_addr zone=one:10m rate=100r/m;

server {
    location /api/ {
        limit_req zone=one burst=20 nodelay;
        proxy_pass http://backend;
    }
}
```

**Connection Limits**:
```nginx
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    limit_conn addr 10;  # Max 10 concurrent connections per IP
}
```

**SYN Flood Protection** (Linux kernel):
```bash
# Enable SYN cookies
sysctl -w net.ipv4.tcp_syncookies=1

# Reduce SYN queue size
sysctl -w net.ipv4.tcp_max_syn_backlog=2048
```

### SSL/TLS Termination

**SSL Offloading at Load Balancer**:
```
Client ─(HTTPS)─→ Load Balancer ─(HTTP)─→ Backend Servers
```

**Benefits**:
- Reduce CPU load on backend servers (SSL encryption expensive)
- Centralized certificate management
- Backend servers focus on application logic

**NGINX SSL Configuration**:
```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # SSL session cache (reduce handshake overhead)
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://backend;
    }
}
```

### IP Whitelisting

```nginx
# Allow only specific IPs
geo $allowed_ip {
    default 0;
    10.0.0.0/8 1;        # Internal network
    203.0.113.0/24 1;    # Partner network
}

server {
    if ($allowed_ip = 0) {
        return 403;
    }
    
    location / {
        proxy_pass http://backend;
    }
}
```

---

## 7. Real-World Examples & Case Studies

### Netflix

**Scale**:
- 200+ million subscribers globally
- 1+ billion requests per day to API
- Peak traffic: 15% of global internet bandwidth

**Load Balancing Strategy**:
- **Zuul** (custom API Gateway based on NGINX)
- **ELB** (AWS Elastic Load Balancing) for regional distribution
- **Route 53** for global DNS-based load balancing
- **Client-side load balancing** (Ribbon library in Spring Cloud)

**Architecture**:
```
Client → Route 53 (geo-routing) 
          → Regional ELB 
            → Zuul Gateway 
              → Eureka (service discovery) 
                → Microservices
```

**Key Insight**: Netflix uses **3 layers** of load balancing:
1. Global (Route 53)
2. Regional (ELB)
3. Service-level (Ribbon client-side)

### Amazon

**Black Friday 2025**:
- 10+ billion requests during peak hours
- 100,000+ requests per second
- 99.99% uptime maintained

**Load Balancing**:
- **Application Load Balancer (ALB)** for HTTP/HTTPS traffic
- **Network Load Balancer (NLB)** for TCP traffic (databases, internal services)
- **Auto Scaling Groups** (ASG) automatically add/remove servers

**Key Feature**: **Target Groups** with weighted routing
```
80% traffic → New version (v2)
20% traffic → Old version (v1)  # Canary deployment
```

### Google Search

**Scale**:
- 8.5 billion searches per day
- 99,000 searches per second on average

**Load Balancing**:
- **Google Cloud Load Balancing** (Maglev)
- **Anycast IP** (same IP address, routed to nearest datacenter)
- **Consistent hashing** for distributed caching

**Latency**:
- 95th percentile: < 200ms (including network, search, rendering)
- Load balancer overhead: < 1ms

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Why do we need load balancers?"

**Structured Answer**:

**"Load balancers solve 5 critical problems in distributed systems:**

1. **High Availability**: Eliminate single point of failure. If one server crashes, load balancer routes traffic to healthy servers automatically.

2. **Horizontal Scalability**: Add more servers without changing client code. Load balancer abstracts backend topology.

3. **Even Load Distribution**: Prevent hot spots. Round-robin, least connections, or weighted algorithms distribute traffic fairly.

4. **Zero-Downtime Deployments**: Use rolling updates. Deploy new version to Server1, then Server2, etc., while load balancer routes around updating servers.

5. **Performance Optimization**: SSL termination, connection pooling, caching at load balancer reduce backend load.

**Real-world example**: At Netflix, Zuul handles 1+ billion requests/day across 1000+ microservices, with automatic failover when services go down."

---

### Follow-Up 1: "What happens if the load balancer itself fails?"

**Answer**:

"Great question! Load balancer becomes a single point of failure if not handled correctly. Solutions:

1. **Active-Passive Setup**: 
   - Primary LB handles traffic
   - Secondary LB monitors Primary via heartbeat
   - If Primary fails, Secondary takes over Virtual IP (VRRP)
   - Failover time: 5-15 seconds

2. **Active-Active Setup**:
   - Both LBs handle traffic simultaneously
   - DNS round-robin or Anycast IP
   - If one fails, other continues (no downtime)

3. **Cloud-Managed LBs**:
   - AWS ALB, GCP Load Balancing are highly available by design
   - AWS SLA: 99.99% uptime
   - Cloud provider handles redundancy

**Trade-off**: Active-Passive wastes 50% resources but simpler. Active-Active uses all resources but complex coordination."

---

### Follow-Up 2: "How does the load balancer know if a server is healthy?"

**Answer**:

"Load balancers use **health checks**:

1. **TCP Health Check** (Layer 4):
   - Try to establish TCP connection on port 80/443
   - If connection succeeds → Healthy
   - Fast but shallow (port open doesn't mean app working)

2. **HTTP Health Check** (Layer 7):
   - Send `GET /health` request
   - Expect `200 OK` response
   - Can check application logic (database connectivity, dependencies)

3. **Health Check Configuration**:
   ```
   Interval: 10s (check every 10 seconds)
   Timeout: 5s (wait max 5 seconds for response)
   Healthy Threshold: 2 (2 consecutive successes → mark healthy)
   Unhealthy Threshold: 3 (3 consecutive failures → mark unhealthy)
   ```

**Example `/health` endpoint**:
```python
@app.route('/health')
def health():
    if not db.ping():
        return jsonify({"status": "unhealthy"}), 503
    return jsonify({"status": "healthy"}), 200
```

**State transitions**:
- Healthy → (3 failures) → Unhealthy (traffic stopped)
- Unhealthy → (2 successes) → Healthy (traffic resumed)"

---

### Follow-Up 3: "Load balancer vs API Gateway—what's the difference?"

**Answer**:

**Load Balancer**:
- **Purpose**: Distribute traffic across multiple servers
- **Layer**: Layer 4 (TCP) or Layer 7 (HTTP)
- **Features**: Health checks, SSL termination, connection pooling
- **Example**: NGINX, HAProxy, AWS ELB

**API Gateway**:
- **Purpose**: Single entry point for microservices
- **Layer**: Layer 7 (application logic)
- **Features**: 
  - Request routing (`/users/*` → User Service)
  - Authentication (JWT validation)
  - Rate limiting
  - Request aggregation (BFF pattern)
  - Protocol translation (REST → gRPC)
- **Example**: Kong, AWS API Gateway, Netflix Zuul

**Relationship**:
```
Client → API Gateway (authentication, routing) 
          → Load Balancer (distribute to servers) 
            → Backend Servers
```

**In practice**: Use **both**. API Gateway for application logic, Load Balancer for traffic distribution."

---

### Follow-Up 4: "How do you handle sticky sessions with load balancers?"

**Answer**:

"Sticky sessions ensure user's requests always go to same server. **4 approaches**:

1. **IP Hash** (Source IP-based routing):
   ```
   hash(client_ip) % server_count → server_id
   ```
   - **Pro**: Simple, no state needed
   - **Con**: Uneven distribution (many users behind NAT share same IP)

2. **Cookie-Based** (LB sets cookie with server ID):
   ```
   Response: Set-Cookie: LB_SERVER=server2
   Next Request: Cookie: LB_SERVER=server2 → routes to Server2
   ```
   - **Pro**: Precise routing
   - **Con**: Clients must support cookies

3. **Session Replication** (Share sessions across servers):
   - All servers have copy of all sessions
   - **Con**: High overhead, complex synchronization

4. **Centralized Session Store** (Redis/DynamoDB) ✅ **Recommended**:
   ```
   Server1/2/3 → Redis (shared sessions)
   ```
   - **Pro**: Stateless servers, no sticky sessions needed
   - **Con**: Network hop to Redis (1-5ms latency)

**Best practice**: Use **centralized session store** and make servers **stateless**. Avoid sticky sessions—they complicate scaling and failover."

---

### Follow-Up 5: "What's the difference between Layer 4 and Layer 7 load balancing?"

**Answer**:

| Aspect | Layer 4 (Transport) | Layer 7 (Application) |
|--------|---------------------|----------------------|
| **Works at** | TCP/UDP level | HTTP/HTTPS level |
| **Routing based on** | IP address + Port | URL, Headers, Cookies |
| **Example** | Route TCP connection to `10.0.1.10:8080` | Route `/api/users` to User Service |
| **Performance** | Faster (no payload inspection) | Slower (parses HTTP) |
| **Features** | Basic (health checks, connection pooling) | Advanced (routing rules, SSL termination) |
| **Tools** | HAProxy, AWS NLB | NGINX, AWS ALB, Envoy |

**Layer 4 Example**:
```
Client:192.168.1.100:54321 → LB:203.0.113.10:80 
  → Server:10.0.1.10:8080 (based only on IP+port)
```

**Layer 7 Example**:
```
GET /api/users → User Service (10.0.1.10)
GET /api/products → Product Service (10.0.1.11)
GET /api/orders → Order Service (10.0.1.12)
```

**When to use**:
- **Layer 4**: TCP/UDP traffic (databases, internal microservices), need max performance
- **Layer 7**: HTTP traffic, need content-based routing, SSL termination"

---

## 9. Pseudocode / Diagrams (When Applicable)

### Basic Load Balancer Implementation (Round-Robin)

```python
class LoadBalancer:
    def __init__(self, servers):
        self.servers = servers  # List of server addresses
        self.current_index = 0
        self.lock = threading.Lock()
    
    def get_next_server(self):
        """Round-robin server selection"""
        with self.lock:
            server = self.servers[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.servers)
            return server
    
    def handle_request(self, request):
        """Main request handling logic"""
        max_retries = 3
        
        for attempt in range(max_retries):
            server = self.get_next_server()
            
            try:
                # Forward request to backend server
                response = self.forward_request(server, request)
                return response
            
            except ServerUnavailableError:
                # Server failed, mark unhealthy and retry
                self.mark_unhealthy(server)
                
                if attempt == max_retries - 1:
                    raise LoadBalancerError("All servers unavailable")
                
                continue  # Try next server
    
    def forward_request(self, server, request):
        """Forward HTTP request to backend server"""
        conn = http.client.HTTPConnection(server, timeout=5)
        
        try:
            conn.request(request.method, request.path, 
                        body=request.body, headers=request.headers)
            response = conn.getresponse()
            
            return {
                "status": response.status,
                "headers": response.headers,
                "body": response.read()
            }
        
        except (socket.timeout, ConnectionRefusedError):
            raise ServerUnavailableError(f"Server {server} unavailable")
        
        finally:
            conn.close()
    
    def mark_unhealthy(self, server):
        """Remove unhealthy server from pool"""
        if server in self.servers:
            self.servers.remove(server)
            print(f"Server {server} marked unhealthy")
            
            # Schedule health check to re-add server
            threading.Timer(30.0, self.health_check, args=[server]).start()
    
    def health_check(self, server):
        """Check if server is back online"""
        try:
            conn = http.client.HTTPConnection(server, timeout=5)
            conn.request("GET", "/health")
            response = conn.getresponse()
            
            if response.status == 200:
                self.servers.append(server)
                print(f"Server {server} marked healthy")
        
        except:
            # Still unhealthy, check again in 30s
            threading.Timer(30.0, self.health_check, args=[server]).start()

# Usage
lb = LoadBalancer(servers=["10.0.1.10:8080", "10.0.1.11:8080", "10.0.1.12:8080"])

# Handle incoming request
request = HttpRequest(method="GET", path="/api/users", headers={}, body=None)
response = lb.handle_request(request)
```

### Health Check Worker

```python
import time
import requests
from concurrent.futures import ThreadPoolExecutor

class HealthCheckWorker:
    def __init__(self, servers, interval=10, timeout=5):
        self.servers = servers
        self.interval = interval  # Check every 10 seconds
        self.timeout = timeout
        self.health_status = {server: True for server in servers}
    
    def start(self):
        """Start health check worker in background"""
        with ThreadPoolExecutor(max_workers=len(self.servers)) as executor:
            while True:
                # Check all servers in parallel
                executor.map(self.check_server, self.servers)
                time.sleep(self.interval)
    
    def check_server(self, server):
        """Perform health check on single server"""
        try:
            response = requests.get(
                f"http://{server}/health",
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("status") == "healthy":
                    self.mark_healthy(server)
                else:
                    self.mark_unhealthy(server)
            else:
                self.mark_unhealthy(server)
        
        except (requests.Timeout, requests.ConnectionError):
            self.mark_unhealthy(server)
    
    def mark_healthy(self, server):
        if not self.health_status[server]:
            print(f"✅ Server {server} is now HEALTHY")
            self.health_status[server] = True
    
    def mark_unhealthy(self, server):
        if self.health_status[server]:
            print(f"❌ Server {server} is now UNHEALTHY")
            self.health_status[server] = False

# Usage
worker = HealthCheckWorker(
    servers=["10.0.1.10:8080", "10.0.1.11:8080"],
    interval=10,
    timeout=5
)
worker.start()
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
              ┌──────────────────────┐
              │  DNS / Route 53      │ (Geo-routing)
              │  api.example.com     │
              └──────────┬───────────┘
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Region  │    │ Region  │    │ Region  │
    │ US-East │    │ US-West │    │ EU      │
    └────┬────┘    └────┬────┘    └────┬────┘
         │              │              │
         ↓              ↓              ↓
    ┌─────────────────────────────────────┐
    │   Load Balancer (Active-Passive)    │
    │  ┌──────────┐      ┌──────────┐    │
    │  │ Primary  │◄────►│Secondary │    │ (VRRP Heartbeat)
    │  │ (Active) │      │(Standby) │    │
    │  └─────┬────┘      └──────────┘    │
    │        │                            │
    │        │ Virtual IP: 203.0.113.10   │
    └────────┼────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
      ↓             ↓
┌──────────┐  ┌──────────┐
│Health    │  │Connection│
│Checker   │  │Pool      │
└──────────┘  └──────────┘
      │             │
      ↓             ↓
┌──────────────────────────────────┐
│    Backend Server Pool           │
│  ┌─────────┐  ┌─────────┐       │
│  │Server 1 │  │Server 2 │ ...   │
│  │10.0.1.10│  │10.0.1.11│       │
│  └────┬────┘  └────┬────┘       │
└───────┼────────────┼─────────────┘
        │            │
        └─────┬──────┘
              ↓
      ┌──────────────┐
      │    Redis     │ (Session Store)
      │ (Centralized)│
      └──────────────┘
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Load Balancers Are Essential

1. **Eliminate Single Point of Failure**: One server crash doesn't bring down entire system
2. **Enable Horizontal Scaling**: Add servers to handle growth without architectural changes
3. **Improve User Experience**: Even load distribution → consistent latency for all users
4. **Zero-Downtime Deployments**: Rolling updates without service interruption
5. **Cost Optimization**: Right-size infrastructure, scale up/down based on traffic

### How Load Balancers Work

**3-Step Process**:

1. **Receive Request**: Client sends request to load balancer's public IP
2. **Select Server**: Algorithm (round-robin, least connections) chooses healthy backend server
3. **Forward & Return**: Request forwarded to server, response returned to client

**Key Components**:
- **Health Checks**: Continuously monitor server availability (every 10s)
- **Connection Pooling**: Reuse TCP connections to reduce overhead
- **SSL Termination**: Decrypt at LB, forward plain HTTP to backend (reduce CPU load)
- **Session Persistence**: Optional sticky sessions for stateful applications

### When to Implement

**Critical Thresholds**:
- **Traffic**: > 500 RPS (single server becomes bottleneck)
- **Availability**: Need > 99.9% uptime (SLA requires redundancy)
- **Team Size**: > 5 engineers deploying (need zero-downtime deployments)
- **Geographic Distribution**: Users in multiple continents (need regional LBs)

### Trade-offs

| Aspect | Without LB | With LB |
|--------|-----------|---------|
| **Cost** | $50/month (1 server) | $250/month (LB + 3 servers) |
| **Latency** | 50ms | 55ms (5ms LB overhead) |
| **Availability** | 99.9% (8.76 hr downtime/year) | 99.99% (52.6 min downtime/year) |
| **Complexity** | Simple (1 server) | Complex (LB config, health checks) |
| **Max RPS** | 500 RPS | 1,500 RPS (3x servers) |

### Production Checklist

- [ ] Deploy active-passive load balancers (eliminate SPOF)
- [ ] Configure health checks (HTTP `/health` endpoint, 10s interval)
- [ ] Enable connection draining (300s timeout for graceful shutdown)
- [ ] Use centralized session store (Redis, DynamoDB—avoid sticky sessions)
- [ ] SSL termination at LB (reduce backend CPU load)
- [ ] Set up monitoring (LB metrics: RPS, latency, error rate)
- [ ] Rate limiting (prevent DDoS, 100-1000 req/min per IP)
- [ ] Multi-region deployment (Route 53 geo-routing for global users)

### Bottom Line

**Load balancers are the foundation of scalable, highly available systems.** They're not optional for production—they're the first component you add when moving from single server to distributed architecture. Start with cloud-managed LBs (AWS ALB, GCP Load Balancing) to avoid operational overhead, then migrate to self-managed (NGINX, HAProxy) only if cost or control justifies the complexity.

**Netflix lesson**: "We run 1+ billion requests/day through Zuul (our load balancer). Without it, our 1000+ microservices would be chaos. Load balancing isn't infrastructure—it's the nervous system of distributed systems."

