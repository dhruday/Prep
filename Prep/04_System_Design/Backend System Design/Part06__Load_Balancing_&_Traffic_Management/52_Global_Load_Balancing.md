# 52. Global Load Balancing

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Global Load Balancing?

**Global Load Balancing** (GLB) distributes traffic across multiple geographic regions/data centers to minimize latency, improve availability, and handle regional failures.

**Without Global Load Balancing**:
```
All users → Single data center (e.g., US-East)

Problem:
- High latency for distant users (Asia: 300ms, Europe: 150ms)
- Single point of failure (data center outage → complete downtime)
- No disaster recovery (fire, earthquake, network partition)
```

**With Global Load Balancing**:
```
US users → US-East data center (20ms)
EU users → EU-West data center (25ms)
Asia users → AP-Southeast data center (30ms)

Benefits:
- Low latency for all users (< 50ms)
- High availability (one region fails → route to next closest)
- Disaster recovery built-in
```

### How It Works

**DNS-Based Routing**:
```
User: "What's the IP of api.example.com?"
DNS: "Your IP is from London → Route to EU-West: 52.214.10.5"

User: "What's the IP of api.example.com?"
DNS: "Your IP is from Tokyo → Route to AP-Southeast: 13.250.5.10"
```

**Health-Check Based Failover**:
```
1. Health checker pings US-East: ✅ Healthy
2. Health checker pings EU-West: ❌ Unhealthy (region outage)
3. DNS automatically routes EU users to US-East (graceful degradation)
4. When EU-West recovers: DNS routes EU users back to EU-West
```

### Key Components

| Component | Purpose | Example |
|-----------|---------|---------|
| **DNS** | Route users to closest/healthiest region | AWS Route 53, Cloudflare DNS |
| **Anycast** | Single IP, multiple locations (route to nearest) | Cloudflare, Google Cloud Load Balancing |
| **GeoDNS** | Return different IPs based on user location | Akamai, Amazon Route 53 |
| **Health Checks** | Detect regional failures, reroute traffic | Pingdom, AWS Route 53 health checks |

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. DNS-Based Global Load Balancing

**How DNS Works**:
```
User (Tokyo, IP: 203.0.113.50)
   ↓ (DNS Query: "api.example.com?")
DNS Server (GeoDNS-aware)
   ↓ (Lookup: IP 203.0.113.50 → Tokyo → Route to AP-Southeast)
Return: 13.250.5.10 (AP-Southeast data center)
   ↓
User connects to 13.250.5.10
```

**GeoDNS Configuration** (AWS Route 53):
```json
{
  "Name": "api.example.com",
  "Type": "A",
  "GeoLocation": {
    "ContinentCode": "AS"
  },
  "ResourceRecords": [
    {"Value": "13.250.5.10"}  // AP-Southeast data center
  ],
  "TTL": 60
}

{
  "Name": "api.example.com",
  "Type": "A",
  "GeoLocation": {
    "ContinentCode": "EU"
  },
  "ResourceRecords": [
    {"Value": "52.214.10.5"}  // EU-West data center
  ],
  "TTL": 60
}

{
  "Name": "api.example.com",
  "Type": "A",
  "GeoLocation": {
    "ContinentCode": "NA"
  },
  "ResourceRecords": [
    {"Value": "3.224.15.20"}  // US-East data center
  ],
  "TTL": 60
}

{
  "Name": "api.example.com",
  "Type": "A",
  "SetIdentifier": "Default",
  "ResourceRecords": [
    {"Value": "3.224.15.20"}  // Default: US-East (fallback)
  ],
  "TTL": 60
}
```

**Latency-Based Routing**:
```python
# AWS Route 53 latency-based routing
# Automatically routes user to region with lowest latency

import boto3

route53 = boto3.client('route53')

# Create latency record for US-East
route53.change_resource_record_sets(
    HostedZoneId='Z1234567890ABC',
    ChangeBatch={
        'Changes': [{
            'Action': 'CREATE',
            'ResourceRecordSet': {
                'Name': 'api.example.com',
                'Type': 'A',
                'SetIdentifier': 'US-East',
                'Region': 'us-east-1',
                'TTL': 60,
                'ResourceRecords': [{'Value': '3.224.15.20'}]
            }
        }]
    }
)

# Create latency record for EU-West
route53.change_resource_record_sets(
    HostedZoneId='Z1234567890ABC',
    ChangeBatch={
        'Changes': [{
            'Action': 'CREATE',
            'ResourceRecordSet': {
                'Name': 'api.example.com',
                'Type': 'A',
                'SetIdentifier': 'EU-West',
                'Region': 'eu-west-1',
                'TTL': 60,
                'ResourceRecords': [{'Value': '52.214.10.5'}]
            }
        }]
    }
)

# Route 53 automatically measures latency from user to each region
# Returns IP of region with lowest latency
```

**DNS Limitations**:
```
Problem 1: TTL (Time To Live) caching
- DNS response cached for 60 seconds
- If region fails: Users stuck with stale IP for 60 seconds
- Mitigation: Lower TTL (10-60 seconds)

Problem 2: No real-time load balancing
- DNS doesn't know current server load
- Can't route away from overloaded region
- Mitigation: Use Anycast or application-level LB

Problem 3: Client-side caching
- Browsers cache DNS for TTL duration
- Users don't re-query DNS until cache expires
- Mitigation: Short TTL + health checks
```

---

### 2. Anycast-Based Global Load Balancing

**What is Anycast?**

