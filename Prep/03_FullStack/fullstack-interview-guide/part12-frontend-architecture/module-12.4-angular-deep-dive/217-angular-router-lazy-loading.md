# Angular Router — Lazy Loading, Guards, Resolvers
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Lazy loading**: JS bundles for route components are loaded ON DEMAND, not at app start; initial bundle contains only the shell; clicking a navigation link triggers a network request for that route's code; result: faster initial load (smaller initial bundle), slightly delayed first render of lazy route (acceptable trade-off)
- **`loadComponent`** (standalone): `{ path: 'dashboard', loadComponent: () => import('./dashboard.component').then(m => m.DashboardComponent) }` — code-splits a single standalone component into its own bundle
- **`loadChildren`** (NgModule legacy): `{ path: 'admin', loadChildren: () => import('./admin.module').then(m => m.AdminModule) }` — loads an entire NgModule and its routes lazily
- **`loadChildren` with routes array** (standalone modern): `{ path: 'orders', loadChildren: () => import('./orders.routes').then(m => m.ORDERS_ROUTES) }` — lazily loads a standalone route array without NgModule
- **Guards**: functions (Angular 15+ style) or classes that run BEFORE navigation completes; `CanActivate` — can I enter this route?; `CanDeactivate` — can I leave this route? (unsaved changes); `CanMatch` — should this route even be considered during matching?
- **Functional guards (Angular 15+)**: `canActivate: [() => inject(AuthService).isLoggedIn() ? true : redirect('/login')]` — no class, no boilerplate, uses `inject()` for DI
- **Resolvers**: run BEFORE the component activates and pre-fetch data; component's `ngOnInit` receives already-loaded data via `ActivatedRoute.data`; eliminates empty-state flicker
- **Preloading**: load lazy modules in the BACKGROUND after initial load; `PreloadAllModules` preloads everything; custom strategy preloads based on logic (e.g., `QuicklinkStrategy` — preload when link is in viewport)
- ✅ **Hruday's anchor**: Oracle India — `CanDeactivate` guard saved unsaved report drafts; Bosch — preloading strategy for manufacturing module bundles based on user role

---

## 1. One-Line Definition
Angular Router's lazy loading defers JavaScript bundle downloads until the user navigates to a route, while guards control navigation access and deactivation, resolvers pre-fetch data before component activation, and preloading strategies optionally warm up lazy bundles in the background — together delivering fast initial loads with smooth subsequent navigation.

---

## 2. The Problem It Solves

**Lazy loading solves:** Without code splitting, every component in the app — including admin dashboards, settings pages, and infrequently-visited features — is downloaded, parsed, and compiled when the user first opens the app. An enterprise Angular app can easily exceed 2MB of JavaScript. The user pays the download cost for features they may never use. Lazy loading makes each route a separate network request — the user downloads only what they actually navigate to.

**Guards solve:** Without guards, any user can navigate directly to any route by typing a URL. `/admin/users` is accessible to non-admins. Unsaved form data is lost silently when the user accidentally navigates away. Guards are the interception layer: check authentication/authorisation before entry, confirm before exit.

**Resolvers solve:** Without resolvers, components with data dependencies show briefly in an empty/loading state, then update when API calls complete. For data-critical pages (invoice detail, order confirmation), this flash of empty content is undesirable. Resolvers delay component activation until data is ready — the component renders fully populated on first render.

---

## 3. How It Works Internally

### Lazy Loading Bundle Mechanics

```
Application startup (without lazy loading):
main.js: 2.3 MB — includes ALL components, ALL features, ALL libraries
Browser parses + compiles 2.3 MB before first render.
Time to Interactive (TTI): ~4 seconds on mobile.

Application startup (with lazy loading):
main.js: 280 KB — only AppComponent, NavigationComponent, HomeComponent
dashboard-[hash].js: 450 KB — loaded when user navigates to /dashboard
admin-[hash].js: 380 KB — loaded when user navigates to /admin
orders-[hash].js: 320 KB — loaded when user navigates to /orders

Time to Interactive (TTI): ~1.1 seconds on mobile.
The user pays for the admin bundle only if they navigate to /admin.

Build-time: Angular CLI + webpack/esbuild detects dynamic import() calls
in route config and automatically creates separate chunk files.
```

### Navigation Lifecycle with Guards and Resolvers

