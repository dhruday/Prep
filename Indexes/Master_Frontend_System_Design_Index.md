# 🏆 MASTER FRONTEND SYSTEM DESIGN INDEX
## Namaste FSD Course + Google · Microsoft · Adobe · Cisco · Atlassian · Intuit · Salesforce

---

## 🔑 LEGEND

| Symbol | Meaning |
|---|---|
| ✅ | Covered in Namaste Frontend System Design course |
| ⭐ | High Priority — frequently asked across companies |
| 🟣 | Google |
| 🔵 | Microsoft |
| 🔴 | Adobe |
| 🟠 | Cisco |
| 🟡 | Atlassian |
| 🟢 | Intuit |
| 🔷 | Salesforce |
| 🌐 | All companies |

---

## CHAPTER 1 — BROWSER INTERNALS & JavaScript ENGINE

### 1.1 Browser Architecture
| Topic | Priority | Companies |
|---|---|---|
| How the Web Works — full request lifecycle | ✅⭐ | 🌐 |
| HTML Parsing vs CSS Parsing | ✅⭐ | 🌐 |
| DOM vs BOM | ✅⭐ | 🌐 |
| Real DOM vs Virtual DOM | ✅⭐ | 🌐 |
| Real DOM vs Shadow DOM | ✅⭐ | 🌐 |
| Critical Rendering Path | ⭐ | 🌐 |
| Reflow & Repaint — how to avoid | ✅⭐ | 🌐 |
| Webpage Rendering Cycle | ✅⭐ | 🌐 |
| Compositing layers — will-change, transform, opacity | ⭐ | 🟣🔵 |
| CSS Containment (contain property) | | 🟣🔵 |
| Browser Event Loop — call stack, task queue, microtask queue | ⭐ | 🌐 |
| Macro vs Microtasks (Promise, queueMicrotask) | ⭐ | 🌐 |
| requestAnimationFrame vs setTimeout | ⭐ | 🌐 |
| Web APIs and their thread model | | 🌐 |

### 1.2 JavaScript Engine (V8)
| Topic | Priority | Companies |
|---|---|---|
| JIT Compilation — Interpreter → Profiler → Compiler | ⭐ | 🟣🔵 |
| V8 internals — Ignition + Turbofan pipeline | | 🟣 |
| Hidden classes & inline caching | | 🟣 |
| Memory management & Garbage Collection (Mark & Sweep) | ⭐ | 🟣🔵 |
| Memory leaks — common patterns, detection & fix | ⭐ | 🟣🔵🌐 |
| Stack vs Heap memory | ⭐ | 🌐 |

### 1.3 CSS Deep Dive
| Topic | Priority | Companies |
|---|---|---|
| CSS Positioning | ✅⭐ | 🌐 |
| CSS Specificity & Cascade | ⭐ | 🌐 |
| CSS Custom Properties (Design Tokens) | ⭐ | 🔵🔴🟡 |
| BEM, CSS Modules, CSS-in-JS, Tailwind — trade-offs | ⭐ | 🌐 |
| CSS Grid vs Flexbox — when to use what | ⭐ | 🌐 |
| CSS Animations vs Web Animations API | ⭐ | 🔴 |
| Responsive Design (mobile-first, container queries) | ⭐ | 🟢🔷🌐 |
| RTL (Right-to-Left) layout support | ⭐ | 🌐 |
| Print CSS | | 🟢 |

---

## CHAPTER 2 — JAVASCRIPT DEEP DIVE

### 2.1 Core Concepts (Every company asks these)
| Topic | Priority | Companies |
|---|---|---|
| Closures & Lexical Scope | ⭐ | 🌐 |
| Prototypal Inheritance & Prototype Chain | ⭐ | 🌐 |
| Event Delegation, Bubbling & Capturing | ⭐ | 🌐 |
| `this` binding — call, apply, bind | ⭐ | 🌐 |
| Currying & Composition | ⭐ | 🌐 |
| Generators & Iterators | | 🔵🟣 |
| Async/Await internals (built on Promises) | ⭐ | 🌐 |
| Promise.all, race, allSettled, any | ⭐ | 🌐 |
| WeakMap, WeakSet, WeakRef | | 🔵🟣 |
| Proxy & Reflect (meta-programming) | | 🔷🔵 |
| Symbols | ⭐ | 🌐 |
| ESM vs CJS vs UMD modules | ⭐ | 🌐 |
| Memoization patterns | ⭐ | 🌐 |
| Debounce — implement from scratch | ⭐ | 🌐 |
| Throttle — implement from scratch | ⭐ | 🌐 |
| Deep clone (structured clone vs JSON) | ⭐ | 🌐 |
| Functional programming (pure functions, immutability) | ⭐ | 🌐 |
| Error handling patterns & custom error classes | ⭐ | 🌐 |
| Event Emitter / PubSub — implement from scratch | ⭐ | 🌐 |
| Observable / reactive stream basics | ⭐ | 🟡🔷 |

### 2.2 TypeScript (Microsoft, Adobe, Atlassian heavily test this)
| Topic | Priority | Companies |
|---|---|---|
| type vs interface — when to use | ⭐ | 🔵🟡🔴 |
| Generics | ⭐ | 🔵🟡 |
| Utility Types — Partial, Required, Readonly, Pick, Omit, Record | ⭐ | 🔵🟡 |
| Union & Intersection types | ⭐ | 🔵🟡 |
| Discriminated unions / type narrowing | ⭐ | 🔵🟡 |
| Enums vs const enums vs string literals | | 🔵 |
| Declaration files (.d.ts) | | 🔵🟡 |
| strictNullChecks, noImplicitAny — strict mode | ⭐ | 🔵 |
| TypeScript with React (props, events, hooks) | ⭐ | 🔵🟡🔴 |
| Mapped types | ⭐ | 🔵 |
| Conditional types & infer keyword | | 🔵 |
| API contract design — OpenAPI ↔ TypeScript types | ⭐ | 🔵🟡 |
| Module augmentation | | 🔵 |

