# 21. Network Stack Basics

## 1. High-Level Explanation (Frontend Interview Level)

**Network Stack Basics** describe the layered protocols (DNS, TCP, TLS, HTTP) that browsers use to fetch resources—understanding this stack explains latency sources (DNS 20-120ms, TCP handshake 30-100ms, TLS 50-150ms) and optimization opportunities (preconnect, HTTP/2, CDN).

- **DNS Resolution**: Domain → IP address (20-120ms, cacheable)
- **TCP Connection**: 3-way handshake establishes connection (30-100ms RTT)
- **TLS Handshake**: Secure HTTPS negotiation (50-150ms, 1-2 RTTs)
- **HTTP Request/Response**: Actual data transfer (varies by size)

**Key Principle**: "Every request goes through DNS → TCP → TLS → HTTP—minimize round trips with connection reuse and early connections."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Network Stack Layers

**OSI Model (Simplified for Web)**:
```
Layer 7: Application (HTTP, HTTPS, WebSocket)
         ├── HTTP/1.1, HTTP/2, HTTP/3
         └── Request/Response, Headers, Body

Layer 6: Presentation (TLS/SSL)
         ├── Encryption (symmetric AES)
         ├── Handshake (asymmetric RSA/ECDSA)
         └── Certificate validation

Layer 4: Transport (TCP, UDP)
         ├── TCP: Reliable, ordered, connection-oriented
         └── UDP: Unreliable, unordered, connectionless (HTTP/3)

Layer 3: Network (IP)
         ├── IPv4: 32-bit address (e.g., 192.168.1.1)
         └── IPv6: 128-bit address

Layer 2: Data Link (Ethernet, WiFi)
         └── MAC addresses

Layer 1: Physical (cables, radio waves)
```

**Browser Network Stack**:
```
User enters URL: https://example.com/page.html

Step 1: DNS Resolution (Layer 7 → 3)
├── Query: "What's the IP for example.com?"
├── Check browser cache (10s-1hr)
├── Check OS cache
├── Query DNS server (recursive)
├── Response: "93.184.216.34"
└── Time: 20-120ms (or 0ms if cached)

Step 2: TCP Connection (Layer 4)
├── SYN packet: Client → Server
├── SYN-ACK packet: Server → Client
├── ACK packet: Client → Server
├── Connection established (3-way handshake)
└── Time: 30-100ms (1 RTT)

Step 3: TLS Handshake (Layer 6)
├── ClientHello (supported ciphers, TLS version)
├── ServerHello (chosen cipher, certificate)
├── Client verifies certificate
├── Key exchange (generate session keys)
├── Finished messages
└── Time: 50-150ms (1-2 RTTs)

Step 4: HTTP Request (Layer 7)
├── Client sends: GET /page.html HTTP/1.1
├── Server responds: 200 OK + HTML
└── Time: TTFB (Time To First Byte) + download

Total: DNS + TCP + TLS + HTTP = 100-370ms + download time
```

---

### DNS Resolution

**DNS Query Process**:
```
Browser cache (10s-1hr)
  ↓ (miss)
OS cache (system-wide)
  ↓ (miss)
Router cache (local network)
  ↓ (miss)
ISP DNS server
  ↓ (miss)
Root nameserver (.)
  ↓
TLD nameserver (.com)
  ↓
Authoritative nameserver (example.com)
  ↓
IP address: 93.184.216.34
```

**DNS Record Types**:
```
A record:     Domain → IPv4
              example.com → 93.184.216.34

AAAA record:  Domain → IPv6
              example.com → 2606:2800:220:1:248:1893:25c8:1946

CNAME:        Alias → Canonical name
              www.example.com → example.com

MX:           Mail server
              example.com → mail.example.com

TXT:          Text data (SPF, DKIM, verification)
```

**DNS Caching**:
```javascript
// Browser cache
DNS entry stored for TTL (Time To Live):
example.com → 93.184.216.34 (TTL: 300s = 5 min)

After 300s: Entry expires, re-query DNS

// Typical TTLs:
Short:  300s (5 min) - dynamic IPs
Medium: 3600s (1 hr) - normal sites
Long:   86400s (24 hr) - stable infrastructure
```

