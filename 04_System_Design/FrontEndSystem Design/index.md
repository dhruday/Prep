# Frontend Interview Master Index
**Hruday D — Senior Frontend Engineer**
**Target: Microsoft · Adobe · Salesforce · Cisco**
**27 Parts · 419 Topics · 3 Months**

> ★ = Newly added topics for target company coverage

---

## PART 1️⃣ — Frontend System Design Foundations

### 📘 Module 1.1: Foundations & Mindset
1. What is Frontend System Design
2. How Frontend System Design Differs from Backend Design
3. Role of a Senior / Staff Frontend Engineer

### 📘 Module 1.2: Interviews & Expectations
4. What FAANG Interviewers Look For
5. HLD vs LLD in Frontend Context
6. How Microsoft / Adobe / Salesforce / Cisco Differ in Expectations ★

### 📘 Module 1.3: Requirements & Trade-offs
7. Functional vs Non-Functional Requirements (Frontend)
8. Trade-offs Over Perfect UI
9. Thinking in Components, State, and Data Flow
10. Capacity Estimation for Frontend Systems ★

---

## PART 2️⃣ — Browser & Web Platform Internals

### 🏗️ Module 2.1: Browser Architecture
11. How the Browser Works (High Level)
12. Critical Rendering Path (CRP)
13. HTML Parsing, CSSOM, Render Tree
14. Browser Process Architecture — Renderer, GPU, Network processes ★

### ⚙️ Module 2.2: JavaScript Execution
15. JavaScript Execution Model
16. Event Loop (Microtasks vs Macrotasks)
17. Main Thread vs Worker Threads
18. Web Workers, Service Workers, Worklets
19. Garbage Collection & Memory Leaks in JS ★

### 🎨 Module 2.3: Rendering Pipeline
20. Reflows vs Repaints
21. GPU vs CPU Rendering
22. Browser Resource Prioritization
23. Compositing Layers & will-change ★

### 💾 Module 2.4: Memory & Storage
24. Memory Management in Browser
25. Browser Storage Options Overview
26. Storage Quotas & Eviction Policies ★
27. Origin Private File System (OPFS) ★

### 🌐 Module 2.5: Network Layer
28. Network Stack Basics
29. HTTP/1.1 vs HTTP/2 vs HTTP/3
30. Connection Reuse & Head-of-Line Blocking
31. DNS Prefetch, Preconnect, Early Hints (103) ★
32. QUIC Protocol Basics ★

---

## PART 3️⃣ — Frontend Architecture Patterns

### 🧩 Module 3.1: Structural Patterns
33. Monolithic Frontend Architecture
34. Component-Based Architecture
35. MVC / MVVM in Frontend
36. Atomic Design Methodology ★
37. Compound Component Pattern ★

### 🏛️ Module 3.2: Application Types
38. SPA Architecture
39. MPA Architecture
40. Hybrid Rendering Architecture

### 🧱 Module 3.3: Scale-Oriented Architectures
41. Micro-Frontend Architecture
42. Module Federation
43. Design System Architecture
44. Feature-Based vs Layer-Based Structuring
45. Monorepo Architecture (Nx, Turborepo) ★
46. Plugin Architecture in Frontend ★

---

## PART 4️⃣ — Rendering Strategies

### 🖥️ Module 4.1: Rendering Models
47. Client-Side Rendering (CSR)
48. Server-Side Rendering (SSR)
49. Static Site Generation (SSG)
50. Incremental Static Regeneration (ISR)
51. Partial Pre-Rendering (PPR) — Next.js 14+ ★

### ⚡ Module 4.2: Advanced Rendering
52. Streaming & Progressive Rendering
53. Hydration & Partial Hydration
54. Islands Architecture
55. React Server Components (RSC) — Deep Dive ★

### ⚖️ Module 4.3: Rendering Trade-offs
56. CSR vs SSR vs SSG Trade-offs
57. Blocking vs Non-Blocking Rendering

### 🚀 Module 4.4: Render Performance
58. Render-Blocking CSS & JavaScript
59. Critical CSS Inlining
60. Preload vs Prefetch vs Preconnect
61. Time-to-Interactive (TTI) Trade-offs
62. Speculation Rules API ★

---

## PART 5️⃣ — State Management

