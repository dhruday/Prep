# Full Stack Engineer — Master Preparation Index
**Hruday D · Senior Full Stack Engineer**
**Stack: Java · Spring Boot · Microservices · React · Angular · GenAI · Agents**
**22 Parts · 386 Topics · Evergreen · Zero Risk Zone**

> ✅ = You already know this (SAP / Bosch / Oracle experience)
> 🔥 = High interview frequency — never skip
> 🆕 = Gap to bridge — focus your study time here

---

## PART 1️⃣ — Full Stack Mindset & Interview Strategy

### Module 1.1: What Full Stack Means at Senior Level
1. Full stack vs specialist — what companies actually expect 🔥
2. How to position frontend depth as a full stack strength
3. End-to-end feature ownership — from DB schema to UI
4. When to go deep vs wide in an interview answer
5. HLD vs LLD — knowing which one the interviewer wants 🔥

### Module 1.2: Requirements & Trade-offs
6. Functional vs non-functional requirements
7. Trade-off thinking — consistency vs availability, speed vs correctness
8. Capacity estimation basics — QPS, storage, bandwidth
9. Back-of-the-envelope calculations 🔥
10. System boundaries and assumptions

### Module 1.3: Interview Flow
11. How to start a system design interview
12. Requirement clarification framework 🔥
13. Time boxing each section
14. Explaining trade-offs clearly while you talk
15. Recovering when you don't know the answer

---

## PART 2️⃣ — Java Core & JVM Internals

### Module 2.1: Java Fundamentals (Interview Level)
16. OOP — Encapsulation, Abstraction, Polymorphism, Inheritance 🔥
17. Interface vs Abstract Class — when to use which 🔥
18. Java Collections — List, Map, Set internals 🔥
19. HashMap internals — hashing, collision, load factor 🔥
20. ConcurrentHashMap vs HashMap vs Hashtable

### Module 2.2: Java Memory & JVM
21. JVM architecture — Heap, Stack, Metaspace 🆕
22. Garbage collection — G1, ZGC, types of GC 🆕
23. Memory leaks — how they happen in backend systems 🆕
24. String pool and immutability internals

### Module 2.3: Concurrency & Threading
25. Thread lifecycle and states 🔥
26. Thread pools — Executors, ThreadPoolExecutor 🔥
27. synchronized vs ReentrantLock vs volatile
28. Deadlock — detection and prevention 🔥
29. CompletableFuture — async non-blocking patterns 🆕
30. ThreadLocal — use cases and risks

### Module 2.4: Java 8–21 Features
31. Streams API — filter, map, reduce, collectors 🔥
32. Optional — proper usage and anti-patterns
33. Lambda expressions and functional interfaces 🔥
34. Default and static methods in interfaces
35. Records, Sealed Classes (Java 17+) 🆕

---

## PART 3️⃣ — Spring Boot Deep Dive

### Module 3.1: Spring Core
36. Dependency Injection — Constructor vs Field vs Setter 🔥
37. Inversion of Control (IoC) container internals
38. Bean lifecycle — @PostConstruct, @PreDestroy, scopes
39. @Component vs @Service vs @Repository vs @Controller
40. Spring AOP — cross-cutting concerns, @Aspect, pointcuts 🆕

### Module 3.2: Spring Boot Internals
41. Spring Boot autoconfiguration — how it works 🔥
42. Spring Boot request lifecycle — DispatcherServlet flow 🔥
43. Filters vs Interceptors vs AOP — when to use which 🔥
44. @Transactional internals — propagation, isolation levels 🔥
45. Spring Boot actuator — health, metrics, endpoints

### Module 3.3: Spring Data & Persistence
46. Spring Data JPA — repositories, JPQL, named queries 🔥
47. ORM pitfalls — N+1 problem, lazy loading, fetch strategies 🔥
48. Connection pooling — HikariCP configuration 🆕
49. Database transactions — ACID properties 🔥
50. Optimistic vs Pessimistic locking 🆕

### Module 3.4: Spring Security
51. Spring Security filter chain 🔥
52. JWT authentication — how to implement end-to-end 🔥
53. OAuth 2.0 + OIDC flows with Spring Security 🔥
54. Role-based access control (RBAC) in Spring
55. Method-level security — @PreAuthorize, @Secured

### Module 3.5: Spring REST APIs
56. REST API design principles 🔥
57. @RestController, @RequestMapping, @PathVariable, @RequestBody
58. Exception handling — @ControllerAdvice, @ExceptionHandler 🔥
59. API versioning strategies
60. Request validation — @Valid, custom validators

---

## PART 4️⃣ — Microservices Architecture 🆕 THE KEY GAP

### Module 4.1: Microservices Foundations
61. Monolith vs Microservices — trade-offs 🔥
62. Service decomposition strategies — by domain, by capability 🔥
63. Domain-Driven Design (DDD) basics — bounded context, aggregates 🆕
64. Database per service pattern 🔥
65. Shared database anti-pattern — why it fails at scale

### Module 4.2: Inter-Service Communication
66. Synchronous — REST vs gRPC between services 🔥
67. Asynchronous — event-driven via Kafka/RabbitMQ 🔥
68. Service discovery — Eureka, Consul 🆕
69. API Gateway pattern — routing, auth, rate limiting 🔥
70. Backend for Frontend (BFF) pattern 🔥

### Module 4.3: Resilience Patterns 🔥
71. Circuit Breaker pattern — Resilience4j implementation 🔥
72. Retry with exponential backoff 🔥
73. Bulkhead pattern — isolating failures 🆕
74. Timeout strategies 🔥
75. Graceful degradation — fallback responses

