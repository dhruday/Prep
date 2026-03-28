# The Full System Architecture — Draw It From Memory in 2 Minutes
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.1: The Big Picture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **SAP BI Launchpad in 30 seconds**: a globally deployed enterprise analytics shell that hosts multiple micro-frontend modules from different teams, built with different frameworks, all running inside one browser tab without conflicts — backed by Spring Boot microservices and secured with OAuth 2.0 / JWT SSO
- **Five layers to draw**: Browser Shell (React + Redux) → Module Federation loader → Micro-frontend modules (Team A/B/C/D) → API Gateway → Spring Boot microservices per domain → Databases per service
- **The key insight interviewers want**: the shell owns routing and auth state; each module owns its own sub-routes, state, and styles; they communicate only through the shell's event bus — never directly
- **Module Federation is the architectural enabler**: Webpack 5 loads remote JavaScript bundles at runtime without a page reload; each team pushes their bundle to a CDN; the shell fetches the latest version when a user navigates to that module
- **One sentence that signals senior thinking**: "We chose federation over iframes because iframes cannot share auth context or match the shell's visual design — the user experience would feel disconnected"
- **Numbers to know cold**: 4 module teams, 8 Spring Boot services, JWT + OAuth 2.0 SSO, Lighthouse went 60 → 95+, 80% vulnerability reduction, 30+ WCAG violations fixed

---

## 1. One-Line Definition
SAP BI Launchpad is a micro-frontend shell application that loads analytics modules from independent teams at runtime using Module Federation, backed by domain-specific Spring Boot microservices and unified auth.

---

## 2. The System — What It Is and Why It's Complex

SAP BI Launchpad is not a single application. It is a container — a shell — that can host any number of analytics tools built by different teams. Think of Chrome as a browser that loads different websites without knowing what each one does. That is roughly what the shell does.

