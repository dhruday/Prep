# How to Explain the 45% Page-Load Improvement With Numbers
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.2: The Performance Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Before → After numbers (memorise these cold)**:
  - LCP: 6.2s → 3.4s (45% faster)
  - TTI: 8.1s → 4.4s (46% faster)
  - Bundle: 2.1 MB → 780 KB (63% reduction)
  - Lighthouse score: 60 → 95+
- **45% improvement = LCP delta**: (6.2 - 3.4) / 6.2 = 45.2%; TTI improvement is 46%; you can say "roughly 45% across load metrics" — this is accurate and defensible
- **How to explain to a technical interviewer**: "LCP measured in lab data via Lighthouse CI; field data via Google CrUX API; we tracked weekly LCP p75 before/after deployment; p75 went from 6.4s to 3.6s on real user connections"
- **How to explain to a non-technical interviewer**: "The dashboard now loads in 3.4 seconds instead of 6.2 seconds — it's nearly twice as fast. Users spend less time waiting and more time working. On slower connections like 4G, the improvement is even bigger."
- **Business impact framing**: "Google data shows a 1-second LCP improvement reduces bounce rate by 7%. A 2.8-second improvement like ours corresponds to about 20% fewer users abandoning the page before it loads."
- **What you measured**: Lighthouse lab score AND Core Web Vitals field data (CrUX); both improved; field data is more trustworthy because it's real user measurements, not a controlled lab test

---

## 1. One-Line Definition
The 45% improvement refers to the reduction in LCP time — from 6.2 seconds to 3.4 seconds — measured by Lighthouse in CI (lab data) and confirmed by Google's Core Web Vitals API (real user field data).

---

## 2. The Full Before/After Table

```
PERFORMANCE IMPROVEMENTS — BEFORE vs AFTER

Metric                Before     After      Change      % Improvement
─────────────────────────────────────────────────────────────────────
Lighthouse Score      60         95+        +35 pts     +58%
FCP (First Paint)     3.8s       1.4s       -2.4s       -63%
LCP (Main Content)    6.2s       3.4s       -2.8s       -45%
TTI (Interactive)     8.1s       4.4s       -3.7s       -46%
TBT (Blocking)        2,300ms    180ms      -2,120ms    -92%
CLS (Layout Shift)    0.12       0.04       -0.08       -67%

Resource Metrics      Before     After      Change
──────────────────────────────────────────────────
Initial JS (transfer) 2.1 MB     780 KB     -63%
  (shell only on load)           380 KB     -82%
Hero image size       1.2 MB     78 KB      -94%
Total requests        47         18         -62%
Time to DOMContentLoaded  4.2s   1.8s       -57%

Connection Context (Lighthouse defaults to Fast 3G):
  Before: 6.2s LCP on Fast 3G
  After:  3.4s LCP on Fast 3G
  Real 4G improvement: roughly proportional
```

---

## 3. How to Calculate "45%"

```
CALCULATION (explain this if asked)

LCP before:  6.2 seconds
LCP after:   3.4 seconds
Difference:  6.2 - 3.4 = 2.8 seconds

Percentage improvement: (2.8 / 6.2) × 100 = 45.2%

Round to: 45% improvement in LCP

Why LCP is the headline metric:
  LCP is Google's primary measure of "when does the page feel loaded to the user"
  It's one of the Core Web Vitals that affects search ranking and product certification
  It's the metric enterprise customers measure when evaluating platform performance

Why NOT to lead with Lighthouse score:
  "Score went from 60 to 95" sounds impressive but is a synthetic number
  LCP 6.2s → 3.4s is a concrete, real-world measurement anyone can understand
  Lead with LCP and TTI; mention Lighthouse score as supporting evidence
```

---

## 4. Two Versions of the Explanation

### Version A — For Technical Interviewers

```
TECHNICAL EXPLANATION (120-150 words)

"We measured performance using two methods: Lighthouse in CI (lab data) and 
Google's Core Web Vitals field data via CrUX API (real user measurements).

In the lab — Lighthouse CI with a fast 3G network simulation — LCP went from 
6.2 seconds to 3.4 seconds: a 45% improvement. TTI went from 8.1 seconds to 
4.4 seconds. Total Blocking Time dropped from 2,300ms to 180ms, which is the 
most dramatic improvement — it came from removing the render-blocking script 
tags and reducing the JS parse time with lazy loading.

In field data — the p75 LCP across real users — we went from 6.4 seconds to 
3.6 seconds. The p75 is the 75th percentile: 75% of real users experienced 
LCP at or below that value. We tracked weekly p75 for four weeks before and 
four weeks after the changes. The improvement was consistent.

The bundle size went from 2.1 MB to 780 KB total, and the initial load 
(what the user downloads before seeing anything) went from 2.1 MB to 
380 KB — the shell only. Module code loads on demand."
```

### Version B — For Non-Technical Interviewers (Product, HR)

```
NON-TECHNICAL EXPLANATION (80-100 words)

"Before the work, the dashboard took 6.2 seconds to load main content. 
After, it took 3.4 seconds. That's nearly twice as fast.

The reason it was slow: the system was loading four separate sections 
of the application upfront, even when the user only needed one. It's like 
a restaurant bringing every dish on the menu to your table when you sit down, 
instead of bringing just what you ordered.

We fixed it so each section loads only when the user navigates to it. 
The data page published by Google says that a 2.8-second improvement in 
load time reduces the chance of users leaving before the page finishes 
loading by about 20%."
```

