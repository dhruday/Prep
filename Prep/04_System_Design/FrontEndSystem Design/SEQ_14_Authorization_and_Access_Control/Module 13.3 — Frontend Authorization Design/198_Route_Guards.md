# 198 – Route Guards: Angular & React Router ★

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Route guards are gatekeeping functions that run before a route activates, determining whether navigation should proceed, redirect, or be cancelled. In Angular, they are functional guards (`CanActivateFn`, `CanLoadFn`, `CanMatchFn`) injected into the router's guard pipeline; in React Router v6, they are `<ProtectedRoute>` wrapper elements or `loader` functions that throw `redirect()`. Guards primarily serve three purposes: **authentication check** (is the user logged in?), **authorization check** (does the user have permission?), and **data pre-loading** (is required data ready before the component renders?). The most critical detail for senior interviews: guards execute in a strict order in Angular (`CanMatch → CanLoad → CanActivate → CanActivateChild`), and `CanLoad` is categorically different from `CanActivate` because it prevents the lazy module's JavaScript bundle from being downloaded.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Angular Guard Pipeline Order

```
router.navigate('/invoices/approve')
         ↓
    CanMatch[]         ← Filters route candidates. Return false = try next matching route
         ↓
    CanLoad[]          ← PREVENTS JS BUNDLE DOWNLOAD for unauthorized users
         ↓
    CanActivate[]      ← Auth/permission check before component instantiation
         ↓
    CanActivateChild[] ← Per-child route check in nested routes
         ↓
    Component created
```

### The Critical CanLoad vs CanActivate Distinction

| Aspect | CanActivate | CanLoad |
|---|---|---|
| Prevents bundle download | ❌ No | ✅ Yes |
| When to use | Eager routes, visible navigation | Lazy-loaded modules |
| Performance impact | Bundle already downloaded | Saves bandwidth |
| Angular v14+ | `canActivate` function | `canLoad` / `canMatch` |

### Functional Guard Pattern (Angular 14+)

Modern Angular uses standalone functional guards (not class-based). This enables tree-shaking and `inject()`:

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
```

### Composed Guards Pattern

```typescript
// Compose multiple checks cleanly
export const invoiceApproveGuard: CanActivateFn = (route, state) => {
  const guards: CanActivateFn[] = [authGuard, permissionGuard, featureFlagGuard];
  return guards.every(guard => guard(route, state) === true) 
    ? true 
    : inject(Router).createUrlTree(['/forbidden']);
};
```

### React Router v6 Patterns

```tsx
// Pattern 1: ProtectedRoute wrapper (most common)
const ProtectedRoute = ({ requiredPermission }) => {
  const { isAuthenticated, hasPermission } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasPermission(requiredPermission)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
};

