# 37. CDN Fundamentals

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**CDN (Content Delivery Network)** is a geographically distributed network of servers (edge servers or PoPs - Points of Presence) that cache and serve content from locations close to end users, dramatically reducing latency and bandwidth costs.

**What it is:**
- Network of edge servers distributed globally (150+ locations for major CDNs)
- Cache static content (images, videos, CSS, JS) close to users
- Route requests to nearest edge server (lowest latency)
- Origin servers hold authoritative content, edge servers cache copies

**Why it exists:**
- Speed up content delivery (cache closer to users → lower latency)
- Reduce origin server load (edge servers handle 90%+ of traffic)
- Improve reliability (multiple edge servers, no single point of failure)
- Lower bandwidth costs (serve from cache, not origin)

**Problem it solves:**
- Long distance between user and origin server (high latency)
- Origin server overload (millions of users, limited capacity)
- Network congestion (bandwidth bottlenecks)
- Geographic distribution (users worldwide, single origin)

**In large-scale systems:**
- Static assets (images, videos, JS, CSS) served from CDN edge
- API responses can be cached at edge (for cacheable data)
- Dynamic content acceleration (optimized routing, protocol optimization)
- DDoS protection (distribute traffic, absorb attacks at edge)

💡 **Interview Opening:** "A CDN is a distributed network of edge servers that cache content close to users, reducing latency from 200ms (cross-continent) to 10-50ms (local edge). When a user in Tokyo requests `www.example.com/logo.png`, the CDN routes them to the Tokyo edge server, which serves the cached image instead of fetching from the US origin. This reduces latency by 80%, origin load by 90%, and bandwidth costs by 70%. Major CDNs like CloudFlare, Akamai, and CloudFront have 150-300 edge locations globally. Key concepts: cache hit/miss, TTL-based invalidation, cache headers (Cache-Control, ETag), origin shielding, and geographic routing via anycast DNS."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **CDN Architecture**

```
                  ┌─────────────┐
                  │    DNS      │
                  │  (Anycast)  │
                  └──────┬──────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐     ┌───▼────┐     ┌───▼────┐
    │  Tokyo  │     │ London │     │  NYC   │
    │  Edge   │     │  Edge  │     │  Edge  │
    │ Server  │     │ Server │     │ Server │
    └────┬────┘     └────┬───┘     └────┬───┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                    ┌────▼─────┐
                    │  Origin  │
                    │  Server  │
                    │ (US West)│
                    └──────────┘

Request flow:
1. User in Tokyo requests www.example.com/logo.png
2. DNS resolves to Tokyo edge server IP (via Anycast)
3. Tokyo edge checks cache → Hit! → Return cached logo
4. If miss → Fetch from origin → Cache locally → Return to user
```

### **Cache Hit vs Cache Miss**

#### **Cache Hit (90-95% of requests)**

```
User → Edge Server
         │
         ├─ Check cache: logo.png exists
         ├─ Check freshness: Cache-Control: max-age=3600, age=1200
         │  (1200 < 3600, still fresh)
         ├─ Return cached content
         │
       [Response in 10-50ms, no origin request]

Metrics:
- Latency: 10-50ms (edge to user)
- Origin load: 0 (no request)
- Bandwidth cost: Edge bandwidth (cheap)
```

#### **Cache Miss (5-10% of requests)**

```
User → Edge Server
         │
         ├─ Check cache: new-logo.png not found
         │
         ├─ Fetch from origin
         ├─── Edge → Origin
         ├─── Origin processes request
         ├─── Origin → Edge (new-logo.png + headers)
         │
         ├─ Cache locally (based on Cache-Control header)
         ├─ Return to user
         │
       [Response in 100-200ms, includes origin RTT]

Metrics:
- Latency: 100-200ms (includes origin fetch)
- Origin load: 1 request
- Bandwidth cost: Edge + origin bandwidth
```

#### **Cache Hit Ratio**

```
Cache Hit Ratio = (Cache Hits / Total Requests) × 100

Typical values:
- Static assets (images, CSS, JS): 95-99%
- HTML pages: 80-90% (depends on caching strategy)
- API responses: 50-80% (depends on cacheability)

Impact of 1% improvement:
- 1M requests/day, 90% → 91% hit ratio
- Origin requests: 100K → 90K (10K reduction)
- At $0.01/1K requests → $1/day savings → $365/year
- For 1B requests/day → $365K/year savings
```

### **Cache Control Headers**

#### **Cache-Control Header**

```
Cache-Control: max-age=3600, public

Directives:
- max-age=3600: Cache for 3600 seconds (1 hour)
- public: Any cache can store (CDN, browser)
- private: Only browser can cache (not CDN)
- no-cache: Revalidate with origin before serving
- no-store: Don't cache at all
- must-revalidate: Revalidate when stale
- immutable: Never revalidate (content never changes)

Examples by use case:

Static assets (versioned):
Cache-Control: max-age=31536000, public, immutable
(1 year, never changes, perfect for /js/app.v123.js)

HTML pages:
Cache-Control: max-age=300, public, must-revalidate
(5 minutes, revalidate when stale)

API responses (user-specific):
Cache-Control: max-age=60, private
(1 minute, browser only, not CDN)

Sensitive data:
Cache-Control: no-store, no-cache, must-revalidate
(Never cache)
```

#### **ETag (Entity Tag)**

```
Response from origin:
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Cache-Control: max-age=3600

User requests after 1 hour (expired):

Edge → Origin
GET /logo.png
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"

Origin checks:
- Current ETag matches → Content unchanged
- Response: 304 Not Modified (no body)

Edge:
- Updates cache timestamp (extend TTL)
- Serves cached content to user

Benefits:
- Save bandwidth (no body transfer on 304)
- Confirm freshness without full re-download
```

#### **Expires Header (Legacy)**

```
Expires: Wed, 21 Oct 2025 07:28:00 GMT

Superseded by Cache-Control (more flexible)
Still used for HTTP/1.0 compatibility
```

### **Cache Invalidation**

**"There are only two hard things in Computer Science: cache invalidation and naming things."** —Phil Karlton

#### **TTL-Based Expiration (Passive)**

```
Origin response:
Cache-Control: max-age=3600

Edge behavior:
Time 0: Cache logo.png
Time 1000s: Serve from cache (fresh)
Time 3600s: Mark as stale
Time 3601s: User requests → Revalidate with origin
             → If unchanged (304), serve cached version
             → If changed (200), replace cache

Pros:
✅ Simple, automatic
✅ No manual invalidation needed

Cons:
❌ Stale content served until TTL expires
❌ Can't force immediate update
```

#### **Purge/Invalidation (Active)**

