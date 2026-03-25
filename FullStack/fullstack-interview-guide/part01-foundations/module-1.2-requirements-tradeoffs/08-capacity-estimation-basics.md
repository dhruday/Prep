# Capacity Estimation Basics — QPS, Storage, Bandwidth
> Part 1 — Full Stack Mindset & Interview Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- QPS = Queries Per Second — how many requests your system must handle every second.
- Storage = how much data accumulates over time and what database/storage tier holds it.
- Bandwidth = how much data moves in and out of your system per second.
- The key formula: daily volume ÷ 86,400 seconds = average QPS (then multiply by 3x for peak).
- Never design a system without stating these numbers — the entire architecture depends on them.

---

## 1. One-Line Definition
Capacity estimation means calculating how much load your system must handle — in requests per second, in bytes stored, and in bytes transferred — so you can choose the right databases, caches, and infrastructure before writing code.

---

## 2. The Problem It Solves

A candidate designs a feed system for a "medium-sized social app." They choose a single Postgres instance. The interviewer asks: "How many users do you have?" The candidate says: "About 50 million." The interviewer asks: "And what's your read QPS?"

The candidate doesn't know. They never calculated it.

Without QPS, the single Postgres instance might be fine — or it might collapse on the first day of launch. Without storage numbers, you don't know if you need 1 database server or 100. Without bandwidth numbers, you don't know if your CDN budget is $10/month or $100,000/month.

Capacity estimation is not about being precise. It's about being in the right order of magnitude. Knowing that your system needs to handle 50,000 QPS tells you immediately: single database won't work, you need caching, you need horizontal scaling. Knowing it's 500 QPS tells you a single DB is fine. The architecture is completely different.

Senior engineers think in numbers before they design. Juniors draw boxes and hope they're right.

---

## 3. How It Works Internally

### The Mental Model
Capacity estimation is like planning a party. You need to know roughly how many guests before you decide how many chairs, how much food, how big the venue. You don't need an exact guest count. But saying "I don't know how many people are coming" before booking the venue is not acceptable. Estimate. Book. Adjust if needed.

QPS, storage, and bandwidth are the chairs, food, and venue of system design.

### The Mechanism — Step by Step

**Step 1: Start with users**
- How many total users?
- How many Daily Active Users (DAU)?
- Key assumption: DAU ≈ 10% of total users (common industry average for most apps).

**Step 2: Calculate QPS**
- How many key actions does a user take per day?
- Multiply: DAU × actions per user per day = total operations per day.
- Divide: total operations per day ÷ 86,400 seconds = average QPS.
- Multiply by 2×–3× for peak QPS (traffic is not evenly spread — peak is 2–3x average).

**Step 3: Split into read QPS and write QPS**
- Most systems have a read:write ratio. Social feed: 100:1. E-commerce: 10:1. Chat: 1:1.
- Write QPS drives database write capacity and replication lag.
- Read QPS drives caching needs.

**Step 4: Calculate storage**
- How big is one record in bytes?
- How many new records per day?
- Multiply: records/day × size per record = bytes/day.
- Multiply by 365 × years to run = total storage.
- Add 20% overhead for indexes and replication.

**Step 5: Calculate bandwidth**
- Inbound (write): write QPS × size per request.
- Outbound (read): read QPS × size per response.
- Media heavy? Calculate separately for images/video.

### ASCII Diagram

