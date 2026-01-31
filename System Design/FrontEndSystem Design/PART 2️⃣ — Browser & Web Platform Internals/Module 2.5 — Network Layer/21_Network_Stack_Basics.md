# 18. Network Stack Basics (DNS, TCP, TLS, HTTP Lifecycle)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**The network stack** is the complete journey a browser makes from typing a URL to displaying content—encompassing DNS resolution, TCP connection establishment, TLS handshake, and HTTP request/response cycles. Understanding this stack is critical for frontend engineers because **every millisecond of network delay directly impacts user experience**, and optimizing this pipeline can reduce page load times by 30-70%.

### What it is:

The network stack represents the **layered protocol architecture** that enables browser-server communication:

```
User Action: types "https://example.com/page.html"
    ↓
1. DNS Resolution: example.com → 93.184.216.34 (IP address)
    ↓
2. TCP Connection: 3-way handshake (SYN, SYN-ACK, ACK)
    ↓
3. TLS Handshake: Establish encrypted connection (HTTPS)
    ↓
4. HTTP Request: GET /page.html HTTP/2
    ↓
5. HTTP Response: 200 OK + HTML content
    ↓
6. Browser Parsing: Render HTML, CSS, JS
```

**Key components:**

**1. DNS (Domain Name System)** - Translates human-readable domains to IP addresses
- Input: `example.com`
- Output: `93.184.216.34`
- Time: 20-120ms (first visit), 0ms (cached)

**2. TCP (Transmission Control Protocol)** - Establishes reliable connection
- 3-way handshake: SYN → SYN-ACK → ACK
- Time: 1 RTT (Round-Trip Time) = 30-100ms
- Ensures packets arrive in order, no data loss

**3. TLS (Transport Layer Security)** - Encrypts connection for HTTPS
- Handshake exchanges certificates, negotiates cipher
- Time: 1-2 RTT = 30-200ms
- Required for secure data transmission

**4. HTTP (HyperText Transfer Protocol)** - Application-level request/response
- Request: Method (GET/POST), Headers, Body
- Response: Status (200/404), Headers, Body
- Time: 50-500ms (depends on server processing + content size)

### Why it exists:

**Problems it solves:**
1. **Human usability**: Type `google.com` instead of `142.250.80.46`
2. **Reliability**: TCP ensures all data arrives correctly, in order
3. **Security**: TLS encrypts data to prevent eavesdropping/tampering
4. **Application communication**: HTTP provides standardized request/response format
5. **Global scalability**: DNS enables distributed systems across continents

**Without this stack:**
```
Manual IP entry: "Visit 93.184.216.34" ❌
No reliability: Lost packets, corrupted data ❌
No encryption: Passwords sent in plain text ❌
No protocol: Every app invents its own format ❌
```

### When and where it's used:

**Every browser network action uses this stack:**
- **Page navigation**: User clicks link → full DNS/TCP/TLS/HTTP cycle
- **API calls**: `fetch('/api/data')` → reuses TCP/TLS, new HTTP request
- **Asset loading**: `<img src="...">` → parallel HTTP requests
- **WebSocket**: Initial HTTP upgrade → persistent TCP connection
- **Service Worker**: Intercepts requests, can bypass network entirely

**Frontend optimization opportunities:**
- **DNS prefetch**: `<link rel="dns-prefetch" href="//api.example.com">`
- **Preconnect**: `<link rel="preconnect" href="https://cdn.example.com">` (DNS + TCP + TLS)
- **HTTP/2 multiplexing**: Single TCP connection for multiple requests
- **Connection reuse**: Keep-Alive header maintains TCP connection

### Role in large-scale applications:

In production systems with millions of users:

**Typical page load network breakdown:**
```
Total load time: 2.8 seconds

DNS Resolution:     80ms  (2.9%)
TCP Handshake:      50ms  (1.8%)
TLS Handshake:      90ms  (3.2%)
HTTP Request/Response:
  - HTML:          300ms (10.7%)
  - CSS (3 files): 450ms (16.1%)
  - JS (5 files):  900ms (32.1%)
  - Images (10):   930ms (33.2%)

Network overhead (DNS+TCP+TLS): 220ms (7.9%)
Content download: 2580ms (92.1%)
```

**Optimization impact:**
```
Before optimization:
- DNS: 80ms (no caching)
- TCP: 50ms per domain (4 domains = 200ms)
- TLS: 90ms per domain (4 domains = 360ms)
- Total overhead: 640ms

After optimization:
- DNS: 0ms (prefetch + cache)
- TCP: 50ms (single domain via CDN)
- TLS: 90ms (connection reuse)
- Total overhead: 140ms

Improvement: 500ms saved (1.7% of page load faster)
Impact at scale: 500ms × 10M page views/day = 57 days of user time saved/day
```

**Real-world considerations:**
- **Mobile networks**: DNS 200ms+, TCP/TLS 300ms+ (high latency)
- **Geographic distance**: US → Asia RTT = 150-300ms (affects every handshake)
- **Connection quality**: Packet loss = retransmissions = 2-10x slower
- **Cold vs warm connections**: First visit pays full cost, subsequent visits reuse connections

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### DNS Resolution Deep Dive

**DNS hierarchy and lookup process:**

```
User types: https://www.example.com/page.html

Step 1: Browser checks cache
  ├─ Browser DNS cache (60s-300s TTL)
  ├─ OS DNS cache (system resolver)
  └─ Router cache (local network)
  
Step 2: If not cached, query DNS resolver
  ├─ ISP DNS server (8.8.8.8 Google DNS, 1.1.1.1 Cloudflare)
  └─ Recursive resolution begins

Step 3: DNS resolver queries hierarchy
  ├─ Root nameserver:     ".com TLD is at a.gtld-servers.net"
  ├─ TLD nameserver:      "example.com is at ns1.example.com"
  └─ Authoritative NS:    "www.example.com → 93.184.216.34"

Total time: 20-120ms (uncached), 0-5ms (cached)
```

**DNS record types relevant to frontend:**

```javascript
// A Record: IPv4 address
example.com.  300  IN  A  93.184.216.34

// AAAA Record: IPv6 address
example.com.  300  IN  AAAA  2606:2800:220:1:248:1893:25c8:1946

// CNAME Record: Alias to another domain
www.example.com.  300  IN  CNAME  example.com.

// MX Record: Mail server (not directly used by frontend)
example.com.  300  IN  MX  10 mail.example.com.

// TXT Record: Text data (SPF, DKIM, domain verification)
example.com.  300  IN  TXT  "v=spf1 include:_spf.google.com ~all"
```

**DNS caching strategy:**

```javascript
// Browser implements multi-level cache

// Level 1: In-memory cache (per-tab)
const dnsCache = new Map();
dnsCache.set('example.com', {
  ip: '93.184.216.34',
  ttl: 300, // seconds
  expires: Date.now() + 300000
});

// Level 2: Browser cache (persistent)
// Chrome: chrome://net-internals/#dns
// Firefox: about:networking#dns

// Level 3: OS cache
// Windows: ipconfig /displaydns
// Mac/Linux: dscacheutil -q host -a name example.com

// TTL (Time To Live) determines cache duration
// Short TTL (60s): Faster failover, more DNS queries
// Long TTL (86400s): Fewer queries, slower failover
```

**DNS prefetching optimization:**

```html
<!-- Preemptively resolve DNS for known domains -->
<link rel="dns-prefetch" href="//api.example.com">
<link rel="dns-prefetch" href="//cdn.example.com">
<link rel="dns-prefetch" href="//analytics.example.com">

<!-- Browser resolves these domains in parallel during idle time -->
<!-- When actually needed, DNS is already cached (0ms lookup) -->
```

**DNS over HTTPS (DoH) - Modern security:**

```javascript
// Traditional DNS: Plain text, visible to ISP
// Query: "What is example.com?" → Visible to network

// DNS over HTTPS: Encrypted
fetch('https://cloudflare-dns.com/dns-query?name=example.com', {
  headers: { 'Accept': 'application/dns-json' }
});

// Response:
{
  "Answer": [
    { "name": "example.com", "type": 1, "TTL": 300, "data": "93.184.216.34" }
  ]
}

// Benefits: Privacy, security, bypass censorship
// Tradeoff: Slightly slower (HTTPS overhead)
```

### TCP Connection Establishment

**3-way handshake in detail:**

