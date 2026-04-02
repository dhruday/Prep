# 195 – Frontend Authorization Guards

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Frontend authorization guards are client-side mechanisms that prevent unauthorized users from accessing routes, components, or features — but they exist purely for **user experience**, not security. The backend is the true security boundary. Guards read the user's permissions (from a token, store, or auth service) and conditionally render UI or redirect. In Angular, this maps to `CanActivate`/`CanLoad` guards; in React, it's `<PrivateRoute>` components or HOCs. The critical insight for senior interviews: guards must be paired with backend enforcement — a user who bypasses a frontend guard must still receive a 403 from the API.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Guard Architecture

```
Request → Auth Guard → Permission Guard → Component
    │             │               │
    └─ No token? ─┘   No permission? └─ Render or 403-redirect
    └─ Redirect /login               └─ Redirect /forbidden
```

### Angular: `CanActivate` vs `CanLoad` vs `CanActivateChild`

| Guard Type | When Runs | Use Case |
|---|---|---|
| `CanActivate` | Before component loads | Route-level auth check |
| `CanActivateChild` | Before child routes | Section-level protection |
| `CanLoad` | Before lazy module loads | Prevent code download for unauthorized users |
| `CanMatch` (v14+) | Router matching phase | Redirect to different route variant |

`CanLoad` is the strongest — it prevents the lazy module's JS bundle from even being downloaded. Use `CanActivate` for visible routes you still want the bundle loaded for (e.g., dashboard vs detailed view).

### React: HOC vs Wrapper Component vs Loader

```tsx
// Option 1: Wrapper component (most common)
<ProtectedRoute requiredPermission="invoice:approve" />

// Option 2: HOC — wraps component class
const ProtectedInvoice = withPermission(InvoiceApproval, 'invoice:approve');

// Option 3: React Router v6 loader (modern)
export const loader = async () => {
  const ability = await getAbility();
  if (ability.cannot('read', 'Dashboard')) throw redirect('/forbidden');
};
```

### Permission Guard pattern (multi-layer)

1. **JWT decode** on app bootstrap → extract roles/permissions → store in auth service
2. Route guard reads permission from auth service (no async on critical paths)
3. Guard returns `UrlTree` (Angular) or JSX redirect (React) — never `false` (bad UX)
4. Component additionally checks via `*ngIf="canEdit"` or `{canEdit && <Button />}` for fine-grained UI

### Anti-patterns

- ❌ Relying on frontend guard as security (always bypass-able via DevTools)
- ❌ Async permission loading inside Route guard (delays navigation)
- ❌ Using `localStorage` role directly in guard (XSS exploit risk — prefer in-memory store)
- ❌ Missing `CanLoad` on sensitive lazy modules (bundle exposed to unauthorized users)

### Guard Execution Flow (Angular)

