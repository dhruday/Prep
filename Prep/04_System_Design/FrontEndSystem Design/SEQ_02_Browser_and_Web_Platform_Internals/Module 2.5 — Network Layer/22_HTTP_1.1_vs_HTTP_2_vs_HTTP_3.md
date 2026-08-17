# 22. HTTP/1.1 vs HTTP/2 vs HTTP/3

---

## 1. High-Level Explanation (Frontend Interview Level)

HTTP (HyperText Transfer Protocol) is the application-layer protocol browsers use to communicate with servers. Its evolution from HTTP/1.1 → HTTP/2 → HTTP/3 solved progressively deeper performance bottlenecks, each requiring architectural changes to both protocol and transport layer.

**Why the evolution happened:**
- HTTP/1.1 (1997): Designed for a web of simple documents with few resources. Modern pages with 100+ resources exposed its serialization limits.
- HTTP/2 (2015): Wire-level efficiency — multiplexing, compression, server push over the existing TCP infrastructure.
- HTTP/3 (2022 RFC): Transport-level efficiency — replace TCP with QUIC to eliminate the fundamental TCP HOL blocking and connection overhead.

**One-line summaries:**
- **HTTP/1.1** — Sequential requests, multiple TCP connections (max 6 per browser per origin)
- **HTTP/2** — Multiplexed streams, one TCP connection, header compression
- **HTTP/3** — QUIC over UDP, independent streams, connection migration, 0-RTT

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### HTTP/1.1 Deep Dive

