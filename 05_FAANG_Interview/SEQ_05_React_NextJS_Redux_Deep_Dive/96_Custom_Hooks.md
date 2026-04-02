# 96. Custom Hooks — Patterns, Composition, Testing
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

A custom hook is a JavaScript function that starts with `use` and calls other hooks. They extract stateful logic from components into reusable, testable units — enabling separation of concerns without changing component hierarchy. Custom hooks are the primary composition mechanism in React for sharing behaviour (not UI). Core patterns: state management hooks, data-fetching hooks, event subscription hooks, DOM hooks, and form hooks. Testing uses `@testing-library/react`'s `renderHook` to test hook logic in isolation, without a test component wrapper. The `use` prefix isn't just convention — it's what React's linter (react-hooks/rules-of-hooks) uses to identify hook calls and enforce the rules of hooks.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Why Custom Hooks Exist

Before hooks (React 16.7), sharing stateful logic required HOCs or render props — both of which inflated the component tree, created wrapper hell, and made debugging in DevTools tedious. Custom hooks share behaviour without adding extra components:

```typescript
// HOC approach (pre-hooks) — adds a component layer
function withWindowSize<P>(Component: React.ComponentType<P & { width: number }>) {
  return function WrappedWithWindowSize(props: P) {
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => { ... }, []);
    return <Component {...props} width={width} />;  // adds a component in the tree
  };
}

// ✅ Custom hook approach — no extra component layer
function useWindowSize() {
  return useSyncExternalStore(subscribe, getWidth, () => 1024);
}
// Components use it directly — no tree inflation, no wrapper hell
```

### Fundamental Patterns

**Pattern 1: State + Derived State Hook**
```typescript
// Encapsulates a single domain concept
function useCounter(initialCount = 0, options?: { min?: number; max?: number }) {
  const [count, setCount] = useState(initialCount);

  const increment = useCallback(() => {
    setCount(c => {
      const next = c + 1;
      return options?.max !== undefined ? Math.min(next, options.max) : next;
    });
  }, [options?.max]);

  const decrement = useCallback(() => {
    setCount(c => {
      const next = c - 1;
      return options?.min !== undefined ? Math.max(next, options.min) : next;
    });
  }, [options?.min]);

  const reset = useCallback(() => setCount(initialCount), [initialCount]);

  return { count, increment, decrement, reset };
  // Returns object (not tuple) for named access — more discoverable
}
```

**Pattern 2: Data Fetching Hook**
```typescript
interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

function useFetch<T>(url: string): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then(data => setState({ data, isLoading: false, error: null }))
      .catch(err => {
        if (err.name !== 'AbortError') {
          setState({ data: null, isLoading: false, error: err });
        }
      });

    return () => controller.abort();
  }, [url, refetchTrigger]);

  const refetch = useCallback(() => setRefetchTrigger(t => t + 1), []);

  return { ...state, refetch };
}
```

**Pattern 3: Event Subscription Hook**
```typescript
// Handles subscription lifecycle — subscribe on mount, cleanup on unmount
function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  target: EventTarget = window,
) {
  // Use ref for handler to avoid re-subscribing on every render when handler is inline
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });  // keep ref current without dep

  useEffect(() => {
    const stableHandler = (e: Event) => handlerRef.current(e as WindowEventMap[K]);
    target.addEventListener(event, stableHandler);
    return () => target.removeEventListener(event, stableHandler);
  }, [event, target]);  // handler NOT in deps — ref handles updates
}

// Usage
function KeyboardNav() {
  useEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  // Re-subscribing only when event type or target changes — not on every render
}
```

**Pattern 4: DOM Measurement Hook**
```typescript
function useElementSize<T extends Element>(): [React.RefCallback<T>, DOMRect | null] {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const callbackRef: React.RefCallback<T> = useCallback((node: T | null) => {
    if (!node) return;
    const observer = new ResizeObserver(entries => {
      setRect(entries[0].contentRect);
    });
    observer.observe(node);
    setRect(node.getBoundingClientRect());
    return () => observer.disconnect();  // note: RefCallback cleanup runs on React 19+
  }, []);

  return [callbackRef, rect];
}
```

