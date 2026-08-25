# Why Micro-Frontends, Not a Monolithic React App
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.5: The Architecture Decisions
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The problem a monolith creates at scale**: 4 teams sharing one React codebase means one team's breaking change halts everyone; one team's failing test blocks all four deployments; one team's CSS or dependency choice affects all four teams — delivery velocity slows dramatically when teams are coupled
- **The specific organisational constraint**: Teams A, B, C, D each own a different product area (reports, dashboards, analytics, admin); they have different release cadences, different tech choices (SAP UI5, React, Next.js), and different on-call rosters; forcing them into one codebase conflates their independence
- **The micro-frontend benefit in one sentence**: "Each team deploys their module independently; a deployment in Team A has zero effect on Team B's running module in the user's browser."
- **The cost of micro-frontends — be honest about it**: runtime complexity (Module Federation setup, shared dependency hell), operational cost (4 CDN deployments instead of 1), debugging complexity across module boundaries, CSP maintenance, SRI hash updates — these costs are real; the decision is right only when organisational independence outweighs runtime complexity
- **The decision rule**: if > 2 teams owning > 2 distinct product areas need independent deployment cadence → micro-frontends are worth the cost; if it's 1 team building one product, a monolith is faster and simpler
- **What made micro-frontends the right call for this project**: 4 teams, distinct tech stacks, enterprise modules that could be licensed and deployed independently, SAP's existing investment in WAS-hosted micro-apps — the organisational reality drove the architecture, not the other way around

---

## 1. One-Line Definition
Micro-frontends were chosen over a monolithic React app because the organisational reality — 4 independent teams, 3 different tech stacks, independent release cadences — made a shared codebase a coupling problem, not a code problem.

---

## 2. What the Monolith Would Have Cost

```
SCENARIO: One shared React monolith for 4 teams

DEPLOYMENT COUPLING:
  Team A finds a critical bug in their SAP UI5 reports module
  They need to deploy a fix immediately
  But the CI pipeline runs all 4 teams' tests before allowing a deployment
  Team C's tests are currently failing (unrelated to Team A's change)
  Team A cannot deploy until Team C's tests pass
  → Team A is blocked by a team they have no control over

TECH STACK CONFLICT:
  Team C wants to use Next.js server-side rendering for SEO and perf
  Team D wants Angular for their admin module (existing team expertise)
  Neither can be added to a React monolith without major bundler complexity
  Both teams are forced to use React instead
  → Teams make suboptimal technology choices because of the shared codebase

OWNERSHIP AMBIGUITY:
  A performance regression appears in the bundle
  Which team's code caused it? The bundle contains 4 teams' code merged together
  Debugging requires all 4 teams in a war room
  → Incident response is slow because accountability is unclear

SCALING TEAM VELOCITY:
  As each team adds engineers, the shared codebase grows
  PR review queues grow because all teams review the same codebase
  Merge conflicts increase
  Code ownership becomes unclear
  → Classic "too many cooks" problem in a growing engineering organisation
```

---

## 3. What Micro-Frontends Gave Each Team

```
WHAT CHANGED WITH MODULE FEDERATION:

              BEFORE (hypothetical monolith)     AFTER (micro-frontends)
              ─────────────────────────          ────────────────────────
Deployment    All 4 teams deploy together        Each team deploys independently
CI pipeline   Shared — all tests must pass       Per team — only your tests gate you
Tech stack    React only                         SAP UI5 (A), React (B+D), Next.js (C)
Bundle        One 2.1 MB bundle                  4 separate bundles; only load what's needed
Incidents     War room for all teams             Incident owner is clear — it's your module
CDN           Single deployment                  4 CDN origins (managed separately per team)
Release cadence  Aligned across all teams        Independent — Team B ships daily, Team D weekly

CONCRETE EXAMPLE:
  Team B's dashboard module had a p0 rendering bug in production
  Team B identified the issue, confirmed the fix, opened a PR, merged, deployed
  Time from identification to production: 47 minutes
  Teams A, C, D: not involved; their users saw no disruption

  In a monolith, that 47-minute fix would require:
    PR open + all 4 team's CI must pass (Team C flaky tests add 20-40 minutes)
    Approval from shared codebase maintainer (queue)
    Deployment of the full application (all teams' code re-deployed)
  Estimated time in monolith: 2-4 hours, plus risk of introducing Team C's current
  failing test into the fix branch
```

---

## 4. When Micro-Frontends Are NOT the Right Choice