**Key features:**
- **Persistent connections** (`Connection: keep-alive`) — Reuse same TCP connection for multiple requests, avoiding repeated TCP handshakes
- **Pipelining** — Send multiple requests without waiting for responses (spec'd in 1.1 but poorly supported, notorious for bugs)
- **Chunked Transfer Encoding** — Send response in chunks, enabling streaming
- **Host header** — Enabled virtual hosting (multiple domains on one IP)

**The fundamental problem — Head-of-Line (HOL) Blocking:**
Even with persistent connections, HTTP/1.1 is request-response. The second request cannot be sent until the first response is fully received. (Pipelining was supposed to fix this but browser support is effectively zero — too many proxy/middlebox incompatibilities.)

```
HTTP/1.1 Connection — Requests must wait:
Client → Server: GET /styles.css
Client ← Server: (response 1)         ← must wait
Client → Server: GET /app.js
Client ← Server: (response 2)         ← must wait
Client → Server: GET /hero.jpg
Client ← Server: (response 3)
```

**Browser workaround: Domain Sharding**
Browsers allow 6 parallel TCP connections per hostname. To work around HTTP/1.1's single-connection parallelism limit, engineers used domain sharding:

```html
<!-- HTTP/1.1 era optimization — spread resources across multiple subdomains -->
<!-- 6 connections to a1.cdn.example.com + 6 to a2.cdn.example.com = 12 parallel downloads -->
<img src="https://a1.cdn.example.com/img/logo.png">
<img src="https://a2.cdn.example.com/img/banner.png">
```

**Why domain sharding is now an anti-pattern:** HTTP/2 multiplexes over one connection. Multiple subdomains = multiple separate connections = **more overhead**, not less. Always consolidate to a single origin on HTTP/2.

### HTTP/2 Deep Dive

HTTP/2 (spec: RFC 7540) maintains the same HTTP semantics (methods, status codes, headers) but completely redesigns the wire protocol:

**Binary Framing Layer:**
HTTP/1.1 is text-based. HTTP/2 encodes messages as binary frames, enabling the multiplexing and compression features.

```
HTTP/2 Connection (one TCP connection with multiple streams)
┌─────────────────────────────────────────────────┐
│  Stream 1: GET /styles.css   → HEADERS frame    │
│             ← DATA frames (CSS bytes)           │
│                                                 │
│  Stream 2: GET /app.js       → HEADERS frame    │
│             ← DATA frames (JS bytes, interleaved│
│                              with Stream 1)     │
│                                                 │
│  Stream 3: GET /hero.jpg     → HEADERS frame    │
│             ← DATA frames (image bytes)         │
└─────────────────────────────────────────────────┘
All frames share one TCP connection, multiplexed
```

**Key HTTP/2 Features:**

1. **Multiplexing:**
   Multiple requests in flight simultaneously over ONE TCP connection. No waiting for previous response to complete. The server can interleave frames from different streams.

2. **HPACK Header Compression:**
   HTTP headers are repetitive (e.g., `Authorization`, `User-Agent`, `Accept-Encoding` sent on every request). HPACK maintains a static table (common headers) and dynamic table (session-specific headers seen before). Instead of sending full header strings, send an integer index.
   
   ```
   HTTP/1.1:  4,000 header bytes per request × 100 requests = 400KB of header overhead
   HTTP/2:    ~100 bytes per request after first (index references) = 10KB
   ```

3. **Server Push:**
   Server can proactively send resources before the client requests them:
   ```
   Client: GET /index.html
   Server: PUSH_PROMISE /styles.css  ← Server pushes CSS before client asks
   Server: PUSH_PROMISE /app.js
   Server: Response for /index.html
   Server: Response for /styles.css (already in pipeline)
   Server: Response for /app.js
   ```
   **In practice:** Server Push proved problematic — servers often pushed resources already in client cache, wasting bandwidth. Browser support for HTTP/2 Push was removed in Chrome 106. `<link rel="preload">` serves the same purpose better.

4. **Stream Prioritization:**
   Each HTTP/2 stream has a priority weight. Clients can signal CSS ›› JS ›› Images, and servers (if they support it) serve high-priority frames first.

**HTTP/2 Remaining Limitation — TCP HOL Blocking:**
Multiplexing fixes HTTP-level HOL blocking, but TCP-level HOL blocking remains. TCP guarantees ordered delivery. If one TCP packet is lost:
- The OS TCP stack holds all subsequent packets until the lost one is retransmitted
- ALL HTTP/2 streams are stalled — even ones that didn't have lost packets

On mobile networks with 1-2% packet loss, TCP HOL blocking can stall the entire connection for 100-200ms per lost packet.

### HTTP/3 Deep Dive

HTTP/3 (spec: RFC 9114) runs on **QUIC** (RFC 9000) instead of TCP.

**QUIC = UDP + reliability + flow control + TLS 1.3 at application layer:**

```
HTTP/1.1/2 stack:       HTTP/3 stack:
┌────────────────┐      ┌──────────────┐
│ HTTP           │      │ HTTP/3       │
│ TLS 1.3        │      │ QUIC (UDP)   │
│ TCP            │      │   ↕ includes TLS 1.3 + reliability│
│ IP             │      │ UDP          │
│ Physical       │      │ IP           │
└────────────────┘      │ Physical     │
                        └──────────────┘
```

**Key HTTP/3 / QUIC improvements:**

1. **No TCP HOL Blocking:**
   QUIC implements streams independently at the application layer. A lost UDP packet only blocks the specific QUIC stream it belongs to — other streams continue freely.
   
   ```
   HTTP/2 (TCP): Packet loss for stream 3 → ALL streams stall
   HTTP/3 (QUIC): Packet loss for stream 3 → Only stream 3 stalls; streams 1,2,4 unaffected
   ```

2. **Faster Connection Establishment:**
   QUIC combines the transport handshake + TLS 1.3 in one round trip. New connections = 1 RTT. Existing sessions (0-RTT) = 0 RTT overhead.
   
   ```
   TLS 1.3 over TCP:  TCP (1 RTT) + TLS 1.3 (1 RTT) = 2 RTT before data
   QUIC/HTTP/3:       QUIC + TLS 1.3 combined (1 RTT) = 1 RTT before data
   0-RTT:             0 RTT (session resume + immediate data)
   ```

3. **Connection Migration:**
   QUIC connections are identified by a Connection ID, not an IP/port 4-tuple. When a mobile device switches from WiFi to cellular (IP address changes), the QUIC connection migrates seamlessly — no reconnection needed. TCP connections break on IP change.

4. **Multiplexing over UDP:**
   QUIC reimplements reliable delivery (acknowledgment, retransmission, congestion control) at the application layer, getting all of TCP's reliability without its HOL blocking.

### Feature Comparison Table

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|--------|--------|
| Transport | TCP | TCP | QUIC (UDP) |
| TLS | Optional | Optional (but browsers require for HTTP/2) | **Built-in** (always) |
| Connections per origin | 6 (browsers) | 1 | 1 |
| Multiplexing | No | Yes (TCP streams) | Yes (QUIC streams) |
| Header compression | No | HPACK | QPACK |
| TCP HOL Blocking | Yes | Yes | **No** |
| Connection migration | No | No | **Yes** |
| 0-RTT reconnect | No | No | **Yes** |
| Server Push | No | Yes (removed in Chrome 106) | Yes (but typically unused) |
| Text format | Yes | Binary | Binary |
| Browser adoption (2025) | ~100% | ~96% | ~87% |

---

## 3. Real-World Examples

### Google — Invented HTTP/2 and QUIC
Google's SPDY protocol (2009-2015) was the inspiration for HTTP/2. QUIC was invented at Google (2012) and deployed internally before being standardized as HTTP/3. All Google services (Search, Maps, YouTube, GMail) have run on HTTP/3 since ~2018 internally. Google Search results load 8% faster globally due to QUIC on mobile.

### Facebook/Meta — HTTP/2 Adoption at Scale
Facebook migrated to HTTP/2 in 2016 and measured a 30% improvement in page load times on mobile. The primary driver was eliminating the overhead of 6 parallel TCP connections per CDN origin — reduced from ~30 concurrent connections to 3-4 HTTP/2 connections.

### Cloudflare — HTTP/3 Edge
Cloudflare's entire edge network supports HTTP/3 and has since 2019. For customers with many mobile users in high-packet-loss environments (India, Southeast Asia), Cloudflare reports 8-15% LCP improvement from HTTP/3 vs HTTP/2.

### Shopify — Domain Sharding Removal
When Shopify migrated from HTTP/1.1 to HTTP/2 across their CDN, they removed domain sharding across `a.shopifycdn.com`, `b.shopifycdn.com`, etc. and consolidated to a single CDN domain. The result was faster load times due to connection multiplexing + eliminated cross-domain connection overhead — a concrete example of HTTP/2 making HTTP/1.1 optimizations into anti-patterns.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"HTTP/1.1 is fundamentally sequential — one request/response per connection, with browsers opening 6 parallel connections per origin as a workaround. The dominant technique at the time was domain sharding: spread resources across multiple subdomains to get 6+6=12 parallel connections. Bundling was also critical because fewer large files amortized the per-request overhead.*

*HTTP/2 fixed request-level HOL blocking via multiplexing — unlimited streams over a single TCP connection. This made domain sharding an anti-pattern (more connections = more overhead now) and made bundling less critical. HPACK compression eliminates repetitive header overhead. Server Push was controversial — intended to push critical CSS/JS proactively, but was misused and created cache redundancy issues, so Chrome removed it in 2022.*

*The one thing HTTP/2 couldn't fix is TCP's underlying HOL blocking — a lost TCP packet stalls ALL streams. HTTP/3 solves this by replacing TCP with QUIC, which runs independent streams over UDP. QUIC implements its own reliability per stream, so a lost packet for stream 3 doesn't block streams 1, 2, and 4. Combined with 1-RTT connection setup (vs HTTP/2's 2 RTT), 0-RTT reconnect, and connection migration for mobile handoffs, HTTP/3 is especially impactful on mobile networks with packet loss."*

