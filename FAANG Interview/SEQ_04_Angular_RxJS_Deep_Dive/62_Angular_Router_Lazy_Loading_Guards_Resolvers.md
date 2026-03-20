# 62. Angular Router — Lazy Loading, Guards, Resolvers
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

The Angular Router maps URL paths to components, with lazy loading splitting the app into chunks loaded on demand. Guards control navigation access — `canActivate` for auth checks, `canDeactivate` for unsaved-changes warnings. Resolvers pre-fetch data before a route activates, so the component renders with data immediately instead of showing a loading skeleton. At Oracle I used a resolver to pre-fetch Spring Boot API data before rendering the record detail page, eliminating the 400ms skeleton flash entirely.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

The Angular Router is a client-side navigation system that updates the URL and renders the corresponding component tree without a page reload. It solves three core problems:
1. **URL ↔ component mapping** — declarative route configuration
2. **Code splitting** — `loadComponent` / `loadChildren` for lazy chunks
3. **Navigation lifecycle** — guards and resolvers for auth, pre-fetching, and unsaved-change protection

### How It Works Internally

**Navigation flow lifecycle:**

```
URL change / router.navigate()
    ↓
Route recognition (match URL against route config)
    ↓
canDeactivate guards (current route — can we leave?)
    ↓
canActivate guards (target route — can we enter?)
    ↓
canActivateChild guards (child routes)
    ↓
canMatch guards (route selection — Angular 15+)
    ↓
Resolvers run (parallel by default; sequential with depOnPreviousRoute)
    ↓
Lazy loading executes (dynamic import runs if chunk not loaded)
    ↓
Router activates route — component renders
    ↓
NavigationEnd event emits
```

**Lazy Loading:**

```typescript
// loadChildren — lazy module (legacy)
{ path: 'dashboard', loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule) }

// loadComponent — standalone component (preferred, Angular 14+)
{ path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) }
```

Angular combines the chunk files — each `loadComponent` / `loadChildren` becomes a separate chunk in the webpack/ESBuild output. The chunk is fetched from the network on first navigation to that route.

**Guards — functional style (Angular 15+):**

```typescript
// Modern: functional guard (preferred — no class, tree-shakeable)
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Modern: functional canDeactivate
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  return component.hasUnsavedChanges()
    ? confirm('You have unsaved changes. Leave anyway?')
    : true;
};
```

**Resolvers:**

A resolver runs BEFORE the component activates. The route does not activate until all resolvers complete (or error). The resolved data is available in `ActivatedRoute.data`.

```typescript
export const userProfileResolver: ResolveFn<UserProfile> = (route) => {
  return inject(UserService).getProfile(route.paramMap.get('id')!);
};
```

**`canMatch` guard (Angular 15+):** Determines whether a route is even considered during matching — allows multiple routes with the same URL path but different guards (A/B testing, role-based routing).

**`RouterLink` directive:** Generates anchor `<a>` tags with proper `href` attributes; supports `routerLinkActive` for active-state CSS classes. `[routerLink]` with relative paths resolves against the current activated route.

**`ActivatedRoute` service:** Provides Observables for route param changes, query param changes, data (resolver output), and fragment. Subscribe to these rather than snapshot for reactive forms and components that react to URL changes.

### Architecture & Component Boundaries

```
App Routes
├── '' (redirect to /home)
├── 'home' → HomeComponent (eager — in main bundle)
├── 'auth' → loadComponent(LoginComponent) [chunk: auth]
├── 'dashboard' → {
│     canActivate: [authGuard],            // runs before chunk loads
│     loadChildren: () => routes,          // chunk: dashboard
│     providers: [DashboardDataService]    // route-scoped DI
│   }
│   ├── '' → DashboardHomeComponent
│   ├── ':id' → {
│   │     resolve: { profile: userProfileResolver } // chunk: dashboard
│   │     component: ProfileDetailComponent
│   │   }
│   └── 'settings' → {
│         canDeactivate: [unsavedChangesGuard]
│         component: SettingsComponent
│       }
└── '**' → loadComponent(NotFoundComponent) [chunk: not-found]
```

### Data Flow & State Flow

