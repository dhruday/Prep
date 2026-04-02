# 5-Minute Architecture Walkthrough
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.6: Live Interview Practice
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The five-minute walkthrough is the most important interview preparation for this project** — it combines the architecture diagram (file 388), the Module Federation explanation (file 389), the routing strategy (file 390), and links to performance/security/accessibility outcomes
- **What interviewers are testing**: can you narrate a complex system clearly? Can you draw it? Do you understand every layer? Can you connect architecture to business outcomes?
- **The structure**: 5 layers, narrated top to bottom, 45-60 seconds each layer — browser shell, Module Federation loading, micro-frontend modules, API gateway + services, data layer
- **Must mention by minute 5**: the numbers — Lighthouse 60 → 95, 80% security reduction, 33 accessibility violations; these signal that you didn't just build the system, you improved it measurably
- **The drawing**: in a whiteboard or virtual interview, draw while talking; boxes → labels → arrows → data flows; the interviewer follows your hand; speaking and drawing at the same time signals confidence
- **Time split**: Layer 1 (browser shell) 1 minute, Layer 2 (Module Federation) 1.5 minutes, Layer 3 (modules detail) 30 seconds, Layer 4 (backend services) 1 minute, Layer 5 (outcomes) 1 minute

---

## 1. The Full 5-Minute Script — Word for Word

```
MINUTE 1 — Browser Shell and User Entry (60 seconds)
──────────────────────────────────────────────────────────────────
[Draw a rectangle at the top. Label it "Browser Shell (React + Redux)"]

"The user's browser loads the shell application first — this is a
React app with Redux Toolkit managing authentication state, user preferences,
and navigation. The shell owns the URL routing and the top-level layout:
navigation bar, breadcrumbs, the SAP-branded header. When a user logs in,
the auth service issues a JWT stored in an httpOnly cookie — zero JavaScript
access to the token, which matters for our security model.

The shell also owns the loading strategy — this is Module Federation powered,
which means the shell knows the URLs of four remote modules but doesn't bundle
them. It loads them on demand."

[Draw an arrow pointing down from the shell. Label "Module Federation"]

──────────────────────────────────────────────────────────────────
MINUTE 2 + 30 — Module Federation Loading (90 seconds)
──────────────────────────────────────────────────────────────────
[Draw four boxes below the shell. Label:
 Team A: Reports (SAP UI5)
 Team B: Dashboards (React)
 Team C: Analytics (Next.js)
 Team D: Admin (React)]

"When the user navigates to /reports, the shell triggers a dynamic import.
Webpack loads remoteEntry.js from Team A's CDN — this is a small manifest
file that tells webpack where to find Team A's actual code bundles. I should
mention: each remoteEntry has an SRI hash in the shell's HTML — if the CDN
is compromised and the file is swapped, the browser rejects it.

The key thing Module Federation handles is shared dependencies. React is
loaded once by the shell. All four modules use the shell's React copy —
not their own. That's the singleton config. Without it, you can end up
with two copies of React in memory and hooks break in unpredictable ways.

Each module is wrapped in React.lazy and Suspense in the shell. So from
the shell's perspective, all four modules are just React components —
regardless of whether Team A's is SAP UI5, Team C's is Next.js.
The framework difference is invisible to the shell."

──────────────────────────────────────────────────────────────────
MINUTE 3 + 30 — Backend: API Gateway and Services (90 seconds)
──────────────────────────────────────────────────────────────────
[Draw a horizontal line below the module boxes. Label "API Gateway (Spring Cloud Gateway)"]
[Below it, draw 4-5 boxes. Label: Auth Service, Report Service, Export Service,
 Dashboard Data, Analytics Engine, (Notification Service)]

"The frontend modules communicate with the backend through an API Gateway —
Spring Cloud Gateway. The gateway handles JWT validation, rate limiting,
and request routing. Services never need to implement their own JWT parsing.

Behind the gateway are eight Spring Boot 3.x microservices. I'll highlight
two with interesting characteristics. The Report Export Service is CPU-heavy —
when an analyst exports a PDF, that service generates it asynchronously and
sends a notification when it's done. At 9 AM when 800 analysts all export
reports simultaneously, it autoscales from 2 to 20 Kubernetes pods. The
User Permissions service, by contrast, handles low traffic and stays at
1-2 pods — Redis caches permission checks with a 5-minute TTL.

Between services: WebClient for non-blocking HTTP calls, Resilience4j
circuit breakers to prevent one slow service from cascading to others."

[Note: draw arrows between API Gateway and services]

──────────────────────────────────────────────────────────────────
MINUTE 4 + 30 — Data Layer + Outcomes (60 seconds)
──────────────────────────────────────────────────────────────────
[Below services, draw: PostgreSQL, Redis, S3]

"The data layer: PostgreSQL for report metadata and user data, Redis for
caching permission checks and frequently-accessed dashboard data, and S3
for storing generated report export files.

Let me connect this to the outcomes I mentioned. The Lighthouse score was
60 — we were loading all four module bundles, 2.1 MB, on every page load
regardless of route. Switching to React.lazy and route-based loading cut
initial load to 380 KB. LCP improved 45%, score reached 95.

Security: we had JWT in localStorage — any of the four modules' dependency
trees could read it. httpOnly cookie plus CSP listing all four CDN domains
reduced the vulnerability count by 80%.

Accessibility: the automated axe scan plus NVDA walkthrough found 33 violations —
most were missing ARIA labels and focus management gaps. Fixed in a 4-week
sprint. Unblocked an enterprise VPAT requirement."

[Draw Lighthouse gauge icon if whiteboard: 60 → 95]

──────────────────────────────────────────────────────────────────
MINUTE 5 — Invitation (30 seconds)
──────────────────────────────────────────────────────────────────
"That's the five-layer system — browser shell, Module Federation loading,
four micro-frontend modules, API gateway with eight services, data layer.
I've walked through the high points — performance, security, accessibility.

Which layer do you want to go deeper on?"
```

