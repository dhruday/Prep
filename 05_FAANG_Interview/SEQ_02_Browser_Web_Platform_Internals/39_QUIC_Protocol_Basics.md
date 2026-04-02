# 39. QUIC Protocol Basics
**Phase:** Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft, Cisco, Adobe

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds. Crisp. Confident. Numbers included where relevant.

QUIC is a multiplexed, transport-layer protocol built over UDP that was originally designed by Google and standardised by the IETF as RFC 9000. It's the foundation of HTTP/3 and solves the two fundamental problems that TCP could never solve: head-of-line blocking under packet loss, and the multi-round-trip connection setup cost. QUIC integrates TLS 1.3 into its handshake, achieving first-connection setup in 1 RTT instead of TCP's 2–3 RTTs. For resumed connections it supports 0-RTT, sending application data with the very first packet. The other key capability is connection migration: QUIC connections are identified by a connection ID, not an IP:port tuple, so mobile users switching from WiFi to 4G don't experience a reconnect. At Cisco, where real-time network monitoring dashboards must maintain event streams reliably on mobile networks, QUIC's stream independence and connection migration are directly architecture-relevant.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The TCP problem QUIC was designed to solve:**

TCP was designed in 1974. Its core guarantees:
1. **In-order, reliable delivery** — every byte arrives in sequence
2. **Congestion control** — adapts to network capacity
3. **Flow control** — prevents overwhelming receiver

These guarantees are excellent for a single byte stream. But they become a liability when you multiplex multiple logical streams:
- Packet loss on any byte → TCP halts delivery of ALL subsequent bytes until retransmit
- In HTTP/2, this means packet loss on one API call halts responses for ALL simultaneous API calls
- TLS 1.3 is built on top of TCP, so the TCP + TLS handshake requires 2+ RTTs before any data flows

**QUIC solves this by:**
1. Building its own reliability mechanism on top of UDP — **per-stream reliability**
2. Integrating TLS 1.3 cryptography into the QUIC handshake itself — **1 RTT new, 0-RTT resumed**
3. Identifying connections by **connection ID** instead of IP:port — enabling connection migration
4. Implementing its own congestion control algorithms — more modern than TCP's legacy algorithms

### How It Works Internally

#### QUIC Packet Structure

```
QUIC Packet (simplified):
┌────────────────────────────────────────────────────────────┐
│ Header (encrypted):                                         │
│   Connection ID (8 bytes) ← identifies connection, not IP  │
│   Packet Number           ← for loss detection/ACK         │
│   Packet Type             ← Initial / Handshake / 1-RTT    │
├────────────────────────────────────────────────────────────┤
│ Payload (TLS encrypted):                                    │
│   STREAM frame (stream_id=3, offset=0, data=[...bytes])    │
│   STREAM frame (stream_id=7, offset=0, data=[...bytes])    │
│   ACK frame (acknowledging received packets)               │
│   PADDING frame                                             │
└────────────────────────────────────────────────────────────┘
```

Multiple STREAM frames from different streams can coexist in a single QUIC packet — true interleaving.

#### QUIC Handshake (New Connection — 1 RTT)

```
Client                                      Server
  │                                              │
  │── Initial Packet ──────────────────────────>│ t=0ms
  │   (CRYPTO frame: TLS 1.3 ClientHello)       │
  │   (QUIC transport params)                   │
  │                                              │
  │<─ Initial Packet + Handshake Packet ────────│ t=RTT
  │   (CRYPTO: TLS 1.3 ServerHello)             │
  │   (CRYPTO: Certificate, CertificateVerify)  │
  │   (CRYPTO: Finished)                        │
  │                                              │
  │── Handshake Packet ─────────────────────────>│
  │   (CRYPTO: TLS 1.3 Finished)                │
  │   [First application data can go here!]     │
  │                                              │
  │<─ 1-RTT Packets (application data) ─────────│ t=2RTT
  │                                              │

Total: 1 RTT to exchange keys, application data on 2nd packet
vs TCP+TLS: 1 RTT TCP handshake + 1 RTT TLS = 2 RTTs before data
```

#### QUIC 0-RTT (Resumed Connection)