### 🧠 Module 5.1: State Fundamentals
63. Local Component State
64. Global State Management
65. Prop Drilling vs Context
66. Derived State vs Computed State ★

### 🗂️ Module 5.2: State Tools & Patterns
67. Redux / Zustand / Signals
68. Server State vs Client State
69. Cache-Based State Management
70. Redux Toolkit — createSlice, RTK Query, createAsyncThunk ★
71. React Query / TanStack Query Deep Dive ★
72. Angular NgRx — Effects, Selectors, Entity Adapter ★

### ⚙️ Module 5.3: State at Scale
73. State Normalization
74. Avoiding Over-Global State
75. Performance Impact of State Changes
76. State Machines (XState) for Complex Flows ★
77. URL as State — When and Why ★

---

## PART 6️⃣ — Data Fetching & API Design

### 🔌 Module 6.1: API Consumption
78. REST API Consumption Patterns
79. GraphQL in Frontend Systems
80. tRPC & Type-Safe APIs ★

### 📜 Module 6.2: Lists & Streams
81. Pagination Strategies
82. Infinite Scrolling Design
83. Cursor-Based vs Offset Pagination Trade-offs ★

### ⏱️ Module 6.3: Request Control
84. Debouncing & Throttling
85. Parallel vs Sequential API Calls
86. Optimistic UI Updates
87. AbortController & Request Cancellation ★

### 🛡️ Module 6.4: Reliability
88. Error Handling & Retry Strategies
89. API Contracts & Versioning
90. Request Deduplication
91. Client-Side Rate Limiting
92. Circuit Breaker Pattern
93. Graceful API Degradation
94. Skeleton Loaders & Loading State Strategy ★

---

## PART 7️⃣ — Performance Optimization

### 📊 Module 7.1: Metrics & Measurement
95. Frontend Performance Metrics
96. FCP, LCP, CLS, TTI, INP
97. Lighthouse CI — Automating Performance Budgets in CI/CD ★
98. Real User Monitoring (RUM) vs Synthetic Testing ★

### 📦 Module 7.2: Code Optimization
99. Code Splitting Strategies
100. Lazy Loading Components & Routes
101. Tree Shaking
102. Memoization Techniques
103. Bundle Analysis — webpack-bundle-analyzer, Rollup Visualiser ★

### 🧵 Module 7.3: Rendering Performance
104. Virtualization (Large Lists)
105. Avoiding Unnecessary Re-Renders
106. Performance Budgets
107. React DevTools Profiler — Reading Flame Graphs ★
108. Angular OnPush + trackBy Performance Patterns ★

### ⏳ Module 7.4: Main Thread Management
109. Main Thread Scheduling
110. Long Tasks & Yielding Control
111. Interaction to Next Paint (INP)
112. Avoiding Layout Thrashing
113. scheduler.postTask() API ★

---

## PART 8️⃣ — Assets & Resource Optimization

### 🖼️ Module 8.1: Media & Fonts
114. Image Optimization
115. Responsive Images
116. Font Optimization
117. AVIF vs WebP vs JPEG XL — Modern Image Formats ★
118. Variable Fonts ★

### 🎨 Module 8.2: CSS & JS Assets
119. CSS Optimization
120. JavaScript Bundle Optimization
121. Compression (Gzip, Brotli)
122. CSS-in-JS Performance Trade-offs ★

### 🌍 Module 8.3: Delivery & Third-Party
123. CDN Usage
124. Third-Party Script Management
125. Tag Managers & Risks
126. Self-Hosting vs Third-Party Assets
127. Resource Hints — Priority Hints API ★

---

## PART 9️⃣ — Caching & Offline

### 🧊 Module 9.1: Caching Layers
128. HTTP Caching
129. Browser Cache
130. Edge Caching vs Origin Caching ★

### 🔧 Module 9.2: Client Persistence
131. Service Workers
132. IndexedDB
133. LocalStorage vs SessionStorage
134. Cache API & Workbox Library ★

### ♻️ Module 9.3: Cache Strategy
135. Cache Invalidation
136. Offline-First Architecture
137. Handling Stale Data
138. Cache-Control by Page Type
139. Stale-While-Revalidate
140. Cache Poisoning Awareness
141. Background Sync API ★

---

## PART 🔟 — Real-Time Systems