// Pattern 2: Loader-based guard (v6.4+ with data router)
export const invoiceLoader = async ({ params }) => {
  const session = await getSessionOrNull();
  if (!session) throw redirect('/login');
  if (!session.can('approve', 'Invoice')) throw redirect('/forbidden');
  return fetchInvoice(params.id);
};
```

### When to Use Loader vs Component Guard

- **Loader guard**: Best for data-dependent authorization (fetch resource, check ownership)
- **ProtectedRoute guard**: Best for role/permission checks that don't require API calls
- **Both together**: Loader fetches data + checks ownership; ProtectedRoute checks role upfront

### Anti-Patterns

- ❌ `return false` from CanActivate — breaks browser history (user can't go back)
- ❌ Async HTTP call inside guard on every navigation — use pre-loaded permission store
- ❌ Class-based guards in Angular 14+ — use functional guards for tree-shaking
- ❌ Missing `replace` prop on React `<Navigate>` — redirect creates extra history entry
- ❌ Guard without backend enforcement — UX only, not security

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Microsoft Azure Portal

Azure Portal's route guards are a production example of complex guard chaining. Every portal blade checks: (1) is the user authenticated to Azure AD? (2) does the user have RBAC permissions on the selected subscription? (3) is the feature available in the selected region? These are three separate guard checks composed in sequence. The Azure SDK caches the RBAC token response, so guards are synchronous after the initial permission load.

### Hruday @ SAP Labs — Fiori App Navigation

At SAP, we had a 3-guard chain on every Fiori tile route: `AuthGuard` (XSUAA token validity), `RoleGuard` (Fiori role check from JWT), and `LicenseGuard` (SAP entitlement check). We used `canLoad` on all lazy modules — when a user without the `FinanceModule` role tried to access the finance section, the Angular bundle for that module was never downloaded. This reduced bandwidth usage for non-finance users by ~1.2MB and eliminated a class of unauthorized access issues.

### Hruday @ Bosch — IoT Device Management

At Bosch, device configuration routes used `CanActivate` for role checks and a custom `DataLoadedGuard` that ensured the device manifest was pre-fetched before the configuration component rendered. This eliminated loading spinners on the configuration page and ensured the component always had data available on `ngOnInit`. We composed these: `[authGuard, devicePermissionGuard, deviceManifestResolver]`.

### Scaling:

At 1K users, per-request guard network calls are manageable. At 10M daily active users, every navigation must be guard-resolved in <10ms — which means pre-loading permission sets at login and resolving guards synchronously from a local cache.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Route guards are the first line of navigational access control in SPAs. In Angular, I use the modern functional guard pattern with `inject()` instead of class-based guards — this enables tree-shaking and cleaner composition. I always distinguish `CanActivate` from `CanLoad`: `CanActivate` blocks component rendering but the module bundle has already been downloaded, while `CanLoad` prevents the download entirely for unauthorized users. For financial or sensitive feature modules, I always use `canLoad`.*

*At SAP, I composed a 3-guard chain — auth check, role check, license check — using Angular's array syntax in route config. I made all guards synchronous by pre-loading permissions and license info from the JWT payload at app bootstrap. I always return a `UrlTree` (not just `false`) to preserve browser history and provide a meaningful redirect URL for the login/forbidden page to consume as a `returnUrl` query parameter.*

*In React Router v6, I use both `<ProtectedRoute>` for permission-based access and loader functions for data-dependent authorization (like ownership checks that require an API call)."*

### Follow-up Questions

1. **"What's the angular guard execution order?"** — `CanMatch → CanLoad → CanActivate → CanActivateChild`. Guards run in this order; any guard returning false/redirect stops the chain.
2. **"Why return UrlTree instead of false?"** — `false` breaks the router navigation state and the browser back/forward doesn't work correctly. `UrlTree` navigates to a specified route, preserving history.
3. **"How do you guard a redirect in React Router v6?"** — Wrap with `<ProtectedRoute>` wrapping an `<Outlet>`, or use `loader` function with `throw redirect('/login')`.
4. **"How do you test Angular guards?"** — Inject the guard function in a TestBed, mock the AuthService, call `guard(fakeRoute, fakeState)` and assert the return value (true or UrlTree).
5. **"What if permissions change mid-session?"** — Emit from a `BehaviorSubject` in `AuthService`, re-evaluate current route on permission change event using `router.navigate(currentUrl, { skipLocationChange: true })`.

### Comparison Table

| Feature | Angular CanActivate | Angular CanLoad | React ProtectedRoute | React Loader |
|---|---|---|---|---|
| Prevents bundle | ❌ | ✅ | ❌ | ❌ |
| Async support | ✅ | ✅ | ✅ (Suspense) | ✅ |
| Data access | Route snapshot | Route config | Props/hooks | params |
| Redirect | UrlTree | UrlTree | &lt;Navigate&gt; | throw redirect() |

### Trade-offs

- `CanLoad` adds latency for legitimate users (extra round-trip before module download) vs security benefit of not downloading sensitive module code
- Async guards in React loader are elegant but tie navigation to data loading — use only when authorization depends on fetched data
- Pre-loading all permissions at login is a tradeoff: slightly slower app start, vastly faster navigation

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Angular — functional guard composition (Angular 14+)
import { inject } from '@angular/core';
import { CanActivateFn, CanLoadFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '@core/auth.service';
import { FeatureFlagService } from '@core/feature-flag.service';

// 1. Auth guard — checks token validity
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// 2. Permission guard — checks required permissions from route data
export const permissionGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required: string[] = route.data['permissions'] ?? [];
  const hasAccess = required.every(p => auth.hasPermission(p));
  return hasAccess ? true : router.createUrlTree(['/forbidden']);
};

// 3. Compose guards in route config
const routes: Routes = [
  {
    path: 'invoices/approve',
    component: InvoiceApprovalComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['invoice:approve'] }
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component'),
    canLoad: [authGuard, permissionGuard],  // prevents bundle download
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['admin:access'] }
  }
];

// React Router v6 — ProtectedRoute + loader pattern
// ProtectedRoute wrapper
const ProtectedRoute: React.FC<{
  requiredPermission?: string;
}> = ({ requiredPermission }) => {
  const { isAuthenticated, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
};

// Loader for data-dependent authorization
export const invoiceLoader: LoaderFunction = async ({ params }) => {
  const session = await getSession();
  if (!session) throw redirect('/login');

  const invoice = await api.getInvoice(params.id!);
  if (!invoice) throw new Response('Not Found', { status: 404 });
  if (invoice.ownerId !== session.userId && !session.hasPermission('invoice:admin')) {
    throw redirect('/forbidden'); // ownership check in loader
  }
  return invoice;
};

// Router config
createBrowserRouter([
  {
    element: <ProtectedRoute requiredPermission="invoice:read" />,
    children: [
      {
        path: '/invoices/:id',
        element: <InvoiceDetail />,
        loader: invoiceLoader  // loader handles ownership check
      }
    ]
  }
]);
```

