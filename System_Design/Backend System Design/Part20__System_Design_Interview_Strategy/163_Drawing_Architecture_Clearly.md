# 163. Drawing Architecture Clearly

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Drawing architecture clearly** is the visual communication skill that separates good system design candidates from great ones. In a 45-minute interview, your diagram is your primary artifact. It must convey structure, data flow, component responsibilities, and scale — all at a glance.

A good architecture diagram is not art. It is **precise communication**. Every box, arrow, and label must have a reason to exist. Messy or cluttered diagrams signal unclear thinking. Clean, well-labeled diagrams signal senior-level clarity.

### Why Architecture Drawing Matters
- The interviewer is following **your diagram while you speak** — misalignment breaks rapport
- A clear diagram lets interviewers ask better deep-dive questions
- White-boarding is a collaborative skill — in the real world, you draw for your team
- Interviewers evaluate: "Would I trust this person to design systems for our team?"

### Core Principles
1. **Start simple, then add complexity** — sketch skeleton, then layer in details
2. **Label everything** — every box, every arrow, every data store
3. **Show data flow direction** — arrows must be unambiguous
4. **Group related components** — use boundaries (dashed boxes) for services/tiers
5. **No more than 7 top-level components** — cognitive load principle

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### The Layered Drawing Approach

Don't draw everything at once. Use a top-down progressive disclosure:

**Layer 1: Skeleton (first 2 minutes)**
```
Draw the 5 core boxes and connections before filling in anything:

Client → Load Balancer → App Server → Database
                                    → Cache
```

Say aloud: *"Starting with the high-level flow: client hits our load balancer, which routes to stateless application servers that read from our primary database and a caching layer."*

**Layer 2: Expand key components (next 5 minutes)**
```
Add:
- Multiple app server instances (with count: "N servers, auto-scaled")
- Read replica for DB
- CDN before load balancer
- Message queue for async work
```

**Layer 3: Go deeper on critical path (remaining time)**
```
Add:
- Cache cluster (Redis with replication)
- DB sharding topology (if relevant)
- Message queue partitions
- Async worker pool
```

---

### What to Label

Every component needs a label. Include:

| Component Type | Label Example |
|----------------|---------------|
| External entry | "Client (Web/Mobile)" |
| CDN | "CDN (CloudFront) — static assets + edge caching" |
| Load balancer | "L7 Load Balancer (Round Robin)" |
| Application server | "API Server (stateless, N instances)" |
| Cache | "Redis Cluster (read cache, TTL=5min)" |
| Primary DB | "Primary DB (PostgreSQL, writes only)" |
| Read replicas | "Read Replicas (×3, async replication)" |
| Queue | "Kafka (topic: notifications, 12 partitions)" |
| Workers | "Consumer Workers (fan-out, async)" |
| Object storage | "S3 (media files, user uploads)" |

**Arrow labels** (often forgotten, always impactful):
```
Client ──[HTTPS REST]-→ Load Balancer
Load Balancer ──[HTTP/2]-→ API Server
API Server ──[GET cache_miss]-→ Redis
API Server ──[SQL query]-→ Primary DB
Primary DB ──[async replication]-→ Read Replica
API Server ──[produce event]-→ Kafka
Worker ──[consume + process]-→ Kafka
```

---

### Standard Architecture Layouts (Templates to Memorize)

#### Template 1: Standard Web System

