# 48. Load Balancing Algorithms

---

## 1. High-Level Explanation (Interview-Level Overview)

### What Are Load Balancing Algorithms?

**Load balancing algorithms** determine how a load balancer distributes incoming requests across backend servers. The goal is to:

- **Distribute load evenly** (prevent hot spots)
- **Maximize throughput** (use all servers efficiently)
- **Minimize latency** (route to least loaded server)
- **Maintain session consistency** (sticky sessions when needed)

### Common Algorithms

| Algorithm | How It Works | Use Case |
|-----------|-------------|----------|
| **Round Robin** | Cycle through servers sequentially | Servers have equal capacity |
| **Weighted Round Robin** | Cycle with weights (more requests to powerful servers) | Servers have different capacity |
| **Least Connections** | Route to server with fewest active connections | Long-lived connections (WebSockets) |
| **Least Response Time** | Route to server with fastest response | Heterogeneous servers |
| **IP Hash** | Hash client IP → consistent server | Stateful applications |
| **Random** | Random server selection | Simple, works surprisingly well |

### Real-World Analogy

Imagine a busy restaurant with multiple chefs:

- **Round Robin**: Waiter gives orders to Chef 1, Chef 2, Chef 3, Chef 1, Chef 2... in sequence
- **Least Connections**: Waiter gives order to chef with fewest current orders
- **IP Hash**: Customer from table 5 always assigned to Chef 2 (consistency)
- **Weighted**: Master chef gets 2x orders because they're faster

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Round Robin

**Algorithm**:
```python
def round_robin(servers, current_index):
    """Select next server in sequence"""
    server = servers[current_index]
    next_index = (current_index + 1) % len(servers)
    return server, next_index

# Example
servers = ["Server1", "Server2", "Server3"]
current = 0

# Request 1: Server1 (current=0, next=1)
# Request 2: Server2 (current=1, next=2)
# Request 3: Server3 (current=2, next=0)
# Request 4: Server1 (current=0, next=1)
```

**Flow**:
```
Request 1 → Server1
Request 2 → Server2
Request 3 → Server3
Request 4 → Server1 (cycle repeats)
```

**Characteristics**:
- **Time Complexity**: O(1) per request
- **Space Complexity**: O(1) (just current_index)
- **Fairness**: Perfect (each server gets equal requests)
- **Statefulness**: Minimal (only track current index)

**Pros**:
- ✅ Simple to implement
- ✅ Predictable distribution
- ✅ No server state needed
- ✅ Works well when all servers have equal capacity

**Cons**:
- ❌ Ignores current server load
- ❌ Doesn't account for different server capacities
- ❌ Long requests can overload slow server

**NGINX Configuration**:
```nginx
upstream backend {
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
    # Round-robin is default (no algorithm specified)
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

**When to Use**:
- Servers have equal capacity (same CPU, RAM, network)
- Requests have similar processing time
- Stateless applications (no session affinity needed)

---

### 2. Weighted Round Robin

**Algorithm**:
```python
def weighted_round_robin(servers, weights, current_index, current_weight):
    """Select server based on weight"""
    total_weight = sum(weights)
    
    while True:
        server_index = current_index
        current_weight -= weights[server_index]
        
        if current_weight <= 0:
            current_weight = total_weight
            current_index = (current_index + 1) % len(servers)
            return servers[server_index], current_index, current_weight
        
        current_index = (current_index + 1) % len(servers)

# Example
servers = ["Server1", "Server2", "Server3"]
weights = [5, 3, 2]  # Server1 gets 50%, Server2 30%, Server3 20%

# First 10 requests distribution:
# Server1: 5 requests (50%)
# Server2: 3 requests (30%)
# Server3: 2 requests (20%)
```

**Weight Calculation**:
```
Server1: 16 CPU cores, 32 GB RAM → Weight = 5
Server2: 8 CPU cores, 16 GB RAM → Weight = 3
Server3: 4 CPU cores, 8 GB RAM → Weight = 2

Server1 handles 50% of traffic (5/10)
Server2 handles 30% of traffic (3/10)
Server3 handles 20% of traffic (2/10)
```

**NGINX Configuration**:
```nginx
upstream backend {
    server 10.0.1.10:8080 weight=5;  # Powerful server
    server 10.0.1.11:8080 weight=3;  # Medium server
    server 10.0.1.12:8080 weight=2;  # Weaker server
}
```

**When to Use**:
- Heterogeneous servers (different hardware specs)
- Gradual rollout (10% to new version, 90% to old)
- Cost optimization (route more to cheaper servers)

---

### 3. Least Connections

**Algorithm**:
```python
def least_connections(servers, connection_counts):
    """Select server with fewest active connections"""
    min_connections = min(connection_counts.values())
    
    # Find all servers with minimum connections
    candidates = [
        server for server, count in connection_counts.items()
        if count == min_connections
    ]
    
    # If tie, use round-robin among candidates
    return random.choice(candidates)