### Likely Follow-up Questions

1. **"Is domain sharding always bad on HTTP/2?"**
   → If your CDN supports HTTP/2 connection coalescing (it can merge connections to different subdomains that resolve to the same IP), domain sharding is neutral. But if coalescing isn't supported, you get worse performance (multiple connection handshakes). Always measure on your specific CDN.

2. **"Why is HTTP/3 better specifically for mobile?"**
   → Mobile networks have higher packet loss (~1-2% vs <0.01% on fiber). TCP HOL blocking causes connection-level stalls on every packet loss event. QUIC's stream-level recovery ensures only affected streams are delayed, not the whole connection. Also, connection migration handles WiFi→cellular switches cleanly.

3. **"HTTP/2 header compression — why was HPACK designed this way?"**
   → HTTP headers repeat on every request (Auth tokens, User-Agent, Accept-Encoding). HPACK maintains a dynamic header table of values seen in previous requests; subsequent requests reference previously seen headers by index. This reduces header overhead from kilobytes to tens of bytes per request — critical for API-heavy SPAs making 50+ requests per page.

4. **"Chrome removed HTTP/2 Server Push — what replaces it?"**
   → `<link rel="preload">` in the HTML response achieves the same effect without the cache redundancy issue (preloaded resources check the browser cache; Server Push didn't). Some servers also use `103 Early Hints` responses to send preload headers before the full HTML is ready.

---

## 5. Code Examples

### Checking Protocol Version Programmatically

```javascript
// Resource Timing API — check which protocol each resource used
performance.getEntriesByType('resource').forEach(entry => {
  console.log({
    url: entry.name,
    protocol: entry.nextHopProtocol, // 'h2' | 'h3' | 'http/1.1'
    transferSize: entry.transferSize,
    duration: entry.duration,
  });
});

// Check current navigation protocol
const [navEntry] = performance.getEntriesByType('navigation');
console.log('Page protocol:', navEntry.nextHopProtocol);
// 'h2' = HTTP/2, 'h3' = HTTP/3, 'http/1.1' = legacy
```

### Nginx/Caddy HTTP/2 + HTTP/3 Configuration Reference

```nginx
# nginx.conf — Enable HTTP/2 and HTTP/3
server {
  listen 443 ssl;
  listen 443 quic reuseport;  # HTTP/3 over QUIC
  
  http2 on;  # nginx 1.25+ syntax
  
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  ssl_protocols TLSv1.3;  # TLS 1.3 required for HTTP/3
  
  # Advertise HTTP/3 support via Alt-Svc header
  add_header Alt-Svc 'h3=":443"; ma=86400';
  
  # Enable HPACK compression (HTTP/2 default but explicit here)
  # Enable QUIC stream multiplexing (QUIC default)
  
  location / {
    proxy_pass http://backend;
    
    # Important: remove domain sharding headers if present from HTTP/1.1 era
    # Remove: proxy_set_header X-Forwarded-Host $host;
  }
}
```

### HTTP/2 Request Batching vs HTTP/1.1 Bundling Decision

```javascript
// Strategy selection based on detected protocol
async function loadResources(urls) {
  const [nav] = performance.getEntriesByType('navigation');
  const isHTTP2Plus = nav.nextHopProtocol === 'h2' || nav.nextHopProtocol === 'h3';
  
  if (isHTTP2Plus) {
    // HTTP/2+: fire individual small requests (multiplexed = no overhead)
    return Promise.all(urls.map(url => fetch(url).then(r => r.json())));
  } else {
    // HTTP/1.1: batch into single request to avoid parallel connection limit
    return fetch('/api/batch', {
      method: 'POST',
      body: JSON.stringify({ urls }),
    }).then(r => r.json());
  }
}
```

---

## 6. Why & How Summary

**Why it matters:**
HTTP protocol version is not an infrastructure detail — it's a fundamental determinant of how efficiently resources are transferred to users. HTTP/2 adoption eliminated the need for HTTP/1.1 optimization patterns (domain sharding, aggressive bundling) and enabled new ones (granular code splitting). HTTP/3 is the current frontier, with measurable improvements particularly for mobile users in lossy network conditions. Every CDN and hosting choice should include HTTP/3 support as a selection criterion. Frontend engineers are expected to understand the protocol trade-offs behind their resource loading strategies.

**How it works:**
HTTP/1.1 uses sequential request/response per TCP connection (6 parallel connections per origin in browsers). HTTP/2 introduces binary framing and multiplexes unlimited streams over a single TCP connection with HPACK header compression — eliminating request HOL blocking and redundant headers. HTTP/3 replaces TCP with QUIC, implementing reliability and TLS at the application layer over UDP. QUIC provides independent stream delivery (loss in one stream doesn't affect others), faster connection establishment (combined QUIC + TLS 1.3 handshake = 1 RTT; 0-RTT for session resumption), and connection migration (survives IP address change). Progressive optimization path: consolidate origins for HTTP/2, adopt HTTP/3 at CDN layer for mobile performance, remove domain sharding anti-patterns, leverage granular code splitting enabled by multiplexing.