Anycast = Same IP address announced from multiple locations. Network automatically routes to nearest location.

**Traditional Unicast**:
```
US-East: 3.224.15.20
EU-West: 52.214.10.5
AP-Southeast: 13.250.5.10

User must know which IP to use (via DNS)
```

**Anycast**:
```
All regions announce: 203.0.113.1

User in Tokyo connects to 203.0.113.1
  → Network routes to AP-Southeast (nearest)

User in London connects to 203.0.113.1
  → Network routes to EU-West (nearest)
```

**How Anycast Works** (BGP - Border Gateway Protocol):
```
1. US-East data center: Announce "I have 203.0.113.1" (BGP)
2. EU-West data center: Announce "I have 203.0.113.1" (BGP)
3. AP-Southeast data center: Announce "I have 203.0.113.1" (BGP)

4. Internet routers receive announcements:
   - Router in Tokyo: "Closest path to 203.0.113.1 is via AP-Southeast"
   - Router in London: "Closest path to 203.0.113.1 is via EU-West"

5. Traffic automatically routed to nearest data center
```

**BGP Configuration** (Bird routing daemon):
```bash
# /etc/bird/bird.conf (on each data center)

# Define our Anycast IP
protocol static {
    route 203.0.113.1/32 via "lo";  # Announce Anycast IP on loopback
}

# Announce to ISP
protocol bgp isp1 {
    local as 65000;
    neighbor 192.0.2.1 as 65001;  # ISP's BGP router
    
    export filter {
        if net = 203.0.113.1/32 then accept;  # Announce Anycast IP
        reject;
    };
}
```

**Anycast Advantages**:
```
✅ Automatic failover (no DNS TTL delay)
   - If AP-Southeast fails: BGP withdraws announcement
   - Network re-routes Tokyo users to next-nearest (US-West)
   - Failover: 30-180 seconds (BGP convergence)

✅ DDoS mitigation
   - Attack traffic distributed across all regions
   - 100 Gbps attack → 4 regions → 25 Gbps per region (manageable)

✅ Lowest latency
   - Network-level routing (faster than DNS)
   - Users always route to nearest data center
```

**Anycast Limitations**:
```
❌ Stateless protocols only (HTTP, DNS, NTP)
   - TCP connections can break if route changes mid-session
   - Mitigation: Use Anycast for initial connection, then establish direct connection

❌ Requires BGP setup (complex)
   - Need ISP cooperation
   - Not available on all cloud providers (AWS doesn't support user Anycast)

❌ Limited control over routing
   - Network decides routing (AS path length, etc.)
   - Can't implement custom routing logic (e.g., weighted routing)
```

**Cloudflare Anycast Architecture**:
```
Cloudflare edge network: 200+ data centers, all announce same IP

User in Mumbai:
1. DNS query: "cloudflare.com?" → 104.16.132.229 (Anycast IP)
2. TCP connect to 104.16.132.229 → Routes to Mumbai edge
3. Mumbai edge: Serve cached content (if available)
4. Or: Proxy request to origin server

Benefits:
- < 50ms latency for 95% of Internet users
- Automatic DDoS mitigation (spread across 200+ locations)
- No DNS failover delay (BGP handles routing)
```

---

### 3. Application-Level Global Load Balancing

**Layer 7 Global Load Balancing**: Application makes intelligent routing decisions based on real-time data.

**Architecture**:
```
User (Tokyo)
   ↓
Global Load Balancer (Anycast IP)
   ↓ (Check region health + latency)
   ├─→ AP-Southeast (Healthy, 30ms) ← ROUTE HERE
   ├─→ US-West (Healthy, 150ms)
   └─→ EU-West (Unhealthy)
```

**Implementation** (NGINX with dynamic upstream):
```nginx
# Global load balancer (NGINX)

# Define upstream regions
upstream us_east {
    server 3.224.15.20:443;
}

upstream eu_west {
    server 52.214.10.5:443;
}

upstream ap_southeast {
    server 13.250.5.10:443;
}

# GeoIP-based routing
geo $closest_region {
    default us_east;
    
    # North America
    US us_east;
    CA us_east;
    MX us_east;
    
    # Europe
    GB eu_west;
    FR eu_west;
    DE eu_west;
    
    # Asia
    JP ap_southeast;
    CN ap_southeast;
    IN ap_southeast;
}

server {
    listen 443 ssl;
    server_name api.example.com;
    
    # Route based on GeoIP
    location / {
        proxy_pass https://$closest_region;
        proxy_next_upstream error timeout http_502 http_503 http_504;
        
        # If region fails, try next one
        proxy_connect_timeout 2s;
        proxy_send_timeout 5s;
        proxy_read_timeout 10s;
    }
}
```

