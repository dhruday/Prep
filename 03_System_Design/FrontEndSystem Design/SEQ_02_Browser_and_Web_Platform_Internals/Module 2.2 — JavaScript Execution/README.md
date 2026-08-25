# Module 2.2 — JavaScript Execution

> How does JavaScript run, what can block it, and how do you escape the main thread?

---

## Topics

| # | Topic | File |
|---|-------|------|
| 12 | JavaScript Execution Model | [12_JavaScript_Execution_Model.md](./12_JavaScript_Execution_Model.md) |
| 13 | Event Loop (Microtasks vs Macrotasks) | [13_Event_Loop_Microtasks_vs_Macrotasks.md](./13_Event_Loop_Microtasks_vs_Macrotasks.md) |
| 14 | Main Thread vs Worker Threads | [14_Main_Thread_vs_Worker_Threads.md](./14_Main_Thread_vs_Worker_Threads.md) |
| 15 | Web Workers, Service Workers, Worklets | [15_Web_Workers_Service_Workers_Worklets.md](./15_Web_Workers_Service_Workers_Worklets.md) |

---

## Core Concepts

- **Single-threaded V8 engine** — JS runs on one thread; blocking it blocks everything
- **Call Stack** — LIFO execution of function calls
- **Event Loop** — The mechanism that coordinates the call stack with the task queues
- **Microtask Queue** — Promises, `queueMicrotask()` — drained completely before next task
- **Macrotask Queue** — `setTimeout`, `setInterval`, I/O — one per event loop tick
- **Web Workers** — True background threads for CPU-heavy computation
- **Service Workers** — Proxy workers for network interception, caching, offline
- **Worklets** — Lightweight workers for Paint, Audio, and Animation APIs

## Why It Matters in Interviews

- Explains why a 200ms synchronous loop makes the UI unresponsive
- Explains why Promise callbacks run before `setTimeout(fn, 0)`
- Justifies architectural decisions like moving compression to a Web Worker
- Justifies Service Worker as the backbone of PWA and offline-first architecture
