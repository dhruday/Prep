# Frontend Interview Master Index — Sequenced Study Order
**Hruday D — Senior Frontend Engineer**
**Target: Microsoft · Adobe · Salesforce · Cisco**
**28 Parts · 474 Topics · Study in this exact sequence**

> ★ = Newly added topics for target company coverage
> Study each part completely before moving to the next.
> Each part builds on the previous one.

---

## HOW TO USE THIS INDEX

1. Study topics in the numbered sequence below — do not skip ahead
2. For each topic: read → understand → write notes → do a practice question
3. Mark each topic ✅ when you can explain it without notes
4. Every Sunday: record a YouTube video on the week's strongest topic
5. Every topic marked ★ is new — give it extra time

---
---

# 📐 PHASE 1 — FOUNDATIONS
> Weeks 1–2 | These underpin everything else. Master these before touching React or Angular.

---

## SEQUENCE 1️⃣ — JavaScript Engine & Runtime
> Everything runs on JS. If this is shaky, nothing else holds.

### ⚙️ Module 1.1: Execution Model
1. JavaScript Execution Model
2. Event Loop (Microtasks vs Macrotasks)
3. Main Thread vs Worker Threads
4. Call Stack, Task Queue, Microtask Queue — How They Interact ★

### 🧠 Module 1.2: Language Internals
5. Closures — Scope Chain, Lexical Environment
6. Prototypal Inheritance — Prototype Chain, Object.create
7. this Keyword — All 4 Contexts, call/apply/bind
8. Hoisting — var vs let vs const vs function declarations
9. Garbage Collection & Memory Leaks in JS ★

### 🔄 Module 1.3: Async JavaScript
10. Promises Internals — Microtask Queue, .then Chaining
11. async/await — How It Compiles Down to Promises
12. Promise.all / Promise.race / Promise.allSettled / Promise.any
13. Generators and Iterators
14. AbortController & Request Cancellation ★

### 🛠️ Module 1.4: Frontend-Specific JS Implementations
15. Implement debounce (with leading/trailing options) ★
16. Implement throttle ★
17. Implement curry, memoize, once, pipe ★
18. Implement Deep Clone & Deep Equal ★
19. Implement Promise.all / Promise.race from Scratch ★
20. Implement EventEmitter / Pub-Sub ★
21. Implement LRU Cache (Map + doubly linked list) ★

---

## SEQUENCE 2️⃣ — Browser & Web Platform Internals
> How the browser works is tested at Adobe & Microsoft. Your Lighthouse story lives here.

### 🏗️ Module 2.1: Browser Architecture
22. How the Browser Works (High Level)
23. Browser Process Architecture — Renderer, GPU, Network processes ★
24. Critical Rendering Path (CRP)
25. HTML Parsing, CSSOM, Render Tree

### 🎨 Module 2.2: Rendering Pipeline
26. Reflows vs Repaints
27. GPU vs CPU Rendering
28. Compositing Layers & will-change ★
29. Browser Resource Prioritization
30. Avoiding Layout Thrashing ★

### 💾 Module 2.3: Memory & Storage
31. Memory Management in Browser
32. Browser Storage Options Overview
33. Storage Quotas & Eviction Policies ★
34. Origin Private File System (OPFS) ★

### 🌐 Module 2.4: Network Layer
35. Network Stack Basics
36. HTTP/1.1 vs HTTP/2 vs HTTP/3
37. Connection Reuse & Head-of-Line Blocking
38. DNS Prefetch, Preconnect, Early Hints (103) ★
39. QUIC Protocol Basics ★

### 🕸️ Module 2.5: Worker Threads
40. Web Workers — Use Cases, Limitations, Communication
41. Service Workers — Lifecycle, Fetch Interception, Push
42. Worklets — Audio, Paint, Layout Worklets

---

## SEQUENCE 3️⃣ — TypeScript Deep Dive ★
> Microsoft, Cisco, Adobe all test this. Do it early — you will use TypeScript in every code example after this.

### 📘 Module 3.1: TypeScript Fundamentals
43. Types vs Interfaces — When to Use Which ★
44. Union & Intersection Types ★
45. Generics — Functions, Classes, Constraints ★
46. Enums vs Const Assertions vs Union Types ★

### ⚙️ Module 3.2: Advanced Types
47. Conditional Types — infer keyword ★
48. Mapped Types — keyof, in, as ★
49. Template Literal Types ★
50. Discriminated Unions ★
51. Utility Types — Partial, Required, Pick, Omit, Record, ReturnType, Parameters ★

### ⚛️ Module 3.3: TypeScript with React
52. Typing Props, Children, Events, Refs ★
53. Typing Custom Hooks ★
54. Typing Context with Generic Providers ★
55. Typing HOCs and Render Props ★

### 🔧 Module 3.4: Compiler & Config
56. tsconfig Deep Dive — strict, paths, moduleResolution ★
57. Declaration Files (.d.ts) — Writing & Consuming ★
58. TypeScript with Vite vs Webpack ★

