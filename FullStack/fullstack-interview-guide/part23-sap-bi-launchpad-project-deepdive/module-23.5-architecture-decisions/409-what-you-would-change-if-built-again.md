# What You Would Change If Built Again
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.5: The Architecture Decisions
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why this question matters**: it tests whether you have genuine engineering judgment and can reflect honestly, or whether you'll give a fake "I wouldn't change anything" answer — interviewers want to see self-awareness and growth
- **The right tone**: not "we made mistakes" and not "everything was perfect" — the right tone is "given what we knew then, those were good decisions; now with hindsight and new technology, here's what I'd do differently and why"
- **Four honest things to change**: (1) accessibility from day one instead of fixing 33 violations retrospectively in a sprint; (2) React Server Components instead of Next.js as a separate module — Next.js as a full app within Module Federation is complex; RSC in React proper would be simpler; (3) design token contract between shell and modules from the start — teams ended up with colour and spacing inconsistencies that were fixed late; (4) OpenTelemetry and a centralised observability platform from week one — we added distributed tracing late and spent weeks retrofitting trace ID propagation
- **What NOT to change**: the micro-frontend decision, Module Federation, the httpOnly cookie JWT approach, Resilience4j — these were the right calls and remain right
- **How to end the answer**: "I'd make the same architectural choices again — micro-frontends, Module Federation, Spring Boot microservices. The things I'd change are process and tooling decisions made at the start, not the architecture."

---

## 1. One-Line Definition
Four things would change: accessibility built in from day one, React Server Components instead of the Next.js-as-module approach, a design token contract enforced from the start, and OpenTelemetry observability set up before the first service was deployed — not retrofitted later.

---

## 2. Change 1 — Accessibility From Day One

```
WHAT HAPPENED:
  Accessibility was treated as a later-stage concern
  The platform ran for 18 months before the VPAT audit was done
  The audit found 33 violations across 4 modules
  A 4-week sprint was required to fix them
  One enterprise deal was stalled during the period when the VPAT showed violations

WHAT I'D DO DIFFERENTLY:
  Week 1: Add axe-core to each team's CI pipeline
  Week 1: Add accessible component primitives to the shared library
    (accessible Button, Modal with FocusTrap, accessible DataTable)
  Week 1: Share the 10 highest-impact WCAG AA criteria with every engineer
    (contrast, focus visible, ARIA labels, modal semantics, live regions)
  Sprint template: accessibility acceptance criteria on every user story
    e.g., "User can complete this action using keyboard only"

WHY THIS MATTERS:
  Fixing accessibility in a running module: 33 violations × average 2 hours = 66 hours
  Building accessible components from the start: ~10% overhead per component
  For a 400-component system: 40 hours of overhead vs 66 hours of fix sprint
  Plus: no stalled deals, no VPAT issues, no 4-week sprint disruption

WHAT TO SAY IN AN INTERVIEW:
  "Accessibility debt compounds the same way technical debt does.
   A modal with a missing role costs 20 minutes to fix at code review time.
   After it ships, it costs 2 hours to identify, document in the VPAT, fix,
   test with a screen reader, and close the issue. I'd add axe-core to CI
   in week one of every new project now."
```

---

## 3. Change 2 — React Server Components Over Next.js Module

```
WHAT HAPPENED:
  Team C needed SSR for the analytics module (LCP 5.4s → 2.1s)
  We added Next.js as a separate framework for that module
  This means:
    Module Federation with Next.js requires @module-federation/nextjs-mf plugin
    This plugin has its own versioning and compatibility constraints
    Next.js App Router + Module Federation is a cutting-edge combo with known issues
    Team C's build process is significantly different from Teams B and D
    Upgrading Next.js requires verifying Module Federation plugin compatibility first

WHAT I'D DO DIFFERENTLY (with 2024/2025 React knowledge):
  Use React Server Components (RSC) supported through Vite + vite-plugin-react-rsc
  or wait for the Vite-based RSC meta-framework that's emerging

  The benefit: RSC is React — same mental model as Teams B and D
  Server components run on the server, fetch data, send pre-rendered HTML
  No separate Next.js app; no separate build system; no separate plugin

  If RSC wasn't mature enough at the time: I'd use Vite with a separate
  express server for SSR (Vite SSR mode), which is simpler than a full
  Next.js integration with Module Federation

  The lesson: don't add a full framework to solve a performance problem
  if a lighter solution (SSR mode in Vite, RSC) can achieve the same outcome
  with less operational complexity
```