# Example
connection_counts = {
    "Server1": 45,  # 45 active connections
    "Server2": 32,  # ← Chosen (fewest connections)
    "Server3": 58
}

# Next request goes to Server2
```

**Flow**:
```
Initial State:
Server1: 10 connections
Server2: 8 connections  ← Fewest
Server3: 12 connections

Request arrives → Routed to Server2
Server1: 10 connections
Server2: 9 connections  ← Still fewest
Server3: 12 connections

Request arrives → Routed to Server2
Server1: 10 connections  ← Now fewest (tied)
Server2: 10 connections  ← Tied
Server3: 12 connections

Request arrives → Routed to Server1 or Server2 (random among tied)
```

**NGINX Configuration**:
```nginx
upstream backend {
    least_conn;  # Enable least connections algorithm
    
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}
```

**HAProxy Configuration**:
```haproxy
backend backend_servers
    balance leastconn
    server server1 10.0.1.10:8080 check
    server server2 10.0.1.11:8080 check
    server server3 10.0.1.12:8080 check
```

**When to Use**:
- Long-lived connections (WebSockets, streaming)
- Variable request processing time
- Servers with different response times

**Pros**:
- ✅ Adapts to current server load
- ✅ Prevents overloading slow servers
- ✅ Better than round-robin for variable workloads

**Cons**:
- ❌ Requires tracking connection counts (more state)
- ❌ Doesn't account for connection weight (1 heavy + 10 light connections)
- ❌ Can cause cascading failures (if one server slow, it gets less traffic but still struggles)

---

### 4. Weighted Least Connections

**Algorithm**:
```python
def weighted_least_connections(servers, connection_counts, weights):
    """Select server with lowest (connections / weight) ratio"""
    ratios = {}
    
    for server in servers:
        connections = connection_counts[server]
        weight = weights[server]
        ratios[server] = connections / weight
    
    # Select server with lowest ratio
    return min(ratios, key=ratios.get)

# Example
servers = {
    "Server1": {"connections": 50, "weight": 5},  # Ratio: 10
    "Server2": {"connections": 24, "weight": 3},  # Ratio: 8 ← Chosen
    "Server3": {"connections": 18, "weight": 2}   # Ratio: 9
}

# Next request goes to Server2 (lowest ratio)
```

**When to Use**:
- Heterogeneous servers + variable workloads
- Best of both worlds (weights + load awareness)

---

### 5. Least Response Time

**Algorithm**:
```python
import time

def least_response_time(servers, response_times, connection_counts):
    """Select server with lowest (response_time + connection_count)"""
    scores = {}
    
    for server in servers:
        avg_response_time = response_times[server]  # Average over last 100 requests
        connections = connection_counts[server]
        
        # Score = weighted combination
        scores[server] = (avg_response_time * 0.7) + (connections * 0.3)
    
    return min(scores, key=scores.get)

# Example
servers = {
    "Server1": {"response_time_ms": 120, "connections": 30},  # Score: 93
    "Server2": {"response_time_ms": 80, "connections": 45},   # Score: 69.5 ← Chosen
    "Server3": {"response_time_ms": 200, "connections": 20}   # Score: 146
}

# Next request goes to Server2 (lowest score)
```

**NGINX Plus Configuration** (commercial):
```nginx
upstream backend {
    least_time header;  # Consider response time to first byte
    
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}
```

**When to Use**:
- Heterogeneous servers with unpredictable performance
- Geographically distributed servers (different network latencies)
- Need best user experience (lowest latency)

**Pros**:
- ✅ Most intelligent (considers actual performance)
- ✅ Adapts to network conditions
- ✅ Best latency for users

**Cons**:
- ❌ Complex to implement (track response times)
- ❌ Higher overhead (measure every request)
- ❌ Can amplify cascading failures (avoid slow servers, making them even slower)

---

### 6. IP Hash (Consistent Hashing)

**Algorithm**:
```python
import hashlib

def ip_hash(client_ip, servers):
    """Consistent server selection based on client IP"""
    # Hash client IP
    hash_value = int(hashlib.md5(client_ip.encode()).hexdigest(), 16)
    
    # Modulo server count
    server_index = hash_value % len(servers)
    
    return servers[server_index]

# Example
client_ip = "192.168.1.100"
servers = ["Server1", "Server2", "Server3"]

