# Micro-frontend Shell — Routing, Shared State, Versioning
> Part 19 — System Design Case Studies · High Frequency (Frontend)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What a micro-frontend is**: apply microservices thinking to the frontend; split a large SPA into independently deployable "slices" (each owned by a different team); a Shell application loads and composes these slices at runtime
- **Module Federation (Webpack 5)**: the core mechanism; each micro-frontend (MFE) exposes components/routes via its own `remoteEntry.js`; the Shell loads these at runtime from CDN URLs; no pre-bundling together; each MFE is deployed independently
- **Shell responsibilities**: global routing (top-level React Router); authentication (JWT/session management, passes auth context down to MFEs); shared singleton libraries (React, React-DOM — deduplicated via federation shared config); error boundaries per MFE (one MFE crash doesn't take down the shell or other MFEs); navigation bar; user profile context
- **Communication between MFEs**: prefer Custom Events on `window` (loose coupling, no shared imports); avoid sharing redux stores directly across MFE boundaries; shared context (user profile, theme) via the Shell's context or a lightweight event bus
- **Independent deployment**: Team A deploys their MFE to `cdn.example.com/team-a/remoteEntry.js`; Shell's routing config points to this URL; Shell's next page load picks up the new MFE version without the Shell redeploying; Shell and MFEs deploy on completely independent schedules
- **React deduplication**: both the Shell and MFEs use React — Module Federation's `shared` config marks React as a singleton, so only one copy loads in the browser; both meet the requirement `react: ">=18"`; version compatibility enforced at load time
- **Versioning strategies**: always-latest (Shell always loads the current JS file at the CDN URL — risky; a bug in MFE-A breaks it immediately for all users); versioned URLs (`remoteEntry-1.4.0.js` — Shell pins to a version; safe but requires Shell deploy to pick up MFE update); dynamic from registry (Shell fetches a manifest JSON that maps MFE → current version → URL; MFE teams update the manifest when ready; Shell reads fresh intent on each page load)
- **SAP Fiori Launchpad** is essentially a micro-frontend shell: independent "cards" and apps deployed by different SAP product teams, composed into one shell experience

---

## 1. One-Line Definition
A micro-frontend shell is a host application that loads independently deployed frontend modules (micro-frontends) at runtime using Webpack Module Federation, manages global routing and authentication, and allows multiple teams to build and ship their UI slices without coordinating a monorepo release.

---

## 2. The Problem It Solves

A company builds a large enterprise platform: Dashboard, Reports, User Management, Settings, Analytics, and a Billing section. All six areas are in one giant React monorepo. Every sprint, six teams are submitting PRs to the same repo. A regression in the Reports module blocks the Dashboard team's release because they share a build pipeline. Deploying any change requires coordinating all six teams. The release train moves at the speed of the slowest team.

The codebase grows to 450,000 lines. Build times are 18 minutes. Bundle size is 4MB even for users who only need the Dashboard.

Micro-frontends solve this: each team owns their slice as an independent module. Dashboard deploys independently. Reports deploys independently. A regression in Reports only blocks the Reports team — everyone else ships on schedule. The Shell loads whichever version of Reports is live from the CDN at runtime.

---

## 3. How It Works Internally

### Module Federation Architecture

```
Browser (loads Shell first)
  ↓
Shell App (remoteEntry.js from cdn.example.com/shell/v2.1/remoteEntry.js)
  Shell bootstraps:
  1. Loads global CSS, design tokens
  2. Sets up React Router top-level routes
  3. Sets up AuthContext, UserProfileContext
  4. Sets up global error boundary
  
  Route: /dashboard  → lazily load RemoteDashboard
  Route: /reports    → lazily load RemoteReports
  Route: /settings   → lazily load RemoteSettings

RemoteDashboard  →  cdn.example.com/dashboard/v3.0/remoteEntry.js (Team A)
RemoteReports    →  cdn.example.com/reports/v2.1/remoteEntry.js   (Team B)
RemoteSettings   →  cdn.example.com/settings/v1.5/remoteEntry.js  (Team C)

                         Runtime Federation Graph
                         ┌──────────────────────────────────┐
                         │           SHELL                  │
                         │  React (singleton, v18.3)        │
                         │  React-Router (v6)               │
                         │  UserContext, ThemeContext        │
                         │                                  │
                         │  Route: /dashboard ─────────────┼──→ RemoteDashboard
                         │  Route: /reports ───────────────┼──→ RemoteReports
                         │  Route: /settings ──────────────┼──→ RemoteSettings
                         └──────────────────────────────────┘
                                         │
                               (all share React singleton)
                               (each MFE has own CSS space)
```

### MFE Manifest (version registry approach)

```json
// https://registry.example.com/mfe-manifest.json
// Team updates this file when they deploy; Shell reads it fresh
{
    "dashboard": {
        "version": "3.2.1",
        "url": "https://cdn.example.com/dashboard/3.2.1/remoteEntry.js",
        "routes": ["/dashboard", "/dashboard/:id"]
    },
    "reports": {
        "version": "2.1.4",
        "url": "https://cdn.example.com/reports/2.1.4/remoteEntry.js",
        "routes": ["/reports", "/reports/:type"]
    },
    "settings": {
        "version": "1.5.0",
        "url": "https://cdn.example.com/settings/1.5.0/remoteEntry.js",
        "routes": ["/settings"]
    }
}
```

---

## 4. The Code

### Wrong Way — Everything in One App

```typescript
// ❌ Monolithic SPA: every team touches the same App.tsx

// App.tsx
import { DashboardPage }  from './features/dashboard/DashboardPage';
import { ReportsPage }    from './features/reports/ReportsPage';
import { SettingsPage }   from './features/settings/SettingsPage';
import { DashboardStore } from './features/dashboard/store';
import { ReportsStore }   from './features/reports/store';
// 450 more imports...

// ❌ All teams deploy together — one broken import = entire app breaks
// ❌ One 4MB bundle — even users who only use Settings download Dashboard code
// ❌ Build time: 18 minutes because webpack processes 450,000 lines every time
// ❌ Shared global Redux store: Report's action accidentally clears Dashboard state
```

```typescript
// ✅ Module Federation Shell + independent MFEs

// webpack.config.js (Shell)
const { ModuleFederationPlugin } = require('@module-federation/enhanced');

module.exports = {
    plugins: [
        new ModuleFederationPlugin({
            name: 'shell',
            remotes: {
                // URLs come from a manifest API — not hardcoded
                // Shell fetches manifest at startup, then sets these dynamically
                dashboard: 'dashboard@https://cdn.example.com/dashboard/3.2.1/remoteEntry.js',
                reports:   'reports@https://cdn.example.com/reports/2.1.4/remoteEntry.js',
                settings:  'settings@https://cdn.example.com/settings/1.5.0/remoteEntry.js',
            },
            shared: {
                react:        { singleton: true, requiredVersion: '>=18.0.0', eager: false },
                'react-dom':  { singleton: true, requiredVersion: '>=18.0.0', eager: false },
                'react-router-dom': { singleton: true, requiredVersion: '>=6.0.0' },
                // Design system tokens shared too — one CSS var set
                '@our-org/tokens': { singleton: true },
            },
        }),
    ],
};
```

```typescript
// webpack.config.js (Dashboard MFE — built and deployed by Team A)
new ModuleFederationPlugin({
    name: 'dashboard',
    filename: 'remoteEntry.js',
    exposes: {
        './DashboardApp': './src/DashboardApp',  // ← what Shell imports
        './DashboardWidget': './src/DashboardWidget',  // ← reusable widget
    },
    shared: {
        react:       { singleton: true, requiredVersion: '>=18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '>=18.0.0' },
    },
})
```

```typescript
// Shell App.tsx — lazy loads MFEs on route change

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }    from './AuthContext';
import { ThemeProvider }   from './ThemeContext';
import { MFEErrorBoundary } from './MFEErrorBoundary';
import { LoadingFallback }  from './LoadingFallback';

// ✅ Dynamic imports — browser downloads Dashboard JS only when user navigates there
const DashboardApp = lazy(() => import('dashboard/DashboardApp'));
const ReportsApp   = lazy(() => import('reports/ReportsApp'));
const SettingsApp  = lazy(() => import('settings/SettingsApp'));

export function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <BrowserRouter>
                    <ShellNavBar />
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                        
                        <Route
                            path="/dashboard/*"
                            element={
                                // ✅ Error boundary prevents one MFE crash from killing the shell
                                <MFEErrorBoundary mfeName="dashboard">
                                    <Suspense fallback={<LoadingFallback />}>
                                        <DashboardApp />
                                    </Suspense>
                                </MFEErrorBoundary>
                            }
                        />
                        
                        <Route
                            path="/reports/*"
                            element={
                                <MFEErrorBoundary mfeName="reports">
                                    <Suspense fallback={<LoadingFallback />}>
                                        <ReportsApp />
                                    </Suspense>
                                </MFEErrorBoundary>
                            }
                        />
                        
                        <Route
                            path="/settings/*"
                            element={
                                <MFEErrorBoundary mfeName="settings">
                                    <Suspense fallback={<LoadingFallback />}>
                                        <SettingsApp />
                                    </Suspense>
                                </MFEErrorBoundary>
                            }
                        />
                    </Routes>
                </BrowserRouter>
            </ThemeProvider>
        </AuthProvider>
    );
}
```

```typescript
// MFEErrorBoundary.tsx — one MFE crash doesn't take down the shell

import React from 'react';

interface State { hasError: boolean; error?: Error; }
interface Props { mfeName: string; children: React.ReactNode; }

export class MFEErrorBoundary extends React.Component<Props, State> {
    
    state: State = { hasError: false };
    
    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }
    
    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // ✅ Log to observability platform — which MFE failed, what error, user context
        console.error(`[MFE Error Boundary] MFE: ${this.props.mfeName}`, error, info);
        // In production: send to your error monitoring service
    }
    
    render() {
        if (this.state.hasError) {
            return (
                <div role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
                    <h2>Something went wrong</h2>
                    <p>The {this.props.mfeName} module failed to load. Other parts of the app still work.</p>
                    <button onClick={() => this.setState({ hasError: false })}>Try Again</button>
                </div>
            );
        }
        return this.props.children;
    }
}
```

```typescript
// Cross-MFE communication via Custom Events — loose coupling

// Type-safe event bus (shared utility — can be in @your-org/shell-utils)
type EventMap = {
    'user:profile-updated':  { userId: string; name: string };
    'cart:item-added':       { productId: string; quantity: number };
    'notification:dismiss':  { notificationId: string };
};

// Publish an event (Dashboard MFE publishes when user updates their profile)
function publishEvent<K extends keyof EventMap>(type: K, payload: EventMap[K]) {
    window.dispatchEvent(new CustomEvent(type, { detail: payload }));
}

// Subscribe to an event (Shell NavBar listens for profile updates to refresh user name)
function subscribeEvent<K extends keyof EventMap>(
    type: K,
    handler: (payload: EventMap[K]) => void
): () => void {
    const fn = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener(type, fn);
    return () => window.removeEventListener(type, fn);  // ← cleanup function
}

// Usage in Dashboard MFE:
publishEvent('user:profile-updated', { userId: 'u-123', name: 'Hruday D' });

// Usage in Shell NavBar (React hook):
function useUserProfileUpdates() {
    const [name, setName] = useState('');
    useEffect(() => {
        return subscribeEvent('user:profile-updated', ({ name }) => setName(name));
        // ✅ subscribeEvent returns cleanup fn — called when component unmounts
    }, []);
    return name;
}
```

```typescript
// AuthContext in Shell — passed to MFEs via React Context

// Shell sets this up from its authentication flow (OIDC/JWT)
export const AuthContext = createContext<AuthState>({
    user:  null,
    token: null,
    isAuthenticated: false,
    logout: () => {},
});

// MFE reads it via useContext — works because React is a singleton
// and context is provided by the Shell at the root level
function DashboardApp() {
    const { user, token } = useContext(AuthContext); // ← Shell's context
    
    // All API calls use Shell's auth token
    useEffect(() => {
        fetch('/api/dashboard/widgets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }, [token]);
    
    return <DashboardLayout user={user} />;
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What problem does micro-frontend architecture solve and when would you NOT use it?"

**Hruday's answer:**
> Micro-frontends solve team scalability and deployment independence. When a single frontend codebase is shared by 5+ teams, every release becomes a coordination exercise — teams are blocked by each other's bugs, the CI/CD pipeline is a bottleneck for everyone, and the bundle grows as each team adds their features. Micro-frontends let each team own their slice end-to-end: their own repo, their own CI/CD, their own deployment cadence.
>
> When NOT to use it: teams smaller than 3-4. For a startup or a product with one team, the complexity of Module Federation, the MFE manifest system, error boundaries per module, and the cross-MFE communication overhead is pure added cost with no team scalability benefit. The overhead of maintaining the federation config, the shared library versioning, and the inter-MFE contract testing is significant. For one team, a well-organized monorepo is simpler and faster.
>
> The clear signal to adopt micro-frontends: more than one team deploys to the same frontend codebase and they are blocking each other's releases regularly. That's the concrete pain point it solves.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you handle shared state between micro-frontends? For example, a cart badge in the Shell's navbar needs to update when the Cart MFE adds an item."

**Hruday's answer:**
> This is a cross-MFE communication challenge. The cart badge shows the item count in the Shell's navbar. The Cart MFE adds items. They need to stay in sync without coupling the Cart MFE to the Shell's internal state.
>
> The cleanest approach: Custom Events on `window`. When Cart MFE adds an item, it dispatches `window.dispatchEvent(new CustomEvent('cart:item-added', { detail: { count: 3 } }))`. The Shell's NavBar has a `useEffect` that adds a listener for `cart:item-added` and updates its local count state.
>
> Why this is better than a shared Redux store: the Cart MFE doesn't need to import the Shell's store. There's no shared runtime state object that both MFEs can mutate. The event is fire-and-forget — Cart publishes and doesn't care who's listening. This keeps the two modules fully independent. If the Shell team restructures the navbar, they don't need Cart team's cooperation.
>
> For larger data sharing (currency preference, user role, feature flags): the Shell provides these via React Context at the root level. Since React is a singleton (deduplicated via Module Federation's shared config), all MFEs can `useContext(UserContext)` and receive the Shell's context values. The Shell owns and updates the context; MFEs read from it; no MFE writes back to it.
>
> The rule of thumb: events for MFE→Shell notifications (upward); context for Shell→MFE data sharing (downward). Never MFE→MFE direct communication — always route through the Shell or the event bus.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Always-latest URLs vs versioned URLs vs manifest-based registry — which versioning strategy do you recommend?"

**Hruday's answer:**
> I recommend manifest-based versioning for any production system.
>
> Always-latest: the Shell always fetches `remoteEntry.js` (no version in the URL). Every deploy pushes the new JS to that URL; Shell picks it up on next page visit. Simple, but dangerous — a bug in the Cart MFE is live for all users the moment it deploys. No staged rollout, no rollback without hotfixing the MFE and redeploying.
>
> Versioned URLs: `remoteEntry-2.1.0.js`. Shell's config explicitly references the version. Safe — a new MFE version doesn't affect anyone until the Shell updates its config and redeploys. But it defeats the independence goal: to ship Cart MFE v2.2.0, the Shell team also has to deploy a config change. Teams are coupled again.
>
> Manifest-based: a JSON file at a known URL (`registry.example.com/mfe-manifest.json`) maps each MFE name to its current version and URL. Shell fetches this manifest at startup. When Cart MFE team ships v2.2.0, they update the manifest JSON (automated in their CD pipeline). Next Shell page load reads the manifest, gets the new URL, loads the new version. Shell team does not need to deploy.
>
> Manifest also enables staged rollout: Cart team can update the manifest to 20% of users (by user ID hash or a feature flag service), monitor error rates, then roll out to 100%. If v2.2.0 has a critical bug, revert the manifest to point back to v2.1.0. It's a CDN routing change — instant rollback.

---

### Q4 — System Design Angle
**Interviewer asks:** "SAP Fiori Launchpad is essentially a micro-frontend shell. How would you architect it?"

**Hruday's answer:**
> SAP Fiori Launchpad (FLP) is exactly this pattern at enterprise scale. Multiple independent SAP product teams (Finance, HR, Procurement, Sales) deploy their applications as independent UI5 or React apps. FLP is the shell that composes them.
>
> The shell provides: user authentication and session (via SAP Identity Authentication); navigation (launchpad tiles, groups, navigation bar); shared context (company code, language, theme — passed to each app); error isolation (one app crashing doesn't affect the others shown in other tiles).
>
> How I'd architect the modern React version: Shell is a React app with React Router defining top-level routes (`/fiori/s4/finance/*`, `/fiori/s4/hr/*`). Each app team exposes their app root component via Module Federation. The Shell's manifest (`/api/launchpad/apps`) lists available apps, their routes, and their CDN URLs — this manifest is dynamic (per user role, per license, per feature flag). Shell fetches the manifest on login, builds the router dynamically, renders the relevant tiles on the home screen.
>
> The SAP-specific challenge: some SAP apps are SAP UI5 (not React). The Shell can still load them via iframes with the `postMessage` API for communication — a hybrid federation approach. Modern SAP UI5 apps support Web Components, which work in any framework context.
>
> The key architectural decision: the Shell should be minimal. It is not a business application; it is infrastructure. No business logic. No feature development. Its sole responsibility is composition, routing, auth, and error isolation. Feature development happens in the MFEs.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Sharing a Redux store between MFEs | "The easiest way to share state is to have a global Redux store that all MFEs import" | Sharing a Redux store couples all MFEs to the store's shape; when the store schema changes, every MFE must update simultaneously; this is the same coordination problem we were trying to solve; instead: Shell provides context for downward data (read-only from MFEs); Custom Events for upward notifications (MFE → Shell); no direct store sharing across module boundaries |
| All dependencies as singletons | "I'll mark every shared library as a singleton in Module Federation to save bundle size" | Over-eager singleton sharing breaks MFE independence; if both Shell and Dashboard MFE need `lodash` but the Shell ships `lodash@4` and the Dashboard was built with an internal function from `lodash@5`, forcing them to share `lodash@4` might break the Dashboard; only true singletons that cannot have two copies should be forced as singletons: `react`, `react-dom`, `react-router-dom`, your design tokens; everything else should be allowed to bundle their own version |
| No contract testing between Shell and MFE | "Each team tests their own MFE independently in their CI pipeline" | MFEs expose a contract (props, context API, events) to the Shell; if Dashboard MFE v3.0 renames its exported component from `DashboardApp` to `DashboardRoot`, the Shell's `import('dashboard/DashboardApp')` fails silently at runtime; contract testing (using tools like Pact or custom schema validation tests) verifies that the MFE still exposes the expected module exports and that the Shell can still consume them; run these as integration tests in CI before merging, not just unit tests |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, the product I worked on contributed features into a Fiori-like launchpad shell. We had our application deployed as an independent UI module. The integration challenge we faced was that the shell's auth token expiry wasn't propagated to our module — when the user's session expired, the shell showed the login prompt, but our module was still trying to make backend requests with the expired token and showing '401 Unauthorized' error banners.
>
> The fix: we subscribed to the shell's `auth:session-expired` Custom Event and immediately cleared our pending request queue and showed a session-expired overlay that redirected to the shell's login flow rather than our own error handling. The cross-MFE event contract was the right approach — we didn't need the shell to call our code directly; we just needed a reliable signal to react to."

---

## 8. Scale Evolution

**1,000 users / single team →** Don't use micro-frontends. A well-organized monorepo with clear module boundaries and lazy loading gives you the loading performance benefits without the operational complexity. The team dependency problem doesn't exist with one team.

**100,000 users / 3-5 teams →** Module Federation with 3-5 MFEs. Manifest-based versioning. Shared design system via Module Federation shared config. MFE error boundaries. An integration test suite that verifies MFE contracts. Teams deploy independently.

**10 million users / 10+ teams →** Manifest-based registry with per-user A/B routing (feature flags drive which MFE version loads for which user). CDN-level rollback (update manifest JSON → all CDN edge nodes pick it up within seconds). Contract testing automated in every MFE's CI pipeline. Shell API is versioned and stable — breaking changes to Shell context require deprecation notice to all MFE teams. Observability: each MFE error boundary reports to shared error monitoring with `mfeName` tag so you can track error rates per MFE.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Razorpay Dashboard has multiple product areas (Payments, Payroll, Banking, eCommerce) — likely composed; multiple teams at a fintech scale need independent deployment | Shell isolation; auth propagation across micro-frontends |
| Swiggy / Meesho | Meesho has seller app + buyer app; large frontend teams building independently; Swiggy's super-app (food + Instamart + Genie) needs independent team ownership | Multi-team independence; shared session and auth context |
| Adobe / Microsoft | Microsoft uses Module Federation across Azure Portal (different service teams own their "blades"); Adobe Experience Cloud is a shell composed of independently shipped apps | Azure Portal is the canonical enterprise micro-frontend shell; large-scale manifest routing |
| SAP Labs | SAP Fiori Launchpad is the original micro-frontend shell at enterprise scale; directly relevant to everyday work; multi-framework (UI5 + React) federation via web components | Direct, real experience with a micro-frontend shell product |

---

## 10. Related Topics — What to Study Next

- **Topic 314 — Design System Architecture** — the design system package is exactly the kind of singleton that Module Federation should share; both connect through the `shared` dependency config; design tokens must be a singleton to avoid multiple `:root` declarations from different token versions
- **Topic 307 — Real-time Dashboard** — micro-frontend architecture for the dashboard area specifically; WebSocket connections in an MFE managed by the Shell's centralized connection vs each MFE managing its own connection trade-offs connect to this topic
- **Topic 12 — Code Splitting and Lazy Loading** — Module Federation extends this concept to separate deployments; understanding `React.lazy`, dynamic `import()`, and Suspense is the foundational knowledge before adding Module Federation on top
- **Topic 08 — Performance Optimisation — Bundle Analysis** — MFE architecture can improve or worsen total bundle size depending on shared config; understanding how to analyse what each MFE bundles and what overhead Module Federation itself adds is critical to making the architecture worth it

---

*Part 19 · Micro-frontend Shell — Routing, Shared State, Versioning · Full Stack Interview Guide · Hruday D · 2026*
