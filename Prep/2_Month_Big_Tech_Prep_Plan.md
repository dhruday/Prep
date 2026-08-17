# 2-Month Big Tech Preparation Plan
**Hruday D — Full Stack / Senior Frontend**
**Targets: Microsoft · Google · Adobe + Big Tech**
**8 Weeks · Interview-ready from Week 1**

---

## Ground Rules

- **Assume a call can come any week.** Behavioral stories + system design framework are locked down in Week 1.
- **Daily minimums:** 2 hours weekdays, 4 hours weekend.
- **DSA every single day** — 2 problems minimum (non-negotiable for Google).
- **Sunday ritual:** 1 mock interview (record yourself, review next morning).
- **Tracking:** Mark `✅` at topic level in your index files as you become able to explain without notes.

### Company-Specific Focus

| Company | #1 Bar | #2 Bar | DSA Weight |
|---|---|---|---|
| **Google** | DSA (hard) | System design at scale | 🔴 Very High |
| **Microsoft** | Behavioral ("As Appropriate") | TypeScript + React/System Design | 🟡 Medium |
| **Adobe** | React internals + Performance | Testing philosophy | 🟡 Medium |
| **Full-Stack roles** | Java/Spring + API design | Frontend + Backend system design | 🟡 Medium |

---

## Quick Reference: Your File Locations

- Frontend index: `FrontEndSystem Design/index.md` (474 topics, 28 parts)
- Backend index: `Backend System Design/Index.md` (213 topics, 24 parts)
- DSA index: `DSA/Index.md` (250+ topics, 22 parts)
- Frontend SEQ folders: `FrontEndSystem Design/SEQ_*/`
- Backend Part folders: `Backend System Design/Part*/`

---

---

# WEEK 1 — Emergency Survival Kit
> **Goal:** Be interview-ready RIGHT NOW for any surprise call. The topics here give maximum coverage with minimum time.

---

### Daily DSA (every day this week): Arrays + Hashmaps
- 2 problems/day from LeetCode: Two Sum variants, sliding window, frequency maps
- From DSA index: Part 2 #11–20 (Two Pointers), Part 4 #41–48 (Frequency Maps, Two-Sum Variants)

---

### Day 1 (Mon) — Behavioral Stories: Lock All 8 Stories

**This is your highest ROI day. Microsoft's "As Appropriate" round is won or lost here.**