### 🔁 Module 10.1: Transport Mechanisms
142. Polling vs Long Polling
143. WebSockets
144. Server-Sent Events
145. WebTransport API — Next-gen real-time ★

### ⚡ Module 10.2: Real-Time UI
146. Real-Time UI Updates
147. Reconnection & Backoff
148. Handling Partial Failures
149. Optimistic Updates with Rollback ★
150. Presence Indicators & Typing Indicators ★

### 🧠 Module 10.3: Consistency
151. Message Ordering
152. Event De-duplication
153. Idempotency in Frontend Events
154. Conflict Resolution in Collaborative UIs ★

---

## PART 1️⃣1️⃣ — Scalability & Growth

### 📈 Module 11.1: Scaling Patterns
155. Designing for Millions
156. CDN-First Architecture
157. Frontend Load Shedding
158. Rate Limiting at the UI Layer ★

### 🧪 Module 11.2: Experimentation
159. Feature Flags
160. A/B Testing
161. Canary Releases & Frontend Rollout Strategy ★

### 🌍 Module 11.3: Globalization
162. Internationalization (i18n)
163. Theming & White-Labeling
164. Multi-Tenant UI
165. RTL (Right-to-Left) Layout Support ★
166. Locale-Aware Formatting — dates, numbers, currency ★

### 🌐 Module 11.4: Edge & Resilience
167. Edge Rendering
168. Geo-Based Delivery
169. Regional Failures
170. Progressive Rollouts

---

## PART 1️⃣2️⃣ — Security

### 🔐 Module 12.1: Web Threats
171. XSS — Types, Prevention, Real Examples
172. CSRF — SameSite Cookies, CSRF Tokens
173. CORS — Preflight, Credentialed Requests
174. Prototype Pollution ★
175. Supply Chain Attacks — npm package security ★

### 🔑 Module 12.2: Auth & Tokens
176. Authentication Flows
177. Token Storage — localStorage vs httpOnly cookie trade-offs
178. OAuth 2.0 & OIDC Flows
179. JWT Deep Dive — claims, expiry, refresh strategy ★
180. Passkeys & WebAuthn ★

### 🛡️ Module 12.3: Hardening UI
181. Protecting Sensitive UI Data
182. Secure API Consumption
183. Clickjacking — X-Frame-Options, frame-ancestors
184. CSP — Policy Design, Nonce-Based, Report-Only Mode
185. Secure Headers — Full Header Audit
186. Token Refresh — Silent Refresh Pattern
187. Preventing Data Leaks in Browser DevTools ★
188. Subresource Integrity (SRI) ★

---

## PART 1️⃣3️⃣ — Authorization & Access Control

### 🧠 Module 13.1: Foundations
189. Authentication vs Authorization
190. Permission Modeling
191. Backend vs Frontend Enforcement

### 🗂️ Module 13.2: Access Control Models
192. Role-Based Access Control (RBAC)
193. Attribute-Based Access Control (ABAC)
194. Policy-Based Authorization

### 🛡️ Module 13.3: Frontend Authorization Design
195. Frontend Authorization Guards
196. Feature-Level Access Control
197. Data-Level Security
198. Route Guards — Angular & React Router ★

### 🏢 Module 13.4: Enterprise & Multi-Tenant Design
199. Multi-Tenant Authorization
200. Privilege Escalation Prevention
201. Salesforce Permission Sets — LWC Context ★

### ⚡ Module 13.5: Scale & Performance
202. Authorization Caching
203. Authorization at Scale

### 📋 Module 13.6: Governance & Monitoring
204. Auditing & Logging
205. Compliance Logging for Regulated Industries (GDPR, SOC2) ★

---

## PART 1️⃣4️⃣ — Observability

### 📉 Module 14.1: Monitoring
206. Frontend Logging Strategy
207. Error Tracking — Sentry, Datadog, Rollbar
208. Performance Monitoring
209. Real User Monitoring (RUM)
210. OpenTelemetry for Frontend ★

### 🧪 Module 14.2: Debugging UX
211. User Analytics — Event Tracking, Funnels
212. Debugging Production — Source Maps, DevTools
213. Correlation IDs — Tracing Requests End-to-End
214. Session Replay — FullStory, LogRocket
215. Rage Click Detection & Frustration Signals
216. Synthetic Monitoring — Uptime Checks, Canary Flows ★

---