```
Scenario: Critical bug in app.js, need immediate fix

1. Deploy new app.js to origin
2. Send purge request to CDN:

   curl -X POST https://api.cloudflare.com/purge \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"files": ["https://example.com/js/app.js"]}'

3. CDN removes app.js from all edge servers
4. Next request → Cache miss → Fetch new version from origin

Types of purge:

1. Single file:
   - Purge specific URL
   - Fastest, most targeted
   - Example: /js/app.js

2. Tag-based:
   - Purge all files with specific tag
   - Example: Tag all product images with "product-123"
   - Purge tag → All related images invalidated

3. Full cache:
   - Purge everything
   - Slow, expensive
   - Last resort

Propagation time:
- Cloudflare: < 5 seconds globally
- Akamai: 5-60 seconds
- CloudFront: 5-10 seconds

Cost:
- Cloudflare: Free unlimited
- AWS CloudFront: Free (first 1000 paths/month), then $0.005/path
- Akamai: Varies by plan
```

#### **Version-Based Cache Busting (Best Practice)**

```
Instead of:
<script src="/js/app.js"></script>
(Must purge CDN to update)

Use versioned URLs:
<script src="/js/app.v123.js"></script>
(No purge needed, new URL = cache miss)

When deploying v124:
- Upload /js/app.v124.js to origin
- Update HTML to reference v124
- Old v123 remains cached (harmless)
- New requests get v124 (cache miss → fetch → cache)

Benefits:
✅ No purge needed (zero downtime)
✅ Instant updates (no propagation delay)
✅ Aggressive caching (max-age=1 year)
✅ Rollback easy (revert HTML to v123)

Implementation:
- Webpack: [name].[contenthash].js
- Next.js: _next/static/chunks/[hash].js
- Rails: /assets/app-abc123.js (asset pipeline)
```

### **CDN Routing & Distribution**

#### **Anycast IP Addressing**

```
Traditional Unicast:
- Each server has unique IP
- tokyo.cdn.example.com → 203.0.113.1
- london.cdn.example.com → 198.51.100.1

Problem: Need DNS to route to correct server

Anycast:
- All edge servers advertise same IP: 192.0.2.1
- BGP routing delivers packet to nearest server

Example:
cdn.example.com → 192.0.2.1 (anycast)

Tokyo user queries 192.0.2.1:
- BGP routes to Tokyo edge server (192.0.2.1)

London user queries 192.0.2.1:
- BGP routes to London edge server (192.0.2.1)

Benefits:
✅ Single IP for all edges (simple DNS)
✅ Automatic nearest-server routing
✅ DDoS mitigation (attack distributed)
✅ Instant failover (if one server down, route to next nearest)
```

#### **Geographic DNS + Anycast (Hybrid)**

```
Most CDNs use both:

1. DNS returns IP of nearest regional cluster (geo-routing)
2. Each cluster uses anycast for distribution within region

Example:
User in Tokyo queries cdn.example.com

DNS (geo-routing):
- Detects user in Asia
- Returns Asia cluster IP: 203.0.113.1

Anycast (within Asia cluster):
- 203.0.113.1 announced from Tokyo, Seoul, Singapore
- BGP routes to nearest (Tokyo)

Result: Two-stage routing for optimal performance
```

### **Origin Shielding**

**Problem:** Multiple edge servers requesting same content from origin (thundering herd)

```
Without shielding:

                     Origin
                       ▲
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    Edge1 (miss)   Edge2 (miss)   Edge3 (miss)
        ↑              ↑              ↑
      User1          User2          User3

All 3 edges request from origin simultaneously
Origin handles 3 identical requests
```

```
With origin shielding:

                     Origin
                       ▲
                       │
                  Shield Server
                       ▲
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    Edge1 (miss)   Edge2 (miss)   Edge3 (miss)
        ↑              ↑              ↑
      User1          User2          User3

Flow:
1. Edge1 miss → Request to Shield (not origin)
2. Shield miss → Single request to origin
3. Shield caches response
4. Edge2, Edge3 also request Shield → Shield hit!
5. All 3 edges get content from Shield (not origin)

Benefits:
✅ Reduce origin load (1 request instead of 3)
✅ Protect origin from thundering herd
✅ Faster for edges (Shield closer than origin)
```

### **CDN Features**

#### **1. Static Asset Acceleration**

```
Scenario: E-commerce site with product images

Without CDN:
User (Tokyo) → Origin (US West)
- 150ms latency
- 10 images × 150ms = 1.5 seconds

With CDN:
User (Tokyo) → Tokyo edge
- 10ms latency
- 10 images × 10ms = 100ms

Improvement: 1.5s → 0.1s (15x faster)

Configuration (Cloudflare):

Page Rule: example.com/images/*
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 week
```

#### **2. Dynamic Content Acceleration**

Even non-cacheable content benefits from CDN!

```
Optimizations:

1. Persistent connections:
   - Edge maintains persistent connections to origin
   - Saves TCP/TLS handshake time
   - User → Edge: New connection
   - Edge → Origin: Reuse existing connection

2. Protocol optimization:
   - User → Edge: HTTP/1.1
   - Edge → Origin: HTTP/2 or HTTP/3 (multiplexing)

3. Route optimization:
   - Direct internet path: User → ISP → Origin (slow)
   - CDN backbone: User → Edge → CDN private network → Origin (fast)

4. Smart routing:
   - Avoid congested paths
   - Real-time latency monitoring
   - Choose fastest route

Result:
- Dynamic content latency: 200ms → 100ms (even without caching)
```

#### **3. Video Streaming Optimization**

```
Challenges:
- Large files (GB for HD movies)
- Adaptive bitrate streaming (multiple qualities)
- Live streaming (real-time)

CDN solutions:

1. Chunked delivery:
   - Break video into small chunks (2-10 seconds)
   - User downloads chunks sequentially
   - Cache chunks at edge

2. Adaptive bitrate:
   - Multiple quality versions (360p, 720p, 1080p, 4K)
   - Client measures bandwidth
   - Requests appropriate quality
   - Edge serves cached chunks

3. Live streaming:
   - Origin encoder → CDN ingestion point
   - CDN replicates to edges
   - 5-30 second delay (acceptable for live)

4. Protocols:
   - HLS (Apple): .m3u8 playlist + .ts segments
   - DASH: .mpd manifest + .m4s segments
   - CMAF: Common format for both

Example (Netflix):
- 300+ CDN locations
- 15+ Gbps per server
- Adaptive streaming (automatic quality selection)
- Pre-positioning (popular content cached before peak hours)
```

#### **4. DDoS Protection**

```
CDN as DDoS shield:

Attack: 100 Gbps DDoS flood
Without CDN: Overwhelms origin (10 Gbps capacity)
With CDN: Distributed across 150 edge servers = 0.67 Gbps each

Edge server capacity: 10-40 Gbps
Result: Attack absorbed, origin unaffected

Layers of protection:

1. Anycast distribution:
   - Attack traffic split across edges
   - Each edge handles fraction

2. Rate limiting:
   - Limit requests per IP (e.g., 100 req/s)
   - Block IPs exceeding threshold

3. WAF (Web Application Firewall):
   - Filter malicious requests (SQL injection, XSS)
   - Block known attack patterns

4. Challenge pages:
   - Suspected bot → CAPTCHA
   - Verified human → Pass through

5. Always Online:
   - If origin down, serve cached version
   - Better than complete outage

Cloudflare example:
- Handled 3.9 Tbps DDoS attack (2023)
- Largest attack on record
- No downtime for protected sites
```

