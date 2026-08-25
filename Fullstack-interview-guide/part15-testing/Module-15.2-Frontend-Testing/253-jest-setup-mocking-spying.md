# Jest — Setup, Mocking, and Spying
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **jest.fn()** creates a mock function that records calls, arguments, return values, and instances; use it when you need a callable stand-in for a function or method: `const fetchUser = jest.fn().mockResolvedValue({ id: 1, name: 'Hruday' })`
- **jest.mock('./path')** auto-mocks an entire module at the file system level — all named exports become `jest.fn()` instances; Jest hoists `jest.mock()` to the top of the file before any imports run, so you can't conditionally call it
- **jest.spyOn(object, 'methodName')** wraps the REAL method with a spy; the original implementation runs unless you override it with `.mockReturnValue()` or `.mockImplementation()`; use when you want to verify a call without replacing the real behaviour entirely
- **mockReturnValue / mockResolvedValue / mockRejectedValue** — `mockReturnValue(x)` returns `x` synchronously; `mockResolvedValue(x)` returns `Promise.resolve(x)` (for async code); `mockRejectedValue(error)` returns `Promise.reject(error)` (for testing error paths)
- **clearAllMocks vs resetAllMocks vs restoreAllMocks**: `clearAllMocks()` clears call counts and recorded args; `resetAllMocks()` clears AND removes mock implementations; `restoreAllMocks()` restores the ORIGINAL implementations for spies (does not affect `jest.fn()`); use `clearAllMocks` in `afterEach` for most cases
- **jest.useFakeTimers()** replaces `setTimeout`, `setInterval`, `Date`, and `Promise`-based timers with controllable fakes; `jest.advanceTimersByTime(1000)` immediately runs all timers that would fire within 1 second; essential for testing debounced functions and polling

---

## 1. One-Line Definition
Jest is a JavaScript/TypeScript testing framework that provides test discovery, assertions, code coverage, and a powerful mocking system — all in one tool.

---

## 2. The Problem It Solves

Frontend and Node.js unit tests need to:
- Replace network calls with controlled data (fetching APIs, GraphQL, REST)
- Replace timers so tests don't actually wait 5 seconds for a debounce
- Verify that functions were called with the right arguments (event handlers, callbacks, analytics)
- Isolate a component or service from its dependencies while testing its logic
- Run fast enough to use in CI pipelines and pre-commit hooks

Jest solves all of these with `jest.fn()`, `jest.mock()`, `jest.spyOn()`, `jest.useFakeTimers()`, and snapshot testing — without needing a browser, server, or external process.

---

## 3. How It Works Internally

### Jest Mock Function Internals

```
jest.fn() creates an object with:
  ├── A callable function (invocable like any function)
  ├── .mock property — records every call:
  │     ├── .mock.calls: [[arg1, arg2], [arg1, arg2], ...]
  │     ├── .mock.results: [{ type: 'return', value: x }, ...]
  │     └── .mock.instances: [thisContext1, ...]
  └── Mock configuration methods:
        ├── .mockReturnValue(x)         — always return x
        ├── .mockReturnValueOnce(x)     — return x for the NEXT call only
        ├── .mockResolvedValue(x)       — always return Promise.resolve(x)
        ├── .mockRejectedValue(error)   — always return Promise.reject(error)
        └── .mockImplementation(fn)     — replace implementation with fn
```

### Module Hoisting — Why jest.mock() is Special

```
Jest transformation pipeline:

  Source file
    │
    ▼
  Babel/ts-jest
    │
    ▼
  Jest hoisting transform
    │  ← jest.mock('./api') calls are MOVED to before imports
    ▼
  Transformed code runs:
    1. jest.mock('./api')   ← hoisted here
    2. import { fetchUser } from './api'   ← fetchUser is now jest.fn()
    3. import { UserService } from './UserService'
    4. test('...', () => { ... })

Why this matters:
  If jest.mock() was NOT hoisted, the real module would be loaded before
  the mock could intercept it. Hoisting ensures the mock is in place before
  any module evaluation starts.

Consequence:
  // ❌ This WILL NOT work — factory function captures variable before assignment
  const mockFetch = jest.fn();
  jest.mock('./api', () => ({ fetchUser: mockFetch }));
  //  ↑ mockFetch is in the closure, but the factory runs during hoisting
  //    before let/const variables are assigned — ReferenceError
  
  // ✅ This works — factory function is self-contained
  jest.mock('./api', () => ({
      fetchUser: jest.fn().mockResolvedValue({ id: 1 })
  }));
```

