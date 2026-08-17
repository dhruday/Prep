# 36. DNS Basics

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**DNS (Domain Name System)** is the hierarchical, distributed database system that translates human-readable domain names (like `www.example.com`) into IP addresses (like `192.0.2.1`) that computers use to communicate. It's often called the "phonebook of the internet."

**What it is:**
- Distributed database mapping domain names to IP addresses
- Hierarchical system with root, TLD, and authoritative nameservers
- Caching at multiple levels (browser, OS, ISP, recursive resolvers)
- Protocol using UDP port 53 (TCP for large responses)

**Why it exists:**
- Humans remember names better than IP addresses
- Decouple service names from infrastructure (change IPs without changing names)
- Enable load balancing, failover, and geographic routing
- Support service discovery in distributed systems

**Problem it solves:**
- Need human-friendly names instead of IP addresses
- Services change IP addresses (scaling, migration, failures)
- Geographic distribution (different IPs for different locations)
- Load distribution across multiple servers

**In large-scale distributed systems:**
- Service discovery (microservices find each other by name)
- Load balancing (DNS returns multiple IPs, round-robin)
- Geographic routing (serve users from nearest data center)
- Failover (remove unhealthy servers from DNS responses)
- Blue-green deployments (switch traffic by changing DNS)

💡 **Interview Opening:** "DNS is the hierarchical system that translates domain names to IP addresses, consisting of multiple layers: root servers, TLD servers (`.com`, `.org`), and authoritative nameservers. A typical resolution involves recursive queries through this hierarchy, with aggressive caching at every level (browser, OS, ISP) to reduce latency from 100+ms to < 10ms. At scale, companies like Netflix and AWS use DNS for load balancing (returning multiple IPs), geographic routing (different IPs per region), and traffic management (weighted responses, health checks). The main limitation is TTL-based caching—changes propagate slowly, making instant failover impossible with DNS alone."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **DNS Hierarchy**

```
                    ┌──────────┐
                    │   Root   │
                    │    .     │
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐     ┌───▼────┐     ┌───▼────┐
    │  .com   │     │  .org  │     │  .net  │
    │   TLD   │     │   TLD  │     │   TLD  │
    └────┬────┘     └────────┘     └────────┘
         │
    ┌────▼──────────────┐
    │  example.com      │
    │  Authoritative NS │
    └────┬──────────────┘
         │
    ┌────▼────────────────┐
    │ www.example.com     │
    │ A Record: 192.0.2.1 │
    └─────────────────────┘
```

**13 Root Servers (Logical):**
```
a.root-servers.net  (Verisign)
b.root-servers.net  (USC-ISI)
c.root-servers.net  (Cogent)
d.root-servers.net  (University of Maryland)
e.root-servers.net  (NASA)
...
m.root-servers.net  (WIDE Project)

Actually 1000+ physical servers via anycast
Each root server IP is shared by hundreds of actual servers worldwide
```

### **DNS Resolution Process**

#### **Recursive Query (Full Resolution)**

```
1. User types www.example.com in browser
2. Browser checks cache → Miss
3. OS checks cache → Miss
4. OS sends query to Recursive Resolver (ISP DNS or 8.8.8.8)

┌────────────────────────────────────────────────────────┐
│                                                        │
│  Client → Recursive Resolver                          │
│             ↓                                         │
│             Query: "Where is www.example.com?"        │
│             ↓                                         │
│  Recursive Resolver → Root Nameserver                 │
│             ↓                                         │
│             Response: "Ask .com TLD server"           │
│             (Returns: a.gtld-servers.net)            │
│             ↓                                         │
│  Recursive Resolver → .com TLD Nameserver             │
│             ↓                                         │
│             Response: "Ask example.com's NS"          │
│             (Returns: ns1.example.com)               │
│             ↓                                         │
│  Recursive Resolver → example.com Authoritative NS    │
│             ↓                                         │
│             Response: "www.example.com = 192.0.2.1"  │
│             (A Record)                                │
│             ↓                                         │
│  Recursive Resolver → Client                          │
│             ↓                                         │
│             Response: "192.0.2.1"                    │
│                                                        │
└────────────────────────────────────────────────────────┘

Total time: 100-300ms (without caching)
```

#### **With Caching**

```
Subsequent request for www.example.com:

1. Browser cache → Hit! (10 minutes TTL)
   Return: 192.0.2.1
   Time: < 1ms

Subsequent request for api.example.com (same domain):

1. Browser cache → Miss
2. OS cache → Miss
3. Recursive resolver cache → Partial hit! (.com TLD cached)
   
   Steps:
   - Check cache for api.example.com → Miss
   - Check cache for .com TLD NS → Hit!
   - Query example.com authoritative NS
   - Get api.example.com = 192.0.2.2
   
   Time: ~50ms (skipped root and TLD queries)
```

### **DNS Record Types**

#### **A Record (IPv4 Address)**

```
www.example.com.    300    IN    A    192.0.2.1

Format:
- Name: www.example.com.
- TTL: 300 seconds (5 minutes)
- Class: IN (Internet)
- Type: A (Address)
- Value: 192.0.2.1 (IPv4 address)
```