---

## 4. Change 3 — Design Token Contract From Day One

```
WHAT HAPPENED:
  Teams started building with their own colour choices
  Team A used SAP UI5's built-in design tokens
  Teams B and D created their own React colour variables
  Team C used Tailwind utility classes with customised config
  After 6 months: the four modules had 3 different shades of "SAP blue"
  User feedback: "the reports area looks slightly different from the dashboards"
  Sprint required to audit and align design tokens

WHAT I'D DO DIFFERENTLY:
  Week 1: Create a design-tokens package:
    @bi-platform/design-tokens

  It contains:
    colors.json — one source of truth for every colour
    spacing.json — consistent spacing scale
    typography.json — font sizes, weights, line heights
    Generated as CSS custom properties AND as JavaScript constants:
      --color-primary: #0050AA;
      export const colorPrimary = '#0050AA';

  All four teams add @bi-platform/design-tokens as a dependency
  SAP UI5 tokens mapped to the shared token values
  Tailwind configuration imported from the tokens file
  One colour decision in the tokens file = one change across all modules

WHY CONTRACT BEFORE CODE:
  "Design consistency is a contract between teams.
   Without the contract, each team makes locally-reasonable choices
   that globally create an inconsistent product."

  The same principle applies to API contracts, event bus types,
  and any interface between independent teams.
```

---

## 5. Change 4 — OpenTelemetry From Week One

```
WHAT HAPPENED:
  Distributed tracing (Micrometer + Zipkin) was added in month 4
  After 3 services were running in production
  Adding it retroactively meant:
    Retrofitting Micrometer into each service
    Ensuring trace ID was propagated in all WebClient calls
    Finding places where async operations (CompletableFuture, @Async) broke trace context
    3 weeks of work across multiple teams

  During month 2-4 with no tracing:
    A latency issue affecting one user journey required manual log correlation
    across 3 services to find the root cause
    That manual correlation took 4 hours
    With trace IDs it would have been under 10 minutes

WHAT I'D DO DIFFERENTLY:
  Set up OpenTelemetry (OTel) Java agent BEFORE the first service runs
  OTel Java agent is a JAR that instruments bytecode automatically
  Add it to every service's Dockerfile from day one:
    ENTRYPOINT ["java",
      "-javaagent:/otel-javaagent.jar",
      "-Dotel.service.name=${SERVICE_NAME}",
      "-Dotel.exporter.otlp.endpoint=http://collector:4317",
      "-jar", "app.jar"]

  OTEL auto-instrumentation covers:
    All Spring Boot HTTP handlers (inbound trace context extraction)
    All WebClient calls (outbound trace context injection)
    JDBC queries (span per query)
    Redis calls (span per command)
    Kafka produce/consume (span per message)

  No manual instrumentation required for 95% of tracing needs
  Trace ID flows end-to-end automatically
  Structured log output includes trace ID automatically

THE PRINCIPLE:
  Observability is not optional in a microservice system.
  You cannot debug distributed issues without trace IDs.
  Adding it after the fact is expensive.
  Adding it from day one costs almost nothing.
```

---

## 6. What Would Stay the Same

