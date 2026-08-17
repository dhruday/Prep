# 🗓️ 1-MONTH FAANG INTERVIEW PREPARATION PLAN
## Hruday D — Senior Frontend Engineer
### Target: Microsoft · Adobe · Salesforce · Cisco
### 4 Weeks · 486 Topics · 29 Sequences · Complete Interview Readiness

---

> **How to use this plan:**
> - Each day has a PRIMARY focus (2–3 hours) and a SECONDARY task (30–45 min)
> - Every evening: write 3 bullet points summarising what you learned — no notes allowed
> - Every Friday: mock interview (record yourself for 45 minutes, review the next morning)
> - Every Sunday: light revision only + record a YouTube short on your strongest topic of the week
> - Mark topics ✅ as you master them (can explain without notes)

---

# WEEK 1 — FOUNDATIONS + JAVASCRIPT CORE
> Goal: Lock down JS internals, browser internals, TypeScript. These underpin every answer.

---

## DAY 1 (Monday) — JS Execution Model + Event Loop

**PRIMARY: SEQ_01 — Topics 1–7**
- `01_JavaScript_Execution_Model.md`
- `02_Event_Loop_Microtasks_vs_Macrotasks.md`
- `03_Main_Thread_vs_Worker_Threads.md`
- `04_Call_Stack_Task_Queue_Microtask_Queue.md`
- `05_Closures_Scope_Chain_Lexical_Environment.md`
- `06_Prototypal_Inheritance_Prototype_Chain.md`
- `07_this_Keyword_All_4_Contexts.md`

**SECONDARY:** Implement `debounce` from scratch (no reference)

**Evening check:** Explain the event loop to an imaginary junior without notes. Draw the stack/queue diagram on paper.

**Interview question to answer out loud:**
> *"Walk me through exactly what happens when JavaScript runs setTimeout(fn, 0)."*

---

## DAY 2 (Tuesday) — JS Memory, Async, Generators

**PRIMARY: SEQ_01 — Topics 8–14**
- `08_Hoisting_var_let_const_function.md`
- `09_Garbage_Collection_Memory_Leaks.md`
- `10_Promises_Internals.md`
- `11_Async_Await_Internals.md`
- `12_Promise_Combinators.md`
- `13_Generators_and_Iterators.md`
- `14_AbortController_Request_Cancellation.md`

**SECONDARY:** Implement `Promise.all` and `Promise.race` from scratch

**Interview question to answer out loud:**
> *"What's the difference between Promise.all and Promise.allSettled? When would you use allSettled in a real app?"*

---

## DAY 3 (Wednesday) — Frontend JS Implementations

**PRIMARY: SEQ_01 — Topics 15–21 (ALL implementations)**
- `15_Implement_Debounce.md` — implement with leading/trailing options
- `16_Implement_Throttle.md`
- `17_Implement_Curry_Memoize_Once_Pipe.md`
- `18_Implement_Deep_Clone_and_Deep_Equal.md`
- `19_Implement_Promise_Combinators_From_Scratch.md`
- `20_Implement_EventEmitter_PubSub.md`
- `21_Implement_LRU_Cache.md`

**SECONDARY:** Write all 7 implementations from memory. Time yourself (40 minutes max for all 7).

**Interview question:**
> *"Implement a debounce function that supports both leading and trailing edge invocation."*

---

## DAY 4 (Thursday) — Browser Architecture + Rendering Pipeline

**PRIMARY: SEQ_02 — Topics 22–30 (Browser Architecture + Rendering)**
- `SEQ_02_Browser_and_Web_Platform_Internals/`
- How the Browser Works, CRP, HTML Parsing, CSSOM, Render Tree
- Reflows vs Repaints, GPU vs CPU Rendering, Compositing Layers
- Avoiding Layout Thrashing

**SECONDARY:** Audit one of your own projects for layout thrashing using Chrome Performance panel

**Interview question:**
> *"A user complains that scrolling feels janky on our page. Walk me through how you'd diagnose and fix it."*

---

## DAY 5 (Friday) — Browser Internals: Memory, Network, Workers

**PRIMARY: SEQ_02 — Topics 31–42**
- Memory Management, Browser Storage Options, Storage Quotas
- HTTP/1.1 vs HTTP/2 vs HTTP/3, DNS Prefetch, QUIC
- Web Workers, Service Workers, Worklets