### **Multi-CDN Strategy**

**Why use multiple CDNs?**

```
Single CDN risks:
- CDN outage → Your site down
- Regional performance issues
- Cost optimization (different CDNs cheaper in different regions)
- Regulatory compliance (some countries require local CDN)

Multi-CDN architecture:

┌─────────────────────────────────────┐
│         Traffic Manager              │
│    (Route based on performance)      │
└───────┬─────────────────────────────┘
        │
   ┌────┴────┬────────┬────────┐
   │         │        │        │
Primary   Secondary Tertiary  Regional
(CF)      (Akamai) (Fastly)  (China)
  │          │        │        │
US/EU     Backup   US only   China only

Routing logic:
1. Check CDN health (ping, synthetic tests)
2. Measure latency (real user monitoring)
3. Route to fastest healthy CDN
4. Fallback if primary fails

Example (Amazon):
- Uses CloudFront (own CDN) + Akamai + Fastly
- Route based on performance and cost
- Seamless failover between CDNs
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **CDN Capacity Planning**

**Scenario:** E-commerce site with 10 million daily active users

**Traffic estimation:**

```
Assumptions:
- Average user: 20 page loads per day
- Each page: 1 HTML + 50 resources (images, CSS, JS)
- Average resource size: 50 KB
- Cache hit ratio: 95%

Total requests per day:
10M users × 20 pages × 51 resources = 10.2 billion requests

Requests per second (average):
10.2B / 86,400 = 118,055 RPS

Peak traffic (assume 5x average):
118,055 × 5 = 590,275 RPS

Bandwidth calculation:
10.2B requests × 50 KB × 0.05 (cache miss rate) = 25.5 TB/day origin
10.2B requests × 50 KB × 0.95 (cache hit rate) = 484.5 TB/day edge

Total bandwidth: 510 TB/day = 21.25 TB/hour average

Peak bandwidth:
21.25 TB/hour × 5 = 106.25 TB/hour = 236 Gbps

CDN costs (AWS CloudFront):
US/EU pricing:
- First 10 TB: $0.085/GB = $870/TB
- Next 40 TB: $0.080/GB = $820/TB
- Next 100 TB: $0.060/GB = $614/TB
- Next 350 TB: $0.040/GB = $409/TB

For 510 TB/month (~17 TB/day):
10 TB × $870 = $8,700
40 TB × $820 = $32,800
100 TB × $614 = $61,400
350 TB × $409 = $143,150
10 TB × $409 = $4,090
Total: $250,140/month

With Cloudflare (flat rate):
Pro: $20/month (up to 1M visitors) - Not suitable
Business: $200/month (unlimited bandwidth) - Good deal!
Enterprise: Custom pricing (for SLA, support)

Cost savings with CDN:
Without CDN (origin serves all):
510 TB × $0.12/GB (AWS EC2 data transfer) = $62,976/month

With CDN (95% cache hit):
25.5 TB origin × $0.12/GB = $3,137/month
484.5 TB edge × $0.05/GB (CDN cheaper) = $24,225/month
Total: $27,362/month (Cloudflare: $200/month!)

Origin server load:
Without CDN: 118,055 RPS (peak: 590,275 RPS)
With CDN (5% miss rate): 5,903 RPS (peak: 29,514 RPS)

Reduction: 95% fewer requests to origin
```

### **CDN Edge Server Capacity**

```
Typical edge server specs:
- CPU: 32-64 cores
- RAM: 128-512 GB
- Storage: 10-100 TB SSD (cache)
- Network: 10-40 Gbps

Capacity per server:
- 50,000-200,000 RPS (depends on content type)
- 10-40 Gbps bandwidth

For 590,275 RPS peak:
Servers needed: 590,275 / 100,000 = 6 servers (minimum)
With redundancy: 6 × 2 = 12 servers

Major CDNs have 100-300 PoPs (Points of Presence):
- Cloudflare: 300+ cities
- Akamai: 4,000+ locations
- AWS CloudFront: 450+ PoPs

Example distribution:
- US: 50 PoPs (33% of traffic)
- Europe: 40 PoPs (27% of traffic)
- Asia: 60 PoPs (30% of traffic)
- Rest of world: 50 PoPs (10% of traffic)

Traffic per PoP:
US: 590,275 × 0.33 / 50 = 3,896 RPS per PoP (easily handled)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Edge Cache Storage**

```
Cache hierarchy:

┌─────────────────────────────────────┐
│        Memory Cache (RAM)            │
│   Hot content (most requested)       │
│   Size: 10-50 GB                     │
│   Speed: < 1ms access                │
└─────────────────────────────────────┘
                 │
┌─────────────────────────────────────┐
│        Disk Cache (SSD)              │
│   Warm content (less frequent)       │
│   Size: 1-10 TB                      │
│   Speed: 1-10ms access               │
└─────────────────────────────────────┘
                 │
┌─────────────────────────────────────┐
│           Origin                     │
│   Cold content (cache miss)          │
│   Speed: 50-200ms fetch              │
└─────────────────────────────────────┘
```

### **Cache Eviction Policies**

```
LRU (Least Recently Used):
- Remove least recently accessed item when cache full
- Simple, effective for most workloads

LFU (Least Frequently Used):
- Remove least frequently accessed item
- Better for long-tail content

TTL-based:
- Remove expired content first
- Based on Cache-Control headers

Hybrid:
- Combine LRU + TTL + size limits
- Most CDNs use this approach

Example cache state:

File              Last Access    Frequency   TTL Remaining
────────────────────────────────────────────────────────
logo.png          1 min ago      1000/hour   30 min
app.js            5 min ago      800/hour    50 min
old-banner.jpg    2 hours ago    10/hour     Expired ← Evict first
video.mp4         10 min ago     100/hour    2 hours
style.css         2 min ago      500/hour    45 min
```

### **Cache Partitioning**

```
Partition cache by content type:

┌─────────────────────────────────────┐
│   Static Assets (70% of cache)      │
│   images/*, css/*, js/*              │
│   High hit rate, long TTL            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   HTML Pages (20% of cache)          │
│   *.html, /                          │
│   Medium hit rate, short TTL         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   API Responses (10% of cache)       │
│   /api/*                             │
│   Low hit rate (user-specific)       │
└─────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **CDN Failure Scenarios**

#### **1. Edge Server Failure**

```
Scenario: Tokyo edge server crashes

Impact:
- Users in Tokyo region affected
- Requests fail or route to next nearest edge

Mitigation (Anycast):
- Same IP announced from multiple servers
- BGP automatically routes to next nearest (Seoul)
- Failover time: < 1 second (BGP convergence)

User experience:
- First request after failure: 50ms → 100ms (Seoul farther than Tokyo)
- Subsequent requests: 100ms (routed to Seoul)
- No manual intervention needed
```

#### **2. Origin Server Failure**

```
Scenario: Origin server down

