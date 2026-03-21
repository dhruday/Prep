# 155. Debouncing & Throttling (API Calls)
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Debouncing and throttling are two distinct techniques for limiting the rate of function execution. Debouncing delays execution until a quiet period has passed — the function only fires N milliseconds after the last call; this is ideal for search inputs, autocomplete, and live validation where you only want to act on the final settled value. Throttling fires at most once per N milliseconds regardless of call frequency — the function executes on its own clock; this is ideal for scroll events, resize handlers, and analytics batching where you need periodic samples rather than only the final value. The distinction matters for API calls: debounce prevents firing an API call for every keystroke in a search box (only the final query is sent); throttle ensures a scroll-based analytics event fires at most once per second even if the scroll event fires 60 times per second.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Implementing Debounce from Scratch

```typescript
// Debounce: delay execution until N ms after the LAST call
// Clears and restarts the timer on every invocation
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };
}

// With cancel method (needed for cleanup in React useEffect)
function debounceWithCancel<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}

// Usage in React — WRONG way:
// Recreates the debounced function on every render → no debouncing actually occurs
function SearchBad({ onSearch }: { onSearch: (q: string) => void }) {
  const handleChange = debounce((q: string) => onSearch(q), 300); // ← recreated every render
  return <input onChange={e => handleChange(e.target.value)} />;
}

// CORRECT way: use useCallback or useMemo to stabilize the debounced reference
function SearchCorrect({ onSearch }: { onSearch: (q: string) => void }) {
  const debouncedSearch = useCallback(
    debounceWithCancel((q: string) => onSearch(q), 300),
    [onSearch]  // Only recreate if onSearch changes
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();  // Cancel pending call on unmount
  }, [debouncedSearch]);

  return <input onChange={e => debouncedSearch(e.target.value)} />;
}
```

### Implementing Throttle from Scratch

```typescript
// Throttle: fire at most once per N ms
// Leading edge: fires immediately, then waits N ms before allowing another
// Trailing edge: fires N ms after first call, resets
function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number,
  options: { leading?: boolean; trailing?: boolean } = { leading: true, trailing: false }
): (...args: Parameters<T>) => void {
  let lastCalledAt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    const remaining = interval - (now - lastCalledAt);

    lastArgs = args;

    if (remaining <= 0) {
      // Enough time has passed — call immediately (leading)
      if (timer !== null) { clearTimeout(timer); timer = null; }
      lastCalledAt = now;
      if (options.leading !== false) fn(...args);
    } else if (options.trailing !== false && timer === null) {
      // Schedule trailing call
      timer = setTimeout(() => {
        lastCalledAt = Date.now();
        timer = null;
        if (lastArgs) fn(...lastArgs);
      }, remaining);
    }
  };
}
```

### React Custom Hooks

```typescript
// useDebounce — debounces a VALUE (not a function)
// Component re-renders with the debounced value 300ms after the last change
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage: search input — queryKey only changes 300ms after user stops typing
function ProductSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', 'search', debouncedQuery],  // ← debounced queryKey
    queryFn: ({ signal }) => api.products.search(debouncedQuery, signal),
    enabled: debouncedQuery.length >= 2,  // Don't search for empty or 1 char
    staleTime: 60_000,
  });

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search products…"
        aria-label="Search products"
      />
      {/* Show spinner while user is typing OR while fetching */}
      {(query !== debouncedQuery || isFetching) && (
        <SearchSpinner />
      )}
      <SearchResults
        items={data?.items ?? []}
        isLoading={isLoading}
        query={debouncedQuery}
      />
    </div>
  );
}
```

### React's Built-in Alternative: `useDeferredValue`