```
CAPACITY ESTIMATION WORKED EXAMPLE — Twitter-style Feed:
──────────────────────────────────────────────────────────────────

GIVEN ASSUMPTIONS:
  Total users:    100M
  DAU:            10M  (10% of total)
  Tweets/day:     1 tweet per 10 users = 1M tweets/day
  Feed reads:     Each DAU reads feed 20x/day = 200M reads/day

STEP 1 — WRITE QPS:
  1M tweets/day ÷ 86,400s = ~12 write QPS (average)
  Peak (3x):  12 × 3 = ~36 write QPS
  → A single DB handles this easily. No sharding needed for writes.

STEP 2 — READ QPS (feed reads):
  200M reads/day ÷ 86,400s = ~2,300 read QPS (average)
  Peak (3x): 2,300 × 3 = ~7,000 read QPS
  → Postgres can handle maybe 500–1,000 QPS comfortably.
  → 7,000 QPS requires: Redis cache (takes 90%+ of load off DB)
  → Or: multiple read replicas behind a load balancer.

STEP 3 — STORAGE (tweets only):
  1 tweet: user_id (8B) + content (280 chars ≈ 560B) + timestamp (8B)
         = ~600 bytes per tweet
  1M tweets/day × 600B = 600MB/day
  1 year:  600MB × 365 = ~220GB
  5 years: 220GB × 5 = ~1.1TB
  With indexes (20% overhead): ~1.3TB for 5 years
  → One reasonably sized Postgres instance handles this.
  → If you add images/video, multiply by 100–1000x and use blob storage (S3).

STEP 4 — BANDWIDTH:
  Read bandwidth: 7,000 reads/sec × 1KB per feed response = 7MB/sec = 56 Mbps
  Write bandwidth: 36 writes/sec × 600B = ~21KB/sec (negligible)
  → Total ~56 Mbps outbound. A single gigabit NIC handles this. CDN for media.

SUMMARY TABLE:
  ┌─────────────────────┬──────────────────────┬────────────────────────┐
  │ Metric              │ Number               │ Implication            │
  ├─────────────────────┼──────────────────────┼────────────────────────┤
  │ Write QPS (peak)    │ 36                   │ Single DB fine         │
  │ Read QPS (peak)     │ 7,000                │ Redis cache required   │
  │ Storage (5 years)   │ 1.3TB text           │ One DB, one datacenter │
  │ Bandwidth           │ ~56 Mbps             │ Single server + CDN    │
  └─────────────────────┴──────────────────────┴────────────────────────┘
──────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// A system designed without capacity estimation — no caching because nobody
// calculated that 7,000 read QPS would crush a single Postgres instance

@GetMapping("/feed")
public List<Tweet> getFeed(@RequestParam Long userId) {
    // Direct DB query — no cache
    // Works fine in development with 10 test users
    // Falls over at 7,000 QPS in production
    return tweetRepository.findFeedByUserId(userId, PageRequest.of(0, 20));
}
```
> **Why this fails in production:** Without calculating that 7,000 QPS is needed, this design looks "correct." With the numbers, you immediately see that a direct DB query without caching will collapse under load.

### Right Way — Production Quality (designed from capacity estimates)
```java
// Architecture decisions driven by capacity estimation:
// 7,000 read QPS → Redis cache for pre-built feeds
// 36 write QPS   → Fan-out on write (async, not blocking)
// Eventual consistency OK → cache TTL acceptable

@RestController
public class FeedController {

    private final RedisFeedCache feedCache;
    private final FeedRepository feedRepo;

    @GetMapping("/feed")
    public ResponseEntity<FeedResponse> getFeed(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit) {

        // CAPACITY RATIONALE: 7,000 read QPS estimated at peak.
        // Redis handles 100K+ QPS per node — this fits easily.
        // Pre-built feed per user in Redis, keyed by userId:cursor.
        FeedPage cached = feedCache.get(user.getUsername(), cursor);
        if (cached != null) {
            // Cache hit: ~1ms response — handles 7,000 QPS comfortably.
            return ResponseEntity.ok(new FeedResponse(cached));
        }

        // Cache miss: DB query.
        // With Redis absorbing 95%+ of requests, DB sees ~350 QPS max.
        // Single Postgres with 2–3 read replicas handles 1,000 QPS easily.
        FeedPage page = feedRepo.getFeedPage(user.getUsername(), cursor, limit);
        feedCache.set(user.getUsername(), cursor, page, Duration.ofMinutes(5));

        return ResponseEntity.ok(new FeedResponse(page));
    }
}

// Fan-out on write — triggered when a user posts a tweet
// CAPACITY RATIONALE: 36 write QPS — low enough for fan-out to be fast
// If this were 3,600 write QPS, we'd switch to fan-out on read instead
@Service
public class TweetFanOutService {

    @Async // Non-blocking — posting a tweet returns immediately
    public void fanOutToFollowers(Tweet tweet) {
        List<Long> followerIds = followerService.getFollowerIds(tweet.getAuthorId());
        // For up to ~10,000 followers: synchronous fan-out is fine
        // For celebrities with 1M+ followers: switch to Kafka-based async fan-out
        for (Long followerId : followerIds) {
            feedCache.prepend(followerId, tweet); // fast Redis LPUSH
        }
    }
}
```

