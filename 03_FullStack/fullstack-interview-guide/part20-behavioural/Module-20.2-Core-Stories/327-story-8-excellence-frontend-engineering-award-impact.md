# Story 8 — Excellence in Frontend Engineering Award: Impact
> Part 20 — Behavioural & Leadership · Hruday's Core Stories · ✅
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Story type**: Visible impact, peer/leadership recognition, demonstrated breadth across multiple technical domains in one year
- **When to use**: "What's your greatest achievement in your current role?" · "Tell me about a recognition you're proud of" · "What have you delivered that had the widest impact?" · "Tell me about the impact you've had at SAP"
- **The headline**: SAP internal "Excellence in Frontend Engineering" award at SAP Labs; awarded based on three projects in one review year — Lighthouse 60→95, WCAG AA certification, and OWASP vulnerability reduction
- **The key impact signal**: the award isn't the story — the *reason* for the award is the story; three distinct quality dimensions (performance, accessibility, security) systematically improved, each with measurable outcomes
- **Growth layer**: "I'd maintain a living impact document throughout the year rather than reconstructing the achievements for the review — I had to pull scattered data from Jira, Lighthouse CI, and Confluence at performance review time; a maintained log would have made the impact more visible all year, not just at review time"
- **Story length**: ~2 minutes

---

## 1. One-Line Definition
A 2-minute STAR story about receiving the SAP internal Excellence in Frontend Engineering award — earned by systematically improving three dimensions of quality (performance, accessibility, security) with measurable outcomes across one review year, not by any single project.

---

## 2. Story Summary

| | Detail |
|---|---|
| **Company** | SAP Labs |
| **Award** | SAP internal "Excellence in Frontend Engineering" — nominated by tech lead, confirmed by engineering manager |
| **Foundation** | Three projects that year: Lighthouse 60→95, WCAG AA certification, 78% security vulnerability reduction |
| **Why it matters for interviews** | Shows breadth: performance + accessibility + security are three separate engineering disciplines; demonstrating intentional improvement across all three in one year signals senior ownership |
| **Key framing** | Don't lead with the award; lead with the work; the award is the validation, not the story |

---

## 3. Full STAR Script (2 minutes)

### Situation (12 seconds)
"In my most recent review year at SAP Labs, our Angular procurement application had three unaddressed quality gaps: a Lighthouse score of 60, no accessibility standard with WCAG compliance needed for a government customer, and untracked security vulnerabilities in our npm dependencies."

### Task (8 seconds)
"None of these were assigned as sprint tickets. I identified all three as risks and took them on across the year alongside my regular delivery work."

### Action (75 seconds)
"For performance: I ran a Lighthouse and WebPageTest audit, identified the top three root causes — an overweight hero image, render-blocking scripts, and oversized initial bundle — and fixed all three. Lighthouse moved from 60 to 95. I then added a CI performance budget gate so the gain was maintained permanently.

For accessibility: I led the WCAG 2.1 AA certification initiative for 47 screens — the driver was a public sector customer who required it as a contract condition. I did the automated axe-core audit, manual screen reader testing with NVDA, coordinated design team changes for the two contrast ratio violations, and engaged an external auditor for the formal certification. The customer signed a contract.

For security: I ran the first-ever npm security audit on the frontend, found 23 high and medium severity vulnerabilities, reduced them to 5 through package upgrades and removals, and added an OWASP Dependency Check CI gate to prevent future silent accumulation.

In the year-end review, my tech lead nominated me for the award. The citation specifically referenced the three initiatives and noted that each one had lasting systemic impact through the CI gates I'd installed — not just point-in-time fixes."

### Result (25 seconds)
"I received the Excellence in Frontend Engineering award. To be specific about the impact:  Lighthouse went from 60 to 95; WCAG AA certification unlocked a government customer contract; security vulnerabilities dropped 78% with a CI gate that has maintained zero new unresolved vulnerabilities for 6 months. The three CI gates I installed together mean the quality gains are enforced automatically on every PR — the impact persists without manual effort."