### Module 4.4: Data Consistency in Microservices
76. Saga pattern — choreography vs orchestration 🆕
77. Two-phase commit (2PC) — why it's avoided 🆕
78. Eventual consistency — when to accept it 🔥
79. Outbox pattern — reliable event publishing 🆕
80. CQRS — Command Query Responsibility Segregation 🆕

### Module 4.5: Microservices Infrastructure
81. Spring Cloud — Config Server, Gateway, LoadBalancer 🆕
82. Service mesh basics — Istio (conceptual) 🆕
83. Centralized configuration management 🆕
84. Distributed tracing — correlation IDs, Zipkin, Jaeger 🆕
85. Health checks and readiness probes

---

## PART 5️⃣ — Databases & Storage

### Module 5.1: SQL Mastery
86. SQL joins — INNER, LEFT, RIGHT, FULL OUTER 🔥
87. Indexing — B-Tree, composite, covering indexes 🔥
88. Query optimization — EXPLAIN plan, slow query analysis 🔥
89. Database normalization — 1NF, 2NF, 3NF
90. Schema design — one-to-many, many-to-many, self-referential

### Module 5.2: Database Scaling
91. Replication — master-slave, master-master 🔥
92. Sharding and partitioning strategies 🔥
93. Read replicas — when and how to use
94. Connection pooling at scale
95. Database isolation levels — READ COMMITTED, REPEATABLE READ, SERIALIZABLE 🔥

### Module 5.3: NoSQL Databases
96. When to choose NoSQL over SQL 🔥
97. Document stores — MongoDB patterns and use cases
98. Key-value stores — Redis use cases 🔥
99. Columnar databases — Cassandra basics 🆕
100. Choosing the right database for a system design problem 🔥

### Module 5.4: Redis Deep Dive
101. Redis data structures — String, Hash, List, Set, ZSet 🔥
102. Redis as cache — TTL, eviction policies 🔥
103. Redis pub/sub basics
104. Redis distributed lock — Redlock algorithm 🆕
105. Redis persistence — RDB vs AOF

---

## PART 6️⃣ — Messaging & Event-Driven Architecture 🆕

### Module 6.1: Kafka Fundamentals
106. Why Kafka — problems it solves 🔥
107. Topics, partitions, offsets, consumer groups 🔥
108. Kafka producer — acks, retries, idempotence 🆕
109. Kafka consumer — at-least-once vs exactly-once 🔥
110. Kafka retention and compaction

### Module 6.2: Kafka with Spring Boot
111. Spring Kafka — @KafkaListener, KafkaTemplate 🆕
112. Error handling in Kafka consumers — DLQ pattern 🆕
113. Kafka Streams basics 🆕
114. Schema Registry and Avro (conceptual) 🆕

### Module 6.3: RabbitMQ
115. RabbitMQ vs Kafka — when to use which 🔥
116. Exchanges — Direct, Topic, Fanout, Headers
117. Queues, bindings, routing keys
118. Dead letter queues and message TTL 🆕
119. Spring AMQP — @RabbitListener

### Module 6.4: Messaging Guarantees
120. At-most-once vs at-least-once vs exactly-once 🔥
121. Idempotency — designing idempotent consumers 🔥
122. Message ordering guarantees 🔥
123. Poison message handling
124. Event sourcing basics 🆕

---

## PART 7️⃣ — API Design & Communication

### Module 7.1: REST API Design
125. REST principles — statelessness, uniform interface 🔥
126. HTTP methods — GET, POST, PUT, PATCH, DELETE semantics 🔥
127. HTTP status codes — the full set, not just 200 and 404 🔥
128. Pagination — cursor-based vs offset-based 🔥
129. API versioning — URL vs header vs media type

### Module 7.2: Advanced API Patterns
130. GraphQL vs REST — when to choose which 🔥
131. gRPC — Protocol Buffers, streaming, use cases 🆕
132. WebSockets — real-time bidirectional communication 🔥 ✅
133. Server-Sent Events — one-way streaming
134. tRPC and type-safe APIs (awareness level)

### Module 7.3: API Reliability
135. Rate limiting — token bucket, leaky bucket algorithms 🔥
136. API Gateway — authentication, routing, throttling 🔥
137. Request deduplication
138. Circuit breaker at API level 🔥
139. Graceful API degradation — fallback responses

---

## PART 8️⃣ — Distributed Systems & Scalability

### Module 8.1: Core Distributed Theory
140. CAP theorem — real-world implications 🔥
141. PACELC theorem
142. Strong vs eventual consistency 🔥
143. Quorum-based systems
144. Leader election — Raft, ZooKeeper

### Module 8.2: Scaling Patterns
145. Horizontal vs vertical scaling 🔥
146. Stateless services — why they scale better 🔥
147. Load balancing — Layer 4 vs Layer 7 🔥
148. Load balancing algorithms — Round Robin, Least Connections, IP Hash
149. Auto-scaling strategies

### Module 8.3: Resilience at Scale
150. Single point of failure — how to eliminate 🔥
151. Redundancy patterns
152. Disaster recovery — RPO vs RTO
153. Chaos engineering basics
154. SLI, SLO, SLA — what they mean and how to set them 🔥

---

## PART 9️⃣ — Caching Strategy

### Module 9.1: Caching Layers
155. Client-side vs server-side vs CDN caching 🔥
156. Cache eviction policies — LRU, LFU, FIFO 🔥
157. Cache invalidation strategies — the hardest problem 🔥
158. Cache aside vs read-through vs write-through 🔥
159. Cache stampede — prevention strategies 🆕