---

## 2. The Drawing Order (for Whiteboard / Virtual Board)

```
STEP 1: Top rectangle → "Browser Shell (React + Redux)"
STEP 2: Arrow down from shell → "Module Federation"
STEP 3: Four rectangles side by side → label each team/module
STEP 4: Dashed boundary line → "CDN-hosted bundles"
STEP 5: Arrow down → "httpOnly Cookie + fetch(credentials: 'include')"
STEP 6: Rectangle spanning width → "API Gateway (Spring Cloud Gateway)"
STEP 7: 5-6 smaller rectangles → individual Spring Boot services
STEP 8: Arrow down → data stores (Postgres, Redis, S3)
STEP 9: Numbers written to the side:
         4 teams · 8 services
         Lighthouse 60 → 95
         80% vuln reduction
         33 a11y violations fixed

TALKING POINTS WHILE DRAWING:
  As you draw the shell: explain the auth model
  As you draw the CDN boundary: mention SRI
  As you draw the API Gateway: mention JWT validation placement
  As you draw the services: mention scaling (Report Export 2 → 20 pods)
  As you write numbers: connect each to a business outcome
```

---

## 3. Transitions When the Interviewer Interrupts

```
Common interruptions — and how to handle:

"What's Module Federation exactly?"
→ "Good question — let me finish the diagram briefly and then
   explain Module Federation specifically."
OR
→ Pivot immediately: "Module Federation lets each team deploy their
  JavaScript bundle independently. The shell knows the URL to each
  team's remoteEntry.js — a manifest file. When the user navigates
  to a route owned by that team, webpack fetches their remoteEntry
  and loads their code at runtime, not build time."

"How does auth work across the four modules?"
→ "One httpOnly cookie, set by the Spring Boot auth service at login.
   All four modules use credentials: 'include' in their fetch calls.
   The browser attaches the cookie automatically. No module ever sees
   the raw JWT in JavaScript — the cookie is HttpOnly."

"What happens when a module fails to load?"
→ "Each React.lazy import is wrapped in an ErrorBoundary. If Team A's
   CDN is unreachable, the shell renders a fallback — 'Reports module
   is temporarily unavailable.' Teams B, C, D are unaffected. The
   failure is isolated to Team A's module slot."
```

