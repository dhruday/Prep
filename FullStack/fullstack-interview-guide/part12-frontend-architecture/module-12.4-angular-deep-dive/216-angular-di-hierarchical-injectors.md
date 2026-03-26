# Angular Dependency Injection — Hierarchical Injectors
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Angular DI**: Angular's dependency injection system resolves constructor dependencies automatically; when a class declares `constructor(private svc: MyService)`, Angular's injector provides the correct instance — no manual `new MyService()` required anywhere
- **Hierarchical injectors**: Angular has multiple injectors arranged in a tree mirroring the component tree; when a component requests a dependency, Angular walks UP the injector hierarchy until it finds a provider — or throws if none exists; this hierarchy enables scoping services to different lifetimes
- **`providedIn: 'root'`**: lazily instantiated singleton shared across the entire app; most common for stateless services (HTTP clients, auth, API facades); tree-shakeable — bundled only if actually injected somewhere; the default choice for any app-wide service
- **Module-level providers**: `providers: [MyService]` in `@NgModule` — creates an instance scoped to that lazy-loaded module's lifetime; when the module is loaded, the service is instantiated; when the module is destroyed (navigating away), the service is also destroyed; useful for module-scoped state
- **Component-level providers**: `providers: [MyService]` in `@Component` — creates a NEW instance per component instantiation; each instance of the component gets its own isolated service instance; essential pattern for form state, shopping cart items, or any state that must be independent per component
- **`InjectionToken<T>`**: type-safe token for non-class values (configs, string constants, factory functions); replaces magic string tokens; covers `useValue`, `useClass`, `useFactory`, `useExisting` provider forms
- ✅ **Hruday's anchor**: SAP Fiori — component-level `PaymentFormStateService` per form instance; each form has its own isolated state service, enabling 3 simultaneous payment forms on the same page without state bleed

---

## 1. One-Line Definition
Angular's hierarchical injector system resolves dependencies at three scopes — root (app-wide singleton), module (lazy-module lifetime), and component (per-component-instance) — allowing services to have precisely the right lifetime and sharing scope for their purpose.

---

## 2. The Problem It Solves

Without hierarchical DI, you face a binary choice: either a service is a global singleton (shared everywhere, causing state pollution between uses), or you instantiate it manually with `new Service()` (losing DI benefits — the service can't itself have injected dependencies, can't be easily mocked in tests).

The classic problem: a `UserPreferenceFormService` that tracks form dirty state. If it's a root singleton, opening the user preference modal twice simultaneously (possible in complex SPAs) means both modals share the same dirty state — clearing the state in one modal unexpectedly clears the other's. If it's manually instantiated, you can't inject `HttpClient` or `Router` into it.

Component-level providers solve this: `providers: [UserPreferenceFormService]` in the component — each rendered instance of the component gets its own isolated `UserPreferenceFormService` instance. Both modals have independent dirty state. The service still benefits from DI and can have its own injected dependencies. When the component is destroyed, its service instance is also garbage collected.

---

## 3. How It Works Internally

### The Injector Tree

```
Angular's injector hierarchy (from broadest to narrowest scope):

Platform Injector
└── Root Injector (AppComponent level, created by bootstrapApplication())
    ├── Environment Injectors (lazy-loaded route modules / standalone routes)
    │   └── Module Injectors (providers in @NgModule)
    └── Component Injectors (providers in @Component)
        └── Child Component Injectors
            └── Grandchild Component Injectors
                └── ... (mirrors the component tree)

Resolution algorithm:
1. Component requests service X
2. Angular checks the COMPONENT's own injector (component-level providers)
3. If not found → checks PARENT component's injector
4. If not found → checks up through the component tree
5. If not found → checks module injector 
6. If not found → checks root injector
7. If still not found → NullInjectorError: No provider for X!

Key insight: the FIRST provider found in the upward walk is used.
A component can SHADOW a broader-scoped service by providing its own.
```

### Provider Scopes and Lifetimes

```
SCOPE              | HOW TO DECLARE               | LIFETIME            | INSTANCES
-------------------|------------------------------|---------------------|-------------------
Platform           | providedIn: 'platform'       | Entire platform     | 1 per page
Root (app-wide)    | providedIn: 'root'            | Entire app lifetime | 1 total (singleton)
Module             | providers: [X] in @NgModule  | Module lifetime     | 1 per module
Component          | providers: [X] in @Component | Component lifetime  | 1 per component INSTANCE

"1 per component INSTANCE" means:
<payment-form [orderId]="order1.id">  ← has its OWN PaymentFormStateService instance
<payment-form [orderId]="order2.id">  ← has its OWN PaymentFormStateService instance (different)
<payment-form [orderId]="order3.id">  ← has its OWN PaymentFormStateService instance (different)

Three simultaneous components → three isolated service instances.
All automatically destroyed when their component is destroyed.
```

