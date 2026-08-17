# Functional vs Non-Functional Requirements
> Part 1 — Full Stack Mindset & Interview Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Functional requirements = what the system does (features and behaviours).
- Non-functional requirements = how well the system does it (performance, reliability, security, scalability).
- In an interview, always ask about both. Most candidates only clarify functional requirements and design a system that "works but doesn't scale."
- The most important non-functional requirements to ask about: scale (QPS), availability (99.9% vs 99.99%), latency (p99 < 200ms), consistency (strong vs eventual), and security constraints.
- Your SAP and Bosch work is full of NFRs: Lighthouse performance scores, WCAG AA, CI/CD pipeline reliability — you've been executing against NFRs the whole time.

---

## 1. One-Line Definition
Functional requirements define what the system does — its features. Non-functional requirements (NFRs) define how well it does it — its performance, reliability, security, and scalability constraints.

---

## 2. The Problem It Solves

A payment company asks a candidate to "design a payment processing system." The candidate designs a clean system: payment service, order service, database, notification service. All the features are there. They get to the end.

The interviewer asks: "What happens when the payment service gets 10,000 transactions per second during a sale event?"

The candidate hasn't thought about it. Their single payment service instance can maybe handle 500 TPS. The database is a single Postgres instance that was already a bottleneck at 200 TPS. There's no queue to buffer spikes. The system they designed "works" but fails the moment it goes to production.

The problem: they only gathered functional requirements. "Process a payment" is a functional requirement. "Handle 10,000 TPS with p99 latency < 500ms during peak" is a non-functional requirement. The design changes completely when you know both.

Non-functional requirements are not bonus points in an interview — they are the core of a senior system design answer.

---

## 3. How It Works Internally

### The Mental Model
Functional requirements are like a job description — they tell you what the role does. Non-functional requirements are like the working conditions — how fast, how reliably, under what pressure. A job might say "analyse financial data" (functional). But whether it means "once a day" or "10,000 times per second in real-time" completely changes the tooling, team size, and architecture.

Functional requirements tell you what to build. Non-functional requirements tell you how good it has to be.

### The Mechanism — Step by Step
Here is the complete checklist for gathering requirements at the start of a system design interview:

**Functional Requirements Gathering:**
1. What are the core features? (the minimum viable set)
2. What are the out-of-scope features? (explicitly state what you're not building)
3. Who are the users? (internal, external, B2B, B2C)
4. What are the main user actions? (create, read, search, update, delete)

**Non-Functional Requirements Gathering:**
5. **Scale** — How many users? What's the read/write ratio? What's the expected QPS (queries per second)?
6. **Availability** — What's the uptime requirement? 99.9% = 8.7 hours of downtime/year. 99.99% = 53 minutes/year. 99.999% = 5 minutes/year.
7. **Latency** — What's the acceptable response time? p50? p99? Real-time (< 100ms) or batch (hours)?
8. **Consistency** — Must all users see the same data immediately (strong consistency)? Or is a few-seconds delay acceptable (eventual consistency)?
9. **Durability** — If the system crashes, what data can we afford to lose? (RPO — Recovery Point Objective)
10. **Security** — PII data? Regulatory compliance? GDPR? PCI-DSS?
11. **Geo-distribution** — Single region or multiple regions? Global users?

### ASCII Diagram

```
REQUIREMENT TYPES AT A GLANCE:
──────────────────────────────────────────────────────────────────

FUNCTIONAL (WHAT the system does):
  ✓ Users can post messages
  ✓ Users can follow other users
  ✓ Users can see a feed of messages from people they follow
  ✓ Messages can have images
  ✗ Users can schedule posts (explicitly out of scope)

NON-FUNCTIONAL (HOW WELL the system does it):
  ✓ Scale: 100M users, 500K DAU, 50M messages/day
  ✓ Read:Write ratio: 100:1 (reads dominate — feed design matters)
  ✓ Write throughput: ~580 writes/sec (50M / 86400 sec)
  ✓ Read throughput: 58,000 reads/sec (100:1 ratio)
  ✓ Latency: Feed loads in < 300ms at p99
  ✓ Availability: 99.99% (about 53 minutes of downtime per year)
  ✓ Consistency: Eventual OK — seeing a new post 5 seconds late is fine
  ✓ Durability: No message loss — once written, always retrievable

HOW NFRs CHANGE THE ARCHITECTURE:
  Without NFRs:        Single API server + single database = done
  With 58K reads/sec:  Add Redis feed cache + read replicas
  With 99.99% SLA:     No single point of failure — replicated everything
  With eventual OK:    Fan-out on write to pre-built feeds is fine
──────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// A system designed without NFRs — "works" but fails in production

@RestController
public class FeedController {

    @GetMapping("/feed")
    public List<Post> getFeed(@RequestParam Long userId) {
        // Direct DB query every single time — no cache
        // No pagination — returns everything
        // No timeout — a slow query hangs the thread forever
        return postRepository.findByFollowees(userId);
        // At 58,000 reads/sec → database melts under load
        // Single database instance → no read scaling
    }
}
```
> **Why this fails in production:** Without knowing the read QPS NFR, this design looks fine. With 58K reads/sec, a direct DB query on every request is not viable. The NFR forces the caching layer into the design.

### Right Way — Production Quality (designed WITH NFRs in mind)
```java
// NFRs inform every decision below:
// - 58K reads/sec → Redis feed cache is required
// - p99 < 300ms → Redis must respond in < 10ms; DB is backup only
// - Eventual consistency OK → cached feed can be 30s stale
// - 99.99% availability → fallback to DB if cache fails

@RestController
@RequestMapping("/api/feed")
public class FeedController {

    private final FeedCacheService feedCache;
    private final FeedRepository feedRepo;

    @GetMapping
    public ResponseEntity<FeedPageResponse> getFeed(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit) {

        String userId = user.getUsername();
        String cacheKey = "feed:" + userId + ":" + (cursor == null ? "start" : cursor);

        // Try cache first — p99 Redis latency is ~1ms
        // NFR: p99 < 300ms → this is the fast path for 99%+ of requests
        FeedPageResponse cached = feedCache.get(cacheKey);
        if (cached != null) {
            return ResponseEntity.ok(cached);
        }

        // Cache miss — query the pre-aggregated feed table
        // (NOT a join query across followers — pre-built by the fan-out write worker)
        List<Post> posts = feedRepo.findFeedPage(userId, cursor, limit + 1);

        String nextCursor = null;
        if (posts.size() > limit) {
            nextCursor = posts.get(limit).getId().toString();
            posts = posts.subList(0, limit);
        }

        FeedPageResponse response = new FeedPageResponse(posts, nextCursor);

        // Cache for 30 seconds — NFR allows eventual consistency
        // A 30-second stale feed is acceptable per product requirements
        feedCache.set(cacheKey, response, Duration.ofSeconds(30));

        return ResponseEntity.ok(response);
    }
}
```

```yaml
# NFRs drive infrastructure decisions too:
# 99.99% availability → Redis Cluster (not single instance)
# 58K reads/sec → multiple API instances behind load balancer

spring:
  data:
    redis:
      cluster:
        nodes:
          - redis-node-1:6379
          - redis-node-2:6379
          - redis-node-3:6379
        # Cluster gives us: horizontal read scaling + automatic failover
        # Single Redis instance would be a SPOF — violating 99.99% SLA
```

> **Key decisions here:**
> - Pre-built feed table (read from `user_feeds`, not join across `follows + posts`) — designed because the 100:1 read/write NFR says reads dominate
> - Redis cache with 30s TTL — driven by "eventual consistency OK" NFR
> - Redis Cluster, not single instance — driven by 99.99% availability NFR
> - `limit + 1` trick — efficient next-page detection without a COUNT query

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are non-functional requirements and why do they matter in system design?"

**Hruday's answer:**
> Functional requirements tell you what the system does — the features. Non-functional requirements tell you how well it does it — the performance, reliability, security, and scale constraints.
>
> They matter because a system that satisfies functional requirements but ignores NFRs will fail in production. You can build a perfectly correct payment service that processes payments accurately. But if it can only handle 200 TPS and you get 10,000 TPS during a flash sale, users see timeouts and you lose revenue.
>
> The architecture changes completely based on NFRs. Eventual consistency is fine for a social media feed — you can cache aggressively and use fan-out writes. But a banking ledger requires strong consistency — you need ACID transactions and no caching on balances.
>
> In every system design conversation, I spend 5 minutes on requirements — half on functional and half on NFRs. The NFRs are what tell me how many services I need, whether to use Kafka, whether Redis is required, and whether I need a CDN.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does an availability requirement of 99.99% change your system design compared to 99.9%?"

**Hruday's answer:**
> The numbers sound close but the operational difference is significant. 99.9% means about 8.7 hours of downtime allowed per year. 99.99% means about 53 minutes per year. That's a 10x difference in allowed downtime.
>
> Going from 99.9% to 99.99% typically requires:
>
> First, eliminating every single point of failure (SPOF). A single database instance is a SPOF. You need at least one replica. A single API server is a SPOF. You need multiple instances behind a load balancer. A single Redis instance is a SPOF. You need Redis Cluster or Sentinel.
>
> Second, zero-downtime deployments. With 99.9%, a 5-minute deployment window is fine — 5 minutes per week is still under 8.7 hours/year. With 99.99%, a 5-minute deployment window every week would already consume your budget — 52 × 5 minutes = 260 minutes, which is way above 53 minutes.
>
> Third, automated failover. No manual processes in the critical path. At 99.99%, when a node fails, the system needs to detect and switch over in seconds, not minutes.
>
> At SAP, our frontend stack was expected to have near 99.99% availability — which is why we had multi-region CDN configs and zero-downtime deployments as part of the CI/CD pipeline.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Is it always better to have stricter NFRs — lower latency, higher availability, stronger consistency?"

**Hruday's answer:**
> No — stricter NFRs are more expensive and more complex, and complexity has a cost. The right NFR is the minimum that satisfies the business need.
>
> Strong consistency everywhere sounds right, but it means every read hit the primary database — you can't use replicas, you can't cache, you can't fan out writes. Your write throughput becomes your system ceiling. For a social media feed, that's terrible. For a banking ledger, that's necessary.
>
> 99.999% availability for a "nice to have" feature is engineering waste. That level requires multi-region active-active deployment, which means distributed transactions, replication lag handling, conflict resolution, and 5x the infrastructure cost. A product recommendation widget doesn't need 99.999% availability.
>
> The senior skill is matching NFRs to business reality. I ask the product team: "What does a user experience if this feature is down for 5 minutes? If it's just a message and they retry — 99.9% is fine. If it's a payment in progress and money hasn't moved — that needs 99.99% or better."
>
> Overkill NFRs are just as bad as underkill NFRs. Both waste resources.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design a real-time delivery tracking system for Swiggy. Start by gathering requirements."

**Hruday's answer:**
> I'll start with functional requirements:
>
> Core features: customers can see their delivery person's live location on a map. Delivery agents send location updates from their phone. Estimated arrival time updates as location changes. Customer gets notified when agent is nearby and when order is delivered.
>
> Out of scope for now: route optimisation, batching multiple orders per agent, agent-customer messaging.
>
> Now non-functional requirements — and this is where the design decisions get made:
>
> Scale: 2M deliveries per day, peak during lunch and dinner. Say 100K concurrent active deliveries during peak hour. Each agent sends a location update every 5 seconds → 100K ÷ 5 = 20,000 location writes per second. Customers read the location roughly every 3 seconds → about 30,000–60,000 location reads per second.
>
> Latency: location updates should appear within 1–2 seconds of the agent moving — so write-to-read latency under 2 seconds.
>
> Consistency: slightly stale location is OK — showing a location 1–2 seconds behind is fine. Eventual consistency is acceptable.
>
> Availability: 99.9% — delivery tracking is important but a 30-second outage during a delivery is survivable.
>
> Now my architecture is determined by these NFRs: WebSocket for real-time location push (not polling), a time-series or Redis-backed location store for fast writes, and a CDN-free direct WebSocket path for low latency.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Ignoring NFRs entirely | Jumps to drawing architecture boxes | "Before I start — let me get the scale and reliability requirements. Those shape the entire design." |
| Only asking about users | "How many users?" | Also ask: read/write ratio, latency target, availability SLA, consistency requirement, geo-distribution. |
| Treating all NFRs equally | Builds for 99.999% and strong consistency everywhere | Match NFRs to business need — overkill NFRs add cost and complexity without business value. |
| Forgetting security NFRs | Never mentions GDPR, PCI-DSS, data residency | "Does this system handle PII? Payment data? Any regulatory constraints I should design around?" |

---

## 7. Hruday's Real Experience Hook

> "At SAP, every feature had an implicit set of NFRs — the Lighthouse performance budget (LCP < 2.5s), WCAG AA for accessibility, and a 99.9% uptime SLA enforced by our CI/CD pipeline health gates. I didn't always call them 'NFRs' at the time, but that's exactly what they were. I was designing against performance budgets, availability requirements, and compliance constraints every sprint. When I design systems in interviews now, gathering NFRs first feels natural — because that's how production engineering actually works."

---

## 8. Scale Evolution

**1,000 users →** NFRs barely matter. A simple server handles everything. Latency is naturally fast. Availability is a nice-to-have.

**100,000 users →** NFRs start shaping architecture. A 99.9% SLA means you need at least a database replica. Latency requirements reveal the need for caching. Read/write ratio shows if a single DB is sufficient.

**10 million users →** NFRs drive every decision. 99.99% requires multi-region, active-active, automated failover. Sub-100ms read latency requires CDN + multiple cache layers. Strong consistency becomes very expensive — you fight hard to use eventual consistency wherever the product allows it.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payments require strict NFRs: durability (no lost transactions), strong consistency (correct balances), PCI compliance | "What happens if a payment write fails halfway? What's your durability guarantee?" |
| Swiggy / Meesho | Availability and latency NFRs drive real-time tracking and order flows | "What's the p99 latency for the order status update? What happens if your location service is down for 30 seconds?" |
| Adobe / Microsoft | Enterprise products have SLA contracts — SLI, SLO, SLA terminology matters | "Can you define SLIs for this system? What SLO would you commit to?" |
| Remote / Global roles | Geo-distribution is an NFR — where does data reside? GDPR? Multi-region deployment? | "If users are in EU and India, how does data residency affect your storage design?" |

---

## 10. Related Topics — What to Study Next

- **Back-of-the-Envelope Calculations (Topic 9)** — NFRs like "100M users, 10:1 read/write ratio" must be converted to actual numbers (QPS, storage) — this topic shows how.
- **CAP Theorem (Part 8)** — The theoretical basis for consistency vs availability trade-offs — every NFR conversation about consistency leads here.
- **Requirement Clarification Framework (Topic 12)** — A complete framework for the first 5 minutes of any system design interview, built on functional + NFR gathering.
- **SLI, SLO, SLA (Part 8)** — The formal vocabulary for availability NFRs — knowing the difference makes you sound like a production engineer.
- **Caching Strategy (Part 9)** — Latency NFRs almost always point to caching — this part shows how to design caching correctly.

---

*Part 1 · Functional vs Non-Functional Requirements · Full Stack Interview Guide · Hruday D · 2026*
