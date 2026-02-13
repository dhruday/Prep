# 22. HTTP/1.1 vs HTTP/2 vs HTTP/3

## 1. High-Level Explanation (Frontend Interview Level)

**HTTP/1.1 vs HTTP/2 vs HTTP/3** represent protocol evolution improving web performance—HTTP/1.1 (text, sequential, 6 connections), HTTP/2 (binary, multiplexed, 1 connection), HTTP/3 (QUIC over UDP, no head-of-line blocking, faster handshake).

- **HTTP/1.1**: Text protocol, 6 parallel connections, head-of-line blocking per connection
- **HTTP/2**: Binary protocol, multiplexed streams on 1 connection, server push
- **HTTP/3**: QUIC (UDP), no TCP head-of-line blocking, 0-RTT, faster on lossy networks

**Key Principle**: "HTTP/2 solves HTTP/1.1 connection limits with multiplexing; HTTP/3 solves TCP head-of-line blocking with QUIC over UDP."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Protocol Comparison Table

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|--------|--------|
| **Released** | 1997 | 2015 | 2020 |
| **Transport** | TCP | TCP | UDP (QUIC) |
| **Format** | Text | Binary | Binary |
| **Connections** | 6 per domain | 1 multiplexed | 1 multiplexed |
| **Multiplexing** | ❌ No | ✅ Yes | ✅ Yes |
| **Head-of-line blocking** | ✅ Per connection | ✅ TCP level | ❌ No (QUIC) |
| **Server Push** | ❌ No | ✅ Yes | ✅ Yes |
| **Header compression** | ❌ No | ✅ HPACK | ✅ QPACK |
| **TLS** | Optional (1-2 RTT) | Optional (1-2 RTT) | Built-in (0-1 RTT) |
| **Connection migration** | ❌ No | ❌ No | ✅ Yes |
| **Adoption** | 100% | ~50% | ~25% |

---

### HTTP/1.1 (1997)

**Characteristics**:
```
Protocol: Text-based
Transport: TCP
Connections: 6 parallel per domain (browser limit)
Latency: 1 request per connection at a time (blocking)
```

**Request/Response**:
```http
GET /index.html HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0
Accept: text/html
Connection: keep-alive

HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1234
Connection: keep-alive

<!DOCTYPE html>...
```

**Connection Limit**:
```
Browser opens 6 TCP connections to example.com:

Connection 1: /index.html
Connection 2: /style.css
Connection 3: /script.js
Connection 4: /image1.jpg
Connection 5: /image2.jpg
Connection 6: /image3.jpg

Request 7-100: QUEUED (wait for connection to free up)

Result: Head-of-line blocking (HOL blocking)
```

**Head-of-Line Blocking**:
```
Connection 1 timeline:

0ms:    Request /large-image.jpg (10MB)
100ms:  Downloading... (blocks connection)
500ms:  Still downloading...
1000ms: Still downloading...
1500ms: Download complete
1500ms: NOW can request /small-script.js (10KB)

Result: /small-script.js delayed 1500ms (waiting for /large-image.jpg)
```

**Workarounds**:

**1. Domain Sharding**:
```html
<!-- Split resources across domains -->
<link rel="stylesheet" href="https://static1.example.com/style.css">
<script src="https://static2.example.com/app.js"></script>
<img src="https://static3.example.com/image.jpg">

<!-- Now 18 parallel connections (6 per domain × 3 domains) -->
```

**Downsides**:
- Extra DNS lookups (20-120ms each)
- Extra TCP connections (30-100ms each)
- Extra TLS handshakes (50-150ms each)
- More server resources

**2. Resource Concatenation**:
```html
<!-- ❌ HTTP/1.1: Multiple files -->
<link rel="stylesheet" href="/styles/header.css">
<link rel="stylesheet" href="/styles/footer.css">
<link rel="stylesheet" href="/styles/sidebar.css">
<!-- = 3 requests, blocking -->

<!-- ✅ Concatenated: Single file -->
<link rel="stylesheet" href="/styles/bundle.css">
<!-- = 1 request, faster -->
```

**Downsides**:
- Cache invalidation (change 1 line → entire bundle invalid)
- Larger initial download (unused CSS included)

