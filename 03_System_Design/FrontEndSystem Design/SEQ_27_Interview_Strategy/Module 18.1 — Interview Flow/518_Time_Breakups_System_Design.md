# 518. Time Breakups — System Design Interview

────────────────────────────────────
## 1. Why Time Management Matters
────────────────────────────────────

Most candidates fail system design interviews not because of technical gaps, but because of time mismanagement. They spend 20 minutes on requirements, rush through architecture, and never reach optimization. Interviewers have a rubric with 5-6 sections — if you skip one, you literally can't score on it.

────────────────────────────────────
## 2. Time Breakups by Interview Length
────────────────────────────────────

### 45-Minute Interview (Google, Meta standard)

| Phase | Time | What to Cover | Signal |
|-------|------|---------------|--------|
| **Requirements** | 5 min | Functional, non-func, scope, constraints | "I clarify before building" |
| **Architecture** | 10 min | Component tree, client-server, rendering strategy | "I think in systems" |
| **Data Model** | 7 min | TypeScript entities, API contracts, state shape | "I design before coding" |
| **Implementation** | 13 min | Key component APIs, ARIA, code snippets | "I can actually build this" |
| **Optimization** | 7 min | Perf, a11y, security, scale, monitoring | "I think about production" |
| **Q&A** | 3 min | Follow-ups from interviewer | "I handle pressure" |

### 60-Minute Interview (Microsoft, Adobe, Amazon)

| Phase | Time | What to Cover |
|-------|------|---------------|
| **Requirements** | 7 min | Deep functional + non-functional, user personas |
| **Architecture** | 12 min | Detailed diagrams, state management decision, API layer |
| **Data Model** | 10 min | Full TypeScript interfaces, cache strategy, WebSocket types |
| **Implementation** | 18 min | Working code snippets, ARIA patterns, keyboard nav |
| **Optimization** | 10 min | Deep-dive 2-3 areas (perf + a11y + scale) |
| **Q&A** | 3 min | Follow-ups |

### 90-Minute Interview (Staff/Principal level)

| Phase | Time | What to Cover |
|-------|------|---------------|
| **Requirements** | 10 min | Full product analysis, persona mapping, success metrics |
| **Architecture** | 20 min | Multiple architecture options, trade-off comparison, migration path |
| **Data Model** | 15 min | Schema design, cache invalidation, conflict resolution |
| **Implementation** | 25 min | Production-grade code, error handling, testing strategy |
| **Optimization** | 15 min | Performance budget, monitoring setup, incident response |
| **Q&A** | 5 min | Architecture defense, alternative approaches |

────────────────────────────────────
## 3. Common Time Traps
────────────────────────────────────

| Trap | Problem | Fix |
|------|---------|-----|
| Over-clarifying requirements | 15+ min on requirements, no time for design | Set a timer. Stop at 5-7 min. |
| Perfect architecture diagram | Drawing detailed boxes for 20 min | Sketch, don't illustrate. Arrows + labels. |
| Writing full code | Implementing a complete component | Show key snippets. Say "I'd implement X here..." |
| Rabbit-holing on one topic | 15 min on caching alone | Cover breadth first, depth on interviewer's probes |
| Forgetting optimization | No time left for perf/a11y/security | Always reserve last 10 min for O in RADIO |

────────────────────────────────────
## 4. Transition Phrases (Time Management Signals)
────────────────────────────────────

| When | What to Say |
|------|-------------|
| After requirements | "I've scoped the core features. Let me move to architecture." |
| After architecture | "This gives us the high-level structure. Let me define the data model." |
| Running behind | "In the interest of time, let me sketch this and move to optimization." |
| Skipping detail | "I'll note this as an extension point and cover it if we have time." |
| Probed on a topic | "Great question — let me go deeper on that." |
| Wrapping up | "Let me summarize: we designed X with Y architecture, key trade-offs are Z." |

────────────────────────────────────
## 5. Memory Aid
────────────────────────────────────

**The 5-10-7-13-7-3 split (45 min):** Requirements, Architecture, Data, Implementation, Optimization, Q&A.

**Golden rule:** "Breadth first, depth on demand. Cover all rubric sections, then go deep where the interviewer probes."

**If you go blank on timing:** "Roughly 10% on requirements, 25% on architecture, 15% on data model, 30% on implementation, 20% on optimization."