```
These decisions were right and remain right:

MICRO-FRONTENDS:
  4 teams, independent deployment, different tech stacks
  The Team B p0 fix in 47 minutes is the proof
  No regrets

MODULE FEDERATION:
  Native routing integration, shared deps, natural shell communication
  The prototype showed iFrames couldn't handle deep linking cleanly
  No regrets

HTTP-ONLY COOKIE FOR JWT:
  The security audit confirmed this was the right call
  Zero token exfiltration incidents
  No regrets

RESILIENCE4J:
  Saved us in the Analytics Engine incident
  Clear, well-supported, Spring Boot native
  No regrets

ESLINT / AXEJAIL IN CI:
  These gates catch issues before they ship
  Both added later than they should have been — but proved their value
  Would move both to week 1 in a new project
```

---

## 7. Interview Questions & Model Answers

### Q1 — The Honest Look Back
**Interviewer asks:** "What would you do differently if you built this system today?"

**Hruday's answer:**
> "Four things. First, accessibility from day one — axe-core in CI and an accessible component library from week one. We ended up with 33 violations that took a 4-week sprint to fix; the deal stall they caused was the expensive proof that accessibility debt is real technical debt. Second, React Server Components instead of Next.js as a separate module — Team C needed SSR for the analytics module, and we integrated Next.js through Module Federation, which required a special plugin and different build system. RSC in React proper would give the same SSR benefit with less operational complexity. Third, a shared design token package from day one — after six months we had three slightly different shades of 'SAP blue' across modules; a tokens package would have made that a single source of truth. Fourth, OpenTelemetry with Java auto-instrumentation set up before the first service deployed — we added distributed tracing in month 4 and spent three weeks retrofitting trace ID propagation; the month-2 latency incident that took four hours to diagnose manually would have been ten minutes with trace IDs. The architectural choices — micro-frontends, Module Federation, microservices — I'd make the same calls again. The things I'd change are the process and tooling choices made at project start."

---

## 8. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "I wouldn't change anything" | Dishonest; signals inability to self-reflect | Four specific things with specific reasons (accessibility debt, Next.js complexity, design tokens, observability retrofit) |
| "We made a lot of mistakes" | Too negative; signals poor decision-making | "Given what we knew, those decisions were reasonable; with hindsight and better tooling, here's what I'd do differently" |
| Changing the architecture | Doubting the micro-frontend / Module Federation decisions | These were right calls — own them; changes are process and tooling, not architecture |
| No specifics | "I'd do documentation better" | Name the specific tool, the specific week it should have been added, the specific incident that showed it was needed |

---

## 9. Hruday's Real Experience Hook

> "The most honest answer about 'what I'd change' came to me during the accessibility VPAT sprint. I was looking at the backlog of 33 violations, most of which were fixable in under an hour each, and calculating the total effort. Then I looked at when axe-core had been available — it's been around since 2015. If we had added axe-core to our CI pipeline in month one, these 33 violations would never have shipped. The sprint wouldn't exist. The deal wouldn't have stalled. The cost of adding axe-core in week one is a one-time 30-minute setup. The cost of not adding it was a 4-week sprint and a stalled enterprise deal. That's the kind of calculation that changes how I set up every new project."

---

## 10. Scale Evolution

**This project →** The four changes I'd make: accessibility CI gate, RSC over Next.js module, design tokens, OTel from day one.

**Next project with same architecture →** All four implemented from day one. Design tokens as the first package created in the monorepo. OTel in every service's base Docker image. axe-core in the CI template. Shared accessible component primitives.

**Team process →** These four items in the "project start checklist" — not added when problems appear. Architecture principles document updated after each project's retrospective.

---

## 11. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial systems require high observability from day one; distributed tracing for payment flow debugging | OTel Java agent from day one; trace ID in every payment log |
| Swiggy / Meesho | Fast-growing team adding services constantly; design tokens prevent brand inconsistency with scale | Design token contract; accessibility CI gate |
| Adobe / Microsoft | Enterprise products with long lifecycles; retrofitting anything is expensive at scale | "Process and tooling at project start, not at project crisis" |
| SAP Labs | You can name four specific things, the week they should have been added, and the incident that proved each one was needed | The candidate with a genuine retrospective, not a performance of humility |

---

*Part 23 · What You Would Change If Built Again · Full Stack Interview Guide · Hruday D · 2026*
