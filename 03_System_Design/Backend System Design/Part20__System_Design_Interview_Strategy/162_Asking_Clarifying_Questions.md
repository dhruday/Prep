# 162. Asking Clarifying Questions

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Asking clarifying questions** is the single most important skill in a system design interview. It signals that you think like a senior engineer who understands that **requirements define architecture** — you cannot design the right system without knowing what problem you are solving.

Interviewers intentionally leave questions vague. "Design Twitter." "Design a notification system." These are purposely ambiguous. They want to see:
1. Can you identify the right questions to ask?
2. Can you scope down to something buildable in 45 minutes?
3. Do you think in terms of users, scale, and constraints — not just code?

A senior engineer who jumps straight into "I'll use Kafka and Cassandra" before asking a single question is a red flag — it suggests they pattern-match instead of think.

### Why Clarifying Questions Matter
- **Functional scope**: Without it, you design the wrong features
- **Scale assumptions**: A system for 1,000 users is architecturally different from one for 1 billion
- **Consistency requirements**: Eventual vs strong consistency changes everything
- **Read/write patterns**: A read-heavy vs write-heavy system has different bottlenecks
- **Latency SLAs**: p99 < 100ms forces very different caching strategies than p99 < 2s

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### The 5-Category Framework for Clarifying Questions

Always structure your questions across these 5 dimensions:

---

#### Category 1: Users & Use Cases

```
Who are the primary users?
  → Consumers (end-users), Internal teams, Other services?

What are they *trying to accomplish*?
  → "Send a message" vs "broadcast to 1M followers" — completely different systems

What are the top 3 features we must support?
  → Force prioritization — you can't build everything in 45 min

Are there different user roles or permissions?
  → Determines AuthN/AuthZ complexity
```

**Example — "Design a chat system":**
```
Q: "Is this 1:1 chat or group chat?"
Q: "Do we need message history or just real-time delivery?"
Q: "Is this consumer-facing (WhatsApp) or internal enterprise (Slack)?"
Q: "Do we need file sharing, or text-only for now?"
```

Each answer completely changes the architecture.

---

#### Category 2: Scale & Traffic

```
How many daily active users (DAU)?
  → 10K vs 10M vs 1B → each order of magnitude changes the design

What is the read:write ratio?
  → Social feed: 100:1 read-heavy → optimize for reads
  → Logging system: 1:100 write-heavy → optimize for writes

What is the expected QPS at peak?
  → Justifies caching, database replicas, autoscaling groups

Is there a geographic distribution?
  → Single region vs multi-region determines CDN, data residency, replication
```

**Back-of-envelope trigger:**
```
If DAU > 10M → you need horizontal scaling
If QPS > 10K reads → you need a distributed cache
If QPS > 1K writes → you need connection pooling or write buffering
If data > 1TB → you need sharding or blob storage
```

---

#### Category 3: Non-Functional Requirements

```
What is the availability SLA?
  → 99.9% = ~8.76 hours downtime/year (acceptable for many systems)
  → 99.99% = ~52 minutes/year (requires multi-AZ + health checks)
  → 99.999% = ~5 minutes/year (requires active-active multi-region)

What latency is acceptable?
  → Real-time feed: p99 < 200ms
  → Payment processing: p99 < 500ms
  → Analytics dashboard: p99 < 2s
  → Batch report: minutes acceptable

What is the consistency requirement?
  → User sees their own post immediately → Read-after-write consistency needed
  → Feed can lag 1-2 seconds → Eventual consistency acceptable
  → Payments, inventory → Strong consistency required

What is the durability requirement?
  → Can we lose messages? (lose notifications = low cost)
  → Can we lose transactions? (lose payment = catastrophic)
```

---

#### Category 4: Data Characteristics

