# 158. Rate Limiting at the UI Layer ★★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Rate limiting at the UI layer** means controlling how frequently the frontend initiates requests or triggers actions — protecting the backend from being overwhelmed by rapid user interactions, preventing accidental double-submissions, and providing a good UX when API rate limits are hit. This differs from server-side rate limiting: the frontend proactively throttles or queues requests before they even reach the network, using techniques like **debounce** (delay execution until activity stops), **throttle** (allow at most once per interval), **token bucket** (maintain a budget of requests), and **exponential backoff** (progressively increase delay on retry). At SAP, where multiple users search the same customer data APIs simultaneously, frontend rate limiting with debounced search prevented N×M server calls from overwhelming the backend during concurrent sessions. These patterns are also the first line of defense against hitting API rate limits from third-party services (Google Maps API, GitHub API, payment APIs).

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Debounce vs Throttle — The Core Distinction

```
Debounce: Wait for quiet period AFTER last event, THEN fire
          Use for: search input, window resize handler, form autosave
          [event] [event] [event]  [event] [event]
                                           ↓ (fires after quiet period)

Throttle: Fire at most once per interval, ignoring intermediate events
          Use for: scroll position tracking, mousemove, resize, button clicks
          [event] [event] [event] [event] [event]
             ↓                      ↓
          (fires at interval)   (fires at interval)
```

### Purpose-Built Implementations

```typescript
// Debounce — Production TypeScript with type safety and cancel support
function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void | Promise<void>,
  delayMs: number,
  options: { leading?: boolean } = {}
): { (...args: TArgs): void; cancel(): void; flush(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: TArgs;
  
  const debounced = (...args: TArgs): void => {
    latestArgs = args;
    
    if (options.leading && !timer) {
      fn(...args);
    }
    
    if (timer) clearTimeout(timer);
    
    timer = setTimeout(() => {
      timer = null;
      if (!options.leading) fn(...latestArgs);
    }, delayMs);
  };
  
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  
  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      fn(...latestArgs);
    }
  };
  
  return debounced;
}

// Throttle — with trailing call support
function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  limitMs: number
): { (...args: TArgs): void; cancel(): void } {
  let lastCallTime = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;
  let trailingArgs: TArgs | null = null;
  
  const throttled = (...args: TArgs): void => {
    const now = Date.now();
    const remaining = limitMs - (now - lastCallTime);
    
    if (remaining <= 0) {
      if (trailingTimer) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      lastCallTime = now;
      fn(...args);
    } else {
      // Schedule trailing call for the last args at the end of the window
      trailingArgs = args;
      if (!trailingTimer) {
        trailingTimer = setTimeout(() => {
          lastCallTime = Date.now();
          trailingTimer = null;
          if (trailingArgs) fn(...trailingArgs);
          trailingArgs = null;
        }, remaining);
      }
    }
  };
  
  throttled.cancel = () => {
    if (trailingTimer) clearTimeout(trailingTimer);
  };
  
  return throttled;
}
```

### Token Bucket Algorithm — API Budget Management

```typescript
// Token bucket: more sophisticated than throttle — allows bursts
// Tokens regenerate at a fixed rate; each request costs 1 token
// Good for: respecting third-party API rate limits (100 requests/minute)

class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;
  
  constructor(
    private capacity: number,     // Max tokens (burst capacity)
    private refillRate: number,   // Tokens added per millisecond
    private costPerRequest = 1,
  ) {
    this.tokens = capacity;
    this.lastRefillTime = Date.now();
  }
  
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }
  
  tryConsume(cost = this.costPerRequest): boolean {
    this.refill();
    
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;   // Request allowed
    }
    
    return false;    // Rate limited — reject request
  }
  
  // Time until we have enough tokens for a request
  waitTimeMs(cost = this.costPerRequest): number {
    this.refill();
    if (this.tokens >= cost) return 0;
    const needed = cost - this.tokens;
    return Math.ceil(needed / this.refillRate);
  }
}

// Usage: Limit Google Maps API calls to 10/second
const mapsApiLimiter = new TokenBucket(10, 10 / 1000);  // 10 tokens, 10/s refill

async function getDirections(origin: string, destination: string): Promise<Direction[] | null> {
  if (!mapsApiLimiter.tryConsume()) {
    const waitMs = mapsApiLimiter.waitTimeMs();
    console.warn(`Rate limited — retry in ${waitMs}ms`);
    
    // Option 1: Queue the request
    await new Promise(resolve => setTimeout(resolve, waitMs));
    return getDirections(origin, destination);  // Retry after wait
    
    // Option 2: Show user feedback and fail
    // toast.error('Too many map requests. Please wait a moment.');
    // return null;
  }
  
  return mapsClient.getDirections(origin, destination);
}
```

