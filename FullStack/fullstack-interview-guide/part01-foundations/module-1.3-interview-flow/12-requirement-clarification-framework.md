# Requirement Clarification Framework
> Part 1 — Full Stack Mindset & Interview Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- The framework has 4 parts: Scope → Scale → Constraints → Confirm assumptions.
- Ask Scope questions first: "What are the 3–4 core features? What's explicitly NOT in scope?"
- Ask Scale questions second: "How many users? QPS? Read/write ratio? Data retention?"
- Ask Constraint questions third: "Latency SLA? Availability target? Consistency model? Any compliance needs?"
- Always end with: "Based on what you've told me, here are my assumptions. Does that match?"
- This is a 🔥 high-frequency framework — practice it until it flows naturally, not as a rehearsed list.

---

## 1. One-Line Definition
The requirement clarification framework is a structured set of questions you ask in the first 5 minutes of a system design interview to remove ambiguity about scope, scale, and constraints before designing anything.

---

## 2. The Problem It Solves

Most engineers have experienced the pain of building the wrong thing. A developer spends a week building a feature based on an assumed requirement. The product manager says: "I never said it needed to work that way." The week is lost.

System design interviews replicate this real-world scenario exactly. The interviewer gives you a vague problem like "design a messaging system" knowing it can mean a 10-user internal Slack clone or a WhatsApp alternative for 2 billion users. The architecture is completely different.

Without a clarification framework, you're guessing. With one, you spend 5 focused minutes extracting the information that changes everything — and then you design exactly the right system.

The framework also signals something to the interviewer before you've drawn a single box: this candidate gathers requirements before building. That's a professional signal. That's what senior engineers do.

---

## 3. How It Works Internally

### The Mental Model
The requirement clarification framework is like a pre-flight checklist for pilots. The pilot doesn't invent new checks every time — they follow the same list in the same order. The list exists because skipping even one item has historically caused problems. The framework for system design interviews works the same way — same questions, same order, every time. It becomes automatic.

### The Mechanism — The Full Framework

**PHASE 1 — FUNCTIONAL SCOPE (2 minutes)**

Core features:
- "What are the 3–4 core features you want me to design? Not the full product — just the minimum for this interview."
- Follow-up: "Should I include [obvious related feature]? Or is that out of scope?"

Explicit out-of-scope:
- "What should I NOT design? I want to make sure I focus on the right parts."

Users and actors:
- "Who are the users? End consumers, internal teams, third-party developers?"

**PHASE 2 — SCALE (2 minutes)**

Users and DAU:
- "How many total users? How many are active daily (DAU)?"

Write volume:
- "What's the write volume? How many key actions per user per day?"

Read volume:
- "What's the read/write ratio? Is this a read-heavy or write-heavy system?"

Data retention:
- "How long do we keep records? Real-time data that expires? Or long-term archival?"

**PHASE 3 — CONSTRAINTS (1 minute)**

Latency:
- "Any hard latency requirements? Does a user expect a response in < 1 second? Or is a few seconds fine?"

Availability:
- "What's the uptime requirement? Does a 5-minute outage cause significant business harm?"

Consistency:
- "Does every user need to see the exact same data instantly? Or is a few seconds of delay acceptable?"

Compliance or security:
- "Any regulatory requirements? GDPR? PCI-DSS? PII data I need to handle carefully?"

**PHASE 4 — CONFIRM ASSUMPTIONS (30 seconds)**

Restate:
- "Based on what you've told me, my assumptions are: [list]. Does that match what you're looking for? Anything I should adjust before I start drawing?"

### ASCII Diagram

