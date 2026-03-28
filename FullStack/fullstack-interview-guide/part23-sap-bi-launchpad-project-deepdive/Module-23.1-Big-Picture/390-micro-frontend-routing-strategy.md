# Micro-Frontend Routing Strategy — Shell, Sub-routes, Deep Links
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.1: The Big Picture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The rule**: the shell owns the top-level routes (`/reports`, `/dashboards`, `/admin`); each module owns its own sub-routes (`/reports/123`, `/reports/123/drill-down`) — this boundary gives each team full autonomy over their URL space
- **How deep links work**: a user bookmarks `/reports/123/drill-down`, comes back tomorrow, and the shell must load the Report module AND pass the full path to it for the module to render the right sub-view; the shell does NOT intercept `/reports/*` — it passes everything after `/reports` to the module
- **Browser back/forward button**: this is the hardest part to get right; if the module uses React Router's `MemoryRouter` (common mistake), the browser back button doesn't work; the module MUST use `BrowserRouter` or share the shell's router instance via Federation
- **The event bus pattern**: modules communicate UP to the shell (not directly to each other) via a global event bus exposed by the shell; example: Report module fires `REPORT_SHARED` event → shell shows a toast notification; no direct import between modules
- **Base path injection**: the shell passes each module its base path on mount (`/reports`) so the module's React Router can set `basename="/reports"` — without this, the module's internal links generate wrong URLs
- **Interview signal**: "We gave each team full autonomy over their sub-routes by passing the basename to each module at mount time — teams add and remove sub-routes without touching the shell"

---

## 1. One-Line Definition
The routing strategy splits URL ownership between the shell (top-level paths) and each module (sub-paths), so teams can add sub-routes independently while the shell handles deep linking, browser history, and cross-module navigation.

---

## 2. The Problem It Solves

Without a clear routing contract, you end up with one of two failure modes.

The first is URL ownership conflicts: Team A adds `/reports/export` as a sub-route. Team B adds `/dashboards/export`. The shell doesn't know about these sub-routes. A user bookmarks `/reports/export` and comes back the next day. The shell doesn't recognise it, renders a 404, or loads the wrong module.

The second is broken back button: a module uses `MemoryRouter` (which stores history in memory, not in the browser URL). The user navigates inside the module — Report → Drill-down → Chart detail. They click the browser back button. Nothing happens, or they navigate back to before the report module loaded rather than to the previous sub-page. Enterprise users notice this immediately and report it as a bug.

The routing strategy below solves both.

---

## 3. How It Works Internally

### The Mental Model
Think of a shopping mall. The mall owns the main floor map — which shop is at which location. Each shop owns its own internal layout — where the changing rooms are, where the checkout is. The mall doesn't dictate what happens inside each shop. But if someone asks for directions to "Shop 3, changing room B," the mall escort walks them to Shop 3's entrance and tells the shop's staff "the customer wants changing room B." That's the shell-to-module routing handoff.

### URL Ownership Diagram

```
SHELL owns:           MODULE owns:
/                     /reports/[id]
/reports/*     →      /reports/[id]/drill-down
/dashboards/*  →      /dashboards/[id]
/analytics/*   →      /dashboards/[id]/chart/[chartId]
/admin/*       →      /analytics/explore
                       /analytics/explore?filter=date
```

### Deep Link Flow

```
User pastes URL into browser: https://bi.sap.com/reports/ORD-123/drill-down

1. Browser loads shell HTML (from CDN)
2. Shell's React Router: path /reports/ORD-123/drill-down
   → matches route /reports/*
   → renders <ReportRoute />
   
3. <ReportRoute /> mounts remote ReportModule with:
   basePath="/reports"
   initialPath="/ORD-123/drill-down"   (the remainder after /reports)
   
4. ReportModule's internal React Router:
   basename="/reports"
   initialEntries={["/ORD-123/drill-down"]}
   → renders ReportDetailPage for id=ORD-123
   → renders DrillDownView
   
5. User sees the correct page. Deep link works.
```

---

