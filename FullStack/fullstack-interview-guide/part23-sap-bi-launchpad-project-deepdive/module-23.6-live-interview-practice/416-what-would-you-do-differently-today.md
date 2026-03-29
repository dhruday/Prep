# What Would You Do Differently Today
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.6: Live Interview Practice
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **This question is different from "what would you change"** (file 409 in Module 23.5) — that was about architecture decisions; this is the closing question in a live interview and is about growth, self-awareness, and professional maturity
- **The three things to cover**: (1) a technical practice you'd do differently (accessibility from day one — covered in 409; OR: OpenTelemetry from day one), (2) a leadership/process thing you'd do differently (structured ADRs — Architecture Decision Records — from month one so the team's reasoning is documented and new engineers can understand why decisions were made), and (3) something you'd keep exactly the same (the Module Federation + micro-frontend choice — it was the right call and remains so)
- **The key tone distinction**: this question at the END of an interview is a conversation, not a confession; the interviewer is checking whether you have the growth mindset and self-awareness of a senior/staff engineer; you don't need to sound regretful — you need to sound like someone who learns and improves
- **The ADR angle is strong**: if the question is "what would you do differently," saying "write Architecture Decision Records" shows that you've thought about how teams share knowledge, how future engineers understand past decisions, and how organisations avoid re-litigating settled questions — this is staff-level thinking
- **The closing line**: after your answer, invite feedback from the interviewer — "Is there an area you're hoping I'd have thought about differently?" — this shows confidence, openness, and conversational skill

---

## 1. The Full Answer — Three Parts

```
PART 1: Technical Practice — OpenTelemetry From Day One

"On the technical side: I'd set up OpenTelemetry distributed tracing
before the first service was deployed. We added Micrometer tracing
in month 4 after a latency incident took four hours to diagnose
manually — cross-correlating logs across three services by hand.

With OTel's Java automatic instrumentation, you add the agent to the
JVM at startup — one line in the Dockerfile — and you get automatic
spans for all Spring Boot endpoints, WebClient calls, JDBC queries,
and Kafka messages. That's 95% of what you need for distributed trace
coverage, at zero code change cost.

The month-2 incident that took four hours would have taken ten minutes.
Setting up OTel from day one costs thirty minutes. That's the most
disproportionate return-on-time-invested change I'd make."

─────────────────────────────────────────────────────────────────────
PART 2: Leadership Practice — Architecture Decision Records (ADRs)

"On the leadership side: I'd write Architecture Decision Records
from month one. We made dozens of significant architectural choices —
Module Federation over iFrames, httpOnly cookie over localStorage,
Resilience4j over Hystrix, React over Angular for Teams B and D —
and the reasoning behind each choice lived in people's heads and
Slack threads, not in the codebase.

Six months in, new engineers joining would ask 'why do we use
Module Federation?' The answer was available in Slack history or
via whoever happened to be in the room. That's fragile knowledge.

An ADR is a short markdown file in the repo:
  # ADR-003: Module Federation over iFrames
  Date: 2023-04-12
  Status: Accepted
  Context: Four teams need to share a browser tab with independent deployment...
  Decision: Use Webpack Module Federation...
  Consequences: Added CSP complexity; deep linking works natively...

Over two years we'd have had 20-30 ADRs.
Any engineer joining the team could read them to understand not just
what was built but why — and why alternatives were rejected.
That context is the most valuable knowledge the team produced,
and it almost entirely escaped documentation."

─────────────────────────────────────────────────────────────────────
PART 3: What I'd Keep Exactly the Same

"What I'd keep: the micro-frontend architecture with Module Federation.
Every time I've been in an interview and walked through this decision,
I've had to defend it — and every time I defend it, I'm more confident
it was right for this particular system. Four teams, independent cadences,
different tech stacks with real historical investment — the architecture
mirrors the organisation correctly. The Team B p0 fix in 47 minutes is
the proof I come back to.

I'd also keep the httpOnly cookie JWT decision. After the security audit,
with zero critical incidents in 12 months, and knowing that localStorage
is readable by every module's dependency tree — that decision was correct
and holds up against scrutiny."
```

---

## 2. The ADR Template — Know It Cold

```markdown
# ADR-[number]: [Short title]

## Date
YYYY-MM-DD

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## Context
What is the issue that motivated this decision?
What constraints existed? What options were evaluated?

## Decision
What was decided?
State it actively: "We will use..." not "It was decided..."

## Consequences
What becomes easier?
What becomes harder?
What risks are accepted?
What is NOT decided by this ADR (matters not covered)?
```

---

## 3. Interview Questions & Model Answers

### Q1 — The Classic Closing
**Interviewer asks:** "If you could go back and do this project again, what would you do differently?"

**Hruday's answer:**
> "Three things. First, set up OpenTelemetry distributed tracing before deploying the first service. We added it in month four after a latency incident took four hours to diagnose manually. The OTel Java agent is one line in a Dockerfile — zero code change, automatic spans for every HTTP call, JDBC query, and Kafka message. That month-two incident would have been ten minutes with traces. The setup cost is thirty minutes. Second, write Architecture Decision Records from month one. Every architectural choice we made — Module Federation over iFrames, httpOnly cookie instead of localStorage, Resilience4j over Hystrix — the reasoning lived in people's heads and Slack threads. New engineers joining asked 'why do we do it this way?' and the answer required tracking down whoever was in the room when the decision was made. Twenty ADRs in a docs folder would have made the team's knowledge durable instead of fragile. Third — what I'd keep the same: the micro-frontend architecture. Every time I've defended that decision, I've become more certain it was right for four teams with genuine independence requirements. The Team B p0 fix in 47 minutes is the evidence I keep coming back to."

---

### Q2 — Growth Check
**Interviewer asks:** "What have you learned about engineering leadership from this project?"

**Hruday's answer:**
> "The biggest lesson is that good architecture documentation is a team's communication to its future self. The decisions that feel obvious today — 'of course we use Module Federation for independent deployment' — are not obvious to an engineer who joins in year two and needs to extend the system. I spent time writing ADRs retrospectively when new engineers joined, reconstructing the reasoning from memory. Writing them at decision time costs thirty minutes; reconstructing them costs three hours and introduces the risk of incomplete recall. The second lesson: process changes are infrastructure investments with positive returns. Adding axe-core to CI took half a day. It meant zero accessibility violations shipped thereafter. Adding OTel took three hours. It means every latency incident is diagnosed in minutes. These are investments that pay back every sprint indefinitely. The instinct at the start of a project is to skip them to move faster. The instinct at the end of a project is 'I wish we'd done these at the start.' I'd rather build the instinct to do them at the start."

---

## 4. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "I'd document more" | Vague and defensive | Name ADRs specifically — what they contain, why they're different from wiki pages, how many you'd have written |
| "Everything was perfect / I'd change everything" | Both extremes signal poor self-awareness | One honest technical thing, one process thing, explicit statement of what you'd keep |
| Not connecting to growth | Just an answer to check a box | Connect it to a principle: "process changes are infrastructure investments with positive returns — setup cost paid once, dividend paid every sprint" |
| No closing invitation | End abruptly | "Is there an area where you were hoping I'd have thought about things differently?" — conversational, confident, opens the floor |

---

## 5. Hruday's Real Experience Hook

> "I wrote the first ADR for this project in month 11. A new engineer had joined Team B and spent two weeks confused about why Team C had a separate Next.js build system. I walked them through the SSR performance requirement and the decision trail. Then I spent Sunday writing twelve ADRs retrospectively. It took four hours. If I had written them in real time as we made the decisions, it would have taken maybe two hours across the year. The lesson wasn't just 'document your work' — it was that the documentation has diminishing fidelity over time. An ADR written the day of the decision contains the actual alternatives considered and the actual constraints. An ADR written six months later contains the winner and some reconstructed justification. Write them in real time."

---

## 6. Scale Evolution

**Single project, current →** Retrospective ADRs for the most impactful decisions. OTel from day one. axe-core CI gate from day one.

**Leading a team →** ADR practice is a team norm: every architectural decision above a threshold of reversibility gets an ADR. PR template includes a checkbox: "Does this PR implement an architecture decision? If so, link the ADR."

**Leading an org →** ADRs are discoverable via internal docs search. An ADR reviewing process (lightweight RFC for cross-team decisions). Architecture Decision Log published quarterly to eng leadership. ADRs inform onboarding paths for new engineers.

---

## 7. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Fast-growth company: decisions made by 5 engineers in 2023 affect 50 engineers in 2025; ADRs make that knowledge transfer durable | Knowledge preservation under engineering team growth |
| Swiggy / Meesho | Tech debt often comes from undocumented decisions; new engineers make locally reasonable choices that conflict with year-old architectural commitments | ADRs prevent "we're building this feature and it conflicts with the decision we made in month 3 that nobody wrote down" |
| Adobe / Microsoft | Platform companies document extensively; RFC and ADR processes are standard; showing you already have this mindset | ADR format knowledge; connecting documentation to org scaling |
| SAP Labs | You're articulating what you'd do in your next project as well as this one — showing you extract principles, not just fixes | The candidate who grows from each project and can articulate the growth specifically |

---

*Part 23 · What Would You Do Differently Today · Full Stack Interview Guide · Hruday D · 2026*
