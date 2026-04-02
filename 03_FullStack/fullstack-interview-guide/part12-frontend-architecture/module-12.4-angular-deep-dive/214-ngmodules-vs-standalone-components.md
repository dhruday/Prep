# NgModules vs Standalone Components (Angular 14+)
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **NgModule (traditional)**: Angular's original organisation unit — a class with `@NgModule({ declarations, imports, exports, providers })` that groups components, directives, and pipes into a cohesive block; components MUST be declared in exactly one NgModule to be usable; has been Angular's only option since Angular 2 (2016) through Angular 13
- **Standalone Components (Angular 14+)**: opt into with `standalone: true` in `@Component`; the component directly declares its own dependencies in its `imports: []` array; NO `declarations` NgModule required; components import what they need, not what their module needs; `bootstrapApplication()` replaces `bootstrapModule()` for standalone apps
- **Key difference**: NgModule = shared declarations pool (every component in the module sees all declarations); Standalone = each component explicitly imports its own dependencies (fine-grained, explicit, tree-shakeable)
- **`bootstrapApplication()` vs `bootstrapModule()`**: Standalone apps start with `bootstrapApplication(AppComponent, { providers: [...] })`; NgModule apps start with `bootstrapModule(AppModule)`; new Angular CLI projects default to standalone since Angular 17+
- **Migration path**: gradual — convert components to standalone one-by-one; standalone components can be declared in NgModules temporarily during migration; `ng generate component --standalone` creates standalone by default in Angular 17+
- **Why standalone is better**: less boilerplate (no need to add to `declarations` AND `exports`); better tree-shaking (unused components not pulled in by shared module); simpler lazy loading (import only what you need); clearer dependency graph; enables Angular's new `AppConfig` pattern for providers without `AppModule`

---

## 1. One-Line Definition
NgModules bundle groups of related components into shared declaration pools requiring explicit wiring, while Standalone Components (Angular 14+) make each component self-sufficient by declaring its own dependencies directly — removing the NgModule boilerplate layer that was Angular's main criticism versus React/Vue.

---

## 2. The Problem It Solves

The NgModule problem in practice: you create a new component `PaymentFormComponent`. To make it usable, you must:
1. Add it to `declarations` in `PaymentModule`
2. Add it to `exports` in `PaymentModule` (if other modules need it)
3. Import `PaymentModule` in any module that uses `PaymentFormComponent`
4. If `PaymentFormComponent` needs `ReactiveFormsModule`, add that to `PaymentModule`'s imports

Developer adds a component → 3 different places in 2 different files need updating. Forget one step: "Component is not part of any NgModule" error — unhelpful.

Standalone Components solve this: `@Component({ standalone: true, imports: [ReactiveFormsModule] })`. The component declares exactly what it needs. Add it anywhere by just importing the component class directly. No NgModule wiring.

---

## 3. How It Works Internally

### NgModule Architecture

```typescript
// Traditional NgModule architecture (pre-Angular 14 / still valid today)

// Feature module declares its components
@NgModule({
  declarations: [
    PaymentFormComponent,      // This module's components
    PaymentStatusBadgeComponent,
    PaymentHistoryTableComponent,
  ],
  imports: [
    CommonModule,              // NgIf, NgFor, etc.
    ReactiveFormsModule,       // FormGroup, FormControl
    HttpClientModule,          // HttpClient
    SharedModule,              // Your shared utilities
  ],
  exports: [
    PaymentFormComponent,      // Expose these to OTHER modules
    PaymentStatusBadgeComponent,
    // PaymentHistoryTableComponent NOT exported — internal only
  ],
  providers: [
    PaymentService,            // Module-scoped services
  ]
})
export class PaymentModule {}

// App module imports feature modules
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    RouterModule.forRoot(routes),
    PaymentModule,     // Import to use exported components from PaymentModule
    UserModule,
    OrderModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

// Main entry point:
platformBrowserDynamic().bootstrapModule(AppModule);

// Problems:
// 1. PaymentFormComponent works ONLY because PaymentModule imports ReactiveFormsModule
//    — not visible from reading PaymentFormComponent's code
// 2. Shared barrel modules ("SharedModule") grow to include everything, negating tree-shaking
// 3. Adding any component: declarations + exports + import in consumers = 3 file changes
```

