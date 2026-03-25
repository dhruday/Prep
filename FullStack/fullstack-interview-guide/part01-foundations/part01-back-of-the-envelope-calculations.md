# Back-of-the-Envelope Calculations
> Part 1 — Full Stack Mindset & Interview Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Back-of-the-envelope = quick mental math to estimate system scale in under 3 minutes. No calculator needed.
- The three numbers to memorise: 1 day = 86,400 seconds. 1 month = 2.5M seconds. 1 year = 31.5M seconds.
- Power of 10 rules: KB = 10³, MB = 10⁶, GB = 10⁹, TB = 10¹², PB = 10¹⁵.
- The "1 million DAU" shortcut: 1M DAU doing 1 action/day = ~12 QPS average. 3x peak = ~36 QPS.
- The signal: doing these calculations out loud in an interview — without hesitation — screams senior engineer. Most candidates skip it.

---

## 1. One-Line Definition
Back-of-the-envelope calculation means doing rough mental math during a system design interview to quickly estimate scale, storage, and bandwidth — accurate to the nearest order of magnitude, not the exact byte.

---

## 2. The Problem It Solves

An interviewer gives you a system design problem: "Design a URL shortener. It should handle 100 million shortened URLs."

A junior engineer hears "100 million URLs" and draws a big database. A senior engineer hears "100 million URLs" and immediately calculates: 100M URLs × 500 bytes per URL = 50GB total. That's tiny — that fits in one mid-range database server. The candidate now knows they don't need sharding, they don't need a distributed key-value store, and they don't need to worry about storage costs. One Postgres instance with a good index is the right answer.

But then the senior engineer asks: "What's the read QPS?" If it's 10,000 reads per second — that's a caching problem, not a storage problem. The storage answer and the caching answer are different, and both come from quick calculations.

The calculation takes 60 seconds. It removes entire architectural discussions. It proves that the engineer thinks in systems, not just features.

---

## 3. How It Works Internally

### The Mental Model
Back-of-the-envelope is like estimating how long a road trip will take. You don't know the exact traffic. You don't measure every mile. But you know the distance is roughly 500km, your average speed is 80 km/h, and you need a stop. So the trip is about 7 hours. That estimate is good enough to plan — not for a speedometer, but for booking a hotel.

The goal is "good enough to make the right architectural decision," not "precise enough to bill the customer."

### The Mechanism — Numbers to Memorise

**Time constants (must know cold):**
- 1 minute = 60 seconds
- 1 hour = 3,600 seconds
- 1 day = **86,400 seconds** (← memorise this)
- 1 month ≈ 2,500,000 seconds
- 1 year ≈ **31,500,000 seconds** (≈ π × 10⁷ — yes, π is handy here)

**Data size reference (must know cold):**
- 1 character (ASCII) = 1 byte
- Tweet / short text = ~280 bytes
- One URL = ~500 bytes
- User profile (metadata only) = ~1KB
- Small image (compressed) = ~100KB
- HD photo (JPEG) = ~3MB
- 1-minute video (compressed) = ~10MB
- 1-hour video (HD) = ~1GB

**System capacity reference (approximate):**
- A single Postgres server: comfortable at 1–5K read QPS with indexes
- Redis: 100K+ operations/sec per node
- A typical web server (Spring Boot): 1K–10K requests/sec depending on work done
- A Kafka partition: 100K messages/sec ingest

**Common estimation shortcuts:**
- 1M DAU, 1 action/day each → 1M ÷ 86,400 ≈ **12 QPS average**
- Peak = 3x average → 12 × 3 = **36 QPS peak**
- 10M DAU, 10 actions/day → 100M ÷ 86,400 ≈ **1,160 QPS average** → ~3,500 peak

### ASCII Diagram