---

## 5. Field Data vs Lab Data — Know the Difference

```
LAB DATA (Lighthouse, WebPageTest)
  What it is: a controlled test — fixed network speed, fixed device, no caching
  When to use: consistent measurement for CI gates and regression detection
  Limitation: doesn't reflect real network, real device, real caching behaviour
  You ran: Lighthouse CI in GitHub Actions pipeline on every PR

FIELD DATA (Google CrUX, Real User Monitoring)
  What it is: aggregated measurements from real Chrome users on real connections
  When to use: understanding actual user experience; stronger evidence of improvement
  How to access: Google's Core Web Vitals API, PageSpeed Insights API, CrUX dashboard
  You tracked: weekly p75 LCP before/after deployment

WHY BOTH MATTER IN AN INTERVIEW:
  Lab data proves your PR didn't regress the score
  Field data proves real users noticed the improvement
  Interviewers who ask "how did you validate the improvement?" expect both
```

---

## 6. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What was the performance improvement you achieved?"

**Hruday's answer:**
> "The headline number is LCP — Largest Contentful Paint — which went from 6.2 seconds to 3.4 seconds. That's a 45% improvement. TTI — Time to Interactive — went from 8.1 seconds to 4.4 seconds. The Lighthouse score moved from 60 to 95. The initial JavaScript payload went from 2.1 MB down to 380 KB — the shell only — with module code loading on demand. We validated the improvement in two ways: Lighthouse CI in the pipeline measured before and after each PR, and Google's Core Web Vitals field data confirmed that real users saw the improvement. The p75 LCP in field data went from 6.4 seconds to 3.6 seconds over the first four weeks after deployment. None of the improvements regressed in the following three months because we added Lighthouse CI gates that block any PR breaching LCP 3 seconds."

---

### Q2 — Trade-Off Question
**Interviewer asks:** "What is the downside of your lazy loading approach? Did it introduce any new problems?"

**Hruday's answer:**
> "Yes — the first time a user navigates to a module they haven't visited, there's a download delay. The Report module bundle is about 520 KB. On a fast connection that's roughly 400ms. On a slow 4G that's more like 1.5 seconds. We show a loading spinner during that time via React Suspense. After the first visit, the module is cached by the browser and subsequent navigations are instant. We also added a preload hint for the module the user is most likely to visit next — based on their role. A BI analyst always goes to Reports first, so we prefetch the Report module in the background while the user is on the dashboard. This eliminates the first-navigation delay for the most common path. The trade-off is worth it: 380 KB on first paint for all users versus 520 KB delay on first *module* navigation for some users. The first group is everyone; the second group only feels it once per session."

---

## 7. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Vague improvement claim | "We improved performance significantly" | "LCP went from 6.2s to 3.4s — 45% — Lighthouse 60 → 95" |
| Only cite Lighthouse score | "Score went from 60 to 95" | Lead with LCP/TTI seconds — scores are abstract; time is concrete and everyone understands it |
| No validation method | Just state the numbers | "Validated in both lab data (Lighthouse CI) and field data (CrUX p75) — both confirmed the improvement" |
| Skip the lazy-load tradeoff | Describe only the wins | "First-module-navigation has a ~400ms delay on fast connections; we preload the most common module to remove this for the primary user path" |

---

## 8. Hruday's Real Experience Hook

> "Knowing the numbers cold served me in an internal demo with product leadership. A VP asked 'how much faster is it?' — I said 'LCP went from 6.2 seconds to 3.4 seconds, and field data from real users confirmed a 44% p75 improvement.' That specificity made it a business result, not a developer achievement. Performance work is invisible if you can't quantify it."

---

## 9. Scale Evolution

**1,000 users →** Lab data (Lighthouse CI) is enough. You'll see the improvement clearly.

**100,000 users →** CrUX field data becomes meaningful — enough real user measurements to see p75/p95 with statistical confidence. Set up a weekly CrUX API pull and plot it.

**10 million users →** Real User Monitoring (Datadog, Sentry Performance) for session-level LCP tracking. Segment by device, connection, region. Improvement in India on 4G might be 3× more impactful than on EU desktop — you see that only with real user segmentation.

---

## 10. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant dashboard performance is a competitive differentiator — merchants compare tools | LCP in seconds; p75 field data; business impact of reduced bounce |
| Swiggy / Meesho | Consumer mobile; India's network diversity; 4G performance critical | Field data segmented by network type; lazy loading for bandwidth-constrained users |
| Adobe / Microsoft | SLA with enterprise customers may include performance benchmarks | CrUX field data tracking; Lighthouse CI gates in pipeline as proof of ongoing compliance |
| SAP Labs | You own these numbers — LCP 6.2s → 3.4s, bundle 2.1 MB → 780 KB, score 60 → 95 | The only candidate who can say "I measured this with both lab and field data and it held up for three months" |

---

*Part 23 · How to Explain the 45% Page-Load Improvement With Numbers · Full Stack Interview Guide · Hruday D · 2026*
