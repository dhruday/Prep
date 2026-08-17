# The ASCII Architecture Diagram — Practise Drawing This
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.1: The Big Picture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Drawing the architecture is a skill, not just knowledge** — interviewers judge confidence by how fast and clean you draw; practice it until your hand draws the boxes automatically
- **Three diagrams to master cold**: (1) full system architecture, (2) before/after performance lazy loading, (3) auth flow from browser login to JWT in API request
- **Start with boxes, then arrows** — draw all the boxes first with their names, then connect them with arrows and label the arrows with what flows through them (JWT, REST, events, CDN URL)
- **The four-layer rule**: always draw Browser → Gateway → Service → Database; never draw arrows that skip a layer unless you explain why
- **What interviewers look for**: you start drawing immediately (confidence), you label each box (precision), you explain each arrow (depth), you mention the hard part (seniority)
- **Practise talking while drawing** — the real interview has you narrating as you draw; silence while drawing feels like you're unsure; every line you draw should have a spoken explanation

---

## 1. One-Line Definition
The architecture diagram is your interview weapon — a visual that lets you control the story, show your depth on every layer, and demonstrate that you own the system end to end.

---

## 2. The Three Diagrams You Must Draw Cold

### Diagram 1 — Full System Architecture

```
                        ┌─────────────────────────────────────────┐
                        │           C D N                          │
                        │  JS bundles · CSS · Images · Shell HTML  │
                        └──────────────────────────────────────────┘
                                          ▲  deploy
                                          │
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER                                      │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │              Shell App   (React + Redux)                       │   │
│ │         Routing · Auth State · Theme · Global Layout           │   │
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│ │  │ Reports  │  │Dashboard │  │Analytics │  │  Admin   │      │   │
│ │  │ SAP UI5  │  │  React   │  │ Next.js  │  │  React   │      │   │
│ │  │  Team A  │  │  Team B  │  │  Team C  │  │  Team D  │      │   │
│ │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │   │
│ │              ↑ Module Federation — runtime remote load         │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                         │ HTTPS + JWT (httpOnly cookie)              │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
              ┌───────────▼────────────┐
              │      API Gateway        │
              │  JWT validation          │
              │  Rate limiting (Redis)   │
              │  Route → Service         │
              └──┬──────┬──────┬────────┘
                 │      │      │
           ┌─────┘   ┌──┘   ┌──┘
           ▼         ▼      ▼
     ┌──────────┐ ┌──────┐ ┌──────────┐  ┌──────────────┐
     │  Report  │ │ User │ │  Data    │  │Notification  │
     │ Service  │ │ Svc  │ │ Service  │  │  Service     │
     └────┬─────┘ └──┬───┘ └────┬─────┘  └──────┬───────┘
          │          │          │                │
          ▼          ▼          ▼                ▼
     ┌─────────┐ ┌──────┐ ┌────────┐      ┌──────────┐
     │ Reports │ │Users │ │  Data  │      │ Notif DB │
     │   DB    │ │  DB  │ │   DB   │      │          │
     └─────────┘ └──────┘ └────────┘      └──────────┘

     OAuth 2.0 Identity Provider (SAP SSO) ← used by User Service
     Redis ← rate limit counters + session cache (used by Gateway)
     Kafka ← async report generation jobs (Report Service publishes/consumes)
```

---

### Diagram 2 — Module Federation Load Flow

```
RUNTIME MODULE LOADING — Step by Step

User navigates to /reports
          │
          ▼
Shell checks: is Reports module loaded?
   NO → fetch remoteEntry.js from CDN
          │
          ▼
CDN returns Team A's remoteEntry.js
(contains: module manifest, code entry point, shared dep versions)
          │
          ▼
Webpack checks: do we already have React@18 loaded?
   YES → reuse it (singleton: true in federation config)
   NO  → fetch React from CDN
          │
          ▼
Shell mounts <ReportModule /> into the route outlet
          │
          ▼
User sees the Reports UI — same tab, no page reload
```

---

### Diagram 3 — Auth Flow (Login to API Request)

```
USER LOGS IN

Browser → SAP Identity Provider (OAuth 2.0 Authorization Code Flow)
        ← Authorization Code

Browser → User Service: POST /token { code }
        ← access_token (JWT, 1 hour) + refresh_token (30 days)

Shell sets httpOnly cookie: access_token=<JWT>
  (httpOnly = JavaScript cannot read it → XSS protection)

USER MAKES AN API REQUEST

React component calls: GET /api/reports/list
          │
Browser automatically attaches the httpOnly cookie
          │
          ▼
API Gateway reads cookie → extracts JWT → validates signature + expiry
  VALID    → strips JWT → adds X-User-Id header → routes to Report Service
  INVALID  → 401 Unauthorized → Shell intercepts → silent refresh flow

Report Service receives request with X-User-Id only (no raw JWT)
Report Service queries DB filtered by userId
Returns data to gateway → to browser
```

---

## 3. Drawing Checklist for Interviews

```
BEFORE YOU START DRAWING:
□ Ask for whiteboard or paper if not offered
□ Say: "Let me draw this — easier to follow than words alone"
□ Start at the top (browser/user) and work down

WHILE DRAWING:
□ Draw boxes first, label them as you go
□ Draw arrows after boxes — label what flows through each arrow
□ Name every box with both WHAT (Shell) and WHO (React + Redux)
□ Narrate every line you draw: "This arrow is the HTTPS call with the JWT"

BOXES TO ALWAYS DRAW:
□ Browser box containing the Shell
□ CDN (to the side — shows you thought about static assets)
□ API Gateway
□ At least 2 microservices (to show it's distributed, not just one backend)
□ Database for each service (to show database-per-service pattern)
□ Redis (to show you thought about caching and rate limiting)
□ Identity Provider / OAuth (to show you thought about auth architecture)

AFTER DRAWING:
□ Step back and say: "The key architectural decision here is [X]"
□ Proactively mention the hard part: "The trickiest bit is shared dependencies in Federation"
□ Invite questions: "Want me to zoom into any layer?"
```