```
Client (Browser)                Server (example.com:443)

1. SYN →
   Flags: SYN
   Seq: 1000 (random initial sequence number)
   
                                ← 2. SYN-ACK
                                   Flags: SYN, ACK
                                   Seq: 5000 (server's random ISN)
                                   Ack: 1001 (client seq + 1)

3. ACK →
   Flags: ACK
   Seq: 1001
   Ack: 5001

Connection established! Can now send data.

Total time: 1 RTT (Round-Trip Time)
- LAN: 1-5ms
- Same country: 10-50ms
- Cross-continent: 150-300ms
```

**TCP congestion control (affects performance):**

```javascript
// TCP slow start: Begin conservatively, increase exponentially

Initial window: 10 segments (14KB with 1460 byte MSS)

RTT 1: Send 10 segments
RTT 2: Send 20 segments (doubled)
RTT 3: Send 40 segments (doubled)
RTT 4: Send 80 segments (doubled)
// Continue until packet loss or congestion

// Why this matters for frontend:
// First HTTP request limited to ~14KB in first RTT
// Large HTML (>14KB) requires multiple RTTs
// Optimization: Inline critical CSS (<14KB HTML)

// Example:
// HTML with inline CSS: 12KB → 1 RTT
// HTML + external CSS: 5KB + 50KB CSS → 2 RTT (slower)
```

**TCP Keep-Alive and connection reuse:**

```http
# HTTP/1.1 Keep-Alive (connection reuse)

Request 1:
GET /page.html HTTP/1.1
Host: example.com
Connection: keep-alive

Response 1:
HTTP/1.1 200 OK
Connection: keep-alive
Keep-Alive: timeout=5, max=100

# Connection stays open for 5 seconds or 100 requests
# Subsequent requests skip TCP handshake

Request 2 (reuses connection):
GET /style.css HTTP/1.1
Host: example.com
Connection: keep-alive

# Savings: 1 RTT per request (30-100ms each)
```

**Head-of-Line Blocking (HTTP/1.1 problem):**

```
HTTP/1.1: One request at a time per TCP connection

Request 1: GET /large-image.jpg (5MB, takes 10 seconds)
Request 2: GET /style.css (waiting...)
Request 3: GET /script.js (waiting...)

# Requests 2 and 3 blocked behind request 1
# Solution: Open multiple connections (6 per domain limit)

Connection 1: /large-image.jpg
Connection 2: /style.css
Connection 3: /script.js
Connection 4: /another.js
Connection 5: /data.json
Connection 6: /icon.png

# But: Each connection = separate TCP handshake
# HTTP/2 solves this with multiplexing
```

### TLS Handshake Deep Dive

**TLS 1.3 handshake (modern, fastest):**

```
Client                                     Server

1. ClientHello →
   - Supported cipher suites
   - Random nonce
   - Supported TLS versions
   - Key share (for early key agreement)

                              ← 2. ServerHello
                                 - Selected cipher
                                 - Server certificate
                                 - Key share
                                 - [Encrypted extensions]

3. [Client finishes key derivation]
   ← Application data can flow immediately

Total: 1 RTT (vs 2 RTT in TLS 1.2)
Time: 30-100ms (same country), 150-300ms (cross-continent)
```

**TLS 1.2 vs TLS 1.3 comparison:**

```
TLS 1.2:
  ClientHello → 
               ← ServerHello, Certificate, ServerKeyExchange, ServerHelloDone
  ClientKeyExchange, ChangeCipherSpec, Finished →
               ← ChangeCipherSpec, Finished
  [Application data]
  
  Time: 2 RTT = 60-200ms

TLS 1.3:
  ClientHello (+ key share) →
               ← ServerHello (+ key share), Certificate, Finished
  [Application data]
  
  Time: 1 RTT = 30-100ms
  
  Performance improvement: 50% faster TLS handshake
```

**TLS Session Resumption (0-RTT):**

```javascript
// First connection: Full TLS handshake (1-2 RTT)
// Server sends session ticket

// Subsequent connections within ticket lifetime:
// Client sends session ticket in ClientHello
// Server resumes session without full handshake
// Time: 0 RTT for TLS (instant!)

// HTTP/1.1 timeline:
// DNS: 0ms (cached)
// TCP: 50ms (1 RTT)
// TLS: 0ms (session resumption)
// HTTP: 50ms
// Total: 100ms (vs 220ms without resumption)

// Benefit: 55% faster connection establishment
```

**Certificate validation process:**

```
Browser receives server certificate:
  ├─ Check certificate expiration
  │  └─ Valid from: 2024-01-01, Valid to: 2025-01-01 ✓
  │
  ├─ Verify domain name matches
  │  └─ Certificate CN: *.example.com, Connecting to: www.example.com ✓
  │
  ├─ Validate certificate chain
  │  └─ Server cert → Intermediate CA → Root CA (trusted) ✓
  │
  ├─ Check revocation status (OCSP or CRL)
  │  └─ Certificate not revoked ✓
  │
  └─ Verify digital signature
     └─ Signature valid ✓

Total time: 10-50ms
Cached: 0ms (OCSP response cached)

⚠️ If any check fails: ERR_CERT_AUTHORITY_INVALID
```

### HTTP Request/Response Lifecycle

**Complete HTTP/2 request anatomy:**

```http
:method: GET
:scheme: https
:authority: example.com
:path: /api/users/123
accept: application/json
accept-encoding: gzip, br
accept-language: en-US,en;q=0.9
cache-control: no-cache
user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
cookie: session=abc123; user_pref=dark_mode

# HTTP/2 uses binary format, not text
# Headers compressed with HPACK
```

**HTTP/2 multiplexing (solves head-of-line blocking):**

```
Single TCP connection, multiple streams:

Stream 1: GET /page.html
Stream 2: GET /style.css
Stream 3: GET /script.js
Stream 4: GET /image.jpg
Stream 5: GET /data.json

All requests/responses interleaved on same connection:
Frame: HEADERS (Stream 1)
Frame: HEADERS (Stream 2)
Frame: DATA (Stream 1, chunk 1)
Frame: HEADERS (Stream 3)
Frame: DATA (Stream 2, chunk 1)
Frame: DATA (Stream 1, chunk 2)
Frame: DATA (Stream 3, chunk 1)
...

Benefits:
- No head-of-line blocking at HTTP level
- Single connection = single TCP handshake
- Server push possible (push CSS before requested)
```

**HTTP/3 and QUIC (cutting edge):**

```
Traditional stack:
HTTP/2 → TLS → TCP → IP

HTTP/3 stack:
HTTP/3 → QUIC (includes TLS 1.3) → UDP → IP

Advantages:
1. 0-RTT connection establishment (resume)
   DNS: 0ms, TCP: 0ms, TLS: 0ms, Total: 0ms

2. No head-of-line blocking at transport level
   TCP packet loss blocks all streams
   QUIC packet loss only blocks affected stream

3. Connection migration
   Switch WiFi → Cellular, connection persists
   TCP connection breaks, must reconnect

4. Built-in encryption (TLS 1.3 integrated)

Performance: 30-50% faster page loads on lossy networks
Adoption: 75% of Chrome connections (2024)
```

**HTTP status codes and frontend handling:**

```javascript
// 2xx Success
200 OK              → Normal success
201 Created         → POST created resource
204 No Content      → Success, no response body
206 Partial Content → Range request (video streaming)

// 3xx Redirection
301 Moved Permanently → Update bookmarks, permanent redirect
302 Found            → Temporary redirect
304 Not Modified     → ETag match, use cache
307 Temporary Redirect → Preserve method (POST stays POST)

// 4xx Client Error
400 Bad Request      → Malformed request
401 Unauthorized     → Authentication required
403 Forbidden        → Authenticated but not authorized
404 Not Found        → Resource doesn't exist
429 Too Many Requests → Rate limit exceeded

// 5xx Server Error
500 Internal Server Error → Server bug
502 Bad Gateway          → Upstream server failed
503 Service Unavailable  → Server overloaded, retry
504 Gateway Timeout      → Upstream server timeout

// Frontend error handling:
async function fetchWithRetry(url) {
  const response = await fetch(url);
  
  if (response.status >= 500 && response.status < 600) {
    // Server error: retry with exponential backoff
    await sleep(1000);
    return fetchWithRetry(url);
  }
  
  if (response.status === 429) {
    // Rate limited: wait and retry
    const retryAfter = response.headers.get('Retry-After');
    await sleep(retryAfter * 1000);
    return fetchWithRetry(url);
  }
  
  if (response.status >= 400 && response.status < 500) {
    // Client error: don't retry, show error to user
    throw new Error(`Client error: ${response.status}`);
  }
  
  return response;
}
```

