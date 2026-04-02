# Jasmine and Karma — Angular Testing Patterns
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Jasmine** is the test framework (describe/it/expect/before*/after*); **Karma** is the test runner that launches a real browser and runs Jasmine inside it; Angular CLI uses both by default but you can swap them (Jest is a popular alternative)
- **TestBed** is Angular's testing module that bootstraps a mini Angular application for each test suite; `TestBed.configureTestingModule({ declarations, imports, providers })` creates the module; without TestBed, Angular components won't have change detection or DI working
- **ComponentFixture** wraps a component instance; `fixture.detectChanges()` triggers Angular's change detection so the template reflects the current component state; you MUST call it after setup and after any state change before asserting on the DOM
- **debugElement** is Angular's wrapper around a native DOM element; `fixture.debugElement.query(By.css('button'))` returns a DebugElement; `.nativeElement` gives the raw DOM element; prefer `By.css()` or `By.directive()` over raw DOM querying
- **HttpClientTestingModule + HttpTestingController**: import `HttpClientTestingModule` instead of `HttpClientModule` in tests; use `httpController.expectOne('/api/products')` to intercept and flush a request; `httpController.verify()` in afterEach ensures no unexpected requests were made
- **fakeAsync/tick vs waitForAsync**: `fakeAsync` gives you synchronous control of async with `tick(ms)` to advance fake time; `waitForAsync` lets real async play out with `await fixture.whenStable()`; prefer `fakeAsync` for deterministic control

---

## 1. One-Line Definition
Angular's default testing setup uses Jasmine (test framework with spy APIs) and Karma (browser-based test runner), with Angular's own TestBed utility to bootstrap component + DI infrastructure for each test.

---

## 2. The Problem It Solves

Angular components are not standalone JavaScript classes — they depend on Angular's change detection, dependency injection, template compilation, and lifecycle hooks. You cannot simply `new ProductComponent()` and call methods; the component won't render and its `@Input()` values won't flow.

TestBed solves this by creating a full (but lightweight) Angular module that wires up the component with its real or mocked dependencies. The test runs inside a real browser (via Karma), which means browser APIs (`window.history`, `localStorage`, CSS transitions) behave exactly as they would in production.

---

## 3. How It Works Internally

### TestBed Bootstrap Lifecycle

```
TestBed.configureTestingModule({...})
  ↓
  Creates an Angular module (NgModule) in memory
  Registers declarations, imports, providers you specified
  Does NOT compile components yet

fixture = TestBed.createComponent(ProductCardComponent)
  ↓
  Compiles the component template (converts template HTML → component view)
  Creates a ComponentRef inside the test AppRef
  Returns a ComponentFixture wrapping the component

fixture.detectChanges()   ← FIRST call
  ↓
  Triggers ngOnInit()
  Runs Angular change detection (bindings, interpolations, structural directives)
  Updates the DOM to reflect current component state

fixture.componentInstance   ← access the component class
fixture.debugElement        ← access the DOM via Angular's DebugElement
fixture.nativeElement       ← shortcut to fixture.debugElement.nativeElement
```

### Spy vs Stub in Jasmine

```
jasmine.createSpy('name')
  → Standalone spy function (equivalent to jest.fn())
  → Records calls, can be configured with .and.returnValue()

jasmine.createSpyObj('name', ['method1', 'method2'])
  → Creates an object with spy methods
  → Equivalent to jest.createMockFn() approach or manual jest.fn() object

spyOn(object, 'methodName')
  → Wraps an existing method (equivalent to jest.spyOn)
  → Can .and.returnValue() / .and.callFake() / .and.callThrough()
  → Automatically restored after the spec by Jasmine's runner
```

---

## 4. The Code

### Wrong Way — Common Angular Testing Anti-Patterns

```typescript
// ❌ WRONG 1: Not calling fixture.detectChanges() before asserting

describe('ProductCardComponent', () => {
    let component: ProductCardComponent;
    let fixture: ComponentFixture<ProductCardComponent>;
    
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ProductCardComponent]
        }).compileComponents();
        
        fixture = TestBed.createComponent(ProductCardComponent);
        component = fixture.componentInstance;
        // ❌ No fixture.detectChanges() here
    });
    
    it('should display product name', () => {
        component.product = { id: 1, name: 'Laptop', price: 999 };
        // ❌ DOM has not been updated — Angular hasn't run change detection
        // The template still shows the initial empty state
        const nameEl = fixture.debugElement.query(By.css('.product-name'));
        expect(nameEl.nativeElement.textContent).toBe('Laptop');
        // ← This FAILS because detectChanges() was never called
    });
});
```

