# 91. Client-Side Rate Limiting

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Client-side rate limiting** is the practice of throttling outgoing requests from the browser before they ever hit the server. While servers enforce their own rate limits (returning 429s), waiting for a server rejection is expensive — it wastes bandwidth, creates latency, and degrades UX. A well-designed frontend enforces its own request budget: a maximum of N requests per time window, per endpoint, per user action. This is critical in real-time dashboards (like my Bosch WebSocket work where polling intervals had to be controlled client-side), autocomplete inputs, and any UI where user interactions could generate unbounded network traffic. The goal is to protect both the server and the UX simultaneously.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Architecture & Component Boundaries

Client-side rate limiting sits in the **API layer** of your frontend architecture — between the UI components that trigger requests and the actual network call. It should be transparent to components: they call `api.fetch()` exactly as before; the rate limiter intercepts and queues or drops excess calls.

```
Component → useQuery/dispatch → API Layer → Rate Limiter → Network → Server
                                                 ↓ queue/drop if over budget
```

### Token Bucket vs Leaky Bucket vs Fixed Window

**Fixed Window:** Allow N requests per window (e.g., 10 per second). Problem: bursts at window boundaries — 10 at t=0.99s + 10 at t=1.01s = 20 requests in 20ms.

**Sliding Window:** Track each request timestamp, evict entries older than window. More accurate, O(n) memory per client.

**Token Bucket:** Tokens refill at rate R. Each request consumes 1 token. Allows controlled bursting — the most practical for frontend use.

**Leaky Bucket:** Requests enter a queue and drain at fixed rate. Smoothest output, but adds latency to every request.

```typescript
// Token Bucket implementation — ideal for frontend API clients
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private capacity: number,     // Max burst size
    private refillRate: number,   // Tokens per millisecond
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
  
  consume(tokens = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true; // Request allowed
    }
    return false; // Rate limited
  }
  
  get waitTime(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    // How many ms until next token available
    return Math.ceil((1 - this.tokens) / this.refillRate);
  }
}
```

### Per-Endpoint Rate Limiting with Queue

```typescript
interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  priority: number; // higher = processed first
}

class RateLimitedApiClient {
  private buckets = new Map<string, TokenBucket>();
  private queues = new Map<string, QueuedRequest<unknown>[]>();
  private processing = new Map<string, boolean>();
  
  private getBucket(endpoint: string): TokenBucket {
    if (!this.buckets.has(endpoint)) {
      // Different rate limits per endpoint type
      const config = this.getEndpointConfig(endpoint);
      this.buckets.set(endpoint, new TokenBucket(config.burst, config.rate));
    }
    return this.buckets.get(endpoint)!;
  }
  
  private getEndpointConfig(endpoint: string) {
    // Search endpoints: more restrictive (debounced anyway)
    if (endpoint.includes('/search')) return { burst: 3, rate: 0.5 / 1000 };
    // Analytics: can batch, don't need high rate
    if (endpoint.includes('/analytics')) return { burst: 5, rate: 0.2 / 1000 };
    // General API: generous
    return { burst: 10, rate: 2 / 1000 }; // 2 req/s, burst to 10
  }
  
  async request<T>(
    endpoint: string,
    execute: () => Promise<T>,
    options: { priority?: number; queue?: boolean } = {}
  ): Promise<T> {
    const bucket = this.getBucket(endpoint);
    
    if (bucket.consume()) {
      return execute();
    }
    
    if (!options.queue) {
      throw new RateLimitError(`Rate limit exceeded for ${endpoint}`, bucket.waitTime);
    }
    
    // Queue the request
    return new Promise<T>((resolve, reject) => {
      const queue = this.queues.get(endpoint) ?? [];
      queue.push({ execute, resolve: resolve as any, reject, priority: options.priority ?? 0 });
      // Sort by priority descending
      queue.sort((a, b) => b.priority - a.priority);
      this.queues.set(endpoint, queue);
      this.scheduleProcessing(endpoint, bucket.waitTime);
    });
  }
  
  private scheduleProcessing(endpoint: string, delayMs: number): void {
    if (this.processing.get(endpoint)) return;
    this.processing.set(endpoint, true);
    
    setTimeout(() => {
      const queue = this.queues.get(endpoint);
      const bucket = this.getBucket(endpoint);
      
      if (!queue?.length) {
        this.processing.set(endpoint, false);
        return;
      }
      
      if (bucket.consume()) {
        const item = queue.shift()!;
        item.execute().then(item.resolve).catch(item.reject);
      }
      
      this.processing.set(endpoint, false);
      
      if (queue.length > 0) {
        this.scheduleProcessing(endpoint, bucket.waitTime);
      }
    }, delayMs);
  }
}
```