```
THIS IS IMPORTANT TO SAY IN AN INTERVIEW — it shows you're not dogmatic:

Micro-frontends are the wrong choice when:
  1. One team owns the whole product
     → Complexity of Module Federation with no independence benefit
  2. The app is simple (< 50,000 LOC)
     → Monolith is faster to build and easier to understand
  3. Teams are not actually independent
     → If business logic is shared (e.g., a single checkout flow owned by
        multiple teams), the coupling at the code level becomes a coupling
        at the network/API level instead — just as bad, harder to debug
  4. The engineering team doesn't have the operational maturity
     → 4 CDN deployments, 4 Dockerfiles, shared dep versioning, CSP
        maintenance, SRI hash management — these require a DevOps investment
        that a small startup doesn't have

FOR SAP BI LAUNCHPAD, THE CALCULUS WAS CLEAR:
  4 existing product areas with distinct ownership → ✅
  3 different tech stacks already in use → ✅
  Enterprise modules individually licensed and deployed → ✅
  SAP existing micro-app infrastructure → ✅
  The organisational reality already necessitated independence
  The architecture followed the org structure, not the other way around
  (Conway's Law in practice: "the architecture mirrors the communication
   structure of the teams that built it")
```

---

## 5. Interview Questions & Model Answers

### Q1 — The Justification
**Interviewer asks:** "Why did you choose micro-frontends? Isn't that over-engineering for most apps?"

**Hruday's answer:**
> "For most apps, yes — it is. One team building a product should use a monolith. The complexity cost of micro-frontends — multiple CDN deployments, Module Federation setup, shared dependency versioning, CSP maintenance — is only worth it when the organisational benefit is real. In our case, the calculus was clear. Four separate teams already owned four distinct product areas. They had different tech stacks — SAP UI5 for the reports module, Next.js for analytics, React for dashboards and admin. They had different release cadences. Forcing them into one codebase would have meant one team's failing tests block all others, one team's tech choices constrain all others, and deployment independence is impossible. The decision was driven by Conway's Law: the system architecture reflects the team communication structure. Four independent teams already existed; the architecture had to give them actual independence, not just organisational independence with technical coupling."

---

### Q2 — Trade-Off
**Interviewer asks:** "What would you give up if you went back to a monolith?"

**Hruday's answer:**
> "The operational complexity, mostly. In a monolith, there's one build system, one CI pipeline, one CDN deployment, one security scan. With four micro-frontends, that's multiplied by four — four CDN deployments, four CI setups, four CSP domains to maintain, four SRI hashes to update each release. The debugging story is also simpler: in a monolith, you have one stack trace in one repo. Across micro-frontends, a user-visible bug might span a shell interaction with a module interaction, and the stack traces are in different repos. I'd take the monolith for a single product with a single team any day. For four teams with actual independence requirements, the micro-frontend cost is worth it — but I wouldn't make that choice for a startup or a small product."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Evangelism without nuance | "Micro-frontends are the future; every large app should use them" | Honest cost/benefit: right for 4 independent teams; wrong for a single team; the org structure must justify the complexity |
| No specific problem named | "It's better for scalability" | Name the concrete monolith problem: Team A can't deploy because Team C's tests are failing; tech stack forced on teams that want different choices |
| No cost admitted | "The benefits are clear" | Name the costs: 4 CDN deployments, CSP maintenance, SRI hash management, Module Federation setup, cross-module debugging complexity |
| No decision rule | "We chose it for this project" | State the decision rule: > 2 teams, > 2 distinct product areas, independent cadences → micro-frontends worth the cost |

---

## 7. Hruday's Real Experience Hook

> "The most validating moment for the micro-frontend decision came six weeks after we launched. Team B shipped a p0 fix in 47 minutes — from bug identification to production. I remember thinking: in a monolith with four teams, that fix would have waited behind Team C's flaky integration tests. Nobody on Team B had to coordinate with anyone. They owned their module, they fixed their module, they deployed it. The architecture gave them the autonomy the org structure was supposed to provide but a monolith would have prevented."

---

## 8. Scale Evolution

**2 teams, pilot →** Module Federation with 2 remotes. Shared dep contract in a config file. One shell team and one product team.

**4 teams, production →** CSP with 4 CDN domains. Shared component library. SRI automation in CI. Cross-team event bus contract. Quarterly dep alignment review.

**10+ teams →** Module federation manifest served dynamically (new modules registered without shell deploy). Runtime capability negotiation. Dedicated platform team owns shell, shared deps, event bus, and the CSP management layer.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Multiple product areas (checkout, dashboard, merchant onboarding) owned by different teams; independent deployment cadence is critical for p0 fixes | Honest cost/benefit; Team independence as the driver |
| Swiggy / Meesho | Consumer platform: restaurant listing, cart, checkout, profile — distinct ownership; high deployment frequency | Conway's Law explanation; module isolation for incident ownership |
| Adobe / Microsoft | Platform with many plugin modules or product areas (Creative Cloud suite, M365 apps); micro-frontends align with product team structure | Organisational autonomy at scale; shared component library investments |
| SAP Labs | You made this decision and lived with the consequences — you know the cost (CSP, SRI, debugging across modules) and the benefit (47-minute p0 fix) | The candidate who can argue both sides and explain exactly why this was the right call for this project |

---

*Part 23 · Why Micro-Frontends, Not a Monolithic React App · Full Stack Interview Guide · Hruday D · 2026*
