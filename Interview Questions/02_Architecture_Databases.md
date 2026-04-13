# 02 — Architecture, Databases & Infrastructure

> **Phase B** of the FAANG Interview Master Guide
> Covers: Backend Parts 4-10 (topics 27-92) + Frontend SEQ 10-12 (topics 196-239)
> **~110 topics** | Core building blocks referenced by every system design case study

---

## Table of Contents

### Part A — Networking & Communication (Backend 27-37)
- [27. Networking Fundamentals](#27-networking-fundamentals)
- [28. HTTP / HTTPS](#28-http--https)
- [29. TCP vs UDP](#29-tcp-vs-udp)
- [30. REST vs RPC](#30-rest-vs-rpc)
- [31. GraphQL vs REST](#31-graphql-vs-rest)
- [32. gRPC Basics](#32-grpc-basics)
- [33. Long Polling](#33-long-polling)
- [34. WebSockets](#34-websockets)
- [35. Server-Sent Events (SSE)](#35-server-sent-events-sse)
- [36. DNS Basics](#36-dns-basics)
- [37. CDN Fundamentals](#37-cdn-fundamentals)

### Part B — Architectural Patterns (Backend 38-45)
- [38. Monolithic Architecture](#38-monolithic-architecture)
- [39. Microservices Architecture](#39-microservices-architecture)
- [40. Event-Driven Architecture](#40-event-driven-architecture)
- [41. Layered Architecture](#41-layered-architecture)
- [42. Client-Server Architecture](#42-client-server-architecture)
- [43. API Gateway Pattern](#43-api-gateway-pattern)
- [44. Backend for Frontend (BFF)](#44-backend-for-frontend-bff)
- [45. Service Decomposition Strategies](#45-service-decomposition-strategies)

### Part C — Load Balancing (Backend 46-52)
- [46. Why Load Balancers](#46-why-load-balancers)
- [47. Layer-4 vs Layer-7 Load Balancers](#47-layer-4-vs-layer-7-load-balancers)
- [48. Load Balancing Algorithms](#48-load-balancing-algorithms)
- [49. Sticky Sessions](#49-sticky-sessions)
- [50. Health Checks](#50-health-checks)
- [51. Failover Strategies](#51-failover-strategies)
- [52. Global Load Balancing](#52-global-load-balancing)

### Part D — Databases & Storage (Backend 53-76)
- [53. Database Fundamentals](#53-database-fundamentals)
- [54. SQL vs NoSQL](#54-sql-vs-nosql)
- [55-60. Database Types](#55-relational-databases)
- [61-63. Specialized DBs](#61-time-series-databases)
- [64-76. DB Internals & Scaling](#64-database-schema-design)

### Part E — Caching (Backend 77-84)
- [77-84. Caching Deep Dive](#77-why-caching-matters)

### Part F — Consistency & Replication (Backend 85-92)
- [85-92. Distributed Theory](#85-data-consistency-models)

### Part G — Frontend Architecture Patterns (SEQ 10, topics 196-209)
- [196-209. Architecture Patterns](#196-monolithic-frontend-architecture)

### Part H — Rendering Strategies (SEQ 11, topics 210-225)
- [210-225. Rendering Deep Dive](#210-client-side-rendering-csr)

### Part I — Caching & Offline (SEQ 12, topics 226-239)
- [226-239. Frontend Caching](#226-http-caching)

---
---

# Part A — Networking & Communication

## 27. Networking Fundamentals

### Q: Walk through the OSI model layers that matter for system design.

**Answer (Interview-Ready):**

| Layer | Name | Key Protocols | System Design Relevance |
|-------|------|--------------|------------------------|
| 7 | Application | HTTP, WebSocket, gRPC, DNS | API design, protocol choice |
| 4 | Transport | TCP, UDP, QUIC | Reliability vs speed trade-offs |
| 3 | Network | IP, ICMP | Routing, subnets, VPCs |
| 2/1 | Data Link/Physical | Ethernet, WiFi | Rarely discussed in interviews |

**Key concepts for interviews:**
- **Latency** = time for a packet to travel from sender to receiver. Measured in ms. Physical limit: speed of light (~100ms cross-Atlantic RTT)
- **Bandwidth** = max data throughput on the channel (Gbps). High bandwidth ≠ low latency
- **Throughput** = actual data rate achieved. Limited by bandwidth, congestion, and protocol overhead
- **RTT** (Round Trip Time) = time for request + response. Critical for API design — every HTTP request costs at least 1 RTT

**Follow-ups:**
- "How does latency affect system design?" → User-facing APIs should be <200ms. For global users, deploy servers in multiple regions (CDN, edge computing). Every additional network hop adds 1-50ms
- "TCP vs UDP in one sentence?" → TCP guarantees delivery and ordering (reliable, slower). UDP fires and forgets (fast, no guarantees). Choose based on whether you need reliability or speed

🔥 **Most Asked**: Latency vs bandwidth, TCP vs UDP summary, RTT impact on API design
⚠️ **Common Mistakes**: Confusing latency with bandwidth; not considering RTT in capacity estimation
🧠 **Strategy**: Know the 4 key terms (latency, bandwidth, throughput, RTT) and give numbers

---

## 28. HTTP / HTTPS

### Q: Explain HTTP methods, status codes, and how HTTPS works.

**Answer (Interview-Ready):**

**HTTP Methods (RESTful):**
| Method | Idempotent | Safe | Use |
|--------|-----------|------|-----|
| GET | Yes | Yes | Read resource |
| POST | No | No | Create resource |
| PUT | Yes | No | Replace resource entirely |
| PATCH | No* | No | Partial update |
| DELETE | Yes | No | Remove resource |

**Key status codes:**
- **2xx**: 200 OK, 201 Created, 204 No Content
- **3xx**: 301 Permanent Redirect, 304 Not Modified (cache hit)
- **4xx**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests
- **5xx**: 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable

**HTTPS (TLS handshake):**
1. Client sends "Hello" + supported cipher suites
2. Server sends certificate + chosen cipher
3. Client verifies certificate (chain of trust → CA)
4. Key exchange (asymmetric crypto) → derive shared secret
5. All subsequent communication encrypted with shared secret (symmetric crypto)
- TLS 1.3 reduces this to 1 RTT (2 RTT in TLS 1.2). 0-RTT for returning clients

**Follow-ups:**
- "What's idempotent?" → Making the same request N times has the same effect as making it once. PUT replacing a resource is idempotent. POST creating a resource is not (creates N resources)
- "HTTP/2 vs HTTP/3?" → Covered in topic 36. Key: HTTP/2 = multiplexed over TCP. HTTP/3 = multiplexed over QUIC (UDP). Both solve HTTP-level HOL blocking
- "What are HTTP headers you always set?" → `Content-Type`, `Authorization`, `Cache-Control`, `Accept`, `X-Request-ID` (tracing), CORS headers

🔥 **Most Asked**: Status codes, idempotency, HTTPS/TLS handshake
⚠️ **Common Mistakes**: Saying PATCH is idempotent (it depends on implementation); confusing 401 (not authenticated) with 403 (not authorized)
🧠 **Strategy**: Know the status codes table cold. Give real examples for each method

---

## 29. TCP vs UDP

### Q: When would you choose TCP vs UDP in a system design?

**Answer (Interview-Ready):**

| Feature | TCP | UDP |
|---------|-----|-----|
| Connection | Connection-oriented (3-way handshake) | Connectionless |
| Reliability | Guaranteed delivery + ordering | Best effort (no guarantees) |
| Flow control | Yes (sliding window) | No |
| Congestion control | Yes (slow start, AIMD) | No |
| Overhead | Higher (headers, acks, retransmission) | Lower (minimal 8-byte header) |
| Speed | Slower (reliability overhead) | Faster |

**Choose TCP for:**
- HTTP/HTTPS (web traffic, APIs)
- File transfers (can't lose bytes)
- Email (SMTP)
- Database connections
- Any system where data integrity > speed

**Choose UDP for:**
- Video/audio streaming (live — stale frame is worse than dropped frame)
- Online gaming (real-time position updates — old position is useless)
- DNS queries (single request-response, small payload)
- IoT sensor data (frequent small updates, missing one is OK)
- VoIP (real-time voice)

**QUIC (UDP + reliability):**
- Built on UDP but adds reliability per-stream (best of both worlds)
- HTTP/3 uses QUIC. Gets TCP-like reliability with UDP-like speed for multiplexed streams

**Follow-ups:**
- "How does TCP handle packet loss?" → Retransmission: sender times out → resends. Receiver sends ACK for received packets. Out-of-order packets are buffered until missing one arrives
- "Why not always use TCP?" → The reliability mechanisms add latency. For real-time applications, a stale retransmitted packet is worse than a fresh dropped one. Also, TCP's congestion control throttles throughput
- "What about WebRTC?" → Uses UDP for media (low latency) but has its own reliability layer (SCTP) for data channels. Combines UDP speed with selective reliability

🔥 **Most Asked**: When to choose each, QUIC as the modern hybrid
⚠️ **Common Mistakes**: Saying "always use TCP because reliability"; not knowing QUIC
🧠 **Strategy**: Give specific examples for each protocol. "Video streaming uses UDP because..."

---

## 30. REST vs RPC

### Q: Compare REST and RPC. When would you choose each?

**Answer (Interview-Ready):**

| Aspect | REST | RPC |
|--------|------|-----|
| Paradigm | Resource-oriented (nouns) | Action-oriented (verbs) |
| URL style | `/users/123` | `/getUser`, `/createUser` |
| Transport | HTTP (typically) | HTTP, TCP, custom |
| Payload | JSON (usually) | JSON, Protobuf, Thrift |
| Caching | Easy (GET is cacheable by default) | Hard (POST typically) |
| Discovery | Self-describing (HATEOAS) | Needs documentation/schema |
| Best for | Public APIs, CRUD operations | Internal services, complex operations |

**REST example:** `GET /orders/456/items` → resource-centric, cacheable
**RPC example:** `POST /calculateShippingCost({orderId: 456})` → action-centric, specific

**When to use REST:**
- Public/external APIs (easy to understand, standard)
- CRUD-heavy operations (maps naturally to HTTP methods)
- When cacheability matters (CDN can cache GET responses)

**When to use RPC (gRPC):**
- Internal service-to-service communication (microservices)
- Performance-critical (Protobuf is 5-10x smaller than JSON)
- Complex operations that don't map to CRUD (e.g., `transcode`, `authenticate`)
- When you need streaming (gRPC supports bidirectional streaming)

**Follow-ups:**
- "Is GraphQL REST or RPC?" → Neither — it's query-based. Client specifies exactly what data it needs. Avoids over-fetching (REST problem) and the rigid schema of RPC
- "Can REST be efficient?" → Yes. Use pagination, sparse fieldsets (`?fields=name,email`), ETag caching, HTTP/2 multiplexing. REST is fine for most use cases

🔥 **Most Asked**: REST vs RPC comparison, when to choose each, GraphQL as alternative
⚠️ **Common Mistakes**: Saying REST is always better; not knowing when RPC is the right choice
🧠 **Strategy**: "REST for external APIs, gRPC for internal service-to-service communication"

---

## 31. GraphQL vs REST

### Q: Compare GraphQL and REST. What problems does GraphQL solve?

**Answer (Interview-Ready):**

| Aspect | REST | GraphQL |
|--------|------|---------|
| Endpoints | Multiple (`/users`, `/posts`) | Single (`/graphql`) |
| Data fetching | Fixed response shape | Client specifies fields |
| Over-fetching | Common (get all fields) | Eliminated (request only what you need) |
| Under-fetching | Common (need multiple requests) | Eliminated (nested queries) |
| Caching | HTTP cache (simple) | Complex (need normalized cache like Apollo) |
| Type system | Optional (OpenAPI) | Built-in schema + types |
| Real-time | WebSocket/SSE separately | Subscriptions built-in |
| File upload | Standard multipart | Needs special handling |

**GraphQL solves:**
```graphql
# One request instead of GET /user/1 + GET /user/1/posts + GET /user/1/followers
query {
  user(id: "1") {
    name
    posts(limit: 5) { title, likes }
    followers { name, avatar }
  }
}
```

**When to use GraphQL:**
- Multiple clients needing different data shapes (mobile vs web vs TV)
- Complex, nested data relationships
- Rapid frontend iteration (frontend can request new fields without backend changes)

**When REST is better:**
- Simple CRUD APIs
- Caching-heavy systems (HTTP caching is trivial with REST)
- File uploads/downloads
- Public APIs (REST is more universally understood)

**Follow-ups:**
- "N+1 problem in GraphQL?" → Nested resolvers can fire N database queries. Solution: DataLoader pattern — batches individual loads into a single query per tick
- "Security concerns?" → Deeply nested queries can be a DDoS vector. Use: query depth limiting, query complexity analysis, rate limiting, persisted queries
- "Can you combine REST and GraphQL?" → Yes. GraphQL gateway that aggregates multiple REST microservices. Common at companies transitioning from REST

🔥 **Most Asked**: Over-fetching/under-fetching, N+1 problem, when NOT to use GraphQL
⚠️ **Common Mistakes**: Saying GraphQL replaces REST entirely; ignoring the caching complexity
🧠 **Strategy**: Show the nested query example. Then mention the N+1 problem and DataLoader. Shows you know both sides

---

## 32. gRPC Basics

### Q: What is gRPC? Why is it used for microservices?

**Answer (Interview-Ready):**
- **gRPC** = Google's RPC framework using **Protocol Buffers** (Protobuf) for serialization over **HTTP/2**
- It's the de facto standard for service-to-service communication in microservices

**Why gRPC over REST for internal services:**
| Feature | Benefit |
|---------|---------|
| Protobuf (binary format) | 5-10x smaller than JSON, faster serialization |
| HTTP/2 | Multiplexing, header compression, bidirectional streaming |
| Code generation | `.proto` file generates client + server code in any language |
| Streaming | 4 types: unary, server-stream, client-stream, bidirectional |
| Strong typing | Schema enforced at build time, not runtime |

**gRPC streaming modes:**
1. **Unary**: Request → Response (like REST)
2. **Server streaming**: Request → Stream of responses (live feed)
3. **Client streaming**: Stream of requests → Single response (file upload)
4. **Bidirectional**: Both stream simultaneously (chat, gaming)

**Follow-ups:**
- "gRPC on the web?" → Browsers can't use HTTP/2 trailers directly. Use gRPC-Web (proxy translates to browser-compatible format) or connect-web
- "Downsides?" → Not human-readable (binary), harder to debug (can't curl it easily), needs HTTP/2, browser support requires proxy
- "Proto file example?" → `service UserService { rpc GetUser(UserRequest) returns (UserResponse); }` — defines the contract. Code gen creates typed client/server stubs

🔥 **Most Asked**: Why Protobuf is faster, streaming modes, when to use gRPC vs REST
⚠️ **Common Mistakes**: Using gRPC for public APIs (REST is better for external consumers); not mentioning Protobuf
🧠 **Strategy**: "gRPC for internal, REST for external" — this is the industry standard

---

## 33. Long Polling

### Q: What is long polling? How does it compare to WebSockets and SSE?

**Answer (Interview-Ready):**
- **Long polling**: Client sends request → server holds it open until new data arrives (or timeout) → responds → client immediately sends new request
- It's a hack to simulate real-time with plain HTTP

**How it works:**
```
Client → GET /updates?since=123  (server holds request open)
... 30 seconds later, new data arrives ...
Server → 200 OK { data: [...] }
Client → GET /updates?since=456  (immediately reconnects)
```

**Comparison:**
| | Long Polling | WebSocket | SSE |
|---|---|---|---|
| Transport | HTTP (repeated requests) | TCP (persistent, full-duplex) | HTTP (persistent, server→client) |
| Direction | Simulated bidirectional | True bidirectional | Server → Client only |
| Overhead | High (repeated HTTP headers) | Low (after handshake) | Low |
| Complexity | Simple (just HTTP) | Medium (connection management) | Simple |
| Best for | Simple notifications, fallback | Chat, gaming, collaboration | Live feeds, dashboards |

**When to use long polling:**
- Need real-time but WebSocket/SSE isn't available (firewalls, proxies blocking them)
- Simple notification systems with low message volume
- Legacy infrastructure that only supports HTTP/1.1

**Follow-ups:**
- "Why not just use setInterval polling?" → Regular polling wastes bandwidth (empty responses) and has delay (up to 1 interval). Long polling responds immediately when data arrives — lower latency, less waste
- "What's the scaling challenge?" → Each held connection consumes a server thread/connection. 10K concurrent users = 10K held connections. Need non-blocking I/O (Node.js, Nginx, async servers)

🔥 **Most Asked**: Long polling vs WebSocket vs SSE comparison, when to use each
⚠️ **Common Mistakes**: Choosing long polling when WebSocket is available; not mentioning the server thread cost
🧠 **Strategy**: Show the comparison table and give one concrete use case per approach

---

## 34. WebSockets

### Q: How do WebSockets work? When should you use them?

**Answer (Interview-Ready):**
- **WebSocket** = persistent, full-duplex communication channel over a single TCP connection
- Starts as HTTP upgrade request → server accepts → switches to WebSocket protocol

**Handshake:**
```
Client → GET /chat HTTP/1.1
         Upgrade: websocket
         Connection: Upgrade
         Sec-WebSocket-Key: <random>

Server → HTTP/1.1 101 Switching Protocols
         Upgrade: websocket
         Sec-WebSocket-Accept: <derived>
```
After 101, both sides can send frames at any time — no request-response pattern.

**Use cases:** Chat, collaborative editing, live gaming, real-time trading, multiplayer games

**Scaling challenges:**
- Each WebSocket = persistent TCP connection. 100K users = 100K connections per server
- Sticky sessions needed (or Redis pub/sub for cross-server message routing)
- Heartbeats (ping/pong frames) to detect dead connections
- Reconnection with exponential backoff on client

**Follow-ups:**
- "How to scale WebSockets across multiple servers?" → Use a message broker (Redis Pub/Sub, Kafka). When server A receives a message for user on server B, publish to Redis → server B delivers. Or use a dedicated WebSocket service (Ably, Pusher, Socket.io + Redis adapter)
- "WebSocket vs HTTP/2 streams?" → WebSocket is a separate protocol (designed for real-time). HTTP/2 streams are multiplexed requests within HTTP. WebSocket has lower overhead per message but needs its own connection. HTTP/2 Server Push can simulate server→client but isn't bidirectional
- "Security?" → Use `wss://` (WebSocket Secure = WebSocket over TLS). Validate origin header. Authenticate on connection (token in first message or URL query param — not headers, which aren't customizable in browser WebSocket API)

🔥 **Most Asked**: Handshake, scaling across servers, vs SSE comparison
⚠️ **Common Mistakes**: Not handling reconnection; not authenticating connections; using WebSocket when SSE suffices
🧠 **Strategy**: "WebSocket for bidirectional (chat), SSE for server→client (feeds), long polling as fallback"

---

## 35. Server-Sent Events (SSE)

### Q: What are Server-Sent Events? When to choose SSE over WebSocket?

**Answer (Interview-Ready):**
- **SSE** = HTTP-based, server → client only, persistent connection
- Server sends a stream of events. Client reconnects automatically if disconnected
- Uses text/event-stream content type over regular HTTP

```javascript
// Server (Node.js)
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.write(`data: ${JSON.stringify({ price: 150.25 })}\n\n`);

// Client
const source = new EventSource('/stream/prices');
source.onmessage = (event) => { console.log(JSON.parse(event.data)); };
source.onerror = () => { /* auto-reconnects */ };
```

**SSE advantages over WebSocket:**
- Auto-reconnection with `Last-Event-Id` header (resume from where you left off)
- Works through HTTP proxies and firewalls (it's just HTTP)
- Simpler — no upgrade handshake, no new protocol
- Built-in browser API (`EventSource`) — no library needed

**SSE limitations:**
- Server → Client only (not bidirectional)
- HTTP/1.1: limited to ~6 connections per domain (shared with other requests). HTTP/2: no limit
- Text-based only (no binary — use WebSocket for binary frames)

**Choose SSE for:** Live dashboards, stock prices, notifications, log streaming, live scores
**Choose WebSocket for:** Chat, collaboration, gaming (need bidirectional)

**Follow-ups:**
- "How does auto-reconnect work?" → Browser automatically reconnects after disconnect. Server can set retry interval: `retry: 5000\n` (5 seconds). Client sends `Last-Event-Id` header → server resumes from that point
- "SSE vs polling?" → SSE is push-based (server sends immediately when data changes). Polling is pull-based (client asks repeatedly). SSE = lower latency, less traffic

🔥 **Most Asked**: SSE vs WebSocket decision, auto-reconnection, practical use cases
⚠️ **Common Mistakes**: Using WebSocket when SSE is sufficient; not knowing SSE auto-reconnects
🧠 **Strategy**: Lead with "SSE is simpler than WebSocket and auto-reconnects." Then give the use case comparison

---

## 36. DNS Basics

### Q: How does DNS work? How does it affect system design?

**Answer (Interview-Ready):**
- **DNS** translates domain names to IP addresses. It's a distributed hierarchical database

**Resolution flow:**
1. Browser cache → 2. OS cache → 3. Router cache → 4. ISP recursive resolver → 5. Root nameserver → 6. TLD nameserver (.com) → 7. Authoritative nameserver (example.com) → IP returned

**Record types:**
| Record | Purpose | Example |
|--------|---------|---------|
| A | Domain → IPv4 | `example.com → 93.184.216.34` |
| AAAA | Domain → IPv6 | `example.com → 2001:db8::1` |
| CNAME | Alias → another domain | `www.example.com → example.com` |
| MX | Mail server for domain | `example.com → mail.example.com` |
| NS | Nameserver for domain | `example.com → ns1.example.com` |
| TXT | Arbitrary text (SPF, DKIM) | Verification records |

**DNS in system design:**
- **TTL (Time to Live)**: How long DNS response is cached. Low TTL (60s) = faster failover but more DNS lookups. High TTL (3600s) = less DNS traffic but slow failover
- **DNS load balancing**: Return multiple IPs (round-robin) or different IPs based on geography (GeoDNS)
- **Failover**: Health-checked DNS removes unhealthy IPs. Route 53 health checks update records
- **CDN routing**: DNS returns the closest CDN edge server's IP based on user's location

**Follow-ups:**
- "What happens if DNS is down?" → Pages won't load (can't resolve IP). That's why DNS is distributed globally with massive redundancy. Use multiple DNS providers for critical services
- "DNS prefetch for performance?" → `<link rel="dns-prefetch" href="https://cdn.example.com">` — resolves DNS before the resource is needed. Saves ~50ms per new domain

🔥 **Most Asked**: Resolution flow, TTL trade-offs, DNS load balancing
⚠️ **Common Mistakes**: Ignoring DNS latency in system design; setting TTL too high for services that need fast failover
🧠 **Strategy**: Recite the resolution flow (6-7 steps) and explain TTL trade-offs

---

## 37. CDN Fundamentals

### Q: What is a CDN? How does it work in system design?

**Answer (Interview-Ready):**
- **CDN** (Content Delivery Network) = geographically distributed cache servers that serve content from locations close to users
- Reduces latency by eliminating cross-continent round trips

**How it works:**
1. User requests `cdn.example.com/image.jpg`
2. DNS resolves to nearest CDN edge server (GeoDNS/Anycast)
3. **Cache HIT**: Edge has the file → serves immediately (~5-20ms)
4. **Cache MISS**: Edge requests from origin server → stores a copy → serves user. Next request for same file is a HIT

**CDN use cases:**
- Static files: images, CSS, JS, fonts, videos
- API responses (with careful cache headers)
- Entire HTML pages (static sites, SSG)
- Video streaming (HLS/DASH segments cached at edge)

**CDN types:**
- **Pull CDN**: Edge fetches from origin on first request. Simpler. Good for most use cases
- **Push CDN**: You upload content to CDN proactively. Better for large files or predictable content (movie releases)

**Cache invalidation:**
- **TTL-based**: Set `Cache-Control: max-age=86400` (24h). After TTL, edge re-fetches
- **Manual purge**: API call to invalidate specific URLs. Use for emergency fixes
- **Versioned URLs**: `app.v2.3.js` — never invalidate, just change the URL. Best practice for static assets

**Follow-ups:**
- "How does CDN help with DDoS?" → CDN absorbs traffic at edge (massive capacity). Bad traffic stopped before hitting origin. Cloudflare/AWS CloudFront have built-in DDoS protection
- "What can't be cached by CDN?" → Personalized content (user-specific pages), real-time data, POST requests, anything with `Cache-Control: no-store`
- "Multi-CDN strategy?" → Route different regions to different CDNs for reliability. If one CDN has an outage, DNS failover to another. Used by Netflix, Facebook

🔥 **Most Asked**: Push vs pull, cache invalidation strategies, CDN in overall architecture
⚠️ **Common Mistakes**: Caching personalized content; not using versioned URLs for static assets
🧠 **Strategy**: Always mention CDN early in any system design. "Static assets served via CDN" is expected in every diagram

---
---

# Part B — Architectural Patterns

## 38. Monolithic Architecture

### Q: What is a monolithic architecture? When is it the right choice?

**Answer (Interview-Ready):**
- **Monolith** = entire application deployed as a single unit. One codebase, one deployment artifact, one database
- All modules (auth, orders, payments, notifications) run in the same process

**Advantages:**
- Simple to develop, test, and deploy (one artifact)
- No network latency between modules (in-process calls)
- Easier debugging (one log, one stack trace)
- Transaction management is straightforward (single DB, ACID)
- Good for startups and small teams (move fast)

**Disadvantages:**
- Scaling: Must scale entire app even if only one module is bottleneck
- Deployment: Any change requires redeploying everything (risk of breaking unrelated features)
- Team scaling: 20+ engineers working on one codebase → merge conflicts, slow CI
- Technology lock-in: One stack for everything

**When to choose monolith:**
- Early-stage startup (speed > scalability)
- Small team (<10 engineers)
- Simple domain (CRUD app, internal tools)
- When you aren't sure of your service boundaries yet

**Follow-ups:**
- "Monolith vs modular monolith?" → Modular monolith = well-structured monolith with clear module boundaries (each module has its own domain model and can be extracted later). Best of both worlds for medium-sized teams
- "When to migrate from monolith to microservices?" → When deployment frequency is bottlenecked, when different modules need different scaling, when team size exceeds 2-pizza teams per module. Not before

🔥 **Most Asked**: When monolith is appropriate, comparison with microservices
⚠️ **Common Mistakes**: Saying "microservices are always better"; not considering the modular monolith
🧠 **Strategy**: "Start with a monolith, extract services when the pain justifies the complexity"

---

## 39. Microservices Architecture

### Q: What are microservices? What problems do they solve and create?

**Answer (Interview-Ready):**
- **Microservices** = application split into small, independently deployable services, each owning its own data and business logic
- Each service has its own database (Database-per-Service pattern)

**Advantages:**
- Independent deployment (ship auth service without touching payments)
- Independent scaling (scale the order service 10x during Black Friday)
- Technology freedom (Java for payments, Python for ML, Node for real-time)
- Team autonomy (each team owns a service end-to-end)
- Fault isolation (one service crashing doesn't bring down others — if designed correctly)

**Challenges (be honest in interview):**
- **Distributed complexity**: Network failures, latency, data consistency
- **Data consistency**: No cross-service transactions. Need sagas or eventual consistency
- **Observability**: Distributed tracing (Jaeger), centralized logging (ELK), metrics (Prometheus)
- **Testing**: Integration tests across services are hard. Contract testing (Pact) helps
- **Operational overhead**: Service discovery, load balancing, circuit breakers, health checks per service

**When to use microservices:**
- Large teams (>30 engineers, multiple squads)
- Different modules have different scaling needs
- Multiple deployment cadences needed
- Domain boundaries are well-understood

**Follow-ups:**
- "How do services communicate?" → Sync: REST, gRPC. Async: Message queues (Kafka, RabbitMQ). Prefer async for decoupling
- "How do you handle distributed transactions?" → Saga pattern: sequence of local transactions. Each step has a compensating action. If step 3 fails, undo steps 2 and 1
- "Service discovery?" → Client-side (Eureka) or server-side (Kubernetes DNS, Consul). Services register themselves; clients look up the registry

🔥 **Most Asked**: Advantages/disadvantages honestly, saga pattern, service communication
⚠️ **Common Mistakes**: Recommending microservices for small teams; not addressing the distributed data problem
🧠 **Strategy**: Always discuss BOTH pros and cons. "Microservices trade local complexity for operational complexity"

---

## 40. Event-Driven Architecture

### Q: What is event-driven architecture? How does it enable loose coupling?

**Answer (Interview-Ready):**
- Services communicate by producing and consuming **events** instead of direct API calls
- **Event** = an immutable record of something that happened: "OrderPlaced", "PaymentCompleted", "UserCreated"

**Patterns:**
| Pattern | Flow | Example |
|---------|------|---------|
| **Event Notification** | Publish event, consumers react | OrderService → "OrderPlaced" → EmailService sends confirmation |
| **Event-Carried State Transfer** | Event contains full data | "UserUpdated" event carries new user profile → downstream caches update |
| **Event Sourcing** | Store events as source of truth | Bank ledger: sequence of deposits/withdrawals. State = replay events |
| **CQRS** | Separate read and write models | Write: normalize in SQL. Read: denormalize in Elasticsearch for fast queries |

**Benefits:**
- Loose coupling: producers don't know about consumers
- Scalability: consumers process events at their own pace
- Audit trail: events are a natural log of what happened
- Replay: can rebuild state by replaying events

**Challenges:**
- Eventual consistency (not immediate)
- Event ordering is hard (partitioned queues help)
- Debugging is harder (no direct call stack)
- Schema evolution (event versioning)

**Follow-ups:**
- "Event sourcing vs traditional CRUD?" → CRUD overwrites state (lose history). Event sourcing appends events (full history). Trade-off: storage cost vs auditability. Use event sourcing for financial systems, audit-heavy domains
- "What message broker?" → Kafka (log-based, high throughput, replay possible), RabbitMQ (traditional message queue, flexible routing), SQS (managed, simpler)
- "How to handle duplicate events?" → Idempotent consumers. Each event has a unique ID. Consumer tracks processed IDs and skips duplicates

🔥 **Most Asked**: Event sourcing vs CRUD, CQRS pattern, eventual consistency
⚠️ **Common Mistakes**: Over-using event sourcing (adds massive complexity); not handling idempotency
🧠 **Strategy**: Distinguish between event notification (simple) and event sourcing (complex). Most systems only need notification

---

## 41. Layered Architecture

### Q: What is layered/N-tier architecture?

**Answer (Interview-Ready):**
- Application organized into horizontal layers, each with a specific responsibility
- Each layer only talks to the layer directly below it

**Standard layers:**
```
Presentation ← UI, API controllers
    ↓
Business Logic ← Domain rules, validation, orchestration
    ↓
Data Access ← Repositories, ORM, queries
    ↓
Database ← Storage
```

**Pros:** Clear separation, easy to understand, testable (mock layer below)
**Cons:** All requests pass through all layers (even when unnecessary), rigid, can lead to "anemic domain model" (logic spread across layers)

**Modern variation (Clean Architecture):**
- Dependency Inversion: inner layers don't depend on outer layers
- Domain layer at center → Application layer → Interface adapters → Frameworks
- Enables testing domain logic without infrastructure

🔥 **Most Asked**: Layer responsibilities, Clean Architecture vs traditional layered
🧠 **Strategy**: Quick summary topic — mention it to show you know the fundamental pattern

---

## 42. Client-Server Architecture

### Q: Explain client-server architecture and its variations.

**Answer (Interview-Ready):**
- **Client** sends requests → **Server** processes and responds
- Foundational pattern for all web applications

**Variations:**
- **Thin client / Thick server**: Server does most processing (SSR, traditional web apps)
- **Thick client / Thin server**: Client does processing (SPA, mobile apps, server = API layer)
- **Peer-to-peer**: Both sides are client AND server (BitTorrent, WebRTC)

**Three-tier architecture:**
1. **Client tier**: Browser/mobile app (presentation)
2. **Application tier**: Business logic servers (processing)
3. **Data tier**: Database/storage (persistence)

Benefits: Each tier scales independently. Security boundaries between tiers. Can deploy tiers on different machines/networks.

🔥 **Most Asked**: Three-tier architecture, thin vs thick client trade-offs
🧠 **Strategy**: Brief topic — use it to set up the discussion of load balancers and scaling

---

## 43. API Gateway Pattern

### Q: What is an API Gateway? Why do microservices need one?

**Answer (Interview-Ready):**
- **API Gateway** = single entry point that routes client requests to appropriate backend services
- Sits between client and microservices. Handles cross-cutting concerns

**Responsibilities:**
- **Routing**: `/api/users/*` → User Service, `/api/orders/*` → Order Service
- **Authentication/Authorization**: Validate JWT tokens before forwarding
- **Rate limiting**: Throttle requests per client
- **Response aggregation**: Combine data from multiple services into one response
- **Protocol translation**: REST → gRPC, HTTP → WebSocket
- **Caching, logging, monitoring**: Centralized

**Popular implementations:** Kong, AWS API Gateway, Nginx, Zuul, Envoy

**Follow-ups:**
- "Single point of failure?" → Yes. Deploy multiple instances behind a load balancer. Use managed services (AWS API Gateway) for automatic HA. Keep the gateway stateless
- "Gateway vs BFF?" → Gateway = one for all clients. BFF = one per client type. Gateway handles routing + auth. BFF handles client-specific response shaping
- "Performance overhead?" → Adds 1-5ms per request. Acceptable for the benefits. Put caching at the gateway layer to offset

🔥 **Most Asked**: What it does, single point of failure, gateway vs load balancer
⚠️ **Common Mistakes**: Making the gateway too smart (business logic belongs in services); not considering it as a bottleneck
🧠 **Strategy**: "API Gateway for cross-cutting concerns, services for business logic"

---

## 44. Backend for Frontend (BFF)

### Q: What is the BFF pattern? When should you use it?

**Answer (Interview-Ready):**
- **BFF** = dedicated backend service for each frontend client (web BFF, mobile BFF, TV BFF)
- Each BFF is tailored to its client's specific data needs and response shapes

```
Mobile App  → Mobile BFF  → [User Service, Order Service, ...]
Web App     → Web BFF     → [User Service, Order Service, ...]
TV App      → TV BFF      → [User Service, Order Service, ...]
```

**Why BFF:**
- Mobile needs less data than web (bandwidth constraints)
- TV needs simplified data structures
- Web might need aggregated views that mobile doesn't
- Each BFF can be owned by the frontend team for that platform

**When to use:**
- Multiple client types with significantly different data needs
- Frontend teams want control over their API layer
- You need client-specific caching, pagination, or response formatting

**When NOT to use:**
- Only one client type (just use an API gateway)
- Clients have similar data needs (unnecessary duplication)

**Follow-ups:**
- "Isn't this duplication?" → Some duplication, yes. Trade-off: tailored APIs for each client vs one-size-fits-all API that satisfies none perfectly. BFF reduces over/under-fetching per client
- "GraphQL as BFF alternative?" → GraphQL's client-specified queries solve the same problem without separate backends. GraphQL can replace BFF in many cases

🔥 **Most Asked**: When to use BFF, BFF vs GraphQL, BFF vs API Gateway
🧠 **Strategy**: "BFF when client data needs diverge significantly. GraphQL when they just need field selection flexibility"

---

## 45. Service Decomposition Strategies

### Q: How do you decide service boundaries when breaking a monolith?

**Answer (Interview-Ready):**

**Strategies:**
1. **Domain-Driven Design (DDD)**: Identify bounded contexts. Each bounded context → one service. E.g., Order Context, Payment Context, Inventory Context
2. **Business capability**: Map to org functions. Billing team → Billing Service. Shipping team → Shipping Service
3. **Team ownership**: Conway's Law — system structure mirrors org structure. One team per service
4. **Data ownership**: Services that own the same data should be one service. Split when data boundaries are clear
5. **Strangler Fig pattern**: Gradually extract functionality from monolith. New features → new service. Old features → migrate incrementally

**Rules of thumb:**
- A service should be deployable by one team (2-pizza team)
- A service should have a single well-defined responsibility
- Services should communicate via APIs, not shared databases
- If two services are always deployed together, they should be one service

**Follow-ups:**
- "How to handle shared data?" → Duplicate data (each service owns its copy, sync via events). Or create a shared service for truly shared data. Never share databases between services
- "What's the Strangler Fig pattern?" → Named after a vine that grows around a tree and eventually replaces it. Route requests gradually from monolith to new service. Both run in parallel during migration. Zero-downtime migration

🔥 **Most Asked**: DDD bounded contexts, Strangler Fig migration, shared data handling
⚠️ **Common Mistakes**: Making services too small (nano-services); sharing databases between services
🧠 **Strategy**: "Start with DDD bounded contexts, validate with team ownership, migrate with Strangler Fig"

---
---

# Part C — Load Balancing

## 46. Why Load Balancers

### Q: What problem do load balancers solve? Where do they sit in the architecture?

**Answer (Interview-Ready):**
- **Load balancer** distributes incoming traffic across multiple servers to ensure no single server is overwhelmed

**Benefits:**
- **Scalability**: Add more servers behind the LB to handle more traffic
- **Availability**: If one server dies, LB routes to healthy ones
- **Performance**: Distribute load evenly, reducing response time

**Placement in architecture:**
```
Users → CDN → Load Balancer → Web Servers → Load Balancer → App Servers → Load Balancer → Database (read replicas)
```
Load balancers at every tier: client→web, web→app, app→db

**Types:** Hardware (F5, Citrix — expensive, high performance), Software (Nginx, HAProxy, Envoy — flexible, cheaper), Cloud-managed (AWS ALB/NLB, GCP Load Balancer — zero ops)

**Follow-ups:**
- "LB vs reverse proxy?" → A load balancer IS a reverse proxy that distributes traffic. Reverse proxy can do more: caching, SSL termination, compression. Nginx serves both roles
- "What's SSL termination?" → LB decrypts HTTPS then forwards HTTP to backend servers. Reduces CPU load on backends. Re-encrypt if internal network is untrusted

🔥 **Most Asked**: Placement in architecture, types, SSL termination
🧠 **Strategy**: Draw the multi-tier LB diagram. Show LB at each layer

---

## 47. Layer-4 vs Layer-7 Load Balancers

### Q: What's the difference between L4 and L7 load balancers?

**Answer (Interview-Ready):**

| Feature | Layer 4 (Transport) | Layer 7 (Application) |
|---------|-------------------|---------------------|
| Operates on | TCP/UDP packets (IP + port) | HTTP headers, cookies, URL paths |
| Routing decisions | Based on IP and port | Based on URL, headers, content |
| Performance | Faster (less processing) | Slower (must parse HTTP) |
| SSL termination | No (pass-through) | Yes |
| Content routing | No | Yes (`/api` → service A, `/static` → service B) |
| Use case | Simple distribution, TCP services | HTTP routing, microservices, A/B testing |

**L7 examples:** Nginx, HAProxy (in HTTP mode), AWS ALB, Envoy
**L4 examples:** HAProxy (in TCP mode), AWS NLB, IPVS

**Follow-ups:**
- "When to use L4?" → Non-HTTP protocols (database connections, gRPC without HTTP features, raw TCP). When you need maximum throughput with minimal latency
- "Can you combine both?" → Yes. Common pattern: L4 (NLB) in front → distributes to multiple L7 (ALB) instances → each L7 does content-based routing

🔥 **Most Asked**: L4 vs L7 table, when to use each
🧠 **Strategy**: "L7 for HTTP, L4 for everything else" — simple heuristic

---

## 48. Load Balancing Algorithms

### Q: What are the common load balancing algorithms?

**Answer (Interview-Ready):**

| Algorithm | How it works | Best for |
|-----------|-------------|----------|
| **Round Robin** | Rotate through servers sequentially | Equal server capacity, stateless requests |
| **Weighted Round Robin** | More traffic to higher-capacity servers | Heterogeneous server specs |
| **Least Connections** | Route to server with fewest active connections | Long-lived connections, varying request durations |
| **Weighted Least Connections** | Least connections + server weight | Heterogeneous + varied request types |
| **IP Hash** | Hash client IP → consistent server | Session stickiness without cookies |
| **Consistent Hashing** | Hash ring — minimal redistribution on server add/remove | Cache servers, distributed systems |
| **Least Response Time** | Route to fastest-responding server | Latency-sensitive applications |
| **Random** | Pick a random server | Simple, surprisingly effective with many servers |

**Follow-ups:**
- "Which is most common?" → Consistent hashing for distributed caches. Least connections for application servers. Round robin as default/fallback
- "How does consistent hashing work?" → Servers placed on a hash ring. Requests hashed to a point on the ring → routed to next server clockwise. Adding/removing a server only affects its neighbors, not the entire cluster

🔥 **Most Asked**: Round robin, least connections, consistent hashing
⚠️ **Common Mistakes**: Always saying "round robin" — consider workload characteristics
🧠 **Strategy**: Know 4-5 algorithms with one-line descriptions and when to use each

---

## 49. Sticky Sessions

### Q: What are sticky sessions? What are the trade-offs?

**Answer (Interview-Ready):**
- **Sticky sessions** = route a user to the same backend server for all their requests in a session
- Implemented via: cookie (LB sets a cookie with server ID), source IP hash, or URL parameter

**When needed:** Server stores session state in memory (shopping cart, user preferences, in-progress forms). Without stickiness, next request might hit a different server without the session data

**Trade-offs:**
| Pros | Cons |
|------|------|
| Simple — server-side sessions "just work" | Uneven load (popular user stuck on one server) |
| Low latency (local memory access) | Server failure loses all sessions on that server |
| No external session store needed | Can't scale horizontally easily |

**Better alternatives:**
- **Externalized sessions**: Store sessions in Redis/Memcached. Any server can handle any request. Stateless servers + shared session store
- **JWT tokens**: Client holds the session state. No server-side storage. But can't revoke easily, size limits
- **Database-backed sessions**: Persistent, survives server restarts. Higher latency (DB read per request)

**Follow-ups:**
- "What if the sticky server goes down?" → Session lost. LB routes to new server. User must re-authenticate/re-add cart items. This is why externalized sessions are preferred for critical state
- "Sticky sessions in Kubernetes?" → K8s Services default to round-robin. For stickiness: use `service.spec.sessionAffinity: ClientIP`. But prefer stateless pods + Redis

🔥 **Most Asked**: Why they exist, the trade-offs, alternatives (Redis sessions)
🧠 **Strategy**: "Sticky sessions are a band-aid. Prefer stateless servers + externalized session store"

---

## 50. Health Checks

### Q: How do load balancers determine if a server is healthy?

**Answer (Interview-Ready):**
- **Health checks** = periodic probes to verify server availability

**Types:**
- **Active (pull)**: LB sends HTTP GET to `/health` endpoint every 10-30s. Expects 200 OK. 3 consecutive failures → mark unhealthy → stop routing. 2 consecutive passes → mark healthy again
- **Passive (push)**: LB monitors real traffic responses. If server returns 5xx errors or timeouts → mark unhealthy. No extra probe traffic
- **Deep health check**: `/health` checks downstream dependencies (DB, Redis, external APIs). Returns unhealthy if critical dependency is down
- **Shallow health check**: Just returns 200 if process is running. Faster, less informative

**Best practice:** Shallow check on LB (fast, frequent), deep check on monitoring (detailed, less frequent). Don't fail shallow health because a non-critical dependency is down

🔥 **Most Asked**: Active vs passive, deep vs shallow, when to mark unhealthy
🧠 **Strategy**: Mention the `/health` endpoint pattern. Every production system has this

---

## 51. Failover Strategies

### Q: What are the common failover strategies?

**Answer (Interview-Ready):**

| Strategy | How it works | Recovery time |
|----------|-------------|---------------|
| **Active-Passive** | Primary handles traffic. Passive standby takes over if primary fails | Seconds-minutes (switchover time) |
| **Active-Active** | Both handle traffic simultaneously. If one fails, other absorbs all | Near-instant (already serving) |
| **N+1** | N active servers + 1 spare. Spare activates on any failure | Fast (pre-provisioned) |
| **DNS failover** | Change DNS records to route to backup | Minutes (TTL dependent) |

**Active-Active** is preferred for high availability but requires:
- Stateless services (no session affinity issues)
- Data replication (both regions have data)
- Conflict resolution (both regions writing simultaneously)

**Follow-ups:**
- "RTO vs RPO?" → **RTO** (Recovery Time Objective) = max acceptable downtime. **RPO** (Recovery Point Objective) = max acceptable data loss (time). Active-Active: RTO ≈ 0, RPO ≈ 0. Active-Passive: RTO = minutes, RPO depends on replication lag
- "Multi-region failover?" → Deploy in 2+ AWS regions. Route53 health checks → failover DNS. Data replicated via DynamoDB Global Tables or Aurora Global DB

🔥 **Most Asked**: Active-Active vs Active-Passive, RTO/RPO definitions
🧠 **Strategy**: State the trade-off: Active-Active = higher availability but much higher complexity and cost

---

## 52. Global Load Balancing

### Q: How does global load balancing work for geo-distributed users?

**Answer (Interview-Ready):**
- **GSLB** (Global Server Load Balancing) routes users to the nearest data center based on geographic location

**Methods:**
- **GeoDNS**: DNS resolver returns IP of nearest data center based on client's IP geolocation
- **Anycast**: Same IP advertised from multiple locations. BGP routing directs to nearest. Used by Cloudflare, Google
- **Latency-based routing**: Measure latency to each region → route to lowest. AWS Route53 supports this
- **Geofencing**: Force traffic to specific regions for compliance (GDPR data must stay in EU)

**Follow-ups:**
- "What if the nearest data center is down?" → Health checks remove unhealthy regions from DNS. Traffic routes to next-nearest. Automated failover
- "Anycast vs GeoDNS?" → Anycast is faster failover (BGP-level, seconds). GeoDNS relied on DNS TTL (minutes). Anycast is preferred for latency-sensitive services

🔥 **Most Asked**: GeoDNS, Anycast, latency-based routing
🧠 **Strategy**: Mention this when designing any global-scale system (social media, CDN, streaming)

---
---

# Part D — Databases & Storage

## 53. Database Fundamentals

### Q: What are the key properties and concepts every database must address?

**Answer (Interview-Ready):**

**ACID (Relational DBs):**
- **Atomicity**: Transaction is all-or-nothing
- **Consistency**: Transaction moves DB from one valid state to another
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed data survives crashes (written to disk/WAL)

**BASE (NoSQL DBs):**
- **Basically Available**: System guarantees availability
- **Soft state**: State may change over time (due to eventual consistency)
- **Eventually consistent**: Given time, all replicas converge

**Key concepts:**
- **Write-Ahead Log (WAL)**: Write to log before modifying data. Enables crash recovery
- **B-Tree**: Default index structure in most RDBs. O(log n) lookups. Optimized for disk-based storage
- **LSM Tree**: Used by Cassandra, RocksDB. Fast writes (append-only). Background compaction. Optimized for write-heavy workloads
- **MVCC**: Multi-Version Concurrency Control. Readers don't block writers. Each transaction sees a snapshot. Used by PostgreSQL, MySQL InnoDB

🔥 **Most Asked**: ACID vs BASE, B-Tree vs LSM Tree, MVCC concept
🧠 **Strategy**: Know ACID cold. Know B-Tree vs LSM for "why did you choose this DB" questions

---

## 54. SQL vs NoSQL

### Q: When do you choose SQL vs NoSQL? Give real examples.

**Answer (Interview-Ready):**

| Aspect | SQL (Relational) | NoSQL |
|--------|------------------|-------|
| Schema | Fixed schema, defined upfront | Flexible/schemaless |
| Relationships | Strong (JOINs, foreign keys) | Weak (denormalized, embedded) |
| Scaling | Vertical (scale up). Horizontal is hard | Horizontal (scale out). Built for distribution |
| Transactions | Full ACID | Usually eventual consistency (some offer ACID) |
| Query | SQL (powerful, standardized) | Varies (MongoDB query syntax, CQL, etc.) |
| Best for | Complex queries, transactions, relationships | High throughput, flexible schema, large scale |

**Decision framework:**
- **Choose SQL**: Banking, e-commerce orders, inventory, reporting, anything with complex JOINs or strict consistency
- **Choose NoSQL Key-Value**: Session storage, caching, user preferences (Redis, DynamoDB)
- **Choose NoSQL Document**: Product catalogs, content management, user profiles (MongoDB, Couchbase)
- **Choose NoSQL Columnar**: Analytics, time-series, IoT (Cassandra, HBase)
- **Choose NoSQL Graph**: Social networks, recommendation engines, fraud detection (Neo4j)

**Modern reality:** Many databases blur the line. PostgreSQL has JSON support. MongoDB has transactions. DynamoDB has ACID. Choose based on primary access pattern, not dogma.

**Follow-ups:**
- "Can you use both?" → Yes. Polyglot persistence: SQL for orders (consistency), Redis for sessions (speed), Elasticsearch for search (full-text), S3 for files (cost)
- "Why not just PostgreSQL for everything?" → You can get very far with PostgreSQL. It handles JSON, full-text search, GIS data. Only switch when PostgreSQL can't scale or when a specialized DB is 10x better for the use case

🔥 **Most Asked**: Decision framework, polyglot persistence, real-world database selection
⚠️ **Common Mistakes**: Binary thinking (SQL OR NoSQL); choosing NoSQL for everything because "scalability"
🧠 **Strategy**: "Start with PostgreSQL. Add specialized databases when you hit a scaling or feature wall"

---

## 55. Types of NoSQL Databases

### Q: Explain the four main types of NoSQL databases with use cases.

**Answer (Interview-Ready):**

| Type | Data Model | Examples | Best For |
|------|-----------|----------|----------|
| **Key-Value** | Simple key → value pairs | Redis, DynamoDB, Memcached | Caching, sessions, leaderboards, config |
| **Document** | JSON/BSON documents | MongoDB, Couchbase, Firestore | Product catalogs, CMS, user profiles |
| **Column-Family** | Rows with dynamic columns grouped in families | Cassandra, HBase, ScyllaDB | Time-series, IoT, analytics, audit logs |
| **Graph** | Nodes + edges + properties | Neo4j, Amazon Neptune, ArangoDB | Social networks, fraud detection, recommendations |

**How to choose:**
- "I need sub-ms reads with simple key lookup" → **Key-Value** (Redis)
- "My data has nested objects, semi-structured, evolving schema" → **Document** (MongoDB)
- "I need to write millions of events/sec across regions" → **Column-Family** (Cassandra)
- "I need to traverse relationships (friends-of-friends)" → **Graph** (Neo4j)

**Follow-ups:**
- "What about time-series DBs?" → Specialized: InfluxDB, TimescaleDB (extension on PostgreSQL). Optimized for write-heavy, time-ordered data with automatic downsampling
- "Search engines?" → Elasticsearch/OpenSearch: inverted index for full-text search. Not a primary database — use alongside your main DB

🔥 **Most Asked**: When to use each type, real-world examples at scale
🧠 **Strategy**: Name a specific product for each type — shows industry awareness

---

## 56. Data Modeling: Relational vs Document

### Q: How does data modeling differ between relational and document databases?

**Answer (Interview-Ready):**

**Relational (Normalized):**
```
Users table → id, name, email
Orders table → id, user_id (FK), total, status
OrderItems table → id, order_id (FK), product_id, qty
```
- Normalize: Eliminate redundancy via JOINs
- Pro: No data duplication, strong consistency
- Con: Complex JOINs at read time

**Document (Denormalized):**
```json
{
  "userId": "123",
  "name": "Hruday",
  "orders": [
    {
      "orderId": "456",
      "total": 99.99,
      "items": [
        { "productId": "789", "name": "Widget", "qty": 2 }
      ]
    }
  ]
}
```
- Embed: Store related data together in one document
- Pro: Single read gets everything, no JOINs, fast
- Con: Data duplication, harder to update embedded data across documents

**When to embed vs reference (Document DB):**
- **Embed**: Data is read together, 1:few relationship, data doesn't change often
- **Reference**: Data changes frequently, many:many relationship, document would exceed 16MB (MongoDB limit)

🔥 **Most Asked**: Embed vs reference decision, when normalization matters
🧠 **Strategy**: "Model your data based on your query patterns, not your entity relationships"

---

## 57. Database Indexing

### Q: How do database indexes work and what are the trade-offs?

**Answer (Interview-Ready):**
- An **index** is a separate data structure (usually B-Tree) that maps column values → row locations
- Without index: Full table scan → O(n)
- With index: B-Tree lookup → O(log n)

**Types:**
| Index Type | Description | Use Case |
|-----------|------------|----------|
| **B-Tree** | Default. Balanced tree. Supports range queries | `WHERE age > 25` |
| **Hash** | O(1) exact match only. No range queries | `WHERE email = 'a@b.com'` |
| **Composite** | Multi-column (leftmost prefix rule) | `WHERE country = 'US' AND city = 'SF'` |
| **Covering** | Index includes all columns needed, no table lookup | Frequently queried column sets |
| **Partial/Filtered** | Index only rows matching a condition | `WHERE status = 'active'` (skip inactive) |
| **GIN/GiST** | PostgreSQL: full-text search, JSONB, arrays | `WHERE tags @> '{react}'` |

**Trade-offs:**
- ✅ Faster reads (orders of magnitude for large tables)
- ❌ Slower writes (index must be updated on every INSERT/UPDATE/DELETE)
- ❌ Storage overhead (index takes disk space)
- ❌ Too many indexes → write amplification, slower INSERTs

**Follow-ups:**
- "Leftmost prefix rule?" → Composite index on (A, B, C) can serve queries on A, or (A, B), or (A, B, C) — but NOT queries on just B or C
- "When NOT to index?" → Small tables, columns with low cardinality (e.g., boolean), tables with heavy writes and rare reads

🔥 **Most Asked**: B-Tree internals, composite index prefix rule, trade-offs
⚠️ **Common Mistakes**: Indexing every column; forgetting that indexes slow writes
🧠 **Strategy**: "Add indexes based on slow query log analysis, not upfront guesses"

---

## 58. Denormalization

### Q: When and why would you denormalize a database?

**Answer (Interview-Ready):**
- **Normalization** = eliminate data redundancy, split into related tables, use JOINs
- **Denormalization** = intentionally add redundancy to avoid expensive JOINs at read time

**When to denormalize:**
- Read-heavy workloads (100:1 read:write ratio)
- Slow queries due to multiple JOINs
- Caching patterns (pre-compute and store results)
- Reporting/analytics queries (materialized views, OLAP cubes)

**Techniques:**
| Technique | Example |
|-----------|---------|
| **Add redundant column** | Store `user_name` in `orders` table (avoid JOIN to `users`) |
| **Materialized view** | Pre-computed query result stored as table, refreshed periodically |
| **Aggregate table** | Store `daily_revenue` instead of computing from all orders |
| **Embedding** | Store `address` inside `user` document (Document DB) |
| **CQRS** | Separate read model (denormalized) from write model (normalized) |

**Trade-offs:**
- ✅ Faster reads (no JOINs)
- ❌ Data redundancy → update anomalies
- ❌ Must update all copies when source changes
- ❌ More storage

**Follow-ups:**
- "How do you keep denormalized data consistent?" → (1) Triggers/stored procedures, (2) Application-level sync, (3) CDC (Change Data Capture) streams, (4) Materialized views with auto-refresh
- "CQRS relationship?" → CQRS naturally leads to denormalization: write model is normalized (for consistency), read model is denormalized (for performance)

🔥 **Most Asked**: When to denormalize, how to keep consistency, CQRS connection
🧠 **Strategy**: "Normalize by default. Denormalize surgically based on measured read performance bottlenecks"

---

## 59. Database Sharding

### Q: What is sharding and how do you implement it?

**Answer (Interview-Ready):**
- **Sharding** = horizontal partitioning of data across multiple database instances (shards)
- Each shard holds a subset of the data. Together, all shards hold the full dataset

**Sharding strategies:**

| Strategy | How | Pros | Cons |
|----------|-----|------|------|
| **Range-based** | Shard by range (users A-M → shard1, N-Z → shard2) | Simple, range queries efficient | Hot spots if distribution is uneven |
| **Hash-based** | hash(user_id) % N = shard number | Even distribution | Range queries span all shards |
| **Directory-based** | Lookup table maps key → shard | Flexible, can rebalance | Lookup table is single point of failure |
| **Geo-based** | Shard by region (US → shard1, EU → shard2) | Data locality, compliance | Cross-region queries are expensive |

**Challenges:**
- **Cross-shard queries**: JOINs across shards are very expensive → denormalize or use scatter-gather
- **Resharding**: Adding shards requires data migration. Consistent hashing helps minimize data movement
- **Transactions**: Distributed transactions across shards are complex (2PC, Saga)
- **Shard key choice**: Wrong key → hot shards, data skew. Choose high-cardinality, evenly distributed key

**Follow-ups:**
- "How does Discord shard?" → By guild (server) ID. Each shard handles a subset of guilds. Messages stay within a shard
- "What if one shard gets too big?" → Split the shard further (re-partition). Or use consistent hashing from day 1 to make splitting easier

🔥 **Most Asked**: Sharding strategies, shard key selection, cross-shard JOIN problem
⚠️ **Common Mistakes**: Sharding too early; choosing a low-cardinality shard key (e.g., country)
🧠 **Strategy**: "Don't shard until you have to. Vertical scaling + read replicas can take you very far"

---

## 60. Data Partitioning Strategies

### Q: What are the differences between horizontal and vertical partitioning?

**Answer (Interview-Ready):**

| Type | What it splits | Example |
|------|---------------|---------|
| **Horizontal** (Sharding) | Rows across databases | Users 1-1M → DB1, Users 1M-2M → DB2 |
| **Vertical** | Columns into separate tables/DBs | User profile in DB1, User activity logs in DB2 |
| **Functional** | By feature/service | Orders DB, Payments DB, Inventory DB (microservice-style) |

**Horizontal partitioning within a single DB (table partitioning):**
- PostgreSQL supports `PARTITION BY RANGE`, `PARTITION BY LIST`, `PARTITION BY HASH`
- Benefits: Partition pruning (query only relevant partition), easier maintenance (drop old partitions for time-series), parallel scans
- Example: `orders` partitioned by `created_at` monthly — query for current month only scans current partition

**Follow-ups:**
- "Partitioning vs sharding?" → **Partitioning** = within one DB instance (managed by DB engine). **Sharding** = across multiple DB instances (managed by application or middleware). Partitioning is simpler, sharding scales further
- "When to use vertical partitioning?" → When some columns are accessed frequently (name, email) and others rarely (bio, avatar_url). Split to keep hot table slim and fast

🔥 **Most Asked**: Horizontal vs vertical, partitioning vs sharding distinction
🧠 **Strategy**: Partition first (within one DB), shard only when a single instance can't handle the load

---

## 61. Database Replication

### Q: How does database replication work? What are the strategies?

**Answer (Interview-Ready):**
- **Replication** = maintaining copies of data across multiple database servers

**Replication topologies:**

| Topology | How | Pros | Cons |
|----------|-----|------|------|
| **Single-leader** | One primary (writes), N replicas (reads) | Simple, strong consistency on primary | Primary is write bottleneck, failover complexity |
| **Multi-leader** | Multiple primaries accept writes, replicate to each other | Write availability in multiple regions | Conflict resolution is complex |
| **Leaderless** | Any node accepts reads AND writes. Quorum-based | Highly available, no failover needed | Eventual consistency, conflict resolution |

**Replication methods:**
- **Synchronous**: Primary waits for replica acknowledgment before confirming write. Strong consistency, higher latency
- **Asynchronous**: Primary confirms write immediately, replicates in background. Low latency, risk of data loss on primary failure
- **Semi-synchronous**: Primary waits for at least one replica. Balance of safety and performance (MySQL default)

**Replication lag**: Time between write on primary and availability on replica. Can cause stale reads. Mitigations: read-your-writes consistency, monotonic reads, causal consistency

**Follow-ups:**
- "How does failover work?" → Automatic: health checks detect primary failure → promote replica → update DNS/routing. Risk: split-brain if old primary comes back. Use STONITH (Shoot The Other Node In The Head) / fencing
- "Quorum reads/writes?" → N replicas, W writes, R reads. If W + R > N, guaranteed consistency. DynamoDB: N=3, W=2, R=2

🔥 **Most Asked**: Single-leader vs multi-leader, sync vs async, replication lag solutions
🧠 **Strategy**: "Default to single-leader async replication. Multi-leader only for multi-region active-active"

---

## 62. Consistent Hashing

### Q: What is consistent hashing and why is it critical for distributed systems?

**Answer (Interview-Ready):**
- **Problem**: Regular hash (key % N) redistributes ~all keys when N (number of servers) changes
- **Consistent hashing**: Uses a hash ring. Only K/N keys (on average) need to move when adding/removing a node

**How it works:**
1. Hash servers onto a ring (0 to 2^32 - 1)
2. Hash each key onto the same ring
3. Key is assigned to first server found clockwise on the ring
4. Adding server X: only keys between X's predecessor and X move to X
5. Removing server Y: keys that were on Y move to Y's successor

**Virtual nodes**: Each physical server gets multiple positions on the ring (e.g., 150-200 virtual nodes). Ensures even distribution. Prevents hotspots from uneven server placement on ring

**Real-world usage:**
- **DynamoDB**: Consistent hashing for partition assignment
- **Cassandra**: Token ring with virtual nodes
- **CDN**: Route requests to nearest cache node
- **Load balancers**: Consistent hashing mode for sticky-like routing without session state

```
Ring:   0 ----[Server A]---- [Server B]---- [Server C]---- 2^32
Key "user:123" hashes to position between A and B → assigned to B
Add Server D between A and B → only keys between A and D move to D
```

**Follow-ups:**
- "Hotspot problem?" → Without virtual nodes, data can be very skewed. Virtual nodes spread each server across the ring, making distribution much more even
- "Alternatives?" → **Rendezvous hashing** (highest random weight): hash each (key, server) pair, assign key to server with highest score. Simpler, good for small N. **Jump consistent hashing**: O(1) memory, fast, but only works with sequential server IDs

🔥 **Most Asked**: How the ring works, virtual nodes, why K/N redistribution
⚠️ **Common Mistakes**: Forgetting virtual nodes in the explanation; not mentioning the key redistribution benefit
🧠 **Strategy**: Draw the ring. Every interviewer expects the ring diagram. This is a must-know topic

---

## 63. CAP Theorem

### Q: Explain the CAP theorem and its practical implications.

**Answer (Interview-Ready):**
- **CAP Theorem**: In a distributed system, you can only guarantee 2 of 3:
  - **C**onsistency: Every read receives the most recent write
  - **A**vailability: Every request receives a response (even if stale)
  - **P**artition tolerance: System continues despite network partitions

**In practice**, network partitions WILL happen. So the real choice is **CP vs AP** during a partition:
- **CP** (Consistency over Availability): Reject requests if data might be stale. Example: MongoDB (single-leader), HBase, Zookeeper, banking systems
- **AP** (Availability over Consistency): Serve requests even with potentially stale data. Example: Cassandra, DynamoDB (default), DNS, social media feeds

**PACELC extension**: If no Partition, choose Latency vs Consistency:
- **PA/EL** (DynamoDB): Available during partition, low latency normally → eventual consistency
- **PC/EC** (traditional RDBMS): Consistent during partition, consistent normally → higher latency
- **PA/EC** (Cosmos DB strong mode): Available during partition, consistent normally

**Follow-ups:**
- "Is CAP binary?" → No. It's a spectrum. You can tune per-request. DynamoDB: strong consistency read vs eventual consistency read. Cassandra: adjust W and R quorum levels
- "What does Google Spanner do?" → Claims to achieve CA by using TrueTime (atomic clocks + GPS) to minimize partition impact. Still technically CP — unavailable during partitions, but partitions are extremely rare in Google's private network

🔥 **Most Asked**: CP vs AP examples, PACELC extension, Spanner exception
⚠️ **Common Mistakes**: Saying "I choose CA" (you can't in a distributed system); treating CAP as all-or-nothing
🧠 **Strategy**: "In interviews, immediately say partitions are guaranteed → the real choice is CP vs AP"

---

## 64. Database Transactions & Isolation Levels

### Q: What are the transaction isolation levels and their trade-offs?

**Answer (Interview-Ready):**

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|----------------|-----------|---------------------|-------------|-------------|
| **Read Uncommitted** | ✅ Possible | ✅ Possible | ✅ Possible | Fastest |
| **Read Committed** | ❌ Prevented | ✅ Possible | ✅ Possible | Fast (PostgreSQL default) |
| **Repeatable Read** | ❌ | ❌ Prevented | ✅ Possible | Moderate (MySQL InnoDB default) |
| **Serializable** | ❌ | ❌ | ❌ Prevented | Slowest |

**Anomalies explained:**
- **Dirty read**: Read data from uncommitted transaction (could be rolled back)
- **Non-repeatable read**: Same query returns different value because another transaction updated it between reads
- **Phantom read**: Same range query returns different set of rows because another transaction inserted/deleted

**MVCC** (used by PostgreSQL, MySQL InnoDB): Each transaction sees a snapshot. Readers don't block writers. Provides Repeatable Read without locking. PostgreSQL's Repeatable Read actually prevents phantoms too (snapshot isolation)

**Follow-ups:**
- "What's optimistic vs pessimistic locking?" → **Pessimistic**: Lock row before reading (`SELECT FOR UPDATE`). Safe but blocks others. **Optimistic**: Read without lock, check version on write, retry if changed. Better for low-contention workloads
- "Serializable in practice?" → Use sparingly. PostgreSQL SSI (Serializable Snapshot Isolation) detects conflicts and aborts transactions. Performance hit is moderate. Use for critical financial operations

🔥 **Most Asked**: Isolation levels table, dirty/phantom reads, optimistic vs pessimistic locking
🧠 **Strategy**: Know the table cold. Mention MVCC as the implementation detail that makes this efficient

---

## 65. Distributed Transactions

### Q: How do you handle transactions spanning multiple services or databases?

**Answer (Interview-Ready):**

| Pattern | How | Consistency | Complexity |
|---------|-----|-------------|------------|
| **2PC (Two-Phase Commit)** | Coordinator → prepare all → commit all (or rollback all) | Strong (ACID) | High (blocking, coordinator SPOF) |
| **3PC** | Adds pre-commit phase to avoid blocking | Strong | Very high (rarely used in practice) |
| **Saga** | Chain of local transactions + compensating actions | Eventual | Moderate (must define compensation for each step) |
| **Outbox Pattern** | Write to DB + outbox table in same local transaction. Separate process publishes events | Eventual | Moderate |

**Saga patterns:**
- **Choreography**: Each service publishes events, next service reacts. No central coordinator. Pro: Decoupled. Con: Hard to track, debug
- **Orchestration**: Central orchestrator tells each service what to do. Pro: Clear flow, easier monitoring. Con: Orchestrator is a coordinator

**Example — Order placement saga (orchestration):**
1. Create order (PENDING)
2. Reserve inventory → success
3. Process payment → success
4. Confirm order (CONFIRMED)
5. If payment fails → compensate: release inventory, cancel order

**Follow-ups:**
- "Outbox pattern in detail?" → Write order + event to same DB in one transaction. CDC (Debezium) or poller reads outbox table → publishes to Kafka. Guarantees at-least-once delivery. Consumers must be idempotent
- "2PC vs Saga?" → 2PC for strong consistency across few participants (rare in microservices). Saga for eventual consistency across many services (standard in microservices)

🔥 **Most Asked**: Saga choreography vs orchestration, outbox pattern, why 2PC is avoided in microservices
🧠 **Strategy**: "Default to Saga with orchestration. 2PC only if you absolutely need strong consistency and can tolerate the performance hit"

---

## 66. Schema Design & Migrations

### Q: How do you design schemas and handle migrations in production?

**Answer (Interview-Ready):**

**Schema design principles:**
- Design for your query patterns (especially in NoSQL)
- Normalize to 3NF for write-heavy OLTP systems
- Denormalize for read-heavy OLAP/reporting systems
- Use UUIDs vs auto-increment IDs: UUIDs for distributed systems (no coordination needed), auto-increment for single-DB (smaller, faster index)

**Migration best practices:**
- **Forward-only migrations**: Never edit past migrations. Create new ones
- **Backward-compatible changes**: Add columns as nullable first. Deploy code that handles both old and new schema. Then backfill. Then make non-nullable
- **Zero-downtime migrations**:
  1. Add new column (nullable)
  2. Deploy code that writes to both old and new columns
  3. Backfill old data
  4. Deploy code that reads from new column
  5. Drop old column

**Tools:** Flyway, Liquibase (Java), Alembic (Python), Prisma Migrate (Node)

**Dangerous operations to avoid in production:**
- `ALTER TABLE ... ADD COLUMN ... NOT NULL` (locks table in MySQL)
- `CREATE INDEX` without `CONCURRENTLY` (locks table in PostgreSQL)
- Renaming columns (breaks running code during deployment)

**Follow-ups:**
- "How to add an index without downtime?" → PostgreSQL: `CREATE INDEX CONCURRENTLY`. MySQL: pt-online-schema-change or gh-ost
- "Blue-green database deployments?" → Risky. Both versions must read/write same DB during transition. Use expand-and-contract pattern (add column → dual-write → migrate reads → drop old column)

🔥 **Most Asked**: Zero-downtime migrations, backward-compatible changes, dangerous ALTER TABLE operations
🧠 **Strategy**: Expand-and-contract pattern is the answer to almost every "how do you change schema in production" question

---

## 67. Connection Pooling

### Q: Why is connection pooling critical for database performance?

**Answer (Interview-Ready):**
- **Problem**: Creating a DB connection is expensive (TCP handshake, TLS, authentication, session setup) — ~5-50ms per connection
- **Solution**: Maintain a pool of pre-established connections. Application borrows from pool, uses it, returns it

**How it works:**
1. Pool initialized with `minConnections` (e.g., 10)
2. Request arrives → borrow idle connection from pool
3. Execute query
4. Return connection to pool (don't close it)
5. If pool exhausted → wait (with timeout) or create new connection up to `maxConnections`

**Key settings:**
| Setting | Typical Value | Purpose |
|---------|--------------|---------|
| `minPoolSize` | 5-10 | Warm connections always ready |
| `maxPoolSize` | 20-50 | Prevent DB overload |
| `connectionTimeout` | 5s | Max wait for available connection |
| `idleTimeout` | 10min | Close unused connections |
| `maxLifetime` | 30min | Recycle connections (avoid stale) |

**Connection poolers:**
- **Application-level**: HikariCP (Java, fastest), c3p0, pg-pool (Node)
- **External proxy**: PgBouncer (PostgreSQL), ProxySQL (MySQL). Sits between app and DB. Multiplexes thousands of app connections into fewer DB connections

**Follow-ups:**
- "Pool size formula?" → `maxPoolSize = (core_count * 2) + effective_spindle_count`. For SSDs: `core_count * 2 + 1` is a good starting point. HikariCP recommends not exceeding 10 per CPU core
- "What happens when pool is exhausted?" → Requests queue, latency spikes, eventually timeouts and errors. Monitor pool utilization. If consistently >80%, increase pool or optimize queries

🔥 **Most Asked**: Why pooling matters, HikariCP, pool sizing
🧠 **Strategy**: Mention HikariCP for Java, PgBouncer for PostgreSQL. Both are industry standards

---

## 68. Query Optimization

### Q: How do you optimize slow database queries?

**Answer (Interview-Ready):**

**Step-by-step approach:**
1. **Enable slow query log**: Identify queries taking >1s
2. **EXPLAIN ANALYZE**: See execution plan, actual times, row counts
3. **Look for**: Sequential scans on large tables, nested loops, high row estimates vs actuals
4. **Fix in order of impact**:

| Technique | When | Example |
|-----------|------|---------|
| **Add index** | Filter/sort on non-indexed column | `CREATE INDEX idx_orders_user_id ON orders(user_id)` |
| **Rewrite query** | Subquery when JOIN works better | Convert `IN (SELECT ...)` to `JOIN` |
| **Limit result set** | Returning too many rows | Add `LIMIT`, pagination, or stricter `WHERE` |
| **Avoid SELECT *** | Fetching unnecessary columns | Select only needed columns → covering index opportunity |
| **Use batch operations** | N+1 query problem | Replace N individual SELECTs with one `WHERE id IN (...)` |
| **Materialized views** | Expensive repeated aggregations | Pre-compute, refresh periodically |
| **Partition pruning** | Huge tables with time-based queries | Partition by month → only scan relevant partition |

**N+1 problem:**
```
// BAD: 1 query for users + N queries for orders
users = SELECT * FROM users;
for user in users:
    orders = SELECT * FROM orders WHERE user_id = user.id;

// GOOD: 2 queries total
users = SELECT * FROM users;
orders = SELECT * FROM orders WHERE user_id IN (user_ids);
```

**Follow-ups:**
- "What's a covering index?" → Index that contains ALL columns the query needs. DB reads from index only, never touches the table. Fastest possible read
- "When would you use a query hint?" → Last resort. Force index usage when optimizer chooses wrong plan. `/*+ INDEX(orders idx_user_id) */` in Oracle, `USE INDEX` in MySQL

🔥 **Most Asked**: EXPLAIN ANALYZE, N+1 problem, covering index
🧠 **Strategy**: "Measure first, optimize second. 90% of slow queries are fixed by adding the right index"

---

## 69. Read/Write Splitting

### Q: How does read/write splitting work with database replicas?

**Answer (Interview-Ready):**
- **Pattern**: Route writes to primary, reads to replicas
- **Benefit**: Offload read traffic (often 90% of queries) from primary → primary handles writes better

**Implementation approaches:**
1. **Application-level**: ORM/driver configuration. Spring `@Transactional(readOnly=true)` → routes to replica. Explicit choice per query
2. **Proxy-level**: ProxySQL, PgBouncer, or AWS RDS Proxy auto-routes based on query type (SELECT → replica, INSERT/UPDATE/DELETE → primary)
3. **DNS-level**: Separate endpoints. `db-primary.example.com` for writes, `db-replica.example.com` for reads

**Replication lag challenge:**
- User writes a comment → immediately reads → comment not on replica yet → "where's my comment?"
- **Solutions**: 
  - Read-after-write consistency: After a write, read from primary for that user for next 5s
  - Monotonic reads: Pin user to same replica (consistent within one replica)
  - Version tracking: Client sends version number, replica only serves if it has that version

**Follow-ups:**
- "How does Amazon handle this?" → Aurora: Single writer endpoint, multiple reader endpoints. Aurora replicas share the same storage layer → replication lag <10ms (often <1ms)
- "What about connection pooling with read/write splitting?" → Pool needs separate pools for primary and replica connections. Most proxies handle this automatically

🔥 **Most Asked**: How to handle replication lag, read-after-write consistency
🧠 **Strategy**: "Read/write splitting is the easiest scaling win. 10x read capacity by adding replicas"

---

## 70. Time-Series & Specialized Databases

### Q: When would you use specialized databases like time-series, graph, or search engines?

**Answer (Interview-Ready):**

| Specialized DB | When to Use | Examples | Key Feature |
|---------------|-------------|---------|-------------|
| **Time-Series** | IoT, metrics, monitoring, financial data | InfluxDB, TimescaleDB, QuestDB | Auto-downsampling, retention policies, fast time-range queries |
| **Graph** | Social networks, knowledge graphs, fraud detection | Neo4j, Neptune, ArangoDB | Traversal queries (friends-of-friends) in O(1) per hop |
| **Search Engine** | Full-text search, autocomplete, faceted search | Elasticsearch, OpenSearch | Inverted index, BM25 ranking, near real-time indexing |
| **Vector DB** | AI/ML embeddings, semantic search, RAG | Pinecone, Weaviate, pgvector | ANN (Approximate Nearest Neighbor), cosine similarity |
| **Spatial** | Maps, location-based services, geofencing | PostGIS, MongoDB geospatial | R-tree index, geo queries (within radius, intersects polygon) |

**Decision principle:** Use PostgreSQL until you can't. Then add specialized DB for the specific workload:
- Log aggregation? → Elasticsearch (full-text) + Kafka (ingestion)
- Real-time dashboards? → InfluxDB/Grafana or TimescaleDB
- Recommendations? → Neo4j for graph-based, Vector DB for embedding-based
- Semantic search? → pgvector (if small scale) or Pinecone/Weaviate (at scale)

**Follow-ups:**
- "TimescaleDB vs InfluxDB?" → TimescaleDB is an extension on PostgreSQL (SQL interface, familiar tooling). InfluxDB has its own query language (Flux). TimescaleDB if you already use PostgreSQL; InfluxDB for pure metrics workloads
- "Elasticsearch as primary DB?" → No. It can lose data (async writes). Use as secondary alongside a primary DB. Source of truth in PostgreSQL, search index in Elasticsearch, sync via CDC/events

🔥 **Most Asked**: When to use Elasticsearch, graph DB use cases, vector DB for AI
🧠 **Strategy**: "Don't introduce a specialized DB unless the primary DB demonstrably can't handle the workload"

---

## 71. Object Storage & Blob Storage

### Q: How do cloud object storage systems like S3 work and when should you use them?

**Answer (Interview-Ready):**
- **Object storage** = flat namespace for storing unstructured data (files, images, videos, backups)
- No hierarchy (folders are simulated via key prefixes like `images/profile/user123.jpg`)
- Each object = data + metadata + unique key

**S3 characteristics:**
- **Durability**: 99.999999999% (11 nines) — stores across 3+ AZs
- **Availability**: 99.99% (Standard tier)
- **Scalability**: Virtually unlimited storage and throughput
- **Cost**: ~$0.023/GB/month (Standard), ~$0.004/GB (Glacier for archives)
- **Performance**: 5,500 GET/s and 3,500 PUT/s per prefix. Distribute across prefixes for higher throughput

**Storage tiers**: S3 Standard → S3 Infrequent Access → S3 Glacier → S3 Glacier Deep Archive. Lifecycle policies auto-move objects between tiers based on age

**When to use:**
- Static assets (images, CSS, JS for web apps)
- User uploads (profile photos, documents)
- Backups and logs
- Data lake storage (analytics, ML training data)
- CDN origin (CloudFront → S3)

**Follow-ups:**
- "Pre-signed URLs?" → Generate a URL with temporary access (e.g., 15min). User uploads/downloads directly to S3 without going through your server. Reduces server load
- "Multipart upload?" → For files >100MB. Split into parts, upload in parallel, S3 assembles. Resume failed parts without restarting

🔥 **Most Asked**: Pre-signed URLs, lifecycle policies, S3 throughput optimization
🧠 **Strategy**: Always use S3/object storage for file storage in system design. Never store files in your database

---

## 72. Data Lakes & Data Warehouses

### Q: Explain the differences between a data lake, data warehouse, and data lakehouse.

**Answer (Interview-Ready):**

| Aspect | Data Lake | Data Warehouse | Data Lakehouse |
|--------|-----------|---------------|----------------|
| **Data** | Raw, unstructured, semi-structured | Structured, cleaned, transformed | Both raw and structured |
| **Schema** | Schema-on-read | Schema-on-write | Schema-on-read with schema enforcement |
| **Format** | Parquet, JSON, CSV, images | Tables (columnar) | Open table formats (Delta, Iceberg) |
| **Users** | Data engineers, data scientists | Business analysts, BI tools | Both |
| **Cost** | Low (cheap storage like S3) | High (compute + storage coupled) | Moderate (decoupled) |
| **Examples** | S3 + Spark | Snowflake, Redshift, BigQuery | Databricks (Delta Lake), Apache Iceberg |

**Data Lakehouse** = best of both worlds:
- Cheap storage of a data lake (S3/ADLS)
- ACID transactions and BI query performance of a warehouse
- Open formats: Delta Lake, Apache Iceberg, Apache Hudi

**Follow-ups:**
- "ETL vs ELT?" → **ETL**: Extract → Transform → Load (transform before loading into warehouse). **ELT**: Extract → Load → Transform (load raw into lake, transform in-place). ELT is modern standard (cheaper storage, flexible)
- "When does a startup need a data warehouse?" → When you need business analytics beyond what your OLTP DB can handle. Usually after product-market fit when you need dashboards, cohort analysis, etc.

🔥 **Most Asked**: Lake vs warehouse, ETL vs ELT, lakehouse concept
🧠 **Strategy**: Modern answer is "data lakehouse" — combine cheap storage with SQL query engine

---

## 73. NewSQL Databases

### Q: What are NewSQL databases and when would you choose them?

**Answer (Interview-Ready):**
- **NewSQL** = distributed SQL databases that provide ACID transactions at scale. Best of SQL (consistency, SQL interface) + NoSQL (horizontal scaling)

| Database | Key Feature | Used By |
|----------|------------|---------|
| **Google Spanner** | Globally distributed, TrueTime (atomic clocks) | Google (AdWords, Play Store) |
| **CockroachDB** | Spanner-inspired, open source, PostgreSQL wire protocol | DoorDash, Netflix |
| **TiDB** | MySQL compatible, HTAP (OLTP+OLAP) | PingCAP, BookMyShow |
| **YugabyteDB** | PostgreSQL compatible, geo-distributed | Kroger, Avis |
| **Vitess** | MySQL sharding middleware (not quite NewSQL) | YouTube, Slack, HubSpot |

**When to choose NewSQL:**
- Need ACID transactions + horizontal scaling
- Global distribution with strong consistency
- Want SQL interface (existing tooling works)
- Multi-region active-active deployments

**Trade-offs:**
- Higher latency than single-node PostgreSQL (consensus overhead)
- More complex operations
- Vendor lock-in (Spanner) or operational complexity (CockroachDB)

🔥 **Most Asked**: Spanner's TrueTime, CockroachDB vs PostgreSQL, when NewSQL makes sense
🧠 **Strategy**: "If you need globally distributed ACID transactions, NewSQL. Otherwise, PostgreSQL + read replicas"

---

## 74. Database Comparison for System Design

### Q: How do you choose the right database for a system design problem?

**Answer (Interview-Ready):**

**Decision tree:**
```
Need ACID transactions? 
  → Yes: PostgreSQL / MySQL / NewSQL
  → No: Continue
  
Need key-value lookups at massive scale?
  → Yes: DynamoDB / Redis
  → No: Continue
  
Need flexible schema with nested documents?
  → Yes: MongoDB
  → No: Continue

Need write-heavy time-series data?
  → Yes: Cassandra / InfluxDB / TimescaleDB
  → No: Continue

Need graph traversals?
  → Yes: Neo4j / Neptune
  → No: Continue

Need full-text search?
  → Yes: Elasticsearch (secondary index)
  → No: Continue

Need ML embeddings / semantic search?
  → Yes: pgvector / Pinecone / Weaviate
```

**Common system design database choices:**
| System | Primary DB | Secondary | Cache |
|--------|-----------|-----------|-------|
| **URL Shortener** | DynamoDB (key-value) | — | Redis |
| **Social Network** | PostgreSQL (users) | Neo4j (graph), Elasticsearch (search) | Redis |
| **Chat App** | Cassandra (messages) | PostgreSQL (users) | Redis |
| **E-Commerce** | PostgreSQL (orders) | Elasticsearch (product search) | Redis |
| **Analytics** | ClickHouse/Redshift (OLAP) | — | — |
| **Ride-sharing** | PostgreSQL + PostGIS | Redis (real-time location) | — |

🔥 **Most Asked**: Database selection justification, polyglot persistence
🧠 **Strategy**: Always justify your choice with "because the primary access pattern is X, and this DB is optimized for X"

---

## 75. Multi-Tenancy in Databases

### Q: What are the approaches to multi-tenancy in database design?

**Answer (Interview-Ready):**

| Approach | How | Isolation | Cost | Complexity |
|----------|-----|-----------|------|------------|
| **Shared DB, Shared Schema** | All tenants in same tables. `tenant_id` column | Low (row-level) | Lowest | Lowest (but must never forget WHERE tenant_id) |
| **Shared DB, Separate Schemas** | Each tenant gets own schema in same DB | Medium (schema-level) | Low | Medium |
| **Separate Databases** | Each tenant gets own database | Highest | Highest | Highest (provisioning, migrations per tenant) |

**When to use:**
- **Shared schema**: SaaS with many small tenants (1000s+). B2C products
- **Separate schemas**: Medium tenants needing logical separation. PostgreSQL schemas work well
- **Separate databases**: Enterprise customers requiring physical isolation (compliance, performance guarantees)

**Row-Level Security (PostgreSQL):**
```sql
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant')::int);
```
→ Automatically filters ALL queries by tenant_id. Can't accidentally access another tenant's data

**Follow-ups:**
- "Noisy neighbor problem?" → One tenant's heavy query slows down all tenants in shared DB. Solutions: Query timeouts, resource quotas, connection limits per tenant, or tenant-aware query routing
- "Schema migration with 1000 tenants?" → Shared schema: migrate once. Separate schemas/DBs: must migrate each one. Use automated migration pipelines

🔥 **Most Asked**: Three approaches, when to use each, noisy neighbor problem
🧠 **Strategy**: "Start with shared schema + tenant_id + RLS. Offer dedicated DB as a premium tier for enterprise customers"

---

## 76. Schema Migration Patterns

### Q: What are safe patterns for evolving database schemas in production?

**Answer (Interview-Ready):**

**Expand-Contract Pattern (the gold standard):**
1. **Expand**: Add new column/table alongside old one
2. **Migrate**: Dual-write to both, backfill old data
3. **Shift**: Switch reads to new column/table
4. **Contract**: Remove old column/table

**Safe operations (no downtime):**
- Add nullable column
- Add new table
- Add index CONCURRENTLY (PostgreSQL)
- Add column with DEFAULT (PostgreSQL 11+, instant)

**Dangerous operations (may lock table):**
- Add NOT NULL column without DEFAULT (full table scan)
- Change column type (full rewrite)
- Rename column (breaks running code)
- Drop column (breaks running code reading it)
- Add index without CONCURRENTLY (table lock)

**Tools:**
| Tool | Language | Key Feature |
|------|---------|-------------|
| Flyway | Java | Version-based SQL migrations |
| Liquibase | Java | Changelog-based, rollback support |
| Alembic | Python | SQLAlchemy integration, auto-generation |
| Prisma Migrate | Node.js | Schema-first, TypeScript |
| gh-ost | MySQL | Online schema migration (no locks) |
| pgroll | PostgreSQL | Zero-downtime schema migrations |

**Follow-ups:**
- "How to rename a column safely?" → (1) Add new column, (2) dual-write to both, (3) backfill, (4) switch reads to new, (5) stop writing to old, (6) drop old. Takes multiple deployments
- "Rolling back a migration?" → Forward-only is safer. If migration is wrong, create a new migration to fix it. Rollback scripts can cause more problems than they solve

🔥 **Most Asked**: Expand-contract, dangerous operations list, zero-downtime migration
🧠 **Strategy**: "Always ask: can I make this change while the old code is still running? If no, use expand-contract"

---
---

# Part E — Caching

## 77. Caching Fundamentals

### Q: What is caching and why is it essential in system design?

**Answer (Interview-Ready):**
- **Cache** = a high-speed data storage layer that stores a subset of data so future requests are served faster than from the primary data store
- Speed: Redis/Memcached operate at microsecond latency vs millisecond for DBs
- Cache ratio: If 80% of reads hit cache (cache hit ratio 80%), you've offloaded 80% of DB load

**Where caching happens (layered):**
| Layer | Cache | Latency | Example |
|-------|-------|---------|---------|
| **Client** | Browser cache, Local Storage | 0ms | `Cache-Control: max-age=3600` |
| **CDN** | Edge servers worldwide | 1-50ms | CloudFront, Akamai, Fastly |
| **API Gateway** | Response cache | 1-5ms | Kong, AWS API Gateway cache |
| **Application** | In-process cache | <1ms | HashMap, Guava Cache, Node-cache |
| **Distributed Cache** | Shared cache cluster | 1-5ms | Redis, Memcached |
| **Database** | Query cache, buffer pool | 1-10ms | PostgreSQL shared_buffers, MySQL query cache |

**Cache types:**
- **Local/In-process cache**: Fast (no network hop). But not shared across instances. Inconsistency risk with multiple servers
- **Distributed cache**: Shared across all app instances. Consistent. Network hop adds small latency. Redis/Memcached
- **Multi-level**: L1 = local (in-process), L2 = distributed (Redis). Check L1 first → L2 → DB

🔥 **Most Asked**: Caching layers, local vs distributed, cache hit ratio importance
🧠 **Strategy**: In system design, always mention caching for hot data. "I'd put a Redis cache in front of the DB for frequently accessed data"

---

## 78. Caching Strategies

### Q: Explain the different caching strategies and when to use each.

**Answer (Interview-Ready):**

| Strategy | Flow | Best For | Drawback |
|----------|------|----------|----------|
| **Cache-Aside (Lazy)** | App checks cache → miss → read DB → populate cache | General purpose, read-heavy | First request always misses. Possible stale data |
| **Read-Through** | Cache itself loads from DB on miss | Simplify app code | Cache library must integrate with DB |
| **Write-Through** | Write to cache AND DB synchronously | Strong consistency | Higher write latency (write to both) |
| **Write-Behind (Write-Back)** | Write to cache, async flush to DB later | Write-heavy workloads | Risk of data loss if cache crashes before flush |
| **Write-Around** | Write directly to DB, bypass cache | Infrequently-read written data | Subsequent reads are cache misses |

**Most used in practice:** **Cache-Aside with TTL** (80% of use cases):
```
data = cache.get(key)
if data is None:           # Cache miss
    data = db.query(key)   # Read from DB
    cache.set(key, data, ttl=3600)  # Populate cache
return data
```

**Cache eviction policies:**
- **LRU** (Least Recently Used): Default for most caches. Good general purpose
- **LFU** (Least Frequently Used): Better for hot-key workloads
- **TTL-based**: Expire after fixed time. Simplest invalidation
- **Random**: Simple, surprisingly effective for some workloads

🔥 **Most Asked**: Cache-aside vs write-through, LRU eviction, TTL strategy
⚠️ **Common Mistakes**: Not setting TTL (cache grows unbounded); write-through without need (adds latency)
🧠 **Strategy**: "Cache-aside with TTL is the 80% answer. Only use write-through/write-behind for specific consistency requirements"

---

## 79. Cache Invalidation

### Q: "There are only two hard things in CS: cache invalidation and naming things." How do you handle cache invalidation?

**Answer (Interview-Ready):**

**Strategies:**

| Strategy | How | Consistency | Complexity |
|----------|-----|-------------|------------|
| **TTL-based** | Cache expires after fixed duration | Eventual (stale for up to TTL) | Lowest |
| **Event-based** | On write, publish event → delete cache key | Near-real-time | Medium |
| **Write-through** | Every write updates cache + DB together | Strong | Medium |
| **CDC-based** | DB change stream (Debezium) → invalidate cache | Near-real-time, decoupled | Higher |
| **Version-based** | Include version in cache key: `user:123:v5` | Strong | Medium |

**Common patterns:**
- **Delete on write (most common)**: On UPDATE user → `cache.delete("user:123")`. Next read triggers cache-aside refill. Simpler and safer than updating cache
- **Why delete instead of update?** → Avoids race conditions. Two concurrent updates could write stale data to cache. Deleting ensures next read gets latest from DB

**The thundering herd problem:**
- Popular key expires → 1000 concurrent requests all miss cache → all hit DB simultaneously → DB overload
- **Solutions**: 
  - **Locking/Singleflight**: First request locks, fetches from DB, populates cache. Others wait
  - **Early refresh**: Refresh cache before TTL expires (background refresh at 80% of TTL)
  - **Stale-while-revalidate**: Serve stale data immediately, refresh in background

**Follow-ups:**
- "Cache stampede vs thundering herd?" → Same concept. Stampede emphasizes the rate, herd emphasizes the volume. Both solved the same way
- "Multi-region cache invalidation?" → Event bus (Kafka/SNS) publishes invalidation events to all regions. Each region's cache consumer deletes locally. Eventual consistency across regions

🔥 **Most Asked**: Delete vs update cache, thundering herd, stale-while-revalidate
🧠 **Strategy**: "Delete on write + TTL as safety net. For hot keys, add singleflight/stale-while-revalidate"

---

## 80. Redis Deep Dive

### Q: Why is Redis the most popular distributed cache? What are its key features?

**Answer (Interview-Ready):**
- **Redis** = in-memory data structure store. Used as cache, message broker, session store, rate limiter, leaderboard, pub/sub

**Data structures:**
| Structure | Use Case | Example |
|-----------|----------|---------|
| **String** | Cache, counters | `SET user:123 "{json}"`, `INCR page_views` |
| **Hash** | Object storage | `HSET user:123 name "Hruday" age 28` |
| **List** | Queues, recent items | `LPUSH notifications "msg1"`, `RPOP` |
| **Set** | Unique items, tags | `SADD online_users "user123"` |
| **Sorted Set** | Leaderboards, ranking | `ZADD leaderboard 95 "player1"` |
| **Stream** | Event log, message queue | `XADD mystream * key value` |
| **HyperLogLog** | Cardinality estimation | Count unique visitors (~0.81% error, 12KB) |
| **Bitmap** | Bit-level operations | Daily active users, feature flags |

**Persistence options:**
- **RDB**: Point-in-time snapshots (fork + save to disk). Fast recovery, some data loss
- **AOF** (Append Only File): Log every write. Slower, but minimal data loss. `fsync` options: always (safest, slowest), everysec (good balance), no (OS decides)
- **RDB + AOF**: Best of both. Use AOF for durability, RDB for faster restarts

**Redis Cluster:**
- 16,384 hash slots distributed across master nodes
- Each master has 1+ replicas
- Automatic failover: replica promoted if master dies
- Client-side routing: `MOVED` redirect to correct shard

**Follow-ups:**
- "Redis vs Memcached?" → Redis: rich data structures, persistence, pub/sub, Lua scripting. Memcached: simpler, multi-threaded (better for pure string caching at very high throughput). Redis wins for 95% of use cases
- "Can Redis be a primary database?" → Yes, with Redis 7.0+ (RedisJSON, RediSearch, RedisGraph). But it's memory-bound (expensive at scale). Best as primary for datasets that fit in memory + require sub-ms latency (gaming, real-time analytics)

🔥 **Most Asked**: Data structures + use cases, persistence modes, cluster topology, Redis vs Memcached
🧠 **Strategy**: For any system design, say "Redis for caching and rate limiting." Know at least the top 5 data structures

---

## 81. CDN Caching & Edge Caching

### Q: How do CDNs cache content and what are the cache control mechanisms?

**Answer (Interview-Ready):**
- **CDN** = network of edge servers that cache content close to users
- Flow: User → nearest edge (cache hit? serve. miss? → origin server → cache at edge → serve)

**Cache control headers:**
| Header | Purpose | Example |
|--------|---------|---------|
| `Cache-Control: max-age=3600` | Cache for 1 hour | Static assets |
| `Cache-Control: s-maxage=600` | CDN-specific TTL (overrides max-age for CDN) | API responses cached at edge |
| `Cache-Control: no-cache` | Must revalidate with origin before serving | Dynamic content with ETags |
| `Cache-Control: no-store` | Never cache | Sensitive/private data |
| `Cache-Control: stale-while-revalidate=60` | Serve stale for 60s while refreshing in background | Performance optimization |
| `Vary: Accept-Encoding` | Cache different versions for different encodings | gzip vs brotli |
| `ETag` | Content hash for conditional requests | `If-None-Match` → 304 Not Modified |

**CDN caching strategies:**
- **Static assets**: Long TTL (1 year), content-hashed filenames (`app.a8f3c2.js`). Immutable caching
- **API responses**: Short TTL (30-300s) + `stale-while-revalidate`. Or no caching for personalized data
- **HTML pages**: Short TTL or no-cache with ETag. Revalidate on every request

**Cache invalidation at CDN:**
- **Purge**: Force remove specific URL from all edge servers
- **Versioned URLs**: `style.v2.css` → new URL = new cache entry. No purge needed
- **Soft purge**: Mark stale, serve while revalidating (Fastly)

🔥 **Most Asked**: Cache-Control headers, cache invalidation strategies, static vs dynamic caching
🧠 **Strategy**: "Hash filenames for static assets → immutable cache (1 year TTL). No purge ever needed"

---

## 82. Cache Patterns at Scale

### Q: What caching patterns do large-scale systems like Facebook/Netflix use?

**Answer (Interview-Ready):**

**Facebook TAO:**
- Graph-aware distributed cache for social graph queries
- Two-tier: L1 (leaf caches, one per region) → L2 (root caches, one per DB shard)
- Eventual consistency with version vectors
- Handles billions of reads/sec with sub-ms latency

**Netflix EVCache:**
- Distributed Memcached-based cache
- Cross-region replication (write to local + replicate to remote)
- Zone-aware client (read from same AZ first)
- Handles 30+ million requests/sec

**Patterns used by these systems:**

| Pattern | How | Why |
|---------|-----|-----|
| **Cache warming** | Pre-populate cache on deploy/startup | Avoid cold-start thundering herd |
| **Hierarchical caching** | L1 (local) → L2 (regional) → L3 (global) | Reduce L2 load, lower latency |
| **Request coalescing** | Deduplicate concurrent requests for same key | One DB query serves many waiters |
| **Negative caching** | Cache "not found" results too | Prevent DB hits for non-existent keys |
| **Hot key splitting** | Replicate hot keys across multiple shards | Prevent single-shard overload |
| **Cache compression** | Compress values (gzip/snappy) | Reduce memory usage 2-4x |

**Follow-ups:**
- "Cache warming strategy?" → On deployment, fetch top-N most accessed keys from analytics. Use a background job to warm cache before routing traffic. Canary deployment: warm one instance, then route traffic
- "Hot key problem?" → One key (celebrity profile, viral post) gets millions of reads. Single Redis node overloaded. Solutions: Replicate key across multiple nodes, add local in-process cache for the specific hot key

🔥 **Most Asked**: Cache warming, thundering herd prevention, hot key problem
🧠 **Strategy**: Mentioning TAO or EVCache shows deep knowledge. Great for senior-level interviews

---

## 83. Memcached vs Redis

### Q: When would you choose Memcached over Redis?

**Answer (Interview-Ready):**

| Feature | Redis | Memcached |
|---------|-------|-----------|
| **Data structures** | Strings, hashes, lists, sets, sorted sets, streams, etc. | Strings only |
| **Threading** | Single-threaded (main loop) + I/O threads (Redis 6+) | Multi-threaded |
| **Persistence** | RDB + AOF | None (pure cache) |
| **Replication** | Built-in master-replica | Not built-in |
| **Cluster** | Redis Cluster (16,384 slots) | Client-side consistent hashing |
| **Pub/Sub** | Yes | No |
| **Lua scripting** | Yes | No |
| **Max value size** | 512MB | 1MB |
| **Memory efficiency** | Higher overhead per key | More efficient for simple strings |

**Choose Memcached when:**
- Pure string key-value caching only
- Need multi-threaded performance on single node
- Simpler operational model (no persistence to manage)
- Already have Memcached expertise/infrastructure

**Choose Redis when (most cases):**
- Need any data structure beyond strings
- Need persistence / durability
- Need pub/sub, streams, or Lua scripting
- Need built-in replication and cluster
- Need features like rate limiting, leaderboards, sessions

**Real-world:** Redis dominates. Memcached still used at some companies (Facebook historically, Netflix EVCache is Memcached-based) for pure caching at extreme scale

🔥 **Most Asked**: Feature comparison, when would you prefer Memcached
🧠 **Strategy**: "Redis for 95% of cases. Memcached only if you need multi-threaded performance on a single node for pure string caching"

---

## 84. Distributed Caching Architecture

### Q: How do you design a distributed caching layer for a large-scale application?

**Answer (Interview-Ready):**

**Architecture:**
```
Client → API Server → [L1: In-process cache (Guava/Caffeine)]
                     → [L2: Distributed cache (Redis Cluster)]
                     → [L3: Database (PostgreSQL)]
```

**Key design decisions:**
1. **Consistent hashing** for key distribution across cache nodes
2. **Replication factor**: Each key on 2-3 nodes for availability
3. **Serialization**: Use efficient formats (Protocol Buffers, MessagePack) — not JSON (too verbose for cache)
4. **Connection pooling**: Reuse connections to Redis. Don't create per-request
5. **Circuit breaker**: If cache is down, gracefully fall back to DB (don't let cache failure cascade)

**Cache-aside with circuit breaker:**
```java
try {
    data = redis.get(key);   // Try cache
    if (data != null) return data;
} catch (Exception e) {
    circuitBreaker.recordFailure();
    // Cache failure → fall through to DB
}
data = db.query(key);       // Fallback to DB
try { redis.set(key, data, ttl); } catch (Exception e) { /* log */ }
return data;
```

**Monitoring:**
| Metric | Target | Alert |
|--------|--------|-------|
| Cache hit ratio | >90% | <80% |
| p99 latency | <5ms | >10ms |
| Memory usage | <80% | >90% |
| Eviction rate | Low | Sudden spike |
| Connection count | Stable | Near max |

**Follow-ups:**
- "How to handle cache node failure?" → Consistent hashing: failed node's keys redistribute to neighbors. Redis Cluster: automatic failover to replica. Application: circuit breaker → fall through to DB
- "Cache aside multiple data centers?" → Write to primary DC cache + async replicate to secondary. Read from local DC's cache only. Accept eventual consistency between regions

🔥 **Most Asked**: Multi-level caching, circuit breaker pattern, monitoring metrics
🧠 **Strategy**: "Design for cache failure. The system must work without cache — just slower"

---
---

# Part F — Consistency & Replication

## 85. Consistency Models

### Q: What are the different consistency models in distributed systems?

**Answer (Interview-Ready):**

| Model | Guarantee | Example |
|-------|-----------|---------|
| **Strong/Linear** | Read always returns most recent write | Spanner, Zookeeper |
| **Sequential** | All nodes see operations in same order (but not necessarily latest) | Total order broadcast |
| **Causal** | If A causes B, everyone sees A before B. Concurrent operations may be in any order | CRDT-based systems |
| **Read-your-writes** | You always see your own writes immediately | Session consistency |
| **Monotonic reads** | Once you read a value, you'll never see an older value | Sticky sessions |
| **Eventual** | Given enough time with no new writes, all replicas converge | DynamoDB default, Cassandra, DNS |

**Spectrum:** Strong → Sequential → Causal → Read-your-writes → Monotonic → Eventual

**Trade-off:** Stronger consistency → higher latency (more coordination) → lower availability during partitions. Weaker consistency → lower latency → higher availability → possible stale reads

**Follow-ups:**
- "Linearizability vs serializability?" → **Linearizability** = single-object, real-time ordering (read returns latest write globally). **Serializability** = multi-object, transactional (transactions appear sequential). Both are strong but different scopes
- "Which do most systems use?" → Most production systems use eventual consistency with application-level patterns (read-your-writes, monotonic reads) to compensate. True strong consistency is rare and expensive at scale

🔥 **Most Asked**: Strong vs eventual spectrum, linearizability vs serializability
🧠 **Strategy**: Know the spectrum. In interviews, say "we need eventual consistency here with read-your-writes guarantee" — shows nuanced thinking

---

## 86. Eventual Consistency Patterns

### Q: How do you implement and handle eventual consistency in practice?

**Answer (Interview-Ready):**

**Conflict resolution strategies:**

| Strategy | How | Used By |
|----------|-----|---------|
| **Last-Writer-Wins (LWW)** | Highest timestamp wins | Cassandra, DynamoDB |
| **Vector Clocks** | Track causal history, detect conflicts | Riak, Amazon Dynamo |
| **CRDTs** | Data structures that auto-merge without conflicts | Redis CRDT, Figma |
| **Application-level** | Business logic resolves conflicts | Shopping cart (union of items) |
| **Manual resolution** | Show both versions to user | Google Docs (conflict dialog) |

**Making eventual consistency bearable:**
1. **Read-after-write consistency**: After POST, read from primary (not replica) for that user
2. **Monotonic reads**: Pin user to same replica (consistent within one replica's timeline)
3. **Causal consistency**: Use logical clocks / version vectors to ensure cause-before-effect ordering
4. **Anti-entropy**: Background process compares replicas and reconciles differences (Merkle trees)

**CRDTs (Conflict-free Replicated Data Types):**
- G-Counter: Grow-only counter. Each node has own count. Merge = take max per node
- PN-Counter: Positive-negative counter (increment + decrement)
- LWW-Register: Last write wins based on timestamp
- OR-Set: Observed-Remove Set. Add/remove elements without conflicts
- Used by: Figma (collaborative editing), Redis Enterprise, Apple Notes

🔥 **Most Asked**: LWW, vector clocks, CRDTs basics, read-your-writes pattern
🧠 **Strategy**: "Eventual consistency + CRDTs for collaborative features. Strong consistency for financial transactions"

---

## 87. Strong Consistency & Consensus

### Q: How do distributed systems achieve strong consistency?

**Answer (Interview-Ready):**

**Consensus algorithms:**

| Algorithm | How | Where Used |
|-----------|-----|-----------|
| **Paxos** | Leader proposes → majority accepts → commit | Google Chubby, Azure Cosmos |
| **Raft** | Simpler Paxos. Leader election → log replication → commit | etcd, CockroachDB, Consul |
| **Zab** | Leader-based, crash recovery focused | Zookeeper |
| **PBFT** | Byzantine fault tolerant (handles malicious nodes) | Blockchain, Hyperledger |

**Raft (most asked):**
1. **Leader election**: Followers timeout → become candidate → request votes → majority = new leader
2. **Log replication**: Leader receives write → append to log → replicate to followers → majority ACK → commit → respond to client
3. **Safety**: Only nodes with up-to-date logs can become leader. Committed entries are never lost

**Key concept — Quorum:**
- N nodes. Need majority (⌊N/2⌋ + 1) to agree
- 3 nodes → need 2 (tolerate 1 failure)
- 5 nodes → need 3 (tolerate 2 failures)
- 7 nodes → need 4 (tolerate 3 failures)
- Why odd numbers? Avoid split-brain. With 4 nodes, partition into 2+2 → no majority on either side

**Follow-ups:**
- "Why is Raft preferred over Paxos?" → Raft was designed to be understandable. Same guarantees as Paxos but with clearer leader election and log compaction. Industry shifted to Raft for implementability
- "Google Spanner's TrueTime?" → GPS + atomic clocks give globally synchronized timestamps (±7ms uncertainty). Wait out the uncertainty window → linearizable reads without cross-region coordination. Unique to Google's infrastructure

🔥 **Most Asked**: Raft basics, quorum concept, why odd number of nodes
🧠 **Strategy**: Know Raft at a high level. Don't need to implement — explain the leader election + log replication flow

---

## 88. Replication Strategies

### Q: Compare synchronous, asynchronous, and semi-synchronous replication.

**Answer (Interview-Ready):**

| Strategy | How | Data Safety | Latency | Use Case |
|----------|-----|------------|---------|----------|
| **Sync** | Primary waits for ALL replicas to ACK | Strongest (zero data loss) | Highest (blocked by slowest replica) | Rarely used for all replicas |
| **Semi-sync** | Primary waits for ONE replica to ACK | Strong (at least 2 copies) | Moderate | MySQL semi-sync, PostgreSQL sync standby |
| **Async** | Primary confirms immediately, replicates in background | Risk of data loss on failover | Lowest | Default for most systems |

**Replication topologies:**
```
Single-Leader:    [Primary] → [Replica1]
                           → [Replica2]
                           → [Replica3]

Multi-Leader:     [Leader-US] ↔ [Leader-EU]  (bidirectional)
                       ↓             ↓
                  [Replica]     [Replica]

Leaderless:       [Node1] ↔ [Node2] ↔ [Node3]  (any node accepts writes)
```

**Replication lag consequences:**
- User writes comment → reads from replica → comment not there yet (lag)
- Dashboard shows stale metrics → wrong business decisions
- Inventory shows "in stock" → already sold on another replica → oversell

**Mitigations:**
- Read-your-writes: Read from primary for N seconds after a write
- Monotonic reads: Pin user to same replica (consistent timeline)
- Causal consistency: Track write version, ensure replica has seen that version before reading

🔥 **Most Asked**: Sync vs async trade-offs, replication lag mitigations
🧠 **Strategy**: "Semi-sync replication with read-your-writes pattern gives best balance of safety and performance"

---

## 89. Leader Election

### Q: How does leader election work in distributed systems?

**Answer (Interview-Ready):**
- **Problem**: In single-leader architectures, we need exactly one leader at any time. If leader fails, a new one must be elected quickly and safely

**Approaches:**

| Method | How | Used By |
|--------|-----|---------|
| **Raft election** | Timeout → candidate → request votes → majority wins | etcd, CockroachDB |
| **Zookeeper** | Ephemeral sequential znode. Lowest number = leader. Watch predecessor for failover | Kafka (old), HBase |
| **Bully algorithm** | Highest ID node wins. On failure, next highest takes over | Simple but chatty |
| **Lease-based** | Leader acquires time-limited lease. Must renew. Fail to renew → new election | Google Chubby, DynamoDB |
| **etcd/Consul** | Distributed lock with TTL. First to acquire = leader | Distributed task schedulers |

**Lease-based (most practical):**
```
while true:
    if acquire_lease("leader", ttl=30s):
        # I am leader — do leader work
        renew_lease_every(10s)  # Renew before TTL expires
    else:
        # Someone else is leader — wait and watch
        wait_for_lease_expiry()
```

**Follow-ups:**
- "What if a network partition splits the cluster?" → Split-brain: both sides think they're leader. Solution: Quorum-based election (need majority). Minority side can't elect a leader
- "Fencing tokens?" → Each leader gets a monotonically increasing token. Resources check token — reject requests from old leaders. Prevents stale leader from making changes after new leader elected

🔥 **Most Asked**: Lease-based election, fencing tokens, what happens during partition
🧠 **Strategy**: "Leader election via distributed lock with TTL + fencing tokens for safety"

---

## 90. Split Brain Problem

### Q: What is split brain and how do you prevent it?

**Answer (Interview-Ready):**
- **Split brain**: Network partition divides cluster. Both sides believe the other is down. Both elect their own leader. Two leaders accept writes → data divergence → data loss on reunion

**Prevention strategies:**

| Strategy | How |
|----------|-----|
| **Quorum** | Require majority (N/2 + 1) for all decisions. Minority side can't achieve quorum → read-only |
| **Fencing (STONITH)** | "Shoot The Other Node In The Head." If you become leader, power-off the old leader via IPMI/cloud API |
| **Epoch/Generation numbers** | Each leader gets incrementing number. Resources reject requests from lower epoch |
| **Witness/Arbiter** | Odd node in third location breaks tie. Cloud: place arbiter in third AZ |
| **Disk-based fencing** | Leader writes to shared disk with token. Before acting, check disk for newer token |

**Real-world example — PostgreSQL:**
- Primary fails. Replica promoted to new primary
- Old primary recovers → still thinks it's primary → accepts writes
- **Fencing**: Use `pg_rewind` or VIP (Virtual IP) that only active primary holds. Or cloud: detach storage from old primary

**Follow-ups:**
- "CAP connection?" → During partition, CP systems (like Zookeeper) will refuse writes on minority side → prevent split brain but reduce availability. AP systems allow split brain → must resolve conflicts on reunion
- "How does Kubernetes handle it?" → etcd uses Raft (quorum-based). If etcd loses majority → k8s control plane can't make decisions → pods keep running but no new scheduling. Designed to be safe during partitions

🔥 **Most Asked**: What is split brain, quorum prevention, STONITH
🧠 **Strategy**: "Always mention quorum-based consensus as the primary prevention. Fencing tokens as defense-in-depth"

---

## 91. Data Versioning & Conflict Resolution

### Q: How do you handle concurrent writes and version conflicts in distributed data?

**Answer (Interview-Ready):**

**Version tracking mechanisms:**

| Mechanism | How | Detects Conflicts? | Used By |
|-----------|-----|--------------------|---------|
| **Timestamp (LWW)** | Last write by wall-clock wins | No (silently drops) | Cassandra, DynamoDB |
| **Version number** | Increment on each write. Reject if stale | Yes (optimistic locking) | Most RDBMS |
| **Vector clock** | Track version per node: `{A:2, B:1, C:3}` | Yes (concurrent writes detected) | Riak, original Dynamo |
| **Hybrid logical clock** | Physical time + logical counter | Yes, with ordering | CockroachDB, Spanner |
| **Dotted version vector** | Compact vector clock variant | Yes (more efficient) | Riak 2.0+ |

**Optimistic concurrency control (OCC):**
```sql
-- Read
SELECT version, data FROM items WHERE id = 123;  -- version = 5

-- Update (only if version hasn't changed)
UPDATE items SET data = 'new', version = 6 
WHERE id = 123 AND version = 5;  -- affected rows = 0 → conflict!
```
→ If affected rows = 0, someone else updated. Retry: re-read, re-compute, re-try

**Conflict resolution strategies:**
- **Application-level merge**: Shopping cart → union of both carts
- **LWW**: Simple, lossy. OK when data loss is tolerable
- **Multi-value**: Return both versions, let user/application choose (Amazon shopping cart)
- **CRDTs**: Mathematically guaranteed conflict-free merge

🔥 **Most Asked**: Optimistic locking, vector clocks, LWW trade-offs
🧠 **Strategy**: "Optimistic locking with version numbers for databases. CRDTs for real-time collaborative features"

---

## 92. Consistency in Microservices

### Q: How do you maintain data consistency across microservices that each own their own database?

**Answer (Interview-Ready):**
- **Challenge**: In microservices, each service has its own database. No shared DB = no distributed transactions (or they're very expensive)

**Patterns:**

| Pattern | Consistency | Complexity | Use Case |
|---------|-------------|------------|----------|
| **Saga (Orchestration)** | Eventual | Medium | Multi-step business workflows (order → pay → ship) |
| **Saga (Choreography)** | Eventual | Medium-High | Decoupled services with event-driven architecture |
| **Outbox Pattern** | Eventual (reliable) | Medium | Guarantee event delivery alongside DB write |
| **CDC (Change Data Capture)** | Eventual | Medium | Sync data changes across services via stream |
| **Event Sourcing** | Eventual | High | Audit trail, complex domain events (banking) |
| **2PC** | Strong | High | Rarely used (blocking, slow, SPOF) |

**The Outbox Pattern (most practical):**
```
1. Service A writes to its DB (order) + outbox table in ONE local transaction
2. CDC connector (Debezium) reads outbox → publishes to Kafka
3. Service B consumes event → updates its own DB
4. Service B must be IDEMPOTENT (handle duplicate events safely)
```

**Idempotency** — critical for eventual consistency:
- Every consumer must handle the same event twice safely
- Use idempotency key: Store processed event IDs → check before processing
- Design operations to be naturally idempotent: `SET balance = 100` (idempotent) vs `SET balance = balance + 10` (not idempotent)

**Follow-ups:**
- "What about read consistency across services?" → API Composition pattern: aggregate data from multiple services at API gateway level. Or maintain read-optimized projections via CQRS
- "Saga compensation example?" → Order saga: (1) Create order, (2) Reserve inventory, (3) Charge payment. If payment fails → compensate: release inventory → cancel order. Each step needs a compensation action defined

🔥 **Most Asked**: Outbox pattern, Saga compensation, idempotency
⚠️ **Common Mistakes**: Trying to use distributed transactions (2PC) in microservices; forgetting idempotency in event consumers
🧠 **Strategy**: "Saga + Outbox + Idempotent consumers is the standard pattern for microservice data consistency"

---
---

# Part G — Frontend Architecture Patterns (SEQ 10, Topics 196-209)

## 196. Monolithic Frontend Architecture

### Q: What is a monolithic frontend and when is it appropriate?

**Answer (Interview-Ready):**
- **Monolithic frontend** = entire UI is one codebase, one build, one deployment. Single SPA or MPA built as one unit
- All features (auth, dashboard, settings, admin) share the same bundle, router, state management

**When appropriate:**
- Small-to-medium applications (startup MVP, internal tools)
- Small team (1-5 frontend devs)
- Simple deployment requirements
- Shared state is heavily relied upon across features

**When it becomes a problem:**
- Large teams (10+) stepping on each other's code — merge conflicts, slow CI
- Build times grow to 10+ minutes
- One broken feature blocks all deployments
- Can't independently scale or deploy features
- Technology lock-in — entire app must use same framework version

**Migration path:** Monolith → feature slicing (modular monolith) → micro-frontends (only if team/scale justifies complexity)

🔥 **Most Asked**: When monolith becomes problematic, migration strategy
🧠 **Strategy**: "Monolithic frontend is fine up to ~10 engineers. Don't prematurely split. The complexity of micro-frontends is real"

---

## 197. Component-Based Architecture

### Q: How does component-based architecture work in modern frontend frameworks?

**Answer (Interview-Ready):**
- **Core idea**: UI is built from independent, reusable components that encapsulate markup, styles, and behavior
- React, Angular, Vue, Svelte — all component-based

**Principles:**
- **Single Responsibility**: Each component does one thing well
- **Composition over Inheritance**: Compose small components into larger ones
- **Encapsulation**: Component manages its own state and styles (CSS Modules, scoped styles)
- **Props down, events up**: Parent passes data via props, child communicates via events/callbacks

**Component hierarchy:**
```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── NavMenu
│   │   └── UserAvatar
│   ├── Sidebar
│   └── MainContent
│       ├── ProductList
│       │   └── ProductCard (reusable)
│       └── Pagination
└── Footer
```

**Smart vs Dumb components:**
- **Container (Smart)**: Fetches data, manages state, passes to children. Contains business logic
- **Presentational (Dumb)**: Receives props, renders UI, fires events. No data fetching. Pure and reusable

**Follow-ups:**
- "Controlled vs uncontrolled components?" → **Controlled**: Parent manages state via props + onChange (form inputs). **Uncontrolled**: Component manages own state internally (useRef). Controlled preferred for forms
- "Component testing strategy?" → Unit test presentational components (props → output). Integration test container components (data fetching + rendering). E2E test user flows

🔥 **Most Asked**: Smart vs dumb, composition pattern, controlled vs uncontrolled
🧠 **Strategy**: "I follow the container/presentational split. Keeps components testable and reusable"

---

## 198. MVC / MVVM in Frontend

### Q: How do MVC and MVVM patterns apply to frontend development?

**Answer (Interview-Ready):**

| Pattern | Components | Data Flow | Example |
|---------|-----------|-----------|---------|
| **MVC** | Model (data), View (UI), Controller (logic/routing) | User → Controller → Model → View | Backbone.js, traditional server-rendered apps |
| **MVVM** | Model (data), View (UI), ViewModel (binds model↔view) | Two-way binding: View ↔ ViewModel ↔ Model | Angular (two-way binding), Knockout.js |
| **Flux/Redux** | Store, Action, Dispatcher, View | Unidirectional: View → Action → Dispatcher → Store → View | React + Redux |

**Modern reality:**
- React uses **unidirectional data flow** (not strictly MVC or MVVM). Data flows down via props, events flow up. Redux adds Flux architecture
- Angular uses **MVVM-like** pattern: Component = ViewModel, Template = View, Services = Model. Two-way binding via `[(ngModel)]`
- Vue supports both: one-way prop flow + two-way binding via `v-model`

**Why unidirectional won:**
- Predictable state changes (one direction → easier debugging)
- Time-travel debugging (Redux DevTools)
- Explicit data flow → easier to reason about in large apps
- Two-way binding at scale → "who changed this?" becomes impossible to trace

🔥 **Most Asked**: MVC vs MVVM vs Flux, why unidirectional data flow, Angular vs React approach
🧠 **Strategy**: "Most modern frameworks converge on unidirectional flow. Two-way binding is syntactic sugar over one-way + event listener"

---

## 199. Atomic Design Methodology ★

### Q: What is Atomic Design and how does it structure a design system?

**Answer (Interview-Ready):**
- **Atomic Design** (Brad Frost) = methodology for building UI from smallest to largest units

**Five levels:**
| Level | What | Example |
|-------|------|---------|
| **Atoms** | Basic HTML elements, unsplittable | Button, Input, Label, Icon, Avatar |
| **Molecules** | Groups of atoms working together | SearchBar (Input + Button), FormField (Label + Input + ErrorText) |
| **Organisms** | Groups of molecules forming a section | Header (Logo + Nav + SearchBar + UserMenu), ProductCard |
| **Templates** | Page-level layouts with placeholder content | DashboardTemplate (Header + Sidebar + ContentArea + Footer) |
| **Pages** | Templates filled with real content | DashboardPage (Template + actual data from API) |

**Benefits:**
- Consistent vocabulary across designers and developers
- Systematic reuse — atoms are shared everywhere
- Design system naturally emerges (Storybook per level)
- Testing at each level: unit test atoms → integration test organisms → E2E test pages

**Folder structure:**
```
components/
├── atoms/
│   ├── Button/
│   ├── Input/
│   └── Icon/
├── molecules/
│   ├── SearchBar/
│   └── FormField/
├── organisms/
│   ├── Header/
│   └── ProductCard/
├── templates/
│   └── DashboardLayout/
└── pages/
    └── Dashboard/
```

**Follow-ups:**
- "Does every project need Atomic Design?" → No. Useful for design systems and large teams. Small projects → simple component folder is fine. The overhead of strict categorization must be justified by scale
- "How does it relate to Storybook?" → Each level gets Storybook stories. Atoms have individual stories. Organisms show composed components. Visual regression testing at each level

🔥 **Most Asked**: Five levels with examples, folder structure, when to use
🧠 **Strategy**: "Atomic Design is great for design systems. For app-specific components, feature-based folders are often more pragmatic"

---

## 200. Compound Component Pattern (Applied)

### Q: What is the Compound Component pattern and when should you use it?

**Answer (Interview-Ready):**
- **Compound Components** = a set of components that work together to form a single logical unit, sharing implicit state
- Parent manages state, children access it implicitly (Context or cloneElement)

**Example — Tabs component:**
```jsx
// USAGE — clean, declarative API
<Tabs defaultTab="profile">
  <Tabs.List>
    <Tabs.Tab value="profile">Profile</Tabs.Tab>
    <Tabs.Tab value="settings">Settings</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="profile">Profile content</Tabs.Panel>
  <Tabs.Panel value="settings">Settings content</Tabs.Panel>
</Tabs>

// IMPLEMENTATION — shared state via Context
const TabContext = createContext();
function Tabs({ defaultTab, children }) {
  const [active, setActive] = useState(defaultTab);
  return (
    <TabContext.Provider value={{ active, setActive }}>
      {children}
    </TabContext.Provider>
  );
}
Tabs.Tab = ({ value, children }) => {
  const { active, setActive } = useContext(TabContext);
  return <button onClick={() => setActive(value)} 
    className={active === value ? 'active' : ''}>{children}</button>;
};
Tabs.Panel = ({ value, children }) => {
  const { active } = useContext(TabContext);
  return active === value ? <div>{children}</div> : null;
};
```

**When to use:** Reusable UI libraries (Tabs, Accordion, Select, Menu, Dialog). User controls composition while component manages internal state. Found in Radix UI, Headless UI, Reach UI

**Follow-ups:**
- "vs Render Props / HOC?" → Compound components are more declarative and composable. Render props/HOCs pass behavior. Compound components share state implicitly through the component tree
- "cloneElement vs Context?" → Context is preferred (cleaner, works with nested DOM). cloneElement breaks if children are wrapped in extra elements

🔥 **Most Asked**: Implementation with Context, when to use, comparison with render props
🧠 **Strategy**: "Compound components for library-level abstractions. Use Context for shared state between siblings"

---

## 201. SPA Architecture

### Q: What is a Single Page Application and what are its trade-offs?

**Answer (Interview-Ready):**
- **SPA** = one HTML page loaded once. JavaScript handles all routing and rendering. No full page reloads
- React (Create React App), Angular, Vue (client-side) are SPAs by default

**How it works:**
1. Browser loads single `index.html` with JS bundle
2. JS takes over → renders UI, handles navigation
3. Route changes → JS swaps components (no server round-trip)
4. Data fetched via API calls (REST/GraphQL) → renders dynamically

**Pros:**
- Fast, app-like transitions (no full reload)
- Rich interactivity (complex UIs, animations)
- Clear separation: frontend (SPA) + backend (API)
- Works well as PWA with offline support

**Cons:**
- **SEO**: Empty `index.html` → search engine crawlers see nothing (unless SSR/pre-rendering)
- **Initial load**: Large JS bundle must download before anything renders (TTFB fast, FCP slow)
- **Memory leaks**: Long-lived page → event listeners, timers, DOM references accumulate
- **Deep linking**: Server must return `index.html` for all routes (catch-all route config)
- **JavaScript dependency**: No JS = no app (accessibility concern)

**SPA performance optimizations:**
- Code splitting (React.lazy, dynamic imports)
- Route-based chunking (load only current route's code)
- Prefetching next route on hover/focus
- Service worker for caching API responses + shell

🔥 **Most Asked**: SPA vs MPA, SEO problem, performance optimizations
🧠 **Strategy**: "SPA is great for dashboard/app-like UIs. Not ideal for content/SEO sites without SSR"

---

## 202. MPA Architecture

### Q: How does Multi-Page Architecture differ from SPA and when is it better?

**Answer (Interview-Ready):**
- **MPA** = each route is a separate HTML page. Server renders full page per request. Browser reloads on navigation
- Traditional: PHP, Rails, Django templates. Modern: Next.js pages, Astro, Remix

| Aspect | SPA | MPA |
|--------|-----|-----|
| Navigation | JS router (no reload) | Full page reload |
| SEO | Poor (unless SSR) | Excellent (HTML from server) |
| Initial load | Slow (large JS bundle) | Fast (only current page's assets) |
| Subsequent nav | Instant (client-side) | Slower (full reload) |
| Complexity | Higher (client routing, state) | Lower (server handles pages) |
| JS dependency | Required for everything | Progressive enhancement possible |

**Modern MPAs (not your grandpa's MPA):**
- Astro: Ships zero JS by default. Hydrate only interactive islands
- Remix: Full page loads but with smart prefetching → feels like SPA
- Next.js App Router: Server Components + streaming → best of both worlds

**When MPA is better:**
- Content sites (blogs, docs, news, e-commerce product pages)
- SEO-critical applications
- Low-JS tolerance (government, accessibility-critical)
- When you want simpler architecture and smaller bundle

🔥 **Most Asked**: SPA vs MPA trade-offs, when to choose MPA, modern MPA frameworks
🧠 **Strategy**: "The lines between SPA and MPA are blurring. Next.js and Remix give you MPA's SEO with SPA's interactivity"

---

## 203. Hybrid Rendering Architecture

### Q: How do modern frameworks combine multiple rendering strategies?

**Answer (Interview-Ready):**
- **Hybrid** = use different rendering strategies for different pages/components within the same app
- Next.js is the poster child of hybrid rendering

**Per-page/per-component rendering:**
| Page Type | Rendering | Why |
|-----------|-----------|-----|
| Marketing/Landing | **SSG** (Static) | Fast, SEO, content rarely changes |
| Blog posts | **ISR** (Incremental Static Regeneration) | Static with periodic updates |
| Product page | **SSR** (Server-Side Rendering) | SEO + personalized (pricing, inventory) |
| Dashboard | **CSR** (Client-Side) | Behind auth, no SEO needed, real-time data |
| Interactive widget | **Islands** | Static page with hydrated interactive component |

**Next.js App Router hybrid example:**
```tsx
// Static page (default — React Server Component)
export default async function BlogPage() {
  const posts = await db.posts.findMany();  // runs on server at build time
  return <PostList posts={posts} />;
}

// Dynamic page (force SSR)
export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const data = await fetchUserData();  // runs on server per request
  return <Dashboard data={data} />;
}

// Client component (CSR hydration within server-rendered page)
'use client';
export function LiveChart({ initialData }) {
  const [data, setData] = useState(initialData);
  useEffect(() => { /* WebSocket subscription */ }, []);
  return <Chart data={data} />;
}
```

🔥 **Most Asked**: When to use which rendering strategy, Next.js hybrid approach
🧠 **Strategy**: "In interviews, say: choose rendering per page based on SEO needs, data freshness, and interactivity level"

---

## 204. Micro-Frontend Architecture

### Q: What are micro-frontends, how do they work, and when should you adopt them?

**Answer (Interview-Ready):**
- **Micro-frontends** = extend microservices to the frontend. Each team owns a vertical slice (UI + logic + data) that deploys independently

**Integration approaches:**

| Approach | How | Build-time/Runtime | Example |
|----------|-----|--------------------|---------|
| **Module Federation** | Webpack/Vite exposes modules at runtime | Runtime | Teams share components at runtime |
| **iframe** | Each micro-frontend in its own iframe | Runtime | Simple isolation, poor UX |
| **Web Components** | Framework-agnostic custom elements | Runtime | Angular elements, Stencil |
| **Build-time** | NPM packages composed at build | Build-time | Shared component libraries (not true MFE) |
| **Edge-side** | Server composes HTML fragments | Server | Tailor (Zalando) |

**When to adopt:**
- Large org (50+ frontend engineers), multiple teams
- Independent deployment needed per team/feature
- Different tech stacks per team (one uses React, another Angular)
- Monolithic frontend CI/CD is a bottleneck

**When NOT to adopt:**
- Small team (<10 devs) — overhead isn't worth it
- Tightly coupled features requiring shared state
- Performance-critical apps (MFE adds runtime overhead)

**Challenges:**
- Shared dependencies (React loaded twice? Use Module Federation shared scope)
- Consistent styling (shared design system/tokens)
- Routing across micro-frontends (shell app owns router)
- Communication between MFEs (custom events, shared state bus)

🔥 **Most Asked**: When to adopt, integration approaches, Module Federation, shared dependencies
⚠️ **Common Mistakes**: Adopting micro-frontends for a 5-person team; not having a shared design system
🧠 **Strategy**: "Micro-frontends solve organizational scaling problems, not technical ones. Don't adopt for fun"

---

## 205. Module Federation

### Q: How does Module Federation enable micro-frontends?

**Answer (Interview-Ready):**
- **Module Federation** (Webpack 5 / Vite) = load code from another build at runtime. No npm publish needed
- Each app exposes modules and consumes modules from other apps — at runtime, not build time

**Concepts:**
| Term | Meaning |
|------|---------|
| **Host** | The shell app that loads remote modules |
| **Remote** | App that exposes modules for others to consume |
| **Shared** | Dependencies shared at runtime (e.g., React loaded once, not per remote) |
| **Exposes** | Modules a remote makes available (e.g., `./Button`, `./Header`) |
| **Remotes** | List of remote apps the host can import from |

**Webpack config (Remote):**
```js
// team-dashboard webpack.config.js
new ModuleFederationPlugin({
  name: 'dashboard',
  filename: 'remoteEntry.js',
  exposes: { './DashboardWidget': './src/DashboardWidget' },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});
```

**Host consumption:**
```jsx
const DashboardWidget = React.lazy(() => import('dashboard/DashboardWidget'));
// Loaded at runtime from dashboard's deployed remoteEntry.js
```

**Benefits:** Independent deploys per team. Shared React instance. Dynamic loading. No npm publish/update cycle

**Challenges:** Version mismatches between shared deps. Error boundaries needed for remote failures. Testing across remotes. TypeScript types not shared automatically (use @module-federation/typescript plugin)

🔥 **Most Asked**: How it works, shared dependencies, version conflicts
🧠 **Strategy**: "Module Federation is the de-facto standard for runtime micro-frontend composition"

---

## 206. Design System Architecture

### Q: How do you architect a design system for a large organization?

**Answer (Interview-Ready):**

**Layers of a design system:**
| Layer | What | Example |
|-------|------|---------|
| **Design tokens** | Primitive values (colors, spacing, typography, shadows) | `--color-primary: #0066FF`, `--spacing-md: 16px` |
| **Base components** | Unstyled/headless primitives | Radix UI, Headless UI |
| **Styled components** | Tokens applied to base components | `<Button variant="primary" size="md">` |
| **Patterns** | Compositions of styled components | Forms, data tables, page layouts |
| **Documentation** | Storybook, usage guidelines, accessibility notes | Component playground + API docs |

**Distribution:**
- **Monorepo package**: `@company/design-system` published to npm/GitHub registry
- **Multi-package monorepo**: `@company/tokens`, `@company/components`, `@company/icons` — granular imports
- **Versioning**: Semantic versioning. Breaking changes = major bump. Components can be versioned independently

**Key decisions:**
- **Styling approach**: CSS-in-JS (styled-components), CSS Modules, Tailwind, or vanilla CSS with tokens → Trend: moving away from runtime CSS-in-JS toward zero-runtime (Vanilla Extract, Panda CSS)
- **Theming**: CSS custom properties for runtime theming (dark mode, brand themes). Token files generate CSS variables + TypeScript types
- **Accessibility**: Built into every component from the start. WCAG 2.1 AA minimum. ARIA roles, keyboard navigation, focus management

**Follow-ups:**
- "How to drive adoption?" → (1) Make it easy to use (good DX, docs, Storybook), (2) Make it the path of least resistance, (3) Support from design leadership, (4) Dedicated design system team (2-4 engineers + 1 designer)
- "Versioning strategy?" → Semver. Each component can be its own package (like Radix UI) or all in one package. Canary releases for testing before stable

🔥 **Most Asked**: Token architecture, theming, distribution strategy, adoption
🧠 **Strategy**: "Design system = design tokens → headless components → themed components → documentation. Build for adoption, not perfection"

---

## 207. Feature-Based vs Layer-Based Structuring

### Q: How should you structure a large frontend codebase: by feature or by layer?

**Answer (Interview-Ready):**

**Layer-based (traditional):**
```
src/
├── components/    # All components
├── hooks/         # All hooks
├── services/      # All API calls
├── store/         # All state management
├── utils/         # All utilities
└── pages/         # All pages
```
→ Pro: Simple, familiar. Con: Related code scattered everywhere. Opening a feature requires jumping across 6 folders

**Feature-based (recommended for scale):**
```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api.ts
│   │   ├── store.ts
│   │   └── index.ts    # public API barrel
│   ├── dashboard/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   └── settings/
├── shared/            # Truly shared components/hooks/utils
├── app/               # App shell, routing, providers
└── lib/               # External library wrappers
```
→ Pro: Related code together. Feature = package. Clear ownership per team. Con: Shared code decisions harder

**Dependency rules (Feature-Sliced Design):**
- Features can import from `shared/` and `lib/`
- Features CANNOT import from other features (prevents coupling)
- If two features need the same thing → extract to `shared/`
- Barrel exports (index.ts) define the public API of each feature

🔥 **Most Asked**: Layer-based vs feature-based, dependency rules, barrel exports
🧠 **Strategy**: "Feature-based for any app >10 components. Layer-based only for small projects or utility libraries"

---

## 208. Monorepo Architecture (Nx, Turborepo) ★

### Q: When and how should you use a monorepo for frontend projects?

**Answer (Interview-Ready):**
- **Monorepo** = single repository containing multiple projects, packages, or applications

**Tools comparison:**

| Tool | Key Feature | Best For |
|------|------------|---------|
| **Nx** | Smart caching, affected commands, generators | Enterprise, Angular+React, full-stack monorepos |
| **Turborepo** | Remote caching, pipeline config, simple setup | Simpler monorepos, Next.js ecosystem |
| **pnpm workspaces** | Fast, disk-efficient, native workspace support | Lightweight, no special tooling needed |
| **Lerna** | Publishing multiple npm packages | Open-source libraries (legacy, mostly replaced by Nx/Turbo) |

**Monorepo structure:**
```
packages/
├── ui/              # Shared design system
├── utils/           # Shared utilities
├── tsconfig/        # Shared TypeScript configs
apps/
├── web/             # Main web app
├── admin/           # Admin dashboard
├── docs/            # Documentation site
nx.json / turbo.json # Build orchestration config
```

**Benefits:**
- Shared code without npm publish cycle (internal packages just import directly)
- Atomic commits across multiple packages
- Consistent tooling, linting, TypeScript config
- Task caching (doesn't rebuild unchanged packages)
- Affected commands (only test/build what changed)

**When NOT to use:** 
- Teams prefer full autonomy (separate repos = separate processes)
- Different release cycles per project (monorepo encourages shared releases)
- Very large orgs where repo size causes Git performance issues (Google uses custom VCS)

🔥 **Most Asked**: Nx vs Turborepo, when to adopt, affected commands, caching
🧠 **Strategy**: "Monorepo with Turborepo for most teams. Nx for enterprise with Angular or complex dependency graphs"

---

## 209. Plugin Architecture in Frontend ★

### Q: How do you design a plugin/extension system for a frontend application?

**Answer (Interview-Ready):**
- **Plugin architecture** = allow third-party or internal teams to extend application functionality without modifying core code

**Patterns:**
| Pattern | How | Example |
|---------|-----|---------|
| **Hook/Event system** | Plugins register for hooks, core fires events | WordPress hooks, Webpack plugins |
| **Slot/Extension points** | UI defines named slots, plugins inject components | VS Code extensions, Grafana panels |
| **Middleware** | Chain of functions processing requests/data | Express middleware, Redux middleware |
| **Registry** | Plugins register capabilities, core discovers and loads | Chrome extensions, Figma plugins |

**Implementation example — Extension points:**
```tsx
// Core app defines extension points
const extensionRegistry = new Map<string, React.ComponentType[]>();

function registerExtension(slot: string, component: React.ComponentType) {
  const existing = extensionRegistry.get(slot) || [];
  extensionRegistry.set(slot, [...existing, component]);
}

// Extension point component
function ExtensionSlot({ name }: { name: string }) {
  const components = extensionRegistry.get(name) || [];
  return <>{components.map((Comp, i) => <Comp key={i} />)}</>;
}

// In the host app
<Header>
  <Logo />
  <Nav />
  <ExtensionSlot name="header-right" />  {/* Plugins inject here */}
</Header>
```

**Security considerations:**
- Sandbox plugins (iframe, Web Worker, or restricted API surface)
- Validate plugin inputs/outputs
- Permission system (plugin declares what it needs access to)
- CSP (Content Security Policy) to prevent malicious code injection

🔥 **Most Asked**: Extension point pattern, sandboxing, real-world examples
🧠 **Strategy**: "Plugin architecture when you need extensibility without modifying core code. Define clear extension points and a plugin API"

---
---

# Part H — Rendering Strategies (SEQ 11, Topics 210-225)

## 210. Client-Side Rendering (CSR)

### Q: How does CSR work and what are its trade-offs?

**Answer (Interview-Ready):**
- **CSR** = server sends empty HTML shell + JS bundle. Browser downloads JS → executes → renders UI entirely on the client

**Flow:**
```
1. Browser requests page → Server returns empty <div id="root"></div> + JS bundle
2. Browser downloads JS (can be large: 200KB-2MB)
3. JS executes → React/Angular creates DOM → page renders
4. API calls fetch data → renders again with real content
```

**Performance characteristics:**
| Metric | CSR Impact |
|--------|-----------|
| TTFB | ✅ Fast (tiny HTML response) |
| FCP | ❌ Slow (must download + parse + execute JS) |
| LCP | ❌ Slow (content depends on JS + API calls) |
| TTI | ❌ Slow (JS must execute fully) |
| INP | ✅ Fast after load (all interactions handled client-side) |

**When to use CSR:**
- Authenticated dashboards (no SEO needed)
- Internal tools and admin panels
- Highly interactive apps (editors, drawing tools)
- PWAs that work offline

**When NOT to use:**
- SEO-critical pages (crawlers may not execute JS)
- Content-heavy sites (blogs, e-commerce product pages)
- Users on slow connections (large JS bundle blocks everything)

🔥 **Most Asked**: Performance metrics, SEO impact, when appropriate
🧠 **Strategy**: "CSR for dashboards behind auth. For anything public-facing, combine with SSR or SSG"

---

## 211. Server-Side Rendering (SSR)

### Q: How does SSR work and when should you use it over CSR?

**Answer (Interview-Ready):**
- **SSR** = server executes JavaScript, generates full HTML per request, sends complete page to browser. Browser then hydrates (attaches event listeners)

**Flow:**
```
1. Browser requests page → Server runs React/Next.js → generates full HTML
2. Server sends complete HTML with content (fully rendered)
3. Browser displays HTML immediately → FCP is fast
4. Browser downloads JS bundle → hydrates (attaches interactivity)
5. Page becomes fully interactive (TTI)
```

**Performance characteristics:**
| Metric | SSR Impact |
|--------|-----------|
| TTFB | ❌ Slower (server must render before responding) |
| FCP | ✅ Fast (HTML has content immediately) |
| LCP | ✅ Fast (main content in initial HTML) |
| TTI | ⚡ Depends on JS bundle size (hydration needed) |
| SEO | ✅ Excellent (full HTML for crawlers) |

**SSR in Next.js App Router:**
```tsx
// Server Component (default — runs on server, no hydration)
export default async function ProductPage({ params }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  return <ProductDetails product={product} />;  // full HTML sent to browser
}
```

**When to use:**
- SEO-critical pages with dynamic, personalized content
- E-commerce product pages (personalized pricing, inventory)
- Social media pages (dynamic OG tags for link previews)
- First-load performance matters (content visible before JS loads)

🔥 **Most Asked**: SSR vs CSR trade-offs, hydration, TTFB impact, Next.js implementation
🧠 **Strategy**: "SSR for dynamic SEO pages. Always mention the TTFB trade-off and hydration cost"

---

## 212. Static Site Generation (SSG)

### Q: What is SSG and how does it differ from SSR?

**Answer (Interview-Ready):**
- **SSG** = pages are generated at build time, served as static HTML files. No server rendering per request
- Pre-built HTML → served from CDN → fastest possible TTFB

**SSR vs SSG:**
| Aspect | SSG | SSR |
|--------|-----|-----|
| When rendered | Build time | Request time |
| Server needed | No (CDN serves static files) | Yes (server renders per request) |
| Speed | Fastest (pre-built, cached at edge) | Fast (but server processing delay) |
| Data freshness | Stale until next build | Fresh per request |
| Scalability | Infinite (static files on CDN) | Limited by server capacity |
| Cost | Very low (just CDN) | Higher (server compute per request) |

**Next.js SSG:**
```tsx
// This page is generated at build time
export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);  // fetched at build time
  return <Article content={post.content} />;
}

// Tell Next.js which pages to generate
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}
```

**When to use:**
- Blogs, documentation, marketing pages
- Product catalogs (update at build, not per request)
- Any page where content changes infrequently
- Pages where TTFB matters most (landing pages)

**Limitation:** Build time scales with number of pages. 10,000 pages = long builds. Solution: ISR

🔥 **Most Asked**: SSG vs SSR decision, build time scaling, CDN advantage
🧠 **Strategy**: "SSG is the performance gold standard. Use it whenever content doesn't change per user or per request"

---

## 213. Incremental Static Regeneration (ISR)

### Q: What is ISR and how does it solve SSG's staleness problem?

**Answer (Interview-Ready):**
- **ISR** = serve static pages (like SSG) but regenerate them in the background after a configurable time interval
- Best of SSG speed + content freshness without full rebuilds

**How it works:**
```
1. Page generated at build time (like SSG)
2. Served from cache for `revalidate` seconds
3. After revalidate period, next request:
   a. Serves stale page immediately (fast!)
   b. Triggers background regeneration
   c. Next visitor gets the new page
```

**Next.js ISR:**
```tsx
export default async function ProductPage({ params }) {
  const product = await getProduct(params.id);
  return <ProductDetails product={product} />;
}

// Regenerate this page every 60 seconds
export const revalidate = 60;
```

**On-demand revalidation (even better):**
```tsx
// API route to trigger revalidation
export async function POST(request) {
  const { path } = await request.json();
  revalidatePath(path);  // Regenerate specific page NOW
  return Response.json({ revalidated: true });
}
// Call this from CMS webhook when content changes
```

**Trade-offs:**
- ✅ Static speed for most requests
- ✅ No full rebuild for content updates
- ✅ Scales to millions of pages
- ❌ Brief stale window (up to `revalidate` seconds)
- ❌ First visitor after expiry gets stale page (subsequent visitors get fresh)

🔥 **Most Asked**: How revalidation works, on-demand ISR, stale window behavior
🧠 **Strategy**: "ISR = SSG without the staleness problem. Default choice for content that changes but isn't real-time"

---

## 214. Partial Pre-Rendering (PPR) — Next.js 14+ ★

### Q: What is Partial Pre-Rendering and why is it a game-changer?

**Answer (Interview-Ready):**
- **PPR** = single HTTP request serves a static shell instantly + streams dynamic parts as they resolve. No route-level choice between static/dynamic
- Combines SSG speed for the shell with SSR freshness for dynamic slots — per component, not per page

**How it works:**
```
1. Static shell (layout, nav, footer) pre-rendered at build time
2. Dynamic slots (user data, recommendations) wrapped in <Suspense>
3. On request: static shell served from CDN instantly → dynamic parts streamed in as they resolve
```

**Next.js PPR:**
```tsx
export default function ProductPage({ params }) {
  return (
    <div>
      {/* Static — served instantly from edge */}
      <Header />
      <ProductInfo product={staticProduct} />
      
      {/* Dynamic — streamed when ready */}
      <Suspense fallback={<PriceSkeleton />}>
        <PersonalizedPrice userId={user.id} />
      </Suspense>
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={params.id} />
      </Suspense>
      
      <Footer />  {/* Static */}
    </div>
  );
}
```

**Why it matters:** Before PPR, a single `cookies()` call made the entire page dynamic (SSR). With PPR, only the component using cookies is dynamic — the rest stays static

🔥 **Most Asked**: How it differs from SSR/ISR, Suspense boundaries, when to use
🧠 **Strategy**: "PPR eliminates the page-level static vs dynamic choice. It's per-component. This is where the web is heading"

---

## 215. Streaming & Progressive Rendering

### Q: How does streaming HTML improve web application performance?

**Answer (Interview-Ready):**
- **Streaming** = server sends HTML in chunks as it becomes available, instead of waiting for the entire page to render
- Browser starts painting as soon as the first chunk arrives

**HTTP streaming:**
```
Transfer-Encoding: chunked

<!-- First chunk (instant) -->
<!DOCTYPE html>
<html><head>...</head><body>
<header>...</header>
<main>
  <div id="content">Loading...</div>

<!-- Second chunk (after data fetch) -->
  <div id="content">Actual content here</div>
  <script>replaceContent()</script>

<!-- Third chunk -->
<footer>...</footer>
</body></html>
```

**React streaming with Suspense:**
```tsx
// Server renders this as a stream
export default function Page() {
  return (
    <>
      <Header />  {/* Sent immediately */}
      <Suspense fallback={<Skeleton />}>
        <SlowDataComponent />  {/* Streamed when data resolves */}
      </Suspense>
      <Footer />  {/* Sent immediately */}
    </>
  );
}
```

**Benefits:** Faster FCP (don't wait for slowest component), better perceived performance, reduces TTFB, no client-side loading spinners (Suspense fallback shown server-side)

🔥 **Most Asked**: How React Suspense enables streaming, FCP improvement, vs traditional SSR
🧠 **Strategy**: "Streaming SSR is strictly better than traditional SSR. No downside — just faster perceived performance"

---

## 216. Hydration & Partial Hydration

### Q: What is hydration and why is it a performance bottleneck?

**Answer (Interview-Ready):**
- **Hydration** = process of attaching JavaScript event listeners to server-rendered HTML. Makes static HTML interactive
- Server sends HTML → browser displays → JS downloads → React "hydrates" (reconciles virtual DOM with existing HTML, attaches handlers)

**The hydration problem:**
- Full page hydration downloads and executes JS for EVERY component — even static ones that never change
- User sees content (FCP) but can't interact (TTI delayed by hydration)
- The "uncanny valley": page looks ready but clicks don't work

**Partial hydration approaches:**

| Approach | How | Framework |
|----------|-----|-----------|
| **Progressive hydration** | Hydrate above-fold first, lazy hydrate below-fold | Manual in React (lazy + IntersectionObserver) |
| **Selective hydration** | React prioritizes hydrating components user interacts with | React 18 (concurrent features) |
| **Islands** | Only interactive components hydrate. Static parts = pure HTML | Astro, Fresh (Deno) |
| **Resumable** | No hydration at all. Serialize state, resume on client | Qwik |

**React 18 selective hydration:**
```tsx
<Suspense fallback={<Loading />}>
  <Comments />  {/* Hydrated lazily */}
</Suspense>
// If user clicks on Comments before hydration completes,
// React prioritizes hydrating Comments first
```

🔥 **Most Asked**: What is hydration, the uncanny valley problem, partial hydration solutions
⚠️ **Common Mistakes**: Thinking hydration is immediate; not accounting for hydration cost in TTI estimates
🧠 **Strategy**: "Hydration is the #1 reason SSR apps feel slow despite fast FCP. Partial hydration is the solution"

---

## 217. Islands Architecture

### Q: What is the Islands Architecture and how does it minimize JavaScript?

**Answer (Interview-Ready):**
- **Islands** = static HTML page with isolated "islands" of interactivity. Only islands ship JavaScript. Everything else is pure HTML — zero JS
- Coined by Katie Sylor-Miller, popularized by Astro

**How it works:**
```
┌─────────────────────────────┐
│  Static HTML (no JS)         │
│  ┌─────────┐  ┌───────────┐ │
│  │ Search   │  │ Add to    │ │
│  │ (island) │  │ Cart      │ │
│  │ JS: 8KB  │  │ (island)  │ │
│  │          │  │ JS: 3KB   │ │
│  └─────────┘  └───────────┘ │
│  Static product description  │
│  Static reviews              │
│  Static footer               │
└─────────────────────────────┘
Total JS: 11KB vs full SPA: 200KB+
```

**Astro islands:**
```astro
---
// This runs on the server only
const product = await getProduct(id);
---
<h1>{product.name}</h1>
<p>{product.description}</p>  <!-- Static HTML, zero JS -->

<!-- This component hydrates on the client -->
<SearchBar client:load />

<!-- This hydrates only when visible -->
<ReviewCarousel client:visible />

<!-- This hydrates only on interaction -->
<ShareButton client:idle />
```

**Hydration directives:** `client:load` (immediate), `client:idle` (after page idle), `client:visible` (IntersectionObserver), `client:media` (media query matches), `client:only` (skip SSR, CSR only)

🔥 **Most Asked**: How islands differ from SPA, JS savings, Astro implementation
🧠 **Strategy**: "Islands architecture for content sites where 90% of the page is static. Dramatic JS reduction"

---

## 218. React Server Components Deep Dive (Applied)

### Q: How do React Server Components change the frontend architecture?

**Answer (Interview-Ready):**
- **RSC** = components that run ONLY on the server. Not hydrated. Not sent to the client as JS. Only their rendered output (HTML/serialized tree) is sent
- Distinct from SSR: SSR renders components to HTML but still sends all component JS for hydration. RSC sends zero JS for server components

**Server vs Client components:**
| Aspect | Server Component | Client Component |
|--------|-----------------|------------------|
| Runs on | Server only | Server (SSR) + Client (hydration) |
| JS sent to client | ❌ None | ✅ Yes (for hydration) |
| Can use hooks | ❌ No useState, useEffect | ✅ Yes |
| Can access server | ✅ Direct DB, file system, secrets | ❌ Must go through API |
| Can import client | ✅ Yes | ✅ Yes |
| Can import server | — | ❌ No (but can receive as children) |

**Composition pattern:**
```tsx
// Server Component (default in Next.js App Router)
export default async function ProductPage({ params }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  return (
    <div>
      <h1>{product.name}</h1>            {/* Server - no JS shipped */}
      <p>{product.description}</p>       {/* Server - no JS shipped */}
      <AddToCartButton id={product.id} /> {/* Client - JS shipped for interactivity */}
    </div>
  );
}

// Client Component
'use client';
export function AddToCartButton({ id }) {
  const [added, setAdded] = useState(false);
  return <button onClick={() => setAdded(true)}>{added ? '✓ Added' : 'Add to Cart'}</button>;
}
```

**Benefits:** Reduce client JS bundle (often 30-50% reduction). Direct server access (no API layer for data in components). Automatic code splitting by component boundary

**Follow-ups:**
- "Can server components have state?" → No. Use client components for interactivity. Server components are for rendering data
- "How does the data flow?" → Server component fetches data → renders → passes serialized output (not HTML — React's RSC payload format) to client → client merges into existing tree without full re-render

🔥 **Most Asked**: Server vs client component rules, zero-JS benefit, composition pattern, `'use client'` boundary
🧠 **Strategy**: "RSC = server components for data, client components for interactivity. Default to server. Add 'use client' only when needed"

---

## 219. CSR vs SSR vs SSG Trade-offs

### Q: Give a side-by-side comparison of CSR, SSR, SSG, and ISR for a real product decision.

**Answer (Interview-Ready):**

| Criteria | CSR | SSR | SSG | ISR |
|----------|-----|-----|-----|-----|
| **TTFB** | ✅ Fast (empty HTML) | ❌ Slow (server renders) | ✅ Fastest (CDN) | ✅ Fastest (CDN) |
| **FCP** | ❌ Slow (wait for JS) | ✅ Fast | ✅ Fastest | ✅ Fastest |
| **TTI** | ❌ Slow | ⚡ Depends on bundle | ✅ Fast | ✅ Fast |
| **SEO** | ❌ Poor | ✅ Excellent | ✅ Excellent | ✅ Excellent |
| **Data freshness** | ✅ Real-time | ✅ Per-request | ❌ Build-time only | ⚡ Configurable (revalidate) |
| **Server cost** | None | High (per-request compute) | None (CDN) | Low (regeneration only) |
| **Personalization** | ✅ Easy | ✅ Easy | ❌ Hard (same for everyone) | ❌ Hard |
| **Scale** | ✅ | ⚡ Need server capacity | ✅ Infinite (static files) | ✅ Nearly infinite |

**Decision matrix for a real product:**
| Page Type | Best Strategy | Why |
|-----------|--------------|-----|
| Landing page | SSG | Static, SEO critical, CDN fast |
| Blog | SSG or ISR | Content changes infrequently |
| E-commerce product | ISR + SSR fallback | SEO + fresh inventory |
| Dashboard | CSR | Auth-required, real-time, no SEO |
| Search results | SSR | Dynamic, SEO important, personalized |
| User profile | SSR or CSR | Depends on public (SSR) vs private (CSR) |

🔥 **Most Asked**: Decision matrix, real-world page examples, which metrics matter
🧠 **Strategy**: "Don't pick one strategy for the whole app. Use hybrid — different strategies per page type"

---

## 220. Blocking vs Non-Blocking Rendering

### Q: What is the difference between blocking and non-blocking rendering in the browser?

**Answer (Interview-Ready):**
- **Blocking rendering**: Browser halts rendering pipeline until a resource is loaded or a task completes
- **Non-blocking**: Rendering continues while resources load asynchronously

**What blocks rendering:**
| Resource | Blocking? | Why |
|----------|-----------|-----|
| CSS `<link>` in `<head>` | ✅ Render-blocking | Browser won't paint until CSSOM is built (prevents FOUC) |
| JS `<script>` (no defer/async) | ✅ Parser-blocking | HTML parsing stops until script downloads + executes |
| JS `<script defer>` | ❌ Non-blocking | Downloads during parsing, executes after HTML parsed |
| JS `<script async>` | Partially | Downloads async, but blocks parser when executing |
| Images | ❌ | Downloaded async, don't block rendering |
| Fonts | ⚡ Can cause FOIT | Text invisible until font loads (unless `font-display: swap`) |

**Solutions:**
- Move non-critical CSS to `<link rel="preload" as="style">` + `onload`
- Use `<script defer>` or `<script type="module">` (deferred by default)
- Inline critical CSS in `<head>`, load rest async
- Use `font-display: swap` to show fallback font immediately
- Use `content-visibility: auto` for offscreen content (skip rendering until visible)

🔥 **Most Asked**: Render-blocking vs parser-blocking, defer vs async, font-display
🧠 **Strategy**: Know the rendering pipeline sequence: HTML parse → CSSOM → Render Tree → Layout → Paint. Blocking resources delay this pipeline

---

## 221. Render-Blocking CSS & JavaScript

### Q: How do you identify and eliminate render-blocking resources?

**Answer (Interview-Ready):**

**Identifying render-blocking resources:**
- Chrome DevTools → Lighthouse → "Eliminate render-blocking resources"
- Performance tab → look for long bars before FCP on CSS/JS resources
- WebPageTest → waterfall chart shows blocking chain

**CSS solutions:**
```html
<!-- Critical CSS inlined (renders immediately) -->
<style>
  /* Above-fold styles only — ~14KB max */
  .header { ... } .hero { ... }
</style>

<!-- Non-critical CSS loaded async -->
<link rel="preload" href="/styles.css" as="style" 
      onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles.css"></noscript>
```

**JavaScript solutions:**
```html
<!-- Blocking (DON'T do this) -->
<script src="/app.js"></script>

<!-- Defer: download during parse, execute after HTML parsed, in order -->
<script defer src="/app.js"></script>
<script defer src="/vendor.js"></script>

<!-- Async: download during parse, execute immediately when ready, NO order guarantee -->
<script async src="/analytics.js"></script>

<!-- Module: defer by default -->
<script type="module" src="/app.mjs"></script>
```

**defer vs async:**
| Attribute | Download | Execute | Order preserved |
|-----------|----------|---------|-----------------|
| None | Blocks parser | Immediately, blocks parser | Yes |
| `defer` | Parallel | After HTML parsed | Yes |
| `async` | Parallel | When downloaded (interrupts parser) | No |

🔥 **Most Asked**: defer vs async behavior, critical CSS extraction, how to audit
🧠 **Strategy**: "Use `defer` for app scripts (order matters). Use `async` for independent scripts (analytics, ads)"

---

## 222. Critical CSS Inlining

### Q: What is critical CSS and how do you implement it?

**Answer (Interview-Ready):**
- **Critical CSS** = the minimum CSS needed to render above-the-fold content. Inline it in `<style>` tag in `<head>` for instant render
- Everything else loaded asynchronously

**Why:** CSS is render-blocking. If your CSS file is 200KB, browser waits for all 200KB before painting. Inlining critical CSS (~10-15KB) means first paint happens immediately

**Implementation:**
1. **Automated extraction**: Tools analyze your pages and extract CSS rules used in the viewport
   - `critical` npm package (by Addy Osmani)
   - `critters` (used by Angular CLI, Next.js)
   - `penthouse`
2. **Build-time**: Extract during build, inject into HTML template
3. **Manual**: Identify critical selectors (header, hero, above-fold layout), inline manually

**With Next.js / Angular:** Handled automatically
- Next.js: CSS modules automatically inlined for server-rendered pages
- Angular: `critters` plugin in production build inlines critical CSS

**Target:** Critical CSS should be <14KB (fits in first TCP round-trip window). Larger = defeating the purpose

🔥 **Most Asked**: Why 14KB target, automated tools, impact on FCP
🧠 **Strategy**: "Critical CSS inlining is a fundamental web perf optimization. Most frameworks handle it automatically"

---

## 223. Preload vs Prefetch vs Preconnect

### Q: What are resource hints and when do you use each?

**Answer (Interview-Ready):**

| Hint | When Downloaded | Priority | Use Case |
|------|----------------|----------|----------|
| `preload` | Current page, immediately | High | Critical resources: fonts, hero image, above-fold CSS |
| `prefetch` | Future pages, idle time | Low | Next-page resources: code-split chunks, next route |
| `preconnect` | Current page, immediately | High | Establish early connection: DNS + TCP + TLS |
| `dns-prefetch` | Current page | Low | DNS resolution only (cheaper preconnect) |
| `modulepreload` | Current page | High | ES module scripts (preload equivalent for modules) |

**Examples:**
```html
<!-- Preload critical font (current page, high priority) -->
<link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin>

<!-- Preconnect to API server (DNS + TCP + TLS early) -->
<link rel="preconnect" href="https://api.example.com">

<!-- Prefetch next page's JS chunk (low priority, idle time) -->
<link rel="prefetch" href="/dashboard-chunk.js">

<!-- DNS-prefetch for third-party domain -->
<link rel="dns-prefetch" href="https://analytics.example.com">
```

**Common mistakes:**
- Preloading too many resources (they ALL compete for bandwidth → slows critical path)
- Using `preload` instead of `prefetch` for non-critical resources
- Forgetting `crossorigin` attribute on font preloads (fetch fails silently)
- Not using `as` attribute on preload (browser doesn't know content type → wrong priority)

🔥 **Most Asked**: Preload vs prefetch distinction, when to use preconnect, common mistakes
🧠 **Strategy**: "Preload: current page critical resources. Prefetch: next page resources. Preconnect: CDN/API domains"

---

## 224. Time-to-Interactive (TTI) Trade-offs

### Q: How do you optimize Time-to-Interactive and what are the trade-offs?

**Answer (Interview-Ready):**
- **TTI** = time until the page is fully interactive (main thread idle for 5s after FCP with no long tasks)
- The gap between FCP and TTI is the "uncanny valley" — page looks ready but doesn't respond

**What increases TTI:**
- Large JavaScript bundles (must download + parse + execute)
- Hydration of server-rendered content (React must reconcile + attach listeners)
- Long tasks on main thread (>50ms blocks input)
- Third-party scripts (analytics, ads, chat widgets)

**Optimization strategies:**

| Strategy | Impact | Implementation |
|----------|--------|---------------|
| **Code splitting** | Major | `React.lazy()`, route-based chunks |
| **Tree shaking** | Medium | Remove unused exports (Webpack/Rollup) |
| **Defer third-party scripts** | Major | `<script defer>`, load after interaction |
| **Web Workers** | Medium | Move computation off main thread |
| **Partial hydration** | Major | Only hydrate interactive components |
| **Progressive loading** | Medium | Load skeleton → critical content → enhancements |
| **Reduce main-thread work** | Major | Break long tasks with `scheduler.yield()` or `requestIdleCallback` |

**Measuring TTI:**
- Lighthouse: Reports TTI in performance audit
- Web Vitals: `getTTI()` (deprecated in favor of INP)
- Chrome DevTools: Performance tab → hover over long tasks
- Note: Google replaced TTI with **INP** (Interaction to Next Paint) as Core Web Vital in March 2024

🔥 **Most Asked**: TTI vs INP, main thread blocking, code splitting impact
🧠 **Strategy**: "TTI is about main thread availability. The top 3 fixes: code splitting, deferring third-party scripts, and reducing hydration scope"

---

## 225. Speculation Rules API ★

### Q: What is the Speculation Rules API and how does it improve navigation speed?

**Answer (Interview-Ready):**
- **Speculation Rules API** = browser-native way to prefetch or prerender pages before the user navigates. Replaces `<link rel=prefetch>` with more control

**How it works:**
```html
<script type="speculationrules">
{
  "prerender": [
    {
      "where": { "href_matches": "/products/*" },
      "eagerness": "moderate"
    }
  ],
  "prefetch": [
    {
      "urls": ["/about", "/pricing"],
      "eagerness": "eager"
    }
  ]
}
</script>
```

**Key concepts:**
| Feature | Description |
|---------|-----------|
| **Prefetch** | Downloads the HTML (+ subresources). Faster navigation, not instant |
| **Prerender** | Full page render in hidden tab. Navigation is INSTANT (swap in the prerendered page) |
| **Eagerness** | `immediate` (right away), `eager` (likely), `moderate` (on hover), `conservative` (on mousedown) |
| **Where rules** | Pattern-match URLs. `href_matches: "/blog/*"` — prerender all blog links on current page |

**vs traditional prefetch:**
- `<link rel=prefetch>` → only fetches resources. No control over when/eagerness
- Speculation Rules → prefetch OR full prerender. Eagerness levels. URL pattern matching. Respects user's data-saver settings. Can be revoked

**Browser support:** Chrome 108+ (Chromium-based). No Firefox/Safari yet (2024). Progressive enhancement — falls back to normal navigation

🔥 **Most Asked**: Prerender vs prefetch, eagerness levels, browser support
🧠 **Strategy**: "Speculation Rules for instant page transitions. Use `moderate` eagerness (hover) for balanced resource usage"

---
---

# Part I — Frontend Caching & Offline (SEQ 12, Topics 226-239)

## 226. HTTP Caching

### Q: How does HTTP caching work end-to-end?

**Answer (Interview-Ready):**
- HTTP caching is controlled by response headers that tell browsers and intermediaries (CDN, proxy) how long to cache and when to revalidate

**Cache-Control directive overview:**

| Directive | Effect |
|-----------|--------|
| `max-age=3600` | Cache for 3600 seconds. Serve from cache without server contact |
| `s-maxage=600` | Same but only for shared caches (CDN). Overrides max-age for CDNs |
| `no-cache` | Cache it, but MUST revalidate with server before serving (ETag/Last-Modified) |
| `no-store` | Don't cache at all. For sensitive data (banking, health records) |
| `private` | Only browser can cache (not CDN). For personalized responses |
| `public` | Any cache can store (CDN, proxy, browser) |
| `immutable` | Never revalidate. Content at this URL will never change. Use with hashed filenames |
| `stale-while-revalidate=60` | Serve stale for 60s while fetching fresh copy in background |
| `must-revalidate` | Once stale, MUST revalidate. Don't serve stale even if offline |

**Conditional requests (revalidation):**
```
// Server sends:
ETag: "abc123"
Last-Modified: Wed, 01 Jan 2025 00:00:00 GMT

// Browser revalidates:
If-None-Match: "abc123"        → 304 Not Modified (content unchanged)
If-Modified-Since: Wed, 01...  → 304 Not Modified (not modified since)
```

**Optimal caching strategy:**
- **Static assets (JS/CSS/images)**: `Cache-Control: public, max-age=31536000, immutable` + content-hashed filenames
- **HTML pages**: `Cache-Control: no-cache` + ETag (always revalidate to get latest)
- **API responses**: `Cache-Control: private, max-age=0, must-revalidate` or short TTL per endpoint
- **Sensitive data**: `Cache-Control: no-store`

🔥 **Most Asked**: Directives and their meaning, ETag flow, optimal per content type
🧠 **Strategy**: Know the headers cold. This comes up in both frontend interviews and system design

---

## 227. Browser Cache

### Q: What are the different browser caching layers?

**Answer (Interview-Ready):**

| Cache Layer | What | Controlled By | Size |
|-------------|------|--------------|------|
| **Memory cache** | Recently fetched resources (current session) | Browser automatic | ~100MB |
| **Disk cache (HTTP cache)** | Resources with cache headers | Cache-Control/ETag | ~1GB |
| **Service Worker cache** | Programmatic cache (Cache API) | Developer (SW script) | Origin's quota (~50%+ of available disk) |
| **Back/Forward cache (bfcache)** | Complete page snapshots for back/forward nav | Browser automatic | Varies |
| **Push cache** | HTTP/2 pushed resources (short-lived) | Server push | Session-scoped |

**Cache lookup order:**
```
1. Memory cache (fastest, in-RAM)
2. Service Worker (if registered, intercepts fetch)
3. Disk cache / HTTP cache (checks Cache-Control headers)
4. Network request (cache miss → fetch from server)
```

**bfcache (Back/Forward Cache):**
- Browser takes a snapshot of the entire page (DOM, JS state, scroll position)
- When user hits back → instant restore from snapshot
- To not break bfcache: Don't use `unload` event. Don't use `Cache-Control: no-store` on main page. Handle `pageshow` event with `persisted` property

**Follow-ups:**
- "How to clear a specific cached resource?" → Can't directly clear browser HTTP cache for a specific URL. Solutions: Version URL (`style.v2.css`), use `Cache-Control: no-store`, use Service Worker (you control the Cache API)
- "Disk cache size limits?" → Browser manages this. Typically caps HTTP cache at ~2GB and evicts LRU entries. Origin quota for storage APIs (Cache API, IndexedDB) is typically ~60% of available disk

🔥 **Most Asked**: Cache layers and order, bfcache, how to force fresh content
🧠 **Strategy**: Knowing the cache lookup order shows deep browser knowledge

---

## 228. Edge Caching vs Origin Caching ★

### Q: What is the difference between edge caching and origin caching?

**Answer (Interview-Ready):**

| Aspect | Edge Caching | Origin Caching |
|--------|-------------|----------------|
| **Where** | CDN edge servers worldwide | Near/at the origin server |
| **Latency** | 1-50ms (user-nearest PoP) | 50-200ms (single location) |
| **Examples** | CloudFront, Fastly, Cloudflare | Varnish, Nginx reverse proxy, Redis |
| **What's cached** | Static assets, HTML, API responses | Database query results, computed pages |
| **Cache miss cost** | Round-trip to origin + edge cache population | DB query/computation + cache population |
| **Invalidation** | Purge API (propagates to all PoPs) | Simple (single location) |

**Multi-layer caching architecture:**
```
User → Edge Cache (CDN) → Origin Cache (Varnish/Redis) → App Server → Database
```

**When to use each:**
- **Edge**: Static assets (always), HTML pages (with appropriate TTL), public API responses
- **Origin**: Database query results (Redis), session data, expensive computations, personalized content

**Cloudflare Workers / Vercel Edge Functions:**
- Run logic AT the edge (not just caching — compute)
- Use Cases: A/B testing, geolocation routing, auth token validation, personalization at edge
- Cache dynamic content at edge after computation

🔥 **Most Asked**: Edge vs origin trade-offs, multi-layer architecture, edge computing
🧠 **Strategy**: "Cache at every layer: edge for global reach, origin for DB query results, in-process for hot data"

---

## 229. Service Workers (Applied to Caching)

### Q: How do Service Workers enable advanced caching strategies?

**Answer (Interview-Ready):**
- **Service Worker** = JavaScript proxy that intercepts ALL network requests from your origin. Runs in background thread, separate from main thread

**Caching strategies:**

| Strategy | Behavior | Best For |
|----------|----------|---------|
| **Cache First** | Check cache → hit? serve. Miss? fetch from network → cache | Static assets, fonts, images |
| **Network First** | Try network → success? cache + serve. Fail? serve from cache | API data, dynamic content |
| **Stale While Revalidate** | Serve from cache immediately → fetch fresh in background → update cache | Frequent updates but staleness OK (social feeds) |
| **Network Only** | Always fetch from network. No caching | Sensitive data, real-time prices |
| **Cache Only** | Always serve from cache. Never fetch | Pre-cached app shell |

**Implementation with Cache API:**
```js
// Service Worker
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // Network First for API calls
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open('api-v1').then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))  // Offline fallback
    );
  } else {
    // Cache First for static assets
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
  }
});
```

**Precaching (install event):**
```js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('shell-v1').then(cache =>
      cache.addAll(['/index.html', '/app.js', '/styles.css', '/offline.html'])
    )
  );
});
```

🔥 **Most Asked**: Caching strategies, offline fallback, precaching, lifecycle events
🧠 **Strategy**: "Cache First for assets, Network First for API data, Stale-While-Revalidate for feeds"

---

## 230. IndexedDB

### Q: When and how do you use IndexedDB for client-side storage?

**Answer (Interview-Ready):**
- **IndexedDB** = browser database. Asynchronous, transactional, indexed key-value store. Stores structured data including Blobs/Files
- Capacity: Up to ~50% of available disk (can be gigabytes)

**When to use:**
- Storing large amounts of structured data on the client (offline data, draft saves)
- Complex querying needs (indexes, ranges, cursors)
- Binary data storage (files, images for offline use)
- Replacing localStorage for anything beyond simple key-value (>5MB)

**Key API concepts:**
```js
// Open database (version 1)
const request = indexedDB.open('myApp', 1);

// Schema creation in onupgradeneeded
request.onupgradeneeded = (e) => {
  const db = e.target.result;
  const store = db.createObjectStore('articles', { keyPath: 'id' });
  store.createIndex('category', 'category', { unique: false });
  store.createIndex('date', 'publishedAt', { unique: false });
};

// Write
const tx = db.transaction('articles', 'readwrite');
tx.objectStore('articles').put({ id: 1, title: 'Hello', category: 'tech' });

// Read by index
const tx = db.transaction('articles', 'readonly');
const idx = tx.objectStore('articles').index('category');
idx.getAll('tech');  // All articles in 'tech' category
```

**Wrapper libraries (strongly recommended):**
- **idb** (Jake Archibald): Promise-based wrapper. Clean API
- **Dexie.js**: Powerful query syntax, reactive queries, pagination
- **localForage**: Simple key-value API (auto-selects best storage backend)

**Follow-ups:**
- "IndexedDB vs localStorage?" → IndexedDB: async, structured data, indexes, large capacity, transactional. localStorage: sync (blocks main thread), string-only, 5-10MB limit, no queries. Use IndexedDB for anything non-trivial
- "Storage quota?" → `navigator.storage.estimate()` returns `{ usage, quota }`. Request persistent storage: `navigator.storage.persist()` → browser won't evict data under storage pressure

🔥 **Most Asked**: When to use, vs localStorage, wrapper libraries, storage quota
🧠 **Strategy**: "Use IndexedDB (with idb/Dexie wrapper) for any client-side storage beyond simple preferences"

---

## 231. LocalStorage vs SessionStorage

### Q: What are the differences between localStorage, sessionStorage, and cookies?

**Answer (Interview-Ready):**

| Feature | localStorage | sessionStorage | Cookies |
|---------|-------------|---------------|---------|
| **Capacity** | 5-10MB | 5-10MB | 4KB per cookie |
| **Persistence** | Until cleared | Until tab closed | Configurable (Expires/Max-Age) |
| **Scope** | Origin (protocol + domain + port) | Origin + tab | Origin + path. Sent with every HTTP request |
| **API** | Sync (blocks main thread) | Sync (blocks main thread) | `document.cookie` (string parsing) or Cookie API |
| **Sent to server** | ❌ No | ❌ No | ✅ Yes (every request to matching domain/path) |
| **Access from JS** | ✅ Yes | ✅ Yes | ✅ Unless `HttpOnly` flag |
| **Workers access** | ❌ No | ❌ No | ❌ No (but CookieStore API in Workers) |

**When to use each:**
- **localStorage**: Theme preference, language, non-sensitive settings, feature flags
- **sessionStorage**: Scroll position, form wizard state, temporary data per tab
- **Cookies**: Authentication (HttpOnly, Secure, SameSite), server-side tracking, CSRF tokens
- **IndexedDB**: Everything else (structured data, large data, offline storage)

**Security considerations:**
- **Never store tokens/secrets in localStorage** — accessible to any JS on the page (XSS vulnerability)
- Use `HttpOnly` + `Secure` + `SameSite=Strict` cookies for auth tokens
- `SameSite=Lax` for session cookies (allows top-level GET navigations)

🔥 **Most Asked**: Comparison table, security of localStorage, cookie flags
⚠️ **Common Mistakes**: Storing JWT in localStorage (XSS risk); using cookies for large data (sent with every request)
🧠 **Strategy**: "Auth tokens in HttpOnly cookies. User preferences in localStorage. Large structured data in IndexedDB"

---

## 232. Cache API & Workbox Library ★

### Q: What is the Cache API and how does Workbox simplify Service Worker caching?

**Answer (Interview-Ready):**

**Cache API:** Programmatic cache storage accessible from Service Workers and window context
```js
// Store a response
const cache = await caches.open('my-cache-v1');
await cache.put('/api/data', new Response(JSON.stringify(data)));

// Retrieve
const cached = await cache.match('/api/data');
const data = await cached.json();

// Delete
await caches.delete('my-cache-v1');  // Delete entire cache
await cache.delete('/api/old-data');  // Delete single entry
```

**Workbox** (by Google): High-level library that generates Service Worker code with best-practice caching strategies

**Workbox strategies:**
```js
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Images: Cache first, expire after 30 days, max 60 entries
registerRoute(
  ({request}) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// API: Network first, 5s timeout fallback to cache
registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api', networkTimeoutSeconds: 5 })
);

// CSS/JS: Stale while revalidate
registerRoute(
  ({request}) => ['style', 'script'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'static' })
);
```

**Workbox features:** Precaching (build-time manifest). Background sync (retry failed POSTs). Cache expiration. Broadcast updates (notify app when cache updated)

🔥 **Most Asked**: Cache API basics, Workbox strategies configuration, precaching
🧠 **Strategy**: "Use Workbox. Don't write Service Worker caching logic by hand — it's error-prone"

---

## 233. Cache Invalidation (Frontend)

### Q: How do you invalidate cached resources on the frontend?

**Answer (Interview-Ready):**

**Strategies by resource type:**

| Resource | Strategy | How |
|----------|----------|-----|
| **JS/CSS bundles** | Content hash in filename | `app.a8f3c2.js` — new content = new hash = new URL. Old version untouched in cache |
| **Images** | Content hash OR query string | `logo.png?v=2` or content-addressed `logo.a8f3c2.png` |
| **HTML** | `no-cache` + ETag | Always revalidate. Browser checks ETag → 304 if unchanged |
| **API responses** | Short TTL + SWR | `max-age=30, stale-while-revalidate=60` |
| **Service Worker cache** | Versioned cache names | `cache-v2` → delete `cache-v1` in activate event |

**Service Worker cache versioning:**
```js
const CACHE_VERSION = 'v3';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_VERSION)
            .map(key => caches.delete(key))  // Delete old caches
      )
    )
  );
});
```

**Notifying users of new versions:**
- Service Worker `controllerchange` event → show "New version available. Refresh?"
- Workbox `workbox-broadcast-update` → notify when cached response differs from network response
- React: show banner/toast when new SW has activated

🔥 **Most Asked**: Content hashing, Service Worker cache versioning, update notification UX
🧠 **Strategy**: "Content-hashed static assets + `no-cache` HTML = the frontend cache invalidation formula"

---

## 234. Offline-First Architecture

### Q: How do you design a web application that works offline?

**Answer (Interview-Ready):**

**Core architecture:**
```
App Shell (cached) → renders immediately
    ↓
Data layer
    ├── IndexedDB (local database)  → source of truth when offline
    ├── Cache API (Service Worker)  → cached pages/assets
    └── Network (API calls)         → sync when online
```

**Implementation steps:**
1. **App Shell**: Cache HTML/CSS/JS shell via Service Worker precaching. App renders instantly, even offline
2. **Data storage**: Store all data reads in IndexedDB. Read from IndexedDB first (fast), sync from network in background
3. **Optimistic writes**: User actions write to IndexedDB immediately. Queue network requests for sync
4. **Background sync**: When connectivity returns, Service Worker's `sync` event fires → process queued writes
5. **Conflict resolution**: Server may have conflicting changes. Use version numbers or timestamps. LWW or prompt user

**Sync patterns:**
```js
// Queue writes for background sync
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Save to sync queue in IndexedDB
        saveToSyncQueue(event.request.clone());
        return new Response('Queued for sync', { status: 202 });
      })
    );
  }
});

// Process queue when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueue());
  }
});
```

**User experience:** Show clear online/offline indicator. Mark unsynced data visually. Toast notification when sync completes. Handle conflicts gracefully

🔥 **Most Asked**: Offline-first architecture, Background Sync API, conflict resolution
🧠 **Strategy**: "Offline-first = local-first. Store everything in IndexedDB. Network is an enhancement, not a requirement"

---

## 235. Handling Stale Data

### Q: How do you detect and handle stale data in frontend applications?

**Answer (Interview-Ready):**

**Sources of staleness:**
- Cached API responses served after data changed on server
- Service Worker serving old cache while network updates in background
- Multiple tabs with different data versions
- Long-lived WebSocket connections after temporary disconnect

**Detection patterns:**
| Pattern | How |
|---------|-----|
| **Polling** | Periodically check for updates (`setInterval` every 30s) |
| **ETags** | On each request, server returns ETag. Client sends `If-None-Match`. Different ETag = stale |
| **Version header** | API returns `X-Version: 42`. Client tracks version → mismatch = stale |
| **Real-time push** | WebSocket/SSE pushes invalidation events |
| **Broadcast Channel** | Cross-tab communication → one tab fetches fresh data → broadcasts to other tabs |

**stale-while-revalidate pattern (application level):**
```tsx
// TanStack Query / SWR pattern
const { data, isStale } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  staleTime: 30_000,     // Data is fresh for 30 seconds
  gcTime: 5 * 60_000,    // Cache kept for 5 minutes
  refetchOnWindowFocus: true,  // Refetch when tab regains focus
  refetchOnReconnect: true,     // Refetch when network reconnects
});

// Show indicator when data is stale
{isStale && <Banner>Data may be outdated. Refreshing...</Banner>}
```

**Cross-tab sync:**
```js
const channel = new BroadcastChannel('data-sync');
// When one tab fetches fresh data:
channel.postMessage({ type: 'CACHE_UPDATED', key: 'products' });
// Other tabs listen and refetch:
channel.onmessage = (e) => { if (e.data.key === 'products') queryClient.invalidateQueries(['products']); };
```

🔥 **Most Asked**: SWR pattern, cross-tab sync, stale detection
🧠 **Strategy**: "TanStack Query or SWR for data fetching — stale handling is built in"

---

## 236. Cache-Control by Page Type

### Q: What caching strategy do you apply for different page types?

**Answer (Interview-Ready):**

| Page Type | Cache-Control | Reasoning |
|-----------|--------------|-----------|
| **Static landing page** | `public, max-age=3600, s-maxage=86400` | CDN caches for 24h, browser 1h |
| **Blog post** | `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400` | CDN serves while revalidating |
| **Dashboard (auth'd)** | `private, no-cache, no-store` | Personalized, sensitive |
| **API: public list** | `public, s-maxage=60, stale-while-revalidate=300` | CDN caches 1min, serves stale 5min |
| **API: user-specific** | `private, max-age=0, must-revalidate` | Never serve stale personalized data |
| **JS/CSS bundles** | `public, max-age=31536000, immutable` | Content-hashed filenames → cache forever |
| **HTML (SPA)** | `no-cache` | Always check for new app version |
| **Fonts** | `public, max-age=31536000, immutable` | Fonts don't change |
| **Images (user-uploaded)** | `public, max-age=86400` | 1 day, URL changes on re-upload |

**Common patterns:**
- **Deploy new code**: HTML has `no-cache` → browser checks for new HTML → new HTML references new `app.abc123.js` → fresh bundle loaded. Old bundles cached forever but never referenced
- **Purge CDN after publish**: Only for non-hashed URLs (HTML, robots.txt, sitemap.xml)

🔥 **Most Asked**: Per-page-type strategy, the HTML/JS cache dance during deployments
🧠 **Strategy**: Make this table your reference. Different content types = different caching strategies. One size does not fit all

---

## 237. Stale-While-Revalidate

### Q: How does stale-while-revalidate work at both HTTP and application levels?

**Answer (Interview-Ready):**

**HTTP level:**
```
Cache-Control: max-age=60, stale-while-revalidate=300

Timeline:
0-60s:    Serve from cache (FRESH)
60-360s:  Serve from cache (STALE) + fetch fresh copy in background
360s+:    Must fetch fresh (cache expired beyond SWR window)
```
- **Benefit**: User always gets instant response. Freshness maintained in background
- **Supported by**: CDNs (Cloudflare, Fastly, CloudFront), modern browsers

**Application level (TanStack Query / SWR library):**
```tsx
// SWR library (Vercel)
const { data, mutate } = useSWR('/api/products', fetcher, {
  revalidateOnFocus: true,    // Refetch when window gains focus
  revalidateOnReconnect: true, // Refetch when back online
  refreshInterval: 30000,      // Poll every 30s
  dedupingInterval: 2000,     // Deduplicate requests within 2s
});

// TanStack Query equivalent
const { data } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  staleTime: 30_000,  // Fresh for 30 seconds
  refetchOnWindowFocus: true,
});
```

**Why SWR pattern dominates modern apps:**
- Fast: show cached data instantly → no loading spinners
- Fresh: background revalidation keeps data current
- Resilient: works offline (serves from cache)
- Simple: library handles the complexity

🔥 **Most Asked**: HTTP header behavior, SWR library usage, when stale is acceptable
🧠 **Strategy**: "stale-while-revalidate is the most important caching directive for user experience. Instant response + eventual freshness"

---

## 238. Cache Poisoning Awareness

### Q: What is cache poisoning and how do you prevent it?

**Answer (Interview-Ready):**
- **Cache poisoning** = attacker tricks the cache into storing malicious content, which is then served to other users

**Attack vectors:**
| Vector | How | Prevention |
|--------|-----|-----------|
| **Unkeyed headers** | CDN caches response but doesn't key on certain headers (e.g., `X-Forwarded-Host`). Attacker sends malicious header → response cached → served to all | Configure CDN cache keys correctly. Include relevant headers in cache key |
| **Web cache deception** | Attacker tricks user into visiting `example.com/account.css`. CDN caches the account page as a CSS file (path-based caching). Attacker fetches → gets user's data | Don't cache authenticated content at CDN. Use `Cache-Control: private` for sensitive pages |
| **Parameter pollution** | Different parameter ordering creates different cache entries. Attacker injects JS via parameter → cached | Normalize/sort query parameters before caching |
| **Host header injection** | Manipulate `Host` header → poisoned redirect URLs in cached page | Validate Host header on server. Use `Strict-Transport-Security` |

**Prevention best practices:**
- Set explicit cache keys (URL + relevant headers)
- Use `Cache-Control: private, no-store` for authenticated/personalized content
- Validate all headers used in cache key generation
- Use CDN's security rules and WAF
- Normalize query parameters and paths before caching
- Regular security audits of caching configuration

🔥 **Most Asked**: Web cache deception, unkeyed headers, prevention strategies
⚠️ **Common Mistakes**: Caching authenticated pages at CDN; not considering cache key in security review
🧠 **Strategy**: "Cache poisoning is a real OWASP risk. Always ask: what's in the cache key, and can an attacker influence it?"

---

## 239. Background Sync API ★

### Q: How does the Background Sync API work for offline-capable web apps?

**Answer (Interview-Ready):**
- **Background Sync** = lets you defer actions until the user has connectivity. Service Worker fires a `sync` event when the network is available

**How it works:**
```
1. User submits a form while offline
2. App stores the data (IndexedDB) and registers a sync event
3. Browser detects connectivity restored
4. Browser wakes up Service Worker → fires `sync` event
5. Service Worker processes queued requests → sends to server
6. On success: clean up IndexedDB queue. On failure: retry
```

**Implementation:**
```js
// In app code — register sync
async function submitComment(comment) {
  // Save to local queue
  await saveToQueue('pending-comments', comment);
  
  // Register sync event
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register('sync-comments');
}

// In Service Worker — handle sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-comments') {
    event.waitUntil(
      getQueue('pending-comments').then(comments =>
        Promise.all(comments.map(c =>
          fetch('/api/comments', { method: 'POST', body: JSON.stringify(c) })
            .then(() => removeFromQueue('pending-comments', c.id))
        ))
      )
    );
  }
});
```

**Periodic Background Sync (experimental):**
```js
// Periodically sync data (e.g., refresh news feed in background)
const registration = await navigator.serviceWorker.ready;
await registration.periodicSync.register('refresh-feed', {
  minInterval: 12 * 60 * 60 * 1000,  // minimum every 12 hours
});
```
- Browser decides actual frequency based on site engagement score
- Only Chromium browsers currently support this

**Browser support:** Background Sync: Chrome, Edge, Opera (Chromium). Periodic Sync: Chrome only. No Firefox/Safari (use polling as fallback)

🔥 **Most Asked**: How sync event works, offline queue pattern, browser support
🧠 **Strategy**: "Background Sync for reliable offline writes. Always provide a fallback for unsupported browsers (polling or retry on focus)"

---
---

> **End of File 02 — Architecture, Databases & Infrastructure**
> 
> **Coverage Summary:**
> - Part A: Networking & Communication (topics 27-37) ✅
> - Part B: Architectural Patterns (topics 38-45) ✅
> - Part C: Load Balancing (topics 46-52) ✅
> - Part D: Databases & Storage (topics 53-76) ✅
> - Part E: Caching (topics 77-84) ✅
> - Part F: Consistency & Replication (topics 85-92) ✅
> - Part G: Frontend Architecture Patterns (topics 196-209) ✅
> - Part H: Rendering Strategies (topics 210-225) ✅
> - Part I: Frontend Caching & Offline (topics 226-239) ✅
> 
> **Total: 110 topics covered**
> 
> [← Back to Master Index](00_MASTER_INDEX.md) | [Next: Distributed Systems & Resilience →](03_Distributed_Systems_Resilience.md)