**DNS Optimization**:
```html
<!-- 1. DNS Prefetch (resolve DNS early) -->
<link rel="dns-prefetch" href="//cdn.example.com">

<!-- 2. Preconnect (DNS + TCP + TLS) -->
<link rel="preconnect" href="https://cdn.example.com">

<!-- Savings:
   dns-prefetch: ~20-120ms (DNS only)
   preconnect:   ~100-370ms (DNS + TCP + TLS)
-->
```

**DNS Performance**:
```
Uncached DNS query:
├── Best case:   20ms  (ISP cache hit)
├── Average:     50ms  (1-2 hops)
├── Worst case:  120ms (root nameserver)
└── Timeout:     5-10s (failure)

Cached DNS query:
└── ~0ms (browser/OS cache hit)
```

---

### TCP Connection

**3-Way Handshake**:
```
Client                           Server
  │                                 │
  │────── SYN (seq=100) ────────────→│  Step 1: Client initiates
  │                                 │
  │←───── SYN-ACK (seq=200, ────────│  Step 2: Server acknowledges
  │        ack=101)                 │          + sends own SYN
  │                                 │
  │────── ACK (ack=201) ────────────→│  Step 3: Client acknowledges
  │                                 │
  │      Connection established     │
  │                                 │
  │────── Data transfer ────────────→│
  │←───── Data transfer ────────────│

Time: 1 RTT (Round Trip Time)
```

**RTT (Round Trip Time)**:
```
RTT = Time for packet to travel Client → Server → Client

Examples:
├── Same city:       10-30ms
├── Same country:    30-80ms
├── Across ocean:    100-200ms
├── Satellite:       500-700ms
└── Mobile (3G):     100-500ms
```

**TCP Parameters**:
```javascript
// Socket options (server-side Node.js)
const net = require('net');
const server = net.createServer((socket) => {
  socket.setKeepAlive(true, 60000);  // Keep connection alive
  socket.setNoDelay(true);           // Disable Nagle's algorithm (low latency)
  socket.setTimeout(30000);          // 30s timeout
});
```

**Connection Limits**:
```
Browser connection limits (per domain):
├── HTTP/1.1:  6 connections (Chrome, Firefox)
├── HTTP/2:    1 connection (multiplexed)
└── HTTP/3:    1 connection (QUIC)

Workaround (HTTP/1.1): Domain sharding
static1.example.com  (6 connections)
static2.example.com  (6 connections)
static3.example.com  (6 connections)
= 18 parallel connections

Note: Not needed with HTTP/2 (single multiplexed connection)
```

---

### TLS/SSL Handshake

**TLS 1.2 Handshake** (2 RTTs):
```
Client                           Server
  │                                 │
  │────── ClientHello ──────────────→│  RTT 1: Negotiate
  │ (TLS version, ciphers)          │
  │                                 │
  │←───── ServerHello ──────────────│
  │ (Chosen cipher, certificate)    │
  │                                 │
  │────── ClientKeyExchange ────────→│  RTT 2: Key exchange
  │────── ChangeCipherSpec ─────────→│
  │────── Finished ─────────────────→│
  │                                 │
  │←───── ChangeCipherSpec ─────────│
  │←───── Finished ─────────────────│
  │                                 │
  │      Encrypted connection       │
  │                                 │
  │────── Application data ─────────→│

Time: 2 RTTs (~100ms on 50ms RTT)
```

**TLS 1.3 Handshake** (1 RTT, faster):
```
Client                           Server
  │                                 │
  │────── ClientHello ──────────────→│  RTT 1: Negotiate + Key
  │ (TLS 1.3, ciphers, key share)   │
  │                                 │
  │←───── ServerHello ──────────────│
  │ (Cipher, key share, Finished)   │
  │←───── Application data ─────────│  ← Can send data immediately!
  │                                 │
  │────── Finished ─────────────────→│
  │────── Application data ─────────→│

Time: 1 RTT (~50ms on 50ms RTT)
Savings: 50% faster than TLS 1.2
```