1. `router.navigate(['/dashboard', id])` or clicking `[routerLink]`
2. Router emits `NavigationStart`
3. Guards execute — return `true`, `false`, `UrlTree` (redirect), or Observable/Promise of these
4. Resolvers execute — return Observable; router waits for first emission
5. `loadComponent` dynamic import fires if chunk not cached
6. Router swaps `<router-outlet>` content — old component destroyed → new component created
7. `ActivatedRoute.data` contains resolver results; `ActivatedRoute.params` contains URL params
8. Router emits `NavigationEnd`

### Performance Implications

- **Lazy loading impact on FCP/LCP:** Eager bundles ship with `main.js`; lazy chunks are fetched on navigation. Main bundle size is the #1 FCP lever — every route that isn't the landing page should be lazy.
- **Preloading strategies:** `PreloadAllModules` fetches all lazy chunks after initial load during idle time. `QuicklinkStrategy` preloads chunks only for in-viewport links. Custom preloading strategies can be feature-flag-gated.
- **Resolver performance:** Resolvers block rendering. A slow 800ms resolver = 800ms white screen before content. Use `withComponentInputBinding()` + component-level loading state if the data is non-critical.
- **Guard timing:** `canActivate` runs before the lazy chunk downloads. An async auth check + chunk download = sequential delay. Use `canMatch` for path-based routing decisions that don't need async checks.

### Scalability Considerations

- **Large apps (50+ routes):** Route hierarchy matters — deeply nested lazy routes create fine-grained chunks but increase HTTP requests on first visit to deep paths. Balance: 1 chunk per major feature, not per component.
- **Auth at scale:** Guard-based auth works well for simple role checks. For complex entitlement systems (Salesforce-style), use `canMatch` to route different user tiers to different component implementations.
- **Server-side rendering:** Angular Universal respects the router — routes are matched server-side, resolvers run, HTML is returned. Lazy loading works on server too.

### Trade-offs

| Resolver (pre-fetch) | Component loading state | Choose resolver when |
|---|---|---|
| Data arrives before render — no skeleton | Component shows loading spinner | UX requires instant perceived content |
| Route blocked if resolver errors | Component handles error state itself | Resolver: critical data (page is meaningless without it) |
| Navigation shows delay | Instant navigation, loading in component | Component loading: data enhancement, not required |

| Functional guard | Class-based guard | Choose functional |
|---|---|---|
| Tree-shakeable, no class overhead | Needs DI class registration | Always prefer functional in Angular 15+ |
| `inject()` works directly | Constructor injection | Functional: simpler, less boilerplate |
| Works with `canMatch` | Limited to specific interfaces | Functional: more flexible typing |

### ⚠️ Anti-Patterns & Pitfalls

- **Resolver blocking for non-critical data** — if the resolver calls a slow API for supplementary data, it blocks the navigation for seconds. Reserve resolvers for the minimum critical dataset.
- **`ActivatedRoute.snapshot` instead of `ActivatedRoute.params` Observable** — snapshot is a one-time read. If the user navigates between child routes with different params (e.g., `/user/1` → `/user/2`), the component isn't destroyed and recreated — the snapshot never updates. Always subscribe to the Observable.
- **Guards that only return boolean — missing redirect** — a guard returning `false` leaves the user on a blank page if the navigation was programmatic. Return a `UrlTree` to redirect: `router.createUrlTree(['/login'])`.
- **Forgetting `withComponentInputBinding()` in `provideRouter`** — Angular 16+ can automatically bind route params to component `@Input()` properties, but you must opt in. Without it, the component has to manually inject `ActivatedRoute`.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At Oracle, the record detail route for Spring Boot-backed data used a `ResolveFn` to pre-fetch the record before the component activated. The detail view went from showing a 400ms loading skeleton to rendering fully on first paint. The resolver also handled 404s by redirecting to a "record not found" route before the component ever mounted.

At SAP, the BI Launchpad had a `canActivate` guard checking tile permissions against the SAP authorization service. If users bookmarked a direct tile URL they didn't have permission for, they were redirected to a permission-error page with the `returnUrl` param preserved so they could re-enter after requesting access.

At Bosch, the dashboard used `QuicklinkStrategy` preloading — charts the user had in their viewport were preloaded in the background. Navigating to the next dashboard tab felt instant because the chunk was already cached.

