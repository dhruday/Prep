# 🎯 90-Day FAANG Frontend Preparation Plan

**1 hour/day · 7 days/week · Google-focused · Always interview-ready**

---

## How to Use This Plan

- **Each day**: Read and study ONE topic file (45 min) + review yesterday's topic (15 min)
- **Each topic file** has: High-Level Answer → Deep Dive → Real-World Examples → Interview Q&A → Code
- **Track progress** in `study-dashboard.html` — check off each topic as you complete it
- **After Week 6**: You can handle a phone screen. After Week 10: ready for a full loop.
- **Weekends**: Marked with 🔄 review/practice days — use for weak areas or mock interviews

---

## Google Frontend Interview Format

| Round | What They Test | Prep Focus |
|-------|---------------|------------|
| **Phone Screen** | JavaScript coding, DOM manipulation | SEQ_02, SEQ_24 |
| **Coding Round 1** | UI component building, React patterns | SEQ_05, SEQ_26 |
| **Coding Round 2** | Async patterns, API design, state | SEQ_06, SEQ_07 |
| **System Design** | Frontend architecture at scale | SEQ_23, SEQ_25, SEQ_10 |
| **Behavioral** | Leadership, collaboration, conflict | SEQ_29 |

---

## Phase 1 — JavaScript & Browser Foundations (Days 1–22)

*This is what Google tests hardest in coding rounds. Non-negotiable.*

### Week 1: Browser Internals (SEQ_02 — Module 2.1–2.2)

| Day | File | Topic |
|-----|------|-------|
| 1 | `SEQ_02/.../09_How_the_Browser_Works.md` | How the Browser Works |
| 2 | `SEQ_02/.../10_Critical_Rendering_Path.md` | Critical Rendering Path |
| 3 | `SEQ_02/.../11_HTML_Parsing_CSSOM_Render_Tree.md` | HTML Parsing, CSSOM, Render Tree |
| 4 | `SEQ_02/.../12_Browser_Process_Architecture.md` | Browser Process Architecture |
| 5 | `SEQ_02/.../12_JavaScript_Execution_Model.md` | JavaScript Execution Model |
| 6 | `SEQ_02/.../13_Event_Loop_Microtasks_vs_Macrotasks.md` | Event Loop — Microtasks vs Macrotasks |
| 7 | 🔄 **Review Day** | Re-read Days 1–6. Write down interview answers from memory. |

### Week 2: Browser Rendering + Network (SEQ_02 — Module 2.2–2.5)

| Day | File | Topic |
|-----|------|-------|
| 8 | `SEQ_02/.../14_Main_Thread_vs_Worker_Threads.md` | Main Thread vs Worker Threads |
| 9 | `SEQ_02/.../15_Web_Workers_Service_Workers_Worklets.md` | Web Workers, Service Workers, Worklets |
| 10 | `SEQ_02/.../16_Garbage_Collection_Memory_Leaks.md` | Garbage Collection & Memory Leaks |
| 11 | `SEQ_02/.../16_Reflows_vs_Repaints.md` | Reflows vs Repaints |
| 12 | `SEQ_02/.../17_GPU_vs_CPU_Rendering.md` | GPU vs CPU Rendering |
| 13 | `SEQ_02/.../18_Browser_Resource_Prioritization.md` | Browser Resource Prioritization |
| 14 | 🔄 **Review Day** | Re-read Days 8–13. |

### Week 3: Browser Storage + Network + TypeScript Start (SEQ_02 + SEQ_03)

