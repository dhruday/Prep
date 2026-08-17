# Module 2.5 — Network Layer

> How does the browser communicate with servers, and what did each HTTP version fix?

---

## Topics

| # | Topic | File |
|---|-------|------|
| 21 | Network Stack Basics | [21_Network_Stack_Basics.md](./21_Network_Stack_Basics.md) |
| 22 | HTTP/1.1 vs HTTP/2 vs HTTP/3 | [22_HTTP_1.1_vs_HTTP_2_vs_HTTP_3.md](./22_HTTP_1.1_vs_HTTP_2_vs_HTTP_3.md) |
| 23 | Connection Reuse & Head-of-Line Blocking | [23_Connection_Reuse_and_Head_of_Line_Blocking.md](./23_Connection_Reuse_and_Head_of_Line_Blocking.md) |

---

## Core Concepts

- **DNS Lookup** → **TCP Handshake** → **TLS Handshake** → **HTTP Request** — The cost before the first byte
- **TTFB (Time to First Byte)** — Critical metric for server response speed
- **HTTP/1.1** — Persistent connections, but sequential requests per connection (6 max parallel)
- **HTTP/2** — Multiplexing over a single TCP connection, header compression (HPACK), server push
- **HTTP/3 (QUIC)** — UDP-based, eliminates TCP head-of-line blocking, 0-RTT reconnect
- **Head-of-Line Blocking** — One slow request blocks all others behind it in the same connection/stream
- **Connection coalescing** — HTTP/2 reuses connections for same-origin requests

## Why It Matters in Interviews

- Explains why HTTP/2 made domain sharding an anti-pattern (was a workaround for HTTP/1.1 limits)
- Explains why HTTP/3 is critical for high-packet-loss environments (mobile networks)
- Informs decisions like resource bundling vs unbundling based on HTTP version
- Explains why `preconnect` hints reduce latency for third-party origins
- Justifies CDN architecture choices: edge nodes close to users reduce RTT
