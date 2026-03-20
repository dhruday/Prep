# 133. React Testing — Jest, React Testing Library, MSW
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

React testing best practice follows the **Testing Trophy** (Kent C. Dodds): the majority of tests should be **integration tests** (test a full feature as a user would use it, with real components + real DOM + mocked network). The three-layer stack is: **Jest** (test runner + assertions + mocking), **React Testing Library** (RTL — query the DOM the way users do: by role, label, text, not implementation details), and **MSW (Mock Service Worker)** — intercept HTTP requests at the network level so components fetching data work in tests just as they do in the browser. The key RTL philosophy: "The more your tests resemble the way your software is used, the more confidence they can give you." Query by accessible role/label, not by CSS class or test ID.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Queries — Priority Order (Most Preferred to Least)

```typescript
// Priority hierarchy (use the highest accessible query possible):

// 1. Accessible roles (preferred) — what a screen reader user sees
getByRole('button', { name: /submit/i })
getByRole('textbox', { name: /email/i })
getByRole('heading', { level: 1 })
getByRole('listitem')
getByRole('dialog')
getByRole('alert')

// 2. Accessible label
getByLabelText(/email address/i)
getByLabelText('Password')

// 3. Placeholder (when no label exists — less preferred)
getByPlaceholderText(/search/i)

// 4. Visible text
getByText(/submit/i)
getByText('Welcome back')

// 5. Display value (form elements)
getByDisplayValue('John Doe')

// 6. Alt text (images)
getByAltText('product photo')

// 7. Title attribute
getByTitle('Close modal')

// 8. Test ID (escape hatch — use when no accessible alternative)
getByTestId('submit-button')   // ← last resort; add aria roles instead

// Async queries (recommended for anything that might take time):
// await findByRole(), await findByText() — polls until element appears
// queryByRole() — returns null instead of throwing (for "should not exist" assertions)
```

### Unit Test — Component in Isolation

```typescript
// components/__tests__/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

const product = { id: '1', name: 'Running Shoes', price: 89.99, inStock: true };

describe('ProductCard', () => {
  it('renders product name and price', () => {
    render(<ProductCard product={product} onAddToCart={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Running Shoes' })).toBeInTheDocument();
    expect(screen.getByText('$89.99')).toBeInTheDocument();
  });

  it('calls onAddToCart with product id when button clicked', async () => {
    const mockAddToCart = jest.fn();
    render(<ProductCard product={product} onAddToCart={mockAddToCart} />);

    const button = screen.getByRole('button', { name: /add to cart/i });
    await userEvent.click(button);

    expect(mockAddToCart).toHaveBeenCalledTimes(1);
    expect(mockAddToCart).toHaveBeenCalledWith('1');
  });

  it('disables add to cart button when out of stock', () => {
    const outOfStock = { ...product, inStock: false };
    render(<ProductCard product={outOfStock} onAddToCart={() => {}} />);

    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
  });
});
```

### Integration Test — Feature with Async Data

```typescript
// features/__tests__/ProductList.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../../mocks/server';
import { rest } from 'msw';
import { ProductListPage } from '../ProductListPage';
import { AppProviders } from '../../providers/AppProviders';

// Wrap with all real providers — Redux store, React Query, Router
const renderWithProviders = (ui: React.ReactElement) =>
  render(ui, { wrapper: AppProviders });

describe('ProductList Integration', () => {
  it('loads and displays products from API', async () => {
    renderWithProviders(<ProductListPage />);

    // Loading state shown immediately
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

    // Wait for products to appear (MSW intercepts the API call)
    const products = await screen.findAllByRole('article', {}, { timeout: 3000 });
    expect(products).toHaveLength(3);  // matches MSW mock data

    expect(screen.getByRole('heading', { name: 'Running Shoes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trail Boots' })).toBeInTheDocument();
  });

  it('filters products by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductListPage />);

    // Wait for initial load
    await screen.findAllByRole('article');

    // Search
    await user.type(screen.getByRole('searchbox', { name: /search/i }), 'Running');

    // Wait for filtered results
    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });
    expect(screen.getByRole('heading', { name: 'Running Shoes' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Trail Boots' })).not.toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    // Override MSW handler to return an error for this specific test
    server.use(
      rest.get('/api/products', (req, res, ctx) =>
        res.once(ctx.status(500), ctx.json({ error: 'Server error' }))
      )
    );

    renderWithProviders(<ProductListPage />);

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
```

### MSW — Mock Service Worker Setup