**3. Image Sprites**:
```css
/* ❌ HTTP/1.1: Multiple images */
.icon1 { background: url('/icons/icon1.png'); }
.icon2 { background: url('/icons/icon2.png'); }
.icon3 { background: url('/icons/icon3.png'); }
/* = 3 requests */

/* ✅ Sprite: Single image */
.icon1 { background: url('/icons/sprite.png') 0 0; }
.icon2 { background: url('/icons/sprite.png') -20px 0; }
.icon3 { background: url('/icons/sprite.png') -40px 0; }
/* = 1 request */
```

---

### HTTP/2 (2015)

**Characteristics**:
```
Protocol: Binary (efficient parsing)
Transport: TCP
Connections: 1 multiplexed (unlimited streams)
Latency: Multiple requests in parallel (no blocking)
```

**Key Features**:

**1. Multiplexing** (solve connection limit):
```
Single TCP connection:

Stream 1: /index.html   (parallel)
Stream 2: /style.css    (parallel)
Stream 3: /script.js    (parallel)
Stream 4: /image1.jpg   (parallel)
Stream 5: /image2.jpg   (parallel)
... Stream 100: /image100.jpg (parallel)

Result: Unlimited parallel requests, no connection limit
```

**Binary Framing**:
```
HTTP/1.1 (text):
GET /index.html HTTP/1.1\r\n
Host: example.com\r\n
\r\n

HTTP/2 (binary frames):
[HEADERS frame]
  Stream ID: 1
  :method: GET
  :path: /index.html
  :scheme: https
  :authority: example.com

[DATA frame]
  Stream ID: 1
  (body data)

Benefits:
- Faster parsing (no text parsing)
- Smaller overhead (binary encoding)
- Efficient multiplexing (frame interleaving)
```

**2. Server Push**:
```
Client requests: /index.html

Server responds:
├── PUSH_PROMISE: /style.css (proactive)
├── PUSH_PROMISE: /script.js (proactive)
├── DATA: /index.html
├── DATA: /style.css (pushed, before requested)
└── DATA: /script.js (pushed, before requested)

Result: Client receives CSS/JS before parsing HTML (faster)
```

**Server Push Example**:
```javascript
// Node.js HTTP/2 server
const http2 = require('http2');
const fs = require('fs');

const server = http2.createSecureServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
});

server.on('stream', (stream, headers) => {
  if (headers[':path'] === '/index.html') {
    // Push CSS before client requests it
    stream.pushStream({ ':path': '/style.css' }, (err, pushStream) => {
      pushStream.respondWithFile('style.css');
    });
    
    // Push JS
    stream.pushStream({ ':path': '/app.js' }, (err, pushStream) => {
      pushStream.respondWithFile('app.js');
    });
    
    // Send HTML
    stream.respondWithFile('index.html');
  }
});
```

**3. Header Compression (HPACK)**:
```
HTTP/1.1: Headers sent as text (every request)

Request 1:
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Encoding: gzip, deflate, br
...
= ~500 bytes

Request 2: Same headers repeated = ~500 bytes
Request 100: Same headers = ~500 bytes
Total: 50KB headers

HTTP/2 (HPACK): Headers compressed, indexed

Request 1: Full headers = 500 bytes → compressed = 100 bytes
Request 2: Index only = 10 bytes (reference to table)
Request 100: Index only = 10 bytes
Total: ~1.5KB headers (97% reduction)
```

**4. Stream Prioritization**:
```
Priority tree:

              Root
                │
        ┌───────┼───────┐
        │       │       │
      HTML     CSS     JS  (weight: 100)
        │
    ┌───┴───┐
  Image1  Image2  (weight: 50, depend on HTML)

Browser tells server:
- Load HTML first (blocks rendering)
- Then CSS/JS (block rendering)
- Then images (don't block)

Result: Critical resources first, faster rendering
```

**HTTP/2 Benefits**:
```
vs HTTP/1.1:
├── No 6-connection limit (1 multiplexed)
├── No domain sharding needed (1 connection)
├── No concatenation needed (parallel streams)
├── Faster (header compression, multiplexing)
└── Result: 20-50% faster page loads
```

**HTTP/2 Limitations**:

**TCP Head-of-Line Blocking**:
```
TCP is stream-ordered (reliable delivery):

Packet sequence: [1] [2] [3] [4] [5]

If packet [3] lost:
├── Packets [1] [2]: Delivered
├── Packet [3]: Lost, retransmit requested
├── Packets [4] [5]: BLOCKED (wait for [3])
└── HTTP/2 streams BLOCKED (even if [4] [5] contain different streams)

Result: Single packet loss blocks ALL streams
Worse on lossy networks (mobile, WiFi)
```