---

## CHAPTER 3 — NETWORKING

### 3.1 Core Networking
| Topic | Priority | Companies |
|---|---|---|
| DNS resolution process — full flow | ⭐ | 🌐 |
| TCP vs UDP | ⭐ | 🌐 |
| TLS/SSL handshake process | ⭐ | 🌐 |
| HTTP/1.1 vs HTTP/2 (multiplexing) vs HTTP/3 (QUIC) | ⭐ | 🌐 |
| HTTP Methods & Status Codes | ✅⭐ | 🌐 |
| HTTP Request/Response & Headers | ✅⭐ | 🌐 |
| REST APIs — principles, best practices, versioning | ✅⭐ | 🌐 |
| GraphQL — queries, mutations, subscriptions, schema | ✅⭐ | 🌐 |
| gRPC — use cases vs REST | ✅⭐ | 🔵🟣 |
| CDN — edge caching, purging, origin shield | ⭐ | 🌐 |
| DNS prefetch, preconnect, preload, prefetch | ⭐ | 🟣🔵🌐 |
| CORS in depth | ✅⭐ | 🌐 |
| HTTP Caching — Cache-Control, ETag, Last-Modified | ✅⭐ | 🌐 |
| Request batching & deduplication | ⭐ | 🟡🔷 |
| Retry logic with exponential backoff | ⭐ | 🔵🟠 |
| Circuit breaker pattern (frontend side) | | 🔵🟠 |
| API versioning strategies | ⭐ | 🌐 |
| Rate limiting on frontend | ⭐ | 🌐 |
| Network waterfall — reading DevTools Network tab | ⭐ | 🌐 |

---

## CHAPTER 4 — COMMUNICATION PROTOCOLS

### 4.1 Real-Time Communication
| Topic | Priority | Companies |
|---|---|---|
| Communication Overview | ✅⭐ | 🌐 |
| Short Polling | ✅⭐ | 🌐 |
| Long Polling | ✅⭐ | 🌐 |
| Web Sockets — bidirectional, use cases | ✅⭐ | 🌐 |
| Server-Sent Events (SSE) | ✅⭐ | 🌐 |
| Webhooks | ✅⭐ | 🌐 |
| WebRTC — P2P video/audio | ✅⭐ | 🟠🔵 |
| WebRTC — STUN, TURN, ICE negotiation, SDP | ⭐ | 🟠 |
| Polling vs WebSocket vs SSE — trade-offs | ⭐ | 🌐 |
| Connection resilience — reconnect logic, heartbeats | | 🟠🟡 |
| Message Queue patterns (frontend side) | | 🟠🔷 |

---

## CHAPTER 5 — SECURITY

### 5.1 Core Security (All companies)
| Topic | Priority | Companies |
|---|---|---|
| Security Overview | ✅⭐ | 🌐 |
| XSS (Cross-Site Scripting) — stored, reflected, DOM | ✅⭐ | 🌐 |
| CSRF (Cross-Site Request Forgery) | ✅⭐ | 🌐 |
| iFrame Protection / Clickjacking | ✅⭐ | 🌐 |
| Security Headers (CSP, HSTS, X-Frame-Options, X-Content-Type) | ✅⭐ | 🌐 |
| Client-Side Security | ✅⭐ | 🌐 |
| HTTPS / Secure Communication | ✅⭐ | 🌐 |
| Dependency Security (npm audit, Snyk) | ✅⭐ | 🌐 |
| Subresource Integrity (SRI) | ✅ | 🌐 |
| Input Validation & Sanitization | ✅⭐ | 🌐 |
| SSRF (Server-Side Request Forgery) | ✅ | 🌐 |
| SSJI (Server-Side JavaScript Injection) | ✅ | 🌐 |
| Feature Policy / Permissions-Policy | ✅ | 🌐 |
| CORS | ✅⭐ | 🌐 |
| Compliance & Regulations (GDPR, CCPA, SOC 2) | ✅⭐ | 🌐 |
| Security Testing | ✅⭐ | 🌐 |
| Third-party script security | ⭐ | 🌐 |

### 5.2 Authentication & Authorization
| Topic | Priority | Companies |
|---|---|---|
| Authentication vs Authorization | ✅⭐ | 🌐 |
| OAuth 2.0 — Auth Code, PKCE, Client Credentials flows | ⭐ | 🌐 |
| OpenID Connect (OIDC) | ⭐ | 🌐 |
| JWT — structure, RS256 vs HS256, expiry, refresh tokens | ⭐ | 🌐 |
| Session management — cookie vs token-based | ⭐ | 🌐 |
| Secure cookie attributes (HttpOnly, Secure, SameSite) | ⭐ | 🌐 |
| SSO (Single Sign-On) implementation | ⭐ | 🔵🔷🌐 |
| SAML vs OAuth vs OIDC | | 🔵🔷 |
| PCI-DSS compliance basics | | 🟢🔷 |
| Secrets management (never in frontend code) | ⭐ | 🌐 |

---

## CHAPTER 6 — PERFORMANCE & OPTIMIZATION

### 6.1 Performance Fundamentals
| Topic | Priority | Companies |
|---|---|---|
| Performance Overview & Importance | ✅⭐ | 🌐 |
| Performance Monitoring & Tools | ✅⭐ | 🌐 |
| Lighthouse, WebPageTest, Chrome DevTools | ✅⭐ | 🌐 |
| Core Web Vitals — LCP, INP, CLS | ⭐ | 🟣🌐 |
| TTFB (Time to First Byte) | ⭐ | 🌐 |
| FCP (First Contentful Paint) | ⭐ | 🌐 |
| TTI (Time to Interactive) | ⭐ | 🌐 |
| Performance Budgets & CI enforcement | ⭐ | 🟣🔵 |