```
Client (has session ticket from previous connection)
  │                                              │
  │── Initial + 0-RTT Packet ──────────────────>│ t=0ms
  │   (CRYPTO: ClientHello + early data flag)   │
  │   (0-RTT application data: HTTP request!)   │
  │                                              │
  │<─ Initial + Handshake + 1-RTT Packets ──────│ t=RTT
  │   (Server accepts 0-RTT or rejects)         │
  │   (Server response data)                    │

Total: 0 RTTs for data — response arrives at 1 RTT
⚠️ 0-RTT is vulnerable to replay attacks — only use for idempotent (GET) requests
```

#### Connection Migration

```
Mobile user on WiFi:
QUIC Connection ID: 0xABCD1234
Client IP: 192.168.1.100:4444  →  Server: 93.184.216.34:443

User moves → IP changes to: 10.0.0.50:5555 (4G)

TCP behaviour: Connection closed. Full DNS+TCP+TLS reconnect required.

QUIC behaviour:
Client sends QUIC packet with Connection ID: 0xABCD1234 from new IP
Server sees new source address but recognizes Connection ID
Server probes: sends path validation to new address
Client responds → connection migrated

Zero interruption. Ongoing HTTP/3 streams continue.
```

#### Stream Independence Under Packet Loss

```
QUIC state with 3 active streams:
Stream 1: GET /api/user-data   (large response, 10 packets)
Stream 3: GET /api/nav         (small, 1 packet)  
Stream 5: GET /api/dashboard   (medium, 5 packets)

Packet 14 (Stream 1, packet 3 of 10) LOST:

QUIC behavior:
Stream 1: offset 2 → 3 gap detected → NACK sent → requests retransmit
           Stream 1 delivers packets 1, 2, then waits for 3
Stream 3: Independent stream — delivers its 1 packet ✓ COMPLETE
Stream 5: Independent stream — delivers all 5 packets ✓ COMPLETE

Only Stream 1 is stalled. Streams 3 and 5 complete normally.

Compare with HTTP/2 over TCP:
All three streams share one TCP byte stream
Lost TCP segment → all 3 streams stall → all 3 responses delayed
```

#### QUIC Congestion Control

QUIC implements its own congestion control, not using the OS TCP stack:
- **NewReno** (default in many implementations) — same algorithm as TCP NewReno
- **BBR (Bottleneck Bandwidth and RTT)** — Google's congestion algorithm, measures real bottleneck bandwidth rather than inferring from loss; significantly better on lossy mobile networks
- Because QUIC is in user space, congestion algorithms can be upgraded without OS kernel updates
- This is a key advantage: TCP's congestion algorithm is baked into the OS kernel and changes slowly; QUIC's is in the application layer / library

### Architecture & Component Boundaries

```
Application (Browser JS)
       ↕ Fetch API
Network Process (Chromium)
       ↕ QUIC Layer (user-space stack, BoringSSL)
         ├── Connection Manager (tracks Connection IDs)
         ├── Stream Manager (independent per-stream buffers)
         ├── TLS 1.3 (integrated, not separate)
         ├── Congestion Control (BBR / NewReno)
         └── Loss Detection & ACK Manager
       ↕ UDP socket (OS)
       ↕ IP / Network
```

QUIC bypasses the OS TCP stack entirely. This is why QUIC can run anywhere UDP is not blocked, and why its congestion control can be updated without OS patches.

### Data Flow & State Flow

```
QUIC stream lifecycle:
READY → SEND (data sent) → DATA SENT (all data, waiting ACK)
     → DATA RECVD (ACK received) → closed

Or: → RESET SENT (error) → RESET RECVD → closed
```

### Performance Implications

| Metric | TCP+TLS 1.3 | QUIC |
|---|---|---|
| New connection RTTs | 2 (1 TCP + 1 TLS) | 1 |
| Resumed connection RTTs | 1 | 0 |
| Packet loss impact | All streams stall | Only affected stream stalls |
| Mobile IP change | Full reconnect | Connection migrates seamlessly |
| Packet amplification | None (TCP prevents) | QUIC has anti-amplification measures |
| Firewall penetration | Excellent (all firewalls allow TCP) | UDP blocked by ~3-5% enterprise firewalls |

### Scalability Considerations