Impact:
- Cache misses fail (can't fetch from origin)
- Cache hits unaffected (90-95% of requests)

Mitigation strategies:

1. Stale-while-revalidate:
   - Serve stale cached content
   - Try to revalidate in background
   - Better than error page

Cache-Control: max-age=3600, stale-while-revalidate=86400

2. Stale-if-error:
   - If origin returns error, serve stale content
   - Configured with header or CDN setting

Cache-Control: max-age=3600, stale-if-error=86400

3. Always Online (Cloudflare):
   - CDN takes snapshot of site
   - If origin down, serve snapshot
   - Limited to static content

4. Origin redundancy:
   - Multiple origin servers (primary, backup)
   - CDN fails over automatically
   - Health checks every 10-30 seconds

Result:
- With stale content: 95% of requests served normally
- 5% (cache misses) return stale or error
- Much better than 100% downtime
```

#### **3. Full CDN Outage**

```
Scenario: Entire CDN provider down (rare but happens)

Examples:
- Fastly outage (June 2021): 49 minutes
- Cloudflare outage (July 2022): 27 minutes

Impact:
- All requests fail (DNS resolves to unreachable IPs)

Mitigation:

1. Multi-CDN setup:
   - Primary CDN: Cloudflare
   - Backup CDN: Fastly
   - DNS failover (health check on primary)
   - Automatic switch to backup

2. Fallback to origin:
   - DNS CNAME: cdn.example.com → cloudflare.example.com
   - If Cloudflare down, manually change to origin.example.com
   - Propagation time: 60 seconds (if low TTL)

3. Bypass CDN in emergency:
   - Clients can directly access origin
   - Example: www.example.com → Origin IP (bypass CDN)
   - Slower but available

Cost of outage:
- E-commerce: $10,000-100,000 per minute
- Media: User churn, reputation damage
- Critical services: SLA violations

Best practice: Multi-CDN for critical applications
```

### **Geographic Redundancy**

```
Regional CDN distribution:

Region          PoPs    Capacity    Traffic %
───────────────────────────────────────────────
North America   100     40 Tbps     35%
Europe          80      32 Tbps     30%
Asia Pacific    90      36 Tbps     30%
South America   20      8 Tbps      3%
Africa/ME       10      4 Tbps      2%

If North America region fails:
- 35% of traffic affected
- Automatically routes to Europe/Asia (higher latency)
- Degraded but not down
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **CDN Security Features**

#### **1. DDoS Protection**

```
Layer 3/4 (Network/Transport):
- SYN floods, UDP floods, reflection attacks
- CDN absorbs at edge (Tbps capacity)
- Rate limiting per IP

Layer 7 (Application):
- HTTP floods, slowloris, ReDoS
- WAF rules (block malicious patterns)
- Challenge pages (CAPTCHA for bots)

Example rule:
IF request rate > 100/minute per IP
AND User-Agent matches bot pattern
THEN challenge with CAPTCHA
```

#### **2. Web Application Firewall (WAF)**

```
Common rules:

1. SQL Injection:
   Block: ?id=1' OR '1'='1
   Pattern: /(\bOR\b.*=|UNION\s+SELECT)/i

2. XSS (Cross-Site Scripting):
   Block: <script>alert('XSS')</script>
   Pattern: /<script[^>]*>.*?<\/script>/i

3. Path Traversal:
   Block: /../../../etc/passwd
   Pattern: /\.\.[\/\\]/

4. Rate limiting:
   Block: > 1000 requests/minute from single IP

Cloudflare WAF example:
- Managed rulesets (OWASP Top 10)
- Custom rules (your application logic)
- Rate limiting per path
- Bot management

Cost:
- Cloudflare: $20/month (Pro) includes basic WAF
- AWS WAF: $5/month + $1/rule + $0.60/million requests
```

#### **3. SSL/TLS Termination**

```
CDN handles SSL/TLS:

┌──────┐  HTTPS  ┌──────┐  HTTP   ┌────────┐
│Client│ ◄─────► │ CDN  │ ◄─────► │ Origin │
└──────┘         └──────┘         └────────┘
          TLS          (Optional)

Benefits:
✅ Offload TLS handshake (CPU-intensive)
✅ Modern protocols (TLS 1.3, HTTP/3)
✅ Certificate management (automatic renewal)
✅ Free certificates (Let's Encrypt)

CDN → Origin connection options:

1. HTTP (no encryption):
   - Fastest (no TLS overhead)
   - OK if CDN and origin in same datacenter
   - NOT OK over public internet

2. HTTPS (full encryption):
   - Secure end-to-end
   - Slightly slower (TLS overhead)
   - Required for sensitive data

3. HTTPS (strict):
   - Validate origin certificate
   - Prevent MITM between CDN and origin
```

#### **4. Access Control**

```
Restrict content access:

1. Signed URLs:
   - Generate time-limited URLs
   - Only valid for specific duration
   - Use case: Paid content, download links

   Example (AWS CloudFront):
   https://cdn.example.com/video.mp4?
     Expires=1640000000&
     Signature=abc123...

2. Signed Cookies:
   - Set cookie with signature
   - CDN validates cookie before serving
   - Use case: Protected site sections

3. IP whitelisting:
   - Only serve to specific IPs
   - Use case: Internal tools, staging sites

4. Geoblocking:
   - Block or allow by country
   - Use case: Content licensing, compliance

   Example:
   Allow: US, CA, MX
   Block: All others

5. Hotlink protection:
   - Check Referer header
   - Only serve if Referer matches your domain
   - Prevents bandwidth theft

   Rule:
   IF Referer NOT LIKE "https://example.com/*"
   THEN return 403 Forbidden
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Netflix (Global Video Delivery)**

**Challenge:** Stream 4K video to 230 million users across 190 countries

**CDN Strategy:**
- Built own CDN: Open Connect
- 17,000+ servers in 1,000+ locations
- Placed inside ISP networks (free peering)

**Architecture:**
```
┌─────────────────────────────────────┐
│     Netflix Control Plane (AWS)     │
│   User auth, recommendations, UI    │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│    Open Connect CDN (Own Infra)     │
│   17,000 servers, 200+ Tbps         │
│   ISP co-location (zero transit)    │
└────────────────┬────────────────────┘
                 │
          ┌──────┴──────┐
          │             │
    User's ISP    User's Device
      (Comcast)      (Smart TV)

Flow:
1. User browses Netflix → AWS (control plane)
2. User presses play → Open Connect (video)
3. Open Connect server in user's ISP delivers video
4. Zero internet transit (internal ISP network)

Results:
- 99.99% availability
- 15+ Gbps per server
- 90%+ cache hit ratio
- Sub-second video start time
- Adaptive bitrate (automatic quality)

Cost savings:
- Without CDN: $1B+/year in bandwidth
- With Open Connect: ~$100M/year (90% savings)
```

### **Example 2: Cloudflare (Anycast CDN)**

**Architecture:**
- 300+ cities worldwide
- Single anycast IP for all customers
- DDoS protection included

**Features:**
```
1. Automatic DDoS mitigation
   - 3.9 Tbps attack absorbed (2023)
   - No customer downtime

2. Edge Workers (Serverless):
   - Run code at edge (0ms latency)
   - A/B testing, personalization, auth

3. Argo Smart Routing:
   - Real-time latency monitoring
   - Choose fastest path to origin
   - 30% faster on average

4. Tiered Cache:
   - Edge tier (user-facing)
   - Regional tier (origin shielding)
   - Reduces origin requests by 80%

Pricing:
- Free: Unlimited bandwidth (!), basic DDoS
- Pro: $20/month, WAF, image optimization
- Business: $200/month, advanced features
- Enterprise: Custom, SLA, dedicated support

Why free tier works:
- Anycast distribution (no per-region costs)
- Shared infrastructure
- Upsell to paid for advanced features
```

### **Example 3: AWS CloudFront (Integrated CDN)**

**Features:**
```
1. Integration with AWS services:
   - S3 origin (static website hosting)
   - EC2/ELB origin (dynamic content)
   - Lambda@Edge (serverless edge compute)

2. Signed URLs/Cookies:
   - Secure private content
   - Time-limited access

3. Field-Level Encryption:
   - Encrypt sensitive fields at edge
   - Only origin can decrypt (not even AWS)

4. Origin failover:
   - Primary origin group + backup
   - Automatic failover on failure

5. Real-Time Logs:
   - Stream logs to Kinesis
   - Analyze traffic patterns

Example (S3 + CloudFront):

┌──────────────┐
│   Route 53   │ (DNS)
│ (DNS: cdn.   │
│ example.com) │
└──────┬───────┘
       │
┌──────▼────────────────┐
│   CloudFront CDN      │
│ 450+ edge locations   │
└──────┬────────────────┘
       │
┌──────▼────────┐
│   S3 Bucket   │
│  (us-east-1)  │
│  Static files │
└───────────────┘

Configuration:
- Origin: my-bucket.s3.amazonaws.com
- Behaviors: Cache all (*.jpg, *.css, *.js)
- TTL: 1 day
- Compress: Gzip/Brotli
- HTTPS: Required

Result:
- $0.50/month S3 (storage)
- $20-100/month CloudFront (bandwidth)
- 95% cache hit ratio
- 10-50ms latency globally
```

### **Example 4: Shopify (E-commerce CDN)**

**Challenge:** Serve 2 million merchants, handle Black Friday spikes (10x traffic)

**CDN Strategy:**
```
1. Fastly CDN:
   - Edge compute (VCL - Varnish Configuration Language)
   - Real-time purging
   - Instant cache invalidation

2. Edge compute use cases:
   - A/B testing (split traffic at edge)
   - Geolocation (show local currency)
   - Bot detection (block before origin)
   - Device detection (serve mobile/desktop HTML)

3. Cache strategy:
   - Static assets: 1 year TTL (versioned URLs)
   - Product pages: 5 minutes TTL
   - Cart: No cache (user-specific)
   - Checkout: No cache (sensitive)

4. Black Friday preparation:
   - Pre-warm cache (fetch top products)
   - Increase origin capacity (10x servers)
   - CDN absorbs 95% of traffic
   - Origin handles 5% (cache misses)

Results:
- 99.99% uptime during Black Friday
- $5.1 billion in sales (48 hours)
- Sub-second page loads
- 10x traffic spike handled seamlessly
```

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: Explain how a CDN works and when you would use one.**

**Answer:**
"A CDN is a distributed network of edge servers that cache content close to users, reducing latency and origin load. When a user in Tokyo requests `www.example.com/logo.png`, instead of fetching from the US origin (150ms), the request is routed to the Tokyo edge server (10ms) via anycast DNS. The edge checks its cache—if hit (90-95% of requests), it returns the cached image immediately. If miss, it fetches from origin, caches locally for future requests (based on Cache-Control header), then returns to the user.

**Key components:**

**1. DNS routing:** Anycast or geolocation DNS routes users to nearest edge. Example: Tokyo user → Tokyo edge IP, London user → London edge IP.

**2. Cache hierarchy:** Memory (hot content, < 1ms) → SSD (warm content, 1-10ms) → Origin (cold content, 50-200ms).

**3. Cache control:** Cache-Control headers determine TTL. `max-age=3600` means cache for 1 hour. Versioned URLs (app.v123.js) allow aggressive caching without manual invalidation.

**4. Origin shielding:** Shield server sits between edges and origin, preventing thundering herd. Multiple edges request shield instead of origin, reducing origin load by 80%.

**When to use CDN:**

**1. Static assets (images, CSS, JS):**
- High cache hit ratio (95-99%)
- Long TTL (1 day to 1 year)
- Perfect fit for CDN
- Example: Blog images, app bundles

**2. Video streaming:**
- Massive bandwidth requirements
- Adaptive bitrate (multiple qualities)
- CDN essential for global delivery
- Example: Netflix Open Connect

**3. Global user base:**
- Users in multiple continents
- Latency reduction critical
- Serve from local edge
- Example: E-commerce (Shopify)

**4. DDoS protection:**
- CDN absorbs attacks at edge (Tbps capacity)
- Rate limiting, WAF, challenge pages
- Origin never sees attack traffic
- Example: Cloudflare DDoS mitigation

**When NOT to use CDN:**

**1. Highly dynamic, user-specific content:**
- Low cache hit ratio (< 50%)
- Cost > benefit
- Example: Personalized dashboard

**2. Small user base (single region):**
- If all users in US, US origin is fine
- CDN adds complexity without benefit

**3. Very low traffic:**
- CDN costs > origin bandwidth costs
- Not worth operational overhead

**Real-world impact:**

**Before CDN:**
- 10M users × 20 pages × 51 resources = 10.2B requests/day
- 118K RPS average, 590K RPS peak
- Origin serves all → $63K/month bandwidth
- Latency: 150ms average (global)

**After CDN:**
- 95% cache hit ratio
- 5.9K RPS to origin, 590K RPS to edge
- $3K/month origin + $24K/month CDN = $27K/month (or $200 with Cloudflare)
- Latency: 20ms average (local edge)

**Result:** 57% cost reduction, 7.5x latency improvement, 95% origin load reduction.

**Advanced topics:**

**1. Cache invalidation:** TTL-based (passive) vs purge (active) vs versioned URLs (best). Use versioned URLs (app.[hash].js) to avoid purge complexity.

**2. Multi-CDN:** Primary + backup for 99.99% availability. Example: Cloudflare primary, Fastly backup, DNS failover.

**3. Edge compute:** Run code at edge (Cloudflare Workers, Lambda@Edge). Use cases: A/B testing, geolocation, bot detection.

**4. Origin failover:** CDN health checks origin, serves stale content if origin down (stale-while-revalidate). Better than error page for 90% of requests."

### **Common Follow-Up Questions**

**Q1: How do you handle cache invalidation in a CDN?**
```
Answer:

Three approaches:

1. TTL-Based (Passive):
   - Set Cache-Control: max-age=3600
   - Content stale after 1 hour
   - Next request revalidates with origin (If-None-Match ETag)
   - If unchanged (304), serve cached version
   - If changed (200), replace cache

   Pros:
   ✅ Simple, automatic
   ✅ No manual intervention

   Cons:
   ❌ Stale content for up to TTL duration
   ❌ Can't force immediate update

   Use case: Non-critical content (blog posts, images)

2. Purge/Invalidation (Active):
   - Manually trigger purge via API
   - CDN removes content from all edges
   - Next request = cache miss → Fetch from origin

   curl -X POST https://api.cloudflare.com/purge \
     -d '{"files": ["https://example.com/app.js"]}'

   Pros:
   ✅ Instant update (5-60 seconds globally)
   ✅ Control over timing

   Cons:
   ❌ Manual process (needs automation)
   ❌ Cost (some CDNs charge per purge)
   ❌ Thundering herd (all edges fetch simultaneously)

   Use case: Critical bug fixes, security patches

3. Versioned URLs (Best Practice):
   - Include version/hash in filename
   - Old: /js/app.js → New: /js/app.v123.js
   - No purge needed (new URL = cache miss)

   Implementation:
   Webpack: output.filename: '[name].[contenthash].js'
   Result: app.abc123.js (hash changes when content changes)

   Pros:
   ✅ No purge needed
   ✅ Aggressive caching (max-age=1 year)
   ✅ Instant updates (new URL)
   ✅ Easy rollback (revert HTML to old version)
   ✅ Zero downtime

   Cons:
   ❌ Requires build process
   ❌ HTML must reference new URL

   Use case: All static assets (JS, CSS, images)

Hybrid approach (Best):

For static assets (JS, CSS, images):
- Use versioned URLs
- Cache-Control: max-age=31536000, immutable
- Never purge (not needed)

For HTML:
- Short TTL (Cache-Control: max-age=300)
- Purge on deploy (rare, only HTML)
- HTML references versioned assets

Example deploy process:
1. Build assets: app.abc123.js, style.def456.css
2. Upload assets to origin (new URLs)
3. Update HTML to reference new URLs
4. Purge HTML cache (only HTML, not assets)
5. New requests get new HTML → Load new assets
6. Old assets remain cached (harmless, will expire naturally)

Real-world:
- Vercel/Netlify: Automatic versioning + purge
- Next.js: _next/static/chunks/[hash].js
- Create React App: /static/js/[hash].chunk.js
- Rails: Asset Pipeline with digest paths
```

**Q2: What's the difference between CDN and a load balancer?**
```
Answer:

CDN (Content Delivery Network):

Purpose: Cache and serve content from edge locations close to users
Layer: Layer 7 (Application) + caching
Scope: Global (150-300 locations worldwide)

Key features:
✅ Cache static content (images, videos, CSS, JS)
✅ Reduce latency (serve from nearest edge)
✅ Reduce origin load (90-95% cache hit ratio)
✅ DDoS protection (absorb attacks at edge)
✅ Bandwidth savings (edge bandwidth cheaper)

Flow:
User → Edge (cache hit) → Response (10-50ms)
User → Edge (cache miss) → Origin → Edge → User (100-200ms)

Use cases:
- Static websites
- Video streaming
- Image serving
- Global user base
- DDoS protection

Layer 4 Load Balancer (TCP/UDP):

Purpose: Distribute traffic across multiple servers
Layer: Transport (TCP/UDP)
Scope: Regional (single datacenter or region)

Key features:
✅ Even traffic distribution (round-robin, least connections)
✅ Health checks (remove unhealthy servers)
✅ Session persistence (IP hash)
✅ Fast failover (< 1 second)

Flow:
User → LB → Server 1, 2, or 3 (LB chooses)

Use cases:
- Distribute load across app servers
- Database read replicas
- Microservices

Layer 7 Load Balancer (HTTP/HTTPS):

Purpose: Distribute HTTP traffic with content-aware routing
Layer: Application (HTTP/HTTPS)
Scope: Regional

Key features:
✅ All Layer 4 features +
✅ Path-based routing (/api → API servers, /images → image servers)
✅ Header-based routing (mobile vs desktop)
✅ SSL termination
✅ Request/response modification
✅ Rate limiting

Flow:
User → LB → Parse HTTP → Route to appropriate backend

Use cases:
- Multi-tier applications
- Microservices (API gateway)
- A/B testing (route by cookie)

Comparison:

Aspect          CDN              L4 LB           L7 LB
─────────────────────────────────────────────────────────
Scope           Global           Regional        Regional
Purpose         Cache content    Distribute load Route requests
Latency         10-50ms (edge)   1-5ms          2-10ms
Caching         Yes (primary)    No             Limited
Geography       150+ locations   Single DC      Single DC
DDoS protection Excellent        Limited        Good
Cost            $$               $              $$
When to use     Static assets    Stateless apps Complex routing

Hybrid architecture (Best practice):

┌──────────────────────────────────────────────┐
│              CDN (Cloudflare)                 │
│      Global distribution, caching, DDoS       │
└────────────────┬─────────────────────────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
┌────▼────┐            ┌────▼────┐
│  US LB  │            │  EU LB  │
│ (Layer 7)│            │ (Layer 7)│
└────┬────┘            └────┬────┘
     │                       │
 ┌───┴───┐              ┌───┴───┐
 │       │              │       │
US1    US2            EU1    EU2
(App   (App          (App   (App
Servers) Servers)     Servers) Servers)

Flow:
1. CDN routes user to nearest region (US or EU)
2. Regional L7 LB distributes to app servers
3. App servers process request

Benefits:
✅ CDN: Global distribution, low latency, DDoS protection
✅ L7 LB: Regional traffic management, health checks, advanced routing
✅ Best of both worlds

Real-world examples:
- Shopify: Fastly CDN → Regional load balancers → App servers
- Airbnb: CloudFront CDN → AWS ALB → EC2 instances
- Netflix: Open Connect CDN → Regional control plane → Origin servers
```

**Q3: How would you design a CDN from scratch?**
```
Answer:

High-level architecture:

1. Edge Servers (PoPs):
   - 100+ locations globally
   - Hardware: 32-64 core CPUs, 128-512 GB RAM, 10-100 TB SSD cache, 10-40 Gbps NICs
   - Software: Nginx/Varnish (caching), custom routing logic

2. Routing (DNS + Anycast):
   - Anycast IP: Same IP announced from all edges
   - BGP routing: User connects to nearest edge automatically
   - GeoDNS fallback: Return closest edge IP based on user location

3. Origin Shielding:
   - Shield servers between edges and origin
   - Reduce origin load (single fetch, many edges cache)
   - Protocols: HTTP/2 (multiplexing), QUIC (0-RTT)

4. Control Plane:
   - Configuration management (cache rules, TTLs, purge requests)
   - Monitoring (health checks, metrics, logs)
   - Analytics (cache hit ratio, bandwidth, latency)

5. Storage:
   - Edge cache: In-memory (hot) + SSD (warm)
   - Eviction: LRU + TTL + size limits
   - Replication: On-demand (cache miss triggers fetch)

Detailed components:

A. Routing System:

┌─────────────┐
│  Anycast    │
│  DNS (NS)   │
└──────┬──────┘
       │ (BGP announces same IP from all edges)
       │
   ┌───┴────┬────────┬────────┐
   │        │        │        │
Tokyo    London   NYC    Singapore
Edge     Edge     Edge   Edge
(Same IP announced from all locations)

User query: cdn.example.com
→ DNS returns anycast IP: 192.0.2.1
→ User connects to 192.0.2.1
→ BGP routes to nearest edge (Tokyo if user in Japan)

B. Cache System:

request(url) {
  // Check memory cache (hot content)
  if (memoryCache.has(url)) {
    if (isFresh(memoryCache.get(url))) {
      return memoryCache.get(url);
    }
  }
  
  // Check disk cache (warm content)
  if (diskCache.has(url)) {
    if (isFresh(diskCache.get(url))) {
      // Promote to memory cache
      memoryCache.set(url, diskCache.get(url));
      return diskCache.get(url);
    }
  }
  
  // Cache miss: Fetch from origin shield
  content = fetchFromShield(url);
  
  // Cache based on headers
  cacheControl = parseHeaders(content);
  if (cacheControl.maxAge > 0) {
    diskCache.set(url, content, cacheControl.maxAge);
    if (isHotContent(url)) {
      memoryCache.set(url, content);
    }
  }
  
  return content;
}

isFresh(cachedContent) {
  age = now() - cachedContent.timestamp;
  return age < cachedContent.ttl;
}

C. Origin Shielding:

fetchFromShield(url) {
  // Multiple edges request same URL
  // Shield deduplicates requests
  
  if (shieldCache.has(url)) {
    return shieldCache.get(url);
  }
  
  // Only one fetch to origin, even if 100 edges request simultaneously
  lock(url);
  if (shieldCache.has(url)) {
    unlock(url);
    return shieldCache.get(url);
  }
  
  content = fetchFromOrigin(url);
  shieldCache.set(url, content);
  unlock(url);
  
  return content;
}

D. Purge System:

purge(urls) {
  // Receive purge request from API
  // Example: ["https://example.com/app.js"]
  
  // Fan out to all edge servers
  for (edge in edgeServers) {
    edge.delete(urls);
  }
  
  // Also purge shield cache
  shieldServer.delete(urls);
  
  // Log purge event
  log("Purged URLs: " + urls.join(", "));
  
  // Return when 90%+ edges confirmed (not wait for all)
  // Propagation time: 5-60 seconds globally
}

E. Monitoring:

metrics = {
  requests: counter,
  cacheHits: counter,
  cacheMisses: counter,
  bandwidth: gauge,
  latency: histogram,
  errorRate: counter
};

// Calculate cache hit ratio
cacheHitRatio = (cacheHits / requests) × 100;

// Alert if cache hit ratio drops below 80%
if (cacheHitRatio < 80) {
  alert("Low cache hit ratio: " + cacheHitRatio + "%");
}

// Track per-edge performance
for (edge in edges) {
  track(edge.id, edge.requests, edge.latency, edge.errorRate);
}

Capacity planning:

For 100K RPS globally:
- 100 edge servers (1K RPS each)
- Each edge: 10 TB cache, 10 Gbps network
- Shield: 10 servers (10K RPS each)
- Origin: 50 servers (handle 5-10% traffic = 5-10K RPS)

Cost estimation:
- Edge servers: 100 × $500/month = $50K/month
- Bandwidth: 100 TB/day × $0.05/GB = $150K/month
- Shield: 10 × $500/month = $5K/month
- Origin: 50 × $200/month = $10K/month
Total: $215K/month for 100K RPS global CDN

Compare to Cloudflare:
- $200/month unlimited bandwidth (Business plan)
- They achieve this through massive scale (millions of customers)

Key challenges:

1. Cache coherence:
   - How to ensure all edges have same version?
   - Solution: Purge API + TTL-based expiration

2. Thundering herd:
   - All edges request same content after purge
   - Solution: Origin shielding + rate limiting

3. Consistent hashing:
   - Which edge caches which content?
   - Solution: Anycast (BGP decides), not consistent hashing

4. DDoS mitigation:
   - How to absorb Tbps attacks?
   - Solution: Anycast distribution + rate limiting + challenge pages

5. Cost optimization:
   - Bandwidth costs (biggest expense)
   - Solution: Aggressive caching (95%+ hit ratio), tiered storage (memory → SSD → origin)

Production wisdom:
- Start with managed CDN (Cloudflare, CloudFront)
- Build own CDN only if: 1) Massive scale (Netflix), 2) Unique requirements (low latency live streaming), 3) Cost justification (saves millions)
- Even Netflix uses AWS for control plane, only CDN is custom (Open Connect)
```

### **Key Talking Points**

1. **"CDN caches content at 150+ edge locations globally"**: Core architecture
2. **"Cache hit ratio 90-95%, origin load reduced by 90%"**: Performance impact
3. **"Anycast DNS routes to nearest edge, 10-50ms latency"**: Routing mechanism
4. **"Cache-Control headers control TTL, versioned URLs best practice"**: Cache management
5. **"Origin shielding prevents thundering herd, protects origin"**: Scalability pattern
6. **"Multi-CDN for 99.99% availability, DNS failover"**: Reliability strategy
7. **"CDN absorbs DDoS at edge, Tbps capacity"**: Security benefit
8. **"Use CDN for static assets (images, video), not highly dynamic content"**: When to use

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **CDN Request Flow**

```
User Request: GET https://www.example.com/logo.png