```typescript
// ❌ WRONG 2: Importing real HttpClientModule instead of testing version

describe('ProductService', () => {
    let service: ProductService;
    
    beforeEach(() => {
        TestBed.configureTestingModule({
            // ❌ Real HttpClientModule makes real HTTP calls in tests
            imports: [HttpClientModule],
            providers: [ProductService]
        });
        service = TestBed.inject(ProductService);
    });
    
    it('should load products', () => {
        // ❌ This test will attempt to call http://localhost/api/products
        // Will fail with CORS errors or connection refused in CI
        service.getProducts().subscribe(products => {
            expect(products.length).toBeGreaterThan(0);  // unreliable
        });
    });
});
```

```typescript
// ❌ WRONG 3: Not verifying no outstanding HTTP requests

describe('ProductService with HttpTesting', () => {
    
    afterEach(() => {
        // ❌ Missing httpTestingController.verify()
        // If a component makes an unexpected extra HTTP call (regression),
        // the test will NOT catch it — the extra request silently hangs
    });
});
```

### Right Way — Angular Testing Done Correctly

```typescript
// ✅ RIGHT — Complete component test with TestBed, fixture, spies

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ProductCardComponent } from './product-card.component';
import { CartService } from '../services/cart.service';
import { RouterTestingModule } from '@angular/router/testing';

describe('ProductCardComponent', () => {
    let component: ProductCardComponent;
    let fixture: ComponentFixture<ProductCardComponent>;
    let cartServiceSpy: jasmine.SpyObj<CartService>;
    
    const mockProduct = {
        id: 1,
        name: 'Laptop Pro',
        price: 999.99,
        imageUrl: '/images/laptop.jpg',
        inStock: true
    };
    
    beforeEach(async () => {
        // ✅ Create a spy object for CartService — all methods become spies
        cartServiceSpy = jasmine.createSpyObj<CartService>('CartService', [
            'addToCart',
            'getCartCount'
        ]);
        // Configure default return values
        cartServiceSpy.addToCart.and.returnValue(void 0);
        cartServiceSpy.getCartCount.and.returnValue(0);
        
        await TestBed.configureTestingModule({
            declarations: [ProductCardComponent],
            imports: [RouterTestingModule],       // for routerLink directives
            providers: [
                // ✅ Use the spy instead of the real CartService
                { provide: CartService, useValue: cartServiceSpy }
            ]
        }).compileComponents();  // ← compile templates and styles
        
        fixture = TestBed.createComponent(ProductCardComponent);
        component = fixture.componentInstance;
        
        // ✅ Set @Input() BEFORE the first detectChanges()
        component.product = mockProduct;
        
        fixture.detectChanges();  // ← triggers ngOnInit + first template render
    });
    
    it('should display product name and price', () => {
        const nameEl = fixture.debugElement.query(By.css('[data-testid="product-name"]'));
        const priceEl = fixture.debugElement.query(By.css('[data-testid="product-price"]'));
        
        expect(nameEl.nativeElement.textContent).toContain('Laptop Pro');
        expect(priceEl.nativeElement.textContent).toContain('999.99');
    });
    
    it('should show "Add to Cart" button when product is in stock', () => {
        const button = fixture.debugElement.query(By.css('button[type="button"]'));
        expect(button).toBeTruthy();
        expect(button.nativeElement.disabled).toBeFalsy();
        expect(button.nativeElement.textContent).toContain('Add to Cart');
    });
    
    it('should show "Out of Stock" and disable button when product is out of stock', () => {
        component.product = { ...mockProduct, inStock: false };
        
        // ✅ detectChanges() after changing component state — forces template re-render
        fixture.detectChanges();
        
        const button = fixture.debugElement.query(By.css('button[type="button"]'));
        expect(button.nativeElement.disabled).toBeTrue();
        expect(button.nativeElement.textContent).toContain('Out of Stock');
    });
    
    it('should call CartService.addToCart when button is clicked', () => {
        const button = fixture.debugElement.query(By.css('button[type="button"]'));
        
        // ✅ Trigger a click on the native DOM element
        button.nativeElement.click();
        
        // ✅ Verify the spy was called with the right argument
        expect(cartServiceSpy.addToCart).toHaveBeenCalledOnceWith(mockProduct);
    });
    
    it('should update displayed cart count after adding', fakeAsync(() => {
        // ✅ fakeAsync for testing async operations synchronously
        cartServiceSpy.getCartCount.and.returnValue(1);  // now returns 1
        
        const button = fixture.debugElement.query(By.css('button[type="button"]'));
        button.nativeElement.click();
        
        // Simulate async state update (e.g., BehaviorSubject emission)
        tick();                    // advance microtask queue
        fixture.detectChanges();   // re-render with new state
        
        const badge = fixture.debugElement.query(By.css('.cart-badge'));
        expect(badge.nativeElement.textContent).toContain('1');
    }));
});
```