---
---

# ⚛️ PHASE 2 — FRAMEWORK DEEP DIVES
> Weeks 3–5 | Go deep on your two frameworks. Angular first (your strength), then React (your growth area).

---

## SEQUENCE 4️⃣ — Angular & RxJS Deep Dive ★
> Your core strength. Cisco is Angular-heavy. Formalise everything you already know into interview-ready answers.

### 🏗️ Module 4.1: Angular Architecture
59. NgModules vs Standalone Components (Angular 14+) ★
60. Dependency Injection — Hierarchical Injectors, Tokens ★
61. Component Lifecycle Hooks — All 8 Hooks & When to Use ★
62. Angular Router — Lazy Loading, Guards, Resolvers ★

### 🔄 Module 4.2: Change Detection
63. Default vs OnPush Change Detection ★
64. zone.js — How It Intercepts Async Operations ★
65. Zoneless Angular — Signal-Based Reactivity ★
66. Manual Change Detection — markForCheck vs detectChanges ★

### 🌊 Module 4.3: RxJS Mastery
67. Cold vs Hot Observables ★
68. Subject, BehaviorSubject, ReplaySubject, AsyncSubject ★
69. switchMap vs mergeMap vs concatMap vs exhaustMap — With Real Examples ★
70. combineLatest, forkJoin, zip, withLatestFrom ★
71. takeUntil Pattern for Memory Leak Prevention ★
72. Custom RxJS Operators ★

### 📦 Module 4.4: State Management in Angular
73. NgRx — Store, Actions, Reducers, Effects, Selectors ★
74. NgRx Entity Adapter ★
75. Angular Signals (v17+) — signal(), computed(), effect() ★
76. Akita vs NgRx vs Signal Store Trade-offs ★

### ⚡ Module 4.5: Angular Performance
77. OnPush + trackBy — Avoiding Unnecessary Checks ★
78. Pure Pipes vs Impure Pipes ★
79. Lazy Loaded Modules + Route-Level Code Splitting ★
80. Deferrable Views (@defer block, Angular 17+) ★

---

## SEQUENCE 5️⃣ — React, Next.js & Redux Deep Dive ★
> Adobe & Microsoft test React internals deeply. Build real depth here.

### ⚛️ Module 5.1: React Internals
81. React Fiber Architecture — What It Is and Why It Was Built ★
82. Reconciliation Algorithm — How React Diffs the Virtual DOM ★
83. React Scheduler — Priority Lanes, Task Scheduling ★
84. Concurrent Mode — What Changes Under the Hood ★
85. Commit Phase vs Render Phase — Side Effects Timing ★
86. StrictMode — Why Double Invocation Happens ★

### 🪝 Module 5.2: Hooks Deep Dive
87. useState — Batching, Functional Updates, Lazy Initialisation ★
88. useEffect — Dependency Array Rules, Cleanup, Common Mistakes ★
89. useRef — DOM Refs vs Mutable Values, forwardRef ★
90. useMemo — When It Helps vs When It Hurts ★
91. useCallback — Referential Stability, Common Misuse ★
92. useReducer — When to Prefer Over useState ★
93. useContext — Performance Pitfalls, Context Splitting ★
94. useTransition & useDeferredValue — Concurrent Features ★
95. useId, useSyncExternalStore, useInsertionEffect ★
96. Custom Hooks — Patterns, Composition, Testing ★

### ⚡ Module 5.3: React 18 & 19 Features
97. Automatic Batching in React 18 ★
98. Suspense for Data Fetching — How It Works Internally ★
99. React Server Components (RSC) — Server vs Client Boundary ★
100. use() Hook — Reading Promises and Context ★
101. Server Actions — Forms, Mutations, Progressive Enhancement ★
102. React Compiler (React 19) — Auto-Memoisation ★
103. Activity API & View Transitions ★

### 🏗️ Module 5.4: React Patterns
104. Compound Component Pattern ★
105. Render Props Pattern — When Still Useful ★
106. Higher Order Components (HOC) — Use Cases & Pitfalls ★
107. Container vs Presentational Components ★
108. Controlled vs Uncontrolled Components ★
109. Error Boundaries — Class Components, react-error-boundary ★
110. Portal Pattern — Modals, Tooltips, Dropdowns ★

### 📦 Module 5.5: Redux & Redux Toolkit Deep Dive
111. Redux Core — Store, Actions, Reducers, Middleware ★
112. Redux Toolkit — createSlice, createAsyncThunk, createEntityAdapter ★
113. RTK Query — defineApi, endpoints, caching, invalidation ★
114. Redux Middleware — Thunk vs Saga vs Observable ★
115. Normalised State Shape — Why and How ★
116. Redux DevTools — Time Travel Debugging ★
117. When NOT to Use Redux — Choosing the Right Tool ★