**TLS 1.3 0-RTT** (Zero RTT, resumed connection):
```
Client                           Server
  │                                 │
  │────── ClientHello ──────────────→│  0 RTT: Send data immediately
  │────── Application data ─────────→│  (using session ticket from previous)
  │                                 │
  │←───── ServerHello ──────────────│
  │←───── Application data ─────────│

Time: 0 RTT (data sent with first packet!)
Use case: Repeat visits (session resumption)
```

**Certificate Validation**:
```
Server sends certificate:
├── Common Name (CN): example.com
├── Issuer: Let's Encrypt
├── Valid: 2025-01-01 to 2026-01-01
└── Public key

Client validates:
1. Certificate not expired ✓
2. Hostname matches (example.com) ✓
3. Trusted Certificate Authority (Let's Encrypt in root store) ✓
4. Certificate chain valid ✓

If any fails → Browser warning (NET::ERR_CERT_INVALID)
```

**HTTPS Performance**:
```
TLS overhead:
├── TLS 1.2:  100-150ms (2 RTTs)
├── TLS 1.3:  50-100ms  (1 RTT)
├── 0-RTT:    0ms       (resumed)
└── CPU cost: ~1ms      (encryption/decryption)

Certificate size:
├── RSA-2048:   ~2KB
├── ECDSA-256:  ~1KB    (smaller, faster)
└── Transfer:   ~10ms on slow 3G
```

---

### HTTP Request/Response

**HTTP/1.1 Request**:
```http
GET /page.html HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Accept: text/html,application/xhtml+xml
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Cookie: session=abc123
```

**HTTP/1.1 Response**:
```http
HTTP/1.1 200 OK
Date: Thu, 13 Feb 2026 10:00:00 GMT
Content-Type: text/html; charset=utf-8
Content-Length: 1234
Content-Encoding: gzip
Cache-Control: max-age=3600
Set-Cookie: session=abc123; Secure; HttpOnly
Connection: keep-alive

<!DOCTYPE html>
<html>...</html>
```

**TTFB (Time To First Byte)**:
```
TTFB = DNS + TCP + TLS + Server processing + Network transfer

Good TTFB:
├── <100ms:   Excellent (CDN, cached)
├── 100-300ms: Good (server processing)
├── 300-600ms: Average (slow server)
└── >600ms:    Poor (optimize server/network)
```

**HTTP Status Codes**:
```
1xx Informational:
├── 100 Continue
└── 101 Switching Protocols (WebSocket)

2xx Success:
├── 200 OK
├── 201 Created (POST success)
├── 204 No Content (DELETE success)
└── 206 Partial Content (range request)

3xx Redirection:
├── 301 Moved Permanently (permanent redirect)
├── 302 Found (temporary redirect)
├── 304 Not Modified (cached, no download)
└── 307 Temporary Redirect (preserve method)

4xx Client Error:
├── 400 Bad Request
├── 401 Unauthorized (need auth)
├── 403 Forbidden (no permission)
├── 404 Not Found
└── 429 Too Many Requests (rate limit)

5xx Server Error:
├── 500 Internal Server Error
├── 502 Bad Gateway (proxy error)
├── 503 Service Unavailable (overloaded)
└── 504 Gateway Timeout (upstream timeout)
```

---

### Network Waterfall

**Chrome DevTools Network Tab**:
```
Timeline breakdown:

Request:
├── Queueing (0-5ms):        Wait for available connection
├── Stalled (0-20ms):        Browser internal delay
├── DNS Lookup (0-120ms):    Resolve domain to IP
├── Initial connection (30-100ms): TCP 3-way handshake
├── SSL (50-150ms):          TLS handshake
├── Request sent (1-5ms):    Send HTTP request
├── Waiting (TTFB) (50-500ms): Server processing
└── Content Download (10-1000ms): Transfer response

Total: Sum of all phases
```