**Pattern 5: Previous Value Hook**
```typescript
// Classic "what was the previous value?" pattern
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);
  useEffect(() => { ref.current = value; });  // after render, store new value
  return ref.current;  // during render, return the OLD stored value (from last render)
}
```

### Composition of Custom Hooks

Custom hooks compose just like functions:

```typescript
// Lower-level hooks
function useLocalStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch { return defaultValue; }
  });

  const setStored = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof newValue === 'function' ? (newValue as (p: T) => T)(prev) : newValue;
      window.localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  return [value, setStored] as const;
}

// Higher-level hook composes lower-level hooks
function useUserPreferences() {
  const [theme, setTheme] = useLocalStorageState<'light' | 'dark'>('theme', 'light');
  const [language, setLanguage] = useLocalStorageState<string>('lang', 'en');
  const windowSize = useWindowSize();
  const isKeyboardUser = useIsKeyboardUser();

  return {
    theme, setTheme,
    language, setLanguage,
    isCompactMode: windowSize.width < 768,
    isKeyboardUser,
  };
}
```

### Testing Custom Hooks with `renderHook`

```typescript
import { renderHook, act } from '@testing-library/react';

// Testing useCounter
describe('useCounter', () => {
  it('initializes with the provided count', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current.count).toBe(5);
  });

  it('increments the count', () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });

  it('respects max boundary', () => {
    const { result } = renderHook(() => useCounter(9, { max: 10 }));
    act(() => result.current.increment());
    expect(result.current.count).toBe(10);   // reached max
    act(() => result.current.increment());
    expect(result.current.count).toBe(10);   // stays at max
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(5));
    act(() => result.current.increment());
    act(() => result.current.increment());
    act(() => result.current.reset());
    expect(result.current.count).toBe(5);    // back to initial
  });
});

// Testing hooks with props that change (using rerender)
describe('useLocalStorageState', () => {
  beforeEach(() => localStorage.clear());

  it('reads initial value from localStorage', () => {
    localStorage.setItem('theme', JSON.stringify('dark'));
    const { result } = renderHook(() => useLocalStorageState('theme', 'light'));
    expect(result.current[0]).toBe('dark');  // read from storage, not default
  });

  it('writes to localStorage on setState', () => {
    const { result } = renderHook(() => useLocalStorageState('theme', 'light'));
    act(() => result.current[1]('dark'));
    expect(localStorage.getItem('theme')).toBe('"dark"');
  });
});

// Testing hooks with context providers
describe('useUserPreferences', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </AuthProvider>
  );

  it('returns default theme', () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    expect(result.current.theme).toBe('light');
  });
});

// Testing async hooks
describe('useFetch', () => {
  it('returns data after successful fetch', async () => {
    const mockData = { id: 1, name: 'Test' };
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const { result } = renderHook(() => useFetch<typeof mockData>('/api/item'));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      // Wait for fetch to resolve and state to update
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });
});
```

### Golden Rules for Custom Hooks

| Rule | Why |
|---|---|
| Always start with `use` | Enables linter rules-of-hooks enforcement |
| Return a named object (not tuple) for 3+ values | Discoverable, destructuring is clear |
| Return a tuple (`[value, setter]`) for 2 values like useState | Mirrors built-in hooks convention |
| Keep each hook focused on one concern | Composes better, tests are simpler |
| Handle cleanup in useEffect returns | Prevents leaks when component unmounts |
| Use `useCallback` for returned functions | Prevents consumer re-renders if used in deps |

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the application had 15+ components that all needed to fetch their own data, handle loading/error states, and implement abort on unmount. Custom `useFetch` hook consolidated this into one place — when the fetch API requirements changed (adding authentication headers), updating one hook fixed all 15 consumers. The `useTableFilters` hook encapsulated filter state, URL sync, debouncing, and reset logic so each table component was reduced from ~80 lines of filter management to 3 lines.

At Bosch, real-time WebSocket data consumed by multiple dashboard panels was extracted into `useWebSocketData(endpoint)` — components subscribed to their specific Channel, got connection status, and got the latest message, without knowing WebSocket lifecycle management.

