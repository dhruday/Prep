# Frontend System Design
## Design WhatsApp

---

> **Interview Duration:** 45–60 minutes  
> **Difficulty:** ⭐⭐⭐⭐⭐ (Staff / Principal Level)  
> **Target Levels:** Google L5/L6, Meta E5/E6, Uber IC4/IC5, Airbnb L5/L6, Microsoft SDE III/Principal, Amazon SDE III/Principal, LinkedIn Staff, Atlassian Staff  
> **Prerequisites:** React fundamentals, HTTP, WebSockets, REST API basics, Browser APIs  
> **Core Skills Tested:** Real-time systems, WebSocket architecture, Offline-first design, State management, Performance optimization, Security, Accessibility, Component design

---

## Table of Contents

1. [Understanding the Product](#ch1)
2. [Requirement Gathering](#ch2)
3. [Scale Estimation](#ch3)
4. [High-Level Architecture](#ch4)
5. [Frontend Architecture](#ch5)
6. [Component Hierarchy](#ch6)
7. [API Design](#ch7)
8. [WebSocket Deep Dive](#ch8)
9. [Data Flow](#ch9)
10. [State Management](#ch10)
11. [Offline First Architecture](#ch11)
12. [Rendering Strategy](#ch12)
13. [Performance Optimization](#ch13)
14. [Infinite Scroll](#ch14)
15. [Presence System](#ch15)
16. [Message Ordering](#ch16)
17. [Media Upload](#ch17)
18. [Notifications](#ch18)
19. [Search](#ch19)
20. [Accessibility](#ch20)
21. [Responsive Design](#ch21)
22. [Security](#ch22)
23. [Monitoring](#ch23)
24. [Testing](#ch24)
25. [Tradeoffs](#ch25)
26. [Interview Walkthrough](#ch26)
27. [Google vs Meta Expectations](#ch27)
28. [Common Follow-up Questions (100+)](#ch28)
29. [Common Mistakes (Top 50)](#ch29)
30. [Production Best Practices](#ch30)
31. [Complete Summary](#ch31)
- [Appendix](#appendix)

---

<a name="ch1"></a>
# Chapter 1: Understanding the Product

## 1.1 Why WhatsApp Exists

WhatsApp was born in 2009 to solve a simple but massive problem: **SMS was expensive, carrier-dependent, and crossed borders badly**. Jan Koum and Brian Acton built it to let people communicate across the globe with zero per-message cost — just internet. When Facebook acquired it in 2014 for $19 billion, it had 450 million users and only 55 engineers. This is perhaps the most studied engineering efficiency story in tech history.

The core insight: **reliable, private, free messaging across devices and geographies**.

## 1.2 Business Goals

| Business Goal | Explanation |
|---|---|
| **Scale to billions** | Support 2B+ users with minimal engineering overhead |
| **Global reach** | Work across carriers, countries, and networks including 2G |
| **Platform stickiness** | Keep users on WhatsApp ecosystem (Business, Payments, Status) |
| **Monetization via Business API** | WhatsApp Business API charges enterprises per conversation |
| **Data network effect** | Contacts in network increase value for every new user |
| **Privacy as brand** | End-to-end encryption as competitive differentiator vs SMS/iMessage |

## 1.3 User Goals

```
Primary User Goals
├── Send messages instantly to anyone globally
├── Know if messages were delivered and read
├── Share photos, videos, documents, location
├── Make voice and video calls
├── Create and manage groups
├── Express reactions (emojis, stickers, GIFs)
├── Search through message history
└── Use across multiple devices simultaneously
```

## 1.4 Messaging Goals

- **Reliability**: Messages must never be silently lost
- **Ordering**: Messages must appear in correct chronological sequence
- **Delivery guarantees**: Single tick (sent) → Double tick (delivered) → Blue tick (read)
- **Speed**: Message delivery in <500ms on good networks
- **Persistence**: Messages survive app restarts, device switches, reinstalls

## 1.5 Reliability Goals

| Metric | Target |
|---|---|
| Message delivery rate | 99.99%+ |
| Message ordering correctness | 100% |
| Uptime | 99.95%+ |
| Recovery from offline | Automatic, transparent |
| Data loss | Zero tolerance |

## 1.6 Privacy Goals

- End-to-end encryption for all messages (Signal Protocol)
- No message content stored on servers after delivery
- Minimal metadata retention
- Disappearing messages (user configurable)
- Blocked contacts cannot see your status
- Privacy settings for Last Seen, Profile Photo, About, Status

## 1.7 Revenue Model

```
WhatsApp Revenue Streams (2024)
├── WhatsApp Business API
│   ├── Per-conversation pricing ($0.0058–$0.0796 per conversation)
│   ├── Tiered by country and conversation type (utility/marketing/service)
│   └── Major customers: banks, airlines, e-commerce, customer support
├── WhatsApp Business App (small businesses, freemium)
├── Meta Business Suite integration
└── Payments (WhatsApp Pay) — Brazil, India, Singapore
```

## 1.8 Success Metrics (KPIs)

### Product Health Metrics
```
┌─────────────────────────────────────────────────────────┐
│                   SUCCESS METRICS                        │
├─────────────────┬───────────────────────────────────────┤
│ ENGAGEMENT      │ Messages/user/day, DAU/MAU ratio       │
│ RELIABILITY     │ Message delivery rate, P99 latency     │
│ RETENTION       │ Day-1, Day-7, Day-30 retention         │
│ GROWTH          │ New users, contacts added, invites sent │
│ QUALITY         │ Media delivery success, call quality    │
│ PERFORMANCE     │ App start time, message send time      │
└─────────────────┴───────────────────────────────────────┘
```

### Frontend-Specific KPIs
- **Time to First Message Render (TFMR)**: <1.5s on 4G
- **Message Send Latency (P50/P99)**: P50 < 200ms, P99 < 2s
- **WebSocket Connection Success Rate**: >99.9%
- **Reconnection Time**: <3 seconds after network restored
- **Crash-Free Session Rate**: >99.5%
- **Unread Badge Accuracy**: 100%
- **Search Result Time**: <300ms for local, <1s for server

### Business KPIs
- **DAU**: 2 billion+ active users
- **Messages/day**: 100 billion+
- **Business conversations/month**: 1 billion+
- **Status views/day**: 500 million+

---

> **💡 Interview Tip (Chapter 1):** Interviewers often skip this chapter in a rush to architecture. Don't. Spend 2–3 minutes discussing business context. Mentioning "WhatsApp Business API revenue model" and "privacy as brand differentiation" signals senior-level product thinking. Google and Meta interviewers specifically want to hear product reasoning before you draw boxes.

---

<a name="ch2"></a>
# Chapter 2: Requirement Gathering

## 2.1 The Clarifying Conversation

In a real interview, you would ask these questions systematically. Here is a model conversation:

```
Interviewer: "Design WhatsApp."

You: "Before diving into architecture, I'd like to clarify scope.
     Are we designing:
     (1) the full mobile app, (2) WhatsApp Web, or (3) the entire
     system including backend?"

Interviewer: "Focus on the frontend — WhatsApp Web experience."

You: "Great. Should I cover:
     — Core 1:1 messaging with delivery receipts?
     — Group chats?
     — Voice/video calls?
     — Media sharing?
     — Status (Stories-like feature)?"

Interviewer: "Focus on messaging — 1:1 and group — with full
              delivery pipeline, presence, and media. Skip calls."

You: "Understood. Should I assume existing auth/session
     management, or should I cover login flow too?"

Interviewer: "Assume user is logged in. Start from the chat UI."

You: "One more — are we targeting global scale from day one?
     100M users? 2B?"

Interviewer: "Design as if you're WhatsApp — 2B users,
              100B messages/day."

You: "Perfect. Let me note functional and non-functional
     requirements, then estimate scale before jumping to design."
```

## 2.2 Functional Requirements

### Core (Must Have)

| Feature | Description | Priority |
|---|---|---|
| **One-to-one chat** | Real-time messaging between two users | P0 |
| **Group chat** | Up to 1024 participants | P0 |
| **Message delivery** | Sent → Delivered → Read receipts | P0 |
| **Online/offline status** | Real-time presence indicator | P0 |
| **Typing indicator** | "User is typing..." with debounce | P0 |
| **Read receipts** | Single/double/blue ticks | P0 |
| **Media sharing** | Images, videos, documents, voice notes | P0 |
| **Push notifications** | Background message notifications | P0 |
| **Offline support** | Queue messages, sync on reconnect | P0 |

### Extended (Should Have)

| Feature | Description | Priority |
|---|---|---|
| **Emoji & Stickers** | Emoji picker, custom stickers | P1 |
| **Message reactions** | React with emoji to messages | P1 |
| **Reply to message** | Inline reply with quoted context | P1 |
| **Message search** | Full-text search across chats | P1 |
| **Message forwarding** | Forward to one or multiple chats | P1 |
| **Delete for everyone** | Recall sent message for all parties | P1 |
| **Edit message** | Edit sent messages (with edit history) | P1 |
| **Voice notes** | Record and send audio messages | P1 |
| **Multi-device** | WhatsApp on 4 linked devices | P1 |

### Nice to Have (Could Have)

| Feature | Description | Priority |
|---|---|---|
| **Starred messages** | Save important messages | P2 |
| **Archive chats** | Move chats to archive | P2 |
| **Pinned chats** | Pin up to 3 chats to top | P2 |
| **Disappearing messages** | Auto-delete after timer | P2 |
| **GIF support** | Inline GIF search & send | P2 |
| **Link preview** | Auto-generate previews for URLs | P2 |
| **Location sharing** | Live or static location | P2 |
| **Polls in groups** | Create voting polls | P2 |
| **View once media** | Media disappears after viewing | P2 |

## 2.3 Non-Functional Requirements

```
NON-FUNCTIONAL REQUIREMENTS
│
├── PERFORMANCE
│   ├── First message render: < 1.5s (4G)
│   ├── Message send (optimistic): < 100ms perceived
│   ├── Infinite scroll load: < 500ms
│   ├── Search results: < 300ms (local), < 1s (server)
│   └── Media preview render: < 800ms
│
├── SCALABILITY
│   ├── Support 2B users
│   ├── 100B messages/day
│   ├── Horizontal scaling at every layer
│   └── Handle traffic spikes (New Year's Eve: 3x normal)
│
├── RELIABILITY
│   ├── Zero message loss guarantee
│   ├── Exactly-once message delivery
│   ├── Message ordering preserved globally
│   └── Graceful degradation on poor networks
│
├── AVAILABILITY
│   ├── 99.95% uptime (< 4.4 hours downtime/year)
│   ├── Multi-region deployment
│   └── Automatic failover
│
├── OFFLINE SUPPORT
│   ├── Full UI functional offline (read cached messages)
│   ├── Queue outbound messages for retry
│   ├── Sync missed messages on reconnect
│   └── No data loss on page refresh
│
├── BATTERY & NETWORK OPTIMIZATION
│   ├── Adaptive heartbeat intervals
│   ├── Message batching on reconnect
│   ├── Background sync minimization
│   └── Progressive image loading
│
├── SECURITY
│   ├── E2E encryption (Signal Protocol)
│   ├── JWT + refresh tokens
│   ├── XSS / CSRF protection
│   ├── Content Security Policy
│   └── Secure media URLs (pre-signed, expiring)
│
└── ACCESSIBILITY
    ├── WCAG 2.1 AA compliance
    ├── Screen reader support (NVDA, VoiceOver)
    ├── Keyboard navigation
    ├── Reduced motion support
    └── RTL language support (Arabic, Hebrew, Urdu)
```

## 2.4 Assumptions

```
ASSUMPTIONS FOR THIS DESIGN

✅ User is authenticated (session exists)
✅ Backend services exist and are stable
✅ Web browser environment (Chrome, Firefox, Safari, Edge)
✅ E2E encryption happens at application layer (frontend handles keys)
✅ Media CDN is available (Akamai/CloudFront-equivalent)
✅ Push notification infrastructure exists (FCM/APNS via service worker)
✅ We are designing for desktop-first WhatsApp Web experience
✅ Users have internet access (offline = temporary disconnection)
✅ GraphQL subscriptions or WebSocket for real-time
✅ React as UI framework (company choice)

❌ We are NOT designing backend services in depth
❌ We are NOT designing E2E crypto algorithm (mention Signal Protocol)
❌ We are NOT designing voice/video calls
❌ We are NOT designing Status (Stories) feature
```

---

> **💡 Interview Tip (Chapter 2):** Requirement gathering is worth 10–15% of your score. Never skip it, even under time pressure. The best move: quickly write a checklist on the whiteboard — "Core", "Extended", "Out of Scope" — then invite the interviewer to prioritize. This shows structured thinking and collaboration, exactly what L5/L6 engineers demonstrate.

---

<a name="ch3"></a>
# Chapter 3: Scale Estimation

## 3.1 Why Estimations Matter

Scale estimates are not just math — they drive design decisions. A system for 10K users uses polling. A system for 2B users requires WebSocket multiplexing, connection pooling, partitioned databases, multi-region CDN, and careful cache strategies. When you estimate first, every architectural decision becomes justifiable with data.

## 3.2 User Scale

```
USER SCALE ESTIMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Global Population:        8 billion
Smartphone users:         6.4 billion (80%)
Internet users:           5.4 billion (67.5%)
WhatsApp eligible:        ~3 billion (18+, in WhatsApp markets)

MAU (Monthly Active):     2.0 billion
DAU (Daily Active):       1.5 billion (75% of MAU — high stickiness)

Peak concurrent users:    ~600 million (9 AM - 1 PM across time zones)
                          (40% of DAU online at peak)

WebSocket connections:    ~600 million simultaneous persistent connections
                          (one per browser tab / mobile app)
```

## 3.3 Message Volume

```
MESSAGE VOLUME ESTIMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Messages per DAU per day:    70 (send + receive, avg)
Total messages per day:      1.5B users × 70 = 105 billion

Messages per second (avg):   105B / 86,400s ≈ 1.2 million msg/s
Messages per second (peak):  1.2M × 3 (spike factor) ≈ 3.6 million msg/s

Text messages (70%):         73.5 billion/day
Media messages (25%):        26.25 billion/day
Voice notes (5%):            5.25 billion/day

WebSocket events/second:     ~10M events/s (messages + presence + typing)
```

## 3.4 Media & Storage

```
MEDIA & STORAGE ESTIMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Media messages/day:          26.25 billion
Avg media size (compressed):
  Images:    200 KB (after compression)
  Videos:    5 MB  (after compression, 60s max)
  Documents: 1 MB  (avg)
  Voice:     100 KB (1 min audio, opus codec)

Image proportion:  70% of media  → 18.3B × 200KB = 3.66 PB/day
Video proportion:  20% of media  → 5.25B × 5MB   = 26.25 PB/day
Documents:         8%            → 2.1B × 1MB    = 2.1 PB/day
Voice notes:       2%            → 525M × 100KB  = 52.5 TB/day

Total raw media/day:         ~32 PB/day
CDN cache hit (80%):         ~6.4 PB/day origin traffic

Message metadata storage:    105B × 200 bytes avg = 21 TB/day
  (after E2E encryption, server only stores encrypted blob)
```

## 3.5 Network & Bandwidth

```
BANDWIDTH ESTIMATION (Frontend Perspective)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Per user per hour:
  WebSocket keep-alive overhead:  ~1 KB/hr
  Text messages received:         ~50 msgs × 500B = 25 KB/hr
  Typing indicators:              ~100 events × 50B = 5 KB/hr
  Presence updates:               ~200 events × 100B = 20 KB/hr
  Total control plane:            ~51 KB/hr per user

Media (on demand, CDN served):
  Images viewed per hr:           ~20 × 200KB = 4 MB/hr
  Videos viewed per hr:           ~3 × 5MB = 15 MB/hr
  Total media:                    ~19 MB/hr per active user

System-wide:
  600M concurrent × 51KB/hr = 30.6 TB/hr text/control
  Active media users (30%): 180M × 19MB/hr = 3.42 PB/hr CDN
```

## 3.6 Caching Requirements

```
CACHE ESTIMATION (Frontend + CDN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Browser-side (IndexedDB per user):
  Cached messages (last 100/chat × 20 chats):    ~2,000 messages × 500B = 1 MB
  Cached media thumbnails:                        ~5 MB
  Contact metadata:                               ~500 KB
  Chat metadata:                                  ~200 KB
  Total per user browser cache:                   ~7 MB

CDN caching:
  Hot media (last 24hr, frequently accessed):     ~200 TB globally
  Cache hit rate target:                          >85%
  Cache TTL for media:                            7 days (immutable content hash)

Server-side Redis:
  Online presence (600M users × 50B):             30 GB
  Typing indicators:                              ~1 GB
  Message queues (offline users):                 ~100 GB
  Session tokens:                                 ~60 GB (600M × 100B)
```

## 3.7 Why These Numbers Matter

```
DESIGN DECISIONS DRIVEN BY SCALE ESTIMATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

600M concurrent WebSockets
  → Cannot use HTTP long polling (TCP overhead too high)
  → Need persistent WebSocket with custom protocol
  → Need connection multiplexing at gateway layer

3.6M messages/second peak
  → Cannot use naive broadcast
  → Need message fanout service, queue-based delivery
  → Need partition strategy (shard by user ID)

32 PB media/day
  → Must use chunked upload with deduplication
  → CDN with edge caching is mandatory, not optional
  → Client-side compression before upload is critical

7 MB browser cache per user
  → IndexedDB is mandatory (localStorage 5MB limit)
  → Need LRU eviction strategy
  → Service Worker for offline asset caching
```

---

> **💡 Interview Tip (Chapter 3):** Do estimates fast but out loud. Show the math. Interviewers care about **reasoning**, not precision. Say: "Let's assume 1.5B DAU, 70 messages per user per day. That's roughly 100B messages/day or about 1.2M/second. Peak is maybe 3x, so ~3.6M/s. This tells me we need WebSockets — polling at this scale would generate 600M requests/second on reconnect alone." This is exactly how L6 engineers think.

---

<a name="ch4"></a>
# Chapter 4: High-Level Architecture

## 4.1 Complete System Architecture

```
HIGH-LEVEL ARCHITECTURE — WhatsApp Web
═══════════════════════════════════════════════════════════════════

 ┌──────────────────────────────────────────────────────────┐
 │                     CLIENT LAYER                          │
 │  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐  │
 │  │  React App   │  │  Service    │  │   IndexedDB /   │  │
 │  │  (SPA/CSR)   │  │  Worker     │  │   LocalStorage  │  │
 │  └──────┬───────┘  └──────┬──────┘  └─────────────────┘  │
 └─────────┼────────────────┼──────────────────────────────┘
           │                │ (offline assets, push events)
           │ HTTPS / WSS    │
           ▼                ▼
 ┌─────────────────────────────────────────────────────────┐
 │                    EDGE LAYER                            │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │              CDN (Akamai / CloudFront)             │  │
 │  │  Static assets, media files, thumbnails            │  │
 │  │  Edge caching, geo-distributed                     │  │
 │  └────────────────────────┬──────────────────────────┘  │
 └───────────────────────────┼─────────────────────────────┘
                             │
                             ▼
 ┌──────────────────────────────────────────────────────────┐
 │                  API GATEWAY LAYER                        │
 │  ┌─────────────────────────────────────────────────────┐ │
 │  │     API Gateway (Nginx / Envoy / AWS API GW)        │ │
 │  │  • Rate limiting (per user, per IP)                 │ │
 │  │  • Request routing                                  │ │
 │  │  • SSL termination                                  │ │
 │  │  • Load balancing                                   │ │
 │  │  • DDoS protection                                  │ │
 │  └──────┬──────────────────────┬────────────────────── ┘ │
 └─────────┼──────────────────────┼───────────────────────┘
           │                      │
           ▼                      ▼
 ┌────────────────┐    ┌────────────────────────┐
 │  AUTH SERVICE  │    │   WEBSOCKET GATEWAY    │
 │  • JWT issue   │    │   (Sticky sessions)    │
 │  • JWT verify  │    │   • 600M connections   │
 │  • Refresh     │    │   • Connection mgmt    │
 │  • Revocation  │    │   • Heartbeat (30s)    │
 │  • Rate limit  │    │   • Reconnect handling │
 └────────────────┘    └───────────┬────────────┘
                                   │
           ┌───────────────────────┼──────────────────┐
           │                       │                  │
           ▼                       ▼                  ▼
 ┌─────────────────┐  ┌────────────────────┐  ┌─────────────────┐
 │ MESSAGING       │  │ PRESENCE SERVICE   │  │ NOTIFICATION    │
 │ SERVICE         │  │ • Online/offline   │  │ SERVICE         │
 │ • Message store │  │ • Last seen        │  │ • Push (FCM)    │
 │ • Delivery ACK  │  │ • Typing indicator │  │ • Web push      │
 │ • Fanout        │  │ • Heartbeat track  │  │ • Badge count   │
 │ • Ordering      │  │ • Redis pub/sub    │  │ • Email fallback │
 │ • Group msgs    │  └────────────────────┘  └─────────────────┘
 └────────┬────────┘
          │
          ▼
 ┌──────────────────────────────────────────────────────────┐
 │                   DATA LAYER                              │
 │  ┌─────────────────┐  ┌──────────────┐  ┌────────────┐  │
 │  │   Message DB    │  │    Redis     │  │ Media DB   │  │
 │  │   (Cassandra/   │  │  • Presence  │  │ (S3-compat │  │
 │  │    HBase)       │  │  • Sessions  │  │  blob      │  │
 │  │  Append-only    │  │  • Msg queue │  │  storage)  │  │
 │  │  Time-series    │  │  • Pub/sub   │  └────────────┘  │
 │  └─────────────────┘  └──────────────┘                  │
 └──────────────────────────────────────────────────────────┘
          │                        │
          ▼                        ▼
 ┌─────────────────┐    ┌──────────────────────┐
 │ MEDIA SERVICE   │    │ ANALYTICS / LOGGING  │
 │ • Upload API    │    │ • Event streaming    │
 │ • Chunk upload  │    │ • Crash reporting    │
 │ • Compression   │    │ • Metrics (Grafana)  │
 │ • CDN push      │    │ • Distributed trace  │
 │ • Presigned URL │    │ (Kafka + Flink)      │
 └─────────────────┘    └──────────────────────┘
```

## 4.2 Service Explanations

### API Gateway
The single entry point for all client traffic. Handles SSL termination (offloading TLS from backend services), rate limiting to prevent abuse, and request routing. Critical for security as it centralizes auth header verification. Uses sticky sessions or consistent hashing to route WebSocket connections to the same gateway node.

### Auth Service
Issues JWT access tokens (15-minute TTL) and long-lived refresh tokens (30-day TTL) stored in HttpOnly cookies. Validates every request. Maintains token revocation list in Redis. Handles multi-device session management — each device gets its own session token.

### WebSocket Gateway
The most critical service for WhatsApp Web. Maintains persistent bidirectional connections for up to 600M users simultaneously. Uses a custom binary protocol (similar to XMPP but optimized) over WebSocket for efficiency. Each gateway node handles 100K–500K connections. Routes inbound messages to Messaging Service and pushes outbound messages to correct client connections.

### Messaging Service
Core business logic: message validation, storage, ordering, delivery, and fanout. For group messages, responsible for fanning out to all member connections. Implements exactly-once delivery semantics using message IDs and ACK tracking. Persists messages to Cassandra (append-only, time-series optimized).

### Presence Service
Tracks online/offline status and typing indicators. Uses Redis pub/sub — when a user goes online, their gateway node publishes to a channel that all subscribers listen to. Aggregates presence for contacts. Typing indicators are ephemeral — published via WebSocket, never stored.

### Notification Service
Handles push notifications for offline users. When Messaging Service cannot deliver via WebSocket (user offline), it queues the notification in Notification Service which sends via FCM (Android), APNS (iOS), or Web Push API. Also manages unread badge counts.

### Media Service
Handles all binary uploads. Accepts chunked uploads for large files, performs server-side compression and format optimization, generates thumbnails, pushes to CDN. Returns pre-signed CDN URLs with short TTL for secure media access.

### Database Layer
- **Cassandra/HBase**: Message storage — append-only, time-series, massive write throughput, partition by conversation ID + time bucket
- **Redis**: Ephemeral data — presence, sessions, typing, offline message queue
- **S3-compatible blob storage**: Media files — immutable after write, versioned, replicated

---

> **💡 Interview Tip (Chapter 4):** Don't try to design every backend service in detail during a frontend interview. Spend 3 minutes on high-level architecture, explain 2-3 services clearly, then say: "For the frontend design, I'll treat the backend as a black box exposing REST APIs and WebSocket events. Let me focus on the client-side architecture." This shows you understand the full system without wasting time on backend internals.

---

<a name="ch5"></a>
# Chapter 5: Frontend Architecture

## 5.1 Architecture Philosophy

WhatsApp Web uses a **CSR (Client-Side Rendered) Single Page Application**. This choice is deliberate: once loaded, the app needs zero page navigation (reducing re-renders), full offline capability via Service Workers, and complex client-side state for real-time chat. The trade-off is a longer initial load time, which is acceptable because WhatsApp Web is used as a persistent tab — not a landing page.

**Core architecture principles:**
1. **Feature-based folder structure** (not role-based)
2. **Unidirectional data flow** (actions → reducers → state → UI)
3. **Separation of concerns**: UI components know nothing about WebSocket or IndexedDB
4. **Offline-first**: State is always persisted before network operations

## 5.2 Feature-Based Folder Structure

```
whatsapp-web/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── service-worker.js           ← Push notifications + offline cache
│
├── src/
│   ├── app/
│   │   ├── App.tsx                 ← Root component, router, global providers
│   │   ├── router.tsx              ← React Router config
│   │   ├── store.ts                ← Redux store configuration
│   │   └── providers.tsx           ← Context providers composition
│   │
│   ├── features/                   ← Feature-based modules (core pattern)
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   └── QRCodeScanner.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── store/
│   │   │   │   └── authSlice.ts
│   │   │   └── api/
│   │   │       └── authApi.ts
│   │   │
│   │   ├── chats/
│   │   │   ├── components/
│   │   │   │   ├── ConversationList/
│   │   │   │   │   ├── ConversationList.tsx
│   │   │   │   │   ├── ConversationItem.tsx
│   │   │   │   │   └── ConversationItem.test.tsx
│   │   │   │   └── ChatWindow/
│   │   │   │       ├── ChatWindow.tsx
│   │   │   │       ├── ChatHeader.tsx
│   │   │   │       └── ChatHeader.test.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useConversations.ts
│   │   │   │   └── useActiveChat.ts
│   │   │   ├── store/
│   │   │   │   └── chatsSlice.ts
│   │   │   └── api/
│   │   │       └── chatsApi.ts
│   │   │
│   │   ├── messages/
│   │   │   ├── components/
│   │   │   │   ├── MessageList/
│   │   │   │   │   ├── MessageList.tsx          ← Virtualized list
│   │   │   │   │   └── MessageList.test.tsx
│   │   │   │   ├── MessageBubble/
│   │   │   │   │   ├── MessageBubble.tsx
│   │   │   │   │   ├── TextMessage.tsx
│   │   │   │   │   ├── ImageMessage.tsx
│   │   │   │   │   ├── VideoMessage.tsx
│   │   │   │   │   ├── VoiceMessage.tsx
│   │   │   │   │   ├── DocumentMessage.tsx
│   │   │   │   │   └── ReplyPreview.tsx
│   │   │   │   ├── MessageInput/
│   │   │   │   │   ├── MessageInput.tsx
│   │   │   │   │   ├── EmojiPicker.tsx
│   │   │   │   │   ├── MediaPicker.tsx
│   │   │   │   │   ├── VoiceRecorder.tsx
│   │   │   │   │   └── InputToolbar.tsx
│   │   │   │   └── MessageStatus/
│   │   │   │       ├── DeliveryTick.tsx
│   │   │   │       └── ReadReceipt.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMessages.ts
│   │   │   │   ├── useMessageSend.ts
│   │   │   │   ├── useMessageScroll.ts
│   │   │   │   ├── useTypingIndicator.ts
│   │   │   │   └── useInfiniteMessages.ts
│   │   │   ├── store/
│   │   │   │   └── messagesSlice.ts
│   │   │   └── api/
│   │   │       └── messagesApi.ts
│   │   │
│   │   ├── presence/
│   │   │   ├── hooks/
│   │   │   │   └── usePresence.ts
│   │   │   └── store/
│   │   │       └── presenceSlice.ts
│   │   │
│   │   ├── media/
│   │   │   ├── components/
│   │   │   │   ├── MediaViewer.tsx
│   │   │   │   ├── ImageUpload.tsx
│   │   │   │   └── VideoPlayer.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useMediaUpload.ts
│   │   │   └── api/
│   │   │       └── mediaApi.ts
│   │   │
│   │   ├── search/
│   │   │   ├── components/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── SearchResults.tsx
│   │   │   │   └── MessageHighlight.tsx
│   │   │   └── hooks/
│   │   │       └── useSearch.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── hooks/
│   │   │   │   └── useNotifications.ts
│   │   │   └── NotificationBanner.tsx
│   │   │
│   │   └── settings/
│   │       ├── components/
│   │       │   ├── SettingsPanel.tsx
│   │       │   ├── ProfileSettings.tsx
│   │       │   ├── PrivacySettings.tsx
│   │       │   └── NotificationSettings.tsx
│   │       └── hooks/
│   │           └── useSettings.ts
│   │
│   ├── shared/                     ← Cross-feature reusable code
│   │   ├── components/
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Toast.tsx
│   │   ├── hooks/
│   │   │   ├── useIntersectionObserver.ts
│   │   │   ├── useVirtualList.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── useOnline.ts
│   │   └── utils/
│   │       ├── dateFormatter.ts
│   │       ├── messageFormatter.ts
│   │       └── crypto.ts           ← E2E encryption utilities
│   │
│   ├── services/                   ← Infrastructure / integration layer
│   │   ├── websocket/
│   │   │   ├── WebSocketClient.ts  ← Core WS management
│   │   │   ├── WebSocketManager.ts ← Singleton, reconnect logic
│   │   │   └── messageQueue.ts     ← Offline queue
│   │   ├── storage/
│   │   │   ├── IndexedDBClient.ts  ← Local persistence
│   │   │   └── storageAdapter.ts   ← Abstract storage interface
│   │   ├── api/
│   │   │   ├── httpClient.ts       ← Axios/fetch wrapper
│   │   │   └── interceptors.ts     ← Auth, retry, error handling
│   │   └── crypto/
│   │       └── e2eEncryption.ts    ← Signal Protocol wrapper
│   │
│   └── types/                      ← TypeScript type definitions
│       ├── message.types.ts
│       ├── chat.types.ts
│       ├── user.types.ts
│       └── websocket.types.ts
│
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 5.3 Atomic Design Application

```
ATOMIC DESIGN IN WHATSAPP WEB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ATOMS (Base UI elements — pure, no logic)
  ├── Avatar          → User profile picture + fallback initials
  ├── Badge           → Unread count indicator
  ├── Tick            → Message delivery status icon (1/2/blue)
  ├── Timestamp       → Formatted time display
  ├── Spinner         → Loading indicator
  └── EmojiIcon       → Single emoji rendering

MOLECULES (Combinations of atoms, minimal logic)
  ├── ConversationItem → Avatar + Name + LastMessage + Timestamp + Badge
  ├── MessageBubble   → Text + Timestamp + Tick
  ├── MediaThumbnail  → Image + Play button + Duration
  ├── TypingDots      → Animated 3-dot typing indicator
  └── ReplyPreview    → Quoted message + sender name

ORGANISMS (Complex UI sections with business logic hooks)
  ├── ConversationList → List of ConversationItems + virtual scroll
  ├── MessageList     → Virtualized MessageBubbles + grouping by date
  ├── MessageInput    → Text input + emoji picker + media picker + send btn
  ├── ChatHeader      → Contact info + online status + actions
  └── EmojiPicker     → Full emoji grid + search + recents

TEMPLATES (Layout/page structure, no business data)
  ├── ChatLayout      → Sidebar + ChatWindow split view
  └── SettingsLayout  → Back nav + content area

PAGES (Data-fetching connected components)
  ├── ChatPage        → Connects ChatLayout to store + WebSocket
  └── SettingsPage    → Connects SettingsLayout to user profile
```

## 5.4 Container vs Presentational Pattern

```tsx
// ✅ PRESENTATIONAL COMPONENT — Pure, testable, no external deps
const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  timestamp,
  status,
  isSent,
  onReply,
  onDelete,
}) => {
  return (
    <div className={`message-bubble ${isSent ? 'sent' : 'received'}`}>
      <p>{content}</p>
      <div className="message-meta">
        <Timestamp time={timestamp} />
        {isSent && <DeliveryTick status={status} />}
      </div>
    </div>
  );
};

// ✅ CONTAINER COMPONENT — Data fetching, state, side effects
const MessageBubbleContainer: React.FC<{ messageId: string }> = ({ messageId }) => {
  const message = useSelector(selectMessageById(messageId));
  const dispatch = useDispatch();
  
  const handleReply = useCallback(() => {
    dispatch(setReplyTo(messageId));
  }, [messageId, dispatch]);
  
  const handleDelete = useCallback(async () => {
    await dispatch(deleteMessage(messageId));
  }, [messageId, dispatch]);
  
  if (!message) return null;
  
  return (
    <MessageBubble
      content={message.content}
      timestamp={message.timestamp}
      status={message.status}
      isSent={message.senderId === currentUserId}
      onReply={handleReply}
      onDelete={handleDelete}
    />
  );
};
```

## 5.5 Custom Hooks Architecture

```tsx
// HOOK LAYERS — Each layer has a single responsibility

// Layer 1: Data fetching (server state)
function useMessages(chatId: string) {
  return useInfiniteQuery({
    queryKey: ['messages', chatId],
    queryFn: ({ pageParam }) => messagesApi.getMessages(chatId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000, // 5 min before refetch
  });
}

// Layer 2: Business logic
function useMessageSend(chatId: string) {
  const dispatch = useDispatch();
  const { wsClient } = useWebSocket();
  const offlineQueue = useOfflineQueue();
  
  return async (content: string, type: MessageType) => {
    const tempId = generateTempId();
    
    // Optimistic update
    dispatch(addOptimisticMessage({ chatId, tempId, content }));
    
    if (!navigator.onLine) {
      offlineQueue.enqueue({ chatId, content, type, tempId });
      return;
    }
    
    try {
      const result = await wsClient.sendMessage({ chatId, content, type });
      dispatch(confirmMessage({ tempId, serverId: result.messageId }));
    } catch (err) {
      dispatch(failMessage({ tempId }));
      offlineQueue.enqueue({ chatId, content, type, tempId });
    }
  };
}

// Layer 3: UI behavior
function useMessageScroll(chatId: string) {
  const listRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const scrollToBottom = useCallback((animate = false) => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: animate ? 'smooth' : 'auto',
      });
    }
  }, []);
  
  return { listRef, isAtBottom, scrollToBottom };
}
```

## 5.6 Service Layer Pattern

```tsx
// SERVICE LAYER — Encapsulates all external communications

// websocket/WebSocketClient.ts
class WebSocketClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  
  connect(token: string): Promise<void> { /* ... */ }
  sendMessage(payload: OutboundMessage): Promise<SendResult> { /* ... */ }
  onMessage(type: string, handler: MessageHandler): Unsubscribe { /* ... */ }
  disconnect(): void { /* ... */ }
  
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.ws?.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
    }, 30_000); // 30s heartbeat
  }
  
  private scheduleReconnect(): void {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts), // Exponential backoff
      30_000 // Max 30s
    );
    this.reconnectTimer = setTimeout(() => this.reconnect(), delay);
    this.reconnectAttempts++;
  }
}

// storage/IndexedDBClient.ts  
class IndexedDBClient {
  private db: IDBDatabase | null = null;
  
  async open(): Promise<void> { /* ... */ }
  async saveMessages(messages: Message[]): Promise<void> { /* ... */ }
  async getMessages(chatId: string, before?: Date, limit = 50): Promise<Message[]> { /* ... */ }
  async saveContacts(contacts: Contact[]): Promise<void> { /* ... */ }
  async getPendingMessages(): Promise<PendingMessage[]> { /* ... */ }
  async markMessageSynced(tempId: string, serverId: string): Promise<void> { /* ... */ }
}
```

---

> **💡 Interview Tip (Chapter 5):** Feature-based folder structure vs role-based (components/, hooks/, services/ at root) is a common question. Always advocate for feature-based at scale: it reduces coupling, makes features independently deployable (micro-frontend ready), and allows teams to own end-to-end features without touching other teams' code. Google and Meta specifically look for this kind of team-scale thinking.

---

<a name="ch6"></a>
# Chapter 6: Component Hierarchy

## 6.1 Complete Component Tree

```
App
├── AuthProvider
│   └── ThemeProvider
│       └── WebSocketProvider
│           └── NotificationProvider
│               └── Router
│                   ├── LoginPage (unauthenticated)
│                   │   ├── QRCode Scanner
│                   │   └── Phone Login Form
│                   │
│                   └── MainApp (authenticated)
│                       ├── NotificationBanner          ← Global alerts
│                       ├── ToastContainer              ← Toast notifications
│                       │
│                       └── ChatLayout (Split View)
│                           │
│                           ├── SIDEBAR (Left Panel)
│                           │   ├── SidebarHeader
│                           │   │   ├── UserAvatar (own)
│                           │   │   ├── NewChatButton
│                           │   │   └── MenuButton
│                           │   │       └── DropdownMenu
│                           │   │           ├── NewGroupOption
│                           │   │           ├── SettingsOption
│                           │   │           └── LogoutOption
│                           │   │
│                           │   ├── SearchBar             ← Chat search
│                           │   │   └── SearchResults
│                           │   │       └── SearchResultItem[]
│                           │   │
│                           │   ├── FilterTabs (All/Unread/Favorites)
│                           │   │
│                           │   └── ConversationList (virtualized)
│                           │       └── ConversationItem[] (each item)
│                           │           ├── ContactAvatar
│                           │           │   └── OnlineIndicator
│                           │           ├── ConversationInfo
│                           │           │   ├── ContactName
│                           │           │   ├── LastMessage (truncated)
│                           │           │   │   └── TypingIndicator (if active)
│                           │           │   └── LastMessageTime
│                           │           └── ConversationMeta
│                           │               ├── UnreadBadge
│                           │               ├── PinnedIcon
│                           │               └── MutedIcon
│                           │
│                           └── CHAT WINDOW (Right Panel)
│                               ├── ChatHeader
│                               │   ├── BackButton (mobile)
│                               │   ├── ContactAvatar
│                               │   │   └── OnlineIndicator
│                               │   ├── ContactInfo
│                               │   │   ├── ContactName
│                               │   │   └── SubStatus (Online/Last Seen/Typing)
│                               │   └── ChatActions
│                               │       ├── VideoCallButton
│                               │       ├── VoiceCallButton
│                               │       ├── SearchButton
│                               │       └── MoreButton
│                               │           └── ContextMenu
│                               │               ├── ViewContact
│                               │               ├── SelectMessages
│                               │               ├── MuteNotifications
│                               │               ├── ClearMessages
│                               │               └── DeleteChat
│                               │
│                               ├── MessageList (virtualized)
│                               │   ├── DateSeparator[]          ← "Today", "Yesterday"
│                               │   ├── MessageBubble[] (each message)
│                               │   │   ├── SenderAvatar (group only)
│                               │   │   ├── SenderName (group only)
│                               │   │   ├── ReplyPreview (if reply)
│                               │   │   │   ├── QuotedSenderName
│                               │   │   │   └── QuotedContent
│                               │   │   ├── MessageContent (polymorphic)
│                               │   │   │   ├── TextContent
│                               │   │   │   ├── ImageContent
│                               │   │   │   │   ├── BlurPlaceholder
│                               │   │   │   │   └── ProgressiveImage
│                               │   │   │   ├── VideoContent
│                               │   │   │   │   ├── Thumbnail
│                               │   │   │   │   └── PlayButton
│                               │   │   │   ├── VoiceNoteContent
│                               │   │   │   │   ├── Waveform
│                               │   │   │   │   ├── PlayPause
│                               │   │   │   │   └── Duration
│                               │   │   │   ├── DocumentContent
│                               │   │   │   │   ├── FileIcon
│                               │   │   │   │   ├── FileName
│                               │   │   │   │   └── FileSize
│                               │   │   │   └── LinkPreview
│                               │   │   │       ├── OGImage
│                               │   │   │       ├── OGTitle
│                               │   │   │       └── OGDescription
│                               │   │   ├── MessageMeta
│                               │   │   │   ├── Timestamp
│                               │   │   │   ├── DeliveryTick
│                               │   │   │   └── EditedLabel
│                               │   │   ├── ReactionBar (if reactions)
│                               │   │   │   └── ReactionChip[] (emoji + count)
│                               │   │   └── MessageContextMenu (on right-click/long-press)
│                               │   │       ├── ReplyOption
│                               │   │       ├── ReactOption → EmojiQuickPicker
│                               │   │       ├── ForwardOption
│                               │   │       ├── StarOption
│                               │   │       ├── CopyOption
│                               │   │       ├── EditOption (own msgs only)
│                               │   │       └── DeleteOption
│                               │   │
│                               │   ├── TypingIndicator (if contact typing)
│                               │   │   └── AnimatedDots
│                               │   │
│                               │   └── ScrollToBottomFAB (if not at bottom)
│                               │       └── UnreadCountBadge
│                               │
│                               ├── MediaViewer (fullscreen overlay)
│                               │   ├── MediaContent
│                               │   ├── DownloadButton
│                               │   ├── ForwardButton
│                               │   └── NavigationArrows (prev/next in chat)
│                               │
│                               └── MessageInputArea
│                                   ├── ReplyPreviewBar (when replying)
│                                   │   ├── QuotedContent
│                                   │   └── CloseButton
│                                   ├── InputRow
│                                   │   ├── EmojiButton → EmojiPickerPanel
│                                   │   │   ├── CategoryTabs
│                                   │   │   ├── EmojiGrid (virtualized)
│                                   │   │   └── EmojiSearch
│                                   │   ├── AttachButton → AttachmentMenu
│                                   │   │   ├── PhotosOption
│                                   │   │   ├── CameraOption
│                                   │   │   ├── DocumentOption
│                                   │   │   ├── ContactOption
│                                   │   │   └── PollOption (groups)
│                                   │   ├── MessageTextInput (contenteditable)
│                                   │   │   └── MentionSuggestions (groups)
│                                   │   └── SendArea (contextual)
│                                   │       ├── VoiceRecordButton (empty input)
│                                   │       └── SendButton (text entered)
│                                   │           └── VoiceRecorder (when held)
│                                   │               ├── Waveform
│                                   │               ├── RecordingTimer
│                                   │               └── CancelSlide
│                                   └── UploadProgressBar (when uploading)
```

## 6.2 Component Responsibility Matrix

| Component | Responsibility | State Owned | Events Emitted |
|---|---|---|---|
| **App** | Root render, global providers | Auth state, theme | — |
| **ChatLayout** | Split view layout | Panel visibility (mobile) | — |
| **ConversationList** | Render chat list (virtualized) | Scroll position | onSelectChat |
| **ConversationItem** | Single chat row | — | onClick, onLongPress |
| **ChatHeader** | Contact info + actions | — | onSearch, onCall, onMore |
| **MessageList** | Render messages (virtualized) | Scroll state, visible range | onScrollTop (load more) |
| **MessageBubble** | Single message UI | Context menu open | onReply, onDelete, onReact |
| **MessageContent** | Polymorphic content renderer | Media load state | onMediaClick |
| **MessageInputArea** | Compose + send | Input text, recording state | onSend, onTypingStart |
| **EmojiPicker** | Emoji selection panel | Tab, search state | onEmojiSelect |
| **VoiceRecorder** | Audio recording | Recording state, timer | onStop(blob), onCancel |
| **TypingIndicator** | Animated typing dots | — | — |
| **DeliveryTick** | Message status icon | — | — |

## 6.3 Component Communication Patterns

```
COMPONENT COMMUNICATION PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PROP DRILLING (for closely related, 1-2 levels)
   MessageList → MessageBubble → DeliveryTick

2. CONTEXT (for cross-cutting concerns)
   WebSocketContext → (any component needing WS)
   ThemeContext → (any component needing theme)
   AuthContext → (any component needing user)

3. REDUX STORE (for shared business state)
   messagesSlice → MessageList (via useSelector)
   chatsSlice → ConversationList (via useSelector)
   presenceSlice → ConversationItem (via useSelector)

4. EVENTS/CALLBACKS (for upward communication)
   MessageBubble → onReply → MessageInputArea (set reply)
   ConversationItem → onSelectChat → ChatWindow (load chat)

5. CUSTOM EVENTS / BROADCAST (for decoupled modules)
   WebSocketManager → emits 'message:received' 
   → Redux middleware listens → dispatches action
   → Component re-renders via useSelector
```

---

> **💡 Interview Tip (Chapter 6):** When drawing component hierarchy, start from the outermost shell (App → Layout → Section → Component → Atom). Explicitly mention: "I'm separating container and presentational components" and "I'll virtualize the MessageList because 10,000 messages can't all be in the DOM." This immediately signals Senior/Staff-level React thinking to the interviewer.

---

<a name="ch7"></a>
# Chapter 7: API Design

## 7.1 REST API Overview

```
BASE URL: https://api.whatsapp-web.com/v1

AUTHENTICATION: Bearer JWT in Authorization header
VERSIONING: URI versioning (/v1/, /v2/)
FORMAT: JSON with Content-Type: application/json
PAGINATION: Cursor-based for all list endpoints
ERROR FORMAT: { error: { code, message, details } }
RATE LIMITING: 429 with Retry-After header
```

## 7.2 Authentication APIs

```
POST   /v1/auth/login           → Request OTP / QR code scan
POST   /v1/auth/verify          → Verify OTP → returns tokens
POST   /v1/auth/refresh         → Rotate access token
POST   /v1/auth/logout          → Revoke session
GET    /v1/auth/sessions        → List active device sessions
DELETE /v1/auth/sessions/:id    → Revoke specific device session
```

**Login Response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
  "refreshToken": "dGhpc2lzYXJlZnJlc2h...",
  "expiresIn": 900,
  "user": {
    "id": "usr_abc123",
    "phone": "+91-9876543210",
    "name": "Hruday",
    "avatarUrl": "https://cdn.whatsapp.com/avatars/usr_abc123.jpg",
    "about": "Available",
    "linkedDevices": 2
  }
}
```

## 7.3 Chat APIs

```
GET    /v1/chats                → List conversations (cursor paginated)
POST   /v1/chats                → Create new 1:1 chat
GET    /v1/chats/:chatId        → Get chat details + metadata
DELETE /v1/chats/:chatId        → Delete chat (local)
PATCH  /v1/chats/:chatId        → Update chat (mute, archive, pin)

GET    /v1/chats/:chatId/messages   → Get message history (cursor paginated)
POST   /v1/chats/:chatId/messages   → Send message (fallback to REST if WS fails)
PATCH  /v1/chats/:chatId/messages/:messageId  → Edit message
DELETE /v1/chats/:chatId/messages/:messageId  → Delete message

POST   /v1/chats/:chatId/messages/:messageId/read  → Mark as read
POST   /v1/chats/:chatId/read-all                  → Mark all as read

GET    /v1/groups                → List groups
POST   /v1/groups                → Create group
GET    /v1/groups/:groupId       → Get group details
PATCH  /v1/groups/:groupId       → Update group (name, avatar, description)
POST   /v1/groups/:groupId/participants  → Add participant
DELETE /v1/groups/:groupId/participants/:userId  → Remove participant
```

## 7.4 Cursor Pagination

```
WHY CURSOR-BASED OVER OFFSET-BASED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OFFSET PROBLEM:
  GET /messages?offset=100&limit=20
  Problem: If 5 new messages arrive while paginating,
  user sees duplicates or misses messages.
  Also: DB must scan and skip 100 rows — O(offset) cost.

CURSOR SOLUTION:
  GET /messages?before=msg_abc123&limit=20
  Cursor = opaque encoded message ID + timestamp.
  - Stable: new messages don't shift the cursor
  - Efficient: DB index scan from cursor position, no skip
  - Works with time-series data (Cassandra, HBase)
```

**Paginated Message Response:**
```json
{
  "messages": [
    {
      "id": "msg_xyz789",
      "chatId": "chat_abc123",
      "senderId": "usr_def456",
      "type": "text",
      "content": "Hello! How are you?",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "status": "read",
      "replyTo": null,
      "reactions": [],
      "editedAt": null,
      "deletedForEveryone": false
    }
  ],
  "pagination": {
    "nextCursor": "eyJpZCI6Im1zZ19hYmMxMjMiLCJ0cyI6MTcwNTMxNjIwMH0=",
    "prevCursor": "eyJpZCI6Im1zZ194eXo3ODkiLCJ0cyI6MTcwNTMxNjAwMH0=",
    "hasMore": true,
    "total": null
  }
}
```

## 7.5 Media Upload API

```
CHUNKED UPLOAD FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Initialize upload
POST /v1/media/uploads
{
  "fileSize": 5242880,
  "mimeType": "image/jpeg",
  "chatId": "chat_abc123",
  "checksum": "sha256:abc123def456..."
}
Response:
{
  "uploadId": "upload_xyz",
  "chunkSize": 524288,           ← 512KB chunks
  "totalChunks": 10,
  "presignedChunkUrls": [...]    ← Optional: direct-to-S3 upload
}

Step 2: Upload chunks (parallel, up to 3 concurrent)
PUT /v1/media/uploads/:uploadId/chunks/:chunkIndex
Content-Range: bytes 0-524287/5242880
[binary chunk data]
Response: { "received": true, "etag": "abc123" }

Step 3: Complete upload
POST /v1/media/uploads/:uploadId/complete
{ "etags": ["abc", "def", ...] }
Response:
{
  "mediaId": "med_abc123",
  "url": "https://cdn.whatsapp.com/med_abc123",
  "thumbnailUrl": "https://cdn.whatsapp.com/med_abc123_thumb",
  "expiresAt": "2024-02-15T10:30:00.000Z",
  "width": 1920,
  "height": 1080
}

Step 4: Reference in message
POST /v1/chats/:chatId/messages
{
  "type": "image",
  "mediaId": "med_abc123",
  "caption": "Look at this!"
}
```

## 7.6 WebSocket Events

### Outbound (Client → Server)

```json
// Send text message
{
  "event": "message:send",
  "id": "client_temp_uuid_123",
  "payload": {
    "chatId": "chat_abc123",
    "type": "text",
    "content": "Hello!",
    "replyTo": null,
    "clientTimestamp": 1705316400000
  }
}

// Mark messages as read
{
  "event": "message:read",
  "payload": {
    "chatId": "chat_abc123",
    "upToMessageId": "msg_xyz789"
  }
}

// Typing start/stop
{
  "event": "typing:start",
  "payload": { "chatId": "chat_abc123" }
}
{
  "event": "typing:stop",
  "payload": { "chatId": "chat_abc123" }
}

// Heartbeat
{
  "event": "ping",
  "timestamp": 1705316430000
}

// Message edit
{
  "event": "message:edit",
  "payload": {
    "messageId": "msg_abc123",
    "newContent": "Edited text"
  }
}
```

### Inbound (Server → Client)

```json
// Server ACK for sent message
{
  "event": "message:ack",
  "payload": {
    "clientTempId": "client_temp_uuid_123",
    "serverId": "msg_xyz789",
    "serverTimestamp": 1705316400150,
    "status": "sent"
  }
}

// New message received
{
  "event": "message:received",
  "payload": {
    "id": "msg_abc456",
    "chatId": "chat_abc123",
    "senderId": "usr_def456",
    "type": "text",
    "content": "Hey there!",
    "timestamp": 1705316410000,
    "status": "delivered"
  }
}

// Message delivered to other device
{
  "event": "message:delivered",
  "payload": {
    "messageId": "msg_xyz789",
    "chatId": "chat_abc123",
    "deliveredAt": 1705316410200
  }
}

// Message read by recipient
{
  "event": "message:read",
  "payload": {
    "messageId": "msg_xyz789",
    "chatId": "chat_abc123",
    "readBy": "usr_def456",
    "readAt": 1705316420000
  }
}

// Contact typing
{
  "event": "typing:update",
  "payload": {
    "chatId": "chat_abc123",
    "userId": "usr_def456",
    "isTyping": true,
    "expiresAt": 1705316415000  ← Server auto-expire safety
  }
}

// Presence update
{
  "event": "presence:update",
  "payload": {
    "userId": "usr_def456",
    "status": "online",
    "lastSeen": null
  }
}

// Reaction added
{
  "event": "reaction:added",
  "payload": {
    "messageId": "msg_xyz789",
    "chatId": "chat_abc123",
    "userId": "usr_def456",
    "emoji": "👍",
    "timestamp": 1705316430000
  }
}

// Heartbeat response
{
  "event": "pong",
  "timestamp": 1705316430050
}
```

## 7.7 Error Handling Strategy

```
ERROR HIERARCHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NETWORK ERRORS (no response)
  → Retry with exponential backoff
  → If WebSocket disconnected, queue message offline
  → Show "Waiting for network" UI state

HTTP 4xx ERRORS (client errors)
  400 Bad Request    → Log, show user-friendly error, no retry
  401 Unauthorized   → Refresh token → retry once → logout if fail
  403 Forbidden      → Log, show permission error, no retry
  404 Not Found      → Chat/message deleted, update local state
  409 Conflict       → Message already exists (duplicate), deduplicate
  429 Too Many Reqs  → Respect Retry-After header, exponential backoff

HTTP 5xx ERRORS (server errors)
  500/502/503/504    → Retry 3 times with exponential backoff
  503 + Retry-After  → Wait exact time before retry

WEBSOCKET ERRORS
  1001 Going Away    → Server restarting, reconnect immediately
  1006 Abnormal      → Network issue, reconnect with backoff
  4001 Auth Error    → Refresh token, reconnect with new token
  4429 Rate Limited  → Wait, reconnect
```

```tsx
// Retry interceptor implementation
const httpClient = axios.create({ baseURL: API_BASE_URL });

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryConfig;
    
    if (error.response?.status === 401 && !config._isRetry) {
      config._isRetry = true;
      await refreshAccessToken();
      return httpClient(config);
    }
    
    if (shouldRetry(error) && (config._retryCount ?? 0) < 3) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      const delay = Math.pow(2, config._retryCount) * 1000;
      await sleep(delay);
      return httpClient(config);
    }
    
    return Promise.reject(normalizeError(error));
  }
);
```

---

> **💡 Interview Tip (Chapter 7):** When asked about API design, always lead with: "I'll use cursor-based pagination because offset pagination is unstable for real-time data." Then show the WebSocket event schema. Most candidates only discuss REST — discussing the WebSocket event protocol shows you understand real-time systems at a production level. Also mention idempotency keys for message sends (the `clientTempId`).

---

<a name="ch8"></a>
# Chapter 8: WebSocket Deep Dive

## 8.1 Why WebSocket Over Other Options

```
REAL-TIME TRANSPORT COMPARISON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SHORT POLLING (GET /messages every 1s)
  ✗ 1.5B users × 1 request/s = 1.5B req/s on server
  ✗ Average latency = polling_interval/2 = 500ms
  ✗ Server has to query DB on every poll
  ✗ HTTP overhead (headers) on every request

LONG POLLING (server holds open until message arrives)
  ✓ Lower request rate (only when message arrives)
  ✗ Still HTTP — new TCP connection per request
  ✗ Server must hold thread/connection open
  ✗ Higher latency on reconnect (~200ms per new connection)

SERVER-SENT EVENTS (SSE)
  ✓ Server-to-client streaming (one direction)
  ✓ Auto-reconnect built in
  ✗ Unidirectional — can't send client → server via SSE
  ✗ Browser limit: 6 SSE connections per domain
  ✗ Would need separate HTTP for client→server

WEBSOCKET ✅ WINNER for WhatsApp
  ✓ Full-duplex bidirectional
  ✓ Single TCP connection (low overhead after handshake)
  ✓ ~2-8 bytes framing overhead per message (vs 800+ bytes HTTP headers)
  ✓ <100ms latency (no new connection overhead)
  ✓ Works across firewalls (uses port 443 with wss://)
  ✓ Native browser support (since 2011)
```

## 8.2 WebSocket Connection Lifecycle

```
WEBSOCKET LIFECYCLE DIAGRAM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLIENT                                    SERVER
  │                                          │
  │  GET /ws HTTP/1.1                        │
  │  Host: api.whatsapp-web.com              │
  │  Upgrade: websocket                      │
  │  Connection: Upgrade                     │
  │  Sec-WebSocket-Key: dGhlIHNhbXBsZQ==   │
  │  Sec-WebSocket-Version: 13              │
  │  Authorization: Bearer <jwt>            │
  │─────────────────────────────────────────►│
  │                                          │  Validate JWT
  │                                          │  Register connection
  │  HTTP/1.1 101 Switching Protocols        │
  │  Upgrade: websocket                      │
  │  Connection: Upgrade                     │
  │  Sec-WebSocket-Accept: s3pPL...         │
  │◄─────────────────────────────────────────│
  │                                          │
  │═══════ WebSocket Connection OPEN ═══════│
  │                                          │
  │  {event:"ping",ts:1705316400000}         │  ← Heartbeat starts
  │─────────────────────────────────────────►│
  │                                          │
  │  {event:"pong",ts:1705316400050}         │
  │◄─────────────────────────────────────────│
  │                                          │
  │  {event:"message:send", ...}             │  ← User sends message
  │─────────────────────────────────────────►│
  │                                          │  Process + store + fanout
  │  {event:"message:ack", ...}              │
  │◄─────────────────────────────────────────│
  │                                          │
  │  {event:"message:received", ...}         │  ← Incoming message
  │◄─────────────────────────────────────────│
  │                                          │
  │       ... [normal operation] ...         │
  │                                          │
  │  (Network interruption)                  │
  │  ✗ Connection drops                      │
  │                                          │
  │  [Client detects via missed PONG]        │
  │  [Or via WebSocket onerror/onclose]      │
  │                                          │
  │  [Reconnect with exponential backoff]    │
  │  GET /ws ... Authorization: Bearer <new> │  ← New connection
  │─────────────────────────────────────────►│
  │                                          │
  │  {event:"sync:request",                  │  ← Request missed msgs
  │   lastSeenMessageId: "msg_xyz789"}       │
  │─────────────────────────────────────────►│
  │                                          │  Query missed messages
  │  {event:"sync:messages", messages:[...]} │
  │◄─────────────────────────────────────────│
  │                                          │
  │═════════════ BACK TO NORMAL ════════════│
```

## 8.3 Heartbeat / Ping-Pong Mechanism

```tsx
class HeartbeatManager {
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL_MS = 30_000;  // 30 seconds
  private readonly PONG_TIMEOUT_MS = 10_000;   // 10 seconds to receive pong
  
  constructor(
    private ws: WebSocket,
    private onDeadConnection: () => void
  ) {}
  
  start(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ 
          event: 'ping', 
          timestamp: Date.now() 
        }));
        
        // If pong not received in 10s, connection is dead
        this.pongTimeout = setTimeout(() => {
          console.warn('WebSocket: Pong timeout — connection dead');
          this.ws.close(1000, 'Pong timeout');
          this.onDeadConnection();
        }, this.PONG_TIMEOUT_MS);
      }
    }, this.PING_INTERVAL_MS);
  }
  
  onPongReceived(): void {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }
  
  stop(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.pongTimeout) clearTimeout(this.pongTimeout);
  }
}
```

## 8.4 Reconnection Strategy

```tsx
class ReconnectionManager {
  private attempts = 0;
  private timer: NodeJS.Timeout | null = null;
  
  private readonly config = {
    initialDelay: 1_000,      // 1 second first retry
    maxDelay: 30_000,         // Max 30 second wait
    maxAttempts: Infinity,    // Keep trying forever (messaging app)
    jitterFactor: 0.3,        // ±30% jitter to avoid thundering herd
  };
  
  scheduleReconnect(connect: () => Promise<void>): void {
    const baseDelay = Math.min(
      this.config.initialDelay * Math.pow(2, this.attempts),
      this.config.maxDelay
    );
    
    // Add jitter: baseDelay ± 30%
    const jitter = baseDelay * this.config.jitterFactor * (Math.random() - 0.5);
    const delay = Math.round(baseDelay + jitter);
    
    console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${this.attempts + 1})`);
    
    this.timer = setTimeout(async () => {
      try {
        await connect();
        this.reset(); // Success — reset counter
      } catch {
        this.attempts++;
        this.scheduleReconnect(connect); // Try again
      }
    }, delay);
  }
  
  reset(): void {
    this.attempts = 0;
    if (this.timer) clearTimeout(this.timer);
  }
}

// Reconnect delay sequence (with jitter):
// Attempt 1: ~1s
// Attempt 2: ~2s
// Attempt 3: ~4s
// Attempt 4: ~8s
// Attempt 5: ~16s
// Attempt 6+: ~30s (capped)
```

## 8.5 Message Acknowledgement System

```
MESSAGE ACK FLOW — ENSURING DELIVERY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLIENT                          SERVER
  │                                │
  │  Send message (tempId = X)     │
  │  ───────────────────────────►  │
  │                                │  Store in DB
  │                                │  Fanout to recipients
  │  ACK: {serverId: Y, temp: X}   │
  │  ◄───────────────────────────  │
  │                                │
  │  Update local state:           │
  │  - Replace tempId X with Y     │
  │  - Status: "sent" → "delivered"│
  │                                │
  
PENDING ACK TRACKING:

const pendingAcks = new Map<string, {
  tempId: string;
  timestamp: number;
  payload: OutboundMessage;
  resolve: (serverId: string) => void;
  reject: (err: Error) => void;
}>();

// On send:
ws.send(JSON.stringify({ event: 'message:send', id: tempId, payload }));
pendingAcks.set(tempId, { ...metadata, resolve, reject });

// On ACK received:
ws.onmessage = ({ data }) => {
  const { event, payload } = JSON.parse(data);
  if (event === 'message:ack') {
    const pending = pendingAcks.get(payload.clientTempId);
    if (pending) {
      pending.resolve(payload.serverId);
      pendingAcks.delete(payload.clientTempId);
    }
  }
};

// On timeout (no ACK in 30s):
setTimeout(() => {
  const pending = pendingAcks.get(tempId);
  if (pending) {
    pending.reject(new Error('Message ACK timeout'));
    pendingAcks.delete(tempId);
    offlineQueue.enqueue(pending.payload); // Retry later
  }
}, 30_000);
```

## 8.6 Offline Queue

```tsx
class OfflineMessageQueue {
  private queue: PendingMessage[] = [];
  private readonly STORAGE_KEY = 'offline_message_queue';
  
  constructor() {
    // Restore queue from localStorage on init (survives page refresh)
    const saved = localStorage.getItem(this.STORAGE_KEY);
    this.queue = saved ? JSON.parse(saved) : [];
  }
  
  enqueue(message: OutboundMessage): void {
    const pending: PendingMessage = {
      ...message,
      tempId: message.tempId || generateTempId(),
      queuedAt: Date.now(),
      attempts: 0,
    };
    this.queue.push(pending);
    this.persist();
  }
  
  async drain(ws: WebSocketClient): Promise<void> {
    // Called when WebSocket reconnects
    const toSend = [...this.queue];
    this.queue = [];
    this.persist();
    
    for (const msg of toSend) {
      try {
        await ws.sendMessage(msg);
      } catch {
        // Put back if failed
        this.enqueue(msg);
      }
    }
  }
  
  private persist(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
  }
  
  get pendingCount(): number {
    return this.queue.length;
  }
}
```

## 8.7 Duplicate Prevention

```
DUPLICATE MESSAGE PREVENTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Problem: Network issues can cause:
1. Client sends message → Server receives → ACK lost → Client resends
   → Server receives duplicate
2. WS reconnect delivers duplicate "new message" events

Solution: IDEMPOTENCY KEY (clientTempId)

SERVER SIDE:
  - Maintain a deduplication table: { clientTempId → serverId }
  - If same clientTempId arrives twice:
    - Return existing ACK (don't store again)
    - TTL: 24 hours (after which retry is safe)

CLIENT SIDE:
  - Track received message IDs in a Set
  - Before inserting to store, check: seenMessageIds.has(msg.id)
  - If seen, skip update

const seenMessageIds = new Set<string>();

function handleIncomingMessage(msg: IncomingMessage) {
  if (seenMessageIds.has(msg.id)) {
    console.debug('Duplicate message, skipping:', msg.id);
    return;
  }
  seenMessageIds.add(msg.id);
  // Process message...
}

// Prune old IDs to prevent memory leak
// Keep only last 1000 message IDs in set
```

## 8.8 Backpressure Handling

```
BACKPRESSURE — When messages arrive faster than UI can render

Scenario: User comes back online after 8 hours offline.
Server delivers 500 messages in a burst.

NAIVE APPROACH (wrong):
  500 Redux dispatches → 500 re-renders → UI freezes

CORRECT APPROACH: Message batching
  
const MESSAGE_BATCH_SIZE = 50;
const MESSAGE_BATCH_INTERVAL = 100; // ms

const pendingMessages: Message[] = [];
let batchTimer: NodeJS.Timeout | null = null;

ws.on('message:received', (msg: Message) => {
  pendingMessages.push(msg);
  
  if (pendingMessages.length >= MESSAGE_BATCH_SIZE) {
    // Flush immediately if batch full
    flushBatch();
  } else if (!batchTimer) {
    // Otherwise wait 100ms and batch what arrives
    batchTimer = setTimeout(flushBatch, MESSAGE_BATCH_INTERVAL);
  }
});

function flushBatch() {
  if (pendingMessages.length === 0) return;
  const batch = pendingMessages.splice(0, pendingMessages.length);
  batchTimer = null;
  
  // Single dispatch for entire batch
  dispatch(addMessagesBatch(batch));
}
```

---

> **💡 Interview Tip (Chapter 8):** The most common question in WhatsApp interviews is: "How do you ensure a message is delivered exactly once?" Answer: "The client assigns a `clientTempId` (UUID) to each outgoing message before sending. The server uses this as an idempotency key — if the same ID arrives twice (retry), it deduplicates and returns the same server ID. The client also uses a `seenMessageIds` Set to deduplicate inbound delivery events. Together, these give exactly-once semantics at both layers."

---

<a name="ch9"></a>
# Chapter 9: Data Flow

## 9.1 Message Send Lifecycle

```
COMPLETE MESSAGE SEND LIFECYCLE
═══════════════════════════════════════════════════════════════

USER ACTION: Types message, clicks Send
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: OPTIMISTIC UI (0ms — immediate)                    │
│  ─────────────────────────────────────────────────────────  │
│  • Generate tempId (UUID v4)                                │
│  • Create optimistic message object:                        │
│    { id: tempId, status: 'sending', content, timestamp }    │
│  • dispatch(addOptimisticMessage(...))                       │
│  • UI shows message in chat immediately (gray tick ✓)       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: PERSIST TO INDEXEDDB (sync, ~5ms)                  │
│  ─────────────────────────────────────────────────────────  │
│  • Save optimistic message to IndexedDB with status:        │
│    'pending_send'                                           │
│  • Survives page refresh if connection drops                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: SEND VIA WEBSOCKET                                  │
│  ─────────────────────────────────────────────────────────  │
│  if (navigator.onLine && ws.readyState === OPEN) {          │
│    ws.send({ event: 'message:send', id: tempId, payload })  │
│    pendingAcks.set(tempId, { resolve, reject, timeout })    │
│  } else {                                                    │
│    offlineQueue.enqueue({ tempId, payload })                 │
│    message.status = 'queued'                                 │
│  }                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: SERVER PROCESSES (100-300ms typically)             │
│  ─────────────────────────────────────────────────────────  │
│  • Validate JWT, rate limits                                 │
│  • Decrypt (E2E: server only sees ciphertext)               │
│  • Assign serverId + serverTimestamp                         │
│  • Persist to Cassandra                                      │
│  • Fan out to recipient's WebSocket connection              │
│  • Send ACK back to sender                                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: SERVER ACK RECEIVED                                 │
│  ─────────────────────────────────────────────────────────  │
│  { event: 'message:ack',                                    │
│    payload: { clientTempId, serverId, serverTimestamp } }   │
│  • dispatch(confirmMessage({ tempId, serverId }))            │
│  • Update IndexedDB: replace tempId with serverId            │
│  • UI: message status → sent (single dark tick ✓)           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: DELIVERED TO RECIPIENT                              │
│  ─────────────────────────────────────────────────────────  │
│  { event: 'message:delivered',                              │
│    payload: { messageId, deliveredAt } }                     │
│  • dispatch(updateMessageStatus({ id, status: 'delivered' }))│
│  • UI: double dark tick ✓✓                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 7: READ BY RECIPIENT                                   │
│  ─────────────────────────────────────────────────────────  │
│  { event: 'message:read',                                   │
│    payload: { messageId, readAt } }                          │
│  • dispatch(updateMessageStatus({ id, status: 'read' }))    │
│  • UI: double BLUE tick ✓✓ (blue)                           │
└─────────────────────────────────────────────────────────────┘
```

## 9.2 Failure & Retry Flow

```
FAILURE HANDLING FLOW
═══════════════════════════════════════════════════════════════

SCENARIO A: WebSocket disconnects DURING send
  
  1. ws.send() called
  2. WebSocket closes (onerror/onclose fires)
  3. Message not ACKed
  4. After timeout (30s), pendingAcks rejects
  5. dispatch(failMessage({ tempId }))
  6. offlineQueue.enqueue(message)
  7. UI shows "Tap to retry" on message
  8. On reconnect: offlineQueue.drain() → resend all pending
  9. Server deduplicates via tempId (idempotency)

SCENARIO B: Server error (5xx)
  
  1. ws.send() called
  2. Server returns error event: { event: 'message:error', code: 500 }
  3. dispatch(failMessage({ tempId }))
  4. Retry with exponential backoff (max 3 attempts)
  5. If all retries fail → offlineQueue.enqueue

SCENARIO C: User goes offline, comes back 2 hours later
  
  1. Messages typed while offline → go to offlineQueue (via detection)
  2. navigator.onLine = false → show "You are offline" banner
  3. Outbound messages queued locally with status 'queued'
  4. Network restored → navigator.onLine = true
  5. WebSocket reconnects
  6. offlineQueue.drain() runs
  7. Sync request for missed inbound messages
  8. banner disappears, "queued" messages send in order
```

## 9.3 Incoming Message Flow

```
INCOMING MESSAGE FLOW
═══════════════════════════════════════════════════════════════

WebSocket 'message:received' event arrives
                      │
                      ▼
Is message duplicate? (seenMessageIds check)
         │                    │
        YES                   NO
         │                    │
       Discard                ▼
                   Decrypt content (E2E)
                              │
                              ▼
                   Is this chat currently open?
                    │                      │
                   YES                     NO
                    │                      │
                    ▼                      ▼
          dispatch(addMessage)    dispatch(addMessage)
          Scroll to bottom (if   + dispatch(incrementUnread)
          user at bottom)        + trigger push notification
                    │                      │
                    └──────────┬───────────┘
                               │
                               ▼
                   Save to IndexedDB (persist)
                               │
                               ▼
                   Send 'message:read' if chat is open
                   and user is currently viewing it
```

## 9.4 Message Sync on Reconnect

```
SYNC PROTOCOL ON RECONNECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Client reconnects WebSocket
2. Client sends sync request with last known state:
   {
     event: "sync:request",
     payload: {
       deviceId: "device_abc",
       chatSyncPoints: [
         { chatId: "chat_1", lastMessageId: "msg_100", timestamp: 1705316400000 },
         { chatId: "chat_2", lastMessageId: "msg_200", timestamp: 1705316380000 },
       ]
     }
   }

3. Server computes delta: messages after each sync point
4. Server sends sync response:
   {
     event: "sync:messages",
     payload: {
       messages: [...], // All missed messages
       presenceUpdates: [...], // All presence changes while offline
       statusUpdates: [...], // Delivery status updates
     }
   }

5. Client processes sync response:
   - Deduplicate against seenMessageIds
   - Batch dispatch to Redux
   - Update IndexedDB
   - Send read receipts for visible chats
   - Update unread counts for non-visible chats
```

---

> **💡 Interview Tip (Chapter 9):** Optimistic UI is the key concept in Chapter 9. When asked "how does the UI feel so fast?", answer: "Message appears instantly via optimistic update before the server even responds. We generate a tempId client-side, add it to the Redux store immediately, and then reconcile when the server ACK arrives — replacing tempId with serverId and updating status from 'sending' to 'sent'." This is a Staff-level answer.

---

<a name="ch10"></a>
# Chapter 10: State Management

## 10.1 State Categories in WhatsApp Web

```
STATE TAXONOMY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────┬────────────────────────┬──────────────────────────────┐
│   STATE TYPE    │      DESCRIPTION        │  TOOL                        │
├─────────────────┼────────────────────────┼──────────────────────────────┤
│ LOCAL UI State  │ Input text, dropdowns, │ useState / useReducer        │
│                 │ modal open/close,       │                              │
│                 │ scroll position         │                              │
├─────────────────┼────────────────────────┼──────────────────────────────┤
│ Global App State│ Auth, active chat,      │ Redux Toolkit                │
│                 │ unread counts,          │ (predictable, devtools,     │
│                 │ connectivity status     │  time-travel debugging)      │
├─────────────────┼────────────────────────┼──────────────────────────────┤
│ Server State    │ Messages (paginated),   │ TanStack Query               │
│                 │ contacts, group info,   │ (caching, background sync,   │
│                 │ search results          │  stale-while-revalidate)     │
├─────────────────┼────────────────────────┼──────────────────────────────┤
│ Real-time State │ Presence, typing,       │ Redux Toolkit                │
│                 │ message status updates, │ (WebSocket → dispatch)       │
│                 │ incoming messages       │                              │
├─────────────────┼────────────────────────┼──────────────────────────────┤
│ Persistent State│ Cached messages,        │ IndexedDB (via Dexie.js)     │
│                 │ draft messages,          │                              │
│                 │ pending queue, settings  │                              │
└─────────────────┴────────────────────────┴──────────────────────────────┘
```

## 10.2 Redux Store Structure

```ts
// Root State Shape
interface RootState {
  auth: AuthState;
  chats: ChatsState;
  messages: MessagesState;
  presence: PresenceState;
  media: MediaState;
  ui: UIState;
  connectivity: ConnectivityState;
}

// Auth State
interface AuthState {
  userId: string | null;
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
}

// Chats State (normalized)
interface ChatsState {
  ids: string[];                          // Ordered list of chatIds
  entities: Record<string, Chat>;         // chatId → Chat (O(1) lookup)
  activeChatId: string | null;
  pinnedChatIds: string[];
  archivedChatIds: string[];
}

// Messages State (normalized per chat)
interface MessagesState {
  // chatId → { ids: messageId[], entities: { [messageId]: Message } }
  byChat: Record<string, {
    ids: string[];
    entities: Record<string, Message>;
    hasMore: boolean;
    nextCursor: string | null;
    isLoading: boolean;
    isSyncing: boolean;
  }>;
  pendingMessages: Record<string, OptimisticMessage>;  // tempId → message
}

// Presence State
interface PresenceState {
  // userId → presence info
  entities: Record<string, {
    userId: string;
    status: 'online' | 'offline';
    lastSeen: number | null;
    isTyping: Record<string, boolean>; // chatId → isTyping
  }>;
}

// Connectivity State
interface ConnectivityState {
  isOnline: boolean;
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  pendingMessageCount: number;
  lastConnectedAt: number | null;
}
```

## 10.3 Redux Slices

```ts
// messagesSlice.ts
const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // Optimistic update
    addOptimisticMessage(state, action: PayloadAction<OptimisticMessage>) {
      const { chatId, tempId, content, type } = action.payload;
      const chatMessages = state.byChat[chatId];
      
      chatMessages.ids.push(tempId);
      chatMessages.entities[tempId] = {
        id: tempId,
        chatId,
        content,
        type,
        status: 'sending',
        timestamp: Date.now(),
        senderId: getCurrentUserId(),
        isOptimistic: true,
      };
      
      // Also update in pendingMessages
      state.pendingMessages[tempId] = action.payload;
    },
    
    // Server confirms message
    confirmMessage(state, action: PayloadAction<{
      tempId: string;
      chatId: string;
      serverId: string;
      serverTimestamp: number;
    }>) {
      const { tempId, chatId, serverId, serverTimestamp } = action.payload;
      const chatMessages = state.byChat[chatId];
      const message = chatMessages.entities[tempId];
      
      if (message) {
        // Replace temp entry with server entry
        delete chatMessages.entities[tempId];
        chatMessages.ids = chatMessages.ids.map(id => id === tempId ? serverId : id);
        chatMessages.entities[serverId] = {
          ...message,
          id: serverId,
          timestamp: serverTimestamp,
          status: 'sent',
          isOptimistic: false,
        };
        delete state.pendingMessages[tempId];
      }
    },
    
    // Message failed
    failMessage(state, action: PayloadAction<{ tempId: string; chatId: string }>) {
      const { tempId, chatId } = action.payload;
      const msg = state.byChat[chatId]?.entities[tempId];
      if (msg) msg.status = 'failed';
    },
    
    // Incoming message
    addIncomingMessage(state, action: PayloadAction<Message>) {
      const { chatId, id } = action.payload;
      if (!state.byChat[chatId]) {
        state.byChat[chatId] = { ids: [], entities: {}, hasMore: true, nextCursor: null, isLoading: false, isSyncing: false };
      }
      if (!state.byChat[chatId].entities[id]) {
        state.byChat[chatId].ids.push(id);
        state.byChat[chatId].entities[id] = action.payload;
      }
    },
    
    // Status update
    updateMessageStatus(state, action: PayloadAction<{
      messageId: string;
      chatId: string;
      status: MessageStatus;
    }>) {
      const { messageId, chatId, status } = action.payload;
      const msg = state.byChat[chatId]?.entities[messageId];
      if (msg) msg.status = status;
    },
    
    // Batch messages (from sync or history load)
    addMessagesBatch(state, action: PayloadAction<{ chatId: string; messages: Message[] }>) {
      const { chatId, messages } = action.payload;
      if (!state.byChat[chatId]) {
        state.byChat[chatId] = { ids: [], entities: {}, hasMore: true, nextCursor: null, isLoading: false, isSyncing: false };
      }
      messages.forEach(msg => {
        if (!state.byChat[chatId].entities[msg.id]) {
          state.byChat[chatId].ids.unshift(msg.id); // Prepend (older messages)
          state.byChat[chatId].entities[msg.id] = msg;
        }
      });
    },
  },
});
```

## 10.4 TanStack Query for Server State

```tsx
// Contacts, group info, user profile = server state managed by TanStack Query

// Chat history (initial load and pagination)
function useMessageHistory(chatId: string) {
  return useInfiniteQuery({
    queryKey: ['messages', chatId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const response = await messagesApi.getMessages(chatId, {
        before: pageParam,
        limit: 50,
      });
      // Side effect: persist to IndexedDB
      indexedDB.saveMessages(response.messages);
      return response;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: 5 * 60 * 1000,          // 5 min before refetch
    gcTime: 30 * 60 * 1000,            // Keep in memory 30 min
    initialData: () => {
      // Try to hydrate from IndexedDB on first render
      const cached = indexedDB.getMessages(chatId, undefined, 50);
      return cached ? { pages: [cached], pageParams: [undefined] } : undefined;
    },
  });
}

// Contact info
function useContact(contactId: string) {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsApi.getContact(contactId),
    staleTime: 30 * 60 * 1000,         // Contact info rarely changes
    gcTime: 60 * 60 * 1000,
  });
}

// Group info
function useGroup(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.getGroup(groupId),
    staleTime: 5 * 60 * 1000,
  });
}
```

## 10.5 State Decision Matrix

```
WHICH STATE BELONGS WHERE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question 1: Is this state derived from server data?
  YES → TanStack Query (contacts, group info, search results)
  NO  → Continue to Q2

Question 2: Is this state accessed by multiple components?
  YES → Continue to Q3
  NO  → useState or useReducer (local)

Question 3: Does this state need time-travel debugging or DevTools?
  YES → Redux Toolkit (messages, chats, presence, connectivity)
  NO  → React Context (theme, auth, WebSocket instance)

Question 4: Does this state need to survive page refresh?
  YES → IndexedDB (messages cache, offline queue, drafts)
  NO  → In-memory (Redux, useState, Context)

CONCRETE EXAMPLES:
  Message input text        → useState (local, ephemeral)
  Emoji picker open/closed  → useState (local, UI-only)
  Active chat ID            → Redux (global, affects multiple components)
  Online status of users    → Redux (real-time, globally needed)
  Message history           → TanStack Query (server data, cached)
  Pending send queue        → IndexedDB + Redux (persistent, sync after reconnect)
  Auth tokens               → Context + localStorage (cross-component, secure)
  Theme preference          → Context + localStorage (cross-component, persistent)
```

## 10.6 WebSocket → Redux Bridge

```ts
// middleware/websocketMiddleware.ts
const websocketMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  
  if (action.type === 'connectivity/wsConnected') {
    // WebSocket connected — drain offline queue
    const { pendingMessages } = store.getState().connectivity;
    if (pendingMessages > 0) {
      store.dispatch(drainOfflineQueue());
    }
  }
  
  return result;
};

// Setting up WS → Redux pipeline
const wsManager = WebSocketManager.getInstance();

wsManager.on('message:received', (msg: Message) => {
  store.dispatch(addIncomingMessage(msg));
});

wsManager.on('message:ack', (ack: MessageAck) => {
  store.dispatch(confirmMessage(ack));
});

wsManager.on('message:delivered', (update: StatusUpdate) => {
  store.dispatch(updateMessageStatus({ ...update, status: 'delivered' }));
});

wsManager.on('message:read', (update: StatusUpdate) => {
  store.dispatch(updateMessageStatus({ ...update, status: 'read' }));
});

wsManager.on('presence:update', (presence: PresenceUpdate) => {
  store.dispatch(updatePresence(presence));
});

wsManager.on('typing:update', (typing: TypingUpdate) => {
  store.dispatch(setTyping(typing));
});

wsManager.on('connect', () => {
  store.dispatch(setWsStatus('connected'));
});

wsManager.on('disconnect', () => {
  store.dispatch(setWsStatus('disconnected'));
});
```

---

> **💡 Interview Tip (Chapter 10):** The most common mistake is putting everything in Redux. Impress interviewers by saying: "I categorize state into 5 buckets: local UI state (useState), global app state (Redux), server state (TanStack Query), real-time state (Redux via WebSocket bridge), and persistent state (IndexedDB). Mixing these — like fetching contacts in Redux thunks instead of TanStack Query — leads to stale data, cache invalidation bugs, and loading state spaghetti."

