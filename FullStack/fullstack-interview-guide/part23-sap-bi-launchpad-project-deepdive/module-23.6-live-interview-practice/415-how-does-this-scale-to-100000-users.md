# How Does This Scale to 100,000 Users
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.6: Live Interview Practice
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What the question is really asking**: "Have you thought about scale beyond your current deployment?" — interviewers want to see systems thinking, not just implementation detail; describe what would break first, then how to fix it
- **Current scale**: ~1,000 daily active users (DAU), 4 frontend modules, 8 Spring Boot services; this is a real enterprise B2B product with relatively concentrated usage (business hours, weekday peak)
- **The honest answer about frontend scaling**: the frontend is CDN-served static JavaScript — it already scales to unlimited concurrent users; Cloudflare CDN with content-hashed filenames and 365-day TTL means 100,000 users loading the app adds almost no server load; the scale problem is the backend
- **Backend bottlenecks in order**: (1) Dashboard Data Service — high-cardinality aggregation queries get slow above ~10k concurrent users; (2) Report Export Service — CPU-bound PDF generation doesn't scale linearly; (3) Session/Auth — at 100k users, a stateful session store becomes a bottleneck if not already Redis-backed
- **The answer structure**: current scale → what breaks first (bottleneck) → fix → next bottleneck → fix → where the architecture holds and where new architecture is needed
- **The number to frame it around**: current 1,000 DAU → 10,000 DAU changes nothing → 100,000 DAU needs these 4 changes → 1M DAU needs a different architecture for the Dashboard Data layer

---

## 1. One-Line Definition
The frontend already scales — static assets on a CDN; the challenge at 100,000 users is the backend: Dashboard Data Service query performance, Report Export throughput, and the read-heavy Analytics Engine — each needs a targeted fix, not a rewrite.

---

## 2. Frontend — Already Scales

```
CURRENT SETUP FOR THE FRONTEND:

All four module bundles are static JavaScript files.
They are served from a CDN (Cloudflare).
File names are content-hashed: reports.8f3a2b.js
Cache-Control: max-age=31536000, immutable (365 days)

What happens at 100,000 users:
  100,000 browsers make a request for each user's first visit
  Mostly cache hits (repeat visitors)
  New users: CDN edge node serves the file
  Origin server: never involved after the initial CDN priming

CDN scales horizontally by design.
100,000 users requesting a cached JS file is the same infrastructure load
as 1,000 users. The CDN is not the bottleneck at any scale under ~100M requests/day.

The shell's index.html (with module URLs + SRI hashes):
  Slightly more dynamic — the shell may be server-rendered or cached at a shorter TTL
  But even at 1M concurrent users, a reverse proxy (nginx/Cloudflare) can serve
  index.html at hundreds of thousands of requests per second

CONCLUSION: frontend scaling = already solved by CDN architecture.
Questions about "scaling the frontend" should redirect to "scaling the backend APIs
that power the frontend features."
```

---

## 3. Backend Bottlenecks in Order

