# Before/After Architecture for Performance — Draw This
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.2: The Performance Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Draw two timelines side by side**: BEFORE shows the browser waterfall downloading all four bundles in parallel upfront; AFTER shows only the shell bundle downloading, then additional module bundles loading on-demand when the user navigates
- **The visual proof**: in the BEFORE diagram, the page shows content at ~6s because four bundles must all parse before React can render anything; in the AFTER, the shell renders at ~1.4s because it's only 380 KB; module code loads 400ms after navigation
- **The CDN addition is the third diagram you should draw**: show how bundles are served from a CDN edge node close to the user — the 380 KB shell at the top, then module bundles fetched from the edge on demand; without CDN context the performance numbers look suspicious
- **Key architectural change to highlight**: the modules didn't change — Team A still writes exactly the same Report module code; only the shell's loading strategy changed from static to dynamic import; this is a shell-level architectural decision, not a per-team change
- **Prefetch hint is the production polish**: after drawing lazy loading, add that the shell preloads the module the user is most likely to visit next using `<link rel="modulepreload">` — eliminates the first-navigation delay for the primary path
- **What the interviewer remembers**: "the before diagram shows a monolith in disguise; the after diagram shows the micro-frontend architecture actually delivering on its promise"

---

## 1. One-Line Definition
The before/after architecture diagram shows how switching from all-upfront to on-demand module loading transformed a micro-frontend that behaved like a monolith into one that actually delivered independent, incremental loading.

---

## 2. The Two Architecture Diagrams

### BEFORE — All Modules Loaded Upfront (Monolith in Disguise)

```
t=0s   Browser requests shell HTML from CDN
        │
t=0.1s Shell HTML received ← 12 KB
        │
        ├── Request: shell.bundle.js         ← 380 KB
        ├── Request: reportModule.bundle.js  ← 520 KB  ← NOT needed (user going to /dashboard)
        ├── Request: dashboardModule.bundle.js ← 440 KB
        ├── Request: analyticsModule.bundle.js ← 510 KB ← NOT needed
        └── Request: adminModule.bundle.js    ← 250 KB  ← NOT needed
        
        (All four requests fire simultaneously on page load)
        
t=0.8s DNS + TCP + TTFB for all bundles
t=2.7s All 2.1 MB of JS downloaded (Fast 3G simulation)
t=4.5s JS parsed and executed (main thread blocked for ~1.8s)
t=6.2s ★ LCP: Dashboard module mounts, hero image renders
t=8.1s ★ TTI: All event handlers attached, user can interact

Total blocking time: 2,300ms
User experience: white screen for 6.2s → frozen for 8.1s
```

### AFTER — Lazy Loading with CDN Distribution

```
t=0s   Browser requests shell HTML from CDN edge (nearest region)
        │
t=0.08s Shell HTML received from CDN edge ← 12 KB (edge = 10ms latency vs 80ms origin)
        │
t=0.08s Browser parses HTML, discovers defer script
        │
t=0.1s  ├── Request: shell.bundle.js      ← 380 KB (vendors split out → common cache)
        └── Request: vendors.bundle.js    ← 180 KB (React, Redux — high cache hit)

                        ╔══════════════════════════════╗
t=0.9s  vendors cached? ║ CACHE HIT on return visit    ║ → skip vendors download
                        ╚══════════════════════════════╝
        
t=1.0s  Shell JS downloaded (380 KB)
t=1.3s  Shell JS parsed (380 KB parse << 2.1 MB parse before)
t=1.4s  ★ FCP: Nav bar and skeleton loaders visible

        User's browser route: /dashboards
        
t=1.4s  React Router resolves → React.lazy fires
        ├── Request: dashboardModule.bundle.js ← 440 KB
        (reportModule, analyticsModule, adminModule → NOT fetched)
        
t=1.7s  Dashboard module downloaded (440 KB)
t=2.0s  Dashboard module parsed
t=2.5s  Suspense resolves
t=3.4s  ★ LCP: Dashboard hero image renders (WebP 78 KB, loaded with fetchpriority=high)
t=4.4s  ★ TTI: All handlers attached

RESULT:
  Initial JS:  2.1 MB → 380 KB (user on /dashboards never downloads report/analytics/admin code)
  LCP:         6.2s → 3.4s (-45%)
  TTI:         8.1s → 4.4s (-46%)
  TBT:         2,300ms → 180ms (-92%)
```

---

## 3. The CDN Distribution Diagram

```
WITHOUT CDN (before):
  User in Bangalore ──────────────────────────────► Origin Server (Frankfurt)
                         80ms round-trip latency
                         2.1 MB payload
                         Time to first byte: 80ms × multiple connections = 400ms+

WITH CDN (after):
  User in Bangalore ──────► CDN Edge (Mumbai) ─────► Origin (Frankfurt)
                  10ms latency                         (only for cache miss)

  Shell HTML: served from Mumbai edge ← 10ms first byte
  Shell bundle: served from Mumbai edge ← cached after first request
  Module bundles: served from Mumbai edge ← each team's bundle cached on first user hit

  Cache TTL strategy:
    shell.bundle.js          → 1 hour TTL (changes on every deploy)
    vendors.bundle.js        → 365 days TTL (content-hashed filename: vendors.abc123.js)
    reportModule.bundle.js   → 1 hour TTL (Team A deploys independently)
    Images (WebP)            → 30 days TTL (content-hashed filenames)

  Result:
    Return visit from same region: vendors.js = cache hit (instant)
    First visit from Mumbai: 10ms edge latency vs 80ms origin latency
    LCP on first visit (India): 3.4s
    LCP on return visit (India): 1.8s (vendors cached; shell tiny at 380 KB)
```