┌─────────────────────────────────────────────────┐
│ 1. DNS Resolution                               │
│    User → DNS: "What is www.example.com?"      │
│    DNS → User: "CDN IP: 192.0.2.1 (anycast)"   │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 2. Connect to Nearest Edge (BGP routing)        │
│    User (Tokyo) → 192.0.2.1 (routes to Tokyo)  │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 3. Tokyo Edge Receives Request                  │
│    GET /logo.png                                │
│    Host: www.example.com                        │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 4. Check Cache (Memory + Disk)                  │
│    cache_key = "www.example.com/logo.png"      │
│    if (cache.has(cache_key)) {                  │
│      if (isFresh(cache.get(cache_key))) {      │
│        return cache.get(cache_key); ← HIT      │
│      }                                          │
│    }                                            │
└───────────────────┬─────────────────────────────┘
                    │ (Cache MISS)
┌───────────────────▼─────────────────────────────┐
│ 5. Fetch from Origin Shield                     │
│    Tokyo Edge → Shield Server                   │
│    GET /logo.png                                │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 6. Shield Checks Its Cache                      │
│    if (shield_cache.has(cache_key)) {          │
│      return shield_cache.get(cache_key);       │
│    }                                            │
└───────────────────┬─────────────────────────────┘
                    │ (Shield cache MISS)