**SECONDARY: MOCK INTERVIEW #1 (45 minutes)**
- Topic: "Walk me through the browser's rendering pipeline from URL to pixels"
- Record yourself. No notes. Time yourself.

**Review:** Play back your recording. Mark where you hesitated. Note gaps.

---

## DAY 6 (Saturday) — TypeScript Deep Dive Part 1

**PRIMARY: SEQ_03 — Topics 43–51**
- Types vs Interfaces, Union & Intersection Types
- Generics — Functions, Classes, Constraints
- Enums vs Const Assertions
- Conditional Types, Mapped Types, Template Literal Types
- Discriminated Unions

**SECONDARY:** Convert a plain JS utility function to fully generic TypeScript with constraints

**Interview question:**
> *"What's the difference between a TypeScript interface and a type alias? When do you choose each?"*

---

## DAY 7 (Sunday) — TypeScript Compiler + Light Revision

**PRIMARY: SEQ_03 — Topics 52–58**
- Typing Props, Events, Refs in React
- Typing Custom Hooks
- tsconfig Deep Dive
- Declaration Files

**SECONDARY:** Revise Days 1–6 bullet-point summaries. Update your notes.

**YouTube short:** Record 2 minutes on "JavaScript Closures — what they really are and 3 production use cases"

---

# WEEK 2 — FRAMEWORK DEEP DIVES (Angular + React)
> Goal: Go interview-deep on Angular/RxJS (your strength) and React internals (your growth area).

---

## DAY 8 (Monday) — Angular Architecture + Change Detection

**PRIMARY: SEQ_04 — Topics 59–66**
- NgModules vs Standalone Components
- Dependency Injection (Hierarchical Injectors)
- Component Lifecycle Hooks (all 8)
- Angular Router (Lazy Loading, Guards, Resolvers)
- Default vs OnPush Change Detection
- zone.js internals, Zoneless Angular, markForCheck vs detectChanges

**SECONDARY:** Create a mental map: "Which lifecycle hook fires when + what I'd actually do in each"

**Interview question:**
> *"Explain the difference between Default and OnPush change detection. When would using OnPush break your component?"*

---

## DAY 9 (Tuesday) — RxJS Mastery

**PRIMARY: SEQ_04 — Topics 67–76**
- Cold vs Hot Observables
- Subject, BehaviorSubject, ReplaySubject, AsyncSubject
- switchMap vs mergeMap vs concatMap vs exhaustMap (with real examples for each)
- combineLatest, forkJoin, zip, withLatestFrom
- takeUntil pattern
- Custom RxJS Operators
- NgRx — Store, Actions, Reducers, Effects, Selectors

**SECONDARY:** Write the 4 mapping operators from memory with a real-world use case for each

**Interview question:**
> *"When would you use exhaustMap over switchMap? Give me a production example."*

---

## DAY 10 (Wednesday) — Angular Performance + NgRx Signals

**PRIMARY: SEQ_04 — Topics 73–80**
- NgRx Entity Adapter
- Angular Signals (v17+) — signal(), computed(), effect()
- Akita vs NgRx vs Signal Store trade-offs
- OnPush + trackBy patterns
- Pure vs Impure Pipes
- Lazy Loaded Modules + Route-Level Code Splitting
- Deferrable Views (@defer block)

**SECONDARY:** Implement a simple signal-based counter component and explain why it avoids zone.js

---

## DAY 11 (Thursday) — React Internals + Fiber

**PRIMARY: SEQ_05 — Topics 81–96 (React Fiber, Hooks)**
- React Fiber Architecture
- Reconciliation Algorithm
- React Scheduler — Priority Lanes
- Concurrent Mode
- Commit Phase vs Render Phase
- All hooks: useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext
- useTransition, useDeferredValue, useId, useSyncExternalStore

**SECONDARY:** Draw the React Fiber work loop on paper. Explain render phase vs commit phase.

**Interview question:**
> *"React re-renders this component 5 times when I update a piece of state. Walk me through exactly why that's happening and all the ways I could fix it."*

---

## DAY 12 (Friday) — React 18/19 + Patterns

**PRIMARY: SEQ_05 — Topics 97–117 (React 18/19, Patterns, Redux)**
- Automatic Batching, Suspense, RSC, Server Actions
- React Compiler (auto-memoisation)
- Compound Component, HOC, Error Boundaries, Portal patterns
- Redux Core, RTK, RTK Query
- Normalised State Shape