---

## 4. The Prefetch Optimisation (Production Polish)

```
PREFETCH — Eliminate First-Navigation Delay for the Primary Path

Problem: First visit to /reports has ~400ms delay while module downloads.
         Most BI Analyst users go to /reports immediately after login.

Solution: Start fetching /reports module in the background while user is on /dashboard.

// shell/src/components/DashboardRoute.tsx
import { useEffect } from 'react';

export function DashboardRoute() {
  useEffect(() => {
    // User is on /dashboard — they will probably navigate to /reports next
    // Pre-fetch but don't execute — just warm the browser cache
    const prefetch = () => import('reportModule/ReportModule');
    
    // Wait until browser is idle (doesn't compete with dashboard rendering)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(prefetch, { timeout: 2000 });
    } else {
      setTimeout(prefetch, 1000);
    }
  }, []);
  
  return <DashboardContent />;
}

// Result:
//   User opens /dashboard → at idle time, report bundle downloads (background)
//   User clicks /reports → React.lazy resolves immediately (already in cache)
//   First navigation to /reports: 0ms delay instead of 400ms
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Draw the before and after for your performance improvement."

**Hruday's answer:**
> [Draws two timelines on whiteboard]
>
> "Here's the before. At t=0, the browser loads the shell HTML. Then it immediately fires requests for all four module bundles — report, dashboard, analytics, admin — because the shell has static imports at the top of its file. All 2.1 MB downloads, then parses, then executes. LCP doesn't happen until 6.2 seconds because nothing can render until all that JavaScript is processed.
>
> Here's the after. At t=0, same shell HTML. Now only the shell bundle downloads — 380 KB. It renders in 1.4 seconds. The user is sent to /dashboards. React.lazy fires a request for just the dashboard module — 440 KB. That downloads in 300ms, renders at 3.4 seconds LCP.
>
> The report, analytics, and admin bundles are never downloaded by a user who only visits the dashboard. That's the key. The modules were already independent — we just changed the shell's loading strategy from a static import to a dynamic import. One word change per route in the shell file."

---

### Q2 — Deep Dive
**Interviewer asks:** "What happens to the user experience during the first navigation to a module they haven't visited before?"

**Hruday's answer:**
> "There's a short delay — about 400ms on a fast connection, maybe 1.5 seconds on slow 4G. React Suspense shows whatever fallback you configure during that download. We showed a skeleton layout — placeholder boxes that match the rough shape of the module's content — rather than a spinner. Research from Google shows outline/skeleton placeholders feel faster to users than a generic loading spinner because the user can see what's coming. For the primary path — most BI analysts go to Reports first after login — we added a prefetch. While the user is reading the dashboard, the browser sits idle and we use `requestIdleCallback` to download the Reports module in the background. So by the time the user clicks Reports, the bundle is already in the browser cache and the navigation is instant. For secondary paths, the 400ms delay is acceptable because it only happens on first visit; subsequent visits are instant from the browser cache."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| No diagram | Describe loading in words | Draw it. Two timelines, clearly labelled. Visual always wins. |
| Forget CDN context | Only describe lazy loading | "CDN gets us 10ms edge latency vs 80ms origin — the loading architecture and CDN together explain the full improvement" |
| Miss the skeleton UX | "We show a spinner while loading" | "Skeletons feel faster than spinners — user sees the content shape before it arrives; reduces perceived wait time" |
| Ignore prefetch | "Lazy loading means a delay on first navigation" | "For the primary path, we prefetch at idle time while the user is on the dashboard — first navigation to reports is instant" |

---

## 7. Hruday's Real Experience Hook

> "The moment the lazy loading went into production was when I ran Lighthouse with the DevTools network tab open and saw the before waterfall compared to the after waterfall. Before: five parallel bars all starting at t=0. After: one short bar, then silence, then one more bar when I clicked into reports. That visual reduction — from five bars to one — is exactly what the user's connection was doing less of. The waterfall is the story."

---

## 8. Scale Evolution

**1,000 users →** The two-timeline diagram above. Lazy loading + CDN. Prefetch for the primary path.

**100,000 users →** Module bundle versioning: never use `?v=latest` on CDN URLs; use content-hashed filenames so unchanged modules get infinite cache TTL and update instantly when changed (zero cache invalidation latency).

**10 million users →** Server-side rendering the shell HTML at the CDN edge (Edge SSR) so the skeleton/nav bar is in the initial HTML — users see the nav bar before any JavaScript executes. LCP becomes the server-streamed HTML, not a JavaScript-rendered element.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant dashboard: first load on login → needs to be fast | CDN edge; prefetch for primary path (e.g. Transactions page) |
| Swiggy / Meesho | Order tracking loaded on every delivery — millions of loads per day | Lazy loading seller and admin tools; skeleton UX on 3G |
| Adobe / Microsoft | Creative tool load time = user session start time | Edge SSR for shell; service worker caching for returning creatives |
| SAP Labs | You drew this waterfall yourself — you visually verified the improvement in DevTools | Show you understand the browser waterfall, not just the final score |

---

*Part 23 · Before/After Architecture for Performance — Draw This · Full Stack Interview Guide · Hruday D · 2026*