---

## 4. The Code

### Wrong Way — Root Singleton Where Component Scope Is Needed

```typescript
// ❌ WRONG — root singleton service used as form state tracker

// Service declared as root singleton:
@Injectable({ providedIn: 'root' })
export class PaymentFormStateService {
  isDirty = false;
  selectedPaymentMethod: string | null = null;
  validationErrors: ValidationError[] = [];
  
  reset() {
    this.isDirty = false;
    this.selectedPaymentMethod = null;
    this.validationErrors = [];
  }
}

// Component using it — APPEARS to work fine when only ONE form is present:
@Component({
  selector: 'payment-form',
  template: `
    <form>
      <div *ngIf="formState.isDirty" class="unsaved-indicator">Unsaved changes</div>
      <!-- ... form fields ... -->
    </form>
  `
})
export class PaymentFormComponent implements OnInit {
  constructor(public formState: PaymentFormStateService) {}
  //                             ↑ Gets the SAME global singleton every time
  
  ngOnDestroy() {
    this.formState.reset(); // ❌ Resetting the GLOBAL state — affects ALL other 
                             //    payment forms currently on screen
  }
}

// Problem: two payment forms on screen simultaneously:
// <payment-form *ngIf="showForm1"></payment-form>  ← gets singleton
// <payment-form *ngIf="showForm2"></payment-form>  ← gets SAME singleton
// 
// User fills form1, marks it dirty.
// User opens form2.
// form2.ngOnInit might reset() → form1 LOSES its dirty state silently.
// Both forms are sharing the same isDirty, selectedPaymentMethod, validationErrors.

// ❌ WRONG — String-based (non-typed) injection token:
// Fragile: typos not caught at compile time, no type information
providers: [
  { provide: 'API_URL', useValue: 'https://api.example.com' }
]
// Injection — no type safety:
constructor(@Inject('API_URL') private apiUrl: string) {}
// Any typo in 'API_URL' gives NullInjectorError at runtime, not compile time.
```

> **Why this fails:** root-scoped services are singletons — every component that injects `PaymentFormStateService` gets the exact same instance. Multiple simultaneous form components share state in ways that produce hard-to-reproduce bugs. `@Inject('string')` tokens lose TypeScript type safety.

### Right Way — Component-Level Providers and Typed InjectionTokens

