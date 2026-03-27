# Cypress — E2E Testing for Modern Web Apps
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Cypress architecture**: runs INSIDE the browser — not WebDriver; Cypress code executes in the same rendering loop as the application; this gives it direct access to the DOM, network layer, and JavaScript context; no WebDriver protocol latency between assertion and DOM query
- **Automatic waiting**: every Cypress command automatically retries until the assertion passes or times out (default 4s for assertions, 60s for page loads); you almost never need `cy.wait(2000)` — if you're adding explicit waits, it's a signal your selector strategy is wrong
- **cy.intercept()** intercepts network requests at the browser network layer; `cy.intercept('GET', '/api/products', { fixture: 'products.json' }).as('getProducts')` then `cy.wait('@getProducts')` waits for that specific request before asserting; far better than arbitrary time waits
- **Cypress component testing** (since v10): runs components in isolation inside Cypress's browser without a full application; fills the gap between RTL (jsdom) and full E2E; real browser, no app/server needed
- **Custom commands**: `Cypress.Commands.add('login', (email, password) => {...})` builds reusable test helpers; defined in `cypress/support/commands.ts`; reduces boilerplate across tests
- **Flakiness causes**: using `cy.wait(number)` instead of `cy.wait('@alias')`, testing animated elements before animation completes, non-deterministic data (auto-increment IDs), failing to seed database state before each test

---

## 1. One-Line Definition
Cypress is a modern E2E testing framework that runs tests directly inside the browser, provides real-time visual feedback, automatic waiting, and network interception, making reliable full-application tests far easier to write than traditional WebDriver-based tools.

---

## 2. The Problem It Solves

Traditional E2E tools (Selenium, WebDriver) work through a protocol bridge: test code → WebDriver protocol → browser. This introduces latency, requires complex driver setup, and makes network-level interception difficult. Tests become brittle (element not found before animation completes), slow (seconds per interaction), and hard to debug (no visual feedback, server-side errors not visible).

Cypress eliminates the protocol bridge. Tests run inside the browser alongside the app, seeing the same rendering pipeline. Waiting for elements to appear becomes automatic. Network calls can be intercepted, mocked, or stubbed. Visual time-travel debugging replays every command step.

---

## 3. How It Works Internally

### Cypress Command Queue

```
Cypress commands are ASYNCHRONOUS and QUEUED — not immediately executed

cy.visit('/checkout')
cy.get('[data-cy="cart-total"]').should('contain', '₹999')

Actually executes as:
  1. Queue: visit('/checkout')
  2. Queue: get('[data-cy="cart-total"]')
  3. Queue: assertion on get result

Queue is then FLUSHED:
  → visit('/checkout') [executes, Cypress waits for page load]
  → get('[data-cy="cart-total"]')
       ↓ retries every ~50ms until element exists or timeout
  → .should('contain', '₹999')
       ↓ retries every ~50ms until element contains '₹999' or timeout
  → If timeout: takes a screenshot, outputs DOM state, fails the test
```

### cy.intercept() — Request Interception

```
cy.intercept(method, url/pattern, response?)
  ↓
  Registers a Route Handler in Cypress's network layer
  All matching requests from the browser are intercepted BEFORE they hit the server
  
  With .fixture():  returns the JSON file from cypress/fixtures/
  With .reply():    custom dynamic response
  With .as():       names the route for cy.wait('@name') usage
  
cy.wait('@aliasName')
  ↓
  Holds test execution until that specific network request completes
  Avoids timing issues vs cy.wait(1000) which is arbitrary
```

---

## 4. The Code

### Wrong Way — Common Cypress Anti-Patterns

```typescript
// ❌ WRONG 1: Arbitrary waits instead of waiting for network or elements

describe('Product checkout', () => {
    it('should complete checkout', () => {
        cy.visit('/checkout');
        
        // ❌ Waiting a fixed 2 seconds — unreliable in different environments
        // Fast environments: wastes 2000ms. Slow environments: still might fail.
        cy.wait(2000);
        
        cy.get('.cart-total').should('contain', '₹999');
        
        cy.get('.place-order-btn').click();
        
        // ❌ Waiting 3 seconds for the order confirmation
        cy.wait(3000);
        
        cy.get('.order-confirmation').should('be.visible');
    });
});
```

```typescript
// ❌ WRONG 2: Using CSS classes and implementation-specific selectors

it('add to cart button exists', () => {
    cy.visit('/products/1');
    
    // ❌ Selecting by CSS class — breaks when designer renames class
    cy.get('.btn-primary.add-cart-action').click();
    
    // ❌ Selecting by position/index — breaks when new products are added
    cy.get('.product-grid > div:nth-child(2) > button').click();
    
    // ❌ Selecting by element type + text — breaks on copy changes
    cy.get('button').contains('ADD TO CART').click();
});
```

