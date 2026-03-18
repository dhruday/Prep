# 21. Network Stack Basics

---

## 1. High-Level Explanation (Frontend Interview Level)

Before a single byte of HTML reaches the browser, the browser must establish a connection to the server. This involves multiple protocol layers — DNS, TCP, TLS — each adding latency. Understanding the network stack is essential to reasoning about real-world page load performance beyond code-level optimizations.

**The layers a web request traverses:**

```
Browser
  ↓ DNS Resolution   — "What is the IP address for api.example.com?"
  ↓ TCP Handshake    — Establish reliable connection (3-way)
  ↓ TLS Handshake    — Establish encrypted, authenticated session
  ↓ HTTP Request     — Send GET /page HTTP/2
  ↓ Server Response  — Server processes and sends bytes back
Browser renders
```

**Key metrics:**
- **TTFB (Time to First Byte)** — Time from request start to receiving first response byte
- **RTT (Round Trip Time)** — Network latency one way + response time back (50ms = 50ms per round trip)
- **Bandwidth** — How much data can be transferred per second (often not the bottleneck)
- **Connection cost** — DNS + TCP + TLS latency before any data flows

**Why frontend engineers must understand this:**
- Every resource hint (`preconnect`, `dns-prefetch`, `preload`) targets a specific network cost
- Choosing HTTP/2 vs HTTP/3 affects how resources are parallelized
- CDN architecture decisions directly reduce these network costs by moving servers closer to users
- Understanding RTT is why CDN edge nodes exist: 100ms RTT from New York to a London user → move server to London → 20ms RTT

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### DNS Resolution

DNS (Domain Name System) translates hostnames to IP addresses. The process:

```
Browser checks DNS cache (in memory, ~1ms)
    ↓ (if miss)
OS checks /etc/hosts file (platform DNS)
    ↓ (if miss)
OS checks OS DNS cache
    ↓ (if miss)
Query sent to configured recursive DNS resolver (ISP or 1.1.1.1 / 8.8.8.8)
    ↓
Recursive resolver queries root nameservers → TLD nameservers → authoritative nameservers
    ↓
IP address returned, cached at multiple levels with TTL
```

**DNS latency:** 20-200ms depending on cache hit rate and geographic distance.

**Browser DNS cache:** Chrome caches DNS responses in-memory for 60 seconds by default, but respects the TTL in the DNS response.

**`dns-prefetch`** resolves DNS for a domain before a request is needed:
```html
<link rel="dns-prefetch" href="https://third-party-api.example.com">
```
Cost: ~1 DNS UDP packet exchange. No TCP/TLS established.

### TCP Handshake

TCP (Transmission Control Protocol) provides reliable, ordered delivery. Before data flows, a 3-way handshake establishes the connection:

```
Client → Server: SYN           (1 RTT begins)
Server → Client: SYN-ACK
Client → Server: ACK           (1 RTT completes)
        ↓
Client → Server: HTTP Request  (2nd RTT begins — data flow starts)
Server → Client: HTTP Response
```

**TCP takes 1 RTT before any data flows.** On a 50ms RTT connection, this is 50ms of pure overhead before the first byte of data is sent.

**Congestion Control — TCP Slow Start:**
TCP doesn't immediately send data at full speed. It starts with a small **congestion window (cwnd)**, typically 10 TCP segments (~14KB for 1.4KB MTU), and doubles on each acknowledgment until congestion is detected:

```
Round 1: 14KB sent
Round 2: 28KB sent (if no loss)
Round 3: 56KB sent
...
Until: packet loss detected → back to slow start
```

**Performance implication:** Small files downloaded over a fresh TCP connection pay a disproportionate startup cost. A 1KB CSS file might require 3+ RTTs if the slow start limits early window size. This is why bundling resources (HTTP/1.1 era) made sense — one large contiguous file amortizes the TCP startup cost.

**`preconnect`** performs DNS + TCP + TLS pre-warming:
```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```
After `preconnect`, the next request to this origin has a ready connection — no DNS/TCP/TLS penalty.

### TLS Handshake

TLS (Transport Layer Security) adds authentication (certificates) and encryption on top of TCP:

**TLS 1.2 handshake (older, 2 RTTs after TCP):**
```
TCP established
Client → Server: ClientHello (cipher suites, TLS version)
Server → Client: ServerHello + Certificate + ServerHelloDone  (1 RTT)
Client → Server: ClientKeyExchange + ChangeCipherSpec + Finished
Server → Client: ChangeCipherSpec + Finished                  (2nd RTT)
Client → Server: HTTP Request (3rd RTT)
Server → Client: Data
```
Total overhead: 2 RTTs before data. On a 100ms RTT line: 200ms before any HTTP.

