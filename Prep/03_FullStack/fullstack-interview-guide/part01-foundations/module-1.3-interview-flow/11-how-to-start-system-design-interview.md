# How to Start a System Design Interview
> Part 1 — Full Stack Mindset & Interview Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Never start drawing immediately — the first 5 minutes are for gathering information, not designing.
- The opening sequence: understand the problem → clarify scope → state assumptions → estimate scale → then and only then start drawing.
- The key question to nail in the first 2 minutes: "What are the 3–4 core features I need to design?"
- The signal interviewers notice: candidates who ask good questions first vs those who dive into drawing boxes.
- Your SAP architecture experience = you've done this in real arch reviews. That's your natural voice. Use it.

---

## 1. One-Line Definition
Starting a system design interview well means spending the first 5 minutes asking the right questions — about scope, scale, and constraints — before drawing a single box.

---

## 2. The Problem It Solves

Two candidates walk into a system design interview: "Design a notification system."

Candidate A immediately starts drawing. Kafka, notification service, push/email/SMS workers, database. 20 minutes in, the interviewer says: "Actually, this is an internal HR tool that sends 500 emails a day. Why did you build Kafka infrastructure for this?"

Candidate B pauses, asks 5 questions, and learns: it's an internal tool, 500 daily emails, no SMS needed, no push notifications, batch sending is fine, and there's already an internal email library they can call. Candidate B draws a simple architecture in 5 minutes — a job scheduler, an email template service, and a log table. Simple, correct, and done in 30 minutes.

The 5-minute investment in questions saved Candidate B from 20 minutes of wasted work — and showed exactly the kind of requirement-gathering discipline senior engineers use in real projects.

---

## 3. How It Works Internally

### The Mental Model
Starting a system design interview is like a doctor examining a patient. A good doctor doesn't order every test immediately. They ask: "Where does it hurt? How long? Any history?" Then they examine. Then they test. Then they diagnose.

A bad doctor orders 15 tests immediately and spends an hour reviewing results that weren't needed.

The questions you ask in the first 5 minutes are the medical history. They tell you exactly what to examine and what to skip.

### The Mechanism — The Opening Script

**Minute 0–1: Acknowledge and restate the problem.**
"Okay, I need to design a notification system. Let me make sure I understand it correctly before I start. This sounds like a system that sends messages to users across multiple channels — push, email, SMS. Is that right?"

**Minute 1–3: Clarify scope (functional requirements).**
Ask 3–5 focused questions:
1. "What are the core features? Push, email, SMS — all three or a subset?"
2. "Who triggers notifications — users, other services, or scheduled jobs?"
3. "Any specific channels I should prioritise?"
4. "Are there any features explicitly NOT in scope — like notification preferences management, full inbox UI, or delivery analytics?"

**Minute 3–4: Identify external dependencies and system boundaries.**
"Is there an existing auth system? An existing email provider like SendGrid? Should I design the sending infrastructure, or just the coordination layer?"

**Minute 4–5: Estimate scale (back-of-envelope).**
"What's the scale? How many users? How many notifications per day? What's the read/write ratio? Any real-time requirements — like seeing unread counts update instantly?"

**Minute 5+: State assumptions and begin HLD.**
"Based on what you've told me, I'll assume: X users, Y notifications/day, push and email only, eventual consistency is fine for delivery status. I'm excluding SMS and notification preferences management. Does that match your intent?"

Then draw.

### ASCII Diagram

```
THE 5-MINUTE OPENING — NEVER SKIP THESE PHASES:
──────────────────────────────────────────────────────────────────────

  TIME       PHASE                     WHAT YOU DO
  ─────────────────────────────────────────────────────────────────
  0:00–1:00  Acknowledge & Restate    "Let me make sure I understand.
                                       You want me to design X, which does Y?"
                                       → Shows you listened, gives interviewer
                                         a chance to correct you early.

  1:00–3:00  Scope Clarification      Ask 3–5 focused questions.
             (Functional)             "Core features? In scope / out of scope?
                                       Who uses it — internal or external?"

  3:00–4:00  System Boundaries        "External systems I should integrate with?
             & Dependencies           Existing auth? Existing email providers?"

  4:00–5:00  Scale & NFRs             "How many users? Notifications/day?
                                       Any real-time requirements?
                                       Uptime SLA? Latency constraints?"

  5:00–6:00  State Assumptions        "Based on what you've told me:
             & Confirm Scope           - [Assumption 1]
                                       - [Assumption 2]
                                       Does that match your intent?"

  6:00+      START HLD                Now draw the big picture.
                                      Don't go deep on any component yet.
  ─────────────────────────────────────────────────────────────────

WHAT THE INTERVIEWER IS WATCHING:
  ✓ Do they ask GOOD questions or just ask about things they already know?
  ✓ Do they scope correctly — not too wide and not too narrow?
  ✓ Do they state assumptions — or do they just assume silently?
  ✓ Do they think about scale BEFORE drawing boxes?
  ✗ They are NOT impressed by "let me start drawing immediately."
──────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```
// THE WRONG OPENING (as a script):