---

## 4. Practise Routine

```
DAILY PRACTISE (5 minutes)

Day 1: Draw Diagram 1 (full system) on paper. Don't look at notes. 
       Check what you missed. Draw again.

Day 2: Draw Diagram 1 again. Time yourself — should be under 3 minutes.
       Draw Diagram 2 (federation load flow).

Day 3: Draw all three diagrams back to back without notes.
       Narrate out loud for each one.

Day 4 onward: Once per day. Draw from memory. Under 2 minutes each.
               Narrate simultaneously. This is a motor skill — practice builds speed.

INTERVIEW DAY:
  You have drawn this 20+ times. Your hand knows the layout.
  You talk while drawing. You sound confident because you ARE confident.
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Can you draw the architecture of the system you worked on?"

**Hruday's answer:**
> [Picks up marker / pen]
> "Happy to. Let me start at the top with the browser. The user sees one app, but inside there are four micro-frontend modules loaded at runtime. The shell is React with Redux — it owns routing, auth, and the global layout. Each module is a separate JavaScript bundle deployed by a different team to the CDN. The shell uses Webpack 5 Module Federation to load those bundles on demand when the user navigates.
>
> Below the browser is the API Gateway — this is where JWT validation and rate limiting happen. From the gateway, requests route to one of eight Spring Boot services, each with its own Postgres database. On the side I'll draw Redis — that's used by the gateway for rate limit counters and by services for caching. And over here the OAuth 2.0 identity provider — that's SAP's SSO, used on login to get the JWT that flows through every request.
>
> The most important architectural decision in this diagram is the separation between the shell and modules. The shell doesn't know what's inside each module. A module failing to load doesn't crash the shell — it shows a fallback error boundary. That independence is what makes the system maintainable at scale with four teams."

---

### Q2 — Deep Dive
**Interviewer asks:** "How does Module Federation handle shared dependencies like React between modules?"

**Hruday's answer:**
> "Each module declares its shared dependencies in its Webpack Federation config with `singleton: true`. This tells Federation: if React is already loaded in the shell, don't load it again — share the instance. On startup, the shell and each module publish their dependency version in their `remoteEntry.js` manifest. When a module loads, Federation compares versions. If the module needs React 18.2 and the shell has React 18.3, Federation can share the 18.3 instance because it's a higher patch version. If there's a major version mismatch — shell has React 18, module bundles React 17 — you get two React instances in the same page, and React hooks will throw the 'Invalid hook call' error because hooks require a single React context. We solved this by enforcing a shared dependency version table in a monorepo root config, so all teams use the same React version. We also had CI checks that failed if a module's peer dependency version deviated from the shared table."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Start talking without drawing | Describe the architecture in words for 5 minutes | Immediately reach for the marker and say "Let me draw this" — visual always wins |
| Draw too abstract | Just boxes labelled "Frontend" and "Backend" | Label every box with the technology AND the responsibility: "API Gateway — JWT validation, rate limiting, routing" |
| Forget cross-cutting | Only draw the happy path | Add Redis, CDN, Identity Provider to the side — they show you think about the whole system |
| Draw silently | Draw everything, then explain | Narrate every line as you draw it — the explanation IS the interview answer |

---

## 7. Hruday's Real Experience Hook

> "I've drawn this architecture in internal design reviews and in team knowledge-sharing sessions at SAP Labs. The act of drawing it — forcing yourself to put every component on a whiteboard — is actually how I found gaps in our design. When I drew the notification service and tried to draw its arrow to the database, I realised we hadn't decided on the notification data model yet. Diagrams surface assumptions."

---

## 8. Scale Evolution

**Drawing for a junior role** → Draw the 3-layer version: Browser → Backend → DB. Clean, correct.

**Drawing for a senior role** → Add API Gateway, show at least 2 microservices, show CDN. Label auth flow.

**Drawing for a staff/lead role** → Full 5-layer diagram with Redis, Kafka, Identity Provider, Module Federation detail, cross-cutting concerns. Mention service mesh and distributed tracing as next steps.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | System design rounds always start with "draw the architecture" | Speed and clarity of drawing signals you've built real systems, not just read about them |
| Swiggy / Meesho | High-growth companies want architects who can communicate complexity simply | Drawing a clean diagram under pressure shows you can onboard teams on complex systems |
| Adobe / Microsoft | Architecture review culture — you will present diagrams in design reviews on day 1 | Diagram quality = architectural credibility in your first 30 days |
| SAP Labs | You literally built this system — you can draw it from memory because you owned every layer | This is the answer that separates you from every other candidate |

---

## 10. Related Topics — What to Study Next

- **Full system architecture** — [387] the narrative to pair with this diagram; words that explain every box
- **Module Federation in plain English** — [389] the mechanism behind the runtime load arrows in Diagram 2
- **Performance architecture before/after** — [396] a different diagram showing the lazy loading improvement
- **JWT + OAuth 2.0** — topics 52–53; the auth flow in Diagram 3 connects directly to these
- **API Gateway pattern** — topic 69; the gateway box in every diagram

---

*Part 23 · ASCII Architecture Diagram — Practise Drawing This · Full Stack Interview Guide · Hruday D · 2026*