```typescript
// ✅ RIGHT — Service test with HttpClientTestingModule

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductService } from './product.service';
import { Product } from '../models/product.model';

describe('ProductService — HTTP tests', () => {
    let service: ProductService;
    let httpController: HttpTestingController;
    
    beforeEach(() => {
        TestBed.configureTestingModule({
            // ✅ HttpClientTestingModule intercepts all HTTP calls
            imports: [HttpClientTestingModule],
            providers: [ProductService]
        });
        
        service = TestBed.inject(ProductService);
        httpController = TestBed.inject(HttpTestingController);
    });
    
    afterEach(() => {
        // ✅ Verify no unmatched (unexpected) requests remain
        httpController.verify();
    });
    
    it('getProducts() should return product list', () => {
        const mockProducts: Product[] = [
            { id: 1, name: 'Laptop', price: 999, category: 'electronics' },
            { id: 2, name: 'Mouse', price: 29, category: 'electronics' }
        ];
        
        let actualProducts: Product[] | undefined;
        
        service.getProducts('electronics').subscribe(products => {
            actualProducts = products;
        });
        
        // ✅ Intercept the HTTP request and assert its properties
        const req = httpController.expectOne('/api/products?category=electronics');
        expect(req.request.method).toBe('GET');
        
        // ✅ Flush the mock response — triggers the subscribe callback above
        req.flush(mockProducts);
        
        expect(actualProducts).toEqual(mockProducts);
        expect(actualProducts?.length).toBe(2);
    });
    
    it('getProducts() should throw when API returns 500', () => {
        let errorMessage = '';
        
        service.getProducts('electronics').subscribe({
            error: (err) => { errorMessage = err.message; }
        });
        
        const req = httpController.expectOne('/api/products?category=electronics');
        
        // ✅ Flush an error response
        req.flush('Internal Server Error', {
            status: 500,
            statusText: 'Server Error'
        });
        
        expect(errorMessage).toContain('500');
    });
    
    it('addProduct() should POST with correct body and headers', () => {
        const newProduct = { name: 'Keyboard', price: 79, category: 'electronics' };
        
        service.addProduct(newProduct).subscribe();
        
        const req = httpController.expectOne('/api/products');
        
        // ✅ Assert request method, body, and headers
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(newProduct);
        expect(req.request.headers.get('Content-Type')).toBe('application/json');
        
        req.flush({ id: 10, ...newProduct });
    });
});
```

