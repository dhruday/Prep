# Why SAP UI5, React, and Next.js — Three Frameworks in One App
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.5: The Architecture Decisions
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The realistic answer**: the tech choices per module came from team expertise and existing investment, not from a clean-room architecture vision; Team A had been building with SAP UI5 for years and had a production-quality SAP UI5 component library; Team C needed SSR for their analytics pages (SEO and initial load speed); Teams B and D had React expertise and a shared design system — these facts drove the choices
- **SAP UI5 (Team A — reports)**: SAP's own enterprise component library; deeply integrated with SAP backend APIs and data models; Team A's engineers know it inside out; switching them to React would mean rewriting a mature module with no user-visible benefit while risking regression; the migration cost is not justified
- **React + Redux (Team B + D — dashboards + admin)**: Team B and D share a component library; they have identical deployment patterns and release cadences; using the same framework means shared code, shared hiring profile, shared code review capacity
- **Next.js (Team C — analytics)**: The analytics module is heavy — lots of data, many charts; initial page load was slow (LCP 5+ seconds) without SSR; Next.js server-side rendering moves the data fetching server-side so the initial HTML arrives with data; cold tab opens significantly faster; Team C also needed React, and Next.js is React with SSR
- **The Module Federation glue**: each team wraps their framework in a thin React host component for Module Federation; SAP UI5 renders into a `ref` div via `useEffect`; Next.js exports a plain React component from the module

---

## 1. One-Line Definition
Three frameworks coexist in BI Launchpad because each module's framework choice was driven by team expertise and a specific technical requirement — SAP UI5 for Team A's existing production code, Next.js for analytics SSR performance, React for the teams sharing a design system.

---

## 2. The Decision Matrix Per Team

```
TEAM A — Reports Module → SAP UI5
─────────────────────────────────────────────────
Requirement:        Deep integration with SAP backend data models
                    Existing SAP UI5 component library from prior project
                    Rich data tables with sorting, grouping, aggregation
                    Team of 6 engineers — all have SAP UI5 expertise

Why NOT React:      Rewriting 50,000 LOC of mature SAP UI5 code to React
                    would take 6+ months, introduce regression risk,
                    and provide zero user-visible benefit
                    SAP UI5 component library is better than any open-source
                    React equivalent for SAP backend data structures

Why SAP UI5 works:  Wraps in a React host component for Module Federation
                    SAP UI5 renders into a DOM ref:
                    function Reports() {
                      const containerRef = useRef(null);
                      useEffect(() => {
                        if (!containerRef.current) return;
                        const component = new sap.ui.core.ComponentContainer({
                          name: 'com.sap.bi.reports',
                          settings: { rootPath: '/reports' }
                        });
                        component.placeAt(containerRef.current);
                        return () => component.destroy();
                      }, []);
                      return <div ref={containerRef} id="reports-container" />;
                    }

─────────────────────────────────────────────────────────────────────────
TEAM B — Dashboards Module → React + Redux Toolkit
─────────────────────────────────────────────────
Requirement:        Complex interactive charts (Recharts, D3)
                    Shared component library with Team D
                    High update frequency (real-time data via WebSocket)
                    Team with strong React expertise

Why React + Redux:  RTK Query for data fetching with caching + real-time updates
                    Shared component library is React — reuse is immediate
                    Team D uses the same stack → shared code review, shared hiring

─────────────────────────────────────────────────────────────────────────
TEAM C — Analytics Module → Next.js (App Router)
─────────────────────────────────────────────────
Requirement:        Initial page load speed — the analytics home page had
                    LCP 5.4s in the React SPA version (data fetching on client)
                    Heavy data pages need data when HTML arrives, not after
                    React expertise already in team (Next.js is React)

Why NOT plain React: Client-side data fetching → blank page → data load → render
                     LCP is the render completion time = very slow for data-heavy page

Why Next.js:         Server component fetches data before HTML is sent:
                     async function AnalyticsSummary() {
                       const data = await fetchKPIs();  // runs on server
                       return <KPIGrid items={data} />;
                     }
                     HTML arrives with data baked in
                     LCP: 5.4s client → 2.1s with SSR

How it exports as Module Federation remote:
                     // analytics module's next.config.js
                     const { NextFederationPlugin } = require('@module-federation/nextjs-mf');
                     module.exports = {
                       webpack(config) {
                         config.plugins.push(new NextFederationPlugin({
                           name: 'analyticsRemote',
                           filename: 'static/chunks/remoteEntry.js',
                           exposes: {
                             './AnalyticsApp': './src/app/AnalyticsApp.tsx',
                           },
                           shared: { react: { singleton: true } }
                         }));
                         return config;
                       }
                     };

─────────────────────────────────────────────────────────────────────────
TEAM D — Admin Module → React + Redux Toolkit
─────────────────────────────────────────────────
Requirement:        CRUD forms for user and permission management
                    Role-based access control rendering
                    Shared component library with Team B (same forms, same tables)

Why React + Redux:  Identical to Team B — same shared library, same patterns,
                    lower cognitive load when moving engineers between teams
```

---

## 3. The Coordination Cost

