# How to Talk About Backend Decisions You Made
> Part 20 — Behavioural & Leadership · Full Stack Leadership Signals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The problem**: Hruday's primary depth is frontend; when an interviewer asks "tell me about a backend architecture decision," the instinct is to downplay it: "the backend team decided and I integrated it" — this signals a junior profile even when the decision was genuinely yours
- **The frame**: at a full stack senior level, owning a backend decision means: you proposed it with evidence, you explained the trade-off, you had a dissenting alternative, and your approach won through reasoning — not by default
- **Three backend stories to pull from**: (1) TimescaleDB for the Bosch dashboard historical queries; (2) WebSocket transport for real-time vs polling; (3) OpenAPI 3.0 contract-first + RFC 7807 error format at Oracle
- **The language pattern**: "I chose X over Y because [specific technical reason]. The trade-off was [downside]. At our scale, that trade-off was acceptable because [why]." — this is what senior backend framing sounds like
- **What NOT to say**: "we used Spring Boot" is a technology choice, not a decision; "I decided to use TimescaleDB because Postgres alone would have had poor range query performance at 90 days of timeseries data — regular B-tree indexes don't partition by time" is a decision
- **Anchor**: even if you didn't design the entire backend system, every database schema choice, caching strategy, API contract format, or transport protocol you influenced is a backend decision you made

---

## 1. One-Line Definition
Narrating backend decisions means articulating the specific technical choice you made, the alternative you considered, the reason your approach was right for the context, and the trade-off you accepted — not just naming the technology stack.

---

## 2. The Problem It Solves

Senior full stack engineers who come primarily from frontend backgrounds often undersell backend contributions in interviews. The pattern sounds like: "the backend was Spring Boot with a Postgres database — I worked on the frontend and integrated with the APIs."

That answer positions Hruday as a frontend consumer of someone else's backend, not a co-owner of technical decisions. Even when the conversation with the backend team was substantive — "I pushed for TimescaleDB because the performance on range queries was measurably better" — the behavioural answer doesn't reflect it.

For a senior full stack role, the question "tell me about architecture decisions you've made" expects backend decisions. This topic teaches how to extract and articulate those decisions from real experiences clearly.

---

## 3. How It Works Internally

### The Decision Narration Pattern

```
Pattern: C-A-T-O

C — CONTEXT (one sentence)
     What system? What data? What scale?
     "The Bosch dashboard needed to store 90 days of production 
     line timeseries data — roughly 200 events per second."

A — ALTERNATIVES CONSIDERED (two options)
     What did you evaluate?
     "Option A: store raw events in a regular Postgres table.
     Option B: TimescaleDB hypertable — a Postgres extension that 
     partitions data into time-based chunks automatically."

T — TRADE-OFF (honest)
     Why did the preferred option win? What did you give up?
     "I chose TimescaleDB. The downside: it's an extension, 
     not vanilla Postgres — slightly more operational overhead 
     to manage."

O — OUTCOME (measured)
     What changed because of the decision?
     "Query performance for a 90-day range went from ~4 seconds 
     (regular Postgres B-tree index scan) to 280ms (TimescaleDB 
     chunk scan). That was the difference between a usable and 
     an unusable trend dashboard."
```

### Backend Decisions Hruday Actually Made

```
Decision 1 — Transport Protocol (Bosch Dashboard)
  C: Real-time factory metrics needed sub-2-second delivery to browsers.
  A: Option A = polling every 10 seconds (existing). Option B = WebSocket push.
  T: WebSocket chosen. Trade-off: persistent connection overhead per client; 
     requires server-side connection management.
  O: Staleness: 10s → <2s. Operators could detect rapid fault conditions 
     previously invisible between polls.

Decision 2 — Time-series Storage (Bosch Dashboard)
  C: 90 days of events, 200/s throughput, fast range queries needed.
  A: Regular Postgres table vs TimescaleDB hypertable.
  T: TimescaleDB: time-partitioned chunks make range queries scan only 
     relevant data. Trade-off: extension dependency.
  O: 90-day range query: 4.2s → 280ms.

Decision 3 — API Error Format (Oracle REST APIs)
  C: 12 API endpoints that each needed to return structured errors.
  A: Custom JSON error format vs RFC 7807 problem+json standard.
  T: RFC 7807 chosen. Slightly more verbose than a simple `{"error": "msg"}`.
  O: Angular frontend error handling unified — one error interceptor 
     structure handles all 12 APIs; no per-endpoint error parsing.

Decision 4 — API Contract Timing (Oracle)
  C: Full-stack module built by one engineer (me); design could be 
     done code-first or spec-first.
  A: Write code and derive spec vs write OpenAPI 3.0 spec first, code after.
  T: Spec-first. Takes an extra day upfront. Catches design gaps before 
     implementation commits them.
  O: Product owner caught a workflow endpoint design gap in the spec review 
     (not code review). Saved a sprint of refactoring.
```

