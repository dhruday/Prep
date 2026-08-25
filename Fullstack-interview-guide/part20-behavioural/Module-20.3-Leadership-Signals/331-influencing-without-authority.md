# Influencing Without Authority
> Part 20 — Behavioural & Leadership · Full Stack Leadership Signals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What it means**: getting people to align on your idea, adopt your approach, or change their behaviour without being their manager — no direct reports, no reporting authority, pure persuasion through reasoning and evidence
- **Why interviewers ask this**: as engineers approach staff level, impact grows through influencing others, not just through personal delivery; "tell me about a time you influenced without authority" is a staff-level screening question
- **The three influence tools**: (1) evidence — data, benchmarks, test results; (2) risk framing — "if we don't change this, here's the cost"; (3) addressing their specific concerns — don't argue against them, resolve them; never: appeals to seniority, ego, or "I know better"
- **Best stories from Hruday's experience**: (1) MFE RFC — won 4 team lead buy-in with a documented proposal and addressed objections; (2) performance budget CI gate — convinced team to add a blocking CI check that would fail their own PRs; (3) WCAG design involvement — got design team to change their process (review for WCAG at wireframe) without being their manager
- **The evidence move**: "I didn't ask them to trust me — I showed them data" is the single most powerful phrase in influence-without-authority answers; quantified evidence removes the authority gap
- **What bad influence sounds like**: "I kept pushing until they agreed" — that's pressure, not influence; good influence means the other person agrees because they now see what you see, not because you wore them down

---

## 1. One-Line Definition
Influencing without authority means changing another team's or person's decision, practice, or approach through evidence, risk clarity, and addressed concerns — not through management direction, seniority positioning, or persistence pressure.

---

## 2. The Problem It Solves

At senior and above, most high-impact work crosses team boundaries. You see a risk no one else is tracking. You know a better architectural approach than the one another team is planning. You need design to change a process. But you have no authority over them — no reporting line, no escalation lever.

Two approaches fail:
1. Pushing harder — "I kept raising it until they did it" — erodes trust and creates resentment; teams comply once, then start avoiding you
2. Backing off — "It wasn't my team's problem" — signals a limited scope; staff engineers don't stop at their boundary when they see a problem

The approach that works: make others want to agree with you. The way to do that is to see the problem from their perspective, address their actual barrier (not the barrier you assume they have), and give them evidence they can trust independently of your word.

---

## 3. How It Works Internally

### The Influence Toolkit

```
Tool 1: DATA AND EVIDENCE
  People don't resist evidence — they resist opinion. 
  Turn your recommendation into something testable.
  
  Instead of: "We should switch to TimescaleDB — it's better for time-series."
  Say: "I ran both on our actual data. Postgres B-tree: 4.2 seconds on 
      a 90-day range query. TimescaleDB hypertable: 280ms. Same SQL. 
      Here are the screenshots."
  
  Now there's nothing to argue with — the data speaks. 
  Accept or reject the data; you can't reject my authority.

─────────────────────────────────────────────────────────────────────────

Tool 2: RISK FRAMING
  People act faster to avoid a loss than to achieve a gain. 
  Frame inaction as accepting a risk, not just "missing an improvement."
  
  Instead of: "We should add the CI performance budget gate."
  Say: "Without this gate, our Lighthouse score degrades 2-3 points 
      per sprint on average — we've had 18 months of evidence for this.
      At that rate, we'll be back below 85 in 3 sprints. The gate 
      takes one day to set up and prevents the next remediation sprint."
  
  The decision: spend 1 day now or 1-2 sprints in 3 months.

─────────────────────────────────────────────────────────────────────────

Tool 3: ADDRESSING THEIR SPECIFIC CONCERN
  The fastest path to yes is removing the specific thing 
  that makes them hesitant. Not arguing against their concern — 
  solving it.
  
  Team lead's concern: "Module Federation will be hard to debug 
                        when a runtime integration fails."
  
  Wrong response: "Runtime failures are rare. The benefit outweighs the risk."
  (This dismisses the concern. They don't agree, they just stop arguing.)
  
  Right response: "You're right — without instrumentation, federation 
                   failures are opaque. I added distributed tracing tags 
                   to the module loading steps. Each MFE load now emits 
                   a trace span. Here's what the failure trace looks like."
  (This solves the concern. Now they have no remaining barrier.)

─────────────────────────────────────────────────────────────────────────

Tool 4: SHOWING THE PATH FOR THEM
  People don't adopt a new approach if the cost of adoption is 
  high and the burden falls on them. Lower the adoption cost.
  
  Instead of: "Each team should migrate their module to the new federation config."
  Do: Write a step-by-step integration guide. Build a reference implementation 
      they can copy. Run a 2-hour enabling session per team. 
      "I've done the hard part. Your migration is a 4-step process 
      in the guide. I'll be available for questions during the week."
  
  Now saying yes is easier than saying no.
```

