# 327 – React Testing Library – render, screen, userEvent, async

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
React Testing Library (RTL) tests components the way users interact with them — by visible text, roles, and labels, NOT by implementation details. Core: `render()`, `screen` queries, `userEvent` for interactions, and async utilities like `waitFor`, `findBy*`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ──── QUERIES PRIORITY (use in this order) ────
// 1. getByRole('button', { name: /submit/i })    — accessible, best practice
// 2. getByLabelText('Email')                       — form fields
// 3. getByPlaceholderText('Search...')             — fallback for forms
// 4. getByText('Welcome')                          — visible text
// 5. getByTestId('cart-total')                     — last resort

// ──── BASIC TEST ────
it('renders greeting', () => {
  render(<Greeting name="Hruday" />);
  expect(screen.getByText('Hello, Hruday!')).toBeInTheDocument();
});

// ──── USER INTERACTIONS ────
it('increments counter on click', async () => {
  const user = userEvent.setup();
  render(<Counter />);
  expect(screen.getByText('Count: 0')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /increment/i }));
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});

// ──── FORM TESTING ────
it('submits login form', async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);
  
  await user.type(screen.getByLabelText('Email'), 'hruday@test.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  
  expect(onSubmit).toHaveBeenCalledWith({
    email: 'hruday@test.com',
    password: 'password123',
  });
});

// ──── ASYNC TESTING ────
it('loads and displays data', async () => {
  render(<UserProfile userId="123" />);
  
  // findBy* waits for element to appear (default 1s)
  expect(await screen.findByText('Hruday')).toBeInTheDocument();
  
  // waitFor for assertions that may need time
  await waitFor(() => {
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
  });
});

// ──── QUERY TYPES ────
// getBy*    → throws if not found (synchronous, element must exist)
// queryBy*  → returns null if not found (for asserting absence)
// findBy*   → returns Promise, waits up to 1s (for async appearance)

it('shows error after failed submission', async () => {
  render(<Form />);
  // Verify error NOT present initially
  expect(screen.queryByText('Invalid email')).not.toBeInTheDocument();
  
  await userEvent.setup().click(screen.getByRole('button', { name: /submit/i }));
  
  // Wait for error to appear
  expect(await screen.findByText('Invalid email')).toBeInTheDocument();
});
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"RTL's philosophy: test behavior, not implementation. I query by role and accessible name first (getByRole), use userEvent for realistic interactions, findBy for async rendering, and queryBy to assert element absence. This makes tests resilient to refactors."*

## 4. 🧠 MEMORY AID
**"getBy = must exist now. queryBy = may not exist (null). findBy = await appearance. Query by: role > label > text > testid."**

## 5. 🎯 KEY INSIGHT
If your test uses `container.querySelector('.some-class')`, you're testing implementation. Use `screen.getByRole()` instead.