INTERVIEWER: "Design a notification system."

CANDIDATE: "Sure! So I'll have a notification service
            that receives events from other services.
            It'll send push notifications using Firebase,
            emails using SendGrid, and SMS using Twilio.
            I'll use Kafka for the event bus because it's
            scalable and...
            [draws Kafka cluster, 3 workers, Postgres, Redis]"

INTERVIEWER: "What scale were you designing for?"
CANDIDATE: "Um... maybe 10 million users?"
INTERVIEWER: "We have 5,000 users. It's an internal tool."
CANDIDATE: [entire design is wrong — 20 minutes wasted]

// The problem: jumped to drawing before understanding the problem.
```
> **Why this fails in production:** In real projects, engineers who start building before understanding requirements deliver the wrong thing. The same pattern in interviews wastes 20 minutes and signals poor requirements discipline.

### Right Way — Production Quality (the good opening)
```
// THE RIGHT OPENING (as a script):

INTERVIEWER: "Design a notification system."

CANDIDATE: "Great. Before I start designing, let me ask
            a few questions to make sure I'm building
            the right thing.

            First — what are the core notification channels?
            Push, email, SMS — all three or a subset?

INTERVIEWER: "Push and email."

CANDIDATE: "Got it. Who triggers these notifications?
            Other internal services, direct user actions,
            or scheduled jobs?

INTERVIEWER: "Internal services publish events.
              Your system consumes them and sends."

CANDIDATE: "Perfect. What's the scale?
            How many users, and roughly how many
            notifications per day?

INTERVIEWER: "About 5 million users, 2 million
              notifications per day."

CANDIDATE: "Any hard latency requirements?
            Do users need to see a push notification
            within 1 second of an event, or is
            a few seconds acceptable?

INTERVIEWER: "A few seconds is fine."

CANDIDATE: "One last thing — anything explicitly
            out of scope? Like a full notification
            inbox UI, delivery analytics, or
            notification preferences management?

INTERVIEWER: "Skip the inbox and preferences for now.
              Just focus on sending and delivery tracking."

CANDIDATE: "Great. So my assumptions are:
            5 million users, 2 million sends/day (23 QPS average),
            push + email only, a few seconds latency is fine,
            inbox and preferences are out of scope.
            Let me start drawing the architecture."