The complexity comes from the fact that those inner tools were built by different teams using different frameworks and different release cycles. Team A uses SAP UI5 (SAP's own UI framework). Team B uses React. Team C uses Next.js. None of them should have to coordinate with each other to ship a feature. Yet to the user, it looks like one seamless product.

The backend is just as distributed. Each domain — report management, user auth, raw data access, notifications — has its own Spring Boot service and its own database. A request from the frontend goes through an API Gateway that authenticates the JWT token, routes to the right service, and returns the response.

This is the system you own end to end. You can draw every layer. You know why every decision was made.

---

## 3. The Full Architecture (Memorise This)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER TAB                                   │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              Shell App (React + Redux)                       │   │
│   │   TopNav · Routing · Auth State · Theme · Event Bus          │   │
│   │                                                              │   │
│   │  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌────────┐ │   │
│   │  │  Report Mod  │ │ Dashboard Mod│ │Analytics │ │ Admin  │ │   │
│   │  │  (SAP UI5)   │ │   (React)    │ │(Next.js) │ │(React) │ │   │
│   │  │   Team A     │ │   Team B     │ │  Team C  │ │ Team D │ │   │
│   │  │  /reports/*  │ │ /dashboards/*│ │ /analytics│ │/admin/│ │   │
│   │  └──────────────┘ └──────────────┘ └──────────┘ └────────┘ │   │
│   │                                                              │   │
│   │         ↑ Webpack 5 Module Federation (runtime load)         │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                               │ HTTPS + JWT                          │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      API Gateway       │
                    │  Auth · Rate Limit ·   │
                    │  Routing · Logging ·   │
                    │  CORS · SSL termination│
                    └───────────┬───────────┘
         ┌──────────────────────┼───────────────────────┐
         │                      │                        │
         ▼                      ▼                        ▼
  ┌────────────┐      ┌────────────────┐       ┌──────────────┐
  │   Report   │      │  User / Auth   │       │ Data Service │
  │  Service   │      │   Service      │       │              │
  │ (Spring)   │      │  (Spring)      │       │  (Spring)    │
  │            │      │  JWT, OAuth2   │       │              │
  └─────┬──────┘      └──────┬─────────┘       └──────┬───────┘
        │                   │                          │
        ▼                   ▼                          ▼
  ┌──────────┐       ┌──────────┐              ┌──────────┐
  │ Report DB│       │  User DB │              │  Data DB │
  │(Postgres)│       │(Postgres)│              │(Postgres)│
  └──────────┘       └──────────┘              └──────────┘

CROSS-CUTTING:
  CDN ← static module bundles (each team deploys their bundle independently)
  Redis ← session cache, rate limit counters
  OAuth 2.0 / Identity Provider ← SAP SSO
  Distributed Tracing ← correlation IDs through all hops
```

---

## 4. How to Narrate This in an Interview

Walk the diagram from top to bottom. Name each layer. Explain the key decision at each layer.

```
NARRATION SCRIPT (practise this out loud)

"So this is the system at a high level.

At the top we have the browser. The user sees one URL, one navigation bar, 
one product — but inside, the shell is loading separate JavaScript bundles 
from different teams at runtime using Webpack 5 Module Federation.

The shell — written in React with Redux — owns three things: routing, 
auth state, and the event bus that modules use to communicate. It does 
not know what is inside each module. It just knows where to load it from.

When a user navigates to /reports, the shell fetches the Report module 
bundle from the CDN. Team A published that bundle. The shell mounts it 
into the page. The user is now interacting with Team A's code, inside 
Team B's shell, and they have no idea.

Every API call goes through the API Gateway. The gateway validates the 
JWT token, applies rate limiting, routes to the right Spring Boot service, 
and returns the response. There are eight services. Each has its own 
Postgres database. They don't share state — only through events.

For auth, we use OAuth 2.0 with SAP's identity provider. The shell gets 
a JWT on login. All modules share that token — they don't have their own 
auth state. One login, one logout, one token."
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Walk me through a complex system you built."

**Hruday's answer:**
> "I worked on SAP BI Launchpad — an enterprise analytics platform deployed globally to thousands of users. It's a micro-frontend shell that hosts analytics tools built by multiple teams using different frameworks. The shell is React with Redux. The modules use SAP UI5, React, and Next.js depending on the team. They're loaded at runtime using Webpack 5 Module Federation — so each team ships independently without coordinating with others. The backend is eight Spring Boot microservices, one per domain, behind an API Gateway that handles JWT auth, rate limiting, and routing. What made it complex technically was making four different frameworks coexist, share auth context, and feel like one app to the user. I also owned the performance work that took Lighthouse from 60 to 95, the security audit that reduced vulnerabilities by 80%, and the WCAG AA certification that unlocked enterprise customers in regulated industries."

---

### Q2 — Deep Dive
**Interviewer asks:** "How does the shell share authentication with the micro-frontend modules?"

**Hruday's answer:**
> "The shell handles the full OAuth 2.0 flow with SAP's identity provider on login. Once authenticated, it stores the access token in an httpOnly cookie — not localStorage, for XSS safety. When a module makes an API call, the browser attaches that cookie automatically. For modules that need to read the user's identity (name, roles, permissions), the shell exposes a `useAuth` hook through its shared exports. A module imports this hook from the shell's federation scope and gets the current user context. This means there is exactly one place where the token lives and one place where it is invalidated on logout. When the user logs out, the shell clears the cookie, fires a 'USER_LOGGED_OUT' event on the event bus, and every mounted module receives that event and wipes its local state. No module can have stale auth — the logout is coordinated by the shell."

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Why micro-frontends instead of one monolithic React app?"

**Hruday's answer:**
> "With one monolithic app and four teams, you get merge conflicts every day, a shared release cycle, and one team's bug blocking everyone else's deployment. We had reports, dashboards, analytics, and admin — each built and shipped by a different team on different timelines. The micro-frontend model gave each team a separate repo, separate CI/CD pipeline, and the ability to ship to production independently. The cost is complexity: you need Module Federation configuration, a contract between the shell and modules (the shared API surface), and you have to be careful about shared dependencies — if the shell uses React 18 and a module bundles React 17, you get two React instances and the hooks break. We solved that with singleton scope on shared packages in the Federation config. The tradeoff was worth it — we went from weekly coordinated releases to each team shipping multiple times a day."

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "How does this system handle 100,000 concurrent users?"

**Hruday's answer:**
> "The static assets — HTML, JS bundles, CSS — are served from a CDN with no origin pressure. Module Federation bundles are cached at the edge with long cache TTLs since they're content-addressed. The API Gateway horizontally scales — it's stateless, just validating JWTs and routing. Each Spring Boot microservice is deployed in Kubernetes with Horizontal Pod Autoscaler, so the Report service scales independently from the User service. The biggest scaling concern is the Report service because generating a BI report can be CPU-heavy. We queue report generation requests through Kafka — the API returns a job ID immediately, the report service processes asynchronously, and the frontend polls for completion or receives a WebSocket push. Redis handles rate limiting counters and session data. The only stateful layer is PostgreSQL, which we scale with read replicas for read-heavy workloads and connection pooling through HikariCP."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Vague intro | "I worked on a large React app at SAP" | Name the product, name the complexity: "SAP BI Launchpad — four teams, four frameworks, one browser tab, eight backend services" |
| Skip the why | "We used micro-frontends" | Always say why: "We used micro-frontends because four teams needed to ship independently without merge dependencies" |
| Forget the tradeoffs | Only describe the good parts | Proactively mention: "The cost was Federation config complexity and shared dependency management" |
| Can't draw it | Describe it without a diagram | Ask for a whiteboard or a piece of paper. Draw it. The architecture tells the story better than words alone |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, I was part of the team that built and owned the frontend architecture for SAP BI Launchpad. What made it real architecture work — not just feature development — was that I had to make decisions that four other teams depended on: how the shell exposes its auth context, how Module Federation handles shared dependencies, how a failing module doesn't crash the shell. Those decisions were hard to reverse once other teams built on top of them. That's the kind of architecture ownership I want to bring to my next role."

---

## 8. Scale Evolution

**Prototype →** Shell + one micro-frontend module + one Spring Boot service. Understand the Federation wiring before adding teams.

**Production →** Four teams, four modules, eight services, API Gateway, Redis, CDN bundle distribution, OAuth 2.0 SSO. This is the current state.

**High scale →** Service mesh (Istio) for inter-service observability; async report generation via Kafka; per-module bundle versioning with rollback; server-side rendering in the shell for first-paint performance; global CDN with regional routing for EU/US/APAC.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Multi-team fintech dashboards, partner portals — same independence problem | Micro-frontend isolation for security-sensitive modules |
| Swiggy / Meesho | Seller dashboard, buyer app, admin tools — each owned by a different team | Module Federation for independent deployment without coordination |
| Adobe / Microsoft | Creative Cloud and M365 are literally shell apps hosting multiple tools | Exact match — your architecture is the same pattern at smaller scale |
| SAP Labs | You built this — you own the decision history, the trade-offs, the incidents | Be ready to go deep on any layer; this is your strongest interview weapon |

---

## 10. Related Topics — What to Study Next

- **Module Federation** — [389] how to explain it in plain English; the mechanism that makes this architecture possible
- **Micro-frontend routing** — [390] how URL routing works across shell and modules
- **Performance story** — [392–396] how the Lighthouse improvement was achieved in this specific architecture
- **API Gateway pattern** — topic 69 in Part 4; the gateway is a critical layer in this system
- **JWT + OAuth 2.0** — topics 52–53 in Part 3; the auth model that ties all modules together

---

*Part 23 · Full System Architecture — Draw It From Memory · Full Stack Interview Guide · Hruday D · 2026*