### Performance Optimization Strategies

**Connection prewarming:**

```html
<!-- DNS prefetch: Resolve domain early -->
<link rel="dns-prefetch" href="//api.example.com">
<!-- Time saved: 20-120ms -->

<!-- Preconnect: DNS + TCP + TLS -->
<link rel="preconnect" href="https://cdn.example.com">
<!-- Time saved: 100-400ms (full connection cost) -->

<!-- Prefetch: Download resource for future navigation -->
<link rel="prefetch" href="/next-page.html">
<!-- Loads in background, cached for instant next page -->

<!-- Preload: Download resource for current page (high priority) -->
<link rel="preload" href="/critical.css" as="style">
<!-- Loads immediately, critical for rendering -->
```

**HTTP/2 Server Push (proactive sending):**

```javascript
// Server anticipates client needs, pushes resources

// Client requests: GET /index.html
// Server responds:
// 1. PUSH_PROMISE: /style.css (stream 2)
// 2. PUSH_PROMISE: /script.js (stream 4)
// 3. HEADERS + DATA: /index.html (stream 1)
// 4. HEADERS + DATA: /style.css (stream 2)
// 5. HEADERS + DATA: /script.js (stream 4)

// Client receives CSS and JS before parsing HTML!
// Benefit: Eliminates 1 RTT for critical resources

// Tradeoff: Might push resources already cached
// Solution: Check cache status before pushing (complex)
```

**Connection pooling and domain sharding:**

```javascript
// HTTP/1.1: 6 connections per domain (browser limit)
// Assets spread across domains for parallelism

// Before (1 domain):
example.com:
  - image1.jpg  ┐
  - image2.jpg  │ 6 parallel
  - image3.jpg  │ connections
  - image4.jpg  │ (browser limit)
  - image5.jpg  │
  - image6.jpg  ┘
  - image7.jpg  ← Waiting...
  - image8.jpg  ← Waiting...

// After (domain sharding):
cdn1.example.com: image1.jpg, image2.jpg  (6 connections)
cdn2.example.com: image3.jpg, image4.jpg  (6 connections)
cdn3.example.com: image5.jpg, image6.jpg  (6 connections)
cdn4.example.com: image7.jpg, image8.jpg  (6 connections)

Total: 24 parallel connections

// HTTP/2: Domain sharding is anti-pattern!
// Single connection multiplexes all requests
// Extra domains = extra TCP/TLS handshakes (slower)
```

**Resource timing API for monitoring:**

```javascript
// Measure actual network performance
const perfEntry = performance.getEntriesByType('navigation')[0];

const timings = {
  dns: perfEntry.domainLookupEnd - perfEntry.domainLookupStart,
  tcp: perfEntry.connectEnd - perfEntry.connectStart,
  tls: perfEntry.secureConnectionStart > 0 
    ? perfEntry.connectEnd - perfEntry.secureConnectionStart 
    : 0,
  ttfb: perfEntry.responseStart - perfEntry.requestStart,
  download: perfEntry.responseEnd - perfEntry.responseStart,
  total: perfEntry.responseEnd - perfEntry.fetchStart
};

console.log('Network breakdown:', timings);
// Output:
// {
//   dns: 45ms,
//   tcp: 52ms,
//   tls: 87ms,
//   ttfb: 234ms,
//   download: 156ms,
//   total: 574ms
// }

// Use this data to:
// - Identify slow DNS (cache issue?)
// - High TLS time (session resumption not working?)
// - Long TTFB (server slow?)
// - Slow download (large response? compression?)
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: Network Waterfall Analyzer

```javascript
// networkAnalyzer.js - Analyze page load network performance

class NetworkWaterfallAnalyzer {
  constructor() {
    this.entries = [];
    this.collectMetrics();
  }
  
  collectMetrics() {
    // Get all resource timings
    const resources = performance.getEntriesByType('resource');
    const navigation = performance.getEntriesByType('navigation')[0];
    
    this.entries = [navigation, ...resources].map(entry => ({
      name: entry.name,
      type: this.getResourceType(entry),
      timings: this.extractTimings(entry),
      size: entry.transferSize || 0,
      cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
      protocol: entry.nextHopProtocol || 'unknown'
    }));
  }
  
  getResourceType(entry) {
    if (entry.entryType === 'navigation') return 'document';
    
    const url = entry.name;
    if (entry.initiatorType) return entry.initiatorType;
    
    // Fallback: guess from URL
    if (url.match(/\.(css)$/)) return 'stylesheet';
    if (url.match(/\.(js)$/)) return 'script';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    
    return 'other';
  }
  
  extractTimings(entry) {
    return {
      // Connection phase
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      tls: entry.secureConnectionStart > 0 
        ? entry.connectEnd - entry.secureConnectionStart 
        : 0,
      
      // Request/response phase
      waiting: entry.responseStart - entry.requestStart, // TTFB
      download: entry.responseEnd - entry.responseStart,
      
      // Total
      total: entry.responseEnd - entry.startTime,
      
      // Breakdown
      connection: entry.connectEnd - entry.fetchStart,
      request: entry.responseEnd - entry.requestStart
    };
  }
  
  analyzeBottlenecks() {
    const analysis = {
      totalDNS: 0,
      totalTCP: 0,
      totalTLS: 0,
      totalWaiting: 0,
      totalDownload: 0,
      slowestResources: [],
      recommendations: []
    };
    
    // Aggregate timings
    this.entries.forEach(entry => {
      analysis.totalDNS += entry.timings.dns;
      analysis.totalTCP += entry.timings.tcp;
      analysis.totalTLS += entry.timings.tls;
      analysis.totalWaiting += entry.timings.waiting;
      analysis.totalDownload += entry.timings.download;
    });
    
    // Find slowest resources
    analysis.slowestResources = this.entries
      .sort((a, b) => b.timings.total - a.timings.total)
      .slice(0, 10)
      .map(entry => ({
        url: entry.name,
        type: entry.type,
        time: Math.round(entry.timings.total),
        breakdown: {
          connection: Math.round(entry.timings.connection),
          waiting: Math.round(entry.timings.waiting),
          download: Math.round(entry.timings.download)
        }
      }));
    
    // Generate recommendations
    if (analysis.totalDNS > 200) {
      analysis.recommendations.push({
        issue: 'High DNS lookup time',
        value: `${Math.round(analysis.totalDNS)}ms`,
        solution: 'Add dns-prefetch for external domains'
      });
    }
    
    if (analysis.totalTLS > 500) {
      analysis.recommendations.push({
        issue: 'High TLS handshake time',
        value: `${Math.round(analysis.totalTLS)}ms`,
        solution: 'Reduce number of domains, enable TLS session resumption'
      });
    }
    
    const nonCached = this.entries.filter(e => !e.cached);
    if (nonCached.length > 20) {
      analysis.recommendations.push({
        issue: 'Too many uncached resources',
        value: `${nonCached.length} resources`,
        solution: 'Implement better caching strategy, use HTTP/2 server push'
      });
    }
    
    const http1Resources = this.entries.filter(e => 
      e.protocol === 'http/1.1'
    );
    if (http1Resources.length > 0) {
      analysis.recommendations.push({
        issue: 'Using HTTP/1.1',
        value: `${http1Resources.length} resources`,
        solution: 'Upgrade to HTTP/2 or HTTP/3 for better performance'
      });
    }
    
    return analysis;
  }
  