```typescript
// ✅ RIGHT — fakeAsync and tick for Observable/Promise timing

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SearchComponent } from './search.component';
import { SearchService } from '../services/search.service';
import { debounceTime, Subject } from 'rxjs';

describe('SearchComponent — debounced search', () => {
    let component: SearchComponent;
    let fixture: ComponentFixture<SearchComponent>;
    let searchSpy: jasmine.SpyObj<SearchService>;
    
    beforeEach(async () => {
        searchSpy = jasmine.createSpyObj<SearchService>('SearchService', ['search']);
        searchSpy.search.and.returnValue(of([]));  // empty results by default
        
        await TestBed.configureTestingModule({
            declarations: [SearchComponent],
            providers: [{ provide: SearchService, useValue: searchSpy }]
        }).compileComponents();
        
        fixture = TestBed.createComponent(SearchComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    
    it('should debounce search calls by 300ms', fakeAsync(() => {
        const input = fixture.debugElement.query(By.css('input[type="search"]'));
        
        // Simulate rapid typing
        input.nativeElement.value = 'l';
        input.nativeElement.dispatchEvent(new Event('input'));
        tick(100);   // 100ms passed — debounce not fired yet
        
        input.nativeElement.value = 'la';
        input.nativeElement.dispatchEvent(new Event('input'));
        tick(100);   // 200ms total — debounce not fired yet
        
        input.nativeElement.value = 'lap';
        input.nativeElement.dispatchEvent(new Event('input'));
        
        // ✅ Search should NOT have been called — still within debounce window
        expect(searchSpy.search).not.toHaveBeenCalled();
        
        tick(300);   // 300ms since last input — debounce fires
        fixture.detectChanges();
        
        // ✅ Now search should be called with the FINAL value
        expect(searchSpy.search).toHaveBeenCalledOnceWith('lap');
    }));
    
    it('should show "no results" message when search returns empty', fakeAsync(() => {
        searchSpy.search.and.returnValue(of([]));
        
        component.searchQuery = 'xyznotexist';
        component.onSearchChange();
        tick(300);
        fixture.detectChanges();
        
        const noResults = fixture.debugElement.query(By.css('[data-testid="no-results"]'));
        expect(noResults).toBeTruthy();
        expect(noResults.nativeElement.textContent).toContain('No results found');
    }));
});
```