## PART 1️⃣5️⃣ — Accessibility & UX

### ♿ Module 15.1: Accessibility Basics
217. Web Accessibility — WCAG 2.1 vs WCAG 2.2
218. ARIA — Roles, Properties, States
219. Keyboard Navigation — Focus Management, Tab Order
220. Screen Reader Testing — NVDA, VoiceOver, JAWS ★
221. Accessibility Tree — How Browsers Expose to Assistive Tech ★

### 🎨 Module 15.2: Inclusive Design
222. Color Contrast — WCAG AA vs AAA ratios
223. Responsive Design Systems
224. Motion Sensitivity — prefers-reduced-motion ★
225. Cognitive Accessibility — plain language, error prevention ★

### ⚖️ Module 15.3: UX Trade-offs
226. UX vs Performance
227. Accessibility as Non-Functional Requirement
228. Performance Impact on Accessibility
229. Accessibility Auditing Tools — axe, Lighthouse, Arc Toolkit ★

---

## PART 1️⃣6️⃣ — Practical System Design Problems

### 🛠️ Module 16.1: UI Components
230. Poll Widget
231. Image Carousel
232. Autocomplete Search
233. Notification System
234. Date Picker with Accessibility ★
235. Rich Text Editor (contenteditable) ★
236. Drag-and-Drop List ★
237. Virtual Scrolling Component from Scratch ★

### 🧩 Module 16.2: Large Systems
238. E-Commerce Frontend
239. Chat UI
240. Slack-Like Interface
241. Live Dashboard
242. LinkedIn-Style Feed
243. Comment System
244. Google Docs-Style Collaborative Editor ★
245. File Upload System with Progress & Resume ★
246. Cisco-Style Network Monitoring Dashboard ★
247. Salesforce-Style CRM Record View ★
248. Adobe-Style Asset Manager ★

---

## PART 1️⃣7️⃣ — Machine Coding ↔ Design Bridge

### 🧠 Module 17.1: Design Thinking
249. Component Decomposition
250. State vs Props
251. Edge Case Handling
252. Accessibility-First Component Design ★

### ⚙️ Module 17.2: Code Quality
253. Performance-Aware Components
254. Reusability & Extensibility
255. Interview-Friendly Code Style
256. TypeScript Typing in Machine Coding Rounds ★

### 🔁 Module 17.3: Evolution
257. Whiteboard → Code
258. Incremental Refactoring
259. Handling Unknown Requirements
260. Talking Through Trade-offs While Coding ★

---

## PART 1️⃣8️⃣ — Interview Strategy

### 🎯 Module 18.1: Interview Flow
261. How to Start a System Design Interview
262. Requirement Clarification Framework
263. Architecture Drawing — Tools & Technique
264. Time Boxing Each Section ★

### 💬 Module 18.2: Communication
265. Explaining Trade-offs Clearly
266. Handling Performance Questions
267. Scale & Edge Cases
268. Recovering When You Don't Know the Answer ★

### ✅ Module 18.3: Closure
269. Common Mistakes Senior Engineers Make
270. Closing Strong — How to End a System Design Round
271. Questions to Ask Your Interviewer ★

---

## PART 1️⃣9️⃣ — FAANG-Level Expectations

### 🧠 Module 19.1: Senior → Staff
272. Senior vs Staff Expectations
273. Architecture Ownership
274. Technical Vision & Roadmap Planning ★

### 🤝 Module 19.2: Leadership
275. Cross-Team Collaboration
276. Cost vs Performance Trade-offs at Scale
277. Mentorship & Growing Junior Engineers
278. Influencing Without Authority ★

### 🚨 Module 19.3: Production Mindset
279. Production Incidents — Frontend On-Call
280. Frontend Cost Awareness
281. Privacy & GDPR in Frontend
282. Incident Postmortems — How to Write & Present
283. SLO / SLA Awareness for Frontend Engineers ★

---

## PART 2️⃣0️⃣ — TypeScript Deep Dive ★
> Critical for Microsoft, Adobe & Cisco — guaranteed interview topic

### 📘 Module 20.1: TypeScript Fundamentals
284. Types vs Interfaces — When to Use Which ★
285. Union & Intersection Types ★
286. Generics — Functions, Classes, Constraints ★
287. Enums vs Const Assertions vs Union Types ★