From your index: `SEQ_29_Behavioural_and_Leadership_Round` (topics #386–405)
- Write all 8 STAR stories on paper — story title + 3 bullet action points + 1 quantified result
- Story 1: Lighthouse 60→95
- Story 2: WCAG AA Certification
- Story 3: 80% Security Reduction
- Story 4: Mentoring 4 Engineers
- Story 5: Micro-Frontend Architecture
- Story 6: Bosch Deadline Delivery
- Story 7: Cross-Team Module Delivery
- Story 8: Excellence Award

**Target time per story out loud: under 2.5 minutes. Practice all 8 today.**

**Microsoft-specific:** Map each story to Growth Mindset / Clarity / Energy / Success of Others (#398). Every story should end with "what I'd do differently" (#387).

---

### Day 2 (Tue) — System Design: The Framework

**PRIMARY:** Backend Index `Part01` (#1–8) + Interview Strategy `Part 20` (#161–167)
- HLD vs LLD distinction
- Functional vs Non-Functional requirements
- The 6-step framework: Clarify → Estimate → Design → Deep-dive → Scale → Trade-offs

**SECONDARY:** Frontend Index `Part 1` (#1–10): Foundations & Mindset, what FAANG looks for (#4–6)

**Practical:** From a blank page, design a URL shortener in 45 minutes using the framework. Draw it.

---

### Day 3 (Wed) — JS/TS Survival Tier

**PRIMARY:** `SEQ_03_TypeScript_Deep_Dive` — Topics #284–291
- Types vs Interfaces, Union/Intersection types, Generics, Conditional Types, Discriminated Unions
- Utility Types: Partial, Pick, Omit, Record, ReturnType (#292)

**SECONDARY:** Frontend `SEQ_02` — JS Event Loop (#15–16), Memory Leaks (#19)

**This directly covers:** Microsoft TypeScript round, Adobe React+TS questions

---

### Day 4 (Thu) — System Design: Scalability + CAP

**PRIMARY:** Backend `Part02` (#9–17) + `Part10` (#85–92)
- Vertical vs horizontal scaling, latency vs throughput, tail latency
- CAP theorem, eventual vs strong consistency, PACELC

**SECONDARY:** Frontend Index Capacity Estimation for Frontend (#10)

**Interview out loud:** *"Walk me through your approach to designing a system for 10M daily users from scratch."*

---

### Day 5 (Fri) — Performance: Core Web Vitals

**PRIMARY:** Frontend `SEQ_08_Performance_Optimization` — #95–103
- FCP, LCP, CLS, INP, TTI definitions + how each is affected by code decisions
- Code splitting, lazy loading, tree shaking, memoization

**SECONDARY:** Frontend `SEQ_09_Assets_and_Resource_Optimization` — Image optimisation (#114–117), CDN (#123)

**Why Friday:** Adobe almost always asks about Lighthouse/CWV. You want this sharp for any call.

---

### Day 6 (Sat) — React Internals Crash Course

**PRIMARY:** Frontend `SEQ_05_React_NextJS_and_Redux_Deep_Dive` — React Internals #420–425
- Fiber architecture, reconciliation algorithm, commit vs render phase, Strict Mode

**SECONDARY:** Hooks #426–432 (useState, useEffect, useRef, useMemo, useCallback — the 6 most-asked)

**Practical:** From scratch, rebuild a `useDebounce` custom hook with full TypeScript types.

---

### Day 7 (Sun) — Mock Interview #1 (Record yourself)

**Format:** 45-minute system design
- Problem: Design a notification system (Backend `Part16` #138)
- Use the 6-step framework from Day 2
- After: watch back, identify where you paused too long or skipped capacity math

---

---

# WEEK 2 — Backend System Design Core
> **Goal:** Sufficient depth on databases, caching, APIs, and messaging to pass a backend system design round at any big tech company.

---

### Daily DSA: Trees (BFS/DFS)
- 2 problems/day: Binary tree traversals, BFS, level order
- From DSA index: Part 11 #101–112 (Binary Trees), Part 13 #130–142 (Graph BFS/DFS)

---

### Day 8 — Databases: SQL, NoSQL, Indexing

**PRIMARY:** Backend `Part07` (#53–63) + `Part08` (#64–68, 72–76)
- SQL vs NoSQL selection criteria, B-Tree indexing, query optimisation
- Sharding strategies: range, hash, directory-based
- Hot partition problem

**SECONDARY:** Backend `Part08` #70–71: Replication, Master-Slave vs Master-Master

**Decision drill:** Given a system requirement, say out loud which DB you'd pick and exactly why. Do this for: Twitter timeline, banking transactions, product catalogue, IoT sensor data.

---

### Day 9 — Caching: Full Picture

**PRIMARY:** Backend `Part09` (#77–84)
- LRU/LFU eviction, Read-through/Write-through/Write-back
- Cache stampede, cache consistency, distributed caching (Redis)

**SECONDARY:** Frontend `SEQ_12_Caching_and_Offline` — HTTP caching (#128–130), stale-while-revalidate (#139), Cache API (#134)

**Combined:** Understand caching at every layer: browser → CDN → API gateway → app cache → DB query cache

---

### Day 10 — APIs, Rate Limiting, Auth

**PRIMARY:** Backend `Part14` (#119–127)
- REST API design principles, versioning, pagination, rate limiting
- Authentication vs authorisation, OAuth high-level, secure API design

**SECONDARY:** Frontend Security `SEQ_13_Security` — XSS (#171), CSRF (#172), CORS (#173), JWT deep dive (#179)

**This directly maps to:** Backend Part24 #212 (Idempotent APIs)

---

### Day 11 — Messaging & Async Systems

**PRIMARY:** Backend `Part11` (#93–102)
- Kafka fundamentals, Pub-Sub, at-least-once/exactly-once guarantees
- Dead letter queues, ordering guarantees, idempotency

**SECONDARY:** Frontend `SEQ_15_Real_Time_Systems` — WebSockets (#143), SSE (#144), polling (#142)

---

### Day 12 — Resilience Patterns

**PRIMARY:** Backend `Part13` (#109–118)
- Circuit breaker, bulkheads, retry + exponential backoff, graceful degradation
- Chaos engineering intro

**SECONDARY:** Backend `Part12` (#103–108): Leader election, distributed locks, consensus

**Design exercise:** Draw the resilience pattern stack for a payment service (circuit breaker → bulkhead → retry → DLQ)

---

### Day 13 (Sat) — Full-Stack Case Study Day

**PRIMARY:** Backend `Part16` case studies #136–145
- URL Shortener, Rate Limiter, Chat System, Feed System, Payment System (high level)
- For each: spend 15 minutes on the design, then check your notes

**SECONDARY:** Frontend `SEQ_25_Practical_System_Design_Problems` — E-Commerce Frontend (#238), Chat UI (#239)

---

### Day 14 (Sun) — Mock Interview #2

**Format:** 45-minute system design
- Problem: Design a chat system like Slack (covers backend #139 + frontend #240)
- Focus: WebSocket vs SSE decision, database choice for message history, fan-out strategy

---

---

# WEEK 3 — Frontend Architecture + Performance Depth
> **Goal:** Complete frontend system design readiness. Adobe + Microsoft frontend rounds.

---

### Daily DSA: Stacks, Queues, Graphs
- 2 problems/day: Monotonic stack, BFS graph traversal, connected components
- From DSA index: Part 8 #71–82 (Stacks & Queues), Part 13 #130–142 (Graphs)

---

### Day 15 — Rendering Strategies: Complete Picture

**PRIMARY:** Frontend `SEQ_11_Rendering_Strategies` — #47–62
- CSR vs SSR vs SSG trade-offs (#56), ISR, Partial Pre-Rendering
- Streaming + Progressive Rendering (#52), Islands Architecture (#54)
- React Server Components deep dive (#55)

**SECONDARY:** Next.js rendering: App Router vs Pages Router (#457), Server vs Client Components (#458)

**Interview drill:** *"When would you choose SSR over SSG for a product listing page at Adobe scale?"*

---

### Day 16 — Browser Internals: Rendering Pipeline

**PRIMARY:** Frontend `SEQ_02_Browser_and_Web_Platform_Internals` — #11–23
- Critical Rendering Path, HTML parsing, CSSOM
- Reflows vs repaints (#20), Compositing layers (#23)
- Browser process architecture (#14)

**SECONDARY:** #24–27: Memory management, storage options, OPFS

---

### Day 17 — State Management: All Approaches

**PRIMARY:** Frontend `SEQ_06_State_Management` — #63–77
- Redux/Zustand/Signals, server state vs client state (#68)
- RTK Query deep dive (#70), React Query (#71), NgRx (#72)
- XState (#76), URL as state (#77)

**SECONDARY:** Redux deep dive: createSlice, createAsyncThunk (#450–452), normalised state (#454)

---

### Day 18 — Data Fetching + Real-Time

**PRIMARY:** Frontend `SEQ_07_Data_Fetching_and_API_Design` — #78–94
- Pagination vs infinite scroll, cursor vs offset (#83)
- Debounce/throttle (#84), AbortController (#87)
- Optimistic UI (#86), circuit breaker (#92), skeleton loaders (#94)

**SECONDARY:** Frontend `SEQ_15_Real_Time_Systems` — #142–154
- Message ordering (#151), event deduplication (#152), conflict resolution (#154)

---

### Day 19 — Security: Complete Frontend Picture

**PRIMARY:** Frontend `SEQ_13_Security` — #171–188
- XSS types + prevention, CSRF (SameSite + tokens)
- CORS preflight + credentialed requests
- CSP design + nonce-based (#184), secure headers audit (#185)

**SECONDARY:** Auth flows: OAuth 2.0 + OIDC (#178), JWT refresh strategy (#179), Passkeys (#180)

**Critical rule:** In any interview answer involving user data or APIs, mention the relevant security consideration unprompted. This signals seniority.

---

### Day 20 (Sat) — Performance: Deep Session

**PRIMARY:** Frontend `SEQ_08_Performance_Optimization` — #104–113
- Virtualisation (#104), avoiding re-renders (#105)
- Long tasks + yielding (#110), INP (#111), layout thrashing (#112)
- scheduler.postTask() (#113)

**SECONDARY:** `SEQ_09_Assets_and_Resource_Optimization` — Compression (#121), CSS-in-JS tradeoffs (#122), third-party scripts (#124)

**Practical:** Run Lighthouse on any live site, identify 3 issues, write the fixes.

---

### Day 21 (Sun) — Mock Interview #3

**Format:** Frontend system design
- Problem: Design a LinkedIn-style feed (#242 from your index)
- Cover: rendering strategy, state management, real-time updates, performance, virtualisation

---

---

# WEEK 4 — React + TypeScript Deep Dive
> **Goal:** Pass Adobe and Microsoft React/TS technical depth rounds.

---

### Daily DSA: Dynamic Programming Basics
- 2 problems/day: Climbing stairs, coin change, LCS
- From DSA index: Part 15 #161–178 (DP Core Problems)

---

### Day 22 — React Hooks: Every Hook Deeply

**PRIMARY:** Frontend `SEQ_05` Hooks #426–435
- useState batching + lazy init, useEffect cleanup rules (#427)
- useRef DOM vs mutable values (#428)
- useMemo — when it helps vs hurts (#429), useCallback misuse (#430)
- useReducer when to prefer (#431), useContext pitfalls (#432)
- useTransition + useDeferredValue (#433)

**Practical:** Build a component that correctly uses `useEffect` with cleanup, `useCallback` for stable references, and `useMemo` for derived data.

---

### Day 23 — React 18 & 19: New Features

**PRIMARY:** Frontend `SEQ_05` React 18/19 #436–442
- Automatic batching (#436), Suspense for data fetching (#437)
- RSC server vs client boundary (#438), use() hook (#439)
- Server Actions (#440), React Compiler (#441)

**SECONDARY:** React Patterns #443–449: Compound Component, HOC pitfalls, Error Boundaries, Portals

---

### Day 24 — Next.js App Router: Complete

**PRIMARY:** Frontend `SEQ_05` Next.js #457–466
- App Router file conventions: layouts, templates, loading.tsx, error.tsx
- Data fetching: `fetch()` with `cache`, `revalidate` (#460)
- 4 caching layers: Request Memoization, Data Cache, Full Route Cache, Router Cache (#466)
- Parallel Routes + Intercepting Routes (#465)

**SECONDARY:** Next.js Middleware patterns (#462), Streaming with Suspense (#464)

**Key question Adobe asks:** *"How does Next.js App Router caching work and when would you bust each layer?"*

---

### Day 25 — TypeScript Advanced Types

**PRIMARY:** Frontend `SEQ_03_TypeScript_Deep_Dive` — #288–299
- Conditional types + `infer` (#288), Mapped types (#289)
- Template literal types (#290), Discriminated unions (#291)
- Typing React: Props, Events, Refs, Custom Hooks (#293–295)
- tsconfig deep dive: strict, paths, moduleResolution (#297)

**SECONDARY:** Declaration files (.d.ts) writing and consuming (#298)

---

### Day 26 — React Performance Patterns

**PRIMARY:** Frontend `SEQ_05` React Performance #467–474
- Complete re-render rules (#467), React.memo + custom comparator (#468)
- Key prop mistakes (#469), Windowing with react-window (#471)
- Code splitting with React.lazy + Suspense (#472)
- Why Did You Render detection (#474)

**SECONDARY:** React DevTools: Reading flame graphs (#473), profiler patterns (#107)

---

### Day 27 (Sat) — Redux + RTK Query Full Depth

**PRIMARY:** Frontend `SEQ_05` Redux #450–456
- Redux core: store, reducers, middleware chain
- RTK Query: defineApi, endpoint types, cache invalidation strategy (#452)
- Redux middleware: Thunk vs Saga vs Observable (#453)
- When NOT to use Redux (#456) — signal seniority

**SECONDARY:** NgRx (#378–381) — if Cisco/Angular roles are likely

---

### Day 28 (Sun) — Mock Interview #4

**Format:** Technical depth round (Adobe-style)
- *"Explain React reconciliation and how keys affect it"*
- *"You have a React list with 10,000 rows — walk me through your optimisation strategy step by step"*
- *"What's the difference between useCallback and useMemo? Give a real case where you've misused one"*

---

---

# WEEK 5 — Angular/RxJS + Java/Spring Full-Stack
> **Goal:** Full-stack depth. Cisco Angular rounds + Java backend depth questions.

---

### Daily DSA: Frontend-Specific Implementations
- Implement from scratch: LRU Cache (DSA index #220), EventEmitter (#221), deep clone (#222)
- 30 min/day — these appear directly in Microsoft/Adobe machine coding

---

### Day 29 — Angular Architecture Deep Dive

**PRIMARY:** Frontend `SEQ_04_Angular_and_RxJS_Deep_Dive` — #364–367
- NgModules vs Standalone Components (Angular 14+) (#364)
- Dependency Injection: hierarchical injectors, tokens (#365)
- Component lifecycle: all 8 hooks (#366)
- Angular Router: lazy loading, guards, resolvers (#367)

**SECONDARY:** Change Detection: Default vs OnPush (#368), zone.js (#369), Zoneless/Signals (#370)

---

### Day 30 — RxJS Mastery

**PRIMARY:** Frontend `SEQ_04` RxJS #372–377
- Cold vs Hot Observables — draw the marble diagrams (#372)
- Subject variants: BehaviorSubject, ReplaySubject, AsyncSubject (#373)
- **The 4 flattening operators with real examples** (#374):
  - `switchMap` — cancel previous (search autocomplete)
  - `mergeMap` — parallel (upload multiple files)
  - `concatMap` — sequential preserving order (queue operations)
  - `exhaustMap` — ignore until complete (login button)
- takeUntil pattern for memory leaks (#376)

**This is the most-asked Angular/RxJS topic at Cisco and Adobe.**

---

### Day 31 — Angular Performance + NgRx

**PRIMARY:** Frontend `SEQ_04` #378–385
- NgRx: Store, Actions, Reducers, Effects, Selectors (#378)
- Angular Signals v17+: signal(), computed(), effect() (#380)
- OnPush + trackBy patterns (#382), Pure vs Impure pipes (#383)
- Deferrable views @defer (#385)

**SECONDARY:** NgRx Entity Adapter (#379), Akita vs NgRx vs Signal Store tradeoffs (#381)

---

### Day 32 — Java/Spring: JVM + Thread Safety

**PRIMARY:** Backend `Part24` — 203 (JVM Basics), 204 (Memory Leaks), 205 (Thread Safety)
- Heap (Young/Old Gen), GC algorithms (G1, ZGC)
- ThreadLocal leaks, static collection leaks
- JMM, volatile, synchronized, java.util.concurrent

**SECONDARY:** Backend `Part24` #206 (Thread Pools): ThreadPoolExecutor internals, bulkhead pattern, `@Async` config

---

### Day 33 — Spring Boot Internals

**PRIMARY:** Backend `Part24` — 207 (Request Lifecycle), 208 (Filters/Interceptors/AOP), 209 (@Transactional)
- Full request pipeline: Tomcat → Filters → DispatcherServlet → Interceptors → Controller
- The self-invocation problem
- Propagation levels: REQUIRED vs REQUIRES_NEW use cases

**SECONDARY:** Backend `Part24` #210 (HikariCP) + #211 (ORM N+1)
- Pool sizing formula: `(2 × CPU) + spindles`
- JOIN FETCH vs @EntityGraph vs @BatchSize

---

### Day 34 (Sat) — API Design + Exception Handling

**PRIMARY:** Backend `Part24` #212 (Idempotent APIs) + #213 (Exception Handling)
- Idempotency key pattern: Redis vs DB-backed, race condition handling
- `@RestControllerAdvice`, RFC 7807 Problem Details
- Exception hierarchy design, logging strategy (WARN for 4xx, ERROR for 5xx)

**SECONDARY:** OOP/SOLID `Part21` (#168–178) — quick refresh for full-stack interviews
- SRP, OCP, DIP most commonly asked

---

### Day 35 (Sun) — Mock Interview #5

**Format:** Full-stack system design
- Problem: Design a real-time collaborative document editor
- Cover: WebSockets, conflict resolution (CRDT/OT), backend API design, @Transactional, state management on frontend

---

---

# WEEK 6 — DSA Intensive (Google Focus)
> **Goal:** LeetCode Medium fluency. Google requires this regardless of seniority.

> **Commitment this week:** DSA is the PRIMARY focus (4 problems/day). System design and behavioral are secondary.

---

### Day 36 — Arrays + Strings + Sliding Window
- 4 LeetCode mediums: Two pointers, sliding window, prefix sum
- DSA index: Part 2 #11–20 (Two Pointers), Part 6 #55–67 (Sliding Window), Part 3 #21–34 (Strings)
- Target: under 20 minutes per problem

---

### Day 37 — Trees: BFS + DFS
- 4 LeetCode mediums: Binary tree traversals, level order, symmetric tree
- DSA index: Part 11 #101–112 (Binary Trees — all traversals + level order)
- DOM tree traversal as graph problem — unique to frontend interviews

---

### Day 38 — Graphs + Connected Components
- 4 LeetCode mediums: Number of islands, course schedule, graph BFS
- DSA index: Part 13 #130–142 (Graph BFS/DFS/Topological Sort)

---

### Day 39 — Stacks + Queues
- 4 LeetCode mediums: Monotonic stack, valid parentheses, LRU cache
- DSA index: Part 8 #71–82 + #220 (LRU from scratch — doubly linked list + HashMap)
- **LRU Cache from scratch** appears in every big tech company interview

---

### Day 40 — Dynamic Programming
- 4 LeetCode mediums/hards: Knapsack variant, longest common subsequence, coin change
- DSA index: Part 15 #161–178 (DP Core), Part 16 #179–188 (DP Advanced)

---

### Day 41 (Sat) — Frontend-Specific Implementations
- Implement from scratch (no reference):
  - `Promise.all` + `Promise.race` + `Promise.allSettled` (DSA index #223)
  - `curry`, `memoize`, `once`, `pipe` (DSA index #226)
  - `EventEmitter` pub/sub (#221)
  - `deepClone` + `deepEqual` (#222)
- These appear directly in Microsoft and Adobe machine coding rounds

---

### Day 42 (Sun) — Mock Interview #6

**Format:** Google-style (2 × 45 min DSA back-to-back)
- Problem 1: Medium tree/graph problem
- Problem 2: Medium DP problem
- Focus on talking through your approach before coding — Google interviewers reward thinking out loud

---

---

# WEEK 7 — Large System Design + Company-Specific
> **Goal:** Tie everything together with full-scale system design and company-specific preparation.

---

### Daily DSA: 2 problems/day (maintain, don't drop)

---

### Day 43 — Design Patterns + Clean Code Review

**PRIMARY:** Backend `Part22` Design Patterns #179–193
- Most asked: Strategy, Observer, Decorator, Factory, Builder, Proxy
- The `if-else` → Strategy refactor (direct FAANG question)

**SECONDARY:** Backend `Part23` Clean Code #194–202
- KISS, DRY, YAGNI, Code Smells, Refactoring Techniques

---

### Day 44 — Observability + CI/CD

**PRIMARY:** Frontend `SEQ_19_Observability` + `SEQ_20_CICD_and_Frontend_DevOps` — #206–216, #338–351
- Logging strategy, error tracking (Sentry), distributed tracing, correlation IDs
- GitHub Actions pipeline: Lint → Type-check → Test → Build → Deploy (#343)
- Blue-green, canary, feature flags (#345–347)

**SECONDARY:** Backend `Part15` Observability #128–135 (Logging, Metrics, SLO/SLA)

---

### Day 45 — Accessibility + Testing Philosophy

**PRIMARY:** Frontend `SEQ_17_Accessibility_and_UX` — #217–229
- WCAG 2.1 vs 2.2, ARIA, keyboard navigation
- Accessibility as NFR (#227), performance impact on accessibility (#228)

**SECONDARY:** Frontend `SEQ_18_Testing_Strategy` — #323–337
- Testing Trophy vs Pyramid, Jest + React Testing Library depth (#326–327)
- Playwright vs Cypress tradeoffs (#331), visual regression (#335)

---

### Day 46 — Large System Design: Google Docs + Feed

**PRIMARY:**
- Design Google Docs-style collaborative editor (#244 frontend index) — full end-to-end
- Design LinkedIn Feed (#242) — SSR vs CSR decision, feed ranking, fan-out

**These incorporate:** WebSockets, conflict resolution, caching, state management, real-time updates, virtualisation, @Transactional, connection pooling

---

### Day 47 — Micro-Frontend + Scaling Patterns

**PRIMARY:** Frontend #41–46: Micro-frontend architecture, Module Federation, Monorepo
- Frontend `SEQ_16_Scalability_and_Growth` — #155–170: CDN-first, feature flags, A/B testing, i18n

**SECONDARY:** Backend scaling: `Part06` Load Balancing, `Part10` consistency patterns

---

### Day 48 (Sat) — Company-Specific Prep

**Microsoft track (3 hours):**
- Re-read your 8 behavioral stories — time each one, trim to 2.5 min
- Map each to the 4 Microsoft values: Growth Mindset, Clarity, Energy, Success of Others (#398)
- Compensation: Levels.fyi prep (#405), counter-offer framework (#403)

**Google track (1 hour):**
- Study Google's engineering principles: simplicity, reliability at scale
- System design answers should mention Bigtable, Spanner, Pub/Sub equivalents when relevant

---

### Day 49 (Sun) — Mock Interview #7

**Format:** Full mock (Mixed)
- 30 min: Behavioral (Microsoft "As Appropriate" style — 3 behavioral questions back-to-back)
- 45 min: System design (design Google Drive file storage backend — Backend `Part16` #142)
- After: identify 1 weakness, schedule it as extra study before Week 8

---

---

# WEEK 8 — Final Sprint: Polish + Mock Interviews
> **Goal:** Peak readiness. Fix weak spots, final company research, sharpen communication.

---

### Day 50 — Weak Spot Day
- From your mock interview reviews (weeks 1–7), identify your 2 weakest areas
- Spend the full day on those 2 topics only
- Common weak spots: capacity math (practice the arithmetic), DB sharding decisions, RxJS concatMap vs exhaustMap live explanation

---

### Day 51 — SAP → Big Tech Translation

**PRIMARY:** Frontend `SEQ_22_SAP_UI5_and_Enterprise_Frontend` — #417–419
- How to articulate SAP UI5 work (#417): *"OData is essentially a typed REST layer with rich filtering — similar to GraphQL's query flexibility with REST's simplicity"*
- Transferable skills: UI5 MVC → React/Angular patterns, OData → REST/GraphQL (#418)
- SAP BI Launchpad case study: performance, security, accessibility (#419)

---

### Day 52 — Compensation + Interview Close

**PRIMARY:** Frontend `Part26` #402–405
- How to respond to offers without weakening position
- Anchoring and counter-offer timing
- Base vs equity vs bonus trade-offs at each target company

**SECONDARY:** Interview closers (#270–271): *"Here's what I've been thinking about your design since we started..."* — signal continued engagement

---

### Day 53 — Speed Review: All Cheat Sheets

**PRIMARY:** Backend `Part18` Ultimate Cheat Sheets (#150–155)
- Scalability, Database Selection, Caching, CAP/PACELC, Messaging Guarantees

**SECONDARY:** DSA index: Part 22 Quick-Reference Patterns (template for each classic problem type)

**Practice:** Answer 10 system design questions as Twitter-length answers (one paragraph each) — a fast way to identify gaps

---

### Day 54 (Sat) — Full Mock Day

**Run 3 mock sessions back-to-back (with breaks):**

**Session 1 (1h):** DSA — 2 medium problems, 30 min each, timed
**Session 2 (45 min):** Frontend system design — Design Figma-like collaborative canvas (covers WebSockets, canvas rendering, state management, CRDT)
**Session 3 (45 min):** Behavioral — 5 questions, 2.5 min each, recorded

**Review everything together and write a 1-page "things to say better next time" note.**

---

### Day 55 (Sun) — Final Mock Interview #8

**Format:** Full Google/Microsoft style 1-on-1 (find a mock partner or use Pramp)
- Problem: Design YouTube (video streaming — Backend `Part16` #143)

**After:** You're ready. Stop adding new topics. Revisit only your written stories and system design framework.

---

---

## Summary: What Gets You Into Each Company

| Company | Your Strongest Asset | What to Emphasise |
|---|---|---|
| **Google** | System design scale thinking + DSA | Back-of-envelope math, distributed systems depth, N+1 & CAP, clean code |
| **Microsoft** | 8 behavioral stories (verified by Award + Metrics) + TypeScript | Growth Mindset framing, every story ends with "what I'd do differently" |
| **Adobe** | React depth + Performance + Accessibility + Testing | Lighthouse story (60→95), WCAG story, React Fiber knowledge |
| **Full-Stack roles** | Java/Spring Part 24 depth + Frontend + API design | @Transactional, HikariCP, N+1 fix, idempotency — you've written all these |

---

## If a Call Comes Before Week 4 Ends

Your minimum viable readiness kit (can be locked down in 3 days of focused prep):

1. **6-step system design framework** (Day 2) — works for any problem
2. **2–3 behavioral stories** with quantified results (Day 1) — start with Stories 1, 3, 7
3. **React hooks depth** — useEffect cleanup, useMemo when it hurts (Day 22)
4. **CAP theorem + caching** — 90% of HLD interviews touch these (Days 4+9)
5. **TypeScript generics + utility types** — 15-minute top-up (Day 3)

---

## Weekly Mock Interview Schedule

| Week | Mock Problem | Format | Focus |
|---|---|---|---|
| 1 | Notification System | 45 min HLD | 6-step framework |
| 2 | Slack Chat System | 45 min HLD | WebSockets + DB choice |
| 3 | LinkedIn Feed | 45 min Frontend SD | Rendering + Virtualisation |
| 4 | React Technical Depth | 45 min Technical | Hooks + Reconciliation |
| 5 | Collaborative Editor | 45 min Full-Stack | CRDT + Spring + WS |
| 6 | DSA Back-to-Back | 2 × 45 min DSA | Tree + DP problems |
| 7 | Google Drive | 45 min + Behavioral | Mixed round |
| 8 | YouTube / Final | 45 min Full Mock | Peak readiness |
