# Foundation 01 — Requirement Gathering & Clarification

> The #1 mistake candidates make: jumping into design before clarifying requirements.
> A senior engineer ALWAYS spends the first 5 minutes asking the right questions.

---

## Why Requirements Matter

Interviewers intentionally give vague prompts like *"Design Twitter"* or *"Design a URL shortener"* to see if you:
1. Gather requirements before designing
2. Make assumptions explicit
3. Scope the problem appropriately
4. Prioritize the right features

A URL shortener for 1,000 startups vs. one handling 1 billion redirects per day are completely different systems.

---

## The Universal Clarification Question Bank

### 1. Scale & Traffic

```
□ How many daily active users (DAU) do we expect?
□ How many monthly active users (MAU)?
□ What is the expected read/write ratio?
□ What is the peak traffic vs. average traffic ratio?
□ Is growth expected to be gradual or sudden (viral)?
□ What geographies will we serve? Global or regional?
□ Is the traffic pattern predictable or bursty?
```

### 2. Functional Scope

```
□ What are the core features we MUST build for v1?
□ What features are explicitly OUT of scope?
□ Are there any mobile-specific requirements?
□ Do we need an API for third-party integrations?
□ Is there an admin/internal dashboard needed?
□ Do we need analytics or reporting?
```

### 3. Data & Storage

```
□ What types of data will we store? (text, images, video, etc.)
□ What is the expected data size per record/object?
□ How long do we need to retain data?
□ Do we have any archiving or deletion requirements?
□ Are there data residency requirements (GDPR, etc.)?
□ Do we need full-text search on data?
```

### 4. Performance & SLA

```
□ What is the acceptable read latency? (p50, p99)
□ What is the acceptable write latency?
□ What availability do we need? (99.9%, 99.99%?)
□ What are the consequences of downtime?
□ Is this a real-time system or can it tolerate delays?
□ Do we need strong or eventual consistency?
```

### 5. Consistency & Reliability

```
□ How important is data consistency vs. availability?
□ Can we tolerate data loss under any failure scenario?
□ What is the acceptable RPO (Recovery Point Objective)?
□ What is the acceptable RTO (Recovery Time Objective)?
□ Do we need cross-region replication?
□ What happens if a component is temporarily unavailable?
```

### 6. Security & Compliance

```
□ Is user authentication required?
□ What authorization model? (RBAC, ABAC?)
□ Are we handling PII or sensitive data?
□ What compliance standards apply? (GDPR, HIPAA, SOC2?)
□ Do we need end-to-end encryption?
□ Are there rate limiting requirements?
□ Do we need an audit log?
```

### 7. Cost & Infrastructure

```
□ Is there a preference for cloud provider (AWS/GCP/Azure)?
□ Is there a cost budget we need to design around?
□ Do we have an existing infrastructure to integrate with?
□ Build vs. buy: can we use managed services or build from scratch?
□ What is the team size that will maintain this?
```

---

## Requirements Framework: FURPS+

Use this framework to structure requirements:

| Category | Meaning | Example |
|----------|---------|---------|
| **F**unctionality | What the system does | Shorten URLs, track clicks |
| **U**sability | User experience | API response < 100ms |
| **R**eliability | Uptime, fault tolerance | 99.99% availability |
| **P**erformance | Speed, throughput | 10K QPS peak |
| **S**calability | Growth handling | 10x growth in 1 year |
| **+** Security | Auth, encryption | JWT + HTTPS |
| **+** Constraints | Compliance, budget | GDPR, no Oracle DB |

---

## Requirement Categories Explained

### Functional Requirements (FR)

What the system **must do**. These are features.

**Examples for Twitter:**
- Users can post tweets (max 280 chars)
- Users can follow other users
- Users can see a feed of tweets from people they follow
- Users can like, retweet, and reply
- Users can search for tweets/users

### Non-Functional Requirements (NFR)

How the system **must perform**. These are quality attributes.

**Examples for Twitter:**
- System handles 100M DAU
- Tweet delivery latency < 300ms (p99)
- System availability 99.99% (< 52 minutes downtime/year)
- Tweets are eventually consistent (not all followers see simultaneously)
- System must scale to 10x current load within 6 months

### Extended Requirements

Nice-to-haves and future considerations:

**Examples for Twitter:**
- Analytics dashboard for tweet performance
- Trending topics algorithm
- Advanced search with filters
- A/B testing framework for feed algorithm
- Content moderation at scale

---

## Availability Math — What Does 99.9% Really Mean?

| Availability | Downtime/Year | Downtime/Month | Downtime/Day |
|-------------|--------------|---------------|-------------|
| 90% | 36.5 days | 72 hours | 2.4 hours |
| 99% | 3.65 days | 7.3 hours | 14.4 min |
| 99.9% | 8.77 hours | 43.8 min | 1.44 min |
| 99.99% | 52.6 min | 4.38 min | 8.6 sec |
| 99.999% | 5.26 min | 26.3 sec | 0.87 sec |
| 99.9999% | 31.5 sec | 2.63 sec | 0.08 sec |