**Health-Check Integration**:
```python
import requests
import time
from dataclasses import dataclass

@dataclass
class Region:
    name: str
    url: str
    latency_ms: float = 0
    is_healthy: bool = True

class GlobalLoadBalancer:
    def __init__(self):
        self.regions = [
            Region(name='US-East', url='https://us-east.example.com'),
            Region(name='EU-West', url='https://eu-west.example.com'),
            Region(name='AP-Southeast', url='https://ap-southeast.example.com')
        ]
        self.health_check_interval = 10  # seconds
    
    def start_health_checks(self):
        """Continuously check health of all regions"""
        import threading
        
        def health_check_loop():
            while True:
                for region in self.regions:
                    self.check_region_health(region)
                time.sleep(self.health_check_interval)
        
        threading.Thread(target=health_check_loop, daemon=True).start()
    
    def check_region_health(self, region):
        """Check health and latency of a region"""
        try:
            start = time.time()
            response = requests.get(
                f"{region.url}/health",
                timeout=5
            )
            latency = (time.time() - start) * 1000  # milliseconds
            
            region.is_healthy = (response.status_code == 200)
            region.latency_ms = latency
            
            print(f"✅ {region.name}: {latency:.0f}ms")
        except Exception as e:
            region.is_healthy = False
            region.latency_ms = float('inf')
            print(f"❌ {region.name}: {e}")
    
    def route_request(self, user_location):
        """Route user to best region based on location and health"""
        # Step 1: Filter healthy regions
        healthy_regions = [r for r in self.regions if r.is_healthy]
        
        if not healthy_regions:
            raise Exception("All regions unhealthy!")
        
        # Step 2: Find closest region based on GeoIP
        closest_region = self.get_closest_region(user_location, healthy_regions)
        
        # Step 3: If closest region too slow, use next-closest
        if closest_region.latency_ms > 200:  # 200ms threshold
            alternative = min(
                healthy_regions,
                key=lambda r: r.latency_ms
            )
            if alternative.latency_ms < closest_region.latency_ms * 0.8:
                return alternative
        
        return closest_region
    
    def get_closest_region(self, user_location, regions):
        """Find geographically closest region"""
        # Simplified: Use predefined mapping
        geo_mapping = {
            'US': 'US-East',
            'CA': 'US-East',
            'MX': 'US-East',
            'GB': 'EU-West',
            'FR': 'EU-West',
            'DE': 'EU-West',
            'JP': 'AP-Southeast',
            'CN': 'AP-Southeast',
            'IN': 'AP-Southeast'
        }
        
        preferred_region_name = geo_mapping.get(user_location, 'US-East')
        
        for region in regions:
            if region.name == preferred_region_name:
                return region
        
        # Fallback: Return region with lowest latency
        return min(regions, key=lambda r: r.latency_ms)

# Usage
glb = GlobalLoadBalancer()
glb.start_health_checks()

# Route user
user_country = 'JP'  # From GeoIP lookup
best_region = glb.route_request(user_country)
print(f"Route user to: {best_region.name} ({best_region.latency_ms:.0f}ms)")
```

**Real-Time Failover**:
```python
def handle_request(user_country):
    """Handle request with automatic failover"""
    best_region = glb.route_request(user_country)
    
    try:
        # Try primary region
        response = requests.get(
            f"{best_region.url}/api/data",
            timeout=10
        )
        return response.json()
    except Exception as e:
        print(f"❌ {best_region.name} failed: {e}")
        
        # Failover to next-best region
        healthy_regions = [r for r in glb.regions if r.is_healthy and r != best_region]
        
        if not healthy_regions:
            raise Exception("All regions failed!")
        
        fallback_region = min(healthy_regions, key=lambda r: r.latency_ms)
        
        print(f"🔄 Failing over to {fallback_region.name}")
        response = requests.get(
            f"{fallback_region.url}/api/data",
            timeout=10
        )
        return response.json()
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### Multi-Region Deployment Cost

**Scenario**: SaaS platform, 1 million DAU, 99.99% uptime SLA

**Single Region** (No Global LB):
```
Region: US-East
Servers: 10 × t3.xlarge ($0.1664/hour × 730 hours) = $1,215/month
Load Balancer: $45/month
Database: RDS Multi-AZ ($200/month)
Total: $1,460/month

Availability: 99.9% (AWS SLA for single region)
Latency: 
  - US users: 30ms ✅
  - EU users: 150ms ❌
  - Asia users: 300ms ❌
```

**Multi-Region with Global LB**:
```
Regions: US-East, EU-West, AP-Southeast

Each region:
  Servers: 5 × t3.xlarge = $607/month
  Load Balancer: $45/month
  Database: RDS Multi-AZ ($200/month)
  Subtotal: $852/month

Total for 3 regions: $852 × 3 = $2,556/month

Global Load Balancer (Route 53):
  - Hosted zone: $0.50/month
  - Queries: 100M/month × $0.40/million = $40/month
  - Health checks: 3 regions × 3 endpoints × $0.50 = $4.50/month
  Total: $45/month

Cross-region data transfer:
  - 10% of traffic crosses regions (failover, replication)
  - 100 GB/day × 30 days × 10% = 300 GB/month
  - $0.02/GB = $6/month

Grand Total: $2,556 + $45 + $6 = $2,607/month

Cost vs single region: $2,607 / $1,460 = 1.79x (79% increase)

Benefits:
  - Availability: 99.99% (multi-region)
  - Latency: < 50ms for all users (US, EU, Asia)
  - Disaster recovery built-in
```

**Traffic Distribution**:
```
1M DAU distributed geographically:
- US: 400K (40%) → US-East region
- EU: 350K (35%) → EU-West region
- Asia: 250K (25%) → AP-Southeast region

Each region handles:
- US-East: 400K DAU → 4,800 RPS peak
- EU-West: 350K DAU → 4,200 RPS peak
- AP-Southeast: 250K DAU → 3,000 RPS peak

Servers needed per region (assuming 1,000 RPS per t3.xlarge):
- US-East: 5 servers (4,800 / 1,000 = 4.8 → round up to 5)
- EU-West: 5 servers
- AP-Southeast: 3 servers