---

## 4. Common 5-Minute Walkthrough Mistakes

| Mistake | Fix |
|---------|-----|
| Starting with the tech stack list | Start with the user story: "A business analyst logs in, navigates to /reports, runs their dashboard." |
| No drawing | Always draw — boxes first, then arrows, then labels; sketching and talking simultaneously shows fluency |
| No numbers | By minute 5: 4 teams, 8 services, 60→95, 45%, 80%, 33 — if any are missing, you've not set up the threads |
| Exhausting 5 minutes without inviting questions | End with: "Which layer do you want to go deeper on?" — you control which thread comes next |
| Saying "we used React" without explaining why | Every tech choice has a reason — React: shared component library; Next.js: SSR for LCP; Resilience4j: circuit breaker, not Hystrix |

---

## 5. Interview Questions & Model Answers

### Q1 — After the walkthrough
**Interviewer asks:** "You mentioned Module Federation — have you dealt with any issues with that setup?"

**Hruday's answer:**
> "Yes — the most memorable was the shared singleton issue. We had a period where Team D upgraded their React version in their module without updating the shared config. The shell's React was 18.2.0; Team D's was using 18.0.0 as a fallback. We now had two React instances in memory. The symptom was React context not working across the Team D module boundary — the shell's auth context wasn't readable inside Team D's components. The diagnosis took a few hours: checking the browser's React DevTools showed two roots instead of one. The fix was adding requiredVersion: '^18.2.0' with singleton: true to the shared deps config and aligning Team D's version. We also added a CI check: if a team's package.json has a React version that doesn't match the shell's, the build fails. We don't let that happen silently anymore."

---

## 6. Hruday's Real Experience Hook

> "The first time I did a whiteboard walkthrough of this architecture with a panel of five engineers, I got through three layers in five minutes because I kept explaining what each thing was, not how they connected. The feedback was: 'You know the parts; show me how data flows.' The second attempt — I drew the user clicking a button, traced the JWT from browser to API Gateway to individual service to database and back, and explained each hop. That's the walkthrough that lands. Architecture is about flow, not just components."

---

## 7. Practice Exercises

```
EXERCISE 1 — Timed drawing (5 minutes)
  Set a 5-minute timer
  Open a blank notebook
  Draw and narrate the full system out loud
  Every component must appear
  Every number must be spoken

EXERCISE 2 — Interrupt handling
  Get a friend (or record yourself)
  Start the walkthrough
  At random intervals, stop and ask yourself:
    "What if they ask about auth here?"
    "What if they ask about the database here?"
  Answer the question and resume the walkthrough naturally

EXERCISE 3 — One-minute version
  Compress the walkthrough to 60 seconds
  Forces you to know which beats are essential
  Shell → Module Federation → Gateway → Services → Outcomes
  One sentence each
```

---

## 8. Company Relevance

| Company | What thread to invite at the end | Why |
|---------|----------------------------------|-----|
| Razorpay / PhonePe | "Want to go deeper on the security model — the JWT httpOnly cookie and CSP?" | Fintech: security is the primary concern |
| Swiggy / Meesho | "Want to dig into the performance work — what specifically broke at Lighthouse 60 and how we fixed it?" | Consumer product: performance = retention |
| Adobe / Microsoft | "Want to go deeper on the Module Federation setup — how we handled shared dependencies and the singleton issue?" | Platform company: architecture scale is the interest |
| SAP Labs | "Want to go into the accessibility remediation — the 33 violations and how they connected to the enterprise deal?" | Enterprise B2B: compliance and sales alignment |

---

*Part 23 · 5-Minute Architecture Walkthrough · Full Stack Interview Guide · Hruday D · 2026*