| Day | File | Topic |
|-----|------|-------|
| 15 | `SEQ_02/.../19_Compositing_Layers_will_change.md` | Compositing Layers & will-change |
| 16 | `SEQ_02/.../19_Memory_Management_in_Browser.md` | Memory Management in Browser |
| 17 | `SEQ_02/.../21_Network_Stack_Basics.md` | Network Stack Basics |
| 18 | `SEQ_02/.../22_HTTP_1.1_vs_HTTP_2_vs_HTTP_3.md` | HTTP/1.1 vs HTTP/2 vs HTTP/3 |
| 19 | `SEQ_02/.../24_DNS_Prefetch_Preconnect_Resource_Hints.md` | DNS Prefetch, Preconnect, Resource Hints |
| 20 | `SEQ_02/.../25_QUIC_and_HTTP3.md` | QUIC and HTTP/3 |
| 21 | 🔄 **Review Day** | Review all SEQ_02. Self-test: explain CRP, event loop, reflow in 2 min each. |

---

## Phase 2 — TypeScript (Days 22–28)

*Every Google FE codebase uses TypeScript. Interviewers expect fluent TS.*

### Week 4: TypeScript Deep Dive (SEQ_03)

| Day | File | Topic |
|-----|------|-------|
| 22 | `SEQ_03/.../284_Types_vs_Interfaces.md` | Types vs Interfaces |
| 23 | `SEQ_03/.../285_Union_and_Intersection_Types.md` | Union & Intersection Types |
| 24 | `SEQ_03/.../286_Generics.md` | Generics |
| 25 | `SEQ_03/.../288_Conditional_Types.md` | Conditional Types |
| 26 | `SEQ_03/.../289_Mapped_Types.md` | Mapped Types |
| 27 | `SEQ_03/.../293_Typing_Props_Children_Events_Refs.md` | Typing React Props, Events, Refs |
| 28 | 🔄 **Review Day** | Review TS. Skim remaining: 287, 290–292, 294–299 (15 min each). |

---

## Phase 3 — React Deep Dive (Days 29–49)

*Google's frontend is React. This is the longest phase for a reason.*

### Week 5: React Internals + Hooks (SEQ_05 — Module 28.1–28.2)

| Day | File | Topic |
|-----|------|-------|
| 29 | `SEQ_05/.../420_React_Fiber.md` | React Fiber Architecture |
| 30 | `SEQ_05/.../421_Virtual_DOM_Reconciliation.md` | Virtual DOM & Reconciliation |
| 31 | `SEQ_05/.../422_Scheduler_Priority_Lanes.md` | Scheduler & Priority Lanes |
| 32 | `SEQ_05/.../423_Concurrent_Mode_Suspense.md` | Concurrent Mode & Suspense |
| 33 | `SEQ_05/.../424_Event_System.md` | React Event System |
| 34 | `SEQ_05/.../425_Rendering_Pipeline.md` | React Rendering Pipeline |
| 35 | 🔄 **Review Day** | Review Fiber, reconciliation. Draw the React rendering pipeline from memory. |

### Week 6: Hooks Mastery (SEQ_05 — Module 28.2)

| Day | File | Topic |
|-----|------|-------|
| 36 | `SEQ_05/.../426_useState_useReducer.md` | useState & useReducer |
| 37 | `SEQ_05/.../427_useEffect.md` | useEffect Deep Dive |
| 38 | `SEQ_05/.../428_useMemo_useCallback.md` | useMemo & useCallback |
| 39 | `SEQ_05/.../429_useRef.md` | useRef |
| 40 | `SEQ_05/.../430_useContext.md` | useContext |
| 41 | `SEQ_05/.../432_Custom_Hooks.md` | Custom Hooks |
| 42 | 🔄 **Review Day** | Review hooks. Write a custom hook from memory. Skim 431, 433–435. |

> **🟢 CHECKPOINT**: After Day 42, you can handle a Google phone screen.

### Week 7: React 18/19 + Patterns (SEQ_05 — Module 28.3–28.4)