# Request 1 from 192.168.1.100 → hash % 3 = 1 → Server2
# Request 2 from 192.168.1.100 → hash % 3 = 1 → Server2 (same)
# Request 3 from 192.168.1.101 → hash % 3 = 0 → Server1
```

**NGINX Configuration**:
```nginx
upstream backend {
    ip_hash;  # Enable IP-based hashing
    
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}
```

**Consistent Hashing** (better for scaling):
```python
import hashlib

class ConsistentHash:
    def __init__(self, servers, virtual_nodes=150):
        """Create hash ring with virtual nodes"""
        self.virtual_nodes = virtual_nodes
        self.ring = {}
        self.sorted_keys = []
        
        for server in servers:
            self.add_server(server)
    
    def add_server(self, server):
        """Add server with virtual nodes"""
        for i in range(self.virtual_nodes):
            virtual_key = f"{server}:{i}"
            hash_value = self._hash(virtual_key)
            self.ring[hash_value] = server
        
        self.sorted_keys = sorted(self.ring.keys())
    
    def remove_server(self, server):
        """Remove server and its virtual nodes"""
        for i in range(self.virtual_nodes):
            virtual_key = f"{server}:{i}"
            hash_value = self._hash(virtual_key)
            del self.ring[hash_value]
        
        self.sorted_keys = sorted(self.ring.keys())
    
    def get_server(self, client_ip):
        """Find server for client IP"""
        if not self.ring:
            return None
        
        hash_value = self._hash(client_ip)
        
        # Find first server clockwise on ring
        for key in self.sorted_keys:
            if key >= hash_value:
                return self.ring[key]
        
        # Wrap around to first server
        return self.ring[self.sorted_keys[0]]
    
    def _hash(self, key):
        """MD5 hash function"""
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

# Usage
ch = ConsistentHash(["Server1", "Server2", "Server3"])

# Requests from same IP always go to same server
print(ch.get_server("192.168.1.100"))  # Server2
print(ch.get_server("192.168.1.100"))  # Server2 (same)

# Adding server only affects 1/N of traffic
ch.add_server("Server4")
print(ch.get_server("192.168.1.100"))  # Still Server2 (likely)
```

**When to Use**:
- Stateful applications (sessions stored on server)
- Caching (route same key to same server)
- WebSockets (need persistent connection to same server)

**Pros**:
- ✅ Session persistence without shared storage
- ✅ Cache locality (same keys go to same server)
- ✅ Consistent hashing: Adding/removing server affects only K/N traffic

**Cons**:
- ❌ Uneven distribution (many users behind NAT share same IP)
- ❌ If server fails, all its users lose sessions
- ❌ Doesn't account for current load

---

### 7. Random

**Algorithm**:
```python
import random

def random_selection(servers):
    """Randomly select server"""
    return random.choice(servers)

# Example
servers = ["Server1", "Server2", "Server3"]

# Request 1 → Server2 (random)
# Request 2 → Server1 (random)
# Request 3 → Server2 (random)
# Request 4 → Server3 (random)
```

**Why This Works** (Law of Large Numbers):
```
With 1,000 requests:
- Server1: ~333 requests (33.3%)
- Server2: ~334 requests (33.4%)
- Server3: ~333 requests (33.3%)

Approximates round-robin without state!
```

**NGINX Configuration**:
```nginx
upstream backend {
    random;  # Random selection
    
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}
```

**When to Use**:
- Stateless applications
- Want simple algorithm (no state tracking)
- Many servers (randomness averages out)

**Pros**:
- ✅ Simplest possible (no state)
- ✅ No coordination needed (works in distributed LBs)
- ✅ Surprisingly effective (approaches round-robin with large N)

**Cons**:
- ❌ Short-term unevenness (one server might get 3 in a row)
- ❌ No load awareness

---

### 8. Power of Two Choices

**Algorithm**:
```python
import random

def power_of_two_choices(servers, connection_counts):
    """
    Randomly select 2 servers, choose one with fewer connections
    
    Proven to be nearly as good as global least connections,
    but O(1) instead of O(N)
    """
    # Randomly pick 2 servers
    server1, server2 = random.sample(servers, 2)
    
    # Choose the one with fewer connections
    if connection_counts[server1] <= connection_counts[server2]:
        return server1
    else:
        return server2

# Example
connection_counts = {
    "Server1": 45,
    "Server2": 32,
    "Server3": 58,
    "Server4": 41
}

# Pick 2 random: Server1 (45), Server3 (58)
# Choose Server1 (fewer connections)
```

**Why This Is Brilliant**:
```
Global least connections: O(N) to find minimum
Power of two: O(1) to pick 2 random