## 4. The Code

### Wrong Way — MemoryRouter in Module (breaks back button)

```typescript
// ❌ Module uses MemoryRouter — URL in browser never changes; back button broken
function ReportModuleRoot() {
  return (
    // MemoryRouter stores history in JavaScript memory only
    // Browser URL stays at /reports — never shows /reports/123
    // Browser back button navigates OUT of the reports module entirely
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<ReportList />} />
        <Route path="/:id" element={<ReportDetail />} />
      </Routes>
    </MemoryRouter>
  );
}
```

> **Why this fails in production:** The browser URL never reflects the user's position within the module. Bookmarks don't work (`/reports` is always the URL, never `/reports/123`). The browser back button exits the module rather than navigating within it. Enterprise users file this as a critical bug.

### Right Way — BrowserRouter with basePath from Shell

```typescript
// ✅ Shell passes basePath to module; module uses BrowserRouter with basename

// shell/src/routes/ReportRoute.tsx
import { useLocation } from 'react-router-dom';
const RemoteReportModule = React.lazy(() => import('reportModule/ReportModule'));

export function ReportRoute() {
  const location = useLocation();
  // Pass everything after /reports as the initial path to the module
  const subPath = location.pathname.replace(/^\/reports/, '') || '/';
  
  return (
    <ErrorBoundary fallback={<ModuleErrorFallback name="Reports" />}>
      <Suspense fallback={<ModuleLoadingSpinner />}>
        <RemoteReportModule
          basePath="/reports"
          initialPath={subPath}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

// reportModule/src/bootstrap.tsx (Team A's code)
interface ModuleProps {
  basePath: string;
  initialPath: string;
}

export default function ReportModuleRoot({ basePath, initialPath }: ModuleProps) {
  return (
    // BrowserRouter with basename keeps browser URL in sync
    // basename="/reports" means <Link to="/123"> generates href="/reports/123"
    <BrowserRouter basename={basePath}>
      <Routes>
        <Route path="/" element={<ReportListPage />} />
        <Route path="/:reportId" element={<ReportDetailPage />} />
        <Route path="/:reportId/drill-down" element={<DrillDownPage />} />
        {/* Team A adds new sub-routes here without touching the shell */}
      </Routes>
    </BrowserRouter>
  );
}
```

### Event Bus — Cross-Module Communication