### 6.2 Rendering Patterns
| Topic | Priority | Companies |
|---|---|---|
| Rendering Patterns overview | ✅⭐ | 🌐 |
| SSR — Server-Side Rendering | ⭐ | 🌐 |
| SSG — Static Site Generation | ⭐ | 🌐 |
| CSR — Client-Side Rendering | ⭐ | 🌐 |
| ISR — Incremental Static Regeneration | ⭐ | 🌐 |
| Hydration, Partial Hydration, Progressive Hydration | ⭐ | 🔵🟣 |
| Streaming SSR (React 18) | ⭐ | 🔵🟣 |
| React Server Components (RSC) | ⭐ | 🔵🟣 |
| SPA vs MPA — trade-offs | ✅⭐ | 🌐 |

### 6.3 Network Optimization
| Topic | Priority | Companies |
|---|---|---|
| Network Optimization | ✅⭐ | 🌐 |
| Code Splitting & Dynamic Imports | ⭐ | 🌐 |
| Lazy Loading — components, routes, images | ⭐ | 🌐 |
| Preloading, Prefetching, Prerendering | ⭐ | 🌐 |
| Resource hints (dns-prefetch, preconnect, preload, prefetch) | ⭐ | 🌐 |
| HTTP/2 multiplexing — impact on bundle strategy | | 🔵🟣 |
| CDN optimization | ⭐ | 🌐 |
| Third-party script loading strategies | ⭐ | 🌐 |

### 6.4 Asset & Build Optimization
| Topic | Priority | Companies |
|---|---|---|
| Build Optimization | ✅⭐ | 🌐 |
| Tree Shaking vs Dead Code Elimination | ✅⭐ | 🌐 |
| Minification vs Compression | ✅⭐ | 🌐 |
| Bundle analysis (webpack-bundle-analyzer) | ⭐ | 🌐 |
| Critical CSS & above-the-fold rendering | ⭐ | 🌐 |
| Image formats — WebP, AVIF | ⭐ | 🌐 |
| Responsive images — srcset, sizes, picture element | ⭐ | 🌐 |
| Lazy loading images — Intersection Observer | ⭐ | 🌐 |
| Font optimization — font-display, preload, FOUT/FOIT | ⭐ | 🌐 |

### 6.5 JavaScript Runtime Optimization
| Topic | Priority | Companies |
|---|---|---|
| React Optimization (memo, useMemo, useCallback) | ✅⭐ | 🌐 |
| React Profiler | ⭐ | 🌐 |
| Virtual scrolling / Windowing (react-window) | ⭐ | 🌐 |
| Web Workers — offloading heavy computation | ⭐ | 🔵🔴🟠 |
| SharedArrayBuffer & Atomics | | 🔴🟣 |
| Long Tasks & scheduler.postTask API | ⭐ | 🔵🟣 |
| requestIdleCallback | ⭐ | 🌐 |
| Compositing layers — GPU acceleration | ⭐ | 🌐 |
| Reflow & Repaint avoidance | ✅⭐ | 🌐 |
| Memory leak detection & fixing | ⭐ | 🌐 |

### 6.6 React-Specific (Senior Level)
| Topic | Priority | Companies |
|---|---|---|
| React Fiber reconciliation algorithm | ⭐ | 🌐 |
| Concurrent Mode | ⭐ | 🌐 |
| useTransition & useDeferredValue | ⭐ | 🌐 |
| Suspense & lazy | ⭐ | 🌐 |
| React Server Components | ⭐ | 🔵🟣 |
| Key prop optimization | ⭐ | 🌐 |

---

## CHAPTER 7 — DATABASE, CACHING & STATE

### 7.1 Client Storage
| Topic | Priority | Companies |
|---|---|---|
| LocalStorage | ✅⭐ | 🌐 |
| SessionStorage | ✅⭐ | 🌐 |
| Cookie Storage | ✅⭐ | 🌐 |
| IndexedDB — for large structured data | ✅⭐ | 🌐 |
| Cache API (Service Worker cache) | ✅⭐ | 🌐 |
| Normalization of client-side data | ✅⭐ | 🌐 |
| Storage quota & eviction policies | | 🌐 |

### 7.2 Caching Strategies
| Topic | Priority | Companies |
|---|---|---|
| HTTP Caching (Cache-Control, ETag) | ✅⭐ | 🌐 |
| Service Worker Caching | ✅⭐ | 🌐 |
| API Caching | ✅⭐ | 🌐 |
| In-memory Caching | ✅⭐ | 🌐 |
| Stale-While-Revalidate | ⭐ | 🌐 |
| Cache-First vs Network-First vs Stale-First | ⭐ | 🌐 |
| Cache invalidation strategies | ⭐ | 🌐 |
| CDN caching | ⭐ | 🌐 |

### 7.3 State Management
| Topic | Priority | Companies |
|---|---|---|
| State Management Overview | ✅⭐ | 🌐 |
| Redux / Redux Toolkit | ⭐ | 🌐 |
| Zustand, Jotai, Recoil — atomic state | ⭐ | 🌐 |
| React Query / TanStack Query — server state | ⭐ | 🌐 |
| React Query vs Redux — when to use each | ⭐ | 🌐 |
| Context API — limitations at scale | ⭐ | 🌐 |
| Optimistic Updates | ⭐ | 🌐 |
| Pessimistic Updates | ⭐ | 🌐 |
| Undo/Redo state management | ⭐ | 🟡🔴 |
| Real-time state sync (WebSocket + Redux) | ⭐ | 🟡🟠 |
| State machines (XState) for complex workflows | ⭐ | 🟢🔷 |

---

## CHAPTER 8 — TESTING & QUALITY

### 8.1 Core Testing
| Topic | Priority | Companies |
|---|---|---|
| Testing Overview | ✅⭐ | 🌐 |
| Unit Testing (Jest, Vitest) | ✅⭐ | 🌐 |
| Integration Testing | ✅⭐ | 🌐 |
| E2E Testing (Playwright, Cypress) | ✅⭐ | 🌐 |
| A/B Testing | ✅⭐ | 🌐 |
| Performance Testing | ✅⭐ | 🌐 |
| Security Testing | ✅⭐ | 🌐 |
| TDD (Test-Driven Development) | ✅⭐ | 🟡🔵 |
| Snapshot Testing | | 🌐 |
| Code coverage — meaningful over % targets | ⭐ | 🌐 |