#### **AAAA Record (IPv6 Address)**

```
www.example.com.    300    IN    AAAA    2001:0db8::1
```

#### **CNAME Record (Canonical Name / Alias)**

```
www.example.com.    300    IN    CNAME    example.com.

Resolution chain:
www.example.com → CNAME → example.com → A → 192.0.2.1

Use case: Alias multiple names to same target
```

#### **MX Record (Mail Exchange)**

```
example.com.    3600    IN    MX    10 mail1.example.com.
example.com.    3600    IN    MX    20 mail2.example.com.

Format:
- Priority: 10 (lower = higher priority)
- Mail server: mail1.example.com

Mail delivery:
1. Try mail1.example.com (priority 10)
2. If fail, try mail2.example.com (priority 20)
```

#### **NS Record (Nameserver)**

```
example.com.    86400    IN    NS    ns1.example.com.
example.com.    86400    IN    NS    ns2.example.com.

Delegates authority for example.com to these nameservers
```

#### **TXT Record (Text Information)**

```
example.com.    300    IN    TXT    "v=spf1 include:_spf.google.com ~all"
example.com.    300    IN    TXT    "google-site-verification=xyz123"

Use cases:
- SPF (Sender Policy Framework) for email validation
- Domain ownership verification
- DKIM keys for email signing
```

#### **SRV Record (Service Location)**

```
_http._tcp.example.com.    300    IN    SRV    10 60 80 server1.example.com.

Format:
- Priority: 10
- Weight: 60 (for load balancing)
- Port: 80
- Target: server1.example.com

Use case: Service discovery (especially in microservices)
```

#### **CAA Record (Certification Authority Authorization)**

```
example.com.    3600    IN    CAA    0 issue "letsencrypt.org"

Specifies which CAs can issue certificates for this domain
```

### **DNS Query Tools**

#### **dig (Domain Information Groper)**

```bash
# Basic A record query
$ dig www.example.com

; <<>> DiG 9.16.1 <<>> www.example.com
;; ANSWER SECTION:
www.example.com.    300    IN    A    93.184.216.34

# Query specific nameserver
$ dig @8.8.8.8 www.example.com

# Trace full resolution path
$ dig +trace www.example.com

; <<>> DiG 9.16.1 <<>> +trace www.example.com
.            518400    IN    NS    a.root-servers.net.
com.         172800    IN    NS    a.gtld-servers.net.
example.com. 172800    IN    NS    a.iana-servers.net.
www.example.com. 300   IN    A    93.184.216.34

# Get all records
$ dig www.example.com ANY

# Reverse DNS lookup
$ dig -x 93.184.216.34
```

#### **nslookup**

```bash
$ nslookup www.example.com

Server:  8.8.8.8
Address:  8.8.8.8#53

Non-authoritative answer:
Name:    www.example.com
Address: 93.184.216.34
```

#### **host**

```bash
$ host www.example.com
www.example.com has address 93.184.216.34

$ host -t MX example.com
example.com mail is handled by 10 mail.example.com.
```

### **DNS Load Balancing**

#### **Round-Robin DNS**

```
# Return multiple A records
www.example.com.    60    IN    A    192.0.2.1
www.example.com.    60    IN    A    192.0.2.2
www.example.com.    60    IN    A    192.0.2.3

Client queries:
- Query 1: Gets [192.0.2.1, 192.0.2.2, 192.0.2.3] (order rotates)
- Query 2: Gets [192.0.2.2, 192.0.2.3, 192.0.2.1]
- Query 3: Gets [192.0.2.3, 192.0.2.1, 192.0.2.2]

Client typically uses first IP in list
Result: Traffic distributed across 3 servers
```

**Limitations:**
```
1. No health checking
   - If server 2 is down, 33% of clients still try it
   - DNS doesn't know about server health

2. Caching makes distribution uneven
   - Clients cache full list for TTL duration
   - All subsequent requests go to same server
   - TTL 60s = 1 minute of requests to same server

3. No consideration of load
   - Doesn't account for server capacity
   - Overloaded server still gets same traffic
```

#### **Geographic DNS (Geo-routing)**

```
Query from US:
www.example.com → 192.0.2.1 (US East)

Query from Europe:
www.example.com → 198.51.100.1 (EU West)

Query from Asia:
www.example.com → 203.0.113.1 (AP Southeast)

Implementation (AWS Route 53):

{
  "Name": "www.example.com",
  "Type": "A",
  "GeolocationRoutingPolicy": {
    "US": "192.0.2.1",
    "EU": "198.51.100.1",
    "AP": "203.0.113.1",
    "Default": "192.0.2.1"
  }
}

Benefits:
- Lower latency (serve from nearest datacenter)
- Compliance (keep data in specific regions)
- Load distribution
```

#### **Weighted DNS**

```
# Route 70% to server1, 30% to server2 (for testing)

www.example.com.    60    IN    A    192.0.2.1 (weight 70)
www.example.com.    60    IN    A    192.0.2.2 (weight 30)

Use cases:
- Blue-green deployment (gradually shift traffic)
- A/B testing (split traffic for experiments)
- Capacity-based routing (route more to powerful servers)
```