```
THE REQUIREMENT CLARIFICATION FRAMEWORK:
──────────────────────────────────────────────────────────────────────────

  PHASE 1: FUNCTIONAL SCOPE         [~2 minutes]
  ────────────────────────────────────────────────
  Core features:      What 3–4 things must this system do?
  Out of scope:       What must it NOT do?
  Users:              Who uses it? B2C, B2B, internal?

  PHASE 2: SCALE                    [~2 minutes]
  ────────────────────────────────────────────────
  Total users:        How many are registered?
  DAU:                How many active each day?
  Write volume:       How many key actions per DAU per day?
  Read/write ratio:   10:1? 100:1? 1:1?
  Data retention:     Keep forever? 30 days? 1 year?

  PHASE 3: CONSTRAINTS              [~1 minute]
  ────────────────────────────────────────────────
  Latency SLA:        < 1 second? < 100ms? Best effort?
  Availability:       99.9%? 99.99%? Can it go down for 5 min?
  Consistency:        Strong (instant everywhere) or eventual?
  Compliance:         GDPR, PCI, HIPAA, or any local regulation?

  PHASE 4: CONFIRM ASSUMPTIONS      [~30 seconds]
  ────────────────────────────────────────────────
  "My assumptions: [A, B, C]. Correct?"
  → Get a yes or corrections BEFORE drawing anything.

──────────────────────────────────────────────────────────────────────────

WHAT EACH ANSWER TELLS YOU:
  "100M users, 10M DAU, 50 actions/day" → ~5,800 write QPS → Caching needed
  "Read/write = 100:1"                  → Feed pre-caching (fan-out on write)
  "Latency < 200ms p99"                 → Redis mandatory, no slow DB reads
  "Availability 99.99%"                 → No SPOF, multi-AZ deployment
  "Eventual consistency OK"             → Can use async writes, cache freely
  "PCI-DSS in scope"                    → Encrypt PII, no card data in logs

──────────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```
// UNSTRUCTURED CLARIFICATION (common mistake):

INTERVIEWER: "Design a social media feed."

CANDIDATE: "Sure, I have some questions.
            So... umm, should it be like Twitter?
            Or more like Instagram?
            Do you want me to do the notifications too?
            What about the settings page?
            And what database should I use?"

// Problems:
// 1. "Like Twitter or Instagram" is not a requirement question.
// 2. "Settings page" is wasted time — should be identified as out-of-scope.
// 3. "What database should I use?" — candidate should decide this. It's not a requirement.
// 4. No scale questions asked at all.
// 5. No assumptions confirmed at the end.
//
// Result: candidate asked 5 questions, learned almost nothing useful.
// They still don't know: how many users, read/write ratio, latency target.
```
> **Why this fails in production:** Gathering requirements by asking "what do you want?" instead of asking specific architectural questions doesn't help an engineer make design decisions. Questions must target the unknowns that change the architecture.

### Right Way — Production Quality (structured, efficient)
```
// STRUCTURED CLARIFICATION (correct approach):

INTERVIEWER: "Design a social media feed."

CANDIDATE: "Great. Let me ask a few focused questions
            before I start designing.

            Scope first — what are the core features?
            My guess is: users can post updates, follow others,
            and see a feed of posts from people they follow.
            Is that the right core set? Anything I'm missing
            or anything explicitly out of scope?"

INTERVIEWER: "That's right. Skip search, DMs, and stories."

CANDIDATE: "Perfect. Scale — how many users?
            And roughly how often does a user view their feed
            and how often do they post?"

INTERVIEWER: "100M users, 10M DAU.
              Reads: about 20 times per day per active user.
              Writes: 1 post per day per 10 active users."

CANDIDATE: [Mental calc: 10M × 1 post / 10 = 1M posts/day
            → 1M ÷ 86,400 ≈ 12 write QPS. Peak = 36 QPS.
            Feed reads: 10M × 20 = 200M/day ÷ 86,400 ≈ 2,300 QPS. Peak = 7,000 QPS.]

CANDIDATE: "That gives me roughly 7,000 peak read QPS and 36 write QPS.
            Any latency requirements? Should the feed load in under 1 second?"

INTERVIEWER: "Yes, p99 < 500ms."

CANDIDATE: "Consistency — if someone posts something and
            their follower doesn't see it for a few seconds,
            is that acceptable?"

INTERVIEWER: "Yes, eventual consistency is fine."

