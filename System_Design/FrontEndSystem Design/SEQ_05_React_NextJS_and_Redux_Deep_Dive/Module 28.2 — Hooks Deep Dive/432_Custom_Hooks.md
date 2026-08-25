# 432 – Custom Hooks — Extraction Patterns and Rules

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Custom hooks extract reusable stateful logic. Name must start with `use`. They compose built-in hooks. Each component calling a custom hook gets its own state copy. Custom hooks are the primary pattern for code reuse across components.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── useFetch — data fetching hook ────
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    
    fetch(url, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setData)
      .catch(e => { if (e.name !== 'AbortError') setError(e); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}

// Usage
function UserProfile({ id }: { id: string }) {
  const { data: user, loading, error } = useFetch<User>(`/api/users/${id}`);
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <h1>{user?.name}</h1>;
}

// ──── useLocalStorage ────
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue] as const;
}

// ──── useDebounce ────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// ──── useMediaQuery ────
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  
  return matches;
}

// ──── useOnClickOutside ────
function useOnClickOutside(ref: RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}
```

### Custom Hook Rules
| Rule | Example |
|---|---|
| Must start with `use` | `useAuth`, `useFetch` |
| Can call other hooks | `useState`, `useEffect` inside |
| Each caller gets own state | Two components = two states |
| No conditional calls | Always call in same order |
| Return value/tuple | `{data}` or `[value, setter]` |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Custom hooks extract reusable stateful logic. I've built useFetch (with AbortController), useDebounce, useLocalStorage, and useOnClickOutside. Each caller gets its own state copy. Key rules: must start with 'use', can't be called conditionally, always clean up side effects."*

## 4. 🧠 MEMORY AID
**"Custom hook = function starting with 'use' that calls other hooks. Each component gets its own state. Extract when 2+ components share the same effect/state pattern."**