[NOW candidate draws — focused, correct, nothing wasted]
```

> **Key decisions here:**
> - 5 questions asked in under 3 minutes
> - Each question removes a large chunk of ambiguity
> - Assumptions restated before drawing — interviewer confirms or corrects
> - 23 QPS calculation happens mentally from "2M/day"

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "If I give you a system design problem, what's the first thing you do?"

**Hruday's answer:**
> The first thing I do is ask questions — not start drawing. My goal in the first 5 minutes is to understand three things: what the core features are, what the scale is, and what's explicitly out of scope.
>
> I ask about core features so I know what to design. I ask about scale so I know which components are necessary — a system for 1,000 users and a system for 100 million users look completely different. I ask about out-of-scope so I don't waste 20 minutes designing something the interviewer never wanted.
>
> After gathering that, I restate my assumptions — "Based on what you've told me, I'll assume X, Y, Z. Does that match?" If the interviewer corrects me, great — I learn that before wasting any time on drawings. Then I start the high-level design.
>
> I've found this discipline maps directly from real work. At SAP, before any new micro-frontend module started, we'd have a scoping session where we agreed on what the module owned, what it didn't own, and who it integrated with. Same pattern, same discipline.

---

### Q2 — Deep Dive
**Interviewer asks:** "What questions do you ask about scale? What specifically are you trying to learn?"

**Hruday's answer:**
> I'm trying to learn three numbers: write QPS, read QPS, and storage size. These three numbers determine a huge part of the architecture.
>
> To get write QPS, I ask: how many users, and what key actions do they take per day? I mentally calculate: daily actions ÷ 86,400 = average QPS, × 3 = peak.
>
> To get read QPS, I ask: what's the read/write ratio? Or more concretely: how often does each user read this data? If 1 read per write, same QPS. If 100 reads per write (social feed), read QPS is 100x the write QPS — that immediately tells me I need caching.
>
> To get storage, I ask: how long do we need to retain records? Is it real-time data that expires (session tokens, OTPs) or archival data (order history, financial transactions)?
>
> These three numbers — write QPS, read QPS, and storage — tell me: do I need caching? Do I need sharding? Do I need a message queue for high-volume writes? Should I use a relational or NoSQL database? The architecture decisions follow directly from the numbers.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "How do you balance spending time on questions vs getting to the actual design? Some interviewers want to see design fast."

**Hruday's answer:**
> This is a real tension, and the answer is: read the interviewer. Some interviewers are time-conscious and will signal "let's get to the design." If I feel that signal, I compress requirements gathering to 2 minutes and state assumptions more quickly.
>
> But I never skip it entirely. My minimum is: core features named, scale acknowledged, one key assumption stated. Even in 2 minutes, I can ask "Is this a write-heavy or read-heavy system?" and "Any hard real-time constraints?" — those two questions alone change the architecture significantly.
>
> The risk of skipping altogether is much higher than spending 2 extra minutes. If I design a distributed Kafka system for a 500-user internal tool, I look like I have no pragmatic judgement. If I ask 3 quick questions and then design the right thing efficiently, I look sharp.
>
> At SAP, I learned that the fastest way to deliver is to spend more time on requirements up front. The developers who skipped spec review always came back with rewrites. The ones who read the requirements thoroughly delivered it right the first time. Same in interviews.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design a rate limiter. Show me your opening 5 minutes."

**Hruday's answer:**
> "Okay — a rate limiter. Let me understand the requirements before I start.
>
> First, what are we rate limiting? API calls from external clients? Internal service-to-service calls? Or both?
>
> Second, what's the granularity? Per user, per API key, per IP, or per endpoint?
>
> Third, what's the limit type? Requests per second? Requests per minute? Sliding window or fixed window? Sliding window is more accurate but slightly more complex.
>
> Fourth, what happens when a limit is exceeded? Return HTTP 429 immediately? Queue the request? Fail silently?
>
> Fifth, what's the scale? How many requests per second total, and how many unique clients?
>
> Let's say the interviewer says: per API key, 100 requests per minute, sliding window, return 429 on exceed, and about 10,000 concurrent API keys at 500,000 total requests per minute.
>
> My assumption: 500K req/min ÷ 60 = ~8,300 QPS average. Peak 3x = ~25,000 QPS. The rate limiter itself must be faster than a database — so Redis is the obvious choice. A rate check must take < 10ms or it becomes the bottleneck. My design will be: Redis sliding window counter with Lua script for atomic check-and-increment.
>
> Now I'll start drawing."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Starting with drawing immediately | Picks up the marker and starts drawing | "Before I start, let me ask a few questions. What are the core features you want me to design?" |
| Asking too many questions | 15 questions, 10 minutes of interviews | 5 focused questions taking 3 minutes max. Each question should remove a large chunk of ambiguity. |
| No scale estimation | Never asks about users or QPS | "What's the scale? How many users and roughly how many key operations per day?" |
| Silent assumptions | Assumes globally distributed, highly available, all channels | "Here are my assumptions before I start: [list]. Does that match your intent?" |

---

## 7. Hruday's Real Experience Hook

> "At SAP, before starting any new module design, we'd run a brief requirements alignment session — 15 minutes, 3 engineers, explicit scope agreement. The modules that skipped this alignment had the most rework. The ones that nailed the scope up front shipped on time. System design interviews are the same — the 5-minute requirement session at the start is the discipline that prevents 20 minutes of wrong architecture. I've been doing this in real projects for years. It just shows up in interviews now too."

---

## 8. Scale Evolution

**Startup / small team →** Requirement gathering happens informally in Slack or a quick meeting. But the same questions matter: "Who uses this? How many records? What happens at 10x growth?"

**Mid-size product company →** Architecture reviews are formal. Design documents required before engineering starts. The opening 5 minutes becomes a 1-hour requirements alignment meeting.

**Large tech company →** RFC (Request for Comments) documents capture requirements, constraints, and out-of-scope decisions in writing before any engineer writes code. The system design interview opening mirrors this process.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Fintech — scope ambiguity leads to compliance gaps | "What transaction types are in scope? Any regulatory constraints? RBI compliance requirements?" |
| Swiggy / Meesho | Fast-paced product — narrow scope means faster delivery | "What's the MVP feature set? What's in scope for this sprint vs the next release?" |
| Adobe / Microsoft | Enterprise — large scope means 12-month projects; getting scope wrong early costs millions | "Is this a V1 or a full platform? What's the audience — internal or external?" |
| Remote / Global roles | Async communication requires written requirement clarity — the "5-minute opening" becomes a design document section | "What assumptions did you document about scope and scale in your design doc?" |

---

## 10. Related Topics — What to Study Next

- **Requirement Clarification Framework (Topic 12)** — The specific questions to ask, in what order, with example answers for common system types.
- **Functional vs Non-Functional Requirements (Topic 6)** — Breaks down the two types of questions you ask in the first 5 minutes.
- **Time Boxing Each Section (Topic 13)** — How to manage the clock after the opening 5 minutes — the complete 45-minute interview structure.
- **HLD vs LLD (Topic 5)** — After the opening, you draw — and this topic tells you whether to draw a system map or a class diagram.
- **System Design Case Studies (Part 19)** — Practise the full opening sequence on real problems: URL shortener, chat, feed, notifications.

---

*Part 1 · How to Start a System Design Interview · Full Stack Interview Guide · Hruday D · 2026*
