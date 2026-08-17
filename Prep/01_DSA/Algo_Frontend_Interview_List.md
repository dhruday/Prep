# Algo + Frontend Interview Problem List
**Hruday D — Senior Frontend Engineer**
**Target: Google · Microsoft · Meta · Amazon · Salesforce · Uber · Adobe · Stripe**
**8 Parts · Curated Senior-Level Preparation · Pattern-First Approach**

> ★ = high-signal topic for senior frontend loops. Company and team formats vary; use stars to prioritize, not as a guarantee of a specific question.
>
> 🟩 Easy · 🟦 Medium · 🟥 Hard
>
> Complete short statements and solutions are in [12.Algo_Frontend](12.Algo_Frontend/README.md).

---

## How to Use This List

- **Solve before reviewing:** for every coding problem, state a brute-force approach, optimize it, write runnable JavaScript/TypeScript, and test edge cases.
- **Practice senior trade-offs:** in UI and design questions, explicitly discuss accessibility, loading/error/empty states, observability, security, performance, and maintainability.
- **Prioritize stars first:** complete every ★ item before broadening into variations.
- **Timebox deliberately:** 30–35 minutes for an algorithm or JavaScript utility, 45–60 minutes for machine coding, and 45 minutes for frontend system design.

### Senior Interview Completion Standard

Do not mark an item complete until you can do all of the following without notes:

1. Clarify requirements, constraints, and edge cases.
2. Explain the chosen data structure or browser/API primitive.
3. State time and space complexity, including important trade-offs.
4. Produce readable, testable code with meaningful names.
5. Walk through failure modes, accessibility, and performance implications where relevant.

---

## PART 1️⃣ — Core Algorithms: Arrays, Strings & Hashing

### 📘 Module 1.1: Arrays & Two Pointers

#### 🟩 Easy
1. [ ] Two Sum ★ — hash map; return indices and handle duplicate values.
2. [ ] Valid Anagram ★ — frequency map; compare normalized character counts.
3. [ ] Contains Duplicate — set membership; explain expected hash-table complexity.
4. [ ] Valid Palindrome ★ — two pointers; define filtering and case-normalization rules.
5. [ ] Best Time to Buy and Sell Stock ★ — one-pass running minimum and best profit.

#### 🟦 Medium
6. [ ] Three Sum ★ — sort plus two pointers; remove duplicate triplets correctly.
7. [ ] Product of Array Except Self ★ — prefix/suffix products without division.
8. [ ] Container With Most Water ★ — prove why moving the shorter wall is safe.
9. [ ] Sort Colors / Dutch National Flag — in-place three-way partitioning.
10. [ ] Merge Sorted Arrays — in-place backward merge; account for capacity.

#### 🟥 Hard
11. [ ] Trapping Rain Water ★ — two-pointer invariant and O(1) extra space.
12. [ ] First Missing Positive — in-place index placement; explain O(n) time/O(1) extra space.

### 📘 Module 1.2: Sliding Window & Prefix Sum

#### 🟩 Easy
13. [ ] Longest Substring Without Repeating Characters ★ — variable window and last-seen index.
14. [ ] Maximum Average Subarray I — fixed-size sliding window.

#### 🟦 Medium
15. [ ] Subarray Sum Equals K ★ — prefix sum plus frequency map; support negative numbers.
16. [ ] Longest Repeating Character Replacement — window validity with a running maximum frequency.
17. [ ] Find All Anagrams in a String — fixed window and count comparison.
18. [ ] Minimum Size Subarray Sum — contrast positive-only sliding window with prefix sums.

#### 🟥 Hard
19. [ ] Minimum Window Substring ★ — satisfy counts, shrink safely, and preserve the best range.

### 📘 Module 1.3: Intervals, Sorting & Search

#### 🟩 Easy
20. [ ] Binary Search ★ — exact match, left/right boundaries, and loop invariants.
21. [ ] First/Last Position in Sorted Array — boundary binary searches.

#### 🟦 Medium
22. [ ] Merge Intervals ★ — comparator, overlap test, and output mutation policy.
23. [ ] Insert Interval ★ — merge before/during/after the insertion range.
24. [ ] Search in Rotated Sorted Array ★ — identify the sorted half each iteration.
25. [ ] Kth Largest Element ★ — choose between a heap and quickselect.

#### 🟥 Hard
26. [ ] Meeting Rooms II ★ — sweep line or min-heap; return maximum concurrent rooms.
27. [ ] Median of Two Sorted Arrays — partition-based binary search; know the idea even if uncommon.