┌───────────────────▼─────────────────────────────┐
│ 7. Fetch from Origin                            │
│    Shield → Origin Server (US West)             │
│    GET /logo.png                                │
│    HTTP/2 persistent connection (reuse)         │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 8. Origin Responds                              │
│    Status: 200 OK                               │
│    Cache-Control: max-age=86400, public         │
│    ETag: "abc123"                               │
│    Body: [logo.png binary data]                 │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 9. Shield Caches Response                       │
│    shield_cache.set(cache_key, response, 86400) │
│    Shield → Tokyo Edge (return response)        │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 10. Edge Caches Response                        │
│     cache.set(cache_key, response, 86400)       │
│     Edge → User (return response)               │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 11. User Receives Response                      │
│     Status: 200 OK                              │
│     Body: [logo.png]                            │
│     Total time: 150ms (cache miss)              │
│                                                 │
│     Next request from Tokyo user:               │
│     Total time: 10ms (cache HIT)                │
└─────────────────────────────────────────────────┘
```

### **Cache Decision Tree**

```
                Request received
                       │
                       ▼
              ┌────────────────┐
              │  Memory cache?  │
              └───┬────────┬───┘
                  │        │
              Yes │        │ No
                  │        │
                  ▼        ▼
            ┌─────────┐   ┌──────────┐
            │  Fresh?  │   │Disk cache?│
            └─┬─────┬─┘   └─┬──────┬─┘
              │     │       │      │
          Yes │     │No  Yes│      │No
              │     │       │      │
              ▼     │       ▼      │
           Return   │    Return    │
          (10ms)    │    (5ms)     │
                    │ Promote to   │
                    │ memory cache │
                    └──────┬───────┘
                           │
                           ▼
                   ┌───────────────┐
                   │Fetch from     │
                   │Shield/Origin  │
                   └───────┬───────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Cacheable?  │
                    │(Cache-Control)│
                    └──┬────────┬──┘
                       │        │
                   Yes │        │ No
                       │        │
                       ▼        ▼
                   Cache     Return
                   locally  (no cache)
                   Return   (100ms)
                   (150ms)
                   
