# Core Web Vitals Connect to Real Business Impact
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.2: The Performance Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **LCP directly affects whether users stay or leave**: Google's research shows every 1-second LCP increase above 2.5s raises the probability of the user leaving by ~7%; our 2.8s improvement (6.2s → 3.4s) corresponds to roughly 20% fewer users abandoning before the page loads
- **TTI affects perceived responsiveness**: a user who sees content at 3.4s but can't click anything for another 1s (4.4s TTI) feels frustrated; closing the gap between LCP and TTI is the second most important performance goal after LCP itself
- **TBT (Total Blocking Time) is the developer metric behind TTI**: it measures how long the main thread is blocked — our TBT went from 2,300ms to 180ms; anything above 300ms is Google's threshold for "needs improvement"
- **CLS affects error rate**: a layout shift that moves a "Cancel" button under a user's finger as they tap "Confirm" is not just jarring — it causes wrong actions; CLS 0.12 → 0.04 means buttons no longer move on load
- **For enterprise B2B**: bounce rate matters less than task completion time and error rate; frame the metrics as "users got to their report 2.8 seconds faster" not "bounce rate improvement" — time-to-value is the metric product cares about
- **Lighthouse CI connects performance to the SDLC**: when a PR fails the LCP gate, the developer who introduced the regression fixes it in that PR — not in a performance sprint 3 months later

---

## 1. One-Line Definition
Core Web Vitals translate speed measurements into user behaviour impacts — LCP affects abandonment, TTI affects task completion, TBT affects response to clicks, CLS affects error rate — each with documented links to real business outcomes.

---

## 2. The Three Web Vitals and What They Mean

### LCP — Largest Contentful Paint

```
TECHNICAL: Time until the largest visible element (image or text block) renders
BUSINESS:  "When does the user see something meaningful?"

  Below 2.5s  → Good     (users perceive as fast)
  2.5s – 4.0s → Needs improvement
  Above 4.0s  → Poor     (users perceive as slow; abandonment risk)

Our result: 6.2s → 3.4s
  Before: Poor (above 4.0s threshold)
  After:  Needs improvement → approaching Good
  
Business impact formula (Google data):
  1 second LCP increase from 2.5s → 7% higher abandonment rate
  Our 2.8s improvement ≈ roughly 20% lower abandonment
  
For SAP BI Launchpad context:
  Users are BI analysts waiting to run reports
  Every second of wait time = analyst productivity lost
  For 1,000 analysts × 5 logins/day = 5,000 daily loads
  Before: 5,000 × 6.2s = 8.6 hours of daily waiting time
  After:  5,000 × 3.4s = 4.7 hours of daily waiting time
  Saved:  3.9 hours of analyst productivity daily
```

### TTI — Time to Interactive

```
TECHNICAL: Time until all visible UI elements respond to user input
BUSINESS:  "When can the user actually do something?"

  Below 3.8s  → Good
  3.8s – 7.3s → Needs improvement
  Above 7.3s  → Poor

Our result: 8.1s → 4.4s
  Before: Poor (above 7.3s)
  After:  Needs improvement (within acceptable range)

The LCP vs TTI gap:
  LCP: 3.4s  (user sees the dashboard)
  TTI: 4.4s  (user can click on reports)
  Gap: 1.0s  (user sees buttons but they don't respond for 1 second)

How to reduce the gap:
  Break up Long Tasks (> 50ms main thread blocks) into smaller scheduled tasks
  Defer non-critical JS until after TTI using dynamic import
  React 18 automatic batching reduces the number of renders that block interaction
```

### TBT — Total Blocking Time

```
TECHNICAL: Sum of main thread blocks over 50ms between FCP and TTI
BUSINESS:  "How long does the browser feel frozen to the user?"

  Below 200ms  → Good
  200 – 600ms  → Needs improvement
  Above 600ms  → Poor

Our result: 2,300ms → 180ms  (92% improvement — the biggest relative gain)

WHY 180ms is a big deal:
  2,300ms TBT means the main thread was frozen for 2.3 seconds
  During that time: clicks don't register, scroll is janky, animations freeze
  180ms TBT: barely noticeable; browser feels smooth

What caused the 2,300ms TBT before:
  Parsing and executing 2.1 MB of JavaScript
  JavaScript parsing is single-threaded (main thread)
  Lots of long synchronous module initialisation code
  
What fixed it:
  Lazy loading reduced initial JS to 380 KB → proportionally less parse time
  Deferred script loading → parsing happens after FCP, not blocking it
```

### CLS — Cumulative Layout Shift

```
TECHNICAL: Sum of visual instability scores — how much elements move on screen
BUSINESS:  "Do buttons and content move after they appear?"

  Below 0.1   → Good
  0.1 – 0.25  → Needs improvement
  Above 0.25  → Poor

Our result: 0.12 → 0.04
  Before: Needs improvement (just over 0.1 threshold)
  After:  Good (below 0.1)

WHAT CAUSED CLS 0.12 BEFORE:
  Hero image: no width/height attributes → browser didn't know how tall it was
  Layout calculated wrong → when image loaded, page content shifted down
  Module loading spinners: appeared without reserving space → content jumped

WHAT FIXED IT:
  Added explicit width/height to all img tags → browser pre-allocates space
  Skeleton loaders with fixed dimensions replaced spinners → no layout jump
  Font preloading → no text reflow when custom fonts arrive (FOUT prevention)

BUSINESS IMPACT OF CLS 0.12:
  Navigation bar links shifted during load
  A user clicking "Reports" at t=3s sometimes clicked the wrong link
  because the nav shifted 30px at t=2.8s when the logo image loaded
  CLS 0.04 means this no longer happens
```