- **< 10K users:** HTTP/3 via CDN is sufficient — Cloudflare/Fastly handle QUIC transparently
- **100K users:** Monitor Alt-Svc upgrade success rate — what percentage of users actually connect via QUIC vs falling back to H2 (firewall blocking)
- **10M+ users:** BBR congestion control shows significant advantages over lossy satellite/rural networks. Connection migration reduces mobile reconnect storms at load (e.g., users entering tunnels, changing cells) — measurable as reduction in reconnect errors in RUM

### Trade-offs

| QUIC / HTTP/3 | TCP / HTTP/2 | When to choose QUIC |
|---|---|---|
| 0-RTT resumption | 1-RTT minimum | Mobile/recurring sessions |
| UDP — may be blocked | All firewalls allow TCP | Consumer internet vs enterprise intranet |
| Per-stream loss isolation | TCP HOL blocking | Lossy mobile networks |
| User-space stack (upgradeable) | Kernel TCP stack (stable) | Need congestion algorithm control |

### ⚠️ Anti-Patterns & Pitfalls

- **Using 0-RTT for non-idempotent requests** — 0-RTT data can be replayed by an attacker. The server cannot distinguish a legitimate first request from a replayed one. Only use 0-RTT for GET (idempotent) requests; never for POST/PUT/DELETE with side effects.
- **Assuming QUIC is universally available** — UDP port 443 is blocked by many enterprise firewalls, routers, and network middleboxes. Always implement `Alt-Svc` graceful fallback to HTTP/2. Never assume 100% QUIC uptake.
- **Not implementing QUIC on both client and server** — CDN must support HTTP/3 *and* the browser must support it (~95% modern browsers do). If your custom proxy or API gateway between CDN and origin speaks HTTP/1.1, QUIC benefits are only CDN-to-browser, not end-to-end.
- **Conflating QUIC and UDP security** — QUIC encrypts its entire payload (including connection ID in some versions). Unlike raw UDP, QUIC provides authenticated encryption. Don't worry about QUIC data exposure, but do audit for amplification attack vectors on server-side QUIC implementations.
- **Ignoring QUIC's higher CPU overhead** — QUIC is implemented in user space and encrypts + authenticates every packet individually. On high-throughput servers, QUIC can use 2–3x more CPU than HTTP/2 per byte. For batch API servers vs real-time event streams, the trade-off is different.

---

## 🏭 3. Real-World Examples