---

## 4. The Code

### Wrong Way — Common Jest Mocking Mistakes

```typescript
// ❌ WRONG 1: Not resetting mocks between tests — state bleeds across tests

const mockFetch = jest.fn();
global.fetch = mockFetch;

test('first test', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => ({ data: [] }) });
    // ← mockResolvedValueOnce: adds ONE return to the queue
    // After this test consumes the queue item, the mock has no more queued returns
});

test('second test', () => {
    // ❌ If the first test didn't consume all queued returns,
    // or if mock.calls accumulates, this test sees dirty state
    // Always clear or reset mocks between tests
    await userService.getUsers();  // mock has no configured return — undefined
    expect(mockFetch).toHaveBeenCalledWith('/api/users');
    // ← This might pass or fail depending on execution order
});
```

```typescript
// ❌ WRONG 2: Using jest.spyOn without restoring — corrupts subsequent tests

describe('DateUtils', () => {
    test('formatters use current date', () => {
        // ❌ Spy on Date.now without restoring
        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
        
        expect(dateUtils.isToday(new Date())).toBe(true);
        
        // ← No afterEach or .mockRestore() — ALL subsequent tests in any file
        //   will see Date.now() as 1700000000000 until the test runner restarts
    });
});
```

```typescript
// ❌ WRONG 3: jest.mock with ES modules and default exports

// ❌ Incorrect mocking of a default export
jest.mock('../services/analyticsService');

import AnalyticsService from '../services/analyticsService';

test('tracks page view', () => {
    AnalyticsService.track('page_view');
    // ❌ jest.mock auto-mocking doesn't always handle default exports correctly
    // expect(AnalyticsService.track).toHaveBeenCalled()  ← may fail or be undefined
});
```

### Right Way — Jest Setup and Mocking Done Correctly

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',                    // TypeScript transformation
    testEnvironment: 'jsdom',             // browser-like environment for React
    // testEnvironment: 'node',           // use 'node' for Node.js/API tests
    
    setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
    
    moduleNameMapper: {
        // Alias resolution matching tsconfig paths
        '^@/(.*)$': '<rootDir>/src/$1',
        // Mock static assets (CSS, images) — these can't be imported in Jest
        '\\.(css|less|scss)$': 'identity-obj-proxy',
        '\\.(png|jpg|svg|gif)$': '<rootDir>/__mocks__/fileMock.ts',
    },
    
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.stories.{ts,tsx}',     // exclude Storybook stories
        '!src/**/index.ts',               // exclude barrel files
        '!src/main.tsx',                  // exclude app entry point
    ],
    
    coverageThresholds: {
        global: {
            branches: 80,
            functions: 80,
            lines: 85,
            statements: 85,
        }
    }
};

export default config;
```

```typescript
// jest.setup.ts — global test setup
import '@testing-library/jest-dom';       // adds .toBeInTheDocument() etc.

// ✅ Clear all mock calls and results after each test
// Does NOT remove mock implementations (use resetAllMocks for that)
afterEach(() => {
    jest.clearAllMocks();
});
```

```typescript
// ✅ RIGHT — jest.fn() for function mocks with proper types

import { ProductService } from '../services/product.service';
import { ProductRepository } from '../repositories/product.repository';

// ✅ Type-safe mock with jest.Mocked<T>
const mockRepo = {
    findById: jest.fn<Promise<Product | null>, [string]>(),
    findAll: jest.fn<Promise<Product[]>, []>(),
    save: jest.fn<Promise<Product>, [Product]>(),
    delete: jest.fn<Promise<void>, [string]>(),
} as jest.Mocked<ProductRepository>;

const service = new ProductService(mockRepo);   // inject the mock