**At FAANG scale:**
- **Microsoft (Azure Portal):** Each blade is a lazy route. `canActivate` checks subscription and RBAC entitlements server-side before loading the blade chunk — prevents downloading 200KB blade bundles for unauthorised users.
- **Adobe (Creative Cloud):** Asset library routes use resolvers to pre-fetch folder metadata. The tree expands without any loading state — users perceive the folder navigation as instant.
- **Salesforce (CRM):** `canMatch` routes different user tiers to different component implementations at the same URL — Enterprise users see a rich data grid, Essentials users see a simplified list.
- **Cisco (WebEx):** Meeting route has a resolver that pre-checks WebRTC permissions (camera, mic) before the meeting component activates — surfaces the permissions dialog before render, not after.

**How it evolves with scale:**
- Small scale: Simple `canActivate` + lazy `loadComponent` covers all needs.
- Medium scale (100K users): Preloading strategy selection matters — `QuicklinkStrategy` vs `PreloadAllModules` based on bandwidth assumptions.
- Large scale (10M+ users, multi-team): Route guards become a shared contract — standardize functional guard composition patterns; route data schema becomes part of the architecture governance.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "Angular Router is the navigation backbone — it maps URLs to component trees and handles the complete navigation lifecycle. The three features I care most about architecturally are lazy loading, guards, and resolvers.
>
> Lazy loading via `loadComponent` splits the app into on-demand chunks — only the landing page is in the main bundle, everything else is fetched when needed. At SAP, this took our main bundle from 1.1MB to 340KB, which was the biggest single LCP improvement we made.
>
> Guards control navigation access. I exclusively use functional guards now — they're just functions, tree-shakeable, and `inject()` works directly inside them. The key is always returning a `UrlTree` for redirects, not just `false`, because `false` leaves the user stranded.
>
> Resolvers pre-fetch data before a component renders. At Oracle I used a resolver for a detail page that previously showed a 400ms loading skeleton — with the resolver the page rendered complete on first paint. The tradeoff is that the resolver blocks navigation, so I only use them for data the page is meaningless without."

### Likely Follow-up Questions

1. **`canActivate` vs `canMatch` — difference?** → `canActivate` runs after route selection; `canMatch` runs during route selection and can prevent a route from being considered at all. Use `canMatch` for role-based routing to different components at the same path.
2. **How do you pass data to a component via the router without resolvers?** → Route `data: { }` static property, or `withComponentInputBinding()` to bind params directly to `@Input()`.
3. **What happens if a resolver throws / returns an error?** → Navigation is cancelled; `NavigationError` event emits. Handle with `errorHandler` on the route or an RxJS `catchError` in the resolver.
4. **How do you implement route-based code splitting in Angular?** → `loadComponent` for standalone, `loadChildren` for module-based. Each lazy path becomes a separate webpack chunk automatically.

### vs Alternatives

| Angular Router | React Router v6 | Key difference |
|---|---|---|
| Resolvers built-in | Data loading via `loader` (RRv6) | Similar concept, Angular is older/more established |
| Functional guards with `inject()` | Loader/action functions | Both functional; Angular `inject()` is more powerful within Angular ecosystem |
| `canDeactivate` interface | `unstable_useBlocker` | Angular's `canDeactivate` is more stable and established |
| Route-level DI providers | No equivalent | Angular unique — massive advantage for service scoping |

### How to Signal Senior Thinking

> "The architectural insight is treating routes not just as URL mappings but as application boundaries — each route can have its own injector scope, its own preloading policy, and its own access control contract. When you think of routes as boundaries, the whole navigation lifecycle — guards, resolvers, providers — falls into place as a unified resource lifecycle management system."

---

## 💻 5. Code Example