  visualizeWaterfall() {
    console.log('\n📊 Network Waterfall Analysis\n');
    
    this.entries.forEach(entry => {
      const { timings } = entry;
      const scale = 1; // 1 char = 10ms
      
      const dnsBar = '█'.repeat(Math.ceil(timings.dns / 10));
      const tcpBar = '█'.repeat(Math.ceil(timings.tcp / 10));
      const tlsBar = '█'.repeat(Math.ceil(timings.tls / 10));
      const waitBar = '█'.repeat(Math.ceil(timings.waiting / 10));
      const dlBar = '█'.repeat(Math.ceil(timings.download / 10));
      
      console.log(`${entry.type.padEnd(12)} ${entry.name.substring(0, 40)}`);
      console.log(`  DNS:  ${dnsBar} ${Math.round(timings.dns)}ms`);
      console.log(`  TCP:  ${tcpBar} ${Math.round(timings.tcp)}ms`);
      console.log(`  TLS:  ${tlsBar} ${Math.round(timings.tls)}ms`);
      console.log(`  Wait: ${waitBar} ${Math.round(timings.waiting)}ms`);
      console.log(`  DL:   ${dlBar} ${Math.round(timings.download)}ms`);
      console.log(`  Total: ${Math.round(timings.total)}ms\n`);
    });
  }
  