```
Angular Navigation Lifecycle (full sequence):

User triggers navigation → router.navigate(['/orders/123']) or URL change

1. Router IDENTIFIES matching route in the route config tree

2. CanMatch guards run
   → If CanMatch returns false: this route is SKIPPED, Router tries next matching route
   → If true: proceed with this route

3. CanActivate guards run (on target route + all parent routes, outer→inner)
   → If any returns false/UrlTree: navigation CANCELLED or REDIRECTED
   → If all return true: proceed

4. CanActivateChild guards run (for child routes)

5. Resolvers run (all resolvers for the target route IN PARALLEL by default)
   → API calls are made, responses awaited
   → Results are stored in ActivatedRoute.data
   → User sees blank screen or loading indicator during this step

6. Router deactivates OLD route
   → CanDeactivate guards run on the component being left
   → If CanDeactivate returns false: navigation CANCELLED, user stays on old route

7. Angular creates new component instances for the activated route

8. Component receives resolved data via ActivatedRoute.data in ngOnInit

9. View renders (with full data — no empty state flash)

10. URL in browser updates

Key: Guards run BEFORE component creation. Resolvers run BEFORE component creation.
     CanDeactivate runs on the outgoing component (still alive and visible).
```

---

## 4. The Code

### Wrong Way — Eagerly Loaded Everything, No Guards

```typescript
// ❌ WRONG — All routes eagerly import components (no lazy loading)
// Every import at the top of the routes file forces webpack to include it
// in the main bundle:

import { AdminDashboardComponent } from './admin/admin-dashboard.component';
import { OrdersComponent } from './orders/orders.component';
import { ReportsComponent } from './reports/reports.component';
import { UserManagementComponent } from './admin/user-management.component';
// ↑ All four components are now in main.js, downloaded on initial page load.
// 90% of users never visit admin routes — they download admin code anyway.

export const routes: Routes = [
  { path: 'admin', component: AdminDashboardComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'reports', component: ReportsComponent },
  // ❌ No guards — anyone can navigate to /admin
  // ❌ No CanDeactivate — user loses unsaved data navigating away from a form
];

// ❌ WRONG — Class-based guard (verbose boilerplate, Angular 14 style)
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): 
    boolean | UrlTree {
    return this.authService.isAuthenticated() 
      ? true 
      : this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
}
// Verbose class required, must be @Injectable, must implement interface.
// Angular 15+ functional guards are shorter and don't require class boilerplate.

// ❌ WRONG — Resolver that blocks navigation unnecessarily via class:
@Injectable({ providedIn: 'root' })
export class OrderResolver implements Resolve<Order> {
  constructor(private orderService: OrderService) {}
  
  resolve(route: ActivatedRouteSnapshot): Observable<Order> {
    const id = route.paramMap.get('id')!;
    return this.orderService.getOrder(id);
    // ❌ No error handling: if API fails, navigation hangs forever
    // ❌ No timeout: slow API = infinitely blocked navigation
  }
}
```

> **Why this fails:** eager loading bloats the initial bundle with code users may never need. Class-based guards are verbose boilerplate. Resolvers without error handling cause navigation to hang on API failures.

### Right Way — Functional Guards, Resolvers, Lazy Loading