With N+1 redundancy: Add 1 extra server per region
Total: (5 + 5 + 3) + 3 = 16 servers across all regions
```

---

## 4. Data & Storage Design

### Global Data Replication

**Challenge**: Keep data consistent across regions

**Strategy 1: Multi-Master Replication** (Active-Active):
```
US-East Database ←→ EU-West Database ←→ AP-Southeast Database
(Bi-directional replication)

Write in US-East: Immediately visible in US-East
Replicated to EU-West: 100-200ms latency
Replicated to AP-Southeast: 200-300ms latency

Problem: Conflicts
- User A (US): Update email to "a@example.com"
- User A (EU): Update email to "b@example.com" (within 200ms)
- Both databases have different values → Conflict!

Solution: Last Write Wins (LWW) with vector clocks
```

**Strategy 2: Master-Replica Replication** (Active-Passive):
```
US-East Database (Master, writes)
   ↓ (Async replication)
EU-West Database (Replica, reads only)
   ↓ (Async replication)
AP-Southeast Database (Replica, reads only)

Writes: Always go to US-East (single source of truth)
Reads: Go to local region (low latency)

Replication lag: 100-300ms
Trade-off: Eventual consistency (recent writes not visible immediately)
```

**Strategy 3: Sharding by Geography**:
```
US users' data → US-East database
EU users' data → EU-West database
Asia users' data → AP-Southeast database

Each region owns subset of data
No cross-region replication needed (unless backup)

Advantage: No conflicts, low latency
Disadvantage: Cross-region queries slow (if US user moves to EU)
```

**Implementation** (PostgreSQL logical replication):
```sql
-- On US-East (Primary)
CREATE PUBLICATION all_data FOR ALL TABLES;

-- On EU-West (Replica)
CREATE SUBSCRIPTION eu_west_sub
    CONNECTION 'host=us-east.example.com dbname=mydb user=replicator'
    PUBLICATION all_data;

-- On AP-Southeast (Replica)
CREATE SUBSCRIPTION ap_southeast_sub
    CONNECTION 'host=us-east.example.com dbname=mydb user=replicator'
    PUBLICATION all_data;

-- Replication lag monitoring
SELECT NOW() - pg_last_xact_replay_timestamp() AS replication_lag;
-- Example: 0.25 seconds (250ms lag)
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Regional Failover

**Scenario**: EU-West region fails (data center fire)

**Timeline**:
```
T=0s:   EU-West region becomes unreachable
T=10s:  Health checks fail (3 consecutive failures)
T=20s:  Global LB detects EU-West unhealthy
T=30s:  DNS/Anycast updates to route EU users to US-East
T=60s:  EU users now connecting to US-East (degraded latency: 150ms vs 25ms)

Recovery:
T=2hr:  EU-West region restored
T=2hr 10s: Health checks succeed
T=2hr 20s: Global LB marks EU-West healthy
T=2hr 30s: DNS/Anycast routes EU users back to EU-West
T=2hr 60s: EU users back to normal (25ms latency)
```

**Graceful Degradation**:
```python
def get_data(user_id, user_country):
    """Get data with graceful degradation"""
    
    # Step 1: Try local region
    local_region = glb.route_request(user_country)
    
    try:
        return fetch_from_region(local_region, user_id)
    except Exception as e:
        print(f"Local region {local_region.name} failed: {e}")
    
    # Step 2: Try all other healthy regions (degraded performance)
    for region in glb.regions:
        if region == local_region or not region.is_healthy:
            continue
        
        try:
            print(f"🔄 Falling back to {region.name} (degraded latency)")
            return fetch_from_region(region, user_id)
        except Exception as e:
            print(f"Fallback region {region.name} failed: {e}")
    
    # Step 3: Return cached data (if available)
    cached_data = redis.get(f"user:{user_id}")
    if cached_data:
        print("⚠️ Returning stale cached data (all regions failed)")
        return cached_data
    
    # Step 4: Return error (graceful failure)
    raise Exception("All regions unavailable, no cached data")
```

---

## 6. Security, APIs & Governance

### DDoS Mitigation with Global Load Balancing

**Without Global LB**:
```
DDoS attack: 100 Gbps → Single data center
Result: Data center overwhelmed, service down
```

**With Global LB (Anycast)**:
```
DDoS attack: 100 Gbps → Distributed across 10 regions
Result: 10 Gbps per region (manageable)

Each region:
- Rate limiting: 10K req/s per IP
- WAF: Block malicious patterns
- Auto-scaling: Add servers if needed
```

**Cloudflare DDoS Protection**:
```
1. Traffic hits Cloudflare edge (Anycast, 200+ locations)
2. DDoS attack traffic spread across all edges
3. Each edge applies rate limiting, WAF rules
4. Clean traffic proxied to origin server

Result: Origin never sees attack traffic
Mitigation capacity: 100+ Tbps (terabits/second)
```

---

## 7. Real-World Examples & Case Studies

### AWS Global Accelerator

**Architecture**:
```
User (Tokyo) → AWS Edge Location (Tokyo)
  ↓ (AWS Private Network, not public Internet)
Application Load Balancer (AP-Southeast)
  ↓
EC2 instances (AP-Southeast)
```

**How it Works**:
```
1. Two static Anycast IPs assigned to application
   - 75.2.60.5
   - 99.83.190.51

2. Announced from AWS edge locations (90+ globally)

3. User connects to 75.2.60.5
   → Routes to nearest AWS edge (Tokyo)

4. Traffic travels over AWS private network (faster, more reliable)
   → Reaches application endpoint (AP-Southeast ALB)

5. If AP-Southeast fails:
   → Automatically routes to next-nearest endpoint (US-West)
```