  generateReport() {
    const analysis = this.analyzeBottlenecks();
    
    console.log('\n═══════════════════════════════════════');
    console.log('   NETWORK PERFORMANCE REPORT');
    console.log('═══════════════════════════════════════\n');
    
    console.log('📈 Aggregate Timings:');
    console.log(`  DNS:      ${Math.round(analysis.totalDNS)}ms`);
    console.log(`  TCP:      ${Math.round(analysis.totalTCP)}ms`);
    console.log(`  TLS:      ${Math.round(analysis.totalTLS)}ms`);
    console.log(`  Waiting:  ${Math.round(analysis.totalWaiting)}ms`);
    console.log(`  Download: ${Math.round(analysis.totalDownload)}ms\n`);
    
    console.log('🐌 Slowest Resources:');
    console.table(analysis.slowestResources);
    
    if (analysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. ${rec.issue} (${rec.value})`);
        console.log(`   → ${rec.solution}`);
      });
    }
    
    return analysis;
  }
}

// Usage
window.addEventListener('load', () => {
  setTimeout(() => {
    const analyzer = new NetworkWaterfallAnalyzer();
    analyzer.visualizeWaterfall();
    analyzer.generateReport();
  }, 1000);
});
```

### Example 2: Connection Prewarming System

```javascript
// connectionPrewarmer.js - Intelligently prewarm connections

class ConnectionPrewarmer {
  constructor(options = {}) {
    this.config = {
      enableDNSPrefetch: options.enableDNSPrefetch !== false,
      enablePreconnect: options.enablePreconnect !== false,
      hoverDelay: options.hoverDelay || 200, // ms before preconnect
      priorityDomains: options.priorityDomains || []
    };
    
    this.prewarmedDomains = new Set();
    this.init();
  }
  
  init() {
    // Prewarm priority domains immediately
    this.prewarmPriorityDomains();
    
    // Set up hover-based prewarming
    this.setupHoverPrewarming();
    
    // Discover and prefetch domains from page
    this.discoverDomains();
  }
  
  prewarmPriorityDomains() {
    this.config.priorityDomains.forEach(domain => {
      this.preconnect(domain);
    });
  }
  
  discoverDomains() {
    // Find all external domains referenced on page
    const domains = new Set();
    
    // From <a> tags
    document.querySelectorAll('a[href^="http"]').forEach(link => {
      try {
        const url = new URL(link.href);
        if (url.origin !== window.location.origin) {
          domains.add(url.origin);
        }
      } catch (e) {
        // Invalid URL
      }
    });
    
    // From <img> tags
    document.querySelectorAll('img[src^="http"]').forEach(img => {
      try {
        const url = new URL(img.src);
        if (url.origin !== window.location.origin) {
          domains.add(url.origin);
        }
      } catch (e) {
        // Invalid URL
      }
    });
    
    // From <script> tags
    document.querySelectorAll('script[src^="http"]').forEach(script => {
      try {
        const url = new URL(script.src);
        if (url.origin !== window.location.origin) {
          domains.add(url.origin);
        }
      } catch (e) {
        // Invalid URL
      }
    });
    
    // DNS prefetch for discovered domains
    domains.forEach(domain => {
      if (!this.prewarmedDomains.has(domain)) {
        this.dnsPrefetch(domain);
      }
    });
  }
  
  setupHoverPrewarming() {
    let hoverTimeout;
    
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('a[href]');
      
      if (!link) return;
      
      // Wait for hover to persist before prewarming
      hoverTimeout = setTimeout(() => {
        try {
          const url = new URL(link.href, window.location.origin);
          
          if (url.origin !== window.location.origin) {
            this.preconnect(url.origin);
          }
        } catch (e) {
          // Invalid URL
        }
      }, this.config.hoverDelay);
    });
    
    document.addEventListener('mouseout', () => {
      clearTimeout(hoverTimeout);
    });
  }
  
  dnsPrefetch(domain) {
    if (!this.config.enableDNSPrefetch) return;
    if (this.prewarmedDomains.has(domain)) return;
    
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
    
    this.prewarmedDomains.add(domain);
    console.log(`🔍 DNS prefetch: ${domain}`);
  }
  
  preconnect(domain) {
    if (!this.config.enablePreconnect) return;
    if (this.prewarmedDomains.has(domain)) return;
    
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    
    this.prewarmedDomains.add(domain);
    console.log(`🔌 Preconnect: ${domain}`);
  }
  
  getStats() {
    return {
      prewarmedDomains: Array.from(this.prewarmedDomains),
      count: this.prewarmedDomains.size
    };
  }
}

// Usage
const prewarmer = new ConnectionPrewarmer({
  enableDNSPrefetch: true,
  enablePreconnect: true,
  hoverDelay: 200,
  priorityDomains: [
    'https://api.example.com',
    'https://cdn.example.com',
    'https://analytics.example.com'
  ]
});

// Check stats
console.log('Prewarmed:', prewarmer.getStats());
```

### Example 3: HTTP/2 vs HTTP/1.1 Comparison Tool

```javascript
// protocolComparison.js - Measure HTTP/1.1 vs HTTP/2 performance

class ProtocolPerformanceComparison {
  constructor() {
    this.results = {
      http1: { requests: 0, totalTime: 0, avgTime: 0 },
      http2: { requests: 0, totalTime: 0, avgTime: 0 }
    };
  }
  
  async testHTTP1(urls) {
    console.log('Testing HTTP/1.1 performance...');
    const startTime = performance.now();
    
    // Simulate HTTP/1.1: Sequential requests (simplified)
    // In reality, browsers open 6 parallel connections
    const results = [];
    
    for (const url of urls) {
      const reqStart = performance.now();
      try {
        await fetch(url, { cache: 'no-store' });
        const reqTime = performance.now() - reqStart;
        results.push({ url, time: reqTime });
      } catch (e) {
        results.push({ url, time: -1, error: e.message });
      }
    }
    
    const totalTime = performance.now() - startTime;
    
    this.results.http1 = {
      requests: urls.length,
      totalTime: Math.round(totalTime),
      avgTime: Math.round(totalTime / urls.length),
      details: results
    };
    
    return this.results.http1;
  }
  
  async testHTTP2(urls) {
    console.log('Testing HTTP/2 performance...');
    const startTime = performance.now();
    
    // HTTP/2: Parallel requests (multiplexing)
    const requests = urls.map(url =>
      fetch(url, { cache: 'no-store' })
        .then(response => ({
          url,
          time: performance.now() - startTime,
          status: response.status
        }))
        .catch(error => ({
          url,
          time: -1,
          error: error.message
        }))
    );
    
    const results = await Promise.all(requests);
    const totalTime = performance.now() - startTime;
    
    this.results.http2 = {
      requests: urls.length,
      totalTime: Math.round(totalTime),
      avgTime: Math.round(totalTime / urls.length),
      details: results
    };
    
    return this.results.http2;
  }
  
  compareResults() {
    const improvement = (
      (this.results.http1.totalTime - this.results.http2.totalTime) / 
      this.results.http1.totalTime * 100
    );
    
    console.log('\n═══════════════════════════════════════');
    console.log('   PROTOCOL PERFORMANCE COMPARISON');
    console.log('═══════════════════════════════════════\n');
    
    console.log('HTTP/1.1 Results:');
    console.log(`  Total Time: ${this.results.http1.totalTime}ms`);
    console.log(`  Avg Time:   ${this.results.http1.avgTime}ms`);
    console.log(`  Requests:   ${this.results.http1.requests}\n`);
    
    console.log('HTTP/2 Results:');
    console.log(`  Total Time: ${this.results.http2.totalTime}ms`);
    console.log(`  Avg Time:   ${this.results.http2.avgTime}ms`);
    console.log(`  Requests:   ${this.results.http2.requests}\n`);
    
    console.log('Performance Improvement:');
    console.log(`  HTTP/2 is ${improvement.toFixed(1)}% faster`);
    console.log(`  Time saved: ${this.results.http1.totalTime - this.results.http2.totalTime}ms\n`);
    
    return {
      http1: this.results.http1,
      http2: this.results.http2,
      improvement: improvement.toFixed(1)
    };
  }
  
  detectProtocol() {
    const entries = performance.getEntriesByType('resource');
    const protocols = {};
    
    entries.forEach(entry => {
      const protocol = entry.nextHopProtocol || 'unknown';
      protocols[protocol] = (protocols[protocol] || 0) + 1;
    });
    
    console.log('\n📊 Protocol Usage:');
    Object.entries(protocols).forEach(([protocol, count]) => {
      console.log(`  ${protocol}: ${count} resources`);
    });
    
    return protocols;
  }
}

// Usage
const tester = new ProtocolPerformanceComparison();

// Detect current protocol usage
tester.detectProtocol();

// Test URLs (replace with your actual endpoints)
const testURLs = [
  '/api/data1.json',
  '/api/data2.json',
  '/api/data3.json',
  '/api/data4.json',
  '/api/data5.json'
];

// Run comparison
async function runComparison() {
  await tester.testHTTP1(testURLs);
  await tester.testHTTP2(testURLs);
  tester.compareResults();
}

// runComparison();
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "Walk me through what happens when a user types a URL and hits enter, from a network perspective."**

**Strong Answer:**

"I'll walk through the complete network stack from URL entry to content display, focusing on the critical path and optimization opportunities at each layer.

**Step 1: DNS Resolution** (20-120ms first visit, 0ms cached)

When the user types `https://example.com`, the browser must resolve the domain to an IP address. First, it checks its multi-level DNS cache—browser cache, OS cache, router cache. If not found, it queries a DNS resolver, typically the ISP's DNS or a public resolver like 8.8.8.8 Cloudflare's 1.1.1.1.

The resolver performs recursive resolution: queries the root nameserver for '.com' TLD location, queries the TLD nameserver for 'example.com' authoritative server, then queries that server for the actual IP address. The response includes a TTL—time-to-live—determining how long to cache this mapping. Short TTLs (60s) enable fast failover but increase DNS queries; long TTLs (86400s) reduce queries but slow updates.

**Optimization opportunity**: `<link rel="dns-prefetch" href="//api.example.com">` triggers early DNS resolution during idle time, so when the resource is actually needed, DNS is cached—saving 20-120ms. We implement this for all known external domains.

**Step 2: TCP Connection** (1 RTT = 30-100ms same country, 150-300ms cross-continent)

With the IP address resolved, the browser initiates a TCP 3-way handshake to establish a reliable connection. Client sends SYN with initial sequence number, server responds with SYN-ACK acknowledging client's sequence and sending its own, client sends ACK to confirm. This takes exactly 1 RTT—round-trip time—which varies dramatically by distance and network quality.

TCP uses slow start for congestion control, beginning with a small window (typically 10 segments = ~14KB). This means the first HTTP request can only send 14KB in the first RTT. If your HTML is larger, it requires additional RTTs. This is why inlining critical CSS to keep HTML under 14KB is so powerful—the entire initial response fits in one RTT.

**Optimization opportunity**: `<link rel="preconnect" href="https://cdn.example.com">` performs DNS + TCP + TLS preemptively. When you later fetch resources from that domain, the connection is already warm—saving 100-400ms. We use this for critical third-party domains like analytics and CDN.

**Step 3: TLS Handshake** (1 RTT for TLS 1.3, 2 RTT for TLS 1.2 = 30-200ms)

For HTTPS, the browser must establish an encrypted connection via TLS. Modern TLS 1.3 completes this in 1 RTT: client sends ClientHello with cipher suites and key share, server responds with ServerHello, certificate, and key share. They derive encryption keys and can immediately send application data.

Older TLS 1.2 requires 2 RTTs—client hello, server hello + certificate, client key exchange, then application data. This alone doubles the handshake time (60-200ms vs 30-100ms), which is why upgrading to TLS 1.3 is a significant performance win.

**Session resumption** is critical for repeat visits. The server sends a session ticket after the first full handshake. On subsequent connections, the client presents this ticket, and the server resumes without a full handshake—0 RTT for TLS. This cuts connection time by 30-50%, making repeat page loads significantly faster.

**Step 4: HTTP Request/Response** (50-500ms depending on server processing and content size)

The browser sends an HTTP request with method (GET/POST), path, headers (cookies, accept-encoding, user-agent), and optional body. The server processes the request, generates a response, and sends it back with status code, headers (content-type, cache-control, set-cookie), and body.

**HTTP/2 multiplexing** is transformative here. In HTTP/1.1, each TCP connection handles one request at a time, creating head-of-line blocking—if a large image takes 10 seconds to download, subsequent requests on that connection are blocked. Browsers work around this by opening 6 parallel connections per domain, but each connection requires separate TCP/TLS handshakes.

HTTP/2 multiplexes multiple requests over a single TCP connection using binary frames and stream IDs. Request 1 (HTML), request 2 (CSS), request 3 (JS) all interleave frames on one connection. No head-of-line blocking at the HTTP level, only one TCP/TLS handshake needed. Domain sharding—spreading assets across multiple domains to bypass the 6-connection limit—becomes an anti-pattern in HTTP/2 because extra domains mean extra handshakes.

**HTTP/3 with QUIC** goes further, eliminating head-of-line blocking at the transport level. TCP packet loss blocks all streams because packets must arrive in order. QUIC uses UDP with per-stream ordering, so one stream's lost packet doesn't block others. It also enables 0-RTT connection establishment on repeat visits—no TCP handshake, no TLS handshake—and connection migration (switch from WiFi to cellular without reconnecting). We've measured 30-50% faster page loads on lossy mobile networks with HTTP/3.

**Step 5: Browser Parsing and Rendering**

The browser parses HTML, constructing the DOM. When it encounters external resources (CSS, JS, images), it initiates additional network requests. CSS blocks rendering (render-blocking), JavaScript blocks parsing unless async/defer is used. This is where resource prioritization matters—browsers assign priority scores to resources (highest for blocking CSS, lower for images below fold) and schedule requests accordingly.

**Real-world optimization example**: On a high-traffic e-commerce platform with global users, we optimized the network stack end-to-end:

```
Before optimization:
- DNS: 80ms (no prefetch)
- TCP: 50ms per domain (4 domains = 200ms)
- TLS: 90ms per domain, no resumption (4 domains = 360ms)
- HTTP/1.1: 6 connections per domain, head-of-line blocking
- Total connection overhead: 640ms

After optimization:
- DNS: 0ms (dns-prefetch for all external domains)
- TCP: 50ms (single domain via CDN consolidation)
- TLS: 0ms on repeat visits (session resumption)
- HTTP/2: Multiplexing on single connection
- Total connection overhead: 50ms first visit, 0ms repeat

Impact: 
- First visit: 590ms faster (19% of page load)
- Repeat visit: 640ms faster (23% of page load)
- Mobile users (high latency): 1200ms+ faster
- Annual time saved: 15,000 person-hours at scale
```

The key insight: every layer of the network stack presents optimization opportunities. DNS prefetch and preconnect eliminate lookup and handshake latency. TLS 1.3 and session resumption cut encryption overhead in half. HTTP/2 eliminates head-of-line blocking and reduces connection overhead. HTTP/3 further optimizes for mobile networks. Understanding this stack lets you make architectural decisions—consolidate domains to reduce handshakes, inline critical resources to fit in initial TCP window, prioritize above-fold content—that compound into massive performance gains at scale."

### Likely Follow-Up Questions

1. **"What's the difference between preconnect and prefetch?"**

**Answer:**
- **Preconnect**: Establishes full connection (DNS + TCP + TLS) without downloading content
  ```html
  <link rel="preconnect" href="https://api.example.com">
  ```
  - Use when: You KNOW you'll need resources from this domain soon (current page)
  - Time saved: 100-400ms (full connection establishment)
  - Cost: Opens real connection (consumes resources)
  
- **Prefetch**: Downloads actual resource for future navigation
  ```html
  <link rel="prefetch" href="/next-page.html">
  ```
  - Use when: User LIKELY to navigate to this resource next (low priority)
  - Time saved: Entire download time on next page
  - Cost: Downloads content (bandwidth usage)
  
- **DNS-prefetch**: Only resolves DNS, doesn't connect
  ```html
  <link rel="dns-prefetch" href="//cdn.example.com">
  ```
  - Use when: You MIGHT need resources (speculative)
  - Time saved: 20-120ms (DNS lookup)
  - Cost: Minimal (just DNS query)

2. **"How does HTTP/2 server push work, and when should you use it?"**

**Answer:**
```javascript
// Server can push resources before client requests them

// Client requests: GET /index.html
// Server responds:
// 1. PUSH_PROMISE for /style.css
// 2. PUSH_PROMISE for /script.js
// 3. Send /index.html
// 4. Send /style.css (pushed)
// 5. Send /script.js (pushed)

// Client receives CSS/JS before parsing HTML!
// Eliminates 1 RTT per resource
```

**When to use:**
- Critical resources needed by ALL users (main CSS/JS)
- Resources not in browser cache yet
- You control both server and HTML

**When NOT to use:**
- Resources already cached (wasted bandwidth)
- User-specific content (might not be needed)
- Large resources (delays initial HTML)

**Problem**: Server doesn't know client cache state
**Solution**: Use `Link` header instead (browser decides)
```
Link: </style.css>; rel=preload; as=style
```

3. **"What causes head-of-line blocking and how do HTTP/2 and HTTP/3 solve it?"**

**Answer:**
**HTTP/1.1 head-of-line blocking:**
```
Single TCP connection:
Request 1: GET /large-image.jpg (5MB, 10 seconds)
Request 2: GET /style.css (waiting...)
Request 3: GET /script.js (waiting...)

# Requests 2 and 3 blocked behind request 1
# Solution: Open 6 parallel connections (browser limit)
```

**HTTP/2 solution:**
```
Single TCP connection, multiple streams:
Stream 1: GET /large-image.jpg
Stream 2: GET /style.css  (concurrent!)
Stream 3: GET /script.js  (concurrent!)

# No blocking at HTTP level
# But: TCP packet loss still blocks all streams
```

**HTTP/3 (QUIC) solution:**
```
UDP-based with per-stream ordering:
Stream 1: Packet lost → Only stream 1 waits for retransmission
Stream 2: Continues unaffected
Stream 3: Continues unaffected

# No blocking at HTTP OR transport level
# 30-50% faster on lossy networks
```

4. **"How do you measure and optimize Time To First Byte (TTFB)?"**

**Answer:**
```javascript
// TTFB = Time from request sent to first byte received
// Breakdown: Server processing + network latency

const perfEntry = performance.getEntriesByType('navigation')[0];
const ttfb = perfEntry.responseStart - perfEntry.requestStart;

console.log(`TTFB: ${ttfb}ms`);

// Components:
// 1. Network latency (RTT/2): 15-150ms
// 2. Server processing: Variable
// 3. Network latency (RTT/2): 15-150ms

// Optimization strategies:

// 1. Reduce server processing (< 200ms target)
// - Cache at CDN edge (TTFB < 50ms)
// - Optimize database queries
// - Use SSG for static content (instant)

// 2. Use CDN (closer to user)
// - US → Asia: 300ms → 50ms TTFB
// - Edge computing: 10-30ms TTFB

// 3. Warm connections
// - Preconnect to known domains
// - HTTP/2 connection reuse

// 4. Enable early hints (HTTP 103)
fetch('https://example.com/api');
// Server sends 103 Early Hints with preload links
// Browser starts loading CSS/JS before HTML arrives
// TTFB stays same, but perceived load faster
```

5. **"What's the TCP slow start problem and how does it affect web performance?"**

**Answer:**
```javascript
// TCP slow start: Begin with small window, grow exponentially

Initial window: 10 segments × 1460 bytes = 14.6KB

RTT 1: Send 14.6KB  (initial window)
RTT 2: Send 29.2KB  (doubled)
RTT 3: Send 58.4KB  (doubled)
RTT 4: Send 116.8KB (doubled)

// Problem: Large responses take multiple RTTs

// Example 1: 100KB HTML
// RTT 1: 14.6KB
// RTT 2: 29.2KB (total 43.8KB)
// RTT 3: 56.2KB to reach 100KB
// = 3 RTTs for first response!

// Example 2: 10KB HTML with inline CSS
// RTT 1: 10KB (fits in initial window!)
// = 1 RTT (3x faster!)

// Optimization: Critical resource inlining
// Keep initial HTML + inline CSS < 14KB
// Fits in first RTT

// Also affected by:
// - TCP BBR (Bottleneck Bandwidth and RTT): Better algorithm
// - TCP Initial Congestion Window (IW10): 10 segments
// - Server settings: Can't increase initial window beyond 10
```

6. **"How do you handle DNS failures or slow DNS resolution?"**

**Answer:**
```javascript
// DNS failure scenarios:

// 1. DNS server down
// Solution: Use multiple DNS servers
const primaryDNS = '8.8.8.8';      // Google
const secondaryDNS = '1.1.1.1';     // Cloudflare

// Browser auto-fails over to secondary

// 2. Slow DNS (>200ms)
// Solution A: DNS prefetch
<link rel="dns-prefetch" href="//slow-domain.com">

// Solution B: Self-host instead of third-party
// Before: https://external-cdn.com/library.js (DNS + TCP + TLS)
// After: https://example.com/library.js (no extra DNS)

// 3. DNS poisoning (wrong IP returned)
// Solution: DNSSEC (validates DNS responses)
// Solution: DNS over HTTPS (encrypted queries)

// 4. Monitoring slow DNS:
const perfEntry = performance.getEntriesByType('navigation')[0];
const dnsTime = perfEntry.domainLookupEnd - perfEntry.domainLookupStart;

if (dnsTime > 100) {
  analytics.track('slow_dns', { time: dnsTime, domain: window.location.host });
}

// Typical DNS time:
// Good: < 20ms (cached)
// Acceptable: 20-100ms (first lookup)
// Slow: 100-500ms (distant/overloaded server)
// Failed: > 500ms or timeout
```

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Resource Timing API Monitor

```javascript
// resourceTimingMonitor.js - Real-time network performance tracking

class ResourceTimingMonitor {
  constructor() {
    this.observer = null;
    this.metrics = {
      resources: [],
      summary: {
        totalDNS: 0,
        totalTCP: 0,
        totalTLS: 0,
        totalDownload: 0,
        count: 0
      }
    };
    
    this.initObserver();
  }
  
  initObserver() {
    if (!window.PerformanceObserver) {
      console.warn('PerformanceObserver not supported');
      return;
    }
    
    this.observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          this.processResourceTiming(entry);
        }
      });
    });
    
    this.observer.observe({ entryTypes: ['resource'] });
    console.log('📊 Resource timing monitor started');
  }
  
  processResourceTiming(entry) {
    const timing = {
      url: entry.name,
      type: entry.initiatorType,
      protocol: entry.nextHopProtocol || 'unknown',
      
      // Size information
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
      
      // Timing breakdown
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      tls: entry.secureConnectionStart > 0 
        ? entry.connectEnd - entry.secureConnectionStart 
        : 0,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
      total: entry.responseEnd - entry.fetchStart,
      
      // Cache status
      cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
      
      // Timestamps
      startTime: Math.round(entry.startTime),
      endTime: Math.round(entry.responseEnd)
    };
    
    this.metrics.resources.push(timing);
    
    // Update summary
    this.metrics.summary.totalDNS += timing.dns;
    this.metrics.summary.totalTCP += timing.tcp;
    this.metrics.summary.totalTLS += timing.tls;
    this.metrics.summary.totalDownload += timing.download;
    this.metrics.summary.count++;
    
    // Log slow resources
    if (timing.total > 1000) {
      console.warn(`🐌 Slow resource (${Math.round(timing.total)}ms):`, {
        url: timing.url,
        breakdown: {
          dns: Math.round(timing.dns),
          tcp: Math.round(timing.tcp),
          tls: Math.round(timing.tls),
          ttfb: Math.round(timing.ttfb),
          download: Math.round(timing.download)
        }
      });
    }
    
    // Alert on high TLS time (session resumption not working?)
    if (timing.tls > 200) {
      console.warn(`🔐 High TLS time (${Math.round(timing.tls)}ms):`, timing.url);
    }
  }
  
  getMetrics() {
    return {
      resources: this.metrics.resources,
      summary: {
        ...this.metrics.summary,
        avgDNS: this.metrics.summary.totalDNS / this.metrics.summary.count,
        avgTCP: this.metrics.summary.totalTCP / this.metrics.summary.count,
        avgTLS: this.metrics.summary.totalTLS / this.metrics.summary.count,
        avgDownload: this.metrics.summary.totalDownload / this.metrics.summary.count
      }
    };
  }
  
  getSlowestResources(count = 10) {
    return this.metrics.resources
      .sort((a, b) => b.total - a.total)
      .slice(0, count)
      .map(r => ({
        url: r.url,
        total: Math.round(r.total),
        cached: r.cached
      }));
  }
  
  getProtocolBreakdown() {
    const breakdown = {};
    
    this.metrics.resources.forEach(r => {
      breakdown[r.protocol] = (breakdown[r.protocol] || 0) + 1;
    });
    
    return breakdown;
  }
  
  generateReport() {
    const metrics = this.getMetrics();
    const slowest = this.getSlowestResources(5);
    const protocols = this.getProtocolBreakdown();
    
    console.log('\n═══════════════════════════════════════');
    console.log('   RESOURCE TIMING REPORT');
    console.log('═══════════════════════════════════════\n');
    
    console.log('📊 Summary:');
    console.log(`  Total resources: ${metrics.summary.count}`);
    console.log(`  Avg DNS:         ${metrics.summary.avgDNS.toFixed(1)}ms`);
    console.log(`  Avg TCP:         ${metrics.summary.avgTCP.toFixed(1)}ms`);
    console.log(`  Avg TLS:         ${metrics.summary.avgTLS.toFixed(1)}ms`);
    console.log(`  Avg Download:    ${metrics.summary.avgDownload.toFixed(1)}ms\n`);
    
    console.log('🐌 Slowest Resources:');
    slowest.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.url.substring(0, 60)}`);
      console.log(`     ${r.total}ms ${r.cached ? '(cached)' : ''}`);
    });
    
    console.log('\n📡 Protocol Usage:');
    Object.entries(protocols).forEach(([protocol, count]) => {
      const percentage = ((count / metrics.summary.count) * 100).toFixed(1);
      console.log(`  ${protocol}: ${count} (${percentage}%)`);
    });
    
    return metrics;
  }
  
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      console.log('📊 Resource timing monitor stopped');
    }
  }
}

