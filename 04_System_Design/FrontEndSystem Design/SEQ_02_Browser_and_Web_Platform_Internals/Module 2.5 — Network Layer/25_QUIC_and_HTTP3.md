# Topic 32: QUIC Protocol & HTTP/3

---

## 1. High-Level Explanation

**QUIC** (Quick UDP Internet Connections) is a transport protocol developed by Google and standardised by IETF as the foundation of **HTTP/3**. Unlike HTTP/1.1 and HTTP/2 (which run over TCP + TLS), HTTP/3 runs over QUIC — which is built on **UDP** and integrates TLS 1.3 **inside** the protocol itself.

The key innovation: QUIC solves TCP's fundamental limitation — **head-of-line blocking at the transport level** — making it dramatically better for lossy networks (mobile, congested WiFi, enterprise VPNs).

---

## 2. Deep-Dive

### Why TCP Is the Bottleneck

TCP guarantees **ordered delivery** of all packets. If packet 5 is lost, TCP buffers packets 6, 7, 8, 9... and waits for packet 5 to be retransmitted before delivering any of them. In HTTP/2 (which runs over TCP), this TCP-level ordering requirement blocks ALL multiplexed streams — even those with no packet loss.

### QUIC's Architecture

```
HTTP/3 Application Layer
    ↓    (QUIC frames)
QUIC Transport Layer (UDP-based, TLS 1.3 built-in)
    ↓
UDP Datagrams
    ↓
IP Network
```

**Key QUIC properties:**

| Feature | TCP + TLS 1.2 | TCP + TLS 1.3 | QUIC (HTTP/3) |
|---|---|---|---|
| Connection setup | 2+ RTTs (TCP) + 2 RTTs (TLS) | 2 RTTs (TCP) + 1 RTT (TLS) | **1 RTT or 0-RTT** |
| HOL blocking | Yes (transport) | Yes (transport) | **No** |
| Connection migration | ❌ | ❌ | **✅ Connection ID** |
| Multiplexing | HTTP/1.1: No, HTTP/2: Yes | Same | **Yes, independent** |
| Header compression | SPDY/HPACK (H2) | HPACK | **QPACK** |

### 0-RTT Connection Resumption

For returning users, QUIC can resume a connection with **zero round-trip** using session tickets from a previous connection. The first request can be sent in the same UDP datagram as the handshake — reducing cold start by ~100–300ms.

Security note: 0-RTT is vulnerable to replay attacks — only use for idempotent requests (GET), never for state-changing operations (POST, PUT, DELETE).

### Connection Migration

A critical mobile improvement: TCP connections are identified by the 4-tuple (src IP, src port, dest IP, dest port). If you switch from WiFi to 4G, your IP changes → TCP connection breaks → full reconnect required.

QUIC connections use a **Connection ID** — the connection persists even when the underlying IP address changes. Walking out of a coffee shop with your phone: HTTP/3 connections survive the WiFi → cellular handoff. HTTP/2 connections break.

### QUIC's Per-Stream Flow Control

QUIC implements **per-stream flow control** at the transport layer. A packet loss on stream 2 only stalls stream 2 — streams 1, 3, 4, 5 continue flowing. This is the fundamental difference from TCP, where all multiplexed streams share a single ordered byte stream.

### Browser Support (2024)

Chrome, Edge, Firefox: HTTP/3 enabled by default for servers advertising it via `alt-svc` header or `Alt-Svc` DNS record. Safari: Support available since Safari 15+.

```
# Server advertises QUIC support:
Alt-Svc: h3=":443"; ma=2592000
```

---

## 3. Real-World Examples

### Hruday's Context — Enterprise VPN Users

SAP enterprise users frequently connect through corporate VPNs that have higher packet loss rates (3–8%) than consumer broadband (~0.1%). HTTP/2 streams stall significantly under this packet loss. Migrating our CDN to Cloudflare (which supports HTTP/3 by default) improved P95 load time for these users by ~340ms.

### Google / Cloudflare Scale

- Google has been running QUIC for YouTube and Search since 2013
- YouTube found 18% fewer rebuffering events on QUIC vs TCP
- Google Search: measurable page load improvement, especially P95/P99 (tail latency)
- Cloudflare: 99% of their traffic now uses HTTP/3 when the client supports it

---

## 4. Interview-Oriented Answer

**Q: "What problem does HTTP/3 / QUIC solve that HTTP/2 doesn't?"**