---

### HTTP/3 (2020)

**Characteristics**:
```
Protocol: Binary (same as HTTP/2)
Transport: QUIC over UDP (not TCP)
Connections: 1 multiplexed (like HTTP/2)
Latency: No TCP head-of-line blocking
```

**QUIC (Quick UDP Internet Connections)**:
```
UDP-based transport:
├── Independent streams (no head-of-line blocking)
├── Built-in TLS 1.3 (0-RTT possible)
├── Connection migration (survive IP changes)
└── Faster loss recovery (stream-level retransmit)
```

**Key Improvements**:

**1. No TCP Head-of-Line Blocking**:
```
QUIC streams are independent:

Packet sequence:
Stream 1: [1A] [2A] [3A]  (/index.html)
Stream 2: [1B] [2B] [3B]  (/style.css)
Stream 3: [1C] [2C] [3C]  (/script.js)

If packet [2B] lost (Stream 2):
├── Stream 1: [1A] [2A] [3A] delivered ✓ (unaffected)
├── Stream 2: [1B] delivered, [2B] retransmit, [3B] BLOCKED
├── Stream 3: [1C] [2C] [3C] delivered ✓ (unaffected)

Result: Only Stream 2 blocked, others continue
Much better on lossy networks (mobile, WiFi)
```

**2. Faster Connection Establishment** (0-RTT):
```
HTTP/2 (TCP + TLS):
├── TCP 3-way handshake: 1 RTT
├── TLS 1.3 handshake: 1 RTT
├── Total: 2 RTTs (~100ms on 50ms RTT)

HTTP/3 (QUIC):
├── Combined handshake: 1 RTT (first visit)
├── 0-RTT: 0ms (repeat visit, session resumption)
└── Total: 0-1 RTT (0-50ms)

Savings: 50-100ms per connection
```

**0-RTT Example**:
```
First visit:
Client → Server: QUIC ClientHello + TLS ClientHello
Server → Client: QUIC ServerHello + TLS ServerHello + session ticket
Total: 1 RTT

Repeat visit:
Client → Server: QUIC ClientHello + session ticket + HTTP request
                 ↑ Data sent immediately (0-RTT)
Server → Client: Response
Total: 0 RTT (instant)
```

**3. Connection Migration**:
```
HTTP/2 (TCP):
Mobile device switches WiFi → 4G:
├── IP address changes (192.168.1.x → carrier IP)
├── TCP connection: 5-tuple (src IP, src port, dst IP, dst port, protocol)
├── 5-tuple changed → connection BREAKS
├── Need new connection: DNS + TCP + TLS (100-370ms)
└── Result: Disconnection, re-establish

HTTP/3 (QUIC):
Mobile device switches WiFi → 4G:
├── Connection ID: UUID (independent of IP)
├── IP changes, but Connection ID stays same
├── QUIC migrates connection (send packet with new IP)
└── Result: Seamless, no disconnection (0ms)

Use case: Mobile browsing (switching networks frequently)
```

**4. Improved Congestion Control**:
```
TCP congestion control:
├── Kernel-level (OS update required)
├── Slow evolution (years)
└── Same algorithm for all apps

QUIC congestion control:
├── User-space (app-level)
├── Fast evolution (app update)
├── Custom algorithms per app
└── Better adaptivity (tune for web, video, gaming)
```

**HTTP/3 Adoption**:
```
Challenges:
├── UDP blocked by some firewalls/middleboxes (10-20% networks)
├── Fallback to HTTP/2 required (alt-svc header)
├── CPU cost (QUIC in user-space, not kernel)
└── Browser/server support (growing, ~25% as of 2026)

Adoption:
├── Google: ~50% of traffic (YouTube, Search)
├── Cloudflare: Supported
├── Facebook: Rolling out
├── Safari: Supported (iOS 14+)
└── Chrome: Supported (v87+)
```

---

### Performance Comparison

**Page Load Times** (100 resources, 50ms RTT, 1% packet loss):

