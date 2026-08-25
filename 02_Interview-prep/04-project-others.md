# Chapter 4 — Other Projects Deep Dive

Covers **Bosch**, **Oracle**, **Capgemini**, and side projects **NiftyLens** & **PerfScan**.

**Rule:** These are shorter than Launchpad but you still need a 60-second pitch, an architecture diagram, and 5–10 anticipated questions per project.

---

# 4.1 Project — Bosch Real-Time Industrial Dashboards

*Memory hook: **"Walk the floor with your eyes, not your feet."***

## 4.1.1 60-Second Pitch

> "At Bosch Global Software I built real-time monitoring dashboards for factory operations. Before, plant operators walked around ~15 production lines to check machinery status boards. We replaced that with a live Angular dashboard streaming telemetry over WebSocket from PLCs — vibration, temperature, cycle time, downtime. Refactored 20+ legacy Angular components onto Bosch's **WebCore design system**, cut rendering time 25%, and stitched Spring Boot microservices into a Docker + Kubernetes pipeline."

## 4.1.2 Architecture (draw this)

```
   ┌─────────────┐   OPC-UA / MQTT   ┌───────────────┐
   │  PLC / IoT  │──────────────────▶│  Edge Gateway │
   │  (machine)  │                    │  (aggregator) │
   └─────────────┘                    └───────┬───────┘
                                              │ AMQP / Kafka
                                              ▼
                                    ┌──────────────────┐
                                    │  Ingest Service  │
                                    │  (Spring Boot)   │
                                    └────┬────────────┬┘
                                         │            │
                                         ▼            ▼
                                  ┌──────────┐  ┌──────────┐
                                  │ InfluxDB │  │  Redis   │
                                  │ (time-   │  │(last-known│
                                  │  series) │  │  values) │
                                  └────┬─────┘  └────┬─────┘
                                       │             │
                                       └──────┬──────┘
                                              ▼
                                    ┌──────────────────┐
                                    │  API Service     │
                                    │  Spring Boot +   │
                                    │  STOMP / WS      │
                                    └────────┬─────────┘
                                             │ WebSocket (STOMP)
                                             ▼
                                    ┌──────────────────┐
                                    │  Angular App     │
                                    │  RxJS + WebCore  │
                                    └──────────────────┘
```

## 4.1.3 Data Flow

1. Machine PLC emits telemetry over OPC-UA to an edge gateway.
2. Gateway pushes to AMQP / Kafka.
3. Ingest service writes raw to InfluxDB (time-series) + latest snapshot to Redis.
4. API service serves REST for history + STOMP over WebSocket for live push.
5. Angular subscribes per production line — reactive UI via RxJS.

## 4.1.4 Anticipated Questions & Answers

**Q: Why WebSocket, not SSE?**
> Two reasons. First, we needed **bi-directional** — operators could acknowledge alarms back to the server. Second, our infra already ran STOMP over WS for other Bosch products. SSE would be simpler but one-way only.

**Q: How did you handle reconnection?**
> Custom reconnect service around SockJS with **exponential backoff + jitter** (1s, 2s, 4s… max 30s). On reconnect I re-subscribe to topics and request a **since-last-event-id** replay from a Redis-backed buffer keyed per user.

**Q: What if telemetry drops for 5 minutes?**
> Two levels. UI-side: I show a "stale" indicator when last-update > 30s and grey out interactive controls. Server-side: gap detection compares expected cycle vs actual; a monitoring alert fires and creates an incident automatically.

**Q: Why Angular and not React?**
> Bosch's design system (WebCore) was Angular-first. RxJS operators (`switchMap`, `debounceTime`, `retryWhen`) are ideal for streaming telemetry. React would have needed a wrapper library and re-implementation of WebCore.

**Q: How did the 25% render improvement happen?**
> `OnPush` change detection + `trackBy` on huge equipment lists + moving heavy chart re-renders to `requestAnimationFrame` batches. Measured with Chrome DevTools Performance panel on the same production line dataset, before and after.

**Q: Cross-browser bugs — example?**
> IE11 was still required for one plant. Angular's polyfill list didn't cover a specific `IntersectionObserver` edge case; I added a polyfill and reworked one virtual-scroll list to use `scroll` events as a fallback.

**Q: How did you test?**
> Jasmine + Karma unit for services, Protractor E2E (Cypress migration was pending). RxJS marble tests for stream logic — that was my favorite part.

**Q: Kubernetes deployment failures — what happened?**
> Two big lessons: readiness probes were too aggressive (health endpoint hit DB on every check → cascade failure); fixed by making readiness a shallow ping. And graceful shutdown — Spring Boot needs SIGTERM handling to drain the STOMP sessions before pod death.

---

# 4.2 Project — Oracle Financial Services

*Memory hook: **"From 0% coverage to 85% — quality as culture, not a metric."***

## 4.2.1 60-Second Pitch

> "At Oracle Financial Services I worked on user management and transaction processing systems for banking clients. Two wins I'm proud of: I built a **reusable Angular component library** — modals, drag-and-drop tables, data grids — that got adopted across multiple product teams and cut new-feature UI time by around 35%. And I raised **unit test coverage from near-zero to 85%** using Jasmine and Karma, which became the team's quality benchmark."

