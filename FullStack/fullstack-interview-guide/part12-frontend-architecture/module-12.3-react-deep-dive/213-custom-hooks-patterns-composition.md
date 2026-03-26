# Custom Hooks — Patterns and Composition
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Custom Hook**: a plain JavaScript function that starts with `use` and calls other hooks; it encapsulates stateful logic and side effects so multiple components can share the same behaviour without sharing state (each component gets its own state instance); the golden rule: "extract LOGIC, not JSX"
- **`useDebounce(value, delay)`**: delays propagating a value until `delay` ms pass without a new value; built with `useState` + `useEffect`; use for: search-as-you-type (delay API call until user stops typing), form validation (validate after user pauses)
- **`usePrevious(value)`**: captures the value from the PREVIOUS render using `useRef`; common use: detecting direction of change (count went up or down?), comparing old vs new value for animations
- **`useIntersectionObserver(ref, options)`**: wraps the browser's `IntersectionObserver` API; fires when a DOM element enters/leaves the viewport; use for: lazy-loaded images (load image only when in view), scroll-triggered animations, infinite scroll
- **`useLocalStorage(key, defaultValue)`**: synchronises React state with `localStorage`; reads initial value from storage, writes on every update; handles JSON serialization; use for: persisted user preferences (theme, language, layout), draft-saving for forms
- **`useEventListener(event, handler, target)`**: attaches/removes event listeners as the component mounts/unmounts; eliminates manual `addEventListener` + `removeEventListener` in `useEffect`; safe for `window`, `document`, or any DOM element
- **Composition pattern**: custom hooks can call other custom hooks — `useSearchResults` can call `useDebounce` internally; this is how complex hooks are built from simple primitives without any component hierarchy changes

---

## 1. One-Line Definition
Custom hooks are the composition primitive for React logic — they extract stateful behaviour and side effects into reusable, testable functions that maintain full hook semantics while providing clean, intention-revealing APIs to the components that consume them.

---

## 2. The Problem It Solves

Consider three different components: a search bar (debounce the query before firing), a form input (debounce validation before showing error), and a command palette (debounce filtering before recomputing suggestions). All three need the same debounce behaviour with slightly different delays.

Without custom hooks: each component duplicates `useState` + `useEffect` + timer management. Three implementations, three bugs to fix, three places to update when the debounce logic needs to change.

With `useDebounce`: one function, three usages. Logic changes once. Tests cover the hook in isolation — no React component needed.

The second problem: logic scattered across `componentDidMount`, `componentDidUpdate`, `componentWillUnmount` (or three separate `useEffect` calls) is hard to reason about. A WebSocket subscription that subscribes on user-ID change and unsubscribes on unmount is better as `useWebSocketSubscription(userId)` than as raw effect logic in the component.

---

## 3. Core Custom Hooks — Patterns

### useDebounce

```typescript
// Debounces any value: the returned value updates only after 'delay' ms
// of no new value arriving

function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Cleanup: cancel the timer if value changes before delay passes
    // This is the "debounce" mechanism: each new value restarts the timer
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// Usage:
function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400); // Only updates after 400ms of silence
  
  // Fire API call when debouncedQuery changes (not on every keystroke)
  useEffect(() => {
    if (debouncedQuery) onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);
  
  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

### usePrevious

```typescript
// Returns the value from the PREVIOUS render
// Built on useRef: ref updates AFTER render, so it holds last render's value

function usePrevious<T>(value: T): T | undefined {
  const prevRef = useRef<T | undefined>(undefined);
  
  // useEffect runs after render — at this point, render has committed
  // prevRef.current still holds the PREVIOUS render's value
  // After this effect, it will hold the CURRENT value (for the NEXT render's "previous")
  useEffect(() => {
    prevRef.current = value;
  }); // No dep array: runs after every render
  
  // Returns the OLD value (pre-render — not yet updated by useEffect)
  return prevRef.current;
}

// Usage: detect if a value increased or decreased for animation direction
function CounterWithAnimation({ count }: { count: number }) {
  const prevCount = usePrevious(count);
  const direction = prevCount !== undefined 
    ? (count > prevCount ? 'up' : 'down') 
    : 'none';
  
  return (
    <div className={`counter counter-${direction}`}>
      {count}
    </div>
  );
}
```

### useIntersectionObserver

```typescript
// Fires callback when a DOM element enters/exits the viewport
// Used for: lazy loading, infinite scroll, scroll-triggered animations

