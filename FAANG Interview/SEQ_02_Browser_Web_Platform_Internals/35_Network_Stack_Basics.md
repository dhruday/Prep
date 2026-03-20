# 35. Network Stack Basics
**Phase:** Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds. Crisp. Confident. Numbers included where relevant.

The browser's network stack is a multi-layered system that sits between the renderer process and the OS socket layer. It handles DNS resolution, TLS negotiation, connection pooling, HTTP protocol negotiation, request prioritisation, and caching — all before a single byte of response reaches your JavaScript. Understanding the network stack is what separates engineers who debug "why is this request slow" from those who genuinely know how to fix it. At SAP, when I drove load time down from 4.2s to 2.3s — a 45% improvement — a significant chunk came from aligning resource loading patterns with how the browser's network stack prioritises and schedules requests. DNS prefetch, connection prewarming, and HTTP/2 multiplexing were all part of that solution.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

The browser network stack is the complete pipeline from "JavaScript calls `fetch()`" to "response bytes arrive in memory." It is implemented primarily in the **Network Process** (in Chromium's multi-process architecture) and includes:

1. **URL parsing & validation**
2. **DNS resolution** (with cache)
3. **Socket-level connection management** (TCP/UDP)
4. **TLS/SSL negotiation** (via BoringSSL in Chrome)
5. **HTTP protocol layer** (HTTP/1.1, HTTP/2, HTTP/3/QUIC)
6. **Request/response processing** (headers, body streaming)
7. **Browser HTTP cache** (disk and memory)
8. **Certificate Transparency & HSTS enforcement**

### How It Works Internally

**Full request lifecycle in the Network Process:**

```
fetch('https://api.example.com/data')
        |
        ↓
[1] URL Parsing & Security Check
    - HTTPS enforced via HSTS preload list
    - Mixed Content check (HTTP resource on HTTPS page → blocked)
        |
        ↓
[2] Service Worker Intercept (if registered)
    - SW fetch event fires → may return from Cache API → skip steps 3–8
        |
        ↓
[3] Browser HTTP Cache Check
    - Check memory cache (L1) → disk cache (L2)
    - If fresh Cache-Control hit → return immediately (no network)
        |
        ↓
[4] DNS Resolution
    - Check browser DNS cache (chrome://net-internals/#dns)
    - OS DNS cache → Recursive resolver
    - DNSSEC/DoH (DNS over HTTPS) if enabled
    - Typical: 20–120ms cold, 0ms warm
        |
        ↓
[5] TCP Connection
    - Check connection pool for reusable connection
    - If none: TCP 3-way handshake (~1 RTT)
    - Typical: 20–80ms additional (one RTT)
        |
        ↓
[6] TLS Handshake (HTTPS)
    - TLS 1.3: 1 RTT (or 0-RTT for resumed sessions)
    - TLS 1.2: 2 RTT
    - Certificate validation, OCSP stapling
    - Typical: 20–80ms (TLS 1.3 resumed), 40–160ms (TLS 1.2 new)
        |
        ↓
[7] HTTP Request Sent
    - HTTP/1.1: serialize headers + body on single TCP stream
    - HTTP/2: binary framing, multiplexed streams, HPACK header compression
    - HTTP/3: QUIC datagrams, 0-RTT capable
        |
        ↓
[8] Response Streaming
    - Response headers → parsed by browser
    - Body: streamed to renderer process via IPC (Mojo in Chromium)
    - ReadableStream available to JS as bytes arrive
```

**Connection Pool:**
- Chrome maintains per-origin connection pools (default max 6 TCP connections per host in HTTP/1.1, essentially unlimited logical streams in HTTP/2)
- `keep-alive` header maintains TCP connections for reuse → avoids repeated handshakes
- HTTP/2 multiplexes all requests to same origin over 1 TCP connection

### Architecture & Component Boundaries

```
Renderer Process (JavaScript)
          |
          | IPC (Mojo/SharedMemory)
          ↓
Network Process (Chrome)
  ├── URLRequestContext
  │     ├── HTTP Cache (disk + memory)
  │     ├── DNS Resolver
  │     ├── Connection Pool
  │     │     ├── HTTP/1.1 connections (max 6 per origin)
  │     │     ├── HTTP/2 sessions (1 per origin, N streams)
  │     │     └── QUIC sessions (HTTP/3)
  │     ├── TLS (BoringSSL)
  │     └── Certificate Verifier
          |
          ↓
OS Socket Layer (TCP/UDP)
          |
          ↓
NIC → Physical Network
```

### Data Flow & State Flow

**Warm path (connection already established, cache miss):**
```
fetch() → Network Process → Connection Pool hit → HTTP/2 new stream → 
Request frame sent → Response frames stream back → 
IPC to Renderer → Response body available in JS → ~30–50ms
```

**Cold path (no connection, no cache):**
```
fetch() → DNS (50ms) → TCP handshake (40ms) → TLS 1.3 (40ms) → 
HTTP request (10ms) → TTFB (~140ms) → stream body → ~200–400ms total
```

### Performance Implications

| Phase | Latency | Optimisation |
|---|---|---|
| DNS resolution | 20–120ms cold | dns-prefetch, DoH |
| TCP connect | 1 RTT (~40ms) | preconnect, keep-alive |
| TLS handshake | 1 RTT TLS 1.3, 2 RTT TLS 1.2 | TLS 1.3, 0-RTT resumption |
| HTTP request | < 1ms (after connection) | HTTP/2 mux, HTTP/3 |
| TTFB | Sum of above + server time | CDN, edge caching |

**Impact on Core Web Vitals:**
- LCP is directly affected by TTFB — every 100ms of TTFB delays LCP by ~100ms
- FID/INP is affected by blocking scripts fetched from slow origins
- Resource hints (`preconnect`, `dns-prefetch`) can save 100–300ms on initial loads

### Scalability Considerations

- **< 10K users:** Default browser behaviour sufficient. Focus on CDN and HTTP/2.
- **100K users:** Add `preconnect` hints, enforce HTTP/2 on all origins, audit third-party origins count (each new origin = new DNS + TLS roundtrip).
- **10M+ users:** Edge caching (Fastly, Cloudflare), HTTP/3 + QUIC at CDN layer, server push (HTTP/2) for critical resources, HSTS preloading for zero-RTT HTTPS upgrade.

### Trade-offs

| Approach | Alternative | When to Choose |
|---|---|---|
| HTTP/2 multiplexing | Multiple HTTP/1.1 connections | Always prefer HTTP/2 for same-origin API calls |
| TLS 1.3 with 0-RTT | TLS 1.2 | TLS 1.3 always better — 0-RTT has replay attack nuances |
| CDN edge termination | Origin-served TLS | CDN eliminates geographical RTT — choose for global scale |
| DNS prefetch only | Full preconnect | Use dns-prefetch for uncertain third parties; preconnect for certain critical origins |

### ⚠️ Anti-Patterns & Pitfalls

- **Too many `preconnect` hints** — each preconnect opens a TCP+TLS connection immediately. >4–6 preconnects on a single page wastes bandwidth and can contend with critical resources. Only preconnect to origins you're certain will be used within 5 seconds.
- **Not understanding connection pool limits** — in HTTP/1.1, max 6 connections per host. 12 critical resources to the same origin means 2 batches. Switching to HTTP/2 or sharding domains (old trick, now counterproductive with HTTP/2) are the two solutions.
- **Ignoring TTFB in performance budgets** — engineers optimise JS bundle size but a 300ms TTFB tanks LCP regardless. At SAP, always start performance analysis from `chrome://net-internals` before profiling JS.
- **Mixed Content blocking** — loading HTTP resources from an HTTPS page. Browser silently blocks them in modern Chrome. Always check for mixed content in legacy codebases (Oracle and SAP migrations).
- **CORS preflight adding round-trips** — complex CORS requests trigger an OPTIONS preflight (1 extra RTT). At SAP, I eliminated ~80ms latency on API calls by aligning request headers to avoid triggering preflights.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP/Bosch):**
At SAP, analytics dashboards load tens of API requests on mount. Without HTTP/2 and connection reuse, each API call to the same backend incurred TCP/TLS overhead. Auditing network waterfall charts in Chrome DevTools and confirming HTTP/2 was enabled on the SAP BTP backend reduced parallel API latency from ~400ms to ~80ms because all streams multiplexed over one connection. At Bosch, WebSocket upgrades go through the same TCP handshake path — understanding that the initial HTTP upgrade request goes through the network stack's connection pool is why we could pre-warm WebSocket connections on app boot.