#### **Latency-Based Routing**

```
Query from client:
1. DNS resolver measures latency to each region
2. Returns IP of region with lowest latency

Example (AWS Route 53):
- Server in us-east-1: 20ms
- Server in eu-west-1: 100ms
- Server in ap-southeast-1: 200ms

Result: Return us-east-1 IP (192.0.2.1)

Benefits:
- Best performance for each user
- Adapts to network conditions
```

#### **Health-Check Based Routing**

```
www.example.com → [192.0.2.1, 192.0.2.2, 192.0.2.3]

Health check every 30 seconds:
- HTTP GET /health → 200 OK

Server 2 fails health check:
www.example.com → [192.0.2.1, 192.0.2.3] (remove 192.0.2.2)

Server 2 recovers:
www.example.com → [192.0.2.1, 192.0.2.2, 192.0.2.3] (add back)

Implementation (AWS Route 53):

{
  "HealthCheckConfig": {
    "Type": "HTTP",
    "ResourcePath": "/health",
    "Port": 80,
    "RequestInterval": 30,
    "FailureThreshold": 3
  }
}
```

### **DNS TTL (Time To Live)**

**TTL Trade-offs:**

```
High TTL (e.g., 3600s = 1 hour):
✅ Fewer DNS queries → Lower DNS costs
✅ Faster for clients (cache hit)
✅ Less load on authoritative DNS servers
❌ Changes propagate slowly (up to 1 hour)
❌ Slow failover (stuck with bad IP)
❌ Hard to do rolling deploys

Low TTL (e.g., 60s = 1 minute):
✅ Fast propagation of changes
✅ Quick failover (1 minute max)
✅ Easier traffic management
❌ More DNS queries → Higher costs
❌ Slower for clients (more cache misses)
❌ Higher load on DNS servers
```

**Recommended TTLs:**

```
Static content (rarely changes):
- TTL: 86400 (24 hours)
- Example: www.example.com → CDN

Active load balancing:
- TTL: 300 (5 minutes)
- Example: api.example.com → API servers

Critical services (need fast failover):
- TTL: 60 (1 minute)
- Example: payment.example.com → Payment gateway

Pre-deployment (preparing for change):
- Reduce TTL to 60s → Wait 24 hours (old TTL) → Make change
- After change propagates → Increase TTL back
```

### **DNS Security**

#### **DNS Cache Poisoning**

```
Attack:
1. Attacker sends fake DNS response
2. Recursive resolver caches fake IP
3. All users get poisoned response

Example:
Real: www.bank.com → 192.0.2.1
Poisoned: www.bank.com → 203.0.113.1 (attacker's server)

Mitigation:
- DNSSEC (cryptographic signatures)
- Randomize source port (hard to guess transaction ID)
- Validate responses (check domain names match)
```

#### **DNSSEC (DNS Security Extensions)**

```
Adds cryptographic signatures to DNS records

Zone signing:
1. Generate key pair (KSK + ZSK)
2. Sign all records with ZSK (Zone Signing Key)
3. Sign ZSK with KSK (Key Signing Key)
4. Publish KSK hash to parent zone

Verification:
1. Client requests www.example.com
2. Receives A record + RRSIG (signature)
3. Requests DNSKEY (public key)
4. Verifies RRSIG using DNSKEY
5. Validates chain of trust to root

Benefits:
- Prevents cache poisoning
- Authenticates DNS responses
- Detects MITM attacks

Drawbacks:
- Complex to implement
- Larger DNS responses (slower)
- Not widely adopted (~25% of domains)
```

#### **DNS over HTTPS (DoH) / DNS over TLS (DoT)**

```
Traditional DNS:
Client → UDP port 53 → DNS Server
❌ Unencrypted (ISP can see queries)
❌ Vulnerable to MITM attacks

DNS over HTTPS:
Client → HTTPS (port 443) → DoH Server (cloudflare.com/dns-query)
✅ Encrypted (privacy)
✅ Harder to block (looks like normal HTTPS)
❌ Bypass corporate DNS policies

DNS over TLS:
Client → TLS (port 853) → DoT Server
✅ Encrypted
✅ Easier to block (dedicated port)

Public DoH/DoT providers:
- Cloudflare: 1.1.1.1
- Google: 8.8.8.8
- Quad9: 9.9.9.9
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **DNS Query Load**

**Scenario:** Website with 10 million daily active users

**Calculations:**

```
Assumptions:
- Average user makes 50 page loads per day
- Each page load: 1 HTML + 20 resources (CSS, JS, images)
- Each resource requires DNS lookup (if not cached)

DNS queries per user per day:
50 page loads × 21 resources = 1,050 DNS queries

Total DNS queries per day:
10M users × 1,050 queries = 10.5 billion queries

Queries per second (average):
10.5B / 86,400 = 121,527 QPS

Peak (assume 5x average):
121,527 × 5 = 607,635 QPS

With caching (assume 90% cache hit rate):
607,635 × 0.1 = 60,764 QPS actually hit DNS