### Module 9.2: Distributed Caching
160. Redis as distributed cache 🔥
161. Cache consistency in microservices 🆕
162. Cache warming strategies
163. Stale-while-revalidate pattern ✅
164. CDN caching — edge vs origin 🔥

---

## PART 🔟 — Security (Full Stack)

### Module 10.1: Web Security Threats
165. XSS — stored, reflected, DOM-based + prevention ✅ 🔥
166. CSRF — SameSite cookies, CSRF tokens ✅ 🔥
167. SQL Injection — prevention in Spring/JPA 🔥
168. CORS — preflight, credentialed requests ✅ 🔥
169. OWASP Top 10 — full awareness 🔥 ✅

### Module 10.2: Authentication & Tokens
170. JWT deep dive — claims, expiry, refresh strategy 🔥 ✅
171. OAuth 2.0 flows — Authorization Code, Client Credentials 🔥
172. OIDC — ID token vs access token
173. Silent refresh pattern ✅
174. Passkeys and WebAuthn (awareness) 🆕

### Module 10.3: Secure System Design
175. HTTPS — TLS handshake, certificate validation 🔥
176. Secrets management — Vault, AWS Secrets Manager 🆕
177. Encryption at rest and in transit 🔥
178. CSP implementation 🔥 ✅
179. Secure headers audit — HSTS, X-Frame, Referrer-Policy ✅

---

## PART 1️⃣1️⃣ — DevOps, Docker & Kubernetes 🆕

### Module 11.1: Docker
180. Why Docker — problems it solves 🔥
181. Dockerfile — layers, instructions, best practices 🆕
182. Multi-stage builds — build + serve pattern 🆕
183. Docker Compose — local multi-service setup 🆕
184. Container networking and volumes

### Module 11.2: Kubernetes Fundamentals
185. Kubernetes architecture — master, node, pod 🔥 🆕
186. Deployments, ReplicaSets, Services 🆕
187. ConfigMaps and Secrets 🆕
188. Liveness and readiness probes 🆕
189. Horizontal Pod Autoscaler 🆕

### Module 11.3: CI/CD Pipelines
190. Pipeline stages — Lint → Test → Build → Dockerize → Deploy 🔥
191. GitHub Actions — workflows, jobs, matrix builds ✅
192. Jenkins pipelines — declarative syntax ✅
193. Blue-green deployment 🆕
194. Canary releases and rollback strategy 🆕

### Module 11.4: Cloud Basics (AWS)
195. EC2, S3, RDS — core services 🆕
196. API Gateway + Lambda (serverless awareness) 🆕
197. EKS — Kubernetes on AWS 🆕
198. CloudWatch — logs, metrics, alarms 🆕
199. VPC, Security Groups, IAM basics 🆕

---

## PART 1️⃣2️⃣ — Frontend Architecture (Curated for Full Stack)

### Module 12.1: Core Frontend Architecture
200. Component-driven architecture 🔥 ✅
201. Micro-frontend architecture — Module Federation 🔥 ✅
202. SPA vs SSR vs SSG — trade-offs 🔥 ✅
203. React Server Components — server vs client boundary 🔥
204. Design system architecture ✅

### Module 12.2: Browser Internals (Senior Expected)
205. Critical rendering path 🔥 ✅
206. Event loop — microtasks vs macrotasks 🔥
207. HTTP/1.1 vs HTTP/2 vs HTTP/3 🔥
208. Web Workers and Service Workers

### Module 12.3: React Deep Dive ✅
209. React Fiber and reconciliation algorithm 🔥
210. All hooks — useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext 🔥 ✅
211. React 18 — Concurrent Mode, Automatic Batching, Suspense 🔥
212. React Server Components + Server Actions 🔥
213. Custom hooks — patterns, composition ✅

### Module 12.4: Angular Deep Dive ✅
214. NgModules vs Standalone Components (Angular 14+) 🔥 ✅
215. Change detection — Default vs OnPush 🔥 ✅
216. Dependency injection — hierarchical injectors ✅
217. Angular Router — lazy loading, guards, resolvers ✅
218. Angular Signals (v17+) 🆕

### Module 12.5: RxJS Mastery ✅
219. Cold vs Hot Observables 🔥 ✅
220. Subject, BehaviorSubject, ReplaySubject ✅
221. switchMap vs mergeMap vs concatMap vs exhaustMap 🔥 ✅
222. takeUntil pattern for memory leak prevention ✅
223. combineLatest, forkJoin, withLatestFrom ✅

---

## PART 1️⃣3️⃣ — State Management

### Module 13.1: Frontend State
224. Local vs global state — when to go global 🔥
225. Redux Toolkit — createSlice, createAsyncThunk, RTK Query 🔥 ✅
226. NgRx — Store, Actions, Reducers, Effects, Selectors ✅
227. React Query / TanStack Query — server state management 🔥
228. Zustand and signals — lightweight alternatives

### Module 13.2: State at Scale
229. State normalization — why and how 🔥
230. Avoiding over-global state
231. URL as state — when and why
232. State machines (XState) for complex flows 🆕
233. Cache-based state management patterns

---

## PART 1️⃣4️⃣ — Performance (Frontend + Backend)

### Module 14.1: Frontend Performance ✅
234. Core Web Vitals — LCP, CLS, INP, FCP 🔥 ✅
235. Code splitting and lazy loading 🔥 ✅
236. Tree shaking and bundle optimization ✅
237. Image optimization — AVIF, WebP, responsive images ✅
238. Lighthouse CI in build pipeline ✅

