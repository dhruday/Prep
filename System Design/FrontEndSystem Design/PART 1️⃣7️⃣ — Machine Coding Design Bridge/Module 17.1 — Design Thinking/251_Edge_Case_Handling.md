# 251 – Edge Case Handling

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Edge Case Handling in machine coding rounds means proactively identifying and addressing boundary conditions, empty states, error states, race conditions, and unexpected inputs — BEFORE the interviewer points them out. It's what separates a senior engineer from a junior one. Seniors naturally think about: empty arrays, null/undefined values, extremely long text, network failures, rapid user interactions, concurrent state updates, and accessibility edge cases. Demonstrating this awareness unprompted scores heavily in interviews.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Edge Case Categories

| Category | Examples |
|----------|---------|
| **Empty / Null** | Empty list, null user, undefined optional prop |
| **Boundary** | 0 items, 1 item, 10,000 items, negative numbers |
| **Input** | Very long strings, special characters, RTL text, emoji |
| **Network** | Timeout, 500 error, slow response, offline |
| **Race Condition** | Double-click submit, stale API response, rapid typing |
| **State** | Loading → error → retry, partial data, stale cache |
| **Browser** | Mobile viewport, zoom, reduced motion, screen reader |
| **Concurrency** | Multiple tabs, back button, URL manipulation |

### The "VELCRO" Framework for Edge Cases

- **V**alid states: empty, loading, error, success, partial
- **E**xtreme inputs: very long, very short, special chars, zero, negative
- **L**atency: slow API, timeout, retry, optimistic UI
- **C**oncurrency: double-click, race conditions, stale data
- **R**esponsive: mobile, tablet, zoom, orientation
- **O**ffline: network loss, reconnection, data persistence

### Code Patterns for Common Edge Cases

```typescript
// Empty state
function UserList({ users }: { users: User[] }) {
  if (users.length === 0) {
    return <EmptyState icon="users" message="No users found" action="Invite a team member" />;
  }
  return users.map(u => <UserCard key={u.id} user={u} />);
}

// Race condition prevention
function SearchComponent() {
  const abortRef = useRef<AbortController>();
  
  const search = async (query: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const results = await fetchSearch(query, { signal: abortRef.current.signal });
      setResults(results);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // expected
      setError(e);
    }
  };
}

// Double-click prevention
function SubmitButton({ onSubmit }: { onSubmit: () => Promise<void> }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try { await onSubmit(); } 
    finally { setIsSubmitting(false); }
  };
  return <button onClick={handleClick} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>;
}
```

### Anti-Patterns

- ❌ Only handling the "happy path" — no empty/error/loading states
- ❌ `data && data.map(...)` without considering `data.length === 0`
- ❌ No disabled state on submit buttons — allows double-submission
- ❌ Assuming API always returns valid data — no validation
- ❌ Not handling component unmount during async operations — memory leak

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Google Search
Google handles every edge case: empty query (show trending), single character (still suggest), special characters (escaped), extremely long queries (truncated), offline (cached suggestions). Every state transition is smooth and intentional.

### Hruday @ SAP Labs
At SAP, our Fiori apps handled enterprise edge cases: users with no assigned roles (empty permission set), OData services returning 204 No Content, batch requests with partial failures (some items saved, some failed), and extremely long business object names (truncated with tooltip).

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"In machine coding rounds, I proactively call out edge cases before the interviewer asks. I use the VELCRO mental model: Valid states (empty, loading, error), Extreme inputs (long strings, special chars), Latency (slow API, timeout), Concurrency (double-click, race conditions), Responsive (mobile, zoom), Offline (network loss).*

*For each component I build, I immediately add: an empty state, a loading state (skeleton), an error state (with retry), and handle the zero/one/many data cases. I prevent double-click with disabled buttons during submission. I cancel stale requests with AbortController. I handle unmounts by checking if the component is still mounted before state updates.*

*At SAP, production bugs taught me to always handle partial failures — OData batch requests where 3 of 5 items succeed and 2 fail. This discipline of thinking about edge cases early saves time in both interviews and production."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Comprehensive state machine for a data-fetching component
type DataState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string; retry: () => void }
  | { status: 'empty' }
  | { status: 'success'; data: T[] };

function useDataFetch<T>(url: string): DataState<T> {
  const [state, setState] = useState<DataState<T>>({ status: 'idle' });
  
  const fetch = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const response = await fetchWithTimeout(url, { timeout: 10000 });
      const data = await response.json();
      if (data.length === 0) {
        setState({ status: 'empty' });
      } else {
        setState({ status: 'success', data });
      }
    } catch (e) {
      setState({ status: 'error', error: (e as Error).message, retry: fetch });
    }
  }, [url]);

  useEffect(() => { fetch(); }, [fetch]);
  return state;
}

// Render all states
function DataList({ url }: { url: string }) {
  const state = useDataFetch<Item>(url);

  switch (state.status) {
    case 'idle':
    case 'loading': return <Skeleton count={5} />;
    case 'error': return <ErrorState message={state.error} onRetry={state.retry} />;
    case 'empty': return <EmptyState message="No items found" />;
    case 'success': return <List items={state.data} />;
  }
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"VELCRO: Valid states, Extreme inputs, Latency, Concurrency, Responsive, Offline."** Always handle: empty/loading/error states. Prevent: double-click (disabled button), race conditions (AbortController), unmount updates (cleanup). Validate: null, 0, very long strings, special characters. Call out edge cases proactively and the interviewer will be impressed.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Proactive edge case handling is THE signal that separates senior from junior engineers in machine coding rounds. It shows production experience and defensive thinking.
**How:** VELCRO framework for systematic edge case identification. State machines for UI states. AbortController for race conditions. Disabled buttons for double-click. Empty/Loading/Error components for every data-driven view.
**Companies:** All four companies evaluate this. Microsoft and Adobe specifically test for robustness thinking.
