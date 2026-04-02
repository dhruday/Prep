# 60. Dependency Injection — Hierarchical Injectors, Tokens
**Phase:** Angular & RxJS Deep Dive | **Sequence:** SEQ 04 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Angular's DI system is hierarchical — injectors are arranged in a tree that mirrors the component tree. When a component requests a token, Angular walks up that tree looking for a provider, stopping at the first match. This means the same service class can have multiple independent instances at different tree levels, which I used extensively at Bosch to scope dashboard services per widget subtree — preventing state leakage between concurrent charts.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Angular DI solves three problems simultaneously:
1. **Inversion of control** — consumers declare what they need; the framework wires it up
2. **Scope management** — services can be singletons, route-scoped, or component-scoped
3. **Testability** — tokens can be substituted with mocks at any injector level

The system is **hierarchical** because the injector tree mirrors the component tree plus special platform-level injectors above it.

### How It Works Internally

**Injector tree levels (top to bottom):**

```
NullInjector (throws "No provider found" if you reach here)
   ↑
EnvironmentInjector — platform level (platformBrowserDynamic)
   ↑
EnvironmentInjector — root level (AppModule providers / bootstrapApplication providers)
   ↑
EnvironmentInjector — lazy-loaded route injector  [created on first navigation]
   ↑
NodeInjector — component injector (component providers[])
   ↑
NodeInjector — child component injector
```

**Resolution algorithm:**
1. Angular starts at the requesting component's `NodeInjector`
2. Walks up through parent component `NodeInjectors`
3. When it reaches the component tree root, it climbs into `EnvironmentInjectors`
4. First injector with a matching provider wins; if none found → `NullInjector` throws

**`providedIn: 'root'`** registers the service in the root `EnvironmentInjector`. Angular's tree-shaker removes the service from the bundle entirely if nothing injects it — this is the *only* registration mode that supports tree-shaking of services.

**`providedIn: 'any'`** (deprecated since v16) gave each lazy module its own instance. Use route-level `providers` instead.

**Injection Tokens:**

| Token type | Use case | Example |
|---|---|---|
| Class token | Inject a class directly | `inject(UserService)` |
| `InjectionToken<T>` | Non-class values (strings, objects, functions, interfaces) | `const API_URL = new InjectionToken<string>('api.url')` |
| `string` token | Legacy only — avoid (no type safety) | `@Inject('apiUrl')` |
| `abstract class` as token | Interface-like dependency inversion | `abstract class Logger` with concrete implementations |

**`inject()` function (Angular 14+):**  
Replaces constructor injection. Works anywhere in an injection context (constructor, field initializer, factory function, `runInInjectionContext`). Preferred over `@Inject()` decorator because it works in standalone without decorator metadata.

### Architecture & Component Boundaries

```
Root EnvironmentInjector
  ├── AuthService (providedIn: 'root')     → singleton, app-wide
  └── Route: /dashboard (own EnvironmentInjector via providers[])
        ├── DashboardDataService           → scoped, destroyed on leave
        └── DashboardComponent (NodeInjector)
              ├── ChartComponent (NodeInjector with providers: [LocalStateService])
              │     └── LocalStateService  → new instance per ChartComponent
              └── TableComponent (NodeInjector)
```

### Data Flow & State Flow

- Service instance is created the first time it is injected from a given injector level.
- Service is **destroyed** when its hosting injector is destroyed:
  - Root: never destroyed (lives for the app lifetime)
  - Route injector: destroyed when navigating away from the route
  - Component injector: destroyed when the component is destroyed (`ngOnDestroy`)
- `OnDestroy` lifecycle hook on services works — Angular calls it when the injector is torn down.

### Performance Implications

- **Tree-shaking:** Only `providedIn: 'root'` services are tree-shakeable. Module `providers` arrays force the service class into the bundle regardless of actual use.
- **Memory:** Providing singleton services at component level creates n instances for n of that component — N×memory. Intentional for stateful widgets; a bug if accidental.
- **Lazy loading:** Route-level providers delay service instantiation until navigation — no startup cost for services on infrequently visited routes.
- **DI resolution cost:** Each `inject()` call traverses the injector tree at first resolution, then is cached. No measurable runtime impact.

### Scalability Considerations

- **Small app:** `providedIn: 'root'` for everything; simplest mental model.
- **100+ services:** Organise by domain — route-level providers for feature-specific services, root only for truly global (auth, logging, analytics).
- **Multi-tenant / white-label:** `InjectionToken` + factory allows environment-specific implementations without `if/else` in service code.

### Trade-offs

| providedIn: 'root' | Component providers | Route providers |
|---|---|---|
| Singleton, tree-shakeable | New instance per component | New instance per route activation |
| Lives for app lifetime | Lives for component lifetime | Lives for navigation lifetime |
| Shared mutable state risk | Isolated state, no sharing | Shared within route subtree |
| Choose for auth, analytics | Choose for stateful UI widgets | Choose for feature data services |

