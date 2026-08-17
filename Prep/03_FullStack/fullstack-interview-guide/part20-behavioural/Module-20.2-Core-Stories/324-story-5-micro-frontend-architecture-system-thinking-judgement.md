# Story 5 — Micro-Frontend Architecture: System Thinking, Judgement
> Part 20 — Behavioural & Leadership · Hruday's Core Stories · ✅
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Story type**: Technical system design, architectural judgement, influencing a technical direction, cross-team RFC process
- **When to use**: "Tell me about a high-impact technical decision you made" · "Describe a time you proposed a significant architecture change" · "When did you deal with ambiguity and make a technical judgement call?" · "Tell me about influencing a technical direction across teams"
- **The headline numbers**: 4 teams went from quarterly coordinated releases to weekly independent deploys; zero cross-team deploy coordination required; deploy frequency quadrupled
- **The key systems-thinking signal**: I didn't just solve my team's problem — I proposed an architecture that benefit 4 teams, got buy-in via an RFC process, and implemented the Shell myself; that's the breadth + depth combination that signals staff-level thinking
- **Growth layer**: "I'd add inter-MFE contract tests to CI from the start — we had one runtime incompatibility catch in smoke testing after the Dashboard MFE renamed its exported component; contract tests would have caught that at CI time, not post-deploy"
- **Story length**: ~2.5 minutes (slightly longer because it's an architecture story — acceptable at senior level)

---

## 1. One-Line Definition
A 2.5-minute STAR story about proposing, getting buy-in for, and implementing a Webpack Module Federation Shell architecture at SAP Labs that allowed 4 frontend teams to deploy independently — eliminating the quarterly coordinated release bottleneck.

---

## 2. Story Summary

| | Detail |
|---|---|
| **Company** | SAP Labs |
| **Product** | Suite of related procurement frontend applications — 4 teams, shared Angular monorepo |
| **Starting state** | Coordinated quarterly releases — any team's bug blocked all four teams' deploys; 18-minute builds; 4 teams touching the same monorepo |
| **Problem I identified** | Team coupling via a shared monorepo was the bottleneck; it wasn't a code quality problem, it was an architecture problem |
| **My role** | Proposed the RFC; wrote the architecture document; won buy-in from 4 team leads; implemented the Shell and the Module Federation config; ran onboarding sessions for other teams |
| **Result** | Deploy frequency: quarterly → weekly per team; Shell in production; 4 MFEs independently deployed; zero cross-team release coordination |

---

## 3. Full STAR Script (2.5 minutes)

### Situation (12 seconds)
"At SAP Labs, four frontend teams were working in a shared Angular monorepo that deployed together. A single regression in any team's code blocked all four teams from releasing. We were operating on quarterly release cycles, not because the engineering was slow — individual features were ready weekly — but because coordinating 4 teams for a joint deploy took that long."

### Task (10 seconds)
"I identified this as an architecture problem, not a process problem. Writing more tests or having better code reviews wouldn't fix it. I decided to research and propose a structural solution."

### Action (100 seconds)
"I evaluated three options and documented them in an RFC: (1) stay monorepo, improve coordination with feature flags; (2) split into separate repos but keep a compile-time bundled mono-deployment; (3) Webpack Module Federation — each team deploys their module independently to a CDN, and a Shell app composes them at runtime.

Option 3 was technically the right solution: true deploy independence. I wrote a 6-page RFC that covered the tradeoffs, the shared dependency strategy (React and design tokens as module federation singletons), error isolation (an MFE error boundary per module), and the migration path.

I presented it to the 4 team leads in a structured review session. Two leads had concerns: one about configuration complexity, one about debugging a runtime composition error when the MFE and Shell were built separately. I answered the debugging concern with distributed tracing tags on the federation loading steps. The configuration concern I addressed by extracting the federation config into a shared package with sensible defaults and team-specific overrides.

After two rounds of async feedback on the RFC document, all four leads signed off.

I built the Shell and the federation config myself in one sprint so the pattern was proven before asking other teams to migrate. I created a one-page integration guide and ran team enabling sessions — a 2-hour session with each team to onboard their module.

The migration took 6 weeks total across all 4 teams."

### Result (18 seconds)
"All four teams were deploying independently within 6 weeks. Deploy frequency went from quarterly to weekly per team. Zero cross-team release coordination needed since go-live. I also documented the Shell as a reusable internal pattern — a second product in our org adopted it 4 months later."

---

## 4. Follow-Up Questions & Answers

### Q1 — Technical Depth
**"How did you handle dependency versioning when the Shell and MFEs build separately — how do you prevent two copies of React loading?"**

> Module Federation's `shared` config in webpack solves this. I marked `react`, `react-dom`, and `react-router-dom` as singletons with a minimum version requirement (`singleton: true, requiredVersion: '>=17'`). When Module Federation resolves shared modules at runtime, it checks what version the Shell has loaded and what the MFE requires. If the Shell's version satisfies the MFE's requirement, the Shell's copy is reused — no second React instance loads. If the versions are incompatible, Federation falls back to loading the MFE's version and you get a warning in the console.
>
> In practice, this means each MFE must keep their React version compatible with the Shell's version. We pinned the Shell to React 18 and required `>=18` in all MFEs. Teams can upgrade React in their MFE only when the Shell has also upgraded. That's the constraint trade-off: you gain deploy independence on features, but shared foundational libraries require coordinated version bumps.

### Q2 — The RFC Process
**"How do you get cross-team buy-in on a technical proposal?"**

> Three parts. First — write a structured RFC, not a Slack message. The written format forces logical clarity on my own thinking before I present it. A table of "Option 1 / Option 2 / Option 3" with a "Recommended" column plus "Why I recommend it" plus "Risks" signals I've done the analysis, not just advocacy.
>
> Second — address the strongest objections in the document before the meeting. If I know Team B's lead is concerned about bundle size implications, I add a "Bundle size analysis" section that quantifies the Module Federation runtime overhead (roughly 14KB gzipped for the federation manifest). Surprises kill proposals; pre-addressed concerns become dialogue points.
>
> Third — async feedback before the decision meeting. Share the RFC for 3-4 days before the live review. Team leads come with specific comments rather than processing the document live for the first time. The meeting becomes a decision session, not a reading session.

### Q3 — Growth Layer
**"What would you do differently?"**

> I'd spec and implement inter-MFE contract tests in CI from the start. Three months after go-live, the Dashboard MFE team refactored and renamed their exported component from `DashboardApp` to `DashboardRoot`. The Shell was importing `DashboardApp`. At next deploy, the Shell showed a loading spinner that never resolved for the Dashboard route.
>
> We caught it in smoke testing, not production. Rollback was 40 minutes. But the root cause was no contract test verifying that the exported API of each MFE still matched what the Shell expected.
>
> The fix: a TypeScript schema file checked into a shared repo that defines each MFE's exported API shape. Each MFE's CI runs a validation step confirming its exports still match the schema before allowing merge. The Shell's CI validates it can consume the schema. Cross-MFE compatibility is verified at every build, not discovered at runtime.

---

## 5. Question Map — Where to Use This Story

| Behavioural Question | Angle from This Story |
|----------------------|-----------------------|
| "Tell me about a high-impact architectural decision" | The full MFE Shell design and implementation |
| "Describe a time you navigated technical ambiguity" | No existing internal pattern; chose from 3 options with explicit tradeoff analysis |
| "When did you influence a technical direction across teams?" | RFC process, 4 team leads, documented buy-in |
| "Tell me about dealing with pushback on a technical proposal" | Two leads' concerns addressed specifically |
| "Describe a time you improved engineering delivery velocity" | Quarterly → weekly deploys |
| "Give an example of thinking beyond your immediate team" | Second product org adopted the pattern |

---

## 6. Numbers Reference Card

| Metric | Before | After |
|--------|--------|-------|
| Deploy frequency | Quarterly per platform | Weekly per team |
| Cross-team release coordination | Required for every deploy | Zero coordination needed |
| Teams deploying independently | 0 | 4 |
| Monorepo → independent MFE migration | — | 6 weeks |
| Shell pattern adoption (other products) | — | 1 additional product, 4 months later |

---

## 7. Related Topics — What to Study Next
- **Topic 315 — Micro-frontend Shell** — the technical deep dive behind this story; know the Module Federation `shared` config, error boundaries, and manifest-based versioning
- **Topic 330 — Cross-Team Collaboration** — the RFC process and 4-team buy-in is the foundation of this topic
- **Topic 331 — Influencing Without Authority** — writing the RFC and winning buy-in from leads without being their manager is classic influence without authority

---

*Part 20 · Story 5: Micro-Frontend Architecture · Full Stack Interview Guide · Hruday D · 2026*