> HTTP/2 solved application-level head-of-line blocking by multiplexing streams. But it runs over TCP, which has a critical limitation: if any packet is lost, TCP stops delivering all subsequent packets until the lost packet is retransmitted. This means a packet loss on stream 3 blocks streams 1, 2, 4, and 5 — all progress stops.
>
> QUIC runs over UDP and implements its own per-stream reliability. Packet loss on stream 3 only stalls stream 3 — other streams continue flowing independently. This is the fundamental improvement.
>
> QUIC also adds **connection migration** (connections survive IP address changes — critical for mobile users switching between WiFi and cellular), **0-RTT resumption** for returning users, and **TLS 1.3 built into the protocol** (reducing the handshake from 2–3 RTTs to 1 RTT or 0-RTT).
>
> The practical result: QUIC is most impactful on **lossy networks** (mobile, VPN, satellite). On a perfect low-loss broadband connection, the improvement over HTTP/2 is small. But for the tail latency — P95/P99 users on mobile — the difference is meaningful. At SAP, our enterprise VPN users (3–8% packet loss) saw ~340ms P95 improvement after switching to Cloudflare with HTTP/3.

---

## 5. Code Example

```typescript
// Detecting HTTP/3 support and protocol version in use
// Server-side (Node.js): Enable QUIC/HTTP/3

// --- Client-side: check what protocol was used ---
const [navEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
console.log('Page loaded via:', navEntry.nextHopProtocol);
// 'h3' = HTTP/3, 'h2' = HTTP/2, 'http/1.1' = legacy

// Per-resource check
performance.getEntriesByType('resource').forEach((entry) => {
  const r = entry as PerformanceResourceTiming;
  if (r.nextHopProtocol === 'h3') {
    console.log(`✅ ${r.name} loaded via HTTP/3`);
  } else if (r.nextHopProtocol === 'h2') {
    console.log(`⚠️ ${r.name} loaded via HTTP/2 (no QUIC)`);
  }
});

// Measure 0-RTT benefit (connection setup time)
performance.getEntriesByType('resource').forEach((entry) => {
  const r = entry as PerformanceResourceTiming;
  const connectionTime = r.connectEnd - r.connectStart;
  const wasReused = connectionTime === 0;
  const was0RTT = r.nextHopProtocol === 'h3' && connectionTime < 10;
  console.log(`${r.name}: ${wasReused ? 'reused connection' : was0RTT ? '0-RTT!' : `${connectionTime.toFixed(0)}ms handshake`}`);
});
```

```typescript
// Feature Detection: Does the user benefit from HTTP/3?
// Can be used to inform server-side connection type decisions

async function detectNetworkQuality(): Promise<{
  protocol: string;
  effectiveType: string;
  rtt: number;
  downlink: number;
}> {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const conn = (navigator as any).connection;
  
  return {
    protocol: nav?.nextHopProtocol ?? 'unknown',
    effectiveType: conn?.effectiveType ?? 'unknown', // '4g', '3g', '2g', 'slow-2g'
    rtt: conn?.rtt ?? 0,       // ms — high RTT benefits from 0-RTT resumption
    downlink: conn?.downlink ?? 0, // Mbps
  };
}

// Use case: serve lower-quality images to users on slow connections
// regardless of HTTP protocol version
const quality = await detectNetworkQuality();
if (quality.rtt > 200 || quality.effectiveType === '3g') {
  // Load compressed images, defer non-critical resources
  document.querySelectorAll('img[data-src-hq]').forEach(img => {
    img.setAttribute('src', img.getAttribute('data-src-lq') ?? '');
  });
}
```

---

## 6. Memory Aid

**"QUIC = UDP + TLS inside + per-stream reliability"**

- TCP: all packets in one ordered river 🌊 — block one, block all
- QUIC: many independent pipes 🚿🚿🚿 — block one, others flow freely
- 0-RTT: "I remember you!" — sends data in first packet (GET requests only!)
- Connection migration: your phone walks away and the connection follows you 📱🚶

**The 3 QUIC wins:**
1. No TCP HOL blocking (independent stream recovery)
2. 0-RTT resumption (faster reconnects)
3. Connection migration (mobile WiFi ↔ cellular)

---

## 7. Why & How Summary

**Why QUIC was created:**
- TCP is 40+ years old, baked into OS kernels — impossible to update
- Google could ship QUIC as a userspace library, update faster than OS kernel TCP changes
- Mobile internet's lossy nature makes TCP's HOL blocking increasingly painful

**How HTTP/3 works:**
1. Browser makes DNS query, gets IP (or uses cached)
2. Sends UDP QUIC ClientHello (TLS 1.3 ClientHello embedded)
3. Server responds: QUIC ServerHello + TLS cert + QUIC transport params
4. Connection established in **1 RTT** (vs 3 RTTs for HTTP/2 on TCP+TLS 1.2)
5. Multiple HTTP/3 requests multiplexed as independent QUIC streams
6. Each stream independently rate-controlled — packet loss doesn't cross stream boundaries

**When HTTP/3 doesn't help:**
- Perfect zero-packet-loss networks (fast office Wi-Fi, server-to-server)
- The connection setup is the bottleneck (first page load, rare → preconnect helps more)