```typescript
// shell/src/eventBus.ts — exposed through Module Federation shared scope
type EventMap = {
  USER_LOGGED_OUT: void;
  REPORT_SHARED: { reportId: string; recipientEmail: string };
  NOTIFICATION: { message: string; type: 'info' | 'success' | 'error' };
};

class ShellEventBus {
  private emitter = new EventTarget();
  
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail: payload }));
  }
  
  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    this.emitter.addEventListener(event, listener);
    return () => this.emitter.removeEventListener(event, listener); // unsubscribe
  }
}

export const shellEventBus = new ShellEventBus();

// ─────────────────────────────────────────────────────────────
// In ReportModule (Team A) — fire an event UP to shell
// Team A does NOT import from shell — shell exports eventBus via shared scope
import { shellEventBus } from 'shell/eventBus'; // Federation shared export

function ShareReportButton({ reportId }: { reportId: string }) {
  return (
    <button onClick={() =>
      shellEventBus.emit('REPORT_SHARED', { reportId, recipientEmail: 'team@sap.com' })
    }>
      Share Report
    </button>
  );
}

// In Shell — listen for events from any module and show a toast
shellEventBus.on('REPORT_SHARED', ({ reportId }) => {
  showToast(`Report ${reportId} shared successfully`);
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How did you handle URL routing across multiple micro-frontend modules?"

**Hruday's answer:**
> "We split URL ownership cleanly. The shell owns the top-level path segments — `/reports`, `/dashboards`, `/analytics`, `/admin`. Each module owns everything beneath its segment. The shell's React Router matches `/reports/*` and renders the Report module with two props: `basePath='/reports'` and the remaining sub-path. The module's own BrowserRouter uses that basename, so its internal Links and navigation generate correct browser URLs and the browser history API reflects every navigation within the module. This makes deep links work — if someone bookmarks `/reports/123/drill-down`, the shell loads the Report module and passes `/123/drill-down` as the initial path, and the module renders straight to the drill-down view. Browser back and forward work correctly because the module is using the real history API, not MemoryRouter. The contract between shell and modules is just those two mount props — each team can add sub-routes without ever touching the shell code."

---

### Q2 — Deep Dive
**Interviewer asks:** "How do modules communicate with each other without creating tight coupling?"

**Hruday's answer:**
> "Modules never import from each other — that would create a build dependency that defeats the purpose of independence. Instead, the shell exposes an event bus as a shared Federation export. A module emits events UP to the shell — for example, the Report module fires a 'REPORT_COMPLETED' event when a report finishes generating. The shell listens for that event and shows a notification toast. If the Dashboard module also needs to react to reports completing, it subscribes to the same event from the bus. The event bus is typed — I defined a TypeScript interface mapping event names to their payload shapes, so every team knows exactly what events exist and what data they carry. No module imports another module. No module calls another module's API. The shell is the message broker. This keeps the coupling surface tiny — if the Report module is rewritten, as long as it still fires 'REPORT_COMPLETED' with the same payload, nothing else breaks."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| MemoryRouter for modules | "We have separate routers per module" | "We use BrowserRouter with basename — MemoryRouter breaks deep links and the back button" |
| Modules import each other | "Module A imports a util from Module B" | "Never — modules only talk through the shell's typed event bus; direct imports create build coupling" |
| Shell knows module sub-routes | "We put all routes in the shell config" | "Shell only knows the top-level path; each team owns their sub-routes; shell doesn't need to know about /reports/123" |
| URL doesn't change on navigation | "It works fine with hash routing" | "Enterprise users need shareable, bookmarkable URLs; BrowserRouter with proper basename is the only production-ready solution" |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs we initially used MemoryRouter in one of the modules. Enterprise users immediately noticed the back button issue — they'd drill down into a report, click back, and land on the login page instead of the report list. It looked like a serious bug. Switching to BrowserRouter with basename resolved it in one change. I now treat 'does the back button work inside the module' as a smoke test before any release."

---

## 8. Scale Evolution

**Prototype →** Shell handles routing for one remote module. Pass `basePath` as a prop. Done.

**Production →** Four modules, typed event bus, each module's sub-routes fully autonomous. Deep link testing in E2E suite for each module.

**High scale →** Server-side rendering in the shell for first-paint of the correct module on deep link (avoids the loading spinner on first paint). Route-level analytics — event bus fires `ROUTE_CHANGED` events consumed by an analytics service to track user navigation patterns across modules without each module implementing tracking separately.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Multi-section dashboard — payments, settlements, analytics, developer tools — each team owns their section | Routing contract between shell and modules; deep link support for bookmarkable reports |
| Swiggy / Meesho | Seller onboarding wizard and seller analytics — different teams, same URL space | Basename injection pattern; back button working through multi-step forms |
| Adobe / Microsoft | Creative Cloud app switcher — routing across Photoshop web, Illustrator web, etc. | Cross-app routing with shared identity state |
| SAP Labs | You built this — you debugged the MemoryRouter issue in production and fixed it | Real production experience, not theoretical knowledge |

---

## 10. Related Topics — What to Study Next

- **Module Federation** — [389] the mechanism that loads each module; prerequisite for understanding why basePath injection is needed
- **Different frameworks coexisting** — [391] how SAP UI5 and React handle routing differently within the same shell
- **Full system architecture** — [387] where routing fits in the overall system picture
- **React Router** — topic 209 area (React deep dive); understand BrowserRouter vs MemoryRouter vs HashRouter internals
- **Angular Router** — topic 217; how Angular's router works differently when hosted inside a Federation shell

---

*Part 23 · Micro-Frontend Routing Strategy · Full Stack Interview Guide · Hruday D · 2026*