### Module 14.2: React / Angular Performance
239. Memoization — React.memo, useMemo, useCallback 🔥 ✅
240. Angular OnPush + trackBy patterns ✅
241. Virtual scrolling for large lists ✅
242. Avoiding unnecessary re-renders 🔥 ✅
243. Main thread scheduling — Long Tasks, INP

### Module 14.3: Backend Performance
244. N+1 query problem — detection and fix 🔥
245. Database index strategy for high-traffic queries 🔥
246. Connection pool sizing 🆕
247. Async processing — offload to queues 🔥
248. Caching at service layer — Spring Cache abstraction 🆕

---

## PART 1️⃣5️⃣ — Testing Strategy (Full Stack)

### Module 15.1: Testing Philosophy
249. Unit vs integration vs E2E — when to use which 🔥
250. Testing pyramid vs testing trophy 🔥
251. Test coverage — what number actually matters
252. Mocking vs stubbing vs faking — when to use which

### Module 15.2: Frontend Testing ✅
253. Jest — setup, mocking, spying ✅
254. React Testing Library — render, screen, userEvent, async ✅
255. Jasmine and Karma — Angular patterns ✅
256. Playwright vs Cypress — architecture trade-offs ✅
257. Visual regression testing — Chromatic, Percy

### Module 15.3: Backend Testing
258. Unit testing Spring Boot — @SpringBootTest, @WebMvcTest, @DataJpaTest 🔥
259. Mocking with Mockito — @Mock, @InjectMocks, verify 🔥
260. Integration testing — TestContainers for real DB 🆕
261. Contract testing — Pact (consumer-driven contracts) 🆕
262. API testing — RestAssured, MockMvc 🔥

---

## PART 1️⃣6️⃣ — Observability & Monitoring

### Module 16.1: Logging
263. Structured logging — JSON logs, correlation IDs 🔥
264. Log levels — when to use DEBUG, INFO, WARN, ERROR
265. Centralized logging — ELK stack, Splunk 🆕
266. Distributed tracing — Zipkin, Jaeger, OpenTelemetry 🆕

### Module 16.2: Metrics & Alerts
267. Micrometer + Prometheus — Spring Boot metrics 🆕
268. Grafana dashboards 🆕
269. Frontend monitoring — Sentry, Datadog, RUM ✅
270. Alert strategy — avoid alert fatigue
271. Incident management and postmortems 🔥

---

## PART 1️⃣7️⃣ — DSA for Full Stack Interviews

### Module 17.1: Core Patterns 🔥
272. Arrays — Two Pointers, Sliding Window, Prefix Sums
273. HashMaps — Frequency Maps, Two-Sum variants
274. Stacks and Queues — Monotonic Stack, BFS
275. Recursion mental model + memoization 🔥
276. Binary search — templates and variants

### Module 17.2: Trees & Graphs
277. Binary tree traversals — Inorder, Preorder, Postorder, Level Order 🔥
278. BFS and DFS — templates 🔥
279. Graph connected components
280. DOM Tree traversal as graph problem

### Module 17.3: Frontend-Specific DSA 🔥
281. Implement LRU Cache — Map + doubly linked list 🔥
282. Implement EventEmitter / Pub-Sub 🔥
283. Implement Deep Clone and Deep Equal 🔥
284. Implement Promise.all / Promise.race from scratch 🔥
285. Implement curry, memoize, once, pipe 🔥

---

## PART 1️⃣8️⃣ — OOP, SOLID & Design Patterns

### Module 18.1: OOP & SOLID
286. SOLID — all 5 principles with real examples 🔥
287. Composition over Inheritance 🔥
288. Tight coupling vs loose coupling
289. Dependency Injection — why Spring uses it 🔥
290. Inversion of Control (IoC)

### Module 18.2: Design Patterns (Interview Level) 🔥
291. Singleton — and why it is dangerous
292. Factory and Abstract Factory
293. Builder pattern — common in Spring configs
294. Adapter pattern
295. Decorator pattern
296. Proxy pattern — Spring AOP uses this
297. Facade pattern
298. Strategy pattern — replacing if-else chains 🔥
299. Observer pattern — event systems 🔥
300. Chain of Responsibility

---

## PART 1️⃣9️⃣ — System Design Case Studies 🔥

### Module 19.1: Core Systems to Design
301. URL Shortener — hashing, redirects, analytics
302. Rate Limiter — token bucket, distributed counters
303. Notification System — fan-out, push vs pull
304. Chat / Messaging System — WebSocket, message storage 🔥
305. Social Media Feed — fan-out on write vs read

### Module 19.2: Full Stack Specific
306. E-commerce platform — product catalog, cart, orders, payments
307. Real-time dashboard — WebSocket, time-series DB 🔥 ✅
308. File upload system — chunked upload, S3, progress tracking ✅
309. Search system — indexing, relevance, Elasticsearch basics
310. Video streaming platform — HLS, CDN, adaptive bitrate

### Module 19.3: Frontend System Design 🔥
311. Autocomplete search — debounce, caching, ranking
312. Collaborative editor — OT vs CRDT, conflict resolution
313. Infinite scroll feed — virtualization, cursor pagination
314. Design system architecture — tokens, component library
315. Micro-frontend shell — routing, shared state, versioning

---

## PART 2️⃣0️⃣ — Behavioural & Leadership Round

### Module 20.1: STAR Framework
316. STAR method — Situation, Task, Action, Result 🔥
317. Adding growth mindset — what I would do differently
318. Quantifying impact in every story 🔥
319. Keeping stories under 2.5 minutes

