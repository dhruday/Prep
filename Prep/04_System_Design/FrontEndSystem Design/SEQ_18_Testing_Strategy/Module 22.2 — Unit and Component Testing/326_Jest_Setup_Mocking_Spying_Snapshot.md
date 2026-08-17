# 326 – Jest – Setup, Mocking, Spying, Snapshot

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Jest is the most popular JS testing framework — zero-config, built-in mocking, snapshot testing, coverage. Key features: `jest.fn()` (mock), `jest.spyOn()` (spy), `jest.mock()` (module mock), snapshot testing for UI regression, and async testing patterns.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── BASIC SETUP ────
// jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterSetup: ['./jest.setup.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};

// ──── MOCKING ────
// jest.fn() — create mock function
const mockCallback = jest.fn((x: number) => x * 2);
mockCallback(5);
expect(mockCallback).toHaveBeenCalledWith(5);
expect(mockCallback).toHaveReturnedWith(10);

// jest.mock() — mock entire module
jest.mock('./api', () => ({
  fetchUser: jest.fn().mockResolvedValue({ name: 'Hruday' }),
}));

// jest.spyOn() — spy on existing method
const spy = jest.spyOn(console, 'log').mockImplementation();
myFunction();
expect(spy).toHaveBeenCalledWith('expected message');
spy.mockRestore();

// ──── MOCK IMPLEMENTATIONS ────
const mockFetch = jest.fn()
  .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 1 }) })
  .mockRejectedValueOnce(new Error('Network error'));

// ──── TIMER MOCKING ────
jest.useFakeTimers();
const callback = jest.fn();
setTimeout(callback, 1000);
jest.advanceTimersByTime(1000);
expect(callback).toHaveBeenCalled();
jest.useRealTimers();

// ──── SNAPSHOT TESTING ────
it('renders correctly', () => {
  const tree = renderer.create(<Button label="Click" />).toJSON();
  expect(tree).toMatchSnapshot();
  // First run: creates __snapshots__/Button.test.tsx.snap
  // Subsequent: compares against saved snapshot
});

// Inline snapshot (stored in test file)
expect(formatDate(new Date('2024-01-15'))).toMatchInlineSnapshot(`"Jan 15, 2024"`);

// ──── ASYNC TESTING ────
it('fetches data', async () => {
  const data = await fetchUser('123');
  expect(data.name).toBe('Hruday');
});

it('handles errors', async () => {
  await expect(fetchUser('invalid')).rejects.toThrow('Not found');
});
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Jest gives me mock functions (jest.fn), module mocking (jest.mock), spies (jest.spyOn), and timer control (useFakeTimers). I prefer explicit mocks over snapshots — snapshots are good for catching regressions but bad for verifying correctness. I always restore spies to prevent test pollution."*

## 4. 🧠 MEMORY AID
**"jest.fn() = create mock. jest.mock() = mock module. jest.spyOn() = spy existing. Snapshots: regression only, not correctness."**

## 5. 🎯 KEY INSIGHT
Mock at the network boundary (MSW/fetch mock), not at internal function boundaries. Test behavior, not mock graphs.