> **Interview tip:** When someone says "99.99% availability", ask what that means in minutes of downtime per month. It shows depth.

---

## Consistency Models — Know These Cold

### Strong Consistency
Every read returns the most recent write.
- **Use when:** Financial transactions, inventory management
- **Cost:** Higher latency, lower availability

### Eventual Consistency
Given no new updates, all replicas converge to the same value.
- **Use when:** Social media likes, shopping carts, DNS
- **Cost:** Temporary stale reads

### Causal Consistency
If A causes B, everyone sees A before B.
- **Use when:** Comment threads, collaborative documents
- **Cost:** More complex implementation

### Read-Your-Writes Consistency
A user always sees their own writes.
- **Use when:** Profile updates, user settings
- **Cost:** Must route to primary or wait for replication

---

## SLA Template

Document this clearly during interviews:

```
System: [Name]
─────────────────────────────────────────
Availability:   99.99% (52 min downtime/year)
Read Latency:   < 100ms (p50), < 300ms (p99)
Write Latency:  < 200ms (p50), < 500ms (p99)
Throughput:     10,000 RPS sustained
               30,000 RPS peak (3x burst)
Data Durability: 99.999999999% (11 nines)
RPO:            < 1 hour
RTO:            < 30 minutes
─────────────────────────────────────────
```

---

## Problem-Specific Requirement Cheat Sheets

### For Chat Systems (WhatsApp, Slack)
```
□ One-on-one vs. group chat?
□ Max group size?
□ Message delivery guarantees? (at-least-once, exactly-once)
□ Message ordering guarantees?
□ Offline message delivery?
□ Read receipts required?
□ End-to-end encryption?
□ Message retention period?
□ File/media sharing?
□ Search within messages?
```

### For Feed Systems (Twitter, Instagram)
```
□ Chronological or algorithmic feed?
□ What's the fan-out model? (push vs. pull vs. hybrid)
□ How many followers can one user have?
□ How far back does the feed go?
□ Real-time updates or on-refresh?
□ Support for ads in feed?
□ Search across content?
```

### For Storage Systems (Drive, Dropbox)
```
□ What file types and sizes?
□ Max file size per upload?
□ Version history? How many versions?
□ Folder hierarchy depth limit?
□ Sharing and collaboration model?
□ Offline sync support?
□ Conflict resolution strategy?
□ Deduplication?
```

### For Payment Systems
```
□ What currencies?
□ What payment methods? (card, wallet, bank transfer)
□ Idempotency requirements?
□ Refund/chargeback flows?
□ Fraud detection?
□ PCI-DSS compliance?
□ Regulatory markets? (US, EU, India, etc.)
□ Settlement timing?
```

### For Video Platforms (YouTube, Netflix)
```
□ Upload flow vs. streaming focus?
□ Supported video resolutions?
□ Adaptive bitrate streaming?
□ Content moderation?
□ DRM requirements?
□ Live streaming needed?
□ Comments, likes, recommendations?
□ Offline download support?
```

---

## Red Flags in Requirement Gathering

### What Interviewers Watch For

❌ **Jumping to design immediately** — "Let me start with a database..."
❌ **Not asking about scale** — Designing for 1M users when the answer is 1B
❌ **Assuming strong consistency** — When eventual is fine (and cheaper)
❌ **Gold-plating** — Designing every feature when only core matters
❌ **Not making trade-offs explicit** — "We'll do X" without explaining why

✅ **What good looks like:**
```
Candidate: "Before I start designing, I'd like to ask a few questions.
           First, what's the expected scale — DAU?
           
Interviewer: About 10 million DAU.

Candidate: Got it. What's the read/write ratio? My guess would be 
           heavily read-heavy for this use case?
           
Interviewer: Yes, about 100:1 reads to writes.

Candidate: Perfect. One more — consistency requirements. 
           For this feature, can we tolerate eventual consistency 
           (users might see stale data for a few seconds), 
           or do we need strong consistency?
           
Interviewer: Eventual is fine.

Candidate: Great. And availability — do we need 99.99% or is 99.9% 
           acceptable?
           
Interviewer: 99.99%.

Candidate: Okay. Let me now summarize requirements and then 
           start the design..."
```

---

## Making Assumptions Explicit

When you can't get an answer, state your assumption clearly:

> "I'll assume 100M DAU since we're designing a system similar to Twitter's scale. 
> I'll also assume the read/write ratio is 10:1. Please correct me if these 
> assumptions are wrong and I'll adjust the design accordingly."

This shows:
- You understand the importance of scale
- You can make reasonable inferences
- You're flexible and collaborative

---

## Requirement Gathering Scorecard

| Skill | Novice | Mid-Level | Senior | Staff |
|-------|--------|-----------|--------|-------|
| Questions asked | 0-2 | 3-5 | 5-8 | 8+ structured |
| Scope definition | Vague | Partial | Clear | Crystal clear |
| NFRs captured | None | 1-2 | 3-5 | Complete |
| Consistency | Not asked | Asked | Asked + justified | Proactively addresses |
| Trade-offs | None | Some | Clear | Proactively raises |

---

*Next: `02_capacity_estimation.md`*