```
What is the shape of the data?
  → Structured (relational) vs semi-structured (JSON) vs unstructured (files)

What is the data retention policy?
  → 7 days? 1 year? Forever? → Affects storage cost and archival strategy

Is data mutable or immutable?
  → Append-only audit logs → Kafka/Cassandra
  → User profiles (update often) → Relational DB with row locking

Are there compliance or regulatory constraints?
  → GDPR: requires data deletion capability and EU data residency
  → HIPAA: requires encryption at rest and audit trails
  → PCI DSS: no raw card numbers stored
```

---

#### Category 5: Operational Constraints

```
What is the team size / operational complexity tolerance?
  → 2-person startup: Kubernetes is overkill
  → 500-person org: abstraction and isolation critical

Is there an existing system being replaced?
  → Migration strategy required → backward compatibility matters

What's the deployment model?
  → On-prem, cloud (AWS/GCP/Azure), hybrid?

Are there cost constraints?
  → A perfectly optimal but expensive design may not be acceptable
```

---

### How to Ask Without Wasting Time

**Wrong approach (scattered, low signal):**
> "Um, should we support mobile? What about payments? Is this real-time? Do we need search?"

**Right approach (organized, high signal):**
> "I have a few questions across a couple of dimensions. On requirements: are we building 1:1 chat or group chat, and do we need message persistence? On scale: roughly how many DAU, and is this global or single-region? On SLA: what's the availability target and max acceptable delivery latency?"

Bundle questions by category. Take 2 minutes max. Don't turn it into an interrogation.

---

### Questions to ALWAYS Ask

No matter the system, always clarify:

| Question | Why It Matters |
|----------|----------------|
| DAU / Scale | Drives DB, cache, server count |
| Read:Write ratio | Drives replication and indexing strategy |
| Availability SLA | Drives redundancy and multi-region needs |
| Consistency requirement | Drives DB choice and replication model |
| Top 3 features | Scopes the 45-minute design |

---

### Questions to NEVER Ask (Red Flags)

```
❌ "What programming language should I use?" → irrelevant to system design
❌ "Should we use AWS or GCP?" → premature, not the core concern
❌ "Do you want me to write code?" → wrong format for HLD interview
❌ Too many questions (>10) → shows inability to prioritize
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

Clarifying questions feed directly into capacity estimation. The chain is:

```
DAU (from clarification)
  → Daily requests = DAU × requests per user per day
  → QPS = daily requests / 86,400
  → Peak QPS = QPS × 2–3x peak multiplier
  → Storage = records per day × record size × retention period
  → Bandwidth = QPS × avg response size
```

**Example — notification system:**
```
Clarified: 50M DAU, avg 5 notifications/user/day, 1 year retention

QPS (send) = 50M × 5 / 86,400 ≈ 2,900 writes/s
Peak QPS (sends) ≈ 8,700 writes/s (3x)

Storage:
- Notification: 500 bytes avg
- Records/day: 250M
- Yearly: 250M × 500B × 365 ≈ 45TB
```

These numbers immediately tell you: "I need a partitioned write path (Kafka), a distributed DB (Cassandra), and a CDN for push delivery."

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

Clarifying questions determine storage choices:

| Clarification | Storage Implication |
|---------------|---------------------|
| "Users can delete their data (GDPR)" | Need soft-delete or deletion pipeline; Kafka retention policy |
| "Messages must never be lost" | Durability = synchronous replication, Kafka min.insync.replicas = 2 |
| "Profile pics up to 10MB" | Blob storage (S3), not DB. Store URL reference in DB |
| "Search across message history" | Secondary index or Elasticsearch needed |
| "Analytics on user behavior" | Event stream to data warehouse (Redshift, BigQuery) |

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

Clarifications that affect reliability:

```
"99.99% availability" → Multi-AZ primary DB + read replicas + circuit breakers
"Real-time delivery < 100ms" → No synchronous cross-datacenter calls allowed
"Global users" → CDN + geo-routing + data sovereignty awareness
"Peak at midnight (batch jobs)" → Auto-scaling groups, pre-warming caches
"External payment provider" → Bulkhead pattern: payment failure ≠ order failure
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