Next request: 10ms (cached)
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why CDN Matters**

**Business Impact:**
- **User experience**: 10-50ms latency (edge) vs 150-300ms (origin) = 3-30x faster page loads
- **Cost savings**: 50-90% bandwidth cost reduction (edge bandwidth cheaper, less origin load)
- **Availability**: 99.99% uptime (distributed edge servers, no single point of failure)
- **Global reach**: Serve users worldwide with local performance

**Technical Impact:**
- **Origin load reduction**: 90-95% of requests served from cache (origin handles 5-10% only)
- **DDoS protection**: Tbps capacity at edge, absorb attacks before reaching origin
- **Bandwidth savings**: 70-90% reduction (cache hit ratio)
- **Scalability**: Infinite edge capacity (add more PoPs as needed)

### **How It Works (Simple Summary)**

1. **User requests** content (www.example.com/logo.png)
2. **DNS routes** to nearest edge server (via anycast or geolocation)
3. **Edge checks cache**: Hit (90-95%) → Return cached content (10-50ms)
4. **Cache miss** (5-10%) → Fetch from origin shield or origin
5. **Cache locally** (based on Cache-Control header) for future requests
6. **Subsequent requests** served from cache (< 10ms)

**For production systems:**
- Use **managed CDN** (Cloudflare, CloudFront, Fastly) for scale and DDoS protection
- Implement **versioned URLs** (app.[hash].js) for zero-downtime cache invalidation
- Set appropriate **Cache-Control** headers (max-age based on content type)
- Enable **origin shielding** to protect origin from thundering herd
- Monitor **cache hit ratio** (target 90-95%), optimize if lower