### 🌐 Module 5.6: Next.js App Router Deep Dive
118. App Router vs Pages Router — Key Differences ★
119. Server Components vs Client Components — Decision Rules ★
120. Layouts, Templates, Loading UI, Error UI — File Conventions ★
121. Data Fetching in App Router — fetch(), cache(), revalidate ★
122. Route Handlers — API Routes in App Router ★
123. Middleware — Matchers, Redirects, Auth Patterns ★
124. Image, Font, Script Optimisation — next/image, next/font ★
125. Streaming with Suspense in Next.js ★
126. Parallel Routes & Intercepting Routes ★
127. Next.js Caching — Request Memoization, Data Cache, Full Route Cache, Router Cache ★

### ⚡ Module 5.7: React Performance Patterns
128. When Does a Component Re-render — The Complete Rules ★
129. React.memo — Props Comparison, Custom Comparator ★
130. Key Prop — Why It Matters, Common Mistakes ★
131. Avoid Anonymous Functions in JSX — Why & When ★
132. Windowing Large Lists — react-window vs react-virtual ★
133. Code Splitting with React.lazy + Suspense ★
134. Profiling with React DevTools — Reading Flame Graphs ★
135. Why Did You Render — Detecting Unnecessary Re-renders ★

---
---

# 🗄️ PHASE 3 — STATE & DATA
> Week 5 | How data flows through your app. Builds on framework knowledge.

---

## SEQUENCE 6️⃣ — State Management
> Applies to both Angular and React. Consolidates what you learned in Phases 2.

### 🧠 Module 6.1: State Fundamentals
136. Local Component State
137. Global State Management
138. Prop Drilling vs Context
139. Derived State vs Computed State ★

### 🗂️ Module 6.2: State Tools & Patterns
140. Redux / Zustand / Signals — Comparison
141. Server State vs Client State
142. Cache-Based State Management
143. React Query / TanStack Query Deep Dive ★
144. State Machines (XState) for Complex Flows ★
145. URL as State — When and Why ★

### ⚙️ Module 6.3: State at Scale
146. State Normalization
147. Avoiding Over-Global State
148. Performance Impact of State Changes

---

## SEQUENCE 7️⃣ — Data Fetching & API Design
> How your app talks to the server. Builds directly on state knowledge.

### 🔌 Module 7.1: API Consumption
149. REST API Consumption Patterns
150. GraphQL in Frontend Systems
151. tRPC & Type-Safe APIs ★

### 📜 Module 7.2: Lists & Streams
152. Pagination Strategies
153. Infinite Scrolling Design
154. Cursor-Based vs Offset Pagination Trade-offs ★

### ⏱️ Module 7.3: Request Control
155. Debouncing & Throttling (applied to API calls)
156. Parallel vs Sequential API Calls
157. Optimistic UI Updates

### 🛡️ Module 7.4: Reliability
158. Error Handling & Retry Strategies
159. API Contracts & Versioning
160. Request Deduplication
161. Client-Side Rate Limiting
162. Circuit Breaker Pattern
163. Graceful API Degradation
164. Skeleton Loaders & Loading State Strategy ★

---
---

# 🚀 PHASE 4 — PERFORMANCE & ARCHITECTURE
> Weeks 6–7 | Your SAP Lighthouse story lives here. This is where you shine.

---

## SEQUENCE 8️⃣ — Performance Optimization
> Your strongest real-world asset. The SAP Lighthouse 60→95 story answers most of this.

### 📊 Module 8.1: Metrics & Measurement
165. Frontend Performance Metrics
166. FCP, LCP, CLS, TTI, INP — Precise Definitions and Targets
167. Lighthouse CI — Automating Performance Budgets in CI/CD ★
168. Real User Monitoring (RUM) vs Synthetic Testing ★

### 📦 Module 8.2: Code Optimization
169. Code Splitting Strategies
170. Lazy Loading Components & Routes
171. Tree Shaking
172. Memoization Techniques
173. Bundle Analysis — webpack-bundle-analyzer, Rollup Visualiser ★

### 🧵 Module 8.3: Rendering Performance
174. Virtualization (Large Lists)
175. Avoiding Unnecessary Re-Renders
176. Performance Budgets
177. Angular OnPush + trackBy Performance Patterns ★

### ⏳ Module 8.4: Main Thread Management
178. Main Thread Scheduling
179. Long Tasks & Yielding Control
180. Interaction to Next Paint (INP)
181. scheduler.postTask() API ★

---

## SEQUENCE 9️⃣ — Assets & Resource Optimization
> Directly supports performance. Adobe asks about this specifically.

### 🖼️ Module 9.1: Media & Fonts
182. Image Optimization
183. Responsive Images
184. Font Optimization
185. AVIF vs WebP vs JPEG XL — Modern Image Formats ★
186. Variable Fonts ★

### 🎨 Module 9.2: CSS & JS Assets
187. CSS Optimization
188. JavaScript Bundle Optimization
189. Compression (Gzip, Brotli)
190. CSS-in-JS Performance Trade-offs ★