describe('ProductService', () => {
    
    test('getProduct — returns the product when it exists', async () => {
        const product: Product = { id: '1', name: 'Laptop', price: 999, stock: 10 };
        
        // ✅ STUB behaviour: configure return for this test
        mockRepo.findById.mockResolvedValue(product);
        
        const result = await service.getProduct('1');
        
        expect(result).toEqual(product);
        // ✅ Verify the call (as a mock, not just a stub)
        expect(mockRepo.findById).toHaveBeenCalledWith('1');
        expect(mockRepo.findById).toHaveBeenCalledTimes(1);
    });
    
    test('getProduct — throws NotFoundException when product not found', async () => {
        mockRepo.findById.mockResolvedValue(null);   // simulate not found
        
        await expect(service.getProduct('999'))
            .rejects.toThrow(NotFoundException);
        
        expect(mockRepo.findById).toHaveBeenCalledWith('999');
    });
    
    test('multiple call sequences with mockReturnValueOnce', async () => {
        // ✅ Different return values for different calls (simulates retry/caching)
        mockRepo.findById
            .mockResolvedValueOnce(null)                    // first call: not found
            .mockResolvedValueOnce({ id: '1', name: 'Laptop', price: 999, stock: 10 }); // second: found after retry
        
        // First call triggers retry logic
        const result = await service.getProductWithRetry('1');
        
        expect(mockRepo.findById).toHaveBeenCalledTimes(2);
        expect(result.name).toBe('Laptop');
    });
});
```

```typescript
// ✅ RIGHT — jest.mock() for module-level replacement

// analytics.ts (module being mocked)
export const analytics = {
    track: (event: string, props?: Record<string, unknown>) => { /* real impl */ },
    identify: (userId: string) => { /* real impl */ }
};

// ✅ Mock the entire analytics module at the top of the test file
// jest.mock is hoisted — this intercepts the module before any import
jest.mock('../utils/analytics', () => ({
    analytics: {
        track: jest.fn(),
        identify: jest.fn(),
    }
}));

// After this jest.mock call, the imported analytics object has jest.fn() methods
import { analytics } from '../utils/analytics';

describe('UserRegistration', () => {
    
    test('tracks registration event on successful signup', async () => {
        await userRegistrationService.register({
            email: 'hruday@example.com',
            password: 'SecurePass123!'
        });
        
        // ✅ Verify the analytics call happened with the right properties
        expect(analytics.track).toHaveBeenCalledWith('user_registered', {
            email: 'hruday@example.com',
            method: 'email'
        });
    });
    
    test('does NOT track analytics when validation fails', async () => {
        await expect(
            userRegistrationService.register({ email: 'not-an-email', password: '' })
        ).rejects.toThrow(ValidationError);
        
        // ✅ Verify that analytics was NOT called on failure
        expect(analytics.track).not.toHaveBeenCalled();
    });
});
```

```typescript
// ✅ RIGHT — jest.spyOn() for wrapping real implementations

import * as dateUtils from '../utils/date-utils';
import { scheduler } from '../services/scheduler';

describe('Scheduler — real date logic, controlled time', () => {
    
    afterEach(() => {
        jest.restoreAllMocks();  // ✅ CRITICAL: restore originals after spy tests
    });
    
    test('scheduleReminder — sets reminder relative to current date', () => {
        // ✅ spyOn wraps the real method but controls its return value for this test
        // The real dateUtils.now function is NOT called — our mock runs instead
        const dateSpy = jest.spyOn(dateUtils, 'now')
            .mockReturnValue(new Date('2024-01-15T10:00:00Z'));
        
        const reminder = scheduler.scheduleReminder('meeting', 60);  // 60 minutes
        
        expect(reminder.fireAt).toEqual(new Date('2024-01-15T11:00:00Z'));
        expect(dateSpy).toHaveBeenCalledTimes(1);
        // ← restoreAllMocks in afterEach ensures real Date.now() is restored
    });
    
    test('spyOn with real implementation — passthrough', () => {
        // ✅ spyOn WITHOUT mockReturnValue — calls THROUGH to the real function
        // Useful when you just want to verify the call, not replace the implementation
        const formatSpy = jest.spyOn(dateUtils, 'format');
        
        const display = scheduler.getDisplayTime(new Date('2024-01-15T10:00:00Z'));
        
        expect(display).toBe('10:00 AM');           // real implementation ran
        expect(formatSpy).toHaveBeenCalledTimes(1); // call was recorded
    });
});
```

```typescript
// ✅ RIGHT — Timer mocking for debounce/throttle testing