**TLS 1.3 handshake (1 RTT):**
```
TCP established
Client → Server: ClientHello + Key Share
Server → Client: ServerHello + Certificate + Finished          (1 RTT)
Client → Server: HTTP Request + Finished (data starts!)
Server → Client: Data
```
TLS 1.3 reduced the handshake to 1 RTT — 50% improvement over TLS 1.2.

**TLS 1.3 0-RTT (session resumption):**
If the client has previously connected to the server and has a session ticket:
```
Client → Server: ClientHello + 0-RTT data (HTTP Request embedded!)
Server → Client: Response (data starts!)
```
Zero additional RTT for resumed sessions. This enables instant HTTPS reconnection.

**Security note:** 0-RTT has replay attack vulnerabilities for non-idempotent requests. Should only be used for safe/idempotent requests (GET). POST requests with 0-RTT can be replayed by a network attacker.

### Total Connection Cost

```
Full cost for a new HTTPS connection (TLS 1.3):
  DNS:         20-200ms
  TCP:         1 RTT
  TLS 1.3:     1 RTT
  HTTP:        1 RTT
Total:  ~ 3 RTTs + DNS time

On a 50ms RTT network:  ~150ms + 50ms DNS = ~200ms before first byte
On a 200ms RTT network: ~600ms + 100ms DNS = ~700ms before first byte
```

**This is why CDN edge nodes are architecturally critical:**
- User in London hitting US CDN (200ms RTT) = 700ms connection cost
- User in London hitting London CDN edge (20ms RTT) = 70ms connection cost
- 10x reduction in connection overhead

### HTTP/2 Connection Multiplexing

HTTP/2 keeps the same underlying TCP + TLS stack but completely reimagines the application layer:

- **Single TCP connection** per origin (not 6 parallel)
- **Multiplex** unlimited request/response streams over that connection
- **HPACK header compression** — repeated headers (like `Authorization`, `Accept`) sent as references to a shared table

**Why this matters for the network stack:**
One TCP connection = one congestion window that grows over time. Multiple requests share the same slow-start amortization, making HTTP/2 efficient even for many small resources.

### QUIC / HTTP/3

HTTP/3 moves from TCP to **QUIC** (Quick UDP Internet Connections), implementing reliability and congestion control at the application layer over UDP:

- **No TCP handshake** — QUIC and TLS 1.3 combine into a single 1-RTT setup
- **No TCP HOL blocking** — independent streams per QUIC stream (TCP blocking affects all)
- **Connection migration** — IP address can change (WiFi → cellular) without disconnecting
- **0-RTT reconnect** with session tickets

---

## 3. Real-World Examples

### Google — Invented QUIC / HTTP/3
Google deployed QUIC for all Google.com, Google Search, YouTube traffic in 2015 internally. They saw 3% faster load times on desktop and 8% on mobile globally, primarily from eliminating TCP HOL blocking on mobile high-packet-loss networks.

### Cloudflare CDN — TLS 1.3 + 0-RTT
Cloudflare routes traffic through 300+ global edge nodes. All traffic uses TLS 1.3. Clients that have previously connected get 0-RTT session resumption — their HTTP/3 request is piggy-backed onto the initial QUIC packet for truly zero connection overhead on repeat visits.

### Amazon S3 / CloudFront — DNS Anycast
AWS uses Anycast DNS — the same IP address routes to the closest of dozens of edge nodes globally. When your browser resolves `d1q2xyz.cloudfront.net`, DNS routes to the nearest CloudFront POP. The user connects to a server 10ms away even though the IP "looks like" one server.

### E-Commerce Checkout — Connection Cost Impact
A checkout page making 20 API calls to different microservice origins (payment, inventory, shipping, user profile) on HTTP/1.1 would require 20 separate DNS + TCP + TLS handshakes per origin. HTTP/2 reduces this to one connection per origin. `preconnect` hints for known API origins eliminate the handshake cost entirely on first load.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"A web request goes through DNS resolution (IP lookup, 20-200ms), a TCP handshake (1 RTT — creates the reliable connection), and TLS negotiation (1 RTT for TLS 1.3, 2 RTTs for 1.2 — establishes encryption and authentication) before the first byte of HTTP data flows. On a 100ms RTT connection, that's 300ms of overhead before any content arrives.*

*This is the fundamental justification for CDN architecture — moving the server closer to the user reduces RTT from 200ms to 20ms, cutting connection overhead 10x. Not code, not bundles — just geography.*

*TCP Slow Start is equally important: new TCP connections start with a small congestion window (~14KB). A page that requires 100KB of critical CSS on a fresh connection needs 4+ RTTs just to download that CSS due to slow start ramping. This is why connection reuse (HTTP/2), persistent connections, and `preconnect` hints are performance primitives.*

*HTTP/3 (QUIC) addresses the remaining TCP limitations: it eliminates TCP-level HOL blocking (one lost packet in TCP blocks all stream data; in QUIC, each stream is independent), enables connection migration (mobile hand-off), and combines QUIC + TLS 1.3 into a single 1-RTT setup."*