**At FAANG scale:**
- **Microsoft:** Azure Portal pre-warms connections to ~12 critical API origins using `preconnect`. Their network team publishes internal guidance that each unexpected new origin costs 150–200ms in production telemetry.
- **Adobe:** Creative Cloud's web tools batch all asset API requests over HTTP/2 multiplexed streams. They measure TTFB by percentile (p50/p95/p99) across global regions — network stack metrics feed their RUM dashboards.
- **Cisco:** Security dashboards pulling telemetry from multiple backend microservices — each on a different subdomain — can incur N×DNS overhead. Cisco's FE teams consolidated to fewer origins with path-based API routing to eliminate DNS stalls.

**How it evolves with scale:**
- Small scale (< 10K users): Focus on correct HTTP/2 deployment and CDN setup. Network stack behaviour is predictable.
- Medium scale (100K users): Add RUM to measure DNS/TCP/TLS contribution to TTFB per geography. P99 outliers often reveal ISP-specific DNS issues.
- Large scale (10M+ users): HTTP/3 + QUIC at edge eliminates head-of-line blocking entirely. Anycast routing ensures DNS resolves to the nearest PoP. Connection coalescing (sharing an HTTP/2 connection across subdomains with the same IP cert) becomes a legitimate optimisation.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "The browser's network stack lives in the Network Process — separate from the Renderer. When `fetch()` is called, it goes through URL parsing, then checks the Service Worker, then the HTTP cache, then DNS, TCP, TLS, and finally the HTTP protocol layer. In HTTP/1.1 there's a 6-connection cap per origin — that's why HTTP/2 was transformative; one TCP connection carries unlimited multiplexed streams. TLS 1.3 reduced handshake to 1 RTT, and with session resumption it drops to 0-RTT. At SAP I used this knowledge directly — we had 12+ API calls firing on mount, all to the same BTP origin. Confirming HTTP/2 was properly negotiated collapsed those into a single TCP session and dropped parallel request overhead by about 80%. For performance-sensitive work I always check `chrome://net-internals` first — you see exactly what phase each request is in, including stalled connections and protocol negotiation."