### 8.2 Advanced Testing
| Topic | Priority | Companies |
|---|---|---|
| Visual Regression Testing (Percy, Chromatic) | ⭐ | 🔵🔴🟡 |
| Accessibility Testing (axe-core, Deque) | ⭐ | 🔵🟡🌐 |
| Component Testing (Storybook + Chromatic) | ⭐ | 🔵🔴🟡 |
| Contract Testing (Pact) | | 🟡🔵 |
| Mutation Testing | | 🔵🟡 |
| Feature Flag Testing | ⭐ | 🌐 |
| Testing Design Systems | ⭐ | 🔵🔴🟡 |
| Cross-browser testing | ⭐ | 🌐 |
| Load testing basics (k6) | | 🟠 |
| CI/CD integration of tests | ⭐ | 🟡🔵 |

---

## CHAPTER 9 — ACCESSIBILITY (a11y)

### 9.1 Core Accessibility
| Topic | Priority | Companies |
|---|---|---|
| Accessibility Overview | ✅⭐ | 🌐 |
| Keyboard Accessibility | ✅⭐ | 🌐 |
| Screen Reader Support (NVDA, JAWS, VoiceOver) | ✅⭐ | 🌐 |
| Focus Management | ✅⭐ | 🌐 |
| Color Contrast ratios | ✅⭐ | 🌐 |
| Accessibility Tools (Axe, Lighthouse) | ✅⭐ | 🌐 |
| How to Fix Accessibility Issues | ✅⭐ | 🌐 |

### 9.2 Advanced Accessibility
| Topic | Priority | Companies |
|---|---|---|
| ARIA roles, labels, live regions (aria-live, aria-atomic) | ⭐ | 🔵🟡🟢🌐 |
| WCAG 2.1 / 2.2 — A, AA, AAA standards | ⭐ | 🔵🌐 |
| VPAT (Voluntary Product Accessibility Template) | | 🔷🔵 |
| Focus trap management (modals, dropdowns) | ⭐ | 🌐 |
| Skip navigation links | ⭐ | 🌐 |
| Reduced Motion (prefers-reduced-motion) | ⭐ | 🌐 |
| prefers-color-scheme (dark mode) | ⭐ | 🌐 |
| High contrast mode (Windows) | | 🔵 |
| Accessible forms — error announcements | ⭐ | 🟢🔷 |
| Accessible data tables | ⭐ | 🟢🔷🟡 |
| Accessible modals, comboboxes, autocomplete | ⭐ | 🌐 |
| Accessible charts & data visualizations | ⭐ | 🟠🟢🔷 |

---

## CHAPTER 10 — OFFLINE SUPPORT & PWA

| Topic | Priority | Companies |
|---|---|---|
| Service Workers | ✅⭐ | 🌐 |
| Progressive Web Apps (PWA) | ✅⭐ | 🌐 |
| Cache-First vs Network-First vs Stale-While-Revalidate | ⭐ | 🌐 |
| Background Sync | ⭐ | 🌐 |
| Web Push Notifications | ⭐ | 🌐 |
| App Manifest & installability | ⭐ | 🌐 |
| Offline-first architecture | ⭐ | 🌐 |
| Conflict resolution (offline vs online edits) | ⭐ | 🟡🟢 |

---

## CHAPTER 11 — LOGGING & MONITORING

| Topic | Priority | Companies |
|---|---|---|
| Logging & Monitoring Overview | ✅⭐ | 🌐 |
| Telemetry | ✅⭐ | 🌐 |
| Alerting | ✅⭐ | 🌐 |
| Fixing / Incident Response | ✅ | 🌐 |
| Real User Monitoring (RUM) | ⭐ | 🌐 |
| Synthetic Monitoring | ⭐ | 🌐 |
| Error Tracking (Sentry patterns) | ⭐ | 🌐 |
| Session Replay (FullStory, LogRocket) | ⭐ | 🌐 |
| Distributed Tracing — frontend spans | ⭐ | 🔵🟠 |
| Performance Budgets in CI | ⭐ | 🟣🔵 |
| Crash Reporting | ⭐ | 🌐 |
| Analytics event tracking design | ⭐ | 🌐 |
| Frontend error boundaries (React) | ⭐ | 🌐 |

---

## CHAPTER 12 — DESIGN SYSTEMS

| Topic | Priority | Companies |
|---|---|---|
| Design Tokens (colors, spacing, typography as variables) | ⭐ | 🔵🔴🟡🔷 |
| Atomic Design (atoms → molecules → organisms) | ⭐ | 🔵🔴🟡 |
| Component library architecture | ⭐ | 🔵🔴🟡 |
| Storybook — documentation & visual testing | ⭐ | 🔵🔴🟡 |
| Versioning & publishing component libraries (npm) | ⭐ | 🔵🟡 |
| Theming & white-labeling | ⭐ | 🔷🔵 |
| Dark mode support | ⭐ | 🌐 |
| Figma ↔ Code handoff (Figma Tokens, Figma Dev Mode) | ⭐ | 🔴🔵 |
| CSS Custom Properties for theming | ⭐ | 🔵🔴 |
| Accessibility baked into Design Systems | ⭐ | 🔵🟡🔴 |
| Microsoft Fluent UI | | 🔵 |
| Adobe Spectrum Design System | | 🔴 |
| Atlassian Design System (ADS) | | 🟡 |
| Salesforce Lightning Design System (SLDS) | | 🔷 |

---

## CHAPTER 13 — CANVAS, GRAPHICS & ANIMATION (Adobe-heavy)