```typescript
// useDeferredValue — React's native way to defer a value
// Works with concurrent rendering: React renders the deferred value at lower priority
// Does NOT prevent the network call (unlike debounce), but prevents the UI from blocking

function ProductSearch() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);  // Lags behind query during busy renders

  const isStale = deferredQuery !== query; // True while React is catching up

  const { data } = useQuery({
    queryKey: ['products', 'search', deferredQuery],
    queryFn: ({ signal }) => api.products.search(deferredQuery, signal),
    enabled: deferredQuery.length >= 2,
  });

  return (
    <div style={{ opacity: isStale ? 0.6 : 1 }}>  {/* Visual stale indicator */}
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <SearchResults items={data?.items ?? []} />
    </div>
  );
}

// useDeferredValue vs useDebounce:
// useDebounce: delays the QUERY (reduces network calls) — better for API optimization
// useDeferredValue: delays the RENDERING (reduces jank) — better for heavy UI renders
// For API calls, useDebounce is almost always the right tool
```

### Throttle for Scroll Analytics

```typescript
function useScrollDepthTracking() {
  const maxDepthReached = useRef(0);

  useEffect(() => {
    const trackScroll = throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const depth = Math.round((scrollTop / docHeight) * 100);

      if (depth > maxDepthReached.current) {
        maxDepthReached.current = depth;

        // Only fire analytics at 25%, 50%, 75%, 100%
        const milestones = [25, 50, 75, 100];
        const milestone = milestones.find(m => depth >= m && maxDepthReached.current < m);
        if (milestone) {
          analytics.track('scroll_depth_reached', { depth: milestone });
        }
      }
    }, 1000);  // Throttle: sample at most once per second

    window.addEventListener('scroll', trackScroll, { passive: true });
    return () => window.removeEventListener('scroll', trackScroll);
  }, []);
}
```

### Canceling In-Flight Requests with Debounce

```typescript
// Problem: debounce fires the function 300ms after last keystroke
// But the PREVIOUS request may still be in-flight from 400ms ago
// If the previous request resolves AFTER the current one → stale data overwrites fresh

// Solution: AbortController on every request, cancel previous on new debounce fire

function useSearchWithAbort(delay = 300) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    debounceWithCancel(async (q: string) => {
      // Cancel previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      if (!q) { setResults([]); return; }

      setIsLoading(true);
      try {
        const data = await api.products.search(q, abortRef.current.signal);
        setResults(data.items);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return; // Intentional cancel
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, delay),
    [delay]
  );

  // Prefer TanStack Query version (handles abort automatically via signal in queryFn)
  // Manual AbortController is only needed outside of TanStack Query

  useEffect(() => {
    return () => search.cancel();
  }, [search]);

  return { query, setQuery: (q: string) => { setQuery(q); search(q); }, results, isLoading };
}
```

### Debounce Delay Guidelines

```typescript
// Delay selection depends on user context:

const DEBOUNCE_DELAYS = {
  // Search/autocomplete: 150–300ms
  //   < 150ms: often fires on keypress noise (autocorrect, IME)
  //   > 350ms: perceptibly slow; users notice the lag
  SEARCH_INPUT: 300,

  // Form validation (email, phone): 500–800ms
  //   Long enough that user has finished typing the field value
  //   Short enough to show error before they tab to next field
  FORM_VALIDATION: 600,

  // Auto-save (drafts, rich text): 1000–2000ms
  //   User must have paused intentionally; don't save on every keystroke
  //   Combined with "Saving…" / "Saved" indicator
  AUTOSAVE: 1500,

  // Window resize (recompute layout): 200ms
  //   Resize is continuous; recompute only when resize is done (briefly)
  WINDOW_RESIZE: 200,

  // API-driven filter (debounce entire filter object): 300ms
  //   Same as search — wait for settled value
  FILTER_CHANGE: 300,
};
```

### ⚠️ Anti-Patterns

- **Creating debounced function inside render** — if `debounce(fn, 300)` is called inside a component body or render method, a new debounced function is created on every render, clearing the timer on every render, effectively providing zero debouncing

- **Not cleaning up on unmount** — if the debounced timer fires after the component unmounts, the callback may call `setState` on an unmounted component or attempt to update stale state; always call `debouncedFn.cancel()` in `useEffect` cleanup

- **Using throttle where debounce is correct** — typeahead search with throttle fires every 500ms as the user types; the user sees results flicker for "h", "he", "hel", "hell", "hello" in succession; debounce correctly fires only for "hello" after the user pauses