### ⚙️ Module 20.2: Advanced Types
288. Conditional Types — infer keyword ★
289. Mapped Types — keyof, in, as ★
290. Template Literal Types ★
291. Discriminated Unions ★
292. Utility Types — Partial, Required, Pick, Omit, Record, ReturnType, Parameters ★

### ⚛️ Module 20.3: TypeScript with React
293. Typing Props, Children, Events, Refs ★
294. Typing Custom Hooks ★
295. Typing Context with Generic Providers ★
296. Typing HOCs and Render Props ★

### 🔧 Module 20.4: Compiler & Config
297. tsconfig Deep Dive — strict, paths, moduleResolution ★
298. Declaration Files (.d.ts) — Writing & Consuming ★
299. TypeScript with Vite vs Webpack ★

---

## PART 2️⃣1️⃣ — DSA for Frontend Engineers ★
> Required in all 4 target company interviews

### 📦 Module 21.1: Arrays & Strings
300. Two Pointers Pattern ★
301. Sliding Window Pattern ★
302. Prefix Sums ★
303. Anagram / Palindrome Problems ★

### 🗂️ Module 21.2: Hashmaps & Sets
304. Frequency Maps Pattern ★
305. Two-Sum Variants ★
306. Grouping & Bucketing ★

### 📚 Module 21.3: Stacks & Queues
307. Monotonic Stack Problems ★
308. Browser History / Undo-Redo Simulation ★
309. Queue-Based BFS ★

### 🌳 Module 21.4: Trees & Graphs
310. BFS & DFS — Templates ★
311. Binary Tree Traversals — Inorder, Preorder, Postorder ★
312. Level Order Traversal ★
313. Graph Connected Components ★
314. DOM Tree Traversal as Graph Problem ★

### 🔁 Module 21.5: Recursion & DP Basics
315. Recursion Mental Model ★
316. Memoization vs Tabulation ★
317. Classic DP — Climbing Stairs, Coin Change, LCS ★

### 🎨 Module 21.6: Frontend-Specific DSA
318. Implement LRU Cache (Map + doubly linked list) ★
319. Implement EventEmitter / Pub-Sub ★
320. Implement Deep Clone & Deep Equal ★
321. Implement Promise.all / Promise.race from Scratch ★
322. Implement curry, memoize, once, pipe ★

---

## PART 2️⃣2️⃣ — Testing Strategy ★
> Adobe & Microsoft ask about testing philosophy at senior level

### 🔺 Module 22.1: Testing Pyramid
323. Unit vs Integration vs E2E — When to Use Which ★
324. Testing Pyramid vs Testing Trophy vs Testing Honeycomb ★
325. Cost of Tests at Each Level ★

### ⚡ Module 22.2: Unit & Component Testing
326. Jest — Setup, Mocking, Spying, Snapshot ★
327. React Testing Library — render, screen, userEvent, async ★
328. Testing Custom Hooks with renderHook ★
329. Testing Redux / RTK Slices in Isolation ★
330. Jasmine & Karma — Angular Testing Patterns ★

### 🎭 Module 22.3: E2E Testing
331. Playwright vs Cypress — Architecture & Trade-offs ★
332. Page Object Model (POM) Pattern ★
333. E2E in CI — Parallel Execution, Sharding ★
334. Flaky Test Root Causes & Prevention ★

### 📊 Module 22.4: Performance & Visual Testing
335. Visual Regression Testing — Storybook, Chromatic, Percy ★
336. Lighthouse CI in Build Pipeline ★
337. Bundle Size Regression Testing ★

---

## PART 2️⃣3️⃣ — CI/CD & Frontend DevOps ★
> Enterprise companies expect senior engineers to own deployment pipelines

### 🌿 Module 23.1: Git Workflows
338. Trunk-Based Development vs GitFlow ★
339. PR Strategy — Size, Review Checklists, Branch Protection ★
340. Conventional Commits & Semantic Versioning ★

### ⚙️ Module 23.2: CI/CD Pipelines
341. GitHub Actions — Workflows, Jobs, Matrix Builds, Caching ★
342. Jenkins Pipelines — Declarative Syntax ★
343. Frontend Pipeline: Lint → Type-Check → Test → Build → Deploy ★
344. Artifact Caching Strategy in CI ★