**SECONDARY: MOCK INTERVIEW #2 (45 minutes)**
- Topic: "Design a React component architecture for a large dashboard with real-time data"
- Include: state management choice, performance approach, error boundaries

---

## DAY 13 (Saturday) — Next.js App Router + Performance Patterns

**PRIMARY: SEQ_05 — Topics 118–135 (Next.js + Performance)**
- App Router vs Pages Router
- Server vs Client Components
- Data Fetching, Route Handlers, Middleware
- Next.js Caching (4 layers)
- Streaming with Suspense
- React.memo, useMemo, useCallback best practices
- Windowing, Code Splitting, Profiling

---

## DAY 14 (Sunday) — State Management + Data Fetching

**PRIMARY: SEQ_06 + SEQ_07 — Topics 136–164**
- State Fundamentals, Redux vs Zustand vs Signals
- Server State vs Client State
- TanStack Query deep dive
- State Machines (XState)
- REST, GraphQL, tRPC
- Pagination — cursor vs offset
- Debouncing API calls, Optimistic Updates
- Error handling, Circuit Breaker, Skeleton Loaders

**SECONDARY:** Revise the full week. Write your top 5 insights on paper.

**YouTube short:** "switchMap vs exhaustMap — the one thing most Angular devs get wrong"

---

# WEEK 3 — PERFORMANCE, ARCHITECTURE, SECURITY, RELIABILITY
> Goal: Your SAP Lighthouse story + security work make this your strongest phase.

---

## DAY 15 (Monday) — Performance Metrics + Optimization

**PRIMARY: SEQ_08 — Topics 165–181**
- FCP, LCP, CLS, INP — precise definitions and targets
- Lighthouse CI in CI/CD
- Real User Monitoring vs Synthetic Testing
- Code Splitting, Lazy Loading, Tree Shaking, Bundle Analysis
- Virtualization, Avoiding Re-renders
- Main Thread Scheduling, Long Tasks, INP, scheduler.postTask()

**SECONDARY:** Run Lighthouse on any web app. Write a 5-point action plan to improve its score.

**Interview question:**
> *"Your LCP is 4.2 seconds. Walk me through exactly how you'd diagnose and fix it."*
> (Use your SAP Lighthouse 60→95 story here)

---

## DAY 16 (Tuesday) — Assets, Resources, Architecture Patterns

**PRIMARY: SEQ_09 + SEQ_10 — Topics 182–209**
- Image Optimization, AVIF vs WebP vs JPEG XL
- CSS Optimization, Gzip vs Brotli
- CDN, Third-Party Scripts, Resource Hints
- Monolithic vs Component vs MVC vs MVVM
- Micro-Frontend Architecture, Module Federation
- Monorepo (Nx, Turborepo)
- Feature-Based vs Layer-Based Structuring

---

## DAY 17 (Wednesday) — Rendering Strategies

**PRIMARY: SEQ_11 — Topics 210–225**
- CSR, SSR, SSG, ISR, PPR
- Streaming, Hydration, Islands Architecture
- RSC deep dive
- CSR vs SSR vs SSG trade-offs
- Speculation Rules API
- TTI trade-offs, Critical CSS, Preload vs Prefetch

**Interview question:**
> *"You're building an e-commerce product page. Should you use SSR, SSG, or ISR? Walk me through your decision."*

---

## DAY 18 (Thursday) — Caching + Security Core

**PRIMARY: SEQ_12 + SEQ_13 — Topics 226–257**
- HTTP Caching layers
- Service Workers, IndexedDB, Cache API
- Cache Invalidation, Stale-While-Revalidate, Background Sync
- XSS — all 3 types, prevention, real examples
- CSRF — SameSite cookies, CSRF tokens
- CORS — preflight, credentialed requests
- Prototype Pollution, Supply Chain Attacks
- OAuth 2.0, JWT deep dive, Passkeys/WebAuthn
- CSP, Secure Headers, SRI
- Silent Refresh Pattern (token refresh)
- Preventing DevTools data leaks

**SECONDARY:** Do a security audit of a personal project. List every vulnerability you find.

**Interview question:**
> *"We got a security report saying our app is vulnerable to XSS. Walk me through exactly how you'd find and fix it."*
> (Use your SAP 80% vulnerability reduction story)

---

## DAY 19 (Friday) — Authorization + Real-Time Systems

