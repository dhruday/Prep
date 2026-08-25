# Story 1 — Lighthouse 60 → 95: Technical Depth, Performance
> Part 20 — Behavioural & Leadership · Hruday's Core Stories · ✅
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Story type**: Technical depth, performance engineering, quality ownership, quantified impact
- **When to use**: "Tell me about a technical challenge you owned" · "Give an example of improving performance" · "Describe a time you quantified your engineering impact" · "When did you raise the quality bar?"
- **The headline numbers**: Lighthouse 60 → 95; LCP 4.2s → 1.1s on 3G; bounce rate −18%; CI performance budget blocked 3 regressions in 6 months
- **The key decision signal**: not just fixing the problem but installing the CI gate to prevent regression — that's the senior signal: "systems thinker, not task completer"
- **Growth layer**: "I'd set up the CI budget from sprint 1 — the score regressed from 80 to 60 over 18 months of gradual regressions because there was no automated guard"
- **Story length**: ~2 minutes

---

## 1. One-Line Definition
A 2-minute STAR story about bringing an Angular enterprise app's Lighthouse performance score from 60 to 95 through three specific technical fixes and a CI enforcement mechanism that prevented regression.

---

## 2. Story Summary

| | Detail |
|---|---|
| **Company** | SAP Labs |
| **Product** | Angular-based procurement app — 200+ enterprise procurement teams across 18 countries |
| **Starting state** | Lighthouse score: 60; LCP: 4.2s on 3G; users filing support tickets about slow load times |
| **Challenge** | Internal SAP standard: Lighthouse 85+ for all production applications |
| **My role** | Sole frontend engineer on the performance initiative |
| **What I did** | (1) Lighthouse + WebPageTest audit; (2) WebP hero image + lazy loading; (3) async/defer scripts + CDN preconnect; (4) Angular lazy route modules for 3 non-critical features; (5) CI performance budget gate |
| **Result** | Lighthouse: 95; LCP: 1.1s on 3G; bounce rate: −18%; CI gate blocked 3 regressions post-deploy |

---

## 3. Full STAR Script (2 minutes)

### Situation (12 seconds)
"At SAP Labs, I worked on an Angular procurement application used by 200+ enterprise teams across 18 countries. The app had a Lighthouse score of 60 and users on our slowest network conditions — field procurement managers in lower-bandwidth offices — were filing support tickets about load times."

### Task (8 seconds)
"Our internal SAP standard required Lighthouse 85+ for all production applications. I owned the initiative to close that gap."

### Action (80 seconds)
"I started with a Lighthouse and WebPageTest audit to find the highest-impact issues. Three root causes came up:

First, a 1.8 megabyte uncompressed hero image on the landing page. I converted it to WebP format and added the native HTML `loading='lazy'` attribute. That single change dropped LCP from 4.2 seconds to 2.8 seconds.

Second, four render-blocking scripts in the document head. I moved them to async/defer and added preconnect hints for our CDN domain. That removed the thread-blocking delay on the critical render path.

Third, three Angular feature modules — Reports, Analytics, and Export — included in the initial JavaScript bundle even when the user started on the Dashboard. I route-level lazy-loaded them behind Angular's `loadChildren` — they only download when the user navigates there. Initial bundle weight dropped from 1.8MB to 380KB gzipped.

Finally, I added a Lighthouse performance budget to our CI pipeline using `@lhci/cli`. Any pull request that causes the score to drop below 85 fails the build automatically. That's the guard that prevents gradual regression."

### Result (20 seconds)
"Lighthouse went from 60 to 95. LCP dropped from 4.2 to 1.1 seconds on 3G throttled. Bounce rate on the landing page fell 18% in the first month post-deploy. And the CI budget gate has automatically blocked three pull requests that would have introduced regressions — without it, we'd likely have drifted back down within a few sprints."

---

## 4. Follow-Up Questions & Answers

### Q1 — Technical Depth
**"How did you decide which images to optimise and which scripts to move to async?"**

> I used the Lighthouse audit output as a priority list — it ranks each opportunity by estimated savings in seconds. The hero image was at the top (estimated 1.2s saving) so I tackled it first. For the scripts, I checked whether each one was required before first user interaction. Auth initialisation scripts had to stay synchronous because Angular's bootstrapping needed them. Analytics tracking scripts, a third-party heatmap tool, and a chat widget were all non-critical to initial render — those became async/defer.

### Q2 — Trade-Off
**"Why lazy load the feature modules instead of putting them all in one eagerly loaded bundle?"**

> The three modules — Reports, Analytics, and Export — were only used by about 30% of users per session. The other 70% start on the Dashboard and don't visit those sections in a given login. Making all users download those modules on every page load meant 70% of users were paying a cost for code they'd never use in that session. Lazy loading means the code is only fetched when it's needed. The trade-off is a slight initial delay when first navigating to Reports (network round-trip for the chunk), which is generally tolerable — users navigating to a new section already expect loading; they don't expect the landing page to be slow.

### Q3 — Growth Layer
**"What would you do differently?"**

> I'd install the CI performance budget gate from sprint 1, not as a remediation after the score has already fallen. The score regressed from approximately 80 (at the app's initial release) to 60 over 18 months because there was no automated guard. Each sprint, small additions — a new library here, an unoptimised image there — degraded the score by 2-3 points. If the budget gate had been in place from the beginning, we'd have caught each individual regression at code review time. The 18-month-long degradation is a tooling failure, not an engineering failure.

---

## 5. Question Map — Where to Use This Story

| Behavioural Question | Angle from This Story |
|----------------------|-----------------------|
| "Tell me about a technical challenge you owned end to end" | Full STAR story |
| "Describe a time you quantified your engineering impact" | Lead with the 3 numbers |
| "Give an example of improving user experience through engineering" | LCP + bounce rate connection |
| "When did you set a long-term quality standard?" | The CI performance budget gate |
| "Tell me about a time you identified a problem and took initiative" | Recognising Lighthouse 60 as a systemic issue, not just slow code |
| "Describe how you handle technical debt" | Lazy loading as debt repayment; CI gate as preventing future debt |

---

## 6. Numbers Reference Card

| Metric | Before | After |
|--------|--------|-------|
| Lighthouse score | 60 | 95 |
| LCP (3G throttled) | 4.2s | 1.1s |
| Initial JS bundle (gzipped) | ~1.8MB | ~380KB |
| Bounce rate (landing page) | 34% | 16% (−18pp) |
| CI regressions blocked | — | 3 in 6 months |

---

## 7. Related Topics — What to Study Next
- **Topic 316 — STAR Method** — the structure this story demonstrates
- **Topic 318 — Quantifying Impact** — the three numbers here (technical, business, durability) are the three-number model
- **Topic 319 — Keeping Stories Under 2.5 Minutes** — time the script above; it should land in ~2:00

---

*Part 20 · Story 1: Lighthouse 60→95 · Full Stack Interview Guide · Hruday D · 2026*