```
BACK-OF-THE-ENVELOPE CHEAT SHEET:
──────────────────────────────────────────────────────────────────

SCALE POWERS OF 10:
  1 Thousand (K)  = 10³           (1,000)
  1 Million (M)   = 10⁶       (1,000,000)
  1 Billion (B)   = 10⁹   (1,000,000,000)
  1 Trillion (T)  = 10¹²

  Shortcut: K × K = M. M × K = B. M × M = T (approximately).

STORAGE SIZES:
  1 byte   = 1 character
  1KB      = 1,000 bytes ≈ a short tweet
  1MB      = 10⁶ bytes  ≈ a medium-resolution photo
  1GB      = 10⁹ bytes  ≈ 1 hour of compressed HD video
  1TB      = 10¹² bytes ≈ 1,000 HD movies

TIME:
  1 day = 86,400 sec ← key number
  1 month ≈ 2.5M sec
  1 year ≈ 31.5M sec

QPS ESTIMATION PATTERN:
  users_per_day = DAU × actions_per_user
  avg_QPS = users_per_day ÷ 86,400
  peak_QPS = avg_QPS × 3

STORAGE ESTIMATION PATTERN:
  daily_data = writes_per_day × size_per_record
  yearly = daily_data × 365
  total_5yr = yearly × 5
  with_overhead = total_5yr × 1.2 (20% for indexes, replication)

BANDWIDTH ESTIMATION PATTERN:
  inbound = write_QPS × request_size
  outbound = read_QPS × response_size
  CDN offload ≈ 90% for static media → origin sees 10% of raw bandwidth
──────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```
// Candidate skips estimation entirely, jumps straight to drawing
// "Design WhatsApp"

// → draws boxes: User Service, Message Service, Database
// → never asks about scale
// → interviewer: "How many messages per day?"
// → candidate: "Uh... a lot. We'd need a big database."
// → interviewer: "How big? Do you need sharding?"
// → candidate: "Probably. Let me add a shard coordinator."
// → interviewer: "Based on what? What are the numbers?"
// → candidate has no answer.

// This candidate lost the interview because they skipped 3 minutes of math
// that would have told them exactly whether sharding is needed.
```
> **Why this fails in production:** No numbers = no architecture justification. Any design without capacity estimates is guesswork. Interviewers spot this immediately.

### Right Way — Production Quality (back-of-envelope drives decisions)
```
WORKED EXAMPLE: "Design WhatsApp"

ASSUMPTIONS (state these out loud first):
  2 billion users globally
  500M DAU (25% of total)
  Average user sends 40 messages/day
  Average message size: 100 bytes (text) + occasional media

STEP 1: Write QPS (message sends)
  500M DAU × 40 messages/day = 20 billion messages/day
  20B ÷ 86,400 = ~231,000 write QPS average
  Peak (3x) = ~700,000 write QPS

  → 700K write QPS. Cannot fit in one database.
  → Needs Cassandra or HBase (write-optimised, horizontally scalable).
  → Or: shard by user_id across 100+ Postgres shards.

STEP 2: Read QPS (message delivery / read receipts)
  For every message sent: it must be delivered to ~2 people on average (1:1 chat)
  So read delivery QPS ≈ write QPS × 2 = ~1.4M QPS at peak
  Plus read receipt updates: another ~500K QPS

  → Total ~2M read operations/sec.
  → Redis cache for presence status, active connections.
  → WebSocket server farm for push delivery.

STEP 3: Storage
  Text messages: 231K messages/sec × 100 bytes = 23MB/sec = ~2TB/day
  Media: assume 5% of messages are 500KB images →
    231K × 0.05 × 500KB = ~5.8GB/sec = ~500TB/day
  → Media must go to S3/blob storage, NOT the database.
  → Text message DB: ~2TB/day × 365 = ~730TB/year — needs multi-TB NoSQL cluster.

STEP 4: Bandwidth (outbound delivery)
  Text: 700K QPS × 100B = 70MB/sec = ~560 Mbps
  Media downloads: separate CDN, not calculated inline with message bandwidth.

ARCHITECTURAL DECISIONS DRIVEN BY THESE NUMBERS:
  × Single database: NO — 700K write QPS is way beyond any single DB.
  √ Cassandra or HBase: YES — designed for exactly this write profile.
  × Sync HTTP for delivery: NO — 2M read QPS needs persistent WebSocket connections.
  √ WebSocket server farm: YES — persistent connections reduce QPS overhead.
  √ S3 + CDN for media: YES — 500TB/day of media cannot live in a relational DB.
  √ Redis for presence/status: YES — fast K/V lookups for "is user online?"
