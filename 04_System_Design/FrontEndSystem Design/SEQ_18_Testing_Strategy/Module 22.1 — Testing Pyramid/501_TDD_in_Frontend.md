# 501 — Test-Driven Development (TDD) in Frontend

────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

Test-Driven Development (TDD) is a software development methodology where you write a failing test **before** writing the production code that makes it pass. The cycle is brutally simple: **Red → Green → Refactor**. In a frontend context, TDD forces you to think about component behavior, hook contracts, and state transitions *before* touching JSX or templates. It shifts your mental model from "how does this look" to "what does this do."

TDD doesn't mean testing every pixel. It means using tests as a **design tool** — letting failing tests guide your implementation toward clean, decoupled, testable code. In frontend, TDD shines for logic-heavy code (custom hooks, state management, form validation, utility functions) and becomes less practical for visual layout, animations, and exploratory prototyping.

────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior/Staff Level)

### 2.1 The Three Laws of TDD (Robert C. Martin)

1. **You may not write production code until you have written a failing unit test.**
2. **You may not write more of a unit test than is sufficient to fail** (and not compiling counts as failing).
3. **You may not write more production code than is sufficient to pass the currently failing test.**

These laws create a tight feedback loop — typically 30–120 seconds per cycle. The discipline prevents over-engineering and keeps the codebase perpetually testable.

### 2.2 The Red → Green → Refactor Cycle

```
┌─────────┐     ┌─────────┐     ┌───────────┐
│  RED     │────▶│  GREEN  │────▶│ REFACTOR  │
│ Write a  │     │ Write   │     │ Clean up  │
│ failing  │     │ minimal │     │ code &    │
│ test     │     │ code to │     │ tests,    │
│          │     │ pass    │     │ keep green│
└─────────┘     └─────────┘     └───────────┘
      ▲                               │
      └───────────────────────────────┘
```

- **Red**: Write the smallest test that describes the next behavior. Run it. Watch it fail.
- **Green**: Write the *minimum* production code to make the test pass. No gold-plating.
- **Refactor**: Improve code structure (extract functions, rename, remove duplication) while keeping all tests green. This step is non-negotiable — skipping it leads to test-passing spaghetti.

### 2.3 Component-First vs Behavior-First TDD

| Approach | Description | When to Use |
|---|---|---|
| **Component-First** | Start by writing a test that renders the component, then assert on output | Visual components with clear acceptance criteria |
| **Behavior-First** | Start by testing a hook, reducer, or utility function, then wire into UI | Logic-heavy features, state machines, data transformations |

In practice, senior engineers use **behavior-first** for business logic and **component-first** for integration-level tests that verify wiring.

### 2.4 Where TDD Works Well in Frontend

| Domain | Why TDD Fits |
|---|---|
| **Custom Hooks** | Pure input/output contracts, easy to test with `renderHook` |
| **Redux Slices / State Logic** | Reducers are pure functions — TDD paradise |
| **Form Validation** | Rules are declarative, edge cases are well-defined |
| **Utility Functions** | Pure transformations, zero UI coupling |
| **API Data Transforms** | Mapping backend DTOs to frontend models |
| **Accessibility Logic** | Focus management, ARIA state calculations |

### 2.5 Where TDD Is Less Practical

| Domain | Why |
|---|---|
| **Visual Layout / CSS** | Can't meaningfully assert pixel positions in unit tests |
| **Animations / Transitions** | Timing-dependent, better suited for visual regression |
| **Exploratory UI / Prototyping** | Requirements unclear, design is in flux |
| **Third-Party Widget Integration** | You don't own the API surface |

This doesn't mean you skip testing — it means you use **different testing strategies** (visual regression, E2E, Storybook snapshots) instead of TDD.

### 2.6 London vs Chicago TDD Schools

**Chicago (Classical) School:**
- Test behavior through real collaborators
- Only mock external boundaries (network, filesystem)
- Tests are more resilient to refactoring
- Preferred for frontend component testing

**London (Mockist) School:**
- Mock all collaborators, test in strict isolation
- More granular failure messages
- Tests break more often during refactoring
- Useful for complex service layers

**Frontend recommendation**: Use **Chicago school** by default (render real components, avoid mocking child components). Switch to London school for testing services that interact with APIs or complex dependency chains.