**PRIMARY: SEQ_14 + SEQ_15 — Topics 258–287**
- RBAC, ABAC, Policy-Based Authorization
- Multi-Tenant Authorization, Privilege Escalation
- Route Guards (Angular + React Router)
- Polling vs Long Polling vs WebSockets vs SSE
- Real-Time UI Updates, Reconnection, Backoff
- Message Ordering, Event Deduplication
- Conflict Resolution in Collaborative UIs

**SECONDARY: MOCK INTERVIEW #3 (45 minutes)**
- Topic: "Design a real-time notification system for an enterprise app"
- Include: transport choice, reliability, offline handling, accessibility

---

## DAY 20 (Saturday) — Scalability, Accessibility, Testing

**PRIMARY: SEQ_16 + SEQ_17 + SEQ_18 — Topics 288–331**
- Feature Flags, A/B Testing, Canary Releases
- i18n, RTL support, Multi-Tenant UI
- WCAG 2.1/2.2, ARIA, Keyboard Navigation
- Screen Readers (NVDA, VoiceOver, JAWS)
- Testing Pyramid vs Trophy
- Jest, React Testing Library, Playwright vs Cypress
- Visual Regression Testing, Lighthouse CI in pipeline

**Interview question:**
> *"How do you ensure your components are accessible? Walk me through your process from design to QA."*
> (Use your WCAG AA certification story)

---

## DAY 21 (Sunday) — Observability + CI/CD + Revision

**PRIMARY: SEQ_19 + SEQ_20 — Topics 332–356**
- Frontend Logging, Sentry, Datadog
- RUM, OpenTelemetry
- Source Maps, Correlation IDs
- Trunk-Based vs GitFlow
- GitHub Actions, Jenkins
- Blue-Green, Canary, Rollback Strategy
- Docker for Frontend

**SECONDARY:** Full week revision — 3-sentence summary per SEQ. Identify your 2 weakest areas.

**YouTube short:** "How I took our Lighthouse score from 60 to 95 — the complete story"

---

# WEEK 4 — SYSTEM DESIGN + DSA + COMPANY-SPECIFIC + BEHAVIOURAL
> Goal: Apply everything. Practice under time pressure. Nail the interview format.

---

## DAY 22 (Monday) — Company-Specific: Web Components + SAP UI5

**PRIMARY: SEQ_21 + SEQ_22 — Topics 357–382**
- Custom Elements, Shadow DOM, HTML Templates
- LWC Lifecycle, @api/@track/@wire decorators
- Wire Service, Lightning Message Service
- SAPUI5 vs OpenUI5, MVC in UI5
- OData Binding, UI5 Lifecycle
- SAP Fiori Design System
- How to articulate SAP experience to non-SAP companies

**KEY PREP:** Prepare your 2-minute "transferable skills" pitch:
> "At SAP, I worked with [UI5/Fiori/OData]. The equivalent in your stack is [React/Angular/REST]. Here's what directly transfers..."

---

## DAY 23 (Tuesday) — DSA Round Prep Part 1

**PRIMARY: SEQ_24 — Topics 393–410 (ALL DSA patterns)**
- Two Pointers, Sliding Window, Prefix Sums
- Frequency Maps, Two-Sum variants
- Monotonic Stack, Queue-Based BFS
- BFS & DFS templates
- Binary Tree Traversals, Level Order
- Graph Connected Components
- DOM Tree traversal as graph problem
- Recursion mental model, Memoization vs Tabulation
- Classic DP: Climbing Stairs, Coin Change, LCS

**SECONDARY:** Solve 5 LeetCode problems (Easy → Medium mix): 2-sum, Valid Parentheses, Binary Tree Level Order, Max Sliding Window, Climbing Stairs

**Time constraint:** 20 minutes per problem. No hints.

---

## DAY 24 (Wednesday) — Frontend System Design: Foundations + Machine Coding Part 1

**PRIMARY: SEQ_23 + SEQ_25 Module 25.1 — Topics 383–419**
- What is Frontend System Design vs Backend
- Senior/Staff expectations
- Functional vs Non-Functional requirements
- Trade-offs framework
- Machine Coding: Autocomplete Search
- Machine Coding: Infinite Scroll
- Machine Coding: Notification System
- Machine Coding: Drag-and-Drop List
- Machine Coding: Image Carousel (keyboard + ARIA)

**TIMED EXERCISE:** Build Autocomplete Search in 45 minutes
- Include: debounce, AbortController, keyboard navigation, ARIA
- No frameworks — vanilla TypeScript

---

