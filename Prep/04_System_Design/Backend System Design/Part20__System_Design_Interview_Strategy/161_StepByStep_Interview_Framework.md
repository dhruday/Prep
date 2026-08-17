# 161. Step-by-Step Interview Framework

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

A **System Design Interview Framework** is a repeatable, structured approach you follow every single time you face a system design question. Without a framework, candidates wander — they jump into databases before clarifying requirements, or talk about Kafka before drawing a basic diagram.

The framework gives you:
- **Control over the narrative**
- **Signal that you think like a senior engineer**
- **Time to think before committing to an approach**
- **A natural structure that interviewers can follow and probe**

### The 45-Minute Framework (7 Steps)

| Time | Step | Purpose |
|------|------|---------|
| 0–5 min | Clarify requirements | Define scope, avoid wrong assumptions |
| 5–10 min | Capacity & estimation | Justify design decisions with numbers |
| 10–15 min | High-level design | Boxes and arrows — the skeleton |
| 15–25 min | Deep-dive components | Show depth — databases, caching, queues |
| 25–35 min | Scalability & reliability | How it handles 10x, 100x growth |
| 35–40 min | Bottlenecks & trade-offs | Show you think critically |
| 40–45 min | Close & summarize | Leave a sharp final impression |

**Why this framework matters:**
- Interviewers evaluate **process**, not just final answer
- Senior engineers demonstrate **structured thinking under ambiguity**
- The framework buys you thinking time while looking confident

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Step 1: Requirements Clarification (0–5 min)

Ask targeted questions. Never assume. Split into:

**Functional Requirements** — what the system *does*
```
- "Who are the users? Consumers? Internal services?"
- "What are the core features? Prioritize top 3."
- "Read-heavy or write-heavy?"
- "Global system or single region?"
- "Real-time or batch processing?"
```

**Non-Functional Requirements** — how the system *performs*
```
- Availability SLA? 99.9%? 99.99%?
- Latency? p99 < 100ms? p50 < 10ms?
- Consistency? Strong or eventual?
- Scale? DAU? QPS? Data volume?
- Durability? No data loss?
```

**Scope boundaries** — what you are NOT building
```
- "I'll skip auth for now and focus on core flow"
- "I'll treat payments as an external service"
- "Analytics is out of scope for this session"
```

---

### Step 2: Capacity Estimation (5–10 min)

Ground your design in numbers. Avoid designing in a vacuum.

```
DAU: 100M users
Read:Write ratio: 100:1 (read-heavy)
Reads per day: 100M × 10 reads = 1B reads/day
QPS (reads): 1B / 86,400 ≈ 11,600 QPS
Peak QPS (2x): ~23,000 QPS

Storage:
- Tweet = 140 bytes avg
- 1M tweets/day × 365 days × 5 years = ~256GB metadata
- Media: 100KB avg × 100K media uploads/day = 10GB/day

Bandwidth:
- Outbound: 23,000 reads/s × 140B = ~3MB/s
```

These numbers drive:
- Number of application servers
- DB replication topology
- Cache hit rate targets
- CDN requirements

---

### Step 3: High-Level Design (10–15 min)

Draw the skeleton first. Use 5–7 boxes max. Typical flow:

```
Client → CDN → Load Balancer → API Gateway 
       → Application Servers (stateless) 
       → [Cache Layer] → Primary Database
                       → Message Queue → Async Workers
```

At this stage:
- Every component must have a **clear reason to exist**
- No over-engineering — only add what's justified
- Speak while drawing: "The load balancer distributes across N stateless app servers"

---

### Step 4: Component Deep-Dive (15–25 min)

Pick 2–3 critical components and go deep. For each:

1. **What does it store?** What schema?
2. **How does it scale?** Sharding? Replication?
3. **What can go wrong?** Failures, hotspots, thundering herds
4. **What trade-offs did you make?**

Example for a URL shortener:
```
Database: Key-Value store (Redis or Cassandra)
- Key: short_code (6 chars, base62)
- Value: { original_url, user_id, created_at, expiry }
- Why Cassandra: write-heavy, distributed, no joins needed
- Index: short_code → primary key (O(1) lookup)
```

---

### Step 5: Scalability & Reliability (25–35 min)

Show you think beyond the happy path:

```
Scalability:
- Horizontal scaling of stateless app servers (auto-scaling groups)
- Read replicas for DB read offload
- Distributed cache (Redis cluster) to reduce DB pressure
- CDN for static assets and geolocation-based routing

Reliability:
- Circuit breakers on DB and external service calls
- Retry with exponential backoff
- Dead Letter Queues for failed async jobs
- Health checks + automated failover
- Multi-AZ or multi-region deployment for SLA > 99.99%
```

---

### Step 6: Bottlenecks & Trade-offs (35–40 min)

Demonstrate critical thinking:

```
"The hot partition problem: if user IDs 1-1000 are all VIPs, 
one DB shard gets hammered. Solution: consistent hashing with 
virtual nodes or add a celebrity fan-out read cache."

"We chose eventual consistency for the feed. Users may see 
stale data for seconds, but we get better write throughput 
and higher availability — acceptable trade-off for social feeds."
```

---

### Step 7: Close & Summarize (40–45 min)