**Why this structure:**
- Functional guards are tree-shakeable; inject() replaces constructor injection
- `UrlTree` on redirect preserves `returnUrl` for post-login redirect
- Loader-based guards co-locate data fetching with authorization — eliminates double-fetch
- `replace` on Navigate prevents forbidden redirect from polluting browser history

**Interviewer focus:** CanLoad vs CanActivate, UrlTree return, functional guard pattern, loader guard

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Guard order: Match → Load → Activate → Child."** In Angular, think of it as a funnel: `CanMatch` filters candidates, `CanLoad` keeps the bundle from downloading, `CanActivate` blocks rendering, `CanActivateChild` guards nested routes. Always return `UrlTree`(not `false`) — returning false breaks browser navigation. In React, `<ProtectedRoute>` is for role/auth checks; `loader` is for data-dependent authorization. Pre-load the permission set at login — guards must never make HTTP calls mid-navigation.

*If you go blank*: "Angular: `CanLoad` prevents bundle download; `CanActivate` prevents rendering. Both return `UrlTree` for redirects. React: `<ProtectedRoute>` wraps an `<Outlet>`; loader throws `redirect()`."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- `CanLoad` is the only mechanism in Angular that prevents unauthorized users from downloading sensitive business logic in lazy-loaded bundles — a security gap that `CanActivate` alone doesn't close
- Returning `false` from a guard instead of a `UrlTree` is a common interview-filter mistake — it breaks browser history navigation
- Loader-based guards in React Router v6 unify data fetching and authorization in one place, eliminating the waterfall pattern of guard → component → fetch

**How it works:**
Angular's router evaluates guards sequentially in the pipeline order (Match → Load → Activate → Child). Each guard function receives the target `ActivatedRouteSnapshot` and `RouterStateSnapshot`. Returning `true` continues the chain; returning a `UrlTree` redirects. In React Router v6 with data APIs, `loader` functions run before component rendering — any thrown `redirect()` halts navigation and redirects the user.

**Company-specific relevance:**
- **Microsoft**: Azure Portal uses multi-level guard chains with subscription-scoped RBAC — a canonical example of guard composition at enterprise scale
- **Adobe**: Express online editor uses `CanLoad`-equivalent code-splitting guards to prevent the Pro feature modules from loading for free-tier users
- **Salesforce**: LWC doesn't use Angular, but Experience Cloud SPA shells use React Router protected routes aligned to SFDC permission sets
- **Cisco**: DNAC (now Catalyst Center) network management UI uses guard chains to enforce RBAC roles at each management domain boundary
