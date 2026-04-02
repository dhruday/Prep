# 294 – Typing Custom Hooks

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Custom hooks need proper TypeScript typing for: **return types** (explicit tuple or object), **generic parameters** (for reusable hooks), **overloads** (different return types based on input), and **callback types** (handlers passed to the hook). The key pattern: if your hook returns an array, use `as const` or explicit tuple type to prevent TypeScript from widening to `(string | Function)[]`.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

```typescript
// 1. Tuple return (like useState)
function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle]; // explicit tuple type
}

// 2. Object return (for hooks with many values)
interface UseAsyncReturn<T> { data: T | undefined; error: string | null; isLoading: boolean; refetch: () => void; }
function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): UseAsyncReturn<T> { /* ... */ }

// 3. Generic hook
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStored(prev => {
      const next = value instanceof Function ? value(prev) : value;
      window.localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [stored, setValue];
}

// 4. Overloaded hook
function useMediaQuery(query: string): boolean;
function useMediaQuery(query: string, serverFallback: boolean): boolean;
function useMediaQuery(query: string, serverFallback?: boolean): boolean {
  const [matches, setMatches] = useState(serverFallback ?? false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, our custom hooks like `useODataQuery<T>` used generics to return typed entity data from OData services. Proper typing meant consumers got full IntelliSense for the response data shape.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"For custom hooks, I use explicit return types — tuples for simple hooks (like useState pattern), objects for complex hooks. I use generics for reusable hooks (useAsync<T>, useLocalStorage<T>). Key pitfall: without explicit tuple types, TypeScript widens `[value, setter]` to `(string | Function)[]`. I always type callback parameters and use overloads when a hook's return type depends on its input."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Production-quality typed hook
type AsyncState<T> = 
  | { status: 'idle'; data: undefined; error: null }
  | { status: 'loading'; data: undefined; error: null }
  | { status: 'error'; data: undefined; error: string }
  | { status: 'success'; data: T; error: null };

function useFetch<T>(url: string, options?: RequestInit): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle', data: undefined, error: null });
  
  const refetch = useCallback(() => {
    setState({ status: 'loading', data: undefined, error: null });
    fetch(url, options)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data: T) => setState({ status: 'success', data, error: null }))
      .catch(err => setState({ status: 'error', data: undefined, error: err.message }));
  }, [url]);

  useEffect(() => { refetch(); }, [refetch]);
  return { ...state, refetch };
}

// Usage — fully typed
const { data, status, refetch } = useFetch<User[]>('/api/users');
if (status === 'success') data.map(u => u.name); // data is User[], not undefined
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Custom hooks: explicit return type (tuple or object), generics for reusable, overloads for polymorphic."** Always: explicit tuple `[T, (v: T) => void]` not inferred array. Generics: `<T>` for data type flexibility. Discriminated union for async state.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Custom hooks are the primary code reuse mechanism in React. Proper typing ensures consumer safety.
**How:** Explicit return types, generics, overloads, discriminated unions for state.
**Companies:** All four test custom hook design. Microsoft tests generic hook patterns deeply.