### Handling 429 Responses from Server

When the server sends a 429, respect `Retry-After` headers and back off client-side globally:

```typescript
async function fetchWithRateLimitHandling(
  url: string,
  options?: RequestInit,
  retries = 3
): Promise<Response> {
  const response = await fetch(url, options);
  
  if (response.status === 429 && retries > 0) {
    const retryAfter = response.headers.get('Retry-After');
    const delayMs = retryAfter
      ? parseRetryAfter(retryAfter)
      : calculateBackoff(3 - retries);
    
    // Pause ALL requests to this origin, not just this one
    await globalRateLimiter.pause(new URL(url).origin, delayMs);
    await sleep(delayMs);
    return fetchWithRateLimitHandling(url, options, retries - 1);
  }
  
  return response;
}

function parseRetryAfter(header: string): number {
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds)) return seconds * 1000;
  // Could be HTTP date format
  const date = new Date(header);
  return Math.max(0, date.getTime() - Date.now());
}
```

### Performance & Browser Implications

- **Token bucket refill uses `Date.now()`** — cheap, no timer overhead
- **Queue memory**: cap queue size to prevent memory buildup on flaky connections
- **Visibility API**: pause queued requests when tab is hidden (`document.visibilityState === 'hidden'`), resume on visible
- **Main thread**: rate limiting logic is synchronous and cheap — no worker needed

### Anti-Patterns & Pitfalls

- **Per-component debounce without global budget**: 50 components each debouncing individually still fire 50 requests simultaneously
- **Showing stale UI while queued**: inform the user their action is queued, don't show success until request completes
- **Ignoring Retry-After**: retrying immediately after a 429 will result in more 429s, amplifying the problem
- **Rate limiting mutations too aggressively**: write operations (POST/PUT/DELETE) should be queued, not silently dropped

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Cisco Network Dashboard (your target company):**
- Network topology queries can be triggered by panning/zooming
- Without client-side rate limiting: 100ms pan generates 50 API calls
- With token bucket (burst: 5, rate: 2/s): first 5 immediate, rest queue — user sees smooth updates without overwhelming the backend

**Adobe Creative Cloud asset panel:**
- Thumbnail generation requests: each file selection triggers `/thumbnail` API
- Rate limit: 10 concurrent thumbnails, queue rest — progressive rendering as they complete

**Microsoft Teams:**
- Presence indicators poll `/presence` for active contacts
- Client rate-limits to 1 request per contact per 30s — server load drops 95% vs per-render polling

**Scaling progression:**
- 1,000 users: rate limiting is optional quality-of-life
- 100,000 users: server 429s become common without it — UX degrades
- 10M users: client-side budget enforcement is a requirement to survive traffic spikes

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Client-side rate limiting is about being a polite API consumer. Rather than letting user interactions generate unbounded network traffic and relying on the server to reject excess requests with 429s, we enforce a budget at the client level. I implement this with a token bucket per endpoint — it allows controlled bursting for genuinely bursty interactions like initial page loads, while smoothing out sustained high-frequency events like search-as-you-type or scroll-triggered loads. When the bucket is empty, I queue requests rather than dropping them silently, so the UX stays consistent. I also respect server-sent `Retry-After` headers by pausing the global client rather than just the individual request that was rejected. At Bosch, our real-time dashboard would generate 200+ WebSocket messages per second during network events — client-side rate limiting was critical to keep the UI responsive and the server alive simultaneously."

