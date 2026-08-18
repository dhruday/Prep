# Chapter 1 — Introductions & Resume Walkthrough

*Memory hook: **"Who I am → What I ship → Why it matters."***

---

## 1.1 The 30-Second Introduction ⭐

**Use for:** phone screens, "tell me about yourself" cold openers.

> "I'm Hruday, a senior frontend engineer with **8+ years** shipping large-scale web apps at **SAP, Bosch, and Oracle**. My focus is **React, TypeScript, and performance at scale**. Most recently at SAP I rebuilt the BI Launchpad in React — took Lighthouse from **60 to 95+**, cut load time **45%**, and led its **WCAG-AA** certification. I love turning slow, legacy code into fast, secure, accessible products."

**Why this works:**
- 3 companies = credibility
- 3 numbers = proof
- 1 theme (perf + scale) = focus
- Ends with passion, not a resume dump

---

## 1.2 The 2-Minute Introduction ⭐

**Use for:** in-person rounds, hiring manager, "walk me through your background."

**Structure: PAST → PRESENT → FUTURE (60s + 45s + 15s).**

> **[Past — 30s]**
> I started my career at Capgemini in 2018 building Angular UIs and Node.js APIs for internal automation tools. In 2020 I moved to Oracle Financial Services where I built a reusable Angular component library adopted across financial products, and pushed unit test coverage from near-zero to **85%**.
>
> **[Present — 60s]**
> In 2021 I joined Bosch to build **real-time industrial monitoring dashboards** — Angular plus WebSocket, streaming live telemetry from around 15 production lines. In August 2022 I moved to SAP Labs where I now lead the frontend for **SAP BI Launchpad**, an analytics platform used by enterprise customers in 50+ countries.
>
> There I architected a full **React and Redux Toolkit** overhaul on top of a legacy jQuery and JSP stack. We split the monolith into **micro-frontends** using Module Federation, so three teams can ship independently. I drove Lighthouse from **60 to 95+**, cut page-load 45%, and led our **WCAG-AA** compliance work. I also hardened the frontend security — CSP, XSS sanitization, OWASP-aligned headers — reducing reported vulnerabilities by 80%.
>
> **[Future — 20s]**
> Right now I'm looking for a **senior IC role** where I can own frontend architecture end-to-end — performance, DX, and scale — ideally in a product where frontend complexity is the moat. That's why I applied here.

---

## 1.3 Resume Walkthrough — Line by Line ⭐

**Anticipate:** *"Walk me through your resume."*

**Rule:** ~30 seconds per role. Never read the resume out loud. Tell the **story**.

### 1.3.1 SAP Labs (Aug 2022 – Present)

> "At SAP I own the frontend of BI Launchpad. When I joined, the app was a **10-year-old jQuery + JSP monolith** — every page was a full reload, Lighthouse was 60, and three teams stepped on each other in one repo.
>
> My first six months were the **React migration plan**: strangler-fig pattern, one route at a time, Redux Toolkit for shared state, TypeScript everywhere. In year two I introduced **Module Federation** so each team owns a micro-frontend. In year three we did the **security hardening** — CSP, sanitization, headers — and the **WCAG-AA** push.
>
> Today Launchpad scores 95+ on Lighthouse, ships every week, and the three teams don't block each other. My proudest work is the **performance patterns doc** I wrote — it's now used across other SAP products."

**Interviewer will pull on:**
- "What's a strangler-fig pattern?" → Ch 3
- "Why Module Federation over iframes?" → Ch 3
- "Which page was hardest to migrate?" → have a story ready

### 1.3.2 Bosch (Jul 2021 – Aug 2022)

> "At Bosch I built real-time dashboards for factory machinery. Operators used to walk the floor to check status — we replaced that with a live Angular dashboard fed by WebSocket telemetry from around 15 production lines. Refactored 20+ legacy components onto Bosch's WebCore design system, cut render time 25%, and integrated Spring Boot microservices via a Kubernetes pipeline."

**Interviewer will pull on:**
- "Why WebSocket and not SSE or polling?"
- "How did you handle reconnection?"
- "What if telemetry drops for 5 minutes?"