```
HTTP/1.1:
├── Setup: 6 connections × 100ms (TCP + TLS) = 600ms
├── Downloads: Queued (6 at a time)
├── Packet loss: Blocks connection
└── Total: ~3000ms

HTTP/2:
├── Setup: 1 connection × 100ms = 100ms
├── Downloads: All parallel (multiplexed)
├── Packet loss: Blocks ALL streams (TCP HOL)
└── Total: ~1500ms (50% faster than HTTP/1.1)

HTTP/3:
├── Setup: 1 connection × 50ms (1 RTT) = 50ms
├── Downloads: All parallel
├── Packet loss: Blocks ONLY affected stream
└── Total: ~800ms (73% faster than HTTP/1.1, 47% faster than HTTP/2)

On lossy network (5% loss):
HTTP/1.1: ~5000ms
HTTP/2:   ~3000ms (TCP HOL blocks all streams)
HTTP/3:   ~1200ms (independent streams)
```

---

## 3. Clear Real-World Examples

### Example 1: Google Search – HTTP/3 Adoption

**Challenge**: Mobile users on lossy networks (1-5% packet loss).

**Solution**: HTTP/3 (QUIC) eliminates TCP head-of-line blocking:
```
HTTP/2 (1% loss):
├── Packet lost → blocks all streams
├── Page load: ~2000ms

HTTP/3 (1% loss):
├── Packet lost → blocks only affected stream
├── Page load: ~1200ms (40% faster)
```

**Result**: 40% faster on lossy networks, especially mobile.

---

### Example 2: YouTube – QUIC for Video

**Challenge**: Video rebuffering on network changes (WiFi → 4G).

**Solution**: HTTP/3 connection migration:
```
HTTP/2:
├── User switches network
├── TCP connection breaks (new IP)
├── Re-establish: 100-370ms
└── Video rebuffers (buffering spinner)

HTTP/3:
├── User switches network
├── QUIC migrates connection (Connection ID)
├── Seamless: 0ms
└── Video continues (no rebuffering)
```

**Result**: Seamless playback during network changes.

---

### Example 3: Cloudflare – HTTP/3 for CDN

**Challenge**: Serve assets fast globally (varying network quality).

**Solution**: HTTP/3 with 0-RTT:
```
First visit:
├── 1 RTT: 50ms

Repeat visit (0-RTT):
├── 0ms (session ticket)
└── Asset loads instantly
```

**Result**: 50-100ms faster repeat visits, better on lossy networks.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Compare HTTP/1.1, HTTP/2, and HTTP/3."

**Answer**:

"Three HTTP versions with **evolutionary improvements**:

---

### HTTP/1.1 (1997)

**Characteristics**:
- **Text protocol**: Human-readable
- **TCP-based**: Reliable, ordered
- **6 connections per domain**: Browser limit
- **Head-of-line blocking**: 1 request per connection

**Example**:
```
Connection 1: /large-image.jpg (10MB, 1500ms)
Connection 1: /script.js (10KB, BLOCKED until image done)

Result: /script.js delayed 1500ms
```

**Workarounds**:
- **Domain sharding**: Split across domains (6 × 3 = 18 connections)
  - Cost: Extra DNS + TCP + TLS (100-370ms per domain)
- **Concatenation**: Merge files (bundle.css, bundle.js)
  - Cost: Cache invalidation (1 line change → entire bundle)
- **Image sprites**: Single image (CSS background positioning)

**Problems**:
- Connection limit (max 6 parallel)
- HOL blocking (1 request per connection)
- No header compression (500 bytes × 100 requests = 50KB)

---

### HTTP/2 (2015)

**Characteristics**:
- **Binary protocol**: Efficient parsing
- **TCP-based**: 1 multiplexed connection
- **Unlimited streams**: No 6-connection limit
- **Header compression (HPACK)**: 90%+ reduction

**Key Features**:

**1. Multiplexing**:
```
1 TCP connection:
  Stream 1: /index.html  (parallel)
  Stream 2: /style.css   (parallel)
  Stream 3: /script.js   (parallel)
  Stream 4-100: images   (parallel)

Result: Unlimited parallel, no queuing
```

**2. Server Push**:
```
Client: GET /index.html
Server: PUSH /style.css, PUSH /script.js, SEND /index.html

Result: CSS/JS arrive before client parses HTML
```

**3. Header Compression**:
```
HTTP/1.1: 500 bytes × 100 requests = 50KB
HTTP/2:   100 bytes + 10 bytes × 99 = 1.5KB (97% smaller)
```

**4. Stream Prioritization**:
```
Priority: HTML > CSS/JS > Images
Browser tells server load order (critical first)
```