```
WHAT MULTIPLE FRAMEWORKS COSTS:
  Shared dependencies must match or be isolated carefully
  React versions must match across B, C, D (singleton: true requires ≥ same major)
  SAP UI5 cannot be a singleton (it's not a Module Federation dep) — loaded independently
  CI/CD: each team has a different build command
    Team A: ui5 build (SAP UI5 CLI)
    Team B: vite build
    Team C: next build
    Team D: vite build

  Debugging cross-module issues is harder — errors look different
  Hiring: "you'll work in a React module" vs "you'll need to know SAP UI5"

WHAT WE DID TO MITIGATE:
  1. Typed event bus contract owns all cross-module communication
     → no framework-specific patterns leak across boundaries

  2. Design token file shared by all four teams
     → colours, spacing, typography are consistent regardless of framework

  3. Each team's module wrapped in a React host component
     → from the shell's perspective, all four modules are React components
     → all four are mounted/unmounted via React.lazy + Suspense
     → the framework difference is invisible to the shell
```

---

## 4. Interview Questions & Model Answers

### Q1 — The Justification
**Interviewer asks:** "Three frameworks in one app — isn't that a maintenance nightmare?"

**Hruday's answer:**
> "It's a maintenance cost, but one we inherited from reality rather than chose arbitrarily. Team A had a production-quality SAP UI5 reports module built over three years; asking them to rewrite it in React for architectural purity would have cost six months with zero user-visible benefit and real regression risk. Team C had a specific performance requirement — their analytics page was at LCP 5.4 seconds with client-side rendering; Next.js SSR got it to 2.1 seconds, which was a business requirement. Teams B and D were already on React sharing a component library. The coordination cost is real: shared React versions must match, CI pipelines are different per team, debugging looks different. We mitigated it with a typed event bus so cross-module communication has no framework-specific patterns, a shared design token file so UI consistency holds regardless of framework, and a Module Federation wrapper pattern so from the shell's perspective, all four modules are React components — the internal framework is invisible. Would I design it with three frameworks in a new project? No. But for a system that already had these team investments, the migration cost of standardisation was higher than the coordination cost of isolation."

---

### Q2 — SSR Detail
**Interviewer asks:** "How does Next.js work with Module Federation if Module Federation is a webpack concept?"

**Hruday's answer:**
> "Next.js uses webpack under the hood, so Module Federation is supported via a plugin — @module-federation/nextjs-mf. The analytics module's next.config.js includes the NextFederationPlugin, which exposes a React component as the remote entry. The shell loads it with React.lazy the same way it loads the Vite/webpack remotes. The SSR part happens inside the analytics module's own Next.js server — when the analytics route is accessed, Next.js pre-renders the component server-side and the HTML that arrives in the browser already has the data. From the shell's perspective, it receives a React component. The SSR benefit happens within Team C's module infrastructure, transparent to the shell."

---

## 5. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We chose 3 frameworks for flexibility" | Sounds arbitrary or over-engineered | "Each choice was driven by team expertise and a specific requirement; SAP UI5 for existing code, Next.js for SSR LCP requirement, React for shared component library" |
| "Any framework works" | No technical justification | Name the specific requirement: Team C's LCP was 5.4s client-only; SSR got to 2.1s — there's a number |
| No cost admitted | "It works well" | "CI pipelines differ per team; React version contracts require governance; hiring descriptions are different; debugging cross-module issues is harder" |
| "We'd do it the same way in a new project" | No learning | "In a new project I'd standardise on React + optional Next.js for SSR-needed routes; the three-framework setup is inherited from team investments — I wouldn't design it from scratch that way" |

---

## 6. Hruday's Real Experience Hook

> "The most interesting technical moment from the three-framework setup was the first time Team C's Next.js analytics module had a breaking change in their SSR setup. Their module failed to load; the shell's ErrorBoundary caught it and showed a fallback. What I noticed was that Teams A, B, and D were completely unaffected. Analysts working in dashboards had no idea the analytics module was broken. Team C fixed and redeployed in 20 minutes. That's the isolation benefit working in practice — a complete framework-level failure in one module is invisible to the other three."

---

## 7. Scale Evolution

**3 frameworks (current) →** Typed event bus prevents framework leakage. Design tokens for UI consistency. React wrapper for all Module Federation remotes.

**Standardisation path →** As new modules are added, standardise on React + optional Next.js for SSR routes. SAP UI5 module maintained as-is but not expanded (reduce surface over time).

**Enterprise platform →** Framework choice is bounded by a Technical Architecture Committee decision. New modules require justification for non-standard choice. Migration plan required for legacy framework modules with end-of-support dates.

---

## 8. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Acquired products or legacy systems with different stacks; micro-frontend isolation allows integration without rewrite | SAP UI5 wrapper pattern — how to integrate a legacy stack without rewriting it |
| Swiggy / Meesho | Multiple teams with different expertise; React standardisation vs pragmatic choices for performance | Next.js SSR for initial load performance; honest cost/benefit of multi-framework |
| Adobe / Microsoft | Large enterprise platform with 10+ teams; framework standardisation policy vs team autonomy; TypeScript contracts as the seam | Typed event bus as the framework-agnostic integration contract |
| SAP Labs | You lived with this setup — you know the build, the debugging, the coordination cost, and the SSR performance gain | The candidate who can explain why SAP UI5 stayed and why Next.js was added, with numbers |

---

*Part 23 · Why SAP UI5, React, and Next.js — Three Frameworks in One App · Full Stack Interview Guide · Hruday D · 2026*