### 🌍 Module 9.3: Delivery & Third-Party
191. CDN Usage
192. Third-Party Script Management
193. Tag Managers & Risks
194. Self-Hosting vs Third-Party Assets
195. Resource Hints — Priority Hints API ★

---

## SEQUENCE 🔟 — Frontend Architecture Patterns
> Big picture thinking. Builds on everything above.

### 🧩 Module 10.1: Structural Patterns
196. Monolithic Frontend Architecture
197. Component-Based Architecture
198. MVC / MVVM in Frontend
199. Atomic Design Methodology ★
200. Compound Component Pattern (applied)

### 🏛️ Module 10.2: Application Types
201. SPA Architecture
202. MPA Architecture
203. Hybrid Rendering Architecture

### 🧱 Module 10.3: Scale-Oriented Architectures
204. Micro-Frontend Architecture
205. Module Federation
206. Design System Architecture
207. Feature-Based vs Layer-Based Structuring
208. Monorepo Architecture (Nx, Turborepo) ★
209. Plugin Architecture in Frontend ★

---

## SEQUENCE 1️⃣1️⃣ — Rendering Strategies
> After architecture — how you choose where to render.

### 🖥️ Module 11.1: Rendering Models
210. Client-Side Rendering (CSR)
211. Server-Side Rendering (SSR)
212. Static Site Generation (SSG)
213. Incremental Static Regeneration (ISR)
214. Partial Pre-Rendering (PPR) — Next.js 14+ ★

### ⚡ Module 11.2: Advanced Rendering
215. Streaming & Progressive Rendering
216. Hydration & Partial Hydration
217. Islands Architecture
218. React Server Components Deep Dive (applied)

### ⚖️ Module 11.3: Rendering Trade-offs
219. CSR vs SSR vs SSG Trade-offs
220. Blocking vs Non-Blocking Rendering

### 🚀 Module 11.4: Render Performance
221. Render-Blocking CSS & JavaScript
222. Critical CSS Inlining
223. Preload vs Prefetch vs Preconnect
224. Time-to-Interactive (TTI) Trade-offs
225. Speculation Rules API ★

---
---

# 🔐 PHASE 5 — RELIABILITY & SECURITY
> Week 7 | Your SAP security work covers most of this. Formalise it.

---

## SEQUENCE 1️⃣2️⃣ — Caching & Offline
> Reliability foundation. Cisco and Microsoft care deeply here.

### 🧊 Module 12.1: Caching Layers
226. HTTP Caching
227. Browser Cache
228. Edge Caching vs Origin Caching ★

### 🔧 Module 12.2: Client Persistence
229. Service Workers (applied to caching)
230. IndexedDB
231. LocalStorage vs SessionStorage
232. Cache API & Workbox Library ★

### ♻️ Module 12.3: Cache Strategy
233. Cache Invalidation
234. Offline-First Architecture
235. Handling Stale Data
236. Cache-Control by Page Type
237. Stale-While-Revalidate
238. Cache Poisoning Awareness
239. Background Sync API ★

---

## SEQUENCE 1️⃣3️⃣ — Security
> Your 80% vulnerability reduction story directly answers most of this.

### 🔐 Module 13.1: Web Threats
240. XSS — Types, Prevention, Real Examples
241. CSRF — SameSite Cookies, CSRF Tokens
242. CORS — Preflight, Credentialed Requests
243. Prototype Pollution ★
244. Supply Chain Attacks — npm package security ★

### 🔑 Module 13.2: Auth & Tokens
245. Authentication Flows
246. Token Storage — localStorage vs httpOnly cookie trade-offs
247. OAuth 2.0 & OIDC Flows
248. JWT Deep Dive — claims, expiry, refresh strategy ★
249. Passkeys & WebAuthn ★

### 🛡️ Module 13.3: Hardening UI
250. Protecting Sensitive UI Data
251. Secure API Consumption
252. Clickjacking — X-Frame-Options, frame-ancestors
253. CSP — Policy Design, Nonce-Based, Report-Only Mode
254. Secure Headers — Full Header Audit
255. Token Refresh — Silent Refresh Pattern
256. Preventing Data Leaks in Browser DevTools ★
257. Subresource Integrity (SRI) ★

---

## SEQUENCE 1️⃣4️⃣ — Authorization & Access Control
> Builds on Security. Salesforce and Cisco-specific depth.

### 🧠 Module 14.1: Foundations
258. Authentication vs Authorization
259. Permission Modeling
260. Backend vs Frontend Enforcement

### 🗂️ Module 14.2: Access Control Models
261. Role-Based Access Control (RBAC)
262. Attribute-Based Access Control (ABAC)
263. Policy-Based Authorization

### 🛡️ Module 14.3: Frontend Authorization Design
264. Frontend Authorization Guards
265. Feature-Level Access Control
266. Data-Level Security
267. Route Guards — Angular & React Router ★