---

## 3. How Lighthouse CI Connects to the SDLC

```
WITHOUT LIGHTHOUSE CI GATE:
  Developer adds a new module → doesn't run Lighthouse → PR merged
  Next sprint: performance team notices score dropped from 95 to 82
  Root cause: the new module added 450 KB to the initial bundle
  Fix: separate sprint, separate PR, context switch cost, delay

WITH LIGHTHOUSE CI GATE:
  Developer adds new module → Lighthouse runs automatically on PR
  LCP: 4.2s — FAILS gate (budget: 3.0s)
  Developer sees the failure immediately in their PR
  Developer adds React.lazy → re-runs → LCP 2.9s → PASSES → merges

RESULT: Performance regressions are fixed at the point of introduction
        No performance sprints needed; no firefighting
        Score stays stable at 95+ for months without dedicated effort
```

---

## 4. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why do Core Web Vitals matter beyond just a Lighthouse score?"

**Hruday's answer:**
> "Lighthouse score is a weighted formula — a 95 means something, but no user experiences a '95'. Users experience whether content appeared quickly, whether buttons responded when they clicked, whether the layout jumped while they were tapping. Core Web Vitals are the individual measurements behind that experience. LCP tells you when the main content appeared. TTI tells you when the user could actually interact. TBT tells you how often the main thread was frozen. CLS tells you whether layout shifts caused wrong clicks. Each of these has a documented link to user behaviour. Google's own data shows a 1-second LCP increase above 2.5 seconds raises the probability of a user leaving by about 7%. For our case — going from 6.2 to 3.4 seconds — that's a measurable reduction in users leaving before the page loads. For an enterprise analytics tool where users log in to generate reports and every second of delay is analyst productivity lost, that 2.8-second improvement had genuine business value."

---

### Q2 — Scenario
**Interviewer asks:** "How did you present the performance work to non-technical stakeholders?"

**Hruday's answer:**
> "I avoided the Lighthouse score entirely when talking to product or management, because 60 and 95 are abstract. Instead I said: 'The dashboard used to take 6.2 seconds to show the main content. Now it takes 3.4 seconds. That's nearly twice as fast. For our 1,000 BI analysts logging in five times a day, that 2.8-second saving adds up to about 3.9 hours of analyst productivity saved every single day.' I also mentioned the CLS fix in concrete terms: 'Navigation links were shifting as the page loaded, causing users to click the wrong option. That's been fixed — the layout is stable from the first paint.' Those two sentences landed with product leadership. They understood time saved equals people doing work instead of waiting, and layout shifts causing wrong actions is a UX defect that affects trust in the product."

---

## 5. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Score improved" | Only cite the number | Translate to user experience: "LCP 6.2s → 3.4s = main content appears in half the time" |
| Can't explain TBT | Skip it or say "blocking time went down" | "TBT went from 2,300ms to 180ms — from 2.3 seconds of frozen browser to barely noticeable; this came from reducing JS parse time via lazy loading" |
| Miss CLS | Forget about layout shift | "CLS 0.12 meant nav links shifted and users mis-clicked; fixing to 0.04 eliminated that class of error entirely" |
| No business connection | Stay in developer metrics only | Always have the analyst-productivity calculation ready: 1,000 users × 5 logins × 2.8s saved |

---

## 6. Hruday's Real Experience Hook

> "The most satisfying part of the performance work was the CLS fix for the navigation bar. Before the fix, the site telemetry showed users clicking 'Dashboards' but landing on 'Analytics'. We didn't understand why until I recorded a Lighthouse trace and saw the nav bar shift 28 pixels at 2.8 seconds as the logo image loaded — right at the moment most users were clicking. A two-line fix (explicit img width and height) eliminated that class of user error completely. That's the hidden business value of CLS — it's not just jarring to users, it causes real user mistakes."

---

## 7. Scale Evolution

**1,000 users →** Lab data (Lighthouse CI) is the primary signal. Field data via CrUX if your product is public.

**100,000 users →** Real User Monitoring (RUM) for live p50/p75/p95 per page per device type. Segment by geography — India 4G vs EU desktop different thresholds.

**10 million users →** Performance budget per team: each micro-frontend team gets a JS budget and LCP contribution budget; violations block deployment. A/B test performance vs features: does a faster LCP alone improve conversion? Test it with 5% of users getting lazy-loaded modules and measure task completion rate.

---

## 8. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | B2B payments: LCP affects merchant perception of reliability; CLS causes merchants to click wrong buttons on payment forms | Connect CLS to error rate on payment actions |
| Swiggy / Meesho | Consumer mobile: Google includes CWV in search ranking; better vitals = more organic traffic to seller storefronts | LCP on 3G India connection; TBT on mid-range Android |
| Adobe / Microsoft | Enterprise: customers audit performance as part of software procurement; CWV report in RFP responses | CrUX field data evidence; Lighthouse CI gate as quality gate evidence |
| SAP Labs | You built and measured this — you own the business impact calculation and the CLS layout shift debug story | The only candidate who can describe finding a CLS bug via screen recording trace |

---

*Part 23 · Core Web Vitals Connect to Real Business Impact · Full Stack Interview Guide · Hruday D · 2026*
