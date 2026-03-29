# 84. Debouncing & Throttling

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Debouncing** delays execution until a burst of events stops — ideal for search inputs where you don't want to fire an API call on every keystroke. **Throttling** limits execution to at most once per time interval — ideal for scroll or resize events where continuous firing would overwhelm the browser. Together they are the primary tools for controlling the rate of expensive operations triggered by high-frequency user events. Without them, a search field fires 50+ API requests per minute of typing; a scroll handler slows animations to a crawl. At senior level, the decision isn't just which technique to use, but understanding the *semantic difference*: debounce says "wait until quiet", throttle says "at most once per interval". Production implementations also handle cancellation, React re-renders, and the subtle correctness issues of closures in event handlers.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Debounce — Implementation Deep Dive

**Core mechanism:**
```typescript
// Every invocation resets the timer
// Function only executes when the timer finally completes (silence period)

function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId);  // Cancel previous timer
    timeoutId = setTimeout(() => {
      fn(...args);            // Execute after silence
    }, delay);
  };
}

// Visual representation:
// User types: H-e-l-l-o (each letter = event, -=300ms)
// Events:  |H---|e--|l--|l--|o--------|
// Timer:   Cancel→Cancel→Cancel→Cancel→FIRE!
// API call: Single call after silence: API("Hello")
```

**Debounce with Cancellation (React-safe):**
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Cleanup: cancel timer if value changes before delay completes
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// Usage: Search input
function SearchInput() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // This query only fires when user stops typing for 300ms
  const { data } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => searchApi.query(debouncedSearch),
    enabled: debouncedSearch.length >= 2, // At least 2 chars
  });
  
  return (
    <input
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      placeholder="Search products..."
    />
  );
}
```

**Debounce with Leading Edge (Fire Immediately, then Pause):**
```typescript
function debounceLeading<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function debounced(...args: Parameters<T>) {
    if (!timeoutId) {
      fn(...args); // Fire immediately on first call
    }
    
    clearTimeout(timeoutId!);
    timeoutId = setTimeout(() => {
      timeoutId = null; // Allow next burst to fire immediately
    }, delay);
  };
}

// Use case: Button with accidental double-click prevention
// First click fires immediately → feels responsive
// Subsequent clicks within 500ms are ignored
```

### Throttle — Implementation Deep Dive

**Core mechanism:**
```typescript
// Ensures function executes at most once per interval
// Unlike debounce: fires on FIRST event, then ignores rest until interval passes

function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastExecuted = 0;
  
  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    
    if (now - lastExecuted >= interval) {
      lastExecuted = now;
      fn(...args);
    }
  };
}

// Visual representation:
// Scroll events: ||||||||||||||||||||||||||||||||||
// Interval:      |----100ms----|----100ms----|
// Executed:      |FIRE         |FIRE         |FIRE
// ~30 events → 3 handler executions
```

**Throttle with Trailing Execution:**
```typescript
// Ensures the last event always fires after the interval
// Important when "final state" matters (e.g., final scroll position)