---

## 4. The Script

### Without Authority — Weak Version

```
Interviewer: "Tell me about influencing without authority."

❌ Weak answer:
"I've always been good at convincing people. On the MFE project, 
I felt strongly about the architecture and I kept making the case 
for it until the other team leads agreed. It took a few weeks but 
eventually they came around. I think persistence is important."

Problems:
  - "I felt strongly" — no evidence mentioned
  - "Kept making the case" — no specific arguments, no data
  - "Eventually they came around" — wore them down vs. convinced them
  - "Persistence is important" — the lesson is 'push harder', 
    not 'give them better evidence'
  - No specific concern addressed
```

```
✅ Evidence + addressed concerns framing:

"When I proposed the micro-frontend architecture at SAP, I had 
no authority over the four team leads whose teams would need to migrate.

I knew push-based persuasion wouldn't work — four engineers with 
strong opinions and busy sprints don't move because a peer 
thinks something is a good idea.

I wrote an RFC with three sections that were specifically designed 
to address their concerns before they voiced them:

Section 1 — the problem quantified: 'In the last 6 months, cross-team 
release coordination has delayed 4 deployments by an average of 3 days each. 
Here are the Jira ticket numbers.'

Section 2 — the options I evaluated: three architecture approaches, 
each with its benefits and its specific costs. I chose Module Federation 
and showed explicitly why the alternatives were worse for our specific context
— not just that Federation was good.

Section 3 — Objections and Responses: I wrote down the two objections 
I expected and answered them in the document before the first meeting.

When one team lead raised the debugging complexity objection — 
which I'd anticipated — I had the answer ready and had already 
built a prototype that demonstrated the tracing instrumentation.

His response was: 'OK, if I can see the failure in the trace, 
I can debug it.' That shifted his position without me needing 
to push or persuade.

All four signed off after two rounds of async review. No one was 
worn down — they agreed because I'd answered their actual concerns 
with evidence and working code."
```

---

## 5. Interview Questions & Model Answers

### Q1 — Classic Framing
**Interviewer asks:** "Can you give me an example of influencing a technical decision without having formal authority over the outcome?"

**Hruday's answer:**
> At SAP, I convinced the design team to change part of their process — specifically to review designs for WCAG colour contrast compliance at wireframe phase rather than leaving it to engineering review.
>
> I didn't manage the design team. I couldn't direct their process. And asking them to "care about accessibility" without context wouldn't move anything.
>
> What I did: I showed the design lead one concrete example of what happens without early involvement. We had two components in the current codebase where the engineering team caught contrast violations post-implementation. That meant two components had to be visually redesigned after high-fidelity mockups were completed and developer handoff was done. I estimated the cost: one sprint of rework for engineering, plus a re-export + re-spec cycle for design.
>
> Then I showed her what the change looked like: a 30-second check with a Figma contrast plugin on any colour pair before a design frame was marked ready for handoff. Thirty seconds of prevention vs. one sprint of fix.
>
> She agreed immediately. The reason: I made the cost of the current way visible and made the cost of the new way tiny. She didn't need to trust my judgment — the numbers did the work.

---

### Q2 — When Influence Didn't Work First Try
**Interviewer asks:** "Tell me about a time you tried to influence a decision but didn't succeed initially."