```typescript
// ✅ RIGHT — Modern standalone route config with lazy loading

// app.routes.ts
export const APP_ROUTES: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    // loadComponent: lazy loads a SINGLE standalone component
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'orders',
    // loadChildren with a lazy ROUTES ARRAY (no NgModule needed):
    loadChildren: () => import('./orders/orders.routes').then(m => m.ORDERS_ROUTES),
    canMatch: [() => inject(AuthService).isAuthenticated()],
    // canMatch: prevents this route from matching at ALL if user is not signed in
    // (vs canActivate which matches the route but then blocks activation)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [adminGuard],  // Functional guard reference
    canMatch: [() => inject(AuthService).hasRole('ADMIN')]
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent)
  }
];


// ✅ RIGHT — Functional guards (Angular 15+): clean, no class boilerplate

// auth.guard.ts
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  if (auth.isAuthenticated()) {
    return true;
  }
  
  // Return UrlTree to redirect (preferred over router.navigate — atomic with navigation)
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

// admin.guard.ts
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  return auth.hasRole('ADMIN') 
    ? true 
    : router.createUrlTree(['/forbidden']);
};

// Inline guard (for simple checks — no separate file needed):
{ 
  path: 'settings', 
  canActivate: [() => inject(FeatureFlagService).isEnabled('settings-v2')]
}


// ✅ RIGHT — CanDeactivate guard (unsaved changes protection)

// unsaved-changes.guard.ts
// Interface for components that can be "dirty":
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean | Observable<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;  // No unsaved changes — navigation allowed
  }
  
  // Return Observable from a confirm dialog (injected service):
  const dialog = inject(ConfirmDialogService);
  return dialog.confirm({
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Leave without saving?',
    confirmLabel: 'Leave',
    cancelLabel: 'Stay'
  });
  // Returns Observable<boolean>: if user confirms → true → navigate away
  //                             if user cancels → false → stay on current route
};

// Usage in routes:
{
  path: 'reports/edit/:id',
  loadComponent: () => import('./report-editor.component').then(m => m.ReportEditorComponent),
  canDeactivate: [unsavedChangesGuard]
}

// Component implements the interface:
@Component({ ... })
export class ReportEditorComponent implements HasUnsavedChanges {
  private form = this.fb.group({ title: '', content: '' });
  
  hasUnsavedChanges(): boolean {
    return this.form.dirty;  // Return true if form has been edited but not saved
  }
}


// ✅ RIGHT — Functional Resolver with error handling and timeout

// order.resolver.ts
export const orderResolver: ResolveFn<Order | null> = (route) => {
  const orderService = inject(OrderService);
  const router = inject(Router);
  const orderId = route.paramMap.get('id')!;
  
  return orderService.getOrder(orderId).pipe(
    timeout(5000),  // Don't block navigation for more than 5 seconds
    catchError((err) => {
      console.error('Order resolve failed:', err);
      router.navigate(['/orders']); // Redirect on failure
      return of(null);  // Resolver must complete — return null to unblock navigation
    })
  );
};

// Usage:
{
  path: 'orders/:id',
  loadComponent: () => import('./order-detail.component').then(m => m.OrderDetailComponent),
  resolve: { order: orderResolver }
  // 'order' is the key in ActivatedRoute.data
}

// Component receives pre-loaded data:
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
export class OrderDetailComponent implements OnInit {
  order!: Order;
  
  constructor(private route: ActivatedRoute) {}
  
  ngOnInit() {
    // Data is already loaded — no async operations needed here
    this.order = this.route.snapshot.data['order'];
    
    // Or, to react to param changes (user navigates from order/1 to order/2):
    this.route.data
      .pipe(map(data => data['order']), takeUntilDestroyed(this.destroyRef))
      .subscribe(order => { this.order = order; });
  }
}


// ✅ RIGHT — Preloading strategy for smart background loading

// Role-based preloading: preload modules the user has access to
// (Manufacturing supervisors: preload production-module bundle; skip admin-module)

export class RoleBasedPreloadingStrategy implements PreloadingStrategy {
  constructor(private auth: AuthService) {}
  
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    // Route data.preloadRoles: string[] — roles that should preload this module
    const requiredRoles: string[] | undefined = route.data?.['preloadRoles'];
    
    if (!requiredRoles) return EMPTY; // No preload config → don't preload
    
    const userRoles = this.auth.getRoles();
    const shouldPreload = requiredRoles.some(role => userRoles.includes(role));
    
    return shouldPreload ? load() : EMPTY;
  }
}

// Route config:
{
  path: 'production',
  loadChildren: () => import('./production/production.routes').then(m => m.PRODUCTION_ROUTES),
  data: { preloadRoles: ['SUPERVISOR', 'OPERATOR'] }
}

// Register in bootstrapApplication:
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(APP_ROUTES, withPreloading(RoleBasedPreloadingStrategy)),
    // withPreloading(PreloadAllModules) for simpler "preload everything" strategy
  ]
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between `canActivate` and `canMatch`?"

**Hruday's answer:**
> Both are guards that can block navigation, but they run at different stages and have different semantics.
>
> `canActivate` runs AFTER the router has matched the route — it prevents the user from ACTIVATING (entering) the matched route. If `canActivate` returns false, the navigation is cancelled or redirected. The route was matched but access was denied.
>
> `canMatch` runs DURING route matching — it determines whether this route should even be CONSIDERED as a match. If `canMatch` returns false, the router skips this route and CONTINUES trying other routes in the config. This is powerful when you have multiple routes at the same path — for example, a feature flag: one route with `canMatch: [() => isFeatureEnabled()]` serves the new experience, and if `canMatch` returns false, the router falls through to the legacy route at the same path. With `canActivate` you can't do this — the route is matched and then blocked, with no fallthrough to an alternative.
>
> The practical difference: `canActivate` is for authentication/authorisation (block and redirect); `canMatch` is for route selection (choose between alternative implementations of the same URL pattern).

---

### Q2 — Oracle Experience
**Interviewer asks:** "Describe a real scenario where you used `canDeactivate`."

**Hruday's answer:**
> At Oracle India, we had a report builder module where business analysts could build complex data reports — selecting data sources, configuring joins, adding filters, setting up calculated fields. Building a report could take 20-30 minutes.
>
> The reported bug: analysts were regularly losing their work when they accidentally clicked the browser's Back button or a navigation link while in the middle of building a report. The component would destroy and the partially-built report was gone.
>
> The solution was a `CanDeactivate` guard. I defined a `HasUnsavedChanges` interface with a `hasUnsavedChanges()` method. The report builder component implemented the interface — it returned `this.reportForm.dirty && !this.reportSaved`. The guard, when activated, injected a confirmation dialog service and returned an Observable: users saw a modal asking "Leave the report builder? Your unsaved changes will be lost." with Leave and Stay buttons.
>
> If the user clicked Stay, the Observable emitted `false` and navigation was cancelled. If they clicked Leave, it emitted `true` and navigation proceeded. We also added an auto-save to `localStorage` every 30 seconds so that if someone did navigate away, they could resume from a draft.
>
> After the guard was deployed, reported data loss incidents dropped to zero. The guard became a standard feature of every form-heavy component in the application.

---

### Q3 — Deep Dive
**Interviewer asks:** "Explain how you'd prevent flashing of empty content while data loads in a routed component."

**Hruday's answer:**
> The problem is component activation happens before data is available. `ngOnInit` fires, data properties are `undefined`, the template renders with empty bindings, and then the API call completes, causing a visible update. On slow connections this can be a noticeable flash.
>
> Two approaches, depending on the UX requirement:
>
> First: **Resolver approach** — run the API call before component activation. A router resolver is a `ResolveFn` that returns an Observable. The router subscribes to it, waits for the first emission, stores the result in `ActivatedRoute.data`, and THEN creates and activates the component. The component's `ngOnInit` reads the already-resolved data from `this.route.snapshot.data['order']`. No loading state needed — the component renders fully populated. Downside: the URL changes AFTER data loads, so the user sees no immediate feedback that navigation started.
>
> Second: **Skeleton state approach** — activate immediately but show skeleton loaders while data is fetching. This is often better UX because the URL changes immediately (user sees navigation started), the component shows a grey placeholder skeleton that matches the loaded layout, and then data fills in. Tools: Angular CDK's skeleton component, or custom CSS skeleton animations.
>
> I prefer resolvers for pages where content must be complete before showing anything — invoice details, order confirmations (where showing a blank state would be confusing). I prefer skeleton loaders for listing pages and dashboards where partial content is acceptable and immediate URL feedback matters more.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Lazy loading just splits the bundle" | "Lazy loading improves performance by reducing bundle size" | Lazy loading improves INITIAL LOAD performance; the first navigation to a lazy route is SLOWER (angular must download, parse, and compile the new chunk); for route transitions that users do frequently, consider preloading strategies — `PreloadAllModules` or `Quicklink` — to download the lazy chunk in the background AFTER initial load, making subsequent navigations instant while still keeping the initial bundle small |
| "Resolvers are always better for data loading" | "Data resolvers prevent empty state, use them everywhere" | Resolvers delay NAVIGATION — the component URL doesn't change until the resolver completes, which can make the app feel unresponsive on slow connections; for resolvers that might take >1-2 seconds, always add `timeout()` and `catchError()` operators; for collaborative or frequently-visited pages, a skeleton loader pattern (activate immediately, show skeleton) often provides better perceived performance than resolver-blocked navigation |
| "`canActivate` is always what I need" | "Guards are canActivate" | Angular has six guard types: `canActivate` (enter route), `canActivateChild` (enter child route), `canDeactivate` (leave route), `canMatch` (route matching), `canLoad` (deprecated in favor of canMatch for lazy modules); missing `canDeactivate` is the most common real-world oversight — forms without deactivation guards silently discard user data; every significant form component should have unsaved changes protection |
| "Functional guards are just syntactic sugar" | "I use class guards for complex logic" | Functional guards (Angular 15+) are officially preferred; they use `inject()` which works in any function context; they're more tree-shakeable (no class instantiation overhead); Angular's router documentation now defaults to functional guards in all examples; class guards still work but are the legacy pattern — new code should use functional guards |

---

## 7. Hruday's Real Experience Hook
> "The Oracle India `CanDeactivate` guard was satisfying to implement because it had a direct, measurable business impact — a specific class of bug (unsaved report data loss) went from 'frequently reported' to 'unreportable in production.' But the Bosch lazy loading story is more interesting technically.
>
> The Bosch manufacturing portal was structured as a single Angular app with 12 feature modules: production monitoring, maintenance scheduling, quality control, inventory, reporting, and six others. Initially built without lazy loading, the main bundle was 3.8 MB. On the factory floor tablet terminals (older hardware, slower CPUs, connected via industrial WiFi), the app took 8-9 seconds to become interactive. Factory supervisors were complaining — needing to wait nearly 10 seconds to check production metrics was blocking their workflow.
>
> We lazy-loaded all 12 feature modules. The main bundle dropped to 420 KB. Time to Interactive dropped to under 2 seconds. But then a new issue emerged: supervisors who navigated frequently from production monitoring to maintenance scheduling experienced a 2-second delay on EACH transition while Angular downloaded the new module's chunk.
>
> The fix was role-based preloading. Supervisors (who need both production and maintenance) had those two modules preloaded in the background immediately after initial load, while the chunks for modules they never used (finance, HR integration) were never preloaded. Navigations between their commonly-used modules became instant.
>
> The combination of initial lazy loading (fast startup) + role-aware preloading (fast nav for likely routes) + no preloading for irrelevant modules (not wasting bandwidth/CPU on content they'll never visit) was the right balance for the hardware and use case."

---

## 8. Scale Evolution

**Single-developer app →** `loadComponent` for heavy features (route-level code splitting); `canActivate` functional guard for auth; no preloading needed at small scale.

**Team app with 5-10 routes →** group routes into lazy `loadChildren` route arrays; functional `authGuard` + `unsavedChangesGuard` as shared utilities; add `withPreloading(PreloadAllModules)` for instant secondary navigation; resolvers for detail pages.

**Enterprise app with 20+ routes →** role-based preloading strategies (preload routinely-visited routes per user role); multiple layers of guards with clear separation (auth vs authorisation vs feature flags); route-level providers for scoped services; Angular DevTools router tracing to diagnose navigation performance regressions.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant dashboard route auth guards; merchant cannot access admin-only routes; payment integration lazy-loaded modules (merchant loads their specific payment gateway modules); `canDeactivate` on multi-step payment setup wizard (losing configuration mid-way is a support ticket) | Auth guard implementation; lazy route loading; unsaved state protection |
| Swiggy / Meesho | Restaurant management portal with role-based route access; restaurant owner vs delivery partner have different route trees; `canMatch` for A/B test variants at same URL; lazy loading of seller onboarding flow | Functional guards; canMatch for route selection; preloading for mobile |
| Adobe / Microsoft | Document editor with route resolvers pre-loading document data; UX requirement: no flash of empty editor; `canDeactivate` on editor routes (document has unsaved changes?); lazy modules for each Creative Cloud app feature | Resolver pattern; canDeactivate for data integrity; preloading strategy |
| SAP Labs | Direct experience: Oracle report builder `canDeactivate` guard for unsaved reports; Bosch lazy loading + role-based preloading strategy (3.8MB → 420KB bundle, 8s → 2s TTI); SAP Fiori route structure with module-level lazy loading | Real performance numbers; role-based preloading; canDeactivate implementation |

---

## 10. Related Topics — What to Study Next

- **Topic 216 — Angular DI — Hierarchical Injectors** — route-level providers (`providers: [MyService]` in route config alongside `loadChildren`) create environment-injector scopes equivalent to NgModule providers; a service provided at the route level is instantiated when the route activates and destroyed when navigating away — this is the standalone-architecture replacement for module-scoped DI; understanding injector hierarchy explains how route-level providers work
- **Topic 215 — Angular Change Detection** — resolver data typically flows into components via `ActivatedRoute.data` as an Observable; with `OnPush` components, the `async` pipe on `route.data` triggers CD correctly when resolver data is updated on re-navigation to the same route with different params — understanding CD is important for resolver + OnPush combinations
- **Topic 218 — Angular Signals v17+** — Angular Signals and the new signal-based inputs (`input()`, `viewChild()`) interact with the router in new ways; `toSignal(route.data)` converts the route's data Observable into a signal that reactive templates can use without `async` pipe; the signals-forward Angular development model changes how resolver data flows into OnPush components
- **Topic 208 — Web Workers and Service Workers** — Angular's preloading strategies download route bundles in the background; Service Workers can cache these downloaded chunks for offline navigation; combining router-level preloading with Service Worker caching ensures both initial offline capability and fast navigation across the app's routes

---

*Part 12 · Angular Router — Lazy Loading, Guards, Resolvers · Full Stack Interview Guide · Hruday D · 2026*