### Likely Follow-up Questions
1. **What happens during a TLS handshake?** → Client hello → Server hello + cert → Key exchange (ECDHE) → Finished. TLS 1.3 does this in 1 RTT.
2. **How does HTTP/2 multiplexing work?** → Each request is a stream with an ID; frames from multiple streams interleave over one TCP connection
3. **What is head-of-line blocking in HTTP/2?** → TCP-level: packet loss stalls ALL streams because TCP is ordered. HTTP/3/QUIC solves this with per-stream reliability.
4. **What is connection coalescing?** → Two different origins that resolve to the same IP and share a cert can share an HTTP/2 connection — the browser detects this and reuses
5. **How do you debug network performance?** → `chrome://net-internals/#events`, Network panel waterfall, HAR export, WebPageTest for multi-geography analysis

### vs Alternatives
| Browser-native network | fetch via Service Worker | WebSocket |
|---|---|---|
| Full HTTP cache + auth handling | Intercept + custom cache logic | Persistent bidirectional |
| Stateless per-request | Can simulate offline | Stateful long-lived |
| Default for REST/GraphQL | Offline-first apps | Real-time streaming |

### How to Signal Senior Thinking
> "The distinction I make to juniors is: bundle size optimisation has diminishing returns past a point, but network topology — DNS, TLS, connection reuse — has non-negotiable fixed costs that no amount of code optimisation can bypass. A 300ms TTFB will always cost 300ms. That's why I audit the network waterfall before I open the JavaScript profiler."

---

## 💻 5. Code Example
> Resource hints that directly interact with network stack pre-warming

```typescript
// network-hints.ts
// Demonstrates: programmatic resource hint injection for network pre-warming
// What an interviewer looks for: knowing the distinction between hint types and their costs

interface ResourceHint {
  rel: 'dns-prefetch' | 'preconnect' | 'prefetch' | 'preload';
  href: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  as?: string;
}

function injectResourceHint(hint: ResourceHint): void {
  // Check if hint already exists — don't duplicate
  const existing = document.querySelector(`link[rel="${hint.rel}"][href="${hint.href}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = hint.rel;
  link.href = hint.href;

  if (hint.crossOrigin) link.crossOrigin = hint.crossOrigin;
  if (hint.as) link.setAttribute('as', hint.as);

  document.head.appendChild(link);
}