### Standalone Architecture (Angular 14+)

```typescript
// Standalone component: self-contained, declares its own dependencies
@Component({
  selector: 'app-payment-form',
  standalone: true,  // ← Opt out of NgModule requirement
  imports: [
    ReactiveFormsModule,    // Imported directly — clear from reading this file
    CommonModule,           // NgIf, NgFor
    PaymentStatusBadgeComponent,  // Can import other standalone components directly!
    AsyncPipe,              // Standalone pipes/directives can be imported individually
  ],
  template: `
    <form [formGroup]="paymentForm">
      <app-payment-status-badge [status]="status$ | async" />
      <input formControlName="cardNumber" />
      <button type="submit">Pay</button>
    </form>
  `
})
export class PaymentFormComponent {
  paymentForm = this.fb.group({ cardNumber: ['', Validators.required] });
  status$ = this.paymentService.status$;
  
  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService
  ) {}
}

// Using a standalone component in another standalone component:
// Just import the class — no NgModule wiring
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [PaymentFormComponent],  // Direct class import
  template: `<app-payment-form />`
})
export class CheckoutComponent {}

// App bootstrap for standalone apps (Angular 17+ default):
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    // All root providers declared here instead of AppModule
  ]
});

// Tree-shaking benefit:
// NgModule: importing PaymentModule pulls in ALL 3 of its declarations
// Standalone: importing PaymentFormComponent pulls in ONLY PaymentFormComponent
//             PaymentHistoryTableComponent is NOT included if not used
```

### Lazy Loading Comparison

```typescript
// NgModule lazy loading (traditional):
const routes: Routes = [
  {
    path: 'checkout',
    loadChildren: () => import('./checkout/checkout.module').then(m => m.CheckoutModule)
    // Loads the entire module — all declarations come along
  }
];

// Standalone lazy loading (Angular 14+):
const routes: Routes = [
  {
    path: 'checkout',
    loadComponent: () => import('./checkout/checkout.component').then(m => m.CheckoutComponent)
    // Loads exactly ONE component — its dependencies load on demand
  }
];

// Standalone route-level lazy loading with providers:
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
    // ADMIN_ROUTES is just a Routes array — no module needed
  }
];

// admin.routes.ts — pure routes array, no NgModule:
export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminDashboardComponent },
  { path: 'users', loadComponent: () => import('./users/user-list.component').then(m => m.UserListComponent) },
];
```

---

## 4. The Code

### Wrong Way — Over-relying on Shared NgModules

```typescript
// ❌ WRONG — "SharedModule" anti-pattern (NgModule era mistake)
// This is the common poor practice: one shared module that exports EVERYTHING
@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule, MatInputModule, MatTableModule, // ... 20 more Material modules
    FlexLayoutModule,
    NgxChartsModule,
    TranslateModule,
    RouterModule,
    // ... 10 more
  ],
  declarations: [
    // Every shared component, directive, pipe
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    DateFormatterPipe,
    // ... 30 more
  ],
  exports: [
    // Re-exports EVERYTHING (imports + declarations)
    // ANY module that imports SharedModule gets ALL of this
    CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule,
    // ... all of the above
    LoadingSpinnerComponent, ErrorMessageComponent, DateFormatterPipe,
  ]
})
export class SharedModule {}
// Problems:
// 1. Any module importing SharedModule loads ALL 40+ components/modules into its scope
// 2. Tree-shaker can't remove unused exports — they're all referenced by SharedModule's exports
// 3. A module needing only LoadingSpinnerComponent gets HttpClientModule, NgxChartsModule, etc.
// 4. Circular dependency risk grows as SharedModule grows

// ❌ WRONG — Not using standalone components when migrating (missing the opportunity)
// Angular 14 was released, but team keeps adding new components the old way
// because "we'll refactor later" — never happens
@NgModule({
  declarations: [NewPaymentMethodComponent], // New in 2024, still using 2016 pattern
  imports: [SharedModule], // Still importing the bloated SharedModule
})
export class PaymentModule {}
```