// Usage
const monitor = new ResourceTimingMonitor();

// Generate report after page load
window.addEventListener('load', () => {
  setTimeout(() => {
    monitor.generateReport();
  }, 2000);
});

// Export metrics for analytics
function exportMetrics() {
  const metrics = monitor.getMetrics();
  
  // Send to analytics
  analytics.track('page_performance', {
    avgDNS: metrics.summary.avgDNS,
    avgTCP: metrics.summary.avgTCP,
    avgTLS: metrics.summary.avgTLS,
    resourceCount: metrics.summary.count
  });
}
```

### Example 2: Connection Manager

```javascript
// connectionManager.js - Manage HTTP connections efficiently

class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.maxConnectionsPerDomain = 6; // HTTP/1.1 limit
    this.activeRequests = new Map();
  }
  
  /**
   * Check if domain supports HTTP/2
   */
  async checkHTTP2Support(domain) {
    try {
      const response = await fetch(`https://${domain}`, {
        method: 'HEAD',
        cache: 'no-store'
      });
      
      const entries = performance.getEntriesByName(response.url);
      if (entries.length > 0) {
        const protocol = entries[0].nextHopProtocol;
        return protocol === 'h2' || protocol === 'h3';
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Prewarm connection to domain
   */
  prewarmConnection(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.origin;
      
      if (this.connections.has(domain)) {
        console.log(`✓ Connection to ${domain} already warm`);
        return;
      }
      
      // Create preconnect link
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      
      this.connections.set(domain, {
        prewarmed: true,
        timestamp: Date.now()
      });
      
      console.log(`🔌 Prewarmed connection to ${domain}`);
    } catch (e) {
      console.error('Failed to prewarm connection:', e);
    }
  }
  
  /**
   * Batch requests to same domain
   */
  async batchFetch(urls) {
    // Group URLs by domain
    const byDomain = {};
    
    urls.forEach(url => {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.origin;
        
        if (!byDomain[domain]) {
          byDomain[domain] = [];
        }
        byDomain[domain].push(url);
      } catch (e) {
        console.error('Invalid URL:', url);
      }
    });
    
    // Prewarm connections
    Object.keys(byDomain).forEach(domain => {
      this.prewarmConnection(domain);
    });
    
    // Wait a bit for connections to warm
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Fetch all URLs in parallel
    const requests = urls.map(url =>
      fetch(url)
        .then(response => ({
          url,
          status: response.status,
          ok: response.ok
        }))
        .catch(error => ({
          url,
          error: error.message
        }))
    );
    
    return Promise.all(requests);
  }
  
  /**
   * Monitor connection usage
   */
  getConnectionStats() {
    const stats = {
      domains: this.connections.size,
      connections: Array.from(this.connections.entries()).map(([domain, info]) => ({
        domain,
        age: Date.now() - info.timestamp,
        prewarmed: info.prewarmed
      }))
    };
    
    // Check current active requests
    const resources = performance.getEntriesByType('resource');
    const now = performance.now();
    
    const activeResources = resources.filter(r => 
      r.responseEnd === 0 || (now - r.startTime) < 100
    );
    
    stats.activeRequests = activeResources.length;
    
    return stats;
  }
  
  /**
   * Optimize domain strategy
   */
  analyzeDomainStrategy() {
    const resources = performance.getEntriesByType('resource');
    const domainCounts = {};
    const domainProtocols = {};
    
    resources.forEach(r => {
      try {
        const url = new URL(r.name);
        const domain = url.origin;
        
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        domainProtocols[domain] = r.nextHopProtocol || 'unknown';
      } catch (e) {
        // Invalid URL
      }
    });
    
    console.log('\n📊 Domain Analysis:');
    
    Object.entries(domainCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([domain, count]) => {
        const protocol = domainProtocols[domain];
        console.log(`  ${domain}: ${count} resources (${protocol})`);
        
        // Recommendations
        if (count > 20 && protocol === 'http/1.1') {
          console.warn(`    ⚠️ Consider HTTP/2 upgrade for ${domain}`);
        }
        
        if (count < 5 && domain !== window.location.origin) {
          console.warn(`    ⚠️ Consider consolidating ${domain} assets`);
        }
      });
  }
}