**Hruday's answer:**
> When I first proposed adding a CI performance budget gate to our Angular project, the tech lead's response was "that'll block the team's PRs unnecessarily — we don't need another failing gate." His concern was legitimate: we'd had a period of overly strict linting rules that blocked valid PRs for minor style issues. He'd been burned by gatekeeping.
>
> My first response was wrong — I argued the benefits again. He pushed back again. Argument was not the right tool.
>
> I stepped back and addressed his specific concern directly. I proposed: "Let's run the gate in warn-only mode for two sprints. It logs the violation but doesn't block the build. At the end of two sprints, we review the warnings together — if the gate would have blocked good work, we remove it; if it's only catching genuine regressions, we flip it to blocking mode."
>
> He agreed to two sprints of warn-only. In those two sprints, the gate flagged two PRs that would have dropped the Lighthouse score below 85. Both were genuinely problematic (a new 1.2MB image added uncompressed, and a synchronous script added to the document head). He reviewed those warnings, saw they were valid, and approved switching to blocking mode himself.
>
> The lesson: when the first approach doesn't work, don't push the same argument harder. Understand the specific objection and propose the minimum viable version that removes the risk for them.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Confusing persistence with influence | "I kept making the case until they agreed" | "I addressed their specific concern with working code; they agreed because their concern was solved, not because I outlasted them" |
| Claiming the decision as yours | "I made the decision to implement Module Federation" | "I wrote the RFC and won alignment from 4 team leads; the decision was collective — I drove the process and provided the evidence" |
| No mention of the other person's perspective | Story is entirely about your idea, no mention of what the other person was worried about | Always name what the other person's concern or barrier was, and specifically what you did to address IT (not your general case) |

---

## 7. Hruday's Real Experience Hook
> "The clearest thing I've learned about influence-without-authority: the person who wins the technical debate isn't the one with the strongest opinion — it's the one who has already built the prototype and run the benchmark. At SAP, when I showed the TimescaleDB vs. Postgres query result side by side rather than asserting 'TimescaleDB is better for this,' the conversation changed immediately. Data removes the authority gap. If you're right, prove it with something testable. If you can't prove it that way, you should probably not be that confident about it."

---

## 8. Scale Evolution

**IC3 →** Influencing within your team — suggesting a better testing approach, recommending a library to the tech lead; the audience is small and the stakes are low.

**Senior / IC5 →** Influencing across teams — RFC process, cross-team design reviews, changing another team's process (design's WCAG workflow, QA's parallel spec approach); the audience is larger, stakes are higher, written evidence is more important.

**Staff / principal →** Influencing across the org — proposing a cross-platform API contract standard, changing a department-level practice, influencing a product roadmap decision; the audience may be VPs; the case must be quantified, the risk must be risk-weighted, the proposal must show a feasible path to adoption.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Engineering-led culture; technical proposals go to engineering leads who will debate them; influence-without-authority is the primary tool for getting cross-team adoption of a standard | RFC culture, async alignment, evidence-based proposals |
| Swiggy / Meesho | Fast growth means constant cross-team dependencies; the ability to get alignment quickly (without waiting for management escalation) is highly valued | Speed of alignment; low-friction cross-team collaboration |
| Adobe / Microsoft | Staff+ interviews at these companies explicitly evaluate cross-org influence; "how have you changed a practice beyond your immediate team?" is a standard staff interview question | Written proposals, org-wide adoption stories |
| SAP Labs | Current employer; the MFE RFC, design team WCAG process change, and CI performance gate adoption are all influence-without-authority stories | Real, recent, specific — fully verifiable |

---

## 10. Related Topics — What to Study Next

- **Topic 330 — Cross-Team Collaboration** — the context in which influence-without-authority plays out; the two topics are complementary
- **Topic 324 — Story 5 (Micro-Frontend Architecture)** — the source story for the 4-team RFC influence example
- **Topic 332 — Technical Vision** — vision without influence-without-authority doesn't implement itself; the two topics are inseparable at staff level
- **Topic 316 — STAR Method** — the answer structure for influencing stories uses the same STAR frame; Action is where the influence mechanism lives

---

*Part 20 · Influencing Without Authority · Full Stack Interview Guide · Hruday D · 2026*