```typescript
// ✅ RIGHT — Component-level provider: each component instance gets its own service

@Injectable() // No providedIn here — this service is NOT registered globally
export class PaymentFormStateService {
  private readonly _isDirty$ = new BehaviorSubject<boolean>(false);
  private readonly _errors$ = new BehaviorSubject<ValidationError[]>([]);
  
  readonly isDirty$ = this._isDirty$.asObservable();
  readonly errors$ = this._errors$.asObservable();
  
  markDirty() { this._isDirty$.next(true); }
  
  setErrors(errors: ValidationError[]) { this._errors$.next(errors); }
  
  reset() {
    this._isDirty$.next(false);
    this._errors$.next([]);
  }
  // No global state — this is a pure instance-level service.
  // Each component instance gets its own BehaviorSubjects.
}

@Component({
  selector: 'payment-form',
  standalone: true,
  imports: [AsyncPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    PaymentFormStateService  // ← Registered at COMPONENT level
    //                           Each <payment-form> gets its OWN instance
  ],
  template: `
    <form [formGroup]="paymentForm">
      <div *ngIf="formState.isDirty$ | async" class="unsaved-indicator">
        Unsaved changes
      </div>
      <select formControlName="method">
        <option value="upi">UPI</option>
        <option value="card">Card</option>
      </select>
    </form>
  `
})
export class PaymentFormComponent implements OnInit {
  paymentForm = this.fb.group({ method: ['upi'] });
  
  constructor(
    private fb: FormBuilder,
    public formState: PaymentFormStateService // Gets the COMPONENT-SCOPED instance
  ) {}
  
  ngOnInit() {
    this.paymentForm.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.formState.markDirty());
  }
  // ngOnDestroy: Angular automatically destroys this component's injector,
  // which destroys the component-scoped PaymentFormStateService instance.
  // No manual reset() needed — no global state to clean up.
  
  private readonly destroyed$ = new Subject<void>();
  ngOnDestroy() { this.destroyed$.next(); this.destroyed$.complete(); }
}

// ✅ RIGHT — Three simultaneous forms, each with independent state:
// <payment-form [orderId]="order1">  ← own PaymentFormStateService (isDirty=false)
// <payment-form [orderId]="order2">  ← own PaymentFormStateService (isDirty=false)
// <payment-form [orderId]="order3">  ← own PaymentFormStateService (isDirty=false)
// Marking order1 dirty does NOT affect order2 or order3.


// ✅ RIGHT — Typed InjectionToken for configuration
export interface AppConfig {
  apiEndpoint: string;
  featureFlags: {
    enableBetaPricing: boolean;
    enableNewCheckout: boolean;
  };
  maxRetries: number;
}

// Type-safe token — TypeScript knows exactly what this token provides:
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
//                                          ↑ Type parameter gives compile-time type safety

// In bootstrapApplication() or any @NgModule:
bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: APP_CONFIG,
      useValue: {
        apiEndpoint: 'https://api.sap.com/v2',
        featureFlags: {
          enableBetaPricing: false,
          enableNewCheckout: true
        },
        maxRetries: 3
      } satisfies AppConfig  // TypeScript validates the shape at compile time
    }
  ]
});

// Injection — fully type-safe:
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(@Inject(APP_CONFIG) private config: AppConfig) {
    // this.config.apiEndpoint — TypeScript autocompletion works
    // this.config.unknownProperty — TypeScript ERROR at compile time
  }
}


// ✅ RIGHT — Factory provider for environment-dependent service
export const LOGGER_TOKEN = new InjectionToken<Logger>('LOGGER');

// Provide different implementations based on environment:
providers: [
  {
    provide: LOGGER_TOKEN,
    useFactory: (config: AppConfig): Logger => {
      return isProduction(config) 
        ? new SilentLogger()      // No-op logger in production
        : new ConsoleLogger();    // Verbose console logging in development
    },
    deps: [APP_CONFIG]  // Declare the dependencies of the factory function
  }
]


// ✅ RIGHT — useExisting for aliasing (multiple tokens, same instance)
// Example: a service implements two different interfaces
@Injectable({ providedIn: 'root' })
export class UserService implements AuthProvider, UserDataProvider {
  // implements both interfaces
}

providers: [
  UserService,  // Primary registration
  { provide: AUTH_PROVIDER_TOKEN, useExisting: UserService },      // Alias
  { provide: USER_DATA_PROVIDER_TOKEN, useExisting: UserService }  // Another alias
  // All three tokens resolve to the SAME UserService singleton
  // Components can inject by any of the three tokens — all get the same instance
]


// ✅ RIGHT — providedIn: 'platform' for micro-frontend shared services
// Shared across multiple Angular apps bootstrapped on the same HTML page:
@Injectable({ providedIn: 'platform' })
export class MicroFrontendEventBusService {
  private readonly events$ = new Subject<AppEvent>();
  
  publish(event: AppEvent) { this.events$.next(event); }
  on(type: string) { return this.events$.pipe(filter(e => e.type === type)); }
}
// Shell app + 3 micro-frontend Angular apps all share ONE EventBusService instance.
// Message published by micro-frontend A is received by micro-frontend B.
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is `providedIn: 'root'` and when would you NOT use it?"

**Hruday's answer:**
> `providedIn: 'root'` registers the service with the root injector — it becomes a singleton shared across the entire application, with lazy instantiation (instantiated the first time it's injected). It's tree-shakeable: if nothing in the application actually injects it, the Angular bundler excludes it from the final bundle entirely.
>
> I use `providedIn: 'root'` for stateless infrastructure services — HTTP facades, authentication services, logging, analytics, routing utilities — essentially anything that should behave as true application singletons.
>
> I would NOT use `providedIn: 'root'` in two scenarios: First, when a service must maintain state that's specific to a particular component instance — like form state, where multiple simultaneous instances of the form component must have independent state. There I use `providers: [FormStateService]` in the `@Component` decorator. Second, when a service should be scoped to a lazy-loaded module — for example, a feature module's state manager that should be created when the module loads and destroyed when the user navigates away from that route. There I put the service in the `@NgModule`'s `providers` array.

---

### Q2 — SAP Experience
**Interviewer asks:** "Give me a real example where you used component-level providers."

**Hruday's answer:**
> At SAP, we built a document approval workflow where a manager could simultaneously review multiple approval requests — each shown as a separate panel on screen. Each panel had an approval form with validation state, comment drafts, and modification history.
>
> Initially the form state service was a root singleton. This caused an obvious bug: when submitting panel A's form, its state service got reset, and since it was the same instance used by panel B, panel B's form would also clear. The manager lost their draft comments.
>
> The fix was to move the `ApprovalFormStateService` to component-level providers: `providers: [ApprovalFormStateService]` in the `@Component` decorator. From that point, each rendered panel instance got its own isolated service instance. Panel A's submission lifecycle was completely independent of panel B. When a panel was closed (component destroyed), Angular's injector hierarchy automatically garbage-collected that panel's service instance — no manual cleanup needed.
>
> The pattern works because Angular's component-level injector mirrors the component tree. When the component is destroyed, its injector and everything registered in it is destroyed too.

---

### Q3 — Deep Dive
**Interviewer asks:** "Explain `useValue`, `useClass`, `useFactory`, and `useExisting` with use cases."

**Hruday's answer:**
> These are the four provider forms for non-default service registration.
>
> `useValue`: registers a specific value that will be returned as-is. Primary use case: configuration objects: `{ provide: APP_CONFIG, useValue: { apiUrl: '...' } }`. Also for mock objects in tests: `{ provide: RealService, useValue: mockServiceObject }`.
>
> `useClass`: registers an alternative class to instantiate when the given token is requested. Use case: swap implementations by environment or feature flag — `{ provide: PaymentGateway, useClass: isTest ? MockPaymentGateway : StripeGateway }`. Angular instantiates the class and resolves ITS dependencies via DI normally.
>
> `useFactory`: registers a factory function that Angular calls to produce the value. The function receives `deps` as arguments — these are resolved by DI. Use case: service that requires runtime information to construct (like environment-dependent configuration; or a service that needs to decide which implementation to return based on an injected config): `{ provide: LOGGER, useFactory: (env: EnvironmentConfig) => env.prod ? new NoOpLogger() : new DevLogger(), deps: [ENV_CONFIG] }`.
>
> `useExisting`: registers an alias — when token A is requested, Angular returns the same instance that was already resolved for token B. Nothing new is instantiated. Use case: a service implements two interfaces, and you want both interface tokens to resolve to the same singleton: `{ provide: AUTH_INTERFACE, useExisting: UserService }`. Also useful for migration — deprecating an old token while pointing it at the new implementation.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "One service = one instance always" | "Services are singletons in Angular" | This is true only for `providedIn: 'root'` services; a service declared with `providers: [X]` in a `@Component` creates a NEW instance per component instance — three `<payment-form>` components on screen simultaneously = three separate instances of the service; the lifetime follows the component; this is the key to isolating per-component state |
| "Lazy modules get their own service instances automatically" | "Lazy loading always creates a new service instance" | ONLY if the service is in the lazy module's `providers` array (NgModule approach) or the `providers` array of the lazy route config (standalone approach); if the service uses `providedIn: 'root'`, it remains a single root-level singleton regardless of lazy loading — lazy loading does NOT give you a fresh root service instance just because you navigate to a lazy route |
| "InjectionToken is for special cases" | "I use string tokens for custom DI values" | `InjectionToken<T>` is the always-correct approach for any non-class value: it's typed (TypeScript autocompletion on the injected value, compile-time errors for wrong types), collision-resistant (the token is an object reference, not a string that two libraries might accidentally use the same name for), and debuggable (the optional second argument is a description string shown in error messages: `new InjectionToken<AppConfig>('AppConfig', { factory: () => defaultConfig })`) |
| "Tree-shaking removes unused services automatically" | "Angular tree-shakes all unused services" | ONLY `providedIn: 'root'` (and `'platform'`) services are tree-shaken; services listed in `providers: [X]` in `@NgModule` are ALWAYS included in the module bundle, whether anyone injects them or not; this is one of the reasons standalone components with `providedIn: 'root'` services produce smaller bundles than NgModule-based apps with `providers: [X]` in module declarations |

---

## 7. Hruday's Real Experience Hook
> "The SAP Fiori approval workflow experience was the moment I understood that 'singleton vs non-singleton' isn't an academic question — it has direct UX consequences.
>
> The scenario: a procurement manager reviewing three vendor invoices side by side (a real SAP Fiori use case — multitasking is core to the workflow). Each invoice was an independently navigable form component. When we first built it, the `InvoiceApprovalService` was `providedIn: 'root'`. The state machine inside it — current approval step, validation status, draft comments — was one global instance.
>
> The symptoms were subtle at first: approving invoice #1 would sometimes clear the comments a manager had typed in invoice #2. The Angular DevTools (component tree inspector) was the key debugging tool: I could see that all three invoice components were pointing to the exact same service instance in the injector tree. One `resetState()` call from any of them affected all three.
>
> Moving to component-level providers was a three-line change: removed `providedIn: 'root'` from the service decorator, added `providers: [InvoiceApprovalService]` to the component metadata. The injector tree immediately showed three separate instances. The bug was gone.
>
> One thing that impressed the team: because the service now had component-scoped lifetime, we could remove ALL the cleanup logic from `ngOnDestroy`. No more `this.approvalService.reset()` in destroy hooks. Angular's injector hierarchy handles destruction automatically. The code got simpler AND more correct."

---

## 8. Scale Evolution

**Small/medium app →** `providedIn: 'root'` for all shared services (auth, API facades, error handling); straightforward singleton model; `InjectionToken<T>` for any configuration object; no module-level providers needed.

**Feature-module architecture →** services in each feature module's `providers` array for module-scoped state (shopping cart that's only alive while the cart module is loaded); lazy-loaded modules isolate their own instances.

**Large component-rich apps (SAP Fiori, dashboards, forms) →** component-level providers for any state that must be isolated per rendered instance; form state services, instance-scoped validation, per-widget settings managers; combine with `OnPush` + `async` pipe for clean state isolation with reactive rendering.

**Micro-frontend architecture →** `providedIn: 'platform'` for cross-app shared services (event bus, shared auth state); each micro-frontend's Angular app shares these platform-scoped services; combined with Module Federation for code-split micro-frontends that communicate through shared DI instances.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Multiple concurrent payment widgets on merchant dashboards (each with independent state); InjectionToken for Razorpay API configuration per merchant; component-level service isolation for checkout step-state machines; tree-shakeable services for SDK bundle size | Component-level providers for payment form state; InjectionToken for API config; tree-shaking awareness |
| Swiggy / Meesho | Multi-tab or multi-order management UIs; delivery tracking state per order card; product listing filter state (component-scoped per search result panel); independent state for A/B test variants of the same component rendered simultaneously | Component scoping knowledge; injection hierarchy for feature isolation |
| Adobe / Microsoft | Complex document editors with multi-panel state; Adobe XD layers panel (each layer row has independent state); Office Online concurrent document areas; Angular DevTools for DI debugging; enterprise-scale DI tree management | Full DI knowledge depth; useFactory patterns; InjectionToken typed config |
| SAP Labs | Direct experience: component-level `InvoiceApprovalService` for simultaneous multi-invoice review; SAP Fiori DI patterns with `providedIn: 'root'` for infrastructure; component-scoped state for multi-instance form patterns; platform-scoped services for SAP Launchpad micro-frontend shell | Real isolation bug fix story; lifecycle tied to component lifecycle; micro-frontend platform scope |

---

## 10. Related Topics — What to Study Next

- **Topic 215 — Angular Change Detection** — component-level providers and `OnPush` change detection are natural complements; a component that uses a component-scoped `BehaviorSubject` service with `async` pipe binding is the canonical Angular 17+ pattern for isolated, efficiently-rendered stateful components; the two features (scoped DI + OnPush) reinforce each other in preventing unintended state sharing and unnecessary re-renders
- **Topic 217 — Angular Router Lazy Loading, Guards, Resolvers** — route-level `providers` in the standalone routing API (`{ path: '...', loadComponent: ..., providers: [MyRouteService] }`) create module-like service scopes without NgModules; route-provided services are essentially environment injector scopes — understanding hierarchical DI is a prerequisite for using route-level providers correctly
- **Topic 214 — NgModules vs Standalone Components** — the historical context: in NgModule-based Angular, `providers: [X]` in `@NgModule` was the primary way to create non-root scopes; standalone components and the standalone routing API largely replace this with cleaner, more explicit provider scopes; understanding why NgModules existed helps explain the evolution to `providedIn: 'root'` with standalone component-level providers
- **Topic 218 — Angular Signals v17+** — Angular Signals with `inject()` at instance creation time interact with the DI hierarchy in the same way Constructor injection does; `inject(MyService)` inside a `computed()` or `effect()` resolves from the current injection context; understanding the injector hierarchy makes signal-based service injection predictable

---

*Part 12 · Angular Dependency Injection — Hierarchical Injectors · Full Stack Interview Guide · Hruday D · 2026*