### 2.7 React Testing Library TDD Workflow

RTL enforces behavior-driven testing by design — no access to component internals, query by role/text/label.

```
1. Write test: render(<Component />), query by role, assert behavior
2. Run test → RED (component doesn't exist)
3. Create component skeleton → still RED (behavior missing)
4. Implement behavior → GREEN
5. Refactor component internals → tests stay GREEN
```

### 2.8 Angular TestBed TDD Workflow

```
1. Write test: TestBed.configureTestingModule({...}), fixture.detectChanges()
2. Query by CSS selector or DebugElement
3. Trigger events, assert DOM changes and service calls
4. Implement component → GREEN
5. Refactor → keep GREEN
```

Angular's DI system makes the London school viable — you can provide mock services naturally through the TestBed.

### 2.9 TDD Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Testing implementation details** | Tests break on refactor, not on bugs | Test behavior: "when user clicks, list updates" |
| **TDD for every pixel** | Wastes time, tests add no value | Use visual regression for layout |
| **Skipping the Refactor step** | Code works but accumulates cruft | Refactor is mandatory — it's 1/3 of the cycle |
| **Coupling tests to framework internals** | `wrapper.instance()`, `component.state` | Use RTL queries, test from user perspective |
| **Writing too many tests before any code** | Violates Law 2, creates analysis paralysis | One test at a time, always |
| **Not running tests between writes** | Defeats the feedback loop | Run after every change |

────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

### Example A: TDD for `useDebounce` Hook

**Business context**: A search bar that debounces API calls. Before writing any hook code, we write the behavior contract.

**Step 1 — RED**: Define what `useDebounce` should do:
- Accept a value and a delay
- Return the debounced value
- Only update after the delay has elapsed
- Reset the timer if value changes during delay

**Step 2 — GREEN**: Implement minimal code to pass each test.

**Step 3 — REFACTOR**: Extract cleanup logic, optimize.

*(Full code walkthrough in Section 5)*

### Example B: TDD for Redux Slice

At SAP Labs, when building a dashboard feature, I used TDD for the notification slice:

1. Wrote tests for `addNotification`, `dismissNotification`, `clearAll` actions
2. Implemented the reducer to pass each test
3. Refactored to use `createEntityAdapter` when the pattern became clear
4. All tests stayed green through the refactor — proof the tests were testing behavior, not implementation

### Example C: TDD for Form Validation

Phone number validation for an international form:
1. Test: empty string → error "required"
2. Test: "abc" → error "invalid format"
3. Test: "+1234567890" → valid
4. Test: "+91 98765 43210" → valid (with spaces)
5. Each test drove one more branch in the validator

────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

> "I practice TDD heavily for logic-heavy frontend code — custom hooks, reducers, validation, and data transformations. At SAP Labs, when we built the notification system for our Lighthouse-optimized dashboard, I used TDD for the entire state management layer. I'd write a test for `addNotification` first, watch it fail, implement the reducer case, then refactor. The Red-Green-Refactor cycle kept us disciplined.
>
> I follow the Chicago school by default — I render real components in tests and only mock at the network boundary. React Testing Library enforces this naturally since you query by role and text, not by implementation details. For hooks, `renderHook` from RTL makes TDD straightforward — you define the contract (input → output) before writing the hook.
>
> Where I draw the line: I don't TDD visual layout or animations. Those are better served by Storybook visual regression or Playwright screenshots. TDD shines when the next behavior is clearly definable — 'when user types and pauses for 300ms, fire the search.' It's less useful when you're exploring 'does this layout feel right.'
>
> The biggest anti-pattern I've seen is skipping the refactor step. Teams write tests, make them pass, then move on. That's not TDD — that's test-first coding. The refactor step is where design quality lives. I also push back hard on testing implementation details. If your test breaks because you renamed a state variable but the behavior didn't change, that test is hurting you."

────────────────────────────────────────────────────────────────

## 5. Code Examples

### 5.1 Complete TDD Walkthrough: `useDebounce` Hook

#### Cycle 1 — RED: Basic contract

```typescript
// useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });
});
```

```typescript
// useDebounce.ts — DOES NOT EXIST YET → test fails ❌
```

#### Cycle 1 — GREEN: Minimal implementation