- **Not showing visual feedback during debounce delay** — if a user types "hello" and nothing happens for 300ms, they may think the input is broken; show a subtle loading indicator as soon as the raw query changes (before debounced query updates)

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the global supplier search field was firing an API call on every keystroke — 400ms average query time × 8 keystrokes per search = 3.2 seconds of accumulated server load per search session across thousands of concurrent users. Added 300ms debounce with `useDebounce` hook + immediate visual feedback (spinner on raw query change). API call count dropped 85%; P95 search response time dropped from 1.8s to 200ms because concurrent requests no longer fought for DB connection pool slots.

**At FAANG scale:**
- **Microsoft:** VS Code's symbol search (`Ctrl+P @`) — debounced at 150ms with AbortController; each new character cancels the previous search; used `useDeferredValue` equivalent (Electron/Node stream cancellation) to avoid blocking the UI thread on large workspace indexes
- **Adobe:** Photoshop Express adjustment sliders (cloud-processed filters) — throttled at 100ms; without throttle, every 1px slider movement would queue a cloud processing request; throttle batches them into max 10 requests/second
- **Salesforce:** Report builder field search — debounced at 400ms; field metadata API is slow (200–800ms); debounce reduced server calls by 90% and eliminated timeout errors from concurrent metadata requests
- **Cisco:** Network topology search — throttled at 500ms for live topology updates while typing; graph re-renders are expensive (D3 force layout recalculation); throttle keeps the UI responsive

---

## 💬 4. Interview Execution

### Sample Answer

> "Debounce and throttle solve different problems. Debounce says 'only fire after X milliseconds of quiet' — I use this for search inputs because I only want to hit the API when the user has stopped typing, not on every keystroke. Throttle says 'fire at most once per X milliseconds' — I use this for scroll events and resize handlers because I need periodic samples, not silence-detection.
>
> In React, the key implementation detail is stability. A common mistake is calling `debounce(fn, 300)` inside the component body — this creates a new debounced function on every render, resetting the timer every render, so no debouncing actually fires. The fix is `useCallback` or `useMemo` to stabilize the debounced function reference.
>
> I also always clean up in `useEffect` return — if the component unmounts before the debounce timer fires, I need to call `.cancel()` to prevent a state update on an unmounted component or a stale fetch from resolving.
>
> For search specifically, I also pass an `AbortController.signal` to the `fetch` call so that if the user types again before the previous request completes, the previous in-flight request is cancelled — preventing a stale response from overwriting a fresh one."

### Likely Follow-up Questions
1. "What's the difference between leading-edge and trailing-edge debounce?" → Leading: fires immediately on the first call, then silences for N ms; good for click handlers where you want instant first response but prevent double-click spam. Trailing: fires N ms after the last call; good for search where you want the settled value
2. "How does React's `useDeferredValue` differ from `useDebounce`?" → `useDeferredValue` is a React concurrent rendering hint — it tells React to render the deferred value at lower priority so urgent updates (like the input changing) aren't blocked; it does NOT reduce network calls. `useDebounce` is a timing mechanism that delays state changes to reduce the number of API calls. For network optimization, use `useDebounce`; for render performance, `useDeferredValue`
3. "Why would you cancel in-flight requests in debounced search?" → If the user types quickly and the debounce fires multiple times, you can have several in-flight requests. If request #2 resolves before request #3, when request #3 resolves it shows request #3 results — correct. But if request #3 resolves before request #2 (due to response size or server queuing), request #2 will overwrite request #3's results with stale data. `AbortController` prevents this by aborting request #2 when request #3 starts

### vs Alternatives

| Technique | Fires at | Best for | Risk of missing calls |
|---|---|---|---|
| Debounce | N ms after LAST call | Search input, autosave, form validation | Yes — if calls are too frequent, later ones cancel earlier |
| Throttle | At most 1× per N ms | Scroll, resize, analytics | No — always fires periodically |
| `useDeferredValue` | Next concurrent render cycle | Heavy re-renders | No — all values are eventually rendered |
| Request deduplication | On identical in-flight keys | Parallel component mounts | N/A — deduplication, not rate limiting |

