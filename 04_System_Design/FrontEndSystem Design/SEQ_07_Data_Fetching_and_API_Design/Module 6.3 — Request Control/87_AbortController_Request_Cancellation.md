# 87. AbortController & Request Cancellation

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**AbortController** is the Web API for cancelling in-flight fetch requests, preventing memory leaks from stale responses arriving after a component unmounts, and solving race conditions in sequential user-triggered searches. Without cancellation, a user typing "apple" rapidly fires A→AP→APP→APPL→APPLE requests — if "APPL" responds slower than "APPLE", the slower response overwrites the faster one, showing stale results. AbortController solves this: each new request cancels its predecessor. It's equally essential for cleanup in `useEffect` — if a user navigates away during a fetch, the in-flight request should be aborted so its response callback doesn't try to update an unmounted component's state, causing React's "memory leak" warning and potential state corruption. Every production `fetch()` in a component or hook should use AbortController.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### AbortController API Fundamentals

```typescript
// The three elements of AbortController:
const controller = new AbortController();

// 1. signal — passed to fetch, carries abort state
const signal = controller.signal;  // AbortSignal

// 2. abort() — triggers cancellation
controller.abort('Reason for cancellation'); // Optional reason

// 3. signal.aborted — check if already aborted
if (signal.aborted) {
  console.log('Reason:', signal.reason);
}

// Basic usage
async function fetchData(signal: AbortSignal): Promise<Data> {
  const response = await fetch('/api/data', { signal });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const controller = new AbortController();
fetchData(controller.signal);

// Later: cancel
controller.abort();

// What happens when aborted:
// - fetch throws AbortError (DOMException with name 'AbortError')
// - response.json() also rejects if called on aborted request
```

### Use Case 1: Cleanup on Component Unmount

```typescript
// ❌ Without AbortController — memory leak + state update on unmounted component
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(data => setUser(data)); // 💥 If component unmounts, setUser on dead component
    // No cleanup!
  }, [userId]);
}

// ✅ With AbortController — clean cancellation on unmount
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const controller = new AbortController();
    
    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => setUser(data))
      .catch(err => {
        if (err.name === 'AbortError') {
          return; // Expected — don't show error to user
        }
        console.error('Fetch failed:', err);
      });
    
    // Cleanup: abort when userId changes or component unmounts
    return () => controller.abort('Component unmounted or userId changed');
  }, [userId]);
}
```

### Use Case 2: Race Condition Prevention in Search

```typescript
// THE Classic race condition problem:
// User types "a" → fetch starts (slow)
// User types "ap" → fetch starts (fast)
// "ap" response arrives first: shows "apple, apricot"
// "a" response arrives second: OVERWRITES with "avocado, ant, apple, apricot, ..." ❌

// ✅ Cancel previous request on new input
function useSearchWithCancellation(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    // Cancel previous request
    controllerRef.current?.abort('New search query');
    
    // Create new controller for this request
    controllerRef.current = new AbortController();
    
    fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: controllerRef.current.signal,
    })
      .then(r => r.json())
      .then(data => setResults(data))
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Search failed:', err);
        }
      });
    
    return () => controllerRef.current?.abort();
  }, [query]); // Re-runs and cancels on every query change
  
  return results;
}
```

### React Query — Automatic Cancellation

```typescript
// React Query automatically uses AbortController internally
// The signal is passed to queryFn via the context argument

const { data } = useQuery({
  queryKey: ['search', query],
  queryFn: async ({ signal }) => {
    // signal is AbortController's signal — managed by React Query
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query)}`,
      { signal } // Pass through
    );
    return response.json();
  },
  enabled: query.length >= 2,
});

// React Query cancels the request automatically when:
// - queryKey changes (new query string → cancel previous)
// - Component unmounts
// - Query is manually cancelled: queryClient.cancelQueries(...)
// - New query supersedes old one