### Module 20.2: Your 8 Core Stories (From Your Resume)
320. Story 1 — Lighthouse 60 → 95: Technical depth, performance ✅
321. Story 2 — 80% Security Vulnerability Reduction: Ownership, proactiveness ✅
322. Story 3 — WCAG AA Certification: Quality, customer obsession ✅
323. Story 4 — Mentoring 4 Engineers: Leadership, scaling yourself ✅
324. Story 5 — Micro-Frontend Architecture: System thinking, judgement ✅
325. Story 6 — Bosch Real-Time Dashboards: Full stack delivery ✅
326. Story 7 — Oracle REST APIs: End-to-end ownership, backend delivery ✅
327. Story 8 — Excellence in Frontend Engineering Award: Impact ✅

### Module 20.3: Full Stack Leadership Signals
328. How to talk about backend decisions you made
329. Owning failures and what you changed
330. Cross-team collaboration stories
331. Influencing without authority
332. Technical vision — how you improved a codebase long-term

### Module 20.4: Compensation & Negotiation
333. How to respond to an offer without weakening your position 🔥
334. Counter-offering — anchoring, justification, timeline
335. Base vs equity vs bonus trade-offs
336. Using Naukri salary insights and Levels.fyi in negotiation

---


---

## PART 2️⃣1️⃣ — Generative AI for Full Stack Engineers 🆕

> Every product company in 2026 expects senior engineers to build with AI, not just use it.
> This part makes you dangerous — you can design, build, and defend AI-powered systems end to end.

### Module 21.1: LLM Fundamentals (What You Must Know as an Engineer)
337. How LLMs work — tokens, context window, temperature, top-p 🔥 🆕
338. Prompt engineering fundamentals — zero-shot, few-shot, chain-of-thought 🔥 🆕
339. LLM limitations — hallucinations, context limits, stale knowledge 🔥 🆕
340. Tokens and cost — how to estimate API cost for a feature 🆕
341. Choosing a model — GPT-4o vs Claude vs Gemini vs open-source (Llama, Mistral) 🆕

### Module 21.2: RAG — Retrieval Augmented Generation 🔥
342. Why RAG exists — solving stale knowledge and hallucination problems 🔥 🆕
343. RAG architecture — Retriever + Generator pipeline end to end 🔥 🆕
344. Vector databases — how similarity search works internally 🔥 🆕
345. Embeddings — how text becomes vectors, why cosine similarity 🆕
346. Chunking strategies — fixed, semantic, hierarchical 🆕
347. Reranking — why retrieval alone is not enough 🆕
348. RAG vs fine-tuning — when to use which 🔥 🆕
349. Implementing RAG with Spring Boot + pgvector or Pinecone 🆕
350. Streaming RAG responses to React frontend via SSE 🆕

### Module 21.3: AI Agents 🔥
351. What an AI agent is — LLM + tools + memory + planning loop 🔥 🆕
352. Tool use and function calling — how agents call external APIs 🔥 🆕
353. ReAct pattern — Reasoning + Acting loop internals 🆕
354. Agent memory types — in-context, external vector store, episodic 🆕
355. Multi-agent systems — orchestrator + specialist agents 🆕
356. Agentic frameworks — LangChain, LangGraph, AutoGen, CrewAI trade-offs 🆕
357. Spring AI — building AI-powered features in Java and Spring Boot 🔥 🆕
358. When agents go wrong — loops, hallucinated tool calls, guardrails 🔥 🆕

### Module 21.4: Building AI-Powered APIs (Full Stack)
359. Streaming LLM responses — SSE from Spring Boot to React 🔥 🆕
360. Structured output from LLMs — JSON mode, schema enforcement 🆕
361. Prompt injection attacks — what they are and how to defend 🔥 🆕
362. Rate limiting and cost control for LLM APIs 🆕
363. Semantic caching of LLM responses — vector similarity approach 🆕
364. Observability for AI — tracing prompts, tokens, latency, cost 🆕

### Module 21.5: Vector Databases Deep Dive
365. pgvector — Postgres vector extension, easiest production starting point 🔥 🆕
366. Pinecone — managed vector DB, when to choose over pgvector 🆕
367. Weaviate and Qdrant — open source alternatives 🆕
368. HNSW indexing — how approximate nearest neighbour search works 🆕
369. Hybrid search — combining vector + keyword BM25 search 🆕

### Module 21.6: GenAI System Design Problems 🔥
370. Design an AI-powered customer support chatbot with RAG 🔥 🆕
371. Design a code review assistant (GitHub Copilot style) 🆕
372. Design a document Q&A system over large PDF corpus 🆕
373. Design an AI agent that books meetings and sends emails 🆕
374. Design a content moderation system using LLMs 🆕

---

## PART 2️⃣2️⃣ — AI Integration Patterns in Full Stack Systems 🆕

### Module 22.1: Integrating AI into Existing Microservices
375. AI as a microservice — isolating LLM calls behind a service boundary 🔥 🆕
376. Async AI processing — queuing LLM jobs via Kafka to avoid timeouts 🆕
377. Fallback strategy when AI is unavailable — graceful degradation 🔥 🆕
378. Feature flags for AI rollout — safe canary + A/B testing 🆕

### Module 22.2: Frontend AI Patterns ✅ opportunity
379. Streaming UI — rendering LLM output token by token in React 🔥 🆕
380. AI loading states — typing indicators, progress bars, skeleton screens 🆕
381. Error handling for AI responses — retry, fallback, user messaging 🆕
382. Prompt templates in frontend — keeping them maintainable and testable 🆕

