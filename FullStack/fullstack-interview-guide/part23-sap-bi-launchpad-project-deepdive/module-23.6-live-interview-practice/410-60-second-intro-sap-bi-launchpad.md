# 60-Second Intro — SAP BI Launchpad
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.6: Live Interview Practice
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Purpose of the 60-second intro**: it's the answer to "tell me about your most important project" or "walk me through a project you're proud of" — the interviewer uses this to decide which threads to pull on; your intro must be memorable, number-rich, and frame you as an architect/owner, not a feature developer
- **The four beats of a 60-second intro**: (1) what the system is (2 sentences), (2) your role and scale (1 sentence), (3) one impressive achievement with a number (1-2 sentences), (4) what makes it technically interesting (1 sentence)
- **The numbers to memorise**: 4 teams · 8 Spring Boot services · Lighthouse 60 → 95 · 45% LCP improvement · 80% vulnerability reduction · 33 accessibility violations fixed · JWT in localStorage → httpOnly cookie
- **What NOT to do**: don't recite a feature list; don't describe the tech stack without a problem; don't spend 30 seconds on the company background; don't start with "So basically it's a..."
- **The best opening line**: "I led the frontend architecture for SAP's BI Launchpad — an enterprise analytics platform used by analysts at Fortune 500 companies to run reports and dashboards, built as a micro-frontend system with four independent teams and eight backend microservices."
- **Practice target**: say the 60-second intro out loud in under 75 seconds without reading notes; aim for natural, not memorised

---

## 1. The Full 60-Second Intro Script (Version A — Technical Audience)

```
"I led the frontend architecture for SAP's BI Launchpad — an enterprise
analytics platform used by analysts at Fortune 500 companies to run
reports, dashboards, and KPI monitors. I've been the tech lead on this
for the past two and a half years.

The system uses a micro-frontend architecture with four independent teams
and eight Spring Boot microservices on the backend. What made this
technically interesting was the cross-framework setup: three different
UI frameworks — SAP UI5, React, and Next.js — running side by side in
one browser tab using Webpack Module Federation.

My main contributions: I took the Lighthouse performance score from 60
to 95 — a 45% improvement in real user LCP — through code splitting,
lazy loading by route, and moving the analytics module to server-side
rendering. I reduced the vulnerability count by 80%, which included
moving JWT storage from localStorage to httpOnly cookies and implementing
a full Content Security Policy. And I fixed 33 WCAG AA accessibility
violations that had been stalling enterprise procurement conversations.

The thing I'm most proud of is that each of those three — performance,
security, accessibility — wasn't just a cleanup sprint. Each was
connected to a business outcome: the performance work improved analyst
productivity, the security work protected enterprise user data, and the
accessibility work directly unblocked a large deal that had been stalled."

[Time: ~55 seconds at a natural speaking pace]
```

---

## 2. Version B — Concise Opener for Time-Pressed Interviewers

```
"My most significant project is SAP BI Launchpad — an enterprise analytics
platform where I led the full-stack architecture across four teams.
On the frontend: micro-frontends with Module Federation, three frameworks in one tab.
On the backend: eight Spring Boot services, Resilience4j circuit breakers.
Three headline outcomes: Lighthouse 60 to 95, 80% security improvement,
33 WCAG violations down to zero.

Happy to go deep on any of those — which thread do you want to pull first?"

[Time: ~20 seconds — good for phone screens or rushed intros]
```

---

## 3. The Beats Broken Down

```
BEAT 1 — What the system is (2 sentences):
  "SAP BI Launchpad is an enterprise analytics platform — reports,
  dashboards, KPI monitors — used by analysts at Fortune 500 companies."
  ← establishes domain, scale, users

BEAT 2 — Your role and scale (1 sentence):
  "I led the frontend architecture as tech lead for two and a half years
  across four independent teams with eight Spring Boot services behind."
  ← establishes ownership and seniority; gives a sense of scope

BEAT 3 — One impressive achievement with number (2 sentences):
  Choose one based on the interviewer's company focus:
  
  For a performance-focused company (B2C, consumer):
    "Most impactful work was taking Lighthouse from 60 to 95 — 45% improvement
    in LCP — which translated to meaningful productivity gains for 1,000
    daily analyst users."
  
  For a security-focused company (fintech, enterprise):
    "Led the security remediation from 47 to 9 vulnerabilities — 80%
    reduction — including moving JWT from localStorage to httpOnly cookies
    and implementing a Content Security Policy across all four modules."
  
  For an enterprise/sales-focused company (B2B SaaS):
    "Fixed 33 WCAG AA accessibility violations that had been blocking an
    enterprise VPAT check and stalling a large deal in our pipeline."

BEAT 4 — What makes it technically interesting (1 sentence):
  "The most interesting technical problem was running three different UI
  frameworks — SAP UI5, React, Next.js — in one browser tab with shared
  routing and a shared session token."
```

---

## 4. Transition Phrases to Keep the Interview Moving