### Request Queue with Concurrency Limiting

```typescript
// Prevent too many simultaneous requests — especially important for:
// - Bulk operations (delete 100 items)
// - File upload batches
// - Paginated data initialization

class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  
  constructor(private maxConcurrency: number) {}
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
  
  private async processQueue(): Promise<void> {
    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.running++;
      task().finally(() => {
        this.running--;
        this.processQueue();  // Process next when one completes
      });
    }
  }
}

// Bulk delete 500 items — max 5 concurrent requests
const queue = new RequestQueue(5);

async function deleteItems(ids: string[]): Promise<void> {
  const results = await Promise.allSettled(
    ids.map(id => queue.add(() => fetch(`/api/items/${id}`, { method: 'DELETE' })))
  );
  
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`${failed.length} deletions failed`);
  }
}
```

### Exponential Backoff — Handling 429 Responses

```typescript
// When server returns 429 Too Many Requests, retry with exponential backoff
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;  // Randomization prevents thundering herd
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    jitter: true,
  }
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Respect Retry-After header if present
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : calculateBackoff(attempt, retryConfig);
        
        if (attempt === retryConfig.maxRetries) {
          throw new Error(`Rate limited after ${retryConfig.maxRetries} retries`);
        }
        
        await sleep(delayMs);
        continue;
      }
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<T>;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < retryConfig.maxRetries) {
        await sleep(calculateBackoff(attempt, retryConfig));
      }
    }
  }
  
  throw lastError;
}

function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponential = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs
  );
  
  if (config.jitter) {
    // Add ±25% randomization to prevent all clients retrying simultaneously
    const jitter = exponential * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, exponential + jitter);
  }
  
  return exponential;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
```

### React Hook — Debounced Search

```typescript
function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  
  return debouncedValue;
}

// Usage in search component
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);  // Only search after 300ms pause
  
  const { data } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchApi(debouncedQuery),
    enabled: debouncedQuery.length >= 2,  // Minimum chars before searching
  });
  
  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {/* data updates only after debounce delay */}
    </div>
  );
}
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**GitHub Search API:**
GitHub's API rate limit is 60 req/hour for unauthenticated, 5000 for authenticated. GitHub's own web frontend debounces the search box to avoid exhausting this budget. Authenticated tokens use token bucket logic to spread requests over the hour.

**Google Maps Autocomplete:**
The Places API charges per request. Google's own widgets debounce input at 500ms — you can see the loading indicator appears only after you stop typing briefly. The Angular Material or React places-autocomplete libraries ship with built-in debounce for this reason.

**Stripe Payment Button:**
Stripe's frontend disables the "Pay" button immediately on click (leading-edge throttle) to prevent double-charging. The button re-enables only after a server response (success or error), never after a fixed timeout.

**SAP Fiori Search:**
At SAP Labs, the search in business object lists (customers, orders) was debounced at 400ms. Without this, every keystroke would hit the HANA database. With ~500 concurrent users typing, the naive approach generated ~2500 unnecessary queries per second.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Rate limiting at the UI layer is about preventing unwanted server load proactively rather than reacting to 429 errors. My toolkit here is three-tiered: first, debounce or throttle for user-driven events — search boxes should debounce at 300–500ms, scroll/resize handlers should throttle at 100–200ms. Second, for third-party API budgets, I use a token bucket: you get N tokens that refill at rate R, and each request consumes a token. If the bucket is empty, queue or delay rather than fire and get rejected. Third, for network retries on 429 responses, exponential backoff with jitter — the jitter is critical to prevent hundreds of clients all retrying at exactly the same moment, which is the 'thundering herd' problem. At SAP, debouncing search alone reduced backend load by ~70% — it's one of the highest-ROI frontend performance improvements."

**Follow-up Questions:**
1. *What's the difference between debounce and throttle?* → Debounce: wait for quiet period after last event; Throttle: fire at most once per interval regardless. Debounce for "finish typing;" throttle for "update scroll position."
2. *When would you use a request queue vs token bucket?* → Queue: when you want all requests to eventually execute (batch uploads, bulk operations); Token bucket: when you want to drop requests over the limit (search typeahead — stale keystrokes are worthless)
3. *What's the thundering herd problem and how does jitter help?* → When thousands of clients all get a 429 and all retry at exactly the same time, they create another spike. Jitter (±25% random variation) spreads retries across a window, reducing peak retry load.

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

```typescript
// Angular service with multiple rate limiting techniques
@Injectable({ providedIn: 'root' })
export class RateLimitedApiService {
  private bucket = new TokenBucket(20, 20 / 60000);  // 20 requests/minute
  private searchSubject = new Subject<string>();
  