### 13.1 Canvas & WebGL
| Topic | Priority | Companies |
|---|---|---|
| HTML5 Canvas 2D API | ⭐ | 🔴 |
| WebGL fundamentals (shaders, programs, buffers) | | 🔴 |
| OffscreenCanvas (for Web Workers) | | 🔴 |
| Canvas performance optimization | ⭐ | 🔴 |
| Bitmap manipulation / image filters | ⭐ | 🔴 |
| SVG — inline, external, manipulation via JS | ⭐ | 🔴🟣 |
| SVG animations | ⭐ | 🔴 |
| WebGL libraries (Three.js, Babylon.js) | | 🔴 |

### 13.2 Animation
| Topic | Priority | Companies |
|---|---|---|
| CSS Animations & Keyframes | ⭐ | 🔴🌐 |
| CSS Transitions | ⭐ | 🔴🌐 |
| Web Animations API (WAAPI) | ⭐ | 🔴 |
| GSAP (GreenSock) | | 🔴 |
| requestAnimationFrame patterns | ⭐ | 🔴🌐 |
| FLIP technique (First, Last, Invert, Play) | ⭐ | 🔴 |
| Performance-safe animation (transform, opacity only) | ⭐ | 🌐 |
| Lottie animations | ⭐ | 🔴 |
| Framer Motion (React) | ⭐ | 🔴 |

### 13.3 Media & File Handling
| Topic | Priority | Companies |
|---|---|---|
| File API — reading files in browser | ⭐ | 🔴🟢 |
| Drag-and-drop file upload | ⭐ | 🔴🟡🟢 |
| Image compression in browser | ⭐ | 🔴 |
| MediaSource API (adaptive streaming) | | 🟣 |
| Video/Audio element APIs | ⭐ | 🔴🟠 |
| Blob & URL.createObjectURL | ⭐ | 🔴 |
| PDF rendering in browser (PDF.js) | ⭐ | 🟢🔴 |
| WebAssembly (WASM) — use cases | | 🔴🟣 |

---

## CHAPTER 14 — RICH TEXT & COLLABORATIVE EDITING (Atlassian-heavy)

### 14.1 Rich Text Editors
| Topic | Priority | Companies |
|---|---|---|
| contenteditable — how it works, pitfalls | ⭐ | 🟡🟣🔵 |
| ProseMirror architecture (schema, state, transactions) | ⭐ | 🟡🟣 |
| Tiptap / Slate.js / Draft.js | ⭐ | 🟡 |
| Document data models (JSON representation) | ⭐ | 🟡🟣 |
| Custom block types (embeds, mentions, tables) | ⭐ | 🟡 |

