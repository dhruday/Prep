# 328 – Testing Custom Hooks with renderHook

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Custom hooks can't be called outside a component. `renderHook()` from `@testing-library/react` wraps the hook in a test component. Use `result.current` to inspect values and `act()` to trigger state updates. For hooks that use context, wrap with a custom `wrapper`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
import { renderHook, act } from '@testing-library/react';

// ──── BASIC HOOK TEST ────
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + 1);
  const reset = () => setCount(initial);
  return { count, increment, reset };
}

it('increments counter', () => {
  const { result } = renderHook(() => useCounter(0));
  expect(result.current.count).toBe(0);
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});

it('accepts initial value', () => {
  const { result } = renderHook(() => useCounter(10));
  expect(result.current.count).toBe(10);
});

// ──── TESTING WITH RE-RENDERS ────
it('updates on prop change', () => {
  const { result, rerender } = renderHook(
    ({ initial }) => useCounter(initial),
    { initialProps: { initial: 5 } }
  );
  expect(result.current.count).toBe(5);
  
  // Rerender with new props
  rerender({ initial: 10 });
  // Note: count doesn't reset automatically — only initial changes
});

// ──── TESTING ASYNC HOOKS ────
function useFetchUser(id: string) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(data => { setUser(data); setLoading(false); });
  }, [id]);
  return { user, loading };
}

it('fetches user data', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve({ name: 'Hruday' }),
  });
  
  const { result } = renderHook(() => useFetchUser('123'));
  expect(result.current.loading).toBe(true);
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual({ name: 'Hruday' });
  });
});

// ──── TESTING HOOKS WITH CONTEXT ────
const ThemeContext = React.createContext('light');
function useTheme() { return useContext(ThemeContext); }

it('reads theme from context', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
  );
  const { result } = renderHook(() => useTheme(), { wrapper });
  expect(result.current).toBe('dark');
});

// ──── TESTING CLEANUP ────
function useEventListener(event: string, handler: () => void) {
  useEffect(() => {
    window.addEventListener(event, handler);
    return () => window.removeEventListener(event, handler);
  }, [event, handler]);
}

it('cleans up event listener', () => {
  const handler = jest.fn();
  const addSpy = jest.spyOn(window, 'addEventListener');
  const removeSpy = jest.spyOn(window, 'removeEventListener');
  
  const { unmount } = renderHook(() => useEventListener('resize', handler));
  expect(addSpy).toHaveBeenCalledWith('resize', handler);
  
  unmount();
  expect(removeSpy).toHaveBeenCalledWith('resize', handler);
});
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"renderHook wraps the hook in a test component. I use result.current for values, act() for state changes, waitFor for async hooks, and wrapper for context providers. I always test cleanup (unmount) to verify no memory leaks."*

## 4. 🧠 MEMORY AID
**"renderHook → result.current for values. act() for mutations. wrapper for context. unmount for cleanup verification."**

## 5. 🎯 KEY INSIGHT
If a custom hook is complex enough to need its own tests, it's likely a good abstraction. Simple hooks (< 5 lines) are better tested through the component that uses them.
