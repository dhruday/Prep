# 367 – Angular Router – Lazy Loading, Guards, Resolvers

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Angular Router handles navigation, lazy loading, route guards (auth/permission checks), and resolvers (pre-fetch data). **Lazy loading** splits code by route. **Guards** protect routes (canActivate, canDeactivate, canMatch). **Resolvers** fetch data before component renders.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── ROUTE CONFIG ────
const routes: Routes = [
  { path: '', component: HomeComponent },
  
  // Lazy loading (standalone component)
  { path: 'dashboard', 
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    resolve: { userData: userResolver },
  },
  
  // Lazy loading (module)
  { path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
    canActivate: [authGuard, roleGuard],
  },
  
  // Nested routes
  { path: 'settings',
    component: SettingsLayoutComponent,
    children: [
      { path: 'profile', component: ProfileComponent },
      { path: 'security', component: SecurityComponent },
    ],
  },
  
  // Wildcard
  { path: '**', component: NotFoundComponent },
];

// ──── FUNCTIONAL GUARD (Angular 14+) ────
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const requiredRole = route.data['role'];
  return authService.hasRole(requiredRole);
};

// ──── FUNCTIONAL RESOLVER (Angular 14+) ────
export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  return userService.getUser(route.paramMap.get('id')!);
};

// ──── CAN DEACTIVATE (unsaved changes) ────
export const unsavedChangesGuard: CanDeactivateFn<{ hasUnsavedChanges: () => boolean }> = 
  (component) => {
    if (component.hasUnsavedChanges()) {
      return confirm('Discard unsaved changes?');
    }
    return true;
  };

// ──── PRELOADING STRATEGY ────
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, 
      withPreloading(PreloadAllModules), // preload lazy routes after initial load
    ),
  ],
});
```

### Guard Types
| Guard | When | Use For |
|---|---|---|
| `canActivate` | Before entering route | Auth check |
| `canDeactivate` | Before leaving route | Unsaved changes |
| `canMatch` | Before route matching | Feature flags |
| `canLoad` | Before lazy loading | Prevent module download |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Angular Router: lazy loading with loadComponent (standalone) or loadChildren (module) for code splitting. Functional guards (canActivate) for auth with inject(). Resolvers pre-fetch data. I use PreloadAllModules to eagerly load lazy routes after initial paint. At Oracle, guards + resolvers kept our enterprise routes secure and data-ready."*

## 4. 🧠 MEMORY AID
**"Lazy: loadComponent/loadChildren. Guards: canActivate (auth), canDeactivate (unsaved). Resolvers: pre-fetch data. Preload: background load lazy routes."**
