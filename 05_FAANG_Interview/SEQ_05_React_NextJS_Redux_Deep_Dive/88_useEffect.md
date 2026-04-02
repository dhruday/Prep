# 88. useEffect — Dependency Array Rules, Cleanup, Common Mistakes
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`useEffect` synchronises a component with an external system — a DOM API, a WebSocket, an analytics service, a timer. It runs after every commit where its dependencies changed. The dependency array determines when the effect re-runs: `[]` means once on mount/cleanup on unmount, `[dep1, dep2]` means re-run when either changes, no array means re-run after every render. The most important rules: every value from the component scope that is used inside the effect must be in the deps array (exhaustive deps). When that's impractical, restructure the code — use functional `setState`, move objects/functions outside the component or into `useMemo`/`useCallback`, or use a ref. Every effect that sets up a resource must return a cleanup function. Missing cleanup is a memory leak; wrong cleanup is a race condition.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What `useEffect` Does

`useEffect` registers a "passive effect" that React runs after the browser paints. It does NOT run during render. It does NOT block paint. It IS the place to:
- Subscribe to external event sources (WebSocket, EventEmitter, ResizeObserver)
- Set up/tear down timers
- Fetch data (though libraries like React Query are preferred)
- Sync state to external store (localStorage, URL)
- Animate with imperative libraries (GSAP, Three.js)

It is NOT the place to:
- Transform data for rendering (use `useMemo`)
- Trigger state that can be derived from existing state (avoid `setState` in effects when possible)
- DOM measurement that must happen before paint (use `useLayoutEffect`)
- Event handlers (use the event handler directly)

### Dependency Array Rules

The exhaustive-deps ESLint rule enforces these. Violations cause stale closure bugs:

**Rule 1: Include ALL values from the component scope used inside the effect**

```typescript
function SearchResults({ query, userId }: { query: string; userId: string }) {
  const [results, setResults] = useState<Result[]>([]);

  // ❌ Missing deps
  useEffect(() => {
    fetchResults(query, userId).then(r => setResults(r));
  }, [query]);  // userId is used but not in deps — if userId changes, effect doesn't re-run
                // user sees wrong user's results for `query`

  // ✅ All used values in deps
  useEffect(() => {
    fetchResults(query, userId).then(r => setResults(r));
  }, [query, userId]);  // both included — correct behavior
}
```

**Rule 2: Stable values don't need to be in deps**