## DAY 25 (Thursday) — Large System Design Problems

**PRIMARY: SEQ_25 Module 25.2 — Topics 420–431**
- Design Flipkart/Amazon Cart System
- Design LinkedIn-Style Feed
- Design a Chat UI (WebSocket + reconnection)
- Design Google Docs Collaborative Editor
- Design File Upload with Progress + Resume
- Design Cisco Network Monitoring Dashboard
- Design Salesforce CRM Record View
- Design Adobe Asset Manager

**TIMED EXERCISE:** System Design in 45 minutes:
> "Design a real-time collaborative document editor (Google Docs frontend)"
- Spend 5 min on requirements, 15 min architecture, 15 min deep-dive one component, 10 min trade-offs

---

## DAY 26 (Friday) — DSA Round Part 2 + Mock Interview #4

**MORNING: 5 LeetCode problems (Medium)**
- Valid Parentheses (stack)
- Number of Islands (BFS/DFS)
- Longest Substring Without Repeating (sliding window)
- Binary Tree Zigzag Level Order
- Word Search (backtracking)

**Time:** 25 minutes each. Write solutions in TypeScript.

**MOCK INTERVIEW #4 (45 minutes):**
- Round type: FAANG System Design (Microsoft style)
- Topic: "Design a frontend for Microsoft Teams-style messaging"
- Interviewer plays adversarial — challenge every choice

Record, review, and note: (1) where you got stuck, (2) what you'd improve, (3) what you nailed.

---

## DAY 27 (Saturday) — Interview Strategy + Behavioural Stories

**PRIMARY: SEQ_27 + SEQ_26 + SEQ_28 — Topics 432–466**
- Machine Coding ↔ Design Bridge: Component Decomposition, Edge Cases
- Interview Flow: Requirement Clarification Framework
- Time Boxing, Explaining Trade-offs Verbally
- How to Recover When You Don't Know the Answer
- Senior vs Staff Expectations
- Architecture Ownership, Technical Vision
- Production Incidents, Privacy & GDPR, SLO/SLA Awareness

**EXERCISE:** For each of these questions, speak your answer aloud for 2.5 minutes (no notes):
1. "Tell me about a time you improved system performance significantly"
2. "Describe the most complex frontend architecture you've designed"
3. "How do you handle disagreements with product managers about technical decisions?"
4. "Tell me about a time you mentored a junior engineer"

---

## DAY 28 (Sunday) — Behavioural Round + Company-Specific Values

**PRIMARY: SEQ_29 — Topics 467–486**
- STAR Method (all 4 components)
- All 8 core stories — practice each out loud

**Your 8 STAR Stories (practice all, time each at 2.5 min):**

| # | Story | Maps To |
|---|-------|---------|
| 1 | Lighthouse 60→95 | Technical Leadership, Ownership |
| 2 | WCAG AA Certification | Quality, Customer Obsession, Accessibility |
| 3 | 80% Security Vulnerability Reduction | Security Ownership, Proactiveness |
| 4 | Mentoring 4 Engineers | Leadership, Scaling Yourself |
| 5 | Micro-Frontend Architecture | System Thinking, Technical Judgement |
| 6 | Bosch Dashboard Under Deadline | Reliability Under Pressure |
| 7 | Cross-Team Module Delivery | Collaboration, Influence Without Authority |
| 8 | Excellence in FE Engineering Award | Business Impact, Recognition |

**Company-Specific Value Alignment:**
- **Microsoft:** Growth Mindset + Clarity + Energy + Success of Others
- **Adobe:** Craft + Innovation + Genuine + Exceptional
- **Salesforce:** Trust + Customer Success + Innovation + Equality
- **Cisco:** Integrity + Trust + Collaboration + Innovation

**YouTube short:** "My 8 FAANG behavioural stories — how I structure them"

---

# INTERVIEW WEEK — FINAL PREPARATION
> Apply Order: Cisco → Adobe → Microsoft → Salesforce

---

## DAY 29 — Company Research Deep Dive: Cisco + Adobe

**Cisco prep:**
- Products: WebEx, Cisco DNA Center, Meraki Dashboard, SecureX
- Stack: Angular, TypeScript, React (varies by team)
- Key interview themes: Real-time systems, performance, security, large-scale data viz
- Likely questions: Angular change detection, WebSocket reliability, WCAG compliance

