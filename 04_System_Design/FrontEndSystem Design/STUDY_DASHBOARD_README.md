# 🎯 Frontend Interview Master Dashboard — Hruday D

**486 Topics · 10 Phases · 886 Interview Experiences**

---

## 📑 Table of Contents

- [📐 PHASE 1 — FOUNDATIONS](#phase-1)
  - [SEQUENCE 1️⃣ — JavaScript Engine & Runtime](#sequence-1-javascript-engine-runtime)
  - [SEQUENCE 2️⃣ — Browser & Web Platform Internals](#sequence-2-browser-web-platform-internals)
  - [SEQUENCE 3️⃣ — TypeScript Deep Dive ★](#sequence-3-typescript-deep-dive)
- [⚛️ PHASE 2 — FRAMEWORK DEEP DIVES](#phase-2)
  - [SEQUENCE 4️⃣ — Angular & RxJS Deep Dive ★](#sequence-4-angular-rxjs-deep-dive)
  - [SEQUENCE 5️⃣ — React, Next.js & Redux Deep Dive ★](#sequence-5-react-next-js-redux-deep-dive)
- [🗄️ PHASE 3 — STATE & DATA](#phase-3)
  - [SEQUENCE 6️⃣ — State Management](#sequence-6-state-management)
  - [SEQUENCE 7️⃣ — Data Fetching & API Design](#sequence-7-data-fetching-api-design)
- [🚀 PHASE 4 — PERFORMANCE & ARCHITECTURE](#phase-4)
  - [SEQUENCE 8️⃣ — Performance Optimization](#sequence-8-performance-optimization)
  - [SEQUENCE 9️⃣ — Assets & Resource Optimization](#sequence-9-assets-resource-optimization)
  - [SEQUENCE 🔟 — Frontend Architecture Patterns](#sequence-frontend-architecture-patterns)
  - [SEQUENCE 1️⃣1️⃣ — Rendering Strategies](#sequence-1-1-rendering-strategies)
- [🔐 PHASE 5 — RELIABILITY & SECURITY](#phase-5)
  - [SEQUENCE 1️⃣2️⃣ — Caching & Offline](#sequence-1-2-caching-offline)
  - [SEQUENCE 1️⃣3️⃣ — Security](#sequence-1-3-security)
  - [SEQUENCE 1️⃣4️⃣ — Authorization & Access Control](#sequence-1-4-authorization-access-control)
- [🌐 PHASE 6 — SCALABILITY & REAL-TIME](#phase-6)
  - [SEQUENCE 1️⃣5️⃣ — Real-Time Systems](#sequence-1-5-real-time-systems)
  - [SEQUENCE 1️⃣6️⃣ — Scalability & Growth](#sequence-1-6-scalability-growth)
- [♿ PHASE 7 — QUALITY & OBSERVABILITY](#phase-7)
  - [SEQUENCE 1️⃣7️⃣ — Accessibility & UX](#sequence-1-7-accessibility-ux)
  - [SEQUENCE 1️⃣8️⃣ — Testing Strategy ★](#sequence-1-8-testing-strategy)
  - [SEQUENCE 1️⃣9️⃣ — Observability](#sequence-1-9-observability)
  - [SEQUENCE 2️⃣0️⃣ — CI/CD & Frontend DevOps ★](#sequence-2-0-ci-cd-frontend-devops)
- [🏢 PHASE 8 — COMPANY-SPECIFIC MODULES](#phase-8)
  - [SEQUENCE 2️⃣1️⃣ — Web Components & Lightning Web Components ★](#sequence-2-1-web-components-lightning-web-components)
  - [SEQUENCE 2️⃣2️⃣ — SAP UI5 & Enterprise Frontend Patterns ★](#sequence-2-2-sap-ui5-enterprise-frontend-patterns)
- [🎯 PHASE 9 — SYSTEM DESIGN & INTERVIEW EXECUTION](#phase-9)
  - [SEQUENCE 2️⃣3️⃣ — Frontend System Design Foundations](#sequence-2-3-frontend-system-design-foundations)
  - [SEQUENCE 2️⃣4️⃣ — DSA for Frontend Engineers ★](#sequence-2-4-dsa-for-frontend-engineers)
  - [SEQUENCE 2️⃣5️⃣ — Practical System Design Problems](#sequence-2-5-practical-system-design-problems)
  - [SEQUENCE 2️⃣6️⃣ — Machine Coding ↔ Design Bridge](#sequence-2-6-machine-coding-design-bridge)
  - [SEQUENCE 2️⃣7️⃣ — Interview Strategy](#sequence-2-7-interview-strategy)
- [👑 PHASE 10 — LEADERSHIP & FINAL PREP](#phase-10)
  - [SEQUENCE 2️⃣8️⃣ — FAANG-Level Expectations](#sequence-2-8-faang-level-expectations)
  - [SEQUENCE 2️⃣9️⃣ — Behavioural & Leadership Round ★](#sequence-2-9-behavioural-leadership-round)
- [📋 INTERVIEW EXPERIENCES — 886 Real Stories](INTERVIEW_EXPERIENCES.md)

---

## 📐 PHASE 1 — FOUNDATIONS

*Weeks 1–2 | These underpin everything else. Master these before touching React or Angular.*

### SEQUENCE 1️⃣ — JavaScript Engine & Runtime

> Everything runs on JS. If this is shaky, nothing else holds.

#### ⚙️ Module 1.1: Execution Model

**1. JavaScript Execution Model**

- 📖 **Official Docs**: [MDN — JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- 🔬 **Deep Dive**: [How JavaScript Works — Alexander Zlatkov (SessionStack)](https://blog.sessionstack.com/how-does-javascript-actually-work-part-1-b0bacc073cf)
- 🎯 **Interview Prep**: [GeeksForGeeks — JavaScript Execution Context](https://www.geeksforgeeks.org/javascript-execution-context/)
- 🎬 **Video**: [Namaste JS Ep.1 — Execution Context — Akshay Saini](https://www.youtube.com/watch?v=ZvbzSrg0afE)

**2. Event Loop (Microtasks vs Macrotasks)**

- 📖 **Official Docs**: [MDN — Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
- 🔬 **Deep Dive**: [JavaScript Visualized: Event Loop — Lydia Hallie](https://dev.to/lydiahallie/javascript-visualized-event-loop-3dif)
- 🎯 **Interview Prep**: [GeeksForGeeks — Event Loop in JavaScript](https://www.geeksforgeeks.org/what-is-an-event-loop-in-javascript/)
- 🎬 **Video**: [What the heck is the event loop anyway? — Philip Roberts (JSConf)](https://www.youtube.com/watch?v=cCOL7MC4Pl0)

**3. Main Thread vs Worker Threads**

- 📖 **Official Docs**: [MDN — Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- 🔬 **Deep Dive**: [web.dev — Workers Overview](https://web.dev/articles/workers-overview)
- 🎯 **Interview Prep**: [GeeksForGeeks — Web Workers in JavaScript](https://www.geeksforgeeks.org/web-workers-in-javascript/)
- 🎬 **Video**: [Web Workers in 100 Seconds — Fireship](https://www.youtube.com/watch?v=Gcp7UkUlvhc)

**4. Call Stack, Task Queue, Microtask Queue — How They Interact ★ ★**

- 📖 **Official Docs**: [MDN — Concurrency Model and Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
- 🔬 **Deep Dive**: [JavaScript Visualized: Event Loop — Lydia Hallie](https://dev.to/lydiahallie/javascript-visualized-event-loop-3dif)
- 🎯 **Interview Prep**: [Frontend Interview Handbook — Event Loop](https://www.frontendinterviewhandbook.com/javascript-questions/#explain-event-delegation)
- 🎬 **Video**: [Namaste JS Ep.2 — How JS Code Executes — Akshay Saini](https://www.youtube.com/watch?v=iLWTnMzWtj4)

#### 🧠 Module 1.2: Language Internals

**5. Closures — Scope Chain, Lexical Environment**

- 📖 **Official Docs**: [MDN — Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- 🔬 **Deep Dive**: [javascript.info — Closures](https://javascript.info/closure)
- 🎯 **Interview Prep**: [GeeksForGeeks — Closures in JavaScript](https://www.geeksforgeeks.org/closure-in-javascript/)
- 🎬 **Video**: [Namaste JS — Closures — Akshay Saini](https://www.youtube.com/watch?v=qikxEIxsXco)

**6. Prototypal Inheritance — Prototype Chain, Object.create**

- 📖 **Official Docs**: [MDN — Inheritance and the Prototype Chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
- 🔬 **Deep Dive**: [javascript.info — Prototypal Inheritance](https://javascript.info/prototype-inheritance)
- 🎯 **Interview Prep**: [GeeksForGeeks — Prototypal Inheritance](https://www.geeksforgeeks.org/prototypal-inheritance-in-javascript/)
- 🎬 **Video**: [Namaste JS — Prototype & Prototypal Inheritance — Akshay Saini](https://www.youtube.com/watch?v=wstwjQ1yqWQ)

**7. this Keyword — All 4 Contexts, call/apply/bind**

- 📖 **Official Docs**: [MDN — this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- 🔬 **Deep Dive**: [javascript.info — Object Methods, this](https://javascript.info/object-methods)
- 🎯 **Interview Prep**: [GeeksForGeeks — this Keyword in JavaScript](https://www.geeksforgeeks.org/this-in-javascript/)
- 🎬 **Video**: [Namaste JS — this Keyword — Akshay Saini](https://www.youtube.com/watch?v=rv7Q11KWmKU)

**8. Hoisting — var vs let vs const vs function declarations**

- 📖 **Official Docs**: [MDN — Hoisting](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting)
- 🔬 **Deep Dive**: [javascript.info — The old var](https://javascript.info/var)
- 🎯 **Interview Prep**: [GeeksForGeeks — Hoisting in JavaScript](https://www.geeksforgeeks.org/javascript-hoisting/)
- 🎬 **Video**: [Namaste JS — Hoisting — Akshay Saini](https://www.youtube.com/watch?v=Fnlnw8uY6jo)

**9. Garbage Collection & Memory Leaks in JS ★ ★**

- 📖 **Official Docs**: [MDN — Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management)
- 🔬 **Deep Dive**: [javascript.info — Garbage Collection](https://javascript.info/garbage-collection)
- 🎯 **Interview Prep**: [GeeksForGeeks — Memory Leaks in JavaScript](https://www.geeksforgeeks.org/memory-leaks-in-javascript/)
- 🎬 **Video**: [Memory Leaks Demystified — Google Chrome Developers](https://www.youtube.com/watch?v=YDU_3WdfkxA)

#### 🔄 Module 1.3: Async JavaScript

**10. Promises Internals — Microtask Queue, .then Chaining**

- 📖 **Official Docs**: [MDN — Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- 🔬 **Deep Dive**: [javascript.info — Promises, async/await](https://javascript.info/async)
- 🎯 **Interview Prep**: [GeeksForGeeks — JavaScript Promises](https://www.geeksforgeeks.org/javascript-promises/)
- 🎬 **Video**: [Namaste JS S2 — Promises — Akshay Saini](https://www.youtube.com/watch?v=ap-6PPAuK1Y)

**11. async/await — How It Compiles Down to Promises**

- 📖 **Official Docs**: [MDN — async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- 🔬 **Deep Dive**: [javascript.info — Async/Await](https://javascript.info/async-await)
- 🎯 **Interview Prep**: [GeeksForGeeks — Async/Await in JavaScript](https://www.geeksforgeeks.org/async-await-function-in-javascript/)
- 🎬 **Video**: [Namaste JS S2 — async/await — Akshay Saini](https://www.youtube.com/watch?v=6nv3qy3oNkc)

**12. Promise.all / Promise.race / Promise.allSettled / Promise.any**

- 📖 **Official Docs**: [MDN — Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- 🔬 **Deep Dive**: [javascript.info — Promise API](https://javascript.info/promise-api)
- 🎯 **Interview Prep**: [GeeksForGeeks — Promise.all vs Promise.allSettled](https://www.geeksforgeeks.org/what-is-the-difference-between-promise-all-and-promise-allsettled/)
- 🎬 **Video**: [Namaste JS S2 — Promise APIs — Akshay Saini](https://www.youtube.com/watch?v=DlTVt1rZjIo)

**13. Generators and Iterators**

- 📖 **Official Docs**: [MDN — Iterators and Generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators)
- 🔬 **Deep Dive**: [javascript.info — Generators](https://javascript.info/generators)
- 🎯 **Interview Prep**: [GeeksForGeeks — Generators in JavaScript](https://www.geeksforgeeks.org/javascript-generator/)
- 🎬 **Video**: [Generators in JavaScript — Fireship](https://www.youtube.com/watch?v=IJ6EgdiI_wU)

**14. AbortController & Request Cancellation ★ ★**

- 📖 **Official Docs**: [MDN — AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- 🔬 **Deep Dive**: [web.dev — Abortable Fetch](https://web.dev/articles/abortable-fetch)
- 🎯 **Interview Prep**: [GeeksForGeeks — AbortController in JavaScript](https://www.geeksforgeeks.org/how-to-cancel-a-fetch-request-in-javascript/)
- 🎬 **Video**: [AbortController Explained — Steve Griffith](https://www.youtube.com/watch?v=SaoE9AKnHO4)

#### 🛠️ Module 1.4: Frontend-Specific JS Implementations

**15. Implement debounce (with leading/trailing options) ★ ★**

- 📖 **Official Docs**: [MDN — setTimeout / Timing](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout)
- 🔬 **Deep Dive**: [CSS-Tricks — Debouncing and Throttling Explained](https://css-tricks.com/debouncing-throttling-explained-examples/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Implement Debounce](https://www.geeksforgeeks.org/debouncing-in-javascript/)
- 🎬 **Video**: [Debounce in JavaScript — Akshay Saini](https://www.youtube.com/watch?v=Zo-6_qx8uxg)

**16. Implement throttle ★ ★**

- 📖 **Official Docs**: [MDN — setTimeout / Timing](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout)
- 🔬 **Deep Dive**: [CSS-Tricks — Debouncing and Throttling Explained](https://css-tricks.com/debouncing-throttling-explained-examples/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Implement Throttle](https://www.geeksforgeeks.org/throttling-in-javascript/)
- 🎬 **Video**: [Throttle in JavaScript — Akshay Saini](https://www.youtube.com/watch?v=81NGEXAaa3Y)

**17. Implement curry, memoize, once, pipe ★ ★**

- 📖 **Official Docs**: [javascript.info — Currying](https://javascript.info/currying-partials)
- 🔬 **Deep Dive**: [Blog — Understanding Currying, Memoize, Pipe — LogRocket](https://blog.logrocket.com/understanding-javascript-currying/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Currying in JavaScript](https://www.geeksforgeeks.org/what-is-currying-function-in-javascript/)
- 🎬 **Video**: [Currying in JavaScript — Akshay Saini](https://www.youtube.com/watch?v=vQcCNpuaJO8)

**18. Implement Deep Clone & Deep Equal ★ ★**

- 📖 **Official Docs**: [MDN — structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
- 🔬 **Deep Dive**: [javascript.info — Object Copying, References](https://javascript.info/object-copy)
- 🎯 **Interview Prep**: [GeeksForGeeks — Deep Clone in JavaScript](https://www.geeksforgeeks.org/how-to-deep-clone-in-javascript/)
- 🎬 **Video**: [Deep Clone in JavaScript — Akshay Saini](https://www.youtube.com/watch?v=4jb4AYEyhRc)

**19. Implement Promise.all / Promise.race from Scratch ★ ★**

- 📖 **Official Docs**: [MDN — Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- 🔬 **Deep Dive**: [javascript.info — Promise API](https://javascript.info/promise-api)
- 🎯 **Interview Prep**: [LeetCode Discuss — Implement Promise.all](https://leetcode.com/problems/execute-asynchronous-functions-in-parallel/)
- 🎬 **Video**: [Implement Promise.all from Scratch — Chirag Goel](https://www.youtube.com/watch?v=DMmbs4TpkbA)

**20. Implement EventEmitter / Pub-Sub ★ ★**

- 📖 **Official Docs**: [Node.js — Events API](https://nodejs.org/api/events.html)
- 🔬 **Deep Dive**: [patterns.dev — Observer Pattern](https://www.patterns.dev/vanilla/observer-pattern)
- 🎯 **Interview Prep**: [GeeksForGeeks — Event Emitter in JavaScript](https://www.geeksforgeeks.org/how-to-create-a-custom-event-emitter-in-javascript/)
- 🎬 **Video**: [Pub/Sub Pattern in JavaScript — Fireship](https://www.youtube.com/watch?v=aynSM8llOBs)

**21. Implement LRU Cache (Map + doubly linked list) ★ ★**

- 📖 **Official Docs**: [MDN — Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- 🔬 **Deep Dive**: [LeetCode 146 — LRU Cache](https://leetcode.com/problems/lru-cache/)
- 🎯 **Interview Prep**: [LeetCode 146 — LRU Cache](https://leetcode.com/problems/lru-cache/)
- 🎬 **Video**: [LRU Cache — NeetCode](https://www.youtube.com/watch?v=7ABFKPK2hD4)

### SEQUENCE 2️⃣ — Browser & Web Platform Internals

> How the browser works is tested at Adobe & Microsoft. Your Lighthouse story lives here.

#### 🏗️ Module 2.1: Browser Architecture

**22. How the Browser Works (High Level)**

- 📖 **Official Docs**: [web.dev — How Browsers Work](https://web.dev/articles/howbrowserswork)
- 🔬 **Deep Dive**: [Inside look at modern web browser — Google](https://developer.chrome.com/blog/inside-browser-part1)
- 🎯 **Interview Prep**: [GeeksForGeeks — How Browsers Work](https://www.geeksforgeeks.org/how-the-browser-renders-a-web-page/)
- 🎬 **Video**: [How Browsers Work — Akshay Saini](https://www.youtube.com/watch?v=5rLFYtXHo9s)

**23. Browser Process Architecture — Renderer, GPU, Network processes ★ ★**

- 📖 **Official Docs**: [Chrome — Multi-process Architecture](https://developer.chrome.com/blog/inside-browser-part1)
- 🔬 **Deep Dive**: [Inside look at modern web browser (Part 2) — Google](https://developer.chrome.com/blog/inside-browser-part2)
- 🎯 **Interview Prep**: [GeeksForGeeks — Browser Architecture](https://www.geeksforgeeks.org/browser-architecture/)
- 🎬 **Video**: [Browser Internals — Google Chrome Developers](https://www.youtube.com/watch?v=PzzNuCk-e0Y)

**24. Critical Rendering Path (CRP)**

- 📖 **Official Docs**: [MDN — Critical Rendering Path](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path)
- 🔬 **Deep Dive**: [web.dev — Critical Rendering Path](https://web.dev/articles/critical-rendering-path)
- 🎯 **Interview Prep**: [GeeksForGeeks — Critical Rendering Path](https://www.geeksforgeeks.org/critical-rendering-path-flow/)
- 🎬 **Video**: [Critical Rendering Path — Ilya Grigorik (Google)](https://www.youtube.com/watch?v=PkOBnYxqj3k)

**25. HTML Parsing, CSSOM, Render Tree**

- 📖 **Official Docs**: [MDN — How Browsers Work: Parsing](https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work)
- 🔬 **Deep Dive**: [web.dev — Constructing the Object Model](https://web.dev/articles/critical-rendering-path/constructing-the-object-model)
- 🎯 **Interview Prep**: [web.dev — Constructing the DOM, CSSOM, Render Tree](https://web.dev/articles/critical-rendering-path/constructing-the-object-model)
- 🎬 **Video**: [HTML Parsing Deep Dive — Google Chrome Developers](https://www.youtube.com/watch?v=Lsg84NtJbmI)

#### 🎨 Module 2.2: Rendering Pipeline

**26. Reflows vs Repaints**

- 📖 **Official Docs**: [MDN — CSS Reflows & Repaints](https://developer.mozilla.org/en-US/docs/Glossary/Reflow)
- 🔬 **Deep Dive**: [web.dev — Avoid Large, Complex Layouts and Layout Thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)
- 🎯 **Interview Prep**: [GeeksForGeeks — Reflow vs Repaint](https://www.geeksforgeeks.org/what-is-the-difference-between-reflow-and-repaint/)
- 🎬 **Video**: [Reflow & Repaint — Google Chrome Developers](https://www.youtube.com/watch?v=0fOSaICXkJY)

**27. GPU vs CPU Rendering**

- 📖 **Official Docs**: [MDN — Compositing and Painting](https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work#compositing)
- 🔬 **Deep Dive**: [web.dev — Stick to Compositor-Only Properties](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)
- 🎯 **Interview Prep**: [Chrome Developers — GPU Compositing](https://developer.chrome.com/blog/gpu-accelerated-compositing-in-chrome)
- 🎬 **Video**: [GPU vs CPU Rendering — Fireship](https://www.youtube.com/watch?v=nmXMgqjQzls)

**28. Compositing Layers & will-change ★ ★**

- 📖 **Official Docs**: [MDN — will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- 🔬 **Deep Dive**: [web.dev — Manage Layer Count](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)
- 🎯 **Interview Prep**: [GeeksForGeeks — CSS will-change Property](https://www.geeksforgeeks.org/css-will-change-property/)
- 🎬 **Video**: [CSS will-change & Layers — Jake Archibald (Google)](https://www.youtube.com/watch?v=thNyy5VZfbg)

**29. Browser Resource Prioritization**

- 📖 **Official Docs**: [web.dev — Fetch Priority API](https://web.dev/articles/fetch-priority)
- 🔬 **Deep Dive**: [Chrome — Resource Fetch Prioritization](https://developer.chrome.com/docs/devtools/network/reference#priority)
- 🎯 **Interview Prep**: [web.dev — Resource Fetch Priority](https://web.dev/articles/fetch-priority)
- 🎬 **Video**: [Resource Priorities — Google Chrome Developers](https://www.youtube.com/watch?v=SrU03vP0vMc)

**30. Avoiding Layout Thrashing ★ ★**

- 📖 **Official Docs**: [web.dev — Avoid Layout Thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)
- 🔬 **Deep Dive**: [CSS Triggers — What causes reflow/repaint](https://csstriggers.com/)
- 🎯 **Interview Prep**: [Paul Irish — What Forces Layout/Reflow (Gist)](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)
- 🎬 **Video**: [Avoiding Layout Thrashing — Jake Archibald](https://www.youtube.com/watch?v=SmE4OwHztCc)

#### 💾 Module 2.3: Memory & Storage

**31. Memory Management in Browser**

- 📖 **Official Docs**: [MDN — Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management)
- 🔬 **Deep Dive**: [Chrome — Fix Memory Problems](https://developer.chrome.com/docs/devtools/memory-problems)
- 🎯 **Interview Prep**: [GeeksForGeeks — Browser Memory Management](https://www.geeksforgeeks.org/javascript-memory-management/)
- 🎬 **Video**: [Chrome DevTools Memory Tab — Google Chrome Developers](https://www.youtube.com/watch?v=YjMFjXiWsps)

**32. Browser Storage Options Overview**

- 📖 **Official Docs**: [MDN — Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- 🔬 **Deep Dive**: [web.dev — Storage for the Web](https://web.dev/articles/storage-for-the-web)
- 🎯 **Interview Prep**: [GeeksForGeeks — Web Storage API](https://www.geeksforgeeks.org/html-web-storage-api/)
- 🎬 **Video**: [Browser Storage Crash Course — Traversy Media](https://www.youtube.com/watch?v=GihQAC1I39Q)

**33. Storage Quotas & Eviction Policies ★ ★**

- 📖 **Official Docs**: [MDN — Storage Quotas and Eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- 🔬 **Deep Dive**: [web.dev — Storage for the Web](https://web.dev/articles/storage-for-the-web)
- 🎯 **Interview Prep**: [web.dev — Storage for the Web (Quotas)](https://web.dev/articles/storage-for-the-web)
- 🎬 **Video**: [Storage API — Google Chrome Developers](https://www.youtube.com/watch?v=NNuTV-gjlZQ)

**34. Origin Private File System (OPFS) ★ ★**

- 📖 **Official Docs**: [MDN — Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- 🔬 **Deep Dive**: [web.dev — Origin Private File System](https://web.dev/articles/origin-private-file-system)
- 🎯 **Interview Prep**: [web.dev — Origin Private File System](https://web.dev/articles/origin-private-file-system)
- 🎬 **Video**: [File System Access API — Google Chrome Developers](https://www.youtube.com/watch?v=GNuG-5m4Ud0)

#### 🌐 Module 2.4: Network Layer

**35. Network Stack Basics**

- 📖 **Official Docs**: [MDN — HTTP Overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview)
- 🔬 **Deep Dive**: [web.dev — Network Reliability](https://web.dev/articles/reliable)
- 🎯 **Interview Prep**: [GeeksForGeeks — HTTP Protocol](https://www.geeksforgeeks.org/http-full-form/)
- 🎬 **Video**: [HTTP Crash Course — Traversy Media](https://www.youtube.com/watch?v=iYM2zFP3Zn0)

**36. HTTP/1.1 vs HTTP/2 vs HTTP/3**

- 📖 **Official Docs**: [MDN — HTTP/2](https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2)
- 🔬 **Deep Dive**: [web.dev — Introduction to HTTP/2](https://web.dev/articles/performance-http2)
- 🎯 **Interview Prep**: [Cloudflare — HTTP/2 vs HTTP/1.1](https://www.cloudflare.com/learning/performance/http2-vs-http1.1/)
- 🎬 **Video**: [HTTP/1 to HTTP/3 Evolution — Hussein Nasser](https://www.youtube.com/watch?v=a-sBfyiXysI)

**37. Connection Reuse & Head-of-Line Blocking**

- 📖 **Official Docs**: [MDN — Connection Management in HTTP/1.x](https://developer.mozilla.org/en-US/docs/Web/HTTP/Connection_management_in_HTTP_1.x)
- 🔬 **Deep Dive**: [Blog — Head-of-Line Blocking — Cloudflare](https://www.cloudflare.com/learning/performance/what-is-http3/)
- 🎯 **Interview Prep**: [Cloudflare — What is HTTP/3 (Head-of-Line)](https://www.cloudflare.com/learning/performance/what-is-http3/)
- 🎬 **Video**: [HTTP Head-of-Line Blocking Explained — Hussein Nasser](https://www.youtube.com/watch?v=GriONb4EfPY)

**38. DNS Prefetch, Preconnect, Early Hints (103) ★ ★**

- 📖 **Official Docs**: [web.dev — Preconnect to Required Origins](https://web.dev/articles/preconnect-and-dns-prefetch)
- 🔬 **Deep Dive**: [MDN — Resource Hints](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preconnect)
- 🎯 **Interview Prep**: [web.dev — Preconnect & DNS Prefetch](https://web.dev/articles/preconnect-and-dns-prefetch)
- 🎬 **Video**: [Resource Hints — Google Chrome Developers](https://www.youtube.com/watch?v=YJGCZCaIZkQ)

**39. QUIC Protocol Basics ★ ★**

- 📖 **Official Docs**: [Cloudflare — What is QUIC?](https://www.cloudflare.com/learning/performance/what-is-http3/)
- 🔬 **Deep Dive**: [Blog — QUIC Protocol Deep Dive — Cloudflare](https://blog.cloudflare.com/the-road-to-quic/)
- 🎯 **Interview Prep**: [Cloudflare — What is QUIC?](https://www.cloudflare.com/learning/performance/what-is-http3/)
- 🎬 **Video**: [QUIC & HTTP/3 Explained — Hussein Nasser](https://www.youtube.com/watch?v=idViw4anA6E)

#### 🕸️ Module 2.5: Worker Threads

**40. Web Workers — Use Cases, Limitations, Communication**

- 📖 **Official Docs**: [MDN — Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- 🔬 **Deep Dive**: [web.dev — Use Web Workers](https://web.dev/articles/workers-overview)
- 🎯 **Interview Prep**: [GeeksForGeeks — Web Workers API](https://www.geeksforgeeks.org/web-workers-in-javascript/)
- 🎬 **Video**: [Web Workers Explained — Fireship](https://www.youtube.com/watch?v=Gcp7UkUlvhc)

**41. Service Workers — Lifecycle, Fetch Interception, Push**

- 📖 **Official Docs**: [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- 🔬 **Deep Dive**: [web.dev — Service Workers: An Introduction](https://web.dev/articles/service-workers-lifecycle)
- 🎯 **Interview Prep**: [GeeksForGeeks — Service Workers](https://www.geeksforgeeks.org/service-workers-in-javascript/)
- 🎬 **Video**: [Service Workers Crash Course — Traversy Media](https://www.youtube.com/watch?v=ksXwaWHCW6k)

**42. Worklets — Audio, Paint, Layout Worklets**

- 📖 **Official Docs**: [MDN — Worklets](https://developer.mozilla.org/en-US/docs/Web/API/Worklet)
- 🔬 **Deep Dive**: [web.dev — Animation Worklet](https://web.dev/articles/houdini-how)
- 🎯 **Interview Prep**: [Chrome Developers — CSS Paint API (Worklets)](https://developer.chrome.com/blog/css-paint-api)
- 🎬 **Video**: [CSS Houdini Worklets — Google Chrome Developers](https://www.youtube.com/watch?v=GhRE3rML9t4)

### SEQUENCE 3️⃣ — TypeScript Deep Dive ★

> Microsoft, Cisco, Adobe all test this. Do it early — you will use TypeScript in every code example after this.

#### 📘 Module 3.1: TypeScript Fundamentals

**43. Types vs Interfaces — When to Use Which ★ ★**

- 📖 **Official Docs**: [TypeScript Handbook — Types vs Interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- 🔬 **Deep Dive**: [Total TypeScript — Type vs Interface](https://www.totaltypescript.com/type-vs-interface-which-should-you-use)
- 🎯 **Interview Prep**: [Total TypeScript — Type vs Interface](https://www.totaltypescript.com/type-vs-interface-which-should-you-use)
- 🎬 **Video**: [Type vs Interface — Matt Pocock](https://www.youtube.com/watch?v=zM9UPcIyyhQ)

**44. Union & Intersection Types ★ ★**

- 📖 **Official Docs**: [TypeScript Handbook — Union Types](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- 🔬 **Deep Dive**: [TypeScript Handbook — Intersection Types](https://www.typescriptlang.org/docs/handbook/2/objects.html#intersection-types)
- 🎯 **Interview Prep**: [GeeksForGeeks — Union & Intersection Types in TS](https://www.geeksforgeeks.org/typescript-union-type/)
- 🎬 **Video**: [Union Types Explained — Matt Pocock](https://www.youtube.com/watch?v=9i38FPugxB8)

**45. Generics — Functions, Classes, Constraints ★ ★**

- 📖 **Official Docs**: [TypeScript Handbook — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- 🔬 **Deep Dive**: [Total TypeScript — Generics Tutorial](https://www.totaltypescript.com/tutorials/beginners-typescript)
- 🎯 **Interview Prep**: [GeeksForGeeks — TypeScript Generics](https://www.geeksforgeeks.org/generics-in-typescript/)
- 🎬 **Video**: [TypeScript Generics — Fireship](https://www.youtube.com/watch?v=nViEqpgwxHE)

**46. Enums vs Const Assertions vs Union Types ★ ★**

- 📖 **Official Docs**: [TypeScript Handbook — Enums](https://www.typescriptlang.org/docs/handbook/enums.html)
- 🔬 **Deep Dive**: [Total TypeScript — Enums Considered Harmful](https://www.totaltypescript.com/concepts/enums)
- 🎯 **Interview Prep**: [Total TypeScript — Enums Considered Harmful](https://www.totaltypescript.com/concepts/enums)
- 🎬 **Video**: [Enums vs Const — Matt Pocock](https://www.youtube.com/watch?v=jjMbPt_H3RQ)

#### ⚙️ Module 3.2: Advanced Types

**47. Conditional Types — infer keyword ★ ★**

- 📖 **Official Docs**: [TypeScript Handbook — Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- 🔬 **Deep Dive**: [Total TypeScript — Conditional Types](https://www.totaltypescript.com/books/total-typescript-essentials/conditional-types-and-infer)
- 🎯 **Interview Prep**: [GeeksForGeeks — Conditional Types in TypeScript](https://www.geeksforgeeks.org/typescript-conditional-types/)
- 🎬 **Video**: [Conditional Types — Matt Pocock](https://www.youtube.com/watch?v=SbVgPQDealg)

**48. Mapped Types — keyof, in, as ★ ★**

- 📖 **Official Docs**: [TypeScript Handbook — Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- 🔬 **Deep Dive**: [Total TypeScript — Mapped Types Guide](https://www.totaltypescript.com/books/total-typescript-essentials/mapped-types)
- 🎯 **Interview Prep**: [GeeksForGeeks — Mapped Types in TypeScript](https://www.geeksforgeeks.org/typescript-mapped-types/)
- 🎬 **Video**: [Mapped Types — Matt Pocock](https://www.youtube.com/watch?v=TtDP6lpSjWc)

**49. Template Literal Types ★ ★**

- 📖 **Official Docs**: [TypeScript Handbook — Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- 🔬 **Deep Dive**: [Total TypeScript — Template Literals](https://www.totaltypescript.com/concepts/template-literal-types)
- 🎯 **Interview Prep**: [GeeksForGeeks — Template Literal Types](https://www.geeksforgeeks.org/typescript-template-literal-types/)
- 🎬 **Video**: [Template Literal Types — Matt Pocock](https://www.youtube.com/watch?v=tMaJJMBIEBM)

**50. Discriminated Unions ★ ★**

- 📖 **Official Docs**: [TypeScript Handbook — Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- 🔬 **Deep Dive**: [Total TypeScript — Discriminated Union](https://www.totaltypescript.com/concepts/discriminated-union)
- 🎯 **Interview Prep**: [GeeksForGeeks — Discriminated Unions in TS](https://www.geeksforgeeks.org/typescript-discriminated-unions/)
- 🎬 **Video**: [Discriminated Unions — Matt Pocock](https://www.youtube.com/watch?v=4uVzb8AkpGU)

**51. Utility Types — Partial, Required, Pick, Omit, Record, ReturnType, Parameters ★ ★**

- 📖 **Official Docs**: [TypeScript Handbook — Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- 🔬 **Deep Dive**: [Total TypeScript — Utility Types Guide](https://www.totaltypescript.com/books/total-typescript-essentials/utility-types)
- 🎯 **Interview Prep**: [GeeksForGeeks — TypeScript Utility Types](https://www.geeksforgeeks.org/typescript-utility-types/)
- 🎬 **Video**: [All TypeScript Utility Types — Fireship](https://www.youtube.com/watch?v=EU0wg_VjQLg)

#### ⚛️ Module 3.3: TypeScript with React

**52. Typing Props, Children, Events, Refs ★ ★**

- 📖 **Official Docs**: [React Docs — TypeScript with React](https://react.dev/learn/typescript)
- 🔬 **Deep Dive**: [Total TypeScript — React with TypeScript](https://www.totaltypescript.com/tutorials/react-with-typescript)
- 🎯 **Interview Prep**: [React TypeScript Cheatsheet — GitHub](https://github.com/typescript-cheatsheets/react)
- 🎬 **Video**: [React + TypeScript — Jack Herrington](https://www.youtube.com/watch?v=TPACABQTHvM)

**53. Typing Custom Hooks ★ ★**

- 📖 **Official Docs**: [React Docs — Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- 🔬 **Deep Dive**: [Total TypeScript — React with TypeScript](https://www.totaltypescript.com/tutorials/react-with-typescript)
- 🎯 **Interview Prep**: [React TypeScript Cheatsheet — Hooks](https://github.com/typescript-cheatsheets/react#hooks)
- 🎬 **Video**: [Typing Custom Hooks — Jack Herrington](https://www.youtube.com/watch?v=05eTaw0gfSM)

**54. Typing Context with Generic Providers ★ ★**

- 📖 **Official Docs**: [React Docs — useContext](https://react.dev/reference/react/useContext)
- 🔬 **Deep Dive**: [Total TypeScript — React with TypeScript](https://www.totaltypescript.com/tutorials/react-with-typescript)
- 🎯 **Interview Prep**: [React TypeScript Cheatsheet — Context](https://github.com/typescript-cheatsheets/react#context)
- 🎬 **Video**: [Generic Context Providers — Jack Herrington](https://www.youtube.com/watch?v=hzOqSzpp-Tc)

**55. Typing HOCs and Render Props ★ ★**

- 📖 **Official Docs**: [React Docs — HOC Patterns](https://react.dev/reference/react/forwardRef)
- 🔬 **Deep Dive**: [Total TypeScript — React with TypeScript](https://www.totaltypescript.com/tutorials/react-with-typescript)
- 🎯 **Interview Prep**: [React TypeScript Cheatsheet — HOC](https://github.com/typescript-cheatsheets/react#hoc-cheatsheet)
- 🎬 **Video**: [HOCs with TypeScript — Jack Herrington](https://www.youtube.com/watch?v=9RSGVjmjgRE)

#### 🔧 Module 3.4: Compiler & Config

**56. tsconfig Deep Dive — strict, paths, moduleResolution ★ ★**

- 📖 **Official Docs**: [TypeScript — TSConfig Reference](https://www.typescriptlang.org/tsconfig)
- 🔬 **Deep Dive**: [Total TypeScript — TSConfig Cheatsheet](https://www.totaltypescript.com/tsconfig-cheat-sheet)
- 🎯 **Interview Prep**: [Total TypeScript — TSConfig Cheatsheet](https://www.totaltypescript.com/tsconfig-cheat-sheet)
- 🎬 **Video**: [tsconfig Deep Dive — Matt Pocock](https://www.youtube.com/watch?v=mHIYvrGEBDM)

**57. Declaration Files (.d.ts) — Writing & Consuming ★ ★**

- 📖 **Official Docs**: [TypeScript — Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
- 🔬 **Deep Dive**: [Total TypeScript — .d.ts Files](https://www.totaltypescript.com/concepts/type-declarations)
- 🎯 **Interview Prep**: [GeeksForGeeks — .d.ts Declaration Files](https://www.geeksforgeeks.org/what-are-declaration-d-ts-files-in-typescript/)
- 🎬 **Video**: [d.ts Files Explained — Matt Pocock](https://www.youtube.com/watch?v=zu-EgnbmcLY)

**58. TypeScript with Vite vs Webpack ★ ★**

- 📖 **Official Docs**: [Vite — TypeScript Support](https://vitejs.dev/guide/features.html#typescript)
- 🔬 **Deep Dive**: [Blog — TypeScript in Vite vs Webpack — LogRocket](https://blog.logrocket.com/vite-adoption-guide/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Vite vs Webpack](https://www.geeksforgeeks.org/difference-between-vite-and-webpack/)
- 🎬 **Video**: [Vite in 100 Seconds — Fireship](https://www.youtube.com/watch?v=KCrXgy8qtjM)

---

## ⚛️ PHASE 2 — FRAMEWORK DEEP DIVES

*Weeks 3–5 | Go deep on your two frameworks. Angular first (your strength), then React (your growth area).*

### SEQUENCE 4️⃣ — Angular & RxJS Deep Dive ★

> Your core strength. Cisco is Angular-heavy. Formalise everything you already know into interview-ready answers.

#### 🏗️ Module 4.1: Angular Architecture

**59. NgModules vs Standalone Components (Angular 14+) ★ ★**

- 📖 **Official Docs**: [Angular — Standalone Components](https://angular.dev/guide/components)
- 🔬 **Deep Dive**: [Angular Blog — Standalone Components](https://blog.angular.io/standalone-components-in-angular-d0d54a0bb82f)
- 🎯 **Interview Prep**: [GeeksForGeeks — Standalone Components in Angular](https://www.geeksforgeeks.org/angular-standalone-components/)
- 🎬 **Video**: [Angular Standalone Components — Joshua Morony](https://www.youtube.com/watch?v=x5PZwb4XurU)

**60. Dependency Injection — Hierarchical Injectors, Tokens ★ ★**

- 📖 **Official Docs**: [Angular — Dependency Injection](https://angular.dev/guide/di)
- 🔬 **Deep Dive**: [Angular Blog — Hierarchical Injectors](https://angular.dev/guide/di/hierarchical-dependency-injection)
- 🎯 **Interview Prep**: [GeeksForGeeks — Dependency Injection in Angular](https://www.geeksforgeeks.org/dependency-injection-in-angularjs/)
- 🎬 **Video**: [Angular DI Explained — Decoded Frontend](https://www.youtube.com/watch?v=G6ByZ_bGPxc)

**61. Component Lifecycle Hooks — All 8 Hooks & When to Use ★ ★**

- 📖 **Official Docs**: [Angular — Component Lifecycle](https://angular.dev/guide/components/lifecycle)
- 🔬 **Deep Dive**: [Blog — Angular Lifecycle Hooks — LogRocket](https://blog.logrocket.com/angular-lifecycle-hooks/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Angular Lifecycle Hooks](https://www.geeksforgeeks.org/angular-lifecycle-hooks/)
- 🎬 **Video**: [Angular Lifecycle Hooks — Codevolution](https://www.youtube.com/watch?v=2l66D69G2sY)

**62. Angular Router — Lazy Loading, Guards, Resolvers ★ ★**

- 📖 **Official Docs**: [Angular — Router Guide](https://angular.dev/guide/routing)
- 🔬 **Deep Dive**: [Angular — Lazy Loading Modules](https://angular.dev/guide/ngmodules/lazy-loading)
- 🎯 **Interview Prep**: [GeeksForGeeks — Angular Lazy Loading](https://www.geeksforgeeks.org/angular-lazy-loading/)
- 🎬 **Video**: [Angular Router — Joshua Morony](https://www.youtube.com/watch?v=Np3ULAMqwNo)

#### 🔄 Module 4.2: Change Detection

**63. Default vs OnPush Change Detection ★ ★**

- 📖 **Official Docs**: [Angular — Change Detection](https://angular.dev/guide/components/advanced-configuration#changedetectionstrategy)
- 🔬 **Deep Dive**: [Blog — Angular Change Detection Explained — Netanel Basal](https://netbasal.com/a-comprehensive-guide-to-angular-onpush-change-detection-strategy-e3e7b0df9a70)
- 🎯 **Interview Prep**: [GeeksForGeeks — Change Detection in Angular](https://www.geeksforgeeks.org/change-detection-in-angular/)
- 🎬 **Video**: [Angular Change Detection — Decoded Frontend](https://www.youtube.com/watch?v=AWxLOidx-vE)

**64. zone.js — How It Intercepts Async Operations ★ ★**

- 📖 **Official Docs**: [Angular — zone.js](https://angular.dev/guide/zonejs)
- 🔬 **Deep Dive**: [Blog — Understanding Zone.js — Thoughtram](https://blog.thoughtram.io/angular/2016/02/01/zones-in-angular-2.html)
- 🎯 **Interview Prep**: [GeeksForGeeks — Zone.js in Angular](https://www.geeksforgeeks.org/what-is-zone-js-in-angular/)
- 🎬 **Video**: [Zone.js Explained — Decoded Frontend](https://www.youtube.com/watch?v=3IqtmUscE_U)

**65. Zoneless Angular — Signal-Based Reactivity ★ ★**

- 📖 **Official Docs**: [Angular — Signals](https://angular.dev/guide/signals)
- 🔬 **Deep Dive**: [Blog — Zoneless Angular — Angular Blog](https://blog.angular.io/angular-v18-is-now-available-e79d5ac0affe)
- 🎯 **Interview Prep**: [Angular.dev — Signals Guide](https://angular.dev/guide/signals)
- 🎬 **Video**: [Zoneless Angular — Joshua Morony](https://www.youtube.com/watch?v=aKEsFUmgfqY)

**66. Manual Change Detection — markForCheck vs detectChanges ★ ★**

- 📖 **Official Docs**: [Angular — ChangeDetectorRef](https://angular.dev/api/core/ChangeDetectorRef)
- 🔬 **Deep Dive**: [Blog — markForCheck vs detectChanges — Netanel Basal](https://netbasal.com/angular-the-difference-between-markforcheck-and-detectchanges-50b7fcff4fc3)
- 🎯 **Interview Prep**: [GeeksForGeeks — markForCheck vs detectChanges](https://www.geeksforgeeks.org/what-is-the-difference-between-markforcheck-and-detectchanges-in-angular/)
- 🎬 **Video**: [detectChanges vs markForCheck — Decoded Frontend](https://www.youtube.com/watch?v=aNHK_KXCuIA)

#### 🌊 Module 4.3: RxJS Mastery

**67. Cold vs Hot Observables ★ ★**

- 📖 **Official Docs**: [RxJS — Observable](https://rxjs.dev/guide/observable)
- 🔬 **Deep Dive**: [Blog — Hot vs Cold Observables — Ben Lesh](https://benlesh.medium.com/hot-vs-cold-observables-f8094ed53339)
- 🎯 **Interview Prep**: [GeeksForGeeks — Hot vs Cold Observables](https://www.geeksforgeeks.org/rxjs-hot-vs-cold-observables/)
- 🎬 **Video**: [Hot vs Cold Observables — Decoded Frontend](https://www.youtube.com/watch?v=c6bkMfEdBDk)

**68. Subject, BehaviorSubject, ReplaySubject, AsyncSubject ★ ★**

- 📖 **Official Docs**: [RxJS — Subjects](https://rxjs.dev/guide/subject)
- 🔬 **Deep Dive**: [Blog — Understanding RxJS Subjects — LogRocket](https://blog.logrocket.com/understanding-rxjs-subjects/)
- 🎯 **Interview Prep**: [GeeksForGeeks — RxJS Subjects Explained](https://www.geeksforgeeks.org/rxjs-subject/)
- 🎬 **Video**: [RxJS Subjects Explained — Joshua Morony](https://www.youtube.com/watch?v=_henNArnVOo)

**69. switchMap vs mergeMap vs concatMap vs exhaustMap — With Real Examples ★ ★**

- 📖 **Official Docs**: [RxJS — switchMap](https://rxjs.dev/api/operators/switchMap)
- 🔬 **Deep Dive**: [Blog — switchMap vs mergeMap vs concatMap — LogRocket](https://blog.logrocket.com/understanding-rxjs-map-operators/)
- 🎯 **Interview Prep**: [GeeksForGeeks — switchMap vs mergeMap vs concatMap](https://www.geeksforgeeks.org/difference-between-switchmap-and-mergemap-in-rxjs/)
- 🎬 **Video**: [switchMap vs mergeMap — Decoded Frontend](https://www.youtube.com/watch?v=6lKoLwGlglE)

**70. combineLatest, forkJoin, zip, withLatestFrom ★ ★**

- 📖 **Official Docs**: [RxJS — combineLatest](https://rxjs.dev/api/index/function/combineLatest)
- 🔬 **Deep Dive**: [Blog — RxJS Combination Operators — LogRocket](https://blog.logrocket.com/understanding-rxjs-map-operators/)
- 🎯 **Interview Prep**: [GeeksForGeeks — RxJS combineLatest vs forkJoin](https://www.geeksforgeeks.org/rxjs-combinelatest-operator/)
- 🎬 **Video**: [combineLatest vs forkJoin — Decoded Frontend](https://www.youtube.com/watch?v=PRQO_KK6Uxo)

**71. takeUntil Pattern for Memory Leak Prevention ★ ★**

- 📖 **Official Docs**: [RxJS — takeUntil](https://rxjs.dev/api/operators/takeUntil)
- 🔬 **Deep Dive**: [Blog — takeUntil Pattern — Netanel Basal](https://netbasal.com/when-to-unsubscribe-in-angular-d61c6983ae56)
- 🎯 **Interview Prep**: [GeeksForGeeks — Unsubscribe Methods in Angular](https://www.geeksforgeeks.org/how-to-unsubscribe-from-an-observable-in-angular/)
- 🎬 **Video**: [Unsubscribe Patterns in Angular — Joshua Morony](https://www.youtube.com/watch?v=2G_mWfG0DZE)

**72. Custom RxJS Operators ★ ★**

- 📖 **Official Docs**: [RxJS — Creating Custom Operators](https://rxjs.dev/guide/operators#creating-custom-operators)
- 🔬 **Deep Dive**: [Blog — Build Your Own RxJS Operator — Netanel Basal](https://netbasal.com/creating-custom-operators-in-rxjs-32f052d69457)
- 🎯 **Interview Prep**: [RxJS Docs — Creating Custom Operators](https://rxjs.dev/guide/operators#creating-custom-operators)
- 🎬 **Video**: [Custom RxJS Operators — Decoded Frontend](https://www.youtube.com/watch?v=CoYo7-gG0L0)

#### 📦 Module 4.4: State Management in Angular

**73. NgRx — Store, Actions, Reducers, Effects, Selectors ★ ★**

- 📖 **Official Docs**: [NgRx — Getting Started](https://ngrx.io/guide/store)
- 🔬 **Deep Dive**: [Blog — NgRx Complete Guide — Angular University](https://blog.angular-university.io/angular-ngrx-store-effects-srp/)
- 🎯 **Interview Prep**: [GeeksForGeeks — NgRx State Management](https://www.geeksforgeeks.org/ngrx-store-in-angular/)
- 🎬 **Video**: [NgRx Crash Course — Decoded Frontend](https://www.youtube.com/watch?v=9P0lmXOBHRk)

**74. NgRx Entity Adapter ★ ★**

- 📖 **Official Docs**: [NgRx — Entity Adapter](https://ngrx.io/guide/entity)
- 🔬 **Deep Dive**: [Blog — NgRx Entity Guide — Angular University](https://blog.angular-university.io/ngrx-entity/)
- 🎯 **Interview Prep**: [NgRx Docs — Entity Adapter](https://ngrx.io/guide/entity)
- 🎬 **Video**: [NgRx Entity Adapter — Decoded Frontend](https://www.youtube.com/watch?v=GKUxDiC0oK4)

**75. Angular Signals (v17+) — signal(), computed(), effect() ★ ★**

- 📖 **Official Docs**: [Angular — Signals Guide](https://angular.dev/guide/signals)
- 🔬 **Deep Dive**: [Blog — Angular Signals in Depth — Netanel Basal](https://netbasal.com/angular-signals-everything-you-need-to-know-b4a2a0a6a3c4)
- 🎯 **Interview Prep**: [Angular.dev — Signals in Angular](https://angular.dev/guide/signals)
- 🎬 **Video**: [Angular Signals — Joshua Morony](https://www.youtube.com/watch?v=oqYQG7QMdzw)

**76. Akita vs NgRx vs Signal Store Trade-offs ★ ★**

- 📖 **Official Docs**: [NgRx — SignalStore](https://ngrx.io/guide/signals)
- 🔬 **Deep Dive**: [Blog — NgRx Signal Store — Netanel Basal](https://netbasal.com/the-new-ngrx-signal-store-everything-you-need-to-know-c5a7e7f7a3eb)
- 🎯 **Interview Prep**: [NgRx Docs — Signal Store](https://ngrx.io/guide/signals)
- 🎬 **Video**: [NgRx Signal Store — Joshua Morony](https://www.youtube.com/watch?v=mWBw90b0bto)

#### ⚡ Module 4.5: Angular Performance

**77. OnPush + trackBy — Avoiding Unnecessary Checks ★ ★**

- 📖 **Official Docs**: [Angular — OnPush Strategy](https://angular.dev/guide/components/advanced-configuration#changedetectionstrategy)
- 🔬 **Deep Dive**: [Blog — OnPush + trackBy — Netanel Basal](https://netbasal.com/a-comprehensive-guide-to-angular-onpush-change-detection-strategy-e3e7b0df9a70)
- 🎯 **Interview Prep**: [GeeksForGeeks — Angular OnPush Strategy](https://www.geeksforgeeks.org/change-detection-in-angular/)
- 🎬 **Video**: [OnPush & trackBy — Decoded Frontend](https://www.youtube.com/watch?v=AWxLOidx-vE)

**78. Pure Pipes vs Impure Pipes ★ ★**

- 📖 **Official Docs**: [Angular — Pipes](https://angular.dev/guide/pipes)
- 🔬 **Deep Dive**: [Blog — Pure vs Impure Pipes — Netanel Basal](https://netbasal.com/understanding-angular-pure-pipes-and-impure-pipes-3b1cdf6b1298)
- 🎯 **Interview Prep**: [GeeksForGeeks — Pure vs Impure Pipes](https://www.geeksforgeeks.org/angular-pure-and-impure-pipes/)
- 🎬 **Video**: [Pure vs Impure Pipes — Decoded Frontend](https://www.youtube.com/watch?v=uEu-9KYxMpc)

**79. Lazy Loaded Modules + Route-Level Code Splitting ★ ★**

- 📖 **Official Docs**: [Angular — Lazy Loading](https://angular.dev/guide/ngmodules/lazy-loading)
- 🔬 **Deep Dive**: [Blog — Route-Level Code Splitting — Angular University](https://blog.angular-university.io/angular-router/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Route-Level Code Splitting in Angular](https://www.geeksforgeeks.org/angular-lazy-loading/)
- 🎬 **Video**: [Angular Lazy Loading — Joshua Morony](https://www.youtube.com/watch?v=JjFBkZ4JJXE)

**80. Deferrable Views (@defer block, Angular 17+) ★ ★**

- 📖 **Official Docs**: [Angular — Deferrable Views](https://angular.dev/guide/defer)
- 🔬 **Deep Dive**: [Blog — @defer in Angular 17 — Angular Blog](https://blog.angular.io/introducing-angular-v17-4d7c563dc51b)
- 🎯 **Interview Prep**: [Angular Blog — @defer in Angular 17](https://blog.angular.io/introducing-angular-v17-4d7c563dc51b)
- 🎬 **Video**: [@defer Block — Joshua Morony](https://www.youtube.com/watch?v=V1sDBn7IRR0)

### SEQUENCE 5️⃣ — React, Next.js & Redux Deep Dive ★

> Adobe & Microsoft test React internals deeply. Build real depth here.

#### ⚛️ Module 5.1: React Internals

**81. React Fiber Architecture — What It Is and Why It Was Built ★ ★**

- 📖 **Official Docs**: [React Docs — Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- 🔬 **Deep Dive**: [Blog — React Fiber Architecture — Andrew Clark (GitHub)](https://github.com/acdlite/react-fiber-architecture)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Fiber Architecture](https://www.geeksforgeeks.org/what-is-react-fiber/)
- 🎬 **Video**: [React Fiber Explained — Akshay Saini](https://www.youtube.com/watch?v=dCExNmKQnvA)

**82. Reconciliation Algorithm — How React Diffs the Virtual DOM ★ ★**

- 📖 **Official Docs**: [React Docs — Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html)
- 🔬 **Deep Dive**: [Blog — React Reconciliation Algorithm — LogRocket](https://blog.logrocket.com/virtual-dom-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Reconciliation Algorithm](https://www.geeksforgeeks.org/reactjs-reconciliation/)
- 🎬 **Video**: [React Reconciliation — Jack Herrington](https://www.youtube.com/watch?v=7YhdqIR2Yzo)

**83. React Scheduler — Priority Lanes, Task Scheduling ★ ★**

- 📖 **Official Docs**: [React — GitHub Source — Scheduler](https://github.com/facebook/react/tree/main/packages/scheduler)
- 🔬 **Deep Dive**: [Blog — Inside React Scheduler — Jser.dev](https://jser.dev/2024-03-16-how-react-scheduler-works/)
- 🎯 **Interview Prep**: [jser.dev — How React Scheduler Works](https://jser.dev/2024-03-16-how-react-scheduler-works/)
- 🎬 **Video**: [React Scheduler Internals — Jack Herrington](https://www.youtube.com/watch?v=ph2HjBkpPss)

**84. Concurrent Mode — What Changes Under the Hood ★ ★**

- 📖 **Official Docs**: [React Docs — Concurrent React](https://react.dev/blog/2022/03/29/react-v18#what-is-concurrent-react)
- 🔬 **Deep Dive**: [Blog — Concurrent React Deep Dive — Dan Abramov](https://overreacted.io/)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Concurrent Mode](https://www.geeksforgeeks.org/what-is-concurrent-mode-in-react/)
- 🎬 **Video**: [React 18 Concurrent Features — Jack Herrington](https://www.youtube.com/watch?v=N0DhCV_-Qbg)

**85. Commit Phase vs Render Phase — Side Effects Timing ★ ★**

- 📖 **Official Docs**: [React Docs — Render and Commit](https://react.dev/learn/render-and-commit)
- 🔬 **Deep Dive**: [Blog — React Render Phase vs Commit Phase — Kent C. Dodds](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render)
- 🎯 **Interview Prep**: [React Docs — Render and Commit](https://react.dev/learn/render-and-commit)
- 🎬 **Video**: [Render & Commit Phase — Jack Herrington](https://www.youtube.com/watch?v=i793Qm6kv3U)

**86. StrictMode — Why Double Invocation Happens ★ ★**

- 📖 **Official Docs**: [React Docs — Strict Mode](https://react.dev/reference/react/StrictMode)
- 🔬 **Deep Dive**: [Blog — Why React StrictMode Renders Twice — LogRocket](https://blog.logrocket.com/understanding-react-strict-mode/)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Strict Mode](https://www.geeksforgeeks.org/what-is-strictmode-in-react/)
- 🎬 **Video**: [React StrictMode Explained — Jack Herrington](https://www.youtube.com/watch?v=XUwzASyHr4Q)

#### 🪝 Module 5.2: Hooks Deep Dive

**87. useState — Batching, Functional Updates, Lazy Initialisation ★ ★**

- 📖 **Official Docs**: [React Docs — useState](https://react.dev/reference/react/useState)
- 🔬 **Deep Dive**: [Blog — useState Deep Dive — Kent C. Dodds](https://kentcdodds.com/blog/use-state-lazy-initialization-and-function-updates)
- 🎯 **Interview Prep**: [GeeksForGeeks — useState Hook Interview Guide](https://www.geeksforgeeks.org/reactjs-usestate-hook/)
- 🎬 **Video**: [useState in Depth — Codevolution](https://www.youtube.com/watch?v=lAW1Jmmr3sA)

**88. useEffect — Dependency Array Rules, Cleanup, Common Mistakes ★ ★**

- 📖 **Official Docs**: [React Docs — useEffect](https://react.dev/reference/react/useEffect)
- 🔬 **Deep Dive**: [Blog — A Complete Guide to useEffect — Dan Abramov](https://overreacted.io/a-complete-guide-to-useeffect/)
- 🎯 **Interview Prep**: [GeeksForGeeks — useEffect Hook Interview Guide](https://www.geeksforgeeks.org/reactjs-useeffect-hook/)
- 🎬 **Video**: [useEffect Deep Dive — Jack Herrington](https://www.youtube.com/watch?v=MFj_S0Nof90)

**89. useRef — DOM Refs vs Mutable Values, forwardRef ★ ★**

- 📖 **Official Docs**: [React Docs — useRef](https://react.dev/reference/react/useRef)
- 🔬 **Deep Dive**: [Blog — useRef Explained — LogRocket](https://blog.logrocket.com/useRef-react-hook/)
- 🎯 **Interview Prep**: [GeeksForGeeks — useRef Hook in React](https://www.geeksforgeeks.org/react-js-useref-hook/)
- 🎬 **Video**: [useRef & forwardRef — Jack Herrington](https://www.youtube.com/watch?v=gwFfzIaKnAU)

**90. useMemo — When It Helps vs When It Hurts ★ ★**

- 📖 **Official Docs**: [React Docs — useMemo](https://react.dev/reference/react/useMemo)
- 🔬 **Deep Dive**: [Blog — When to useMemo and useCallback — Kent C. Dodds](https://kentcdodds.com/blog/usememo-and-usecallback)
- 🎯 **Interview Prep**: [GeeksForGeeks — useMemo Hook in React](https://www.geeksforgeeks.org/react-js-usememo-hook/)
- 🎬 **Video**: [useMemo Explained — Jack Herrington](https://www.youtube.com/watch?v=vpE9I_eqHdM)

**91. useCallback — Referential Stability, Common Misuse ★ ★**

- 📖 **Official Docs**: [React Docs — useCallback](https://react.dev/reference/react/useCallback)
- 🔬 **Deep Dive**: [Blog — When to useMemo and useCallback — Kent C. Dodds](https://kentcdodds.com/blog/usememo-and-usecallback)
- 🎯 **Interview Prep**: [GeeksForGeeks — useCallback Hook in React](https://www.geeksforgeeks.org/react-js-usecallback-hook/)
- 🎬 **Video**: [useCallback Explained — Jack Herrington](https://www.youtube.com/watch?v=MxIPQZ64x0I)

**92. useReducer — When to Prefer Over useState ★ ★**

- 📖 **Official Docs**: [React Docs — useReducer](https://react.dev/reference/react/useReducer)
- 🔬 **Deep Dive**: [Blog — useReducer vs useState — LogRocket](https://blog.logrocket.com/react-usereducer-hook-ultimate-guide/)
- 🎯 **Interview Prep**: [GeeksForGeeks — useReducer Hook in React](https://www.geeksforgeeks.org/reactjs-usereducer-hook/)
- 🎬 **Video**: [useReducer In Depth — Codevolution](https://www.youtube.com/watch?v=cVYp4u1m6iA)

**93. useContext — Performance Pitfalls, Context Splitting ★ ★**

- 📖 **Official Docs**: [React Docs — useContext](https://react.dev/reference/react/useContext)
- 🔬 **Deep Dive**: [Blog — How to use React Context Effectively — Kent C. Dodds](https://kentcdodds.com/blog/how-to-use-react-context-effectively)
- 🎯 **Interview Prep**: [GeeksForGeeks — useContext Hook in React](https://www.geeksforgeeks.org/reactjs-usecontext-hook/)
- 🎬 **Video**: [React Context Pitfalls — Jack Herrington](https://www.youtube.com/watch?v=ZKlXqrcBx88)

**94. useTransition & useDeferredValue — Concurrent Features ★ ★**

- 📖 **Official Docs**: [React Docs — useTransition](https://react.dev/reference/react/useTransition)
- 🔬 **Deep Dive**: [Blog — useTransition & useDeferredValue — LogRocket](https://blog.logrocket.com/react-usetransition-vs-usedeferredvalue/)
- 🎯 **Interview Prep**: [GeeksForGeeks — useTransition in React 18](https://www.geeksforgeeks.org/what-is-usetransition-hook-in-react/)
- 🎬 **Video**: [useTransition — Jack Herrington](https://www.youtube.com/watch?v=lDukIAymutM)

**95. useId, useSyncExternalStore, useInsertionEffect ★ ★**

- 📖 **Official Docs**: [React Docs — useId](https://react.dev/reference/react/useId)
- 🔬 **Deep Dive**: [Blog — New Hooks in React 18 — LogRocket](https://blog.logrocket.com/exploring-react-18-three-new-apis/)
- 🎯 **Interview Prep**: [GeeksForGeeks — React 18 New Hooks](https://www.geeksforgeeks.org/new-hooks-in-react-18/)
- 🎬 **Video**: [React 18 New Hooks — Jack Herrington](https://www.youtube.com/watch?v=N0DhCV_-Qbg)

**96. Custom Hooks — Patterns, Composition, Testing ★ ★**

- 📖 **Official Docs**: [React Docs — Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- 🔬 **Deep Dive**: [Blog — Custom Hooks Patterns — Kent C. Dodds](https://kentcdodds.com/blog/authentication-in-react-applications)
- 🎯 **Interview Prep**: [GeeksForGeeks — Custom Hooks in React](https://www.geeksforgeeks.org/reactjs-custom-hooks/)
- 🎬 **Video**: [Mastering Custom Hooks — Jack Herrington](https://www.youtube.com/watch?v=6ThXsUwLWvc)

#### ⚡ Module 5.3: React 18 & 19 Features

**97. Automatic Batching in React 18 ★ ★**

- 📖 **Official Docs**: [React Blog — React v18 Automatic Batching](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching)
- 🔬 **Deep Dive**: [Blog — Automatic Batching in React 18 — Dan Abramov](https://github.com/reactwg/react-18/discussions/21)
- 🎯 **Interview Prep**: [GeeksForGeeks — React 18 Automatic Batching](https://www.geeksforgeeks.org/what-is-automatic-batching-in-react-18/)
- 🎬 **Video**: [React 18 Automatic Batching — Jack Herrington](https://www.youtube.com/watch?v=N0DhCV_-Qbg)

**98. Suspense for Data Fetching — How It Works Internally ★ ★**

- 📖 **Official Docs**: [React Docs — Suspense](https://react.dev/reference/react/Suspense)
- 🔬 **Deep Dive**: [Blog — Suspense for Data Fetching — Dan Abramov](https://github.com/reactwg/react-18/discussions/37)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Suspense](https://www.geeksforgeeks.org/react-suspense/)
- 🎬 **Video**: [React Suspense — Jack Herrington](https://www.youtube.com/watch?v=NTDJ-NQ32_E)

**99. React Server Components (RSC) — Server vs Client Boundary ★ ★**

- 📖 **Official Docs**: [React Docs — Server Components](https://react.dev/reference/rsc/server-components)
- 🔬 **Deep Dive**: [Blog — Making Sense of RSC — Josh W. Comeau](https://www.joshwcomeau.com/react/server-components/)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Server Components](https://www.geeksforgeeks.org/react-server-components/)
- 🎬 **Video**: [React Server Components — Jack Herrington](https://www.youtube.com/watch?v=TQQPAU21ZUw)

**100. use() Hook — Reading Promises and Context ★ ★**

- 📖 **Official Docs**: [React Docs — use](https://react.dev/reference/react/use)
- 🔬 **Deep Dive**: [Blog — React 19 use() Hook — LogRocket](https://blog.logrocket.com/react-19-new-hooks/)
- 🎯 **Interview Prep**: [React Docs — use() Hook](https://react.dev/reference/react/use)
- 🎬 **Video**: [React 19 use() Hook — Jack Herrington](https://www.youtube.com/watch?v=zdNF9FJWJ8o)

**101. Server Actions — Forms, Mutations, Progressive Enhancement ★ ★**

- 📖 **Official Docs**: [Next.js Docs — Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- 🔬 **Deep Dive**: [Blog — Server Actions Deep Dive — Josh W. Comeau](https://www.joshwcomeau.com/react/server-components/)
- 🎯 **Interview Prep**: [Next.js Docs — Server Actions & Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- 🎬 **Video**: [Server Actions Explained — Jack Herrington](https://www.youtube.com/watch?v=dDpZfOQBMaU)

**102. React Compiler (React 19) — Auto-Memoisation ★ ★**

- 📖 **Official Docs**: [React Blog — React Compiler](https://react.dev/learn/react-compiler)
- 🔬 **Deep Dive**: [Blog — React Compiler Deep Dive — LogRocket](https://blog.logrocket.com/react-compiler-complete-guide-react-19/)
- 🎯 **Interview Prep**: [React Docs — React Compiler](https://react.dev/learn/react-compiler)
- 🎬 **Video**: [React Compiler — Jack Herrington](https://www.youtube.com/watch?v=PYHBHK37xlE)

**103. Activity API & View Transitions ★ ★**

- 📖 **Official Docs**: [Chrome — View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions)
- 🔬 **Deep Dive**: [MDN — View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- 🎯 **Interview Prep**: [Chrome Developers — View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions)
- 🎬 **Video**: [View Transitions — Fireship](https://www.youtube.com/watch?v=JCJUPJ_zDQ4)

#### 🏗️ Module 5.4: React Patterns

**104. Compound Component Pattern ★ ★**

- 📖 **Official Docs**: [React Docs — Extracting State Logic](https://react.dev/learn/extracting-state-logic-into-a-reducer)
- 🔬 **Deep Dive**: [patterns.dev — Compound Component Pattern](https://www.patterns.dev/react/compound-pattern)
- 🎯 **Interview Prep**: [patterns.dev — Compound Component Pattern](https://www.patterns.dev/react/compound-pattern)
- 🎬 **Video**: [Compound Components — Jack Herrington](https://www.youtube.com/watch?v=vPRdY87_SH0)

**105. Render Props Pattern — When Still Useful ★ ★**

- 📖 **Official Docs**: [React Docs — Passing Data with Render Props](https://legacy.reactjs.org/docs/render-props.html)
- 🔬 **Deep Dive**: [patterns.dev — Render Props Pattern](https://www.patterns.dev/react/render-props-pattern)
- 🎯 **Interview Prep**: [patterns.dev — Render Props Pattern](https://www.patterns.dev/react/render-props-pattern)
- 🎬 **Video**: [Render Props Pattern — Jack Herrington](https://www.youtube.com/watch?v=NdapMDgNhtE)

**106. Higher Order Components (HOC) — Use Cases & Pitfalls ★ ★**

- 📖 **Official Docs**: [React Docs — Higher-Order Components](https://legacy.reactjs.org/docs/higher-order-components.html)
- 🔬 **Deep Dive**: [patterns.dev — HOC Pattern](https://www.patterns.dev/react/hoc-pattern)
- 🎯 **Interview Prep**: [patterns.dev — HOC Pattern](https://www.patterns.dev/react/hoc-pattern)
- 🎬 **Video**: [HOC Pattern — Jack Herrington](https://www.youtube.com/watch?v=J5P0q7EROfw)

**107. Container vs Presentational Components ★ ★**

- 📖 **Official Docs**: [React Docs — Thinking in React](https://react.dev/learn/thinking-in-react)
- 🔬 **Deep Dive**: [patterns.dev — Container/Presentational Pattern](https://www.patterns.dev/react/presentational-container-pattern)
- 🎯 **Interview Prep**: [patterns.dev — Container/Presentational Pattern](https://www.patterns.dev/react/presentational-container-pattern)
- 🎬 **Video**: [Container vs Presentational — Codevolution](https://www.youtube.com/watch?v=ozg4gqoUvVQ)

**108. Controlled vs Uncontrolled Components ★ ★**

- 📖 **Official Docs**: [React Docs — Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- 🔬 **Deep Dive**: [Blog — Controlled vs Uncontrolled — Kent C. Dodds](https://kentcdodds.com/blog/controlled-vs-uncontrolled-elements)
- 🎯 **Interview Prep**: [GeeksForGeeks — Controlled vs Uncontrolled Components](https://www.geeksforgeeks.org/controlled-vs-uncontrolled-components-in-reactjs/)
- 🎬 **Video**: [Controlled vs Uncontrolled — Codevolution](https://www.youtube.com/watch?v=BvtQMxekmH0)

**109. Error Boundaries — Class Components, react-error-boundary ★ ★**

- 📖 **Official Docs**: [React Docs — Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- 🔬 **Deep Dive**: [Blog — Error Boundaries in React — LogRocket](https://blog.logrocket.com/react-error-handling-react-error-boundary/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Error Boundaries in React](https://www.geeksforgeeks.org/error-boundaries-in-react/)
- 🎬 **Video**: [Error Boundaries — Jack Herrington](https://www.youtube.com/watch?v=_FuDMEgIy7I)

**110. Portal Pattern — Modals, Tooltips, Dropdowns ★ ★**

- 📖 **Official Docs**: [React Docs — createPortal](https://react.dev/reference/react-dom/createPortal)
- 🔬 **Deep Dive**: [Blog — React Portals — LogRocket](https://blog.logrocket.com/learn-react-portals-example/)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Portals](https://www.geeksforgeeks.org/react-portals/)
- 🎬 **Video**: [React Portals — Codevolution](https://www.youtube.com/watch?v=HpHLa-5Wdys)

#### 📦 Module 5.5: Redux & Redux Toolkit Deep Dive

**111. Redux Core — Store, Actions, Reducers, Middleware ★ ★**

- 📖 **Official Docs**: [Redux — Core Concepts](https://redux.js.org/introduction/core-concepts)
- 🔬 **Deep Dive**: [Blog — You Might Not Need Redux — Dan Abramov](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367)
- 🎯 **Interview Prep**: [GeeksForGeeks — Redux Interview Questions (Top 40)](https://www.geeksforgeeks.org/redux-interview-questions/)
- 🎬 **Video**: [Redux in 100 Seconds — Fireship](https://www.youtube.com/watch?v=_shA5Xwe8_4)

**112. Redux Toolkit — createSlice, createAsyncThunk, createEntityAdapter ★ ★**

- 📖 **Official Docs**: [Redux Toolkit — Getting Started](https://redux-toolkit.js.org/introduction/getting-started)
- 🔬 **Deep Dive**: [Redux Toolkit — createSlice API](https://redux-toolkit.js.org/api/createSlice)
- 🎯 **Interview Prep**: [GeeksForGeeks — Redux Toolkit (createSlice)](https://www.geeksforgeeks.org/introduction-to-redux-toolkit/)
- 🎬 **Video**: [Redux Toolkit — Codevolution](https://www.youtube.com/watch?v=0awA5Uw6SJE)

**113. RTK Query — defineApi, endpoints, caching, invalidation ★ ★**

- 📖 **Official Docs**: [RTK Query — Overview](https://redux-toolkit.js.org/rtk-query/overview)
- 🔬 **Deep Dive**: [RTK Query — Quick Start](https://redux-toolkit.js.org/tutorials/rtk-query)
- 🎯 **Interview Prep**: [RTK Query Docs — Quick Start](https://redux-toolkit.js.org/tutorials/rtk-query)
- 🎬 **Video**: [RTK Query Crash Course — Codevolution](https://www.youtube.com/watch?v=HyZzCHgG3AY)

**114. Redux Middleware — Thunk vs Saga vs Observable ★ ★**

- 📖 **Official Docs**: [Redux — Middleware](https://redux.js.org/understanding/history-and-design/middleware)
- 🔬 **Deep Dive**: [Blog — Redux Middleware Guide — LogRocket](https://blog.logrocket.com/redux-middleware-a-practical-guide/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Redux Saga vs Thunk](https://www.geeksforgeeks.org/difference-between-redux-saga-and-redux-thunk/)
- 🎬 **Video**: [Redux Middleware — Codevolution](https://www.youtube.com/watch?v=aV4XmV7PfL8)

**115. Normalised State Shape — Why and How ★ ★**

- 📖 **Official Docs**: [Redux — Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
- 🔬 **Deep Dive**: [Blog — Normalizing State — Redux Toolkit](https://redux-toolkit.js.org/api/createEntityAdapter)
- 🎯 **Interview Prep**: [Redux Docs — Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
- 🎬 **Video**: [State Normalization — Codevolution](https://www.youtube.com/watch?v=tkkMq_OjhIk)

**116. Redux DevTools — Time Travel Debugging ★ ★**

- 📖 **Official Docs**: [Redux DevTools — GitHub](https://github.com/reduxjs/redux-devtools)
- 🔬 **Deep Dive**: [Blog — Time Travel Debugging — Redux Docs](https://redux.js.org/usage/debugging)
- 🎯 **Interview Prep**: [Redux Docs — Debugging with DevTools](https://redux.js.org/usage/debugging)
- 🎬 **Video**: [Redux DevTools — Codevolution](https://www.youtube.com/watch?v=LzYr1ROYL9w)

**117. When NOT to Use Redux — Choosing the Right Tool ★ ★**

- 📖 **Official Docs**: [Redux — FAQ: When to use Redux?](https://redux.js.org/faq/general#when-should-i-use-redux)
- 🔬 **Deep Dive**: [Blog — You Might Not Need Redux — Dan Abramov](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367)
- 🎯 **Interview Prep**: [GeeksForGeeks — When to Use Redux](https://www.geeksforgeeks.org/when-to-use-redux-in-react/)
- 🎬 **Video**: [When NOT to Use Redux — Jack Herrington](https://www.youtube.com/watch?v=5-1LM2NySR0)

#### 🌐 Module 5.6: Next.js App Router Deep Dive

**118. App Router vs Pages Router — Key Differences ★ ★**

- 📖 **Official Docs**: [Next.js Docs — App Router](https://nextjs.org/docs/app)
- 🔬 **Deep Dive**: [Blog — App Router vs Pages Router — Vercel](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- 🎯 **Interview Prep**: [GeeksForGeeks — Next.js App Router](https://www.geeksforgeeks.org/next-js-app-router/)
- 🎬 **Video**: [App Router — Jack Herrington](https://www.youtube.com/watch?v=DrxiNfbr63s)

**119. Server Components vs Client Components — Decision Rules ★ ★**

- 📖 **Official Docs**: [Next.js Docs — Server vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- 🔬 **Deep Dive**: [Blog — Server vs Client Components — Josh W. Comeau](https://www.joshwcomeau.com/react/server-components/)
- 🎯 **Interview Prep**: [Josh W. Comeau — Making Sense of React Server Components](https://www.joshwcomeau.com/react/server-components/)
- 🎬 **Video**: [Server vs Client Components — Theo](https://www.youtube.com/watch?v=wkHfRFMz7KE)

**120. Layouts, Templates, Loading UI, Error UI — File Conventions ★ ★**

- 📖 **Official Docs**: [Next.js Docs — File Conventions](https://nextjs.org/docs/app/api-reference/file-conventions)
- 🔬 **Deep Dive**: [Blog — Next.js Layouts Guide — Vercel](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- 🎯 **Interview Prep**: [Next.js Docs — Layouts and Templates](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- 🎬 **Video**: [Next.js 14 File Conventions — Jack Herrington](https://www.youtube.com/watch?v=vwSlYG7hFk0)

**121. Data Fetching in App Router — fetch(), cache(), revalidate ★ ★**

- 📖 **Official Docs**: [Next.js Docs — Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- 🔬 **Deep Dive**: [Blog — Data Fetching in App Router — Vercel](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching)
- 🎯 **Interview Prep**: [Next.js Docs — Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching)
- 🎬 **Video**: [Data Fetching in Next.js — Jack Herrington](https://www.youtube.com/watch?v=RBM03RihZVs)

**122. Route Handlers — API Routes in App Router ★ ★**

- 📖 **Official Docs**: [Next.js Docs — Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- 🔬 **Deep Dive**: [Blog — Route Handlers Guide — Vercel](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- 🎯 **Interview Prep**: [Next.js Docs — Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- 🎬 **Video**: [Next.js Route Handlers — Jack Herrington](https://www.youtube.com/watch?v=MhJBMbqnpvA)

**123. Middleware — Matchers, Redirects, Auth Patterns ★ ★**

- 📖 **Official Docs**: [Next.js Docs — Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- 🔬 **Deep Dive**: [Blog — Next.js Middleware Deep Dive — Vercel](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- 🎯 **Interview Prep**: [GeeksForGeeks — Next.js Middleware](https://www.geeksforgeeks.org/next-js-middleware/)
- 🎬 **Video**: [Next.js Middleware — Jack Herrington](https://www.youtube.com/watch?v=NlEHOAhc1Q0)

**124. Image, Font, Script Optimisation — next/image, next/font ★ ★**

- 📖 **Official Docs**: [Next.js Docs — Optimizing Images](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- 🔬 **Deep Dive**: [Next.js Docs — Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- 🎯 **Interview Prep**: [Next.js Docs — Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- 🎬 **Video**: [next/image & next/font — Jack Herrington](https://www.youtube.com/watch?v=IU_qq_c_lKA)

**125. Streaming with Suspense in Next.js ★ ★**

- 📖 **Official Docs**: [Next.js Docs — Loading UI and Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- 🔬 **Deep Dive**: [Blog — Streaming SSR with Suspense — Vercel](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- 🎯 **Interview Prep**: [Next.js Docs — Loading UI and Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- 🎬 **Video**: [Streaming in Next.js — Jack Herrington](https://www.youtube.com/watch?v=3JB_qEk39w0)

**126. Parallel Routes & Intercepting Routes ★ ★**

- 📖 **Official Docs**: [Next.js Docs — Parallel Routes](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)
- 🔬 **Deep Dive**: [Next.js Docs — Intercepting Routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes)
- 🎯 **Interview Prep**: [Next.js Docs — Parallel Routes](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)
- 🎬 **Video**: [Parallel & Intercepting Routes — Jack Herrington](https://www.youtube.com/watch?v=mVOvx9eVHAI)

**127. Next.js Caching — Request Memoization, Data Cache, Full Route Cache, Router Cache ★ ★**

- 📖 **Official Docs**: [Next.js Docs — Caching](https://nextjs.org/docs/app/building-your-application/caching)
- 🔬 **Deep Dive**: [Blog — Next.js Caching Deep Dive — Vercel](https://nextjs.org/docs/app/building-your-application/caching)
- 🎯 **Interview Prep**: [Next.js Docs — Caching (4-layer deep dive)](https://nextjs.org/docs/app/building-your-application/caching)
- 🎬 **Video**: [Next.js Caching Explained — Jack Herrington](https://www.youtube.com/watch?v=VBlSe8tvg4U)

#### ⚡ Module 5.7: React Performance Patterns

**128. When Does a Component Re-render — The Complete Rules ★ ★**

- 📖 **Official Docs**: [React Docs — Render and Commit](https://react.dev/learn/render-and-commit)
- 🔬 **Deep Dive**: [Blog — Fix the Slow Render Before the Re-render — Kent C. Dodds](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Re-rendering Guide](https://www.geeksforgeeks.org/how-does-react-re-render/)
- 🎬 **Video**: [When Does React Re-render — Jack Herrington](https://www.youtube.com/watch?v=FLAVPV_qDAg)

**129. React.memo — Props Comparison, Custom Comparator ★ ★**

- 📖 **Official Docs**: [React Docs — memo](https://react.dev/reference/react/memo)
- 🔬 **Deep Dive**: [Blog — When to useMemo and useCallback — Kent C. Dodds](https://kentcdodds.com/blog/usememo-and-usecallback)
- 🎯 **Interview Prep**: [GeeksForGeeks — React.memo Explained](https://www.geeksforgeeks.org/react-memo/)
- 🎬 **Video**: [React.memo Deep Dive — Jack Herrington](https://www.youtube.com/watch?v=DEPwA3mv_R8)

**130. Key Prop — Why It Matters, Common Mistakes ★ ★**

- 📖 **Official Docs**: [React Docs — Rendering Lists (Key)](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- 🔬 **Deep Dive**: [Blog — Understanding React Key Prop — Kent C. Dodds](https://kentcdodds.com/blog/understanding-reacts-key-prop)
- 🎯 **Interview Prep**: [GeeksForGeeks — Importance of Key Prop in React](https://www.geeksforgeeks.org/importance-of-key-prop-in-react/)
- 🎬 **Video**: [React Keys Explained — Jack Herrington](https://www.youtube.com/watch?v=xlPaNm0FeVE)

**131. Avoid Anonymous Functions in JSX — Why & When ★ ★**

- 📖 **Official Docs**: [React Docs — Passing Functions to Components](https://legacy.reactjs.org/docs/faq-functions.html)
- 🔬 **Deep Dive**: [Blog — Anonymous Functions in JSX — LogRocket](https://blog.logrocket.com/react-re-rendering-guide/)
- 🎯 **Interview Prep**: [Kent C. Dodds — Fix the Slow Render](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render)
- 🎬 **Video**: [React Performance — Jack Herrington](https://www.youtube.com/watch?v=7sgBhmLjVsg)

**132. Windowing Large Lists — react-window vs react-virtual ★ ★**

- 📖 **Official Docs**: [react-window — GitHub](https://github.com/bvaughn/react-window)
- 🔬 **Deep Dive**: [Blog — Virtualization in React — LogRocket](https://blog.logrocket.com/windowing-wars-react-virtualized-vs-react-window/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Virtualization in React](https://www.geeksforgeeks.org/what-is-windowing-or-list-virtualization-in-react/)
- 🎬 **Video**: [Windowing with react-window — Jack Herrington](https://www.youtube.com/watch?v=UrgfPjX97Kw)

**133. Code Splitting with React.lazy + Suspense ★ ★**

- 📖 **Official Docs**: [React Docs — lazy](https://react.dev/reference/react/lazy)
- 🔬 **Deep Dive**: [Blog — Code Splitting in React — LogRocket](https://blog.logrocket.com/code-splitting-react-components/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Code Splitting in React](https://www.geeksforgeeks.org/code-splitting-in-react/)
- 🎬 **Video**: [React.lazy + Suspense — Codevolution](https://www.youtube.com/watch?v=tV8UJzVCLL8)

**134. Profiling with React DevTools — Reading Flame Graphs ★ ★**

- 📖 **Official Docs**: [React Docs — Profiler](https://react.dev/reference/react/Profiler)
- 🔬 **Deep Dive**: [Chrome DevTools — React Profiler](https://react.dev/learn/react-developer-tools)
- 🎯 **Interview Prep**: [React Docs — Profiler API](https://react.dev/reference/react/Profiler)
- 🎬 **Video**: [React DevTools Profiler — Jack Herrington](https://www.youtube.com/watch?v=00RoZflFE34)

**135. Why Did You Render — Detecting Unnecessary Re-renders ★ ★**

- 📖 **Official Docs**: [Why Did You Render — GitHub](https://github.com/welldone-software/why-did-you-render)
- 🔬 **Deep Dive**: [Blog — Detecting Unnecessary Re-renders — LogRocket](https://blog.logrocket.com/react-re-rendering-guide/)
- 🎯 **Interview Prep**: [GitHub — Why Did You Render](https://github.com/welldone-software/why-did-you-render)
- 🎬 **Video**: [Why Did You Render — Jack Herrington](https://www.youtube.com/watch?v=uFCO0GCLhms)

---

## 🗄️ PHASE 3 — STATE & DATA

*Week 5 | How data flows through your app. Builds on framework knowledge.*

### SEQUENCE 6️⃣ — State Management

> Applies to both Angular and React. Consolidates what you learned in Phases 2.

#### 🧠 Module 6.1: State Fundamentals

**136. Local Component State**

- 📖 **Official Docs**: [React Docs — Managing State](https://react.dev/learn/managing-state)
- 🔬 **Deep Dive**: [Blog — Application State Management — Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react)
- 🎯 **Interview Prep**: [GeeksForGeeks — React State Management](https://www.geeksforgeeks.org/reactjs-state/)
- 🎬 **Video**: [React State Management — Codevolution](https://www.youtube.com/watch?v=35lXWvCuM8o)

**137. Global State Management**

- 📖 **Official Docs**: [React Docs — Scaling Up with Context](https://react.dev/learn/scaling-up-with-reducer-and-context)
- 🔬 **Deep Dive**: [Blog — Global State Management — Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react)
- 🎯 **Interview Prep**: [Kent C. Dodds — Application State Management](https://kentcdodds.com/blog/application-state-management-with-react)
- 🎬 **Video**: [Global State Explained — Jack Herrington](https://www.youtube.com/watch?v=DOAqh9-sTT0)

**138. Prop Drilling vs Context**

- 📖 **Official Docs**: [React Docs — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
- 🔬 **Deep Dive**: [Blog — Prop Drilling — Kent C. Dodds](https://kentcdodds.com/blog/prop-drilling)
- 🎯 **Interview Prep**: [GeeksForGeeks — Prop Drilling in React](https://www.geeksforgeeks.org/what-is-prop-drilling-and-how-to-avoid-it/)
- 🎬 **Video**: [Prop Drilling vs Context — Jack Herrington](https://www.youtube.com/watch?v=ZKlXqrcBx88)

**139. Derived State vs Computed State ★ ★**

- 📖 **Official Docs**: [React Docs — Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- 🔬 **Deep Dive**: [Blog — Derived State in React — Kent C. Dodds](https://kentcdodds.com/blog/dont-sync-state-derive-it)
- 🎯 **Interview Prep**: [Kent C. Dodds — Don't Sync State, Derive It](https://kentcdodds.com/blog/dont-sync-state-derive-it)
- 🎬 **Video**: [Derived State — Jack Herrington](https://www.youtube.com/watch?v=nH_x7aQa73s)

#### 🗂️ Module 6.2: State Tools & Patterns

**140. Redux / Zustand / Signals — Comparison**

- 📖 **Official Docs**: [Zustand — GitHub](https://github.com/pmndrs/zustand)
- 🔬 **Deep Dive**: [Blog — Redux vs Zustand vs Signals — LogRocket](https://blog.logrocket.com/zustand-vs-redux/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Zustand vs Redux](https://www.geeksforgeeks.org/zustand-vs-redux/)
- 🎬 **Video**: [Zustand vs Redux — Jack Herrington](https://www.youtube.com/watch?v=5-1LM2NySR0)

**141. Server State vs Client State**

- 📖 **Official Docs**: [TanStack Query — Overview](https://tanstack.com/query/latest/docs/framework/react/overview)
- 🔬 **Deep Dive**: [Blog — Server State vs Client State — TkDodo](https://tkdodo.eu/blog/practical-react-query)
- 🎯 **Interview Prep**: [TkDodo — Practical React Query](https://tkdodo.eu/blog/practical-react-query)
- 🎬 **Video**: [Server State vs Client State — Jack Herrington](https://www.youtube.com/watch?v=OrliU0e09io)

**142. Cache-Based State Management**

- 📖 **Official Docs**: [TanStack Query — Caching](https://tanstack.com/query/latest/docs/framework/react/guides/caching)
- 🔬 **Deep Dive**: [Blog — React Query as State Manager — TkDodo](https://tkdodo.eu/blog/react-query-as-a-state-manager)
- 🎯 **Interview Prep**: [TkDodo — React Query as State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager)
- 🎬 **Video**: [React Query Caching — Codevolution](https://www.youtube.com/watch?v=VtWkSCZX0Ec)

**143. React Query / TanStack Query Deep Dive ★ ★**

- 📖 **Official Docs**: [TanStack Query Docs](https://tanstack.com/query/latest)
- 🔬 **Deep Dive**: [Blog — Practical React Query — TkDodo](https://tkdodo.eu/blog/practical-react-query)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Query (TanStack Query)](https://www.geeksforgeeks.org/react-query/)
- 🎬 **Video**: [TanStack Query Tutorial — Codevolution](https://www.youtube.com/watch?v=VtWkSCZX0Ec)

**144. State Machines (XState) for Complex Flows ★ ★**

- 📖 **Official Docs**: [XState Docs](https://xstate.js.org/docs/)
- 🔬 **Deep Dive**: [Blog — State Machines in React — LogRocket](https://blog.logrocket.com/finite-state-machines-react/)
- 🎯 **Interview Prep**: [XState Docs — Introduction](https://xstate.js.org/docs/)
- 🎬 **Video**: [XState Explained — Fireship](https://www.youtube.com/watch?v=iDZUKJt36PI)

**145. URL as State — When and Why ★ ★**

- 📖 **Official Docs**: [MDN — URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL)
- 🔬 **Deep Dive**: [Blog — URL as State in React — LogRocket](https://blog.logrocket.com/use-state-url-persist-state-usesearchparams/)
- 🎯 **Interview Prep**: [GeeksForGeeks — useSearchParams in React](https://www.geeksforgeeks.org/react-router-usesearchparams/)
- 🎬 **Video**: [URL as State — Jack Herrington](https://www.youtube.com/watch?v=ukpgxp0Rcp8)

#### ⚙️ Module 6.3: State at Scale

**146. State Normalization**

- 📖 **Official Docs**: [Redux — Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
- 🔬 **Deep Dive**: [Blog — Normalizing Data — Redux Toolkit](https://redux-toolkit.js.org/api/createEntityAdapter)
- 🎯 **Interview Prep**: [Redux Docs — Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
- 🎬 **Video**: [State Normalization — Codevolution](https://www.youtube.com/watch?v=tkkMq_OjhIk)

**147. Avoiding Over-Global State**

- 📖 **Official Docs**: [React Docs — Choosing State Structure](https://react.dev/learn/choosing-the-state-structure)
- 🔬 **Deep Dive**: [Blog — Application State Management — Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react)
- 🎯 **Interview Prep**: [Kent C. Dodds — Colocation (Avoid Over-Global)](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)
- 🎬 **Video**: [State Management Mistakes — Jack Herrington](https://www.youtube.com/watch?v=DOAqh9-sTT0)

**148. Performance Impact of State Changes**

- 📖 **Official Docs**: [React Docs — Choosing State Structure](https://react.dev/learn/choosing-the-state-structure)
- 🔬 **Deep Dive**: [Blog — Performance Impact of State Changes — Kent C. Dodds](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render)
- 🎯 **Interview Prep**: [Kent C. Dodds — Fix the Slow Render](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render)
- 🎬 **Video**: [State Performance — Jack Herrington](https://www.youtube.com/watch?v=FLAVPV_qDAg)

### SEQUENCE 7️⃣ — Data Fetching & API Design

> How your app talks to the server. Builds directly on state knowledge.

#### 🔌 Module 7.1: API Consumption

**149. REST API Consumption Patterns**

- 📖 **Official Docs**: [MDN — Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- 🔬 **Deep Dive**: [Blog — REST API Best Practices — LogRocket](https://blog.logrocket.com/rest-api-best-practices/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Fetch API in JavaScript](https://www.geeksforgeeks.org/javascript-fetch-method/)
- 🎬 **Video**: [REST API in 100 Seconds — Fireship](https://www.youtube.com/watch?v=-MTSQjw5DrM)

**150. GraphQL in Frontend Systems**

- 📖 **Official Docs**: [GraphQL Docs](https://graphql.org/learn/)
- 🔬 **Deep Dive**: [Blog — GraphQL in Frontend — LogRocket](https://blog.logrocket.com/graphql-vs-rest-api/)
- 🎯 **Interview Prep**: [GeeksForGeeks — GraphQL Interview Questions](https://www.geeksforgeeks.org/graphql-interview-questions-and-answers/)
- 🎬 **Video**: [GraphQL in 100 Seconds — Fireship](https://www.youtube.com/watch?v=eIQh02xuVw4)

**151. tRPC & Type-Safe APIs ★ ★**

- 📖 **Official Docs**: [tRPC Docs](https://trpc.io/docs)
- 🔬 **Deep Dive**: [Blog — tRPC: Build Type-Safe APIs — LogRocket](https://blog.logrocket.com/build-full-stack-typescript-app-trpc-react/)
- 🎯 **Interview Prep**: [tRPC Docs — Getting Started](https://trpc.io/docs)
- 🎬 **Video**: [tRPC Explained — Theo](https://www.youtube.com/watch?v=2LYM8DEf5eo)

#### 📜 Module 7.2: Lists & Streams

**152. Pagination Strategies**

- 📖 **Official Docs**: [MDN — API Pagination](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- 🔬 **Deep Dive**: [Blog — Pagination Strategies — LogRocket](https://blog.logrocket.com/pagination-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Pagination in React](https://www.geeksforgeeks.org/how-to-implement-pagination-in-reactjs/)
- 🎬 **Video**: [Pagination in React — Codevolution](https://www.youtube.com/watch?v=IYCa1F-OWmk)

**153. Infinite Scrolling Design**

- 📖 **Official Docs**: [MDN — Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- 🔬 **Deep Dive**: [Blog — Infinite Scrolling in React — LogRocket](https://blog.logrocket.com/react-infinite-scroll/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Infinite Scrolling in React](https://www.geeksforgeeks.org/infinite-scrolling-in-react/)
- 🎬 **Video**: [Infinite Scroll — Jack Herrington](https://www.youtube.com/watch?v=NZKUirTtxcg)

**154. Cursor-Based vs Offset Pagination Trade-offs ★ ★**

- 📖 **Official Docs**: [Blog — Cursor-Based Pagination — Slack Engineering](https://slack.engineering/evolving-api-pagination-at-slack/)
- 🔬 **Deep Dive**: [Blog — Cursor vs Offset Pagination — LogRocket](https://blog.logrocket.com/graphql-cursor-based-pagination/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Optimistic UI Updates](https://www.geeksforgeeks.org/optimistic-ui-updates/)
- 🎬 **Video**: [Cursor Pagination — Hussein Nasser](https://www.youtube.com/watch?v=WUICbOOtAic)

#### ⏱️ Module 7.3: Request Control

**155. Debouncing & Throttling (applied to API calls)**

- 📖 **Official Docs**: [MDN — setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout)
- 🔬 **Deep Dive**: [CSS-Tricks — Debouncing and Throttling Explained](https://css-tricks.com/debouncing-throttling-explained-examples/)
- 🎯 **Interview Prep**: [MDN — ReadableStream API](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- 🎬 **Video**: [Debounce & Throttle — Akshay Saini](https://www.youtube.com/watch?v=Zo-6_qx8uxg)

**156. Parallel vs Sequential API Calls**

- 📖 **Official Docs**: [MDN — Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- 🔬 **Deep Dive**: [Blog — Parallel API Calls — LogRocket](https://blog.logrocket.com/understanding-promise-all-in-javascript/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Offline Data Sync](https://www.geeksforgeeks.org/how-to-make-a-web-app-work-offline/)
- 🎬 **Video**: [Parallel vs Sequential Requests — Fireship](https://www.youtube.com/watch?v=vn3tm0quoqE)

**157. Optimistic UI Updates**

- 📖 **Official Docs**: [React Docs — Updating Objects in State](https://react.dev/learn/updating-objects-in-state)
- 🔬 **Deep Dive**: [Blog — Optimistic UI Updates — LogRocket](https://blog.logrocket.com/optimistic-ui-updates-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — API Rate Limiting](https://www.geeksforgeeks.org/what-is-api-rate-limiting-and-why-is-it-important/)
- 🎬 **Video**: [Optimistic UI — Jack Herrington](https://www.youtube.com/watch?v=M3mGY0pgFk0)

#### 🛡️ Module 7.4: Reliability

**158. Error Handling & Retry Strategies**

- 📖 **Official Docs**: [MDN — Fetch Error Handling](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful)
- 🔬 **Deep Dive**: [Blog — Error Handling & Retry Strategies — LogRocket](https://blog.logrocket.com/error-handling-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — API Retry Strategies](https://www.geeksforgeeks.org/exponential-backoff-algorithm/)
- 🎬 **Video**: [Error Handling in React — Codevolution](https://www.youtube.com/watch?v=DNYXgtZBRPE)

**159. API Contracts & Versioning**

- 📖 **Official Docs**: [Swagger — OpenAPI Specification](https://swagger.io/specification/)
- 🔬 **Deep Dive**: [Blog — API Versioning Best Practices — LogRocket](https://blog.logrocket.com/api-versioning-best-practices/)
- 🎯 **Interview Prep**: [GeeksForGeeks — BFF Pattern](https://www.geeksforgeeks.org/backend-for-frontend-bff-pattern/)
- 🎬 **Video**: [API Versioning — Hussein Nasser](https://www.youtube.com/watch?v=Exf4Q2FzLuo)

**160. Request Deduplication**

- 📖 **Official Docs**: [TanStack Query — Deduplication](https://tanstack.com/query/latest/docs/framework/react/guides/caching)
- 🔬 **Deep Dive**: [Blog — Request Deduplication — LogRocket](https://blog.logrocket.com/react-query-state-management/)
- 🎯 **Interview Prep**: [web.dev — Parallel vs Sequential API Calls](https://web.dev/articles/loading-third-party-javascript)
- 🎬 **Video**: [Request Deduplication — Jack Herrington](https://www.youtube.com/watch?v=OrliU0e09io)

**161. Client-Side Rate Limiting**

- 📖 **Official Docs**: [MDN — Rate Limiting](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout)
- 🔬 **Deep Dive**: [Blog — Client-Side Rate Limiting — LogRocket](https://blog.logrocket.com/rate-limiting-node-js/)
- 🎯 **Interview Prep**: [GeeksForGeeks — API Versioning Best Practices](https://www.geeksforgeeks.org/api-versioning/)
- 🎬 **Video**: [Rate Limiting Explained — Hussein Nasser](https://www.youtube.com/watch?v=mhUQe4BKZXs)

**162. Circuit Breaker Pattern**

- 📖 **Official Docs**: [Blog — Circuit Breaker Pattern — Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html)
- 🔬 **Deep Dive**: [Blog — Circuit Breaker in Frontend — LogRocket](https://blog.logrocket.com/implement-circuit-breaker-pattern-node-js/)
- 🎯 **Interview Prep**: [GeeksForGeeks — API Response Caching](https://www.geeksforgeeks.org/caching-in-system-design/)
- 🎬 **Video**: [Circuit Breaker — Hussein Nasser](https://www.youtube.com/watch?v=ADHcBxEXvCo)

**163. Graceful API Degradation**

- 📖 **Official Docs**: [web.dev — Reliable Web Apps](https://web.dev/articles/reliable)
- 🔬 **Deep Dive**: [Blog — Graceful Degradation — LogRocket](https://blog.logrocket.com/progressive-enhancement-vs-graceful-degradation/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Error Handling Patterns](https://www.geeksforgeeks.org/error-handling-in-javascript/)
- 🎬 **Video**: [Graceful Degradation — Fireship](https://www.youtube.com/watch?v=6I_GwgoGm1w)

**164. Skeleton Loaders & Loading State Strategy ★ ★**

- 📖 **Official Docs**: [web.dev — Skeleton Screens](https://web.dev/articles/ux-basics)
- 🔬 **Deep Dive**: [Blog — Skeleton Loading States — LogRocket](https://blog.logrocket.com/building-skeleton-screens-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — File Uploads in JavaScript](https://www.geeksforgeeks.org/how-to-upload-file-using-javascript/)
- 🎬 **Video**: [Skeleton UI — Fireship](https://www.youtube.com/watch?v=ZVug65gW-fc)

---

## 🚀 PHASE 4 — PERFORMANCE & ARCHITECTURE

*Weeks 6–7 | Your SAP Lighthouse story lives here. This is where you shine.*

### SEQUENCE 8️⃣ — Performance Optimization

> Your strongest real-world asset. The SAP Lighthouse 60→95 story answers most of this.

#### 📊 Module 8.1: Metrics & Measurement

**165. Frontend Performance Metrics**

- 📖 **Official Docs**: [web.dev — Performance](https://web.dev/performance)
- 🔬 **Deep Dive**: [Blog — The Cost of JavaScript — V8](https://v8.dev/blog/cost-of-javascript-2019)
- 🎯 **Interview Prep**: [web.dev — Core Web Vitals Guide](https://web.dev/articles/vitals)
- 🎬 **Video**: [Web Performance — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc)

**166. FCP, LCP, CLS, TTI, INP — Precise Definitions and Targets**

- 📖 **Official Docs**: [web.dev — Web Vitals](https://web.dev/articles/vitals)
- 🔬 **Deep Dive**: [web.dev — Metrics (LCP, FID, CLS, INP)](https://web.dev/articles/lcp)
- 🎯 **Interview Prep**: [web.dev — Largest Contentful Paint (LCP)](https://web.dev/articles/lcp)
- 🎬 **Video**: [Core Web Vitals — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc)

**167. Lighthouse CI — Automating Performance Budgets in CI/CD ★ ★**

- 📖 **Official Docs**: [Lighthouse CI — GitHub](https://github.com/GoogleChrome/lighthouse-ci)
- 🔬 **Deep Dive**: [web.dev — Performance Budgets](https://web.dev/articles/performance-budgets-101)
- 🎯 **Interview Prep**: [web.dev — Interaction to Next Paint (INP)](https://web.dev/articles/inp)
- 🎬 **Video**: [Lighthouse CI — Google Chrome Developers](https://www.youtube.com/watch?v=mLjxXPHuIJo)

**168. Real User Monitoring (RUM) vs Synthetic Testing ★ ★**

- 📖 **Official Docs**: [web.dev — Real User Monitoring](https://web.dev/articles/vitals-measurement-getting-started)
- 🔬 **Deep Dive**: [Blog — RUM vs Synthetic Testing — Calibre](https://calibreapp.com/blog/synthetic-vs-real-user-monitoring)
- 🎯 **Interview Prep**: [web.dev — Cumulative Layout Shift (CLS)](https://web.dev/articles/cls)
- 🎬 **Video**: [RUM vs Synthetic — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc)

#### 📦 Module 8.2: Code Optimization

**169. Code Splitting Strategies**

- 📖 **Official Docs**: [web.dev — Code Splitting](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting)
- 🔬 **Deep Dive**: [Blog — Code Splitting Strategies — LogRocket](https://blog.logrocket.com/code-splitting-react-components/)
- 🎯 **Interview Prep**: [web.dev — Time to First Byte (TTFB)](https://web.dev/articles/ttfb)
- 🎬 **Video**: [Code Splitting — Fireship](https://www.youtube.com/watch?v=JU6sl_yyZqs)

**170. Lazy Loading Components & Routes**

- 📖 **Official Docs**: [web.dev — Lazy Loading](https://web.dev/articles/lazy-loading)
- 🔬 **Deep Dive**: [MDN — Lazy Loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading)
- 🎯 **Interview Prep**: [web.dev — First Contentful Paint (FCP)](https://web.dev/articles/fcp)
- 🎬 **Video**: [Lazy Loading — Google Chrome Developers](https://www.youtube.com/watch?v=AActXSWxsRo)

**171. Tree Shaking**

- 📖 **Official Docs**: [MDN — Tree Shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking)
- 🔬 **Deep Dive**: [webpack — Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- 🎯 **Interview Prep**: [web.dev — Total Blocking Time (TBT)](https://web.dev/articles/tbt)
- 🎬 **Video**: [Tree Shaking — Fireship](https://www.youtube.com/watch?v=X8w_ghczzes)

**172. Memoization Techniques**

- 📖 **Official Docs**: [React Docs — useMemo](https://react.dev/reference/react/useMemo)
- 🔬 **Deep Dive**: [Blog — Memoization in JS — LogRocket](https://blog.logrocket.com/javascript-memoization/)
- 🎯 **Interview Prep**: [web.dev — Running Lighthouse Audit](https://web.dev/articles/lighthouse-performance)
- 🎬 **Video**: [Memoization Explained — Akshay Saini](https://www.youtube.com/watch?v=lhNdUVh3qCc)

**173. Bundle Analysis — webpack-bundle-analyzer, Rollup Visualiser ★ ★**

- 📖 **Official Docs**: [webpack — Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- 🔬 **Deep Dive**: [Blog — Bundle Analysis — LogRocket](https://blog.logrocket.com/guide-performance-optimization-webpack/)
- 🎯 **Interview Prep**: [Chrome DevTools — Performance Features Reference](https://developer.chrome.com/docs/devtools/performance/reference)
- 🎬 **Video**: [Webpack Bundle Analyzer — Fireship](https://www.youtube.com/watch?v=SbhkQA0k8a0)

#### 🧵 Module 8.3: Rendering Performance

**174. Virtualization (Large Lists)**

- 📖 **Official Docs**: [react-window — GitHub](https://github.com/bvaughn/react-window)
- 🔬 **Deep Dive**: [web.dev — Virtualize Long Lists](https://web.dev/articles/virtualize-long-lists-react-window)
- 🎯 **Interview Prep**: [GeeksForGeeks — Tree Shaking in JavaScript](https://www.geeksforgeeks.org/tree-shaking-in-javascript/)
- 🎬 **Video**: [Virtualizing Long Lists — Jack Herrington](https://www.youtube.com/watch?v=UrgfPjX97Kw)

**175. Avoiding Unnecessary Re-Renders**

- 📖 **Official Docs**: [React Docs — Optimizing Performance](https://react.dev/learn/render-and-commit)
- 🔬 **Deep Dive**: [Blog — Avoid Unnecessary Re-Renders — Kent C. Dodds](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render)
- 🎯 **Interview Prep**: [GeeksForGeeks — Memoization in JavaScript](https://www.geeksforgeeks.org/what-is-memoization-in-javascript/)
- 🎬 **Video**: [Unnecessary Re-renders — Jack Herrington](https://www.youtube.com/watch?v=FLAVPV_qDAg)

**176. Performance Budgets**

- 📖 **Official Docs**: [web.dev — Performance Budgets](https://web.dev/articles/performance-budgets-101)
- 🔬 **Deep Dive**: [Blog — Setting Performance Budgets — Calibre](https://calibreapp.com/blog/performance-budgets)
- 🎯 **Interview Prep**: [GeeksForGeeks — Code Splitting in Webpack](https://www.geeksforgeeks.org/code-splitting-in-webpack/)
- 🎬 **Video**: [Performance Budgets — Google Chrome Developers](https://www.youtube.com/watch?v=yqejmZrtmNg)

**177. Angular OnPush + trackBy Performance Patterns ★ ★**

- 📖 **Official Docs**: [Angular — OnPush Strategy](https://angular.dev/guide/components/advanced-configuration#changedetectionstrategy)
- 🔬 **Deep Dive**: [Blog — Angular OnPush + trackBy — Netanel Basal](https://netbasal.com/a-comprehensive-guide-to-angular-onpush-change-detection-strategy-e3e7b0df9a70)
- 🎯 **Interview Prep**: [GeeksForGeeks — Lazy Loading in JavaScript](https://www.geeksforgeeks.org/what-is-lazy-loading/)
- 🎬 **Video**: [OnPush & trackBy — Decoded Frontend](https://www.youtube.com/watch?v=AWxLOidx-vE)

#### ⏳ Module 8.4: Main Thread Management

**178. Main Thread Scheduling**

- 📖 **Official Docs**: [web.dev — Optimize Long Tasks](https://web.dev/articles/optimize-long-tasks)
- 🔬 **Deep Dive**: [Blog — Main Thread Scheduling — Chrome](https://developer.chrome.com/blog/introducing-scheduler-yield)
- 🎯 **Interview Prep**: [GeeksForGeeks — Virtual Scrolling / Windowing](https://www.geeksforgeeks.org/what-is-windowing-or-list-virtualization-in-react/)
- 🎬 **Video**: [Long Tasks — Google Chrome Developers](https://www.youtube.com/watch?v=8_pzlWR1vR4)

**179. Long Tasks & Yielding Control**

- 📖 **Official Docs**: [web.dev — Optimize Long Tasks](https://web.dev/articles/optimize-long-tasks)
- 🔬 **Deep Dive**: [Blog — Yielding to the Main Thread — Chrome](https://developer.chrome.com/blog/introducing-scheduler-yield)
- 🎯 **Interview Prep**: [web.dev — Avoid Long Main Thread Tasks](https://web.dev/articles/optimize-long-tasks)
- 🎬 **Video**: [Yielding to Main Thread — Google Chrome Developers](https://www.youtube.com/watch?v=8_pzlWR1vR4)

**180. Interaction to Next Paint (INP)**

- 📖 **Official Docs**: [web.dev — INP](https://web.dev/articles/inp)
- 🔬 **Deep Dive**: [Blog — Optimize INP — Chrome](https://developer.chrome.com/docs/devtools/performance/inp)
- 🎯 **Interview Prep**: [web.dev — Optimize Long Tasks (yield)](https://web.dev/articles/optimize-long-tasks)
- 🎬 **Video**: [Interaction to Next Paint — Google Chrome Developers](https://www.youtube.com/watch?v=KZ1kxzsJZ5g)

**181. scheduler.postTask() API ★ ★**

- 📖 **Official Docs**: [MDN — Scheduler.postTask()](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/postTask)
- 🔬 **Deep Dive**: [Chrome — Prioritized Task Scheduling](https://developer.chrome.com/blog/introducing-scheduler-yield)
- 🎯 **Interview Prep**: [GeeksForGeeks — requestAnimationFrame](https://www.geeksforgeeks.org/javascript-window-requestanimationframe/)
- 🎬 **Video**: [scheduler.postTask() — Google Chrome Developers](https://www.youtube.com/watch?v=8_pzlWR1vR4)

### SEQUENCE 9️⃣ — Assets & Resource Optimization

> Directly supports performance. Adobe asks about this specifically.

#### 🖼️ Module 9.1: Media & Fonts

**182. Image Optimization**

- 📖 **Official Docs**: [web.dev — Optimize Images](https://web.dev/articles/choose-the-right-image-format)
- 🔬 **Deep Dive**: [Blog — Image Optimization Guide — Smashing Magazine](https://www.smashingmagazine.com/2021/04/image-optimization-pre-loading/)
- 🎯 **Interview Prep**: [web.dev — requestIdleCallback](https://web.dev/articles/using-requestidlecallback)
- 🎬 **Video**: [Image Optimization — Google Chrome Developers](https://www.youtube.com/watch?v=YJGCZCaIZkQ)

**183. Responsive Images**

- 📖 **Official Docs**: [MDN — Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- 🔬 **Deep Dive**: [web.dev — Serve Responsive Images](https://web.dev/articles/serve-responsive-images)
- 🎯 **Interview Prep**: [GeeksForGeeks — Web Workers for CPU Tasks](https://www.geeksforgeeks.org/web-workers-in-javascript/)
- 🎬 **Video**: [Responsive Images — Google Chrome Developers](https://www.youtube.com/watch?v=fp9eKQrnL-E)

**184. Font Optimization**

- 📖 **Official Docs**: [web.dev — Best Practices for Fonts](https://web.dev/articles/font-best-practices)
- 🔬 **Deep Dive**: [MDN — Web Fonts](https://developer.mozilla.org/en-US/docs/Learn/CSS/Styling_text/Web_fonts)
- 🎯 **Interview Prep**: [web.dev — Optimize First Input Delay](https://web.dev/articles/optimize-inp)
- 🎬 **Video**: [Font Optimization — Google Chrome Developers](https://www.youtube.com/watch?v=G0cOQ79WKZE)

**185. AVIF vs WebP vs JPEG XL — Modern Image Formats ★ ★**

- 📖 **Official Docs**: [web.dev — Use Modern Image Formats](https://web.dev/articles/uses-webp-images)
- 🔬 **Deep Dive**: [Blog — AVIF vs WebP — Cloudflare](https://blog.cloudflare.com/generate-avif-images-with-image-resizing/)
- 🎯 **Interview Prep**: [web.dev — Responsive Images](https://web.dev/articles/responsive-images)
- 🎬 **Video**: [AVIF vs WebP — Fireship](https://www.youtube.com/watch?v=GFMXBSCcpfo)

**186. Variable Fonts ★ ★**

- 📖 **Official Docs**: [MDN — Variable Fonts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fonts/Variable_fonts_guide)
- 🔬 **Deep Dive**: [web.dev — Variable Fonts](https://web.dev/articles/variable-fonts)
- 🎯 **Interview Prep**: [web.dev — Image Optimization Best Practices](https://web.dev/articles/choose-the-right-image-format)
- 🎬 **Video**: [Variable Fonts — Google Chrome Developers](https://www.youtube.com/watch?v=G0cOQ79WKZE)

#### 🎨 Module 9.2: CSS & JS Assets

**187. CSS Optimization**

- 📖 **Official Docs**: [web.dev — Optimize CSS](https://web.dev/articles/extract-critical-css)
- 🔬 **Deep Dive**: [MDN — CSS Performance](https://developer.mozilla.org/en-US/docs/Learn/Performance/CSS)
- 🎯 **Interview Prep**: [web.dev — Serve Modern Image Formats (AVIF/WebP)](https://web.dev/articles/serve-images-webp)
- 🎬 **Video**: [CSS Optimization — Fireship](https://www.youtube.com/watch?v=Qhaz36TZG5Y)

**188. JavaScript Bundle Optimization**

- 📖 **Official Docs**: [web.dev — Reduce JavaScript Payloads](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting)
- 🔬 **Deep Dive**: [webpack — Optimization](https://webpack.js.org/guides/production/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Lazy Loading Images](https://www.geeksforgeeks.org/what-is-lazy-loading/)
- 🎬 **Video**: [JS Bundle Optimization — Fireship](https://www.youtube.com/watch?v=SbhkQA0k8a0)

**189. Compression (Gzip, Brotli)**

- 📖 **Official Docs**: [MDN — Compression](https://developer.mozilla.org/en-US/docs/Web/HTTP/Compression)
- 🔬 **Deep Dive**: [Blog — Brotli vs Gzip — Cloudflare](https://blog.cloudflare.com/results-experimenting-brotli/)
- 🎯 **Interview Prep**: [GeeksForGeeks — CSS Optimization Techniques](https://www.geeksforgeeks.org/css-best-practices/)
- 🎬 **Video**: [Brotli vs Gzip — Hussein Nasser](https://www.youtube.com/watch?v=vILR8WE5ORY)

**190. CSS-in-JS Performance Trade-offs ★ ★**

- 📖 **Official Docs**: [Blog — CSS-in-JS Performance — Aggelos Arvanitakis](https://pustelto.com/blog/css-vs-css-in-js-perf/)
- 🔬 **Deep Dive**: [Blog — CSS-in-JS Trade-offs — Sam Magura](https://dev.to/srmagura/why-were-breaking-up-wiht-css-in-js-4g9b)
- 🎯 **Interview Prep**: [web.dev — Extract Critical CSS](https://web.dev/articles/extract-critical-css)
- 🎬 **Video**: [CSS-in-JS Debate — Theo](https://www.youtube.com/watch?v=CQuTF-bkOgc)

#### 🌍 Module 9.3: Delivery & Third-Party

**191. CDN Usage**

- 📖 **Official Docs**: [Cloudflare — What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
- 🔬 **Deep Dive**: [web.dev — Content Delivery Networks](https://web.dev/articles/content-delivery-networks)
- 🎯 **Interview Prep**: [GeeksForGeeks — Font Loading Optimization](https://www.geeksforgeeks.org/css-font-display-property/)
- 🎬 **Video**: [CDN Explained — Fireship](https://www.youtube.com/watch?v=RI9np1LWzqw)

**192. Third-Party Script Management**

- 📖 **Official Docs**: [web.dev — Loading Third-Party JavaScript](https://web.dev/articles/optimizing-content-efficiency-loading-third-party-javascript)
- 🔬 **Deep Dive**: [Blog — Third-Party Script Impact — Calibre](https://calibreapp.com/blog/third-party-resources)
- 🎯 **Interview Prep**: [web.dev — JavaScript Bundling Best Practices](https://web.dev/articles/reduce-javascript-payloads-with-tree-shaking)
- 🎬 **Video**: [Third-Party Scripts — Google Chrome Developers](https://www.youtube.com/watch?v=bmIUYBNKja4)

**193. Tag Managers & Risks**

- 📖 **Official Docs**: [web.dev — Tag Managers](https://web.dev/articles/tag-best-practices)
- 🔬 **Deep Dive**: [Blog — GTM Performance Risks — Calibre](https://calibreapp.com/blog/tag-managers)
- 🎯 **Interview Prep**: [web.dev — Content Delivery Networks (CDN)](https://web.dev/articles/content-delivery-networks)
- 🎬 **Video**: [GTM Performance — Google Chrome Developers](https://www.youtube.com/watch?v=bmIUYBNKja4)

**194. Self-Hosting vs Third-Party Assets**

- 📖 **Official Docs**: [web.dev — Self-Host Third-Party Assets](https://web.dev/articles/preconnect-and-dns-prefetch)
- 🔬 **Deep Dive**: [Blog — Self-Hosting Fonts — Sia Karamalegos](https://sia.codes/posts/making-google-fonts-faster/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Resource Hints (preload, prefetch)](https://www.geeksforgeeks.org/html-link-rel-attribute/)
- 🎬 **Video**: [Self-Hosting vs CDN — Fireship](https://www.youtube.com/watch?v=RI9np1LWzqw)

**195. Resource Hints — Priority Hints API ★ ★**

- 📖 **Official Docs**: [web.dev — Fetch Priority API](https://web.dev/articles/fetch-priority)
- 🔬 **Deep Dive**: [Chrome — Priority Hints](https://developer.chrome.com/blog/fetch-priority)
- 🎯 **Interview Prep**: [web.dev — Module/Nomodule Pattern](https://web.dev/articles/serve-modern-code-to-modern-browsers)
- 🎬 **Video**: [Priority Hints — Google Chrome Developers](https://www.youtube.com/watch?v=SrU03vP0vMc)

### SEQUENCE 🔟 — Frontend Architecture Patterns

> Big picture thinking. Builds on everything above.

#### 🧩 Module 10.1: Structural Patterns

**196. Monolithic Frontend Architecture**

- 📖 **Official Docs**: [patterns.dev — Design Patterns](https://www.patterns.dev/)
- 🔬 **Deep Dive**: [Blog — Monolithic Frontend — Micro-frontends.org](https://micro-frontends.org/)
- 🎯 **Interview Prep**: [web.dev — Compression (Brotli vs Gzip)](https://web.dev/articles/optimizing-content-efficiency-optimize-encoding-and-transfer)
- 🎬 **Video**: [Frontend Architecture — Fireship](https://www.youtube.com/watch?v=lkIFF4maKMU)

**197. Component-Based Architecture**

- 📖 **Official Docs**: [React Docs — Thinking in React](https://react.dev/learn/thinking-in-react)
- 🔬 **Deep Dive**: [patterns.dev — Component Patterns](https://www.patterns.dev/react/compound-pattern)
- 🎯 **Interview Prep**: [GeeksForGeeks — Import Maps in JavaScript](https://www.geeksforgeeks.org/javascript-import-maps/)
- 🎬 **Video**: [Component Architecture — Jack Herrington](https://www.youtube.com/watch?v=x5PZwb4XurU)

**198. MVC / MVVM in Frontend**

- 📖 **Official Docs**: [MDN — MVC Architecture](https://developer.mozilla.org/en-US/docs/Glossary/MVC)
- 🔬 **Deep Dive**: [Blog — MVC vs MVVM — LogRocket](https://blog.logrocket.com/model-view-controller-mvc-pattern/)
- 🎯 **Interview Prep**: [patterns.dev — Micro-Frontends](https://www.patterns.dev/vanilla/micro-frontends)
- 🎬 **Video**: [MVC Explained — Fireship](https://www.youtube.com/watch?v=DUg2SWWK18I)

**199. Atomic Design Methodology ★ ★**

- 📖 **Official Docs**: [Atomic Design — Brad Frost](https://atomicdesign.bradfrost.com/)
- 🔬 **Deep Dive**: [Blog — Atomic Design Methodology — LogRocket](https://blog.logrocket.com/atomic-design-react-native/)
- 🎯 **Interview Prep**: [patterns.dev — Module Federation](https://www.patterns.dev/vanilla/module-federation)
- 🎬 **Video**: [Atomic Design in React — Fireship](https://www.youtube.com/watch?v=lkIFF4maKMU)

**200. Compound Component Pattern (applied)**

- 📖 **Official Docs**: [patterns.dev — Compound Component](https://www.patterns.dev/react/compound-pattern)
- 🔬 **Deep Dive**: [Blog — Compound Components in React — LogRocket](https://blog.logrocket.com/understanding-react-compound-components/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Monorepo vs Polyrepo](https://www.geeksforgeeks.org/monorepo-vs-polyrepo/)
- 🎬 **Video**: [Compound Components — Jack Herrington](https://www.youtube.com/watch?v=vPRdY87_SH0)

#### 🏛️ Module 10.2: Application Types

**201. SPA Architecture**

- 📖 **Official Docs**: [MDN — SPA](https://developer.mozilla.org/en-US/docs/Glossary/SPA)
- 🔬 **Deep Dive**: [patterns.dev — SPA Patterns](https://www.patterns.dev/vanilla/client-side-rendering)
- 🎯 **Interview Prep**: [patterns.dev — Singleton Pattern](https://www.patterns.dev/vanilla/singleton-pattern)
- 🎬 **Video**: [SPA vs MPA — Fireship](https://www.youtube.com/watch?v=Dkx5ydvtpCA)

**202. MPA Architecture**

- 📖 **Official Docs**: [web.dev — Multi-page Application](https://web.dev/articles/rendering-on-the-web)
- 🔬 **Deep Dive**: [Blog — SPA vs MPA — Vercel](https://vercel.com/blog/understanding-react-server-components)
- 🎯 **Interview Prep**: [patterns.dev — Observer Pattern](https://www.patterns.dev/vanilla/observer-pattern)
- 🎬 **Video**: [MPA vs SPA — Theo](https://www.youtube.com/watch?v=860d8usGC0o)

**203. Hybrid Rendering Architecture**

- 📖 **Official Docs**: [web.dev — Rendering on the Web](https://web.dev/articles/rendering-on-the-web)
- 🔬 **Deep Dive**: [Blog — Hybrid Rendering — Vercel](https://vercel.com/blog/understanding-react-server-components)
- 🎯 **Interview Prep**: [patterns.dev — Mediator Pattern](https://www.patterns.dev/vanilla/mediator-pattern)
- 🎬 **Video**: [Hybrid Rendering — Jack Herrington](https://www.youtube.com/watch?v=DrxiNfbr63s)

#### 🧱 Module 10.3: Scale-Oriented Architectures

**204. Micro-Frontend Architecture**

- 📖 **Official Docs**: [micro-frontends.org](https://micro-frontends.org/)
- 🔬 **Deep Dive**: [Blog — Micro-Frontends — Martin Fowler](https://martinfowler.com/articles/micro-frontends.html)
- 🎯 **Interview Prep**: [patterns.dev — Proxy Pattern](https://www.patterns.dev/vanilla/proxy-pattern)
- 🎬 **Video**: [Micro-Frontends — Jack Herrington](https://www.youtube.com/watch?v=w58aZjACETQ)

**205. Module Federation**

- 📖 **Official Docs**: [webpack — Module Federation](https://webpack.js.org/concepts/module-federation/)
- 🔬 **Deep Dive**: [Blog — Module Federation: A Game Changer — Zack Jackson](https://module-federation.io/)
- 🎯 **Interview Prep**: [patterns.dev — Factory Pattern](https://www.patterns.dev/vanilla/factory-pattern)
- 🎬 **Video**: [Module Federation — Jack Herrington](https://www.youtube.com/watch?v=K-yQB9YGmgE)

**206. Design System Architecture**

- 📖 **Official Docs**: [Storybook Docs](https://storybook.js.org/docs)
- 🔬 **Deep Dive**: [Blog — Design System Architecture — LogRocket](https://blog.logrocket.com/build-component-library-react-typescript/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design System Best Practices](https://www.geeksforgeeks.org/design-system-in-frontend/)
- 🎬 **Video**: [Design Systems — Fireship](https://www.youtube.com/watch?v=lKXspt7FJcQ)

**207. Feature-Based vs Layer-Based Structuring**

- 📖 **Official Docs**: [Blog — Feature-Sliced Design](https://feature-sliced.design/)
- 🔬 **Deep Dive**: [Blog — Structuring React Projects — LogRocket](https://blog.logrocket.com/react-project-structure/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Component Library Architecture](https://www.geeksforgeeks.org/building-a-component-library/)
- 🎬 **Video**: [Project Structure — Jack Herrington](https://www.youtube.com/watch?v=T1TbNqvIKtY)

**208. Monorepo Architecture (Nx, Turborepo) ★ ★**

- 📖 **Official Docs**: [Nx Docs](https://nx.dev/getting-started/intro)
- 🔬 **Deep Dive**: [Turborepo Docs](https://turbo.build/repo/docs)
- 🎯 **Interview Prep**: [GeeksForGeeks — Feature Flags](https://www.geeksforgeeks.org/feature-flag-in-software-engineering/)
- 🎬 **Video**: [Monorepo Explained — Fireship](https://www.youtube.com/watch?v=9iU_IE6vnJ8)

**209. Plugin Architecture in Frontend ★ ★**

- 📖 **Official Docs**: [Blog — Plugin Architecture — Martin Fowler](https://martinfowler.com/articles/micro-frontends.html)
- 🔬 **Deep Dive**: [Blog — Plugin System Design — LogRocket](https://blog.logrocket.com/advanced-react-component-composition/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Trunk-Based Development](https://www.geeksforgeeks.org/trunk-based-development/)
- 🎬 **Video**: [Plugin Architecture — Jack Herrington](https://www.youtube.com/watch?v=iLfl9LXL2Co)

### SEQUENCE 1️⃣1️⃣ — Rendering Strategies

> After architecture — how you choose where to render.

#### 🖥️ Module 11.1: Rendering Models

**210. Client-Side Rendering (CSR)**

- 📖 **Official Docs**: [web.dev — Client-Side Rendering](https://web.dev/articles/rendering-on-the-web#csr)
- 🔬 **Deep Dive**: [patterns.dev — Client-Side Rendering](https://www.patterns.dev/vanilla/client-side-rendering)
- 🎯 **Interview Prep**: [GeeksForGeeks — Environment-Based Configuration](https://www.geeksforgeeks.org/environment-variables-in-node-js/)
- 🎬 **Video**: [CSR Explained — Fireship](https://www.youtube.com/watch?v=Dkx5ydvtpCA)

**211. Server-Side Rendering (SSR)**

- 📖 **Official Docs**: [web.dev — Server-Side Rendering](https://web.dev/articles/rendering-on-the-web#server-side-rendering)
- 🔬 **Deep Dive**: [patterns.dev — Server-Side Rendering](https://www.patterns.dev/vanilla/server-side-rendering)
- 🎯 **Interview Prep**: [patterns.dev — Module Pattern](https://www.patterns.dev/vanilla/module-pattern)
- 🎬 **Video**: [SSR Explained — Fireship](https://www.youtube.com/watch?v=Dkx5ydvtpCA)

**212. Static Site Generation (SSG)**

- 📖 **Official Docs**: [Next.js Docs — Static Generation](https://nextjs.org/docs/pages/building-your-application/rendering/static-site-generation)
- 🔬 **Deep Dive**: [patterns.dev — Static Rendering](https://www.patterns.dev/vanilla/static-rendering)
- 🎯 **Interview Prep**: [web.dev — Rendering on the Web](https://web.dev/articles/rendering-on-the-web)
- 🎬 **Video**: [SSG Explained — Fireship](https://www.youtube.com/watch?v=Dkx5ydvtpCA)

**213. Incremental Static Regeneration (ISR)**

- 📖 **Official Docs**: [Next.js Docs — Incremental Static Regeneration](https://nextjs.org/docs/pages/building-your-application/rendering/incremental-static-regeneration)
- 🔬 **Deep Dive**: [patterns.dev — Incremental Static Regeneration](https://www.patterns.dev/vanilla/incremental-static-rendering)
- 🎯 **Interview Prep**: [GeeksForGeeks — Client Side Rendering vs SSR](https://www.geeksforgeeks.org/client-side-rendering-vs-server-side-rendering/)
- 🎬 **Video**: [ISR Explained — Jack Herrington](https://www.youtube.com/watch?v=nrfuN_Hyd3Y)

**214. Partial Pre-Rendering (PPR) — Next.js 14+ ★ ★**

- 📖 **Official Docs**: [Next.js Docs — Partial Prerendering](https://nextjs.org/docs/app/building-your-application/rendering/partial-prerendering)
- 🔬 **Deep Dive**: [Vercel Blog — PPR](https://vercel.com/blog/partial-prerendering-with-next-js-creating-a-new-default-rendering-model)
- 🎯 **Interview Prep**: [GeeksForGeeks — Static Site Generation](https://www.geeksforgeeks.org/what-is-static-site-generation/)
- 🎬 **Video**: [PPR Explained — Jack Herrington](https://www.youtube.com/watch?v=wv7LmPHTGnI)

#### ⚡ Module 11.2: Advanced Rendering

**215. Streaming & Progressive Rendering**

- 📖 **Official Docs**: [web.dev — Streaming](https://web.dev/articles/rendering-on-the-web#streaming)
- 🔬 **Deep Dive**: [patterns.dev — Progressive Hydration](https://www.patterns.dev/vanilla/progressive-hydration)
- 🎯 **Interview Prep**: [GeeksForGeeks — Incremental Static Regeneration](https://www.geeksforgeeks.org/incremental-static-regeneration-in-next-js/)
- 🎬 **Video**: [Streaming SSR — Jack Herrington](https://www.youtube.com/watch?v=3JB_qEk39w0)

**216. Hydration & Partial Hydration**

- 📖 **Official Docs**: [web.dev — Hydration](https://web.dev/articles/rendering-on-the-web#rehydration)
- 🔬 **Deep Dive**: [patterns.dev — Progressive Hydration](https://www.patterns.dev/vanilla/progressive-hydration)
- 🎯 **Interview Prep**: [web.dev — Streaming Server-Side Rendering](https://web.dev/articles/rendering-on-the-web#streaming_server-side_rendering)
- 🎬 **Video**: [Hydration Explained — Jack Herrington](https://www.youtube.com/watch?v=R-BKadZWYnQ)

**217. Islands Architecture**

- 📖 **Official Docs**: [patterns.dev — Islands Architecture](https://www.patterns.dev/vanilla/islands-architecture)
- 🔬 **Deep Dive**: [Blog — Islands Architecture — Jason Miller](https://jasonformat.com/islands-architecture/)
- 🎯 **Interview Prep**: [patterns.dev — Islands Architecture](https://www.patterns.dev/vanilla/islands-architecture)
- 🎬 **Video**: [Islands Architecture — Fireship](https://www.youtube.com/watch?v=x7v5_F7NZWY)

**218. React Server Components Deep Dive (applied)**

- 📖 **Official Docs**: [React Docs — Server Components](https://react.dev/reference/rsc/server-components)
- 🔬 **Deep Dive**: [Blog — RSC Deep Dive — Josh W. Comeau](https://www.joshwcomeau.com/react/server-components/)
- 🎯 **Interview Prep**: [patterns.dev — Progressive Hydration](https://www.patterns.dev/react/progressive-hydration)
- 🎬 **Video**: [React Server Components — Jack Herrington](https://www.youtube.com/watch?v=TQQPAU21ZUw)

#### ⚖️ Module 11.3: Rendering Trade-offs

**219. CSR vs SSR vs SSG Trade-offs**

- 📖 **Official Docs**: [web.dev — Rendering on the Web](https://web.dev/articles/rendering-on-the-web)
- 🔬 **Deep Dive**: [Blog — CSR vs SSR vs SSG — Vercel](https://vercel.com/blog/understanding-react-server-components)
- 🎯 **Interview Prep**: [dev.to — Resumability vs Hydration (Qwik)](https://dev.to/nickytonline/qwik-the-javascript-framework-thats-different-by-design-1fgg)
- 🎬 **Video**: [CSR vs SSR vs SSG — Fireship](https://www.youtube.com/watch?v=Dkx5ydvtpCA)

**220. Blocking vs Non-Blocking Rendering**

- 📖 **Official Docs**: [web.dev — Render-Blocking Resources](https://web.dev/articles/render-blocking-resources)
- 🔬 **Deep Dive**: [MDN — Render-Blocking CSS](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path)
- 🎯 **Interview Prep**: [patterns.dev — Selective Hydration](https://www.patterns.dev/react/react-selective-hydration)
- 🎬 **Video**: [Blocking vs Non-Blocking — Google Chrome Developers](https://www.youtube.com/watch?v=bmIUYBNKja4)

#### 🚀 Module 11.4: Render Performance

**221. Render-Blocking CSS & JavaScript**

- 📖 **Official Docs**: [web.dev — Eliminate Render-Blocking Resources](https://web.dev/articles/render-blocking-resources)
- 🔬 **Deep Dive**: [MDN — Render-Blocking CSS/JS](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Server Components](https://www.geeksforgeeks.org/react-server-components/)
- 🎬 **Video**: [Render-Blocking Resources — Google Chrome Developers](https://www.youtube.com/watch?v=bmIUYBNKja4)

**222. Critical CSS Inlining**

- 📖 **Official Docs**: [web.dev — Extract Critical CSS](https://web.dev/articles/extract-critical-css)
- 🔬 **Deep Dive**: [Blog — Critical CSS Inlining — Smashing Magazine](https://www.smashingmagazine.com/2015/08/understanding-critical-css/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Edge Computing](https://www.geeksforgeeks.org/what-is-edge-computing/)
- 🎬 **Video**: [Critical CSS — Google Chrome Developers](https://www.youtube.com/watch?v=YJGCZCaIZkQ)

**223. Preload vs Prefetch vs Preconnect**

- 📖 **Official Docs**: [web.dev — Preload, Prefetch, Preconnect](https://web.dev/articles/preload-critical-assets)
- 🔬 **Deep Dive**: [MDN — rel=preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preload)
- 🎯 **Interview Prep**: [GeeksForGeeks — Browser Cache Explained](https://www.geeksforgeeks.org/web-browser-caching/)
- 🎬 **Video**: [Resource Hints — Google Chrome Developers](https://www.youtube.com/watch?v=YJGCZCaIZkQ)

**224. Time-to-Interactive (TTI) Trade-offs**

- 📖 **Official Docs**: [web.dev — Time to Interactive](https://web.dev/articles/tti)
- 🔬 **Deep Dive**: [Blog — TTI Optimization — Calibre](https://calibreapp.com/blog/time-to-interactive)
- 🎯 **Interview Prep**: [GeeksForGeeks — HTTP Cache Headers](https://www.geeksforgeeks.org/http-headers-cache-control/)
- 🎬 **Video**: [TTI Optimization — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc)

**225. Speculation Rules API ★ ★**

- 📖 **Official Docs**: [Chrome — Speculation Rules API](https://developer.chrome.com/docs/web-platform/prerender-pages)
- 🔬 **Deep Dive**: [Blog — Speculation Rules — Chrome Developers](https://developer.chrome.com/blog/prerender-pages)
- 🎯 **Interview Prep**: [web.dev — Service Worker Caching Strategies](https://web.dev/articles/offline-cookbook)
- 🎬 **Video**: [Speculation Rules — Google Chrome Developers](https://www.youtube.com/watch?v=2sFqo-bAKBo)

---

## 🔐 PHASE 5 — RELIABILITY & SECURITY

*Week 7 | Your SAP security work covers most of this. Formalise it.*

### SEQUENCE 1️⃣2️⃣ — Caching & Offline

> Reliability foundation. Cisco and Microsoft care deeply here.

#### 🧊 Module 12.1: Caching Layers

**226. HTTP Caching**

- 📖 **Official Docs**: [MDN — HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- 🔬 **Deep Dive**: [web.dev — HTTP Cache](https://web.dev/articles/http-cache)
- 🎯 **Interview Prep**: [GeeksForGeeks — stale-while-revalidate Pattern](https://www.geeksforgeeks.org/http-headers-cache-control/)
- 🎬 **Video**: [HTTP Caching — Hussein Nasser](https://www.youtube.com/watch?v=HiBDZgTNpXY)

**227. Browser Cache**

- 📖 **Official Docs**: [MDN — HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- 🔬 **Deep Dive**: [Chrome — Network Panel: Browser Cache](https://developer.chrome.com/docs/devtools/network/reference)
- 🎯 **Interview Prep**: [Chrome Workbox — Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview)
- 🎬 **Video**: [Browser Cache — Hussein Nasser](https://www.youtube.com/watch?v=HiBDZgTNpXY)

**228. Edge Caching vs Origin Caching ★ ★**

- 📖 **Official Docs**: [Cloudflare — Edge vs Origin](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
- 🔬 **Deep Dive**: [Blog — Edge Caching — Vercel](https://vercel.com/docs/edge-network/caching)
- 🎯 **Interview Prep**: [GeeksForGeeks — IndexedDB](https://www.geeksforgeeks.org/what-is-indexeddb/)
- 🎬 **Video**: [Edge Caching — Hussein Nasser](https://www.youtube.com/watch?v=jC3_AtEVpj0)

#### 🔧 Module 12.2: Client Persistence

**229. Service Workers (applied to caching)**

- 📖 **Official Docs**: [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- 🔬 **Deep Dive**: [web.dev — Service Worker Caching Strategies](https://web.dev/articles/offline-cookbook)
- 🎯 **Interview Prep**: [web.dev — PWA Checklist](https://web.dev/articles/pwa-checklist)
- 🎬 **Video**: [Service Worker Caching — Google Chrome Developers](https://www.youtube.com/watch?v=ksXwaWHCW6k)

**230. IndexedDB**

- 📖 **Official Docs**: [MDN — IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- 🔬 **Deep Dive**: [web.dev — IndexedDB Guide](https://web.dev/articles/indexeddb)
- 🎯 **Interview Prep**: [web.dev — Offline Fallback Page](https://web.dev/articles/offline-fallback-page)
- 🎬 **Video**: [IndexedDB — Google Chrome Developers](https://www.youtube.com/watch?v=g4U5WRzHitM)

**231. LocalStorage vs SessionStorage**

- 📖 **Official Docs**: [MDN — Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- 🔬 **Deep Dive**: [web.dev — Storage for the Web](https://web.dev/articles/storage-for-the-web)
- 🎯 **Interview Prep**: [web.dev — Background Sync API](https://web.dev/articles/background-sync)
- 🎬 **Video**: [localStorage vs sessionStorage — Traversy Media](https://www.youtube.com/watch?v=GihQAC1I39Q)

**232. Cache API & Workbox Library ★ ★**

- 📖 **Official Docs**: [MDN — Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- 🔬 **Deep Dive**: [Workbox Docs](https://developer.chrome.com/docs/workbox)
- 🎯 **Interview Prep**: [Chrome Developers — Persistent Storage](https://developer.chrome.com/docs/apps/offline_storage)
- 🎬 **Video**: [Workbox — Google Chrome Developers](https://www.youtube.com/watch?v=sOq92prx00w)

#### ♻️ Module 12.3: Cache Strategy

**233. Cache Invalidation**

- 📖 **Official Docs**: [web.dev — Cache Invalidation](https://web.dev/articles/http-cache#invalidating-and-updating-cached-responses)
- 🔬 **Deep Dive**: [Blog — Cache Invalidation Strategies — LogRocket](https://blog.logrocket.com/web-caching-strategies/)
- 🎯 **Interview Prep**: [OWASP — Cross-Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- 🎬 **Video**: [Cache Invalidation — Hussein Nasser](https://www.youtube.com/watch?v=U3RkDLtS7uY)

**234. Offline-First Architecture**

- 📖 **Official Docs**: [web.dev — Offline Cookbook](https://web.dev/articles/offline-cookbook)
- 🔬 **Deep Dive**: [Blog — Offline-First Architecture — LogRocket](https://blog.logrocket.com/building-offline-first-app/)
- 🎯 **Interview Prep**: [OWASP — Cross-Site Request Forgery (CSRF)](https://owasp.org/www-community/attacks/csrf)
- 🎬 **Video**: [Offline-First Apps — Google Chrome Developers](https://www.youtube.com/watch?v=cmGr0RszHc8)

**235. Handling Stale Data**

- 📖 **Official Docs**: [web.dev — Stale-While-Revalidate](https://web.dev/articles/stale-while-revalidate)
- 🔬 **Deep Dive**: [Blog — Handling Stale Data — TkDodo](https://tkdodo.eu/blog/practical-react-query)
- 🎯 **Interview Prep**: [GeeksForGeeks — Clickjacking Attack](https://www.geeksforgeeks.org/clickjacking-ui-redressing/)
- 🎬 **Video**: [SWR Strategy — Hussein Nasser](https://www.youtube.com/watch?v=U3RkDLtS7uY)

**236. Cache-Control by Page Type**

- 📖 **Official Docs**: [MDN — Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- 🔬 **Deep Dive**: [web.dev — HTTP Cache Headers](https://web.dev/articles/http-cache)
- 🎯 **Interview Prep**: [GeeksForGeeks — Content Security Policy (CSP)](https://www.geeksforgeeks.org/content-security-policy-csp/)
- 🎬 **Video**: [Cache-Control Headers — Hussein Nasser](https://www.youtube.com/watch?v=HiBDZgTNpXY)

**237. Stale-While-Revalidate**

- 📖 **Official Docs**: [web.dev — Stale-While-Revalidate](https://web.dev/articles/stale-while-revalidate)
- 🔬 **Deep Dive**: [MDN — stale-while-revalidate](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate)
- 🎯 **Interview Prep**: [GeeksForGeeks — CORS Explained](https://www.geeksforgeeks.org/cross-origin-resource-sharing-cors/)
- 🎬 **Video**: [Stale While Revalidate — Hussein Nasser](https://www.youtube.com/watch?v=U3RkDLtS7uY)

**238. Cache Poisoning Awareness**

- 📖 **Official Docs**: [OWASP — Cache Poisoning](https://owasp.org/www-community/attacks/Cache_Poisoning)
- 🔬 **Deep Dive**: [Blog — Cache Poisoning — PortSwigger](https://portswigger.net/web-security/web-cache-poisoning)
- 🎯 **Interview Prep**: [PortSwigger — Subresource Integrity](https://portswigger.net/web-security/subresource-integrity)
- 🎬 **Video**: [Cache Poisoning — PwnFunction](https://www.youtube.com/watch?v=iWd0sLj-_uI)

**239. Background Sync API ★ ★**

- 📖 **Official Docs**: [MDN — Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- 🔬 **Deep Dive**: [web.dev — Background Sync](https://web.dev/articles/background-sync)
- 🎯 **Interview Prep**: [GeeksForGeeks — HTTPS and TLS](https://www.geeksforgeeks.org/difference-between-http-and-https/)
- 🎬 **Video**: [Background Sync — Google Chrome Developers](https://www.youtube.com/watch?v=l4e_LFozK2k)

### SEQUENCE 1️⃣3️⃣ — Security

> Your 80% vulnerability reduction story directly answers most of this.

#### 🔐 Module 13.1: Web Threats

**240. XSS — Types, Prevention, Real Examples**

- 📖 **Official Docs**: [MDN — Cross-Site Scripting (XSS)](https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting)
- 🔬 **Deep Dive**: [OWASP — XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- 🎯 **Interview Prep**: [OWASP — Input Validation Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- 🎬 **Video**: [XSS Explained — PwnFunction](https://www.youtube.com/watch?v=EoaDgUgS6QA)

**241. CSRF — SameSite Cookies, CSRF Tokens**

- 📖 **Official Docs**: [MDN — CSRF](https://developer.mozilla.org/en-US/docs/Glossary/CSRF)
- 🔬 **Deep Dive**: [OWASP — CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- 🎯 **Interview Prep**: [GeeksForGeeks — XSS vs CSRF](https://www.geeksforgeeks.org/difference-between-xss-and-csrf/)
- 🎬 **Video**: [CSRF Explained — PwnFunction](https://www.youtube.com/watch?v=eWEgUcHPle0)

**242. CORS — Preflight, Credentialed Requests**

- 📖 **Official Docs**: [MDN — CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- 🔬 **Deep Dive**: [web.dev — Cross-Origin Resource Sharing](https://web.dev/articles/cross-origin-resource-sharing)
- 🎯 **Interview Prep**: [GeeksForGeeks — Supply Chain Attacks](https://www.geeksforgeeks.org/npm-security-best-practices/)
- 🎬 **Video**: [CORS in 100 Seconds — Fireship](https://www.youtube.com/watch?v=4KHiSt0oLJ0)

**243. Prototype Pollution ★ ★**

- 📖 **Official Docs**: [MDN — Prototype Pollution](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
- 🔬 **Deep Dive**: [Blog — Prototype Pollution — Snyk](https://snyk.io/blog/after-three-years-of-silence-prototype-pollution-still-a-menace/)
- 🎯 **Interview Prep**: [PortSwigger — DOM-based XSS](https://portswigger.net/web-security/cross-site-scripting/dom-based)
- 🎬 **Video**: [Prototype Pollution — PwnFunction](https://www.youtube.com/watch?v=LUsiFV3dsK8)

**244. Supply Chain Attacks — npm package security ★ ★**

- 📖 **Official Docs**: [npm — Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- 🔬 **Deep Dive**: [Blog — Supply Chain Attacks — Snyk](https://snyk.io/blog/npm-supply-chain-security/)
- 🎯 **Interview Prep**: [PortSwigger — Server-Side Request Forgery](https://portswigger.net/web-security/ssrf)
- 🎬 **Video**: [Supply Chain Attacks — Fireship](https://www.youtube.com/watch?v=GRH-5LBTEw4)

#### 🔑 Module 13.2: Auth & Tokens

**245. Authentication Flows**

- 📖 **Official Docs**: [MDN — HTTP Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication)
- 🔬 **Deep Dive**: [Auth0 — Authentication Guide](https://auth0.com/docs/get-started/authentication-and-authorization)
- 🎯 **Interview Prep**: [OWASP — Security Headers Guide](https://owasp.org/www-project-secure-headers/)
- 🎬 **Video**: [Authentication Explained — Fireship](https://www.youtube.com/watch?v=Mcyt_CBR_GY)

**246. Token Storage — localStorage vs httpOnly cookie trade-offs**

- 📖 **Official Docs**: [OWASP — Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- 🔬 **Deep Dive**: [Blog — Token Storage Best Practices — Auth0](https://auth0.com/docs/secure/security-guidance/data-security/token-storage)
- 🎯 **Interview Prep**: [PortSwigger — Web Cache Poisoning](https://portswigger.net/web-security/web-cache-poisoning)
- 🎬 **Video**: [Token Storage — Fireship](https://www.youtube.com/watch?v=GhrvZ5nUWNg)

**247. OAuth 2.0 & OIDC Flows**

- 📖 **Official Docs**: [OAuth 2.0 — RFC 6749](https://oauth.net/2/)
- 🔬 **Deep Dive**: [Auth0 — OAuth 2.0 & OIDC Guide](https://auth0.com/docs/authenticate/protocols/openid-connect-protocol)
- 🎯 **Interview Prep**: [PortSwigger — Prototype Pollution](https://portswigger.net/web-security/prototype-pollution)
- 🎬 **Video**: [OAuth 2.0 Explained — Fireship](https://www.youtube.com/watch?v=996OiexHze0)

**248. JWT Deep Dive — claims, expiry, refresh strategy ★ ★**

- 📖 **Official Docs**: [MDN — JWT](https://developer.mozilla.org/en-US/docs/Glossary/JWT)
- 🔬 **Deep Dive**: [Blog — JWT Deep Dive — Auth0](https://auth0.com/learn/json-web-tokens)
- 🎯 **Interview Prep**: [GeeksForGeeks — JWT Authentication](https://www.geeksforgeeks.org/json-web-token-jwt/)
- 🎬 **Video**: [JWT Explained — Fireship](https://www.youtube.com/watch?v=7Q17ubqLfaM)

**249. Passkeys & WebAuthn ★ ★**

- 📖 **Official Docs**: [MDN — Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- 🔬 **Deep Dive**: [web.dev — Passkeys](https://web.dev/articles/passkey-registration)
- 🎯 **Interview Prep**: [GeeksForGeeks — OAuth 2.0 Explained](https://www.geeksforgeeks.org/oauth-2-0/)
- 🎬 **Video**: [Passkeys Explained — Fireship](https://www.youtube.com/watch?v=qNpBYbMetms)

#### 🛡️ Module 13.3: Hardening UI

**250. Protecting Sensitive UI Data**

- 📖 **Official Docs**: [OWASP — Sensitive Data Exposure](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/)
- 🔬 **Deep Dive**: [Blog — Protecting Sensitive UI Data — LogRocket](https://blog.logrocket.com/secure-react-app/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Session vs Token Auth](https://www.geeksforgeeks.org/session-based-authentication-vs-token-based-authentication/)
- 🎬 **Video**: [Frontend Security — Hitesh Choudhary](https://www.youtube.com/watch?v=3deNI25K4cY)

**251. Secure API Consumption**

- 📖 **Official Docs**: [OWASP — API Security](https://owasp.org/www-project-api-security/)
- 🔬 **Deep Dive**: [Blog — Secure API Consumption — LogRocket](https://blog.logrocket.com/secure-react-app/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Role-Based Access Control](https://www.geeksforgeeks.org/role-based-access-control/)
- 🎬 **Video**: [Secure API Calls — Fireship](https://www.youtube.com/watch?v=GhrvZ5nUWNg)

**252. Clickjacking — X-Frame-Options, frame-ancestors**

- 📖 **Official Docs**: [MDN — X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- 🔬 **Deep Dive**: [OWASP — Clickjacking](https://owasp.org/www-community/attacks/Clickjacking)
- 🎯 **Interview Prep**: [GeeksForGeeks — Cookie Security (SameSite)](https://www.geeksforgeeks.org/http-cookies/)
- 🎬 **Video**: [Clickjacking Explained — PwnFunction](https://www.youtube.com/watch?v=jcp5t8PsMsY)

**253. CSP — Policy Design, Nonce-Based, Report-Only Mode**

- 📖 **Official Docs**: [MDN — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- 🔬 **Deep Dive**: [web.dev — CSP Guide](https://web.dev/articles/csp)
- 🎯 **Interview Prep**: [GeeksForGeeks — Multi-Factor Authentication](https://www.geeksforgeeks.org/multi-factor-authentication/)
- 🎬 **Video**: [CSP Explained — PwnFunction](https://www.youtube.com/watch?v=txHc4zk6w3s)

**254. Secure Headers — Full Header Audit**

- 📖 **Official Docs**: [MDN — HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- 🔬 **Deep Dive**: [OWASP — Secure Headers](https://owasp.org/www-project-secure-headers/)
- 🎯 **Interview Prep**: [OWASP — Session Management Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- 🎬 **Video**: [Security Headers — Hussein Nasser](https://www.youtube.com/watch?v=Mhonrfh5O2A)

**255. Token Refresh — Silent Refresh Pattern**

- 📖 **Official Docs**: [Auth0 — Silent Authentication](https://auth0.com/docs/authenticate/login/configure-silent-authentication)
- 🔬 **Deep Dive**: [Blog — Token Refresh Patterns — LogRocket](https://blog.logrocket.com/jwt-authentication-best-practices/)
- 🎯 **Interview Prep**: [GeeksForGeeks — PKCE Flow for SPAs](https://www.geeksforgeeks.org/oauth-2-0-authorization-code-flow-with-pkce/)
- 🎬 **Video**: [Silent Refresh — Fireship](https://www.youtube.com/watch?v=GhrvZ5nUWNg)

**256. Preventing Data Leaks in Browser DevTools ★ ★**

- 📖 **Official Docs**: [Chrome DevTools — Security](https://developer.chrome.com/docs/devtools/security)
- 🔬 **Deep Dive**: [Blog — Preventing DevTools Data Leaks — LogRocket](https://blog.logrocket.com/secure-react-app/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Feature-Level Permissions](https://www.geeksforgeeks.org/attribute-based-access-control/)
- 🎬 **Video**: [DevTools Security — Google Chrome Developers](https://www.youtube.com/watch?v=YjMFjXiWsps)

**257. Subresource Integrity (SRI) ★ ★**

- 📖 **Official Docs**: [MDN — Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- 🔬 **Deep Dive**: [web.dev — SRI](https://web.dev/articles/csp#use_case_4_subresource_integrity)
- 🎯 **Interview Prep**: [GeeksForGeeks — Secure Token Storage](https://www.geeksforgeeks.org/how-to-securely-store-jwt-tokens/)
- 🎬 **Video**: [SRI Explained — Hussein Nasser](https://www.youtube.com/watch?v=Mhonrfh5O2A)

### SEQUENCE 1️⃣4️⃣ — Authorization & Access Control

> Builds on Security. Salesforce and Cisco-specific depth.

#### 🧠 Module 14.1: Foundations

**258. Authentication vs Authorization**

- 📖 **Official Docs**: [Auth0 — AuthN vs AuthZ](https://auth0.com/docs/get-started/authentication-and-authorization)
- 🔬 **Deep Dive**: [Blog — AuthN vs AuthZ — Okta](https://www.okta.com/identity-101/authentication-vs-authorization/)
- 🎯 **Interview Prep**: [OWASP — Authentication Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- 🎬 **Video**: [AuthN vs AuthZ — Fireship](https://www.youtube.com/watch?v=996OiexHze0)

**259. Permission Modeling**

- 📖 **Official Docs**: [Auth0 — Authorization](https://auth0.com/docs/manage-users/access-control)
- 🔬 **Deep Dive**: [Blog — Permission Modeling — Okta](https://www.okta.com/identity-101/role-based-access-control-vs-attribute-based-access-control/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Refresh Token Rotation](https://www.geeksforgeeks.org/how-to-implement-refresh-tokens/)
- 🎬 **Video**: [Permission Systems — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**260. Backend vs Frontend Enforcement**

- 📖 **Official Docs**: [OWASP — Access Control](https://owasp.org/www-community/Access_Control)
- 🔬 **Deep Dive**: [Blog — Frontend vs Backend Auth — LogRocket](https://blog.logrocket.com/secure-react-app/)
- 🎯 **Interview Prep**: [GeeksForGeeks — ABAC vs RBAC](https://www.geeksforgeeks.org/difference-between-rbac-and-abac/)
- 🎬 **Video**: [Frontend vs Backend Enforcement — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY)

#### 🗂️ Module 14.2: Access Control Models

**261. Role-Based Access Control (RBAC)**

- 📖 **Official Docs**: [Auth0 — RBAC](https://auth0.com/docs/manage-users/access-control/rbac)
- 🔬 **Deep Dive**: [Blog — RBAC Guide — Okta](https://www.okta.com/identity-101/role-based-access-control-vs-attribute-based-access-control/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Zero Trust Security Model](https://www.geeksforgeeks.org/zero-trust-security-model/)
- 🎬 **Video**: [RBAC Explained — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**262. Attribute-Based Access Control (ABAC)**

- 📖 **Official Docs**: [Auth0 — ABAC](https://auth0.com/docs/manage-users/access-control)
- 🔬 **Deep Dive**: [Blog — ABAC vs RBAC — Okta](https://www.okta.com/identity-101/role-based-access-control-vs-attribute-based-access-control/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Auth in Micro-Frontends](https://www.geeksforgeeks.org/micro-frontend-architecture/)
- 🎬 **Video**: [ABAC Explained — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**263. Policy-Based Authorization**

- 📖 **Official Docs**: [Auth0 — Authorization Policies](https://auth0.com/docs/manage-users/access-control)
- 🔬 **Deep Dive**: [Blog — Policy-Based Authorization — LogRocket](https://blog.logrocket.com/secure-react-app/)
- 🎯 **Interview Prep**: [GeeksForGeeks — WebSocket in JavaScript](https://www.geeksforgeeks.org/web-socket-in-javascript/)
- 🎬 **Video**: [Policy-Based Auth — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY)

#### 🛡️ Module 14.3: Frontend Authorization Design

**264. Frontend Authorization Guards**

- 📖 **Official Docs**: [Angular — Route Guards](https://angular.dev/guide/routing/route-guards)
- 🔬 **Deep Dive**: [Blog — Frontend Auth Guards — LogRocket](https://blog.logrocket.com/complete-guide-authentication-with-react-router-v6/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Server-Sent Events (SSE)](https://www.geeksforgeeks.org/server-sent-events/)
- 🎬 **Video**: [Route Guards — Codevolution](https://www.youtube.com/watch?v=tiV-kpJ4jMY)

**265. Feature-Level Access Control**

- 📖 **Official Docs**: [Blog — Feature Flags — Martin Fowler](https://martinfowler.com/articles/feature-toggles.html)
- 🔬 **Deep Dive**: [Blog — Feature-Level Access Control — LogRocket](https://blog.logrocket.com/secure-react-app/)
- 🎯 **Interview Prep**: [GeeksForGeeks — WebSocket vs SSE vs Polling](https://www.geeksforgeeks.org/what-is-web-socket-and-how-it-is-different-from-the-http/)
- 🎬 **Video**: [Feature Flags — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs)

**266. Data-Level Security**

- 📖 **Official Docs**: [OWASP — Access Control](https://owasp.org/www-community/Access_Control)
- 🔬 **Deep Dive**: [Blog — Data-Level Security — LogRocket](https://blog.logrocket.com/secure-react-app/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Long Polling](https://www.geeksforgeeks.org/what-is-long-polling/)
- 🎬 **Video**: [Data-Level Security — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**267. Route Guards — Angular & React Router ★ ★**

- 📖 **Official Docs**: [Angular — Route Guards](https://angular.dev/guide/routing/route-guards)
- 🔬 **Deep Dive**: [React Router — Auth Guide](https://reactrouter.com/en/main/start/concepts)
- 🎯 **Interview Prep**: [GeeksForGeeks — WebRTC](https://www.geeksforgeeks.org/webrtc/)
- 🎬 **Video**: [React Route Guards — Codevolution](https://www.youtube.com/watch?v=tiV-kpJ4jMY)

#### 🏢 Module 14.4: Enterprise & Multi-Tenant Design

**268. Multi-Tenant Authorization**

- 📖 **Official Docs**: [Blog — Multi-Tenant Architecture — AWS](https://aws.amazon.com/solutions/multi-tenant-saas/)
- 🔬 **Deep Dive**: [Blog — Multi-Tenant Auth — LogRocket](https://blog.logrocket.com/secure-react-app/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Socket.io](https://www.geeksforgeeks.org/introduction-to-socket-io/)
- 🎬 **Video**: [Multi-Tenancy — Hussein Nasser](https://www.youtube.com/watch?v=x8vtmX4vF9I)

**269. Privilege Escalation Prevention**

- 📖 **Official Docs**: [OWASP — Privilege Escalation](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/)
- 🔬 **Deep Dive**: [Blog — Privilege Escalation Prevention — OWASP](https://owasp.org/www-community/attacks/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Operational Transform (OT)](https://www.geeksforgeeks.org/operational-transformation-in-collaborative-editing/)
- 🎬 **Video**: [Privilege Escalation — PwnFunction](https://www.youtube.com/watch?v=dz7Ntp7KEIA)

**270. Salesforce Permission Sets — LWC Context ★ ★**

- 📖 **Official Docs**: [Salesforce — Permission Sets](https://developer.salesforce.com/docs/atlas.en-us.securityImplGuide.meta/securityImplGuide/perm_sets_overview.htm)
- 🔬 **Deep Dive**: [Salesforce — LWC Security](https://developer.salesforce.com/docs/platform/lwc/guide/security.html)
- 🎯 **Interview Prep**: [GeeksForGeeks — CRDT Data Structures](https://www.geeksforgeeks.org/conflict-free-replicated-data-types/)
- 🎬 **Video**: [Salesforce Permissions — Salesforce Developers](https://www.youtube.com/watch?v=gFt0pGb0fIY)

#### ⚡ Module 14.5: Scale & Performance

**271. Authorization Caching**

- 📖 **Official Docs**: [Blog — Caching Authorization — Auth0](https://auth0.com/docs/manage-users/access-control)
- 🔬 **Deep Dive**: [Blog — Auth Caching Strategies — LogRocket](https://blog.logrocket.com/secure-react-app/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Presence & Cursors UX](https://www.geeksforgeeks.org/webrtc/)
- 🎬 **Video**: [Auth Caching — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**272. Authorization at Scale**

- 📖 **Official Docs**: [Blog — Authorization at Scale — Google](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)
- 🔬 **Deep Dive**: [Blog — Zanzibar Paper — Google Research](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Real-Time Notifications](https://www.geeksforgeeks.org/how-to-implement-push-notifications/)
- 🎬 **Video**: [Google Zanzibar — Hussein Nasser](https://www.youtube.com/watch?v=1nbSbe3XRQA)

#### 📋 Module 14.6: Governance & Monitoring

**273. Auditing & Logging**

- 📖 **Official Docs**: [OWASP — Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- 🔬 **Deep Dive**: [Blog — Frontend Audit Logging — LogRocket](https://blog.logrocket.com/frontend-logging/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Event-Driven Architecture](https://www.geeksforgeeks.org/event-driven-architecture/)
- 🎬 **Video**: [Audit Logging — Hussein Nasser](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**274. Compliance Logging for Regulated Industries (GDPR, SOC2) ★ ★**

- 📖 **Official Docs**: [GDPR — Official Site](https://gdpr.eu/)
- 🔬 **Deep Dive**: [Blog — GDPR Compliance in Frontend — LogRocket](https://blog.logrocket.com/gdpr-compliance-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Horizontal vs Vertical Scaling](https://www.geeksforgeeks.org/horizontal-and-vertical-scaling/)
- 🎬 **Video**: [GDPR for Developers — Fireship](https://www.youtube.com/watch?v=Bs0IH_SdecE)

---

## 🌐 PHASE 6 — SCALABILITY & REAL-TIME

*Week 8 | Enterprise-scale thinking. Cisco real-time + Salesforce scale.*

### SEQUENCE 1️⃣5️⃣ — Real-Time Systems

> Your Bosch WebSocket story lives here. Most candidates have zero real experience here.

#### 🔁 Module 15.1: Transport Mechanisms

**275. Polling vs Long Polling**

- 📖 **Official Docs**: [MDN — Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- 🔬 **Deep Dive**: [Blog — Polling vs WebSockets — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/)
- 🎯 **Interview Prep**: [patterns.dev — Micro-Frontends Architecture](https://www.patterns.dev/vanilla/micro-frontends)
- 🎬 **Video**: [Polling vs SSE vs WebSocket — Hussein Nasser](https://www.youtube.com/watch?v=ZBM28ZPlin8)

**276. WebSockets**

- 📖 **Official Docs**: [MDN — WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- 🔬 **Deep Dive**: [Blog — WebSocket Deep Dive — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Monorepo Tools (Nx, Turborepo)](https://www.geeksforgeeks.org/what-is-monorepo/)
- 🎬 **Video**: [WebSockets in 100 Seconds — Fireship](https://www.youtube.com/watch?v=1BfCnjr_Vjg)

**277. Server-Sent Events**

- 📖 **Official Docs**: [MDN — Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- 🔬 **Deep Dive**: [Blog — SSE Guide — LogRocket](https://blog.logrocket.com/using-server-sent-events-node-js/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Tokens](https://www.geeksforgeeks.org/design-system-in-frontend/)
- 🎬 **Video**: [Server-Sent Events — Hussein Nasser](https://www.youtube.com/watch?v=4HlNv1qpZFY)

**278. WebTransport API — Next-gen real-time ★ ★**

- 📖 **Official Docs**: [MDN — WebTransport API](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API)
- 🔬 **Deep Dive**: [web.dev — WebTransport](https://web.dev/articles/webtransport)
- 🎯 **Interview Prep**: [GeeksForGeeks — Multi-Tenant Architecture](https://www.geeksforgeeks.org/multi-tenant-architecture/)
- 🎬 **Video**: [WebTransport — Hussein Nasser](https://www.youtube.com/watch?v=vGZfF5jk1Lo)

#### ⚡ Module 15.2: Real-Time UI

**279. Real-Time UI Updates**

- 📖 **Official Docs**: [MDN — WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- 🔬 **Deep Dive**: [Blog — Real-Time UI Updates — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — i18n and l10n](https://www.geeksforgeeks.org/internationalization-and-localization-in-react/)
- 🎬 **Video**: [Real-Time UI — Jack Herrington](https://www.youtube.com/watch?v=4hKXkRs4cUc)

**280. Reconnection & Backoff**

- 📖 **Official Docs**: [Blog — Exponential Backoff — AWS](https://docs.aws.amazon.com/general/latest/gr/api-retries.html)
- 🔬 **Deep Dive**: [Blog — WebSocket Reconnection — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Theming and White-Labeling](https://www.geeksforgeeks.org/how-to-create-dynamic-theme-in-react/)
- 🎬 **Video**: [Exponential Backoff — Hussein Nasser](https://www.youtube.com/watch?v=MCGFV7ahkeA)

**281. Handling Partial Failures**

- 📖 **Official Docs**: [Blog — Partial Failures — AWS](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/distributed-systems-complexity.html)
- 🔬 **Deep Dive**: [Blog — Handling Failures — LogRocket](https://blog.logrocket.com/error-handling-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Performance Budgets](https://www.geeksforgeeks.org/performance-budgets-in-web-development/)
- 🎬 **Video**: [Partial Failures — Hussein Nasser](https://www.youtube.com/watch?v=ADHcBxEXvCo)

**282. Optimistic Updates with Rollback ★ ★**

- 📖 **Official Docs**: [React Docs — Updating Objects in State](https://react.dev/learn/updating-objects-in-state)
- 🔬 **Deep Dive**: [Blog — Optimistic Updates with Rollback — LogRocket](https://blog.logrocket.com/optimistic-ui-updates-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — A/B Testing](https://www.geeksforgeeks.org/what-is-a-b-testing/)
- 🎬 **Video**: [Optimistic UI — Jack Herrington](https://www.youtube.com/watch?v=M3mGY0pgFk0)

**283. Presence Indicators & Typing Indicators ★ ★**

- 📖 **Official Docs**: [Blog — Building Presence — Ably](https://ably.com/blog/scalable-presence)
- 🔬 **Deep Dive**: [Blog — Typing Indicators — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Feature Flags at Scale](https://www.geeksforgeeks.org/feature-flag-in-software-engineering/)
- 🎬 **Video**: [Building Presence — Fireship](https://www.youtube.com/watch?v=1BfCnjr_Vjg)

#### 🧠 Module 15.3: Consistency

**284. Message Ordering**

- 📖 **Official Docs**: [Blog — Message Ordering — Ably](https://ably.com/topic/message-ordering)
- 🔬 **Deep Dive**: [Blog — Distributed Message Order — Martin Kleppmann](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/)
- 🎯 **Interview Prep**: [GeeksForGeeks — CDN Multi-Region Strategy](https://www.geeksforgeeks.org/content-delivery-network-cdn-in-system-design/)
- 🎬 **Video**: [Message Ordering — Hussein Nasser](https://www.youtube.com/watch?v=szKjz_qbcvA)

**285. Event De-duplication**

- 📖 **Official Docs**: [Blog — Event Deduplication — AWS](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/distributed-systems-complexity.html)
- 🔬 **Deep Dive**: [Blog — Deduplication Strategies — LogRocket](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Load Balancing](https://www.geeksforgeeks.org/load-balancing-in-system-design/)
- 🎬 **Video**: [Event Deduplication — Hussein Nasser](https://www.youtube.com/watch?v=szKjz_qbcvA)

**286. Idempotency in Frontend Events**

- 📖 **Official Docs**: [Blog — Idempotency — Stripe](https://stripe.com/docs/api/idempotent_requests)
- 🔬 **Deep Dive**: [Blog — Idempotency in APIs — LogRocket](https://blog.logrocket.com/api-versioning-best-practices/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Edge-First Architecture](https://www.geeksforgeeks.org/what-is-edge-computing/)
- 🎬 **Video**: [Idempotency — Hussein Nasser](https://www.youtube.com/watch?v=4OuaONkZw1I)

**287. Conflict Resolution in Collaborative UIs ★ ★**

- 📖 **Official Docs**: [Blog — CRDTs — Martin Kleppmann](https://crdt.tech/)
- 🔬 **Deep Dive**: [Blog — Conflict Resolution in Collaborative Apps — Figma](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Database Sharding](https://www.geeksforgeeks.org/database-sharding-a-system-design-concept/)
- 🎬 **Video**: [CRDTs Explained — Fireship](https://www.youtube.com/watch?v=M8-WFTjZoA0)

### SEQUENCE 1️⃣6️⃣ — Scalability & Growth

> Big-scale thinking. Salesforce and Microsoft especially.

#### 📈 Module 16.1: Scaling Patterns

**288. Designing for Millions**

- 📖 **Official Docs**: [web.dev — Performance for Millions](https://web.dev/performance)
- 🔬 **Deep Dive**: [Blog — Designing for Scale — Netflix Tech Blog](https://netflixtechblog.com/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Auto-Scaling Strategies](https://www.geeksforgeeks.org/auto-scaling-in-cloud-computing/)
- 🎬 **Video**: [Designing for Scale — Fireship](https://www.youtube.com/watch?v=lkIFF4maKMU)

**289. CDN-First Architecture**

- 📖 **Official Docs**: [Cloudflare — CDN Architecture](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
- 🔬 **Deep Dive**: [Blog — CDN-First Architecture — Vercel](https://vercel.com/docs/edge-network/overview)
- 🎯 **Interview Prep**: [GeeksForGeeks — Distributed Caching](https://www.geeksforgeeks.org/distributed-caching-in-system-design/)
- 🎬 **Video**: [CDN Architecture — Hussein Nasser](https://www.youtube.com/watch?v=RI9np1LWzqw)

**290. Frontend Load Shedding**

- 📖 **Official Docs**: [Blog — Load Shedding — Netflix](https://netflixtechblog.com/performance-under-load-3e6fa9a60581)
- 🔬 **Deep Dive**: [Blog — Frontend Load Shedding — LogRocket](https://blog.logrocket.com/progressive-enhancement-vs-graceful-degradation/)
- 🎯 **Interview Prep**: [GeeksForGeeks — API Gateway Pattern](https://www.geeksforgeeks.org/api-gateway-system-design/)
- 🎬 **Video**: [Load Shedding — Hussein Nasser](https://www.youtube.com/watch?v=mhUQe4BKZXs)

**291. Rate Limiting at the UI Layer ★ ★**

- 📖 **Official Docs**: [Blog — Rate Limiting — Cloudflare](https://www.cloudflare.com/learning/bots/what-is-rate-limiting/)
- 🔬 **Deep Dive**: [Blog — Client-Side Rate Limiting — LogRocket](https://blog.logrocket.com/rate-limiting-node-js/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Event Sourcing](https://www.geeksforgeeks.org/event-sourcing-pattern/)
- 🎬 **Video**: [Rate Limiting — Hussein Nasser](https://www.youtube.com/watch?v=mhUQe4BKZXs)

#### 🧪 Module 16.2: Experimentation

**292. Feature Flags**

- 📖 **Official Docs**: [Blog — Feature Toggles — Martin Fowler](https://martinfowler.com/articles/feature-toggles.html)
- 🔬 **Deep Dive**: [Blog — Feature Flags Guide — LaunchDarkly](https://launchdarkly.com/blog/what-are-feature-flags/)
- 🎯 **Interview Prep**: [web.dev — Accessibility Overview](https://web.dev/articles/accessibility)
- 🎬 **Video**: [Feature Flags — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs)

**293. A/B Testing**

- 📖 **Official Docs**: [Blog — A/B Testing — Google](https://developers.google.com/analytics/devguides/collection/ga4/experiment)
- 🔬 **Deep Dive**: [Blog — A/B Testing Guide — LogRocket](https://blog.logrocket.com/a-b-testing-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — ARIA Roles and Attributes](https://www.geeksforgeeks.org/what-is-aria-in-html/)
- 🎬 **Video**: [A/B Testing — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs)

**294. Canary Releases & Frontend Rollout Strategy ★ ★**

- 📖 **Official Docs**: [Blog — Canary Releases — Martin Fowler](https://martinfowler.com/bliki/CanaryRelease.html)
- 🔬 **Deep Dive**: [Blog — Frontend Rollout Strategy — LaunchDarkly](https://launchdarkly.com/blog/what-are-feature-flags/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Semantic HTML](https://www.geeksforgeeks.org/semantic-html/)
- 🎬 **Video**: [Canary Releases — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs)

#### 🌍 Module 16.3: Globalization

**295. Internationalization (i18n)**

- 📖 **Official Docs**: [MDN — Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- 🔬 **Deep Dive**: [Blog — i18n in React — LogRocket](https://blog.logrocket.com/react-i18n-tutorial/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Keyboard Navigation](https://www.geeksforgeeks.org/what-is-keyboard-accessibility/)
- 🎬 **Video**: [i18n in React — Codevolution](https://www.youtube.com/watch?v=txiggf6TDpo)

**296. Theming & White-Labeling**

- 📖 **Official Docs**: [MDN — CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- 🔬 **Deep Dive**: [Blog — Theming with CSS Variables — LogRocket](https://blog.logrocket.com/a-guide-to-theming-in-css/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Color Contrast & WCAG](https://www.geeksforgeeks.org/web-content-accessibility-guidelines-wcag/)
- 🎬 **Video**: [CSS Theming — Kevin Powell](https://www.youtube.com/watch?v=GtB8DLsg94k)

**297. Multi-Tenant UI**

- 📖 **Official Docs**: [Blog — Multi-Tenant UI — AWS](https://aws.amazon.com/solutions/multi-tenant-saas/)
- 🔬 **Deep Dive**: [Blog — Multi-Tenant Frontend — LogRocket](https://blog.logrocket.com/progressive-enhancement-vs-graceful-degradation/)
- 🎯 **Interview Prep**: [web.dev — Focus Management](https://web.dev/articles/focus)
- 🎬 **Video**: [Multi-Tenant UI — Hussein Nasser](https://www.youtube.com/watch?v=x8vtmX4vF9I)

**298. RTL (Right-to-Left) Layout Support ★ ★**

- 📖 **Official Docs**: [MDN — CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
- 🔬 **Deep Dive**: [Blog — RTL Support — LogRocket](https://blog.logrocket.com/building-multilingual-rtl-ltr-website/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Screen Reader Testing](https://www.geeksforgeeks.org/what-is-a-screen-reader/)
- 🎬 **Video**: [RTL in CSS — Kevin Powell](https://www.youtube.com/watch?v=dZ9vQYSNVyo)

**299. Locale-Aware Formatting — dates, numbers, currency ★ ★**

- 📖 **Official Docs**: [MDN — Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- 🔬 **Deep Dive**: [Blog — Locale-Aware Formatting — LogRocket](https://blog.logrocket.com/react-i18n-tutorial/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Accessible Forms](https://www.geeksforgeeks.org/html-accessible-forms/)
- 🎬 **Video**: [Intl API Deep Dive — Fireship](https://www.youtube.com/watch?v=txiggf6TDpo)

#### 🌐 Module 16.4: Edge & Resilience

**300. Edge Rendering**

- 📖 **Official Docs**: [Vercel — Edge Functions](https://vercel.com/docs/functions/edge-functions)
- 🔬 **Deep Dive**: [Blog — Edge Rendering — Vercel](https://vercel.com/docs/edge-network/overview)
- 🎯 **Interview Prep**: [web.dev — Accessible Routing in SPAs](https://web.dev/articles/accessibility)
- 🎬 **Video**: [Edge Computing — Fireship](https://www.youtube.com/watch?v=yOP5-3_WFus)

**301. Geo-Based Delivery**

- 📖 **Official Docs**: [Cloudflare — Geo-Based Routing](https://www.cloudflare.com/learning/cdn/glossary/anycast-network/)
- 🔬 **Deep Dive**: [Blog — Geo-Based Delivery — Vercel](https://vercel.com/docs/edge-network/regions)
- 🎯 **Interview Prep**: [GeeksForGeeks — axe-core & a11y Testing](https://www.geeksforgeeks.org/how-to-test-accessibility-of-a-website/)
- 🎬 **Video**: [Geo-Based Routing — Hussein Nasser](https://www.youtube.com/watch?v=RI9np1LWzqw)

**302. Regional Failures**

- 📖 **Official Docs**: [Blog — Regional Failure Handling — Netflix](https://netflixtechblog.com/)
- 🔬 **Deep Dive**: [Blog — Frontend Resilience — LogRocket](https://blog.logrocket.com/progressive-enhancement-vs-graceful-degradation/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Testing Pyramid](https://www.geeksforgeeks.org/testing-pyramid-in-software-testing/)
- 🎬 **Video**: [Regional Failover — Hussein Nasser](https://www.youtube.com/watch?v=ADHcBxEXvCo)

**303. Progressive Rollouts**

- 📖 **Official Docs**: [Blog — Progressive Rollouts — LaunchDarkly](https://launchdarkly.com/blog/what-are-feature-flags/)
- 🔬 **Deep Dive**: [Blog — Canary Releases — Martin Fowler](https://martinfowler.com/bliki/CanaryRelease.html)
- 🎯 **Interview Prep**: [GeeksForGeeks — Unit Testing with Jest](https://www.geeksforgeeks.org/jest-tutorial/)
- 🎬 **Video**: [Progressive Rollouts — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs)

---

## ♿ PHASE 7 — QUALITY & OBSERVABILITY

*Week 8 | Your WCAG AA story + production ownership mindset.*

### SEQUENCE 1️⃣7️⃣ — Accessibility & UX

> Your WCAG AA certification at SAP makes this a strength. Adobe specifically tests this.

#### ♿ Module 17.1: Accessibility Basics

**304. Web Accessibility — WCAG 2.1 vs WCAG 2.2**

- 📖 **Official Docs**: [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- 🔬 **Deep Dive**: [web.dev — Accessibility](https://web.dev/accessibility)
- 🎯 **Interview Prep**: [GeeksForGeeks — React Testing Library](https://www.geeksforgeeks.org/react-testing-library/)
- 🎬 **Video**: [Web Accessibility — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s)

**305. ARIA — Roles, Properties, States**

- 📖 **Official Docs**: [MDN — ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- 🔬 **Deep Dive**: [W3C — WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Component Testing](https://www.geeksforgeeks.org/react-testing-library/)
- 🎬 **Video**: [ARIA Explained — Google Chrome Developers](https://www.youtube.com/watch?v=g9Qff0b-lHk)

**306. Keyboard Navigation — Focus Management, Tab Order**

- 📖 **Official Docs**: [MDN — Keyboard Navigation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)
- 🔬 **Deep Dive**: [web.dev — Focus Management](https://web.dev/articles/focus)
- 🎯 **Interview Prep**: [GeeksForGeeks — Integration Testing](https://www.geeksforgeeks.org/integration-testing/)
- 🎬 **Video**: [Focus Management — Google Chrome Developers](https://www.youtube.com/watch?v=EFv9ubbZLKw)

**307. Screen Reader Testing — NVDA, VoiceOver, JAWS ★ ★**

- 📖 **Official Docs**: [MDN — Screen Reader Testing](https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Accessibility)
- 🔬 **Deep Dive**: [web.dev — Screen Reader Testing](https://web.dev/articles/semantics-and-screen-readers)
- 🎯 **Interview Prep**: [GeeksForGeeks — End-to-End Testing with Cypress](https://www.geeksforgeeks.org/cypress-tutorial/)
- 🎬 **Video**: [Screen Reader Testing — Google Chrome Developers](https://www.youtube.com/watch?v=Jao3s_CwdRU)

**308. Accessibility Tree — How Browsers Expose to Assistive Tech ★ ★**

- 📖 **Official Docs**: [Chrome — Accessibility Tree](https://developer.chrome.com/docs/devtools/accessibility/reference)
- 🔬 **Deep Dive**: [web.dev — The Accessibility Tree](https://web.dev/articles/the-accessibility-tree)
- 🎯 **Interview Prep**: [GeeksForGeeks — Playwright Testing](https://www.geeksforgeeks.org/playwright-tutorial/)
- 🎬 **Video**: [Accessibility Tree — Google Chrome Developers](https://www.youtube.com/watch?v=Th-nv-SCj4Q)

#### 🎨 Module 17.2: Inclusive Design

**309. Color Contrast — WCAG AA vs AAA ratios**

- 📖 **Official Docs**: [W3C — Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- 🔬 **Deep Dive**: [web.dev — Color and Contrast](https://web.dev/articles/color-and-contrast-accessibility)
- 🎯 **Interview Prep**: [GeeksForGeeks — Snapshot Testing](https://www.geeksforgeeks.org/snapshot-testing-in-jest/)
- 🎬 **Video**: [Color Contrast — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s)

**310. Responsive Design Systems**

- 📖 **Official Docs**: [web.dev — Responsive Web Design](https://web.dev/articles/responsive-web-design-basics)
- 🔬 **Deep Dive**: [MDN — Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- 🎯 **Interview Prep**: [GeeksForGeeks — Mocking API Calls (MSW)](https://www.geeksforgeeks.org/what-is-mock-service-worker-msw/)
- 🎬 **Video**: [Responsive Design — Kevin Powell](https://www.youtube.com/watch?v=srvUrASNj0s)

**311. Motion Sensitivity — prefers-reduced-motion ★ ★**

- 📖 **Official Docs**: [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- 🔬 **Deep Dive**: [web.dev — prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)
- 🎯 **Interview Prep**: [GeeksForGeeks — Visual Regression Testing](https://www.geeksforgeeks.org/visual-regression-testing/)
- 🎬 **Video**: [Reduced Motion — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s)

**312. Cognitive Accessibility — plain language, error prevention ★ ★**

- 📖 **Official Docs**: [W3C — Cognitive Accessibility](https://www.w3.org/WAI/cognitive/)
- 🔬 **Deep Dive**: [web.dev — Cognitive Accessibility](https://web.dev/accessibility)
- 🎯 **Interview Prep**: [Kent C. Dodds — Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)
- 🎬 **Video**: [Cognitive Accessibility — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s)

#### ⚖️ Module 17.3: UX Trade-offs

**313. UX vs Performance**

- 📖 **Official Docs**: [web.dev — UX and Performance](https://web.dev/articles/rail)
- 🔬 **Deep Dive**: [Blog — UX vs Performance Trade-offs — Smashing Magazine](https://www.smashingmagazine.com/2021/01/front-end-performance-2021-free-pdf-checklist/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Code Coverage](https://www.geeksforgeeks.org/code-coverage-testing-in-software-testing/)
- 🎬 **Video**: [RAIL Model — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc)

**314. Accessibility as Non-Functional Requirement**

- 📖 **Official Docs**: [W3C — Accessibility as NFR](https://www.w3.org/WAI/fundamentals/accessibility-intro/)
- 🔬 **Deep Dive**: [Blog — Accessibility as NFR — LogRocket](https://blog.logrocket.com/a11y-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — TDD in JavaScript](https://www.geeksforgeeks.org/test-driven-development-tdd/)
- 🎬 **Video**: [A11y as Requirement — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s)

**315. Performance Impact on Accessibility**

- 📖 **Official Docs**: [web.dev — Performance and Accessibility](https://web.dev/accessibility)
- 🔬 **Deep Dive**: [Blog — Performance Impact on A11y — Smashing Magazine](https://www.smashingmagazine.com/2021/01/front-end-performance-2021-free-pdf-checklist/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Performance Testing](https://www.geeksforgeeks.org/performance-testing-software-testing/)
- 🎬 **Video**: [A11y & Performance — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s)

**316. Accessibility Auditing Tools — axe, Lighthouse, Arc Toolkit ★ ★**

- 📖 **Official Docs**: [Deque — axe Tools](https://www.deque.com/axe/)
- 🔬 **Deep Dive**: [web.dev — Lighthouse Accessibility](https://web.dev/articles/lighthouse-accessibility)
- 🎯 **Interview Prep**: [Kent C. Dodds — Static vs Unit vs Integration vs E2E](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- 🎬 **Video**: [axe & Lighthouse A11y — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s)

### SEQUENCE 1️⃣8️⃣ — Testing Strategy ★

> Senior engineers own quality. Adobe and Microsoft ask about testing philosophy.

#### 🔺 Module 18.1: Testing Pyramid

**317. Unit vs Integration vs E2E — When to Use Which ★ ★**

- 📖 **Official Docs**: [Testing Library — Guiding Principles](https://testing-library.com/docs/guiding-principles)
- 🔬 **Deep Dive**: [Blog — Testing Trophy — Kent C. Dodds](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- 🎯 **Interview Prep**: [GeeksForGeeks — Frontend Logging Best Practices](https://www.geeksforgeeks.org/javascript-console-log/)
- 🎬 **Video**: [Testing Types — Fireship](https://www.youtube.com/watch?v=u6QfIXgjwGQ)

**318. Testing Pyramid vs Testing Trophy vs Testing Honeycomb ★ ★**

- 📖 **Official Docs**: [Blog — Testing Pyramid — Martin Fowler](https://martinfowler.com/articles/practical-test-pyramid.html)
- 🔬 **Deep Dive**: [Blog — Testing Trophy — Kent C. Dodds](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- 🎯 **Interview Prep**: [GeeksForGeeks — Error Monitoring (Sentry)](https://www.geeksforgeeks.org/what-is-sentry/)
- 🎬 **Video**: [Testing Pyramid — Fireship](https://www.youtube.com/watch?v=u6QfIXgjwGQ)

**319. Cost of Tests at Each Level ★ ★**

- 📖 **Official Docs**: [Blog — Cost of Tests — Martin Fowler](https://martinfowler.com/articles/practical-test-pyramid.html)
- 🔬 **Deep Dive**: [Blog — Testing ROI — Kent C. Dodds](https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests)
- 🎯 **Interview Prep**: [web.dev — Real User Monitoring (RUM)](https://web.dev/articles/vitals-measurement-getting-started)
- 🎬 **Video**: [Cost of Testing — Fireship](https://www.youtube.com/watch?v=u6QfIXgjwGQ)

#### ⚡ Module 18.2: Unit & Component Testing

**320. Jest — Setup, Mocking, Spying, Snapshot ★ ★**

- 📖 **Official Docs**: [Jest Docs](https://jestjs.io/docs/getting-started)
- 🔬 **Deep Dive**: [Blog — Jest Best Practices — LogRocket](https://blog.logrocket.com/jest-testing-top-features/)
- 🎯 **Interview Prep**: [web.dev — Performance Observer API](https://web.dev/articles/custom-metrics#performance-observer)
- 🎬 **Video**: [Jest Crash Course — Traversy Media](https://www.youtube.com/watch?v=7r4xVDI2vho)

**321. React Testing Library — render, screen, userEvent, async ★ ★**

- 📖 **Official Docs**: [Testing Library — React](https://testing-library.com/docs/react-testing-library/intro)
- 🔬 **Deep Dive**: [Blog — RTL Best Practices — Kent C. Dodds](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- 🎯 **Interview Prep**: [GeeksForGeeks — Source Maps Explained](https://www.geeksforgeeks.org/what-are-source-maps-in-javascript/)
- 🎬 **Video**: [React Testing Library — Jack Herrington](https://www.youtube.com/watch?v=T2sv8jXoP4s)

**322. Testing Custom Hooks with renderHook ★ ★**

- 📖 **Official Docs**: [Testing Library — renderHook](https://testing-library.com/docs/react-testing-library/api#renderhook)
- 🔬 **Deep Dive**: [Blog — Testing Custom Hooks — Kent C. Dodds](https://kentcdodds.com/blog/how-to-test-custom-react-hooks)
- 🎯 **Interview Prep**: [GeeksForGeeks — Feature Analytics](https://www.geeksforgeeks.org/what-is-a-b-testing/)
- 🎬 **Video**: [Testing Hooks — Jack Herrington](https://www.youtube.com/watch?v=hP_pOIJfadg)

**323. Testing Redux / RTK Slices in Isolation ★ ★**

- 📖 **Official Docs**: [Redux Toolkit — Writing Tests](https://redux.js.org/usage/writing-tests)
- 🔬 **Deep Dive**: [Blog — Testing Redux — LogRocket](https://blog.logrocket.com/testing-redux-reducers-and-actions/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Alerting Strategies](https://www.geeksforgeeks.org/monitoring-and-alerting-in-devops/)
- 🎬 **Video**: [Testing Redux — Codevolution](https://www.youtube.com/watch?v=h7ukDItYot0)

**324. Jasmine & Karma — Angular Testing Patterns ★ ★**

- 📖 **Official Docs**: [Angular — Testing Guide](https://angular.dev/guide/testing)
- 🔬 **Deep Dive**: [Blog — Angular Testing Patterns — LogRocket](https://blog.logrocket.com/angular-unit-testing/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Distributed Tracing](https://www.geeksforgeeks.org/distributed-tracing-in-microservices/)
- 🎬 **Video**: [Angular Testing — Decoded Frontend](https://www.youtube.com/watch?v=BhjzNReAG2Y)

#### 🎭 Module 18.3: E2E Testing

**325. Playwright vs Cypress — Architecture & Trade-offs ★ ★**

- 📖 **Official Docs**: [Playwright Docs](https://playwright.dev/docs/intro)
- 🔬 **Deep Dive**: [Cypress Docs](https://docs.cypress.io/guides/overview/why-cypress)
- 🎯 **Interview Prep**: [web.dev — Custom Web Vitals Metrics](https://web.dev/articles/custom-metrics)
- 🎬 **Video**: [Playwright vs Cypress — Fireship](https://www.youtube.com/watch?v=cOmehxAU_4s)

**326. Page Object Model (POM) Pattern ★ ★**

- 📖 **Official Docs**: [Playwright — Page Object Model](https://playwright.dev/docs/pom)
- 🔬 **Deep Dive**: [Blog — POM Pattern — LogRocket](https://blog.logrocket.com/page-object-model-pattern/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Session Replay Tools](https://www.geeksforgeeks.org/what-is-session-replay/)
- 🎬 **Video**: [Page Object Model — Traversy Media](https://www.youtube.com/watch?v=7r4xVDI2vho)

**327. E2E in CI — Parallel Execution, Sharding ★ ★**

- 📖 **Official Docs**: [Playwright — Parallelism](https://playwright.dev/docs/test-parallel)
- 🔬 **Deep Dive**: [Blog — E2E in CI — LogRocket](https://blog.logrocket.com/playwright-vs-cypress/)
- 🎯 **Interview Prep**: [GeeksForGeeks — CI/CD Pipeline](https://www.geeksforgeeks.org/ci-cd-pipeline/)
- 🎬 **Video**: [E2E Testing in CI — Fireship](https://www.youtube.com/watch?v=u6QfIXgjwGQ)

**328. Flaky Test Root Causes & Prevention ★ ★**

- 📖 **Official Docs**: [Blog — Flaky Tests — Google Testing Blog](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
- 🔬 **Deep Dive**: [Blog — Fixing Flaky Tests — Playwright](https://playwright.dev/docs/test-retries)
- 🎯 **Interview Prep**: [GeeksForGeeks — GitHub Actions](https://www.geeksforgeeks.org/github-actions/)
- 🎬 **Video**: [Flaky Tests — Google Testing Blog](https://www.youtube.com/watch?v=u6QfIXgjwGQ)

#### 📊 Module 18.4: Performance & Visual Testing

**329. Visual Regression Testing — Storybook, Chromatic, Percy ★ ★**

- 📖 **Official Docs**: [Storybook — Visual Testing](https://storybook.js.org/docs/writing-tests/visual-testing)
- 🔬 **Deep Dive**: [Chromatic Docs](https://www.chromatic.com/docs/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Docker for Frontend](https://www.geeksforgeeks.org/docker-tutorial/)
- 🎬 **Video**: [Visual Testing with Storybook — Fireship](https://www.youtube.com/watch?v=p-LFh5Y89eM)

**330. Lighthouse CI in Build Pipeline ★ ★**

- 📖 **Official Docs**: [Lighthouse CI — GitHub](https://github.com/GoogleChrome/lighthouse-ci)
- 🔬 **Deep Dive**: [Blog — Lighthouse in CI Pipeline — LogRocket](https://blog.logrocket.com/lighthouse-ci/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Canary Deployment](https://www.geeksforgeeks.org/canary-deployment/)
- 🎬 **Video**: [Lighthouse CI — Google Chrome Developers](https://www.youtube.com/watch?v=mLjxXPHuIJo)

**331. Bundle Size Regression Testing ★ ★**

- 📖 **Official Docs**: [bundlesize — GitHub](https://github.com/siddharthkp/bundlesize)
- 🔬 **Deep Dive**: [Blog — Bundle Size Testing — LogRocket](https://blog.logrocket.com/guide-performance-optimization-webpack/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Blue-Green Deployment](https://www.geeksforgeeks.org/blue-green-deployment/)
- 🎬 **Video**: [Bundle Size CI — Fireship](https://www.youtube.com/watch?v=SbhkQA0k8a0)

### SEQUENCE 1️⃣9️⃣ — Observability

> Production ownership mindset. Microsoft and Cisco care deeply.

#### 📉 Module 19.1: Monitoring

**332. Frontend Logging Strategy**

- 📖 **Official Docs**: [Blog — Frontend Logging — LogRocket](https://blog.logrocket.com/frontend-logging/)
- 🔬 **Deep Dive**: [Blog — Logging Best Practices — Datadog](https://www.datadoghq.com/blog/frontend-logging-best-practices/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Rollback Strategies](https://www.geeksforgeeks.org/deployment-strategies-in-devops/)
- 🎬 **Video**: [Frontend Logging — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY)

**333. Error Tracking — Sentry, Datadog, Rollbar**

- 📖 **Official Docs**: [Sentry Docs — JavaScript](https://docs.sentry.io/platforms/javascript/)
- 🔬 **Deep Dive**: [Blog — Error Tracking Guide — Sentry](https://docs.sentry.io/product/issues/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Preview Environments](https://www.geeksforgeeks.org/what-is-preview-environment/)
- 🎬 **Video**: [Sentry Setup — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY)

**334. Performance Monitoring**

- 📖 **Official Docs**: [web.dev — Performance Monitoring](https://web.dev/articles/vitals-measurement-getting-started)
- 🔬 **Deep Dive**: [Blog — Frontend Performance Monitoring — Datadog](https://www.datadoghq.com/blog/frontend-performance-monitoring/)
- 🎯 **Interview Prep**: [GeeksForGeeks — ESLint & Prettier Config](https://www.geeksforgeeks.org/eslint-pluggable-javascript-linter/)
- 🎬 **Video**: [Performance Monitoring — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc)

**335. Real User Monitoring (RUM)**

- 📖 **Official Docs**: [web.dev — RUM](https://web.dev/articles/vitals-measurement-getting-started)
- 🔬 **Deep Dive**: [Blog — RUM Guide — Datadog](https://www.datadoghq.com/blog/real-user-monitoring/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Git Hooks (Husky)](https://www.geeksforgeeks.org/git-hooks/)
- 🎬 **Video**: [Real User Monitoring — Google Chrome Developers](https://www.youtube.com/watch?v=AQqFZ5t8uNc)

**336. OpenTelemetry for Frontend ★ ★**

- 📖 **Official Docs**: [OpenTelemetry — JS Docs](https://opentelemetry.io/docs/languages/js/)
- 🔬 **Deep Dive**: [Blog — OpenTelemetry for Frontend — LogRocket](https://blog.logrocket.com/opentelemetry-frontend/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Semantic Versioning](https://www.geeksforgeeks.org/introduction-semantic-versioning/)
- 🎬 **Video**: [OpenTelemetry — Fireship](https://www.youtube.com/watch?v=r8UvWSX3KA8)

#### 🧪 Module 19.2: Debugging UX

**337. User Analytics — Event Tracking, Funnels**

- 📖 **Official Docs**: [Google Analytics — Events](https://developers.google.com/analytics/devguides/collection/ga4/events)
- 🔬 **Deep Dive**: [Blog — User Analytics Guide — LogRocket](https://blog.logrocket.com/product-analytics/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Bundle Analysis (Webpack)](https://www.geeksforgeeks.org/webpack-bundle-analyzer/)
- 🎬 **Video**: [Google Analytics 4 — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY)

**338. Debugging Production — Source Maps, DevTools**

- 📖 **Official Docs**: [Chrome DevTools — Sources](https://developer.chrome.com/docs/devtools/javascript/)
- 🔬 **Deep Dive**: [Blog — Source Maps Explained — LogRocket](https://blog.logrocket.com/source-maps-javascript/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Automated Dependency Updates](https://www.geeksforgeeks.org/what-is-dependabot/)
- 🎬 **Video**: [Chrome DevTools — Google Chrome Developers](https://www.youtube.com/watch?v=YjMFjXiWsps)

**339. Correlation IDs — Tracing Requests End-to-End**

- 📖 **Official Docs**: [Blog — Correlation IDs — Datadog](https://www.datadoghq.com/blog/request-log-correlation/)
- 🔬 **Deep Dive**: [Blog — Distributed Tracing — LogRocket](https://blog.logrocket.com/opentelemetry-frontend/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Web Components](https://www.geeksforgeeks.org/web-components/)
- 🎬 **Video**: [Distributed Tracing — Fireship](https://www.youtube.com/watch?v=r8UvWSX3KA8)

**340. Session Replay — FullStory, LogRocket**

- 📖 **Official Docs**: [LogRocket Docs](https://docs.logrocket.com/)
- 🔬 **Deep Dive**: [Blog — Session Replay Tools — Smashing Magazine](https://www.smashingmagazine.com/2021/06/session-replay-tools/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Custom Elements](https://www.geeksforgeeks.org/html-custom-elements/)
- 🎬 **Video**: [Session Replay — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY)

**341. Rage Click Detection & Frustration Signals**

- 📖 **Official Docs**: [Blog — Rage Clicks — FullStory](https://www.fullstory.com/blog/rage-clicks/)
- 🔬 **Deep Dive**: [Blog — Frustration Signals — LogRocket](https://blog.logrocket.com/product-analytics/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Shadow DOM](https://www.geeksforgeeks.org/shadow-dom/)
- 🎬 **Video**: [Rage Click Detection — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY)

**342. Synthetic Monitoring — Uptime Checks, Canary Flows ★ ★**

- 📖 **Official Docs**: [Blog — Synthetic Monitoring — Datadog](https://www.datadoghq.com/blog/browser-tests/)
- 🔬 **Deep Dive**: [Blog — Uptime Monitoring — Calibre](https://calibreapp.com/blog/synthetic-vs-real-user-monitoring)
- 🎯 **Interview Prep**: [GeeksForGeeks — HTML Templates & Slots](https://www.geeksforgeeks.org/html-templates-and-slots/)
- 🎬 **Video**: [Synthetic Monitoring — Fireship](https://www.youtube.com/watch?v=WnKFKodapJY)

### SEQUENCE 2️⃣0️⃣ — CI/CD & Frontend DevOps ★

> Enterprise pipeline ownership. Cisco and Microsoft expect senior engineers to own this.

#### 🌿 Module 20.1: Git Workflows

**343. Trunk-Based Development vs GitFlow ★ ★**

- 📖 **Official Docs**: [Blog — Trunk-Based Development](https://trunkbaseddevelopment.com/)
- 🔬 **Deep Dive**: [Blog — Trunk vs GitFlow — Martin Fowler](https://martinfowler.com/articles/branching-patterns.html)
- 🎯 **Interview Prep**: [Salesforce Trailhead — LWC Basics](https://trailhead.salesforce.com/content/learn/modules/lightning-web-components-basics)
- 🎬 **Video**: [Trunk-Based Dev — Fireship](https://www.youtube.com/watch?v=ykZbBD-CmP8)

**344. PR Strategy — Size, Review Checklists, Branch Protection ★ ★**

- 📖 **Official Docs**: [GitHub — Pull Request Best Practices](https://docs.github.com/en/pull-requests)
- 🔬 **Deep Dive**: [Blog — PR Strategy — Thoughtbot](https://thoughtbot.com/blog/5-useful-tips-for-a-better-commit-message)
- 🎯 **Interview Prep**: [Salesforce Developers — LWC Reactivity](https://developer.salesforce.com/docs/platform/lwc/guide/reactivity.html)
- 🎬 **Video**: [PR Best Practices — Fireship](https://www.youtube.com/watch?v=ykZbBD-CmP8)

**345. Conventional Commits & Semantic Versioning ★ ★**

- 📖 **Official Docs**: [Conventional Commits Spec](https://www.conventionalcommits.org/)
- 🔬 **Deep Dive**: [semver.org](https://semver.org/)
- 🎯 **Interview Prep**: [Salesforce Developers — LWC Wire Service](https://developer.salesforce.com/docs/platform/lwc/guide/data-wire-service-about.html)
- 🎬 **Video**: [Semantic Versioning — Fireship](https://www.youtube.com/watch?v=ykZbBD-CmP8)

#### ⚙️ Module 20.2: CI/CD Pipelines

**346. GitHub Actions — Workflows, Jobs, Matrix Builds, Caching ★ ★**

- 📖 **Official Docs**: [GitHub Actions Docs](https://docs.github.com/en/actions)
- 🔬 **Deep Dive**: [Blog — GitHub Actions for Frontend — LogRocket](https://blog.logrocket.com/github-actions-ci-cd/)
- 🎯 **Interview Prep**: [Salesforce Developers — Lightning Data Service](https://developer.salesforce.com/docs/platform/lwc/guide/data-ui-api.html)
- 🎬 **Video**: [GitHub Actions — Fireship](https://www.youtube.com/watch?v=eB0nUzAI7M8)

**347. Jenkins Pipelines — Declarative Syntax ★ ★**

- 📖 **Official Docs**: [Jenkins — Pipeline Docs](https://www.jenkins.io/doc/book/pipeline/)
- 🔬 **Deep Dive**: [Blog — Jenkins Pipeline — LogRocket](https://blog.logrocket.com/jenkins-vs-github-actions/)
- 🎯 **Interview Prep**: [Salesforce DX Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_intro.htm)
- 🎬 **Video**: [Jenkins Pipeline — TechWorld with Nana](https://www.youtube.com/watch?v=7KCS70sCoK0)

**348. Frontend Pipeline: Lint → Type-Check → Test → Build → Deploy ★ ★**

- 📖 **Official Docs**: [Blog — Frontend CI Pipeline — LogRocket](https://blog.logrocket.com/github-actions-ci-cd/)
- 🔬 **Deep Dive**: [Blog — CI/CD Best Practices — Vercel](https://vercel.com/docs/deployments/overview)
- 🎯 **Interview Prep**: [Salesforce Trailhead — Data Security](https://trailhead.salesforce.com/content/learn/modules/data_security)
- 🎬 **Video**: [Frontend CI/CD — Fireship](https://www.youtube.com/watch?v=eB0nUzAI7M8)

**349. Artifact Caching Strategy in CI ★ ★**

- 📖 **Official Docs**: [GitHub Actions — Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- 🔬 **Deep Dive**: [Blog — CI Caching Strategy — LogRocket](https://blog.logrocket.com/github-actions-ci-cd/)
- 🎯 **Interview Prep**: [Salesforce Locker Service Architecture](https://developer.salesforce.com/docs/platform/lwc/guide/security-locker-service.html)
- 🎬 **Video**: [CI Caching — Fireship](https://www.youtube.com/watch?v=eB0nUzAI7M8)

#### 🚀 Module 20.3: Deployment Strategies

**350. Blue-Green Deployment ★ ★**

- 📖 **Official Docs**: [Blog — Blue-Green Deployment — Martin Fowler](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- 🔬 **Deep Dive**: [Blog — Blue-Green Deployment — AWS](https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/introduction.html)
- 🎯 **Interview Prep**: [Salesforce Trailhead — Platform Events](https://trailhead.salesforce.com/content/learn/modules/platform_events_basics)
- 🎬 **Video**: [Blue-Green Deployment — TechWorld with Nana](https://www.youtube.com/watch?v=AWVTKBUnoIg)

**351. Canary Releases for Frontend ★ ★**

- 📖 **Official Docs**: [Blog — Canary Releases — Martin Fowler](https://martinfowler.com/bliki/CanaryRelease.html)
- 🔬 **Deep Dive**: [Blog — Canary for Frontend — LaunchDarkly](https://launchdarkly.com/blog/what-are-feature-flags/)
- 🎯 **Interview Prep**: [Salesforce Developers — LWC Performance](https://developer.salesforce.com/docs/platform/lwc/guide/performance.html)
- 🎬 **Video**: [Canary Releases — TechWorld with Nana](https://www.youtube.com/watch?v=AWVTKBUnoIg)

**352. Feature Flags as Deployment Safety Valve ★ ★**

- 📖 **Official Docs**: [Blog — Feature Flags — Martin Fowler](https://martinfowler.com/articles/feature-toggles.html)
- 🔬 **Deep Dive**: [Blog — Feature Flags for Safety — LaunchDarkly](https://launchdarkly.com/blog/what-are-feature-flags/)
- 🎯 **Interview Prep**: [SAP UI5 Documentation — Getting Started](https://sapui5.hana.ondemand.com/)
- 🎬 **Video**: [Feature Flags — Fireship](https://www.youtube.com/watch?v=UQhzTBOqNYs)

**353. Rollback Strategy ★ ★**

- 📖 **Official Docs**: [Blog — Rollback Strategy — AWS](https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/rollback.html)
- 🔬 **Deep Dive**: [Blog — Frontend Rollback — Vercel](https://vercel.com/docs/deployments/overview)
- 🎯 **Interview Prep**: [SAP UI5 — MVC Pattern](https://sapui5.hana.ondemand.com/#/topic/91f233476f4d1014b6dd926db0e91070)
- 🎬 **Video**: [Rollback Strategies — TechWorld with Nana](https://www.youtube.com/watch?v=AWVTKBUnoIg)

#### 🐳 Module 20.4: Docker Basics for Frontend

**354. Dockerfile for Node/Frontend Apps ★ ★**

- 📖 **Official Docs**: [Docker — Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- 🔬 **Deep Dive**: [Blog — Dockerfile for Node — Docker](https://docs.docker.com/language/nodejs/)
- 🎯 **Interview Prep**: [SAP UI5 — Data Binding](https://sapui5.hana.ondemand.com/#/topic/68b9644a253741e8a4b9e4279a35c247)
- 🎬 **Video**: [Docker in 100 Seconds — Fireship](https://www.youtube.com/watch?v=Gjnup-PuquQ)

**355. Multi-Stage Builds — Build + Nginx Serve ★ ★**

- 📖 **Official Docs**: [Docker — Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- 🔬 **Deep Dive**: [Blog — Multi-Stage Frontend Build — LogRocket](https://blog.logrocket.com/docker-for-front-end-developers/)
- 🎯 **Interview Prep**: [SAP — OData V4 Model](https://sapui5.hana.ondemand.com/#/topic/5de13cf4dd1f4a3480f7e2eaaee3f5b8)
- 🎬 **Video**: [Multi-Stage Docker — TechWorld with Nana](https://www.youtube.com/watch?v=pg19Z8LL06w)

**356. Environment Variables in Containerised Frontend ★ ★**

- 📖 **Official Docs**: [Docker — Environment Variables](https://docs.docker.com/compose/environment-variables/)
- 🔬 **Deep Dive**: [Blog — Env Vars in Containerised Apps — LogRocket](https://blog.logrocket.com/docker-for-front-end-developers/)
- 🎯 **Interview Prep**: [SAP Fiori Design Guidelines](https://experience.sap.com/fiori-design/)
- 🎬 **Video**: [Docker Env Variables — TechWorld with Nana](https://www.youtube.com/watch?v=pg19Z8LL06w)

---

## 🏢 PHASE 8 — COMPANY-SPECIFIC MODULES

*Weeks 9–10 | Targeted prep for each company's unique stack.*

### SEQUENCE 2️⃣1️⃣ — Web Components & Lightning Web Components ★

> Salesforce LWC is built on Web Components. Do this before your Salesforce interview.

#### 🧱 Module 21.1: Web Components Fundamentals

**357. Custom Elements API ★ ★**

- 📖 **Official Docs**: [MDN — Custom Elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- 🔬 **Deep Dive**: [web.dev — Custom Elements](https://web.dev/articles/custom-elements-v1)
- 🎯 **Interview Prep**: [SAP — Flexible Programming Model](https://sapui5.hana.ondemand.com/#/topic/33a4f87e68d14697b7af8bca6b9f6838)
- 🎬 **Video**: [Web Components — Fireship](https://www.youtube.com/watch?v=PCWaFLy3VUo)

**358. Shadow DOM — Open vs Closed Mode ★ ★**

- 📖 **Official Docs**: [MDN — Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- 🔬 **Deep Dive**: [web.dev — Shadow DOM v1](https://web.dev/articles/shadowdom-v1)
- 🎯 **Interview Prep**: [SAP Business Application Studio](https://help.sap.com/docs/bas)
- 🎬 **Video**: [Shadow DOM — Fireship](https://www.youtube.com/watch?v=PCWaFLy3VUo)

**359. HTML Templates & Slots ★ ★**

- 📖 **Official Docs**: [MDN — HTML Templates](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots)
- 🔬 **Deep Dive**: [web.dev — Templates & Slots](https://web.dev/articles/shadowdom-v1#templates_and_slots)
- 🎯 **Interview Prep**: [GeeksForGeeks — Micro-Frontends in Enterprise](https://www.geeksforgeeks.org/micro-frontend-architecture/)
- 🎬 **Video**: [HTML Templates — Fireship](https://www.youtube.com/watch?v=PCWaFLy3VUo)

**360. Custom Events & Component Communication ★ ★**

- 📖 **Official Docs**: [MDN — Custom Events](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)
- 🔬 **Deep Dive**: [web.dev — Custom Events](https://web.dev/articles/custom-elements-v1#reactions)
- 🎯 **Interview Prep**: [GeeksForGeeks — Module Federation (Webpack 5)](https://www.geeksforgeeks.org/module-federation-in-webpack-5/)
- 🎬 **Video**: [Custom Events — Fireship](https://www.youtube.com/watch?v=PCWaFLy3VUo)

#### ⚡ Module 21.2: Lightning Web Components (LWC)

**361. LWC Component Lifecycle — connectedCallback, disconnectedCallback, renderedCallback ★ ★**

- 📖 **Official Docs**: [Salesforce — LWC Lifecycle](https://developer.salesforce.com/docs/platform/lwc/guide/create-lifecycle-hooks.html)
- 🔬 **Deep Dive**: [Blog — LWC Lifecycle — Salesforce Developer Blog](https://developer.salesforce.com/blogs/2020/06/lightning-web-components-best-practices)
- 🎯 **Interview Prep**: [GeeksForGeeks — Iframe Communication](https://www.geeksforgeeks.org/how-to-communicate-between-iframe-and-the-parent-site/)
- 🎬 **Video**: [LWC Lifecycle — Salesforce Developers](https://www.youtube.com/watch?v=i28BDUVIIU4)

**362. @api, @track, @wire Decorators ★ ★**

- 📖 **Official Docs**: [Salesforce — LWC Decorators](https://developer.salesforce.com/docs/platform/lwc/guide/create-components-data-binding.html)
- 🔬 **Deep Dive**: [Blog — @api @track @wire — Salesforce Developer Blog](https://developer.salesforce.com/blogs/2020/06/lightning-web-components-best-practices)
- 🎯 **Interview Prep**: [GeeksForGeeks — Enterprise SSO (SAML/OIDC)](https://www.geeksforgeeks.org/saml-single-sign-on-sso-authentication/)
- 🎬 **Video**: [LWC Decorators — Salesforce Developers](https://www.youtube.com/watch?v=i28BDUVIIU4)

**363. Wire Service & Apex Method Integration ★ ★**

- 📖 **Official Docs**: [Salesforce — Wire Service](https://developer.salesforce.com/docs/platform/lwc/guide/data-wire-service-about.html)
- 🔬 **Deep Dive**: [Blog — Wire Service Guide — Salesforce](https://developer.salesforce.com/blogs/2020/06/lightning-web-components-best-practices)
- 🎯 **Interview Prep**: [GeeksForGeeks — Legacy to Modern Migration](https://www.geeksforgeeks.org/strangler-fig-pattern-in-microservices/)
- 🎬 **Video**: [Wire Service & Apex — Salesforce Developers](https://www.youtube.com/watch?v=i28BDUVIIU4)

**364. LWC Events — Custom Events, Lightning Message Service ★ ★**

- 📖 **Official Docs**: [Salesforce — LWC Events](https://developer.salesforce.com/docs/platform/lwc/guide/events.html)
- 🔬 **Deep Dive**: [Blog — LWC Events Guide — Salesforce](https://developer.salesforce.com/blogs/2020/06/lightning-web-components-best-practices)
- 🎯 **Interview Prep**: [GeeksForGeeks — Strangler Fig Pattern](https://www.geeksforgeeks.org/strangler-fig-pattern-in-microservices/)
- 🎬 **Video**: [LWC Events — Salesforce Developers](https://www.youtube.com/watch?v=i28BDUVIIU4)

**365. Salesforce Lightning Design System (SLDS) ★ ★**

- 📖 **Official Docs**: [Salesforce — Lightning Design System](https://www.lightningdesignsystem.com/)
- 🔬 **Deep Dive**: [Blog — SLDS Guide — Salesforce Developer Blog](https://developer.salesforce.com/blogs/2020/06/lightning-web-components-best-practices)
- 🎯 **Interview Prep**: [frontendatscale.com — Frontend System Design Guide](https://www.frontendatscale.com/blog/frontend-system-design-interview-guide/)
- 🎬 **Video**: [Lightning Design System — Salesforce Developers](https://www.youtube.com/watch?v=i28BDUVIIU4)

#### 🔗 Module 21.3: Framework Interop

**366. Angular Elements — Exporting as Web Components ★ ★**

- 📖 **Official Docs**: [Angular — Angular Elements](https://angular.dev/guide/elements)
- 🔬 **Deep Dive**: [Blog — Angular Elements Guide — LogRocket](https://blog.logrocket.com/getting-started-with-angular-elements/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Component-Based Architecture](https://www.geeksforgeeks.org/component-based-architecture/)
- 🎬 **Video**: [Angular Elements — Joshua Morony](https://www.youtube.com/watch?v=8ji8hi2Fw7M)

**367. Embedding React Components in Angular & Vice Versa ★ ★**

- 📖 **Official Docs**: [Blog — Micro-Frontends — Martin Fowler](https://martinfowler.com/articles/micro-frontends.html)
- 🔬 **Deep Dive**: [Blog — React in Angular — LogRocket](https://blog.logrocket.com/micro-frontend-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Frontend System Design](https://www.geeksforgeeks.org/frontend-system-design/)
- 🎬 **Video**: [Micro-Frontends — Jack Herrington](https://www.youtube.com/watch?v=w58aZjACETQ)

**368. Sharing State Across Frameworks in Micro-Frontend ★ ★**

- 📖 **Official Docs**: [Blog — Module Federation](https://module-federation.io/)
- 🔬 **Deep Dive**: [Blog — State Sharing in Micro-Frontends — LogRocket](https://blog.logrocket.com/building-micro-frontends-module-federation/)
- 🎯 **Interview Prep**: [GeeksForGeeks — State Management in Large Apps](https://www.geeksforgeeks.org/state-management-in-react/)
- 🎬 **Video**: [Shared State — Jack Herrington](https://www.youtube.com/watch?v=K-yQB9YGmgE)

### SEQUENCE 2️⃣2️⃣ — SAP UI5 & Enterprise Frontend Patterns ★

> Your most current daily skill. Articulate it clearly to non-SAP companies.

#### 🏗️ Module 22.1: SAP UI5 Architecture

**369. SAPUI5 vs OpenUI5 — Differences & Licensing ★ ★**

- 📖 **Official Docs**: [SAPUI5 SDK](https://sapui5.hana.ondemand.com/)
- 🔬 **Deep Dive**: [OpenUI5 Docs](https://openui5.hana.ondemand.com/)
- 🎯 **Interview Prep**: [GeeksForGeeks — API Design Best Practices](https://www.geeksforgeeks.org/rest-api-design-best-practices/)
- 🎬 **Video**: [SAPUI5 vs OpenUI5 — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

**370. MVC Pattern in UI5 — Model, View, Controller ★ ★**

- 📖 **Official Docs**: [SAPUI5 — MVC](https://sapui5.hana.ondemand.com/#/topic/91f233476f4d1014b6dd926db0e91070)
- 🔬 **Deep Dive**: [Blog — UI5 MVC Pattern — SAP Community](https://community.sap.com/topics/ui5)
- 🎯 **Interview Prep**: [web.dev — Performance Budgets](https://web.dev/articles/performance-budgets-101)
- 🎬 **Video**: [UI5 MVC — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

**371. OData Binding — Property, Aggregation, Element Binding ★ ★**

- 📖 **Official Docs**: [SAPUI5 — OData Model](https://sapui5.hana.ondemand.com/#/topic/6c47b2b39db9404582994070ec3d57a2)
- 🔬 **Deep Dive**: [Blog — OData Binding — SAP Community](https://community.sap.com/topics/ui5)
- 🎯 **Interview Prep**: [GeeksForGeeks — Error Handling in System Design](https://www.geeksforgeeks.org/error-handling-in-system-design/)
- 🎬 **Video**: [OData Binding — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

**372. UI5 Lifecycle — init, onBeforeRendering, onAfterRendering ★ ★**

- 📖 **Official Docs**: [SAPUI5 — Controller Lifecycle](https://sapui5.hana.ondemand.com/#/topic/121b8e6337d147af9819129e428f1f75)
- 🔬 **Deep Dive**: [Blog — UI5 Lifecycle — SAP Community](https://community.sap.com/topics/ui5)
- 🎯 **Interview Prep**: [GeeksForGeeks — Monitoring in System Design](https://www.geeksforgeeks.org/monitoring-in-system-design/)
- 🎬 **Video**: [UI5 Lifecycle — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

#### 🎨 Module 22.2: Fiori Design System

**373. SAP Fiori Design Principles ★ ★**

- 📖 **Official Docs**: [SAP Fiori Design Guidelines](https://experience.sap.com/fiori-design-web/)
- 🔬 **Deep Dive**: [Blog — Fiori Design Principles — SAP Community](https://community.sap.com/topics/fiori)
- 🎯 **Interview Prep**: [GeeksForGeeks — System Design Trade-offs](https://www.geeksforgeeks.org/tradeoffs-in-system-design/)
- 🎬 **Video**: [Fiori Design — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

**374. Fiori Launchpad Architecture ★ ★**

- 📖 **Official Docs**: [SAP — Fiori Launchpad](https://experience.sap.com/fiori-design-web/launchpad/)
- 🔬 **Deep Dive**: [Blog — Fiori Launchpad Architecture — SAP Community](https://community.sap.com/topics/fiori)
- 🎯 **Interview Prep**: [GeeksForGeeks — Communication Diagram](https://www.geeksforgeeks.org/communication-diagram/)
- 🎬 **Video**: [Fiori Launchpad — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

**375. Theming — SAP Theming Base Content, CSS Variables ★ ★**

- 📖 **Official Docs**: [SAP — Theming](https://experience.sap.com/fiori-design-web/theming/)
- 🔬 **Deep Dive**: [Blog — UI5 Theming — SAP Community](https://community.sap.com/topics/ui5)
- 🎯 **Interview Prep**: [GeeksForGeeks — UML Diagrams](https://www.geeksforgeeks.org/unified-modeling-language-uml-introduction/)
- 🎬 **Video**: [UI5 Theming — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

#### 📐 Module 22.3: Enterprise UI Patterns

**376. Master-Detail Pattern ★ ★**

- 📖 **Official Docs**: [SAP Fiori — Master-Detail](https://experience.sap.com/fiori-design-web/master-detail/)
- 🔬 **Deep Dive**: [Blog — Master-Detail Pattern — SAP Community](https://community.sap.com/topics/fiori)
- 🎯 **Interview Prep**: [LeetCode — Top Interview 150](https://leetcode.com/studyplan/top-interview-150/)
- 🎬 **Video**: [Master-Detail — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

**377. Worklist Pattern ★ ★**

- 📖 **Official Docs**: [SAP Fiori — Worklist](https://experience.sap.com/fiori-design-web/work-list/)
- 🔬 **Deep Dive**: [Blog — Worklist Pattern — SAP Community](https://community.sap.com/topics/fiori)
- 🎯 **Interview Prep**: [NeetCode — Arrays & Hashing](https://neetcode.io/roadmap)
- 🎬 **Video**: [Worklist Pattern — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

**378. Object Page Layout ★ ★**

- 📖 **Official Docs**: [SAP Fiori — Object Page](https://experience.sap.com/fiori-design-web/object-page/)
- 🔬 **Deep Dive**: [Blog — Object Page Layout — SAP Community](https://community.sap.com/topics/fiori)
- 🎯 **Interview Prep**: [GeeksForGeeks — DOM Tree Traversal](https://www.geeksforgeeks.org/dom-document-object-model/)
- 🎬 **Video**: [Object Page — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

**379. Smart Controls — SmartTable, SmartForm, SmartFilterBar ★ ★**

- 📖 **Official Docs**: [SAPUI5 — Smart Controls](https://sapui5.hana.ondemand.com/#/topic/64bde9a8879d4f418bcf73d28e12e4dd)
- 🔬 **Deep Dive**: [Blog — Smart Controls — SAP Community](https://community.sap.com/topics/ui5)
- 🎯 **Interview Prep**: [LeetCode — Flatten Nested List Iterator (341)](https://leetcode.com/problems/flatten-nested-list-iterator/)
- 🎬 **Video**: [Smart Controls — SAP Developers](https://www.youtube.com/watch?v=J9NMwsipMkw)

#### 💼 Module 22.4: Positioning SAP Experience

**380. How to Articulate SAP UI5 Work to Non-SAP Companies ★ ★**

- 📖 **Official Docs**: [Blog — Positioning SAP Experience — SAP Community](https://community.sap.com/topics/career)
- 🔬 **Deep Dive**: [Blog — Articulating Enterprise Experience — Dev.to](https://dev.to/nickytonline/how-to-describe-enterprise-experience-5c3i)
- 🎯 **Interview Prep**: [LeetCode — LRU Cache (146)](https://leetcode.com/problems/lru-cache/)
- 🎬 **Video**: [SAP to FAANG — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**381. Transferable Skills — OData → REST, UI5 MVC → React/Angular patterns ★ ★**

- 📖 **Official Docs**: [Blog — Transferable Skills — SAP Community](https://community.sap.com/topics/career)
- 🔬 **Deep Dive**: [Blog — OData to REST — Dev.to](https://dev.to/nickytonline/transferable-skills-enterprise-to-startup-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Trie Data Structure](https://www.geeksforgeeks.org/trie-insert-and-search/)
- 🎬 **Video**: [Enterprise Skills Transfer — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**382. SAP BI Launchpad Case Study — Performance, Security, Accessibility ★ ★**

- 📖 **Official Docs**: [Blog — Performance Case Study — web.dev](https://web.dev/articles/vitals)
- 🔬 **Deep Dive**: [Blog — Building Case Studies for Interviews — Medium](https://medium.com/@nicholasgill30/building-case-studies-for-interviews-8b7d82f9bc09)
- 🎯 **Interview Prep**: [LeetCode — Debounce (2627)](https://leetcode.com/problems/debounce/)
- 🎬 **Video**: [Technical Case Study — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

---

## 🎯 PHASE 9 — SYSTEM DESIGN & INTERVIEW EXECUTION

*Weeks 9–11 | Everything above now gets applied. This is the exam.*

### SEQUENCE 2️⃣3️⃣ — Frontend System Design Foundations

> Now that you know everything, learn how to present it in an interview.

#### 📘 Module 23.1: Foundations & Mindset

**383. What is Frontend System Design**

- 📖 **Official Docs**: [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Frontend System Design — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — BFS and DFS](https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/)
- 🎬 **Video**: [Frontend System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**384. How Frontend System Design Differs from Backend Design**

- 📖 **Official Docs**: [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Frontend vs Backend SD — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Topological Sort](https://www.geeksforgeeks.org/topological-sorting/)
- 🎬 **Video**: [FE vs BE System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**385. Role of a Senior / Staff Frontend Engineer**

- 📖 **Official Docs**: [Blog — Staff Engineer Role — StaffEng.com](https://staffeng.com/)
- 🔬 **Deep Dive**: [Blog — Senior vs Staff — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🎯 **Interview Prep**: [LeetCode — Sliding Window Maximum (239)](https://leetcode.com/problems/sliding-window-maximum/)
- 🎬 **Video**: [Senior vs Staff — Clément Mihailescu](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**386. How Microsoft / Adobe / Salesforce / Cisco Differ in Expectations ★ ★**

- 📖 **Official Docs**: [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Company Expectations — Levels.fyi](https://www.levels.fyi/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Binary Search Variations](https://www.geeksforgeeks.org/binary-search/)
- 🎬 **Video**: [Company Expectations — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

#### 📘 Module 23.2: Interviews & Expectations

**387. What FAANG Interviewers Look For**

- 📖 **Official Docs**: [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — What FAANG Looks For — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🎯 **Interview Prep**: [LeetCode — Merge Intervals (56)](https://leetcode.com/problems/merge-intervals/)
- 🎬 **Video**: [FAANG System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**388. HLD vs LLD in Frontend Context**

- 📖 **Official Docs**: [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — HLD vs LLD — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Stack-Based Parsing](https://www.geeksforgeeks.org/check-for-balanced-parentheses-in-an-expression/)
- 🎬 **Video**: [HLD vs LLD — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

#### 📘 Module 23.3: Requirements & Trade-offs

**389. Functional vs Non-Functional Requirements (Frontend)**

- 📖 **Official Docs**: [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — NFRs in Frontend — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [LeetCode — Serialize/Deserialize Binary Tree (297)](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/)
- 🎬 **Video**: [Non-Functional Requirements — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**390. Trade-offs Over Perfect UI**

- 📖 **Official Docs**: [GreatFrontEnd — System Design](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Trade-offs in Design — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Heap/Priority Queue](https://www.geeksforgeeks.org/priority-queue-set-1-introduction/)
- 🎬 **Video**: [Design Trade-offs — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**391. Thinking in Components, State, and Data Flow**

- 📖 **Official Docs**: [React Docs — Thinking in React](https://react.dev/learn/thinking-in-react)
- 🔬 **Deep Dive**: [Blog — Components, State, Data Flow — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Dynamic Programming Patterns](https://www.geeksforgeeks.org/dynamic-programming/)
- 🎬 **Video**: [Component Design — Jack Herrington](https://www.youtube.com/watch?v=x5PZwb4XurU)

**392. Capacity Estimation for Frontend Systems ★ ★**

- 📖 **Official Docs**: [Blog — Capacity Estimation — HighScalability](https://highscalability.com/)
- 🔬 **Deep Dive**: [Blog — Frontend Capacity Estimation — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design a Chat Application](https://www.geeksforgeeks.org/design-a-chat-application/)
- 🎬 **Video**: [Capacity Estimation — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

### SEQUENCE 2️⃣4️⃣ — DSA for Frontend Engineers ★

> All 4 companies have a DSA round. Do this in parallel with system design practice.

#### 📦 Module 24.1: Arrays & Strings

**393. Two Pointers Pattern ★ ★**

- 📖 **Official Docs**: [LeetCode — Two Pointers Tag](https://leetcode.com/tag/two-pointers/)
- 🔬 **Deep Dive**: [NeetCode — Two Pointers](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Google Docs](https://www.geeksforgeeks.org/design-google-docs/)
- 🎬 **Video**: [Two Pointers — NeetCode](https://www.youtube.com/watch?v=cQ1Oz4ckceM)

**394. Sliding Window Pattern ★ ★**

- 📖 **Official Docs**: [LeetCode — Sliding Window Tag](https://leetcode.com/tag/sliding-window/)
- 🔬 **Deep Dive**: [NeetCode — Sliding Window](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Google Search](https://www.geeksforgeeks.org/design-a-search-engine/)
- 🎬 **Video**: [Sliding Window — NeetCode](https://www.youtube.com/watch?v=MK-NZ4hN7rs)

**395. Prefix Sums ★ ★**

- 📖 **Official Docs**: [LeetCode — Prefix Sum Tag](https://leetcode.com/tag/prefix-sum/)
- 🔬 **Deep Dive**: [NeetCode — Arrays & Hashing](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design News Feed](https://www.geeksforgeeks.org/design-a-social-media-news-feed/)
- 🎬 **Video**: [Prefix Sum — NeetCode](https://www.youtube.com/watch?v=KE_and_Aii8)

**396. Anagram / Palindrome Problems ★ ★**

- 📖 **Official Docs**: [LeetCode 242 — Valid Anagram](https://leetcode.com/problems/valid-anagram/)
- 🔬 **Deep Dive**: [LeetCode 125 — Valid Palindrome](https://leetcode.com/problems/valid-palindrome/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design E-Commerce Frontend](https://www.geeksforgeeks.org/design-an-online-shopping-system/)
- 🎬 **Video**: [Valid Anagram — NeetCode](https://www.youtube.com/watch?v=9UtInBqnCgA)

#### 🗂️ Module 24.2: Hashmaps & Sets

**397. Frequency Maps Pattern ★ ★**

- 📖 **Official Docs**: [LeetCode — Hash Table Tag](https://leetcode.com/tag/hash-table/)
- 🔬 **Deep Dive**: [NeetCode — Arrays & Hashing](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design a Dashboard](https://www.geeksforgeeks.org/how-to-design-a-web-analytics-dashboard/)
- 🎬 **Video**: [Hash Map Problems — NeetCode](https://www.youtube.com/watch?v=KLlXCFG5TnA)

**398. Two-Sum Variants ★ ★**

- 📖 **Official Docs**: [LeetCode 1 — Two Sum](https://leetcode.com/problems/two-sum/)
- 🔬 **Deep Dive**: [NeetCode — Two Sum Variants](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Email Client](https://www.geeksforgeeks.org/design-an-email-client/)
- 🎬 **Video**: [Two Sum — NeetCode](https://www.youtube.com/watch?v=KLlXCFG5TnA)

**399. Grouping & Bucketing ★ ★**

- 📖 **Official Docs**: [LeetCode 49 — Group Anagrams](https://leetcode.com/problems/group-anagrams/)
- 🔬 **Deep Dive**: [NeetCode — Arrays & Hashing](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Spreadsheet](https://www.geeksforgeeks.org/design-a-spreadsheet/)
- 🎬 **Video**: [Group Anagrams — NeetCode](https://www.youtube.com/watch?v=vzdNOK2oB2E)

#### 📚 Module 24.3: Stacks & Queues

**400. Monotonic Stack Problems ★ ★**

- 📖 **Official Docs**: [LeetCode — Monotonic Stack Tag](https://leetcode.com/tag/monotonic-stack/)
- 🔬 **Deep Dive**: [NeetCode — Stack](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Video Streaming](https://www.geeksforgeeks.org/design-video-streaming-service/)
- 🎬 **Video**: [Monotonic Stack — NeetCode](https://www.youtube.com/watch?v=zx5Sw9130L0)

**401. Browser History / Undo-Redo Simulation ★ ★**

- 📖 **Official Docs**: [LeetCode — Tree Tag](https://leetcode.com/tag/tree/)
- 🔬 **Deep Dive**: [NeetCode — Trees](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Image Gallery](https://www.geeksforgeeks.org/design-pinterest/)
- 🎬 **Video**: [Tree Traversal — NeetCode](https://www.youtube.com/watch?v=YT1994beXn0)

**402. Queue-Based BFS ★ ★**

- 📖 **Official Docs**: [LeetCode — BFS Tag](https://leetcode.com/tag/breadth-first-search/)
- 🔬 **Deep Dive**: [NeetCode — Graphs (BFS / DFS)](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Twitter Frontend](https://www.geeksforgeeks.org/design-twitter/)
- 🎬 **Video**: [Graph BFS & DFS — NeetCode](https://www.youtube.com/watch?v=tWVWeAqZ0WU)

#### 🌳 Module 24.4: Trees & Graphs

**403. BFS & DFS — Templates ★ ★**

- 📖 **Official Docs**: [LeetCode — Trie Tag](https://leetcode.com/tag/trie/)
- 🔬 **Deep Dive**: [NeetCode — Tries](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Notification System](https://www.geeksforgeeks.org/design-notification-system/)
- 🎬 **Video**: [Implement Trie — NeetCode](https://www.youtube.com/watch?v=oobqoCJlHA0)

**404. Binary Tree Traversals — Inorder, Preorder, Postorder ★ ★**

- 📖 **Official Docs**: [LeetCode — Dynamic Programming Tag](https://leetcode.com/tag/dynamic-programming/)
- 🔬 **Deep Dive**: [NeetCode — 1-D Dynamic Programming](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Autocomplete/Typeahead](https://www.geeksforgeeks.org/design-typeahead-suggestion/)
- 🎬 **Video**: [DP for Beginners — NeetCode](https://www.youtube.com/watch?v=73r3KWiEvyk)

**405. Level Order Traversal ★ ★**

- 📖 **Official Docs**: [LeetCode — Memoization](https://leetcode.com/tag/memoization/)
- 🔬 **Deep Dive**: [Blog — Memoization Guide — javascript.info](https://javascript.info/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Calendar App](https://www.geeksforgeeks.org/design-google-calendar/)
- 🎬 **Video**: [Memoization Explained — NeetCode](https://www.youtube.com/watch?v=73r3KWiEvyk)

**406. Graph Connected Components ★ ★**

- 📖 **Official Docs**: [LeetCode 70 — Climbing Stairs](https://leetcode.com/problems/climbing-stairs/)
- 🔬 **Deep Dive**: [NeetCode — 1-D DP](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Build Autocomplete Component](https://www.geeksforgeeks.org/build-autocomplete-feature-using-javascript/)
- 🎬 **Video**: [Climbing Stairs — NeetCode](https://www.youtube.com/watch?v=Y0lT9Fck7qI)

**407. DOM Tree Traversal as Graph Problem ★ ★**

- 📖 **Official Docs**: [LeetCode 200 — Number of Islands](https://leetcode.com/problems/number-of-islands/)
- 🔬 **Deep Dive**: [NeetCode — Graphs](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Build Modal Component](https://www.geeksforgeeks.org/how-to-create-modal-in-reactjs/)
- 🎬 **Video**: [Number of Islands — NeetCode](https://www.youtube.com/watch?v=pV2kpPD66nE)

#### 🔁 Module 24.5: Recursion & DP Basics

**408. Recursion Mental Model ★ ★**

- 📖 **Official Docs**: [LeetCode — Sort Tag](https://leetcode.com/tag/sorting/)
- 🔬 **Deep Dive**: [NeetCode — Sorting Algorithms](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Build Infinite Scroll](https://www.geeksforgeeks.org/infinite-scrolling-in-react/)
- 🎬 **Video**: [Sorting Algorithms — NeetCode](https://www.youtube.com/watch?v=MtQL_ll5KhQ)

**409. Memoization vs Tabulation ★ ★**

- 📖 **Official Docs**: [LeetCode — Binary Search Tag](https://leetcode.com/tag/binary-search/)
- 🔬 **Deep Dive**: [NeetCode — Binary Search](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Star Rating Component](https://www.geeksforgeeks.org/how-to-create-a-star-rating-in-react/)
- 🎬 **Video**: [Binary Search — NeetCode](https://www.youtube.com/watch?v=s4DPM8ct1pI)

**410. Classic DP — Climbing Stairs, Coin Change, LCS ★ ★**

- 📖 **Official Docs**: [Big-O Cheat Sheet](https://www.bigocheatsheet.com/)
- 🔬 **Deep Dive**: [NeetCode — Big-O Notation](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Build Data Table](https://www.geeksforgeeks.org/how-to-create-a-sortable-table-in-react/)
- 🎬 **Video**: [Big-O Notation — NeetCode](https://www.youtube.com/watch?v=BgLTDT03QtU)

### SEQUENCE 2️⃣5️⃣ — Practical System Design Problems

> Apply everything. Time yourself. Record yourself.

#### 🛠️ Module 25.1: UI Components (Machine Coding)

**411. Autocomplete Search — debounce, AbortController, ARIA**

- 📖 **Official Docs**: [GreatFrontEnd — Design a News Feed](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — News Feed System Design — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Build Drag and Drop](https://www.geeksforgeeks.org/drag-and-drop-in-javascript/)
- 🎬 **Video**: [News Feed System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**412. Infinite Scroll — IntersectionObserver, virtualisation**

- 📖 **Official Docs**: [GreatFrontEnd — Design an Autocomplete](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Autocomplete Design — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Multi-Step Form](https://www.geeksforgeeks.org/create-a-multi-step-form-using-react/)
- 🎬 **Video**: [Autocomplete System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**413. Notification System — queue, auto-dismiss, screen reader**

- 📖 **Official Docs**: [GreatFrontEnd — Design Chat Application](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Chat App Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Accordion Component](https://www.geeksforgeeks.org/how-to-build-accordion-in-react/)
- 🎬 **Video**: [Chat App System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**414. Drag-and-Drop List — HTML5 drag API, keyboard alternative**

- 📖 **Official Docs**: [GreatFrontEnd — Design a Dashboard](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Dashboard Design — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Toast Notification System](https://www.geeksforgeeks.org/how-to-create-toast-in-reactjs/)
- 🎬 **Video**: [Dashboard System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**415. Poll Widget**

- 📖 **Official Docs**: [GreatFrontEnd — Design an Infinite Scroll](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Infinite Scroll Implementation — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Build a Carousel](https://www.geeksforgeeks.org/how-to-create-an-image-carousel-in-react/)
- 🎬 **Video**: [Infinite Scroll — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**416. Image Carousel — keyboard, touch, ARIA**

- 📖 **Official Docs**: [GreatFrontEnd — Design Image Carousel](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Carousel Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Tic Tac Toe in React](https://www.geeksforgeeks.org/build-a-tic-tac-toe-game-using-react/)
- 🎬 **Video**: [Image Carousel — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**417. Date Picker with Accessibility ★ ★**

- 📖 **Official Docs**: [GreatFrontEnd — Design Notification System](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Notification Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Build File Explorer](https://www.geeksforgeeks.org/how-to-create-a-file-explorer-in-react/)
- 🎬 **Video**: [Notification System — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**418. Rich Text Editor (contenteditable) ★ ★**

- 📖 **Official Docs**: [GreatFrontEnd — Design a Modal System](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Modal Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Build Comment Thread](https://www.geeksforgeeks.org/nested-comments-in-react/)
- 🎬 **Video**: [Modal System — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**419. Virtual Scrolling Component from Scratch ★ ★**

- 📖 **Official Docs**: [GreatFrontEnd — Design a Form Builder](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Form Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Build Calendar Picker](https://www.geeksforgeeks.org/how-to-create-a-date-picker-in-react/)
- 🎬 **Video**: [Form Builder — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

#### 🧩 Module 25.2: Large System Designs

**420. Design Flipkart/Amazon Cart System — state, sync, persistence**

- 📖 **Official Docs**: [GreatFrontEnd — Design Data Grid](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Data Grid Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — System Design Interview Tips](https://www.geeksforgeeks.org/how-to-crack-system-design-round-in-interviews/)
- 🎬 **Video**: [Data Grid — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**421. Design LinkedIn-Style Feed — infinite scroll, real-time, performance**

- 📖 **Official Docs**: [GreatFrontEnd — Design Drag & Drop](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — DnD Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Requirements Gathering](https://www.geeksforgeeks.org/requirements-gathering-in-system-design/)
- 🎬 **Video**: [Drag and Drop — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**422. Design a Chat UI — WebSocket, reconnection, message ordering**

- 📖 **Official Docs**: [GreatFrontEnd — Design a Spreadsheet](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Spreadsheet UI Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — System Design Communication](https://www.geeksforgeeks.org/how-to-crack-system-design-round-in-interviews/)
- 🎬 **Video**: [Spreadsheet UI — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**423. Design Slack-Like Interface — channels, presence, notifications**

- 📖 **Official Docs**: [GreatFrontEnd — Design an E-commerce](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — E-commerce Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Drawing Architecture Diagrams](https://www.geeksforgeeks.org/how-to-draw-system-design-diagrams/)
- 🎬 **Video**: [E-commerce System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**424. Design Google Docs-Style Collaborative Editor ★ ★**

- 📖 **Official Docs**: [GreatFrontEnd — Design Email Client](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Email Client Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Handling Trade-offs in Interviews](https://www.geeksforgeeks.org/tradeoffs-in-system-design/)
- 🎬 **Video**: [Email Client Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**425. Design a File Upload System with Progress & Resume ★ ★**

- 📖 **Official Docs**: [GreatFrontEnd — Design Collaborative Editor](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Collaborative Editor Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Time Management in Interviews](https://www.geeksforgeeks.org/how-to-crack-system-design-round-in-interviews/)
- 🎬 **Video**: [Collaborative Editor — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**426. Design Cisco-Style Network Monitoring Dashboard ★ ★**

- 📖 **Official Docs**: [GreatFrontEnd — Design Video Player](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Video Player Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Scaling Discussion in Interviews](https://www.geeksforgeeks.org/how-to-crack-system-design-round-in-interviews/)
- 🎬 **Video**: [Video Player — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**427. Design Salesforce-Style CRM Record View ★ ★**

- 📖 **Official Docs**: [GreatFrontEnd — Design Maps Application](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Maps Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Handling Follow-up Questions](https://www.geeksforgeeks.org/how-to-crack-system-design-round-in-interviews/)
- 🎬 **Video**: [Maps System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**428. Design Adobe-Style Asset Manager ★ ★**

- 📖 **Official Docs**: [GreatFrontEnd — Design Calendar](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Calendar UI Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Whiteboard Coding Tips](https://www.geeksforgeeks.org/how-to-prepare-for-whiteboard-coding-interviews/)
- 🎬 **Video**: [Calendar System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**429. Design E-Commerce Frontend**

- 📖 **Official Docs**: [GreatFrontEnd — Design Social Media Feed](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Social Media Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Microsoft Interview Process](https://www.geeksforgeeks.org/microsoft-interview-preparation/)
- 🎬 **Video**: [Social Media Feed — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**430. Design a Live Dashboard**

- 📖 **Official Docs**: [GreatFrontEnd — Design File Upload](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — File Upload Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Adobe Interview Preparation](https://www.geeksforgeeks.org/adobe-interview-preparation/)
- 🎬 **Video**: [File Upload — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**431. Design a Comment System**

- 📖 **Official Docs**: [GreatFrontEnd — Design Multi-Step Wizard](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Multi-Step Wizard Architecture — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [Salesforce Trailhead — Developer Certification](https://trailhead.salesforce.com/credentials/developer)
- 🎬 **Video**: [Multi-Step Wizard — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

### SEQUENCE 2️⃣6️⃣ — Machine Coding ↔ Design Bridge

#### 🧠 Module 26.1: Design Thinking

**432. Component Decomposition**

- 📖 **Official Docs**: [Blog — Frontend Machine Coding — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding)
- 🔬 **Deep Dive**: [Blog — Machine Coding Tips — Dev.to](https://dev.to/devkant/how-to-crack-machine-coding-round-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Cisco Interview Preparation](https://www.geeksforgeeks.org/cisco-interview-preparation/)
- 🎬 **Video**: [Machine Coding Round — Piyush Garg](https://www.youtube.com/watch?v=oUk8DP_GgVg)

**433. State vs Props**

- 📖 **Official Docs**: [Blog — Vanilla JS Components — javascript.info](https://javascript.info/)
- 🔬 **Deep Dive**: [Blog — Build UI without Frameworks — Dev.to](https://dev.to/nickytonline/building-ui-without-frameworks-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Senior Engineer Expectations](https://www.geeksforgeeks.org/what-do-companies-expect-from-senior-engineers/)
- 🎬 **Video**: [Vanilla JS Components — Akshay Saini](https://www.youtube.com/watch?v=hP_pOIJfadg)

**434. Edge Case Handling**

- 📖 **Official Docs**: [Blog — DOM Manipulation — javascript.info](https://javascript.info/document)
- 🔬 **Deep Dive**: [Blog — DOM Performance — web.dev](https://web.dev/articles/dom-size-and-interactivity)
- 🎯 **Interview Prep**: [GeeksForGeeks — Bar Raiser / Hiring Committee](https://www.geeksforgeeks.org/what-is-a-bar-raiser-interview/)
- 🎬 **Video**: [DOM Manipulation — Akshay Saini](https://www.youtube.com/watch?v=hP_pOIJfadg)

**435. Accessibility-First Component Design ★ ★**

- 📖 **Official Docs**: [MDN — EventTarget API](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)
- 🔬 **Deep Dive**: [Blog — Custom Event System — javascript.info](https://javascript.info/dispatch-events)
- 🎯 **Interview Prep**: [GeeksForGeeks — Code Quality in Interviews](https://www.geeksforgeeks.org/how-to-write-clean-code/)
- 🎬 **Video**: [Custom Event System — Akshay Saini](https://www.youtube.com/watch?v=hP_pOIJfadg)

#### ⚙️ Module 26.2: Code Quality

**436. Performance-Aware Components**

- 📖 **Official Docs**: [MDN — localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- 🔬 **Deep Dive**: [Blog — State Without Frameworks — javascript.info](https://javascript.info/localstorage)
- 🎯 **Interview Prep**: [GeeksForGeeks — Design Doc Writing](https://www.geeksforgeeks.org/how-to-write-a-design-document/)
- 🎬 **Video**: [State Without Frameworks — Akshay Saini](https://www.youtube.com/watch?v=hP_pOIJfadg)

**437. Reusability & Extensibility**

- 📖 **Official Docs**: [Blog — Debounce & Throttle — javascript.info](https://javascript.info/settimeout-setinterval)
- 🔬 **Deep Dive**: [Blog — Debounce Throttle — web.dev](https://web.dev/articles/debounce-throttle)
- 🎯 **Interview Prep**: [GeeksForGeeks — System Design Presentation](https://www.geeksforgeeks.org/how-to-crack-system-design-round-in-interviews/)
- 🎬 **Video**: [Debounce & Throttle — Akshay Saini](https://www.youtube.com/watch?v=Zo-6_qx8uxg)

**438. Interview-Friendly Code Style**

- 📖 **Official Docs**: [Blog — Polyfills — javascript.info](https://javascript.info/polyfills)
- 🔬 **Deep Dive**: [Blog — Writing Polyfills — Dev.to](https://dev.to/nickytonline/writing-javascript-polyfills-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Debugging in Interviews](https://www.geeksforgeeks.org/debugging-tips-for-interviews/)
- 🎬 **Video**: [Polyfills — Akshay Saini](https://www.youtube.com/watch?v=Ji6NHEnNHcg)

**439. TypeScript Typing in Machine Coding Rounds ★ ★**

- 📖 **Official Docs**: [Blog — Promise.all Implementation — javascript.info](https://javascript.info/promise-api)
- 🔬 **Deep Dive**: [Blog — Implement Promises — Dev.to](https://dev.to/nickytonline/implementing-promises-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Cross-Browser Compatibility](https://www.geeksforgeeks.org/cross-browser-testing/)
- 🎬 **Video**: [Promise.all Polyfill — Akshay Saini](https://www.youtube.com/watch?v=Ji6NHEnNHcg)

#### 🔁 Module 26.3: Evolution

**440. Whiteboard → Code**

- 📖 **Official Docs**: [MDN — Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- 🔬 **Deep Dive**: [Blog — API Layer Design — Dev.to](https://dev.to/nickytonline/api-layer-design-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — STAR Method for Interviews](https://www.geeksforgeeks.org/star-method-for-behavioral-interviews/)
- 🎬 **Video**: [API Layer Pattern — Akshay Saini](https://www.youtube.com/watch?v=hP_pOIJfadg)

**441. Incremental Refactoring**

- 📖 **Official Docs**: [Blog — Accessibility in Components — web.dev](https://web.dev/accessibility)
- 🔬 **Deep Dive**: [Blog — Accessible React Components — LogRocket](https://blog.logrocket.com/a11y-react/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Behavioral Interview Questions](https://www.geeksforgeeks.org/behavioral-interview-questions/)
- 🎬 **Video**: [Accessible Components — Google Chrome Developers](https://www.youtube.com/watch?v=cOmehxAU_4s)

**442. Handling Unknown Requirements**

- 📖 **Official Docs**: [Blog — Machine Coding Practice — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding)
- 🔬 **Deep Dive**: [Blog — Frontend Round Practice — Dev.to](https://dev.to/devkant/how-to-crack-machine-coding-round-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Leadership Principles (Amazon)](https://www.geeksforgeeks.org/amazon-leadership-principles/)
- 🎬 **Video**: [Machine Coding Practice — Piyush Garg](https://www.youtube.com/watch?v=oUk8DP_GgVg)

**443. Talking Through Trade-offs While Coding ★ ★**

- 📖 **Official Docs**: [Blog — Timed Coding Strategy — GreatFrontEnd](https://www.greatfrontend.com/prepare/coding)
- 🔬 **Deep Dive**: [Blog — Time Management in Coding Rounds — Dev.to](https://dev.to/devkant/how-to-crack-machine-coding-round-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Conflict Resolution in Interviews](https://www.geeksforgeeks.org/how-to-answer-conflict-resolution-interview-questions/)
- 🎬 **Video**: [Coding Round Strategy — Piyush Garg](https://www.youtube.com/watch?v=oUk8DP_GgVg)

### SEQUENCE 2️⃣7️⃣ — Interview Strategy

#### 🎯 Module 27.1: Interview Flow

**444. How to Start a System Design Interview**

- 📖 **Official Docs**: [Blog — Tech Interview Handbook — Resume](https://www.techinterviewhandbook.org/resume/)
- 🔬 **Deep Dive**: [Blog — Resume Tips for Engineers — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Tell Me About Yourself](https://www.geeksforgeeks.org/how-to-answer-tell-me-about-yourself/)
- 🎬 **Video**: [Resume Tips — Clément Mihailescu](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**445. Requirement Clarification Framework**

- 📖 **Official Docs**: [Blog — Tech Interview Handbook — Algorithms](https://www.techinterviewhandbook.org/algorithms/study-cheatsheet/)
- 🔬 **Deep Dive**: [Blog — Algo Study Plan — NeetCode](https://neetcode.io/roadmap)
- 🎯 **Interview Prep**: [GeeksForGeeks — Why Should We Hire You](https://www.geeksforgeeks.org/how-to-answer-why-should-we-hire-you/)
- 🎬 **Video**: [DSA Study Plan — NeetCode](https://www.youtube.com/watch?v=SVvr3ZjtjI8)

**446. Architecture Drawing — Tools & Technique**

- 📖 **Official Docs**: [Blog — Frontend SD Framework — GreatFrontEnd](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — SD Framework — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Strengths and Weaknesses](https://www.geeksforgeeks.org/how-to-answer-what-are-your-strengths-and-weaknesses/)
- 🎬 **Video**: [System Design Framework — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**447. Time Boxing Each Section ★ ★**

- 📖 **Official Docs**: [Blog — Communication in Interviews — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook)
- 🔬 **Deep Dive**: [Blog — Interview Communication — Dev.to](https://dev.to/nickytonline/interview-communication-tips-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Leading Without Authority](https://www.geeksforgeeks.org/how-to-demonstrate-leadership-in-interviews/)
- 🎬 **Video**: [Interview Communication — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

#### 💬 Module 27.2: Communication

**448. Explaining Trade-offs Clearly**

- 📖 **Official Docs**: [Blog — Whiteboard Interview — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook)
- 🔬 **Deep Dive**: [Blog — Whiteboard Tips — Dev.to](https://dev.to/nickytonline/whiteboard-interview-tips-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Mentorship Stories](https://www.geeksforgeeks.org/how-to-answer-mentorship-interview-questions/)
- 🎬 **Video**: [Whiteboard Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**449. Handling Performance Questions**

- 📖 **Official Docs**: [Blog — Follow-Up Questions — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook)
- 🔬 **Deep Dive**: [Blog — Handling Follow-Ups — Dev.to](https://dev.to/nickytonline/handling-follow-up-questions-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Technical Decision Making](https://www.geeksforgeeks.org/how-to-answer-technical-decision-making-interview-questions/)
- 🎬 **Video**: [Handling Follow-Ups — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**450. Scale & Edge Cases**

- 📖 **Official Docs**: [Blog — Scope Management — GreatFrontEnd](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Scoping in SD Interviews — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Dealing with Ambiguity](https://www.geeksforgeeks.org/how-to-deal-with-ambiguity-interview/)
- 🎬 **Video**: [Scoping in System Design — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**451. Recovering When You Don't Know the Answer ★ ★**

- 📖 **Official Docs**: [Blog — Trade-offs in SD — GreatFrontEnd](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Explaining Trade-offs — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Cross-Team Collaboration](https://www.geeksforgeeks.org/how-to-answer-teamwork-interview-questions/)
- 🎬 **Video**: [Trade-offs — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

#### ✅ Module 27.3: Closure

**452. Common Mistakes Senior Engineers Make**

- 📖 **Official Docs**: [Blog — Diagram Techniques — GreatFrontEnd](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Diagramming in SD — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Prioritization & Time Management](https://www.geeksforgeeks.org/how-to-answer-prioritization-interview-questions/)
- 🎬 **Video**: [Diagramming in SD — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**453. Closing Strong — How to End a System Design Round**

- 📖 **Official Docs**: [Blog — SD Practice — GreatFrontEnd](https://www.greatfrontend.com/system-design)
- 🔬 **Deep Dive**: [Blog — Mock SD Interview — frontendatscale.com](https://frontendatscale.com/blog/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Failure Stories for Interviews](https://www.geeksforgeeks.org/how-to-answer-tell-me-about-a-time-you-failed/)
- 🎬 **Video**: [Mock SD Interview — Chirag Goel](https://www.youtube.com/watch?v=5vyKhm2NTfw)

**454. Questions to Ask Your Interviewer ★ ★**

- 📖 **Official Docs**: [Blog — Mock Interview Practice — Pramp](https://www.pramp.com/)
- 🔬 **Deep Dive**: [Blog — Self-Mock Strategy — Dev.to](https://dev.to/nickytonline/mock-interview-strategy-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Negotiating Offers](https://www.geeksforgeeks.org/salary-negotiation-tips/)
- 🎬 **Video**: [Mock Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

---

## 👑 PHASE 10 — LEADERSHIP & FINAL PREP

*Weeks 11–12 | Mock interviews, behavioural stories, FAANG expectations.*

### SEQUENCE 2️⃣8️⃣ — FAANG-Level Expectations

#### 🧠 Module 28.1: Senior → Staff

**455. Senior vs Staff Expectations**

- 📖 **Official Docs**: [Levels.fyi — Company Levels](https://www.levels.fyi/)
- 🔬 **Deep Dive**: [Blog — Big Tech Expectations — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🎯 **Interview Prep**: [levels.fyi — Compensation Data](https://www.levels.fyi/)
- 🎬 **Video**: [FAANG Expectations — Clément Mihailescu](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**456. Architecture Ownership**

- 📖 **Official Docs**: [Blog — Microsoft Interview — Levels.fyi](https://www.levels.fyi/companies/microsoft)
- 🔬 **Deep Dive**: [Blog — Microsoft Culture — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Mock Interview Practice](https://www.geeksforgeeks.org/mock-interview-tips/)
- 🎬 **Video**: [Microsoft Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**457. Technical Vision & Roadmap Planning ★ ★**

- 📖 **Official Docs**: [Blog — Adobe Interview — Levels.fyi](https://www.levels.fyi/companies/adobe)
- 🔬 **Deep Dive**: [Blog — Adobe Culture — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Technical Interview Preparation](https://www.geeksforgeeks.org/how-to-prepare-for-technical-interviews/)
- 🎬 **Video**: [Adobe Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

#### 🤝 Module 28.2: Leadership

**458. Cross-Team Collaboration**

- 📖 **Official Docs**: [Blog — Salesforce Interview — Levels.fyi](https://www.levels.fyi/companies/salesforce)
- 🔬 **Deep Dive**: [Blog — Salesforce Culture — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Company Research for Interviews](https://www.geeksforgeeks.org/how-to-research-a-company-before-interview/)
- 🎬 **Video**: [Salesforce Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**459. Cost vs Performance Trade-offs at Scale**

- 📖 **Official Docs**: [Blog — Cisco Interview — Levels.fyi](https://www.levels.fyi/companies/cisco)
- 🔬 **Deep Dive**: [Blog — Cisco Culture — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Asking Great Questions](https://www.geeksforgeeks.org/questions-to-ask-interviewer/)
- 🎬 **Video**: [Cisco Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**460. Mentorship & Growing Junior Engineers**

- 📖 **Official Docs**: [Blog — Salary Negotiation — Levels.fyi](https://www.levels.fyi/)
- 🔬 **Deep Dive**: [Blog — Negotiation Guide — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Interview Day Tips](https://www.geeksforgeeks.org/tips-for-interview-day/)
- 🎬 **Video**: [Salary Negotiation — Clément Mihailescu](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**461. Influencing Without Authority ★ ★**

- 📖 **Official Docs**: [Blog — Multiple Offers Strategy — Levels.fyi](https://www.levels.fyi/)
- 🔬 **Deep Dive**: [Blog — Competing Offers — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🎯 **Interview Prep**: [GeeksForGeeks — Virtual Interview Tips](https://www.geeksforgeeks.org/virtual-interview-tips/)
- 🎬 **Video**: [Multiple Offers — Clément Mihailescu](https://www.youtube.com/watch?v=gFt0pGb0fIY)

#### 🚨 Module 28.3: Production Mindset

**462. Production Incidents — Frontend On-Call**

- 📖 **Official Docs**: [Blog — Remote Interview Tips — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook)
- 🔬 **Deep Dive**: [Blog — Remote Interview — Dev.to](https://dev.to/nickytonline/remote-interview-tips-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Portfolio Presentation](https://www.geeksforgeeks.org/how-to-build-developer-portfolio/)
- 🎬 **Video**: [Remote Interview Tips — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**463. Frontend Cost Awareness**

- 📖 **Official Docs**: [Blog — Take-Home Assignment Tips — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook)
- 🔬 **Deep Dive**: [Blog — Take-Home Strategy — Dev.to](https://dev.to/nickytonline/take-home-assignment-tips-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Resume for Software Engineers](https://www.geeksforgeeks.org/how-to-write-a-resume-for-software-engineer/)
- 🎬 **Video**: [Take-Home Tips — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**464. Privacy & GDPR in Frontend**

- 📖 **Official Docs**: [Blog — Post-Interview Follow-Up — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook)
- 🔬 **Deep Dive**: [Blog — Follow-Up Emails — Dev.to](https://dev.to/nickytonline/post-interview-follow-up-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — LinkedIn Optimization](https://www.geeksforgeeks.org/how-to-optimize-linkedin-profile/)
- 🎬 **Video**: [Post-Interview — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**465. Incident Postmortems — How to Write & Present**

- 📖 **Official Docs**: [Blog — Big Tech Culture Match — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🔬 **Deep Dive**: [Blog — Culture Fit — Dev.to](https://dev.to/nickytonline/culture-fit-in-interviews-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Referral Networking](https://www.geeksforgeeks.org/how-to-get-referral-for-job/)
- 🎬 **Video**: [Culture Fit — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**466. SLO / SLA Awareness for Frontend Engineers ★ ★**

- 📖 **Official Docs**: [Blog — Onboarding Plan — Gergely Orosz](https://newsletter.pragmaticengineer.com/)
- 🔬 **Deep Dive**: [Blog — First 90 Days — Dev.to](https://dev.to/nickytonline/first-90-days-at-big-tech-5c3i)
- 🎯 **Interview Prep**: [GeeksForGeeks — Project Complexity Stories](https://www.geeksforgeeks.org/how-to-discuss-projects-in-interview/)
- 🎬 **Video**: [First 90 Days — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

### SEQUENCE 2️⃣9️⃣ — Behavioural & Leadership Round ★

> Microsoft's 'As Appropriate' round is entirely this. Most candidates underprepare.

#### ⭐ Module 29.1: STAR Framework

**467. STAR Method — Situation, Task, Action, Result ★ ★**

- 📖 **Official Docs**: [Blog — STAR Method — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — STAR Framework — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Ownership & Accountability](https://www.geeksforgeeks.org/amazon-leadership-principles/)
- 🎬 **Video**: [STAR Method — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**468. Adding Growth Mindset to Every Story — 'What I'd Do Differently' ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Tell Me About Yourself — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Innovation Stories](https://www.geeksforgeeks.org/how-to-answer-innovation-interview-questions/)
- 🎬 **Video**: [Tell Me About Yourself — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**469. Keeping Stories Under 2.5 Minutes ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Conflict Resolution — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Customer Obsession Examples](https://www.geeksforgeeks.org/amazon-leadership-principles/)
- 🎬 **Video**: [Conflict Resolution — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**470. Quantifying Impact in Behavioural Stories ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Leadership Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Bias for Action Stories](https://www.geeksforgeeks.org/amazon-leadership-principles/)
- 🎬 **Video**: [Leadership Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

#### 🎯 Module 29.2: Your 8 Core Stories

**471. Story 1 — Lighthouse 60 → 95: Technical depth, delivered results ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Failure Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Earn Trust Examples](https://www.geeksforgeeks.org/amazon-leadership-principles/)
- 🎬 **Video**: [Failure Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**472. Story 2 — WCAG AA Certification: Quality, customer obsession ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Achievement Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — WCAG Accessibility Interview Questions](https://www.geeksforgeeks.org/web-content-accessibility-guidelines-wcag/)
- 🎬 **Video**: [Achievement Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**473. Story 3 — 80% Security Vulnerability Reduction: Ownership, proactiveness ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Performance Improvements — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [OWASP — Security Vulnerability Prevention](https://owasp.org/www-project-top-ten/)
- 🎬 **Video**: [Performance Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**474. Story 4 — Mentoring 4 Engineers: Leadership, scaling yourself ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Cross-Team Collaboration — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — How to Answer Mentorship Questions](https://www.geeksforgeeks.org/how-to-answer-mentorship-interview-questions/)
- 🎬 **Video**: [Cross-Team Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**475. Story 5 — Micro-Frontend Architecture: System thinking, judgement ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Mentorship Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Micro-Frontend Architecture](https://www.geeksforgeeks.org/micro-frontend-architecture/)
- 🎬 **Video**: [Mentorship Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**476. Story 6 — Bosch Dashboard Delivery Under Deadline: Pressure, reliability ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Technical Decisions — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Working Under Pressure Interview](https://www.geeksforgeeks.org/how-to-answer-tell-me-about-a-time-you-worked-under-pressure/)
- 🎬 **Video**: [Technical Decisions — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**477. Story 7 — Cross-Team Module Delivery: Collaboration, influence without authority ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Ownership Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Cross-Team Collaboration Stories](https://www.geeksforgeeks.org/how-to-answer-teamwork-interview-questions/)
- 🎬 **Video**: [Ownership Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**478. Story 8 — Excellence in Frontend Engineering Award: Impact recognition ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Growth Mindset — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Discussing Awards in Interviews](https://www.geeksforgeeks.org/how-to-discuss-projects-in-interview/)
- 🎬 **Video**: [Growth Mindset — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

#### 🏢 Module 29.3: Company-Specific Behavioural Values

**479. Microsoft — Growth Mindset, Clarity, Energy, Success of Others ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Stakeholder Management — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [Microsoft — Growth Mindset Culture](https://www.geeksforgeeks.org/microsoft-interview-preparation/)
- 🎬 **Video**: [Stakeholder Management — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**480. Adobe — Craft, Innovation, Genuine, Exceptional ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Ambiguity Handling — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Adobe Interview Values](https://www.geeksforgeeks.org/adobe-interview-preparation/)
- 🎬 **Video**: [Handling Ambiguity — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**481. Salesforce — Trust, Customer Success, Innovation, Equality ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Deadline Pressure — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [Salesforce Trailhead — Company Values](https://trailhead.salesforce.com/content/learn/modules/manage-the-sfdc-way)
- 🎬 **Video**: [Deadline Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**482. Cisco — Integrity, Trust, Collaboration, Innovation ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Innovation Stories — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Cisco Interview Preparation](https://www.geeksforgeeks.org/cisco-interview-preparation/)
- 🎬 **Video**: [Innovation Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

#### 💰 Module 29.4: Compensation & Negotiation

**483. How to Respond to an Offer Without Weakening Your Position ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Feedback Giving/Receiving — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Salary Negotiation Tips](https://www.geeksforgeeks.org/salary-negotiation-tips/)
- 🎬 **Video**: [Feedback Stories — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**484. Counter-Offering — Anchoring, Justification, Timeline ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Why This Company — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [GeeksForGeeks — Counter-Offer Strategies](https://www.geeksforgeeks.org/salary-negotiation-tips/)
- 🎬 **Video**: [Why This Company — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**485. Base vs Equity vs Bonus Trade-offs at Each Company ★ ★**

- 📖 **Official Docs**: [Blog — Behavioral Interview — Tech Interview Handbook](https://www.techinterviewhandbook.org/behavioral-interview/)
- 🔬 **Deep Dive**: [Blog — Where Do You See Yourself — GreatFrontEnd](https://www.greatfrontend.com/behavioral-interview-guidebook)
- 🎯 **Interview Prep**: [levels.fyi — Compensation Comparison](https://www.levels.fyi/)
- 🎬 **Video**: [Career Vision — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

**486. Using Levels.fyi Data in Negotiation ★ ★**

- 📖 **Official Docs**: [Blog — Final Interview Prep — Tech Interview Handbook](https://www.techinterviewhandbook.org/)
- 🔬 **Deep Dive**: [Blog — Interview Day Checklist — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-guidebook)
- 🎯 **Interview Prep**: [levels.fyi — Using Comp Data in Negotiation](https://www.levels.fyi/blog/)
- 🎬 **Video**: [Final Prep — Exponent](https://www.youtube.com/watch?v=gFt0pGb0fIY)

---


---

> 📋 **Interview Experiences (886 stories)** moved to [INTERVIEW_EXPERIENCES.md](INTERVIEW_EXPERIENCES.md)