Values that are guaranteed stable across renders are safe to use without including them as deps:
- `useState`'s `setState` function (always stable reference)
- `useReducer`'s `dispatch` function (always stable reference)
- `useRef`'s `.current` ref object itself (the ref object, not its `.current` content)
- Functions defined outside the component (module-level)
- Constants (they don't change)

```typescript
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(prev => prev + 1);  // setCount is STABLE — not needed in deps
    }, 1000);
    return () => clearInterval(id);
  }, []);  // [] is correct here — setCount is stable, no other deps
}
```

**Rule 3: Objects and functions created in render are NOT stable**

```typescript
function Component({ config }) {
  // ❌ options is a new object on EVERY render — effect runs on every render
  const options = { timeout: config.timeout, retry: config.retries };
  useEffect(() => {
    startService(options);
    return () => stopService();
  }, [options]);  // [options] effectively means [new object every render] = always runs

  // ✅ Option A: Include only primitive values
  useEffect(() => {
    startService({ timeout: config.timeout, retry: config.retries });
    return () => stopService();
  }, [config.timeout, config.retries]);  // primitives — only re-run when they change

  // ✅ Option B: useMemo to stabilise the object (if object must be passed)
  const stableOptions = useMemo(() => ({
    timeout: config.timeout, retry: config.retries
  }), [config.timeout, config.retries]);
  useEffect(() => {
    startService(stableOptions);
    return () => stopService();
  }, [stableOptions]);  // stableOptions only changes when config values change
}
```

### Cleanup: When, Why, and How

Cleanup runs:
1. Before the effect re-runs (when deps change)
2. When the component unmounts

The ORDER: `cleanup(prev)` → `setup(new)`. Not `setup` → `cleanup`.

```
Mount:         setup1() runs → [renders] → cleanup1() → setup2() → ...
Dep change:    cleanup_old() → setup_new()
Unmount:       cleanup_last()
```

**Common cleanup patterns:**

```typescript
// Timer cleanup
useEffect(() => {
  const id = setTimeout(action, 3000);
  return () => clearTimeout(id);
}, [action]);

// Subscription cleanup
useEffect(() => {
  const subscription = observable.subscribe(handler);
  return () => subscription.unsubscribe();
}, [observable, handler]);

// Abort controller for fetch
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then(r => r.json())
    .then(data => setData(data))
    .catch(err => {
      if (err.name !== 'AbortError') setError(err);
      // AbortError is expected when deps change — not a real error
    });
  return () => controller.abort();
}, [url]);  // When url changes: abort previous fetch, start new one

// EventListener cleanup
useEffect(() => {
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [onClose]);
```

### The Race Condition Pattern — Fetch and Stale Responses

```typescript
// ❌ RACE CONDITION: Older requests can resolve after newer ones
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    fetch(`/api/search?q=${query}`)
      .then(r => r.json())
      .then(data => setResults(data));
      // If user types rapidly: query="a", "ab", "abc"
      // Request for "a" takes 500ms
      // Request for "abc" takes 100ms — sets results = abc results
      // Then "a" request resolves — OVERWRITES abc results with "a" results!
      // User sees wrong results
  }, [query]);
}

// ✅ Race condition fixed with abort controller
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;  // double guard against race condition

    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (isActive) setResults(data);  // only update if this effect is still active
      })
      .catch(err => {
        if (err.name !== 'AbortError' && isActive) setError(err);
      });

    return () => {
      controller.abort();  // cancel the in-flight request
      isActive = false;    // ensure stale response doesn't update state
    };
  }, [query]);
}
```

### Common Mistakes — Categorised

**Mistake 1: Omitting dependencies (stale closures)**
Already covered — use the `eslint-plugin-react-hooks` exhaustive-deps rule diligently.

**Mistake 2: Object/function dependencies causing infinite loops**

```typescript
// ❌ Infinite loop: options is new every render → effect runs → setState → render → new options → ∞
function Component() {
  const [data, setData] = useState(null);
  const options = { filter: 'active' };  // new object every render

  useEffect(() => {
    fetchData(options).then(d => setData(d));
  }, [options]);  // [new object] on every render → re-runs every render → setState → re-render → ∞
}

// Solutions:
// A: Move object outside component (if it's static)
const STATIC_OPTIONS = { filter: 'active' };

// B: Use primitive deps
useEffect(() => { fetchData({ filter: 'active' }); }, []);  // [] if truly static

// C: useMemo the object
const options = useMemo(() => ({ filter: activeFilter }), [activeFilter]);
```

**Mistake 3: Functions as dependencies**

```typescript
// ❌ onMessage is new every render → subscription re-created every render
function Chat({ onMessage }: { onMessage: (msg: string) => void }) {
  useEffect(() => {
    const ws = new WebSocket('wss://chat');
    ws.onmessage = (e) => onMessage(e.data);
    return () => ws.close();
  }, [onMessage]);  // onMessage might be new every render...
}

// ✅ useCallback stabilizes the function reference
function Parent() {
  const [messages, setMessages] = useState<string[]>([]);
  const handleMessage = useCallback((msg: string) => {
    setMessages(prev => [...prev, msg]);
  }, []);  // [] — stable function reference across renders

  return <Chat onMessage={handleMessage} />;
}
```

**Mistake 4: Not cleaning up subscriptions → memory leaks**

```typescript
// ❌ Subscription accumulates on hot-reload, tab hide/show, Strict Mode double-mount
function NotificationPanel() {
  useEffect(() => {
    notificationService.subscribe(handleNotification);
    // No return → NO CLEANUP
    // Every mount adds a subscription, none ever removed
    // After 10 navigations away and back: 10 subscriptions
  }, []);
}
```

**Mistake 5: Setting state on unmounted component (async effects)**

```typescript
// This used to cause "Warning: Can't perform a React state update on an unmounted component"
// (React 17 and earlier). React 18 removed the warning but the pattern is still wrong.
function Component() {
  const [data, setData] = useState(null);

  useEffect(() => {
    slowFetch().then(data => {
      // ❌ If component unmounted before fetch resolved, this is a no-op in React 18
      // but can cause bugs if the component was remounted with different state
      setData(data);
    });
    // return cleanup that handles unmount
  }, []);
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At Bosch, the real-time sensor dashboard had a critical race condition: when switching between sensor views, the old sensor's GraphQL subscription cleanup wasn't happening before the new subscription was set up (missing return cleanup). After browsing between 5 sensors, there were 5 active subscriptions all calling `setState` on the visible component. This caused both memory leaks and incorrect state (old sensor data overwriting new sensor data). Fix: return `() => subscription.unsubscribe()` in the useEffect cleanup. The pattern was added to team code standards.

At Oracle, a search feature wasn't using AbortController, causing the classic race condition where typing "Oracle" quickly would occasionally flash "Or" results before showing "Oracle" results (the "Or" fetch happened to resolve last). Adding AbortController in the useEffect cleanup fixed the correctness issue.

**At FAANG scale:**
- **Microsoft (Graph API Explorer):** Multiple concurrent API requests with cleanup — abort controllers cancel in-flight requests when the user changes API endpoint before response arrives; prevents stale API responses from populating wrong fields
- **Adobe (Bridge Web):** File browser with preview — thumbnail generation effect uses cleanup to cancel pending canvas renders when the user scrolls past a thumbnail before it renders; prevents 100+ pending canvas ops from stacking up
- **Salesforce (Record Page):** Real-time activity feed — WebSocket subscription cleanup ensures disconnection from one record's activity feed before subscribing to the next when navigating between records; eliminates activity cross-pollination bug
- **Cisco (Security Dashboard):** Threat monitor with AbortController — rapid filter changes cancel previous threat queries; prevents stale threat data from the previous filter momentarily appearing in current filter results

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "useEffect is for synchronising with external systems — not for transforming data (that's computation in render or useMemo), not for event handlers (those go directly on the element), not for DOM measurement before paint (that's useLayoutEffect).
>
> The deps array rule: every reactive value used in the effect body must be in the deps array. Reactive values are: props, state, context values, and anything derived from them inside the component. The stable exceptions are: setState, dispatch, and refs — these won't change across renders.
>
> Objects and functions created inside render are new references on every render, so including them in deps causes infinite loops. The fix is to extract primitives from objects as deps, or to memoize the object with useMemo.
>
> Every effect that acquires a resource must return a symmetric cleanup function. The three critical patterns: AbortController for fetch requests to handle rapid dep changes without race conditions; unsubscribe for event subscriptions to prevent duplicate handlers on re-mount; clearTimeout/clearInterval for timers. Missing cleanup is a memory leak; stale async callbacks are a race condition."

### Likely Follow-up Questions

1. **What's the difference between `[]`, `[dep]`, and no array?** → `[]`: runs once after mount, cleanup runs on unmount. `[dep]`: runs on mount AND whenever `dep` changes (by `Object.is`), cleanup runs before each re-run and on unmount. No array: runs after every render — rarely what you want; usually indicates you're missing deps tracking.
2. **Can you call `async` functions directly in `useEffect`?** → No — `useEffect` must return either nothing or a cleanup function. Async functions return Promises. If you return a Promise from `useEffect`, React ignores it but it can cause stale state issues. The pattern: define the async function inside the effect and call it immediately: `useEffect(() => { async function load() { ... } load(); }, [deps])`.
3. **Why should you not rely on `useEffect` for data fetching?** → `useEffect` data fetching has many pitfalls: no deduplication (multiple components fetching same data), no caching, no loading state management, no error boundaries, and requires careful AbortController handling. Libraries like React Query, SWR, and RTK Query solve all of these. They also handle the concurrent mode challenges of effects. `useEffect` for data fetching is acceptable for learning and simple cases, but production apps should use a dedicated data fetching library.
4. **What is the `eslint-plugin-react-hooks` rule about?** → The `react-hooks/exhaustive-deps` rule statically analyzes your `useEffect` and other hooks and warns when: (a) a value used inside is missing from deps — stale closure risk; (b) a value in deps isn't used inside the effect — unnecessary trigger. It's a linting rule but should be treated as a compiler error — practically every `// eslint-disable-next-line react-hooks/exhaustive-deps` comment hides a real bug or forces a refactoring to think through.

### Senior Signal

> "I've learned that when you want to suppress the exhaustive-deps rule, it's almost always a signal that the component design needs to change. Usually it means either: the dependency is intentionally read-once (and belongs in a ref, not state/props), or the object/function in deps is unstable and should be memoized, or the effect is doing too much and should be split. In my experience, the right response to 'I need to disable exhaustive-deps here' is not to disable it, but to step back and ask what the effect is really conceptually doing and whether the data flow is designed correctly."

---

## 💻 5. Code Example

```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ========================
// 1. Complete effect patterns: timer, subscription, fetch
// ========================
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);  // cleanup cancels timer on each value change
  }, [value, delay]);
  return debounced;
}

// ========================
// 2. AbortController + race condition prevention
// ========================
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SearchResult[]>;
      })
      .then(data => {
        setResults(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setLoading(false);
        }
        // AbortError: this effect was cleaned up — normal, not an error
      });

    return () => {
      controller.abort();
      // When query changes before fetch resolves: abort → no stale setState
    };
  }, [query]);

  if (loading) return <span>Searching...</span>;
  if (error) return <span>Error: {error}</span>;
  return <ul>{results.map(r => <li key={r.id}>{r.title}</li>)}</ul>;
}

// ========================
// 3. WebSocket subscription with full cleanup
// ========================
interface ChatMessage { id: string; text: string; author: string; }

function useWebSocketMessages(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`wss://chat.example.com/rooms/${roomId}`);

    ws.onmessage = (event) => {
      const msg: ChatMessage = JSON.parse(event.data);
      setMessages(prev => [...prev, msg]);  // functional update — safe in closure
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close(1000, 'Component unmounted or roomId changed');
      // Cleanup: properly close WebSocket with code 1000 (normal closure)
      // Prevents: stale message handlers, connection leak, wrong room subscriptions
    };
  }, [roomId]);  // re-creates WebSocket when roomId changes

  return messages;
}