### 1.3.3 Oracle Financial Services (Jun 2020 – Jul 2021)

> "At Oracle I worked on financial transaction systems. Two big wins: I built a **reusable Angular component library** — modals, drag-and-drop tables, data grids — adopted across product teams, cutting new-feature UI time by around 35%. And I brought unit test coverage from near-zero to **85%** using Jasmine and Karma, which set the quality bar for the team."

**Interviewer will pull on:**
- "Why 85% and not 100%?"
- "What's the hardest thing to test in Angular?"
- "How did you handle flaky tests?"

### 1.3.4 Capgemini (Jun 2018 – Jun 2020)

> "Capgemini was where I learned the craft — Angular 5+ UIs, Node.js / Express APIs, Java Spring Boot backends. I built internal automation tools for three delivery teams and wrote the team's API documentation standard."

Keep it short — this is 8 years ago. Interviewers rarely dig here.

---

## 1.4 The "Why are you leaving?" Answer ⭐

**Bad:** "Money / manager / boring."
**Good:** Growth story.

> "SAP has been a great four years — I've done the migration, the perf work, the security push. What's missing is **scale**. I want to work on a product where the frontend is on the critical path for hundreds of millions of users, and where I can grow into a **staff-level architect** role. Your team's work on X is exactly that."

Replace **X** with a real thing from their eng blog. **Always research before the round.**

---

## 1.5 The "Why this company?" Answer ⭐

**3-part formula: Product · People · Problem.**

> "Three reasons. **Product** — I use it, I've read your engineering blog post on Y, and the DX shows care. **People** — I spoke with Z on LinkedIn and the bar for hiring is clear. **Problem** — the frontend challenges here (offline-first / real-time / whatever) are exactly the direction I want to grow."

**Never** say "great culture" or "learning opportunity." Every candidate says that.

---

## 1.6 Common Resume Traps

| Trap | Bad Answer | Good Answer |
|---|---|---|
| "60 → 95+ Lighthouse — how?" | "Optimized bundle." | "3 wins: route-level code split cut initial JS 60%, `loading=lazy` and AVIF images cut LCP 40%, and moving to Preact-compat for a legacy view removed 30KB. Numbers are median mobile, throttled 4G." |
| "80% vulnerability drop — how measured?" | "Fewer reports." | "SAP has an internal Fortify + external pentest cadence. Baseline 45 findings, post-hardening 9. Metric is critical + high, not total." |
| "50+ countries — really you or SAP?" | "SAP obviously." | "It's SAP's product — my frontend work ships to those users. My scope is the frontend layer, not sales geography." *(honesty scores)* |
| "3 teams — how did you lead them?" | "I told them what to do." | "I'm a senior IC, not a manager. I led through **architecture, code review, and pairing** — set the module boundaries, ran RFCs, and mentored 4 juniors." |

---

## 1.7 Elevator Pitch — 3 Variants

**For a recruiter (non-technical):**
> "I build fast, secure, accessible web apps. 8 years, mostly React and Angular. Latest project made an SAP product 45% faster and hit accessibility compliance."

**For a hiring manager:**
> "Senior frontend, React + TS + micro-frontends. Deep in performance and security. Led SAP BI Launchpad's frontend rewrite — 60 to 95+ Lighthouse, WCAG-AA, three-team modular architecture."

**For an engineer:**
> "React, TS, Module Federation. Care about Core Web Vitals, CSP, and clean state design. Rebuilt a jQuery monolith into a micro-frontend shell with Redux Toolkit. Ask me about the migration — the interesting part is what broke."

*The last line is bait. Interviewers love that.*

---

## 1.8 Rehearsal Checklist

- [ ] 30-second intro said out loud 10 times
- [ ] 2-minute intro said out loud 5 times, timed
- [ ] Resume walkthrough said out loud 3 times
- [ ] "Why leaving" answered with a real growth reason
- [ ] "Why us" customized for the target company
- [ ] Every claim on the resume has ONE story to back it up

*Rehearsed on the mirror is better than rehearsed in your head. The mouth needs the reps, not the brain.*

Next → **Chapter 2 — Every Technology on the Resume.**
