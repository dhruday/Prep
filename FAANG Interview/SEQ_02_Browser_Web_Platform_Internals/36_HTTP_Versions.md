# 36. HTTP/1.1 vs HTTP/2 vs HTTP/3
**Phase:** Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds. Crisp. Confident. Numbers included where relevant.

The three HTTP versions represent three generations of solving the same fundamental problem: how do you efficiently transfer many resources between client and server? HTTP/1.1 uses text-based framing with head-of-line blocking — one response must finish before the next starts per connection, forcing browsers to open 6 parallel connections per origin as a workaround. HTTP/2 introduced binary framing and multiplexing, collapsing those 6 connections into one and eliminating application-level HOL blocking, which gave us roughly 30–50% improvement in web performance when deployed widely. HTTP/3 replaces TCP entirely with QUIC, a UDP-based protocol, solving TCP's inherent head-of-line blocking problem during packet loss — which is critical on mobile networks where packet loss is common. At SAP, confirming HTTP/2 was active on the BTP gateway was one of the first wins when I drove LCP from 4.2s to 2.3s — all our parallelised API calls collapsed into one multiplexed session.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Each version of HTTP was created to solve specific bottlenecks of its predecessor:

| Version | Year | Core Problem Solved | Transport |
|---|---|---|---|
| HTTP/1.0 | 1996 | Basic request-response | TCP (new per request) |
| HTTP/1.1 | 1997 | Persistent connections, pipelining | TCP (kept-alive) |
| HTTP/2 | 2015 | HOL blocking, header overhead, multiplexing | TCP (1 conn/origin) |
| HTTP/3 | 2022 | TCP HOL blocking on packet loss, handshake RTTs | QUIC (UDP-based) |

### How It Works Internally

#### HTTP/1.1 Internals
- **Text-based protocol**: `GET /path HTTP/1.1\r\nHost: example.com\r\n\r\n`
- **Persistent connections**: `Connection: keep-alive` — one TCP connection reused for multiple sequential requests
- **Pipelining** (theoretical): send multiple requests without waiting for responses. In practice, **never deployed** because intervening proxies don't handle it correctly
- **Head-of-line blocking**: responses must be delivered in the order requests were sent. If resource A is slow, resources B and C wait even though they're ready
- **Browser workaround**: Open 6 TCP connections per origin in parallel → 6 parallel streams
- **Header overhead**: Full headers sent on every request — `Cookie`, `User-Agent`, `Accept` repeated in every request with no compression

```
Connection 1: GET /main.js → [wait] → response
Connection 2: GET /style.css → [wait] → response
Connection 3: GET /logo.png → [wait] → response
...max 6 connections...
Connection 7: [stalled until one of 1-6 finishes]
```

#### HTTP/2 Internals

**Binary Framing Layer:**
- Eliminates text parsing — everything is binary frames (DATA, HEADERS, SETTINGS, PRIORITY, PUSH_PROMISE, RST_STREAM, GOAWAY)
- Each request is a **stream** identified by an integer stream ID (odd IDs = client-initiated)
- Frames from different streams can **interleave** over the same TCP connection

**Multiplexing:**
```
One TCP connection → N concurrent streams
Client: [Stream 1: GET /api/user] [Stream 3: GET /api/dashboard] [Stream 5: GET /api/nav]
Server: [Stream 1 DATA frames] [Stream 3 DATA frames] interleaved arbitrarily
```

**HPACK Header Compression:**
- Maintains a shared header table (static + dynamic) between client and server
- Common headers (`method`, `authority`, `path`) encoded as single-byte indices
- Repeated headers (cookies!) are not re-sent — just the index is transmitted
- Typical 70–80% reduction in header size

**Server Push:**
- Server proactively sends resources client hasn't requested yet
- `PUSH_PROMISE` frame announces what's coming
- In practice: unreliable (cache invalidation is hard), largely deprecated in favor of `103 Early Hints`

