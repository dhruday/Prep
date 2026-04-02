# 59. NgModules vs Standalone Components (Angular 14+)
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

NgModules were Angular's original compilation and dependency grouping unit — every component, directive, and pipe had to be declared inside one. Angular 14 introduced standalone components, which declare their own dependencies directly via `imports: []` on the `@Component` decorator, removing the need for a module wrapper entirely. I migrated our SAP BI Launchpad widgets to standalone in Angular 17, which cut initial bundle size by ~18% because tree-shaking could finally eliminate unused parts of shared modules that hadn't been properly scoped.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

An **NgModule** (`@NgModule`) was Angular's answer to the question: *how do you declare what template tokens (components, directives, pipes) a template compiler can see?* It also doubled as a DI boundary (providers array) and a lazy-loading unit for the router.

A **Standalone Component** (`@Component({ standalone: true })`) collapses that indirection. The component itself lists its own template dependencies in `imports: []` — no module needed, no declarations array, no re-exports.

| Concept | NgModule | Standalone |
|---|---|---|
| Template compilation scope | Module `declarations` | Component `imports` |
| DI scope | Module `providers` | Component/Route `providers` |
| Lazy loading unit | Module class | Component class |
| Boilerplate | High (separate module file) | Low (single file) |
| Tree-shakability | Coarse (whole module) | Fine (per component) |

### How It Works Internally

**NgModule:**
1. The Angular compiler reads `@NgModule.declarations` and builds a **compilation scope** — a map of selector → component/directive/pipe classes available in that module's templates.
2. At runtime, the **injector hierarchy** is created: platform injector → root injector → lazy-loaded module child injector.
3. `forRoot()` / `forChild()` patterns exist because a module can be imported multiple times but providers should only be registered once.

**Standalone:**
1. Each component carries its own `imports` metadata. The compiler builds a per-component compilation scope at build time.
2. The `bootstrapApplication(AppComponent, { providers: [...] })` API replaces `platformBrowserDynamic().bootstrapModule(AppModule)`.
3. Standalone components can still be imported into legacy NgModules (declared in `imports`, not `declarations`).
4. `importProvidersFrom(RouterModule.forRoot([...]))` bridges the old module-provider pattern into the new provider array.

### Architecture & Component Boundaries

```
Legacy NgModule architecture:
AppModule ─── CoreModule (singleton services)
           └── SharedModule (reusable UI, re-exported)
           └── FeatureModule (lazy, own injector child)
                  └── FeatureComponent (declared here only)

Standalone architecture:
bootstrapApplication(AppComponent)
  providers: [provideRouter(routes), provideHttpClient()]
  AppComponent imports: [RouterOutlet, HeaderComponent]
                                         ↓
  FeatureComponent (standalone, lazy route)
    imports: [CommonModule, ReactiveFormsModule, ButtonComponent]
```

### Data Flow & State Flow

- Providers in `bootstrapApplication` → available application-wide (equivalent of AppModule root providers).
- Providers on a `Route` (`{ path: '...', providers: [...] }`) → scoped to that route's injector subtree (new in Angular 14, only works cleanly with standalone).
- Providers in `@Component({ providers: [...] })` → scoped to that component instance tree.

### Performance Implications

- **Bundle size:** NgModules force entire shared modules into the same chunk. If `SharedModule` exports 40 components but a feature uses 3, all 40 are in the bundle. Standalone tree-shaking operates at the individual symbol level → significant savings.
- **Build speed:** Standalone compilation scope is computed per component — less transitive dependency resolution, faster incremental builds.
- **Initial load:** Lazy-loading a standalone component (`loadComponent`) skips the module wrapper overhead; Angular does not need to instantiate and process a module class before rendering.
- **Core Web Vitals:** Smaller lazy chunks → better LCP and TTI, especially on mobile where parse time matters.

### Scalability Considerations

- **< 10 features:** NgModules are manageable; overhead is low.
- **50+ feature modules:** Module graph becomes complex; shared module re-export chains cause accidental provider override bugs; bundle analysis gets messy.
- **100+ components:** Standalone is clearly superior — each component is self-describing, onboarding new engineers is faster, and CI tree-shaking analysis is reliable.

### Trade-offs