**Optimization Targets**:
```
1. DNS Lookup:
   ├── Reduce: dns-prefetch, preconnect
   └── Target: <20ms (cached)

2. Initial connection:
   ├── Reduce: Connection reuse (keep-alive)
   └── Target: <50ms (reused = 0ms)

3. SSL:
   ├── Reduce: TLS 1.3, session resumption (0-RTT)
   └── Target: <50ms (TLS 1.3) or 0ms (resumed)

4. TTFB:
   ├── Reduce: CDN, caching, faster server
   └── Target: <100ms

5. Content Download:
   ├── Reduce: Compression (gzip, brotli), minification
   └── Target: <100ms per resource
```

---

## 3. Clear Real-World Examples

### Example 1: Amazon – Preconnect to CDN

**Challenge**: Images loaded from CDN (dns + TCP + TLS delay ~200ms).

**Solution**: Preconnect in `<head>`:
```html
<head>
  <link rel="preconnect" href="https://images-na.ssl-images-amazon.com">
</head>

<!-- Later in body -->
<img src="https://images-na.ssl-images-amazon.com/product.jpg">
```

**Timeline**:
```
Without preconnect:
├── Parse HTML: 10ms
├── Discover <img>: 10ms
├── DNS: 50ms
├── TCP: 50ms
├── TLS: 50ms
├── Request: 50ms
└── Total: 220ms

With preconnect:
├── Parse HTML: 10ms (DNS + TCP + TLS in parallel)
├── Discover <img>: 10ms (connection ready!)
├── Request: 50ms
└── Total: 70ms (saved 150ms)
```

**Result**: Images load 150ms faster (68% improvement).

---

### Example 2: Google – TLS 1.3 Adoption

**Challenge**: TLS 1.2 handshake adds 100ms latency (2 RTTs).

**Solution**: TLS 1.3 (1 RTT) + 0-RTT resumption:
```
First visit (TLS 1.3):
├── 1 RTT: 50ms (vs TLS 1.2: 100ms)
└── Saved: 50ms

Repeat visit (0-RTT):
├── 0 RTT: 0ms (session ticket)
└── Saved: 50-100ms
```

**Result**: 50-100ms faster HTTPS connections globally.

---

### Example 3: Netflix – HTTP/2 Connection Reuse

**Challenge**: HTTP/1.1 requires 6 connections per domain (TCP + TLS overhead).

**Solution**: HTTP/2 single multiplexed connection:
```
HTTP/1.1:
├── 6 connections × (TCP 50ms + TLS 50ms) = 600ms overhead
├── Max 6 parallel requests
└── Head-of-line blocking per connection

HTTP/2:
├── 1 connection × (TCP 50ms + TLS 50ms) = 100ms overhead
├── Unlimited parallel requests (multiplexing)
└── No head-of-line blocking (stream prioritization)

Saved: 500ms setup time
```

**Result**: Faster page loads, fewer connections.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain the network stack for a web request."

**Answer**:

"Browser network request goes through **layered protocols**:

---

### Network Stack Layers

```
Application (HTTP):  Request/Response
Presentation (TLS):  Encryption
Transport (TCP):     Reliable delivery
Network (IP):        Routing
Data Link (Ethernet): Physical transfer
```

---

### Request Timeline

**URL**: `https://example.com/page.html`

**Step 1: DNS Resolution** (20-120ms):
```
Query: "What's IP for example.com?"
Check: Browser cache → OS cache → DNS server
Response: "93.184.216.34"
Time: 0ms (cached) to 120ms (uncached)
```

**Step 2: TCP Connection** (30-100ms, 1 RTT):
```
3-way handshake:
Client → Server: SYN
Server → Client: SYN-ACK
Client → Server: ACK
Connection established
Time: 1 RTT (50ms on 50ms RTT)
```

**Step 3: TLS Handshake** (50-150ms):
```
TLS 1.2: 2 RTTs (~100ms)
├── ClientHello (ciphers)
├── ServerHello (certificate)
├── Key exchange
└── Finished

TLS 1.3: 1 RTT (~50ms)
├── ClientHello (ciphers + key share)
└── ServerHello (cipher + key, can send data immediately)

0-RTT: 0ms (session resumption, repeat visits)
```