**HTTP/2 Limitation — TCP Head-of-Line Blocking:**
- HTTP/2 solves application-level HOL blocking (stream A doesn't block stream B)
- But NOT TCP-level HOL blocking: if one TCP packet is lost, TCP retransmit stalls ALL streams until that packet is redelivered
- On lossy networks (mobile: 1–5% packet loss), HTTP/2 can actually perform worse than HTTP/1.1's 6 independent TCP connections

#### HTTP/3 Internals

**Built on QUIC (UDP-based):**
- QUIC is a multiplexed, reliable transport protocol built over UDP
- Implements its own congestion control, flow control, and reliability per-stream
- Packet loss in stream A does NOT stall stream B — each stream has independent reliability

**0-RTT Connection Establishment:**
- The TLS 1.3 handshake is integrated into the QUIC handshake
- First connection: 1 RTT (QUIC + TLS in one round trip)
- Resumed connection: **0-RTT** — client can send data with the first packet using cached session keys
- Compare: HTTP/2 (TCP + TLS 1.3) = 2 RTTs for new connection

```
HTTP/2 new connection:
RTT 1: TCP SYN → SYN-ACK
RTT 2: TLS ClientHello → ServerHello + cert + finished
RTT 3: HTTP request
= 3 RTTs before first byte

HTTP/3 new connection:
RTT 1: QUIC Initial (includes TLS 1.3 ClientHello) → QUIC Handshake + HTTP request
= 1 RTT before first byte

HTTP/3 resumed connection:
RTT 0: QUIC 0-RTT data (first packet includes HTTP request)
= 0 RTTs before first byte
```

**Connection Migration:**
- QUIC connections are identified by a **connection ID**, not IP:port tuple
- If a mobile device switches from WiFi to 4G (IP changes), the QUIC connection continues without interruption
- HTTP/2 over TCP: IP change = TCP teardown + full new handshake

### Architecture & Component Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    Application (HTTP semantics)               │
│           Headers, Methods, Status Codes — SAME              │
├──────────────────────────────────┬──────────────────────────-│
│ HTTP/1.1        │ HTTP/2          │ HTTP/3                    │
│ Text framing    │ Binary framing  │ Binary framing (QPACK)    │
│ Sequential      │ Multiplexed     │ Multiplexed               │
│ HPACK headers   │ HPACK headers   │ QPACK headers             │
├─────────────────┼─────────────────┼──────────────────────────┤
│ TCP             │ TCP             │ QUIC (over UDP)           │
│ Ordered         │ Ordered         │ Per-stream reliability    │
│ HOL blocking    │ TCP HOL blocks  │ No HOL blocking           │
├─────────────────┴─────────────────┴──────────────────────────┤
│                         IP / Network                          │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow & State Flow

**HTTP/2 frame-level data flow:**
```
Browser → Server:
HEADERS frame (stream 1): { :method: GET, :path: /api/data, :authority: api.sap.com }
HEADERS frame (stream 3): { :method: POST, :path: /api/log }
DATA frame (stream 3): { body bytes }

Server → Browser:
HEADERS frame (stream 1): { :status: 200, content-type: application/json }
DATA frame (stream 1): { response body chunk 1 }
HEADERS frame (stream 3): { :status: 204 }
DATA frame (stream 1): { response body chunk 2 }   ← interleaved with stream 3!
END_STREAM flag: stream 1 closed
```

### Performance Implications

| Metric | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Connections per origin | 6 TCP | 1 TCP | 1 QUIC |
| Handshake RTTs (new) | 2+ | 2 | 1 |
| Handshake RTTs (resumed) | 1 | 1 | 0 |
| Header size | Full + no compression | HPACK compressed | QPACK compressed |
| HOL blocking (app level) | Yes | No | No |
| HOL blocking (transport) | Per-connection | TCP-level | No |
| Packet loss performance | N connections buffered | Degrades | Resilient |
| Mobile connection migration | Full reconnect | Full reconnect | Seamless |

### Scalability Considerations

- **< 10K users:** HTTP/1.1 is workable but HTTP/2 should be standard — no reason not to enable it at CDN layer
- **100K users:** HTTP/2 at edge CDN is the minimum bar. HTTP/3 adoption at CDN (Cloudflare, Fastly) — test Alt-Svc header negotiation
- **10M+ users:** HTTP/3 + QUIC at CDN edge is the target. Connection migration eliminates reconnect storms during mobile handoffs. 0-RTT resumption reduces P99 latency for returning users significantly.

### Trade-offs

| HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|
| Proxies/firewalls love it | May be blocked by UDP-hostile firewalls | UDP often blocked by enterprise firewalls |
| Easy to debug (text) | Binary — use DevTools | Binary — less tooling maturity |
| Domain sharding still useful | Domain sharding actively harmful | Domain sharding harmful |
| No header compression | HPACK | QPACK (handles HOL in header compression) |

### ⚠️ Anti-Patterns & Pitfalls

- **Domain sharding with HTTP/2** — opposite of what you want. HTTP/2 is designed for one connection per origin; splitting to `cdn1.example.com` and `cdn2.example.com` creates 2 TCP connections with 2 handshakes instead of 1. Classic HTTP/1.1 optimisation that actively hurts HTTP/2 performance.
- **Too many small files vs few large files** — HTTP/1.1 era bundling wisdom. With HTTP/2 multiplexing, many small files are fine because streams are free. But overly granular unbundling still has per-request overhead; balance is best.
- **Not verifying HTTP/2 is actually negotiated** — just because your server supports it doesn't mean the CDN or load balancer is forwarding with HTTP/2. Check `chrome://net-internals/#http2` to verify active sessions.
- **Assuming HTTP/3 is always faster** — on low-latency wired connections, HTTP/3 overhead from QUIC packet processing can slightly underperform HTTP/2. HTTP/3 wins primarily on high-latency, lossy connections (mobile, satellite).
- **Server Push cache invalidation problems** — HTTP/2 server push sends resources the server thinks the client needs. If the client already has those in cache, push wastes bandwidth. This is why 103 Early Hints replaced push as the recommended approach.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP BTP gateway was serving HTTP/2 but the API gateway in front of it was doing HTTP/1.1 to origin. All 12 dashboard API calls still serialised into 6+6 batches. Auditing the actual protocol via Chrome DevTools → Network panel → Protocol column revealed this. Once end-to-end HTTP/2 was confirmed, all 12 calls multiplexed into a single session — parallel completion time dropped from ~380ms to ~95ms. This was a direct contributor to the 45% LCP improvement.

**At FAANG scale:**
- **Microsoft:** Edge browser's own network stack team ships HTTP/3 support — they measure the impact of QUIC adoption per percentile across Bing search result pages and show measurable P95 improvement on mobile
- **Adobe:** Creative Cloud CDN (Akamai) serves all assets over HTTP/3 to supported browsers. Adobe Creative Cloud web app switched from domain-sharded CDN to single-origin HTTP/2 and saw 20% reduction in DNS overhead
- **Cloudflare (proxy for many FAANG):** 25% of internet traffic now over HTTP/3. Connection migration means mobile workers switching between WiFi and cellular don't experience video call interruptions

**How it evolves with scale:**
- Small scale (< 10K users): Enable HTTP/2 on your nginx/Apache — one config line. HTTP/3 can wait.
- Medium scale (100K users): Use a CDN (Cloudflare, Fastly) that auto-negotiates HTTP/3. Monitor `Alt-Svc` header delivery.
- Large scale (10M+ users): HTTP/3 + QUIC is the target for global P99 TTFB SLOs. 0-RTT resumption for authenticated sessions (with careful replay attack mitigation) reduces perceived latency for returning users.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "HTTP/1.1 uses text framing and sequential responses per connection — browsers workaround the 6-connection limit by opening 6 parallel TCP sockets per origin, which means 6×(DNS+TCP+TLS) overhead. HTTP/2 moved to binary framing and true request multiplexing over a single TCP connection, which eliminated the application-level head-of-line blocking problem and gave us HPACK header compression — typically 70% header size reduction. But HTTP/2 still has TCP-level head-of-line blocking: one lost packet stalls all streams. HTTP/3 solves this by replacing TCP with QUIC over UDP — each stream has independent reliability, so packet loss in one stream doesn't affect others. QUIC also integrates TLS 1.3 into the handshake, reducing new connection cost to 1 RTT and resumed connections to 0-RTT. At SAP, unlocking HTTP/2 multiplexing across 12 concurrent API calls was one of the first network optimisations I made — it dropped our parallel fetch time from ~380ms to ~95ms."

### Likely Follow-up Questions
1. **What is HPACK and why does it matter?** → Header compression using a shared static+dynamic table; eliminates repeated cookie/user-agent overhead on every request
2. **Why does HTTP/2 still have HOL blocking?** → TCP guarantees ordered delivery — one lost packet prevents ALL data behind it from being delivered, even from other streams
3. **What is 0-RTT in HTTP/3 and what's the risk?** → Client sends data with the first QUIC packet using cached session keys — but 0-RTT is vulnerable to replay attacks; should only be used for idempotent GETs
4. **When would you NOT use HTTP/3?** → Enterprise firewalls often block UDP; deep packet inspection tools don't support QUIC; in those environments, HTTP/2 degrades gracefully but HTTP/3 silently falls back
5. **What replaced HTTP/2 server push?** → `103 Early Hints` — server sends hints during processing time, browser preloads without the cache-invalidation problems of push

### vs Alternatives
| HTTP/2 | HTTP/3 | When to choose |
|---|---|---|
| TCP-based, universally supported | UDP-based, may be firewall-blocked | H2 for enterprise/intranet; H3 for public consumer |
| HOL blocking under packet loss | No HOL blocking | H3 wins on mobile/lossy networks |
| Mature tooling (Wireshark etc.) | Less tooling maturity | H2 for debugging-heavy environments |

### How to Signal Senior Thinking
> "The nuance I always highlight is that HTTP/2 and HTTP/3 solve different levels of the same problem. HTTP/2 solved the application protocol being inefficient. HTTP/3 solved the transport layer being ordered. If you're only seeing packet loss on your network, HTTP/2 can actually be slower than HTTP/1.1 on multiple connections because all 1 multiplexed stream blocks while 6 independent TCP streams continue 5 of 6 on loss. That's the engineering trade-off the interviewer wants to hear."

---

## 💻 5. Code Example
> Detecting and reporting the HTTP version in use for RUM telemetry

```typescript
// http-version-monitor.ts
// Demonstrates: reading protocol from PerformanceResourceTiming for RUM
// What an interviewer looks for: awareness of Resource Timing API, nextHopProtocol

interface ResourceProtocolSummary {
  url: string;
  protocol: string; // 'h2', 'h3', 'http/1.1', 'h3-29', etc.
  ttfb: number;
  transferSize: number;
}

export function getResourceProtocols(): ResourceProtocolSummary[] {
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  return entries.map((entry) => ({
    url: entry.name,
    protocol: entry.nextHopProtocol, // 'h2', 'h3', 'http/1.1', '' for cached
    ttfb: entry.responseStart - entry.requestStart,
    transferSize: entry.transferSize, // 0 for cached
  }));
}

// Detect if any critical resource is served over HTTP/1.1 (performance warning)
export function auditProtocolUsage(): void {
  const resources = getResourceProtocols();

  const http1Resources = resources.filter(
    (r) => r.protocol === 'http/1.1' && r.transferSize > 0
  );

  if (http1Resources.length > 0) {
    console.warn(
      `[Perf] ${http1Resources.length} resources served over HTTP/1.1 — consider HTTP/2 upgrade:`,
      http1Resources.map((r) => r.url)
    );
  }

  const h3Resources = resources.filter((r) => r.protocol.startsWith('h3'));
  console.log(`[Perf] ${h3Resources.length}/${resources.length} resources served over HTTP/3`);
}

// Check navigation entry - is the main document on H2/H3?
export function checkMainDocumentProtocol(): string {
  const [navEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  const protocol = navEntry?.nextHopProtocol ?? 'unknown';

  if (protocol === 'http/1.1') {
    console.error('[Critical] Main document served over HTTP/1.1 — all subresource requests stall');
  }

  return protocol;
}
```

**Interview vs Production difference:**
In an interview, just explain `nextHopProtocol` and why it matters. In production, this feeds into a RUM dashboard (Datadog/Sentry) where you alert on HTTP/1.1 regressions (e.g., CDN misconfiguration silently falling back), track HTTP/3 adoption percentage across your user base, and correlate protocol version with TTFB and P95 LCP per percentile.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** HTTP versions are about eliminating waiting. 1.1 waits per response. HTTP/2 never waits on the same origin. HTTP/3 never waits even when packets drop.

**If you go blank:** "HTTP/1.1 is sequential text, HTTP/2 is multiplexed binary over TCP, HTTP/3 is multiplexed binary over QUIC/UDP — each version eliminates a different kind of queuing delay."

**Mnemonic:** **"1.1 queues, 2 muxes, 3 flies"** — HTTP/1.1 queues responses, HTTP/2 multiplexes streams, HTTP/3 flies over UDP without packet-loss stalls

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Protocol version directly determines TTFB and concurrent resource loading speed — visible in all Core Web Vitals
→ Performance: HTTP/2 saves 100–300ms per page load through connection consolidation alone; HTTP/3 shaves additional 40–80ms on mobile through 0-RTT and no HOL blocking
→ Business: Correct HTTP version choice at CDN layer is a zero-code-change performance win — often the highest ROI optimisation available

**How it works (3 sentences):**
HTTP/1.1 uses plain text framing over keep-alive TCP connections but suffers from head-of-line blocking — one slow response stalls all others on that connection, forcing browsers to open 6 parallel connections per origin. HTTP/2 introduces binary framing and stream multiplexing so thousands of logical requests share one TCP connection with no application-level blocking, plus HPACK compression cuts header overhead by ~70%. HTTP/3 replaces TCP with QUIC over UDP, giving each stream independent reliability so packet loss in one stream never stalls others, while integrating TLS into the handshake for 0-RTT connection setup.

**Company relevance:**
- **Microsoft:** Bing and Edge ship HTTP/3 support — interviewers expect you to know why QUIC's connection migration matters for mobile users and how 0-RTT replay risks are mitigated
- **Adobe:** Creative Cloud asset delivery at scale requires HTTP/2 multiplexing and HTTP/3 at CDN edge — expect questions about HPACK and why domain sharding is now harmful
- **Salesforce:** Lightning platform serves enterprise users on varied network conditions — HTTP/3's resilience on lossy mobile networks directly impacts their mobile CRM experience
- **Cisco:** Network infrastructure company — expect deep questions on QUIC packet framing, connection IDs, and how QUIC fits into their SD-WAN and network monitoring product context

---
**✅ Topic 36/486 complete.**
**→ Continuing to Topic 37: Connection Reuse & Head-of-Line Blocking**
