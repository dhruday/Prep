# 384 – Lazy Loaded Modules + Route-Level Code Splitting

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Lazy loading** loads feature code only when user navigates to that route — reducing initial bundle size. Angular splits code at route boundaries using `loadChildren` (modules) or `loadComponent` (standalone). Combined with **preloading strategies**, lazy routes load in the background after initial paint.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── LAZY LOADING STANDALONE COMPONENT ────
const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes')
      .then(m => m.ADMIN_ROUTES),
  },
];

// admin/admin.routes.ts
export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminLayoutComponent, children: [
    { path: 'users', loadComponent: () => import('./users/users.component').then(m => m.UsersComponent) },
    { path: 'settings', loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent) },
  ]},
];

// ──── LAZY LOADING MODULE (legacy approach) ────
{
  path: 'reports',
  loadChildren: () => import('./reports/reports.module').then(m => m.ReportsModule),
}

// ──── PRELOADING STRATEGIES ────
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes,
      // Option 1: Preload ALL lazy routes after initial load
      withPreloading(PreloadAllModules),
    ),
  ],
});

// Option 2: Custom preloading — only preload flagged routes
@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return route.data?.['preload'] ? load() : of(null);
  }
}

const routes: Routes = [
  { path: 'dashboard', loadComponent: () => import('...'), data: { preload: true } },  // preloaded
  { path: 'admin', loadComponent: () => import('...') },  // NOT preloaded (admin = rare)
];

// Option 3: QuicklinkStrategy (intersection observer based)
// Preloads routes whose links are visible in viewport
// npm install ngx-quicklink

// ──── LAZY LOADING PROVIDERS ────
// Provide services only when route is loaded
{
  path: 'analytics',
  loadComponent: () => import('./analytics.component'),
  providers: [
    AnalyticsService, // only instantiated when this route loads
    { provide: HTTP_INTERCEPTORS, useClass: AnalyticsInterceptor, multi: true },
  ],
}

// ──── MEASURING IMPACT ────
// Before lazy loading:
// main.js: 800KB (everything)

// After lazy loading:
// main.js: 200KB (core + home)
// dashboard.chunk.js: 150KB (loaded on navigate)
// admin.chunk.js: 250KB (loaded on navigate)
// reports.chunk.js: 200KB (loaded on navigate)
```

### Bundle Analysis
```bash
# Analyze bundle with source-map-explorer
ng build --source-map
npx source-map-explorer dist/**/*.js

# Or webpack-bundle-analyzer
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

### Preloading Strategy Comparison
| Strategy | When | Best For |
|---|---|---|
| No preloading | Never | Bandwidth-constrained |
| PreloadAllModules | After initial load | Small apps |
| Custom selective | Flagged routes only | Medium apps |
| Quicklink | Visible links | Large apps |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Lazy loading splits code at route boundaries — loadComponent for standalone, loadChildren for route arrays. I use selective preloading: dashboard preloads (frequently used), admin doesn't (rare). At SAP, lazy loading reduced initial bundle from 800KB to 200KB — 70% faster FCP. source-map-explorer identifies what to split."*

## 4. 🧠 MEMORY AID
**"loadComponent (standalone) / loadChildren (routes). PreloadAllModules = background load. Selective preload = data: {preload: true}. source-map-explorer to measure."**