| Day | File | Topic |
|-----|------|-------|
| 43 | `SEQ_05/.../436_React_18_Features.md` | React 18 Features |
| 44 | `SEQ_05/.../438_React_Server_Components.md` | React Server Components |
| 45 | `SEQ_05/.../440_Streaming_SSR.md` | Streaming SSR |
| 46 | `SEQ_05/.../443_Compound_Components.md` | Compound Components Pattern |
| 47 | `SEQ_05/.../445_Higher_Order_Components.md` | HOC Pattern |
| 48 | `SEQ_05/.../447_Error_Boundaries.md` | Error Boundaries |
| 49 | 🔄 **Review Day** | Review React patterns. Skim 437, 439, 441-442, 444, 446, 448-449. |

---

## Phase 4 — State & Data (Days 50–59)

### Week 8: State Management + Data Fetching (SEQ_06 + SEQ_07)

| Day | File | Topic |
|-----|------|-------|
| 50 | `SEQ_06/.../63_Local_Component_State.md` | Local Component State |
| 51 | `SEQ_06/.../64_Global_State_Management.md` | Global State Management |
| 52 | `SEQ_06/.../67_Redux_Zustand_Signals.md` | Redux vs Zustand vs Signals |
| 53 | `SEQ_06/.../70_Redux_Toolkit_createSlice_RTK_Query_createAsyncThunk.md` | Redux Toolkit & RTK Query |
| 54 | `SEQ_07/.../78_REST_API_Consumption_Patterns.md` | REST API Consumption |
| 55 | `SEQ_07/.../79_GraphQL_in_Frontend_Systems.md` | GraphQL in Frontend |
| 56 | 🔄 **Review Day** | Review state + API patterns. |

### Week 9: API Design & Reliability (SEQ_07)

| Day | File | Topic |
|-----|------|-------|
| 57 | `SEQ_07/.../84_Debouncing_and_Throttling.md` | Debouncing & Throttling |
| 58 | `SEQ_07/.../86_Optimistic_UI_Updates.md` | Optimistic UI Updates |
| 59 | `SEQ_07/.../87_AbortController_Request_Cancellation.md` | AbortController & Cancellation |
| 60 | `SEQ_07/.../88_Error_Handling_Retry_Strategies.md` | Error Handling & Retry |
| 61 | `SEQ_07/.../92_Circuit_Breaker_Pattern.md` | Circuit Breaker Pattern |
| 62 | `SEQ_07/.../81_Pagination_Strategies.md` | Pagination Strategies |
| 63 | 🔄 **Review Day** | Review API patterns. Skim remaining SEQ_07 files. |

---

## Phase 5 — Performance (Days 64–73)

*Google cares deeply about Core Web Vitals. This is a senior-level differentiator.*

### Week 10: Performance Metrics + Code Optimization (SEQ_08)

| Day | File | Topic |
|-----|------|-------|
| 64 | `SEQ_08/.../69_Frontend_Performance_Metrics.md` | Frontend Performance Metrics |
| 65 | `SEQ_08/.../70_FCP_LCP_CLS_TTI_INP.md` | FCP, LCP, CLS, TTI, INP |
| 66 | `SEQ_08/.../71_Code_Splitting_Strategies.md` | Code Splitting |
| 67 | `SEQ_08/.../73_Tree_Shaking.md` | Tree Shaking |
| 68 | `SEQ_08/.../75_Virtualization_Large_Lists.md` | Virtualization for Large Lists |
| 69 | `SEQ_08/.../78_Main_Thread_Scheduling.md` | Main Thread Scheduling |
| 70 | 🔄 **Review Day** | Review performance. Skim 72, 74, 76-77, 79-81, 97-98, 103, 107-108, 113. |

> **🟢 CHECKPOINT**: After Day 70, you can handle a full Google interview loop.

---

## Phase 6 — Architecture & Rendering (Days 71–80)

### Week 11: Architecture + Rendering (SEQ_10 + SEQ_11)