| NgModule | Standalone | When to Choose |
|---|---|---|
| Works with all Angular versions | Requires Angular 14+ | Choose NgModule only for legacy codebases on < 14 |
| Centralised provider registration | Distributed — easy to duplicate providers | NgModule for strict singleton service enforcement |
| Familiar patterns, lots of examples | Less online documentation (but growing fast) | Standalone for all greenfield work |
| Lazy loading requires module | Direct `loadComponent` | Standalone for fine-grained splitting |
| forRoot/forChild patterns | `provideX()` functional providers | Standalone is cleaner for library authors |

### ⚠️ Anti-Patterns & Pitfalls

- **Declaring a standalone component in `declarations`** — it must go in `imports`, not `declarations`. Angular throws `NG0305` and it's a frequent migration mistake.
- **Registering services in both root providers AND component providers** — creates two instances. `providedIn: 'root'` on the service itself prevents this; never add singleton services to component `providers`.
- **Giant SharedModule anti-pattern** — exporting 50+ components from one module so every feature imports it, defeating tree-shaking. Break into focused import groups even when staying NgModule-based.
- **Forgetting `importProvidersFrom()`** when bridging — services configured with `moduleName.forRoot()` need `importProvidersFrom(ModuleName.forRoot())` inside the providers array of `bootstrapApplication`, otherwise they are undefined at runtime.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the BI Launchpad was built with a large `SharedModule` exporting ~60 reusable UI components. When migrating widgets to standalone in Angular 17, each widget could declare exactly the 3–5 components it actually used. Lighthouse performance score on the BI tiles page improved because widget bundles dropped from ~180 KB to ~105 KB — tree-shaking finally worked correctly. The `provideODataClient()` functional provider replaced the old `ODataModule.forRoot()` pattern cleanly.

At Bosch, the real-time WebSocket dashboard had deeply nested feature modules. Migrating the chart widgets to standalone allowed route-scoped `ChartDataService` instances — each dashboard tab got its own service instance via `{ path: 'chart/:id', providers: [ChartDataService] }`, eliminating cross-tab state leakage that had been a recurring bug.

**At FAANG scale:**
- **Microsoft (Azure Portal):** The portal runs thousands of blade components from dozens of teams. Standalone components allow each blade team to ship independently with minimal shared surface area — no risk of accidentally registering conflicting providers via shared module chains.
- **Adobe (Creative Cloud):** CC's web apps use Angular micro-frontends. Standalone components make shell-to-plugin handoff cleaner — a plugin can be a single standalone component with its own provider scope, loaded via `loadComponent`.
- **Salesforce (Lightning):** Salesforce migrates LWC experience patterns into Angular for internal tooling. Standalone aligns better with LWC's "component is the unit" philosophy.
- **Cisco (WebEx UI):** Complex communication UI with many feature flags. Route-level `providers` with standalone let Cisco scope WebSocket services to individual feature routes rather than polluting the root injector.

**How it evolves with scale:**
- Small scale (< 10K users): NgModule works fine; bundle size differences are negligible.
- Medium scale (100K users): Standalone shines — feature teams move independently, no accidental coupling through shared module exports.
- Large scale (10M+ users): Standalone + `loadComponent` + route-level providers is the only viable architecture; module-based lazy loading creates too many coupling points.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "NgModules solved Angular's template compilation problem — they define which components, directives, and pipes are visible within a template. But they were overloaded: they also controlled DI scope, lazy loading, and library configuration. That coupling created the SharedModule anti-pattern where you'd import 60 components to use 3.
>
> Standalone components, introduced in Angular 14 and made the default in Angular 17, collapse this — the component declares its own template dependencies via `imports`. DI scope moves to `bootstrapApplication` providers or route-level providers. This gives you fine-grained tree-shaking: only what a component actually imports ends up in its bundle.
>
> In practice, at SAP I migrated our BI widget library from NgModule to standalone in Angular 17. Widget bundle sizes dropped ~40% because the 60-component SharedModule was finally broken up. The route-level provider pattern also let us scope `ODataService` instances per dashboard widget, eliminating cross-widget state bugs.
>
> For greenfield work I always use standalone. For migration, Angular's `ng generate @angular/core:standalone` schematic handles the mechanical transformation automatically."

### Likely Follow-up Questions

1. **Can standalone components co-exist with NgModules?** → Yes — standalone components go in `imports[]` of NgModules, and NgModule-based services are bridged via `importProvidersFrom()`.
2. **How do you provide a singleton service in a standalone app?** → `providedIn: 'root'` on the service class, or add to `bootstrapApplication` providers array.
3. **How does lazy loading work without modules?** → `loadComponent: () => import('./feature.component')` in the router — Angular loads and compiles the standalone component directly.
4. **What's the migration path?** → Run `ng generate @angular/core:standalone` — three-mode schematic: convert components, remove unnecessary modules, bootstrap switch.