### ⚠️ Anti-Patterns & Pitfalls

- **Service in component `providers` by mistake** — a singleton service accidentally listed in a component's `providers` creates a second instance. The component and its children get the local instance; siblings get the root instance. Classic state-not-updating bug.
- **Circular dependency** — ServiceA injects ServiceB which injects ServiceA. Angular throws a runtime error. Break cycles with a facade service or `forwardRef(() => ServiceA)`.
- **String tokens** — `@Inject('userService')` has no type checking and causes silent token collision bugs. Always use `InjectionToken<T>` or class tokens.
- **`useClass` with wrong injector level** — providing a SpecialAuthService via `{ provide: AuthService, useClass: SpecialAuthService }` at both root and module level registers two different providers; the inner scope shadows the outer.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At Bosch, each WebSocket dashboard widget needed its own `WebSocketFeedService` instance to subscribe to different data streams simultaneously. Using `providers: [WebSocketFeedService]` at the widget component level gave each chart its own connection and teardown lifecycle — the service was destroyed with the widget, automatically closing the socket. Previously it was a root singleton, causing reconnect loops when one chart unmounted.

At Oracle, an `InjectionToken<Environment>` named `APP_ENVIRONMENT` provided the Oracle Cloud REST base URLs per deployment region. The factory function read from a `/config.json` endpoint loaded at app bootstrap, allowing zero-rebuild regional deployments.

**At FAANG scale:**
- **Microsoft (Azure Portal):** Each portal blade is a lazy route with its own `EnvironmentInjector`. Blade-level services (ResourceLoader, TelemetryService) are scoped there — they don't pollute the root injector and are destroyed when the blade closes, reclaiming memory in a long-running SPA.
- **Adobe (Firefly):** `InjectionToken<AIModelConfig>` with a factory that returns different model endpoints for internal vs external users — no environment-specific `if/else` in any service.
- **Salesforce:** Abstract class tokens used for the logging interface — production uses DatadogLogger, tests substitute MockLogger, no code changes needed.
- **Cisco:** Route-level `CallSignallingService` scoped to the active call route — destroyed on hang-up, resetting all state cleanly.

**How it evolves with scale:**
- Small scale (< 10K users): Root providers for everything, simple.
- Medium scale (100K users): Route-level providers prevent memory accumulation in feature-heavy SPAs.
- Large scale (10M+ users): Abstract class tokens + factory functions enable feature flag-driven service substitution without runtime branching.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "Angular DI is hierarchical — there's a tree of injectors mirroring the application structure, from the platform injector at the top down to individual component injectors. When a component requests a token, Angular walks up that tree until it finds a provider.
>
> This hierarchy is powerful for scoping. At Bosch, I had a real-time dashboard where each chart widget needed its own WebSocket service instance. By providing the service in the component's `providers` array, Angular created one instance per widget and destroyed it when the widget unmounted — automatically closing the socket. If I'd used `providedIn: 'root'`, all charts would share one service and fighting over one connection.
>
> For non-class dependencies — base URLs, feature flags, config objects — I always use `InjectionToken<T>`. It's fully type-safe and avoids the string token collision bugs I've seen in legacy codebases.
>
> The `inject()` function in Angular 14+ is my preferred injection mechanism now — it works in standalone components without constructor metadata and plays nicely with class field initializers."

### Likely Follow-up Questions

1. **How do you inject a value, not a class?** → `InjectionToken<T>` + `{ provide: TOKEN, useValue: ... }` or `useFactory`.
2. **When would you get two instances of a service?** → Component `providers` creates a local instance; parent component's injectors have the original. Or two lazy modules both import a module with providers before Angular unification.
3. **What's `forwardRef`?** → Used when the injected token is referenced before it's defined (circular deps or circular file imports) — wraps the reference in a thunk resolved later.
4. **How does `inject()` work outside a constructor?** → It works in any **injection context**: constructor, field initializer, `runInInjectionContext()` callback, factory function.

### vs Alternatives

| Angular Hierarchical DI | React Context | Choose Angular DI when |
|---|---|---|
| Tree-shakeable with `providedIn` | Bundle always includes Provider | Angular codebase — no choice |
| Scope is injector-tree level | Scope is component subtree via Provider | Angular: route/component scoping built-in |
| Works with classes and tokens | Works with any value | Both good; Angular DI has stronger typing |
| `OnDestroy` on services | `useEffect` cleanup in context | Angular: automatic service cleanup on route exit |

### How to Signal Senior Thinking

