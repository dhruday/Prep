# Playwright vs Cypress — Architecture Trade-Offs
> Part 15 — Testing Strategy (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The core architectural difference**: Cypress runs INSIDE the browser in the same JavaScript process as your app — it directly accesses `window`, `document`, and app state; Playwright runs OUTSIDE the browser and talks to it via a remote debugging protocol (CDP for Chrome, custom for Firefox and WebKit)
- **Multi-browser**: Playwright natively supports Chromium, Firefox, and WebKit (Safari engine) in one framework; Cypress historically only supports Chromium (experimental Firefox support added later); for Safari compatibility testing, Playwright is the only real choice
- **DX (developer experience)**: Cypress has the best DX — time-travel debugging, live reload, a visual test runner you interact with while tests run; Playwright has great DX too but it's code-first with less visual interactivity by default
- **Parallelism**: Playwright runs parallel tests out of the box — each worker gets an isolated browser context; Cypress parallelism requires the Cypress Cloud (paid) or manual configuration
- **When to choose Cypress**: one-team, React/Angular SPA, Chromium-only acceptable, DX is top priority; **when to choose Playwright**: multi-browser required (Safari, Firefox), high parallelism needed, API + browser testing together in one tool, CI-first setup
- **Both tools now have component testing**: Cypress Component Testing (v10+) mounts individual components without a real browser URL; Playwright Component Testing is available but less mature

---

## 1. One-Line Definition
Cypress runs tests **inside** the browser (same process as the app) for maximum DX and direct state access; Playwright runs tests **outside** the browser via protocols for true multi-browser support and native parallelism — choose based on whether you need Safari/Firefox or prioritise developer experience.

---

## 2. The Problem It Solves

E2E tests catch what unit and integration tests miss — the actual user flow through a real browser. But the two dominant tools solve it with opposite architectural approaches, and picking the wrong one creates pain.

A team building a consumer banking app needs Safari and Firefox coverage — their customers use all three major browsers. They build 200 Cypress tests, then discover Safari has a broken date picker because Cypress never tested on WebKit. The fix: they needed Playwright from day one.

Conversely, a team building an internal React dashboard chooses Playwright. They spend three days configuring CI parallelism and debugging test flakiness that the Cypress visual runner would have exposed in 20 minutes. For a single-browser SPA with one team, Cypress DX wins.

The architecture gap is real. Understanding it tells you which tool fits your system.

---

## 3. How It Works Internally

### The Mental Model

**Cypress** is like a test engineer who sits inside the cockpit while the plane flies. They can reach the controls directly, read all the instruments in real time, and stop and replay anything. But they can only fly one type of plane (Chromium).

**Playwright** is like a test engineer who operates the plane from an external control tower. They talk to the plane over a standard radio protocol. This means they can control any plane model (any browser), run many planes at once, but they're one step removed from the cockpit.

### The Mechanism — Architecture Comparison

```
CYPRESS ARCHITECTURE
────────────────────────────────────────────────────────
  Your App (Browser Tab)
  ┌─────────────────────────────────────────┐
  │  app JavaScript                         │
  │  +                                      │
  │  Cypress JavaScript (same context)      │
  │  ↳ cy.get(), cy.click() directly        │
  │    access window, document, app state   │
  └─────────────────────────────────────────┘
         ↕ iframe bridge
  ┌─────────────────────────────────────────┐
  │  Cypress Test Runner (Node.js process)  │
  │  ↳ command queue, network intercept     │
  └─────────────────────────────────────────┘

PLAYWRIGHT ARCHITECTURE
────────────────────────────────────────────────────────
  Your App (Browser Tab)              Browser Process
  ┌────────────────────┐              ┌──────────────┐
  │  app JavaScript    │◄────CDP──────│  Chrome      │
  │  (isolated)        │              │  Firefox     │
  └────────────────────┘              │  WebKit      │
                                      └──────────────┘
                                             ↕
                                      Playwright Node.js / Python / Java
                                      (test process, separate)
```

### Step-by-Step — What Happens When `cy.click()` vs `page.click()` Runs

**Cypress:**
1. `cy.click('#submit')` adds a command to the Cypress command queue
2. Cypress waits for the element to be visible and actionable (auto-retry up to 4s)
3. Cypress fires a synthetic click event directly in the browser JS context
4. Cypress can inspect the app's Redux store, React state — all in the same JS world

**Playwright:**
1. `await page.click('#submit')` sends a CDP message to the browser: "find element, click it"
2. The browser moves the real mouse pointer (or simulates it) to the element center
3. A real pointer event fires in the browser, just like a human click
4. Playwright waits for the network to be idle (or uses `waitForSelector` / locator auto-wait)
5. Playwright cannot inspect React/Redux state without injecting code via `page.evaluate()`

---

## 4. The Code

### Wrong Way — Cypress with Fragile CSS Selectors
```typescript
// BAD: CSS selectors break silently when devs rename classes
cy.get('.btn-primary-submit-v2').click();
cy.get('#form > div:nth-child(3) > input').type('test@example.com');

// Why this fails: class names and DOM structure change during refactors
// The test breaks even though the feature still works fine
// "Green tests" become meaningless if they break on every CSS change
```
> **Why this fails in production:** CSS selectors couple your tests to implementation details. Any rename of a class or reorder of DOM elements breaks the test even when the feature is perfectly correct.

### Right Way — Cypress with Semantic ARIA Selectors
```typescript
// GOOD: Role-based selectors survive refactors
describe('Login flow', () => {
  it('submits login form successfully', () => {
    cy.visit('/login');

    // getByRole + accessible name — survives CSS changes entirely
    cy.findByRole('textbox', { name: /email/i }).type('hruday@sap.com');
    cy.findByLabelText(/password/i).type('secretpassword');
    cy.findByRole('button', { name: /sign in/i }).click();

    // Assert the outcome, not the DOM shape
    cy.findByText(/welcome back/i).should('be.visible');
    cy.url().should('include', '/dashboard');
  });

  it('intercepts API and tests error state', () => {
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 401,
      body: { message: 'Invalid credentials' }
    }).as('loginRequest');

    cy.visit('/login');
    cy.findByLabelText(/email/i).type('wrong@email.com');
    cy.findByRole('button', { name: /sign in/i }).click();

    cy.wait('@loginRequest');
    cy.findByRole('alert').should('contain.text', 'Invalid credentials');
  });
});
```
> **Key decisions here:**
> - `findByRole` comes from `@testing-library/cypress` — same query API as React Testing Library
> - `cy.intercept()` replaces `cy.route()` — supports HTTP methods, status codes, body stubbing
> - Assert on accessible text visible to users, not internal state or data-testid attributes

### Right Way — Playwright with Locators
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,        // parallel by default — each test gets isolated context
  retries: process.env.CI ? 2 : 0,  // retry flaky tests in CI only
  workers: process.env.CI ? 4 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',  // capture trace only on retry (keeps artefacts small)
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});

// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('login with valid credentials', async ({ page }) => {
  await page.goto('/login');

  // Locators auto-wait + auto-retry — no explicit waitForSelector needed
  await page.getByLabel('Email').fill('hruday@sap.com');
  await page.getByLabel('Password').fill('secretpassword');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation to complete
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
});

test('shows error on invalid credentials', async ({ page }) => {
  // Route interception — same as Cypress cy.intercept
  await page.route('**/api/auth/login', route =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Invalid credentials' })
    })
  );

  await page.goto('/login');
  await page.getByLabel('Email').fill('wrong@test.com');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByRole('alert')).toContainText('Invalid credentials');
});
```
> **Key decisions here:**
> - `page.getByLabel()`, `page.getByRole()` are "Locators" — they auto-retry until the element is interactable
> - `trace: 'on-first-retry'` captures a full browser trace (network, screenshots, console) only when a test actually fails — keeps storage reasonable in CI
> - `fullyParallel: true` runs each `test()` in its own browser context — no shared state between tests

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the main difference between Cypress and Playwright?"

**Hruday's answer:**
> "The core difference is where the test code runs. Cypress runs inside the browser — in the same JavaScript context as your app. That means it can directly access your app's state, DOM events happen synchronously, and you get this incredible time-travel debugging where you can step backwards through each test command in the visual runner. Playwright runs outside the browser and talks to it through a remote debugging protocol, like how Chrome DevTools connects to a tab. This means Playwright can control any browser — Chromium, Firefox, and WebKit for Safari — while Cypress historically only runs on Chromium. The trade-off: Cypress wins on developer experience for a single Chromium-only project. Playwright wins when you need cross-browser coverage, native parallelism without a paid plan, or seriously high test volume in CI. At SAP, where we support various enterprise browsers, Playwright's multi-browser support would be the right call."

---

### Q2 — Deep Dive
**Interviewer asks:** "Why does Cypress struggle with multiple browser tabs and iframes?"

**Hruday's answer:**
> "Because Cypress runs in the same JavaScript process as your app, it can only control one browser context — one tab, one top-level window. When you navigate to a page that opens a new tab for OAuth or a payment popup, Cypress can't follow it. It's physically in the old tab. Iframes are also tricky because Cypress sometimes loses the execution context when it needs to cross iframe boundaries — you need cy.iframe() plugins. Playwright handles both natively because it operates at the browser protocol level. It can open multiple pages with page = await context.newPage(), cross iframe boundaries with frameLocator(), and handle popups with page.waitForPopup(). In a real-world payment flow where the user is redirected to a bank's OAuth page in a new window, Playwright just handles it — Cypress requires workarounds or skipping that path entirely."

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you choose Cypress over Playwright in a new project?"

**Hruday's answer:**
> "If the team is building a React or Angular SPA, all users are confirmed to use Chrome-based browsers, and fast onboarding for junior engineers is a priority — I'd choose Cypress. The time-travel debugger and the visual test runner are genuinely the best DX in E2E testing. You can watch your test run in slow motion, hover over any command, and see the DOM state at that exact moment. That feedback loop is hard to match. I'd also lean Cypress if the team already has Cypress Component Testing set up — mounting components in real browsers without a full app URL is very useful for design systems. Playwright is the default over Cypress in a new project for me when we need Firefox and Safari testing, when we need to run 500+ tests in CI under 5 minutes via parallelism, or when we're testing a flow that involves multiple browser tabs such as SSO or payment redirects."

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "How would you structure E2E tests for a micro-frontend with four teams using different frameworks?"

**Hruday's answer:**
> "I'd choose Playwright for the integration E2E tests at the shell level because we need consistent cross-browser coverage across all four modules — some users on Safari, some on Firefox. The shell team owns a single Playwright test suite that exercises the full user flows: login, navigate to reports (Team A's SAP UI5 module), switch to dashboards (Team B's React module). These tests run multi-browser in CI on every shell deployment. Within each team, unit and component tests are framework-specific — Jest + React Testing Library for Teams B and D, Jasmine + Karma for the Angular admin module if applicable. The key is that the shell-level Playwright suite doesn't test internals — it tests the complete user journey. If Team A's module renders a filter and the user can interact with it, the test passes regardless of whether Team A used SAP UI5 or React internally."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Playwright is better than Cypress" | Stating preference without reasoning | Name the specific architectural reason: multi-browser via CDP protocol vs Cypress's in-browser JS context |
| CSS selectors in E2E tests | `cy.get('.submit-btn')` — breaks on every refactor | `getByRole('button', { name: /submit/i })` — survives any CSS change |
| "Cypress can't do cross-browser" | Absolute statement | "Cypress added experimental Firefox support; WebKit/Safari is Playwright-only; in practice Playwright is the production choice for multi-browser" |
| Ignoring parallelism cost | "Just use Cypress" | "Cypress parallelism requires Cypress Cloud (paid); Playwright parallelism is free and built-in with `workers` config" |

---

## 7. Hruday's Real Experience Hook

> "At SAP we had a large React micro-frontend application where we maintained E2E tests using Cypress. The tests covered the shell routing and each module's critical flows. Cypress worked well for daily development — the visual runner made debugging test failures fast. When we ran the accessibility audit, we needed to test Safari/WebKit behaviour for specific form interactions. Cypress couldn't help there. That's when I added a small Playwright suite specifically for cross-browser smoke tests: login, navigate to each module, verify core rendering on Chromium + Firefox + WebKit. The two tools ran side by side — Cypress for day-to-day development, Playwright for the scheduled nightly cross-browser run. If starting from scratch, I'd standardize on Playwright and save the tooling overhead of maintaining two."

---

## 8. Scale Evolution

**1 team, ~50 E2E tests →** Either tool works. Choose Cypress if the team values DX. Choose Playwright if anyone mentions Safari support.

**4 teams, ~500 E2E tests →** Playwright with `fullyParallel: true` and 8 CI workers runs 500 tests in under 3 minutes. Cypress at this scale needs Cypress Cloud parallelization (paid) or a custom solution.

**10 teams, ~2000 E2E tests →** Playwright with a shared `playwright.config.ts` base, per-team test projects that override `baseURL` and browser targets. Nightly full-browser run; PR run is Chromium-only for speed. Trace viewer for debugging failures. Allure or Playwright's built-in HTML report in CI.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flows must work on all browsers — Safari on iPhone is critical; Playwright's WebKit support is not optional | Shows you know the user base, not just the tool |
| Swiggy / Meesho | Consumer apps on Chrome Android and Safari iOS; mobile viewport testing; Playwright `devices` config for mobile emulation | `devices['iPhone 14']` in Playwright config shows production thinking |
| Adobe / Microsoft | Large design systems with hundreds of components; visual regression + E2E; Playwright's component testing is growing | Playwright Component Testing for isolated component E2E |
| Remote / Global roles | Cross-browser is a baseline expectation for any international product; Playwright is becoming the industry default | Knowing the real performance comparison (parallelism, cost) signals senior level |

---

## 10. Related Topics — What to Study Next

- **Visual Regression Testing (Topic 257)** — add Chromatic or Percy on top of Playwright/Storybook to catch screenshot diffs automatically
- **Testing Trophy (Topic 250)** — where E2E tests sit in the overall strategy; most products need fewer E2E than they think
- **Accessibility Testing (WCAG AA, Part 23)** — axe-playwright integration adds accessibility assertions to every E2E test
- **CI/CD Pipelines (Topic 191)** — how to run Playwright in GitHub Actions with parallel workers, artefact upload, and PR annotations
- **React Testing Library (Topic 254)** — complements E2E by covering component logic without a full browser; together with Playwright they cover the full testing trophy

---

*Part 15 · Playwright vs Cypress — Architecture Trade-Offs · Full Stack Interview Guide · Hruday D · 2026*
