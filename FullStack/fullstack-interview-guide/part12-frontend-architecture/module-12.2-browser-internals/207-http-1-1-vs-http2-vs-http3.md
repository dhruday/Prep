# HTTP/1.1 vs HTTP/2 vs HTTP/3
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **HTTP/1.1 (1997)**: one request at a time per TCP connection; browsers work around it by opening 6 parallel connections per origin; head-of-line blocking within each connection (a slow response holds up everything behind it); text-based headers sent in full on every request (cookies repeated every time, uncompressed)
- **HTTP/2 (2015)**: multiplexing — many requests on ONE TCP connection via independent streams; binary framing (not text); HPACK header compression (only changed headers sent after first request, not the full header block); stream prioritisation; server push (browser hasn't asked, server pre-sends CSS/JS — mostly deprecated/disabled now); STILL TCP-level head-of-line blocking (one lost TCP packet stalls ALL streams on that connection)
- **HTTP/3 (2022)**: replaces TCP with QUIC (UDP-based, reliability built into QUIC itself); stream-level independence — a lost packet stalls only ITS stream, not others; 0-RTT connection resumption (return visitor reconnects with zero round trips — critical for mobile); built-in TLS 1.3 (no separate TLS handshake); deployed by Cloudflare, Google, Facebook, Akamai
- **Frontend implications of HTTP/2**: domain sharding (opening connections to cdn.example.com to bypass the 6-connection limit) is now an anti-pattern; individual small files are fine to leave unsplit (multiplexing makes them cheap); resource bundling is no longer as critical as it was in HTTP/1.1 days — but bundle for parse time, not request count
- **Frontend implications of HTTP/3**: mobile performance improves significantly (mobile packet loss is common; QUIC prevents stream stalls); reconnection after background-to-foreground is near-instant (0-RTT)
- **Status**: HTTP/2 is now >70% of web traffic (Chrome/Firefox negotiate it automatically via ALPN); HTTP/3 is supported by ~30% of web servers and all major browsers; your API server is probably still HTTP/1.1 internally (service-to-service) unless explicitly configured

---

## 1. One-Line Definition
HTTP/1.1, HTTP/2, and HTTP/3 are successive versions of the web's application-layer protocol — each solving a fundamental bottleneck of the previous version by changing how requests, responses, and connections are multiplexed, compressed, and transported at the network layer.

---

## 2. The Problem It Solves

A web page makes 80 requests: HTML, 10 CSS files, 40 JavaScript chunks, 25 images, 4 font files. Under HTTP/1.1, the browser opens 6 connections per origin. Each connection handles one request at a time. The browser queues the remaining requests, cycling through them as connections free up. A 200KB JavaScript file blocking one connection prevents any of the 5 lighter files queued behind it from starting.

Developers compensated with tricks: domain sharding (serve static assets from `cdn1.example.com`, `cdn2.example.com`, `cdn3.example.com` to get 18 connections instead of 6), bundling all JavaScript into one file (fewer requests = fewer connection round trips), CSS sprites (one image file instead of 50 icons), inlining small CSS as `data:` URIs. These are HTTP/1.1 workarounds — most become unnecessary or counterproductive with HTTP/2.

HTTP/2's multiplexing allows multiple requests concurrently over a single connection. HTTP/3 eliminates the last TCP-level bottleneck by replacing TCP with QUIC. Understanding these differences tells you which optimisation advice is current vs. obsolete — and why some Lighthouse recommendations are HTTP/2-first.

---

## 3. How It Works Internally

### HTTP/1.1 — Connection Model

```
Browser ↔ Server (HTTP/1.1)

Three TCP connections, one request active per connection:

Connection 1: GET /index.html          → 200 HTML
              GET /app.bundle.js       → (waiting for bundle, 200KB, 400ms)
                                          [nothing else on conn 1 can proceed]

Connection 2: GET /styles.css          → 200 CSS
              GET /font.woff2          → 200 Font
              GET /analytics.js        → (waiting...)

Connection 3: GET /logo.png            → 200 Image
              GET /hero.jpg            → (large image, 800ms wait)
                                          [other images queue behind it]

Problem: 50 total requests, 6 connections, responses come back in
         unpredictable order depending on which server responses arrive first.

Head-of-line blocking per TCP connection:
  If server is slow on one response, EVERY subsequent request on that
  connection waits — even if those resources are already ready on the server.

  Waterfall:    [  big.js 600ms  ][  small.js 50ms  ]  — because they share a connection
  Should be:    [  big.js 600ms  ]
                [  small.js 50ms  ]                    — if parallel

HTTP/1.1 workaround — Connection header:
  HTTP/1.1 added "pipelining" (send next request before response received)
  but responses MUST come back in request order — still head-of-line blocked
  Most browsers disabled pipelining due to real-world server incompatibilities
```

### HTTP/2 — Binary Multiplexing

```
Browser ↔ Server (HTTP/2)

ONE TCP connection. Multiple streams over it simultaneously.

Stream 1 (HTML):      |=====|
Stream 3 (CSS):       |===|
Stream 5 (JS bundle): |==================|
Stream 7 (Hero image):|========|
Stream 9 (Font):      |====|

All active simultaneously. The TCP connection carries frames from all streams,
interleaved. The receiver reassembles each stream independently.

Binary framing:
  HTTP/1.1 header: "GET /api/user HTTP/1.1\r\nHost: example.com\r\n..."  (text)
  HTTP/2 frame:    [length][type][flags][stream_id][payload]              (binary)

HPACK header compression:
  Request 1: "Accept: application/json", "Authorization: Bearer abc123",
             "User-Agent: Chrome/121", "Host: api.example.com"    (full headers, ~800 bytes)
  Request 2: [index: 1] [index: 4]  — only reference previous headers     (~50 bytes)
  (Cookie header: sent once in full; subsequent requests send only a 1-byte index)

HTTP/2 still fails on TCP packet loss:
  Single TCP connection = single ordered byte stream at TCP level
  One lost packet → TCP retransmits → ALL streams wait for that packet to arrive
  → TCP-level head-of-line blocking (solved in HTTP/3)

  Connection 1, carrying streams 1-10:
    [stream1 frame][stream3 frame][LOST PACKET][stream5 frame]...
                                      ↑ TCP waits here for retransmission
                                        streams 1, 3, 5, 7... ALL stall
                                        even though their data is ready
```

### HTTP/3 — QUIC Transport

```
Browser ↔ Server (HTTP/3 / QUIC)

No TCP. UDP-based QUIC with reliability built into the QUIC layer.

QUIC streams are independently reliable:
  Stream 1, Stream 3, Stream 5 — each tracked by QUIC independently
  If a UDP packet carrying Stream 1 data is lost:
    → Only Stream 1 stalls (waits for QUIC retransmission)
    → Streams 3 and 5 continue uninterrupted
    → The LOST PACKET problem from HTTP/2's TCP is solved

0-RTT connection resumption:
  First visit: full TLS 1.3 handshake (1 round trip for QUIC vs 2 for TLS/TCP)
  Returning visitor: stores cryptographic session ticket
  Next visit: send data WITH the first UDP packet (0 round trips before data)
  
  Impact on mobile: switching from WiFi to 4G → new IP address
  HTTP/1.1 / HTTP/2 over TCP: new TCP connection + new TLS handshake (400-600ms)
  HTTP/3 over QUIC: connection migrates seamlessly using connection ID (not IP)
  → 0ms reconnection penalty on network change (critical for mobile users)

HTTP/3 deployment reality:
  QUIC runs over UDP port 443. Network middleboxes (firewalls, enterprise proxies)
  often block or rate-limit UDP. Fallback: browsers try HTTP/3 first (via Alt-Svc header
  from server), fall back to TCP/HTTP2 if QUIC fails.
  
  "QUIC bit" in handshake: both sides advertise HTTP/3 support via Alt-Svc header
  Alt-Svc: h3=":443"; ma=86400
```

---

## 4. The Code

### Wrong Way — HTTP/1.1-Era Patterns Applied to HTTP/2+ Server

```javascript
// ❌ WRONG — Domain sharding (HTTP/1.1 workaround, hurts HTTP/2)
// Pattern: serve static assets from multiple subdomains to bypass 6-connection limit
// 
// index.html loads from:
//   https://cdn1.example.com/script1.js
//   https://cdn2.example.com/script2.js
//   https://cdn3.example.com/script3.js
//
// Under HTTP/1.1: gets 6 connections per domain = 18 total connections. Fast!
// Under HTTP/2:   each subdomain = new TCP connection + new TLS handshake = SLOWER
//                 (HTTP/2 only needs ONE connection per origin)

// ❌ WRONG — Excessive bundling to reduce request count
// Previously: bundle ALL JS into app.js (600KB) to avoid 50 individual requests
// Under HTTP/2: 50 individual requests (multiplexed) are fine
// Over-bundling means: larger cache invalidation (one tiny change = entire 600KB re-download)
//                      longer parse time on slow devices

// ❌ WRONG — CSS sprites for icons (HTTP/1.1 workaround)
// One big sprite.png + background-position CSS to "cut out" each icon
// Under HTTP/2: individual SVG files per icon load as fast, are cacheable independently
//               and are smaller than a sprite sheet that includes unused icons
// Modern: use inline SVG or SVG sprite in HTML, or individual SVG files

// ❌ WRONG — Not configuring the server to advertise HTTP/2
// Node.js server without HTTP/2 (still serving HTTP/1.1 to browsers):
const http = require('http');  // ← HTTP/1.1 only
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ data: 'value' }));
});
server.listen(3000);
// Result: browser negotiates HTTP/1.1 — 6 connections, no multiplexing
```

> **Why this fails:** domain sharding under HTTP/2 creates unnecessary TCP connections and TLS handshake overhead. Excessive bundling increases cache invalidation scope and parse time. The entire slate of HTTP/1.1 optimisation tricks become neutral to harmful under HTTP/2.

### Right Way — HTTP/2-Aware Server Configuration and HTTP/3 Readiness

```javascript
// ✅ RIGHT — Enable HTTP/2 in Node.js with proper TLS
const http2 = require('http2');
const fs = require('fs');

// HTTP/2 requires TLS in browsers (via ALPN negotiation)
const server = http2.createSecureServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
  allowHTTP1: true, // graceful fallback for HTTP/1.1 clients
});

server.on('stream', (stream, headers) => {
  const path = headers[':path'];
  
  // HTTP/2 Server Push — proactively send critical CSS with HTML response
  // (though Early Hints / 103 status is the preferred modern alternative)
  if (path === '/') {
    // Push critical CSS before browser even asks for it
    stream.pushStream({ ':path': '/critical.css' }, (err, pushStream) => {
      if (!err) {
        pushStream.respond({
          ':status': 200,
          'content-type': 'text/css',
        });
        pushStream.end(fs.readFileSync('./public/critical.css'));
      }
    });
  }
  
  stream.respond({ ':status': 200, 'content-type': 'text/html' });
  stream.end(fs.readFileSync('./public/index.html'));
});

server.listen(443);

// ✅ RIGHT — Nginx configuration for HTTP/2 + HTTP/3 with proper headers
/*
server {
    listen 443 ssl;
    listen 443 quic reuseport;       # HTTP/3 over QUIC
    http2 on;                        # HTTP/2 over TLS
    
    ssl_certificate     /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;
    ssl_protocols       TLSv1.3;     # HTTP/3 requires TLS 1.3
    
    # Advertise HTTP/3 support to browsers
    # Browser remembers for 1 day (86400s) and tries QUIC next visit
    add_header Alt-Svc 'h3=":443"; ma=86400';
    
    # Enable 0-RTT for TLS (reduces handshake to 0 round trips on retry)
    # ⚠️ Security note: 0-RTT is vulnerable to replay attacks for non-idempotent requests
    # Only enable for GET-heavy sites or use anti-replay tokens for POST/PUT
    ssl_early_data on;
    
    location / {
        root /var/www/html;
        index index.html;
    }
}
*/

// ✅ RIGHT — Resource hints that work well with HTTP/2 multiplexing
// With HTTP/2, preloading the specific critical resources is precise
// (No need for domain-sharded preload hints — one origin handles everything)
/*
HTML head:
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin>
<link rel="preload" href="/js/checkout.js" as="script">

(These preload hints work especially well with HTTP/2:
 the browser opens one multiplexed stream per hint rather than
 opening new connections as under HTTP/1.1)
*/
```

```javascript
// ✅ RIGHT — Smart bundling strategy for HTTP/2 (code splitting, not mega-bundles)
// webpack / Vite code splitting configuration

// vite.config.ts — HTTP/2-aware chunk strategy
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split into logical groups
          // Each group is independently cacheable and multiplexed efficiently
          'react-core': ['react', 'react-dom'],           // rarely changes → long cache
          'ui-components': ['@radix-ui/react-dialog',     // component library
                           '@radix-ui/react-dropdown'],
          'charts': ['recharts'],                          // large, rarely needed
          // Application routes are automatically code-split by route (dynamic imports)
        },
        // Each chunk is individually cacheable — a bug fix in 'charts' only
        // invalidates the charts chunk, not the 'react-core' chunk
        // Under HTTP/2: fetching 5 chunks simultaneously is fine (streams are multiplexed)
        // Under HTTP/1.1: 5 chunks = 5 sequential requests on one connection (slow)
      }
    },
    // Enable HTTP/2 push manifest (experimental) for identifying critical chunks
    // to push with the HTML response (or send 103 Early Hints)
  }
});

// ✅ RIGHT — 103 Early Hints (modern replacement for Server Push)
// Server sends 103 status code while still processing the 200 response
// Browser uses the hints to preload critical resources during processing time
// Express.js example:
app.get('/', (req, res) => {
  // Send 103 Early Hints immediately — browser starts loading resources
  // while the server is still building the HTML response
  res.writeEarlyHints({
    'link': [
      '</styles/critical.css>; rel=preload; as=style',
      '</js/app.js>; rel=preload; as=script',
      '</fonts/inter.woff2>; rel=preload; as=font; crossorigin',
    ]
  });
  
  // Server does expensive work (DB queries, template rendering)
  const html = buildDashboardHTML(); // 100ms server-side processing
  
  // 200 response with the full HTML
  res.send(html);
  // Net effect: browser loaded critical.css, app.js, inter.woff2 during the
  // 100ms that the server was building the HTML — those resources may already
  // be in cache by the time the browser parses the HTML
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is head-of-line blocking and how does HTTP/2 solve it at the application level but not fully at the transport level?"

**Hruday's answer:**
> Head-of-line blocking means a slow item at the front of a queue stalls all items behind it. In HTTP/1.1, it appears at the connection level — one slow response blocks all subsequent requests on that connection. Browsers work around it by opening 6 connections per origin, but queuing still happens when you have more than 6 active requests.
>
> HTTP/2 solves this at the APPLICATION layer by introducing multiplexed streams. Each request is an independent stream on a shared connection. A slow stream (large image downloading) doesn't block a fast stream (small CSS file) — their frames arrive interleaved over the connection, and each is assembled independently.
>
> But HTTP/2 still runs over TCP, which is an ordered byte stream. TCP guarantees that bytes arrive in the exact order they were sent. If a single TCP packet is lost, TCP retransmits it, and EVERY byte after that lost packet must wait for the retransmission — even bytes belonging to completely different HTTP/2 streams. This is TCP-level head-of-line blocking, and HTTP/2 can't escape it because TCP doesn't know anything about HTTP streams.
>
> HTTP/3 solves this by replacing TCP with QUIC, which implements reliability per-stream at the QUIC layer. A lost packet stalls only the QUIC stream it belongs to. The other streams continue flowing. This is the fundamental improvement HTTP/3 brings beyond HTTP/2.

---

### Q2 — Practical Impact
**Interviewer asks:** "Should we still bundle all JavaScript into a single file for production? What's the HTTP-version-aware strategy?"

**Hruday's answer:**
> The answer is different depending on which protocol your server supports.
>
> Under HTTP/1.1: bundling is still a meaningful optimisation. With 6 parallel connections and no multiplexing, 20 separate JavaScript chunks create sequential round trips that a single bundle avoids. Spriting, domain sharding, and reducing request count all have measurable benefits.
>
> Under HTTP/2 (which most CDNs and modern servers now serve): the number of requests is no longer the primary concern. Each request is a stream on one connection — 20 streams vs 1 stream has minimal overhead. The strategy shifts completely. Instead of minimising request count, you optimise for:
> - **Cache granularity**: splitting vendor libraries (`react`, `lodash`) from application code means a bug fix in your code doesn't bust the cache for the vendor chunk — users re-download only what changed
> - **Parse time, not download time**: a 500KB bundle takes the same time to parse as 500KB of chunks; splitting doesn't help here — you need code splitting (dynamic imports) to defer loading and parsing of non-critical paths
> - **Critical path**: load LESS JavaScript, not bundled JavaScript — lazy-load route-specific chunks, split heavy dependencies like chart libraries behind dynamic imports
>
> My rule: split into logical cacheable units (framework, UI lib, per-route chunks), keep each chunk under 50KB where possible, and rely on HTTP/2 multiplexing to load them in parallel. Never maintain HTTP/1.1 workarounds like domain sharding if you're on HTTP/2.

---

### Q3 — HTTP/3 Specific
**Interviewer asks:** "When would a frontend engineer specifically benefit from HTTP/3 support, and how would you verify it's being used?"

**Hruday's answer:**
> HTTP/3's primary benefit is for users with packet loss — which means mobile users, users on constrained networks, and users far from the edge server. In concrete numbers: Cloudflare data shows HTTP/3 reduces p95 page load time by 10-15% on mobile vs HTTP/2, because mobile networks typically have 0.5-2% packet loss rates. Under HTTP/2 over TCP, 2% packet loss means all streams regularly stall for retransmission. Under HTTP/3's QUIC, only the stream with the lost packet stalls.
>
> The second benefit is connection migration — when a mobile user switches from WiFi to 4G, the IP address changes. HTTP/2 requires a new TCP handshake (100-200ms). HTTP/3 with QUIC uses a connection ID (not IP-based), so the connection migrates without interruption — huge for users on rides, elevators, building edges.
>
> To verify HTTP/3 is in use in Chrome DevTools: open the Network tab, right-click a column header, and enable "Protocol" column. Requests served over HTTP/3 show `h3`. HTTP/2 shows `h2`. HTTP/1.1 shows `HTTP/1.1`. Alternatively: `chrome://net-internals/#quic` shows active QUIC connections.
>
> To enable: your CDN (Cloudflare, Fastly, AWS CloudFront) likely already supports HTTP/3 with a config switch. For origin servers, Nginx 1.25+ supports it. The `Alt-Svc: h3=":443"` response header is what tells browsers to try QUIC on the next request.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "HTTP/2 removes the need for minification and compression" | "With HTTP/2 we don't need to compress assets anymore because multiplexing" | Completely wrong — HTTP/2 makes request count cheap, not payload size; gzip/Brotli compression (reducing 100KB JS to 30KB) is still critical; minification still matters; what HTTP/2 makes cheap is INDIVIDUAL REQUESTS, not bytes over the wire |
| "Domain sharding is good for performance" | "We use cdn1/cdn2/cdn3 to parallelize downloads" | Valid under HTTP/1.1 (pre-2015); harmful under HTTP/2 — each subdomain creates a new TCP connection and TLS handshake overhead; HTTP/2 handles multiple requests on ONE connection to one origin; domain sharding on HTTP/2 means MORE connection overhead, not less |
| "HTTP/3 is the same as HTTP/2 but faster" | "HTTP/3 is just HTTP/2 with speed improvements" | The transport is completely different — TCP is replaced by QUIC (UDP-based); the key functional differences are per-stream reliability (no TCP head-of-line blocking), 0-RTT resumption, and connection migration; it's not just a performance tweak — it's a protocol redesign that changes how packets are handled at the OS level |
| "Service workers cache negates protocol benefits" | "If we have service worker caching, HTTP version doesn't matter" | Service worker caching affects hits — if the resource is in the SW cache, the protocol is bypassed entirely (true). But SW caches have finite size, evict old entries, and don't cover first visits, cache misses, or API calls. The protocol still matters for everything not in SW cache. Also: SW and HTTP/2 combine well (SW can proactively cache HTTP/2-delivered bundles) |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our micro-frontend shell was served from an Nginx-reverse-proxied Node.js server, and each micro-frontend team's bundle was served from a separate CDN origin. When I was investigating the Lighthouse performance scores, one of the metrics the audit flagged was multiple origins requiring new TCP handshakes — we had assets on four domains, and each domain created an independent connection even though HTTP/2 multiplexing could have served all of them from one connection to one CDN origin.
>
> We consolidated static assets to a single CDN origin and configured the Nginx proxy to use HTTP/2 with the CDN (not just HTTPS/1.1 proxying). The result was visible in the waterfall: instead of four sequential 'new connection' steps (DNS + TCP + TLS × 4 = ~600ms), we had one connection setup followed by all bundles loading in parallel streams. Page load time dropped by about 400ms, which was pure protocol overhead.
>
> For the HTTP/3 piece: we added the `Alt-Svc` header on the CDN side (CloudFront with HTTP/3 enabled). Verification via Chrome DevTools showed `h3` protocol for CDN-served assets. We couldn't measure a dramatic improvement in our specific case because our users were mostly on corporate WiFi (stable connections, low packet loss) — but it was a configuration win for mobile users accessing the product demo environment."

---

## 8. Scale Evolution

**Small project / personal work →** HTTPS everywhere (lets HTTP/2 work), ensure your CDN supports HTTP/2 (all major CDNs do). Avoid creating multiple asset origins when one will do. Don't still bundle everything into `vendor.js + app.js` out of habit — code split.

**Mid-size product, 50K users/day →** Confirm HTTP/2 end-to-end: origin server → CDN → browser (check DevTools network waterfall). Configure Brotli compression (20-30% smaller than gzip, better ROI than HTTP/3 at this scale). Add `103 Early Hints` if your origin server supports it (Express.js, Nginx 1.25+). Monitor Core Web Vitals by connection type (RUM data — split LCP between 4G and WiFi users).

**Consumer-scale, millions of users →** HTTP/3 deployment (Cloudflare / Fastly / AWS CloudFront — all support it via toggle); measure via Real User Monitoring split by protocol version; 0-RTT for cacheable GET APIs; QUIC connection reuse strategies; coalescing requests to same HTTP/2 connection for service-to-service within datacenter (not just browser); gRPC over HTTP/2 for backend microservices communication.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment checkout latency is directly tied to protocol efficiency; fintech users include mobile-heavy demographics; checkout SDK is loaded cross-origin by hundreds of merchant sites — HTTP/2 push and preconnect hints for the SDK origin improve merchant-site performance; API call multiplexing during checkout (auth + order creation + payment) | HTTP/2 multiplexing for parallel API calls; `preconnect` for payment SDK origin; understanding HTTPS requirement for HTTP/2 |
| Swiggy / Meesho | Mobile-first, high packet-loss networks are the norm; product image loading (LCP for listing pages) is multiplexed under HTTP/2; HTTP/3's per-stream reliability directly improves image loading on 4G; app-like PWA performance depends on efficient resource loading | HTTP/3 benefits for mobile delivery; code splitting for PWA bundles; service worker + HTTP/2 combination |
| Adobe / Microsoft | Deep protocol knowledge expected at senior/staff level; Microsoft Edge team tracks HTTP/3 adoption; Adobe's CDN and DXP platform (Experience Manager) delivers assets to enterprise clients — choosing the right protocol per deployment context (QUIC vs TCP in enterprise networks with strict firewalls) | Alt-Svc header semantics; QUIC fallback behaviour; 103 Early Hints implementation; protocol negotiation via ALPN |
| SAP Labs | SAP BTP (Business Technology Platform) uses CDNs for Fiori assets; micro-frontend architecture with multiple origins (an HTTP/2 anti-pattern identified at SAP); real work: consolidated origins, enabled HTTP/2 on Nginx proxy, added Alt-Svc for HTTP/3 on CDN | Real production HTTP/2 consolidation story; waterfall analysis in DevTools; CDN configuration language |

---

## 10. Related Topics — What to Study Next

- **Topic 205 — Critical Rendering Path** — the protocol (HTTP version) directly impacts how quickly render-blocking CSS and JavaScript can be downloaded; under HTTP/2, multiple render-blocking resources are downloaded in parallel (one multiplexed connection); under HTTP/1.1, render-blocking files download serially on the connection; understanding both topics together explains why HTTP/2 + optimised CRP is the correct combination, not either alone
- **Topic 208 — Web Workers and Service Workers** — service workers implement a network proxy layer in front of HTTP; a service worker can intercept requests made over HTTP/2 and serve from cache, or add request batching logic; understanding the protocol layer is necessary to understand what the SW cache actually intercepts and what reaches the network
- **Topic 237 — CDN Architecture and Edge Computing** — CDNs terminate HTTP/3/HTTP/2 at the edge (close to the user); the protocol between CDN edge and origin server is often still HTTP/1.1 or HTTP/2; understanding this two-tier protocol model explains why CDN configuration (and not just application code) determines the protocol your users actually experience
- **Topic 234 — Core Web Vitals** — LCP is directly affected by the protocol: multiplexed resources under HTTP/2 means the LCP element (often an image) starts downloading sooner than under HTTP/1.1 where it may be queued; FID/INP is affected by JavaScript download time (multiplexed under HTTP/2); knowing the protocol helps explain WHY the Core Web Vitals numbers are what they are in the audit

---

*Part 12 · HTTP/1.1 vs HTTP/2 vs HTTP/3 · Full Stack Interview Guide · Hruday D · 2026*