| Day | File | Topic |
|-----|------|-------|
| 71 | `SEQ_10/.../25_Component_Based_Architecture.md` | Component-Based Architecture |
| 72 | `SEQ_10/.../30_Micro_Frontend_Architecture.md` | Micro Frontend Architecture |
| 73 | `SEQ_10/.../31_Module_Federation.md` | Module Federation |
| 74 | `SEQ_10/.../32_Design_System_Architecture.md` | Design System Architecture |
| 75 | `SEQ_11/.../34_Client_Side_Rendering_CSR.md` | CSR |
| 76 | `SEQ_11/.../35_Server_Side_Rendering_SSR.md` | SSR |
| 77 | 🔄 **Review Day** | Review architecture. Skim remaining SEQ_10/11 files. |

---

## Phase 7 — Security + Caching (Days 78–84)

### Week 12: Security & Caching (SEQ_12 + SEQ_13)

| Day | File | Topic |
|-----|------|-------|
| 78 | `SEQ_13/.../124_XSS.md` | XSS |
| 79 | `SEQ_13/.../125_CSRF.md` | CSRF |
| 80 | `SEQ_13/.../133_CSP.md` | Content Security Policy |
| 81 | `SEQ_13/.../127_Authentication_Flows.md` | Authentication Flows |
| 82 | `SEQ_12/.../92_HTTP_Caching.md` | HTTP Caching |
| 83 | `SEQ_12/.../94_Service_Workers.md` | Service Workers |
| 84 | 🔄 **Review Day** | Review security + caching. Skim remaining SEQ_12/13 files. |

---

## Phase 8 — System Design Practice (Days 85–91)

*This is the highest-weight round at Google L5+. Spend extra time here.*

### Week 13: System Design Foundations + Practice (SEQ_23 + SEQ_25)

| Day | File | Topic |
|-----|------|-------|
| 85 | `SEQ_23/.../01_What_is_Frontend_System_Design.md` | What is Frontend System Design |
| 86 | `SEQ_23/.../04_What_FAANG_Interviewers_Look_For.md` | What FAANG Interviewers Look For |
| 87 | `SEQ_23/.../05_HLD_vs_LLD_in_Frontend_Context.md` | HLD vs LLD in Frontend |
| 88 | `SEQ_25/.../232_Autocomplete_Search.md` | Design: Autocomplete Search |
| 89 | `SEQ_25/.../233_Notification_System.md` | Design: Notification System |
| 90 | `SEQ_25/.../237_Virtual_Scrolling_Component.md` | Design: Virtual Scrolling |
| 91 | 🔄 **Review + Mock** | Practice explaining one system design aloud (timer: 35 min). |

> **🟢 CHECKPOINT**: After Day 91, you are competitive for Google L5+.

---

## Ongoing (Day 92+) — Behavioral + DSA + Deepening

From here, cycle through these on a rolling basis:

### Rolling Week A: DSA for Frontend (SEQ_24)

| Day | File | Topic |
|-----|------|-------|
| A1 | `SEQ_24/.../300_Two_Pointers_Pattern.md` | Two Pointers |
| A2 | `SEQ_24/.../301_Sliding_Window_Pattern.md` | Sliding Window |
| A3 | `SEQ_24/Module 21.4 — Trees & Graphs/` (any) | BFS/DFS for DOM |
| A4 | `SEQ_24/Module 21.6 — Frontend-Specific DSA/` (LRU Cache) | LRU Cache Implementation |
| A5 | `SEQ_24/Module 21.6 — Frontend-Specific DSA/` (EventEmitter) | EventEmitter |
| A6 | `SEQ_24/Module 21.6 — Frontend-Specific DSA/` (Promise.all) | Promise.all/race |
| A7 | 🔄 **Review** | |

### Rolling Week B: Machine Coding + More System Design (SEQ_25 + SEQ_26)