// For Axios (doesn't use signal natively in all versions):
queryFn: async ({ signal }) => {
  const source = axios.CancelToken.source();
  signal.addEventListener('abort', () => source.cancel('Query cancelled'));
  
  const response = await axios.get(`/api/search`, {
    params: { q: query },
    cancelToken: source.token,
  });
  return response.data;
}
```

### Timeout with AbortController

```typescript
// Combine timeout + manual cancellation
function fetchWithTimeout<T>(
  url: string,
  timeout: number,
  options: RequestInit = {}
): { promise: Promise<T>; abort: () => void } {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${timeout}ms`, 'TimeoutError'));
  }, timeout);
  
  const promise = fetch(url, { ...options, signal: controller.signal })
    .then(r => r.json() as T)
    .finally(() => clearTimeout(timeoutId));
  
  return {
    promise,
    abort: () => controller.abort('Manual cancel'),
  };
}

// Modern approach: AbortSignal.timeout() (Chrome 103+, Node 17.3+)
const response = await fetch('/api/data', {
  signal: AbortSignal.timeout(5000), // Auto-abort in 5 seconds
});

// Combining multiple abort conditions (timeout + manual cancel):
const controller = new AbortController();
const signal = AbortSignal.any([
  controller.signal,
  AbortSignal.timeout(5000),
]);
// Aborts if either: manual abort OR 5s timeout occurs
```

### Cancellable Promises Pattern

```typescript
// For non-fetch async operations (IndexedDB, complex calculations)
interface CancellablePromise<T> {
  promise: Promise<T>;
  cancel: () => void;
}

function makeCancellable<T>(promise: Promise<T>): CancellablePromise<T> {
  let cancelled = false;
  
  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise
      .then(value => {
        if (!cancelled) resolve(value);
      })
      .catch(error => {
        if (!cancelled) reject(error);
      });
  });
  
  return {
    promise: wrappedPromise,
    cancel: () => { cancelled = true; },
  };
}

// Usage in useEffect
useEffect(() => {
  const cancellable = makeCancellable(expensiveAsyncOperation());
  
  cancellable.promise
    .then(setResult)
    .catch(err => console.error(err));
  
  return () => cancellable.cancel();
}, []);
```

### AbortController with Streaming (Fetch Streams API)

```typescript
// Cancel streaming responses (e.g., AI text generation)
async function streamChatGPTResponse(
  prompt: string,
  onChunk: (text: string) => void,
  signal: AbortSignal
) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
    headers: { 'Content-Type': 'application/json' },
    signal,
  });
  
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done || signal.aborted) break; // Stop on abort
      
      onChunk(decoder.decode(value));
    }
  } finally {
    reader.releaseLock();
  }
}

// Component: Stop button cancels generation
function ChatComponent() {
  const controllerRef = useRef<AbortController | null>(null);
  const [text, setText] = useState('');
  
  const startGeneration = async (prompt: string) => {
    controllerRef.current = new AbortController();
    setText('');
    
    await streamChatGPTResponse(
      prompt,
      (chunk) => setText(prev => prev + chunk),
      controllerRef.current.signal
    );
  };
  
  const stopGeneration = () => controllerRef.current?.abort('User stopped');
  
  return (
    <>
      <div>{text}</div>
      <button onClick={() => startGeneration('Tell me about React')}>Generate</button>
      <button onClick={stopGeneration}>Stop</button>
    </>
  );
}
```

### Anti-Patterns & Pitfalls

**1. Ignoring AbortError in catch:**
```typescript
// ❌ Shows error toast when user simply navigated away
fetch('/api/data', { signal })
  .catch(err => toast.error('Request failed!'));  // Also fires on AbortError!

// ✅ Distinguish abort from real errors
.catch(err => {
  if (err.name === 'AbortError') return; // Silent — expected
  toast.error('Request failed');          // Real error only
});
```

**2. Creating controller but not passing signal:**
```typescript
// ❌ Controller created but fetch receives no signal — useless
const controller = new AbortController();
fetch('/api/data'); // Missing: { signal: controller.signal }
controller.abort(); // Has no effect!
```

**3. Reusing an aborted controller:**
```typescript
// ❌ Once aborted, an AbortController and its signal are permanently aborted
const controller = new AbortController();
controller.abort();

fetch('/api/data', { signal: controller.signal }); // Immediately aborted!
// ✅ Always create a new AbortController for each new request
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Google Search Autocomplete:**
- Each keystroke fires a new search request and cancels the previous
- Without cancellation: stale results from slow intermediate queries would flicker
- 1B users: Without cancellation, concurrent requests per user could be 5-10x higher

**Microsoft Teams Message Search:**
- Real-time search with AbortController — each character cancels previous request
- Server-Sent Events for real-time message delivery — controller cancels stream on navigation

**Adobe Creative Cloud — Asset Loading:**
- Clicking into folder fires asset fetch; clicking back cancels it immediately
- Without cancellation: expensive asset metadata fetches complete pointlessly in background
- Prevents bandwidth waste when browsing large folder hierarchies

**AI Chat (OpenAI, Copilot, etc.):**
- "Stop generating" button calls abort on the streaming response reader
- Critical UX: user must be able to interrupt long responses
- AbortSignal passes through both `fetch` and the `ReadableStream` reader

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "AbortController is essential for two reasons: preventing memory leaks on unmounts and fixing race conditions in search-as-you-type.
>
> In any useEffect that performs a fetch, I always create an AbortController, pass its signal to fetch, and return a cleanup function that calls abort. This ensures that if the component unmounts or the dependency changes before the request completes, the in-flight request is cancelled and its callback never fires on the dead component.
>
> For search inputs, the race condition is subtle but common: if the user types faster than requests complete, older slower requests can return after newer faster ones, overwriting the correct results with stale data. Cancelling the previous request on every new keypress eliminates this class of bug.
>
> In modern React Query workflows, cancellation is mostly automatic — React Query passes an AbortSignal to queryFn, cancels when queryKey changes or component unmounts, and handles the AbortError silently. But when writing custom fetch hooks or imperative fetch calls, manual AbortController management is required.
>
> The modern AbortSignal.timeout(ms) is a clean addition — creates a signal that auto-fires after a timeout without needing a manual clearTimeout, and AbortSignal.any() combines multiple signals for 'abort if either condition occurs'."

**Likely Follow-up Questions:**
- "How do you cancel Axios requests?" → Axios uses CancelToken (legacy) or the `signal` option — attach AbortSignal to `signal: controller.signal`
- "What happens to the server when you abort a fetch?" → The browser closes the TCP connection; the server may or may not notice depending on the operation stage. Server should use connection close detection in long operations.
- "How do you implement a timeout on fetch?" → AbortSignal.timeout(ms) or manually: setTimeout with controller.abort, clear timeout in finally block

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (see deep-dive above)

Complete patterns shown: useEffect cleanup, search race condition, React Query automatic cancellation, streaming cancellation.

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**3 Rules for AbortController:**
1. Every fetch in useEffect → create controller, pass signal, return abort in cleanup
2. Search/autocomplete → ref-store controller, cancel previous on each query change
3. React Query → AbortController automatic; pass `signal` argument through to fetch

**AbortError is NOT an error:** Always check `err.name === 'AbortError'` and return silently.

If you blank: *"AbortController prevents two things: memory leaks from setState on unmounted components, and race conditions where older slow responses overwrite newer fast ones."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: No stale search results flickering; no "Can't update state on unmounted component" warnings  
→ **Performance**: Cancelled requests free browser connection slots for important requests  
→ **Business**: Without cancellation in AI chat UIs: users can't stop runaway generation costing tokens

**How it works:**
→ `new AbortController()` creates a controller-signal pair. The signal is passed to `fetch()` via the options object. Calling `controller.abort()` causes fetch to reject with `AbortError` and releases the network connection. React Query internally creates an AbortController per query and passes its signal to `queryFn` via the context — cancellation happens automatically when queryKey changes or queries are cancelled programmatically.

**Company relevance:**
→ **Microsoft**: Copilot AI responses use streaming + AbortController stop button  
→ **Adobe**: Firefly AI generation — "stop generating" requires Stream + AbortController  
→ **Salesforce**: Einstein GPT chat panel — cancellable streaming responses  
→ **Cisco**: Log streaming cancel — network event stream to dashboard uses AbortController