```typescript
// app.routes.ts — complete route configuration
import { Routes } from '@angular/router';
import { authGuard, premiumGuard } from './guards/auth.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';
import { recordResolver } from './resolvers/record.resolver';
import { DashboardDataService } from './dashboard/dashboard-data.service';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Eager — landing page, must be instant
  { path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },

  // Lazy auth with redirect on fail
  { path: 'login', loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },

  // Protected feature area
  {
    path: 'dashboard',
    canActivate: [authGuard],            // gate before chunk download
    providers: [DashboardDataService],   // route-scoped service
    loadChildren: () => import('./dashboard/dashboard.routes').then(m => m.dashboardRoutes),
  },
];

// dashboard/dashboard.routes.ts
export const dashboardRoutes: Routes = [
  { path: '', loadComponent: () => import('./dashboard-home.component').then(m => m.DashboardHomeComponent) },

  // Record detail with resolver — renders fully qualified on first paint
  {
    path: 'record/:id',
    resolve: { record: recordResolver },  // blocks until data ready
    loadComponent: () => import('./record-detail.component').then(m => m.RecordDetailComponent),
  },

  // Settings with unsaved-changes guard
  {
    path: 'settings',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./settings.component').then(m => m.SettingsComponent),
  },

  // canMatch — route different components to same URL based on user tier
  {
    path: 'analytics',
    canMatch: [premiumGuard],
    loadComponent: () => import('./analytics-premium.component').then(m => m.AnalyticsPremiumComponent),
  },
  {
    path: 'analytics',
    loadComponent: () => import('./analytics-basic.component').then(m => m.AnalyticsBasicComponent),
  },
];

// guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // Return UrlTree for redirect — never return false alone
  return auth.isAuthenticated() || router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

// resolvers/record.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { RecordService } from '../services/record.service';
import { Record } from '../models/record.model';
import { catchError, of } from 'rxjs';

export const recordResolver: ResolveFn<Record | null> = (route) => {
  const recordService = inject(RecordService);
  const router = inject(Router);
  const id = route.paramMap.get('id')!;

  return recordService.getRecord(id).pipe(
    catchError(() => {
      router.navigate(['/dashboard', 'not-found']);
      return of(null);
    })
  );
};

// record-detail.component.ts — consume resolver data
@Component({ standalone: true, template: `<h1>{{ record?.name }}</h1>` })
export class RecordDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  record: Record | null = null;

  ngOnInit(): void {
    // Subscribe to params for reactive navigation between records
    this.route.data.subscribe(({ record }) => {
      this.record = record;
    });
  }
}

// main.ts — router setup
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(
      appRoutes,
      withComponentInputBinding(),         // @Input() auto-bound to route params
      withPreloading(QuicklinkStrategy),   // preload for in-viewport links
      withViewTransitions(),               // Angular 17+ — CSS View Transitions API
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
  ],
});
```

**Interview vs Production difference:**
In an interview, show `authGuard`, `recordResolver`, and `loadComponent` — the core triangle. In production, add `withComponentInputBinding()`, preloading strategy, error boundaries on resolvers, and telemetry in `router.events` for NavigationEnd timing metrics.

---

## 🧠 6. Memory Aid

**Mental Model:** The router is like airport security — you declare your destination (URL), go through checkpoints (guards), wait for boarding (resolvers), then land in the new gate (component renders). Lazy loading is like gates only opening when a flight is called — not all gates are staffed 24/7.

**If you go blank:** "Guards control access to routes; resolvers pre-fetch data before render; lazy loading splits the app into on-demand chunks. Guards run in sequence: canDeactivate → canActivate → canActivateChild → resolvers."

**Mnemonic:** **GLRC** — **G**uards, **L**azy loading, **R**esolvers, **C**hild routes.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Lazy loading cuts initial bundle 60–70%; resolvers eliminate loading skeletons for critical data
→ Performance: Code splitting is the single highest-ROI bundle optimization in large Angular apps
→ Business: Guards enforce access control client-side; resolvers give instant perceived performance on navigation

**How it works (3 sentences):**
The Angular Router matches URL changes to route configurations, running guards and resolvers in sequence before swapping `<router-outlet>` content. `loadComponent` / `loadChildren` trigger dynamic imports that produce separate webpack/ESBuild chunks fetched on first navigation to that route. Guards return `true`, `false`, or a `UrlTree` (redirect), while resolvers return Observables that block route activation until they emit, providing pre-fetched data to the activated component via `ActivatedRoute.data`.

**Company relevance:**
- Microsoft: Azure Portal's blade system is route-driven — lazy chunk + route-scoped DI per blade enables independent team deployments and memory-bounded blade lifetimes
- Adobe: Asset management routes use resolvers for instant folder expansion — no loading spinners in the creative workflow
- Salesforce: `canMatch` routes different component implementations per user tier at the same URL — Essential vs Enterprise vs Unlimited plans see different analytics at `/analytics`
- Cisco: Meeting route resolver pre-checks WebRTC device permissions before component activation — surfaces browser permission dialogs at the right moment, before the call UI renders

---
✅ Topic 62/486 complete → Continuing to Topic 63: Default vs OnPush Change Detection