## 4.2.2 Anticipated Questions

**Q: Design a reusable component library — what did you consider?**
> Three things. **API design** — small, composable, prop-driven, no framework-specific idioms leaking. **Theming** — token-based (colors, spacing, radii) so financial products with different brand palettes could adopt without forking. **Governance** — versioning (semver), a migration guide per breaking change, and Storybook as the source of truth.

**Q: Why 85%, not 100%?**
> Diminishing returns. The last 15% is usually UI wrappers, generated code, or defensive branches. I set 85% as a **quality gate**, not a ceiling. Real signal is **branch coverage on critical business logic** — that was closer to 95%.

**Q: Hardest thing to test in Angular?**
> Async streams with side effects — a service that debounces a search, cancels the previous request, updates a store. Marble diagrams from `TestScheduler` are the honest way; without them tests either flake or lie.

**Q: Flaky tests — how did you handle them?**
> **Never retry to green.** Every flake gets a ticket: reproduce locally with `--headed`, find root cause (usually a race between animation completion and assertion), fix or delete. We had a shared "flake board" in the retro.

**Q: Give a concrete example from the component library.**
> Drag-and-drop table with virtualized rows. Angular CDK gave us the primitives; the hard part was drop-zones spanning virtualized (hidden) rows. I built a shadow position tracker keyed on row index — smooth scroll during drag by boosting scroll speed near the viewport edge. Went from "unusable at 10k rows" to "smooth at 100k."

---

# 4.3 Project — Capgemini (2018–2020)

Keep short — 8 years old, low priority.

**60-second pitch:**
> "At Capgemini I built internal automation tools for three delivery teams. Angular 5+ frontends, Node.js / Express APIs, Java Spring Boot backends with SQL data stores. I also authored the team's REST API documentation standard, which sped up onboarding for new engineers."

**Anticipated:**
- **"What did you learn?"** → Fundamentals: HTTP, REST, testing discipline, code review as a learning tool.
- **"Any regret?"** → Yes — I didn't push hard enough for TypeScript early. We hit two bad bugs that types would have prevented.

---

# 4.4 Side Project — NiftyLens (AI Stock Research)

*Memory hook: **"4 hours of research → 30 minutes — AI does the reading, I do the thinking."***

**Truth clause:** This is a **portfolio-style prototype**. Own it as: *"personal side project, deployed to Vercel, real code on GitHub, growing use as I add features."* Don't oversell it.

## 4.4.1 60-Second Pitch

> "NiftyLens is a personal side project — an AI-assisted Indian stock research platform. It pulls fundamentals from NSE/BSE public data feeds, runs them through a 100-point scoring framework, and uses Claude API to generate plain-English analysis summaries. I built it because an Indian equity content channel I follow does the same research manually — I wanted to see if I could compress a 4-hour workflow into 30 minutes."

## 4.4.2 Architecture

```
      ┌────────────────────────────────┐
      │   Next.js 15 App (Vercel)      │
      │   RSC + Client Islands         │
      └───────────────┬────────────────┘
                      │
       ┌──────────────┼─────────────────┐
       │              │                 │
       ▼              ▼                 ▼
 ┌──────────┐  ┌──────────────┐  ┌────────────┐
 │ NSE/BSE  │  │  Claude API  │  │ DynamoDB   │
 │  Data    │  │ (analysis    │  │ (cache +   │
 │  feed    │  │  summaries)  │  │  scores)   │
 └──────────┘  └──────────────┘  └────────────┘
       │
       ▼
 ┌────────────────┐
 │ AWS Lambda     │
 │ Nightly batch  │
 │ (scoring job)  │
 └────────────────┘
```

## 4.4.3 What's Real, What's WIP

- ✅ Next.js frontend deployed on Vercel.
- ✅ 100-point scoring framework (Excel → codified in TS).
- ✅ Claude API integration with streaming responses.
- ⚠️ DynamoDB is small-scale; if it grew I'd move to RDS Postgres for relational queries.
- ⚠️ NSE/BSE data via public JSON endpoints — rate-limited; production would need a paid feed.

## 4.4.4 Anticipated Questions

**Q: How do you handle Claude API rate limits and cost?**
> Three tactics: (1) **cache** analyses per (ticker, date) in DynamoDB — no re-generation for the same day. (2) **Prompt design** to fit under 4K tokens output, saving cost. (3) **Batching** in a nightly Lambda run for the top ~200 tickers so peak API traffic is off-hours.

**Q: How do you validate LLM output?**
> Two ways. **Schema validation** — Claude returns JSON matching a Zod schema; anything malformed is discarded. **Cross-check** — key numeric claims (P/E, market cap) are pulled from the fundamentals feed, not the LLM. LLM only generates the **narrative**, never the facts.

**Q: Why Next.js over CRA / Vite SPA?**
> SEO for public stock pages (some traffic from search), server components for cheap streaming fetches from the fundamentals API, and Vercel edge cache for static ticker pages. Also a chance to work with the 2026 stack (RSC + server actions).