Research shows: Power of Two achieves 90% of optimal load balancing
with 10% of the overhead!
```

**When to Use**:
- Large server pools (100+ servers)
- Need better than random, but global least connections too expensive
- Distributed load balancers (no shared state)

---

## 3. Capacity Planning & Estimation (When Applicable)

### Scenario: E-Commerce Platform

**Setup**:
- 5 backend servers
- Peak traffic: 5,000 RPS
- Average request time: 100ms

### Round Robin vs Least Connections

**Round Robin**:
```
Each server gets: 5,000 / 5 = 1,000 RPS

If one server slow (200ms response time):
- Still gets 1,000 RPS (20% of traffic)
- Server overloaded (1,000 * 0.2s = 200 concurrent requests)
- Other servers underutilized (1,000 * 0.1s = 100 concurrent requests)
```

**Least Connections**:
```
Slow server (200ms response time):
- Gets fewer requests (adapts to load)
- Ends up with ~500 RPS (10% of traffic, not 20%)
- 500 * 0.2s = 100 concurrent connections (same as others)

Fast servers (100ms response time):
- Pick up slack: 1,125 RPS each (22.5% of traffic)
- 1,125 * 0.1s = 112.5 concurrent connections (manageable)
```

**Improvement**: Least Connections prevents overload, keeps latency consistent.

---

## 4. Data & Storage Design

### State Required by Each Algorithm

| Algorithm | State | Memory (for 1000 servers) |
|-----------|-------|---------------------------|
| **Round Robin** | Current index | 4 bytes (int) |
| **Weighted RR** | Current index + weights | 4 KB (int + weights) |
| **Least Connections** | Connection count per server | 4 KB (int per server) |
| **Least Response Time** | Response times (circular buffer) | 400 KB (100 samples × 1000 servers × 4 bytes) |
| **IP Hash** | None (deterministic) | 0 bytes |
| **Random** | None (stateless) | 0 bytes |

**Redis-Based State** (for distributed load balancers):
```python
import redis

class DistributedLeastConnections:
    def __init__(self, servers):
        self.redis = redis.Redis(host='localhost', port=6379)
        self.servers = servers
    
    def get_server(self):
        """Find server with fewest connections across all LB instances"""
        connection_counts = {}
        
        for server in self.servers:
            count = self.redis.get(f"connections:{server}")
            connection_counts[server] = int(count) if count else 0
        
        # Select server with minimum connections
        server = min(connection_counts, key=connection_counts.get)
        
        # Increment connection count
        self.redis.incr(f"connections:{server}")
        
        return server
    
    def release_connection(self, server):
        """Decrement connection count when request completes"""
        self.redis.decr(f"connections:{server}")
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Handling Server Failures

**Round Robin with Health Checks**:
```python
def round_robin_with_health_checks(servers, health_status, current_index):
    """Skip unhealthy servers"""
    attempts = 0
    max_attempts = len(servers)
    
    while attempts < max_attempts:
        server = servers[current_index]
        current_index = (current_index + 1) % len(servers)
        attempts += 1
        
        if health_status[server]:
            return server, current_index
    
    # All servers unhealthy!
    raise NoHealthyServersException()

# Example
servers = ["Server1", "Server2", "Server3"]
health_status = {
    "Server1": True,
    "Server2": False,  # Unhealthy, skip
    "Server3": True
}

# Request 1 → Server1 (healthy)
# Request 2 → Skip Server2 (unhealthy), → Server3
# Request 3 → Server1
```

### Graceful Degradation

**Connection Draining**:
```python
def least_connections_with_draining(servers, connection_counts, draining_servers):
    """Avoid draining servers for new connections"""
    active_servers = [
        server for server in servers
        if server not in draining_servers
    ]
    
    if not active_servers:
        # All servers draining, use least connections anyway
        active_servers = servers
    
    return least_connections(active_servers, connection_counts)

# Example
servers = ["Server1", "Server2", "Server3"]
connection_counts = {"Server1": 45, "Server2": 32, "Server3": 58}
draining_servers = {"Server2"}  # Being removed

# New requests go to Server1 or Server3 only
# Existing connections to Server2 complete gracefully
```

---

## 6. Security, APIs & Governance

### Rate Limiting Per Algorithm

**Round Robin** (can cause uneven rate limiting):
```
User makes 100 requests:
- 33 to Server1, 33 to Server2, 34 to Server3
- Each server rate-limits independently (100 req/min)
- User effectively gets 300 req/min (3x intended)!
```

**IP Hash** (consistent rate limiting):
```
User always routes to Server2:
- All 100 requests go to Server2
- Server2 rate-limits correctly (100 req/min limit enforced)
```