```typescript
// mocks/handlers.ts — define mock API responses
import { rest } from 'msw';

const PRODUCTS = [
  { id: '1', name: 'Running Shoes', price: 89.99, inStock: true },
  { id: '2', name: 'Trail Boots', price: 149.99, inStock: true },
  { id: '3', name: 'Sandals', price: 49.99, inStock: false },
];

export const handlers = [
  rest.get('/api/products', (req, res, ctx) => {
    const query = req.url.searchParams.get('q');
    const filtered = query
      ? PRODUCTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      : PRODUCTS;
    return res(ctx.json(filtered));
  }),

  rest.post('/api/cart', async (req, res, ctx) => {
    const body = await req.json();
    return res(ctx.status(201), ctx.json({ cartItemId: 'new-id', ...body }));
  }),

  rest.get('/api/products/:id', (req, res, ctx) => {
    const { id } = req.params;
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    return res(ctx.json(product));
  }),
];

// mocks/server.ts — Node.js server for Jest
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);

// jest.setup.ts — global test setup
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());  // clear per-test overrides
afterAll(() => server.close());

// mocks/browser.ts — browser version for Storybook/dev
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
```

### Testing Hooks — renderHook

```typescript
// hooks/__tests__/useCart.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCart } from '../useCart';
import { AppProviders } from '../../providers/AppProviders';

describe('useCart', () => {
  it('adds item to cart', () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: AppProviders,
    });

    expect(result.current.items).toHaveLength(0);

    act(() => {
      result.current.addItem({ id: '1', name: 'Shoes', price: 89.99, quantity: 1 });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(89.99);
  });

  it('computes correct total for multiple items', () => {
    const { result } = renderHook(() => useCart(), { wrapper: AppProviders });

    act(() => {
      result.current.addItem({ id: '1', name: 'Shoes', price: 89.99, quantity: 2 });
      result.current.addItem({ id: '2', name: 'Socks', price: 9.99, quantity: 3 });
    });

    expect(result.current.total).toBeCloseTo(209.95, 2);
  });
});
```

### Testing User Events — @testing-library/user-event

```typescript
// user-event v14 simulates real browser events (keydown, input, keyup, click)
// vs fireEvent: dispatches a single event (less realistic)
import userEvent from '@testing-library/user-event';

describe('SearchForm', () => {
  it('submits search query', async () => {
    const onSearch = jest.fn();
    const user = userEvent.setup();  // preferred v14 API

    render(<SearchForm onSearch={onSearch} />);

    // Type into input — fires Input events, composition events etc.
    await user.type(screen.getByRole('searchbox'), 'running shoes');
    await user.keyboard('{Enter}');

    expect(onSearch).toHaveBeenCalledWith('running shoes');
  });

  it('clears search on escape key', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSearch={jest.fn()} />);

    const input = screen.getByRole('searchbox');
    await user.type(input, 'running shoes');
    expect(input).toHaveValue('running shoes');

    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });
});
```

### Jest Configuration for Next.js / TypeScript

```typescript
// jest.config.ts
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',  // match tsconfig paths
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThresholds: {
    global: { lines: 80, statements: 80, branches: 75 },
  },
};

export default createJestConfig(config);
// nextJest handles: tsconfig paths, Next.js env variables,
//                   CSS module mocking, static file mocking

// jest.setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the team had 300+ tests that used `getByTestId` extensively — tests were brittle because they tested implementation (DOM structure) not behavior. Migrated to RTL best practices: replaced `getByTestId('product-name')` with `getByRole('heading', { level: 3 })`, `getByTestId('add-button')` with `getByRole('button', { name: /add to cart/i })`. MSW replaced `jest.mock('axios')` — the component tests now use real `fetch` calls intercepted at the network level, which meant switching from `axios` to `fetch` was a zero-test-change refactor. Integration test suite now runs in 45 seconds for 280 tests; previously, 300 unit tests with heavy mocking were brittle and took 3 minutes.

**At FAANG scale:**
- **Microsoft:** Azure Portal test suite — 15,000+ RTL integration tests with MSW; any PR failing to maintain 85% branch coverage blocks merge via GitHub Actions CI
- **Adobe:** Design system components — RTL tests for every variant in Storybook + Jest; accessibility violations caught by `jest-axe` running in every component test
- **Salesforce:** Lightning Web Components testing adapted for React — RTL custom queries for design system component roles; MSW used in Storybook for live mock API during design review
- **Cisco:** Security compliance — tests include explicit accessibility checks (`toHaveNoViolations` from `jest-axe`) as coverage requirement; failing a11y tests blocks deployment

---

## 💬 4. Interview Execution

### Sample Answer

> "My React testing stack is Jest + React Testing Library + MSW. The RTL philosophy is to test behavior, not implementation — query by accessible role and label, not by CSS class or test ID. This means tests don't break when you refactor the implementation, only when you change the behavior.
>
> MSW is the key piece for integration tests. Instead of mocking `fetch` or `axios` at the module level, MSW intercepts at the service worker level (in the browser) or at the network level (in Node.js via msw/node). Components work exactly as they do in production — they make real fetch calls that MSW intercepts and returns mock data. Per-test overrides with `server.use(rest.get(..., restOnce(...)))` let you test error states and edge cases without modifying the shared handlers.
>
> For query priority: `getByRole` first (most accessible), then `getByLabelText` for form fields, then `getByText` for content. `getByTestId` is a last resort — if you can't find an accessible query, it usually means the component is missing accessibility attributes that you should add anyway.
>
> The testing trophy: most tests should be integration tests, fewer unit tests for pure functions, and minimal E2E (Cypress/Playwright) for critical paths — E2E is expensive, integration is the best ROI."

---

## 💻 5. Code Example

```typescript
// Complete integration test for a form with validation and API call
// __tests__/CreateProductForm.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from '../mocks/server';
import { CreateProductForm } from '../components/CreateProductForm';
import { AppProviders } from '../providers';