---

## 4. Follow-Up Questions & Answers

### Q1 — How to Talk About the Award
**"What were you recognised for, specifically?"**

> Three distinct initiatives in one review cycle — not a single project, but systematic quality improvement across performance, accessibility, and security.
>
> The reason the award mattered to me isn't the recognition itself — it's what it validated: that senior engineering contribution isn't just about feature velocity. It includes making the codebase structurally better, setting standards that others follow, and creating automated enforcement mechanisms so quality doesn't regress when the team is under sprint pressure.
>
> The CI performance budget gate, the axe-core CI check, and the OWASP dependency scan — those three gates are still running on every PR today. That's the most durable part of the impact.

### Q2 — Prioritisation Under Full Sprint Load
**"If these weren't assigned tasks, how did you find time for them alongside your sprint commitments?"**

> Two things. First, I sized each initiative by identifying the minimum viable intervention that would deliver lasting impact. For security, the highest-impact action was the CI gate — 2 days of setup work, then automatic forever. I didn't spend a month patching every vulnerability manually; I built the enforcement mechanism and let it work.
>
> Second, I used "technical debt" budget. Our team had a policy of reserving 10-15% of each sprint for tech debt and engineering improvements, not allocated to feature tickets. I proposed these initiatives in that slot and got the tech lead's buy-in on prioritisation.
>
> The frame I used with my manager: "Each of these is a risk that has no ticket yet. If we ignore them, we'll spend more time later on either a compliance failure, a security incident, or a customer complaint about load time." Risk framing plus a clear minimum viable fix made the prioritisation decision easy.

### Q3 — Growth Layer
**"What would you do differently?"**

> I'd maintain a running impact log throughout the year. When performance review time came, I spent 3 hours finding all the relevant Lighthouse screenshots, audit reports, and incident conversation threads scattered across Jira, Confluence, and Slack.
>
> If I'd kept a 2-sentence running entry every time I completed a meaningful improvement — "19 Nov: Lighthouse CI budget added to pipeline; score now 95, blocks any PR dropping below 85" — the review narrative would have been assembled continuously, not reconstructed. The impact visibility would also have been better throughout the year, not just at appraisal time.
>
> Practically: I keep a Notion doc now called "Wins" where I write one sentence per significant achievement, with the date and one metric. It takes 2 minutes per entry and transforms annual review preparation from a scavenger hunt into a copy-paste exercise.

---

## 5. Question Map — Where to Use This Story

| Behavioural Question | Angle from This Story |
|----------------------|-----------------------|
| "What is your greatest achievement?" | All three initiatives; the award as validation |
| "Describe your impact in your current role" | Breadth across three quality dimensions; CI gate permanence |
| "Tell me about a recognition you received" | Lead with the work, land with the award |
| "How do you prioritise technical improvements alongside feature delivery?" | Risk framing, tech debt budget, minimum viable intervention |
| "What kind of engineer do you want to be known as?" | Engineer who improves quality permanently through enforcement, not point-in-time fixes |

---

## 6. Numbers Reference Card

| Initiative | Before | After |
|------------|--------|-------|
| Lighthouse score | 60 | 95 |
| LCP on 3G | 4.2s | 1.1s |
| WCAG screens certified | 0 | 47 |
| Security vulnerabilities | 23 | 5 (−78%) |
| CI gates installed | 0 | 3 (performance budget + axe + OWASP) |
| Award | — | Excellence in Frontend Engineering |

---

## 7. Related Topics — What to Study Next
- **Topic 320 — Story 1 (Lighthouse)** — the full Lighthouse technical story behind this summary
- **Topic 321 — Story 2 (Security)** — the full security story behind the 78% reduction
- **Topic 322 — Story 3 (WCAG)** — the full certification story
- **Topic 318 — Quantifying Impact** — this story is the multi-initiative version of the three-number model; understand the underlying framework

---

*Part 20 · Story 8: Excellence in Frontend Engineering Award · Full Stack Interview Guide · Hruday D · 2026*