**At FAANG scale:**
- **Microsoft:** React Fluent UI v9 is built almost entirely from custom hooks (`useFocusVisible`, `useTabster`, `useArrowNavigationGroup`) — separating interaction behaviour from render
- **Adobe:** Spectrum (React Aria) provides ~50 custom hooks like `useButton`, `useTextField`, `useMenu` — each encapsulates accessibility behaviour, keyboard interaction, and ARIA attributes; components compose these hooks, keeping UI separate from behaviour
- **Salesforce:** Lightning Design System React gives design system teams `useFormState`, `useValidation`, `useFieldRegistration` hooks — form-level state separated from field-level UI
- **Cisco:** DevNet platform has `useNetworkTopology`, `useDeviceHealth`, `useTrafficMatrix` — each abstracts real-time data subscription and transformation for dashboard components

---

## 💬 4. Interview Execution

### Sample Answer

> "Custom hooks are how React enables composition of stateful behaviour. You extract logic that would otherwise live inside components — state, effects, derived state — into a named function that starts with `use`. That prefix matters: it signals to React's linter to enforce the rules of hooks (no conditions, no loops) within that function.
>
> The patterns I use most are: data-fetching hooks that return `{ data, isLoading, error, refetch }`, DOM subscription hooks that handle subscribe/cleanup lifecycle, and compound state hooks that encapsulate a full domain concept (like `useTableFilters` at SAP, which managed filter state, debounced search, URL sync, and reset in one place).
>
> For testing, `@testing-library/react`'s `renderHook` lets you test hook logic without a component wrapper. Any state change has to be wrapped in `act()`. For async hooks, you await inside act. For hooks that require context, you pass a wrapper provider.
>
> The key principle: a custom hook should do one thing. If it's doing fetch + display logic + scroll position, split it. Composed small hooks are easier to test, reuse, and understand than large single-purpose ones."

### Likely Follow-ups

1. **Why does a custom hook have to start with `use`?** → The `react-hooks/rules-of-hooks` ESLint plugin identifies hook calls by the `use` prefix. If your function starts with `use`, the linter enforces that it isn't called conditionally or inside loops. Without the prefix, a function that calls hooks would bypass those checks, leading to potential bugs with hook ordering violations.
2. **How do you avoid infinite re-render loops in custom hooks?** → The most common cause is an unstable dependency in a useEffect or useMemo inside the hook — a function or object created inline in the hook that gets a new reference on every render. Fix: use useCallback/useMemo to stabilize returned functions, accept primitive deps instead of objects, or widen the useEffect to depend on a primitive derived from the object.
3. **When should you NOT extract a custom hook?** → When the logic is used in exactly one component and isn't going to be reused. Over-extraction adds indirection without benefit. Also, don't extract if the extraction makes the hook stateful when the same effect could be computed from props/state directly — avoid hooks for pure derivations that could be `useMemo` inside a component.
4. **React Aria vs React Hooks — what's the difference?** → React Aria (from Adobe's Spectrum) is a collection of custom hooks that implement accessibility behaviour. Rather than providing styled components, it provides the behaviour (event handling, ARIA props, keyboard navigation) as hooks. Your styled component calls `useButton()` to get the correct props and handlers, then spreads them onto a native element. This separation of behaviour and rendering is the most mature pattern in the React ecosystem.

---

## 💻 5. Code Example