**Likely Follow-up Questions:**
1. *How does this differ from debouncing?* → Debounce collapses rapid same-action calls; rate limiting enforces a hard budget across all calls
2. *What happens to queued requests if the user navigates away?* → AbortController cancels in-flight; queue should be cleared on navigation
3. *Should the queue be FIFO or priority-based?* → Priority-based — user-initiated actions over background sync; newest over oldest for search
4. *How do you handle the case where a queued request becomes stale?* → Attach staleness TTL; drop if TTL exceeded before execution
5. *How does client-side rate limiting interact with React Query/TanStack?* → Wrap the fetch function; React Query sees it as a normal async function

**Comparison With Alternatives:**

| Approach | Latency | Fairness | Complexity | Best For |
|---|---|---|---|---|
| Debounce only | Adds delay | Single input | Low | Search inputs |
| Server reliance (429) | Round-trip wasted | All clients | Zero | Simple apps |
| Token bucket + queue | Minimal | Per-endpoint | Medium | Dashboards, APIs |
| Leaky bucket | Adds delay | Smooth output | Medium | Analytics events |

---

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

```typescript
// React hook wrapping rate-limited fetch
const apiClient = new RateLimitedApiClient();

function useRateLimitedQuery<T>(
  endpoint: string,
  fetcher: () => Promise<T>,
  options: { enabled?: boolean; queue?: boolean } = {}
) {
  const [state, setState] = useState<{
    data: T | null;
    error: Error | null;
    status: 'idle' | 'loading' | 'queued' | 'success' | 'error';
  }>({ data: null, error: null, status: 'idle' });
  
  useEffect(() => {
    if (!options.enabled) return;
    
    setState(s => ({ ...s, status: 'loading' }));
    
    apiClient
      .request(endpoint, fetcher, { queue: options.queue })
      .then(data => setState({ data, error: null, status: 'success' }))
      .catch(err => {
        if (err instanceof RateLimitError) {
          setState(s => ({ ...s, status: 'queued' }));
          // Will resolve via queue — no error shown to user
        } else {
          setState(s => ({ ...s, error: err, status: 'error' }));
        }
      });
  }, [endpoint, options.enabled]);
  
  return state;
}
```

**Why this is structured this way:**
- Status `'queued'` lets the UI show a non-alarming loading state vs an error
- The hook is a thin wrapper — all rate limit logic stays in `apiClient`
- In production, `apiClient` would be a singleton shared across the app

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Token Bucket = Water Analogy:** Tokens drip in at steady rate (the refill rate). You can burst-consume if the bucket is full. When empty, wait for refill. Never retry instantly — always `waitTime` milliseconds. Three things to always say: **classify by endpoint**, **queue don't drop for writes**, **respect Retry-After from server**.

**If you go blank:** "Client rate limiting enforces a request budget before hitting the network — token bucket per endpoint, queue writes, drop non-critical reads, respect server Retry-After headers."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Prevents jagged network waterfalls during user interactions; keeps UI responsive
→ **Server protection**: Stops one client from amplifying server load during incidents
→ **Business**: Avoids hitting API quotas (metered APIs like OpenAI, Maps, etc.) that cost money

**How it works:**
→ A token bucket grants one token per refill interval; each request consumes one token. If no tokens remain, requests are queued with `setTimeout(delayMs)` until the next token. Server 429 responses trigger a global pause using the `Retry-After` value.

**Company relevance:**
→ **Cisco**: Network dashboards with high-frequency data; rate limiting prevents API saturation during topology scans
→ **Adobe**: Asset management APIs are metered; client budget prevents cost overruns
→ **Microsoft**: Teams has strict per-tenant rate limits on Graph API; Teams FE enforces client-side budgets before Graph calls
→ **Salesforce**: Apex API has governor limits; LWC components must not fire uncontrolled queries