### 🚀 Module 23.3: Deployment Strategies
345. Blue-Green Deployment ★
346. Canary Releases for Frontend ★
347. Feature Flags as Deployment Safety Valve ★
348. Rollback Strategy ★

### 🐳 Module 23.4: Docker Basics for Frontend
349. Dockerfile for Node/Frontend Apps ★
350. Multi-Stage Builds — Build + Nginx Serve ★
351. Environment Variables in Containerised Frontend ★

---

## PART 2️⃣4️⃣ — Web Components & Framework Interop ★
> Salesforce LWC is built on Web Components — high priority before Salesforce interview

### 🧱 Module 24.1: Web Components Fundamentals
352. Custom Elements API ★
353. Shadow DOM — Open vs Closed Mode ★
354. HTML Templates & Slots ★
355. Custom Events & Component Communication ★

### ⚡ Module 24.2: Lightning Web Components (LWC)
356. LWC Component Lifecycle — connectedCallback, disconnectedCallback, renderedCallback ★
357. @api, @track, @wire Decorators ★
358. Wire Service & Apex Method Integration ★
359. LWC Events — Custom Events, Lightning Message Service ★
360. Salesforce Lightning Design System (SLDS) ★

### 🔗 Module 24.3: Framework Interop
361. Angular Elements — Exporting as Web Components ★
362. Embedding React Components in Angular & Vice Versa ★
363. Sharing State Across Frameworks in Micro-Frontend ★

---

## PART 2️⃣5️⃣ — Angular & RxJS Deep Dive ★
> Your core strength — Cisco is Angular-heavy. Formalise what you know into interview answers.

### 🏗️ Module 25.1: Angular Architecture
364. NgModules vs Standalone Components (Angular 14+) ★
365. Dependency Injection — Hierarchical Injectors, Tokens ★
366. Component Lifecycle Hooks — All 8 Hooks & When to Use ★
367. Angular Router — Lazy Loading, Guards, Resolvers ★

### 🔄 Module 25.2: Change Detection
368. Default vs OnPush Change Detection ★
369. zone.js — How It Intercepts Async Operations ★
370. Zoneless Angular — Signal-Based Reactivity ★
371. Manual Change Detection — markForCheck vs detectChanges ★

### 🌊 Module 25.3: RxJS Mastery
372. Cold vs Hot Observables ★
373. Subject, BehaviorSubject, ReplaySubject, AsyncSubject ★
374. switchMap vs mergeMap vs concatMap vs exhaustMap — With Real Examples ★
375. combineLatest, forkJoin, zip, withLatestFrom ★
376. takeUntil Pattern for Memory Leak Prevention ★
377. Custom RxJS Operators ★

### 📦 Module 25.4: State Management in Angular
378. NgRx — Store, Actions, Reducers, Effects, Selectors ★
379. NgRx Entity Adapter ★
380. Angular Signals (v17+) — signal(), computed(), effect() ★
381. Akita vs NgRx vs Signal Store Trade-offs ★

### ⚡ Module 25.5: Angular Performance
382. OnPush + trackBy — Avoiding Unnecessary Checks ★
383. Pure Pipes vs Impure Pipes ★
384. Lazy Loaded Modules + Route-Level Code Splitting ★
385. Deferrable Views (@defer block, Angular 17+) ★

---

## PART 2️⃣6️⃣ — Behavioural & Leadership Round ★
> Microsoft's 'As Appropriate' round is entirely this. Most candidates underprepare.

### ⭐ Module 26.1: STAR Framework
386. STAR Method — Situation, Task, Action, Result ★
387. Adding Growth Mindset to Every Story — 'What I'd Do Differently' ★
388. Keeping Stories Under 2.5 Minutes ★
389. Quantifying Impact in Behavioural Stories ★

### 🎯 Module 26.2: Your 8 Core Stories
390. Story 1 — Lighthouse 60 → 95: Technical depth, delivered results ★
391. Story 2 — WCAG AA Certification: Quality, customer obsession ★
392. Story 3 — 80% Security Vulnerability Reduction: Ownership, proactiveness ★
393. Story 4 — Mentoring 4 Engineers: Leadership, scaling yourself ★
394. Story 5 — Micro-Frontend Architecture: System thinking, judgement ★
395. Story 6 — Bosch Dashboard Delivery Under Deadline: Pressure, reliability ★
396. Story 7 — Cross-Team Module Delivery: Collaboration, influence without authority ★
397. Story 8 — Excellence in Frontend Engineering Award: Impact recognition ★