**At Hruday's level (Bosch/SAP):**
At Bosch, WebSocket-over-TCP industrial monitoring dashboards faced an intermittent issue: mobile engineers checking dashboards on tablets frequently saw 2–3 second reconnect stalls when moving between building floors (handoff between WiFi access points, each with different DHCP allocation). If that architecture were rebuilt today with WebTransport over QUIC (QUIC's sibling for bidirectional streaming), connection migration would eliminate those reconnect events. At SAP BTP, once the edge layer supports HTTP/3, all asset and API calls benefit from 0-RTT resumption for returning authenticated users.

**At FAANG scale:**
- **Google:** QUIC was invented at Google. Used in production for YouTube video streaming (eliminates rebuffering stalls from packet loss on mobile), Google Search (0-RTT on subsequent requests eliminates cold-start latency for repeat visitors), Gmail (persistent stream for push notifications)
- **Microsoft:** Azure CDN and Cloudfront/Akamai partnerships all serve HTTP/3 to Azure Portal. Bing uses 0-RTT for search results — returning users experience sub-50ms TTFB
- **Cloudflare:** Terminating ~25% of internet HTTP/3 connections. Their NGINX-QUIC implementation shows that BBR congestion control on QUIC outperforms TCP cubic by 15–25% on P95 latency under load

**How it evolves with scale:**
- Small scale (< 10K users): Add `Alt-Svc: h3=":443"` header to advertise HTTP/3 support. CDN does this for you.
- Medium scale (100K users): Measure QUIC adoption rate in RUM via `nextHopProtocol`. Monitor fallback rate. A/B test QUIC impact on LCP.
- Large scale (10M+ users): QUIC connection migration is a first-class reliability concern — design reconnect fallback logic assuming QUIC fails for 3–5% of enterprise users (UDP blocked), treat HTTP/2 as the baseline, QUIC as enhancement.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "QUIC is a transport protocol built over UDP that solves the two remaining problems TCP has for modern web: head-of-line blocking under packet loss and the multi-RTT connection setup. It integrates TLS 1.3 into its own handshake so a new QUIC connection takes 1 RTT instead of TCP's 2, and resumed connections support 0-RTT where request data travels with the first packet. Each QUIC stream has independent reliability — if packet loss affects stream 1, streams 3 and 5 continue delivering normally. This is fundamentally impossible in HTTP/2 over TCP because TCP guarantees ordered delivery of the entire byte stream. The other key capability is connection migration: QUIC identifies connections by connection ID, not IP:port, so a mobile device switching from WiFi to 4G continues the same QUIC session without reconnection. The practical trade-off is that UDP is blocked by around 3–5% of enterprise firewalls, so you always implement Alt-Svc fallback to HTTP/2 and treat QUIC as an enhancement, not a dependency. At Cisco-style monitoring UIs, QUIC's stream independence is genuinely architecturally meaningful — a slow device telemetry stream doesn't block alert notifications from faster devices."

### Likely Follow-up Questions
1. **Why is 0-RTT vulnerable to replay attacks?** → The server can't distinguish the first genuine request from an attacker replaying the captured 0-RTT packet. Only send idempotent GETs in 0-RTT.
2. **How does QUIC handle congestion without TCP?** → QUIC implements its own congestion control in user space (BBR or NewReno); this means it can be updated without OS kernel patches
3. **What are QUIC connection IDs?** → 8-byte identifiers sent in every packet header that the server uses to look up connection state; not bound to IP:port so connections survive IP changes
4. **What is Alt-Svc?** → HTTP response header advertising alternative services — `Alt-Svc: h3=":443"; ma=86400` tells the browser to try HTTP/3 on port 443 for subsequent requests; cached for `ma` seconds
5. **What is WebTransport?** → A new WHATWG API that exposes QUIC streams and datagrams directly to JavaScript — replaces WebSocket for bidirectional low-latency communication; uses QUIC natively

### vs Alternatives
| QUIC | TCP+TLS 1.3 | WebSocket (over QUIC) |
|---|---|---|
| UDP-based, may be blocked | Universal firewall support | HTTP upgrade, runs on TCP or QUIC |
| Connection migration | Reconnect on IP change | Reconnect on IP change (TCP) |
| 0-RTT resumption | 1-RTT minimum | No native 0-RTT |
| Per-stream reliability | Single ordered stream | Single ordered stream |

### How to Signal Senior Thinking
> "The architectural insight I emphasise is that QUIC moves the transport reliability layer from the kernel (TCP) to user space. That single decision unlocks everything: faster iteration on congestion algorithms, connection ID-based routing, integrated encryption. When I evaluate a system architecture and see real-time event streaming to mobile clients, QUIC via HTTP/3 or WebTransport is the answered question to 'how do you handle mobile network handoffs reliably?' The fallback planning is equally important — your architecture must degrade to HTTP/2 for the 3–5% of enterprise clients behind strict UDP firewalls."

---

## 💻 5. Code Example
> Detecting QUIC/HTTP3 usage and implementing Alt-Svc header in Express

```typescript
// quic-detection.ts — client side: detecting HTTP/3 usage
// quic-server.ts — server side: advertising HTTP/3 support

// ── CLIENT SIDE ──────────────────────────────────────────────────────────────

interface QuicUsageReport {
  h3Resources: number;
  h2Resources: number;
  h1Resources: number;
  h3Percentage: number;
  quicTTFBSavingsEstimate: number; // rough ms saved vs h2
}

export function analyseQuicUsage(): QuicUsageReport {
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  let h3 = 0, h2 = 0, h1 = 0;

  for (const entry of entries) {
    if (entry.nextHopProtocol.startsWith('h3')) h3++;
    else if (entry.nextHopProtocol === 'h2') h2++;
    else if (entry.nextHopProtocol === 'http/1.1') h1++;
  }

  const total = h3 + h2 + h1;

  return {
    h3Resources: h3,
    h2Resources: h2,
    h1Resources: h1,
    h3Percentage: total > 0 ? Math.round((h3 / total) * 100) : 0,
    // Rough estimate: 0-RTT saves ~40ms for resumed connections; 1-RTT saves ~40ms vs 2-RTT TCP
    quicTTFBSavingsEstimate: h3 * 40,
  };
}

// Detect if QUIC is being blocked (fallback to H2)
export function isQuicBlocked(): boolean {
  const [navEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  // Navigation is on h2 BUT browser has tried h3 and supports it → likely blocked
  if (navEntry?.nextHopProtocol === 'h2') {
    // Check if Alt-Svc was advertised (soft signal)
    // In practice, you'd check via a server-side telemetry endpoint
    return true; // simplified
  }
  return false;
}

// ── SERVER SIDE (Express) ─────────────────────────────────────────────────────

import express, { Request, Response, NextFunction } from 'express';

const app = express();

// Advertise HTTP/3 support via Alt-Svc header
// Browser will try HTTP/3 on the next request to this origin
app.use((_req: Request, res: Response, next: NextFunction) => {
  // ma = max-age in seconds (how long browser caches this hint)
  res.set('Alt-Svc', 'h3=":443"; ma=86400, h3-29=":443"; ma=86400');
  next();
});

// Example: block 0-RTT for non-safe methods (POST, PUT, DELETE)
// Real QUIC servers handle this via Early-Data header
app.use((req: Request, res: Response, next: NextFunction) => {
  const isEarlyData = req.headers['early-data'] === '1';
  const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);

  if (isEarlyData && !isSafeMethod) {
    // Reject 0-RTT for non-idempotent requests
    res.status(425).send('Too Early — 0-RTT not supported for mutations');
    return;
  }

  next();
});

export { app };
```

**Interview vs Production difference:**
In an interview, explain Alt-Svc and the 0-RTT replay risk — these two points prove deep understanding. In production, add: QUIC adoption tracking in RUM per user segment (enterprise vs consumer), 425 Too Early handling on the client (retry logic), A/B QUIC on/off testing to measure real P95 LCP improvement, and monitoring QUIC stream error rates to detect server-side QUIC implementation bugs.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** QUIC is TCP rebuilt from scratch on top of UDP — same reliability guarantees, but per-stream instead of per-connection, plus TLS built in, plus connection ID-based routing.

**If you go blank:** "QUIC solves TCP's head-of-line blocking by giving each stream independent reliability over UDP. It integrates TLS so new connections take 1 RTT, resumed connections take 0-RTT. Connections survive IP changes because they use connection IDs, not IP:port."

**Mnemonic:** **QUIC = Quick + UDP + Integrated Crypto** — faster than TCP because it integrates TLS and moves to UDP for stream independence

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: 0-RTT resumption and stream independence directly improve perceived performance on mobile — fewer stalls, faster reconnects
→ Performance: 1 RTT vs 2 RTT new connections; 0 RTT vs 1 RTT resumed; packet loss affects only 1 stream not all — each measurable in P95/P99 LCP
→ Business: 25% of internet traffic is already HTTP/3. Not understanding QUIC at a FAANG interview for 2026 is like not knowing TCP in 2010.

**How it works (3 sentences):**
QUIC is a multiplexed, reliable transport protocol built over UDP that integrates TLS 1.3 cryptography into its handshake, achieving new connections in 1 RTT and resumed connections in 0 RTT. Each QUIC stream has independent loss detection and retransmit so packet loss in one stream never stalls others — eliminating TCP's inherent head-of-line blocking for HTTP/2 multiplexed streams. Connections are identified by connection ID rather than IP:port, enabling seamless migration across network changes without reconnection.

**Company relevance:**
- **Microsoft:** Edge browser ships QUIC; Bing uses 0-RTT for returning searchers; expect questions about QUIC's 0-RTT replay risk mitigation and Alt-Svc deployment strategy
- **Adobe:** Creative Cloud CDN (Akamai) serves HTTP/3 — understanding QUIC stream priorities helps explain why large PSD downloads don't block other API calls during Photoshop Web load
- **Salesforce:** Mobile Salesforce CRM app users on cellular networks benefit from QUIC connection migration; interviewers may ask how you'd ensure graceful fallback for enterprise customers with UDP-blocking firewalls
- **Cisco:** Deep networking expertise expected — Cisco interviewers may go into QUIC packet structure, connection ID migration mechanics, and why QUIC's BBR congestion control outperforms TCP CUBIC on WAN links

---
**✅ Topic 39/486 complete.**
**→ Continuing to Topic 40: Web Workers — Use Cases, Limitations, Communication**