### 🏢 Module 14.4: Enterprise & Multi-Tenant Design
268. Multi-Tenant Authorization
269. Privilege Escalation Prevention
270. Salesforce Permission Sets — LWC Context ★

### ⚡ Module 14.5: Scale & Performance
271. Authorization Caching
272. Authorization at Scale

### 📋 Module 14.6: Governance & Monitoring
273. Auditing & Logging
274. Compliance Logging for Regulated Industries (GDPR, SOC2) ★

---
---

# 🌐 PHASE 6 — SCALABILITY & REAL-TIME
> Week 8 | Enterprise-scale thinking. Cisco real-time + Salesforce scale.

---

## SEQUENCE 1️⃣5️⃣ — Real-Time Systems
> Your Bosch WebSocket story lives here. Most candidates have zero real experience here.

### 🔁 Module 15.1: Transport Mechanisms
275. Polling vs Long Polling
276. WebSockets
277. Server-Sent Events
278. WebTransport API — Next-gen real-time ★

### ⚡ Module 15.2: Real-Time UI
279. Real-Time UI Updates
280. Reconnection & Backoff
281. Handling Partial Failures
282. Optimistic Updates with Rollback ★
283. Presence Indicators & Typing Indicators ★

### 🧠 Module 15.3: Consistency
284. Message Ordering
285. Event De-duplication
286. Idempotency in Frontend Events
287. Conflict Resolution in Collaborative UIs ★

---

## SEQUENCE 1️⃣6️⃣ — Scalability & Growth
> Big-scale thinking. Salesforce and Microsoft especially.

### 📈 Module 16.1: Scaling Patterns
288. Designing for Millions
289. CDN-First Architecture
290. Frontend Load Shedding
291. Rate Limiting at the UI Layer ★

### 🧪 Module 16.2: Experimentation
292. Feature Flags
293. A/B Testing
294. Canary Releases & Frontend Rollout Strategy ★

### 🌍 Module 16.3: Globalization
295. Internationalization (i18n)
296. Theming & White-Labeling
297. Multi-Tenant UI
298. RTL (Right-to-Left) Layout Support ★
299. Locale-Aware Formatting — dates, numbers, currency ★

### 🌐 Module 16.4: Edge & Resilience
300. Edge Rendering
301. Geo-Based Delivery
302. Regional Failures
303. Progressive Rollouts

---
---

# ♿ PHASE 7 — QUALITY & OBSERVABILITY
> Week 8 | Your WCAG AA story + production ownership mindset.

---

## SEQUENCE 1️⃣7️⃣ — Accessibility & UX
> Your WCAG AA certification at SAP makes this a strength. Adobe specifically tests this.

### ♿ Module 17.1: Accessibility Basics
304. Web Accessibility — WCAG 2.1 vs WCAG 2.2
305. ARIA — Roles, Properties, States
306. Keyboard Navigation — Focus Management, Tab Order
307. Screen Reader Testing — NVDA, VoiceOver, JAWS ★
308. Accessibility Tree — How Browsers Expose to Assistive Tech ★

### 🎨 Module 17.2: Inclusive Design
309. Color Contrast — WCAG AA vs AAA ratios
310. Responsive Design Systems
311. Motion Sensitivity — prefers-reduced-motion ★
312. Cognitive Accessibility — plain language, error prevention ★

### ⚖️ Module 17.3: UX Trade-offs
313. UX vs Performance
314. Accessibility as Non-Functional Requirement
315. Performance Impact on Accessibility
316. Accessibility Auditing Tools — axe, Lighthouse, Arc Toolkit ★

---

## SEQUENCE 1️⃣8️⃣ — Testing Strategy ★
> Senior engineers own quality. Adobe and Microsoft ask about testing philosophy.

### 🔺 Module 18.1: Testing Pyramid
317. Unit vs Integration vs E2E — When to Use Which ★
318. Testing Pyramid vs Testing Trophy vs Testing Honeycomb ★
319. Cost of Tests at Each Level ★

### ⚡ Module 18.2: Unit & Component Testing
320. Jest — Setup, Mocking, Spying, Snapshot ★
321. React Testing Library — render, screen, userEvent, async ★
322. Testing Custom Hooks with renderHook ★
323. Testing Redux / RTK Slices in Isolation ★
324. Jasmine & Karma — Angular Testing Patterns ★

### 🎭 Module 18.3: E2E Testing
325. Playwright vs Cypress — Architecture & Trade-offs ★
326. Page Object Model (POM) Pattern ★
327. E2E in CI — Parallel Execution, Sharding ★
328. Flaky Test Root Causes & Prevention ★

### 📊 Module 18.4: Performance & Visual Testing
329. Visual Regression Testing — Storybook, Chromatic, Percy ★
330. Lighthouse CI in Build Pipeline ★
331. Bundle Size Regression Testing ★

---

## SEQUENCE 1️⃣9️⃣ — Observability
> Production ownership mindset. Microsoft and Cisco care deeply.

