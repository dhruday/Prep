# 365 – Dependency Injection – Hierarchical Injectors, Tokens

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Angular's DI system creates and manages service instances through a hierarchy of injectors. **Root injector** (singleton), **module injector**, **component injector** (per-component instance). **InjectionTokens** enable DI for non-class values. `providedIn: 'root'` is the recommended default.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── PROVIDING AT DIFFERENT LEVELS ────

// Root level — singleton across entire app
@Injectable({ providedIn: 'root' })
export class AuthService {
  private user: User | null = null;
  login(credentials: Credentials) { /* ... */ }
}

// Component level — new instance per component
@Component({
  selector: 'app-dashboard',
  providers: [DashboardDataService], // new instance per dashboard
  template: `...`,
})
export class DashboardComponent { }

// ──── HIERARCHICAL INJECTOR RESOLUTION ────
// Angular walks up the injector tree:
// Component injector → Parent component → ... → Root injector
// First match wins

// ──── INJECTION TOKENS (for non-class values) ────
export const API_URL = new InjectionToken<string>('API_URL');
export const FEATURE_FLAGS = new InjectionToken<Record<string, boolean>>('FEATURE_FLAGS');

// Provide
bootstrapApplication(AppComponent, {
  providers: [
    { provide: API_URL, useValue: 'https://api.example.com' },
    { provide: FEATURE_FLAGS, useValue: { darkMode: true, newCheckout: false } },
  ],
});

// Inject
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(@Inject(API_URL) private apiUrl: string) {}
}

// ──── PROVIDER TYPES ────
providers: [
  // useClass — default instantiation
  { provide: LoggerService, useClass: ConsoleLogger },
  
  // useValue — static value
  { provide: API_URL, useValue: 'https://api.prod.com' },
  
  // useFactory — dynamic creation
  { provide: DataService, useFactory: (http: HttpClient, config: Config) => {
    return config.useMock ? new MockDataService() : new RealDataService(http);
  }, deps: [HttpClient, CONFIG_TOKEN] },
  
  // useExisting — alias
  { provide: AbstractLogger, useExisting: ConsoleLogger },
]

// ──── @Optional, @Self, @SkipSelf, @Host ────
@Component({ providers: [LocalService] })
export class ChildComponent {
  constructor(
    private required: RequiredService,                  // throws if not found
    @Optional() private optional: OptionalService,     // null if not found
    @Self() private local: LocalService,               // only this component's injector
    @SkipSelf() private parent: ParentService,         // skip this, look in parent
  ) {}
}
```

### Injector Hierarchy
```
Platform Injector (browser APIs)
   └── Root Injector (providedIn: 'root')
       └── Module Injector (NgModule providers)
           └── Component Injector (component providers)
               └── Child Component Injector
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Angular DI uses a hierarchical injector tree. providedIn: 'root' for singletons, component-level for per-instance services. I use InjectionTokens for configs and feature flags. @Optional for graceful degradation, useFactory for environment-based service selection. At Oracle, this pattern enabled clean test isolation via provider overrides."*

## 4. 🧠 MEMORY AID
**"providedIn: 'root' = singleton. Component providers = per-instance. InjectionToken = non-class DI. Resolution walks up injector tree."**
