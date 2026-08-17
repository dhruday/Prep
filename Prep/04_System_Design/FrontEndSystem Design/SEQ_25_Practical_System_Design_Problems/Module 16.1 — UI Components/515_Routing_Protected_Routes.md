# 515. Routing & Protected Routes (SPA)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
Client-side routing is the mechanism by which Single Page Applications (SPAs) navigate between views without full page reloads. It uses the History API (`pushState`/`replaceState`) or hash fragments to update the URL while JavaScript swaps the rendered component tree. **Protected routes** (or auth guards) are route-level access controls that check authentication/authorization state before rendering a route — redirecting unauthenticated users to login or unauthorized users to a 403 page.

**Why it exists:**
SPAs need URL-based navigation for bookmarkability, browser back/forward, and deep linking. But unlike server-side routing where the server controls access per request, SPAs render everything on the client — meaning route protection must be implemented in the frontend layer (with server-side validation as the ultimate authority). Protected routes prevent unauthorized users from seeing UI they shouldn't access, while server-side middleware prevents data access.

**When and where it's used:**
- Every SPA (React Router, Angular Router, Vue Router, Next.js App Router)
- Dashboard applications (admin vs. user vs. guest views)
- Multi-role applications (RBAC — Role-Based Access Control)
- Authentication flows (login → redirect to intended destination)
- Wizard/multi-step forms (prevent jumping to step 3 without completing step 1)
- Feature flags (show/hide routes based on feature toggle state)

**Role in large-scale applications:**
At FAANG scale, routing architecture becomes complex: code-splitting per route (lazy loading), nested layouts, parallel data fetching (React Router loaders, Angular resolvers), route-level error boundaries, SSR compatibility, and role-based route manifests. Protected routes must be defense-in-depth: client-side guards for UX, server-side middleware for security.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. How Client-Side Routing Works**

```
Traditional (Server-Side) Routing:
──────────────────────────────────
  Click link → Browser sends GET /dashboard
  → Server processes → Returns full HTML page
  → Browser parses + renders entire page

SPA (Client-Side) Routing:
──────────────────────────
  Click link → JavaScript intercepts click (e.preventDefault())
  → history.pushState({}, '', '/dashboard')
  → Router matches URL to component
  → React/Angular renders new component tree
  → NO server round-trip for HTML

  URL changes ✅  |  Back/Forward works ✅  |  No page reload ✅
```

**History API vs. Hash Routing:**

| Aspect | History API (`/dashboard`) | Hash (`/#/dashboard`) |
|--------|--------------------------|----------------------|
| URL format | `/app/dashboard` | `/app/#/dashboard` |
| Server config | Needs catch-all (all routes → index.html) | No config needed |
| SEO | ✅ Crawlable (with SSR) | ❌ Fragment ignored by crawlers |
| Browser support | IE10+ | All browsers |
| Server-aware | Server sees full path | Server only sees path before `#` |
| SSR compatible | ✅ Yes | ❌ No |

### **B. Route Matching — How Routers Work Internally**

```typescript
// Simplified route matcher (React Router-style)
interface RouteConfig {
  path: string;           // e.g., "/users/:id"
  component: React.ComponentType;
  children?: RouteConfig[];
  loader?: () => Promise<unknown>;  // Data fetching
  guard?: () => boolean | Promise<boolean>;  // Protected route check
}

interface RouteMatch {
  route: RouteConfig;
  params: Record<string, string>;
}

function matchRoute(pathname: string, routes: RouteConfig[]): RouteMatch | null {
  for (const route of routes) {
    const paramNames: string[] = [];
    const regexStr = route.path
      .replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      })
      .replace(/\*/g, '(.*)');

    const regex = new RegExp(`^${regexStr}$`);
    const match = pathname.match(regex);

    if (match) {
      const params: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { route, params };
    }

    // Check children (nested routes)
    if (route.children) {
      const childMatch = matchRoute(pathname, route.children);
      if (childMatch) return childMatch;
    }
  }
  return null;
}
```

### **C. Protected Route Patterns**

#### Pattern 1: HOC Wrapper (React)

```typescript
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

function ProtectedRoute({
  children,
  requiredRoles = [],
  redirectTo = '/login',
}: ProtectedRouteProps): JSX.Element {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth (prevents flash of login page)
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Not authenticated → redirect to login with return URL
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Authenticated but wrong role → 403
  if (requiredRoles.length > 0 && !requiredRoles.some((r) => user.roles.includes(r))) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}

// Usage in route config:
<Route
  path="/admin/dashboard"
  element={
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

#### Pattern 2: Router Loader Guard (React Router v6.4+)

```typescript
import { redirect, type LoaderFunctionArgs } from 'react-router-dom';