// Usage
const connectionManager = new ConnectionManager();

// Prewarm connections for known domains
connectionManager.prewarmConnection('https://api.example.com');
connectionManager.prewarmConnection('https://cdn.example.com');

// Batch fetch multiple resources
const urls = [
  '/api/user',
  '/api/products',
  '/api/categories'
];

connectionManager.batchFetch(urls).then(results => {
  console.log('Batch fetch results:', results);
});

// Analyze domain strategy
window.addEventListener('load', () => {
  setTimeout(() => {
    connectionManager.analyzeDomainStrategy();
    console.log('Connection stats:', connectionManager.getConnectionStats());
  }, 2000);
});
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience:**
- **Perceived performance**: Network overhead (DNS+TCP+TLS) can be 20-40% of total load time
- **Geographic equity**: Users far from servers experience high latency; optimization helps
- **Mobile users**: High latency (200-500ms RTT) amplifies every handshake cost
- **Reliability**: TCP ensures no data loss; users don't see corrupted content
- **Security**: TLS protects passwords, credit cards, personal data from interception

**Business Impact:**
```
Real case study: Global E-Commerce Platform (10M users/month)

Before network optimization:
- Average page load: 3.2s
- Network overhead: 640ms (DNS 80ms + TCP 200ms + TLS 360ms across 4 domains)
- Mobile users: 4.8s (high latency amplifies handshakes)
- Conversion rate: 3.2%
- Bounce rate: 42% (slow loads)

After optimization (DNS prefetch, preconnect, HTTP/2, TLS 1.3, session resumption):
- Average page load: 2.1s (34% faster)
- Network overhead: 50ms first visit, 0ms repeat (92% reduction)
- Mobile users: 2.8s (42% faster)
- Conversion rate: 4.1% (+28% relative)
- Bounce rate: 31% (-26% relative)

Business results:
- Load time improvement: 1.1s (34%)
- Conversion lift: +0.9 percentage points
- Additional revenue: $4.2M/year
- Cost savings: $180K/year (reduced bandwidth from HTTP/2 compression)
- Customer satisfaction: +18 NPS points
- Mobile users: 42% faster (equity improvement)

ROI: $4.4M annual benefit for 2-week optimization project
```