---

## PART 2️⃣ — Core Algorithms: Structures, Trees, Graphs & DP

### 📘 Module 2.1: Stack, Queue, Linked List & Cache

#### 🟩 Easy
28. [ ] Valid Parentheses ★ — stack matching and invalid closing-token cases.
29. [ ] Reverse Linked List ★ — iterative pointer reversal and empty/single-node cases.
30. [ ] Implement Queue Using Two Stacks — amortized O(1) dequeue.

#### 🟦 Medium
31. [ ] Daily Temperatures / Next Greater Element ★ — monotonic stack of indices.
32. [ ] Min Stack ★ — preserve O(1) `getMin` without rescanning.
33. [ ] Linked List Cycle ★ — Floyd slow/fast pointers; explain why they meet.
34. [ ] LRU Cache ★ — hash map plus doubly linked list with O(1) get/put.

#### 🟥 Hard
35. [ ] Largest Rectangle in Histogram — monotonic-stack boundaries and sentinel handling.

### 📘 Module 2.2: Trees, Graphs & Traversal

#### 🟩 Easy
36. [ ] Binary Tree Level Order Traversal ★ — BFS queue and level boundaries.
37. [ ] Maximum Depth / Balanced Tree — recursive height contracts.
38. [ ] Validate Binary Search Tree ★ — carry valid lower/upper bounds, not just child checks.

#### 🟦 Medium
39. [ ] Lowest Common Ancestor ★ — binary-tree recursion and BST optimization.
40. [ ] Number of Islands ★ — grid DFS/BFS, visited representation, and mutability choice.
41. [ ] Clone Graph ★ — identity map prevents cycles and duplicated clones.
42. [ ] Course Schedule ★ — directed-cycle detection / topological ordering.
43. [ ] Rotting Oranges — multi-source BFS and elapsed-level accounting.

#### 🟥 Hard
44. [ ] Word Ladder — shortest transformation with BFS; discuss dictionary indexing.
45. [ ] Network Delay Time — Dijkstra with a min-priority queue.

### 📘 Module 2.3: Dynamic Programming & Backtracking

#### 🟩 Easy
46. [ ] Climbing Stairs — recurrence, base cases, and constant-space iteration.
47. [ ] House Robber ★ — include/exclude state and rolling variables.

#### 🟦 Medium
48. [ ] Coin Change ★ — minimum-count DP and unreachable state representation.
49. [ ] Longest Increasing Subsequence ★ — know O(n²) DP and O(n log n) tails/binary-search approach.
50. [ ] Combination Sum — backtracking state, choices, and pruning.
51. [ ] Word Break — DP plus dictionary lookup; compare top-down and bottom-up.

#### 🟥 Hard
52. [ ] Longest Common Subsequence — 2D state definition and space optimization.
53. [ ] Decode Ways — distinguish valid transitions from invalid leading-zero states.

---

## PART 3️⃣ — JavaScript & TypeScript Deep Dive ★

### 📘 Module 3.1: JavaScript Language Semantics

#### 🟩 Easy
54. [ ] Explain `var`, `let`, `const`, scope, hoisting, and the temporal dead zone.
55. [ ] Explain `this` ★ — regular functions, arrow functions, methods, `call`, `apply`, and `bind`.
56. [ ] Explain closures ★ — lifetime, private state, and common loop-capture mistakes.
57. [ ] Explain prototype lookup, classes, and inheritance without confusing prototypes with instances.
58. [ ] Explain shallow copy versus deep copy; identify reference-sharing bugs.

#### 🟦 Medium
59. [ ] Implement `debounce` ★ — trailing, leading, cancel, and stale-argument behavior.
60. [ ] Implement `throttle` ★ — leading/trailing policies and timer cleanup.
61. [ ] Implement `curry` / partial application — preserve arity and `this` where required.
62. [ ] Implement `memoize` ★ — cache keys, invalidation/TTL, and memory-growth trade-offs.
63. [ ] Implement deep `get` / immutable `set` by a dot-and-bracket path.
64. [ ] Implement deep equality — arrays, objects, dates, cycles, and prototype policy.
65. [ ] Implement `EventEmitter` / Pub-Sub ★ — unsubscribe, once-listeners, listener order, and errors.

#### 🟥 Hard
66. [ ] Implement a deep clone with circular-reference support — `WeakMap`, supported types, and limitations.
67. [ ] Implement a simplified `Promise.all` ★ — order preservation, early rejection, and empty input.
68. [ ] Implement a concurrency-limited async task pool ★ — queueing, errors, cancellation policy, and result order.