| Day | File | Topic |
|-----|------|-------|
| B1 | `SEQ_25/.../230_Poll_Widget.md` | Design: Poll Widget |
| B2 | `SEQ_25/.../231_Image_Carousel.md` | Design: Image Carousel |
| B3 | `SEQ_25/.../235_Rich_Text_Editor.md` | Design: Rich Text Editor |
| B4 | `SEQ_25/Module 16.2/` (Chat UI) | Design: Chat UI |
| B5 | `SEQ_25/Module 16.2/` (E-Commerce) | Design: E-Commerce Frontend |
| B6 | `SEQ_26/Module 17.1/` (any) | Component Decomposition |
| B7 | 🔄 **Mock Interview** | Practice 1 system design + 1 coding problem aloud. |

### Rolling Week C: Behavioral (SEQ_29)

| Day | File | Topic |
|-----|------|-------|
| C1 | `SEQ_29/.../386_STAR_Method.md` | STAR Framework |
| C2 | `SEQ_29/Module 26.2/` (Tech Leadership story) | Your Tech Leadership Story |
| C3 | `SEQ_29/Module 26.2/` (Conflict story) | Your Conflict Resolution Story |
| C4 | `SEQ_29/Module 26.2/` (Failure story) | Your Failure & Recovery Story |
| C5 | `SEQ_29/Module 26.2/` (Mentoring story) | Your Mentoring Story |
| C6 | `SEQ_29/Module 26.3/` (Google values) | Google Values Alignment |
| C7 | 🔄 **Story Practice** | Rehearse 3 STAR stories aloud (2 min each). |

### Rolling Week D: Advanced Topics (SEQ_15 + SEQ_16 + SEQ_17 + SEQ_18)

| Day | File | Topic |
|-----|------|-------|
| D1 | `SEQ_15/.../104_WebSockets.md` | WebSockets |
| D2 | `SEQ_15/.../105_Server-Sent_Events.md` | Server-Sent Events |
| D3 | `SEQ_16/.../112_Designing_for_Millions.md` | Designing for Millions of Users |
| D4 | `SEQ_16/.../115_Feature_Flags.md` | Feature Flags |
| D5 | `SEQ_17/.../146_Web_Accessibility.md` | Web Accessibility |
| D6 | `SEQ_18/.../323_Unit_vs_Integration_vs_E2E.md` | Testing Pyramid |
| D7 | 🔄 **Review** | Skim remaining topics from SEQ_15-20. |

After Week D, cycle back to A or focus on weak areas.

---

## Sequences to Deprioritize

These are valuable but not Google-specific. Only study if targeting those companies:

| SEQ | When to Study |
|-----|---------------|
| `SEQ_04` (Angular/RxJS) | Only if interviewing at companies using Angular |
| `SEQ_21` (Web Components/LWC) | Only if interviewing at Salesforce |
| `SEQ_22` (SAP UI5) | Only if interviewing at SAP or continuing current role |

---

## Weekly Self-Check

Every Sunday, ask yourself:

1. ✅ Can I explain this week's topics in 2 minutes each without notes?
2. ✅ Can I draw the architecture diagram on a whiteboard?
3. ✅ Do I know the trade-offs and when NOT to use this approach?
4. ✅ Can I code the key pattern (hooks, async, component) from memory?

If any answer is "no" — revisit that topic on the next review day.

---

## Emergency Interview Prep (Got a call? Do this.)

If you get an interview call mid-plan, do these in order:

| Priority | What to Review | Time |
|----------|---------------|------|
| 1 | SEQ_23 — System Design Foundations | 2 hours |
| 2 | SEQ_25 — 3 system design problems (Autocomplete, Chat, E-Commerce) | 3 hours |
| 3 | SEQ_05 — React Fiber + Hooks (420-432) | 2 hours |
| 4 | SEQ_24 — LRU Cache, EventEmitter, Promise.all | 1 hour |
| 5 | SEQ_29 — 5 STAR stories | 1 hour |
| 6 | SEQ_02 — Event loop, CRP, reflow/repaint | 1 hour |

**Total emergency prep: ~10 hours across 2–3 days**