```typescript
// useDebounce.ts
import { useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue] = useState(value);
  return debouncedValue;
}
```

Test passes ✅. Minimal code — no timer logic yet.

#### Cycle 2 — RED: Debounce behavior

```typescript
it('should update the debounced value after the delay', () => {
  const { result, rerender } = renderHook(
    ({ value, delay }) => useDebounce(value, delay),
    { initialProps: { value: 'hello', delay: 300 } }
  );

  // Change input
  rerender({ value: 'world', delay: 300 });

  // Before delay: still old value
  expect(result.current).toBe('hello');

  // After delay: updated
  act(() => {
    jest.advanceTimersByTime(300);
  });

  expect(result.current).toBe('world');
});
```

Test fails ❌ — our hook doesn't debounce yet.

#### Cycle 2 — GREEN: Add timer logic

```typescript
// useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

Both tests pass ✅.

#### Cycle 3 — RED: Rapid changes should only emit once

```typescript
it('should reset the timer when value changes rapidly', () => {
  const { result, rerender } = renderHook(
    ({ value, delay }) => useDebounce(value, delay),
    { initialProps: { value: 'a', delay: 300 } }
  );

  rerender({ value: 'ab', delay: 300 });
  act(() => jest.advanceTimersByTime(100));

  rerender({ value: 'abc', delay: 300 });
  act(() => jest.advanceTimersByTime(100));

  rerender({ value: 'abcd', delay: 300 });

  // Should still be original — not enough time
  expect(result.current).toBe('a');

  // After full delay from last change
  act(() => jest.advanceTimersByTime(300));
  expect(result.current).toBe('abcd');
});
```

This already passes ✅ because `clearTimeout` in cleanup handles it.

#### Cycle 3 — REFACTOR

No refactoring needed — the hook is clean and minimal. In a real-world scenario, you might add a `leading` option or generic type constraints.

### 5.2 TDD Walkthrough: SearchBar Component

Building on `useDebounce`, now TDD the component.

#### RED: Renders input

```typescript
// SearchBar.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('should render a search input', () => {
    render(<SearchBar onSearch={jest.fn()} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });
});
```

#### GREEN:

```tsx
// SearchBar.tsx
interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  return <input type="search" role="searchbox" />;
}
```

#### RED: Debounced search callback

```typescript
it('should call onSearch with debounced value', async () => {
  jest.useFakeTimers();
  const onSearch = jest.fn();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  render(<SearchBar onSearch={onSearch} debounceMs={300} />);

  const input = screen.getByRole('searchbox');
  await user.type(input, 'react');

  // Not called yet — within debounce window
  expect(onSearch).not.toHaveBeenCalled();

  // Advance past debounce
  act(() => jest.advanceTimersByTime(300));

  expect(onSearch).toHaveBeenCalledWith('react');
  expect(onSearch).toHaveBeenCalledTimes(1);

  jest.useRealTimers();
});
```

#### GREEN:

```tsx
import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';

interface SearchBarProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export function SearchBar({ onSearch, debounceMs = 300 }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    if (debouncedQuery) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  return (
    <input
      type="search"
      role="searchbox"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      aria-label="Search"
    />
  );
}
```

### 5.3 TDD for a Redux Slice

```typescript
// notificationSlice.test.ts
import reducer, {
  addNotification,
  dismissNotification,
  clearAll,
  NotificationState,
} from './notificationSlice';

describe('notificationSlice', () => {
  const initialState: NotificationState = { items: [] };

  // RED → GREEN cycle 1
  it('should add a notification', () => {
    const next = reducer(
      initialState,
      addNotification({ id: '1', message: 'Saved', type: 'success' })
    );
    expect(next.items).toHaveLength(1);
    expect(next.items[0].message).toBe('Saved');
  });

  // RED → GREEN cycle 2
  it('should dismiss a notification by id', () => {
    const state: NotificationState = {
      items: [{ id: '1', message: 'Saved', type: 'success' }],
    };
    const next = reducer(state, dismissNotification('1'));
    expect(next.items).toHaveLength(0);
  });

  // RED → GREEN cycle 3
  it('should clear all notifications', () => {
    const state: NotificationState = {
      items: [
        { id: '1', message: 'A', type: 'info' },
        { id: '2', message: 'B', type: 'error' },
      ],
    };
    const next = reducer(state, clearAll());
    expect(next.items).toHaveLength(0);
  });

  // RED → GREEN cycle 4
  it('should cap notifications at 5', () => {
    let state = initialState;
    for (let i = 0; i < 7; i++) {
      state = reducer(
        state,
        addNotification({ id: `${i}`, message: `Msg ${i}`, type: 'info' })
      );
    }
    expect(state.items).toHaveLength(5);
    expect(state.items[0].id).toBe('2'); // oldest dropped
  });
});
```

```typescript
// notificationSlice.ts — built incrementally to pass each test
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface NotificationState {
  items: Notification[];
}