---

## 4. The Script

### Wrong Way — Technology Listing

```
Interviewer: "Tell me about a backend decision you made at Bosch."

❌ Technology listing:
"At Bosch we used Spring Boot for the backend with Kafka for 
streaming and TimescaleDB for the time-series data. The frontend 
was Angular with WebSocket connections. I worked on both sides."

Problems:
  - Lists technologies; no decisions mentioned
  - "We used" — who decided? why? was there an alternative?
  - No trade-off, no reasoning, no outcome measurement
  - Interviewer has learned nothing about Hruday's backend judgement
```

```
✅ Decision narration (C-A-T-O format):

"One backend decision I made at Bosch was the choice of TimescaleDB 
over regular Postgres for the historical metrics storage.

Context: The dashboard needed queryable history — operators wanted 
to see 90-day trend charts. The incoming metrics were ~200 events 
per second. At that volume, 90 days of data is roughly 1.5 billion rows.

I evaluated two options: a regular Postgres table with a B-tree index 
on the timestamp column, or TimescaleDB — a Postgres extension that 
automatically partitions data into time-based chunks.

I ran a test query — 'average throughput by hour over 90 days' — 
against both approaches with 6 weeks of loaded test data. Regular 
Postgres took 4.2 seconds. TimescaleDB with the same SQL took 280ms 
because the query engine only scanned the two relevant time chunks, 
not the full table.

The trade-off: TimescaleDB is an extension, not vanilla Postgres. 
It requires an additional library installation and the DBA team 
needed to learn its chunk management. At our scale, that operational 
overhead was clearly worth the 15x query improvement.

We shipped TimescaleDB and the 90-day trend charts were responsive 
from day one."
```

---

## 5. Interview Questions & Model Answers

### Q1 — Direct Ask
**Interviewer asks:** "Tell me about a backend architecture decision — not just what technology you used, but why you chose it over the alternative."

**Hruday's answer:**
> At Bosch, I decided on WebSocket push delivery over the existing 10-second polling for real-time factory metrics. The context: factory operators were missing rapid fault conditions that resolved within the polling window — a 3-second machine fault might be invisible between two 10-second polls.
>
> The two options: keep polling (simple, stateless, no server-side connection management) or switch to WebSocket push (sub-second delivery, but persistent connections that the server must manage).
>
> I chose WebSocket. The operational downside is real — WebSocket connections consume a file descriptor and server memory per connected client. But at Bosch's dashboard scale — 3 concurrent operator screens — the overhead was negligible. The alternative (10-second polling) was actively causing operational risk: operators were filing fault reports for conditions that the polling had obscured.
>
> The result: data staleness dropped from 10 seconds to under 2 seconds. Operators reported catching fault conditions they'd previously missed entirely.

---

### Q2 — Pushing on API Design
**Interviewer asks:** "Most engineers just return `{"error": "message"}` in their APIs. Why did you use RFC 7807 at Oracle?"