**Benefits**:
```
- 60% performance improvement (vs public Internet)
  Reason: AWS network optimized, bypasses congested ISP links

- Instant failover (30 seconds)
  Reason: Anycast BGP convergence

- DDoS protection built-in
  Reason: AWS Shield integrated
```

**Cost**:
```
- Fixed fee: $0.025/hour = $18/month
- Data transfer: $0.015/GB (vs $0.09/GB standard)
  Savings: 83% cheaper than standard Internet transfer

Example: 1 TB/month transfer
  Standard: $0.09/GB × 1000 = $90
  Global Accelerator: $18 + ($0.015 × 1000) = $33
  Savings: $57/month (63%)
```

---

### Cloudflare: Global Anycast Network

**Scale**:
```
- 200+ data centers globally
- 46 million HTTP requests/second
- 8 million DNS queries/second
- 100+ Tbps DDoS mitigation capacity
```

**Architecture**:
```
Every Cloudflare data center:
- Announces same IP ranges (Anycast)
- Has full copy of customer configurations
- Can serve any customer's traffic

User in Mumbai:
1. DNS query: "example.com" → 104.16.132.229 (Cloudflare Anycast)
2. Connect to 104.16.132.229 → Routes to Mumbai edge
3. Mumbai edge:
   - Check cache: If hit, return cached content (< 10ms)
   - If miss: Proxy to origin server, cache response
4. Response returned to user (< 50ms total)
```

**Smart Routing**:
```
Not just "nearest" data center, but "best" data center:

Factors:
- Latency (ping time)
- Packet loss (network quality)
- Server load (CPU, memory usage)
- Health (is data center operational?)

Example:
- User in Paris
- Nearest edge: Paris (0ms, but overloaded)
- Next nearest: London (10ms, healthy)
- Decision: Route to London (10ms acceptable, better performance)
```

**Failover**:
```
Paris edge fails (power outage):
1. BGP withdraws Paris announcement (30 seconds)
2. Traffic automatically re-routes to London edge
3. Users experience 10ms latency increase (vs 500ms if no Global LB)
4. When Paris recovers: BGP re-announces, traffic returns
```

---

### Netflix: Multi-Region Deployment

**Architecture**:
```
3 AWS Regions:
- US-East (Primary)
- US-West (Secondary)
- EU-West (Secondary)

Route 53 Latency-Based Routing:
- User in New York → US-East (10ms)
- User in Los Angeles → US-West (15ms)
- User in London → EU-West (20ms)
```

**Chaos Engineering**:
```
Chaos Kong: Simulated region failure

Test:
1. Trigger "US-East region failure" (in production!)
2. Route 53 detects health check failures
3. Routes all traffic to US-West and EU-West
4. Monitor: Can remaining regions handle load?

Result:
- Discovered: US-West couldn't handle 100% of US-East traffic
- Fix: Increased capacity in all regions (N+1 redundancy)
- Now: Any region can fail, others absorb traffic
```

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "How do you implement global load balancing?"

**Structured Answer**:

**"Global load balancing distributes traffic across multiple geographic regions to minimize latency and improve availability. Three main approaches:**

**1. DNS-Based (Route 53, Akamai):**
```
- GeoDNS: Return different IPs based on user location
  US users → US-East IP
  EU users → EU-West IP
- Latency-based: Return IP of region with lowest latency to user
- Health checks: If region fails, return next-best IP
- Limitations: DNS TTL caching (60-second delay), no real-time load info
```

**2. Anycast (Cloudflare, Google Cloud):**
```
- Same IP announced from multiple regions
- Network automatically routes to nearest region (BGP)
- Advantages: Instant failover (30-second BGP), DDoS mitigation
- Limitations: Stateless only (TCP connections can break), complex setup
```

**3. Application-Level (NGINX, HAProxy):**
```
- Layer 7 load balancer routes based on real-time health + latency
- Advantages: Full control, custom routing logic
- Limitations: Single point of failure (need redundant LBs)
```

**Real-world: Netflix uses Route 53 latency-based routing across 3 regions (US-East, US-West, EU-West). Cloudflare uses Anycast with 200+ data centers, 46M requests/second."**

---

### Follow-Up 1: "How do you handle database replication across regions?"

**Answer**:

**"Three strategies based on consistency vs latency requirements:**

**1. Multi-Master (Active-Active):**
```
All regions accept writes, replicate bidirectionally

Pros: Low latency (local writes), high availability
Cons: Conflicts (if both regions write same record)

Conflict resolution:
- Last Write Wins (LWW): timestamp determines winner
- Application logic: Merge changes (e.g., shopping cart items)

Use case: DynamoDB Global Tables (eventual consistency)
```

**2. Master-Replica (Active-Passive):**
```
One region (master) accepts writes, others (replicas) read-only

Pros: No conflicts (single source of truth)
Cons: Write latency (all writes go to master region)

Replication: Asynchronous (100-300ms lag)

Use case: AWS RDS Read Replicas
```

**3. Geo-Sharding:**
```
US users' data → US region
EU users' data → EU region

Pros: No replication lag, no conflicts
Cons: Cross-region queries slow (if user moves)

Use case: Instagram (US users' photos in US, EU users' in EU)
```

**Real-world: Netflix uses master-replica (writes to US-East, replicas in other regions). Cassandra uses multi-master with tunable consistency (ONE, QUORUM, ALL)."**

---

### Follow-Up 2: "What happens if a region fails?"

**Answer**:

**"Failover process depends on Global LB type:**