### 📘 Module 3.2: Async JavaScript & TypeScript

#### 🟩 Easy
69. [ ] Explain the event loop ★ — call stack, microtasks, macrotasks, and the observable order of promises/timers.
70. [ ] Explain promises versus `async`/`await`; trace error propagation and `finally` behavior.
71. [ ] Type a data-fetching result using `unknown`, narrowing, and discriminated unions.

#### 🟦 Medium
72. [ ] Build `retry` with exponential backoff and jitter — retryable errors, cap, and abort behavior.
73. [ ] Design request cancellation with `AbortController` ★ — unmount, new-search, and timeout races.
74. [ ] Deduplicate in-flight requests — cache promise lifecycle and avoid poisoning failed results.
75. [ ] Type a reusable generic component / hook — inference, constraints, callbacks, and JSX generics.
76. [ ] Model UI async states as a discriminated union rather than independent booleans.

#### 🟥 Hard
77. [ ] Explain `Promise.all`, `race`, `allSettled`, and `any` ★ — choose the correct failure and cancellation semantics for a product flow.

---

## PART 4️⃣ — Browser, Web Platform, HTML & CSS ★

### 📘 Module 4.1: Browser Fundamentals

#### 🟩 Easy
78. [ ] Explain DOM event propagation ★ — capture, target, bubble, `stopPropagation`, and delegation.
79. [ ] Implement event delegation for a dynamic list — use `closest`, containment, and semantic targets.
80. [ ] Explain cookies, `localStorage`, `sessionStorage`, IndexedDB, and in-memory state — choose by lifetime, sensitivity, and capacity.
81. [ ] Explain CORS ★ — origin, preflight, credentials, and why the server must opt in.
82. [ ] Explain HTTP caching — `Cache-Control`, ETag, revalidation, immutable assets, and CDN cache keys.

#### 🟦 Medium
83. [ ] Explain the rendering pipeline ★ — parsing, style, layout, paint, compositing, and forced synchronous layout.
84. [ ] Diagnose layout thrashing — batch DOM reads/writes and use browser profiling evidence.
85. [ ] Build an accessible modal — focus placement/trap/restore, Escape, backdrop, scroll lock, and portal behavior.
86. [ ] Implement a popover/tooltip — positioning, viewport collision, dismissal, and keyboard behavior.
87. [ ] Explain Service Worker and Cache Storage — offline-first trade-offs, update lifecycle, and cache invalidation.

#### 🟥 Hard
88. [ ] Design cross-tab synchronization — `BroadcastChannel`, storage events, conflict policy, and clean-up.
89. [ ] Move CPU-heavy work off the main thread — Web Worker message protocol, transferables, cancellation, and fallback.

### 📘 Module 4.2: CSS, Responsiveness & Accessibility

#### 🟩 Easy
90. [ ] Explain the CSS box model, block/inline formatting, stacking contexts, and `z-index` failure modes.
91. [ ] Build a responsive layout with Grid and Flexbox — content-first breakpoints and no fixed device assumptions.
92. [ ] Audit semantic HTML and keyboard navigation ★ — headings, landmarks, labels, visible focus, and native controls.

#### 🟦 Medium
93. [ ] Build accessible tabs/accordion — WAI-ARIA roles only where native HTML is insufficient; arrow-key navigation.
94. [ ] Explain image performance — responsive sources, width/height/aspect-ratio, lazy loading, decoding, and CDN formats.
95. [ ] Debug a cumulative-layout-shift issue — reserve space and avoid late visual changes.

#### 🟥 Hard
96. [ ] Audit an interactive form for accessibility — error announcements, validation timing, focus management, and screen-reader flow.

---

## PART 5️⃣ — React, State & Component Architecture ★

### 📘 Module 5.1: React Fundamentals & Data Flow

#### 🟩 Easy
97. [ ] Explain render versus commit, state updates, batching, and why render must remain pure.
98. [ ] Explain keys and reconciliation ★ — stable identity, list reordering, and why index keys can corrupt state.
99. [ ] Build a controlled form — field state, validation, submit state, and accessible error output.
100. [ ] Explain `useEffect` ★ — synchronization with external systems, cleanup, dependency correctness, and what should not be an effect.