### 📉 Module 19.1: Monitoring
332. Frontend Logging Strategy
333. Error Tracking — Sentry, Datadog, Rollbar
334. Performance Monitoring
335. Real User Monitoring (RUM)
336. OpenTelemetry for Frontend ★

### 🧪 Module 19.2: Debugging UX
337. User Analytics — Event Tracking, Funnels
338. Debugging Production — Source Maps, DevTools
339. Correlation IDs — Tracing Requests End-to-End
340. Session Replay — FullStory, LogRocket
341. Rage Click Detection & Frustration Signals
342. Synthetic Monitoring — Uptime Checks, Canary Flows ★

---

## SEQUENCE 2️⃣0️⃣ — CI/CD & Frontend DevOps ★
> Enterprise pipeline ownership. Cisco and Microsoft expect senior engineers to own this.

### 🌿 Module 20.1: Git Workflows
343. Trunk-Based Development vs GitFlow ★
344. PR Strategy — Size, Review Checklists, Branch Protection ★
345. Conventional Commits & Semantic Versioning ★

### ⚙️ Module 20.2: CI/CD Pipelines
346. GitHub Actions — Workflows, Jobs, Matrix Builds, Caching ★
347. Jenkins Pipelines — Declarative Syntax ★
348. Frontend Pipeline: Lint → Type-Check → Test → Build → Deploy ★
349. Artifact Caching Strategy in CI ★

### 🚀 Module 20.3: Deployment Strategies
350. Blue-Green Deployment ★
351. Canary Releases for Frontend ★
352. Feature Flags as Deployment Safety Valve ★
353. Rollback Strategy ★

### 🐳 Module 20.4: Docker Basics for Frontend
354. Dockerfile for Node/Frontend Apps ★
355. Multi-Stage Builds — Build + Nginx Serve ★
356. Environment Variables in Containerised Frontend ★

---
---

# 🏢 PHASE 8 — COMPANY-SPECIFIC MODULES
> Weeks 9–10 | Targeted prep for each company's unique stack.

---

## SEQUENCE 2️⃣1️⃣ — Web Components & Lightning Web Components ★
> Salesforce LWC is built on Web Components. Do this before your Salesforce interview.

### 🧱 Module 21.1: Web Components Fundamentals
357. Custom Elements API ★
358. Shadow DOM — Open vs Closed Mode ★
359. HTML Templates & Slots ★
360. Custom Events & Component Communication ★

### ⚡ Module 21.2: Lightning Web Components (LWC)
361. LWC Component Lifecycle — connectedCallback, disconnectedCallback, renderedCallback ★
362. @api, @track, @wire Decorators ★
363. Wire Service & Apex Method Integration ★
364. LWC Events — Custom Events, Lightning Message Service ★
365. Salesforce Lightning Design System (SLDS) ★

### 🔗 Module 21.3: Framework Interop
366. Angular Elements — Exporting as Web Components ★
367. Embedding React Components in Angular & Vice Versa ★
368. Sharing State Across Frameworks in Micro-Frontend ★

---

## SEQUENCE 2️⃣2️⃣ — SAP UI5 & Enterprise Frontend Patterns ★
> Your most current daily skill. Articulate it clearly to non-SAP companies.

### 🏗️ Module 22.1: SAP UI5 Architecture
369. SAPUI5 vs OpenUI5 — Differences & Licensing ★
370. MVC Pattern in UI5 — Model, View, Controller ★
371. OData Binding — Property, Aggregation, Element Binding ★
372. UI5 Lifecycle — init, onBeforeRendering, onAfterRendering ★

### 🎨 Module 22.2: Fiori Design System
373. SAP Fiori Design Principles ★
374. Fiori Launchpad Architecture ★
375. Theming — SAP Theming Base Content, CSS Variables ★

### 📐 Module 22.3: Enterprise UI Patterns
376. Master-Detail Pattern ★
377. Worklist Pattern ★
378. Object Page Layout ★
379. Smart Controls — SmartTable, SmartForm, SmartFilterBar ★

### 💼 Module 22.4: Positioning SAP Experience
380. How to Articulate SAP UI5 Work to Non-SAP Companies ★
381. Transferable Skills — OData → REST, UI5 MVC → React/Angular patterns ★
382. SAP BI Launchpad Case Study — Performance, Security, Accessibility ★

---
---

# 🎯 PHASE 9 — SYSTEM DESIGN & INTERVIEW EXECUTION
> Weeks 9–11 | Everything above now gets applied. This is the exam.

---

## SEQUENCE 2️⃣3️⃣ — Frontend System Design Foundations
> Now that you know everything, learn how to present it in an interview.

### 📘 Module 23.1: Foundations & Mindset
383. What is Frontend System Design
384. How Frontend System Design Differs from Backend Design
385. Role of a Senior / Staff Frontend Engineer
386. How Microsoft / Adobe / Salesforce / Cisco Differ in Expectations ★