**Step 4: HTTP Request** (TTFB + download):
```
Request: GET /page.html HTTP/1.1
Response: 200 OK + HTML
TTFB: 50-500ms (server processing)
Download: Varies by size
```

**Total Latency**:
```
DNS (50ms) + TCP (50ms) + TLS (50ms) + TTFB (100ms) = 250ms

Optimized (cached DNS, reused connection, TLS 1.3):
DNS (0ms) + TCP (0ms) + TLS (0ms) + TTFB (100ms) = 100ms
```

---

### DNS Optimization

**DNS Prefetch**:
```html
<link rel="dns-prefetch" href="//cdn.example.com">
```
Resolves DNS early (saves 20-120ms).

**Preconnect**:
```html
<link rel="preconnect" href="https://cdn.example.com">
```
DNS + TCP + TLS early (saves 100-370ms).

---

### TCP Connection

**3-way handshake** (1 RTT):
- SYN → SYN-ACK → ACK
- Cost: 30-100ms (varies by distance)

**Connection reuse** (HTTP keep-alive):
```http
Connection: keep-alive
```
Reuse connection for multiple requests (0ms overhead).

**Connection limits**:
- HTTP/1.1: 6 per domain (domain sharding workaround)
- HTTP/2: 1 multiplexed connection (unlimited streams)

---

### TLS/SSL

**TLS 1.2**: 2 RTTs (~100ms)  
**TLS 1.3**: 1 RTT (~50ms, 50% faster)  
**0-RTT**: 0ms (session resumption, repeat visits)

**Certificate validation**:
1. Not expired ✓
2. Hostname matches ✓
3. Trusted CA ✓
4. Chain valid ✓

Fails → Browser warning.

---

### HTTP Request/Response

**TTFB** (Time To First Byte):
```
TTFB = DNS + TCP + TLS + Server processing + Network
```

Good TTFB:
- <100ms: Excellent (CDN)
- 100-300ms: Good
- >600ms: Poor (optimize)

**Status codes**:
- 2xx: Success (200 OK, 201 Created)
- 3xx: Redirect (301 Permanent, 304 Not Modified cached)
- 4xx: Client error (404 Not Found, 429 Rate limit)
- 5xx: Server error (500 Internal, 503 Unavailable)

---

### Network Waterfall (DevTools)

**Phases**:
1. **Queueing** (0-5ms): Wait for available connection
2. **DNS Lookup** (0-120ms): Resolve domain
3. **Initial connection** (30-100ms): TCP handshake
4. **SSL** (50-150ms): TLS handshake
5. **Request sent** (1-5ms): Send HTTP request
6. **Waiting (TTFB)** (50-500ms): Server processing
7. **Content Download** (10-1000ms): Transfer response

**Optimization targets**:
- DNS: <20ms (cached)
- Connection: 0ms (reused)
- SSL: <50ms (TLS 1.3) or 0ms (0-RTT)
- TTFB: <100ms (CDN, caching)
- Download: <100ms per resource (compression)

---

### Real-World

**Amazon**: Preconnect to CDN (saved 150ms, 68% improvement).

**Google**: TLS 1.3 adoption (50-100ms faster connections).

**Netflix**: HTTP/2 single connection (saved 500ms setup, unlimited parallel).

---

### Trade-offs

**Preconnect**:
- ✅ Saves 100-370ms (DNS + TCP + TLS)
- ❌ Keeps connection open (~10s, limit 3-5 origins)

**TLS 1.3**:
- ✅ 50% faster than TLS 1.2 (1 RTT vs 2 RTTs)
- ✅ 0-RTT session resumption (instant repeat visits)
- ❌ Browser/server support required

**Connection Reuse**:
- ✅ 0ms overhead (no new handshake)
- ❌ HTTP/1.1: Max 6 per domain (head-of-line blocking)
- ✅ HTTP/2: 1 multiplexed (unlimited streams, no blocking)

**Follow-up I Expect**:

Q: 'What's the cost of a new HTTPS connection?'
A: DNS (20-120ms) + TCP (30-100ms, 1 RTT) + TLS (50-150ms, 1-2 RTTs) = **100-370ms** total. Optimized: DNS cached (0ms) + connection reused (0ms) + TLS 0-RTT (0ms) = **near-instant**.

