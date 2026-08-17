# 334 – Flaky Test Root Causes & Prevention

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Flaky tests pass and fail intermittently without code changes. Root causes: race conditions, time-dependent logic, shared state, network variability, animation timing, and browser rendering differences. Flaky tests erode trust in the test suite and waste developer time.

## 2. 🔬 DEEP-DIVE EXPLANATION

### Root Causes & Fixes

| Cause | Example | Fix |
|---|---|---|
| **Race condition** | Element not rendered yet | Use `waitFor`, `findBy*`, auto-wait |
| **Shared state** | Test depends on previous test's data | Isolate state per test, fresh setup |
| **Time-dependent** | `new Date()` in test | Mock time with `jest.useFakeTimers()` |
| **Network** | Real API call fails | Mock network (MSW, cy.intercept) |
| **Animation** | `click()` during CSS transition | `waitForAnimations`, disable in CI |
| **Order-dependent** | Tests depend on execution order | Each test self-contained |
| **Random data** | Test uses `Math.random()` | Seed random, use deterministic data |
| **Browser timing** | SetTimeout, RAF differences | Use Playwright's auto-wait |

```typescript
// ──── BAD: Race condition ────
it('shows data after load', () => {
  render(<DataTable />);
  // ❌ Element might not exist yet!
  expect(screen.getByText('Row 1')).toBeInTheDocument();
});

// ──── GOOD: Wait for async ────
it('shows data after load', async () => {
  render(<DataTable />);
  // ✅ Waits up to 1s for element to appear
  expect(await screen.findByText('Row 1')).toBeInTheDocument();
});

// ──── BAD: Time-dependent ────
it('shows relative time', () => {
  // ❌ Output changes depending on when test runs
  expect(formatRelativeTime(someDate)).toBe('2 hours ago');
});

// ──── GOOD: Mock time ────
it('shows relative time', () => {
  jest.useFakeTimers().setSystemTime(new Date('2024-01-15T12:00:00'));
  expect(formatRelativeTime(new Date('2024-01-15T10:00:00'))).toBe('2 hours ago');
  jest.useRealTimers();
});

// ──── GOOD: Network isolation ────
// MSW (Mock Service Worker) — intercept at network level
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/users', (req, res, ctx) =>
    res(ctx.json([{ id: 1, name: 'Hruday' }]))
  )
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Prevention Strategies
1. **Quarantine flaky tests** — move to separate suite, fix within 48h
2. **Track flakiness** — dashboard showing failure rate per test
3. **Retry budget** — max 2 retries, investigate if > 2% flaky rate
4. **Deterministic data** — factories with fixed seeds, not random

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Flaky tests are usually race conditions, shared state, or time-dependencies. I prevent them with: auto-wait (never raw sleep), MSW for network isolation, fake timers for time-dependent code, and test isolation with fresh state. At SAP, I reduced flakiness from 12% to under 1% by fixing the top 10 flaky tests."*

## 4. 🧠 MEMORY AID
**"Flaky causes: RSNTA — Race conditions, Shared state, Network, Time, Animations. Fix: wait → mock → isolate → seed."**

## 5. 🎯 KEY INSIGHT
A 5% flaky rate across 200 tests means ~10 random failures per CI run. That's enough to make developers ignore the entire suite.