**Adobe prep:**
- Products: Creative Cloud, Experience Cloud, Adobe XD, Firefly AI
- Stack: React, Next.js, TypeScript, GraphQL, Web Components
- Key interview themes: Performance (they obsess over assets), accessibility, rendering
- Likely questions: Image optimization, CSS performance, React internals, type safety

**Exercise:** For each company, identify your top 3 STAR stories that map to their values and write the first line of each.

---

## DAY 30 — Final Polish: Microsoft + Salesforce + Rest

**Microsoft prep:**
- Products: Teams, Office 365, Azure Portal, VS Code
- Stack: TypeScript, React, Angular, Blazor (varies)
- Key interview themes: TypeScript depth, accessibility (WCAG), performance, architecture
- Growth Mindset: Every answer should end with "what I'd do differently next time"

**Salesforce prep:**
- Products: Salesforce CRM, Lightning Experience, LWC
- Stack: LWC, Aura, React (Einstein), Apex
- Key interview themes: Web Components, RBAC/authorization, multi-tenant architecture
- Trust first: Frame every answer around "this is how I kept the system trustworthy"

**Morning:** Final revision of your 8 STAR stories
**Afternoon:** 5 more LeetCode (your weakest pattern from week 3)
**Evening:** Rest. Review only your summary bullet points from all 30 days.

---

# DAILY SCHEDULE TEMPLATE

```
07:00–07:30  Review yesterday's 3 bullet-point summaries
07:30–10:00  PRIMARY study (2.5 hours — no phone, no interruptions)
10:00–10:15  Break
10:15–11:00  SECONDARY task / implementation exercise
11:00–11:30  Speak answers aloud to the day's interview question(s)
             Evening (any time): Write today's 3 bullet-point summaries
             (What I learned, What surprised me, What I'd tell an interviewer)
```

---

# WEEKLY MOCK INTERVIEW SCHEDULE

| Week | Mock # | Type | Topic |
|------|--------|------|-------|
| Week 1, Friday | Mock 1 | Frontend Knowledge | Browser Rendering Pipeline |
| Week 2, Friday | Mock 2 | Architecture | React Dashboard with Real-Time Data |
| Week 3, Friday | Mock 3 | System Design | Real-Time Notification System |
| Week 4, Friday | Mock 4 | Full FAANG Loop | Microsoft Teams-Style Messaging Frontend |

**Mock Interview Format (45 minutes each):**
- 5 min: Setup + interviewer introduces the question
- 10 min: You clarify requirements (don't skip this — it's evaluated)
- 20 min: Architecture + deep-dive one component
- 10 min: Trade-offs, alternatives, failure scenarios
- Record every mock. Review next morning with fresh eyes.

---

# DSA QUICK REFERENCE — 10 MUST-KNOW PATTERNS

| # | Pattern | When to Use | Key Trick |
|---|---------|-------------|-----------|
| 1 | Two Pointers | Sorted array + pair problem | Left/right converge |
| 2 | Sliding Window | Contiguous subarray/substring | Expand right, shrink left |
| 3 | Prefix Sums | Range sum queries | Build prefix array once |
| 4 | Frequency Map | Count occurrences | Map<T, number> |
| 5 | Monotonic Stack | Next greater/smaller element | Stack of indices |
| 6 | BFS | Shortest path, level-by-level | Queue |
| 7 | DFS | All paths, backtracking | Recursion/stack |
| 8 | Binary Search | Sorted array, find position | `lo + (hi-lo)/2` |
| 9 | Memoization | Overlapping subproblems | Map<string, T> |
| 10 | Two Heaps | Median of stream | Max-heap + min-heap |

---

# TOPIC COVERAGE QUICK CHECKLIST

## Phase 1 — Foundations (Week 1)
- [ ] SEQ_01: JavaScript Engine & Runtime (Topics 1–21)
- [ ] SEQ_02: Browser & Web Platform Internals (Topics 22–42)
- [ ] SEQ_03: TypeScript Deep Dive (Topics 43–58)

## Phase 2 — Frameworks (Week 2)
- [ ] SEQ_04: Angular & RxJS Deep Dive (Topics 59–80)
- [ ] SEQ_05: React, Next.js & Redux (Topics 81–135)
- [ ] SEQ_06: State Management (Topics 136–148)
- [ ] SEQ_07: Data Fetching & API Design (Topics 149–164)