### 📘 Module 23.2: Interviews & Expectations
387. What FAANG Interviewers Look For
388. HLD vs LLD in Frontend Context

### 📘 Module 23.3: Requirements & Trade-offs
389. Functional vs Non-Functional Requirements (Frontend)
390. Trade-offs Over Perfect UI
391. Thinking in Components, State, and Data Flow
392. Capacity Estimation for Frontend Systems ★

---

## SEQUENCE 2️⃣4️⃣ — DSA for Frontend Engineers ★
> All 4 companies have a DSA round. Do this in parallel with system design practice.

### 📦 Module 24.1: Arrays & Strings
393. Two Pointers Pattern ★
394. Sliding Window Pattern ★
395. Prefix Sums ★
396. Anagram / Palindrome Problems ★

### 🗂️ Module 24.2: Hashmaps & Sets
397. Frequency Maps Pattern ★
398. Two-Sum Variants ★
399. Grouping & Bucketing ★

### 📚 Module 24.3: Stacks & Queues
400. Monotonic Stack Problems ★
401. Browser History / Undo-Redo Simulation ★
402. Queue-Based BFS ★

### 🌳 Module 24.4: Trees & Graphs
403. BFS & DFS — Templates ★
404. Binary Tree Traversals — Inorder, Preorder, Postorder ★
405. Level Order Traversal ★
406. Graph Connected Components ★
407. DOM Tree Traversal as Graph Problem ★

### 🔁 Module 24.5: Recursion & DP Basics
408. Recursion Mental Model ★
409. Memoization vs Tabulation ★
410. Classic DP — Climbing Stairs, Coin Change, LCS ★

---

## SEQUENCE 2️⃣5️⃣ — Practical System Design Problems
> Apply everything. Time yourself. Record yourself.

### 🛠️ Module 25.1: UI Components (Machine Coding)
411. Autocomplete Search — debounce, AbortController, ARIA
412. Infinite Scroll — IntersectionObserver, virtualisation
413. Notification System — queue, auto-dismiss, screen reader
414. Drag-and-Drop List — HTML5 drag API, keyboard alternative
415. Poll Widget
416. Image Carousel — keyboard, touch, ARIA
417. Date Picker with Accessibility ★
418. Rich Text Editor (contenteditable) ★
419. Virtual Scrolling Component from Scratch ★

### 🧩 Module 25.2: Large System Designs
420. Design Flipkart/Amazon Cart System — state, sync, persistence
421. Design LinkedIn-Style Feed — infinite scroll, real-time, performance
422. Design a Chat UI — WebSocket, reconnection, message ordering
423. Design Slack-Like Interface — channels, presence, notifications
424. Design Google Docs-Style Collaborative Editor ★
425. Design a File Upload System with Progress & Resume ★
426. Design Cisco-Style Network Monitoring Dashboard ★
427. Design Salesforce-Style CRM Record View ★
428. Design Adobe-Style Asset Manager ★
429. Design E-Commerce Frontend
430. Design a Live Dashboard
431. Design a Comment System

---

## SEQUENCE 2️⃣6️⃣ — Machine Coding ↔ Design Bridge

### 🧠 Module 26.1: Design Thinking
432. Component Decomposition
433. State vs Props
434. Edge Case Handling
435. Accessibility-First Component Design ★

### ⚙️ Module 26.2: Code Quality
436. Performance-Aware Components
437. Reusability & Extensibility
438. Interview-Friendly Code Style
439. TypeScript Typing in Machine Coding Rounds ★

### 🔁 Module 26.3: Evolution
440. Whiteboard → Code
441. Incremental Refactoring
442. Handling Unknown Requirements
443. Talking Through Trade-offs While Coding ★

---

## SEQUENCE 2️⃣7️⃣ — Interview Strategy

### 🎯 Module 27.1: Interview Flow
444. How to Start a System Design Interview
445. Requirement Clarification Framework
446. Architecture Drawing — Tools & Technique
447. Time Boxing Each Section ★

### 💬 Module 27.2: Communication
448. Explaining Trade-offs Clearly
449. Handling Performance Questions
450. Scale & Edge Cases
451. Recovering When You Don't Know the Answer ★

### ✅ Module 27.3: Closure
452. Common Mistakes Senior Engineers Make
453. Closing Strong — How to End a System Design Round
454. Questions to Ask Your Interviewer ★

---
---

# 👑 PHASE 10 — LEADERSHIP & FINAL PREP
> Weeks 11–12 | Mock interviews, behavioural stories, FAANG expectations.

---

## SEQUENCE 2️⃣8️⃣ — FAANG-Level Expectations

### 🧠 Module 28.1: Senior → Staff
455. Senior vs Staff Expectations
456. Architecture Ownership
457. Technical Vision & Roadmap Planning ★

### 🤝 Module 28.2: Leadership
458. Cross-Team Collaboration
459. Cost vs Performance Trade-offs at Scale
460. Mentorship & Growing Junior Engineers
461. Influencing Without Authority ★