**DNS-Based Failover (Route 53):**
```
T=0s:   EU-West region fails
T=10s:  Health checks fail (3 consecutive)
T=20s:  Route 53 marks EU-West unhealthy
T=30s:  DNS responses updated (EU users → US-East IP)
T=60s:  EU users connect to US-East (after DNS cache expires)

Downtime: 60 seconds (DNS TTL)
Mitigation: Lower TTL to 10-30 seconds
```

**Anycast Failover:**
```
T=0s:   EU-West region fails
T=10s:  BGP withdraws EU-West announcement
T=30s:  Internet routers re-converge (route to next-nearest)
T=40s:  EU users connect to US-East

Downtime: 30-60 seconds (BGP convergence)
```

**Application-Level Failover:**
```
T=0s:   EU-West region fails
T=5s:   Health check fails (timeout)
T=10s:  Load balancer detects failure
T=11s:  Next request routed to US-East

Downtime: 10 seconds (next request after failure)
```

**Graceful degradation:**
```python
def get_data(user_id):
    try:
        return fetch_from_primary()  # EU-West
    except:
        return fetch_from_secondary()  # US-East (degraded latency)
```

**Real-world: AWS S3 automatically replicates across regions. If one region fails, traffic instantly routed to another (users don't notice)."**

---

### Follow-Up 3: "How do you measure global load balancer effectiveness?"

**Answer**:

**"Key metrics:**

**1. Latency by Region:**
```
Target: < 50ms P95 latency for all users

Measurement:
SELECT region, PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)
FROM request_logs
GROUP BY region;

US-East: 25ms (✅ good)
EU-West: 40ms (✅ good)
AP-Southeast: 120ms (❌ too high)
  → Action: Add region in Singapore (reduce to 30ms)
```

**2. Availability by Region:**
```
Target: 99.99% uptime per region

Calculation:
Uptime = (Total time - Downtime) / Total time
       = (720 hours - 0.05 hours) / 720
       = 99.993%

Alert if any region < 99.9%
```

**3. Failover Time:**
```
Target: < 60 seconds to detect and reroute

Test: Chaos engineering (kill region, measure time to recovery)

def test_failover():
    # 1. Record baseline
    start = time.time()
    
    # 2. Kill region
    kill_region('EU-West')
    
    # 3. Monitor: When do requests start succeeding?
    while True:
        if request_succeeds(from_region='EU'):
            failover_time = time.time() - start
            break
    
    assert failover_time < 60  # seconds

Run weekly, track trend
```

**4. Traffic Distribution:**
```
Expected: Traffic proportional to population
- US: 40% of traffic → US-East
- EU: 35% of traffic → EU-West
- Asia: 25% of traffic → AP-Southeast

Actual (check dashboard):
- US-East: 38% (✅ close)
- EU-West: 34% (✅ close)
- AP-Southeast: 28% (⚠️ higher than expected)
  → Investigation: Check routing logic, GeoDNS config
```

**Real-world: Cloudflare dashboard shows real-time latency by edge location. Alert if P95 latency > 100ms or if > 1% error rate."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Complete Global Load Balancer Implementation

```python
import requests
import time
from dataclasses import dataclass
from typing import List, Optional
import geoip2.database

@dataclass
class Region:
    name: str
    country_codes: List[str]  # Countries served by this region
    endpoint_url: str
    latitude: float
    longitude: float
    is_healthy: bool = True
    latency_ms: float = 0.0
    error_rate: float = 0.0

class GlobalLoadBalancer:
    def __init__(self):
        self.regions = [
            Region(
                name='US-East',
                country_codes=['US', 'CA', 'MX'],
                endpoint_url='https://us-east.example.com',
                latitude=37.7749,
                longitude=-122.4194
            ),
            Region(
                name='EU-West',
                country_codes=['GB', 'FR', 'DE', 'IT', 'ES'],
                endpoint_url='https://eu-west.example.com',
                latitude=51.5074,
                longitude=-0.1278
            ),
            Region(
                name='AP-Southeast',
                country_codes=['JP', 'CN', 'IN', 'SG', 'AU'],
                endpoint_url='https://ap-southeast.example.com',
                latitude=35.6762,
                longitude=139.6503
            )
        ]
        
        self.geoip_reader = geoip2.database.Reader('GeoLite2-City.mmdb')
        self.health_check_interval = 10  # seconds
        self.start_health_checks()
    
    def start_health_checks(self):
        """Start background health checks for all regions"""
        import threading
        
        def health_check_loop():
            while True:
                for region in self.regions:
                    self.check_region_health(region)
                time.sleep(self.health_check_interval)
        
        threading.Thread(target=health_check_loop, daemon=True).start()
    
    def check_region_health(self, region: Region):
        """Perform health check on a region"""
        try:
            start = time.time()
            response = requests.get(
                f"{region.endpoint_url}/health",
                timeout=5
            )
            latency = (time.time() - start) * 1000  # ms
            
            region.is_healthy = (response.status_code == 200)
            region.latency_ms = latency
            
            # Calculate error rate (rolling window)
            # Simplified: Track last 100 requests
            # In production: Use time-series database (Prometheus)
            
            if response.status_code == 200:
                print(f"✅ {region.name}: {latency:.0f}ms")
            else:
                print(f"⚠️ {region.name}: HTTP {response.status_code}")
                region.error_rate = 1.0  # 100% error
        except Exception as e:
            region.is_healthy = False
            region.latency_ms = float('inf')
            region.error_rate = 1.0
            print(f"❌ {region.name}: {e}")
    
    def route_request(self, user_ip: str) -> Region:
        """
        Route user to best region based on:
        1. Geographic proximity
        2. Region health
        3. Current latency
        """
        # Step 1: Get user's country from IP
        user_country = self.get_country_from_ip(user_ip)
        
        # Step 2: Filter healthy regions
        healthy_regions = [r for r in self.regions if r.is_healthy]
        
        if not healthy_regions:
            raise Exception("All regions unhealthy!")
        
        # Step 3: Find geographically closest region
        closest_region = self.get_closest_region(user_country, healthy_regions)
        
        # Step 4: Check if closest region is acceptable
        # If latency > 100ms or error rate > 5%, use next-best
        if closest_region.latency_ms > 100 or closest_region.error_rate > 0.05:
            alternative = self.get_best_alternative(healthy_regions, exclude=closest_region)
            
            if alternative and alternative.latency_ms < closest_region.latency_ms * 0.8:
                print(f"🔄 Using {alternative.name} instead of {closest_region.name} (better performance)")
                return alternative
        
        return closest_region
    
    def get_country_from_ip(self, ip: str) -> str:
        """Get country code from IP address using GeoIP"""
        try:
            response = self.geoip_reader.city(ip)
            return response.country.iso_code
        except:
            return 'US'  # Default to US if lookup fails
    
    def get_closest_region(self, country: str, regions: List[Region]) -> Region:
        """Find geographically closest region to user"""
        # Find region that serves this country
        for region in regions:
            if country in region.country_codes:
                return region
        
        # Fallback: Return region with lowest latency
        return min(regions, key=lambda r: r.latency_ms)
    
    def get_best_alternative(
        self,
        regions: List[Region],
        exclude: Optional[Region] = None
    ) -> Optional[Region]:
        """Find best alternative region (lowest latency)"""
        candidates = [r for r in regions if r != exclude]
        
        if not candidates:
            return None
        
        return min(candidates, key=lambda r: r.latency_ms)
    
    def handle_request(self, user_ip: str, path: str, method: str = 'GET', data: dict = None):
        """
        Handle user request with automatic failover
        """
        # Route to best region
        primary_region = self.route_request(user_ip)
        
        # Try primary region
        try:
            return self.send_request(primary_region, path, method, data)
        except Exception as e:
            print(f"❌ Primary region {primary_region.name} failed: {e}")
        
        # Failover to alternative regions
        healthy_regions = [
            r for r in self.regions
            if r.is_healthy and r != primary_region
        ]
        
        for fallback_region in healthy_regions:
            try:
                print(f"🔄 Failing over to {fallback_region.name}")
                return self.send_request(fallback_region, path, method, data)
            except Exception as e:
                print(f"❌ Fallback region {fallback_region.name} failed: {e}")
        
        # All regions failed
        raise Exception("All regions unavailable")
    
    def send_request(self, region: Region, path: str, method: str, data: dict):
        """Send request to specific region"""
        url = f"{region.endpoint_url}{path}"
        
        if method == 'GET':
            response = requests.get(url, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response.raise_for_status()
        return response.json()
    
    def get_metrics(self):
        """Get current metrics for all regions"""
        return [
            {
                'region': r.name,
                'healthy': r.is_healthy,
                'latency_ms': r.latency_ms,
                'error_rate': r.error_rate
            }
            for r in self.regions
        ]

# Usage Example
glb = GlobalLoadBalancer()

# Handle user request
user_ip = '203.0.113.50'  # Example: Tokyo IP
try:
    response = glb.handle_request(
        user_ip=user_ip,
        path='/api/users/123',
        method='GET'
    )
    print(f"✅ Response: {response}")
except Exception as e:
    print(f"❌ All regions failed: {e}")

# Get metrics
metrics = glb.get_metrics()
for m in metrics:
    print(f"{m['region']}: {'✅' if m['healthy'] else '❌'} {m['latency_ms']:.0f}ms")
```

### Global Load Balancing Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│              GLOBAL LOAD BALANCING ARCHITECTURE                │
└────────────────────────────────────────────────────────────────┘

                         Internet
                            │
                            ↓
                  ┌─────────────────┐
                  │ Global DNS/LB   │
                  │ (Route 53 or    │
                  │  Anycast)       │
                  └────────┬────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ↓                 ↓                 ↓
   ┌──────────┐      ┌──────────┐    ┌──────────┐
   │ US-East  │      │ EU-West  │    │AP-Southeast│
   │  Region  │      │  Region  │    │  Region  │
   └────┬─────┘      └────┬─────┘    └────┬─────┘
        │                 │                │
        ↓                 ↓                ↓
   ┌─────────┐       ┌─────────┐     ┌─────────┐
   │Regional │       │Regional │     │Regional │
   │  Load   │       │  Load   │     │  Load   │
   │Balancer │       │Balancer │     │Balancer │
   └────┬────┘       └────┬────┘     └────┬────┘
        │                 │                │
    ┌───┴───┐         ┌───┴───┐       ┌───┴───┐
    ↓       ↓         ↓       ↓       ↓       ↓
 ┌────┐  ┌────┐   ┌────┐  ┌────┐  ┌────┐  ┌────┐
 │App │  │App │   │App │  │App │  │App │  │App │
 │Srv1│  │Srv2│   │Srv3│  │Srv4│  │Srv5│  │Srv6│
 └──┬─┘  └──┬─┘   └──┬─┘  └──┬─┘  └──┬─┘  └──┬─┘
    └───┬───┘         └───┬───┘       └───┬───┘
        ↓                 ↓                ↓
   ┌─────────┐       ┌─────────┐     ┌─────────┐
   │Database │       │Database │     │Database │
   │US-East  │←────→│EU-West  │←───→│AP-SE    │
   │(Master) │ Repl. │(Replica)│Repl.│(Replica)│
   └─────────┘       └─────────┘     └─────────┘


ROUTING DECISION FLOW:
┌──────────────┐
│ User Request │
└──────┬───────┘
       ↓
┌──────────────────┐
│ 1. Get User IP   │
│    203.0.113.50  │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 2. GeoIP Lookup  │
│    → Tokyo, JP   │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 3. Find Closest  │
│    Region        │
│    → AP-SE       │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 4. Health Check  │
│    AP-SE healthy?│
└──────┬───────────┘
       │
   ┌───┴───┐
   Yes     No
   │       │
   ↓       ↓
Route to  Route to
AP-SE     US-West
(30ms)    (150ms)


FAILOVER SCENARIO:
T=0s:  EU-West region fails (data center outage)
       │
       ↓
T=10s: Health checks fail (3 consecutive timeouts)
       │
       ↓
T=20s: Global LB marks EU-West unhealthy
       │
       ↓
T=30s: DNS updated: EU users → US-East
       │
       ↓
T=60s: EU users connecting to US-East
       (degraded latency: 150ms vs 25ms)
       │
       ↓
T=2hr: EU-West restored, health checks succeed
       │
       ↓
T=2hr  DNS updated: EU users → EU-West
+30s   (latency back to normal: 25ms)
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Global Load Balancing Matters

**Without Global LB**:
```
All users → Single data center (US-East)

Problems:
- High latency for distant users (EU: 150ms, Asia: 300ms)
- Single point of failure (data center outage → complete downtime)
- No disaster recovery
- Poor user experience outside primary region
```

**With Global LB**:
```
US users → US-East (25ms)
EU users → EU-West (25ms)
Asia users → AP-Southeast (30ms)

Benefits:
- Low latency for all users (< 50ms)
- High availability (99.99%+, multi-region redundancy)
- Automatic failover (region fails → route to next-closest)
- DDoS mitigation (traffic distributed globally)
```

### How to Implement

**Three Approaches**:

| Approach | Complexity | Cost | Failover Time | Best For |
|----------|------------|------|---------------|----------|
| **DNS-Based** (Route 53) | ⭐⭐ Medium | $$ | 60s | Most applications |
| **Anycast** (Cloudflare) | ⭐⭐⭐⭐ Hard | $$$ | 30s | High-traffic, DDoS-prone |
| **Application-Level** | ⭐⭐⭐ Medium | $$ | 10s | Custom routing logic |

**Recommendation**: Start with **DNS-based (Route 53)**. Upgrade to Anycast only if need < 30s failover or high DDoS risk.

### When to Implement

**Consider Global LB if**:
- Latency > 100ms for > 20% of users
- Need 99.99% availability (52.6 min downtime/year)
- Users distributed globally (US, EU, Asia)
- DDoS attacks are concern

**Don't implement if**:
- All users in single region (US-only product)
- Budget < $2,000/month (cost of multi-region)
- Acceptable to have single data center

### Cost Analysis

**Single Region**: $1,460/month (99.9% availability, high latency for distant users)

**Multi-Region with Global LB**: $2,607/month (99.99% availability, < 50ms latency globally)

**Cost increase**: 79% ($1,147/month more)

**ROI calculation**:
```
Downtime reduction: 8.76 hours/year → 52.6 minutes/year
Downtime prevented: 8.2 hours/year

Revenue per hour: $10,000 (e.g., e-commerce)
Downtime cost saved: 8.2 hours × $10,000 = $82,000/year

Additional cost: $1,147/month × 12 = $13,764/year
Net savings: $82,000 - $13,764 = $68,236/year

ROI: 495% (pays for itself 5x over)
```

### Production Checklist

- [ ] **Choose approach**: DNS-based (start here) vs Anycast (if needed) vs App-level (custom routing)
- [ ] **Select regions**: 3+ regions (US, EU, Asia) for global coverage
- [ ] **Configure GeoDNS**: Route users to nearest region (Route 53 geolocation)
- [ ] **Implement health checks**: Every 10 seconds, mark unhealthy after 3 failures
- [ ] **Setup data replication**: Master-replica (writes to primary) or multi-master (conflicts possible)
- [ ] **Test failover**: Chaos engineering (kill region, verify automatic rerouting)
- [ ] **Monitor metrics**: Latency by region, availability by region, failover time
- [ ] **Configure alerts**: Alert if region unavailable > 1 minute or latency > 100ms
- [ ] **Document procedures**: Runbooks for manual failover (if needed)
- [ ] **Capacity plan**: Ensure each region can handle 2x traffic (if another region fails)

### Bottom Line

**Global load balancing is essential for any application with global users. The 79% cost increase ($1,147/month) is easily justified by improved user experience (< 50ms latency globally) and reduced downtime (99.99% vs 99.9%). Start with AWS Route 53 latency-based routing—simple to implement, proven at scale (Netflix uses it).**

**Real-world lesson from Cloudflare**: "Our Anycast network has 200+ data centers, each announcing the same IP. When one fails, traffic automatically reroutes to the next-nearest (30 seconds). This architecture has saved customers from countless regional outages, DDoS attacks, and network issues. Global load balancing isn't optional—it's the foundation of modern Internet infrastructure."

