# 🎯 FAANG Frontend Interview Prep Kit

**486 Topics · 28 Sequences · 10 Phases · 886 Interview Experiences**

A complete senior/staff-level frontend engineering interview preparation system targeting Google and FAANG companies.

---

## Quick Start

**Open the interactive study dashboard:**
```
open study-dashboard.html
```
Or right-click → Open with Live Server in VS Code.

**Follow the study plan:**
→ [PREPARATION_PLAN.md](PREPARATION_PLAN.md) — 90-day, 1hr/day schedule

---

## What's Inside

| File | Purpose |
|------|---------|
| `study-dashboard.html` | Interactive study tracker with progress, search, and filters |
| `PREPARATION_PLAN.md` | 90-day daily study schedule (1 hour/day, 7 days/week) |
| `STUDY_DASHBOARD_README.md` | Full topic index in Markdown (486 topics + resource links) |
| `INTERVIEW_EXPERIENCES.md` | 886 real interview stories from 107 companies |
| `Sequenced_index_with_resources.md` | Master topic index with external learning links |
| `INTERVIEW_GUIDE.md` | Setup guide and sequence overview |
| `docker-compose.yml` | Runs lab servers for SEQ_07 (API) and SEQ_13 (Security) |

---

## Folder Structure (28 Sequences across 10 Phases)

### Phase 1 — Foundations (Weeks 1–3)
| Folder | Topics | Focus |
|--------|--------|-------|
| `SEQ_02` | Browser & Web Platform Internals | Rendering pipeline, event loop, memory, networking |
| `SEQ_03` | TypeScript Deep Dive | Advanced types, generics, compiler, React+TS |

### Phase 2 — Framework Deep Dives (Weeks 3–7)
| Folder | Topics | Focus |
|--------|--------|-------|
| `SEQ_04` | Angular & RxJS Deep Dive | Change detection, RxJS operators, NgRx, performance |
| `SEQ_05` | React, Next.js & Redux | Fiber, hooks, server components, App Router, RTK Query |

### Phase 3 — State & Data (Week 7–8)
| Folder | Topics | Focus |
|--------|--------|-------|
| `SEQ_06` | State Management | Redux, Zustand, Signals, XState, server state |
| `SEQ_07` | Data Fetching & API Design | REST, GraphQL, pagination, optimistic updates *(has labs)* |

### Phase 4 — Performance & Architecture (Weeks 8–10)
| Folder | Topics | Focus |
|--------|--------|-------|
| `SEQ_08` | Performance Optimization | Core Web Vitals, code splitting, virtualization |
| `SEQ_09` | Assets & Resource Optimization | Images, fonts, CSS/JS delivery, CDN |
| `SEQ_10` | Frontend Architecture Patterns | Micro frontends, module federation, design systems |
| `SEQ_11` | Rendering Strategies | CSR, SSR, SSG, ISR, streaming, hydration |

### Phase 5 — Reliability & Security (Weeks 10–11)
| Folder | Topics | Focus |
|--------|--------|-------|
| `SEQ_12` | Caching & Offline | Service workers, IndexedDB, cache strategies |
| `SEQ_13` | Security | XSS, CSRF, CSP, JWT, OAuth *(has labs)* |
| `SEQ_14` | Authorization & Access Control | RBAC, ABAC, multi-tenant, route guards |

### Phase 6 — Scalability & Real-Time (Week 11–12)
| Folder | Topics | Focus |
|--------|--------|-------|
| `SEQ_15` | Real-Time Systems | WebSockets, SSE, conflict resolution, presence |
| `SEQ_16` | Scalability & Growth | Feature flags, A/B testing, i18n, edge computing |

### Phase 7 — Quality & DevOps (Week 12–13)
| Folder | Topics | Focus |
|--------|--------|-------|
| `SEQ_17` | Accessibility & UX | WCAG, ARIA, inclusive design |
| `SEQ_18` | Testing Strategy | Jest, Playwright, visual regression, testing pyramid |
| `SEQ_19` | Observability | Error tracking, RUM, session replay, OpenTelemetry |
| `SEQ_20` | CI/CD & Frontend DevOps | GitHub Actions, blue-green, canary, Docker |

### Phase 8 — Enterprise (Optional)
| Folder | Topics | Focus |
|--------|--------|-------|
| `SEQ_21` | Web Components & LWC | Custom elements, Shadow DOM, Salesforce LWC |
| `SEQ_22` | SAP UI5 & Enterprise Patterns | SAPUI5, Fiori, OData, enterprise migration |

### Phase 9 — System Design & Coding (Weeks 13–15)
| Folder | Topics | Focus |
|--------|--------|-------|
| `SEQ_23` | Frontend System Design Foundations | HLD vs LLD, requirements, trade-offs |
| `SEQ_24` | DSA for Frontend Engineers | Arrays, trees, graphs, LRU cache, EventEmitter |
| `SEQ_25` | Practical System Design Problems | Autocomplete, chat UI, e-commerce, dashboards |
| `SEQ_26` | Machine Coding ↔ Design Bridge | Component decomposition, evolving requirements |

### Phase 10 — Interview Execution (Ongoing)
| Folder | Topics | Focus |
|--------|--------|-------|
| `SEQ_27` | Interview Strategy | Pacing, communication, closing |
| `SEQ_28` | FAANG-Level Expectations | Senior→Staff bar, production mindset, SLO/SLA |
| `SEQ_29` | Behavioural & Leadership | STAR stories, company values, negotiation |

---

## Running the Labs

SEQ_07 (Data Fetching) and SEQ_13 (Security) include interactive Node.js servers:

```bash
docker-compose up -d
```

| Service | Port | Purpose |
|---------|------|---------|
| seq07-server | 4001 | Data fetching & API design labs |
| seq13-server | 3001 | Security labs |
| seq13 (attacker) | 3002 | Security attack simulation |
| Redis | 6379 | Session store for SEQ_13 |

```bash
docker-compose down        # stop
docker-compose up -d --build  # rebuild after changes
```

---

## Study Approach

1. Open `study-dashboard.html` — track progress visually
2. Follow `PREPARATION_PLAN.md` — 1 topic/day, 1 hour
3. Each topic file has: High-Level → Deep-Dive → Real-World Examples → Interview Q&A → Code
4. Check off topics as you complete them (progress saved in browser localStorage)
5. Export progress regularly: Dashboard → 📥 Export

================================================================