  // Debounced search stream (RxJS)
  readonly searchResults$ = this.searchSubject.pipe(
    debounceTime(400),
    distinctUntilChanged(),
    filter(query => query.length >= 2),
    switchMap(query => {
      if (!this.bucket.tryConsume()) {
        const wait = this.bucket.waitTimeMs();
        return timer(wait).pipe(switchMap(() => this.callSearchApi(query)));
      }
      return this.callSearchApi(query);
    }),
  );
  
  search(query: string): void {
    this.searchSubject.next(query);
  }
  
  private callSearchApi(query: string): Observable<SearchResult[]> {
    return this.http.get<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`).pipe(
      retryWhen(errors => errors.pipe(
        mergeMap((error, attempt) => {
          if (error.status === 429 && attempt < 3) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            return timer(delay + Math.random() * 500);  // Jitter
          }
          return throwError(() => error);
        }),
      )),
    );
  }
  
  constructor(private http: HttpClient) {}
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Three techniques:**
1. **Debounce** = wait for quiet, THEN fire (search, resize, autosave)
2. **Throttle** = fire at most once/interval (scroll, mousemove, click)
3. **Token Bucket** = budget of N requests; refills over time; bursts OK up to capacity

**Backoff formula:** delay = min(base × 2^attempt, maxDelay) ± jitter
**Jitter purpose:** prevent thundering herd (all retrying simultaneously)

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ Frontend events (keystrokes, scroll, resize) fire at 30–100 Hz; even cheap handlers × many users = unexpected backend load
→ Third-party APIs (Maps, payment, ML) charge per request — wasteful queries cost money
→ Without backoff, 429 errors trigger retry storms that make the problem worse

**How it works:**
→ Debounce: clear a timer on each event, set a new one — callback fires only when events stop
→ Throttle: track last call time; only invoke if interval has passed since last; optional trailing call
→ Token bucket: track tokens (refill constantly); each request checks and decrements; rejects or queues if empty
→ Exponential backoff: 1s → 2s → 4s → 8s (with jitter) — wait longer after each failure

**Company relevance:**
→ **Microsoft**: Azure SDK JavaScript client uses exponential backoff for 429/503 responses; all Teams API calls debounced
→ **Adobe**: Creative Cloud sync and Behance search APIs use token bucket to stay within Adobe IO rate limits
→ **Salesforce**: All Apex REST API calls from Lightning components debounced; Salesforce enforces 100 concurrent API calls per org
→ **Cisco**: WebEx API rate limits (300 messages/min/bot) enforced client-side with token bucket in WebEx app integrations