**Technical Benefits:**
- **Reduced latency**: Every optimization compounds (DNS + TCP + TLS savings)
- **Better resource utilization**: HTTP/2 multiplexing reduces connection overhead
- **Improved caching**: Proper cache headers leverage browser/CDN caching
- **Debugging capability**: Resource Timing API provides deep visibility
- **Future-proof**: HTTP/3 and QUIC provide next-generation performance

### How It Works

**Complete Network Stack Flow:**

```
User Action: Navigate to https://example.com/page.html

┌─────────────────────────────────────────────────────────┐
│ 1. DNS Resolution (20-120ms first, 0ms cached)         │
│                                                         │
│   Browser checks cache (memory → disk → OS → router)  │
│   ↓ (if not cached)                                    │
│   Query DNS resolver (8.8.8.8)                        │
│   ↓                                                    │
│   Resolver queries hierarchy:                          │
│   - Root NS: ".com is at a.gtld-servers.net"         │
│   - TLD NS: "example.com is at ns1.example.com"      │
│   - Auth NS: "example.com → 93.184.216.34"           │
│   ↓                                                    │
│   Result: example.com = 93.184.216.34                 │
│   Cached with TTL (300s typical)                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. TCP 3-Way Handshake (1 RTT = 30-300ms)             │
│                                                         │
│   Client → Server: SYN (Seq=1000)                     │
│   Server → Client: SYN-ACK (Seq=5000, Ack=1001)       │
│   Client → Server: ACK (Seq=1001, Ack=5001)           │
│   ↓                                                    │
│   TCP connection established                           │
│   Congestion window initialized (10 segments = 14KB)  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. TLS Handshake (1-2 RTT = 30-200ms)                 │
│                                                         │
│   TLS 1.3 (modern):                                    │
│   Client → Server: ClientHello + KeyShare             │
│   Server → Client: ServerHello + Cert + KeyShare      │
│   ↓                                                    │
│   Encryption keys derived, ready for data             │
│   Total: 1 RTT                                        │
│                                                         │
│   TLS 1.2 (legacy):                                    │
│   Additional round trip required                       │
│   Total: 2 RTT (slower)                               │
│                                                         │
│   Session Resumption (repeat visit):                   │
│   Client sends session ticket                         │
│   Server resumes without full handshake               │
│   Total: 0 RTT (instant!)                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. HTTP Request (minimal time)                         │
│                                                         │
│   GET /page.html HTTP/2                               │
│   Host: example.com                                    │
│   Accept: text/html                                   │
│   Accept-Encoding: gzip, br                           │
│   Cookie: session=abc123                              │
│   User-Agent: Mozilla/5.0...                          │
│   ↓                                                    │
│   Request sent (fits in TCP window)                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Server Processing (50-500ms variable)               │
│                                                         │
│   Server receives request                              │
│   ↓                                                    │
│   Check cache (Redis, CDN edge)                       │
│   ↓ (if miss)                                         │
│   Database query                                       │
│   ↓                                                    │
│   Render HTML                                         │
│   ↓                                                    │
│   Compress (gzip/brotli)                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 6. HTTP Response (download time = size/bandwidth)      │
│                                                         │
│   HTTP/2 200 OK                                        │
│   Content-Type: text/html                             │
│   Content-Encoding: br                                │
│   Content-Length: 12345                               │
│   Cache-Control: max-age=300                          │
│   ↓                                                    │
│   [HTML content] sent in TCP segments                 │
│   ↓                                                    │
│   Client receives data progressively                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Browser Parsing (outside network stack)             │
│                                                         │
│   Parse HTML → DOM                                     │
│   Discover sub-resources (CSS, JS, images)            │
│   ↓                                                    │
│   Initiate sub-resource requests:                     │
│   - Reuse TCP/TLS connection (HTTP/2)                 │
│   - Multiplex requests on single connection           │
│   - No additional handshakes needed                   │
└─────────────────────────────────────────────────────────┘

Total time breakdown (typical):
- DNS: 0-120ms (0ms if cached)
- TCP: 30-100ms (1 RTT)
- TLS: 30-100ms (1 RTT TLS 1.3, 0 RTT if resumed)
- TTFB: 50-500ms (server processing)
- Download: 50-300ms (depends on size)

Total: 160-1120ms before browser even starts rendering
Optimization potential: 500-800ms savings (50-70% improvement)
```

**Optimization strategies by layer:**

```javascript
// Layer 1: DNS Optimization
// Save 20-120ms per domain

// Strategy A: DNS Prefetch (passive)
<link rel="dns-prefetch" href="//api.example.com">
// Resolves DNS during idle time, 0ms when needed

// Strategy B: Use fewer domains
// Before: cdn1.com, cdn2.com, cdn3.com (3× DNS)
// After: cdn.example.com (1× DNS)
// Savings: 40-240ms

// Strategy C: DNS over HTTPS (DoH)
// More secure, slightly slower but encrypted

// Layer 2: TCP Optimization
// Save 30-100ms per connection

// Strategy A: Preconnect (aggressive)
<link rel="preconnect" href="https://cdn.example.com">
// Opens TCP + TLS connection proactively

// Strategy B: Connection reuse (HTTP/1.1 Keep-Alive)
Connection: keep-alive
Keep-Alive: timeout=5, max=100
// Subsequent requests skip TCP handshake

// Strategy C: HTTP/2 multiplexing
// Single connection for all resources
// No need for multiple TCP connections

// Layer 3: TLS Optimization
// Save 30-200ms per connection

// Strategy A: Upgrade to TLS 1.3
// 1 RTT vs 2 RTT (50% faster)

// Strategy B: Session resumption
// Server sends session ticket
// Client reuses on next visit (0 RTT)

// Strategy C: Reduce certificate chain length
// Fewer certificates = faster validation

// Layer 4: HTTP Optimization
// Save download time proportional to content size

// Strategy A: Compression (gzip/brotli)
// 70-85% size reduction
// 100KB → 20KB (80% faster download)

// Strategy B: HTTP/2 header compression (HPACK)
// Cookies/headers sent once, indexed after

// Strategy C: HTTP/3 (QUIC)
// 0-RTT connection on repeat visits
// No head-of-line blocking at transport level
```

**Mental Model:**

Think of the network stack like **mailing a letter internationally**:

**DNS**: Looking up recipient's address in phone book
- First time: Call directory (slow)
- Subsequent: Already in your contact list (instant)

**TCP**: Establishing postal route between cities
- 3-way handshake = confirm route exists both ways
- Takes 1 round-trip (days for physical mail)

**TLS**: Encrypting letter with secure envelope
- First time: Exchange encryption keys (slow)
- Repeat: Reuse known encryption (fast)

**HTTP**: The actual letter content
- Headers = envelope information
- Body = letter content
- Response = reply letter

**Optimization = expediting each step**:
- DNS prefetch = look up address before you need it
- Preconnect = establish route in advance
- Session resumption = reuse encryption from last letter
- HTTP/2 = send multiple letters on same route (batch)

---

**Key Takeaway for Interviews:**

The network stack (DNS → TCP → TLS → HTTP) represents 20-40% of page load time, especially on first visit and mobile networks. **DNS resolution** (20-120ms) can be eliminated via dns-prefetch. **TCP handshake** (30-100ms per connection) can be avoided via preconnect and HTTP/2 connection reuse. **TLS handshake** (30-200ms) can be reduced to 0ms via TLS 1.3 session resumption. **HTTP/2 multiplexing** eliminates head-of-line blocking and allows single connection for all resources. Real impact: optimizing the full stack saves 500-800ms on first visit, 100-200ms on repeat visits, translating to 30-50% faster page loads and 20-30% conversion lift at scale. Use Resource Timing API to measure each layer and identify bottlenecks. Understand that every layer presents optimization opportunities that compound.