**Solution**: Centralized rate limiting with Redis:
```python
def centralized_rate_limit(user_id, limit=100, window=60):
    """Rate limit across all servers"""
    key = f"rate_limit:{user_id}"
    
    # Increment counter
    count = redis.incr(key)
    
    if count == 1:
        # Set expiry on first request
        redis.expire(key, window)
    
    if count > limit:
        return False  # Rate limit exceeded
    
    return True  # Allow request
```

---

## 7. Real-World Examples & Case Studies

### NGINX: Default is Round Robin

**Why?**
- Simple, predictable, no state
- Works well for 90% of use cases
- Easy to reason about for debugging

**When They Change**: Upgrade to `least_conn` for long-lived connections (WebSockets, streaming).

### HAProxy: Least Connections

**Default Algorithm**: `balance leastconn`

**Why?**
- Better than round-robin for variable workloads
- Handles heterogeneous servers gracefully
- Minimal overhead (just connection counts)

### AWS ALB: Least Outstanding Requests

**Algorithm**: Route to server with fewest in-flight requests

**Why Better Than Least Connections?**
```
Least Connections: Counts only active TCP connections
Least Outstanding: Counts requests being processed

Example:
Server1: 100 connections, but 10 active requests (others idle)
Server2: 50 connections, but 40 active requests (all busy)

Least Connections → Route to Server2 ❌ (actually busier!)
Least Outstanding → Route to Server1 ✅ (less busy)
```

### Cloudflare: Least Connection + Geographic Proximity

**Hybrid Algorithm**:
1. Filter servers by geographic proximity (< 50ms latency)
2. Among those, use least connections
3. Fallback to other regions if all local servers overloaded

**Result**: 95th percentile latency < 50ms globally

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Explain different load balancing algorithms"

**Structured Answer**:

**"Load balancing algorithms determine how requests are distributed across servers. Main categories:**

**1. Static (no server state)**:
- **Round Robin**: Cycle through servers sequentially. Simple, works when servers equal.
- **Weighted Round Robin**: Proportional to server capacity. Use for heterogeneous hardware.
- **Random**: Random selection. Surprisingly effective with large server counts.
- **IP Hash**: Consistent routing based on client IP. Use for session persistence.

**2. Dynamic (track server state)**:
- **Least Connections**: Route to server with fewest active connections. Best for long-lived connections (WebSockets).
- **Least Response Time**: Route to fastest server. Best user experience but higher overhead.
- **Power of Two Choices**: Pick 2 random, choose less loaded. 90% optimal with minimal overhead.

**Real-world example**: Netflix uses **weighted round-robin** initially, then switches to **least connections** for streaming (long-lived TCP connections). AWS ALB uses **least outstanding requests** (even better—tracks in-flight requests, not just connections)."

---

### Follow-Up 1: "When would you use Round Robin vs Least Connections?"

**Answer**:

"**Round Robin when:**

1. **Servers have equal capacity** (same hardware specs)
2. **Requests have similar processing time** (e.g., simple CRUD operations, 10-50ms each)
3. **Short-lived connections** (HTTP request-response)
4. **Want simplicity** (no state to track, easy debugging)

**Example**: API gateway routing to identical API servers running in containers. Each request takes 20-30ms, servers are identical t3.medium instances.

**Least Connections when:**

1. **Variable request processing time** (some requests 10ms, others 5 seconds)
2. **Long-lived connections** (WebSockets, streaming, database connections)
3. **Heterogeneous servers** (different hardware specs, some servers slower)
4. **Want better load distribution** (adaptive to current load)

**Example**: Chat application with WebSocket connections. Some users idle (1 message/min), others active (100 messages/min). Least connections ensures servers don't get overloaded with active users.

**Trade-off**: Least Connections requires tracking state (connection counts), adds complexity. But the benefit (adaptive load balancing) is worth it for variable workloads."

---

### Follow-Up 2: "What's the problem with IP Hash and how do you solve it?"

**Answer**:

"**Problem: Uneven distribution due to NAT**

Example scenario:
```
Office with 100 employees → Corporate NAT (1 public IP) 
  → hash(IP) % 3 servers = Server 2

Result: All 100 employees routed to Server 2
Server 1: 0 requests (0%)
Server 2: 100 requests (100%) ← Overloaded!
Server 3: 0 requests (0%)
```

**Solutions:**

**1. Cookie-Based Sticky Sessions** (Layer 7):
```nginx
# Load balancer sets cookie with server ID
Set-Cookie: lb_server=server2; Max-Age=3600

# Client includes cookie in next request
Cookie: lb_server=server2 → routes to Server 2
```
- **Pro**: Precise routing per user
- **Con**: Requires Layer 7 LB (slower, more expensive)