```typescript
// Complete custom hook composition example — typical SAP-level complexity

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ========================
// Base: generic debounce hook
// ========================
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ========================
// Base: URL search params hook
// ========================
function useSearchParam(key: string): [string, (value: string) => void] {
  const [value, setValue] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) ?? '';
  });

  const setParam = useCallback((newValue: string) => {
    const params = new URLSearchParams(window.location.search);
    if (newValue) params.set(key, newValue);
    else params.delete(key);
    window.history.replaceState(null, '', `?${params.toString()}`);
    setValue(newValue);
  }, [key]);

  return [value, setParam];
}

// ========================
// Composed: table filter hook (SAP analytical table pattern)
// ========================
interface TableFilters {
  search: string;
  category: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

interface UseTableFiltersReturn {
  filters: TableFilters;
  debouncedSearch: string;
  setSearch: (s: string) => void;
  setCategory: (c: string) => void;
  toggleSort: (field: string) => void;
  setPage: (p: number) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: TableFilters = {
  search: '',
  category: '',
  sortField: 'name',
  sortDirection: 'asc',
  page: 1,
  pageSize: 25,
};

function useTableFilters(): UseTableFiltersReturn {
  const [searchParam, setSearchParam] = useSearchParam('q');
  const [category, setCategory] = useSearchParam('category');
  const [sortField, setSortField] = useSearchParam('sort');
  const [sortDir, setSortDir] = useSearchParam('dir');

  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchParam, 300);

  const filters = useMemo<TableFilters>(() => ({
    search: searchParam,
    category,
    sortField: sortField || DEFAULT_FILTERS.sortField,
    sortDirection: (sortDir as 'asc' | 'desc') || DEFAULT_FILTERS.sortDirection,
    page,
    pageSize: DEFAULT_FILTERS.pageSize,
  }), [searchParam, category, sortField, sortDir, page]);

  const setSearch = useCallback((s: string) => {
    setSearchParam(s);
    setPage(1);  // reset to page 1 on search change
  }, [setSearchParam]);

  const toggleSort = useCallback((field: string) => {
    if (field === filters.sortField) {
      setSortDir(filters.sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  }, [filters.sortField, filters.sortDirection, setSortField, setSortDir]);

  const handleSetCategory = useCallback((c: string) => {
    setCategory(c);
    setPage(1);
  }, [setCategory]);

  const resetFilters = useCallback(() => {
    setSearchParam('');
    setCategory('');
    setSortField('');
    setSortDir('');
    setPage(1);
  }, [setSearchParam, setCategory, setSortField, setSortDir]);

  return {
    filters,
    debouncedSearch,
    setSearch,
    setCategory: handleSetCategory,
    toggleSort,
    setPage,
    resetFilters,
  };
}

// Usage:
function ProductTable({ products }: { products: Product[] }) {
  const { filters, debouncedSearch, setSearch, toggleSort, setPage, resetFilters } = useTableFilters();

  // Use debouncedSearch (not filters.search) for actual filtering/API calls
  const filtered = useMemo(
    () => products.filter(p => p.name.includes(debouncedSearch)),
    [products, debouncedSearch]
  );

  return (
    <div>
      <input value={filters.search} onChange={e => setSearch(e.target.value)} />
      <button onClick={resetFilters}>Clear</button>
      {/* Table renders filtered data */}
    </div>
  );
}

interface Product { id: string; name: string; category: string; price: number; }
```

---

## 🧠 6. Memory Aid

**Custom hooks = functions that start with `use` and call other hooks. They extract shared behaviour without touching the component tree.**

Three questions to decide if something should be a custom hook:
1. Is this stateful logic used in 2+ components? → Yes → Extract to hook
2. Does this hook do one thing? → If multiple concerns → Split further
3. Is this just a derived value? → `useMemo` inside the component, no hook needed

**Mnemonic:** **SPEC** — **S**ingle concern, **P**refix with `use`, **E**xpose stable callbacks, **C**ompose small hooks into bigger ones.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Separation of concerns: components define UI structure; custom hooks define behaviour. This makes both easier to test, maintain, and reuse
→ Team scalability: hook libraries (like React Aria, Tanstack Table) show that hooks are the dominant pattern for sharing React logic in large codebases. SAP UI5 components for web components increasingly expose hooks for React integration
→ Testing: `renderHook` enables pure unit tests of stateful hook logic without mounting a full component tree — a significant improvement in test isolation and speed

**How it works (2 sentences):**
A custom hook is syntactic sugar — React does not treat it differently from a component function; it's just a JavaScript function that calls built-in hooks, and the "rules of hooks" apply to it identically to how they apply to components (call order invariant, component-scope only).
Custom hooks achieve reuse of stateful logic by closure — the hook's internal `useState`, `useEffect`, and `useReducer` calls are associated with the specific component instance that called the hook, giving each consumer its own independent state even when all consumers call the same hook.

**Company relevance:**
- Microsoft Fluent UI, Adobe React Aria, Salesforce Lightning Hooks — all major design systems are built primarily from custom hooks, making this pattern the industry standard for design system architecture
- Any senior role in these companies building React features will be expected to create and compose custom hooks regularly

---
✅ Topic 96/486 complete → Continuing to Topic 97: Automatic Batching in React 18
