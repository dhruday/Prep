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

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) |
| Deep Dive / Advanced Article | [How JavaScript Works — Alexander Zlatkov (SessionStack)](https://blog.sessionstack.com/how-does-javascript-actually-work-part-1-b0bacc073cf) |
| Interview-Focused Article | [GreatFrontEnd — JavaScript Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/javascript) |
| Video Explanation | [Namaste JS Ep.1 — Execution Context — Akshay Saini](https://www.youtube.com/watch?v=ZvbzSrg0afE) |

2. Event Loop (Microtasks vs Macrotasks)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) |
| Deep Dive / Advanced Article | [JavaScript Visualized: Event Loop — Lydia Hallie](https://dev.to/lydiahallie/javascript-visualized-event-loop-3dif) |
| Interview-Focused Article | [GreatFrontEnd — Event Loop Quiz](https://www.greatfrontend.com/questions/quiz/what-is-event-loop-what-is-the-difference-between-call-stack-and-task-queue) |
| Video Explanation | [What the heck is the event loop anyway? — Philip Roberts (JSConf)](https://www.youtube.com/watch?v=cCOL7MC4Pl0) |

3. Main Thread vs Worker Threads

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) |
| Deep Dive / Advanced Article | [web.dev — Workers Overview](https://web.dev/articles/workers-overview) |
| Interview-Focused Article | [GreatFrontEnd — JavaScript Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/javascript) |
| Video Explanation | [Web Workers in 100 Seconds — Fireship](https://www.youtube.com/watch?v=Gcp7UkUlvhc) |

4. Call Stack, Task Queue, Microtask Queue — How They Interact ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Concurrency Model and Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) |
| Deep Dive / Advanced Article | [JavaScript Visualized: Event Loop — Lydia Hallie](https://dev.to/lydiahallie/javascript-visualized-event-loop-3dif) |
| Interview-Focused Article | [GreatFrontEnd — Event Loop Quiz](https://www.greatfrontend.com/questions/quiz/what-is-event-loop-what-is-the-difference-between-call-stack-and-task-queue) |
| Video Explanation | [Namaste JS Ep.2 — How JS Code Executes — Akshay Saini](https://www.youtube.com/watch?v=iLWTnMzWtj4) |


### 🧠 Module 1.2: Language Internals
5. Closures — Scope Chain, Lexical Environment

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) |
| Deep Dive / Advanced Article | [javascript.info — Closures](https://javascript.info/closure) |
| Interview-Focused Article | [GreatFrontEnd — Closures Quiz](https://www.greatfrontend.com/questions/quiz/what-is-a-closure-and-how-why-would-you-use-one) |
| Video Explanation | [Namaste JS — Closures — Akshay Saini](https://www.youtube.com/watch?v=qikxEIxsXco) |

6. Prototypal Inheritance — Prototype Chain, Object.create

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Inheritance and the Prototype Chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) |
| Deep Dive / Advanced Article | [javascript.info — Prototypal Inheritance](https://javascript.info/prototype-inheritance) |
| Interview-Focused Article | [GreatFrontEnd — Prototypal Inheritance](https://www.greatfrontend.com/questions/quiz/explain-how-prototypal-inheritance-works) |
| Video Explanation | [Namaste JS — Prototype & Prototypal Inheritance — Akshay Saini](https://www.youtube.com/watch?v=wstwjQ1yqWQ) |

7. this Keyword — All 4 Contexts, call/apply/bind

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this) |
| Deep Dive / Advanced Article | [javascript.info — Object Methods, this](https://javascript.info/object-methods) |
| Interview-Focused Article | [GreatFrontEnd — Explain this in JavaScript](https://www.greatfrontend.com/questions/quiz/explain-how-this-works-in-javascript) |
| Video Explanation | [Namaste JS — this Keyword — Akshay Saini](https://www.youtube.com/watch?v=rv7Q11KWmKU) |

8. Hoisting — var vs let vs const vs function declarations

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Hoisting](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting) |
| Deep Dive / Advanced Article | [javascript.info — The old var](https://javascript.info/var) |
| Interview-Focused Article | [GreatFrontEnd — Explain Hoisting](https://www.greatfrontend.com/questions/quiz/explain-hoisting) |
| Video Explanation | [Namaste JS — Hoisting — Akshay Saini](https://www.youtube.com/watch?v=Fnlnw8uY6jo) |

9. Garbage Collection & Memory Leaks in JS ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management) |
| Deep Dive / Advanced Article | [javascript.info — Garbage Collection](https://javascript.info/garbage-collection) |
| Interview-Focused Article | [Blog — 4 Types of Memory Leaks in JavaScript — Auth0](https://auth0.com/blog/four-types-of-leaks-in-your-javascript-code-and-how-to-get-rid-of-them/) |
| Video Explanation | [Memory Leaks Demystified — Google Chrome Developers](https://www.youtube.com/watch?v=YDU_3WdfkxA) |


### 🔄 Module 1.3: Async JavaScript
10. Promises Internals — Microtask Queue, .then Chaining

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) |
| Deep Dive / Advanced Article | [javascript.info — Promises, async/await](https://javascript.info/async) |
| Interview-Focused Article | [GreatFrontEnd — Promises Quiz](https://www.greatfrontend.com/questions/quiz/explain-the-difference-between-synchronous-and-asynchronous-functions) |
| Video Explanation | [Namaste JS S2 — Promises — Akshay Saini](https://www.youtube.com/watch?v=ap-6PPAuK1Y) |

11. async/await — How It Compiles Down to Promises

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) |
| Deep Dive / Advanced Article | [javascript.info — Async/Await](https://javascript.info/async-await) |
| Interview-Focused Article | [GreatFrontEnd — Async/Await vs Promises](https://www.greatfrontend.com/questions/quiz/what-advantage-is-there-for-using-the-arrow-syntax-for-a-method-in-a-constructor) |
| Video Explanation | [Namaste JS S2 — async/await — Akshay Saini](https://www.youtube.com/watch?v=6nv3qy3oNkc) |

12. Promise.all / Promise.race / Promise.allSettled / Promise.any

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) |
| Deep Dive / Advanced Article | [javascript.info — Promise API](https://javascript.info/promise-api) |
| Interview-Focused Article | [GreatFrontEnd — JavaScript Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/javascript) |
| Video Explanation | [Namaste JS S2 — Promise APIs — Akshay Saini](https://www.youtube.com/watch?v=DlTVt1rZjIo) |

13. Generators and Iterators

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Iterators and Generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators) |
| Deep Dive / Advanced Article | [javascript.info — Generators](https://javascript.info/generators) |
| Interview-Focused Article | [GreatFrontEnd — JavaScript Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/javascript) |
| Video Explanation | [Generators in JavaScript — Fireship](https://www.youtube.com/watch?v=IJ6EgdiI_wU) |

14. AbortController & Request Cancellation ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) |
| Deep Dive / Advanced Article | [web.dev — Abortable Fetch](https://web.dev/articles/abortable-fetch) |
| Interview-Focused Article | [Blog — Cancel Fetch Requests with AbortController — LogRocket](https://blog.logrocket.com/cancel-fetch-requests-abortcontroller/) |
| Video Explanation | [AbortController Explained — Steve Griffith](https://www.youtube.com/watch?v=SaoE9AKnHO4) |


### 🛠️ Module 1.4: Frontend-Specific JS Implementations
15. Implement debounce (with leading/trailing options) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — setTimeout / Timing](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout) |
| Deep Dive / Advanced Article | [CSS-Tricks — Debouncing and Throttling Explained](https://css-tricks.com/debouncing-throttling-explained-examples/) |
| Interview-Focused Article | [GreatFrontEnd — Implement Debounce](https://www.greatfrontend.com/questions/javascript/debounce) |
| Video Explanation | [Debounce in JavaScript — Akshay Saini](https://www.youtube.com/watch?v=Zo-6_qx8uxg) |

16. Implement throttle ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — setTimeout / Timing](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout) |
| Deep Dive / Advanced Article | [CSS-Tricks — Debouncing and Throttling Explained](https://css-tricks.com/debouncing-throttling-explained-examples/) |
| Interview-Focused Article | [GreatFrontEnd — Implement Throttle](https://www.greatfrontend.com/questions/javascript/throttle) |
| Video Explanation | [Throttle in JavaScript — Akshay Saini](https://www.youtube.com/watch?v=81NGEXAaa3Y) |

17. Implement curry, memoize, once, pipe ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [javascript.info — Currying](https://javascript.info/currying-partials) |
| Deep Dive / Advanced Article | [Blog — Understanding Currying, Memoize, Pipe — LogRocket](https://blog.logrocket.com/understanding-javascript-currying/) |
| Interview-Focused Article | [GreatFrontEnd — Implement Curry](https://www.greatfrontend.com/questions/javascript/curry) |
| Video Explanation | [Currying in JavaScript — Akshay Saini](https://www.youtube.com/watch?v=vQcCNpuaJO8) |

18. Implement Deep Clone & Deep Equal ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone) |
| Deep Dive / Advanced Article | [javascript.info — Object Copying, References](https://javascript.info/object-copy) |
| Interview-Focused Article | [GreatFrontEnd — Implement Deep Clone](https://www.greatfrontend.com/questions/javascript/deep-clone) |
| Video Explanation | [Deep Clone in JavaScript — Akshay Saini](https://www.youtube.com/watch?v=4jb4AYEyhRc) |

19. Implement Promise.all / Promise.race from Scratch ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) |
| Deep Dive / Advanced Article | [javascript.info — Promise API](https://javascript.info/promise-api) |
| Interview-Focused Article | [GreatFrontEnd — Implement Promise.all](https://www.greatfrontend.com/questions/javascript/promise-all) |
| Video Explanation | [Implement Promise.all from Scratch — Chirag Goel](https://www.youtube.com/watch?v=DMmbs4TpkbA) |

20. Implement EventEmitter / Pub-Sub ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Node.js — Events API](https://nodejs.org/api/events.html) |
| Deep Dive / Advanced Article | [patterns.dev — Observer Pattern](https://www.patterns.dev/vanilla/observer-pattern) |
| Interview-Focused Article | [GreatFrontEnd — Implement EventEmitter](https://www.greatfrontend.com/questions/javascript/event-emitter) |
| Video Explanation | [Pub/Sub Pattern in JavaScript — Fireship](https://www.youtube.com/watch?v=aynSM8llOBs) |

21. Implement LRU Cache (Map + doubly linked list) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) |
| Deep Dive / Advanced Article | [LeetCode 146 — LRU Cache](https://leetcode.com/problems/lru-cache/) |
| Interview-Focused Article | [GreatFrontEnd — JavaScript Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/javascript) |
| Video Explanation | [LRU Cache — NeetCode](https://www.youtube.com/watch?v=7ABFKPK2hD4) |


---

## SEQUENCE 2️⃣ — Browser & Web Platform Internals
> How the browser works is tested at Adobe & Microsoft. Your Lighthouse story lives here.

### 🏗️ Module 2.1: Browser Architecture
22. How the Browser Works (High Level)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — How Browsers Work](https://web.dev/articles/howbrowserswork) |
| Deep Dive / Advanced Article | [Inside look at modern web browser — Google](https://developer.chrome.com/blog/inside-browser-part1) |
| Interview-Focused Article | [GreatFrontEnd — Browser Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/html) |
| Video Explanation | [How Browsers Work — Akshay Saini](https://www.youtube.com/watch?v=5rLFYtXHo9s) |

23. Browser Process Architecture — Renderer, GPU, Network processes ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Chrome — Multi-process Architecture](https://developer.chrome.com/blog/inside-browser-part1) |
| Deep Dive / Advanced Article | [Inside look at modern web browser (Part 2) — Google](https://developer.chrome.com/blog/inside-browser-part2) |
| Interview-Focused Article | [GreatFrontEnd — Browser Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/html) |
| Video Explanation | [Browser Internals — Google Chrome Developers](https://www.youtube.com/watch?v=PzzNuCk-e0Y) |

24. Critical Rendering Path (CRP)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Critical Rendering Path](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path) |
| Deep Dive / Advanced Article | [web.dev — Critical Rendering Path](https://web.dev/articles/critical-rendering-path) |
| Interview-Focused Article | [GreatFrontEnd — Browser Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/html) |
| Video Explanation | [Critical Rendering Path — Ilya Grigorik (Google)](https://www.youtube.com/watch?v=PkOBnYxqj3k) |

25. HTML Parsing, CSSOM, Render Tree

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — How Browsers Work: Parsing](https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work) |
| Deep Dive / Advanced Article | [web.dev — Constructing the Object Model](https://web.dev/articles/critical-rendering-path/constructing-the-object-model) |
| Interview-Focused Article | [GreatFrontEnd — HTML Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/html) |
| Video Explanation | [HTML Parsing Deep Dive — Google Chrome Developers](https://www.youtube.com/watch?v=Lsg84NtJbmI) |


### 🎨 Module 2.2: Rendering Pipeline
26. Reflows vs Repaints

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — CSS Reflows & Repaints](https://developer.mozilla.org/en-US/docs/Glossary/Reflow) |
| Deep Dive / Advanced Article | [web.dev — Avoid Large, Complex Layouts and Layout Thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing) |
| Interview-Focused Article | [Blog — What forces layout/reflow — Paul Irish (GitHub)](https://gist.github.com/paulirish/5d52fb081b3570c81e3a) |
| Video Explanation | [Reflow & Repaint — Google Chrome Developers](https://www.youtube.com/watch?v=0fOSaICXkJY) |

27. GPU vs CPU Rendering

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Compositing and Painting](https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work#compositing) |
| Deep Dive / Advanced Article | [web.dev — Stick to Compositor-Only Properties](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count) |
| Interview-Focused Article | [Blog — GPU Accelerated Compositing in Chrome — Google](https://developer.chrome.com/blog/gpu-accelerated-compositing-in-chrome) |
| Video Explanation | [GPU vs CPU Rendering — Fireship](https://www.youtube.com/watch?v=nmXMgqjQzls) |

28. Compositing Layers & will-change ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change) |
| Deep Dive / Advanced Article | [web.dev — Manage Layer Count](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count) |
| Interview-Focused Article | [Blog — CSS Triggers — CSSTriggers.com](https://csstriggers.com/) |
| Video Explanation | [CSS will-change & Layers — Jake Archibald (Google)](https://www.youtube.com/watch?v=thNyy5VZfbg) |

29. Browser Resource Prioritization

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Fetch Priority API](https://web.dev/articles/fetch-priority) |
| Deep Dive / Advanced Article | [Chrome — Resource Fetch Prioritization](https://developer.chrome.com/docs/devtools/network/reference#priority) |
| Interview-Focused Article | [Blog — Browser Resource Loading Priorities — Pat Meenan](https://www.smashingmagazine.com/2021/01/front-end-performance-2021-free-pdf-checklist/) |
| Video Explanation | [Resource Priorities — Google Chrome Developers](https://www.youtube.com/watch?v=SrU03vP0vMc) |

30. Avoiding Layout Thrashing ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Avoid Layout Thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing) |
| Deep Dive / Advanced Article | [CSS Triggers — What causes reflow/repaint](https://csstriggers.com/) |
| Interview-Focused Article | [Gist — What forces layout/reflow — Paul Irish](https://gist.github.com/paulirish/5d52fb081b3570c81e3a) |
| Video Explanation | [Avoiding Layout Thrashing — Jake Archibald](https://www.youtube.com/watch?v=SmE4OwHztCc) |


### 💾 Module 2.3: Memory & Storage
31. Memory Management in Browser

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management) |
| Deep Dive / Advanced Article | [Chrome — Fix Memory Problems](https://developer.chrome.com/docs/devtools/memory-problems) |
| Interview-Focused Article | [Blog — Browser Memory Management — LogRocket](https://blog.logrocket.com/understanding-memory-leaks-javascript/) |
| Video Explanation | [Chrome DevTools Memory Tab — Google Chrome Developers](https://www.youtube.com/watch?v=YjMFjXiWsps) |

32. Browser Storage Options Overview

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) |
| Deep Dive / Advanced Article | [web.dev — Storage for the Web](https://web.dev/articles/storage-for-the-web) |
| Interview-Focused Article | [GreatFrontEnd — Browser Storage Interview](https://www.greatfrontend.com/front-end-interview-guidebook/html) |
| Video Explanation | [Browser Storage Crash Course — Traversy Media](https://www.youtube.com/watch?v=GihQAC1I39Q) |

33. Storage Quotas & Eviction Policies ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Storage Quotas and Eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) |
| Deep Dive / Advanced Article | [web.dev — Storage for the Web](https://web.dev/articles/storage-for-the-web) |
| Interview-Focused Article | [Blog — Understanding Storage Limits — Chrome Developers](https://developer.chrome.com/docs/apps/offline_storage) |
| Video Explanation | [Storage API — Google Chrome Developers](https://www.youtube.com/watch?v=NNuTV-gjlZQ) |

34. Origin Private File System (OPFS) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) |
| Deep Dive / Advanced Article | [web.dev — Origin Private File System](https://web.dev/articles/origin-private-file-system) |
| Interview-Focused Article | [Blog — OPFS Deep Dive — Chrome Developers](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) |
| Video Explanation | [File System Access API — Google Chrome Developers](https://www.youtube.com/watch?v=GNuG-5m4Ud0) |


### 🌐 Module 2.4: Network Layer
35. Network Stack Basics

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — HTTP Overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview) |
| Deep Dive / Advanced Article | [web.dev — Network Reliability](https://web.dev/articles/reliable) |
| Interview-Focused Article | [GreatFrontEnd — Network Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/network) |
| Video Explanation | [HTTP Crash Course — Traversy Media](https://www.youtube.com/watch?v=iYM2zFP3Zn0) |

36. HTTP/1.1 vs HTTP/2 vs HTTP/3

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — HTTP/2](https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2) |
| Deep Dive / Advanced Article | [web.dev — Introduction to HTTP/2](https://web.dev/articles/performance-http2) |
| Interview-Focused Article | [Blog — HTTP/1.1 vs HTTP/2 vs HTTP/3 — Cloudflare](https://www.cloudflare.com/learning/performance/http2-vs-http1.1/) |
| Video Explanation | [HTTP/1 to HTTP/3 Evolution — Hussein Nasser](https://www.youtube.com/watch?v=a-sBfyiXysI) |

37. Connection Reuse & Head-of-Line Blocking

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Connection Management in HTTP/1.x](https://developer.mozilla.org/en-US/docs/Web/HTTP/Connection_management_in_HTTP_1.x) |
| Deep Dive / Advanced Article | [Blog — Head-of-Line Blocking — Cloudflare](https://www.cloudflare.com/learning/performance/what-is-http3/) |
| Interview-Focused Article | [GreatFrontEnd — Network Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/network) |
| Video Explanation | [HTTP Head-of-Line Blocking Explained — Hussein Nasser](https://www.youtube.com/watch?v=GriONb4EfPY) |

38. DNS Prefetch, Preconnect, Early Hints (103) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Preconnect to Required Origins](https://web.dev/articles/preconnect-and-dns-prefetch) |
| Deep Dive / Advanced Article | [MDN — Resource Hints](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preconnect) |
| Interview-Focused Article | [Blog — Early Hints HTTP 103 — Cloudflare](https://www.cloudflare.com/learning/performance/what-is-early-hints/) |
| Video Explanation | [Resource Hints — Google Chrome Developers](https://www.youtube.com/watch?v=YJGCZCaIZkQ) |

39. QUIC Protocol Basics ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Cloudflare — What is QUIC?](https://www.cloudflare.com/learning/performance/what-is-http3/) |
| Deep Dive / Advanced Article | [Blog — QUIC Protocol Deep Dive — Cloudflare](https://blog.cloudflare.com/the-road-to-quic/) |
| Interview-Focused Article | [GreatFrontEnd — Network Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/network) |
| Video Explanation | [QUIC & HTTP/3 Explained — Hussein Nasser](https://www.youtube.com/watch?v=idViw4anA6E) |


### 🕸️ Module 2.5: Worker Threads
40. Web Workers — Use Cases, Limitations, Communication

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) |
| Deep Dive / Advanced Article | [web.dev — Use Web Workers](https://web.dev/articles/workers-overview) |
| Interview-Focused Article | [GreatFrontEnd — JavaScript Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/javascript) |
| Video Explanation | [Web Workers Explained — Fireship](https://www.youtube.com/watch?v=Gcp7UkUlvhc) |

41. Service Workers — Lifecycle, Fetch Interception, Push

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) |
| Deep Dive / Advanced Article | [web.dev — Service Workers: An Introduction](https://web.dev/articles/service-workers-lifecycle) |
| Interview-Focused Article | [Blog — Service Worker Lifecycle — Google](https://developer.chrome.com/docs/workbox/service-worker-lifecycle) |
| Video Explanation | [Service Workers Crash Course — Traversy Media](https://www.youtube.com/watch?v=ksXwaWHCW6k) |

42. Worklets — Audio, Paint, Layout Worklets

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Worklets](https://developer.mozilla.org/en-US/docs/Web/API/Worklet) |
| Deep Dive / Advanced Article | [web.dev — Animation Worklet](https://web.dev/articles/houdini-how) |
| Interview-Focused Article | [Blog — Houdini: CSS Paint API — Google](https://developer.chrome.com/blog/css-paint-api) |
| Video Explanation | [CSS Houdini Worklets — Google Chrome Developers](https://www.youtube.com/watch?v=GhRE3rML9t4) |


---

## SEQUENCE 3️⃣ — TypeScript Deep Dive ★
> Microsoft, Cisco, Adobe all test this. Do it early — you will use TypeScript in every code example after this.

### 📘 Module 3.1: TypeScript Fundamentals
43. Types vs Interfaces — When to Use Which ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript Handbook — Types vs Interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) |
| Deep Dive / Advanced Article | [Total TypeScript — Type vs Interface](https://www.totaltypescript.com/type-vs-interface-which-should-you-use) |
| Interview-Focused Article | [Blog — Types vs Interfaces in TS — Matt Pocock](https://www.totaltypescript.com/type-vs-interface-which-should-you-use) |
| Video Explanation | [Type vs Interface — Matt Pocock](https://www.youtube.com/watch?v=zM9UPcIyyhQ) |

44. Union & Intersection Types ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript Handbook — Union Types](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) |
| Deep Dive / Advanced Article | [TypeScript Handbook — Intersection Types](https://www.typescriptlang.org/docs/handbook/2/objects.html#intersection-types) |
| Interview-Focused Article | [Total TypeScript — Union & Intersection Guide](https://www.totaltypescript.com/books/total-typescript-essentials/unions-and-narrowing) |
| Video Explanation | [Union Types Explained — Matt Pocock](https://www.youtube.com/watch?v=9i38FPugxB8) |

45. Generics — Functions, Classes, Constraints ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript Handbook — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) |
| Deep Dive / Advanced Article | [Total TypeScript — Generics Tutorial](https://www.totaltypescript.com/tutorials/beginners-typescript) |
| Interview-Focused Article | [Blog — TypeScript Generics Explained — LogRocket](https://blog.logrocket.com/using-typescript-generics/) |
| Video Explanation | [TypeScript Generics — Fireship](https://www.youtube.com/watch?v=nViEqpgwxHE) |

46. Enums vs Const Assertions vs Union Types ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript Handbook — Enums](https://www.typescriptlang.org/docs/handbook/enums.html) |
| Deep Dive / Advanced Article | [Total TypeScript — Enums Considered Harmful](https://www.totaltypescript.com/concepts/enums) |
| Interview-Focused Article | [Blog — Const Assertions in TypeScript — Matt Pocock](https://www.totaltypescript.com/concepts/const-assertion) |
| Video Explanation | [Enums vs Const — Matt Pocock](https://www.youtube.com/watch?v=jjMbPt_H3RQ) |


### ⚙️ Module 3.2: Advanced Types
47. Conditional Types — infer keyword ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript Handbook — Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) |
| Deep Dive / Advanced Article | [Total TypeScript — Conditional Types](https://www.totaltypescript.com/books/total-typescript-essentials/conditional-types-and-infer) |
| Interview-Focused Article | [Blog — Understanding infer in TypeScript — LogRocket](https://blog.logrocket.com/understanding-infer-typescript/) |
| Video Explanation | [Conditional Types — Matt Pocock](https://www.youtube.com/watch?v=SbVgPQDealg) |

48. Mapped Types — keyof, in, as ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript Handbook — Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) |
| Deep Dive / Advanced Article | [Total TypeScript — Mapped Types Guide](https://www.totaltypescript.com/books/total-typescript-essentials/mapped-types) |
| Interview-Focused Article | [Blog — Mapped Types Deep Dive — LogRocket](https://blog.logrocket.com/typescript-mapped-types/) |
| Video Explanation | [Mapped Types — Matt Pocock](https://www.youtube.com/watch?v=TtDP6lpSjWc) |

49. Template Literal Types ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript Handbook — Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) |
| Deep Dive / Advanced Article | [Total TypeScript — Template Literals](https://www.totaltypescript.com/concepts/template-literal-types) |
| Interview-Focused Article | [Blog — Template Literal Types — LogRocket](https://blog.logrocket.com/template-literal-types-typescript/) |
| Video Explanation | [Template Literal Types — Matt Pocock](https://www.youtube.com/watch?v=tMaJJMBIEBM) |

50. Discriminated Unions ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript Handbook — Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) |
| Deep Dive / Advanced Article | [Total TypeScript — Discriminated Union](https://www.totaltypescript.com/concepts/discriminated-union) |
| Interview-Focused Article | [Blog — Discriminated Unions in TypeScript — LogRocket](https://blog.logrocket.com/understanding-discriminated-union-intersection-types-typescript/) |
| Video Explanation | [Discriminated Unions — Matt Pocock](https://www.youtube.com/watch?v=4uVzb8AkpGU) |

51. Utility Types — Partial, Required, Pick, Omit, Record, ReturnType, Parameters ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript Handbook — Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) |
| Deep Dive / Advanced Article | [Total TypeScript — Utility Types Guide](https://www.totaltypescript.com/books/total-typescript-essentials/utility-types) |
| Interview-Focused Article | [Blog — TypeScript Utility Types Cheatsheet — Dev.to](https://dev.to/arafat4693/typescript-utility-types-cheat-sheet-1c2g) |
| Video Explanation | [All TypeScript Utility Types — Fireship](https://www.youtube.com/watch?v=EU0wg_VjQLg) |


### ⚛️ Module 3.3: TypeScript with React
52. Typing Props, Children, Events, Refs ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — TypeScript with React](https://react.dev/learn/typescript) |
| Deep Dive / Advanced Article | [Total TypeScript — React with TypeScript](https://www.totaltypescript.com/tutorials/react-with-typescript) |
| Interview-Focused Article | [Blog — React TypeScript Cheatsheet — GitHub](https://github.com/typescript-cheatsheets/react) |
| Video Explanation | [React + TypeScript — Jack Herrington](https://www.youtube.com/watch?v=TPACABQTHvM) |

53. Typing Custom Hooks ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) |
| Deep Dive / Advanced Article | [Total TypeScript — React with TypeScript](https://www.totaltypescript.com/tutorials/react-with-typescript) |
| Interview-Focused Article | [GitHub — React TypeScript Cheatsheet: Hooks](https://github.com/typescript-cheatsheets/react#hooks) |
| Video Explanation | [Typing Custom Hooks — Jack Herrington](https://www.youtube.com/watch?v=05eTaw0gfSM) |

54. Typing Context with Generic Providers ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useContext](https://react.dev/reference/react/useContext) |
| Deep Dive / Advanced Article | [Total TypeScript — React with TypeScript](https://www.totaltypescript.com/tutorials/react-with-typescript) |
| Interview-Focused Article | [GitHub — React TypeScript Cheatsheet: Context](https://github.com/typescript-cheatsheets/react#context) |
| Video Explanation | [Generic Context Providers — Jack Herrington](https://www.youtube.com/watch?v=hzOqSzpp-Tc) |

55. Typing HOCs and Render Props ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — HOC Patterns](https://react.dev/reference/react/forwardRef) |
| Deep Dive / Advanced Article | [Total TypeScript — React with TypeScript](https://www.totaltypescript.com/tutorials/react-with-typescript) |
| Interview-Focused Article | [GitHub — React TypeScript Cheatsheet: HOC](https://github.com/typescript-cheatsheets/react#hoc-cheatsheet) |
| Video Explanation | [HOCs with TypeScript — Jack Herrington](https://www.youtube.com/watch?v=9RSGVjmjgRE) |


### 🔧 Module 3.4: Compiler & Config
56. tsconfig Deep Dive — strict, paths, moduleResolution ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript — TSConfig Reference](https://www.typescriptlang.org/tsconfig) |
| Deep Dive / Advanced Article | [Total TypeScript — TSConfig Cheatsheet](https://www.totaltypescript.com/tsconfig-cheat-sheet) |
| Interview-Focused Article | [Blog — tsconfig.json Explained — Matt Pocock](https://www.totaltypescript.com/tsconfig-cheat-sheet) |
| Video Explanation | [tsconfig Deep Dive — Matt Pocock](https://www.youtube.com/watch?v=mHIYvrGEBDM) |

57. Declaration Files (.d.ts) — Writing & Consuming ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TypeScript — Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html) |
| Deep Dive / Advanced Article | [Total TypeScript — .d.ts Files](https://www.totaltypescript.com/concepts/type-declarations) |
| Interview-Focused Article | [Blog — Writing Declaration Files — LogRocket](https://blog.logrocket.com/writing-declaration-files-typescript/) |
| Video Explanation | [d.ts Files Explained — Matt Pocock](https://www.youtube.com/watch?v=zu-EgnbmcLY) |

58. TypeScript with Vite vs Webpack ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Vite — TypeScript Support](https://vitejs.dev/guide/features.html#typescript) |
| Deep Dive / Advanced Article | [Blog — TypeScript in Vite vs Webpack — LogRocket](https://blog.logrocket.com/vite-adoption-guide/) |
| Interview-Focused Article | [Blog — Migrating to Vite from Webpack — Dev.to](https://dev.to/nickytonline/migrating-from-webpack-to-vite-1j7l) |
| Video Explanation | [Vite in 100 Seconds — Fireship](https://www.youtube.com/watch?v=KCrXgy8qtjM) |


---
---

# ⚛️ PHASE 2 — FRAMEWORK DEEP DIVES
> Weeks 3–5 | Go deep on your two frameworks. Angular first (your strength), then React (your growth area).

---

## SEQUENCE 4️⃣ — Angular & RxJS Deep Dive ★
> Your core strength. Cisco is Angular-heavy. Formalise everything you already know into interview-ready answers.

### 🏗️ Module 4.1: Angular Architecture
59. NgModules vs Standalone Components (Angular 14+) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Standalone Components](https://angular.dev/guide/components) |
| Deep Dive / Advanced Article | [Angular Blog — Standalone Components](https://blog.angular.io/standalone-components-in-angular-d0d54a0bb82f) |
| Interview-Focused Article | [Blog — NgModules vs Standalone — Netanel Basal](https://netbasal.com/getting-to-know-the-angular-standalone-components-53f4e10d0e47) |
| Video Explanation | [Angular Standalone Components — Joshua Morony](https://www.youtube.com/watch?v=x5PZwb4XurU) |

60. Dependency Injection — Hierarchical Injectors, Tokens ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Dependency Injection](https://angular.dev/guide/di) |
| Deep Dive / Advanced Article | [Angular Blog — Hierarchical Injectors](https://angular.dev/guide/di/hierarchical-dependency-injection) |
| Interview-Focused Article | [Blog — Angular DI in Depth — Netanel Basal](https://netbasal.com/exploring-angular-dependency-injection-4c0e97b9bba3) |
| Video Explanation | [Angular DI Explained — Decoded Frontend](https://www.youtube.com/watch?v=G6ByZ_bGPxc) |

61. Component Lifecycle Hooks — All 8 Hooks & When to Use ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Component Lifecycle](https://angular.dev/guide/components/lifecycle) |
| Deep Dive / Advanced Article | [Blog — Angular Lifecycle Hooks — LogRocket](https://blog.logrocket.com/angular-lifecycle-hooks/) |
| Interview-Focused Article | [Blog — Angular Lifecycle Hooks Interview Guide — Medium](https://medium.com/@patel.devan04/angular-lifecycle-hooks-interview-questions-56c5703a4c84) |
| Video Explanation | [Angular Lifecycle Hooks — Codevolution](https://www.youtube.com/watch?v=2l66D69G2sY) |

62. Angular Router — Lazy Loading, Guards, Resolvers ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Router Guide](https://angular.dev/guide/routing) |
| Deep Dive / Advanced Article | [Angular — Lazy Loading Modules](https://angular.dev/guide/ngmodules/lazy-loading) |
| Interview-Focused Article | [Blog — Angular Routing Interview Questions — Medium](https://medium.com/@patel.devan04/angular-routing-interview-questions-4f9a1b4a3e09) |
| Video Explanation | [Angular Router — Joshua Morony](https://www.youtube.com/watch?v=Np3ULAMqwNo) |


### 🔄 Module 4.2: Change Detection
63. Default vs OnPush Change Detection ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Change Detection](https://angular.dev/guide/components/advanced-configuration#changedetectionstrategy) |
| Deep Dive / Advanced Article | [Blog — Angular Change Detection Explained — Netanel Basal](https://netbasal.com/a-comprehensive-guide-to-angular-onpush-change-detection-strategy-e3e7b0df9a70) |
| Interview-Focused Article | [Blog — Change Detection Interview Questions — Medium](https://medium.com/@patel.devan04/angular-change-detection-interview-questions-5a39cdea0c3e) |
| Video Explanation | [Angular Change Detection — Decoded Frontend](https://www.youtube.com/watch?v=AWxLOidx-vE) |

64. zone.js — How It Intercepts Async Operations ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — zone.js](https://angular.dev/guide/zonejs) |
| Deep Dive / Advanced Article | [Blog — Understanding Zone.js — Thoughtram](https://blog.thoughtram.io/angular/2016/02/01/zones-in-angular-2.html) |
| Interview-Focused Article | [Blog — Zone.js Interview Guide — Medium](https://medium.com/@patel.devan04/zone-js-in-angular-interview-questions-4c4b35fd093f) |
| Video Explanation | [Zone.js Explained — Decoded Frontend](https://www.youtube.com/watch?v=3IqtmUscE_U) |

65. Zoneless Angular — Signal-Based Reactivity ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Signals](https://angular.dev/guide/signals) |
| Deep Dive / Advanced Article | [Blog — Zoneless Angular — Angular Blog](https://blog.angular.io/angular-v18-is-now-available-e79d5ac0affe) |
| Interview-Focused Article | [Blog — Signals vs Zone.js — Netanel Basal](https://netbasal.com/angular-signals-everything-you-need-to-know-b4a2a0a6a3c4) |
| Video Explanation | [Zoneless Angular — Joshua Morony](https://www.youtube.com/watch?v=aKEsFUmgfqY) |

66. Manual Change Detection — markForCheck vs detectChanges ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — ChangeDetectorRef](https://angular.dev/api/core/ChangeDetectorRef) |
| Deep Dive / Advanced Article | [Blog — markForCheck vs detectChanges — Netanel Basal](https://netbasal.com/angular-the-difference-between-markforcheck-and-detectchanges-50b7fcff4fc3) |
| Interview-Focused Article | [Blog — Manual CD Interview Questions — Medium](https://medium.com/@patel.devan04/angular-change-detection-interview-questions-5a39cdea0c3e) |
| Video Explanation | [detectChanges vs markForCheck — Decoded Frontend](https://www.youtube.com/watch?v=aNHK_KXCuIA) |


### 🌊 Module 4.3: RxJS Mastery
67. Cold vs Hot Observables ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [RxJS — Observable](https://rxjs.dev/guide/observable) |
| Deep Dive / Advanced Article | [Blog — Hot vs Cold Observables — Ben Lesh](https://benlesh.medium.com/hot-vs-cold-observables-f8094ed53339) |
| Interview-Focused Article | [Blog — RxJS Interview Questions — Medium](https://medium.com/@nicholasgill30/rxjs-interview-questions-and-answers-6a1a2f2e9e7c) |
| Video Explanation | [Hot vs Cold Observables — Decoded Frontend](https://www.youtube.com/watch?v=c6bkMfEdBDk) |

68. Subject, BehaviorSubject, ReplaySubject, AsyncSubject ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [RxJS — Subjects](https://rxjs.dev/guide/subject) |
| Deep Dive / Advanced Article | [Blog — Understanding RxJS Subjects — LogRocket](https://blog.logrocket.com/understanding-rxjs-subjects/) |
| Interview-Focused Article | [Blog — RxJS Subjects Interview Guide — Medium](https://medium.com/@nicholasgill30/rxjs-interview-questions-and-answers-6a1a2f2e9e7c) |
| Video Explanation | [RxJS Subjects Explained — Joshua Morony](https://www.youtube.com/watch?v=_henNArnVOo) |

69. switchMap vs mergeMap vs concatMap vs exhaustMap — With Real Examples ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [RxJS — switchMap](https://rxjs.dev/api/operators/switchMap) |
| Deep Dive / Advanced Article | [Blog — switchMap vs mergeMap vs concatMap — LogRocket](https://blog.logrocket.com/understanding-rxjs-map-operators/) |
| Interview-Focused Article | [Blog — RxJS Operators Interview Guide — Medium](https://medium.com/@nicholasgill30/rxjs-interview-questions-and-answers-6a1a2f2e9e7c) |
| Video Explanation | [switchMap vs mergeMap — Decoded Frontend](https://www.youtube.com/watch?v=6lKoLwGlglE) |

70. combineLatest, forkJoin, zip, withLatestFrom ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [RxJS — combineLatest](https://rxjs.dev/api/index/function/combineLatest) |
| Deep Dive / Advanced Article | [Blog — RxJS Combination Operators — LogRocket](https://blog.logrocket.com/understanding-rxjs-map-operators/) |
| Interview-Focused Article | [Blog — RxJS Combination Operators Interview — Medium](https://medium.com/@nicholasgill30/rxjs-interview-questions-and-answers-6a1a2f2e9e7c) |
| Video Explanation | [combineLatest vs forkJoin — Decoded Frontend](https://www.youtube.com/watch?v=PRQO_KK6Uxo) |

71. takeUntil Pattern for Memory Leak Prevention ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [RxJS — takeUntil](https://rxjs.dev/api/operators/takeUntil) |
| Deep Dive / Advanced Article | [Blog — takeUntil Pattern — Netanel Basal](https://netbasal.com/when-to-unsubscribe-in-angular-d61c6983ae56) |
| Interview-Focused Article | [Blog — Unsubscribe Patterns Interview — Medium](https://medium.com/@nicholasgill30/rxjs-interview-questions-and-answers-6a1a2f2e9e7c) |
| Video Explanation | [Unsubscribe Patterns in Angular — Joshua Morony](https://www.youtube.com/watch?v=2G_mWfG0DZE) |

72. Custom RxJS Operators ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [RxJS — Creating Custom Operators](https://rxjs.dev/guide/operators#creating-custom-operators) |
| Deep Dive / Advanced Article | [Blog — Build Your Own RxJS Operator — Netanel Basal](https://netbasal.com/creating-custom-operators-in-rxjs-32f052d69457) |
| Interview-Focused Article | [Blog — Advanced RxJS Patterns — Medium](https://medium.com/@nicholasgill30/rxjs-interview-questions-and-answers-6a1a2f2e9e7c) |
| Video Explanation | [Custom RxJS Operators — Decoded Frontend](https://www.youtube.com/watch?v=CoYo7-gG0L0) |


### 📦 Module 4.4: State Management in Angular
73. NgRx — Store, Actions, Reducers, Effects, Selectors ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [NgRx — Getting Started](https://ngrx.io/guide/store) |
| Deep Dive / Advanced Article | [Blog — NgRx Complete Guide — Angular University](https://blog.angular-university.io/angular-ngrx-store-effects-srp/) |
| Interview-Focused Article | [Blog — NgRx Interview Questions — Medium](https://medium.com/@nicholasgill30/ngrx-interview-questions-and-answers-6a1a2f2e9e7c) |
| Video Explanation | [NgRx Crash Course — Decoded Frontend](https://www.youtube.com/watch?v=9P0lmXOBHRk) |

74. NgRx Entity Adapter ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [NgRx — Entity Adapter](https://ngrx.io/guide/entity) |
| Deep Dive / Advanced Article | [Blog — NgRx Entity Guide — Angular University](https://blog.angular-university.io/ngrx-entity/) |
| Interview-Focused Article | [Blog — NgRx Entity Interview Questions — Medium](https://medium.com/@nicholasgill30/ngrx-interview-questions-and-answers-6a1a2f2e9e7c) |
| Video Explanation | [NgRx Entity Adapter — Decoded Frontend](https://www.youtube.com/watch?v=GKUxDiC0oK4) |

75. Angular Signals (v17+) — signal(), computed(), effect() ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Signals Guide](https://angular.dev/guide/signals) |
| Deep Dive / Advanced Article | [Blog — Angular Signals in Depth — Netanel Basal](https://netbasal.com/angular-signals-everything-you-need-to-know-b4a2a0a6a3c4) |
| Interview-Focused Article | [Blog — Signals vs RxJS Interview — Medium](https://medium.com/@nicholasgill30/angular-signals-interview-questions-4e7d82f9bc09) |
| Video Explanation | [Angular Signals — Joshua Morony](https://www.youtube.com/watch?v=oqYQG7QMdzw) |

76. Akita vs NgRx vs Signal Store Trade-offs ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [NgRx — SignalStore](https://ngrx.io/guide/signals) |
| Deep Dive / Advanced Article | [Blog — NgRx Signal Store — Netanel Basal](https://netbasal.com/the-new-ngrx-signal-store-everything-you-need-to-know-c5a7e7f7a3eb) |
| Interview-Focused Article | [Blog — State Management Comparison — Medium](https://medium.com/@nicholasgill30/ngrx-interview-questions-and-answers-6a1a2f2e9e7c) |
| Video Explanation | [NgRx Signal Store — Joshua Morony](https://www.youtube.com/watch?v=mWBw90b0bto) |


### ⚡ Module 4.5: Angular Performance
77. OnPush + trackBy — Avoiding Unnecessary Checks ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — OnPush Strategy](https://angular.dev/guide/components/advanced-configuration#changedetectionstrategy) |
| Deep Dive / Advanced Article | [Blog — OnPush + trackBy — Netanel Basal](https://netbasal.com/a-comprehensive-guide-to-angular-onpush-change-detection-strategy-e3e7b0df9a70) |
| Interview-Focused Article | [Blog — Angular Performance Interview — Medium](https://medium.com/@nicholasgill30/angular-performance-interview-questions-8b7d82f9bc09) |
| Video Explanation | [OnPush & trackBy — Decoded Frontend](https://www.youtube.com/watch?v=AWxLOidx-vE) |

78. Pure Pipes vs Impure Pipes ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Pipes](https://angular.dev/guide/pipes) |
| Deep Dive / Advanced Article | [Blog — Pure vs Impure Pipes — Netanel Basal](https://netbasal.com/understanding-angular-pure-pipes-and-impure-pipes-3b1cdf6b1298) |
| Interview-Focused Article | [Blog — Angular Pipes Interview Questions — Medium](https://medium.com/@nicholasgill30/angular-pipes-interview-questions-8b7d82f9bc09) |
| Video Explanation | [Pure vs Impure Pipes — Decoded Frontend](https://www.youtube.com/watch?v=uEu-9KYxMpc) |

79. Lazy Loaded Modules + Route-Level Code Splitting ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Lazy Loading](https://angular.dev/guide/ngmodules/lazy-loading) |
| Deep Dive / Advanced Article | [Blog — Route-Level Code Splitting — Angular University](https://blog.angular-university.io/angular-router/) |
| Interview-Focused Article | [Blog — Lazy Loading Interview Questions — Medium](https://medium.com/@nicholasgill30/angular-lazy-loading-interview-questions-8b7d82f9bc09) |
| Video Explanation | [Angular Lazy Loading — Joshua Morony](https://www.youtube.com/watch?v=JjFBkZ4JJXE) |

80. Deferrable Views (@defer block, Angular 17+) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Deferrable Views](https://angular.dev/guide/defer) |
| Deep Dive / Advanced Article | [Blog — @defer in Angular 17 — Angular Blog](https://blog.angular.io/introducing-angular-v17-4d7c563dc51b) |
| Interview-Focused Article | [Blog — Angular 17 Interview Questions — Medium](https://medium.com/@nicholasgill30/angular-17-new-features-interview-questions-8b7d82f9bc09) |
| Video Explanation | [@defer Block — Joshua Morony](https://www.youtube.com/watch?v=V1sDBn7IRR0) |


---

## SEQUENCE 5️⃣ — React, Next.js & Redux Deep Dive ★
> Adobe & Microsoft test React internals deeply. Build real depth here.

### ⚛️ Module 5.1: React Internals
81. React Fiber Architecture — What It Is and Why It Was Built ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state) |
| Deep Dive / Advanced Article | [Blog — React Fiber Architecture — Andrew Clark (GitHub)](https://github.com/acdlite/react-fiber-architecture) |
| Interview-Focused Article | [Blog — React Fiber Interview Guide — LogRocket](https://blog.logrocket.com/deep-dive-react-fiber/) |
| Video Explanation | [React Fiber Explained — Akshay Saini](https://www.youtube.com/watch?v=dCExNmKQnvA) |

82. Reconciliation Algorithm — How React Diffs the Virtual DOM ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html) |
| Deep Dive / Advanced Article | [Blog — React Reconciliation Algorithm — LogRocket](https://blog.logrocket.com/virtual-dom-react/) |
| Interview-Focused Article | [Blog — React Virtual DOM Interview — GreatFrontEnd](https://www.greatfrontend.com/questions/quiz/what-is-virtual-dom) |
| Video Explanation | [React Reconciliation — Jack Herrington](https://www.youtube.com/watch?v=7YhdqIR2Yzo) |

83. React Scheduler — Priority Lanes, Task Scheduling ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React — GitHub Source — Scheduler](https://github.com/facebook/react/tree/main/packages/scheduler) |
| Deep Dive / Advanced Article | [Blog — Inside React Scheduler — Jser.dev](https://jser.dev/2024-03-16-how-react-scheduler-works/) |
| Interview-Focused Article | [Blog — React Concurrent Mode Interview — LogRocket](https://blog.logrocket.com/react-concurrent-mode/) |
| Video Explanation | [React Scheduler Internals — Jack Herrington](https://www.youtube.com/watch?v=ph2HjBkpPss) |

84. Concurrent Mode — What Changes Under the Hood ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Concurrent React](https://react.dev/blog/2022/03/29/react-v18#what-is-concurrent-react) |
| Deep Dive / Advanced Article | [Blog — Concurrent React Deep Dive — Dan Abramov](https://overreacted.io/) |
| Interview-Focused Article | [Blog — React 18 Concurrency — LogRocket](https://blog.logrocket.com/react-concurrent-mode/) |
| Video Explanation | [React 18 Concurrent Features — Jack Herrington](https://www.youtube.com/watch?v=N0DhCV_-Qbg) |

85. Commit Phase vs Render Phase — Side Effects Timing ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Render and Commit](https://react.dev/learn/render-and-commit) |
| Deep Dive / Advanced Article | [Blog — React Render Phase vs Commit Phase — Kent C. Dodds](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render) |
| Interview-Focused Article | [Blog — React Phases Interview — GreatFrontEnd](https://www.greatfrontend.com/questions/quiz/what-is-virtual-dom) |
| Video Explanation | [Render & Commit Phase — Jack Herrington](https://www.youtube.com/watch?v=i793Qm6kv3U) |

86. StrictMode — Why Double Invocation Happens ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Strict Mode](https://react.dev/reference/react/StrictMode) |
| Deep Dive / Advanced Article | [Blog — Why React StrictMode Renders Twice — LogRocket](https://blog.logrocket.com/understanding-react-strict-mode/) |
| Interview-Focused Article | [Blog — StrictMode Interview FAQ — GreatFrontEnd](https://www.greatfrontend.com/questions/quiz/what-is-virtual-dom) |
| Video Explanation | [React StrictMode Explained — Jack Herrington](https://www.youtube.com/watch?v=XUwzASyHr4Q) |


### 🪝 Module 5.2: Hooks Deep Dive
87. useState — Batching, Functional Updates, Lazy Initialisation ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useState](https://react.dev/reference/react/useState) |
| Deep Dive / Advanced Article | [Blog — useState Deep Dive — Kent C. Dodds](https://kentcdodds.com/blog/use-state-lazy-initialization-and-function-updates) |
| Interview-Focused Article | [GreatFrontEnd — React Hooks Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [useState in Depth — Codevolution](https://www.youtube.com/watch?v=lAW1Jmmr3sA) |

88. useEffect — Dependency Array Rules, Cleanup, Common Mistakes ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useEffect](https://react.dev/reference/react/useEffect) |
| Deep Dive / Advanced Article | [Blog — A Complete Guide to useEffect — Dan Abramov](https://overreacted.io/a-complete-guide-to-useeffect/) |
| Interview-Focused Article | [GreatFrontEnd — useEffect Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [useEffect Deep Dive — Jack Herrington](https://www.youtube.com/watch?v=MFj_S0Nof90) |

89. useRef — DOM Refs vs Mutable Values, forwardRef ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useRef](https://react.dev/reference/react/useRef) |
| Deep Dive / Advanced Article | [Blog — useRef Explained — LogRocket](https://blog.logrocket.com/useRef-react-hook/) |
| Interview-Focused Article | [GreatFrontEnd — useRef Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [useRef & forwardRef — Jack Herrington](https://www.youtube.com/watch?v=gwFfzIaKnAU) |

90. useMemo — When It Helps vs When It Hurts ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useMemo](https://react.dev/reference/react/useMemo) |
| Deep Dive / Advanced Article | [Blog — When to useMemo and useCallback — Kent C. Dodds](https://kentcdodds.com/blog/usememo-and-usecallback) |
| Interview-Focused Article | [GreatFrontEnd — useMemo Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [useMemo Explained — Jack Herrington](https://www.youtube.com/watch?v=vpE9I_eqHdM) |

91. useCallback — Referential Stability, Common Misuse ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useCallback](https://react.dev/reference/react/useCallback) |
| Deep Dive / Advanced Article | [Blog — When to useMemo and useCallback — Kent C. Dodds](https://kentcdodds.com/blog/usememo-and-usecallback) |
| Interview-Focused Article | [GreatFrontEnd — useCallback Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [useCallback Explained — Jack Herrington](https://www.youtube.com/watch?v=MxIPQZ64x0I) |

92. useReducer — When to Prefer Over useState ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useReducer](https://react.dev/reference/react/useReducer) |
| Deep Dive / Advanced Article | [Blog — useReducer vs useState — LogRocket](https://blog.logrocket.com/react-usereducer-hook-ultimate-guide/) |
| Interview-Focused Article | [GreatFrontEnd — useReducer Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [useReducer In Depth — Codevolution](https://www.youtube.com/watch?v=cVYp4u1m6iA) |

93. useContext — Performance Pitfalls, Context Splitting ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useContext](https://react.dev/reference/react/useContext) |
| Deep Dive / Advanced Article | [Blog — How to use React Context Effectively — Kent C. Dodds](https://kentcdodds.com/blog/how-to-use-react-context-effectively) |
| Interview-Focused Article | [GreatFrontEnd — useContext Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [React Context Pitfalls — Jack Herrington](https://www.youtube.com/watch?v=ZKlXqrcBx88) |

94. useTransition & useDeferredValue — Concurrent Features ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useTransition](https://react.dev/reference/react/useTransition) |
| Deep Dive / Advanced Article | [Blog — useTransition & useDeferredValue — LogRocket](https://blog.logrocket.com/react-usetransition-vs-usedeferredvalue/) |
| Interview-Focused Article | [GreatFrontEnd — Concurrent Features](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [useTransition — Jack Herrington](https://www.youtube.com/watch?v=lDukIAymutM) |

95. useId, useSyncExternalStore, useInsertionEffect ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useId](https://react.dev/reference/react/useId) |
| Deep Dive / Advanced Article | [Blog — New Hooks in React 18 — LogRocket](https://blog.logrocket.com/exploring-react-18-three-new-apis/) |
| Interview-Focused Article | [GreatFrontEnd — React 18 Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [React 18 New Hooks — Jack Herrington](https://www.youtube.com/watch?v=N0DhCV_-Qbg) |

96. Custom Hooks — Patterns, Composition, Testing ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) |
| Deep Dive / Advanced Article | [Blog — Custom Hooks Patterns — Kent C. Dodds](https://kentcdodds.com/blog/authentication-in-react-applications) |
| Interview-Focused Article | [GreatFrontEnd — Custom Hooks Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [Mastering Custom Hooks — Jack Herrington](https://www.youtube.com/watch?v=6ThXsUwLWvc) |


### ⚡ Module 5.3: React 18 & 19 Features
97. Automatic Batching in React 18 ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Blog — React v18 Automatic Batching](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching) |
| Deep Dive / Advanced Article | [Blog — Automatic Batching in React 18 — Dan Abramov](https://github.com/reactwg/react-18/discussions/21) |
| Interview-Focused Article | [Blog — React 18 Features Interview — LogRocket](https://blog.logrocket.com/react-18-new-features/) |
| Video Explanation | [React 18 Automatic Batching — Jack Herrington](https://www.youtube.com/watch?v=N0DhCV_-Qbg) |

98. Suspense for Data Fetching — How It Works Internally ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Suspense](https://react.dev/reference/react/Suspense) |
| Deep Dive / Advanced Article | [Blog — Suspense for Data Fetching — Dan Abramov](https://github.com/reactwg/react-18/discussions/37) |
| Interview-Focused Article | [Blog — React Suspense Interview — LogRocket](https://blog.logrocket.com/react-suspense-data-fetching/) |
| Video Explanation | [React Suspense — Jack Herrington](https://www.youtube.com/watch?v=NTDJ-NQ32_E) |

99. React Server Components (RSC) — Server vs Client Boundary ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Server Components](https://react.dev/reference/rsc/server-components) |
| Deep Dive / Advanced Article | [Blog — Making Sense of RSC — Josh W. Comeau](https://www.joshwcomeau.com/react/server-components/) |
| Interview-Focused Article | [Blog — RSC Interview Guide — LogRocket](https://blog.logrocket.com/react-server-components-comprehensive-guide/) |
| Video Explanation | [React Server Components — Jack Herrington](https://www.youtube.com/watch?v=TQQPAU21ZUw) |

100. use() Hook — Reading Promises and Context ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — use](https://react.dev/reference/react/use) |
| Deep Dive / Advanced Article | [Blog — React 19 use() Hook — LogRocket](https://blog.logrocket.com/react-19-new-hooks/) |
| Interview-Focused Article | [Blog — React 19 Interview Guide — LogRocket](https://blog.logrocket.com/react-19-new-hooks/) |
| Video Explanation | [React 19 use() Hook — Jack Herrington](https://www.youtube.com/watch?v=zdNF9FJWJ8o) |

101. Server Actions — Forms, Mutations, Progressive Enhancement ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) |
| Deep Dive / Advanced Article | [Blog — Server Actions Deep Dive — Josh W. Comeau](https://www.joshwcomeau.com/react/server-components/) |
| Interview-Focused Article | [Blog — React 19 Server Actions Interview — LogRocket](https://blog.logrocket.com/react-19-new-hooks/) |
| Video Explanation | [Server Actions Explained — Jack Herrington](https://www.youtube.com/watch?v=dDpZfOQBMaU) |

102. React Compiler (React 19) — Auto-Memoisation ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Blog — React Compiler](https://react.dev/learn/react-compiler) |
| Deep Dive / Advanced Article | [Blog — React Compiler Deep Dive — LogRocket](https://blog.logrocket.com/react-compiler-complete-guide-react-19/) |
| Interview-Focused Article | [Blog — React 19 Interview Guide](https://blog.logrocket.com/react-19-new-hooks/) |
| Video Explanation | [React Compiler — Jack Herrington](https://www.youtube.com/watch?v=PYHBHK37xlE) |

103. Activity API & View Transitions ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Chrome — View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions) |
| Deep Dive / Advanced Article | [MDN — View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) |
| Interview-Focused Article | [Blog — View Transitions in React — LogRocket](https://blog.logrocket.com/view-transitions-api-react/) |
| Video Explanation | [View Transitions — Fireship](https://www.youtube.com/watch?v=JCJUPJ_zDQ4) |


### 🏗️ Module 5.4: React Patterns
104. Compound Component Pattern ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Extracting State Logic](https://react.dev/learn/extracting-state-logic-into-a-reducer) |
| Deep Dive / Advanced Article | [patterns.dev — Compound Component Pattern](https://www.patterns.dev/react/compound-pattern) |
| Interview-Focused Article | [Blog — Compound Components Interview — LogRocket](https://blog.logrocket.com/understanding-react-compound-components/) |
| Video Explanation | [Compound Components — Jack Herrington](https://www.youtube.com/watch?v=vPRdY87_SH0) |

105. Render Props Pattern — When Still Useful ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Passing Data with Render Props](https://legacy.reactjs.org/docs/render-props.html) |
| Deep Dive / Advanced Article | [patterns.dev — Render Props Pattern](https://www.patterns.dev/react/render-props-pattern) |
| Interview-Focused Article | [Blog — Render Props Interview — LogRocket](https://blog.logrocket.com/react-render-props-vs-custom-hooks/) |
| Video Explanation | [Render Props Pattern — Jack Herrington](https://www.youtube.com/watch?v=NdapMDgNhtE) |

106. Higher Order Components (HOC) — Use Cases & Pitfalls ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Higher-Order Components](https://legacy.reactjs.org/docs/higher-order-components.html) |
| Deep Dive / Advanced Article | [patterns.dev — HOC Pattern](https://www.patterns.dev/react/hoc-pattern) |
| Interview-Focused Article | [Blog — HOCs Interview Guide — LogRocket](https://blog.logrocket.com/understanding-react-higher-order-components/) |
| Video Explanation | [HOC Pattern — Jack Herrington](https://www.youtube.com/watch?v=J5P0q7EROfw) |

107. Container vs Presentational Components ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Thinking in React](https://react.dev/learn/thinking-in-react) |
| Deep Dive / Advanced Article | [patterns.dev — Container/Presentational Pattern](https://www.patterns.dev/react/presentational-container-pattern) |
| Interview-Focused Article | [Blog — Container vs Presentational — Dan Abramov](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0) |
| Video Explanation | [Container vs Presentational — Codevolution](https://www.youtube.com/watch?v=ozg4gqoUvVQ) |

108. Controlled vs Uncontrolled Components ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Sharing State Between Components](https://react.dev/learn/sharing-state-between-components) |
| Deep Dive / Advanced Article | [Blog — Controlled vs Uncontrolled — Kent C. Dodds](https://kentcdodds.com/blog/controlled-vs-uncontrolled-elements) |
| Interview-Focused Article | [GreatFrontEnd — Controlled vs Uncontrolled Interview](https://www.greatfrontend.com/questions/quiz/what-is-the-difference-between-controlled-and-uncontrolled-components) |
| Video Explanation | [Controlled vs Uncontrolled — Codevolution](https://www.youtube.com/watch?v=BvtQMxekmH0) |

109. Error Boundaries — Class Components, react-error-boundary ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) |
| Deep Dive / Advanced Article | [Blog — Error Boundaries in React — LogRocket](https://blog.logrocket.com/react-error-handling-react-error-boundary/) |
| Interview-Focused Article | [GreatFrontEnd — Error Boundaries Interview](https://www.greatfrontend.com/questions/quiz/what-are-error-boundaries-in-react) |
| Video Explanation | [Error Boundaries — Jack Herrington](https://www.youtube.com/watch?v=_FuDMEgIy7I) |

110. Portal Pattern — Modals, Tooltips, Dropdowns ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — createPortal](https://react.dev/reference/react-dom/createPortal) |
| Deep Dive / Advanced Article | [Blog — React Portals — LogRocket](https://blog.logrocket.com/learn-react-portals-example/) |
| Interview-Focused Article | [GreatFrontEnd — React Portals Interview](https://www.greatfrontend.com/questions/quiz/what-are-portals-in-react) |
| Video Explanation | [React Portals — Codevolution](https://www.youtube.com/watch?v=HpHLa-5Wdys) |


### 📦 Module 5.5: Redux & Redux Toolkit Deep Dive
111. Redux Core — Store, Actions, Reducers, Middleware ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Redux — Core Concepts](https://redux.js.org/introduction/core-concepts) |
| Deep Dive / Advanced Article | [Blog — You Might Not Need Redux — Dan Abramov](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367) |
| Interview-Focused Article | [Blog — Redux Interview Questions — LogRocket](https://blog.logrocket.com/redux-interview-questions/) |
| Video Explanation | [Redux in 100 Seconds — Fireship](https://www.youtube.com/watch?v=_shA5Xwe8_4) |

112. Redux Toolkit — createSlice, createAsyncThunk, createEntityAdapter ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Redux Toolkit — Getting Started](https://redux-toolkit.js.org/introduction/getting-started) |
| Deep Dive / Advanced Article | [Redux Toolkit — createSlice API](https://redux-toolkit.js.org/api/createSlice) |
| Interview-Focused Article | [Blog — RTK Interview Guide — LogRocket](https://blog.logrocket.com/redux-interview-questions/) |
| Video Explanation | [Redux Toolkit — Codevolution](https://www.youtube.com/watch?v=0awA5Uw6SJE) |

113. RTK Query — defineApi, endpoints, caching, invalidation ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [RTK Query — Overview](https://redux-toolkit.js.org/rtk-query/overview) |
| Deep Dive / Advanced Article | [RTK Query — Quick Start](https://redux-toolkit.js.org/tutorials/rtk-query) |
| Interview-Focused Article | [Blog — RTK Query vs React Query — LogRocket](https://blog.logrocket.com/redux-toolkit-query-vs-react-query/) |
| Video Explanation | [RTK Query Crash Course — Codevolution](https://www.youtube.com/watch?v=HyZzCHgG3AY) |

114. Redux Middleware — Thunk vs Saga vs Observable ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Redux — Middleware](https://redux.js.org/understanding/history-and-design/middleware) |
| Deep Dive / Advanced Article | [Blog — Redux Middleware Guide — LogRocket](https://blog.logrocket.com/redux-middleware-a-practical-guide/) |
| Interview-Focused Article | [Blog — Thunk vs Saga Interview — LogRocket](https://blog.logrocket.com/redux-saga-vs-redux-thunk/) |
| Video Explanation | [Redux Middleware — Codevolution](https://www.youtube.com/watch?v=aV4XmV7PfL8) |

115. Normalised State Shape — Why and How ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Redux — Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape) |
| Deep Dive / Advanced Article | [Blog — Normalizing State — Redux Toolkit](https://redux-toolkit.js.org/api/createEntityAdapter) |
| Interview-Focused Article | [Blog — Redux Interview Questions — LogRocket](https://blog.logrocket.com/redux-interview-questions/) |
| Video Explanation | [State Normalization — Codevolution](https://www.youtube.com/watch?v=tkkMq_OjhIk) |

116. Redux DevTools — Time Travel Debugging ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Redux DevTools — GitHub](https://github.com/reduxjs/redux-devtools) |
| Deep Dive / Advanced Article | [Blog — Time Travel Debugging — Redux Docs](https://redux.js.org/usage/debugging) |
| Interview-Focused Article | [Blog — Redux Interview Questions — LogRocket](https://blog.logrocket.com/redux-interview-questions/) |
| Video Explanation | [Redux DevTools — Codevolution](https://www.youtube.com/watch?v=LzYr1ROYL9w) |

117. When NOT to Use Redux — Choosing the Right Tool ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Redux — FAQ: When to use Redux?](https://redux.js.org/faq/general#when-should-i-use-redux) |
| Deep Dive / Advanced Article | [Blog — You Might Not Need Redux — Dan Abramov](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367) |
| Interview-Focused Article | [Blog — State Management Comparison — LogRocket](https://blog.logrocket.com/zustand-vs-redux/) |
| Video Explanation | [When NOT to Use Redux — Jack Herrington](https://www.youtube.com/watch?v=5-1LM2NySR0) |


### 🌐 Module 5.6: Next.js App Router Deep Dive
118. App Router vs Pages Router — Key Differences ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — App Router](https://nextjs.org/docs/app) |
| Deep Dive / Advanced Article | [Blog — App Router vs Pages Router — Vercel](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration) |
| Interview-Focused Article | [Blog — Next.js App Router Interview — LogRocket](https://blog.logrocket.com/next-js-app-router/) |
| Video Explanation | [App Router — Jack Herrington](https://www.youtube.com/watch?v=DrxiNfbr63s) |

119. Server Components vs Client Components — Decision Rules ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Server vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components) |
| Deep Dive / Advanced Article | [Blog — Server vs Client Components — Josh W. Comeau](https://www.joshwcomeau.com/react/server-components/) |
| Interview-Focused Article | [Blog — RSC Interview Guide — LogRocket](https://blog.logrocket.com/react-server-components-comprehensive-guide/) |
| Video Explanation | [Server vs Client Components — Theo](https://www.youtube.com/watch?v=wkHfRFMz7KE) |

120. Layouts, Templates, Loading UI, Error UI — File Conventions ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — File Conventions](https://nextjs.org/docs/app/api-reference/file-conventions) |
| Deep Dive / Advanced Article | [Blog — Next.js Layouts Guide — Vercel](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates) |
| Interview-Focused Article | [Blog — Next.js Interview Questions — LogRocket](https://blog.logrocket.com/next-js-app-router/) |
| Video Explanation | [Next.js 14 File Conventions — Jack Herrington](https://www.youtube.com/watch?v=vwSlYG7hFk0) |

121. Data Fetching in App Router — fetch(), cache(), revalidate ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching) |
| Deep Dive / Advanced Article | [Blog — Data Fetching in App Router — Vercel](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching) |
| Interview-Focused Article | [Blog — Next.js Data Fetching Interview — LogRocket](https://blog.logrocket.com/next-js-app-router/) |
| Video Explanation | [Data Fetching in Next.js — Jack Herrington](https://www.youtube.com/watch?v=RBM03RihZVs) |

122. Route Handlers — API Routes in App Router ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) |
| Deep Dive / Advanced Article | [Blog — Route Handlers Guide — Vercel](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) |
| Interview-Focused Article | [Blog — Next.js API Routes Interview — LogRocket](https://blog.logrocket.com/next-js-app-router/) |
| Video Explanation | [Next.js Route Handlers — Jack Herrington](https://www.youtube.com/watch?v=MhJBMbqnpvA) |

123. Middleware — Matchers, Redirects, Auth Patterns ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware) |
| Deep Dive / Advanced Article | [Blog — Next.js Middleware Deep Dive — Vercel](https://nextjs.org/docs/app/building-your-application/routing/middleware) |
| Interview-Focused Article | [Blog — Next.js Auth Middleware — LogRocket](https://blog.logrocket.com/next-js-middleware/) |
| Video Explanation | [Next.js Middleware — Jack Herrington](https://www.youtube.com/watch?v=NlEHOAhc1Q0) |

124. Image, Font, Script Optimisation — next/image, next/font ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Optimizing Images](https://nextjs.org/docs/app/building-your-application/optimizing/images) |
| Deep Dive / Advanced Article | [Next.js Docs — Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) |
| Interview-Focused Article | [Blog — Next.js Optimization Interview — LogRocket](https://blog.logrocket.com/next-js-app-router/) |
| Video Explanation | [next/image & next/font — Jack Herrington](https://www.youtube.com/watch?v=IU_qq_c_lKA) |

125. Streaming with Suspense in Next.js ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Loading UI and Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming) |
| Deep Dive / Advanced Article | [Blog — Streaming SSR with Suspense — Vercel](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming) |
| Interview-Focused Article | [Blog — Next.js Streaming Interview — LogRocket](https://blog.logrocket.com/next-js-app-router/) |
| Video Explanation | [Streaming in Next.js — Jack Herrington](https://www.youtube.com/watch?v=3JB_qEk39w0) |

126. Parallel Routes & Intercepting Routes ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Parallel Routes](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes) |
| Deep Dive / Advanced Article | [Next.js Docs — Intercepting Routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes) |
| Interview-Focused Article | [Blog — Advanced Next.js Routing — LogRocket](https://blog.logrocket.com/next-js-app-router/) |
| Video Explanation | [Parallel & Intercepting Routes — Jack Herrington](https://www.youtube.com/watch?v=mVOvx9eVHAI) |

127. Next.js Caching — Request Memoization, Data Cache, Full Route Cache, Router Cache ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Caching](https://nextjs.org/docs/app/building-your-application/caching) |
| Deep Dive / Advanced Article | [Blog — Next.js Caching Deep Dive — Vercel](https://nextjs.org/docs/app/building-your-application/caching) |
| Interview-Focused Article | [Blog — Next.js Caching Interview — LogRocket](https://blog.logrocket.com/next-js-app-router/) |
| Video Explanation | [Next.js Caching Explained — Jack Herrington](https://www.youtube.com/watch?v=VBlSe8tvg4U) |


### ⚡ Module 5.7: React Performance Patterns
128. When Does a Component Re-render — The Complete Rules ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Render and Commit](https://react.dev/learn/render-and-commit) |
| Deep Dive / Advanced Article | [Blog — Fix the Slow Render Before the Re-render — Kent C. Dodds](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render) |
| Interview-Focused Article | [Blog — React Re-rendering Guide — LogRocket](https://blog.logrocket.com/react-re-rendering-guide/) |
| Video Explanation | [When Does React Re-render — Jack Herrington](https://www.youtube.com/watch?v=FLAVPV_qDAg) |

129. React.memo — Props Comparison, Custom Comparator ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — memo](https://react.dev/reference/react/memo) |
| Deep Dive / Advanced Article | [Blog — When to useMemo and useCallback — Kent C. Dodds](https://kentcdodds.com/blog/usememo-and-usecallback) |
| Interview-Focused Article | [GreatFrontEnd — React.memo Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [React.memo Deep Dive — Jack Herrington](https://www.youtube.com/watch?v=DEPwA3mv_R8) |

130. Key Prop — Why It Matters, Common Mistakes ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Rendering Lists (Key)](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key) |
| Deep Dive / Advanced Article | [Blog — Understanding React Key Prop — Kent C. Dodds](https://kentcdodds.com/blog/understanding-reacts-key-prop) |
| Interview-Focused Article | [GreatFrontEnd — React Keys Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-keys) |
| Video Explanation | [React Keys Explained — Jack Herrington](https://www.youtube.com/watch?v=xlPaNm0FeVE) |

131. Avoid Anonymous Functions in JSX — Why & When ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Passing Functions to Components](https://legacy.reactjs.org/docs/faq-functions.html) |
| Deep Dive / Advanced Article | [Blog — Anonymous Functions in JSX — LogRocket](https://blog.logrocket.com/react-re-rendering-guide/) |
| Interview-Focused Article | [Blog — React Performance Interview — LogRocket](https://blog.logrocket.com/react-re-rendering-guide/) |
| Video Explanation | [React Performance — Jack Herrington](https://www.youtube.com/watch?v=7sgBhmLjVsg) |

132. Windowing Large Lists — react-window vs react-virtual ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [react-window — GitHub](https://github.com/bvaughn/react-window) |
| Deep Dive / Advanced Article | [Blog — Virtualization in React — LogRocket](https://blog.logrocket.com/windowing-wars-react-virtualized-vs-react-window/) |
| Interview-Focused Article | [Blog — React Virtualization Interview — LogRocket](https://blog.logrocket.com/windowing-wars-react-virtualized-vs-react-window/) |
| Video Explanation | [Windowing with react-window — Jack Herrington](https://www.youtube.com/watch?v=UrgfPjX97Kw) |

133. Code Splitting with React.lazy + Suspense ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — lazy](https://react.dev/reference/react/lazy) |
| Deep Dive / Advanced Article | [Blog — Code Splitting in React — LogRocket](https://blog.logrocket.com/code-splitting-react-components/) |
| Interview-Focused Article | [Blog — React Code Splitting Interview — LogRocket](https://blog.logrocket.com/code-splitting-react-components/) |
| Video Explanation | [React.lazy + Suspense — Codevolution](https://www.youtube.com/watch?v=tV8UJzVCLL8) |

134. Profiling with React DevTools — Reading Flame Graphs ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Profiler](https://react.dev/reference/react/Profiler) |
| Deep Dive / Advanced Article | [Chrome DevTools — React Profiler](https://react.dev/learn/react-developer-tools) |
| Interview-Focused Article | [Blog — React Profiling Interview — LogRocket](https://blog.logrocket.com/react-profiler-measure-app-performance/) |
| Video Explanation | [React DevTools Profiler — Jack Herrington](https://www.youtube.com/watch?v=00RoZflFE34) |

135. Why Did You Render — Detecting Unnecessary Re-renders ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Why Did You Render — GitHub](https://github.com/welldone-software/why-did-you-render) |
| Deep Dive / Advanced Article | [Blog — Detecting Unnecessary Re-renders — LogRocket](https://blog.logrocket.com/react-re-rendering-guide/) |
| Interview-Focused Article | [Blog — React Performance Interview — LogRocket](https://blog.logrocket.com/react-re-rendering-guide/) |
| Video Explanation | [Why Did You Render — Jack Herrington](https://www.youtube.com/watch?v=uFCO0GCLhms) |


---
---

# 🗄️ PHASE 3 — STATE & DATA
> Week 5 | How data flows through your app. Builds on framework knowledge.

---

## SEQUENCE 6️⃣ — State Management
> Applies to both Angular and React. Consolidates what you learned in Phases 2.

### 🧠 Module 6.1: State Fundamentals
136. Local Component State

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Managing State](https://react.dev/learn/managing-state) |
| Deep Dive / Advanced Article | [Blog — Application State Management — Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react) |
| Interview-Focused Article | [GreatFrontEnd — React State Interview](https://www.greatfrontend.com/questions/quiz/what-are-react-hooks) |
| Video Explanation | [React State Management — Codevolution](https://www.youtube.com/watch?v=35lXWvCuM8o) |

137. Global State Management

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Scaling Up with Context](https://react.dev/learn/scaling-up-with-reducer-and-context) |
| Deep Dive / Advanced Article | [Blog — Global State Management — Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react) |
| Interview-Focused Article | [Blog — State Management Interview — LogRocket](https://blog.logrocket.com/zustand-vs-redux/) |
| Video Explanation | [Global State Explained — Jack Herrington](https://www.youtube.com/watch?v=DOAqh9-sTT0) |

138. Prop Drilling vs Context

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) |
| Deep Dive / Advanced Article | [Blog — Prop Drilling — Kent C. Dodds](https://kentcdodds.com/blog/prop-drilling) |
| Interview-Focused Article | [GreatFrontEnd — Prop Drilling vs Context Interview](https://www.greatfrontend.com/questions/quiz/what-is-context-api) |
| Video Explanation | [Prop Drilling vs Context — Jack Herrington](https://www.youtube.com/watch?v=ZKlXqrcBx88) |

139. Derived State vs Computed State ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) |
| Deep Dive / Advanced Article | [Blog — Derived State in React — Kent C. Dodds](https://kentcdodds.com/blog/dont-sync-state-derive-it) |
| Interview-Focused Article | [Blog — React State Interview — LogRocket](https://blog.logrocket.com/react-re-rendering-guide/) |
| Video Explanation | [Derived State — Jack Herrington](https://www.youtube.com/watch?v=nH_x7aQa73s) |


### 🗂️ Module 6.2: State Tools & Patterns
140. Redux / Zustand / Signals — Comparison

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Zustand — GitHub](https://github.com/pmndrs/zustand) |
| Deep Dive / Advanced Article | [Blog — Redux vs Zustand vs Signals — LogRocket](https://blog.logrocket.com/zustand-vs-redux/) |
| Interview-Focused Article | [Blog — State Management Comparison Interview — LogRocket](https://blog.logrocket.com/zustand-vs-redux/) |
| Video Explanation | [Zustand vs Redux — Jack Herrington](https://www.youtube.com/watch?v=5-1LM2NySR0) |

141. Server State vs Client State

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TanStack Query — Overview](https://tanstack.com/query/latest/docs/framework/react/overview) |
| Deep Dive / Advanced Article | [Blog — Server State vs Client State — TkDodo](https://tkdodo.eu/blog/practical-react-query) |
| Interview-Focused Article | [Blog — Server State Interview — LogRocket](https://blog.logrocket.com/react-query-state-management/) |
| Video Explanation | [Server State vs Client State — Jack Herrington](https://www.youtube.com/watch?v=OrliU0e09io) |

142. Cache-Based State Management

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TanStack Query — Caching](https://tanstack.com/query/latest/docs/framework/react/guides/caching) |
| Deep Dive / Advanced Article | [Blog — React Query as State Manager — TkDodo](https://tkdodo.eu/blog/react-query-as-a-state-manager) |
| Interview-Focused Article | [Blog — Cache-Based State Interview — LogRocket](https://blog.logrocket.com/react-query-state-management/) |
| Video Explanation | [React Query Caching — Codevolution](https://www.youtube.com/watch?v=VtWkSCZX0Ec) |

143. React Query / TanStack Query Deep Dive ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TanStack Query Docs](https://tanstack.com/query/latest) |
| Deep Dive / Advanced Article | [Blog — Practical React Query — TkDodo](https://tkdodo.eu/blog/practical-react-query) |
| Interview-Focused Article | [Blog — React Query Interview — LogRocket](https://blog.logrocket.com/react-query-state-management/) |
| Video Explanation | [TanStack Query Tutorial — Codevolution](https://www.youtube.com/watch?v=VtWkSCZX0Ec) |

144. State Machines (XState) for Complex Flows ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [XState Docs](https://xstate.js.org/docs/) |
| Deep Dive / Advanced Article | [Blog — State Machines in React — LogRocket](https://blog.logrocket.com/finite-state-machines-react/) |
| Interview-Focused Article | [Blog — XState Interview Questions — Dev.to](https://dev.to/davidkpiano/xstate-for-everyone-kxp) |
| Video Explanation | [XState Explained — Fireship](https://www.youtube.com/watch?v=iDZUKJt36PI) |

145. URL as State — When and Why ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL) |
| Deep Dive / Advanced Article | [Blog — URL as State in React — LogRocket](https://blog.logrocket.com/use-state-url-persist-state-usesearchparams/) |
| Interview-Focused Article | [Blog — URL State Interview — Dev.to](https://dev.to/nilanth/url-as-state-management-why-and-when-3g0b) |
| Video Explanation | [URL as State — Jack Herrington](https://www.youtube.com/watch?v=ukpgxp0Rcp8) |


### ⚙️ Module 6.3: State at Scale
146. State Normalization

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Redux — Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape) |
| Deep Dive / Advanced Article | [Blog — Normalizing Data — Redux Toolkit](https://redux-toolkit.js.org/api/createEntityAdapter) |
| Interview-Focused Article | [Blog — State Normalization Interview — LogRocket](https://blog.logrocket.com/redux-interview-questions/) |
| Video Explanation | [State Normalization — Codevolution](https://www.youtube.com/watch?v=tkkMq_OjhIk) |

147. Avoiding Over-Global State

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Choosing State Structure](https://react.dev/learn/choosing-the-state-structure) |
| Deep Dive / Advanced Article | [Blog — Application State Management — Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react) |
| Interview-Focused Article | [Blog — Over-Global State — LogRocket](https://blog.logrocket.com/zustand-vs-redux/) |
| Video Explanation | [State Management Mistakes — Jack Herrington](https://www.youtube.com/watch?v=DOAqh9-sTT0) |

148. Performance Impact of State Changes

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Choosing State Structure](https://react.dev/learn/choosing-the-state-structure) |
| Deep Dive / Advanced Article | [Blog — Performance Impact of State Changes — Kent C. Dodds](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render) |
| Interview-Focused Article | [Blog — React Performance Interview — LogRocket](https://blog.logrocket.com/react-re-rendering-guide/) |
| Video Explanation | [State Performance — Jack Herrington](https://www.youtube.com/watch?v=FLAVPV_qDAg) |


---

## SEQUENCE 7️⃣ — Data Fetching & API Design
> How your app talks to the server. Builds directly on state knowledge.

### 🔌 Module 7.1: API Consumption
149. REST API Consumption Patterns

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) |
| Deep Dive / Advanced Article | [Blog — REST API Best Practices — LogRocket](https://blog.logrocket.com/rest-api-best-practices/) |
| Interview-Focused Article | [GreatFrontEnd — API Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/network) |
| Video Explanation | [REST API in 100 Seconds — Fireship](https://www.youtube.com/watch?v=-MTSQjw5DrM) |

150. GraphQL in Frontend Systems

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GraphQL Docs](https://graphql.org/learn/) |
| Deep Dive / Advanced Article | [Blog — GraphQL in Frontend — LogRocket](https://blog.logrocket.com/graphql-vs-rest-api/) |
| Interview-Focused Article | [Blog — GraphQL Interview Questions — Dev.to](https://dev.to/the_one/graphql-interview-questions-and-answers-2bda) |
| Video Explanation | [GraphQL in 100 Seconds — Fireship](https://www.youtube.com/watch?v=eIQh02xuVw4) |

151. tRPC & Type-Safe APIs ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [tRPC Docs](https://trpc.io/docs) |
| Deep Dive / Advanced Article | [Blog — tRPC: Build Type-Safe APIs — LogRocket](https://blog.logrocket.com/build-full-stack-typescript-app-trpc-react/) |
| Interview-Focused Article | [Blog — tRPC vs REST vs GraphQL — Dev.to](https://dev.to/nickytonline/trpc-is-it-a-game-changer-25ip) |
| Video Explanation | [tRPC Explained — Theo](https://www.youtube.com/watch?v=2LYM8DEf5eo) |


### 📜 Module 7.2: Lists & Streams
152. Pagination Strategies

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — API Pagination](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) |
| Deep Dive / Advanced Article | [Blog — Pagination Strategies — LogRocket](https://blog.logrocket.com/pagination-react/) |
| Interview-Focused Article | [Blog — Pagination Interview — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook/network) |
| Video Explanation | [Pagination in React — Codevolution](https://www.youtube.com/watch?v=IYCa1F-OWmk) |

153. Infinite Scrolling Design

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) |
| Deep Dive / Advanced Article | [Blog — Infinite Scrolling in React — LogRocket](https://blog.logrocket.com/react-infinite-scroll/) |
| Interview-Focused Article | [GreatFrontEnd — Infinite Scroll Design](https://www.greatfrontend.com/questions/system-design/news-feed-facebook) |
| Video Explanation | [Infinite Scroll — Jack Herrington](https://www.youtube.com/watch?v=NZKUirTtxcg) |

154. Cursor-Based vs Offset Pagination Trade-offs ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Cursor-Based Pagination — Slack Engineering](https://slack.engineering/evolving-api-pagination-at-slack/) |
| Deep Dive / Advanced Article | [Blog — Cursor vs Offset Pagination — LogRocket](https://blog.logrocket.com/graphql-cursor-based-pagination/) |
| Interview-Focused Article | [Blog — Pagination Interview — Dev.to](https://dev.to/appwrite/offset-vs-cursor-pagination-in-rest-apis-4h1a) |
| Video Explanation | [Cursor Pagination — Hussein Nasser](https://www.youtube.com/watch?v=WUICbOOtAic) |


### ⏱️ Module 7.3: Request Control
155. Debouncing & Throttling (applied to API calls)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout) |
| Deep Dive / Advanced Article | [CSS-Tricks — Debouncing and Throttling Explained](https://css-tricks.com/debouncing-throttling-explained-examples/) |
| Interview-Focused Article | [GreatFrontEnd — Implement Debounce](https://www.greatfrontend.com/questions/javascript/debounce) |
| Video Explanation | [Debounce & Throttle — Akshay Saini](https://www.youtube.com/watch?v=Zo-6_qx8uxg) |

156. Parallel vs Sequential API Calls

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) |
| Deep Dive / Advanced Article | [Blog — Parallel API Calls — LogRocket](https://blog.logrocket.com/understanding-promise-all-in-javascript/) |
| Interview-Focused Article | [GreatFrontEnd — JavaScript Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/javascript) |
| Video Explanation | [Parallel vs Sequential Requests — Fireship](https://www.youtube.com/watch?v=vn3tm0quoqE) |

157. Optimistic UI Updates

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Updating Objects in State](https://react.dev/learn/updating-objects-in-state) |
| Deep Dive / Advanced Article | [Blog — Optimistic UI Updates — LogRocket](https://blog.logrocket.com/optimistic-ui-updates-react/) |
| Interview-Focused Article | [GreatFrontEnd — System Design Concepts](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Optimistic UI — Jack Herrington](https://www.youtube.com/watch?v=M3mGY0pgFk0) |


### 🛡️ Module 7.4: Reliability
158. Error Handling & Retry Strategies

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Fetch Error Handling](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful) |
| Deep Dive / Advanced Article | [Blog — Error Handling & Retry Strategies — LogRocket](https://blog.logrocket.com/error-handling-react/) |
| Interview-Focused Article | [Blog — API Error Handling Interview — Dev.to](https://dev.to/pragativerma18/all-about-http-retry-6mk) |
| Video Explanation | [Error Handling in React — Codevolution](https://www.youtube.com/watch?v=DNYXgtZBRPE) |

159. API Contracts & Versioning

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Swagger — OpenAPI Specification](https://swagger.io/specification/) |
| Deep Dive / Advanced Article | [Blog — API Versioning Best Practices — LogRocket](https://blog.logrocket.com/api-versioning-best-practices/) |
| Interview-Focused Article | [Blog — API Design Interview Questions — Dev.to](https://dev.to/dfravel/api-design-interview-questions-5b6) |
| Video Explanation | [API Versioning — Hussein Nasser](https://www.youtube.com/watch?v=Exf4Q2FzLuo) |

160. Request Deduplication

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [TanStack Query — Deduplication](https://tanstack.com/query/latest/docs/framework/react/guides/caching) |
| Deep Dive / Advanced Article | [Blog — Request Deduplication — LogRocket](https://blog.logrocket.com/react-query-state-management/) |
| Interview-Focused Article | [Blog — API Optimization Interview — Dev.to](https://dev.to/pragativerma18/all-about-http-retry-6mk) |
| Video Explanation | [Request Deduplication — Jack Herrington](https://www.youtube.com/watch?v=OrliU0e09io) |

161. Client-Side Rate Limiting

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Rate Limiting](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout) |
| Deep Dive / Advanced Article | [Blog — Client-Side Rate Limiting — LogRocket](https://blog.logrocket.com/rate-limiting-node-js/) |
| Interview-Focused Article | [Blog — Rate Limiting Interview — Dev.to](https://dev.to/pragativerma18/all-about-http-retry-6mk) |
| Video Explanation | [Rate Limiting Explained — Hussein Nasser](https://www.youtube.com/watch?v=mhUQe4BKZXs) |

162. Circuit Breaker Pattern

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Circuit Breaker Pattern — Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html) |
| Deep Dive / Advanced Article | [Blog — Circuit Breaker in Frontend — LogRocket](https://blog.logrocket.com/implement-circuit-breaker-pattern-node-js/) |
| Interview-Focused Article | [Blog — Circuit Breaker Interview — Dev.to](https://dev.to/pragativerma18/all-about-http-retry-6mk) |
| Video Explanation | [Circuit Breaker — Hussein Nasser](https://www.youtube.com/watch?v=ADHcBxEXvCo) |

163. Graceful API Degradation

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Reliable Web Apps](https://web.dev/articles/reliable) |
| Deep Dive / Advanced Article | [Blog — Graceful Degradation — LogRocket](https://blog.logrocket.com/progressive-enhancement-vs-graceful-degradation/) |
| Interview-Focused Article | [Blog — Frontend Resilience Interview — Dev.to](https://dev.to/pragativerma18/all-about-http-retry-6mk) |
| Video Explanation | [Graceful Degradation — Fireship](https://www.youtube.com/watch?v=6I_GwgoGm1w) |

164. Skeleton Loaders & Loading State Strategy ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Skeleton Screens](https://web.dev/articles/ux-basics) |
| Deep Dive / Advanced Article | [Blog — Skeleton Loading States — LogRocket](https://blog.logrocket.com/building-skeleton-screens-react/) |
| Interview-Focused Article | [Blog — Loading States Interview — Dev.to](https://dev.to/lydiahallie/javascript-visualized-event-loop-3dif) |
| Video Explanation | [Skeleton UI — Fireship](https://www.youtube.com/watch?v=ZVug65gW-fc) |


---
---

# 🚀 PHASE 4 — PERFORMANCE & ARCHITECTURE
> Weeks 6–7 | Your SAP Lighthouse story lives here. This is where you shine.

---

## SEQUENCE 8️⃣ — Performance Optimization
> Your strongest real-world asset. The SAP Lighthouse 60→95 story answers most of this.

### 📊 Module 8.1: Metrics & Measurement
165. Frontend Performance Metrics

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Performance](https://web.dev/performance) |
| Deep Dive / Advanced Article | [Blog — The Cost of JavaScript — V8](https://v8.dev/blog/cost-of-javascript-2019) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Web Performance — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc) |

166. FCP, LCP, CLS, TTI, INP — Precise Definitions and Targets

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Web Vitals](https://web.dev/articles/vitals) |
| Deep Dive / Advanced Article | [web.dev — Metrics (LCP, FID, CLS, INP)](https://web.dev/articles/lcp) |
| Interview-Focused Article | [Blog — Core Web Vitals Interview — LogRocket](https://blog.logrocket.com/core-web-vitals/) |
| Video Explanation | [Core Web Vitals — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc) |

167. Lighthouse CI — Automating Performance Budgets in CI/CD ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Lighthouse CI — GitHub](https://github.com/GoogleChrome/lighthouse-ci) |
| Deep Dive / Advanced Article | [web.dev — Performance Budgets](https://web.dev/articles/performance-budgets-101) |
| Interview-Focused Article | [Blog — Lighthouse CI Interview — LogRocket](https://blog.logrocket.com/lighthouse-ci/) |
| Video Explanation | [Lighthouse CI — Google Chrome Developers](https://www.youtube.com/watch?v=mLjxXPHuIJo) |

168. Real User Monitoring (RUM) vs Synthetic Testing ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Real User Monitoring](https://web.dev/articles/vitals-measurement-getting-started) |
| Deep Dive / Advanced Article | [Blog — RUM vs Synthetic Testing — Calibre](https://calibreapp.com/blog/synthetic-vs-real-user-monitoring) |
| Interview-Focused Article | [Blog — Performance Monitoring Interview — LogRocket](https://blog.logrocket.com/core-web-vitals/) |
| Video Explanation | [RUM vs Synthetic — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc) |


### 📦 Module 8.2: Code Optimization
169. Code Splitting Strategies

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Code Splitting](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting) |
| Deep Dive / Advanced Article | [Blog — Code Splitting Strategies — LogRocket](https://blog.logrocket.com/code-splitting-react-components/) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Code Splitting — Fireship](https://www.youtube.com/watch?v=JU6sl_yyZqs) |

170. Lazy Loading Components & Routes

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Lazy Loading](https://web.dev/articles/lazy-loading) |
| Deep Dive / Advanced Article | [MDN — Lazy Loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Lazy Loading — Google Chrome Developers](https://www.youtube.com/watch?v=AActXSWxsRo) |

171. Tree Shaking

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Tree Shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking) |
| Deep Dive / Advanced Article | [webpack — Tree Shaking](https://webpack.js.org/guides/tree-shaking/) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Tree Shaking — Fireship](https://www.youtube.com/watch?v=X8w_ghczzes) |

172. Memoization Techniques

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — useMemo](https://react.dev/reference/react/useMemo) |
| Deep Dive / Advanced Article | [Blog — Memoization in JS — LogRocket](https://blog.logrocket.com/javascript-memoization/) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Memoization Explained — Akshay Saini](https://www.youtube.com/watch?v=lhNdUVh3qCc) |

173. Bundle Analysis — webpack-bundle-analyzer, Rollup Visualiser ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [webpack — Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) |
| Deep Dive / Advanced Article | [Blog — Bundle Analysis — LogRocket](https://blog.logrocket.com/guide-performance-optimization-webpack/) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Webpack Bundle Analyzer — Fireship](https://www.youtube.com/watch?v=SbhkQA0k8a0) |


### 🧵 Module 8.3: Rendering Performance
174. Virtualization (Large Lists)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [react-window — GitHub](https://github.com/bvaughn/react-window) |
| Deep Dive / Advanced Article | [web.dev — Virtualize Long Lists](https://web.dev/articles/virtualize-long-lists-react-window) |
| Interview-Focused Article | [Blog — Virtualization Interview — LogRocket](https://blog.logrocket.com/windowing-wars-react-virtualized-vs-react-window/) |
| Video Explanation | [Virtualizing Long Lists — Jack Herrington](https://www.youtube.com/watch?v=UrgfPjX97Kw) |

175. Avoiding Unnecessary Re-Renders

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Optimizing Performance](https://react.dev/learn/render-and-commit) |
| Deep Dive / Advanced Article | [Blog — Avoid Unnecessary Re-Renders — Kent C. Dodds](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render) |
| Interview-Focused Article | [Blog — React Re-render Interview — LogRocket](https://blog.logrocket.com/react-re-rendering-guide/) |
| Video Explanation | [Unnecessary Re-renders — Jack Herrington](https://www.youtube.com/watch?v=FLAVPV_qDAg) |

176. Performance Budgets

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Performance Budgets](https://web.dev/articles/performance-budgets-101) |
| Deep Dive / Advanced Article | [Blog — Setting Performance Budgets — Calibre](https://calibreapp.com/blog/performance-budgets) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Performance Budgets — Google Chrome Developers](https://www.youtube.com/watch?v=yqejmZrtmNg) |

177. Angular OnPush + trackBy Performance Patterns ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — OnPush Strategy](https://angular.dev/guide/components/advanced-configuration#changedetectionstrategy) |
| Deep Dive / Advanced Article | [Blog — Angular OnPush + trackBy — Netanel Basal](https://netbasal.com/a-comprehensive-guide-to-angular-onpush-change-detection-strategy-e3e7b0df9a70) |
| Interview-Focused Article | [Blog — Angular Performance Interview — Medium](https://medium.com/@nicholasgill30/angular-performance-interview-questions-8b7d82f9bc09) |
| Video Explanation | [OnPush & trackBy — Decoded Frontend](https://www.youtube.com/watch?v=AWxLOidx-vE) |


### ⏳ Module 8.4: Main Thread Management
178. Main Thread Scheduling

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Optimize Long Tasks](https://web.dev/articles/optimize-long-tasks) |
| Deep Dive / Advanced Article | [Blog — Main Thread Scheduling — Chrome](https://developer.chrome.com/blog/introducing-scheduler-yield) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Long Tasks — Google Chrome Developers](https://www.youtube.com/watch?v=8_pzlWR1vR4) |

179. Long Tasks & Yielding Control

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Optimize Long Tasks](https://web.dev/articles/optimize-long-tasks) |
| Deep Dive / Advanced Article | [Blog — Yielding to the Main Thread — Chrome](https://developer.chrome.com/blog/introducing-scheduler-yield) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Yielding to Main Thread — Google Chrome Developers](https://www.youtube.com/watch?v=8_pzlWR1vR4) |

180. Interaction to Next Paint (INP)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — INP](https://web.dev/articles/inp) |
| Deep Dive / Advanced Article | [Blog — Optimize INP — Chrome](https://developer.chrome.com/docs/devtools/performance/inp) |
| Interview-Focused Article | [Blog — INP Interview — LogRocket](https://blog.logrocket.com/core-web-vitals/) |
| Video Explanation | [Interaction to Next Paint — Google Chrome Developers](https://www.youtube.com/watch?v=KZ1kxzsJZ5g) |

181. scheduler.postTask() API ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Scheduler.postTask()](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/postTask) |
| Deep Dive / Advanced Article | [Chrome — Prioritized Task Scheduling](https://developer.chrome.com/blog/introducing-scheduler-yield) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [scheduler.postTask() — Google Chrome Developers](https://www.youtube.com/watch?v=8_pzlWR1vR4) |


---

## SEQUENCE 9️⃣ — Assets & Resource Optimization
> Directly supports performance. Adobe asks about this specifically.

### 🖼️ Module 9.1: Media & Fonts
182. Image Optimization

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Optimize Images](https://web.dev/articles/choose-the-right-image-format) |
| Deep Dive / Advanced Article | [Blog — Image Optimization Guide — Smashing Magazine](https://www.smashingmagazine.com/2021/04/image-optimization-pre-loading/) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Image Optimization — Google Chrome Developers](https://www.youtube.com/watch?v=YJGCZCaIZkQ) |

183. Responsive Images

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images) |
| Deep Dive / Advanced Article | [web.dev — Serve Responsive Images](https://web.dev/articles/serve-responsive-images) |
| Interview-Focused Article | [GreatFrontEnd — HTML Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/html) |
| Video Explanation | [Responsive Images — Google Chrome Developers](https://www.youtube.com/watch?v=fp9eKQrnL-E) |

184. Font Optimization

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Best Practices for Fonts](https://web.dev/articles/font-best-practices) |
| Deep Dive / Advanced Article | [MDN — Web Fonts](https://developer.mozilla.org/en-US/docs/Learn/CSS/Styling_text/Web_fonts) |
| Interview-Focused Article | [Blog — Font Optimization Interview — LogRocket](https://blog.logrocket.com/web-font-optimization/) |
| Video Explanation | [Font Optimization — Google Chrome Developers](https://www.youtube.com/watch?v=G0cOQ79WKZE) |

185. AVIF vs WebP vs JPEG XL — Modern Image Formats ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Use Modern Image Formats](https://web.dev/articles/uses-webp-images) |
| Deep Dive / Advanced Article | [Blog — AVIF vs WebP — Cloudflare](https://blog.cloudflare.com/generate-avif-images-with-image-resizing/) |
| Interview-Focused Article | [Blog — Image Formats Interview — Smashing Magazine](https://www.smashingmagazine.com/2021/09/modern-image-formats-avif-webp/) |
| Video Explanation | [AVIF vs WebP — Fireship](https://www.youtube.com/watch?v=GFMXBSCcpfo) |

186. Variable Fonts ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Variable Fonts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fonts/Variable_fonts_guide) |
| Deep Dive / Advanced Article | [web.dev — Variable Fonts](https://web.dev/articles/variable-fonts) |
| Interview-Focused Article | [Blog — Variable Fonts Interview — Smashing Magazine](https://www.smashingmagazine.com/2018/10/variable-fonts-usage-guide/) |
| Video Explanation | [Variable Fonts — Google Chrome Developers](https://www.youtube.com/watch?v=G0cOQ79WKZE) |


### 🎨 Module 9.2: CSS & JS Assets
187. CSS Optimization

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Optimize CSS](https://web.dev/articles/extract-critical-css) |
| Deep Dive / Advanced Article | [MDN — CSS Performance](https://developer.mozilla.org/en-US/docs/Learn/Performance/CSS) |
| Interview-Focused Article | [GreatFrontEnd — CSS Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/css) |
| Video Explanation | [CSS Optimization — Fireship](https://www.youtube.com/watch?v=Qhaz36TZG5Y) |

188. JavaScript Bundle Optimization

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Reduce JavaScript Payloads](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting) |
| Deep Dive / Advanced Article | [webpack — Optimization](https://webpack.js.org/guides/production/) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [JS Bundle Optimization — Fireship](https://www.youtube.com/watch?v=SbhkQA0k8a0) |

189. Compression (Gzip, Brotli)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Compression](https://developer.mozilla.org/en-US/docs/Web/HTTP/Compression) |
| Deep Dive / Advanced Article | [Blog — Brotli vs Gzip — Cloudflare](https://blog.cloudflare.com/results-experimenting-brotli/) |
| Interview-Focused Article | [GreatFrontEnd — Network Interview Questions](https://www.greatfrontend.com/front-end-interview-guidebook/network) |
| Video Explanation | [Brotli vs Gzip — Hussein Nasser](https://www.youtube.com/watch?v=vILR8WE5ORY) |

190. CSS-in-JS Performance Trade-offs ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — CSS-in-JS Performance — Aggelos Arvanitakis](https://pustelto.com/blog/css-vs-css-in-js-perf/) |
| Deep Dive / Advanced Article | [Blog — CSS-in-JS Trade-offs — Sam Magura](https://dev.to/srmagura/why-were-breaking-up-wiht-css-in-js-4g9b) |
| Interview-Focused Article | [Blog — CSS-in-JS Interview — LogRocket](https://blog.logrocket.com/css-in-js/) |
| Video Explanation | [CSS-in-JS Debate — Theo](https://www.youtube.com/watch?v=CQuTF-bkOgc) |


### 🌍 Module 9.3: Delivery & Third-Party
191. CDN Usage

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Cloudflare — What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/) |
| Deep Dive / Advanced Article | [web.dev — Content Delivery Networks](https://web.dev/articles/content-delivery-networks) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [CDN Explained — Fireship](https://www.youtube.com/watch?v=RI9np1LWzqw) |

192. Third-Party Script Management

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Loading Third-Party JavaScript](https://web.dev/articles/optimizing-content-efficiency-loading-third-party-javascript) |
| Deep Dive / Advanced Article | [Blog — Third-Party Script Impact — Calibre](https://calibreapp.com/blog/third-party-resources) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Third-Party Scripts — Google Chrome Developers](https://www.youtube.com/watch?v=bmIUYBNKja4) |

193. Tag Managers & Risks

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Tag Managers](https://web.dev/articles/tag-best-practices) |
| Deep Dive / Advanced Article | [Blog — GTM Performance Risks — Calibre](https://calibreapp.com/blog/tag-managers) |
| Interview-Focused Article | [Blog — Tag Manager Interview — LogRocket](https://blog.logrocket.com/tag-management-performance/) |
| Video Explanation | [GTM Performance — Google Chrome Developers](https://www.youtube.com/watch?v=bmIUYBNKja4) |

194. Self-Hosting vs Third-Party Assets

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Self-Host Third-Party Assets](https://web.dev/articles/preconnect-and-dns-prefetch) |
| Deep Dive / Advanced Article | [Blog — Self-Hosting Fonts — Sia Karamalegos](https://sia.codes/posts/making-google-fonts-faster/) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Self-Hosting vs CDN — Fireship](https://www.youtube.com/watch?v=RI9np1LWzqw) |

195. Resource Hints — Priority Hints API ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Fetch Priority API](https://web.dev/articles/fetch-priority) |
| Deep Dive / Advanced Article | [Chrome — Priority Hints](https://developer.chrome.com/blog/fetch-priority) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Priority Hints — Google Chrome Developers](https://www.youtube.com/watch?v=SrU03vP0vMc) |


---

## SEQUENCE 🔟 — Frontend Architecture Patterns
> Big picture thinking. Builds on everything above.

### 🧩 Module 10.1: Structural Patterns
196. Monolithic Frontend Architecture

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [patterns.dev — Design Patterns](https://www.patterns.dev/) |
| Deep Dive / Advanced Article | [Blog — Monolithic Frontend — Micro-frontends.org](https://micro-frontends.org/) |
| Interview-Focused Article | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Frontend Architecture — Fireship](https://www.youtube.com/watch?v=lkIFF4maKMU) |

197. Component-Based Architecture

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Thinking in React](https://react.dev/learn/thinking-in-react) |
| Deep Dive / Advanced Article | [patterns.dev — Component Patterns](https://www.patterns.dev/react/compound-pattern) |
| Interview-Focused Article | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Component Architecture — Jack Herrington](https://www.youtube.com/watch?v=x5PZwb4XurU) |

198. MVC / MVVM in Frontend

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — MVC Architecture](https://developer.mozilla.org/en-US/docs/Glossary/MVC) |
| Deep Dive / Advanced Article | [Blog — MVC vs MVVM — LogRocket](https://blog.logrocket.com/model-view-controller-mvc-pattern/) |
| Interview-Focused Article | [Blog — MVC Interview Questions — Medium](https://medium.com/@patel.devan04/mvc-mvvm-interview-questions-5a39cdea0c3e) |
| Video Explanation | [MVC Explained — Fireship](https://www.youtube.com/watch?v=DUg2SWWK18I) |

199. Atomic Design Methodology ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Atomic Design — Brad Frost](https://atomicdesign.bradfrost.com/) |
| Deep Dive / Advanced Article | [Blog — Atomic Design Methodology — LogRocket](https://blog.logrocket.com/atomic-design-react-native/) |
| Interview-Focused Article | [Blog — Atomic Design Interview — Dev.to](https://dev.to/janpauldahlke/atomic-design-in-practice-does-it-work-4l2g) |
| Video Explanation | [Atomic Design in React — Fireship](https://www.youtube.com/watch?v=lkIFF4maKMU) |

200. Compound Component Pattern (applied)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [patterns.dev — Compound Component](https://www.patterns.dev/react/compound-pattern) |
| Deep Dive / Advanced Article | [Blog — Compound Components in React — LogRocket](https://blog.logrocket.com/understanding-react-compound-components/) |
| Interview-Focused Article | [Blog — React Patterns Interview — LogRocket](https://blog.logrocket.com/understanding-react-compound-components/) |
| Video Explanation | [Compound Components — Jack Herrington](https://www.youtube.com/watch?v=vPRdY87_SH0) |


### 🏛️ Module 10.2: Application Types
201. SPA Architecture

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — SPA](https://developer.mozilla.org/en-US/docs/Glossary/SPA) |
| Deep Dive / Advanced Article | [patterns.dev — SPA Patterns](https://www.patterns.dev/vanilla/client-side-rendering) |
| Interview-Focused Article | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Video Explanation | [SPA vs MPA — Fireship](https://www.youtube.com/watch?v=Dkx5ydvtpCA) |

202. MPA Architecture

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Multi-page Application](https://web.dev/articles/rendering-on-the-web) |
| Deep Dive / Advanced Article | [Blog — SPA vs MPA — Vercel](https://vercel.com/blog/understanding-react-server-components) |
| Interview-Focused Article | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Video Explanation | [MPA vs SPA — Theo](https://www.youtube.com/watch?v=860d8usGC0o) |

203. Hybrid Rendering Architecture

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Rendering on the Web](https://web.dev/articles/rendering-on-the-web) |
| Deep Dive / Advanced Article | [Blog — Hybrid Rendering — Vercel](https://vercel.com/blog/understanding-react-server-components) |
| Interview-Focused Article | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Hybrid Rendering — Jack Herrington](https://www.youtube.com/watch?v=DrxiNfbr63s) |


### 🧱 Module 10.3: Scale-Oriented Architectures
204. Micro-Frontend Architecture

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [micro-frontends.org](https://micro-frontends.org/) |
| Deep Dive / Advanced Article | [Blog — Micro-Frontends — Martin Fowler](https://martinfowler.com/articles/micro-frontends.html) |
| Interview-Focused Article | [Blog — Micro Frontend Interview — LogRocket](https://blog.logrocket.com/micro-frontend-react/) |
| Video Explanation | [Micro-Frontends — Jack Herrington](https://www.youtube.com/watch?v=w58aZjACETQ) |

205. Module Federation

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [webpack — Module Federation](https://webpack.js.org/concepts/module-federation/) |
| Deep Dive / Advanced Article | [Blog — Module Federation: A Game Changer — Zack Jackson](https://module-federation.io/) |
| Interview-Focused Article | [Blog — Module Federation Interview — LogRocket](https://blog.logrocket.com/building-micro-frontends-module-federation/) |
| Video Explanation | [Module Federation — Jack Herrington](https://www.youtube.com/watch?v=K-yQB9YGmgE) |

206. Design System Architecture

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Storybook Docs](https://storybook.js.org/docs) |
| Deep Dive / Advanced Article | [Blog — Design System Architecture — LogRocket](https://blog.logrocket.com/build-component-library-react-typescript/) |
| Interview-Focused Article | [Blog — Design Systems Interview — Dev.to](https://dev.to/emmabostian/design-systems-what-are-they-4l5n) |
| Video Explanation | [Design Systems — Fireship](https://www.youtube.com/watch?v=lKXspt7FJcQ) |

207. Feature-Based vs Layer-Based Structuring

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Feature-Sliced Design](https://feature-sliced.design/) |
| Deep Dive / Advanced Article | [Blog — Structuring React Projects — LogRocket](https://blog.logrocket.com/react-project-structure/) |
| Interview-Focused Article | [Blog — Project Structure Interview — Dev.to](https://dev.to/profydev/feature-based-architecture-471o) |
| Video Explanation | [Project Structure — Jack Herrington](https://www.youtube.com/watch?v=T1TbNqvIKtY) |

208. Monorepo Architecture (Nx, Turborepo) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Nx Docs](https://nx.dev/getting-started/intro) |
| Deep Dive / Advanced Article | [Turborepo Docs](https://turbo.build/repo/docs) |
| Interview-Focused Article | [Blog — Monorepo Architecture Interview — LogRocket](https://blog.logrocket.com/monorepo-tools-compared/) |
| Video Explanation | [Monorepo Explained — Fireship](https://www.youtube.com/watch?v=9iU_IE6vnJ8) |

209. Plugin Architecture in Frontend ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Plugin Architecture — Martin Fowler](https://martinfowler.com/articles/micro-frontends.html) |
| Deep Dive / Advanced Article | [Blog — Plugin System Design — LogRocket](https://blog.logrocket.com/advanced-react-component-composition/) |
| Interview-Focused Article | [Blog — Frontend Architecture Interview — Dev.to](https://dev.to/emmabostian/design-systems-what-are-they-4l5n) |
| Video Explanation | [Plugin Architecture — Jack Herrington](https://www.youtube.com/watch?v=iLfl9LXL2Co) |


---

## SEQUENCE 1️⃣1️⃣ — Rendering Strategies
> After architecture — how you choose where to render.

### 🖥️ Module 11.1: Rendering Models
210. Client-Side Rendering (CSR)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Client-Side Rendering](https://web.dev/articles/rendering-on-the-web#csr) |
| Deep Dive / Advanced Article | [patterns.dev — Client-Side Rendering](https://www.patterns.dev/vanilla/client-side-rendering) |
| Interview-Focused Article | [GreatFrontEnd — Rendering Interview](https://www.greatfrontend.com/system-design) |
| Video Explanation | [CSR Explained — Fireship](https://www.youtube.com/watch?v=Dkx5ydvtpCA) |

211. Server-Side Rendering (SSR)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Server-Side Rendering](https://web.dev/articles/rendering-on-the-web#server-side-rendering) |
| Deep Dive / Advanced Article | [patterns.dev — Server-Side Rendering](https://www.patterns.dev/vanilla/server-side-rendering) |
| Interview-Focused Article | [GreatFrontEnd — Rendering Interview](https://www.greatfrontend.com/system-design) |
| Video Explanation | [SSR Explained — Fireship](https://www.youtube.com/watch?v=Dkx5ydvtpCA) |

212. Static Site Generation (SSG)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Static Generation](https://nextjs.org/docs/pages/building-your-application/rendering/static-site-generation) |
| Deep Dive / Advanced Article | [patterns.dev — Static Rendering](https://www.patterns.dev/vanilla/static-rendering) |
| Interview-Focused Article | [GreatFrontEnd — Rendering Interview](https://www.greatfrontend.com/system-design) |
| Video Explanation | [SSG Explained — Fireship](https://www.youtube.com/watch?v=Dkx5ydvtpCA) |

213. Incremental Static Regeneration (ISR)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Incremental Static Regeneration](https://nextjs.org/docs/pages/building-your-application/rendering/incremental-static-regeneration) |
| Deep Dive / Advanced Article | [patterns.dev — Incremental Static Regeneration](https://www.patterns.dev/vanilla/incremental-static-rendering) |
| Interview-Focused Article | [Blog — ISR Interview — LogRocket](https://blog.logrocket.com/incremental-static-regeneration-next-js/) |
| Video Explanation | [ISR Explained — Jack Herrington](https://www.youtube.com/watch?v=nrfuN_Hyd3Y) |

214. Partial Pre-Rendering (PPR) — Next.js 14+ ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Next.js Docs — Partial Prerendering](https://nextjs.org/docs/app/building-your-application/rendering/partial-prerendering) |
| Deep Dive / Advanced Article | [Vercel Blog — PPR](https://vercel.com/blog/partial-prerendering-with-next-js-creating-a-new-default-rendering-model) |
| Interview-Focused Article | [Blog — PPR Interview — LogRocket](https://blog.logrocket.com/next-js-app-router/) |
| Video Explanation | [PPR Explained — Jack Herrington](https://www.youtube.com/watch?v=wv7LmPHTGnI) |


### ⚡ Module 11.2: Advanced Rendering
215. Streaming & Progressive Rendering

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Streaming](https://web.dev/articles/rendering-on-the-web#streaming) |
| Deep Dive / Advanced Article | [patterns.dev — Progressive Hydration](https://www.patterns.dev/vanilla/progressive-hydration) |
| Interview-Focused Article | [Blog — Streaming SSR Interview — LogRocket](https://blog.logrocket.com/streaming-ssr-with-react-18/) |
| Video Explanation | [Streaming SSR — Jack Herrington](https://www.youtube.com/watch?v=3JB_qEk39w0) |

216. Hydration & Partial Hydration

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Hydration](https://web.dev/articles/rendering-on-the-web#rehydration) |
| Deep Dive / Advanced Article | [patterns.dev — Progressive Hydration](https://www.patterns.dev/vanilla/progressive-hydration) |
| Interview-Focused Article | [Blog — Hydration Interview — LogRocket](https://blog.logrocket.com/what-is-hydration-react/) |
| Video Explanation | [Hydration Explained — Jack Herrington](https://www.youtube.com/watch?v=R-BKadZWYnQ) |

217. Islands Architecture

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [patterns.dev — Islands Architecture](https://www.patterns.dev/vanilla/islands-architecture) |
| Deep Dive / Advanced Article | [Blog — Islands Architecture — Jason Miller](https://jasonformat.com/islands-architecture/) |
| Interview-Focused Article | [Blog — Islands Architecture Interview — Dev.to](https://dev.to/this-is-learning/islands-architecture-5eh9) |
| Video Explanation | [Islands Architecture — Fireship](https://www.youtube.com/watch?v=x7v5_F7NZWY) |

218. React Server Components Deep Dive (applied)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Server Components](https://react.dev/reference/rsc/server-components) |
| Deep Dive / Advanced Article | [Blog — RSC Deep Dive — Josh W. Comeau](https://www.joshwcomeau.com/react/server-components/) |
| Interview-Focused Article | [Blog — RSC Interview — LogRocket](https://blog.logrocket.com/react-server-components-comprehensive-guide/) |
| Video Explanation | [React Server Components — Jack Herrington](https://www.youtube.com/watch?v=TQQPAU21ZUw) |


### ⚖️ Module 11.3: Rendering Trade-offs
219. CSR vs SSR vs SSG Trade-offs

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Rendering on the Web](https://web.dev/articles/rendering-on-the-web) |
| Deep Dive / Advanced Article | [Blog — CSR vs SSR vs SSG — Vercel](https://vercel.com/blog/understanding-react-server-components) |
| Interview-Focused Article | [GreatFrontEnd — Rendering Strategies](https://www.greatfrontend.com/system-design) |
| Video Explanation | [CSR vs SSR vs SSG — Fireship](https://www.youtube.com/watch?v=Dkx5ydvtpCA) |

220. Blocking vs Non-Blocking Rendering

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Render-Blocking Resources](https://web.dev/articles/render-blocking-resources) |
| Deep Dive / Advanced Article | [MDN — Render-Blocking CSS](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Blocking vs Non-Blocking — Google Chrome Developers](https://www.youtube.com/watch?v=bmIUYBNKja4) |


### 🚀 Module 11.4: Render Performance
221. Render-Blocking CSS & JavaScript

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Eliminate Render-Blocking Resources](https://web.dev/articles/render-blocking-resources) |
| Deep Dive / Advanced Article | [MDN — Render-Blocking CSS/JS](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Render-Blocking Resources — Google Chrome Developers](https://www.youtube.com/watch?v=bmIUYBNKja4) |

222. Critical CSS Inlining

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Extract Critical CSS](https://web.dev/articles/extract-critical-css) |
| Deep Dive / Advanced Article | [Blog — Critical CSS Inlining — Smashing Magazine](https://www.smashingmagazine.com/2015/08/understanding-critical-css/) |
| Interview-Focused Article | [GreatFrontEnd — CSS Interview](https://www.greatfrontend.com/front-end-interview-guidebook/css) |
| Video Explanation | [Critical CSS — Google Chrome Developers](https://www.youtube.com/watch?v=YJGCZCaIZkQ) |

223. Preload vs Prefetch vs Preconnect

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Preload, Prefetch, Preconnect](https://web.dev/articles/preload-critical-assets) |
| Deep Dive / Advanced Article | [MDN — rel=preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preload) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [Resource Hints — Google Chrome Developers](https://www.youtube.com/watch?v=YJGCZCaIZkQ) |

224. Time-to-Interactive (TTI) Trade-offs

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Time to Interactive](https://web.dev/articles/tti) |
| Deep Dive / Advanced Article | [Blog — TTI Optimization — Calibre](https://calibreapp.com/blog/time-to-interactive) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [TTI Optimization — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc) |

225. Speculation Rules API ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Chrome — Speculation Rules API](https://developer.chrome.com/docs/web-platform/prerender-pages) |
| Deep Dive / Advanced Article | [Blog — Speculation Rules — Chrome Developers](https://developer.chrome.com/blog/prerender-pages) |
| Interview-Focused Article | [Blog — Speculation Rules Interview — web.dev](https://web.dev/articles/speculative-loading) |
| Video Explanation | [Speculation Rules — Google Chrome Developers](https://www.youtube.com/watch?v=2sFqo-bAKBo) |


---
---

# 🔐 PHASE 5 — RELIABILITY & SECURITY
> Week 7 | Your SAP security work covers most of this. Formalise it.

---

## SEQUENCE 1️⃣2️⃣ — Caching & Offline
> Reliability foundation. Cisco and Microsoft care deeply here.

### 🧊 Module 12.1: Caching Layers
226. HTTP Caching

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) |
| Deep Dive / Advanced Article | [web.dev — HTTP Cache](https://web.dev/articles/http-cache) |
| Interview-Focused Article | [GreatFrontEnd — Network Interview](https://www.greatfrontend.com/front-end-interview-guidebook/network) |
| Video Explanation | [HTTP Caching — Hussein Nasser](https://www.youtube.com/watch?v=HiBDZgTNpXY) |

227. Browser Cache

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) |
| Deep Dive / Advanced Article | [Chrome — Network Panel: Browser Cache](https://developer.chrome.com/docs/devtools/network/reference) |
| Interview-Focused Article | [GreatFrontEnd — Network Interview](https://www.greatfrontend.com/front-end-interview-guidebook/network) |
| Video Explanation | [Browser Cache — Hussein Nasser](https://www.youtube.com/watch?v=HiBDZgTNpXY) |

228. Edge Caching vs Origin Caching ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Cloudflare — Edge vs Origin](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/) |
| Deep Dive / Advanced Article | [Blog — Edge Caching — Vercel](https://vercel.com/docs/edge-network/caching) |
| Interview-Focused Article | [Blog — Edge Caching Interview — Cloudflare](https://www.cloudflare.com/learning/cdn/what-is-edge-caching/) |
| Video Explanation | [Edge Caching — Hussein Nasser](https://www.youtube.com/watch?v=jC3_AtEVpj0) |


### 🔧 Module 12.2: Client Persistence
229. Service Workers (applied to caching)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) |
| Deep Dive / Advanced Article | [web.dev — Service Worker Caching Strategies](https://web.dev/articles/offline-cookbook) |
| Interview-Focused Article | [Blog — Service Worker Interview — LogRocket](https://blog.logrocket.com/service-worker-lifecycle/) |
| Video Explanation | [Service Worker Caching — Google Chrome Developers](https://www.youtube.com/watch?v=ksXwaWHCW6k) |

230. IndexedDB

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) |
| Deep Dive / Advanced Article | [web.dev — IndexedDB Guide](https://web.dev/articles/indexeddb) |
| Interview-Focused Article | [Blog — IndexedDB Interview — LogRocket](https://blog.logrocket.com/using-indexeddb/) |
| Video Explanation | [IndexedDB — Google Chrome Developers](https://www.youtube.com/watch?v=g4U5WRzHitM) |

231. LocalStorage vs SessionStorage

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) |
| Deep Dive / Advanced Article | [web.dev — Storage for the Web](https://web.dev/articles/storage-for-the-web) |
| Interview-Focused Article | [GreatFrontEnd — LocalStorage vs SessionStorage](https://www.greatfrontend.com/questions/quiz/describe-the-difference-between-a-cookie-sessionstorage-and-localstorage) |
| Video Explanation | [localStorage vs sessionStorage — Traversy Media](https://www.youtube.com/watch?v=GihQAC1I39Q) |

232. Cache API & Workbox Library ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) |
| Deep Dive / Advanced Article | [Workbox Docs](https://developer.chrome.com/docs/workbox) |
| Interview-Focused Article | [Blog — Workbox Interview — LogRocket](https://blog.logrocket.com/workbox-4-implementing-caching-strategies/) |
| Video Explanation | [Workbox — Google Chrome Developers](https://www.youtube.com/watch?v=sOq92prx00w) |


### ♻️ Module 12.3: Cache Strategy
233. Cache Invalidation

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Cache Invalidation](https://web.dev/articles/http-cache#invalidating-and-updating-cached-responses) |
| Deep Dive / Advanced Article | [Blog — Cache Invalidation Strategies — LogRocket](https://blog.logrocket.com/web-caching-strategies/) |
| Interview-Focused Article | [Blog — Caching Interview Questions — Dev.to](https://dev.to/pragativerma18/caching-strategies-in-frontend-4h7k) |
| Video Explanation | [Cache Invalidation — Hussein Nasser](https://www.youtube.com/watch?v=U3RkDLtS7uY) |

234. Offline-First Architecture

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Offline Cookbook](https://web.dev/articles/offline-cookbook) |
| Deep Dive / Advanced Article | [Blog — Offline-First Architecture — LogRocket](https://blog.logrocket.com/building-offline-first-app/) |
| Interview-Focused Article | [Blog — Offline-First Interview — Dev.to](https://dev.to/nickytonline/offline-first-web-apps-5c3i) |
| Video Explanation | [Offline-First Apps — Google Chrome Developers](https://www.youtube.com/watch?v=cmGr0RszHc8) |

235. Handling Stale Data

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Stale-While-Revalidate](https://web.dev/articles/stale-while-revalidate) |
| Deep Dive / Advanced Article | [Blog — Handling Stale Data — TkDodo](https://tkdodo.eu/blog/practical-react-query) |
| Interview-Focused Article | [Blog — SWR Interview — LogRocket](https://blog.logrocket.com/web-caching-strategies/) |
| Video Explanation | [SWR Strategy — Hussein Nasser](https://www.youtube.com/watch?v=U3RkDLtS7uY) |

236. Cache-Control by Page Type

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) |
| Deep Dive / Advanced Article | [web.dev — HTTP Cache Headers](https://web.dev/articles/http-cache) |
| Interview-Focused Article | [Blog — Cache-Control Interview — Dev.to](https://dev.to/pragativerma18/caching-strategies-in-frontend-4h7k) |
| Video Explanation | [Cache-Control Headers — Hussein Nasser](https://www.youtube.com/watch?v=HiBDZgTNpXY) |

237. Stale-While-Revalidate

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Stale-While-Revalidate](https://web.dev/articles/stale-while-revalidate) |
| Deep Dive / Advanced Article | [MDN — stale-while-revalidate](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate) |
| Interview-Focused Article | [Blog — SWR Interview — LogRocket](https://blog.logrocket.com/web-caching-strategies/) |
| Video Explanation | [Stale While Revalidate — Hussein Nasser](https://www.youtube.com/watch?v=U3RkDLtS7uY) |

238. Cache Poisoning Awareness

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [OWASP — Cache Poisoning](https://owasp.org/www-community/attacks/Cache_Poisoning) |
| Deep Dive / Advanced Article | [Blog — Cache Poisoning — PortSwigger](https://portswigger.net/web-security/web-cache-poisoning) |
| Interview-Focused Article | [Blog — Cache Poisoning Interview — PortSwigger](https://portswigger.net/web-security/web-cache-poisoning) |
| Video Explanation | [Cache Poisoning — PwnFunction](https://www.youtube.com/watch?v=iWd0sLj-_uI) |

239. Background Sync API ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API) |
| Deep Dive / Advanced Article | [web.dev — Background Sync](https://web.dev/articles/background-sync) |
| Interview-Focused Article | [Blog — Background Sync Interview — LogRocket](https://blog.logrocket.com/building-offline-first-app/) |
| Video Explanation | [Background Sync — Google Chrome Developers](https://www.youtube.com/watch?v=l4e_LFozK2k) |


---

## SEQUENCE 1️⃣3️⃣ — Security
> Your 80% vulnerability reduction story directly answers most of this.

### 🔐 Module 13.1: Web Threats
240. XSS — Types, Prevention, Real Examples

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Cross-Site Scripting (XSS)](https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting) |
| Deep Dive / Advanced Article | [OWASP — XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) |
| Interview-Focused Article | [Blog — XSS Interview Questions — PortSwigger](https://portswigger.net/web-security/cross-site-scripting) |
| Video Explanation | [XSS Explained — PwnFunction](https://www.youtube.com/watch?v=EoaDgUgS6QA) |

241. CSRF — SameSite Cookies, CSRF Tokens

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — CSRF](https://developer.mozilla.org/en-US/docs/Glossary/CSRF) |
| Deep Dive / Advanced Article | [OWASP — CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) |
| Interview-Focused Article | [Blog — CSRF Interview — PortSwigger](https://portswigger.net/web-security/csrf) |
| Video Explanation | [CSRF Explained — PwnFunction](https://www.youtube.com/watch?v=eWEgUcHPle0) |

242. CORS — Preflight, Credentialed Requests

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) |
| Deep Dive / Advanced Article | [web.dev — Cross-Origin Resource Sharing](https://web.dev/articles/cross-origin-resource-sharing) |
| Interview-Focused Article | [GreatFrontEnd — CORS Interview](https://www.greatfrontend.com/questions/quiz/explain-cors) |
| Video Explanation | [CORS in 100 Seconds — Fireship](https://www.youtube.com/watch?v=4KHiSt0oLJ0) |

243. Prototype Pollution ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Prototype Pollution](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) |
| Deep Dive / Advanced Article | [Blog — Prototype Pollution — Snyk](https://snyk.io/blog/after-three-years-of-silence-prototype-pollution-still-a-menace/) |
| Interview-Focused Article | [Blog — Prototype Pollution Interview — PortSwigger](https://portswigger.net/web-security/prototype-pollution) |
| Video Explanation | [Prototype Pollution — PwnFunction](https://www.youtube.com/watch?v=LUsiFV3dsK8) |

244. Supply Chain Attacks — npm package security ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [npm — Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code) |
| Deep Dive / Advanced Article | [Blog — Supply Chain Attacks — Snyk](https://snyk.io/blog/npm-supply-chain-security/) |
| Interview-Focused Article | [Blog — npm Security Interview — Dev.to](https://dev.to/snyk/javascript-supply-chain-security-2o9p) |
| Video Explanation | [Supply Chain Attacks — Fireship](https://www.youtube.com/watch?v=GRH-5LBTEw4) |


### 🔑 Module 13.2: Auth & Tokens
245. Authentication Flows

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — HTTP Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication) |
| Deep Dive / Advanced Article | [Auth0 — Authentication Guide](https://auth0.com/docs/get-started/authentication-and-authorization) |
| Interview-Focused Article | [Blog — Auth Interview Questions — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Authentication Explained — Fireship](https://www.youtube.com/watch?v=Mcyt_CBR_GY) |

246. Token Storage — localStorage vs httpOnly cookie trade-offs

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [OWASP — Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) |
| Deep Dive / Advanced Article | [Blog — Token Storage Best Practices — Auth0](https://auth0.com/docs/secure/security-guidance/data-security/token-storage) |
| Interview-Focused Article | [Blog — Token Storage Interview — Dev.to](https://dev.to/cotter/localstorage-vs-cookies-all-you-need-to-know-about-storing-jwt-tokens-securely-in-the-front-end-5ha) |
| Video Explanation | [Token Storage — Fireship](https://www.youtube.com/watch?v=GhrvZ5nUWNg) |

247. OAuth 2.0 & OIDC Flows

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [OAuth 2.0 — RFC 6749](https://oauth.net/2/) |
| Deep Dive / Advanced Article | [Auth0 — OAuth 2.0 & OIDC Guide](https://auth0.com/docs/authenticate/protocols/openid-connect-protocol) |
| Interview-Focused Article | [Blog — OAuth Interview Questions — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [OAuth 2.0 Explained — Fireship](https://www.youtube.com/watch?v=996OiexHze0) |

248. JWT Deep Dive — claims, expiry, refresh strategy ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — JWT](https://developer.mozilla.org/en-US/docs/Glossary/JWT) |
| Deep Dive / Advanced Article | [Blog — JWT Deep Dive — Auth0](https://auth0.com/learn/json-web-tokens) |
| Interview-Focused Article | [Blog — JWT Interview Questions — Dev.to](https://dev.to/pragativerma18/jwt-json-web-tokens-explained-25gj) |
| Video Explanation | [JWT Explained — Fireship](https://www.youtube.com/watch?v=7Q17ubqLfaM) |

249. Passkeys & WebAuthn ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API) |
| Deep Dive / Advanced Article | [web.dev — Passkeys](https://web.dev/articles/passkey-registration) |
| Interview-Focused Article | [Blog — Passkeys Interview — Auth0](https://auth0.com/blog/introduction-to-web-authentication/) |
| Video Explanation | [Passkeys Explained — Fireship](https://www.youtube.com/watch?v=qNpBYbMetms) |


### 🛡️ Module 13.3: Hardening UI
250. Protecting Sensitive UI Data

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [OWASP — Sensitive Data Exposure](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/) |
| Deep Dive / Advanced Article | [Blog — Protecting Sensitive UI Data — LogRocket](https://blog.logrocket.com/secure-react-app/) |
| Interview-Focused Article | [Blog — Frontend Security Interview — Dev.to](https://dev.to/snyk/10-frontend-security-best-practices-2o9p) |
| Video Explanation | [Frontend Security — Hitesh Choudhary](https://www.youtube.com/watch?v=3deNI25K4cY) |

251. Secure API Consumption

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [OWASP — API Security](https://owasp.org/www-project-api-security/) |
| Deep Dive / Advanced Article | [Blog — Secure API Consumption — LogRocket](https://blog.logrocket.com/secure-react-app/) |
| Interview-Focused Article | [Blog — API Security Interview — Dev.to](https://dev.to/snyk/10-frontend-security-best-practices-2o9p) |
| Video Explanation | [Secure API Calls — Fireship](https://www.youtube.com/watch?v=GhrvZ5nUWNg) |

252. Clickjacking — X-Frame-Options, frame-ancestors

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options) |
| Deep Dive / Advanced Article | [OWASP — Clickjacking](https://owasp.org/www-community/attacks/Clickjacking) |
| Interview-Focused Article | [Blog — Clickjacking Interview — PortSwigger](https://portswigger.net/web-security/clickjacking) |
| Video Explanation | [Clickjacking Explained — PwnFunction](https://www.youtube.com/watch?v=jcp5t8PsMsY) |

253. CSP — Policy Design, Nonce-Based, Report-Only Mode

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) |
| Deep Dive / Advanced Article | [web.dev — CSP Guide](https://web.dev/articles/csp) |
| Interview-Focused Article | [Blog — CSP Interview — PortSwigger](https://portswigger.net/web-security/cross-site-scripting/content-security-policy) |
| Video Explanation | [CSP Explained — PwnFunction](https://www.youtube.com/watch?v=txHc4zk6w3s) |

254. Secure Headers — Full Header Audit

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) |
| Deep Dive / Advanced Article | [OWASP — Secure Headers](https://owasp.org/www-project-secure-headers/) |
| Interview-Focused Article | [Blog — Security Headers Interview — Dev.to](https://dev.to/snyk/10-frontend-security-best-practices-2o9p) |
| Video Explanation | [Security Headers — Hussein Nasser](https://www.youtube.com/watch?v=Mhonrfh5O2A) |

255. Token Refresh — Silent Refresh Pattern

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Auth0 — Silent Authentication](https://auth0.com/docs/authenticate/login/configure-silent-authentication) |
| Deep Dive / Advanced Article | [Blog — Token Refresh Patterns — LogRocket](https://blog.logrocket.com/jwt-authentication-best-practices/) |
| Interview-Focused Article | [Blog — Token Refresh Interview — Dev.to](https://dev.to/cotter/localstorage-vs-cookies-all-you-need-to-know-about-storing-jwt-tokens-securely-in-the-front-end-5ha) |
| Video Explanation | [Silent Refresh — Fireship](https://www.youtube.com/watch?v=GhrvZ5nUWNg) |

256. Preventing Data Leaks in Browser DevTools ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Chrome DevTools — Security](https://developer.chrome.com/docs/devtools/security) |
| Deep Dive / Advanced Article | [Blog — Preventing DevTools Data Leaks — LogRocket](https://blog.logrocket.com/secure-react-app/) |
| Interview-Focused Article | [Blog — Frontend Security Interview — Dev.to](https://dev.to/snyk/10-frontend-security-best-practices-2o9p) |
| Video Explanation | [DevTools Security — Google Chrome Developers](https://www.youtube.com/watch?v=YjMFjXiWsps) |

257. Subresource Integrity (SRI) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) |
| Deep Dive / Advanced Article | [web.dev — SRI](https://web.dev/articles/csp#use_case_4_subresource_integrity) |
| Interview-Focused Article | [Blog — SRI Interview — Dev.to](https://dev.to/snyk/10-frontend-security-best-practices-2o9p) |
| Video Explanation | [SRI Explained — Hussein Nasser](https://www.youtube.com/watch?v=Mhonrfh5O2A) |


---

## SEQUENCE 1️⃣4️⃣ — Authorization & Access Control
> Builds on Security. Salesforce and Cisco-specific depth.

### 🧠 Module 14.1: Foundations
258. Authentication vs Authorization

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Auth0 — AuthN vs AuthZ](https://auth0.com/docs/get-started/authentication-and-authorization) |
| Deep Dive / Advanced Article | [Blog — AuthN vs AuthZ — Okta](https://www.okta.com/identity-101/authentication-vs-authorization/) |
| Interview-Focused Article | [Blog — Auth Interview Questions — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [AuthN vs AuthZ — Fireship](https://www.youtube.com/watch?v=996OiexHze0) |

259. Permission Modeling

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Auth0 — Authorization](https://auth0.com/docs/manage-users/access-control) |
| Deep Dive / Advanced Article | [Blog — Permission Modeling — Okta](https://www.okta.com/identity-101/role-based-access-control-vs-attribute-based-access-control/) |
| Interview-Focused Article | [Blog — Permission Modeling Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Permission Systems — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

260. Backend vs Frontend Enforcement

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [OWASP — Access Control](https://owasp.org/www-community/Access_Control) |
| Deep Dive / Advanced Article | [Blog — Frontend vs Backend Auth — LogRocket](https://blog.logrocket.com/secure-react-app/) |
| Interview-Focused Article | [Blog — Access Control Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Frontend vs Backend Enforcement — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


### 🗂️ Module 14.2: Access Control Models
261. Role-Based Access Control (RBAC)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Auth0 — RBAC](https://auth0.com/docs/manage-users/access-control/rbac) |
| Deep Dive / Advanced Article | [Blog — RBAC Guide — Okta](https://www.okta.com/identity-101/role-based-access-control-vs-attribute-based-access-control/) |
| Interview-Focused Article | [Blog — RBAC Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [RBAC Explained — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

262. Attribute-Based Access Control (ABAC)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Auth0 — ABAC](https://auth0.com/docs/manage-users/access-control) |
| Deep Dive / Advanced Article | [Blog — ABAC vs RBAC — Okta](https://www.okta.com/identity-101/role-based-access-control-vs-attribute-based-access-control/) |
| Interview-Focused Article | [Blog — ABAC Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [ABAC Explained — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

263. Policy-Based Authorization

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Auth0 — Authorization Policies](https://auth0.com/docs/manage-users/access-control) |
| Deep Dive / Advanced Article | [Blog — Policy-Based Authorization — LogRocket](https://blog.logrocket.com/secure-react-app/) |
| Interview-Focused Article | [Blog — Authorization Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Policy-Based Auth — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


### 🛡️ Module 14.3: Frontend Authorization Design
264. Frontend Authorization Guards

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Route Guards](https://angular.dev/guide/routing/route-guards) |
| Deep Dive / Advanced Article | [Blog — Frontend Auth Guards — LogRocket](https://blog.logrocket.com/complete-guide-authentication-with-react-router-v6/) |
| Interview-Focused Article | [Blog — Auth Guards Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Route Guards — Codevolution](https://www.youtube.com/watch?v=tiV-kpJ4jMY) |

265. Feature-Level Access Control

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Feature Flags — Martin Fowler](https://martinfowler.com/articles/feature-toggles.html) |
| Deep Dive / Advanced Article | [Blog — Feature-Level Access Control — LogRocket](https://blog.logrocket.com/secure-react-app/) |
| Interview-Focused Article | [Blog — Feature Access Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Feature Flags — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs) |

266. Data-Level Security

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [OWASP — Access Control](https://owasp.org/www-community/Access_Control) |
| Deep Dive / Advanced Article | [Blog — Data-Level Security — LogRocket](https://blog.logrocket.com/secure-react-app/) |
| Interview-Focused Article | [Blog — Data Security Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Data-Level Security — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

267. Route Guards — Angular & React Router ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Route Guards](https://angular.dev/guide/routing/route-guards) |
| Deep Dive / Advanced Article | [React Router — Auth Guide](https://reactrouter.com/en/main/start/concepts) |
| Interview-Focused Article | [Blog — Route Guards Interview — LogRocket](https://blog.logrocket.com/complete-guide-authentication-with-react-router-v6/) |
| Video Explanation | [React Route Guards — Codevolution](https://www.youtube.com/watch?v=tiV-kpJ4jMY) |


### 🏢 Module 14.4: Enterprise & Multi-Tenant Design
268. Multi-Tenant Authorization

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Multi-Tenant Architecture — AWS](https://aws.amazon.com/solutions/multi-tenant-saas/) |
| Deep Dive / Advanced Article | [Blog — Multi-Tenant Auth — LogRocket](https://blog.logrocket.com/secure-react-app/) |
| Interview-Focused Article | [Blog — Multi-Tenancy Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Multi-Tenancy — Hussein Nasser](https://www.youtube.com/watch?v=x8vtmX4vF9I) |

269. Privilege Escalation Prevention

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [OWASP — Privilege Escalation](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/) |
| Deep Dive / Advanced Article | [Blog — Privilege Escalation Prevention — OWASP](https://owasp.org/www-community/attacks/) |
| Interview-Focused Article | [Blog — Privilege Escalation Interview — PortSwigger](https://portswigger.net/web-security/access-control) |
| Video Explanation | [Privilege Escalation — PwnFunction](https://www.youtube.com/watch?v=dz7Ntp7KEIA) |

270. Salesforce Permission Sets — LWC Context ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Salesforce — Permission Sets](https://developer.salesforce.com/docs/atlas.en-us.securityImplGuide.meta/securityImplGuide/perm_sets_overview.htm) |
| Deep Dive / Advanced Article | [Salesforce — LWC Security](https://developer.salesforce.com/docs/platform/lwc/guide/security.html) |
| Interview-Focused Article | [Blog — Salesforce Security Interview — Trailhead](https://trailhead.salesforce.com/content/learn/modules/data_security) |
| Video Explanation | [Salesforce Permissions — Salesforce Developers](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


### ⚡ Module 14.5: Scale & Performance
271. Authorization Caching

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Caching Authorization — Auth0](https://auth0.com/docs/manage-users/access-control) |
| Deep Dive / Advanced Article | [Blog — Auth Caching Strategies — LogRocket](https://blog.logrocket.com/secure-react-app/) |
| Interview-Focused Article | [Blog — Auth Caching Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Auth Caching — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

272. Authorization at Scale

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Authorization at Scale — Google](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/) |
| Deep Dive / Advanced Article | [Blog — Zanzibar Paper — Google Research](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/) |
| Interview-Focused Article | [Blog — Auth at Scale Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Google Zanzibar — Hussein Nasser](https://www.youtube.com/watch?v=1nbSbe3XRQA) |


### 📋 Module 14.6: Governance & Monitoring
273. Auditing & Logging

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [OWASP — Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) |
| Deep Dive / Advanced Article | [Blog — Frontend Audit Logging — LogRocket](https://blog.logrocket.com/frontend-logging/) |
| Interview-Focused Article | [Blog — Logging Interview — Dev.to](https://dev.to/pragativerma18/authentication-vs-authorization-3a9p) |
| Video Explanation | [Audit Logging — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

274. Compliance Logging for Regulated Industries (GDPR, SOC2) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GDPR — Official Site](https://gdpr.eu/) |
| Deep Dive / Advanced Article | [Blog — GDPR Compliance in Frontend — LogRocket](https://blog.logrocket.com/gdpr-compliance-react/) |
| Interview-Focused Article | [Blog — GDPR Interview Questions — Dev.to](https://dev.to/pragativerma18/gdpr-compliance-for-developers-2l5a) |
| Video Explanation | [GDPR for Developers — Fireship](https://www.youtube.com/watch?v=Bs0IH_SdecE) |


---
---

# 🌐 PHASE 6 — SCALABILITY & REAL-TIME
> Week 8 | Enterprise-scale thinking. Cisco real-time + Salesforce scale.

---

## SEQUENCE 1️⃣5️⃣ — Real-Time Systems
> Your Bosch WebSocket story lives here. Most candidates have zero real experience here.

### 🔁 Module 15.1: Transport Mechanisms
275. Polling vs Long Polling

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) |
| Deep Dive / Advanced Article | [Blog — Polling vs WebSockets — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/) |
| Interview-Focused Article | [Blog — Real-Time Interview — Dev.to](https://dev.to/pragativerma18/real-time-communication-websockets-sse-polling-3e2g) |
| Video Explanation | [Polling vs SSE vs WebSocket — Hussein Nasser](https://www.youtube.com/watch?v=ZBM28ZPlin8) |

276. WebSockets

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) |
| Deep Dive / Advanced Article | [Blog — WebSocket Deep Dive — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/) |
| Interview-Focused Article | [Blog — WebSocket Interview — Dev.to](https://dev.to/pragativerma18/real-time-communication-websockets-sse-polling-3e2g) |
| Video Explanation | [WebSockets in 100 Seconds — Fireship](https://www.youtube.com/watch?v=1BfCnjr_Vjg) |

277. Server-Sent Events

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) |
| Deep Dive / Advanced Article | [Blog — SSE Guide — LogRocket](https://blog.logrocket.com/using-server-sent-events-node-js/) |
| Interview-Focused Article | [Blog — SSE Interview — Dev.to](https://dev.to/pragativerma18/real-time-communication-websockets-sse-polling-3e2g) |
| Video Explanation | [Server-Sent Events — Hussein Nasser](https://www.youtube.com/watch?v=4HlNv1qpZFY) |

278. WebTransport API — Next-gen real-time ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — WebTransport API](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API) |
| Deep Dive / Advanced Article | [web.dev — WebTransport](https://web.dev/articles/webtransport) |
| Interview-Focused Article | [Blog — WebTransport Interview — Dev.to](https://dev.to/nickytonline/webtransport-next-gen-real-time-4l2g) |
| Video Explanation | [WebTransport — Hussein Nasser](https://www.youtube.com/watch?v=vGZfF5jk1Lo) |


### ⚡ Module 15.2: Real-Time UI
279. Real-Time UI Updates

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) |
| Deep Dive / Advanced Article | [Blog — Real-Time UI Updates — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/) |
| Interview-Focused Article | [Blog — Real-Time Interview — Dev.to](https://dev.to/pragativerma18/real-time-communication-websockets-sse-polling-3e2g) |
| Video Explanation | [Real-Time UI — Jack Herrington](https://www.youtube.com/watch?v=4hKXkRs4cUc) |

280. Reconnection & Backoff

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Exponential Backoff — AWS](https://docs.aws.amazon.com/general/latest/gr/api-retries.html) |
| Deep Dive / Advanced Article | [Blog — WebSocket Reconnection — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/) |
| Interview-Focused Article | [Blog — Reconnection Interview — Dev.to](https://dev.to/pragativerma18/real-time-communication-websockets-sse-polling-3e2g) |
| Video Explanation | [Exponential Backoff — Hussein Nasser](https://www.youtube.com/watch?v=MCGFV7ahkeA) |

281. Handling Partial Failures

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Partial Failures — AWS](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/distributed-systems-complexity.html) |
| Deep Dive / Advanced Article | [Blog — Handling Failures — LogRocket](https://blog.logrocket.com/error-handling-react/) |
| Interview-Focused Article | [Blog — Partial Failure Interview — Dev.to](https://dev.to/pragativerma18/real-time-communication-websockets-sse-polling-3e2g) |
| Video Explanation | [Partial Failures — Hussein Nasser](https://www.youtube.com/watch?v=ADHcBxEXvCo) |

282. Optimistic Updates with Rollback ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Updating Objects in State](https://react.dev/learn/updating-objects-in-state) |
| Deep Dive / Advanced Article | [Blog — Optimistic Updates with Rollback — LogRocket](https://blog.logrocket.com/optimistic-ui-updates-react/) |
| Interview-Focused Article | [Blog — Optimistic UI Interview — Dev.to](https://dev.to/pragativerma18/real-time-communication-websockets-sse-polling-3e2g) |
| Video Explanation | [Optimistic UI — Jack Herrington](https://www.youtube.com/watch?v=M3mGY0pgFk0) |

283. Presence Indicators & Typing Indicators ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Building Presence — Ably](https://ably.com/blog/scalable-presence) |
| Deep Dive / Advanced Article | [Blog — Typing Indicators — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/) |
| Interview-Focused Article | [Blog — Presence Indicators Interview — Dev.to](https://dev.to/pragativerma18/real-time-communication-websockets-sse-polling-3e2g) |
| Video Explanation | [Building Presence — Fireship](https://www.youtube.com/watch?v=1BfCnjr_Vjg) |


### 🧠 Module 15.3: Consistency
284. Message Ordering

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Message Ordering — Ably](https://ably.com/topic/message-ordering) |
| Deep Dive / Advanced Article | [Blog — Distributed Message Order — Martin Kleppmann](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/) |
| Interview-Focused Article | [Blog — Message Ordering Interview — Dev.to](https://dev.to/pragativerma18/real-time-communication-websockets-sse-polling-3e2g) |
| Video Explanation | [Message Ordering — Hussein Nasser](https://www.youtube.com/watch?v=szKjz_qbcvA) |

285. Event De-duplication

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Event Deduplication — AWS](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/distributed-systems-complexity.html) |
| Deep Dive / Advanced Article | [Blog — Deduplication Strategies — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/) |
| Interview-Focused Article | [Blog — Deduplication Interview — Dev.to](https://dev.to/pragativerma18/real-time-communication-websockets-sse-polling-3e2g) |
| Video Explanation | [Event Deduplication — Hussein Nasser](https://www.youtube.com/watch?v=szKjz_qbcvA) |

286. Idempotency in Frontend Events

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Idempotency — Stripe](https://stripe.com/docs/api/idempotent_requests) |
| Deep Dive / Advanced Article | [Blog — Idempotency in APIs — LogRocket](https://blog.logrocket.com/api-versioning-best-practices/) |
| Interview-Focused Article | [Blog — Idempotency Interview — Dev.to](https://dev.to/pragativerma18/all-about-http-retry-6mk) |
| Video Explanation | [Idempotency — Hussein Nasser](https://www.youtube.com/watch?v=4OuaONkZw1I) |

287. Conflict Resolution in Collaborative UIs ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — CRDTs — Martin Kleppmann](https://crdt.tech/) |
| Deep Dive / Advanced Article | [Blog — Conflict Resolution in Collaborative Apps — Figma](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) |
| Interview-Focused Article | [Blog — CRDT Interview — Dev.to](https://dev.to/nickytonline/crdts-for-collaborative-editing-5c3i) |
| Video Explanation | [CRDTs Explained — Fireship](https://www.youtube.com/watch?v=M8-WFTjZoA0) |


---

## SEQUENCE 1️⃣6️⃣ — Scalability & Growth
> Big-scale thinking. Salesforce and Microsoft especially.

### 📈 Module 16.1: Scaling Patterns
288. Designing for Millions

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Performance for Millions](https://web.dev/performance) |
| Deep Dive / Advanced Article | [Blog — Designing for Scale — Netflix Tech Blog](https://netflixtechblog.com/) |
| Interview-Focused Article | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Designing for Scale — Fireship](https://www.youtube.com/watch?v=lkIFF4maKMU) |

289. CDN-First Architecture

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Cloudflare — CDN Architecture](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/) |
| Deep Dive / Advanced Article | [Blog — CDN-First Architecture — Vercel](https://vercel.com/docs/edge-network/overview) |
| Interview-Focused Article | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Video Explanation | [CDN Architecture — Hussein Nasser](https://www.youtube.com/watch?v=RI9np1LWzqw) |

290. Frontend Load Shedding

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Load Shedding — Netflix](https://netflixtechblog.com/performance-under-load-3e6fa9a60581) |
| Deep Dive / Advanced Article | [Blog — Frontend Load Shedding — LogRocket](https://blog.logrocket.com/progressive-enhancement-vs-graceful-degradation/) |
| Interview-Focused Article | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Load Shedding — Hussein Nasser](https://www.youtube.com/watch?v=mhUQe4BKZXs) |

291. Rate Limiting at the UI Layer ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Rate Limiting — Cloudflare](https://www.cloudflare.com/learning/bots/what-is-rate-limiting/) |
| Deep Dive / Advanced Article | [Blog — Client-Side Rate Limiting — LogRocket](https://blog.logrocket.com/rate-limiting-node-js/) |
| Interview-Focused Article | [Blog — Rate Limiting Interview — Dev.to](https://dev.to/pragativerma18/all-about-http-retry-6mk) |
| Video Explanation | [Rate Limiting — Hussein Nasser](https://www.youtube.com/watch?v=mhUQe4BKZXs) |


### 🧪 Module 16.2: Experimentation
292. Feature Flags

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Feature Toggles — Martin Fowler](https://martinfowler.com/articles/feature-toggles.html) |
| Deep Dive / Advanced Article | [Blog — Feature Flags Guide — LaunchDarkly](https://launchdarkly.com/blog/what-are-feature-flags/) |
| Interview-Focused Article | [Blog — Feature Flags Interview — Dev.to](https://dev.to/emmabostian/feature-flags-101-4l2g) |
| Video Explanation | [Feature Flags — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs) |

293. A/B Testing

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — A/B Testing — Google](https://developers.google.com/analytics/devguides/collection/ga4/experiment) |
| Deep Dive / Advanced Article | [Blog — A/B Testing Guide — LogRocket](https://blog.logrocket.com/a-b-testing-react/) |
| Interview-Focused Article | [Blog — A/B Testing Interview — Dev.to](https://dev.to/pragativerma18/a-b-testing-everything-you-need-to-know-2l5a) |
| Video Explanation | [A/B Testing — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs) |

294. Canary Releases & Frontend Rollout Strategy ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Canary Releases — Martin Fowler](https://martinfowler.com/bliki/CanaryRelease.html) |
| Deep Dive / Advanced Article | [Blog — Frontend Rollout Strategy — LaunchDarkly](https://launchdarkly.com/blog/what-are-feature-flags/) |
| Interview-Focused Article | [Blog — Canary Release Interview — Dev.to](https://dev.to/emmabostian/feature-flags-101-4l2g) |
| Video Explanation | [Canary Releases — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs) |


### 🌍 Module 16.3: Globalization
295. Internationalization (i18n)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) |
| Deep Dive / Advanced Article | [Blog — i18n in React — LogRocket](https://blog.logrocket.com/react-i18n-tutorial/) |
| Interview-Focused Article | [Blog — i18n Interview Questions — Dev.to](https://dev.to/nickytonline/internationalization-i18n-5c3i) |
| Video Explanation | [i18n in React — Codevolution](https://www.youtube.com/watch?v=txiggf6TDpo) |

296. Theming & White-Labeling

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) |
| Deep Dive / Advanced Article | [Blog — Theming with CSS Variables — LogRocket](https://blog.logrocket.com/a-guide-to-theming-in-css/) |
| Interview-Focused Article | [Blog — Theming Interview — Dev.to](https://dev.to/nickytonline/theming-in-frontend-5c3i) |
| Video Explanation | [CSS Theming — Kevin Powell](https://www.youtube.com/watch?v=GtB8DLsg94k) |

297. Multi-Tenant UI

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Multi-Tenant UI — AWS](https://aws.amazon.com/solutions/multi-tenant-saas/) |
| Deep Dive / Advanced Article | [Blog — Multi-Tenant Frontend — LogRocket](https://blog.logrocket.com/progressive-enhancement-vs-graceful-degradation/) |
| Interview-Focused Article | [Blog — Multi-Tenant Interview — Dev.to](https://dev.to/pragativerma18/multi-tenant-architecture-2l5a) |
| Video Explanation | [Multi-Tenant UI — Hussein Nasser](https://www.youtube.com/watch?v=x8vtmX4vF9I) |

298. RTL (Right-to-Left) Layout Support ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) |
| Deep Dive / Advanced Article | [Blog — RTL Support — LogRocket](https://blog.logrocket.com/building-multilingual-rtl-ltr-website/) |
| Interview-Focused Article | [Blog — RTL Interview — Dev.to](https://dev.to/nickytonline/right-to-left-rtl-layout-support-5c3i) |
| Video Explanation | [RTL in CSS — Kevin Powell](https://www.youtube.com/watch?v=dZ9vQYSNVyo) |

299. Locale-Aware Formatting — dates, numbers, currency ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) |
| Deep Dive / Advanced Article | [Blog — Locale-Aware Formatting — LogRocket](https://blog.logrocket.com/react-i18n-tutorial/) |
| Interview-Focused Article | [Blog — Intl API Interview — Dev.to](https://dev.to/nickytonline/internationalization-i18n-5c3i) |
| Video Explanation | [Intl API Deep Dive — Fireship](https://www.youtube.com/watch?v=txiggf6TDpo) |


### 🌐 Module 16.4: Edge & Resilience
300. Edge Rendering

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Vercel — Edge Functions](https://vercel.com/docs/functions/edge-functions) |
| Deep Dive / Advanced Article | [Blog — Edge Rendering — Vercel](https://vercel.com/docs/edge-network/overview) |
| Interview-Focused Article | [Blog — Edge Computing Interview — Cloudflare](https://www.cloudflare.com/learning/serverless/glossary/what-is-edge-computing/) |
| Video Explanation | [Edge Computing — Fireship](https://www.youtube.com/watch?v=yOP5-3_WFus) |

301. Geo-Based Delivery

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Cloudflare — Geo-Based Routing](https://www.cloudflare.com/learning/cdn/glossary/anycast-network/) |
| Deep Dive / Advanced Article | [Blog — Geo-Based Delivery — Vercel](https://vercel.com/docs/edge-network/regions) |
| Interview-Focused Article | [Blog — CDN Interview — Cloudflare](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/) |
| Video Explanation | [Geo-Based Routing — Hussein Nasser](https://www.youtube.com/watch?v=RI9np1LWzqw) |

302. Regional Failures

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Regional Failure Handling — Netflix](https://netflixtechblog.com/) |
| Deep Dive / Advanced Article | [Blog — Frontend Resilience — LogRocket](https://blog.logrocket.com/progressive-enhancement-vs-graceful-degradation/) |
| Interview-Focused Article | [Blog — Resilience Interview — Dev.to](https://dev.to/pragativerma18/all-about-http-retry-6mk) |
| Video Explanation | [Regional Failover — Hussein Nasser](https://www.youtube.com/watch?v=ADHcBxEXvCo) |

303. Progressive Rollouts

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Progressive Rollouts — LaunchDarkly](https://launchdarkly.com/blog/what-are-feature-flags/) |
| Deep Dive / Advanced Article | [Blog — Canary Releases — Martin Fowler](https://martinfowler.com/bliki/CanaryRelease.html) |
| Interview-Focused Article | [Blog — Rollout Strategy Interview — Dev.to](https://dev.to/emmabostian/feature-flags-101-4l2g) |
| Video Explanation | [Progressive Rollouts — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs) |


---
---

# ♿ PHASE 7 — QUALITY & OBSERVABILITY
> Week 8 | Your WCAG AA story + production ownership mindset.

---

## SEQUENCE 1️⃣7️⃣ — Accessibility & UX
> Your WCAG AA certification at SAP makes this a strength. Adobe specifically tests this.

### ♿ Module 17.1: Accessibility Basics
304. Web Accessibility — WCAG 2.1 vs WCAG 2.2

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/) |
| Deep Dive / Advanced Article | [web.dev — Accessibility](https://web.dev/accessibility) |
| Interview-Focused Article | [Blog — WCAG Interview — Dev.to](https://dev.to/nickytonline/web-accessibility-interview-questions-5c3i) |
| Video Explanation | [Web Accessibility — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s) |

305. ARIA — Roles, Properties, States

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA) |
| Deep Dive / Advanced Article | [W3C — WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/) |
| Interview-Focused Article | [Blog — ARIA Interview — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook/accessibility) |
| Video Explanation | [ARIA Explained — Google Chrome Developers](https://www.youtube.com/watch?v=g9Qff0b-lHk) |

306. Keyboard Navigation — Focus Management, Tab Order

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Keyboard Navigation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets) |
| Deep Dive / Advanced Article | [web.dev — Focus Management](https://web.dev/articles/focus) |
| Interview-Focused Article | [Blog — Keyboard Nav Interview — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook/accessibility) |
| Video Explanation | [Focus Management — Google Chrome Developers](https://www.youtube.com/watch?v=EFv9ubbZLKw) |

307. Screen Reader Testing — NVDA, VoiceOver, JAWS ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Screen Reader Testing](https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Accessibility) |
| Deep Dive / Advanced Article | [web.dev — Screen Reader Testing](https://web.dev/articles/semantics-and-screen-readers) |
| Interview-Focused Article | [Blog — Screen Reader Interview — Dev.to](https://dev.to/nickytonline/web-accessibility-interview-questions-5c3i) |
| Video Explanation | [Screen Reader Testing — Google Chrome Developers](https://www.youtube.com/watch?v=Jao3s_CwdRU) |

308. Accessibility Tree — How Browsers Expose to Assistive Tech ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Chrome — Accessibility Tree](https://developer.chrome.com/docs/devtools/accessibility/reference) |
| Deep Dive / Advanced Article | [web.dev — The Accessibility Tree](https://web.dev/articles/the-accessibility-tree) |
| Interview-Focused Article | [Blog — Accessibility Tree Interview — Dev.to](https://dev.to/nickytonline/web-accessibility-interview-questions-5c3i) |
| Video Explanation | [Accessibility Tree — Google Chrome Developers](https://www.youtube.com/watch?v=Th-nv-SCj4Q) |


### 🎨 Module 17.2: Inclusive Design
309. Color Contrast — WCAG AA vs AAA ratios

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [W3C — Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) |
| Deep Dive / Advanced Article | [web.dev — Color and Contrast](https://web.dev/articles/color-and-contrast-accessibility) |
| Interview-Focused Article | [Blog — Color Contrast Interview — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook/accessibility) |
| Video Explanation | [Color Contrast — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s) |

310. Responsive Design Systems

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Responsive Web Design](https://web.dev/articles/responsive-web-design-basics) |
| Deep Dive / Advanced Article | [MDN — Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design) |
| Interview-Focused Article | [GreatFrontEnd — CSS Interview](https://www.greatfrontend.com/front-end-interview-guidebook/css) |
| Video Explanation | [Responsive Design — Kevin Powell](https://www.youtube.com/watch?v=srvUrASNj0s) |

311. Motion Sensitivity — prefers-reduced-motion ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) |
| Deep Dive / Advanced Article | [web.dev — prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) |
| Interview-Focused Article | [Blog — Motion Sensitivity Interview — Dev.to](https://dev.to/nickytonline/web-accessibility-interview-questions-5c3i) |
| Video Explanation | [Reduced Motion — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s) |

312. Cognitive Accessibility — plain language, error prevention ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [W3C — Cognitive Accessibility](https://www.w3.org/WAI/cognitive/) |
| Deep Dive / Advanced Article | [web.dev — Cognitive Accessibility](https://web.dev/accessibility) |
| Interview-Focused Article | [Blog — Cognitive A11y Interview — Dev.to](https://dev.to/nickytonline/web-accessibility-interview-questions-5c3i) |
| Video Explanation | [Cognitive Accessibility — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s) |


### ⚖️ Module 17.3: UX Trade-offs
313. UX vs Performance

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — UX and Performance](https://web.dev/articles/rail) |
| Deep Dive / Advanced Article | [Blog — UX vs Performance Trade-offs — Smashing Magazine](https://www.smashingmagazine.com/2021/01/front-end-performance-2021-free-pdf-checklist/) |
| Interview-Focused Article | [GreatFrontEnd — Performance Interview](https://www.greatfrontend.com/front-end-interview-guidebook/performance) |
| Video Explanation | [RAIL Model — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc) |

314. Accessibility as Non-Functional Requirement

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [W3C — Accessibility as NFR](https://www.w3.org/WAI/fundamentals/accessibility-intro/) |
| Deep Dive / Advanced Article | [Blog — Accessibility as NFR — LogRocket](https://blog.logrocket.com/a11y-react/) |
| Interview-Focused Article | [Blog — A11y Interview — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook/accessibility) |
| Video Explanation | [A11y as Requirement — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s) |

315. Performance Impact on Accessibility

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Performance and Accessibility](https://web.dev/accessibility) |
| Deep Dive / Advanced Article | [Blog — Performance Impact on A11y — Smashing Magazine](https://www.smashingmagazine.com/2021/01/front-end-performance-2021-free-pdf-checklist/) |
| Interview-Focused Article | [Blog — A11y Performance Interview — Dev.to](https://dev.to/nickytonline/web-accessibility-interview-questions-5c3i) |
| Video Explanation | [A11y & Performance — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s) |

316. Accessibility Auditing Tools — axe, Lighthouse, Arc Toolkit ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Deque — axe Tools](https://www.deque.com/axe/) |
| Deep Dive / Advanced Article | [web.dev — Lighthouse Accessibility](https://web.dev/articles/lighthouse-accessibility) |
| Interview-Focused Article | [Blog — A11y Tools Interview — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook/accessibility) |
| Video Explanation | [axe & Lighthouse A11y — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s) |


---

## SEQUENCE 1️⃣8️⃣ — Testing Strategy ★
> Senior engineers own quality. Adobe and Microsoft ask about testing philosophy.

### 🔺 Module 18.1: Testing Pyramid
317. Unit vs Integration vs E2E — When to Use Which ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Testing Library — Guiding Principles](https://testing-library.com/docs/guiding-principles) |
| Deep Dive / Advanced Article | [Blog — Testing Trophy — Kent C. Dodds](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) |
| Interview-Focused Article | [Blog — Testing Interview — Kent C. Dodds](https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests) |
| Video Explanation | [Testing Types — Fireship](https://www.youtube.com/watch?v=u6QfIXgjwGQ) |

318. Testing Pyramid vs Testing Trophy vs Testing Honeycomb ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Testing Pyramid — Martin Fowler](https://martinfowler.com/articles/practical-test-pyramid.html) |
| Deep Dive / Advanced Article | [Blog — Testing Trophy — Kent C. Dodds](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) |
| Interview-Focused Article | [Blog — Testing Strategy Interview — Kent C. Dodds](https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests) |
| Video Explanation | [Testing Pyramid — Fireship](https://www.youtube.com/watch?v=u6QfIXgjwGQ) |

319. Cost of Tests at Each Level ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Cost of Tests — Martin Fowler](https://martinfowler.com/articles/practical-test-pyramid.html) |
| Deep Dive / Advanced Article | [Blog — Testing ROI — Kent C. Dodds](https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests) |
| Interview-Focused Article | [Blog — Testing Cost Interview — Dev.to](https://dev.to/nickytonline/testing-strategy-interview-questions-5c3i) |
| Video Explanation | [Cost of Testing — Fireship](https://www.youtube.com/watch?v=u6QfIXgjwGQ) |


### ⚡ Module 18.2: Unit & Component Testing
320. Jest — Setup, Mocking, Spying, Snapshot ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Jest Docs](https://jestjs.io/docs/getting-started) |
| Deep Dive / Advanced Article | [Blog — Jest Best Practices — LogRocket](https://blog.logrocket.com/jest-testing-top-features/) |
| Interview-Focused Article | [Blog — Jest Interview Questions — Dev.to](https://dev.to/pragativerma18/jest-interview-questions-and-answers-5c3i) |
| Video Explanation | [Jest Crash Course — Traversy Media](https://www.youtube.com/watch?v=7r4xVDI2vho) |

321. React Testing Library — render, screen, userEvent, async ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Testing Library — React](https://testing-library.com/docs/react-testing-library/intro) |
| Deep Dive / Advanced Article | [Blog — RTL Best Practices — Kent C. Dodds](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) |
| Interview-Focused Article | [Blog — RTL Interview — LogRocket](https://blog.logrocket.com/react-testing-library-tutorial/) |
| Video Explanation | [React Testing Library — Jack Herrington](https://www.youtube.com/watch?v=T2sv8jXoP4s) |

322. Testing Custom Hooks with renderHook ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Testing Library — renderHook](https://testing-library.com/docs/react-testing-library/api#renderhook) |
| Deep Dive / Advanced Article | [Blog — Testing Custom Hooks — Kent C. Dodds](https://kentcdodds.com/blog/how-to-test-custom-react-hooks) |
| Interview-Focused Article | [Blog — Custom Hook Testing Interview — LogRocket](https://blog.logrocket.com/test-react-hooks/) |
| Video Explanation | [Testing Hooks — Jack Herrington](https://www.youtube.com/watch?v=hP_pOIJfadg) |

323. Testing Redux / RTK Slices in Isolation ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Redux Toolkit — Writing Tests](https://redux.js.org/usage/writing-tests) |
| Deep Dive / Advanced Article | [Blog — Testing Redux — LogRocket](https://blog.logrocket.com/testing-redux-reducers-and-actions/) |
| Interview-Focused Article | [Blog — Redux Testing Interview — Dev.to](https://dev.to/pragativerma18/jest-interview-questions-and-answers-5c3i) |
| Video Explanation | [Testing Redux — Codevolution](https://www.youtube.com/watch?v=h7ukDItYot0) |

324. Jasmine & Karma — Angular Testing Patterns ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Testing Guide](https://angular.dev/guide/testing) |
| Deep Dive / Advanced Article | [Blog — Angular Testing Patterns — LogRocket](https://blog.logrocket.com/angular-unit-testing/) |
| Interview-Focused Article | [Blog — Angular Testing Interview — Medium](https://medium.com/@nicholasgill30/angular-testing-interview-questions-8b7d82f9bc09) |
| Video Explanation | [Angular Testing — Decoded Frontend](https://www.youtube.com/watch?v=BhjzNReAG2Y) |


### 🎭 Module 18.3: E2E Testing
325. Playwright vs Cypress — Architecture & Trade-offs ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Playwright Docs](https://playwright.dev/docs/intro) |
| Deep Dive / Advanced Article | [Cypress Docs](https://docs.cypress.io/guides/overview/why-cypress) |
| Interview-Focused Article | [Blog — Playwright vs Cypress Interview — LogRocket](https://blog.logrocket.com/playwright-vs-cypress/) |
| Video Explanation | [Playwright vs Cypress — Fireship](https://www.youtube.com/watch?v=cOmehxAU_4s) |

326. Page Object Model (POM) Pattern ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Playwright — Page Object Model](https://playwright.dev/docs/pom) |
| Deep Dive / Advanced Article | [Blog — POM Pattern — LogRocket](https://blog.logrocket.com/page-object-model-pattern/) |
| Interview-Focused Article | [Blog — POM Interview — Dev.to](https://dev.to/nickytonline/page-object-model-pattern-5c3i) |
| Video Explanation | [Page Object Model — Traversy Media](https://www.youtube.com/watch?v=7r4xVDI2vho) |

327. E2E in CI — Parallel Execution, Sharding ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Playwright — Parallelism](https://playwright.dev/docs/test-parallel) |
| Deep Dive / Advanced Article | [Blog — E2E in CI — LogRocket](https://blog.logrocket.com/playwright-vs-cypress/) |
| Interview-Focused Article | [Blog — E2E CI Interview — Dev.to](https://dev.to/nickytonline/e2e-testing-in-ci-5c3i) |
| Video Explanation | [E2E Testing in CI — Fireship](https://www.youtube.com/watch?v=u6QfIXgjwGQ) |

328. Flaky Test Root Causes & Prevention ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Flaky Tests — Google Testing Blog](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html) |
| Deep Dive / Advanced Article | [Blog — Fixing Flaky Tests — Playwright](https://playwright.dev/docs/test-retries) |
| Interview-Focused Article | [Blog — Flaky Tests Interview — Dev.to](https://dev.to/nickytonline/flaky-tests-5c3i) |
| Video Explanation | [Flaky Tests — Google Testing Blog](https://www.youtube.com/watch?v=u6QfIXgjwGQ) |


### 📊 Module 18.4: Performance & Visual Testing
329. Visual Regression Testing — Storybook, Chromatic, Percy ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Storybook — Visual Testing](https://storybook.js.org/docs/writing-tests/visual-testing) |
| Deep Dive / Advanced Article | [Chromatic Docs](https://www.chromatic.com/docs/) |
| Interview-Focused Article | [Blog — Visual Regression Interview — LogRocket](https://blog.logrocket.com/visual-regression-testing/) |
| Video Explanation | [Visual Testing with Storybook — Fireship](https://www.youtube.com/watch?v=p-LFh5Y89eM) |

330. Lighthouse CI in Build Pipeline ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Lighthouse CI — GitHub](https://github.com/GoogleChrome/lighthouse-ci) |
| Deep Dive / Advanced Article | [Blog — Lighthouse in CI Pipeline — LogRocket](https://blog.logrocket.com/lighthouse-ci/) |
| Interview-Focused Article | [Blog — Lighthouse CI Interview — Dev.to](https://dev.to/nickytonline/lighthouse-ci-5c3i) |
| Video Explanation | [Lighthouse CI — Google Chrome Developers](https://www.youtube.com/watch?v=mLjxXPHuIJo) |

331. Bundle Size Regression Testing ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [bundlesize — GitHub](https://github.com/siddharthkp/bundlesize) |
| Deep Dive / Advanced Article | [Blog — Bundle Size Testing — LogRocket](https://blog.logrocket.com/guide-performance-optimization-webpack/) |
| Interview-Focused Article | [Blog — Bundle Size Interview — Dev.to](https://dev.to/nickytonline/bundle-size-regression-testing-5c3i) |
| Video Explanation | [Bundle Size CI — Fireship](https://www.youtube.com/watch?v=SbhkQA0k8a0) |


---

## SEQUENCE 1️⃣9️⃣ — Observability
> Production ownership mindset. Microsoft and Cisco care deeply.

### 📉 Module 19.1: Monitoring
332. Frontend Logging Strategy

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Frontend Logging — LogRocket](https://blog.logrocket.com/frontend-logging/) |
| Deep Dive / Advanced Article | [Blog — Logging Best Practices — Datadog](https://www.datadoghq.com/blog/frontend-logging-best-practices/) |
| Interview-Focused Article | [Blog — Logging Interview — Dev.to](https://dev.to/pragativerma18/frontend-logging-strategies-5c3i) |
| Video Explanation | [Frontend Logging — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY) |

333. Error Tracking — Sentry, Datadog, Rollbar

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Sentry Docs — JavaScript](https://docs.sentry.io/platforms/javascript/) |
| Deep Dive / Advanced Article | [Blog — Error Tracking Guide — Sentry](https://docs.sentry.io/product/issues/) |
| Interview-Focused Article | [Blog — Error Tracking Interview — Dev.to](https://dev.to/pragativerma18/frontend-error-tracking-5c3i) |
| Video Explanation | [Sentry Setup — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY) |

334. Performance Monitoring

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — Performance Monitoring](https://web.dev/articles/vitals-measurement-getting-started) |
| Deep Dive / Advanced Article | [Blog — Frontend Performance Monitoring — Datadog](https://www.datadoghq.com/blog/frontend-performance-monitoring/) |
| Interview-Focused Article | [Blog — Performance Monitoring Interview — Dev.to](https://dev.to/pragativerma18/frontend-performance-monitoring-5c3i) |
| Video Explanation | [Performance Monitoring — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc) |

335. Real User Monitoring (RUM)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [web.dev — RUM](https://web.dev/articles/vitals-measurement-getting-started) |
| Deep Dive / Advanced Article | [Blog — RUM Guide — Datadog](https://www.datadoghq.com/blog/real-user-monitoring/) |
| Interview-Focused Article | [Blog — RUM Interview — Dev.to](https://dev.to/pragativerma18/frontend-performance-monitoring-5c3i) |
| Video Explanation | [Real User Monitoring — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc) |

336. OpenTelemetry for Frontend ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [OpenTelemetry — JS Docs](https://opentelemetry.io/docs/languages/js/) |
| Deep Dive / Advanced Article | [Blog — OpenTelemetry for Frontend — LogRocket](https://blog.logrocket.com/opentelemetry-frontend/) |
| Interview-Focused Article | [Blog — OpenTelemetry Interview — Dev.to](https://dev.to/pragativerma18/opentelemetry-for-frontend-5c3i) |
| Video Explanation | [OpenTelemetry — Fireship](https://www.youtube.com/watch?v=r8UvWSX3KA8) |


### 🧪 Module 19.2: Debugging UX
337. User Analytics — Event Tracking, Funnels

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Google Analytics — Events](https://developers.google.com/analytics/devguides/collection/ga4/events) |
| Deep Dive / Advanced Article | [Blog — User Analytics Guide — LogRocket](https://blog.logrocket.com/product-analytics/) |
| Interview-Focused Article | [Blog — Analytics Interview — Dev.to](https://dev.to/pragativerma18/frontend-analytics-5c3i) |
| Video Explanation | [Google Analytics 4 — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY) |

338. Debugging Production — Source Maps, DevTools

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Chrome DevTools — Sources](https://developer.chrome.com/docs/devtools/javascript/) |
| Deep Dive / Advanced Article | [Blog — Source Maps Explained — LogRocket](https://blog.logrocket.com/source-maps-javascript/) |
| Interview-Focused Article | [Blog — Debugging Interview — Dev.to](https://dev.to/pragativerma18/debugging-production-5c3i) |
| Video Explanation | [Chrome DevTools — Google Chrome Developers](https://www.youtube.com/watch?v=YjMFjXiWsps) |

339. Correlation IDs — Tracing Requests End-to-End

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Correlation IDs — Datadog](https://www.datadoghq.com/blog/request-log-correlation/) |
| Deep Dive / Advanced Article | [Blog — Distributed Tracing — LogRocket](https://blog.logrocket.com/opentelemetry-frontend/) |
| Interview-Focused Article | [Blog — Tracing Interview — Dev.to](https://dev.to/pragativerma18/distributed-tracing-5c3i) |
| Video Explanation | [Distributed Tracing — Fireship](https://www.youtube.com/watch?v=r8UvWSX3KA8) |

340. Session Replay — FullStory, LogRocket

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LogRocket Docs](https://docs.logrocket.com/) |
| Deep Dive / Advanced Article | [Blog — Session Replay Tools — Smashing Magazine](https://www.smashingmagazine.com/2021/06/session-replay-tools/) |
| Interview-Focused Article | [Blog — Session Replay Interview — Dev.to](https://dev.to/pragativerma18/session-replay-tools-5c3i) |
| Video Explanation | [Session Replay — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY) |

341. Rage Click Detection & Frustration Signals

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Rage Clicks — FullStory](https://www.fullstory.com/blog/rage-clicks/) |
| Deep Dive / Advanced Article | [Blog — Frustration Signals — LogRocket](https://blog.logrocket.com/product-analytics/) |
| Interview-Focused Article | [Blog — UX Signals Interview — Dev.to](https://dev.to/pragativerma18/frontend-analytics-5c3i) |
| Video Explanation | [Rage Click Detection — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY) |

342. Synthetic Monitoring — Uptime Checks, Canary Flows ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Synthetic Monitoring — Datadog](https://www.datadoghq.com/blog/browser-tests/) |
| Deep Dive / Advanced Article | [Blog — Uptime Monitoring — Calibre](https://calibreapp.com/blog/synthetic-vs-real-user-monitoring) |
| Interview-Focused Article | [Blog — Synthetic Monitoring Interview — Dev.to](https://dev.to/pragativerma18/frontend-monitoring-5c3i) |
| Video Explanation | [Synthetic Monitoring — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY) |


---

## SEQUENCE 2️⃣0️⃣ — CI/CD & Frontend DevOps ★
> Enterprise pipeline ownership. Cisco and Microsoft expect senior engineers to own this.

### 🌿 Module 20.1: Git Workflows
343. Trunk-Based Development vs GitFlow ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Trunk-Based Development](https://trunkbaseddevelopment.com/) |
| Deep Dive / Advanced Article | [Blog — Trunk vs GitFlow — Martin Fowler](https://martinfowler.com/articles/branching-patterns.html) |
| Interview-Focused Article | [Blog — Git Strategy Interview — Dev.to](https://dev.to/pragativerma18/git-branching-strategies-5c3i) |
| Video Explanation | [Trunk-Based Dev — Fireship](https://www.youtube.com/watch?v=ykZbBD-CmP8) |

344. PR Strategy — Size, Review Checklists, Branch Protection ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GitHub — Pull Request Best Practices](https://docs.github.com/en/pull-requests) |
| Deep Dive / Advanced Article | [Blog — PR Strategy — Thoughtbot](https://thoughtbot.com/blog/5-useful-tips-for-a-better-commit-message) |
| Interview-Focused Article | [Blog — PR Strategy Interview — Dev.to](https://dev.to/pragativerma18/pull-request-best-practices-5c3i) |
| Video Explanation | [PR Best Practices — Fireship](https://www.youtube.com/watch?v=ykZbBD-CmP8) |

345. Conventional Commits & Semantic Versioning ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Conventional Commits Spec](https://www.conventionalcommits.org/) |
| Deep Dive / Advanced Article | [semver.org](https://semver.org/) |
| Interview-Focused Article | [Blog — Conventional Commits Interview — Dev.to](https://dev.to/pragativerma18/conventional-commits-5c3i) |
| Video Explanation | [Semantic Versioning — Fireship](https://www.youtube.com/watch?v=ykZbBD-CmP8) |


### ⚙️ Module 20.2: CI/CD Pipelines
346. GitHub Actions — Workflows, Jobs, Matrix Builds, Caching ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GitHub Actions Docs](https://docs.github.com/en/actions) |
| Deep Dive / Advanced Article | [Blog — GitHub Actions for Frontend — LogRocket](https://blog.logrocket.com/github-actions-ci-cd/) |
| Interview-Focused Article | [Blog — GitHub Actions Interview — Dev.to](https://dev.to/pragativerma18/github-actions-interview-questions-5c3i) |
| Video Explanation | [GitHub Actions — Fireship](https://www.youtube.com/watch?v=eB0nUzAI7M8) |

347. Jenkins Pipelines — Declarative Syntax ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Jenkins — Pipeline Docs](https://www.jenkins.io/doc/book/pipeline/) |
| Deep Dive / Advanced Article | [Blog — Jenkins Pipeline — LogRocket](https://blog.logrocket.com/jenkins-vs-github-actions/) |
| Interview-Focused Article | [Blog — Jenkins Interview — Dev.to](https://dev.to/pragativerma18/jenkins-interview-questions-5c3i) |
| Video Explanation | [Jenkins Pipeline — TechWorld with Nana](https://www.youtube.com/watch?v=7KCS70sCoK0) |

348. Frontend Pipeline: Lint → Type-Check → Test → Build → Deploy ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Frontend CI Pipeline — LogRocket](https://blog.logrocket.com/github-actions-ci-cd/) |
| Deep Dive / Advanced Article | [Blog — CI/CD Best Practices — Vercel](https://vercel.com/docs/deployments/overview) |
| Interview-Focused Article | [Blog — Frontend CI Interview — Dev.to](https://dev.to/pragativerma18/frontend-ci-cd-5c3i) |
| Video Explanation | [Frontend CI/CD — Fireship](https://www.youtube.com/watch?v=eB0nUzAI7M8) |

349. Artifact Caching Strategy in CI ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GitHub Actions — Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows) |
| Deep Dive / Advanced Article | [Blog — CI Caching Strategy — LogRocket](https://blog.logrocket.com/github-actions-ci-cd/) |
| Interview-Focused Article | [Blog — CI Caching Interview — Dev.to](https://dev.to/pragativerma18/ci-cd-caching-strategies-5c3i) |
| Video Explanation | [CI Caching — Fireship](https://www.youtube.com/watch?v=eB0nUzAI7M8) |


### 🚀 Module 20.3: Deployment Strategies
350. Blue-Green Deployment ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Blue-Green Deployment — Martin Fowler](https://martinfowler.com/bliki/BlueGreenDeployment.html) |
| Deep Dive / Advanced Article | [Blog — Blue-Green Deployment — AWS](https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/introduction.html) |
| Interview-Focused Article | [Blog — Deployment Strategies Interview — Dev.to](https://dev.to/pragativerma18/deployment-strategies-5c3i) |
| Video Explanation | [Blue-Green Deployment — TechWorld with Nana](https://www.youtube.com/watch?v=AWVTKBUnoIg) |

351. Canary Releases for Frontend ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Canary Releases — Martin Fowler](https://martinfowler.com/bliki/CanaryRelease.html) |
| Deep Dive / Advanced Article | [Blog — Canary for Frontend — LaunchDarkly](https://launchdarkly.com/blog/what-are-feature-flags/) |
| Interview-Focused Article | [Blog — Canary Interview — Dev.to](https://dev.to/pragativerma18/deployment-strategies-5c3i) |
| Video Explanation | [Canary Releases — TechWorld with Nana](https://www.youtube.com/watch?v=AWVTKBUnoIg) |

352. Feature Flags as Deployment Safety Valve ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Feature Flags — Martin Fowler](https://martinfowler.com/articles/feature-toggles.html) |
| Deep Dive / Advanced Article | [Blog — Feature Flags for Safety — LaunchDarkly](https://launchdarkly.com/blog/what-are-feature-flags/) |
| Interview-Focused Article | [Blog — Feature Flags Interview — Dev.to](https://dev.to/emmabostian/feature-flags-101-4l2g) |
| Video Explanation | [Feature Flags — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs) |

353. Rollback Strategy ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Rollback Strategy — AWS](https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/rollback.html) |
| Deep Dive / Advanced Article | [Blog — Frontend Rollback — Vercel](https://vercel.com/docs/deployments/overview) |
| Interview-Focused Article | [Blog — Rollback Interview — Dev.to](https://dev.to/pragativerma18/deployment-strategies-5c3i) |
| Video Explanation | [Rollback Strategies — TechWorld with Nana](https://www.youtube.com/watch?v=AWVTKBUnoIg) |


### 🐳 Module 20.4: Docker Basics for Frontend
354. Dockerfile for Node/Frontend Apps ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Docker — Dockerfile Reference](https://docs.docker.com/engine/reference/builder/) |
| Deep Dive / Advanced Article | [Blog — Dockerfile for Node — Docker](https://docs.docker.com/language/nodejs/) |
| Interview-Focused Article | [Blog — Docker Interview — Dev.to](https://dev.to/pragativerma18/docker-interview-questions-5c3i) |
| Video Explanation | [Docker in 100 Seconds — Fireship](https://www.youtube.com/watch?v=Gjnup-PuquQ) |

355. Multi-Stage Builds — Build + Nginx Serve ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Docker — Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/) |
| Deep Dive / Advanced Article | [Blog — Multi-Stage Frontend Build — LogRocket](https://blog.logrocket.com/docker-for-front-end-developers/) |
| Interview-Focused Article | [Blog — Multi-Stage Docker Interview — Dev.to](https://dev.to/pragativerma18/docker-interview-questions-5c3i) |
| Video Explanation | [Multi-Stage Docker — TechWorld with Nana](https://www.youtube.com/watch?v=pg19Z8LL06w) |

356. Environment Variables in Containerised Frontend ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Docker — Environment Variables](https://docs.docker.com/compose/environment-variables/) |
| Deep Dive / Advanced Article | [Blog — Env Vars in Containerised Apps — LogRocket](https://blog.logrocket.com/docker-for-front-end-developers/) |
| Interview-Focused Article | [Blog — Docker Env Interview — Dev.to](https://dev.to/pragativerma18/docker-interview-questions-5c3i) |
| Video Explanation | [Docker Env Variables — TechWorld with Nana](https://www.youtube.com/watch?v=pg19Z8LL06w) |


---
---

# 🏢 PHASE 8 — COMPANY-SPECIFIC MODULES
> Weeks 9–10 | Targeted prep for each company's unique stack.

---

## SEQUENCE 2️⃣1️⃣ — Web Components & Lightning Web Components ★
> Salesforce LWC is built on Web Components. Do this before your Salesforce interview.

### 🧱 Module 21.1: Web Components Fundamentals
357. Custom Elements API ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Custom Elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) |
| Deep Dive / Advanced Article | [web.dev — Custom Elements](https://web.dev/articles/custom-elements-v1) |
| Interview-Focused Article | [Blog — Web Components Interview — Dev.to](https://dev.to/nickytonline/web-components-interview-questions-5c3i) |
| Video Explanation | [Web Components — Fireship](https://www.youtube.com/watch?v=PCWaFLy3VUo) |

358. Shadow DOM — Open vs Closed Mode ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) |
| Deep Dive / Advanced Article | [web.dev — Shadow DOM v1](https://web.dev/articles/shadowdom-v1) |
| Interview-Focused Article | [Blog — Shadow DOM Interview — Dev.to](https://dev.to/nickytonline/web-components-interview-questions-5c3i) |
| Video Explanation | [Shadow DOM — Fireship](https://www.youtube.com/watch?v=PCWaFLy3VUo) |

359. HTML Templates & Slots ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — HTML Templates](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots) |
| Deep Dive / Advanced Article | [web.dev — Templates & Slots](https://web.dev/articles/shadowdom-v1#templates_and_slots) |
| Interview-Focused Article | [Blog — Templates Interview — Dev.to](https://dev.to/nickytonline/web-components-interview-questions-5c3i) |
| Video Explanation | [HTML Templates — Fireship](https://www.youtube.com/watch?v=PCWaFLy3VUo) |

360. Custom Events & Component Communication ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Custom Events](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent) |
| Deep Dive / Advanced Article | [web.dev — Custom Events](https://web.dev/articles/custom-elements-v1#reactions) |
| Interview-Focused Article | [Blog — Custom Events Interview — Dev.to](https://dev.to/nickytonline/web-components-interview-questions-5c3i) |
| Video Explanation | [Custom Events — Fireship](https://www.youtube.com/watch?v=PCWaFLy3VUo) |


### ⚡ Module 21.2: Lightning Web Components (LWC)
361. LWC Component Lifecycle — connectedCallback, disconnectedCallback, renderedCallback ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Salesforce — LWC Lifecycle](https://developer.salesforce.com/docs/platform/lwc/guide/create-lifecycle-hooks.html) |
| Deep Dive / Advanced Article | [Blog — LWC Lifecycle — Salesforce Developer Blog](https://developer.salesforce.com/blogs/2020/06/lightning-web-components-best-practices) |
| Interview-Focused Article | [Blog — LWC Interview Questions — Trailhead](https://trailhead.salesforce.com/content/learn/modules/lightning-web-components-basics) |
| Video Explanation | [LWC Lifecycle — Salesforce Developers](https://www.youtube.com/watch?v=i28BDUVIIU4) |

362. @api, @track, @wire Decorators ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Salesforce — LWC Decorators](https://developer.salesforce.com/docs/platform/lwc/guide/create-components-data-binding.html) |
| Deep Dive / Advanced Article | [Blog — @api @track @wire — Salesforce Developer Blog](https://developer.salesforce.com/blogs/2020/06/lightning-web-components-best-practices) |
| Interview-Focused Article | [Blog — LWC Decorators Interview — Trailhead](https://trailhead.salesforce.com/content/learn/modules/lightning-web-components-basics) |
| Video Explanation | [LWC Decorators — Salesforce Developers](https://www.youtube.com/watch?v=i28BDUVIIU4) |

363. Wire Service & Apex Method Integration ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Salesforce — Wire Service](https://developer.salesforce.com/docs/platform/lwc/guide/data-wire-service-about.html) |
| Deep Dive / Advanced Article | [Blog — Wire Service Guide — Salesforce](https://developer.salesforce.com/blogs/2020/06/lightning-web-components-best-practices) |
| Interview-Focused Article | [Blog — Apex/Wire Interview — Trailhead](https://trailhead.salesforce.com/content/learn/modules/lightning-web-components-basics) |
| Video Explanation | [Wire Service & Apex — Salesforce Developers](https://www.youtube.com/watch?v=i28BDUVIIU4) |

364. LWC Events — Custom Events, Lightning Message Service ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Salesforce — LWC Events](https://developer.salesforce.com/docs/platform/lwc/guide/events.html) |
| Deep Dive / Advanced Article | [Blog — LWC Events Guide — Salesforce](https://developer.salesforce.com/blogs/2020/06/lightning-web-components-best-practices) |
| Interview-Focused Article | [Blog — LWC Events Interview — Trailhead](https://trailhead.salesforce.com/content/learn/modules/lightning-web-components-basics) |
| Video Explanation | [LWC Events — Salesforce Developers](https://www.youtube.com/watch?v=i28BDUVIIU4) |

365. Salesforce Lightning Design System (SLDS) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Salesforce — Lightning Design System](https://www.lightningdesignsystem.com/) |
| Deep Dive / Advanced Article | [Blog — SLDS Guide — Salesforce Developer Blog](https://developer.salesforce.com/blogs/2020/06/lightning-web-components-best-practices) |
| Interview-Focused Article | [Blog — SLDS Interview — Trailhead](https://trailhead.salesforce.com/content/learn/modules/ux-design-slds) |
| Video Explanation | [Lightning Design System — Salesforce Developers](https://www.youtube.com/watch?v=i28BDUVIIU4) |


### 🔗 Module 21.3: Framework Interop
366. Angular Elements — Exporting as Web Components ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Angular — Angular Elements](https://angular.dev/guide/elements) |
| Deep Dive / Advanced Article | [Blog — Angular Elements Guide — LogRocket](https://blog.logrocket.com/getting-started-with-angular-elements/) |
| Interview-Focused Article | [Blog — Angular Elements Interview — Medium](https://medium.com/@nicholasgill30/angular-elements-interview-questions-8b7d82f9bc09) |
| Video Explanation | [Angular Elements — Joshua Morony](https://www.youtube.com/watch?v=8ji8hi2Fw7M) |

367. Embedding React Components in Angular & Vice Versa ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Micro-Frontends — Martin Fowler](https://martinfowler.com/articles/micro-frontends.html) |
| Deep Dive / Advanced Article | [Blog — React in Angular — LogRocket](https://blog.logrocket.com/micro-frontend-react/) |
| Interview-Focused Article | [Blog — Framework Interop Interview — Dev.to](https://dev.to/nickytonline/micro-frontends-interview-questions-5c3i) |
| Video Explanation | [Micro-Frontends — Jack Herrington](https://www.youtube.com/watch?v=w58aZjACETQ) |

368. Sharing State Across Frameworks in Micro-Frontend ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Module Federation](https://module-federation.io/) |
| Deep Dive / Advanced Article | [Blog — State Sharing in Micro-Frontends — LogRocket](https://blog.logrocket.com/building-micro-frontends-module-federation/) |
| Interview-Focused Article | [Blog — Micro-Frontend State Interview — Dev.to](https://dev.to/nickytonline/micro-frontends-interview-questions-5c3i) |
| Video Explanation | [Shared State — Jack Herrington](https://www.youtube.com/watch?v=K-yQB9YGmgE) |


---

## SEQUENCE 2️⃣2️⃣ — SAP UI5 & Enterprise Frontend Patterns ★
> Your most current daily skill. Articulate it clearly to non-SAP companies.

### 🏗️ Module 22.1: SAP UI5 Architecture
369. SAPUI5 vs OpenUI5 — Differences & Licensing ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAPUI5 SDK](https://sapui5.hana.ondemand.com/) |
| Deep Dive / Advanced Article | [OpenUI5 Docs](https://openui5.hana.ondemand.com/) |
| Interview-Focused Article | [Blog — UI5 Overview — SAP Community](https://community.sap.com/topics/ui5) |
| Video Explanation | [SAPUI5 vs OpenUI5 — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |

370. MVC Pattern in UI5 — Model, View, Controller ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAPUI5 — MVC](https://sapui5.hana.ondemand.com/#/topic/91f233476f4d1014b6dd926db0e91070) |
| Deep Dive / Advanced Article | [Blog — UI5 MVC Pattern — SAP Community](https://community.sap.com/topics/ui5) |
| Interview-Focused Article | [Blog — UI5 Interview Questions — SAP Community](https://community.sap.com/topics/ui5) |
| Video Explanation | [UI5 MVC — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |

371. OData Binding — Property, Aggregation, Element Binding ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAPUI5 — OData Model](https://sapui5.hana.ondemand.com/#/topic/6c47b2b39db9404582994070ec3d57a2) |
| Deep Dive / Advanced Article | [Blog — OData Binding — SAP Community](https://community.sap.com/topics/ui5) |
| Interview-Focused Article | [Blog — OData Interview — SAP Community](https://community.sap.com/topics/ui5) |
| Video Explanation | [OData Binding — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |

372. UI5 Lifecycle — init, onBeforeRendering, onAfterRendering ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAPUI5 — Controller Lifecycle](https://sapui5.hana.ondemand.com/#/topic/121b8e6337d147af9819129e428f1f75) |
| Deep Dive / Advanced Article | [Blog — UI5 Lifecycle — SAP Community](https://community.sap.com/topics/ui5) |
| Interview-Focused Article | [Blog — UI5 Lifecycle Interview — SAP Community](https://community.sap.com/topics/ui5) |
| Video Explanation | [UI5 Lifecycle — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |


### 🎨 Module 22.2: Fiori Design System
373. SAP Fiori Design Principles ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAP Fiori Design Guidelines](https://experience.sap.com/fiori-design-web/) |
| Deep Dive / Advanced Article | [Blog — Fiori Design Principles — SAP Community](https://community.sap.com/topics/fiori) |
| Interview-Focused Article | [Blog — Fiori Interview — SAP Community](https://community.sap.com/topics/fiori) |
| Video Explanation | [Fiori Design — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |

374. Fiori Launchpad Architecture ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAP — Fiori Launchpad](https://experience.sap.com/fiori-design-web/launchpad/) |
| Deep Dive / Advanced Article | [Blog — Fiori Launchpad Architecture — SAP Community](https://community.sap.com/topics/fiori) |
| Interview-Focused Article | [Blog — Fiori Launchpad Interview — SAP Community](https://community.sap.com/topics/fiori) |
| Video Explanation | [Fiori Launchpad — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |

375. Theming — SAP Theming Base Content, CSS Variables ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAP — Theming](https://experience.sap.com/fiori-design-web/theming/) |
| Deep Dive / Advanced Article | [Blog — UI5 Theming — SAP Community](https://community.sap.com/topics/ui5) |
| Interview-Focused Article | [Blog — Theming Interview — SAP Community](https://community.sap.com/topics/ui5) |
| Video Explanation | [UI5 Theming — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |


### 📐 Module 22.3: Enterprise UI Patterns
376. Master-Detail Pattern ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAP Fiori — Master-Detail](https://experience.sap.com/fiori-design-web/master-detail/) |
| Deep Dive / Advanced Article | [Blog — Master-Detail Pattern — SAP Community](https://community.sap.com/topics/fiori) |
| Interview-Focused Article | [Blog — Fiori Patterns Interview — SAP Community](https://community.sap.com/topics/fiori) |
| Video Explanation | [Master-Detail — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |

377. Worklist Pattern ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAP Fiori — Worklist](https://experience.sap.com/fiori-design-web/work-list/) |
| Deep Dive / Advanced Article | [Blog — Worklist Pattern — SAP Community](https://community.sap.com/topics/fiori) |
| Interview-Focused Article | [Blog — Fiori Patterns Interview — SAP Community](https://community.sap.com/topics/fiori) |
| Video Explanation | [Worklist Pattern — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |

378. Object Page Layout ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAP Fiori — Object Page](https://experience.sap.com/fiori-design-web/object-page/) |
| Deep Dive / Advanced Article | [Blog — Object Page Layout — SAP Community](https://community.sap.com/topics/fiori) |
| Interview-Focused Article | [Blog — Object Page Interview — SAP Community](https://community.sap.com/topics/fiori) |
| Video Explanation | [Object Page — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |

379. Smart Controls — SmartTable, SmartForm, SmartFilterBar ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [SAPUI5 — Smart Controls](https://sapui5.hana.ondemand.com/#/topic/64bde9a8879d4f418bcf73d28e12e4dd) |
| Deep Dive / Advanced Article | [Blog — Smart Controls — SAP Community](https://community.sap.com/topics/ui5) |
| Interview-Focused Article | [Blog — Smart Controls Interview — SAP Community](https://community.sap.com/topics/ui5) |
| Video Explanation | [Smart Controls — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw) |


### 💼 Module 22.4: Positioning SAP Experience
380. How to Articulate SAP UI5 Work to Non-SAP Companies ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Positioning SAP Experience — SAP Community](https://community.sap.com/topics/career) |
| Deep Dive / Advanced Article | [Blog — Articulating Enterprise Experience — Dev.to](https://dev.to/nickytonline/how-to-describe-enterprise-experience-5c3i) |
| Interview-Focused Article | [Blog — Enterprise to FAANG Interview — Medium](https://medium.com/@nicholasgill30/from-enterprise-to-faang-interview-tips-8b7d82f9bc09) |
| Video Explanation | [SAP to FAANG — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

381. Transferable Skills — OData → REST, UI5 MVC → React/Angular patterns ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Transferable Skills — SAP Community](https://community.sap.com/topics/career) |
| Deep Dive / Advanced Article | [Blog — OData to REST — Dev.to](https://dev.to/nickytonline/transferable-skills-enterprise-to-startup-5c3i) |
| Interview-Focused Article | [Blog — Transferable Skills Interview — Medium](https://medium.com/@nicholasgill30/transferable-skills-from-enterprise-8b7d82f9bc09) |
| Video Explanation | [Enterprise Skills Transfer — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

382. SAP BI Launchpad Case Study — Performance, Security, Accessibility ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Performance Case Study — web.dev](https://web.dev/articles/vitals) |
| Deep Dive / Advanced Article | [Blog — Building Case Studies for Interviews — Medium](https://medium.com/@nicholasgill30/building-case-studies-for-interviews-8b7d82f9bc09) |
| Interview-Focused Article | [Blog — Case Study Interview — Dev.to](https://dev.to/nickytonline/case-study-building-for-interviews-5c3i) |
| Video Explanation | [Technical Case Study — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


---
---

# 🎯 PHASE 9 — SYSTEM DESIGN & INTERVIEW EXECUTION
> Weeks 9–11 | Everything above now gets applied. This is the exam.

---

## SEQUENCE 2️⃣3️⃣ — Frontend System Design Foundations
> Now that you know everything, learn how to present it in an interview.

### 📘 Module 23.1: Foundations & Mindset
383. What is Frontend System Design

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Frontend System Design — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Frontend SD Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Frontend System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

384. How Frontend System Design Differs from Backend Design

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Frontend vs Backend SD — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — FE vs BE SD Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [FE vs BE System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

385. Role of a Senior / Staff Frontend Engineer

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Staff Engineer Role — StaffEng.com](https://staffeng.com/) |
| Deep Dive / Advanced Article | [Blog — Senior vs Staff — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Interview-Focused Article | [Blog — Staff Engineer Interview — Dev.to](https://dev.to/nickytonline/staff-engineer-interview-5c3i) |
| Video Explanation | [Senior vs Staff — Clément Mihailescu](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

386. How Microsoft / Adobe / Salesforce / Cisco Differ in Expectations ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Company Expectations — Levels.fyi](https://www.levels.fyi/) |
| Interview-Focused Article | [Blog — Company-Specific Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Company Expectations — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


### 📘 Module 23.2: Interviews & Expectations
387. What FAANG Interviewers Look For

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — What FAANG Looks For — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Interview-Focused Article | [Blog — FAANG Interview Guide — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [FAANG System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

388. HLD vs LLD in Frontend Context

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — HLD vs LLD — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — HLD vs LLD Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [HLD vs LLD — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |


### 📘 Module 23.3: Requirements & Trade-offs
389. Functional vs Non-Functional Requirements (Frontend)

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — NFRs in Frontend — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — NFR Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Non-Functional Requirements — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

390. Trade-offs Over Perfect UI

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Trade-offs in Design — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Trade-offs Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Design Trade-offs — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

391. Thinking in Components, State, and Data Flow

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [React Docs — Thinking in React](https://react.dev/learn/thinking-in-react) |
| Deep Dive / Advanced Article | [Blog — Components, State, Data Flow — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Component Design Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Component Design — Jack Herrington](https://www.youtube.com/watch?v=x5PZwb4XurU) |

392. Capacity Estimation for Frontend Systems ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Capacity Estimation — HighScalability](https://highscalability.com/) |
| Deep Dive / Advanced Article | [Blog — Frontend Capacity Estimation — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Capacity Estimation Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Capacity Estimation — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |


---

## SEQUENCE 2️⃣4️⃣ — DSA for Frontend Engineers ★
> All 4 companies have a DSA round. Do this in parallel with system design practice.

### 📦 Module 24.1: Arrays & Strings
393. Two Pointers Pattern ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Two Pointers Tag](https://leetcode.com/tag/two-pointers/) |
| Deep Dive / Advanced Article | [NeetCode — Two Pointers](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Two Pointers Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Two Pointers — NeetCode](https://www.youtube.com/watch?v=cQ1Oz4ckceM) |

394. Sliding Window Pattern ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Sliding Window Tag](https://leetcode.com/tag/sliding-window/) |
| Deep Dive / Advanced Article | [NeetCode — Sliding Window](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Sliding Window Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Sliding Window — NeetCode](https://www.youtube.com/watch?v=MK-NZ4hN7rs) |

395. Prefix Sums ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Prefix Sum Tag](https://leetcode.com/tag/prefix-sum/) |
| Deep Dive / Advanced Article | [NeetCode — Arrays & Hashing](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Prefix Sum Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Prefix Sum — NeetCode](https://www.youtube.com/watch?v=KE_and_Aii8) |

396. Anagram / Palindrome Problems ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode 242 — Valid Anagram](https://leetcode.com/problems/valid-anagram/) |
| Deep Dive / Advanced Article | [LeetCode 125 — Valid Palindrome](https://leetcode.com/problems/valid-palindrome/) |
| Interview-Focused Article | [Blog — Anagram Problems Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Valid Anagram — NeetCode](https://www.youtube.com/watch?v=9UtInBqnCgA) |


### 🗂️ Module 24.2: Hashmaps & Sets
397. Frequency Maps Pattern ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Hash Table Tag](https://leetcode.com/tag/hash-table/) |
| Deep Dive / Advanced Article | [NeetCode — Arrays & Hashing](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Frequency Maps Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Hash Map Problems — NeetCode](https://www.youtube.com/watch?v=KLlXCFG5TnA) |

398. Two-Sum Variants ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode 1 — Two Sum](https://leetcode.com/problems/two-sum/) |
| Deep Dive / Advanced Article | [NeetCode — Two Sum Variants](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Two Sum Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Two Sum — NeetCode](https://www.youtube.com/watch?v=KLlXCFG5TnA) |

399. Grouping & Bucketing ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode 49 — Group Anagrams](https://leetcode.com/problems/group-anagrams/) |
| Deep Dive / Advanced Article | [NeetCode — Arrays & Hashing](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Grouping Problems Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Group Anagrams — NeetCode](https://www.youtube.com/watch?v=vzdNOK2oB2E) |


### 📚 Module 24.3: Stacks & Queues
400. Monotonic Stack Problems ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Monotonic Stack Tag](https://leetcode.com/tag/monotonic-stack/) |
| Deep Dive / Advanced Article | [NeetCode — Stack](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Monotonic Stack Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Monotonic Stack — NeetCode](https://www.youtube.com/watch?v=zx5Sw9130L0) |

401. Browser History / Undo-Redo Simulation ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Tree Tag](https://leetcode.com/tag/tree/) |
| Deep Dive / Advanced Article | [NeetCode — Trees](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Tree Traversal Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Tree Traversal — NeetCode](https://www.youtube.com/watch?v=YT1994beXn0) |

402. Queue-Based BFS ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — BFS Tag](https://leetcode.com/tag/breadth-first-search/) |
| Deep Dive / Advanced Article | [NeetCode — Graphs (BFS / DFS)](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — BFS vs DFS Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Graph BFS & DFS — NeetCode](https://www.youtube.com/watch?v=tWVWeAqZ0WU) |


### 🌳 Module 24.4: Trees & Graphs
403. BFS & DFS — Templates ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Trie Tag](https://leetcode.com/tag/trie/) |
| Deep Dive / Advanced Article | [NeetCode — Tries](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Trie Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Implement Trie — NeetCode](https://www.youtube.com/watch?v=oobqoCJlHA0) |

404. Binary Tree Traversals — Inorder, Preorder, Postorder ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Dynamic Programming Tag](https://leetcode.com/tag/dynamic-programming/) |
| Deep Dive / Advanced Article | [NeetCode — 1-D Dynamic Programming](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — DP Interview Problems — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [DP for Beginners — NeetCode](https://www.youtube.com/watch?v=73r3KWiEvyk) |

405. Level Order Traversal ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Memoization](https://leetcode.com/tag/memoization/) |
| Deep Dive / Advanced Article | [Blog — Memoization Guide — javascript.info](https://javascript.info/) |
| Interview-Focused Article | [Blog — Memoization Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Memoization Explained — NeetCode](https://www.youtube.com/watch?v=73r3KWiEvyk) |

406. Graph Connected Components ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode 70 — Climbing Stairs](https://leetcode.com/problems/climbing-stairs/) |
| Deep Dive / Advanced Article | [NeetCode — 1-D DP](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Climbing Stairs Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Climbing Stairs — NeetCode](https://www.youtube.com/watch?v=Y0lT9Fck7qI) |

407. DOM Tree Traversal as Graph Problem ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode 200 — Number of Islands](https://leetcode.com/problems/number-of-islands/) |
| Deep Dive / Advanced Article | [NeetCode — Graphs](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Graph Interview Problems — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Number of Islands — NeetCode](https://www.youtube.com/watch?v=pV2kpPD66nE) |


### 🔁 Module 24.5: Recursion & DP Basics
408. Recursion Mental Model ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Sort Tag](https://leetcode.com/tag/sorting/) |
| Deep Dive / Advanced Article | [NeetCode — Sorting Algorithms](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Sorting Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Sorting Algorithms — NeetCode](https://www.youtube.com/watch?v=MtQL_ll5KhQ) |

409. Memoization vs Tabulation ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [LeetCode — Binary Search Tag](https://leetcode.com/tag/binary-search/) |
| Deep Dive / Advanced Article | [NeetCode — Binary Search](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Binary Search Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Binary Search — NeetCode](https://www.youtube.com/watch?v=s4DPM8ct1pI) |

410. Classic DP — Climbing Stairs, Coin Change, LCS ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Big-O Cheat Sheet](https://www.bigocheatsheet.com/) |
| Deep Dive / Advanced Article | [NeetCode — Big-O Notation](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Big-O Interview — NeetCode](https://neetcode.io/practice) |
| Video Explanation | [Big-O Notation — NeetCode](https://www.youtube.com/watch?v=BgLTDT03QtU) |


---

## SEQUENCE 2️⃣5️⃣ — Practical System Design Problems
> Apply everything. Time yourself. Record yourself.

### 🛠️ Module 25.1: UI Components (Machine Coding)
411. Autocomplete Search — debounce, AbortController, ARIA

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design a News Feed](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — News Feed System Design — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — News Feed Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [News Feed System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

412. Infinite Scroll — IntersectionObserver, virtualisation

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design an Autocomplete](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Autocomplete Design — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Autocomplete Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Autocomplete System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

413. Notification System — queue, auto-dismiss, screen reader

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Chat Application](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Chat App Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Chat Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Chat App System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

414. Drag-and-Drop List — HTML5 drag API, keyboard alternative

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design a Dashboard](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Dashboard Design — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Dashboard Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Dashboard System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

415. Poll Widget

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design an Infinite Scroll](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Infinite Scroll Implementation — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Infinite Scroll Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Infinite Scroll — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

416. Image Carousel — keyboard, touch, ARIA

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Image Carousel](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Carousel Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Carousel Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Image Carousel — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

417. Date Picker with Accessibility ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Notification System](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Notification Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Notification Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Notification System — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

418. Rich Text Editor (contenteditable) ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design a Modal System](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Modal Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Modal Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Modal System — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

419. Virtual Scrolling Component from Scratch ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design a Form Builder](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Form Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Form Builder Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Form Builder — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |


### 🧩 Module 25.2: Large System Designs
420. Design Flipkart/Amazon Cart System — state, sync, persistence

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Data Grid](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Data Grid Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Data Grid Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Data Grid — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

421. Design LinkedIn-Style Feed — infinite scroll, real-time, performance

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Drag & Drop](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — DnD Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — DnD Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Drag and Drop — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

422. Design a Chat UI — WebSocket, reconnection, message ordering

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design a Spreadsheet](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Spreadsheet UI Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Spreadsheet Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Spreadsheet UI — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

423. Design Slack-Like Interface — channels, presence, notifications

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design an E-commerce](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — E-commerce Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — E-commerce Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [E-commerce System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

424. Design Google Docs-Style Collaborative Editor ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Email Client](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Email Client Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Email Client Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Email Client Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

425. Design a File Upload System with Progress & Resume ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Collaborative Editor](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Collaborative Editor Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Collab Editor Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Collaborative Editor — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

426. Design Cisco-Style Network Monitoring Dashboard ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Video Player](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Video Player Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Video Player Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Video Player — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

427. Design Salesforce-Style CRM Record View ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Maps Application](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Maps Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Maps Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Maps System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

428. Design Adobe-Style Asset Manager ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Calendar](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Calendar UI Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Calendar Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Calendar System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

429. Design E-Commerce Frontend

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Social Media Feed](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Social Media Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Social Feed Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Social Media Feed — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

430. Design a Live Dashboard

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design File Upload](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — File Upload Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — File Upload Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [File Upload — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

431. Design a Comment System

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [GreatFrontEnd — Design Multi-Step Wizard](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Multi-Step Wizard Architecture — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Wizard Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Multi-Step Wizard — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |


---

## SEQUENCE 2️⃣6️⃣ — Machine Coding ↔ Design Bridge

### 🧠 Module 26.1: Design Thinking
432. Component Decomposition

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Frontend Machine Coding — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Deep Dive / Advanced Article | [Blog — Machine Coding Tips — Dev.to](https://dev.to/devkant/how-to-crack-machine-coding-round-5c3i) |
| Interview-Focused Article | [Blog — Machine Coding Interview — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Video Explanation | [Machine Coding Round — Piyush Garg](https://www.youtube.com/watch?v=oUk8DP_GgVg) |

433. State vs Props

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Vanilla JS Components — javascript.info](https://javascript.info/) |
| Deep Dive / Advanced Article | [Blog — Build UI without Frameworks — Dev.to](https://dev.to/nickytonline/building-ui-without-frameworks-5c3i) |
| Interview-Focused Article | [Blog — Vanilla JS Interview — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Video Explanation | [Vanilla JS Components — Akshay Saini](https://www.youtube.com/watch?v=hP_pOIJfadg) |

434. Edge Case Handling

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — DOM Manipulation — javascript.info](https://javascript.info/document) |
| Deep Dive / Advanced Article | [Blog — DOM Performance — web.dev](https://web.dev/articles/dom-size-and-interactivity) |
| Interview-Focused Article | [Blog — DOM Interview — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Video Explanation | [DOM Manipulation — Akshay Saini](https://www.youtube.com/watch?v=hP_pOIJfadg) |

435. Accessibility-First Component Design ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — EventTarget API](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) |
| Deep Dive / Advanced Article | [Blog — Custom Event System — javascript.info](https://javascript.info/dispatch-events) |
| Interview-Focused Article | [Blog — Event System Interview — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Video Explanation | [Custom Event System — Akshay Saini](https://www.youtube.com/watch?v=hP_pOIJfadg) |


### ⚙️ Module 26.2: Code Quality
436. Performance-Aware Components

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) |
| Deep Dive / Advanced Article | [Blog — State Without Frameworks — javascript.info](https://javascript.info/localstorage) |
| Interview-Focused Article | [Blog — State Management Interview — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Video Explanation | [State Without Frameworks — Akshay Saini](https://www.youtube.com/watch?v=hP_pOIJfadg) |

437. Reusability & Extensibility

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Debounce & Throttle — javascript.info](https://javascript.info/settimeout-setinterval) |
| Deep Dive / Advanced Article | [Blog — Debounce Throttle — web.dev](https://web.dev/articles/debounce-throttle) |
| Interview-Focused Article | [Blog — Debounce Interview — GreatFrontEnd](https://www.greatfrontend.com/questions/javascript/debounce) |
| Video Explanation | [Debounce & Throttle — Akshay Saini](https://www.youtube.com/watch?v=Zo-6_qx8uxg) |

438. Interview-Friendly Code Style

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Polyfills — javascript.info](https://javascript.info/polyfills) |
| Deep Dive / Advanced Article | [Blog — Writing Polyfills — Dev.to](https://dev.to/nickytonline/writing-javascript-polyfills-5c3i) |
| Interview-Focused Article | [Blog — Polyfill Interview — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Video Explanation | [Polyfills — Akshay Saini](https://www.youtube.com/watch?v=Ji6NHEnNHcg) |

439. TypeScript Typing in Machine Coding Rounds ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Promise.all Implementation — javascript.info](https://javascript.info/promise-api) |
| Deep Dive / Advanced Article | [Blog — Implement Promises — Dev.to](https://dev.to/nickytonline/implementing-promises-5c3i) |
| Interview-Focused Article | [Blog — Promise Interview — GreatFrontEnd](https://www.greatfrontend.com/questions/javascript/promise-all) |
| Video Explanation | [Promise.all Polyfill — Akshay Saini](https://www.youtube.com/watch?v=Ji6NHEnNHcg) |


### 🔁 Module 26.3: Evolution
440. Whiteboard → Code

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [MDN — Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) |
| Deep Dive / Advanced Article | [Blog — API Layer Design — Dev.to](https://dev.to/nickytonline/api-layer-design-5c3i) |
| Interview-Focused Article | [Blog — API Layer Interview — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Video Explanation | [API Layer Pattern — Akshay Saini](https://www.youtube.com/watch?v=hP_pOIJfadg) |

441. Incremental Refactoring

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Accessibility in Components — web.dev](https://web.dev/accessibility) |
| Deep Dive / Advanced Article | [Blog — Accessible React Components — LogRocket](https://blog.logrocket.com/a11y-react/) |
| Interview-Focused Article | [Blog — A11y Component Interview — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Video Explanation | [Accessible Components — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s) |

442. Handling Unknown Requirements

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Machine Coding Practice — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Deep Dive / Advanced Article | [Blog — Frontend Round Practice — Dev.to](https://dev.to/devkant/how-to-crack-machine-coding-round-5c3i) |
| Interview-Focused Article | [Blog — Mock Interview Tips — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Video Explanation | [Machine Coding Practice — Piyush Garg](https://www.youtube.com/watch?v=oUk8DP_GgVg) |

443. Talking Through Trade-offs While Coding ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Timed Coding Strategy — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Deep Dive / Advanced Article | [Blog — Time Management in Coding Rounds — Dev.to](https://dev.to/devkant/how-to-crack-machine-coding-round-5c3i) |
| Interview-Focused Article | [Blog — Coding Round Strategy — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding) |
| Video Explanation | [Coding Round Strategy — Piyush Garg](https://www.youtube.com/watch?v=oUk8DP_GgVg) |


---

## SEQUENCE 2️⃣7️⃣ — Interview Strategy

### 🎯 Module 27.1: Interview Flow
444. How to Start a System Design Interview

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Tech Interview Handbook — Resume](https://www.techinterviewhandbook.org/resume/) |
| Deep Dive / Advanced Article | [Blog — Resume Tips for Engineers — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Interview-Focused Article | [Blog — Resume Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/resume/) |
| Video Explanation | [Resume Tips — Clément Mihailescu](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

445. Requirement Clarification Framework

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Tech Interview Handbook — Algorithms](https://www.techinterviewhandbook.org/algorithms/study-cheatsheet/) |
| Deep Dive / Advanced Article | [Blog — Algo Study Plan — NeetCode](https://neetcode.io/roadmap) |
| Interview-Focused Article | [Blog — Algo Interview Plan — Tech Interview Handbook](https://www.techinterviewhandbook.org/algorithms/study-cheatsheet/) |
| Video Explanation | [DSA Study Plan — NeetCode](https://www.youtube.com/watch?v=SVvr3ZjtjI8) |

446. Architecture Drawing — Tools & Technique

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Frontend SD Framework — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — SD Framework — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — SD Game Plan — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [System Design Framework — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

447. Time Boxing Each Section ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Communication in Interviews — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook) |
| Deep Dive / Advanced Article | [Blog — Interview Communication — Dev.to](https://dev.to/nickytonline/interview-communication-tips-5c3i) |
| Interview-Focused Article | [Blog — Communication Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Interview Communication — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


### 💬 Module 27.2: Communication
448. Explaining Trade-offs Clearly

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Whiteboard Interview — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook) |
| Deep Dive / Advanced Article | [Blog — Whiteboard Tips — Dev.to](https://dev.to/nickytonline/whiteboard-interview-tips-5c3i) |
| Interview-Focused Article | [Blog — Whiteboard Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Whiteboard Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

449. Handling Performance Questions

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Follow-Up Questions — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook) |
| Deep Dive / Advanced Article | [Blog — Handling Follow-Ups — Dev.to](https://dev.to/nickytonline/handling-follow-up-questions-5c3i) |
| Interview-Focused Article | [Blog — Follow-Up Strategy — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Handling Follow-Ups — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

450. Scale & Edge Cases

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Scope Management — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Scoping in SD Interviews — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Scoping Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Scoping in System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

451. Recovering When You Don't Know the Answer ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Trade-offs in SD — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Explaining Trade-offs — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Trade-offs Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Trade-offs — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |


### ✅ Module 27.3: Closure
452. Common Mistakes Senior Engineers Make

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Diagram Techniques — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Diagramming in SD — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Diagram Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Diagramming in SD — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

453. Closing Strong — How to End a System Design Round

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — SD Practice — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Deep Dive / Advanced Article | [Blog — Mock SD Interview — frontendatscale.com](https://frontendatscale.com/blog/) |
| Interview-Focused Article | [Blog — Mock Interview — GreatFrontEnd](https://www.greatfrontend.com/system-design) |
| Video Explanation | [Mock SD Interview — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw) |

454. Questions to Ask Your Interviewer ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Mock Interview Practice — Pramp](https://www.pramp.com/) |
| Deep Dive / Advanced Article | [Blog — Self-Mock Strategy — Dev.to](https://dev.to/nickytonline/mock-interview-strategy-5c3i) |
| Interview-Focused Article | [Blog — Mock Interview Plan — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Mock Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


---
---

# 👑 PHASE 10 — LEADERSHIP & FINAL PREP
> Weeks 11–12 | Mock interviews, behavioural stories, FAANG expectations.

---

## SEQUENCE 2️⃣8️⃣ — FAANG-Level Expectations

### 🧠 Module 28.1: Senior → Staff
455. Senior vs Staff Expectations

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Levels.fyi — Company Levels](https://www.levels.fyi/) |
| Deep Dive / Advanced Article | [Blog — Big Tech Expectations — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Interview-Focused Article | [Blog — Interview Expectations — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [FAANG Expectations — Clément Mihailescu](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

456. Architecture Ownership

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Microsoft Interview — Levels.fyi](https://www.levels.fyi/companies/microsoft) |
| Deep Dive / Advanced Article | [Blog — Microsoft Culture — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Interview-Focused Article | [Blog — Microsoft Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Microsoft Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

457. Technical Vision & Roadmap Planning ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Adobe Interview — Levels.fyi](https://www.levels.fyi/companies/adobe) |
| Deep Dive / Advanced Article | [Blog — Adobe Culture — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Interview-Focused Article | [Blog — Adobe Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Adobe Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


### 🤝 Module 28.2: Leadership
458. Cross-Team Collaboration

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Salesforce Interview — Levels.fyi](https://www.levels.fyi/companies/salesforce) |
| Deep Dive / Advanced Article | [Blog — Salesforce Culture — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Interview-Focused Article | [Blog — Salesforce Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Salesforce Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

459. Cost vs Performance Trade-offs at Scale

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Cisco Interview — Levels.fyi](https://www.levels.fyi/companies/cisco) |
| Deep Dive / Advanced Article | [Blog — Cisco Culture — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Interview-Focused Article | [Blog — Cisco Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Cisco Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

460. Mentorship & Growing Junior Engineers

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Salary Negotiation — Levels.fyi](https://www.levels.fyi/) |
| Deep Dive / Advanced Article | [Blog — Negotiation Guide — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Interview-Focused Article | [Blog — Salary Negotiation — Tech Interview Handbook](https://www.techinterviewhandbook.org/negotiation/) |
| Video Explanation | [Salary Negotiation — Clément Mihailescu](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

461. Influencing Without Authority ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Multiple Offers Strategy — Levels.fyi](https://www.levels.fyi/) |
| Deep Dive / Advanced Article | [Blog — Competing Offers — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Interview-Focused Article | [Blog — Offers Strategy — Tech Interview Handbook](https://www.techinterviewhandbook.org/negotiation/) |
| Video Explanation | [Multiple Offers — Clément Mihailescu](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


### 🚨 Module 28.3: Production Mindset
462. Production Incidents — Frontend On-Call

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Remote Interview Tips — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook) |
| Deep Dive / Advanced Article | [Blog — Remote Interview — Dev.to](https://dev.to/nickytonline/remote-interview-tips-5c3i) |
| Interview-Focused Article | [Blog — Remote Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Remote Interview Tips — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

463. Frontend Cost Awareness

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Take-Home Assignment Tips — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook) |
| Deep Dive / Advanced Article | [Blog — Take-Home Strategy — Dev.to](https://dev.to/nickytonline/take-home-assignment-tips-5c3i) |
| Interview-Focused Article | [Blog — Take-Home Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Take-Home Tips — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

464. Privacy & GDPR in Frontend

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Post-Interview Follow-Up — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook) |
| Deep Dive / Advanced Article | [Blog — Follow-Up Emails — Dev.to](https://dev.to/nickytonline/post-interview-follow-up-5c3i) |
| Interview-Focused Article | [Blog — Post-Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Post-Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

465. Incident Postmortems — How to Write & Present

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Big Tech Culture Match — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Deep Dive / Advanced Article | [Blog — Culture Fit — Dev.to](https://dev.to/nickytonline/culture-fit-in-interviews-5c3i) |
| Interview-Focused Article | [Blog — Culture Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Culture Fit — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

466. SLO / SLA Awareness for Frontend Engineers ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Onboarding Plan — Gergely Orosz](https://newsletter.pragmaticengineer.com/) |
| Deep Dive / Advanced Article | [Blog — First 90 Days — Dev.to](https://dev.to/nickytonline/first-90-days-at-big-tech-5c3i) |
| Interview-Focused Article | [Blog — Onboarding — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [First 90 Days — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


---

## SEQUENCE 2️⃣9️⃣ — Behavioural & Leadership Round ★
> Microsoft's 'As Appropriate' round is entirely this. Most candidates underprepare.

### ⭐ Module 29.1: STAR Framework
467. STAR Method — Situation, Task, Action, Result ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — STAR Method — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — STAR Framework — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — STAR Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [STAR Method — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

468. Adding Growth Mindset to Every Story — 'What I'd Do Differently' ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Tell Me About Yourself — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Self Intro Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Tell Me About Yourself — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

469. Keeping Stories Under 2.5 Minutes ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Conflict Resolution — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Conflict Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Conflict Resolution — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

470. Quantifying Impact in Behavioural Stories ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Leadership Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Leadership Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Leadership Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


### 🎯 Module 29.2: Your 8 Core Stories
471. Story 1 — Lighthouse 60 → 95: Technical depth, delivered results ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Failure Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Failure Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Failure Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

472. Story 2 — WCAG AA Certification: Quality, customer obsession ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Achievement Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Achievement Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Achievement Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

473. Story 3 — 80% Security Vulnerability Reduction: Ownership, proactiveness ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Performance Improvements — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Performance Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Performance Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

474. Story 4 — Mentoring 4 Engineers: Leadership, scaling yourself ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Cross-Team Collaboration — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Collaboration Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Cross-Team Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

475. Story 5 — Micro-Frontend Architecture: System thinking, judgement ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Mentorship Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Mentoring Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Mentorship Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

476. Story 6 — Bosch Dashboard Delivery Under Deadline: Pressure, reliability ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Technical Decisions — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Technical Decisions Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Technical Decisions — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

477. Story 7 — Cross-Team Module Delivery: Collaboration, influence without authority ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Ownership Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Ownership Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Ownership Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

478. Story 8 — Excellence in Frontend Engineering Award: Impact recognition ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Growth Mindset — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Growth Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Growth Mindset — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


### 🏢 Module 29.3: Company-Specific Behavioural Values
479. Microsoft — Growth Mindset, Clarity, Energy, Success of Others ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Stakeholder Management — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Stakeholder Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Stakeholder Management — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

480. Adobe — Craft, Innovation, Genuine, Exceptional ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Ambiguity Handling — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Ambiguity Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Handling Ambiguity — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

481. Salesforce — Trust, Customer Success, Innovation, Equality ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Deadline Pressure — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Deadline Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Deadline Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

482. Cisco — Integrity, Trust, Collaboration, Innovation ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Innovation Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Innovation Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Innovation Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


### 💰 Module 29.4: Compensation & Negotiation
483. How to Respond to an Offer Without Weakening Your Position ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Feedback Giving/Receiving — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Feedback Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Feedback Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

484. Counter-Offering — Anchoring, Justification, Timeline ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Why This Company — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Why This Company Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Why This Company — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

485. Base vs Equity vs Bonus Trade-offs at Each Company ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Deep Dive / Advanced Article | [Blog — Where Do You See Yourself — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook) |
| Interview-Focused Article | [Blog — Career Vision Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/) |
| Video Explanation | [Career Vision — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |

486. Using Levels.fyi Data in Negotiation ★

| Resource | Link |
|---|---|
| Official Docs / Best Explanation | [Blog — Final Interview Prep — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Deep Dive / Advanced Article | [Blog — Interview Day Checklist — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook) |
| Interview-Focused Article | [Blog — Final Prep Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/) |
| Video Explanation | [Final Prep — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY) |


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