### Module 22.3: Responsible AI and Production Concerns 🔥
383. Guardrails — input validation, output filtering, content safety policies 🔥 🆕
384. PII handling — never send personal data to third-party LLM APIs 🔥 🆕
385. AI audit logging — what to log, why, GDPR compliance angle 🔥 🆕
386. Model versioning — what breaks when a model updates silently 🆕


## PART 2️⃣3️⃣ — Project Deep Dive: SAP BI Launchpad Architecture ✅ 🔥

> This is YOUR project. Every interview will ask "walk me through a complex system you built."
> This part prepares you to draw the architecture live, explain every decision,
> defend every trade-off, and connect it to every topic in this index.
> Master this part and you walk into any interview with a real weapon.

---

### Module 23.1: The Big Picture — Draw This Architecture Cold

**What SAP BI Launchpad is (say this in 30 seconds):**
> SAP BI Launchpad is a globally deployed enterprise analytics platform used by
> thousands of business users daily. It is a shell application that hosts
> multiple analytics tools — reports, dashboards, and data visualisations —
> built by different teams using different frameworks, all running inside one
> browser tab without conflicts.

387. The full system architecture — draw it from memory in 2 minutes 🔥 ✅
     - Browser shell (React/Redux)
     - Micro-frontend modules (React, SAP UI5, Next.js — per team)
     - Module Federation — how frameworks are loaded without page reload
     - Spring Boot microservices backend — one per domain
     - API Gateway — single entry point for all frontend requests
     - Shared authentication — JWT, OAuth 2.0, SSO
     - CDN — static assets, lazy-loaded micro-frontend bundles

388. The ASCII architecture diagram — practise drawing this 🔥 ✅

```
Browser Tab
┌─────────────────────────────────────────────────────────────────┐
│                    Shell App (React + Redux)                     │
│          Routing · Auth State · Global Layout · Navbar           │
│                                                                  │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│   │  Report    │  │ Dashboard  │  │ Analytics  │  │ Admin    │ │
│   │  Module    │  │  Module    │  │  Module    │  │ Module   │ │
│   │ (SAP UI5)  │  │  (React)   │  │ (Next.js)  │  │ (React)  │ │
│   │  Team A    │  │  Team B    │  │  Team C    │  │  Team D  │ │
│   └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│              ↑ Module Federation (Webpack 5)                     │
└─────────────────────────────────────────────────────────────────┘
                          │  REST + JWT
                          ▼
              ┌───────────────────────┐
              │      API Gateway      │
              │  Auth · Rate Limit    │
              │  Routing · Logging    │
              └───────────────────────┘
         ┌──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼
   ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │  Report  │ │ User   │ │ Data   │ │ Notif. │
   │ Service  │ │Service │ │Service │ │Service │
   │(Spring)  │ │(Spring)│ │(Spring)│ │(Spring)│
   └──────────┘ └────────┘ └────────┘ └────────┘
         │          │          │
         └──────────┴──────────┘
                    │
              ┌─────┴─────┐
              │  Database  │
              │ (per svc)  │
              └───────────┘
```

389. How to explain Module Federation in plain English 🔥 ✅
     - What problem it solves (teams ship independently, no merge conflicts)
     - How the shell loads a remote module at runtime without a page reload
     - How shared dependencies (React, Redux) are handled to avoid duplicates
     - What happens when a remote module fails to load — fallback strategy

390. How to explain the micro-frontend routing strategy 🔥 ✅
     - Shell owns the URL and top-level routing
     - Each micro-frontend owns its own sub-routes
     - How deep linking works across module boundaries
     - How browser back/forward buttons work across modules

391. How different frameworks (SAP UI5, React, Next.js) coexist in one tab 🔥 ✅
     - Each module is a self-contained bundle — its own styles, components, state
     - CSS isolation — Shadow DOM, CSS Modules, scoped class names
     - No shared global state between modules — only through shell's event bus
     - Why this works and what breaks if you get it wrong

---

### Module 23.2: The Performance Story — Lighthouse 60 → 95

392. Why the score was 60 — what was broken (be specific) 🔥 ✅
     - Render-blocking JavaScript — large synchronous bundles
     - No lazy loading — all micro-frontend modules loaded upfront
     - Unoptimised images — wrong formats, no compression
     - No code splitting — one massive bundle for the shell

393. What you changed — the exact fixes in order 🔥 ✅
     - Lazy loading each micro-frontend module — only load when user navigates there
     - Code splitting the shell — separate chunks for routes, vendors, utilities
     - Image optimisation — WebP format, responsive srcset, lazy loading below fold
     - Critical CSS inlining — above-fold styles in HTML, rest deferred
     - Bundle analysis — webpack-bundle-analyzer to find and remove dead code

394. How to explain the 45% page-load improvement with numbers 🔥 ✅
     - Before: LCP 6.2s · TTI 8.1s · Bundle size 2.1MB
     - After: LCP 3.4s · TTI 4.4s · Bundle size 780KB
     - What LCP and TTI mean in plain English — ready to explain to a non-tech interviewer
     - How lazy loading micro-frontends directly cut the initial bundle by 60%

395. How Core Web Vitals connect to real business impact 🔥 ✅
     - Every 1 second of LCP improvement = X% drop in bounce rate (Google data)
     - Faster TTI = users can interact sooner = more reports generated per session
     - How you measured before and after — Lighthouse CI in the pipeline

396. How to draw the before/after architecture for performance 🔥 ✅