import { debounce } from 'lodash';
import { SearchService } from '../services/search.service';

describe('SearchBar — debounced search', () => {
    
    beforeEach(() => {
        jest.useFakeTimers();  // replace all timer APIs with controllable fakes
    });
    
    afterEach(() => {
        jest.useRealTimers();  // restore real timers after each test
    });
    
    test('fires search after 300ms debounce delay', () => {
        const mockSearch = jest.fn();
        const debouncedSearch = debounce(mockSearch, 300);
        
        // Simulate rapid typing
        debouncedSearch('h');
        debouncedSearch('hr');
        debouncedSearch('hru');
        debouncedSearch('hrud');
        
        // Not called yet — debounce delay hasn't elapsed
        expect(mockSearch).not.toHaveBeenCalled();
        
        // ✅ Advance time by 300ms — fires the debounced call once
        jest.advanceTimersByTime(300);
        
        expect(mockSearch).toHaveBeenCalledTimes(1);
        expect(mockSearch).toHaveBeenCalledWith('hrud');  // last value only
    });
    
    test('polls API every 5 seconds', () => {
        const pollSpy = jest.spyOn(searchService, 'refreshSuggestions');
        
        searchService.startAutoRefresh();  // starts setInterval(fn, 5000)
        
        expect(pollSpy).not.toHaveBeenCalled();
        
        jest.advanceTimersByTime(5000);
        expect(pollSpy).toHaveBeenCalledTimes(1);
        
        jest.advanceTimersByTime(10000);  // advance another 10 seconds
        expect(pollSpy).toHaveBeenCalledTimes(3);  // 5s + 10s = 3 total calls
        
        searchService.stopAutoRefresh();  // cleanup
    });
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between jest.fn(), jest.mock(), and jest.spyOn()?"

**Hruday's answer:**
> Three different tools with different scopes.
>
> `jest.fn()` creates a standalone mock function that you assign where you need it — most commonly when you're constructing a dependency manually and injecting it into the class under test. It records calls, arguments, and return values. You configure its behaviour with `mockReturnValue()` or `mockImplementation()`.
>
> `jest.mock('./path')` intercepts an entire module at the module-system level. When any file imports `from './api'`, they get the mocked version instead of the real one. Jest hoists the `jest.mock()` call to before the imports so the mock is in place before modules load. This is useful when you can't pass a mock as a constructor argument — for example, when a module exports a singleton that gets imported and used directly.
>
> `jest.spyOn(object, 'method')` wraps an existing method on an object — the real method is still there, but the spy intercepts calls and records them. Unlike `jest.fn()`, the original implementation CAN still run (unless you `.mockImplementation()` over it). The critical difference is that `spyOn` requires `jest.restoreAllMocks()` after the test, or the spy persists and corrupts other tests. I use it most often when I want to verify that Date.now() was called, or that a utility function in the same module was invoked, without fully replacing the real logic.

---

### Q2 — Deep Dive
**Interviewer asks:** "When would you use jest.useFakeTimers(), and what pitfalls exist?"

**Hruday's answer:**
> Any time I'm testing code that sets a timeout, interval, or debounce, real timers make the test wait real time. A test for a 5-second polling interval would take 5 seconds. Fake timers let me advance time programmatically — the debounce fires instantly in the test.
>
> The common pitfalls:
>
> First, forgetting `jest.useRealTimers()` in `afterEach`. Fake timers persist for the rest of the test suite if not restored. Any subsequent test using `setTimeout` or a library that uses timers internally (React's `act()`, for example) may behave unexpectedly.
>
> Second, mixing fake timers with async code. `jest.advanceTimersByTime()` is synchronous — it fires all timers that would fire within that duration, but it doesn't yield to Promise microtasks. If your timer callback returns a Promise, you often need `await Promise.resolve()` after `advanceTimersByTime()` to let the microtask queue flush.
>
> Third, mocking `Date` along with timers. `jest.useFakeTimers()` by default mocks `setTimeout` and `setInterval` but not `Date`. If you need `Date.now()` to return a controlled value AND fake timers, pass `jest.useFakeTimers({ now: new Date('2024-01-01') })` to control both.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "jest.clearAllMocks vs jest.resetAllMocks vs jest.restoreAllMocks — when do you use each?"

**Hruday's answer:**
> Three different levels of cleanup, and using the wrong one is a very common cause of flaky tests.
>
> `clearAllMocks()` resets the RECORDED DATA: call counts, call arguments, captured instances. The mock implementation and return values remain. After clearing, `jest.fn().mockReturnValue(42)` still returns 42, but `mock.calls` is empty. I use this in `afterEach` in almost every test file — it prevents one test's assertions from seeing call data from a previous test while not removing the mock setup that might be shared.
>
> `resetAllMocks()` clears recorded data AND removes all mock implementations. After resetting, a `jest.fn().mockReturnValue(42)` is stripped — the function returns `undefined` again. I use this when I want each test to start with completely blank mocks and set up their own return values from scratch. More aggressive, better isolation, more setup boilerplate per test.
>
> `restoreAllMocks()` is specifically for spies created with `jest.spyOn()`. It removes the spy wrapper entirely and reinstates the original method. If you don't call this, the spy wraps the original method permanently for the rest of the test run. `clearAllMocks()` does NOT restore spies — the spy wrapper persists even after clearing. I always use `restoreAllMocks()` in `afterEach` whenever any test in the file uses `jest.spyOn()`.
>
> In practice: `clearAllMocks()` as the default global `afterEach`; `restoreAllMocks()` in any suite that uses `spyOn`.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "How do you test a React component that calls a fetch API on mount?"

**Hruday's answer:**
> I mock the global `fetch` using `jest.spyOn(global, 'fetch')` or replace it entirely with `global.fetch = jest.fn()`. I configure the mock to return a resolved Promise with the expected response structure.
>
> The test renders the component, waits for the async state update to complete (using RTL's `findBy*` queries which wait for elements to appear), then asserts the rendered output.
>
> For example: a `ProductList` component that calls `fetch('/api/products')` on mount. I set `global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, name: 'Laptop' }] })`. Then `render(<ProductList />)`, then `await screen.findByText('Laptop')`. The `findByText` polls until the element appears (the component fetched data and re-rendered) or times out. This tests the full async flow starting from mount, through the fetch, through the state update, to the rendered output.
>
> At SAP, I preferred wrapping the fetch in a service function and mocking the service module with `jest.mock('./productService')`. This is cleaner because the test mocks at the service boundary rather than the global `fetch` — if we switch to Axios or a GraphQL client, the mock stays the same.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "jest.mock() can be called anywhere in the file" | "I put jest.mock() calls after my imports at the top of the test" | `jest.mock()` is hoisted by Jest's Babel plugin to before imports regardless of where you write it; this means variables declared before `jest.mock()` are NOT available in the factory function — they hit a temporal dead zone; this is why `const mockFn = jest.fn(); jest.mock('../module', () => ({ fn: mockFn }))` throws a ReferenceError — the factory runs during hoisting before `const mockFn` is initialised; the fix is to declare the `jest.fn()` INSIDE the factory: `jest.mock('../module', () => ({ fn: jest.fn() }))` |
| "clearAllMocks is the same as resetAllMocks" | "I just call clearAllMocks at the end and everything is clean" | clearAllMocks resets recorded data (calls, instances, results) but leaves implementations intact; resetAllMocks also strips mock implementations so functions return undefined; if you're reusing a mock across tests and setting return values inside each test with `beforeEach`, clearAllMocks is enough; if your mock implementations are set at describe-level or globally and you want each test isolated, use resetAllMocks; using clearAllMocks when you needed resetAllMocks means stale mock implementations carry over and produce subtle wrong-return-value bugs that are very hard to trace |
| "spyOn always calls the real code" | "When I spy on Date.now, the real Date.now still runs" | Only if you DON'T call `.mockReturnValue()` or `.mockImplementation()` after the spy; by default `jest.spyOn()` calls through to the real implementation; once you chain `.mockReturnValue()`, the real implementation is replaced; explicit pass-through spying is useful for call verification WITHOUT changing behaviour; the key rule: spyOn without `.mock*` calls = real code runs + calls recorded; spyOn with `.mock*` = replacement runs + calls recorded |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a React dashboard that fetched data from 3 different Spring services on mount. Early tests mocked `fetch` globally at the test file level, but because `clearAllMocks` was not in the setup, mock call counts accumulated. Test 5 in the file was asserting `toHaveBeenCalledTimes(1)` but the mock had been called 5 times total across all tests.
>
> Adding `clearAllMocks()` globally in `jest.setup.ts` inside `afterEach` fixed all of those flaky assertions instantly. The second issue was `jest.spyOn(window, 'addEventListener')` in one test not being restored — it broke unrelated keyboard shortcut tests in a completely different file because the spy persisted across the module boundary. The fix was `restoreAllMocks()` in that suite's `afterEach`.
>
> After these two fixes, the test suite went from ~15% flaky tests to 0% — entirely due to proper mock lifecycle management."

---

## 8. Scale Evolution

**1,000 users →** single `jest.config.ts`, manual mock setup per test, `afterEach(jest.clearAllMocks)` globally; test run in under 30 seconds.

**100,000 users →** shared `__mocks__` directory for commonly used modules (api client, analytics, feature flags); `jest.config.ts` with project-level configs for different environments (jsdom for components, node for services); parallelism via `--maxWorkers` for CI.

**10 million users →** Jest sharding across multiple CI workers (`--shard=1/4`, `--shard=2/4`, etc.) for sub-5-minute test runs; separate test pipelines for unit tests (Jest) vs integration (Playwright); test result caching with Nx or Turborepo to skip unchanged tests.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flow components (checkout, card input, confirmation) tested with Jest mocking API calls; verify analytics events written to GA/Mixpanel | jest.fn() for payment API mocks; verify() on analytics calls for conversion events |
| Swiggy / Meesho | High-velocity frontend with many API interactions; fake timer testing for order status polling, cart debounce | jest.useFakeTimers() for real-time order tracking; module mocking for third-party SDKs |
| Adobe / Microsoft | Component libraries with complex async state; internationalization (i18n) modules mocked per test | jest.mock() for i18n modules; TypeScript-accurate jest.Mocked<T> usage |
| SAP Labs | Dashboard with multi-service data; clearAllMocks fixed flaky suites directly; Jest + ts-jest setup for TypeScript Angular/React; spyOn lifecycle issue resolved | Specific clearAllMocks / restoreAllMocks story; ts-jest configuration; per-suite vs global setup decisions |

---

## 10. Related Topics — What to Study Next

- **Topic 254 — React Testing Library** — the RTL `render()`, `screen.*`, `userEvent`, `waitFor`, and `findBy*` APIs that work ON TOP of Jest mocks; Jest provides the mocking infrastructure, RTL provides the UI testing layer; they are always used together for component tests
- **Topic 255 — Jasmine and Karma — Angular patterns** — Angular's default testing framework uses Jasmine (similar spy API: `jasmine.createSpy()`, `spyOn()`) with Karma as the test runner; understanding how Jest's spy API compares to Jasmine's helps articulate framework trade-offs
- **Topic 252 — Mocking vs Stubbing vs Faking** — the conceptual foundation for knowing WHEN to use mocks vs stubs; Jest's APIs (`jest.fn()` versus `jest.spyOn()` versus `jest.mock()`) map directly to the mock vs stub vs spy distinctions covered in Topic 252
- **Topic 261 — Contract Testing with Pact** — for testing API contracts between microservices; Jest is the test runner, but Pact is the contract layer; understanding both together allows a full picture of how JavaScript microservices can verify API contracts automatically

---

*Part 15 · Jest Setup, Mocking, and Spying · Full Stack Interview Guide · Hruday D · 2026*