function useIntersectionObserver(
  ref: RefObject<Element>,
  options: IntersectionObserverInit = {},
  once: boolean = false // Stop observing after first intersection (for one-time animations)
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    // Check if IntersectionObserver is available (all modern browsers, not IE)
    if (!('IntersectionObserver' in window)) {
      setIsIntersecting(true); // Fallback: assume visible
      return;
    }
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      // Stop observing after first visibility (for "animate in once" use cases)
      if (once && entry.isIntersecting) observer.unobserve(element);
    }, options);
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [ref, options.threshold, options.rootMargin, once]);
  // ⚠️ options object in deps: parent must stabilise it with useMemo or pass primitives
  
  return isIntersecting;
}

// Usage 1: lazy-load image (load only when in viewport)
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const isVisible = useIntersectionObserver(imgRef, { threshold: 0.1 });
  
  return (
    <img
      ref={imgRef}
      src={isVisible ? src : undefined} // Only set src when visible — triggers load
      alt={alt}
      className="lazy-img"
    />
  );
}

// Usage 2: scroll-triggered animation (animate in once)
function AnimatedSection({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useIntersectionObserver(sectionRef, { threshold: 0.2 }, true);
  
  return (
    <div
      ref={sectionRef}
      className={`section ${hasAnimated ? 'animate-in' : 'invisible'}`}
    >
      {children}
    </div>
  );
}
```

### useLocalStorage

```typescript
// Synchronises state with localStorage — persists across page reloads

function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  // Lazy initializer: run once at mount to read from localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      // localStorage unavailable (private mode in some browsers) or JSON parse fails
      return defaultValue;
    }
  });
  
  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`useLocalStorage: failed to write key "${key}"`);
      // Still update in-memory state even if localStorage fails
    }
  }, [key]);
  
  return [storedValue, setValue];
}

// Usage: persist user preferences
function SettingsPanel() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [density, setDensity] = useLocalStorage<'compact' | 'normal'>('density', 'normal');
  
  // theme and density persist across page reloads automatically
  return (
    <div>
      <ThemeToggle value={theme} onChange={setTheme} />
      <DensityToggle value={density} onChange={setDensity} />
    </div>
  );
}
```

### useEventListener

```typescript
// Attaches an event listener to any target (window, document, or DOM element)
// with proper cleanup — removes listener on cleanup/unmount

function useEventListener<K extends keyof WindowEventMap>(
  eventType: K,
  handler: (event: WindowEventMap[K]) => void,
  target?: RefObject<HTMLElement> | Window | Document,
  options?: AddEventListenerOptions
) {
  // Store handler in ref — prevents re-attaching listener when handler identity changes
  const savedHandler = useRef(handler);
  
  useLayoutEffect(() => {
    savedHandler.current = handler; // Always has the latest handler
  }, [handler]);
  
  useEffect(() => {
    const targetElement = target && 'current' in target ? target.current : (target ?? window);
    if (!targetElement) return;
    
    // Create stable wrapper that calls the latest handler via ref
    const listener = (event: Event) => savedHandler.current(event as WindowEventMap[K]);
    
    targetElement.addEventListener(eventType, listener, options);
    return () => targetElement.removeEventListener(eventType, listener, options);
  }, [eventType, target, options?.capture, options?.passive]);
}

// Usage: keyboard shortcut listener (global)
function KeyboardShortcutHandler() {
  useEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  });
  // Listener is added to window, removed on unmount — no manual cleanup
  return null;
}

// Usage: click outside to close (DOM element target)
function Dropdown({ onClose }: { onClose: () => void }) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEventListener('mousedown', (e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      onClose(); // Clicked outside the dropdown
    }
  }, undefined, { capture: true });
  
  return <div ref={dropdownRef}>{/* dropdown content */}</div>;
}
```

---

## 4. The Code — Composition and Advanced Patterns

### Wrong Way — Logic Duplication Without Hooks

```typescript
// ❌ WRONG — Logic duplicated across components
function SearchBar() {
  const [query, setQuery] = useState('');
  const timerRef = useRef<number | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  };
  
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  
  return <input value={query} onChange={handleInput} />;
}

// SAME LOGIC duplicated in a different component:
function CommandPalette() {
  const [filter, setFilter] = useState('');
  const timerRef = useRef<number | null>(null);
  const [debouncedFilter, setDebouncedFilter] = useState('');
  
  // ... EXACT same debounce logic copied and pasted ...
}