Q: 'How does preconnect work?'
A: `<link rel="preconnect">` in `<head>` tells browser to establish DNS + TCP + TLS connection **during HTML parsing** (parallel). When resource discovered later, connection ready (saves 100-370ms). Limit to 3-5 critical origins (connections kept open ~10s).

Q: 'TLS 1.3 vs TLS 1.2?'
A: **TLS 1.2**: 2 RTTs (~100ms on 50ms RTT). **TLS 1.3**: 1 RTT (~50ms, 50% faster). **0-RTT** (TLS 1.3): Session resumption (0ms, instant repeat visits using session ticket). TLS 1.3 also: faster cipher suites, smaller certificates (ECDSA), better security."

---

## 6. Why & How Summary

### Why It Matters

**Latency Sources**: Every request incurs DNS (20-120ms) + TCP (30-100ms) + TLS (50-150ms) = 100-370ms before data transfer  
**Optimization Impact**: Preconnect saves 100-370ms per origin, TLS 1.3 saves 50ms, connection reuse eliminates handshake overhead  
**User Experience**: Network latency directly impacts page load (fast networks <100ms TTFB, slow networks 500ms+ TTFB)  
**Mobile Networks**: Higher latency (3G: 100-500ms RTT, 4G: 30-100ms RTT)—optimization more critical

### How It Works

**DNS Resolution**: Browser cache (10s-1hr) → OS cache → ISP DNS → root nameserver, returns IP address, cached with TTL, optimize with dns-prefetch (DNS only 20-120ms) or preconnect (DNS+TCP+TLS 100-370ms)  
**TCP Connection**: 3-way handshake (SYN → SYN-ACK → ACK) 1 RTT (30-100ms depends on distance), HTTP/1.1 limit 6 connections per domain (domain sharding workaround), HTTP/2 single multiplexed connection (unlimited streams), connection reuse with keep-alive (0ms overhead subsequent requests)  
**TLS Handshake**: TLS 1.2 (2 RTTs ~100ms ClientHello/ServerHello/KeyExchange/Finished), TLS 1.3 (1 RTT ~50ms faster combines steps), 0-RTT (session resumption instant with ticket from previous), certificate validation (expiry/hostname/trusted CA/chain)  
**HTTP Request/Response**: TTFB (DNS+TCP+TLS+server processing+network), status codes (2xx success, 3xx redirect, 4xx client error, 5xx server error), compression (gzip/brotli reduce transfer time)  
**Network Waterfall**: Queueing → DNS Lookup → Initial Connection → SSL → Request Sent → Waiting (TTFB) → Content Download, optimize each phase (cache DNS, reuse connection, TLS 1.3/0-RTT, CDN for TTFB, compression for download)

**FAANG Expectation**: Explain layered network stack (Application HTTP → Presentation TLS → Transport TCP → Network IP), request timeline with latencies (DNS 20-120ms, TCP 30-100ms 1 RTT, TLS 50-150ms 1-2 RTTs, TTFB 50-500ms), DNS optimization (dns-prefetch DNS only, preconnect DNS+TCP+TLS saves 100-370ms limit 3-5 origins), TCP 3-way handshake (SYN/SYN-ACK/ACK 1 RTT), connection limits (HTTP/1.1 6 per domain domain sharding, HTTP/2 1 multiplexed unlimited streams), connection reuse keep-alive (0ms overhead), TLS versions (1.2: 2 RTTs ~100ms, 1.3: 1 RTT ~50ms, 0-RTT: instant resumption), TTFB components and targets (<100ms excellent CDN), network waterfall phases and optimization targets, real-world examples (Amazon preconnect 150ms saved 68%, Google TLS 1.3 50-100ms faster, Netflix HTTP/2 500ms saved), trade-offs (preconnect saves time but keeps connection open limit origins, TLS 1.3 faster but requires support, connection reuse 0ms but HTTP/1.1 limited 6 per domain head-of-line blocking)