**Q: What did you learn?**
> Two things. First, **LLM cost dominates fast** if you don't cache — my second week's bill was 5× the first. Second, **prompt engineering is real engineering** — I have a versioned prompt library and evals for each change, same rigor as code.

**Q: Would this scale to 1000 concurrent users?**
> Read path: yes — Vercel edge + DynamoDB scale flat. Write path (analysis generation): I'd move from sync API calls to a queue (SQS) + worker + WebSocket push. Cost model would flip to a paid tier / API-key-per-user.

---

# 4.5 Side Project — PerfScan (Perf Regression CLI)

*Memory hook: **"CI-friendly Lighthouse for real teams."***

## 4.5.1 60-Second Pitch

> "PerfScan is an open-source Node.js CLI I wrote that runs Lighthouse across a list of routes and flags LCP / INP / TBT regressions before a PR merges. It integrates with GitHub Actions and posts a diff comment on the PR. It came out of my SAP work — I got tired of Lighthouse CI's noise and wanted something that focused on **regression, not raw score**."

## 4.5.2 Architecture

```
GitHub Actions ──▶ npx perfscan ──▶ Playwright launches Chromium
                                       │
                       ┌───────────────┼────────────────┐
                       ▼               ▼                ▼
                Lighthouse audit  Baseline fetch   Route matrix
                       │               │                │
                       └────┬──────────┴────────────────┘
                            ▼
                     Diff & threshold check
                            │
                            ▼
                   GitHub PR comment API
```

## 4.5.3 Anticipated Questions

**Q: What does PerfScan do that Lighthouse CI doesn't?**
> Three things: (1) **route-matrix config in one yaml** instead of scripting each URL, (2) **baseline strategy** — compare against last green `main`, not a fixed number, so team can iterate without moving goalposts, (3) **PR comment format** with the specific offending components (via source-map attribution).

**Q: How do you avoid flaky perf numbers?**
> Three runs per route, take the **median**. Warm-up run discarded. CPU / network throttled consistently (`slow4G`, `4× CPU`). Run on a dedicated GitHub Actions runner label to avoid noisy neighbors.

**Q: Would you switch to Playwright's built-in perf metrics?**
> For INP yes — Playwright's `page.evaluate(() => performance.getEntriesByType('event'))` is closer to real user experience. Lighthouse is a **synthetic** model; INP requires actual interactions. PerfScan v2 is on that path.

**Q: Adoption?**
> Used it inside SAP as an internal tool. If you're asking about GitHub stars — honest answer, single-digit, it's a personal tool I open-sourced. The lesson is I learned CI internals and wrote real, shipped Node.js code that other engineers actually depend on.

---

# 4.6 Awards & Recognition — How to Talk About Them

**Rule:** State the award in one sentence, then pivot to **what it was for**, not the trophy.

- **SAP Excellence in Frontend Engineering (2023)** — *"Recognition for the Launchpad rewrite hitting Lighthouse 95+ and WCAG-AA. The award was nice; the interesting part is what shipped."*
- **Speaker at SAP Internal Tech Forum (2023)** — *"Presented 'Frontend Performance Patterns at Scale' — code-splitting, image strategy, memoization discipline. Slides were adopted by two other SAP product teams."*
- **Bosch Bravo ×3 (2021–2022)** — *"Three delivery awards during the dashboard rollout — factory downtime is expensive, deadlines are non-negotiable."*
- **Oracle Star Award (2020–2021)** — *"For component library authorship and test coverage uplift."*

**Trap:** *"Do you always work overtime for awards?"* Answer: *"No — awards were outcomes of scoped, sustainable work. I'm suspicious of any culture where 'hero mode' is the recognition path."*

---

# 4.7 Rapid-Fire Cross-Project Comparisons

**Q: Compare the three main projects.**

| Axis | SAP Launchpad | Bosch Dashboards | Oracle FS |
|---|---|---|---|
| Stack | React + Redux + TS + MFE | Angular + RxJS + STOMP WS | Angular + Java Spring |
| Users | Enterprise, thousands DAU | ~50–100 operators / plant | Bank ops teams |
| Perf lever | Bundle + lazy load + CDN | WebSocket backpressure | SQL query tuning + caching |
| Testing | Playwright + Vitest + a11y | Jasmine + marble tests | Jasmine, coverage push |
| My scope | Frontend architecture lead | IC on frontend + backend integration | IC full-stack |

**Q: Which was hardest?**
> Launchpad — because it wasn't a green-field build. Migrating a 10-year-old jQuery codebase while three teams kept shipping features is a completely different kind of engineering from starting fresh. It's **social + technical**, not just technical.

**Q: Which taught you the most?**
> Bosch — first time I worked with real-time streams end-to-end. RxJS operators, backpressure, reconnection, at-least-once semantics — those concepts stuck with me and paid off later in Launchpad.

**Q: Which are you proudest of?**
> Launchpad's WCAG-AA push. Numbers were nice, but the day a customer's blind analyst emailed to say "I can use your product now" — that's the moment I remember.

*(That's a real emotional beat. Use it. Interviewers remember stories with feelings, not features.)*

Next → **Chapter 5 — Resume Keyword Interrogation.**