const MAX_NOTIFICATIONS = 5;

const initialState: NotificationState = { items: [] };

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<Notification>) {
      state.items.push(action.payload);
      if (state.items.length > MAX_NOTIFICATIONS) {
        state.items = state.items.slice(-MAX_NOTIFICATIONS);
      }
    },
    dismissNotification(state, action: PayloadAction<string>) {
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
    clearAll(state) {
      state.items = [];
    },
  },
});

export const { addNotification, dismissNotification, clearAll } =
  notificationSlice.actions;
export default notificationSlice.reducer;
```

### 5.4 TDD for Custom Hook with `renderHook`

```typescript
// useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns initial value when storage is empty', () => {
    const { result } = renderHook(() =>
      useLocalStorage('theme', 'light')
    );
    expect(result.current[0]).toBe('light');
  });

  it('persists value to localStorage on update', () => {
    const { result } = renderHook(() =>
      useLocalStorage('theme', 'light')
    );

    act(() => result.current[1]('dark'));

    expect(result.current[0]).toBe('dark');
    expect(localStorage.getItem('theme')).toBe(JSON.stringify('dark'));
  });

  it('reads existing value from localStorage', () => {
    localStorage.setItem('theme', JSON.stringify('dark'));

    const { result } = renderHook(() =>
      useLocalStorage('theme', 'light')
    );

    expect(result.current[0]).toBe('dark');
  });

  it('handles JSON parse errors gracefully', () => {
    localStorage.setItem('theme', 'not-valid-json{');

    const { result } = renderHook(() =>
      useLocalStorage('theme', 'light')
    );

    expect(result.current[0]).toBe('light');
  });
});
```

────────────────────────────────────────────────────────────────

## 6. Why & How Summary

### Why TDD Matters for Senior Frontend Engineers

| Why | Impact |
|---|---|
| **Design tool, not just verification** | Forces decoupled, testable architecture |
| **Instant regression safety** | Every behavior has a test from birth |
| **Documentation through tests** | Tests describe what code does, not how |
| **Confidence to refactor** | Green tests = safe to restructure |
| **Faster debugging** | Failures pinpoint exact broken behavior |

### How to Apply TDD in Frontend Projects

| Step | Action |
|---|---|
| 1 | Start with **behavior-first TDD** for hooks, reducers, utils |
| 2 | Use **component-first TDD** for integration tests with RTL |
| 3 | Follow **Chicago school** — avoid mocking child components |
| 4 | Use `jest.useFakeTimers()` for anything async or time-dependent |
| 5 | **Never skip the refactor step** — it's where design happens |
| 6 | Don't TDD visual layout — use Storybook + visual regression |
| 7 | Keep the cycle tight — each Red→Green→Refactor under 5 minutes |
| 8 | In CI, run the full suite; locally, run focused tests (`it.only`) |

### Decision Matrix: When to Use TDD

```
Is the behavior clearly definable before coding?
├── YES → Is it logic-heavy (not visual)?
│   ├── YES → ✅ Use TDD
│   └── NO  → Use visual regression + integration tests
└── NO  → Prototype first, write tests after design stabilizes
```

### Key Takeaways for Interview

- TDD = Red → Green → Refactor. All three steps are mandatory.
- The three laws of TDD prevent over-engineering.
- Frontend TDD works best for hooks, reducers, validators, and utilities.
- React Testing Library + `renderHook` are the primary tools.
- Chicago school (test through real collaborators) is the default choice.
- Skipping the refactor step and testing implementation details are the two deadliest anti-patterns.
- TDD is a **design discipline**, not a testing technique.

────────────────────────────────────────────────────────────────