### 🏢 Module 26.3: Company-Specific Behavioural Values
398. Microsoft — Growth Mindset, Clarity, Energy, Success of Others ★
399. Adobe — Craft, Innovation, Genuine, Exceptional ★
400. Salesforce — Trust, Customer Success, Innovation, Equality ★
401. Cisco — Integrity, Trust, Collaboration, Innovation ★

### 💰 Module 26.4: Compensation & Negotiation
402. How to Respond to an Offer Without Weakening Your Position ★
403. Counter-Offering — Anchoring, Justification, Timeline ★
404. Base vs Equity vs Bonus Trade-offs at Each Company ★
405. Using Levels.fyi Data in Negotiation ★

---

## PART 2️⃣7️⃣ — SAP UI5 & Enterprise Frontend Patterns ★
> Your most current daily skill — missing from original index entirely

### 🏗️ Module 27.1: SAP UI5 Architecture
406. SAPUI5 vs OpenUI5 — Differences & Licensing ★
407. MVC Pattern in UI5 — Model, View, Controller ★
408. OData Binding — Property, Aggregation, Element Binding ★
409. UI5 Lifecycle — init, onBeforeRendering, onAfterRendering ★

### 🎨 Module 27.2: Fiori Design System
410. SAP Fiori Design Principles ★
411. Fiori Launchpad Architecture ★
412. Theming — SAP Theming Base Content, CSS Variables ★

### 📐 Module 27.3: Enterprise UI Patterns
413. Master-Detail Pattern ★
414. Worklist Pattern ★
415. Object Page Layout ★
416. Smart Controls — SmartTable, SmartForm, SmartFilterBar ★

### 💼 Module 27.4: Positioning SAP Experience
417. How to Articulate SAP UI5 Work to Non-SAP Companies ★
418. Transferable Skills — OData → REST, UI5 MVC → React/Angular patterns ★
419. SAP BI Launchpad Case Study — Performance, Security, Accessibility ★

---

## PART 2️⃣8️⃣ — React, Next.js & Redux Deep Dive ★
> Adobe & Microsoft test React internals deeply. Equivalent to Part 25 for Angular. Your freelance React experience formalised into interview-ready answers.

### ⚛️ Module 28.1: React Internals
420. React Fiber Architecture — What It Is and Why It Was Built ★
421. Reconciliation Algorithm — How React Diffs the Virtual DOM ★
422. React Scheduler — Priority Lanes, Task Scheduling ★
423. Concurrent Mode — What Changes Under the Hood ★
424. Commit Phase vs Render Phase — Side Effects Timing ★
425. StrictMode — Why Double Invocation Happens ★

### 🪝 Module 28.2: Hooks Deep Dive
426. useState — Batching, Functional Updates, Lazy Initialisation ★
427. useEffect — Dependency Array Rules, Cleanup, Common Mistakes ★
428. useRef — DOM Refs vs Mutable Values, forwardRef ★
429. useMemo — When It Helps vs When It Hurts ★
430. useCallback — Referential Stability, Common Misuse ★
431. useReducer — When to Prefer Over useState ★
432. useContext — Performance Pitfalls, Context Splitting ★
433. useTransition & useDeferredValue — Concurrent Features ★
434. useId, useSyncExternalStore, useInsertionEffect ★
435. Custom Hooks — Patterns, Composition, Testing ★

### ⚡ Module 28.3: React 18 & 19 Features
436. Automatic Batching in React 18 ★
437. Suspense for Data Fetching — How It Works Internally ★
438. React Server Components (RSC) — Server vs Client Boundary ★
439. use() Hook — Reading Promises and Context ★
440. Server Actions — Forms, Mutations, Progressive Enhancement ★
441. React Compiler (React 19) — Auto-Memoisation ★
442. Activity API & View Transitions ★

### 🏗️ Module 28.4: React Patterns
443. Compound Component Pattern ★
444. Render Props Pattern — When Still Useful ★
445. Higher Order Components (HOC) — Use Cases & Pitfalls ★
446. Container vs Presentational Components ★
447. Controlled vs Uncontrolled Components ★
448. Error Boundaries — Class Components, react-error-boundary ★
449. Portal Pattern — Modals, Tooltips, Dropdowns ★