```
Router.navigate('/dashboard')
  → CanMatch[] (filter route candidates)
  → CanLoad[] (prevent bundle download)  
  → CanActivate[] (permission check)
  → CanActivateChild[] (per child check)
  → Component resolved
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Microsoft Azure Portal

Azure Portal uses multi-level route guards. Every section (Subscriptions, Resource Groups, IAM) runs async permission checks against the RBAC API. Until the API responds, users see a loading skeleton — the guard holds navigation. Critically, the guard returns a `UrlTree` to `/access-denied` rather than `false`, which breaks browser history.

### Hruday @ SAP Labs — Fiori Launchpad

At SAP, we used a custom `FioriRoleGuard` that read roles from the session token (SAP XSUAA JWT). The guard extracted the `authorities` array from the JWT payload and checked against a required-roles config in the route data. Lazy modules for sensitive financial tiles used `canLoad` to prevent the module bundle from downloading for users without `finance.approve` authority. This reduced accidental data exposure and improved load time for lower-privilege users.

### Hruday @ Bosch — Angular IoT Dashboard

At Bosch, device configuration routes were protected with both `CanActivate` (role check) and `CanLoad` (prevent module download). We had a hierarchical permission model: `device:read` allowed the list view, `device:configure` unlocked the settings route, `device:admin` unlocked the delete feature. The guard was purely UX — every API call was independently verified on the backend.

### Scaling consideration:

At 1K users, inline permission checks work fine. At 10M users across tenants, guards must read from a pre-loaded, **cached** permission set (loaded at login, stored in NGRX/Redux) — never fetching permissions on every navigation event.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Frontend authorization guards serve two purposes: protecting routes for UX continuity, and being the first (but never the only) layer of access control. In Angular, I use `CanActivate` for standard route protection and `CanLoad` to prevent lazy module bundles from being downloaded by unauthorized users — the latter is important because even if a user can't see a route, they can still download the bundle if only `CanActivate` is used.*

*At SAP, I built a `FioriRoleGuard` that read the XSUAA JWT's `authorities` array and matched against route-data config. We never relied on this for security — every API call was independently authorized. In React, I've implemented a `ProtectedRoute` HOC that wraps route components with an ability check from CASL, returning a `<Navigate>` to `/forbidden` when access is denied. The guards always return a redirect tree rather than simply returning false, which preserves navigation history and gives a better user experience."*

### Follow-up Questions

1. **"How do you prevent the guard from making async calls on every navigation?"** — Pre-load permissions at login into a synchronous store (NGRX/Zustand). Guard reads from store, zero async.
2. **"What's the difference between `CanActivate` and `CanLoad`?"** — `CanActivate` blocks rendering but bundle is downloaded. `CanLoad` prevents bundle download entirely — stronger for sensitive modules.
3. **"Can a user bypass your Angular guard?"** — Yes, by directly calling the API. That's why every API endpoint independently enforces authorization. Guards are UX, not security.
4. **"How do you handle permission changes mid-session?"** — Subscribe to permission changes (WebSocket or polling), invalidate the auth store, and re-evaluate current route.
5. **"How do you test guards?"** — Unit test the guard class directly, mocking the auth service. Integration test with RouterTestingModule to verify redirect behavior.

### Comparison Table

| Aspect | Angular CanActivate | Angular CanLoad | React PrivateRoute |
|---|---|---|---|
| Prevents bundle download | No | Yes | No |
| Can be async | Yes | Yes | Yes (Suspense) |
| Returns | boolean/UrlTree | boolean/UrlTree | JSX/Navigate |
| Access to route state | Yes (ActivatedRouteSnapshot) | Yes (Route) | Props/hooks |

### Trade-offs to verbalize

- `CanLoad` adds latency for legitimate users (double check before route loads) vs security benefit
- Async guards delay navigation — balance with pre-loaded permission cache
- Over-guarding (guard per nested child) adds complexity; use component-level conditional rendering for fine-grained UI

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Angular — PermissionGuard (CanActivate + CanLoad)
import { inject } from '@angular/core';
import {
  CanActivateFn, CanLoadFn, Route,
  ActivatedRouteSnapshot, RouterStateSnapshot, Router
} from '@angular/router';
import { AuthService } from '@core/auth.service';

export const permissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredPermissions: string[] = route.data['permissions'] ?? [];

  const hasAccess = requiredPermissions.every(p => auth.hasPermission(p));
  if (hasAccess) return true;

  // Return UrlTree — preserves history, provides better UX
  return router.createUrlTree(['/forbidden'], {
    queryParams: { returnUrl: state.url }
  });
};

// Route config
const routes = [
  {
    path: 'invoices/approve',
    component: InvoiceApprovalComponent,
    canActivate: [permissionGuard],
    data: { permissions: ['invoice:read', 'invoice:approve'] }
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module'),
    canLoad: [permissionGuard],
    data: { permissions: ['admin:access'] }
  }
];

// AuthService — synchronous permission check (pre-loaded at login)
@Injectable({ providedIn: 'root' })
export class AuthService {
  private permissions = new Set<string>();

  loadPermissions(user: User): void {
    this.permissions = new Set(user.permissions);
  }

  hasPermission(permission: string): boolean {
    return this.permissions.has(permission) || this.permissions.has('*');
  }
}

// React equivalent — ProtectedRoute with CASL
import { useAbility } from '@casl/react';
import { Navigate, Outlet } from 'react-router-dom';

interface Props {
  action: string;
  subject: string;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<Props> = ({
  action, subject, redirectTo = '/forbidden'
}) => {
  const ability = useAbility(AbilityContext);
  return ability.can(action as any, subject as any)
    ? <Outlet />
    : <Navigate to={redirectTo} replace />;
};

// Usage:
<Route element={<ProtectedRoute action="approve" subject="Invoice" />}>
  <Route path="/invoices/approve" element={<InvoiceApproval />} />
</Route>
```

**Why this structure:**
- Synchronous permission check avoids navigation delay
- `UrlTree`/`<Navigate replace>` preserves browser history
- Route data drives configuration — single guard works for all routes
- CASL `useAbility` hook makes permissions declarative and testable

**Interviewer focus:** `CanLoad` vs `CanActivate` distinction, synchronous auth service design, UrlTree return type

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Guards are bouncers, not walls."** A bouncer stops you at the door (frontend guard) but the vault inside has its own lock (backend authorization). Angular's three-layer hierarchy: `CanLoad` (no bundle), `CanActivate` (no component), then component `*ngIf` (no button). React equivalent: `<ProtectedRoute>` → component-level `ability.can()`. Always return a **redirect**, never just `false`. Pre-load permissions at login into a sync store — guards should never make network calls.

*If you go blank*: "Frontend guards are UX, not security. `CanLoad` prevents bundle download. Always sync-check against a pre-loaded permission store."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- Sub-second navigation UX depends on guards being synchronous — async guards delay every page transition
- `CanLoad` prevents sensitive business logic (in lazy bundles) from reaching unauthorized users' browsers
- Consistent redirect behavior (UrlTree/Navigate) makes forbidden-access handling testable and user-friendly

**How it works:**
Guards execute before route activation in a deterministic order: `CanMatch → CanLoad → CanActivate → CanActivateChild`. They read from a pre-loaded, in-memory permission store. When access is denied, they return a redirect URL tree that preserves navigation history while showing the user a meaningful error page.

**Company-specific relevance:**
- **Microsoft**: Azure Portal guards manage multi-subscription RBAC with `CanActivate` + async permission API — model for enterprise guard design
- **Adobe**: Creative Cloud route guards protect per-seat licensed features behind permission checks
- **Salesforce**: LWC doesn't use Angular guards, but the React/SPA layer uses `ProtectedRoute` patterns matching SFDC permission sets
- **Cisco**: Network management dashboards use `CanLoad` to prevent configuration UI bundles from downloading to read-only users