> **Key decisions here:**
> - Redis pre-built feed: read QPS estimate (7,000) dictated this — Postgres alone can't serve it
> - Fan-out on write: write QPS (36) is low enough that sync fan-out to followers is fast
> - `@Async` on fan-out: posting a tweet shouldn't block waiting for fan-out to complete
> - The comment "For celebrities with 1M+ followers: switch to Kafka-based async fan-out" — this is capacity thinking at the code comment level

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do you estimate QPS for a system when you don't have exact data?"

**Hruday's answer:**
> I start from reasonable assumptions about user behaviour. For most consumer apps, Daily Active Users are roughly 10% of total users. That's a common industry baseline.
>
> Then I estimate how many key actions a user takes per day. For a social feed: a typical user reads their feed maybe 10–20 times a day and maybe posts once every few days. For a search engine: a user performs maybe 3–5 searches per day. For a food delivery app: 1–2 orders per week max, but probably views the app 5–10 times a week.
>
> Once I have daily action volume, I divide by 86,400 — the number of seconds in a day — to get average QPS. Then I multiply by 2x to 3x for peak, because traffic is not evenly spread. Lunch and dinner spikes for food apps. Morning rush for commute apps. This peak number is what my architecture must handle.
>
> These numbers are estimates. They'll be off by 50%. But being in the right order of magnitude — knowing it's 7,000 QPS not 70,000 QPS — is what shapes the architecture. The exact number gets refined in production with actual monitoring.

---

### Q2 — Deep Dive
**Interviewer asks:** "You estimated 7,000 read QPS for the feed. What does that tell you about your database and caching choices?"

**Hruday's answer:**
> PostgreSQL, well-tuned on modern hardware, can typically handle 5,000–10,000 simple read queries per second under good conditions using connection pooling. So 7,000 QPS is at the edge of what a single Postgres instance can comfortable handle — and that's with ideal conditions, not real-world concurrent complex queries.
>
> More importantly, the 7,000 QPS is peak. It means the average is maybe 2,300 QPS. But I need to design for peak, not average.
>
> The practical decision: I can't rely on Postgres alone. I add Redis in front. Redis can handle 100,000+ QPS per node — it has headroom for this load with room to spare. If I can put 90–95% of feed reads into Redis, Postgres sees roughly 350–700 QPS. That's completely comfortable for a single primary with one read replica.
>
> The other thing 7,000 read QPS tells me: fan-out on write makes sense here. If I pre-build each user's feed in Redis when new posts arrive (write side), reads are instant cache hits. That's only viable because the write QPS is low (36 per second) — so pre-building feeds for all followers is fast. If write QPS were 10,000, I'd flip to fan-out on read instead.
>
> Numbers drive architecture. This is the core lesson.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Is it better to overestimate or underestimate capacity when designing a system?"

**Hruday's answer:**
> Overestimate by a modest amount — maybe 2x–3x the expected peak. But not wildly overestimate.
>
> The reasons to overestimate slightly: traffic spikes are real. A product launch, a viral moment, a marketing campaign can produce 5–10x normal traffic in minutes. If your system is designed exactly at its limit, any spike takes it down. A 2x–3x headroom means you absorb reasonable surprises without a production incident.
>
> The reasons not to wildly overestimate: engineering complexity and cost. If you design for 100x capacity when you need 1x, you add Kafka, Redis Cluster, 20 microservices, and a team of 10 engineers to support infrastructure that handles 50 real daily users. That's wasted investment and wasted engineering complexity.
>
> The right level: design for estimated peak QPS × 3, plan the architecture so adding more capacity is straightforward (stateless services, horizontal scaling) — but don't actually add that capacity until monitoring says you need it.
>
> In practice: start simple, measure, scale when you need to. The architecture should allow scaling, but don't pre-buy capacity you don't yet need.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design an image hosting service like Imgur. Walk through the capacity estimates."