### vs Alternatives

| Standalone Components | NgModule | Choose this when |
|---|---|---|
| Fine-grained tree-shaking | Coarse module-level shaking | Standalone: any greenfield project |
| `loadComponent` for lazy routes | `loadChildren` module lazy load | Standalone: simpler router config |
| Route-scoped providers | Module child injector | Standalone: cleaner DI isolation |
| Lower boilerplate | Higher boilerplate | NgModule: maintaining pre-v14 codebases |

### How to Signal Senior Thinking

> "The architectural insight is that NgModules conflated compilation scope, DI scope, and lazy-loading into one concept. Standalone components separate those concerns cleanly — compilation scope lives on the component, DI scope lives on the route or bootstrap config, and lazy loading is just a dynamic import. That separation is what makes the architecture scale."

---

## 💻 5. Code Example

```typescript
// BEFORE: NgModule pattern
@NgModule({
  declarations: [DashboardComponent, MetricCardComponent],
  imports: [CommonModule, HttpClientModule, SharedModule], // SharedModule = 60 components
  providers: [DashboardService],
})
export class DashboardModule {}

// AFTER: Standalone pattern — fine-grained, tree-shakeable

// metric-card.component.ts
@Component({
  standalone: true,
  selector: 'app-metric-card',
  imports: [CommonModule, DecimalPipe],  // only what THIS component needs
  template: `<div class="metric">{{ value | number:'1.0-0' }}</div>`,
})
export class MetricCardComponent {
  @Input() value = 0;
}

// dashboard.component.ts
@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [MetricCardComponent, AsyncPipe],  // explicit, zero surprise
  template: `
    <app-metric-card *ngFor="let m of metrics$ | async" [value]="m.value" />
  `,
})
export class DashboardComponent {
  metrics$ = inject(DashboardService).getMetrics();
}

// app.routes.ts — lazy load with ROUTE-SCOPED provider
export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
    providers: [DashboardService]  // scoped to this route — not root injector
  }
];

// main.ts — no AppModule
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(TranslateModule.forRoot()),  // bridge legacy forRoot modules
  ]
});
```

**Interview vs Production difference:**
In an interview, omit `importProvidersFrom` and `TranslateModule` — keep it minimal. In production, you also add `provideHttpClient(withInterceptors([authInterceptor]))`, `provideAnimations()`, CSP-compatible route preloading strategies, and error handler providers.

---

## 🧠 6. Memory Aid

**Mental Model:** NgModule = apartment building with a shared lobby (shared module). Standalone = each apartment brings its own furniture (imports what it needs, nothing more).

**If you go blank:** "NgModules defined a compilation scope at the module level — standalone components define it at the component level. The result is better tree-shaking and simpler DI boundaries."

**Mnemonic:** **STAND** — **S**elf-contained, **T**ree-shakeable, **A**utonomous, **N**o-module, **D**irect imports.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Smaller bundles → faster first paint, better LCP on feature routes
→ Performance: Angular CLI tree-shaking operates at symbol level, not module level
→ Business: Faster feature team independence, reduced accidental coupling in large codebases

**How it works (3 sentences):**
Standalone components carry their own `imports` array that defines the template compilation scope, replacing the NgModule `declarations` mechanism. The Angular compiler builds a per-component scope at build time, enabling symbol-level tree-shaking rather than module-level chunk bundling. DI scope moves to `bootstrapApplication` providers or route-level `providers`, giving precise control over service lifetime without module child injector complexity.

**Company relevance:**
- Microsoft: Azure Portal runs hundreds of team-owned blade components — standalone removes inter-team module coupling and enables blade-level lazy loading
- Adobe: CC web asset pipelines use micro-frontend Angular apps — standalone components are the natural unit for shell-to-plugin boundaries
- Salesforce: Internal tooling Angular apps need route-scoped service instances for multi-tenant SaaS records — route providers on standalone routes solve this cleanly
- Cisco: WebEx UI feature flags and route-level A/B testing — standalone + route providers lets Cisco scope experimental services without polluting the root injector

---
✅ Topic 59/486 complete → Continuing to Topic 60: Dependency Injection — Hierarchical Injectors, Tokens