```
AFTER THE INTRO, THE INTERVIEWER WILL PICK A THREAD.
BE READY TO CONTINUE WITH:

If they ask about architecture:
  "Want me to draw the system? I can describe the five layers from
   browser shell down to the microservices."

If they ask about performance:
  "The starting point was a Lighthouse audit — let me walk through
   what was broken and exactly what we fixed."

If they ask about a challenge:
  "The hardest problem was the Module Federation shared dependency
   singleton issue — we briefly had two copies of React running
   and had to diagnose it. Happy to walk through that."

If they go in a direction you're fully prepared for:
  "Yes — that's exactly the area I spent the most time on. Let me
   explain the problem first and then the solution, with the
   numbers at each step."

DON'T FREESTYLE:
  Every major thread from the project has a prepared answer
  in this module set (387-416)
  Use the correct prepared answer, not an improvised version
```

---

## 5. Common Opening Mistakes — Fixed

| What most candidates say | What Hruday says |
|--------------------------|------------------|
| "So basically we built an analytics tool for SAP..." | Start confidently: "I led the frontend architecture for SAP's BI Launchpad —" |
| Stack list: "React, Spring Boot, Kubernetes, Redis..." | Problem first: "The challenge was four independent teams needing to ship into one browser tab" |
| "It was a pretty big project with lots of features" | Numbers: "four teams, eight services, Lighthouse 60 → 95, 80% security improvement" |
| "I was responsible for the frontend" | "I led the frontend architecture" — own the contribution |
| 3-minute intro that covers everything | Sixty seconds, pick one achievement, invite the thread |

---

## 6. Practice Exercise

```
SAY THIS OUT LOUD. Don't just read it. Say it.

Round 1: Read the script while saying it aloud.
Round 2: Summarise from memory (not word for word — get the beats right).
Round 3: 60 second timer. Start when you pick up a pen or open your laptop.
Round 4: Say it to a mirror. Notice where your eyes drop or pace slows.
Round 5: Record yourself. Listen back. Are the numbers clear?

TARGET:
  Under 75 seconds
  All four numbers present: 60→95, 45%, 80%, 33
  No "um", no "basically", no "kind of"
  Natural, not recited
```

---

## 7. Interview Questions & Model Answers

### Q1 — "Tell me about your most important project"
*(This IS the 60-second intro — use Version A for a technical audience)*

### Q2 — "Walk me through your background briefly"
*(Use Version B + redirect: "Happy to go deep on any part — where do you want to start?")*

### Q3 — "What project are you most proud of?"

**Hruday's answer:**
> "SAP BI Launchpad. It's an enterprise analytics platform I led the architecture on for two and a half years. Four teams, eight microservices, three frameworks in one tab via Module Federation. The part I'm most proud of is the combination of work we delivered beyond features: we took Lighthouse from 60 to 95, reduced vulnerabilities by 80%, and fixed 33 accessibility violations that had been blocking enterprise deals. The thing I'm proud of is that each of those had a business outcome attached — not just 'we improved the metrics'. Performance was analyst productivity. Security was data protection and compliance. Accessibility was a stalled deal that resumed. That connection between technical work and business impact is what I'm proud of."

---

## 8. Hruday's Real Experience Hook

> "The first time I gave this intro to a senior engineering leader at a FAANG company, I had the technical detail ready but opened with 'so we built this analytics platform for SAP.' The interviewer said 'okay, tell me what you personally built.' That's when I realised the intro was burying my contribution. The second version — 'I led the frontend architecture' in the first sentence — immediately told them my level. Everything after that was credible. The opening sentence is the whole game."

---

## 9. Scale Evolution

**Junior engineer presenting a project →** 30-second intro; one achievement; the tech stack. Appropriate for that level.

**Senior engineer →** 60-second intro; one achievement with a number; a business outcome. Technical depth on request.

**Staff/Principal engineer →** 90-second intro; one architecture decision and why; team impact; organisational context. Three candidate threads offered at the end.

---

## 10. Company Relevance

| Company | Tailor Beat 3 to their focus | Why |
|---------|------------------------------|-----|
| Razorpay / PhonePe | Security beat: "80% vulnerability reduction, JWT in httpOnly cookie, CSP across four modules" | Fintech: security is table stakes; they'll want to go deep there |
| Swiggy / Meesho | Performance beat: "Lighthouse 60 → 95, 45% LCP improvement, code splitting by route" | Consumer product: performance = conversion; they'll want the specifics |
| Adobe / Microsoft | Architecture beat: "Three frameworks, Module Federation, four independent team deployments" | Platform company: they care about large-scale architecture decisions |
| SAP Labs | Accessibility beat: "33 violations fixed, enterprise deal unblocked, axe-core CI gate" | Enterprise B2B: procurement and compliance are the domain; they'll want the VPAT story |

---

*Part 23 · 60-Second Intro — SAP BI Launchpad · Full Stack Interview Guide · Hruday D · 2026*