**2. Consistent Hashing with Virtual Nodes**:
```python
# Instead of hash(IP) % N, use hash ring with virtual nodes
# Each server appears 150 times on ring
# Distributes load even with few IPs
```
- **Pro**: Better distribution, smooth scaling
- **Con**: More complex implementation

**3. Session Store (Redis)** ✅ **Recommended**:
```python
# Don't use sticky sessions at all
# Store sessions in Redis, accessible from any server
session = redis.get(f"session:{session_id}")
```
- **Pro**: No sticky sessions needed, perfect load distribution
- **Con**: Network hop to Redis (1-5ms latency)

**Best practice**: Use centralized session store. Only use IP hash/sticky sessions for legacy apps that can't be refactored."

---

### Follow-Up 3: "Explain the Power of Two Choices algorithm"

**Answer**:

"**Power of Two Choices**: Randomly select 2 servers, route request to the one with fewer connections.

**Algorithm**:
```python
def power_of_two(servers, connection_counts):
    # Pick 2 random servers
    s1, s2 = random.sample(servers, 2)
    
    # Choose less loaded
    return s1 if connection_counts[s1] <= connection_counts[s2] else s2
```

**Why This Is Remarkable**:

1. **Time Complexity**: O(1) to pick 2 random, vs O(N) to find global minimum
2. **Performance**: Research shows it achieves **90% of optimal** load balancing
3. **Scalability**: Works with 1,000+ servers (global least connections doesn't scale)

**Math Behind It** (simplified):
```
Random selection: Worst case, hit busiest server (bad)
Power of Two: Probability of hitting busiest server = P(busy)^2 (much lower!)

With 10 servers, 1 overloaded (90% of connections):
Random: 10% chance to hit overloaded server
Power of Two: 10% × 10% = 1% chance both picks are overloaded
```

**Real-world**: Used by **NGINX**, **HAProxy**, **AWS** in distributed load balancing. Perfect for large-scale systems where tracking all servers too expensive.

**Trade-off**: Slightly less optimal than global least connections, but 90% as good with 10% of the overhead. Perfect engineering trade-off."

---

### Follow-Up 4: "How do you handle server failures in load balancing algorithms?"

**Answer**:

"**Multi-layer approach:**

**1. Health Checks** (detect failures):
```python
# Every 10s, check if server responsive
if not tcp_connect(server, timeout=5):
    mark_unhealthy(server)
```

**2. Skip Unhealthy Servers** (in algorithm):
```python
def round_robin_safe(servers, health_status, current_index):
    # Skip unhealthy servers
    while not health_status[servers[current_index]]:
        current_index = (current_index + 1) % len(servers)
    return servers[current_index], current_index
```

**3. Retries** (handle transient failures):
```nginx
proxy_next_upstream error timeout http_502 http_503;
proxy_next_upstream_tries 3;  # Try 3 servers before giving up
```

**4. Connection Draining** (graceful shutdown):
```
Server being removed:
1. Mark as 'draining' (no new connections)
2. Wait for existing connections to complete (timeout: 300s)
3. Force-close remaining connections
4. Remove server from pool
```

**5. Circuit Breaker** (prevent cascading failures):
```python
if error_rate(server) > 50% and request_count > 100:
    open_circuit(server, duration=60s)  # Remove from pool for 60s
```

**Real-world example**: At Netflix, Zuul uses **combination** of health checks (every 30s), retries (max 3), and circuit breakers (open after 50% errors in 10s window). This prevents cascading failures when backend service degrades."

---

## 9. Pseudocode / Diagrams (When Applicable)

### Comprehensive Load Balancer with Multiple Algorithms

```python
import time
import random
import hashlib
from enum import Enum
from collections import defaultdict

class Algorithm(Enum):
    ROUND_ROBIN = "round_robin"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    LEAST_CONNECTIONS = "least_connections"
    LEAST_RESPONSE_TIME = "least_response_time"
    IP_HASH = "ip_hash"
    RANDOM = "random"
    POWER_OF_TWO = "power_of_two"

class LoadBalancer:
    def __init__(self, servers, algorithm=Algorithm.ROUND_ROBIN, weights=None):
        self.servers = servers
        self.algorithm = algorithm
        self.weights = weights or {server: 1 for server in servers}
        
        # State
        self.current_index = 0
        self.connection_counts = defaultdict(int)
        self.response_times = defaultdict(list)  # Last 100 response times
        self.health_status = {server: True for server in servers}
    
    def get_server(self, client_ip=None):
        """Select server based on algorithm"""
        healthy_servers = [
            server for server in self.servers
            if self.health_status[server]
        ]
        
        if not healthy_servers:
            raise NoHealthyServersException("All servers unhealthy")
        
        if self.algorithm == Algorithm.ROUND_ROBIN:
            return self._round_robin(healthy_servers)
        
        elif self.algorithm == Algorithm.WEIGHTED_ROUND_ROBIN:
            return self._weighted_round_robin(healthy_servers)
        
        elif self.algorithm == Algorithm.LEAST_CONNECTIONS:
            return self._least_connections(healthy_servers)
        
        elif self.algorithm == Algorithm.LEAST_RESPONSE_TIME:
            return self._least_response_time(healthy_servers)
        
        elif self.algorithm == Algorithm.IP_HASH:
            return self._ip_hash(client_ip, healthy_servers)
        
        elif self.algorithm == Algorithm.RANDOM:
            return self._random(healthy_servers)
        
        elif self.algorithm == Algorithm.POWER_OF_TWO:
            return self._power_of_two(healthy_servers)
    
    def _round_robin(self, servers):
        """Cycle through servers sequentially"""
        server = servers[self.current_index % len(servers)]
        self.current_index += 1
        return server
    
    def _weighted_round_robin(self, servers):
        """Select based on weights"""
        total_weight = sum(self.weights[s] for s in servers)
        random_weight = random.randint(0, total_weight - 1)
        
        cumulative_weight = 0
        for server in servers:
            cumulative_weight += self.weights[server]
            if random_weight < cumulative_weight:
                return server
    
    def _least_connections(self, servers):
        """Select server with fewest active connections"""
        return min(servers, key=lambda s: self.connection_counts[s])
    
    def _least_response_time(self, servers):
        """Select server with lowest average response time"""
        def score(server):
            avg_response = self._avg_response_time(server)
            connections = self.connection_counts[server]
            return avg_response * 0.7 + connections * 0.3
        
        return min(servers, key=score)
    
    def _ip_hash(self, client_ip, servers):
        """Consistent routing based on client IP"""
        hash_value = int(hashlib.md5(client_ip.encode()).hexdigest(), 16)
        server_index = hash_value % len(servers)
        return servers[server_index]
    
    def _random(self, servers):
        """Random server selection"""
        return random.choice(servers)
    
    def _power_of_two(self, servers):
        """Pick 2 random, choose less loaded"""
        if len(servers) < 2:
            return servers[0]
        
        s1, s2 = random.sample(servers, 2)
        
        if self.connection_counts[s1] <= self.connection_counts[s2]:
            return s1
        else:
            return s2
    
    def _avg_response_time(self, server):
        """Calculate average response time for server"""
        times = self.response_times[server]
        if not times:
            return 0
        return sum(times) / len(times)
    
    def on_request_start(self, server):
        """Increment connection count when request starts"""
        self.connection_counts[server] += 1
    
    def on_request_end(self, server, response_time_ms):
        """Update state when request completes"""
        self.connection_counts[server] -= 1
        
        # Track last 100 response times
        self.response_times[server].append(response_time_ms)
        if len(self.response_times[server]) > 100:
            self.response_times[server].pop(0)
    
    def mark_unhealthy(self, server):
        """Mark server as unhealthy"""
        self.health_status[server] = False
        print(f"⚠️ Server {server} marked UNHEALTHY")
    
    def mark_healthy(self, server):
        """Mark server as healthy"""
        self.health_status[server] = True
        print(f"✅ Server {server} marked HEALTHY")

# Usage Example
lb = LoadBalancer(
    servers=["10.0.1.10", "10.0.1.11", "10.0.1.12"],
    algorithm=Algorithm.LEAST_CONNECTIONS,
    weights={"10.0.1.10": 5, "10.0.1.11": 3, "10.0.1.12": 2}
)

# Handle request
server = lb.get_server(client_ip="192.168.1.100")
lb.on_request_start(server)

# ... forward request to server ...
response_time = 45  # ms

lb.on_request_end(server, response_time)
```

### Visual Comparison

```
┌────────────────────────────────────────────────────────────┐
│                  ALGORITHM COMPARISON                       │
└────────────────────────────────────────────────────────────┘

ROUND ROBIN (Sequential)
────────────────────────
Time: T1    T2    T3    T4    T5    T6
      ↓     ↓     ↓     ↓     ↓     ↓
      S1 →  S2 →  S3 →  S1 →  S2 →  S3

Result: Perfect distribution (33.3% each)


WEIGHTED ROUND ROBIN (Proportional)
───────────────────────────────────
Weights: S1=5, S2=3, S3=2

Time: T1 T2 T3 T4 T5 T6 T7 T8 T9 T10
      ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓
      S1 S1 S1 S1 S1 S2 S2 S2 S3 S3

Result: S1=50%, S2=30%, S3=20%


LEAST CONNECTIONS (Adaptive)
────────────────────────────
Connections: S1=10, S2=15, S3=8

Request arrives → Route to S3 (fewest: 8)
S1=10, S2=15, S3=9 ← Updated

Request arrives → Route to S3 (fewest: 9)
S1=10, S2=15, S3=10 ← Updated

Request arrives → Route to S1 or S3 (tied: 10)

Result: Adapts to current load


IP HASH (Consistent)
────────────────────
User A (IP: 192.168.1.100) → hash % 3 = 1 → S2
User B (IP: 192.168.1.101) → hash % 3 = 0 → S1
User C (IP: 192.168.1.102) → hash % 3 = 2 → S3

User A again (192.168.1.100) → S2 (same!)

Result: Session persistence


POWER OF TWO CHOICES
────────────────────
Connections: S1=50, S2=30, S3=80, S4=45

Request arrives:
1. Pick 2 random: S1, S3
2. Compare: S1=50, S3=80
3. Choose S1 (fewer)

Request arrives:
1. Pick 2 random: S2, S4
2. Compare: S2=30, S4=45
3. Choose S2 (fewer)

Result: Near-optimal with O(1) complexity
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Load Balancing Algorithms Matter

**The Problem**:
- Simple round-robin distributes requests evenly but ignores server load
- One slow server can degrade entire system (gets same traffic as fast servers)
- Stateful applications need session persistence (can't route randomly)

**The Solution**:
- **Static algorithms** (Round Robin, IP Hash): Predictable, simple, no state
- **Dynamic algorithms** (Least Connections, Response Time): Adaptive, optimal, but require state tracking

### How to Choose

**Decision Tree**:
```
Are servers identical hardware?
├─ Yes → Are requests uniform processing time?
│   ├─ Yes → Round Robin (simplest)
│   └─ No → Least Connections (adapts to variable load)
│
└─ No (heterogeneous) → Weighted Round Robin or Weighted Least Connections
```

**Need session persistence?**
```
└─ Use IP Hash OR Cookie-Based Sticky Sessions
   └─ Better: Centralized session store (Redis) + any algorithm
```

**Large server pool (100+ servers)?**
```
└─ Power of Two Choices (90% optimal, O(1) complexity)
```

### When to Implement Each

| Algorithm | Best For | Avoid When |
|-----------|----------|------------|
| **Round Robin** | Identical servers, uniform requests | Variable workloads |
| **Weighted RR** | Heterogeneous servers | All servers same capacity |
| **Least Connections** | Long-lived connections (WebSockets) | Short HTTP requests |
| **Least Response Time** | Best user experience, heterogeneous network | High overhead unacceptable |
| **IP Hash** | Session persistence (legacy apps) | Need even distribution |
| **Random** | Simplest, works well at scale | Need guarantees |
| **Power of Two** | Large server pools (100+) | Few servers (< 10) |

### Trade-offs

| Factor | Static (RR, Hash) | Dynamic (Least Conn) |
|--------|-------------------|----------------------|
| **Complexity** | ⭐⭐⭐⭐⭐ Simple | ⭐⭐⭐ Complex |
| **Performance** | ⭐⭐⭐⭐⭐ Fast (O(1)) | ⭐⭐⭐⭐ Fast (O(1) with hash map) |
| **Load Awareness** | ⭐ Ignores load | ⭐⭐⭐⭐⭐ Adapts to load |
| **Statefulness** | ⭐⭐⭐⭐⭐ Minimal | ⭐⭐ Requires tracking |

### Production Checklist

- [ ] Start with **Round Robin** (simplest, works for 90% of cases)
- [ ] Upgrade to **Least Connections** if:
  - Long-lived connections (WebSockets, streaming)
  - Variable request processing time
  - Heterogeneous servers (some slow)
- [ ] Use **Weighted Round Robin** if:
  - Servers have different capacities
  - Canary deployments (10% to new version)
- [ ] Use **IP Hash** only if:
  - Legacy app requires session persistence
  - Cannot refactor to use centralized session store
- [ ] Use **Power of Two Choices** if:
  - Large server pool (100+)
  - Need better than random, but global least connections too expensive
- [ ] Always combine with:
  - Health checks (remove unhealthy servers)
  - Retries (handle transient failures)
  - Connection draining (graceful shutdowns)
  - Circuit breakers (prevent cascading failures)

### Bottom Line

**Start simple (Round Robin), upgrade as needed (Least Connections). Most systems don't need fancy algorithms—proper health checks and retries matter more than algorithm choice.**

**Real-world lesson from Netflix**: "We use round-robin for 80% of our microservices. Only our streaming tier uses least connections (long-lived TCP connections). Over-engineering load balancing algorithms is a common mistake—focus on health checks and graceful degradation instead."