// Route-level loader with auth check
async function adminLoader({ request }: LoaderFunctionArgs) {
  const user = await getAuthUser();

  if (!user) {
    const url = new URL(request.url);
    return redirect(`/login?returnTo=${encodeURIComponent(url.pathname)}`);
  }

  if (!user.roles.includes('admin')) {
    throw new Response('Forbidden', { status: 403 });
  }

  // Fetch route-specific data (parallel with auth check)
  const data = await fetchAdminDashboard();
  return { user, data };
}

// Route config:
const router = createBrowserRouter([
  {
    path: '/admin',
    loader: adminLoader,
    element: <AdminLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsers /> },
    ],
  },
]);
```

#### Pattern 3: Angular Route Guard

```typescript
// Angular CanActivate guard
import { Injectable } from '@angular/core';
import {
  CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot,
  Router, UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.authService.user$.pipe(
      take(1),
      map((user) => {
        if (!user) {
          return this.router.createUrlTree(['/login'], {
            queryParams: { returnUrl: state.url },
          });
        }

        const requiredRoles = route.data['roles'] as string[] | undefined;
        if (requiredRoles && !requiredRoles.some((r) => user.roles.includes(r))) {
          return this.router.createUrlTree(['/forbidden']);
        }

        return true;
      })
    );
  }
}

// Route config:
const routes: Routes = [
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { roles: ['admin'] },
    loadChildren: () => import('./admin/admin.module').then((m) => m.AdminModule),
  },
];
```

### **D. Auth State Management**

```typescript
// Centralized auth context with token management
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

const AuthContext = createContext<AuthState & {
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}>({} as never);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true, // Start loading — check existing session
    isAuthenticated: false,
  });

  // Check existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      validateAndDecodeToken(token)
        .then((user) => setState({ user, isLoading: false, isAuthenticated: true }))
        .catch(() => {
          localStorage.removeItem('accessToken');
          setState({ user: null, isLoading: false, isAuthenticated: false });
        });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = async (credentials: Credentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) throw new Error('Login failed');

    const { accessToken, user } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    setState({ user, isLoading: false, isAuthenticated: true });
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshToken: async () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### **E. Code Splitting Per Route (Lazy Loading)**