```typescript
// ✅ RIGHT — async/waitForAsync for Promise-based async tests

import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { MetricsService } from '../services/metrics.service';

describe('DashboardComponent — async data loading', () => {
    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;
    let metricsServiceSpy: jasmine.SpyObj<MetricsService>;
    
    beforeEach(waitForAsync(() => {
        // ✅ waitForAsync wraps the beforeEach body if it contains async operations
        metricsServiceSpy = jasmine.createSpyObj('MetricsService', ['getMetrics']);
        metricsServiceSpy.getMetrics.and.returnValue(Promise.resolve({
            totalOrders: 1240,
            activeUsers: 340,
            revenue: 49500
        }));
        
        TestBed.configureTestingModule({
            declarations: [DashboardComponent],
            providers: [{ provide: MetricsService, useValue: metricsServiceSpy }]
        }).compileComponents();  // ← compileComponents() is async (fetches external templates)
    }));
    
    beforeEach(() => {
        fixture = TestBed.createComponent(DashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    
    it('should display loaded metrics', waitForAsync(() => {
        fixture.whenStable().then(() => {
            // ✅ whenStable() resolves after all async operations complete
            fixture.detectChanges();
            
            const ordersEl = fixture.debugElement.query(By.css('[data-testid="total-orders"]'));
            expect(ordersEl.nativeElement.textContent).toContain('1,240');
        });
    }));
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why do Angular tests need TestBed? Why can't I just `new MyComponent()`?"

**Hruday's answer:**
> Angular components aren't plain JavaScript classes — they depend on Angular's runtime for several critical features that don't exist outside of it.
>
> Change detection: when a component's property changes, Angular needs to run its change detection algorithm to update the template bindings. Without the Angular runtime, you'd change `component.title = 'New'` and nothing in the DOM would update.
>
> Dependency injection: Angular components typically inject services in the constructor: `constructor(private cartService: CartService)`. Angular's DI container resolves this — `new ProductCardComponent()` would fail because there's no CartService being passed.
>
> Template compilation: the template (HTML + Angular directives) needs to be compiled into a component view by Angular's compiler. Without this, `@Input()`, `*ngFor`, `*ngIf`, `(click)`, and `{{ interpolation }}` are inert strings.
>
> TestBed bootstraps a minimal Angular environment that provides all of this. You configure it with just the declarations and dependencies your component needs (rather than the full app module), making tests faster than running the whole application module, but still running with the complete Angular runtime.

---

### Q2 — Deep Dive
**Interviewer asks:** "What's the difference between fakeAsync with tick() and waitForAsync with whenStable()?"

**Hruday's answer:**
> They both handle async, but with fundamentally different control styles.
>
> `fakeAsync` with `tick()` gives you synchronous control of async code. It installs fake versions of `setTimeout`, `setInterval`, `Promise microtasks`, and `rxjs schedulers`. When you call `tick(300)`, all timers that would fire within 300ms are flushed synchronously, right there, before the next line. Debounce tests, interval polling, delayed HTTP retries — all are deterministic with `fakeAsync`. The test reads linearly top to bottom. The limitation: anything using real async browser APIs (WebSocket, IndexedDB) that can't be faked by Zone.js won't work inside `fakeAsync`.
>
> `waitForAsync` with `fixture.whenStable()` runs the real async machinery and waits for the Angular zone to become "stable" — meaning all pending microtasks and macrotasks are resolved. It's a real async test, not a fake one. You use it primarily for tests that call `compileComponents()` (which does real XHR in older Angular setups) or that work with browser APIs that can't be faked. The test returns a Promise, so you `await fixture.whenStable()` or use `.then()`. The limitation: no time control — you wait for real resolution, so tests can be slower and less predictable.
>
> My general rule: `fakeAsync` + `tick()` for almost everything (Observable timing, debounce, HTTP mock flushes). `waitForAsync` only when I have genuinely async browser behaviour that `fakeAsync` can't simulate.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Angular uses Karma by default. Many teams switch to Jest. When does it make sense?"

**Hruday's answer:**
> Karma launches a real browser (Chrome, Firefox) and runs tests inside it. This is authentic: browser APIs, CSS, DOM behaviour all work exactly as production. The drawback: browser launch adds 2-10 seconds of overhead per test run, it's harder to run in headless CI with Docker, and debugging requires browser developer tools.
>
> Jest runs in Node.js with jsdom (a simulated DOM). It's much faster to start (no browser launch), runs naturally in any Node environment including CI containers, has better tooling for TypeScript (faster source map support), superior mock APIs, and the watch mode is more responsive. The limitation: jsdom is not a full browser — some browser-specific APIs don't work (WebGL, Service Workers, complex CSS layout, real focus behaviour) and occasional test divergence from real browsers.
>
> My decision model: if the team is already using Jest for React or Node.js services, switching Angular to Jest brings consistency — same assertions, mocking API, config, and CI setup across the whole codebase. The speed difference is meaningful at scale: 30+ second Karma runs vs sub-10-second Jest runs.
>
> I'd keep Karma for projects that heavily test browser-specific behaviour (complex CSS animations, browser-native APIs, accessibility with real focus), where the authenticity of running in a real browser is more important than speed.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You have an Angular component that receives data from a BehaviorSubject in a shared service. How do you test state updates?"

**Hruday's answer:**
> I spy on the service and make the spy's observable property return a `BehaviorSubject` or `Subject` that I control in the test.
>
> For example: a `NotificationService` that exposes a `notifications$: BehaviorSubject<Notification[]>`. In the test, I create `const notifications$ = new BehaviorSubject<Notification[]>([])` and configure the spy: `notificationServiceSpy.notifications$ = notifications$.asObservable()`.
>
> In the test body, to simulate a new notification arriving, I call `notifications$.next([{ id: 1, message: 'Order shipped', type: 'info' }])` and then `fixture.detectChanges()`. Angular's change detection picks up the new observable emission, the template updates, and I assert on the rendered output.
>
> The key insight: I don't test that the BehaviorSubject emitted — I test that the COMPONENT responded correctly. The test proves: "when the notifications stream emits a new value, the notification badge count updates to 1".
>
> I wrap the emission in `fakeAsync` if the component uses `async` pipe with a debounce or if there's any scheduled work. For a straightforward `async` pipe subscription, plain `tick()` (or no tick, just `fixture.detectChanges()`) is sufficient.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "I call detectChanges() once at the end" | "I put fixture.detectChanges() at the end of the test after all assertions" | detectChanges() must be called BEFORE reading the DOM and again AFTER any state change that should update the template; Angular does NOT auto-detect changes in tests (unlike the running app which runs change detection on async events like clicks and HTTP responses); the pattern is: `component.product = mockProduct; fixture.detectChanges(); expect(nativeElement.textContent).toContain('Laptop')` — the detectChanges() in the middle pushes the state into the DOM; calling it at the end is too late for the assertions above it |
| "httpController.verify() is optional" | "I don't bother with verify() since my tests pass" | verify() is what catches EXTRA unexpected HTTP calls that your component shouldn't make; a bug that causes a component to make a duplicate API call, or a wrong API call with wrong parameters, will PASS without verify() because the test only checks the expected requests; with verify(), any outstanding unmatched request after the test throws an error — this is exactly the category of regression you want to catch; always call `httpController.verify()` in `afterEach` |
| "TestBed.configureTestingModule is always needed" | "I set up a full TestBed for every test including pure pipe and service tests" | TestBed is needed for components (which need Angular DI + template compilation) but pure pipes, standalone utility services, and pure TypeScript classes can be tested WITHOUT TestBed by just using `new PipeName()` or `new ServiceClass(dependencies)`; a `CurrencyPipe` test: `const pipe = new CurrencyPipe('en-IN'); expect(pipe.transform(999, 'INR')).toBe('₹999.00')` — no TestBed needed; using TestBed for these adds 50-200ms test setup overhead for no benefit; reserve TestBed for components and Angular-specific features |

---

## 7. Hruday's Real Experience Hook
> "At Bosch, the Angular frontend had ~300 Karma tests that took 4 minutes to run. The team had stopped running tests locally — only CI ran them. The 4-minute wait meant devs would push code, wait for CI, see a failure, push a fix, wait again. A PR typically took 3-4 CI cycles.
>
> We profiled the Karma run and found two problems: (1) every service test was using TestBed even for pure business logic services, adding ~250ms per test, (2) `fakeAsync` was being used without `discardPeriodicTasks()` when components had `setInterval` — these leaked timers caused timeouts. 
>
> Switching pure service tests to plain `new Service()` and fixing the `discardPeriodicTasks()` calls cut the run to 90 seconds. Devs began running tests locally again, and the feedback cycle dropped from 3 cycles to 1."

---

## 8. Scale Evolution

**1,000 users →** Single Karma config, Jasmine for all tests, TestBed for components, plain `new` for services; ~100 tests under 60 seconds.

**100,000 users →** Jest replaces Karma for speed; `jest-preset-angular` handles the transformation; `ng-mocks` library for simpler mock setup (auto-mocking entire modules with `MockModule()`); test run under 30 seconds with parallelism.

**10 million users →** Component testing with Storybook interaction tests (visual regression + functional); Cypress component testing mode for complex Angular components requiring real browser APIs; shared test utilities library across micro-frontends; test sharding in CI.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Angular payment UI components; testing form validation for card number, UPI ID, amount fields; HttpClientTestingModule for payment API service tests | fakeAsync for OTP timer countdown; spy on PaymentService; HttpTestingController.expectOne() |
| Swiggy / Meesho | Angular admin dashboards; testing data table components with sorting/filtering backed by services; Observable-based state | BehaviorSubject in tests; fakeAsync for debounced search; jasmine.createSpyObj for service mocking |
| Adobe / Microsoft | Enterprise Angular apps; routing tests with RouterTestingModule; lazy-loaded module testing; large test suites — Jest migration opportunity | RouterTestingModule; TestBed in isolation for component testing; Jest vs Karma decision framework |
| SAP Labs | Bosch story: 4-min Karma run fixed by removing unnecessary TestBed from service tests; discardPeriodicTasks for setInterval leaks; direct impact on developer productivity and CI cycle time | Specific numbers (4min → 90sec); TestBed cost knowledge; timer leak diagnosis |

---

## 10. Related Topics — What to Study Next

- **Topic 253 — Jest Setup, Mocking, and Spying** — many teams migrate from Karma to Jest for Angular; understanding Jest's `jest.fn()` vs Jasmine's `jasmine.createSpy()` is essential for that migration; the concepts are equivalent but the APIs differ in important ways (`jest.spyOn` restores in `afterEach` automatically only with `restoreAllMocks`, while Jasmine spies restore automatically)
- **Topic 254 — React Testing Library** — Angular testing uses `debugElement.query(By.css())` where RTL uses `screen.getByRole()`; the philosophical contrast (CSS-based vs accessibility-based querying) is a good interview talking point showing framework breadth
- **Topic 256 — Cypress E2E Testing** — Karma/Jest tests cover unit and integration; Cypress handles full E2E including Angular routing, lazy-loaded modules, and real browser behaviour; the testing pyramid means most tests stay in Jasmine/Jest but Cypress covers critical user flows
- **Topic 258 — Spring Boot Unit Testing** — when Angular services call Spring Boot APIs, understanding both sides of the test boundary helps design better integration test strategies; TestBed + HttpClientTestingModule on the Angular side pairs with `@WebMvcTest` + MockMvc on the Spring side

---

*Part 15 · Jasmine and Karma Angular Testing Patterns · Full Stack Interview Guide · Hruday D · 2026*
