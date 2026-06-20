# 🏗️ Ultimate System Design Interview Handbook
### For Senior & Staff Engineers (7+ Years Experience)
> *Cracking interviews at Google, Amazon, Meta, Microsoft, Uber, Netflix, Airbnb & Salesforce*

---

## 📌 How to Use This Handbook

| Goal | Start Here |
|------|-----------|
| Quick revision | `03_interview_bank/02_top_100_questions.md` |
| Deep preparation | `04_study_plan/01_30_day_study_plan.md` |
| Specific problem | `02_problems/` → pick the file |
| Core concepts | `01_foundations/` → read in order |
| Staff Engineer level | `05_advanced/01_staff_engineer_guide.md` |

---

## 📁 Repository Structure

```
system-design-handbook/
├── 00_INDEX.md                          ← You are here
│
├── 01_foundations/                      ← Core knowledge (read first)
│   ├── 01_requirement_gathering.md
│   ├── 02_capacity_estimation.md
│   ├── 03_distributed_systems.md
│   ├── 04_database_design.md
│   ├── 05_caching.md
│   ├── 06_messaging_systems.md
│   ├── 07_load_balancing.md
│   ├── 08_reliability.md
│   ├── 09_security.md
│   ├── 10_monitoring.md
│   └── 11_trade_off_analysis.md
│
├── 02_problems/                         ← 30 complete system designs
│   ├── 01_url_shortener.md             (URL Shortener + TinyURL)
│   ├── 02_pastebin.md                  (Pastebin)
│   ├── 03_whatsapp_messenger.md        (WhatsApp + FB Messenger)
│   ├── 04_youtube_netflix.md           (YouTube + Netflix)
│   ├── 05_twitter_instagram.md         (Twitter/X + Instagram)
│   ├── 06_uber_maps.md                 (Uber + Google Maps)
│   ├── 07_dropbox_google_drive.md      (Dropbox + Google Drive)
│   ├── 08_notification_system.md       (Push/Email/SMS Notifications)
│   ├── 09_rate_limiter.md              (Rate Limiter)
│   ├── 10_api_gateway.md               (API Gateway)
│   ├── 11_search_engine.md             (Search Engine)
│   ├── 12_news_feed.md                 (News Feed / Timeline)
│   ├── 13_distributed_cache.md         (Distributed Cache)
│   ├── 14_distributed_file_system.md   (Distributed File System)
│   ├── 15_booking_systems.md           (Hotel + Ticket Booking)
│   ├── 16_payment_system.md            (Payment Processing)
│   ├── 17_ecommerce.md                 (E-Commerce Platform)
│   ├── 18_logging_metrics_system.md    (Logging + Metrics)
│   ├── 19_recommendation_system.md     (Recommendation Engine)
│   ├── 20_job_scheduler.md             (Distributed Job Scheduler)
│   └── 21_real_time_analytics.md       (Real-Time Analytics)
│
├── 03_interview_bank/
│   ├── 01_top_100_questions.md         ← Categorized top 100
│   └── 02_question_bank_250plus.md     ← Full 250+ Q&A bank
│
├── 04_study_plan/
│   └── 01_30_day_study_plan.md         ← Day-by-day plan
│
└── 05_advanced/
    ├── 01_staff_engineer_guide.md      ← Staff/Principal level
    └── 02_production_reality.md        ← What companies actually build
```

---

## 🎯 Problem Coverage Map

### By Company Preference

| Company | Primary Problems | Secondary |
|---------|-----------------|-----------|
| **Google** | Search Engine, Maps, YouTube, Drive | Distributed Cache, Monitoring |
| **Amazon** | E-Commerce, Payment, Notification, S3 | Job Scheduler, Rate Limiter |
| **Meta** | News Feed, Messenger, Instagram, WhatsApp | Real-time Analytics |
| **Microsoft** | OneDrive/Drive, Teams (Messenger), Search | API Gateway |
| **Uber** | Ride Sharing, Maps, Surge Pricing | Notification, Payment |
| **Netflix** | Video Streaming, CDN, Recommendation | Real-time Analytics |
| **Airbnb** | Booking System, Payment, Search | Notification, Maps |
| **Stripe/PayPal** | Payment System, Rate Limiter, API Gateway | Distributed Lock |

### By Difficulty

| Level | Problems |
|-------|---------|
| 🟢 **Entry** | URL Shortener, Pastebin, Rate Limiter |
| 🟡 **Mid** | Notification, API Gateway, News Feed, Booking |
| 🔴 **Senior** | WhatsApp, YouTube, Twitter, Uber, Google Drive |
| 🔥 **Staff** | Search Engine, Recommendation, Real-Time Analytics, Distributed FS |

---

## 📐 The 20-Part Answer Framework

Every system design problem in this handbook follows this structure:

```
Part 1  → Problem Statement & Requirements
Part 2  → Requirement Gathering (clarification questions)
Part 3  → Capacity Estimation
Part 4  → High-Level Architecture (ASCII diagrams)
Part 5  → Data Model & Schema
Part 6  → API Design
Part 7  → Deep Dive Components
Part 8  → Scalability (10K → 1B users)
Part 9  → Database Design
Part 10 → Caching Strategy
Part 11 → Distributed Systems Concepts
Part 12 → Messaging & Event Architecture
Part 13 → Load Balancing
Part 14 → Reliability & Fault Tolerance
Part 15 → Security
Part 16 → Monitoring & Observability
Part 17 → Trade-Off Analysis
Part 18 → Production Reality
Part 19 → Staff Engineer Deep Dive
Part 20 → Interview Summary (5/15/45 min answers)
```

---

## ⏱️ Interview Time Allocation Guide

### 45-Minute Interview Breakdown

```
0-5 min   → Requirements & Clarifications (NEVER skip this)
5-10 min  → Capacity Estimation (show your math)
10-20 min → High-Level Design (draw the diagram)
20-35 min → Deep Dive (interviewer-guided)
35-42 min → Bottlenecks, Trade-offs, Scaling
42-45 min → Questions for interviewer
```

### What Interviewers Actually Grade

| Criterion | Weight | What They Look For |
|-----------|--------|-------------------|
| Requirements clarity | 15% | Ask the right questions |
| Breadth | 20% | Cover all components |
| Depth | 25% | Deep dive when probed |
| Trade-offs | 25% | Know pros/cons of decisions |
| Communication | 15% | Structure, clarity |

---

## 🔑 Core System Design Principles

### The Twelve Design Principles You Must Know

1. **Single Responsibility** — Each service does one thing well
2. **Loose Coupling** — Services interact via APIs/events, not direct calls
3. **High Cohesion** — Related functionality stays together
4. **Design for Failure** — Assume everything will fail; plan for it
5. **Scale Horizontally** — Add more machines, not bigger machines
6. **Cache Aggressively** — Cache at every layer; invalidate carefully
7. **Async Over Sync** — Decouple with queues where latency allows
8. **Idempotency** — Retries should be safe; design for them
9. **Eventual Consistency** — Accept it where strong consistency is too costly
10. **Observability First** — Logs, metrics, traces from day one
11. **Security by Default** — Encrypt, authenticate, authorize everything
12. **Cost Awareness** — Every architectural decision has a dollar cost

---

## 🧠 Quick Reference: Technology Choices

### When to Use What Database

| Scenario | Technology | Why |
|----------|-----------|-----|
| User profiles, relational data | PostgreSQL / MySQL | ACID, joins, structured |
| Session data, leaderboards, cache | Redis | In-memory, fast, TTL |
| Time-series metrics | InfluxDB / TimescaleDB | Optimized for time queries |
| Documents, catalogs | MongoDB | Flexible schema |
| Graph (social, recommendations) | Neo4j / DynamoDB | Relationship traversal |
| Write-heavy analytics | Cassandra | Wide-column, tunable consistency |
| Full-text search | Elasticsearch | Inverted index, relevance |
| Data warehouse | BigQuery / Redshift | OLAP, SQL at scale |
| Object storage | S3 / GCS | Cheap, durable, unlimited |

### When to Use What Cache

| Cache Type | Use Case | TTL Strategy |
|-----------|---------|-------------|
| CDN (CloudFront) | Static assets, video | Long (days/weeks) |
| Redis (read-through) | User sessions, hot data | Medium (minutes/hours) |
| Redis (write-through) | Shopping cart, counters | Short (seconds/minutes) |
| Local in-process | Config, feature flags | Very short + refresh |
| Memcached | Simple key-value, horizontal scale | Short |

### When to Use What Queue

| System | Best For | Avoid When |
|--------|---------|-----------|
| Kafka | Event streaming, audit log, replay | Simple task queues |
| SQS | Task queues, decoupling, AWS | Need ordering guarantees |
| RabbitMQ | Complex routing, AMQP | Very high throughput |
| Redis Pub/Sub | Real-time, low latency | Need persistence |

---

## 📊 Capacity Estimation Quick Reference

### Traffic Math

```
1 million DAU
→ 1,000,000 requests/day ÷ 86,400 sec/day ≈ 12 RPS (average)
→ Peak = 3-5x average = 36-60 RPS

100 million DAU  
→ ≈ 1,200 RPS average → 3,600-6,000 RPS peak

1 billion DAU
→ ≈ 12,000 RPS average → 36,000-60,000 RPS peak
```

### Storage Math

```
1 KB  = 1,000 bytes
1 MB  = 1,000 KB
1 GB  = 1,000 MB
1 TB  = 1,000 GB
1 PB  = 1,000 TB

100 million users × 1 KB profile = 100 GB
100 million photos × 2 MB avg = 200 TB
1 billion messages × 100 bytes = 100 GB/day
```