```typescript
// ❌ WRONG 3: Testing behaviour that belongs to unit/integration tests

it('validates that ProductService.calculateDiscount() works', () => {
    // ❌ E2E test testing pure business logic that belongs in a unit test
    // Loading a browser, bootstrapping the full app, making API calls — 
    // just to verify a discount calculation function
    cy.visit('/products');
    cy.get('[data-cy="product-price"]').should('contain', '₹799');  // 20% off ₹999
    // This test is 50x slower than the unit test for the same coverage
});
```

### Right Way — Cypress Best Practices

```typescript
// cypress/support/commands.ts
// ✅ RIGHT — Custom commands for common operations

declare global {
    namespace Cypress {
        interface Chainable {
            login(email: string, password: string): Chainable<void>;
            addProductToCart(productId: number): Chainable<void>;
            seedDatabase(fixture: string): Chainable<void>;
        }
    }
}

// ✅ Login via API (not UI) — much faster, more reliable
Cypress.Commands.add('login', (email: string, password: string) => {
    cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: { email, password }
    }).then(response => {
        window.localStorage.setItem('authToken', response.body.token);
        window.localStorage.setItem('user', JSON.stringify(response.body.user));
    });
});

// ✅ API-based cart seeding instead of clicking "Add to Cart" in setup
Cypress.Commands.add('addProductToCart', (productId: number) => {
    cy.request({
        method: 'POST',
        url: '/api/cart/items',
        body: { productId, quantity: 1 },
        headers: {
            Authorization: `Bearer ${window.localStorage.getItem('authToken')}`
        }
    });
});
```

```typescript
// cypress/e2e/checkout.cy.ts
// ✅ RIGHT — Full E2E test with intercept, custom commands, and data-cy selectors

describe('Checkout Flow — registered user', () => {
    
    beforeEach(() => {
        // ✅ Seed via API (not UI clicks) — fast and deterministic
        cy.login('hruday@example.com', 'TestPass123!');
        cy.addProductToCart(101);  // Laptop Pro
        cy.addProductToCart(205);  // Wireless Mouse
    });
    
    it('should show correct cart total and place order successfully', () => {
        // ✅ Intercept orders API BEFORE visiting the page
        cy.intercept('POST', '/api/orders', {
            statusCode: 201,
            body: {
                orderId: 'ORD-2024-9901',
                total: 1028.99,
                status: 'CONFIRMED'
            }
        }).as('createOrder');
        
        cy.intercept('GET', '/api/cart', { fixture: 'cart-with-2-items.json' })
          .as('getCart');
        
        cy.visit('/cart');
        cy.wait('@getCart');  // ✅ Wait for cart to load before asserting
        
        // ✅ data-cy selectors — stable, explicit, independent of CSS/text
        cy.get('[data-cy="cart-total"]').should('contain', '₹1,028.99');
        cy.get('[data-cy="cart-item-count"]').should('contain', '2 items');
        
        // Navigate to checkout
        cy.get('[data-cy="checkout-btn"]').click();
        
        // Fill shipping form
        cy.get('[data-cy="shipping-name"]').type('Hruday D');
        cy.get('[data-cy="shipping-address"]').type('123 MG Road, Bangalore');
        cy.get('[data-cy="shipping-pincode"]').type('560001');
        
        cy.get('[data-cy="continue-to-payment"]').click();
        
        // Payment form
        cy.get('[data-cy="card-number"]').type('4111111111111111');
        cy.get('[data-cy="card-expiry"]').type('1226');
        cy.get('[data-cy="card-cvv"]').type('123');
        
        cy.get('[data-cy="place-order-btn"]').click();
        
        // ✅ Wait for the specific POST request, then assert the response was handled
        cy.wait('@createOrder').its('request.body').should('deep.include', {
            shippingAddress: {
                name: 'Hruday D',
                pincode: '560001'
            }
        });
        
        // Assert confirmation page
        cy.get('[data-cy="order-confirmation"]').should('be.visible');
        cy.get('[data-cy="order-id"]').should('contain', 'ORD-2024-9901');
        cy.url().should('include', '/order-confirmation');
    });
    
    it('should show error message when payment fails', () => {
        cy.intercept('POST', '/api/orders', {
            statusCode: 402,
            body: { error: 'PAYMENT_DECLINED', message: 'Card was declined' }
        }).as('failedOrder');
        
        cy.visit('/cart');
        cy.get('[data-cy="checkout-btn"]').click();
        
        // Fill minimum required fields
        cy.get('[data-cy="shipping-name"]').type('Hruday D');
        cy.get('[data-cy="shipping-address"]').type('123 MG Road');
        cy.get('[data-cy="shipping-pincode"]').type('560001');
        cy.get('[data-cy="continue-to-payment"]').click();
        
        cy.get('[data-cy="card-number"]').type('4000000000000002');  // Decline test card
        cy.get('[data-cy="card-expiry"]').type('1226');
        cy.get('[data-cy="card-cvv"]').type('123');
        cy.get('[data-cy="place-order-btn"]').click();
        
        cy.wait('@failedOrder');
        
        // ✅ Assert the error state — user must see a clear error, not a spinner forever
        cy.get('[data-cy="payment-error"]')
            .should('be.visible')
            .and('contain', 'Card was declined');
        
        // ✅ User should still be on checkout (not navigated away)
        cy.url().should('include', '/checkout');
    });
});
```