```
BOTTLENECK 1: Dashboard Data Service (breaks first)
─────────────────────────────────────────────────────────────────
Current state:
  Dashboard queries run against PostgreSQL
  Redis cache with 5-minute TTL on frequently-accessed dashboard data
  Handles ~500 concurrent dashboard query requests at peak

What breaks at 100,000 DAU:
  100k users × assume 40% on dashboards = 40k concurrent dashboard sessions
  Each session triggers periodic data refreshes (every 30s by default)
  40,000 ÷ 30s = ~1,300 queries/second
  Redis cache helps only if dashboards are identical (shared cache keys)
  Each user's personalised dashboard filters = unique cache key = fewer hits
  PostgreSQL read replica runs out of connection slots → query timeout

Fix at 100k users:
  Read replica farm: 3-5 Postgres read replicas behind a read replica router (eg. PgBouncer)
  Dashboard data pre-computation: nightly (and on-demand) pre-compute KPIs for each report
  Store pre-computed results in Redis with longer TTL (1 hour for stable metrics)
  Push cache invalidation when source data changes (instead of poll-every-5-min)

Fix at 1M users:
  Move dashboard data to a columnar store (ClickHouse or BigQuery)
  Postgres is OLTP; dashboard aggregations are OLAP workload
  ClickHouse handles billions of rows with sub-second aggregation query times
  This is not a micro-optimisation — it's a different database paradigm
  Cost: data pipeline from Postgres to ClickHouse (Kafka Change Data Capture)

─────────────────────────────────────────────────────────────────
BOTTLENECK 2: Report Export Service (breaks second)
─────────────────────────────────────────────────────────────────
Current state:
  Async Kubernetes jobs — each export is a Pod that runs PDF generation
  Scales from 2 to 20 pods with HPA
  At 1,000 users: 800 simultaneous morning exports → 20 pods handle it

What breaks at 100,000 DAU:
  100k users × 80% morning export rate = 80,000 exports at 9 AM
  20 pods × 40 exports/pod/hour = 800 exports/hour max capacity
  80,000 exports in 1 hour → need 100 pods
  Cost and Kubernetes scheduling latency at 100 pods is significant

Fix at 100k users:
  Move from pod-per-export to a worker pool model:
    20 long-running export worker pods (not ephemeral)
    Each worker processes a queue of export requests from a Kafka topic
    Kafka provides back-pressure: if workers are full, requests queue, not crash
  Template-based PDF generation: pre-render the report template;
    substitute data as the variable portion; no full re-render per export
    Estimated 3× throughput improvement

Fix at 1M users:
  Serverless (AWS Lambda / GCP Cloud Run) for export workers
  Scale to zero when no exports; scale to 500+ concurrent when needed
  Cost-effective for bursty workloads

─────────────────────────────────────────────────────────────────
BOTTLENECK 3: Auth Service and Session Management
─────────────────────────────────────────────────────────────────
Current state:
  Stateless JWT — no session store
  Auth Service validates JWTs by checking signature with the public key
  No database lookup per request — public key cached in memory

At 100k users:
  JWT validation is O(1) — stateless JWT scales horizontally indefinitely
  Add more Auth Service pods (or increase pod size); no shared state to coordinate
  No bottleneck here unless token rotation adds database writes

  Edge case: logout invalidation
  Current JWT TTL is 8 hours. If a user logs out, the JWT is still valid until TTL
  unless we maintain a blacklist. At 100k users, a Redis blacklist is fine.
  At 10M users, a distributed blacklist becomes tricky — short JWT TTL (15 min) + refresh token is the answer.
```

---

## 4. Horizontal Scaling — What Already Works

```
Currently using Kubernetes HPA for all 8 services.
Services that need no architectural change to scale horizontally:

Service                  Why stateless scaling works
─────────────────────────────────────────────────────────────────────────
API Gateway              Stateless routing — scale horizontally; no session dependency
Auth Service             Stateless JWT validation — add pods
Report Service           Read-only metadata — add pods, shared Redis cache
User Permissions Service Redis cache handles most load — add pods
Notification Service     Async fire-and-forget — Kafka queue absorbs spikes

Services that need architectural changes before 100k users:
─────────────────────────────────────────────────────────────────────────
Dashboard Data Service   OLAP queries → columnar store migration
Report Export Service    Pod-per-export model → worker pool + Kafka queue
Analytics Engine         Batch aggregations → pre-computation + result cache
```

---

## 5. Interview Questions & Model Answers

### Q1
**Interviewer asks:** "How does your architecture scale to 100,000 users?"

**Hruday's answer:**
> "I'll break it into two parts: frontend and backend. On the frontend, scaling is already solved — all four module bundles are static files on a CDN with content-hashed filenames and a 365-day cache. 100,000 users loading the app adds almost no origin server load. The CDN scales horizontally. The scale challenge is entirely the backend. The first thing to break would be the Dashboard Data Service. Right now it runs aggregation queries against PostgreSQL with Redis caching. At 100,000 users, with personalised dashboard filters, the Redis hit rate drops and we're running ~1,300 queries per second against PostgreSQL. That requires a read replica farm (PgBouncer + 3-5 replicas) as a near-term fix, and at a million users you'd move the OLAP workload to a columnar store like ClickHouse. The second bottleneck is the Report Export Service — the pod-per-export model works to 20 pods, but 80,000 morning exports needs a worker pool backed by a Kafka queue. The Auth Service is fine at 100k — stateless JWT validation is horizontally scalable. I'd add Redis-backed JWT blacklist for logout invalidation at that scale."