```
                    ┌──────────────────────────────────────────┐
                    │            Client (Web/Mobile)           │
                    └──────────────────┬───────────────────────┘
                                       │ HTTPS
                    ┌──────────────────▼───────────────────────┐
                    │         CDN (CloudFront)                  │
                    │    Static assets, edge cache             │
                    └──────────────────┬───────────────────────┘
                                       │
                    ┌──────────────────▼───────────────────────┐
                    │       Load Balancer (Layer 7)            │
                    └────┬──────────┬──────────┬───────────────┘
                         │          │          │
              ┌──────────▼─┐  ┌─────▼──────┐  ┌▼───────────────┐
              │ API Server │  │ API Server │  │   API Server   │
              │   (inst.1) │  │  (inst.2)  │  │   (inst.N)    │
              └──────┬─────┘  └────┬───────┘  └──────┬─────────┘
                     │              │                 │
              ┌──────▼──────────────▼─────────────────▼─────────┐
              │              Redis Cluster                       │
              │        (distributed cache, TTL-based)           │
              └──────────────────────┬───────────────────────────┘
                                     │ cache miss
              ┌──────────────────────▼───────────────────────────┐
              │          Primary DB (PostgreSQL)                  │
              │              (writes only)                       │
              └───────────────────────┬──────────────────────────┘
                                      │ async replication
              ┌───────────────────────▼──────────────────────────┐
              │         Read Replicas (×3)                        │
              │              (reads only)                        │
              └──────────────────────────────────────────────────┘
```

---

#### Template 2: Event-Driven / Async System

```
Client ──▶ API Server ──▶ Kafka (topic: events)
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
            ┌───────▼──────┐ ┌──────▼─────┐ ┌──────▼──────┐
            │ Notification │ │  Analytics │ │   Email     │
            │   Worker     │ │   Worker   │ │   Worker    │
            └───────┬──────┘ └──────┬─────┘ └──────┬──────┘
                    │               │               │
             Push/SMS DB     Data Warehouse     SMTP Service
```

---

#### Template 3: Read-Heavy with Cache

```
Client 
  └──▶ Load Balancer
         └──▶ Application Server
                ├──▶ Redis Cache (L1: hot data, TTL=60s)
                │       └── HIT: return immediately
                │       └── MISS: query DB, populate cache
                └──▶ Primary DB
                        └──▶ Read Replica ×3 (for read fan-out)
```

---

### Common Drawing Mistakes to Avoid

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| Single database blob | Doesn't show read/write split | Separate primary + replicas |
| Unlabeled arrows | Interviewer can't follow data flow | Label every arrow |
| All components at same level | No hierarchy visible | Group by tier / service boundary |
| Kafka without consumers | Incomplete flow | Always show producers AND consumers |
| No numbers on components | Misses scale signal | Add "N instances", "3 shards", "×5 replicas" |
| Drawing schema before boxes | Wrong order | Boxes first, schema during deep-dive |

---

### Notation Conventions

Use consistent notation throughout:
```
┌───────────┐   = Application service / container
│  Service  │
└───────────┘

╔═══════════╗   = External system or third party
║  Payment  ║
║ Provider  ║
╚═══════════╝

┌- - - - - -┐   = Group/boundary (microservice cluster, VPC, etc.)
│  Service  │
├ - - - - -┤
│  layer    │
└ - - - - -┘

──▶             = Synchronous call / request
- -▶            = Asynchronous message / event
═══▶            = Replication flow
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

Your diagram component count should be proportional to scale:

| Scale | Diagram Complexity |
|-------|-------------------|
| < 10K QPS | LB → 2-3 servers → single DB. No need for sharding. |
| 10K–100K QPS | Add read replicas, Redis cache, CDN |
| 100K–1M QPS | Add DB sharding, Kafka for async, multiple cache layers |
| 1M+ QPS | Multi-region topology, global load balancing, separate read/write services |

Don't add Kafka or sharding unless your numbers justify it. The diagram must match the scale you estimated.

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

Represent the storage tier clearly:

```
┌────────────────────────────────────┐
│            Storage Tier            │
│                                    │
│  ┌──────────┐   ┌──────────────┐   │
│  │  Redis   │   │  PostgreSQL  │   │
│  │  Cache   │   │  (Primary)   │   │
│  │ (hot)    │   │              │   │
│  └──────────┘   └──────┬───────┘   │
│                        │           │
│               ┌────────┴────────┐  │
│               │ Read Replicas ×3│  │
│               └─────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  S3 (media, files, backups)  │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

Show:
- Separation of hot/warm/cold data
- Read vs write path
- Object storage for blobs (never in DB)
- Archive tier if data retention > 1 year

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

Scale signals to embed in the diagram:

**Redundancy signals:**
```
"Load Balancer (active-standby)" — not a single LB
"Primary DB + 2 replicas (synchronous)" — not single DB
"3 availability zones" — call this out with a dashed boundary
"Redis cluster (3 masters, 3 replicas)" — not single Redis
```

**Failure containment signals:**
```
Show:
- Health check endpoints on each service box
- Circuit breaker between service and its dependency
- Dead Letter Queue (DLQ) next to any Kafka consumer
- Retry annotations on synchronous calls
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

Add these security components to your diagram without over-explaining:

```
Client ──[TLS/HTTPS]──▶ CDN
CDN ──[Private VPC]──▶ API Gateway (JWT validation, rate limiting)
API Gateway ──▶ Services (mTLS between services)
Services ──▶ DB (encrypted at rest, IAM-based access)
Secrets ──▶ AWS Secrets Manager (not environment variables)
```

A single label like "Auth: JWT at API Gateway" on the diagram is worth more than 5 minutes of verbal explanation.

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### How Netflix draws their architecture

Netflix publicly documents their architecture. Key drawing principles from their engineering blog:
- Every service is drawn as an independent box — even if it communicates heavily
- Kafka is shown with explicit topic labels and partition counts
- Data flows are shown with both happy path and error path (DLQ)
- Cassandra clusters show the replication factor explicitly

### What Amazon's system design onboarding teaches

Amazon team onboarding materials (publicly known) emphasize:
- Start with the data flow, not the services
- Every arrow means "I'm making a network call" — think about its failure mode
- The diagram must survive the question: "What happens if this box disappears?"

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Statement When Drawing
> "Let me sketch the high-level architecture first, then we can deep-dive into specific components. I'll start with the request path and add supporting infrastructure as we go."

### Common Follow-up Questions About the Diagram
1. "Walk me through what happens when a user submits a request end to end"
2. "What happens if the primary database goes down?"
3. "Why do you have the cache before the database — why not after?"
4. "Your diagram shows N app servers — how many exactly? How do you scale that?"
5. "I don't see a CDN — was that intentional?"

### Interview Tips
- **Talk while drawing** — silence for 2 minutes loses the interviewer
- **Say "I'm simplifying X for now"** — shows awareness of what you're skipping
- **Point to components as you explain** — "traffic comes in here, hits this layer, flows to this"
- **Ask for feedback after sketching** — "Does this match what you have in mind before I go deeper?"

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### The "5-Box" Starting Skeleton (Memorize This)

```
Every system design starts with these 5 foundations.
Add specialization on top.

  ┌─────────┐     ┌──────────────┐     ┌───────────────┐
  │ Client  │────▶│ Load Balancer│────▶│  App Server   │
  └─────────┘     └──────────────┘     └───────┬───────┘
                                               │
                                    ┌──────────┴──────────┐
                                    │                     │
                             ┌──────▼──────┐     ┌────────▼──────┐
                             │    Cache    │     │   Database    │
                             │   (Redis)   │     │ (PostgreSQL)  │
                             └─────────────┘     └───────────────┘
```

Add each component only when you have a reason:
- CDN: when you have static assets or geographically distributed users
- Kafka: when you need async processing or decoupling services
- Sharding: when you need to scale writes beyond a single DB
- Read replicas: when you need to scale reads beyond the primary

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

**Why it matters:**
- Your diagram is the record of your thinking — interviewers refer back to it throughout
- Clear diagrams enable better conversations — interviewer can challenge specific components
- Messy diagrams force interviewers to ask "wait, what is this box?" — losing valuable time

**How it works:**
1. Start with the 5-box skeleton
2. Label every box and every arrow
3. Add complexity layer by layer, not all at once
4. Use numbers (3 replicas, N servers, 12 partitions) to signal scale awareness
5. Group components into boundaries (VPC, service tier, storage tier)

**Key trade-offs to remember:**
- More components = more realism but less clarity in 45 minutes
- Always optimize for **communication over completeness** in a whiteboard session
- A clean 7-component diagram with clear labels beats a 20-component mess every time