```typescript
// cypress/e2e/search.cy.ts
// ✅ RIGHT — Testing search with intercept and aliased requests

describe('Product Search', () => {
    
    it('should search and display filtered results', () => {
        cy.intercept('GET', '/api/products?q=laptop*', {
            fixture: 'search-results-laptop.json'
        }).as('searchLaptops');
        
        cy.visit('/products');
        
        // ✅ Find search input by accessible role
        cy.findByRole('searchbox').type('laptop');
        
        // ✅ Wait for the debounced search request
        cy.wait('@searchLaptops');
        
        // Assert results
        cy.get('[data-cy="product-card"]').should('have.length', 3);
        cy.get('[data-cy="product-card"]').first()
            .find('[data-cy="product-name"]')
            .should('contain', 'Laptop Pro');
    });
    
    it('should show "no results" when search returns empty', () => {
        cy.intercept('GET', '/api/products?q=*', {
            body: { products: [], total: 0 }
        }).as('emptySearch');
        
        cy.visit('/products');
        cy.findByRole('searchbox').type('xyznotexist');
        cy.wait('@emptySearch');
        
        cy.get('[data-cy="no-results"]')
            .should('be.visible')
            .and('contain', 'No products found');
        
        cy.get('[data-cy="product-card"]').should('not.exist');
    });
});
```