// ❌ WRONG — Testing requires mounting the full component
// To test the debounce logic, you must render SearchBar or CommandPalette,
// simulate events, wait for timeouts — brittle and slow
```

### Right Way — Composable Custom Hooks

```typescript
// ✅ RIGHT — All hooks defined once, composed freely

// useSearchWithResults: composes useDebounce + useEffect for data fetching
// Entity-level hook: "give me products matching this query"
function useProductSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Internal composition: use the primitive useDebounce hook
  const debouncedQuery = useDebounce(query, 350);
  
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    
    fetch(`/api/products/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => {
        setResults(data.products);
        setIsLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err);
          setIsLoading(false);
        }
      });
    
    return () => controller.abort();
  }, [debouncedQuery]);
  
  return { query, setQuery, results, isLoading, error, debouncedQuery };
}

// Component: clean, no logic visible — all in the hook
function ProductSearchPage() {
  const { query, setQuery, results, isLoading } = useProductSearch();
  
  return (
    <div>
      <input 
        value={query} 
        onChange={e => setQuery(e.target.value)} 
        placeholder="Search products..." 
      />
      {isLoading && <Spinner />}
      <ProductGrid products={results} />
    </div>
  );
}

// ✅ RIGHT — useMediaQuery: respond to viewport breakpoints in React
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false; // SSR-safe
    return window.matchMedia(query).matches;
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);
  
  return matches;
}

// Usage: responsive component logic (not CSS breakpoints — logic that depends on size)
function ResponsiveDataView({ data }: { data: DataItem[] }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Different rendering strategy based on screen size
  return isMobile ? <MobileCards data={data} /> : <DataTable data={data} />;
}

// ✅ RIGHT — useAsync: generic async state machine
// Standardizes loading/error/data pattern across all async operations
type AsyncState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function useAsync<T>(asyncFn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setStatus] = useState<AsyncState<T>>({ status: 'idle' });
  
  useEffect(() => {
    let cancelled = false;
    setStatus({ status: 'loading' });
    
    asyncFn()
      .then(data => { if (!cancelled) setStatus({ status: 'success', data }); })
      .catch(error => { if (!cancelled) setStatus({ status: 'error', error }); });
    
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  
  return state;
}

// Usage: clean async flows with TypeScript discriminated union
function UserSettings({ userId }: { userId: string }) {
  const settingsState = useAsync(
    () => fetchUserSettings(userId),
    [userId] // Re-fetch when userId changes
  );
  
  if (settingsState.status === 'loading') return <SettingsSkeleton />;
  if (settingsState.status === 'error') return <ErrorMessage error={settingsState.error} />;
  if (settingsState.status === 'idle') return null;
  
  // TypeScript knows: settingsState.data is T here (discriminated union)
  return <SettingsForm settings={settingsState.data} />;
}

// ✅ RIGHT — Testing custom hooks in isolation
// Using @testing-library/react's renderHook
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });
  
  it('debounces value changes', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );
    
    rerender({ value: 'updated' });
    expect(result.current).toBe('initial'); // Still initial — timer hasn't fired
    
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('updated'); // Timer fired — debounced value updated
    
    vi.useRealTimers();
  });
  // No component rendering needed — testing logic in complete isolation
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a custom hook and what problem does it solve that you can't solve with regular component composition?"

**Hruday's answer:**
> A custom hook is a function starting with `use` that calls React hooks internally. It extracts STATEFUL LOGIC into a reusable unit.
>
> Component composition (parent passing props to children, render props, etc.) is great for sharing UI structure. But it can't share LOGIC that involves state and effects without wrapping the consuming component in a higher-order component or using render props — which creates wrapper hell in the component tree.
>
> Custom hooks solve this cleanly: the consuming component calls `useDebounce(query, 300)` and gets the debounced value. No wrappers. No extra nodes in the component tree. No props drilling. Each component that uses the hook gets its OWN state instance — they're not shared.
>
> The other thing custom hooks solve: co-location of related logic. A WebSocket subscription that opens on mount, reconnects on user ID change, and closes on unmount is 20 lines spread across a component when written inline. As `useWebSocketSubscription(userId)`, it's a single readable call that communicates intent at a glance.

---

### Q2 — Practical
**Interviewer asks:** "Build `useWindowSize` — a hook that returns the current window width and height and re-renders when the window is resized."

**Hruday's answer:**
> ```typescript
> function useWindowSize() {
>   const [size, setSize] = useState({
>     width: typeof window !== 'undefined' ? window.innerWidth : 0,
>     height: typeof window !== 'undefined' ? window.innerHeight : 0,
>   });
>   
>   useEffect(() => {
>     if (typeof window === 'undefined') return; // SSR guard
>     
>     const handleResize = () => {
>       setSize({ width: window.innerWidth, height: window.innerHeight });
>     };
>     
>     window.addEventListener('resize', handleResize);
>     return () => window.removeEventListener('resize', handleResize);
>   }, []); // Empty deps: attach once, clean up on unmount
>   
>   return size;
> }
> ```
> Three design decisions worth mentioning: First, the SSR guard (`typeof window !== 'undefined'`) — Next.js and other SSR frameworks run components on the server where `window` doesn't exist; this prevents a ReferenceError. Second, the lazy initial state reads `window.innerWidth` at mount time for the initial value — if the component mounts after a resize, it starts with the correct size. Third, the cleanup removes the listener on unmount to prevent memory leaks.
>
> If this needed to handle rapid resize bursts, I'd add a debounce — wrap `handleResize` with a debounced version using `useDebounce` or a timer inside the effect.

---

### Q3 — Design
**Interviewer asks:** "What's the principle behind 'extract logic, not JSX' for custom hooks?"

**Hruday's answer:**
> The principle is about what belongs in a hook vs in a component. Hooks can ONLY return data and callbacks — they can't return JSX directly (well, they technically can, but it breaks the mental model and makes things untestable). The "logic" in a hook is: state management, side effects, computed values, event handling callbacks.
>
> If I'm building a modal, I don't put `<div className="modal-overlay">` inside a hook. But the logic of a modal — `isOpen`, `open()`, `close()`, `toggle()`, focus trap management — belongs in `useModal`. The JSX belongs in a `Modal` component that consumes `useModal`.
>
> Why this matters: hooks are testable with `renderHook` without rendering any UI. If JSX is in the hook, you need to render the component to test it. Pure logic hooks can be tested with simple unit tests: call `open()`, assert `isOpen === true`. No DOM manipulation needed.
>
> In practice, the sign that a hook is doing too much UI: the consuming component has almost no logic of its own — all the component does is render what the hook tells it to. That's fine if the component really is just presentation. But if the hook is selecting between `<div>` and `<span>` based on a state value, the conditional rendering belongs in the component, not the hook.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Custom hooks share state between components" | "I'll make a custom hook to share state across components" | Each component that calls the same hook gets its OWN state instance — hooks are NOT singletons; calling `useCounter()` in ComponentA and ComponentB gives two separate counters; to share state, use React Context + a hook, Zustand, or lift state to a common ancestor; the hook just encapsulates the LOGIC for accessing/updating that shared state |
| "useLocalStorage is safe for sensitive data" | "I use useLocalStorage for the auth token" | Never store auth tokens, session IDs, or sensitive PII in localStorage — it's accessible by any JavaScript on the page (XSS attack vector); use `httpOnly` cookies managed by the server for auth tokens; localStorage is appropriate for non-sensitive preferences (theme, layout settings, draft content); `useSessionStorage` is marginally better (cleared on tab close) but still XSS-vulnerable |
| "Custom hooks are slow because they add function calls" | "Custom hooks have performance overhead from the extra function calls" | Hook function calls are essentially free — JavaScript function call overhead is nanoseconds; the performance cost of hooks is in their dependencies (state comparisons, effect runs, memoization checks) — these exist whether the hook is inline in the component or extracted; a custom hook neither adds nor removes performance cost; the only issue is if a hook is designed with incorrect deps that cause excessive re-renders |
| "You have to use all the return values from a hook" | "`useProductSearch` returns 6 values, I have to destructure all 6" | You only destructure what you need — `const { results, isLoading } = useProductSearch()` is completely valid even if the hook returns 6 items; destructuring only what's needed keeps the component's dependencies clear and doesn't cause extra renders from values you don't use (well, technically the hook state still updates, but the component only uses what it renders with) |

---

## 7. Hruday's Real Experience Hook
> "At SAP, the Fiori Analytics product had 12 different data visualisation components — bar charts, line charts, KPI cards, heat maps. Every one of them had its own `useEffect` for data fetching, its own loading state, its own error handling. When we standardised on a `useAnalyticsDataset(datasetId, filters)` custom hook, 12 components went from 40-60 lines of data-management boilerplate to 1-3 lines.
>
> The hook handled: debouncing the filters before firing the API call (using `useDebounce` internally), AbortController cleanup for in-flight requests on dependency change, standardised loading/error/data state machine, and automatic retrying on 5xx errors with exponential backoff. Tests for the data logic lived in one file — not spread across 12 component test files.
>
> The composition pattern was particularly useful: `useAnalyticsDataset` called `useDebounce`, which called `useState` + `useEffect`. The top-level consumer saw `const { data, isLoading, error } = useAnalyticsDataset(...)` — a single, intention-revealing API for a behaviour that was previously duplicated across the codebase."

---

## 8. Scale Evolution

**Single team project →** Extract the most common side-effect patterns: `useDebounce` for search inputs, `useLocalStorage` for user preferences, `useClickOutside` for dropdowns/modals. These eliminate the boilerplate that shows up in every data-entry feature.

**Multi-team product →** Publish hooks as a shared internal package (monorepo with `@acme/react-hooks`); versioned separately from UI components; exported with TypeScript generics; documented with Storybook or custom usage examples. Hook docs include which teams use them — breaking changes require coordination.

**Organization-wide platform →** Hook composition library with configurable adapters (e.g., `useStorage(key, value, adapter)` where adapter can be `localStorage`, `sessionStorage`, `IndexedDB`, or `cookie` — same hook, different storage backends); hooks that integrate with the company's design system tokens; analytics hooks that automatically track user interactions; A/B testing hooks that integrate with the feature flag service.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Custom hooks for payment flow state (multi-step checkout state machine), input validation hooks, polling hooks for payment status checking (usePaymentStatusPolling with adaptive retry), throttled API hooks for high-frequency operations | Hook design for domain-specific flows; composition of primitives into complex hooks; testing strategy for hooks |
| Swiggy / Meesho | useProductSearch (debounced search + API call), useCart (add/remove/update cart items with optimistic updates), useRestaurantMenu (fetch + cache menu for selected restaurant), useInfiniteScroll (intersection observer + pagination cursor) | Real-world hook design interview; naming conventions; performance of debounced search hooks |
| Adobe / Microsoft | Complex hooks for document state management; useKeyboardShortcuts for document editor; custom hook DSL pattern (hooks with configuration objects); TypeScript generics in hooks; Adobe engineers often ask candidates to live-code a custom hook | Live coding a hook under interview conditions; TypeScript generics; composition of multiple primitives |
| SAP Labs | useAnalyticsDataset used across 12 visualisation components at SAP (real story); debounce + AbortController + retry composition; SAP Fiori design system hooks for portal navigation state; custom hook testing strategy with renderHook | Real production composition story; team standardisation through hooks; SAP-specific architectural patterns |

---

## 10. Related Topics — What to Study Next

- **Topic 210 — All React Hooks** — custom hooks are entirely composed of built-in hooks; `useDebounce` uses `useState` + `useEffect`; `usePrevious` uses `useRef` + `useEffect`; deep understanding of the built-in hooks is the prerequisite; specifically: dependency arrays, cleanup functions, and `useRef` patterns — all used heavily in custom hook implementations
- **Topic 222 — takeUntil Memory Leak Prevention (RxJS)** — both Angular's `takeUntil` and React's custom hook cleanup pattern solve the same problem from different angles: preventing callbacks from firing on unmounted/destroyed components; the parallel between RxJS unsubscription and React's `useEffect` return cleanup is a strong cross-framework insight
- **Topic 221 — switchMap vs mergeMap vs concatMap (RxJS)** — the debounce + cancellation pattern in `useDebounce` + `AbortController` mirrors RxJS's `switchMap` (cancel previous inner Observable when new outer emits); knowing both patterns lets you explain the design philosophy from two angles — useful for teams using both React and Angular
- **Topic 235 — Code Splitting and Lazy Loading** — custom hooks that lazily initialise expensive resources (data grid column definitions, chart configurations) use `useMemo` with lazy initialisation; combining custom hooks with `React.lazy` enables fine-grained control over both when logic loads (hooks) and when UI renders (lazy components)

---

*Part 12 · Custom Hooks — Patterns and Composition · Full Stack Interview Guide · Hruday D · 2026*