---

### Q2 — Push
**Interviewer asks:** "What would a 1 million user architecture look like, fundamentally?"

**Hruday's answer:**
> "Three architectural changes. First, a separate OLAP data layer — ClickHouse or BigQuery for dashboard and analytics query workloads. PostgreSQL is the system of record for transactional data; ClickHouse handles reporting queries. Change Data Capture via Kafka keeps them in sync. This is not optional at 1M users — PostgreSQL aggregation queries over hundreds of millions of rows are simply the wrong tool. Second, serverless report export — Lambda or Cloud Run functions instead of long-running pods; cost-effective for a bursty morning workload that needs hundreds of concurrent workers for one hour, then near-zero the rest of the day. Third, global CDN and regional API endpoints. With 1M users potentially across time zones, US east + EU west + APAC API Gateway instances behind a global load balancer. Closest region answers each request. The frontend is already global via CDN — the API layer needs the same treatment."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We'd just scale horizontally" | Too vague and not always true | Name the specific bottleneck (Dashboard Data OLAP queries) and why horizontal scaling doesn't solve it (each query gets slower with more data, not with more pods) |
| "Add more servers" | No architecture insight | Distinguish stateless services (scale horizontally) from stateful/compute services (need architectural change: columnar DB, worker pool, Kafka) |
| No frontend / backend distinction | Web dev answer mixes both | "Frontend: already scales via CDN — static assets; backend: these specific bottlenecks in this order" |
| Panic answer | "We'd have to rewrite everything" | Methodical: what breaks first, how to fix it, what breaks next, how to fix that — incremental evolution not a rewrite |

---

## 7. Hruday's Real Experience Hook

> "The most useful framework I've developed for scale questions is 'what breaks first?' Not 'what could scale better?' everything can scale better. But under a specific load increase — 10×, 100× — one thing breaks before everything else. For this system, it's the Dashboard Data Service query performance. I know this because when we added 100 new enterprise users last quarter, the average dashboard load time crept from 340ms to 420ms. That's the leading indicator — the query optimiser is struggling with the data volume growth. We built an index refresh automation to address the near-term issue. But at 10× current users, the architectural change (columnar store) is the right answer, not index tuning. Knowing the difference between 'tune it' and 'change the architecture' is the scale judgment that matters."

---

## 8. Scale Evolution (Meta-Answer)

This file IS the scale evolution — summarised:

**1,000 DAU (current) →** CDN for frontend. HPA per service. Redis caching. PostgreSQL reads + replicas.

**10,000 DAU →** No breaking changes needed. Increase pod limits. Tune Redis TTLs. Add 1-2 Postgres read replicas.

**100,000 DAU →** Read replica farm with PgBouncer. Worker pool + Kafka queue for exports. Regional CDN PoPs. Redis JWT blacklist.

**1,000,000 DAU →** ClickHouse (or BigQuery) for OLAP workloads. Serverless export workers. Multi-region API Gateway. Global load balancer.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial platforms at 10M+ users; OLAP for transaction reporting; scale from startup to national banking infrastructure | OLAP / OLTP separation; stateless JWT at scale; regional deployment |
| Swiggy / Meesho | Consumer platform at 10M+ DAU; peak load at mealtimes is a read-heavy spike; CDN for menu/product images | CDN already solving frontend scale; Kafka for order event fan-out |
| Adobe / Microsoft | Enterprise SaaS with global enterprise customers; multi-region, compliance per region (GDPR), ClickHouse for telemetry | Multi-region architecture; OLAP for analytics telemetry at product scale |
| SAP Labs | Enterprise analytics product growing into global enterprise market; scale question is relevant in sales conversations | ClickHouse for OLAP; the "what breaks first" methodology |

---

*Part 23 · How Does This Scale to 100,000 Users · Full Stack Interview Guide · Hruday D · 2026*