### **Key Trade-offs**

| Aspect | CDN | Origin Only |
|--------|-----|-------------|
| **Latency** | 10-50ms (edge) | 150-300ms (distance) |
| **Origin load** | 5-10% (cache misses) | 100% (all requests) |
| **Bandwidth cost** | $0.05/GB (edge) | $0.12/GB (origin) |
| **DDoS protection** | Tbps capacity | Limited (origin capacity) |
| **Complexity** | Higher (cache mgmt) | Lower (simple) |
| **Cost** | $200-5000/month | $0-1000/month |

### **Remember These Numbers**

```
Cache hit ratio (typical):       90-95%
Cache miss ratio:                 5-10%

Latency (cache hit):             10-50ms
Latency (cache miss):            100-200ms
Latency (origin only):           150-300ms

Edge servers (major CDN):        150-300 locations
Edge capacity per server:        50K-200K RPS, 10-40 Gbps

Bandwidth cost (origin):         $0.12/GB (AWS EC2)
Bandwidth cost (CDN):            $0.05/GB (AWS CloudFront)
Bandwidth cost (Cloudflare):     $0 (Business plan, unlimited)

TTL for static assets:           86400s (1 day) to 31536000s (1 year)
TTL for HTML:                    300s (5 minutes)
TTL for API responses:           60s (1 minute) if cacheable

Purge propagation time:          5-60 seconds globally

Origin load reduction:           90-95% (with 90-95% cache hit ratio)
Bandwidth cost reduction:        50-90%
```

### **Production Wisdom**

✅ **Use managed CDN** (Cloudflare, CloudFront) unless Netflix-scale  
✅ **Versioned URLs** for static assets (app.[hash].js), never manual purge  
✅ **Set Cache-Control headers** correctly (max-age, public/private, immutable)  
✅ **Enable origin shielding** to prevent thundering herd  
✅ **Monitor cache hit ratio** (target 90-95%, optimize if lower)  
✅ **Multi-CDN for critical apps** (primary + backup, DNS failover)  
✅ **Use CDN for DDoS protection** (Tbps capacity, rate limiting, WAF)  
✅ **Aggressive caching for static** (1 year TTL), short TTL for dynamic (5 min)  

❌ **Don't cache user-specific content** at CDN (privacy risk, low hit ratio)  
❌ **Don't set TTL too short** (reduces cache effectiveness, increases costs)  
❌ **Don't rely on purge for routine updates** (use versioned URLs instead)  
❌ **Don't skip Cache-Control headers** (CDN won't know what to cache)  
❌ **Don't use CDN for everything** (highly dynamic content not worth it)  
❌ **Don't forget to test purge process** (ensure it works before emergency)  

---

**Final thought for interviews:**

> "A CDN is essential for any web application serving a global user base or handling high traffic. It's not just about speed—it's about cost, reliability, and security. By caching static assets at 150+ edge locations globally, companies like Shopify reduce latency from 150ms to 10ms (15x faster), cut bandwidth costs by 70%, and handle 10x traffic spikes during Black Friday without increasing origin capacity. The key insight is that the internet is slow and expensive—the farther your users are from your servers, the worse their experience. CDN solves this by bringing content closer to users. The production pattern is simple: use managed CDN (Cloudflare/CloudFront), implement versioned URLs for cache invalidation, set appropriate Cache-Control headers, and monitor cache hit ratio. For critical applications, add multi-CDN failover. This delivers 99.99% availability, sub-50ms latency globally, and 90% origin load reduction—all for $200-5000/month."