### Likely Follow-up Questions

1. **"What is TTFB and what affects it?"**
   → Time to First Byte: DNS + TCP + TLS + server processing time + network transit. CDN reduces network costs; server-side caching and SSG reduce processing time.

2. **"Why don't we just preconnect to everything?"**
   → Each `preconnect` occupies a TCP connection slot (browsers limit per-origin and total connections). Preconnecting to origins that end up not being used wastes these slots and may delay actual connections. Limit to the 6-10 most critical origins.

3. **"What is TCP Slow Start and why does it matter for frontend?"**
   → TCP starts with a small congestion window and ramps up exponentially. A fresh connection can only send ~14KB in the first round trip. This makes repeated connections (HTTP/1.1) inefficient for small resources and justifies connection reuse (HTTP/2) and `preconnect`.

4. **"What is Anycast DNS and how does it help CDNs?"**
   → Anycast routes the same IP address to multiple physical servers. BGP routing directs each request to the geographically nearest one. CDNs use this so the same CDN domain resolves to the nearest PoP for every user globally.

---

## 5. Code Examples

### Navigation Timing Network Breakdown

```javascript
// Detailed network breakdown using Navigation Timing API Level 2
function getNetworkBreakdown() {
  const [nav] = performance.getEntriesByType('navigation');
  
  return {
    // DNS
    dnsStart:      nav.domainLookupStart,
    dnsEnd:        nav.domainLookupEnd,
    dnsDuration:   nav.domainLookupEnd - nav.domainLookupStart,
    
    // TCP
    tcpStart:      nav.connectStart,
    tcpEnd:        nav.connectEnd, // Includes TLS if HTTPS
    tcpDuration:   nav.connectEnd - nav.connectStart,
    
    // TLS (extracted from connect phase)
    tlsStart:      nav.secureConnectionStart,
    tlsEnd:        nav.connectEnd,
    tlsDuration:   nav.secureConnectionStart > 0 
                     ? nav.connectEnd - nav.secureConnectionStart 
                     : 0,
    
    // Request/Response
    requestStart:  nav.requestStart,
    responseStart: nav.responseStart, // = TTFB
    responseEnd:   nav.responseEnd,
    
    // Metrics
    ttfb:          nav.responseStart - nav.fetchStart,
    download:      nav.responseEnd - nav.responseStart,
    totalNetwork:  nav.responseEnd - nav.fetchStart,
  };
}

// Send to analytics/RUM
window.addEventListener('load', () => {
  const breakdown = getNetworkBreakdown();
  // Report to backend
  navigator.sendBeacon('/analytics/network', JSON.stringify(breakdown));
});
```

### Resource Timing for Individual Requests

```javascript
// Monitor individual API call network performance
function instrumentFetch(url, options = {}) {
  const startMark = `fetch-start-${url}`;
  const endMark = `fetch-end-${url}`;
  
  performance.mark(startMark);
  
  return fetch(url, options)
    .then(response => {
      performance.mark(endMark);
      performance.measure(`fetch-${url}`, startMark, endMark);
      
      const [measure] = performance.getEntriesByName(`fetch-${url}`);
      
      // Also get resource timing for network breakdown
      const resourceEntries = performance.getEntriesByName(url);
      const resourceEntry = resourceEntries[resourceEntries.length - 1];
      
      if (resourceEntry) {
        console.log({
          url,
          ttfb: resourceEntry.responseStart - resourceEntry.fetchStart,
          download: resourceEntry.responseEnd - resourceEntry.responseStart,
          total: measure.duration,
          cached: resourceEntry.transferSize === 0,
        });
      }
      
      return response;
    });
}
```

---

## 6. Why & How Summary

**Why it matters:**
The network stack is responsible for a significant portion of page load time that exists entirely outside your application code. A perfectly optimized React app can still load slowly due to DNS, TCP, or TLS overhead. Understanding these costs enables architectural decisions — CDN usage, `preconnect` hints, HTTP/2 adoption, QUIC migration — that eliminate these overheads at scale. CDN placement and HTTP/3 adoption are infrastructure decisions that can save 200-500ms per user per page load without touching a single line of application code.

**How it works:**
A browser's HTTP request traverses: (1) DNS resolution — hostname to IP lookup, cached at browser/OS/resolver levels with TTL-based expiration; (2) TCP handshake — 3-way SYN/SYN-ACK/ACK, 1 RTT overhead, starts TCP slow start (small initial congestion window that grows exponentially); (3) TLS handshake — TLS 1.3 requires 1 RTT to exchange keys and certificates, with 0-RTT available for session resumption; (4) HTTP request — application-layer data exchange. Total fresh connection cost: DNS + 2-3 RTTs before data. HTTP/2 reuses a single TCP connection for all requests to an origin. HTTP/3/QUIC eliminates TCP HOL blocking by running independent streams over UDP with in-built reliability.