> "The key architectural insight is treating the injector hierarchy as a resource lifetime graph — root injector for app-lifetime state, route injector for navigation-lifetime state, component injector for render-lifetime state. Getting scope wrong is the #1 cause of memory leaks and stale state bugs in large Angular apps."

---

## 💻 5. Code Example

```typescript
// --- InjectionToken for non-class config ---
export interface AppConfig {
  apiBaseUrl: string;
  featureFlags: Record<string, boolean>;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config', {
  providedIn: 'root',
  factory: () => ({
    apiBaseUrl: window.__ENV?.API_URL ?? '/api',
    featureFlags: window.__ENV?.FLAGS ?? {},
  }),
});

// --- Abstract class token for interface-like DI ---
export abstract class Logger {
  abstract log(message: string, context?: Record<string, unknown>): void;
  abstract error(error: Error, context?: Record<string, unknown>): void;
}

@Injectable({ providedIn: 'root' })
export class DatadogLogger implements Logger {
  private config = inject(APP_CONFIG);

  log(message: string, context = {}) {
    datadogLogs.logger.info(message, { ...context, env: this.config.apiBaseUrl });
  }
  error(error: Error, context = {}) {
    datadogLogs.logger.error(error.message, { ...context, error });
  }
}

// Register via token in bootstrapApplication
bootstrapApplication(AppComponent, {
  providers: [
    { provide: Logger, useClass: DatadogLogger },
    // In tests: { provide: Logger, useClass: MockLogger }
  ],
});

// --- Component-level scoping for widget isolation ---
@Component({
  standalone: true,
  selector: 'app-chart-widget',
  providers: [WebSocketFeedService],  // each widget gets its own instance
  template: `<canvas #chart></canvas>`,
})
export class ChartWidgetComponent implements OnInit, OnDestroy {
  // inject() in field initializer — Angular 14+ style
  private feed = inject(WebSocketFeedService);
  private logger = inject(Logger);

  ngOnInit() {
    this.feed.connect(this.dataStream);
    this.logger.log('Chart widget initialized', { component: 'ChartWidget' });
  }

  ngOnDestroy() {
    // WebSocketFeedService.ngOnDestroy is automatically called by Angular
    // because it belongs to THIS component's injector — socket closes here
    this.logger.log('Chart widget destroyed');
  }
}

// --- Route-level provider scoping ---
export const routes: Routes = [
  {
    path: 'analytics',
    loadComponent: () => import('./analytics.component').then(m => m.AnalyticsComponent),
    providers: [
      AnalyticsDataService,  // scoped to /analytics route — destroyed on leave
      { provide: Logger, useClass: AnalyticsLogger },  // override logger for this route
    ],
  },
];
```

**Interview vs Production difference:**
In an interview, show only the `InjectionToken` + one `providers` override. In production, add `runInInjectionContext` for service-in-service injection edges, strict null safety on `window.__ENV`, and a `MockLogger` registered in `TestBed.configureTestingModule` providers for unit tests.

---

## 🧠 6. Memory Aid

**Mental Model:** Injector tree = hotel floors. Room (component) looks for service at its own floor first, then walks down to lobby (root). Providing a service on a floor means guests on that floor get a floor-specific instance; other floors keep their own.

**If you go blank:** "Angular DI walks up an injector tree — component injector → parent injectors → route injector → root injector — stopping at the first provider found. Scope the service at the right level and lifecycle management is automatic."

**Mnemonic:** **HALT** — **H**ierarchical, **A**utomatic teardown, **L**evels (component/route/root), **T**okens for non-class deps.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Services scoped to routes destroy themselves on navigation — no stale data in UI
→ Performance: Tree-shakeable services with `providedIn: 'root'` — unused services don't ship
→ Business: Abstract token + useClass pattern enables feature-flag-driven service substitution without deployment risk

**How it works (3 sentences):**
Angular maintains a tree of injectors from the platform level down to individual component injectors; when a component needs a dependency, Angular walks up that tree until it finds a provider for the token or throws. Service lifetime is tied to the injector that owns the provider — root injector services live for the app, route injector services live for the navigation, component injector services live for the component. `InjectionToken<T>` allows type-safe injection of non-class values, and `inject()` enables tree-shaking-friendly injection without constructor metadata.

**Company relevance:**
- Microsoft: Azure Portal blade isolation — each blade has its own route injector, preventing state bleed between resource panee in the world's most complex SPA
- Adobe: Feature-flag-driven service substitution via `InjectionToken` — different AI model configs per user tier without code branching
- Salesforce: Multi-tenant SaaS — route-scoped services recreate cleanly per org navigation, no tenant data leakage between sandboxes
- Cisco: WebRTC session services scoped to call routes — automatic socket cleanup on call end, guaranteed by injector teardown

---
✅ Topic 60/486 complete → Continuing to Topic 61: Component Lifecycle Hooks — All 8 Hooks & When to Use