**Benefits vs HTTP/1.1**:
- No 6-connection limit
- No domain sharding needed
- No concatenation needed (parallel streams)
- 20-50% faster page loads

**Limitation: TCP Head-of-Line Blocking**:
```
Packet sequence: [1] [2] [3] [4] [5]
If [3] lost → [4] [5] BLOCKED (TCP is ordered)

Result: ALL HTTP/2 streams blocked by single packet loss
Worse on lossy networks (mobile, 1-5% loss)
```

---

### HTTP/3 (2020)

**Characteristics**:
- **Binary protocol**: Same as HTTP/2
- **QUIC over UDP**: Not TCP (solves TCP HOL)
- **Independent streams**: No TCP HOL blocking
- **Built-in TLS 1.3**: 0-RTT possible

**Key Improvements**:

**1. No TCP Head-of-Line Blocking**:
```
QUIC streams independent:

Stream 1: [1A] [2A] [3A] (/index.html)
Stream 2: [1B] [2B] [3B] (/style.css)  ← [2B] lost
Stream 3: [1C] [2C] [3C] (/script.js)

If [2B] lost:
- Stream 1: ✓ Delivered (unaffected)
- Stream 2: ✗ Blocked (retransmit [2B])
- Stream 3: ✓ Delivered (unaffected)

Result: Only Stream 2 blocked, others continue
```

**2. Faster Connection (0-RTT)**:
```
HTTP/2: TCP (1 RTT) + TLS (1 RTT) = 2 RTTs (~100ms)
HTTP/3: QUIC combined = 1 RTT (~50ms)
         0-RTT (repeat) = 0ms (instant)

Savings: 50-100ms per connection
```

**3. Connection Migration**:
```
User switches WiFi → 4G:

HTTP/2: IP changes → TCP breaks → reconnect (100-370ms)
HTTP/3: IP changes → QUIC migrates (Connection ID) → 0ms

Use case: Mobile browsing (seamless network changes)
```

**4. Improved Congestion Control**:
```
TCP: Kernel-level (slow evolution)
QUIC: User-space (fast evolution, custom algorithms)
```

**Performance** (100 resources, 50ms RTT, 1% loss):
```
HTTP/1.1: ~3000ms
HTTP/2:   ~1500ms (50% faster, but TCP HOL on loss)
HTTP/3:   ~800ms  (73% faster, no TCP HOL)

On lossy network (5% loss):
HTTP/2:   ~3000ms (TCP HOL blocks all)
HTTP/3:   ~1200ms (60% faster, independent streams)
```

**Adoption**:
- ~25% of web traffic (2026)
- Supported: Chrome, Safari, Cloudflare, Google services
- Challenges: UDP blocked (10-20% networks), fallback to HTTP/2 required

---

### Comparison Table

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|--------|--------|
| **Transport** | TCP | TCP | UDP (QUIC) |
| **Connections** | 6 per domain | 1 multiplexed | 1 multiplexed |
| **HOL blocking** | Per connection | TCP level | ❌ No |
| **Setup** | 2 RTTs | 2 RTTs | 0-1 RTT |
| **Header compression** | ❌ | ✅ HPACK | ✅ QPACK |
| **Server push** | ❌ | ✅ | ✅ |
| **Connection migration** | ❌ | ❌ | ✅ |

---

### Real-World

**Google Search**: HTTP/3 (40% faster on 1% loss, mobile networks).

**YouTube**: QUIC connection migration (seamless WiFi → 4G, no rebuffering).

**Cloudflare**: HTTP/3 CDN (50-100ms faster 0-RTT repeat visits).

---

### Trade-offs

**HTTP/2 vs HTTP/1.1**:
- ✅ 20-50% faster (multiplexing, header compression)
- ✅ Simpler (no domain sharding, concatenation)
- ❌ TCP HOL blocking (worse on lossy networks)

**HTTP/3 vs HTTP/2**:
- ✅ 40-60% faster on lossy networks (no TCP HOL)
- ✅ Faster setup (0-1 RTT vs 2 RTTs)
- ✅ Connection migration (seamless network changes)
- ❌ UDP blocked (10-20% networks, need fallback)
- ❌ CPU cost (QUIC user-space vs TCP kernel)

**Follow-up I Expect**:

Q: 'Why is HTTP/3 faster on lossy networks?'
A: **TCP HOL blocking**: TCP is ordered stream. Packet loss → retransmit → blocks ALL subsequent packets (even different HTTP/2 streams). **QUIC (HTTP/3)**: Independent streams. Packet loss → blocks ONLY affected stream, others continue. On 1% loss: HTTP/2 ~3000ms, HTTP/3 ~1200ms (60% faster).

Q: 'What's 0-RTT in HTTP/3?'
A: **First visit**: 1 RTT (combined QUIC + TLS handshake, ~50ms). **Repeat visit**: 0 RTT (send HTTP request with ClientHello + session ticket, data sent immediately, ~0ms). Saves 50-100ms per connection. Security trade-off: 0-RTT vulnerable to replay attacks (idempotent requests only).

Q: 'Why not always use HTTP/3?'
A: **UDP blocked**: 10-20% of networks block UDP (firewalls, middleboxes). **Need fallback**: Alt-Svc header tells client HTTP/3 available, fall back to HTTP/2 if UDP blocked. **CPU cost**: QUIC in user-space (not kernel) = higher CPU usage. **Adoption**: Growing but not universal (~25% 2026)."

---

## 6. Why & How Summary

### Why It Matters

**Performance Evolution**: HTTP/1.1 (3000ms) → HTTP/2 (1500ms 50% faster) → HTTP/3 (800ms 73% faster) for 100 resources  
**Network Efficiency**: HTTP/2 solves connection limits (1 multiplexed vs 6), HTTP/3 solves TCP head-of-line blocking (independent streams)  
**Mobile Optimization**: HTTP/3 critical for mobile (1-5% packet loss common, connection migration for network changes)  
**User Experience**: Faster page loads (fewer round trips, parallel downloads, no blocking), seamless video playback (QUIC migration)

### How It Works

**HTTP/1.1**: Text protocol over TCP, 6 connections per domain (browser limit), head-of-line blocking per connection (1 request blocks until complete), workarounds (domain sharding extra DNS+TCP+TLS cost, concatenation cache invalidation, sprites), no header compression (500 bytes × 100 = 50KB)  
**HTTP/2**: Binary protocol over TCP, 1 multiplexed connection (unlimited streams no 6 limit), binary framing (efficient parsing), multiplexing (parallel streams no queuing), server push (proactive CSS/JS before requested), header compression HPACK (97% reduction 50KB → 1.5KB), stream prioritization (critical resources first), limitation (TCP head-of-line blocking: single packet loss blocks ALL streams worse on lossy networks 1-5% loss)  
**HTTP/3**: Binary protocol over QUIC (UDP not TCP), independent streams (no TCP HOL: packet loss blocks only affected stream others continue), faster setup (0-1 RTT vs 2 RTTs saves 50-100ms, 0-RTT repeat visits instant with session ticket), connection migration (Connection ID independent of IP, seamless WiFi→4G 0ms vs HTTP/2 100-370ms reconnect), improved congestion control (user-space fast evolution vs TCP kernel slow), challenges (UDP blocked 10-20% networks need fallback, CPU cost user-space higher than kernel)

**FAANG Expectation**: Compare three HTTP versions (1.1: text TCP 6 connections HOL per connection, 2: binary TCP 1 multiplexed unlimited streams HOL TCP level, 3: binary QUIC/UDP 1 multiplexed no HOL independent streams), HTTP/1.1 limitations (6 connection limit queuing, HOL blocking 1 request per connection, workarounds: domain sharding/concatenation/sprites with costs), HTTP/2 features (multiplexing unlimited parallel, server push proactive, HPACK compression 97% reduction, stream prioritization, benefits 20-50% faster eliminate workarounds, limitation TCP HOL single packet blocks all streams), HTTP/3 improvements (no TCP HOL independent streams only affected blocked, 0-RTT setup instant repeat 50-100ms saved, connection migration seamless network changes Connection ID, performance: 40-60% faster on lossy networks 1-5% loss HTTP/2 3000ms HTTP/3 1200ms), real-world examples (Google Search 40% faster 1% loss, YouTube QUIC migration no rebuffering, Cloudflare 0-RTT 50-100ms faster), trade-offs (HTTP/2 vs 1.1: faster simpler but TCP HOL on loss, HTTP/3 vs 2: faster on loss + migration but UDP blocked 10-20% + CPU cost user-space), 0-RTT mechanism (first visit 1 RTT combined handshake, repeat visit 0 RTT send data with ClientHello+ticket instant)