> **Why this fails:** the SharedModule anti-pattern grows indefinitely and destroys tree-shaking benefits. Every module importing SharedModule loads ALL exports — a form component in a feature module pulls in chart libraries. Bundle size balloons, build performance degrades, circular dependencies appear.

### Right Way — Standalone + Lean Module Design

```typescript
// ✅ RIGHT — Standalone component with precise dependencies
@Component({
  selector: 'app-payment-method-card',
  standalone: true,
  imports: [
    NgClass,           // Single directive (not all CommonModule)
    CurrencyPipe,      // Single pipe
    MatCardModule,     // Only the Material modules needed
    RouterLink,        // Single router directive
  ],
  template: `
    <mat-card [ngClass]="{ 'selected': isSelected }">
      <span>{{ amount | currency:'INR' }}</span>
      <a [routerLink]="['/payment', methodId]">Details</a>
    </mat-card>
  `
})
export class PaymentMethodCardComponent {
  @Input() amount: number = 0;
  @Input() methodId: string = '';
  @Input() isSelected: boolean = false;
}

// ✅ RIGHT — Standalone app bootstrap (Angular 17+ default pattern)
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()), // Router with input binding
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),   // Async animations (lazy-loaded on first use)
    // All app-wide providers declared here — transparent, no AppModule
  ]
});

// ✅ RIGHT — When NgModules are still appropriate
// 1. Third-party libraries that haven't updated to standalone (still NgModule-based)
// 2. Gradual migration: wrap a group of converted standalone components temporarily
// 3. Testing: TestBed.configureTestingModule still works with both NgModules and standalone

// ✅ RIGHT — Clean migration path: one component at a time
// Step 1: Add standalone:true to the component
@Component({
  selector: 'app-order-summary',
  standalone: true,         // ← Add this
  imports: [                // ← Move imports from the module to here
    CurrencyPipe,
    DatePipe,
    NgFor,
  ],
  // ... template unchanged
})
export class OrderSummaryComponent {}

// Step 2: In the OLD NgModule, move from declarations to imports
@NgModule({
  declarations: [
    // OrderSummaryComponent removed from here
  ],
  imports: [
    OrderSummaryComponent,  // Standalone components can be imported in NgModules!
  ],
  exports: [OrderSummaryComponent]
})
export class LegacyOrderModule {}
// This allows gradual migration without breaking existing consumers

// ✅ RIGHT — Testing standalone components (simpler test setup)
describe('PaymentMethodCardComponent', () => {
  let component: PaymentMethodCardComponent;
  let fixture: ComponentFixture<PaymentMethodCardComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentMethodCardComponent] // Import the standalone component directly!
      // No need to import its dependencies separately — the component manages its own
      // (OR override them with test mocks if needed)
    }).compileComponents();
    
    fixture = TestBed.createComponent(PaymentMethodCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('should display the formatted amount', () => {
    component.amount = 2500;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('₹2,500.00');
  });
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are the main benefits of standalone components over NgModules?"

**Hruday's answer:**
> Three main benefits:
>
> First, explicit dependencies. Every standalone component declares exactly what it imports in its own decorator. You can understand what a component depends on by reading its `@Component` decorator — not by tracing which NgModule it's declared in and what that NgModule imports.
>
> Second, better tree-shaking. With NgModules and the SharedModule pattern, importing a feature module pulls in all its exported declarations — even ones you don't use. Standalone components are imported by class reference, so only the imported component (and its own imports) enter the bundle. A component that imports `CurrencyPipe` alone gets exactly that — not all of `CommonModule`.
>
> Third, less boilerplate and fewer errors. The classic "Component is not part of an NgModule" error is eliminated. New components are immediately usable once created. No juggling `declarations` + `exports` across multiple NgModule files. `ng generate component` in Angular 17+ creates standalone by default.
>
> The one case where NgModules remain useful: wrapping external libraries or legacy code during migration. Most greenfield Angular development in 2026 should be standalone-first.

---

### Q2 — Migration
**Interviewer asks:** "How would you migrate a large Angular application from NgModules to standalone?"

**Hruday's answer:**
> The Angular CLI provides `ng generate @angular/core:standalone` to automate most of this, but it's worth understanding the manual process first.
>
> The strategy is bottom-up. Start with leaf components — the ones with no child components, such as input fields, buttons, status badges. Convert them first: add `standalone: true`, move their required imports into the component's `imports` array, remove them from their NgModule's `declarations` (but add them to `imports` there temporarily so existing consumers still work).
>
> Work up the tree. Once all of a feature module's leaf components are standalone, convert its parent components. Eventually the NgModule itself becomes unnecessary — its declarations list is empty, its imports are just the standalone components it was wrapping. At that point, delete the NgModule and update consumers to import the standalone components directly.
>
> The AppModule step is last: convert to `bootstrapApplication()` with an `ApplicationConfig`, moving all `AppModule.providers` into the `providers` array. Remove AppModule entirely.
>
> Timeline reality: migrating a large app is a multi-sprint effort. Set a team convention: all NEW components are standalone from now. Migrate existing ones incrementally per feature rather than all at once. The coexistence of NgModule declarations and standalone imports works in the same app — Angular was designed to support gradual migration.

---

### Q3 — Deep Dive
**Interviewer asks:** "How does lazy loading work differently with standalone components compared to NgModules?"

**Hruday's answer:**
> With NgModules, lazy loading used `loadChildren` pointing to a module file that exported an `NgModule`. The router loaded the module file and all its declarations as one chunk. Fine-grained loading wasn't possible within the module.
>
> With standalone, two new options: `loadComponent` and standalone route files.
>
> `loadComponent` lazily loads a SINGLE component file as a route destination — `{ path: 'orders', loadComponent: () => import('./orders.component').then(m => m.OrdersComponent) }`. The chunk contains only that component and its direct imports. This is the finest-grained lazy loading Angular has ever had.
>
> Standalone route arrays: instead of a module, the lazy-loaded file exports a `Routes` array. The router loads the routes config (small), then lazily loads individual components within those routes only when navigated to. This enables a "thin module" pattern — the route file is the only eager-loaded thing; actual component code stays lazy.
>
> The practical impact: with NgModules, every feature module was one chunk with ALL its declared components. Navigating to the checkout route loaded the checkout module — including all 8 components inside it, whether the user navigates to them or not. With standalone `loadComponent` per route, only the visited routes' components are ever loaded.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Standalone replaces NgModules immediately" | "Angular 17 removed NgModules" | NgModules are NOT removed and are NOT deprecated as of Angular 17; the Angular team stated they'll be supported indefinitely; standalone is the recommended NEW way, not the forced way; many third-party libraries still use NgModules; the coexistence of both in the same app is fully supported and is the normal migration state for production apps |
| "Every component needs its own providers" | "With standalone, I put my services in each component's providers" | Component-level providers create a NEW service INSTANCE per component — appropriate for services that must be isolated (like a form service for a specific form instance), NOT for singletons; most services should still be in `providedIn: 'root'` or in the `bootstrapApplication()` providers array; component-level services are for the rare case of intentionally scoped instances |
| "Standalone components are faster" | "Standalone components render faster than NgModule-declared components" | Runtime performance is identical; the benefits are developer experience (less boilerplate), build performance (better tree-shaking, smaller bundles from precise imports), and maintainability; there's no difference in how Angular's change detection, compilation, or rendering handles standalone vs NgModule-declared components at runtime |
| "The imports array in standalone is the same as NgModule imports" | "The `imports` in a standalone component is the same thing as in NgModule" | The `imports` array in an NgModule's `@NgModule` decorator imports MODULES (or standalone components into the module scope). The `imports` array in a standalone `@Component` imports things directly for THAT COMPONENT — other standalone components, directives, pipes, AND NgModules (if the library is still NgModule-based); the array is the same key/syntax but the semantics are slightly different because the scope (module vs single component) differs |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our Angular project for the Fiori Analytics shell started with Angular 12 and heavy NgModule usage. By the time we migrated key parts to Angular 17, the SharedModule had grown to 45 exported items — causing every feature module that imported it to pull in everything from chart libraries to date picker components.
>
> The impact on bundle size was measurable: before standalone migration, the 'orders management' feature module bundle included NgxCharts (imported transitively through SharedModule) even though the orders module had zero charts. After converting to standalone with precise imports, the orders module bundle dropped by 38% because chart library code was no longer included.
>
> The migration strategy was: identify the 10 most-imported leaf components, convert them to standalone using `ng generate @angular/core:standalone` scaffolding, run `ng build --stats-json` to measure bundle impact after each conversion, and report to the team. The visible wins early in the process motivated the team to continue the migration. By the end of that quarter, 80% of components were standalone, and we retired the SharedModule entirely — replaced by the components' own precise imports."

---

## 8. Scale Evolution

**Small/new Angular project →** Start standalone from day one. Use `ng new --standalone` (Angular 17 default). All components, directives, and pipes standalone. `bootstrapApplication()`. Enjoy the clean DX with no NgModule friction.

**Existing Angular 12-15 app →** Gradual standalone migration; Angular's schematics handle most of it; prioritise components with SharedModule dependencies for maximum bundle size impact; run `ng build` + bundle analyser before and after each module conversion to measure wins.

**Enterprise/large-scale →** Angular library architecture: `providedIn: 'root'` for shared services, `ENVIRONMENT_INITIALIZER` for app-level setup, `provideRouter` + `withPreloading` for smart route preloading strategies; standalone directive/pipe sharing via local npm packages (no SharedModule needed); `@defer` blocks (Angular 17+) for even more fine-grained async loading within templates.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Angular is in the stack for multiple internal tools; shared component libraries for payment widgets must be tree-shakeable; fintech bundle size is a metric; standalone components reduce third-party payment SDK bundle sizes when embedded in merchant sites | Bundle size impact of NgModule vs standalone; library design with standalone; provider patterns for cross-cutting concerns |
| Swiggy / Meesho | Partner portal, delivery partner apps, internal dashboards in Angular; SharedModule anti-pattern common in older Angular codebases at scale; standalone migration reduces time-to-interactive for mobile partner apps | Migration strategy demo; standalone + lazy loading combination; NgModule import confusion |
| Adobe / Microsoft | Microsoft products using Angular (many internal tools, Outlook web, Teams features); deep experience with Angular module architecture expected at senior level; Microsoft's component library (Fluent Angular) now provides standalone components; architectural transitions in large products | Module architecture at scale; standalone API design for libraries; provider hierarchies |
| SAP Labs | Direct experience: SharedModule anti-pattern identified and resolved; 38% bundle size improvement via standalone migration; Angular 17 adoption at SAP Labs; SAP Fiori designed for standalone components (SAP's own Angular component library publishes standalone); `ng build --stats-json` bundle analysis workflow | Real migration story at SAP; bundle analysis metrics; conversion of SharedModule to standalone |

---

## 10. Related Topics — What to Study Next

- **Topic 215 — Angular Change Detection: Default vs OnPush** — standalone components and change detection are orthogonal (standalone doesn't change CD behaviour), but combining `standalone: true` with `changeDetection: ChangeDetectionStrategy.OnPush` is the modern Angular component pattern; every new standalone component should default to OnPush unless there's a specific reason not to
- **Topic 217 — Angular Router: Lazy Loading, Guards, Resolvers** — `loadComponent` and standalone route arrays represent the modern lazy loading model; Topic 217 covers the full router including standalone routing patterns; the lazy loading difference between NgModule (`loadChildren` → module) and standalone (`loadComponent` → component or `loadChildren` → route array) is a frequently asked interview topic
- **Topic 218 — Angular Signals v17+** — Angular Signals work exclusively with standalone components in the new zoneless change detection model; signals + standalone is the future of Angular reactivity; they reinforce each other because standalone components define their own change detection scope cleanly
- **Topic 216 — Angular DI: Hierarchical Injectors** — provider scoping works differently in standalone apps; `bootstrapApplication()` providers are the root injector; component-level `providers: [MyService]` create component tree injector instances; understanding the injector hierarchy is critical when converting from NgModule-scoped providers to standalone provider strategies

---

*Part 12 · NgModules vs Standalone Components · Full Stack Interview Guide · Hruday D · 2026*