### Server Capacity Rules of Thumb

```
1 web server  → ~1,000-5,000 RPS (app-dependent)
1 DB server   → ~5,000-10,000 QPS (read-heavy)
1 Kafka node  → ~100K-500K msg/sec
1 Redis node  → ~100K-300K ops/sec
1 CDN edge    → millions of requests/sec
```

---

## 🏆 Top 10 Most Asked Problems (FAANG)

| Rank | Problem | Frequency | Companies |
|------|---------|-----------|-----------|
| 1 | Design URL Shortener | ⭐⭐⭐⭐⭐ | All |
| 2 | Design WhatsApp/Chat | ⭐⭐⭐⭐⭐ | Meta, Google, Microsoft |
| 3 | Design Twitter/Feed | ⭐⭐⭐⭐⭐ | Meta, Twitter, LinkedIn |
| 4 | Design YouTube/Netflix | ⭐⭐⭐⭐⭐ | Google, Netflix, Amazon |
| 5 | Design Uber | ⭐⭐⭐⭐ | Uber, Lyft, Google |
| 6 | Design Notification System | ⭐⭐⭐⭐ | All |
| 7 | Design Rate Limiter | ⭐⭐⭐⭐ | All |
| 8 | Design Google Drive | ⭐⭐⭐⭐ | Google, Microsoft, Dropbox |
| 9 | Design Search Engine | ⭐⭐⭐ | Google, Elasticsearch |
| 10 | Design Payment System | ⭐⭐⭐ | Amazon, Stripe, PayPal |

---

## 🔗 Cross-Reference: Concepts by Problem

| Concept | Problems That Use It |
|---------|---------------------|
| Consistent Hashing | Distributed Cache, URL Shortener, Notification |
| WebSockets | WhatsApp, Real-Time Analytics, Notification |
| CDN | YouTube, Netflix, Twitter, Instagram |
| Event Sourcing | Payment, E-Commerce, Audit Logging |
| CQRS | News Feed, Twitter, E-Commerce |
| Bloom Filter | URL Shortener, Search, Distributed Cache |
| Geohashing | Uber, Google Maps, Airbnb Booking |
| Vector Clocks | Messaging, Distributed Systems |
| Saga Pattern | Payment, Booking, E-Commerce |
| Circuit Breaker | All microservice architectures |

---

## 📚 Recommended Study Order

### Week 1 — Foundations
```
Day 1-2 → 01_requirement_gathering + 02_capacity_estimation
Day 3-4 → 03_distributed_systems (CAP, consistency)
Day 5   → 04_database_design (SQL vs NoSQL, sharding)
Day 6   → 05_caching + 06_messaging_systems
Day 7   → 07_load_balancing + 08_reliability
```

### Week 2 — Core Problems
```
Day 8  → URL Shortener + Pastebin (warmup)
Day 9  → Rate Limiter + API Gateway
Day 10 → WhatsApp/Messenger (deep dive)
Day 11 → YouTube/Netflix (media systems)
Day 12 → Twitter/Instagram (social, feed)
Day 13 → Uber + Maps (geo, real-time)
Day 14 → Mock interview (pick 2 problems)
```

### Week 3 — Advanced Problems
```
Day 15 → Google Drive + Dropbox
Day 16 → Notification + Search Engine
Day 17 → News Feed + Recommendation
Day 18 → Payment + E-Commerce
Day 19 → Booking + Real-Time Analytics
Day 20 → Distributed Cache + File System
Day 21 → Mock interview (Staff level)
```

### Week 4 — Staff Level + Review
```
Day 22-24 → Staff Engineer Guide + Production Reality
Day 25-26 → Top 100 Questions review
Day 27-28 → Mock interviews × 2
Day 29    → Weak area revision
Day 30    → Light review + mental prep
```

> See `04_study_plan/01_30_day_study_plan.md` for the complete plan.

---

## ✅ Pre-Interview Checklist

```
□ Can you estimate QPS, storage, bandwidth from scratch?
□ Can you draw a high-level architecture in < 5 minutes?
□ Do you know when to use SQL vs NoSQL?
□ Can you explain CAP theorem with examples?
□ Do you know 3 caching strategies and when to use each?
□ Can you explain consistent hashing?
□ Do you know Kafka vs RabbitMQ vs SQS trade-offs?
□ Can you design a rate limiter from scratch?
□ Do you know how to handle distributed transactions?
□ Can you explain the Saga pattern?
□ Do you know 3 load balancing algorithms?
□ Can you design for 99.99% availability?
□ Do you know how to monitor a distributed system?
□ Can you identify bottlenecks at 1M, 10M, 100M users?
□ Can you discuss build vs buy trade-offs? (Staff level)
```

---

*Last updated: 2025 | Covers Senior + Staff Engineer levels*
*Problems mapped to: Google, Amazon, Meta, Microsoft, Uber, Netflix, Airbnb, Salesforce*