```
BEFORE — everything loads upfront
Shell loads → loads ALL modules → page ready (8 seconds)

AFTER — lazy loading
Shell loads → page ready (2 seconds)
                User clicks Report tab → Report module loads (1.2 seconds)
                User clicks Dashboard tab → Dashboard module loads (0.8 seconds)
```

---

### Module 23.3: The Security Story — 80% Vulnerability Reduction

397. What the vulnerabilities were — common types in enterprise frontend 🔥 ✅
     - XSS — user-controlled input rendered as HTML without sanitisation
     - Missing security headers — no CSP, no HSTS, no X-Frame-Options
     - Sensitive data in localStorage — JWT tokens, user PII accessible to scripts
     - Outdated npm packages — known CVEs in dependencies

398. What you implemented — the exact fixes 🔥 ✅
     - CSP (Content Security Policy) — whitelist of allowed script sources
       Explain in plain English: "a rule that tells the browser which scripts
       are allowed to run — anything not on the list gets blocked"
     - XSS sanitisation — DOMPurify on all user-generated content before render
     - Secure HTTP headers — HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type
     - Moving JWT from localStorage to httpOnly cookies — inaccessible to JavaScript
     - npm audit in CI pipeline — blocks builds with known critical CVEs

399. How to explain the 80% number confidently 🔥 ✅
     - Before: 47 reported vulnerabilities in last 6-month audit
     - After: 9 remaining (infrastructure-level, outside frontend scope)
     - Zero critical incidents post-implementation — how you define "critical"
     - What the remaining 20% were and why they were not in your control

400. How security connects to the micro-frontend architecture 🔥 ✅
     - CSP challenge in micro-frontends — each remote module needs its own allowed sources
     - How a compromised third-party module could inject scripts — and how CSP blocks it
     - Shared auth token across modules — one place to store, one place to invalidate

---

### Module 23.4: The Accessibility Story — WCAG AA Certification

401. What WCAG AA means and why enterprises care 🔥 ✅
     - Plain English: "a set of rules that makes the product usable for people
       with disabilities — screen readers, keyboard-only users, low vision"
     - Why enterprise customers require it — regulated industries (banking, govt, healthcare)
     - What happens without it — product is not sellable to those customers

402. The 30+ violations — what they were 🔥 ✅
     - Missing ARIA labels on icon buttons — screen reader says "button" not "close dialog"
     - Keyboard traps — focus gets stuck inside a modal, user cannot escape
     - Colour contrast failures — text on background below 4.5:1 ratio
     - Images without alt text — screen reader skips them or says "image"
     - Forms without label associations — screen reader cannot identify input purpose

403. What you fixed and how you tested it 🔥 ✅
     - ARIA labels, roles, live regions added across all interactive components
     - Focus management — custom hook to trap/restore focus in modals and dialogs
     - Colour system audit — updated design tokens to meet 4.5:1 contrast ratio
     - Testing tools — axe DevTools, NVDA screen reader, keyboard-only navigation
     - Accessibility CI check — axe in Playwright E2E tests, fails build on violations

404. How to frame this as a business win in an interview 🔥 ✅
     - "This unlocked enterprise customers in regulated industries who could not
       previously use the product — direct revenue impact"
     - How to explain it to a non-technical interviewer (product manager, HR)
     - How to explain it to a technical interviewer (what you built, how you measured)

---

### Module 23.5: The Architecture Decisions — Defend Every Choice

405. Why micro-frontends instead of a monolithic React app? 🔥 ✅
     - Multiple teams (Team A, B, C, D) — each owns a domain
     - Without micro-frontends: one massive repo, merge conflicts daily, slow releases
     - With micro-frontends: each team ships on their own schedule, no coordination needed
     - The cost: more complex build setup, shared dependency management, SSO complexity

406. Why Module Federation instead of iframes? 🔥 ✅
     - iframes are isolated — but cannot share state, styles, or auth context
     - Module Federation shares React, Redux, auth token — feels like one app to the user
     - The trade-off: iframes are safer (full isolation), Module Federation is better UX

407. Why did some teams use SAP UI5 and others React / Next.js? 🔥 ✅
     - SAP UI5 is the standard at SAP — existing teams, existing knowledge
     - React was chosen by newer teams building from scratch — faster development
     - Next.js was chosen for the analytics module — SSR for heavy data pages
     - Module Federation made this possible — the shell does not care which framework

408. Why Spring Boot microservices instead of a monolith backend? 🔥 ✅
     - Each domain (reports, users, data, notifications) scales independently
     - Report generation is CPU-heavy — scale that service separately
     - User auth is called on every request — scale that service separately
     - The cost: network hops between services, distributed tracing complexity

409. What you would change if you built it again 🔥 ✅
     - This question is almost always asked — have a clear answer
     - "I would add a service mesh (Istio) for inter-service communication observability"
     - "I would add a proper event-driven pattern for report generation — Kafka instead of sync REST"
     - "I would build the design system as a proper shared package from day one"
     - Shows growth mindset — interviewers love this

---

### Module 23.6: Live Interview Practice — Draw and Explain

410. 60-second intro — what SAP BI Launchpad is and why it is complex 🔥 ✅
411. 5-minute architecture walkthrough — draw and narrate simultaneously 🔥 ✅
412. Answer: "What was the hardest technical challenge?" 🔥 ✅
     - Prepared answer: Module Federation with SAP UI5 + React sharing auth context
413. Answer: "What broke in production and how did you fix it?" 🔥 ✅
     - Prepared answer: Lighthouse regression after a new module was added
414. Answer: "How did you ensure teams could ship independently?" 🔥 ✅
     - Prepared answer: Contract testing between shell and modules + CI gates