```typescript
import { lazy, Suspense } from 'react';

// Lazy-loaded route components
const Dashboard = lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/Dashboard'));
const AdminPanel = lazy(() => import(/* webpackChunkName: "admin" */ './pages/AdminPanel'));
const Settings = lazy(() => import(/* webpackChunkName: "settings" */ './pages/Settings'));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/*"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route path="login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

### **F. Security: Defense in Depth**

```
┌────────────────────────────────────────────────────────────────┐
│                    DEFENSE IN DEPTH                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Layer 1: CLIENT-SIDE ROUTE GUARD (UX only)                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ProtectedRoute checks auth state → redirects if needed   │ │
│  │ ⚠️ NOT a security boundary — JS can be modified          │ │
│  │ Purpose: UX — show login page, prevent accidental access │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Layer 2: API MIDDLEWARE (Security boundary)                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Server validates JWT on every API request                 │ │
│  │ Returns 401/403 if invalid/expired                        │ │
│  │ ✅ THIS is the actual security enforcement                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Layer 3: TOKEN MANAGEMENT                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ HttpOnly cookies (preferred — no JS access)               │ │
│  │ Short-lived access tokens (15 min)                        │ │
│  │ Refresh tokens in httpOnly cookie                         │ │
│  │ CSRF protection for cookie-based auth                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  CRITICAL: Client-side guards are UX, NOT security.           │
│  The server must validate auth on EVERY API call.             │
└────────────────────────────────────────────────────────────────┘
```

### **G. Anti-Patterns**

1. **Relying only on client-side route guards for security** — JavaScript is mutable. An attacker can bypass any client-side check. All API endpoints MUST validate auth server-side.

2. **Flash of protected content** — Showing the dashboard for a split second before redirecting to login. Fix: show a loading spinner while `isLoading` is true.

3. **Losing the return URL** — User hits `/admin/reports` → redirected to `/login` → after login, sent to `/` instead of `/admin/reports`. Always pass `returnTo` parameter.

4. **Not code-splitting protected routes** — Admin pages in the main bundle. Use `lazy()` + `Suspense` to split per route.

5. **Storing tokens in localStorage without refresh rotation** — localStorage is accessible to XSS. Prefer httpOnly cookies for tokens. If localStorage is needed, use short-lived access tokens with a refresh flow.

6. **Checking auth in every component** — Only check at the route guard level. Components inside protected routes can assume the user is authenticated.

7. **Not handling token expiry during navigation** — User's token expires while browsing. The next protected route should detect this and redirect to login, not show a broken page.

────────────────────────────────────
## 3. Real-World Examples
────────────────────────────────────

### SAP Fiori (Hruday's Experience)
- Angular Router with `CanActivate` guards for role-based access
- SAP IDP integration for SSO (SAML 2.0 / OAuth 2.0)
- Micro-frontend routing: shell app manages top-level routes, each MFE owns sub-routes
- Lazy loading of MFE bundles per route

### Google Workspace
- Route-level RBAC: Admin Console routes require super-admin role
- OAuth 2.0 scopes determine accessible routes
- Service worker caches route shells for offline navigation

### Scale Evolution

| Scale | Routing Pattern | Auth Pattern |
|-------|----------------|-------------|
| Simple app | React Router + ProtectedRoute HOC | JWT in localStorage |
| Enterprise | Nested layouts + loaders + guards | OAuth 2.0 + httpOnly cookies |
| Micro-frontend | Shell router + MFE sub-routers | Shared auth service + token exchange |
| FAANG | Server-driven route manifest + RBAC | IAM integration + short-lived tokens |

────────────────────────────────────
## 4. Interview-Oriented Answer
────────────────────────────────────

**Sample Answer (7+ years level):**

> "My approach to routing and protected routes has three layers. First, the router configuration with code-splitting — each route lazily loads its component bundle, and protected routes are wrapped in a guard component that checks auth state before rendering.
>
> The guard component reads from a centralized auth context. If `isLoading` is true (initial session check), it shows a skeleton to prevent flash of login page. If not authenticated, it redirects to `/login` with the current URL as a `returnTo` parameter so we can redirect back after login. If authenticated but wrong role, it shows a 403 page.
>
> Critically, client-side route guards are UX only — not security. The real security is server-side: every API endpoint validates the JWT and returns 401/403 if invalid. The client guard just provides a good user experience.
>
> At SAP, I implemented Angular `CanActivate` guards with role-based access control, integrated with SAP's IDP for SSO. In the micro-frontend architecture, the shell app handled top-level routing and auth, and each MFE owned its own sub-routes."

**Likely Follow-up Questions:**

1. **"How do you handle token expiry?"** → Interceptor detects 401, attempts refresh token rotation, retries original request. If refresh fails, redirect to login.
2. **"Client-side guards vs. server middleware?"** → Client guards = UX (prevent seeing wrong UI). Server middleware = security (prevent accessing wrong data). Both required.
3. **"How does routing work in micro-frontends?"** → Shell manages top-level routes and auth. Each MFE registers its sub-routes. Module Federation or import maps for lazy loading MFE bundles.
4. **"How do you prevent the flash of protected content?"** → Show loading state while `isLoading` is true. Only render route or redirect after auth state is determined.

────────────────────────────────────
## 5. Full Working Code (TypeScript + React)
────────────────────────────────────

See sections 2.C (Protected Route patterns — HOC, Loader, Angular Guard), 2.D (Auth State Management), and 2.E (Code Splitting) for complete implementations.

────────────────────────────────────
## 6. Memory Aid (Quick Recall)
────────────────────────────────────

**Protected route checklist:** "Loading → Auth check → Role check → Render or Redirect (with returnTo)"

**Security mantra:** "Client guards = UX. Server middleware = Security. Both are required."

**If you go blank:** "Wrap protected routes in an auth guard component. Check `isLoading` (show spinner), check `isAuthenticated` (redirect to login with returnTo), check `hasRole` (show 403). Always validate auth server-side on every API call."

────────────────────────────────────
## 7. Why & How Summary
────────────────────────────────────

**Why it matters:**
→ Every SPA needs routing and auth guards. Getting the UX right (no flash, return URL preservation, loading states) and the security right (server-side validation, httpOnly cookies, token rotation) is a core senior frontend skill.

**How it works:**
→ History API changes URL without reload. Router matches URL to component tree. Protected routes check auth context before rendering — redirect to login if unauthenticated, 403 if unauthorized. Code splitting ensures each route loads its own bundle. Server validates auth on every API call as the actual security boundary.

**Company relevance:**
→ **Google:** Google Workspace routes by organization role (admin, user, super-admin). OAuth scope-based access.
→ **Microsoft:** Azure Portal with RBAC-driven route visibility. Fluent UI app template with protected routes.
→ **SAP (Hruday's current):** Angular CanActivate guards, SSO with SAP IDP, micro-frontend routing with shell app managing auth state — Hruday's direct experience.