Cloud DNS costs (AWS Route 53):
- $0.40 per million queries
- 10.5B queries × $0.40/1M = $4,200/month
- With caching: $420/month

Latency budget:
Without caching: 100-300ms (full resolution)
With caching:
- Browser cache: < 1ms (hit rate 40%)
- OS cache: ~5ms (hit rate 30%)
- Recursive resolver: ~20ms (hit rate 20%)
- Authoritative: ~100ms (hit rate 10%)

Average latency:
(0.4 × 1ms) + (0.3 × 5ms) + (0.2 × 20ms) + (0.1 × 100ms)
= 0.4 + 1.5 + 4 + 10 = 15.9ms average
```

### **DNS Server Capacity**

```
Single DNS server capacity:
- Authoritative DNS: 100,000-500,000 QPS
- Recursive resolver: 50,000-100,000 QPS

For 60,764 QPS (after caching):
Authoritative servers needed: 1-2 (with redundancy: 4-6)

High availability setup:
- 2 nameservers (minimum)
- 4-6 nameservers (recommended)
- Geographic distribution (multi-region)

Scaling pattern:
0-10K QPS:     2 servers
10K-50K QPS:   4 servers
50K-200K QPS:  8 servers
200K+ QPS:     Use managed DNS (Route 53, Cloudflare)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **DNS Zone File**

```
$ORIGIN example.com.
$TTL 3600

; SOA Record (Start of Authority)
@    IN    SOA    ns1.example.com. admin.example.com. (
            2024011501  ; Serial (YYYYMMDDNN)
            7200        ; Refresh (2 hours)
            3600        ; Retry (1 hour)
            1209600     ; Expire (2 weeks)
            3600        ; Minimum TTL (1 hour)
        )

; Nameservers
@    IN    NS     ns1.example.com.
@    IN    NS     ns2.example.com.

; A Records (IPv4)
@                IN    A      192.0.2.1
www              IN    A      192.0.2.1
api              IN    A      192.0.2.10
api              IN    A      192.0.2.11

; AAAA Records (IPv6)
www              IN    AAAA   2001:0db8::1

; CNAME Records (Aliases)
blog             IN    CNAME  www.example.com.
shop             IN    CNAME  shopify.example.com.

; MX Records (Mail)
@                IN    MX     10 mail1.example.com.
@                IN    MX     20 mail2.example.com.

; TXT Records
@                IN    TXT    "v=spf1 include:_spf.google.com ~all"
_dmarc           IN    TXT    "v=DMARC1; p=none; rua=mailto:dmarc@example.com"

; SRV Records (Service Discovery)
_http._tcp       IN    SRV    10 60 80 server1.example.com.
_http._tcp       IN    SRV    10 40 80 server2.example.com.

; CAA Records
@                IN    CAA    0 issue "letsencrypt.org"
```

### **Dynamic DNS Updates**

```python
import boto3

# AWS Route 53 example
route53 = boto3.client('route53')

def update_dns_record(zone_id, name, ip_address, ttl=60):
    response = route53.change_resource_record_sets(
        HostedZoneId=zone_id,
        ChangeBatch={
            'Changes': [{
                'Action': 'UPSERT',
                'ResourceRecordSet': {
                    'Name': name,
                    'Type': 'A',
                    'TTL': ttl,
                    'ResourceRecords': [{'Value': ip_address}]
                }
            }]
        }
    )
    return response

# Update www.example.com to point to new server
update_dns_record(
    zone_id='Z1234567890ABC',
    name='www.example.com',
    ip_address='192.0.2.100',
    ttl=60
)
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **DNS Redundancy**

```
Minimum configuration:
- 2 nameservers (ns1, ns2)
- Different IP addresses
- Ideally different networks/providers

Recommended configuration:
- 4+ nameservers
- Geographic distribution (US, EU, Asia)
- Different providers (AWS Route 53, Cloudflare, etc.)
- Anycast for distributed serving

Example:
example.com.    IN    NS    ns1.example.com.  (US East)
example.com.    IN    NS    ns2.example.com.  (US West)
example.com.    IN    NS    ns3.example.com.  (EU)
example.com.    IN    NS    ns4.example.com.  (Asia)

All 4 nameservers have identical zone data
Client queries any of them (usually closest)
```

### **Anycast DNS**

```
Same IP address announced from multiple locations:

ns1.example.com → 192.0.2.1

Physical servers:
- New York: 192.0.2.1 (anycast)
- London: 192.0.2.1 (anycast)
- Tokyo: 192.0.2.1 (anycast)

Client query:
- US client queries 192.0.2.1 → Routes to New York
- UK client queries 192.0.2.1 → Routes to London
- Japan client queries 192.0.2.1 → Routes to Tokyo

Benefits:
- Lowest latency (nearest server responds)
- DDoS mitigation (distribute attack across servers)
- Automatic failover (if one server down, traffic routes to next nearest)
```

### **DNS Failover**

```
Health-check based failover:

Primary: api.example.com → 192.0.2.1
Backup: api.example.com → 192.0.2.2