CANDIDATE: "Any compliance requirements? GDPR?
            Do we store any sensitive personal information?"

INTERVIEWER: "Just standard user profiles and posts — no financial data.
              Basic GDPR compliance."

CANDIDATE: "Great. My assumptions:
            — 10M DAU, 7,000 peak read QPS, 36 peak write QPS.
            — Push, DMs, and search are out of scope.
            — Eventual consistency is acceptable for feeds.
            — p99 < 500ms for feed loads.
            — GDPR compliance required.
            Does that match?"

INTERVIEWER: "Yes, go ahead."

CANDIDATE: [Now draws — with full confidence, no guessing]
```

> **Key decisions here:**
> - Questions are targeted at unknowns that change the architecture (scale, consistency, latency — not "which framework?")
> - Quick mental math done during clarification — QPS numbers noted before drawing
> - Assumptions restated and confirmed — interviewer validates scope before design begins
> - Total time: ~4 minutes. Nothing wasted.

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Walk me through how you gather requirements for a system design problem."

**Hruday's answer:**
> I split requirements gathering into four phases and I keep each phase focused and brief.
>
> Phase one is functional scope — what does the system actually do? I ask for the 3–4 core features and explicitly ask what's NOT in scope. Getting the out-of-scope list early stops me from designing components nobody asked for.
>
> Phase two is scale — how many users, what's the daily volume for key operations, and what's the read/write ratio? I do a quick mental calculation to convert daily volume to QPS while the interviewer is talking. By the end of phase two, I know whether I need caching, whether I need sharding, and how many service instances I'll need.
>
> Phase three is constraints — latency SLA, availability target, consistency model, and any compliance requirements. These three questions often change architectural components entirely.
>
> Phase four is just confirmation — I restate my assumptions and ask the interviewer to validate them. This is the 30-second check that prevents 20 minutes of wrong design.
>
> Total: 5 minutes. Then I draw.

---

### Q2 — Deep Dive
**Interviewer asks:** "What's the most important requirement clarification question you ask — if you could only ask one?"

**Hruday's answer:**
> If I could only ask one, it would be: "What's the scale — how many users and how many key operations per day?"
>
> Scale is the master question because it determines whether simple solutions work or whether you need distributed systems. A system for 1,000 users needs one database and maybe one server. A system for 100 million users needs caching, database replicas or sharding, a CDN, and potentially a message queue. Good architecture for one looks like over-engineering for the other, and vice versa.
>
> From scale alone, I can derive: approximate QPS, whether caching is necessary, whether the database needs read replicas, whether I need a message queue for high-volume writes. Every other requirement — latency, consistency, availability — can be reasonably assumed from context if needed. But scale? I can't assume that at all. Off by one order of magnitude and the entire architecture is wrong.
>
> So if I only had 30 seconds: "How many users, and how many key actions per day?"

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What if the interviewer says 'just assume reasonable numbers and start'? How do you handle that?"

**Hruday's answer:**
> Then I state my assumptions explicitly before drawing, and I proceed quickly.
>
> I'd say: "Okay. I'll assume 10 million DAU, posts and feed reads — 100:1 read/write ratio, p99 latency under 500ms, eventual consistency is acceptable — standard social app assumptions. I'll flag if any architectural decision is particularly sensitive to these numbers."
>
> The key is: never proceed without stated assumptions, even if the interviewer waves off the questions. Stated assumptions do three things: they give the interviewer a correction opportunity, they show structured thinking, and they let me defend my architectural choices later — "my cache strategy assumes eventual consistency is acceptable, as I stated upfront."
>
> If my assumptions turn out to be significantly wrong mid-design, I say "If the scale were 10x what I assumed, I'd change X to Y." Showing adaptability within the design is more impressive than stopping to re-ask.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Apply your requirement clarification framework to designing a rate limiter."

**Hruday's answer:**
> Phase 1 — Scope: "What are we rate limiting — external API calls, internal service calls, or both? Is this a library that services plug into, or a standalone service? Do we just block requests, or also queue and retry them?"
>
> Phase 2 — Scale: "How many unique clients are we limiting simultaneously? What's the total requests per second we need to handle? What are the typical limits — requests per second, per minute, per hour?"
>
> Phase 3 — Constraints: "Does the rate limit check need to be synchronous and under 10ms latency? Or can it be best-effort? Can there be false positives — occasionally blocking a request that should be allowed? Or must it be exact? Is this single-region or distributed across multiple data centres?"
>
> The answers change everything: 10,000 concurrent limited clients at 100 requests per minute with < 10ms check latency → Redis with sliding window Lua script is the answer. 100 clients with no strict latency → an in-memory counter per instance is fine. Single region → Redis works. Multi-region → Redis Cluster with replication lag risk, or a different algorithm.
>
> I'd confirm: "10,000 clients, 100 req/min limit, sliding window, < 10ms latency, single region, no queuing — just reject. My design will use Redis with a Lua script for atomic window check."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Product questions vs architecture questions | "Should it be like Twitter or Instagram?" | "What are the 3 core features? What's the read/write ratio?" Target the unknowns that change architecture. |
| Forgetting scale | Asks scope questions but never asks about users or QPS | Scale is mandatory. "How many users? How many key actions per day?" |
| No assumptions summary | Asks questions but starts drawing without confirming | "My assumptions are X, Y, Z. Does that match?" Always close the loop. |
| Over-asking | 10+ questions, 8 minutes of requirements | 4–6 targeted questions in under 5 minutes. Quality of questions > quantity. |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, I participated in architecture review sessions for new API modules. The best-run reviews always started with a requirements summary: what the API must do, what it explicitly won't do, and what scale it needs to handle. The modules that skipped that alignment had the most rework — inevitably, someone assumed something wrong. I've brought that same discipline into every system design conversation. Ask the right questions first, design second. It's not a technique I'm performing in interviews — it's how I actually approach new systems."

---

## 8. Scale Evolution

**Startup stage →** Requirements gathering is informal: Slack message, 5-minute meeting. But the same framework applies — "What does this need to do, for how many users, and what can we skip for now?"

**Mid-size product company →** Design documents with formal requirement sections. Architecture review before engineering begins. The 5-minute interview framework maps to a 1-hour requirements alignment meeting.

**Large tech company →** Formal PRDs (Product Requirement Documents) and TDDs (Technical Design Documents). The requirement clarification framework maps to multiple rounds of review: PM review, engineering review, security review.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment systems must have exact scope — compliance requirements missed in requirements lead to audit failures | "Did you ask about PCI-DSS? GDPR? Any regulatory constraints on transaction data?" |
| Swiggy / Meesho | Fast product iteration — scope clarity prevents rework in sprint cycles | "In a sprint, how do you make sure everyone agrees on what 'done' means before engineering starts?" |
| Adobe / Microsoft | Enterprise products — requirements clarity is a contractual obligation for SLA commitments | "When a customer-reported requirement is ambiguous, how do you resolve it before committing to delivery?" |
| Remote / Global roles | Async communication requires written requirements — the interview framework becomes a Confluence document | "Can you show me a design document you've written that included a clear requirements section?" |

---

## 10. Related Topics — What to Study Next

- **How to Start a System Design Interview (Topic 11)** — The companion topic — uses this framework as its phase structure.
- **Functional vs Non-Functional Requirements (Topic 6)** — Why there are two types of questions in the framework — and what each type covers.
- **Back-of-the-Envelope Calculations (Topic 9)** — The mental math you do during Phase 2 of the framework — converting daily volume to QPS in real time.
- **System Boundaries and Assumptions (Topic 10)** — Phase 3 of the framework builds directly on identifying system boundaries and external dependencies.
- **Time Boxing Each Section (Topic 13)** — After the framework, you need to manage the remaining 40 minutes — this topic shows how.

---

*Part 1 · Requirement Clarification Framework · Full Stack Interview Guide · Hruday D · 2026*