#### 🟦 Medium
101. [ ] Build a resilient data-fetching hook ★ — loading/error/empty/success states, aborting stale requests, and retry.
102. [ ] Explain `useMemo`, `useCallback`, and `memo` ★ — measure first; prevent unnecessary work without hiding stale dependencies.
103. [ ] Design local state, lifted state, context, URL state, server cache, and global store boundaries.
104. [ ] Build a reusable compound component — controlled/uncontrolled API, context, accessibility, and escape hatches.
105. [ ] Explain error boundaries, Suspense, code splitting, and fallback UX.

#### 🟥 Hard
106. [ ] Diagnose a React performance regression — profiler evidence, referential stability, context fan-out, and list virtualization.
107. [ ] Explain SSR, hydration, streaming, and Server Components at a product-architecture level — server/client boundaries, hydration mismatches, and caching.

### 📘 Module 5.2: Frontend Architecture & Testing

#### 🟩 Easy
108. [ ] Explain component API design — composability, sensible defaults, explicit variants, and backwards compatibility.
109. [ ] Test a component by user behavior — queries by role/label, async waiting, and avoiding implementation-detail tests.

#### 🟦 Medium
110. [ ] Design a shared component library ★ — tokens, primitives, accessibility contracts, versioning, documentation, and visual regression tests.
111. [ ] Build optimistic UI — temporary identity, rollback, duplicate submission prevention, and eventual server truth.
112. [ ] Plan a safe legacy React migration — seams, strangler approach, feature flags, metrics, and rollback.

#### 🟥 Hard
113. [ ] Decide whether micro-frontends are justified — independent delivery versus runtime duplication, UX fragmentation, shared dependencies, and observability.

---

## PART 6️⃣ — Machine Coding & Practical UI Problems ★

### 📘 Module 6.1: High-Frequency Components

#### 🟦 Medium
114. [ ] Build autocomplete/typeahead ★ — debounce, cancellation, keyboard navigation, ARIA combobox semantics, cache, and highlighted matches.
115. [ ] Build a paginated/infinite list ★ — loading states, deduplication, end-of-list, retry, URL state, and intersection observer.
116. [ ] Build a virtualized list ★ — viewport/window math, overscan, variable-height strategy, and accessibility trade-offs.
117. [ ] Build a multi-step form ★ — validation boundaries, persisted draft, navigation guards, submission idempotency, and recovery.
118. [ ] Build a file uploader ★ — validation, progress, cancellation, retry, preview safety, and resumability discussion.
119. [ ] Build a sortable drag-and-drop list — pointer/keyboard interactions, insertion calculation, focus, and optimistic persistence.
120. [ ] Build a nested file explorer/tree ★ — recursion, expanded state, lazy loading, selection, keyboard navigation, and large-tree performance.

#### 🟥 Hard
121. [ ] Build a client-side router — history integration, URL matching, parameters, 404s, scroll restoration, and lazy routes.
122. [ ] Build a simplified rich-text editor — document model, selection, commands, undo/redo, sanitization, and why `contenteditable` is difficult.
123. [ ] Build a real-time notifications panel — connection lifecycle, ordering, unread count, deduplication, reconnect, and accessible announcements.

### 📘 Module 6.2: Review Checklist for Any Machine-Coding Prompt

124. [ ] State the component contract: inputs, outputs, ownership, and invalid states before coding.
125. [ ] Include loading, empty, error, offline, and success states.
126. [ ] Demonstrate keyboard access, focus management, and mobile/responsive behavior.
127. [ ] Explain test strategy: unit, integration, end-to-end, visual, and accessibility checks.

---

## PART 7️⃣ — Frontend System Design ★

### 📘 Module 7.1: System Design Framework

#### 🟩 Easy
128. [ ] Practice requirements clarification — users, primary task, scale, supported browsers/devices, latency, availability, and privacy constraints.
129. [ ] Draw a frontend architecture boundary — rendering, state, API client, cache, routing, analytics, feature flags, and error handling.
130. [ ] Explain client-side caching choices — HTTP cache, memory cache, persistent cache, stale-while-revalidate, invalidation, and offline policy.