```typescript
// cypress.config.ts
// ✅ RIGHT — Cypress configuration

import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:4200',  // Angular dev server
        
        setupNodeEvents(on, config) {
            // Register tasks (Node.js code runnable from tests)
            on('task', {
                // Database reset task called in beforeEach
                resetDatabase() {
                    // Call your test DB reset script
                    return null;
                },
                log(message: string) {
                    console.log(message);
                    return null;
                }
            });
        },
        
        // ✅ Sensible timeouts
        defaultCommandTimeout: 8000,   // element must appear within 8s
        requestTimeout: 10000,          // API requests must complete within 10s
        pageLoadTimeout: 30000,         // page must load within 30s
        
        viewportWidth: 1280,
        viewportHeight: 800,
        
        // ✅ Retry flaky tests once before marking as failed
        retries: {
            runMode: 1,    // 1 retry in CI
            openMode: 0    // No retry in interactive mode (want immediate feedback)
        },
        
        specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
        supportFile: 'cypress/support/e2e.ts',
    },
    
    component: {
        devServer: {
            framework: 'react',  // or 'angular'
            bundler: 'vite',
        },
    },
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why is Cypress faster and more reliable than Selenium?"

**Hruday's answer:**
> Selenium works through the WebDriver protocol: your test code sends HTTP commands to a driver, which translates them to browser automation instructions. Every action — find element, click, type, assert — goes through this protocol bridge. This means multiple network round trips for even simple interactions, and the element lookup happens at test code execution time with no automatic retry.
>
> Cypress runs inside the browser in the same JavaScript process as the application. When `cy.get('[data-cy="submit"]').click()` runs, Cypress is querying the DOM directly without any protocol round trip. The automatic retry happens at near-zero latency — it re-queries the DOM every 50ms using the same mechanisms the browser uses internally.
>
> For reliability: Cypress automatically waits for elements to exist, be visible, be enabled, and stop animating before clicking. Selenium requires explicit waits or your test clicks an element that's mid-animation and fails. For speed: no protocol round trips plus parallelism (Cypress Cloud runs tests across multiple machines) makes typical test suites 3-5x faster than equivalent Selenium setups.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does cy.intercept() work, and when would you NOT intercept?"

**Hruday's answer:**
> `cy.intercept()` registers a route handler with Cypress's network proxy. The browser routes all HTTP requests through this proxy, and any request matching the pattern is handled according to the route configuration — you can stub the response, spy on the request/response, or let it pass through to the real server.
>
> The powerful pattern: `.as('name')` + `cy.wait('@name')`. Instead of `cy.wait(3000)` waiting arbitrarily for data to load, you wait for the specific request you know will happen. This makes tests deterministic regardless of network speed.
>
> When I would NOT intercept:
>
> First, in integration tests where the real API should be running — for example, testing that the checkout flow works end-to-end with a real test database. These tests usually run in a dedicated environment. Here, intercept would give false confidence by replacing the real server.
>
> Second, for testing error states from real backend validation — if I want to confirm that a backend 422 validation error is displayed correctly, I should make the real invalid request rather than mock a 422 response. The mock confirms UI rendering; the real request confirms end-to-end validation is wired correctly.
>
> My rule: intercept in developer-environment tests where you want fast, isolated, deterministic runs. Use real APIs in the dedicated test environment for broader integration confidence.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Cypress vs Playwright — how do you choose?"

**Hruday's answer:**
> Both have matured significantly and either works well. My decision points:
>
> Playwright is better for multi-browser testing — it runs on Chrome, Firefox, Safari, and Edge natively, including mobile browser emulation. If cross-browser compatibility is a hard requirement (as it is for public web apps), Playwright is the clear choice. Playwright's API is also more naturally async/await, which integrates cleanly with TypeScript patterns most developers already use.
>
> Cypress is better for developer experience and the React/Angular component testing use case. The Cypress Test Runner's live reload, time-travel debugging (re-run any command from a visual timeline), and error messages with screenshots are hard to beat for debugging. The component testing mode (running components in Cypress without a full app) adds a layer between unit tests and E2E that Playwright doesn't match as well.
>
> At SAP, we used Cypress for the Angular frontend because the visual debugger made it much easier to onboard junior developers to E2E testing. At Bosch, Playwright was chosen because the product needed to support IE11 and Edge compatibility testing.
>
> If starting fresh today for a React/Angular SPA with no cross-browser requirement: Cypress. For a multi-browser, multi-platform requirement: Playwright.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Your Cypress tests are flaky in CI. How do you diagnose and fix this?"

**Hruday's answer:**
> Flaky Cypress tests in CI fall into four categories.
>
> Timing: the most common cause. The test is asserting on something before it exists. Diagnosis: the test fails with "element not found" or "expected value X, got Y" intermittently. Fix: ensure you're using `cy.wait('@alias')` after intercepted requests, not `cy.wait(number)`. Add `.should('be.visible')` before interacting with animated elements.
>
> Test data collisions: multiple CI workers run tests in parallel and share a database, so test data from one test pollutes another. Diagnosis: tests pass in isolation but fail when run in parallel. Fix: seed and tear down test data per-test using `beforeEach` database reset scripts or isolated test user accounts.
>
> Environment differences: CI runner is slower; animations don't complete in the allocated time (4s default). Diagnosis: test reliably fails in CI but passes locally. Fix: increase `defaultCommandTimeout` in CI, or use `Cypress.config('animationDistanceThreshold')` to make Cypress less sensitive to animation.
>
> Non-deterministic selectors: product IDs are auto-increment in the database so `[data-cy="product-123"]` breaks when the database is reset. Fix: use relative selectors — `[data-cy="product-card"]:first-child` — or seed specific fixed IDs in your test fixtures.
>
> My CI setup also uses `retries: { runMode: 1 }` — one retry before marking a test as failed, to catch genuine transient failures that aren't real bugs.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "cy.wait(2000) is fine as a precaution" | "I add a 2-second wait just to be safe after page loads" | Every `cy.wait(number)` is a test smell — it means you don't know exactly WHAT you're waiting for; tests with hardcoded waits are slow (2s is added unconditionally even when the page loads in 200ms) and still flaky (fail when the network is slower than 2s); the correct pattern is always `cy.wait('@interceptAlias')` for API calls or `cy.get('[data-cy="el"]').should('be.visible')` for DOM elements — Cypress retries these automatically; eliminating all `cy.wait(number)` calls from a test suite typically reduces test time by 30-50% and meaningfully reduces flakiness |
| "data-testid is bad, I use CSS classes" | "I query by CSS class for stability" | CSS classes are styling concerns — they change when designs change; `data-cy`, `data-testid`, or `aria-*` attributes are explicit test contracts that communicate intent: "this element exists for testing purposes"; CSS class changes don't break tests with `data-cy`; the Cypress best practice recommendation is `data-cy` (Cypress-specific) but `data-testid` works equally well; never select by CSS class names like `.btn-primary` or `.checkout-form-total` in E2E tests |
| "Cypress tests replace unit tests" | "With Cypress I don't need unit tests — it tests everything" | E2E tests execute 10-100x slower than unit tests; a 50-step checkout flow E2E test covers one user path; a unit test for the discount calculation covers 20 different input combinations in milliseconds; trying to cover all business logic with E2E tests results in test suites that take 30+ minutes and fail on unrelated infrastructure issues; keep the test pyramid: many fast unit tests at the base, moderate integration tests in the middle, few focused E2E tests at the top covering critical user journeys |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we had a checkout E2E test that intermittently failed in CI about 20% of the time. The test placed an order and asserted on the order confirmation page. The team had added `cy.wait(5000)` after the 'Place Order' click, assuming it gave enough time. In CI with load, 5 seconds wasn't enough.
>
> I converted the test to use `cy.intercept('POST', '/api/orders').as('createOrder')` before the page visit, then `cy.wait('@createOrder')` after the click. The test now waits for the ACTUAL order creation request to complete — not an arbitrary guess at how long it might take.
>
> The flakiness dropped to 0% immediately, AND the test ran 3-4 seconds faster because `cy.wait('@createOrder')` typically resolved in 800ms rather than waiting the full 5 seconds. The second change was adding `{ retries: { runMode: 1 } }` in `cypress.config.ts` — one retry for any remaining occasional flakiness from CI resource contention."

---

## 8. Scale Evolution

**1,000 users →** Cypress for critical checkout, login, and registration flows; Mock Service Worker (MSW) integrated with Cypress for API stubs; tests run in GitHub Actions on a single machine; ~20 E2E tests completing in 4 minutes.

**100,000 users →** Cypress Cloud parallelism — tests distributed across 4-8 machines; test sharding by spec file; flaky test detection dashboard; visual regression testing (Percy or Applitools) connected to Cypress runs.

**10 million users →** Cypress component testing for the design system library; E2E tests in multiple environments (staging, pre-prod); smoke tests on every deployment via CI/CD; synthetic monitoring (scheduled Cypress tests against production with read-only flows); Cypress vs Playwright evaluation for cross-browser requirements.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flow E2E is critical — test card numbers, UPI flow, payment success/failure; cy.intercept() for payment gateway responses; assertion on OTP timer and status updates | cy.intercept for payment success/failure; cy.wait('@alias') for async confirmations; real vs mocked API decision for payment tests |
| Swiggy / Meesho | Full order journey (search → add → cart → checkout → confirmation); testing with real product data + mocked payment; real-time order status updates | beforeEach database seeding; cy.intercept for order status polling; multi-step flow testing |
| Adobe / Microsoft | Enterprise web apps with complex auth flows; role-based access control testing; large file uploads tested with cy.intercept | Custom cy.login() command; cy.intercept for chunked upload; role-based routing tests |
| SAP Labs | cy.wait(5000) → cy.wait('@createOrder') flakiness fix story; retries config; SAP dashboard checkout E2E tests with intercepted API calls; direct measurable improvement | Specific flakiness fix with numbers; cy.intercept vs wait(number) tradeoff; retries config |

---

## 10. Related Topics — What to Study Next

- **Topic 257 — Playwright Advanced Testing** — the primary alternative to Cypress; runs on multiple real browsers (Chrome, Firefox, WebKit); native async/await API; understanding both lets you articulate the trade-offs clearly in interviews, especially for cross-browser requirements
- **Topic 254 — React Testing Library** — the integration testing layer that sits below Cypress in the test pyramid; RTL covers component interactions without a real browser; Cypress covers full user flows with a real browser; both are needed in a mature testing strategy
- **Topic 255 — Jasmine and Karma Angular** — Angular applications often use Cypress for E2E tests in combination with Jasmine/Jest for unit/integration tests; understanding both layers is essential for Angular system design conversations
- **Topic 260 — TestContainers** — on the backend, TestContainers plays a parallel role to cy.intercept on the frontend: both provide controlled, realistic test environments; understanding both sides lets you design testing strategies that cover the full stack with appropriate tools at each layer

---

*Part 15 · Cypress E2E Testing for Modern Web Apps · Full Stack Interview Guide · Hruday D · 2026*
