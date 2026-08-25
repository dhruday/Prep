# 364 – NgModules vs Standalone Components (Angular 14+)

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**NgModules** group related components, directives, pipes, and services — Angular's traditional organization unit. **Standalone components** (Angular 14+) eliminate NgModules — components declare their own imports. Standalone is the future: simpler, tree-shakeable, less boilerplate. Angular 17+ defaults to standalone.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── NGMODULE APPROACH (traditional) ────
@NgModule({
  declarations: [AppComponent, HeaderComponent, FooterComponent],
  imports: [BrowserModule, HttpClientModule, RouterModule.forRoot(routes)],
  providers: [AuthService],
  bootstrap: [AppComponent],
})
export class AppModule {}

// ──── STANDALONE APPROACH (modern) ────
// Each component declares its own dependencies
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `<nav><a routerLink="/">Home</a></nav>`,
})
export class HeaderComponent {}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterOutlet],
  template: `
    <app-header />
    <router-outlet />
    <app-footer />
  `,
})
export class AppComponent {}

// Bootstrap without NgModule
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
  ],
});
```

### Comparison
| Feature | NgModule | Standalone |
|---|---|---|
| **Boilerplate** | High (module files) | Low (inline imports) |
| **Tree-shaking** | Poor (module = bundle boundary) | Excellent (per-component) |
| **Learning curve** | Steep (module system) | Gentle |
| **Lazy loading** | loadChildren: module | loadComponent: component |
| **Migration** | - | Gradual (interop with modules) |
| **Default (v17+)** | No | Yes |

```typescript
// Lazy loading comparison
// NgModule: loadChildren: () => import('./feature/feature.module').then(m => m.FeatureModule)
// Standalone: loadComponent: () => import('./feature/feature.component').then(m => m.FeatureComponent)
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Standalone components are Angular's modern approach — each component declares its own imports, eliminating NgModule boilerplate. They enable better tree-shaking and simpler lazy loading. I migrate gradually: mark existing components as standalone one at a time. At SAP, we migrated from NgModules during the Angular 15 upgrade."*

## 4. 🧠 MEMORY AID
**"NgModule = groups components (old). Standalone = self-contained component (new). standalone: true + imports: []. bootstrapApplication() replaces NgModule bootstrap."**