#### 🟦 Medium
131. [ ] Design a search experience ★ — typeahead, query/page URL state, cancellation, cache, ranking handoff, empty/error states, and telemetry.
132. [ ] Design a large e-commerce product experience ★ — SSR/CSR split, image delivery, cart consistency, inventory/price changes, experiment flags, and checkout boundaries.
133. [ ] Design an analytics dashboard ★ — data contracts, filters, pagination, chart rendering, caching, partial failures, export, and performance budget.
134. [ ] Design a messaging/notification UI — real-time transport, ordering, read receipts, reconnect, optimistic sends, and offline queue.
135. [ ] Design an authenticated application shell — session lifecycle, authorization-driven navigation, refresh failure, multi-tab logout, and sensitive-data handling.
136. [ ] Design a design-system adoption plan ★ — tokens, accessible primitives, migration tooling, versioning, governance, and adoption metrics.

#### 🟥 Hard
137. [ ] Design a collaborative document editor — document model, local/remote operations, conflict strategy, presence, reconnection, permissions, and performance boundaries.
138. [ ] Design a frontend platform for multiple teams — build/deploy isolation, shared runtime policy, observability, experimentation, security, and rollback.

### 📘 Module 7.2: Required Design Follow-Ups

139. [ ] State API and data contracts: pagination/cursors, versioning, partial errors, idempotency, and backward compatibility.
140. [ ] State frontend observability: Web Vitals, errors, failed requests, interaction traces, business events, and privacy-safe sampling.
141. [ ] State rollout safety: feature flags, canary audience, metrics, alert thresholds, kill switch, and rollback.

---

## PART 8️⃣ — Performance, Security, Reliability & Final Readiness ★

### 📘 Module 8.1: Performance & Reliability

#### 🟩 Easy
142. [ ] Explain Core Web Vitals ★ — LCP, INP, and CLS; describe what user experience each represents.
143. [ ] Explain bundle analysis and code splitting — route/component split points, duplicate dependencies, and regression budgets.
144. [ ] Explain lazy loading trade-offs — network priority, interaction latency, and avoiding over-splitting.

#### 🟦 Medium
145. [ ] Investigate a slow page with evidence ★ — Performance panel, network waterfall, Web Vitals, long tasks, and RUM versus lab data.
146. [ ] Reduce a slow list or dashboard — virtualization, memoization after measurement, pagination, worker offload, and rendering budgets.
147. [ ] Design resilient API UX — timeout, retry policy, exponential backoff, idempotency, partial data, and user recovery action.
148. [ ] Plan a performance budget — JavaScript/CSS/image thresholds, CI enforcement, field metrics, and ownership.

#### 🟥 Hard
149. [ ] Diagnose an interaction-latency regression — distinguish input delay, event work, rendering, and third-party cost; validate the fix in field data.

### 📘 Module 8.2: Security, Accessibility & Delivery

#### 🟩 Easy
150. [ ] Explain XSS prevention ★ — contextual escaping, safe DOM APIs, HTML sanitization, CSP, and why client-side validation is insufficient.
151. [ ] Explain CSRF and authentication choices — `SameSite` cookies, CSRF tokens, token storage risks, and session expiration UX.
152. [ ] Explain browser security boundaries — CORS is not authentication; explain iframe/embed and clickjacking defenses.

#### 🟦 Medium
153. [ ] Perform a frontend security review — untrusted HTML/URLs, dependency risk, secrets, redirects, file uploads, and analytics PII.
154. [ ] Plan an accessibility regression strategy ★ — automated checks, keyboard testing, screen-reader smoke tests, and manual design review.
155. [ ] Explain a production incident response — detect, mitigate, communicate, preserve evidence, learn, and prevent recurrence.

#### 🟥 Hard
156. [ ] Lead a design/code review trade-off discussion — defend a simple initial design, identify its limits, and define the evidence that would justify added complexity.

---

## Final Readiness Checklist

- [ ] I can solve all ★ algorithm items in JavaScript/TypeScript within 35 minutes and explain the complexity.
- [ ] I can implement debounce, throttle, event emitter, `Promise.all`, request cancellation, retry, and a concurrency-limited queue from memory.
- [ ] I can explain the event loop, rendering pipeline, caching, CORS, accessibility, and browser storage with concrete examples.
- [ ] I can build an accessible autocomplete, modal, virtualized list, and data-fetching flow under time pressure.
- [ ] I can design search, dashboard, e-commerce, messaging, and design-system solutions with clear frontend trade-offs.
- [ ] I can diagnose a performance issue using evidence rather than applying memoization or code splitting blindly.
- [ ] I can discuss XSS, CSRF, CSP, authentication, privacy, testing, rollout, and rollback as normal design constraints.

---

*Use this as a curated senior-frontend checklist alongside [Index.md](Index.md): the index provides breadth; this list prioritizes the work most likely to demonstrate strong frontend engineering judgment.*
