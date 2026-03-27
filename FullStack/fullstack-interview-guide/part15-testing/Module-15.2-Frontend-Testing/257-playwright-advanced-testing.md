# Playwright — Advanced Browser Testing
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Multi-browser** native support: Chromium, Firefox, and WebKit (Safari engine) all in one framework; no WebDriver bridges; Playwright controls each browser with its native debugging protocol
- **page.route()** intercepts network requests: `await page.route('**/api/products', route => route.fulfill({ json: mockData }))` — same power as Cypress `cy.intercept` but async/await native
- **Locators**: the modern Playwright API; `page.getByRole('button', { name: /submit/i })`, `page.getByLabel('Email')`, `page.getByTestId('product-card')` — these auto-retry and auto-wait; prefer over `page.locator('css')` which is more fragile
- **Parallel test execution** out of the box — each test worker gets an isolated browser context; tests run in parallel by default with `workers: number` in config; no shared state between workers
- **page.waitForResponse()** waits for a specific response: `await page.waitForResponse('**/api/orders')` — blocks until that network request completes; an explicit alternative to relying on UI state appearing
- **Test fixtures** (Playwright's own concept, NOT fixture files): `test.extend({})` creates fixture functions that auto-setup/teardown; define an `authenticatedPage` fixture that logs in before every test automatically

---

## 1. One-Line Definition
Playwright is Microsoft's browser automation framework that runs real tests across Chromium, Firefox, and WebKit with a native async/await API, built-in parallelism, and powerful network interception — making it the primary choice for cross-browser E2E testing.

---

## 2. The Problem It Solves

Cypress only runs on Chromium-based browsers by default (experimental Firefox support). For products that must work on Safari (iOS, macOS users) and Firefox (privacy-conscious users, enterprise environments), you need a tool that genuinely runs on those engines — not Chrome pretending to be them.

Playwright controls each browser through its native remote debugging protocol (CDP for Chromium, a custom protocol for Firefox and WebKit). Tests run identically across all three browsers, catching cross-browser bugs at CI time before they reach production.

Additionally, Playwright's native async/await model means test code follows the same patterns as modern TypeScript services — no Cypress-style command queue to learn or debug.

---

## 3. How It Works Internally

### Browser → Context → Page

```
Playwright architecture:
  
  Browser (Chromium / Firefox / WebKit)
    ↓ 1 instance per worker process (expensive to create)
    
  BrowserContext
    ↓ Isolated session: cookies, localStorage, cached state
    ↓ Think of it as a fresh incognito window
    ↓ Cheap to create — use one per test for full isolation
    
  Page
    ↓ A tab within the context
    ↓ The object you interact with (goto, locator, click, fill)
    ↓ Multiple pages (tabs) per context

  Key insight: sharing a context = sharing cookies/sessions
  Two tests sharing one context will affect each other's auth state
  → Create one BrowserContext per test: guaranteed isolation
```

### Auto-Waiting in Playwright

```
locator.click()
  ↓ Playwright waits for:
    1. Locator to resolve to an element (element must exist in DOM)
    2. Element to be visible (not hidden with display:none or opacity:0)
    3. Element to be stable (not animating / moving in the viewport)
    4. Element to receive focus (not covered by another element)
    5. Element to be enabled (not disabled attribute)
  ↓ If any condition fails, retries every ~50ms until timeout
  ↓ Default locator timeout: 30 seconds

No manual waits needed for standard UI interactions.
```

---

## 4. The Code

### Wrong Way — Playwright Anti-Patterns

```typescript
// ❌ WRONG 1: Using CSS selectors instead of semantic locators

test('should place order', async ({ page }) => {
    await page.goto('/checkout');
    
    // ❌ Fragile CSS selector — breaks when styling changes
    await page.locator('.checkout-form .btn.btn-primary.submit-order').click();
    
    // ❌ XPath — complex, brittle, fails when DOM structure changes
    await page.locator('//div[@class="form-group"]/input[@type="text"]').fill('Hruday');
    
    // ✅ Use semantic locators instead:
    // await page.getByRole('button', { name: /place order/i }).click()
    // await page.getByLabel('Full name').fill('Hruday')
});
```

```typescript
// ❌ WRONG 2: Hard-coded waits

test('data loads on the page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // ❌ Waiting 3 seconds — arbitrary, unreliable in slow CI
    await page.waitForTimeout(3000);
    
    const revenue = await page.locator('[data-testid="total-revenue"]').textContent();
    expect(revenue).toBe('₹49,500');
    
    // ✅ Instead: wait for the specific network response or the element to contain text
    // await page.waitForResponse('**/api/metrics')
    // await expect(page.getByTestId('total-revenue')).toContainText('₹49,500')
});
```

```typescript
// ❌ WRONG 3: Not using browser context isolation

// ❌ Sharing page across tests — state bleeds between tests
let page: Page;

test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();  // one page for ALL tests in this file
    await page.goto('/');
});

test('test 1 — adds item to cart', async () => {
    await page.getByRole('button', { name: /add to cart/i }).click();
    // Cart now has 1 item in the SHARED page
});

test('test 2 — expects empty cart', async () => {
    // ❌ Cart still has 1 item from test 1 — FAILS or produces wrong assertions
    await expect(page.getByTestId('cart-count')).toHaveText('0');
});
```

### Right Way — Playwright Best Practices

```typescript
// playwright.config.ts
// ✅ RIGHT — configuration

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    
    // ✅ Run tests in parallel — default behaviour, make it explicit
    fullyParallel: true,
    workers: process.env.CI ? 2 : 4,   // fewer workers in CI to manage resources
    
    // ✅ Retry on CI — catches transient flakiness
    retries: process.env.CI ? 2 : 0,
    
    use: {
        baseURL: 'http://localhost:4200',
        
        // ✅ Trace on first retry — captures network, DOM, screenshots for debugging
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'on-first-retry',
        
        // ✅ Semantic locator preference settings
        testIdAttribute: 'data-testid',  // makes page.getByTestId() work with data-testid
    },
    
    projects: [
        // ✅ Run on real browsers — Playwright's primary advantage
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        
        // ✅ Mobile viewports for responsive testing
        { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
        { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
    ],
    
    // Start the dev server before tests
    webServer: {
        command: 'npm run start',
        url: 'http://localhost:4200',
        reuseExistingServer: !process.env.CI,
    },
});
```

```typescript
// e2e/fixtures/auth.ts
// ✅ RIGHT — Playwright test fixtures for auth setup

import { test as base, Page } from '@playwright/test';

type AuthFixtures = {
    authenticatedPage: Page;
    adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
    
    // ✅ authenticatedPage: auto-login before test, auto-logout after
    authenticatedPage: async ({ page }, use) => {
        // Login via API — fast, no UI overhead
        const response = await page.request.post('/api/auth/login', {
            data: {
                email: process.env.TEST_USER_EMAIL ?? 'hruday@test.com',
                password: process.env.TEST_USER_PASSWORD ?? 'TestPass123!'
            }
        });
        const { token } = await response.json();
        
        // Set auth token in localStorage
        await page.addInitScript(
            (authToken: string) => window.localStorage.setItem('authToken', authToken),
            token
        );
        
        await use(page);   // ← hand control to the test
        
        // Cleanup after test (optional — new context per test already isolates)
        await page.evaluate(() => window.localStorage.clear());
    },
    
    adminPage: async ({ page }, use) => {
        const response = await page.request.post('/api/auth/login', {
            data: { email: 'admin@test.com', password: 'AdminPass123!' }
        });
        const { token } = await response.json();
        await page.addInitScript(
            (t: string) => window.localStorage.setItem('authToken', t),
            token
        );
        await use(page);
    },
});

export { expect } from '@playwright/test';
```

```typescript
// e2e/checkout.spec.ts
// ✅ RIGHT — Full E2E checkout test with fixtures, intercepts, auto-waiting

import { test, expect } from './fixtures/auth';

test.describe('Checkout Flow', () => {
    
    test('complete purchase as authenticated user', async ({ authenticatedPage: page }) => {
        // ✅ Intercept the order creation API before navigation
        await page.route('**/api/orders', async route => {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    orderId: 'ORD-2024-9901',
                    status: 'CONFIRMED',
                    total: 1028.99
                })
            });
        });
        
        await page.goto('/cart');
        
        // ✅ Auto-wait: Playwright waits for this element to have correct text
        await expect(page.getByTestId('cart-total')).toContainText('₹1,028.99');
        await expect(page.getByTestId('cart-item-count')).toContainText('2 items');
        
        // Navigate to checkout
        await page.getByRole('button', { name: /proceed to checkout/i }).click();
        
        // ✅ Semantic locators — getByLabel matches the <label for="..."> association
        await page.getByLabel('Full name').fill('Hruday D');
        await page.getByLabel('Street address').fill('123 MG Road');
        await page.getByLabel('City').fill('Bangalore');
        await page.getByLabel('PIN code').fill('560001');
        
        await page.getByRole('button', { name: /continue to payment/i }).click();
        
        // Payment section appears
        await expect(page.getByText('Payment Details')).toBeVisible();
        
        await page.getByLabel('Card number').fill('4111111111111111');
        await page.getByLabel('Expiry date').fill('12/26');
        await page.getByLabel('CVV').fill('123');
        
        // ✅ waitForResponse to sync with the actual API call
        const [orderResponse] = await Promise.all([
            page.waitForResponse('**/api/orders'),
            page.getByRole('button', { name: /place order/i }).click()
        ]);
        
        // ✅ Assert on the response AND the UI
        expect(orderResponse.status()).toBe(201);
        
        await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
        await expect(page.getByTestId('order-id')).toContainText('ORD-2024-9901');
        await expect(page).toHaveURL(/order-confirmation/);
    });
    
    test('shows payment error when card is declined', async ({ authenticatedPage: page }) => {
        // ✅ Route fulfillment with error response
        await page.route('**/api/orders', route => route.fulfill({
            status: 402,
            contentType: 'application/json',
            body: JSON.stringify({
                error: 'PAYMENT_DECLINED',
                message: 'Your card was declined'
            })
        }));
        
        await page.goto('/cart');
        await page.getByRole('button', { name: /proceed to checkout/i }).click();
        
        await page.getByLabel('Full name').fill('Hruday D');
        await page.getByLabel('Street address').fill('123 MG Road');
        await page.getByLabel('City').fill('Bangalore');
        await page.getByLabel('PIN code').fill('560001');
        await page.getByRole('button', { name: /continue to payment/i }).click();
        
        await page.getByLabel('Card number').fill('4000000000000002');
        await page.getByLabel('Expiry date').fill('12/26');
        await page.getByLabel('CVV').fill('123');
        await page.getByRole('button', { name: /place order/i }).click();
        
        // ✅ Using role='alert' — tests accessibility AND functionality
        await expect(page.getByRole('alert')).toContainText('Your card was declined');
        await expect(page).toHaveURL(/checkout/);  // should not navigate away
    });
});
```

```typescript
// e2e/search.spec.ts
// ✅ RIGHT — Testing across browsers and mobile viewports

import { test, expect } from '@playwright/test';

// ✅ This test runs on Chromium, Firefox, WebKit, AND Mobile Chrome/Safari
// via the projects config — no extra code needed
test('product search filters results', async ({ page }) => {
    await page.route('**/api/products**', async route => {
        const url = new URL(route.request().url());
        const query = url.searchParams.get('q') ?? '';
        
        const allProducts = [
            { id: 1, name: 'Laptop Pro', price: 999 },
            { id: 2, name: 'Wireless Mouse', price: 29 },
            { id: 3, name: 'Standing Desk', price: 499 }
        ];
        
        // ✅ Dynamic mock based on query parameter — more realistic than static fixture
        const filtered = allProducts.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase())
        );
        
        await route.fulfill({ json: { products: filtered, total: filtered.length } });
    });
    
    await page.goto('/products');
    
    // ✅ getByRole with name — semantic, accessible, works across all browsers
    await page.getByRole('searchbox', { name: /search products/i }).fill('laptop');
    
    // Wait for filtered results
    await expect(page.getByTestId('product-card')).toHaveCount(1);
    await expect(page.getByTestId('product-card').first())
        .toContainText('Laptop Pro');
    
    // Clear and search again
    await page.getByRole('searchbox').clear();
    await page.getByRole('searchbox').fill('mouse');
    
    await expect(page.getByTestId('product-card')).toHaveCount(1);
    await expect(page.getByTestId('product-card').first()).toContainText('Wireless Mouse');
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are Playwright locators and why are they recommended over CSS/XPath selectors?"

**Hruday's answer:**
> Locators are Playwright's modern selector API, introduced to replace direct CSS/XPath selectors. The key difference is resilience and readability.
>
> A CSS selector `'.product-grid .product-card:first-child button.add-to-cart'` breaks when: the CSS class is renamed, the HTML structure changes, a new element is added before the target button. It's deeply coupled to the implementation.
>
> `page.getByRole('button', { name: /add to cart/i })` asks: "is there a button that users can interact with and that is labeled 'Add to Cart'?" It doesn't care about the CSS class, the HTML wrapper hierarchy, or the exact position. It survives any refactor that preserves the semantic meaning and accessible name. This also means the test is verifying accessibility simultaneously — if `getByRole` finds the button, it genuinely has the right ARIA semantics.
>
> Locators also have automatic waiting and retry built in — they're not point-in-time snapshots of DOM state. When you write `page.getByRole('button', { name: /submit/i }).click()`, Playwright retries finding and checking the button every ~50ms until it's present, visible, stable, and enabled. CSS selectors with `page.locator()` have the same retry, but the semantic locator APIs have better readability and stronger resilience.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do Playwright fixtures work and how are they different from Cypress custom commands?"

**Hruday's answer:**
> Playwright fixtures are test-level dependency injection. You define a fixture with `test.extend({ myFixture: async ({ page }, use) => { await setup(); await use(page); await teardown(); } })`. Every test that declares `myFixture` in its arguments gets the setup run before the test and teardown run after — automatically.
>
> The key power: fixtures compose. An `authenticatedPage` fixture sets up a logged-in user. A `checkoutPage` fixture can depend on `authenticatedPage` (declaring it as an argument) and additionally sets up a product in the cart. A `checkoutReadyPage` fixture builds on `checkoutPage` and navigates to the checkout page. Each layer adds setup without knowing about or repeating the layer below.
>
> Cypress custom commands are global imperative functions. `cy.login()` works, but composing complex setup chains requires calling multiple commands in sequence in `beforeEach`. The `use()` callback pattern in Playwright is more explicit about setup/teardown lifecycle.
>
> The other difference: Playwright fixtures can be scoped. A fixture scoped to `'test'` (default) creates a fresh instance for each test. A fixture scoped to `'worker'` creates once per parallel worker — useful for expensive setup like starting a test database that all tests in that worker share.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Playwright vs Cypress — give me a clear decision framework."

**Hruday's answer:**
> My decision tree:
>
> Need Safari/WebKit support? Firefox testing? → Playwright. It's the only framework with genuine multi-browser support including WebKit (Safari's engine). If your users include iOS, macOS Safari, or Firefox users, Playwright is non-negotiable.
>
> Team is JavaScript/TypeScript native and wants code that reads like a Node.js service? → Playwright. `await page.goto()`, `await locator.click()` — it's pure async/await. No command queue to understand, no `.then()` hidden inside a magical retry system.
>
> Team is React-heavy, wants a visual test runner with time-travel debugging, and browser compatibility isn't a hard requirement? → Cypress. The Cypress Test Runner's visual experience is genuinely better for onboarding developers who don't want to read trace files to debug tests.
>
> Building a component library where you want component tests that run in a real browser but without spinning up a full app? → Both have this now (Cypress Component Testing, Playwright component testing via @playwright/experimental-ct-react). Cypress is more mature here.
>
> Large enterprise, mixed team experience, strong TypeScript standards? → Playwright. It was built by Microsoft, has excellent TypeScript support, and the API design is familiar to anyone who's written async Node.js code.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "How do you test a multi-tab workflow with Playwright? For example, clicking 'Open in new tab' and asserting on the new tab."

**Hruday's answer:**
> Playwright has first-class multi-page support through the browser context's `page` events.
>
> The pattern: `const [newPage] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: /open in new tab/i }).click()])`. The `Promise.all` ensures you start listening for the new page event BEFORE clicking the link. If you click first, and the new page opens faster than you register the listener, you miss it.
>
> After that, `newPage` is a full `Page` object you can interact with normally: `await newPage.waitForLoadState('networkidle')`, then assert content.
>
> This is a case where Playwright's architecture genuinely beats Cypress. Cypress tests operate within a single page context by design — multi-tab scenarios require workarounds. Playwright's `BrowserContext` was designed to manage multiple pages, making these tests straightforward.
>
> For our SAP dashboard, we had a "View full report" link that opened in a new tab. The Playwright test handled it cleanly in three lines. The equivalent Cypress test required complex workarounds involving modifying the link target attribute before clicking.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Playwright tests run sequentially by default" | "I set workers: 4 to make tests run faster" | Playwright tests run fully parallel by default — `fullyParallel: true` is the default; each test gets its own BrowserContext (isolated browser session), so parallel tests don't interfere with each other; the trap is sharing browser state across tests (using `test.beforeAll` to create a page and reuse it) — that breaks parallelism because tests now race on shared state; always create a fresh page per test via fixtures or `test.beforeEach` |
| "page.waitForTimeout() is fine for tricky timings" | "I add a short delay when animations are slow" | `page.waitForTimeout()` is documented by Playwright itself as "never use in production tests — it's a sign of a reliability issue"; every `waitForTimeout` call is a symptom of the test not knowing what state it's waiting for; the fix: use `page.waitForResponse()` to wait for a specific API call, `expect(locator).toBeVisible()` auto-retries until visible (up to timeout), or `page.waitForLoadState('networkidle')` waits until no pending network requests; using these semantic waits makes tests 2-5x faster AND more reliable than `waitForTimeout` |
| "Playwright only runs on Chrome" | "Playwright is just another Chromium testing tool" | Playwright is the only major test framework with genuine support for Chromium, Firefox, AND WebKit (Safari's engine); Safari is critical for iOS testing — all browsers on iOS are forced to use WebKit by Apple's App Store rules; a React or Angular app that works in Chrome but breaks in Safari (due to CSS flex differences, missing ES features in older WebKit, or media API differences) will only be caught if you test with WebKit; Playwright's multi-browser support is its defining advantage over Cypress |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a product detail page that opened a PDF viewer in a new browser tab when you clicked 'View Specification'. The Cypress test team had been testing this manually for 6 months because they couldn't automate the multi-tab scenario reliably.
>
> When we evaluated Playwright, the first test I wrote covered this scenario: `const [newPage] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: /view specification/i }).click()]); await expect(newPage).toHaveURL(/\\.pdf/);`. Eight lines of test code replaced 6 months of manual testing.
>
> The second win was cross-browser. We had never tested on WebKit/Safari. The first Playwright run revealed two CSS Grid layout issues in Safari that production users had been experiencing but never reported clearly. Fixed in one sprint after being invisible for 8 months."

---

## 8. Scale Evolution

**1,000 users →** Playwright for critical user journeys; `workers: 2` in CI; trace files for debugging; 15-20 E2E tests across Chromium + Firefox completing in 5 minutes.

**100,000 users →** Playwright parallelism across CI shards; all 5 browser/device configurations in the projects array; visual regression testing with screenshots compared to base; mobile viewport tests for PWA flows.

**10 million users →** Playwright as the synthetic monitoring tool on production (read-only smoke tests every 5 minutes); Playwright MCP integration for accessibility audits; test library shared across 10+ frontend repositories via an npm package; performance budgets via `page.goto()` timing + web vitals capture.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flows must work on ALL browsers including Safari on iOS (most Indian users use iOS); Playwright WebKit testing catches Safari-specific payment form rendering issues | Multi-browser testing rationale; WebKit for iOS payment flow; page.route for payment API stubs |
| Swiggy / Meesho | Mobile-first user base; Playwright devices configuration for Pixel/iPhone viewports; multi-tab for "share cart" links and product detail pages | devices config for mobile; multi-page tab handling; cross-browser delivery tracking UI |
| Adobe / Microsoft | Document workflows with PDF viewer, file picker, multi-tab editing; exact multi-tab scenario from the experience hook; Azure DevOps integration for test results | Multi-page Playwright API; waitForEvent('page'); Microsoft-built tool (Playwright) in Microsoft toolchain |
| SAP Labs | PDF viewer multi-tab story (6 months manual → automated in 8 lines); Safari CSS Grid bug discovered on first WebKit run; direct before/after impact | Specific story with multi-page API; WebKit catching real Safari bugs; measurable quality improvement |

---

## 10. Related Topics — What to Study Next

- **Topic 256 — Cypress E2E Testing** — Playwright's primary alternative; understanding both tools lets you make architectural decisions confidently and articulate trade-offs (Cypress = better DX/debugging, Playwright = multi-browser); most teams evaluate both before choosing
- **Topic 258 — Spring Boot Unit Testing** — the backend layer that your Playwright tests interact with; understanding both sides of the test boundary (browser-level E2E and API-level unit/integration) enables holistic QA strategy conversations
- **Topic 260 — TestContainers** — for E2E tests that need a real backend, TestContainers provides the database layer; combining TestContainers (real DB) + Playwright (real browser) gives the most production-like test environment possible
- **Topic 254 — React Testing Library** — the faster integration testing layer; for React projects, RTL + Playwright is the modern testing stack: RTL for component testing, Playwright for user journey E2E; understanding where one ends and the other begins is essential for senior-level testing conversations

---

*Part 15 · Playwright Advanced Browser Testing · Full Stack Interview Guide · Hruday D · 2026*