Security clarifications to always raise:
```
Q: "Does the system handle PII (Personally Identifiable Information)?"
  → YES → GDPR / CCPA compliance, data masking in logs, audit trail

Q: "Any compliance requirements (HIPAA, PCI-DSS, SOC2)?"
  → YES → Encryption at rest, access logs, data classification

Q: "Multi-tenant or single-tenant?"
  → Multi-tenant → tenant isolation, row-level security, rate limiting per tenant
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### "Design WhatsApp" — Clarifying Questions in Practice

```
Me: "Before designing, a few quick clarifications:
  1. Features: 1:1 messaging? Group chats? Max group size? File sharing?
  2. Scale: How many DAU? I'll assume 2B (WhatsApp-scale) unless told otherwise.
  3. Delivery: Should messages be delivered offline (store & forward)?
  4. History: Persistent message history or ephemeral?
  5. Consistency: Is it okay for a user to see messages out of order for a few ms?
  6. SLA: Target 99.99% uptime?"

Interviewer: "1:1 and groups up to 256. 500M DAU. Yes store-and-forward. 
             Persistent history 2 years. Slight ordering lag OK. 99.99%."
```

Now you know:
- Need a message store (Cassandra, partitioned by conversation_id)
- Need an offline queue (per-recipient queue)
- Need fan-out for group messages (async workers)
- Need multi-AZ deployment for 99.99%
- Need a 2-year retention policy + cold storage tier

None of this was possible without asking.

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Opening
> "Great, before I jump into the design, I'd like to clarify a few things to make sure I'm solving the right problem. On requirements: [ask top 3 functional questions]. On scale: [ask DAU, QPS, read/write ratio]. On SLA: [ask availability and latency targets]. Does that give us enough to proceed?"

### Common Follow-up Questions After Clarification
1. "Why did you ask about consistency — does it really matter here?"
2. "What if the DAU was 10x what you assumed — would your design change?"
3. "You assumed eventual consistency for the feed. What's the downside?"
4. "What if we added a compliance requirement (e.g., GDPR)?"

### Red Flags Interviewers Watch For
- Asking 15 questions → can't prioritize
- Asking zero questions → overconfident or inexperienced
- Only asking about tech stack → misses business/product thinking
- Ignoring answers → wastes the whole clarification step

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### Clarification → Architecture Decision Flow

```
CLARIFICATION               ARCHITECTURE IMPACT
─────────────────────────────────────────────────────────────
DAU = 500M            ──▶  Cassandra (not single MySQL)
Read:Write = 100:1    ──▶  Add Redis read cache
Availability = 99.99% ──▶  Multi-AZ, circuit breakers
Consistency = eventual ──▶  Async fan-out, accept lag
Data size > 10MB      ──▶  S3 for files, DB for metadata
Compliance = GDPR     ──▶  Soft-delete, data residency
Real-time req. < 100ms ──▶  WebSocket or SSE, no polling
```

Every clarification maps to a concrete architectural choice. Interviewers want to see this chain of reasoning.

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

**Why it matters:**
- Wrong assumptions lead to a beautifully designed wrong system
- Asking questions is a seniority signal — junior engineers guess, senior engineers ask
- Interviewers often steer the conversation through answers — use that information

**How it works:**
1. Ask functional questions → scope the features
2. Ask scale questions → drive capacity planning
3. Ask SLA questions → drive reliability decisions
4. Ask data questions → drive storage choices
5. State assumptions explicitly → recover from wrong guesses gracefully

**Key trade-offs:**
- Too few questions → wrong design
- Too many questions → runs over time, signals analysis paralysis
- Target: 5–8 high-signal questions in under 5 minutes

---

## 🎯 FAANG Expectation

> "A candidate who asks no questions is designing in the dark. A candidate who asks the right 5 questions in 3 minutes is showing senior-level engineering judgment."