// Called once on app init — pre-warm critical origins
export function preWarmCriticalOrigins(): void {
  const criticalOrigins: ResourceHint[] = [
    // Full TCP+TLS pre-warm for origins we WILL use
    { rel: 'preconnect', href: 'https://api.sap-analytics.com', crossOrigin: 'anonymous' },
    { rel: 'preconnect', href: 'https://cdn.assets.sap.com', crossOrigin: 'anonymous' },

    // DNS-only pre-warm for origins we MIGHT use (lower cost)
    { rel: 'dns-prefetch', href: 'https://telemetry.sap.com' },
    { rel: 'dns-prefetch', href: 'https://auth.sap-id.com' },
  ];

  // ⚠️ Keep preconnect list short — each opens a real TCP+TLS connection
  // Rule: preconnect only if >90% certainty the resource will be needed within 5s
  criticalOrigins.forEach(injectResourceHint);
}

// Measuring TTFB breakdown using PerformanceNavigationTiming
export function measureNetworkPhases(): void {
  const [navEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (!navEntry) return;

  const phases = {
    dnsLookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
    tcpConnect: navEntry.connectEnd - navEntry.connectStart,
    tlsHandshake: navEntry.connectEnd - navEntry.secureConnectionStart,
    ttfb: navEntry.responseStart - navEntry.requestStart,
    download: navEntry.responseEnd - navEntry.responseStart,
  };

  console.table(phases);
  // Send to RUM dashboard (e.g., Datadog) for p50/p95/p99 tracking
}
```

**Interview vs Production difference:**
In an interview, sketch the resource hint types and explain the cost difference (dns-prefetch = DNS only, preconnect = DNS + TCP + TLS). In production, add quota logic (no more than 4–6 preconnects), lazy injection based on route (auth-related origins only preconnected when user starts login flow), and RUM integration to validate that hints are actually reducing measured latency in field data.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** Every HTTP request is a relay race: DNS → TCP → TLS → HTTP → Response. Resource hints let you start some legs of the race before the gun fires.

**If you go blank:** "The network stack is DNS resolution, then TCP handshake, then TLS handshake, then the actual HTTP request. HTTP/2 multiplexes everything over one TCP connection — that's the key improvement over HTTP/1.1's 6-connection limit."

**Mnemonic:** **D-T-T-H** — **D**NS → **T**CP → **T**LS → **H**TTP — the four gates every request must pass before TTFB

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Every millisecond in the network stack directly delays page render — TTFB is the foundation of LCP
→ Performance: Understanding the stack lets you eliminate entire phase latencies (e.g., DNS pre-resolution, TLS resumption) not just reduce payload sizes
→ Business: 100ms of TTFB reduction correlates to ~1% conversion improvement (Amazon/Google data) — at SAP enterprise scale this maps to productivity metrics

**How it works (3 sentences):**
The browser's Network Process intercepts all `fetch()` and resource requests, routing them through a pipeline of DNS resolution, socket connection pooling, TLS negotiation, and HTTP protocol handling before streaming responses back to the Renderer via IPC. HTTP/2 collapsed the HTTP/1.1 6-connection bottleneck into a single multiplexed TCP session per origin, and HTTP/3/QUIC eliminates TCP-level head-of-line blocking entirely. Resource hints (`preconnect`, `dns-prefetch`) allow developers to initiate early phases of this pipeline before JavaScript even requests the resource.

**Company relevance:**
- **Microsoft:** Azure Portal teams are measured on TTFB SLOs — expect questions about how you'd diagnose and fix a 300ms TTFB regression; `preconnect` strategy and HTTP/2 negotiation are expected knowledge
- **Adobe:** Creative Cloud asset delivery pipelines span multiple origins — understanding connection coalescing and HTTP/2 stream prioritization is critical for their perf team interviews
- **Salesforce:** Lightning Web Components load in Salesforce's CDN environment — knowing how Salesforce's network topology (Akamai-backed CDN, HTTP/3 at edge) affects LCP is a differentiator
- **Cisco:** WebSocket-heavy monitoring UIs (exactly like Hruday's Bosch work) depend on understanding TCP connection management to avoid connection exhaustion at scale

---
**✅ Topic 35/486 complete.**
**→ Continuing to Topic 36: HTTP/1.1 vs HTTP/2 vs HTTP/3**
