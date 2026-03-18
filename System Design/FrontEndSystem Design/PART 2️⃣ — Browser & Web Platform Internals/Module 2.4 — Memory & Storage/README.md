# Module 2.4 — Memory & Storage

> How does the browser manage memory, and what persistence mechanisms are available?

---

## Topics

| # | Topic | File |
|---|-------|------|
| 19 | Memory Management in Browser | [19_Memory_Management_in_Browser.md](./19_Memory_Management_in_Browser.md) |
| 20 | Browser Storage Options Overview | [20_Browser_Storage_Options_Overview.md](./20_Browser_Storage_Options_Overview.md) |

---

## Core Concepts

- **Garbage Collection (Mark-and-Sweep)** — V8's GC strategy and stop-the-world pauses
- **Memory Leaks** — Detached DOM nodes, closures over large scopes, forgotten event listeners
- **Heap Snapshots** — Chrome DevTools memory profiling workflow
- **LocalStorage** — Synchronous, string-only, 5MB, per-origin
- **SessionStorage** — Same API as LocalStorage, cleared when tab closes
- **IndexedDB** — Async, transactional, queryable, supports large binary data
- **Cache API** — Service Worker controlled, stores Request/Response pairs
- **Cookies** — Sent with every HTTP request, used for auth tokens
- **Origin Private File System (OPFS)** — High-performance file storage for web apps

## Why It Matters in Interviews

- Explains why SPAs are prone to memory leaks (components unmount but listeners remain)
- Explains why you should never store JWTs in LocalStorage (XSS accessible)
- Informs storage strategy decisions in offline-first design
- Explains trade-offs between IndexedDB and Cache API for offline scenarios