const renderForm = () => render(<CreateProductForm />, { wrapper: AppProviders });

describe('CreateProductForm', () => {
  it('shows validation errors for empty submit', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /create product/i }));

    expect(await screen.findByRole('alert', { name: /name is required/i })).toBeInTheDocument();
    expect(screen.getByRole('alert', { name: /price is required/i })).toBeInTheDocument();
  });

  it('submits form and shows success', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/product name/i), 'Test Shoes');
    await user.type(screen.getByLabelText(/price/i), '79.99');
    await user.click(screen.getByRole('button', { name: /create product/i }));

    // MSW returns 201 by default
    await screen.findByText(/product created successfully/i);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('shows error when API fails', async () => {
    server.use(
      rest.post('/api/products', (_req, res, ctx) =>
        res.once(ctx.status(422), ctx.json({ error: 'SKU already exists' }))
      )
    );

    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/product name/i), 'Duplicate');
    await user.type(screen.getByLabelText(/price/i), '50');
    await user.click(screen.getByRole('button', { name: /create product/i }));

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('SKU already exists');
  });
});
```

---

## 🧠 6. Memory Aid

**RIMQ — testing essentials:**
- **R**ole-first queries: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
- **I**ntegration over unit: test user behavior, not implementation details
- **M**SW: mock at network level → real `fetch` → components work as in production
- **Q**uery patterns: `getBy` (exists), `queryBy` (may not exist), `findBy` (async)

**MSW setup checklist:**
1. `handlers.ts` — define routes
2. `server.ts` (msw/node) — for Jest
3. `browser.ts` (msw/browser) — for Storybook
4. `server.resetHandlers()` in `afterEach`
5. `server.use(rest.get(..., res.once()))` for per-test overrides

**What NOT to test:**
- Prop types (TypeScript covers this)
- Implementation (function names, CSS classes)
- Third-party libraries (they have their own tests)

**Mnemonic:** **RIMQ** — Role-first, Integration-focused, MSW network mocking, Query variants (get/query/find).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ "What's your approach to testing React components?" is standard in senior interviews — having a coherent philosophy (Testing Trophy, behavior over implementation, MSW for realistic network mocking) with specific tool names and an explanation of WHY each choice shows engineering maturity, not just "I write tests"
→ The `getByRole` priority argument is a signal of accessibility awareness — explaining that accessible role queries test the component the way a screen reader user experiences it connects testing to real-world usability, which impresses interviewers at accessibility-focused companies (Microsoft, Adobe)
→ MSW as superior to `jest.mock('fetch')` or `jest.mock('axios')` is a concrete architectural opinion: module mocks couple tests to implementation (if you switch HTTP clients, all tests break); MSW mocks at the network level (if you switch HTTP clients, zero tests break) — articulating this choice shows senior-level design reasoning

**How it works (2 sentences):**
React Testing Library's `getByRole` queries map to the W3C ARIA roles specification — they use the browser's accessibility tree (or jsdom's approximation of it) to find elements by their semantic role (button, textbox, dialog, etc.), optionally filtered by their accessible name (computed from label, aria-label, aria-labelledby, or text content), which is why finding a button "by role + accessible name" succeeds even if the DOM structure and CSS class names change completely, making tests resilient to refactoring.
MSW (Mock Service Worker) in Node.js test environments uses a custom fetch interceptor (via `msw/node`'s `setupServer`) that patches the global `fetch` and `XMLHttpRequest` — when a component makes a fetch call, the interceptor checks it against the registered handlers, and if a match is found, the handler function runs and returns the mocked response without any real network request; `server.resetHandlers()` after each test restores the baseline handlers so per-test overrides (`server.use()`) don't bleed into subsequent tests.

---
✅ Topic 133/486 complete → Continuing to Topic 134: React Accessibility (a11y) — WCAG, ARIA, Focus Management