Wrap up confidently:
```
"To summarize: we designed a globally distributed [system] 
that handles [X QPS]. Key decisions: [database choice] for 
[reason], [cache] to handle read load, [queue] for async 
fan-out. Main trade-off: [consistency vs latency]. 
Given more time, I'd improve [specific area]."
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

Framework calibration by scale:

| Scale | QPS (read) | Storage/year | Suggested DB | Cache |
|-------|-----------|-------------|-------------|-------|
| Startup | < 100 QPS | < 100GB | Single PostgreSQL | Local cache |
| Mid | 1K–10K QPS | 1–10TB | Replicated MySQL/PostgreSQL | Redis single |
| Large | 10K–100K QPS | 10–100TB | Sharded + replicated | Redis cluster |
| FAANG | 1M+ QPS | PB scale | Distributed (Cassandra, Spanner) | Multi-tier cache |

Use these to **justify when you need to add a component**. Never add complexity without a number.

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

Framework component decisions follow this pattern:

```
Is the data relational and transactional?
  YES → PostgreSQL / MySQL
  NO  → Is it a key-value lookup?
          YES → Redis / DynamoDB
          NO  → Is it document data?
                  YES → MongoDB / Firestore
                  NO  → Is it time-series?
                          YES → InfluxDB / TimescaleDB
                          NO  → Is it immutable event log?
                                  YES → Kafka / S3
```

Always justify your choice with:
1. Access patterns
2. Scale requirements
3. Consistency requirements
4. Operational complexity tolerance

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Framework Checklist — Every Design Must Address:

**Stateless services** — can you spin up 10 more instances instantly?

**Data layer scaling** — read replicas → sharding → multi-region

**Cache layer** — what's cached, TTL, invalidation strategy

**Async processing** — what can be moved off the critical path?

**Single points of failure** — every component: what happens if it dies?

**Degraded mode** — if the cache dies, does the system survive (slower)?

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

Always mention in closing:
- **AuthN/AuthZ**: JWT or OAuth2 at the API Gateway
- **Rate limiting**: Token bucket per user/IP
- **Encryption**: TLS in transit, AES-256 at rest
- **Secrets**: Vault or AWS Secrets Manager — never hardcoded

This signals production maturity even if you don't deep-dive.

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### How FAANG engineers follow this framework:

**Twitter Feed (2022)**:
- Clarify: fan-out-on-write vs fan-out-on-read? Hybrid for celebrities
- Estimate: 300M DAU, 500M tweets/day → 5,787 writes/s
- Design: Timeline service + Redis sorted set per user
- Deep dive: Celebrity problem → precomputed vs lazy load

**Uber Dispatch**:
- Clarify: Match accuracy vs speed? Need real-time GPS?
- Estimate: 15M trips/day, 10K GPS updates/second
- Design: Quadtree geospatial index, Kafka for location stream
- Deep dive: Consistent hashing for dispatch workers

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Opening Statement
> "Before jumping in, let me take 5 minutes to clarify requirements and scope. I want to make sure we're solving the right problem. Then I'll estimate capacity, draw a high-level design, and deep dive into the critical components."

### Common Follow-up Questions
1. "Why did you choose Cassandra over MySQL here?"
2. "How does your system behave during a datacenter outage?"
3. "Your cache just went down — walk me through what happens."
4. "How do you handle the celebrity / hot-key problem?"
5. "How would you evolve this to 10x the current scale?"

### Anti-patterns to avoid
- **Jumping to solutions before clarifying** → shows lack of rigor
- **Adding every tech (Kafka + Redis + Cassandra + Elasticsearch)** → over-engineering
- **Ignoring failure scenarios** → shows inexperience with production
- **Never asking for feedback** → missed collaboration signal

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### Standard High-Level Architecture Template

```
┌──────────┐     ┌─────┐     ┌─────────────────┐
│  Client  │────▶│ CDN │────▶│  Load Balancer  │
└──────────┘     └─────┘     └────────┬────────┘
                                       │
                              ┌────────┴────────┐
                              │  API Gateway    │
                              │  (Auth, Rate    │
                              │   Limiting)     │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
             ┌──────┴──────┐  ┌───────┴──────┐  ┌────────┴─────┐
             │  Service A  │  │  Service B   │  │  Service C   │
             └──────┬──────┘  └──────┬───────┘  └──────┬───────┘
                    │                │                  │
             ┌──────┴──────┐  ┌──────┴───────┐  ┌──────┴───────┐
             │  Cache      │  │  Message     │  │  Database    │
             │  (Redis)    │  │  Queue       │  │  (Primary)   │
             └─────────────┘  │  (Kafka)     │  └──────┬───────┘
                              └──────────────┘         │
                                                ┌───────┴──────┐
                                                │  Read        │
                                                │  Replicas    │
                                                └──────────────┘
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

**Why the framework matters:**
- System design interviews are **open-ended by design** — the framework creates structure
- Interviewers at FAANG are trained to look for **process signals**, not memorized answers
- A consistent framework lets you stay calm under pressure and cover all dimensions

**How it works:**
1. Clarify → correct problem, right scope
2. Estimate → numbers drive decisions
3. Sketch → alignment before depth
4. Deep-dive → show senior engineering judgment
5. Scale → show operational maturity
6. Trade-offs → show critical thinking
7. Close → leave a strong final memory

**Key trade-offs to remember:**
- Breadth (cover all components) vs Depth (show mastery) → balance with time
- Perfect design vs pragmatic design → always choose pragmatic with stated reasons
- Adding features vs keeping it simple → YAGNI in design interviews too

---

## 🎯 FAANG Expectation

Senior engineers own the interview narrative. You guide the interviewer through your thinking, not the other way around.

> "I'm going to start by clarifying requirements, then estimate scale, sketch the architecture, and deep dive into the areas you care most about. Does that work?"