**Hruday's answer:**
> Because the Angular frontend I was building simultaneously had to handle 12 different API error paths. With a custom error format, the frontend error interceptor would need to know each endpoint's error structure. With RFC 7807, every single error across all 12 endpoints follows one schema: `type`, `title`, `status`, `detail`, `instance`.
>
> One Angular HTTP interceptor handles all error responses. No per-endpoint error parsing logic. When I added the 13th API two months in, the error handling was already done.
>
> The trade-off: RFC 7807 is slightly more verbose than `{"error": "message"}`. The client has to parse a more structured object. But in a JSON context, parsing `problem.detail` vs `error.message` is a zero-cost difference. The maintenance benefit of a consistent contract far outweighs the field-name verbosity.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Technology as decision | "We used Spring Boot and Postgres" | "I chose TimescaleDB over standard Postgres because 90-day range queries on 1.5B rows need time-partitioned chunks, not a B-tree index; the query went from 4.2s to 280ms" |
| "We" throughout | "The team decided on WebSocket" | "I proposed switching to WebSocket; the driver was that operators were missing fault conditions between 10-second polls — I ran both options past the tech lead and we aligned on the switch" |
| No trade-off | "TimescaleDB was the obvious best choice" | "TimescaleDB adds extension dependency — our DBA team needed onboarding; at our scale, the 15x query performance improvement justified that operational cost" |
| Claiming decisions you didn't make | Attributing architecural decisions made by others to yourself | Scope claims clearly: "I made the database schema and query strategy decisions; the Kafka partition count was decided by the platform team — I provided the throughput estimate they needed" |

---

## 7. Hruday's Real Experience Hook
> "In an early interview where I mentioned the Bosch real-time dashboard, the interviewer asked: 'Why TimescaleDB? Postgres seems sufficient.' I initially said 'it was better for time-series.' He pushed back: 'How do you know?' That moment taught me the difference between claiming a decision and owning a decision. Now I can answer: '90-day range query on 200 events/second = 1.5 billion rows. Regular Postgres B-tree index scan: 4.2 seconds. TimescaleDB time-partitioned chunk scan: 280ms. I ran the test. That's how I know.' Same decision, completely different credibility signal."

---

## 8. Scale Evolution

**Small project / single engineer →** Backend decisions are yours by default; the challenge is remembering to articulate them as decisions and not just implementations; practise with the C-A-T-O pattern even for simple choices.

**Multi-team environment →** You may own parts of backend decisions; be precise about scope — "I decided the query strategy, the infrastructure team decided the database engine"; owning a slice honestly is more credible than claiming the whole stack.

**Staff / principal level →** Backend decisions span multiple services; the pattern scales — the same C-A-T-O structure applies to cross-service architecture choices (sync vs async communication, shared database vs separate schemas); the trade-off discussion becomes richer and the outcome measurement spans more teams.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Full stack engineers at fintech are expected to own backend API design and data storage decisions; the payment stack is too critical for "I just integrated the APIs" framing | Specific payment-related backend decisions (idempotency keys, transactional atomicity) signal full stack maturity |
| Swiggy / Meesho | High-throughput backend decisions (caching strategy, DB query optimisation, async vs sync calls) are directly customer-facing in food delivery and commerce | Trade-off framing connecting backend decisions to user-visible latency signals |
| Adobe / Microsoft | Senior engineers at Adobe/Microsoft are expected to design backend systems, not just consume them; a purely frontend story won't land at senior+ | System design round includes backend architecture; need vocabulary and decision patterns |
| SAP Labs | Direct experience — Bosch dashboard (TimescaleDB, WebSocket), Oracle (OpenAPI-first, RFC 7807); these decisions are recent and credible | SAP-level backend decisions are well-supported by real evidence |

---

## 10. Related Topics — What to Study Next

- **Topic 325 — Story 6 (Bosch Dashboard)** — the source story for the TimescaleDB and WebSocket decisions; know the full context before using the C-A-T-O pattern
- **Topic 326 — Story 7 (Oracle REST APIs)** — the source story for the OpenAPI-first and RFC 7807 decisions
- **Topic 105 — TimescaleDB / Postgres performance** — technical depth behind the query benchmark numbers
- **Topic 307 — Real-time Dashboard System Design** — broader system design context for the WebSocket vs polling decision

---

*Part 20 · How to Talk About Backend Decisions You Made · Full Stack Interview Guide · Hruday D · 2026*