**Hruday's answer:**
> Assumptions: 100M users, 1M DAU. Users upload an average of 1 image per day per 100 DAU — so 10,000 uploads per day. Users view images about 50 times per DAU per day — so 50M views per day.
>
> Write QPS: 10,000 uploads ÷ 86,400 = ~0.12 write QPS average. Peak at 3x = ~0.36 QPS. Writes are trivial.
>
> Read QPS: 50M ÷ 86,400 = ~580 read QPS average. Peak at 3x = ~1,740 read QPS. Read requests to the image server.
>
> Storage: average image after compression — 500KB. 10,000 uploads/day × 500KB = 5GB/day. One year = ~1.8TB. Five years = ~9TB. This is blob storage — not a database. Use S3 or an equivalent object store.
>
> Bandwidth: image serving. 1,740 QPS × 500KB per image = ~850MB/sec of outbound bandwidth. At $0.09/GB for CDN egress, that's about $2,200/day or $66K/month at the CDN layer. This is why heavy media services live or die by CDN cost optimisation. WebP format instead of JPEG can cut this by 30%.
>
> The bandwidth number immediately tells me: put a CDN in front. Serve images from CDN edges close to users. The origin S3 storage handles the long-term cold storage. The architecture is clear: upload service → S3 → CDN. The calculation told me that before I drew a single box.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Designing without numbers | Just starts drawing boxes | "Before I design anything — let me get the scale. How many users, what's the read/write ratio?" Then calculates QPS. |
| Exact numbers | "It would be exactly 4,382 QPS" | Round numbers are better: "roughly 5,000 QPS at peak." Precision signals missed the point — estimation is the skill. |
| Forgetting peak vs average | Uses average QPS to design | "Average is 2,300 QPS. Peak is 3x that — 7,000 QPS. I design for peak." |
| Ignoring storage | Only calculates QPS | Always calculate storage too — it drives database choice, sharding thresholds, and cost projections. |

---

## 7. Hruday's Real Experience Hook

> "At Bosch, I worked on real-time industrial dashboards where we needed to handle sensor data from hundreds of machines, each sending updates every second. I had to estimate the message rate — 200 machines × 10 sensors × 1 update/sec = 2,000 messages/second. That told me immediately that a simple HTTP polling architecture was wrong — 2,000 HTTP requests per second to a single backend would be a problem. We used WebSockets and a message broker instead. The capacity number drove the architecture decision. I've applied this same pattern ever since."

---

## 8. Scale Evolution

**1,000 users →** QPS is under 10. Almost any architecture works. No caching needed. A single DB handles everything. The main estimation value here is storage — will your data grow faster than expected?

**100,000 users →** QPS reaches hundreds. Basic caching is needed. Read replicas start to help. Storage estimates become important for budget planning.

**10 million users →** QPS reaches thousands. Cache is mandatory. Multiple DB instances. CDN for static content. Storage is in the terabytes. Every capacity estimate directly maps to monthly cloud spend.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction volume estimates: 1M transactions/day, 11 TPS average, 50 TPS peak — this immediately tells you DB and Redis requirements | "Walk me through the capacity estimates for a payment system handling India's UPI scale." |
| Swiggy / Meesho | Order volume, location ping frequency, image serving — all drive different architecture components | Can you estimate write QPS for order placement and read QPS for restaurant listing? |
| Adobe / Microsoft | Enterprise scale estimations for document storage, collaboration events, CDN bandwidth | "Design a document storage system for 500K enterprise users — what's the bandwidth cost?" |
| Remote / Global roles | Remote companies write design documents — capacity estimation is expected in the document | "Your design doc needs a 'Capacity Estimates' section — what goes in it?" |

---

## 10. Related Topics — What to Study Next

- **Back-of-the-Envelope Calculations (Topic 9)** — Goes deeper with worked examples and common reference numbers to memorise before interviews.
- **Database Scaling (Part 5)** — Once you know QPS, you learn exactly when to add read replicas, when to shard, and when to switch to NoSQL.
- **Caching Strategy (Part 9)** — Read QPS estimates directly tell you when caching is necessary and what TTL to use.
- **Kafka Fundamentals (Part 6)** — High write QPS (thousands per second) → Kafka replaces synchronous writes.
- **Redis Deep Dive (Part 5)** — The first tool to reach for when read QPS exceeds DB capacity.

---

*Part 1 · Capacity Estimation Basics · Full Stack Interview Guide · Hruday D · 2026*