```

> **Key decisions here:**
> - Every architectural choice is directly linked to a capacity number — not a hunch
> - Media storage separated immediately because the storage calculation shows it's 250x larger than text
> - Database type selected because write QPS (700K) exceeds relational DB capacity
> - WebSocket chosen because the read QPS (2M) would require impractical HTTP polling

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Estimate the number of servers Gmail needs to store all emails."

**Hruday's answer:**
> I'll make some assumptions and work through it.
>
> Gmail has about 2 billion active users. Let's say an average user has 50,000 emails stored — a mix of old mail, newsletters, and active conversations. An average email with text and headers is roughly 75KB. A small percentage have attachments — let's estimate attachments add another 25KB per email on average, making the average email effectively 100KB.
>
> Total storage: 2B users × 50,000 emails × 100KB = 2 × 10⁹ × 5 × 10⁴ × 10⁵ bytes = 10¹⁹ bytes = 10 exabytes.
>
> That's roughly 10 exabytes. Google's actual reported storage is in this range. To store 10 exabytes with 3x replication for durability: 30 exabytes. A modern storage server holds maybe 100TB = 10¹⁴ bytes. So: 3 × 10¹⁹ ÷ 10¹⁴ = 3 × 10⁵ = about 300,000 storage servers.
>
> That's the right order of magnitude — Google operates in the hundreds of thousands of servers range for storage alone. And that estimate took about 60 seconds.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you know when your estimate is 'good enough' vs when you need more precision?"

**Hruday's answer:**
> Back-of-envelope estimates are good enough when they're within one to two orders of magnitude of the real number — and when the architectural decision is the same across that range.
>
> Example: if my estimate gives me 7,000 QPS and the real number is somewhere between 3,000 and 14,000, the architecture is the same either way — I need Redis, I need read replicas, I need horizontal scaling of the API layer. The decision doesn't change across that range, so the estimate is good enough.
>
> If the decision would change — say, 5,000 QPS is the threshold between "one database" and "sharded database" — then I need a tighter estimate. I'd ask the interviewer for more data, or I'd state my assumption explicitly and design for the higher end.
>
> In production, you get more precise after launch. You set up monitoring, measure actual QPS and latency, and make decisions based on data. The back-of-envelope estimate is your pre-launch best guess. It needs to be large enough to not immediately catch fire, and it needs to justify the complexity choices you make.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "A candidate spends 15 minutes on back-of-envelope calculations and never draws the architecture. What went wrong?"

**Hruday's answer:**
> They over-invested in estimation. Back-of-envelope should take 3–5 minutes maximum. It's a tool to inform the design, not the main event.
>
> The purpose of estimation is to make 3–4 key architectural decisions: "Do I need caching? Do I need sharding? Do I need a CDN? Do I need a message queue?" Once you have the answer, you move on.
>
> The trap is getting lost in precision. Spending 15 minutes arguing about whether it's 7,432 QPS or 8,100 QPS is wasted time. The architectural decision for both numbers is identical. Stop calculating, start designing.
>
> My discipline: I run through the estimation in my head or on the whiteboard in 3 minutes. I state 3 headline numbers — write QPS, read QPS, storage. I say "this tells me I need X, Y, Z" and draw those components. Then I move on.
>
> Speed of estimation signals confidence. Accuracy within 50% is all you need.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Estimate the bandwidth needed for a Netflix-like video streaming service with 100M subscribers."

**Hruday's answer:**
> Netflix has about 250M subscribers globally — let me use 100M as the problem states.
>
> Concurrency: At peak (evening), maybe 20% watch simultaneously → 20M concurrent streams.
>
> Bitrate: HD streaming at 1080p takes roughly 5 Mbps. 4K takes 15–25 Mbps. Let's say 50% of users stream HD at 5 Mbps, 30% at 720p at 2.5 Mbps, 20% on mobile at 1 Mbps.
>
> Weighted average bitrate: (0.5 × 5) + (0.3 × 2.5) + (0.2 × 1) = 2.5 + 0.75 + 0.2 = 3.45 Mbps per user.
>
> Total bandwidth: 20M users × 3.45 Mbps = 69,000,000 Mbps = 69 Tbps.
>
> Netflix actually reports numbers in this range — they've stated moving about 15% of global internet traffic. At 70 Tbps, a single CDN node handles maybe 100 Gbps — so you'd need roughly 700 CDN points of presence globally. Netflix uses over 250,000 CDN servers. The estimate is in the right ballpark.
>
> This number immediately tells me: no single data centre can handle this. Everything is CDN-delivered. The origin servers only serve cache misses (new content, cache expired). The entire architecture is CDN-first not server-first.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Skipping estimation entirely | "We'd need a big database" | "Let me calculate what 'big' means. 100M users × 1KB per record = 100GB — that's one medium Postgres server. Not big at all." |
| Getting exact numbers | Spends 10 min calculating precise numbers | Round to nearest order of magnitude. "~7,000 QPS" not "7,432 QPS." The architecture is the same. |
| Peak vs average confusion | Uses average QPS to provision capacity | "Average is 2,300 QPS — I design for 3x peak: 7,000 QPS." |
| Forgetting media | Calculates text storage, forgets images/video | "Text: 50GB. But if 5% of messages are images, that's another 500TB. Storage choice is now S3, not Postgres." |

---

## 7. Hruday's Real Experience Hook

> "At Bosch, before designing the data ingestion pipeline for industrial sensor dashboards, I quickly estimated: 200 machines × 10 sensors × 1 reading/second = 2,000 messages/second, each about 50 bytes. That's 100KB/s of inbound data — nothing for a message broker, but meaningful because it's 8.6GB/day of raw data. That storage calculation told me immediately: we need a time-series database with automatic data rollup, not a plain relational table that would grow unboundedly. The 3-minute calculation saved weeks of the wrong architecture."

---

## 8. Scale Evolution

**1,000 users →** Back-of-envelope often shows numbers are trivially small. 1,000 DAU × 10 actions = 0.12 QPS. A single server with zero caching handles this for years.

**100,000 users →** Numbers reach hundreds of QPS. Caching becomes worth adding. Storage starts to matter: 100K users × 10KB profile data = 1GB — still fine, but plan it.

**10 million users →** Numbers reach tens of thousands of QPS. Sharding, caching, CDN, and scalable databases become mandatory. Every architectural decision depends on the estimated numbers.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment volume estimation: India UPI at 10B transactions/month = ~3,900 TPS average → 20K peak | "How would you design a system for India-scale UPI transaction volume?" |
| Swiggy / Meesho | Order volume × location ping frequency × media served per session — all computable | "Estimate the bandwidth needed for Swiggy's restaurant photo service at peak dinner hour." |
| Adobe / Microsoft | Enterprise doc storage, CDN for creative assets — large media objects dominate storage estimates | "Estimate storage and CDN cost for 10M Creative Cloud users uploading 5 files/day average." |
| Remote / Global roles | System design docs in async teams need capacity sections — candidates who skip them miss expectations | "Your design document must include a capacity estimates section with justification." |

---

## 10. Related Topics — What to Study Next

- **Capacity Estimation Basics (Topic 8)** — The companion topic that explains what QPS, storage, and bandwidth mean before you calculate them.
- **Database Scaling (Part 5)** — What the numbers tell you: when to add read replicas, when to shard, when to switch to Cassandra.
- **Caching Strategy (Part 9)** — What read QPS tells you: at what point caching is mandatory, what TTL to choose, what cache strategy to use.
- **Kafka Fundamentals (Part 6)** — What write QPS tells you: at what point a message queue is needed instead of synchronous API calls.
- **System Design Case Studies (Part 19)** — Practise running back-of-envelope calculations for 10 real system design problems before the interview.

---

*Part 1 · Back-of-the-Envelope Calculations · Full Stack Interview Guide · Hruday D · 2026*