---

## 💻 5. Code Example (TypeScript)

```typescript
// Production useDebounce and useThrottle hooks

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export function useThrottle<T>(value: T, interval: number): T {
  const [throttled, setThrottled] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdated.current >= interval) {
      lastUpdated.current = now;
      setThrottled(value);
    } else {
      const remaining = interval - (now - lastUpdated.current);
      const id = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottled(value);
      }, remaining);
      return () => clearTimeout(id);
    }
  }, [value, interval]);

  return throttled;
}

// Advanced: debounced search with TanStack Query + abort signal + visual feedback
function SupplierSearch() {
  const [rawQuery, setRawQuery] = useState('');
  const debouncedQuery = useDebounce(rawQuery, 300);
  const isDebouncing = rawQuery !== debouncedQuery;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['suppliers', 'search', debouncedQuery],
    queryFn: ({ signal }) =>
      api.suppliers.search({ q: debouncedQuery, signal }),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,     // Cache results for 30 seconds
    gcTime: 5 * 60_000,   // Keep in GC for 5 minutes (back-navigation cache hit)
  });

  const showSpinner = isDebouncing || isFetching;

  return (
    <div role="search">
      <div style={{ position: 'relative' }}>
        <input
          type="search"
          value={rawQuery}
          onChange={e => setRawQuery(e.target.value)}
          placeholder="Search suppliers…"
          aria-label="Search suppliers"
          aria-busy={showSpinner}
        />
        {showSpinner && <SearchSpinner aria-hidden="true" />}
      </div>

      {debouncedQuery.length < 2 ? (
        <p>Type at least 2 characters to search</p>
      ) : isLoading ? (
        <SearchResultsSkeleton />
      ) : (
        <SearchResults
          items={data?.items ?? []}
          query={debouncedQuery}
          total={data?.total}
        />
      )}
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**DT rule: Delay vs Time**
- **D**ebounce → **D**elay after last action (search input: wait for pause)
- **T**hrottle → **T**ime-based rate (scroll: max once per second)

**"The Patience vs The Metronome":**
- Debounce is **patient** — it waits until you stop before acting
- Throttle is a **metronome** — it ticks on its own schedule regardless of input volume

**The Fatal React Mistake:**
- `debounce(fn, 300)` inside render body = ZERO debounce (recreated every render)
- Fix: `useCallback(debounce(fn, 300), [fn])` + `cleanup: cancel()`

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ A search input without debounce sends N API calls for N keystrokes — a user typing "microsoft azure" (15 chars) creates 15 serial requests, each potentially 200–400ms, consuming 15 DB connections, 15 authentication validations, and 15 API server threads simultaneously; debounce reduces this to 1 request at the cost of 300ms of perceived latency — a net win that also happens to protect the backend from unintentional self-DDoS
→ The reference-stability mistake (creating a new debounced function in render) is extremely common and completely defeats the purpose — it's subtle because the input still works correctly, it just fires on every keystroke; the bug is invisible until you add server-side logging and see 15 requests per search
→ Throttle is the correct tool for continuous signals (scroll, resize, mousemove) where you need periodic samples but where missing intermediate values is acceptable; using debounce on a scroll handler would mean the scroll event fires 0 times during scrolling and once after the user stops — completely wrong for scroll-triggered effects that need to update during scroll

**How it works (2 sentences):**
Debounce works by storing a `setTimeout` reference in a closure — on each invocation, it clears the previous timer (if any) and starts a new one; the wrapped function only executes when the timer fires without being cleared, which happens N milliseconds after the last invocation.
Throttle works by comparing `Date.now()` against the timestamp of the last successful execution — if `now - lastExecuted < interval`, the call is either dropped (leading-only throttle) or queued for the remaining time (trailing throttle); this guarantees the function executes at most once per interval regardless of invocation frequency.

---
✅ Topic 155/486 complete → Continuing to Topic 156: Parallel vs Sequential API Calls