### 14.2 Collaborative Editing
| Topic | Priority | Companies |
|---|---|---|
| Operational Transformation (OT) — basics | ⭐ | 🟡🟣🔵 |
| CRDT (Conflict-free Replicated Data Types) — Yjs, Automerge | ⭐ | 🟡🟣 |
| OT vs CRDT — trade-offs | ⭐ | 🟡🟣 |
| Presence indicators (cursors, selections, who's online) | ⭐ | 🟡🟣🔵 |
| Version history & diffing | ⭐ | 🟡🔵 |
| Offline editing + sync on reconnect | ⭐ | 🟡 |
| Optimistic local updates + WebSocket push | ⭐ | 🟡🌐 |
| Permission-based editing (view/comment/edit) | ⭐ | 🟡🔷 |

---

## CHAPTER 15 — DATA VISUALIZATION & DASHBOARDS (Cisco, Intuit, Salesforce)

### 15.1 Data Visualization
| Topic | Priority | Companies |
|---|---|---|
| Chart types — when to use bar/line/pie/scatter | ⭐ | 🟠🟢🔷 |
| D3.js — data binding, scales, axes, layouts | ⭐ | 🟠🟢 |
| Recharts / Chart.js / Highcharts / Echarts | ⭐ | 🌐 |
| Real-time charting (streaming data) | ⭐ | 🟠 |
| Network topology diagrams / Graph visualization | ⭐ | 🟠 |
| Heatmaps, treemaps, force-directed graphs | | 🟠🟣 |
| SVG vs Canvas for data visualization | ⭐ | 🟠🔴 |
| Large dataset rendering (virtualization + charts) | ⭐ | 🟠🔷 |
| Color accessibility in charts | ⭐ | 🟠🟢 |

### 15.2 Dashboards
| Topic | Priority | Companies |
|---|---|---|
| Dashboard layout patterns (grid, freeform) | ⭐ | 🟠🔷🟢 |
| Configurable/draggable widgets | ⭐ | 🔷🟠 |
| Responsive dashboards | ⭐ | 🌐 |
| Real-time data refresh strategies | ⭐ | 🟠🔷 |
| Dashboard state persistence | ⭐ | 🔷🟢 |
| Filters, search, sort across dashboards | ⭐ | 🔷🟢 |
| Dashboard export (PDF/PNG) | ⭐ | 🟢🔷 |

---

## CHAPTER 16 — FORM DESIGN & COMPLEX WORKFLOWS (Intuit, Salesforce)

### 16.1 Form Design
| Topic | Priority | Companies |
|---|---|---|
| Controlled vs Uncontrolled components | ⭐ | 🌐 |
| React Hook Form vs Formik — trade-offs | ⭐ | 🟢🔷 |
| Multi-step / wizard / stepper forms | ⭐ | 🟢🔷 |
| Dynamic / schema-driven forms (JSON Schema, Zod) | ⭐ | 🔷🟢 |
| Form validation — sync, async, cross-field | ⭐ | 🌐 |
| Accessible forms — error announcements, labels | ⭐ | 🟢🔷 |
| Auto-save / draft functionality | ⭐ | 🟢🟡 |
| Form state persistence (survive page refresh) | ⭐ | 🟢 |
| Large complex forms — performance | ⭐ | 🟢🔷 |

### 16.2 Complex Workflows
| Topic | Priority | Companies |
|---|---|---|
| State machines for multi-step workflows (XState) | ⭐ | 🟢🔷 |
| Conditional branching (tax UI, CRM rules) | ⭐ | 🟢🔷 |
| Calculation engines on frontend | ⭐ | 🟢 |
| PDF generation / rendering | ⭐ | 🟢🔴 |
| Undo/redo in workflows | ⭐ | 🟡🔴 |
| Approval workflows UI | ⭐ | 🔷🟡 |
| E-signature integration | | 🟢🔷 |

---

## CHAPTER 17 — LOW LEVEL DESIGN (Machine Coding)

### 17.1 JavaScript Utility Functions (Implement from scratch)
| Topic | Priority | Companies |
|---|---|---|
| Debounce | ⭐ | 🌐 |
| Throttle | ⭐ | 🌐 |
| Deep clone / deep equal | ⭐ | 🌐 |
| Memoize | ⭐ | 🌐 |
| Curry | ⭐ | 🌐 |
| Flatten nested array/object | ⭐ | 🌐 |
| Event Emitter / PubSub | ⭐ | 🌐 |
| Promise.all / .race / .allSettled / .any | ⭐ | 🌐 |
| Custom Promise implementation | ⭐ | 🌐 |
| Observable / reactive stream basics | ⭐ | 🟡🔷 |
| LRU Cache | ⭐ | 🌐 |
| Retry with backoff | ⭐ | 🔵🟠 |

### 17.2 UI Components — In Course ✅
| Topic | Priority | Companies |
|---|---|---|
| Config-Driven UI | ✅⭐ | 🌐 |
| Shimmer / Skeleton UI | ✅⭐ | 🌐 |
| Routing & Protected Routes | ✅⭐ | 🌐 |
| Multi-Language Support (i18n/l10n) | ✅⭐ | 🌐 |
| Infinite Scroll | ✅⭐ | 🌐 |
| Accordion | ✅⭐ | 🌐 |
| Nested Comments (Reddit-style) | ✅⭐ | 🌐 |
| Image Slider/Carousel | ✅⭐ | 🌐 |
| Pagination (Part 1 & 2) | ✅⭐ | 🌐 |
| Real-Time Updates | ✅⭐ | 🌐 |
| YouTube Live Stream Chat UI | ✅⭐ | 🌐 |
| Autocomplete / Search Bar | ✅⭐ | 🌐 |

### 17.3 Additional UI Components (Company-Specific)
| Topic | Priority | Companies |
|---|---|---|
| Modal / Dialog System | ⭐ | 🌐 |
| Toast / Notification System | ⭐ | 🌐 |
| Tooltip | ⭐ | 🌐 |
| Dropdown / Select with search | ⭐ | 🌐 |
| Multi-select tag input | ⭐ | 🟡🟢🔷 |
| Date Picker / Calendar | ⭐ | 🟢🔷 |
| Drag & Drop (kanban, file upload) | ⭐ | 🟡🔴🟢 |
| Resizable panels / split view | ⭐ | 🔴🟡 |
| Context menu / right-click menu | | 🔴🟡 |
| Command palette (Ctrl+K) | ⭐ | 🟡🔵 |
| Breadcrumb navigation | ⭐ | 🟡 |
| Virtual / Windowed list | ⭐ | 🌐 |
| Data table with sort / filter / pagination | ⭐ | 🔷🟢🟠 |
| Spreadsheet-like grid (editable cells) | ⭐ | 🟣🔷🟡 |
| Tree view / File explorer | ⭐ | 🔵🟡 |
| Rich text mini-editor | ⭐ | 🟡🔵 |
| Color picker | ⭐ | 🔴 |
| Progress stepper | ⭐ | 🟢🔷 |
| Timeline component | ⭐ | 🟡🟠 |
| Form builder (drag-drop) | ⭐ | 🔷🟡 |
| Tabs component | ⭐ | 🌐 |
| Typeahead with keyboard navigation | ⭐ | 🌐 |
| OTP / PIN input | ⭐ | 🟢🔷 |
| Star rating | ⭐ | 🌐 |
| Floating action button | | 🌐 |
| Badge / chip component | | 🌐 |

---

## CHAPTER 18 — HIGH LEVEL DESIGN (HLD)

### 18.1 HLD Framework
| Topic | Priority | Companies |
|---|---|---|
| HLD Overview | ✅⭐ | 🌐 |
| RADIO Framework (Requirements → Architecture → Data → Interface → Optimization) | ✅⭐ | 🌐 |
| Time management in System Design interview | ✅⭐ | 🌐 |
| Why candidates get rejected in LLD | ✅⭐ | 🌐 |
| System design expectations — Junior vs Senior | ✅⭐ | 🌐 |

### 18.2 In Course ✅
| HLD Topic | Companies |
|---|---|
| Photo Sharing App (Instagram) | 🌐 |
| E-Commerce App (Amazon / Flipkart) | 🌐 |
| News / Social Media Feed (Facebook / Twitter) | 🌐 |
| Video Streaming (Netflix) | 🌐 |
| Music Streaming (Spotify) | 🌐 |
| Live Commentary (Cricinfo) | 🌐 |
| Email Client (Gmail / Outlook) | 🌐 |
| Diagram Tool (Excalidraw) | 🌐 |
| Analytics Dashboard (Google Analytics) | 🌐 |
| Google Docs (Collaborative Editing) | 🌐 |
| Google Sheets | 🌐 |
| Microfrontend Architecture | 🌐 |
| Kanban Board | 🌐 |

### 18.3 Additional HLD — Google 🟣
| HLD Topic | Priority |
|---|---|
| Google Search Frontend (autocomplete, ranking UI, instant results) | ⭐ |
| Google Maps UI (tile rendering, markers, clustering, routing) | ⭐ |
| YouTube Player UI (adaptive streaming, comments, recommendations) | ⭐ |
| Google Meet / Video Conferencing UI | ⭐ |
| Google Calendar UI | |
| Google Drive File Browser | |

### 18.4 Additional HLD — Microsoft 🔵
| HLD Topic | Priority |
|---|---|
| Microsoft Teams (channels, threads, real-time chat, presence) | ⭐ |
| Microsoft Office Online (Word/Excel in browser) | ⭐ |
| Microsoft Outlook Web App | ⭐ |
| Azure DevOps Dashboard / CI Pipeline UI | ⭐ |
| Microsoft Copilot / AI Chat Interface | ⭐ |
| OneNote / Note-taking App | |
| SharePoint Document Library | |

### 18.5 Additional HLD — Adobe 🔴
| HLD Topic | Priority |
|---|---|
| Design tool like Figma / Adobe XD (canvas, layers, shapes) | ⭐ |
| Photo editor like Lightroom Web (non-destructive editing) | ⭐ |
| Video editor timeline UI (tracks, cuts, transitions) | ⭐ |
| Adobe Acrobat PDF viewer & annotation | ⭐ |
| Creative Cloud asset browser | |
| Adobe Express (template editor) | |

### 18.6 Additional HLD — Cisco 🟠
| HLD Topic | Priority |
|---|---|
| Webex / Video Conferencing UI (rooms, chat, screen share) | ⭐ |
| Network monitoring dashboard (real-time metrics) | ⭐ |
| Network topology visualizer (nodes, edges, status) | ⭐ |
| Security threat/alerts dashboard | ⭐ |
| IoT device management UI | |

### 18.7 Additional HLD — Atlassian 🟡
| HLD Topic | Priority |
|---|---|
| Jira Board (Kanban / Scrum with drag-drop) | ⭐ |
| Confluence Rich Text Editor (collaborative) | ⭐ |
| Jira Ticket Detail Page (comments, attachments, history) | ⭐ |
| Atlassian Marketplace / Plugin Gallery | ⭐ |
| Bitbucket Code Review UI (diffs, comments, approvals) | ⭐ |
| Real-time commenting & presence system | ⭐ |

### 18.8 Additional HLD — Intuit 🟢
| HLD Topic | Priority |
|---|---|
| TurboTax interview-style multi-step UI | ⭐ |
| QuickBooks financial dashboard | ⭐ |
| Profit & Loss / Balance Sheet UI | ⭐ |
| Payment processing UI (PCI-compliant tokenization) | ⭐ |
| Expense categorization / tagging UI | ⭐ |

### 18.9 Additional HLD — Salesforce 🔷
| HLD Topic | Priority |
|---|---|
| CRM Opportunity / Lead Dashboard | ⭐ |
| Lightning App Builder (drag-drop page composer) | ⭐ |
| Salesforce Record Page (related lists, activity timeline) | ⭐ |
| AppExchange Plugin / Extension Architecture | ⭐ |
| Report Builder UI (filters, grouping, charts) | ⭐ |
| Workflow / Process Automation Builder | |

---

## CHAPTER 19 — ARCHITECTURE PATTERNS

### 19.1 Microfrontends
| Topic | Priority | Companies |
|---|---|---|
| Microfrontend Architecture | ✅⭐ | 🌐 |
| Module Federation (Webpack 5) | ⭐ | 🔵🟡🔷 |
| Single-SPA | ⭐ | 🌐 |
| iFrame-based isolation | | 🌐 |
| Shared dependencies management | ⭐ | 🌐 |
| Cross-app communication patterns | ⭐ | 🌐 |
| Deployment & versioning strategy | ⭐ | 🌐 |
| Performance trade-offs | ⭐ | 🌐 |

### 19.2 Plugin / Extension Architecture
| Topic | Priority | Companies |
|---|---|---|
| Plugin architecture patterns | ⭐ | 🟡🔷🔴 |
| Sandbox / isolation for plugins | ⭐ | 🟡🔷 |
| Plugin communication (events, APIs) | ⭐ | 🟡🔷 |
| Atlassian Forge platform | | 🟡 |
| Salesforce AppExchange architecture | | 🔷 |
| Browser extension architecture | | 🟣 |

### 19.3 Build Tools & Bundlers
| Topic | Priority | Companies |
|---|---|---|
| Webpack — config, plugins, loaders | ⭐ | 🌐 |
| Vite — ESM-based dev server | ⭐ | 🌐 |
| Rollup — library bundling | | 🌐 |
| esbuild / SWC — speed comparison | | 🌐 |
| Babel — transpilation, plugins | ⭐ | 🌐 |
| PostCSS — autoprefixer, plugins | ⭐ | 🌐 |
| Bundle analysis tools | ⭐ | 🌐 |
| Monorepo tools — Turborepo, Nx, Lerna | ⭐ | 🔵🟡 |
| Bazel (Google's build system) | | 🟣 |
| npm vs pnpm vs yarn workspaces | ⭐ | 🌐 |

### 19.4 CI/CD for Frontend
| Topic | Priority | Companies |
|---|---|---|
| CI/CD pipeline for frontend | ⭐ | 🔵🟡 |
| Automated testing in CI | ⭐ | 🔵🟡 |
| Preview deployments | ⭐ | 🌐 |
| Feature flags in CI/CD | ⭐ | 🌐 |
| Canary / gradual rollouts | ⭐ | 🔵🟣 |
| Performance budgets in CI (Lighthouse CI) | ⭐ | 🟣🔵 |

### 19.5 Design Patterns in Frontend
| Topic | Priority | Companies |
|---|---|---|
| Higher Order Components (HOC) | ⭐ | 🌐 |
| Render Props | ⭐ | 🌐 |
| Compound Components | ⭐ | 🌐 |
| Container / Presenter pattern | ⭐ | 🌐 |
| Custom Hooks patterns | ⭐ | 🌐 |
| Provider pattern | ⭐ | 🌐 |
| Observer pattern | ⭐ | 🌐 |
| Factory pattern | ⭐ | 🌐 |
| Command pattern (undo/redo) | ⭐ | 🟡🔴 |
| Strategy pattern | ⭐ | 🌐 |
| Facade pattern | ⭐ | 🌐 |

---

## CHAPTER 20 — SYSTEM DESIGN (Bonus Topics)

| Topic | Priority | Companies |
|---|---|---|
| SPA vs MPA | ✅⭐ | 🌐 |
| Tree Shaking vs Dead Code Elimination | ✅⭐ | 🌐 |
| Minification vs Compression | ✅⭐ | 🌐 |
| Real DOM vs Virtual DOM | ✅⭐ | 🌐 |
| Real DOM vs Shadow DOM | ✅⭐ | 🌐 |
| Webpage Rendering Cycle | ✅⭐ | 🌐 |
| Reflow & Repaint | ✅⭐ | 🌐 |
| DOM vs BOM | ✅⭐ | 🌐 |
| CSS Positioning | ✅⭐ | 🌐 |
| RADIO Framework | ✅⭐ | 🌐 |
| SSR vs SSG vs CSR vs ISR | ⭐ | 🌐 |
| Hydration & Partial Hydration | ⭐ | 🌐 |
| React Fiber Architecture | ⭐ | 🌐 |
| Concurrent Mode & useTransition | ⭐ | 🌐 |
| React Server Components | ⭐ | 🔵🟣 |
| WebAssembly (WASM) | | 🔴🟣 |
| Progressive Enhancement | ⭐ | 🌐 |
| Graceful Degradation | ⭐ | 🌐 |
| Internationalization (i18n) & Localization (l10n) | ✅⭐ | 🌐 |
| RTL (Right-to-Left) layout support | ⭐ | 🌐 |
| Polyfills & browser support strategy | ✅⭐ | 🌐 |

---

## CHAPTER 21 — MASTERCLASSES (Bonus) ✅

| Topic |
|---|
| ✅ Salary Negotiation Masterclass |
| ✅ Resume Masterclass |
| ✅ Personal Branding Masterclass |
| ✅ LinkedIn Masterclass |

---

## CHAPTER 22 — INTERVIEW QUESTIONS BANK ✅

Per-topic Q&A banks included in course:
- Networking Interview Questions ✅
- Communication Protocol Interview Questions ✅
- Security Interview Questions ✅
- Testing Interview Questions ✅
- Performance Interview Questions ✅
- Database & Caching Interview Questions ✅
- Logging & Monitoring Interview Questions ✅
- Accessibility Interview Questions ✅
- Offline Support Interview Questions ✅

---

## CHAPTER 23 — COMPANY-SPECIFIC INTERVIEW FORMATS

| Company | Rounds | Focus Areas |
|---|---|---|
| 🟣 Google | 4–6 rounds: 2 coding + 1-2 FSD + 1 behavioral | Core Web Vitals, Scale, Google Products HLD |
| 🔵 Microsoft | 4–5 rounds: 2 coding + 1 system design + 1 behavioral + HM | TypeScript, Accessibility, Teams/Office products |
| 🔴 Adobe | 4–5 rounds: JS coding + UI coding + System Design + HM | Canvas, Animation, Design tools HLD |
| 🟠 Cisco | 3–4 rounds: coding + system design + behavioral | WebRTC, Network viz, Real-time dashboards |
| 🟡 Atlassian | 5 rounds: 2 coding + 1 system design + 1 management + 1 values | TDD, Collaborative editing, Jira/Confluence HLD |
| 🟢 Intuit | 3–4 rounds: coding + UI + system design + behavioral | Forms, Financial UI, Multi-step flows |
| 🔷 Salesforce | 4–5 rounds: coding + UI + system design + behavioral | LWC, CRM dashboards, AppExchange HLD |

---

## CHAPTER 24 — BEHAVIORAL & VALUES

### 24.1 Universal (STAR Method)
- Technical leadership examples
- Handling conflict / disagreement with team
- Failing and learning from failure
- Working cross-functionally (design, backend, PM)
- Mentoring others / being mentored
- Making trade-off decisions under ambiguity
- Handling tight deadlines
- Advocating for technical debt paydown

### 24.2 Company-Specific Values to Know
| Company | Core Values |
|---|---|
| 🔵 Microsoft | Growth Mindset, Empathy, Clarity, Energy, Success |
| 🟡 Atlassian | Open company no BS · Don't #@!% the customer · Play as a team · Be the change · Build with heart & balance |
| 🔴 Adobe | Genuine, Exceptional, Innovative, Involved |
| 🔷 Salesforce | Trust · Customer Success · Innovation · Equality |
| 🟢 Intuit | Integrity without compromise · Customer-driven innovation · Stronger together |
| 🟠 Cisco | Make amazing things happen · Inclusion · Trust |
| 🟣 Google | Focus on the user · Be fast · Think 10x · Do more with less |

---

## QUICK REFERENCE — TOPIC PRIORITY MATRIX

| Level | Topics to Cover First |
|---|---|
| 🔴 Critical (All Companies) | Networking, REST/GraphQL, Security (XSS/CSRF/CORS), Performance basics, State Management, Testing overview, Accessibility basics, Caching, LLD classics (Debounce, Throttle, Infinite Scroll, Autocomplete), HLD (Feed, Email, E-Commerce) |
| 🟠 Important (Senior Level) | Core Web Vitals, Rendering Patterns (SSR/SSG/CSR), Auth (OAuth/JWT), Web Workers, Collaborative editing basics, Design Systems, Microfrontends, TypeScript, WebSockets, PWA/Service Workers |
| 🟡 Advanced (FAANG+ Level) | React Fiber/Concurrent Mode, V8 internals, CRDT/OT, Canvas/WebGL, Module Federation, WASM, React Server Components, Monorepos |
| 🔵 Company-Specific | Microsoft: TypeScript + Accessibility + Fluent UI · Adobe: Canvas + Animation + Design tools · Cisco: WebRTC + Network viz · Atlassian: OT/CRDT + Plugin arch · Intuit: Forms + Financial UI · Salesforce: LWC + CRM patterns |

---

*Course: Namaste Frontend System Design by Akshay Saini & Chirag Goel (NamasteDev.com)*
*Supplemented with company-specific interview research for Google, Microsoft, Adobe, Cisco, Atlassian, Intuit, Salesforce*