function throttleTrailing<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastExecuted = 0;
  let trailingTimeoutId: ReturnType<typeof setTimeout>;
  
  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const remaining = interval - (now - lastExecuted);
    
    clearTimeout(trailingTimeoutId);
    
    if (remaining <= 0) {
      lastExecuted = now;
      fn(...args);
    } else {
      // Schedule trailing execution
      trailingTimeoutId = setTimeout(() => {
        lastExecuted = Date.now();
        fn(...args);
      }, remaining);
    }
  };
}
```

**Production Throttle for Scroll (with requestAnimationFrame):**
```typescript
// For visual updates, always sync with browser render cycle
function useScrollThrottle(handler: (scrollY: number) => void) {
  const rafId = useRef<number>(0);
  const savedHandler = useRef(handler);
  
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);
  
  useEffect(() => {
    function handleScroll() {
      cancelAnimationFrame(rafId.current);
      
      rafId.current = requestAnimationFrame(() => {
        savedHandler.current(window.scrollY);
      });
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);
}

// Usage: Sticky header
function StickyHeader() {
  const [isSticky, setIsSticky] = useState(false);
  
  useScrollThrottle((scrollY) => {
    setIsSticky(scrollY > 80);
  });
  
  return (
    <header className={isSticky ? 'sticky' : ''}>
      {/* header content */}
    </header>
  );
}
```

### React-Specific Patterns

**The Stale Closure Problem with useCallback:**
```typescript
// ❌ Common mistake — stale closure inside debounce
function SearchComponent({ onSearch }) {
  // onSearch changes on every parent render
  // But debounced version captures OLD onSearch from first render
  const debouncedSearch = useCallback(
    debounce((query) => onSearch(query), 300),
    [] // ❌ Empty deps → stale closure!
  );
}

// ✅ Use useRef to always call latest version
function SearchComponent({ onSearch }) {
  const onSearchRef = useRef(onSearch);
  
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);
  
  const debouncedSearch = useRef(
    debounce((query) => onSearchRef.current(query), 300)
  ).current;
  
  return <input onChange={(e) => debouncedSearch(e.target.value)} />;
}
```

**AbortController with Debounce (Critical for Search):**
```typescript
function useSearchQuery(searchTerm: string) {
  const debouncedTerm = useDebounce(searchTerm, 300);
  
  return useQuery({
    queryKey: ['search', debouncedTerm],
    queryFn: async ({ signal }) => {
      // signal is AbortController signal from React Query
      // Automatically cancelled when debouncedTerm changes
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedTerm)}`,
        { signal } // Pass signal to cancel in-flight requests
      );
      return response.json();
    },
    enabled: debouncedTerm.length >= 2,
  });
  
  // React Query automatically cancels previous query when key changes
  // So if debounced value changes, in-flight request is cancelled ✅
}
```

### Performance Implications

**Without debounce (search input analysis):**
```
User types "javascript" (10 chars, each 150ms apart)
= 10 API requests in 1.5 seconds
= 10 concurrent in-flight requests
= Race condition: old responses arriving after new ones
= Backend: 10× load for 1 meaningful query
= User sees flickering results as each response arrives
```

**With 300ms debounce:**
```
User types "javascript" (each 150ms apart)
= 0 API requests during typing (300ms > 150ms)
= 1 API request fires 300ms after last keystroke
= Backend: 1× load
= User sees stable loading state, then final results
= No race condition (single request)
```

**When NOT to Debounce:**
```typescript
// ❌ Debouncing button clicks that submit forms
// User expects immediate response to click
// If click doesn't respond instantly → user clicks again → double submission
// Use loading state + disabled instead:

function SubmitButton({ onSubmit }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <button onClick={handleClick} disabled={isSubmitting}>
      {isSubmitting ? 'Saving...' : 'Save'}
    </button>
  );
}
```

### Choosing Debounce vs Throttle

```
Event Type                | Pattern    | Why
--------------------------|------------|------------------------------------------
Search input              | Debounce   | Wait for typing pause → single clean query
Form auto-save            | Debounce   | Save after user stops editing, not every char
Validation while typing   | Debounce   | Show error after pause, not mid-word
Window resize             | Throttle   | Update layout ~60fps, not 1000fps
Scroll handler            | Throttle/RAF| Visual update needs frame-sync
Mouse move                | Throttle   | ~60fps is enough for tooltip position
Drag events               | Throttle/RAF| Frame-sync for smooth visual
Button/link click         | Neither    | Instant; use disabled state for prevention
Websocket messages        | Throttle   | Process real-time updates at bounded rate
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Google Search Autocomplete:**
- 300ms debounce on search input
- Leading edge: show spinner immediately, debounce the actual API call
- AbortController cancels previous request when debounce fires again
- At 1B users: Without debounce, each user generates 5-10× more load

**Microsoft Excel/Teams (Your Target):**
- Auto-save in Excel Online: debounces 2000ms on cell edits
- Teams typing indicator: throttled — shows "User is typing" at max once per 3s
- Teams message search: 300ms debounce, AbortController cancels race conditions

**Bosch Dashboard (Your Experience):**
- WebSocket message processing: throttled at 100ms for UI updates
- Real-time sensor data arriving at 50Hz → throttled to 10Hz for chart updates
- Prevents React from re-rendering at 50fps causing jank

**SAP Fiori SmartFilter:**
- Search field: 500ms debounce (enterprise apps prefer stability over speed)
- Table sort triggers: No debounce needed (click events aren't high-frequency)

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Debounce and throttle are both rate-limiting techniques but with different semantics. Debounce says 'wait until the event stream stops, then fire once' — perfect for search inputs because you only want to query when the user pauses typing. Throttle says 'fire at most once per interval regardless of how many events arrive' — perfect for scroll handlers because you want continuous updates but at a controlled rate.
>
> In React, the cleanest implementation for debouncing search is a `useDebounce` hook that returns a delayed copy of the value — when this changes, React Query fires the query. The key production concern is AbortController: React Query's `queryFn` receives a signal that cancels in-flight requests when a new debounced value arrives, preventing race conditions where a slow previous request's response overwrites a faster new one.
>
> For scroll performance, I sync with `requestAnimationFrame` rather than a time-based throttle — this ensures visual updates happen at exactly the browser's render cadence (60fps) rather than potentially in between frames. At Bosch, our real-time dashboard was receiving WebSocket messages at 50Hz; throttling the UI updates to 10Hz kept the charts smooth without the CPU overhead of rendering at sensor frequency."

**Likely Follow-up Questions:**
- "What's the difference between debounce and throttle leading vs trailing?" → Leading: fires immediately, blocks subsequent. Trailing: waits for silence then fires. Debounce is typically trailing; throttle typically leading.
- "How do you cancel debounced calls on component unmount?" → Return a `cancel()` method from debounce; call in useEffect cleanup. Or use React Query which manages this automatically.
- "Is there a time debounce is wrong?" → Yes: button clicks and form submits — use disabled state instead. Users interpret no-response as broken.
- "What's the ideal debounce delay for search?" → 150-300ms. 150ms feels instant; 300ms is safe for most network conditions. Auto-save: 500-2000ms depending on save cost.

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

**Production Search with Debounce + AbortController + React Query:**

```typescript
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// components/SearchBar.tsx
export function SearchBar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['search_suggestions', debouncedQuery],
    queryFn: async ({ signal }) => {
      if (!debouncedQuery.trim()) return [];
      
      const res = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`,
        { signal } // Cancelled automatically by React Query on key change
      );
      if (!res.ok) throw new Error('Search failed');
      return res.json() as Promise<SearchSuggestion[]>;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000, // Cache suggestions 30s
  });
  
  return (
    <div role="combobox" aria-expanded={!!suggestions?.length}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        placeholder="Search..."
      />
      
      {isLoading && <SearchSpinner />}
      
      {suggestions && suggestions.length > 0 && (
        <ul id="search-suggestions" role="listbox">
          {suggestions.map(suggestion => (
            <li key={suggestion.id} role="option">
              {suggestion.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**DT Framework:**
- **D**ebounce = **D**elay until Quiet (search input, auto-save)
- **T**hrottle = **T**ime limit (scroll, resize, mouse move)

**Rule of thumb:** Can the user *see* the in-between states?
- Yes → Throttle (visual feedback at controlled rate)  
- No → Debounce (final value is all that matters)

If you blank: *"Debounce waits for the user to stop. Throttle fires at a maximum rate. Debounce for search — I want one clean query. Throttle for scroll — I want continuous but controlled updates."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Unthrottled scroll = jank. Undebounced search = flickering results, race conditions  
→ **Performance**: 10× reduction in API calls from keyboard search; 50× reduction in scroll handler work  
→ **Business**: Server cost reduction proportional to debounce effectiveness at millions of users

**How it works:**
→ Debounce uses a timeout that resets on each invocation — only when the timeout completes without being reset does the function execute. Throttle tracks the last execution timestamp — if less than the interval has passed, the invocation is ignored. In React, `useDebounce` returns a derived state value that only updates after the delay, feeding into React Query's query key to trigger fetches at the controlled rate.

**Company relevance:**
→ **Microsoft**: Azure portal search, Teams message search — all debounced at 200-300ms  
→ **Adobe**: Asset search in Creative Cloud — debounced + AbortController race condition prevention  
→ **Salesforce**: Global search — debounced, with leading-edge spinner for immediate visual feedback  
→ **Cisco**: Network analytics dashboard — throttled real-time updates matching chart render capability