### 📦 Module 28.5: Redux & Redux Toolkit Deep Dive
450. Redux Core — Store, Actions, Reducers, Middleware ★
451. Redux Toolkit — createSlice, createAsyncThunk, createEntityAdapter ★
452. RTK Query — defineApi, endpoints, caching, invalidation ★
453. Redux Middleware — Thunk vs Saga vs Observable ★
454. Normalised State Shape — Why and How ★
455. Redux DevTools — Time Travel Debugging ★
456. When NOT to Use Redux — Choosing the Right Tool ★

### 🌐 Module 28.6: Next.js App Router Deep Dive
457. App Router vs Pages Router — Key Differences ★
458. Server Components vs Client Components — Decision Rules ★
459. Layouts, Templates, Loading UI, Error UI — File Conventions ★
460. Data Fetching in App Router — fetch(), cache(), revalidate ★
461. Route Handlers — API Routes in App Router ★
462. Middleware — Matchers, Redirects, Auth Patterns ★
463. Image, Font, Script Optimisation — next/image, next/font ★
464. Streaming with Suspense in Next.js ★
465. Parallel Routes & Intercepting Routes ★
466. Next.js Caching — Request Memoization, Data Cache, Full Route Cache, Router Cache ★

### ⚡ Module 28.7: React Performance Patterns
467. When Does a Component Re-render — The Complete Rules ★
468. React.memo — Props Comparison, Custom Comparator ★
469. Key Prop — Why It Matters, Common Mistakes ★
470. Avoid Anonymous Functions in JSX — Why & When ★
471. Windowing Large Lists — react-window vs react-virtual ★
472. Code Splitting with React.lazy + Suspense ★
473. Profiling with React DevTools — Reading Flame Graphs ★
474. Why Did You Render — Detecting Unnecessary Re-renders ★

---

## Summary

| Part | Title | Topics | Target |
|------|-------|---------|--------|
| 1 | Frontend System Design Foundations | 1–10 | All |
| 2 | Browser & Web Platform Internals | 11–32 | Adobe, Microsoft |
| 3 | Frontend Architecture Patterns | 33–46 | All |
| 4 | Rendering Strategies | 47–62 | Microsoft, Adobe |
| 5 | State Management | 63–77 | All |
| 6 | Data Fetching & API Design | 78–94 | All |
| 7 | Performance Optimization | 95–113 | Adobe, Microsoft |
| 8 | Assets & Resource Optimization | 114–127 | Adobe |
| 9 | Caching & Offline | 128–141 | Cisco, Microsoft |
| 10 | Real-Time Systems | 142–154 | Cisco, Microsoft |
| 11 | Scalability & Growth | 155–170 | Salesforce, Microsoft |
| 12 | Security | 171–188 | All |
| 13 | Authorization & Access Control | 189–205 | Salesforce, Cisco |
| 14 | Observability | 206–216 | Microsoft, Cisco |
| 15 | Accessibility & UX | 217–229 | Adobe, Microsoft |
| 16 | Practical System Design Problems | 230–248 | All |
| 17 | Machine Coding ↔ Design Bridge | 249–260 | All |
| 18 | Interview Strategy | 261–271 | All |
| 19 | FAANG-Level Expectations | 272–283 | All |
| 20 ★ | TypeScript Deep Dive | 284–299 | Microsoft, Cisco, Adobe |
| 21 ★ | DSA for Frontend Engineers | 300–322 | All |
| 22 ★ | Testing Strategy | 323–337 | Adobe, Microsoft |
| 23 ★ | CI/CD & Frontend DevOps | 338–351 | Cisco, Microsoft |
| 24 ★ | Web Components & LWC | 352–363 | Salesforce, Cisco |
| 25 ★ | Angular & RxJS Deep Dive | 364–385 | Cisco, Adobe |
| 26 ★ | Behavioural & Leadership Round | 386–405 | Microsoft, All |
| 27 ★ | SAP UI5 & Enterprise Frontend | 406–419 | All |
| 28 ★ | React, Next.js & Redux Deep Dive | 420–474 | Adobe, Microsoft |

---

**Total: 474 Topics · 28 Parts · Microsoft · Adobe · Salesforce · Cisco**