Health check every 30 seconds:
- HTTP GET http://192.0.2.1/health

Primary healthy:
- Return 192.0.2.1

Primary unhealthy (3 consecutive failures):
- Remove 192.0.2.1 from responses
- Return 192.0.2.2
- Alert operations team

Primary recovers:
- Add 192.0.2.1 back
- Return both IPs (or just primary)

Failover time = Health check interval × failure threshold + TTL
Example: 30s × 3 + 60s = 150 seconds (2.5 minutes)

For faster failover:
- Reduce health check interval (10s)
- Reduce failure threshold (2)
- Reduce TTL (30s)
- Result: 10s × 2 + 30s = 50 seconds
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **DNS Security Best Practices**

1. **Use DNSSEC** (if possible)
2. **Enable DNSSEC validation** on recursive resolvers
3. **Implement rate limiting** on authoritative servers
4. **Monitor for suspicious patterns** (DDoS, enumeration)
5. **Use separate zones** for public and internal DNS
6. **Restrict zone transfers** (AXFR) to trusted servers only
7. **Use DNS firewalls** (block malicious domains)
8. **Enable logging and alerts** for all DNS changes

### **Access Control**

```python
# AWS Route 53 IAM policy
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "route53:GetHostedZone",
      "route53:ListResourceRecordSets"
    ],
    "Resource": "arn:aws:route53:::hostedzone/Z1234567890ABC"
  },
  {
    "Effect": "Allow",
    "Action": [
      "route53:ChangeResourceRecordSets"
    ],
    "Resource": "arn:aws:route53:::hostedzone/Z1234567890ABC",
    "Condition": {
      "IpAddress": {
        "aws:SourceIp": "203.0.113.0/24"
      }
    }
  }]
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Netflix (Global CDN)**

**Challenge:** Serve 200 million users worldwide with low latency

**DNS Strategy:**
- Geographic DNS routing
- Latency-based routing
- Health checks on edge servers
- Dynamic TTL adjustment

**Architecture:**
```
User query: netflix.com

US user → DNS returns US CDN IP (192.0.2.1)
UK user → DNS returns UK CDN IP (198.51.100.1)
Japan user → DNS returns JP CDN IP (203.0.113.1)

Each region has multiple edge servers
DNS round-robins between healthy servers
```

### **Example 2: GitHub (Service Migration)**

**Challenge:** Migrate from on-prem to cloud without downtime

**Strategy:**
```
Week -2: Reduce TTL to 60 seconds
Week -1: Test cloud infrastructure
Day 0: Update DNS to point to cloud (takes 1 minute to propagate)
Day 1: Monitor, rollback to on-prem if issues (also 1 minute)
Week 1: Increase TTL back to 300 seconds
```

### **Example 3: AWS Route 53 (Managed DNS)**

**Scale:**
- 100+ DNS servers globally
- Anycast routing
- 100% SLA uptime
- Handles trillions of queries per month

**Features:**
- Health checks with auto-failover
- Traffic policies (weighted, geolocation, latency)
- DNSSEC support
- Integration with AWS services

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: Explain DNS and how it works in a distributed system.**

**Answer:**
"DNS is the hierarchical system that translates domain names to IP addresses. It consists of multiple layers: root servers (13 logical), TLD servers (`.com`, `.org`), and authoritative nameservers for each domain.

**Resolution process:**
1. Client queries `www.example.com`
2. Recursive resolver checks cache → Miss
3. Queries root server → Returns `.com` TLD server address
4. Queries `.com` TLD → Returns `example.com` authoritative NS
5. Queries authoritative NS → Returns A record (192.0.2.1)
6. Caches result for TTL duration (e.g., 300 seconds)

This takes 100-300ms without caching. With caching at browser, OS, and recursive resolver levels, subsequent queries take < 10ms.

**In distributed systems:**

**1. Load balancing:** Return multiple IPs in A records (round-robin DNS). Not ideal because no health checks, but simple.

**2. Geographic routing:** Return different IPs based on client location. US users get US datacenter IP, EU users get EU datacenter IP. Reduces latency by 50-80%.

**3. Health-based failover:** Continuously health check backend servers. Remove unhealthy IPs from DNS responses. Failover time = (check_interval × failure_threshold) + TTL. Typically 1-3 minutes.

**4. Service discovery:** In microservices, use DNS SRV records or internal DNS (e.g., service.namespace.svc.cluster.local in Kubernetes). Services find each other by name without hard-coded IPs.

**Key limitations:**

**1. TTL-based caching:** Changes propagate slowly. With TTL=300s, can take 5 minutes for all clients to get new IP. For critical changes, reduce TTL beforehand, wait for old TTL to expire, then make change.

**2. No real-time health checks:** DNS doesn't know if server is actually healthy at query time. It relies on periodic health checks (30-60s intervals). This is why we use load balancers in front of DNS.

**3. Client-side caching:** Browser and OS cache DNS aggressively. Even with TTL=0, some clients still cache. Can't guarantee instant failover.

**Best practices at scale:**

**1. Multiple nameservers:** Minimum 2, recommended 4+, geographically distributed.

**2. Anycast:** Same IP announced from multiple locations. Client routes to nearest. Great for DDoS mitigation.

**3. Low TTL for active services:** 60-300s for APIs, higher (3600s+) for static content.

**4. Managed DNS:** Use Route 53, Cloudflare, etc. They handle scaling, DDoS, global distribution.

**5. Monitor DNS:** Alert on query patterns, resolution failures, TTL violations.

**Real-world example:**
Netflix uses geographic DNS to route users to nearest CDN. For 200M users worldwide, this reduces latency by 60% and bandwidth by 40% (users fetch from local cache instead of origin). They combine DNS routing with application-level load balancing for fine-grained control."

### **Common Follow-Up Questions**

**Q1: How does DNS load balancing compare to Layer 4/7 load balancers?**
```
Answer:

DNS Load Balancing:
Method: Return multiple IPs, client picks one
Pros:
✅ Simple, no extra infrastructure
✅ Geographic distribution (different IPs per region)
✅ Scales infinitely (DNS is distributed)
✅ Cheap (no load balancer costs)

Cons:
❌ No real-time health checks (30-60s intervals)
❌ Uneven distribution (caching causes stickiness)
❌ Slow failover (TTL-dependent, minutes)
❌ No session persistence (unless client-side)
❌ No advanced routing (can't inspect traffic)

Layer 4 Load Balancer (TCP/UDP):
Pros:
✅ Real-time health checks (sub-second)
✅ Even distribution (per-connection)
✅ Fast failover (< 1 second)
✅ Session persistence (IP hash, cookie)

Cons:
❌ Single point of failure (need HA pair)
❌ Limited to one datacenter (regional)
❌ Cost (AWS ALB: $0.0225/hour + data)

Layer 7 Load Balancer (HTTP/HTTPS):
Pros:
✅ All Layer 4 benefits +
✅ Content-based routing (path, header, cookie)
✅ SSL termination
✅ Request-level metrics
✅ Advanced features (rate limiting, WAF)

Cons:
❌ Higher latency (packet inspection)
❌ More expensive
❌ Single region (need DNS + L7 for global)

Hybrid approach (Best):

┌────────┐
│  DNS   │ (Geographic routing, return regional LB IPs)
│ Route53│
└────┬───┘
     │
 ┌───┴────────┐
 │            │
US LB       EU LB (Layer 7, health checks, SSL)
 │            │
US servers  EU servers

Flow:
1. DNS routes user to nearest region (US or EU)
2. Regional L7 LB distributes to healthy servers
3. Sub-second failover within region
4. 1-minute failover across regions (DNS)

This combines:
- DNS for global distribution (low latency)
- L7 LB for regional traffic management (health, routing)
- Best of both worlds

Costs:
DNS only: $50/month (cheap but limited)
DNS + L7 LB: $500-1000/month (robust, production-ready)
```

**Q2: How do you handle a DNS-based DDoS attack?**
```
Answer:

DNS DDoS types:

1. Query flood:
- Attacker sends millions of queries to your authoritative DNS
- Overwhelms DNS servers

2. Amplification attack:
- Attacker sends DNS queries with spoofed source IP (victim's IP)
- DNS server responds to victim with large response
- Amplification factor: 50-100x (small query → large response)

3. NXDOMAIN attack:
- Query non-existent subdomains (random.example.com)
- Forces DNS to process and cache negative responses
- Fills cache with garbage

Mitigation strategies:

1. Anycast DNS:
- Distribute DNS across 10+ locations globally
- Attack traffic split across locations
- Each location handles fraction of attack

Example:
10 Gbps attack distributed across 10 locations = 1 Gbps per location
Most DNS servers handle 1 Gbps easily

2. Rate limiting:
- Limit queries per IP (e.g., 100 QPS)
- Block IPs exceeding threshold

iptables -A INPUT -p udp --dport 53 -m limit --limit 100/s -j ACCEPT
iptables -A INPUT -p udp --dport 53 -j DROP

3. Response Rate Limiting (RRL):
- Limit responses to identical queries from same subnet
- Prevents amplification attacks

Example:
- First query: Full response
- Queries 2-5 from same /24: Full response
- Queries 6+: Truncated response or SLIP (random drop)

4. Use managed DNS (Cloudflare, Route 53):
- Built-in DDoS protection
- Absorb attacks with massive capacity
- Cloudflare: 100+ Tbps capacity

5. DNSSEC:
- Prevents cache poisoning during attack
- Ensures response authenticity

6. Traffic scrubbing:
- Route DNS traffic through scrubbing center
- Filter malicious queries
- Forward legitimate traffic to origin

7. Monitor and alert:
- Query rate suddenly 10x normal → Alert
- High rate of NXDOMAIN → Alert
- Single IP with 1000+ QPS → Block

Real-world example:
Dyn DNS attack (2016):
- 1.2 Tbps DDoS attack (IoT botnet)
- Took down Twitter, Netflix, Reddit, etc.
- Mitigation: Emergency traffic scrubbing + Anycast distribution
- Recovery: 2 hours

Prevention:
- Use Cloudflare or AWS Route 53 (they handle DDoS)
- Enable RRL on your own DNS servers
- Monitor query patterns
- Have incident response plan
```

**Q3: What's the optimal DNS TTL and why?**
```
Answer:

TTL trade-offs:

Low TTL (60 seconds):
✅ Fast failover (1 minute max stale data)
✅ Easy traffic management (quick updates)
✅ Flexible deployments (blue-green, canary)
❌ Higher DNS query load (→ costs)
❌ Slower for users (more cache misses)
❌ Higher DNS server load

High TTL (3600 seconds = 1 hour):
✅ Fewer DNS queries (→ lower costs)
✅ Faster for users (more cache hits)
✅ Lower DNS server load
❌ Slow failover (up to 1 hour stale data)
❌ Hard to do rolling updates
❌ Stuck with old IPs during issues

Recommendations by use case:

1. Static websites (CDN):
TTL: 86400 (24 hours)
Reason: Content doesn't change, maximize caching

Example:
static.example.com → Cloudflare CDN
- CDN IP rarely changes
- 24 hour TTL reduces DNS queries by 99%

2. API endpoints (load balanced):
TTL: 300 (5 minutes)
Reason: Balance failover speed with cache efficiency

Example:
api.example.com → [LB1, LB2]
- If LB1 fails, 5 minutes to propagate
- Acceptable for most APIs

3. Critical services (payment, auth):
TTL: 60 (1 minute)
Reason: Fast failover is critical

Example:
payment.example.com → Payment gateway
- If gateway fails, 1 minute to switch
- Cost increase acceptable for uptime

4. Pre-deployment:
Day -7: Reduce TTL to 60
Day -1: Verify TTL propagated (check with dig)
Day 0: Make DNS change (takes 1 minute)
Day 1: Increase TTL back to 300

Reason: Low TTL ensures fast update, then return to efficient TTL

5. Internal services:
TTL: 30 (30 seconds)
Reason: Internal DNS can be very dynamic (auto-scaling, containers)

Example:
service.namespace.svc.cluster.local
- Kubernetes recreates pods frequently
- Need fast updates

Calculating optimal TTL:

Factors:
- Change frequency: How often do IPs change?
- Failover requirement: How fast must failover happen?
- Query volume: How many queries per second?
- Cost tolerance: What's acceptable DNS cost?

Formula:
Max acceptable staleness = (TTL + health_check_interval * failure_threshold)

Example:
Want failover in < 2 minutes:
Health check: 30s, threshold: 2
Max TTL: 120s - (30s * 2) = 60 seconds

Real-world data (AWS):

Traffic type       Queries/day   TTL    Cost/month
──────────────────────────────────────────────────
Static CDN         10M          86400  $4
API (normal)       100M         300    $40
API (critical)     100M         60     $200
Internal services  1B           30     $4000

Note: With 90% cache hit rate, actual queries are 10% of calculated

Best practice:
- Start with TTL=300 (5 minutes) for most services
- Reduce to 60 for critical services
- Increase to 3600+ for CDN/static content
- Monitor cache hit rate, adjust accordingly
```

### **Key Talking Points**

1. **"DNS is hierarchical: root → TLD → authoritative"**: Core architecture
2. **"Caching at every level reduces 100ms to < 10ms"**: Performance impact
3. **"Geographic routing: US users → US DC, EU users → EU DC"**: Global distribution
4. **"TTL controls failover speed: 60s TTL = 1 min max stale"**: Trade-off
5. **"Anycast: Same IP, multiple locations, route to nearest"**: DDoS mitigation
6. **"DNS load balancing simple but limited, use L7 LB for production"**: Real-world pattern
7. **"Managed DNS (Route 53, Cloudflare) handles scale and DDoS"**: Best practice

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **DNS Resolution Flow**

```
Client (Browser)
     │
     │ 1. Query www.example.com
     ▼
 Browser Cache
     │
     │ Miss
     ▼
   OS Cache
     │
     │ Miss
     ▼
Recursive Resolver (8.8.8.8)
     │
     │ Check cache → Miss
     │
     │ 2. Query root nameserver
     ▼
Root Nameserver (.)
     │
     │ 3. Response: "Ask .com TLD"
     │    NS: a.gtld-servers.net
     ▼
Recursive Resolver
     │
     │ 4. Query .com TLD
     ▼
TLD Nameserver (.com)
     │
     │ 5. Response: "Ask example.com NS"
     │    NS: ns1.example.com
     ▼
Recursive Resolver
     │
     │ 6. Query example.com authoritative
     ▼
Authoritative NS (example.com)
     │
     │ 7. Response: A record
     │    www.example.com = 192.0.2.1
     │    TTL: 300
     ▼
Recursive Resolver
     │
     │ Cache result (300s)
     │
     │ 8. Return to client
     ▼
   OS Cache
     │
     │ Cache result
     ▼
 Browser Cache
     │
     │ Cache result
     ▼
Client (Browser)
     │
     │ 9. Connect to 192.0.2.1
```

### **DNS Record Lookup**

```
┌─────────────────────────────────────────────────┐
│           DNS Zone: example.com                 │
├──────────┬────────┬──────────┬─────────────────┤
│   Name   │  TTL   │   Type   │      Value      │
├──────────┼────────┼──────────┼─────────────────┤
│    @     │  300   │    A     │   192.0.2.1     │
│   www    │  300   │    A     │   192.0.2.1     │
│   api    │  60    │    A     │   192.0.2.10    │
│   api    │  60    │    A     │   192.0.2.11    │
│   blog   │  3600  │  CNAME   │   www.example.com│
│    @     │  3600  │    MX    │ 10 mail.example.com│
│    @     │  3600  │    NS    │ ns1.example.com  │
│    @     │  3600  │    NS    │ ns2.example.com  │
└──────────┴────────┴──────────┴─────────────────┘

Query: www.example.com
→ Look up "www" → A record → 192.0.2.1
→ Cache for 300 seconds

Query: blog.example.com
→ Look up "blog" → CNAME → www.example.com
→ Look up "www" → A record → 192.0.2.1
→ Total: 2 lookups (CNAME chain)
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why DNS Matters**

**Business Impact:**
- **User experience**: Fast name resolution (< 10ms with caching)
- **Global distribution**: Route users to nearest datacenter (50-80% latency reduction)
- **Availability**: Failover to healthy servers (99.99% uptime)
- **Flexibility**: Change infrastructure without changing URLs

**Technical Impact:**
- **Decoupling**: Service names independent of IPs (scale, migrate easily)
- **Load balancing**: Distribute traffic across servers (simple, effective)
- **Service discovery**: Microservices find each other by name
- **Caching**: Hierarchical caching reduces queries by 90-99%

### **How It Works (Simple Summary)**

1. **Client queries** domain name (www.example.com)
2. **Check caches** (browser → OS → recursive resolver)
3. **If miss, recursive resolver** walks DNS hierarchy:
   - Query root → Get TLD server
   - Query TLD → Get authoritative server
   - Query authoritative → Get IP address
4. **Cache result** at every level for TTL duration
5. **Return IP** to client (takes 100ms first time, < 10ms cached)

**For distributed systems:**
- Configure **multiple nameservers** (2-6 geographically distributed)
- Use **Anycast** (same IP, multiple locations, route to nearest)
- Enable **health checks** (remove unhealthy IPs from responses)
- Set appropriate **TTL** (balance failover speed with cache efficiency)

### **Key Trade-offs**

| Aspect | Low TTL (60s) | High TTL (3600s) |
|--------|---------------|------------------|
| **Failover speed** | Fast (1 min) | Slow (1 hour) |
| **DNS query load** | High | Low |
| **Costs** | Higher | Lower |
| **User latency** | Slightly higher | Lower |
| **Deployment flexibility** | Easy | Hard |

### **Remember These Numbers**

```
DNS resolution time (no cache):  100-300ms
DNS resolution time (cached):    < 10ms
Cache hit rate (typical):        90-99%

Root servers (logical):          13
Root servers (physical):         1000+
TLD servers (.com):              13 sets, 100+ total

Minimum nameservers:             2
Recommended nameservers:         4-6

TTL for static content:          86400s (24 hours)
TTL for APIs:                    300s (5 minutes)
TTL for critical services:       60s (1 minute)

DNS query cost (AWS):            $0.40 per million
Hosted zone cost:                $0.50/month

Typical DNS QPS (10M DAU site):  10,000-100,000
Peak DNS QPS:                    5x average
```

### **Production Wisdom**

✅ **Use managed DNS** (Route 53, Cloudflare) for scale and DDoS protection  
✅ **Multiple nameservers** (4-6) across regions  
✅ **Enable health checks** for automatic failover  
✅ **Set appropriate TTL** (balance speed vs efficiency)  
✅ **Use Anycast** for global distribution and DDoS mitigation  
✅ **Monitor DNS** (query rate, resolution time, errors)  
✅ **DNSSEC for security** (if supported by TLD)  
✅ **Pre-reduce TTL** before planned changes  

❌ **Don't use DNS alone for load balancing** (no real-time health checks)  
❌ **Don't set TTL too high** (slow failover) or too low (high costs)  
❌ **Don't rely on instant failover** (TTL limits propagation speed)  
❌ **Don't expose internal DNS** (security risk)  
❌ **Don't allow zone transfers** (AXFR) publicly  
❌ **Don't forget redundancy** (minimum 2 nameservers)  

---

**Final thought for interviews:**

> "DNS is the foundational service that makes the internet human-friendly by translating names to IPs. At scale, it's used for much more than just name resolution—it's a critical tool for global traffic management, load balancing, and failover. Companies like Netflix use geographic DNS to route 200M users to their nearest CDN, reducing latency by 60%. The key insight is that DNS is a distributed system with caching at every level, turning a 100ms query into < 10ms. But this caching creates challenges: changes propagate slowly (TTL-dependent), making instant failover impossible with DNS alone. The production pattern is hybrid: DNS for global routing and coarse-grained distribution, combined with Layer 7 load balancers for fine-grained, real-time traffic management within each region. This delivers both global reach and sub-second failover."