415. Answer: "How does this scale to 100,000 users?" 🔥 ✅
     - CDN for static assets, horizontal scaling of Spring Boot services,
       Redis for session, rate limiting at API Gateway
416. Answer: "What would you do differently today?" 🔥 ✅
     - Kafka for async report generation, service mesh, shared design tokens

---

*Part 23 added · SAP BI Launchpad Project Deep Dive · 30 Topics (387–416)*

---

## 📊 Summary Table

| Part | Title | Topics | Priority |
|------|-------|---------|----------|
| 1 | Full Stack Mindset & Interview Strategy | 1–15 | Day 1 |
| 2 | Java Core & JVM | 16–35 | Week 1 |
| 3 | Spring Boot Deep Dive | 36–60 | Week 1–2 |
| 4 | Microservices Architecture | 61–85 | Week 2–4 🆕 |
| 5 | Databases & Storage | 86–105 | Week 2–3 |
| 6 | Messaging — Kafka & RabbitMQ | 106–124 | Week 3–4 🆕 |
| 7 | API Design & Communication | 125–139 | Week 2 |
| 8 | Distributed Systems & Scalability | 140–154 | Week 4–5 |
| 9 | Caching Strategy | 155–164 | Week 3 |
| 10 | Security — Full Stack | 165–179 | Week 3 ✅ |
| 11 | DevOps, Docker & Kubernetes | 180–199 | Week 4–6 🆕 |
| 12 | Frontend Architecture | 200–223 | Parallel ✅ |
| 13 | State Management | 224–233 | Parallel ✅ |
| 14 | Performance — Frontend + Backend | 234–248 | Week 5 ✅ |
| 15 | Testing Strategy — Full Stack | 249–262 | Week 5 |
| 16 | Observability & Monitoring | 263–271 | Week 6 |
| 17 | DSA for Full Stack | 272–285 | Daily 20 min |
| 18 | OOP, SOLID & Design Patterns | 286–300 | Week 2 |
| 19 | System Design Case Studies | 301–315 | Week 5–6 🔥 |
| 20 | Behavioural & Leadership | 316–336 | Week 6 ✅ |
| 21 | Generative AI — LLMs, RAG, Agents | 337–374 | Month 3 🆕 |
| 22 | AI Integration Patterns — Full Stack | 375–386 | Month 3 🆕 |
| 23 | Project Deep Dive — SAP BI Launchpad | 387–416 | Week 1 + ongoing 🔥 |

---

## 🗓️ Recommended Study Plan (3 Month Bridge)

### Month 1 — Backend Foundation + Project Story
- Week 1: Parts 2 + 3 + **23** — Java Core + Spring Boot + SAP Project story (do Part 23 in parallel from Day 1)
- Week 2: Parts 7 + 18 + 5 — APIs + OOP/Patterns + Databases
- Week 3: Parts 9 + 10 + 6 (Kafka intro) — Caching + Security + Messaging
- Week 4: Part 4 — Microservices Architecture (all 25 topics) 🔥

### Month 2 — Distributed Systems + DevOps
- Week 5: Parts 8 + 6 (complete) — Distributed Systems + Messaging deep
- Week 6: Part 11 — Docker + Kubernetes + CI/CD
- Week 7: Parts 14 + 15 — Performance + Testing
- Week 8: Part 16 + system design case studies begin

### Month 3 — GenAI + Integration + Interview Readiness
- Week 9: Parts 21 + 22 — GenAI, RAG, Agents, AI Integration Patterns 🔥
- Week 10: Part 19 — System Design Case Studies including AI problems
- Week 11: DSA grind + frontend architecture refresh
- Week 12: Part 20 + Part 23 revision — Behavioural stories + mock interviews

### Daily Non-Negotiables
- 20 min DSA (Part 17) — every single day
- 1 system design problem per week from Part 19
- Review one STAR story per week from Part 20
- **Practice drawing the SAP architecture diagram cold — once a week, every week**

---

## ⚡ What You Can Skip (Already Zero Risk)
- ✅ React hooks, Redux, RTK — you know this
- ✅ Angular, RxJS, NgRx — Bosch + Oracle experience
- ✅ OWASP security, CSP, XSS — SAP work covers this
- ✅ Lighthouse, Core Web Vitals — SAP 60→95 story
- ✅ Micro-frontends, Module Federation — SAP architecture
- ✅ WCAG accessibility — SAP certification
- ✅ CI/CD pipelines with Jenkins/GitHub Actions — existing exposure
- ✅ Behavioural stories — 8 strong stories already mapped
- ✅ SAP BI Launchpad architecture — Part 23 owns this

## 🔥 Focus 80% of Your Time Here (The Real Gaps)
- 🆕 Microservices patterns — Saga, CQRS, Outbox, Circuit Breaker
- 🆕 Kafka — topics, partitions, consumer groups, Spring Kafka
- 🆕 Docker + Kubernetes — Dockerfile, K8s basics
- 🆕 Distributed systems — CAP, consistency, leader election
- 🆕 Java concurrency — CompletableFuture, ThreadPool
- 🆕 TestContainers + contract testing
- 🆕 AWS fundamentals — EC2, S3, RDS, EKS
- 🆕 RAG — vector databases, embeddings, chunking, reranking
- 🆕 AI Agents — tool use, ReAct, Spring AI, LangChain
- 🆕 Streaming AI responses — SSE from Spring Boot to React UI

---

*416 Topics · 23 Parts · Java · Spring Boot · Microservices · React · Angular · GenAI · Agents · Evergreen*
*Built for Hruday D · March 2026*