### 🚨 Module 28.3: Production Mindset
462. Production Incidents — Frontend On-Call
463. Frontend Cost Awareness
464. Privacy & GDPR in Frontend
465. Incident Postmortems — How to Write & Present
466. SLO / SLA Awareness for Frontend Engineers ★

---

## SEQUENCE 2️⃣9️⃣ — Behavioural & Leadership Round ★
> Microsoft's 'As Appropriate' round is entirely this. Most candidates underprepare.

### ⭐ Module 29.1: STAR Framework
467. STAR Method — Situation, Task, Action, Result ★
468. Adding Growth Mindset to Every Story — 'What I'd Do Differently' ★
469. Keeping Stories Under 2.5 Minutes ★
470. Quantifying Impact in Behavioural Stories ★

### 🎯 Module 29.2: Your 8 Core Stories
471. Story 1 — Lighthouse 60 → 95: Technical depth, delivered results ★
472. Story 2 — WCAG AA Certification: Quality, customer obsession ★
473. Story 3 — 80% Security Vulnerability Reduction: Ownership, proactiveness ★
474. Story 4 — Mentoring 4 Engineers: Leadership, scaling yourself ★
475. Story 5 — Micro-Frontend Architecture: System thinking, judgement ★
476. Story 6 — Bosch Dashboard Delivery Under Deadline: Pressure, reliability ★
477. Story 7 — Cross-Team Module Delivery: Collaboration, influence without authority ★
478. Story 8 — Excellence in Frontend Engineering Award: Impact recognition ★

### 🏢 Module 29.3: Company-Specific Behavioural Values
479. Microsoft — Growth Mindset, Clarity, Energy, Success of Others ★
480. Adobe — Craft, Innovation, Genuine, Exceptional ★
481. Salesforce — Trust, Customer Success, Innovation, Equality ★
482. Cisco — Integrity, Trust, Collaboration, Innovation ★

### 💰 Module 29.4: Compensation & Negotiation
483. How to Respond to an Offer Without Weakening Your Position ★
484. Counter-Offering — Anchoring, Justification, Timeline ★
485. Base vs Equity vs Bonus Trade-offs at Each Company ★
486. Using Levels.fyi Data in Negotiation ★

---
---

# 📊 STUDY SEQUENCE SUMMARY

| Sequence | Part | Phase | Week | Topics |
|----------|------|-------|------|--------|
| 1 | JavaScript Engine & Runtime | Foundation | 1 | 1–21 |
| 2 | Browser & Web Platform Internals | Foundation | 1–2 | 22–42 |
| 3 | TypeScript Deep Dive | Foundation | 2 | 43–58 |
| 4 | Angular & RxJS Deep Dive | Frameworks | 3–4 | 59–80 |
| 5 | React, Next.js & Redux Deep Dive | Frameworks | 4–5 | 81–135 |
| 6 | State Management | State & Data | 5 | 136–148 |
| 7 | Data Fetching & API Design | State & Data | 5 | 149–164 |
| 8 | Performance Optimization | Perf & Arch | 6 | 165–181 |
| 9 | Assets & Resource Optimization | Perf & Arch | 6 | 182–195 |
| 10 | Frontend Architecture Patterns | Perf & Arch | 6–7 | 196–209 |
| 11 | Rendering Strategies | Perf & Arch | 7 | 210–225 |
| 12 | Caching & Offline | Reliability | 7 | 226–239 |
| 13 | Security | Reliability | 7 | 240–257 |
| 14 | Authorization & Access Control | Reliability | 7–8 | 258–274 |
| 15 | Real-Time Systems | Scale | 8 | 275–287 |
| 16 | Scalability & Growth | Scale | 8 | 288–303 |
| 17 | Accessibility & UX | Quality | 8 | 304–316 |
| 18 | Testing Strategy | Quality | 8 | 317–331 |
| 19 | Observability | Quality | 8 | 332–342 |
| 20 | CI/CD & Frontend DevOps | Quality | 8–9 | 343–356 |
| 21 | Web Components & LWC | Company-Specific | 9 | 357–368 |
| 22 | SAP UI5 & Enterprise Frontend | Company-Specific | 9 | 369–382 |
| 23 | Frontend System Design Foundations | Interview | 9–10 | 383–392 |
| 24 | DSA for Frontend Engineers | Interview | 9–10 | 393–410 |
| 25 | Practical System Design Problems | Interview | 10–11 | 411–431 |
| 26 | Machine Coding ↔ Design Bridge | Interview | 10–11 | 432–443 |
| 27 | Interview Strategy | Interview | 11 | 444–454 |
| 28 | FAANG-Level Expectations | Leadership | 11–12 | 455–466 |
| 29 | Behavioural & Leadership Round | Leadership | 12 | 467–486 |

---

**Total: 486 Topics · 29 Sequences · 10 Phases · 12 Weeks**
**Apply Order: Cisco → Adobe → Microsoft → Salesforce**
**First application: Week 12**