// ========================
// 4. ResizeObserver with cleanup
// ========================
function useDimensions(ref: React.RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();  // cleanup: stop observing
  }, [ref]);

  return dimensions;
}

// ========================
// 5. The function-in-deps problem and solution
// ========================
interface EventHandlerComponent {
  onDataReceived: (data: DataPayload) => void;
}

function DataStream({ onDataReceived }: EventHandlerComponent) {
  // ❌ Without useCallback in parent, onDataReceived is new every parent render
  // Effect re-subscribes on every parent render — WebSocket torndown/rebuilt unnecessarily

  // ✅ Parent should memoize: const handler = useCallback(() => {...}, [deps])
  // OR: use a ref to hold the callback (stable ref, current value always fresh)
  const callbackRef = useRef(onDataReceived);
  callbackRef.current = onDataReceived;  // always current, no stale closure

  useEffect(() => {
    const ws = new WebSocket('wss://data-stream.api');
    ws.onmessage = (e) => callbackRef.current(JSON.parse(e.data));
    // callbackRef.current is always the latest callback — no stale closure
    // callbackRef (the ref object) is stable — safe in [] deps
    return () => ws.close();
  }, []);  // [] — only set up once; callback via ref is always fresh

  return null;
}

// Type helpers
interface SearchResult { id: string; title: string; }
interface DataPayload { type: string; payload: unknown; }
```

---

## 🧠 6. Memory Aid

**Mental Model:** `useEffect` is a synchronisation contract: "As long as these deps are at these values, maintain this external connection." When deps change, tear down the old connection (cleanup) and set up the new one (setup). The connection doesn't know about React renders — it only knows about its own lifecycle: start, running, stop. Your effect must faithfully represent this lifecycle.

**If you go blank:** "Runs after paint. Deps must be exhaustive. Returns cleanup. Use AbortController for fetch to prevent race conditions. Never async directly in useEffect body — wrap in inner async function."

**Mnemonic:** **EACH** — **E**xhaustive deps, **A**bortController for fetch, **C**leanup always symmetric, **H**ooks exhaustive-deps lint rule enforces this.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Correctness: Missing cleanups cause memory leaks and duplicate event handlers; stale closures cause wrong data displayed; missing AbortController causes race conditions — all of these are production quality bugs on high-traffic UIs
→ Performance: Correct deps prevent unnecessary effect re-runs; AbortController prevents wasted network requests from stale in-flight fetches; proper cleanup prevents accumulating subscriptions that each trigger re-renders
→ Concurrent mode safety: Effects fire after commit; in concurrent mode a render may be discarded without committing, meaning effects may not fire at the times developers coming from class components expect; understanding when effects DO and DON'T fire is critical for correct concurrent code

**How it works (3 sentences):**
`useEffect` registers a "passive effect" on the fiber that React executes asynchronously after the browser paints following each commit where React's dependency equality check (`Object.is` comparison of each dep against its previous value) detected a change. Before re-running the effect when dependencies change, React runs the previous effect's cleanup function — the return value of the last successful setup — followed by the new setup; on component unmount, React runs the last cleanup and does not call setup again. Stale closure bugs arise when values from component scope are used inside the effect body but omitted from the dependency array, causing the effect to read the component's state from the time the effect was set up rather than the current state — solved by either including the value in deps (possibly requiring stabilization via `useMemo`/`useCallback`), using functional state updates that don't require the value to be in scope, or extracting the value into a ref.

**Company relevance:**
- Microsoft: Graph API request management — every hook making API calls enforces AbortController cleanup as a team standard; eliminates stale tab data in multi-pane views where tabs share state
- Adobe: Asset browser thumbnail lazy loading — ResizeObserver-based visibility detection with cleanup prevents observer accumulation during rapid scroll through thousands of assets in large Creative Cloud projects
- Salesforce: Record collaboration panel — WebSocket cleanup on record navigation prevents receiving edit events from previously viewed records; discovered via Strict Mode double-mount surfacing the duplicate subscription in development
- Cisco: Live network topology polling — polling intervals use cleanup to cancel previous polling intervals when switching between devices; prevents N polling intervals stacking up as users navigate a large network topology

---
✅ Topic 88/486 complete → Continuing to Topic 89: useRef — DOM Refs vs Mutable Values, forwardRef