## Phase 3–4 — Performance & Architecture (Week 3 Days 15–17)
- [ ] SEQ_08: Performance Optimization (Topics 165–181)
- [ ] SEQ_09: Assets & Resource Optimization (Topics 182–195)
- [ ] SEQ_10: Frontend Architecture Patterns (Topics 196–209)
- [ ] SEQ_11: Rendering Strategies (Topics 210–225)

## Phase 5 — Reliability & Security (Week 3 Days 18–19)
- [ ] SEQ_12: Caching & Offline (Topics 226–239)
- [ ] SEQ_13: Security (Topics 240–257)
- [ ] SEQ_14: Authorization & Access Control (Topics 258–274)

## Phase 6 — Scalability & Real-Time (Week 3)
- [ ] SEQ_15: Real-Time Systems (Topics 275–287)
- [ ] SEQ_16: Scalability & Growth (Topics 288–303)

## Phase 7 — Quality & Observability (Week 3 Days 20–21)
- [ ] SEQ_17: Accessibility & UX (Topics 304–316)
- [ ] SEQ_18: Testing Strategy (Topics 317–331)
- [ ] SEQ_19: Observability (Topics 332–342)
- [ ] SEQ_20: CI/CD & Frontend DevOps (Topics 343–356)

## Phase 8 — Company-Specific (Week 4 Days 22, 29, 30)
- [ ] SEQ_21: Web Components & LWC (Topics 357–368)
- [ ] SEQ_22: SAP UI5 & Enterprise Frontend (Topics 369–382)

## Phase 9 — System Design & Interview Execution (Week 4)
- [ ] SEQ_23: Frontend System Design Foundations (Topics 383–392)
- [ ] SEQ_24: DSA for Frontend Engineers (Topics 393–410)
- [ ] SEQ_25: Practical System Design Problems (Topics 411–431)
- [ ] SEQ_26: Machine Coding ↔ Design Bridge (Topics 432–443)
- [ ] SEQ_27: Interview Strategy (Topics 444–454)

## Phase 10 — Leadership & Final Prep (Week 4)
- [ ] SEQ_28: FAANG-Level Expectations (Topics 455–466)
- [ ] SEQ_29: Behavioural & Leadership Round (Topics 467–486)

---

# YOUR STORY ARSENAL — QUICK REFERENCE

| Story | Key Numbers | Competency |
|-------|-------------|-----------|
| Lighthouse 60→95 | 58% improvement, 1.1s load time, CI adopted by 3 teams | Technical Leadership, Performance |
| WCAG AA cert | 0 accessibility blockers post-launch, JAWS/VoiceOver/NVDA tested | Quality, Accessibility |
| 80% vuln reduction | XSS/CSRF mitigations, OWASP top 10, presented to security board | Security Ownership |
| Mentoring 4 engineers | Structured 1:1s, PR review culture, 2 promotions within 1 year | Leadership |
| Micro-Frontend | Module Federation, 6 squads, zero cross-team coupling | Architecture |
| Bosch Dashboard | 6-week deadline, WebSocket real-time data, zero prod incidents | Reliability Under Pressure |
| Cross-Team Module | 3 teams, 2 months, no formal authority | Collaboration, Influence |
| Excellence Award | Nomination by Business stakeholders | External Impact Recognition |

---

# PRE-INTERVIEW FINAL CHECKLIST

**Night before:**
- [ ] Re-read your 8 STAR stories (summaries only)
- [ ] Review company values (30 minutes)
- [ ] Set up a whiteboard or iPad for system design diagrams
- [ ] Check: TSConfig strict mode, useEffect dependencies, fiber phases — these trip people up

**Day of:**
- [ ] Eat well. Sleep 8 hours. Start interview 15 minutes early.
- [ ] Open each answer with "High-Level first, then I'll go deeper" — signals senior thinking
- [ ] Think out loud. Interviewers at FAANG score your process, not just your answer.
- [ ] Trade-offs > perfect answers. Saying "I'd choose X because..." beats just saying "X".
- [ ] Use numbers: "Lighthouse 60 to 95", "4.2s to 1.1s", "80% vulnerability reduction"

**If you blank:**
> *"Let me think through this systematically — starting with the requirements..."*

**To signal staff-level thinking:**
> *"The naive approach would be X. In production at scale, the problem is Y. The better solution is Z because..."*

---

**Total: 486 Topics · 29 Sequences · 10 Phases · 4 Weeks**
**Apply Order: Cisco → Adobe → Microsoft → Salesforce**

---
*Created: April 2026 | Hruday D — Senior Frontend Engineer*
